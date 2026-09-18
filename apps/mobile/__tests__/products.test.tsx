import { fireEvent, render, screen } from '@testing-library/react-native';
import { Alert, BackHandler } from 'react-native';
import { MICROS_PER_UNIT } from '@retail/domain';

import {
  createCatalogueClient,
  type AddProductIdentifierResult,
  type CatalogueClient,
  type PackageResult,
  type ProductDetail,
  type ProductIdentityResult,
  type ProductLifecycleResult,
  type QuickAddInput,
  type TemporaryProductGraph,
} from '../src/catalogue/client';
import { createDatabasePurchasesClient } from '../src/purchases/client';
import { completeSale } from '../src/sales/completeSale';
import { getActiveBasePackageUnit, type ProductLifecycleFilter, type ProductSearchHit } from '../src/db/repositories';
import ProductDetailScreen from '../src/screens/products/ProductDetailScreen';
import PackageFormScreen from '../src/screens/products/PackageFormScreen';
import ProductsListScreen from '../src/screens/products/ProductsListScreen';
import QuickAddProductScreen from '../src/screens/products/QuickAddProductScreen';
import { countRows, deterministicIds, openCatalogueFixture, type CatalogueFixture } from './catalogueSupport';

function stubClient(overrides: Partial<CatalogueClient> = {}): CatalogueClient {
  return {
    storeId: 'stub-store',
    storeName: 'Stub Store',
    storeCurrencyCode: 'NGN',
    listProducts: (_query: string, _filter?: ProductLifecycleFilter): ProductSearchHit[] => [],
    createTemporaryProduct: (_input: QuickAddInput): TemporaryProductGraph => {
      throw new Error('Stub catalogue cannot save.');
    },
    getProductDetail: (_productId: string): ProductDetail | null => null,
    getPurchasePriceHistory: () => [],
    updateProductIdentity: (): ProductIdentityResult => {
      throw new Error('Stub catalogue cannot save.');
    },
    addProductIdentifier: (): AddProductIdentifierResult => {
      throw new Error('Stub catalogue cannot save.');
    },
    createPackage: (): PackageResult => {
      throw new Error('Stub catalogue cannot save.');
    },
    updatePackage: (): PackageResult => {
      throw new Error('Stub catalogue cannot save.');
    },
    deactivatePackage: (): PackageResult => {
      throw new Error('Stub catalogue cannot save.');
    },
    markProductEnriched: (): ProductLifecycleResult => {
      throw new Error('Stub catalogue cannot save.');
    },
    setProductActive: (): ProductLifecycleResult => {
      throw new Error('Stub catalogue cannot save.');
    },
    ...overrides,
  };
}

function seedProducts(fixture: CatalogueFixture): void {
  const client = createCatalogueClient(
    fixture.adapter,
    fixture.context.store,
    fixture.context.device,
    deterministicIds(5000),
  );
  client.createTemporaryProduct({ name: 'Milo 400g', localSku: 'ML-400', barcode: '6001111111111' });
  client.createTemporaryProduct({ name: 'Peak Milk' });
  client.createTemporaryProduct({ name: 'Omo Multi-Active' });
}

