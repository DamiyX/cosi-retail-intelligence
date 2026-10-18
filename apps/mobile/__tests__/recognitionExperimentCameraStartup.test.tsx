/* eslint-disable @typescript-eslint/no-require-imports -- Real installed-module evaluation is the startup regression boundary. */
import { act, fireEvent, render, renderHook } from '@testing-library/react-native';
import { AppState, View } from 'react-native';

// jest-expo installs a lazy fetch getter before this file. Control this unused RN/network
// boundary so Jest global enumeration cannot initialize ExpoFetch outside the camera test.
Object.defineProperty(globalThis, 'fetch', { configurable: true, writable: true, value: () => { throw Error('UNEXPECTED_NETWORK_IN_STARTUP_TEST'); } });

const denied = { granted: false, canAskAgain: true, expires: 'never', status: 'denied' };
const granted = { ...denied, granted: true, status: 'granted' };
const mockGet = jest.fn(), mockRequest = jest.fn(), mockTake = jest.fn(), mockSizes = jest.fn();
const mockRequiredModules: string[] = [], mockRequiredViews: string[] = [], mockReceivers: unknown[] = [];
const mockManager = {
  Type: {}, FlashMode: {}, isModernBarcodeScannerAvailable: false,
  getCameraPermissionsAsync: jest.fn(function(this: unknown) { mockReceivers.push(this); return mockGet(); }),
  requestCameraPermissionsAsync: jest.fn(function(this: unknown) { mockReceivers.push(this); return mockRequest(); }),
};
const mockNative = { beginCameraProof: jest.fn(), cancelCameraProof: jest.fn(), failCameraProofCapture: jest.fn(), processCameraProof: jest.fn(), cameraProofStatus: jest.fn(), recoverCameraProof: jest.fn(), recordCameraProofRefusal: jest.fn() };

// These must be fatal: the startup fix must avoid their evaluation, not swallow an error.
jest.mock('expo', () => { throw Error('FORBIDDEN_EXPO_BOOTSTRAP'); });
jest.mock('expo-asset', () => { throw Error('FORBIDDEN_ASSET_BOOTSTRAP'); });
jest.mock('expo-camera/build/PictureRef', () => { throw Error('FORBIDDEN_PICTURE_REF_VALUE_IMPORT'); });
jest.mock('expo-camera/build/Camera.types', () => { throw Error('FORBIDDEN_CAMERA_TYPES_VALUE_IMPORT'); });
jest.mock('../src/recognitionExperiment/nativeAdapter', () => ({ cameraProofNative: mockNative }));
jest.mock('expo-modules-core', () => {
  const React = jest.requireActual('react'), { View } = jest.requireActual('react-native'), path = require('node:path');
  // Actual installed hook, with only RN/native acquisition boundaries replaced.
  const hook = jest.requireActual(path.join(path.dirname(require.resolve('expo-modules-core/package.json')), 'src/PermissionsHook.ts'));
  return { ...hook, Platform: { OS: 'android' }, UnavailabilityError: class extends Error {},
    requireNativeModule: (name: string) => { mockRequiredModules.push(name); if (name !== 'ExpoCamera') throw Error(`EXCLUDED_NATIVE_MODULE:${name}`); return mockManager; },
    requireNativeViewManager: (name: string) => {
      mockRequiredViews.push(name); if (name !== 'ExpoCamera') throw Error(`EXCLUDED_NATIVE_VIEW:${name}`);
      return React.forwardRef(function ControlledNativeCamera(props: Record<string, unknown>, ref: unknown) {
        React.useImperativeHandle(ref, () => ({ getAvailablePictureSizes: mockSizes, takePicture: mockTake }), []);
        return React.createElement(View, { ...props, testID: 'camera-native-boundary' });
      });
    },
  };
});

function runtime() { return require('../src/recognitionExperiment/cameraRuntime') as typeof import('../src/recognitionExperiment/cameraRuntime'); }
function panel() { return require('../src/recognitionExperiment/CameraProofPanel').default; }
beforeEach(() => {
  jest.clearAllMocks(); mockReceivers.length = 0; mockGet.mockResolvedValue(denied); mockRequest.mockResolvedValue(denied); mockSizes.mockResolvedValue(['1920x1080']);
  Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active' });
  jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: jest.fn() });
  mockNative.recordCameraProofRefusal.mockResolvedValue(true); mockNative.cancelCameraProof.mockResolvedValue(true); mockNative.failCameraProofCapture.mockResolvedValue(true);
  mockNative.beginCameraProof.mockResolvedValue({ jobId: '12345678-1234-1234-1234-123456789abc', sourceSha256: 'a'.repeat(64) });
});
afterEach(() => jest.restoreAllMocks());

