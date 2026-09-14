import { formatMoney, money } from '@retail/domain';

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
