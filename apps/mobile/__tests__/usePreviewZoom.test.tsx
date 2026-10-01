import { act, renderHook } from '@testing-library/react-native';
import { AppState, type GestureResponderEvent } from 'react-native';
import { usePreviewZoom } from '../src/features/scanning/usePreviewZoom';

function event(distance: number, ids = [1, 2], targets = [10, 10]): GestureResponderEvent {
  return { nativeEvent: { touches: ids.map((identifier, index) => ({ identifier, target: targets[index], pageX: index * distance, pageY: 0 })) } } as unknown as GestureResponderEvent;
}
beforeEach(() => { Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active' }); });

it('zooms relative to a stable two-finger start, tolerates ordering and clamps finite extremes', () => {
  const { result, unmount } = renderHook(() => usePreviewZoom(true));
  act(() => result.current.gestureHandlers.onResponderGrant(event(100)));
  act(() => result.current.gestureHandlers.onResponderMove(event(200, [2, 1])));
  expect(result.current.zoom).toBe(0.25);
  act(() => result.current.gestureHandlers.onResponderMove(event(400)));
  expect(result.current.zoom).toBe(0.5);
  act(() => result.current.gestureHandlers.onResponderMove(event(1000000)));
  expect(result.current.zoom).toBe(1);
  act(() => result.current.gestureHandlers.onResponderMove(event(8)));
  expect(result.current.zoom).toBe(0);
  unmount();
});

it('leaves one-finger scrolling, sibling controls and malformed/tiny/multi-touch inputs unclaimed', () => {
  const { result, unmount } = renderHook(() => usePreviewZoom(true));
  for (const input of [event(100, [1]), event(100, [1, 2, 3]), event(100, [1, 1]), event(100, [1, 2], [10, 11]), event(0), event(7), event(NaN), event(Infinity)]) {
    expect(result.current.gestureHandlers.onStartShouldSetResponderCapture(input)).toBe(false);
    expect(result.current.gestureHandlers.onMoveShouldSetResponder(input)).toBe(false);
    act(() => { result.current.gestureHandlers.onResponderGrant(input); result.current.gestureHandlers.onResponderMove(event(200)); });
    expect(result.current.zoom).toBe(0);
  }
  expect(result.current.gestureHandlers.onStartShouldSetResponder(event(100))).toBe(true);
  unmount();
});

it('cancels on finger replacement and starts the replacement pair without a jump', () => {
  const { result, unmount } = renderHook(() => usePreviewZoom(true));
  act(() => { result.current.gestureHandlers.onResponderGrant(event(100)); result.current.gestureHandlers.onResponderMove(event(200)); });
  act(() => result.current.gestureHandlers.onResponderMove(event(400, [1, 3])));
  expect(result.current.zoom).toBe(0.25);
  act(() => result.current.gestureHandlers.onResponderMove(event(800)));
  expect(result.current.zoom).toBe(0.25);
  act(() => result.current.gestureHandlers.onResponderStart(event(400, [1, 3])));
  expect(result.current.zoom).toBe(0.25);
  act(() => result.current.gestureHandlers.onResponderMove(event(800, [1, 3])));
  expect(result.current.zoom).toBe(0.5);
  unmount();
});

it('cancels after touch end, termination, invalid movement, layout and explicit controls', () => {
  const { result, unmount } = renderHook(() => usePreviewZoom(true));
  const cancellations = [
    () => result.current.gestureHandlers.onResponderEnd(),
    () => result.current.gestureHandlers.onResponderRelease(),
    () => result.current.gestureHandlers.onResponderTerminate(),
    () => result.current.gestureHandlers.onTouchCancel(),
    () => result.current.gestureHandlers.onLayout(),
    () => result.current.gestureHandlers.onResponderMove(event(0)),
    () => result.current.reset(),
  ];
  for (const cancel of cancellations) {
    act(() => { result.current.gestureHandlers.onResponderGrant(event(100)); cancel(); result.current.gestureHandlers.onResponderMove(event(200)); });
    expect(result.current.zoom).toBe(0);
  }
  act(() => { result.current.gestureHandlers.onResponderGrant(event(100)); result.current.zoomIn(); result.current.gestureHandlers.onResponderMove(event(400)); });
  expect(result.current.zoom).toBe(0.1);
  act(() => { for (let i = 0; i < 20; i++) result.current.zoomIn(); });
  expect(result.current.zoom).toBe(1);
  act(() => { for (let i = 0; i < 20; i++) result.current.zoomOut(); });
  expect(result.current.zoom).toBe(0);
  unmount();
});

it('blocks unavailable/background/unmounted work and cancels across availability changes', () => {
  const { result, rerender, unmount } = renderHook(({ available }: { available: boolean }) => usePreviewZoom(available), { initialProps: { available: true } });
  act(() => result.current.gestureHandlers.onResponderGrant(event(100)));
  const previousPreview = result.current;
  rerender({ available: false });
  act(() => result.current.zoomIn());
  expect(result.current.gestureHandlers.onMoveShouldSetResponderCapture(event(100))).toBe(false);
  rerender({ available: true });
  act(() => { previousPreview.zoomIn(); previousPreview.gestureHandlers.onResponderGrant(event(100)); previousPreview.gestureHandlers.onResponderMove(event(200)); });
  expect(previousPreview.gestureHandlers.onStartShouldSetResponder(event(100))).toBe(false);
  act(() => result.current.gestureHandlers.onResponderMove(event(200)));
  expect(result.current.zoom).toBe(0);
  Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'background' });
  act(() => { result.current.zoomIn(); result.current.gestureHandlers.onResponderGrant(event(100)); result.current.gestureHandlers.onResponderMove(event(200)); });
  expect(result.current.zoom).toBe(0);
  Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active' });
  const stale = result.current;
  unmount();
  act(() => { stale.zoomIn(); stale.gestureHandlers.onResponderGrant(event(100)); stale.gestureHandlers.onResponderMove(event(200)); });
  expect(stale.gestureHandlers.onStartShouldSetResponder(event(100))).toBe(false);
});
