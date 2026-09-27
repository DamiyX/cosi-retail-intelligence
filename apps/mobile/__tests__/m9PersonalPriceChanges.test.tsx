import { fireEvent, render, screen } from '@testing-library/react-native';

import { createTemporaryProduct } from '../src/catalogue/createTemporaryProduct';
import { getActiveBasePackageUnit, updateStoreProductLifecycle } from '../src/db/repositories';
import {
  createDatabasePersonalPriceClient,
  type PersonalPriceChangeRow,
  type PersonalPriceClient,
} from '../src/priceIntelligence/client';
import PersonalPriceChangesScreen from '../src/screens/products/PersonalPriceChangesScreen';
import { recordPurchase } from '../src/purchases/recordPurchase';
import { deterministicIds, openCatalogueFixture, testId } from './catalogueSupport';

function recordRestock(
  fixture: ReturnType<typeof openCatalogueFixture>,
  product: ReturnType<typeof createTemporaryProduct>,
  packageUnitId: string,
  costMinor: number,
  occurredAt: string,
  idStart: number,
): void {
  recordPurchase(fixture.adapter, {
    storeId: fixture.context.store.id,
    deviceId: fixture.context.device.id,
    userId: fixture.context.owner.id,
    occurredAt,
    lines: [{
      storeProductId: product.storeProduct.id,
      packageUnitId,
      quantityPackagesMicros: 1_000_000,
      enteredCostMinor: costMinor,
    }],
  }, { generateId: deterministicIds(idStart), operationId: testId(idStart + 1) });
}

