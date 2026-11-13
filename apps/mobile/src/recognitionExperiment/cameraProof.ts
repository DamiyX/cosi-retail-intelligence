/** One-shot protocol and receipt validation. No camera/module/file effects at import. */
import { STATIONARY_ACK, STATIONARY_JOB } from './cameraStationary';
import { ORIENTATION_RECIPE, ORIENTATION_RECIPE_SHA256, validateOrientationGeometry } from './cameraOrientationGeometry';
export interface CameraRequest { reportedWidth: number; reportedHeight: number; previewWidth: number; previewHeight: number; layout: 'A' | 'B'; contentMode: 'FILL' | 'FIT' }
export interface CameraTicket { jobId: string; sourceSha256: string; profileVersion?: 2 }
export interface CameraProofNative {
  beginCameraProof(request: string): Promise<unknown>;
  cancelCameraProof(id: string, reason: string): Promise<unknown>;
  failCameraProofCapture(id: string, code: string): Promise<unknown>;
  processCameraProof(id: string, metadata: string): Promise<unknown>;
  cameraProofStatus(): Promise<unknown>;
  recoverCameraProof(): Promise<unknown>;
  recordCameraProofRefusal(code: string): Promise<unknown>;
  cameraProofNumerical(id: string): Promise<unknown>;
  beginStationaryChartProof?(request: string, acknowledgement: string): Promise<unknown>;
}
const hash = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(v);
const record = (v: unknown): Record<string, unknown> => { if (!v || typeof v !== 'object' || Array.isArray(v)) throw Error('CAMERA_RESULT_OBJECT'); return v as Record<string, unknown>; };
const positive = (v: unknown, max: number): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v > 0 && v <= max;
/** Native bridge messages may contain paths; expose only a bounded diagnostic code. */
export function cameraProofErrorCode(error: unknown): string {
  const code = error !== null && typeof error === 'object' && 'code' in error ? error.code : undefined;
  const message = error instanceof Error ? error.message : undefined;
  return [code, message].find((value): value is string => typeof value === 'string' && /^CAMERA_[A-Z0-9_]{1,90}$/.test(value)) ?? 'CAMERA_OPERATION_FAILED';
}
export function choosePictureSize(sizes: string[]) {
  if (!Array.isArray(sizes) || sizes.length > 512) throw Error('CAMERA_SIZE_LIST');
  const valid = sizes.flatMap(size => {
    if (typeof size !== 'string' || !/^[1-9]\d{0,4}x[1-9]\d{0,4}$/.test(size)) return [];
    const [width, height] = size.split('x').map(Number);
    return width * height <= 4_000_000 ? [{ size, width, height }] : [];
  }).sort((a, b) => b.width * b.height - a.width * a.height || b.width - a.width || b.height - a.height);
  if (!valid.length) throw Error('CAMERA_NO_BOUNDED_SIZE'); return valid[0];
}
export function ticket(value: unknown): CameraTicket {
  const t = record(value); if (!uuid(t.jobId) || !hash(t.sourceSha256)) throw Error('CAMERA_TICKET_INVALID');
  if (t.profileVersion !== undefined && t.profileVersion !== 2) throw Error('CAMERA_TICKET_PROFILE');
  return { jobId: t.jobId, sourceSha256: t.sourceSha256, ...(t.profileVersion === 2 ? { profileVersion: 2 as const } : {}) };
}
export function captureMetadata(value: unknown, expected?: CameraTicket) {
  const p = record(value), exif = p.exif && typeof p.exif === 'object' ? record(p.exif) : {};
  // Preserve SDK -1/unknown observations for native refusal evidence, never infer them.
  const observedInteger = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= -1 && n <= 2147483647;
  const orientation = exif.Orientation ?? 0;
  if (typeof p.uri !== 'string' || !p.uri.startsWith('file:///') || p.uri.length > 2048 || !observedInteger(p.width) || !observedInteger(p.height) || !observedInteger(orientation)) throw Error('CAMERA_METADATA_INVALID');
  if (expected?.profileVersion === 2) {
    if (!uuid(p.cosiGeometryToken)) throw Error('CAMERA_NATIVE_GEOMETRY_TOKEN');
    return { uri: p.uri, width: p.width, height: p.height, orientation, geometryToken: p.cosiGeometryToken };
  }
  return { uri: p.uri, width: p.width, height: p.height, orientation };
}
export interface CameraReceipt {
  jobId: string; sourceSha256: string; jpegSha256: string; tensorSha256: string;
  rawVector: number[]; normalizedVector: number[]; geometryStatus: 'INCONCLUSIVE';
  width: number; height: number; effectiveBox: number[]; [key: string]: unknown;
}
export function validateCameraReceipt(json: unknown, expected: CameraTicket): CameraReceipt {
  if (typeof json !== 'string' || json.length > 65536) throw Error('CAMERA_RECEIPT_BOUND');
  const p = record(JSON.parse(json));
  const v2 = expected.profileVersion === 2;
  if (p.schemaVersion !== (v2 ? 2 : 1) || p.kind !== 'CAMERA_PROOF_NUMERICAL' || p.jobId !== expected.jobId || p.sourceSha256 !== expected.sourceSha256 || p.geometryStatus !== 'INCONCLUSIVE' || p.physicalFovProven !== false || p.autoAccept !== false || p.cameraProofAccepted !== false || p.sdkHardCap !== false || p.sdkPeakKnown !== false || p.sensorExposureTimeKnown !== false || p.runtime !== 'FROM_APPLICATION_ONLY' || p.threads !== 1 || p.xnnpack !== false || p.gpu !== false || p.nnapi !== false) throw Error('CAMERA_RECEIPT_BINDING');
  for (const key of ['sourceSha256', 'recipeSha256', 'jpegSha256', 'roiRgbSha256', 'tensorSha256', 'modelSha256', 'previewSha256', 'rawVectorSha256', 'normalizedVectorSha256']) if (!hash(p[key])) throw Error('CAMERA_RECEIPT_HASH');
  if (p.recipeSha256 !== (v2 ? ORIENTATION_RECIPE_SHA256 : '76142a4e3bada43fe6f91fe295cfc624df4b1157cf92dd7ae680bc236bc15522')) throw Error('CAMERA_RECIPE');
  if (p.modelSha256 !== 'bbbb4c51a55a53905af1daec995ca1aae355046f8839bb8c9f5ce9271394bc40' || p.recipe !== (v2 ? ORIENTATION_RECIPE : 'camera-android-jpeg-exif-roi-center-bilinear-u8-gray128-rgb224-f32-div255-v1')) throw Error('CAMERA_RECIPE');
  if (!positive(p.width, 4_000_000) || !positive(p.height, 4_000_000) || p.width * p.height > 4_000_000 || !positive(p.orientation, 8) || !positive(p.jpegBytes, 12 * 1024 * 1024)) throw Error('CAMERA_RECEIPT_DIMENSIONS');
  const w = p.orientation >= 5 ? p.height : p.width, h = p.orientation >= 5 ? p.width : p.height;
  if (!Array.isArray(p.effectiveBox) || p.effectiveBox.length !== 4 || p.effectiveBox.some(n => !Number.isSafeInteger(n)) || p.effectiveBox[0] < 0 || p.effectiveBox[1] < 0 || p.effectiveBox[2] > w || p.effectiveBox[3] > h || p.effectiveBox[0] >= p.effectiveBox[2] || p.effectiveBox[1] >= p.effectiveBox[3]) throw Error('CAMERA_RECEIPT_ROI');
  if (p.roiFormat !== 'upright-half-open-row-major-rgb-u8-v1' || p.roiRgbBytes !== (p.effectiveBox[2] - p.effectiveBox[0]) * (p.effectiveBox[3] - p.effectiveBox[1]) * 3) throw Error('CAMERA_RECEIPT_ROI');
  for (const key of ['rawVector', 'normalizedVector']) if (!Array.isArray(p[key]) || p[key].length !== 1024 || p[key].some(n => typeof n !== 'number' || !Number.isFinite(n))) throw Error('CAMERA_RECEIPT_VECTOR');
  const raw = p.rawVector as number[], normalized = p.normalizedVector as number[], sum = raw.reduce((n, v) => n + v * v, 0), norm = Math.sqrt(sum);
  if (!Number.isFinite(sum) || sum <= 0 || typeof p.rawNormSquared !== 'number' || Math.abs(p.rawNormSquared - sum) > Math.max(1, sum) * 1e-6 || normalized.some((v, i) => Math.abs(v - Math.fround(raw[i] / norm)) > 1e-6)) throw Error('CAMERA_RECEIPT_NORM');
  for (const key of ['inferenceMs', 'requestToReceiptMs', 'sdkObservedCacheBytes']) if (typeof p[key] !== 'number' || !Number.isFinite(p[key]) || p[key] < 0) throw Error('CAMERA_RECEIPT_TIMING');
  if (Object.keys(p).some(k => /uri|path|exif/i.test(k))) throw Error('CAMERA_NUMERICAL_EXPORT_FIELDS');
  if (v2) { if (Number(p.jpegBytes) > 10 * 1024 * 1024) throw Error('CAMERA_RECEIPT_DIMENSIONS'); validateOrientationGeometry(p, expected.jobId); }
  return p as unknown as CameraReceipt;
}
export class CameraProofRun {
  private current: CameraTicket | null = null;
  private invalid = false;
  private cancellation: Promise<unknown> | null = null;
  private generation = 0;
  running = false;
  constructor(private native: CameraProofNative) {}
  cancel(reason: 'USER' | 'BACKGROUND' | 'UNMOUNT' | 'PERMISSION_LOSS') {
    if (this.invalid || !this.running) return this.cancellation;
    this.invalid = true;
    if (this.current) this.cancellation = this.native.cancelCameraProof(this.current.jobId, reason).catch(() => { /* Unknown drain remains owned. */ });
    return this.cancellation;
  }
  /** Preflight cannot start capture: it returns the SDK operation for this run to invoke. */
  async start(request: CameraRequest, prepare: (ticket: CameraTicket) => Promise<() => Promise<unknown>>) {
    return this.startOwned(request, prepare, false);
  }
  async startStationary(request: CameraRequest, prepare: () => Promise<() => Promise<unknown>>) {
    if (request.layout !== 'A' || request.contentMode !== 'FILL') throw Error('CAMERA_C8_LAYOUT');
    return this.startOwned(request, prepare, true);
  }
  private async startOwned(request: CameraRequest, prepare: (ticket: CameraTicket) => Promise<() => Promise<unknown>>, stationary: boolean) {
    if (this.running) throw Error('CAMERA_BUSY'); this.running = true; this.invalid = false; this.cancellation = null;
    const generation = ++this.generation;
    let t: CameraTicket | null = null;
    try {
      try {
        t = ticket(await (stationary ? this.native.beginStationaryChartProof?.(JSON.stringify(request), STATIONARY_ACK) : this.native.beginCameraProof(JSON.stringify(request))));
        if (stationary && t.jobId !== STATIONARY_JOB) throw Error('CAMERA_C8_JOB');
      }
      catch (cause) { throw Object.assign(Error(cameraProofErrorCode(cause)), { cause }); }
      this.current = t;
      if (this.invalid) { await this.native.cancelCameraProof(t.jobId, 'STALE_START').catch(() => {}); await this.native.failCameraProofCapture(t.jobId, 'CAMERA_CAPTURE_NOT_STARTED'); throw Error('CAMERA_CANCELLED'); }
      let capture: () => Promise<unknown>;
      try {
        capture = await prepare(t);
        if (this.invalid || this.current !== t || generation !== this.generation) throw Error('CAMERA_CANCELLED');
        if (typeof capture !== 'function') throw Error('CAMERA_PREFLIGHT_INVALID');
      } catch (e) { await this.native.failCameraProofCapture(t.jobId, 'CAMERA_CAPTURE_NOT_STARTED'); throw e; }
      // No await is allowed between the authority check above and the actual invocation.
      let outstanding: Promise<unknown>;
      try {
        outstanding = capture();
        if (!outstanding || typeof outstanding.then !== 'function') throw Error('CAMERA_CAPTURE_PROMISE_UNKNOWN');
      } catch {
        // A throwing bridge invocation may have started work. Do not invent its drain.
        if (!this.invalid) { this.invalid = true; void this.native.cancelCameraProof(t.jobId, 'CAPTURE_DRAIN_UNKNOWN').catch(() => {}); }
        throw Error('CAMERA_CAPTURE_DRAIN_UNKNOWN');
      }
      let picture: unknown;
      try { picture = await outstanding; }
      catch (e) {
        if (t.profileVersion === 2 && cameraProofErrorCode(e) === 'CAMERA_CAPTURE_DRAIN_UNKNOWN') {
          await this.native.cancelCameraProof(t.jobId, 'CAPTURE_DRAIN_UNKNOWN').catch(() => {});
          throw e;
        }
        await this.native.failCameraProofCapture(t.jobId, 'CAMERA_CAPTURE_REJECTED'); throw e;
      }
      let metadata;
      try { metadata = captureMetadata(picture, t); }
      catch (e) { await this.native.failCameraProofCapture(t.jobId, 'CAMERA_METADATA_INVALID'); throw e; }
      // Even an invalidated successful callback must hand off actual drain. Native rejects publication.
      const result = record(await this.native.processCameraProof(t.jobId, JSON.stringify(metadata)));
      if (this.invalid) throw Error('CAMERA_CANCELLED');
      const receipt = validateCameraReceipt(result.receiptJson, t);
      if (typeof result.previewUri !== 'string' || !result.previewUri.startsWith('file:///') || !result.previewUri.endsWith(t.jobId + '.preview.png')) throw Error('CAMERA_PREVIEW_URI');
      return { receipt, previewUri: result.previewUri, receiptJson: result.receiptJson as string };
    } finally {
      // Local UI settlement never calls native release. Native still owns uncertain drain.
      this.current = null; this.running = false;
    }
  }
}
