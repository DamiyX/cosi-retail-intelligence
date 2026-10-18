import { rank, unitVector } from './ranking.ts';
import { defaultConfig, type Entry } from './schema.ts';
import { validatePortabilityInput, type PortabilityInput } from './phonePortabilitySchema.ts';
const order = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const adapter = { id: 'portability-analysis', preprocessingId: 'separate-control-phone-recipes', space: 'fixed-mobilenet-cpu', dimension: 1024 };
function normalized(values: number[]) {
  return unitVector({ observation: { kind: 'vector', vector: { space: adapter.space, values } } } as Entry, adapter);
}
export function portabilityParity(base: number[], observed: number[]) {
  const a = normalized(base), b = normalized(observed), errors = a.map((x, i) => Math.abs(x - b[i]));
  const raw = base.map((x, i) => Math.abs(x - observed[i]));
  const maxComponentError = Math.max(...errors), cosineDistance = Math.max(0, 1 - Math.max(-1, Math.min(1, a.reduce((s, x, i) => s + x * b[i], 0))));
  return { maxComponentError, cosineDistance, rawMaxAbsoluteDifference: Math.max(...raw), rawMeanAbsoluteDifference: raw.reduce((s, x) => s + x, 0) / 1024,
    passesFrozenTolerance: maxComponentError <= 1e-4 && cosineDistance <= 1e-5 };
}
function lane(p: PortabilityInput, name: 'control' | 'phone' | 'baseline') {
  const vectors = new Map((name === 'baseline' ? p.baseline : p.observations.filter(o => o.lane === name && o.kind === 'vector')).map(o => [o.id, normalized((o as { values: number[] }).values)]));
  const refs = p.frames.filter(f => f.role === 'reference'), failedReferences = refs.filter(f => !vectors.has(f.id)).map(f => f.id);
  const gallery = failedReferences.length ? null : refs.map(f => ({ entry: { id: f.id, productId: f.productId, packageId: null } as Entry, vector: vectors.get(f.id)! }));
  const queries = p.frames.filter(f => f.role === 'query').sort((a, b) => order(a.id, b.id)).map(f => {
    const q = vectors.get(f.id);
    // Same scalar score calculation as ranking.ts; every product kept, as in framingComparisonEvaluation.ts.
    const scores = q && gallery ? gallery.map(g => ({ id: g.entry.id, productId: g.entry.productId, score: rank(q, [g], defaultConfig).candidates[0].score })) : [];
    const candidates = [...new Set(refs.map(r => r.productId))].map(productId => {
      const best = scores.filter(r => r.productId === productId).sort((a, b) => b.score - a.score || order(a.id, b.id))[0];
      return best ? { productId, nearestReferenceId: best.id, score: best.score } : null;
    }).filter((r): r is NonNullable<typeof r> => r !== null).sort((a, b) => b.score - a.score || order(a.productId, b.productId));
    const correctRank = candidates.length ? candidates.findIndex(c => c.productId === f.productId) + 1 : null;
    return { id: f.id, truth: f.productId, candidates, correctRank, failure: failedReferences.length ? 'INCOMPLETE_GALLERY' : !q ? 'QUERY_FAILED' : null,
      exactTopTie: candidates.filter(c => c.score === candidates[0]?.score).map(c => c.productId),
      nearTopTie: candidates.filter(c => Math.abs(c.score - (candidates[0]?.score ?? 0)) <= 1e-12).map(c => c.productId), margin: candidates.length ? candidates[0].score - candidates[1].score : null };
  });
  return { lane: name, denominator: 20, first: queries.filter(q => q.correctRank === 1).length,
    firstThree: queries.filter(q => q.correctRank !== null && q.correctRank <= 3).length, failedReferences, queries, complete: vectors.size === 40 && !failedReferences.length };
}
export function evaluatePortability(value: unknown) {
  const p = validatePortabilityInput(value), baseline = lane(p, 'baseline'), control = lane(p, 'control'), phone = lane(p, 'phone');
  const parity = p.frames.map(f => {
    const o = p.observations.find(o => o.id === f.id && o.lane === 'control')!;
    return o.kind === 'vector' ? { id: f.id, kind: 'compared', ...portabilityParity(p.baseline.find(b => b.id === f.id)!.values, o.values) } : { id: f.id, kind: 'failure', code: o.code };
  });
  const compare = (before: typeof control, after: typeof control) => before.queries.map((q, i) => {
    const r = after.queries[i];return { id: q.id, beforeRank: q.correctRank, afterRank: r.correctRank,
      outcome: q.correctRank === null || r.correctRank === null ? 'UNSCORED_PAIR' : r.correctRank < q.correctRank ? 'IMPROVED' : r.correctRank > q.correctRank ? 'REGRESSED' : 'UNCHANGED',
      candidateOrderEqual: q.candidates.map(c => c.productId).join('|') === r.candidates.map(c => c.productId).join('|') };
  });
  return { schemaVersion: 1, kind: 'PRIVATE_PORTABILITY_COMPARISON', formalAdmission: false, complete: control.complete && phone.complete,
    pins: { manifestSha256: p.manifestSha256, replaySourceSha256: p.replaySourceSha256, packetSha256: p.packetSha256, resultSha256: p.resultSha256, modelSha256: p.modelSha256 },
    baseline, control, phone, runtimeParity: parity, runtimeParityPassed: parity.every(r => r.kind === 'compared' && 'passesFrozenTolerance' in r && r.passesFrozenTolerance),
    baselineToControl: compare(baseline, control), controlToPhone: compare(control, phone), tensorComparisons: p.tensorComparisons,
    vectorComparisons: p.frames.map(f => { const a=p.observations.find(o=>o.id===f.id&&o.lane==='control')!,b=p.observations.find(o=>o.id===f.id&&o.lane==='phone')!;
      return a.kind==='vector'&&b.kind==='vector'?{id:f.id,kind:'different-recipe-comparison',...portabilityParity(a.values,b.values)}:{id:f.id,kind:'unscored-pair'}; }),
    limitation: '20 correlated query views of 10 items. Two recipes and galleries remain separate. No live scanning, calibrated UNKNOWN, speed, model selection or production acceptance.' };
}
