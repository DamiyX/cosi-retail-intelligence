import { fireEvent, render, screen } from '@testing-library/react-native';
import { MICROS_PER_UNIT } from '@retail/domain';

import { createCatalogueClient } from '../src/catalogue/client';
import { createTemporaryProduct } from '../src/catalogue/createTemporaryProduct';
import { getActiveBasePackageUnit } from '../src/db/repositories';
import { createDatabasePersonalPriceClient, type PersonalPriceClient } from '../src/priceIntelligence/client';
import { recordPurchase } from '../src/purchases/recordPurchase';
import ProductDetailScreen from '../src/screens/products/ProductDetailScreen';
import { deterministicIds, openCatalogueFixture, testId } from './catalogueSupport';

function renderProductDetail(costs: number[]) {
  const fixture = openCatalogueFixture();
  const product = createTemporaryProduct(
    fixture.adapter,
    { storeId: fixture.context.store.id, deviceId: fixture.context.device.id, name: 'Rice' },
    { generateId: deterministicIds(5000) },
  );
  const base = getActiveBasePackageUnit(fixture.adapter, product.variant.id)!;
  costs.forEach((costMinor, index) => {
    recordPurchase(fixture.adapter, {
      storeId: fixture.context.store.id,
      deviceId: fixture.context.device.id,
      userId: fixture.context.owner.id,
      occurredAt: `2026-04-0${index + 1}T10:00:00.000Z`,
      lines: [{
        storeProductId: product.storeProduct.id,
        packageUnitId: base.id,
        quantityPackagesMicros: MICROS_PER_UNIT,
        enteredCostMinor: costMinor,
      }],
    }, { generateId: deterministicIds(5100 + index * 100), operationId: testId(5101 + index * 100) });
  });
  const catalogueClient = createCatalogueClient(fixture.adapter, fixture.context.store, fixture.context.device);
  const priceClient = createDatabasePersonalPriceClient(fixture.adapter, {
    storeId: fixture.context.store.id,
    userId: fixture.context.owner.id,
  });
  return { fixture, product, catalogueClient, priceClient };
}

describe('M9 product detail purchase cost comparison', () => {
  it('explains when no purchase cost observation exists yet', () => {
    const empty = renderProductDetail([]);
    try {
      render(<ProductDetailScreen
        client={empty.catalogueClient}
        priceClient={empty.priceClient}
        productId={empty.product.storeProduct.id}
        onBack={() => undefined}
        onAddPackage={() => undefined}
        onEditPackage={() => undefined}
      />);
      expect(screen.getByText('No purchase cost observations are recorded yet. Complete a restock to save the first one.')).toBeTruthy();
    } finally {
      empty.fixture.closeAndDelete();
    }
  });

  it('shows exact same-package direction, dates, latest supplier state, and keeps raw history', () => {
    const context = renderProductDetail([100, 150]);
    try {
      render(<ProductDetailScreen
        client={context.catalogueClient}
        priceClient={context.priceClient}
        productId={context.product.storeProduct.id}
        onBack={() => undefined}
        onAddPackage={() => undefined}
        onEditPackage={() => undefined}
      />);

      expect(screen.getByText('Purchase cost change')).toBeTruthy();
      expect(screen.getByText('Basis: Per piece')).toBeTruthy();
      expect(screen.getByText('Previous: ₦1.00 per piece')).toBeTruthy();
      expect(screen.getByText('Latest: ₦1.50 per piece')).toBeTruthy();
      expect(screen.getByText('Increase · 50.0%')).toBeTruthy();
      expect(screen.getByText('Latest supplier: Not recorded')).toBeTruthy();
      expect(screen.getByText('Purchase price history')).toBeTruthy();
      expect(screen.getAllByText(/Observed: .* · Contribution: off/)).toHaveLength(2);
    } finally {
      context.fixture.closeAndDelete();
    }
  });

  it('explains the one-observation state and a zero previous cost without inventing a percentage', () => {
    const single = renderProductDetail([100]);
    try {
      render(<ProductDetailScreen
        client={single.catalogueClient}
        priceClient={single.priceClient}
        productId={single.product.storeProduct.id}
        onBack={() => undefined}
        onAddPackage={() => undefined}
        onEditPackage={() => undefined}
      />);
      expect(screen.getByText('One validated restock is recorded. Record another comparable restock to see whether its purchase cost changed.')).toBeTruthy();
    } finally {
      single.fixture.closeAndDelete();
    }

    const fromZero = renderProductDetail([0, 200]);
    try {
      render(<ProductDetailScreen
        client={fromZero.catalogueClient}
        priceClient={fromZero.priceClient}
        productId={fromZero.product.storeProduct.id}
        onBack={() => undefined}
        onAddPackage={() => undefined}
        onEditPackage={() => undefined}
      />);
      expect(screen.getByText('Increase')).toBeTruthy();
      expect(screen.getByText('Percentage change is unavailable because the previous purchase cost was zero.')).toBeTruthy();
      expect(screen.queryByText(/Infinity|NaN/)).toBeNull();
    } finally {
      fromZero.fixture.closeAndDelete();
    }
  });

  it('keeps the comparison recoverable when the local read fails', () => {
    const context = renderProductDetail([100]);
    const getProductPriceComparison = jest.fn(() => { throw new Error('SQLite unavailable.'); });
    const priceClient = {
      storeId: context.fixture.context.store.id,
      userId: context.fixture.context.owner.id,
      getProductPriceComparison,
      listPriceChanges: jest.fn(() => []),
    } as unknown as PersonalPriceClient;
    try {
      render(<ProductDetailScreen
        client={context.catalogueClient}
        priceClient={priceClient}
        productId={context.product.storeProduct.id}
        onBack={() => undefined}
        onAddPackage={() => undefined}
        onEditPackage={() => undefined}
      />);
      expect(screen.getByText('Purchase cost change unavailable')).toBeTruthy();
      fireEvent.press(screen.getByText('Try again'));
      expect(getProductPriceComparison).toHaveBeenCalledTimes(2);
    } finally {
      context.fixture.closeAndDelete();
    }
  });

  it('shows an explicit owner boundary message when no authorized price client is available', () => {
    const context = renderProductDetail([]);
    try {
      render(<ProductDetailScreen
        client={context.catalogueClient}
        priceClient={null}
        priceClientFailure="Only an active store owner can read personal purchase costs."
        productId={context.product.storeProduct.id}
        onBack={() => undefined}
        onAddPackage={() => undefined}
        onEditPackage={() => undefined}
      />);
      expect(screen.getByText('Only an active store owner can read personal purchase costs.')).toBeTruthy();
    } finally {
      context.fixture.closeAndDelete();
    }
  });

  it('offers the store-wide Personal price changes route from product detail', () => {
    const context = renderProductDetail([]);
    const onOpenPriceChanges = jest.fn();
    try {
      const priceClient = createDatabasePersonalPriceClient(context.fixture.adapter, {
        storeId: context.fixture.context.store.id,
        userId: context.fixture.context.owner.id,
      });
      render(<ProductDetailScreen
        client={context.catalogueClient}
        priceClient={priceClient}
        productId={context.product.storeProduct.id}
        onBack={() => undefined}
        onAddPackage={() => undefined}
        onEditPackage={() => undefined}
        onOpenPriceChanges={onOpenPriceChanges}
      />);
      fireEvent.press(screen.getByText('Personal price changes'));
      expect(onOpenPriceChanges).toHaveBeenCalledTimes(1);
    } finally {
      context.fixture.closeAndDelete();
    }
  });
});
