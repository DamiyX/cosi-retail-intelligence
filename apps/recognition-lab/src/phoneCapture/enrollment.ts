import { z } from 'zod';
export const SLOTS = ['front', 'rear', 'complementary1', 'complementary2'] as const;
export const ENROLLMENT_LIMITS = Object.freeze({ products: 10, slots: 40, trials: 25, attempts: 75, events: 4096 });
export type Digest = (value: string) => string;
const id = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/);
const hash = z.string().regex(/^[0-9a-f]{64}$/);
const vector = z.array(z.number().finite().min(-1e6).max(1e6)).length(2).refine(v => v.some(n => n !== 0));
export const bindingsSchema = z.object({ sourceSha256: hash, modelSha256: hash, recipeSha256: hash, fixtureSha256: hash }).strict();
export type EnrollmentBindings = z.infer<typeof bindingsSchema>;
const reference = z.object({ id, slot: z.enum(SLOTS), values: vector, sha256: hash }).strict();
const product = z.object({ productId: id, slots: z.array(reference.nullable()).length(4) }).strict();
export const trialSchema = z.object({ trialId: id, sessionId: id, mode: z.enum(['NORMAL', 'FAILED', 'CANCELLED', 'DEADLINE', 'INTERRUPTED']), queryInputSha256: hash,
  truth: z.discriminatedUnion('kind', [z.object({ kind: z.literal('KNOWN'), productId: id }).strict(), z.object({ kind: z.literal('UNKNOWN') }).strict()]) }).strict();
export type FrozenTrial = z.infer<typeof trialSchema>;
const fixtureTrial = z.object({ trialId: id, sessionId: id, mode: z.enum(['NORMAL', 'FAILED', 'CANCELLED', 'DEADLINE', 'INTERRUPTED']),
  truth: trialSchema.shape.truth, vectors: z.array(vector).length(3) }).strict();
const fixtureSchema = z.object({ schemaVersion: z.literal(1), kind: z.literal('GENERATED_ENROLLMENT_FIXTURE'), nativeValidated: z.literal(false), fixtureId: id,
  products: z.array(z.object({ productId: id, views: z.array(vector).length(4) }).strict()).min(1).max(10),
  trials: z.array(fixtureTrial).min(1).max(25), followupTrials: z.array(fixtureTrial).max(25) }).strict();
export type EnrollmentFixture = z.infer<typeof fixtureSchema>;
export function parseEnrollmentFixture(value: unknown): EnrollmentFixture {
  if (!value || typeof value !== 'object') throw Error('GENERATED_ENROLLMENT_FIXTURE_REQUIRED');
  const v = value as Record<string, unknown>;
  if (!Array.isArray(v.products) || v.products.length > 10 || !Array.isArray(v.trials) || !Array.isArray(v.followupTrials) || v.trials.length + v.followupTrials.length > 25) throw Error('ENROLLMENT_FIXTURE_CAP');
  const f = fixtureSchema.parse(value); unique(f.products.map(p => p.productId));
  unique([...f.trials, ...f.followupTrials].map(t => t.trialId)); unique([...f.trials, ...f.followupTrials].map(t => t.sessionId)); return f;
}
const revision = z.object({ revisionId: id, bindings: bindingsSchema, products: z.array(product).min(1).max(10), trials: z.array(trialSchema).min(1).max(25), sha256: hash }).strict();
export type GalleryRevision = z.infer<typeof revision>;
const work = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('REFERENCE'), token: id, productId: id, slot: z.enum(SLOTS), replacing: z.boolean() }).strict(),
  z.object({ kind: z.literal('TRIAL'), token: id, revisionId: id, trialId: id }).strict(),
]);
const frame = z.object({ id, requestAtMs: z.number().int().min(0).max(60000), capturedAtMs: z.number().int().min(0).max(60000).nullable(), completedAtMs: z.number().int().min(0).max(60000).nullable(),
  selected: z.boolean(), disposition: z.enum(['PENDING', 'USABLE', 'FAILED', 'LATE', 'CANCELLED', 'NOT_SELECTED']), values: vector.nullable(), failureCode: id.nullable() }).strict();
export const trialRecordSchema = z.object({ revisionId: id, trialId: id, queryInputSha256: hash, terminal: z.enum(['COMPLETE', 'CANCELLED', 'DEADLINE', 'FAILED', 'INTERRUPTED', 'DRAINING']),
  reason: id.nullable(), stillOwnedWork: z.boolean(), frames: z.array(frame).max(3), sha256: hash }).strict();
