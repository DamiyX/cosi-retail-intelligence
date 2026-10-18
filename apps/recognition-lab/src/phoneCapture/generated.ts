import { z } from 'zod';
import { productScores } from '../phoneExperimentEvaluation.ts';
import { ScanSession, LIMITS } from './session.ts';
import type { Adapter, Binding, Callbacks, JobBinding, Outcome, SessionResult } from './session.ts';
import type { EnrollmentState, GalleryRevision, FrozenTrial, TrialRecord, Digest } from './enrollment.ts';

const id = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/);
const ms = z.number().int().min(0).max(60000);
const vector = z.array(z.number().finite().min(-1e6).max(1e6)).length(2).refine(v => v.some(n => n !== 0));
const outcome = z.discriminatedUnion('kind', [z.object({ kind: z.literal('VECTOR'), values: vector }).strict(),
  z.object({ kind: z.literal('FAILURE'), code: z.enum(['CAPTURE_ERROR', 'DECODE_ERROR', 'INFERENCE_ERROR']) }).strict()]);
const gates = z.object({ galleryReady: z.boolean(), sourceReady: z.boolean(), permission: z.boolean(), offline: z.boolean() }).strict();
const override = z.object({ sessionId: id.optional(), galleryRevision: id.optional(), jobId: id.optional() }).strict();
const event = z.discriminatedUnion('action', [
  z.object({ atMs: ms, action: z.literal('START'), sessionId: id, gates: gates.optional() }).strict(),
  z.object({ atMs: ms, action: z.literal('REQUEST'), ready: z.boolean(), permission: z.boolean(), offline: z.boolean() }).strict(),
  z.object({ atMs: ms, action: z.literal('CAPTURE'), job: z.number().int().min(1).max(75), override: override.optional() }).strict(),
  z.object({ atMs: ms, action: z.literal('COMPLETE'), job: z.number().int().min(1).max(75), outcome, override: override.optional() }).strict(),
  z.object({ atMs: ms, action: z.literal('CANCEL'), reason: z.enum(['USER', 'BACKGROUND', 'UNMOUNT', 'OFFLINE_POLICY_LOSS']) }).strict(),
  z.object({ atMs: ms, action: z.literal('POLL') }).strict(),
]);
const schema = z.object({ schemaVersion: z.literal(1), kind: z.literal('GENERATED_CAPTURE_SCENARIO'), nativeValidated: z.literal(false),
  scenarioId: id, sessionId: id, galleryRevision: id, gates: gates.optional(), finalAtMs: ms,
  gallery: z.array(z.object({ productId: id, references: z.array(z.object({ id, values: vector }).strict()).length(4) }).strict()).min(1).max(10),
  events: z.array(event).max(LIMITS.events) }).strict();
export type Scenario = z.infer<typeof schema>;
export function parseScenario(value: unknown): Scenario {
  if (!value || typeof value !== 'object' || !Array.isArray((value as { events?: unknown }).events) ||
      ((value as { events: unknown[] }).events.length > LIMITS.events)) throw Error('INVALID_OR_OVERSIZED_GENERATED_TRACE');
  const s = schema.parse(value);
  if (s.events.some((e, i) => i > 0 && e.atMs < s.events[i - 1].atMs) || s.finalAtMs < (s.events.at(-1)?.atMs ?? 0)) throw Error('NON_MONOTONIC_TRACE');
  const sessions = [s.sessionId, ...s.events.filter(e => e.action === 'START').map(e => e.sessionId)];
  if (sessions.length > LIMITS.sessions || new Set(sessions).size !== sessions.length) throw Error('SESSION_CAP_OR_DUPLICATE');
  if (s.events.filter(e => e.action === 'REQUEST').length > 75) throw Error('ATTEMPT_OPPORTUNITY_CAP');
  const products = s.gallery.map(p => p.productId), refs = s.gallery.flatMap(p => p.references.map(r => r.id));
  if (new Set(products).size !== products.length || new Set(refs).size !== refs.length) throw Error('DUPLICATE_GALLERY_BINDING');
  return s;
}

