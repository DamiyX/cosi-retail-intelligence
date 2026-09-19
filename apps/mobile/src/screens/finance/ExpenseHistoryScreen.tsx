import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import type { ExpenseCategory } from '../../db/repositories';
import type { ExpenseHistoryRow, FinanceClient } from '../../finance/client';
import { EmptyState, ErrorPanel, PrimaryButton, SecondaryButton, StatusNote } from '../../ui/components';
import { displayMoney } from '../../ui/money';
import { theme } from '../../ui/theme';

interface ExpenseHistoryScreenProps {
  client: FinanceClient;
  isFocused?: boolean;
  onBack: () => void;
  onRecordExpense: () => void;
}

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  TRANSPORT: 'Transport',
  WAGES: 'Wages',
  FUEL_ELECTRICITY: 'Fuel / electricity',
  RENT: 'Rent',
  MAINTENANCE: 'Maintenance',
  LEVIES_TAX: 'Levies / tax',
  MISCELLANEOUS: 'Miscellaneous',
};

function loadRows(client: FinanceClient): { rows: ExpenseHistoryRow[]; failure: string | null } {
  try {
    return { rows: client.listExpenses(), failure: null };
  } catch {
    return { rows: [], failure: 'Expense history could not be read from this device.' };
  }
}

export default function ExpenseHistoryScreen({ client, isFocused = true, onBack, onRecordExpense }: ExpenseHistoryScreenProps) {
  const [state, setState] = useState(() => loadRows(client));
  const refresh = useCallback(() => setState(loadRows(client)), [client]);
  useEffect(() => {
    if (!isFocused) return undefined;
    const frame = requestAnimationFrame(() => setState(loadRows(client)));
    return () => cancelAnimationFrame(frame);
  }, [client, isFocused]);

  const renderRow = ({ item }: { item: ExpenseHistoryRow }) => (
    <View style={styles.row}>
      <View style={styles.rowTop}>
        <Text style={styles.amount}>{displayMoney(item.amountMinor, item.currencyCode)}</Text>
        <Text style={styles.category}>{CATEGORY_LABELS[item.category]}</Text>
      </View>
      <Text style={styles.note}>{item.note ?? 'No note'}</Text>
      <Text style={styles.date}>{new Date(item.occurredAt).toLocaleString()}</Text>
      <StatusNote>{item.syncStatus === 'PENDING' ? 'Saved on this device · waiting to sync' : 'Saved on this device'}</StatusNote>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text accessibilityRole="header" style={styles.title}>Expense history</Text>
          <Text style={styles.body}>Owner-recorded store costs, newest first.</Text>
        </View>
        <SecondaryButton title="Back" onPress={onBack} />
      </View>
      {state.failure ? <ErrorPanel title="History unavailable" message={state.failure} onRetry={refresh} /> : null}
      {!state.failure && state.rows.length === 0 ? (
        <EmptyState title="No expenses yet" body="Record a store cost when it happens. It stays available offline." actionTitle="Record expense" onAction={onRecordExpense} />
      ) : (
        <FlatList
          data={state.rows}
          keyExtractor={(item) => item.id}
          renderItem={renderRow}
          contentContainerStyle={styles.list}
          ListHeaderComponent={<PrimaryButton title="Record expense" onPress={onRecordExpense} />}
          ListFooterComponent={<View style={styles.footer}><StatusNote>All expense amounts are shown in {client.storeCurrencyCode}.</StatusNote></View>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: theme.spacing(4), gap: theme.spacing(4), backgroundColor: theme.color.canvas },
  header: { gap: theme.spacing(3) },
  headerCopy: { gap: theme.spacing(1) },
  title: { color: theme.color.textPrimary, fontSize: theme.fontSize.header, fontWeight: '600' },
  body: { color: theme.color.textSecondary, fontSize: theme.fontSize.body, lineHeight: 24 },
  list: { gap: theme.spacing(3), paddingBottom: theme.spacing(6) },
  row: { backgroundColor: theme.color.raised, borderColor: theme.color.border, borderWidth: 1, borderRadius: theme.radius.card, padding: theme.spacing(4), gap: theme.spacing(1) },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing(2) },
  amount: { color: theme.color.textPrimary, fontSize: theme.fontSize.title, fontWeight: '600' },
  category: { color: theme.color.actionPrimary, fontSize: theme.fontSize.small, fontWeight: '600', alignSelf: 'center' },
  note: { color: theme.color.textSecondary, fontSize: theme.fontSize.body },
  date: { color: theme.color.textSecondary, fontSize: theme.fontSize.small },
  footer: { paddingTop: theme.spacing(2) },
});
