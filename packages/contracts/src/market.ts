import { z } from 'zod';

/** D-051 source prototype. This protocol is independent of business sync. */
export const MARKET_POLICY_VERSION = 1 as const;
export const MAX_MARKET_KEYS = 100;
const id = z.string().uuid();
const version = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const timestamp = z.string().datetime({ offset: true });
// Median midpoint can require twice the 60-digit source denominator plus one digit.
const integer = z.string().regex(/^[1-9][0-9]{0,120}$/);
export const marketRationalSchema = z.object({ numerator: integer, denominator: integer }).strict();
export const marketKeySchema = z.object({ productVariantId: id, packageUnitId: id }).strict();
export const marketZoneSchema = z.object({
  id, name: z.string().min(1).max(200), countryCode: z.string().regex(/^[A-Z]{2}$/),
  currencyCode: z.string().regex(/^[A-Z]{3}$/), version: version.refine(v => v > 0),
}).strict();
export const marketControlRequestSchema = z.object({
  policyVersion: z.literal(1), storeId: id, deviceId: id, operationId: id,
  expectedVersion: version, enabled: z.boolean(), zoneId: id.nullable(),
}).strict().refine(v => !v.enabled || v.zoneId !== null, 'Enable needs an approved zone');
export const marketStateSchema = z.object({
  policyVersion: z.literal(1), storeId: id, available: z.boolean(), enabled: z.boolean(),
  version, generation: version, zone: marketZoneSchema.nullable(),
  enabledAt: timestamp.nullable(), cutoffRevision: version.nullable(), serverTime: timestamp,
  zones: z.array(marketZoneSchema).max(100),
}).strict().refine(v => !v.enabled || (v.zone !== null && v.enabledAt !== null && v.cutoffRevision !== null && v.generation > 0),
  'Enabled state needs acknowledged cutoffs');
export const marketControlResultSchema = z.object({
  status: z.enum(['APPLIED', 'CONFLICT', 'DISABLED', 'NOT_FOUND']),
  operationId: id.nullable(), state: marketStateSchema,
}).strict();
const resultBase = {
  key: marketKeySchema, mappingVersion: version, marketVariantId: id.nullable(),
  marketPackageId: id.nullable(), packageName: z.string().min(1).max(200).nullable(),
};
const sparse = z.object({ ...resultBase, status: z.enum(['DISABLED', 'UNMAPPED', 'INSUFFICIENT_DATA']) }).strict();
const available = z.object({
  ...resultBase, status: z.literal('AVAILABLE'), minimum: marketRationalSchema,
  median: marketRationalSchema, maximum: marketRationalSchema,
  observationCount: z.number().int().min(5).max(Number.MAX_SAFE_INTEGER),
  coverage: z.literal('LIMITED'), windowDays: z.literal(30),
  windowStart: timestamp, observedThrough: timestamp, calculatedAt: timestamp, validUntil: timestamp,
}).strict().superRefine((v, ctx) => {
  const compare = (a: z.infer<typeof marketRationalSchema>, b: z.infer<typeof marketRationalSchema>) =>
    BigInt(a.numerator) * BigInt(b.denominator) <= BigInt(b.numerator) * BigInt(a.denominator);
  const calculated = Date.parse(v.calculatedAt);
  if (!v.marketVariantId || !v.marketPackageId || !v.packageName || v.mappingVersion < 1 ||
      !compare(v.minimum, v.median) || !compare(v.median, v.maximum) ||
      Date.parse(v.validUntil) <= calculated || Date.parse(v.validUntil) - calculated > 86400000 ||
      Date.parse(v.windowStart) !== calculated - 30 * 86400000 ||
      Date.parse(v.observedThrough) > calculated || Date.parse(v.observedThrough) < Date.parse(v.windowStart)) {
    ctx.addIssue({ code: 'custom', message: 'Invalid market release bounds' });
  }
});
export const marketReadResponseSchema = z.object({
  policyVersion: z.literal(1), storeId: id, controlVersion: version, generation: version,
  zone: marketZoneSchema.nullable(), currencyCode: z.string().regex(/^[A-Z]{3}$/),
  revision: version, serverTime: timestamp, results: z.array(z.union([sparse, available])).max(100),
}).strict().superRefine((v, ctx) => {
  const keys = v.results.map(r => `${r.key.productVariantId}/${r.key.packageUnitId}`);
  if (new Set(keys).size !== keys.length || v.results.some(r => r.status === 'AVAILABLE' &&
      (!v.zone || v.zone.currencyCode !== v.currencyCode || Date.parse(r.calculatedAt) > Date.parse(v.serverTime)))) {
    ctx.addIssue({ code: 'custom', message: 'Invalid market response context' });
  }
});
export type MarketKey = z.infer<typeof marketKeySchema>;
export type MarketZone = z.infer<typeof marketZoneSchema>;
export type MarketState = z.infer<typeof marketStateSchema>;
export type MarketControlRequest = z.infer<typeof marketControlRequestSchema>;
export type MarketControlResult = z.infer<typeof marketControlResultSchema>;
export type MarketReadResponse = z.infer<typeof marketReadResponseSchema>;
export type MarketResult = MarketReadResponse['results'][number];
export const parseMarketState = (value: unknown): MarketState => marketStateSchema.parse(value);
export const parseMarketControlRequest = (value: unknown): MarketControlRequest => marketControlRequestSchema.parse(value);
export const parseMarketControlResult = (value: unknown): MarketControlResult => marketControlResultSchema.parse(value);
export const parseMarketReadResponse = (value: unknown): MarketReadResponse => marketReadResponseSchema.parse(value);
export function validateMarketKeys(value: unknown): MarketKey[] {
  const keys = z.array(marketKeySchema).min(1).max(MAX_MARKET_KEYS).parse(value);
  if (new Set(keys.map(k => `${k.productVariantId}/${k.packageUnitId}`)).size !== keys.length) throw new Error('Duplicate market keys');
  return keys;
}
