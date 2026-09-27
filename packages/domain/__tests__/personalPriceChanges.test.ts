import { selectPersonalPriceComparison, type PersonalPriceObservation } from '../src';

function observation(overrides: Partial<PersonalPriceObservation> = {}): PersonalPriceObservation {
  return {
    id: 'obs-1',
    storeId: 'store-1',
    productVariantId: 'variant-1',
    packageUnitId: 'package-1',
    currencyCode: 'NGN',
    packageCostNumerator: '100',
    packageCostDenominator: '1',
    baseUnitCostNumerator: '10',
    baseUnitCostDenominator: '1',
    validationStatus: 'VALID',
    observedAt: '2026-01-01T10:00:00.000Z',
    createdAt: '2026-01-01T10:00:00.000Z',
    ...overrides,
  };
}

describe('selectPersonalPriceComparison', () => {
  it('selects exact same-package increases, decreases, unchanged values, and zero baselines', () => {
    const old = observation({ id: 'old', packageCostNumerator: '3', packageCostDenominator: '2' });
    const increased = observation({ id: 'new', observedAt: '2026-01-02T10:00:00.000Z', packageCostNumerator: '2', packageCostDenominator: '1' });
    expect(selectPersonalPriceComparison({ storeId: 'store-1', productVariantId: 'variant-1', observations: [old, increased] })).toMatchObject({
      kind: 'comparison', latestId: 'new', previousId: 'old', basis: 'PACKAGE', direction: 'INCREASE', percentageTenths: '333',
    });

    const decrease = observation({ id: 'new', observedAt: '2026-01-02T10:00:00.000Z', packageCostNumerator: '3', packageCostDenominator: '2' });
    const previous = observation({ id: 'old', packageCostNumerator: '2' });
    expect(selectPersonalPriceComparison({ storeId: 'store-1', productVariantId: 'variant-1', observations: [previous, decrease] })).toMatchObject({
      kind: 'comparison', direction: 'DECREASE', percentageTenths: '-250',
    });

    const unchanged = observation({ id: 'new', observedAt: '2026-01-02T10:00:00.000Z' });
    expect(selectPersonalPriceComparison({ storeId: 'store-1', productVariantId: 'variant-1', observations: [observation(), unchanged] })).toMatchObject({
      kind: 'comparison', direction: 'UNCHANGED', percentageTenths: '0',
    });

    const fromZero = observation({ id: 'new', observedAt: '2026-01-02T10:00:00.000Z', packageCostNumerator: '1' });
    const zero = observation({ id: 'old', packageCostNumerator: '0' });
    expect(selectPersonalPriceComparison({ storeId: 'store-1', productVariantId: 'variant-1', observations: [zero, fromZero] })).toMatchObject({
      kind: 'comparison', direction: 'INCREASE', percentageTenths: null,
    });
  });

  it('uses same-package priority, then a labelled exact base-unit fallback across packages', () => {
    const base = observation({ id: 'base', packageUnitId: 'piece', packageCostNumerator: '5', baseUnitCostNumerator: '5' });
    const moreRecentDifferentPackage = observation({
      id: 'pack-newer', packageUnitId: 'pack', observedAt: '2026-01-02T10:00:00.000Z', packageCostNumerator: '60', baseUnitCostNumerator: '6',
    });
    const latest = observation({
      id: 'latest', packageUnitId: 'piece', observedAt: '2026-01-03T10:00:00.000Z', packageCostNumerator: '7', baseUnitCostNumerator: '5',
    });
    expect(selectPersonalPriceComparison({
      storeId: 'store-1', productVariantId: 'variant-1', observations: [base, moreRecentDifferentPackage, latest],
    })).toMatchObject({ previousId: 'base', basis: 'PACKAGE' });

    const onlyOtherPackage = observation({ id: 'carton', packageUnitId: 'carton', packageCostNumerator: '500', baseUnitCostNumerator: '5' });
    expect(selectPersonalPriceComparison({
      storeId: 'store-1', productVariantId: 'variant-1', observations: [onlyOtherPackage, latest],
    })).toMatchObject({ previousId: 'carton', basis: 'BASE_UNIT', direction: 'UNCHANGED' });
  });

  it('rounds only the displayed percentage and retains exact rational comparisons', () => {
    const previous = observation({ id: 'old', packageCostNumerator: '3', packageCostDenominator: '2' });
    const latest = observation({ id: 'new', observedAt: '2026-01-02T10:00:00.000Z', packageCostNumerator: '5', packageCostDenominator: '3' });
    expect(selectPersonalPriceComparison({ storeId: 'store-1', productVariantId: 'variant-1', observations: [previous, latest] })).toMatchObject({
      kind: 'comparison', direction: 'INCREASE', percentageTenths: '111',
    });

    const largePrevious = observation({ id: 'old', packageCostNumerator: '9007199254740990' });
    const largeLatest = observation({ id: 'new', observedAt: '2026-01-02T10:00:00.000Z', packageCostNumerator: '9007199254740991' });
    expect(selectPersonalPriceComparison({ storeId: 'store-1', productVariantId: 'variant-1', observations: [largePrevious, largeLatest] })).toMatchObject({
      kind: 'comparison', direction: 'INCREASE', percentageTenths: '0',
    });
  });

  it('chooses timestamp, created-time, then ID ties deterministically', () => {
    const tiedA = observation({ id: 'a', observedAt: '2026-01-02T10:00:00.000Z', createdAt: '2026-01-02T10:00:00.000Z', packageCostNumerator: '10' });
    const tiedZ = observation({ id: 'z', observedAt: '2026-01-02T10:00:00.000Z', createdAt: '2026-01-02T10:00:00.000Z', packageCostNumerator: '20' });
    const older = observation({ id: 'older', packageCostNumerator: '5' });
    expect(selectPersonalPriceComparison({ storeId: 'store-1', productVariantId: 'variant-1', observations: [older, tiedA, tiedZ] })).toMatchObject({
      kind: 'comparison', latestId: 'z', previousId: 'a', direction: 'INCREASE',
    });
  });

  it('rejects scope mismatches and never compares currencies, products, or stores', () => {
    expect(selectPersonalPriceComparison({
      storeId: 'store-1', productVariantId: 'variant-1', observations: [observation(), observation({ id: 'foreign', storeId: 'store-2' })],
    })).toMatchObject({ kind: 'invalid', reason: 'SCOPE_MISMATCH' });
    expect(selectPersonalPriceComparison({
      storeId: 'store-1', productVariantId: 'variant-1', observations: [observation(), observation({ id: 'foreign', productVariantId: 'variant-2' })],
    })).toMatchObject({ kind: 'invalid', reason: 'SCOPE_MISMATCH' });

    const olderUSD = observation({ id: 'usd', currencyCode: 'USD' });
    const latestNGN = observation({ id: 'ngn', observedAt: '2026-01-02T10:00:00.000Z' });
    expect(selectPersonalPriceComparison({ storeId: 'store-1', productVariantId: 'variant-1', observations: [olderUSD, latestNGN] })).toMatchObject({
      kind: 'none', reason: 'NO_COMPARABLE_PREVIOUS', latestId: 'ngn',
    });
  });

  it('excludes estimated/unavailable observations and reports zero, one, and absent history honestly', () => {
    const estimated = observation({ id: 'estimated', validationStatus: 'ESTIMATED' });
    const unavailable = observation({ id: 'unavailable', validationStatus: 'UNAVAILABLE' });
    expect(selectPersonalPriceComparison({ storeId: 'store-1', productVariantId: 'variant-1', observations: [estimated, unavailable] })).toMatchObject({
      kind: 'none', reason: 'NO_VALID_OBSERVATION', latestId: null,
    });
    expect(selectPersonalPriceComparison({ storeId: 'store-1', productVariantId: 'variant-1', observations: [estimated, observation()] })).toMatchObject({
      kind: 'none', reason: 'ONE_VALID_OBSERVATION', latestId: 'obs-1',
    });
  });

  it('returns invalid rather than coercing malformed rationals or observation times', () => {
    const malformed = observation({ id: 'new', observedAt: '2026-01-02T10:00:00.000Z', packageCostDenominator: '0' });
    expect(selectPersonalPriceComparison({ storeId: 'store-1', productVariantId: 'variant-1', observations: [observation(), malformed] })).toMatchObject({
      kind: 'invalid', reason: 'INVALID_RATIONAL', latestId: 'new',
    });
    expect(selectPersonalPriceComparison({
      storeId: 'store-1', productVariantId: 'variant-1', observations: [observation({ observedAt: 'invalid' })],
    })).toMatchObject({ kind: 'invalid', reason: 'INVALID_OBSERVATION_TIME' });
  });
});
