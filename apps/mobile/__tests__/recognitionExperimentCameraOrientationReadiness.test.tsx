import { act, fireEvent, render } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { CameraOrientationPanel } from '../src/recognitionExperiment/CameraOrientationPanel';
import { getCameraPermissionsAsync, requestCameraPermissionsAsync } from '../src/recognitionExperiment/cameraRuntime';
import { cameraOrientationNative } from '../src/recognitionExperiment/nativeAdapter';
import { ORIENTATION_RUN } from '../src/recognitionExperiment/cameraOrientationProof';

jest.mock('../src/recognitionExperiment/cameraRuntime', () => {
 const React = jest.requireActual<typeof import('react')>('react');
 const { View } = jest.requireActual<typeof import('react-native')>('react-native');
 const get = jest.fn();
 return { getCameraPermissionsAsync: get, requestCameraPermissionsAsync: jest.fn(),
  // Expo starts unknown and resolves asynchronously; the old synchronous mock hid this path.
  useCameraPermissions: () => {
   const [value, setValue] = React.useState<null | { granted: boolean }>(null);
   React.useEffect(() => { let live=true; void get().then((p: {granted:boolean}) => { if(live)setValue(p); }); return () => {live=false;}; }, []);
   return [value, jest.fn()];
  },
  CameraView: React.forwardRef(function PermissionCamera(props, _ref) { return <View {...props} testID="permission-camera" />; }),
 };
});
jest.mock('../src/recognitionExperiment/nativeAdapter', () => ({ cameraOrientationNative: { inspectOrientationProof: jest.fn(), beginOrientationCase: jest.fn(), cancelOrientationProof: jest.fn(), failOrientationCapture: jest.fn(), processOrientationProof: jest.fn(), sealOrientationRun: jest.fn(), openOrientationExport: jest.fn(), orientationExportStatus: jest.fn() } }));
const m=jest.mocked(cameraOrientationNative), get=jest.mocked(getCameraPermissionsAsync);
const response=(granted:boolean) => ({granted,status:granted?'granted':'denied',expires:'never',canAskAgain:true}) as Awaited<ReturnType<typeof getCameraPermissionsAsync>>;
const nativeState=() => ({kind:'CAMERA_ORIENTATION_STATUS',run:ORIENTATION_RUN,profileVersion:2,next:'M00-A000',idle:true,readinessNonce:'a0000000-0000-4000-8000-000000000001',firstExportVerified:false,generatedExportVerified:true,camera:{ownedCapBytes:268435456,claimedBytes:65536}});
function deferred() { let resolve!:(v:Awaited<ReturnType<typeof getCameraPermissionsAsync>>)=>void;const promise=new Promise<Awaited<ReturnType<typeof getCameraPermissionsAsync>>>(r=>{resolve=r;});return {promise,resolve}; }
let onState:(state:AppStateStatus)=>void;
beforeEach(()=>{jest.resetAllMocks();Object.defineProperty(AppState,'currentState',{configurable:true,value:'active'});jest.spyOn(AppState,'addEventListener').mockImplementation((_event,listener)=>{onState=listener;return {remove:jest.fn()};});get.mockResolvedValue(response(true));m.inspectOrientationProof.mockResolvedValue(nativeState());});
afterEach(()=>jest.restoreAllMocks());
async function transition(state:AppStateStatus) { await act(async()=>{Object.defineProperty(AppState,'currentState',{configurable:true,value:state});onState(state);}); }
async function inspect(s:ReturnType<typeof render>) { await act(async()=>fireEvent.press(s.getByLabelText('Inspect new geometry run'))); }
function layout(s:ReturnType<typeof render>) { fireEvent(s.getByTestId('orientation-space'),'layout',{nativeEvent:{layout:{width:400,height:200}}});fireEvent(s.getByTestId('orientation-viewport'),'layout',{nativeEvent:{layout:{width:400,height:200}}}); }
function restoreEnabled(s:ReturnType<typeof render>) { return !s.getByLabelText('Restore preview without capture').props.accessibilityState.disabled; }
function noHiddenEffects() {expect(requestCameraPermissionsAsync).not.toHaveBeenCalled();expect(m.beginOrientationCase).not.toHaveBeenCalled();expect(m.processOrientationProof).not.toHaveBeenCalled();expect(m.openOrientationExport).not.toHaveBeenCalled();}

