import { ORIENTATION_CASES, ORIENTATION_RUN, orientationCase, orientationStatus } from '../src/recognitionExperiment/cameraOrientationProof';

describe('controlled diagnostic repeat profile', () => {
  const current = { kind: 'CAMERA_ORIENTATION_STATUS', run: ORIENTATION_RUN, profileVersion: 2, next: 'M00-A000', idle: true, firstExportVerified: false, generatedExportVerified: false, readinessNonce: null };

  it('exposes only the new diagnostic M00, leaving later row authority deferred', () => {
    expect(ORIENTATION_RUN).toBe('p203-m00-repeat-20261029-c1');
    expect(ORIENTATION_CASES).toEqual(['M00-A000']);
    expect(orientationCase('M00-A000')).toBe(true);
    expect(orientationCase('M01-A090')).toBe(false);
  });

  it('does not adopt source750 run status or its passed generated fixture', () => {
    expect(() => orientationStatus({ ...current, run: 'p203-orientation-20261028-preview-v4', generatedExportVerified: true })).toThrow('CAMERA_ORIENTATION_STATUS');
    expect(orientationStatus(current).generatedExportVerified).toBe(false);
  });

  it('preserves unresolved and stopped outcomes without presenting another row', () => {
    expect(orientationStatus({ ...current, next: 'UNRESOLVED' }).next).toBe('UNRESOLVED');
    expect(orientationStatus({ ...current, next: 'STOP' }).next).toBe('STOP');
    expect(() => orientationStatus({ ...current, next: 'M01-A090' })).toThrow('CAMERA_ORIENTATION_STATUS');
  });
});
