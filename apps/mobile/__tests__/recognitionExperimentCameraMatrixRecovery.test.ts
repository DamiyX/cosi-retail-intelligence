import { recoveryStatus } from '../src/recognitionExperiment/cameraMatrixRecovery';
test('only fixed recovery lanes/stages are accepted; receipt status does not accept camera proof', () => {
  const status = { kind: 'P203_EXPORT_RECOVERY_STATUS', lane: 'ACTUAL', state: 'TERMINAL', result: { status: 'READBACK_VERIFIED', originalExportResultUnchanged: true } };
  expect(recoveryStatus(status)).toEqual(status);
  for (const invalid of [null, [], { ...status, lane: 'ANY_FILE' }, { ...status, state: 'CAPTURE' }, { ...status, kind: 'CAMERA_PROOF_NUMERICAL' }]) expect(() => recoveryStatus(invalid)).toThrow('CAMERA_RECOVERY_STATUS');
});
