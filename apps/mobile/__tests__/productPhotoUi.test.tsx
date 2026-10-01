import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { createCatalogueClient } from '../src/catalogue/client';
import { createDatabaseSalesClient } from '../src/sales/client';
import { type PhotoFiles } from '../src/media/productPhotos';
import type { ProductPhotoCameraProps } from '../src/media/ProductPhotoCamera';
import ProductPhoto from '../src/media/ProductPhoto';
import ProductsListScreen from '../src/screens/products/ProductsListScreen';
import QuickAddProductScreen from '../src/screens/products/QuickAddProductScreen';
import ProductDetailScreen from '../src/screens/products/ProductDetailScreen';
import SellScreen from '../src/screens/sales/SellScreen';
import { deterministicIds, openCatalogueFixture } from './catalogueSupport';
let mockPhotoCallback: ((uri: string) => void) | undefined;
let mockCameraUnavailable = false;
jest.mock('../src/media/ProductPhotoCamera', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return { __esModule: true, default: ({ onCaptured }: ProductPhotoCameraProps) => {
    if (mockCameraUnavailable) throw new Error('Native camera module unavailable');
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

it('ordinary named onboarding previews/retakes and retries a committed save without duplicating product/photo/outbox', async () => {
  const s = setup();
  try {
    const saved = jest.fn().mockImplementationOnce(() => { throw new Error('navigation interrupted after save'); });
    const { unmount } = render(<QuickAddProductScreen client={s.catalogue} onSaved={saved} onCancel={jest.fn()} />);
    fireEvent.changeText(screen.getByTestId('quick-add-name'), 'Named product');
    fireEvent.press(screen.getByText('Add product photo'));
    await screen.findByText('Take product photo'); fireEvent.press(screen.getByText('Take product photo'));
    const first = screen.getByLabelText('Product photo preview').props.source.uri;
    fireEvent.press(screen.getByText('Retake product photo'));
    fireEvent.press(screen.getByText('Cancel'));
    expect(screen.getByLabelText('Product photo preview').props.source.uri).toBe(first);
    fireEvent.press(screen.getByText('Retake product photo'));
    await screen.findByText('Take product photo'); fireEvent.press(screen.getByText('Take product photo'));
    expect(screen.getByLabelText('Product photo preview').props.source.uri).not.toBe(first);
    expect(s.saved.size).toBe(1);
    fireEvent.press(screen.getByText('Save product'));
    fireEvent.press(screen.getByText('Try again'));
    expect(saved).toHaveBeenCalledTimes(2);
    expect(saved.mock.calls[1]![0]).toBe(saved.mock.calls[0]![0]);
    expect(s.f.adapter.getAllRows('SELECT id FROM store_products')).toHaveLength(1);
    expect(s.f.adapter.getAllRows('SELECT operation_id FROM outbox_operations')).toHaveLength(1);
    expect(s.f.adapter.getAllRows('SELECT id FROM media_assets')).toHaveLength(1);
    expect(s.photos.read(saved.mock.calls[0]![0]).status).toBe('available');
    unmount(); expect(s.saved.size).toBe(1);
  } finally { s.f.closeAndDelete(); }
});

it.each([false, true])('detail edits photos on temporary/enriched records (enriched=%s) and keeps the old attachment on cancel/failure', async enriched => {
  const s = setup();
  try {
    const graph = s.catalogue.createTemporaryProduct({ name: 'Detail product', localPhotoId: s.photos.stage('file:///cache/capture.jpg'), defaultSellingPriceMinor: 100 });
    if (enriched) s.catalogue.markProductEnriched({ storeProductId: graph.storeProduct.id });
    const productId = graph.storeProduct.id;
    const old = s.photos.read(productId).uri;
    const sale = createDatabaseSalesClient(s.f.adapter).completeSale({ lines: [{ storeProductId: productId, packageUnitId: graph.basePackage.id, quantityPackagesMicros: 1000000, unitPriceMinor: 100 }], payment: { method: 'CASH' } });
    const snapshots = s.f.adapter.getAllRows('SELECT * FROM sale_items WHERE sale_id = ?', [sale.sale.id]);
    const { unmount } = render(<ProductDetailScreen client={s.catalogue} productId={productId} onBack={jest.fn()} onAddPackage={jest.fn()} onEditPackage={jest.fn()} />);
    fireEvent.press(screen.getByText('Change photo'));
    await screen.findByText('Take product photo'); fireEvent.press(screen.getByText('Take product photo'));
    const stale = mockPhotoCallback!;
    fireEvent.press(screen.getByText('Cancel'));
    expect(s.photos.read(productId).uri).toBe(old);
    act(() => stale('file:///cache/abandoned.jpg'));
    expect(s.saved.size).toBe(1);
    fireEvent.press(screen.getByText('Change photo'));
    await screen.findByText('Take product photo'); fireEvent.press(screen.getByText('Take product photo'));
    const replace = jest.spyOn(s.photos, 'replace').mockImplementationOnce(() => { throw new Error('SQL full'); });
    fireEvent.press(screen.getByText('Save photo'));
    expect(screen.getByText('Photo not saved')).toBeTruthy();
    expect(s.photos.read(productId).uri).toBe(old);
    fireEvent.press(screen.getByText('Try again'));
    replace.mockRestore();
    expect(s.photos.read(productId).uri).not.toBe(old);
    expect(screen.getByLabelText('Product identification photo').props.source.uri).toBe(s.photos.read(productId).uri);
    expect(s.f.adapter.getAllRows('SELECT * FROM sale_items WHERE sale_id = ?', [sale.sale.id])).toEqual(snapshots);
    expect(s.f.adapter.getAllRows('SELECT id FROM store_products')).toHaveLength(1);
    unmount();
  } finally { s.f.closeAndDelete(); }
});

it('detail Add photo supports a no-photo product and drops captured callbacks after store switch', async () => {
  const s = setup();
  try {
    const graph = s.catalogue.createTemporaryProduct({ name: 'No photo' });
    const view = render(<ProductDetailScreen client={s.catalogue} productId={graph.storeProduct.id} onBack={jest.fn()} onAddPackage={jest.fn()} onEditPackage={jest.fn()} />);
    fireEvent.press(screen.getByText('Add photo'));
    await screen.findByText('Take product photo'); fireEvent.press(screen.getByText('Take product photo'));
    fireEvent.press(screen.getByText('Save photo'));
    expect(s.photos.read(graph.storeProduct.id).status).toBe('available');
    fireEvent.press(screen.getByText('Change photo'));
    await screen.findByText('Take product photo'); const staleDetail = mockPhotoCallback!;
    const next = s.catalogue.createTemporaryProduct({ name: 'Next product' });
    const detailStage = jest.spyOn(s.photos, 'stage');
    view.rerender(<ProductDetailScreen client={s.catalogue} productId={next.storeProduct.id} onBack={jest.fn()} onAddPackage={jest.fn()} onEditPackage={jest.fn()} />);
    act(() => staleDetail('file:///cache/wrong-product.jpg'));
    expect(detailStage).not.toHaveBeenCalled();
    expect(screen.getByText('Next product')).toBeTruthy();
    expect(s.photos.read(next.storeProduct.id).status).toBe('none');
    detailStage.mockRestore(); view.unmount();
    const quick = render(<QuickAddProductScreen client={s.catalogue} saleShortcut onSaved={jest.fn()} onCancel={jest.fn()} />);
    await screen.findByText('Take product photo'); const stale = mockPhotoCallback!;
    const stage = jest.spyOn(s.photos, 'stage');
    quick.rerender(<QuickAddProductScreen client={{ ...s.catalogue, storeId: 'different-store' }} saleShortcut onSaved={jest.fn()} onCancel={jest.fn()} />);
    act(() => stale('file:///cache/wrong-store.jpg'));
    expect(stage).not.toHaveBeenCalled(); quick.unmount();
  } finally { s.f.closeAndDelete(); }
});

it('ordinary named creation still saves without a photo when the camera module is unavailable', async () => {
  const s = setup();
  const errors = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  try {
    mockCameraUnavailable = true;
    const saved = jest.fn();
    const view = render(<QuickAddProductScreen client={s.catalogue} onSaved={saved} onCancel={jest.fn()} />);
    fireEvent.changeText(screen.getByTestId('quick-add-name'), 'Manual product');
    fireEvent.press(screen.getByText('Add product photo'));
    await screen.findByText('Photo camera unavailable in this build. Continue without photo.');
    fireEvent.press(screen.getByText('Continue without photo'));
    fireEvent.press(screen.getByText('Save product'));
    expect(saved).toHaveBeenCalledTimes(1);
    expect(s.photos.read(saved.mock.calls[0]![0]).status).toBe('none');
    expect(s.f.adapter.getAllRows('SELECT id FROM media_assets')).toHaveLength(0);
    expect(s.f.adapter.getAllRows('SELECT id FROM store_products')).toHaveLength(1);
    view.unmount();
  } finally { mockCameraUnavailable = false; errors.mockRestore(); s.f.closeAndDelete(); }
});
