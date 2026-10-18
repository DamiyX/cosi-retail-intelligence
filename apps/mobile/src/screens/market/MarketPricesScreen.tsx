import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { MarketClient } from '../../market/client';
import { formatMarketCost, marketControlDescription } from '../../market/presentation';

/** Shipped route supplies no transport. Injected source fixtures exercise states only. */
export function MarketPricesScreen({ client, storeName = 'Current store' }: { client?: MarketClient; storeName?: string }) {
  const router = useRouter();
  const [control, setControl] = useState<ReturnType<MarketClient['getControl']> | null>(null);
  const [saved, setSaved] = useState<ReturnType<MarketClient['getSaved']>>([]);
  const [products, setProducts] = useState<ReturnType<MarketClient['getProducts']>>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [informed, setInformed] = useState(false);
  const [zoneId, setZoneId] = useState<string | null>(null);
  const refresh = useCallback(() => {
    try {
      setControl(client?.getControl() ?? null);
      setSaved(client?.getSaved() ?? []);
      setProducts(client?.getProducts() ?? []);
    } catch {
      setControl(null); setSaved([]); setProducts([]); setMessage('Market access is unavailable for this account or device.');
    }
  }, [client]);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => subscription.remove();
  }, [refresh]);
  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    try { await work(); setMessage(null); } catch (error) { setMessage(error instanceof Error ? error.message : 'Market request failed.'); }
    finally { setBusy(false); refresh(); }
  };
  const available = client?.available === true;
  return <ScrollView contentContainerStyle={styles.container}>
    <Text accessibilityRole="header" style={styles.title}>Market prices</Text>
    <Text style={styles.body}>{storeName} · Experimental</Text>
    <Text style={styles.body}>{marketControlDescription(available, control)}</Text>
    <Text style={styles.body}>Only prospective accepted purchase costs, reviewed product/package identity and your selected broad zone may contribute after server confirmation. Private names, suppliers, contacts, purchase quantities, sales, photos and receipts are excluded from releases.</Text>
    <Text style={styles.body}>This is confidential processing, not a promise of anonymity. Offline saved results may remain until expiry after revocation.</Text>
    {available && <View style={styles.group}>
      <Text accessibilityRole="header" style={styles.heading}>Contribution</Text>
      <Text style={styles.body}>Zone: {control?.acknowledgement?.zone?.name ?? 'Not selected'}</Text>
      {(control?.acknowledgement?.zones ?? []).map(zone => <Pressable key={zone.id} accessibilityRole="radio"
        accessibilityState={{ selected: zoneId === zone.id }} accessibilityLabel={`Select market zone ${zone.name}`}
        onPress={() => setZoneId(zone.id)} style={styles.action}><Text style={styles.body}>{zone.name} · {zone.countryCode} · {zone.currencyCode}</Text></Pressable>)}
      <Pressable accessibilityRole="checkbox" accessibilityLabel="I understand prospective market contribution"
        accessibilityState={{ checked: informed }} onPress={() => setInformed(value => !value)} style={styles.action}>
        <Text style={styles.body}>{informed ? 'Checked' : 'Unchecked'} · I understand and choose prospective contribution</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Read confirmed market state" disabled={busy}
        accessibilityState={{ disabled: busy }} onPress={() => void run(() => client!.reconcile())} style={styles.action}>
        <Text style={styles.body}>Read confirmed state (online)</Text>
      </Pressable>
      <Pressable accessibilityRole="button" disabled={busy || !informed || !zoneId || !!control?.pending}
        accessibilityState={{ disabled: busy || !informed || !zoneId || !!control?.pending }}
        onPress={() => void run(() => client!.requestControl(true, zoneId, informed))} style={styles.action}>
        <Text style={styles.body}>Enable prospective contribution (online)</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => { try { client!.queueDisable(); refresh(); } catch { refresh(); } }} style={styles.action}>
        <Text style={styles.body}>Turn contribution locally off</Text>
      </Pressable>
      <Pressable accessibilityRole="button" disabled={busy} accessibilityState={{ disabled: busy }}
        onPress={() => void run(() => client!.retryPending())} style={styles.action}>
        <Text style={styles.body}>Reconcile / retry pending confirmation</Text>
      </Pressable>
      <Pressable accessibilityRole="button" disabled={busy || !!control?.localOff || !!control?.pending}
        accessibilityState={{ disabled: busy || !!control?.localOff || !!control?.pending }}
        onPress={() => void run(async () => {
          const products = client!.getProducts();
          if (products.length === 0) throw new Error('No purchasable packages are available.');
          await client!.refresh(products.map(({ productVariantId, packageUnitId }) => ({ productVariantId, packageUnitId })));
        })} style={styles.action}><Text style={styles.body}>Refresh up to 100 package results (online)</Text></Pressable>
    </View>}
    {message && <Text accessibilityRole="alert" style={styles.body}>{message}</Text>}
    {control?.message && <Text accessibilityLiveRegion="polite" style={styles.body}>{control.message}</Text>}
    <Text accessibilityRole="header" style={styles.heading}>Saved package results</Text>
    {saved.length === 0 && <Text style={styles.body}>No market result is available. Missing reviewed identity or insufficient coverage never produces a price.</Text>}
    {saved.map(({ result, response, status }) => {
      const product = products.find(item => item.productVariantId === result.key.productVariantId && item.packageUnitId === result.key.packageUnitId);
      return <View key={`${result.key.productVariantId}/${result.key.packageUnitId}`} style={styles.group}>
      <Text accessibilityRole="header" style={styles.heading}>{product?.name ?? 'Local product unavailable'} · {product?.packageName ?? result.packageName ?? 'Unmapped package'}</Text>
      <Text style={styles.body}>{response.zone?.name ?? 'No approved zone'} · {response.currencyCode}</Text>
      {result.status !== 'AVAILABLE' ? <Text style={styles.body}>{result.status === 'INSUFFICIENT_DATA' ? 'Insufficient data: at least five distinct consenting stores are required.' : 'Market result unavailable: reviewed identity or contribution is missing.'}</Text> : status === 'EXPIRED' ?
        <Text style={styles.body}>Expired saved result. Connect and refresh before using market prices.</Text> : <>
          <Text style={styles.body}>Saved · LIMITED prototype coverage</Text>
          <Text style={styles.body}>Range: {formatMarketCost(result.minimum,response.currencyCode)} to {formatMarketCost(result.maximum,response.currencyCode)}</Text>
          <Text style={styles.body}>Typical (median): {formatMarketCost(result.median,response.currencyCode)}. Display rounded to minor units.</Text>
          <Text style={styles.body}>{result.observationCount} representative observations from {result.observationCount} distinct consenting stores; one latest observation per store in 30 UTC days.</Text>
          <Text style={styles.body}>Window starts {result.windowStart}. Observed through {result.observedThrough}. Calculated {result.calculatedAt}. Valid until {result.validUntil}.</Text>
        </>}
    </View>;
    })}
    <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/products/price-changes')} style={styles.action}>
      <Text style={styles.body}>View personal price history</Text>
    </Pressable>
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 16, backgroundColor: '#F7F8F5' },
  title: { fontSize: 32, fontWeight: '600', color: '#17251F' },
  heading: { fontSize: 20, fontWeight: '600', color: '#17251F' },
  body: { fontSize: 17, lineHeight: 26, color: '#41534C' },
  group: { gap: 12 },
  action: { minHeight: 48, padding: 16, borderWidth: 1, borderColor: '#7F8E88', borderRadius: 12, backgroundColor: '#FFFFFF' },
});
