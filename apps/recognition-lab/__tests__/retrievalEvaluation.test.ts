import { calibrateRetrieval, evaluateRetrieval, retrievalHoldoutConfig } from '../src/retrievalEvaluation.ts';
import { gallerySource } from '../src/retrievalGallery.ts';
import { defaultConfig } from '../src/schema.ts';
import { loadCache, serializeCache } from '../src/retrievalCache.ts';
import { galleryInput, rejectsCode } from './retrievalHelpers.ts';

test('R2 candidate/calibration/freeze/metrics reused with exact gallery binding and failures counted', async () => {
  const calibrated = calibrateRetrieval(galleryInput('calibration'), [defaultConfig], 0);
  const input = galleryInput('holdout'); const source = gallerySource(input);
  const held = retrievalHoldoutConfig(calibrated.frozen, source); input.frozen = held.frozen;
  const report = await evaluateRetrieval(input, held.config);
  expect(report.status).toBe('QUERY_FAILURES'); expect(report.r2DecisionParity).toBe(true);
  expect(report.queryAccounting).toMatchObject({ selected: 8, evaluated: 8, blockedBySetup: 0 });
  expect(report.metrics?.populations).toEqual({ total: 8, known: 6, unknown: 2, successful: 7, failed: 1, strong: 4, ambiguous: 2, refused: 1 });
  expect(report.metrics?.rates.strongJointPrecision).toMatchObject({ numerator: 2, denominator: 4 });
  expect(report.outcomes?.find(r => r.queryId === 'hold-timeout')?.outcome).toMatchObject({ status: 'FAILURE', code: 'TIMEOUT' });
  expect(JSON.stringify(report)).not.toMatch(/"values"|"vector"|assets\/|executionReference/);
  expect(calibrated.tooling.realQualityAccepted).toBe(false);
});

test.each(['store', 'revision', 'selection', 'candidate', 'reference', 'config'])('holdout refuses %s drift, not tuning or a new gallery', kind => {
  const frozen = calibrateRetrieval(galleryInput('calibration'), [defaultConfig], 0).frozen;
  const input = galleryInput('holdout'); const selected = input.selection as ReturnType<typeof gallerySource>['selection'];
  if (kind === 'store') { input.currentStore = 'other'; input.dataset.storeScope = 'other'; selected.storeScope = 'other'; }
  if (kind === 'revision') selected.revision = 'v2';
  if (kind === 'selection') selected.products.pop();
  if (kind === 'candidate') (input.bundle as ReturnType<typeof gallerySource>['adapted']['bundle']).candidate.artifactSha256 = '0'.repeat(64);
  if (kind === 'reference') (input.bundle as ReturnType<typeof gallerySource>['adapted']['bundle']).outputs[0].assetSha256 = '0'.repeat(64);
  if (kind === 'config') frozen.r2Frozen.config.strongAt = 0.99;
  expect(() => retrievalHoldoutConfig(frozen, gallerySource(input))).toThrow();
});

test('partial active selection changes query known population honestly; calibration cannot use full-gallery R2 freeze for it', async () => {
  const input = galleryInput(); const source = gallerySource(input);
  (input.selection as typeof source.selection).products = source.selection.products.filter(p => p.productId === 'b');
  const report = await evaluateRetrieval(input, defaultConfig);
  expect(report.metrics?.populations).toMatchObject({ total: 3, known: 0, unknown: 3, failed: 1 });
  const calibration = galleryInput('calibration'); calibration.selection = input.selection;
  rejectsCode(() => calibrateRetrieval(calibration, [defaultConfig], 0), 'CALIBRATION_SELECTION');
});

test('missing/corrupt cache blocks all selected queries with null metrics; rebuilding preserves decisions', async () => {
  const input = galleryInput(); const source = gallerySource(input);
  const missing = await evaluateRetrieval(input, defaultConfig, loadCache(null, source));
  expect(missing).toMatchObject({ status: 'SETUP_FAILURE', setupCode: 'CACHE_MISSING', metrics: null, outcomes: null,
    queryAccounting: { selected: 3, evaluated: 0, blockedBySetup: 3, reportedQueryFailures: [{ entryId: 'q-error', code: 'ADAPTER_ERROR' }] } });
  const cache = loadCache(serializeCache(source), source);
  const fresh = await evaluateRetrieval(input, defaultConfig); const reopened = await evaluateRetrieval(input, defaultConfig, cache);
  expect(reopened.outcomes).toEqual(fresh.outcomes); expect(reopened.metrics?.rates).toEqual(fresh.metrics?.rates);
});

test('failed reference retains selected counts plus every reported query failure without accepting a partial gallery', async () => {
  const input = galleryInput();
  (input.bundle as ReturnType<typeof gallerySource>['adapted']['bundle']).outputs[0].output = { kind: 'failure', code: 'TIMEOUT' };
  const report = await evaluateRetrieval(input, defaultConfig);
  expect(report).toMatchObject({ status: 'SETUP_FAILURE', setupCode: 'REFERENCE_ENCODING_FAILURE', metrics: null, results: null,
    referenceFailures: [{ entryId: 'ref-a', code: 'TIMEOUT' }], queryAccounting: { selected: 3, evaluated: 0, blockedBySetup: 3 } });
});

test.each(['development', 'holdout'] as const)('calibration rejects %s before any gallery', split => {
  rejectsCode(() => calibrateRetrieval(galleryInput(split), [defaultConfig], 0), 'CALIBRATION_ONLY');
});
