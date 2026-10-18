import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../../..');
const lab = resolve(root, 'apps/recognition-lab');
const run = (out: string) => spawnSync(process.execPath, ['apps/recognition-lab/src/cli.ts', 'run',
  '--manifest', 'apps/recognition-lab/fixtures/dataset.json', '--dataset-root', 'apps/recognition-lab/fixtures',
  '--split', 'development', '--out', out], { cwd: root, encoding: 'utf8' });
test('real Node CLI reports failures and reproduces all deterministic fields', () => {
  const out = resolve(lab, 'runs/cli-test'); mkdirSync(out, { recursive: true });
  expect(run(out).status).toBe(2);
  const first = JSON.parse(readFileSync(resolve(out, 'results.json'), 'utf8'));
  expect(run(out).status).toBe(2);
  const second = JSON.parse(readFileSync(resolve(out, 'results.json'), 'utf8'));
  for (const result of [first, second]) {
    delete result.provenance.startedAt;
    result.results.forEach((r: { elapsedMs?: number }) => { delete r.elapsedMs; });
    delete result.metrics.timing;
  }
  expect(second).toEqual(first);
  expect(first.provenance.commit).toMatch(/^[0-9a-f]{40}$/);
  expect(first.provenance.diffFingerprint).toMatch(/^[0-9a-f]{64}$/);
  expect(first.provenance.label).toContain('NOT RECOGNITION ACCURACY');
  expect(readFileSync(resolve(out, 'summary.md'), 'utf8')).toContain('"failed":1');
});
test('invalid CLI input is a failed run with sanitized diagnostics', () => {
  const result = spawnSync(process.execPath, ['apps/recognition-lab/src/cli.ts', 'run',
    '--manifest', 'private/nonexistent.json', '--out', 'apps/recognition-lab/runs/bad'], { cwd: root, encoding: 'utf8' });
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('FAILED_RUN');
  expect(result.stderr).not.toContain(root);
});
test('actual CLI freezes calibration, runs holdout and rejects holdout sweep or unfrozen run', () => {
  const out = resolve(lab, 'runs/cli-calibration');
  const common = ['--manifest', 'apps/recognition-lab/fixtures/dataset.json', '--dataset-root', 'apps/recognition-lab/fixtures'];
  const invoke = (args: string[]) => spawnSync(process.execPath, ['apps/recognition-lab/src/cli.ts', ...args], { cwd: root, encoding: 'utf8' });
  expect(invoke(['sweep', ...common, '--split', 'calibration', '--configs', 'apps/recognition-lab/fixtures/configs.json', '--choose', '0', '--out', out]).status).toBe(0);
  const holdout = invoke(['run', ...common, '--split', 'holdout', '--frozen', resolve(out, 'frozen-config.json'), '--out', resolve(lab, 'runs/cli-holdout')]);
  expect(holdout.status).toBe(2);
  expect(holdout.stdout).toContain('50.00% (1/2)');
  const rejected = invoke(['sweep', ...common, '--split', 'holdout', '--configs', 'apps/recognition-lab/fixtures/configs.json', '--choose', '0', '--out', out]);
  expect(rejected.status).toBe(1); expect(rejected.stderr).toContain('CALIBRATION_ONLY');
  const unfrozen = invoke(['run', ...common, '--split', 'holdout', '--out', out]);
  expect(unfrozen.status).toBe(1); expect(unfrozen.stderr).toContain('CONFIG_NOT_FROZEN');
}, 30000);
