import { DomainError } from './errors';
import { convertPackagesToBase, MAX_MICROS_MAGNITUDE, MICROS_PER_UNIT } from './packages';

const MICROS_BIGINT = BigInt(MICROS_PER_UNIT);

/**
 * D-036 exact sale arithmetic.
 *
 * All authoritative package and base quantities are fixed-scale micro-units
 * (D-034). Unit selling prices, absolute line discounts, line totals, and sale
 * totals are stored as integers in currency minor units. Binary floating point
 * is never used. Any quantity-price product producing a fractional minor unit
 * or an unrepresentable base-unit quantity is rejected rather than silently
 * rounded.
 */

export interface SaleLineCalculationInput {
  /** Quantity of packages sold, in D-034 micro-units (> 0). */
  quantityPackagesMicros: number;
  /** Base units per package unit, in D-034 micro-units (> 0). */
  conversionToBaseMicros: number;
  /** Unit price for this package, in integer minor units (>= 0). */
  unitPriceMinor: number;
  /** Optional absolute line discount, in integer minor units (>= 0). */
  discountAmountMinor?: number;
}

export interface CalculatedSaleLine {
  quantityPackagesMicros: number;
  conversionToBaseMicros: number;
  quantityBaseMicros: number;
  unitPriceMinor: number;
  grossTotalMinor: number;
  discountAmountMinor: number;
  netTotalMinor: number;
}

export interface CalculatedSaleTotals {
  subtotalMinor: number;
  discountTotalMinor: number;
  totalMinor: number;
  lineCount: number;
}

function assertPositiveSafeInteger(value: number, field: string): void {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new DomainError('INVALID_QUANTITY', `${field} must be a positive safe integer.`);
  }
}

function assertNonNegativeSafeInteger(value: number, field: string): void {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new DomainError('INVALID_MONEY', `${field} must be a non-negative safe integer in minor units.`);
  }
}

/**
 * `CalculatedSaleLine` is exported so application layers can retain a preview,
 * but totals must not trust a structurally-compatible object supplied across a
 * boundary. Recalculate the public fields before aggregating them so an
 * inconsistent, rounded, or unsafe line cannot become an authoritative sale
 * total.
 */
function assertExactCalculatedLine(line: CalculatedSaleLine): void {
  if (line === null || typeof line !== 'object') {
    throw new DomainError('INVALID_VALUE', 'Sale totals require calculated sale lines.');
  }

  const recalculated = calculateSaleLine({
    quantityPackagesMicros: line.quantityPackagesMicros,
    conversionToBaseMicros: line.conversionToBaseMicros,
    unitPriceMinor: line.unitPriceMinor,
    discountAmountMinor: line.discountAmountMinor,
  });

  if (
    line.quantityBaseMicros !== recalculated.quantityBaseMicros ||
    line.grossTotalMinor !== recalculated.grossTotalMinor ||
    line.netTotalMinor !== recalculated.netTotalMinor
  ) {
    throw new DomainError(
      'INVALID_VALUE',
      'Sale line values must match the exact quantity, conversion, price, and discount calculation.',
    );
  }
}

/**
 * Calculate line totals and base quantity for one sale line exactly under D-036.
 * Rejects zero/negative quantity, negative price/discount, discounts exceeding
 * gross total, fractional base units, and fractional minor currency units.
 */
export function calculateSaleLine(input: SaleLineCalculationInput): CalculatedSaleLine {
  assertPositiveSafeInteger(input.quantityPackagesMicros, 'Package quantity');
  if (input.quantityPackagesMicros > MAX_MICROS_MAGNITUDE) {
    throw new DomainError('INVALID_QUANTITY', 'Package quantity exceeds the safe persisted range.');
  }

  assertPositiveSafeInteger(input.conversionToBaseMicros, 'Package conversion factor');
  if (input.conversionToBaseMicros > MAX_MICROS_MAGNITUDE) {
    throw new DomainError('INVALID_CONVERSION', 'Package conversion factor exceeds the safe persisted range.');
  }

  assertNonNegativeSafeInteger(input.unitPriceMinor, 'Unit price');
  const discountAmountMinor = input.discountAmountMinor ?? 0;
  assertNonNegativeSafeInteger(discountAmountMinor, 'Line discount');

  // Convert to base units using D-034 exact conversion
  const quantityBaseMicros = convertPackagesToBase(
    input.quantityPackagesMicros,
    input.conversionToBaseMicros,
  );

  // Compute gross total: unitPriceMinor * (quantityPackagesMicros / MICROS_PER_UNIT)
  const product = BigInt(input.unitPriceMinor) * BigInt(input.quantityPackagesMicros);
  if (product % MICROS_BIGINT !== 0n) {
    throw new DomainError(
      'INVALID_MONEY',
      'Sale line total results in a fractional currency minor unit; enter a quantity and price that produce a whole currency amount.',
    );
  }

  const grossBigInt = product / MICROS_BIGINT;
  if (grossBigInt > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new DomainError('INVALID_MONEY', 'Sale line total exceeds the safe integer range.');
  }
  const grossTotalMinor = Number(grossBigInt);

  if (discountAmountMinor > grossTotalMinor) {
    throw new DomainError(
      'INVALID_MONEY',
      'Line discount cannot exceed gross line total.',
    );
  }

  const netTotalMinor = grossTotalMinor - discountAmountMinor;

  return {
    quantityPackagesMicros: input.quantityPackagesMicros,
    conversionToBaseMicros: input.conversionToBaseMicros,
    quantityBaseMicros,
    unitPriceMinor: input.unitPriceMinor,
    grossTotalMinor,
    discountAmountMinor,
    netTotalMinor,
  };
}

/**
 * Calculate aggregate sale totals across all sale lines under D-036.
 * Requires at least one line and ensures totals stay within safe integer range.
 */
export function calculateSaleTotals(lines: CalculatedSaleLine[]): CalculatedSaleTotals {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new DomainError('INVALID_VALUE', 'A sale must have at least one line.');
  }

  let subtotalBigInt = 0n;
  let discountBigInt = 0n;
  let totalBigInt = 0n;

  for (const line of lines) {
    assertExactCalculatedLine(line);
    subtotalBigInt += BigInt(line.grossTotalMinor);
    discountBigInt += BigInt(line.discountAmountMinor);
    totalBigInt += BigInt(line.netTotalMinor);
  }

  if (
    subtotalBigInt > BigInt(Number.MAX_SAFE_INTEGER) ||
    discountBigInt > BigInt(Number.MAX_SAFE_INTEGER) ||
    totalBigInt > BigInt(Number.MAX_SAFE_INTEGER)
  ) {
    throw new DomainError('INVALID_MONEY', 'Sale totals exceed the safe integer range.');
  }

  return {
    subtotalMinor: Number(subtotalBigInt),
    discountTotalMinor: Number(discountBigInt),
    totalMinor: Number(totalBigInt),
    lineCount: lines.length,
  };
}
