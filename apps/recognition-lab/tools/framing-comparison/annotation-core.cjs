'use strict';
// Pure browser/Node coordinate and import contract. No filesystem/network API.
(function (scope) {
  const keys = (v, list) => v && typeof v === 'object' && !Array.isArray(v) &&
    Object.keys(v).sort().join('|') === list.slice().sort().join('|');
  const integer = v => Number.isSafeInteger(v) && v >= 0 && v <= 50000000;
  function effectiveBox(b, w, h) {
    if (!keys(b, ['left', 'top', 'right', 'bottom']) || !Object.values(b).every(integer) ||
        !integer(w) || !integer(h) || w < 1 || h < 1 || w * h > 50000000 ||
        b.left >= b.right || b.top >= b.bottom || b.right > w || b.bottom > h) throw Error('INVALID_BOX');
    const x = Math.ceil((b.right - b.left) / 20), y = Math.ceil((b.bottom - b.top) / 20);
    return { left: Math.max(0, b.left - x), top: Math.max(0, b.top - y), right: Math.min(w, b.right + x), bottom: Math.min(h, b.bottom + y) };
  }
  function imagePoint(x, y, rect, width, height) {
    if (![x, y, rect.left, rect.top, rect.width, rect.height].every(Number.isFinite) || rect.width <= 0 || rect.height <= 0)
      throw Error('INVALID_DISPLAY');
    return { x: Math.max(0, Math.min(width, Math.round((x - rect.left) * width / rect.width))),
      y: Math.max(0, Math.min(height, Math.round((y - rect.top) * height / rect.height))) };
  }
  // Parse without silent duplicate-key overwrites. Only strict JSON tokens.
  function strictJson(text) {
    if (typeof text !== 'string' || text.length > 4 * 1024 * 1024) throw Error('INVALID_JSON');
    let i = 0;
    const ws = () => { while (/[ \t\r\n]/.test(text[i] || '') && i < text.length) i++; };
    function string() {
      const start = i++; let escape = false;
      while (i < text.length) { const c = text[i++]; if (c === '"' && !escape) return JSON.parse(text.slice(start, i));
        if (c === '\\' && !escape) escape = true; else escape = false; }
      throw Error('INVALID_JSON');
    }
    function value() {
      ws(); if (text[i] === '"') return string();
      if (text[i] === '{') {
        i++; ws(); const out = Object.create(null), seen = new Set();
        if (text[i] === '}') { i++; return out; }
        while (true) {
          ws(); if (text[i] !== '"') throw Error('INVALID_JSON'); const k = string();
          if (seen.has(k)) throw Error('DUPLICATE_KEY'); seen.add(k); ws();
          if (text[i++] !== ':') throw Error('INVALID_JSON'); out[k] = value(); ws();
          const c = text[i++]; if (c === '}') return out; if (c !== ',') throw Error('INVALID_JSON');
        }
      }
      if (text[i] === '[') { i++; ws(); const out = []; if (text[i] === ']') { i++; return out; }
        while (true) { out.push(value()); ws(); const c = text[i++]; if (c === ']') return out; if (c !== ',') throw Error('INVALID_JSON'); } }
      const m = /^(?:true|false|null|-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)/.exec(text.slice(i));
      if (!m) throw Error('INVALID_JSON'); i += m[0].length; const out = JSON.parse(m[0]);
      if (typeof out === 'number' && !Number.isFinite(out)) throw Error('NONFINITE_JSON'); return out;
    }
    const out = value(); ws(); if (i !== text.length) throw Error('INVALID_JSON'); return out;
  }
  function validateProgress(progress, comparison, hash, recipe) {
    if (!keys(progress, ['schemaVersion', 'comparisonSha256', 'recipeSha256', 'entries']) || progress.schemaVersion !== 1 ||
        progress.comparisonSha256 !== hash || progress.recipeSha256 !== recipe || !Array.isArray(progress.entries) ||
        progress.entries.length !== 40 || new Set(progress.entries.map(e => e.id)).size !== 40) throw Error('PROGRESS_BINDING');
    const entries = progress.entries.map(e => {
      if (!keys(e, ['id', 'assetSha256', 'width', 'height', 'orientation', 'confirmedIdentity', 'issue', 'markedBox', 'effectiveBox'])) throw Error('PROGRESS_KEYS');
      const f = comparison.frames.find(f => f.id === e.id);
      if (!f || ['assetSha256', 'width', 'height', 'orientation'].some(k => f[k] !== e[k]) ||
          typeof e.confirmedIdentity !== 'boolean' || !['none', 'not-reviewed', 'identity', 'bounds'].includes(e.issue)) throw Error('PROGRESS_FRAME');
      const effective = e.markedBox === null ? null : effectiveBox(e.markedBox, e.width, e.height);
      if (effective === null ? e.effectiveBox !== null : !keys(e.effectiveBox, ['left', 'top', 'right', 'bottom']) ||
          Object.keys(effective).some(k => effective[k] !== e.effectiveBox[k])) throw Error('PROGRESS_PADDING');
      return { id: e.id, assetSha256: e.assetSha256, width: e.width, height: e.height, orientation: e.orientation,
        confirmedIdentity: e.confirmedIdentity, issue: e.issue, markedBox: e.markedBox,
        effectiveBox: effective };
    });
    return { schemaVersion: 1, comparisonSha256: hash, recipeSha256: recipe, entries };
  }
  const api = { effectiveBox, imagePoint, strictJson, validateProgress };
  if (typeof module !== 'undefined') module.exports = api; else scope.FramingAnnotations = api;
})(globalThis);
