import { act, fireEvent, render } from '@testing-library/react-native';
import { AppState, View, type AppStateStatus } from 'react-native';
import CameraProofPanel from '../src/recognitionExperiment/CameraProofPanel';
import ExperimentRoot from '../src/recognitionExperiment/ExperimentRoot';
import { cameraProofNative } from '../src/recognitionExperiment/nativeAdapter';
const mockPermission = { granted: true }, mockRequest = jest.fn(), mockTake = jest.fn(), mockSizes = jest.fn(), mockCheckPermission = jest.fn();
jest.mock('../src/recognitionExperiment/cameraRuntime', () => {
  const React = jest.requireActual('react'), { View } = jest.requireActual('react-native');
  return { useCameraPermissions: () => [mockPermission, mockRequest], getCameraPermissionsAsync: () => mockCheckPermission(), CameraView: React.forwardRef(function MockCameraView(props: Record<string, unknown>, ref: unknown) {
    React.useImperativeHandle(ref, () => ({ getAvailablePictureSizesAsync: mockSizes, takePictureAsync: mockTake }), []); return React.createElement(View, { ...props, testID: 'camera-proof-view' });
  }) };
});
jest.mock('../src/recognitionExperiment/nativeAdapter', () => ({ cameraProofNative: { beginCameraProof: jest.fn(), cancelCameraProof: jest.fn(), failCameraProofCapture: jest.fn(), processCameraProof: jest.fn(), cameraProofStatus: jest.fn(), recoverCameraProof: jest.fn(), recordCameraProofRefusal: jest.fn() }, recoverGeneratedImageEvidence: jest.fn(() => { throw Error('legacy recovery mounted'); }) }));
const native = jest.mocked(cameraProofNative);
let change: (state: AppStateStatus) => void;
beforeEach(() => {
  jest.clearAllMocks(); mockPermission.granted = true; mockSizes.mockResolvedValue(['4000x3000', '1920x1080']); mockCheckPermission.mockResolvedValue({ granted: true });
  Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active' });
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, handler) => { change = handler; return { remove: jest.fn() }; });
  native.recordCameraProofRefusal.mockResolvedValue(true); native.cancelCameraProof.mockResolvedValue(true); native.failCameraProofCapture.mockResolvedValue(true);
  native.beginCameraProof.mockResolvedValue({ jobId: '12345678-1234-1234-1234-123456789abc', sourceSha256: 'a'.repeat(64) });
});
afterEach(() => { jest.restoreAllMocks(); delete process.env.EXPO_PUBLIC_RECOGNITION_CAMERA_PROOF; });
async function ready(screen: ReturnType<typeof render>) {
  // Report actual preview layout; changing reported size remounts and requires a new ready event.
  const available = screen.UNSAFE_getAllByType(View).filter(v => v.props.onLayout);
  fireEvent(available[0], 'layout', { nativeEvent: { layout: { width: 300, height: 500 } } });
  const measured = screen.UNSAFE_getAllByType(View).filter(v => v.props.onLayout);
  fireEvent(measured[1], 'layout', { nativeEvent: { layout: { width: 300, height: 500 } } });
  await act(async () => { fireEvent(screen.getByTestId('camera-proof-view'), 'cameraReady'); });
  expect(screen.getByLabelText('Capture one target').props.accessibilityState.disabled).toBe(true);
  await act(async () => { fireEvent(screen.getByTestId('camera-proof-view'), 'cameraReady'); });
}
test('opted-in root does not mount legacy recovery or automatically capture/recover', async () => {
  process.env.EXPO_PUBLIC_RECOGNITION_CAMERA_PROOF = '1'; const screen = render(<ExperimentRoot />);
  await act(async () => {});
  expect(screen.getByText('Isolated camera proof')).toBeTruthy(); expect(native.recoverCameraProof).not.toHaveBeenCalled(); expect(native.cameraProofStatus).not.toHaveBeenCalled(); expect(native.beginCameraProof).not.toHaveBeenCalled(); expect(mockTake).not.toHaveBeenCalled();
});
test('denial is explicit and persisted without capture or a settings loop', async () => {
  mockPermission.granted = false; mockRequest.mockResolvedValue({ granted: false }); const screen = render(<CameraProofPanel />);
  expect(screen.queryByTestId('camera-proof-view')).toBeNull(); expect(mockRequest).not.toHaveBeenCalled();
  await act(async () => { fireEvent.press(screen.getByLabelText('Request camera permission')); });
  expect(native.recordCameraProofRefusal).toHaveBeenCalledWith('CAMERA_PERMISSION_DENIED'); expect(mockRequest).toHaveBeenCalledTimes(1); expect(native.beginCameraProof).not.toHaveBeenCalled();
});
test('requires ready after sizing, fixes camera controls, and background keeps pending capture owned', async () => {
  let reject!: (e: Error) => void; mockTake.mockImplementation(() => new Promise((_, r) => { reject = r; }));
  const screen = render(<CameraProofPanel />); expect(screen.getByLabelText('Capture one target').props.accessibilityState.disabled).toBe(true); await ready(screen);
  expect(screen.getByLabelText('Capture one target').props.accessibilityState.disabled).toBe(false);
  expect(screen.getByTestId('camera-proof-view').props).toEqual(expect.objectContaining({ facing: 'back', mode: 'picture', zoom: 0, mirror: false, flash: 'off', enableTorch: false, pictureSize: '1920x1080' }));
  await act(async () => { fireEvent.press(screen.getByLabelText('Capture one target')); });
  expect(native.beginCameraProof).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('CAMERA_PERMISSION_OR_VIEW_LOST')).toBeNull();
  expect(screen.queryByText('CAMERA_CANCELLED')).toBeNull();
  expect(mockTake).toHaveBeenCalledWith({ skipProcessing: true, base64: false, exif: true }); expect(native.beginCameraProof).toHaveBeenCalledTimes(1);
  act(() => change('background')); expect(screen.queryByTestId('camera-proof-view')).toBeNull(); expect(native.cancelCameraProof).toHaveBeenCalledTimes(1); expect(screen.getByLabelText('Capture one target').props.accessibilityState.disabled).toBe(true);
  await act(async () => { reject(Error('SDK rejected after background')); }); expect(native.failCameraProofCapture).toHaveBeenCalledWith('12345678-1234-1234-1234-123456789abc', 'CAMERA_CAPTURE_REJECTED');
});
test('mount/size failures persist a non-capture outcome', async () => {
  mockSizes.mockResolvedValue(['8000x6000']); const screen = render(<CameraProofPanel />);
  const view = screen.UNSAFE_getAllByType(View).filter(v => v.props.onLayout)[1];
  fireEvent(view, 'layout', { nativeEvent: { layout: { width: 300, height: 500 } } });
  await act(async () => { fireEvent(screen.getByTestId('camera-proof-view'), 'cameraReady'); });
  expect(native.recordCameraProofRefusal).toHaveBeenCalledWith('CAMERA_SIZE_OR_READY_FAILED'); expect(native.beginCameraProof).not.toHaveBeenCalled();
});
test('permission loss invalidates pending capture and requires fresh readiness after regrant', async () => {
  let reject!: (e: Error) => void; mockTake.mockImplementation(() => new Promise((_, r) => { reject = r; }));
  const screen = render(<CameraProofPanel />); await ready(screen); await act(async () => { fireEvent.press(screen.getByLabelText('Capture one target')); });
  mockPermission.granted = false; screen.rerender(<CameraProofPanel />);
  expect(native.cancelCameraProof).toHaveBeenCalledWith('12345678-1234-1234-1234-123456789abc', 'PERMISSION_LOSS'); expect(mockTake).toHaveBeenCalledTimes(1);
  await act(async () => { reject(Error('permission revoked after SDK request')); });
  mockPermission.granted = true; screen.rerender(<CameraProofPanel />); expect(screen.getByLabelText('Capture one target').props.accessibilityState.disabled).toBe(true);
});

