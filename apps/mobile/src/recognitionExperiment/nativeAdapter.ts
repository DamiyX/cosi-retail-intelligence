import type { CameraRecoveryNative } from './cameraMatrixRecovery';
import type { OrientationNative } from './cameraOrientationProof';
import type { MatrixNative } from './cameraMatrixProof';
import { requireNativeModule } from 'expo-modules-core';
import { fixtureIds, validateProbe, type FixtureId, type ProbeResult } from './generatedProbe';
import { validateImageProbe, validateImageExport, validateImageRecovery, type ImageProbeResult, type ImageRecovery } from './imageProbes';
import { validatePrivateResult, validatePrivateState, validatePrivateImport, validatePrivateExport, validatePrivateOfflineGate, type PrivateResult } from './phonePortability';
import type { CameraProofNative } from './cameraProof';
import { validateSavedCameraEvidenceExport, type SavedCameraEvidenceExportNative } from './cameraEvidenceExport';
import { stationaryStatus, stationaryExport, type StationaryNative } from './cameraStationary';

export const inspectStationaryChart = async () => stationaryStatus(await requireNativeModule<StationaryNative>('RecognitionExperiment').stationaryChartStatus());
export const exportStationaryChart = async () => stationaryExport(await requireNativeModule<StationaryNative>('RecognitionExperiment').exportStationaryChartEvidence());
export const cancelStationaryChartExport = () => requireNativeModule<StationaryNative>('RecognitionExperiment').cancelStationaryChartEvidenceExport();

export const exportSavedCameraEvidence = async () => validateSavedCameraEvidenceExport(await requireNativeModule<SavedCameraEvidenceExportNative>('RecognitionExperiment').exportSavedCameraEvidence());
export const cancelSavedCameraEvidenceExport = () => requireNativeModule<SavedCameraEvidenceExportNative>('RecognitionExperiment').cancelSavedCameraEvidenceExport();

// No camera library is imported/evaluated here. Native gates the camera-only variant.
export const cameraProofNative: CameraProofNative = {
  beginStationaryChartProof: (request, acknowledgement) => requireNativeModule<StationaryNative>('RecognitionExperiment').beginStationaryChartProof(request, acknowledgement),
  beginCameraProof: request => requireNativeModule<CameraProofNative>('RecognitionExperiment').beginCameraProof(request),
  cancelCameraProof: (id, reason) => requireNativeModule<CameraProofNative>('RecognitionExperiment').cancelCameraProof(id, reason),
  failCameraProofCapture: (id, code) => requireNativeModule<CameraProofNative>('RecognitionExperiment').failCameraProofCapture(id, code),
  processCameraProof: (id, metadata) => requireNativeModule<CameraProofNative>('RecognitionExperiment').processCameraProof(id, metadata),
  cameraProofStatus: () => requireNativeModule<CameraProofNative>('RecognitionExperiment').cameraProofStatus(),
  recoverCameraProof: () => requireNativeModule<CameraProofNative>('RecognitionExperiment').recoverCameraProof(),
  recordCameraProofRefusal: code => requireNativeModule<CameraProofNative>('RecognitionExperiment').recordCameraProofRefusal(code),
  cameraProofNumerical: id => requireNativeModule<CameraProofNative>('RecognitionExperiment').cameraProofNumerical(id),
};

