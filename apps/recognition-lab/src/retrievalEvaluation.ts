import { performance } from 'node:perf_hooks';
import { calibrateCandidate } from './candidateCalibration.ts';
import { comparisonLimits, evaluatePrecomputed } from './comparison.ts';
import { metrics } from './metrics.ts';
import type { QueryResult } from './experiment.ts';
import { PRECOMPUTED_LABEL } from './precomputed.ts';
import { sha256 } from './provenance.ts';
import { configSchema, LabError } from './schema.ts';
import type { Config } from './schema.ts';
import { buildGallery, gallerySource, retrievalFreezeSchema, retrievalHoldoutConfig } from './retrievalGallery.ts';
import type { GalleryInput } from './retrievalGallery.ts';
import { createRetrieval } from './retrieval.ts';
import type { RetrievalOutcome } from './retrieval.ts';
import type { CacheOutcome } from './retrievalCache.ts';

export { retrievalFreezeSchema, retrievalHoldoutConfig } from './retrievalGallery.ts';
export const retrievalLimits = [...comparisonLimits,
  'Lab gallery/cache is disposable derived JSON preparation, not an approved production persistence/storage design.',
  'Explicit active selection includes zero-stock identities. Queries cannot enroll unknown products or write business data.',
  'Cache checksums detect drift, not signed provenance. Reopening revalidates against complete current sources.',
  'Close the old facade before switching store/model/gallery/session. One pending loader stays occupied until settlement; cancellation invalidates output, not guaranteed compute termination.',
];

