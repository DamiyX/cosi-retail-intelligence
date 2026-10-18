import { z } from 'zod';
import type { Dataset, Split } from './schema.ts';
import { datasetSchema, LabError } from './schema.ts';
import { adaptPrecomputed, bundleSchema } from './precomputed.ts';
import { unitVector } from './ranking.ts';
import { sha256 } from './provenance.ts';
import { frozenCandidateSchema, holdoutCandidateConfig } from './candidateFreeze.ts';

const id = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/);
export const selectionSchema = z.object({
  schemaVersion: z.literal(1), storeScope: id, revision: id,
  products: z.array(z.object({ productId: id, packageIds: z.array(id),
    recordedStock: z.number().finite().optional() }).strict()),
}).strict();
export type ActiveSelection = z.infer<typeof selectionSchema>;
export interface GalleryInput {
  dataset: Dataset; manifestHash: string; candidate: unknown; bundle: unknown;
  split: Split; selection: unknown; currentStore: string; frozen?: unknown;
}

// These hashes bind the complete source, not just successful references.
// Selection is explicit lab input; it is not a production catalogue store.
export function gallerySource(input: GalleryInput) {
  const parsed = datasetSchema.safeParse(input.dataset);
  const selected = selectionSchema.safeParse(input.selection);
  if (!parsed.success || !selected.success || !/^[0-9a-f]{64}$/.test(input.manifestHash))
    throw new LabError('GALLERY_INPUT_INVALID', 'Invalid imported gallery source');
  const dataset = parsed.data; const selection = selected.data;
  if (dataset.storeScope !== input.currentStore || selection.storeScope !== input.currentStore)
    throw new LabError('STORE_SCOPE_MISMATCH', 'Current store does not own gallery');
  const products = new Map(dataset.products.map(p => [p.id, p]));
  const packages = dataset.products.flatMap(p => p.packages);
  if (products.size !== dataset.products.length || new Set(packages).size !== packages.length ||
    new Set(dataset.entries.map(e => e.id)).size !== dataset.entries.length)
    throw new LabError('DUPLICATE_IDENTITY', 'Duplicate source identities');
  for (const entry of dataset.entries) {
    const product = products.get(entry.productId);
    if (!product || entry.packageId !== null && !product.packages.includes(entry.packageId) ||
      entry.role === 'reference' && (!entry.known || entry.split !== 'development'))
      throw new LabError('SOURCE_OWNERSHIP', 'Invalid source product/package reference');
  }
  if (new Set(selection.products.map(p => p.productId)).size !== selection.products.length)
    throw new LabError('DUPLICATE_SELECTION', 'Duplicate selected products');
  for (const selectedProduct of selection.products) {
    const product = products.get(selectedProduct.productId);
    const refs = dataset.entries.filter(e => e.role === 'reference' && e.productId === selectedProduct.productId);
    if (!product || !refs.length || new Set(selectedProduct.packageIds).size !== selectedProduct.packageIds.length ||
      selectedProduct.packageIds.some(p => !product.packages.includes(p)) ||
      refs.some(e => e.packageId !== null && !selectedProduct.packageIds.includes(e.packageId)))
      throw new LabError('SELECTION_OWNERSHIP', 'Selected product/packages must own every selected product reference');
  }
  const adapted = adaptPrecomputed(dataset, input.manifestHash, input.candidate, input.bundle, input.split);
  const selectedIds = new Set(selection.products.map(p => p.productId));
  const references = adapted.adapted.entries.filter(e => e.role === 'reference' && selectedIds.has(e.productId));
  const referenceIdentity = references.map(e => ({ entryId: e.id, productId: e.productId, packageId: e.packageId,
    assetSha256: e.asset.sha256, packagingGeneration: e.packagingGeneration, captureSession: e.captureSession }));
  const referenceOutputs = adapted.bundle.outputs.filter(o => references.some(e => e.id === o.entryId));
  const binding = {
    storeScope: input.currentStore, dataset: adapted.bundle.dataset,
    datasetContentSha256: sha256(JSON.stringify(dataset)), candidate: adapted.bundle.candidate,
    selectionRevision: selection.revision, selectionSha256: sha256(JSON.stringify(selection)),
    referenceIdentity, referenceOutputsSha256: sha256(JSON.stringify(referenceOutputs)),
  };
  return { dataset, selection, adapted, references, binding };
}
export type GalleryBinding = ReturnType<typeof gallerySource>['binding'];
export const retrievalFreezeSchema = z.object({ schemaVersion: z.literal(1), format: z.literal('lab-retrieval-freeze-v1'),
  galleryBindingSha256: z.string().regex(/^[0-9a-f]{64}$/), r2Frozen: frozenCandidateSchema }).strict();
export function retrievalHoldoutConfig(input: unknown, source: ReturnType<typeof gallerySource>) {
  const parsed = retrievalFreezeSchema.safeParse(input);
  if (!parsed.success) throw new LabError('RETRIEVAL_NOT_FROZEN', 'R4 holdout requires its candidate and gallery freeze');
  if (parsed.data.galleryBindingSha256 !== sha256(JSON.stringify(source.binding)))
    throw new LabError('FROZEN_GALLERY_MISMATCH', 'Holdout active store/gallery/selection changed');
  return { config: holdoutCandidateConfig(parsed.data.r2Frozen, source.dataset, source.binding.dataset.manifestSha256,
    source.adapted.candidate), frozen: parsed.data };
}
export interface GallerySnapshot {
  binding: GalleryBinding;
  references: { entryId: string; vector: number[] }[];
}
export function buildGallery(source: ReturnType<typeof gallerySource>): GallerySnapshot {
  if (!source.references.length) throw new LabError('EMPTY_GALLERY', 'Selected gallery is empty');
  if (source.references.some(e => e.observation?.kind === 'failure'))
    throw new LabError('REFERENCE_ENCODING_FAILURE', 'Entire selected gallery requires rebuild');
  return structuredClone({ binding: source.binding, references: source.references.map(e => ({
    entryId: e.id, vector: unitVector(e, source.adapted.adapted.adapter),
  })) });
}

// Parse and bind an async recorded result to the exact query asset. Ground truth
// never chooses the returned identity; only rank() uses query values.
export function recordedQuery(source: ReturnType<typeof gallerySource>, entryId: string, input: unknown) {
  const entry = source.adapted.adapted.entries.find(e => e.id === entryId && e.role === 'query');
  const expected = source.adapted.bundle.outputs.find(e => e.entryId === entryId);
  const parsed = bundleSchema.shape.outputs.element.safeParse(input);
  if (!entry || !expected || !parsed.success || JSON.stringify(parsed.data) !== JSON.stringify(expected))
    throw new LabError('QUERY_BINDING_MISMATCH', 'Recorded query does not match selected input');
  const output = parsed.data.output;
  return { entry, vector: unitVector({ ...entry, observation: output.kind === 'failure' ? output :
    { kind: 'vector', vector: { space: output.space, values: output.values } } }, source.adapted.adapted.adapter) };
}
