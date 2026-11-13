import { CameraMatrixRun, MATRIX_CASES, MATRIX_RUN, matrixAction, matrixCase, matrixStatus, type MatrixNative, type MatrixRequest } from '../src/recognitionExperiment/cameraMatrixProof';
import type { CameraProofNative } from '../src/recognitionExperiment/cameraProof';
const id = '12345678-1234-1234-1234-123456789abc', sha = 'a'.repeat(64), nonce = '22222222-2222-2222-2222-222222222222';
const request: MatrixRequest = { camera: { reportedWidth: 2000, reportedHeight: 2000, previewWidth: 300, previewHeight: 500, layout: 'A', contentMode: 'FILL' }, previewRectPhysical: { left: 20, top: 100, right: 320, bottom: 600 }, viewGeneration: 1 };
const picture = { uri: 'file:///cache/Camera/' + id + '.jpg', width: 2000, height: 2000, exif: { Orientation: 1 } };
function legacyReceipt() {
  const vector = Array(1024).fill(0); vector[0] = 3; vector[1] = 4;
  return { schemaVersion: 1, kind: 'CAMERA_PROOF_NUMERICAL', jobId: id, sourceSha256: sha, modelSha256: 'bbbb4c51a55a53905af1daec995ca1aae355046f8839bb8c9f5ce9271394bc40', recipe: 'camera-android-jpeg-exif-roi-center-bilinear-u8-gray128-rgb224-f32-div255-v1', recipeSha256: '76142a4e3bada43fe6f91fe295cfc624df4b1157cf92dd7ae680bc236bc15522', roiRgbSha256: sha, roiFormat: 'upright-half-open-row-major-rgb-u8-v1', roiRgbBytes: 1998 * 1996 * 3, jpegSha256: sha, tensorSha256: sha, previewSha256: sha, rawVectorSha256: sha, normalizedVectorSha256: sha, geometryStatus: 'INCONCLUSIVE', physicalFovProven: false, autoAccept: false, cameraProofAccepted: false, sdkHardCap: false, sdkPeakKnown: false, sensorExposureTimeKnown: false, runtime: 'FROM_APPLICATION_ONLY', threads: 1, xnnpack: false, gpu: false, nnapi: false, width: 2000, height: 2000, orientation: 1, jpegBytes: 12 * 1024 * 1024, effectiveBox: [1, 2, 1999, 1998], rawVector: vector, normalizedVector: vector.map(v => Math.fround(v / 5)), rawNormSquared: 25, inferenceMs: 1, requestToReceiptMs: 2, sdkObservedCacheBytes: 12 * 1024 * 1024 };
}

