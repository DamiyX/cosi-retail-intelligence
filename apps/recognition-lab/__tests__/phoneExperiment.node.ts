import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, symlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { generatedExperiment } from '../src/phoneExperimentGenerated.ts';
import { evaluatePhoneExperiment, selectFrames, productScores, latencySummary } from '../src/phoneExperimentEvaluation.ts';
import { validateManifest, validateBundle, sha256, POLICY } from '../src/phoneExperimentSchema.ts';
import { compareRuntimeVectors, mapGuide, letterboxGeometry } from '../src/phoneExperimentProbes.ts';
import { phoneSourceSha256 } from '../src/phoneExperimentSource.ts';
import { retrievalLab } from '../src/retrievalPaths.ts';

const fixture = () => generatedExperiment(phoneSourceSha256());
test('four arms have nested2/4 references, shared first/three frames,25 trials including5 unknown and unchanged score meaning', () => {
  const f = fixture(), result = evaluatePhoneExperiment(f.manifest, f.manifestHash, f.bundle);
  assert.equal(result.rows.length, 100); assert.equal(result.denominator, 25); assert.equal(result.complete, true);
  for (const t of f.manifest.trials) {
    const [a, b, c, d] = result.rows.filter(r => r.trialId === t.id);
    assert.deepEqual(a.selectedFrameIds, b.selectedFrameIds); assert.deepEqual(c.selectedFrameIds, d.selectedFrameIds);
    assert.deepEqual(a.selectedFrameIds, c.selectedFrameIds.slice(0, 1));
    assert.ok(a.referenceIds.every(id => b.referenceIds.includes(id))); assert.deepEqual(a.referenceIds, c.referenceIds);
    assert.ok([a, b, c, d].every(r => r.autoAccept === false && r.manualConfirmationRequired));
  }
  assert.equal(result.summaries[0].knownDenominator, 20); assert.equal(result.summaries[0].unknownDenominator, 5);
  assert.equal(result.summaries[0].first, 18); assert.equal(result.summaries[1].first, 18);
  assert.equal(result.summaries[2].first, 20); assert.equal(result.summaries[3].first, 18);
  assert.equal(result.pairs[0].rows.filter(r => r.outcome === 'GAIN').length, 2);
  assert.equal(result.pairs[0].rows.filter(r => r.outcome === 'LOSS').length, 2);
});
test('cross-frame fusion is mean(max-reference), not max(mean) or a winning frame, with deterministic exact ties', () => {
  const r = productScores([[1, 0], [0, 1]], [{ productId: 'z', references: [{ id: 'r1', values: [1, 0] }, { id: 'r2', values: [0, 1] }] },
    { productId: 'a', references: [{ id: 'r3', values: [1, 1] }] }]);
  assert.equal(r[0].productId, 'z'); assert.equal(r[0].score, 1); assert.deepEqual(r[0].perFrame.map(f => f.nearestReferenceId), ['r1', 'r2']);
  const ties = productScores([[1, 0]], ['z', 'a'].map(productId => ({ productId, references: [{ id: productId, values: [1, 0] }] })));
  assert.deepEqual(ties.map(r => r.productId), ['a', 'z']); assert.ok(ties.every(r => r.score === 1));
});
test('frame selection ignores score/truth/outcome, has400ms spacing/cap3, and excludes readiness/deadline/stale sessions', () => {
  const f = fixture().bundle.trialRecords[0], frames = structuredClone(f.frames);
  const hidden = frames[0] as typeof frames[0] & { truth?: string; score?: number };
  Object.defineProperty(hidden, 'truth', { get() { throw Error('TRUTH_LEAK'); } });
  Object.defineProperty(hidden, 'score', { get() { throw Error('SCORE_LEAK'); } });
  Object.defineProperty(hidden, 'outcome', { get() { throw Error('OUTCOME_LEAK'); } });
  assert.deepEqual(selectFrames(frames, f.sessionId, 3000), frames.map(e => e.id));
  const extra = [{ ...frames[1], id: 'too-close', capturedAtMs: 20 }, { ...frames[1], id: 'not-ready', capturedAtMs: 450, ready: false },
    { ...frames[2], id: 'stale', sessionId: 'old', capturedAtMs: 1100 }, { ...frames[2], id: 'late', capturedAtMs: 3000 }];
  assert.deepEqual(selectFrames([...frames, ...extra], f.sessionId, 3000), frames.map(e => e.id));
});
test('failed frame and late output remain visible, fallback does not claim3-frame acquisition', () => {
  for (const name of ['failed-frame', 'late-frame'] as const) {
    const f = generatedExperiment(phoneSourceSha256(), name), result = evaluatePhoneExperiment(f.manifest, f.manifestHash, f.bundle), row = result.rows.find(r => r.trialId === 'trial-00' && r.arm === 'V43')!;
    assert.equal(result.rows.length, 100); assert.equal(result.complete, false); assert.equal(row.usableFrameCount, 2);
    assert.equal(row.selectedFrameCount, 3); assert.equal(row.threeFrameAcquisition, false);
    assert.ok(row.issues.includes(name === 'failed-frame' ? 'CAPTURE_FAILURE' : 'LATE_RESULT'));
  }
  const first = fixture(); first.bundle.trialRecords[0].frames[0].outcome = { status: 'FAILURE', code: 'INFERENCE_FAILURE' };
  const rows = evaluatePhoneExperiment(first.manifest, first.manifestHash, first.bundle).rows.filter(r => r.trialId === 'trial-00');
  assert.equal(rows[0].status, 'UNSCORED'); assert.equal(rows[1].status, 'UNSCORED');
  assert.equal(rows[2].usableFrameCount, 2); assert.equal(rows[3].usableFrameCount, 2);
  assert.deepEqual(rows[0].selectedFrameIds, [first.bundle.trialRecords[0].frames[0].id]);
});
test('missing arm/trial/reference and execution failure keep complete schedule; no success-only denominator', () => {
  const f = fixture(); f.bundle.armRuns.pop(); f.bundle.trialRecords.splice(0, 1); f.bundle.referenceRecords.pop();
  f.bundle.armRuns[4].status = 'FAILURE'; f.bundle.armRuns[4].failureCodes = ['NATIVE_FAILURE'];
  const r = evaluatePhoneExperiment(f.manifest, f.manifestHash, f.bundle);
  assert.equal(r.rows.length, 100); assert.equal(r.complete, false); assert.ok(r.rows.some(r => r.issues.includes('ARM_RESULT_MISSING')));
  assert.ok(r.rows.some(r => r.issues.includes('TRIAL_RECORD_MISSING'))); assert.ok(r.rows.some(r => r.issues.includes('REFERENCE_RECORD_MISSING')));
  assert.ok(r.rows.some(r => r.issues.includes('ARM_EXECUTION_FAILURE'))); assert.ok(r.summaries.every(s => s.denominator === 25));
});
test('cancelled and stale-session results cannot populate ranks; completed late session remains unscored', () => {
  const f = generatedExperiment(phoneSourceSha256(), 'cancelled'), cancelled = evaluatePhoneExperiment(f.manifest, f.manifestHash, f.bundle);
  assert.ok(cancelled.rows.filter(r => r.trialId === 'trial-00').every(r => r.status === 'UNSCORED' && r.issues.includes('CANCELLED')));
  const s = fixture(); s.bundle.trialRecords[0].sessionId = 'old';
  assert.ok(evaluatePhoneExperiment(s.manifest, s.manifestHash, s.bundle).rows.filter(r => r.trialId === 'trial-00').every(r => r.issues.includes('SESSION_BINDING')));
  const late = fixture(); late.bundle.trialRecords[0].frames.forEach(f => { f.sessionId = 'old'; });
  assert.ok(evaluatePhoneExperiment(late.manifest, late.manifestHash, late.bundle).rows.filter(r => r.trialId === 'trial-00').every(r => r.status === 'UNSCORED'));
});
test('arm-selected cherry-picking and overlapped jobs reject; incompatible bindings and malformed vectors reject', () => {
  const f = fixture(); f.bundle.armRuns[0].selectedFrameIds = [f.bundle.trialRecords[0].frames[2].id];
  assert.ok(evaluatePhoneExperiment(f.manifest, f.manifestHash, f.bundle).rows[0].issues.includes('ARM_SELECTION_MISMATCH'));
  const mutations = [
    (g: ReturnType<typeof fixture>) => { g.bundle.modelSha256 = 'a'.repeat(64); },
    (g: ReturnType<typeof fixture>) => { g.bundle.trialRecords[0].frames[0].recipeSha256 = 'a'.repeat(64); },
    (g: ReturnType<typeof fixture>) => { g.bundle.trialRecords[0].frames[1].requestAtMs = 50; },
    (g: ReturnType<typeof fixture>) => { g.bundle.trialRecords[0].frames.push({ ...g.bundle.trialRecords[0].frames[2], id: 'fourth', requestAtMs: 1200, capturedAtMs: 1300, completedAtMs: 1400 }); },
    (g: ReturnType<typeof fixture>) => { g.bundle.armRuns.push(g.bundle.armRuns[0]); },
    (g: ReturnType<typeof fixture>) => { const o = g.bundle.referenceRecords[0].outcome; if (o.status === 'VECTOR') o.values.fill(0); },
    (g: ReturnType<typeof fixture>) => { const o = g.bundle.referenceRecords[0].outcome; if (o.status === 'VECTOR') o.values[0] = NaN; },
  ];
  mutations.forEach(mutate => { const g = fixture(); mutate(g); assert.throws(() => validateBundle(g.manifest, g.manifestHash, g.bundle)); });
});
test('latency nearest-rank uses every attempted trial, with infinite absent results and group minimum', () => {
  const r = latencySummary([...Array.from({ length: 19 }, (_, i) => i * 10), null]);
  assert.deepEqual(r.p95, { kind: 'FINITE', ms: 180 });
  assert.deepEqual(latencySummary([...Array.from({ length: 18 }, (_, i) => i * 10), null, null]).p95, { kind: 'INFINITE_NO_ACTIONABLE_RESULT' });
  assert.equal(latencySummary([10, null]).minimumTimingGroupSizeMet, false);
  assert.equal(POLICY.deadlineMs, 3000);
});
test('stability needs two successive same first choices through completion; one frame cannot claim it', () => {
  const f = fixture(); f.bundle.armRuns.find(r => r.trialId === 'trial-02' && r.arm === 'V23')!.stableMs = 600;
  f.bundle.armRuns.find(r => r.trialId === 'trial-02' && r.arm === 'V21')!.stableMs = 100;
  const rows = evaluatePhoneExperiment(f.manifest, f.manifestHash, f.bundle).rows;
  assert.equal(rows.find(r => r.trialId === 'trial-02' && r.arm === 'V23')!.stableMs, 600);
  assert.ok(rows.find(r => r.trialId === 'trial-02' && r.arm === 'V21')!.issues.includes('UNSUPPORTED_STABILITY_CLAIM'));
});
test('first-actionable quality is separate from improved final rank; pre-output timestamps cannot claim speed', () => {
  const f = fixture(), result = evaluatePhoneExperiment(f.manifest, f.manifestHash, f.bundle);
  const summary = result.summaries.find(s => s.arm === 'V23')!;
  assert.equal(summary.first, 20); assert.equal(summary.correctAndWithinDeadline, 18);
  const early = fixture(); early.bundle.armRuns[0].firstActionableMs = 1;
  assert.ok(evaluatePhoneExperiment(early.manifest, early.manifestHash, early.bundle).rows[0].issues.includes('ARM_TIME_INVALID'));
  const premature = fixture(); premature.bundle.armRuns[2].finalMs = 600;
  assert.ok(evaluatePhoneExperiment(premature.manifest, premature.manifestHash, premature.bundle).rows[2].issues.includes('ARM_TIME_INVALID'));
  const absent = fixture(); absent.bundle.armRuns[0].firstActionableMs = null;
  const a = evaluatePhoneExperiment(absent.manifest, absent.manifestHash, absent.bundle);
  assert.ok(a.rows[0].issues.includes('NO_ACTIONABLE_RESULT')); assert.equal(a.complete, false);
});
test('typed specifications keep dimensions and source provenance separate and never change visual ranks', () => {
  const f = fixture(), baseline = evaluatePhoneExperiment(f.manifest, f.manifestHash, f.bundle);
  f.manifest.specifications = [{ productId: 'invented-00', dimension: 'power-W', literal: '10W',
    provenance: { kind: 'reference-transcription', referenceId: f.manifest.gallery[0].orderedReferences[0].id,
      inputSha256: f.manifest.gallery[0].orderedReferences[0].inputSha256, span: { sourceLiteral: '10W 900lm', start: 0, end: 3, text: '10W' }, reviewStatus: 'PENDING' } }];
  assert.equal(validateManifest(f.manifest).specifications[0].dimension, 'power-W');
  const changedHash = sha256(JSON.stringify(f.manifest)); f.bundle.manifestSha256 = changedHash;
  const observed = evaluatePhoneExperiment(f.manifest, changedHash, f.bundle);
  assert.equal(observed.specificationsUsedForRanking, false); assert.deepEqual(observed.rows.map(r => r.candidates), baseline.rows.map(r => r.candidates));
  const bad = structuredClone(f.manifest); if (bad.specifications[0].provenance.kind === 'reference-transcription') bad.specifications[0].provenance.referenceId = 'query-01';
  assert.throws(() => validateManifest(bad), /PHONE_SPECIFICATION_PROVENANCE/);
});
test('runtime tolerances are fixed and separate from generated image/orientation/ROI geometry', () => {
  const a: number[] = Array.from({ length: 1024 }, (_, i) => i === 0 ? 1 : 0), near = a.slice(), far = a.slice(); near[1] = .00005; far[1] = .01;
  assert.equal(compareRuntimeVectors(a, near).passesDeclaredTolerance, true); assert.equal(compareRuntimeVectors(a, far).passesDeclaredTolerance, false);
  assert.equal(compareRuntimeVectors(a, a).imagePipelineValidated, false); assert.throws(() => compareRuntimeVectors(a, Array(1024).fill(0)));
  const g = mapGuide({ imageWidth: 1000, imageHeight: 500, previewWidth: 500, previewHeight: 500, rotation: 0, mirrored: false });
  assert.deepEqual(g.effectiveCrop, { left: 280, top: 30, right: 720, bottom: 470 });
  for (const rotation of [0, 90, 180, 270] as const) for (const mirrored of [false, true]) {
    const r = mapGuide({ imageWidth: 37, imageHeight: 23, previewWidth: 230, previewHeight: 370, rotation, mirrored });
    assert.ok(r.encodedCrop.left >= 0 && r.encodedCrop.right <= 37 && r.encodedCrop.top >= 0 && r.encodedCrop.bottom <= 23);
  }
  const box = letterboxGeometry(37, 23); assert.equal(box.left + box.resizedWidth + box.rightPadding, 224);
  assert.ok(box.bottomPadding - box.top >= 0 && box.bottomPadding - box.top <= 1);
});

