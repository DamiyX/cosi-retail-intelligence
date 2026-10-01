import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { AttentionOverview } from '../src/inventory/attention';
import type { InventoryClient } from '../src/inventory/client';
import type { BusinessSummary, FinanceClient } from '../src/finance';
import HomeScreen from '../src/screens/home/HomeScreen';

function summary(): BusinessSummary {
  return {
    currencyCode: 'NGN',
    range: { localDate: '2026-09-18', startUtc: '2026-09-17T23:00:00.000Z', endUtc: '2026-09-18T23:00:00.000Z' },
    salesValueMinor: 250000,
    discountsGivenMinor: 500,
    transactionCount: 4,
    recordedExpensesMinor: 5000,
    ownerWithdrawalsMinor: 2500,
    costCoverage: 'PARTIAL',
    coveredSaleCount: 3,
    coveredSalesValueMinor: 200000,
    unavailableSaleCount: 1,
    unavailableSalesValueMinor: 50000,
    trackedCogsMinor: 100000,
    trackedGrossMarginMinor: 100000,
    trackedGrossMarginAfterRecordedExpensesMinor: null,
    popularProduct: { storeProductId: '00000000-0000-4000-8000-000000000001', productName: 'Rice', saleCount: 3 },
  };
}

function attention(): AttentionOverview {
  return {
    localDate: '2026-09-18',
    localMinute: 600,
    settings: {
      storeId: '00000000-0000-4000-8000-000000000010',
      expiryLeadDays: 30,
      policyVersion: 'M5-ATTENTION-1',
      version: 1,
      updatedByStoreMemberId: null,
      updatedByUserId: null,
      updatedByDeviceId: null,
      updatedAt: null,
    },
    items: [{
      id: '00000000-0000-4000-8000-000000000011',
      conditionKey: 'stock:rice',
      conditionType: 'STOCK',
      kind: 'LOW_STOCK',
      severity: 'LOW',
      severityRank: 1,
      storeProductId: '00000000-0000-4000-8000-000000000001',
      productName: 'Rice',
      groupId: null,
      balanceBaseMicros: '2',
      title: 'Rice: low recorded stock',
      detail: 'Recorded balance is below the reorder threshold.',
      primaryAction: 'RESTOCK',
      primaryActionLabel: 'Restock product',
    }],
    allConditionCount: 1,
    suppressedCount: 0,
  };
}

describe('HomeScreen', () => {
  it('shows live summary facts, one real attention preview, and the approved next actions', () => {
    const getBusinessSummary = jest.fn(() => summary());
    const getAttentionOverview = jest.fn(() => attention());
    const financeClient = { storeName: 'Funke Provisions', getBusinessSummary } as unknown as FinanceClient;
    const inventoryClient = { getAttentionOverview } as unknown as InventoryClient;
    const onSell = jest.fn();
    const onRestock = jest.fn();
    const onStockChecks = jest.fn();
    const onRecordExpense = jest.fn();
    const onOpenSummary = jest.fn();
    const onSeeAttention = jest.fn();

    render(<HomeScreen
      financeClient={financeClient}
      inventoryClient={inventoryClient}
      isFocused={false}
      onSell={onSell}
      onRestock={onRestock}
      onStockChecks={onStockChecks}
      onRecordExpense={onRecordExpense}
      onOpenSummary={onOpenSummary}
      onSeeAttention={onSeeAttention}
    />);

    expect(screen.getByText('Home')).toBeTruthy();
    expect(screen.getByText('₦2,500.00')).toBeTruthy();
    expect(screen.getByText('Sales value (after discounts)')).toBeTruthy();
    expect(screen.getByText('Discounts given: ₦5.00')).toBeTruthy();
    expect(screen.getByText('₦50.00')).toBeTruthy();
    expect(screen.getByText('Most frequently sold today')).toBeTruthy();
    expect(screen.getByText('Rice · 3 completed sale appearances')).toBeTruthy();
    expect(screen.getByText('Rice: low recorded stock')).toBeTruthy();
    expect(screen.getAllByText('Rice: low recorded stock')).toHaveLength(1);
    expect(screen.getByText('1 current condition')).toBeTruthy();
    expect(screen.queryByText('Reports')).toBeNull();
    expect(screen.queryByText('Scan')).toBeNull();

    fireEvent.press(screen.getByText('Sell'));
    fireEvent.press(screen.getByText('Restock'));
    fireEvent.press(screen.getByText('Stock checks'));
    fireEvent.press(screen.getByText('Record expense'));
    fireEvent.press(screen.getByText('Open today’s summary'));
    fireEvent.press(screen.getByText('See all attention'));
    expect(onSell).toHaveBeenCalledTimes(1);
    expect(onRestock).toHaveBeenCalledTimes(1);
    expect(onStockChecks).toHaveBeenCalledTimes(1);
    expect(onRecordExpense).toHaveBeenCalledTimes(1);
    expect(onOpenSummary).toHaveBeenCalledTimes(1);
    expect(onSeeAttention).toHaveBeenCalledTimes(1);
  });

  it('refreshes summary and attention when the focused view returns', async () => {
    let currentSummary = summary();
    const getBusinessSummary = jest.fn(() => currentSummary);
    const getAttentionOverview = jest.fn(() => attention());
    const financeClient = { storeName: 'Funke Provisions', getBusinessSummary } as unknown as FinanceClient;
    const inventoryClient = { getAttentionOverview } as unknown as InventoryClient;
    const view = render(<HomeScreen
      financeClient={financeClient}
      inventoryClient={inventoryClient}
      isFocused={false}
      onSell={() => undefined}
      onRestock={() => undefined}
      onStockChecks={() => undefined}
      onRecordExpense={() => undefined}
      onOpenSummary={() => undefined}
      onSeeAttention={() => undefined}
    />);
    currentSummary = { ...currentSummary, salesValueMinor: 300000, discountsGivenMinor: 1000 };
    view.rerender(<HomeScreen
      financeClient={financeClient}
      inventoryClient={inventoryClient}
      isFocused
      onSell={() => undefined}
      onRestock={() => undefined}
      onStockChecks={() => undefined}
      onRecordExpense={() => undefined}
      onOpenSummary={() => undefined}
      onSeeAttention={() => undefined}
    />);
    await waitFor(() => expect(screen.getByText('₦3,000.00')).toBeTruthy());
    expect(screen.getByText('Discounts given: ₦10.00')).toBeTruthy();
    expect(getBusinessSummary).toHaveBeenCalled();
    expect(getAttentionOverview).toHaveBeenCalled();
  });
});