describe('PersonalPriceChangesScreen', () => {
  it('orders changed products by latest observation, hides unchanged rows by default, and opens full history', () => {
    const fixture = openCatalogueFixture();
    const onOpenProduct = jest.fn();
    const onOpenPurchaseHistory = jest.fn();
    try {
      const rice = createTemporaryProduct(fixture.adapter, {
        storeId: fixture.context.store.id, deviceId: fixture.context.device.id, name: 'Rice',
      }, { generateId: deterministicIds(8000) });
      const beans = createTemporaryProduct(fixture.adapter, {
        storeId: fixture.context.store.id, deviceId: fixture.context.device.id, name: 'Beans',
      }, { generateId: deterministicIds(8100) });
      const flour = createTemporaryProduct(fixture.adapter, {
        storeId: fixture.context.store.id, deviceId: fixture.context.device.id, name: 'Flour',
      }, { generateId: deterministicIds(8200) });

      const riceBase = getActiveBasePackageUnit(fixture.adapter, rice.variant.id)!;
      const beansBase = getActiveBasePackageUnit(fixture.adapter, beans.variant.id)!;
      const flourBase = getActiveBasePackageUnit(fixture.adapter, flour.variant.id)!;
      recordRestock(fixture, rice, riceBase.id, 100, '2026-01-01T10:00:00.000Z', 8300);
      recordRestock(fixture, rice, riceBase.id, 150, '2026-01-03T10:00:00.000Z', 8400);
      recordRestock(fixture, beans, beansBase.id, 250, '2026-01-01T10:00:00.000Z', 8500);
      recordRestock(fixture, beans, beansBase.id, 200, '2026-01-04T10:00:00.000Z', 8600);
      recordRestock(fixture, flour, flourBase.id, 120, '2026-01-05T10:00:00.000Z', 8700);
      recordRestock(fixture, flour, flourBase.id, 120, '2026-01-06T10:00:00.000Z', 8800);
      updateStoreProductLifecycle(fixture.adapter, flour.storeProduct.id, { status: 'INACTIVE' });

      const client = createDatabasePersonalPriceClient(fixture.adapter, {
        storeId: fixture.context.store.id, userId: fixture.context.owner.id,
      });
      expect(client.listPriceChanges().map((row) => row.storeProductId)).toEqual([
        beans.storeProduct.id,
        rice.storeProduct.id,
      ]);
      render(<PersonalPriceChangesScreen
        client={client}
        isFocused={false}
        onOpenProduct={onOpenProduct}
        onOpenPurchaseHistory={onOpenPurchaseHistory}
      />);

      expect(screen.getByText('Beans')).toBeTruthy();
      expect(screen.getByText('Rice')).toBeTruthy();
      expect(screen.queryByText('Flour')).toBeNull();
      fireEvent.press(screen.getByText('Beans'));
      expect(onOpenProduct).toHaveBeenCalledWith(beans.storeProduct.id);

      fireEvent.press(screen.getByText('Show unchanged comparisons'));
      expect(screen.getByText('Flour')).toBeTruthy();
      expect(screen.getByText(/Unchanged/)).toBeTruthy();
      fireEvent.press(screen.getByText('Open all purchase history'));
      expect(onOpenPurchaseHistory).toHaveBeenCalledTimes(1);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('reports one-observation emptiness and an owner restriction clearly', () => {
    render(<PersonalPriceChangesScreen
      client={null}
      clientFailure="Only an active store owner can read personal purchase costs."
      isFocused={false}
      onOpenProduct={() => undefined}
      onOpenPurchaseHistory={() => undefined}
    />);
    expect(screen.getByText('Personal price changes unavailable')).toBeTruthy();
    expect(screen.getByText('Only an active store owner can read personal purchase costs.')).toBeTruthy();

    const secondFixture = openCatalogueFixture();
    try {
      const product = createTemporaryProduct(secondFixture.adapter, {
        storeId: secondFixture.context.store.id,
        deviceId: secondFixture.context.device.id,
        name: 'Milk',
      }, { generateId: deterministicIds(8900) });
      const base = getActiveBasePackageUnit(secondFixture.adapter, product.variant.id)!;
      recordRestock(secondFixture, product, base.id, 180, '2026-02-01T10:00:00.000Z', 9000);
      const client = createDatabasePersonalPriceClient(secondFixture.adapter, {
        storeId: secondFixture.context.store.id, userId: secondFixture.context.owner.id,
      });
      render(<PersonalPriceChangesScreen
        client={client}
        isFocused={false}
        onOpenProduct={() => undefined}
        onOpenPurchaseHistory={() => undefined}
      />);
      expect(screen.getByText('No purchase cost changes yet')).toBeTruthy();
      expect(screen.getByText(/1 product has one validated restock/)).toBeTruthy();
      fireEvent.press(screen.getByText('Show unchanged comparisons'));
      expect(screen.getByText('No comparable purchase costs yet')).toBeTruthy();
      expect(screen.getByText(/1 product has one validated restock/)).toBeTruthy();
    } finally {
      secondFixture.closeAndDelete();
    }
  });

  it('shows a recoverable error when the local read fails', () => {
    const listPriceChanges = jest.fn(() => { throw new Error('offline db read failed'); });
    const client = {
      storeId: testId(9100),
      userId: testId(9101),
      getProductPriceComparison: jest.fn(() => null),
      listPriceChanges,
    } as unknown as PersonalPriceClient;
    render(<PersonalPriceChangesScreen
      client={client}
      isFocused={false}
      onOpenProduct={() => undefined}
      onOpenPurchaseHistory={() => undefined}
    />);
    expect(screen.getByText('Personal price changes unavailable')).toBeTruthy();
    expect(screen.getByText('Saved personal purchase costs could not be read from this device.')).toBeTruthy();
    fireEvent.press(screen.getByText('Try again'));
    expect(listPriceChanges).toHaveBeenCalledTimes(2);
  });

  it('renders package and explicit base-unit comparison basis with dated supplier facts', () => {
    const row = {
      storeProductId: testId(9200),
      productVariantId: testId(9201),
      historyCount: 2,
      latest: {
        id: testId(9202), storeId: testId(9203), purchaseItemId: testId(9204), productVariantId: testId(9201),
        packageUnitId: testId(9205), supplierId: null, costBasis: 'TOTAL', enteredCostMinor: 150,
        observedPriceMinor: 150, totalPurchaseCostMinor: 150, quantityPackagesMicros: 1_000_000,
        conversionToBaseSnapshotMicros: 1_000_000, quantityBaseMicros: 1_000_000, packageCostNumerator: '150',
        packageCostDenominator: '1', baseUnitCostNumerator: '150', baseUnitCostDenominator: '1', currencyCode: 'NGN',
        sourceType: 'RETAILER_PURCHASE', sourceId: testId(9206), validationStatus: 'VALID', contributionConsent: false,
        observedAt: '2026-01-02T10:00:00.000Z', createdAt: '2026-01-02T10:00:00.000Z', storeProductId: testId(9200),
        purchaseId: testId(9207), occurredAt: '2026-01-02T10:00:00.000Z', productNameSnapshot: 'Yam',
        packageNameSnapshot: 'bag', supplierNameSnapshot: 'Market supplier', currentCostCoverageStatus: 'KNOWN',
        currentCostQuantityCostedBaseMicros: 1_000_000, currentCostAverageUnitCostNumerator: '150', currentCostAverageUnitCostDenominator: '1',
      },
      previous: {
        id: testId(9208), storeId: testId(9203), purchaseItemId: testId(9209), productVariantId: testId(9201),
        packageUnitId: testId(9210), supplierId: null, costBasis: 'TOTAL', enteredCostMinor: 100,
        observedPriceMinor: 100, totalPurchaseCostMinor: 100, quantityPackagesMicros: 1_000_000,
        conversionToBaseSnapshotMicros: 10_000_000, quantityBaseMicros: 10_000_000, packageCostNumerator: '100',
        packageCostDenominator: '1', baseUnitCostNumerator: '10', baseUnitCostDenominator: '1', currencyCode: 'NGN',
        sourceType: 'RETAILER_PURCHASE', sourceId: testId(9211), validationStatus: 'VALID', contributionConsent: false,
        observedAt: '2026-01-01T10:00:00.000Z', createdAt: '2026-01-01T10:00:00.000Z', storeProductId: testId(9200),
        purchaseId: testId(9212), occurredAt: '2026-01-01T10:00:00.000Z', productNameSnapshot: 'Yam',
        packageNameSnapshot: 'carton', supplierNameSnapshot: 'Old supplier', currentCostCoverageStatus: 'KNOWN',
        currentCostQuantityCostedBaseMicros: 10_000_000, currentCostAverageUnitCostNumerator: '10', currentCostAverageUnitCostDenominator: '1',
      },
      comparison: { kind: 'comparison', latestId: testId(9202), previousId: testId(9208), basis: 'BASE_UNIT', direction: 'INCREASE', percentageTenths: '500' },
    } as unknown as PersonalPriceChangeRow;
    const client = {
      storeId: testId(9213), userId: testId(9214),
      getProductPriceComparison: jest.fn(() => null),
      listPriceChanges: jest.fn(() => [row]),
      getOverview: jest.fn(() => ({ oneObservationProductCount: 0, unchangedComparisonCount: 0 })),
    } as unknown as PersonalPriceClient;
    render(<PersonalPriceChangesScreen
      client={client}
      isFocused={false}
      onOpenProduct={() => undefined}
      onOpenPurchaseHistory={() => undefined}
    />);
    expect(screen.getByText('Per base unit across carton and bag · Increase · 50.0%')).toBeTruthy();
    expect(screen.getByText('Previous: ₦0.10 per base unit')).toBeTruthy();
    expect(screen.getByText('Latest: ₦1.50 per base unit')).toBeTruthy();
    expect(screen.getByText('Supplier: Market supplier')).toBeTruthy();
  });
});
