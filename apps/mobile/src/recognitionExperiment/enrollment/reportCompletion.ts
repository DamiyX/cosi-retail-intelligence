import { exportMetadata, exportMetadataComparison, regularExportLength } from './exportMetadata';
const phases = new Set(['CALLBACK', 'ADMISSION', 'DESTINATION', 'WRITE', 'FLUSH', 'FSYNC', 'OUTPUT_CLOSE', 'REOPEN', 'IDENTITY', 'READBACK', 'READ_CLOSE', 'REVOKE', 'TERMINAL', 'COMPLETE']);
const codes = new Set(['UNKNOWN', 'CANCELLED_OR_EXPIRED', 'DESTINATION', 'DESCRIPTOR', 'NOT_EMPTY_REGULAR', 'CAPACITY', 'WRITE_CHANGED', 'REOPEN_CHANGED', 'READ_LIMIT', 'READBACK', 'READ_SHORT', 'READ_HASH', 'READ_CHANGED', 'FOCUS_LOST', 'STALE', 'STATE', 'IO', 'SECURITY', 'ERRNO']);
const kinds = new Set(['UNKNOWN', 'STATE', 'IO', 'SECURITY', 'ERRNO']);
const identity = (s: string) => /^[0-9]{1,20}(:[0-9]{1,20}){9}$/.test(s);
function fact(b: unknown): asserts b { if (!b) throw new Error('INVALID_REPORT_COMPLETION'); }
function failure(s: string) {
 if (s === 'NONE') return null;
 const a = s.split('~'); fact(a.length === 4 && phases.has(a[0]) && a[0] !== 'COMPLETE' && codes.has(a[1]) && kinds.has(a[2]) && /^(0|[1-9][0-9]{0,3})$/.test(a[3]) && Number(a[3]) <= 4095 && (a[2] === 'ERRNO' || a[3] === '0') && (a[1] !== 'ERRNO' || a[2] === 'ERRNO') && (a[1] !== 'IO' || a[2] === 'IO') && (a[1] !== 'SECURITY' || a[2] === 'SECURITY')); return a[0];
}
export function terminalVerified(s: string): boolean {
 fact(s.length > 0 && s.length <= 4096 && /^[\x20-\x7e]+$/.test(s));
 if (s === 'UNCERTAIN') return false;
 const a = s.split('|');
 if (a[0] === 'VERIFIED') { fact(a.length === 4 && /^[1-9][0-9]{0,6}$/.test(a[1]) && Number(a[1]) <= 4194304 && /^[a-f0-9]{64}$/.test(a[2]) && identity(a[3]) && a[3].split(':')[4] === '1' && a[3].split(':')[5] === a[1]); return true; }
 fact(((a.length === 12 && a[0] === 'P204T1') || (a.length === 16 && a[0] === 'P204T2') || (a.length === 21 && a[0] === 'P204T3')) && ['VERIFIED', 'UNCERTAIN'].includes(a[1]) && phases.has(a[2]));
 const primary = failure(a[3]), cleanup = failure(a[4]), terminal = failure(a[5]), close = failure(a[11]);
 fact((!close || ['OUTPUT_CLOSE', 'READ_CLOSE'].includes(close)) && (!cleanup || cleanup === 'REVOKE') && (!terminal || terminal === 'TERMINAL') && /^(0|[1-9][0-9]{0,9})$/.test(a[6]) && Number(a[6]) <= 2147483647 && /^(0|[1-9][0-9]{0,6})$/.test(a[7]) && Number(a[7]) <= 4194304 && (a[8] === '' || /^[a-f0-9]{64}$/.test(a[8])) && (a[9] === '' || identity(a[9])) && (a[10] === '' || identity(a[10])));
 if (a[0] === 'P204T2' || a[0] === 'P204T3') {
  const statFailure = failure(a[15]);
  fact(['UNKNOWN', 'MATCH', 'SHORT', 'LONG'].includes(a[12]) && ['UNKNOWN', 'MATCH', 'MISMATCH'].includes(a[13]) && (a[0] === 'P204T3' ? ['UNKNOWN', 'MATCH', 'CHANGED', 'ADVANCED'] : ['UNKNOWN', 'MATCH', 'CHANGED']).includes(a[14]) && (!statFailure || (statFailure === 'READBACK' && a[14] === 'UNKNOWN')));
  fact(!['UNKNOWN', 'LONG'].includes(a[12]) || a[13] === 'UNKNOWN');
  if (a[1] === 'VERIFIED') fact(a[12] === 'MATCH' && a[13] === 'MATCH' && (a[14] === 'MATCH' || a[0] === 'P204T3' && a[14] === 'ADVANCED') && !statFailure);
 }
 if (a[0] === 'P204T3') {
  fact(a[2] === (a[1] === 'VERIFIED' ? 'COMPLETE' : terminal ? 'TERMINAL' : primary || cleanup || close || 'COMPLETE'));
  exportMetadata(a[10]); fact(regularExportLength(a[10], Number(a[7])) && ['UNOBSERVED', 'FAILED', 'OBSERVED'].includes(a[17]) && /^(0|[1-9][0-9]{0,6})$/.test(a[18]) && Number(a[18]) <= Number(a[7]) + 1 && ['0', '1'].includes(a[20]));
  fact(a[19] === '' || /^[a-f0-9]{64}$/.test(a[19]) && a[20] === '1');
  fact(a[12] === (Number(a[18]) > Number(a[7]) ? 'LONG' : a[20] === '1' ? a[18] === a[7] ? 'MATCH' : 'SHORT' : 'UNKNOWN'));
  fact(a[13] === (a[19] === '' ? 'UNKNOWN' : a[19] === a[8] ? 'MATCH' : 'MISMATCH'));
  if (a[17] === 'OBSERVED') fact(a[15] === 'NONE' && exportMetadataComparison(a[10], a[16]).status === a[14]);
  else fact(a[16] === '' && a[14] === 'UNKNOWN' && (a[17] === 'FAILED' ? a[15] !== 'NONE' : a[15] === 'NONE'));
  if (a[1] === 'VERIFIED') fact(a[20] === '1' && a[17] === 'OBSERVED');
 }
 if (a[1] === 'UNCERTAIN') { fact(primary || cleanup || terminal || close); return false; }
 fact(a[2] === 'COMPLETE' && !primary && !cleanup && !terminal && !close && Number(a[7]) > 0 && a[8] !== '' && a[9] !== '' && a[9] === a[10] && a[9].split(':')[4] === '1' && a[9].split(':')[5] === a[7]); return true;
}
export function reportCompletion(value: unknown, report: number, session: string) {
 fact(value && typeof value === 'object' && !Array.isArray(value)); const r = value as Record<string, unknown>;
 fact(Object.keys(r).sort().join('|') === (report >= 6 ? 'acknowledgment|basis|phase|report|session|state|terminal' : 'phase|report|session|state|terminal') && r.report === report && r.session === session && typeof r.state === 'string' && ['PENDING', 'NOT_STARTED', 'VERIFIED', 'UNCERTAIN'].includes(r.state) && typeof r.phase === 'string' && phases.has(r.phase) && typeof r.terminal === 'string');
 if (report >= 6) {
  fact(report <= 8 && ['LIVE', 'PRIVATE_RECONCILIATION'].includes(String(r.basis)) && (r.basis === 'LIVE' ? r.acknowledgment === (r.state === 'PENDING' ? 'PENDING' : r.state === 'VERIFIED' ? 'ACKNOWLEDGED' : 'FAILED') && r.state !== 'NOT_STARTED' : r.acknowledgment === 'UNKNOWN' && r.state !== 'PENDING'));
  if (r.state === 'VERIFIED') fact(r.terminal.startsWith('P204T3|'));
 }
 if (r.state === 'PENDING' || r.state === 'NOT_STARTED') fact(r.terminal === '');
 else if (r.terminal !== '') { fact(terminalVerified(r.terminal) === (r.state === 'VERIFIED')); if (r.terminal.startsWith('P204T3|')) fact(r.phase === r.terminal.split('|')[2]); }
 else fact(r.state === 'UNCERTAIN');
 return { state: r.state, phase: r.phase, terminal: r.terminal, basis: r.basis, acknowledgment: r.acknowledgment };
}

