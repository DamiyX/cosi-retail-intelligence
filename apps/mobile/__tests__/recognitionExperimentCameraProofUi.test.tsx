import { act, fireEvent, render } from '@testing-library/react-native';
import { AppState, View, type AppStateStatus } from 'react-native';
import CameraProofPanel from '../src/recognitionExperiment/CameraProofPanel';
import ExperimentRoot from '../src/recognitionExperiment/ExperimentRoot';
import { cameraProofNative, exportSavedCameraEvidence, cancelSavedCameraEvidenceExport, inspectStationaryChart, exportStationaryChart } from '../src/recognitionExperiment/nativeAdapter';
import { STATIONARY_JOB, STATIONARY_TARGET, STATIONARY_TARGET_SHA } from '../src/recognitionExperiment/cameraStationary';
const mockPermission = { granted: true }, mockRequest = jest.fn(), mockTake = jest.fn(), mockSizes = jest.fn(), mockCheckPermission = jest.fn();
jest.mock('../src/recognitionExperiment/cameraRuntime', () => {
  const React = jest.requireActual('react'), { View } = jest.requireActual('react-native');
  return { useCameraPermissions: () => [mockPermission, mockRequest], getCameraPermissionsAsync: () => mockCheckPermission(), CameraView: React.forwardRef(function MockCameraView(props: Record<string, unknown>, ref: unknown) {
    React.useImperativeHandle(ref, () => ({ getAvailablePictureSizesAsync: mockSizes, takePictureAsync: mockTake }), []); return React.createElement(View, { ...props, testID: 'camera-proof-view' });
  }) };
});
jest.mock('../src/recognitionExperiment/nativeAdapter', () => ({ inspectStationaryChart: jest.fn(), exportStationaryChart: jest.fn(), cancelStationaryChartExport: jest.fn(() => Promise.resolve(true)), exportSavedCameraEvidence: jest.fn(), cancelSavedCameraEvidenceExport: jest.fn(() => Promise.resolve(true)), cameraProofNative: { beginCameraProof: jest.fn(), cancelCameraProof: jest.fn(), failCameraProofCapture: jest.fn(), processCameraProof: jest.fn(), cameraProofStatus: jest.fn(), recoverCameraProof: jest.fn(), recordCameraProofRefusal: jest.fn() }, recoverGeneratedImageEvidence: jest.fn(() => { throw Error('legacy recovery mounted'); }) }));
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
test.each(['status', 'recovery'] as const)('explicit %s failure exposes only a bounded native code without capture', async operation => {
  const failure = Object.assign(Error('private /data/user/0/test/file and bytes must stay hidden'), { code: 'CAMERA_IO_LINK_EPERM' });
  if (operation === 'status') native.cameraProofStatus.mockRejectedValueOnce(failure);
  else native.recoverCameraProof.mockRejectedValueOnce(failure);
  const screen = render(<CameraProofPanel />);
  await act(async () => { fireEvent.press(screen.getByLabelText(operation === 'status' ? 'Inspect saved camera status' : 'Classify interrupted camera storage')); });
  expect(screen.getByText(/CAMERA_IO_LINK_EPERM/)).toBeTruthy();
  expect(screen.queryByText(/private \/data/)).toBeNull();
  expect(native.beginCameraProof).not.toHaveBeenCalled(); expect(mockTake).not.toHaveBeenCalled();
});
test('malformed native diagnostics fall back without exposing exception content', async () => {
  native.recoverCameraProof.mockRejectedValueOnce(Object.assign(Error('private path /data/secret'), { code: 'CAMERA_IO_LINK_/data/secret' }));
  const screen = render(<CameraProofPanel />);
  await act(async () => { fireEvent.press(screen.getByLabelText('Classify interrupted camera storage')); });
  expect(screen.getByText(/CAMERA_OPERATION_FAILED/)).toBeTruthy();
  expect(screen.queryByText(/secret/)).toBeNull(); expect(mockTake).not.toHaveBeenCalled();
});
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

test('native admission errno is visible without starting SDK work or exposing bridge paths', async () => {
  native.beginCameraProof.mockRejectedValueOnce(Object.assign(Error('/data/user/0/private/reservation.new'), { code: 'CAMERA_IO_RENAME_EACCES' }));
  const screen = render(<CameraProofPanel />); await ready(screen);
  await act(async () => { fireEvent.press(screen.getByLabelText('Capture one target')); });
  expect(screen.getByText('CAMERA_IO_RENAME_EACCES')).toBeTruthy(); expect(screen.queryByText(/data\/user/)).toBeNull();
  expect(mockTake).not.toHaveBeenCalled(); expect(native.processCameraProof).not.toHaveBeenCalled(); expect(native.failCameraProofCapture).not.toHaveBeenCalled();
});
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

