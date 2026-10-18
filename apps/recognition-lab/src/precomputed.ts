import { z } from 'zod';
import type { Dataset, Entry, Split } from './schema.ts';
import { LabError, splitSchema } from './schema.ts';
import { sha256 } from './provenance.ts';
import { unitVector } from './ranking.ts';

export const PRECOMPUTED_LABEL = 'PRECOMPUTED OUTPUTS ONLY — NO ENCODER EXECUTION OR RECOGNITION ACCEPTANCE';
const id = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/);
const hash = z.string().regex(/^[0-9a-f]{64}$/);
const text = z.string().trim().min(1).max(2000);
const licence = z.object({ status: z.enum(['unreviewed', 'reviewed-for-proposed-use', 'toy-only']), reference: text.nullable() }).strict();
const executableCandidateSchema = z.object({
  schemaVersion: z.literal(1), candidateId: id, version: id,
  kind: z.enum(['authored-toy', 'reviewed-real']), family: text,
  artifact: z.object({ revision: text.nullable(), sha256: hash.nullable(), storageBytes: z.number().int().positive().nullable() }).strict(),
  preprocessing: z.object({ id, version: id, descriptor: text, sha256: hash }).strict(),
  embedding: z.object({ space: id, dimension: z.number().int().positive().max(100000) }).strict(),
  licences: z.object({ code: licence, weights: licence }).strict(),
  runtime: z.object({ status: z.enum(['unreviewed', 'reviewed-recorded-output', 'toy-only']),
    exportReference: text.nullable(), runtimeReference: text.nullable() }).strict(),
  review: z.object({ reviewerId: id.nullable(), exactBindingReference: text.nullable() }).strict(),
}).strict().superRefine((c, ctx) => {
  if (c.preprocessing.sha256 !== sha256(c.preprocessing.descriptor))
    ctx.addIssue({ code: 'custom', message: 'Preprocessing descriptor hash mismatch' });
  if (!c.artifact.sha256 || !c.artifact.revision)
    ctx.addIssue({ code: 'custom', message: 'Executable binding requires exact artifact' });
  if (c.artifact.sha256 && /^(.)\1{63}$/.test(c.artifact.sha256) ||
    [c.artifact.revision, c.licences.code.reference, c.licences.weights.reference, c.runtime.exportReference,
      c.runtime.runtimeReference, c.review.exactBindingReference].some(v => v !== null && /^(pending|unknown|unreviewed|tbd|placeholder)$/i.test(v)))
    ctx.addIssue({ code: 'custom', message: 'Placeholder provenance cannot be reviewed' });
  const status = c.kind === 'authored-toy' ? 'toy-only' : 'reviewed-for-proposed-use';
  if ([c.licences.code, c.licences.weights].some(l => l.status !== status || !l.reference) ||
    c.runtime.status !== (c.kind === 'authored-toy' ? 'toy-only' : 'reviewed-recorded-output') ||
    !c.runtime.exportReference || !c.runtime.runtimeReference || !c.review.reviewerId || !c.review.exactBindingReference)
    ctx.addIssue({ code: 'custom', message: 'Exact code/weights/runtime/binding review references required' });
});
const draftCandidateSchema = z.object({
  schemaVersion: z.literal(1), candidateId: id, version: id, kind: z.literal('draft-unreviewed'), family: text,
  artifact: z.object({ revision: z.null(), sha256: z.null(), storageBytes: z.null() }).strict(),
  preprocessing: z.null(), embedding: z.null(),
  licences: z.object({ code: z.object({ status: z.literal('unreviewed'), reference: z.null() }).strict(),
    weights: z.object({ status: z.literal('unreviewed'), reference: z.null() }).strict() }).strict(),
  runtime: z.object({ status: z.literal('unreviewed'), exportReference: z.null(), runtimeReference: z.null() }).strict(),
  review: z.object({ reviewerId: z.null(), exactBindingReference: z.null() }).strict(),
}).strict();
export const candidateSchema = z.union([draftCandidateSchema, executableCandidateSchema]);
export type EncoderCandidate = z.infer<typeof candidateSchema>;
export function candidateIdentity(candidate: EncoderCandidate) { return sha256(JSON.stringify(candidate)); }
export function validateCandidate(input: unknown): EncoderCandidate {
  const parsed = candidateSchema.safeParse(input);
  if (!parsed.success) throw new LabError('CANDIDATE_INVALID', 'Invalid candidate declaration');
  return parsed.data;
}
export const bundleSchema = z.object({
  schemaVersion: z.literal(1), adapter: z.literal('precomputed-output-v1'),
  evidenceKind: z.enum(['authored-toy', 'reported-encoder-output-unverified']),
  dataset: z.object({ datasetId: id, version: id, kind: z.enum(['synthetic-tooling-only', 'real-capture']), manifestSha256: hash }).strict(),
  candidate: z.object({ candidateId: id, version: id, declarationSha256: hash, artifactSha256: hash,
    preprocessingId: id, preprocessingVersion: id, preprocessingSha256: hash, space: id,
    dimension: z.number().int().positive().max(100000) }).strict(),
  split: splitSchema,
  provenance: z.object({ producer: text, executionReference: text.nullable(), recordedAt: z.string().datetime().nullable(),
    reportedDurationMs: z.number().finite().nonnegative().nullable() }).strict(),
  outputs: z.array(z.object({ entryId: id, assetSha256: hash,
    output: z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('vector'), space: id, values: z.array(z.number().finite()).min(1) }).strict(),
      z.object({ kind: z.literal('failure'), code: z.enum(['ADAPTER_ERROR', 'TIMEOUT']) }).strict(),
    ]),
  }).strict()).min(1),
}).strict();
export type EmbeddingBundle = z.infer<typeof bundleSchema>;
export function queryInventory(dataset: Dataset, split: Split) {
  return dataset.entries.filter(e => e.role === 'query' && e.split === split).map(e => ({ entryId: e.id, assetSha256: e.asset.sha256 }));
}
export function requiredEntries(dataset: Dataset, split: Split) {
  return dataset.entries.filter(e => e.role === 'reference' || e.split === split && e.role === 'query');
}

