import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import ProductPhotoCamera from '../src/media/ProductPhotoCamera';
const mockSizes = jest.fn<Promise<string[]>, []>();
const mockCapture = jest.fn();
const mockPermissionRequest = jest.fn();
let mockGranted = true;
jest.mock('expo-camera', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    useCameraPermissions: () => [{ granted: mockGranted, canAskAgain: true }, mockPermissionRequest],
    CameraView: React.forwardRef(function MockCamera({ onCameraReady }: { onCameraReady(): void }, ref) {
      React.useImperativeHandle(ref, () => ({ getAvailablePictureSizesAsync: mockSizes, takePictureAsync: mockCapture }));
      return <View testID="photo-preview" onLayout={onCameraReady} />;
    }),
  };
});
beforeEach(() => { mockGranted = true; mockPermissionRequest.mockResolvedValue({ granted: true }); mockSizes.mockReset().mockResolvedValue(['4000x3000','1600x1200']); mockCapture.mockReset().mockResolvedValue({ uri: 'file:///cache/photo.jpg' }); Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active', writable: true }); });
async function ready() { fireEvent(screen.getByTestId('photo-preview'), 'layout'); await waitFor(() => expect(screen.getByText('Take product photo').parent?.props.accessibilityState?.disabled).not.toBe(true)); }

it('permission denial exposes a truthful manual fallback without starting capture', () => {
  mockGranted = false;
  const view = render(<ProductPhotoCamera active onCaptured={jest.fn()} />);
  expect(screen.queryByTestId('photo-preview')).toBeNull();
  expect(screen.getByText(/continue selling without it/)).toBeTruthy();
  fireEvent.press(screen.getByText('Allow camera'));
  expect(mockPermissionRequest).toHaveBeenCalled();
  expect(mockCapture).not.toHaveBeenCalled();
  view.unmount();
});
it('explicit capture waits for readiness, guards rapid taps and catches storage failure', async () => {
  const captured = jest.fn(() => { throw new Error('storage full'); });
  const view = render(<ProductPhotoCamera active onCaptured={captured} />);
  fireEvent.press(screen.getByText('Take product photo'));
  expect(mockCapture).not.toHaveBeenCalled();
  await ready();
  await act(async () => { const button = screen.getByText('Take product photo'); fireEvent.press(button); fireEvent.press(button); });
  expect(mockCapture).toHaveBeenCalledTimes(1);
  expect(captured).toHaveBeenCalledTimes(1);
  expect(screen.getByText(/Check device storage, retry or continue without photo/)).toBeTruthy();
  view.unmount();
});
it.each(['unmount', 'blur', 'background'] as const)('drops an in-flight photo after %s and never delivers stale capture', async exit => {
  let complete!: (result: { uri: string }) => void;
  mockCapture.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
  const captured = jest.fn();
  let appStateChanged: ((state: AppStateStatus) => void) | undefined;
  const subscription = jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, callback) => { appStateChanged = callback; return { remove: jest.fn() }; });
  const view = render(<ProductPhotoCamera active onCaptured={captured} />);
  await ready();
  fireEvent.press(screen.getByText('Take product photo'));
  if (exit === 'unmount') view.unmount();
  else if (exit === 'blur') view.rerender(<ProductPhotoCamera active={false} onCaptured={captured} />);
  else act(() => { Object.defineProperty(AppState, 'currentState', { value: 'background', configurable: true }); appStateChanged?.('background'); });
  await act(async () => { complete({ uri: 'file:///cache/late.jpg' }); });
  expect(captured).not.toHaveBeenCalled();
  if (exit !== 'unmount') view.unmount();
  subscription.mockRestore();
});
