import { act, fireEvent, render } from '@testing-library/react-native';
import EnrollmentEntry from '../src/recognitionExperiment/enrollment/EnrollmentEntry';
jest.mock('expo-modules-core', () => {
  const actual = jest.requireActual('expo-modules-core');
  const api = { enrollmentSetup: jest.fn(), enrollmentCommand: jest.fn() };
  return { ...actual, requireNativeModule: (name: string) => name === 'RecognitionExperiment' ? api : actual.requireNativeModule(name), __enrollmentMock: api };
});
const api = jest.requireMock('expo-modules-core').__enrollmentMock as { enrollmentSetup: jest.Mock; enrollmentCommand: jest.Mock };
const source = 'a'.repeat(64);
const snapshot = { schema: 1, sequence: 1, revision: 1, epoch: 0, selectedProduct: 0, busy: false, interrupted: '', frozen: '', barcodeAvailable: false, products: [{ label: 'Product 01', views: [null, null, null, null], barcode: 'UNAVAILABLE', barcodeValue: '', barcodeEpoch: 0, encodedBytes: 30 }], candidate: null, sourceSha256: source };
beforeEach(() => { jest.clearAllMocks(); api.enrollmentSetup.mockResolvedValue({ initialized: false, sourceSha256: source, session: '', sequence: 0, roster: [] }); api.enrollmentCommand.mockResolvedValue(snapshot); });
it('reads setup without initializing progress, requesting permission or opening the camera', async () => {
  const screen = render(<EnrollmentEntry />); await act(async () => {});
  expect(api.enrollmentSetup).toHaveBeenCalledTimes(1); expect(api.enrollmentCommand).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Initialize confirmed ten product slots' })).toBeTruthy();
});
it('initializes only on explicit action and then reads a native snapshot', async () => {
  const screen = render(<EnrollmentEntry />); await act(async () => {});
  api.enrollmentSetup.mockResolvedValue({ initialized: true, sourceSha256: source, session: 'real-test', sequence: 1, roster: Array.from({ length: 10 }, (_, i) => `Available product ${i + 1} / ${i + 1}g`) });
  for (let i = 1; i <= 10; i++) { fireEvent.changeText(screen.getByLabelText(`Product ${i} name`), `Available product ${i}`); fireEvent.changeText(screen.getByLabelText(`Product ${i} package size or variant`), `${i}g`); }
  fireEvent.press(screen.getByRole('checkbox', { name: 'I confirm these ten physical products and package identities' }));
  await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'Initialize confirmed ten product slots' })); });
  expect(api.enrollmentCommand).toHaveBeenCalledWith({ op: 'initialize', experiment: expect.stringMatching(/^enrollment-/), confirmed: true, labels: Array.from({ length: 10 }, (_, i) => `Available product ${i + 1} / ${i + 1}g`) }); expect(api.enrollmentCommand).toHaveBeenCalledWith({ op: 'snapshot' });
  expect(api.enrollmentCommand.mock.calls.every(([request]) => ['initialize', 'snapshot'].includes(request.op))).toBe(true);
});
it('refuses malformed setup without automatically retrying', async () => {
  api.enrollmentSetup.mockResolvedValue({ initialized: false, sourceSha256: source, session: '', sequence: 0, roster: [], privatePath: '/private/file' }); const screen = render(<EnrollmentEntry />); await act(async () => {});
  expect(screen.getByText('Setup could not be verified. Preserve saved data.')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Initialize confirmed ten product slots' })).toBeNull(); expect(api.enrollmentSetup).toHaveBeenCalledTimes(1); expect(api.enrollmentCommand).not.toHaveBeenCalled();
});

it('does not initialize empty or partially confirmed drafts', async () => {
 const screen = render(<EnrollmentEntry />); await act(async () => {});
 fireEvent.press(screen.getByRole('button', { name: 'Initialize confirmed ten product slots' }));
 expect(api.enrollmentCommand).not.toHaveBeenCalled();
 fireEvent.changeText(screen.getByLabelText('Product 1 name'), 'An available replacement');
 expect(api.enrollmentCommand).not.toHaveBeenCalled();
});
it('requires confirmation again after any draft edit and rejects duplicated identities', async () => {
 const screen = render(<EnrollmentEntry />); await act(async () => {});
 for (let i = 1; i <= 10; i++) { fireEvent.changeText(screen.getByLabelText(`Product ${i} name`), `Item ${i}`); fireEvent.changeText(screen.getByLabelText(`Product ${i} package size or variant`), `${i}g`); }
 fireEvent.press(screen.getByRole('checkbox', { name: 'I confirm these ten physical products and package identities' }));
 fireEvent.changeText(screen.getByLabelText('Product 2 name'), 'Item 1'); fireEvent.changeText(screen.getByLabelText('Product 2 package size or variant'), '1g');
 fireEvent.press(screen.getByRole('button', { name: 'Initialize confirmed ten product slots' })); expect(api.enrollmentCommand).not.toHaveBeenCalled();
});
it('prepares a requested numerical slot without initializing or opening the export picker', async () => {
 const screen = render(<EnrollmentEntry />); await act(async () => {});
 api.enrollmentCommand.mockResolvedValue({ report: 1, status: 'PREPARED' });
 await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'Prepare numerical report R01' })); });
 expect(api.enrollmentCommand).toHaveBeenCalledTimes(1);
 expect(api.enrollmentCommand).toHaveBeenCalledWith({ op: 'prepareReport', report: 1, sequence: 0, session: expect.stringMatching(/^enrollment-/) });
});