export function calibrateRetrieval(input: GalleryInput, configs: unknown, chosen: number) {
  if (input.split !== 'calibration') throw new LabError('CALIBRATION_ONLY', 'Retrieval calibration only uses calibration queries');
  const source = gallerySource(input); buildGallery(source);
  // R2 calibrates its complete gallery. Avoid silently calibrating one gallery
  // and evaluating a different selection; subset calibration is not introduced.
  if (source.references.length !== source.dataset.entries.filter(e => e.role === 'reference').length)
    throw new LabError('CALIBRATION_SELECTION', 'R2 calibration requires every enrolled product');
  const calibrated = calibrateCandidate(source.dataset, input.manifestHash, input.candidate, input.bundle, configs, chosen, 'calibration');
  return { label: PRECOMPUTED_LABEL, binding: source.binding,
    sweeps: calibrated.sweeps.map(s => ({ status: s.status, config: s.provenance.config,
      queryAccounting: s.queryAccounting, metrics: s.metrics })),
    frozen: retrievalFreezeSchema.parse({ schemaVersion: 1, format: 'lab-retrieval-freeze-v1',
      galleryBindingSha256: sha256(JSON.stringify(source.binding)), r2Frozen: calibrated.frozen }),
    limitations: retrievalLimits, tooling: { encoderExecuted: false, deviceWorkMeasured: false, realQualityAccepted: false,
      independentAcceptance: 'PENDING_NOT_AUTOMATED' } };
}
export async function evaluateRetrieval(input: GalleryInput, configInput: Config, cache: CacheOutcome | null = null) {
  input = structuredClone(input);
  const source = gallerySource(input); const config = configSchema.parse(configInput);
  // Evaluation integrity rejects before setup accounting, query iteration or
  // metrics. A cache failure must not conceal an invalid holdout freeze.
  if (input.split === 'holdout') {
    const held = retrievalHoldoutConfig(input.frozen, source);
    if (JSON.stringify(config) !== JSON.stringify(held.config)) throw new LabError('FROZEN_CONFIG_OVERRIDE', 'Holdout config changed');
  } else if (input.frozen !== undefined) throw new LabError('FROZEN_SPLIT', 'Frozen config is for holdout only');
  const selectedIds = new Set(source.selection.products.map(p => p.productId));
  const queries = source.adapted.adapted.entries.filter(e => e.role === 'query');
  const reportedQueryFailures = queries.filter(e => e.observation?.kind === 'failure').map(e => ({
    entryId: e.id, code: e.observation?.kind === 'failure' ? e.observation.code : 'ADAPTER_ERROR' }));
  const referenceFailures = source.references.filter(e => e.observation?.kind === 'failure').map(e => ({
    entryId: e.id, code: e.observation?.kind === 'failure' ? e.observation.code : 'ADAPTER_ERROR' }));
  const common = { schemaVersion: 1, label: (source.dataset.kind === 'synthetic-tooling-only' ? 'SYNTHETIC TOOLING-ONLY — ' : '') + PRECOMPUTED_LABEL,
    binding: source.binding, split: input.split, config, configSha256: sha256(JSON.stringify(config)),
    cache: cache?.status === 'READY' ? { status: 'READY', checksum: cache.checksum } : cache ?? { status: 'BUILT_FROM_SOURCE' },
    referenceFailures, limitations: retrievalLimits,
    tooling: { encoderExecuted: false, deviceWorkMeasured: false, realQualityAccepted: false, independentAcceptance: 'PENDING_NOT_AUTOMATED',
      nondeterministicFields: ['results[].elapsedMs', 'metrics.timing'] },
  };
  let service: ReturnType<typeof createRetrieval>;
  try {
    buildGallery(source);
    if (cache?.status === 'UNAVAILABLE') throw new LabError(cache.code, 'Manual fallback and explicit cache rebuild required');
    service = createRetrieval(input, config, 'evaluation', undefined, cache?.status === 'READY' ? cache.snapshot : undefined);
  } catch (error) {
    return { ...common, status: 'SETUP_FAILURE' as const, setupCode: error instanceof LabError ? error.code : 'INVALID_GALLERY',
      queryAccounting: { selected: queries.length, evaluated: 0, blockedBySetup: queries.length, reportedQueryFailures },
      results: null, outcomes: null, metrics: null, r2DecisionParity: null };
  }
  const results: QueryResult[] = []; const outcomes: { queryId: string; outcome: RetrievalOutcome }[] = [];
  for (const entry of queries) {
    const start = performance.now(); const outcome = await service.query(entry.id, service.context());
    outcomes.push({ queryId: entry.id, outcome });
    results.push({ queryId: entry.id, truth: { productId: entry.productId, packageId: entry.packageId,
      known: entry.known && selectedIds.has(entry.productId) }, split: input.split,
    lighting: entry.capture.lighting, view: entry.capture.view, elapsedMs: performance.now() - start,
    outcome: outcome.status === 'DECISION' ? outcome.decision : { status: 'FAILURE', code: outcome.code } });
  }
  service.close();
  const measured = metrics(results); measured.label = PRECOMPUTED_LABEL;
  for (const timing of Object.values(measured.timing)) timing.label = 'Measured Node precomputed postprocessing milliseconds only; NO encoder/Android/camera timing';
  // Independent implementation seam, same selected gallery and population. This
  // parity check reuses accepted R2 evaluation; it does not constitute an audit.
  const scoped = { ...source.adapted, adapted: { ...source.adapted.adapted,
    entries: [...source.references, ...queries.map(e => ({ ...e, known: e.known && selectedIds.has(e.productId) }))] } };
  const baseline = evaluatePrecomputed(scoped, config, input.split);
  const parity = JSON.stringify(baseline.results?.map(r => r.outcome)) === JSON.stringify(results.map(r => r.outcome)) &&
    JSON.stringify(baseline.metrics?.rates) === JSON.stringify(measured.rates);
  if (!parity) throw new LabError('R2_PARITY_FAILURE', 'Facade differs from accepted R2 evaluation');
  return { ...common, status: measured.populations.failed ? 'QUERY_FAILURES' as const : 'COMPLETED' as const, setupCode: null,
    queryAccounting: { selected: queries.length, evaluated: results.length, blockedBySetup: 0, reportedQueryFailures },
    results, outcomes, metrics: measured, r2DecisionParity: parity };
}
