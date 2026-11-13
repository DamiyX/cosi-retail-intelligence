import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AppState, Image, Modal, PixelRatio, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CameraView, getCameraPermissionsAsync, useCameraPermissions } from './cameraRuntime';
import { cameraRecoveryNative, cameraMatrixNative, cameraProofNative, exportSavedCameraEvidence, cancelSavedCameraEvidenceExport, inspectStationaryChart, exportStationaryChart, cancelStationaryChartExport } from './nativeAdapter';
import { STATIONARY_TARGET, type stationaryStatus } from './cameraStationary';
import { CameraProofRun, choosePictureSize, cameraProofErrorCode as diagnosticCode } from './cameraProof';
import { recoveryStatus } from './cameraMatrixRecovery';
import { CameraMatrixRun, matrixCase, matrixStatus, MATRIX_FILENAME, type MatrixStatus } from './cameraMatrixProof';
import { CameraOrientationPanel } from './CameraOrientationPanel';

export default function CameraProofPanel() {
  if (process.env.EXPO_PUBLIC_RECOGNITION_ORIENTATION_V2 === '1') return <CameraOrientationPanel />;
  return cameraRecoveryNative ? <CameraRecoveryPanel /> : cameraMatrixNative ? <CameraMatrixPanel /> : <LegacyCameraProofPanel />;
}
/** No CameraView is mounted while launching or inspecting native recovery. */
export function CameraRecoveryPanel() {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('The twelve attempts are finished. Recovery uses the existing sealed evidence; no photo or old export is repeated.');
  const mounted = useRef(true), pending = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function act(fixture: boolean, launch: boolean) {
    if (pending.current) return; pending.current = true; setBusy(true);
    try {
      if (launch) {
        await cameraRecoveryNative.openP203Recovery(fixture);
        if (mounted.current) setMessage('Native screen launch accepted. This is not export verification. Follow its fixed-document instructions; inspect the persisted result after returning.');
      } else {
        const status = recoveryStatus(await cameraRecoveryNative.p203RecoveryStatus(fixture));
        if (mounted.current) setMessage(JSON.stringify(status));
      }
    } catch (error) { if (mounted.current) setMessage(`${diagnosticCode(error)}. No repeated Save, selection or write is authorized by this screen.`); }
    finally { pending.current = false; if (mounted.current) setBusy(false); }
  }
  return <View style={styles.page}>
    <Text style={styles.title}>Saved camera evidence recovery</Text>
    <Text>The original export remains consumed. Use only the separately approved recovery packet. The native Activity survives independently of this chat and JS screen.</Text>
    <ProofButton label="Open generated recovery lifecycle check" disabled={busy} onPress={() => void act(true, true)} />
    <ProofButton label="Inspect generated recovery receipt" disabled={busy} onPress={() => void act(true, false)} />
    <Text>Actual recovery starts only after the generated phone check passes independent review.</Text>
    <ProofButton label="Open fixed saved-evidence recovery" disabled={busy} onPress={() => void act(false, true)} />
    <ProofButton label="Inspect saved-evidence recovery receipt" disabled={busy} onPress={() => void act(false, false)} />
    <Text>No camera, new capture, model run, arbitrary file export or old Export retry. A consumed WRITE is checked read-only after restart.</Text>
    <Text>Four preview markers remain inconclusive; strict scene/framing and original-image geometry acceptance remain open. Export verification cannot change those findings.</Text>
    <ScrollView style={styles.message}><Text accessibilityLiveRegion="polite" selectable>{message}</Text></ScrollView>
  </View>;
}