function deps(caseId = 'M00-A000') {
  const n: jest.Mocked<CameraProofNative> = { beginCameraProof: jest.fn(), cancelCameraProof: jest.fn().mockResolvedValue(true), failCameraProofCapture: jest.fn().mockResolvedValue(true), processCameraProof: jest.fn().mockResolvedValue({ receiptJson: JSON.stringify({ ...legacyReceipt(), jpegBytes: 10 * 1024 * 1024, matrixRun: MATRIX_RUN, matrixCase: caseId, matrixSource: sha }), previewUri: 'file:///private/' + id + '.preview.png' }), cameraProofStatus: jest.fn(), recoverCameraProof: jest.fn(), recordCameraProofRefusal: jest.fn(), cameraProofNumerical: jest.fn() };
  const m: jest.Mocked<MatrixNative> = { inspectMatrixProof: jest.fn(), observeMatrixPermission: jest.fn(), beginMatrixCase: jest.fn().mockResolvedValue({ jobId: id, sourceSha256: sha, matrixSource: sha, caseId }), matrixCaptureInvoked: jest.fn().mockResolvedValue(true), matrixCapturePhase: jest.fn().mockResolvedValue(true), recoverMatrixProof: jest.fn(), sealMatrixRun: jest.fn(), exportMatrixEvidence: jest.fn(), cancelMatrixEvidenceExport: jest.fn() };
  return { n, m, run: new CameraMatrixRun(m, n) };
}
function deferred<T>() { let resolve!: (v: T) => void, reject!: (e: Error) => void; const promise = new Promise<T>((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
async function flush() { for (let i = 0; i < 12; i++) await Promise.resolve(); }
afterEach(() => jest.useRealTimers());
test('fixed registry and status reject arbitrary names; D03 is a distinct observation', () => {
  expect(MATRIX_CASES).toHaveLength(12); expect(new Set(MATRIX_CASES).size).toBe(12); expect(matrixCase('M00-A000')).toBe(true); expect(matrixCase('../private')).toBe(false);
  expect(matrixStatus({ kind: 'CAMERA_MATRIX_STATUS', run: MATRIX_RUN, next: 'D03-RESTORED-AFTER-L04', readinessNonce: null, idle: true, exportConsumed: false }).next).toBe('D03-RESTORED-AFTER-L04');
  for (const changed of [{ next: 'other' }, { run: 'old' }, { readinessNonce: 'bad' }, { idle: 'true' }]) expect(() => matrixStatus({ kind: 'CAMERA_MATRIX_STATUS', run: MATRIX_RUN, next: 'SEALED', readinessNonce: null, idle: true, exportConsumed: true, ...changed })).toThrow();
});
test('actual request envelope and nonce are bound before one SDK call; no generic capture', async () => {
  const { n, m, run } = deps(), take = jest.fn(async () => picture);
  m.beginMatrixCase.mockImplementationOnce(async (c, json, token) => { expect(take).not.toHaveBeenCalled(); expect(c).toBe('M00-A000'); expect(JSON.parse(json)).toEqual(request); expect(token).toBe(nonce); return { jobId: id, sourceSha256: sha, matrixSource: sha, caseId: c }; });
  const result = await run.start('M00-A000', request, nonce, async () => take);
  expect(result.receipt.jpegBytes).toBe(10 * 1024 * 1024); expect(take).toHaveBeenCalledTimes(1); expect(n.beginCameraProof).not.toHaveBeenCalled(); expect(m.matrixCaptureInvoked).not.toHaveBeenCalled();
});
test.each(MATRIX_CASES.slice(0, 4))('%s settled-held evidence stays distinct from SDK pending and suppresses result', async caseId => {
  const { n, m, run } = deps(caseId); n.processCameraProof.mockRejectedValueOnce(Error('CAMERA_CANCELLED'));
  const started = run.start(caseId, request, nonce, async () => async () => picture); const rejected = expect(started).rejects.toThrow();
  await flush(); expect(n.processCameraProof).not.toHaveBeenCalled(); expect(run.running).toBe(true); run.boundary(matrixAction(caseId)!); await rejected;
  expect(JSON.parse(m.matrixCapturePhase.mock.calls[0][1])).toEqual(expect.objectContaining({ action: matrixAction(caseId), pendingAtAction: false, outcome: 'FULFILLED' })); expect(n.cancelCameraProof).toHaveBeenCalledTimes(1);
});
test('pending action does not release/finalize until the real SDK callback settles', async () => {
  const { n, m, run } = deps('L01-USER-CANCEL'), sdk = deferred<unknown>(); n.processCameraProof.mockRejectedValueOnce(Error('CAMERA_CANCELLED'));
  const started = run.start('L01-USER-CANCEL', request, nonce, async () => () => sdk.promise); const rejected = expect(started).rejects.toThrow();
  await flush(); run.boundary('USER'); run.boundary('USER'); await flush(); expect(n.processCameraProof).not.toHaveBeenCalled(); expect(n.failCameraProofCapture).not.toHaveBeenCalled(); expect(run.running).toBe(true);
  sdk.resolve(picture); await rejected; expect(JSON.parse(m.matrixCapturePhase.mock.calls[0][1]).pendingAtAction).toBe(true); expect(n.processCameraProof).toHaveBeenCalledTimes(1); expect(n.cancelCameraProof).toHaveBeenCalledTimes(1);
});
test('deadline and journal failure cannot fabricate SDK drain or retry', async () => {
  jest.useFakeTimers(); const { n, m, run } = deps('L01-USER-CANCEL'), sdk = deferred<unknown>(); m.matrixCaptureInvoked.mockRejectedValueOnce(Error('journal failed'));
  const started = run.start('L01-USER-CANCEL', request, nonce, async () => () => sdk.promise); const rejected = expect(started).rejects.toThrow(); await flush(); jest.advanceTimersByTime(120_000); await flush();
  expect(n.failCameraProofCapture).not.toHaveBeenCalled(); expect(n.processCameraProof).not.toHaveBeenCalled(); expect(run.running).toBe(true); sdk.resolve(picture); await rejected; expect(n.failCameraProofCapture).toHaveBeenCalledTimes(1); expect(m.beginMatrixCase).toHaveBeenCalledTimes(1);
});
test('SDK rejection is recorded after actual settlement with the real lifecycle action', async () => {
  const { n, m, run } = deps('L03-VIEW-UNMOUNT'), sdk = deferred<unknown>(); const started = run.start('L03-VIEW-UNMOUNT', request, nonce, async () => () => sdk.promise); const rejected = expect(started).rejects.toThrow(); await flush(); run.boundary('UNMOUNT'); sdk.reject(Error('SDK rejected')); await rejected;
  expect(JSON.parse(m.matrixCapturePhase.mock.calls[0][1]).outcome).toBe('REJECTED'); expect(n.failCameraProofCapture).toHaveBeenCalledWith(id, 'CAMERA_CAPTURE_REJECTED'); expect(n.processCameraProof).not.toHaveBeenCalled();
});
test('stale nonce/permission admission refusal never calls SDK or retries', async () => {
  const { n, m, run } = deps(), take = jest.fn(); m.beginMatrixCase.mockRejectedValueOnce(Error('CAMERA_MATRIX_READINESS_STALE'));
  await expect(run.start('M00-A000', request, nonce, take)).rejects.toThrow('CAMERA_MATRIX_READINESS_STALE'); expect(take).not.toHaveBeenCalled(); expect(n.failCameraProofCapture).not.toHaveBeenCalled(); expect(m.beginMatrixCase).toHaveBeenCalledTimes(1);
});
test('lost view/generation before SDK consumes only the admission and reports not started', async () => {
  const { n, m, run } = deps(); await expect(run.start('M00-A000', request, nonce, async () => { throw Error('CAMERA_PERMISSION_OR_VIEW_LOST'); })).rejects.toThrow(); expect(n.failCameraProofCapture).toHaveBeenCalledWith(id, 'CAMERA_CAPTURE_NOT_STARTED'); expect(m.beginMatrixCase).toHaveBeenCalledTimes(1); expect(n.processCameraProof).not.toHaveBeenCalled();
});
test('matrix rejects one byte over10MiB even though legacy receipt accepts12MiB', async () => {
  const { n, run } = deps(); n.processCameraProof.mockResolvedValueOnce({ receiptJson: JSON.stringify({ ...legacyReceipt(), jpegBytes: 10 * 1024 * 1024 + 1, matrixRun: MATRIX_RUN, matrixCase: 'M00-A000', matrixSource: sha }), previewUri: 'file:///private/' + id + '.preview.png' });
  await expect(run.start('M00-A000', request, nonce, async () => async () => picture)).rejects.toThrow('CAMERA_MATRIX_RECEIPT'); expect(n.processCameraProof).toHaveBeenCalledTimes(1);
});