test('camera panel startup uses actual camera JS without forbidden Expo initialization', () => {
  expect(panel()).toEqual(expect.any(Function));
  expect(mockRequiredModules).toEqual(['ExpoCamera']); expect(mockRequiredViews).toEqual(['ExpoCamera']);
  expect(mockGet).not.toHaveBeenCalled(); expect(mockRequest).not.toHaveBeenCalled(); expect(mockTake).not.toHaveBeenCalled();
  expect(runtime().CameraView).toBe(jest.requireActual('expo-camera/build/CameraView').default);
  expect(jest.isMockFunction(runtime().CameraView)).toBe(false);
});

test('default hook observes permission without automatically requesting or capturing', async () => {
  const Panel = panel(); const screen = render(<Panel />); await act(async () => {});
  expect(mockGet).toHaveBeenCalledTimes(1); expect(mockRequest).not.toHaveBeenCalled(); expect(mockTake).not.toHaveBeenCalled(); expect(mockNative.beginCameraProof).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Request camera permission')).toBeTruthy();
});

test('actual core hook preserves get/request options and exact permission method responses', async () => {
  const { result } = renderHook(() => runtime().useCameraPermissions({ get: false, request: false })); await act(async () => {});
  expect(mockGet).not.toHaveBeenCalled(); expect(mockRequest).not.toHaveBeenCalled();
  await act(async () => { expect(await result.current[2]()).toBe(denied); }); expect(result.current[0]).toBe(denied);
  mockRequest.mockResolvedValueOnce(granted);
  await act(async () => { expect(await result.current[1]()).toBe(granted); }); expect(result.current[0]).toBe(granted);
  expect(mockManager.getCameraPermissionsAsync).toHaveBeenCalledWith(); expect(mockManager.requestCameraPermissionsAsync).toHaveBeenCalledWith();
  expect(mockReceivers).toEqual([mockManager, mockManager]); expect(mockTake).not.toHaveBeenCalled();
});

test('explicit permission denial is persisted and starts no capture', async () => {
  const Panel = panel(); const screen = render(<Panel />); await act(async () => {});
  await act(async () => { fireEvent.press(screen.getByLabelText('Request camera permission')); });
  expect(mockRequest).toHaveBeenCalledTimes(1); expect(mockNative.recordCameraProofRefusal).toHaveBeenCalledWith('CAMERA_PERMISSION_DENIED'); expect(mockTake).not.toHaveBeenCalled();
});

test('explicit permission request errors propagate to the existing refusal path', async () => {
  const Panel = panel(); const screen = render(<Panel />); await act(async () => {}); mockRequest.mockRejectedValueOnce(Error('native request error'));
  await act(async () => { fireEvent.press(screen.getByLabelText('Request camera permission')); });
  expect(mockNative.recordCameraProofRefusal).toHaveBeenCalledWith('CAMERA_PERMISSION_ERROR'); expect(mockTake).not.toHaveBeenCalled();
});

async function readyActualCamera(screen: ReturnType<typeof render>) {
  let layouts = screen.UNSAFE_getAllByType(View).filter(v => v.props.onLayout);
  fireEvent(layouts[0], 'layout', { nativeEvent: { layout: { width: 300, height: 500 } } });
  layouts = screen.UNSAFE_getAllByType(View).filter(v => v.props.onLayout);
  fireEvent(layouts[1], 'layout', { nativeEvent: { layout: { width: 300, height: 500 } } });
  await act(async () => { fireEvent(screen.getByTestId('camera-native-boundary'), 'cameraReady'); });
  await act(async () => { fireEvent(screen.getByTestId('camera-native-boundary'), 'cameraReady'); });
  expect(screen.getByLabelText('Capture one target').props.accessibilityState.disabled).toBe(false);
}

test.each(['revoked', 'error'] as const)('real camera adapter preflight %s prevents SDK capture', async mode => {
  mockGet.mockResolvedValue(granted); const Panel = panel(); const screen = render(<Panel />); await act(async () => {}); await readyActualCamera(screen);
  if (mode === 'revoked') mockGet.mockResolvedValueOnce(denied); else mockGet.mockRejectedValueOnce(Error('native get error'));
  await act(async () => { fireEvent.press(screen.getByLabelText('Capture one target')); });
  expect(mockGet).toHaveBeenCalledTimes(2); expect(mockTake).not.toHaveBeenCalled(); expect(mockRequest).not.toHaveBeenCalled();
  expect(mockNative.failCameraProofCapture).toHaveBeenCalledWith('12345678-1234-1234-1234-123456789abc', 'CAMERA_CAPTURE_NOT_STARTED');
});
