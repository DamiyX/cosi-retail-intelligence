import { CameraProofRun, captureMetadata, validateCameraReceipt, type CameraProofNative } from '../src/recognitionExperiment/cameraProof';
import { ORIENTATION_RECIPE, ORIENTATION_RECIPE_SHA256 } from '../src/recognitionExperiment/cameraOrientationGeometry';
import { ORIENTATION_RUN, orientationStatus } from '../src/recognitionExperiment/cameraOrientationProof';

const job = 'a0000000-0000-4000-8000-000000000001', source = 'a'.repeat(64), token = 'e0000000-0000-4000-8000-000000000001';
const ticket = { jobId: job, sourceSha256: source, profileVersion: 2 as const };
const request = { reportedWidth: 13, reportedHeight: 7, previewWidth: 246, previewHeight: 123, layout: 'A' as const, contentMode: 'FILL' as const };
function geometry() {
  const state = { generation: 3, view: 'b0000000-0000-4000-8000-000000000001', useCase: 'c0000000-0000-4000-8000-000000000001', displayId: 0, displayRotation: 0, captureTargetRotation: 0, previewTargetRotation: 0, previewWidth: 246, previewHeight: 123, previewLeft: 0, previewTop: 0, scale: 'FILL_CENTER', lens: 'BACK', cameraId: 'generated-rear-0', mirror: false, zoom: 0, sensorOrientation: 90, sensorToTarget: 90, streaming: true };
  return { version: 2, job, admission: { ...state }, callback: { ...state }, saved: { ...state }, image: { width: 13, height: 7, crop: [0, 0, 13, 7], rotationDegrees: 90, timestampNanos: '123456789', format: 256, jpegWidth: 13, jpegHeight: 7, exifOrientation: 6, jpegBytes: 70, jpegSha256: source } };
}
function receipt() {
  const vector = Array<number>(1024).fill(0);vector[0] = 1;
  return { ...ticket, schemaVersion: 2, kind: 'CAMERA_PROOF_NUMERICAL', recipe: ORIENTATION_RECIPE, recipeSha256: ORIENTATION_RECIPE_SHA256, modelSha256: 'bbbb4c51a55a53905af1daec995ca1aae355046f8839bb8c9f5ce9271394bc40', jpegSha256: source, roiRgbSha256: source, tensorSha256: source, previewSha256: source, rawVectorSha256: source, normalizedVectorSha256: source, geometryStatus: 'INCONCLUSIVE', physicalFovProven: false, autoAccept: false, cameraProofAccepted: false, sdkHardCap: false, sdkPeakKnown: false, sensorExposureTimeKnown: false, runtime: 'FROM_APPLICATION_ONLY', threads: 1, xnnpack: false, gpu: false, nnapi: false, width: 13, height: 7, requestedSize: '13x7', orientation: 6, jpegBytes: 70, effectiveBox: [1, 2, 6, 12], roiFormat: 'upright-half-open-row-major-rgb-u8-v1', roiRgbBytes: 150, rawVector: vector, normalizedVector: vector, rawNormSquared: 1, inferenceMs: 1, requestToReceiptMs: 2, sdkObservedCacheBytes: 70, previewWidth: 246, previewHeight: 123, contentMode: 'FILL', nativeGeometry: geometry(), nativeGeometrySha256: source, orientationContract: 'native-same-frame-v2' };
}
const picture = { uri: `file:///private/Camera/${token}.jpg`, width: 13, height: 7, exif: { Orientation: 6 }, cosiGeometryToken: token };
function native(): jest.Mocked<CameraProofNative> {
  return { beginCameraProof: jest.fn().mockResolvedValue(ticket), cancelCameraProof: jest.fn().mockResolvedValue(true), failCameraProofCapture: jest.fn().mockResolvedValue(true), processCameraProof: jest.fn().mockResolvedValue({ receiptJson: JSON.stringify(receipt()), previewUri: `file:///private/${job}.preview.png` }), cameraProofStatus: jest.fn(), recoverCameraProof: jest.fn(), recordCameraProofRefusal: jest.fn(), cameraProofNumerical: jest.fn() };
}
test('V2 forwards only an opaque native token; JS cannot substitute its geometry object', () => {
  expect(captureMetadata({ ...picture, cosiGeometry: { madeUp: true } }, ticket)).toEqual({ uri: picture.uri, width: 13, height: 7, orientation: 6, geometryToken: token });
  expect(() => captureMetadata({ ...picture, cosiGeometryToken: undefined }, ticket)).toThrow('CAMERA_NATIVE_GEOMETRY_TOKEN');
  expect(captureMetadata(picture)).toEqual({ uri: picture.uri, width: 13, height: 7, orientation: 6 });
});
test('new receipt is distinct from V1 and preserves inconclusive FOV/geometry', () => {
  expect(validateCameraReceipt(JSON.stringify(receipt()), ticket).cameraProofAccepted).toBe(false);
  expect(() => validateCameraReceipt(JSON.stringify(receipt()), { jobId: job, sourceSha256: source })).toThrow();
  for (const mutation of [{ schemaVersion: 1 }, { recipe: 'legacy' }, { nativeGeometry: undefined }, { nativeGeometrySha256: 'wrong' }, { cameraProofAccepted: true }, { physicalFovProven: true }]) expect(() => validateCameraReceipt(JSON.stringify({ ...receipt(), ...mutation }), ticket)).toThrow();
});
test.each(['generation', 'displayRotation', 'captureTargetRotation', 'previewTargetRotation', 'previewWidth', 'previewHeight', 'previewLeft', 'previewTop'])('rejects intermediate/stale native %s', key => {
  const value = receipt();const callback = value.nativeGeometry.callback as Record<string, unknown>;callback[key] = Number(callback[key]) + 1;
  expect(() => validateCameraReceipt(JSON.stringify(value), ticket)).toThrow();
});
test('rejects wrong-sign/double rotation, cropped buffer, wrong JPEG binding and non-rear states', () => {
  for (const mutation of [{ rotationDegrees: 270 }, { exifOrientation: 8 }, { crop: [1, 0, 13, 7] }, { jpegWidth: 7 }, { jpegSha256: 'b'.repeat(64) }, { format: 35 }]) {
    const value = receipt();Object.assign(value.nativeGeometry.image, mutation);expect(() => validateCameraReceipt(JSON.stringify(value), ticket)).toThrow();
  }
  const value = receipt();value.nativeGeometry.saved.mirror = true;expect(() => validateCameraReceipt(JSON.stringify(value), ticket)).toThrow();
});
test('binds the native ticket before one SDK invocation and hands its token to native ingress', async () => {
  const n = native(), run = new CameraProofRun(n), capture = jest.fn(async () => picture), prepare = jest.fn(async () => capture);
  await run.start(request, prepare);expect(prepare).toHaveBeenCalledWith(ticket);expect(capture).toHaveBeenCalledTimes(1);
  expect(n.processCameraProof).toHaveBeenCalledWith(job, JSON.stringify({ uri: picture.uri, width: 13, height: 7, orientation: 6, geometryToken: token }));expect(n.failCameraProofCapture).not.toHaveBeenCalled();
});
test('unknown image closure or SDK invocation retains native ownership instead of inventing drain', async () => {
  const n = native(), run = new CameraProofRun(n);const error = Object.assign(Error('closure'), { code: 'CAMERA_CAPTURE_DRAIN_UNKNOWN' });
  await expect(run.start(request, async () => () => Promise.reject(error))).rejects.toBe(error);
  expect(n.cancelCameraProof).toHaveBeenCalledWith(job, 'CAPTURE_DRAIN_UNKNOWN');expect(n.failCameraProofCapture).not.toHaveBeenCalled();expect(n.processCameraProof).not.toHaveBeenCalled();
});
test('missing native attestation fails the completed callback without model/publication dispatch', async () => {
  const n = native(), run = new CameraProofRun(n);
  await expect(run.start(request, async () => async () => ({ ...picture, cosiGeometryToken: undefined }))).rejects.toThrow('CAMERA_NATIVE_GEOMETRY_TOKEN');
  expect(n.failCameraProofCapture).toHaveBeenCalledWith(job, 'CAMERA_METADATA_INVALID');expect(n.processCameraProof).not.toHaveBeenCalled();
});
test('new status rejects legacy runs and unknown capture states', () => {
  const value = { kind: 'CAMERA_ORIENTATION_STATUS', run: ORIENTATION_RUN, profileVersion: 2, next: 'M00-A000', idle: true, readinessNonce: null, firstExportVerified: false, generatedExportVerified: false };
  expect(orientationStatus(value).next).toBe('M00-A000');expect(() => orientationStatus({ ...value, run: 'p203-orientation-20261024-v2' })).toThrow();expect(() => orientationStatus({ ...value, run: 'p203-matrix-20261023-c1-r2' })).toThrow();expect(() => orientationStatus({ ...value, next: 'ANY_PHOTO' })).toThrow();
});


