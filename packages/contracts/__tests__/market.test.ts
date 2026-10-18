import { parseMarketReadResponse, parseMarketControlRequest, validateMarketKeys } from '../src';

const id = (n: number) => `00000000-0000-4000-8000-${n.toString().padStart(12,'0')}`;
const key = { productVariantId: id(1), packageUnitId: id(2) };
/** SYNTHETIC release values; no real market claim. */
const release = {
  key, mappingVersion: 1, marketVariantId: id(3), marketPackageId: id(4), packageName: 'Synthetic package',
  status: 'AVAILABLE', minimum: { numerator: '1', denominator: '3' }, median: { numerator: '2', denominator: '3' },
  maximum: { numerator: '1', denominator: '1' }, observationCount: 5, coverage: 'LIMITED', windowDays: 30,
  windowStart: '2026-09-03T06:00:00.000Z', observedThrough: '2026-10-02T06:00:00.000Z',
  calculatedAt: '2026-10-03T06:00:00.000Z', validUntil: '2026-10-04T06:00:00.000Z',
};
const response = { policyVersion: 1, storeId: id(5), controlVersion: 1, generation: 1,
  zone: { id: id(6), name: 'Synthetic zone', countryCode: 'NG', currencyCode: 'NGN', version: 1 },
  currencyCode: 'NGN', revision: 1, serverTime: '2026-10-03T06:00:00.000Z', results: [release] };

it('validates exact bounded release and sparse states without private payload', () => {
  expect(parseMarketReadResponse(response).results[0].status).toBe('AVAILABLE');
  const sparse = { key, mappingVersion: 0, marketVariantId: null, marketPackageId: null, packageName: null, status: 'UNMAPPED' };
  expect(parseMarketReadResponse({ ...response, results: [sparse] }).results[0].status).toBe('UNMAPPED');
  expect(() => parseMarketReadResponse({ ...response, results: [{ ...sparse, median: release.median }] })).toThrow();
});
it.each([
  { observationCount: 4 }, { coverage: 'HIGH' }, { trend: 'RISING' }, { retailerId: id(99) }, { supplier: 'PRIVATE' },
  { minimum: { numerator: '0', denominator: '1' } }, { median: { numerator: '100', denominator: '1' } },
  { validUntil: '2026-10-05T06:00:00.000Z' }, { windowStart: '2026-09-04T06:00:00.000Z' },
  { observedThrough: '2026-10-04T06:00:00.000Z' }, { calculatedAt: '2026-10-04T06:00:00.000Z' },
])('rejects malformed/overclaimed release %j', change => {
  expect(() => parseMarketReadResponse({ ...response, results: [{ ...release, ...change }] })).toThrow();
});
it('bounds and deduplicates keys, rejects asserted control prices or missing explicit zone', () => {
  expect(() => validateMarketKeys(Array.from({ length: 101 },(_,i) => ({ productVariantId: id(i+100),packageUnitId:id(2) })))).toThrow();
  expect(() => validateMarketKeys([key,key])).toThrow();
  expect(() => parseMarketControlRequest({ policyVersion: 1,storeId:id(5),deviceId:id(6),operationId:id(7),expectedVersion:0,enabled:true,zoneId:null })).toThrow();
  expect(() => parseMarketControlRequest({ policyVersion: 1,storeId:id(5),deviceId:id(6),operationId:id(7),expectedVersion:0,enabled:true,zoneId:id(8),price:100 })).toThrow();
});
