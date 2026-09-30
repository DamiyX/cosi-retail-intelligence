import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createTemporaryProduct } from '../src/catalogue/createTemporaryProduct';
import { createCatalogueClient } from '../src/catalogue/client';
import { createDatabaseSalesClient } from '../src/sales/client';
import { createProductPhotos, MAX_PHOTO_BYTES, type PhotoFiles } from '../src/media/productPhotos';
import { jpegDimensions } from '../src/media/photoFormat';
import { deterministicIds, openCatalogueFixture, reopenDatabase, testId } from './catalogueSupport';

const jpeg = Uint8Array.from([255,216,255,192,0,11,8,0,100,0,200,1,1,17,0,255,217]);
function filePort(root: string): PhotoFiles {
  mkdirSync(root, { recursive: true });
  return {
    stage(source, key) {
      const part = join(root, key + '.part');
      copyFileSync(source, part);
      renameSync(part, join(root, key));
      return this.inspect(key)!;
    },
    inspect(key) {
      const path = join(root, key);
      if (!existsSync(path)) return null;
      const bytes = readFileSync(path);
      return { size: bytes.length, ...jpegDimensions(bytes), checksum: createHash('md5').update(bytes).digest('hex') };
    },
    uri: key => `file://${join(root, key)}`,
    remove(key) { rmSync(join(root, key), { force: true }); },
    list: () => readdirSync(root).map(key => ({ key, modifiedAt: statSync(join(root, key)).mtimeMs })),
  };
}
function setup() {
  const f = openCatalogueFixture();
  const root = f.path + '-photos';
  const source = f.path + '-capture.jpg';
  writeFileSync(source, jpeg);
  const files = filePort(root);
  const storeId = f.context.store.id;
  const photos = createProductPhotos(f.adapter, storeId, () => files, deterministicIds(8000));
  const create = (localPhotoId?: string, operationId = testId(9000)) => createTemporaryProduct(f.adapter, {
    storeId, deviceId: f.context.device.id, name: '', generateTemporaryLabel: true, defaultSellingPriceMinor: 125, localPhotoId,
  }, { generateId: deterministicIds(1000), operationId });
  return { f, root, source, files, photos, create, close: () => { f.closeAndDelete(); rmSync(root, { recursive: true, force: true }); rmSync(source, { force: true }); } };
}

it('keeps one photo/product/outbox on replay, survives sale restart/enrichment, and sends no media URI or bytes', () => {
  const s = setup();
  try {
    const asset = s.photos.stage(s.source);
    const product = s.create(asset);
    expect(s.create(asset).storeProduct.id).toBe(product.storeProduct.id);
    expect(s.f.adapter.getAllRows('SELECT id FROM media_assets')).toHaveLength(1);
    expect(s.f.adapter.getAllRows('SELECT operation_id FROM outbox_operations')).toHaveLength(1);
    const sales = createDatabaseSalesClient(s.f.adapter);
    const sale = sales.completeSale({ lines: [{ storeProductId: product.storeProduct.id, packageUnitId: product.basePackage.id, quantityPackagesMicros: 1000000, unitPriceMinor: 125 }], payment: { method: 'CASH' } });
    const snapshots = s.f.adapter.getAllRows('SELECT * FROM sale_items WHERE sale_id = ?', [sale.sale.id]);
    createCatalogueClient(s.f.adapter, s.f.context.store, s.f.context.device).updateProductIdentity({ storeProductId: product.storeProduct.id, name: 'Identified product' });
    const restarted = reopenDatabase(s.f.path);
    try {
      const photos = createProductPhotos(restarted, s.f.context.store.id, () => s.files);
      expect(photos.read(product.storeProduct.id)).toMatchObject({ status: 'available' });
      photos.discard(asset);
      expect(photos.read(product.storeProduct.id).status).toBe('available');
      expect(restarted.getAllRows('SELECT * FROM sale_items WHERE sale_id = ?', [sale.sale.id])).toEqual(snapshots);
      for (const row of restarted.getAllRows<{ payload: string }>('SELECT payload FROM outbox_operations')) {
        expect(row.payload).not.toMatch(/file:\/\/|localPhotoId|media_assets|checksum|DEVICE_ONLY/);
      }
    } finally { restarted.close(); }
  } finally { s.close(); }
});

it('cancel removes only staging; committed assets survive conservative orphan recovery', () => {
  const s = setup();
  try {
    const discarded = s.photos.stage(s.source);
    s.photos.discard(discarded);
    expect(s.files.inspect(`${discarded}.jpg`)).toBeNull();
    const attached = s.photos.stage(s.source);
    const product = s.create(attached);
    const abandoned = s.photos.stage(s.source);
    const orphan = `${testId(9997)}.jpg.part`;
    writeFileSync(join(s.root, orphan), jpeg);
    // Future clock stands in for a later startup; no active draft older than grace is retained.
    const recovery = createProductPhotos(s.f.adapter, s.f.context.store.id, () => s.files, deterministicIds(5000), () => Date.now() + 2 * 86400000);
    recovery.recover();
    expect(s.files.inspect(`${abandoned}.jpg`)).toBeNull();
    expect(existsSync(join(s.root, orphan))).toBe(false);
    expect(recovery.read(product.storeProduct.id).status).toBe('available');
  } finally { s.close(); }
});

