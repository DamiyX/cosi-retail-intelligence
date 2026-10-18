import { act, render } from '@testing-library/react-native';
import ExperimentRoot from '../src/recognitionExperiment/ExperimentRoot';
import { recoverGeneratedImageEvidence } from '../src/recognitionExperiment/nativeAdapter';
jest.mock('expo-camera', () => { throw Error('DEFAULT_ROUTE_EVALUATED_EXPO_CAMERA'); });
jest.mock('expo-camera/build/CameraView', () => { throw Error('DEFAULT_ROUTE_EVALUATED_CAMERA_VIEW'); });
jest.mock('expo-camera/build/ExpoCameraManager', () => { throw Error('DEFAULT_ROUTE_EVALUATED_CAMERA_MANAGER'); });
jest.mock('../src/recognitionExperiment/cameraRuntime', () => { throw Error('DEFAULT_ROUTE_EVALUATED_CAMERA_RUNTIME'); });
jest.mock('../src/recognitionExperiment/CameraProofPanel', () => { throw Error('DEFAULT_ROUTE_EVALUATED_CAMERA_PANEL'); });
jest.mock('../src/recognitionExperiment/nativeAdapter', () => ({ recoverGeneratedImageEvidence: jest.fn().mockResolvedValue({ status: 'NONE', interruptedExport: false }), runGeneratedProbe: jest.fn(), runGeneratedImageProbes: jest.fn(), exportGeneratedImageEvidence: jest.fn() }));
test('default route evaluates neither the camera panel nor camera SDK', async () => {
  delete process.env.EXPO_PUBLIC_RECOGNITION_CAMERA_PROOF;
  const screen = render(<ExperimentRoot />); await act(async () => {});
  expect(recoverGeneratedImageEvidence).toHaveBeenCalledTimes(1); expect(screen.getByText('No device inference recorded.')).toBeTruthy(); expect(screen.queryByText('Isolated camera proof')).toBeNull();
});