interface NativeProbe {
  checkPrivateOfflineGate(): Promise<unknown>;
  importPrivatePortability(): Promise<unknown>;
  recoverPrivatePortability(): Promise<unknown>;
  runPrivatePortability(offlineConfirmed: boolean): Promise<unknown>;
  cancelPrivatePortability(): Promise<void>;
  exportPrivatePortability(): Promise<unknown>;
  runGeneratedProbe(id: FixtureId): Promise<unknown>;
  runGeneratedImageProbes(id: 'all-generated-v1'): Promise<unknown>;
  exportGeneratedImageEvidence(): Promise<unknown>;
  recoverGeneratedImageEvidence(): Promise<unknown>;
  addListener(name: string, listener: (progress: { completed: number; total: number }) => void): { remove(): void };
}
async function privateOperation<T>(work: (native: NativeProbe) => Promise<T>): Promise<T> {
  if (busy) throw new Error('One operation is already running.');
  busy = true;
  try { return await work(requireNativeModule<NativeProbe>('RecognitionExperiment')); }
  finally { busy = false; }
}
export const importPrivatePortability = () => privateOperation(async n => validatePrivateImport(await n.importPrivatePortability()));
export const checkPrivateOfflineGate = () => privateOperation(async n => validatePrivateOfflineGate(await n.checkPrivateOfflineGate()));
export const recoverPrivatePortability = () => privateOperation(async n => validatePrivateState(await n.recoverPrivatePortability()));
export const cancelPrivatePortability = () => requireNativeModule<NativeProbe>('RecognitionExperiment').cancelPrivatePortability();
export const exportPrivatePortability = (expected: PrivateResult) => privateOperation(async n => validatePrivateExport(await n.exportPrivatePortability(), expected));
export function runPrivatePortability(confirmed: boolean, progress: (completed: number) => void) {
  if (!confirmed) return Promise.reject(new Error('Confirm device offline state before replay.'));
  return privateOperation(async n => {
    let last = 0;
    const listener = n.addListener('onPrivatePortabilityProgress', p => {
      if (p.total === 80 && Number.isInteger(p.completed) && p.completed >= last && p.completed <= 80) { last = p.completed; progress(last); }
    });
    try { return validatePrivateResult(await n.runPrivatePortability(true)); }
    finally { listener.remove(); }
  });
}
export async function recoverGeneratedImageEvidence(): Promise<ImageRecovery> {
  if (busy) throw new Error('One probe is already running.');
  busy = true;
  try {
    const native = requireNativeModule<NativeProbe>('RecognitionExperiment');
    return validateImageRecovery(await native.recoverGeneratedImageEvidence());
  } finally { busy = false; }
}
let busy = false;
export async function runGeneratedProbe(id: FixtureId): Promise<ProbeResult> {
  if (!fixtureIds.includes(id)) throw new Error('Invalid generated fixture ID.');
  if (busy) throw new Error('One probe is already running.');
  busy = true;
  try {
    const native = requireNativeModule<NativeProbe>('RecognitionExperiment');
    return validateProbe(await native.runGeneratedProbe(id), id);
  } finally { busy = false; }
}
export async function runGeneratedImageProbes(progress: (completed: number) => void): Promise<ImageProbeResult> {
  if (busy) throw new Error('One probe is already running.');
  busy = true;
  let subscription: { remove(): void } | undefined;
  try {
    const native = requireNativeModule<NativeProbe>('RecognitionExperiment');
    let last = 0;
    subscription = native.addListener('onGeneratedImageProgress', p => {
      if (p.total === 42 && Number.isInteger(p.completed) && p.completed >= last && p.completed <= 42) {
        last = p.completed; progress(last);
      }
    });
    return validateImageProbe(await native.runGeneratedImageProbes('all-generated-v1'));
  } finally { subscription?.remove(); busy = false; }
}
export async function exportGeneratedImageEvidence(expected: ImageProbeResult) {
  validateImageProbe(expected);
  if (busy) throw new Error('One probe is already running.');
  busy = true;
  try {
    const native = requireNativeModule<NativeProbe>('RecognitionExperiment');
    return validateImageExport(await native.exportGeneratedImageEvidence(), expected);
  } finally { busy = false; }
}

