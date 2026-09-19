import { useCallback, useEffect, useState } from 'react';
import { AppState, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { InventoryClient } from '../../inventory/client';
import type { BusinessSummary, FinanceClient } from '../../finance';
import { ErrorPanel, PrimaryButton, SecondaryButton, StatusNote } from '../../ui/components';
import { displayMoney } from '../../ui/money';
import { theme } from '../../ui/theme';

interface HomeScreenProps {
  financeClient: FinanceClient;
  inventoryClient: InventoryClient | null;
  inventoryFailure?: string | null;
  isFocused?: boolean;
  onSell: () => void;
  onRestock: () => void;
  onStockChecks: () => void;
  onRecordExpense: () => void;
  onOpenSummary: () => void;
  onSeeAttention: () => void;
}

interface HomeState {
  summary: BusinessSummary | null;
  summaryFailure: string | null;
  attention: ReturnType<InventoryClient['getAttentionOverview']> | null;
  attentionFailure: string | null;
}

function read(financeClient: FinanceClient, inventoryClient: InventoryClient | null, inventoryFailure?: string | null): HomeState {
  let summary: BusinessSummary | null = null;
  let summaryFailure: string | null = null;
  try {
    summary = financeClient.getBusinessSummary();
  } catch (error) {
    summaryFailure = error instanceof Error ? error.message : 'Today’s summary could not be read.';
  }
  if (!inventoryClient) {
    return { summary, summaryFailure, attention: null, attentionFailure: inventoryFailure ?? 'Needs attention is not available on this device.' };
  }
  try {
    return { summary, summaryFailure, attention: inventoryClient.getAttentionOverview(), attentionFailure: null };
  } catch (error) {
    return { summary, summaryFailure, attention: null, attentionFailure: error instanceof Error ? error.message : 'Needs attention could not be read.' };
  }
}

function money(value: number | null, currencyCode: string): string {
  return displayMoney(value, currencyCode) ?? 'Not available';
}

export default function HomeScreen({
  financeClient,
  inventoryClient,
  inventoryFailure,
  isFocused = true,
  onSell,
  onRestock,
  onStockChecks,
  onRecordExpense,
  onOpenSummary,
  onSeeAttention,
}: HomeScreenProps) {
  const [state, setState] = useState(() => read(financeClient, inventoryClient, inventoryFailure));
  const refresh = useCallback(() => setState(read(financeClient, inventoryClient, inventoryFailure)), [financeClient, inventoryClient, inventoryFailure]);

  useEffect(() => {
    if (!isFocused) return undefined;
    const frame = requestAnimationFrame(refresh);
    const interval = setInterval(refresh, 60_000);
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') refresh();
    });
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(interval);
      subscription.remove();
    };
  }, [isFocused, refresh]);

  const summary = state.summary;
  const attentionItems = state.attention?.items.slice(0, 3) ?? [];
  const attentionCount = state.attention?.allConditionCount ?? 0;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>Home</Text>
        <Text style={styles.subtitle}>{financeClient.storeName} · live store facts saved on this device</Text>
      </View>
      {state.summaryFailure || !summary ? (
        <ErrorPanel title="Today’s summary unavailable" message={state.summaryFailure ?? 'The summary could not be read safely.'} onRetry={refresh} />
      ) : (
        <>
          <View style={styles.sectionHeader}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>Live today</Text>
            <Text style={styles.sectionMeta}>{summary.range.localDate} · store-local day</Text>
          </View>
          <View style={styles.heroCard}>
            <Text style={styles.cardLabel}>Sales value</Text>
            <Text style={styles.heroValue}>{money(summary.salesValueMinor, summary.currencyCode)}</Text>
            <Text style={styles.cardHint}>Includes completed credit sales; not cash received or profit.</Text>
          </View>
          <View style={styles.metricGrid}>
            <View style={styles.metricCard}><Text style={styles.cardLabel}>Completed sales</Text><Text style={styles.metricValue}>{summary.transactionCount}</Text></View>
            <View style={styles.metricCard}><Text style={styles.cardLabel}>Expenses</Text><Text style={styles.metricValue}>{money(summary.recordedExpensesMinor, summary.currencyCode)}</Text></View>
            <View style={styles.metricCard}><Text style={styles.cardLabel}>Withdrawals</Text><Text style={styles.metricValue}>{money(summary.ownerWithdrawalsMinor, summary.currencyCode)}</Text></View>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Tracked cost coverage</Text>
            <Text style={styles.cardHint}>
              {summary.costCoverage === 'NONE'
                ? 'Unavailable cost coverage is not shown as zero.'
                : `${summary.coveredSaleCount} covered sale${summary.coveredSaleCount === 1 ? '' : 's'} · ${summary.unavailableSaleCount} unavailable`}
            </Text>
            {summary.trackedGrossMarginMinor !== null ? <Text style={styles.metric}>Tracked gross margin (covered sales only): {money(summary.trackedGrossMarginMinor, summary.currencyCode)}</Text> : null}
            <SecondaryButton title="Open today’s summary" onPress={onOpenSummary} />
          </View>
        </>
      )}
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text accessibilityRole="header" style={styles.cardTitle}>Needs attention</Text>
          <Text style={styles.sectionMeta}>{attentionCount} current condition{attentionCount === 1 ? '' : 's'}</Text>
        </View>
        {state.attentionFailure ? <Text style={styles.error}>{state.attentionFailure}</Text> : null}
        {!state.attentionFailure && attentionItems.length === 0 ? <Text style={styles.cardHint}>Nothing needs attention right now.</Text> : null}
        {attentionItems.map((item) => (
          <View key={item.id} style={styles.attentionRow}>
            <Text style={styles.attentionTitle}>{item.title}</Text>
            <Text style={styles.cardHint}>{item.detail}</Text>
          </View>
        ))}
        <SecondaryButton title="See all attention" onPress={onSeeAttention} />
      </View>
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.cardTitle}>Next actions</Text>
        <PrimaryButton title="Sell" onPress={onSell} />
        <SecondaryButton title="Restock" onPress={onRestock} />
        <SecondaryButton title="Stock checks" onPress={onStockChecks} />
        <SecondaryButton title="Record expense" onPress={onRecordExpense} />
      </View>
      <StatusNote>Refreshes when Home opens, returns to the foreground, or the day rolls over.</StatusNote>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: theme.spacing(4), gap: theme.spacing(4), backgroundColor: theme.color.canvas },
  header: { gap: theme.spacing(1) },
  title: { color: theme.color.textPrimary, fontSize: theme.fontSize.header, fontWeight: '600' },
  subtitle: { color: theme.color.textSecondary, fontSize: theme.fontSize.small, lineHeight: 20 },
  sectionHeader: { gap: theme.spacing(1) },
  sectionTitle: { color: theme.color.textPrimary, fontSize: theme.fontSize.title, fontWeight: '600' },
  sectionMeta: { color: theme.color.textSecondary, fontSize: theme.fontSize.small },
  heroCard: { backgroundColor: theme.color.raised, borderColor: theme.color.border, borderWidth: 1, borderRadius: theme.radius.card, padding: theme.spacing(4), gap: theme.spacing(1) },
  heroValue: { color: theme.color.textPrimary, fontSize: 30, fontWeight: '700' },
  metricGrid: { gap: theme.spacing(3) },
  metricCard: { backgroundColor: theme.color.raised, borderColor: theme.color.border, borderWidth: 1, borderRadius: theme.radius.card, padding: theme.spacing(4), gap: theme.spacing(1) },
  card: { backgroundColor: theme.color.raised, borderColor: theme.color.border, borderWidth: 1, borderRadius: theme.radius.card, padding: theme.spacing(4), gap: theme.spacing(3) },
  cardLabel: { color: theme.color.textSecondary, fontSize: theme.fontSize.small, fontWeight: '600' },
  cardTitle: { color: theme.color.textPrimary, fontSize: theme.fontSize.title, fontWeight: '600' },
  metricValue: { color: theme.color.textPrimary, fontSize: theme.fontSize.title, fontWeight: '600' },
  metric: { color: theme.color.textPrimary, fontSize: theme.fontSize.body, lineHeight: 24 },
  cardHint: { color: theme.color.textSecondary, fontSize: theme.fontSize.small, lineHeight: 20 },
  attentionRow: { borderTopColor: theme.color.border, borderTopWidth: 1, paddingTop: theme.spacing(2), gap: theme.spacing(1) },
  attentionTitle: { color: theme.color.textPrimary, fontSize: theme.fontSize.body, fontWeight: '600' },
  error: { color: theme.color.statusDanger, fontSize: theme.fontSize.small, lineHeight: 20 },
});