export type TrialRecord = z.infer<typeof trialRecordSchema>;
const event = z.object({ sequence: z.number().int().min(1).max(4096), kind: z.enum(['BEGIN_REFERENCE', 'COMMIT_REFERENCE', 'RESUME_REFERENCE', 'FORK_REVISION', 'FREEZE', 'BEGIN_TRIAL', 'COMMIT_TRIAL', 'CLASSIFY_INTERRUPTED_TRIAL']),
  token: id.nullable(), productId: id.nullable(), slot: z.enum(SLOTS).nullable(), revisionId: id.nullable(), trialId: id.nullable() }).strict();
const stateSchema = z.object({ schemaVersion: z.literal(1), kind: z.literal('GENERATED_ENROLLMENT_STATE'), nativeValidated: z.literal(false), bindings: bindingsSchema,
  sequence: z.number().int().min(0).max(4096), draftNumber: z.number().int().min(1).max(26), draftFrozen: z.boolean(),
  products: z.array(product).min(1).max(10), active: work.nullable(), revisions: z.array(revision).max(25), records: z.array(trialRecordSchema).max(25), events: z.array(event).max(4096),
  replacements: z.array(z.object({ sequence: z.number().int().positive().max(4096), productId: id, slot: z.enum(SLOTS), from: reference, to: reference }).strict()).max(4096) }).strict();
