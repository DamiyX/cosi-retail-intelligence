import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import type { AudioPlayer } from 'expo-audio';

/** Optional playback only. A missing native module never interrupts a sale. */
export function useScanFeedback(enabled: boolean): () => void {
  const player = useRef<AudioPlayer | null>(null);
  useEffect(() => {
    if (!enabled) return;
    try {
      // Keep native evaluation behind the optional feedback boundary.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const audio = require('expo-audio') as typeof import('expo-audio');
      const instance = audio.createAudioPlayer(require('./scan-added.wav'));
      instance.volume = 0.3;
      player.current = instance;
      const subscription = AppState.addEventListener('change', state => {
        if (state !== 'active') instance.pause();
      });
      return () => { player.current = null; subscription.remove(); instance.remove(); };
    } catch {
      player.current = null;
    }
  }, [enabled]);
  return useCallback(() => {
    const instance = player.current;
    if (!enabled || !instance || AppState.currentState !== 'active') return;
    try {
      void instance.seekTo(0).then(() => {
        if (player.current === instance && AppState.currentState === 'active') instance.play();
      }).catch(() => { /* Visual feedback remains authoritative. */ });
    } catch { /* A released player must not interrupt cart mutation. */ }
  }, [enabled]);
}
