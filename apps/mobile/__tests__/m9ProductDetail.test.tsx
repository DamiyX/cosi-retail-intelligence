import { fireEvent, render, screen } from '@testing-library/react-native';
import { MICROS_PER_UNIT } from '@retail/domain';

import { createCatalogueClient } from '../src/catalogue/client';
import { createTemporaryProduct } from '../src/catalogue/createTemporaryProduct';
import { getActiveBasePackageUnit } from '../src/db/repositories';
import { createDatabasePersonalPriceClient, type PersonalPriceClient } from '../src/priceIntelligence/client';
import { recordPurchase } from '../src/purchases/recordPurchase';
import ProductDetailScreen from '../src/screens/products/ProductDetailScreen';
import { deterministicIds, openCatalogueFixture, testId } from './catalogueSupport';

function renderProductDetail(costs: number[], quantityPackagesMicros = MICROS_PER_UNIT) {
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
        quantityPackagesMicros,
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
  it('reloads owner prices when the photo-aware detail receives a new price client', () => {
    const context = renderProductDetail([100, 150]);
    try {
      const props = {
        client: context.catalogueClient,
        productId: context.product.storeProduct.id,
        onBack: () => undefined,
        onAddPackage: () => undefined,
        onEditPackage: () => undefined,
      };
      const view = render(<ProductDetailScreen {...props} priceClient={null} />);
      expect(screen.queryByText('Increase · 50.0%')).toBeNull();
      view.rerender(<ProductDetailScreen {...props} priceClient={context.priceClient} />);
      expect(screen.getByText('Increase · 50.0%')).toBeTruthy();
      expect(screen.getAllByText(/Observed: .* · Contribution: off/)).toHaveLength(2);
      view.rerender(<ProductDetailScreen {...props} priceClient={null} />);
      expect(screen.queryByText('Increase · 50.0%')).toBeNull();
      expect(screen.queryByText('Purchase price history')).toBeNull();
    } finally {
      context.fixture.closeAndDelete();
    }
  });

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

  it('separates a multi-package receipt quantity from per-package base-unit conversion', () => {
    const context = renderProductDetail([100]);
    try {
      const carton = context.catalogueClient.createPackage({
        storeProductId: context.product.storeProduct.id,
        name: 'carton',
        conversionText: '12',
      });
      recordPurchase(context.fixture.adapter, {
        storeId: context.fixture.context.store.id,
        deviceId: context.fixture.context.device.id,
        userId: context.fixture.context.owner.id,
        occurredAt: '2026-04-02T10:00:00.000Z',
        lines: [{
          storeProductId: context.product.storeProduct.id,
          packageUnitId: carton.packageUnit.id,
          quantityPackagesMicros: 2 * MICROS_PER_UNIT,
          enteredCostMinor: 2400,
        }],
      }, { generateId: deterministicIds(5300), operationId: testId(5301) });

      render(<ProductDetailScreen
        client={context.catalogueClient}
        priceClient={context.priceClient}
        productId={context.product.storeProduct.id}
        onBack={() => undefined}
        onAddPackage={() => undefined}
        onEditPackage={() => undefined}
      />);

      expect(screen.getByText(
        'Observed package conversions: 1 piece purchased (1 package = 1 base unit); then 2 carton purchased (1 package = 12 base units).',
      )).toBeTruthy();
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
      getProductPurchasePriceHistory: jest.fn(() => []),
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

  it('fails closed on a corrupt stored rational and preserves the raw history view', () => {
    const context = renderProductDetail([100, 150]);
    try {
      const latest = context.fixture.adapter.getFirstRow<{ id: string }>(
        `SELECT id FROM price_observations
         WHERE store_id = ?
         ORDER BY observed_at DESC, created_at DESC, id DESC
         LIMIT 1;`,
        [context.fixture.context.store.id],
      );
      if (!latest) throw new Error('Test restock did not create a price observation.');
      context.fixture.adapter.run('DROP TRIGGER trg_price_observations_immutable_update;');
      context.fixture.adapter.run(
        'UPDATE price_observations SET package_cost_denominator = ? WHERE id = ?;',
        ['malformed-nonzero', latest.id],
      );

      render(<ProductDetailScreen
        client={context.catalogueClient}
        priceClient={context.priceClient}
        productId={context.product.storeProduct.id}
        onBack={() => undefined}
        onAddPackage={() => undefined}
        onEditPackage={() => undefined}
      />);
      expect(screen.getByText('Purchase cost change unavailable')).toBeTruthy();
      expect(screen.getByText(/A saved cost could not be compared safely/)).toBeTruthy();
      expect(screen.getByText('Purchase price history')).toBeTruthy();
      expect(screen.getByText('Receipt cost estimate: ₦1.50 per base unit (display rounded to the nearest kobo)')).toBeTruthy();
    } finally {
      context.fixture.closeAndDelete();
    }
  });

  it('shows per-package conversion separately from a multi-package purchase quantity', () => {
    const context = renderProductDetail([200], 3 * MICROS_PER_UNIT);
    try {
      render(<ProductDetailScreen
        client={context.catalogueClient}
        priceClient={context.priceClient}
        productId={context.product.storeProduct.id}
        onBack={() => undefined}
        onAddPackage={() => undefined}
        onEditPackage={() => undefined}
      />);
      expect(screen.getByText('Quantity: 3 piece · 1 package = 1 base unit')).toBeTruthy();
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
      expect(screen.queryByText('Purchase price history')).toBeNull();
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
