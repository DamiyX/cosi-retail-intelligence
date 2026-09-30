import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert, Text as MockText } from 'react-native';
import { createCatalogueClient } from '../src/catalogue/client';
import { createTemporaryProduct } from '../src/catalogue/createTemporaryProduct';
import { createDatabaseSalesClient } from '../src/sales/client';
import SellScreen from '../src/screens/sales/SellScreen';
import type { BarcodeCameraProps } from '../src/features/scanning/BarcodeCamera';
import { deterministicIds, openCatalogueFixture } from './catalogueSupport';

const mockBeep = jest.fn();
jest.mock('../src/features/scanning/useScanFeedback', () => ({ useScanFeedback: () => mockBeep }));
jest.mock('../src/features/scanning/BarcodeCamera', () => ({
  __esModule: true,
  default: ({ onDetection, active }: BarcodeCameraProps) => <>
    <MockText onPress={() => { if (active) onDetection({ symbology: 'upc_a', value: '036000291452' }); }}>Scan A</MockText>
    <MockText onPress={() => { if (active) onDetection({ symbology: 'qr', value: 'B' }); }}>Scan B</MockText>
  </>,
}));

it('adds A-A-A once, A-B twice, explicit A again once, and Undo without completing a sale', async () => {
  const fixture = openCatalogueFixture();
  try {
    for (const [name, barcode, barcodeType, start] of [['A', '036000291452', 'UPC', 1000], ['B', 'B', 'QR', 2000]] as const) {
      createTemporaryProduct(fixture.adapter, { storeId: fixture.context.store.id, deviceId: fixture.context.device.id,
        name, barcode, barcodeType, barcodeForBasePackage: true, defaultSellingPriceMinor: 10000 }, { generateId: deterministicIds(start) });
    }
    const { unmount } = render(<SellScreen client={createDatabaseSalesClient(fixture.adapter)} initialScan automaticScanAdditionVerified />);
    fireEvent.press(screen.getByText('Mode: Single item — switch to Basket'));
    await screen.findByText('Scan A');
    for (let i = 0; i < 3; i++) await act(async () => { fireEvent.press(screen.getByText('Scan A')); });
    expect(screen.getByText(/1 lines · ₦100.00/)).toBeTruthy();
    expect(mockBeep).toHaveBeenCalledTimes(1);
    await act(async () => { fireEvent.press(screen.getByText('Scan B')); });
    expect(screen.getByText(/2 lines · ₦200.00/)).toBeTruthy();
    fireEvent.press(screen.getByText('Scan again'));
    await act(async () => { fireEvent.press(screen.getByText('Scan A')); });
    expect(screen.getByText(/3 lines · ₦300.00/)).toBeTruthy();
    expect(mockBeep).toHaveBeenCalledTimes(3);
    fireEvent.press(screen.getByText('Undo last addition'));
    expect(screen.getByText(/2 lines · ₦200.00/)).toBeTruthy();
    expect(fixture.adapter.getFirstRow<{ count: number }>('SELECT count(*) AS count FROM sales')?.count).toBe(0);
    unmount();
  } finally { fixture.closeAndDelete(); }
});

it('cancelling an unknown item preserves the existing basket and ends only that scan intent', async () => {
  const fixture = openCatalogueFixture();
  try {
    createTemporaryProduct(fixture.adapter, { storeId: fixture.context.store.id, deviceId: fixture.context.device.id,
      name: 'A', barcode: '036000291452', barcodeType: 'UPC', barcodeForBasePackage: true, defaultSellingPriceMinor: 10000 }, { generateId: deterministicIds(1000) });
    const { unmount } = render(<SellScreen client={createDatabaseSalesClient(fixture.adapter)} initialScan automaticScanAdditionVerified scanAssociationsVerified />);
    fireEvent.press(screen.getByText('Mode: Single item — switch to Basket'));
    await screen.findByText('Scan A');
    await act(async () => { fireEvent.press(screen.getByText('Scan A')); });
    await act(async () => { fireEvent.press(screen.getByText('Scan B')); });
    fireEvent.press(screen.getByText(screen.queryByText('Scan a product') ? 'Sell this item' : 'Add product'));
    fireEvent.press(screen.getByText('Cancel'));
    expect(screen.getByText('Cart (1)')).toBeTruthy();
    expect(screen.queryByText('Scan a product')).toBeNull();
    expect(mockBeep).toHaveBeenCalledTimes(1);
    expect(fixture.adapter.getAllRows('SELECT id FROM product_identifiers')).toHaveLength(1);
    unmount();
  } finally { fixture.closeAndDelete(); }
});

it('keeps automatic additions disabled by default and asks for package/price confirmation', async () => {
  const fixture = openCatalogueFixture();
  try {
    createTemporaryProduct(fixture.adapter, { storeId: fixture.context.store.id, deviceId: fixture.context.device.id,
      name: 'A', barcode: '036000291452', barcodeType: 'UPC' }, { generateId: deterministicIds(1000) });
    const { unmount } = render(<SellScreen client={createDatabaseSalesClient(fixture.adapter)} initialScan />);
    fireEvent.press(screen.getByText('Mode: Single item — switch to Basket'));
    await screen.findByText('Scan A');
    await act(async () => { fireEvent.press(screen.getByText('Scan A')); });
    expect(screen.getByText('Add to sale')).toBeTruthy();
    expect(screen.getByTestId('line-price-input').props.value).toBe('');
    expect(mockBeep).not.toHaveBeenCalled();
    unmount();
  } finally { fixture.closeAndDelete(); }
});

