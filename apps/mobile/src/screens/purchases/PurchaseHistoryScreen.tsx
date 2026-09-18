import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import type { PurchasesClient } from '../../purchases/client';
import { EmptyState, ErrorPanel, StatusNote } from '../../ui/components';
import { displayMoney } from '../../ui/money';
import { theme } from '../../ui/theme';

interface PurchaseHistoryScreenProps {
  client: PurchasesClient;
  onOpenPurchase: (purchaseId: string) => void;
  onBack: () => void;
  isFocused?: boolean;
}

interface HistoryState {
  rows: ReturnType<PurchasesClient['listPurchases']>;
  failure: string | null;
}

function load(client: PurchasesClient): HistoryState {
  try {
    return { rows: client.listPurchases(), failure: null };
  } catch (error) {
    return { rows: [], failure: error instanceof Error ? error.message : 'Purchase history could not be read.' };
  }
}

export default function PurchaseHistoryScreen({ client, onOpenPurchase, onBack, isFocused = true }: PurchaseHistoryScreenProps) {
  const [state, setState] = useState<HistoryState>(() => load(client));
  const initialFocusHandledRef = useRef(false);
  const refresh = useCallback((): void => {
    setState(load(client));
  }, [client]);
  useEffect(() => {
    if (isFocused) {
      if (!initialFocusHandledRef.current) {
        initialFocusHandledRef.current = true;
        return;
      }
      // Focus is an external navigation event; refresh the durable read while
      // retaining the screen's route state and error/retry surface.
      refresh();
    }
  }, [isFocused, refresh]);
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>Purchase history</Text>
      <Text style={styles.storeLine}>{client.storeName} · <StatusNote>Available offline</StatusNote></Text>
      {state.failure ? (
        <ErrorPanel title="Purchase history unavailable" message="Receipts remain saved on this device." onRetry={refresh} onDismiss={onBack} />
      ) : state.rows.length === 0 ? (
        <EmptyState title="No restocks yet" body="Completed restocks will appear here with their original prices and quantities." actionTitle="Back" onAction={onBack} />
      ) : (
        <FlatList
          data={state.rows}
          keyExtractor={(row) => row.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable accessibilityRole="button" accessibilityLabel={`Open restock ${item.id}`} onPress={() => onOpenPurchase(item.id)} style={styles.row}>
              <Text style={styles.rowTitle}>{new Date(item.occurredAt).toLocaleString()}</Text>
              <Text style={styles.meta}>{displayMoney(item.totalAmountMinor, item.currencyCode)} · {item.itemCount} {item.itemCount === 1 ? 'line' : 'lines'}</Text>
              <Text style={styles.meta}>{item.syncStatus === 'PENDING' ? 'Saved on this device' : item.syncStatus ?? 'Saved locally'}</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: theme.spacing(4), gap: theme.spacing(3), backgroundColor: theme.color.canvas },
  title: { color: theme.color.textPrimary, fontSize: theme.fontSize.header, fontWeight: '600' },
  storeLine: { color: theme.color.textSecondary, fontSize: theme.fontSize.small },
  list: { gap: theme.spacing(2), paddingBottom: theme.spacing(3) },
  row: { backgroundColor: theme.color.raised, borderColor: theme.color.border, borderWidth: 1, borderRadius: theme.radius.card, minHeight: theme.minTouchTarget, padding: theme.spacing(4), gap: theme.spacing(1) },
  rowTitle: { color: theme.color.textPrimary, fontSize: theme.fontSize.body, fontWeight: '600' },
  meta: { color: theme.color.textSecondary, fontSize: theme.fontSize.small },
});
