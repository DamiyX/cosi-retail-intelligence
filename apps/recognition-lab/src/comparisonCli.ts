import { lstatSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, parse, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { importDataset } from './importer.ts';
import { configSchema, LabError, splitSchema } from './schema.ts';
import { compareCandidates, comparisonSummary } from './comparison.ts';
import { PRECOMPUTED_LABEL } from './precomputed.ts';
import { gitState, sha256 } from './provenance.ts';
import { calibrateCandidate } from './candidateCalibration.ts';
import { holdoutCandidateConfig } from './candidateFreeze.ts';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const lab = resolve(repo, 'apps/recognition-lab');
function load(path: string): { value: unknown; fileHash: string } {
  const bytes = readFileSync(resolve(path));
  return { value: JSON.parse(bytes.toString('utf8')), fileHash: sha256(bytes) };
}
function existing(path: string) {
  // lstat detects dangling symlinks too; existsSync follows them and misses them.
  try { return lstatSync(path); } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}
// Preflight the entire output set, including secondary reports/freeze, before
// creating directories or writing anything. Sequential local filesystem use only.
function outputTargets(path: string, names: string[], inputs: string[]) {
  const location = resolve(path); const root = resolve(lab, 'runs');
  const within = (base: string, target: string) => {
    const rel = relative(base, target);
    return rel === '' || !isAbsolute(rel) && rel !== '..' && !rel.startsWith('../') && !rel.startsWith('..\\');
  };
  if (!within(root, location)) throw new LabError('OUTPUT_OUTSIDE_RUNS', 'Output must be in ignored lab runs');
  const paths = names.map(name => resolve(location, name));
  for (const target of [location, ...paths]) {
    let current = parse(target).root;
    for (const part of relative(current, target).split(sep)) {
      current = resolve(current, part); const stat = existing(current);
      const directory = current !== target || target === location;
      if (stat && (stat.isSymbolicLink() || (directory ? !stat.isDirectory() : !stat.isFile() || stat.nlink > 1)))
        throw new LabError(directory ? 'OUTPUT_OUTSIDE_RUNS' : 'OUTPUT_LINKED', 'Linked or invalid output path prohibited');
    }
  }
  const key = (path: string) => process.platform === 'win32' ? path.toLowerCase() : path;
  const protectedPaths = new Set(inputs.map(path => key(realpathSync(resolve(path)))));
  // realpath can retain Windows 8.3 spelling. Compare physical file identities
  // too, using bigint to avoid rounding 64-bit inode values into false matches.
  const identity = (path: string) => { const stat = statSync(path, { bigint: true }); return stat.dev + ':' + stat.ino; };
  const protectedFiles = new Set(inputs.map(identity));
  if (paths.some(path => protectedPaths.has(key(existing(path) ? realpathSync(path) : path)) ||
    existing(path) && protectedFiles.has(identity(path))))
    throw new LabError('OUTPUT_INPUT_COLLISION', 'Outputs cannot replace source inputs');
  return { paths, create: () => mkdirSync(location, { recursive: true }) };
}
const inputSchema = z.array(z.object({ candidate: z.string().min(1), bundle: z.string().min(1),
  config: z.string().min(1).optional(), frozen: z.string().min(1).optional() }).strict()).min(1).max(3);
function main() {
  const [command, ...args] = process.argv.slice(2);
  const flags = new Map<string, string>();
  for (let i = 0; i < args.length; i += 2) {
    if (!['--manifest', '--dataset-root', '--split', '--out', '--inputs', '--candidate', '--bundle', '--configs', '--choose'].includes(args[i]) || !args[i + 1] || args[i + 1].startsWith('--') || flags.has(args[i]))
      throw new LabError('ARGUMENTS', 'Invalid comparison arguments');
    flags.set(args[i], args[i + 1]);
  }
  const required = ['--manifest', '--dataset-root', '--split', '--out', ...(command === 'compare' ? ['--inputs'] : ['--candidate', '--bundle', '--configs', '--choose'])];
  if (!['compare', 'calibrate'].includes(command) || flags.size !== required.length || required.some(f => !flags.has(f)))
    throw new LabError('ARGUMENTS', 'Missing or conflicting comparison/calibration arguments');
  const split = splitSchema.parse(flags.get('--split'));
  const { dataset, manifestHash } = importDataset(resolve(flags.get('--manifest')!), resolve(flags.get('--dataset-root')!));
  const sourcePaths = [flags.get('--manifest')!, ...dataset.entries.map(entry => resolve(flags.get('--dataset-root')!, entry.asset.path))];
  if (command === 'calibrate') {
    const candidate = load(flags.get('--candidate')!); const bundle = load(flags.get('--bundle')!); const configs = load(flags.get('--configs')!);
    const chosen = flags.get('--choose')!;
    if (!/^\d+$/.test(chosen)) throw new LabError('CONFIG_CHOICE', 'Explicit nonnegative integer choice required');
    const report = calibrateCandidate(dataset, manifestHash, candidate.value, bundle.value, configs.value, Number(chosen), split);
    const targets = outputTargets(flags.get('--out')!, ['calibration.json', 'frozen-candidate.json', 'calibration.md'],
      [...sourcePaths, flags.get('--candidate')!, flags.get('--bundle')!, flags.get('--configs')!]);
    const serialized = JSON.stringify({ provenance: { ...gitState(repo), node: process.versions.node,
      sourceHashes: { candidate: candidate.fileHash, bundle: bundle.fileHash, configs: configs.fileHash },
      nondeterministicFields: ['sweeps[].results[].elapsedMs', 'sweeps[].metrics.timing'] }, ...report }, null, 2) + '\n';
    const summary = [report.label, 'Encoder execution: NONE. Calibration only; explicit choice ' + chosen,
      report.limitation, ...report.limitations.map(l => '- ' + l),
      ...report.sweeps.map(s => 'Config ' + s.provenance.configHash + ': ' + s.status + '; ' + JSON.stringify(s.metrics?.rates)),
      'Frozen candidate binding: ' + JSON.stringify(report.frozen), ''].join('\n');
    targets.create();
    writeFileSync(targets.paths[0], serialized);
    writeFileSync(targets.paths[1], JSON.stringify(report.frozen, null, 2) + '\n');
    writeFileSync(targets.paths[2], summary); console.log(summary);
    if (report.sweeps.some(s => s.status !== 'COMPLETED')) process.exitCode = 2;
    return;
  }
  const list = load(flags.get('--inputs')!);
  sourcePaths.push(flags.get('--inputs')!);
  const inputs = inputSchema.parse(list.value).map(item => {
    const candidate = load(item.candidate); const bundle = load(item.bundle);
    if (split === 'holdout' ? !item.frozen || item.config !== undefined : !item.config || item.frozen !== undefined)
      throw new LabError('CONFIG_NOT_FROZEN', 'Holdout requires candidate-bound frozen only; other splits require explicit config only');
    const source = load(split === 'holdout' ? item.frozen! : item.config!);
    sourcePaths.push(item.candidate, item.bundle, split === 'holdout' ? item.frozen! : item.config!);
    const config = split === 'holdout' ? holdoutCandidateConfig(source.value, dataset, manifestHash, candidate.value) : configSchema.parse(source.value);
    return { candidate: candidate.value, bundle: bundle.value, config, ...(split === 'holdout' ? { frozen: source.value } : {}),
      sourceHashes: { candidateFileSha256: candidate.fileHash, bundleFileSha256: bundle.fileHash,
        configSourceFileSha256: source.fileHash, configSourceKind: split === 'holdout' ? 'frozen-candidate' : 'explicit-config' } };
  });
  const report = compareCandidates(dataset, manifestHash, split, inputs);
  const targets = outputTargets(flags.get('--out')!, ['comparison.json', 'comparison.md'], sourcePaths);
  const provenance = { ...gitState(repo), runtime: { node: process.versions.node, platform: process.platform, arch: process.arch },
    inputListFileSha256: list.fileHash, sourceHashes: inputs.map(i => i.sourceHashes),
    nondeterministicFields: ['candidates[].results[].elapsedMs', 'candidates[].metrics.timing'] };
  const serialized = JSON.stringify({ provenance, ...report }, null, 2) + '\n';
  const summary = comparisonSummary(report);
  targets.create();
  writeFileSync(targets.paths[0], serialized);
  writeFileSync(targets.paths[1], summary);
  console.log(summary);
  if (report.candidates.some(c => c.status !== 'COMPLETED')) process.exitCode = 2;
}
try { main(); }
catch (error) {
  console.error(JSON.stringify({ label: PRECOMPUTED_LABEL, status: 'FAILED_RUN', code: error instanceof LabError ? error.code : 'INVALID_INPUT_OR_IO' }));
  process.exitCode = 1;
}
