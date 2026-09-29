import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { useScanFeedback } from '../src/features/scanning/useScanFeedback';

const mockPlayer = { volume: 1, seekTo: jest.fn().mockResolvedValue(undefined), play: jest.fn(), pause: jest.fn(), remove: jest.fn() };
jest.mock('expo-audio', () => ({ createAudioPlayer: () => mockPlayer }));
beforeEach(() => { Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active' }); });

it('plays only on explicit successful-add feedback, and mute releases playback', async () => {
  const { result, rerender, unmount } = renderHook<() => void, { enabled: boolean }>(({ enabled }) => useScanFeedback(enabled), { initialProps: { enabled: true } });
  expect(mockPlayer.play).not.toHaveBeenCalled();
  await act(async () => { result.current(); });
  expect(mockPlayer.play).toHaveBeenCalledTimes(1);
  rerender({ enabled: false });
  await act(async () => { result.current(); });
  expect(mockPlayer.play).toHaveBeenCalledTimes(1);
  expect(mockPlayer.remove).toHaveBeenCalledTimes(1);
  unmount();
});

it('drops delayed playback after unmount and tolerates a released native player', async () => {
  let finish!: () => void;
  mockPlayer.seekTo.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
  const { result, unmount } = renderHook(() => useScanFeedback(true));
  act(() => { result.current(); });
  unmount();
  await act(async () => { finish(); });
  expect(mockPlayer.play).not.toHaveBeenCalled();
  const next = renderHook(() => useScanFeedback(true));
  mockPlayer.seekTo.mockImplementationOnce(() => { throw new Error('released'); });
  expect(() => next.result.current()).not.toThrow();
  next.unmount();
});
