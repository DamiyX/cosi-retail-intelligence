import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { type EnrollmentBridge, type EnrollmentSnapshot, parseEnrollmentSnapshot, views } from './protocol';

function EnrollmentButton({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={{ minHeight: 48, padding: 16, opacity: disabled ? 0.5 : 1 }}><Text>{label}</Text></Pressable>;
}

/** Injected guarded native bridge; not installed into the app entry until its native storage gate passes. */
export default function EnrollmentPanel({ bridge, expectedSource }: { bridge: EnrollmentBridge; expectedSource: string }) {
  const [loaded, setLoaded] = useState<{ snapshot: EnrollmentSnapshot; bridge: EnrollmentBridge; source: string } | null>(null);
  const [pending, setPending] = useState(true);
  const [message, setMessage] = useState('Reading saved enrollment progress.');
  const generation = useRef(0); const inFlight = useRef(false);
  const snapshot = loaded?.bridge === bridge && loaded.source === expectedSource ? loaded.snapshot : null;
  const act = useCallback(async (operation: () => Promise<unknown>) => {
    if (inFlight.current) return; inFlight.current = true; setPending(true);
    const request = generation.current;
    try { const value = parseEnrollmentSnapshot(await operation(), expectedSource); if (request === generation.current) { setLoaded({ snapshot: value, bridge, source: expectedSource }); setMessage('Saved enrollment progress verified.'); } }
    catch { if (request === generation.current) { setLoaded(null); setMessage('Enrollment could not be verified. Preserve the current attempt; no photo was automatically retried.'); } }
    finally { if (request === generation.current) { inFlight.current = false; setPending(false); } }
  }, [bridge, expectedSource]);
  useEffect(() => {
    const request = ++generation.current; inFlight.current = true;
    void bridge.snapshot().then(value => {
      const parsed = parseEnrollmentSnapshot(value, expectedSource);
      if (request === generation.current) { setLoaded({ snapshot: parsed, bridge, source: expectedSource }); setMessage('Saved enrollment progress verified.'); }
    }).catch(() => {
      if (request === generation.current) { setLoaded(null); setMessage('Enrollment could not be verified. Preserve the current attempt; no photo was automatically retried.'); }
    }).finally(() => { if (request === generation.current) { inFlight.current = false; setPending(false); } });
    return () => { generation.current = request + 1; };
  }, [bridge, expectedSource]);
  const disabled = pending || snapshot === null || snapshot.busy;
  const barcodePending = snapshot?.products.some(product => product.barcode === 'PENDING') ?? false;
  return <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
    <Text accessibilityRole="header">Guided product enrollment</Text>
    <Text>Save and review four views of each agreed product.</Text>
    <Text accessibilityLiveRegion="polite">{message}</Text>
    {snapshot && <>
      {!snapshot.barcodeAvailable && <><Text>This saved gallery has barcode scanning disabled. Its saved views will be preserved if you enable it.</Text><EnrollmentButton label="Enable barcode scanning for this gallery" onPress={() => void act(() => bridge.enableBarcodes(snapshot.sequence))} disabled={disabled || snapshot.frozen !== '' || snapshot.candidate !== null} /></>}
      {snapshot.interrupted !== '' && <Text>Previous work was interrupted or declined. Saved views remain available. Resume only when instructed.</Text>}
      {snapshot.products.map((product, index) => <View key={product.label}>
        <EnrollmentButton label={`${index === snapshot.selectedProduct ? 'Selected: ' : 'Select: '}${product.label}`} onPress={() => void act(() => bridge.select(snapshot.sequence, index))} disabled={disabled || barcodePending || snapshot.candidate !== null || snapshot.frozen !== ''} />
        <Text>Barcode: {product.barcode === 'CONFIRMED' ? 'Barcode acquired' : product.barcode.toLowerCase().replaceAll('_', ' ')}</Text>
        {product.barcodeValue !== '' && <Text>Read code: {product.barcodeValue}. Verify the product and package size yourself.</Text>}
        {snapshot.barcodeAvailable && index === snapshot.selectedProduct && snapshot.candidate === null && snapshot.frozen === '' && (product.barcode === 'PENDING' ? <>
          <EnrollmentButton label="Confirm this code for the selected product" disabled={disabled} onPress={() => void act(() => bridge.confirmBarcode(snapshot.sequence, index, product.barcodeEpoch, true))} />
          <EnrollmentButton label="Decline this code" disabled={disabled} onPress={() => void act(() => bridge.confirmBarcode(snapshot.sequence, index, product.barcodeEpoch, false))} />
        </> : <EnrollmentButton label="Scan barcode / explicitly rearm" disabled={disabled} onPress={() => void act(() => bridge.openBarcode(snapshot.sequence, index, 0, product.views[0]?.receipt ?? ''))} />)}
        {product.views.map((view, slot) => <Text key={slot}>{views[slot]}: {view ? 'Saved' : 'Missing'}</Text>)}
      </View>)}
      {snapshot.frozen !== '' ? <>
        <Text>Gallery revision {snapshot.revision} frozen. Earlier evidence is preserved.</Text>
        <EnrollmentButton label="Start a new gallery revision" onPress={() => void act(() => bridge.newRevision(snapshot.sequence))} disabled={disabled} />
      </> : snapshot.candidate ? <>
        <Text>New view saved. Review it before keeping it.</Text>
        <EnrollmentButton label="Review saved view" onPress={() => void act(() => bridge.reviewCandidate(snapshot.sequence, snapshot.candidate!.job))} disabled={disabled} />
        <EnrollmentButton label="Keep saved view" onPress={() => void act(() => bridge.keep(snapshot.sequence, snapshot.candidate!.job, snapshot.candidate!.epoch))} disabled={disabled} />
        <EnrollmentButton label="Decline saved view" onPress={() => void act(() => bridge.decline(snapshot.sequence, snapshot.candidate!.job, snapshot.candidate!.epoch))} disabled={disabled} />
      </> : <>
        {snapshot.products[snapshot.selectedProduct].views.map((view, slot, current) => <EnrollmentButton key={slot} label={view ? `Replace ${views[slot]}` : `Open ${views[slot]} camera`} onPress={() => void act(() => bridge.openCapture(snapshot.sequence, snapshot.selectedProduct, slot, view?.receipt ?? ''))} disabled={disabled || barcodePending || (!view && current.slice(0, slot).some(previous => previous === null))} />)}
        <EnrollmentButton label="Freeze reviewed gallery" onPress={() => void act(() => bridge.freeze(snapshot.sequence))} disabled={disabled || snapshot.products.some(p => p.views.some(v => v === null) || p.barcode === 'PENDING' || p.barcode === 'CONFLICT')} />
      </>}
    </>}
    {snapshot && bridge.recover && <EnrollmentButton label="Explicitly recover interrupted work" onPress={() => void act(() => bridge.recover!(snapshot.sequence))} disabled={disabled} />}
    <EnrollmentButton label="Read saved progress" onPress={() => void act(() => bridge.snapshot())} disabled={pending} />
  </ScrollView>;
}