/** Validates before formatting; never renders arbitrary native strings or private payloads. */
export function reportCompletionDetails(value: unknown, report: number, session: string): string {
 const r = reportCompletion(value, report, session);
 const lines = [`Report R0${report}: ${r.state}. Phase: ${r.phase}.`];
 if (r.state === 'VERIFIED' && r.terminal.startsWith('P204T3|')) lines.push('Report contents verified.');
 if (report >= 6) lines.push(r.basis === 'PRIVATE_RECONCILIATION' ? r.state === 'VERIFIED' ? 'Saved receipt verified. Original publication acknowledgment unknown.' : 'Private receipt observation. Original publication acknowledgment unknown.' : `Live publication acknowledgment: ${r.acknowledgment}.`, 'Physical qualification requires witnessed live success and strict host proof.');
 if (r.terminal === '') return lines.concat(r.state === 'PENDING' ? 'Work is pending; this read does not restart or extend it.' : r.state === 'NOT_STARTED' ? 'No export result is recorded for this report.' : 'No durable terminal result is available. Preserve this attempt.').join('\n');
 if (r.terminal === 'UNCERTAIN') return lines.concat('Historical uncertain result; detailed diagnostics were not recorded.').join('\n');
 const a = r.terminal.split('|');
 if (a[0] === 'VERIFIED') return lines.concat(`Historical verified result. Bytes: ${a[1]}. File identity: ${a[3]}.`).join('\n');
 for (const [name, field] of [['Primary', a[3]], ['Close', a[11]], ['Grant release', a[4]], [report >= 6 && r.basis === 'PRIVATE_RECONCILIATION' ? 'Stored publication field (before acknowledgment)' : 'Terminal publication', a[5]]]) {
  if (field === 'NONE') lines.push(`${name}: NONE.`);
  else { const [phase, code, kind, errno] = field.split('~'); lines.push(`${name}: ${phase}; code ${code}; kind ${kind}; errno ${errno}.`); }
 }
 lines.push(`Elapsed: ${a[6]} ms. Prepared bytes: ${a[7]}.`, `Written identity: ${a[9] || 'not recorded'}.`, `Reopened identity: ${a[10] || 'not recorded'}.`);
 if (a[0] === 'P204T2' || a[0] === 'P204T3') lines.push(`Readback count/hash/final identity: ${a[12]} / ${a[13]} / ${a[14]}.`, `Final stat failure: ${a[15]}.`, 'UNKNOWN means the observation was unavailable, not a successful check.');
 if (a[0] === 'P204T3') lines.push(`Final metadata observation: ${a[17]}. Final identity: ${a[16] || 'unavailable'}.`, `Changed fields: ${a[17] === 'OBSERVED' ? exportMetadataComparison(a[10], a[16]).changed.join(', ') || 'unchanged' : 'unavailable'}.`, `Observed bytes: ${a[18]}; EOF: ${a[20] === '1'}; observed SHA-256: ${a[19] || 'unavailable'}.`);
 return lines.join('\n');
}
