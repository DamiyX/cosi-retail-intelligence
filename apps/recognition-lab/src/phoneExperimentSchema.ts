import { z } from 'zod';
import { createHash } from 'node:crypto';

export const MODEL_SHA256 = 'bbbb4c51a55a53905af1daec995ca1aae355046f8839bb8c9f5ce9271394bc40';
export const POLICY = Object.freeze({ version: 'phone-four-arm-generated-v1', dimension: 1024, maxReferences: 4,
  maxFrames: 3, minFrameGapMs: 400, deadlineMs: 3000, activeJobs: 1, queue: 0,
  aggregation: 'mean-of-per-frame-max-reference-cosine', tie: 'exact-score-descending-ASCII-product-id',
  capturePolicy: 'time-readiness-only-first-three', autoAccept: false });
export const PROPOSED_RECIPE = Object.freeze({ version: 'phone-pipeline-candidate-v1', nativeEquivalence: 'UNVERIFIED',
  size: 224, dtype: 'float32-le', layout: 'NHWC', channels: 'RGB', std: 255, padding: 128,
  rounding: 'floor(x+0.5)', oddPadding: 'right-bottom', orientation: 'EXIF-1-to-8', resize: 'Pillow-12.3.0-LANCZOS-reference',
  roi: 'preview-aspect-fill-center80%-pad5%-half-open-floor-ceil' });
export const sha256 = (bytes: string | Uint8Array) => createHash('sha256').update(bytes).digest('hex');
export const policySha256 = sha256(JSON.stringify(POLICY));
export const recipeSha256 = sha256(JSON.stringify(PROPOSED_RECIPE));
const id = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/);
const hash = z.string().regex(/^[0-9a-f]{64}$/);
const ms = z.number().int().nonnegative().max(60000);
export const armIds = ['V21', 'V41', 'V23', 'V43'] as const;
export type Arm = typeof armIds[number];
const arm = z.enum(armIds);
const vector = z.array(z.number().finite()).length(1024).refine(v => Math.hypot(...v) > 0 && Number.isFinite(Math.hypot(...v)), 'Finite nonzero vector required');
const outcome = z.discriminatedUnion('status', [
  z.object({ status: z.literal('VECTOR'), values: vector }).strict(),
  z.object({ status: z.literal('FAILURE'), code: id }).strict(),
]);
const reference = z.object({ id, inputSha256: hash }).strict();
const span = z.object({ sourceLiteral: z.string().max(4096), start: z.number().int().nonnegative(), end: z.number().int().positive(), text: z.string().min(1).max(128) }).strict()
  .refine(s => s.end > s.start && s.end <= s.sourceLiteral.length && s.sourceLiteral.slice(s.start, s.end) === s.text, 'Invalid specification span');
const specification = z.object({ productId: id, dimension: z.enum(['power-W', 'luminous-output-lm', 'net-volume', 'net-mass', 'count']),
  literal: z.string().min(1).max(128), provenance: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('typed-pending'), entryId: id, sourceSha256: hash, reviewStatus: z.literal('PENDING') }).strict(),
    z.object({ kind: z.literal('reference-transcription'), referenceId: id, inputSha256: hash, span,
      reviewStatus: z.enum(['PENDING', 'HUMAN_CONFIRMED']) }).strict(),
  ]) }).strict();
export const manifestSchema = z.object({ schemaVersion: z.literal(1), kind: z.literal('GENERATED_PHONE_EXPERIMENT'),
  nativeValidated: z.literal(false), experimentId: id, modelSha256: z.literal(MODEL_SHA256), recipeSha256: z.literal(recipeSha256),
  policySha256: z.literal(policySha256), sourceSha256: hash,
  gallery: z.array(z.object({ productId: id, orderedReferences: z.array(reference).length(4) }).strict()).min(2).max(5000),
  specifications: z.array(specification).max(20000),
  trials: z.array(z.object({ id, sessionId: id, truth: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('KNOWN'), productId: id }).strict(),
    z.object({ kind: z.literal('UNKNOWN') }).strict(),
  ]), condition: z.enum(['cold', 'warm', 'sustained']), phase: z.enum(['development', 'confirmation']) }).strict()).min(1).max(1000),
}).strict();
export type Manifest = z.infer<typeof manifestSchema>;
export const frameSchema = z.object({ id, sessionId: id, requestAtMs: ms, capturedAtMs: ms, completedAtMs: ms,
  ready: z.boolean(), modelSha256: hash, recipeSha256: hash, inputSha256: hash, outcome }).strict()
  .refine(e => e.requestAtMs <= e.capturedAtMs && e.capturedAtMs <= e.completedAtMs, 'Invalid frame times');
