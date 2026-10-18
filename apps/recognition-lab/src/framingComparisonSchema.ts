import { z } from 'zod';
import { bundleSchema, validateBundle, type Bundle } from './exploratoryEvaluation.ts';
import { digest, MODEL_SHA, RECIPE, recipeSha256, studySchema, validateStudy } from './exploratoryStudy.ts';
import { sha256 } from './provenance.ts';
import { LabError } from './schema.ts';

// Different operation order and recipe. Never relabel the frozen FF bundle.
export const CROP_RECIPE = {
  version: 'rgb-product-box5-letterbox-224-v1',
  baselineNumericPipeline: RECIPE,
  inputContainer: 'jpeg-primary+sef107-scalar-metadata-v1',
  order: ['bounded-container', 'decode', 'EXIF-orient', 'RGB', 'full-resolution-box5-crop', 'letterbox', 'float32-div255'],
  boxConvention: 'integer-left-top-inclusive-right-bottom-exclusive',
  padding: 'ceil-box-dimension-div20-each-side-clamped',
} as const;
export const cropRecipeSha256 = sha256(JSON.stringify(CROP_RECIPE));
const id = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/);
const dimension = z.number().int().positive().max(50000000);
export const boxSchema = z.object({ left: z.number().int().nonnegative().max(50000000),
  top: z.number().int().nonnegative().max(50000000), right: dimension, bottom: dimension }).strict();
export type Box = z.infer<typeof boxSchema>;
export const baselineBindingSchema = z.object({ studySha256: digest, bundleSha256: digest,
  setupSha256: digest, softwareSha256: digest, sourceSha256: digest,
  runId: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/) }).strict();
export const comparisonSchema = z.object({ schemaVersion: z.literal(1), comparisonId: id,
  formalAdmission: z.literal(false), primary: z.literal('FF->CC'),
  study: studySchema, baseline: baselineBindingSchema, cropRecipeSha256: digest,
  frames: z.array(z.object({ id, assetSha256: digest, width: dimension, height: dimension,
    orientation: z.number().int().min(1).max(8) }).strict()).length(40) }).strict();
export type Comparison = z.infer<typeof comparisonSchema>;
export const annotationSchema = z.object({ schemaVersion: z.literal(1), comparisonSha256: digest,
  recipeSha256: digest, entries: z.array(z.object({ id, assetSha256: digest, width: dimension,
    height: dimension, orientation: z.number().int().min(1).max(8),
    confirmedIdentity: z.boolean(), issue: z.enum(['none', 'not-reviewed', 'identity', 'bounds']),
    markedBox: boxSchema.nullable(), effectiveBox: boxSchema.nullable() }).strict()).length(40) }).strict();
