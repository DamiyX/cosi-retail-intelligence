export const imageRecipe = 'generated-android-bitmap-rgb-center-bilinear-u8-v1';
export const imageSpecSha256 = '001741899a70a9b6b6d2f06d710ac46e26a6b47714c51c113093f33981c80bfc';
export const imageCaseIds = [
  ...Array.from({ length: 8 }, (_, n) => ['jpeg', 'raw'].flatMap(mode =>
    ['full', 'crop'].map(arm => `orientation-${n + 1}-${mode}-${arm}`))).flat(),
  ...Array.from({ length: 8 }, (_, n) => `guide-${n}`), 'downsample-257x129', 'downsample-129x257',
];
export interface StageDifference { components: number; mismatchCount: number; maxAbsoluteError: number; meanAbsoluteError: number }
export interface ImageCaseResult {
  id: string; sourceSha256: string; sourceFormat: 'JPEG' | 'RGB'; orientation: number;
  rawWidth: number; rawHeight: number; uprightWidth: number; uprightHeight: number;
  effectiveBox: number[]; letterbox: number[]; decodedUprightVsPillowRgb: StageDifference;
  cropVsFrozenRgb: StageDifference; resizeVsFrozenBilinearRgb: StageDifference;
  tensorVsFrozenBilinear: StageDifference; tensorVsFrozenPillowLanczos: StageDifference;
  decodeAndReadMs: number; processingMs: number; caseTotalMs: number; guideMaxError?: number;
}
export interface ImageProbeResult {
  recipe: typeof imageRecipe; specSha256: string; caseCount: 42; outputEntries: 211;
  bundleBytes: number; bundleSha256: string; modelExecuted: false; totalMs: number; cases: ImageCaseResult[];
  durable: true;
}
const hash = (v: unknown) => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const bounded = (v: unknown, max: number) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max;
export function validateImageProbe(value: unknown): ImageProbeResult {
  if (!value || typeof value !== 'object') throw new Error('Missing generated image result.');
  const r = value as ImageProbeResult;
  if (r.recipe !== imageRecipe || r.specSha256 !== imageSpecSha256 || r.caseCount !== 42 ||
      r.outputEntries !== 211 || r.modelExecuted !== false || r.durable !== true || !hash(r.bundleSha256) ||
      !Number.isSafeInteger(r.bundleBytes) || r.bundleBytes <= 0 || r.bundleBytes > 48 * 1024 * 1024 ||
      !bounded(r.totalMs, Number.MAX_SAFE_INTEGER) || !Array.isArray(r.cases) || r.cases.length !== 42) {
    throw new Error('Generated image result failed the frozen contract.');
  }
  for (const [i, c] of r.cases.entries()) {
    const dims = [c.rawWidth, c.rawHeight, c.uprightWidth, c.uprightHeight];
    if (c.id !== imageCaseIds[i] || !hash(c.sourceSha256) || !['JPEG', 'RGB'].includes(c.sourceFormat) ||
        !Number.isInteger(c.orientation) || c.orientation < 1 || c.orientation > 8 ||
        !dims.every(d => Number.isInteger(d) && d > 0 && d <= 512) ||
        !Array.isArray(c.effectiveBox) || c.effectiveBox.length !== 4 || !c.effectiveBox.every(Number.isInteger) ||
        !Array.isArray(c.letterbox) || c.letterbox.length !== 6 || !c.letterbox.every(v => Number.isInteger(v) && v >= 0) ||
        ![c.decodeAndReadMs, c.processingMs, c.caseTotalMs].every(v => bounded(v, Number.MAX_SAFE_INTEGER)) ||
        (c.guideMaxError !== undefined && !bounded(c.guideMaxError, 1e-12))) throw new Error('Invalid generated case geometry or timing.');
    const [l, t, rr, b] = c.effectiveBox;
    if (l < 0 || t < 0 || rr > c.uprightWidth || b > c.uprightHeight || l >= rr || t >= b ||
        c.letterbox[0] < 1 || c.letterbox[1] < 1 || c.letterbox[0] + c.letterbox[2] + c.letterbox[4] !== 224 ||
        c.letterbox[1] + c.letterbox[3] + c.letterbox[5] !== 224) throw new Error('Invalid generated crop or padding.');
    for (const [d, count, max] of [
      [c.decodedUprightVsPillowRgb, c.uprightWidth * c.uprightHeight * 3, 255],
      [c.cropVsFrozenRgb, (rr - l) * (b - t) * 3, 255],
      [c.resizeVsFrozenBilinearRgb, 224 * 224 * 3, 255],
      [c.tensorVsFrozenBilinear, 224 * 224 * 3, 1],
      [c.tensorVsFrozenPillowLanczos, 224 * 224 * 3, 1],
    ] as const) {
      if (!d || d.components !== count || !Number.isInteger(d.mismatchCount) ||
          !bounded(d.mismatchCount, count) || !bounded(d.maxAbsoluteError, max) ||
          !bounded(d.meanAbsoluteError, d.maxAbsoluteError)) throw new Error('Invalid generated stage comparison.');
    }
  }
  return r;
}
export type ImageRecovery = { status: 'NONE'; interruptedExport: boolean } |
  { status: 'RECOVERED'; interruptedExport: boolean; result: ImageProbeResult };
export function validateImageRecovery(value: unknown): ImageRecovery {
  if (!value || typeof value !== 'object') throw new Error('Missing generated recovery result.');
  const r = value as ImageRecovery;
  if (typeof r.interruptedExport !== 'boolean' || !['NONE', 'RECOVERED'].includes(r.status)) throw new Error('Invalid generated recovery state.');
  if (r.status === 'RECOVERED') validateImageProbe(r.result);
  return r;
}
export function validateImageExport(value: unknown, expected: ImageProbeResult) {
  const r = value as { bundleBytes?: number; bundleSha256?: string; outputEntries?: number } | null;
  if (!r || r.bundleBytes !== expected.bundleBytes || r.bundleSha256 !== expected.bundleSha256 || r.outputEntries !== 211) {
    throw new Error('Generated export did not match the completed bundle.');
  }
  return r;
}
