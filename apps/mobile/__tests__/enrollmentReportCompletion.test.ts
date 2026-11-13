import { reportCompletion, terminalVerified, reportCompletionDetails } from '../src/recognitionExperiment/enrollment/reportCompletion';
const identity = '1:2:33152:10264:1:77:1:2:3:4';
const verified = `P204T1|VERIFIED|COMPLETE|NONE|NONE|NONE|10|77|${'a'.repeat(64)}|${identity}|${identity}|NONE`;
const uncertain = `P204T1|UNCERTAIN|IDENTITY|IDENTITY~REOPEN_CHANGED~STATE~0|NONE|NONE|10|77|${'a'.repeat(64)}|${identity}|${identity}|NONE`;
const readback = (count: string, hash: string, stat: string, statFailure = 'NONE') => `P204T2|UNCERTAIN|READBACK|READBACK~READ_SHORT~STATE~0|NONE|NONE|10|77|${'a'.repeat(64)}|${identity}|${identity}|NONE|${count}|${hash}|${stat}|${statFailure}`;
it('preserves independent combined failures and explicitly unavailable final metadata', () => {
 const terminal = readback('SHORT', 'MISMATCH', 'CHANGED');
 expect(terminalVerified(terminal)).toBe(false);
 expect(reportCompletionDetails({ report: 3, session: 'test', state: 'UNCERTAIN', phase: 'READBACK', terminal }, 3, 'test')).toContain('SHORT / MISMATCH / CHANGED');
 const unavailable = readback('SHORT', 'MISMATCH', 'UNKNOWN', 'READBACK~IO~IO~0');
 expect(reportCompletionDetails({ report: 3, session: 'test', state: 'UNCERTAIN', phase: 'READBACK', terminal: unavailable }, 3, 'test')).toContain('Final stat failure: READBACK~IO~IO~0');
});
it('requires all three measured outcomes for a new verified terminal', () => {
 const terminal = verified.replace('P204T1', 'P204T2') + '|MATCH|MATCH|MATCH|NONE';
 expect(terminalVerified(terminal)).toBe(true);
 for (const flags of ['UNKNOWN|MATCH|MATCH|NONE', 'SHORT|MATCH|MATCH|NONE', 'MATCH|MISMATCH|CHANGED|NONE', 'MATCH|MATCH|UNKNOWN|READBACK~IO~IO~0']) expect(() => terminalVerified(verified.replace('P204T1', 'P204T2') + '|' + flags)).toThrow();
 for (const malformed of [readback('private', 'MATCH', 'MATCH'), readback('MATCH', 'MATCH', 'MATCH', 'READBACK~IO~IO~0'), readback('SHORT', 'UNKNOWN', 'UNKNOWN', 'WRITE~IO~IO~0')]) expect(() => terminalVerified(malformed)).toThrow();
});
it('distinguishes pending, successful and uncertain exact report results', () => {
 expect(reportCompletion({ report: 3, session: 'test', state: 'PENDING', terminal: '', phase: 'WRITE' }, 3, 'test').state).toBe('PENDING');
 expect(terminalVerified(verified)).toBe(true); expect(terminalVerified(uncertain)).toBe(false);
 expect(terminalVerified('UNCERTAIN')).toBe(false); expect(terminalVerified(`VERIFIED|77|${'a'.repeat(64)}|${identity}`)).toBe(true);
});
it.each([verified + '|extra', verified.replace('P204T1', 'P204T2'), verified.replace('|10|77|', '|-1|77|'), verified.replace('|NONE|NONE|NONE|', '|READBACK~READBACK~STATE~0|NONE|NONE|'), uncertain.replace('REOPEN_CHANGED', '/private/path'), 'x'.repeat(4097), 'UNCERTAIN\n'])('refuses malformed or contradictory terminal %s', wire => { expect(() => terminalVerified(wire)).toThrow(); });
it('refuses wrong binding, extra fields and premature VERIFIED', () => {
 const value = { report: 3, session: 'test', state: 'VERIFIED', terminal: verified, phase: 'COMPLETE' };
 expect(() => reportCompletion(value, 4, 'test')).toThrow(); expect(() => reportCompletion(value, 3, 'other')).toThrow(); expect(() => reportCompletion({ ...value, extra: 1 }, 3, 'test')).toThrow(); expect(() => reportCompletion({ ...value, terminal: '' }, 3, 'test')).toThrow(); expect(() => reportCompletion({ ...value, terminal: uncertain }, 3, 'test')).toThrow();
});

it('exposes existing primary and secondary facts previously lost by phase-only presentation', () => {
 const wire = `P204T1|UNCERTAIN|TERMINAL|READBACK~READBACK~STATE~0|REVOKE~SECURITY~SECURITY~0|TERMINAL~IO~IO~0|1234|77|${'a'.repeat(64)}|${identity}|${identity}|READ_CLOSE~ERRNO~ERRNO~5`;
 const value = { report: 4, session: 'saved-session', state: 'UNCERTAIN', terminal: wire, phase: 'TERMINAL' };
 expect(reportCompletion(value, 4, 'saved-session').phase).toBe('TERMINAL');
 const detail = reportCompletionDetails(value, 4, 'saved-session');
 for (const fact of ['Primary: READBACK; code READBACK; kind STATE; errno 0.', 'Close: READ_CLOSE; code ERRNO; kind ERRNO; errno 5.', 'Grant release: REVOKE; code SECURITY; kind SECURITY; errno 0.', 'Terminal publication: TERMINAL; code IO; kind IO; errno 0.', 'Elapsed: 1234 ms. Prepared bytes: 77.', `Written identity: ${identity}.`]) expect(detail).toContain(fact);
});
it.each(['PENDING', 'NOT_STARTED', 'UNCERTAIN'])('explains absent terminal honestly for %s', state => {
 const text = reportCompletionDetails({ report: 4, session: 'saved', state, terminal: '', phase: 'CALLBACK' }, 4, 'saved');
 expect(text).not.toContain('VERIFIED'); expect(text).not.toContain('code READBACK');
});
it('preserves old terminal uncertainty and refuses private or torn detail before display', () => {
 const value = { report: 4, session: 'saved', state: 'UNCERTAIN', terminal: 'UNCERTAIN', phase: 'COMPLETE' };
 expect(reportCompletionDetails(value, 4, 'saved')).toContain('detailed diagnostics were not recorded');
 for (const terminal of ['P204T1|UNCERTAIN|READBACK', uncertain.replace('REOPEN_CHANGED', 'private/path'), uncertain + '|extra']) expect(() => reportCompletionDetails({ ...value, terminal }, 4, 'saved')).toThrow();
});

it('formats historical verified terminals without inventing detailed failures', () => {
 const wire = `VERIFIED|77|${'a'.repeat(64)}|${identity}`;
 const text = reportCompletionDetails({ report: 4, session: 'saved', state: 'VERIFIED', terminal: wire, phase: 'COMPLETE' }, 4, 'saved');expect(text).toContain('Historical verified result. Bytes: 77.');expect(text).not.toContain('Primary:');
});
