import fs from 'node:fs';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { RETAINED_PROOFS } from '../src/phoneCapture/enrollmentRetainedFacts.ts';
import { validateEnrollmentEvidence, type EvidenceBindings } from '../src/phoneCapture/enrollmentEvidence.ts';
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/generated-enrollment-evidence.json'), 'utf8')) as { fixtureKind: string; bytes: string; uncompressedBytes: number };
const original = gunzipSync(Buffer.from(fixture.bytes, 'base64'), { maxOutputLength: 3527168 });
// Registry identity is generated from the exact compiled source policy by the Java fixture.
function headerStrings(b: Buffer) { let at = b.readInt32BE(20); const values: string[] = []; for (let i = 0; i < 10; i++) { const n = b.readUInt16BE(at); at += 2; values.push(b.subarray(at, at + n).toString('utf8')); at += n; } return values; }
const fields = headerStrings(original);
const expected: EvidenceBindings = { source: 'a'.repeat(64), apk: 'b'.repeat(64), session: 'host-generated-evidence', report: 4, registry: fields[9] };
function mutate(change: (b: Buffer) => void) { const b = Buffer.from(original); change(b); createHash('sha256').update(b.subarray(0, -32)).digest().copy(b, b.length - 32); return b; }
function offset(b: Buffer, section: number) { return b.readInt32BE(20 + section * 12); }
it('validates full real-bound canonical Java data without claiming Android or photographic evidence', () => {
 expect(fixture.fixtureKind).toBe('JAVA_GENERATED_NO_PHOTOS_COHERENT_METADATA'); expect(original.length).toBe(fixture.uncompressedBytes);
 const report = validateEnrollmentEvidence(original, expected); expect(report.references).toBe(64); expect(report.witnessIds).toHaveLength(4096); expect(report.state?.products).toHaveLength(10); expect(report.state?.products.every(p => p.encodedBytes <= 32768 && p.views.every(Boolean))).toBe(true); expect(report.state?.frozen).toHaveLength(64); expect(report.state?.products[0].barcode).toBe('CONFIRMED'); expect(report.state?.products[0].barcodeValue).toBe('036000291452'); expect(report.physicalEvidenceVerified).toBe(false); expect(report.journalProof).toContain('WITNESS_LINKAGE_ONLY');
});
it.each(['source', 'apk', 'registry', 'session'] as const)('refuses changed expected %s', field => { expect(() => validateEnrollmentEvidence(original, { ...expected, [field]: 'changed' })).toThrow(); });
it('refuses wrong numbered report and trailing bytes', () => { expect(() => validateEnrollmentEvidence(original, { ...expected, report: 5 })).toThrow(); expect(() => validateEnrollmentEvidence(Buffer.concat([original, Buffer.from([0])]), expected)).toThrow(); });
it('rejects duplicate/overlapping section identities even with a repaired checksum', () => { expect(() => validateEnrollmentEvidence(mutate(b => b.writeInt32BE(1, 28)), expected)).toThrow(); expect(() => validateEnrollmentEvidence(mutate(b => b.writeInt32BE(76, 32)), expected)).toThrow(); });
it('rejects negative/overflow section lengths before allocation', () => { expect(() => validateEnrollmentEvidence(mutate(b => b.writeInt32BE(-1, 24)), expected)).toThrow(); expect(() => validateEnrollmentEvidence(mutate(b => b.writeInt32BE(2147483647, 24)), expected)).toThrow(); });
it('refuses a changed inventory sum and witness linkage', () => { expect(() => validateEnrollmentEvidence(mutate(b => { const at = offset(b, 4) + 8; b.writeBigInt64BE(b.readBigInt64BE(at) + 1n, at); }), expected)).toThrow(); expect(() => validateEnrollmentEvidence(mutate(b => { b[offset(b, 3) + 16] = 1; }), expected)).toThrow(); });
it('refuses witness admission usage beyond64', () => { expect(() => validateEnrollmentEvidence(mutate(b => b.writeInt32BE(65, offset(b, 3) + 112)), expected)).toThrow(); });
it('refuses nonfinite vectors and cross-product reference bindings', () => { expect(() => validateEnrollmentEvidence(mutate(b => b.writeUInt32BE(0x7fc00000, offset(b, 2) + 12 + 548)), expected)).toThrow(); expect(() => validateEnrollmentEvidence(mutate(b => b.writeInt32BE(9, offset(b, 2) + 12 + 4)), expected)).toThrow(); });
it('refuses missing active references and a changed feature digest', () => { expect(() => validateEnrollmentEvidence(mutate(b => b[offset(b, 2) + 20] ^= 1), expected)).toThrow(); const at = offset(original, 2), block = original.readInt32BE(at); expect(() => validateEnrollmentEvidence(mutate(b => b[at + block + 3] ^= 1), expected)).toThrow(); });

