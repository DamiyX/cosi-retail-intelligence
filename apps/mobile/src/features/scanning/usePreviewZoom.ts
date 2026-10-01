import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AppState, type AccessibilityActionEvent, type GestureResponderEvent, type LayoutChangeEvent, type View } from 'react-native';

const THUMB_SIZE = 20;
const MIN_TRACK_WIDTH = 48;
type Finger = { id: string; x: number };
type Geometry = { left: number; width: number; offset: number };
type Drag = { id: string; firstX: number; latestX: number; startZoom: number; geometry: Geometry | null };

function finger(event: GestureResponderEvent): Finger | null {
  const touches = event?.nativeEvent?.touches;
  if (!Array.isArray(touches) || touches.length !== 1) return null;
  const touch = touches[0];
  if (!touch || !Number.isFinite(touch.pageX) || !Number.isFinite(touch.pageY)) return null;
  const id = touch.identifier;
  if (!(typeof id === 'number' && Number.isFinite(id)) && !(typeof id === 'string' && id.length > 0)) return null;
  // pageX and View.measure's pageX share the root coordinate space. locationX
  // may instead belong to the thumb/rail child and is intentionally ignored.
  return { id: String(id), x: touch.pageX };
}

/** Preview UI only: one-thumb slider, never a recognition or business command. */
export function usePreviewZoom(available: boolean) {
  const [zoom, setZoom] = useState(0);
  const [trackWidth, setTrackWidth] = useState(0);
  const value = useRef(0);
  const width = useRef(0);
  const trackRef = useRef<View | null>(null);
  const epoch = useMemo(() => ({ available }), [available]);
  const currentEpoch = useRef<object | null>(null);
  const drag = useRef<Drag | null>(null);
  const measurement = useRef(0);
  useLayoutEffect(() => {
    currentEpoch.current = epoch;
    drag.current = null;
    measurement.current++;
    return () => { currentEpoch.current = null; drag.current = null; };
  }, [epoch]);

  const controls = useMemo(() => {
    const mounted = () => currentEpoch.current === epoch;
    const live = () => mounted() && epoch.available && AppState.currentState === 'active';
    const cancel = () => { drag.current = null; measurement.current++; };
    const update = (next: number) => {
      if (!live() || !Number.isFinite(next)) return;
      value.current = Math.round(Math.max(0, Math.min(1, next)) * 1000000) / 1000000;
      setZoom(value.current);
    };
    const step = (delta: number) => { if (!live()) return; cancel(); update(value.current + delta); };
    const apply = (start: Drag) => {
      const geometry = start.geometry;
      if (geometry) update((start.latestX - geometry.left - THUMB_SIZE / 2 - geometry.offset) / (geometry.width - THUMB_SIZE));
    };
    const claim = (event: GestureResponderEvent) => live() && width.current >= MIN_TRACK_WIDTH && finger(event) !== null;
    const begin = (event: GestureResponderEvent) => {
      if (!live()) return;
      cancel();
      const touch = finger(event);
      const node = trackRef.current;
      if (!touch || width.current < MIN_TRACK_WIDTH || !node) return;
      const start: Drag = { id: touch.id, firstX: touch.x, latestX: touch.x, startZoom: value.current, geometry: null };
      drag.current = start;
      const ticket = measurement.current;
      try {
        // Refresh origin at grant: scrolling can move the track after layout.
        node.measure((_x, _y, measuredWidth, height, pageX, pageY) => {
          if (!live() || ticket !== measurement.current || drag.current !== start || trackRef.current !== node) return;
          if (![measuredWidth, height, pageX, pageY].every(Number.isFinite) || measuredWidth < MIN_TRACK_WIDTH || height < 48) { cancel(); return; }
          const center = pageX + THUMB_SIZE / 2 + start.startZoom * (measuredWidth - THUMB_SIZE);
          // Grabbing any point on the thumb keeps its current value; a track
          // tap seeks to that measured position. Child target IDs do not matter.
          const offset = Math.abs(start.firstX - center) <= THUMB_SIZE / 2 ? start.firstX - center : 0;
          start.geometry = { left: pageX, width: measuredWidth, offset };
          setTrackWidth(measuredWidth);
          width.current = measuredWidth;
          apply(start);
        });
      } catch { if (drag.current === start) cancel(); }
    };
    return {
      zoomIn: () => step(0.1),
      zoomOut: () => step(-0.1),
      onAccessibilityAction: (event: AccessibilityActionEvent) => {
        if (event.nativeEvent.actionName === 'increment') step(0.1);
        if (event.nativeEvent.actionName === 'decrement') step(-0.1);
      },
      trackHandlers: {
        onLayout: (event: LayoutChangeEvent) => {
          if (!mounted()) return;
          cancel();
          const next = event.nativeEvent.layout.width;
          width.current = Number.isFinite(next) && next >= MIN_TRACK_WIDTH ? next : 0;
          setTrackWidth(width.current);
        },
        onStartShouldSetResponder: claim,
        onStartShouldSetResponderCapture: claim,
        onMoveShouldSetResponder: claim,
        onMoveShouldSetResponderCapture: claim,
        onResponderGrant: begin,
        onResponderStart: (event: GestureResponderEvent) => {
          if (!live()) return;
          if (finger(event)?.id !== drag.current?.id) cancel();
        },
        onResponderMove: (event: GestureResponderEvent) => {
          if (!live()) return;
          const touch = finger(event);
          const start = drag.current;
          if (!touch || !start || start.id !== touch.id) { cancel(); return; }
          start.latestX = touch.x;
          apply(start);
        },
        onResponderEnd: cancel,
        onResponderRelease: cancel,
        onResponderTerminate: cancel,
        onTouchCancel: cancel,
        onResponderTerminationRequest: () => true,
      },
    };
  }, [epoch]);
  return { zoom, trackRef, trackWidth, ...controls };
}
