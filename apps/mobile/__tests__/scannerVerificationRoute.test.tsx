import type { ReactNode } from 'react';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Text as MockText } from 'react-native';
import SellRoute from '../app/sell';
import { createTemporaryProduct } from '../src/catalogue/createTemporaryProduct';
import { createDatabaseSalesClient, type SalesClient } from '../src/sales/client';
import type { BarcodeCameraProps } from '../src/features/scanning/BarcodeCamera';
import { deterministicIds, openCatalogueFixture } from './catalogueSupport';

let mockClient: SalesClient;
let mockVerification = false;
jest.mock('expo-constants', () => ({ __esModule: true, default: { get expoConfig() {
  return { extra: { appEnvironment: mockVerification ? 'scanner-verification' : 'production', scannerVerificationBuild: mockVerification },
    android: { package: mockVerification ? 'com.damiyx.retailintelligence.scannerverification' : 'com.damiyx.retailintelligence' } };
} } }));
jest.mock('../src/sales/SalesContext', () => ({
  SalesProvider: ({ children }: { children: ReactNode }) => children,
  useSales: () => ({ client: mockClient, availability: 'ready', catalogueClient: null }),
}));
jest.mock('../src/features/scanning/useScanFeedback', () => ({ useScanFeedback: () => () => undefined }));
jest.mock('../src/features/scanning/BarcodeCamera', () => ({ __esModule: true,
  default: ({ active, onDetection }: BarcodeCameraProps) => <MockText onPress={() => {
    if (active) onDetection({ symbology: 'upc_a', value: '036000291452' });
  }}>Route scan</MockText>,
}));

it.each([false, true])('actual sell route enables fast addition only for verification=%s', async verification => {
  const fixture = openCatalogueFixture();
  try {
    mockVerification = verification;
    createTemporaryProduct(fixture.adapter, { storeId: fixture.context.store.id, deviceId: fixture.context.device.id,
      name: 'Route product', barcode: '036000291452', barcodeType: 'UPC', barcodeForBasePackage: true, defaultSellingPriceMinor: 10000 },
    { generateId: deterministicIds(1000) });
    mockClient = createDatabaseSalesClient(fixture.adapter);
    const view = renderRouter({ sell: SellRoute }, { initialUrl: '/sell?scan=1' });
    await screen.findByText('Route scan');
    expect(Boolean(screen.queryByText('Scanner verification build — automatic basket additions enabled'))).toBe(verification);
    fireEvent.press(screen.getByText('Mode: Single item — switch to Basket'));
    await act(async () => { fireEvent.press(screen.getByText('Route scan')); });
    if (verification) expect(screen.getByText(/1 lines · ₦100.00/)).toBeTruthy();
    else expect(screen.getByText('Add to sale')).toBeTruthy();
    view.unmount();
  } finally { fixture.closeAndDelete(); }
});