it('rejects changed latest body witnesses, unclassified roots and false validation flags', () => {
 expect(() => validateEnrollmentEvidence(mutate(b => b[offset(b, 3) + 4095 * 256 + 80] ^= 1), expected)).toThrow();
 expect(() => validateEnrollmentEvidence(mutate(b => b.writeInt32BE(99, offset(b, 4))), expected)).toThrow();
 expect(() => validateEnrollmentEvidence(mutate(b => b.writeInt32BE(4, offset(b, 4) + 84)), expected)).toThrow();
 expect(() => validateEnrollmentEvidence(mutate(b => b.writeInt32BE(99, offset(b, 4) + 80)), expected)).toThrow();
});
// Independent preflight serializer: no native codec, fixture snapshots or compression used.
function be(n: number) { const b = Buffer.alloc(4); b.writeInt32BE(n); return b; }
function utf(value: string) { const b = Buffer.from(value); const n = Buffer.alloc(2); n.writeUInt16BE(b.length); return Buffer.concat([n, b]); }
function preflight(descriptor: Buffer, roster: string) {
 const rows: Buffer[] = [];
 const roles: Record<string, number> = { 'owner.lock': 1, intent: 6, geometry: 26, 'original.jpeg': 27, 'crop.png': 28, receipt: 7, 'tensor.f32le': 31, 'cpu-intent': 32, 'cpu-receipt': 33, 'cpu-result': 34, 'export-attempt': 16, 'export-result': 35, session: 36, 'R01.intent': 501 };
 const row = (root: number, name: string, size: number, status: number) => { const b = Buffer.alloc(128); b.writeInt32BE(root); b.writeInt32BE(root < 100 ? 2 : 3, 4); b.writeBigInt64BE(BigInt(size), 8); createHash('sha256').update(name).digest().copy(b, 16); createHash('sha256').update(`INDEPENDENT_METADATA|${root}|${name}`).digest().copy(b, 48); b.writeInt32BE(name === '' ? 0 : roles[name.replace(/\.new$/, '')], 80); b.writeInt32BE(status, 84); rows.push(b); };
 let retained = 0;
 for (const [id, leaves] of Object.entries(RETAINED_PROOFS)) { row(Number(id), '', 0, 0); for (const [name, size] of Object.entries(leaves)) { row(Number(id), name, size, 2); retained += size; } }
 row(100, '', 0, 0); row(100, 'owner.lock', 0, 1); row(200, '', 0, 0); if (descriptor.length) row(200, 'session', descriptor.length, 5);
 const intentLength = 106 + expected.session.length; row(200, 'R01.intent', intentLength, 1);
 const measured = retained + descriptor.length + intentLength, reserved = 44172693 - retained + 4194304 + 65536 - intentLength, external = 8388608;
 const header = Buffer.concat([utf('p204-evidence-v1'), ...[expected.source, 'bbbb4c51a55a53905af1daec995ca1aae355046f8839bb8c9f5ce9271394bc40', 'native-component-roi-v2-u8-gray128-bilinear224-f32-div255-v1', 'observed-native-component-enrollment-v1', expected.apk, expected.session, roster, '0'.repeat(64), expected.registry].map(utf), be(1), be(0), be(0), Buffer.from([0]), be(descriptor.length), descriptor, be(0), be(0), be(1), ...[0, measured, reserved, external, measured + reserved + external, 1073741824, 253602084, 67108864].map(n => { const b = Buffer.alloc(8); b.writeBigInt64BE(BigInt(n)); return b; })]);
 const inventory = Buffer.concat(rows), parts = [header, be(0), Buffer.from([0]), Buffer.from([0]), inventory]; let at = 76;
 const table = Buffer.concat([Buffer.from('P204EV01'), be(1), be(5), ...parts.flatMap((part, i) => { const start = at; at += part.length; return [be(i + 1), be(start), be(part.length)]; })]);
 const body = Buffer.concat([table, ...parts]); return Buffer.concat([body, createHash('sha256').update(body).digest()]);
}
it('validates empty preflight and descriptor-only recovery without treating it as initialized', () => {
 expect(validateEnrollmentEvidence(preflight(Buffer.alloc(0), '0'.repeat(64)), { ...expected, report: 1 }).state).toBeNull();
 const roster = Buffer.concat([be(10), ...Array.from({ length: 10 }, (_, i) => utf(`Available product ${i} / ${i}g`))]); const hash = createHash('sha256').update(roster).digest('hex');
 const descriptor = Buffer.concat([be(1), utf('REAL_PRODUCT_ENROLLMENT'), utf(expected.session), utf(expected.source), utf(hash), roster]);
 expect(validateEnrollmentEvidence(preflight(descriptor, hash), { ...expected, report: 1 }).rosterHash).toBe(hash);
 const invalid = Buffer.from(descriptor); invalid.writeInt32BE(2);
 expect(() => validateEnrollmentEvidence(preflight(invalid, hash), { ...expected, report: 1 })).toThrow('EVIDENCE_DESCRIPTOR');
 expect(() => validateEnrollmentEvidence(preflight(Buffer.alloc(0), hash), { ...expected, report: 1 })).toThrow('EVIDENCE_ABSENT_ROSTER_HASH');
});

