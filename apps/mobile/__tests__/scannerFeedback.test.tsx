import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { useScanFeedback } from '../src/features/scanning/useScanFeedback';
import { createScanCueTrace, type CueTrace } from '../src/features/scanning/scanCueTrace';

let mockTrace: CueTrace;
jest.mock('../src/features/scanning/scanCueTrace', () => ({
  ...jest.requireActual('../src/features/scanning/scanCueTrace'), scanCueTrace: {
    get active() { return mockTrace.active; },
    hook: () => mockTrace.hook(),
    attempt: () => mockTrace.attempt(),
    mark: (...args: Parameters<CueTrace['mark']>) => mockTrace.mark(...args),
  },
}));
const isolated = { extra: { appEnvironment: 'scanner-verification', scannerVerificationBuild: true },
  android: { package: 'com.damiyx.retailintelligence.scannerverification' } };

const mockPlayers: ReturnType<typeof mockMakePlayer>[] = [];
function mockMakePlayer() {
  return { volume: 1, isLoaded: true, seekTo: jest.fn().mockResolvedValue(undefined), play: jest.fn(), pause: jest.fn(), remove: jest.fn(),
    addListener: jest.fn((_event: string, callback: (status: MockStatus) => void) => { mockCallbacks.push(callback); return { remove: jest.fn() }; }) };
}
type MockStatus = { isLoaded: boolean; playing?: boolean; didJustFinish?: boolean; error?: string | null };
let mockCallbacks: ((status: MockStatus) => void)[] = [];
jest.mock('expo-audio', () => ({ createAudioPlayer: () => { const player = mockMakePlayer(); mockPlayers.push(player); return player; } }));
beforeEach(() => { mockPlayers.length = 0; mockCallbacks = []; jest.useFakeTimers(); Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active' }); });
afterEach(() => jest.useRealTimers());

describe.each([{ tracing: false, logThrows: false }, { tracing: true, logThrows: false }, { tracing: true, logThrows: true }])(
  'identical playback/drop oracles with diagnostic mode %j', ({ tracing, logThrows }) => {
    beforeEach(() => {
      mockTrace = createScanCueTrace(tracing ? 'true' : undefined, isolated,
        () => { if (logThrows) throw new Error('diagnostic output unavailable'); });
    });

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
it('observes freshness without evaluating the predicate again for diagnostics', async () => {
  const { result, unmount } = renderHook(() => useScanFeedback(true));
  let finish!: () => void;
  mockPlayers[0]!.seekTo.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
  const current = jest.fn(() => true);
  act(() => result.current('match', current, 'SINGLE_MATCH'));
  expect(current).toHaveBeenCalledTimes(1);
  current.mockReturnValue(false);
  await act(async () => finish());
  expect(current).toHaveBeenCalledTimes(2);
  expect(mockPlayers[0]!.play).not.toHaveBeenCalled();
  unmount();
});
it('does not probe diagnostic status when disabled and contains a throwing diagnostic status read', async () => {
  const { result, unmount } = renderHook(() => useScanFeedback(true));
  await act(async () => result.current());
  const probe = jest.fn(() => { throw new Error('PRIVATE_NATIVE_STATUS'); });
  const status = { isLoaded: true, get playing(): never { return probe(); } };
  expect(() => act(() => mockCallbacks[0]!(status))).not.toThrow();
  expect(probe).toHaveBeenCalledTimes(tracing ? 1 : 0);
  expect(mockPlayers[0]!.play).toHaveBeenCalledTimes(1);
  unmount();
});
});

it('keeps one 128-event budget across actual hook remounts and sanitizes native error status', async () => {
  const output = jest.fn(); mockTrace = createScanCueTrace('true', isolated, output);
  for (let mount = 0; mount < 24; mount++) {
    const { result, unmount } = renderHook(() => useScanFeedback(true, { focused: true, muted: false }));
    await act(async () => result.current('match', () => true, 'BASKET_VALIDATED_ADD'));
    act(() => mockCallbacks.at(-2)!({ isLoaded: true, playing: false, didJustFinish: true, error: 'PRIVATE_NATIVE_ERROR' }));
    unmount();
  }
  expect(output).toHaveBeenCalledTimes(128);
  const combined = output.mock.calls.flat().join('\n');
  expect(combined).toContain('BASKET_VALIDATED_ADD'); expect(combined).toContain('"error":true');
  expect(combined).not.toContain('PRIVATE_NATIVE_ERROR');
  expect(combined).toContain('trace-limit'); expect(combined).toContain('"hook":2');
  expect(mockPlayers.every(player => player.play.mock.calls.length <= 1 && player.remove.mock.calls.length === 1)).toBe(true);
});
