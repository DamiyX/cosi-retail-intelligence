import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const repo = resolve(__dirname, '../../..');
const fixtures = 'apps/recognition-lab/fixtures/';
const out = resolve(repo, 'apps/recognition-lab/runs/r3-cli-test');
const read = (path: string) => JSON.parse(readFileSync(resolve(repo, path), 'utf8'));
const base = ['analyze', '--manifest', fixtures + 'dataset.json', '--dataset-root', fixtures,
  '--candidate', fixtures + 'r2/toy-a.json', '--target', fixtures + 'r3/target.json'];
const invoke = (record: string, destination: string, extra: string[] = []) => spawnSync(process.execPath,
  ['apps/recognition-lab/src/deviceBenchmarkCli.ts', ...base, '--record', record, '--out', destination, ...extra], { cwd: repo, encoding: 'utf8' });
const pairs = (name = 'paired-equivalence') => ['--reference-bundle', fixtures + 'r2/toy-a-development.json', '--pairs', fixtures + 'r3/' + name + '.json'];
function file(name: string, value: unknown) {
  mkdirSync(out, { recursive: true }); const path = resolve(out, name + '.json'); writeFileSync(path, JSON.stringify(value)); return path;
}
test('actual valid CLI exits0 with reproducible reports and no vectors/private paths/native pass', () => {
  const destination = resolve(out, 'valid'); const record = fixtures + 'r3/paired-benchmark.json';
  const first = invoke(record, destination, pairs()); expect(first.status).toBe(0);
  const bytes = readFileSync(resolve(destination, 'device-benchmark.json'), 'utf8');
  const md = readFileSync(resolve(destination, 'device-benchmark.md'), 'utf8');
  expect(invoke(record, destination, pairs()).status).toBe(0);
  expect(readFileSync(resolve(destination, 'device-benchmark.json'), 'utf8')).toBe(bytes);
  expect(readFileSync(resolve(destination, 'device-benchmark.md'), 'utf8')).toBe(md);
  const report = JSON.parse(bytes); expect(report.equivalence.counts.inventoried).toBe(8);
  expect(report.tooling).toMatchObject({ encoderExecuted: false, deviceWorkMeasured: false, nativePass: false });
  expect(bytes + md + first.stdout).not.toContain(repo); expect(bytes + md).not.toContain('"values"');
});
test('actual incomplete/no-pairs/failure/drift preserve truth and explicit exits2', () => {
  for (const [name, extra] of [['incomplete', []], ['benchmark', []], ['failure', []], ['paired-benchmark', pairs('drift')], ['benchmark', pairs('equivalence')]] as [string, string[]][]) {
    const destination = resolve(out, name + '-' + extra.length); expect(invoke(fixtures + 'r3/' + name + '.json', destination, extra).status).toBe(2);
    const r = read(resolve(destination, 'device-benchmark.json')); expect(r.tooling.nativePass).toBe(false);
    if (name === 'failure') expect(r.benchmark.counts).toMatchObject({ attempted: 111, successful: 110, failed: 1 });
    if (name === 'incomplete') expect(r.benchmark.suppliedObservations.memoryBytes.idle).toBeNull();
    if (name === 'benchmark' && extra.length) expect(r.equivalence.counts).toMatchObject({ inventoried: 9, compared: 8, failed: 1 });
  }
}, 60000);
test('actual malformed/stale/missing-pair/extra-flag input exits1 with sanitized failures', () => {
  const record = read(fixtures + 'r3/paired-benchmark.json'); record.inventory[0].assetSha256 = '0'.repeat(64);
  const stale = invoke(file('stale', record), resolve(out, 'reject'), pairs());
  expect(stale.status).toBe(1); expect(stale.stderr).toContain('INPUT_BINDING_MISMATCH');
  expect(stale.stderr).not.toContain(repo);
  const pair = read(fixtures + 'r3/paired-equivalence.json'); pair.outputs.pop();
  const missing = invoke(fixtures + 'r3/paired-benchmark.json', resolve(out, 'reject'), ['--reference-bundle', fixtures + 'r2/toy-a-development.json', '--pairs', file('missing', pair)]);
  expect(missing.status).toBe(1); expect(missing.stderr).toContain('MISSING_PAIR');
  const malformed = resolve(out, 'malformed.json'); writeFileSync(malformed, '{not-json');
  expect(invoke(malformed, resolve(out, 'reject')).status).toBe(1);
  expect(invoke(fixtures + 'r3/paired-benchmark.json', resolve(out, 'reject'), ['--execute', 'anything']).status).toBe(1);
  expect(existsSync(resolve(out, 'reject'))).toBe(false);
}, 60000);
test('actual CLI blocks lexical, directory-junction and output-file symlink escapes before writes', () => {
  const record = fixtures + 'r3/paired-benchmark.json'; const protectedFile = resolve(out, 'protected.txt');
  mkdirSync(out, { recursive: true }); writeFileSync(protectedFile, 'DO NOT CHANGE');
  const junction = resolve(out, 'escape'); if (!existsSync(junction)) symlinkSync(resolve(repo, fixtures), junction, 'junction');
  for (const destination of [resolve(repo, fixtures, 'r3-never-write'), resolve(junction, 'r3-never-write')]) {
    const result = invoke(record, destination, pairs()); expect(result.status).toBe(1); expect(result.stderr).toContain('OUTPUT_OUTSIDE_RUNS');
  }
  // A directory link also exercises existing report targets without requiring
  // Windows Developer Mode's file-symlink privilege.
  const fileOutput = resolve(out, 'file-escape'); mkdirSync(fileOutput, { recursive: true });
  const linked = resolve(fileOutput, 'device-benchmark.json'); if (!existsSync(linked)) symlinkSync(resolve(repo, fixtures), linked, 'junction');
  const result = invoke(record, fileOutput, pairs()); expect(result.status).toBe(1); expect(result.stderr).toContain('OUTPUT_OUTSIDE_RUNS');
  expect(readFileSync(protectedFile, 'utf8')).toBe('DO NOT CHANGE');
  expect(existsSync(resolve(repo, fixtures, 'r3-never-write'))).toBe(false);
}, 60000);
