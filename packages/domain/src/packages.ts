import { DomainError } from './errors';

/**
 * PROVISIONAL discrete-only conversion from a package count into base
 * inventory units.
 *
 * M1 scope is deliberately limited to non-negative integer quantities and
 * positive integer conversion factors, whose products inside the safe-
 * integer range are exact — this covers near-term FMCG package levels
 * (sachet = 1, pack = 10, carton = 40). This is NOT the final package
 * model: the approved architecture leaves fractional base quantities open,
 * so persisting PackageUnit definitions (M2) is blocked on an explicit
 * fractional-quantity architecture decision (see DF-010). Do not extend
 * this utility to fractional semantics without that review.
 */
export function toBaseUnits(quantityPackages: number, conversionToBase: number): number {
  if (
    typeof quantityPackages !== 'number' ||
    !Number.isSafeInteger(quantityPackages) ||
    quantityPackages < 0
  ) {
    throw new DomainError(
      'INVALID_QUANTITY',
      'Package quantities must be non-negative safe integers.',
    );
  }
  if (
    typeof conversionToBase !== 'number' ||
    !Number.isSafeInteger(conversionToBase) ||
    conversionToBase <= 0
  ) {
    throw new DomainError(
      'INVALID_CONVERSION',
      'Package conversion factors must be positive safe integers.',
    );
  }
  const baseUnits = quantityPackages * conversionToBase;
  if (!Number.isSafeInteger(baseUnits)) {
    throw new DomainError('INVALID_QUANTITY', 'Converted base quantity exceeds the safe integer range.');
  }
  return baseUnits;
}
