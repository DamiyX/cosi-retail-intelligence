import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import type { SaleSummaryRow } from '../../db/repositories';
import type { SalesClient } from '../../sales/client';
import { saleSyncStatusLabel } from '../../sales/syncStatus';
import { EmptyState, ErrorPanel, SecondaryButton, StatusNote } from '../../ui/components';
import { displayMoney } from '../../ui/money';
import { theme } from '../../ui/theme';

interface SaleHistoryScreenProps {
  client: SalesClient;
  onOpenSale: (saleId: string) => void;
  onBack: () => void;
}

interface HistoryState {
  sales: SaleSummaryRow[];
  failure: string | null;
}

function loadHistory(client: SalesClient): HistoryState {
  try {
    const sales = client.listSales();
    return { sales, failure: null };
  } catch (error) {
    return {
      sales: [],
      failure: error instanceof Error ? error.message : 'Unknown failure reading sales history.',
    };
  }
}

function paymentMethodLabel(method: string | null): string {
  switch (method) {
    case 'CASH':
      return 'Cash';
    case 'BANK_TRANSFER':
      return 'Transfer';
    case 'POS_CARD':
      return 'POS / Card';
    case 'CREDIT':
      return 'Credit';
    default:
      return 'Sale';
  }
}

export default function SaleHistoryScreen({ client, onOpenSale, onBack }: SaleHistoryScreenProps) {
  const [state, setState] = useState<HistoryState>(() => loadHistory(client));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          Recent sales
        </Text>
        <Text style={styles.storeLine}>
          {client.storeName} · <StatusNote>Works offline, saved on this device</StatusNote>
        </Text>
      </View>

      {state.failure !== null ? (
        <ErrorPanel
          title="Sales history unavailable"
          message="Recent sales could not be read from this device. Your sales records are preserved locally."
          onRetry={() => setState(loadHistory(client))}
          onDismiss={onBack}
        />
      ) : state.sales.length === 0 ? (
        <EmptyState
          title="No sales recorded yet"
          body="Complete a sale to see it listed here in your local history. All sales are saved safely offline on this device."
          actionTitle="Back to sell"
          onAction={onBack}
        />
      ) : (
        <FlatList
          data={state.sales}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const totalDisplay = displayMoney(item.totalMinor, item.currencyCode) ?? '0.00';
            const occurred = new Date(item.occurredAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });
            const methodText = paymentMethodLabel(item.paymentMethod);
            const itemsText = `${item.itemCount} ${item.itemCount === 1 ? 'item' : 'items'}`;

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Sale on ${occurred}, ${methodText}, ${itemsText}, ${totalDisplay}`}
                onPress={() => onOpenSale(item.id)}
                style={styles.card}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.totalText}>{totalDisplay}</Text>
                  <Text style={styles.dateText}>{occurred}</Text>
                </View>
                <View style={styles.cardMeta}>
                  <Text style={styles.metaText}>
                    {methodText} · {itemsText}
                  </Text>
                </View>
                <View style={styles.cardBottom}>
                  <StatusNote>{saleSyncStatusLabel(item.syncStatus)} · Tap to view</StatusNote>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {state.failure === null && state.sales.length > 0 ? (
        <View style={styles.footer}>
          <SecondaryButton title="Back to sell" onPress={onBack} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing(4),
    gap: theme.spacing(3),
    backgroundColor: theme.color.canvas,
  },
  header: { gap: theme.spacing(1) },
  title: { color: theme.color.textPrimary, fontSize: theme.fontSize.header, fontWeight: '600' },
  storeLine: { color: theme.color.textSecondary, fontSize: theme.fontSize.small },
  list: { gap: theme.spacing(2), paddingBottom: theme.spacing(4) },
  card: {
    backgroundColor: theme.color.raised,
    borderColor: theme.color.border,
    borderWidth: 1,
    borderRadius: theme.radius.card,
    minHeight: theme.minTouchTarget,
    padding: theme.spacing(4),
    gap: theme.spacing(1),
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  totalText: {
    color: theme.color.actionPrimary,
    fontSize: theme.fontSize.title,
    fontWeight: '700',
  },
  dateText: { color: theme.color.textSecondary, fontSize: theme.fontSize.small },
  cardMeta: { marginTop: theme.spacing(1) },
  metaText: {
    color: theme.color.textPrimary,
    fontSize: theme.fontSize.body,
    fontWeight: '500',
  },
  cardBottom: { marginTop: theme.spacing(1) },
  footer: { paddingVertical: theme.spacing(2) },
});
