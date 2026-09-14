import { DomainError } from './errors';

/**
 * Convert a package count into base inventory units exactly.
 *
 * M1 constraint (documented, revisited only by an explicit decision): both
 * the package quantity and the conversion factor must be integers, the factor
 * must be positive, and the quantity must be non-negative. Integer products
 * inside the safe-integer range are exact, which is what near-term FMCG
 * package levels (sachet = 1, pack = 10, carton = 40) require. Fractional
 * base units remain a deferred M2+ modeling decision per the technical
 * architecture, not silent floating-point math.
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
