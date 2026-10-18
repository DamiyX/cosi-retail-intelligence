import { z } from 'zod';
import { prepareGallery, rank, unitVector } from './ranking.ts';
import { defaultConfig, LabError, type Config, type Dataset, type Entry } from './schema.ts';
import { digest, recipeSha256, validateStudy, type Study } from './exploratoryStudy.ts';
const timing = z.object({ readMs: z.number().nonnegative(), decodeMs: z.number().nonnegative(),
  preprocessMs: z.number().nonnegative(), inferenceMs: z.number().nonnegative() }).strict();
const recordBase = { id: z.string(), assetSha256: digest };
const result = z.discriminatedUnion('kind', [
  z.object({ ...recordBase, kind: z.literal('vector'), values: z.array(z.number().finite()).length(1024),
    pixelSha256: digest, tensorSha256: digest, thumbnailSha256: digest, timings: timing }).strict(),
  z.object({ ...recordBase, kind: z.literal('failure'), code: z.enum(['DECODE_ERROR', 'INPUT_CHANGED', 'TIMEOUT', 'RUNTIME_ERROR', 'NOT_RUN']) }).strict(),
]);
export const bundleSchema = z.object({ schemaVersion: z.literal(1), runId: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/),
  mode: z.enum(['GENERATED_FIXTURE', 'PRIVATE_INFERENCE']), studySha256: digest, modelSha256: digest,
  recipeSha256: digest, sourceSha256: digest, setupSha256: digest, softwareSha256: digest,
  loadMs: z.number().finite().nonnegative(), encodingMs: z.number().finite().nonnegative(),
  attemptMs: z.number().finite().nonnegative().optional(),
  runFailure: z.object({ stage: z.literal('load'),
    reason: z.enum(['TIMEOUT', 'WORKER_FATAL', 'DISCONNECTED', 'OS_ERROR', 'INVALID_READY']) }).strict().nullable().optional(),
  environment: z.object({ python: z.string(), os: z.string(), cpu: z.string(), threads: z.literal(1),
    memory: z.literal('not-measured') }).strict(),
  preservation: z.array(z.object({ id: z.string(), before: digest, after: digest }).strict()).length(40),
  records: z.array(result).length(40),
}).strict();
export type Bundle = z.infer<typeof bundleSchema>;
export interface RawMatch { productId: string; score: number; nearestReferenceId: string; tiedWith: string[] }
export interface RawRanking { candidates: RawMatch[]; margin: number | null; topTie: string[] }
export interface QueryRow { id: string; truth: string; failure: string | null; primary: RawRanking | null;
  withheldIdentityProxy: RawRanking | null; first: boolean; firstThree: boolean; rankingMs: number }
