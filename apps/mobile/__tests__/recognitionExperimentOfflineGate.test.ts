import { validatePrivateOfflineGate, privateOfflineGateMessage, type PrivateOfflineGateStatus } from '../src/recognitionExperiment/phonePortability';
import { checkPrivateOfflineGate } from '../src/recognitionExperiment/nativeAdapter';
const mockNative={checkPrivateOfflineGate:jest.fn(),importPrivatePortability:jest.fn(),runPrivatePortability:jest.fn(),recoverPrivatePortability:jest.fn(),exportPrivatePortability:jest.fn(),cancelPrivatePortability:jest.fn()};
jest.mock('expo-modules-core',()=>{
  const actual=jest.requireActual('expo-modules-core');
  return {...actual,requireNativeModule:(name:string)=>name==='RecognitionExperiment'?mockNative:actual.requireNativeModule(name)};
});
const eligible: PrivateOfflineGateStatus = {kind:'PRIVATE_OFFLINE_GATE_STATUS',eligible:true,reason:'ELIGIBLE',airplane:1,wifiPolicy:3,bluetoothPolicy:2,policySupported:true,coherent:true,modelCalls:0,privateStateTouched:false};
test('strict scalar status accepts coherent eligible values and refuses malformed evidence',()=>{
  expect(validatePrivateOfflineGate(eligible)).toEqual(eligible);
  for(const value of [{...eligible,extra:true},{...eligible,eligible:false},{...eligible,reason:'UNKNOWN'},{...eligible,coherent:false},{...eligible,policySupported:false},{...eligible,airplane:0},{...eligible,wifiPolicy:1},{...eligible,bluetoothPolicy:1},{...eligible,modelCalls:1},{...eligible,privateStateTouched:true},{...eligible,wifiPolicy:'3'},{...eligible,airplane:NaN},{...eligible,bluetoothPolicy:undefined}])expect(()=>validatePrivateOfflineGate(value)).toThrow();
  expect(privateOfflineGateMessage(eligible)).toContain('No private work started');
});
test('real adapter validates only the diagnostic method and retains busy ownership through malformed results',async()=>{
  let resolve: (value:unknown)=>void=()=>{};
  const n=mockNative;n.checkPrivateOfflineGate.mockReturnValueOnce(new Promise(done=>{resolve=done;}));
  const pending=checkPrivateOfflineGate();
  await expect(checkPrivateOfflineGate()).rejects.toThrow('One operation is already running.');
  resolve({...eligible,modelCalls:1});await expect(pending).rejects.toThrow();
  n.checkPrivateOfflineGate.mockResolvedValueOnce(eligible);await expect(checkPrivateOfflineGate()).resolves.toEqual(eligible);
  for(const method of [n.importPrivatePortability,n.runPrivatePortability,n.recoverPrivatePortability,n.exportPrivatePortability,n.cancelPrivatePortability])expect(method).not.toHaveBeenCalled();
  expect(n.checkPrivateOfflineGate).toHaveBeenCalledTimes(2);
});
