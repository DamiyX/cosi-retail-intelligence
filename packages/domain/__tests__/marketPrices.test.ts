import {
  sanitizeAcceptedMarketPurchase, aggregateMarketContributions, makeRational,
  type AcceptedMarketPurchase, type MarketEligibility, type ReviewedMarketMapping, type PrivateMarketContribution,
} from '../src';

/** All evidence here is explicitly SYNTHETIC. Not private/live retailer data. */
const now = '2026-10-03T06:00:00.000Z';
const eligibility: MarketEligibility = {
  storeId: 'synthetic-store', enabled: true, generation: 1, enabledAt: '2026-10-01T00:00:00.000Z', cutoffRevision: 10,
  zoneId: 'synthetic-zone', zoneVersion: 1, countryCode: 'NG', currencyCode: 'NGN', zoneApproved: true, zoneActive: true,
  accountActive: true, ownerActive: true, storeActive: true, deviceActive: true, deviceEnrolled: true,
};
const mapping: ReviewedMarketMapping = {
  storeId: eligibility.storeId, localVariantId: 'synthetic-local-variant', localPackageId: 'synthetic-local-package',
  marketVariantId: 'synthetic-canonical-variant', marketPackageId: 'synthetic-canonical-package',
  conversionMicros: '12000000', countryCode: 'NG', currencyCode: 'NGN', version: 1, approved: true, active: true,
};
const fact: AcceptedMarketPurchase = {
  origin: 'SERVER_ACCEPTED_M7', storeId: eligibility.storeId, observationId: 'synthetic-observation', acceptedRevision: 11,
  productVariantId: mapping.localVariantId, packageUnitId: mapping.localPackageId, sourceType: 'RETAILER_PURCHASE',
  validationStatus: 'VALID', purchaseStatus: 'COMPLETED', currencyCode: 'NGN', observedAt: '2026-10-02T00:00:00.000Z',
  purchaseOccurredAt: '2026-10-02T00:00:00.000Z', quantityPackagesMicros: '1000000', quantityBaseMicros: '12000000',
  conversionMicros: '12000000', totalCostMinor: '100', packageCost: makeRational(100), baseCost: makeRational(25,3), originalConsent: false,
};

describe('M10 sanitizer private accepted-source parity oracle', () => {
  it('admits consistent prospective facts and preserves false receipt consent without retaining supplier/contact/quantity', () => {
    const sanitized = sanitizeAcceptedMarketPurchase({ ...fact, supplier: 'PRIVATE', quantity: 99 } as AcceptedMarketPurchase,eligibility,mapping,now);
    expect(sanitized).toMatchObject({ generation: 1, packageCost: makeRational(100), baseCost: makeRational(25,3) });
    expect(Object.keys(sanitized!).sort()).toEqual([
      'storeId','observationId','generation','acceptedRevision','marketVariantId','marketPackageId','zoneId','currencyCode',
      'mappingVersion','zoneVersion','observedAt','packageCost','baseCost',
    ].sort());
    expect(fact.originalConsent).toBe(false);
  });
  it.each([
    { acceptedRevision: 10 }, { observedAt: '2026-09-30T00:00:00.000Z' }, { observedAt: '2026-10-04T00:00:00.000Z' },
    { validationStatus: 'ESTIMATED' }, { validationStatus: 'UNAVAILABLE' }, { sourceType: 'CLIENT_ASSERTED' },
    { storeId: 'foreign-store' }, { currencyCode: 'USD' }, { conversionMicros: '1000000' }, { totalCostMinor: '0' },
    { quantityPackagesMicros: '0' }, { packageCost: makeRational(101) }, { baseCost: makeRational(9) },
    { packageCost: { numerator: '200', denominator: '2' } }, { purchaseStatus: 'DRAFT' }, { quantityBaseMicros: '1' },
    { packageUnitId: 'different-package' }, { purchaseOccurredAt: '2026-10-01T00:00:00.000Z' },
  ])('rejects incompatible/corrupt/private-only fact %j', changed => {
    expect(sanitizeAcceptedMarketPurchase({ ...fact, ...changed },eligibility,mapping,now)).toBeNull();
  });
  it.each(['enabled','zoneApproved','zoneActive','accountActive','ownerActive','storeActive','deviceActive','deviceEnrolled'] as const)('rejects absent current %s', field => {
    expect(sanitizeAcceptedMarketPurchase(fact,{ ...eligibility, [field]: false },mapping,now)).toBeNull();
  });
  it('rejects missing/unreviewed/foreign-country mappings and never backfills prior generations', () => {
    expect(sanitizeAcceptedMarketPurchase(fact,eligibility,null,now)).toBeNull();
    for (const changed of [{ approved: false },{ active: false },{ countryCode: 'US' },{ currencyCode: 'USD' }])
      expect(sanitizeAcceptedMarketPurchase(fact,eligibility,{ ...mapping, ...changed },now)).toBeNull();
    expect(sanitizeAcceptedMarketPurchase(fact,{ ...eligibility, generation: 3, cutoffRevision: 12, enabledAt: now },mapping,now)).toBeNull();
  });
});

