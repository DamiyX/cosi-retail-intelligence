import { act, fireEvent, render } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { CameraOrientationPanel } from '../src/recognitionExperiment/CameraOrientationPanel';
import { ORIENTATION_MARKER, orientationMarker, settledCapturePhase } from '../src/recognitionExperiment/cameraOrientationEvidence';
import { ORIENTATION_RUN, type OrientationStatus } from '../src/recognitionExperiment/cameraOrientationProof';
import { cameraOrientationNative } from '../src/recognitionExperiment/nativeAdapter';

const mockStart = jest.fn();
const mockCancel = jest.fn();
jest.mock('../src/recognitionExperiment/cameraOrientationProof', () => ({
  ...jest.requireActual('../src/recognitionExperiment/cameraOrientationProof'),
  CameraOrientationRun: class {
    running = false;
    cancel(reason: unknown) { mockCancel(reason); }
    async start(...args: unknown[]) {
      this.running = true;
      try { return await mockStart(...args); } finally { this.running = false; }
    }
  },
}));
jest.mock('../src/recognitionExperiment/cameraRuntime', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    getCameraPermissionsAsync: jest.fn(async () => ({ granted: true })),
    CameraView: React.forwardRef(function SyntheticCamera(props, ref) {
      React.useImperativeHandle(ref, () => ({ getAvailablePictureSizesAsync: async () => ['2336x1080'] }));
      return <View {...props} testID="evidence-camera" />;
    }),
  };
});
jest.mock('../src/recognitionExperiment/nativeAdapter', () => ({ cameraOrientationNative: {
  inspectOrientationProof: jest.fn(), beginOrientationCase: jest.fn(), cancelOrientationProof: jest.fn(),
  failOrientationCapture: jest.fn(), processOrientationProof: jest.fn(), sealOrientationRun: jest.fn(),
  openOrientationExport: jest.fn(), orientationExportStatus: jest.fn(),
} }));
const native = jest.mocked(cameraOrientationNative);
const process = 'a0000000-0000-4000-8000-000000000001';
const job = 'b0000000-0000-4000-8000-000000000001';
function state(next = 'M00-A000', extra: Record<string, unknown> = {}): OrientationStatus {
  return { kind: 'CAMERA_ORIENTATION_STATUS', run: ORIENTATION_RUN, profileVersion: 2, next,
    idle: true, generatedExportVerified: true, firstExportVerified: false,
    readinessNonce: 'c0000000-0000-4000-8000-000000000001', source: '1'.repeat(64), apk: '2'.repeat(64),
    process, nextJobId: job, lastCase: null, lastJobId: null, lastPublished: null, ...extra };
}
function pending<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
type Screen = ReturnType<typeof render>;
let onState: (value: AppStateStatus) => void;
beforeEach(() => {
  jest.useFakeTimers();jest.resetAllMocks();
  // React Native's Jest host does not invoke native measurement callbacks by default.
  jest.requireActual<{ default: { measureInWindow: jest.Mock } }>('@react-native/jest-preset/jest/MockNativeMethods')
    .default.measureInWindow.mockImplementation((cb: (x: number, y: number, w: number, h: number) => void) => cb(0, 0, 400, 200));
  // resetAllMocks also resets the mock's permission implementation.
  const permissions = jest.requireMock('../src/recognitionExperiment/cameraRuntime') as { getCameraPermissionsAsync: jest.Mock };
  permissions.getCameraPermissionsAsync.mockResolvedValue({ granted: true });
  Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active' });
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, handler) => { onState = handler; return { remove: jest.fn() }; });
  native.inspectOrientationProof.mockResolvedValue(state());mockStart.mockResolvedValue(undefined);
});
afterEach(() => { jest.useRealTimers();jest.restoreAllMocks(); });
function screen() {
  return render(<CameraOrientationPanel />, { createNodeMock: () => ({ measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => cb(0, 0, 400, 200) }) });
}
function marker(s: Screen) { return JSON.parse(s.getByTestId('orientation-capture-status').props.accessibilityLabel.slice(ORIENTATION_MARKER.length)) as Record<string, unknown>; }
async function press(s: Screen, label: string) { await act(async () => { fireEvent.press(s.getByLabelText(label)); }); }
async function inspect(s: Screen) { await press(s, 'Inspect new geometry run'); }
async function ticks(ms: number) { await act(async () => { jest.advanceTimersByTime(ms); }); }
async function transition(value: AppStateStatus) {
  await act(async () => { Object.defineProperty(AppState, 'currentState', { configurable: true, value });onState(value); });
}
function layout(s: Screen) {
  fireEvent(s.getByTestId('orientation-space'), 'layout', { nativeEvent: { layout: { width: 400, height: 300 } } });
  fireEvent(s.getByTestId('orientation-viewport'), 'layout', { nativeEvent: { layout: { width: 400, height: 200 } } });
}
async function preview(s: Screen) {
  layout(s);await inspect(s);await press(s, 'Restore preview without capture');
  await act(async () => { fireEvent(s.getByTestId('evidence-camera'), 'cameraReady'); });
  await act(async () => { fireEvent(s.getByTestId('evidence-camera'), 'cosiGeometryReady', { nativeEvent: { pictureSize: s.getByTestId('evidence-camera').props.pictureSize, generation: s.getByTestId('evidence-camera').props.cosiPreviewGeneration } }); });
  // Explicit restore invalidates the native token; a new Inspect is mandatory.
  await inspect(s);
}
async function start(s: Screen) {
  await press(s, 'Acknowledge current chart and supported phone');
  await press(s, 'Capture this geometry row once');
}
function closeEnabled(s: Screen) { return s.getByLabelText('Close idle or settled preview').props.accessibilityState.disabled === false; }

