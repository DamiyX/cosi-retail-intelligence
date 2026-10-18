import { lstatSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, parse, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaultConfig, configSchema, LABEL, LabError, splitSchema } from './schema.ts';
import { importDataset, IntegrityError } from './importer.ts';
import { experiment } from './experiment.ts';
import { metricSummary, metrics } from './metrics.ts';
import { freezeConfig, holdoutConfig, sweep } from './calibration.ts';
import { gitState, sha256 } from './provenance.ts';
import { assessReadiness, readinessSummary } from './readiness.ts';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const json = (file: string) => JSON.parse(readFileSync(resolve(file), 'utf8'));
const pathKey = (path: string) => process.platform === 'win32' ? path.toLowerCase() : path;
function existing(path: string) {
  // lstat also sees dangling links. ENOTDIR can occur for an invalid input path;
  // output ancestor validation below still rejects its regular-file ancestor.
  try { return lstatSync(path); } catch (error) {
    if (['ENOENT', 'ENOTDIR'].includes((error as NodeJS.ErrnoException).code!)) return null;
    throw error;
  }
}
function destination(path: string) {
  let ancestor = resolve(path); const suffix: string[] = [];
  while (!existing(ancestor)) { suffix.unshift(basename(ancestor)); ancestor = dirname(ancestor); }
  const stat = statSync(ancestor, { bigint: true });
  return { canonical: pathKey(resolve(realpathSync(ancestor), ...suffix)),
    // Bind future files to the nearest existing physical directory as well.
    // Windows realpath alone can retain an 8.3 alias spelling.
    physical: stat.dev + ':' + stat.ino + ':' + pathKey(suffix.join('/')) };
}
function manifestAssets(manifest: string, root: string): string[] {
  // Readiness emits INVALID reports even for invalid/missing inputs. Protect any
  // declared asset locators before assessment, without requiring a valid import.
  try {
    const value: unknown = json(manifest);
    if (!value || typeof value !== 'object' || !('entries' in value) || !Array.isArray(value.entries)) return [];
    return value.entries.flatMap((entry: unknown) => {
      if (!entry || typeof entry !== 'object' || !('asset' in entry) || !entry.asset || typeof entry.asset !== 'object' ||
        !('path' in entry.asset) || typeof entry.asset.path !== 'string') return [];
      return [resolve(root, entry.asset.path)];
    });
  } catch { return []; } // Assessment/import remains the authority for validity.
}
function outputTargets(path: string, names: string[], inputs: string[]) {
  const out = resolve(path); const root = resolve(repo, 'apps/recognition-lab/runs');
  const rel = relative(root, out);
  if (isAbsolute(rel) || rel === '..' || rel.startsWith('../') || rel.startsWith('..\\'))
    throw new LabError('OUTPUT_OUTSIDE_RUNS', 'Outputs require ignored lab runs');
  const paths = names.map(name => resolve(out, name));
  // Validate the COMPLETE set before ANY mkdir/write, including secondary files.
  for (const target of [out, ...paths]) {
    let current = parse(target).root;
    for (const part of relative(current, target).split(sep)) {
      current = resolve(current, part); const stat = existing(current);
      const directory = current !== target || target === out;
      if (stat && (stat.isSymbolicLink() || (directory ? !stat.isDirectory() : !stat.isFile() || stat.nlink > 1)))
        throw new LabError('OUTPUT_LINKED', 'Linked or invalid output path prohibited');
    }
  }
  const destinations = paths.map(destination);
  if (new Set(destinations.map(p => p.canonical)).size !== paths.length ||
    new Set(destinations.map(p => p.physical)).size !== paths.length)
    throw new LabError('OUTPUT_COLLISION', 'Report targets must be physically distinct');
  const protectedPaths = new Set(inputs.map(p => pathKey(resolve(p))));
  const protectedFiles = new Set<string>();
  for (const input of inputs) {
    const source = destination(input);
    protectedPaths.add(source.canonical); protectedFiles.add(source.physical);
  }
  if (paths.some((p, index) => protectedPaths.has(pathKey(p)) || protectedPaths.has(destinations[index].canonical) ||
    protectedFiles.has(destinations[index].physical)))
    throw new LabError('OUTPUT_INPUT_COLLISION', 'Outputs cannot replace source inputs');
  return { out, paths, create: () => mkdirSync(out, { recursive: true }) };
}
function main() {
  const [command, ...args] = process.argv.slice(2);
  const flags = new Map<string, string>();
  for (let i = 0; i < args.length; i += 2) {
    if (!['--manifest', '--dataset-root', '--split', '--out', '--config', '--frozen', '--configs', '--choose', '--curation'].includes(args[i]) ||
      !args[i + 1] || args[i + 1].startsWith('--') || flags.has(args[i]))
      throw new LabError('ARGUMENTS', 'Invalid CLI arguments');
    flags.set(args[i], args[i + 1]);
  }
  if (!['run', 'validate', 'sweep', 'readiness'].includes(command) || !flags.has('--manifest') ||
    !flags.has('--dataset-root') || !flags.has('--out')) throw new LabError('ARGUMENTS', 'Missing CLI arguments');
  const names = command === 'validate' ? ['integrity.json'] : command === 'run' ? ['results.json', 'summary.md'] :
    command === 'sweep' ? ['sweep.json', 'frozen-config.json'] : ['readiness.json', 'readiness.md'];
  const sources = ['--manifest', '--config', '--configs', '--frozen', '--curation'].flatMap(f => flags.has(f) ? [flags.get(f)!] : []);
  const targets = outputTargets(flags.get('--out')!, names,
    [...sources, ...manifestAssets(flags.get('--manifest')!, flags.get('--dataset-root')!)]);
  if (command === 'readiness') {
    if (!flags.has('--curation') || [...flags.keys()].some(f => !['--manifest', '--dataset-root', '--out', '--curation'].includes(f)))
      throw new LabError('ARGUMENTS', 'Readiness requires exactly manifest, dataset-root, curation and out');
    const report = assessReadiness(resolve(flags.get('--manifest')!), resolve(flags.get('--dataset-root')!), resolve(flags.get('--curation')!));
    targets.create();
    writeFileSync(targets.paths[0], JSON.stringify(report, null, 2) + '\n');
    writeFileSync(targets.paths[1], readinessSummary(report));
    console.log(readinessSummary(report));
    process.exitCode = report.status === 'INVALID' ? 1 : report.status === 'INCOMPLETE' ? 2 : 0;
    return;
  }
  if (flags.has('--curation')) throw new LabError('ARGUMENTS', 'Curation is for readiness only');
  const { dataset, manifestHash, integrity } = importDataset(resolve(flags.get('--manifest')!), resolve(flags.get('--dataset-root')!));
  const write = (file: string, value: unknown) => { targets.create(); writeFileSync(resolve(targets.out, file), JSON.stringify(value, null, 2) + '\n'); };
  if (command === 'validate') { write('integrity.json', integrity); console.log(JSON.stringify(integrity)); return; }
  const split = splitSchema.parse(flags.get('--split') ?? 'development');
  const provenance = {
    label: LABEL, schemaVersion: 1, ...gitState(repo), fixtureHash: manifestHash,
    datasetId: dataset.datasetId, datasetVersion: dataset.version, adapter: dataset.adapter,
    ranking: defaultConfig.version, seed: null,
    runtime: { node: process.versions.node, platform: process.platform, arch: process.arch,
      typescript: json(resolve(repo, 'apps/mobile/node_modules/typescript/package.json')).version,
      jest: json(resolve(repo, 'node_modules/jest/package.json')).version,
      eslint: json(resolve(repo, 'node_modules/eslint/package.json')).version,
      zod: json(resolve(repo, 'node_modules/zod/package.json')).version },
    split, startedAt: new Date().toISOString(),
    nondeterministicFields: ['provenance.startedAt', 'results[].elapsedMs', 'metrics.timing',
      'sweeps[].results[].elapsedMs', 'sweeps[].metrics.timing'],
  };
  if (command === 'sweep') {
    if (!flags.has('--configs') || !flags.has('--choose') || flags.has('--config') || flags.has('--frozen'))
      throw new LabError('ARGUMENTS', 'Sweep requires configs and explicit choose index');
    const sweeps = sweep(dataset, json(flags.get('--configs')!), split);
    const index = Number(flags.get('--choose'));
    if (!Number.isInteger(index) || index < 0 || index >= sweeps.length) throw new LabError('CONFIG_CHOICE', 'Invalid explicit config choice');
    const frozen = freezeConfig(dataset, manifestHash, sweeps[index].config);
    write('sweep.json', { provenance, integrity, sweeps, chosenIndex: index });
    write('frozen-config.json', frozen);
    console.log(LABEL + '\nCalibration-only sweep: ' + sweeps.length + ' configs; curator choice ' + index);
    if (sweeps.some(s => s.results.some(r => r.outcome.status === 'FAILURE'))) process.exitCode = 2;
    return;
  }
  if (flags.has('--configs') || flags.has('--choose') || flags.has('--config') && flags.has('--frozen'))
    throw new LabError('ARGUMENTS', 'Conflicting run arguments');
  let config = flags.has('--config') ? configSchema.parse(json(flags.get('--config')!)) : defaultConfig;
  let frozen: unknown = null;
  if (split === 'holdout') {
    if (!flags.has('--frozen') || flags.has('--config')) throw new LabError('CONFIG_NOT_FROZEN', 'Holdout requires a frozen configuration');
    frozen = json(flags.get('--frozen')!); config = holdoutConfig(frozen, dataset, manifestHash);
  } else if (flags.has('--frozen')) throw new LabError('ARGUMENTS', 'Frozen config is for holdout only');
  const results = experiment(dataset, config, split);
  if (!results.length) throw new LabError('EMPTY_QUERY_SPLIT', 'No queries in selected split');
  write('results.json', { provenance: { ...provenance, config, configHash: sha256(JSON.stringify(config)), frozen },
    integrity, results, metrics: metrics(results) });
  writeFileSync(targets.paths[1], metricSummary(results));
  console.log(metricSummary(results));
  if (results.some(r => r.outcome.status === 'FAILURE')) process.exitCode = 2;
}
try { main(); }
catch (error) {
  console.error(JSON.stringify({ label: LABEL, status: 'FAILED_RUN', code: error instanceof LabError ? error.code : 'INVALID_INPUT_OR_IO',
    ...(error instanceof IntegrityError ? { issues: error.issues } : {}) }));
  process.exitCode = 1;
}
