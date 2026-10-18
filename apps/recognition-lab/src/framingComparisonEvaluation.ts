import { rank, unitVector } from './ranking.ts';
import { defaultConfig, type Entry } from './schema.ts';
import { validateBaseline, validateComparison, validateCropBundle, type CropExpected, type Comparison, type CropBundle } from './framingComparisonSchema.ts';
import type { Bundle } from './exploratoryEvaluation.ts';

type RecordValue = Bundle['records'][number] | CropBundle['records'][number];
const order = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const adapter = { id: 'analysis-only', preprocessingId: 'explicit-two-recipe-analysis', space: 'same-encoder-analytical', dimension: 1024 };
function normalized(e: Comparison['study']['entries'][number], r: RecordValue) {
  const entry: Entry = { ...e, split: 'development', packageId: null, known: true, captureSession: e.exposure,
    packagingGeneration: 'unmeasured', capture: { device: 'unmeasured', lighting: 'unmeasured', view: 'unmeasured', occlusion: 'unmeasured' },
    rights: { permissionId: 'bound-comparison', provenance: 'explicit-manifest' },
    observation: r.kind === 'vector' ? { kind: 'vector', vector: { space: adapter.space, values: r.values } } : { kind: 'failure', code: 'ADAPTER_ERROR' } };
  return { entry, vector: unitVector(entry, adapter) };
}
export function pairedEvaluation(value: unknown, baselineValue: unknown, baselineSha256: string, cropValue: unknown, expected: CropExpected) {
  const c = validateComparison(value), full = validateBaseline(c, baselineValue, baselineSha256), crop = validateCropBundle(c, cropValue, expected);
  const conditions = ([['FF', full, full], ['CC', crop, crop], ['FC', full, crop], ['CF', crop, full]] as const).map(([condition, refs, queries]) => {
    const start = performance.now();
    const references = c.study.entries.filter(e => e.role === 'reference');
    const failedReferences = references.filter(e => refs.records.find(r => r.id === e.id)?.kind !== 'vector').map(e => ({ id: e.id,
      reason: refs.records.find(r => r.id === e.id)?.kind === 'failure' ? (refs.records.find(r => r.id === e.id) as Extract<RecordValue, { kind: 'failure' }>).code : 'MISSING_REFERENCE' }));
    const gallery = failedReferences.length ? null : references.map(e => normalized(e, refs.records.find(r => r.id === e.id)!));
    const rows = c.study.entries.filter(e => e.role === 'query').sort((a, b) => order(a.id, b.id)).map(e => {
      const r = queries.records.find(r => r.id === e.id)!;
      const failures = [...(r.kind === 'failure' ? [r.code] : []), ...(failedReferences.length ? ['INCOMPLETE_GALLERY'] : [])];
      if (refs.runFailure) failures.push('REFERENCE_RUN_FAILURE'); if (queries.runFailure) failures.push('QUERY_RUN_FAILURE');
      const q = failures.length ? null : normalized(e, r).vector;
      // Use unchanged rank for every reference score and for the grouped margin.
      // This obtains full10-identity ranks without duplicating cosine arithmetic.
      const perRef = q && gallery ? gallery.map(g => ({ id: g.entry.id, productId: g.entry.productId,
        score: rank(q, [g], defaultConfig).candidates[0].score })) : [];
      const candidates = c.study.products.map(p => {
        const group = perRef.filter(r => r.productId === p.id).sort((a, b) => b.score - a.score || order(a.id, b.id));
        return group.length ? { productId: p.id, score: group[0].score, nearestReferenceId: group[0].id } : null;
      }).filter((x): x is NonNullable<typeof x> => x !== null).sort((a, b) => b.score - a.score || order(a.productId, b.productId));
      const ranked = q && gallery ? rank(q, gallery, defaultConfig) : null;
      const position = candidates.length ? candidates.findIndex(p => p.productId === e.productId) + 1 : null;
      return { id: e.id, truth: e.productId, failures, candidates, correctRank: position,
        first: position === 1, firstThree: position !== null && position <= 3,
        margin: ranked?.margin ?? null, topTie: candidates.length ? candidates.filter(x => Math.abs(x.score - candidates[0].score) <= 1e-12).map(x => x.productId) : [] };
    });
    const scored = rows.filter(r => r.correctRank !== null).length;
    return { condition, referenceRecipeSha256: refs.recipeSha256, queryRecipeSha256: queries.recipeSha256,
      referenceRunId: refs.runId, queryRunId: queries.runId, denominator: 20 as const, scored,
      complete: scored === 20 && !refs.runFailure && !queries.runFailure, failedReferences,
      first: rows.filter(r => r.first).length, firstThree: rows.filter(r => r.firstThree).length,
      perProduct: c.study.products.map(p => ({ productId: p.id, queries: 2, first: rows.filter(r => r.truth === p.id && r.first).length,
        firstThree: rows.filter(r => r.truth === p.id && r.firstThree).length,
        unscored: rows.filter(r => r.truth === p.id && r.correctRank === null).length })),
      wrongIdentityAttraction: c.study.products.map(p => ({ productId: p.id, count: rows.filter(r => !r.first && r.candidates[0]?.productId === p.id).length })),
      confusion: c.study.products.map(p => ({ truth: p.id, predictions: Object.fromEntries(c.study.products.map(q => [q.id,
        rows.filter(r => r.truth === p.id && r.candidates[0]?.productId === q.id).length])),
        unscored: rows.filter(r => r.truth === p.id && r.correctRank === null).length })), rows, evaluationMs: performance.now() - start };
  });
  const ff = conditions[0], cc = conditions[1];
  const pairs = ff.rows.map(before => {
    const after = cc.rows.find(r => r.id === before.id)!;
    return { id: before.id, truth: before.truth, fullRank: before.correctRank, cropRank: after.correctRank,
      fullFirst: before.first, cropFirst: after.first, fullFailures: before.failures, cropFailures: after.failures,
      outcome: before.correctRank === null || after.correctRank === null ? 'UNSCORED_PAIR' :
        after.correctRank < before.correctRank ? 'IMPROVED_RANK' : after.correctRank > before.correctRank ? 'REGRESSED_RANK' : 'UNCHANGED_RANK',
      firstChoice: before.correctRank === null || after.correctRank === null ? 'UNSCORED_PAIR' :
        before.first && !after.first ? 'LOSS' : !before.first && after.first ? 'WIN' : 'UNCHANGED' };
  });
  return { schemaVersion: 1, comparisonId: c.comparisonId, primary: 'FF->CC', formalAdmission: false,
    mode: full.mode, complete: conditions.every(x => x.complete), denominator: 20,
    provenance: { baseline: c.baseline, comparisonSha256: expected.comparisonSha256,
      annotationSha256: expected.annotationSha256, cropSourceSha256: crop.sourceSha256, cropRecipeSha256: crop.recipeSha256,
      modelSha256: crop.modelSha256, softwareSha256: crop.softwareSha256, cropSetupSha256: crop.setupSha256 },
    conditions, pairs, primarySummary: { firstChoiceWins: pairs.filter(p => p.firstChoice === 'WIN').length,
      firstChoiceLosses: pairs.filter(p => p.firstChoice === 'LOSS').length,
      rankImproved: pairs.filter(p => p.outcome === 'IMPROVED_RANK').length,
      rankRegressed: pairs.filter(p => p.outcome === 'REGRESSED_RANK').length,
      rankUnchanged: pairs.filter(p => p.outcome === 'UNCHANGED_RANK').length,
      unscoredPairs: pairs.filter(p => p.outcome === 'UNSCORED_PAIR').length },
    resources: { full: { loadMs: full.loadMs, encodingMs: full.encodingMs, attemptMs: full.attemptMs ?? null,
      interpretation: 'Frozen baseline; no new full-image encoding', environment: full.environment },
      crop: { loadMs: crop.loadMs, encodingMs: crop.encodingMs, attemptMs: crop.attemptMs, environment: crop.environment },
      evaluationMs: conditions.reduce((s, c) => s + c.evaluationMs, 0), newEncodingsBudget: 40, diagnosticNewEncodings: 0 },
    limitation: '20 paired queries on the same10 physical items, correlated views, not80 independent observations. CC is primary; FC/CF diagnostic only. Manual framing changes context AND product pixel scale. Scores are not probabilities. No calibrated UNKNOWN, threshold search, true unknown, Android, automatic segmentation or production claim. Founder saw baseline results; annotations are not blinded.',
  };
}
export type FramingEvaluation = ReturnType<typeof pairedEvaluation>;