test('observed advertised2336x1080 to actual1440x1080 fallback retains both sizes through ingress and receipt', async () => {
  const n = native(), run = new CameraProofRun(n), result = receipt();
  result.width = 1440;result.height = 1080;result.requestedSize = '2336x1080';
  Object.assign(result.nativeGeometry.image, { width: 1440, height: 1080, jpegWidth: 1440, jpegHeight: 1080, crop: [0, 0, 1440, 1080] });
  n.processCameraProof.mockResolvedValueOnce({ receiptJson: JSON.stringify(result), previewUri: `file:///private/${job}.preview.png` });
  const requested = { ...request, reportedWidth: 2336, reportedHeight: 1080 };
  const value = await run.start(requested, async () => async () => ({ ...picture, width: 1440, height: 1080 }));
  expect(n.beginCameraProof).toHaveBeenCalledWith(JSON.stringify(requested));
  expect(JSON.parse(n.processCameraProof.mock.calls[0][1])).toEqual({ uri: picture.uri, width: 1440, height: 1080, orientation: 6, geometryToken: token });
  expect(value.receipt.requestedSize).toBe('2336x1080');expect(value.receipt.width).toBe(1440);expect(value.receipt.height).toBe(1080);
});

test('V2 requested-size provenance is bounded independently; contradictory actual evidence still refuses', () => {
  for (const requestedSize of [undefined, '0x1080', '4001x1000', '1440x-1', '2336x1080x1']) expect(() => validateCameraReceipt(JSON.stringify({ ...receipt(), requestedSize }), ticket)).toThrow('CAMERA_GEOMETRY_REQUESTED_PROVENANCE');
  const value = receipt();value.requestedSize = '2336x1080';value.nativeGeometry.image.width = 1440;
  expect(() => validateCameraReceipt(JSON.stringify(value), ticket)).toThrow('CAMERA_GEOMETRY_IMAGE');
});
