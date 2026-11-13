import { act, fireEvent, render } from '@testing-library/react-native';
import { CameraOrientationPanel } from '../src/recognitionExperiment/CameraOrientationPanel';
import { graphicsEntryMetadata, openGraphicsEntryProbe } from '../src/recognitionExperiment/nativeAdapter';
import { getCameraPermissionsAsync } from '../src/recognitionExperiment/cameraRuntime';
jest.mock('../src/recognitionExperiment/cameraRuntime', () => ({getCameraPermissionsAsync: jest.fn(), CameraView: jest.requireActual('react-native').View}));
jest.mock('../src/recognitionExperiment/nativeAdapter', () => ({cameraOrientationNative: {}, graphicsEntryMetadata: jest.fn(), openGraphicsEntryProbe: jest.fn()}));
const prior = process.env.EXPO_PUBLIC_RECOGNITION_GRAPHICS_ENTRY_PROBE;
beforeEach(() => { jest.clearAllMocks();process.env.EXPO_PUBLIC_RECOGNITION_GRAPHICS_ENTRY_PROBE = '1'; });
afterAll(() => {if (prior === undefined) delete process.env.EXPO_PUBLIC_RECOGNITION_GRAPHICS_ENTRY_PROBE;else process.env.EXPO_PUBLIC_RECOGNITION_GRAPHICS_ENTRY_PROBE = prior;});
test('probe mounts without automatic operations, permission request, camera or capture controls', () => {
 const screen = render(<CameraOrientationPanel />);
 expect(openGraphicsEntryProbe).not.toHaveBeenCalled();expect(graphicsEntryMetadata).not.toHaveBeenCalled();expect(getCameraPermissionsAsync).not.toHaveBeenCalled();
 expect(screen.queryByLabelText('Open native capture diagnostic')).toBeNull();expect(screen.queryByTestId('orientation-viewport')).toBeNull();
 expect(screen.getByLabelText('Open graphics entry probe (no photo)')).toBeTruthy();
});
test('a refused entry stays consumed and cannot be tapped again', async () => {
 jest.mocked(openGraphicsEntryProbe).mockRejectedValueOnce(new Error('GRAPHICS_ENTRY_REFUSED'));
 const screen = render(<CameraOrientationPanel />);
 await act(async () => fireEvent.press(screen.getByLabelText('Open graphics entry probe (no photo)')));
 await act(async () => fireEvent.press(screen.getByLabelText('Open graphics entry probe (no photo)')));
 expect(openGraphicsEntryProbe).toHaveBeenCalledTimes(1);expect(graphicsEntryMetadata).not.toHaveBeenCalled();
});
test('metadata readback never launches or resumes the native stages', async () => {
 jest.mocked(graphicsEntryMetadata).mockResolvedValueOnce('{"kind":"GRAPHICS_ENTRY_METADATA","captureAuthority":false}');
 const screen = render(<CameraOrientationPanel />);
 await act(async () => fireEvent.press(screen.getByLabelText('Read graphics and retained setup metadata')));
 expect(graphicsEntryMetadata).toHaveBeenCalledTimes(1);expect(openGraphicsEntryProbe).not.toHaveBeenCalled();expect(getCameraPermissionsAsync).not.toHaveBeenCalled();
});
