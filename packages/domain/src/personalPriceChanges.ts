import { parseRational, type Rational } from './costing';

export type PersonalPriceValidationStatus = 'VALID' | 'ESTIMATED' | 'UNAVAILABLE';
export type PersonalPriceComparisonBasis = 'PACKAGE' | 'BASE_UNIT';
export type PersonalPriceDirection = 'INCREASE' | 'DECREASE' | 'UNCHANGED';

export interface PersonalPriceObservation {
  readonly id: string;
  readonly storeId: string;
  readonly productVariantId: string;
  readonly packageUnitId: string;
  readonly currencyCode: string;
  readonly packageCostNumerator: string;
  readonly packageCostDenominator: string;
  readonly baseUnitCostNumerator: string;
  readonly baseUnitCostDenominator: string;
  readonly validationStatus: PersonalPriceValidationStatus;
  readonly observedAt: string;
  readonly createdAt: string;
}

export type PersonalPriceComparisonSelection =
  | {
      readonly kind: 'none';
      readonly reason: 'NO_VALID_OBSERVATION' | 'ONE_VALID_OBSERVATION' | 'NO_COMPARABLE_PREVIOUS';
      readonly latestId: string | null;
    }
  | {
      readonly kind: 'invalid';
      readonly reason: 'SCOPE_MISMATCH' | 'INVALID_OBSERVATION_TIME' | 'INVALID_RATIONAL';
      readonly latestId: string | null;
    }
  | {
      readonly kind: 'comparison';
      readonly latestId: string;
      readonly previousId: string;
      readonly basis: PersonalPriceComparisonBasis;
      readonly direction: PersonalPriceDirection;
      /** Signed percentage change rounded to one decimal place as integer tenths. */
      readonly percentageTenths: string | null;
    };

function rationalFor(
  observation: PersonalPriceObservation,
  basis: PersonalPriceComparisonBasis,
): Rational {
  return basis === 'PACKAGE'
    ? parseRational({
        numerator: observation.packageCostNumerator,
        denominator: observation.packageCostDenominator,
      }, 'package price')
    : parseRational({
        numerator: observation.baseUnitCostNumerator,
        denominator: observation.baseUnitCostDenominator,
      }, 'base-unit price');
}

function compareRationalValues(left: Rational, right: Rational): -1 | 0 | 1 {
  const difference = BigInt(left.numerator) * BigInt(right.denominator)
    - BigInt(right.numerator) * BigInt(left.denominator);
  return difference < 0n ? -1 : difference > 0n ? 1 : 0;
}

function percentageChangeTenths(previous: Rational, latest: Rational): string | null {
  const previousNumerator = BigInt(previous.numerator);
  if (previousNumerator === 0n) return null;

  const latestNumerator = BigInt(latest.numerator);
  const previousDenominator = BigInt(previous.denominator);
  const latestDenominator = BigInt(latest.denominator);
  const difference = latestNumerator * previousDenominator - previousNumerator * latestDenominator;
  const denominator = latestDenominator * previousNumerator;
  const scaledMagnitude = (difference < 0n ? -difference : difference) * 1000n;
  const roundedMagnitude = (scaledMagnitude * 2n + denominator) / (denominator * 2n);
  return difference < 0n ? `-${roundedMagnitude}` : roundedMagnitude.toString();
}

function compareTextDescending(left: string, right: string): number {
  if (left === right) return 0;
  return left > right ? -1 : 1;
}

function compareObservationDescending(left: PersonalPriceObservation, right: PersonalPriceObservation): number {
  const observedDifference = Date.parse(right.observedAt) - Date.parse(left.observedAt);
  if (observedDifference !== 0) return observedDifference;

  const createdDifference = Date.parse(right.createdAt) - Date.parse(left.createdAt);
  if (createdDifference !== 0) return createdDifference;
  return compareTextDescending(left.id, right.id);
}

/**
 * Select one exact private restock-cost comparison. Inputs must already be
 * limited to one store product; scope checks remain here as a second guard.
 * All arithmetic that determines direction or percentage uses BigInt.
 */
export function selectPersonalPriceComparison(input: {
  storeId: string;
  productVariantId: string;
  observations: readonly PersonalPriceObservation[];
}): PersonalPriceComparisonSelection {
  if (input.observations.some((observation) =>
    observation.storeId !== input.storeId || observation.productVariantId !== input.productVariantId)) {
    return { kind: 'invalid', reason: 'SCOPE_MISMATCH', latestId: null };
  }

  const eligible = input.observations.filter((observation) => observation.validationStatus === 'VALID');
  if (eligible.some((observation) =>
    !Number.isFinite(Date.parse(observation.observedAt)) || !Number.isFinite(Date.parse(observation.createdAt)))) {
    return { kind: 'invalid', reason: 'INVALID_OBSERVATION_TIME', latestId: null };
  }

  const ordered = [...eligible].sort(compareObservationDescending);
  const latest = ordered[0];
  if (!latest) return { kind: 'none', reason: 'NO_VALID_OBSERVATION', latestId: null };
  if (ordered.length === 1) return { kind: 'none', reason: 'ONE_VALID_OBSERVATION', latestId: latest.id };

  const earlierSameCurrency = ordered.slice(1).filter((observation) =>
    observation.currencyCode === latest.currencyCode);
  const samePackage = earlierSameCurrency.find((observation) =>
    observation.packageUnitId === latest.packageUnitId);
  const previous = samePackage ?? earlierSameCurrency[0];
  if (!previous) {
    return { kind: 'none', reason: 'NO_COMPARABLE_PREVIOUS', latestId: latest.id };
  }

  const basis: PersonalPriceComparisonBasis = samePackage ? 'PACKAGE' : 'BASE_UNIT';
  try {
    const latestPrice = rationalFor(latest, basis);
    const previousPrice = rationalFor(previous, basis);
    const compared = compareRationalValues(latestPrice, previousPrice);
    return {
      kind: 'comparison',
      latestId: latest.id,
      previousId: previous.id,
      basis,
      direction: compared > 0 ? 'INCREASE' : compared < 0 ? 'DECREASE' : 'UNCHANGED',
      percentageTenths: percentageChangeTenths(previousPrice, latestPrice),
    };
  } catch {
    return { kind: 'invalid', reason: 'INVALID_RATIONAL', latestId: latest.id };
  }
}
