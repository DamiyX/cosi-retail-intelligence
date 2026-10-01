import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import type { AudioPlayer } from 'expo-audio';
import { scanCueTrace, type CueOrigin } from './scanCueTrace';

type Cue = 'match' | 'code-read';
type Feedback = (cue?: Cue, isCurrent?: () => boolean, origin?: CueOrigin) => void;
const MAX_DELAY_MS = 500;

/** Optional, bounded playback. Neither native readiness nor seeking blocks a sale. */
export function useScanFeedback(enabled: boolean, context?: { focused: boolean; muted: boolean }): Feedback {
  const play = useRef<Feedback>(() => undefined);
  const hook = useRef<number | undefined>(undefined);
  useEffect(() => {
    hook.current = scanCueTrace.hook();
    scanCueTrace.mark('hook-mount', { hook: hook.current });
    return () => scanCueTrace.mark('hook-unmount', { hook: hook.current });
  }, []);
  useEffect(() => {
    try {
      if (scanCueTrace.active) scanCueTrace.mark('inputs', { hook: hook.current, enabled,
        focused: context?.focused, muted: context?.muted, appState: AppState.currentState });
    } catch { /* Diagnostic reads remain optional. */ }
  }, [enabled, context?.focused, context?.muted]);
  useEffect(() => {
    if (!enabled) return;
    const players: Partial<Record<Cue, AudioPlayer>> = {};
    const loaded = new Set<Cue>();
    const cleanups: (() => void)[] = [];
    let generation = 0;
    let pending: { cue: Cue; token: number; isCurrent: () => boolean; attempt?: number; origin: CueOrigin } | null = null;
    let attempt: number | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cancel = (reason: 'next-request' | 'timeout' | 'background' | 'cleanup' | 'sync-error') => {
      generation++; pending = null; clearTimeout(timer);
      scanCueTrace.mark('cancel', { hook: hook.current, attempt, reason, error: reason === 'sync-error' });
      attempt = undefined;
    };
    const flush = () => {
      const request = pending;
      if (!request) return;
      const instance = players[request.cue];
      try {
        if (!instance || (!loaded.has(request.cue) && !instance.isLoaded)) return;
        loaded.add(request.cue);
        pending = null;
        const fields = { hook: hook.current, attempt: request.attempt, cue: request.cue, origin: request.origin };
        scanCueTrace.mark('ready', { ...fields, loaded: true });
        scanCueTrace.mark('seek-start', fields);
        let stage: 'seek' | 'guard' | 'play' = 'seek';
        void instance.seekTo(0).then(() => {
          stage = 'guard';
          scanCueTrace.mark('seek-resolve', fields);
          const tokenCurrent = request.token === generation;
          let intentCurrent: boolean | undefined;
          if (tokenCurrent && (intentCurrent = request.isCurrent()) && AppState.currentState === 'active') {
            stage = 'play';
            instance.play();
            clearTimeout(timer);
            scanCueTrace.mark('play-called', { ...fields, current: true, appState: 'active' });
          } else {
            scanCueTrace.mark('seek-drop', { ...fields, current: tokenCurrent ? intentCurrent : false, reason: 'inactive-or-stale' });
          }
        }).catch(() => { scanCueTrace.mark(stage === 'seek' ? 'seek-error' : stage === 'guard' ? 'guard-error' : 'play-error',
          { ...fields, error: true }); /* Visual feedback remains authoritative. */ });
      } catch { cancel('sync-error'); }
    };
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const audio = require('expo-audio') as typeof import('expo-audio');
      for (const cue of ['match', 'code-read'] as const) {
        scanCueTrace.mark('create-start', { hook: hook.current, cue });
        const instance = audio.createAudioPlayer(cue === 'match' ? require('./scan-added.wav') : require('./code-read.wav'), { updateInterval: 100 });
        players[cue] = instance;
        scanCueTrace.mark('create-ok', { hook: hook.current, cue });
        cleanups.push(() => { scanCueTrace.mark('release', { hook: hook.current, cue }); instance.remove(); });
        instance.volume = 0.3;
        const listener = instance.addListener('playbackStatusUpdate', status => {
          if (status.isLoaded) loaded.add(cue); else loaded.delete(cue);
          flush();
          try {
            if (scanCueTrace.active) scanCueTrace.mark('status', { hook: hook.current, attempt, cue,
              loaded: status.isLoaded, playing: status.playing, finished: status.didJustFinish, error: Boolean(status.error) });
          } catch { /* Diagnostic reads remain optional. */ }
        });
        cleanups.push(() => listener.remove());
      }
      const subscription = AppState.addEventListener('change', state => {
        scanCueTrace.mark('app-state', { hook: hook.current, appState: state });
        if (state !== 'active') {
          cancel('background');
          for (const instance of Object.values(players)) { try { instance.pause(); } catch { /* optional */ } }
        }
      });
      cleanups.push(() => subscription.remove());
      play.current = (cue = 'match', isCurrent = () => true, origin = 'UNSPECIFIED') => {
        cancel('next-request');
        attempt = scanCueTrace.attempt();
        scanCueTrace.mark('request', { hook: hook.current, attempt, cue, origin });
        const state = AppState.currentState;
        let current: boolean | undefined;
        if (state !== 'active' || !(current = isCurrent())) {
          scanCueTrace.mark('request-drop', { hook: hook.current, attempt, current, appState: state, reason: 'inactive-or-stale' });
          return;
        }
        pending = { cue, token: generation, isCurrent, attempt, origin };
        timer = setTimeout(() => cancel('timeout'), MAX_DELAY_MS);
        flush();
      };
    } catch { scanCueTrace.mark('create-error', { hook: hook.current, error: true }); /* Missing native audio never blocks scanning. */ }
    return () => {
      play.current = () => undefined;
      cancel('cleanup');
      for (const cleanup of cleanups.reverse()) { try { cleanup(); } catch { /* already released */ } }
    };
  }, [enabled]);
  return useCallback((cue, isCurrent, origin) => {
    scanCueTrace.mark('feedback-call', { hook: hook.current, enabled, cue, origin });
    if (enabled) play.current(cue, isCurrent, origin);
  }, [enabled]);
}
