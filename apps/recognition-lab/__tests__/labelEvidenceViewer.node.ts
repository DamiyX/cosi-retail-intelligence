import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { webcrypto } from 'node:crypto';
import { core } from '../src/labelEvidenceSchema.ts';
import { sha256 } from '../src/provenance.ts';
import { retrievalLab } from '../src/retrievalPaths.ts';

// Unit harness only: no browser, layout engine, images, pixels or external navigation.
function viewer() {
  type Element = { value: string; textContent: string; disabled: boolean; hidden: boolean; style: Record<string, string>;
    src: string; naturalWidth: number; naturalHeight: number; selectionStart: number; selectionEnd: number;
    removeAttribute: (key: string) => void; append: (node: unknown) => void; click: () => void;
    [key: string]: unknown };
  const elements: Record<string, Element> = {}, downloads: { href?: string; download?: string }[] = [], blobs = new Map<string, Blob>();
  const get = (id: string) => elements[id] ??= { value: id === 'zoom' ? '1' : '', textContent: '', disabled: false, hidden: false,
    style: {}, src: '', naturalWidth: 100, naturalHeight: 80, selectionStart: 0, selectionEnd: 0,
    removeAttribute(key: string) { this[key] = ''; }, append() {}, click() {} };
  const raw = Buffer.from('generated file buffer'), digest = sha256(raw);
  const config = { bindingSha256: 'b'.repeat(64), ruleSha256: 'c'.repeat(64), scope: 'queries' as const, maxImageBytes: 4096,
    entries: [{ id: 'generated-query', role: 'query' as const, assetSha256: digest, width: 100, height: 80, orientation: 1,
      effectiveBox: { left: 10, top: 5, right: 70, bottom: 65 } }] };
  let counter = 0;
  const context = { LabelEvidence: core, LABEL_CONFIG: config, crypto: webcrypto, Uint8Array, Blob, setTimeout() {},
    document: { getElementById: get, createElement: (tag: string) => tag === 'a' ? { href: '', download: '', click() { downloads.push(this); } } : {} },
    URL: { createObjectURL(value: Blob) { const url = 'blob:unit-' + ++counter; blobs.set(url, value); return url; }, revokeObjectURL() {} } };
  runInNewContext(readFileSync(resolve(retrievalLab, 'tools/label-evidence/review-ui.js'), 'utf8'), context);
  const call = async (id: string, method: string, event?: unknown) => { await (get(id)[method] as (e?: unknown) => unknown)(event); };
  const file = { size: raw.length, arrayBuffer: async () => raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) };
  return { get, call, file, config, blobs, downloads };
}

test('viewer unit: SHA matching, frozen crop geometry, zoom and stale image events', async () => {
  const v = viewer(); assert.equal(v.get('editor').disabled, true); assert.equal(v.get('complete').disabled, true);
  await v.call('files', 'onchange', { target: { files: [v.file] } });
  assert.equal(v.get('editor').disabled, true); const oldLoad = v.get('image').onload as () => void;
  await v.call('image', 'onload'); assert.equal(v.get('editor').disabled, false); assert.equal(v.get('crop').style.width, '60px');
  assert.equal(v.get('image').style.left, '-10px'); v.get('zoom').value = '2'; await v.call('zoom', 'oninput');
  assert.equal(v.get('crop').style.width, '120px'); assert.equal(v.get('crop').style.height, '120px');
  assert.equal(v.get('image').style.width, '200px'); assert.equal(v.get('image').style.top, '-10px');
  await v.call('next', 'onclick'); oldLoad(); assert.equal(v.get('editor').disabled, true);
  v.get('image').naturalWidth = 99; await v.call('image', 'onload'); assert.equal(v.get('editor').disabled, true);
  assert.match(v.get('status').textContent, /dimensions differ/);
});
test('viewer unit: text-only partial export/import, literal spans and completion gating', async () => {
  const v = viewer(); await v.call('save', 'onclick');
  const partial = JSON.parse(await v.blobs.get(v.downloads[0].href!)!.text()); assert.equal(partial.entries.length, 1);
  assert.equal(partial.entries[0].readability, 'not-reviewed'); assert.ok(!('image' in partial));
  await v.call('files', 'onchange', { target: { files: [v.file] } }); await v.call('image', 'onload');
  v.get('readability').value = 'readable'; await v.call('readability', 'onchange'); assert.equal(v.get('complete').disabled, true);
  v.get('literal').value = '600ml'; await v.call('literal', 'oninput');
  v.get('literal').selectionStart = 0; v.get('literal').selectionEnd = 5; await v.call('set-quantity', 'onclick');
  assert.equal(v.get('complete').disabled, false); await v.call('complete', 'onclick');
  const done = JSON.parse(await v.blobs.get(v.downloads[1].href!)!.text());
  assert.equal(done.entries[0].fields.quantity.text, '600ml');
  v.get('literal').value = '750ml'; await v.call('literal', 'oninput'); assert.match(v.get('fields').textContent, /"quantity": null/);
  await v.call('import', 'onchange', { target: { files: [{ size: 200, text: async () => JSON.stringify(done) }] } });
  assert.equal(v.get('literal').value, '600ml'); assert.equal(v.get('complete').disabled, false);
  const bad = { ...done, bindingSha256: 'd'.repeat(64) };
  await v.call('import', 'onchange', { target: { files: [{ size: 200, text: async () => JSON.stringify(bad) }] } });
  assert.match(v.get('status').textContent, /Import rejected/); assert.equal(v.get('literal').value, '600ml');
});
test('viewer unit: rejected/duplicate local files preserve selection and visible errors', async () => {
  const v = viewer(); await v.call('files', 'onchange', { target: { files: [v.file] } });
  await v.call('files', 'onchange', { target: { files: [v.file, v.file] } });
  assert.match(v.get('status').textContent, /LABEL_UNKNOWN_OR_DUPLICATE_FILE/);
  assert.match(v.get('completion').textContent, /1 matching selected files/);
  const bad = { size: 3, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer };
  await v.call('files', 'onchange', { target: { files: [bad] } }); assert.match(v.get('status').textContent, /LABEL_UNKNOWN_OR_DUPLICATE_FILE/);
  assert.match(v.get('completion').textContent, /1 matching selected files/);
});
