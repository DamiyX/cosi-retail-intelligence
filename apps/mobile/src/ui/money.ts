import {
  DomainError,
  formatMoney,
  money,
  moneyFromMajorUnits,
  parseRational,
  roundRationalHalfUp,
  type CostCoverageStatus,
  type Rational,
} from '@retail/domain';

/** Retailer-facing currency symbols. Unknown codes fall back to the code. */
const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: '₦',
  USD: '$',
  EUR: '€',
  GBP: '£',
  GHS: '₵',
};

/**
 * Display a minor-unit price such as "₦1,450.50". Returns null when no
 * price is set so screens simply omit the line (DESIGN.md: show the store
 * selling price only when one exists).
 */
export function displayMoney(
  amountMinorUnits: number | null | undefined,
  currencyCode: string,
): string | null {
  if (amountMinorUnits === undefined || amountMinorUnits === null) {
    return null;
  }
  const canonical = formatMoney(money(amountMinorUnits, currencyCode));
  const symbol = CURRENCY_SYMBOLS[currencyCode];
  if (!symbol) {
    return canonical;
  }
  return `${symbol}${canonical.slice(currencyCode.length + 1)}`;
}

/**
 * Display an exact minor-unit rational as a retailer-facing currency estimate.
 * The stored rational is never changed; only the screen projection is rounded
 * to the nearest minor unit using the domain half-up rule.
 */
export function displayRationalMinorPerBaseUnit(
  numerator: string | null | undefined,
  denominator: string | null | undefined,
  currencyCode: string,
): string | null {
  if (numerator === null || numerator === undefined || denominator === null || denominator === undefined) {
    return null;
  }
  try {
    return displayMoney(roundRationalHalfUp(parseRational({ numerator, denominator }, 'display cost')), currencyCode);
  } catch {
    return null;
  }
}

/**
 * A cost state is usable for a current-stock estimate only when it covers a
 * positive quantity and carries a valid average.  KNOWN by itself is not
 * enough after stock reaches zero or a sale creates an unknown remainder.
 */
export function isUsableCurrentCost(input: {
  coverageStatus: CostCoverageStatus | null | undefined;
  quantityCostedBaseMicros: number | null | undefined;
  averageUnitCost: Rational | null | undefined;
}): boolean {
  const quantityCostedBaseMicros = input.quantityCostedBaseMicros;
  if (input.coverageStatus !== 'KNOWN' || typeof quantityCostedBaseMicros !== 'number' || !Number.isSafeInteger(quantityCostedBaseMicros) || quantityCostedBaseMicros <= 0 || !input.averageUnitCost) {
    return false;
  }
  try {
    parseRational(input.averageUnitCost, 'current average cost');
    return true;
  } catch {
    return false;
  }
}

/**
 * Format integer minor units for edit inputs as decimal with 2 fractional places (e.g. 150000 -> "1500.00").
 */
export function formatMinorForEdit(amountMinor: number): string {
  const sign = amountMinor < 0 ? '-' : '';
  const absolute = Math.abs(amountMinor);
  return `${sign}${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, '0')}`;
}

/**
 * Parse a decimal major-unit input string into integer minor units using exact arithmetic.
 */
export function parseMajorUnitsToMinor(text: string, currencyCode = 'NGN'): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    throw new DomainError('INVALID_MONEY', 'Amount cannot be empty.');
  }
  return moneyFromMajorUnits(trimmed, currencyCode).amountMinorUnits;
}
