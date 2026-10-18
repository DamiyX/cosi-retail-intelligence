import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { retrievalLab } from '../src/retrievalPaths.ts';
import { sha256 } from '../src/provenance.ts';
import { MODEL_SHA, recipeSha256, sourceFingerprint } from '../src/exploratoryStudy.ts';
import { validateComparison, cropRecipeSha256 } from '../src/framingComparisonSchema.ts';
import { framingSourceFingerprint, framingSourceManifest } from '../src/framingComparisonSource.ts';
import { pairedEvaluation } from '../src/framingComparisonEvaluation.ts';
import { loadLabelInputs } from '../src/labelEvidenceInputs.ts';
import { core, config } from '../src/labelEvidenceSchema.ts';
import type { Field, Progress } from '../src/labelEvidenceSchema.ts';

const bytes = (v: unknown) => JSON.stringify(v);
const hash = (v: unknown) => sha256(bytes(v));
interface Frame { id: string; path: string; sha256: string; width: number; height: number; orientation: number;
  pixelSha256: string; tensorSha256: string; thumbnailSha256: string }
export function generatedLabelFixture() {
  const parent = resolve(retrievalLab, 'runs/label-evidence'); mkdirSync(parent, { recursive: true });
  const root = resolve(parent, 'generated-' + randomUUID()); mkdirSync(root);
  const images = resolve(root, 'originals');
  const py = resolve(retrievalLab, 'runs/exploratory/e01-e03-20261004/venv/Scripts/python.exe');
  const generated = spawnSync(py, ['-B', resolve(retrievalLab, 'tools/framing-comparison/generate_fixtures.py'), '--out', images], { encoding: 'utf8', timeout: 30000 });
  if (generated.status !== 0) throw Error(generated.stdout + generated.stderr);
  const frames = JSON.parse(readFileSync(resolve(images, 'index.json'), 'utf8')) as Frame[];
  const products = Array.from({ length: 10 }, (_, i) => ({ id: 'invented-' + i.toString().padStart(2, '0'), label: i === 9 ? '<script>Juniper</script> & "Meadow"' : 'Juniper Meadow ' + (600 + i * 150) + 'ml', physicalFamily: 'generated-family-' + i }));
  const entries = frames.map((f, i) => ({ id: f.id, productId: products[Math.floor(i / 4)].id, physicalFamily: products[Math.floor(i / 4)].physicalFamily,
    exposure: 'generated-exposure-' + i, role: i % 4 < 2 ? 'reference' as const : 'query' as const, asset: { path: f.path, sha256: f.sha256 } }));
  const study = { schemaVersion: 1 as const, studyId: 'same-instance-exploration-v1' as const, kind: 'generated-fixture' as const,
    formalAdmission: false as const, modelSha256: MODEL_SHA, recipeSha256, products, entries };
  const softwareSha256 = sha256('{}');
  const baselineSetup = { schemaVersion: 1, modelSha256: MODEL_SHA, recipeSha256, softwareSha256, rightsReviewed: true,
    preprocessingReviewed: true, networkReviewed: false, reviewer: 'generated-only', evidence: ['Authored toy vectors; colored fixture images, no real label-reading or model'] };
  const environment = { python: 'generated', os: 'generated', cpu: 'no-inference', threads: 1 as const, memory: 'not-measured' as const };
  const vector = (p: number, wrong: boolean) => Array.from({ length: 1024 }, (_, j) => j === p ? wrong ? .8 : 1 : wrong && j === (p + 1) % 10 ? .9 : wrong && j === (p + 2) % 10 ? .2 : 0);
  const records = frames.map((f, i) => ({ id: f.id, assetSha256: f.sha256, kind: 'vector' as const, values: vector(Math.floor(i / 4), i % 4 >= 2 && i < 12),
    pixelSha256: f.pixelSha256, tensorSha256: f.tensorSha256, thumbnailSha256: f.thumbnailSha256,
    timings: { readMs: 1, decodeMs: 2, preprocessMs: 3, inferenceMs: 0 } }));
  const baseline = { schemaVersion: 1 as const, runId: 'generated-label-baseline', mode: 'GENERATED_FIXTURE' as const, studySha256: hash(study), modelSha256: MODEL_SHA,
    recipeSha256, sourceSha256: sourceFingerprint(), setupSha256: hash(baselineSetup), softwareSha256, loadMs: 0, encodingMs: 2, attemptMs: 4, runFailure: null,
    environment, preservation: frames.map(f => ({ id: f.id, before: f.sha256, after: f.sha256 })), records };
  const comparison = validateComparison({ schemaVersion: 1, comparisonId: 'generated-label-comparison', formalAdmission: false, primary: 'FF->CC', study,
    baseline: { studySha256: baseline.studySha256, bundleSha256: hash(baseline), setupSha256: baseline.setupSha256, softwareSha256,
      sourceSha256: baseline.sourceSha256, runId: baseline.runId }, cropRecipeSha256,
    frames: frames.map(f => ({ id: f.id, assetSha256: f.sha256, width: f.width, height: f.height, orientation: f.orientation })) });
  const annotations = { schemaVersion: 1 as const, comparisonSha256: hash(comparison), recipeSha256: cropRecipeSha256, entries: comparison.frames.map(f => ({ ...f,
    confirmedIdentity: true, issue: 'none' as const, markedBox: { left: 0, top: 0, right: f.width, bottom: f.height }, effectiveBox: { left: 0, top: 0, right: f.width, bottom: f.height } })) };
  const setup = { ...baselineSetup, kind: 'FRAMING_SETUP', recipeSha256: cropRecipeSha256, sourceSha256: framingSourceFingerprint(),
    comparisonSha256: hash(comparison), annotationSha256: hash(annotations), baselineBundleSha256: hash(baseline) };
  const crop = { ...baseline, kind: 'FRAMING_CROP_BUNDLE' as const, runId: 'framing-generated-label', recipeSha256: cropRecipeSha256,
    sourceSha256: setup.sourceSha256, setupSha256: hash(setup), comparisonSha256: setup.comparisonSha256, annotationSha256: setup.annotationSha256,
    baselineBundleSha256: setup.baselineBundleSha256, baselineSourceSha256: baseline.sourceSha256,
    records: records.map(r => ({ ...r, contextThumbnailSha256: r.thumbnailSha256 })) };
  const expected = { comparisonSha256: crop.comparisonSha256, annotationSha256: crop.annotationSha256, sourceSha256: crop.sourceSha256,
    setupSha256: crop.setupSha256, softwareSha256, runId: crop.runId };
  const report = pairedEvaluation(comparison, baseline, hash(baseline), crop, expected);
  const cropRoot = resolve(root, 'crop'); mkdirSync(cropRoot);
  for (const f of frames) { copyFileSync(resolve(images, 'full/thumb-' + f.id + '.png'), resolve(cropRoot, 'thumb-' + f.id + '.png')); copyFileSync(resolve(images, 'full/thumb-' + f.id + '.png'), resolve(cropRoot, 'context-' + f.id + '.png')); }
  const paths = { comparison: resolve(root, 'comparison.json'), annotations: resolve(root, 'annotations.json'), baseline: resolve(root, 'baseline.json'),
    crop: resolve(cropRoot, 'bundle.json'), report: resolve(root, 'saved-report.json'), setup: resolve(root, 'setup.json'), sourceManifest: resolve(root, 'source-manifest.json') };
  const values = { comparison, annotations, baseline, crop, report, setup, sourceManifest: framingSourceManifest() };
  for (const k of Object.keys(paths) as (keyof typeof paths)[]) writeFileSync(paths[k], bytes(values[k]), { flag: 'wx' });
  return { root, images, cropRoot, frames, paths, values, loaded: loadLabelInputs(paths, images, cropRoot) };
}
export function authoredReviews(fixture: ReturnType<typeof generatedLabelFixture>, bindingSha256: string) {
  const manifest = fixture.loaded.manifest;
  function fill(scope: 'references' | 'queries'): Progress {
    const p = core.blank(config(manifest, bindingSha256, scope));
    p.entries = p.entries.map(e => {
      const i = fixture.frames.findIndex(f => f.id === e.id), quantity = (600 + Math.floor(i / 4) * 150) + 'ml', literal = 'Juniper Meadow ' + quantity;
      return { ...e, readability: 'readable', literal, fields: Object.fromEntries(core.fields.map(field => {
        const text = { brandName: 'Juniper', variant: 'Meadow', quantity }[field]; return [field, { text, start: literal.indexOf(text), end: literal.indexOf(text) + text.length }];
      })) as Record<Field, { start: number; end: number; text: string }> };
    }); return p;
  }
  return { references: fill('references'), queries: fill('queries') };
}
