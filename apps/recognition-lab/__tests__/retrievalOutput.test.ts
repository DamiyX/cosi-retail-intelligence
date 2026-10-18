import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, linkSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync,
  writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { sha256 } from '../src/provenance.ts';
const repo = resolve(__dirname, '../../..'); const lab = resolve(repo, 'apps/recognition-lab');
const fixtures = resolve(lab, 'fixtures'); const base = resolve(lab, 'runs/r4-correction-tests');
const calibrationNames = ['retrieval-calibration.json', 'retrieval-calibration.md', 'frozen-retrieval.json'];
const evaluationNames = ['retrieval.json', 'retrieval.md', 'gallery.json'];
const names = [...calibrationNames, ...evaluationNames];
function setup() {
  mkdirSync(base, { recursive: true }); const directory = mkdtempSync(resolve(base, 'case-'));
  const out = resolve(directory, 'out'); mkdirSync(out);
  const root = resolve(directory, 'inputs'); mkdirSync(root);
  const paths = { manifest: resolve(root, 'dataset.json'), candidate: resolve(root, 'candidate.json'), bundle: resolve(root, 'bundle.json'),
    selection: resolve(root, 'selection.json'), configs: resolve(root, 'configs.json'), config: resolve(root, 'config.json') };
  for (const [key, source] of [['manifest', 'dataset.json'], ['candidate', 'r2/toy-a.json'], ['bundle', 'r2/toy-a-calibration.json'],
    ['selection', 'r4/selection.json'], ['configs', 'configs.json'], ['config', 'r2/config.json']] as const)
    copyFileSync(resolve(fixtures, source), paths[key]);
  const dataset = JSON.parse(readFileSync(paths.manifest, 'utf8'));
  const assets: string[] = dataset.entries.map((e: { asset: { path: string } }) => {
    const path = resolve(root, e.asset.path); mkdirSync(dirname(path), { recursive: true }); copyFileSync(resolve(fixtures, e.asset.path), path); return path;
  });
  let datasetRoot = root;
  const invoke = (destination = out, evaluate = false) => {
    const protectedHashes = new Map([...Object.values(paths), ...assets].map(path => [path, sha256(readFileSync(path))]));
    const args = [resolve(lab, 'src/retrievalCli.ts'), evaluate ? 'evaluate' : 'calibrate', '--manifest', paths.manifest,
      '--dataset-root', datasetRoot, '--candidate', paths.candidate, '--bundle', paths.bundle, '--selection', paths.selection,
      '--store', 'synthetic-store', '--split', 'calibration', '--out', destination,
      ...(evaluate ? ['--config', paths.config, '--cache-mode', 'build', '--cache', resolve(destination, 'gallery.json')] :
        ['--configs', paths.configs, '--choose', '0'])];
    const result = spawnSync(process.execPath, args, { cwd: repo, encoding: 'utf8' });
    for (const [path, hash] of protectedHashes) expect(sha256(readFileSync(path))).toBe(hash);
    return result;
  };
  return { directory, out, paths, assets, dataset, invoke, setRoot(path: string) { datasetRoot = path; } };
}
function seed(out: string, except: string) { for (const name of names) if (name !== except) writeFileSync(resolve(out, name), 'PRESERVE ' + name); }
function snapshot(out: string): unknown { return Object.fromEntries(readdirSync(out).sort().map(name => {
  const path = resolve(out, name); const stat = lstatSync(path);
  return [name, stat.isSymbolicLink() ? { link: true } : stat.isDirectory() ? snapshot(path) : sha256(readFileSync(path))];
})); }
function rejected(result: ReturnType<typeof spawnSync>) {
  expect(result.status).toBe(1); expect(result.stdout).toBe(''); expect(result.stderr).not.toContain(repo);
}
function pathProbe(expression: string) {
  const source = 'import {outputTargets,protectInputs} from ' + JSON.stringify(pathToFileURL(resolve(lab, 'src/retrievalPaths.ts')).href) +
    ';try {' + expression + ';console.log("ACCEPTED");}catch(error){console.error(error.code);process.exitCode=1;}';
  return spawnSync(process.execPath, ['--input-type=module', '-e', source], { cwd: repo, encoding: 'utf8' });
}
test.each(names)('hardlinked output %s leaves every report/cache/input/sentinel untouched', name => {
  const env = setup(); seed(env.out, name); const sentinel = resolve(env.directory, 'sentinel'); writeFileSync(sentinel, 'PRESERVE');
  linkSync(sentinel, resolve(env.out, name)); const before = snapshot(env.out);
  rejected(env.invoke(env.out, evaluationNames.includes(name))); expect(snapshot(env.out)).toEqual(before);
  expect(readFileSync(sentinel, 'utf8')).toBe('PRESERVE');
});
test.each(names)('direct input/output alias at %s rejects before changing earlier/later siblings', name => {
  const env = setup(); seed(env.out, name); copyFileSync(env.paths.candidate, resolve(env.out, name)); env.paths.candidate = resolve(env.out, name);
  const before = snapshot(env.out); const result = env.invoke(env.out, evaluationNames.includes(name)); rejected(result);
  expect(result.stderr).toContain('OUTPUT_INPUT_COLLISION'); expect(snapshot(env.out)).toEqual(before);
});
test('fresh nested regular outputs and repeated overwrites still support calibration/evaluation', () => {
  const env = setup(); const out = resolve(env.out, 'fresh/nested'); expect(env.invoke(out).status).toBe(0);
  expect(env.invoke(out).status).toBe(0); expect(env.invoke(out, true).status).toBe(0);
});

