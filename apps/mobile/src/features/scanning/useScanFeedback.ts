import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import type { AudioPlayer } from 'expo-audio';

type Cue = 'match' | 'code-read';
type Feedback = (cue?: Cue, isCurrent?: () => boolean) => void;
const MAX_DELAY_MS = 500;

/** Optional, bounded playback. Neither native readiness nor seeking blocks a sale. */
export function useScanFeedback(enabled: boolean): Feedback {
  const play = useRef<Feedback>(() => undefined);
  useEffect(() => {
    if (!enabled) return;
    const players: Partial<Record<Cue, AudioPlayer>> = {};
    const loaded = new Set<Cue>();
    const cleanups: (() => void)[] = [];
    let generation = 0;
    let pending: { cue: Cue; token: number; isCurrent: () => boolean } | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cancel = () => { generation++; pending = null; clearTimeout(timer); };
    const flush = () => {
      const request = pending;
      if (!request) return;
      const instance = players[request.cue];
      try {
        if (!instance || (!loaded.has(request.cue) && !instance.isLoaded)) return;
        loaded.add(request.cue);
        pending = null;
        void instance.seekTo(0).then(() => {
          if (request.token === generation && request.isCurrent() && AppState.currentState === 'active') {
            instance.play();
            clearTimeout(timer);
          }
        }).catch(() => { /* Visual feedback remains authoritative. */ });
      } catch { cancel(); }
    };
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const audio = require('expo-audio') as typeof import('expo-audio');
      for (const cue of ['match', 'code-read'] as const) {
        const instance = audio.createAudioPlayer(cue === 'match' ? require('./scan-added.wav') : require('./code-read.wav'), { updateInterval: 100 });
        players[cue] = instance;
        cleanups.push(() => instance.remove());
        instance.volume = 0.3;
        const listener = instance.addListener('playbackStatusUpdate', status => {
          if (status.isLoaded) loaded.add(cue); else loaded.delete(cue);
          flush();
        });
        cleanups.push(() => listener.remove());
      }
      const subscription = AppState.addEventListener('change', state => {
        if (state !== 'active') {
          cancel();
          for (const instance of Object.values(players)) { try { instance.pause(); } catch { /* optional */ } }
        }
      });
      cleanups.push(() => subscription.remove());
      play.current = (cue = 'match', isCurrent = () => true) => {
        cancel();
        if (AppState.currentState !== 'active' || !isCurrent()) return;
        pending = { cue, token: generation, isCurrent };
        timer = setTimeout(cancel, MAX_DELAY_MS);
        flush();
      };
    } catch { /* Missing native audio never blocks scanning. */ }
    return () => {
      play.current = () => undefined;
      cancel();
      for (const cleanup of cleanups.reverse()) { try { cleanup(); } catch { /* already released */ } }
    };
  }, [enabled]);
  return useCallback((cue, isCurrent) => { if (enabled) play.current(cue, isCurrent); }, [enabled]);
}
