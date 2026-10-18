import { fixtureHashes, modelSha256, validateProbe, type ProbeResult } from '../src/recognitionExperiment/generatedProbe';

function result(): ProbeResult {
  return { fixtureId: 'zero', fixtureSha256: fixtureHashes.zero, modelSha256,
    vector: Array(1024).fill(1), normSquared: 1024, inferenceMs: 1, totalMs: 2,
    runtime: 'FROM_APPLICATION_ONLY', threads: 1, xnnpack: false, nnapi: false, gpu: false };
}
test('accepts only a bounded finite output with the pinned CPU/model/fixture contract', () => {
  expect(validateProbe(result(), 'zero').vector).toHaveLength(1024);
  const mutations: Partial<ProbeResult>[] = [
    { vector: Array(1023).fill(1) }, { vector: Array(1024).fill(NaN) },
    { vector: Array(1024).fill(0), normSquared: 0 }, { modelSha256: 'other' },
    { fixtureSha256: fixtureHashes.gradient }, { normSquared: 1 },
    { inferenceMs: Infinity }, { totalMs: 0 },
  ];
  for (const mutation of mutations) expect(() => validateProbe({ ...result(), ...mutation }, 'zero')).toThrow();
});