describe('ProductsListScreen', () => {
  it('shows rows with temporary markers and preferred packages', () => {
    const fixture = openCatalogueFixture();
    try {
      seedProducts(fixture);
      const client = createCatalogueClient(fixture.adapter, fixture.context.store, fixture.context.device);
      const milo = client.listProducts('Milo')[0];
      if (!milo) {
        throw new Error('Milo fixture missing.');
      }
      client.createPackage({
        storeProductId: milo.product.id,
        name: 'carton',
        conversionText: '20',
        setting: { defaultSellingPrice: '1450.50', isPreferredForSale: true },
      });
      const opened: string[] = [];
      const { unmount } = render(
        <ProductsListScreen
          client={client}
          onAddProduct={() => undefined}
          onOpenProduct={(id) => opened.push(id)}
        />,
      );
      expect(screen.getAllByLabelText(/, Temporary$/)).toHaveLength(3);
      expect(screen.getAllByText('Sold per piece')).toHaveLength(2);
      expect(screen.getByText('Sold per carton')).toBeTruthy();
      expect(screen.getByText('Selling price: ₦1,450.50')).toBeTruthy();
      fireEvent.press(screen.getByLabelText('Milo 400g, Temporary'));
      expect(opened).toHaveLength(1);
      unmount();
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('filters by name, SKU, and barcode while hostile text stays data', () => {
    const fixture = openCatalogueFixture();
    try {
      seedProducts(fixture);
      const client = createCatalogueClient(fixture.adapter, fixture.context.store, fixture.context.device);
      const { unmount } = render(
        <ProductsListScreen client={client} onAddProduct={() => undefined} onOpenProduct={() => undefined} />,
      );
      fireEvent.changeText(screen.getByLabelText('Search products'), 'milo');
      expect(screen.getByLabelText('Milo 400g, Temporary')).toBeTruthy();
      expect(screen.queryByLabelText('Peak Milk, Temporary')).toBeNull();
      fireEvent.changeText(screen.getByLabelText('Search products'), 'ML-400');
      expect(screen.getByLabelText('Milo 400g, Temporary')).toBeTruthy();
      fireEvent.changeText(screen.getByLabelText('Search products'), '6001111111111');
      expect(screen.getByLabelText('Milo 400g, Temporary')).toBeTruthy();
      fireEvent.changeText(screen.getByLabelText('Search products'), "%' OR 1=1 --");
      expect(screen.queryByLabelText('Milo 400g, Temporary')).toBeNull();
      expect(screen.getByText('No matching product')).toBeTruthy();
      unmount();
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('filters temporary and inactive products through explicit text filters', () => {
    const fixture = openCatalogueFixture();
    try {
      const client = createCatalogueClient(
        fixture.adapter,
        fixture.context.store,
        fixture.context.device,
        deterministicIds(5100),
      );
      const first = client.createTemporaryProduct({ name: 'Milo 400g' });
      client.createTemporaryProduct({ name: 'Omo' });
      client.markProductEnriched({ storeProductId: first.storeProduct.id });
      client.setProductActive({ storeProductId: first.storeProduct.id }, false);
      render(
        <ProductsListScreen client={client} onAddProduct={() => undefined} onOpenProduct={() => undefined} />,
      );
      expect(screen.getByLabelText('Milo 400g, Inactive')).toBeTruthy();
      expect(screen.getByLabelText('Omo, Temporary')).toBeTruthy();
      fireEvent.press(screen.getByLabelText('Show inactive products'));
      expect(screen.getByLabelText('Milo 400g, Inactive')).toBeTruthy();
      expect(screen.queryByLabelText('Omo, Temporary')).toBeNull();
      fireEvent.press(screen.getByLabelText('Show active products'));
      expect(screen.getByLabelText('Omo, Temporary')).toBeTruthy();
      expect(screen.queryByLabelText('Milo 400g, Inactive')).toBeNull();
      fireEvent.press(screen.getByLabelText('Show temporary products'));
      expect(screen.getByLabelText('Omo, Temporary')).toBeTruthy();
      expect(screen.queryByLabelText('Milo 400g, Inactive')).toBeNull();
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('offers retry without losing the query when reading fails', () => {
    let calls = 0;
    const client = stubClient({
      listProducts: () => {
        calls += 1;
        throw new Error('Disk unreadable in test.');
      },
    });
    const added: string[] = [];
    render(
      <ProductsListScreen client={client} onAddProduct={(query) => added.push(query)} onOpenProduct={() => undefined} />,
    );
    expect(screen.getByText('Product list unavailable')).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('Search products'), 'milo');
    fireEvent.press(screen.getByText('Try again'));
    expect(calls).toBe(3);
    fireEvent.press(screen.getAllByText('Add product')[0]);
    expect(added).toEqual(['milo']);
  });
});

describe('QuickAddProductScreen', () => {
  it('requires a name and saves a valid product on the device', () => {
    const fixture = openCatalogueFixture();
    try {
      const client = createCatalogueClient(
        fixture.adapter,
        fixture.context.store,
        fixture.context.device,
        deterministicIds(6000),
      );
      const saved: string[] = [];
      render(
        <QuickAddProductScreen client={client} onSaved={(id) => saved.push(id)} onCancel={() => undefined} />,
      );
      fireEvent.press(screen.getByText('Save product'));
      expect(screen.getByText('Enter a product name.')).toBeTruthy();
      expect(saved).toHaveLength(0);
      fireEvent.changeText(screen.getByTestId('quick-add-name'), 'Milo 400g');
      expect(screen.queryByText('Enter a product name.')).toBeNull();
      fireEvent.press(screen.getByText('Save product'));
      expect(saved).toHaveLength(1);
      expect(countRows(fixture.adapter, 'store_products')).toBe(1);
      expect(countRows(fixture.adapter, 'outbox_operations')).toBe(1);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('maps a duplicate SKU to the SKU field and saves nothing', () => {
    const fixture = openCatalogueFixture();
    try {
      const client = createCatalogueClient(
        fixture.adapter,
        fixture.context.store,
        fixture.context.device,
        deterministicIds(7000),
      );
      client.createTemporaryProduct({ name: 'First', localSku: 'DUP-9' });
      render(<QuickAddProductScreen client={client} onSaved={() => undefined} onCancel={() => undefined} />);
      fireEvent.changeText(screen.getByTestId('quick-add-name'), 'Second');
      fireEvent.press(screen.getByText('Add more details'));
      fireEvent.changeText(screen.getByTestId('quick-add-sku'), 'DUP-9');
      fireEvent.press(screen.getByText('Save product'));
      expect(
        screen.getByText('This store already uses that local SKU on another product.'),
      ).toBeTruthy();
      expect(countRows(fixture.adapter, 'store_products')).toBe(1);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('submits once per press and keeps values on failure', () => {
    let calls = 0;
    const client = stubClient({
      createTemporaryProduct: () => {
        calls += 1;
        throw new Error('Disk full in test.');
      },
    });
    const cancelled: string[] = [];
    render(
      <QuickAddProductScreen
        client={client}
        initialName="Proposed Name"
        onSaved={() => undefined}
        onCancel={() => cancelled.push('cancelled')}
      />,
    );
    fireEvent.press(screen.getByText('Save product'));
    expect(calls).toBe(1);
    expect(screen.getByText('Not saved')).toBeTruthy();
    expect(screen.getByTestId('quick-add-name').props.value).toBe('Proposed Name');
    // The failed save releases the form; an explicit retry resubmits once.
    fireEvent.press(screen.getByText('Try again'));
    expect(calls).toBe(2);
    fireEvent.press(screen.getByText('Go back'));
    expect(cancelled).toEqual(['cancelled']);
  });

  it('asks before Cancel discards entered product data', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    try {
      render(<QuickAddProductScreen client={stubClient()} onSaved={() => undefined} onCancel={() => undefined} />);
      fireEvent.changeText(screen.getByTestId('quick-add-name'), 'Unsaved item');
      fireEvent.press(screen.getByText('Cancel'));
      expect(alertSpy).toHaveBeenCalledWith('Discard product?', expect.any(String), expect.any(Array));
    } finally {
      alertSpy.mockRestore();
    }
  });
});

describe('ProductDetailScreen', () => {
  it('shows identity, temporary state, base package, and local save state', () => {
    const fixture = openCatalogueFixture();
    try {
      const client = createCatalogueClient(
        fixture.adapter,
        fixture.context.store,
        fixture.context.device,
        deterministicIds(8000),
      );
      const graph = client.createTemporaryProduct({ name: 'Milo 400g', localSku: 'ML-400' });
      render(
        <ProductDetailScreen
          client={client}
          productId={graph.storeProduct.id}
          justSaved
          onBack={() => undefined}
          onAddPackage={() => undefined}
          onEditPackage={() => undefined}
        />,
      );
      expect(screen.getByText('Milo 400g')).toBeTruthy();
      expect(screen.getByText(/Temporary — an incomplete record/)).toBeTruthy();
      expect(screen.getByText('Saved on this device. It has not been sent anywhere.')).toBeTruthy();
      expect(screen.getByText('Local SKU: ML-400')).toBeTruthy();
      expect(screen.getByText('Status: Active')).toBeTruthy();
      expect(screen.getByText('piece (Base unit)')).toBeTruthy();
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('shows store-private original purchase price history with saved package facts', () => {
    const fixture = openCatalogueFixture();
    try {
      const catalogue = createCatalogueClient(
        fixture.adapter,
        fixture.context.store,
        fixture.context.device,
        deterministicIds(8050),
      );
      const graph = catalogue.createTemporaryProduct({ name: 'History rice' });
      const base = getActiveBasePackageUnit(fixture.adapter, graph.variant.id);
      if (!base) throw new Error('Base package fixture missing.');
      const purchases = createDatabasePurchasesClient(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        generateId: deterministicIds(8060),
      });
      purchases.recordPurchase({
        lines: [{
          storeProductId: graph.storeProduct.id,
          packageUnitId: base.id,
          quantityPackagesMicros: 2 * MICROS_PER_UNIT,
          enteredCostMinor: 750,
        }],
        supplierName: 'History supplier',
        operationId: '00000000-0000-4000-8000-000000008061',
      });
      render(
        <ProductDetailScreen
          client={catalogue}
          productId={graph.storeProduct.id}
          onBack={() => undefined}
          onAddPackage={() => undefined}
          onEditPackage={() => undefined}
        />,
      );
      expect(screen.getByText('Purchase price history')).toBeTruthy();
      expect(screen.getByText('Entered total cost: ₦7.50')).toBeTruthy();
      expect(screen.getByText('Purchase total: ₦7.50')).toBeTruthy();
      expect(screen.getByText('Receipt cost estimate: ₦3.75 per base unit (rounded to the nearest minor unit)')).toBeTruthy();
      expect(screen.getByText('Exact stored receipt basis: 375/1 minor units per base unit')).toBeTruthy();
      expect(screen.getByText('Current cost availability: Estimated cost available for current stock')).toBeTruthy();
      expect(screen.getByText('Supplier: History supplier')).toBeTruthy();
      expect(screen.getByText(/Contribution: off/)).toBeTruthy();
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('labels zero-stock and unknown current cost as unavailable while rounding fractional estimates for merchants', () => {
    const fractionalFixture = openCatalogueFixture();
    let fractionalView: { unmount: () => void } | null = null;
    try {
      const catalogue = createCatalogueClient(
        fractionalFixture.adapter,
        fractionalFixture.context.store,
        fractionalFixture.context.device,
        deterministicIds(8090),
      );
      const graph = catalogue.createTemporaryProduct({ name: 'Fractional history rice' });
      const base = getActiveBasePackageUnit(fractionalFixture.adapter, graph.variant.id)!;
      const purchases = createDatabasePurchasesClient(fractionalFixture.adapter, {
        storeId: fractionalFixture.context.store.id,
        deviceId: fractionalFixture.context.device.id,
        userId: fractionalFixture.context.owner.id,
        generateId: deterministicIds(8100),
      });
      purchases.recordPurchase({
        lines: [{
          storeProductId: graph.storeProduct.id,
          packageUnitId: base.id,
          quantityPackagesMicros: 3 * MICROS_PER_UNIT,
          enteredCostMinor: 100,
        }],
        operationId: '00000000-0000-4000-8000-000000008101',
      });
      fractionalView = render(
        <ProductDetailScreen
          client={catalogue}
          productId={graph.storeProduct.id}
          onBack={() => undefined}
          onAddPackage={() => undefined}
          onEditPackage={() => undefined}
        />,
      );
      expect(screen.getByText('Receipt cost estimate: ₦0.33 per base unit (rounded to the nearest minor unit)')).toBeTruthy();
      expect(screen.getByText('Current cost availability: Estimated cost available for current stock')).toBeTruthy();
    } finally {
      fractionalView?.unmount();
      fractionalFixture.closeAndDelete();
    }

    const zeroStockFixture = openCatalogueFixture();
    let zeroStockView: { unmount: () => void } | null = null;
    try {
      const catalogue = createCatalogueClient(
        zeroStockFixture.adapter,
        zeroStockFixture.context.store,
        zeroStockFixture.context.device,
        deterministicIds(8120),
      );
      const graph = catalogue.createTemporaryProduct({ name: 'Zero stock history rice' });
      const base = getActiveBasePackageUnit(zeroStockFixture.adapter, graph.variant.id)!;
      const purchases = createDatabasePurchasesClient(zeroStockFixture.adapter, {
        storeId: zeroStockFixture.context.store.id,
        deviceId: zeroStockFixture.context.device.id,
        userId: zeroStockFixture.context.owner.id,
        generateId: deterministicIds(8130),
      });
      purchases.recordPurchase({
        lines: [{ storeProductId: graph.storeProduct.id, packageUnitId: base.id, quantityPackagesMicros: MICROS_PER_UNIT, enteredCostMinor: 100 }],
        operationId: '00000000-0000-4000-8000-000000008131',
      });
      completeSale(zeroStockFixture.adapter, {
        storeId: zeroStockFixture.context.store.id,
        deviceId: zeroStockFixture.context.device.id,
        userId: zeroStockFixture.context.owner.id,
        lines: [{ storeProductId: graph.storeProduct.id, packageUnitId: base.id, quantityPackagesMicros: MICROS_PER_UNIT, unitPriceMinor: 200 }],
        payment: { method: 'CASH' },
      }, { generateId: deterministicIds(8140), operationId: '00000000-0000-4000-8000-000000008141' });
      zeroStockView = render(
        <ProductDetailScreen
          client={catalogue}
          productId={graph.storeProduct.id}
          onBack={() => undefined}
          onAddPackage={() => undefined}
          onEditPackage={() => undefined}
        />,
      );
      expect(screen.getByText('Current cost availability: Unavailable for current stock; do not infer profit')).toBeTruthy();
    } finally {
      zeroStockView?.unmount();
      zeroStockFixture.closeAndDelete();
    }

    const unknownFixture = openCatalogueFixture();
    let unknownView: { unmount: () => void } | null = null;
    try {
      const catalogue = createCatalogueClient(
        unknownFixture.adapter,
        unknownFixture.context.store,
        unknownFixture.context.device,
        deterministicIds(8150),
      );
      const graph = catalogue.createTemporaryProduct({ name: 'Unknown stock history rice' });
      const base = getActiveBasePackageUnit(unknownFixture.adapter, graph.variant.id)!;
      const purchases = createDatabasePurchasesClient(unknownFixture.adapter, {
        storeId: unknownFixture.context.store.id,
        deviceId: unknownFixture.context.device.id,
        userId: unknownFixture.context.owner.id,
        generateId: deterministicIds(8160),
      });
      purchases.recordPurchase({
        lines: [{ storeProductId: graph.storeProduct.id, packageUnitId: base.id, quantityPackagesMicros: MICROS_PER_UNIT, enteredCostMinor: 100 }],
        operationId: '00000000-0000-4000-8000-000000008161',
      });
      completeSale(unknownFixture.adapter, {
        storeId: unknownFixture.context.store.id,
        deviceId: unknownFixture.context.device.id,
        userId: unknownFixture.context.owner.id,
        lines: [{ storeProductId: graph.storeProduct.id, packageUnitId: base.id, quantityPackagesMicros: 2 * MICROS_PER_UNIT, unitPriceMinor: 200 }],
        payment: { method: 'CASH' },
      }, { generateId: deterministicIds(8170), operationId: '00000000-0000-4000-8000-000000008171' });
      unknownView = render(
        <ProductDetailScreen
          client={catalogue}
          productId={graph.storeProduct.id}
          onBack={() => undefined}
          onAddPackage={() => undefined}
          onEditPackage={() => undefined}
        />,
      );
      expect(screen.getByText('Current cost availability: Unavailable for current stock; do not infer profit')).toBeTruthy();
    } finally {
      unknownView?.unmount();
      unknownFixture.closeAndDelete();
    }
  });

  it('recovers from a purchase-price history read failure without losing the product detail', () => {
    const fixture = openCatalogueFixture();
    try {
      const catalogue = createCatalogueClient(
        fixture.adapter,
        fixture.context.store,
        fixture.context.device,
        deterministicIds(8070),
      );
      const graph = catalogue.createTemporaryProduct({ name: 'Retry history' });
      let historyReads = 0;
      const failingClient: CatalogueClient = {
        ...catalogue,
        getPurchasePriceHistory: () => {
          historyReads += 1;
          if (historyReads === 1) throw new Error('History read failed in test.');
          return [];
        },
      };
      render(
        <ProductDetailScreen
          client={failingClient}
          productId={graph.storeProduct.id}
          onBack={() => undefined}
          onAddPackage={() => undefined}
          onEditPackage={() => undefined}
        />,
      );
      expect(screen.getByText('Purchase price history unavailable')).toBeTruthy();
      fireEvent.press(screen.getByText('Try again'));
      expect(screen.getByText('No purchase price history yet.')).toBeTruthy();
      expect(historyReads).toBe(2);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('reports a missing product without claiming success', () => {
    const fixture = openCatalogueFixture();
    try {
      const client = createCatalogueClient(fixture.adapter, fixture.context.store, fixture.context.device);
      const retried: string[] = [];
      render(
        <ProductDetailScreen
          client={{ ...client, getProductDetail: () => null }}
          productId="00000000-0000-4000-8000-000000000000"
          onBack={() => retried.push('back')}
          onAddPackage={() => undefined}
          onEditPackage={() => undefined}
        />,
      );
      expect(screen.getByText('Product unavailable')).toBeTruthy();
      fireEvent.press(screen.getByText('Go back'));
      expect(retried).toEqual(['back']);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('edits name and SKU while leaving prices and packages untouched', () => {
    const fixture = openCatalogueFixture();
    try {
      const client = createCatalogueClient(
        fixture.adapter,
        fixture.context.store,
        fixture.context.device,
        deterministicIds(8100),
      );
      const graph = client.createTemporaryProduct({ name: 'Milo 400g' });
      render(
        <ProductDetailScreen
          client={client}
          productId={graph.storeProduct.id}
          onBack={() => undefined}
          onAddPackage={() => undefined}
          onEditPackage={() => undefined}
        />,
      );
      fireEvent.press(screen.getByText('Edit name or SKU'));
      fireEvent.changeText(screen.getByTestId('detail-name'), 'Milo 800g');
      fireEvent.changeText(screen.getByTestId('detail-sku'), 'ML-800');
      fireEvent.press(screen.getByText('Save changes'));
      expect(screen.getByText('Milo 800g')).toBeTruthy();
      expect(screen.getByText('Local SKU: ML-800')).toBeTruthy();
      expect(screen.getByText('piece (Base unit)')).toBeTruthy();
      expect(countRows(fixture.adapter, 'outbox_operations')).toBe(2);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('asks before Cancel discards an identity edit', () => {
    const fixture = openCatalogueFixture();
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    try {
      const client = createCatalogueClient(
        fixture.adapter, fixture.context.store, fixture.context.device, deterministicIds(8150),
      );
      const graph = client.createTemporaryProduct({ name: 'Milo 400g' });
      render(
        <ProductDetailScreen
          client={client} productId={graph.storeProduct.id} onBack={() => undefined}
          onAddPackage={() => undefined} onEditPackage={() => undefined}
        />,
      );
      fireEvent.press(screen.getByText('Edit name or SKU'));
      fireEvent.changeText(screen.getByTestId('detail-name'), 'Unsaved name');
      fireEvent.press(screen.getByText('Cancel'));
      expect(alertSpy).toHaveBeenCalledWith(
        'Discard product changes?', expect.any(String), expect.any(Array),
      );
    } finally {
      alertSpy.mockRestore();
      fixture.closeAndDelete();
    }
  });

  it('adds a barcode and rejects a duplicate with a field error', () => {
    const fixture = openCatalogueFixture();
    try {
      const client = createCatalogueClient(
        fixture.adapter,
        fixture.context.store,
        fixture.context.device,
        deterministicIds(8200),
      );
      const graph = client.createTemporaryProduct({ name: 'Milo 400g' });
      render(
        <ProductDetailScreen
          client={client}
          productId={graph.storeProduct.id}
          onBack={() => undefined}
          onAddPackage={() => undefined}
          onEditPackage={() => undefined}
        />,
      );
      expect(screen.getByText('No barcode or store code yet.')).toBeTruthy();
      fireEvent.changeText(screen.getByTestId('detail-identifier'), '6001234567890');
      fireEvent.press(screen.getByText('Add code'));
      expect(screen.getByText(/6001234567890 \(EAN\)/)).toBeTruthy();
      fireEvent.changeText(screen.getByTestId('detail-identifier'), '6001 2345-67890');
      fireEvent.press(screen.getByText('UPC barcode'));
      fireEvent.press(screen.getByText('Add code'));
      expect(
        screen.getByText('That barcode is already attached to another product; merge or correct it instead of duplicating.'),
      ).toBeTruthy();
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('shows package conversions, prices, and preferred markers', () => {
    const fixture = openCatalogueFixture();
    try {
      const client = createCatalogueClient(
        fixture.adapter,
        fixture.context.store,
        fixture.context.device,
        deterministicIds(8300),
      );
      const graph = client.createTemporaryProduct({ name: 'Indomie 70g' });
      client.createPackage({
        storeProductId: graph.storeProduct.id,
        name: 'carton',
        conversionText: '40',
        setting: { defaultSellingPrice: '1450.50', isPreferredForSale: true },
      });
      const added: string[] = [];
      const edited: string[] = [];
      render(
        <ProductDetailScreen
          client={client}
          productId={graph.storeProduct.id}
          onBack={() => undefined}
          onAddPackage={() => added.push('add')}
          onEditPackage={(id) => edited.push(id)}
        />,
      );
      expect(screen.getByText('piece (Base unit)')).toBeTruthy();
      expect(screen.getByText('1 carton = 40 base units')).toBeTruthy();
      expect(screen.getByText('Selling price: ₦1,450.50')).toBeTruthy();
      fireEvent.press(screen.getByText('Add package'));
      expect(added).toEqual(['add']);
      fireEvent.press(screen.getByLabelText('Edit carton package'));
      expect(edited).toHaveLength(1);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('marks a product enriched and deactivates only after confirmation', () => {
    const fixture = openCatalogueFixture();
    try {
      const client = createCatalogueClient(
        fixture.adapter,
        fixture.context.store,
        fixture.context.device,
        deterministicIds(8400),
      );
      const graph = client.createTemporaryProduct({ name: 'Milo 400g' });
      render(
        <ProductDetailScreen
          client={client}
          productId={graph.storeProduct.id}
          onBack={() => undefined}
          onAddPackage={() => undefined}
          onEditPackage={() => undefined}
        />,
      );
      fireEvent.press(screen.getByText('Mark as enriched'));
      expect(screen.queryByText(/Temporary — an incomplete record/)).toBeNull();
      expect(screen.queryByText('Mark as enriched')).toBeNull();
      fireEvent.press(screen.getByText('Deactivate product'));
      expect(screen.getByText('Status: Active')).toBeTruthy();
      fireEvent.press(screen.getByText('Confirm deactivate'));
      expect(screen.getByText('Status: Inactive')).toBeTruthy();
      expect(screen.getByText('Reactivate product')).toBeTruthy();
      fireEvent.press(screen.getByText('Reactivate product'));
      expect(screen.getByText('Status: Active')).toBeTruthy();
    } finally {
      fixture.closeAndDelete();
    }
  });
});

describe('PackageFormScreen', () => {
  function openPackageFixture() {
    const fixture = openCatalogueFixture();
    const client = createCatalogueClient(
      fixture.adapter,
      fixture.context.store,
      fixture.context.device,
      deterministicIds(14000),
    );
    const graph = client.createTemporaryProduct({ name: 'Indomie 70g' });
    return { fixture, client, graph };
  }

  it('previews the conversion sentence live and saves a package with its setting', () => {
    const { fixture, client, graph } = openPackageFixture();
    try {
      const saved: string[] = [];
      render(
        <PackageFormScreen
          client={client}
          storeProductId={graph.storeProduct.id}
          baseUnitName="piece"
          onSaved={() => saved.push('saved')}
          onCancel={() => undefined}
        />,
      );
      fireEvent.changeText(screen.getByTestId('package-name'), 'carton');
      fireEvent.changeText(screen.getByTestId('package-conversion'), '40');
      expect(screen.getByText('1 carton = 40 piece')).toBeTruthy();
      fireEvent.changeText(screen.getByTestId('package-price'), '1450.50');
      fireEvent.press(screen.getByText('Save package'));
      expect(saved).toEqual(['saved']);
      expect(countRows(fixture.adapter, 'package_units')).toBe(2);
      expect(countRows(fixture.adapter, 'store_package_settings')).toBe(1);
      expect(countRows(fixture.adapter, 'outbox_operations')).toBe(2);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('rejects empty names and inexact conversions with field errors', () => {
    const { fixture, client, graph } = openPackageFixture();
    try {
      render(
        <PackageFormScreen
          client={client}
          storeProductId={graph.storeProduct.id}
          baseUnitName="piece"
          onSaved={() => undefined}
          onCancel={() => undefined}
        />,
      );
      fireEvent.press(screen.getByText('Save package'));
      expect(screen.getByText('Enter a package name, for example carton or pack.')).toBeTruthy();
      fireEvent.changeText(screen.getByTestId('package-name'), 'pack');
      fireEvent.changeText(screen.getByTestId('package-conversion'), '1.0000001');
      fireEvent.press(screen.getByText('Save package'));
      expect(
        screen.getByText(
          'Enter how many base units this holds, with up to 6 decimals. Extra precision is rejected, not rounded.',
        ),
      ).toBeTruthy();
      fireEvent.changeText(screen.getByTestId('package-conversion'), '0');
      fireEvent.press(screen.getByText('Save package'));
      expect(
        screen.getByText('A package must contain a positive amount of the base unit.'),
      ).toBeTruthy();
      expect(countRows(fixture.adapter, 'package_units')).toBe(1);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('edits presentation and prices while the conversion stays fixed', () => {
    const { fixture, client, graph } = openPackageFixture();
    try {
      const created = client.createPackage({
        storeProductId: graph.storeProduct.id,
        name: 'pack',
        conversionText: '10',
      });
      const detail = client.getProductDetail(graph.storeProduct.id);
      const setting = detail?.settings.find((entry) => entry.packageUnitId === created.packageUnit.id) ?? null;
      const saved: string[] = [];
      render(
        <PackageFormScreen
          client={client}
          storeProductId={graph.storeProduct.id}
          baseUnitName="piece"
          packageUnit={created.packageUnit}
          setting={setting}
          onSaved={() => saved.push('saved')}
          onCancel={() => undefined}
        />,
      );
      expect(screen.getByText(/Conversion is fixed after creation/)).toBeTruthy();
      expect(screen.queryByTestId('package-conversion')).toBeNull();
      fireEvent.changeText(screen.getByTestId('package-name'), 'retail pack');
      fireEvent.changeText(screen.getByTestId('package-price'), '1500');
      fireEvent.press(screen.getByText('Save changes'));
      expect(saved).toEqual(['saved']);
      expect(countRows(fixture.adapter, 'store_package_settings')).toBe(1);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('deactivates only after confirmation and keeps the row', () => {
    const { fixture, client, graph } = openPackageFixture();
    try {
      const created = client.createPackage({
        storeProductId: graph.storeProduct.id,
        name: 'carton',
        conversionText: '40',
      });
      const deactivated: string[] = [];
      render(
        <PackageFormScreen
          client={client}
          storeProductId={graph.storeProduct.id}
          baseUnitName="piece"
          packageUnit={created.packageUnit}
          onSaved={() => undefined}
          onDeactivated={() => deactivated.push('deactivated')}
          onCancel={() => undefined}
        />,
      );
      fireEvent.press(screen.getByText('Deactivate package'));
      expect(deactivated).toHaveLength(0);
      fireEvent.press(screen.getByText('Confirm deactivate'));
      expect(deactivated).toEqual(['deactivated']);
      expect(countRows(fixture.adapter, 'package_units')).toBe(2);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('asks for confirmation before hardware back discards dirty input', () => {
    const { fixture, client, graph } = openPackageFixture();
    try {
      const addSpy = jest.spyOn(BackHandler, 'addEventListener');
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      try {
        render(
          <PackageFormScreen
            client={client}
            storeProductId={graph.storeProduct.id}
            baseUnitName="piece"
            onSaved={() => undefined}
            onCancel={() => undefined}
          />,
        );
        const handlers = addSpy.mock.calls as unknown as [string, () => boolean][];
        const pristineHandler = handlers[handlers.length - 1]?.[1];
        expect(pristineHandler?.()).toBe(false);
        expect(alertSpy).not.toHaveBeenCalled();
        fireEvent.changeText(screen.getByTestId('package-name'), 'carton');
        const updatedHandlers = addSpy.mock.calls as unknown as [string, () => boolean][];
        const dirtyHandler = updatedHandlers[updatedHandlers.length - 1]?.[1];
        expect(dirtyHandler?.()).toBe(true);
        expect(alertSpy).toHaveBeenCalledWith(
          'Discard package changes?',
          expect.any(String),
          expect.any(Array),
        );
      } finally {
        addSpy.mockRestore();
        alertSpy.mockRestore();
      }
    } finally {
      fixture.closeAndDelete();
    }
  });
});
