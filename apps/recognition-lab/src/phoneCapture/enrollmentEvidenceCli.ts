/** Explicit local report/receipt paths only. No ADB, recursive discovery, network or image access. */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { EVIDENCE_BOUND, validateEnrollmentEvidence, type EvidenceBindings } from './enrollmentEvidence.ts';
function fact(value: unknown, why: string): asserts value { if (!value) throw Error(why); }
function identity(s: fs.Stats) { return `${s.dev}:${s.ino}:${s.mode}:${s.nlink}:${s.size}:${s.mtimeMs}:${s.ctimeMs}`; }
function samePath(a: string, b: string) { return process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b; }
function exactParent(file: string) {
  fact(path.isAbsolute(file) && path.resolve(file) === file, 'EXPLICIT_ABSOLUTE_PATH_REQUIRED');
  fact(samePath(fs.realpathSync(path.dirname(file)), path.dirname(file)), 'ALIASED_PARENT');
}
function read(file: string, max: number) {
  exactParent(file); const before = fs.lstatSync(file);
  fact(before.isFile() && !before.isSymbolicLink() && before.nlink === 1 && before.size > 0 && before.size <= max && samePath(fs.realpathSync(file), file), 'INPUT_SHAPE_OR_BOUND');
  const fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
  try {
    const opened = fs.fstatSync(fd); fact(identity(before) === identity(opened), 'INPUT_SUBSTITUTED');
    const bytes = Buffer.alloc(opened.size); let at = 0;
    while (at < bytes.length) { const n = fs.readSync(fd, bytes, at, bytes.length - at, null); fact(n > 0, 'INPUT_TRUNCATED'); at += n; }
    fact(fs.readSync(fd, Buffer.alloc(1), 0, 1, null) === 0 && identity(opened) === identity(fs.fstatSync(fd)) && identity(opened) === identity(fs.lstatSync(file)), 'INPUT_CHANGED'); return bytes;
  } finally { fs.closeSync(fd); }
}
export function runEnrollmentEvidenceCli(args: string[]) {
  fact(args.length === 6 && args[0] === '--report' && args[2] === '--bindings' && args[4] === '--out', 'USAGE: --report ABSOLUTE_BIN --bindings ABSOLUTE_JSON --out NEW_ABSOLUTE_JSON');
  const [reportFile, bindingsFile, outputFile] = [args[1], args[3], args[5]];
  const bindings: unknown = JSON.parse(read(bindingsFile, 4096).toString('utf8'));
  fact(!!bindings && typeof bindings === 'object' && !Array.isArray(bindings), 'BINDINGS_OBJECT');
  const b = bindings as Record<string, unknown>;
  fact(Object.keys(b).sort().join('|') === 'apk|bytes|registry|report|session|sha256|source' && ['apk', 'registry', 'sha256', 'source'].every(k => typeof b[k] === 'string' && /^[a-f0-9]{64}$/.test(b[k] as string)) && Number.isInteger(b.bytes) && (b.bytes as number) > 0 && (b.bytes as number) <= EVIDENCE_BOUND && Number.isInteger(b.report) && typeof b.session === 'string', 'BINDINGS_SCHEMA');
  const bytes = read(reportFile, EVIDENCE_BOUND), hash = createHash('sha256').update(bytes).digest('hex');
  fact(bytes.length === b.bytes && hash === b.sha256, 'TRANSFER_RECEIPT_MISMATCH');
  const result = validateEnrollmentEvidence(bytes, b as EvidenceBindings);
  const summary = { kind: result.kind, report: result.report, source: result.source, apk: result.apk, session: result.session, reportBytes: bytes.length, reportSha256: hash, sequence: result.sequence, revision: result.revision, head: result.head, rosterHash: result.rosterHash, references: result.references, witnesses: result.witnessIds.length, accounting: result.accounting, inventory: result.inventory, physicalEvidenceVerified: false, journalProof: result.journalProof, historicalMembershipDeviceVerifiedOnly: true, privacy: result.privacy, hostInputBytes: bytes.length, hostCopyReceiptVerified: true };
  const output = Buffer.from(JSON.stringify(summary, null, 2) + '\n'); fact(output.length <= 65536, 'SUMMARY_BOUND'); exactParent(outputFile);
  fact(outputFile !== reportFile && outputFile !== bindingsFile, 'OUTPUT_ALIAS');
  const space = fs.statfsSync(path.dirname(outputFile), { bigint: true }); fact(space.bavail * space.bsize >= 65536n, 'HOST_OUTPUT_FREE_SPACE');
  const fd = fs.openSync(outputFile, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | (fs.constants.O_NOFOLLOW ?? 0), 0o600);
  try { fs.writeFileSync(fd, output); fs.fsyncSync(fd); const s = fs.fstatSync(fd); fact(s.isFile() && s.nlink === 1 && s.size === output.length && identity(s) === identity(fs.lstatSync(outputFile)), 'OUTPUT_CHANGED'); }
  finally { fs.closeSync(fd); }
  return summary;
}
if (process.argv[1]?.endsWith('enrollmentEvidenceCli.ts')) {
  try { const result = runEnrollmentEvidenceCli(process.argv.slice(2)); process.stdout.write(JSON.stringify({ kind: result.kind, bytes: result.reportBytes, sha256: result.reportSha256 }) + '\n'); }
  catch (error) { process.stderr.write((error instanceof Error ? error.message : 'EVIDENCE_REFUSED') + '\n'); process.exitCode = 1; }
}
