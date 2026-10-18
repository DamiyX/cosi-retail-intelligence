import type { Config, Dataset, Entry } from './schema.ts';
import { configSchema, LabError } from './schema.ts';

export interface Candidate { productId: string; packageId: string | null; score: number; packageCertain: boolean }
export interface PackageCandidate { productId: string; packageId: string | null; score: number }
export interface Decision {
  status: 'STRONG' | 'AMBIGUOUS' | 'UNKNOWN';
  candidates: Candidate[];
  packageCandidates: PackageCandidate[];
  margin: number | null;
}
export function unitVector(entry: Entry, adapter: Dataset['adapter']): number[] {
  const observation = entry.observation;
  if (!observation) throw new LabError('MODEL_UNAVAILABLE', 'No synthetic observation available');
  if (observation.kind === 'failure') throw new LabError(observation.code, 'Synthetic adapter failure');
  const { vector } = observation;
  if (vector.space !== adapter.space) throw new LabError('VECTOR_VERSION', 'Incompatible embedding space');
  if (vector.values.length !== adapter.dimension) throw new LabError('VECTOR_DIMENSION', 'Incompatible embedding dimension');
  if (!vector.values.every(Number.isFinite)) throw new LabError('INVALID_VECTOR', 'Nonfinite vector');
  // Scale first to avoid overflow and underflow on otherwise finite input.
  const scale = vector.values.reduce((max, v) => Math.max(max, Math.abs(v)), 0);
  if (scale === 0) throw new LabError('ZERO_VECTOR', 'Zero-norm vector');
  const scaled = vector.values.map(v => v / scale);
  const norm = Math.sqrt(scaled.reduce((n, v) => n + v * v, 0));
  return scaled.map(v => v / norm);
}
export function prepareGallery(dataset: Dataset): { entry: Entry; vector: number[] }[] {
  const references = dataset.entries.filter(e => e.role === 'reference');
  if (references.length === 0) throw new LabError('EMPTY_GALLERY', 'Gallery has no references');
  return references.map(entry => ({ entry, vector: unitVector(entry, dataset.adapter) }));
}
export function rank(query: number[], gallery: ReturnType<typeof prepareGallery>, input: Config): Decision {
  if (!gallery.length) throw new LabError('EMPTY_GALLERY', 'Gallery has no references');
  const config = configSchema.parse(input);
  const order = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
  const groups = new Map<string, Map<string | null, number>>();
  for (const { entry, vector } of gallery) {
    const score = Math.max(-1, Math.min(1, query.reduce((n, v, i) => n + v * vector[i], 0)));
    let packages = groups.get(entry.productId);
    if (!packages) { packages = new Map(); groups.set(entry.productId, packages); }
    packages.set(entry.packageId, Math.max(score, packages.get(entry.packageId) ?? -Infinity));
  }
  const candidates: Candidate[] = [...groups].map(([productId, packages]) => {
    const ordered = [...packages].sort((a, b) => b[1] - a[1] || order(String(a[0]), String(b[0])));
    const [packageId, score] = ordered[0];
    const packageCertain = packageId !== null && (ordered.length === 1 ||
      score - ordered[1][1] > 1e-12 && score - ordered[1][1] >= config.packageMargin);
    return { productId, packageId: packageCertain ? packageId : null, score, packageCertain };
  }).sort((a, b) => b.score - a.score || order(a.productId, b.productId));
  const packageCandidates: PackageCandidate[] = [...groups].flatMap(([productId, packages]) =>
    [...packages].map(([packageId, score]) => ({ productId, packageId, score })))
    .sort((a, b) => b.score - a.score || order(a.productId, b.productId) || order(String(a.packageId), String(b.packageId)))
    .slice(0, 3);
  const top = candidates[0];
  const margin = candidates.length > 1 ? top.score - candidates[1].score : null;
  const separated = margin === null || margin > 1e-12 && margin >= config.productMargin;
  const status = top.score < config.unknownBelow ? 'UNKNOWN' :
    top.score >= config.strongAt && separated && top.packageCertain ? 'STRONG' : 'AMBIGUOUS';
  return { status, candidates: candidates.slice(0, 3), packageCandidates, margin };
}
