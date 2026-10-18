'use strict';
// Pure shared browser/Node contract. No files, network, truth labels or images.
(function (scope) {
  const fields = ['brandName', 'variant', 'quantity'];
  const states = ['not-reviewed', 'readable', 'partial', 'unreadable', 'no-text', 'conflicting'];
  const rule = Object.freeze({ version: 'unique-support-all-rivals-contradicted-v1',
    candidateLimit: 3, exactText: 'lowercase-and-whitespace-only', maxLiteral: 4096,
    quantityDigits: 6, quantityFractionDigits: 3, unknownRivalBlocksPromotion: true });
  function fail(code) { throw Error(code); }
  function keys(v, expected) {
    return v !== null && typeof v === 'object' && !Array.isArray(v) &&
      Object.keys(v).sort().join('|') === expected.slice().sort().join('|');
  }
  function text(v, max) { return typeof v === 'string' && v.length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v); }
  function canonical(v) {
    if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
    if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}';
    return JSON.stringify(v);
  }
  function strictJson(raw) {
    if (typeof raw !== 'string' || raw.length > 4 * 1024 * 1024) fail('LABEL_JSON_SIZE');
    let i = 0;
    const ws = () => { while (/\s/.test(raw[i] || '') && i < raw.length) i++; };
    function string() {
      const start = i++; while (i < raw.length) {
        const c = raw[i++]; if (c === '\\') { i++; continue; }
        if (c === '"') return JSON.parse(raw.slice(start, i));
      } fail('LABEL_JSON_INVALID');
    }
    function value(depth) {
      if (depth > 32) fail('LABEL_JSON_DEPTH'); ws();
      if (raw[i] === '{') {
        i++; ws(); const seen = new Set(); if (raw[i] === '}') { i++; return; }
        while (true) {
          ws(); if (raw[i] !== '"') fail('LABEL_JSON_INVALID'); const k = string();
          if (seen.has(k) || ['__proto__', 'prototype', 'constructor'].includes(k)) fail('LABEL_DUPLICATE_OR_UNSAFE_KEY'); seen.add(k);
          ws(); if (raw[i++] !== ':') fail('LABEL_JSON_INVALID'); value(depth + 1); ws();
          if (raw[i] === '}') { i++; break; } if (raw[i++] !== ',') fail('LABEL_JSON_INVALID');
        }
      } else if (raw[i] === '[') {
        i++; ws(); if (raw[i] === ']') { i++; return; }
        while (true) { value(depth + 1); ws(); if (raw[i] === ']') { i++; break; } if (raw[i++] !== ',') fail('LABEL_JSON_INVALID'); }
      } else if (raw[i] === '"') string();
      else { const m = /^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(raw.slice(i)); if (!m) fail('LABEL_JSON_INVALID'); i += m[0].length; }
    }
    value(0); ws(); if (i !== raw.length) fail('LABEL_JSON_INVALID');
    const result = JSON.parse(raw);
    function finite(v) { if (typeof v === 'number' && !Number.isFinite(v)) fail('LABEL_JSON_NONFINITE'); if (v && typeof v === 'object') Object.values(v).forEach(finite); }
    finite(result); return result;
  }
  function validateEntry(e, expected) {
    if (!keys(e, ['id', 'assetSha256', 'readability', 'literal', 'fields']) ||
        e.id !== expected.id || e.assetSha256 !== expected.assetSha256 || !states.includes(e.readability) ||
        !text(e.literal, rule.maxLiteral) || !keys(e.fields, fields)) fail('LABEL_ENTRY_BINDING_OR_SCHEMA');
    for (const name of fields) {
      const s = e.fields[name]; if (s === null) continue;
      if (!keys(s, ['start', 'end', 'text']) || !Number.isSafeInteger(s.start) || !Number.isSafeInteger(s.end) ||
          s.start < 0 || s.end <= s.start || s.end > e.literal.length || !text(s.text, 512) ||
          s.text.trim().length === 0 || e.literal.slice(s.start, s.end) !== s.text) fail('LABEL_SOURCE_SPAN');
    }
    if (['not-reviewed', 'unreadable', 'no-text'].includes(e.readability) &&
        (e.literal !== '' || fields.some(k => e.fields[k] !== null))) fail('LABEL_READABILITY_FIELDS');
    if (['readable', 'partial', 'conflicting'].includes(e.readability) && !e.literal.trim()) fail('LABEL_LITERAL_REQUIRED');
    return e;
  }
  function validateProgress(v, config) {
    if (!keys(v, ['schemaVersion', 'kind', 'bindingSha256', 'ruleSha256', 'scope', 'entries']) ||
        v.schemaVersion !== 1 || v.kind !== 'LABEL_TEXT_REVIEW' || v.bindingSha256 !== config.bindingSha256 ||
        v.ruleSha256 !== config.ruleSha256 || v.scope !== config.scope || !Array.isArray(v.entries) ||
        v.entries.length !== config.entries.length) fail('LABEL_PROGRESS_BINDING');
    const seen = new Set(); const entries = v.entries.map(e => {
      const f = config.entries.find(f => f.id === e.id);
      if (!f || seen.has(e.id)) fail('LABEL_DUPLICATE_OR_ORPHAN_ENTRY'); seen.add(e.id); return validateEntry(e, f);
    });
    return { ...v, entries: entries.slice().sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0) };
  }
  function blank(config) {
    return { schemaVersion: 1, kind: 'LABEL_TEXT_REVIEW', bindingSha256: config.bindingSha256,
      ruleSha256: config.ruleSha256, scope: config.scope, entries: config.entries.map(e => ({ id: e.id,
        assetSha256: e.assetSha256, readability: 'not-reviewed', literal: '',
        fields: { brandName: null, variant: null, quantity: null } })) };
  }
  function complete(progress) { return progress.entries.every(e => e.readability !== 'not-reviewed'); }
  function normalizeText(v) { return v.toLowerCase().replace(/\s+/g, ' ').trim(); }
  function quantitySafety(literal) {
    if (/%|\bper\s*cent\b/i.test(literal)) return 'PERCENTAGE';
    if (/\b\d+\s*(?:x|×|\*)\s*\d|\b\d+(?:\.\d+)?\s*(?:ml|kg|mg|l|g)\s*(?:x|×|\*)\s*\d|\b(?:multipack|pack\s+of)\b|\b\d+\s*(?:pk|pack|bottles|cans)\b/i.test(literal)) return 'MULTIPACK';
    const matches = literal.match(/\b\d+(?:\.\d+)?\s*(?:ml|kg|mg|l|g|pcs?|units?|count)\b/gi) || [];
    if (matches.length > 1) return 'MULTIPLE_QUANTITIES';
    if (/\b[\dOoIl?]*[OoIl?][\dOoIl?]*\s*(?:ml|kg|mg|l|g|pcs?|units?|count)\b/.test(literal)) return 'UNCLEAR_DIGITS';
    return null;
  }
  function normalizeQuantity(raw) {
    if (!text(raw, 512)) return null;
    const m = /^(\d{1,6})(?:\.(\d{1,3}))?\s*(ml|l|mg|g|kg|pc|pcs|unit|units|count)$/.exec(normalizeText(raw));
    if (!m) return null;
    const unit = m[3], fraction = m[2] || '', scale = 10n ** BigInt(fraction.length);
    const value = BigInt(m[1]) * scale + BigInt(fraction || '0');
    const multiplier = { ml: 1000n, l: 1000000n, mg: 1n, g: 1000n, kg: 1000000n, pc: 1n, pcs: 1n, unit: 1n, units: 1n, count: 1n }[unit];
    if (value === 0n || value * multiplier % scale !== 0n) return null;
    const baseInteger = value * multiplier / scale;
    if (baseInteger > 1000000000000n) return null;
    const dimension = ['ml', 'l'].includes(unit) ? 'volume' : ['mg', 'g', 'kg'].includes(unit) ? 'mass' : 'count';
    if (dimension === 'count' && fraction) return null;
    return { dimension, baseInteger: baseInteger.toString(), baseUnit: dimension === 'volume' ? 'microlitre' : dimension === 'mass' ? 'milligram' : 'unit' };
  }
  function observe(e) {
    const values = { brandName: null, variant: null, quantity: null };
    const blocked = ['not-reviewed', 'partial', 'unreadable', 'no-text', 'conflicting'].includes(e.readability);
    const unsafe = !blocked ? quantitySafety(e.literal) : null;
    if (!blocked) for (const name of fields) {
      const s = e.fields[name]; if (s) values[name] = name === 'quantity' ? normalizeQuantity(s.text) : normalizeText(s.text);
    }
    return { values, abstain: blocked ? e.readability.toUpperCase().replaceAll('-', '_') : unsafe ||
      (e.fields.quantity && !values.quantity ? 'UNCLEAR_OR_UNSUPPORTED_QUANTITY' : null) };
  }
  function referenceCards(entries, metadata) {
    if (metadata.some(e => e.role !== 'reference' || typeof e.productId !== 'string') ||
        new Set(metadata.map(e => e.id)).size !== metadata.length) fail('LABEL_REFERENCE_ROLE');
    const cards = [];
    for (const productId of [...new Set(metadata.map(e => e.productId))].sort()) {
      const refs = metadata.filter(e => e.productId === productId);
      const values = {}; const support = {}; const reasons = {};
      for (const field of fields) {
        const found = [];
        for (const ref of refs) {
          const e = entries.find(e => e.id === ref.id); if (!e) fail('LABEL_REFERENCE_MISSING');
          const o = observe(e); if (!o.abstain && o.values[field] !== null) found.push({ value: o.values[field], entryId: e.id, span: e.fields[field] });
        }
        const unique = [...new Set(found.map(e => canonical(e.value)))];
        values[field] = unique.length === 1 ? found[0].value : null;
        support[field] = unique.length === 1 ? found.map(e => ({ entryId: e.entryId, span: e.span })) : [];
        reasons[field] = unique.length > 1 ? 'CONFLICTING_REFERENCE_TRANSCRIPTION' : unique.length === 0 ? 'MISSING_REFERENCE_EVIDENCE' : 'REFERENCE_ENTRY_SPANS';
      }
      cards.push({ productId, values, support, reasons });
    }
    return cards;
  }
  function assist(observation, candidates, cards) {
    // Deliberately no query ID, truth, label, full gallery or recognition state.
    if (candidates.length > 3 || new Set(candidates.map(c => c.productId)).size !== candidates.length) fail('LABEL_CANDIDATE_LIMIT');
    const o = observe(observation);
    const evidence = candidates.map(c => {
      const card = cards.find(r => r.productId === c.productId);
      const perField = Object.fromEntries(fields.map(field => {
        const q = o.values[field], r = card ? card.values[field] : null;
        return [field, q === null || r === null ? 'UNKNOWN' : canonical(q) === canonical(r) ? 'SUPPORT' : 'CONTRADICTION'];
      }));
      const contradicted = Object.values(perField).includes('CONTRADICTION');
      return { productId: c.productId, perField, contradicted,
        supported: !contradicted && Object.values(perField).includes('SUPPORT') };
    });
    const supported = evidence.filter(e => e.supported);
    const allContradicted = evidence.length > 0 && evidence.every(e => e.contradicted);
    const promote = !o.abstain && supported.length === 1 && evidence.filter(e => e !== supported[0]).every(e => e.contradicted);
    const winner = promote ? supported[0].productId : null;
    const ordered = winner ? [...candidates.filter(c => c.productId === winner), ...candidates.filter(c => c.productId !== winner)] : candidates.slice();
    return { candidates: ordered, evidence, promoted: winner !== null && candidates[0]?.productId !== winner,
      manualConfirmation: !o.abstain && allContradicted,
      reason: o.abstain || (allContradicted ? 'ALL_CANDIDATES_CONTRADICT_MANUAL_CONFIRMATION' : promote ? 'SOLE_SUPPORT_EVERY_RIVAL_CONTRADICTED' :
        supported.length > 1 ? 'MULTIPLE_SUPPORTED_PRESERVE_VISUAL' : 'INSUFFICIENT_EVIDENCE_PRESERVE_VISUAL') };
  }
  const api = Object.freeze({ rule, fields, states, keys, canonical, strictJson, validateEntry, validateProgress, blank, complete,
    normalizeText, normalizeQuantity, quantitySafety, observe, referenceCards, assist });
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else scope.LabelEvidence = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
