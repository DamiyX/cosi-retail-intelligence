import { createCatalogueClient, resolveCurrentStore } from '../src/catalogue/client';
import { createTemporaryProduct } from '../src/catalogue/createTemporaryProduct';
import { createDatabaseSalesClient } from '../src/sales/client';
import { createDevice, ensureSyncStoreState } from '../src/db/repositories';
import { createProductPhotos, type PhotoFiles } from '../src/media/productPhotos';
import { resolveCurrentActor } from '../src/storeContext/access';
import { BoundaryAdapter, businessSnapshot } from './m11MaxSupport';
import { deterministicIds, openCatalogueFixture, testId } from './catalogueSupport';

let mockFiles: PhotoFiles;
jest.mock('../src/media/nativePhotoFiles', () => ({ createNativePhotoFiles: () => mockFiles }));
function setup(caller: 'catalogue' | 'sales' = 'catalogue') {
  const f = openCatalogueFixture(), db = new BoundaryAdapter(f.adapter), present = new Map<string, number>();
  const info = { size: 100, width: 10, height: 10, checksum: 'synthetic' };
  let changeStage: (() => void) | undefined, changeList: (() => void) | undefined;
  const files: PhotoFiles = {
    stage(_uri, key) { present.set(key, Date.now()); changeStage?.(); return info; },
    inspect: key => present.has(key) ? info : null, uri: key => `synthetic://${key}`,
    remove: key => { present.delete(key); }, list() { changeList?.(); return [...present].map(([key, modifiedAt]) => ({ key, modifiedAt })); },
  };
  mockFiles = files;
  ensureSyncStoreState(f.adapter, { storeId: f.context.store.id, deviceId: f.context.device.id });
  const context = resolveCurrentStore(db)!;
  const client = caller === 'catalogue' ? createCatalogueClient(db, context.store, context.device, deterministicIds(4000), () => files)
    : createDatabaseSalesClient(db, { generateId: deterministicIds(4000) });
  const p = createTemporaryProduct(f.adapter, { storeId: f.context.store.id, deviceId: f.context.device.id, name: 'Photo stock' }, { generateId: deterministicIds(1000) });
  const photos = client.photos!;
  const suspend = () => f.adapter.run("UPDATE users SET status='SUSPENDED' WHERE id=?;", [f.context.owner.id]);
  return { f, db, present, files, photos, p, suspend, stageChange: (fn: () => void) => { changeStage = fn; }, listChange: (fn: () => void) => { changeList = fn; } };
}

