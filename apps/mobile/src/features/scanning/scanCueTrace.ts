import Constants from 'expo-constants';
import { isScannerVerificationBuild } from './verificationBuild';

// TEMPORARY M8 diagnostic. Remove after the coordinated native observation.
export type CueOrigin = 'SINGLE_MATCH' | 'BASKET_VALIDATED_ADD' | 'CODE_READ' | 'UNSPECIFIED';
const events = ['hook-mount', 'hook-unmount', 'inputs', 'create-start', 'create-ok', 'create-error',
  'release', 'feedback-call', 'request', 'request-drop', 'ready', 'seek-start', 'seek-resolve',
  'seek-error', 'guard-error', 'play-called', 'play-error', 'seek-drop', 'cancel', 'app-state', 'status',
  'intent-ended', 'explicit-rearm', 'trace-limit'] as const;
type Event = typeof events[number];
export interface CueTraceFields {
  hook?: number;
  attempt?: number;
  cue?: 'match' | 'code-read';
  origin?: CueOrigin;
  focused?: boolean;
  muted?: boolean;
  enabled?: boolean;
  current?: boolean;
  loaded?: boolean;
  playing?: boolean;
  finished?: boolean;
  error?: boolean;
  appState?: 'active' | 'background' | 'inactive' | 'unknown' | 'extension';
  reason?: 'next-request' | 'timeout' | 'background' | 'cleanup' | 'sync-error' | 'inactive-or-stale';
}
export interface CueTrace {
  readonly active: boolean;
  hook(): number | undefined;
  attempt(): number | undefined;
  mark(event: Event, fields?: CueTraceFields): void;
}
const disabled: CueTrace = { active: false, hook: () => undefined, attempt: () => undefined, mark: () => undefined };
const MAX_EVENTS = 128;

/** One transient session, shared across hook/route remounts. Never accepts free text. */
export function createScanCueTrace(
  flag: unknown,
  config: Parameters<typeof isScannerVerificationBuild>[0],
  output: (line: string) => void = line => console.info(line),
  now: () => number = () => performance.now(),
): CueTrace {
  try { if (flag !== 'true' || !isScannerVerificationBuild(config)) return disabled; }
  catch { return disabled; }
  let count = 0;
  let hooks = 0;
  let attempts = 0;
  let started: number | undefined;
  let elapsed = 0;
  const statuses = new Map<string, string>();
  return {
    get active() { return count < MAX_EVENTS; },
    hook: () => count < MAX_EVENTS ? ++hooks : undefined,
    attempt: () => count < MAX_EVENTS ? ++attempts : undefined,
    mark(event, fields = {}) {
      try {
        if (count >= MAX_EVENTS || !events.includes(event)) return;
        const safe: Record<string, string | number | boolean> = { event };
        for (const key of ['hook', 'attempt'] as const) {
          const value = fields[key];
          if (Number.isSafeInteger(value) && value! > 0) safe[key] = value!;
        }
        for (const key of ['focused', 'muted', 'enabled', 'current', 'loaded', 'playing', 'finished', 'error'] as const) {
          const value = fields[key];
          if (typeof value === 'boolean') safe[key] = value;
        }
        const { cue, origin, appState, reason } = fields;
        if (cue === 'match' || cue === 'code-read') safe.cue = cue;
        if (origin && ['SINGLE_MATCH', 'BASKET_VALIDATED_ADD', 'CODE_READ', 'UNSPECIFIED'].includes(origin)) safe.origin = origin;
        if (appState && ['active', 'background', 'inactive', 'unknown', 'extension'].includes(appState)) safe.appState = appState;
        if (reason && ['next-request', 'timeout', 'background', 'cleanup', 'sync-error', 'inactive-or-stale'].includes(reason)) safe.reason = reason;
        // Native periodic updates are observed only when these safe state fields change.
        if (event === 'status') {
          const key = `${safe.hook ?? 0}:${safe.cue ?? ''}`;
          const snapshot = JSON.stringify(safe);
          if (statuses.get(key) === snapshot) return;
          statuses.set(key, snapshot);
        }
        count++; // Failed clock/output attempts also consume the bounded budget.
        const time = now();
        if (!Number.isFinite(time)) return;
        started ??= time;
        elapsed = Math.max(elapsed, Math.min(Number.MAX_SAFE_INTEGER, Math.round(time - started)));
        // Reserve the last event as an explicit exhaustion notice.
        const payload = count === MAX_EVENTS ? { event: 'trace-limit' } : safe;
        output(`[SCAN_CUE_TRACE] ${JSON.stringify({ seq: count, ms: elapsed, ...payload })}`);
      } catch { /* Diagnostics cannot throw into playback or checkout. */ }
    },
  };
}

function configuredTrace(): CueTrace {
  try {
    if (process.env.EXPO_PUBLIC_SCANNER_CUE_TRACE !== 'true') return disabled;
    return createScanCueTrace('true', Constants.expoConfig);
  } catch { return disabled; }
}
export const scanCueTrace = configuredTrace();