// Native 8.3 capability must be real, not a mock of path normalization.
const aliases = names.map(name => {
  const env = process.platform === 'win32' ? setup() : null; const long = env ? resolve(env.directory, 'Long Output Directory') : null;
  if (long) mkdirSync(long);
  const short = env ? spawnSync('cmd', ['/d', '/c', 'dir', '/x'], { cwd: env.directory, encoding: 'utf8' })
    .stdout.match(/<DIR>\s+(\S+)\s+Long Output Directory/)?.[1] : undefined;
  return { env, long, short, name };
});
for (const { env, long, short, name } of aliases) {
  (short ? test : test.skip)('FA-04 actual Windows 8.3 output/input alias at ' + name + ' preserves all bytes', () => {
    seed(long!, name); copyFileSync(env!.paths.candidate, resolve(long!, name)); env!.paths.candidate = resolve(long!, name);
    const before = snapshot(long!); const result = env!.invoke(resolve(env!.directory, short!), evaluationNames.includes(name)); rejected(result);
    expect(result.stderr).toContain('OUTPUT_INPUT_COLLISION'); expect(snapshot(long!)).toEqual(before);
  });
}
for (const { env, long, short, name } of aliases.slice(0, 1)) {
  (short ? test : test.skip)('FA-04 distinct report/cache destinations cannot share a Windows 8.3 physical identity', () => {
    writeFileSync(resolve(long!, name), 'PRESERVE');
    const result = pathProbe('outputTargets(' + JSON.stringify(long) + ',' + JSON.stringify([name]) + ',' + JSON.stringify([resolve(env!.directory, short!, name)]) + ')');
    rejected(result); expect(result.stderr).toContain('OUTPUT_COLLISION');
    expect(readFileSync(resolve(long!, name), 'utf8')).toBe('PRESERVE');
  });
  (short ? test : test.skip)('FA-04 distinct not-yet-existing aliases reject before directory creation', () => {
    const path = resolve(long!, 'new/subdir'); const extra = resolve(env!.directory, short!, 'new/subdir/retrieval.json');
    const result = pathProbe('outputTargets(' + JSON.stringify(path) + ',["retrieval.json"],' + JSON.stringify([extra]) + ')');
    rejected(result); expect(result.stderr).toContain('OUTPUT_COLLISION'); expect(existsSync(path)).toBe(false);
  });
  (short ? test : test.skip)('FA-04 physical identity guard protects every explicit source and asset alias', () => {
    for (const input of [...Object.values(env!.paths), ...env!.assets]) {
      const target = resolve(long!, name); copyFileSync(input, target);
      const result = pathProbe('protectInputs(' + JSON.stringify([resolve(env!.directory, short!, name)]) + ',' + JSON.stringify([target]) + ')');
      rejected(result); expect(result.stderr).toContain('OUTPUT_INPUT_COLLISION');
      expect(sha256(readFileSync(target))).toBe(sha256(readFileSync(input)));
    }
  });
}
