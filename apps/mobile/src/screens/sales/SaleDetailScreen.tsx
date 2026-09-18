import { formatQuantityMicros } from '@retail/domain';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { SalesClient } from '../../sales/client';
import type { SaleDetail } from '../../sales/index';
import { saleSyncStatusLabel } from '../../sales/syncStatus';
import { ErrorPanel, SecondaryButton, StatusNote } from '../../ui/components';
import { displayMoney } from '../../ui/money';
import { theme } from '../../ui/theme';

interface SaleDetailScreenProps {
  client: SalesClient;
  saleId: string;
  onBack: () => void;
}

interface DetailState {
  detail: SaleDetail | null;
  failure: string | null;
}

function loadDetail(client: SalesClient, saleId: string): DetailState {
  try {
    const detail = client.getSaleDetail(saleId);
    if (!detail) {
      return { detail: null, failure: 'Sale not found on this device.' };
    }
    return { detail, failure: null };
  } catch (error) {
    return {
      detail: null,
      failure: error instanceof Error ? error.message : 'Unknown failure reading sale details.',
    };
  }
}

function paymentMethodLabel(method: string): string {
  switch (method) {
    case 'CASH':
      return 'Cash';
    case 'BANK_TRANSFER':
      return 'Bank Transfer';
    case 'POS_CARD':
      return 'POS / Card';
    case 'CREDIT':
      return 'Credit';
    default:
      return method;
  }
}

function formatSignedQuantityMicros(value: number): string {
  const sign = value < 0 ? '-' : '';
  return `${sign}${formatQuantityMicros(Math.abs(value))}`;
}

