// Public-export T3 only. Keep integers as canonical decimal strings across the bridge.
export const exportMetadataFields = ['device', 'inode', 'mode', 'uid', 'links', 'size', 'mtimeSeconds', 'mtimeNanoseconds', 'ctimeSeconds', 'ctimeNanoseconds'] as const;
function fact(b: boolean): asserts b { if (!b) throw Error('INVALID_EXPORT_METADATA'); }
export function exportMetadata(raw: string): string[] {
 const fields = raw.split(':'); fact(fields.length === 10);
 fields.forEach(value => fact(/^(0|[1-9][0-9]{0,19})$/.test(value) && BigInt(value) <= BigInt('18446744073709551615')));
 fact(BigInt(fields[2]) <= BigInt('4294967295') && BigInt(fields[3]) <= BigInt('4294967295') && BigInt(fields[5]) <= BigInt('4194304') && BigInt(fields[6]) <= BigInt('9223372036854775807') && BigInt(fields[8]) <= BigInt('9223372036854775807') && BigInt(fields[7]) < BigInt('1000000000') && BigInt(fields[9]) < BigInt('1000000000'));
 return fields;
}
export function regularExportLength(raw: string, length: number): boolean {
 const f = exportMetadata(raw); return (BigInt(f[2]) & BigInt('61440')) === BigInt('32768') && f[4] === '1' && f[5] === String(length);
}
export function exportMetadataComparison(before: string, after: string) {
 const a = exportMetadata(before), b = exportMetadata(after);
 const changed = exportMetadataFields.filter((_, i) => a[i] !== b[i]);
 const stable = a.slice(0, 8).every((value, i) => value === b[i]);
 const time = BigInt(b[8]) === BigInt(a[8]) ? BigInt(b[9]) - BigInt(a[9]) : BigInt(b[8]) - BigInt(a[8]);
 return { changed, status: !stable || time < BigInt(0) ? 'CHANGED' : time > BigInt(0) ? 'ADVANCED' : 'MATCH' };
}
