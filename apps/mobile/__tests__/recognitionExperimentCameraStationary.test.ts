import { CameraProofRun, type CameraProofNative } from '../src/recognitionExperiment/cameraProof';
import { stationaryStatus, stationaryExport, STATIONARY_ACK, STATIONARY_JOB, STATIONARY_TARGET, STATIONARY_TARGET_SHA } from '../src/recognitionExperiment/cameraStationary';
const status = { kind: 'STATIONARY_SLOT_STATUS', jobId: STATIONARY_JOB, targetId: STATIONARY_TARGET, targetSha256: STATIONARY_TARGET_SHA, state: 'AVAILABLE', captureAvailable: true, exportEligible: false, geometryStatus: 'INCONCLUSIVE' };
test('slot available/consumed state is bounded and never implies geometry proof', () => {
  expect(stationaryStatus(status).captureAvailable).toBe(true);
  expect(stationaryStatus({ ...status, state: 'CONSUMED_INCOMPLETE', captureAvailable: false }).captureAvailable).toBe(false);
});
test.each([{ jobId: 'other' }, { targetSha256: 'a'.repeat(64) }, { state: 'RETRY' }, { captureAvailable: false }, { exportEligible: true }, { geometryStatus: 'PASS' }])('rejects slot mismatch %p', bad => { expect(() => stationaryStatus({ ...status, ...bad })).toThrow('CAMERA_C8_STATUS'); });
test('export requires fixed job/target/new provenance and no durability claim', () => {
  const result = { kind: 'STATIONARY_CHART_EVIDENCE_EXPORT', jobId: STATIONARY_JOB, targetId: STATIONARY_TARGET, targetSha256: STATIONARY_TARGET_SHA, status: 'READBACK_VERIFIED', bundleBytes: 10, outputEntries: 9, bundleSha256: 'a'.repeat(64), exporterSourceIndexSha256: 'b'.repeat(64), exporterApkSha256: 'c'.repeat(64), providerDirectoryDurabilityProven: false, powerLossDurabilityProven: false };
  expect(stationaryExport(result)).toEqual(result);
  for (const bad of [{ jobId: 'other' }, { bundleBytes: 16777217 }, { powerLossDurabilityProven: true }, { targetId: 'other' }]) expect(() => stationaryExport({ ...result, ...bad })).toThrow('CAMERA_C8_EXPORT');
});
const request = { reportedWidth: 1440, reportedHeight: 1080, previewWidth: 990, previewHeight: 1100, layout: 'A' as const, contentMode: 'FILL' as const };
test('stationary admission uses fixed acknowledgement and existing NOT_STARTED drain on preflight loss', async () => {
  const begin = jest.fn(async () => ({ jobId: STATIONARY_JOB, sourceSha256: 'a'.repeat(64) }));
  const fail = jest.fn(async () => true), sdk = jest.fn();
  const native = { beginStationaryChartProof: begin, failCameraProofCapture: fail, beginCameraProof: jest.fn(), cancelCameraProof: jest.fn(async () => true) } as unknown as CameraProofNative;
  const run = new CameraProofRun(native);
  await expect(run.startStationary(request, async () => { throw Error('VIEW_LOST'); })).rejects.toThrow('VIEW_LOST');
  expect(begin).toHaveBeenCalledWith(JSON.stringify(request), STATIONARY_ACK); expect(native.beginCameraProof).not.toHaveBeenCalled(); expect(fail).toHaveBeenCalledWith(STATIONARY_JOB, 'CAMERA_CAPTURE_NOT_STARTED'); expect(sdk).not.toHaveBeenCalled();
  await expect(run.startStationary({ ...request, layout: 'B' }, async () => sdk)).rejects.toThrow('CAMERA_C8_LAYOUT'); expect(begin).toHaveBeenCalledTimes(1);
});
test('late cancelled stationary admission never invokes SDK', async () => {
  let resolve!: (value: unknown) => void;
  const native = { beginStationaryChartProof: jest.fn(() => new Promise(r => { resolve = r; })), failCameraProofCapture: jest.fn(async () => true), cancelCameraProof: jest.fn(async () => true) } as unknown as CameraProofNative;
  const prepare = jest.fn(), run = new CameraProofRun(native), pending = run.startStationary(request, prepare);
  run.cancel('BACKGROUND'); resolve({ jobId: STATIONARY_JOB, sourceSha256: 'a'.repeat(64) });
  await expect(pending).rejects.toThrow('CAMERA_CANCELLED'); expect(prepare).not.toHaveBeenCalled(); expect(native.failCameraProofCapture).toHaveBeenCalledWith(STATIONARY_JOB, 'CAMERA_CAPTURE_NOT_STARTED');
});
