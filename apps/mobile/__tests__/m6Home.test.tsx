import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { AttentionOverview } from '../src/inventory/attention';
import type { InventoryClient } from '../src/inventory/client';
import type { BusinessSummary, FinanceClient } from '../src/finance';
import type { PersonalPriceChangeRow, PersonalPriceClient } from '../src/priceIntelligence/client';
import HomeScreen from '../src/screens/home/HomeScreen';

function summary(): BusinessSummary {
  return {
    currencyCode: 'NGN',
    range: { localDate: '2026-09-18', startUtc: '2026-09-17T23:00:00.000Z', endUtc: '2026-09-18T23:00:00.000Z' },
    salesValueMinor: 250000,
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

function priceChange(index: number): PersonalPriceChangeRow {
  const id = `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
  const observation = {
    id,
    storeId: '00000000-0000-4000-8000-000000000010',
    purchaseItemId: id,
    productVariantId: id,
    packageUnitId: id,
    supplierId: null,
    costBasis: 'TOTAL' as const,
    enteredCostMinor: 100,
    observedPriceMinor: 100,
    totalPurchaseCostMinor: 100,
    quantityPackagesMicros: 1_000_000,
    conversionToBaseSnapshotMicros: 1_000_000,
    quantityBaseMicros: 1_000_000,
    packageCostNumerator: '100',
    packageCostDenominator: '1',
    baseUnitCostNumerator: '100',
    baseUnitCostDenominator: '1',
    currencyCode: 'NGN',
    sourceType: 'RETAILER_PURCHASE' as const,
    sourceId: id,
    validationStatus: 'VALID' as const,
    contributionConsent: false,
    observedAt: `2026-09-${String(20 - index).padStart(2, '0')}T10:00:00.000Z`,
    createdAt: `2026-09-${String(20 - index).padStart(2, '0')}T10:00:00.000Z`,
    storeProductId: id,
    purchaseId: id,
    occurredAt: `2026-09-${String(20 - index).padStart(2, '0')}T10:00:00.000Z`,
    productNameSnapshot: `Price product ${index}`,
    packageNameSnapshot: 'bag',
    supplierNameSnapshot: 'Local supplier',
    currentCostCoverageStatus: 'KNOWN' as const,
    currentCostQuantityCostedBaseMicros: 1_000_000,
    currentCostAverageUnitCostNumerator: '100',
    currentCostAverageUnitCostDenominator: '1',
  };
  return {
    storeProductId: id,
    productVariantId: id,
    historyCount: 2,
    previous: { ...observation, id: `${id}-previous`, packageCostNumerator: '80', baseUnitCostNumerator: '80' },
    latest: observation,
    comparison: {
      kind: 'comparison',
      latestId: id,
      previousId: `${id}-previous`,
      basis: 'PACKAGE',
      direction: 'INCREASE',
      percentageTenths: '250',
    },
  };
}

function personalPriceClient(rows: PersonalPriceChangeRow[]): PersonalPriceClient {
  return {
    storeId: '00000000-0000-4000-8000-000000000010',
    userId: '00000000-0000-4000-8000-000000000099',
    getProductPriceComparison: () => null,
    listPriceChanges: jest.fn(() => rows),
    getOverview: () => ({ oneObservationProductCount: 0, unchangedComparisonCount: 0 }),
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
    const onSeePriceChanges = jest.fn();
    const onOpenPriceProduct = jest.fn();
    const priceClient = personalPriceClient([priceChange(1), priceChange(2), priceChange(3), priceChange(4)]);

    render(<HomeScreen
      financeClient={financeClient}
      inventoryClient={inventoryClient}
      personalPriceClient={priceClient}
      isFocused={false}
      onSell={onSell}
      onRestock={onRestock}
      onStockChecks={onStockChecks}
      onRecordExpense={onRecordExpense}
      onOpenSummary={onOpenSummary}
      onSeeAttention={onSeeAttention}
      onSeePriceChanges={onSeePriceChanges}
      onOpenPriceProduct={onOpenPriceProduct}
    />);

    expect(screen.getByText('Home')).toBeTruthy();
    expect(screen.getByText('₦2,500.00')).toBeTruthy();
    expect(screen.getByText('₦50.00')).toBeTruthy();
    expect(screen.getByText('Most frequently sold today')).toBeTruthy();
    expect(screen.getByText('Rice · 3 completed sale appearances')).toBeTruthy();
    expect(screen.getByText('Rice: low recorded stock')).toBeTruthy();
    expect(screen.getAllByText('Rice: low recorded stock')).toHaveLength(1);
    expect(screen.getByText('1 current condition')).toBeTruthy();
    expect(screen.queryByText('Reports')).toBeNull();
    expect(screen.queryByText('Scan')).toBeNull();
    expect(screen.getByText('Purchase cost changes')).toBeTruthy();
    expect(screen.getByText('Price product 1')).toBeTruthy();
    expect(screen.getByLabelText(/Price product 1/)).toBeTruthy();
    expect(screen.getByText('Price product 2')).toBeTruthy();
    expect(screen.getByText('Price product 3')).toBeTruthy();
    expect(screen.queryByText('Price product 4')).toBeNull();

    fireEvent.press(screen.getByText('Price product 1'));
    fireEvent.press(screen.getByText('See all price changes'));
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
    expect(onSeePriceChanges).toHaveBeenCalledTimes(1);
    expect(onOpenPriceProduct).toHaveBeenCalledWith(priceChange(1).storeProductId);
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
      personalPriceClient={personalPriceClient([])}
      isFocused={false}
      onSell={() => undefined}
      onRestock={() => undefined}
      onStockChecks={() => undefined}
      onRecordExpense={() => undefined}
      onOpenSummary={() => undefined}
      onSeeAttention={() => undefined}
      onSeePriceChanges={() => undefined}
      onOpenPriceProduct={() => undefined}
    />);
    currentSummary = { ...currentSummary, salesValueMinor: 300000 };
    view.rerender(<HomeScreen
      financeClient={financeClient}
      inventoryClient={inventoryClient}
      personalPriceClient={personalPriceClient([])}
      isFocused
      onSell={() => undefined}
      onRestock={() => undefined}
      onStockChecks={() => undefined}
      onRecordExpense={() => undefined}
      onOpenSummary={() => undefined}
      onSeeAttention={() => undefined}
      onSeePriceChanges={() => undefined}
      onOpenPriceProduct={() => undefined}
    />);
    await waitFor(() => expect(screen.getByText('₦3,000.00')).toBeTruthy());
    expect(getBusinessSummary).toHaveBeenCalled();
    expect(getAttentionOverview).toHaveBeenCalled();
  });

  it('refreshes local price changes when Home regains focus after a restock', async () => {
    let currentChanges: PersonalPriceChangeRow[] = [];
    const priceClient = {
      storeId: '00000000-0000-4000-8000-000000000010',
      userId: '00000000-0000-4000-8000-000000000099',
      getProductPriceComparison: () => null,
      listPriceChanges: jest.fn(() => currentChanges),
      getOverview: () => ({ oneObservationProductCount: 0, unchangedComparisonCount: 0 }),
    } satisfies PersonalPriceClient;
    const financeClient = { storeName: 'Funke Provisions', getBusinessSummary: jest.fn(() => summary()) } as unknown as FinanceClient;
    const inventoryClient = { getAttentionOverview: jest.fn(() => attention()) } as unknown as InventoryClient;
    const view = render(<HomeScreen
      financeClient={financeClient}
      inventoryClient={inventoryClient}
      personalPriceClient={priceClient}
      isFocused={false}
      onSell={() => undefined}
      onRestock={() => undefined}
      onStockChecks={() => undefined}
      onRecordExpense={() => undefined}
      onOpenSummary={() => undefined}
      onSeeAttention={() => undefined}
      onSeePriceChanges={() => undefined}
      onOpenPriceProduct={() => undefined}
    />);
    currentChanges = [priceChange(5)];
    view.rerender(<HomeScreen
      financeClient={financeClient}
      inventoryClient={inventoryClient}
      personalPriceClient={priceClient}
      isFocused
      onSell={() => undefined}
      onRestock={() => undefined}
      onStockChecks={() => undefined}
      onRecordExpense={() => undefined}
      onOpenSummary={() => undefined}
      onSeeAttention={() => undefined}
      onSeePriceChanges={() => undefined}
      onOpenPriceProduct={() => undefined}
    />);
    await waitFor(() => expect(screen.getByText('Price product 5')).toBeTruthy());
    expect(priceClient.listPriceChanges).toHaveBeenCalledTimes(2);
  });

  it('shows a retryable local-read error without mixing price changes into inventory attention', () => {
    const listPriceChanges = jest.fn(() => { throw new Error('local read failed'); });
    const priceClient = {
      storeId: '00000000-0000-4000-8000-000000000010',
      userId: '00000000-0000-4000-8000-000000000099',
      getProductPriceComparison: () => null,
      listPriceChanges,
      getOverview: () => ({ oneObservationProductCount: 0, unchangedComparisonCount: 0 }),
    } satisfies PersonalPriceClient;
    const financeClient = { storeName: 'Funke Provisions', getBusinessSummary: jest.fn(() => summary()) } as unknown as FinanceClient;
    const inventoryClient = { getAttentionOverview: jest.fn(() => attention()) } as unknown as InventoryClient;
    render(<HomeScreen
      financeClient={financeClient}
      inventoryClient={inventoryClient}
      personalPriceClient={priceClient}
      isFocused={false}
      onSell={() => undefined}
      onRestock={() => undefined}
      onStockChecks={() => undefined}
      onRecordExpense={() => undefined}
      onOpenSummary={() => undefined}
      onSeeAttention={() => undefined}
      onSeePriceChanges={() => undefined}
      onOpenPriceProduct={() => undefined}
    />);
    expect(screen.getByText('Purchase cost changes unavailable')).toBeTruthy();
    expect(screen.getByText('Rice: low recorded stock')).toBeTruthy();
    fireEvent.press(screen.getByText('Try again'));
    expect(listPriceChanges).toHaveBeenCalledTimes(2);
  });
});
