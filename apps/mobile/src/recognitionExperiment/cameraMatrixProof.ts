import { CameraProofRun, type CameraProofNative, type CameraRequest, ticket } from './cameraProof';
export const MATRIX_RUN = 'p203-matrix-20261023-c1-r2';
export const MATRIX_FILENAME = 'p203-matrix-20261023-c1-r1.zip';
export const MATRIX_CASES = ['L01-USER-CANCEL', 'L02-BACKGROUND', 'L03-VIEW-UNMOUNT', 'L04-PERMISSION-LOSS', 'M00-A000', 'M01-A090', 'M02-A180', 'M03-A270', 'M04-B000', 'M05-B090', 'M06-B180', 'M07-B270'] as const;
export type MatrixCase = typeof MATRIX_CASES[number];
export type MatrixAction = 'USER' | 'BACKGROUND' | 'UNMOUNT' | 'PERMISSION_LOSS';
export interface MatrixRequest { camera: CameraRequest; previewRectPhysical: { left: number; top: number; right: number; bottom: number }; viewGeneration: number }
export interface MatrixNative {
  inspectMatrixProof(): Promise<unknown>;
  observeMatrixPermission(id: string, previewReady: boolean): Promise<unknown>;
  beginMatrixCase(id: string, request: string, nonce: string): Promise<unknown>;
  matrixCaptureInvoked(job: string, at: number): Promise<unknown>;
  matrixCapturePhase(job: string, phase: string): Promise<unknown>;
  recoverMatrixProof(): Promise<unknown>;
  sealMatrixRun(): Promise<unknown>;
  exportMatrixEvidence(): Promise<unknown>;
  cancelMatrixEvidenceExport(): Promise<unknown>;
}
export interface MatrixStatus { kind: 'CAMERA_MATRIX_STATUS'; run: string; next: string; readinessNonce: string | null; idle: boolean; exportConsumed: boolean; [key: string]: unknown }
export function matrixStatus(value: unknown): MatrixStatus {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('CAMERA_MATRIX_STATUS');
  const s = value as Record<string, unknown>;
  if (s.kind !== 'CAMERA_MATRIX_STATUS' || s.run !== MATRIX_RUN || typeof s.next !== 'string' || ![...MATRIX_CASES, 'D01-DENIED', 'D02-GRANTED-RESTORED', 'D03-RESTORED-AFTER-L04', 'UNRESOLVED', 'STOP', 'COMPLETE', 'SEALED'].includes(s.next) || typeof s.idle !== 'boolean' || typeof s.exportConsumed !== 'boolean' || !(s.readinessNonce === null || typeof s.readinessNonce === 'string' && /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(s.readinessNonce))) throw Error('CAMERA_MATRIX_STATUS');
  return s as unknown as MatrixStatus;
}
export function matrixCase(value: string): value is MatrixCase { return (MATRIX_CASES as readonly string[]).includes(value); }
export function matrixAction(id: MatrixCase): MatrixAction | null { const i = MATRIX_CASES.indexOf(id); return i < 4 ? (['USER', 'BACKGROUND', 'UNMOUNT', 'PERMISSION_LOSS'] as const)[i] : null; }
/** Real SDK settlement is always awaited. A barrier deadline invalidates, never releases native ownership. */
export class CameraMatrixRun {
  private proof: CameraProofRun | null = null;
  private active: MatrixCase | null = null;
  private release: (() => void) | null = null;
  private action: MatrixAction | 'TIMEOUT' | null = null;
  private actionMs = 0;
  private cancellation: Promise<unknown> | null = null;
  private settled = false;
  private pendingAtAction = false;
  private timeout: ReturnType<typeof setTimeout> | null = null;
  constructor(private matrix: MatrixNative, private native: CameraProofNative, private now = () => Math.floor(performance.now())) {}
  get running() { return this.proof?.running === true; }
  boundary(reason: MatrixAction) {
    this.cancellation = this.proof?.cancel(reason) ?? this.cancellation;
    if (this.active && reason === matrixAction(this.active) && !this.action) {
      this.action = reason; this.actionMs = this.now(); this.pendingAtAction = !this.settled; this.release?.();
    }
  }
  async start(id: MatrixCase, request: MatrixRequest, nonce: string, prepare: () => Promise<() => Promise<unknown>>) {
    if (this.running) throw Error('CAMERA_BUSY');
    this.active = id; this.action = null; this.settled = false; this.release = null;
    let job: string | null = null, matrixSource: unknown;
    const adapter: CameraProofNative = { ...this.native, beginCameraProof: async () => {
      const raw = await this.matrix.beginMatrixCase(id, JSON.stringify(request), nonce);
      const t = ticket(raw); const extra = raw as Record<string, unknown>;
      if (extra.caseId !== id || typeof extra.matrixSource !== 'string' || !/^[a-f0-9]{64}$/.test(extra.matrixSource)) throw Error('CAMERA_MATRIX_TICKET');
      job = t.jobId; matrixSource = extra.matrixSource; return raw;
    } };
    this.proof = new CameraProofRun(adapter);
    try {
      const result = await this.proof.start(request.camera, async () => {
        const take = await prepare();
        return () => {
          const invokedMs = this.now();
          const outstanding = take(); // no await between the current-view check and SDK invocation
          if (!outstanding || typeof outstanding.then !== 'function') throw Error('CAMERA_CAPTURE_DRAIN_UNKNOWN');
          if (!matrixAction(id)) return outstanding;
          const invoked = this.matrix.matrixCaptureInvoked(job!, invokedMs);
          const actual = outstanding.then(value => { this.settled = true; return { value, failure: null }; }, failure => { this.settled = true; return { value: undefined, failure: { cause: failure } }; }).then(s => ({ ...s, settledMs: this.now() }));
          const held = new Promise<void>(resolve => { this.release = resolve; if (this.action) resolve(); });
          this.timeout = setTimeout(() => {
            if (!this.action) { this.action = 'TIMEOUT'; this.actionMs = this.now(); this.pendingAtAction = !this.settled; this.cancellation = this.proof?.cancel('USER') ?? this.cancellation; this.release?.(); }
          }, 120_000);
          return (async () => {
            let journalFailure: unknown;
            try { await invoked; } catch (error) { journalFailure = error; }
            const actualResult = await actual; // never treat a journal/timer error as SDK drain
            await held;
            if (this.timeout) clearTimeout(this.timeout);
            if (journalFailure) throw journalFailure;
            if (this.cancellation) await this.cancellation;
            await this.matrix.matrixCapturePhase(job!, JSON.stringify({ action: this.action, actionMs: this.actionMs, settledMs: actualResult.settledMs, pendingAtAction: this.pendingAtAction, outcome: actualResult.failure ? 'REJECTED' : 'FULFILLED' }));
            if (actualResult.failure) throw actualResult.failure.cause;
            return actualResult.value;
          })();
        };
      });
      if (result.receipt.jpegBytes as number > 10 * 1024 * 1024 || result.receipt.matrixRun !== MATRIX_RUN || result.receipt.matrixCase !== id || result.receipt.matrixSource !== matrixSource) throw Error('CAMERA_MATRIX_RECEIPT');
      return result;
    } finally { if (this.timeout) clearTimeout(this.timeout); this.release = null; this.active = null; }
  }
}