test('single inspection retains readable native status and capacity instead of null',async()=>{const s=render(<CameraOrientationPanel/>);await inspect(s);expect(s.getByText(JSON.stringify(nativeState()))).toBeTruthy();expect(s.queryByText('null')).toBeNull();expect(m.inspectOrientationProof).toHaveBeenCalledTimes(1);noHiddenEffects();});
test('inspection error remains visible without hidden work',async()=>{m.inspectOrientationProof.mockRejectedValueOnce(Error('CAMERA_TEST_READ_FAILED'));const s=render(<CameraOrientationPanel/>);await inspect(s);expect(s.getByText(/CAMERA_TEST_READ_FAILED/)).toBeTruthy();noHiddenEffects();});
test('unknown mount permission blocks preview; async grant enables explicit restore only',async()=>{const p=deferred();get.mockReturnValueOnce(p.promise);const s=render(<CameraOrientationPanel/>);layout(s);await inspect(s);expect(restoreEnabled(s)).toBe(false);expect(s.queryByTestId('permission-camera')).toBeNull();await act(async()=>p.resolve(response(true)));expect(restoreEnabled(s)).toBe(true);expect(s.queryByTestId('permission-camera')).toBeNull();await act(async()=>fireEvent.press(s.getByLabelText('Restore preview without capture')));expect(s.getByTestId('permission-camera')).toBeTruthy();noHiddenEffects();});
test('async mount denial remains blocked',async()=>{const p=deferred();get.mockReturnValueOnce(p.promise);const s=render(<CameraOrientationPanel/>);layout(s);await inspect(s);await act(async()=>p.resolve(response(false)));expect(restoreEnabled(s)).toBe(false);expect(s.queryByTestId('permission-camera')).toBeNull();noHiddenEffects();});
test('foreground grant refresh replaces earlier denial without auto preview',async()=>{get.mockResolvedValueOnce(response(false)).mockResolvedValueOnce(response(true));const s=render(<CameraOrientationPanel/>);await inspect(s);expect(restoreEnabled(s)).toBe(false);await transition('background');await transition('active');await inspect(s);expect(restoreEnabled(s)).toBe(true);expect(s.queryByTestId('permission-camera')).toBeNull();expect(get).toHaveBeenCalledTimes(2);noHiddenEffects();});
test('background closes preview and foreground cannot restore it automatically',async()=>{const s=render(<CameraOrientationPanel/>);layout(s);await inspect(s);await act(async()=>fireEvent.press(s.getByLabelText('Restore preview without capture')));expect(s.getByTestId('permission-camera')).toBeTruthy();await transition('background');expect(s.queryByTestId('permission-camera')).toBeNull();await transition('active');await inspect(s);expect(s.queryByTestId('permission-camera')).toBeNull();expect(restoreEnabled(s)).toBe(true);noHiddenEffects();});
test('foreground denial invalidates camera and acknowledgement readiness',async()=>{get.mockResolvedValueOnce(response(true)).mockResolvedValueOnce(response(false));const s=render(<CameraOrientationPanel/>);layout(s);await inspect(s);await act(async()=>fireEvent.press(s.getByLabelText('Restore preview without capture')));await transition('background');await transition('active');await inspect(s);expect(restoreEnabled(s)).toBe(false);expect(s.queryByTestId('permission-camera')).toBeNull();expect(s.getByLabelText('Acknowledge current chart and supported phone').props.accessibilityState.disabled).toBe(true);expect(s.getByLabelText('Capture this geometry row once').props.accessibilityState.disabled).toBe(true);noHiddenEffects();});
test('late mount grant cannot override newer foreground denial',async()=>{const old=deferred();get.mockReturnValueOnce(old.promise).mockResolvedValueOnce(response(false));const s=render(<CameraOrientationPanel/>);layout(s);await transition('background');await transition('active');await inspect(s);await act(async()=>old.resolve(response(true)));expect(restoreEnabled(s)).toBe(false);expect(s.queryByTestId('permission-camera')).toBeNull();noHiddenEffects();});
test('late foreground grant cannot override newer denial',async()=>{const old=deferred();get.mockResolvedValueOnce(response(false)).mockReturnValueOnce(old.promise).mockResolvedValueOnce(response(false));const s=render(<CameraOrientationPanel/>);await act(async()=>{});await transition('background');await transition('active');await transition('inactive');await transition('active');await inspect(s);await act(async()=>old.resolve(response(true)));expect(restoreEnabled(s)).toBe(false);noHiddenEffects();});
test('grant reply after background cannot enable preview',async()=>{const old=deferred();get.mockReturnValueOnce(old.promise);const s=render(<CameraOrientationPanel/>);layout(s);await inspect(s);await transition('background');await act(async()=>old.resolve(response(true)));expect(restoreEnabled(s)).toBe(false);expect(s.queryByTestId('permission-camera')).toBeNull();noHiddenEffects();});
test('grant reply after unmount starts no native work',async()=>{const old=deferred();get.mockReturnValueOnce(old.promise);const s=render(<CameraOrientationPanel/>);s.unmount();await act(async()=>old.resolve(response(true)));expect(m.inspectOrientationProof).not.toHaveBeenCalled();noHiddenEffects();});

test('late inspection reply after background cannot restore a native nonce',async()=>{let resolve!:(v:ReturnType<typeof nativeState>)=>void;const wait=new Promise<ReturnType<typeof nativeState>>(r=>{resolve=r;});m.inspectOrientationProof.mockReturnValueOnce(wait);const s=render(<CameraOrientationPanel/>);await act(async()=>{});fireEvent.press(s.getByLabelText('Inspect new geometry run'));await transition('background');await transition('active');await act(async()=>resolve(nativeState()));expect(restoreEnabled(s)).toBe(false);expect(s.queryByText(JSON.stringify(nativeState()))).toBeNull();noHiddenEffects();});

test('failed current permission query remains blocked without asking for permission',async()=>{get.mockRejectedValueOnce(Error('permission check unavailable'));const s=render(<CameraOrientationPanel/>);await inspect(s);expect(restoreEnabled(s)).toBe(false);expect(s.queryByTestId('permission-camera')).toBeNull();noHiddenEffects();});
