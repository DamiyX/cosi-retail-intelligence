import type { Config } from './schema.ts';
import { configSchema, LabError } from './schema.ts';
import { rank } from './ranking.ts';
import type { Decision } from './ranking.ts';
import { buildGallery, gallerySource, recordedQuery, retrievalHoldoutConfig } from './retrievalGallery.ts';
import type { GalleryInput, GallerySnapshot } from './retrievalGallery.ts';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { sha256 } from './provenance.ts';

export type RetrievalOutcome =
  | { status: 'DECISION'; decision: Decision; packageUnitNeedsConfirmation: boolean; generation: number }
  | { status: 'INVALID' | 'UNAVAILABLE' | 'FAILURE' | 'CANCELLED' | 'STALE' | 'BUSY'; code: string; manualFallback: true };
export interface QueryContext { storeScope: string; sessionId: string; generation: number; candidateHash: string;
  galleryHash: string; incarnationId: string }
const contextSchema = z.object({ storeScope: z.string(), sessionId: z.string(),
  generation: z.number().int().positive(), candidateHash: z.string(), galleryHash: z.string(), incarnationId: z.string() }).strict();
export type RecordedLoader = (record: unknown, signal: AbortSignal) => Promise<unknown>;
const fallback = (status: Exclude<RetrievalOutcome['status'], 'DECISION'>, code: string): RetrievalOutcome =>
  ({ status, code, manualFallback: true });

export function createRetrieval(input: GalleryInput, configInput: Config, sessionId: string,
  loader: RecordedLoader = async record => record, snapshot?: GallerySnapshot) {
  // Revalidate and copy all caller objects, including source arrays and config.
  input = structuredClone(input);
  const source = gallerySource(input);
  const config = configSchema.parse(structuredClone(configInput));
  if (source.adapted.bundle.split === 'holdout') {
    const held = retrievalHoldoutConfig(input.frozen, source);
    if (JSON.stringify(config) !== JSON.stringify(held.config)) throw new LabError('FROZEN_CONFIG_OVERRIDE', 'Holdout config changed');
  } else if (input.frozen !== undefined) throw new LabError('FROZEN_SPLIT', 'Frozen config is for holdout only');
  const gallery = snapshot ? structuredClone(snapshot) : buildGallery(source);
  const expected = buildGallery(source);
  if (JSON.stringify(gallery) !== JSON.stringify(expected)) throw new LabError('GALLERY_BINDING_MISMATCH', 'Gallery snapshot changed');
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(sessionId)) throw new LabError('SESSION_INVALID', 'Session ID required');
  const rankedGallery = gallery.references.map(ref => ({
    entry: source.references.find(e => e.id === ref.entryId)!, vector: ref.vector,
  }));
  let generation = 1; let available = true;
  // Generation is local to this incarnation. Reusing a human session ID must
  // never reuse captured query authority, even for an unchanged gallery/config.
  const incarnationId = randomUUID(); const galleryHash = sha256(JSON.stringify(source.binding));
  let pending: { controller: AbortController; invalidation: 'CANCELLED' | 'STALE' | null } | null = null;
  const context = (): QueryContext => ({ storeScope: source.binding.storeScope, sessionId, generation,
    candidateHash: source.adapted.candidateHash, galleryHash, incarnationId });
  const reset = (reason: 'CANCELLED' | 'STALE') => {
    generation++;
    if (pending) { pending.invalidation = reason; pending.controller.abort(); }
  };
  return {
    context, snapshot: () => structuredClone(gallery),
    cancel: () => reset('CANCELLED'),
    // Caller closes old instance before switching store/gallery/model; pending
    // work remains occupied until its loader settles, even if it ignores abort.
    close: () => { available = false; reset('STALE'); },
    async query(entryId: string, request: QueryContext): Promise<RetrievalOutcome> {
      if (!available) return fallback('UNAVAILABLE', 'SESSION_CLOSED');
      const parsed = contextSchema.safeParse(request);
      if (!parsed.success) return fallback('INVALID', 'QUERY_CONTEXT_INVALID');
      const captured = parsed.data; const current = context();
      if (captured.storeScope !== current.storeScope || captured.sessionId !== current.sessionId ||
        captured.generation !== current.generation || captured.candidateHash !== current.candidateHash ||
        captured.galleryHash !== current.galleryHash || captured.incarnationId !== current.incarnationId)
        return fallback('STALE', 'QUERY_CONTEXT_CHANGED');
      if (pending) return fallback('BUSY', 'ONE_IN_FLIGHT');
      const record = source.adapted.bundle.outputs.find(o => o.entryId === entryId);
      if (!record || !source.dataset.entries.some(e => e.id === entryId && e.role === 'query' && e.split === source.adapted.bundle.split))
        return fallback('INVALID', 'QUERY_NOT_SELECTED');
      const work = { controller: new AbortController(), invalidation: null as 'CANCELLED' | 'STALE' | null };
      pending = work;
      try {
        const result = await loader(structuredClone(record), work.controller.signal);
        if (work.invalidation) return fallback(work.invalidation, 'PENDING_INVALIDATED');
        if (captured.generation !== generation) return fallback('STALE', 'GENERATION_CHANGED');
        const query = recordedQuery(source, entryId, result);
        const decision = rank(query.vector, rankedGallery, config);
        return { status: 'DECISION', decision,
          packageUnitNeedsConfirmation: decision.status !== 'UNKNOWN' && !decision.candidates[0].packageCertain, generation };
      } catch (error) {
        if (work.invalidation) return fallback(work.invalidation, 'PENDING_INVALIDATED');
        const code = error instanceof LabError ? error.code : 'ADAPTER_ERROR';
        if (code === 'QUERY_BINDING_MISMATCH') return fallback('INVALID', code);
        if (code === 'MODEL_UNAVAILABLE') return fallback('UNAVAILABLE', code);
        return fallback('FAILURE', code === 'TIMEOUT' ? 'TIMEOUT' : 'ADAPTER_ERROR');
      } finally { if (pending === work) pending = null; }
    },
  };
}