function inventoryRows(b: Buffer) { const at = offset(b, 4), length = b.readInt32BE(72); return Array.from({ length: length / 128 }, (_, i) => b.subarray(at + i * 128, at + (i + 1) * 128)); }
function replaceInventory(rows: Buffer[], zero = false) {
 const at = offset(original, 4), inv = Buffer.concat(rows), body = Buffer.concat([original.subarray(0, at), inv]); body.writeInt32BE(inv.length, 72);
 if (zero) { let h = offset(body, 0); for (let n = 0; n < 10; n++) { h += body.readUInt16BE(h) + 2; } h += 13; const descriptor = body.readInt32BE(h); h += 4 + descriptor + 12; body.writeBigInt64BE(0n, h); body.writeBigInt64BE(0n, h + 8); body.writeBigInt64BE(body.readBigInt64BE(h + 16) + body.readBigInt64BE(h + 24), h + 32); }
 return Buffer.concat([body, createHash('sha256').update(body).digest()]);
}
function leafHash(name: string) { return createHash('sha256').update(name).digest(); }
it('rejects the independently reproduced empty-inventory counterexample after repaired checksums', () => {
 const only = Buffer.alloc(128); only.writeInt32BE(100); only.writeInt32BE(3, 4); leafHash('').copy(only, 16); leafHash('coordinator-counterexample').copy(only, 48);
 expect(() => validateEnrollmentEvidence(replaceInventory([only], true), expected)).toThrow('EVIDENCE_REQUIRED_ROOT');
});
it.each(['proof root', 'proof leaf', 'record root', 'record image', 'ledger event', 'descriptor', 'report intent'] as const)('rejects omitted %s', item => {
 const remove = inventoryRows(original).filter(row => {
  const root = row.readInt32BE(), name = row.subarray(16, 48);
  return !(item === 'proof root' ? root === 58 && name.equals(leafHash('')) : item === 'proof leaf' ? root === 58 && name.equals(leafHash('original.jpeg')) : item === 'record root' ? root === 101 && name.equals(leafHash('')) : item === 'record image' ? root === 101 && name.equals(leafHash('original.jpeg')) : item === 'ledger event' ? root === 100 && name.equals(leafHash('event-0001.new')) : item === 'descriptor' ? root === 200 && name.equals(leafHash('session')) : root === 200 && name.equals(leafHash('R04.intent')));
 }); expect(() => validateEnrollmentEvidence(replaceInventory(remove), expected)).toThrow();
});
it.each(['role', 'name', 'length', 'category', 'status', 'charge'] as const)('rejects inventory %s contradictions', kind => {
 const rows = inventoryRows(original).map(row => Buffer.from(row)), target = rows.find(row => row.readInt32BE() === 101 && row.subarray(16, 48).equals(leafHash('original.jpeg')))!;
 if (kind === 'role') target.writeInt32BE(28, 80); if (kind === 'name') leafHash('invented.jpeg').copy(target, 16); if (kind === 'length') target.writeBigInt64BE(0n, 8); if (kind === 'category') target.writeInt32BE(1, 4); if (kind === 'status') target.writeInt32BE(1, 84);
 const changed = replaceInventory(rows); if (kind === 'charge') { let h = offset(changed, 0); for (let n = 0; n < 10; n++) h += changed.readUInt16BE(h) + 2; h += 13; h += 4 + changed.readInt32BE(h) + 12; changed.writeBigInt64BE(0n, h + 16); changed.writeBigInt64BE(changed.readBigInt64BE(h + 8) + changed.readBigInt64BE(h + 24), h + 32); createHash('sha256').update(changed.subarray(0, -32)).digest().copy(changed, changed.length - 32); }
 expect(() => validateEnrollmentEvidence(changed, expected)).toThrow();
});
it('accepts the preserved zero-byte journal stage only with its exact inventory/witness binding', () => {
 const result = validateEnrollmentEvidence(original, expected); expect(result.sequence).toBe(4095); expect(result.witnessIds).toHaveLength(4096); expect(result.inventory.retainedMeasured).toBe(26115778); expect(result.inventory.retainedUnmaterializedCharge).toBe(18056915);
 const rows = inventoryRows(original).map(row => Buffer.from(row)), stage = rows.find(row => row.readInt32BE() === 100 && row.subarray(16, 48).equals(leafHash('event-0001.new')))!; stage.writeBigInt64BE(1n, 8); expect(() => validateEnrollmentEvidence(replaceInventory(rows), expected)).toThrow();
});

