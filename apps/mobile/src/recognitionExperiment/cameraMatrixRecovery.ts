/** Recovery bridge owns launch and read-only status, never picker/write promises or image bytes. */
export interface CameraRecoveryNative {
  openP203Recovery(fixture: boolean): Promise<unknown>;
  p203RecoveryStatus(fixture: boolean): Promise<unknown>;
}
export interface CameraRecoveryStatus {
  kind: 'P203_EXPORT_RECOVERY_STATUS'; lane: 'ACTUAL' | 'FIXTURE';
  state: 'AVAILABLE' | 'EMPTY' | 'OWNER' | 'SELECTION' | 'DESTINATION' | 'WRITE' | 'VERIFIED' | 'TERMINAL' | 'BLOCKED' | 'BUSY';
  [key: string]: unknown;
}
export function recoveryStatus(value: unknown): CameraRecoveryStatus {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('CAMERA_RECOVERY_STATUS');
  const v = value as Record<string, unknown>;
  if (v.kind !== 'P203_EXPORT_RECOVERY_STATUS' || !['ACTUAL', 'FIXTURE'].includes(v.lane as string) || !['AVAILABLE', 'EMPTY', 'OWNER', 'SELECTION', 'DESTINATION', 'WRITE', 'VERIFIED', 'TERMINAL', 'BLOCKED', 'BUSY'].includes(v.state as string)) throw Error('CAMERA_RECOVERY_STATUS');
  return v as unknown as CameraRecoveryStatus;
}
