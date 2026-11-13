import { act, fireEvent, render } from '@testing-library/react-native';
import EnrollmentPanel from '../src/recognitionExperiment/enrollment/EnrollmentPanel';
import { type EnrollmentBridge, type EnrollmentSnapshot, parseEnrollmentSnapshot } from '../src/recognitionExperiment/enrollment/protocol';
const source = 'a'.repeat(64), receipt = 'b'.repeat(64);
const snapshot = (): EnrollmentSnapshot => ({ schema: 1, sequence: 1, revision: 1, epoch: 0, selectedProduct: 0, busy: false, interrupted: '', frozen: '', barcodeAvailable: false, products: [{ label: 'Milk', views: [null, null, null, null], barcode: 'UNAVAILABLE', barcodeValue: '', barcodeEpoch: 0, encodedBytes: 30 }], candidate: null, sourceSha256: source });
function bridge(value = snapshot()): jest.Mocked<EnrollmentBridge> {
  return { enableBarcodes: jest.fn().mockResolvedValue(value), openBarcode: jest.fn().mockResolvedValue(value), confirmBarcode: jest.fn().mockResolvedValue(value), snapshot: jest.fn<ReturnType<EnrollmentBridge['snapshot']>, Parameters<EnrollmentBridge['snapshot']>>().mockResolvedValue(value), select: jest.fn<ReturnType<EnrollmentBridge['select']>, Parameters<EnrollmentBridge['select']>>().mockResolvedValue(value), openCapture: jest.fn<ReturnType<EnrollmentBridge['openCapture']>, Parameters<EnrollmentBridge['openCapture']>>().mockResolvedValue(value), reviewCandidate: jest.fn<ReturnType<EnrollmentBridge['reviewCandidate']>, Parameters<EnrollmentBridge['reviewCandidate']>>().mockResolvedValue(value), keep: jest.fn<ReturnType<EnrollmentBridge['keep']>, Parameters<EnrollmentBridge['keep']>>().mockResolvedValue(value), decline: jest.fn<ReturnType<EnrollmentBridge['decline']>, Parameters<EnrollmentBridge['decline']>>().mockResolvedValue(value), freeze: jest.fn<ReturnType<EnrollmentBridge['freeze']>, Parameters<EnrollmentBridge['freeze']>>().mockResolvedValue(value), newRevision: jest.fn<ReturnType<EnrollmentBridge['newRevision']>, Parameters<EnrollmentBridge['newRevision']>>().mockResolvedValue(value) };
}
describe('observed enrollment snapshot boundary', () => {
  it('accepts the bounded native summary without vectors or paths', () => { expect(parseEnrollmentSnapshot(snapshot(), source).products[0].label).toBe('Milk'); });
  it.each([
    { sourceSha256: 'c'.repeat(64) }, { sequence: 4097 }, { products: [] }, { busy: 'false' }, { candidate: { product: 0, view: 0, job: 1, epoch: 1, receipt } },
    { products: [{ ...snapshot().products[0], views: [null, { job: 1, receipt }, null, null] }] },
    { products: [{ ...snapshot().products[0], encodedBytes: 32769 }] },
    { products: [{ ...snapshot().products[0], barcode: 'CONFIRMED' }] }, { frozen: receipt }, { privatePath: '/private/photo' },
  ])('rejects malformed or mismatched native state %j', change => { expect(() => parseEnrollmentSnapshot({ ...snapshot(), ...change }, source)).toThrow('ENROLLMENT_SNAPSHOT_INVALID'); });
  it('rejects duplicate job identity across views', () => { const value = snapshot(); value.products[0].views = [{ job: 1, receipt }, { job: 1, receipt }, null, null]; expect(() => parseEnrollmentSnapshot(value, source)).toThrow(); });
  it('rejects a review candidate owned by another selected product', () => {
    const value = snapshot(); value.epoch = 1;
    value.products.push({ ...value.products[0], label: 'Soap' });
    value.candidate = { product: 1, view: 0, job: 1, epoch: 1, receipt };
    expect(() => parseEnrollmentSnapshot(value, source)).toThrow();
  });
});
describe('guided enrollment UI', () => {
  it('opens only the selected product barcode binding on explicit rearm', async () => {
    const value = snapshot(); value.barcodeAvailable = true; value.products[0].barcode = 'NOT_PRESENTED';
    value.products[0].views[0] = { job: 1, receipt };
    const api = bridge(value); const screen = render(<EnrollmentPanel bridge={api} expectedSource={source} />); await act(async () => {});
    expect(api.openBarcode).not.toHaveBeenCalled();
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'Scan barcode / explicitly rearm' })); });
    expect(api.openBarcode).toHaveBeenCalledWith(1, 0, 0, receipt); expect(api.openCapture).not.toHaveBeenCalled();
  });
  it('requires exact pending code confirmation and blocks photography/selection first', async () => {
    const value = snapshot(); value.barcodeAvailable = true; value.epoch = 3;
    Object.assign(value.products[0], { barcode: 'PENDING', barcodeValue: '5901234123457', barcodeEpoch: 3 });
    const api = bridge(value); const screen = render(<EnrollmentPanel bridge={api} expectedSource={source} />); await act(async () => {});
    expect(api.confirmBarcode).not.toHaveBeenCalled();
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'Open Front camera' })); });
    expect(api.openCapture).not.toHaveBeenCalled();
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'Confirm this code for the selected product' })); });
    expect(api.confirmBarcode).toHaveBeenCalledWith(1, 0, 3, true);
  });
  it('declines a code without acquiring or taking a photo', async () => {
    const value = snapshot(); value.barcodeAvailable = true; value.epoch = 2;
    Object.assign(value.products[0], { barcode: 'PENDING', barcodeValue: '96385074', barcodeEpoch: 2 });
    const api = bridge(value); const screen = render(<EnrollmentPanel bridge={api} expectedSource={source} />); await act(async () => {});
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'Decline this code' })); });
    expect(api.confirmBarcode).toHaveBeenCalledWith(1, 0, 2, false); expect(api.openCapture).not.toHaveBeenCalled();
  });
  it('rejects malformed pending-code checksums and future candidate epochs', () => {
    const value = snapshot(); value.barcodeAvailable = true; value.epoch = 1;
    Object.assign(value.products[0], { barcode: 'PENDING', barcodeValue: '5901234123458', barcodeEpoch: 1 });
    expect(() => parseEnrollmentSnapshot(value, source)).toThrow();
    Object.assign(value.products[0], { barcodeValue: '5901234123457', barcodeEpoch: 2 });
    expect(() => parseEnrollmentSnapshot(value, source)).toThrow();
  });
  it('rejects a pending code for another selected product and duplicate confirmed canonical codes', () => {
    const value = snapshot(); value.barcodeAvailable = true; value.epoch = 2;
    Object.assign(value.products[0], { barcode: 'CONFIRMED', barcodeValue: '036000291452', barcodeEpoch: 1 });
    value.products.push({ ...value.products[0], label: 'Other package', barcodeValue: '0036000291452' });
    expect(() => parseEnrollmentSnapshot(value, source)).toThrow();
    value.products[1].barcode = 'PENDING'; value.products[1].barcodeEpoch = 2;
    expect(() => parseEnrollmentSnapshot(value, source)).toThrow();
  });
  it('reads progress on mount and never starts a camera automatically', async () => {
    const api = bridge(); const screen = render(<EnrollmentPanel bridge={api} expectedSource={source} />);
    await act(async () => {}); expect(api.snapshot).toHaveBeenCalledTimes(1); expect(api.openCapture).not.toHaveBeenCalled();
    expect(screen.getByText('This saved gallery has barcode scanning disabled. Its saved views will be preserved if you enable it.')).toBeTruthy();
    expect(api.enableBarcodes).not.toHaveBeenCalled(); expect(api.openBarcode).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Open Rear camera' })).toBeDisabled();
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'Open Front camera' })); });
    expect(api.openCapture).toHaveBeenCalledWith(1, 0, 0, ''); expect(api.keep).not.toHaveBeenCalled();
  });
  it('keeps native review identity and blocks capture while a candidate awaits review', async () => {
    const value = snapshot(); value.epoch = 7; value.candidate = { product: 0, view: 0, job: 2, epoch: 7, receipt }; const api = bridge(value);
    const screen = render(<EnrollmentPanel bridge={api} expectedSource={source} />); await act(async () => {});
    expect(screen.queryByRole('button', { name: 'Open Front camera' })).toBeNull();
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'Keep saved view' })); }); expect(api.keep).toHaveBeenCalledWith(1, 2, 7);
  });
  it('disables further effects after invalid returned state and does not retry automatically', async () => {
    const api = bridge(); api.snapshot.mockResolvedValue({ ...snapshot(), sourceSha256: 'c'.repeat(64) }); const screen = render(<EnrollmentPanel bridge={api} expectedSource={source} />); await act(async () => {});
    expect(screen.getByText(/Enrollment could not be verified/)).toBeTruthy(); expect(api.snapshot).toHaveBeenCalledTimes(1); expect(api.openCapture).not.toHaveBeenCalled();
  });
  it('ignores a late response from a replaced bridge without unlocking the new request', async () => {
    let finishOld!: (value: unknown) => void, finishNew!: (value: unknown) => void;
    const oldApi = bridge(), newApi = bridge();
    oldApi.snapshot.mockReturnValue(new Promise(resolve => { finishOld = resolve; }));
    newApi.snapshot.mockReturnValue(new Promise(resolve => { finishNew = resolve; }));
    const screen = render(<EnrollmentPanel bridge={oldApi} expectedSource={source} />);
    screen.rerender(<EnrollmentPanel bridge={newApi} expectedSource={source} />);
    await act(async () => { finishOld(snapshot()); });
    expect(screen.queryByRole('button', { name: 'Open Front camera' })).toBeNull();
    await act(async () => { finishNew(snapshot()); });
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'Open Front camera' })); });
    expect(newApi.openCapture).toHaveBeenCalledWith(1, 0, 0, '');
    expect(oldApi.openCapture).not.toHaveBeenCalled();
  });
});
