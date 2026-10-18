import { POLICY, armIds, validateManifest, validateBundle } from './phoneExperimentSchema.ts';
import type { Frame, Manifest } from './phoneExperimentSchema.ts';
const order = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
export function unit(values: number[]) {
  const norm = Math.hypot(...values);
  if (!values.length || !Number.isFinite(norm) || norm === 0 || values.some(v => !Number.isFinite(v))) throw Error('PHONE_INVALID_VECTOR');
  return values.map(v => v / norm);
}
export function cosine(a: number[], b: number[]) {
  if (a.length !== b.length) throw Error('PHONE_VECTOR_DIMENSION');
  return Math.max(-1, Math.min(1, a.reduce((sum, v, i) => sum + v * b[i], 0)));
}
// This selector receives only timing/readiness/identity, never outcome/score/truth.
export function selectFrames(frames: Pick<Frame, 'id' | 'sessionId' | 'capturedAtMs' | 'ready'>[], sessionId: string, cutoffMs: number) {
  const selected: string[] = []; let last = -Infinity;
  for (const f of frames.slice().sort((a, b) => a.capturedAtMs - b.capturedAtMs || order(a.id, b.id))) {
    if (f.sessionId !== sessionId || !f.ready || f.capturedAtMs >= Math.min(cutoffMs, POLICY.deadlineMs) || f.capturedAtMs - last < POLICY.minFrameGapMs) continue;
    selected.push(f.id); last = f.capturedAtMs; if (selected.length === POLICY.maxFrames) break;
  }
  return selected;
}
export function productScores(queries: number[][], gallery: { productId: string; references: { id: string; values: number[] }[] }[]) {
  if (!queries.length) return [];
  const q = queries.map(unit);
  return gallery.map(p => {
    if (!p.references.length) throw Error('PHONE_EMPTY_REFERENCE_SET');
    const refs = p.references.map(r => ({ id: r.id, values: unit(r.values) }));
    const perFrame = q.map(vector => {
      const scores = refs.map(r => ({ referenceId: r.id, score: cosine(vector, r.values) })).sort((a, b) => b.score - a.score || order(a.referenceId, b.referenceId));
      return { score: scores[0].score, nearestReferenceId: scores[0].referenceId };
    });
    return { productId: p.productId, score: perFrame.reduce((s, f) => s + f.score, 0) / perFrame.length, perFrame };
  }).sort((a, b) => b.score - a.score || order(a.productId, b.productId));
}
export function latencySummary(values: (number | null)[]) {
  const sorted = values.map(v => v === null ? Infinity : v).sort((a, b) => a - b);
  const quantile = (p: number) => {
    const v = sorted[Math.ceil(sorted.length * p) - 1];
    return v === undefined ? { kind: 'NO_TRIALS' } : Number.isFinite(v) ? { kind: 'FINITE', ms: v } : { kind: 'INFINITE_NO_ACTIONABLE_RESULT' };
  };
  return { attempted: values.length, missingActionable: values.filter(v => v === null).length,
    minimumTimingGroupSizeMet: values.length >= 20, median: quantile(.5), p95: quantile(.95) };
}
export function evaluatePhoneExperiment(manifestValue: unknown, manifestHash: string, bundleValue: unknown) {
  const m = validateManifest(manifestValue), b = validateBundle(m, manifestHash, bundleValue);
  const rows = m.trials.flatMap(trial => armIds.map(arm => {
    const record = b.trialRecords.find(t => t.trialId === trial.id), run = b.armRuns.find(r => r.trialId === trial.id && r.arm === arm);
    const issues: string[] = [], blockers: string[] = [];
    if (!record) blockers.push('TRIAL_RECORD_MISSING');
    if (!run) blockers.push('ARM_RESULT_MISSING');
    if (record && record.sessionId !== trial.sessionId) blockers.push('SESSION_BINDING');
    if (record?.terminal === 'CANCELLED') blockers.push('CANCELLED');
    if (record?.terminal === 'DEADLINE') issues.push('SESSION_DEADLINE');
    const cutoff = Math.min(record?.terminalAtMs ?? 0, POLICY.deadlineMs);
    const selected = record ? selectFrames(record.frames, trial.sessionId, cutoff) : [];
    const ids = arm.endsWith('1') ? selected.slice(0, 1) : selected;
    const relevant = ids.map(id => record!.frames.find(f => f.id === id)!);
    const usable = relevant.filter(f => f.completedAtMs <= cutoff && f.outcome.status === 'VECTOR');
    const frameDispositions = (record?.frames ?? []).map(f => ({ id: f.id,
      disposition: f.sessionId !== trial.sessionId ? 'STALE_SESSION' : f.completedAtMs > cutoff ? 'LATE_RESULT' :
        f.outcome.status === 'FAILURE' ? f.outcome.code : !f.ready ? 'NOT_READY' : !ids.includes(f.id) ? 'NOT_SELECTED' : 'USABLE' }));
    for (const f of frameDispositions) if (!['USABLE', 'NOT_SELECTED', 'NOT_READY'].includes(f.disposition)) issues.push(f.disposition);
    if (!usable.length) blockers.push('NO_USABLE_FRAME');
    if (run) {
      if (run.status === 'FAILURE') blockers.push('ARM_EXECUTION_FAILURE');
      blockers.push(...run.failureCodes);
      if (JSON.stringify(run.selectedFrameIds) !== JSON.stringify(ids)) blockers.push('ARM_SELECTION_MISMATCH');
      if (run.finalMs > cutoff || run.finalMs < Math.max(0, ...usable.map(f => f.completedAtMs)) || run.firstActionableMs !== null &&
          (run.firstActionableMs > run.finalMs || run.firstActionableMs > cutoff || run.firstActionableMs < (usable[0]?.completedAtMs ?? Infinity))) blockers.push('ARM_TIME_INVALID');
      if (run.firstActionableMs === null) issues.push('NO_ACTIONABLE_RESULT');
    }
    const refCount = arm.startsWith('V2') ? 2 : 4;
    const refIds = m.gallery.flatMap(p => p.orderedReferences.slice(0, refCount).map(r => r.id));
    for (const id of refIds) {
      const r = b.referenceRecords.find(r => r.id === id);
      if (!r || r.outcome.status !== 'VECTOR') blockers.push(r?.outcome.status === 'FAILURE' ? 'REFERENCE_' + r.outcome.code : 'REFERENCE_RECORD_MISSING');
    }
    const scoringGallery = blockers.length ? [] : m.gallery.map(p => ({ productId: p.productId, references: p.orderedReferences.slice(0, refCount).map(e => {
        const r = b.referenceRecords.find(r => r.id === e.id)!; return { id: r.id, values: r.outcome.status === 'VECTOR' ? r.outcome.values : [] };
      }) }));
    const candidates = blockers.length ? [] : productScores(usable.map(f => f.outcome.status === 'VECTOR' ? f.outcome.values : []), scoringGallery);
    const rank = trial.truth.kind === 'KNOWN' && candidates.length ? candidates.findIndex(c => c.productId === (trial.truth.kind === 'KNOWN' ? trial.truth.productId : null)) + 1 : null;
    const actionable = candidates.length && run?.firstActionableMs !== null ? run?.firstActionableMs ?? null : null;
    const firstCandidates = actionable === null ? [] : productScores(usable.filter(f => f.completedAtMs <= actionable).map(f => f.outcome.status === 'VECTOR' ? f.outcome.values : []), scoringGallery);
    const firstActionableProductId = firstCandidates[0]?.productId ?? null;
    const firstActionableCorrectFirst = trial.truth.kind === 'KNOWN' && trial.truth.productId === firstActionableProductId;
    const stableValid = run?.stableMs !== null && run?.stableMs !== undefined && usable.length >= 2 && candidates.length > 0;
    let stabilitySupported = false;
    if (stableValid) {
      const prefixes = usable.map((_, i) => productScores(usable.slice(0, i + 1).map(f => f.outcome.status === 'VECTOR' ? f.outcome.values : []), scoringGallery).at(0)?.productId);
      const stableIndex = prefixes.findIndex((id, i) => i > 0 && prefixes[i - 1] === id && id === candidates[0].productId && prefixes.slice(i).every(p => p === id));
      stabilitySupported = stableIndex >= 1 && run!.stableMs! >= usable[stableIndex].completedAtMs && run!.stableMs! <= run!.finalMs;
    }
    if (run?.stableMs !== null && run?.stableMs !== undefined && !stabilitySupported) issues.push('UNSUPPORTED_STABILITY_CLAIM');
    return { trialId: trial.id, sessionId: trial.sessionId, arm, truth: trial.truth, condition: trial.condition, phase: trial.phase,
      status: candidates.length ? issues.length ? 'SCORED_WITH_FAILURES' : 'SCORED' : 'UNSCORED',
      issues: [...new Set([...blockers, ...issues])], referenceIds: refIds, selectedFrameIds: ids, usableFrameIds: usable.map(f => f.id),
      selectedFrameCount: ids.length, usableFrameCount: usable.length, threeFrameAcquisition: ids.length === 3 && usable.length === 3,
      frameDispositions, candidates, top3: candidates.slice(0, 3), exactTopTie: candidates.filter(c => c.score === candidates[0]?.score).map(c => c.productId),
      correctRank: rank, correctFirst: rank === 1, correctTop3: rank !== null && rank <= 3,
      firstActionableMs: actionable, firstActionableProductId, firstActionableCorrectFirst,
      stableMs: stabilitySupported ? run!.stableMs : null, finalMs: run?.finalMs ?? null,
      stages: run?.stages ?? null, manualConfirmationRequired: true, autoAccept: false };
  }));
  const summaries = armIds.map(arm => {
    const selected = rows.filter(r => r.arm === arm), known = selected.filter(r => r.truth.kind === 'KNOWN'), unknown = selected.filter(r => r.truth.kind === 'UNKNOWN');
    return { arm, denominator: m.trials.length, knownDenominator: known.length, unknownDenominator: unknown.length,
      scored: selected.filter(r => r.status !== 'UNSCORED').length, failedOrIncomplete: selected.filter(r => r.issues.length).length,
      first: known.filter(r => r.correctFirst).length, top3: known.filter(r => r.correctTop3).length,
      unknownWithSuggestions: unknown.filter(r => r.candidates.length).length, unknownAutoAcceptance: 'NOT_IMPLEMENTED_NOT_CALIBRATED',
      threeFrameAcquisitions: selected.filter(r => r.threeFrameAcquisition).length,
      correctAndWithinDeadline: known.filter(r => r.firstActionableCorrectFirst && r.firstActionableMs !== null && r.firstActionableMs <= POLICY.deadlineMs).length,
      finalCorrectAndWithinDeadline: known.filter(r => r.correctFirst && r.finalMs !== null && r.finalMs <= POLICY.deadlineMs).length,
      latency: latencySummary(selected.map(r => r.firstActionableMs)),
      successfulTrialLatencyOnly: latencySummary(selected.filter(r => r.status === 'SCORED').map(r => r.firstActionableMs)),
      latencyGroups: ['development', 'confirmation'].flatMap(phase => ['cold', 'warm', 'sustained'].map(condition => ({ phase, condition,
        ...latencySummary(selected.filter(r => r.phase === phase && r.condition === condition).map(r => r.firstActionableMs)) }))) };
  });
  const pairs = armIds.slice(1).map(arm => ({ arm, rows: m.trials.map(trial => {
    const before = rows.find(r => r.trialId === trial.id && r.arm === 'V21')!, after = rows.find(r => r.trialId === trial.id && r.arm === arm)!;
    return { trialId: trial.id, outcome: before.status === 'UNSCORED' || after.status === 'UNSCORED' ? 'UNSCORED_PAIR' : trial.truth.kind === 'UNKNOWN' ? 'UNKNOWN_TRIAL' :
      !before.correctFirst && after.correctFirst ? 'GAIN' : before.correctFirst && !after.correctFirst ? 'LOSS' : 'UNCHANGED',
      beforeRank: before.correctRank, afterRank: after.correctRank, beforeIssues: before.issues, afterIssues: after.issues };
  }) }));
  return { schemaVersion: 1, kind: 'GENERATED_PHONE_COMPARISON', nativeValidated: false, denominator: m.trials.length,
    complete: rows.every(r => r.status === 'SCORED'), manifestSha256: manifestHash, modelSha256: m.modelSha256, recipeSha256: m.recipeSha256,
    policySha256: m.policySha256, sourceSha256: m.sourceSha256, specifications: m.specifications, specificationsUsedForRanking: false, rows, summaries, pairs,
    limitations: ['Authored/generated numeric data only; no native inference, camera, phone timing, accuracy or acceptance.',
      'All scheduled trials/four arms retained. Failures are not removed; fallback frame counts are explicit.',
      'No automatic acceptance or calibrated UNKNOWN states. Repeated same-item trials are correlated.',
      'Native runtime equivalence and JPEG/orientation/LANCZOS equivalence are separate pending checks.'] };
}
export type Comparison = ReturnType<typeof evaluatePhoneExperiment>;
export type PhoneManifest = Manifest;
