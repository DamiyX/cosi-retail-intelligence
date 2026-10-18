import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { importDataset } from '../src/importer.ts';
import { validateBenchmark, benchmarkReport } from '../src/deviceBenchmark.ts';
import { candidateIdentity, validateCandidate } from '../src/precomputed.ts';
import { sha256 } from '../src/provenance.ts';
const fixtures = resolve(__dirname, '../fixtures');
const load = (name: string) => JSON.parse(readFileSync(resolve(fixtures, name + '.json'), 'utf8'));
const imported = importDataset(resolve(fixtures, 'dataset.json'), fixtures);
function validated(record = load('r3/benchmark'), target = load('r3/target'), candidate = load('r2/toy-a')) {
  return validateBenchmark(imported.dataset, imported.manifestHash, candidate, target, record);
}
test('hand-counted timing stays within stage/phase with supplied label and no native pass', () => {
  const report = benchmarkReport(validated());
  expect(report.counts).toEqual({ attempted: 110, successful: 110, failed: 0, warmupAttempts: 5 });
  expect(report.groups).toHaveLength(15); expect(report.missingCoverage).toEqual([]);
  const warm = report.groups.find(g => g.stage === 'inference' && g.phase === 'warm')!;
  expect(warm.timing).toMatchObject({ samples: 20, median: 10.5, p90: 18, p95: 19 });
  expect(warm.timing.label).toContain('Supplied/unverified');
  expect(report.groups.find(g => g.phase === 'cold')!.timing.p95).toBeNull();
  expect(report.realDeviceBenchmarkAccepted).toBe(false);
  expect(report.target.export.sha256).not.toBe(report.candidate.artifactSha256);
});
test('all attempts/failures/warmups survive and failed timings do not inflate successful counts', () => {
  const record = load('r3/failure');
  record.trials.push({ ...record.trials[0], id: 'warmup-fail', phase: 'warmup', outcome: { kind: 'failure', code: 'CRASH', elapsedMs: 100000 } });
  const report = benchmarkReport(validated(record));
  expect(report.counts).toEqual({ attempted: 112, successful: 110, failed: 2, warmupAttempts: 6 });
  const cold = report.groups.find(g => g.stage === 'startup' && g.phase === 'cold')!;
  expect(cold).toMatchObject({ attempted: 2, successful: 1, failed: 1, failureElapsedMissing: 1, failureCodes: { TIMEOUT: 1 }, timing: { samples: 1, median: 1 } });
  const onlyFail = load('r3/failure'); onlyFail.trials = [onlyFail.trials.at(-1)];
  expect(benchmarkReport(validated(onlyFail)).groups[0].timing.median).toBeNull();
});
test('finite extreme timings retain finite median and ten-success p90 remains separate from failures', () => {
  const r = load('r3/benchmark'); r.trials = r.trials.filter((t: { stage: string; phase: string }) => t.stage === 'inference' && t.phase === 'warm').slice(0, 10);
  r.trials.forEach((t: { outcome: { elapsedMs: number } }) => { t.outcome.elapsedMs = Number.MAX_VALUE; });
  const group = benchmarkReport(validated(r)).groups.find(g => g.stage === 'inference' && g.phase === 'warm')!;
  expect(group.timing).toMatchObject({ median: Number.MAX_VALUE, p90: Number.MAX_VALUE, p95: null, samples: 10 });
});
test('missing observations remain null and coverage incomplete; concerns are separate from measurements', () => {
  const report = benchmarkReport(validated(load('r3/incomplete')));
  expect(report.suppliedObservations.memoryBytes.idle).toBeNull();
  expect(report.missingCoverage).toContain('memoryBytes.idle');
  expect(report.missingCoverage).toContain('offline.firstUseAirplane');
  expect(report.groups.every(g => g.timing.median === null)).toBe(true);
  const record = load('r3/benchmark'); record.observations.offline.firstUseAirplane.value = false;
  record.observations.thermal.value = 'not-observable'; record.observations.sustainedDurationMs.value = 1;
  const incomplete = benchmarkReport(validated(record));
  expect(incomplete.observedConcerns).toContain('offline.firstUseAirplane');
  expect(incomplete.missingCoverage).toContain('thermal-observability');
  expect(incomplete.missingCoverage).toContain('sustained-duration-below-10-minutes');
});
test.each(['declarationSha256', 'artifactSha256', 'preprocessingSha256', 'space', 'dimension', 'candidateId'])('stale candidate %s is rejected', field => {
  const r = load('r3/benchmark'); r.candidate[field] = field === 'dimension' ? 4 : field.endsWith('Sha256') ? '0'.repeat(64) : 'foreign';
  expect(() => validated(r)).toThrow(expect.objectContaining({ code: 'BENCHMARK_BINDING_MISMATCH' }));
});
test.each(['dataset', 'target-hash', 'runtime', 'export', 'foreign-input', 'stale-asset', 'duplicate-input', 'duplicate-trial', 'trial-null', 'trial-foreign', 'negative', 'nonfinite', 'unknown-field', 'serial', 'path', 'missing-method'])('rejects %s record', kind => {
  const r = load('r3/benchmark');
  if (kind === 'dataset') r.dataset.manifestSha256 = '0'.repeat(64);
  if (kind === 'target-hash') r.targetDeclarationSha256 = '0'.repeat(64);
  if (kind === 'runtime') r.target.runtime.version = 'foreign';
  if (kind === 'export') r.target.export.sha256 = '0'.repeat(64);
  if (kind === 'foreign-input') r.inventory[0].entryId = 'foreign';
  if (kind === 'stale-asset') r.inventory[0].assetSha256 = '0'.repeat(64);
  if (kind === 'duplicate-input') r.inventory.push(r.inventory[0]);
  if (kind === 'duplicate-trial') r.trials.push(r.trials[0]);
  if (kind === 'trial-null') r.trials.find((t: { stage: string }) => t.stage === 'inference').input = null;
  if (kind === 'trial-foreign') r.trials[0].input = { entryId: 'foreign', assetSha256: '0'.repeat(64) };
  if (kind === 'negative') r.trials[0].outcome.elapsedMs = -1;
  if (kind === 'nonfinite') r.observations.memoryBytes.idle.value = Infinity;
  if (kind === 'unknown-field') r.approved = true;
  if (kind === 'serial') r.device.serial = 'private';
  if (kind === 'path') r.provenance.collectionReferenceId = 'C:\\private\\photo.jpg';
  if (kind === 'missing-method') delete r.trials[0].methodId;
  expect(() => validated(r)).toThrow();
});
test('schema-only simulated physical record stays reported/unverified even when supplied coverage is full', () => {
  const dataset = structuredClone(imported.dataset); dataset.kind = 'real-capture'; dataset.entries.forEach(e => { delete e.observation; });
  const candidate = load('r2/toy-a'); candidate.kind = 'reviewed-real';
  candidate.licences.code.status = candidate.licences.weights.status = 'reviewed-for-proposed-use'; candidate.runtime.status = 'reviewed-recorded-output';
  const r = load('r3/benchmark'); r.evidenceKind = 'reported-physical-unverified'; r.dataset.kind = dataset.kind;
  r.dataset.manifestSha256 = sha256(JSON.stringify(dataset)); r.candidate.declarationSha256 = candidateIdentity(validateCandidate(candidate));
  r.provenance.recordedAt = '2026-10-02T00:00:00Z';
  const report = benchmarkReport(validateBenchmark(dataset, r.dataset.manifestSha256, candidate, load('r3/target'), r));
  expect(report.evidenceKind).toBe('reported-physical-unverified'); expect(report.realDeviceBenchmarkAccepted).toBe(false);
  r.provenance.recordedAt = null; expect(() => validateBenchmark(dataset, r.dataset.manifestSha256, candidate, load('r3/target'), r)).toThrow();
});
