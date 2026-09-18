import { DomainError } from './errors';
import { MICROS_PER_UNIT } from './packages';

/** An exact non-negative rational persisted as canonical integer strings. */
export interface Rational {
  readonly numerator: string;
  readonly denominator: string;
}

export type PurchaseCostBasis = 'TOTAL' | 'UNIT';
export type CostCoverageStatus = 'KNOWN' | 'UNKNOWN';

export interface NormalizedPurchaseCost {
  readonly basis: PurchaseCostBasis;
  readonly enteredCostMinor: number;
  readonly totalCostMinor: number;
  readonly packageUnitCost: Rational;
  readonly baseUnitCost: Rational;
}

export interface CostState {
  readonly coverageStatus: CostCoverageStatus;
  readonly quantityCostedBaseMicros: number;
  /** Total remaining value for the costed stock, in minor units. */
  readonly remainingValue: Rational;
  readonly averageUnitCost: Rational | null;
}

export interface PurchaseCostTransition {
  readonly state: CostState;
  readonly costedQuantityBaseMicros: number;
  readonly valueAdded: Rational;
}

export interface SaleCostTransition {
  readonly state: CostState;
  readonly costedQuantityBaseMicros: number;
  readonly valueConsumed: Rational;
  readonly available: boolean;
  readonly cogsAmountMinor: number | null;
}

const ZERO: Rational = { numerator: '0', denominator: '1' };
const ONE: Rational = { numerator: '1', denominator: '1' };
const MICROS = BigInt(MICROS_PER_UNIT);
const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);

function gcd(left: bigint, right: bigint): bigint {
  let a = left < 0n ? -left : left;
  let b = right < 0n ? -right : right;
  while (b !== 0n) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a === 0n ? 1n : a;
}

function toSafeNumber(value: bigint, code: 'INVALID_MONEY' | 'INVALID_QUANTITY', message: string): number {
  if (value > MAX_SAFE || value < -MAX_SAFE) {
    throw new DomainError(code, message);
  }
  return Number(value);
}

function safeMicros(value: bigint, field: string): number {
  return toSafeNumber(value, 'INVALID_QUANTITY', `${field} exceeds the safe persisted range.`);
}

function canonical(numerator: bigint, denominator: bigint): Rational {
  if (denominator === 0n) {
    throw new DomainError('INVALID_MONEY', 'A rational cost cannot have a zero denominator.');
  }
  if (denominator < 0n) {
    numerator = -numerator;
    denominator = -denominator;
  }
  if (numerator < 0n) {
    throw new DomainError('INVALID_MONEY', 'Cost values cannot be negative.');
  }
  const divisor = gcd(numerator, denominator);
  return {
    numerator: (numerator / divisor).toString(),
    denominator: (denominator / divisor).toString(),
  };
}

function parsePart(value: string, field: string, allowZero: boolean): bigint {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new DomainError('INVALID_MONEY', `${field} must be a canonical non-negative integer string.`);
  }
  const parsed = BigInt(value);
  if (!allowZero && parsed === 0n) {
    throw new DomainError('INVALID_MONEY', `${field} must be greater than zero.`);
  }
  return parsed;
}

/** Construct and reduce an exact non-negative rational. */
export function makeRational(numerator: bigint | number | string, denominator: bigint | number | string = 1): Rational {
  const parsedNumerator = typeof numerator === 'bigint' ? numerator : BigInt(numerator);
  const parsedDenominator = typeof denominator === 'bigint' ? denominator : BigInt(denominator);
  return canonical(parsedNumerator, parsedDenominator);
}

/** Parse a persisted rational and reject non-canonical text. */
export function parseRational(value: Rational, field = 'rational'): Rational {
  const numerator = parsePart(value?.numerator, `${field}.numerator`, true);
  const denominator = parsePart(value?.denominator, `${field}.denominator`, false);
  const result = canonical(numerator, denominator);
  if (result.numerator !== value.numerator || result.denominator !== value.denominator) {
    throw new DomainError('INVALID_MONEY', `${field} must be reduced to canonical numerator/denominator strings.`);
  }
  return result;
}

export function rationalFromInteger(value: number, field = 'integer'): Rational {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new DomainError('INVALID_MONEY', `${field} must be a non-negative safe integer.`);
  }
  return makeRational(value);
}

export function addRational(left: Rational, right: Rational): Rational {
  const a = parseRational(left, 'left');
  const b = parseRational(right, 'right');
  return canonical(BigInt(a.numerator) * BigInt(b.denominator) + BigInt(b.numerator) * BigInt(a.denominator), BigInt(a.denominator) * BigInt(b.denominator));
}

