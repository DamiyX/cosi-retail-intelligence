import { lstatSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, parse, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { importDataset } from './importer.ts';
import { LabError } from './schema.ts';
import { sha256 } from './provenance.ts';
import { DEVICE_LABEL, benchmarkReport, validateBenchmark } from './deviceBenchmark.ts';
import { equivalenceReport } from './deviceEquivalence.ts';
const lab = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function load(path: string) {
  const bytes = readFileSync(resolve(path));
  return { value: JSON.parse(bytes.toString('utf8')) as unknown, fileSha256: sha256(bytes) };
}
function within(root: string, path: string) {
  const rel = relative(root, path);
  return rel === '' || !isAbsolute(rel) && rel !== '..' && !rel.startsWith('../') && !rel.startsWith('..\\');
}
function existing(path: string) {
  // lstat also detects dangling links, unlike existsSync.
  try { return lstatSync(path); } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}
function outputTargets(path: string, inputs: string[]) {
  const root = resolve(lab, 'runs'); const location = resolve(path);
  if (!within(root, location)) throw new LabError('OUTPUT_OUTSIDE_RUNS', 'Output requires ignored lab runs');
  const paths = ['device-benchmark.json', 'device-benchmark.md'].map(name => resolve(location, name));
  // Preflight ALL destinations and ancestors before creating anything. Includes
  // dangling links and hardlinked final files, not just directory confinement.
  for (const target of [location, ...paths]) {
    let current = parse(target).root;
    for (const part of relative(current, target).split(sep)) {
      current = resolve(current, part); const stat = existing(current);
      const directory = current !== target || target === location;
      if (stat && (stat.isSymbolicLink() || (directory ? !stat.isDirectory() : !stat.isFile())))
        throw new LabError('OUTPUT_OUTSIDE_RUNS', 'Linked or invalid output path prohibited');
      if (stat && !directory && stat.nlink > 1)
        throw new LabError('OUTPUT_LINKED', 'Hardlinked output file prohibited');
    }
  }
  const key = (path: string) => process.platform === 'win32' ? path.toLowerCase() : path;
  const protectedPaths = new Set(inputs.map(path => key(realpathSync(resolve(path)))));
  // Windows realpath can preserve8.3 spelling. Exact bigint device/inode identity
  // also protects an input reached through a short name or other path alias.
  const identity = (path: string) => { const stat = statSync(path, { bigint: true }); return stat.dev + ':' + stat.ino; };
  const protectedFiles = new Set(inputs.map(identity));
  if (paths.some(path => protectedPaths.has(key(existing(path) ? realpathSync(path) : path)) ||
    existing(path) && protectedFiles.has(identity(path))))
    throw new LabError('OUTPUT_INPUT_COLLISION', 'Outputs cannot replace source inputs');
  return { paths, create: () => mkdirSync(location, { recursive: true }) };
}
function main() {
  const [command, ...args] = process.argv.slice(2);
  const required = ['--manifest', '--dataset-root', '--candidate', '--target', '--record', '--out'];
  const flags = new Map<string, string>();
  for (let i = 0; i < args.length; i += 2) {
    if (![...required, '--reference-bundle', '--pairs'].includes(args[i]) || !args[i + 1] ||
      args[i + 1].startsWith('--') || flags.has(args[i])) throw new LabError('ARGUMENTS', 'Invalid benchmark arguments');
    flags.set(args[i], args[i + 1]);
  }
  if (command !== 'analyze' || required.some(key => !flags.has(key)) ||
    flags.has('--reference-bundle') !== flags.has('--pairs')) throw new LabError('ARGUMENTS', 'Missing or conflicting arguments');
  const { dataset, manifestHash } = importDataset(resolve(flags.get('--manifest')!), resolve(flags.get('--dataset-root')!));
  const candidate = load(flags.get('--candidate')!); const target = load(flags.get('--target')!); const record = load(flags.get('--record')!);
  const validated = validateBenchmark(dataset, manifestHash, candidate.value, target.value, record.value);
  const benchmark = benchmarkReport(validated);
  const reference = flags.has('--reference-bundle') ? load(flags.get('--reference-bundle')!) : null;
  const pairs = flags.has('--pairs') ? load(flags.get('--pairs')!) : null;
  const equivalence = reference && pairs ? equivalenceReport(dataset, manifestHash, candidate.value, validated, reference.value, pairs.value) : null;
  const incompleteOrFailed = benchmark.missingCoverage.length > 0 || benchmark.counts.failed > 0 || benchmark.observedConcerns.length > 0 ||
    equivalence === null || equivalence.counts.failed > 0 || equivalence.counts.drift > 0;
  const report = { schemaVersion: 1, label: benchmark.label,
    analysisStatus: incompleteOrFailed ? 'INCOMPLETE_OR_RECORDED_FAILURE' : 'SUPPLIED_RECORD_ANALYZED',
    benchmark, equivalence, missingAnalysis: equivalence === null ? ['paired-equivalence-not-supplied'] : [],
    sourceHashes: { manifest: manifestHash, candidate: candidate.fileSha256, target: target.fileSha256, record: record.fileSha256,
      reference: reference?.fileSha256 ?? null, pairs: pairs?.fileSha256 ?? null },
    tooling: { node: process.versions.node, encoderExecuted: false, deviceWorkMeasured: false,
      independentAcceptance: 'PENDING_NOT_AUTOMATED', nativePass: false } };
  const markdown = [report.label, '', 'Analysis status: ' + report.analysisStatus,
    'No inference, Android work or device latency is executed/measured. Native acceptance remains PENDING.',
    'Inventory: supplied record only. No completeness or truth attestation is independently verified.',
    '', 'Bindings: ' + JSON.stringify({ dataset: benchmark.dataset, candidate: benchmark.candidate, target: benchmark.target, device: benchmark.device }),
    'Counts: ' + JSON.stringify(benchmark.counts), 'Missing coverage: ' + JSON.stringify(benchmark.missingCoverage),
    'Observed concerns: ' + JSON.stringify(benchmark.observedConcerns), 'Missing analysis: ' + JSON.stringify(report.missingAnalysis),
    '', '| Stage | Phase | Attempts | Success | Failure | Warmups | Median ms | p90 ms | p95 ms |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...benchmark.groups.map(g => '| ' + [g.stage, g.phase, g.attempted, g.successful, g.failed, g.warmupAttempts,
      g.timing.median ?? 'unmeasured', g.timing.p90 ?? 'insufficient sample', g.timing.p95 ?? 'insufficient sample'].join(' | ') + ' |'),
    '', 'Supplied observations (measured fields versus separate extrapolations): ' + JSON.stringify(benchmark.suppliedObservations),
    'Recorded equivalence: ' + JSON.stringify(equivalence), '', ...benchmark.limitations.map(l => '- ' + l), ''].join('\n');
  const sourcePaths = [flags.get('--manifest')!, flags.get('--candidate')!, flags.get('--target')!, flags.get('--record')!,
    ...dataset.entries.map(entry => resolve(flags.get('--dataset-root')!, entry.asset.path)),
    ...(reference && pairs ? [flags.get('--reference-bundle')!, flags.get('--pairs')!] : [])];
  const targets = outputTargets(flags.get('--out')!, sourcePaths);
  const serialized = JSON.stringify(report, null, 2) + '\n';
  targets.create();
  writeFileSync(targets.paths[0], serialized);
  writeFileSync(targets.paths[1], markdown);
  console.log(markdown);
  if (incompleteOrFailed) process.exitCode = 2;
}
try { main(); }
catch (error) {
  console.error(JSON.stringify({ label: DEVICE_LABEL, status: 'FAILED_RUN', code: error instanceof LabError ? error.code : 'INVALID_INPUT_OR_IO' }));
  process.exitCode = 1;
}
