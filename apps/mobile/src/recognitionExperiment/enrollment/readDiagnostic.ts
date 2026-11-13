const codes = ['NONE', 'BINDING', 'PERMISSION', 'DESTINATION', 'DESCRIPTOR', 'IDENTITY', 'OFFSET', 'READ', 'STAT', 'LIMIT', 'CANCELLED', 'EXPIRED', 'IO', 'SECURITY', 'ERRNO', 'UNKNOWN', 'PUBLICATION'];
const hash = /^[a-f0-9]{64}$/;
const identity = /^[0-9]{1,20}(:[0-9]{1,20}){9}$/;
function requireFact(ok: unknown): asserts ok { if (!ok) throw Error('INVALID_FIXED_READ_DIAGNOSTIC'); }
function number(s: string, max: number) { requireFact(/^(0|[1-9][0-9]*)$/.test(s)); const n = Number(s); requireFact(Number.isSafeInteger(n) && n <= max); return n; }
export function readDiagnostic(value: unknown): string {
  requireFact(value && typeof value === 'object' && !Array.isArray(value));
  const r = value as Record<string, unknown>;
  requireFact(Object.keys(r).sort().join('|') === 'state|terminal' && typeof r.terminal === 'string' && typeof r.state === 'string');
  requireFact(['NOT_STARTED', 'CONSUMED_UNCERTAIN', 'FRESH_DIAGNOSTIC_ONLY', 'VOLATILE_UNCERTAIN', 'PICKER_OPENED'].includes(r.state));
  if (r.state !== 'FRESH_DIAGNOSTIC_ONLY' && r.state !== 'VOLATILE_UNCERTAIN') { requireFact(r.terminal === ''); return `Existing R04 diagnostic: ${r.state}. Original R04 remains UNCERTAIN.`; }
  requireFact(r.terminal.length > 0 && r.terminal.length <= 4096 && /^[\x20-\x7e]+$/.test(r.terminal));
  const a = r.terminal.split('|'); requireFact(a.length === 26 && a[0] === 'P204RD1' && a[1] === 'FRESH_DIAGNOSTIC_ONLY' && a[2] === 'ORIGINAL_R04_UNCERTAIN' && a[3] === 'enrollment-mw4zmxro' && hash.test(a[4]) && a[5] === '148563' && a[6] === 'a53780c857bbe1a6d020b715a1e43e7ec798dcb5ffe397baac251606274bedcb');
  const total = number(a[7], 148564); number(a[8], 1000000);
  for (const at of [9, 10, 11]) if (a[at] !== '-1') requireFact(/^(0|[1-9][0-9]*)$/.test(a[at]) && BigInt(a[at]) <= 9223372036854775807n);
  requireFact(['true', 'false'].includes(a[12]) && ['true', 'false'].includes(a[13]) && (a[14] === '' || hash.test(a[14])));
  requireFact((a[13] === 'true') === (a[14] !== '') && (a[13] !== 'true' || a[12] === 'true'));
  for (const at of [15, 16]) requireFact(a[at] === '' || identity.test(a[at]));
  for (const at of [17, 18, 19]) requireFact(['UNKNOWN', 'FALSE', 'TRUE'].includes(a[at]));
  requireFact(a[13] !== 'true' || a[17] !== 'UNKNOWN' && a[18] !== 'UNKNOWN');
  requireFact(a[17] === 'UNKNOWN' || a[17] === (total === 148563 ? 'TRUE' : 'FALSE'));
  requireFact(a[18] === 'UNKNOWN' || a[13] === 'true' && a[18] === (a[14] === a[6] ? 'TRUE' : 'FALSE'));
  requireFact(a[19] === 'UNKNOWN' || a[15] !== '' && a[16] !== '' && a[19] === (a[15] === a[16] ? 'TRUE' : 'FALSE'));
  number(a[20], 2147483647);
  for (const at of [21, 22, 23, 24, 25]) { const b = a[at].split('~'); requireFact(b.length === 3 && codes.includes(b[0]) && ['UNKNOWN', 'STATE', 'IO', 'SECURITY', 'ERRNO'].includes(b[1])); const errno = number(b[2], 4095); requireFact(b[1] === 'ERRNO' || errno === 0); requireFact(b[0] !== 'ERRNO' || b[1] === 'ERRNO'); requireFact(b[0] !== 'IO' || b[1] === 'IO'); requireFact(b[0] !== 'SECURITY' || b[1] === 'SECURITY'); requireFact(b[0] !== 'NONE' || b[1] === 'STATE' && errno === 0); }
  const differences = a[15] && a[16] ? a[15].split(':').map((v, i) => v === a[16].split(':')[i] ? '0' : '1').join('') : 'UNKNOWN';
  return `${r.state}. FRESH DIAGNOSTIC ONLY. Original R04 remains UNCERTAIN.\nBytes: ${a[7]} / ${a[5]}; read calls: ${a[8]}; EOF: ${a[12]}; hash complete: ${a[13]}.\nCount/hash/stat: ${a[17]} / ${a[18]} / ${a[19]}.\nOffsets initial/duplicate/final (-1 unavailable): ${a[9]} / ${a[10]} / ${a[11]}.\nActual SHA-256: ${a[14] || 'NOT_COMPUTED'}.\nBefore: ${a[15] || 'NOT_COMPUTED'}.\nFinal: ${a[16] || 'NOT_COMPUTED'}.\nChanged stat fields: ${differences}.\nElapsed: ${a[20]} ms.\nPrimary: ${a[21]}; duplicate close: ${a[22]}; original close: ${a[25]}; grant release: ${a[23]}; publication: ${a[24]}.`;
}
