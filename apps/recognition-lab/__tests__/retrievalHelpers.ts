import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { importDataset } from '../src/importer.ts';
import { calibrateRetrieval } from '../src/retrievalEvaluation.ts';
import { defaultConfig, LabError } from '../src/schema.ts';
import type { Split } from '../src/schema.ts';
import type { GalleryInput } from '../src/retrievalGallery.ts';
export const fixtureRoot = resolve(__dirname, '../fixtures');
export const loadFixture = (name: string) => JSON.parse(readFileSync(resolve(fixtureRoot, name + '.json'), 'utf8'));
export function galleryInput(split: Split = 'development'): GalleryInput {
  const { dataset, manifestHash } = importDataset(resolve(fixtureRoot, 'dataset.json'), fixtureRoot);
  const candidate = loadFixture('r2/toy-a');
  const input: GalleryInput = { dataset, manifestHash, candidate, bundle: loadFixture('r2/toy-a-' + split), split,
    currentStore: dataset.storeScope, selection: { ...loadFixture('r4/selection'), storeScope: dataset.storeScope } };
  if (split === 'holdout') input.frozen = calibrateRetrieval({ ...input, split: 'calibration',
    bundle: loadFixture('r2/toy-a-calibration') }, [defaultConfig], 0).frozen;
  return input;
}
export function rejectsCode(action: () => unknown, code: string) {
  try { action(); throw new Error('Unexpected acceptance'); }
  catch (error) { expect(error).toBeInstanceOf(LabError); expect((error as LabError).code).toBe(code); }
}
export function controlled<T>() {
  let resolve!: (value: T) => void; let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
