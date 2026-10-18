import { z } from 'zod';
import { LabError } from './schema.ts';
import type { Dataset } from './schema.ts';

const id = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/);
const hash = z.string().regex(/^[0-9a-f]{64}$/);
export const challengeTags = [
  'close-size', 'close-flavour', 'similar-packaging', 'single', 'pack', 'carton',
  'old-packaging', 'new-packaging', 'reflective', 'transparent', 'damaged',
  'no-code', 'distinctive-local', 'unknown-lookalike', 'unknown-unrelated',
  'unknown-unregistered-size', 'unseen-package', 'manual-choice-required',
] as const;
const decision = z.enum(['pending', 'accepted', 'rejected']);
export const curationSchema = z.object({
  schemaVersion: z.literal(1),
  datasetId: id.nullable(), datasetVersion: id.nullable(), manifestSha256: hash.nullable(),
  evidenceKind: z.enum(['pending', 'synthetic-tooling-only', 'real-capture-attested']),
  entries: z.array(z.object({
    entryId: id, assetSha256: hash, decision, reviewerId: id.nullable(),
    sourceFamily: id.nullable(), physicalFamily: id.nullable(),
    usability: decision, permission: decision,
    permissionId: id.nullable(), provenanceId: id.nullable(),
    challengeTags: z.array(z.enum(challengeTags)),
  }).strict()),
  review: z.object({
    reviewerId: id.nullable(), decision,
    imageUsabilityInspected: z.boolean(), rightsRecordsInspected: z.boolean(),
    physicalIndependenceInspected: z.boolean(),
  }).strict(),
  holdoutSeal: z.object({
    reviewerId: id, decision: z.literal('sealed-before-tuning'),
    manifestSha256: hash,
    inventory: z.array(z.object({ entryId: id, assetSha256: hash }).strict()),
  }).strict().nullable(),
}).strict();
export type Curation = z.infer<typeof curationSchema>;
export interface CurationIssue { code: string; entryId?: string }
export class CurationError extends LabError {
  readonly issues: CurationIssue[];
  constructor(issues: CurationIssue[]) { super('CURATION_INVALID', 'Curation rejected'); this.issues = issues; }
}

// Nulls are intentional unfilled template values. Non-null drift is invalid input.
export function validateCuration(input: unknown, dataset: Dataset, manifestHash: string): Curation {
  const parsed = curationSchema.safeParse(input);
  if (!parsed.success) throw new CurationError([{ code: 'CURATION_SCHEMA' }]);
  const curation = parsed.data;
  const issues: CurationIssue[] = [];
  if (curation.datasetId !== null && curation.datasetId !== dataset.datasetId ||
    curation.datasetVersion !== null && curation.datasetVersion !== dataset.version ||
    curation.manifestSha256 !== null && curation.manifestSha256 !== manifestHash)
    issues.push({ code: 'CURATION_BINDING_MISMATCH' });
  const entries = new Map(dataset.entries.map(e => [e.id, e]));
  const seen = new Set<string>();
  for (const review of curation.entries) {
    const issue = (code: string) => issues.push({ code, entryId: review.entryId });
    if (seen.has(review.entryId)) issue('DUPLICATE_REVIEW');
    seen.add(review.entryId);
    const entry = entries.get(review.entryId);
    if (!entry) issue('ORPHAN_REVIEW');
    else {
      if (review.assetSha256 !== entry.asset.sha256) issue('REVIEW_ASSET_MISMATCH');
      if (review.permissionId !== null && review.permissionId !== entry.rights.permissionId ||
        review.provenanceId !== null && review.provenanceId !== entry.rights.provenance)
        issue('REVIEW_RIGHTS_MISMATCH');
      if (entry.known && review.challengeTags.some(t => t.startsWith('unknown-')) ||
        !entry.known && review.challengeTags.includes('unseen-package')) issue('CHALLENGE_LABEL_CONFLICT');
    }
    if (new Set(review.challengeTags).size !== review.challengeTags.length) issue('DUPLICATE_CHALLENGE_TAG');
  }
  // A shared source OR physical family must stay in one role/split boundary.
  // Exact copies cannot be assigned inconsistent family identities. One source
  // family cannot claim different physical samples; sessions may contain many.
  for (const field of ['sourceFamily', 'physicalFamily'] as const) {
    const boundaries = new Map<string, Set<string>>();
    const sources = new Map<string, Set<string>>();
    for (const review of curation.entries) {
      const entry = entries.get(review.entryId);
      const family = review[field];
      if (!entry || family === null) continue;
      const boundary = entry.role === 'reference' ? 'reference' : entry.split;
      const group = boundaries.get(family) ?? new Set<string>();
      group.add(boundary); boundaries.set(family, group);
      const keys = ['hash:' + entry.asset.sha256];
      if (field === 'physicalFamily' && review.sourceFamily !== null) keys.push('source:' + review.sourceFamily);
      for (const key of keys) {
        const source = sources.get(key) ?? new Set<string>();
        source.add(family); sources.set(key, source);
      }
    }
    if ([...boundaries.values()].some(group => group.size > 1))
      issues.push({ code: field === 'sourceFamily' ? 'SOURCE_FAMILY_LEAKAGE' : 'PHYSICAL_FAMILY_LEAKAGE' });
    if ([...sources.values()].some(group => group.size > 1))
      issues.push({ code: field === 'sourceFamily' ? 'SOURCE_FAMILY_CONFLICT' : 'PHYSICAL_FAMILY_CONFLICT' });
  }
  if (curation.holdoutSeal) {
    const seal = curation.holdoutSeal;
    if (seal.manifestSha256 !== manifestHash) issues.push({ code: 'SEAL_BINDING_MISMATCH' });
    const expected = new Map(dataset.entries.filter(e => e.role === 'query' && e.split === 'holdout').map(e => [e.id, e.asset.sha256]));
    const inventoryIds = new Set<string>();
    for (const item of seal.inventory) {
      if (inventoryIds.has(item.entryId)) issues.push({ code: 'DUPLICATE_SEAL_ENTRY', entryId: item.entryId });
      inventoryIds.add(item.entryId);
      if (expected.get(item.entryId) !== item.assetSha256) issues.push({ code: 'SEAL_INVENTORY_MISMATCH', entryId: item.entryId });
    }
    if (inventoryIds.size !== expected.size || [...expected.keys()].some(id => !inventoryIds.has(id)))
      issues.push({ code: 'SEAL_INVENTORY_INCOMPLETE' });
  }
  if (issues.length) throw new CurationError(issues);
  return curation;
}