it('audit: cancelling unknown creation clears its barcode from subsequent manual creation', async () => {
  const fixture = openCatalogueFixture();
  try {
    const { unmount } = render(<SellScreen client={createDatabaseSalesClient(fixture.adapter)} initialScan scanAssociationsVerified />);
    await screen.findByText('Scan B');
    await act(async () => { fireEvent.press(screen.getByText('Scan B')); });
    fireEvent.press(screen.getByText(screen.queryByText('Scan a product') ? 'Sell this item' : 'Add product'));
    expect(screen.getByText('Scanned QR: B')).toBeTruthy();
    fireEvent.press(screen.getByText('Cancel'));
    fireEvent.press(screen.getByText(screen.queryByText('Scan a product') ? 'Sell this item' : 'Add product'));
    expect(screen.queryByText('Scanned QR: B')).toBeNull();
    fireEvent.changeText(screen.getByTestId('quick-add-price'), '2');
    fireEvent.press(screen.getByText('Add to basket'));
    expect(fixture.adapter.getFirstRow<{ count: number }>('SELECT count(*) AS count FROM product_identifiers')?.count).toBe(0);
    unmount();
  } finally { fixture.closeAndDelete(); }
});

for (const exit of ['line cancel', 'dirty line discard', 'dirty product discard', 'cart discard', 'new sale'] as const) {
  it(`ends scan intent on ${exit}, preserves intended search selection, and never saves a stale code`, async () => {
    const fixture = openCatalogueFixture();
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    try {
      const catalogue = createCatalogueClient(fixture.adapter, fixture.context.store, fixture.context.device, deterministicIds(1000));
      const a = catalogue.createTemporaryProduct({ name: 'Existing A', defaultSellingPriceMinor: 10000 });
      const { unmount } = render(<SellScreen client={createDatabaseSalesClient(fixture.adapter)} catalogueClient={catalogue}
        initialScan scanAssociationsVerified />);
      fireEvent.press(screen.getByText('Mode: Single item — switch to Basket'));
      await screen.findByText('Scan B');
      await act(async () => { fireEvent.press(screen.getByText('Scan B')); });
      if (exit === 'dirty product discard') {
        fireEvent.press(screen.getByText(screen.queryByText('Scan a product') ? 'Sell this item' : 'Add product'));
        fireEvent.changeText(screen.getByTestId('quick-add-price'), '2');
        fireEvent.press(screen.getByText('Cancel'));
      } else {
        fireEvent.press(screen.getByText('Search products'));
        fireEvent.press(screen.getByText('Existing A'));
        expect(screen.getByText('Scanned QR: B')).toBeTruthy();
        if (exit === 'dirty line discard') fireEvent.changeText(screen.getByTestId('line-quantity-input'), '2');
        if (exit === 'cart discard' || exit === 'new sale') {
          fireEvent.press(screen.getByText('Save barcode for this product and selected package'));
          expect(fixture.adapter.getFirstRow<{ value: string; product_variant_id: string }>('SELECT value, product_variant_id FROM product_identifiers')).toMatchObject({ value: 'B', product_variant_id: a.variant.id });
          fireEvent.press(screen.getByText('Add to cart'));
          expect(screen.getByText(/1 lines/)).toBeTruthy();
          fireEvent.press(screen.getByText('Back to basket'));
          if (exit === 'cart discard') fireEvent.press(screen.getByLabelText('Discard sale'));
          else {
            fireEvent.press(screen.getByText(/Complete sale ·/));
            fireEvent.press(screen.getByText('New sale'));
          }
        } else fireEvent.press(screen.getByText('Cancel'));
      }
      if (exit.includes('dirty') || exit === 'cart discard') {
        const discard = alert.mock.calls.at(-1)?.[2]?.find(button => button.text === 'Discard');
        expect(discard).toBeDefined();
        act(() => { discard?.onPress?.(); });
      }
      fireEvent.changeText(screen.getByPlaceholderText('Search name, local SKU, or barcode'), 'Unrelated');
      fireEvent.press(screen.getByText(screen.queryByText('Scan a product') ? 'Sell this item' : 'Add product'));
      expect(screen.queryByText('Scanned QR: B')).toBeNull();
      fireEvent.changeText(screen.getByTestId('quick-add-price'), '2');
      fireEvent.press(screen.getByText('Add to basket'));
      expect(screen.getByText('Cart (1)')).toBeTruthy(); // no stale basket-mode resume
      expect(screen.queryByText('Scan a product')).toBeNull();
      const identifiers = fixture.adapter.getAllRows<{ product_variant_id: string }>('SELECT product_variant_id FROM product_identifiers');
      expect(identifiers.every(row => row.product_variant_id === a.variant.id)).toBe(true);
      expect(identifiers).toHaveLength(exit === 'cart discard' || exit === 'new sale' ? 1 : 0);
      unmount();
    } finally { alert.mockRestore(); fixture.closeAndDelete(); }
  });
}
