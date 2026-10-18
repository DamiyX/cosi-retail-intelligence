import { CameraProofRun, captureMetadata, choosePictureSize, ticket, validateCameraReceipt, type CameraProofNative } from '../src/recognitionExperiment/cameraProof';

const id = '12345678-1234-1234-1234-123456789abc', sha = 'a'.repeat(64);
const request = { reportedWidth: 2000, reportedHeight: 2000, previewWidth: 300, previewHeight: 500, layout: 'A' as const, contentMode: 'FILL' as const };
const picture = { uri: 'file:///cache/Camera/' + id + '.jpg', width: 2000, height: 2000, exif: { Orientation: 1, PrivateField: 'excluded' } };
function receipt() {
  const vector = Array(1024).fill(0); vector[0] = 3; vector[1] = 4;
  return { schemaVersion: 1, kind: 'CAMERA_PROOF_NUMERICAL', jobId: id, sourceSha256: sha, modelSha256: 'bbbb4c51a55a53905af1daec995ca1aae355046f8839bb8c9f5ce9271394bc40', recipe: 'camera-android-jpeg-exif-roi-center-bilinear-u8-gray128-rgb224-f32-div255-v1', recipeSha256: '76142a4e3bada43fe6f91fe295cfc624df4b1157cf92dd7ae680bc236bc15522', roiRgbSha256: sha, roiFormat: 'upright-half-open-row-major-rgb-u8-v1', roiRgbBytes: 1998 * 1996 * 3, jpegSha256: sha, tensorSha256: sha, previewSha256: sha, rawVectorSha256: sha, normalizedVectorSha256: sha, geometryStatus: 'INCONCLUSIVE', physicalFovProven: false, autoAccept: false, cameraProofAccepted: false, sdkHardCap: false, sdkPeakKnown: false, sensorExposureTimeKnown: false, runtime: 'FROM_APPLICATION_ONLY', threads: 1, xnnpack: false, gpu: false, nnapi: false, width: 2000, height: 2000, orientation: 1, jpegBytes: 12 * 1024 * 1024, effectiveBox: [1, 2, 1999, 1998], rawVector: vector, normalizedVector: vector.map(v => Math.fround(v / 5)), rawNormSquared: 25, inferenceMs: 1, requestToReceiptMs: 2, sdkObservedCacheBytes: 12 * 1024 * 1024 };
}
function native(): jest.Mocked<CameraProofNative> {
  return { beginCameraProof: jest.fn().mockResolvedValue({ jobId: id, sourceSha256: sha }), cancelCameraProof: jest.fn().mockResolvedValue(true), failCameraProofCapture: jest.fn().mockResolvedValue(true), processCameraProof: jest.fn().mockResolvedValue({ receiptJson: JSON.stringify(receipt()), previewUri: 'file:///private/' + id + '.preview.png' }), cameraProofStatus: jest.fn(), recoverCameraProof: jest.fn(), recordCameraProofRefusal: jest.fn(), cameraProofNumerical: jest.fn() };
}
function deferred<T>() { let resolve!: (value: T) => void, reject!: (error: Error) => void; const promise = new Promise<T>((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
const prepared = (capture: () => Promise<unknown>) => async () => capture;
test('selects a deterministic reported size within 4MP, refuses unbounded/unknown lists', () => {
  expect(choosePictureSize(['4000x3000', '2000x2000', '1920x1080', 'bad'])).toEqual({ size: '2000x2000', width: 2000, height: 2000 });
  expect(choosePictureSize(['2001x2000', '2000x2000']).size).toBe('2000x2000');
  for (const sizes of [[], ['2001x2000'], ['0x500'], Array(513).fill('10x10')]) expect(() => choosePictureSize(sizes)).toThrow();
});
test('forwards only bounded callback observations; unknown raw metadata stays unknown for native refusal', () => {
  expect(captureMetadata(picture)).toEqual({ uri: picture.uri, width: 2000, height: 2000, orientation: 1 });
  expect(captureMetadata({ ...picture, width: -1, exif: undefined })).toEqual({ uri: picture.uri, width: -1, height: 2000, orientation: 0 });
  for (const invalid of [null, { ...picture, uri: 'content://foreign' }, { ...picture, width: NaN }, { ...picture, height: 2 ** 32 }]) expect(() => captureMetadata(invalid)).toThrow();
  expect(() => ticket({ jobId: id, sourceSha256: 'stale' })).toThrow();
});
test('receipt preserves numerical facts and inconclusive geometry; rejects wrong binding/output/export', () => {
  expect(validateCameraReceipt(JSON.stringify(receipt()), { jobId: id, sourceSha256: sha }).rawNormSquared).toBe(25);
  const mutations = [{ jobId: 'other' }, { sourceSha256: 'b'.repeat(64) }, { modelSha256: sha }, { threads: 2 }, { jpegBytes: 12 * 1024 * 1024 + 1 }, { width: 2001 }, { orientation: 0 }, { effectiveBox: [-1, 0, 2, 3] }, { rawVector: Array(1023).fill(1) }, { rawVector: Array(1024).fill(0), rawNormSquared: 0 }, { normalizedVector: Array(1024).fill(1) }, { rawNormSquared: 24 }, { inferenceMs: -1 }, { geometryStatus: 'PASSED' }, { sdkHardCap: true }, { sdkPeakKnown: true }, { sensorExposureTimeKnown: true }, { arbitraryExif: {} }, { jpegUri: picture.uri }];
  for (const mutation of mutations) expect(() => validateCameraReceipt(JSON.stringify({ ...receipt(), ...mutation }), { jobId: id, sourceSha256: sha })).toThrow();
  expect(() => validateCameraReceipt(' '.repeat(65537), { jobId: id, sourceSha256: sha })).toThrow();
});
test('reserves a native ticket before camera invocation and has no automatic work', async () => {
  const n = native(), run = new CameraProofRun(n), capture = jest.fn(async () => picture);
  expect(n.beginCameraProof).not.toHaveBeenCalled();
  n.beginCameraProof.mockImplementationOnce(async () => { expect(capture).not.toHaveBeenCalled(); return { jobId: id, sourceSha256: sha }; });
  expect((await run.start(request, prepared(capture))).receipt.geometryStatus).toBe('INCONCLUSIVE');
  expect(n.processCameraProof).toHaveBeenCalledWith(id, JSON.stringify(captureMetadata(picture)));
  expect(n.failCameraProofCapture).not.toHaveBeenCalled(); expect(run.running).toBe(false);
});
test.each(['USER', 'BACKGROUND', 'UNMOUNT', 'PERMISSION_LOSS'] as const)('%s invalidates once, awaits real late callback, and never invents a release', async reason => {
  const n = native(), run = new CameraProofRun(n), capture = deferred<unknown>(), invoked = deferred<void>();
  const started = run.start(request, prepared(() => { invoked.resolve(undefined); return capture.promise; }));
  await invoked.promise; run.cancel(reason); run.cancel(reason);
  expect(n.cancelCameraProof).toHaveBeenCalledTimes(1); expect(run.running).toBe(true);
  await expect(run.start(request, prepared(async () => picture))).rejects.toThrow('CAMERA_BUSY');
  capture.resolve(picture); await expect(started).rejects.toThrow('CAMERA_CANCELLED');
  expect(n.processCameraProof).toHaveBeenCalledTimes(1); expect(n.failCameraProofCapture).not.toHaveBeenCalled();
});
test('cancel while begin is pending acknowledges no SDK call was started', async () => {
  const n = native(), admission = deferred<unknown>(); n.beginCameraProof.mockReturnValueOnce(admission.promise);
  const run = new CameraProofRun(n), capture = jest.fn(), started = run.start(request, capture);
  run.cancel('UNMOUNT'); admission.resolve({ jobId: id, sourceSha256: sha }); await expect(started).rejects.toThrow('CAMERA_CANCELLED');
  expect(capture).not.toHaveBeenCalled(); expect(n.cancelCameraProof).toHaveBeenCalledWith(id, 'STALE_START'); expect(n.failCameraProofCapture).toHaveBeenCalledWith(id, 'CAMERA_CAPTURE_NOT_STARTED');
});
test('capture rejection, malformed callback, and native refusal settle locally without bypassing native ownership', async () => {
  const n = native(), run = new CameraProofRun(n);
  await expect(run.start(request, prepared(async () => { throw Error('SDK failed'); }))).rejects.toThrow('SDK failed');
  expect(n.failCameraProofCapture).toHaveBeenCalledWith(id, 'CAMERA_CAPTURE_REJECTED');
  await expect(run.start(request, prepared(async () => ({})))).rejects.toThrow(); expect(n.failCameraProofCapture).toHaveBeenCalledWith(id, 'CAMERA_METADATA_INVALID');
  n.processCameraProof.mockRejectedValueOnce(Error('CAMERA_METADATA_DISAGREEMENT'));
  await expect(run.start(request, prepared(async () => picture))).rejects.toThrow('CAMERA_METADATA_DISAGREEMENT');
  n.beginCameraProof.mockRejectedValueOnce(Error('CAMERA_BUSY_OR_CLOSED'));
  const capture = jest.fn(); await expect(run.start(request, prepared(capture))).rejects.toThrow('CAMERA_BUSY_OR_CLOSED'); expect(capture).not.toHaveBeenCalled();
});
test.each(['USER', 'BACKGROUND', 'UNMOUNT', 'PERMISSION_LOSS'] as const)('%s during awaited preflight acknowledges NOT_STARTED, never SDK drain', async reason => {
  const n = native(), run = new CameraProofRun(n), waiting = deferred<() => Promise<unknown>>(), entered = deferred<void>(), sdk = jest.fn(async () => picture);
  const first = run.start(request, () => { entered.resolve(undefined); return waiting.promise; }); await entered.promise; run.cancel(reason);
  waiting.resolve(sdk); await expect(first).rejects.toThrow('CAMERA_CANCELLED');
  expect(sdk).not.toHaveBeenCalled(); expect(n.processCameraProof).not.toHaveBeenCalled();
  expect(n.failCameraProofCapture).toHaveBeenCalledTimes(1); expect(n.failCameraProofCapture).toHaveBeenCalledWith(id, 'CAMERA_CAPTURE_NOT_STARTED'); expect(n.cancelCameraProof).toHaveBeenCalledTimes(1);
  await run.start(request, prepared(sdk)); expect(sdk).toHaveBeenCalledTimes(1);
});
test('uncertain synchronous SDK invocation never acknowledges a fabricated capture return', async () => {
  const n = native(), run = new CameraProofRun(n);
  await expect(run.start(request, prepared(() => { throw Error('bridge invocation uncertain'); }))).rejects.toThrow('CAMERA_CAPTURE_DRAIN_UNKNOWN');
  expect(n.failCameraProofCapture).not.toHaveBeenCalled(); expect(n.processCameraProof).not.toHaveBeenCalled(); expect(n.cancelCameraProof).toHaveBeenCalledWith(id, 'CAPTURE_DRAIN_UNKNOWN');
});
test('a failed preflight is NOT_STARTED; no SDK invocation occurs', async () => {
  const n = native(), run = new CameraProofRun(n);
  await expect(run.start(request, async () => { throw Error('permission unavailable'); })).rejects.toThrow('permission unavailable');
  expect(n.failCameraProofCapture).toHaveBeenCalledWith(id, 'CAMERA_CAPTURE_NOT_STARTED'); expect(n.processCameraProof).not.toHaveBeenCalled();
});
