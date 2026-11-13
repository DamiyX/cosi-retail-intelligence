import fs from 'node:fs';
import path from 'node:path';
import { validateObservedJournal, validateObservedState } from '../src/phoneCapture/observedEnrollment.ts';

const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/observed-enrollment-codec.json'), 'utf8')) as { fixtureKind: string; state: string; events: Record<string, string> };
const state = () => Buffer.from(fixture.state, 'base64');
const events = () => new Map(Object.entries(fixture.events).map(([name, bytes]) => [name, Buffer.from(bytes, 'base64')]));
describe('native observed codec read-only validator', () => {
  it('validates the actual Java barcode journal state without claiming detector or photographic evidence', () => {
    const generated = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/observed-barcode-codec.json'), 'utf8')) as { fixtureKind: string; state: string };
    expect(generated.fixtureKind).toBe('GENERATED_GTIN_STATE_ONLY_NO_PHOTOS');
    const result = validateObservedState(Buffer.from(generated.state, 'base64'));
    expect(result.products[0].barcode).toBe('CONFIRMED'); expect(result.products[0].barcodeValue).toBe('036000291452');
    expect(result.products[1].barcode).toBe('UNREADABLE'); expect(result.physicalEvidenceVerified).toBe(false);
    expect(result.products.every(product => product.views.every(view => view === null))).toBe(true);
  });
  it('rejects corruption of an acquired barcode rather than accepting its stored disposition', () => {
    const generated = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/observed-barcode-codec.json'), 'utf8')) as { state: string };
    const bytes = Buffer.from(generated.state, 'base64'); const codeAt = bytes.indexOf('036000291452'); expect(codeAt).toBeGreaterThan(0);
    bytes[codeAt + 11] = '3'.charCodeAt(0); expect(() => validateObservedState(bytes)).toThrow();
  });
  it('reads actual Java codec bytes and never promotes the generated fixture to physical proof', () => {
    expect(fixture.fixtureKind).toBe('GENERATED_1024_VECTOR_CODEC_ONLY'); const result = validateObservedState(state());
    expect(result.vectorDimension).toBe(1024); expect(result.products[0].views.filter(Boolean)).toHaveLength(4);
    expect(result.products[0].encodedBytes).toBeLessThanOrEqual(32768); expect(result.frozen).toBe(result.gallerySha256); expect(result.physicalEvidenceVerified).toBe(false);
  });
  it.each(['trailing', 'truncated', 'oversize', 'version', 'unreviewed barcode', 'wrong model', 'nonfinite', 'unnormalized'])('rejects %s data', kind => {
    let bytes = state();
    if (kind === 'trailing') bytes = Buffer.concat([bytes, Buffer.from([0])]);
    if (kind === 'truncated') bytes = bytes.subarray(0, bytes.length - 4096);
    if (kind === 'oversize') bytes = Buffer.alloc(360449);
    if (kind === 'version') bytes.writeInt32BE(2);
    if (kind === 'unreviewed barcode') bytes[4] = 1;
    const marker = Buffer.from('bbbb4c51a55a53905af1daec995ca1aae355046f8839bb8c9f5ce9271394bc40'); const modelAt = bytes.indexOf(marker);
    if (kind === 'wrong model') bytes[modelAt] = 'a'.charCodeAt(0);
    if (kind === 'nonfinite') bytes.writeFloatBE(Infinity, modelAt + marker.length);
    if (kind === 'unnormalized') bytes.writeFloatBE(2, modelAt + marker.length);
    expect(() => validateObservedState(bytes)).toThrow();
  });
  it('checks the real journal hash chain and retains an orphan without reusing its ID', () => {
    const files = events(), before = [...files].map(([name, value]) => [name, Buffer.from(value)] as const), count = files.size;
    files.set(`event-${String(count + 1).padStart(4, '0')}.new`, Buffer.from([1, 2, 3]));
    const result = validateObservedJournal(files); expect(result.sequence).toBe(count); expect(result.consumedEvents).toBe(count + 1); expect(result.orphanIds).toEqual([count + 1]); expect(result.physicalEvidenceVerified).toBe(false);
    for (const [name, bytes] of before) expect(files.get(name)).toEqual(bytes);
  });
  it.each(['gap', 'duplicate stage', 'body corruption', 'bad ID', 'foreign name', 'oversize stage'])('rejects journal %s', kind => {
    const files = events();
    if (kind === 'gap') files.delete('event-0002');
    if (kind === 'duplicate stage') files.set('event-0001.new', Buffer.from([1]));
    if (kind === 'body corruption') files.get('event-0001')![80] ^= 1;
    if (kind === 'bad ID') files.set('event-4097.new', Buffer.from([1]));
    if (kind === 'foreign name') files.set('../event-0001', Buffer.from([1]));
    if (kind === 'oversize stage') files.set('event-0001.new', Buffer.alloc(360705));
    expect(() => validateObservedJournal(files)).toThrow();
  });
});
