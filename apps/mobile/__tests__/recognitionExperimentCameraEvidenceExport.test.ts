import { validateSavedCameraEvidenceExport, SAVED_CHART_JOB } from '../src/recognitionExperiment/cameraEvidenceExport';
const valid = { kind: 'CAMERA_SAVED_EVIDENCE_EXPORT', jobId: SAVED_CHART_JOB, status: 'READBACK_VERIFIED', bundleBytes: 1024, bundleSha256: 'a'.repeat(64), exporterSourceIndexSha256: 'b'.repeat(64), exporterApkSha256: 'c'.repeat(64), outputEntries: 9, providerDirectoryDurabilityProven: false, powerLossDurabilityProven: false };
test('accepts bounded readback result with separate exporter provenance', () => { expect(validateSavedCameraEvidenceExport(valid)).toEqual(valid); });

test('selects only the accepted A6 chart and retains the strict one MiB result bound', () => {
  expect(SAVED_CHART_JOB).toBe('21b9d32b-5f31-45ac-b453-2a261e9e9ccc');
  expect(validateSavedCameraEvidenceExport({ ...valid, bundleBytes: 1048576 }).bundleBytes).toBe(1048576);
  expect(() => validateSavedCameraEvidenceExport({ ...valid, bundleBytes: 1048577 })).toThrow('CAMERA_EXPORT_BINDING');
});

test.each(['9d763e82-2a00-42ce-9a5f-0f4b2d9fde5c', '76d28e3f-cdcd-4d1a-a86e-026e2568ce5e', 'a9d4ffa8-85cc-4145-bc5c-31a57a327f09', '78cf411b-25e1-4dc2-ac8d-80caaacb2de6'])('rejects a previously saved job %s', jobId => {
  expect(() => validateSavedCameraEvidenceExport({ ...valid, jobId })).toThrow('CAMERA_EXPORT_BINDING');
});
test.each([{ jobId: 'another' }, { bundleBytes: 0 }, { bundleBytes: 16777217 }, { bundleBytes: 1.5 }, { outputEntries: 10 }, { status: 'SUCCESS' }, { powerLossDurabilityProven: true }, { providerDirectoryDurabilityProven: true }, { exporterSourceIndexSha256: undefined }, { bundleSha256: 'bad' }])('rejects invalid result %p', invalid => { expect(() => validateSavedCameraEvidenceExport({ ...valid, ...invalid })).toThrow('CAMERA_EXPORT_BINDING'); });