const contribution = sanitizeAcceptedMarketPurchase(fact,eligibility,mapping,now)!;
const cohort = { marketVariantId: mapping.marketVariantId, marketPackageId: mapping.marketPackageId, zoneId: eligibility.zoneId, currencyCode: 'NGN' };
function sample(index: number, cost: ReturnType<typeof makeRational>): PrivateMarketContribution {
  return { ...contribution, storeId: `synthetic-store-${index}`, observationId: `synthetic-observation-${index}`, packageCost: cost };
}
describe('M10 exact fixed-policy aggregation', () => {
  it('four independent stores remain sparse despite repeated devices/transactions', () => {
    const rows = [1,2,3,4].map(i => sample(i,makeRational(i)));
    expect(aggregateMarketContributions([...rows,...rows,...rows],cohort,now)).toEqual({ status: 'INSUFFICIENT_DATA' });
  });
  it('five distinct stores release exact odd median/range and no private identity', () => {
    const result = aggregateMarketContributions([9,3,1,7,5].map((cost,i) => sample(i,makeRational(cost,3))),cohort,now);
    expect(result).toMatchObject({ status: 'AVAILABLE', minimum: makeRational(1,3), median: makeRational(5,3), maximum: makeRational(3), observationCount: 5, coverage: 'LIMITED' });
    expect(JSON.stringify(result)).not.toMatch(/synthetic-store|synthetic-observation|supplier|trend|confidence/);
  });
  it('even midpoint remains rational beyond floating-point precision', () => {
    const large = 9007199254740993n;
    const result = aggregateMarketContributions([1n,2n,3n,4n,5n,6n].map((i,index) => sample(index,makeRational(large+i,3))),cohort,now);
    expect(result).toMatchObject({ median: makeRational(2n*large+7n,6) });
  });
  it('latest observation/tie revision/id determines one representative per store', () => {
    const rows = [1,2,3,4,5].map(i => sample(i,makeRational(i)));
    const later = { ...rows[4], observationId: 'z', acceptedRevision: 12, packageCost: makeRational(1) };
    expect(aggregateMarketContributions([...rows,later],cohort,now)).toMatchObject({ maximum: makeRational(4), observationCount: 5 });
  });
  it('keeps microsecond latest ordering and excludes a microsecond-future receipt',() => {
    const rows=[1,2,3,4,5].map(i => sample(i,makeRational(i)));
    rows[4]={ ...rows[4],observedAt:'2026-10-02T06:00:00.000001Z',acceptedRevision:999 };
    const later={ ...rows[4],observedAt:'2026-10-02T06:00:00.000002Z',acceptedRevision:11,packageCost:makeRational(1) };
    expect(aggregateMarketContributions([...rows,later],cohort,now)).toMatchObject({ maximum:makeRational(4) });
    expect(sanitizeAcceptedMarketPurchase({ ...fact,observedAt:'2026-10-03T06:00:00.000001Z',purchaseOccurredAt:'2026-10-03T06:00:00.000001Z' },eligibility,mapping,now)).toBeNull();
  });
  it.each(['marketVariantId','marketPackageId','zoneId','currencyCode'] as const)('never mixes %s cohorts', field => {
    const rows = [1,2,3,4].map(i => sample(i,makeRational(i)));
    expect(aggregateMarketContributions([...rows,{ ...sample(5,makeRational(5)), [field]: 'different' }],cohort,now)).toEqual({ status: 'INSUFFICIENT_DATA' });
  });
  it('excludes old/future rows and removal below threshold removes all numerics', () => {
    const rows = [1,2,3,4].map(i => sample(i,makeRational(i)));
    for (const observedAt of ['2026-09-01T00:00:00.000Z','2026-10-04T00:00:00.000Z'])
      expect(aggregateMarketContributions([...rows,{ ...sample(5,makeRational(5)), observedAt }],cohort,now)).toEqual({ status: 'INSUFFICIENT_DATA' });
  });
});
