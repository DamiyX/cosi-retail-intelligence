import { calibrateRetrieval, evaluateRetrieval } from '../src/retrievalEvaluation.ts';
import { createRetrieval } from '../src/retrieval.ts';
import { defaultConfig } from '../src/schema.ts';
import { gallerySource } from '../src/retrievalGallery.ts';
import { galleryInput } from './retrievalHelpers.ts';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { sha256 } from '../src/provenance.ts';

test.each(['missing', 'inner-only', 'selection', 'revision', 'store', 'reference', 'config'] as const)(
  'FA-01 public holdout evaluator rejects %s before queries/metrics, even with an unavailable cache', async kind => {
    const frozen = calibrateRetrieval(galleryInput('calibration'), [defaultConfig], 0).frozen;
    const input = galleryInput('holdout'); input.frozen = frozen;
    const selected = input.selection as ReturnType<typeof gallerySource>['selection'];
    let config = defaultConfig;
    if (kind === 'missing') delete input.frozen;
    if (kind === 'inner-only') input.frozen = frozen.r2Frozen;
    if (kind === 'selection') selected.products.shift();
    if (kind === 'revision') selected.revision = 'changed';
    if (kind === 'store') { input.dataset.storeScope = 'changed'; input.currentStore = 'changed'; selected.storeScope = 'changed'; }
    if (kind === 'reference') (input.bundle as ReturnType<typeof gallerySource>['adapted']['bundle']).outputs[0].output =
      { kind: 'vector', space: 'toy-a-v1', values: [0, 1, 0] };
    if (kind === 'config') config = { ...defaultConfig, strongAt: 0.99 };
    const code = ['missing', 'inner-only'].includes(kind) ? 'RETRIEVAL_NOT_FROZEN' :
      kind === 'config' ? 'FROZEN_CONFIG_OVERRIDE' : 'FROZEN_GALLERY_MISMATCH';
    await expect(evaluateRetrieval(input, config, { status: 'UNAVAILABLE', code: 'CACHE_MISSING',
      rebuildRequired: true, manualFallback: true })).rejects.toMatchObject({ code });
    expect(() => createRetrieval(input, config, 'holdout')).toThrow();
  });

test('FA-01 exact calibrated wrapper remains valid for direct evaluation and generic recorded-query facade', async () => {
  const input = galleryInput('holdout'); input.frozen = calibrateRetrieval(galleryInput('calibration'), [defaultConfig], 0).frozen;
  const report = await evaluateRetrieval(input, defaultConfig);
  expect(report.status).toBe('QUERY_FAILURES'); expect(report.queryAccounting.evaluated).toBe(8);
  expect(report.metrics?.rates.strongJointPrecision).toMatchObject({ numerator: 2, denominator: 4 });
  const service = createRetrieval(input, defaultConfig, 'same');
  expect(await service.query('hold-a', service.context())).toMatchObject({ status: 'DECISION' });
});

test.each(['selection', 'unchanged', 'config'] as const)('FA-02 old same-session context is STALE after %s reconstruction', async kind => {
  const first = createRetrieval(galleryInput(), defaultConfig, 'same-session'); const context = first.context(); first.close();
  const input = galleryInput();
  if (kind === 'selection') (input.selection as ReturnType<typeof gallerySource>['selection']).products.pop();
  const loader = jest.fn(async (value: unknown) => value);
  const second = createRetrieval(input, kind === 'config' ? { ...defaultConfig, strongAt: 0.99 } : defaultConfig, 'same-session', loader);
  expect(await second.query('q-a', context)).toMatchObject({ status: 'STALE', code: 'QUERY_CONTEXT_CHANGED' });
  expect(loader).not.toHaveBeenCalled();
  expect(second.context()).not.toEqual(context);
  expect(await second.query('q-a', second.context())).toMatchObject({ status: 'DECISION' });
  expect(loader).toHaveBeenCalledTimes(1);
});

test.each(['missing', 'inner-only', 'selection', 'revision', 'store', 'reference', 'config'] as const)(
  'FA-01 actual holdout CLI rejects %s before touching pre-existing reports/cache', kind => {
    const repo = resolve(__dirname, '../../..'); const lab = resolve(repo, 'apps/recognition-lab');
    const fixtures = resolve(lab, 'fixtures'); const base = resolve(lab, 'runs/r4-freeze-correction-tests');
    mkdirSync(base, { recursive: true }); const directory = mkdtempSync(resolve(base, 'case-'));
    const file = (name: string, value: unknown) => {
      const path = resolve(directory, name); writeFileSync(path, JSON.stringify(value)); return path;
    };
    const read = (name: string) => JSON.parse(readFileSync(resolve(fixtures, name), 'utf8'));
    const frozen = calibrateRetrieval(galleryInput('calibration'), [defaultConfig], 0).frozen;
    const selection = read('r4/selection.json'); const bundle = read('r2/toy-a-holdout.json');
    let manifest = resolve(fixtures, 'dataset.json'); let datasetRoot = fixtures; let store = 'synthetic-store';
    if (kind === 'selection') selection.products.shift();
    if (kind === 'revision') selection.revision = 'changed';
    if (kind === 'store') {
      const dataset = read('dataset.json'); store = dataset.storeScope = selection.storeScope = 'changed';
      datasetRoot = directory;
      for (const entry of dataset.entries) {
        const path = resolve(directory, entry.asset.path); mkdirSync(dirname(path), { recursive: true });
        copyFileSync(resolve(fixtures, entry.asset.path), path);
      }
      manifest = file('dataset.json', dataset); bundle.dataset.manifestSha256 = sha256(readFileSync(manifest));
    }
    if (kind === 'reference') bundle.outputs[0].output = { kind: 'vector', space: 'toy-a-v1', values: [0, 1, 0] };
    const outputs = ['retrieval.json', 'retrieval.md', 'gallery.json'].map(name => resolve(directory, name));
    for (const path of outputs) writeFileSync(path, 'PRESERVE ' + path);
    const hashes = outputs.map(path => sha256(readFileSync(path)));
    const argv = [resolve(lab, 'src/retrievalCli.ts'), 'evaluate', '--manifest', manifest, '--dataset-root', datasetRoot,
      '--candidate', resolve(fixtures, 'r2/toy-a.json'), '--bundle', file('bundle.json', bundle),
      '--selection', file('selection.json', selection), '--store', store, '--split', 'holdout',
      '--out', directory, '--cache', outputs[2], '--cache-mode', 'reuse',
      ...(kind === 'missing' ? [] : ['--frozen', file('freeze.json', kind === 'inner-only' ? frozen.r2Frozen : frozen)]),
      ...(kind === 'config' ? ['--config', resolve(fixtures, 'r2/config.json')] : [])];
    const result = spawnSync(process.execPath, argv, { cwd: repo, encoding: 'utf8' });
    expect(result.status).toBe(1); expect(result.stdout).toBe('');
    expect(result.stderr).toContain(['missing', 'config'].includes(kind) ? 'ARGUMENTS' :
      kind === 'inner-only' ? 'RETRIEVAL_NOT_FROZEN' : 'FROZEN_GALLERY_MISMATCH');
    expect(outputs.map(path => sha256(readFileSync(path)))).toEqual(hashes);
  });