it('preserves a descriptor-only roster and requires separate explicit recovery', async () => {
 const roster = Array.from({ length: 10 }, (_, i) => `Confirmed ${i} / ${i}g`);
 api.enrollmentSetup.mockResolvedValue({ initialized: false, sourceSha256: source, session: 'saved-session', sequence: 0, roster });
 const screen = render(<EnrollmentEntry />); await act(async () => {});
 expect(screen.queryByLabelText('Product 1 name')).toBeNull(); expect(screen.getByText('Product 1: Confirmed 0 / 0g')).toBeTruthy();
 fireEvent.press(screen.getByRole('checkbox', { name: 'I confirm these ten physical products and package identities' }));
 await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'Initialize confirmed ten product slots' })); });
 expect(api.enrollmentCommand).not.toHaveBeenCalled(); expect(screen.getByRole('button', { name: 'Inspect original initialization without changes' })).toBeTruthy();
});

it('waits for real terminal status instead of treating picker launch as completion', async () => {
 jest.useFakeTimers(); const screen = render(<EnrollmentEntry />); await act(async () => {});
 let reads = 0;
 api.enrollmentCommand.mockImplementation(async r => r.op === 'exportReport' ? { report: 3, status: 'LOCAL_PICKER_OPENED' } : r.op === 'reportStatus' ? { report: 3, session: r.session, state: ++reads === 1 ? 'PENDING' : 'UNCERTAIN', terminal: reads === 1 ? '' : 'UNCERTAIN', phase: reads === 1 ? 'WRITE' : 'COMPLETE' } : snapshot);
 await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'Export prepared report R03 locally' })); });
 expect(screen.getByText('Save screen opened. Waiting for the final local report result.')).toBeTruthy();
 await act(async () => { jest.advanceTimersByTime(1000); });
 expect(screen.getByText(/Local report save could not be verified/)).toBeTruthy();
 expect(api.enrollmentCommand.mock.calls.filter(([r]) => r.op === 'exportReport')).toHaveLength(1);
 expect(api.enrollmentCommand.mock.calls.filter(([r]) => r.op === 'accounting')).toHaveLength(0);
 screen.unmount(); jest.useRealTimers();
});
it('stops UI status delivery on unmount without repeating the export', async () => {
 jest.useFakeTimers(); const screen = render(<EnrollmentEntry />); await act(async () => {});
 api.enrollmentCommand.mockImplementation(async r => r.op === 'exportReport' ? { report: 3, status: 'LOCAL_PICKER_OPENED' } : { report: 3, session: r.session, state: 'PENDING', terminal: '', phase: 'CALLBACK' });
 await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'Export prepared report R03 locally' })); });
 const count = api.enrollmentCommand.mock.calls.length; screen.unmount(); await act(async () => { jest.runOnlyPendingTimers(); });
 expect(api.enrollmentCommand).toHaveBeenCalledTimes(count); jest.useRealTimers();
});

it('shows success only for an exact verified terminal, with one export action', async () => {
 const screen = render(<EnrollmentEntry />); await act(async () => {});
 const identity = '1:2:33152:10264:1:77:1:2:3:4';
 api.enrollmentCommand.mockImplementation(async r => r.op === 'exportReport' ? { report: 3, status: 'LOCAL_PICKER_OPENED' } : { report: 3, session: r.session, state: 'VERIFIED', terminal: `P204T1|VERIFIED|COMPLETE|NONE|NONE|NONE|10|77|${'a'.repeat(64)}|${identity}|${identity}|NONE`, phase: 'COMPLETE' });
 await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'Export prepared report R03 locally' })); });
 expect(screen.getByText(/Local report save verified/)).toBeTruthy(); expect(api.enrollmentCommand.mock.calls.filter(([r]) => r.op === 'exportReport')).toHaveLength(1);screen.unmount();
});
it('refuses stale status binding and never repeats an uncertain export', async () => {
 const screen = render(<EnrollmentEntry />); await act(async () => {});
 api.enrollmentCommand.mockImplementation(async r => r.op === 'exportReport' ? { report: 3, status: 'LOCAL_PICKER_OPENED' } : { report: 4, session: r.session, state: 'UNCERTAIN', terminal: 'UNCERTAIN', phase: 'COMPLETE' });
 await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'Export prepared report R03 locally' })); });
 expect(screen.getByText('Evidence action could not be verified. Preserve the attempt; no automatic retry.')).toBeTruthy(); expect(api.enrollmentCommand.mock.calls.filter(([r]) => r.op === 'exportReport')).toHaveLength(1);screen.unmount();
});

