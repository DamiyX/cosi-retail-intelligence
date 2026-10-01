import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AppState, type GestureResponderEvent } from 'react-native';

type Touch = { identifier: string | number; target: string | number; pageX: number; pageY: number };
type Pair = { ids: string; target: string; distance: number };

function pair(touches: readonly Touch[] | undefined): Pair | null {
  if (!Array.isArray(touches) || touches.length !== 2) return null;
  const [a, b] = touches;
  if (!a || !b || ![a.pageX, a.pageY, b.pageX, b.pageY].every(Number.isFinite)) return null;
  const scalar = (value: unknown): value is string | number =>
    (typeof value === 'string' && value.length > 0) || (typeof value === 'number' && Number.isFinite(value));
  if (![a.identifier, b.identifier, a.target, b.target].every(scalar)) return null;
  const ids = [String(a.identifier), String(b.identifier)].sort();
  // Both fingers must originate on the same preview target, not a sibling control.
  if (ids[0] === ids[1] || String(a.target) !== String(b.target)) return null;
  const distance = Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
  if (!Number.isFinite(distance) || distance < 8) return null;
  return { ids: JSON.stringify(ids), target: String(a.target), distance };
}

/** Preview-local UI state. Gestures never affect recognition or the sale draft. */
export function usePreviewZoom(available: boolean) {
  const [zoom, setZoom] = useState(0);
  const value = useRef(0);
  const epoch = useMemo(() => ({ available }), [available]);
  const liveEpoch = useRef<object | null>(null);
  const gesture = useRef<(Pair & { zoom: number }) | null>(null);
  useLayoutEffect(() => {
    liveEpoch.current = available ? epoch : null;
    gesture.current = null;
    return () => { liveEpoch.current = null; gesture.current = null; };
  }, [available, epoch]);

  const controls = useMemo(() => {
    const live = () => liveEpoch.current === epoch && AppState.currentState === 'active';
    const cancel = () => { gesture.current = null; };
    const update = (next: number) => {
      if (!live() || !Number.isFinite(next)) return;
      value.current = Math.round(Math.max(0, Math.min(1, next)) * 1000000) / 1000000;
      setZoom(value.current);
    };
    const touches = (event: GestureResponderEvent) => pair(event?.nativeEvent?.touches);
    const claim = (event: GestureResponderEvent) => live() && touches(event) !== null;
    const begin = (event: GestureResponderEvent) => {
      const next = live() ? touches(event) : null;
      gesture.current = next ? { ...next, zoom: value.current } : null;
    };
    return {
      zoomIn: () => { cancel(); update(value.current + 0.1); },
      zoomOut: () => { cancel(); update(value.current - 0.1); },
      reset: () => { cancel(); update(0); },
      gestureHandlers: {
        onStartShouldSetResponder: claim,
        onStartShouldSetResponderCapture: claim,
        onMoveShouldSetResponder: claim,
        onMoveShouldSetResponderCapture: claim,
        onResponderGrant: begin,
        // A replacement finger starts a fresh baseline; it does not apply a delta.
        onResponderStart: begin,
        onResponderMove: (event: GestureResponderEvent) => {
          const start = gesture.current;
          const next = live() ? touches(event) : null;
          if (!start || !next || start.ids !== next.ids || start.target !== next.target) { cancel(); return; }
          update(start.zoom + Math.log2(next.distance / start.distance) * 0.25);
        },
        onResponderEnd: cancel,
        onResponderRelease: cancel,
        onResponderTerminate: cancel,
        onResponderTerminationRequest: () => true,
        onTouchCancel: cancel,
        onLayout: cancel,
      },
    };
  }, [epoch]);
  return { zoom, ...controls };
}
