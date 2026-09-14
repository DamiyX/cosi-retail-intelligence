import { DomainError } from './errors';

const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const MAJOR_UNITS_PATTERN = /^(-)?(\d+)(?:\.(\d{1,2}))?$/;

/**
 * Authoritative money value in integer minor units (for example, kobo for
 * NGN: ₦1,250.50 is stored as 125050). Binary floating-point arithmetic is
 * never used for financial values.
 */
export interface Money {
  readonly amountMinorUnits: number;
  readonly currencyCode: string;
}

function assertCurrencyCode(currencyCode: string): void {
  if (typeof currencyCode !== 'string' || !CURRENCY_PATTERN.test(currencyCode)) {
    throw new DomainError('INVALID_MONEY', 'Currency code must be a 3-letter uppercase ISO code.');
  }
}

function assertSafeIntegerAmount(amountMinorUnits: number): void {
  if (typeof amountMinorUnits !== 'number' || !Number.isSafeInteger(amountMinorUnits)) {
    throw new DomainError(
      'INVALID_MONEY',
      'Minor-unit amounts must be safe integers; use moneyFromMajorUnits for decimal input.',
    );
  }
}

function checkedResult(amountMinorUnits: number, currencyCode: string): Money {
  if (!Number.isSafeInteger(amountMinorUnits)) {
    throw new DomainError('INVALID_MONEY', 'Money result exceeds the safe integer range.');
  }
  return { amountMinorUnits, currencyCode };
}

/** Create money directly from integer minor units. */
export function money(amountMinorUnits: number, currencyCode: string): Money {
  assertCurrencyCode(currencyCode);
  assertSafeIntegerAmount(amountMinorUnits);
  return { amountMinorUnits, currencyCode };
}

/**
 * Parse a decimal major-unit amount (for example, "1250.50" or 1250.5)
 * exactly into minor units. More than two fractional digits, NaN, Infinity,
 * exponents, and unsafe magnitudes are rejected instead of rounded.
 */
export function moneyFromMajorUnits(amount: string | number, currencyCode: string): Money {
  assertCurrencyCode(currencyCode);
  if (typeof amount === 'number') {
    if (!Number.isFinite(amount)) {
      throw new DomainError('INVALID_MONEY', 'Major-unit amounts must be finite numbers.');
    }
    return moneyFromMajorUnits(String(amount), currencyCode);
  }
  if (typeof amount !== 'string') {
    throw new DomainError('INVALID_MONEY', 'Major-unit amounts must be a string or a finite number.');
  }
  const match = MAJOR_UNITS_PATTERN.exec(amount);
  if (!match) {
    throw new DomainError('INVALID_MONEY', 'Major-unit amounts must have at most two decimal places.');
  }
  const sign = match[1] === '-' ? -1 : 1;
  const whole = Number(match[2]) * 100;
  const fraction = match[3] ? Number(match[3].padEnd(2, '0')) : 0;
  const minorUnits = sign * (whole + fraction);
  assertSafeIntegerAmount(minorUnits);
  return { amountMinorUnits: minorUnits, currencyCode };
}

function requireSameCurrency(left: Money, right: Money): void {
  if (left.currencyCode !== right.currencyCode) {
    throw new DomainError(
      'CURRENCY_MISMATCH',
      `Cannot combine ${left.currencyCode} with ${right.currencyCode}.`,
    );
  }
}

/** Add two same-currency amounts. */
export function addMoney(left: Money, right: Money): Money {
  requireSameCurrency(left, right);
  return checkedResult(left.amountMinorUnits + right.amountMinorUnits, left.currencyCode);
}

/** Subtract two same-currency amounts. */
export function subtractMoney(left: Money, right: Money): Money {
  requireSameCurrency(left, right);
  return checkedResult(left.amountMinorUnits - right.amountMinorUnits, left.currencyCode);
}

/**
 * Scale money by a non-negative integer quantity (for example, line totals).
 * Fractional multipliers are rejected: M1 quantities are discrete counts.
 */
export function multiplyMoney(value: Money, quantity: number): Money {
  if (typeof quantity !== 'number' || !Number.isSafeInteger(quantity) || quantity < 0) {
    throw new DomainError('INVALID_MONEY', 'Money multipliers must be non-negative integers.');
  }
  return checkedResult(value.amountMinorUnits * quantity, value.currencyCode);
}

/** Compare two same-currency amounts: -1, 0, or 1. */
export function compareMoney(left: Money, right: Money): -1 | 0 | 1 {
  requireSameCurrency(left, right);
  if (left.amountMinorUnits < right.amountMinorUnits) {
    return -1;
  }
  if (left.amountMinorUnits > right.amountMinorUnits) {
    return 1;
  }
  return 0;
}

/** True when both currency and minor-unit amounts match. */
export function equalMoney(left: Money, right: Money): boolean {
  return left.currencyCode === right.currencyCode && left.amountMinorUnits === right.amountMinorUnits;
}
