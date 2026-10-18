import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { importDataset } from './importer.ts';
import { configSchema, datasetSchema, LabError, splitSchema } from './schema.ts';
import { gallerySource } from './retrievalGallery.ts';
import type { GalleryInput } from './retrievalGallery.ts';
import { loadCache, serializeCache } from './retrievalCache.ts';
import { calibrateRetrieval, evaluateRetrieval, retrievalHoldoutConfig } from './retrievalEvaluation.ts';
import { cacheBytes, inputPath, outputTargets, protectInputs, readJson } from './retrievalPaths.ts';
import { PRECOMPUTED_LABEL } from './precomputed.ts';

function markdown(report: unknown) {
  return [PRECOMPUTED_LABEL, '', 'No encoder/image inference, Android measurement or production/real quality acceptance.',
    'Cosine scores are similarities, not probabilities. All selected query failures stay visible.',
    'Recorded vectors are confined to explicit source/cache files; this summary contains no vectors or private locators.',
    '', '```json', JSON.stringify(report, null, 2), '```', ''].join('\n');
}
async function main() {
  const [command, ...args] = process.argv.slice(2); const flags = new Map<string, string>();
  const shared = ['--manifest', '--dataset-root', '--candidate', '--bundle', '--selection', '--store', '--split', '--out'];
  const allowed = [...shared, '--configs', '--choose', '--config', '--frozen', '--cache', '--cache-mode'];
  for (let i = 0; i < args.length; i += 2) {
    if (!allowed.includes(args[i]) || !args[i + 1] || args[i + 1].startsWith('--') || flags.has(args[i]))
      throw new LabError('ARGUMENTS', 'Invalid retrieval arguments');
    flags.set(args[i], args[i + 1]);
  }
  const split = splitSchema.parse(flags.get('--split'));
  const required = [...shared, ...(command === 'calibrate' ? ['--configs', '--choose'] :
    ['--cache', '--cache-mode', split === 'holdout' ? '--frozen' : '--config'])];
  if (!['calibrate', 'evaluate'].includes(command) || flags.size !== required.length || required.some(f => !flags.has(f)))
    throw new LabError('ARGUMENTS', 'Missing or conflicting retrieval arguments');
  if (command === 'calibrate' && split !== 'calibration') throw new LabError('CALIBRATION_ONLY', 'Cannot tune on holdout/development');
  const names = command === 'calibrate' ? ['retrieval-calibration.json', 'retrieval-calibration.md', 'frozen-retrieval.json'] : ['retrieval.json', 'retrieval.md'];
  const cachePath = command === 'evaluate' ? resolve(flags.get('--cache')!) : null;
  const targets = outputTargets(flags.get('--out')!, names, cachePath ? [cachePath] : []);
  const manifest = inputPath(flags.get('--manifest')!); const root = inputPath(flags.get('--dataset-root')!, true);
  // The existing importer validates root/hash/leakage. R4 additionally rejects
  // linked ancestors, including links pointing elsewhere inside the lab.
  const raw = datasetSchema.parse(JSON.parse(readFileSync(manifest, 'utf8')));
  const assets = raw.entries.map(entry => inputPath(resolve(root, entry.asset.path)));
  protectInputs(targets.paths, [manifest, ...assets, ...['--candidate', '--bundle', '--selection', '--config', '--frozen', '--configs']
    .filter(flag => flags.has(flag)).map(flag => flags.get(flag)!)]);
  const { dataset, manifestHash } = importDataset(manifest, root);
  const candidate = readJson(flags.get('--candidate')!); const bundle = readJson(flags.get('--bundle')!);
  const selection = readJson(flags.get('--selection')!);
  const input: GalleryInput = { dataset, manifestHash, candidate: candidate.value, bundle: bundle.value,
    selection: selection.value, currentStore: flags.get('--store')!, split };
  const sourceHashes = { manifest: manifestHash, candidate: candidate.sha256, bundle: bundle.sha256, selection: selection.sha256 };
  if (command === 'calibrate') {
    const configs = readJson(flags.get('--configs')!); const chosen = flags.get('--choose')!;
    if (!/^\d+$/.test(chosen)) throw new LabError('CONFIG_CHOICE', 'Explicit nonnegative choice required');
    const report = { ...calibrateRetrieval(input, configs.value, Number(chosen)), sourceHashes: { ...sourceHashes, configs: configs.sha256 },
      toolingRuntime: { node: process.versions.node }, nondeterministicFields: ['sweeps[].metrics.timing'] };
    targets.create();
    writeFileSync(targets.paths[0], JSON.stringify(report, null, 2) + '\n');
    writeFileSync(targets.paths[1], markdown(report));
    writeFileSync(targets.paths[2], JSON.stringify(report.frozen, null, 2) + '\n');
    console.log(markdown(report));
    if (report.sweeps.some(s => s.status !== 'COMPLETED')) process.exitCode = 2;
    return;
  }
  const mode = flags.get('--cache-mode')!;
  if (!['build', 'reuse', 'rebuild'].includes(mode)) throw new LabError('CACHE_MODE', 'Explicit build/reuse/rebuild mode required');
  const source = gallerySource(input);
  const configSource = readJson(flags.get(split === 'holdout' ? '--frozen' : '--config')!);
  const held = split === 'holdout' ? retrievalHoldoutConfig(configSource.value, source) : null;
  const config = held?.config ?? configSchema.parse(configSource.value);
  if (held) input.frozen = held.frozen;
  const before = mode === 'build' ? null : loadCache(cacheBytes(cachePath!), source);
  let cache = before; let rebuiltBytes: string | null = null;
  if (mode === 'build' || mode === 'rebuild' && before?.status === 'UNAVAILABLE') {
    try { rebuiltBytes = serializeCache(source); cache = loadCache(rebuiltBytes, source); }
    catch (error) {
      if (!(error instanceof LabError)) throw error;
      // evaluateRetrieval reports selected/blocked counts and reference failure.
      cache = null;
    }
  }
  const evaluation = await evaluateRetrieval(input, config, cache);
  const report = { ...evaluation, cacheAction: { requested: mode, before: before?.status === 'READY' ?
    { status: 'READY', checksum: before.checksum } : before, rebuilt: rebuiltBytes !== null },
  sourceHashes: { ...sourceHashes, configSource: configSource.sha256 }, toolingRuntime: { node: process.versions.node } };
  targets.create();
  if (rebuiltBytes !== null) writeFileSync(cachePath!, rebuiltBytes);
  writeFileSync(targets.paths[0], JSON.stringify(report, null, 2) + '\n');
  writeFileSync(targets.paths[1], markdown(report)); console.log(markdown(report));
  if (report.status !== 'COMPLETED') process.exitCode = 2;
}
try { await main(); }
catch (error) {
  console.error(JSON.stringify({ label: PRECOMPUTED_LABEL, status: 'FAILED_RUN', code: error instanceof LabError ? error.code : 'INVALID_INPUT_OR_IO' }));
  process.exitCode = 1;
}
