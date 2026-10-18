import { createRetrieval } from '../src/retrieval.ts';
import { buildGallery, gallerySource } from '../src/retrievalGallery.ts';
import { defaultConfig, LabError } from '../src/schema.ts';
import { evaluatePrecomputed } from '../src/comparison.ts';
import { galleryInput, rejectsCode, controlled, loadFixture } from './retrievalHelpers.ts';
import { sha256 } from '../src/provenance.ts';

test('known zero-stock identity, UNKNOWN and adapter failure are distinct; no business fields returned', async () => {
  const service = createRetrieval(galleryInput(), defaultConfig, 'session');
  expect(await service.query('q-a', service.context())).toMatchObject({ status: 'DECISION', decision: { status: 'STRONG',
    candidates: expect.arrayContaining([expect.objectContaining({ productId: 'a', packageId: 'single' })]) }, packageUnitNeedsConfirmation: false });
  expect(await service.query('q-u', service.context())).toMatchObject({ status: 'DECISION', decision: { status: 'UNKNOWN' } });
  expect(await service.query('q-error', service.context())).toEqual({ status: 'FAILURE', code: 'ADAPTER_ERROR', manualFallback: true });
  expect(await service.query('foreign', service.context())).toMatchObject({ status: 'INVALID' });
  expect(await service.query('ref-a', service.context())).toMatchObject({ status: 'INVALID' });
  expect(JSON.stringify(await service.query('q-a', service.context()))).not.toMatch(/price|conversion|stock/i);
});

test('all grouped reference views and package ambiguity reuse exact R2 decisions including timeout', async () => {
  const input = galleryInput('holdout'); const source = gallerySource(input);
  const expected = evaluatePrecomputed(source.adapted, defaultConfig, 'holdout');
  const service = createRetrieval(input, defaultConfig, 'session');
  expect(service.snapshot().references).toHaveLength(6);
  for (const row of expected.results!) {
    const actual = await service.query(row.queryId, service.context());
    if (row.outcome.status === 'FAILURE') expect(actual).toMatchObject({ status: 'FAILURE', code: row.outcome.code });
    else {
      expect(actual).toMatchObject({ status: 'DECISION', decision: row.outcome });
      if (row.queryId === 'hold-package-tie') expect(actual).toMatchObject({ packageUnitNeedsConfirmation: true,
        decision: { status: 'AMBIGUOUS', candidates: expect.arrayContaining([expect.objectContaining({ productId: 'a', packageId: null, packageCertain: false })]) } });
    }
  }
});

test.each(['store', 'selection-store', 'foreign-product', 'foreign-package', 'duplicate-selection', 'duplicate-package',
  'missing-package', 'unenrolled', 'duplicate-source', 'wrong-reference-package', 'empty', 'reference-failure', 'missing-reference', 'candidate'])('rejects %s gallery without partial acceptance', kind => {
  const input = galleryInput(); const selection = input.selection as ReturnType<typeof gallerySource>['selection'];
  const bundle = input.bundle as ReturnType<typeof gallerySource>['adapted']['bundle'];
  if (kind === 'store') input.currentStore = 'foreign';
  if (kind === 'selection-store') selection.storeScope = 'foreign';
  if (kind === 'foreign-product') selection.products[0].productId = 'foreign';
  if (kind === 'foreign-package') selection.products[0].packageIds = ['single-b'];
  if (kind === 'duplicate-selection') selection.products.push(selection.products[0]);
  if (kind === 'duplicate-package') selection.products[0].packageIds.push('single');
  if (kind === 'missing-package') selection.products[0].packageIds = ['single'];
  if (kind === 'unenrolled') selection.products[0].productId = 'unknown';
  if (kind === 'duplicate-source') input.dataset.entries.push(input.dataset.entries[0]);
  if (kind === 'wrong-reference-package') input.dataset.entries[0].packageId = 'single-b';
  if (kind === 'empty') selection.products = [];
  if (kind === 'reference-failure') bundle.outputs[0].output = { kind: 'failure', code: 'TIMEOUT' };
  if (kind === 'missing-reference') bundle.outputs.shift();
  if (kind === 'candidate') bundle.candidate.preprocessingSha256 = '0'.repeat(64);
  expect(() => createRetrieval(input, defaultConfig, 'session')).toThrow();
});

test('selection revision/content changes identity; selected product keeps every view', () => {
  const input = galleryInput(); const first = gallerySource(input);
  const selection = input.selection as typeof first.selection;
  selection.products = [selection.products[0]]; selection.revision = 'active-v2';
  const second = gallerySource(input);
  expect(buildGallery(second).references.map(r => r.entryId)).toEqual(['ref-a', 'ref-a-view2', 'ref-a-view3', 'ref-a-pack']);
  expect(second.binding.selectionSha256).not.toBe(first.binding.selectionSha256);
  expect(second.binding.selectionRevision).toBe('active-v2');
});

test('caller mutations of input/config/snapshots/context/loader record/results cannot alter later decisions', async () => {
  const input = galleryInput(); const config = { ...defaultConfig };
  const loader = jest.fn(async (record: unknown) => record);
  const service = createRetrieval(input, config, 'session', loader);
  const first = await service.query('q-a', service.context());
  input.dataset.entries[0].productId = 'foreign';
  (input.bundle as ReturnType<typeof gallerySource>['adapted']['bundle']).outputs[0].output = { kind: 'failure', code: 'TIMEOUT' };
  (input.selection as ReturnType<typeof gallerySource>['selection']).products.length = 0;
  config.strongAt = 1; input.split = 'holdout';
  service.snapshot().references[0].vector.fill(0); service.snapshot().binding.referenceIdentity.length = 0;
  service.context().generation = 99;
  if (first.status === 'DECISION') first.decision.candidates[0].productId = 'foreign';
  const next = await service.query('q-a', service.context());
  expect(next).toMatchObject({ status: 'DECISION', decision: { status: 'STRONG', candidates: expect.arrayContaining([expect.objectContaining({ productId: 'a' })]) } });
  expect(loader.mock.calls[0][0]).not.toBe(loader.mock.calls[1][0]);
});

