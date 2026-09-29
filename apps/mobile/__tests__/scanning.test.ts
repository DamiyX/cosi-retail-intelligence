import { createTemporaryProduct } from '../src/catalogue/createTemporaryProduct';
import { createProductIdentifier } from '../src/db/repositories';
import { createRecognitionService } from '../src/features/scanning/resolver';
import { ScanSession } from '../src/features/scanning/session';
import { deterministicIds, openCatalogueFixture, testId } from './catalogueSupport';

it('latches stationary frames, permits distinct codes and explicit repeats, and rejects stale work', () => {
  const session = new ScanSession();
  const first = session.begin('A')!;
  session.finish(first);
  expect(session.begin('A')).toBeNull();
  session.cancel();
  expect(session.isCurrent(first)).toBe(false);
  expect(session.begin('A')).toBeNull();
  const next = session.begin('B')!;
  session.finish(next);
  session.repeatExplicitly();
  expect(session.begin('A')).not.toBeNull();
});

it('resolves validated aliases with exact package at zero stock, scopes store and retains QR raw equality', async () => {
  const fixture = openCatalogueFixture();
  try {
    const graph = createTemporaryProduct(fixture.adapter, {
      storeId: fixture.context.store.id, deviceId: fixture.context.device.id, name: 'Milk',
    }, { generateId: deterministicIds(500) });
    createProductIdentifier(fixture.adapter, { id: testId(600), productVariantId: graph.variant.id,
      packageUnitId: graph.basePackage.id, type: 'UPC', value: '036000291452' });
    const service = createRecognitionService(fixture.adapter, fixture.context.store.id);
    const input = { sessionId: 's', requestId: 'r', symbology: 'ean13' as const, value: '0036000291452' };
    expect(await service.recognize(input)).toMatchObject({ status: 'STRONG', candidate: { packageUnitId: graph.basePackage.id } });
    expect(await createRecognitionService(fixture.adapter, testId(999)).recognize(input)).toMatchObject({ status: 'UNKNOWN' });
    createProductIdentifier(fixture.adapter, { id: testId(601), productVariantId: graph.variant.id, type: 'QR', value: 'a-B' });
    expect(await service.recognize({ ...input, symbology: 'qr', value: 'ab' })).toMatchObject({ status: 'UNKNOWN' });
    expect(await service.recognize({ ...input, symbology: 'qr', value: 'a-B' })).toMatchObject({ status: 'STRONG', candidate: { requiresPackageConfirmation: true } });
    fixture.adapter.run("UPDATE package_units SET status = 'INACTIVE' WHERE id = ?", [graph.basePackage.id]);
    expect(await service.recognize(input)).toMatchObject({ status: 'UNKNOWN' });
  } finally { fixture.closeAndDelete(); }
});
