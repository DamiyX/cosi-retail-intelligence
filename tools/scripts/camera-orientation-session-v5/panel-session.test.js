/* Existing installed-source panel, fake clock and delayed native/geometry callbacks.
 * No production or APK changes. These are UI contract tests, not camera hardware.
 */
const React = require('react');
const { act, fireEvent, render } = require('@testing-library/react-native');
const { AppState } = require('react-native');
const { CameraOrientationPanel } = require('../../../apps/mobile/src/recognitionExperiment/CameraOrientationPanel');
const { ORIENTATION_MARKER } = require('../../../apps/mobile/src/recognitionExperiment/cameraOrientationEvidence');
const { ORIENTATION_RUN } = require('../../../apps/mobile/src/recognitionExperiment/cameraOrientationProof');
const { cameraOrientationNative } = require('../../../apps/mobile/src/recognitionExperiment/nativeAdapter');

jest.mock('../../../apps/mobile/src/recognitionExperiment/cameraRuntime', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    getCameraPermissionsAsync: jest.fn(async () => ({ granted: true })),
    CameraView: React.forwardRef(function SyntheticCamera(props, ref) {
      React.useImperativeHandle(ref, () => ({ getAvailablePictureSizesAsync: async () => ['2336x1080'] }));
      return React.createElement(View, { ...props, testID: 'session-camera' });
    }),
  };
});
jest.mock('../../../apps/mobile/src/recognitionExperiment/nativeAdapter', () => ({ cameraOrientationNative: {
  inspectOrientationProof: jest.fn(), beginOrientationCase: jest.fn(), cancelOrientationProof: jest.fn(),
  failOrientationCapture: jest.fn(), processOrientationProof: jest.fn(), sealOrientationRun: jest.fn(),
  openOrientationExport: jest.fn(), orientationExportStatus: jest.fn(),
} }));
const native = cameraOrientationNative;
const state = (nonce = 'c0000000-0000-4000-8000-000000000001') => ({
  kind: 'CAMERA_ORIENTATION_STATUS', run: ORIENTATION_RUN, profileVersion: 2, next: 'M00-A000',
  idle: true, generatedExportVerified: true, firstExportVerified: false, readinessNonce: nonce,
  source: '1'.repeat(64), apk: '2'.repeat(64), process: 'a0000000-0000-4000-8000-000000000001',
  nextJobId: 'b0000000-0000-4000-8000-000000000001', lastCase: null, lastJobId: null, lastPublished: null,
});
const marker = s => JSON.parse(s.getByTestId('orientation-capture-status').props.accessibilityLabel.slice(ORIENTATION_MARKER.length));
const press = async (s, label) => { await act(async () => { fireEvent.press(s.getByLabelText(label)); }); };
const tick = async ms => { await act(async () => { jest.advanceTimersByTime(ms); }); };
const disabled = (s, label) => s.getByLabelText(label).props.accessibilityState.disabled;
const inspect = s => press(s, 'Inspect new geometry run');
const restore = s => press(s, 'Restore preview without capture');
const ack = s => press(s, 'Acknowledge current chart and supported phone');
function layout(s) {
  fireEvent(s.getByTestId('orientation-space'), 'layout', { nativeEvent: { layout: { width: 400, height: 300 } } });
  fireEvent(s.getByTestId('orientation-viewport'), 'layout', { nativeEvent: { layout: { width: 400, height: 200 } } });
}
async function geometry(s) {
  await act(async () => { fireEvent(s.getByTestId('session-camera'), 'cameraReady'); });
  await act(async () => { fireEvent(s.getByTestId('session-camera'), 'cosiGeometryReady'); });
}
async function mounted() {
  const s = render(React.createElement(CameraOrientationPanel));
  layout(s); await inspect(s); await restore(s); await geometry(s); await inspect(s); await ack(s);
  return s;
}
beforeEach(() => {
  jest.useFakeTimers(); jest.clearAllMocks();
  Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active' });
  jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({ remove: jest.fn() }));
  native.inspectOrientationProof.mockResolvedValue(state());
});
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

test('273640ms human setup includes exact120s idle expiry; restore clears ACK/nonce and awaits fresh geometry', async () => {
  const s = await mounted();
  expect(disabled(s, 'Capture this geometry row once')).toBe(false);
  const old = marker(s).viewGeneration;
  await tick(119999); expect(marker(s).previewMounted).toBe(true);
  await tick(1); expect(marker(s).previewMounted).toBe(false);
  await tick(153640); expect(marker(s).previewMounted).toBe(false);
  await restore(s);
  expect(marker(s)).toMatchObject({ nonce: null, geometryReady: false, previewMounted: true });
  expect(marker(s).viewGeneration).toBe(old + 2);
  expect(disabled(s, 'Capture this geometry row once')).toBe(true);
  await tick(3500); expect(marker(s).geometryReady).toBe(false);
  await geometry(s);
  expect(marker(s).geometryReady).toBe(true);
  expect(disabled(s, 'Capture this geometry row once')).toBe(true);
  native.inspectOrientationProof.mockResolvedValue(state('d0000000-0000-4000-8000-000000000001'));
  await inspect(s); await ack(s);
  expect(disabled(s, 'Capture this geometry row once')).toBe(false);
  expect(native.beginOrientationCase).not.toHaveBeenCalled();
});

test('explicit mounted close/restore is one epoch each, not repeated Inspect or automatic Capture', async () => {
  const s = await mounted(); const old = marker(s).viewGeneration;
  await press(s, 'Close idle or settled preview');
  expect(marker(s).viewGeneration).toBe(old + 1);
  await restore(s); expect(marker(s).viewGeneration).toBe(old + 2);
  expect(marker(s)).toMatchObject({ nonce: null, geometryReady: false });
  expect(disabled(s, 'Capture this geometry row once')).toBe(true);
  expect(native.beginOrientationCase).not.toHaveBeenCalled();
});

test('Inspect input returns while native callback remains pending; only fresh completion can ACK', async () => {
  const s = await mounted(); await press(s, 'Close idle or settled preview'); await restore(s); await geometry(s);
  let resolve;
  native.inspectOrientationProof.mockReturnValueOnce(new Promise(done => { resolve = done; }));
  fireEvent.press(s.getByLabelText('Inspect new geometry run'));
  expect(marker(s)).toMatchObject({ nonce: null, busy: true });
  expect(disabled(s, 'Acknowledge current chart and supported phone')).toBe(true);
  await tick(4200); expect(marker(s).busy).toBe(true);
  await act(async () => { resolve(state('e0000000-0000-4000-8000-000000000001')); });
  expect(marker(s)).toMatchObject({ busy: false, nonce: 'e0000000-0000-4000-8000-000000000001' });
  expect(disabled(s, 'Capture this geometry row once')).toBe(true);
  await ack(s); expect(disabled(s, 'Capture this geometry row once')).toBe(false);
  expect(native.inspectOrientationProof).toHaveBeenCalledTimes(3);
  expect(native.beginOrientationCase).not.toHaveBeenCalled();
});
