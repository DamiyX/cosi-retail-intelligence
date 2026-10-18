import { mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { datasetSchema } from '../src/schema.ts';
import { importDataset, validateDataset, IntegrityError } from '../src/importer.ts';

const root = resolve(__dirname, '../fixtures');
const fixture = () => datasetSchema.parse(JSON.parse(readFileSync(resolve(root, 'dataset.json'), 'utf8')));
function codes(input: unknown, approvedRoot = root) {
  try { validateDataset(input, approvedRoot); throw new Error('expected rejection'); }
  catch (error) { expect(error).toBeInstanceOf(IntegrityError); return (error as IntegrityError).issues.map(i => i.code); }
}
test('valid fixture preserves all split/permission/provenance metadata without exposing paths', () => {
  const imported = importDataset(resolve(root, 'dataset.json'), root);
  expect(imported.dataset).toEqual(fixture());
  expect(imported.integrity.status).toBe('VALID');
  expect(JSON.stringify(imported.integrity)).not.toContain(root);
});
test('rejects exact reference/query duplicate even with different entry/session IDs', () => {
  const data = fixture(); data.entries[2].asset = { ...data.entries[0].asset };
  expect(codes(data)).toContain('EXACT_DUPLICATE_LEAKAGE');
});
test('rejects reference/query sessions even within development', () => {
  const data = fixture(); data.entries[2].captureSession = data.entries[0].captureSession;
  expect(codes(data)).toContain('CAPTURE_SESSION_LEAKAGE');
});
test('rejects split overlap for both capture sessions and exact query hashes', () => {
  const data = fixture(); const query = { ...data.entries[2], id: 'holdout-copy', split: 'holdout' as const };
  data.entries.push(query);
  expect(codes(data)).toEqual(expect.arrayContaining(['CAPTURE_SESSION_LEAKAGE', 'EXACT_DUPLICATE_LEAKAGE']));
});
test.each(['wrong-product', 'wrong-package', 'unknown-enrolled', 'known-absent', 'duplicate-package', 'reference-holdout'])('rejects %s relations', condition => {
  const data = fixture();
  if (condition === 'wrong-product') data.entries[2].productId = 'absent';
  if (condition === 'wrong-package') data.entries[2].packageId = 'single-b';
  if (condition === 'unknown-enrolled') { data.entries[3].productId = 'a'; data.entries[3].packageId = 'single'; }
  if (condition === 'known-absent') data.entries[3].known = true;
  if (condition === 'duplicate-package') data.products[1].packages.push('single');
  if (condition === 'reference-holdout') data.entries[0].split = 'holdout';
  expect(codes(data).length).toBeGreaterThan(0);
});
test.each(['rights', 'capture', 'packagingGeneration', 'captureSession'])('requires %s metadata', field => {
  const data = fixture(); delete (data.entries[2] as unknown as Record<string, unknown>)[field];
  expect(codes(data)).toContain('MANIFEST_SCHEMA');
});
test.each(['../outside.jpg', '/outside.jpg', 'C:/outside.jpg', 'https://example.com/photo.jpg', 'assets/../q-a.txt', 'assets\\q-a.txt'])('rejects unapproved locator %s', locator => {
  const data = fixture(); data.entries[2].asset.path = locator;
  expect(codes(data)).toContain('ASSET_PATH');
});
test('reports unavailable assets and mismatched content hash separately', () => {
  const data = fixture(); data.entries[2].asset.path = 'assets/missing.txt';
  expect(codes(data)).toContain('ASSET_UNAVAILABLE');
  data.entries[2].asset = { path: 'assets/q-a.txt', sha256: '0'.repeat(64) };
  expect(codes(data)).toContain('ASSET_HASH');
});
test('refuses manifest outside explicit approved root and malformed JSON', () => {
  expect(() => importDataset(resolve(root, 'dataset.json'), resolve(root, 'assets'))).toThrow('Dataset rejected');
  const out = resolve(__dirname, '../runs'); mkdirSync(out, { recursive: true });
  const dir = mkdtempSync(resolve(out, 'invalid-')); writeFileSync(resolve(dir, 'bad.json'), '{');
  expect(() => importDataset(resolve(dir, 'bad.json'), dir)).toThrow('Dataset rejected');
});
test('follows canonical confinement so a directory junction cannot escape the root', () => {
  const out = resolve(__dirname, '../runs'); mkdirSync(out, { recursive: true });
  const dir = mkdtempSync(resolve(out, 'junction-'));
  symlinkSync(root, resolve(dir, 'escape'), 'junction');
  const data = fixture(); data.entries[2].asset.path = 'escape/assets/q-a.txt';
  expect(codes(data, dir)).toContain('ASSET_PATH');
});
