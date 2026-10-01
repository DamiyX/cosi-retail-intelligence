import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { useScanFeedback } from '../src/features/scanning/useScanFeedback';

const mockPlayers: ReturnType<typeof mockMakePlayer>[] = [];
function mockMakePlayer() {
  return { volume: 1, isLoaded: true, seekTo: jest.fn().mockResolvedValue(undefined), play: jest.fn(), pause: jest.fn(), remove: jest.fn(),
    addListener: jest.fn((_event: string, callback: (status: { isLoaded: boolean }) => void) => { mockCallbacks.push(callback); return { remove: jest.fn() }; }) };
}
let mockCallbacks: ((status: { isLoaded: boolean }) => void)[] = [];
jest.mock('expo-audio', () => ({ createAudioPlayer: () => { const player = mockMakePlayer(); mockPlayers.push(player); return player; } }));
beforeEach(() => { mockPlayers.length = 0; mockCallbacks = []; jest.useFakeTimers(); Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active' }); });
afterEach(() => jest.useRealTimers());

it('plays ready match and distinct neutral cues; mute releases both players', async () => {
  const { result, rerender, unmount } = renderHook<ReturnType<typeof useScanFeedback>, { enabled: boolean }>(({ enabled }) => useScanFeedback(enabled), { initialProps: { enabled: true } });
  await act(async () => { result.current(); });
  expect(mockPlayers[0]!.play).toHaveBeenCalledTimes(1);
  await act(async () => { result.current('code-read'); });
  expect(mockPlayers[1]!.play).toHaveBeenCalledTimes(1);
  rerender({ enabled: false });
  await act(async () => { result.current(); });
  expect(mockPlayers[0]!.play).toHaveBeenCalledTimes(1);
  expect(mockPlayers.every(player => player.remove.mock.calls.length === 1)).toBe(true);
  unmount();
});

it('waits for first readiness within a bounded window and expires late readiness', async () => {
  const { result, unmount } = renderHook(() => useScanFeedback(true));
  const player = mockPlayers[0]!;
  player.isLoaded = false;
  act(() => result.current());
  expect(player.seekTo).not.toHaveBeenCalled();
  await act(async () => { player.isLoaded = true; mockCallbacks[0]!({ isLoaded: true }); });
  expect(player.play).toHaveBeenCalledTimes(1);
  player.isLoaded = false;
  mockCallbacks[0]!({ isLoaded: false });
  act(() => { result.current(); jest.advanceTimersByTime(501); });
  await act(async () => { player.isLoaded = true; mockCallbacks[0]!({ isLoaded: true }); });
  expect(player.play).toHaveBeenCalledTimes(1);
  unmount();
});

it.each(['unmount', 'mute', 'background', 'stale', 'timeout'] as const)('drops delayed seek after %s', async reason => {
  let finish!: () => void;
  let current = true;
  const { result, rerender, unmount } = renderHook<ReturnType<typeof useScanFeedback>, { enabled: boolean }>(({ enabled }) => useScanFeedback(enabled), { initialProps: { enabled: true } });
  const player = mockPlayers[0]!;
  player.seekTo.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
  act(() => result.current('match', () => current));
  if (reason === 'unmount') unmount();
  if (reason === 'mute') rerender({ enabled: false });
  if (reason === 'background') Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'background' });
  if (reason === 'stale') current = false;
  if (reason === 'timeout') act(() => jest.advanceTimersByTime(501));
  await act(async () => finish());
  expect(player.play).not.toHaveBeenCalled();
  if (reason !== 'unmount') unmount();
});

it('contains released-player and rejected-seek errors', async () => {
  const { result, unmount } = renderHook(() => useScanFeedback(true));
  mockPlayers[0]!.seekTo.mockImplementationOnce(() => { throw new Error('released'); });
  expect(() => result.current()).not.toThrow();
  mockPlayers[0]!.seekTo.mockRejectedValueOnce(new Error('seek failed'));
  await act(async () => result.current());
  expect(mockPlayers[0]!.play).not.toHaveBeenCalled();
  unmount();
});

it('can replay after Android reports an ended but loaded asset', async () => {
  const { result, unmount } = renderHook(() => useScanFeedback(true));
  await act(async () => result.current());
  mockPlayers[0]!.isLoaded = false;
  mockCallbacks[0]!({ isLoaded: true });
  await act(async () => result.current());
  expect(mockPlayers[0]!.play).toHaveBeenCalledTimes(2);
  unmount();
});

it('evaluates freshness once at request and once after seek, without replaying a stale intent', async () => {
  const { result, unmount } = renderHook(() => useScanFeedback(true));
  let finish!: () => void;
  mockPlayers[0]!.seekTo.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
  const current = jest.fn(() => true);
  act(() => result.current('match', current));
  expect(current).toHaveBeenCalledTimes(1);
  current.mockReturnValue(false);
  await act(async () => finish());
  expect(current).toHaveBeenCalledTimes(2);
  expect(mockPlayers[0]!.play).not.toHaveBeenCalled();
  unmount();
});
