import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { importDataset, validateDataset } from '../src/importer.ts';
import { compareCandidates, comparisonSummary } from '../src/comparison.ts';
import { defaultConfig } from '../src/schema.ts';
import { experiment } from '../src/experiment.ts';
import { metrics } from '../src/metrics.ts';
import { calibrateCandidate } from '../src/candidateCalibration.ts';
import { sha256 } from '../src/provenance.ts';
import { candidateIdentity, validateCandidate } from '../src/precomputed.ts';

const fixtures = resolve(__dirname, '../fixtures');
const read = (name: string) => JSON.parse(readFileSync(resolve(fixtures, 'r2', name + '.json'), 'utf8'));
const imported = () => importDataset(resolve(fixtures, 'dataset.json'), fixtures);
const input = (letter: string, split = 'holdout') => {
  const { dataset, manifestHash } = imported();
  return { candidate: read('toy-' + letter), bundle: read('toy-' + letter + '-' + split), config: defaultConfig,
    frozen: calibrateCandidate(dataset, manifestHash, read('toy-' + letter), read('toy-' + letter + '-calibration'), [defaultConfig], 0, 'calibration').frozen };
};
test('same query population, own vector spaces and corrected hand-count metrics match R0', () => {
  const { dataset, manifestHash } = imported();
  const report = compareCandidates(dataset, manifestHash, 'holdout', [input('a'), input('b')]);
  expect(report.selectedQueryCount).toBe(8);
  const original = metrics(experiment(dataset, defaultConfig, 'holdout'));
  for (const result of report.candidates) {
    expect(result.metrics?.rates).toEqual(original.rates);
    expect(result.metrics?.packageLabels).toEqual(original.packageLabels);
    expect(result.metrics?.rates.knownProductTop1Retrieval).toMatchObject({ numerator: 4, denominator: 6 });
    expect(result.metrics?.rates.unknownFalseStrong).toMatchObject({ numerator: 1, denominator: 2 });
    expect(result.metrics?.rates.strongJointPrecision).toMatchObject({ numerator: 2, denominator: 4 });
    expect(result.metrics?.rates.knownSimulatedDisplayRecovery).toMatchObject({ numerator: 5, denominator: 6 });
    expect(result.metrics?.populations.failed).toBe(1);
    expect(result.results?.map(r => r.queryId)).toEqual(report.queryInventory.map(q => q.entryId));
  }
  expect(report.winner).toBeNull(); expect(report.realBenchmarkAccepted).toBe(false);
  const summary = comparisonSummary(report);
  expect(summary).toContain('50.00% (1/2)');
  expect(summary).toContain('NO encoder/Android/camera timing');
  expect(summary).toContain('DOES NOT execute an encoder');
  expect(JSON.stringify(report)).not.toContain('"values":');
  expect(JSON.stringify(report)).not.toContain(fixtures);
});
test('failed reference blocks entire gallery without dropping it or fabricating metrics', () => {
  const { dataset, manifestHash } = imported(); const candidate = input('a');
  candidate.bundle.outputs[0].output = { kind: 'failure', code: 'TIMEOUT' };
  const report = compareCandidates(dataset, manifestHash, 'holdout', [candidate, input('b')]);
  expect(report.candidates[0]).toMatchObject({ status: 'SETUP_FAILURE', setupCode: 'REFERENCE_ENCODING_FAILURE', metrics: null, results: null,
    queryAccounting: { selected: 8, evaluated: 0, blockedBySetup: 8 }, referenceFailures: [{ entryId: 'ref-a', code: 'TIMEOUT' }] });
  expect(report.candidates[0].queryAccounting.reportedQueryFailures).toHaveLength(1);
  expect(report.candidates[1].results).toHaveLength(8);
  expect(comparisonSummary(report)).toContain('metrics N/A, queries NOT evaluated');
});
test.each([0, 4])('rejects %i candidates', count => {
  const { dataset, manifestHash } = imported();
  expect(() => compareCandidates(dataset, manifestHash, 'holdout', Array.from({ length: count }, () => input('a')))).toThrow('one to three');
});
test('rejects duplicate candidates, another split, manifest and empty population', () => {
  const { dataset, manifestHash } = imported();
  expect(() => compareCandidates(dataset, manifestHash, 'holdout', [input('a'), input('a')])).toThrow('distinct');
  expect(() => compareCandidates(dataset, manifestHash, 'holdout', [input('a', 'development')])).toThrow('binding changed');
  expect(() => compareCandidates(dataset, '0'.repeat(64), 'holdout', [input('a')])).toThrow('freeze changed');
  dataset.entries = dataset.entries.filter(e => e.split !== 'holdout');
  expect(() => compareCandidates(dataset, manifestHash, 'holdout', [input('a')])).toThrow('No queries');
});
test('comparison preserves missing-package joint N/A and wrong-STRONG raw/top3 display distinction', () => {
  const { dataset } = imported(); const bundle = read('toy-a-development');
  dataset.entries = dataset.entries.filter(e => e.role === 'reference' || e.id === 'q-a');
  bundle.outputs = bundle.outputs.filter((o: { entryId: string }) => dataset.entries.some(e => e.id === o.entryId));
  dataset.entries.find(e => e.id === 'q-a')!.packageId = null;
  let valid = validateDataset(dataset, fixtures);
  bundle.dataset.manifestSha256 = sha256(JSON.stringify(valid));
  let report = compareCandidates(valid, bundle.dataset.manifestSha256, 'development', [{ candidate: read('toy-a'), bundle, config: defaultConfig }]);
  expect(report.candidates[0].metrics?.rates.strongJointPrecision).toEqual({ numerator: 0, denominator: 0, value: null });
  expect(report.candidates[0].metrics?.packageLabels.strongMissing).toBe(1);
  const truth = dataset.entries.find(e => e.id === 'q-a')!;
  truth.productId = 'b'; truth.packageId = 'single-b'; valid = validateDataset(dataset, fixtures);
  bundle.dataset.manifestSha256 = sha256(JSON.stringify(valid));
  report = compareCandidates(valid, bundle.dataset.manifestSha256, 'development', [{ candidate: read('toy-a'), bundle, config: defaultConfig }]);
  expect(report.candidates[0].results?.[0].outcome.status).toBe('STRONG');
  expect(report.candidates[0].metrics?.rates.knownProductTop3Retrieval.value).toBe(1);
  expect(report.candidates[0].metrics?.rates.knownSimulatedDisplayRecovery.value).toBe(0);
});
test('three candidates accepted, with the third vector space explicitly rebound', () => {
  const { dataset, manifestHash } = imported();
  const third = { candidate: read('toy-a'), bundle: read('toy-a-development'), config: defaultConfig };
  third.candidate.candidateId = 'authored-toy-c'; third.candidate.embedding.space = 'toy-c-v1';
  third.bundle.candidate.candidateId = 'authored-toy-c'; third.bundle.candidate.space = 'toy-c-v1';
  third.bundle.candidate.declarationSha256 = candidateIdentity(validateCandidate(third.candidate));
  for (const output of third.bundle.outputs) if (output.output.kind === 'vector') output.output.space = 'toy-c-v1';
  const first = { candidate: read('toy-a'), bundle: read('toy-a-development'), config: defaultConfig };
  const second = { candidate: read('toy-b'), bundle: read('toy-b-development'), config: defaultConfig };
  expect(compareCandidates(dataset, manifestHash, 'development', [first, second, third]).candidates).toHaveLength(3);
});
