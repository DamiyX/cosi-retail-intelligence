import { parseSyncOperationEnvelope } from '@retail/contracts';
import { createTemporaryProduct } from '../src/catalogue/createTemporaryProduct';
import { addProductIdentifier } from '../src/catalogue/updateProductIdentity';
import { deterministicIds, openCatalogueFixture, testId, countRows, reopenDatabase } from './catalogueSupport';
import { getStoreProductById, listProductIdentifiers } from '../src/db/repositories';

it('atomically preserves typed QR, price and identity across replay and restart', () => {
  const fixture = openCatalogueFixture();
  try {
    const input = { storeId: fixture.context.store.id, deviceId: fixture.context.device.id,
      name: 'Temporary soap', barcode: 'https://example.test/a-B', barcodeType: 'QR' as const,
      defaultSellingPriceMinor: 12500 };
    const options = { generateId: deterministicIds(1000), operationId: testId(999) };
    const first = createTemporaryProduct(fixture.adapter, input, options);
    const replay = createTemporaryProduct(fixture.adapter, input, options);
    expect(replay.storeProduct.id).toBe(first.storeProduct.id);
    expect(countRows(fixture.adapter, 'outbox_operations')).toBe(1);
    const envelope = parseSyncOperationEnvelope(JSON.parse(first.outbox.payload));
    expect(envelope.payloadVersion).toBe(1);
    expect(first.identifier).toMatchObject({ type: 'QR', value: input.barcode, packageUnitId: null });
    const reopened = reopenDatabase(fixture.path);
    try {
      expect(getStoreProductById(reopened, first.storeProduct.id)).toMatchObject({ defaultSellingPriceMinor: 12500, isTemporary: true });
      expect(listProductIdentifiers(reopened, first.variant.id)[0]?.value).toBe(input.barcode);
    } finally { reopened.close(); }
  } finally { fixture.closeAndDelete(); }
});

it('rolls back duplicate equivalent barcode creation and replays an explicit association', () => {
  const fixture = openCatalogueFixture();
  try {
    const common = { storeId: fixture.context.store.id, deviceId: fixture.context.device.id };
    const first = createTemporaryProduct(fixture.adapter, { ...common, name: 'A', barcode: '036000291452', barcodeType: 'UPC' }, { generateId: deterministicIds(1000) });
    expect(() => createTemporaryProduct(fixture.adapter, { ...common, name: 'B', barcode: '0036000291452', barcodeType: 'EAN' }, { generateId: deterministicIds(2000) })).toThrow(/equivalent/);
    expect(countRows(fixture.adapter, 'store_products')).toBe(1);
    expect(countRows(fixture.adapter, 'outbox_operations')).toBe(1);
    const input = { ...common, storeProductId: first.storeProduct.id, type: 'QR' as const, value: 'abc', operationId: testId(3000) };
    const linked = addProductIdentifier(fixture.adapter, input, { generateId: deterministicIds(3100) });
    expect(addProductIdentifier(fixture.adapter, input).identifier.id).toBe(linked.identifier.id);
    expect(addProductIdentifier(fixture.adapter, { ...input, operationId: testId(3200) }).identifier.id).toBe(linked.identifier.id);
    expect(countRows(fixture.adapter, 'outbox_operations')).toBe(2);
  } finally { fixture.closeAndDelete(); }
});
