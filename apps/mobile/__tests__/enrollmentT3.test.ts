import { exportMetadataComparison } from '../src/recognitionExperiment/enrollment/exportMetadata';
import { reportCompletion, reportCompletionDetails, terminalVerified } from '../src/recognitionExperiment/enrollment/reportCompletion';
const hash = 'a'.repeat(64);
const start = '78:1787915:33200:10257:1:149587:1794216911:186000039:1794216911:186000039';
const changed = (field: number, value: string) => start.split(':').map((part, i) => i === field ? value : part).join(':');
function wire(final = start, comparison = 'MATCH') { return ['P204T3', 'VERIFIED', 'COMPLETE', 'NONE', 'NONE', 'NONE', '100', '149587', hash, start, start, 'NONE', 'MATCH', 'MATCH', comparison, 'NONE', final, 'OBSERVED', '149587', hash, '1'].join('|'); }
function replace(raw: string, at: number, value: string) { const parts = raw.split('|'); parts[at] = value; return parts.join('|'); }
it('qualifies equal and forward-only ctime under one versioned VERIFIED lifecycle', () => {
 for (const final of [start, changed(9, '242000039'), changed(8, '1794216912').replace(/186000039$/, '0')]) {
  const terminal = wire(final, final === start ? 'MATCH' : 'ADVANCED'); expect(terminalVerified(terminal)).toBe(true);
  const text = reportCompletionDetails({ report: 6, session: 's', basis: 'LIVE', acknowledgment: 'ACKNOWLEDGED', state: 'VERIFIED', phase: 'COMPLETE', terminal }, 6, 's');
  expect(text).toContain('Report contents verified'); expect(text).toContain(`Final identity: ${final}`); expect(text).toContain(final === start ? 'Changed fields: unchanged' : 'ctime');
 }
});
it.each([0, 1, 2, 3, 4, 5, 6, 7])('refuses a changed stable field %s', field => {
 const value = String(BigInt(start.split(':')[field]) + BigInt(1)); expect(() => terminalVerified(wire(changed(field, value), 'ADVANCED'))).toThrow();
});
it.each(['0', '186000038'])('refuses backwards ctime nanoseconds %s', n => { expect(() => terminalVerified(wire(changed(9, n), 'ADVANCED'))).toThrow(); });
it('recomputes deltas with exact-width integers and timestamp rollover', () => {
 const before = start.replace('78:', '18446744073709551615:').replace(':1787915:', ':9007199254740993:');
 expect(exportMetadataComparison(before, before).status).toBe('MATCH');
 expect(exportMetadataComparison(before, before.replace(':9007199254740993:', ':9007199254740992:')).changed).toEqual(['inode']);
 expect(exportMetadataComparison(start, changed(8, '1794216912').replace(/186000039$/, '0')).status).toBe('ADVANCED');
});
it.each(['-1', '01', '18446744073709551616', '1e3', 'private'])('refuses malformed exact metadata %s', value => { expect(() => terminalVerified(wire(changed(0, value)))).toThrow(); });
it('refuses success on unknown samples, incomplete EOF/digest/count, forged comparison or extra mask', () => {
 for (const [field, value] of [[14, 'ADVANCED'], [16, ''], [17, 'FAILED'], [18, '149586'], [19, ''], [20, '0']] as const) expect(() => terminalVerified(replace(wire(), field, value))).toThrow();
 expect(() => terminalVerified(wire() + '|ctimeNanoseconds')).toThrow();
 expect(() => terminalVerified(wire(changed(9, '1000000000'), 'ADVANCED'))).toThrow();
 expect(() => terminalVerified(replace(wire(), 9, changed(9, '242000039')))).toThrow();
});
it('keeps T2 strict and shows failed final metadata as unavailable', () => {
 const t2 = wire(changed(9, '242000039'), 'ADVANCED').split('|').slice(0, 16); t2[0] = 'P204T2'; expect(() => terminalVerified(t2.join('|'))).toThrow();
 const f = wire().split('|'); f[1] = 'UNCERTAIN'; f[2] = 'READBACK'; f[3] = 'READBACK~IO~IO~0'; f[14] = 'UNKNOWN'; f[15] = 'READBACK~IO~IO~0'; f[16] = ''; f[17] = 'FAILED';
 expect(terminalVerified(f.join('|'))).toBe(false);
 expect(reportCompletionDetails({ report: 6, session: 's', basis: 'LIVE', acknowledgment: 'FAILED', state: 'UNCERTAIN', phase: 'READBACK', terminal: f.join('|') }, 6, 's')).toContain('Final identity: unavailable');
});
it('refuses a contradictory T3 terminal phase or outer saved-status phase', () => {
 expect(() => terminalVerified(replace(wire(), 2, 'READBACK'))).toThrow();
 expect(() => reportCompletion({ report: 6, session: 's', basis: 'LIVE', acknowledgment: 'ACKNOWLEDGED', state: 'VERIFIED', phase: 'READBACK', terminal: wire() }, 6, 's')).toThrow();
});
it('distinguishes a recovered private receipt from acknowledged live success', () => {
 const recovered = { report: 6, session: 's', basis: 'PRIVATE_RECONCILIATION', acknowledgment: 'UNKNOWN', state: 'VERIFIED', phase: 'COMPLETE', terminal: wire() };
 const text = reportCompletionDetails(recovered, 6, 's');
 expect(text).toContain('Saved receipt verified. Original publication acknowledgment unknown.');
 expect(text).toContain('Stored publication field (before acknowledgment): NONE.');
 expect(text).toContain('Physical qualification requires witnessed live success and strict host proof.');
 for (const delta of [{ acknowledgment: 'ACKNOWLEDGED' }, { basis: 'LIVE' }, { basis: 'PRIVATE_RECONCILIATION', state: 'PENDING', terminal: '' }, { basis: 'LIVE', acknowledgment: 'FAILED' }]) expect(() => reportCompletion({ ...recovered, ...delta }, 6, 's')).toThrow();
 expect(() => reportCompletion({ report: 6, session: 's', state: 'VERIFIED', phase: 'COMPLETE', terminal: wire() }, 6, 's')).toThrow();
});
