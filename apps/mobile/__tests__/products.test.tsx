import { fireEvent, render, screen } from '@testing-library/react-native';

import {
  createCatalogueClient,
  type CatalogueClient,
  type ProductDetail,
  type QuickAddInput,
  type TemporaryProductGraph,
} from '../src/catalogue/client';
import type { ProductLifecycleFilter, ProductSearchHit } from '../src/db/repositories';
import ProductDetailScreen from '../src/screens/products/ProductDetailScreen';
import ProductsListScreen from '../src/screens/products/ProductsListScreen';
import QuickAddProductScreen from '../src/screens/products/QuickAddProductScreen';
import { countRows, deterministicIds, openCatalogueFixture, type CatalogueFixture } from './catalogueSupport';

function stubClient(overrides: Partial<CatalogueClient> = {}): CatalogueClient {
  return {
    storeId: 'stub-store',
    storeName: 'Stub Store',
    listProducts: (_query: string, _filter?: ProductLifecycleFilter): ProductSearchHit[] => [],
    createTemporaryProduct: (_input: QuickAddInput): TemporaryProductGraph => {
      throw new Error('Stub catalogue cannot save.');
    },
    getProductDetail: (_productId: string): ProductDetail | null => null,
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
      const opened: string[] = [];
      render(
        <ProductsListScreen
          client={client}
          onAddProduct={() => undefined}
          onOpenProduct={(id) => opened.push(id)}
        />,
      );
      expect(screen.getAllByText('Temporary')).toHaveLength(3);
      expect(screen.getAllByText('Sold per piece')).toHaveLength(3);
      fireEvent.press(screen.getByLabelText('Milo 400g, Temporary'));
      expect(opened).toHaveLength(1);
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
        />,
      );
      expect(screen.getByText('Milo 400g')).toBeTruthy();
      expect(screen.getByText(/Temporary — an incomplete record/)).toBeTruthy();
      expect(screen.getByText('Saved on this device. It has not been sent anywhere.')).toBeTruthy();
      expect(screen.getByText('Local SKU: ML-400')).toBeTruthy();
      expect(screen.getByText('Status: Active')).toBeTruthy();
      expect(screen.getByText('Base unit: piece')).toBeTruthy();
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
        />,
      );
      expect(screen.getByText('Product unavailable')).toBeTruthy();
      fireEvent.press(screen.getByText('Go back'));
      expect(retried).toEqual(['back']);
    } finally {
      fixture.closeAndDelete();
    }
  });
});