test('compact marker exposes native terminal job and process instead of the next row', () => {
  const value = state('M01-A090', { lastCase: 'M00-A000', lastJobId: job, lastPublished: true, nextJobId: 'next-job' });
  expect(settledCapturePhase(value, 'M00-A000')).toBe('PUBLISHED');
  const text = orientationMarker(value, { phase: 'PUBLISHED', caseId: 'M00-A000', lifecycle: 7, viewGeneration: 11, layout: 'A', previewMounted: true, busy: false });
  const m = JSON.parse(text.slice(ORIENTATION_MARKER.length)) as Record<string, unknown>;
  expect(m).toMatchObject({ run: ORIENTATION_RUN, caseId: 'M00-A000', jobId: job, process, lifecycle: 7, viewGeneration: 11, published: true });
  expect(text.length).toBeLessThan(4096);
  for (const extra of [{ idle: false }, { lastCase: 'M01-A090' }, { lastJobId: null }, { lastPublished: null }]) {
    expect(settledCapturePhase({ ...value, ...extra }, 'M00-A000')).toBe('UNKNOWN');
  }
  expect(settledCapturePhase({ ...value, lastPublished: false }, 'M00-A000')).toBe('REFUSED');
});

test('idle preview closes at120s exactly and requires explicit restore', async () => {
  const s = screen();await preview(s);expect(closeEnabled(s)).toBe(true);
  await ticks(119_999);expect(s.queryByTestId('evidence-camera')).not.toBeNull();
  await ticks(1);expect(s.queryByTestId('evidence-camera')).toBeNull();expect(marker(s).previewMounted).toBe(false);
  expect(mockStart).not.toHaveBeenCalled();await press(s, 'Restore preview without capture');
  expect(s.queryByTestId('evidence-camera')).not.toBeNull();
});

test('capture freezes live A at the A-to-B boundary until explicit close and next restore', async () => {
  native.inspectOrientationProof.mockResolvedValue(state('M03-A270'));
  const p = pending<void>();mockStart.mockReturnValue(p.promise);const s = screen();await preview(s);await start(s);
  expect(marker(s)).toMatchObject({ phase: 'CAPTURING', caseId: 'M03-A270', layout: 'A' });
  expect(closeEnabled(s)).toBe(false);expect(mockStart).toHaveBeenCalledTimes(1);
  native.inspectOrientationProof.mockResolvedValue(state('M04-B000', { lastCase: 'M03-A270', lastJobId: job, lastPublished: true }));
  await act(async () => { p.resolve(); });
  expect(marker(s)).toMatchObject({ phase: 'PUBLISHED', caseId: 'M03-A270', layout: 'A', previewMounted: true });
  expect(s.getByTestId('orientation-viewport').props.style).toMatchObject({ height: 200 });
  expect(s.getByLabelText('Capture this geometry row once').props.accessibilityState.disabled).toBe(true);
  await press(s, 'Capture this geometry row once');expect(mockStart).toHaveBeenCalledTimes(1);
  await press(s, 'Close idle or settled preview');expect(s.queryByTestId('evidence-camera')).toBeNull();
  await press(s, 'Restore preview without capture');
  expect(marker(s)).toMatchObject({ phase: 'IDLE', caseId: 'M04-B000', layout: 'B' });
  expect(s.getByTestId('orientation-viewport').props.style).toMatchObject({ height: 300 });
  expect(s.getByLabelText('Capture this geometry row once').props.accessibilityState.disabled).toBe(true);
});

