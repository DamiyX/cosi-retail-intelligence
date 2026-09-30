import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { createCatalogueClient } from '../src/catalogue/client';
import type { CatalogueLookupAdapter, LookupResult } from '../src/catalogue/lookup/provider';
import ProductDetailScreen from '../src/screens/products/ProductDetailScreen';
import QuickAddProductScreen from '../src/screens/products/QuickAddProductScreen';
import { deterministicIds, openCatalogueFixture } from './catalogueSupport';

const code = { value: '5449000011527', type: 'EAN' as const };
const found: LookupResult = { status: 'FOUND', details: { barcode: code.value, name: 'Suggested Fanta', brand: 'Fanta', size: '330 ml', source: 'Open Food Facts', sourceUrl: 'https://world.openfoodfacts.org/product/5449000011527', licenceUrl: 'https://opendatacommons.org/licenses/odbl/1-0/' } };
beforeEach(() => { AppState.currentState = 'active'; });
const props = { onBack: jest.fn(), onAddPackage: jest.fn(), onEditPackage: jest.fn() };

it('unsaved Add product offline copy makes no saved-product claim', async () => {
  const f = openCatalogueFixture();
  const client = createCatalogueClient(f.adapter, f.context.store, f.context.device, deterministicIds(1000), undefined, { enabled: true, lookup: async () => ({ status: 'OFFLINE' }) });
  try {
    render(<QuickAddProductScreen client={client} onSaved={jest.fn()} onCancel={jest.fn()} />);
    fireEvent.press(screen.getByText('Add more details'));
    fireEvent.changeText(screen.getByTestId('quick-add-barcode'), code.value);
    expect(await screen.findByText('Online details are unavailable while offline. You can enter details yourself.')).toBeTruthy();
    expect(f.adapter.getAllRows('SELECT id FROM store_products')).toHaveLength(0);
  } finally { f.closeAndDelete(); }
});

it('later details remain unconfirmed until explicit Use details and Save changes; photo/price/package facts are untouched', async () => {
  const f = openCatalogueFixture();
  const adapter: CatalogueLookupAdapter = { enabled: true, lookup: async () => found };
  const client = createCatalogueClient(f.adapter, f.context.store, f.context.device, deterministicIds(1000), undefined, adapter);
  try {
    const graph = client.createTemporaryProduct({ name: 'Unfinished item', defaultSellingPriceMinor: 225, lookupCode: code });
    await client.suggestions!.refresh(graph.storeProduct.id, new AbortController().signal);
    render(<ProductDetailScreen client={client} productId={graph.storeProduct.id} {...props} />);
    expect(await screen.findByText('Suggested Fanta')).toBeTruthy();
    expect(client.getProductDetail(graph.storeProduct.id)!.variant.name).toBe('Unfinished item');
    expect(screen.queryByTestId('detail-name')).toBeNull();
    fireEvent.press(screen.getByText('Use details'));
    expect(screen.getByTestId('detail-name').props.value).toBe('Suggested Fanta');
    expect(client.getProductDetail(graph.storeProduct.id)!.variant.name).toBe('Unfinished item');
    fireEvent.press(screen.getByText('Save changes'));
    expect(client.getProductDetail(graph.storeProduct.id)!.variant.name).toBe('Suggested Fanta');
    expect(client.suggestions!.read(graph.storeProduct.id)?.status).toBe('ACCEPTED');
    expect(client.getProductDetail(graph.storeProduct.id)!.product.defaultSellingPriceMinor).toBe(225);
    expect(client.getProductDetail(graph.storeProduct.id)!.packages).toEqual([graph.basePackage]);
  } finally { f.closeAndDelete(); }
});

it('Edit suggested details fills an actual editable value and saves the retailer correction', async () => {
  const f = openCatalogueFixture();
  const client = createCatalogueClient(f.adapter, f.context.store, f.context.device, deterministicIds(1000), undefined, { enabled: true, lookup: async () => found });
  try {
    const graph = client.createTemporaryProduct({ name: 'Unfinished', lookupCode: code });
    await client.suggestions!.refresh(graph.storeProduct.id, new AbortController().signal);
    render(<ProductDetailScreen client={client} productId={graph.storeProduct.id} {...props} />);
    fireEvent.press(await screen.findByText('Use details'));
    fireEvent.changeText(screen.getByTestId('detail-name'), 'My Fanta bottle');
    fireEvent.press(screen.getByText('Save changes'));
    expect(client.getProductDetail(graph.storeProduct.id)!.variant.name).toBe('My Fanta bottle');
    expect(client.suggestions!.read(graph.storeProduct.id)?.status).toBe('CORRECTED');
    expect(screen.queryByText('Use details')).toBeNull();
  } finally { f.closeAndDelete(); }
});

