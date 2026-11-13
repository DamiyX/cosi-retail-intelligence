/** Fixed saved-chart export result; no file bytes or caller paths cross this bridge. */
export interface SavedCameraEvidenceExportNative {
  exportSavedCameraEvidence(): Promise<unknown>;
  cancelSavedCameraEvidenceExport(): Promise<unknown>;
}
export const SAVED_CHART_JOB = '21b9d32b-5f31-45ac-b453-2a261e9e9ccc';
export function validateSavedCameraEvidenceExport(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('CAMERA_EXPORT_RESULT');
  const r = value as Record<string, unknown>;
  if (r.kind !== 'CAMERA_SAVED_EVIDENCE_EXPORT' || r.jobId !== SAVED_CHART_JOB || r.status !== 'READBACK_VERIFIED'
    || !Number.isSafeInteger(r.bundleBytes) || (r.bundleBytes as number) <= 0 || (r.bundleBytes as number) > 1024 * 1024
    || r.outputEntries !== 9 || r.providerDirectoryDurabilityProven !== false || r.powerLossDurabilityProven !== false
    || ['bundleSha256', 'exporterSourceIndexSha256', 'exporterApkSha256'].some(k => typeof r[k] !== 'string' || !/^[a-f0-9]{64}$/.test(r[k] as string))) throw Error('CAMERA_EXPORT_BINDING');
  return r;
}