// Recorded vectors replace observations only at this lab-local seam. No encoder,
// process, asset discovery or image decoding runs here. Importer validates assets.
export function adaptPrecomputed(dataset: Dataset, manifestHash: string, candidateInput: unknown, bundleInput: unknown, split: Split) {
  const candidate = validateCandidate(candidateInput);
  if (candidate.kind === 'draft-unreviewed') throw new LabError('CANDIDATE_DRAFT', 'Draft candidates cannot run');
  const parsed = bundleSchema.safeParse(bundleInput);
  if (!parsed.success) throw new LabError('BUNDLE_INVALID', 'Invalid embedding bundle');
  const bundle = parsed.data;
  const expectedKind = candidate.kind === 'authored-toy' ? 'synthetic-tooling-only' : 'real-capture';
  if (dataset.kind !== expectedKind || bundle.evidenceKind !== (candidate.kind === 'authored-toy' ? 'authored-toy' : 'reported-encoder-output-unverified'))
    throw new LabError('EVIDENCE_KIND_MISMATCH', 'Toy and real provenance cannot be mixed');
  if (candidate.kind === 'reviewed-real' && (!bundle.provenance.executionReference || dataset.entries.some(e => e.observation !== undefined)))
    throw new LabError('REAL_PROVENANCE_REQUIRED', 'Real output requires recorded execution reference and no authored observations');
  const expectedDataset = { datasetId: dataset.datasetId, version: dataset.version, kind: dataset.kind, manifestSha256: manifestHash };
  const expectedCandidate = { candidateId: candidate.candidateId, version: candidate.version, declarationSha256: candidateIdentity(candidate),
    artifactSha256: candidate.artifact.sha256, preprocessingId: candidate.preprocessing.id, preprocessingVersion: candidate.preprocessing.version,
    preprocessingSha256: candidate.preprocessing.sha256, space: candidate.embedding.space, dimension: candidate.embedding.dimension };
  if (JSON.stringify(bundle.dataset) !== JSON.stringify(expectedDataset) ||
    JSON.stringify(bundle.candidate) !== JSON.stringify(expectedCandidate) || bundle.split !== split)
    throw new LabError('BUNDLE_BINDING_MISMATCH', 'Dataset/candidate/preprocessing/space/split binding changed');
  if (!queryInventory(dataset, split).length) throw new LabError('EMPTY_QUERY_SPLIT', 'No queries in selected split');
  const entries = requiredEntries(dataset, split);
  const expected = new Map(entries.map(e => [e.id, e]));
  const outputs = new Map<string, EmbeddingBundle['outputs'][number]>();
  for (const item of bundle.outputs) {
    if (outputs.has(item.entryId)) throw new LabError('DUPLICATE_OUTPUT', 'Duplicate embedding entry');
    const entry = expected.get(item.entryId);
    if (!entry) throw new LabError('ORPHAN_OUTPUT', 'Output is outside reference/selected query inventory');
    if (item.assetSha256 !== entry.asset.sha256) throw new LabError('OUTPUT_ASSET_MISMATCH', 'Output asset changed');
    if (item.output.kind === 'vector') {
      // Existing normalization checks dimension/space/nonfinite/zero-norm.
      unitVector({ ...entry, observation: { kind: 'vector', vector: item.output } },
        { id: 'precomputed-output-v1', preprocessingId: candidate.preprocessing.id, ...candidate.embedding });
    }
    outputs.set(item.entryId, item);
  }
  if (outputs.size !== entries.length) throw new LabError('MISSING_OUTPUT', 'Missing reference or selected query output');
  const adapted: Dataset = { ...dataset, adapter: { id: 'precomputed-output-v1', preprocessingId: candidate.preprocessing.id, ...candidate.embedding },
    entries: entries.map((entry): Entry => {
      const output = outputs.get(entry.id)!.output;
      return { ...entry, observation: output.kind === 'failure' ? output : { kind: 'vector', vector: { space: output.space, values: output.values } } };
    }) };
  return { candidate, bundle, adapted, candidateHash: candidateIdentity(candidate), bundleHash: sha256(JSON.stringify(bundle)) };
}