test('terminal preview watchdog closes at30s without declaring missing post evidence present', async () => {
  const p = pending<void>();mockStart.mockReturnValue(p.promise);const s = screen();await preview(s);await start(s);
  native.inspectOrientationProof.mockResolvedValue(state('M01-A090', { lastCase: 'M00-A000', lastJobId: job, lastPublished: true }));
  await act(async () => { p.resolve(); });await ticks(29_999);expect(s.queryByTestId('evidence-camera')).not.toBeNull();
  await ticks(1);expect(s.queryByTestId('evidence-camera')).toBeNull();
  expect(s.getByText(/Any missing post evidence remains missing/)).toBeTruthy();expect(mockStart).toHaveBeenCalledTimes(1);
});

test('active capture cannot be closed manually or by either watchdog', async () => {
  const p = pending<void>();mockStart.mockReturnValue(p.promise);const s = screen();await preview(s);await start(s);
  expect(closeEnabled(s)).toBe(false);await press(s, 'Close idle or settled preview');await ticks(150_000);
  expect(s.queryByTestId('evidence-camera')).not.toBeNull();expect(marker(s).phase).toBe('CAPTURING');
  expect(mockStart).toHaveBeenCalledTimes(1);await act(async () => { p.reject(Error('CAMERA_UNKNOWN')); });
});

test('unknown settlement keeps preview ownership and cannot close through idle watchdog', async () => {
  const p = pending<void>();mockStart.mockReturnValue(p.promise);const s = screen();await preview(s);await start(s);
  native.inspectOrientationProof.mockRejectedValue(Error('CAMERA_NATIVE_STATE_UNKNOWN'));
  await act(async () => { p.reject(Error('CAMERA_CAPTURE_UNKNOWN')); });
  expect(marker(s).phase).toBe('UNKNOWN');expect(closeEnabled(s)).toBe(false);await ticks(150_000);
  expect(s.queryByTestId('evidence-camera')).not.toBeNull();expect(mockStart).toHaveBeenCalledTimes(1);
});

test('refused native terminal can close but a settled bridge promise alone cannot publish', async () => {
  const p = pending<void>();mockStart.mockReturnValue(p.promise);const s = screen();await preview(s);await start(s);
  native.inspectOrientationProof.mockResolvedValue(state('STOP', { readinessNonce: null, lastCase: 'M00-A000', lastJobId: job, lastPublished: false }));
  await act(async () => { p.resolve(); });expect(marker(s).phase).toBe('REFUSED');expect(closeEnabled(s)).toBe(true);
  await press(s, 'Close idle or settled preview');expect(s.queryByTestId('evidence-camera')).toBeNull();
  expect(s.getByLabelText('Restore preview without capture').props.accessibilityState.disabled).toBe(true);
});

test('late native status after background never restores phase, nonce or preview', async () => {
  const p = pending<void>();mockStart.mockReturnValue(p.promise);const s = screen();await preview(s);await start(s);
  const reply = pending<OrientationStatus>();native.inspectOrientationProof.mockReturnValue(reply.promise);
  await act(async () => { p.resolve(); });const before = marker(s).lifecycle;await transition('background');
  await act(async () => { reply.resolve(state('M01-A090', { lastCase: 'M00-A000', lastJobId: job, lastPublished: true })); });
  expect(marker(s)).toMatchObject({ phase: 'UNKNOWN', previewMounted: false, nonce: null, published: null });
  expect(Number(marker(s).lifecycle)).toBeGreaterThan(Number(before));expect(s.queryByTestId('evidence-camera')).toBeNull();
  await transition('active');expect(marker(s).phase).toBe('UNKNOWN');expect(s.queryByTestId('evidence-camera')).toBeNull();
});

test('original sanitized capture error survives successful update in marker without resizing preview', async () => {
  const p = pending<void>();mockStart.mockReturnValue(p.promise);const s = screen();await preview(s);
  const viewport = s.getByTestId('orientation-viewport').props.style;
  await start(s);await act(async () => { p.reject(Error('CAMERA_ORIENTATION_STALE_READINESS')); });
  const original = marker(s).captureError;
  expect(original).toMatchObject({ code: 'CAMERA_ORIENTATION_STALE_READINESS', stage: 'NATIVE_CAPTURE', caseId: 'M00-A000', jobId: job, process });
  expect(marker(s)).toMatchObject({ phase: 'UNKNOWN', inspectionError: null, previewMounted: true });
  expect(s.getByText(/Capture error: CAMERA_ORIENTATION_STALE_READINESS/)).toBeTruthy();
  expect(s.getByTestId('orientation-viewport').props.style).toEqual(viewport);
  await inspect(s);expect(marker(s).captureError).toEqual(original);
  await press(s, 'Capture this geometry row once');expect(mockStart).toHaveBeenCalledTimes(1);
});

