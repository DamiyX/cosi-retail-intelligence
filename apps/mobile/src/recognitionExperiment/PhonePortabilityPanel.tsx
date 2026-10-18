import { useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { importPrivatePortability, recoverPrivatePortability, runPrivatePortability, exportPrivatePortability, cancelPrivatePortability, checkPrivateOfflineGate } from './nativeAdapter';
import { privateOfflineGateMessage, type PrivateResult } from './phonePortability';

export function PhonePortabilityPanel({ blocked, onPending }: { blocked: boolean; onPending: (pending: boolean) => void }) {
  const [pending, setPending] = useState<string | null>(null), [ready, setReady] = useState(false);
  const [offline, setOffline] = useState(false), [completed, setCompleted] = useState(0);
  const [result, setResult] = useState<PrivateResult | null>(null), [message, setMessage] = useState('No private packet imported.');
  const [error, setError] = useState<string | null>(null);
  const [gateMessage, setGateMessage] = useState('Private offline gate has not been checked.');
  async function operation(label: string, action: () => Promise<void>) {
    if (blocked || pending) return;
    setPending(label); onPending(true); setError(null);
    try { await action(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Private operation failed.'); }
    finally { setPending(null); onPending(false); }
  }
  function button(label: string, action: () => Promise<void>, disabled = false) {
    const unavailable = blocked || pending !== null || disabled;
    return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: unavailable }} disabled={unavailable}
      onPress={() => void operation(label, action)} style={{ minHeight: 48, padding: 14, backgroundColor: unavailable ? '#607080' : '#153c62', borderRadius: 8 }}>
      <Text style={{ color: 'white', fontSize: 18 }}>{label}</Text></Pressable>;
  }
  return <View style={{ gap: 14 }}>
    <Text style={{ fontSize: 28, fontWeight: '700' }}>Private photo portability</Text>
    <Text>Internal replay of one reviewed frozen packet. 40 laptop control tensors and 40 full resolution phone crops use separate galleries. Requires separate execution approval.</Text>
    <Text>No image preview. Import and recovery happen only when selected below.</Text>
    {button('Check private offline gate', async () => {
      const status = await checkPrivateOfflineGate(); setGateMessage(privateOfflineGateMessage(status));
    })}
    <Text accessibilityLiveRegion="polite">{gateMessage}</Text>
    {button('Import reviewed private packet', async () => {
      setReady(false); setResult(null); setOffline(false);
      await importPrivatePortability(); setReady(true); setMessage('Exact 40-record packet admitted. No image decoded or inference run.');
    })}
    {button('Verify saved private evidence', async () => {
      setReady(false); setResult(null); const state = await recoverPrivatePortability();
      setReady(state.ready); setResult(state.result ?? null);
      setMessage(state.interruptedSession ? 'Interrupted private picker classified. Its request will not resume.' : state.ready ? 'Saved packet verified; no replay performed.' : 'No saved private packet.');
    })}
    <Text>Confirm airplane mode ON, Wi-Fi OFF, Bluetooth OFF, cellular data OFF and no tethering or usable network connection. Native settings are checked again; the reviewed procedure must retain physical offline evidence.</Text>
    <Switch accessibilityLabel="Confirm device offline state" accessibilityState={{ disabled: blocked || pending !== null }} disabled={blocked || pending !== null}
      value={offline} onValueChange={setOffline} />
    {button('Run one private replay', async () => {
      setCompleted(0); setResult(null); const saved = await runPrivatePortability(offline, setCompleted); setResult(saved);
      setMessage(saved.complete ? 'Both lanes completed. Quality acceptance requires independent comparison.' : 'Failure evidence saved. The full batch did not complete.');
    }, !ready || !offline || result !== null)}
    <Text accessibilityLiveRegion="polite">{pending ? `${pending}: ${completed}/80 records` : message}</Text>
    {pending && pending !== 'Check private offline gate' && <Pressable accessibilityRole="button" accessibilityLabel="Cancel private operation" onPress={() => {
      setMessage('Cancellation requested; owned work must drain. A partial selected document may remain.');
      void cancelPrivatePortability().catch(() => setError('Cancellation could not be confirmed.'));
    }} style={{ minHeight: 48, padding: 14 }}><Text>Cancel private operation</Text></Pressable>}
    {error && <Text accessibilityRole="alert" style={{ color: '#9f1239' }}>{error}</Text>}
    {result && <View style={{ gap: 12 }}>
      <Text>{result.attemptedInferences}/80 inference attempts · {result.bundleBytes} saved bytes</Text>
      {result.lanes.map(l => <Text key={l.lane}>{l.lane}: first {l.first}/20 · first three {l.firstThree}/20 · {l.complete ? 'complete' : 'incomplete'}</Text>)}
      <Text selectable>Private ZIP SHA256: {result.bundleSha256}</Text>
      {button('Export saved private numerical evidence', async () => { await exportPrivatePortability(result); setMessage('Complete saved numerical ZIP written. Verify its hash and all records independently.'); })}
      <Text>Save a new file in local Downloads. Evidence contains numerical tensors and vectors, never original JPEGs. Failed queries remain in the denominator.</Text>
    </View>}
  </View>;
}
