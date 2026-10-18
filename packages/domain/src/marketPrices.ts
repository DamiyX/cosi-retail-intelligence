import { addRational, compareRational, divideRational, makeRational, parseRational, type Rational } from './costing';

export interface MarketEligibility {
  storeId: string; enabled: boolean; generation: number; enabledAt: string; cutoffRevision: number;
  zoneId: string; zoneVersion: number; countryCode: string; currencyCode: string;
  zoneApproved: boolean; zoneActive: boolean; accountActive: boolean; ownerActive: boolean;
  storeActive: boolean; deviceActive: boolean; deviceEnrolled: boolean;
}
export interface ReviewedMarketMapping {
  storeId: string; localVariantId: string; localPackageId: string;
  marketVariantId: string; marketPackageId: string; conversionMicros: string;
  countryCode: string; currencyCode: string; version: number;
  approved: boolean; active: boolean;
}
/** Private server-accepted M7 facts ONLY. Not a client contribution request. */
export interface AcceptedMarketPurchase {
  origin: 'SERVER_ACCEPTED_M7'; storeId: string; observationId: string; acceptedRevision: number;
  productVariantId: string; packageUnitId: string; sourceType: string; validationStatus: string;
  purchaseStatus: string; currencyCode: string; observedAt: string; purchaseOccurredAt: string;
  quantityPackagesMicros: string; quantityBaseMicros: string; conversionMicros: string;
  totalCostMinor: string; packageCost: Rational; baseCost: Rational; originalConsent: false;
}
/** Restricted provenance is confidential, never returned by the release contract. */
export interface PrivateMarketContribution {
  storeId: string; observationId: string; generation: number; acceptedRevision: number;
  marketVariantId: string; marketPackageId: string; zoneId: string; currencyCode: string;
  mappingVersion: number; zoneVersion: number; observedAt: string; packageCost: Rational; baseCost: Rational;
}

/** PostgreSQL timestamptz has microsecond precision; preserve ordering within a JS millisecond. */
function timestampMicros(value: string): bigint | null {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  const fraction = value.match(/\.(\d+)(?:Z|[+-]\d{2}:\d{2})$/)?.[1] ?? '';
  if (fraction.length > 6) return null;
  return BigInt(parsed) * 1000n + BigInt(fraction.padEnd(6,'0').slice(3) || '0');
}

export function sanitizeAcceptedMarketPurchase(
  fact: AcceptedMarketPurchase, eligibility: MarketEligibility, mapping: ReviewedMarketMapping | null, now: string,
): PrivateMarketContribution | null {
  const observed = timestampMicros(fact.observedAt);
  const cutoffTime = timestampMicros(eligibility.enabledAt);
  const current = timestampMicros(now);
  if (!mapping || fact.origin !== 'SERVER_ACCEPTED_M7' || fact.originalConsent !== false ||
      !eligibility.enabled || !eligibility.zoneApproved || !eligibility.zoneActive || !eligibility.accountActive ||
      !eligibility.ownerActive || !eligibility.storeActive || !eligibility.deviceActive || !eligibility.deviceEnrolled ||
      !mapping.approved || !mapping.active || eligibility.generation < 1 ||
      fact.storeId !== eligibility.storeId || mapping.storeId !== fact.storeId ||
      fact.productVariantId !== mapping.localVariantId || fact.packageUnitId !== mapping.localPackageId ||
      fact.currencyCode !== eligibility.currencyCode || fact.currencyCode !== mapping.currencyCode ||
      eligibility.countryCode !== mapping.countryCode || fact.sourceType !== 'RETAILER_PURCHASE' ||
      fact.validationStatus !== 'VALID' || fact.purchaseStatus !== 'COMPLETED' ||
      !Number.isSafeInteger(fact.acceptedRevision) || fact.acceptedRevision <= eligibility.cutoffRevision ||
      observed === null || cutoffTime === null || current === null ||
      observed < cutoffTime || observed > current || timestampMicros(fact.purchaseOccurredAt) !== observed) return null;
  try {
    const positive = (value: string) => {
      if (!/^[1-9][0-9]{0,29}$/.test(value)) throw new Error('Invalid positive bounded integer');
      return BigInt(value);
    };
    const packages = positive(fact.quantityPackagesMicros);
    const base = positive(fact.quantityBaseMicros);
    const conversion = positive(fact.conversionMicros);
    const total = positive(fact.totalCostMinor);
    if (conversion !== positive(mapping.conversionMicros) || packages * conversion !== base * 1000000n) return null;
    for (const cost of [fact.packageCost, fact.baseCost]) {
      if (!/^[1-9][0-9]{0,59}$/.test(cost.numerator) || !/^[1-9][0-9]{0,59}$/.test(cost.denominator)) return null;
      parseRational(cost);
    }
    if (compareRational(fact.packageCost, makeRational(total * 1000000n, packages)) !== 0 ||
        compareRational(fact.baseCost, makeRational(total * 1000000n, base)) !== 0) return null;
    return { storeId: fact.storeId, observationId: fact.observationId, generation: eligibility.generation,
      acceptedRevision: fact.acceptedRevision, marketVariantId: mapping.marketVariantId, marketPackageId: mapping.marketPackageId,
      zoneId: eligibility.zoneId, currencyCode: fact.currencyCode, mappingVersion: mapping.version,
      zoneVersion: eligibility.zoneVersion, observedAt: fact.observedAt,
      packageCost: parseRational(fact.packageCost), baseCost: parseRational(fact.baseCost) };
  } catch { return null; }
}

