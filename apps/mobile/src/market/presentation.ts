import type { MarketLocalControl } from './storage';
import { roundRationalHalfUp, formatMoney, money, type Rational } from '@retail/domain';

/** Presentation-only rounding. The authoritative/cache values remain exact. */
export function formatMarketCost(cost: Rational, currencyCode: string): string {
  try { return formatMoney(money(roundRationalHalfUp(cost),currencyCode)); }
  catch { return `${currencyCode} ${cost.numerator}/${cost.denominator} minor units`; }
}

export function marketControlDescription(available: boolean, local: MarketLocalControl | null): string {
  if (!available) return 'Contribution OFF. Market prices are disabled pending backend, mapping and privacy review. Nothing is sent.';
  if (local?.pending) return 'Contribution locally OFF · pending server confirmation. Connect to reconcile before another change.';
  if (local?.localOff && local.acknowledgement?.enabled) return 'Contribution locally OFF · server may still be enabled. Confirm revocation online.';
  if (!local?.acknowledgement) return 'Contribution OFF · online confirmation required.';
  if (!local.acknowledgement.available) return 'Market service disabled · contribution unavailable.';
  return local.acknowledgement.enabled ? 'Contribution enabled for this confirmed generation only.' : 'Contribution OFF · confirmed by server.';
}