export type Annotations = z.infer<typeof annotationSchema>;
export function effectiveBox(value: Box, width: number, height: number): Box {
  const b = boxSchema.parse(value);
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0 ||
      width * height > RECIPE.maxPixels || b.left >= b.right || b.top >= b.bottom || b.right > width || b.bottom > height)
    throw new LabError('SETUP_BLOCKED', 'Invalid oriented box');
  const x = Math.ceil((b.right - b.left) / 20), y = Math.ceil((b.bottom - b.top) / 20);
  return { left: Math.max(0, b.left - x), top: Math.max(0, b.top - y), right: Math.min(width, b.right + x), bottom: Math.min(height, b.bottom + y) };
}
export function validateComparison(value: unknown): Comparison {
  const c = comparisonSchema.parse(value); validateStudy(c.study);
  if (c.cropRecipeSha256 !== cropRecipeSha256 || new Set(c.frames.map(f => f.id)).size !== 40)
    throw new LabError('SETUP_BLOCKED', 'Comparison recipe/IDs mismatch');
  for (const f of c.frames) {
    const e = c.study.entries.find(e => e.id === f.id);
    if (!e || e.asset.sha256 !== f.assetSha256 || f.width * f.height > RECIPE.maxPixels)
      throw new LabError('SETUP_BLOCKED', 'Frame binding mismatch');
  }
  return c;
}
export function validateAnnotations(c: Comparison, value: unknown, comparisonSha256: string, complete = true): Annotations {
  const a = annotationSchema.parse(value);
  if (a.comparisonSha256 !== comparisonSha256 || a.recipeSha256 !== cropRecipeSha256 || new Set(a.entries.map(e => e.id)).size !== 40)
    throw new LabError('SETUP_BLOCKED', 'Annotation binding mismatch');
  for (const e of a.entries) {
    const f = c.frames.find(f => f.id === e.id);
    if (!f || e.assetSha256 !== f.assetSha256 || e.width !== f.width || e.height !== f.height || e.orientation !== f.orientation)
      throw new LabError('SETUP_BLOCKED', 'Annotation frame mismatch');
    const expected = e.markedBox ? effectiveBox(e.markedBox, e.width, e.height) : null;
    if (JSON.stringify(expected) !== JSON.stringify(e.effectiveBox) || complete &&
        (!e.confirmedIdentity || e.issue !== 'none' || !e.markedBox))
      throw new LabError('SETUP_BLOCKED', 'Unreviewed identity/bounds or padding mismatch');
  }
  return a;
}
export function validateBaseline(c: Comparison, value: unknown, rawSha256: string): Bundle {
  if (rawSha256 !== c.baseline.bundleSha256 || c.study.recipeSha256 !== recipeSha256)
    throw new LabError('SETUP_BLOCKED', 'Frozen baseline digest mismatch');
  return validateBundle(c.study, value, c.baseline);
}
export const cropBundleSchema = bundleSchema.omit({ recipeSha256: true }).extend({
  kind: z.literal('FRAMING_CROP_BUNDLE'), recipeSha256: digest, comparisonSha256: digest,
  annotationSha256: digest, baselineBundleSha256: digest, baselineSourceSha256: digest,
  records: z.array(z.discriminatedUnion('kind', [
    bundleSchema.shape.records.element.options[0].extend({ contextThumbnailSha256: digest }),
    bundleSchema.shape.records.element.options[1],
  ])).length(40),
}).strict();
export type CropBundle = z.infer<typeof cropBundleSchema>;
export interface CropExpected { comparisonSha256: string; annotationSha256: string; sourceSha256: string;
  setupSha256: string; softwareSha256: string; runId: string }
export function validateCropBundle(c: Comparison, value: unknown, expected: CropExpected): CropBundle {
  const b = cropBundleSchema.parse(value);
  if (Object.entries(expected).some(([k, v]) => b[k as keyof CropBundle] !== v) || b.recipeSha256 !== cropRecipeSha256 ||
      b.baselineBundleSha256 !== c.baseline.bundleSha256 || b.baselineSourceSha256 !== c.baseline.sourceSha256 ||
      b.studySha256 !== c.baseline.studySha256 || b.modelSha256 !== MODEL_SHA || b.softwareSha256 !== c.baseline.softwareSha256 ||
      b.mode !== (c.study.kind === 'generated-fixture' ? 'GENERATED_FIXTURE' : 'PRIVATE_INFERENCE') ||
      new Set(b.records.map(r => r.id)).size !== 40 || new Set(b.preservation.map(p => p.id)).size !== 40 ||
      b.attemptMs === undefined || b.attemptMs < b.loadMs + b.encodingMs || b.runFailure &&
      (b.loadMs <= 0 || b.encodingMs !== 0 || b.records.some(r => r.kind !== 'failure' || r.code !== 'NOT_RUN')))
    throw new LabError('SETUP_BLOCKED', 'Crop provenance/accounting mismatch');
  for (const r of b.records) {
    const e = c.study.entries.find(e => e.id === r.id), p = b.preservation.find(p => p.id === r.id);
    if (!e || r.assetSha256 !== e.asset.sha256 || !p || p.before !== e.asset.sha256 || p.after !== p.before ||
        r.kind === 'vector' && r.values.every(v => v === 0))
      throw new LabError('SETUP_BLOCKED', 'Crop input/vector/preservation mismatch');
  }
  return b;
}
