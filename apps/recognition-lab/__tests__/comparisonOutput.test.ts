import { spawnSync } from 'node:child_process';
import { copyFileSync, linkSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { sha256 } from '../src/provenance.ts';
import { importDataset } from '../src/importer.ts';
import { calibrateCandidate } from '../src/candidateCalibration.ts';
import { defaultConfig } from '../src/schema.ts';

const repo = resolve(__dirname, '../../..');
const fixtures = resolve(repo, 'apps/recognition-lab/fixtures');
const base = resolve(repo, 'apps/recognition-lab/runs/r2-fa03-tests');
const outputs = { compare: ['comparison.json', 'comparison.md'], calibrate: ['calibration.json', 'frozen-candidate.json', 'calibration.md'] };
type Command = keyof typeof outputs;
const cases = (Object.keys(outputs) as Command[]).flatMap(command => outputs[command].map(name => [command, name] as const));
function setup(command: Command) {
  mkdirSync(base, { recursive: true }); const directory = mkdtempSync(resolve(base, command + '-'));
  const out = resolve(directory, 'out'); mkdirSync(out);
  const paths = { manifest: resolve(fixtures, 'dataset.json'), candidate: resolve(fixtures, 'r2/toy-a.json'),
    bundle: resolve(fixtures, 'r2/toy-a-calibration.json'), configs: resolve(fixtures, 'configs.json'),
    config: resolve(fixtures, 'r2/config.json'), frozen: resolve(fixtures, 'r2/config.json'), inputs: resolve(directory, 'inputs.json') };
  const dataset = JSON.parse(readFileSync(paths.manifest, 'utf8'));
  const assets: string[] = dataset.entries.map((e: { asset: { path: string } }) => resolve(fixtures, e.asset.path));
  const sourceFiles = () => [...new Set([...Object.values(paths), ...assets])];
  let datasetRoot = fixtures;
  const invoke = (destination = out, split = 'calibration') => {
    writeFileSync(paths.inputs, JSON.stringify([{ candidate: paths.candidate, bundle: paths.bundle,
      ...(split === 'holdout' ? { frozen: paths.frozen } : { config: paths.config }) }]) + '\n');
    const sourceHashes = new Map(sourceFiles().map(path => [path, sha256(readFileSync(path))]));
    const argv = ['apps/recognition-lab/src/comparisonCli.ts', command, '--manifest', paths.manifest, '--dataset-root', datasetRoot,
      '--split', split, '--out', destination, ...(command === 'calibrate' ? ['--candidate', paths.candidate, '--bundle', paths.bundle,
        '--configs', paths.configs, '--choose', '0'] : ['--inputs', paths.inputs])];
    const result = spawnSync(process.execPath, argv, { cwd: repo, encoding: 'utf8' });
    for (const [path, hash] of sourceHashes) expect(sha256(readFileSync(path))).toBe(hash);
    return result;
  };
  return { directory, out, paths, assets, dataset, invoke, setDatasetRoot(root: string) { datasetRoot = root; } };
}
function seedOthers(out: string, command: Command, except: string) {
  for (const name of outputs[command]) if (name !== except) writeFileSync(resolve(out, name), 'UNCHANGED EXISTING REPORT ' + name);
}
function snapshot(out: string) {
  return Object.fromEntries(readdirSync(out).sort().map(name => {
    const path = resolve(out, name); const stat = lstatSync(path);
    return [name, stat.isDirectory() || stat.isSymbolicLink() ? { directory: stat.isDirectory(), symlink: stat.isSymbolicLink() } : sha256(readFileSync(path))];
  }));
}
test.each(cases)('%s rejects hard-linked %s before changing any destination or input', (command, name) => {
  const env = setup(command); seedOthers(env.out, command, name);
  const sentinel = resolve(env.directory, 'sentinel.txt'); writeFileSync(sentinel, 'DO NOT OVERWRITE');
  linkSync(sentinel, resolve(env.out, name));
  expect(lstatSync(resolve(env.out, name)).nlink).toBeGreaterThan(1);
  const before = snapshot(env.out); const result = env.invoke();
  expect(result.status).toBe(1); expect(result.stderr).toContain('OUTPUT_LINKED'); expect(result.stdout).toBe('');
  expect(readFileSync(sentinel, 'utf8')).toBe('DO NOT OVERWRITE'); expect(snapshot(env.out)).toEqual(before);
});
test.each(cases)('%s rejects directory destination %s before changing any sibling or input', (command, name) => {
  const env = setup(command); seedOthers(env.out, command, name);
  const directory = resolve(env.out, name); mkdirSync(directory);
  const sentinel = resolve(directory, 'sentinel.txt'); writeFileSync(sentinel, 'DO NOT OVERWRITE');
  const before = snapshot(env.out); const result = env.invoke();
  expect(result.status).toBe(1); expect(result.stderr).toContain('OUTPUT_LINKED'); expect(result.stdout).toBe('');
  expect(readFileSync(sentinel, 'utf8')).toBe('DO NOT OVERWRITE'); expect(snapshot(env.out)).toEqual(before);
});
test.each(cases)('%s rejects junction destination %s, leaving its target and every sibling unchanged', (command, name) => {
  const env = setup(command); seedOthers(env.out, command, name);
  const target = resolve(env.directory, 'target'); mkdirSync(target);
  const sentinel = resolve(target, 'sentinel.txt'); writeFileSync(sentinel, 'DO NOT OVERWRITE');
  symlinkSync(target, resolve(env.out, name), process.platform === 'win32' ? 'junction' : 'dir');
  expect(lstatSync(resolve(env.out, name)).isSymbolicLink()).toBe(true);
  const before = snapshot(env.out); const result = env.invoke();
  expect(result.status).toBe(1); expect(result.stderr).toContain('OUTPUT_LINKED'); expect(result.stdout).toBe('');
  expect(readFileSync(sentinel, 'utf8')).toBe('DO NOT OVERWRITE'); expect(snapshot(env.out)).toEqual(before);
});
test.each(cases)('%s rejects dangling junction destination %s before any output', (command, name) => {
  const env = setup(command); seedOthers(env.out, command, name);
  symlinkSync(resolve(env.directory, 'nonexistent-target'), resolve(env.out, name), process.platform === 'win32' ? 'junction' : 'dir');
  const before = snapshot(env.out); const result = env.invoke();
  expect(result.status).toBe(1); expect(result.stderr).toContain('OUTPUT_LINKED'); expect(result.stdout).toBe('');
  expect(snapshot(env.out)).toEqual(before);
});
const aliases = [
  ['compare', 'comparison.json', 'inputs'], ['compare', 'comparison.md', 'config'],
  ['compare', 'comparison.json', 'candidate'], ['compare', 'comparison.md', 'bundle'],
  ['calibrate', 'calibration.json', 'candidate'], ['calibrate', 'frozen-candidate.json', 'bundle'],
  ['calibrate', 'calibration.md', 'configs'],
] as const;
test.each(aliases)('%s rejects %s aliased to %s and leaves all inputs/destinations unchanged', (command, name, input) => {
  const env = setup(command); seedOthers(env.out, command, name);
  const destination = resolve(env.out, name);
  if (input === 'inputs') writeFileSync(destination, JSON.stringify([{ candidate: env.paths.candidate, bundle: env.paths.bundle, config: env.paths.config }]) + '\n');
  else copyFileSync(env.paths[input], destination);
  env.paths[input] = destination;
  const before = snapshot(env.out); const result = env.invoke();
  expect(result.status).toBe(1); expect(result.stderr).toContain('OUTPUT_INPUT_COLLISION'); expect(result.stdout).toBe('');
  expect(snapshot(env.out)).toEqual(before);
});
test.each(['compare', 'calibrate'] as const)('%s protects a manifest alias to its first report', command => {
  const env = setup(command); const name = outputs[command][0]; seedOthers(env.out, command, name);
  const manifest = resolve(env.out, name); copyFileSync(env.paths.manifest, manifest); env.paths.manifest = manifest;
  for (let i = 0; i < env.assets.length; i++) {
    const asset = resolve(env.out, env.dataset.entries[i].asset.path); mkdirSync(dirname(asset), { recursive: true });
    copyFileSync(env.assets[i], asset); env.assets[i] = asset;
  }
  env.setDatasetRoot(env.out); const before = snapshot(env.out); const result = env.invoke();
  expect(result.status).toBe(1); expect(result.stderr).toContain('OUTPUT_INPUT_COLLISION'); expect(result.stdout).toBe('');
  expect(snapshot(env.out)).toEqual(before);
});
test('comparison protects a manifest asset alias to its Markdown destination', () => {
  const env = setup('compare'); seedOthers(env.out, 'compare', 'comparison.md');
  // Move one public text fixture inside the output set without changing its
  // bytes; revise the manifest/bundle binding so importer integrity stays valid.
  for (let i = 0; i < env.assets.length; i++) {
    const entry = env.dataset.entries[i];
    if (i === 0) entry.asset.path = 'comparison.md';
    const asset = resolve(env.out, entry.asset.path); mkdirSync(dirname(asset), { recursive: true });
    copyFileSync(env.assets[i], asset); env.assets[i] = asset;
  }
  const manifest = resolve(env.out, 'dataset.json'); writeFileSync(manifest, JSON.stringify(env.dataset));
  env.paths.manifest = manifest; env.setDatasetRoot(env.out);
  const bundle = JSON.parse(readFileSync(env.paths.bundle, 'utf8')); bundle.dataset.manifestSha256 = sha256(readFileSync(manifest));
  env.paths.bundle = resolve(env.directory, 'bound-bundle.json'); writeFileSync(env.paths.bundle, JSON.stringify(bundle));
  const before = snapshot(env.out); const result = env.invoke();
  expect(result.status).toBe(1); expect(result.stderr).toContain('OUTPUT_INPUT_COLLISION'); expect(snapshot(env.out)).toEqual(before);
});
test('calibration rejects a source alias reached through an input junction', () => {
  const env = setup('calibrate'); seedOthers(env.out, 'calibrate', 'calibration.json');
  copyFileSync(env.paths.candidate, resolve(env.out, 'calibration.json'));
  const alias = resolve(env.directory, 'input-alias'); symlinkSync(env.out, alias, process.platform === 'win32' ? 'junction' : 'dir');
  env.paths.candidate = resolve(alias, 'calibration.json');
  const before = snapshot(env.out); const result = env.invoke();
  expect(result.status).toBe(1); expect(result.stderr).toContain('OUTPUT_INPUT_COLLISION'); expect(snapshot(env.out)).toEqual(before);
});
test('holdout comparison protects the frozen input at its Markdown destination', () => {
  const env = setup('compare'); seedOthers(env.out, 'compare', 'comparison.md');
  const { dataset, manifestHash } = importDataset(env.paths.manifest, fixtures);
  const frozen = calibrateCandidate(dataset, manifestHash, JSON.parse(readFileSync(env.paths.candidate, 'utf8')),
    JSON.parse(readFileSync(env.paths.bundle, 'utf8')), [defaultConfig], 0, 'calibration').frozen;
  env.paths.frozen = resolve(env.out, 'comparison.md'); writeFileSync(env.paths.frozen, JSON.stringify(frozen));
  env.paths.bundle = resolve(fixtures, 'r2/toy-a-holdout.json');
  const before = snapshot(env.out); const result = env.invoke(env.out, 'holdout');
  expect(result.status).toBe(1); expect(result.stderr).toContain('OUTPUT_INPUT_COLLISION'); expect(snapshot(env.out)).toEqual(before);
});
test.each(['compare', 'calibrate'] as const)('%s supports new directories and safe regular-file repeat output', command => {
  const env = setup(command);
  const nested = resolve(env.out, 'new/nested');
  expect(env.invoke(nested).status).toBe(0);
  expect(env.invoke(nested).status).toBe(0);
  for (const name of outputs[command]) expect(lstatSync(resolve(nested, name)).isFile()).toBe(true);
});

// Windows short names are filesystem-dependent. Make an unavailable native
// capability an explicit skip elsewhere; this host's actual 8.3 alias is tested.
const shortEnv = process.platform === 'win32' ? setup('calibrate') : null;
const longOut = shortEnv ? resolve(shortEnv.directory, 'Long Output Directory') : null;
if (longOut) mkdirSync(longOut);
const shortName = shortEnv ? spawnSync('cmd', ['/d', '/c', 'dir', '/x'], { cwd: shortEnv.directory, encoding: 'utf8' })
  .stdout.match(/<DIR>\s+(\S+)\s+Long Output Directory/)?.[1] : null;
(shortName ? test : test.skip)('Windows short output directory alias cannot overwrite a long-path source input', () => {
  const env = shortEnv!; seedOthers(longOut!, 'calibrate', 'calibration.json');
  const candidate = resolve(longOut!, 'calibration.json'); copyFileSync(env.paths.candidate, candidate); env.paths.candidate = candidate;
  const before = snapshot(longOut!); const result = env.invoke(resolve(env.directory, shortName!));
  expect(result.status).toBe(1); expect(result.stderr).toContain('OUTPUT_INPUT_COLLISION'); expect(result.stdout).toBe('');
  expect(snapshot(longOut!)).toEqual(before);
});
