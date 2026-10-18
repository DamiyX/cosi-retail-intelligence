import { selectPersonalPriceComparison, type PersonalPriceObservation } from '../src';

function observation(id: string, observedAt: string, createdAt = observedAt, cost = '100'): PersonalPriceObservation {
  return { id, storeId: 'store', productVariantId: 'variant', packageUnitId: 'package', currencyCode: 'NGN', validationStatus: 'VALID',
    observedAt, createdAt, packageCostNumerator: cost, packageCostDenominator: '1', baseUnitCostNumerator: cost, baseUnitCostDenominator: '1' };
}

it.each([
  ['2026-10-03T10:00:00.000001Z', '2026-10-03T10:00:00.000002Z'],
  ['2026-10-03T10:00:00.000000000000000000001Z', '2026-10-03T10:00:00.000000000000000000002Z'],
  ['2026-10-03T11:00:00.000001+01:00', '2026-10-03T09:00:00.000002-01:00'],
  ['2026-10-04T09:59:00+23:59', '2026-10-03T10:00:00.000001Z'],
])('uses exact accepted observation instants %s / %s before ID ties', (older, newer) => {
  const facts = [observation('z-older', older), observation('a-newer', newer, newer, '200')];
  const before = JSON.stringify(facts);
  expect(selectPersonalPriceComparison({ storeId: 'store', productVariantId: 'variant', observations: facts })).toMatchObject({ latestId: 'a-newer', previousId: 'z-older', direction: 'INCREASE', percentageTenths: '1000' });
  expect(JSON.stringify(facts)).toBe(before);
});

it('uses creation precision after offset-equivalent observation instants, then exact ID ties', () => {
  const older = observation('z-older', '2026-10-03T11:00:00.0001000+01:00', '2026-10-03T10:00:00.000001Z');
  const newer = observation('a-newer', '2026-10-03T10:00:00.0001Z', '2026-10-03T10:00:00.000002Z', '200');
  expect(selectPersonalPriceComparison({ storeId: 'store', productVariantId: 'variant', observations: [older, newer] })).toMatchObject({ latestId: 'a-newer', direction: 'INCREASE' });
  const tied = { ...newer, createdAt: '2026-10-03T11:00:00.000001000+01:00' };
  expect(selectPersonalPriceComparison({ storeId: 'store', productVariantId: 'variant', observations: [older, tied] })).toMatchObject({ latestId: 'z-older' });
});
