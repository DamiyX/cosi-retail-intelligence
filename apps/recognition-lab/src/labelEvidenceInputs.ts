import { readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { z } from 'zod';
import { inputPath, retrievalLab } from './retrievalPaths.ts';
import { sha256 } from './provenance.ts';
import { MODEL_SHA, RECIPE, setupSchema } from './exploratoryStudy.ts';
import { validateAnnotations, validateBaseline, validateComparison, validateCropBundle } from './framingComparisonSchema.ts';
import { framingSourceFingerprint, framingSourceManifest } from './framingComparisonSource.ts';
import { core, inputNames, manifestSchema } from './labelEvidenceSchema.ts';
import type { InputName, Manifest, ReviewEntry } from './labelEvidenceSchema.ts';
import { labelSourceManifest, labelSourceSha256, ruleSha256, ruleVersion } from './labelEvidenceSource.ts';

const hash = z.string().regex(/^[0-9a-f]{64}$/);
const framingSetupSchema = setupSchema.extend({ kind: z.literal('FRAMING_SETUP'), sourceSha256: hash, comparisonSha256: hash,
  annotationSha256: hash, baselineBundleSha256: hash }).strict();
const candidate = z.object({ productId: z.string(), score: z.number().finite().min(-1).max(1), nearestReferenceId: z.string() }).strict();
const savedRow = z.object({ id: z.string(), truth: z.string(), failures: z.array(z.string()), candidates: z.array(candidate),
  correctRank: z.number().int().positive().nullable(), first: z.boolean(), firstThree: z.boolean(), margin: z.number().finite().nullable(), topTie: z.array(z.string()) }).strict();
const savedReport = z.object({ schemaVersion: z.literal(1), comparisonId: z.string(), primary: z.literal('FF->CC'), formalAdmission: z.literal(false),
  mode: z.enum(['GENERATED_FIXTURE', 'PRIVATE_INFERENCE']), denominator: z.literal(20), complete: z.boolean(),
  provenance: z.object({ baseline: z.unknown(), comparisonSha256: hash, annotationSha256: hash, cropSourceSha256: hash,
    cropRecipeSha256: hash, modelSha256: hash, softwareSha256: hash, cropSetupSha256: hash }).strict(),
  conditions: z.array(z.object({ condition: z.enum(['FF', 'CC', 'FC', 'CF']), denominator: z.literal(20), rows: z.array(savedRow).length(20) }).passthrough()).length(4) }).passthrough();
export function readLabelJson(path: string) {
  const location = inputPath(path), bytes = readFileSync(location);
  if (bytes.length > 4 * 1024 * 1024) throw Error('LABEL_INPUT_SIZE');
  return { path: location, value: core.strictJson(bytes.toString('utf8')), bytes, sha256: sha256(bytes) };
}
export type InputPaths = Record<InputName, string>;
export function loadLabelInputs(paths: InputPaths, imageRoot: string, cropRoot: string) {
  const inputs = Object.fromEntries(inputNames.map(name => [name, readLabelJson(paths[name])])) as Record<InputName, ReturnType<typeof readLabelJson>>;
  const c = validateComparison(inputs.comparison.value), a = validateAnnotations(c, inputs.annotations.value, inputs.comparison.sha256);
  validateBaseline(c, inputs.baseline.value, inputs.baseline.sha256);
  const setup = framingSetupSchema.parse(inputs.setup.value), source = framingSourceFingerprint();
  if (inputs.sourceManifest.bytes.toString('utf8') !== JSON.stringify(framingSourceManifest()) || inputs.sourceManifest.sha256 !== source ||
      setup.sourceSha256 !== source || setup.comparisonSha256 !== inputs.comparison.sha256 || setup.annotationSha256 !== inputs.annotations.sha256 ||
      setup.baselineBundleSha256 !== inputs.baseline.sha256 || setup.modelSha256 !== MODEL_SHA || setup.recipeSha256 !== c.cropRecipeSha256)
    throw Error('LABEL_FROZEN_SOURCE_BINDING');
  const cropValue = inputs.crop.value as { runId?: unknown };
  const crop = validateCropBundle(c, inputs.crop.value, { comparisonSha256: inputs.comparison.sha256,
    annotationSha256: inputs.annotations.sha256, sourceSha256: source, setupSha256: inputs.setup.sha256,
    softwareSha256: setup.softwareSha256, runId: z.string().parse(cropValue.runId) });
  const report = savedReport.parse(inputs.report.value);
  const wanted = { baseline: c.baseline, comparisonSha256: inputs.comparison.sha256, annotationSha256: inputs.annotations.sha256,
    cropSourceSha256: source, cropRecipeSha256: crop.recipeSha256, modelSha256: crop.modelSha256, softwareSha256: crop.softwareSha256, cropSetupSha256: crop.setupSha256 };
  if (core.canonical(report.provenance) !== core.canonical(wanted) || report.comparisonId !== c.comparisonId || report.mode !== crop.mode ||
      report.conditions.map(r => r.condition).join(',') !== 'FF,CC,FC,CF') throw Error('LABEL_SAVED_REPORT_BINDING');
  const queryIds = c.study.entries.filter(e => e.role === 'query').map(e => e.id);
  for (const condition of report.conditions) {
    if (new Set(condition.rows.map(r => r.id)).size !== 20 || condition.rows.some(r => !queryIds.includes(r.id))) throw Error('LABEL_QUERY_DENOMINATOR');
    for (const row of condition.rows) {
      const actual = c.study.entries.find(e => e.id === row.id)!;
      if (row.truth !== actual.productId || new Set(row.candidates.map(e => e.productId)).size !== row.candidates.length ||
          row.candidates.length !== (row.correctRank === null ? 0 : 10)) throw Error('LABEL_SAVED_ROW_BINDING');
      for (const v of row.candidates) if (!c.study.entries.some(e => e.id === v.nearestReferenceId && e.productId === v.productId && e.role === 'reference')) throw Error('LABEL_REFERENCE_CANDIDATE_BINDING');
      const position = row.candidates.length ? row.candidates.findIndex(v => v.productId === row.truth) + 1 : null;
      if (position !== row.correctRank || row.first !== (position === 1) || row.firstThree !== (position !== null && position > 0 && position <= 3)) throw Error('LABEL_SAVED_RANK_BINDING');
    }
  }
  imageRoot = inputPath(imageRoot, true); cropRoot = inputPath(cropRoot, true);
  const ceiling = resolve(retrievalLab, c.study.kind === 'generated-fixture' ? 'runs' : 'private-data');
  if (!imageRoot.startsWith(ceiling + sep) || resolve(inputs.crop.path) !== resolve(cropRoot, 'bundle.json')) throw Error('LABEL_INPUT_ROOT');
  if (c.study.kind === 'private-same-instance') {
    const pins: Partial<Record<InputName, string>> = { comparison: 'e39e28e9af82e5798884767854f745369b23cd18e7c24d140bf8faa00799d6d4',
      annotations: '94dc350fad86fbac717de276970cd1fe1a78edbe9bf60cdd8a49952689bbb134', baseline: '402b647439508587b25f11509e5f135e88fd5dfccc9267a55da68040ebed8dd6',
      crop: 'aa2964e8a85c81ab5fe8d05fa76fe2716da71d350df12412cd6b15ab95b4a75d', report: '8d553587738f970e684d23bfe025a35358f6882486cae1f8f9b43c0864c6a95d' };
    if (crop.runId !== 'framing-manual-20261011-a1' || source !== 'dd68bc1f2a4b1bfd899363ad3223f15c74e2d393db612a609703dc65b7e6999d' ||
        imageRoot !== resolve(retrievalLab, 'private-data/r1-pilot') || Object.entries(pins).some(([name, digest]) => inputs[name as InputName].sha256 !== digest))
      throw Error('LABEL_FC06_PIN');
  }
  const entries: ReviewEntry[] = c.study.entries.map(e => {
    const f = a.entries.find(f => f.id === e.id)!;
    // Full-buffer hashing only. No decoder, interpreter, image manipulation or upload.
    const path = inputPath(resolve(imageRoot, e.asset.path));
    if (!path.startsWith(imageRoot + sep) || sha256(readFileSync(path)) !== e.asset.sha256) throw Error('LABEL_ORIGINAL_HASH');
    return { id: e.id, assetSha256: e.asset.sha256, role: e.role, width: f.width, height: f.height,
      orientation: f.orientation, effectiveBox: f.effectiveBox!, ...(e.role === 'reference' ? { productId: e.productId } : {}) };
  }).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const manifest: Manifest = manifestSchema.parse({ schemaVersion: 1, kind: 'LABEL_EVIDENCE_PREPARATION', ruleVersion,
    ruleSha256: ruleSha256(), sourceSha256: labelSourceSha256(), sourceManifest: labelSourceManifest(),
    inputSha256: Object.fromEntries(inputNames.map(k => [k, inputs[k].sha256])), inputPaths: Object.fromEntries(inputNames.map(k => [k, inputs[k].path])),
    imageRoot, cropRoot, evidenceKind: c.study.kind, maxImageBytes: RECIPE.maxBytes, entries, reviewBeforeAnalysis: true, formalAdmission: false });
  return { manifest, c, crop, report, inputs };
}
export function validateManifest(value: unknown) {
  const manifest = manifestSchema.parse(value);
  const loaded = loadLabelInputs(manifest.inputPaths, manifest.imageRoot, manifest.cropRoot);
  if (core.canonical(loaded.manifest) !== core.canonical(manifest)) throw Error('LABEL_PREPARATION_DRIFT');
  return loaded;
}