export type Frame = z.infer<typeof frameSchema>;
const stages = z.object({ cameraReadyMs: ms, captureMs: ms, bridgeReadMs: ms, decodeMs: ms, preprocessMs: ms, inferenceMs: ms, searchMs: ms }).strict();
export const bundleSchema = z.object({ schemaVersion: z.literal(1), kind: z.literal('GENERATED_PHONE_NUMERIC_BUNDLE'),
  manifestSha256: hash, sourceSha256: hash, modelSha256: hash, recipeSha256: hash, policySha256: hash,
  referenceRecords: z.array(z.object({ id, modelSha256: hash, recipeSha256: hash, inputSha256: hash, outcome }).strict()).max(20000),
  trialRecords: z.array(z.object({ trialId: id, sessionId: id, terminal: z.enum(['COMPLETED', 'CANCELLED', 'DEADLINE']),
    terminalAtMs: ms, frames: z.array(frameSchema).max(100) }).strict()).max(1000),
  armRuns: z.array(z.object({ trialId: id, arm, status: z.enum(['COMPLETED', 'FAILURE']), selectedFrameIds: z.array(id).max(3),
    firstActionableMs: ms.nullable(), stableMs: ms.nullable(), finalMs: ms, stages, failureCodes: z.array(id).max(32),
  }).strict()).max(4000),
}).strict();
export type Bundle = z.infer<typeof bundleSchema>;
export function unique(values: string[], code: string) { if (new Set(values).size !== values.length) throw Error(code); }
export function validateManifest(value: unknown): Manifest {
  const m = manifestSchema.parse(value);
  unique(m.gallery.map(p => p.productId), 'PHONE_DUPLICATE_PRODUCT');
  unique(m.gallery.flatMap(p => p.orderedReferences.map(r => r.id)), 'PHONE_DUPLICATE_REFERENCE');
  unique(m.trials.map(t => t.id), 'PHONE_DUPLICATE_TRIAL'); unique(m.trials.map(t => t.sessionId), 'PHONE_DUPLICATE_SESSION');
  if (m.trials.some(t => t.truth.kind === 'KNOWN' && !m.gallery.some(p => p.productId === (t.truth.kind === 'KNOWN' ? t.truth.productId : null)))) throw Error('PHONE_TRUTH_NOT_ENROLLED');
  for (const s of m.specifications) {
    const p = m.gallery.find(p => p.productId === s.productId); if (!p) throw Error('PHONE_SPECIFICATION_PRODUCT');
    if (s.provenance.kind === 'reference-transcription') {
      const proof = s.provenance;
      if (!p.orderedReferences.some(r => r.id === proof.referenceId && r.inputSha256 === proof.inputSha256) || s.literal !== proof.span.text) throw Error('PHONE_SPECIFICATION_PROVENANCE');
    }
  }
  return m;
}
export function validateBundle(m: Manifest, manifestHash: string, value: unknown): Bundle {
  const b = bundleSchema.parse(value);
  if (b.manifestSha256 !== manifestHash || b.sourceSha256 !== m.sourceSha256 || b.modelSha256 !== m.modelSha256 ||
      b.recipeSha256 !== m.recipeSha256 || b.policySha256 !== m.policySha256) throw Error('PHONE_BUNDLE_BINDING');
  unique(b.referenceRecords.map(r => r.id), 'PHONE_DUPLICATE_REFERENCE'); unique(b.trialRecords.map(t => t.trialId), 'PHONE_DUPLICATE_TRIAL');
  unique(b.armRuns.map(a => a.trialId + ':' + a.arm), 'PHONE_DUPLICATE_ARM');
  const refs = m.gallery.flatMap(p => p.orderedReferences);
  if (b.referenceRecords.some(r => !refs.some(e => e.id === r.id && e.inputSha256 === r.inputSha256))) throw Error('PHONE_ORPHAN_REFERENCE');
  if (b.trialRecords.some(t => !m.trials.some(e => e.id === t.trialId)) || b.armRuns.some(a => !m.trials.some(t => t.id === a.trialId))) throw Error('PHONE_ORPHAN_TRIAL_OR_ARM');
  for (const t of b.trialRecords) {
    unique(t.frames.map(f => f.id), 'PHONE_DUPLICATE_FRAME');
    const active = t.frames.filter(f => f.sessionId === t.sessionId).slice().sort((a, b) => a.requestAtMs - b.requestAtMs);
    if (active.length > POLICY.maxFrames) throw Error('PHONE_FRAME_CAP');
    if (active.some((f, i) => i > 0 && f.requestAtMs < active[i - 1].completedAtMs)) throw Error('PHONE_OVERLAPPING_JOBS');
  }
  for (const r of [...b.referenceRecords, ...b.trialRecords.flatMap(t => t.frames)]) {
    if (r.modelSha256 !== m.modelSha256 || r.recipeSha256 !== m.recipeSha256) throw Error('PHONE_RECORD_BINDING');
  }
  // Missing records intentionally survive validation for explicit failed rows.
  return b;
}