function coldReportSetup() { api.enrollmentSetup.mockResolvedValue({ initialized: false, sourceSha256: source, session: 'saved-session', sequence: 24, roster: Array.from({ length: 10 }, (_, i) => `Confirmed ${i} / ${i}g`) }); }
it('reads durable R04 detail with exactly one status request and no preparation, accounting or export', async () => {
 coldReportSetup(); const screen = render(<EnrollmentEntry />); await act(async () => {});
 const wire = `P204T1|UNCERTAIN|READBACK|READBACK~READBACK~STATE~0|NONE|NONE|1234|77|${'a'.repeat(64)}|||NONE`;
 api.enrollmentCommand.mockResolvedValue({ report: 4, session: 'saved-session', state: 'UNCERTAIN', terminal: wire, phase: 'READBACK' });
 const setups = api.enrollmentSetup.mock.calls.length;
 await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'Read saved export result R04' })); });
 expect(screen.getByText(/Primary: READBACK; code READBACK; kind STATE; errno 0/)).toBeTruthy();
 expect(api.enrollmentCommand.mock.calls).toEqual([[{ op: 'reportStatus', report: 4, session: 'saved-session' }]]); expect(api.enrollmentSetup).toHaveBeenCalledTimes(setups); screen.unmount();
});
it.each(['NOT_STARTED', 'PENDING', 'UNCERTAIN'])('cold reinspection handles %s once without polling or rearming', async state => {
 coldReportSetup(); const screen = render(<EnrollmentEntry />); await act(async () => {});
 api.enrollmentCommand.mockResolvedValue({ report: 4, session: 'saved-session', state, terminal: '', phase: 'CALLBACK' });
 await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'Read saved export result R04' })); });
 expect(screen.getByText(new RegExp(`Report R04: ${state}`))).toBeTruthy(); expect(api.enrollmentCommand).toHaveBeenCalledTimes(1);screen.unmount();
});
it.each([{ report: 5 }, { session: 'foreign' }, { extra: '/private/file' }, { terminal: 'P204T1|UNCERTAIN|READBACK' }])('refuses wrong, private or truncated cold result %j', async delta => {
 coldReportSetup(); const screen = render(<EnrollmentEntry />); await act(async () => {});
 api.enrollmentCommand.mockResolvedValue({ report: 4, session: 'saved-session', state: 'UNCERTAIN', terminal: 'UNCERTAIN', phase: 'COMPLETE', ...delta });
 await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'Read saved export result R04' })); });
 expect(screen.getByText('Report status could not be verified. Preserve this attempt; no action was repeated.')).toBeTruthy(); expect(api.enrollmentCommand).toHaveBeenCalledTimes(1);screen.unmount();
});
it('drops an unmounted status response and prevents duplicate reads while pending', async () => {
 coldReportSetup(); const screen = render(<EnrollmentEntry />); await act(async () => {});let resolve!: (value: unknown) => void;
 api.enrollmentCommand.mockImplementation(() => new Promise(r => { resolve = r; }));
 fireEvent.press(screen.getByRole('button', { name: 'Read saved export result R04' }));fireEvent.press(screen.getByRole('button', { name: 'Read saved export result R04' }));expect(api.enrollmentCommand).toHaveBeenCalledTimes(1);screen.unmount();
 await act(async () => { resolve({ report: 4, session: 'saved-session', state: 'UNCERTAIN', terminal: 'UNCERTAIN', phase: 'COMPLETE' }); });expect(api.enrollmentCommand).toHaveBeenCalledTimes(1);
});

it('does not read an unbound report session and handles a rejected status read without effects', async () => {
 const unbound = render(<EnrollmentEntry />); await act(async () => {});
 fireEvent.press(unbound.getByRole('button', { name: 'Read saved export result R04' }));expect(api.enrollmentCommand).not.toHaveBeenCalled();unbound.unmount();
 coldReportSetup(); const screen = render(<EnrollmentEntry />); await act(async () => {});api.enrollmentCommand.mockRejectedValue(new Error('private native message must not display'));
 await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'Read saved export result R04' })); });
 expect(screen.getByText('Report status could not be verified. Preserve this attempt; no action was repeated.')).toBeTruthy();expect(screen.queryByText('private native message must not display')).toBeNull();expect(api.enrollmentCommand).toHaveBeenCalledTimes(1);screen.unmount();
});

it.each([6, 7, 8])('routes a saved R0%s result once and exposes only eight report slots', async number => {
 coldReportSetup(); const screen = render(<EnrollmentEntry />); await act(async () => {});
 expect(screen.queryByRole('button', { name: 'Read saved export result R09' })).toBeNull();
 api.enrollmentCommand.mockResolvedValue({ report: number, session: 'saved-session', basis: 'PRIVATE_RECONCILIATION', acknowledgment: 'UNKNOWN', state: 'NOT_STARTED', terminal: '', phase: 'CALLBACK' });
 await act(async () => { fireEvent.press(screen.getByRole('button', { name: `Read saved export result R0${number}` })); });
 expect(api.enrollmentCommand.mock.calls).toEqual([[{ op: 'reportStatus', report: number, session: 'saved-session' }]]);
 expect(screen.getByText(new RegExp(`Report R0${number}: NOT_STARTED`))).toBeTruthy();screen.unmount();
});
