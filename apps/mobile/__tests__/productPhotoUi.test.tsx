import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { createCatalogueClient } from '../src/catalogue/client';
import { createDatabaseSalesClient } from '../src/sales/client';
import { type PhotoFiles } from '../src/media/productPhotos';
import type { ProductPhotoCameraProps } from '../src/media/ProductPhotoCamera';
import ProductPhoto from '../src/media/ProductPhoto';
import ProductsListScreen from '../src/screens/products/ProductsListScreen';
import QuickAddProductScreen from '../src/screens/products/QuickAddProductScreen';
import SellScreen from '../src/screens/sales/SellScreen';
import { deterministicIds, openCatalogueFixture } from './catalogueSupport';
let mockPhotoCallback: ((uri: string) => void) | undefined;
jest.mock('../src/media/ProductPhotoCamera', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return { __esModule: true, default: ({ onCaptured }: ProductPhotoCameraProps) => {
    mockPhotoCallback = onCaptured;
    return <Text onPress={() => onCaptured('file:///cache/capture.jpg')}>Take product photo</Text>;
  } };
});
jest.mock('../src/features/scanning/useScanFeedback', () => ({ useScanFeedback: () => jest.fn() }));

function setup() {
  const f = openCatalogueFixture();
  const saved = new Set<string>();
  const info = { size: 100, width: 100, height: 100, checksum: 'test-content' };
  const files: PhotoFiles = { stage: (_uri, key) => { saved.add(key); return info; }, inspect: key => saved.has(key) ? info : null, uri: key => 'file:///private/' + key, remove: key => { saved.delete(key); }, list: () => [] };
  const catalogue = createCatalogueClient(f.adapter, f.context.store, f.context.device, deterministicIds(1000), () => files);
  const photos = catalogue.photos!;
  return { f, photos, catalogue, files, saved };
}

it('explicit photo -> price -> same basket needs no name or second price confirmation', async () => {
  const s = setup();
  try {
    const client = createDatabaseSalesClient(s.f.adapter);
    const { unmount } = render(<SellScreen client={client} catalogueClient={s.catalogue} />);
    fireEvent.press(screen.getByText('Add product'));
    expect(screen.queryByTestId('quick-add-price')).toBeNull();
    await screen.findByText('Take product photo');
    fireEvent.press(screen.getByText('Take product photo'));
    expect(screen.getByText('Identification photo ready on this device.')).toBeTruthy();
    expect(screen.queryByTestId('quick-add-name')).toBeNull();
    fireEvent.changeText(screen.getByTestId('quick-add-price'), '1.25');
    fireEvent.press(screen.getByText('Add to basket'));
    expect(screen.getByText('Cart (1)')).toBeTruthy();
    expect(screen.queryByTestId('line-price-input')).toBeNull();
    const product = s.f.adapter.getFirstRow<{ id: string }>('SELECT id FROM store_products')!;
    expect(s.photos.read(product.id).status).toBe('available');
    expect(s.saved.size).toBe(1);
    unmount();
    expect(s.photos.read(product.id).status).toBe('available');
  } finally { s.f.closeAndDelete(); }
});

it('dirty photo cancellation discards staging while later completion preserves the committed asset', async () => {
  const s = setup();
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  try {
    const { unmount } = render(<QuickAddProductScreen client={s.catalogue} saleShortcut onSaleReady={jest.fn()} onSaved={jest.fn()} onCancel={jest.fn()} />);
    await screen.findByText('Take product photo');
    fireEvent.press(screen.getByText('Take product photo'));
    fireEvent.press(screen.getByText('Cancel'));
    expect(alert).toHaveBeenCalledWith('Discard product?', 'Your entries will be lost.', expect.any(Array));
    unmount();
    expect(s.saved.size).toBe(0);
    expect(s.f.adapter.getAllRows('SELECT id FROM media_assets')).toHaveLength(0);
  } finally { alert.mockRestore(); s.f.closeAndDelete(); }
});

it('fallback without a photo still completes a sale and displays a truthful missing image state', async () => {
  const s = setup();
  try {
    const { unmount } = render(<SellScreen client={createDatabaseSalesClient(s.f.adapter)} catalogueClient={s.catalogue} />);
    fireEvent.press(screen.getByText('Add product'));
    fireEvent.press(screen.getByText('Continue without photo'));
    fireEvent.changeText(screen.getByTestId('quick-add-price'), '2');
    fireEvent.press(screen.getByText('Add to basket'));
    fireEvent.press(screen.getByText(/Complete sale ·/));
    expect(s.f.adapter.getAllRows('SELECT id FROM sales')).toHaveLength(1);
    expect(s.f.adapter.getAllRows('SELECT id FROM media_assets')).toHaveLength(0);
    unmount();
    const productId = s.f.adapter.getFirstRow<{ id: string }>('SELECT id FROM store_products')!.id;
    const view = render(<ProductPhoto photos={s.photos} productId={productId} />);
    expect(screen.getByText('No identification photo on this device.')).toBeTruthy();
    view.unmount();
  } finally { s.f.closeAndDelete(); }
});

