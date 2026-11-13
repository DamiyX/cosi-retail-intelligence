import { act, fireEvent, render } from '@testing-library/react-native';
import { AppState } from 'react-native';
import CameraProofPanel from '../src/recognitionExperiment/CameraProofPanel';
import { cameraMatrixNative } from '../src/recognitionExperiment/nativeAdapter';
import { MATRIX_RUN } from '../src/recognitionExperiment/cameraMatrixProof';
const mockPermission = { granted: false };
jest.mock('../src/recognitionExperiment/cameraRuntime', () => ({ useCameraPermissions: () => [mockPermission, jest.fn()], getCameraPermissionsAsync: jest.fn(async () => mockPermission), CameraView: jest.requireActual('react-native').View }));
jest.mock('../src/recognitionExperiment/nativeAdapter', () => ({ cameraMatrixNative: { inspectMatrixProof: jest.fn(), observeMatrixPermission: jest.fn(), beginMatrixCase: jest.fn(), matrixCaptureInvoked: jest.fn(), matrixCapturePhase: jest.fn(), recoverMatrixProof: jest.fn(), sealMatrixRun: jest.fn(), exportMatrixEvidence: jest.fn(), cancelMatrixEvidenceExport: jest.fn() }, cameraProofNative: { cancelCameraProof: jest.fn().mockResolvedValue(true) } }));
const m = jest.mocked(cameraMatrixNative);
const state = (next: string, consumed = false) => ({ kind: 'CAMERA_MATRIX_STATUS', run: MATRIX_RUN, next, idle: true, readinessNonce: null, exportConsumed: consumed });
beforeEach(() => { jest.clearAllMocks(); mockPermission.granted = false; Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active' }); });
test('mount does not capture, inspect, ask permission, recover or export automatically; no generic shutter', () => {
  const s = render(<CameraProofPanel />); expect(s.queryByLabelText('Capture one target')).toBeNull(); expect(s.queryByLabelText('Capture stationary chart once')).toBeNull(); expect(s.getByLabelText('Run this matrix case once').props.accessibilityState.disabled).toBe(true);
  expect(m.inspectMatrixProof).not.toHaveBeenCalled(); expect(m.beginMatrixCase).not.toHaveBeenCalled(); expect(m.observeMatrixPermission).not.toHaveBeenCalled(); expect(m.exportMatrixEvidence).not.toHaveBeenCalled();
});
test('D03 checkpoint remains separate, observes denied/not-ready rather than asserting a restored preview', async () => {
  m.inspectMatrixProof.mockResolvedValueOnce(state('D03-RESTORED-AFTER-L04')); m.observeMatrixPermission.mockResolvedValueOnce(state('D03-RESTORED-AFTER-L04'));
  const s = render(<CameraProofPanel />); await act(async () => fireEvent.press(s.getByLabelText('Inspect approved matrix'))); await act(async () => fireEvent.press(s.getByLabelText('Observe current permission checkpoint')));
  expect(m.observeMatrixPermission).toHaveBeenCalledWith('D03-RESTORED-AFTER-L04', false); expect(m.beginMatrixCase).not.toHaveBeenCalled();
});
test('consumed export stays disabled after failure; already saved output is inspected instead of replayed', async () => {
  m.inspectMatrixProof.mockResolvedValue(state('SEALED')); m.exportMatrixEvidence.mockRejectedValueOnce(Error('CAMERA_MATRIX_EXPORT_UNVERIFIED')); const s = render(<CameraProofPanel />);
  await act(async () => fireEvent.press(s.getByLabelText('Inspect approved matrix'))); await act(async () => fireEvent.press(s.getByLabelText('Export sealed matrix once')));
  expect(m.exportMatrixEvidence).toHaveBeenCalledTimes(1); expect(s.getByLabelText('Export sealed matrix once').props.accessibilityState.disabled).toBe(true); expect(s.getByText(/Press Save once/)).toBeTruthy();
  m.inspectMatrixProof.mockResolvedValueOnce({ ...state('SEALED', true), exportResult: { status: 'READBACK_VERIFIED' } }); await act(async () => fireEvent.press(s.getByLabelText('Inspect approved matrix'))); expect(m.exportMatrixEvidence).toHaveBeenCalledTimes(1); expect(s.getByLabelText('Export sealed matrix once').props.accessibilityState.disabled).toBe(true);
});
test('unresolved native case cannot capture or seal; recovery is explicit and never a shutter', async () => {
  m.inspectMatrixProof.mockResolvedValueOnce(state('UNRESOLVED')); m.recoverMatrixProof.mockRejectedValueOnce(Error('CAMERA_MATRIX_OLD_PROCESS_PROFILE')); const s = render(<CameraProofPanel />);
  await act(async () => fireEvent.press(s.getByLabelText('Inspect approved matrix'))); expect(s.getByLabelText('Run this matrix case once').props.accessibilityState.disabled).toBe(true); expect(s.getByLabelText('Seal matrix and close unused cases').props.accessibilityState.disabled).toBe(true);
  await act(async () => fireEvent.press(s.getByLabelText('Classify old matrix process'))); expect(m.recoverMatrixProof).toHaveBeenCalledTimes(1); expect(m.beginMatrixCase).not.toHaveBeenCalled();
});