function LegacyCameraProofPanel() {
  const [permission, requestPermission] = useCameraPermissions();
  const granted = permission?.granted === true;
  const [chosen, setChosen] = useState<ReturnType<typeof choosePictureSize> | null>(null);
  const [layout, setLayout] = useState<'A' | 'B'>('A'), [ready, setReady] = useState(false), [pending, setPending] = useState(false);
  const [space, setSpace] = useState({ width: 0, height: 0 }), [preview, setPreview] = useState({ width: 0, height: 0 });
  const [result, setResult] = useState<Awaited<ReturnType<CameraProofRun['start']>> | null>(null), [message, setMessage] = useState('No camera capture recorded.');
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [exportPending, setExportPending] = useState(false);
  const exporting = useRef(false);
  const [stationary, setStationary] = useState<ReturnType<typeof stationaryStatus> | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [slotPending, setSlotPending] = useState(false);
  const [slotDisplay, setSlotDisplay] = useState({ attempted: false, exportAttempted: false, exporting: false });
  const slotExporting = useRef(false), slotAttempted = useRef(false), slotBusy = useRef(false), slotExportAttempted = useRef(false);
  const camera = useRef<CameraView | null>(null), mounted = useRef(true);
  const [run] = useState(() => new CameraProofRun(cameraProofNative));
  const [lastPermission, setLastPermission] = useState(granted);
  if (lastPermission !== granted) { setLastPermission(granted); setReady(false); setAcknowledged(false); }
  const key = `${layout}:${chosen?.size ?? 'initial'}:${preview.width}x${preview.height}`, currentKey = useRef(key);
  useLayoutEffect(() => { currentKey.current = key; }, [key]);
  useEffect(() => {
    mounted.current = true;
    const sub = AppState.addEventListener('change', state => { setForeground(state === 'active'); if (state !== 'active') { run.cancel('BACKGROUND'); setReady(false); setAcknowledged(false); } });
    return () => { mounted.current = false; sub.remove(); run.cancel('UNMOUNT'); if (exporting.current) void cancelSavedCameraEvidenceExport().catch(() => undefined); if (slotExporting.current) void cancelStationaryChartExport().catch(() => undefined); };
  }, [run]);
  useEffect(() => { if (!granted) run.cancel('PERMISSION_LOSS'); }, [granted, run]);
  async function refuse(code: string, label: string) {
    if (mounted.current) { setReady(false); setMessage(label); }
    try { await cameraProofNative.recordCameraProofRefusal(code); }
    catch { if (mounted.current) setMessage(label + ' Failure persistence refused; inspect retained native evidence.'); }
  }
  async function askPermission() {
    try { const response = await requestPermission(); if (!response.granted) await refuse('CAMERA_PERMISSION_DENIED', 'Camera permission denied. No capture was started.'); }
    catch { await refuse('CAMERA_PERMISSION_ERROR', 'Permission request failed. No capture was started.'); }
  }
  async function onReady() {
    const generation = key;
    if (!chosen) {
      try {
        const sizes = await camera.current?.getAvailablePictureSizesAsync(); if (!mounted.current || generation !== currentKey.current) return;
        setChosen(choosePictureSize(sizes ?? [])); setReady(false);
      } catch { if (mounted.current) await refuse('CAMERA_SIZE_OR_READY_FAILED', 'No reported JPEG size within four megapixels is ready.'); }
    } else if (mounted.current && generation === currentKey.current) setReady(true);
  }
  async function capture(useStationary = false) {
    if (!granted || !ready || !chosen || !foreground || pending || exporting.current || slotExporting.current || run.running) return;
    if (useStationary && (!acknowledged || !stationary?.captureAvailable || slotAttempted.current || layout !== 'A')) return;
    if (useStationary) { slotAttempted.current = true; setSlotDisplay(s => ({ ...s, attempted: true })); setAcknowledged(false); setStationary(null); }
    setPending(true); setResult(null); setMessage('One request is owned until the native/file work drains.');
    try {
      const start = useStationary ? run.startStationary.bind(run) : run.start.bind(run);
      const proof = await start({ reportedWidth: chosen.width, reportedHeight: chosen.height, previewWidth: preview.width, previewHeight: preview.height, layout, contentMode: 'FILL' }, async () => {
        const view = camera.current, generation = key;
        const current = await getCameraPermissionsAsync();
        if (!current.granted || !view || camera.current !== view || currentKey.current !== generation || !mounted.current || AppState.currentState !== 'active') throw Error('CAMERA_PERMISSION_OR_VIEW_LOST');
        return () => view.takePictureAsync({ skipProcessing: true, base64: false, exif: true });
      });
      if (mounted.current) { setResult(proof); setMessage('Receipt committed. Geometry is inconclusive; independent camera proof has not passed.'); }
    } catch (e) { if (mounted.current) setMessage(e instanceof Error ? e.message === 'CAMERA_CANCELLED' ? 'View result withheld after cancellation request. Native completion may already have committed; inspect saved status.' : e.message : 'Camera proof refused; failure evidence retained.'); }
    finally { if (mounted.current) setPending(false); }
  }
  async function exportSaved() {
    if (pending || run.running || exporting.current || slotExporting.current || !foreground) return;
    exporting.current = true; setExportPending(true);
    setMessage('Choose a new ZIP document in local Downloads. This saved-chart export allows one attempt, including cancellation.');
    try { const exported = await exportSavedCameraEvidence(); if (mounted.current) setMessage(JSON.stringify(exported)); }
    catch { if (mounted.current) setMessage('Saved evidence export is unverified or unavailable. A partial selected document may remain; the single attempt cannot be repeated.'); }
    finally { exporting.current = false; if (mounted.current) setExportPending(false); }
  }
  async function inspectSlot() {
    if (slotBusy.current || pending || run.running || exporting.current || slotExporting.current) return;
    slotBusy.current = true; setSlotPending(true);
    try { const s = await inspectStationaryChart(); if (mounted.current) { setStationary(s); setMessage(JSON.stringify(s)); } }
    catch { if (mounted.current) { setStationary(null); setMessage('Stationary slot is unavailable or incomplete; no retry is authorized.'); } }
    finally { slotBusy.current = false; if (mounted.current) setSlotPending(false); }
  }
  async function exportSlot() {
    if (pending || run.running || exporting.current || slotExporting.current || !stationary?.exportEligible || slotExportAttempted.current || !foreground) return;
    slotExportAttempted.current = true; slotExporting.current = true; setSlotDisplay(s => ({ ...s, exportAttempted: true, exporting: true })); setSlotPending(true); setStationary(null);
    setMessage('Choose a NEW local Downloads document for this stationary chart. One export attempt includes cancellation.');
    try { const s = await exportStationaryChart(); if (mounted.current) setMessage(JSON.stringify(s)); }
    catch { if (mounted.current) setMessage('Stationary export unverified; a partial document may remain. Do not repeat or reset the attempt.'); }
    finally { slotExporting.current = false; if (mounted.current) { setSlotPending(false); setSlotDisplay(s => ({ ...s, exporting: false })); } }
  }
  const boundedWidth = Math.min(space.width, space.height * 4 / 3);
  return <View style={styles.page}>
    <Text style={styles.title}>Isolated camera proof</Text>
    <Text>Use approved targets after separate device authorization. SDK cache and total memory have no proven cap.</Text>
    {!granted && <ProofButton label="Request camera permission" onPress={() => void askPermission()} disabled={pending} />}
    <View style={styles.row}><ProofButton label="Layout A" onPress={() => { if (layout !== 'A') { setLayout('A'); setReady(false); setAcknowledged(false); } }} disabled={pending || slotPending || exportPending} /><ProofButton label="Layout B" onPress={() => { if (layout !== 'B') { setLayout('B'); setReady(false); setAcknowledged(false); } }} disabled={pending || slotPending || exportPending} /></View>
    <View style={styles.available} onLayout={e => setSpace(e.nativeEvent.layout)}>
      <View style={layout === 'A' ? styles.available : { width: boundedWidth, height: boundedWidth * 3 / 4 }} onLayout={e => {
        const width = PixelRatio.getPixelSizeForLayoutSize(e.nativeEvent.layout.width), height = PixelRatio.getPixelSizeForLayoutSize(e.nativeEvent.layout.height);
        if (width !== preview.width || height !== preview.height) { if (run.running) run.cancel('UNMOUNT'); setPreview({ width, height }); setReady(false); setAcknowledged(false); }
      }}>
        {granted && foreground && preview.width > 0 && preview.height > 0 && <CameraView key={key} ref={camera} style={StyleSheet.absoluteFill} facing="back" mode="picture" zoom={0} mirror={false} flash="off" enableTorch={false} pictureSize={chosen?.size} onCameraReady={() => void onReady()} onMountError={() => void refuse('CAMERA_MOUNT_FAILED', 'Camera preview failed. No capture is admitted.')} />}
        <View pointerEvents="none" accessible={false} style={styles.guide} />
      </View>
    </View>
    <Text style={styles.sizeLabel}>{chosen ? `Reported size ${chosen.size}. Returned JPEG is validated independently.` : 'Waiting for an explicitly permitted preview and reported sizes.'}</Text>
    <View style={styles.controls}>
      <Text>Stationary target: {STATIONARY_TARGET}. Support the phone and keep the chart fixed. Readiness is your acknowledgement; geometry remains unverified.</Text>
      <View style={styles.row}><ProofButton label="Inspect stationary chart slot" onPress={() => void inspectSlot()} disabled={pending || exportPending || slotPending} /><ProofButton label={acknowledged ? 'Stationary support acknowledged' : 'Acknowledge supported phone and fixed chart'} onPress={() => setAcknowledged(true)} disabled={pending || slotPending || !stationary?.captureAvailable || slotDisplay.attempted} /></View>
      <View style={styles.row}><ProofButton label="Capture stationary chart once" onPress={() => void capture(true)} disabled={pending || exportPending || slotPending || !acknowledged || !stationary?.captureAvailable || slotDisplay.attempted || !ready || !granted || !foreground || layout !== 'A'} /><ProofButton label="Export stationary chart evidence" onPress={() => void exportSlot()} disabled={pending || exportPending || slotPending || !stationary?.exportEligible || slotDisplay.exportAttempted || !foreground} /><ProofButton label="Cancel stationary export" onPress={() => { void cancelStationaryChartExport().catch(() => undefined); }} disabled={!slotPending || !slotDisplay.exporting} /></View>
      <View style={styles.row}><ProofButton label="Export this saved test evidence" onPress={() => void exportSaved()} disabled={pending || exportPending || !foreground} /><ProofButton label="Cancel saved evidence export" onPress={() => { void cancelSavedCameraEvidenceExport().catch(() => undefined); }} disabled={!exportPending} /></View>
      <View style={styles.row}><ProofButton label="Capture one target" onPress={() => void capture()} disabled={pending || !ready || !granted || !foreground} /><ProofButton label="Cancel current proof" onPress={() => { run.cancel('USER'); setMessage('Cancellation requested; this view withholds the result. Native completion may already have claimed publication. Await actual drain.'); }} disabled={!pending} /></View>
      <View style={styles.row}><ProofButton label="Inspect saved camera status" onPress={() => { void cameraProofNative.cameraProofStatus().then(s => { if (mounted.current) setMessage(JSON.stringify(s)); }).catch(e => { if (mounted.current) setMessage(`Saved camera status is unready or corrupt (${diagnosticCode(e)}). No capture resumes.`); }); }} disabled={pending} /><ProofButton label="Classify interrupted camera storage" onPress={() => { void cameraProofNative.recoverCameraProof().then(s => { if (mounted.current) setMessage(JSON.stringify(s)); }).catch(e => { if (mounted.current) setMessage(`Recovery refused: ${diagnosticCode(e)}. An owner may still be draining or storage is corrupt.`); }); }} disabled={pending} /></View>
      <ScrollView style={styles.message}><Text accessibilityLiveRegion="polite">{message}</Text></ScrollView>
    </View>
    {/* Result review overlays the page: changing message/result never resizes a live capture. */}
    <Modal visible={result !== null} onRequestClose={() => setResult(null)} animationType="none">
    {result && <ScrollView contentContainerStyle={styles.review}>
      <ProofButton label="Close candidate review" onPress={() => setResult(null)} />
      <Image accessibilityLabel="Candidate ROI and letterbox from the exact tensor" source={{ uri: result.previewUri }} style={styles.image} />
      <Text>Candidate crop only. Review its orientation and borders; physical preview/JPEG correspondence is unverified.</Text>
      <Text selectable>{result.receiptJson}</Text>
    </ScrollView>}
    </Modal>
  </View>;
}
/** Fixed D059 UI. Legacy fall-through exists only for hosts without the new bridge adapter. */
export function CameraMatrixPanel() {
  const [permission, ask] = useCameraPermissions();
  const [granted, setGranted] = useState(permission?.granted === true), [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [layout, setLayout] = useState<'A' | 'B'>('A'), [space, setSpace] = useState({ width: 0, height: 0 }), [preview, setPreview] = useState({ width: 0, height: 0 });
  const [chosen, setChosen] = useState<ReturnType<typeof choosePictureSize> | null>(null), [ready, setReady] = useState(false), [viewMounted, setViewMounted] = useState(true);
  const [status, setStatus] = useState<MatrixStatus | null>(null), [executing, setExecuting] = useState(false), [exportingDisplay, setExportingDisplay] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState('Prepare the approved finite batch before any photo. No capture starts automatically.');
  const [ackAt, setAckAt] = useState<number | null>(null);
  const camera = useRef<CameraView | null>(null), box = useRef<View | null>(null), mounted = useRef(true), ownedUi = useRef(false), exportingMatrix = useRef(false);
  const [run] = useState(() => new CameraMatrixRun(cameraMatrixNative, cameraProofNative));
  const key = `${layout}:${chosen?.size ?? 'initial'}:${preview.width}x${preview.height}:${viewMounted}`;
  const keyRef = useRef(key), generation = useRef(1);
  const [lastKey, setLastKey] = useState(key), [lastHookGrant, setLastHookGrant] = useState(permission?.granted === true), [lastGranted, setLastGranted] = useState(granted);
  if (lastKey !== key) { setLastKey(key); setReady(false); setAckAt(null); }
  if (lastHookGrant !== (permission?.granted === true)) { setLastHookGrant(permission?.granted === true); setGranted(permission?.granted === true); }
  if (lastGranted !== granted) { setLastGranted(granted); setReady(false); setAckAt(null); }
  useLayoutEffect(() => { keyRef.current = key; generation.current++; if (!viewMounted) run.boundary('UNMOUNT'); }, [key, run, viewMounted]);
  useEffect(() => {
    mounted.current = true;
    const sub = AppState.addEventListener('change', state => {
      const active = state === 'active'; setForeground(active); setReady(false); setAckAt(null);
      if (!active) run.boundary('BACKGROUND');
      else void getCameraPermissionsAsync().then(p => { if (mounted.current) { setGranted(p.granted); if (!p.granted) run.boundary('PERMISSION_LOSS'); } }).catch(() => { if (mounted.current) setGranted(false); });
    });
    return () => { mounted.current = false; sub.remove(); run.boundary('UNMOUNT'); if (exportingMatrix.current) void cameraMatrixNative.cancelMatrixEvidenceExport().catch(() => undefined); };
  }, [run]);
  useEffect(() => { if (!granted) run.boundary('PERMISSION_LOSS'); }, [granted, run]);
  async function update(value: unknown) {
    const observed = matrixStatus(value); if (mounted.current) { setStatus(observed); setAckAt(null); setMessage(JSON.stringify(observed)); if (matrixCase(observed.next)) setLayout(/^M\d\d-B/.test(observed.next) ? 'B' : 'A'); } return observed;
  }
  async function action(work: () => Promise<unknown>, exporting = false) {
    if (ownedUi.current || run.running) return;
    ownedUi.current = true; exportingMatrix.current = exporting; setExportingDisplay(exporting); setBusy(true); setAckAt(null); if (exporting) setStatus(s => s ? { ...s, exportConsumed: true } : s);
    try { const value = await work(); if (exporting) { if (mounted.current) setMessage(JSON.stringify(value)); } else await update(value); }
    catch (error) { if (mounted.current) setMessage(`${diagnosticCode(error)}. Inspect the existing record; do not repeat a consumed action.`); }
    finally { ownedUi.current = false; exportingMatrix.current = false; if (mounted.current) { setBusy(false); setExportingDisplay(false); } }
  }
  async function onReady() {
    const currentKey = key;
    if (!chosen) {
      try { const sizes = await camera.current?.getAvailablePictureSizesAsync(); if (mounted.current && currentKey === keyRef.current) setChosen(choosePictureSize(sizes ?? [])); }
      catch { if (mounted.current) setMessage('CAMERA_NO_BOUNDED_SIZE. No capture was admitted.'); }
    } else if (mounted.current && currentKey === keyRef.current) setReady(true);
  }
  function rect(): Promise<{ left: number; top: number; right: number; bottom: number }> {
    return new Promise((resolve, reject) => {
      if (!box.current) { reject(Error('CAMERA_MATRIX_PREVIEW')); return; }
      const timeout = setTimeout(() => reject(Error('CAMERA_MATRIX_MEASURE_TIMEOUT')), 1000);
      box.current.measureInWindow((x, y, width, height) => {
        clearTimeout(timeout); const left = PixelRatio.getPixelSizeForLayoutSize(x), top = PixelRatio.getPixelSizeForLayoutSize(y);
        resolve({ left, top, right: left + PixelRatio.getPixelSizeForLayoutSize(width), bottom: top + PixelRatio.getPixelSizeForLayoutSize(height) });
      });
    });
  }
  async function captureMatrix() {
    if (!status || !matrixCase(status.next) || !status.readinessNonce || !status.idle || !ready || !chosen || !granted || !foreground || !ackAt || Date.now() - ackAt > 120_000 || ownedUi.current || run.running) return;
    const id = status.next, nonce = status.readinessNonce, expectedKey = key, gen = generation.current;
    ownedUi.current = true; setBusy(true); setAckAt(null); setMessage(`${id}: pending. Keep the chart displayed until terminal status; controls use the specified interruption.`);
    try {
      const measured = await rect();
      if (keyRef.current !== expectedKey || generation.current !== gen) throw Error('CAMERA_MATRIX_VIEW_CHANGED');
      await run.start(id, { camera: { reportedWidth: chosen.width, reportedHeight: chosen.height, previewWidth: preview.width, previewHeight: preview.height, layout, contentMode: 'FILL' }, previewRectPhysical: measured, viewGeneration: gen }, nonce, async () => {
        setExecuting(true);
        const view = camera.current, p = await getCameraPermissionsAsync();
        if (!view || camera.current !== view || !p.granted || !mounted.current || keyRef.current !== expectedKey || generation.current !== gen || AppState.currentState !== 'active') throw Error('CAMERA_PERMISSION_OR_VIEW_LOST');
        return () => view.takePictureAsync({ skipProcessing: true, base64: false, exif: true });
      });
    } catch (error) { if (mounted.current) setMessage(`${diagnosticCode(error)}. Await native terminal inspection, never retake.`); }
    finally {
      // This CAMERA-only artifact reports completion on screen; it has no VIBRATE permission.
      try { await update(await cameraMatrixNative.inspectMatrixProof()); }
      catch { if (mounted.current) setMessage('STOP: native completion is unknown. Keep the existing attempt; no new photo.'); }
      ownedUi.current = false; if (mounted.current) { setBusy(false); setExecuting(false); }
    }
  }
  const aspect = layout === 'A' ? 2 : 4 / 3, width = Math.min(space.width, space.height * aspect);
  return <View style={styles.page}>
    <Text style={styles.title}>Isolated camera proof</Text>
    <Text>Approved matrix: 12 one-use attempts. Only generated charts. SDK cache and memory peaks remain unproven.</Text>
    {!granted && <ProofButton label="Request camera permission" onPress={() => { void ask().then(p => setGranted(p.granted)); }} disabled={busy} />}
    <View style={styles.row}><ProofButton label="Layout A" disabled={busy} onPress={() => setLayout('A')} /><ProofButton label="Layout B" disabled={busy} onPress={() => setLayout('B')} /></View>
    <View style={styles.available} onLayout={e => setSpace(e.nativeEvent.layout)}>
      <View ref={box} collapsable={false} style={{ width, height: width / aspect }} onLayout={e => {
        const w = PixelRatio.getPixelSizeForLayoutSize(e.nativeEvent.layout.width), h = PixelRatio.getPixelSizeForLayoutSize(e.nativeEvent.layout.height);
        if (w !== preview.width || h !== preview.height) { run.boundary('UNMOUNT'); setPreview({ width: w, height: h }); }
      }}>
        {granted && foreground && viewMounted && preview.width > 0 && preview.height > 0 && <CameraView key={key} ref={camera} style={StyleSheet.absoluteFill} facing="back" mode="picture" zoom={0} mirror={false} flash="off" enableTorch={false} pictureSize={chosen?.size} onCameraReady={() => void onReady()} onMountError={() => { setReady(false); setMessage('CAMERA_MOUNT_FAILED. No retry is automatic.'); }} />}
        <View pointerEvents="none" accessible={false} style={styles.guide} />
      </View>
    </View>
    <Text style={styles.sizeLabel}>Next: {status?.next ?? 'inspect first'}. {chosen?.size ?? 'No size ready'}. Layout {layout}.</Text>
    <ScrollView style={styles.controls} contentContainerStyle={{ gap: 8, paddingBottom: 16 }}>
      <Text>Match the exact case chart and phone pose. Frame all eight markers and border with black margins only, across at least 80% of the guide.</Text>
      <View style={styles.row}><ProofButton label="Inspect approved matrix" disabled={busy} onPress={() => void action(() => cameraMatrixNative.inspectMatrixProof())} /><ProofButton label="Observe current permission checkpoint" disabled={busy || !status?.next.startsWith('D')} onPress={() => void action(() => cameraMatrixNative.observeMatrixPermission(status!.next, ready && granted))} /></View>
      <View style={styles.row}><ProofButton label={ackAt ? 'Fresh chart readiness acknowledged' : 'Acknowledge current chart and stable phone'} disabled={busy || !ready || !status || !matrixCase(status.next)} onPress={() => setAckAt(Date.now())} /><ProofButton label="Run this matrix case once" disabled={busy || !ready || !granted || !foreground || !status?.idle || !status.readinessNonce || !ackAt || !matrixCase(status.next)} onPress={() => void captureMatrix()} /></View>
      <View style={styles.row}><ProofButton label="Cancel current proof" disabled={!executing} onPress={() => run.boundary('USER')} /><ProofButton label="Unmount view for L03" disabled={!executing || status?.next !== 'L03-VIEW-UNMOUNT'} onPress={() => setViewMounted(false)} /><ProofButton label="Restore view without capture" disabled={busy || viewMounted} onPress={() => setViewMounted(true)} /></View>
      <View style={styles.row}><ProofButton label="Classify old matrix process" disabled={busy || status?.next !== 'UNRESOLVED'} onPress={() => void action(() => cameraMatrixNative.recoverMatrixProof())} /><ProofButton label="Seal matrix and close unused cases" disabled={busy || !status || status.next === 'UNRESOLVED' || status.next === 'SEALED'} onPress={() => void action(() => cameraMatrixNative.sealMatrixRun())} /></View>
      <Text>Export once to local Downloads as {MATRIX_FILENAME}. Press Save once. If already saved, inspect the receipt; do not export again.</Text>
      <View style={styles.row}><ProofButton label="Export sealed matrix once" disabled={busy || status?.next !== 'SEALED' || status.exportConsumed} onPress={() => void action(() => cameraMatrixNative.exportMatrixEvidence(), true)} /><ProofButton label="Cancel matrix export" disabled={!exportingDisplay} onPress={() => { void cameraMatrixNative.cancelMatrixEvidenceExport().catch(() => undefined); }} /></View>
      <Text accessibilityLiveRegion="polite" selectable>{message}</Text>
    </ScrollView>
  </View>;
}

function ProofButton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} accessibilityState={{ disabled }} onPress={onPress} style={[styles.button, disabled && styles.disabled]}><Text style={styles.buttonText}>{label}</Text></Pressable>;
}
const styles = StyleSheet.create({ page: { flex: 1, padding: 16, paddingTop: 40, gap: 8, backgroundColor: '#f8fafc' }, title: { fontSize: 24, fontWeight: '700' }, row: { flexDirection: 'row', gap: 8 }, available: { flex: 1, minHeight: 60 }, guide: { position: 'absolute', left: '10%', top: '10%', right: '10%', bottom: '10%', borderWidth: StyleSheet.hairlineWidth, borderColor: '#ffcf4a' }, button: { flex: 1, padding: 8, minHeight: 44, backgroundColor: '#153c62', borderRadius: 6 }, buttonText: { color: '#fff' }, disabled: { opacity: 0.45 }, sizeLabel: { height: 36 }, controls: { height: 410, gap: 8 }, message: { flex: 1 }, review: { padding: 24, paddingTop: 48, gap: 16 }, image: { width: 224, height: 224 } });