it('reconciles a previous verified report copy without charging its materialized bytes twice', () => {
 const rows = inventoryRows(original).map(row => Buffer.from(row));
 const previous = preflight(Buffer.alloc(0), '0'.repeat(64)), length = previous.length, hash = createHash('sha256').update(previous).digest('hex'), generation = '00000000-0000-0000-0000-000000000000';
 const controlPayloads = { 'R01.intent': `1|${expected.session}|0|${'0'.repeat(64)}|${generation}`, 'R01.result': `${length}|${hash}`, 'R01.export-intent': `1|${expected.session}|${generation}|${length}|${hash}`, 'R01.destination': `content://com.android.externalstorage.documents/document/primary%3ADownload%2Fp204-evidence-${expected.session}-R01.bin`, 'R01.export-result': `VERIFIED|${length}|${hash}|1:2:33152:1023:1:${length}:1:0:1:0` };
 const sizes: Record<string, number> = { 'R01.bin': length, ...Object.fromEntries(Object.entries(controlPayloads).map(([name, value]) => [name, Buffer.byteLength(value)])) };
 const roles = ['bin', 'intent', 'result', 'export-intent', 'destination', 'export-result'];
 for (const [name, size] of Object.entries(sizes)) { const row = Buffer.alloc(128); row.writeInt32BE(200); row.writeInt32BE(3, 4); row.writeBigInt64BE(BigInt(size), 8); leafHash(name).copy(row, 16); leafHash(`PREVIOUS_REPORT_FIXTURE|${name}`).copy(row, 48); row.writeInt32BE(500 + roles.indexOf(name.slice(4)), 80); row.writeInt32BE(1, 84); rows.push(row); }
 const controls = Object.entries(sizes).filter(([name]) => name !== 'R01.bin').reduce((sum, [, size]) => sum + size, 0), changed = replaceInventory(rows); let h = offset(changed, 0); for (let i = 0; i < 10; i++) h += changed.readUInt16BE(h) + 2; h += 13; h += 4 + changed.readInt32BE(h) + 12;
 const measured = changed.readBigInt64BE(h + 8) + BigInt(length + controls), reserved = changed.readBigInt64BE(h + 16) + BigInt(65536 - controls), external = changed.readBigInt64BE(h + 24) + BigInt(4194304 + length);
 changed.writeBigInt64BE(measured, h + 8); changed.writeBigInt64BE(reserved, h + 16); changed.writeBigInt64BE(external, h + 24); changed.writeBigInt64BE(measured + reserved + external, h + 32); createHash('sha256').update(changed.subarray(0, -32)).digest().copy(changed, changed.length - 32);
 expect(validateEnrollmentEvidence(changed, expected).accounting.external).toBe(Number(external));
 changed.writeBigInt64BE(external - 1n, h + 24); changed.writeBigInt64BE(measured + reserved + external - 1n, h + 32); createHash('sha256').update(changed.subarray(0, -32)).digest().copy(changed, changed.length - 32); expect(() => validateEnrollmentEvidence(changed, expected)).toThrow('EVIDENCE_INVENTORY_RESERVATIONS');
});
