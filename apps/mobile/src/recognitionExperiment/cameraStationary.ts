/** Fixed compiled C8 capability; acknowledgement is a human claim, never sensor attestation. */
export const STATIONARY_JOB = '76d28e3f-cdcd-4d1a-a86e-026e2568ce5e';
export const STATIONARY_TARGET = 'stationary-chart-c8-900x1200-v1';
export const STATIONARY_TARGET_SHA = '7ffd7f6fbd778405497bbfc0d2f4649281e19c33c8d8af5c626c87d71f02ef6a';
export const STATIONARY_ACK = 'SUPPORTED_PHONE_AND_FIXED_CHART_READY';
export interface StationaryNative {
  beginStationaryChartProof(request: string, acknowledgement: string): Promise<unknown>;
  stationaryChartStatus(): Promise<unknown>;
  exportStationaryChartEvidence(): Promise<unknown>;
  cancelStationaryChartEvidenceExport(): Promise<unknown>;
}
export function stationaryStatus(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('CAMERA_C8_STATUS');
  const s = value as Record<string, unknown>;
  if (s.kind !== 'STATIONARY_SLOT_STATUS' || s.jobId !== STATIONARY_JOB || s.targetId !== STATIONARY_TARGET || s.targetSha256 !== STATIONARY_TARGET_SHA
    || !['AVAILABLE', 'CAPTURE_CONSUMED', 'CONSUMED_INCOMPLETE', 'CONSUMED_EXPORT_UNCERTAIN', 'CONSUMED_EXPORT_TERMINAL'].includes(s.state as string)
    || typeof s.captureAvailable !== 'boolean' || typeof s.exportEligible !== 'boolean' || s.geometryStatus !== 'INCONCLUSIVE'
    || s.captureAvailable !== (s.state === 'AVAILABLE') || (s.exportEligible && s.state !== 'CAPTURE_CONSUMED')) throw Error('CAMERA_C8_STATUS');
  return s as typeof s & { captureAvailable: boolean; exportEligible: boolean; state: string };
}
export function stationaryExport(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('CAMERA_C8_EXPORT');
  const r = value as Record<string, unknown>;
  if (r.kind !== 'STATIONARY_CHART_EVIDENCE_EXPORT' || r.jobId !== STATIONARY_JOB || r.targetId !== STATIONARY_TARGET || r.targetSha256 !== STATIONARY_TARGET_SHA
    || r.status !== 'READBACK_VERIFIED' || r.outputEntries !== 9 || !Number.isSafeInteger(r.bundleBytes) || (r.bundleBytes as number) <= 0 || (r.bundleBytes as number) > 16777216
    || r.providerDirectoryDurabilityProven !== false || r.powerLossDurabilityProven !== false
    || ['bundleSha256', 'exporterSourceIndexSha256', 'exporterApkSha256'].some(k => typeof r[k] !== 'string' || !/^[a-f0-9]{64}$/.test(r[k] as string))) throw Error('CAMERA_C8_EXPORT');
  return r;
}
