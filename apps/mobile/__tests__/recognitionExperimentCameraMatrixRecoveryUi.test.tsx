import { act, fireEvent, render } from '@testing-library/react-native';
import CameraProofPanel from '../src/recognitionExperiment/CameraProofPanel';
import { cameraRecoveryNative } from '../src/recognitionExperiment/nativeAdapter';
jest.mock('../src/recognitionExperiment/cameraRuntime', () => ({ CameraView: () => { throw Error('camera must never mount in recovery'); }, useCameraPermissions: () => { throw Error('no permission request for recovery'); } }));
jest.mock('../src/recognitionExperiment/nativeAdapter', () => ({ cameraRecoveryNative: { openP203Recovery: jest.fn(), p203RecoveryStatus: jest.fn() } }));
const native = jest.mocked(cameraRecoveryNative);
beforeEach(() => jest.clearAllMocks());
test('recovery screen unmounts camera and does not launch/select/write automatically', () => {
  const screen = render(<CameraProofPanel />);
  expect(screen.getByText('Saved camera evidence recovery')).toBeTruthy(); expect(screen.queryByLabelText('Capture one target')).toBeNull(); expect(screen.queryByLabelText('Run this matrix case once')).toBeNull();
  expect(native.openP203Recovery).not.toHaveBeenCalled(); expect(native.p203RecoveryStatus).not.toHaveBeenCalled(); expect(screen.getByText(/Four preview markers remain inconclusive/)).toBeTruthy();
});
test('launch acknowledgement is not an export success or another old Export', async () => {
  native.openP203Recovery.mockResolvedValueOnce({ launched: true, exportVerified: false }); const screen = render(<CameraProofPanel />);
  await act(async () => fireEvent.press(screen.getByLabelText('Open fixed saved-evidence recovery')));
  expect(native.openP203Recovery).toHaveBeenCalledWith(false); expect(screen.getByText(/This is not export verification/)).toBeTruthy(); expect(native.p203RecoveryStatus).not.toHaveBeenCalled();
});
test('persisted status can be inspected after launch failure without replay', async () => {
  native.openP203Recovery.mockRejectedValueOnce(Error('CAMERA_RECOVERY_LAUNCH')); native.p203RecoveryStatus.mockResolvedValueOnce({ kind: 'P203_EXPORT_RECOVERY_STATUS', lane: 'ACTUAL', state: 'WRITE', writeConsumed: true }); const screen = render(<CameraProofPanel />);
  await act(async () => fireEvent.press(screen.getByLabelText('Open fixed saved-evidence recovery')));
  await act(async () => fireEvent.press(screen.getByLabelText('Inspect saved-evidence recovery receipt')));
  expect(native.openP203Recovery).toHaveBeenCalledTimes(1); expect(native.p203RecoveryStatus).toHaveBeenCalledWith(false); expect(screen.getByText(/"writeConsumed":true/)).toBeTruthy();
});
test('generated lane is explicit and cannot supply a URI, path, hash or image bytes', async () => {
  native.openP203Recovery.mockResolvedValueOnce({ launched: true }); const screen = render(<CameraProofPanel />);
  await act(async () => fireEvent.press(screen.getByLabelText('Open generated recovery lifecycle check')));
  expect(native.openP203Recovery.mock.calls).toEqual([[true]]);
});