test('C1 counterexample: cancellation during permission observation prevents starting SDK capture', async () => {
  let resolve!: (v: { granted: boolean }) => void;
  mockCheckPermission.mockReturnValueOnce(new Promise(r => { resolve = r; }));
  mockTake.mockRejectedValueOnce(Error('generated SDK refusal'));
  const screen = render(<CameraProofPanel />); await ready(screen);
  await act(async () => { fireEvent.press(screen.getByLabelText('Capture one target')); });
  expect(mockTake).not.toHaveBeenCalled();
  act(() => { fireEvent.press(screen.getByLabelText('Cancel current proof')); });
  expect(native.cancelCameraProof).toHaveBeenCalledTimes(1);
  await act(async () => { resolve({ granted: true }); });
  expect(mockTake).not.toHaveBeenCalled();
  expect(native.failCameraProofCapture).toHaveBeenCalledWith('12345678-1234-1234-1234-123456789abc', 'CAMERA_CAPTURE_NOT_STARTED');
});
test.each(['background', 'unmount', 'permission-loss'] as const)('preflight %s forbids SDK invocation and acknowledges NOT_STARTED', async event => {
  let resolve!: (value: { granted: boolean }) => void; mockCheckPermission.mockReturnValueOnce(new Promise(r => { resolve = r; }));
  const screen = render(<CameraProofPanel />); await ready(screen); await act(async () => { fireEvent.press(screen.getByLabelText('Capture one target')); });
  if (event === 'background') act(() => change('background'));
  else if (event === 'unmount') screen.unmount();
  else { mockPermission.granted = false; screen.rerender(<CameraProofPanel />); }
  await act(async () => { resolve({ granted: true }); });
  expect(mockTake).not.toHaveBeenCalled(); expect(native.cancelCameraProof).toHaveBeenCalledTimes(1); expect(native.failCameraProofCapture).toHaveBeenCalledWith('12345678-1234-1234-1234-123456789abc', 'CAMERA_CAPTURE_NOT_STARTED');
});
test('genuine layout change needs fresh readiness, reselecting B does not', async () => {
  const screen = render(<CameraProofPanel />); await ready(screen);
  act(() => fireEvent.press(screen.getByLabelText('Layout B'))); expect(screen.getByLabelText('Capture one target').props.accessibilityState.disabled).toBe(true);
  await act(async () => { fireEvent(screen.getByTestId('camera-proof-view'), 'cameraReady'); });
  expect(screen.getByLabelText('Capture one target').props.accessibilityState.disabled).toBe(false);
  act(() => fireEvent.press(screen.getByLabelText('Layout B'))); expect(screen.getByLabelText('Capture one target').props.accessibilityState.disabled).toBe(false);
});
test('C1 counterexample: pressing the selected layout preserves usable readiness', async () => {
  const screen = render(<CameraProofPanel />); await ready(screen);
  expect(screen.getByLabelText('Capture one target').props.accessibilityState.disabled).toBe(false);
  act(() => { fireEvent.press(screen.getByLabelText('Layout A')); });
  expect(screen.getByLabelText('Capture one target').props.accessibilityState.disabled).toBe(false);
});
