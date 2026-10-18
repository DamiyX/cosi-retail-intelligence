import { describe, test } from 'node:test';
import { expect } from 'expect';
import { core } from '../src/labelEvidenceSchema.ts';
import type { Field, Observation, ReferenceCard, ReviewEntry } from '../src/labelEvidenceSchema.ts';

function observation(id: string, literal: string, selected: Partial<Record<Field, string>> = {}, readability: Observation['readability'] = 'readable'): Observation {
  return { id, assetSha256: 'a'.repeat(64), literal, readability, fields: Object.fromEntries(core.fields.map(field => {
    const text = selected[field]; return [field, text === undefined ? null : { text, start: literal.indexOf(text), end: literal.indexOf(text) + text.length }];
  })) as Observation['fields'] };
}
const metadata: ReviewEntry[] = ['a', 'b', 'c'].map(productId => ({ id: 'ref-' + productId, role: 'reference', productId,
  assetSha256: 'a'.repeat(64), width: 20, height: 30, orientation: 1, effectiveBox: { left: 0, top: 0, right: 20, bottom: 30 } }));
const candidates = ['a', 'b', 'c'].map((productId, i) => ({ productId, score: .98 - i / 10, nearestReferenceId: 'ref-' + productId }));
function quantityCards(a = '750ml', b = '600ml', c = '900ml'): ReferenceCard[] {
  return core.referenceCards([a, b, c].map((quantity, i) => observation(metadata[i].id, 'Juniper ' + quantity, { brandName: 'Juniper', quantity })), metadata);
}
describe('fixed conservative label evidence with invented SKUs', () => {
  test('600ml and0.6L exact equivalent;750ml differs; mass/count remain distinct', () => {
    expect(core.normalizeQuantity('600ml')).toEqual(core.normalizeQuantity('0.6L'));
    expect(core.normalizeQuantity('600ml')).not.toEqual(core.normalizeQuantity('750ml'));
    expect(core.normalizeQuantity('600ml')).not.toEqual(core.normalizeQuantity('600g'));
    expect(core.normalizeQuantity('600g')).not.toEqual(core.normalizeQuantity('600pcs'));
    for (const value of ['0ml', '6O0ml', '0,6L', '9999999ml', '1.0001L', '1.5pcs', '2x600ml']) expect(core.normalizeQuantity(value)).toBeNull();
  });
  test('sole supported candidate plus EVERY rival contradiction promotes and keeps remaining order/scores', () => {
    const result = core.assist(observation('query', 'Juniper 0.6L', { brandName: 'Juniper', quantity: '0.6L' }), candidates, quantityCards());
    expect(result.candidates.map(c => c.productId)).toEqual(['b', 'a', 'c']); expect(result.promoted).toBe(true);
    expect(result.candidates.find(c => c.productId === 'b')?.score).toBe(candidates[1].score);
    expect(result.evidence.filter(e => e.productId !== 'b').every(e => e.contradicted)).toBe(true);
  });
  test('missing rival metadata is UNKNOWN and blocks promotion', () => {
    const cards = quantityCards(); cards[2].values = { brandName: null, variant: null, quantity: null };
    const result = core.assist(observation('query', '600ml', { quantity: '600ml' }), candidates, cards);
    expect(result.candidates).toEqual(candidates); expect(result.evidence[2].contradicted).toBe(false);
    expect(result.evidence[2].perField.quantity).toBe('UNKNOWN');
    expect(core.assist(observation('query', '600ml', { quantity: '600ml' }), candidates, cards.slice(0, 2)).candidates).toEqual(candidates);
  });
  test('two supported candidates preserve visual order', () => {
    expect(core.assist(observation('query', '600ml', { quantity: '600ml' }), candidates, quantityCards('600ml', '600ml')).candidates).toEqual(candidates);
  });
  test('explicit flavor/name conflicts distinguish references without fuzzy correction', () => {
    const cards = core.referenceCards(metadata.map((m, i) => observation(m.id, ['Birch mint', 'Birch lemon', 'Aspen lemon'][i],
      { brandName: i === 2 ? 'Aspen' : 'Birch', variant: i === 0 ? 'mint' : 'lemon' })), metadata);
    expect(core.assist(observation('q', ' BIRCH  lemon ', { brandName: 'BIRCH', variant: 'lemon' }), candidates, cards).candidates.map(c => c.productId)).toEqual(['b', 'a', 'c']);
    expect(core.normalizeText('Birch-Lemon')).not.toEqual(core.normalizeText('Birch Lemon'));
  });
  test('multipacks/competing quantities/percentages/unclear digits/conflict abstain', () => {
    for (const literal of ['2x600ml', '600ml x 2', '2 bottles 600ml', 'pack of 2 600ml', '600ml / 750ml', '600ml +10%', '600ml 20 percent', '600ml 20 per cent', '6O0ml']) {
      const span = literal.includes('6O0') ? '6O0ml' : '600ml';
      const result = core.assist(observation('q', literal, { quantity: span }), candidates, quantityCards());
      expect(result.candidates).toEqual(candidates); expect(result.promoted).toBe(false);
    }
    expect(core.assist(observation('q', '600ml', { quantity: '600ml' }, 'conflicting'), candidates, quantityCards()).candidates).toEqual(candidates);
  });
  test('fully readable quantity can support; partial/absent/unreadable/no-text fall back', () => {
    expect(core.assist(observation('q', '600ml', { quantity: '600ml' }), candidates, quantityCards()).promoted).toBe(true);
    expect(core.assist(observation('q', '600ml', { quantity: '600ml' }, 'partial'), candidates, quantityCards()).candidates).toEqual(candidates);
    for (const state of ['unreadable', 'no-text', 'not-reviewed'] as const) expect(core.assist(observation('q', '', {}, state), candidates, quantityCards()).candidates).toEqual(candidates);
  });
  test('all contradictory candidates flag manual confirmation and keep order', () => {
    const result = core.assist(observation('q', '120ml', { quantity: '120ml' }), candidates, quantityCards());
    expect(result.manualConfirmation).toBe(true); expect(result.candidates).toEqual(candidates);
  });
  test('outside-top3 truth cannot expand shortlist; harmful wrong transcription can cause loss', () => {
    const result = core.assist(observation('q', '600ml', { quantity: '600ml' }), candidates, quantityCards());
    expect(result.candidates.map(c => c.productId).sort()).toEqual(['a', 'b', 'c']);
    // If actual truth is a, incorrectly transcribing600ml produces a harmful b promotion.
    expect(result.candidates[0].productId).toBe('b'); expect(result.candidates[0].productId).not.toBe('outside');
  });
  test('rule does not access hidden query truth or labels', () => {
    const e = observation('q', '600ml', { quantity: '600ml' });
    Object.defineProperty(e, 'truth', { get() { throw Error('TRUTH_LEAK'); } });
    Object.defineProperty(e, 'productLabel', { get() { throw Error('LABEL_LEAK'); } });
    expect(core.assist(e, candidates, quantityCards()).promoted).toBe(true);
  });
  test('reference support requires reference-entry spans; conflicting references are UNKNOWN', () => {
    expect(() => core.referenceCards([observation('query', '600ml', { quantity: '600ml' })], [{ ...metadata[0], id: 'query', role: 'query' }])).toThrow('LABEL_REFERENCE_ROLE');
    const refs = [metadata[0], { ...metadata[0], id: 'second-ref-a' }];
    const cards = core.referenceCards([observation('ref-a', '600ml', { quantity: '600ml' }), observation('second-ref-a', '750ml', { quantity: '750ml' })], refs);
    expect(cards[0].values.quantity).toBeNull(); expect(cards[0].support.quantity).toEqual([]);
    expect(cards[0].reasons.quantity).toBe('CONFLICTING_REFERENCE_TRANSCRIPTION');
  });
});
describe('shared review progress contract', () => {
  const cfg = { bindingSha256: 'b'.repeat(64), ruleSha256: 'c'.repeat(64), scope: 'references' as const, entries: metadata };
  test('partial roundtrip keeps every row and distinguishes completeness', () => {
    const p = core.blank(cfg); expect(core.complete(p)).toBe(false);
    expect(core.validateProgress(core.strictJson(JSON.stringify(p)), cfg)).toEqual(p);
    p.entries = p.entries.map(e => ({ ...e, readability: 'no-text' })); expect(core.complete(core.validateProgress(p, cfg))).toBe(true);
  });
  test('stale bindings,duplicates,orphans,missing rows,extra fields and forged spans reject', () => {
    const p = core.blank(cfg);
    for (const bad of [{ ...p, bindingSha256: 'd'.repeat(64) }, { ...p, entries: p.entries.slice(1) },
      { ...p, entries: [p.entries[0], p.entries[0], p.entries[2]] }, { ...p, entries: [{ ...p.entries[0], id: 'query' }, ...p.entries.slice(1)] },
      { ...p, truth: 'a' }]) expect(() => core.validateProgress(bad, cfg)).toThrow();
    const bad = observation('ref-a', '600ml', { quantity: '600ml' }); bad.fields.quantity!.text = '750ml';
    expect(() => core.validateProgress({ ...p, entries: [bad, ...p.entries.slice(1)] }, cfg)).toThrow('LABEL_SOURCE_SPAN');
  });
  test('strict JSON rejects duplicate/nonfinite/unsafe keys but retains literal HTML text', () => {
    for (const text of ['{"x":1,"x":2}', '{"x":NaN}', '{"x":1e999}', '{"__proto__":{}}']) expect(() => core.strictJson(text)).toThrow();
    expect(core.strictJson('{"text":"<script>literal</script>"}')).toEqual({ text: '<script>literal</script>' });
  });
});