test.each(['cancel', 'close'] as const)('one in-flight survives %s until controlled work settles, then late output is discarded', async mode => {
  const deferred = controlled<unknown>(); let supplied: unknown; let signal: AbortSignal | undefined;
  const service = createRetrieval(galleryInput(), defaultConfig, 'session', (record, abort) => {
    supplied = record; signal = abort; return deferred.promise;
  });
  const old = service.context(); const pending = service.query('q-a', old);
  expect(await service.query('q-a', old)).toMatchObject({ status: 'BUSY' });
  service[mode](); expect(signal?.aborted).toBe(true);
  expect(await service.query('q-a', old)).toMatchObject({ status: mode === 'close' ? 'UNAVAILABLE' : 'STALE' });
  if (mode === 'cancel') expect(await service.query('q-a', service.context())).toMatchObject({ status: 'BUSY' });
  deferred.resolve(supplied);
  expect(await pending).toMatchObject({ status: mode === 'close' ? 'STALE' : 'CANCELLED' });
});

test('new store/model/gallery service cannot receive old output; rejected work remains stale', async () => {
  const deferred = controlled<unknown>();
  const old = createRetrieval(galleryInput(), defaultConfig, 'old', () => deferred.promise);
  const pending = old.query('q-a', old.context()); old.close();
  const replacement = createRetrieval(galleryInput('calibration'), defaultConfig, 'new');
  expect(await replacement.query('cal-a', old.context())).toMatchObject({ status: 'STALE' });
  expect(await replacement.query('cal-a', replacement.context())).toMatchObject({ status: 'DECISION' });
  deferred.reject(new Error('old failure')); expect(await pending).toMatchObject({ status: 'STALE' });
});

test.each(['timeout', 'unavailable', 'throw', 'foreign', 'nan', 'zero', 'dimension'])('injected %s recorded loader never manufactures UNKNOWN', async kind => {
  const service = createRetrieval(galleryInput(), defaultConfig, 'session', async record => {
    if (kind === 'timeout') throw new LabError('TIMEOUT', 'recorded deadline');
    if (kind === 'unavailable') throw new LabError('MODEL_UNAVAILABLE', 'not available');
    if (kind === 'throw') throw new Error('private path must not escape');
    const changed = record as { entryId: string; output: { values: number[] } };
    if (kind === 'foreign') changed.entryId = 'foreign';
    if (kind === 'nan') changed.output.values[0] = NaN;
    if (kind === 'zero') changed.output.values.fill(0);
    if (kind === 'dimension') changed.output.values.pop();
    return changed;
  });
  const result = await service.query('q-a', service.context());
  expect(result.status).toBe(kind === 'unavailable' ? 'UNAVAILABLE' : ['timeout', 'throw'].includes(kind) ? 'FAILURE' : 'INVALID');
  expect(JSON.stringify(result)).not.toContain('private path');
});

test('holdout service cannot bypass candidate freeze or override config', () => {
  const input = galleryInput('holdout'); delete input.frozen;
  expect(() => createRetrieval(input, defaultConfig, 'session')).toThrow();
  rejectsCode(() => createRetrieval(galleryInput('holdout'), { ...defaultConfig, strongAt: 0.99 }, 'session'), 'FROZEN_CONFIG_OVERRIDE');
});

test('invalid contexts are explicit; equivalent context field order does not reject valid work', async () => {
  const service = createRetrieval(galleryInput(), defaultConfig, 'session'); const ctx = service.context();
  expect(await service.query('q-a', { ...ctx, generation: NaN })).toMatchObject({ status: 'INVALID' });
  expect(await service.query('q-a', Object.fromEntries(Object.entries(ctx).reverse()) as typeof ctx)).toMatchObject({ status: 'DECISION' });
});

test.each(['store', 'model', 'selection'] as const)('actual %s replacement invalidates pending old decisions', async kind => {
  const deferred = controlled<unknown>(); let recorded: unknown;
  const old = createRetrieval(galleryInput(), defaultConfig, 'session', value => { recorded = value; return deferred.promise; });
  const pending = old.query('q-a', old.context()); old.close();
  const changed = galleryInput();
  if (kind === 'store') {
    changed.dataset.storeScope = 'second-store'; changed.currentStore = 'second-store';
    (changed.selection as ReturnType<typeof gallerySource>['selection']).storeScope = 'second-store';
    changed.manifestHash = sha256(JSON.stringify(changed.dataset));
    (changed.bundle as ReturnType<typeof gallerySource>['adapted']['bundle']).dataset.manifestSha256 = changed.manifestHash;
  }
  if (kind === 'model') { changed.candidate = loadFixture('r2/toy-b'); changed.bundle = loadFixture('r2/toy-b-development'); }
  if (kind === 'selection') (changed.selection as ReturnType<typeof gallerySource>['selection']).products.pop();
  const replacement = createRetrieval(changed, defaultConfig, 'new-session');
  deferred.resolve(recorded); expect(await pending).toMatchObject({ status: 'STALE' });
  const result = await replacement.query('q-a', replacement.context()); expect(result.status).toBe('DECISION');
  expect(await replacement.query('q-a', old.context())).toMatchObject({ status: 'STALE' });
});
