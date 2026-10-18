import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, symlinkSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const repo = resolve(__dirname, '../../..');
const out = resolve(repo, 'apps/recognition-lab/runs/r2-cli-test');
const fixtures = 'apps/recognition-lab/fixtures/';
const r2 = fixtures + 'r2/';
const common = ['--manifest', fixtures + 'dataset.json', '--dataset-root', fixtures];
const invoke = (args: string[]) => spawnSync(process.execPath, ['apps/recognition-lab/src/comparisonCli.ts', ...args], { cwd: repo, encoding: 'utf8' });
function file(name: string, value: unknown) {
  mkdirSync(out, { recursive: true }); const path = resolve(out, name + '.json');
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n'); return path;
}
const read = (name: string) => JSON.parse(readFileSync(resolve(repo, name), 'utf8'));
const compare = (split: string, inputs: string, location: string) => invoke(['compare', ...common, '--split', split, '--inputs', inputs, '--out', location]);
const calibrate = (letter: string, split = 'calibration', choice = '0', bundle?: string) => invoke(['calibrate', ...common, '--split', split,
  '--candidate', r2 + 'toy-' + letter + '.json', '--bundle', bundle ?? r2 + 'toy-' + letter + '-' + split + '.json',
  '--configs', fixtures + 'configs.json', '--choose', choice, '--out', resolve(out, 'calibration-' + letter)]);
test('actual Node comparison, calibration and candidate-frozen holdout preserve counts, exits and repeatable fields', () => {
  expect(compare('development', r2 + 'inputs-development.json', resolve(out, 'development')).status).toBe(2);
  for (const letter of ['a', 'b']) expect(calibrate(letter).status).toBe(0);
  const inputs = file('holdout-inputs', ['a', 'b'].map(letter => ({ candidate: r2 + 'toy-' + letter + '.json', bundle: r2 + 'toy-' + letter + '-holdout.json',
    frozen: resolve(out, 'calibration-' + letter + '/frozen-candidate.json') })));
  const path = resolve(out, 'holdout');
  expect(compare('holdout', inputs, path).status).toBe(2);
  const first = read(resolve(path, 'comparison.json'));
  expect(compare('holdout', inputs, path).status).toBe(2);
  const second = read(resolve(path, 'comparison.json'));
  for (const report of [first, second]) {
    for (const candidate of report.candidates) {
      delete candidate.metrics.timing;
      candidate.results.forEach((r: { elapsedMs?: number }) => { delete r.elapsedMs; });
    }
  }
  expect(second).toEqual(first);
  expect(first.label).toContain('SYNTHETIC TOOLING-ONLY');
  expect(first.provenance.commit).toMatch(/^[0-9a-f]{40}$/);
  expect(first.candidates.every((c: { metrics: { populations: { total: number; failed: number } } }) => c.metrics.populations.total === 8 && c.metrics.populations.failed === 1)).toBe(true);
  expect(first.winner).toBeNull();
}, 60000);
test('actual CLI rejects holdout tuning, absent freeze, wrong candidate freeze, config override and bad choices', () => {
  expect(calibrate('a', 'holdout').status).toBe(1);
  expect(calibrate('a', 'calibration', '-1').status).toBe(1);
  const input = { candidate: r2 + 'toy-a.json', bundle: r2 + 'toy-a-holdout.json', config: r2 + 'config.json' };
  expect(compare('holdout', file('unfrozen', [input]), resolve(out, 'rejected')).status).toBe(1);
  expect(calibrate('b').status).toBe(0);
  expect(compare('holdout', file('cross-candidate', [{ candidate: input.candidate, bundle: input.bundle,
    frozen: resolve(out, 'calibration-b/frozen-candidate.json') }]), resolve(out, 'rejected')).stderr).toContain('FROZEN_CANDIDATE_MISMATCH');
  expect(compare('holdout', file('override', [{ ...input, frozen: resolve(out, 'calibration-b/frozen-candidate.json') }]), resolve(out, 'rejected')).status).toBe(1);
}, 60000);
test('actual setup failure exits2 with null metrics and calibration query failure exits2 while preserving its denominator', () => {
  const bundle = read(r2 + 'toy-a-development.json'); bundle.outputs[0].output = { kind: 'failure', code: 'TIMEOUT' };
  const inputs = file('setup-input', [{ candidate: r2 + 'toy-a.json', bundle: file('reference-failure', bundle), config: r2 + 'config.json' }]);
  const path = resolve(out, 'setup'); expect(compare('development', inputs, path).status).toBe(2);
  const report = read(resolve(path, 'comparison.json'));
  expect(report.candidates[0]).toMatchObject({ status: 'SETUP_FAILURE', results: null, metrics: null, queryAccounting: { selected: 3, evaluated: 0, blockedBySetup: 3 } });
  const calibrationBundle = read(r2 + 'toy-a-calibration.json'); calibrationBundle.outputs.at(-1).output = { kind: 'failure', code: 'TIMEOUT' };
  expect(calibrate('a', 'calibration', '0', file('query-failure', calibrationBundle)).status).toBe(2);
  expect(read(resolve(out, 'calibration-a/calibration.json')).sweeps[0].metrics.populations).toMatchObject({ total: 3, failed: 1 });
}, 60000);
test('actual CLI rejects output escape including junctions, malformed inputs and stale assets without leaking paths', () => {
  const rejected = compare('development', r2 + 'inputs-development.json', resolve(repo, 'apps/recognition-lab/fixtures/never-write'));
  expect(rejected.status).toBe(1); expect(rejected.stderr).toContain('OUTPUT_OUTSIDE_RUNS');
  expect(existsSync(resolve(repo, 'apps/recognition-lab/fixtures/never-write'))).toBe(false);
  mkdirSync(out, { recursive: true }); const junction = resolve(out, 'escape');
  if (!existsSync(junction)) symlinkSync(resolve(repo, fixtures), junction, 'junction');
  expect(compare('development', r2 + 'inputs-development.json', resolve(junction, 'never-write')).status).toBe(1);
  const bundle = read(r2 + 'toy-a-development.json'); bundle.outputs[0].assetSha256 = '0'.repeat(64);
  const stale = compare('development', file('stale-input', [{ candidate: r2 + 'toy-a.json', bundle: file('stale-bundle', bundle), config: r2 + 'config.json' }]), resolve(out, 'stale'));
  expect(stale.status).toBe(1); expect(stale.stderr).toContain('OUTPUT_ASSET_MISMATCH');
  expect(stale.stderr).not.toContain(repo);
  expect(compare('development', file('empty-input', []), resolve(out, 'empty')).status).toBe(1);
  expect(compare('development', file('extra-field', [{ candidate: r2 + 'toy-a.json', bundle: r2 + 'toy-a-development.json', config: r2 + 'config.json', shell: 'arbitrary-command' }]), resolve(out, 'extra')).status).toBe(1);
}, 60000);
