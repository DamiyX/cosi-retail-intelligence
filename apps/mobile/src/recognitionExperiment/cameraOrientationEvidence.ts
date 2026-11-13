import { ORIENTATION_RUN, orientationCase, type OrientationStatus } from './cameraOrientationProof';

export const ORIENTATION_MARKER = 'ORIENTATION_CAPTURE_V1 ';
export type CapturePhase = 'IDLE' | 'CAPTURING' | 'PUBLISHED' | 'REFUSED' | 'UNKNOWN';
export const SETUP_PREVIEW_MS = 120_000;
export const TERMINAL_PREVIEW_MS = 30_000;
export interface CaptureError {
  code: string; stage: 'MEASURE' | 'NATIVE_CAPTURE' | 'INSPECT'; caseId: string;
  jobId: string | null; process: string | null; lifecycle: number; viewGeneration: number;
}

/** Only an immutable native terminal for this case can qualify a post frame. */
export function settledCapturePhase(status: OrientationStatus, caseId: string): CapturePhase {
  if (!status.idle || status.lastCase !== caseId || typeof status.lastJobId !== 'string') return 'UNKNOWN';
  return status.lastPublished === true ? 'PUBLISHED' : status.lastPublished === false ? 'REFUSED' : 'UNKNOWN';
}

export function orientationMarker(status: OrientationStatus | null, view: {
  phase: CapturePhase; caseId: string | null; lifecycle: number; viewGeneration: number;
  layout: 'A' | 'B'; previewMounted: boolean; busy: boolean;
  captureError?: CaptureError | null; inspectionError?: CaptureError | null;
  geometryReady?: boolean;
}) {
  const currentCase = view.caseId ?? (status && orientationCase(status.next) ? status.next : null);
  const captured = currentCase !== null && status?.lastCase === currentCase;
  return ORIENTATION_MARKER + JSON.stringify({
    version: 1, run: ORIENTATION_RUN, phase: view.phase, caseId: currentCase,
    jobId: captured ? status.lastJobId : status?.nextJobId ?? null,
    source: status?.source ?? null, apk: status?.apk ?? null, process: status?.process ?? null,
    lifecycle: view.lifecycle, viewGeneration: view.viewGeneration, layout: view.layout, previewMounted: view.previewMounted,
    busy: view.busy, idle: status?.idle === true, nonce: status?.readinessNonce ?? null,
    published: captured ? status.lastPublished ?? null : null,
    captureError: view.captureError ?? null, inspectionError: view.inspectionError ?? null,
    geometryReady: view.geometryReady === true, generatedExportVerified: status?.generatedExportVerified === true,
    firstExportVerified: status?.firstExportVerified === true,
  });
}
