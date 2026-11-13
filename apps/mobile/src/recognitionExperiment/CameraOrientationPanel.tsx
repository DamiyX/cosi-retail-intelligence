import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ComponentProps, type ForwardRefExoticComponent, type RefAttributes } from 'react';
import { AppState, PixelRatio, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CameraView, getCameraPermissionsAsync } from './cameraRuntime';
import { cameraOrientationNative, openCaptureDiagnostic, captureDiagnosticSnapshot, captureDiagnosticSetupSnapshot, openGraphicsEntryProbe, graphicsEntryMetadata } from './nativeAdapter';
import { choosePictureSize, cameraProofErrorCode } from './cameraProof';
import { CameraOrientationRun, orientationCase, orientationStatus, type OrientationStatus } from './cameraOrientationProof';
import { orientationMarker, settledCapturePhase, SETUP_PREVIEW_MS, TERMINAL_PREVIEW_MS, type CapturePhase, type CaptureError } from './cameraOrientationEvidence';

type GeometryProps = ComponentProps<typeof CameraView> & { cosiSameFrame: boolean; cosiPreviewGeneration: number; onCosiGeometryReady: (event: { nativeEvent: { generation: number; pictureSize: string } }) => void };
const GeometryCamera = CameraView as unknown as ForwardRefExoticComponent<GeometryProps & RefAttributes<CameraView>>;
function Button({ label, disabled = false, onPress }: { label: string; disabled?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[styles.button, disabled && styles.disabled]}><Text style={styles.buttonText}>{label}</Text></Pressable>;
}
/** Only the explicit V2 artifact renders this finite experiment; the default remains saved-evidence recovery. */
export function CameraOrientationPanel() {
  if (process.env.EXPO_PUBLIC_RECOGNITION_GRAPHICS_ENTRY_PROBE === '1') return <GraphicsEntryPanel />;
  return process.env.EXPO_PUBLIC_RECOGNITION_SETUP_METADATA_ONLY === '1' ? <DiagnosticSetupMetadataPanel /> : <CameraOrientationExperimentPanel />;
}
function GraphicsEntryPanel() {
  const [busy, setBusy] = useState(false), [entered, setEntered] = useState(false), [message, setMessage] = useState('Observation only. One entry. No photo or automatic camera opening.');
  async function act(enter: boolean) {
    if (busy || (enter && entered)) return;
    setBusy(true);if (enter) setEntered(true);
    try { const value = enter ? await openGraphicsEntryProbe() : await graphicsEntryMetadata();setMessage(typeof value === 'string' ? value : JSON.stringify(value)); }
    catch (error) { setMessage(cameraProofErrorCode(error)); }
    finally { setBusy(false); }
  }
  return <View style={styles.page}>
    <Text style={styles.title}>Graphics entry observations</Text>
    <Button label="Open graphics entry probe (no photo)" disabled={busy || entered} onPress={() => void act(true)} />
    <Button label="Read graphics and retained setup metadata" disabled={busy} onPress={() => void act(false)} />
    <ScrollView><Text selectable accessibilityLiveRegion="polite">{message}</Text></ScrollView>
  </View>;
}
function DiagnosticSetupMetadataPanel() {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('Read retained setup metadata only. Capture and recovery are disabled.');
  async function inspect() {
    if (busy) return;
    setBusy(true);
    try { setMessage(JSON.stringify(await captureDiagnosticSetupSnapshot())); }
    catch (error) { setMessage(cameraProofErrorCode(error)); }
    finally { setBusy(false); }
  }
  return <View style={styles.page}>
    <Text style={styles.title}>Interrupted setup metadata</Text>
    <Button label="Inspect interrupted setup metadata (no capture)" disabled={busy} onPress={() => void inspect()} />
    <ScrollView><Text accessibilityLiveRegion="polite" selectable>{message}</Text></ScrollView>
  </View>;
}
function CameraOrientationExperimentPanel() {
  // One read-only authority. Unknown is blocked until the current foreground query resolves.
  const [permissionGranted, setGranted] = useState<boolean | null>(null), [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [layout, setLayout] = useState<'A' | 'B'>('A'), [space, setSpace] = useState({ width: 0, height: 0 }), [preview, setPreview] = useState({ width: 0, height: 0 });
  const [chosen, setChosen] = useState<ReturnType<typeof choosePictureSize> | null>(null), [readyKey, setReadyKey] = useState<string | null>(null), [previewEnabled, setPreviewEnabled] = useState(false);
  const [status, setStatus] = useState<OrientationStatus | null>(null), [busy, setBusy] = useState(false), [acknowledged, setAcknowledged] = useState<{ key: string; at: number } | null>(null), [message, setMessage] = useState('Use only the approved new geometry packet. No photo starts automatically. Complete the generated export check first.');
  const camera = useRef<CameraView | null>(null), box = useRef<View | null>(null), mounted = useRef(true), owner = useRef(false), lifecycleRevision = useRef(0);
  const capturedCase = useRef<string | null>(null);
  const [captured, setCaptured] = useState<string | null>(null), [lifecycle, setLifecycle] = useState(0);
  const [viewGeneration, setViewGeneration] = useState(1);
  const [phase, setPhase] = useState<CapturePhase>('IDLE');
  const [captureError, setCaptureError] = useState<CaptureError | null>(null), [inspectionError, setInspectionError] = useState<CaptureError | null>(null);
  const [run] = useState(() => new CameraOrientationRun(cameraOrientationNative));
  const granted = permissionGranted === true;
  const key = `${layout}:${chosen?.size ?? 'initial'}:${preview.width}x${preview.height}:${previewEnabled}:${granted}:${foreground}`;
  const mountKey = `${layout}:${preview.width}x${preview.height}:${previewEnabled}:${granted}:${foreground}`;
  const ready = readyKey === key, ack = acknowledged?.key === key ? acknowledged.at : null;
  function setReady(value: boolean) { setReadyKey(value ? key : null); }
  function setAck(at: number | null) { setAcknowledged(at === null ? null : { key, at }); }
  const keyRef = useRef(key), generation = useRef(1);
  useLayoutEffect(() => { keyRef.current = key; generation.current++;setViewGeneration(generation.current);run.cancel('UNMOUNT'); }, [key, run]);
  useEffect(() => {
    mounted.current = true;
    function invalidateQueries(updateView = true) { lifecycleRevision.current++;if (updateView) setLifecycle(lifecycleRevision.current); }
    function invalidate() {
      invalidateQueries();setGranted(null);setPreviewEnabled(false);setAcknowledged(null);setReadyKey(null);setStatus(null);
      capturedCase.current = null;setCaptured(null);setPhase('UNKNOWN');
      setCaptureError(null);setInspectionError(null);
    }
    function refresh() {
      invalidate();const current = lifecycleRevision.current;
      void getCameraPermissionsAsync().then(p => {
        if (!mounted.current || current !== lifecycleRevision.current || AppState.currentState !== 'active') return;
        setGranted(p.granted === true);
        if (!p.granted) run.cancel('PERMISSION_LOSS');
      }).catch(() => {
        if (!mounted.current || current !== lifecycleRevision.current || AppState.currentState !== 'active') return;
        setGranted(false);run.cancel('PERMISSION_LOSS');
      });
    }
    if (AppState.currentState === 'active') refresh();
    const sub = AppState.addEventListener('change', state => {
      setForeground(state === 'active');
      if (state !== 'active') { invalidate();run.cancel('BACKGROUND'); }
      else refresh();
    });
    return () => { invalidateQueries(false);mounted.current = false;sub.remove();run.cancel('UNMOUNT'); };
  }, [run]);
  async function update() {
    const current = lifecycleRevision.current;
    const view = generation.current;
    const value = orientationStatus(await cameraOrientationNative.inspectOrientationProof());
    if (mounted.current && current === lifecycleRevision.current && view === generation.current && AppState.currentState === 'active') {
      setStatus(value);setAck(null);setMessage(JSON.stringify(value));
      // Keep the completed row's actual view until its post image is collected.
      if (!previewEnabled && orientationCase(value.next)) setLayout(/^M\d\d-B/.test(value.next) ? 'B' : 'A');
      setPhase(capturedCase.current ? settledCapturePhase(value, capturedCase.current) : value.idle && orientationCase(value.next) ? 'IDLE' : 'UNKNOWN');
    }
  }
  const canClosePreview = previewEnabled && !busy && !run.running && status?.idle === true &&
    ((!captured && phase === 'IDLE') || phase === 'PUBLISHED' || phase === 'REFUSED');
  const closePreview = useCallback((reason: string) => {
    if (!canClosePreview || owner.current || run.running) return;
    setPreviewEnabled(false);setReadyKey(null);setAcknowledged(null);setMessage(reason);
  }, [canClosePreview, run]);
  useEffect(() => {
    if (!canClosePreview || !foreground) return;
    const terminal = phase === 'PUBLISHED' || phase === 'REFUSED';
    const timer = setTimeout(() => closePreview(terminal
      ? 'Settled preview closed after 30 seconds. Any missing post evidence remains missing.'
      : 'Idle preview paused after two minutes. Your setup can continue; restore it explicitly when ready.'), terminal ? TERMINAL_PREVIEW_MS : SETUP_PREVIEW_MS);
    return () => clearTimeout(timer);
  }, [canClosePreview, foreground, phase, closePreview]);
  function restorePreview() {
    if (owner.current || run.running || busy || previewEnabled || !foreground || !granted || !status?.generatedExportVerified || !status.idle || !orientationCase(status.next)) return;
    setLayout(/^M\d\d-B/.test(status.next) ? 'B' : 'A');capturedCase.current = null;setCaptured(null);
    setPhase('IDLE');setReadyKey(null);setAck(null);setCaptureError(null);setInspectionError(null);setStatus(previous => previous ? { ...previous, readinessNonce: null } : null);setPreviewEnabled(true);
  }
  async function action(work: () => Promise<unknown>, inspect = false) {
    if (owner.current || run.running) return;
    owner.current = true;setBusy(true);setAck(null);
    try { const result = await work();if (inspect) await update();else if (mounted.current) setMessage(JSON.stringify(result)); }
    catch (error) { if (mounted.current) setMessage(`${cameraProofErrorCode(error)}. Inspect the existing row; never repeat a consumed action.`); }
    finally { owner.current = false;if (mounted.current) setBusy(false); }
  }
  async function cameraReady() {
    const expected = key;
    if (!chosen) try { const values = await camera.current?.getAvailablePictureSizesAsync();if (mounted.current && keyRef.current === expected) setChosen(choosePictureSize(values ?? [])); }
    catch { if (mounted.current) setMessage('CAMERA_NO_BOUNDED_SIZE. No photo is admitted.'); }
  }
  function measure(): Promise<{ left: number; top: number; right: number; bottom: number }> {
    return new Promise((resolve, reject) => {
      if (!box.current) { reject(Error('CAMERA_ORIENTATION_PREVIEW'));return; }
      const timeout = setTimeout(() => reject(Error('CAMERA_ORIENTATION_MEASURE_TIMEOUT')), 1000);
      box.current.measureInWindow((x, y, width, height) => { clearTimeout(timeout);const left = PixelRatio.getPixelSizeForLayoutSize(x), top = PixelRatio.getPixelSizeForLayoutSize(y);resolve({ left, top, right: left + PixelRatio.getPixelSizeForLayoutSize(width), bottom: top + PixelRatio.getPixelSizeForLayoutSize(height) }); });
    });
  }
  async function capture() {
    if (owner.current || run.running || capturedCase.current || !status || !orientationCase(status.next) || !status.idle || !status.readinessNonce || !ready || !chosen || !granted || !foreground || !ack || Date.now() - ack > 120_000) return;
    const id = status.next, nonce = status.readinessNonce, expectedKey = key, epoch = generation.current;
    const lifecycle = lifecycleRevision.current;
    const errorRecord = (error: unknown, stage: CaptureError['stage']): CaptureError => ({ code: cameraProofErrorCode(error), stage, caseId: id, jobId: typeof status.nextJobId === 'string' ? status.nextJobId : null, process: typeof status.process === 'string' ? status.process : null, lifecycle, viewGeneration: epoch });
    const currentAttempt = () => mounted.current && lifecycle === lifecycleRevision.current && generation.current === epoch && keyRef.current === expectedKey && AppState.currentState === 'active';
    let stage: CaptureError['stage'] = 'MEASURE';
    setCaptureError(null);setInspectionError(null);
    capturedCase.current = id;setCaptured(id);setPhase('CAPTURING');
    owner.current = true;setBusy(true);setAck(null);
    try {
      const rect = await measure();if (keyRef.current !== expectedKey || generation.current !== epoch) throw Error('CAMERA_ORIENTATION_VIEW_CHANGED');
      stage = 'NATIVE_CAPTURE';
      await run.start(id, { camera: { reportedWidth: chosen.width, reportedHeight: chosen.height, previewWidth: preview.width, previewHeight: preview.height, layout, contentMode: 'FILL' }, previewRectPhysical: rect, viewGeneration: epoch }, nonce, async ticket => {
        const view = camera.current, p = await getCameraPermissionsAsync();
        if (!view || camera.current !== view || !p.granted || !mounted.current || keyRef.current !== expectedKey || generation.current !== epoch || AppState.currentState !== 'active') throw Error('CAMERA_PERMISSION_OR_VIEW_LOST');
        const options = { skipProcessing: true, base64: false, exif: true, cosiGeometryJob: ticket.jobId };
        return () => view.takePictureAsync(options);
      });
      if (mounted.current) setMessage('The native row completed. Geometry and scene still need independent review.');
    } catch (error) { if (currentAttempt()) { setCaptureError(errorRecord(error, stage));setMessage('Capture failed. Keep this attempt; do not retake.'); } }
    finally {
      try { if (currentAttempt()) await update(); }
      catch (error) { if (currentAttempt()) { setPhase('UNKNOWN');setInspectionError(errorRecord(error, 'INSPECT'));setMessage('STOP: native completion is unknown. No further photo.'); } }
      owner.current = false;if (mounted.current) setBusy(false);
    }
  }
  async function openExport(prefix: 0 | 1 | 8) {
    await action(async () => {
      setPreviewEnabled(false);
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      if (camera.current) throw Error('CAMERA_ORIENTATION_VIEW_NOT_CLOSED');
      return cameraOrientationNative.openOrientationExport(prefix);
    });
  }
  const aspect = layout === 'A' ? 2 : 4 / 3, width = Math.min(space.width, space.height * aspect);
  const marker = orientationMarker(status, { phase, caseId: captured, lifecycle, viewGeneration, layout, previewMounted: previewEnabled && granted && foreground && preview.width > 0 && preview.height > 0, busy, captureError, inspectionError, geometryReady: ready });
  return <View style={styles.page}>
    <Text style={styles.title}>Camera geometry verification</Text>
    <Button label="Inspect diagnostic retained metadata (no capture)" disabled={busy || previewEnabled || run.running} onPress={() => void action(captureDiagnosticSnapshot)} />
    <Button label="Open native capture diagnostic" disabled={process.env.EXPO_PUBLIC_RECOGNITION_CAPTURE_DIAGNOSTIC !== '1' || busy || previewEnabled || run.running || !granted || !foreground} onPress={() => void action(openCaptureDiagnostic)} />
    <Text>One controlled repeat; graphics are not fixed. Original attempts and evidence are preserved.</Text>
    <Text testID="orientation-capture-status" numberOfLines={1} accessible accessibilityLabel={marker} accessibilityLiveRegion="polite">{phase}: {captureError?.code ?? inspectionError?.code ?? captured ?? status?.next ?? 'inspect first'}</Text>
    {permissionGranted === null && <Text>Checking camera permission. Preview remains closed.</Text>}
    {permissionGranted === false && <Text>Camera permission is unavailable. Stop and report it; this screen does not change permissions.</Text>}
    <View testID="orientation-space" style={styles.available} onLayout={e => setSpace(e.nativeEvent.layout)}>
      <View testID="orientation-viewport" ref={box} collapsable={false} style={{ width, height: width / aspect }} onLayout={e => {
        const width = PixelRatio.getPixelSizeForLayoutSize(e.nativeEvent.layout.width), height = PixelRatio.getPixelSizeForLayoutSize(e.nativeEvent.layout.height);
        if (width !== preview.width || height !== preview.height) { run.cancel('UNMOUNT');setPreview({ width, height }); }
      }}>
        {previewEnabled && granted && foreground && preview.width > 0 && preview.height > 0 && <GeometryCamera key={mountKey} ref={camera} style={StyleSheet.absoluteFill} facing="back" mode="picture" zoom={0} mirror={false} flash="off" enableTorch={false} pictureSize={chosen?.size} cosiSameFrame cosiPreviewGeneration={viewGeneration} onCameraReady={() => void cameraReady()} onCosiGeometryReady={event => { if (chosen && keyRef.current === key && event?.nativeEvent?.pictureSize === chosen.size && event.nativeEvent.generation === generation.current) setReady(true); }} onMountError={() => { setReady(false);setAck(null);setMessage('CAMERA_MOUNT_FAILED. No retry starts automatically.'); }} />}
        <View pointerEvents="none" accessible={false} style={styles.guide} />
      </View>
    </View>
    <Text>Next: {status?.next ?? 'inspect first'}. Layout {layout}; {chosen?.size ?? 'waiting for size'}.</Text>
    <Button label="Close idle or settled preview" disabled={!canClosePreview} onPress={() => closePreview('Preview closed explicitly. Existing evidence is retained.')} />
    <ScrollView style={styles.controls} contentContainerStyle={styles.gap}>
      <Text>Use the exact chart and pose for this row. Show only the full border, eight markers and black margins, across at least 80% of the guide in both directions. Support the phone and wait for fresh READY.</Text>
      <Button label="Inspect new geometry run" disabled={busy} onPress={() => void action(async () => undefined, true)} />
      <Button label="Open generated metadata export check" disabled={busy} onPress={() => void openExport(0)} />
      <Button label="Inspect generated metadata export receipt" disabled={busy} onPress={() => void action(() => cameraOrientationNative.orientationExportStatus(0))} />
      <Button label="Restore preview without capture" disabled={busy || previewEnabled || !foreground || !granted || !status?.generatedExportVerified || !status.idle || !orientationCase(status.next)} onPress={restorePreview} />
      <Button label={ack ? 'Fresh readiness acknowledged' : 'Acknowledge current chart and supported phone'} disabled={busy || !!captured || !ready || !status?.readinessNonce} onPress={() => setAck(Date.now())} />
      <Button label="Capture this geometry row once" disabled={busy || !!captured || !ready || !ack || !status?.readinessNonce || !status.idle} onPress={() => void capture()} />
      <Button label="Cancel current geometry proof" disabled={!run.running} onPress={() => { void run.cancel('USER'); }} />
      <Button label="Open first-row evidence export" disabled={busy || !status || status.next !== 'COMPLETE'} onPress={() => void openExport(1)} />
      <Button label="Inspect first-row export receipt" disabled={busy} onPress={() => void action(() => cameraOrientationNative.orientationExportStatus(1))} />
      <Button label="Seal completed geometry run" disabled={true} onPress={() => void action(() => cameraOrientationNative.sealOrientationRun(), true)} />
      <Button label="Open final geometry evidence export" disabled={true} onPress={() => void openExport(8)} />
      <Button label="Inspect final geometry export receipt" disabled={busy} onPress={() => void action(() => cameraOrientationNative.orientationExportStatus(8))} />
      <Text accessibilityLiveRegion="polite" selectable>{message}</Text>
      {captureError && <Text selectable>Capture error: {captureError.code} ({captureError.stage}). Keep this attempt; do not retake.</Text>}
      {inspectionError && <Text selectable>Inspection error: {inspectionError.code}. Outcome remains unconfirmed.</Text>}
    </ScrollView>
  </View>;
}
const styles = StyleSheet.create({ page: { flex: 1, padding: 16, paddingTop: 40, gap: 8 }, title: { fontSize: 22, fontWeight: '700' }, available: { flex: 1, minHeight: 60 }, guide: { position: 'absolute', left: '10%', right: '10%', top: '10%', bottom: '10%', borderWidth: StyleSheet.hairlineWidth, borderColor: '#ffcf4a' }, controls: { height: 420 }, gap: { gap: 8, paddingBottom: 16 }, button: { minHeight: 48, padding: 10, backgroundColor: '#153c62', borderRadius: 6 }, buttonText: { color: '#fff' }, disabled: { opacity: 0.45 } });
