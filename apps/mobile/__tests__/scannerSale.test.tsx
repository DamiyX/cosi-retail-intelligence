import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text as MockText } from 'react-native';
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