export function subtractRational(left: Rational, right: Rational): Rational {
  const a = parseRational(left, 'left');
  const b = parseRational(right, 'right');
  const numerator = BigInt(a.numerator) * BigInt(b.denominator) - BigInt(b.numerator) * BigInt(a.denominator);
  if (numerator < 0n) {
    throw new DomainError('INVALID_MONEY', 'Cost values cannot become negative.');
  }
  return canonical(numerator, BigInt(a.denominator) * BigInt(b.denominator));
}

export function multiplyRational(left: Rational, right: Rational): Rational {
  const a = parseRational(left, 'left');
  const b = parseRational(right, 'right');
  return canonical(BigInt(a.numerator) * BigInt(b.numerator), BigInt(a.denominator) * BigInt(b.denominator));
}

export function divideRational(left: Rational, right: Rational): Rational {
  const a = parseRational(left, 'left');
  const b = parseRational(right, 'right');
  if (b.numerator === '0') {
    throw new DomainError('INVALID_MONEY', 'Cost division by zero is not defined.');
  }
  return canonical(BigInt(a.numerator) * BigInt(b.denominator), BigInt(a.denominator) * BigInt(b.numerator));
}

export function compareRational(left: Rational, right: Rational): -1 | 0 | 1 {
  const a = parseRational(left, 'left');
  const b = parseRational(right, 'right');
  const compared = BigInt(a.numerator) * BigInt(b.denominator) - BigInt(b.numerator) * BigInt(a.denominator);
  return compared < 0n ? -1 : compared > 0n ? 1 : 0;
}

/** Multiply a rational amount in minor units by base-unit micro-units. */
export function valueForBaseMicros(unitCost: Rational, quantityBaseMicros: number): Rational {
  if (!Number.isSafeInteger(quantityBaseMicros) || quantityBaseMicros < 0) {
    throw new DomainError('INVALID_QUANTITY', 'Cost quantities must be non-negative safe integers.');
  }
  const parsed = parseRational(unitCost);
  return canonical(BigInt(parsed.numerator) * BigInt(quantityBaseMicros), BigInt(parsed.denominator) * MICROS);
}

/** Round a non-negative rational to integer minor units using half-up rules. */
export function roundRationalHalfUp(value: Rational): number {
  const parsed = parseRational(value);
  const numerator = BigInt(parsed.numerator);
  const denominator = BigInt(parsed.denominator);
  const rounded = (numerator * 2n + denominator) / (2n * denominator);
  return toSafeNumber(rounded, 'INVALID_MONEY', 'Rounded cost exceeds the safe integer range.');
}

function requireNonNegativeMinor(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new DomainError('INVALID_MONEY', `${field} must be a non-negative safe integer minor-unit amount.`);
  }
}

function requirePositiveMicros(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new DomainError('INVALID_QUANTITY', `${field} must be a positive safe integer in micro-units.`);
  }
}

/** Normalize one receipt's entered total or per-package unit price exactly. */
export function normalizePurchaseCost(input: {
  basis: PurchaseCostBasis;
  enteredCostMinor: number;
  quantityPackagesMicros: number;
  quantityBaseMicros: number;
}): NormalizedPurchaseCost {
  if (input.basis !== 'TOTAL' && input.basis !== 'UNIT') {
    throw new DomainError('INVALID_VALUE', 'Purchase cost basis must be TOTAL or UNIT.');
  }
  requireNonNegativeMinor(input.enteredCostMinor, 'Entered cost');
  requirePositiveMicros(input.quantityPackagesMicros, 'Package quantity');
  requirePositiveMicros(input.quantityBaseMicros, 'Base quantity');

  let totalCostMinor: number;
  let packageUnitCost: Rational;
  if (input.basis === 'TOTAL') {
    totalCostMinor = input.enteredCostMinor;
    packageUnitCost = canonical(BigInt(totalCostMinor) * MICROS, BigInt(input.quantityPackagesMicros));
  } else {
    const product = BigInt(input.enteredCostMinor) * BigInt(input.quantityPackagesMicros);
    if (product % MICROS !== 0n) {
      throw new DomainError(
        'INVALID_MONEY',
        'Per-package unit cost and quantity must produce an exact integer total in minor units.',
      );
    }
    totalCostMinor = toSafeNumber(product / MICROS, 'INVALID_MONEY', 'Purchase total exceeds the safe integer range.');
    packageUnitCost = canonical(BigInt(input.enteredCostMinor), 1n);
  }

  const baseUnitCost = canonical(BigInt(totalCostMinor) * MICROS, BigInt(input.quantityBaseMicros));
  return {
    basis: input.basis,
    enteredCostMinor: input.enteredCostMinor,
    totalCostMinor,
    packageUnitCost,
    baseUnitCost,
  };
}

export function initialCostState(): CostState {
  return {
    coverageStatus: 'KNOWN',
    quantityCostedBaseMicros: 0,
    remainingValue: ZERO,
    averageUnitCost: null,
  };
}

