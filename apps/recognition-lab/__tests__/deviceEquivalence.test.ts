import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { importDataset } from '../src/importer.ts';
import { validateBenchmark } from '../src/deviceBenchmark.ts';
import { equivalenceReport } from '../src/deviceEquivalence.ts';
import { sha256 } from '../src/provenance.ts';
const fixtures = resolve(__dirname, '../fixtures');
const load = (name: string) => JSON.parse(readFileSync(resolve(fixtures, name + '.json'), 'utf8'));
const imported = importDataset(resolve(fixtures, 'dataset.json'), fixtures);
function report(input = load('r3/paired-equivalence'), benchmarkInput = load('r3/paired-benchmark'), reference = load('r2/toy-a-development')) {
  const candidate = load('r2/toy-a');
  const benchmark = validateBenchmark(imported.dataset, imported.manifestHash, candidate, load('r3/target'), benchmarkInput);
  return equivalenceReport(imported.dataset, imported.manifestHash, candidate, benchmark, reference, input);
}
test('same recorded input outputs agree after central normalization without inference claim', () => {
  const r = report();
  expect(r.counts).toEqual({ inventoried: 8, compared: 8, withinTolerance: 8, drift: 0, failed: 0, referenceFailures: 0, nativeFailures: 0 });
  expect(r.maxima.normalizedError).toBe(0); expect(r.realExportCorrectnessAccepted).toBe(false);
  const input = load('r3/paired-equivalence'); input.outputs[0].output.values = [Number.MAX_VALUE, 0, 0];
  expect(report(input).counts.withinTolerance).toBe(8);
  expect(JSON.stringify(r)).not.toContain('values');
});
test('orthogonal drift violates explicit experiment tolerances and hand-counted maxima', () => {
  const r = report(load('r3/drift'));
  expect(r.counts).toMatchObject({ inventoried: 8, compared: 8, withinTolerance: 7, drift: 1 });
  expect(r.maxima).toEqual({ normalizedError: 1, cosineDifference: 1 });
  expect(r.experiment).toMatchObject({ maxNormalizedError: 0.000001, maxCosineDifference: 0.000001 });
});
test('reference/native failures stay visible in denominator including both-side failures and all-failed null maxima', () => {
  const input = load('r3/equivalence'); input.outputs[0].output = { kind: 'failure', code: 'CRASH' };
  input.outputs.find((o: { entryId: string }) => o.entryId === 'q-error').output = { kind: 'failure', code: 'TIMEOUT' };
  const r = report(input, load('r3/benchmark'));
  expect(r.counts).toMatchObject({ inventoried: 9, compared: 7, failed: 2, referenceFailures: 1, nativeFailures: 2 });
  const reference = load('r2/toy-a-development'); reference.outputs.forEach((o: { output: unknown }) => { o.output = { kind: 'failure', code: 'TIMEOUT' }; });
  input.referenceBundleSha256 = sha256(JSON.stringify(reference));
  const all = report(input, load('r3/benchmark'), reference);
  expect(all.counts).toMatchObject({ inventoried: 9, compared: 0, failed: 9 });
  expect(all.maxima).toEqual({ normalizedError: null, cosineDifference: null });
});
test.each(['missing', 'duplicate', 'orphan', 'stale-asset', 'zero', 'dimension', 'space', 'nan', 'infinity', 'tolerance-negative', 'tolerance-infinite', 'target', 'reference', 'candidate', 'preprocessing', 'dataset', 'record', 'split', 'undeclared-tolerance'])('rejects %s pair data rather than intersecting successful outputs', kind => {
  const input = load('r3/paired-equivalence');
  if (kind === 'missing') input.outputs.pop();
  if (kind === 'duplicate') input.outputs.push(input.outputs[0]);
  if (kind === 'orphan') input.outputs[0].entryId = 'foreign';
  if (kind === 'stale-asset') input.outputs[0].assetSha256 = '0'.repeat(64);
  if (kind === 'zero') input.outputs[0].output.values = [0, 0, 0];
  if (kind === 'dimension') input.outputs[0].output.values.pop();
  if (kind === 'space') input.outputs[0].output.space = 'foreign';
  if (kind === 'nan') input.outputs[0].output.values[0] = NaN;
  if (kind === 'infinity') input.outputs[0].output.values[0] = Infinity;
  if (kind === 'tolerance-negative') input.experiment.maxNormalizedError = -1;
  if (kind === 'tolerance-infinite') input.experiment.maxCosineDifference = Infinity;
  if (kind === 'target') input.targetDeclarationSha256 = '0'.repeat(64);
  if (kind === 'reference') input.referenceBundleSha256 = '0'.repeat(64);
  if (kind === 'candidate') input.candidate.declarationSha256 = '0'.repeat(64);
  if (kind === 'preprocessing') input.candidate.preprocessingVersion = 'foreign';
  if (kind === 'dataset') input.dataset.manifestSha256 = '0'.repeat(64);
  if (kind === 'record') input.benchmarkRecordId = 'foreign';
  if (kind === 'split') input.split = 'holdout';
  if (kind === 'undeclared-tolerance') delete input.experiment;
  expect(() => report(input)).toThrow();
});
test('explicit boundary and just-outside tolerances discriminate recorded drift', () => {
  const input = load('r3/drift'); input.experiment.maxNormalizedError = input.experiment.maxCosineDifference = 1;
  expect(report(input).counts.withinTolerance).toBe(8);
  input.experiment.maxNormalizedError = 0.999999; expect(report(input).counts.drift).toBe(1);
});
