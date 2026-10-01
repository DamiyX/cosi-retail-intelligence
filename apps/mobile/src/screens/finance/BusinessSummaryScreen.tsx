import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { BusinessSummary, FinanceClient } from '../../finance';
import { ErrorPanel, PrimaryButton, SecondaryButton, StatusNote } from '../../ui/components';
import { displayMoney } from '../../ui/money';
import { theme } from '../../ui/theme';

interface BusinessSummaryScreenProps {
  client: FinanceClient;
  isFocused?: boolean;
  onBack: () => void;
  localDate?: string;
}

function loadSummary(client: FinanceClient, localDate?: string): { summary: BusinessSummary | null; failure: string | null } {
  try {
    return { summary: client.getBusinessSummary(localDate), failure: null };
  } catch {
    return { summary: null, failure: 'Today’s summary could not be read from this device.' };
  }
}

function money(value: number | null, currencyCode: string): string {
  return displayMoney(value, currencyCode) ?? 'Not available';
}

export default function BusinessSummaryScreen({ client, isFocused = true, onBack, localDate }: BusinessSummaryScreenProps) {
  const [state, setState] = useState(() => loadSummary(client, localDate));
  const refresh = useCallback(() => setState(loadSummary(client, localDate)), [client, localDate]);
  useEffect(() => {
    if (!isFocused) return undefined;
    const frame = requestAnimationFrame(() => setState(loadSummary(client, localDate)));
    return () => cancelAnimationFrame(frame);
  }, [client, isFocused, localDate]);

  if (state.failure || !state.summary) {
    return (
      <View style={styles.center}>
        <ErrorPanel title="Summary unavailable" message={state.failure ?? 'Summary is not available yet.'} onRetry={refresh} onDismiss={onBack} />
      </View>
    );
  }

  const summary = state.summary;
  const coverageBody = summary.costCoverage === 'NONE'
    ? 'Tracked cost coverage is unavailable for today’s sales. Unavailable is not the same as zero.'
    : summary.costCoverage === 'PARTIAL'
      ? `${summary.coveredSaleCount} sale${summary.coveredSaleCount === 1 ? '' : 's'} have recorded cost coverage; ${summary.unavailableSaleCount} sale${summary.unavailableSaleCount === 1 ? '' : 's'} remain unavailable.`
      : 'Every completed sale today has an immutable recorded cost snapshot.';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text accessibilityRole="header" style={styles.title}>Today’s summary</Text>
          <Text style={styles.body}>{summary.range.localDate} · store-local day</Text>
        </View>
        <SecondaryButton title="Back" onPress={onBack} />
      </View>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Sales value (after discounts)</Text>
        <Text style={styles.cardValue}>{money(summary.salesValueMinor, summary.currencyCode)}</Text>
        <Text style={styles.cardHint}>Discounts given: {money(summary.discountsGivenMinor, summary.currencyCode)}</Text>
        <Text style={styles.cardHint}>Includes completed credit sales; this is not cash received.</Text>
      </View>
      <View style={styles.grid}>
        <View style={styles.smallCard}>
          <Text style={styles.cardLabel}>Completed sales</Text>
          <Text style={styles.smallValue}>{summary.transactionCount}</Text>
        </View>
        <View style={styles.smallCard}>
          <Text style={styles.cardLabel}>Recorded expenses</Text>
          <Text style={styles.smallValue}>{money(summary.recordedExpensesMinor, summary.currencyCode)}</Text>
        </View>
        <View style={styles.smallCard}>
          <Text style={styles.cardLabel}>Owner withdrawals</Text>
          <Text style={styles.smallValue}>{money(summary.ownerWithdrawalsMinor, summary.currencyCode)}</Text>
        </View>
      </View>
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>Tracked cost coverage</Text>
        <Text style={styles.cardHint}>{coverageBody}</Text>
        {summary.costCoverage !== 'NONE' ? (
          <>
            <Text style={styles.metric}>Tracked COGS: {money(summary.trackedCogsMinor, summary.currencyCode)}</Text>
            <Text style={styles.metric}>Tracked gross margin (covered sales only): {money(summary.trackedGrossMarginMinor, summary.currencyCode)}</Text>
            {summary.trackedGrossMarginAfterRecordedExpensesMinor !== null ? (
              <Text style={styles.metric}>Tracked gross margin after recorded expenses: {money(summary.trackedGrossMarginAfterRecordedExpensesMinor, summary.currencyCode)}</Text>
            ) : null}
          </>
        ) : null}
        <Text style={styles.cardHint}>Covered sales: {money(summary.coveredSalesValueMinor, summary.currencyCode)} · unavailable sales: {money(summary.unavailableSalesValueMinor, summary.currencyCode)}</Text>
      </View>
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>Most frequently sold today</Text>
        {summary.popularProduct ? (
          <>
            <Text style={styles.productName}>{summary.popularProduct.productName}</Text>
            <Text style={styles.cardHint}>{summary.popularProduct.saleCount} completed sale appearance{summary.popularProduct.saleCount === 1 ? '' : 's'}</Text>
          </>
        ) : <Text style={styles.cardHint}>No completed sale appearances yet.</Text>}
      </View>
      <StatusNote>This is a tracked operating summary, not a full profit and loss, net profit, or cash-balance calculation.</StatusNote>
      <PrimaryButton title="Refresh summary" onPress={refresh} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: theme.spacing(4), gap: theme.spacing(4), backgroundColor: theme.color.canvas },
  center: { flex: 1, padding: theme.spacing(4), backgroundColor: theme.color.canvas, justifyContent: 'center' },
  header: { gap: theme.spacing(3) },
  headerCopy: { gap: theme.spacing(1) },
  title: { color: theme.color.textPrimary, fontSize: theme.fontSize.header, fontWeight: '600' },
  body: { color: theme.color.textSecondary, fontSize: theme.fontSize.body, lineHeight: 24 },
  card: { backgroundColor: theme.color.raised, borderColor: theme.color.border, borderWidth: 1, borderRadius: theme.radius.card, padding: theme.spacing(4), gap: theme.spacing(2) },
  grid: { gap: theme.spacing(3) },
  smallCard: { backgroundColor: theme.color.raised, borderColor: theme.color.border, borderWidth: 1, borderRadius: theme.radius.card, padding: theme.spacing(4), gap: theme.spacing(1) },
  cardLabel: { color: theme.color.textSecondary, fontSize: theme.fontSize.small, fontWeight: '600' },
  cardValue: { color: theme.color.textPrimary, fontSize: 30, fontWeight: '700' },
  smallValue: { color: theme.color.textPrimary, fontSize: theme.fontSize.title, fontWeight: '600' },
  cardHint: { color: theme.color.textSecondary, fontSize: theme.fontSize.small, lineHeight: 20 },
  sectionTitle: { color: theme.color.textPrimary, fontSize: theme.fontSize.title, fontWeight: '600' },
  metric: { color: theme.color.textPrimary, fontSize: theme.fontSize.body, lineHeight: 24 },
  productName: { color: theme.color.textPrimary, fontSize: theme.fontSize.title, fontWeight: '600' },
});