test('actual generated CLI boundaries and Pillow/runtime probe construction', () => {
  const root = resolve(retrievalLab, 'runs/phone-experiment/p0-preparation-20261011-a1/tests/' + randomUUID()); mkdirSync(root, { recursive: true });
  const receipts: unknown[] = [];
  function run(args: string[], expected: number) {
    const child = spawnSync(process.execPath, [resolve(retrievalLab, 'src/phoneExperimentCli.ts'), ...args], { encoding: 'utf8', timeout: 30000 });
    receipts.push({ argv: args, exit: child.status, stdout: child.stdout, stderr: child.stderr }); assert.equal(child.status, expected, child.stdout + child.stderr);
  }
  run(['sample', '--scenario', 'clean', '--out', resolve(root, 'clean')], 0);
  for (const name of ['missing-arm', 'failed-frame', 'late-frame', 'cancelled']) run(['sample', '--scenario', name, '--out', resolve(root, name)], 2);
  run(['evaluate', '--manifest', resolve(root, 'clean/manifest.json'), '--bundle', resolve(root, 'clean/bundle.json'), '--out', resolve(root, 'replay')], 0);
  const before = sha256(readFileSync(resolve(root, 'clean/manifest.json')));
  run(['sample', '--scenario', 'clean', '--out', resolve(root, 'clean')], 1); assert.equal(sha256(readFileSync(resolve(root, 'clean/manifest.json'))), before);
  const target = resolve(root, 'junction-target'); mkdirSync(target); const link = resolve(root, 'junction'); symlinkSync(target, link, 'junction');
  run(['sample', '--scenario', 'clean', '--out', link], 1); assert.ok(!existsSync(resolve(target, 'manifest.json')));
  run(['sample', '--scenario', 'clean', '--out', resolve(retrievalLab, 'forbidden-phone-output')], 1);
  const invalid = resolve(root, 'invalid-manifest.json'); const bad = JSON.parse(readFileSync(resolve(root, 'clean/manifest.json'), 'utf8')); bad.kind = 'PRIVATE_PHONE_EXPERIMENT'; writeFileSync(invalid, JSON.stringify(bad));
  run(['evaluate', '--manifest', invalid, '--bundle', resolve(root, 'clean/bundle.json'), '--out', resolve(root, 'invalid')], 1);
  const py = resolve(retrievalLab, 'runs/exploratory/e01-e03-20261004/venv/Scripts/python.exe');
  const child = spawnSync(py, ['-B', resolve(retrievalLab, 'fixtures/phone-experiment/image_probes.py'), '--out', resolve(root, 'image-oracles')], { encoding: 'utf8', timeout: 30000 });
  receipts.push({ argv: ['python', '-B', 'image_probes.py'], exit: child.status, stdout: child.stdout, stderr: child.stderr });
  assert.equal(child.status, 0, child.stdout + child.stderr);
  const probes = JSON.parse(readFileSync(resolve(root, 'image-oracles/probe-manifest.json'), 'utf8'));
  assert.equal(probes.images.length, 8); assert.equal(probes.runtimeInputs.length, 3); assert.equal(probes.nativeValidated, false); assert.equal(probes.modelExecuted, false);
  for (const tensor of probes.runtimeInputs) { const raw = readFileSync(resolve(root, 'image-oracles', tensor.path)); assert.equal(raw.length, 602112); assert.equal(sha256(raw), tensor.sha256); }
  for (const image of probes.images) {
    assert.equal(image.tensorBytes, 602112); assert.equal(sha256(readFileSync(resolve(root, 'image-oracles', image.id + '.crop.f32le'))), image.cropTensorSha256);
  }
  writeFileSync(resolve(root, 'receipts.json'), JSON.stringify(receipts, null, 2) + '\n', { flag: 'wx' }); console.log('PHONE_TEST_ROOT=' + root);
});
