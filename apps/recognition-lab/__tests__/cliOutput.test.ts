import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, linkSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { importDataset } from '../src/importer.ts';
import { freezeConfig } from '../src/calibration.ts';
import { defaultConfig } from '../src/schema.ts';
import { sha256 } from '../src/provenance.ts';

jest.setTimeout(30000);
const repo = resolve(__dirname, '../../..');
const lab = resolve(repo, 'apps/recognition-lab');
const fixtures = resolve(lab, 'fixtures');
const base = resolve(lab, 'runs/r0-r1-fa03-tests');
const outputs = { validate: ['integrity.json'], run: ['results.json', 'summary.md'],
  sweep: ['sweep.json', 'frozen-config.json'], readiness: ['readiness.json', 'readiness.md'] };
type Command = keyof typeof outputs;
const commands = Object.keys(outputs) as Command[];
const targets = commands.flatMap(command => outputs[command].map(name => ({ command, name })));
function setup() {
  mkdirSync(base, { recursive: true }); const directory = mkdtempSync(resolve(base, 'case-'));
  const out = resolve(directory, 'out'); mkdirSync(out);
  const inputRoot = resolve(directory, 'inputs'); mkdirSync(inputRoot);
  const paths = { manifest: resolve(inputRoot, 'dataset.json'), config: resolve(inputRoot, 'config.json'),
    configs: resolve(inputRoot, 'configs.json'), frozen: resolve(inputRoot, 'frozen.json'), curation: resolve(inputRoot, 'curation.json') };
  copyFileSync(resolve(fixtures, 'dataset.json'), paths.manifest);
  copyFileSync(resolve(fixtures, 'configs.json'), paths.configs);
  copyFileSync(resolve(fixtures, 'r1-curation.json'), paths.curation);
  writeFileSync(paths.config, JSON.stringify(defaultConfig));
  const dataset = JSON.parse(readFileSync(paths.manifest, 'utf8'));
  const assets: string[] = dataset.entries.map((e: { asset: { path: string } }) => {
    const path = resolve(inputRoot, e.asset.path); mkdirSync(dirname(path), { recursive: true });
    copyFileSync(resolve(fixtures, e.asset.path), path); return path;
  });
  const imported = importDataset(paths.manifest, inputRoot);
  writeFileSync(paths.frozen, JSON.stringify(freezeConfig(imported.dataset, imported.manifestHash, defaultConfig)));
  let datasetRoot = inputRoot;
  const invoke = (command: Command, destination = out, holdout = false) => {
    const sources = [...Object.values(paths), ...assets];
    const before = sources.map(path => existsSync(path) && lstatSync(path).isFile() ? sha256(readFileSync(path)) : null);
    const extra = command === 'run' ? ['--split', holdout ? 'holdout' : 'development', holdout ? '--frozen' : '--config', holdout ? paths.frozen : paths.config] :
      command === 'sweep' ? ['--split', 'calibration', '--configs', paths.configs, '--choose', '0'] :
        command === 'readiness' ? ['--curation', paths.curation] : [];
    const result = spawnSync(process.execPath, ['apps/recognition-lab/src/cli.ts', command, '--manifest', paths.manifest,
      '--dataset-root', datasetRoot, ...extra, '--out', destination], { cwd: repo, encoding: 'utf8' });
    sources.forEach((path, index) => expect(existsSync(path) && lstatSync(path).isFile() ? sha256(readFileSync(path)) : null).toBe(before[index]));
    return result;
  };
  return { directory, out, inputRoot, paths, assets, dataset, invoke, setRoot(root: string) { datasetRoot = root; } };
}
function seedOthers(command: Command, out: string, except: string) {
  for (const name of outputs[command]) if (name !== except) writeFileSync(resolve(out, name), 'UNCHANGED SIBLING ' + name);
}
function snapshot(directory: string): unknown {
  return Object.fromEntries(readdirSync(directory).sort().map(name => {
    const path = resolve(directory, name); const stat = lstatSync(path);
    return [name, stat.isSymbolicLink() ? { link: true } : stat.isDirectory() ? snapshot(path) : sha256(readFileSync(path))];
  }));
}
function rejected(result: ReturnType<typeof spawnSync>) {
  expect(result.status).toBe(1); expect(result.stdout).toBe('');
  expect(String(result.stderr)).toContain('FAILED_RUN'); expect(String(result.stderr)).not.toContain(repo);
  expect(String(result.stderr)).not.toContain(' at ');
}

