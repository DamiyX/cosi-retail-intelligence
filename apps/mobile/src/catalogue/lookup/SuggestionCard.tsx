import { useEffect, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { SecondaryButton } from '../../ui/components';
import type { LookupCode, LookupResult, SuggestedDetails } from './provider';
import type { CatalogueSuggestions, Suggestion } from './suggestions';

const messages: Partial<Record<Suggestion['status'], string>> = {
  LOCAL_MATCH: 'This barcode already belongs to a local product. Use the saved product from Search.',
  DISABLED: 'Online suggestions are unavailable in this build. You can enter details yourself.',
  NO_MATCH: 'No online details found. You can enter details yourself.',
  OFFLINE: 'Online details are unavailable while offline. You can enter details yourself.',
  ERROR: 'Online details could not be checked. You can enter details yourself.',
  INVALID: 'The provider returned a different or invalid barcode. No details were used.',
  TIMEOUT: 'Online lookup timed out. You can continue without it.',
  RATE_LIMIT: 'Online lookup is resting. Try again later or enter details yourself.',
};
function Card({ value, onUse, onDismiss, onRetry }: { value: Suggestion | LookupResult | null; onUse: (details: SuggestedDetails) => void; onDismiss: () => void; onRetry: () => void }) {
  if (!value || ['PENDING', 'CANCELLED', 'ACCEPTED', 'DISMISSED', 'CORRECTED'].includes(value.status)) return null;
  if (value.status !== 'FOUND' || !('details' in value) || !value.details) return <View><Text>{messages[value.status]}</Text>{value.status !== 'DISABLED' ? <SecondaryButton title="Retry online lookup" onPress={onRetry} /> : null}</View>;
  const details = value.details;
  return <View accessibilityLabel="Unconfirmed product suggestion">
    <Text>Suggested details — check against your product</Text>
    <Text>{details.name}</Text>
    {details.brand ? <Text>Brand: {details.brand}</Text> : null}
    {details.size ? <Text>Size: {details.size} (does not change package units)</Text> : null}
    <Text>Source: {details.source}. Unconfirmed. Use details fills an editable product name; Save confirms your changes.</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      <Text accessibilityRole="link" style={{ paddingVertical: 12, textDecorationLine: 'underline' }} onPress={() => { void Linking.openURL(details.sourceUrl).catch(() => undefined); }}>Source and attribution</Text>
      <Text accessibilityRole="link" style={{ paddingVertical: 12, textDecorationLine: 'underline' }} onPress={() => { void Linking.openURL(details.licenceUrl).catch(() => undefined); }}>Data licence (ODbL)</Text>
    </View>
    <SecondaryButton title="Use details" onPress={() => onUse(details)} />
    <SecondaryButton title="Dismiss suggestion" onPress={onDismiss} />
  </View>;
}

export function SavedSuggestion({ service, productId, onUse }: { service: CatalogueSuggestions; productId: string; onUse: (details: SuggestedDetails) => void }) {
  const [value, setValue] = useState(() => { try { return service.read(productId); } catch { return null; } });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void service.refresh(productId, controller.signal, retry > 0).then(() => { if (!controller.signal.aborted) setValue(service.read(productId)); }).catch(() => { /* Optional metadata never blocks editing. */ });
    return () => controller.abort();
  }, [productId, retry, service]);
  return <Card value={value} onUse={onUse} onRetry={() => setRetry(n => n + 1)} onDismiss={() => { try { service.decide(productId, 'DISMISSED'); setValue(service.read(productId)); } catch { setValue(null); } }} />;
}

export function PreviewSuggestion({ service, code, onUse, onDismiss }: { service: CatalogueSuggestions; code: LookupCode; onUse: (details: SuggestedDetails) => void; onDismiss: () => void }) {
  const [value, setValue] = useState<LookupResult | null>(null);
  const [retry, setRetry] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    // A complete validated code is required by the service. This is not scan-frame traffic or text search.
    const timer = setTimeout(() => { void service.preview(code, controller.signal).then(result => { if (!controller.signal.aborted) setValue(result); }).catch(() => { if (!controller.signal.aborted) setValue({ status: 'ERROR' }); }); }, 500);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [code, retry, service]);
  return dismissed ? null : <Card value={value} onUse={onUse} onRetry={() => setRetry(n => n + 1)} onDismiss={() => { setDismissed(true); onDismiss(); }} />;
}
