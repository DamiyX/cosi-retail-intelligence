import { imageCaseIds, imageRecipe, imageSpecSha256, type ImageProbeResult } from '../src/recognitionExperiment/imageProbes';
export function imageResultFixture(): ImageProbeResult {
  const difference = (components: number) => ({ components, mismatchCount: 0, maxAbsoluteError: 0, meanAbsoluteError: 0 });
  return { recipe: imageRecipe, specSha256: imageSpecSha256, caseCount: 42, outputEntries: 211,
    bundleBytes: 1024, bundleSha256: 'a'.repeat(64), modelExecuted: false, durable: true, totalMs: 10,
    cases: imageCaseIds.map(id => ({ id, sourceSha256: 'b'.repeat(64), sourceFormat: 'RGB', orientation: 1,
      rawWidth: 37, rawHeight: 23, uprightWidth: 37, uprightHeight: 23,
      effectiveBox: [2, 1, 35, 22], letterbox: [224, 143, 0, 40, 0, 41],
      decodedUprightVsPillowRgb: difference(37 * 23 * 3), cropVsFrozenRgb: difference(33 * 21 * 3),
      resizeVsFrozenBilinearRgb: difference(224 * 224 * 3), tensorVsFrozenBilinear: difference(224 * 224 * 3),
      tensorVsFrozenPillowLanczos: difference(224 * 224 * 3), decodeAndReadMs: 1, processingMs: 2, caseTotalMs: 4,
    })),
  };
}
