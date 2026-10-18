/** Portable ownership controller. Clock/work are injected; no timers, platform or ranking imports. */
export const LIMITS = Object.freeze({ attempts: 3, gapMs: 400, deadlineMs: 3000, events: 4096, sessions: 25 });
export type Terminal = 'COMPLETE' | 'CANCELLED' | 'DEADLINE' | 'FAILED';
export interface Binding { sessionId: string; galleryRevision: string; sourceSha256: string; modelSha256: string; recipeSha256: string }
export interface JobBinding extends Binding { jobId: string }
export type Outcome = { kind: 'VECTOR'; values: readonly number[] } | { kind: 'FAILURE'; code: string };
export interface Callbacks { captured(binding: JobBinding): void; completed(binding: JobBinding, outcome: Outcome): void }
export interface Resource { begin(callbacks: Callbacks): void; cancel(reason: string): void; release(): void }
export interface Adapter { create(binding: JobBinding): Resource }
export interface Frame {
  binding: JobBinding; requestAtMs: number; capturedAtMs: number | null; completedAtMs: number | null;
  selected: boolean; disposition: 'PENDING' | 'USABLE' | 'FAILED' | 'LATE' | 'CANCELLED' | 'NOT_SELECTED';
  failureCode: string | null; values: number[] | null; releaseAttempts: number; released: boolean;
}
export interface SessionResult {
  binding: Binding; startedAtMs: number; terminal: Terminal | null; terminalAtMs: number | null;
  reason: string | null; frames: Frame[];
}
export interface LedgerEvent { atMs: number; sessionId: string | null; jobId: string | null; kind: string; detail: string | null }
interface Owned { session: SessionResult; frame: Frame; resource: Resource | null; beginStarted: boolean; completionSeen: boolean; cancelSignalled: boolean }
const same = (a: JobBinding, b: JobBinding) => a.jobId === b.jobId && a.sessionId === b.sessionId &&
  a.galleryRevision === b.galleryRevision && a.sourceSha256 === b.sourceSha256 &&
  a.modelSha256 === b.modelSha256 && a.recipeSha256 === b.recipeSha256;
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export class ScanSession {
  private current: SessionResult | null = null;
  private owned: Owned | null = null;
  private results: SessionResult[] = [];
  private events: LedgerEvent[] = [];
  private lastTime = -1;
  private jobs = 0;
  private overflow = false;
  private readonly clock: { now(): number };
  private readonly adapter: Adapter;
  constructor(clock: { now(): number }, adapter: Adapter) { this.clock = clock; this.adapter = adapter; }
  private time() {
    const now = this.clock.now();
    if (!Number.isSafeInteger(now) || now < 0 || now < this.lastTime) throw Error('NON_MONOTONIC_TIME');
    this.lastTime = now;
    if (this.current?.terminal === null && now - this.current.startedAtMs >= LIMITS.deadlineMs) {
      this.terminalize('DEADLINE', 'SESSION_DEADLINE', this.current.startedAtMs + LIMITS.deadlineMs);
      if (this.owned) this.signalCancellation(this.owned, 'SESSION_DEADLINE', now);
    }
    return now;
  }
  private event(kind: string, now: number, frame?: Frame, detail: string | null = null) {
    if (this.events.length === LIMITS.events) {
      this.overflow = true;
      if (this.current?.terminal === null) this.terminalize('FAILED', 'EVENT_LIMIT', now, false);
      return;
    }
    this.events.push({ kind, atMs: now, sessionId: frame?.binding.sessionId ?? this.current?.binding.sessionId ?? null,
      jobId: frame?.binding.jobId ?? null, detail });
  }
  private terminalize(terminal: Terminal, reason: string, now: number, record = true) {
    const session = this.current;
    if (!session || session.terminal !== null) return;
    session.terminal = terminal; session.reason = reason; session.terminalAtMs = now;
    if (record) this.event('TERMINAL_' + terminal, now, undefined, reason);
    // Logical invalidation never clears ownership or claims native preemption.
  }
  private signalCancellation(owner: Owned, reason: string, now: number) {
    if (!owner.resource || !owner.beginStarted || owner.completionSeen || owner.cancelSignalled) return;
    owner.cancelSignalled = true;
    try { owner.resource.cancel(reason); }
    catch { this.event('CANCEL_SIGNAL_ERROR', now, owner.frame); }
  }
  start(binding: Binding, gates = { galleryReady: true, sourceReady: true, permission: true, offline: true }) {
    const now = this.time();
    if (Object.keys(binding).sort().join(',') !== 'galleryRevision,modelSha256,recipeSha256,sessionId,sourceSha256' ||
        Object.values(gates).some(v => typeof v !== 'boolean')) throw Error('INVALID_BINDING_OR_GATES');
    if (this.owned || this.current?.terminal === null || this.overflow) { this.event('START_BLOCKED', now); return false; }
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/.test(binding.sessionId) ||
        !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/.test(binding.galleryRevision) ||
        [binding.sourceSha256, binding.modelSha256, binding.recipeSha256].some(h => !/^[a-f0-9]{64}$/.test(h))) throw Error('INVALID_BINDING');
    if (this.results.some(s => s.binding.sessionId === binding.sessionId)) throw Error('SESSION_ID_REUSED');
    if (this.results.length === LIMITS.sessions) throw Error('SESSION_LIMIT');
    this.current = { binding: { ...binding }, startedAtMs: now, terminal: null, terminalAtMs: null, reason: null, frames: [] };
    this.results.push(this.current); this.event('START', now);
    const refusal = !gates.galleryReady ? 'GALLERY_NOT_FROZEN' : !gates.sourceReady ? 'SOURCE_NOT_READY' :
      !gates.permission ? 'PERMISSION_DENIED' : !gates.offline ? 'OFFLINE_POLICY_LOSS' : null;
    if (refusal) this.terminalize('FAILED', refusal, now);
    return refusal === null;
  }
  request(gates = { ready: true, permission: true, offline: true }) {
    const now = this.time(), session = this.current;
    if (Object.keys(gates).sort().join(',') !== 'offline,permission,ready' || Object.values(gates).some(v => typeof v !== 'boolean')) throw Error('INVALID_GATES');
    // A current safety observation invalidates existing work even when no new job can be admitted.
    if (session?.terminal === null && !gates.permission) {
      this.terminalize('FAILED', 'PERMISSION_DENIED', now);
      if (this.owned) this.signalCancellation(this.owned, 'PERMISSION_DENIED', now);
      return false;
    }
    if (session?.terminal === null && !gates.offline) { this.cancel('OFFLINE_POLICY_LOSS'); return false; }
    if (!session || session.terminal !== null || this.owned || this.overflow) { this.event('REQUEST_BLOCKED', now); return false; }
    if (!gates.ready) { this.event('NOT_READY', now); return false; }
    const captures = session.frames.filter(f => f.selected);
    if (session.frames.length === LIMITS.attempts || captures.length && now - session.startedAtMs - captures.at(-1)!.capturedAtMs! < LIMITS.gapMs) {
      this.event('ATTEMPT_OR_GAP_REFUSED', now); return false;
    }
    const frame: Frame = { binding: { ...session.binding, jobId: 'job-' + ++this.jobs }, requestAtMs: now - session.startedAtMs,
      capturedAtMs: null, completedAtMs: null, selected: false, disposition: 'PENDING', failureCode: null,
      values: null, releaseAttempts: 0, released: false };
    session.frames.push(frame); this.event('REQUEST', now, frame);
    // Factory calls may re-enter public methods; reserve the sole admission before invoking it.
    const owner: Owned = { session, frame, resource: null, beginStarted: false, completionSeen: false, cancelSignalled: false };
    this.owned = owner;
    let resource: Resource;
    try { resource = this.adapter.create({ ...frame.binding }); }
    catch {
      // No resource was returned and begin was never called. Clear this reservation only; no release is claimed.
      if (this.owned === owner) this.owned = null;
      frame.disposition = 'FAILED'; frame.failureCode = 'CREATE_ERROR'; this.terminalize('FAILED', 'CREATE_ERROR', this.time()); return true;
    }
    owner.resource = resource;
    // Observe time spent in the factory before attaching callbacks; an invalidated resource still needs real drain.
    this.time(); owner.beginStarted = true;
    try { resource.begin({ captured: b => this.capture(owner, b), completed: (b, o) => this.complete(owner, b, o) }); }
    catch {
      if (!owner.completionSeen) { frame.disposition = 'FAILED'; frame.failureCode = 'START_ERROR'; this.terminalize('FAILED', 'START_ERROR', this.time()); }
      // A thrown start does not establish that owned work has drained.
    }
    if (session.terminal !== null) this.signalCancellation(owner, session.reason!, this.time());
    return true;
  }
  private capture(owner: Owned, binding: JobBinding) {
    const now = this.time(), { frame, session } = owner;
    if (!same(frame.binding, binding) || owner.completionSeen || this.owned !== owner || frame.capturedAtMs !== null) {
      this.event('STALE_OR_DUPLICATE_CAPTURE', now, frame); return;
    }
    frame.capturedAtMs = now - session.startedAtMs;
    const previous = session.frames.filter(f => f !== frame && f.selected).at(-1);
    frame.selected = session === this.current && session.terminal === null && frame.capturedAtMs < LIMITS.deadlineMs &&
      (!previous || frame.capturedAtMs - previous.capturedAtMs! >= LIMITS.gapMs);
    this.event(frame.selected ? 'CAPTURE_SELECTED' : 'CAPTURE_NOT_SELECTED', now, frame);
  }
  private complete(owner: Owned, binding: JobBinding, outcome: Outcome) {
    const now = this.time(), { frame, session } = owner;
    if (!same(frame.binding, binding) || owner.completionSeen || this.owned !== owner) {
      this.event('STALE_OR_DUPLICATE_COMPLETION', now, frame); return;
    }
    owner.completionSeen = true; frame.completedAtMs = now - session.startedAtMs;
    frame.releaseAttempts++;
    try { owner.resource!.release(); frame.released = true; this.owned = null; }
    catch { frame.disposition = 'FAILED'; frame.failureCode = 'RELEASE_ERROR'; this.terminalize('FAILED', 'RELEASE_ERROR', now); this.event('RELEASE_UNCONFIRMED', now, frame); return; }
    this.event('OWNED_RELEASE', now, frame);
    if (session !== this.current || session.terminal !== null) {
      frame.disposition = frame.failureCode ? 'FAILED' : frame.completedAtMs >= LIMITS.deadlineMs ? 'LATE' : 'CANCELLED';
    } else if (outcome.kind === 'FAILURE') {
      frame.disposition = 'FAILED'; frame.failureCode = outcome.code; this.terminalize('FAILED', outcome.code, now);
    } else if (!Array.isArray(outcome.values) || !outcome.values.length || outcome.values.length > 1024 ||
        outcome.values.some(v => !Number.isFinite(v)) || outcome.values.every(v => v === 0)) {
      frame.disposition = 'FAILED'; frame.failureCode = 'INVALID_VECTOR'; this.terminalize('FAILED', 'INVALID_VECTOR', now);
    } else if (frame.capturedAtMs === null) {
      frame.disposition = 'FAILED'; frame.failureCode = 'MISSING_CAPTURE'; this.terminalize('FAILED', 'MISSING_CAPTURE', now);
    } else if (!frame.selected) {
      frame.disposition = 'NOT_SELECTED';
    } else { frame.disposition = 'USABLE'; frame.values = [...outcome.values]; }
    this.event('COMPLETION_' + frame.disposition, now, frame);
    if (session.terminal === null && session.frames.length === LIMITS.attempts) this.terminalize('COMPLETE', 'ATTEMPTS_FINISHED', now);
  }
  cancel(reason: 'USER' | 'BACKGROUND' | 'UNMOUNT' | 'OFFLINE_POLICY_LOSS' = 'USER') {
    const now = this.time();
    if (!this.current || this.current.terminal !== null) return;
    this.terminalize('CANCELLED', reason, now);
    if (this.owned) this.signalCancellation(this.owned, reason, now);
  }
  poll() { this.time(); return this.snapshot(); }
  snapshot() {
    return copy({ state: this.owned && this.current?.terminal !== null ? 'DRAINING' : this.current?.terminal ?? (this.current ? 'RUNNING' : 'IDLE'),
      stillOwnedWork: this.owned !== null, activeJobId: this.owned?.frame.binding.jobId ?? null,
      creationPending: this.owned !== null && this.owned.resource === null,
      eventLimitExceeded: this.overflow, sessions: this.results, events: this.events });
  }
}
