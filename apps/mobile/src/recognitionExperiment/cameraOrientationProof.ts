import { CameraProofRun, ticket, type CameraProofNative, type CameraTicket } from './cameraProof';
import type { MatrixRequest } from './cameraMatrixProof';
export const ORIENTATION_RUN = 'p203-m00-repeat-20261029-c1';
export const ORIENTATION_CASES = ['M00-A000'] as const;
export type OrientationCase = typeof ORIENTATION_CASES[number];
export interface OrientationNative {
  inspectOrientationProof(): Promise<unknown>;
  beginOrientationCase(id: string, request: string, nonce: string): Promise<unknown>;
  cancelOrientationProof(id: string, reason: string): Promise<unknown>;
  failOrientationCapture(id: string, code: string): Promise<unknown>;
  processOrientationProof(id: string, metadata: string): Promise<unknown>;
  sealOrientationRun(): Promise<unknown>;
  openOrientationExport(prefix: 0 | 1 | 8): Promise<unknown>;
  orientationExportStatus(prefix: 0 | 1 | 8): Promise<unknown>;
}
export interface OrientationStatus {
  kind: 'CAMERA_ORIENTATION_STATUS'; run: typeof ORIENTATION_RUN; next: string;
  readinessNonce: string | null; idle: boolean; firstExportVerified: boolean; generatedExportVerified: boolean; [key: string]: unknown;
}
export function orientationCase(id: string): id is OrientationCase { return (ORIENTATION_CASES as readonly string[]).includes(id); }
export function orientationStatus(value: unknown): OrientationStatus {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('CAMERA_ORIENTATION_STATUS');
  const v = value as Record<string, unknown>;
  if (v.kind !== 'CAMERA_ORIENTATION_STATUS' || v.run !== ORIENTATION_RUN || v.profileVersion !== 2 || typeof v.next !== 'string' || ![...ORIENTATION_CASES, 'STOP', 'UNRESOLVED', 'COMPLETE', 'SEALED'].includes(v.next) || typeof v.idle !== 'boolean' || typeof v.firstExportVerified !== 'boolean' || typeof v.generatedExportVerified !== 'boolean' || !(v.readinessNonce === null || typeof v.readinessNonce === 'string' && /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(v.readinessNonce))) throw Error('CAMERA_ORIENTATION_STATUS');
  return v as unknown as OrientationStatus;
}
/** Retains the shared cancellation/finalization protocol; only the fixed V2 begin/process endpoints differ. */
export class CameraOrientationRun {
  private proof: CameraProofRun | null = null;
  get running() { return this.proof?.running === true; }
  constructor(private native: OrientationNative) {}
  cancel(reason: 'USER' | 'BACKGROUND' | 'UNMOUNT' | 'PERMISSION_LOSS') { return this.proof?.cancel(reason); }
  async start(id: OrientationCase, request: MatrixRequest, nonce: string, prepare: (ticket: CameraTicket) => Promise<() => Promise<unknown>>) {
    if (this.running) throw Error('CAMERA_BUSY');
    const native = this.native;
    const adapter: CameraProofNative = {
      beginCameraProof: async () => {
        const result = await native.beginOrientationCase(id, JSON.stringify(request), nonce), t = ticket(result);
        if (t.profileVersion !== 2 || (result as Record<string, unknown>).caseId !== id) throw Error('CAMERA_ORIENTATION_TICKET');
        return result;
      },
      cancelCameraProof: (job, reason) => native.cancelOrientationProof(job, reason),
      failCameraProofCapture: (job, code) => native.failOrientationCapture(job, code),
      processCameraProof: (job, metadata) => native.processOrientationProof(job, metadata),
      cameraProofStatus: () => native.inspectOrientationProof(),
      recoverCameraProof: async () => { throw Error('CAMERA_ORIENTATION_REVIEW_INTERRUPTION'); },
      recordCameraProofRefusal: async () => { throw Error('CAMERA_ORIENTATION_NO_GENERIC_MUTATION'); },
      cameraProofNumerical: async () => { throw Error('CAMERA_ORIENTATION_INSPECT_FIXED_ROW'); },
    };
    this.proof = new CameraProofRun(adapter);
    const result = await this.proof.start(request.camera, prepare);
    if (result.receipt.schemaVersion !== 2 || result.receipt.matrixRun !== ORIENTATION_RUN || result.receipt.matrixCase !== id) throw Error('CAMERA_ORIENTATION_RECEIPT');
    return result;
  }
}
