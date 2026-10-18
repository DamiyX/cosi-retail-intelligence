export const fixtureIds = ['zero', 'gray128', 'gradient'] as const;
export type FixtureId = typeof fixtureIds[number];
export const modelSha256 = 'bbbb4c51a55a53905af1daec995ca1aae355046f8839bb8c9f5ce9271394bc40';
export const fixtureHashes: Record<FixtureId, string> = {
  zero: 'ad8c5f4d30e45b2a50f7f4d1f347f64d613c6fbcd92c54ca746ab077f402d8cc',
  gray128: '9f431255f59af2eddd112f42c666dff575d46dc45ab4da29e0e31c9085a54ab7',
  gradient: 'cbdae93c587d46d692e49931bdba89acc6a1f0ac606829fc544a08decae6a178',
};
export interface ProbeResult {
  fixtureId: FixtureId;
  fixtureSha256: string;
  modelSha256: string;
  vector: number[];
  inferenceMs: number;
  totalMs: number;
  normSquared: number;
  runtime: 'FROM_APPLICATION_ONLY';
  threads: 1;
  xnnpack: false;
  nnapi: false;
  gpu: false;
}
export function validateProbe(value: unknown, id: FixtureId): ProbeResult {
  if (!value || typeof value !== 'object') throw new Error('Missing native result.');
  const r = value as ProbeResult;
  if (r.fixtureId !== id || r.fixtureSha256 !== fixtureHashes[id] || r.modelSha256 !== modelSha256 ||
      r.runtime !== 'FROM_APPLICATION_ONLY' || r.threads !== 1 || r.xnnpack !== false ||
      r.nnapi !== false || r.gpu !== false || !Array.isArray(r.vector) || r.vector.length !== 1024 ||
      !r.vector.every(Number.isFinite) || !Number.isFinite(r.inferenceMs) || r.inferenceMs < 0 ||
      !Number.isFinite(r.totalMs) || r.totalMs < r.inferenceMs) {
    throw new Error('Native result failed the generated probe contract.');
  }
  const norm = r.vector.reduce((sum, v) => sum + v * v, 0);
  if (!Number.isFinite(norm) || norm <= 0 || !Number.isFinite(r.normSquared) ||
      Math.abs(norm - r.normSquared) > Math.max(1e-10, norm * 1e-10)) {
    throw new Error('Invalid native output norm.');
  }
  return r;
}
