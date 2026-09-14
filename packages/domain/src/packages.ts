import { DomainError } from './errors';

/**
 * D-034 fixed-scale micro-unit quantities (replaces the provisional M1
 * discrete-only helper; DF-010 is resolved by this module).
 *
 * One base unit equals 1,000,000 micro-units. Authoritative quantities and
 * package conversion factors are signed integers in these units; decimal
 * text is only a boundary representation. Arithmetic uses BigInt
 * intermediates and either produces an exactly representable micro-unit
 * result or rejects the operation — it never silently rounds and never uses
 * binary floating point. Persisted values and values crossing native
 * boundaries must stay inside the JavaScript safe-integer range.
 */

/** Micro-units per base unit: six decimal places of precision. */
export const MICROS_PER_UNIT = 1_000_000;

/** Largest magnitude a micro-unit value may carry across boundaries. */
export const MAX_MICROS_MAGNITUDE = Number.MAX_SAFE_INTEGER;

const MICROS_BIGINT = BigInt(MICROS_PER_UNIT);
const DECIMAL_PATTERN = /^(\d+)(?:\.(\d{1,6}))?$/;

function assertMicrosAmount(value: number, field: string): void {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new DomainError(
      'INVALID_QUANTITY',
      `${field} must be a non-negative safe integer in micro-units; parse decimal input with parseQuantityDecimal.`,
    );
  }
}

function assertConversionFactor(value: number): void {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new DomainError(
      'INVALID_CONVERSION',
      'Package conversion factors must be positive safe integers in micro-units per package unit.',
    );
  }
}

/**
 * Parse a canonical non-negative decimal quantity (for example, "40",
 * "0.5", "2.000001") exactly into micro-units. More than six fractional
 * digits, signs, exponents, empty input, and unsafe magnitudes are rejected
 * instead of rounded.
 */
export function parseQuantityDecimal(text: string): number {
  if (typeof text !== 'string') {
    throw new DomainError('INVALID_QUANTITY', 'Quantities must be entered as decimal text.');
  }
  const match = DECIMAL_PATTERN.exec(text.trim());
  if (!match) {
    throw new DomainError(
      'INVALID_QUANTITY',
      'Quantities must be non-negative decimals with at most six fractional digits.',
    );
  }
  const whole = BigInt(match[1]);
  const fraction = match[2] === undefined ? 0n : BigInt(match[2].padEnd(6, '0'));
  const micros = whole * MICROS_BIGINT + fraction;
  if (micros > BigInt(MAX_MICROS_MAGNITUDE)) {
    throw new DomainError('INVALID_QUANTITY', 'Quantity exceeds the safe persisted range.');
  }
  return Number(micros);
}

/**
 * Format a micro-unit value as canonical decimal text: no trailing zeros,
 * no trailing point, no grouping. `formatQuantityDecimal(parseQuantityDecimal(x))`
 * round-trips every accepted input to its canonical form.
 */
export function formatQuantityMicros(micros: number): string {
  assertMicrosAmount(micros, 'Micro-unit value');
  const whole = Math.trunc(micros / MICROS_PER_UNIT);
  const remainder = micros % MICROS_PER_UNIT;
  if (remainder === 0) {
    return String(whole);
  }
  const fraction = String(remainder).padStart(6, '0').replace(/0+$/, '');
  return `${whole}.${fraction}`;
}

/**
 * Convert a package-unit quantity into base-unit micro-units:
 * `base = quantityPackageMicros * conversionToBaseMicros / MICROS_PER_UNIT`.
 * The conversion factor is base-unit micros per one package unit (for
 * example, a 40-piece carton with a piece base stores 40,000,000).
 * Results that are not exactly representable are rejected, never rounded.
 */
export function convertPackagesToBase(
  quantityPackageMicros: number,
  conversionToBaseMicros: number,
): number {
  assertMicrosAmount(quantityPackageMicros, 'Package quantity');
  assertConversionFactor(conversionToBaseMicros);
  const product = BigInt(quantityPackageMicros) * BigInt(conversionToBaseMicros);
  if (product % MICROS_BIGINT !== 0n) {
    throw new DomainError(
      'INVALID_CONVERSION',
      'Package quantity does not convert to an exact base-unit amount; enter a quantity this package can represent exactly.',
    );
  }
  const base = product / MICROS_BIGINT;
  if (base > BigInt(MAX_MICROS_MAGNITUDE)) {
    throw new DomainError('INVALID_QUANTITY', 'Converted base quantity exceeds the safe persisted range.');
  }
  return Number(base);
}
