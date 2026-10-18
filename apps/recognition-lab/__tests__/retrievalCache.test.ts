import { loadCache, serializeCache } from '../src/retrievalCache.ts';
import { gallerySource } from '../src/retrievalGallery.ts';
import { createRetrieval } from '../src/retrieval.ts';
import { defaultConfig } from '../src/schema.ts';
import { sha256 } from '../src/provenance.ts';
import { galleryInput, controlled } from './retrievalHelpers.ts';
import { metrics } from '../src/metrics.ts';
import type { QueryResult } from '../src/experiment.ts';

test('serialized round-trip is exact, deterministic, disposable, and preserves holdout decisions/metrics', async () => {
  const input = galleryInput('holdout'); const source = gallerySource(input); const bytes = serializeCache(source);
  expect(serializeCache(source)).toBe(bytes);
  const loaded = loadCache(bytes, source); expect(loaded.status).toBe('READY');
  if (loaded.status !== 'READY') throw new Error('cache unavailable');
  const fresh = createRetrieval(input, defaultConfig, 'session');
  const reopened = createRetrieval(input, defaultConfig, 'session', undefined, loaded.snapshot);
  const a: QueryResult[] = []; const b: QueryResult[] = [];
  for (const entry of source.adapted.adapted.entries.filter(e => e.role === 'query')) {
    const first = await fresh.query(entry.id, fresh.context()); const second = await reopened.query(entry.id, reopened.context());
    expect(second).toEqual(first);
    const row = { queryId: entry.id, truth: { productId: entry.productId, packageId: entry.packageId, known: entry.known },
      split: input.split, lighting: entry.capture.lighting, view: entry.capture.view, elapsedMs: 0 };
    a.push({ ...row, outcome: first.status === 'DECISION' ? first.decision : { status: 'FAILURE', code: first.code } });
    b.push({ ...row, outcome: second.status === 'DECISION' ? second.decision : { status: 'FAILURE', code: second.code } });
  }
  expect(metrics(a)).toEqual(metrics(b));
  loaded.snapshot.references[0].vector.fill(0); loaded.snapshot.binding.storeScope = 'foreign';
  expect(await reopened.query('hold-a', reopened.context())).toEqual(await fresh.query('hold-a', fresh.context()));
  expect(bytes).not.toMatch(/asset.path|fixtures\/|price|conversion/);
});

test.each(['missing', 'json', 'checksum', 'format', 'dimension', 'zero', 'nan', 'duplicate', 'missing-reference',
  'foreign-product', 'foreign-package', 'asset', 'model', 'preprocessing', 'store', 'dataset', 'selection-revision',
  'selection-content', 'reference-output', 'values', 'unknown-field'])('cache %s refuses even recomputed checksums and leaves sources intact', kind => {
  const source = gallerySource(galleryInput()); const before = JSON.stringify(source); const bytes = serializeCache(source);
  const cache = JSON.parse(bytes);
  if (kind === 'checksum') cache.checksum = '0'.repeat(64);
  if (kind === 'format') cache.format = 'lab-derived-gallery-v2';
  if (kind === 'dimension') cache.snapshot.references[0].vector.pop();
  if (kind === 'zero') cache.snapshot.references[0].vector.fill(0);
  if (kind === 'nan') cache.snapshot.references[0].vector[0] = NaN;
  if (kind === 'duplicate') cache.snapshot.references.push(cache.snapshot.references[0]);
  if (kind === 'missing-reference') cache.snapshot.references.pop();
  if (kind === 'foreign-product') cache.snapshot.binding.referenceIdentity[0].productId = 'foreign';
  if (kind === 'foreign-package') cache.snapshot.binding.referenceIdentity[0].packageId = 'single-b';
  if (kind === 'asset') cache.snapshot.binding.referenceIdentity[0].assetSha256 = '0'.repeat(64);
  if (kind === 'model') cache.snapshot.binding.candidate.artifactSha256 = '0'.repeat(64);
  if (kind === 'preprocessing') cache.snapshot.binding.candidate.preprocessingSha256 = '0'.repeat(64);
  if (kind === 'store') cache.snapshot.binding.storeScope = 'foreign';
  if (kind === 'dataset') cache.snapshot.binding.dataset.version = 'v3';
  if (kind === 'selection-revision') cache.snapshot.binding.selectionRevision = 'v3';
  if (kind === 'selection-content') cache.snapshot.binding.selectionSha256 = '0'.repeat(64);
  if (kind === 'reference-output') cache.snapshot.binding.referenceOutputsSha256 = '0'.repeat(64);
  if (kind === 'values') cache.snapshot.references[0].vector[0] *= -1;
  if (kind === 'unknown-field') cache.snapshot.extra = true;
  if (kind !== 'checksum') { const { checksum: _checksum, ...payload } = cache; cache.checksum = sha256(JSON.stringify(payload)); }
  const outcome = loadCache(kind === 'missing' ? null : kind === 'json' ? '{bad' : JSON.stringify(cache), source);
  expect(outcome).toMatchObject({ status: 'UNAVAILABLE', rebuildRequired: true, manualFallback: true });
  expect(JSON.stringify(source)).toBe(before);
  expect(loadCache(bytes, source).status).toBe('READY');
});

test('exact active-selection or reference binding change forces explicit rebuild, not reuse', () => {
  const input = galleryInput(); const source = gallerySource(input); const bytes = serializeCache(source);
  (input.selection as typeof source.selection).revision = 'changed';
  expect(loadCache(bytes, gallerySource(input))).toMatchObject({ status: 'UNAVAILABLE', code: 'CACHE_INCOMPATIBLE' });
  const changed = gallerySource(input);
  const rebased = serializeCache(changed); expect(loadCache(rebased, changed).status).toBe('READY');
});

test('failed reference prohibits stale compatible cache; no partial gallery or valid UNKNOWN', () => {
  const input = galleryInput(); const source = gallerySource(input); const bytes = serializeCache(source);
  (input.bundle as typeof source.adapted.bundle).outputs[0].output = { kind: 'failure', code: 'TIMEOUT' };
  const failed = gallerySource(input);
  expect(loadCache(bytes, failed)).toMatchObject({ status: 'UNAVAILABLE', code: 'SOURCE_UNAVAILABLE' });
  expect(() => serializeCache(failed)).toThrow('requires rebuild');
});

test('reopened gallery close discards work before replacement cache/model/selection becomes current', async () => {
  const input = galleryInput(); const source = gallerySource(input); const cached = loadCache(serializeCache(source), source);
  if (cached.status !== 'READY') throw new Error('cache unavailable');
  const deferred = controlled<unknown>(); let record: unknown;
  const old = createRetrieval(input, defaultConfig, 'old', value => { record = value; return deferred.promise; }, cached.snapshot);
  const work = old.query('q-a', old.context()); old.close();
  const changed = galleryInput(); (changed.selection as typeof source.selection).revision = 'v2';
  const replacement = createRetrieval(changed, defaultConfig, 'new');
  expect(await replacement.query('q-a', old.context())).toMatchObject({ status: 'STALE' });
  deferred.resolve(record); expect(await work).toMatchObject({ status: 'STALE' });
  expect(await replacement.query('q-a', replacement.context())).toMatchObject({ status: 'DECISION' });
});