export class VirtualClock {
  private at = 0;
  now() { return this.at; }
  set(at: number) { if (!Number.isSafeInteger(at) || at < this.at) throw Error('NON_MONOTONIC_CLOCK'); this.at = at; }
}
export class GeneratedAdapter implements Adapter {
  readonly handles: { binding: JobBinding; callbacks: Callbacks | null; releaseCalls: number; cancelReasons: string[] }[] = [];
  create(binding: JobBinding) {
    const handle = { binding: { ...binding }, callbacks: null as Callbacks | null, releaseCalls: 0, cancelReasons: [] as string[] };
    this.handles.push(handle);
    return { begin: (callbacks: Callbacks) => { handle.callbacks = callbacks; },
      cancel: (reason: string) => { handle.cancelReasons.push(reason); }, release: () => { handle.releaseCalls++; } };
  }
  deliver(job: number, phase: 'CAPTURE' | 'COMPLETE', result?: Outcome, change: Partial<JobBinding> = {}) {
    const handle = this.handles[job - 1];
    if (!handle?.callbacks) throw Error('CALLBACK_FOR_UNCREATED_JOB');
    const binding = { ...handle.binding, ...change };
    if (phase === 'CAPTURE') handle.callbacks.captured(binding);
    else { if (!result) throw Error('MISSING_CALLBACK_OUTCOME'); handle.callbacks.completed(binding, result); }
  }
}

function trialReport(sessionId: string, session: SessionResult | undefined, gallery: Scenario['gallery']) {
  const frames = session?.frames ?? [], selected = frames.filter(f => f.selected), usable = selected.filter(f => f.disposition === 'USABLE');
  const slots = Array.from({ length: LIMITS.attempts }, (_, index) => ({ slot: index + 1, frame: frames[index] ?? null }));
  const complete = session?.terminal === 'COMPLETE' && usable.length === LIMITS.attempts;
  const arms = (['V21', 'V41', 'V23', 'V43'] as const).map(arm => {
    const chosen = arm.endsWith('1') ? selected.slice(0, 1) : selected;
    const accepted = chosen.filter(f => f.disposition === 'USABLE');
    const candidates = productScores(accepted.map(f => f.values!), gallery.map(p => ({ productId: p.productId,
      references: p.references.slice(0, arm.startsWith('V2') ? 2 : 4) })));
    return { arm, denominator: 1, status: candidates.length ? complete ? 'GENERATED_SCORED' : 'GENERATED_PARTIAL' : 'UNSCORED',
      selectedFrameIds: chosen.map(f => f.binding.jobId), usableFrameIds: accepted.map(f => f.binding.jobId),
      frameCount: accepted.length, acquisition: accepted.length === 3 ? 'THREE_FRAME' : accepted.length === 1 ? 'ONE_FRAME_FALLBACK' : accepted.length === 2 ? 'TWO_FRAME_PARTIAL' : 'NO_USABLE_FRAME',
      candidates, exactTopTie: candidates.filter(c => c.score === candidates[0]?.score).map(c => c.productId), autoAccept: false };
  });
  return { sessionId, binding: session?.binding ?? null, terminal: session?.terminal ?? 'NOT_STARTED', reason: session?.reason ?? 'SESSION_NOT_STARTED',
    complete, counts: { denominator: LIMITS.attempts, attempted: frames.length, selected: selected.length, usable: usable.length,
      late: frames.filter(f => f.disposition === 'LATE').length, failed: frames.filter(f => f.disposition === 'FAILED').length,
      cancelled: frames.filter(f => f.disposition === 'CANCELLED').length, pending: frames.filter(f => f.disposition === 'PENDING').length,
      missing: LIMITS.attempts - frames.length, notSelected: frames.filter(f => f.disposition === 'NOT_SELECTED').length }, slots, arms };
}
export function simulate(value: unknown, binding: Omit<Binding, 'sessionId' | 'galleryRevision'>) {
  const scenario = parseScenario(value), clock = new VirtualClock(), adapter = new GeneratedAdapter(), controller = new ScanSession(clock, adapter);
  const makeBinding = (sessionId: string): Binding => ({ ...binding, sessionId, galleryRevision: scenario.galleryRevision });
  controller.start(makeBinding(scenario.sessionId), scenario.gates);
  const plannedSessions = [scenario.sessionId];
  for (const e of scenario.events) {
    clock.set(e.atMs);
    switch (e.action) {
      case 'START': plannedSessions.push(e.sessionId); controller.start(makeBinding(e.sessionId), e.gates); break;
      case 'REQUEST': controller.request({ ready: e.ready, permission: e.permission, offline: e.offline }); break;
      case 'CAPTURE': adapter.deliver(e.job, 'CAPTURE', undefined, e.override); break;
      case 'COMPLETE': adapter.deliver(e.job, 'COMPLETE', e.outcome, e.override); break;
      case 'CANCEL': controller.cancel(e.reason); break;
      case 'POLL': controller.poll(); break;
    }
  }
  clock.set(scenario.finalAtMs); const state = controller.poll();
  const trials = plannedSessions.map(id => trialReport(id, state.sessions.find(s => s.binding.sessionId === id), scenario.gallery));
  const complete = trials.every(t => t.complete) && !state.stillOwnedWork && !state.eventLimitExceeded;
  return { schemaVersion: 1, kind: 'GENERATED_SESSION_SIMULATION', nativeValidated: false, scenarioId: scenario.scenarioId,
    sourceSha256: binding.sourceSha256, modelSha256: binding.modelSha256, recipeSha256: binding.recipeSha256,
    galleryRevision: scenario.galleryRevision, policy: LIMITS, complete, exitCode: complete ? 0 : 2,
    trialDenominator: plannedSessions.length, armDenominator: 4 * plannedSessions.length, scheduledAttemptDenominator: 3 * plannedSessions.length,
    trials, state, resources: adapter.handles.map(h => ({ binding: h.binding, releaseCalls: h.releaseCalls, cancelReasons: h.cancelReasons })),
    specificationsUsedForRanking: false, truthUsedForSelection: false, autoAccept: false,
    limitations: ['Fake two-dimensional vectors, fake handles and virtual clocks only; no camera, pixels, model or measured phone speed.',
      'Logical cancellation/deadline does not establish physical drain. Uncompleted owned jobs remain busy.',
      'All planned trial/four-arm/attempt denominators retained; partial/fallback scores are not successful acquisition or recognition acceptance.'] };
}

