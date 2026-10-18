import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AppState, Image, Modal, PixelRatio, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CameraView, getCameraPermissionsAsync, useCameraPermissions } from './cameraRuntime';
import { cameraProofNative } from './nativeAdapter';
import { CameraProofRun, choosePictureSize } from './cameraProof';

export default function CameraProofPanel() {
  const [permission, requestPermission] = useCameraPermissions();
  const granted = permission?.granted === true;
  const [chosen, setChosen] = useState<ReturnType<typeof choosePictureSize> | null>(null);
  const [layout, setLayout] = useState<'A' | 'B'>('A'), [ready, setReady] = useState(false), [pending, setPending] = useState(false);
  const [space, setSpace] = useState({ width: 0, height: 0 }), [preview, setPreview] = useState({ width: 0, height: 0 });
  const [result, setResult] = useState<Awaited<ReturnType<CameraProofRun['start']>> | null>(null), [message, setMessage] = useState('No camera capture recorded.');
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const camera = useRef<CameraView | null>(null), mounted = useRef(true);
  const [run] = useState(() => new CameraProofRun(cameraProofNative));
  const [lastPermission, setLastPermission] = useState(granted);
  if (lastPermission !== granted) { setLastPermission(granted); setReady(false); }
  const key = `${layout}:${chosen?.size ?? 'initial'}:${preview.width}x${preview.height}`, currentKey = useRef(key);
  useLayoutEffect(() => { currentKey.current = key; }, [key]);
  useEffect(() => {
    mounted.current = true;
    const sub = AppState.addEventListener('change', state => { setForeground(state === 'active'); if (state !== 'active') { run.cancel('BACKGROUND'); setReady(false); } });
    return () => { mounted.current = false; sub.remove(); run.cancel('UNMOUNT'); };
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
  async function capture() {
    if (!granted || !ready || !chosen || !foreground || pending || run.running) return;
    setPending(true); setResult(null); setMessage('One request is owned until the native/file work drains.');
    try {
      const proof = await run.start({ reportedWidth: chosen.width, reportedHeight: chosen.height, previewWidth: preview.width, previewHeight: preview.height, layout, contentMode: 'FILL' }, async () => {
        const view = camera.current, generation = key;
        const current = await getCameraPermissionsAsync();
        if (!current.granted || !view || camera.current !== view || currentKey.current !== generation || !mounted.current || AppState.currentState !== 'active') throw Error('CAMERA_PERMISSION_OR_VIEW_LOST');
        return () => view.takePictureAsync({ skipProcessing: true, base64: false, exif: true });
      });
      if (mounted.current) { setResult(proof); setMessage('Receipt committed. Geometry is inconclusive; independent camera proof has not passed.'); }
    } catch (e) { if (mounted.current) setMessage(e instanceof Error ? e.message === 'CAMERA_CANCELLED' ? 'View result withheld after cancellation request. Native completion may already have committed; inspect saved status.' : e.message : 'Camera proof refused; failure evidence retained.'); }
    finally { if (mounted.current) setPending(false); }
  }
  const boundedWidth = Math.min(space.width, space.height * 4 / 3);
  return <View style={styles.page}>
    <Text style={styles.title}>Isolated camera proof</Text>
    <Text>Use approved targets after separate device authorization. SDK cache and total memory have no proven cap.</Text>
    {!granted && <ProofButton label="Request camera permission" onPress={() => void askPermission()} disabled={pending} />}
    <View style={styles.row}><ProofButton label="Layout A" onPress={() => { if (layout !== 'A') { setLayout('A'); setReady(false); } }} disabled={pending} /><ProofButton label="Layout B" onPress={() => { if (layout !== 'B') { setLayout('B'); setReady(false); } }} disabled={pending} /></View>
    <View style={styles.available} onLayout={e => setSpace(e.nativeEvent.layout)}>
      <View style={layout === 'A' ? styles.available : { width: boundedWidth, height: boundedWidth * 3 / 4 }} onLayout={e => {
        const width = PixelRatio.getPixelSizeForLayoutSize(e.nativeEvent.layout.width), height = PixelRatio.getPixelSizeForLayoutSize(e.nativeEvent.layout.height);
        if (width !== preview.width || height !== preview.height) { if (run.running) run.cancel('UNMOUNT'); setPreview({ width, height }); setReady(false); }
      }}>
        {granted && foreground && preview.width > 0 && preview.height > 0 && <CameraView key={key} ref={camera} style={StyleSheet.absoluteFill} facing="back" mode="picture" zoom={0} mirror={false} flash="off" enableTorch={false} pictureSize={chosen?.size} onCameraReady={() => void onReady()} onMountError={() => void refuse('CAMERA_MOUNT_FAILED', 'Camera preview failed. No capture is admitted.')} />}
        <View pointerEvents="none" accessible={false} style={styles.guide} />
      </View>
    </View>
    <Text style={styles.sizeLabel}>{chosen ? `Reported size ${chosen.size}. Returned JPEG is validated independently.` : 'Waiting for an explicitly permitted preview and reported sizes.'}</Text>
    <View style={styles.controls}>
      <View style={styles.row}><ProofButton label="Capture one target" onPress={() => void capture()} disabled={pending || !ready || !granted || !foreground} /><ProofButton label="Cancel current proof" onPress={() => { run.cancel('USER'); setMessage('Cancellation requested; this view withholds the result. Native completion may already have claimed publication. Await actual drain.'); }} disabled={!pending} /></View>
      <View style={styles.row}><ProofButton label="Inspect saved camera status" onPress={() => { void cameraProofNative.cameraProofStatus().then(s => { if (mounted.current) setMessage(JSON.stringify(s)); }).catch(() => { if (mounted.current) setMessage('Saved camera status is unready or corrupt. No capture resumes.'); }); }} disabled={pending} /><ProofButton label="Classify interrupted camera storage" onPress={() => { void cameraProofNative.recoverCameraProof().then(s => { if (mounted.current) setMessage(JSON.stringify(s)); }).catch(() => { if (mounted.current) setMessage('Recovery refused: an owner may still be draining or storage is corrupt.'); }); }} disabled={pending} /></View>
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
function ProofButton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} accessibilityState={{ disabled }} onPress={onPress} style={[styles.button, disabled && styles.disabled]}><Text style={styles.buttonText}>{label}</Text></Pressable>;
}
const styles = StyleSheet.create({ page: { flex: 1, padding: 16, paddingTop: 40, gap: 8, backgroundColor: '#f8fafc' }, title: { fontSize: 24, fontWeight: '700' }, row: { flexDirection: 'row', gap: 8 }, available: { flex: 1, minHeight: 60 }, guide: { position: 'absolute', left: '10%', top: '10%', right: '10%', bottom: '10%', borderWidth: StyleSheet.hairlineWidth, borderColor: '#ffcf4a' }, button: { flex: 1, padding: 8, minHeight: 44, backgroundColor: '#153c62', borderRadius: 6 }, buttonText: { color: '#fff' }, disabled: { opacity: 0.45 }, sizeLabel: { height: 36 }, controls: { height: 180, gap: 8 }, message: { flex: 1 }, review: { padding: 24, paddingTop: 48, gap: 16 }, image: { width: 224, height: 224 } });
