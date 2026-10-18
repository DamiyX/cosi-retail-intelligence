import { z } from 'zod';
import { buildGallery } from './retrievalGallery.ts';
import type { GallerySnapshot, gallerySource } from './retrievalGallery.ts';
import { sha256 } from './provenance.ts';
import { bundleSchema } from './precomputed.ts';

const id = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/);
const hash = z.string().regex(/^[0-9a-f]{64}$/);
const bindingSchema = z.object({ storeScope: id, dataset: bundleSchema.shape.dataset,
  datasetContentSha256: hash, candidate: bundleSchema.shape.candidate,
  selectionRevision: id, selectionSha256: hash,
  referenceIdentity: z.array(z.object({ entryId: id, productId: id, packageId: id.nullable(), assetSha256: hash,
    packagingGeneration: id, captureSession: id }).strict()), referenceOutputsSha256: hash,
}).strict();
const payloadSchema = z.object({ format: z.literal('lab-derived-gallery-v1'),
  snapshot: z.object({ binding: bindingSchema,
    references: z.array(z.object({ entryId: id, vector: z.array(z.number().finite()).min(1) }).strict()).min(1),
  }).strict(),
}).strict();
const cacheSchema = payloadSchema.extend({ checksum: hash }).strict();
export type CacheOutcome =
  | { status: 'READY'; snapshot: GallerySnapshot; checksum: string }
  | { status: 'UNAVAILABLE'; code: 'CACHE_MISSING' | 'CACHE_CORRUPT' | 'CACHE_INCOMPATIBLE' | 'SOURCE_UNAVAILABLE';
    rebuildRequired: true; manualFallback: true };
export function serializeCache(source: ReturnType<typeof gallerySource>): string {
  const payload = payloadSchema.parse({ format: 'lab-derived-gallery-v1', snapshot: buildGallery(source) });
  return JSON.stringify({ ...payload, checksum: sha256(JSON.stringify(payload)) }, null, 2) + '\n';
}
export function loadCache(bytes: string | null, source: ReturnType<typeof gallerySource>): CacheOutcome {
  const unavailable = (code: Extract<CacheOutcome, { status: 'UNAVAILABLE' }>['code']): CacheOutcome =>
    ({ status: 'UNAVAILABLE', code, rebuildRequired: true, manualFallback: true });
  if (bytes === null) return unavailable('CACHE_MISSING');
  let input: unknown;
  try { input = JSON.parse(bytes); } catch { return unavailable('CACHE_CORRUPT'); }
  const parsed = cacheSchema.safeParse(input);
  if (!parsed.success) return unavailable('CACHE_CORRUPT');
  const { checksum, ...payload } = parsed.data;
  if (checksum !== sha256(JSON.stringify(payload))) return unavailable('CACHE_CORRUPT');
  let expected: GallerySnapshot;
  try { expected = buildGallery(source); } catch { return unavailable('SOURCE_UNAVAILABLE'); }
  // Rebuild from the exact current source to validate every value/owner/reference,
  // including recomputed checksums on deliberately modified payloads. No partial
  // galleries or floating tolerances. This is preparation, not an optimized DB.
  if (JSON.stringify(payload.snapshot) !== JSON.stringify(expected)) return unavailable('CACHE_INCOMPATIBLE');
  return { status: 'READY', snapshot: structuredClone(payload.snapshot), checksum };
}