function stateForKnown(quantity: number, value: Rational): CostState {
  if (!Number.isSafeInteger(quantity)) {
    throw new DomainError('INVALID_QUANTITY', 'Costed quantity exceeds the safe persisted range.');
  }
  if (quantity <= 0) {
    return initialCostState();
  }
  return {
    coverageStatus: 'KNOWN',
    quantityCostedBaseMicros: quantity,
    remainingValue: value,
    averageUnitCost: canonical(BigInt(value.numerator) * MICROS, BigInt(value.denominator) * BigInt(quantity)),
  };
}

function unknownState(): CostState {
  return {
    coverageStatus: 'UNKNOWN',
    quantityCostedBaseMicros: 0,
    remainingValue: ZERO,
    averageUnitCost: null,
  };
}

/** Apply a purchase receipt to a moving weighted-average cost state. */
export function applyPurchaseCostState(
  state: CostState,
  input: {
    priorInventoryBalanceBaseMicros: number;
    receiptQuantityBaseMicros: number;
    receiptBaseUnitCost: Rational;
  },
): PurchaseCostTransition {
  if (!Number.isSafeInteger(input.priorInventoryBalanceBaseMicros)) {
    throw new DomainError('INVALID_QUANTITY', 'Prior inventory balance must be a safe integer.');
  }
  requirePositiveMicros(input.receiptQuantityBaseMicros, 'Receipt quantity');
  const receiptValue = valueForBaseMicros(input.receiptBaseUnitCost, input.receiptQuantityBaseMicros);
  const combinedBalance = BigInt(input.priorInventoryBalanceBaseMicros) + BigInt(input.receiptQuantityBaseMicros);
  const positiveRemainder = combinedBalance <= 0n ? 0 : safeMicros(combinedBalance, 'Positive inventory balance');

  if (input.priorInventoryBalanceBaseMicros <= 0) {
    const value = positiveRemainder === input.receiptQuantityBaseMicros
      ? receiptValue
      : valueForBaseMicros(input.receiptBaseUnitCost, positiveRemainder);
    return {
      state: stateForKnown(positiveRemainder, value),
      costedQuantityBaseMicros: positiveRemainder,
      valueAdded: value,
    };
  }

  if (
    state.coverageStatus !== 'KNOWN' ||
    state.quantityCostedBaseMicros !== input.priorInventoryBalanceBaseMicros
  ) {
    return { state: unknownState(), costedQuantityBaseMicros: 0, valueAdded: ZERO };
  }

  const quantity = safeMicros(combinedBalance, 'Costed quantity');
  const value = addRational(state.remainingValue, receiptValue);
  return {
    state: stateForKnown(quantity, value),
    costedQuantityBaseMicros: input.receiptQuantityBaseMicros,
    valueAdded: receiptValue,
  };
}

/** Apply one sale line, consuming exact remaining value where available. */
export function applySaleCostState(
  state: CostState,
  input: {
    priorInventoryBalanceBaseMicros: number;
    saleQuantityBaseMicros: number;
  },
): SaleCostTransition {
  if (!Number.isSafeInteger(input.priorInventoryBalanceBaseMicros)) {
    throw new DomainError('INVALID_QUANTITY', 'Prior inventory balance must be a safe integer.');
  }
  requirePositiveMicros(input.saleQuantityBaseMicros, 'Sale quantity');
  const afterBalance = safeMicros(
    BigInt(input.priorInventoryBalanceBaseMicros) - BigInt(input.saleQuantityBaseMicros),
    'Inventory balance',
  );

  if (
    input.priorInventoryBalanceBaseMicros <= 0 ||
    state.coverageStatus !== 'KNOWN' ||
    state.quantityCostedBaseMicros !== input.priorInventoryBalanceBaseMicros
  ) {
    return {
      state: unknownState(),
      costedQuantityBaseMicros: 0,
      valueConsumed: ZERO,
      available: false,
      cogsAmountMinor: null,
    };
  }

  const costedQuantity = Math.min(input.saleQuantityBaseMicros, state.quantityCostedBaseMicros);
  const consumed = valueForBaseMicros(state.averageUnitCost ?? ZERO, costedQuantity);
  const remainingQuantity = Math.max(0, state.quantityCostedBaseMicros - costedQuantity);
  const remainingValue = subtractRational(state.remainingValue, consumed);
  const available = input.saleQuantityBaseMicros <= state.quantityCostedBaseMicros;
  const nextState = available && afterBalance > 0
    ? stateForKnown(remainingQuantity, remainingValue)
    : afterBalance <= 0
      ? initialCostState()
      : unknownState();

  return {
    state: nextState,
    costedQuantityBaseMicros: costedQuantity,
    valueConsumed: consumed,
    available,
    cogsAmountMinor: available ? roundRationalHalfUp(consumed) : null,
  };
}

export const ZERO_RATIONAL = ZERO;
export const ONE_RATIONAL = ONE;
