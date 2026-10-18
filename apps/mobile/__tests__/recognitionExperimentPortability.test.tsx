import { act, fireEvent, render } from '@testing-library/react-native';
import { PhonePortabilityPanel } from '../src/recognitionExperiment/PhonePortabilityPanel';
import * as native from '../src/recognitionExperiment/nativeAdapter';
import { validatePrivateResult, validatePrivateState, type PrivateResult } from '../src/recognitionExperiment/phonePortability';
jest.mock('../src/recognitionExperiment/nativeAdapter',()=>({importPrivatePortability:jest.fn(),recoverPrivatePortability:jest.fn(),runPrivatePortability:jest.fn(),exportPrivatePortability:jest.fn(),cancelPrivatePortability:jest.fn(),checkPrivateOfflineGate:jest.fn()}));
function result():PrivateResult {return {kind:'PRIVATE_PHONE_PORTABILITY_RESULTS',manifestSha256:'a'.repeat(64),replaySourceSha256:'b'.repeat(64),packetSha256:'c'.repeat(64),bundleSha256:'d'.repeat(64),bundleBytes:1000,durable:true,records:80,attemptedInferences:80,complete:true,totalMs:80,
  lanes:[{lane:'control',denominator:20,first:17,firstThree:20,complete:true},{lane:'phone',denominator:20,first:16,firstThree:19,complete:true}]};}
beforeEach(()=>jest.clearAllMocks());
test('mount performs no private work; explicit import and offline confirmation precede a single replay',async()=>{
  const screen=render(<PhonePortabilityPanel blocked={false} onPending={jest.fn()}/>);
  expect(native.importPrivatePortability).not.toHaveBeenCalled();expect(native.recoverPrivatePortability).not.toHaveBeenCalled();expect(native.runPrivatePortability).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Run one private replay').props.accessibilityState.disabled).toBe(true);
  jest.mocked(native.importPrivatePortability).mockResolvedValueOnce('c'.repeat(64));fireEvent.press(screen.getByLabelText('Import reviewed private packet'));await act(async()=>{});
  expect(screen.getByLabelText('Run one private replay').props.accessibilityState.disabled).toBe(true);
  fireEvent(screen.getByLabelText('Confirm device offline state'),'valueChange',true);jest.mocked(native.runPrivatePortability).mockResolvedValueOnce(result());fireEvent.press(screen.getByLabelText('Run one private replay'));await act(async()=>{});
  expect(native.runPrivatePortability).toHaveBeenCalledTimes(1);expect(screen.getByText('control: first 17/20 · first three 20/20 · complete')).toBeTruthy();expect(screen.getByLabelText('Run one private replay').props.accessibilityState.disabled).toBe(true);
  expect(native.exportPrivatePortability).not.toHaveBeenCalled();
});
test('failed import stays unready; recovery and export failures do not claim success',async()=>{
  const screen=render(<PhonePortabilityPanel blocked={false} onPending={jest.fn()}/>);jest.mocked(native.importPrivatePortability).mockRejectedValueOnce(new Error('Packet rejected'));
  fireEvent.press(screen.getByLabelText('Import reviewed private packet'));await act(async()=>{});expect(screen.getByText('Packet rejected')).toBeTruthy();expect(screen.getByLabelText('Run one private replay').props.accessibilityState.disabled).toBe(true);
  jest.mocked(native.recoverPrivatePortability).mockResolvedValueOnce({kind:'PRIVATE_PORTABILITY_STATE',ready:true,interruptedSession:true,packetSha256:'c'.repeat(64),records:40,result:result()});fireEvent.press(screen.getByLabelText('Verify saved private evidence'));await act(async()=>{});
  expect(screen.getByText(/Interrupted private picker classified/)).toBeTruthy();jest.mocked(native.exportPrivatePortability).mockRejectedValueOnce(new Error('Export cancelled'));
  fireEvent.press(screen.getByLabelText('Export saved private numerical evidence'));await act(async()=>{});expect(screen.getByText('Export cancelled')).toBeTruthy();expect(screen.queryByText(/Complete saved numerical ZIP written/)).toBeNull();expect(native.runPrivatePortability).not.toHaveBeenCalled();
});
test('rejects nondurable, mismatched or oversized native summaries',()=>{
  expect(()=>validatePrivateResult({...result(),durable:false})).toThrow();expect(()=>validatePrivateResult({...result(),bundleBytes:49*1024*1024})).toThrow();
  expect(()=>validatePrivateResult({...result(),lanes:[{...result().lanes[0],denominator:19},result().lanes[1]]})).toThrow();
  expect(()=>validatePrivateState({kind:'PRIVATE_PORTABILITY_STATE',ready:true,interruptedSession:false,records:40,packetSha256:'e'.repeat(64),result:result()})).toThrow();
});
test('explicit saved-policy status starts no private work and never enables replay by itself',async()=>{
  const screen=render(<PhonePortabilityPanel blocked={false} onPending={jest.fn()}/>);
  expect(native.checkPrivateOfflineGate).not.toHaveBeenCalled();
  jest.mocked(native.checkPrivateOfflineGate).mockResolvedValueOnce({kind:'PRIVATE_OFFLINE_GATE_STATUS',eligible:true,reason:'ELIGIBLE',airplane:1,wifiPolicy:3,bluetoothPolicy:2,policySupported:true,coherent:true,modelCalls:0,privateStateTouched:false});
  fireEvent.press(screen.getByLabelText('Check private offline gate'));await act(async()=>{});
  expect(screen.getByText(/Saved offline policy is eligible/)).toBeTruthy();
  expect(screen.getByLabelText('Run one private replay').props.accessibilityState.disabled).toBe(true);
  expect(native.importPrivatePortability).not.toHaveBeenCalled();expect(native.recoverPrivatePortability).not.toHaveBeenCalled();expect(native.runPrivatePortability).not.toHaveBeenCalled();expect(native.exportPrivatePortability).not.toHaveBeenCalled();expect(native.cancelPrivatePortability).not.toHaveBeenCalled();
});
test('busy/closed/read refusal status is actionable; diagnostic pending offers no operation cancellation',async()=>{
  let resolveStatus: (v: Awaited<ReturnType<typeof native.checkPrivateOfflineGate>>) => void = () => {};
  jest.mocked(native.checkPrivateOfflineGate).mockReturnValueOnce(new Promise(resolve=>{resolveStatus=resolve;}));
  const screen=render(<PhonePortabilityPanel blocked={false} onPending={jest.fn()}/>);
  fireEvent.press(screen.getByLabelText('Check private offline gate'));await act(async()=>{});
  expect(screen.queryByLabelText('Cancel private operation')).toBeNull();
  expect(screen.getByLabelText('Check private offline gate').props.accessibilityState.disabled).toBe(true);
  await act(async()=>resolveStatus({kind:'PRIVATE_OFFLINE_GATE_STATUS',eligible:false,reason:'BUSY',airplane:null,wifiPolicy:null,bluetoothPolicy:null,policySupported:false,coherent:false,modelCalls:0,privateStateTouched:false}));
  expect(screen.getByText(/Another operation owns the harness/)).toBeTruthy();expect(native.cancelPrivatePortability).not.toHaveBeenCalled();
  jest.mocked(native.checkPrivateOfflineGate).mockRejectedValueOnce(new Error('Invalid private offline gate status.'));
  fireEvent.press(screen.getByLabelText('Check private offline gate'));await act(async()=>{});
  expect(screen.getByText('Invalid private offline gate status.')).toBeTruthy();expect(native.runPrivatePortability).not.toHaveBeenCalled();
});