it('a stale photo callback after unmount cannot stage or attach an abandoned photo', async () => {
  const s = setup();
  try {
    const stage = jest.spyOn(s.photos, 'stage');
    const { unmount } = render(<QuickAddProductScreen client={s.catalogue} saleShortcut onSaved={jest.fn()} onCancel={jest.fn()} />);
    await screen.findByText('Take product photo');
    const callback = mockPhotoCallback!;
    unmount();
    act(() => callback('file:///cache/stale.jpg'));
    expect(stage).not.toHaveBeenCalled();
    expect(s.f.adapter.getAllRows('SELECT id FROM media_assets')).toHaveLength(0);
  } finally { s.f.closeAndDelete(); }
});

it('presents two distinct unfinished photos and an enriched photo in actual search/cart without changing receipts', () => {
  const s = setup();
  try {
    const graphs = ['Fanta', '', ''].map(name => s.catalogue.createTemporaryProduct({ name, generateTemporaryLabel: !name,
      defaultSellingPriceMinor: 10000, localPhotoId: s.photos.stage('file:///cache/capture.jpg') }));
    s.catalogue.markProductEnriched({ storeProductId: graphs[0]!.storeProduct.id });
    const sales = createDatabaseSalesClient(s.f.adapter);
    const { unmount } = render(<SellScreen client={sales} catalogueClient={s.catalogue} />);
    for (const graph of graphs) {
      fireEvent.press(screen.getByText(graph.variant.name));
      fireEvent.press(screen.getByText('Add to cart'));
    }
    expect(screen.getByText('Cart (3)')).toBeTruthy();
    expect(screen.getAllByText('Unfinished product')).toHaveLength(2);
    fireEvent.press(screen.getAllByLabelText('Enlarge fanta photo')[0]!);
    expect(screen.getByLabelText('Fanta enlarged photo')).toBeTruthy();
    fireEvent.press(screen.getByText('Close photo'));
    expect(screen.getByText('Cart (3)')).toBeTruthy();
    fireEvent.press(screen.getByText(/^Complete sale ·/));
    const items = s.f.adapter.getAllRows<{ product_name_snapshot: string; quantity_packages_micros: number }>('SELECT product_name_snapshot, quantity_packages_micros FROM sale_items');
    expect(items.map(item => item.product_name_snapshot).sort()).toEqual(graphs.map(graph => graph.variant.name).sort());
    expect(items.every(item => item.quantity_packages_micros === 1000000)).toBe(true);
    expect(graphs.every(graph => s.photos.read(graph.storeProduct.id).status === 'available')).toBe(true);
    unmount();
  } finally { s.f.closeAndDelete(); }
});

it('virtualizes a large catalogue and keeps photo taps separate from product selection', () => {
  const s = setup();
  try {
    s.catalogue.createTemporaryProduct({ name: 'Named', defaultSellingPriceMinor: 100 });
    const template = s.catalogue.listProducts('')[0]!;
    const hits = Array.from({ length: 1000 }, (_, index) => ({ ...template, product: { ...template.product, id: String(index) }, variantName: `Named ${index}`, isTemporary: false }));
    jest.spyOn(s.catalogue, 'listProducts').mockReturnValue(hits);
    const read = jest.spyOn(s.photos, 'read').mockImplementation(id => ({ status: 'available', uri: `file:///private/${id}.jpg` }));
    const open = jest.fn();
    const { rerender, unmount } = render(<ProductsListScreen client={s.catalogue} onOpenProduct={open} onAddProduct={jest.fn()} />);
    expect(read.mock.calls.length).toBeLessThanOrEqual(8);
    const calls = read.mock.calls.length;
    rerender(<ProductsListScreen client={s.catalogue} onOpenProduct={open} onAddProduct={jest.fn()} />);
    expect(read.mock.calls.length).toBe(calls);
    fireEvent.press(screen.getByLabelText('Enlarge named 0 photo'));
    expect(open).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Named 0 enlarged photo')).toBeTruthy();
    fireEvent.press(screen.getByText('Close photo'));
    fireEvent.press(screen.getByText('Named 0'));
    expect(open).toHaveBeenCalledWith('0');
    unmount();
  } finally { s.f.closeAndDelete(); }
});
