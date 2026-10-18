import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { z } from 'zod';
import { retrievalLab } from './retrievalPaths.ts';

export type Field = 'brandName' | 'variant' | 'quantity';
export type Readability = 'not-reviewed' | 'readable' | 'partial' | 'unreadable' | 'no-text' | 'conflicting';
export interface Span { start: number; end: number; text: string }
export interface Observation { id: string; assetSha256: string; readability: Readability; literal: string; fields: Record<Field, Span | null> }
export interface ReviewEntry { id: string; assetSha256: string; role: 'reference' | 'query'; width: number; height: number; orientation: number;
  effectiveBox: { left: number; top: number; right: number; bottom: number }; productId?: string }
export interface Config { bindingSha256: string; ruleSha256: string; scope: 'references' | 'queries' | 'all'; entries: ReviewEntry[] }
export interface Progress { schemaVersion: 1; kind: 'LABEL_TEXT_REVIEW'; bindingSha256: string; ruleSha256: string; scope: Config['scope']; entries: Observation[] }
export interface Quantity { dimension: 'volume' | 'mass' | 'count'; baseInteger: string; baseUnit: string }
export type Normalized = string | Quantity | null;
export interface ReferenceCard { productId: string; values: Record<Field, Normalized>;
  support: Record<Field, { entryId: string; span: Span }[]>; reasons: Record<Field, string> }
export interface Candidate { productId: string; score: number; nearestReferenceId: string }
export interface Assisted { candidates: Candidate[]; evidence: { productId: string; perField: Record<Field, 'UNKNOWN' | 'SUPPORT' | 'CONTRADICTION'>;
  contradicted: boolean; supported: boolean }[]; promoted: boolean; manualConfirmation: boolean; reason: string }
interface Core {
  rule: Readonly<Record<string, string | number | boolean>>; fields: Field[]; states: Readability[];
  keys(value: unknown, expected: string[]): boolean;
  canonical(value: unknown): string; strictJson(raw: string): unknown;
  blank(config: Config): Progress; validateProgress(value: unknown, config: Config): Progress;
  validateEntry(value: Observation, expected: ReviewEntry): Observation; complete(progress: Progress): boolean;
  normalizeText(value: string): string; normalizeQuantity(value: string): Quantity | null;
  observe(value: Observation): { values: Record<Field, Normalized>; abstain: string | null };
  referenceCards(entries: Observation[], metadata: ReviewEntry[]): ReferenceCard[];
  assist(observation: Observation, candidates: Candidate[], cards: ReferenceCard[]): Assisted;
}
const require = createRequire(import.meta.url);
export const core = require(resolve(retrievalLab, 'tools/label-evidence/core.cjs')) as Core;
const hash = z.string().regex(/^[0-9a-f]{64}$/);
const id = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/);
const dimension = z.number().int().positive().max(50000000);
const box = z.object({ left: z.number().int().nonnegative(), top: z.number().int().nonnegative(), right: dimension, bottom: dimension }).strict();
const entry = z.object({ id, assetSha256: hash, role: z.enum(['reference', 'query']), width: dimension, height: dimension,
  orientation: z.number().int().min(1).max(8), effectiveBox: box, productId: id.optional() }).strict();
export const inputNames = ['comparison', 'annotations', 'baseline', 'crop', 'report', 'setup', 'sourceManifest'] as const;
export type InputName = typeof inputNames[number];
export const manifestSchema = z.object({ schemaVersion: z.literal(1), kind: z.literal('LABEL_EVIDENCE_PREPARATION'),
  ruleVersion: z.literal('unique-support-all-rivals-contradicted-v1'), ruleSha256: hash, sourceSha256: hash,
  sourceManifest: z.array(z.tuple([z.string(), hash])), inputSha256: z.object({ comparison: hash, annotations: hash, baseline: hash,
    crop: hash, report: hash, setup: hash, sourceManifest: hash }).strict(),
  inputPaths: z.object({ comparison: z.string(), annotations: z.string(), baseline: z.string(), crop: z.string(), report: z.string(),
    setup: z.string(), sourceManifest: z.string() }).strict(), imageRoot: z.string(), cropRoot: z.string(),
  evidenceKind: z.enum(['generated-fixture', 'private-same-instance']), maxImageBytes: z.number().int().positive(),
  entries: z.array(entry).length(40), reviewBeforeAnalysis: z.literal(true), formalAdmission: z.literal(false) }).strict();
export type Manifest = z.infer<typeof manifestSchema>;
export function config(manifest: Manifest, bindingSha256: string, scope: Config['scope']): Config {
  return { bindingSha256, ruleSha256: manifest.ruleSha256, scope,
    entries: manifest.entries.filter(e => scope === 'all' || e.role === (scope === 'references' ? 'reference' : 'query')) };
}
