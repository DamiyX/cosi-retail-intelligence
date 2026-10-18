import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { importDataset } from '../src/importer.ts';
import { defaultConfig } from '../src/schema.ts';
import { calibrateCandidate } from '../src/candidateCalibration.ts';
import { holdoutCandidateConfig } from '../src/candidateFreeze.ts';
import { compareCandidates } from '../src/comparison.ts';
import { sha256 } from '../src/provenance.ts';

const root = resolve(__dirname, '../fixtures');
const read = (name: string) => JSON.parse(readFileSync(resolve(root, 'r2', name + '.json'), 'utf8'));
const imported = () => importDataset(resolve(root, 'dataset.json'), root);
function calibration() {
  const { dataset, manifestHash } = imported();
  const candidate = read('toy-a');
  return { dataset, manifestHash, candidate, ...calibrateCandidate(dataset, manifestHash, candidate, read('toy-a-calibration'),
    [defaultConfig, { ...defaultConfig, strongAt: 0.99 }], 0, 'calibration') };
}
test('explicit calibration-only choice binds candidate, artifact, preprocessing, dataset and all query inventory', () => {
  const { dataset, manifestHash, candidate, sweeps, frozen } = calibration();
  expect(frozen.sourceSplit).toBe('calibration');
  expect(frozen.calibrationQueries).toHaveLength(3); expect(frozen.holdoutQueries).toHaveLength(8);
  expect(sweeps.every(s => s.results?.length === 3 && s.results.every(r => r.split === 'calibration'))).toBe(true);
  expect(holdoutCandidateConfig(frozen, dataset, manifestHash, candidate)).toEqual(defaultConfig);
  const report = compareCandidates(dataset, manifestHash, 'holdout', [{ candidate, bundle: read('toy-a-holdout'), config: defaultConfig, frozen }]);
  expect(report.candidates[0].metrics?.populations.failed).toBe(1);
});
test.each(['development', 'holdout'] as const)('rejects %s sweep/choice before reading any bundle', split => {
  const { dataset, manifestHash } = imported();
  expect(() => calibrateCandidate(dataset, manifestHash, null, null, null, 0, split)).toThrow('cannot use another split');
});
test.each([-1, 0.5, 2, NaN])('rejects explicit invalid choice %s', choice => {
  const { dataset, manifestHash } = imported();
  expect(() => calibrateCandidate(dataset, manifestHash, read('toy-a'), read('toy-a-calibration'), [defaultConfig], choice, 'calibration')).toThrow('Explicit calibration');
});
test.each(['candidate', 'artifact', 'preprocessing', 'space', 'dimension', 'review'])('rejects %s drift', field => {
  const { dataset, manifestHash, candidate, frozen } = calibration();
  if (field === 'candidate') candidate.candidateId = 'other';
  if (field === 'artifact') candidate.artifact.sha256 = sha256('different actual artifact');
  if (field === 'preprocessing') { candidate.preprocessing.descriptor += ' changed'; candidate.preprocessing.sha256 = sha256(candidate.preprocessing.descriptor); }
  if (field === 'space') candidate.embedding.space = 'other';
  if (field === 'dimension') candidate.embedding.dimension++;
  if (field === 'review') candidate.review.exactBindingReference = 'different review scope';
  expect(() => holdoutCandidateConfig(frozen, dataset, manifestHash, candidate)).toThrow('freeze changed');
});
test.each(['config', 'configHash', 'calibration', 'holdout', 'calibrationBundleHash', 'datasetHash', 'content', 'sourceSplit', 'selection', 'seal'])('rejects frozen %s drift', field => {
  const { dataset, manifestHash, candidate, frozen } = calibration();
  if (field === 'config') frozen.config.strongAt = 0.99;
  if (field === 'configHash') frozen.configHash = '0'.repeat(64);
  if (field === 'calibration') frozen.calibrationQueries[0].entryId = 'hold-a';
  if (field === 'holdout') frozen.holdoutQueries.pop();
  if (field === 'calibrationBundleHash') frozen.calibrationBundleHash = '0'.repeat(64);
  if (field === 'datasetHash') frozen.datasetHash = '0'.repeat(64);
  if (field === 'content') dataset.version = 'other';
  if (field === 'sourceSplit') (frozen as unknown as { sourceSplit: string }).sourceSplit = 'holdout';
  if (field === 'selection') (frozen as unknown as { selection: string }).selection = 'automatic-winner';
  if (field === 'seal') frozen.sealHash = '0'.repeat(64);
  expect(() => holdoutCandidateConfig(frozen, dataset, manifestHash, candidate)).toThrow();
});
test('rejects unfrozen, cross-candidate, overridden config and frozen non-holdout runs', () => {
  const { dataset, manifestHash, candidate, frozen } = calibration();
  const input = { candidate, bundle: read('toy-a-holdout'), config: defaultConfig };
  expect(() => compareCandidates(dataset, manifestHash, 'holdout', [input])).toThrow('requires a candidate-bound freeze');
  expect(() => compareCandidates(dataset, manifestHash, 'holdout', [{ ...input, frozen, candidate: read('toy-b'), bundle: read('toy-b-holdout') }])).toThrow('freeze changed');
  expect(() => compareCandidates(dataset, manifestHash, 'holdout', [{ ...input, frozen, config: { ...defaultConfig, strongAt: 0.99 } }])).toThrow('cannot be overridden');
  expect(() => compareCandidates(dataset, manifestHash, 'calibration', [{ ...input, frozen }])).toThrow('for holdout only');
});
test('failed reference, empty calibration/holdout and invalid config cannot be frozen', () => {
  const { dataset, manifestHash } = imported(); const bundle = read('toy-a-calibration');
  bundle.outputs[0].output = { kind: 'failure', code: 'ADAPTER_ERROR' };
  expect(() => calibrateCandidate(dataset, manifestHash, read('toy-a'), bundle, [defaultConfig], 0, 'calibration')).toThrow('failed gallery');
  expect(() => calibrateCandidate(dataset, manifestHash, read('toy-a'), read('toy-a-calibration'), [{ ...defaultConfig, strongAt: 0.1 }], 0, 'calibration')).toThrow();
  dataset.entries = dataset.entries.filter(e => e.split !== 'holdout');
  expect(() => calibrateCandidate(dataset, manifestHash, read('toy-a'), read('toy-a-calibration'), [defaultConfig], 0, 'calibration')).toThrow('nonempty holdout');
  dataset.entries = dataset.entries.filter(e => e.split !== 'calibration');
  expect(() => calibrateCandidate(dataset, manifestHash, read('toy-a'), read('toy-a-calibration'), [defaultConfig], 0, 'calibration')).toThrow('No queries');
});
test('query failures stay measured during calibration and do not become UNKNOWN', () => {
  const { dataset, manifestHash } = imported(); const bundle = read('toy-a-calibration');
  bundle.outputs[bundle.outputs.length - 1].output = { kind: 'failure', code: 'TIMEOUT' };
  const report = calibrateCandidate(dataset, manifestHash, read('toy-a'), bundle, [defaultConfig], 0, 'calibration');
  expect(report.sweeps[0].metrics?.populations).toMatchObject({ total: 3, failed: 1 });
  expect(report.sweeps[0].metrics?.failureCodes).toEqual({ TIMEOUT: 1 });
});
