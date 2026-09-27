import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import type { PersonalPriceChangeRow, PersonalPriceClient, PersonalPriceOverview } from '../../priceIntelligence/client';
import { formatObservedDate, formatPercentageMagnitude } from '../../priceIntelligence/presentation';
import { ErrorPanel, SecondaryButton } from '../../ui/components';
import { displayRationalMinorAmount } from '../../ui/money';
import { theme } from '../../ui/theme';

interface PersonalPriceChangesScreenProps {
  client: PersonalPriceClient | null;
  clientFailure?: string | null;
  isFocused?: boolean;
  onOpenProduct: (storeProductId: string) => void;
  onOpenPurchaseHistory: () => void;
}

interface ListState {
  rows: PersonalPriceChangeRow[];
  overview: PersonalPriceOverview;
  failure: string | null;
}

const EMPTY_OVERVIEW: PersonalPriceOverview = { oneObservationProductCount: 0, unchangedComparisonCount: 0 };

function read(client: PersonalPriceClient | null, includeUnchanged: boolean, clientFailure?: string | null): ListState {
  if (!client) {
    return { rows: [], overview: EMPTY_OVERVIEW, failure: clientFailure ?? 'Only an active store owner can read personal purchase costs.' };
  }
  try {
    return {
      rows: client.listPriceChanges({ includeUnchanged }),
      overview: client.getOverview(),
      failure: null,
    };
  } catch {
    return { rows: [], overview: EMPTY_OVERVIEW, failure: 'Saved personal purchase costs could not be read from this device.' };
  }
}

function formatPrice(row: PersonalPriceChangeRow, basis: 'PACKAGE' | 'BASE_UNIT', which: 'latest' | 'previous'): string {
  const observation = row[which];
  return displayRationalMinorAmount(
    basis === 'PACKAGE' ? observation.packageCostNumerator : observation.baseUnitCostNumerator,
    basis === 'PACKAGE' ? observation.packageCostDenominator : observation.baseUnitCostDenominator,
    observation.currencyCode,
  ) ?? 'Unavailable';
}

function comparisonLabel(row: PersonalPriceChangeRow): string {
  const basis = row.comparison.basis === 'PACKAGE'
    ? `Per ${row.latest.packageNameSnapshot}`
    : `Per base unit across ${row.previous.packageNameSnapshot} and ${row.latest.packageNameSnapshot}`;
  const direction = row.comparison.direction === 'INCREASE'
    ? 'Increase'
    : row.comparison.direction === 'DECREASE'
      ? 'Decrease'
      : 'Unchanged';
  const percentage = formatPercentageMagnitude(row.comparison.percentageTenths);
  const change = percentage ? `${direction} · ${percentage}` : direction;
  return `${basis} · ${change}`;
}

function emptyDescription(overview: PersonalPriceOverview, includeUnchanged: boolean): string {
  const notes: string[] = [];
  if (!includeUnchanged && overview.unchangedComparisonCount > 0) {
    notes.push(`${overview.unchangedComparisonCount} comparable product${overview.unchangedComparisonCount === 1 ? ' has' : 's have'} stayed at the same recorded purchase cost. Show unchanged comparisons to review them.`);
  }
  if (overview.oneObservationProductCount > 0) {
    notes.push(`${overview.oneObservationProductCount} product${overview.oneObservationProductCount === 1 ? ' has' : 's have'} one validated restock. Record another comparable restock to see whether its purchase cost changed.`);
  }
  if (notes.length > 0) return notes.join(' ');
  return includeUnchanged
    ? 'Products appear after two validated restocks with a comparable package or base-unit cost in the same currency.'
    : 'Products appear here after a comparable recorded restock changes replacement cost. Show unchanged comparisons to review costs that stayed the same.';
}