export type EnrollmentState = z.infer<typeof stateSchema>;
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const unique = (values: string[]) => { if (new Set(values).size !== values.length) throw Error('DUPLICATE_ENROLLMENT_ID'); };
export function referenceHash(bindings: EnrollmentBindings, productId: string, value: Omit<z.infer<typeof reference>, 'sha256'>, digest: Digest) {
  return digest(JSON.stringify({ bindings, productId, ...value }));
}
export function revisionHash(value: Omit<GalleryRevision, 'sha256'>, digest: Digest) { return digest(JSON.stringify(value)); }
export function recordHash(value: Omit<TrialRecord, 'sha256'>, digest: Digest) { return digest(JSON.stringify(value)); }
function bounded(value: unknown) {
  if (!value || typeof value !== 'object') throw Error('INVALID_ENROLLMENT_STATE');
  const v = value as Record<string, unknown>;
  for (const [name, cap] of [['products', 10], ['revisions', 25], ['records', 25], ['events', 4096], ['replacements', 4096]] as const) {
    if (!Array.isArray(v[name]) || v[name].length > cap) throw Error('ENROLLMENT_CAP');
  }
}
export function validateState(value: unknown, expected: EnrollmentBindings, digest: Digest): EnrollmentState {
  bounded(value); const s = stateSchema.parse(value);
  if (!equal(s.bindings, bindingsSchema.parse(expected))) throw Error('ENROLLMENT_BINDING_MISMATCH');
  unique(s.products.map(p => p.productId)); unique(s.revisions.map(r => r.revisionId));
  const allTrials = s.revisions.flatMap(r => r.trials); if (allTrials.length > 25) throw Error('TRIAL_CAP');
  unique(allTrials.map(t => t.trialId)); unique(allTrials.map(t => t.sessionId)); unique(s.records.map(r => r.trialId));
  if (s.sequence !== s.events.length || s.events.some((e, i) => e.sequence !== i + 1)) throw Error('EVENT_SEQUENCE');
  const validateProducts = (products: EnrollmentState['products'], complete: boolean) => {
    unique(products.map(p => p.productId)); unique(products.flatMap(p => p.slots.filter(r => r !== null).map(r => r.id)));
    for (const p of products) {
      let missing = false;
      p.slots.forEach((r, index) => {
        if (r === null) { missing = true; if (complete) throw Error('MISSING_REFERENCE'); }
        else {
          if (missing || r.slot !== SLOTS[index]) throw Error('REFERENCE_ORDER');
          const { sha256, ...body } = r; if (referenceHash(s.bindings, p.productId, body, digest) !== sha256) throw Error('REFERENCE_HASH');
        }
      });
    }
  };
  validateProducts(s.products, false);
  for (const [i, r] of s.revisions.entries()) {
    if (r.revisionId !== 'gallery-' + (i + 1) || !equal(r.bindings, s.bindings)) throw Error('REVISION_BINDING');
    validateProducts(r.products, true); const { sha256, ...body } = r;
    if (revisionHash(body, digest) !== sha256) throw Error('REVISION_HASH');
    for (const t of r.trials) if (t.truth.kind === 'KNOWN' && !r.products.some(p => p.productId === (t.truth.kind === 'KNOWN' ? t.truth.productId : ''))) throw Error('TRUTH_NOT_ENROLLED');
  }
  if (s.draftNumber !== s.revisions.length + (s.draftFrozen ? 0 : 1) || s.draftFrozen && !equal(s.products, s.revisions.at(-1)?.products)) throw Error('DRAFT_BINDING');
  for (const r of s.records) {
    const rev = s.revisions.find(g => g.revisionId === r.revisionId), t = rev?.trials.find(t => t.trialId === r.trialId);
    if (!t || t.queryInputSha256 !== r.queryInputSha256) throw Error('TRIAL_RECORD_BINDING');
    const { sha256, ...body } = r; if (recordHash(body, digest) !== sha256) throw Error('TRIAL_RECORD_HASH');
    unique(r.frames.map(f => f.id));
    for (const f of r.frames) {
      if ((f.disposition === 'USABLE') !== (f.values !== null) || f.values && !f.selected || f.capturedAtMs !== null && f.capturedAtMs < f.requestAtMs ||
          f.completedAtMs !== null && f.completedAtMs < (f.capturedAtMs ?? f.requestAtMs) || f.disposition === 'USABLE' && (f.completedAtMs === null || f.completedAtMs >= 3000)) throw Error('TRIAL_FRAME_INVALID');
    }
  }
  for (const h of s.replacements) for (const r of [h.from, h.to]) {
    const { sha256, ...body } = r; if (r.slot !== h.slot || referenceHash(s.bindings, h.productId, body, digest) !== sha256) throw Error('REPLACEMENT_HASH');
  }
  if (s.active?.kind === 'REFERENCE') {
    const a = s.active, p = s.products.find(p => p.productId === a.productId), index = SLOTS.indexOf(a.slot);
    if (!p || s.draftFrozen || a.replacing !== (p.slots[index] !== null) || !a.replacing && index !== p.slots.findIndex(r => r === null)) throw Error('ACTIVE_REFERENCE_INVALID');
  }
  if (s.active?.kind === 'TRIAL') {
    const a = s.active; if (!s.revisions.some(r => r.revisionId === a.revisionId && r.trials.some(t => t.trialId === a.trialId)) || s.records.some(r => r.trialId === a.trialId && !r.stillOwnedWork)) throw Error('ACTIVE_TRIAL_INVALID');
  }
  return s;
}
function eventPush(s: EnrollmentState, kind: EnrollmentState['events'][number]['kind'], fields: Partial<Omit<EnrollmentState['events'][number], 'kind' | 'sequence'>> = {}) {
  if (s.sequence >= 4096) throw Error('EVENT_CAP');
  s.events.push({ sequence: ++s.sequence, kind, token: null, productId: null, slot: null, revisionId: null, trialId: null, ...fields });
}
export function initialEnrollment(bindings: EnrollmentBindings, productIds: string[], digest: Digest): EnrollmentState {
  if (!productIds.length || productIds.length > 10) throw Error('PRODUCT_CAP'); unique(productIds);
  return validateState({ schemaVersion: 1, kind: 'GENERATED_ENROLLMENT_STATE', nativeValidated: false, bindings, sequence: 0, draftNumber: 1, draftFrozen: false,
    products: productIds.map(productId => ({ productId, slots: [null, null, null, null] })), active: null, revisions: [], records: [], events: [], replacements: [] }, bindings, digest);
}
export function beginReference(state: EnrollmentState, productId: string, slot: typeof SLOTS[number], replacing = false): EnrollmentState {
  if (state.active) throw Error('WORK_ALREADY_PENDING');
  const s = clone(state), p = s.products.find(p => p.productId === productId), index = SLOTS.indexOf(slot);
  if (!p || index < 0 || replacing !== (p.slots[index] !== null) || !replacing && index !== p.slots.findIndex(r => r === null)) throw Error('REFERENCE_ORDER_OR_REPLACEMENT');
  if (s.draftFrozen) { if (!replacing) throw Error('FROZEN_GALLERY'); s.draftNumber++; s.draftFrozen = false; eventPush(s, 'FORK_REVISION', { revisionId: 'gallery-' + s.draftNumber }); }
  const token = 'work-' + (s.sequence + 1); s.active = { kind: 'REFERENCE', token, productId, slot, replacing };
  eventPush(s, 'BEGIN_REFERENCE', { token, productId, slot }); return s;
}
export function commitReference(state: EnrollmentState, token: string, values: number[], digest: Digest): EnrollmentState {
  vector.parse(values); if (state.active?.kind !== 'REFERENCE' || state.active.token !== token) throw Error('STALE_REFERENCE_WORK');
  const s = clone(state), a = s.active! as Extract<NonNullable<EnrollmentState['active']>, { kind: 'REFERENCE' }>, p = s.products.find(p => p.productId === a.productId)!;
  const body = { id: 'ref-' + (s.sequence + 1), slot: a.slot, values: [...values] }, ref = { ...body, sha256: referenceHash(s.bindings, a.productId, body, digest) };
  const index = SLOTS.indexOf(a.slot), previous = p.slots[index];
  if (previous) s.replacements.push({ sequence: s.sequence + 1, productId: p.productId, slot: a.slot, from: previous, to: ref });
  p.slots[index] = ref; s.active = null; eventPush(s, 'COMMIT_REFERENCE', { token, productId: a.productId, slot: a.slot }); return s;
}
export function resumeInterrupted(state: EnrollmentState, token: string, digest: Digest): EnrollmentState {
  if (!state.active || state.active.token !== token) throw Error('NO_MATCHING_INTERRUPTED_WORK');
  const s = clone(state);
  if (s.active!.kind === 'REFERENCE') {
    const a = s.active!; a.token = 'work-' + (s.sequence + 1); eventPush(s, 'RESUME_REFERENCE', { token: a.token, productId: a.productId, slot: a.slot });
  } else {
    const a = s.active!, t = s.revisions.find(r => r.revisionId === a.revisionId)!.trials.find(t => t.trialId === a.trialId)!;
    const observed = s.records.find(r => r.trialId === a.trialId)?.frames ?? [];
    const body = { revisionId: a.revisionId, trialId: a.trialId, queryInputSha256: t.queryInputSha256, terminal: 'INTERRUPTED' as const, reason: 'REOPENED_PENDING_WORK', stillOwnedWork: false, frames: observed };
    s.records = s.records.filter(r => r.trialId !== a.trialId); s.records.push({ ...body, sha256: recordHash(body, digest) }); s.active = null;
    eventPush(s, 'CLASSIFY_INTERRUPTED_TRIAL', { token, revisionId: a.revisionId, trialId: a.trialId });
  }
  return s;
}
export function freezeGallery(state: EnrollmentState, trialsValue: unknown, digest: Digest): EnrollmentState {
  if (state.active || state.draftFrozen || state.products.some(p => p.slots.some(r => r === null))) throw Error('GALLERY_NOT_READY_TO_FREEZE');
  if (!Array.isArray(trialsValue) || !trialsValue.length || trialsValue.length + state.revisions.reduce((n, r) => n + r.trials.length, 0) > 25) throw Error('TRIAL_CAP');
  const trials = z.array(trialSchema).parse(trialsValue), s = clone(state);
  const body = { revisionId: 'gallery-' + s.draftNumber, bindings: s.bindings, products: clone(s.products), trials };
  s.revisions.push({ ...body, sha256: revisionHash(body, digest) }); s.draftFrozen = true; eventPush(s, 'FREEZE', { revisionId: body.revisionId }); return validateState(s, s.bindings, digest);
}
export function beginTrial(state: EnrollmentState, revisionId: string, trialId: string): EnrollmentState {
  if (state.active || !state.revisions.some(r => r.revisionId === revisionId && r.trials.some(t => t.trialId === trialId)) || state.records.some(r => r.trialId === trialId)) throw Error('TRIAL_NOT_ADMITTED');
  const s = clone(state), token = 'work-' + (s.sequence + 1); s.active = { kind: 'TRIAL', token, revisionId, trialId }; eventPush(s, 'BEGIN_TRIAL', { token, revisionId, trialId }); return s;
}
export function commitTrial(state: EnrollmentState, token: string, body: Omit<TrialRecord, 'sha256'>, digest: Digest): EnrollmentState {
  if (state.active?.kind !== 'TRIAL' || state.active.token !== token || state.active.trialId !== body.trialId || state.active.revisionId !== body.revisionId) throw Error('STALE_TRIAL_WORK');
  const s = clone(state); s.records = s.records.filter(r => r.trialId !== body.trialId); s.records.push({ ...body, sha256: recordHash(body, digest) });
  if (!body.stillOwnedWork) s.active = null; eventPush(s, 'COMMIT_TRIAL', { token, revisionId: body.revisionId, trialId: body.trialId }); return validateState(s, s.bindings, digest);
}
