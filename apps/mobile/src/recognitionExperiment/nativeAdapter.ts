import { requireNativeModule } from 'expo-modules-core';
import { fixtureIds, validateProbe, type FixtureId, type ProbeResult } from './generatedProbe';
import { validateImageProbe, validateImageExport, validateImageRecovery, type ImageProbeResult, type ImageRecovery } from './imageProbes';
import { validatePrivateResult, validatePrivateState, validatePrivateImport, validatePrivateExport, validatePrivateOfflineGate, type PrivateResult } from './phonePortability';
import type { CameraProofNative } from './cameraProof';

// No camera library is imported/evaluated here. Native gates the camera-only variant.
export const cameraProofNative: CameraProofNative = {
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
