import { barcodeIdentityKey, type BarcodeInput, type RecognitionCandidate, type RecognitionResult, type RecognitionService } from '@retail/contracts';
import { Component, lazy, Suspense, type ReactNode, useEffect, useRef, useState } from 'react';
import { AppState, ScrollView, Text } from 'react-native';

import { SecondaryButton } from '../../ui/components';
import { ScanSession } from './session';

const BarcodeCamera = lazy(() => Promise.resolve().then(() => {
  // Defer native evaluation so an older binary can still sell manually.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./BarcodeCamera') as typeof import('./BarcodeCamera');
}));
class CameraFailureBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <Text>Camera unavailable in this build. Search products to continue.</Text> : this.props.children; }
}

export interface ScannerPanelProps {
  service: RecognitionService;
  session: ScanSession;
  active: boolean;
  onCandidate(candidate: RecognitionCandidate): boolean;
  onSearch(): void;
  onCancel(): void;
  basketMode: boolean;
  onModeChange(basket: boolean): void;
  summary: string;
  onUndo(): void;
}

export default function ScannerPanel({ service, session, active, onCandidate, onSearch, onCancel, basketMode, onModeChange, summary, onUndo }: ScannerPanelProps) {
  const [result, setResult] = useState<RecognitionResult | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    const subscription = AppState.addEventListener('change', () => { session.cancel(); setBusy(false); });
    return () => { alive.current = false; session.cancel(); subscription.remove(); };
  }, [session, service, active]);
  const detect = (detection: Pick<BarcodeInput, 'symbology' | 'value'>) => {
    const key = barcodeIdentityKey(detection.symbology, detection.value) ?? `${detection.symbology}:${detection.value}`;
    const generation = session.begin(key);
    if (generation === null) return;
    setBusy(true);
    setFailure(null);
    void service.recognize({ ...detection, sessionId: 'sale', requestId: String(generation) }).then(next => {
      if (!alive.current || !session.isCurrent(generation)) return;
      setResult(next);
      if (next.status === 'STRONG' && onCandidate(next.candidate)) setResult(null);
    }).catch(() => {
      if (alive.current && session.isCurrent(generation)) setFailure('Products could not be read. Your basket is preserved.');
    }).finally(() => {
      if (alive.current && session.isCurrent(generation)) { session.finish(generation); setBusy(false); }
    });
  };
  return <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
    <Text accessibilityRole="header">Scan a product</Text>
    <Text accessibilityLiveRegion="polite">{summary}</Text>
    <SecondaryButton title={basketMode ? 'Mode: Basket — switch to Single item' : 'Mode: Single item — switch to Basket'} onPress={() => onModeChange(!basketMode)} />
    {basketMode ? <Text>Confirm each item while automatic basket scanning awaits device verification.</Text> : null}
    <CameraFailureBoundary><Suspense fallback={<Text>Opening camera…</Text>}>
      <BarcodeCamera active={active && !busy && result === null && failure === null} onDetection={detect} />
    </Suspense></CameraFailureBoundary>
    {busy ? <Text>Looking up this code…</Text> : null}
    {failure ? <Text accessibilityRole="alert">{failure}</Text> : null}
    {result?.status === 'UNKNOWN' ? <Text>No safe product match. Search products to continue selling.</Text> : null}
    {result?.status === 'AMBIGUOUS' ? <Text>This code has conflicting mappings. Search and choose the product manually.</Text> : null}
    <SecondaryButton title="Scan again" onPress={() => { session.repeatExplicitly(); setResult(null); setFailure(null); }} />
    <SecondaryButton title="Search products" onPress={onSearch} />
    <SecondaryButton title="Undo last addition" onPress={onUndo} />
    <SecondaryButton title="Back to basket" onPress={onCancel} />
  </ScrollView>;
}