it('SQL rollback leaves reusable staging and retry attaches once; an error reported after commit never deletes its photo', () => {
  const s = setup();
  try {
    const asset = s.photos.stage(s.source);
    const run = s.f.adapter.run.bind(s.f.adapter);
    const fault = jest.spyOn(s.f.adapter, 'run').mockImplementation((sql, params) => {
      if (sql.includes('INSERT INTO outbox_operations')) throw new Error('disk full at SQL');
      return run(sql, params);
    });
    expect(() => s.create(asset)).toThrow('disk full');
    expect(s.f.adapter.getAllRows('SELECT id FROM store_products')).toHaveLength(0);
    expect(s.f.adapter.getFirstRow<{ store_product_id: string | null }>('SELECT store_product_id FROM media_assets')?.store_product_id).toBeNull();
    s.photos.assertReady(asset);
    fault.mockRestore();
    const transaction = s.f.adapter.transaction.bind(s.f.adapter);
    const afterCommit = jest.spyOn(s.f.adapter, 'transaction').mockImplementation(work => { const result = transaction(work); throw new Error(`reported after commit ${Boolean(result)}`); });
    expect(() => s.create(asset)).toThrow('reported after commit');
    afterCommit.mockRestore();
    s.photos.discard(asset);
    expect(s.photos.read(s.create(asset).storeProduct.id).status).toBe('available');
  } finally { s.close(); }
});

it('cleans failed file/metadata writes; low storage and oversized capture create no saved reference', () => {
  const s = setup();
  try {
    const stage = jest.spyOn(s.files, 'stage').mockImplementation(() => { throw new Error('low storage'); });
    expect(() => s.photos.stage(s.source)).toThrow('low storage');
    expect(s.f.adapter.getAllRows('SELECT id FROM media_assets')).toHaveLength(0);
    stage.mockRestore();
    const run = s.f.adapter.run.bind(s.f.adapter);
    const sqlFault = jest.spyOn(s.f.adapter, 'run').mockImplementation((sql, params) => {
      if (sql.startsWith('INSERT INTO media_assets')) throw new Error('metadata failure');
      return run(sql, params);
    });
    expect(() => s.photos.stage(s.source)).toThrow('metadata failure');
    expect(s.files.list()).toHaveLength(0);
    sqlFault.mockRestore();
    const tooBig = jest.spyOn(s.files, 'stage').mockReturnValue({ size: MAX_PHOTO_BYTES + 1, width: 100, height: 100, checksum: 'x' });
    expect(() => s.photos.stage(s.source)).toThrow('bounds');
    tooBig.mockRestore();
    expect(s.f.adapter.getAllRows('SELECT id FROM media_assets')).toHaveLength(0);
  } finally { s.close(); }
});

it('detects missing/corrupt photos without losing sale access', () => {
  const s = setup();
  try {
    const asset = s.photos.stage(s.source);
    const product = s.create(asset);
    writeFileSync(join(s.root, `${asset}.jpg`), 'broken');
    expect(s.photos.read(product.storeProduct.id).status).toBe('missing');
    expect(() => s.photos.assertReady(asset)).toThrow();
    s.files.remove(`${asset}.jpg`);
    expect(s.photos.read(product.storeProduct.id).status).toBe('missing');
    expect(createDatabaseSalesClient(s.f.adapter).getProductById?.(product.storeProduct.id)).not.toBeNull();
  } finally { s.close(); }
});

it('rejects another store reads/attachments/replacements and preserves committed files across failed replacement', () => {
  const s = setup();
  try {
    const asset = s.photos.stage(s.source);
    const product = s.create(asset);
    const otherStore = testId(9900);
    s.f.adapter.run('INSERT INTO stores(id, name, currency_code, country_code, timezone, created_at, updated_at) SELECT ?, name, currency_code, country_code, timezone, created_at, updated_at FROM stores LIMIT 1', [otherStore]);
    const other = createProductPhotos(s.f.adapter, otherStore, () => s.files, deterministicIds(8100));
    expect(() => other.read(product.storeProduct.id)).toThrow('store');
    expect(() => other.replace(product.storeProduct.id, asset)).toThrow('store');
    other.discard(asset);
    expect(s.photos.read(product.storeProduct.id).status).toBe('available');
    const foreignAsset = other.stage(s.source);
    expect(() => s.photos.replace(product.storeProduct.id, foreignAsset)).toThrow('store');
    const staged = s.photos.stage(s.source);
    const run = s.f.adapter.run.bind(s.f.adapter);
    const fault = jest.spyOn(s.f.adapter, 'run').mockImplementation((sql, params) => { if (sql.startsWith('UPDATE media_assets SET store_product_id = ?')) throw new Error('replacement failed'); return run(sql, params); });
    expect(() => s.photos.replace(product.storeProduct.id, staged)).toThrow('replacement failed');
    fault.mockRestore();
    expect(s.photos.read(product.storeProduct.id).uri).toContain(asset);
    s.photos.replace(product.storeProduct.id, staged);
    expect(s.photos.read(product.storeProduct.id).uri).toContain(staged);
    expect(s.files.inspect(`${asset}.jpg`)).not.toBeNull();
  } finally { s.close(); }
});