// Enrollment extensions reuse the accepted simulator unchanged. Truth stays in report metadata only.
export function runFrozenTrial(revision: GalleryRevision, trial: FrozenTrial, vectors: number[][], digest: Digest): Omit<TrialRecord, 'sha256'> {
  if (trial.mode === 'INTERRUPTED') throw Error('INTERRUPTED_TRIAL_NOT_EXECUTED');
  if (vectors.length !== 3 || digest(JSON.stringify(vectors)) !== trial.queryInputSha256) throw Error('FROZEN_QUERY_INPUT_BINDING');
  const request = (atMs: number) => ({ atMs, action: 'REQUEST', ready: true, permission: true, offline: true });
  const capture = (atMs: number, job: number) => ({ atMs, action: 'CAPTURE', job });
  const complete = (atMs: number, job: number) => ({ atMs, action: 'COMPLETE', job, outcome: { kind: 'VECTOR', values: vectors[job - 1] } });
  let events: unknown[] = [request(0), capture(0, 1), complete(100, 1), request(400), capture(400, 2), complete(500, 2), request(800), capture(800, 3), complete(900, 3)];
  let finalAtMs = 900;
  if (trial.mode === 'FAILED') { events = [request(0), capture(0, 1), { atMs: 100, action: 'COMPLETE', job: 1, outcome: { kind: 'FAILURE', code: 'INFERENCE_ERROR' } }]; finalAtMs = 100; }
  if (trial.mode === 'DEADLINE') { events = [request(0), capture(0, 1), complete(3000, 1)]; finalAtMs = 3000; }
  if (trial.mode === 'CANCELLED') { events = events.slice(0, 5).concat([{ atMs: 450, action: 'CANCEL', reason: 'USER' }, complete(500, 2)]); finalAtMs = 500; }
  const result = simulate({ schemaVersion: 1, kind: 'GENERATED_CAPTURE_SCENARIO', nativeValidated: false,
    scenarioId: trial.trialId, sessionId: trial.sessionId, galleryRevision: revision.revisionId,
    gallery: revision.products.map(p => ({ productId: p.productId, references: p.slots.map(r => ({ id: r!.id, values: r!.values })) })), events, finalAtMs },
    { sourceSha256: revision.bindings.sourceSha256, modelSha256: revision.bindings.modelSha256, recipeSha256: revision.bindings.recipeSha256 });
  const session = result.state.sessions[0];
  return { revisionId: revision.revisionId, trialId: trial.trialId, queryInputSha256: trial.queryInputSha256,
    terminal: result.state.stillOwnedWork ? 'DRAINING' : session.terminal!, reason: session.reason, stillOwnedWork: result.state.stillOwnedWork,
    frames: session.frames.map(f => ({ id: f.binding.jobId, requestAtMs: f.requestAtMs, capturedAtMs: f.capturedAtMs, completedAtMs: f.completedAtMs,
      selected: f.selected, disposition: f.disposition, values: f.values, failureCode: f.failureCode })) };
}
export function enrollmentReport(state: EnrollmentState, recovered = false) {
  const rows = state.revisions.flatMap(revision => revision.trials.map(trial => {
    const record = state.records.find(r => r.trialId === trial.trialId), frames = record?.frames ?? [], selected = frames.filter(f => f.selected);
    const pending = state.active?.kind === 'TRIAL' && state.active.trialId === trial.trialId;
    const terminal = record?.terminal ?? (pending && recovered ? 'INTERRUPTED' : 'NOT_RUN');
    const complete = terminal === 'COMPLETE' && frames.filter(f => f.disposition === 'USABLE').length === 3 && !record?.stillOwnedWork;
    const arms = (['V21', 'V41', 'V23', 'V43'] as const).map(arm => {
      const chosen = arm.endsWith('1') ? selected.slice(0, 1) : selected, usable = chosen.filter(f => f.disposition === 'USABLE');
      const candidates = productScores(usable.map(f => f.values!), revision.products.map(p => ({ productId: p.productId,
        references: p.slots.slice(0, arm.startsWith('V2') ? 2 : 4).map(r => ({ id: r!.id, values: r!.values })) })));
      const correctRank = trial.truth.kind === 'KNOWN' && candidates.length ? candidates.findIndex(c => c.productId === (trial.truth.kind === 'KNOWN' ? trial.truth.productId : '')) + 1 : null;
      return { arm, denominator: 1, status: candidates.length ? complete ? 'GENERATED_SCORED' : 'GENERATED_PARTIAL' : 'UNSCORED',
        referenceIds: revision.products.flatMap(p => p.slots.slice(0, arm.startsWith('V2') ? 2 : 4).map(r => r!.id)), selectedFrameIds: chosen.map(f => f.id), usableFrameIds: usable.map(f => f.id), candidates,
        correctRank, unknownWithSuggestions: trial.truth.kind === 'UNKNOWN' && candidates.length > 0, autoAccept: false };
    });
    return { trialId: trial.trialId, sessionId: trial.sessionId, revisionId: revision.revisionId, revisionSha256: revision.sha256,
      truth: trial.truth, terminal, complete, pendingWork: pending, attempted: frames.length, attemptDenominator: 3, missing: 3 - frames.length, frames, arms };
  }));
  return { schemaVersion: 1, kind: 'GENERATED_ENROLLMENT_COMPARISON', nativeValidated: false, bindings: state.bindings,
    complete: rows.length > 0 && rows.every(r => r.complete) && state.active === null, trialDenominator: rows.length, armDenominator: rows.length * 4,
    attemptDenominator: rows.length * 3, rows, truthUsedForSelection: false, autoAccept: false,
    limitations: ['Fake vectors and actual disposable generated files; no native camera/model/resource/durability or quality acceptance.', 'All declared trials and four arms remain, including interrupted/failed/not-run rows.'] };
}
