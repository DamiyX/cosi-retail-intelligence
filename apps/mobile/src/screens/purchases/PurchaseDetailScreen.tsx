import { formatQuantityMicros } from '@retail/domain';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { PurchasesClient } from '../../purchases/client';
import type { PurchaseDetail } from '../../purchases/index';
import { ErrorPanel, SecondaryButton, StatusNote } from '../../ui/components';
import { displayMoney } from '../../ui/money';
import { theme } from '../../ui/theme';

interface PurchaseDetailScreenProps {
  client: PurchasesClient;
  purchaseId: string;
  onBack: () => void;
}

function load(client: PurchasesClient, purchaseId: string): { detail: PurchaseDetail | null; failure: string | null } {
  try {
    const detail = client.getPurchaseDetail(purchaseId);
    return detail ? { detail, failure: null } : { detail: null, failure: 'Receipt not found on this device.' };
  } catch (error) {
    return { detail: null, failure: error instanceof Error ? error.message : 'Receipt could not be read.' };
  }
}

export default function PurchaseDetailScreen({ client, purchaseId, onBack }: PurchaseDetailScreenProps) {
  const [state, setState] = useState(() => load(client, purchaseId));
  if (!state.detail) {
    return <View style={styles.container}><ErrorPanel title="Receipt unavailable" message={state.failure ?? 'The receipt could not be read.'} onRetry={() => setState(load(client, purchaseId))} onDismiss={onBack} /></View>;
  }
  const { detail } = state;
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <Text accessibilityRole="header" style={styles.title}>Restock receipt</Text>
        <StatusNote>{detail.syncStatus === 'PENDING' ? 'Saved on this device' : detail.syncStatus ?? 'Saved locally'}</StatusNote>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Total</Text>
        <Text style={styles.total}>{displayMoney(detail.purchase.totalAmountMinor, detail.purchase.currencyCode)}</Text>
        <Text style={styles.meta}>Occurred: {new Date(detail.purchase.occurredAt).toLocaleString()}</Text>
        {detail.purchase.supplierNameSnapshot ? <Text style={styles.meta}>Supplier: {detail.purchase.supplierNameSnapshot}</Text> : null}
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Original purchase facts</Text>
        {detail.items.map((item) => {
          const observation = detail.observations.find((entry) => entry.purchaseItemId === item.id);
          return (
            <View key={item.id} style={styles.item}>
              <Text style={styles.itemTitle}>{item.productNameSnapshot}</Text>
              <Text style={styles.meta}>{formatQuantityMicros(item.quantityPackagesMicros)} {item.packageNameSnapshot} · {formatQuantityMicros(item.quantityBaseMicros)} base units</Text>
              <Text style={styles.meta}>Entered {item.costBasis.toLowerCase()} cost: {displayMoney(item.enteredCostMinor, item.currencyCode)}</Text>
              <Text style={styles.meta}>Normalized base cost: {item.baseUnitCostNumerator}/{item.baseUnitCostDenominator} minor units per base unit</Text>
              <Text style={styles.meta}>Cost availability: {detail.costStates.find((stateRow) => stateRow.storeProductId === item.storeProductId)?.coverageStatus ?? 'UNKNOWN'}</Text>
              <Text style={styles.meta}>Shared contribution: {observation?.contributionConsent === false ? 'off' : 'not available'}</Text>
            </View>
          );
        })}
      </View>
      <Text style={styles.meta}>Receipt ID: {detail.purchase.id}</Text>
      <SecondaryButton title="Back to purchase history" onPress={onBack} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: theme.spacing(4), gap: theme.spacing(3), backgroundColor: theme.color.canvas },
  headerRow: { gap: theme.spacing(1) },
  title: { color: theme.color.textPrimary, fontSize: theme.fontSize.header, fontWeight: '600' },
  card: { backgroundColor: theme.color.raised, borderColor: theme.color.border, borderWidth: 1, borderRadius: theme.radius.card, padding: theme.spacing(4), gap: theme.spacing(2) },
  label: { color: theme.color.textSecondary, fontSize: theme.fontSize.small, fontWeight: '600', textTransform: 'uppercase' },
  total: { color: theme.color.textPrimary, fontSize: theme.fontSize.title, fontWeight: '700' },
  item: { borderTopColor: theme.color.border, borderTopWidth: 1, paddingTop: theme.spacing(2), gap: theme.spacing(1) },
  itemTitle: { color: theme.color.textPrimary, fontSize: theme.fontSize.body, fontWeight: '600' },
  meta: { color: theme.color.textSecondary, fontSize: theme.fontSize.body },
});