it('ordinary Add product can prefill or dismiss a ready suggestion without a new screen', async () => {
  const f = openCatalogueFixture();
  const client = createCatalogueClient(f.adapter, f.context.store, f.context.device, deterministicIds(1000), undefined, { enabled: true, lookup: async () => found });
  const onSaved = jest.fn();
  try {
    render(<QuickAddProductScreen client={client} onSaved={onSaved} onCancel={jest.fn()} />);
    fireEvent.changeText(screen.getByTestId('quick-add-name'), 'My existing text');
    fireEvent.press(screen.getByText('Add more details'));
    fireEvent.changeText(screen.getByTestId('quick-add-barcode'), code.value);
    await screen.findByText('Use details');
    expect(screen.getByTestId('quick-add-name').props.value).toBe('My existing text');
    fireEvent.press(screen.getByText('Use details'));
    expect(screen.getByTestId('quick-add-name').props.value).toBe('Suggested Fanta');
    fireEvent.changeText(screen.getByTestId('quick-add-name'), 'Corrected by retailer');
    fireEvent.press(screen.getByText('Save product'));
    const id = onSaved.mock.calls[0][0] as string;
    expect(client.getProductDetail(id)!.variant.name).toBe('Corrected by retailer');
    expect(client.suggestions!.read(id)?.status).toBe('CORRECTED');
    await act(async () => { await client.suggestions!.refresh(id, new AbortController().signal); });
  } finally { f.closeAndDelete(); }
});

it('a dismissed inline suggestion remains dismissed after creating the product', async () => {
  const f = openCatalogueFixture();
  const client = createCatalogueClient(f.adapter, f.context.store, f.context.device, deterministicIds(1000), undefined, { enabled: true, lookup: async () => found });
  const onSaved = jest.fn();
  try {
    render(<QuickAddProductScreen client={client} onSaved={onSaved} onCancel={jest.fn()} />);
    fireEvent.changeText(screen.getByTestId('quick-add-name'), 'My name');
    fireEvent.press(screen.getByText('Add more details'));
    fireEvent.changeText(screen.getByTestId('quick-add-barcode'), code.value);
    fireEvent.press(await screen.findByText('Dismiss suggestion'));
    fireEvent.press(screen.getByText('Save product'));
    const id = onSaved.mock.calls[0][0] as string;
    await act(async () => { await client.suggestions!.refresh(id, new AbortController().signal); });
    expect(client.suggestions!.read(id)?.status).toBe('DISMISSED');
  } finally { f.closeAndDelete(); }
});

it('late results cannot overwrite manual edits or update a cancelled/unmounted screen', async () => {
  const f = openCatalogueFixture(); let resolve!: (value: LookupResult) => void;
  const pending = new Promise<LookupResult>(r => { resolve = r; });
  const lookup = jest.fn(() => pending);
  const client = createCatalogueClient(f.adapter, f.context.store, f.context.device, deterministicIds(1000), undefined, { enabled: true, lookup });
  try {
    const view = render(<QuickAddProductScreen client={client} onSaved={jest.fn()} onCancel={jest.fn()} />);
    fireEvent.press(screen.getByText('Add more details'));
    fireEvent.changeText(screen.getByTestId('quick-add-barcode'), code.value);
    await waitFor(() => expect(lookup).toHaveBeenCalledTimes(1));
    fireEvent.changeText(screen.getByTestId('quick-add-name'), 'Typed while waiting');
    await act(async () => { resolve(found); await pending; });
    expect(screen.getByTestId('quick-add-name').props.value).toBe('Typed while waiting');
    view.unmount();
    expect(f.adapter.getAllRows('SELECT * FROM store_products')).toHaveLength(0);
    expect(f.adapter.getAllRows('SELECT * FROM catalogue_lookup_suggestions')).toHaveLength(0);
  } finally { f.closeAndDelete(); }
});