describe('LE-C1 partial characters are unknown, never explicit contradictions', () => {
  test('exact coordinator counterexample Mea600ml preserves correct/wrong/rival visual order', () => {
    const visual = ['correct', 'wrong', 'rival'].map((productId, i) => ({ productId, score: .99 - i * .1, nearestReferenceId: 'ref-' + productId }));
    const cards = quantityCards('600ml', '600ml', '750ml').map((c, i) => ({ ...c, productId: visual[i].productId,
      values: { ...c.values, brandName: i === 0 ? 'meadow' : null, variant: null } }));
    const q = observation('generated-query', 'Mea 600ml', { brandName: 'Mea', quantity: '600ml' }, 'partial');
    const result = core.assist(q, visual, cards);
    expect(result.candidates).toEqual(visual); expect(result.reason).toBe('PARTIAL'); expect(result.promoted).toBe(false);
    expect(result.evidence.every(e => !e.contradicted && !e.supported && Object.values(e.perField).every(v => v === 'UNKNOWN'))).toBe(true);
  });
  for (const field of core.fields) {
    test('partial query ' + field + ' fragment abstains without scores/order changes', () => {
      const cards = quantityCards('600ml', field === 'quantity' ? '60ml' : '600ml', '750ml');
      if (field !== 'quantity') cards.forEach((c, i) => { c.values[field] = i === 0 ? 'meadow' : null; });
      const literal = field === 'quantity' ? '60ml' : 'Mea 600ml';
      const selected = field === 'quantity' ? { quantity: '60ml' } : { [field]: 'Mea', quantity: '600ml' };
      const result = core.assist(observation('q', literal, selected, 'partial'), candidates, cards);
      expect(result.candidates).toEqual(candidates); expect(result.promoted).toBe(false); expect(result.manualConfirmation).toBe(false);
      expect(result.reason).toBe('PARTIAL'); expect(result.evidence.every(e => !e.contradicted)).toBe(true);
    });
    test('partial reference ' + field + ' fragment cannot exclude correct or supply decisive support', () => {
      const a = field === 'quantity' ? observation('ref-a', '60ml', { quantity: '60ml' }, 'partial') :
        observation('ref-a', 'Mea 600ml', { [field]: 'Mea', quantity: '600ml' }, 'partial');
      const refs = [a, observation('ref-b', '600ml', { quantity: '600ml' }), observation('ref-c', '750ml', { quantity: '750ml' })];
      const cards = core.referenceCards(refs, metadata);
      expect(cards[0].values).toEqual({ brandName: null, variant: null, quantity: null });
      expect(Object.values(cards[0].support).every(spans => spans.length === 0)).toBe(true);
      const q = field === 'quantity' ? observation('q', '600ml', { quantity: '600ml' }) : observation('q', 'Meadow 600ml', { [field]: 'Meadow', quantity: '600ml' });
      const result = core.assist(q, candidates, cards);
      expect(result.candidates).toEqual(candidates); expect(result.evidence[0].contradicted).toBe(false);
      expect(result.evidence[0].perField[field]).toBe('UNKNOWN'); expect(result.promoted).toBe(false);
    });
  }
  test('a fully readable reference alone remains usable; partial siblings cannot taint its card', () => {
    const refs = [metadata[0], { ...metadata[0], id: 'ref-a-partial' }, ...metadata.slice(1)];
    const cards = core.referenceCards([observation('ref-a', '600ml', { quantity: '600ml' }),
      observation('ref-a-partial', '60ml', { quantity: '60ml' }, 'partial'),
      observation('ref-b', '750ml', { quantity: '750ml' }), observation('ref-c', '900ml', { quantity: '900ml' })], refs);
    expect(cards[0].values.quantity).toEqual(core.normalizeQuantity('0.6L'));
    expect(cards[0].support.quantity.map(e => e.entryId)).toEqual(['ref-a']);
    expect(core.assist(observation('q', '0.6L', { quantity: '0.6L' }), candidates, cards).reason).toBe('SOLE_SUPPORT_EVERY_RIVAL_CONTRADICTED');
  });
  test('partial literal/spans survive validated progress and reviewed accounting', () => {
    const cfg = { bindingSha256: 'b'.repeat(64), ruleSha256: 'c'.repeat(64), scope: 'references' as const, entries: metadata };
    const progress = core.blank(cfg);
    progress.entries = metadata.map(m => observation(m.id, 'Mea 60ml', { brandName: 'Mea', quantity: '60ml' }, 'partial'));
    const validated = core.validateProgress(core.strictJson(JSON.stringify(progress)), cfg);
    expect(validated.entries).toEqual(progress.entries); expect(core.complete(validated)).toBe(true);
    expect(core.observe(validated.entries[0])).toEqual({ values: { brandName: null, variant: null, quantity: null }, abstain: 'PARTIAL' });
  });
});
