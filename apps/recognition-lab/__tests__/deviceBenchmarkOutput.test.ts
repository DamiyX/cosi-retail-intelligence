import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, linkSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { sha256 } from '../src/provenance.ts';
const repo = resolve(__dirname, '../../..');
const fixtures = resolve(repo, 'apps/recognition-lab/fixtures');
const base = resolve(repo, 'apps/recognition-lab/runs/r3-fa03-tests');
const outputs = ['device-benchmark.json', 'device-benchmark.md'];
function setup() {
  mkdirSync(base, { recursive: true }); const directory = mkdtempSync(resolve(base, 'case-'));
  const out = resolve(directory, 'out'); mkdirSync(out);
  const inputRoot = resolve(directory, 'inputs'); mkdirSync(inputRoot);
  const paths = { manifest: resolve(inputRoot, 'dataset.json'), candidate: resolve(inputRoot, 'candidate.json'),
    target: resolve(inputRoot, 'target.json'), record: resolve(inputRoot, 'record.json'),
    reference: resolve(inputRoot, 'reference.json'), pairs: resolve(inputRoot, 'pairs.json') };
  for (const [key, source] of [['manifest', 'dataset.json'], ['candidate', 'r2/toy-a.json'], ['target', 'r3/target.json'],
    ['record', 'r3/paired-benchmark.json'], ['reference', 'r2/toy-a-development.json'], ['pairs', 'r3/paired-equivalence.json']] as const)
    copyFileSync(resolve(fixtures, source), paths[key]);
  const dataset = JSON.parse(readFileSync(paths.manifest, 'utf8'));
  const assets: string[] = dataset.entries.map((e: { asset: { path: string } }) => {
    const path = resolve(inputRoot, e.asset.path); mkdirSync(dirname(path), { recursive: true }); copyFileSync(resolve(fixtures, e.asset.path), path); return path;
  });
  let datasetRoot = inputRoot;
  const invoke = (destination = out, withPairs = true) => {
    const hashes = new Map([...Object.values(paths), ...assets].map(path => [path, sha256(readFileSync(path))]));
    const result = spawnSync(process.execPath, ['apps/recognition-lab/src/deviceBenchmarkCli.ts', 'analyze', '--manifest', paths.manifest,
      '--dataset-root', datasetRoot, '--candidate', paths.candidate, '--target', paths.target, '--record', paths.record, '--out', destination,
      ...(withPairs ? ['--reference-bundle', paths.reference, '--pairs', paths.pairs] : [])], { cwd: repo, encoding: 'utf8' });
    for (const [path, hash] of hashes) expect(sha256(readFileSync(path))).toBe(hash);
    return result;
  };
  return { directory, out, inputRoot, paths, assets, dataset, invoke, setRoot(root: string) { datasetRoot = root; } };
}
function seedOthers(out: string, except: string) {
  for (const name of outputs) if (name !== except) writeFileSync(resolve(out, name), 'UNCHANGED SIBLING ' + name);
}
function snapshot(out: string): unknown {
  return Object.fromEntries(readdirSync(out).sort().map(name => {
    const path = resolve(out, name); const stat = lstatSync(path);
    return [name, stat.isSymbolicLink() ? { link: true } : stat.isDirectory() ? snapshot(path) : sha256(readFileSync(path))];
  }));
}
function rejected(result: ReturnType<typeof spawnSync>) {
  expect(result.status).toBe(1); expect(result.stdout).toBe('');
  expect(String(result.stderr)).not.toContain(repo); expect(String(result.stderr)).not.toContain(' at ');
}
test.each(outputs)('hard-linked %s cannot overwrite a sentinel or any sibling/input', name => {
  const env = setup(); seedOthers(env.out, name);
  const sentinel = resolve(env.directory, 'sentinel.txt'); writeFileSync(sentinel, 'PRESERVE'); linkSync(sentinel, resolve(env.out, name));
  expect(lstatSync(resolve(env.out, name)).nlink).toBeGreaterThan(1);
  const before = snapshot(env.out); const result = env.invoke(); rejected(result);
  expect(String(result.stderr)).toContain('OUTPUT_LINKED'); expect(readFileSync(sentinel, 'utf8')).toBe('PRESERVE'); expect(snapshot(env.out)).toEqual(before);
});
test.each(outputs)('nonfile %s leaves all other reports and inputs unchanged', name => {
  const env = setup(); seedOthers(env.out, name); mkdirSync(resolve(env.out, name)); writeFileSync(resolve(env.out, name, 'sentinel'), 'PRESERVE');
  const before = snapshot(env.out); rejected(env.invoke()); expect(snapshot(env.out)).toEqual(before);
});
test.each(outputs.flatMap(name => [false, true].map(dangling => ({ name, dangling }))))('linked destination $name dangling=$dangling is rejected before any sibling changes', ({ name, dangling }) => {
  const env = setup(); seedOthers(env.out, name); const target = resolve(env.directory, 'junction-target');
  if (!dangling) { mkdirSync(target); writeFileSync(resolve(target, 'sentinel'), 'PRESERVE'); }
  symlinkSync(target, resolve(env.out, name), process.platform === 'win32' ? 'junction' : 'dir');
  const before = snapshot(env.out); rejected(env.invoke()); expect(snapshot(env.out)).toEqual(before);
  expect(existsSync(target)).toBe(!dangling); if (!dangling) expect(readFileSync(resolve(target, 'sentinel'), 'utf8')).toBe('PRESERVE');
});
const aliases = outputs.flatMap(name => ['candidate', 'target', 'record', 'reference', 'pairs'].map(input => ({ name, input })));
test.each(aliases)('$name aliased to $input is rejected without changing any source/sibling', ({ name, input }) => {
  const env = setup(); seedOthers(env.out, name); const key = input as 'candidate' | 'target' | 'record' | 'reference' | 'pairs';
  const destination = resolve(env.out, name); copyFileSync(env.paths[key], destination); env.paths[key] = destination;
  const before = snapshot(env.out); const result = env.invoke(); rejected(result);
  expect(String(result.stderr)).toContain('OUTPUT_INPUT_COLLISION'); expect(snapshot(env.out)).toEqual(before);
});
test.each(outputs)('manifest at %s cannot be replaced by a report', name => {
  const env = setup(); seedOthers(env.out, name); copyFileSync(env.paths.manifest, resolve(env.out, name)); env.paths.manifest = resolve(env.out, name);
  for (let i = 0; i < env.assets.length; i++) {
    const path = resolve(env.out, env.dataset.entries[i].asset.path); mkdirSync(dirname(path), { recursive: true }); copyFileSync(env.assets[i], path); env.assets[i] = path;
  }
  env.setRoot(env.out); const before = snapshot(env.out); const result = env.invoke(); rejected(result);
  expect(String(result.stderr)).toContain('OUTPUT_INPUT_COLLISION'); expect(snapshot(env.out)).toEqual(before);
});
test.each(outputs)('asset at %s remains unchanged with valid revised hash bindings', name => {
  const env = setup(); seedOthers(env.out, name);
  for (let i = 0; i < env.assets.length; i++) {
    const entry = env.dataset.entries[i]; if (i === 0) entry.asset.path = 'out/' + name;
    const path = resolve(env.directory, entry.asset.path); mkdirSync(dirname(path), { recursive: true }); copyFileSync(env.assets[i], path); env.assets[i] = path;
  }
  env.paths.manifest = resolve(env.directory, 'dataset.json'); writeFileSync(env.paths.manifest, JSON.stringify(env.dataset)); env.setRoot(env.directory);
  const manifestSha256 = sha256(readFileSync(env.paths.manifest));
  for (const key of ['record', 'reference', 'pairs'] as const) {
    const data = JSON.parse(readFileSync(env.paths[key], 'utf8')); data.dataset.manifestSha256 = manifestSha256;
    writeFileSync(env.paths[key], JSON.stringify(data));
  }
  const pairs = JSON.parse(readFileSync(env.paths.pairs, 'utf8'));
  // R2 canonical bundle hash uses schema field order, retained in the copied fixture.
  pairs.referenceBundleSha256 = sha256(JSON.stringify(JSON.parse(readFileSync(env.paths.reference, 'utf8'))));
  writeFileSync(env.paths.pairs, JSON.stringify(pairs));
  const before = snapshot(env.out); const result = env.invoke(); rejected(result);
  expect(String(result.stderr)).toContain('OUTPUT_INPUT_COLLISION'); expect(snapshot(env.out)).toEqual(before);
});
test('source reached through an input junction cannot replace the primary report', () => {
  const env = setup(); const name = outputs[0]; seedOthers(env.out, name); copyFileSync(env.paths.candidate, resolve(env.out, name));
  const alias = resolve(env.directory, 'input-junction'); symlinkSync(env.out, alias, process.platform === 'win32' ? 'junction' : 'dir');
  env.paths.candidate = resolve(alias, name); const before = snapshot(env.out); const result = env.invoke(); rejected(result);
  expect(String(result.stderr)).toContain('OUTPUT_INPUT_COLLISION'); expect(snapshot(env.out)).toEqual(before);
});
test.each([false, true])('output ancestor junction dangling=%s cannot create directories/reports', dangling => {
  const env = setup(); const target = resolve(env.directory, 'target'); if (!dangling) mkdirSync(target);
  const alias = resolve(env.out, 'alias'); symlinkSync(target, alias, process.platform === 'win32' ? 'junction' : 'dir');
  const before = snapshot(env.out); rejected(env.invoke(resolve(alias, 'never-create'))); expect(snapshot(env.out)).toEqual(before);
  expect(existsSync(resolve(target, 'never-create'))).toBe(false);
});
test('fresh nested output and safe regular-file rewrites support both paired and incomplete analysis', () => {
  const env = setup(); const out = resolve(env.out, 'fresh/nested');
  expect(env.invoke(out).status).toBe(0); const first = snapshot(out);
  expect(env.invoke(out).status).toBe(0); expect(snapshot(out)).toEqual(first);
  expect(env.invoke(out, false).status).toBe(2);
  for (const name of outputs) expect(lstatSync(resolve(out, name)).nlink).toBe(1);
});
const shortCases = outputs.map(name => {
  const env = process.platform === 'win32' ? setup() : null;
  const longOut = env ? resolve(env.directory, 'Long Output Directory') : null; if (longOut) mkdirSync(longOut);
  const shortName = env ? spawnSync('cmd', ['/d', '/c', 'dir', '/x'], { cwd: env.directory, encoding: 'utf8' })
    .stdout.match(/<DIR>\s+(\S+)\s+Long Output Directory/)?.[1] : null;
  return { env, longOut, shortName, name };
});
for (const { env, longOut, shortName, name } of shortCases) {
  (shortName ? test : test.skip)('Windows short output alias protects source at ' + name, () => {
    const key = name === outputs[0] ? 'candidate' : 'pairs'; seedOthers(longOut!, name);
    copyFileSync(env!.paths[key], resolve(longOut!, name)); env!.paths[key] = resolve(longOut!, name);
    const before = snapshot(longOut!); const result = env!.invoke(resolve(env!.directory, shortName!)); rejected(result);
    expect(String(result.stderr)).toContain('OUTPUT_INPUT_COLLISION'); expect(snapshot(longOut!)).toEqual(before);
  });
}
// File symlinks need a native privilege on Windows. Expose lack of capability
// as explicit skipped evidence, while junction/dangling-link cases still execute.
mkdirSync(base, { recursive: true }); const linkProbe = mkdtempSync(resolve(base, 'file-link-probe-'));
const linkTarget = resolve(linkProbe, 'sentinel'); writeFileSync(linkTarget, 'PRESERVE');
let canLinkFile = false;
try { symlinkSync(linkTarget, resolve(linkProbe, 'link'), 'file'); canLinkFile = true; }
catch (error) { if (!['EPERM', 'EACCES'].includes((error as NodeJS.ErrnoException).code!)) throw error; }
for (const name of outputs) {
  (canLinkFile ? test : test.skip)('native file symlink at ' + name + ' leaves target/siblings unchanged', () => {
    const env = setup(); seedOthers(env.out, name); symlinkSync(linkTarget, resolve(env.out, name), 'file');
    const before = snapshot(env.out); rejected(env.invoke()); expect(snapshot(env.out)).toEqual(before); expect(readFileSync(linkTarget, 'utf8')).toBe('PRESERVE');
  });
}