export type MarketAggregate = { status: 'INSUFFICIENT_DATA' } | {
  status: 'AVAILABLE'; minimum: Rational; median: Rational; maximum: Rational;
  observationCount: number; coverage: 'LIMITED'; windowDays: 30;
  windowStart: string; observedThrough: string; calculatedAt: string; validUntil: string;
};

/** Exact parity oracle for operator SQL policy v1. Caller must supply currently eligible private rows. */
export function aggregateMarketContributions(rows: readonly PrivateMarketContribution[], cohort: {
  marketVariantId: string; marketPackageId: string; zoneId: string; currencyCode: string;
}, calculatedAt: string): MarketAggregate {
  const current = Date.parse(calculatedAt);
  const currentMicros = timestampMicros(calculatedAt);
  if (!Number.isFinite(current) || currentMicros === null) throw new Error('Invalid calculation time');
  const start = current - 30 * 86400000;
  const startMicros = currentMicros - 30n*86400000000n;
  const latest = new Map<string, PrivateMarketContribution>();
  const compareLatest = (a: PrivateMarketContribution, b: PrivateMarketContribution) => {
    const aTime=timestampMicros(a.observedAt)!;
    const bTime=timestampMicros(b.observedAt)!;
    return (aTime === bTime ? 0 : aTime > bTime ? 1 : -1) || a.acceptedRevision-b.acceptedRevision ||
      (a.observationId === b.observationId ? 0 : a.observationId > b.observationId ? 1 : -1);
  };
  for (const row of rows) {
    const observedMicros=timestampMicros(row.observedAt);
    if (row.marketVariantId !== cohort.marketVariantId || row.marketPackageId !== cohort.marketPackageId ||
        row.zoneId !== cohort.zoneId || row.currencyCode !== cohort.currencyCode ||
        observedMicros === null || observedMicros < startMicros || observedMicros > currentMicros) continue;
    parseRational(row.packageCost);
    if (BigInt(row.packageCost.numerator) <= 0n) continue;
    const old = latest.get(row.storeId);
    if (!old || compareLatest(row, old) > 0) latest.set(row.storeId, row);
  }
  const selected = [...latest.values()].sort((a,b) => compareRational(a.packageCost,b.packageCost) || a.storeId.localeCompare(b.storeId));
  if (selected.length < 5) return { status: 'INSUFFICIENT_DATA' };
  const middle = Math.floor(selected.length / 2);
  const median = selected.length % 2 ? selected[middle].packageCost :
    divideRational(addRational(selected[middle-1].packageCost,selected[middle].packageCost),makeRational(2));
  return { status: 'AVAILABLE', minimum: selected[0].packageCost, median, maximum: selected[selected.length-1].packageCost,
    observationCount: selected.length, coverage: 'LIMITED', windowDays: 30, windowStart: new Date(start).toISOString(),
    observedThrough: new Date(Math.max(...selected.map(row => Date.parse(row.observedAt)))).toISOString(),
    calculatedAt: new Date(current).toISOString(), validUntil: new Date(current+86400000).toISOString() };
}