describe.each(['catalogue', 'sales'] as const)('%s captured photo service', caller => {
  it.each(['account', 'member', 'replacement', 'device', 'enrollment'] as const)('denies replacement after %s change at BEGIN and preserves all business/outbox state', change => {
    const s = setup(caller);
    try {
      const first = s.photos.stage('first'); s.photos.replace(s.p.storeProduct.id, first);
      const next = s.photos.stage('next'), before = businessSnapshot(s.f.adapter), files = [...s.present];
      if (change === 'enrollment') createDevice(s.f.adapter, { id: testId(9900), storeId: s.f.context.store.id, userId: s.f.context.owner.id, platform: 'ANDROID', appVersion: '0.0.1' });
      s.db.beforeTransaction = () => {
        if (change === 'account') s.suspend();
        if (change === 'member') s.f.adapter.run("UPDATE store_members SET status='INACTIVE' WHERE id=?;", [s.f.context.membership.id]);
        if (change === 'replacement') s.f.adapter.run('UPDATE store_members SET id=? WHERE id=?;', [testId(9950), s.f.context.membership.id]);
        if (change === 'device') s.f.adapter.run("UPDATE devices SET status='REVOKED' WHERE id=?;", [s.f.context.device.id]);
        if (change === 'enrollment') s.f.adapter.run('UPDATE sync_store_state SET device_id=? WHERE store_id=?;', [testId(9900), s.f.context.store.id]);
      };
      expect(() => s.photos.replace(s.p.storeProduct.id, next)).toThrow();
      expect(businessSnapshot(s.f.adapter)).toEqual(before); expect([...s.present]).toEqual(files);
    } finally { s.f.closeAndDelete(); }
  });
  it('permits existing STAFF photo roles and preserves committed retries/file grace', () => {
    const s = setup(caller);
    try {
      s.f.adapter.run("UPDATE store_members SET role='STAFF' WHERE id=?;", [s.f.context.membership.id]);
      const first = s.photos.stage('first'); s.photos.replace(s.p.storeProduct.id, first);
      const next = s.photos.stage('next'); s.photos.replace(s.p.storeProduct.id, next);
      s.present.delete(`${next}.jpg`); expect(() => s.photos.replace(s.p.storeProduct.id, next)).not.toThrow();
      s.photos.discard(next); expect(s.f.adapter.getFirstRow('SELECT store_product_id FROM media_assets WHERE id=?;', [next])).toEqual({ store_product_id: s.p.storeProduct.id });
      s.photos.recover(); expect(s.present.has(`${first}.jpg`)).toBe(true);
    } finally { s.f.closeAndDelete(); }
  });
});
it('denies staged metadata after authority loss during file staging and cleans only the new files', () => {
  const s = setup(); try {
    const before = businessSnapshot(s.f.adapter); s.stageChange(s.suspend);
    expect(() => s.photos.stage('new')).toThrow(); expect(businessSnapshot(s.f.adapter)).toEqual(before); expect(s.present.size).toBe(0);
  } finally { s.f.closeAndDelete(); }
});
it('checks stage authority after computing metadata, retaining cleanup when its clock callback loses access', () => {
  const s = setup(); try {
    const actor = resolveCurrentActor(s.db), before = businessSnapshot(s.f.adapter);
    const photos = createProductPhotos(s.db, actor.storeId, () => s.files, deterministicIds(9700), () => { s.suspend(); return Date.now(); }, actor);
    expect(() => photos.stage('new')).toThrow(); expect(businessSnapshot(s.f.adapter)).toEqual(before); expect(s.present.size).toBe(0);
  } finally { s.f.closeAndDelete(); }
});
it('denies staged discard after authority loss during its asset read without removing row/file', () => {
  const s = setup(); try {
    const id = s.photos.stage('new'), before = businessSnapshot(s.f.adapter), files = [...s.present];
    s.db.afterRead = sql => { if (sql.startsWith('SELECT * FROM media_assets')) { s.db.afterRead = undefined; s.suspend(); } };
    expect(() => s.photos.discard(id)).toThrow(); expect(businessSnapshot(s.f.adapter)).toEqual(before); expect([...s.present]).toEqual(files);
  } finally { s.f.closeAndDelete(); }
});
it('denies orphan recovery deletion when authority changes while listing files', () => {
  const s = setup(); try {
    s.present.set('orphan.jpg', 0); s.listChange(s.suspend); const before = businessSnapshot(s.f.adapter);
    expect(() => s.photos.recover()).toThrow(); expect(s.present.has('orphan.jpg')).toBe(true); expect(businessSnapshot(s.f.adapter)).toEqual(before);
  } finally { s.f.closeAndDelete(); }
});
it('preserves the explicit low-level photo utility without imposing a new actor/role policy', () => {
  const s = setup(); try {
    const low = createProductPhotos(s.f.adapter, s.f.context.store.id, () => s.files, deterministicIds(9000));
    s.suspend(); const id = low.stage('low-level'); low.replace(s.p.storeProduct.id, id); expect(low.read(s.p.storeProduct.id).status).toBe('available');
  } finally { s.f.closeAndDelete(); }
});
it('active bound cleanup preserves committed assets and removes only expired staged/orphan files', () => {
  const s = setup(); try {
    const attached = s.photos.stage('attached'); s.photos.replace(s.p.storeProduct.id, attached);
    const staged = s.photos.stage('staged'); s.f.adapter.run("UPDATE media_assets SET created_at='2020-01-01T00:00:00.000Z' WHERE id=?;", [staged]);
    s.present.set(`${staged}.jpg`, 0); s.present.set('orphan.jpg', 0); s.photos.recover();
    expect(s.present.has(`${attached}.jpg`)).toBe(true); expect(s.present.has(`${staged}.jpg`)).toBe(false); expect(s.present.has('orphan.jpg')).toBe(false);
    const fresh = s.photos.stage('fresh'); s.photos.discard(fresh); expect(s.present.has(`${fresh}.jpg`)).toBe(false);
  } finally { s.f.closeAndDelete(); }
});
it('preserves explicit catalogue device policy when local enrollment selects another active device', () => {
  const s = setup(); try {
    const explicit = createCatalogueClient(s.db, s.f.context.store, s.f.context.device, deterministicIds(9500), () => s.files);
    const other = createDevice(s.f.adapter, { id: testId(9900), storeId: s.f.context.store.id, userId: s.f.context.owner.id, platform: 'ANDROID', appVersion: '0.0.1' });
    s.f.adapter.run('UPDATE sync_store_state SET device_id=? WHERE store_id=?;', [other.id, s.f.context.store.id]);
    expect(explicit.photos!.stage('explicit')).toBeDefined();
  } finally { s.f.closeAndDelete(); }
});