export function validateBundle(study: Study, value: unknown, expected: {
  studySha256: string; sourceSha256: string; setupSha256: string; softwareSha256: string; runId: string;
}): Bundle {
  const b = bundleSchema.parse(value);
  if ((b.attemptMs !== undefined && b.attemptMs < b.loadMs + b.encodingMs) || b.runFailure &&
      (b.loadMs <= 0 || b.attemptMs === undefined || b.encodingMs !== 0 ||
       b.records.some(r => r.kind !== 'failure' || r.code !== 'NOT_RUN')))
    throw new LabError('SETUP_BLOCKED', 'Inconsistent load failure or attempt timing');
  if (b.studySha256 !== expected.studySha256 || b.sourceSha256 !== expected.sourceSha256 ||
      b.setupSha256 !== expected.setupSha256 || b.softwareSha256 !== expected.softwareSha256 || b.runId !== expected.runId ||
      b.modelSha256 !== study.modelSha256 || b.recipeSha256 !== recipeSha256 ||
      b.mode !== (study.kind === 'generated-fixture' ? 'GENERATED_FIXTURE' : 'PRIVATE_INFERENCE'))
    throw new LabError('SETUP_BLOCKED', 'Stale run/provenance binding');
  if (new Set(b.records.map(r => r.id)).size !== 40 || new Set(b.preservation.map(r => r.id)).size !== 40)
    throw new LabError('SETUP_BLOCKED', 'Duplicate records');
  for (const r of b.records) {
    const e = study.entries.find(e => e.id === r.id); const p = b.preservation.find(p => p.id === r.id);
    if (!e || r.assetSha256 !== e.asset.sha256 || !p || p.before !== e.asset.sha256 || p.after !== p.before)
      throw new LabError('SETUP_BLOCKED', 'Orphan/input/preservation mismatch');
    if (r.kind === 'vector' && r.values.every(v => v === 0)) throw new LabError('SETUP_BLOCKED', 'Zero vector');
  }
  return b;
}
// This projection exists only inside the evaluator. It never passes through
// formal admission/curation and is never serialized as a Dataset.
function projection(study: Study, b: Bundle): Dataset {
  return { schemaVersion: 1, datasetId: 'non-admitted-exploration', version: 'v1', kind: 'synthetic-tooling-only',
    storeScope: 'private-exploration', adapter: { id: 'frozen-local', preprocessingId: 'letterbox-v1', space: 'exploration-v1', dimension: 1024 },
    products: study.products.map(p => ({ id: p.id, packages: [] })), entries: study.entries.map(e => {
      const r = b.records.find(r => r.id === e.id)!;
      return { id: e.id, productId: e.productId, packageId: null, role: e.role, split: 'development', known: true,
        captureSession: e.exposure, packagingGeneration: 'unmeasured', asset: e.asset,
        capture: { device: 'unmeasured', lighting: 'unmeasured', view: 'unmeasured', occlusion: 'unmeasured' },
        rights: { permissionId: 'private-study', provenance: 'study' },
        observation: r.kind === 'vector' ? { kind: 'vector', vector: { space: 'exploration-v1', values: r.values } } :
          { kind: 'failure', code: 'ADAPTER_ERROR' },
      } satisfies Entry;
    }) };
}
function raw(query: number[], gallery: ReturnType<typeof prepareGallery>, config: Config): RawRanking {
  const ranked = rank(query, gallery, config); // Drop threshold and package fields.
  const scores = gallery.map(g => ({ id: g.entry.id, productId: g.entry.productId,
    score: Math.max(-1, Math.min(1, query.reduce((s, v, i) => s + v * g.vector[i], 0))) }));
  const group = [...new Set(scores.map(s => s.productId))].map(productId => ({ productId,
    score: Math.max(...scores.filter(s => s.productId === productId).map(s => s.score)) }));
  return { margin: ranked.margin, topTie: group.filter(g => Math.abs(g.score - ranked.candidates[0].score) <= 1e-12).map(g => g.productId).sort(),
    candidates: ranked.candidates.map(c => ({ productId: c.productId, score: c.score,
      nearestReferenceId: scores.filter(s => s.productId === c.productId).sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))[0].id,
      tiedWith: group.filter(g => g.productId !== c.productId && Math.abs(g.score - c.score) <= 1e-12).map(g => g.productId).sort(),
    })) };
}
export function evaluate(studyValue: unknown, b: Bundle, config: Config = defaultConfig) {
  const study = validateStudy(studyValue); const dataset = projection(study, b);
  validateBundle(study, b, { studySha256: b.studySha256, sourceSha256: b.sourceSha256, setupSha256: b.setupSha256,
    softwareSha256: b.softwareSha256, runId: b.runId });
  const failedRef = study.entries.some(e => e.role === 'reference' && b.records.find(r => r.id === e.id)?.kind !== 'vector');
  const gallery = failedRef ? null : prepareGallery(dataset);
  const rows: QueryRow[] = dataset.entries.filter(e => e.role === 'query').sort((a, b) => a.id < b.id ? -1 : 1).map(e => {
    const r = b.records.find(r => r.id === e.id)!; const start = performance.now();
    const failure = r.kind === 'failure' ? r.code : failedRef ? 'INCOMPLETE_GALLERY' : null;
    const q = failure ? null : unitVector(e, dataset.adapter);
    const primary = q && gallery ? raw(q, gallery, config) : null;
    const proxy = q && gallery ? raw(q, gallery.filter(g => g.entry.productId !== e.productId), config) : null;
    return { id: e.id, truth: e.productId, failure, primary, withheldIdentityProxy: proxy,
      first: primary?.candidates[0].productId === e.productId, firstThree: primary?.candidates.some(c => c.productId === e.productId) ?? false,
      rankingMs: performance.now() - start };
  });
  const scored = rows.filter(r => r.primary).length;
  return { schemaVersion: 1, studyKind: study.kind, formalAdmission: false, mode: b.mode,
    evaluationMode: 'REPLAY_OF_VERIFIED_VECTORS',
    runId: b.runId, provenance: { studySha256: b.studySha256, modelSha256: b.modelSha256, recipeSha256: b.recipeSha256,
      sourceSha256: b.sourceSha256, setupSha256: b.setupSha256, softwareSha256: b.softwareSha256 },
    complete: !b.runFailure && scored === 20, runFailure: b.runFailure ?? null,
    incompleteGallery: failedRef, denominator: 20, scored,
    first: rows.filter(r => r.first).length, firstThree: rows.filter(r => r.firstThree).length,
    perProduct: study.products.map(p => ({ productId: p.id, queries: 2, first: rows.filter(r => r.truth === p.id && r.first).length,
      firstThree: rows.filter(r => r.truth === p.id && r.firstThree).length })),
    confusion: study.products.map(p => ({ truth: p.id, predictions: Object.fromEntries(study.products.map(q =>
      [q.id, rows.filter(r => r.truth === p.id && r.primary?.candidates[0].productId === q.id).length])),
      unscored: rows.filter(r => r.truth === p.id && !r.primary).length })),
    rows, timings: { loadMs: b.loadMs, encodingMs: b.encodingMs, attemptMs: b.attemptMs ?? null }, environment: b.environment,
    limitation: 'SAME physical items, correlated views. WITHHELD-IDENTITY PROXY is not sampled unknown data or rejection safety. Laptop timing is not Android performance. No calibrated confidence or formal holdout claim.',
  };
}
export type Evaluation = ReturnType<typeof evaluate>;
