import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { fixtureIds, type FixtureId, type ProbeResult } from './generatedProbe';
import { runGeneratedProbe, runGeneratedImageProbes, exportGeneratedImageEvidence, recoverGeneratedImageEvidence } from './nativeAdapter';
import type { ImageProbeResult } from './imageProbes';
import { PhonePortabilityPanel } from './PhonePortabilityPanel';

export default function ExperimentRoot() {
  if (process.env.EXPO_PUBLIC_RECOGNITION_CAMERA_PROOF === '1') {
    // The zero-camera route must not evaluate expo-camera or mount legacy recovery in camera mode.
    // Metro's synchronous conditional require keeps expo-camera unevaluated in the default route.
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Required isolated synchronous entry boundary.
    const CameraProofPanel = require('./CameraProofPanel').default;
    return <CameraProofPanel />;
  }
  return <LegacyExperimentRoot />;
}
function LegacyExperimentRoot() {
  const [pending, setPending] = useState<FixtureId | null>(null);
  const [result, setResult] = useState<ProbeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imagePending, setImagePending] = useState<'processing' | 'exporting' | null>(null);
  const [completed, setCompleted] = useState(0);
  const [images, setImages] = useState<ImageProbeResult | null>(null);
  const [exported, setExported] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [recovering, setRecovering] = useState(true);
  const [recovered, setRecovered] = useState(false);
  const [interruptedExport, setInterruptedExport] = useState(false);
  const [privatePending, setPrivatePending] = useState(false);
  const generatedPending = pending !== null || imagePending !== null || recovering;
  const anyPending = generatedPending || privatePending;
  useEffect(() => {
    let active = true;
    void recoverGeneratedImageEvidence().then(r => {
      if (!active) return;
      setInterruptedExport(r.interruptedExport);
      if (r.status === 'RECOVERED') { setImages(r.result); setRecovered(true); }
    }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Saved generated evidence recovery failed.'); })
      .finally(() => { if (active) setRecovering(false); });
    return () => { active = false; };
  }, []);
  async function recoverImages() {
    setRecovering(true); setError(null); setExported(false);
    try {
      const r = await recoverGeneratedImageEvidence();
      setInterruptedExport(r.interruptedExport); setImages(r.status === 'RECOVERED' ? r.result : null);
      setRecovered(r.status === 'RECOVERED');
    } catch (e) { setImages(null); setError(e instanceof Error ? e.message : 'Saved generated evidence recovery failed.'); }
    finally { setRecovering(false); }
  }
  async function runImages() {
    setImagePending('processing'); setCompleted(0); setImages(null); setError(null); setExported(false); setImageFailed(false);
    setRecovered(false); setInterruptedExport(false);
    try { setImages(await runGeneratedImageProbes(setCompleted)); }
    catch (e) { setImageFailed(true); setError(e instanceof Error ? e.message : 'Generated image processing failed.'); }
    finally { setImagePending(null); }
  }
  async function exportImages() {
    if (!images) return;
    setImagePending('exporting'); setError(null); setExported(false);
    try { await exportGeneratedImageEvidence(images); setExported(true); }
    catch (e) { setError(e instanceof Error ? e.message : 'Generated export failed.'); }
    finally { setImagePending(null); }
  }
  async function run(id: FixtureId) {
    setPending(id); setError(null); setResult(null);
    try { setResult(await runGeneratedProbe(id)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Generated probe failed.'); }
    finally { setPending(null); }
  }
  return <ScrollView contentContainerStyle={styles.page}>
    <Text style={styles.title}>Generated runtime probes</Text>
    <Text>Internal recognition harness · arm64 CPU · one worker</Text>
    <Text style={styles.notice}>Device execution requires the separately approved phone packet. No probe runs automatically.</Text>
    <Text>Accepted runtime tensors: 1 × 224 × 224 × 3. Expected output: 1 × 1024. Camera and product scanning are unavailable.</Text>
    <View style={styles.buttons}>{fixtureIds.map(id => <Pressable key={id}
      accessibilityRole="button" accessibilityLabel={`Run generated ${id} probe`}
      accessibilityState={{ disabled: anyPending }} disabled={anyPending}
      onPress={() => void run(id)} style={[styles.button, anyPending && styles.disabled]}>
      <Text style={styles.buttonText}>Run {id}</Text>
    </Pressable>)}</View>
    <Text accessibilityLiveRegion="polite">{pending ? `Running ${pending}…` : result ? 'Probe completed; parity remains unverified.' : 'No device inference recorded.'}</Text>
    {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {result && <View style={styles.results}>
      <Text>{result.fixtureId} · {result.vector.length} finite output components</Text>
      <Text>Inference {result.inferenceMs.toFixed(2)} ms · total {result.totalMs.toFixed(2)} ms</Text>
      <Text>Norm squared: {result.normSquared.toPrecision(7)}</Text>
      <Text selectable>Model SHA256: {result.modelSha256}</Text>
      <Text selectable>Tensor SHA256: {result.fixtureSha256}</Text>
      <Text selectable>Raw vector: {JSON.stringify(result.vector)}</Text>
    </View>}
    <Text style={styles.title}>Generated image verification</Text>
    <Text accessibilityLiveRegion="polite">{recovering ? 'Verifying saved generated evidence…' : recovered ? 'Recovered verified completed evidence. No image batch or model was rerun.' : 'Generated evidence will be saved privately before export is enabled.'}</Text>
    {interruptedExport && <Text accessibilityRole="alert">Previous export session was interrupted. Its picker request will not resume. Use a new deliberate export and a new destination.</Text>}
    <Pressable accessibilityRole="button" accessibilityLabel="Recover saved generated evidence"
      accessibilityState={{ disabled: anyPending }} disabled={anyPending} onPress={() => void recoverImages()}
      style={[styles.button, anyPending && styles.disabled]}><Text style={styles.buttonText}>Verify and recover saved evidence</Text></Pressable>
    <Text>42 frozen generated cases. Decode, EXIF, crop, bilinear letterbox and float32 stages only; this action performs no model inference. Pillow LANCZOS differences are measured, not assumed equivalent.</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Run generated image batch"
      accessibilityState={{ disabled: anyPending }} disabled={anyPending} onPress={() => void runImages()}
      style={[styles.button, anyPending && styles.disabled]}><Text style={styles.buttonText}>Run 42 generated image cases</Text></Pressable>
    <Text accessibilityLiveRegion="polite">{imagePending === 'processing' ? `Processing generated images ${completed}/42…` :
      imagePending === 'exporting' ? 'Choose local Downloads to save generated evidence…' : images ? 'Generated image batch completed; device acceptance requires independent comparison.' : imageFailed ? `Generated batch stopped after ${completed}/42 cases; no complete evidence bundle.` : 'No generated image processing recorded.'}</Text>
    {images && <View style={styles.results}>
      <Text selectable>{images.recipe}</Text>
      <Text>{images.caseCount} cases · {images.outputEntries} output files · ZIP {images.bundleBytes} bytes · batch {images.totalMs.toFixed(2)} ms</Text>
      <Text selectable>Generated ZIP SHA256: {images.bundleSha256}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Export generated image evidence"
        accessibilityState={{ disabled: anyPending }} disabled={anyPending} onPress={() => void exportImages()}
        style={[styles.button, anyPending && styles.disabled]}><Text style={styles.buttonText}>Save complete generated evidence</Text></Pressable>
      <Text>Save once to local Downloads. No image import or gallery access. Cancellation or activity destruction may leave a partial selected document; no success is claimed for it.</Text>
      {exported && <Text accessibilityLiveRegion="polite">Complete generated bundle written; compare its hash and all output stages.</Text>}
      {images.cases.map(c => <View key={c.id} style={styles.results}>
        <Text>{c.id} · EXIF {c.orientation} · {c.rawWidth}×{c.rawHeight} → {c.uprightWidth}×{c.uprightHeight}</Text>
        <Text>Box [{c.effectiveBox.join(', ')}] · resize/padding [{c.letterbox.join(', ')}]</Text>
        <Text>Upright RGB mismatches {c.decodedUprightVsPillowRgb.mismatchCount}; resize {c.resizeVsFrozenBilinearRgb.mismatchCount}; Pillow tensor {c.tensorVsFrozenPillowLanczos.mismatchCount}, max {c.tensorVsFrozenPillowLanczos.maxAbsoluteError.toPrecision(4)}, mean {c.tensorVsFrozenPillowLanczos.meanAbsoluteError.toPrecision(4)}</Text>
      </View>)}
    </View>}
    <PhonePortabilityPanel blocked={generatedPending} onPending={setPrivatePending} />
  </ScrollView>;
}
const styles = StyleSheet.create({
  page: { padding: 24, paddingTop: 64, gap: 16, backgroundColor: '#f8fafc', flexGrow: 1 },
  title: { fontSize: 28, fontWeight: '700', color: '#102030' },
  notice: { padding: 16, backgroundColor: '#fff1c2', color: '#493900' },
  buttons: { gap: 12 }, button: { minHeight: 48, padding: 14, backgroundColor: '#153c62', borderRadius: 8 },
  buttonText: { color: '#ffffff', fontSize: 18 }, disabled: { opacity: 0.5 },
  error: { color: '#9f1239' }, results: { gap: 12 },
});