export default function PersonalPriceChangesScreen({
  client,
  clientFailure,
  isFocused = true,
  onOpenProduct,
  onOpenPurchaseHistory,
}: PersonalPriceChangesScreenProps) {
  const [includeUnchanged, setIncludeUnchanged] = useState(false);
  const [state, setState] = useState<ListState>(() => read(client, false, clientFailure));
  const refresh = useCallback(() => {
    setState(read(client, includeUnchanged, clientFailure));
  }, [client, clientFailure, includeUnchanged]);

  useEffect(() => {
    if (isFocused) refresh();
  }, [isFocused, refresh]);

  const toggleUnchanged = (): void => {
    const next = !includeUnchanged;
    setIncludeUnchanged(next);
    setState(read(client, next, clientFailure));
  };

  const showChangesOnly = !includeUnchanged;
  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.container}
      data={state.rows}
      keyExtractor={(row) => row.storeProductId}
      ListHeaderComponent={(
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>Personal price changes</Text>
          <Text style={styles.body}>Recorded purchase and restock costs for this store. Saved locally and available offline.</Text>
          <SecondaryButton
            title={showChangesOnly ? 'Show unchanged comparisons' : 'Show changes only'}
            onPress={toggleUnchanged}
          />
          <SecondaryButton title="Refresh saved costs" onPress={refresh} />
          {state.failure ? (
            <ErrorPanel title="Personal price changes unavailable" message={state.failure} onRetry={refresh} />
          ) : state.rows.length === 0 ? (
            <View style={styles.empty}>
              <Text accessibilityRole="header" style={styles.emptyTitle}>
                {includeUnchanged ? 'No comparable purchase costs yet' : 'No purchase cost changes yet'}
              </Text>
              <Text style={styles.body}>{emptyDescription(state.overview, includeUnchanged)}</Text>
            </View>
          ) : null}
          {!state.failure && state.rows.length > 0 ? (
            <Text style={styles.body}>
              {includeUnchanged ? 'Changed and unchanged comparable products.' : 'Changed products, newest observed restock first.'}
              {' '}Select a product for its full purchase history.
            </Text>
          ) : null}
          {!state.failure && state.rows.length > 0 && state.overview.oneObservationProductCount > 0 ? (
            <Text style={styles.body}>
              {state.overview.oneObservationProductCount} other product{state.overview.oneObservationProductCount === 1 ? ' has' : 's have'} one validated restock; another comparable restock is needed for a change comparison.
            </Text>
          ) : null}
        </View>
      )}
      renderItem={({ item }) => {
        const priceChange = item.comparison.direction === 'UNCHANGED'
          ? 'Unchanged'
          : `${item.comparison.direction === 'INCREASE' ? 'Increase' : 'Decrease'}${formatPercentageMagnitude(item.comparison.percentageTenths) ? ` · ${formatPercentageMagnitude(item.comparison.percentageTenths)}` : ''}`;
        const previousLabel = item.comparison.basis === 'PACKAGE' ? item.previous.packageNameSnapshot : 'base unit';
        const latestLabel = item.comparison.basis === 'PACKAGE' ? item.latest.packageNameSnapshot : 'base unit';
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${item.latest.productNameSnapshot}. ${priceChange}. Open full purchase history.`}
            accessibilityHint="Opens product details and its saved purchase history"
            onPress={() => onOpenProduct(item.storeProductId)}
            style={styles.row}
          >
            <Text style={styles.productName}>{item.latest.productNameSnapshot}</Text>
            <Text style={styles.change}>{comparisonLabel(item)}</Text>
            <Text style={styles.detail}>
              Previous: {formatPrice(item, item.comparison.basis, 'previous')} per {previousLabel}
            </Text>
            <Text style={styles.detail}>
              Latest: {formatPrice(item, item.comparison.basis, 'latest')} per {latestLabel}
            </Text>
            <Text style={styles.detail}>Previous restock observed: {formatObservedDate(item.previous.observedAt)}</Text>
            <Text style={styles.detail}>Latest restock observed: {formatObservedDate(item.latest.observedAt)}</Text>
            <Text style={styles.detail}>Supplier: {item.latest.supplierNameSnapshot ?? 'Not recorded'}</Text>
            {item.comparison.percentageTenths === null ? (
              <Text style={styles.detail}>Percentage change is unavailable because the previous purchase cost was zero.</Text>
            ) : null}
          </Pressable>
        );
      }}
      ListFooterComponent={state.failure ? null : (
        <View style={styles.footer}>
          <Text style={styles.body}>These are your recorded purchase costs, not market prices or selling-price recommendations.</Text>
          <SecondaryButton title="Open all purchase history" onPress={onOpenPurchaseHistory} />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  container: { flexGrow: 1, padding: theme.spacing(4), gap: theme.spacing(3), backgroundColor: theme.color.canvas },
  header: { gap: theme.spacing(3), marginBottom: theme.spacing(1) },
  title: { color: theme.color.textPrimary, fontSize: theme.fontSize.title, fontWeight: '700' },
  body: { color: theme.color.textSecondary, fontSize: theme.fontSize.body, lineHeight: 24 },
  empty: { gap: theme.spacing(2), borderWidth: 1, borderColor: theme.color.border, borderRadius: theme.radius.card, padding: theme.spacing(4), backgroundColor: theme.color.raised },
  emptyTitle: { color: theme.color.textPrimary, fontSize: theme.fontSize.body, fontWeight: '700' },
  row: { gap: theme.spacing(1), padding: theme.spacing(4), borderWidth: 1, borderColor: theme.color.border, borderRadius: theme.radius.card, backgroundColor: theme.color.raised, marginBottom: theme.spacing(3), minHeight: theme.minTouchTarget },
  productName: { color: theme.color.textPrimary, fontSize: theme.fontSize.body, fontWeight: '700' },
  change: { color: theme.color.textPrimary, fontSize: theme.fontSize.body, fontWeight: '600' },
  detail: { color: theme.color.textSecondary, fontSize: theme.fontSize.small, lineHeight: 20 },
  footer: { gap: theme.spacing(3), paddingTop: theme.spacing(2) },
});
