import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import type { FinanceClient, OwnerWithdrawalHistoryRow } from '../../finance/client';
import { EmptyState, ErrorPanel, PrimaryButton, SecondaryButton, StatusNote } from '../../ui/components';
import { displayMoney } from '../../ui/money';
import { theme } from '../../ui/theme';

interface OwnerWithdrawalHistoryScreenProps {
  client: FinanceClient;
  isFocused?: boolean;
  onBack: () => void;
  onRecordWithdrawal: () => void;
}

function loadRows(client: FinanceClient): { rows: OwnerWithdrawalHistoryRow[]; failure: string | null } {
  try {
    return { rows: client.listOwnerWithdrawals(), failure: null };
  } catch {
    return { rows: [], failure: 'Withdrawal history could not be read from this device.' };
  }
}

export default function OwnerWithdrawalHistoryScreen({ client, isFocused = true, onBack, onRecordWithdrawal }: OwnerWithdrawalHistoryScreenProps) {
  const [state, setState] = useState(() => loadRows(client));
  const refresh = useCallback(() => setState(loadRows(client)), [client]);
  useEffect(() => {
    if (!isFocused) return undefined;
    const frame = requestAnimationFrame(() => setState(loadRows(client)));
    return () => cancelAnimationFrame(frame);
  }, [client, isFocused]);

  const renderRow = ({ item }: { item: OwnerWithdrawalHistoryRow }) => (
    <View style={styles.row}>
      <Text style={styles.amount}>{displayMoney(item.amountMinor, item.currencyCode)}</Text>
      <Text style={styles.note}>{item.note ?? 'No note'}</Text>
      <Text style={styles.date}>{new Date(item.occurredAt).toLocaleString()}</Text>
      <StatusNote>{item.syncStatus === 'PENDING' ? 'Saved on this device · waiting to sync' : 'Saved on this device'}</StatusNote>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text accessibilityRole="header" style={styles.title}>Withdrawal history</Text>
          <Text style={styles.body}>Owner or personal withdrawals, newest first.</Text>
        </View>
        <SecondaryButton title="Back" onPress={onBack} />
      </View>
      {state.failure ? <ErrorPanel title="History unavailable" message={state.failure} onRetry={refresh} /> : null}
      {!state.failure && state.rows.length === 0 ? (
        <EmptyState title="No withdrawals yet" body="Record an owner withdrawal when it happens. It stays separate from expenses." actionTitle="Record withdrawal" onAction={onRecordWithdrawal} />
      ) : (
        <FlatList
          data={state.rows}
          keyExtractor={(item) => item.id}
          renderItem={renderRow}
          contentContainerStyle={styles.list}
          ListHeaderComponent={<PrimaryButton title="Record withdrawal" onPress={onRecordWithdrawal} />}
          ListFooterComponent={<View style={styles.footer}><StatusNote>Withdrawals are not store expenses or a cash-balance calculation.</StatusNote></View>}
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
  amount: { color: theme.color.textPrimary, fontSize: theme.fontSize.title, fontWeight: '600' },
  note: { color: theme.color.textSecondary, fontSize: theme.fontSize.body },
  date: { color: theme.color.textSecondary, fontSize: theme.fontSize.small },
  footer: { paddingTop: theme.spacing(2) },
});