test.each(targets)('$command hard-linked $name preserves sentinel, earlier/later siblings and all inputs', ({ command, name }) => {
  const env = setup(); seedOthers(command, env.out, name);
  const sentinel = resolve(env.directory, 'sentinel'); writeFileSync(sentinel, 'PRESERVE'); linkSync(sentinel, resolve(env.out, name));
  const before = snapshot(env.out); rejected(env.invoke(command));
  expect(readFileSync(sentinel, 'utf8')).toBe('PRESERVE'); expect(snapshot(env.out)).toEqual(before);
});
test.each(targets)('$command nonfile $name rejects before changing any sibling/input', ({ command, name }) => {
  const env = setup(); seedOthers(command, env.out, name); mkdirSync(resolve(env.out, name));
  writeFileSync(resolve(env.out, name, 'sentinel'), 'PRESERVE');
  const before = snapshot(env.out); rejected(env.invoke(command)); expect(snapshot(env.out)).toEqual(before);
});
test.each(targets.flatMap(target => [false, true].map(dangling => ({ ...target, dangling }))))(
  '$command linked $name dangling=$dangling rejects the whole report set', ({ command, name, dangling }) => {
    const env = setup(); seedOthers(command, env.out, name); const target = resolve(env.directory, 'junction-target');
    if (!dangling) { mkdirSync(target); writeFileSync(resolve(target, 'sentinel'), 'PRESERVE'); }
    symlinkSync(target, resolve(env.out, name), process.platform === 'win32' ? 'junction' : 'dir');
    const before = snapshot(env.out); rejected(env.invoke(command)); expect(snapshot(env.out)).toEqual(before);
    expect(existsSync(target)).toBe(!dangling); if (!dangling) expect(readFileSync(resolve(target, 'sentinel'), 'utf8')).toBe('PRESERVE');
  });
test.each(commands.flatMap(command => [false, true].map(dangling => ({ command, dangling }))))(
  '$command ancestor junction dangling=$dangling cannot create even a directory', ({ command, dangling }) => {
    const env = setup(); const target = resolve(env.directory, 'junction-target'); if (!dangling) mkdirSync(target);
    const alias = resolve(env.out, 'alias'); symlinkSync(target, alias, process.platform === 'win32' ? 'junction' : 'dir');
    const before = snapshot(env.out); rejected(env.invoke(command, resolve(alias, 'never-create')));
    expect(snapshot(env.out)).toEqual(before); expect(existsSync(resolve(target, 'never-create'))).toBe(false);
  });