test('saved export uses no capture/model call; cancellation and unmount request native drain', async () => {
  let resolve!: (value: Record<string, unknown>) => void;
  jest.mocked(exportSavedCameraEvidence).mockReturnValueOnce(new Promise(r => { resolve = r; }));
  const screen = render(<CameraProofPanel />); await ready(screen);
  await act(async () => { fireEvent.press(screen.getByLabelText('Export this saved test evidence')); });
  expect(exportSavedCameraEvidence).toHaveBeenCalledTimes(1);
  await act(async () => { fireEvent.press(screen.getByLabelText('Capture one target')); fireEvent.press(screen.getByLabelText('Cancel saved evidence export')); });
  expect(mockTake).not.toHaveBeenCalled(); expect(native.beginCameraProof).not.toHaveBeenCalled(); expect(native.processCameraProof).not.toHaveBeenCalled();
  expect(cancelSavedCameraEvidenceExport).toHaveBeenCalledTimes(1);
  screen.unmount(); expect(cancelSavedCameraEvidenceExport).toHaveBeenCalledTimes(2);
  await act(async () => { resolve({ status: 'READBACK_VERIFIED' }); });
});

test('stationary slot needs explicit status and acknowledgement; consumed reopen never rearms', async () => {
  jest.mocked(inspectStationaryChart).mockResolvedValueOnce({ kind: 'STATIONARY_SLOT_STATUS', jobId: STATIONARY_JOB, targetId: STATIONARY_TARGET, targetSha256: STATIONARY_TARGET_SHA, state: 'CAPTURE_CONSUMED', captureAvailable: false, exportEligible: false, geometryStatus: 'INCONCLUSIVE' });
  const screen = render(<CameraProofPanel />); await ready(screen);
  expect(inspectStationaryChart).not.toHaveBeenCalled(); expect(exportStationaryChart).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Capture stationary chart once').props.accessibilityState.disabled).toBe(true);
  await act(async () => { fireEvent.press(screen.getByLabelText('Inspect stationary chart slot')); });
  expect(screen.getByLabelText('Acknowledge supported phone and fixed chart').props.accessibilityState.disabled).toBe(true);
  expect(screen.getByLabelText('Capture stationary chart once').props.accessibilityState.disabled).toBe(true);
  expect(screen.getByLabelText('Export stationary chart evidence').props.accessibilityState.disabled).toBe(true);
  expect(mockTake).not.toHaveBeenCalled(); expect(native.beginCameraProof).not.toHaveBeenCalled();
});

test('stationary acknowledgement permits only one explicit admission even after a failed preflight', async () => {
  const begin = jest.fn<Promise<unknown>, [string, string]>(async () => ({ jobId: STATIONARY_JOB, sourceSha256: 'a'.repeat(64) }));
  cameraProofNative.beginStationaryChartProof = begin;
  jest.mocked(inspectStationaryChart).mockResolvedValueOnce({ kind: 'STATIONARY_SLOT_STATUS', jobId: STATIONARY_JOB, targetId: STATIONARY_TARGET, targetSha256: STATIONARY_TARGET_SHA, state: 'AVAILABLE', captureAvailable: true, exportEligible: false, geometryStatus: 'INCONCLUSIVE' });
  const screen = render(<CameraProofPanel />); await ready(screen);
  await act(async () => { fireEvent.press(screen.getByLabelText('Inspect stationary chart slot')); });
  expect(begin).not.toHaveBeenCalled();
  act(() => fireEvent.press(screen.getByLabelText('Acknowledge supported phone and fixed chart')));
  mockCheckPermission.mockResolvedValueOnce({ granted: false });
  await act(async () => { fireEvent.press(screen.getByLabelText('Capture stationary chart once')); });
  expect(begin).toHaveBeenCalledTimes(1); expect(native.failCameraProofCapture).toHaveBeenCalledWith(STATIONARY_JOB, 'CAMERA_CAPTURE_NOT_STARTED');
  expect(mockTake).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Capture stationary chart once').props.accessibilityState.disabled).toBe(true);
});
