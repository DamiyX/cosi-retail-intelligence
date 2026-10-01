import { act, renderHook } from '@testing-library/react-native';
import { AppState, type GestureResponderEvent, type LayoutChangeEvent, type View } from 'react-native';
import { usePreviewZoom } from '../src/features/scanning/usePreviewZoom';

type Measure = Parameters<View['measure']>[0];
const touch = (x: number, id = 1, count = 1, target = 10, locationX = 0) => ({ nativeEvent: { touches: Array.from({ length: count }, (_, n) => ({ identifier: id + n, pageX: x, pageY: 30, target, locationX })) } }) as unknown as GestureResponderEvent;
const layout = (width: number) => ({ nativeEvent: { layout: { width } } }) as LayoutChangeEvent;
beforeEach(() => Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active' }));
function setup() {
  const hook = renderHook(({ available }: { available: boolean }) => usePreviewZoom(available), { initialProps: { available: true } });
  const callbacks: Measure[] = [];
  hook.result.current.trackRef.current = { measure: (callback: Measure) => callbacks.push(callback) } as unknown as View;
  act(() => hook.result.current.trackHandlers.onLayout(layout(100)));
  const measured = (left = 50, width = 100, height = 48) => act(() => callbacks.shift()!(0, 0, width, height, left, 20));
  return { ...hook, callbacks, measured };
}

it('uses measured root coordinates for track and child touches, with no thumb-grab jump', () => {
  const { result, measured, unmount } = setup();
  act(() => result.current.trackHandlers.onResponderGrant(touch(100, 1, 1, 20, 2)));
  expect(result.current.zoom).toBe(0);
  measured();
  expect(result.current.zoom).toBe(0.5);
  // Touch eight pixels right of thumb center: retain value on grant.
  act(() => result.current.trackHandlers.onResponderGrant(touch(108, 1, 1, 99, 8)));
  measured();
  expect(result.current.zoom).toBe(0.5);
  act(() => result.current.trackHandlers.onResponderMove(touch(128, 1, 1, 10, 78)));
  expect(result.current.zoom).toBe(0.75);
  act(() => result.current.trackHandlers.onResponderMove(touch(1000)));
  expect(result.current.zoom).toBe(1);
  act(() => result.current.trackHandlers.onResponderMove(touch(-1000)));
  expect(result.current.zoom).toBe(0);
  unmount();
});

it('refreshes track origin after scroll and applies latest movement after async measurement', () => {
  const { result, measured, unmount } = setup();
  act(() => result.current.trackHandlers.onResponderGrant(touch(160)));
  act(() => result.current.trackHandlers.onResponderMove(touch(180)));
  measured(150);
  expect(result.current.zoom).toBe(0.25);
  unmount();
});

it('rejects malformed/unmeasured/tiny tracks and multiple fingers', () => {
  const { result, measured, unmount } = setup();
  for (const input of [touch(NaN), touch(Infinity), touch(100, 1, 2), touch(100, 1, 0)]) {
    expect(result.current.trackHandlers.onStartShouldSetResponder(input)).toBe(false);
    act(() => result.current.trackHandlers.onResponderGrant(input));
  }
  for (const size of [0, 20, NaN, Infinity]) {
    act(() => result.current.trackHandlers.onLayout(layout(size)));
    expect(result.current.trackHandlers.onMoveShouldSetResponder(touch(100))).toBe(false);
  }
  act(() => result.current.trackHandlers.onLayout(layout(100)));
  act(() => result.current.trackHandlers.onResponderGrant(touch(100)));
  measured(50, 20);
  expect(result.current.zoom).toBe(0);
  unmount();
});

it('ignores stale measurements after release, cancel, layout, replacement or endpoint step', () => {
  const { result, measured, unmount } = setup();
  for (const cancel of [
    () => result.current.trackHandlers.onResponderRelease(),
    () => result.current.trackHandlers.onResponderEnd(),
    () => result.current.trackHandlers.onResponderTerminate(),
    () => result.current.trackHandlers.onTouchCancel(),
    () => result.current.trackHandlers.onLayout(layout(100)),
    () => result.current.trackHandlers.onResponderMove(touch(100, 2)),
    () => result.current.trackHandlers.onResponderStart(touch(100, 1, 2)),
  ]) {
    act(() => { result.current.trackHandlers.onResponderGrant(touch(100)); cancel(); });
    measured();
    act(() => result.current.trackHandlers.onResponderMove(touch(140)));
    expect(result.current.zoom).toBe(0);
  }
  act(() => { result.current.trackHandlers.onResponderGrant(touch(100)); result.current.zoomIn(); });
  measured();
  expect(result.current.zoom).toBe(0.1);
  unmount();
});

it('old measurement cannot override a newly granted finger or unavailable/unmounted preview', () => {
  const { result, rerender, callbacks, measured, unmount } = setup();
  act(() => { result.current.trackHandlers.onResponderGrant(touch(100)); result.current.trackHandlers.onResponderGrant(touch(140, 2)); });
  measured(); expect(result.current.zoom).toBe(0);
  measured(); expect(result.current.zoom).toBe(1);
  const stale = result.current;
  act(() => result.current.trackHandlers.onResponderGrant(touch(100)));
  rerender({ available: false });
  measured(); expect(result.current.zoom).toBe(1);
  rerender({ available: true });
  act(() => stale.zoomOut()); expect(result.current.zoom).toBe(1);
  expect(stale.trackHandlers.onStartShouldSetResponder(touch(100))).toBe(false);
  act(() => result.current.trackHandlers.onResponderGrant(touch(100)));
  unmount(); act(() => callbacks.shift()!(0, 0, 100, 48, 50, 20));
});

it('adjustable actions and endpoints clamp and remain silent in background/disabled state', () => {
  const { result, rerender, unmount } = setup();
  const action = (name: string) => ({ nativeEvent: { actionName: name } }) as Parameters<typeof result.current.onAccessibilityAction>[0];
  act(() => { for (let i = 0; i < 20; i++) result.current.onAccessibilityAction(action('increment')); });
  expect(result.current.zoom).toBe(1);
  act(() => { for (let i = 0; i < 20; i++) result.current.onAccessibilityAction(action('decrement')); });
  expect(result.current.zoom).toBe(0);
  Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'background' });
  act(() => result.current.zoomIn()); expect(result.current.zoom).toBe(0);
  expect(result.current.trackHandlers.onStartShouldSetResponderCapture(touch(100))).toBe(false);
  rerender({ available: false });
  Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active' });
  act(() => result.current.zoomIn()); expect(result.current.zoom).toBe(0);
  unmount();
});
