import { act, fireEvent, render } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { CameraOrientationPanel } from '../src/recognitionExperiment/CameraOrientationPanel';
import { cameraOrientationNative } from '../src/recognitionExperiment/nativeAdapter';
import { ORIENTATION_RUN } from '../src/recognitionExperiment/cameraOrientationProof';
const mockPermission = { granted: true };
jest.mock('../src/recognitionExperiment/cameraRuntime', () => ({ useCameraPermissions: () => [mockPermission, jest.fn()], getCameraPermissionsAsync: jest.fn(async () => mockPermission), CameraView: jest.requireActual('react-native').View }));
jest.mock('../src/recognitionExperiment/nativeAdapter', () => ({ cameraOrientationNative: { inspectOrientationProof: jest.fn(), beginOrientationCase: jest.fn(), cancelOrientationProof: jest.fn(), failOrientationCapture: jest.fn(), processOrientationProof: jest.fn(), sealOrientationRun: jest.fn(), openOrientationExport: jest.fn(), orientationExportStatus: jest.fn() } }));
const m = jest.mocked(cameraOrientationNative);
const state = (verified: boolean) => ({ kind: 'CAMERA_ORIENTATION_STATUS', run: ORIENTATION_RUN, profileVersion: 2, next: 'M00-A000', idle: true, readinessNonce: 'a0000000-0000-4000-8000-000000000001', firstExportVerified: false, generatedExportVerified: verified });
beforeEach(() => { jest.clearAllMocks();Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active' }); });
test('mount leaves camera closed and performs no capture, permission request, inspect or export', async () => {
 const s=render(<CameraOrientationPanel />);await act(async()=>{});
 expect(m.inspectOrientationProof).not.toHaveBeenCalled();expect(m.beginOrientationCase).not.toHaveBeenCalled();expect(m.openOrientationExport).not.toHaveBeenCalled();
 expect(s.getByLabelText('Restore preview without capture').props.accessibilityState.disabled).toBe(true);
 expect(s.getByLabelText('Capture this geometry row once').props.accessibilityState.disabled).toBe(true);
});
test('generated metadata export must be verified before the explicit preview restore', async () => {
 m.inspectOrientationProof.mockResolvedValueOnce(state(false)).mockResolvedValueOnce(state(true));const s=render(<CameraOrientationPanel />);
 await act(async()=>fireEvent.press(s.getByLabelText('Inspect new geometry run')));
 expect(s.getByLabelText('Restore preview without capture').props.accessibilityState.disabled).toBe(true);
 await act(async()=>fireEvent.press(s.getByLabelText('Inspect new geometry run')));
 expect(s.getByLabelText('Restore preview without capture').props.accessibilityState.disabled).toBe(false);
 await act(async()=>fireEvent.press(s.getByLabelText('Restore preview without capture')));
 expect(s.getByLabelText('Capture this geometry row once').props.accessibilityState.disabled).toBe(true);
 expect(s.getByLabelText('Acknowledge current chart and supported phone').props.accessibilityState.disabled).toBe(true);
 expect(m.beginOrientationCase).not.toHaveBeenCalled();expect(m.openOrientationExport).not.toHaveBeenCalled();
});
test('unresolved row cannot acknowledge, capture, seal or export photo evidence', async () => {
 m.inspectOrientationProof.mockResolvedValueOnce({...state(true),next:'UNRESOLVED',readinessNonce:null});const s=render(<CameraOrientationPanel />);
 await act(async()=>fireEvent.press(s.getByLabelText('Inspect new geometry run')));
 for(const label of ['Capture this geometry row once','Acknowledge current chart and supported phone','Seal completed geometry run','Open first-row evidence export','Open final geometry evidence export']) expect(s.getByLabelText(label).props.accessibilityState.disabled).toBe(true);
 expect(m.beginOrientationCase).not.toHaveBeenCalled();
});