test.each(commands)('%s rejects a file ancestor without changing it', command => {
  const env = setup(); const ancestor = resolve(env.out, 'file'); writeFileSync(ancestor, 'PRESERVE');
  const before = snapshot(env.out); rejected(env.invoke(command, resolve(ancestor, 'never-create'))); expect(snapshot(env.out)).toEqual(before);
});
test.each(commands)('%s cannot create output outside ignored runs', command => {
  const env = setup(); const outside = resolve(lab, 'private-data/fa03-' + env.directory.split(/[\\/]/).pop());
  rejected(env.invoke(command, outside)); expect(existsSync(outside)).toBe(false);
});
function moveManifest(env: ReturnType<typeof setup>, destination: string, root: string) {
  copyFileSync(env.paths.manifest, destination); env.paths.manifest = destination; env.setRoot(root);
  env.assets.forEach((source, index) => {
    const path = resolve(root, env.dataset.entries[index].asset.path); mkdirSync(dirname(path), { recursive: true });
    copyFileSync(source, path); env.assets[index] = path;
  });
}
test.each(targets)('$command manifest at $name is never replaced by a report', ({ command, name }) => {
  const env = setup(); seedOthers(command, env.out, name); moveManifest(env, resolve(env.out, name), env.out);
  const before = snapshot(env.out); const result = env.invoke(command); rejected(result);
  expect(String(result.stderr)).toContain('OUTPUT_INPUT_COLLISION'); expect(snapshot(env.out)).toEqual(before);
});
test.each(targets)('$command manifest asset at $name is never replaced', ({ command, name }) => {
  const env = setup(); seedOthers(command, env.out, name);
  env.dataset.entries[0].asset.path = 'out/' + name;
  env.assets.forEach((source, index) => {
    const path = resolve(env.directory, env.dataset.entries[index].asset.path); mkdirSync(dirname(path), { recursive: true });
    copyFileSync(source, path); env.assets[index] = path;
  });
  env.paths.manifest = resolve(env.directory, 'dataset.json'); writeFileSync(env.paths.manifest, JSON.stringify(env.dataset)); env.setRoot(env.directory);
  const before = snapshot(env.out); const result = env.invoke(command); rejected(result);
  expect(String(result.stderr)).toContain('OUTPUT_INPUT_COLLISION'); expect(snapshot(env.out)).toEqual(before);
});
const configured = [
  ...outputs.run.flatMap(name => ['config', 'frozen'].map(input => ({ command: 'run' as const, name, input }))),
  ...outputs.sweep.map(name => ({ command: 'sweep' as const, name, input: 'configs' })),
  ...outputs.readiness.map(name => ({ command: 'readiness' as const, name, input: 'curation' })),
];
test.each(configured)('$command source $input at $name is protected', ({ command, name, input }) => {
  const env = setup(); seedOthers(command, env.out, name); const key = input as 'config' | 'configs' | 'frozen' | 'curation';
  copyFileSync(env.paths[key], resolve(env.out, name)); env.paths[key] = resolve(env.out, name);
  const before = snapshot(env.out); const result = env.invoke(command, env.out, key === 'frozen'); rejected(result);
  expect(String(result.stderr)).toContain('OUTPUT_INPUT_COLLISION'); expect(snapshot(env.out)).toEqual(before);
});
test('input junction alias cannot make a secondary report overwrite config', () => {
  const env = setup(); const name = 'summary.md'; seedOthers('run', env.out, name);
  copyFileSync(env.paths.config, resolve(env.out, name)); const alias = resolve(env.directory, 'input-junction');
  symlinkSync(env.out, alias, process.platform === 'win32' ? 'junction' : 'dir'); env.paths.config = resolve(alias, name);
  const before = snapshot(env.out); const result = env.invoke('run'); rejected(result);
  expect(String(result.stderr)).toContain('OUTPUT_INPUT_COLLISION'); expect(snapshot(env.out)).toEqual(before);
});
test.each(['run', 'sweep', 'readiness'] as const)('%s physically aliased report siblings reject together', command => {
  const env = setup(); const sentinel = resolve(env.directory, 'sentinel'); writeFileSync(sentinel, 'PRESERVE');
  outputs[command].forEach(name => linkSync(sentinel, resolve(env.out, name)));
  const before = snapshot(env.out); rejected(env.invoke(command)); expect(snapshot(env.out)).toEqual(before);
  expect(readFileSync(sentinel, 'utf8')).toBe('PRESERVE');
});
const invalidInputs = outputs.readiness.flatMap(name => ['manifest', 'curation'].flatMap(input =>
  ['missing', 'malformed', 'schema-invalid'].map(kind => ({ name, input, kind }))));
test.each(invalidInputs)('readiness $kind $input at $name cannot be overwritten by an INVALID report', ({ name, input, kind }) => {
  const env = setup(); seedOthers('readiness', env.out, name); const key = input as 'manifest' | 'curation';
  env.paths[key] = resolve(env.out, name);
  if (kind !== 'missing') writeFileSync(env.paths[key], kind === 'malformed' ? '{private-invalid-json' : '{}');
  const before = snapshot(env.out); const result = env.invoke('readiness'); rejected(result);
  expect(String(result.stderr)).toContain('OUTPUT_INPUT_COLLISION'); expect(snapshot(env.out)).toEqual(before);
});
test.each(outputs.readiness)('missing manifest asset at %s stays missing despite readiness error reporting', name => {
  const env = setup(); seedOthers('readiness', env.out, name); env.dataset.entries[0].asset.path = 'out/' + name;
  env.paths.manifest = resolve(env.directory, 'dataset.json'); writeFileSync(env.paths.manifest, JSON.stringify(env.dataset));
  env.assets[0] = resolve(env.out, name); env.setRoot(env.directory);
  const before = snapshot(env.out); const result = env.invoke('readiness'); rejected(result);
  expect(String(result.stderr)).toContain('OUTPUT_INPUT_COLLISION'); expect(snapshot(env.out)).toEqual(before);
});
test.each(outputs.readiness.flatMap(name => ['manifest', 'curation'].map(input => ({ name, input }))))(
  'readiness missing $input at future $name rejects before directory creation', ({ name, input }) => {
    const env = setup(); const future = resolve(env.out, 'never/create'); env.paths[input as 'manifest' | 'curation'] = resolve(future, name);
    const before = snapshot(env.out); const result = env.invoke('readiness', future); rejected(result);
    expect(String(result.stderr)).toContain('OUTPUT_INPUT_COLLISION'); expect(snapshot(env.out)).toEqual(before);
    expect(existsSync(resolve(env.out, 'never'))).toBe(false);
  });
