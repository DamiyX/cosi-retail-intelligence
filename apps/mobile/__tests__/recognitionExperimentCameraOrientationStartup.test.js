/* global jest, test, expect, beforeEach, afterEach */
/* Actual runtime panel; simulated native provider ordering and bound readiness events.
 * No native camera, SDK, phone or APK is executed. Delayed old-view destruction
 * is an explicit interleaving, not an assertion about the missing phone trace.
 */
const React = require('react');
const { act, fireEvent, render } = require('@testing-library/react-native');
const { AppState } = require('react-native');
const { CameraOrientationPanel: Original } = require('../src/recognitionExperiment/CameraOrientationPanel');
const Proposed = Original;
const { ORIENTATION_MARKER } = require('../src/recognitionExperiment/cameraOrientationEvidence');
const { ORIENTATION_RUN } = require('../src/recognitionExperiment/cameraOrientationProof');
const { cameraOrientationNative } = require('../src/recognitionExperiment/nativeAdapter');

const mockProvider = { next: 0, active: null, views: new Map(), retired: [], trace: [] };
const mockSizes = jest.fn();
jest.mock('../src/recognitionExperiment/cameraRuntime', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    getCameraPermissionsAsync: jest.fn(async () => ({ granted: true })),
    CameraView: React.forwardRef(function NativeLifetimeModel(props, ref) {
      const id = React.useRef(null);
      const latest = React.useRef(props); latest.current = props;
      if (id.current === null) id.current = ++mockProvider.next;
      React.useImperativeHandle(ref, () => ({ getAvailablePictureSizesAsync: mockSizes }));
      React.useLayoutEffect(() => {
        mockProvider.views.set(id.current, { props: latest.current });
        mockProvider.active = id.current;
        mockProvider.trace.push(['bind', id.current, latest.current.pictureSize ?? 'initial']);
        return () => {
          mockProvider.views.delete(id.current);
          // Fabric can delay native deletion after React removes the view.
          mockProvider.retired.push(id.current);
          mockProvider.trace.push(['retire', id.current]);
        };
      }, []);
      React.useLayoutEffect(() => {
        const view = mockProvider.views.get(id.current);
        if (view.props.pictureSize !== props.pictureSize) {
          mockProvider.active = id.current;
          mockProvider.trace.push(['pictureSize-rebind-same-view', id.current, props.pictureSize]);
        }
        view.props = props;
      });
      return React.createElement(View, { ...props, testID: 'startup-camera' });
    }),
  };
});
jest.mock('../src/recognitionExperiment/nativeAdapter', () => ({ cameraOrientationNative: {
  inspectOrientationProof: jest.fn(), beginOrientationCase: jest.fn(), cancelOrientationProof: jest.fn(),
  failOrientationCapture: jest.fn(), processOrientationProof: jest.fn(), sealOrientationRun: jest.fn(),
  openOrientationExport: jest.fn(), orientationExportStatus: jest.fn(),
} }));

const status = () => ({ kind: 'CAMERA_ORIENTATION_STATUS', run: ORIENTATION_RUN, profileVersion: 2,
  next: 'M00-A000', idle: true, generatedExportVerified: true, firstExportVerified: false,
  readinessNonce: 'c0000000-0000-4000-8000-000000000001', source: '1'.repeat(64), apk: '2'.repeat(64),
  process: 'a0000000-0000-4000-8000-000000000001', nextJobId: 'b0000000-0000-4000-8000-000000000001' });
const marker = s => JSON.parse(s.getByTestId('orientation-capture-status').props.accessibilityLabel.slice(ORIENTATION_MARKER.length));
const press = async (s, name) => { await act(async () => { fireEvent.press(s.getByLabelText(name)); }); };
const current = () => [...mockProvider.views.entries()][0];
async function open(Component) {
  const s = render(React.createElement(Component));
  fireEvent(s.getByTestId('orientation-space'), 'layout', { nativeEvent: { layout: { width: 400, height: 300 } } });
  fireEvent(s.getByTestId('orientation-viewport'), 'layout', { nativeEvent: { layout: { width: 400, height: 200 } } });
  await press(s, 'Inspect new geometry run'); await press(s, 'Restore preview without capture');
  return s;
}
async function cameraReady() { const [, view] = current(); await act(async () => { view.props.onCameraReady(); }); }
const eventFor = props => ({ nativeEvent: { generation: props.cosiPreviewGeneration, pictureSize: props.pictureSize ?? '' } });
async function streaming() {
  const [id, view] = current();
  if (mockProvider.active === id) await act(async () => { view.props.onCosiGeometryReady(eventFor(view.props)); });
}
function delayedNativeCleanup() {
  for (const id of mockProvider.retired.splice(0)) {
    // Exact staged Expo cleanup ownership: cameraProvider?.unbindAll().
    mockProvider.trace.push(['late-unbindAll', id, mockProvider.active]);
    mockProvider.active = null;
  }
}
function noEffects() {
  expect(cameraOrientationNative.beginOrientationCase).not.toHaveBeenCalled();
  expect(cameraOrientationNative.processOrientationProof).not.toHaveBeenCalled();
  expect(cameraOrientationNative.openOrientationExport).not.toHaveBeenCalled();
}
beforeEach(() => {
  jest.useFakeTimers(); jest.clearAllMocks(); mockProvider.next = 0; mockProvider.active = null;
  mockProvider.views.clear(); mockProvider.retired = []; mockProvider.trace = [];
  mockSizes.mockResolvedValue(['2336x1080']);
  Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active' });
  jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({ remove: jest.fn() }));
  cameraOrientationNative.inspectOrientationProof.mockResolvedValue(status());
});
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