// Finite matrix adapter: no native effect occurs at import.
export const cameraMatrixNative: MatrixNative = {
  inspectMatrixProof: () => requireNativeModule<MatrixNative>('RecognitionExperiment').inspectMatrixProof(),
  observeMatrixPermission: (id, previewReady) => requireNativeModule<MatrixNative>('RecognitionExperiment').observeMatrixPermission(id, previewReady),
  beginMatrixCase: (id, request, nonce) => requireNativeModule<MatrixNative>('RecognitionExperiment').beginMatrixCase(id, request, nonce),
  matrixCaptureInvoked: (job, at) => requireNativeModule<MatrixNative>('RecognitionExperiment').matrixCaptureInvoked(job, at),
  matrixCapturePhase: (job, phase) => requireNativeModule<MatrixNative>('RecognitionExperiment').matrixCapturePhase(job, phase),
  recoverMatrixProof: () => requireNativeModule<MatrixNative>('RecognitionExperiment').recoverMatrixProof(),
  sealMatrixRun: () => requireNativeModule<MatrixNative>('RecognitionExperiment').sealMatrixRun(),
  exportMatrixEvidence: () => requireNativeModule<MatrixNative>('RecognitionExperiment').exportMatrixEvidence(),
  cancelMatrixEvidenceExport: () => requireNativeModule<MatrixNative>('RecognitionExperiment').cancelMatrixEvidenceExport(),
};

// Native Activity handles result delivery and durable ownership independently of this module.
export const cameraRecoveryNative: CameraRecoveryNative = {
  openP203Recovery: fixture => requireNativeModule<CameraRecoveryNative>('RecognitionExperiment').openP203Recovery(fixture),
  p203RecoveryStatus: fixture => requireNativeModule<CameraRecoveryNative>('RecognitionExperiment').p203RecoveryStatus(fixture),
};

// Separate fixed namespace; default camera/recovery routes are unaffected until explicit V2 opt-in.
export const cameraOrientationNative: OrientationNative = {
  inspectOrientationProof: () => requireNativeModule<OrientationNative>('RecognitionExperiment').inspectOrientationProof(),
  beginOrientationCase: (id, request, nonce) => requireNativeModule<OrientationNative>('RecognitionExperiment').beginOrientationCase(id, request, nonce),
  cancelOrientationProof: (id, reason) => requireNativeModule<OrientationNative>('RecognitionExperiment').cancelOrientationProof(id, reason),
  failOrientationCapture: (id, code) => requireNativeModule<OrientationNative>('RecognitionExperiment').failOrientationCapture(id, code),
  processOrientationProof: (id, metadata) => requireNativeModule<OrientationNative>('RecognitionExperiment').processOrientationProof(id, metadata),
  sealOrientationRun: () => requireNativeModule<OrientationNative>('RecognitionExperiment').sealOrientationRun(),
  openOrientationExport: prefix => requireNativeModule<OrientationNative>('RecognitionExperiment').openOrientationExport(prefix),
  orientationExportStatus: prefix => requireNativeModule<OrientationNative>('RecognitionExperiment').orientationExportStatus(prefix),
};

/** Source-only native seam refuses until exact retention/owner-release binding exists. */
export const openCaptureDiagnostic = () => requireNativeModule<{ openCaptureDiagnostic(): Promise<unknown> }>('RecognitionExperiment').openCaptureDiagnostic();

export const captureDiagnosticSnapshot = () => requireNativeModule<{ captureDiagnosticSnapshot(): Promise<unknown> }>('RecognitionExperiment').captureDiagnosticSnapshot();

/** Metadata-only build. Returns no private bytes or capture/recovery authority. */
export const captureDiagnosticSetupSnapshot = () => requireNativeModule<{ captureDiagnosticSetupSnapshot(): Promise<unknown> }>('RecognitionExperiment').captureDiagnosticSetupSnapshot();

export const openGraphicsEntryProbe = () => requireNativeModule<{ openGraphicsEntryProbe(): Promise<unknown> }>('RecognitionExperiment').openGraphicsEntryProbe();
export const graphicsEntryMetadata = () => requireNativeModule<{ graphicsEntryMetadata(): Promise<string> }>('RecognitionExperiment').graphicsEntryMetadata();