export default function SaleDetailScreen({ client, saleId, onBack }: SaleDetailScreenProps) {
  const [state, setState] = useState<DetailState>(() => loadDetail(client, saleId));

  if (state.failure !== null || !state.detail) {
    return (
      <View style={styles.container}>
        <ErrorPanel
          title="Sale details unavailable"
          message={
            state.failure ??
            'The sale details could not be read from this device. Your sales records are preserved locally.'
          }
          onRetry={() => setState(loadDetail(client, saleId))}
          onDismiss={onBack}
        />
      </View>
    );
  }

  const {
    sale,
    items,
    costSnapshots,
    payment,
    customerAccount,
    receivable,
    syncStatus,
    inventoryEffects,
    inventoryReadFailure,
  } = state.detail;
  const inventoryBySaleItemId = new Map(inventoryEffects.map((effect) => [effect.saleItemId, effect]));
  const costBySaleItemId = new Map(costSnapshots.map((snapshot) => [snapshot.saleItemId, snapshot]));
  const totalDisplay = displayMoney(sale.totalMinor, sale.currencyCode) ?? '0.00';
  const subtotalDisplay = displayMoney(sale.subtotalMinor, sale.currencyCode) ?? '0.00';
  const discountDisplay =
    sale.discountTotalMinor > 0 ? displayMoney(sale.discountTotalMinor, sale.currencyCode) : null;

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.headerRow}>
        <Text accessibilityRole="header" style={styles.title}>
          Sale details
        </Text>
        <StatusNote>{saleSyncStatusLabel(syncStatus)}</StatusNote>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardSectionLabel}>Total</Text>
        <Text accessibilityLabel={`Total: ${totalDisplay}`} style={styles.totalText}>
          {totalDisplay}
        </Text>
        <View style={styles.summaryRow}>
          <Text style={styles.metaLabel}>Subtotal</Text>
          <Text style={styles.metaValue}>{subtotalDisplay}</Text>
        </View>
        {discountDisplay ? (
          <View style={styles.summaryRow}>
            <Text style={styles.metaLabel}>Discount</Text>
            <Text style={styles.discountValue}>- {discountDisplay}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardSectionLabel}>Payment</Text>
        <Text style={styles.cardHeading}>{paymentMethodLabel(payment.method)}</Text>
        {payment.method === 'CREDIT' ? (
          <View style={styles.creditInfo}>
            <Text style={styles.metaLabel}>Customer</Text>
            <Text style={styles.cardValue}>{customerAccount?.name ?? 'Credit Customer'}</Text>
            {receivable ? (
              <View style={styles.receivableBadge}>
                <Text style={styles.receivableStatus}>
                  Status: {receivable.status} · {displayMoney(receivable.outstandingAmountMinor, sale.currencyCode)} owed
                </Text>
              </View>
            ) : null}
            <Text style={styles.creditWarning}>
              Recorded as an amount owed. Credit is not reported as cash received.
            </Text>
          </View>
        ) : (
          <Text style={styles.metaValue}>
            {displayMoney(payment.amountMinor, sale.currencyCode)} received
          </Text>
        )}
        {payment.paymentReference ? (
          <View style={styles.summaryRow}>
            <Text style={styles.metaLabel}>Reference</Text>
            <Text style={styles.metaValue}>{payment.paymentReference}</Text>
          </View>
        ) : null}
      </View>

      {sale.note ? (
        <View style={styles.card}>
          <Text style={styles.cardSectionLabel}>Note</Text>
          <Text style={styles.cardValue}>{sale.note}</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardSectionLabel}>Items ({items.length})</Text>
        {items.map((item) => {
          const itemTotal = displayMoney(item.netTotalMinor, sale.currencyCode);
          const unitPrice = displayMoney(item.unitPriceMinor, sale.currencyCode);
          const itemDiscount =
            item.discountAmountMinor > 0 ? displayMoney(item.discountAmountMinor, sale.currencyCode) : null;
          const qty = formatQuantityMicros(item.quantityPackagesMicros);
          const inventoryEffect = inventoryBySaleItemId.get(item.id);
          const costSnapshot = costBySaleItemId.get(item.id);
          const currentBalance = inventoryEffect?.currentDerivedBalanceBaseMicros ?? null;

          return (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.itemMain}>
                <Text style={styles.itemName}>{item.productNameSnapshot}</Text>
                <Text style={styles.itemSub}>
                  {qty} {item.packageNameSnapshot} @ {unitPrice}
                </Text>
                {itemDiscount ? (
                  <Text style={styles.discountValue}>Discount: - {itemDiscount}</Text>
                ) : null}
                {costSnapshot?.coverageStatus === 'AVAILABLE' ? (
                  <Text style={styles.itemSub}>
                    Estimated cost: {displayMoney(costSnapshot.cogsAmountMinor, sale.currencyCode)}
                  </Text>
                ) : costSnapshot ? (
                  <Text style={styles.inventoryUnavailable}>Cost unavailable for this sale line</Text>
                ) : null}
                {inventoryEffect ? (
                  <View style={styles.inventoryEffect}>
                    <Text style={styles.itemSub}>
                      Historical sale inventory effect: {formatSignedQuantityMicros(
                        inventoryEffect.historicalSaleDeltaBaseMicros,
                      )}{' '}
                      base units
                    </Text>
                    {currentBalance !== null ? (
                      <Text
                        accessibilityLabel={`Current derived stock: ${formatSignedQuantityMicros(currentBalance)} base units${
                          currentBalance < 0 ? ', reconciliation needed' : ''
                        }`}
                        style={currentBalance < 0 ? styles.negativeStock : styles.itemSub}
                      >
                        Current derived stock: {formatSignedQuantityMicros(currentBalance)} base units
                        {currentBalance < 0 ? ' · Reconciliation needed' : ''}
                      </Text>
                    ) : (
                      <Text style={styles.inventoryUnavailable}>Current derived stock unavailable</Text>
                    )}
                  </View>
                ) : null}
              </View>
              <Text style={styles.itemTotal}>{itemTotal}</Text>
            </View>
          );
        })}
      </View>

      {inventoryReadFailure ? (
        <View style={styles.inventoryReadWarning}>
          <Text accessibilityRole="alert" style={styles.inventoryUnavailable}>
            Current stock could not be read
          </Text>
          <Text style={styles.itemSub}>
            The historical sale inventory effect above remains saved. Retry to refresh the current derived balance.
          </Text>
          <SecondaryButton title="Retry inventory balance" onPress={() => setState(loadDetail(client, saleId))} />
        </View>
      ) : null}

      <View style={styles.metaSection}>
        <Text style={styles.metaLine}>
          Occurred: {new Date(sale.occurredAt).toLocaleString()}
        </Text>
        <Text style={styles.metaLine}>Sale ID: {sale.id}</Text>
        <Text style={styles.metaLine}>
          Historical snapshot: Product details and prices are preserved from time of sale.
        </Text>
      </View>

      <View style={styles.actions}>
        <SecondaryButton title="Back to sales" onPress={onBack} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: theme.spacing(4),
    gap: theme.spacing(3),
    backgroundColor: theme.color.canvas,
  },
  headerRow: { gap: theme.spacing(1) },
  title: { color: theme.color.textPrimary, fontSize: theme.fontSize.header, fontWeight: '600' },
  card: {
    backgroundColor: theme.color.raised,
    borderColor: theme.color.border,
    borderWidth: 1,
    borderRadius: theme.radius.card,
    padding: theme.spacing(4),
    gap: theme.spacing(2),
  },
  cardSectionLabel: {
    color: theme.color.textSecondary,
    fontSize: theme.fontSize.small,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  cardHeading: {
    color: theme.color.textPrimary,
    fontSize: theme.fontSize.title,
    fontWeight: '700',
  },
  cardValue: {
    color: theme.color.textPrimary,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
  },
  totalText: {
    color: theme.color.actionPrimary,
    fontSize: 32,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing(1),
  },
  metaLabel: { color: theme.color.textSecondary, fontSize: theme.fontSize.body },
  metaValue: { color: theme.color.textPrimary, fontSize: theme.fontSize.body, fontWeight: '600' },
  discountValue: { color: theme.color.statusDanger, fontSize: theme.fontSize.body, fontWeight: '600' },
  creditInfo: { gap: theme.spacing(1), marginTop: theme.spacing(1) },
  receivableBadge: {
    backgroundColor: theme.color.canvas,
    padding: theme.spacing(2),
    borderRadius: theme.radius.field,
    marginTop: theme.spacing(1),
  },
  receivableStatus: {
    color: theme.color.statusWarning,
    fontSize: theme.fontSize.small,
    fontWeight: '600',
  },
  creditWarning: {
    color: theme.color.textSecondary,
    fontSize: theme.fontSize.small,
    fontStyle: 'italic',
    marginTop: theme.spacing(1),
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: theme.color.canvas,
  },
  itemMain: { flex: 1, gap: theme.spacing(1) },
  itemName: { color: theme.color.textPrimary, fontSize: theme.fontSize.body, fontWeight: '600' },
  itemSub: { color: theme.color.textSecondary, fontSize: theme.fontSize.small },
  itemTotal: { color: theme.color.textPrimary, fontSize: theme.fontSize.body, fontWeight: '700' },
  inventoryEffect: { gap: theme.spacing(1), marginTop: theme.spacing(1) },
  negativeStock: { color: theme.color.statusWarning, fontSize: theme.fontSize.small, fontWeight: '700' },
  inventoryUnavailable: { color: theme.color.statusWarning, fontSize: theme.fontSize.small, fontWeight: '600' },
  inventoryReadWarning: {
    backgroundColor: theme.color.raised,
    borderColor: theme.color.statusWarning,
    borderWidth: 1,
    borderRadius: theme.radius.card,
    padding: theme.spacing(3),
    gap: theme.spacing(2),
  },
  metaSection: { gap: theme.spacing(1), paddingVertical: theme.spacing(2) },
  metaLine: { color: theme.color.textSecondary, fontSize: theme.fontSize.small },
  actions: { paddingVertical: theme.spacing(2) },
});