test('runtime updates size on the same view and real new geometry is still mandatory', async () => {
  const s = await open(Proposed); const first = current()[0];
  await streaming(); expect(marker(s).geometryReady).toBe(false); // chosen is still null
  await cameraReady(); expect(current()[0]).toBe(first); expect(mockProvider.next).toBe(1);
  expect(mockProvider.trace.some(e => e[0] === 'pictureSize-rebind-same-view')).toBe(true);
  delayedNativeCleanup(); expect(marker(s).geometryReady).toBe(false);
  await streaming(); expect(marker(s).geometryReady).toBe(true);
  expect(marker(s).nonce).toBeNull();
  expect(s.getByLabelText('Capture this geometry row once').props.accessibilityState.disabled).toBe(true);
  noEffects();
});

test('warm explicit close/restore creates one new native view without size remount', async () => {
  const s = await open(Original); await cameraReady(); delayedNativeCleanup();
  // Favorable native ordering: replacement binds after old deletion.
  mockProvider.active = current()[0]; await streaming(); expect(marker(s).geometryReady).toBe(true);
  await press(s, 'Close idle or settled preview'); delayedNativeCleanup();
  const before = mockProvider.next; await press(s, 'Restore preview without capture');
  await cameraReady(); expect(mockProvider.next).toBe(before + 1); expect(mockSizes).toHaveBeenCalledTimes(1);
  await streaming(); expect(marker(s).geometryReady).toBe(true); noEffects();
});

test('runtime rejects stale pre-size and closed-view geometry callbacks', async () => {
  const s = await open(Proposed); const early = current()[1].props.onCosiGeometryReady;
  await cameraReady(); await act(async () => { early({ nativeEvent: { generation: 1, pictureSize: '' } }); }); expect(marker(s).geometryReady).toBe(false);
  await streaming(); expect(marker(s).geometryReady).toBe(true);
  const stale = current()[1].props.onCosiGeometryReady;
  await press(s, 'Close idle or settled preview');
  await act(async () => { stale({ nativeEvent: { generation: 1, pictureSize: '2336x1080' } }); });
  expect(marker(s)).toMatchObject({ previewMounted: false, geometryReady: false }); noEffects();
});


test('queued old-size and old-generation streaming notifications cannot arm current size', async () => {
  const s = await open(Original); await cameraReady();
  const props = current()[1].props;
  for (const nativeEvent of [{ pictureSize: '', generation: props.cosiPreviewGeneration }, { pictureSize: '2336x1080', generation: props.cosiPreviewGeneration - 1 }]) {
    await act(async () => { props.onCosiGeometryReady({ nativeEvent }); });
    expect(marker(s).geometryReady).toBe(false);
  }
  await streaming(); expect(marker(s).geometryReady).toBe(true); noEffects();
});

test('layout and lifecycle remounts invalidate old view notifications', async () => {
  const s = await open(Original); await cameraReady(); await streaming();
  const previous = current()[1].props;
  fireEvent(s.getByTestId('orientation-viewport'), 'layout', { nativeEvent: { layout: { width: 380, height: 190 } } });
  await act(async () => { previous.onCosiGeometryReady(eventFor(previous)); });
  expect(marker(s).geometryReady).toBe(false);
  await streaming(); expect(marker(s).geometryReady).toBe(true);
  const handler = AppState.addEventListener.mock.calls[0][1];
  await act(async () => { Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'background' }); handler('background'); });
  expect(marker(s).previewMounted).toBe(false);
  await act(async () => { previous.onCosiGeometryReady(eventFor(previous)); });
  expect(marker(s).geometryReady).toBe(false); noEffects();
});