test('failed final inspection retains primary error and records distinct inspection error', async () => {
  const p = pending<void>();mockStart.mockReturnValue(p.promise);const s = screen();await preview(s);await start(s);
  native.inspectOrientationProof.mockRejectedValue(Error('CAMERA_INSPECTION_FAILED'));
  await act(async () => { p.reject(Error('CAMERA_ORIENTATION_STALE_READINESS')); });
  expect(marker(s).captureError).toMatchObject({ code: 'CAMERA_ORIENTATION_STALE_READINESS', stage: 'NATIVE_CAPTURE' });
  expect(marker(s).inspectionError).toMatchObject({ code: 'CAMERA_INSPECTION_FAILED', stage: 'INSPECT', caseId: 'M00-A000', jobId: job, process });
  expect(marker(s).phase).toBe('UNKNOWN');expect(closeEnabled(s)).toBe(false);
  expect(s.getByText(/Capture error: CAMERA_ORIENTATION_STALE_READINESS/)).toBeTruthy();
  expect(s.getByText(/Inspection error: CAMERA_INSPECTION_FAILED/)).toBeTruthy();
  const primary = marker(s).captureError, secondary = marker(s).inspectionError;
  native.inspectOrientationProof.mockResolvedValue(state());await inspect(s);
  expect(marker(s).captureError).toEqual(primary);expect(marker(s).inspectionError).toEqual(secondary);
});

test('late capture rejection after lifecycle change cannot attach errors to new foreground', async () => {
  const p = pending<void>();mockStart.mockReturnValue(p.promise);const s = screen();await preview(s);await start(s);
  await transition('background');await transition('active');
  await act(async () => { p.reject(Error('CAMERA_OLD_CAPTURE_FAILED')); });
  expect(marker(s)).toMatchObject({ captureError: null, inspectionError: null, previewMounted: false, nonce: null, phase: 'UNKNOWN' });
  expect(s.queryByText(/Capture error:/)).toBeNull();expect(mockStart).toHaveBeenCalledTimes(1);
});

test('late capture rejection after physical view change cannot latch old error', async () => {
  const p = pending<void>();mockStart.mockReturnValue(p.promise);const s = screen();await preview(s);await start(s);
  fireEvent(s.getByTestId('orientation-viewport'), 'layout', { nativeEvent: { layout: { width: 398, height: 199 } } });
  await act(async () => { p.reject(Error('CAMERA_OLD_VIEW_FAILED')); });
  expect(marker(s).captureError).toBeNull();expect(marker(s).inspectionError).toBeNull();
  expect(mockStart).toHaveBeenCalledTimes(1);
});

test('late final inspection rejection after view change cannot attach secondary error', async () => {
  const p = pending<void>();mockStart.mockReturnValue(p.promise);const s = screen();await preview(s);await start(s);
  const reply = pending<OrientationStatus>();native.inspectOrientationProof.mockReturnValue(reply.promise);
  await act(async () => { p.resolve(); });
  fireEvent(s.getByTestId('orientation-viewport'), 'layout', { nativeEvent: { layout: { width: 398, height: 199 } } });
  await act(async () => { reply.reject(Error('CAMERA_OLD_INSPECTION_FAILED')); });
  expect(marker(s).captureError).toBeNull();expect(marker(s).inspectionError).toBeNull();
});

test('restoring an idle paused preview clears nonce and blocks capture until fresh Inspect', async () => {
  const s = screen();await preview(s);await ticks(120_000);
  await press(s, 'Restore preview without capture');
  await act(async () => { fireEvent(s.getByTestId('evidence-camera'), 'cosiGeometryReady', { nativeEvent: { pictureSize: s.getByTestId('evidence-camera').props.pictureSize, generation: s.getByTestId('evidence-camera').props.cosiPreviewGeneration } }); });
  expect(marker(s).nonce).toBeNull();
  expect(s.getByLabelText('Acknowledge current chart and supported phone').props.accessibilityState.disabled).toBe(true);
  expect(s.getByLabelText('Capture this geometry row once').props.accessibilityState.disabled).toBe(true);
  native.inspectOrientationProof.mockResolvedValue(state('M00-A000', { readinessNonce: 'd0000000-0000-4000-8000-000000000001' }));
  await inspect(s);expect(marker(s).nonce).toBe('d0000000-0000-4000-8000-000000000001');
  expect(s.getByLabelText('Acknowledge current chart and supported phone').props.accessibilityState.disabled).toBe(false);
  expect(mockStart).not.toHaveBeenCalled();
});
