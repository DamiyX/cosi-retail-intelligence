import { act, fireEvent, render } from '@testing-library/react-native';
import { CameraOrientationPanel } from '../src/recognitionExperiment/CameraOrientationPanel';
import { captureDiagnosticSetupSnapshot } from '../src/recognitionExperiment/nativeAdapter';
import { getCameraPermissionsAsync } from '../src/recognitionExperiment/cameraRuntime';

jest.mock('../src/recognitionExperiment/cameraRuntime', () => ({
  getCameraPermissionsAsync: jest.fn(), CameraView: jest.requireActual('react-native').View,
}));
jest.mock('../src/recognitionExperiment/nativeAdapter', () => ({
  cameraOrientationNative: {}, captureDiagnosticSetupSnapshot: jest.fn(),
}));
const collect = jest.mocked(captureDiagnosticSetupSnapshot);
const prior = process.env.EXPO_PUBLIC_RECOGNITION_SETUP_METADATA_ONLY;
beforeEach(() => { jest.clearAllMocks();process.env.EXPO_PUBLIC_RECOGNITION_SETUP_METADATA_ONLY = '1'; });
afterAll(() => { if (prior === undefined) delete process.env.EXPO_PUBLIC_RECOGNITION_SETUP_METADATA_ONLY;else process.env.EXPO_PUBLIC_RECOGNITION_SETUP_METADATA_ONLY = prior; });

test('metadata-only panel mounts without permission, camera, capture, export or automatic collection', () => {
  const screen = render(<CameraOrientationPanel />);
  expect(collect).not.toHaveBeenCalled();expect(getCameraPermissionsAsync).not.toHaveBeenCalled();
  expect(screen.queryByLabelText('Open native capture diagnostic')).toBeNull();
  expect(screen.queryByLabelText('Capture this geometry row once')).toBeNull();
  expect(screen.queryByTestId('orientation-viewport')).toBeNull();
  expect(screen.getByLabelText('Inspect interrupted setup metadata (no capture)')).toBeTruthy();
});
test('one explicit inspection displays only returned metadata and grants no recovery', async () => {
  const result = { kind: 'DIAGNOSTIC_SETUP_RETAINED_METADATA', captureAuthority: false, recoveryAuthorized: false };
  collect.mockResolvedValueOnce(result);const screen = render(<CameraOrientationPanel />);
  await act(async () => fireEvent.press(screen.getByLabelText('Inspect interrupted setup metadata (no capture)')));
  expect(collect).toHaveBeenCalledTimes(1);expect(screen.getByText(JSON.stringify(result))).toBeTruthy();
  expect(getCameraPermissionsAsync).not.toHaveBeenCalled();expect(screen.queryByTestId('orientation-viewport')).toBeNull();
});
test('collector refusal stays metadata-only and never retries automatically', async () => {
  collect.mockRejectedValueOnce(new Error('SETUP_METADATA_CHANGED'));const screen = render(<CameraOrientationPanel />);
  await act(async () => fireEvent.press(screen.getByLabelText('Inspect interrupted setup metadata (no capture)')));
  expect(collect).toHaveBeenCalledTimes(1);expect(screen.queryByTestId('orientation-viewport')).toBeNull();
  expect(getCameraPermissionsAsync).not.toHaveBeenCalled();
});
