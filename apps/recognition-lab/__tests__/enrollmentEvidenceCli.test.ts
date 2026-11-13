import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { runEnrollmentEvidenceCli } from '../src/phoneCapture/enrollmentEvidenceCli.ts';
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/generated-enrollment-evidence.json'), 'utf8')) as { bytes: string };
const binary = gunzipSync(Buffer.from(fixture.bytes, 'base64'), { maxOutputLength: 3527168 });
let root: string;
beforeEach(() => { root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'p204-evidence-cli-'))); });
afterEach(() => { expect(path.dirname(root)).toBe(fs.realpathSync(os.tmpdir())); expect(path.basename(root)).toMatch(/^p204-evidence-cli-/); fs.rmSync(root, { recursive: true, force: true }); });
function setup() {
 const report = path.join(root, 'R04.bin'), bindings = path.join(root, 'bindings.json'), out = path.join(root, 'summary.json');
 let at = binary.readInt32BE(20); const strings = Array.from({ length: 10 }, () => { const n = binary.readUInt16BE(at); at += 2; const s = binary.subarray(at, at + n).toString('utf8'); at += n; return s; });
 fs.writeFileSync(report, binary, { flag: 'wx' }); fs.writeFileSync(bindings, JSON.stringify({ source: strings[1], apk: strings[5], registry: strings[9], session: strings[6], report: 4, bytes: binary.length, sha256: createHash('sha256').update(binary).digest('hex') }), { flag: 'wx' });
 return { report, bindings, out, args: ['--report', report, '--bindings', bindings, '--out', out] };
}
it('checks the exact transfer receipt and writes one bounded numerical summary', () => {
 const f = setup(), result = runEnrollmentEvidenceCli(f.args); expect(result.references).toBe(64); expect(result.physicalEvidenceVerified).toBe(false); expect(fs.statSync(f.out).size).toBeLessThan(65536); expect(() => runEnrollmentEvidenceCli(f.args)).toThrow();
});
it('refuses corrupt input before creating output', () => {
 const f = setup(), bad = Buffer.from(binary); bad[100] ^= 1; fs.writeFileSync(f.report, bad); expect(() => runEnrollmentEvidenceCli(f.args)).toThrow('TRANSFER_RECEIPT_MISMATCH'); expect(fs.existsSync(f.out)).toBe(false);
});
it('refuses a multiply linked input and preserves both links', () => {
 const f = setup(), alias = path.join(root, 'alias.bin'); fs.linkSync(f.report, alias); expect(() => runEnrollmentEvidenceCli(f.args)).toThrow('INPUT_SHAPE_OR_BOUND'); expect(fs.readFileSync(alias)).toEqual(binary); expect(fs.existsSync(f.out)).toBe(false);
});
it('refuses relative paths and oversized receipt files', () => {
 const f = setup(); expect(() => runEnrollmentEvidenceCli(['--report', 'R04.bin', '--bindings', f.bindings, '--out', f.out])).toThrow(); fs.writeFileSync(f.bindings, Buffer.alloc(4097)); expect(() => runEnrollmentEvidenceCli(f.args)).toThrow('INPUT_SHAPE_OR_BOUND');
});