test.each(commands)('%s safely writes fresh nested output and repeats regular-file output', command => {
  const env = setup(); const out = resolve(env.out, 'fresh/nested'); const expected = command === 'validate' || command === 'sweep' ? 0 : 2;
  expect(env.invoke(command, out).status).toBe(expected); expect(env.invoke(command, out).status).toBe(expected);
  for (const name of outputs[command]) expect(lstatSync(resolve(out, name)).nlink).toBe(1);
  if (command === 'run') {
    const report = JSON.parse(readFileSync(resolve(out, 'results.json'), 'utf8')); expect(report.metrics.failureCodes).toEqual({ ADAPTER_ERROR: 1 });
  }
  if (command === 'readiness') expect(JSON.parse(readFileSync(resolve(out, 'readiness.json'), 'utf8')).status).toBe('INCOMPLETE');
});
test.each(['manifest', 'curation'] as const)('readiness missing %s still emits honest INVALID report at safe output', input => {
  const env = setup(); env.paths[input] = resolve(env.inputRoot, 'missing-' + input); const result = env.invoke('readiness');
  expect(result.status).toBe(1); expect(result.stderr).toBe('');
  const report = JSON.parse(readFileSync(resolve(env.out, 'readiness.json'), 'utf8'));
  expect(report.status).toBe('INVALID'); expect(report.realDatasetReady).toBe(false);
  expect(readFileSync(resolve(env.out, 'readiness.md'), 'utf8')).toContain('Status: INVALID');
});
// Native 8.3 names are a capability, not simulated path spellings.
for (const { command, name } of targets) {
  const env = process.platform === 'win32' ? setup() : null;
  const longOut = env ? resolve(env.directory, 'Long Output Directory') : null; if (longOut) mkdirSync(longOut);
  const shortName = env ? spawnSync('cmd', ['/d', '/c', 'dir', '/x'], { cwd: env.directory, encoding: 'utf8' })
    .stdout.match(/<DIR>\s+(\S+)\s+Long Output Directory/)?.[1] : null;
  (shortName ? test : test.skip)(command + ' Windows short output alias protects source at ' + name, () => {
    seedOthers(command, longOut!, name); moveManifest(env!, resolve(longOut!, name), longOut!);
    const before = snapshot(longOut!); const result = env!.invoke(command, resolve(env!.directory, shortName!)); rejected(result);
    expect(String(result.stderr)).toContain('OUTPUT_INPUT_COLLISION'); expect(snapshot(longOut!)).toEqual(before);
  });
}
for (const name of outputs.readiness) {
  const env = process.platform === 'win32' ? setup() : null;
  const longOut = env ? resolve(env.directory, 'Long Output Directory') : null; if (longOut) mkdirSync(longOut);
  const shortName = env ? spawnSync('cmd', ['/d', '/c', 'dir', '/x'], { cwd: env.directory, encoding: 'utf8' })
    .stdout.match(/<DIR>\s+(\S+)\s+Long Output Directory/)?.[1] : null;
  (shortName ? test : test.skip)('readiness Windows short output alias protects missing input at ' + name, () => {
    seedOthers('readiness', longOut!, name); env!.paths.curation = resolve(longOut!, name);
    const before = snapshot(longOut!); const result = env!.invoke('readiness', resolve(env!.directory, shortName!)); rejected(result);
    expect(String(result.stderr)).toContain('OUTPUT_INPUT_COLLISION'); expect(snapshot(longOut!)).toEqual(before);
  });
}
mkdirSync(base, { recursive: true }); const probe = mkdtempSync(resolve(base, 'file-link-probe-'));
const linkTarget = resolve(probe, 'sentinel'); writeFileSync(linkTarget, 'PRESERVE');
let canLinkFile = false;
try { symlinkSync(linkTarget, resolve(probe, 'link'), 'file'); canLinkFile = true; }
catch (error) { if (!['EPERM', 'EACCES'].includes((error as NodeJS.ErrnoException).code!)) throw error; }
for (const { command, name } of targets) {
  (canLinkFile ? test : test.skip)(command + ' native file symlink at ' + name + ' preserves target/siblings', () => {
    const env = setup(); seedOthers(command, env.out, name); symlinkSync(linkTarget, resolve(env.out, name), 'file');
    const before = snapshot(env.out); rejected(env.invoke(command)); expect(snapshot(env.out)).toEqual(before);
    expect(readFileSync(linkTarget, 'utf8')).toBe('PRESERVE');
  });
}
