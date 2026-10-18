import { performance } from 'node:perf_hooks';
import type { Config, Dataset, Split } from './schema.ts';
import { LabError } from './schema.ts';
import { prepareGallery, rank, unitVector } from './ranking.ts';
import type { Decision } from './ranking.ts';

export interface QueryResult {
  queryId: string; truth: { productId: string; packageId: string | null; known: boolean };
  split: Split; lighting: string; view: string;
  elapsedMs: number;
  outcome: Decision | { status: 'FAILURE'; code: string };
}
export function experiment(dataset: Dataset, config: Config, split: Split): QueryResult[] {
  if (dataset.kind !== 'synthetic-tooling-only') throw new LabError('MODEL_UNAVAILABLE', 'R0 has no real encoder; validate real manifests only');
  if (dataset.adapter.id !== 'authored-vector-v1' || dataset.adapter.preprocessingId !== 'identity-v1')
    throw new LabError('ADAPTER_UNAVAILABLE', 'R0 only implements the authored-vector-v1 / identity-v1 adapter');
  const gallery = prepareGallery(dataset);
  return dataset.entries.filter(e => e.role === 'query' && e.split === split).map(entry => {
    const start = performance.now();
    let outcome: QueryResult['outcome'];
    try { outcome = rank(unitVector(entry, dataset.adapter), gallery, config); }
    catch (error) { outcome = { status: 'FAILURE', code: error instanceof LabError ? error.code : 'ADAPTER_ERROR' }; }
    return {
      queryId: entry.id, truth: { productId: entry.productId, packageId: entry.packageId, known: entry.known },
      split, lighting: entry.capture.lighting, view: entry.capture.view, outcome, elapsedMs: performance.now() - start,
    };
  });
}
