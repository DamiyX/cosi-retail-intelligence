import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import RootLayout from '../app/_layout';
import MoreScreen from '../app/(tabs)/more';
import ProductsLayout from '../app/(tabs)/products/_layout';
import ProductDetailRoute from '../app/(tabs)/products/[id]/index';
import ProductsIndexRoute from '../app/(tabs)/products/index';
import QuickAddRoute from '../app/(tabs)/products/new';
import SellScreen from '../app/(tabs)/sell';
import TabsLayout from '../app/(tabs)/_layout';
import TodayScreen from '../app/(tabs)/today';
import type { IsolatedDatabase } from '../src/db/testing';
import { openIsolatedDatabase } from '../src/db/testing';
import { MIGRATIONS } from '../src/db';
import { provisionStoreContext } from '../src/storeContext/provisionStoreContext';
import { deterministicIds } from './catalogueSupport';

let mockDatabase: IsolatedDatabase | null = null;

jest.mock('../src/db/initialize', () => ({
  initializeAppDatabase: () => {
    if (!mockDatabase) {
      throw new Error('Shell test database is not open.');
    }
    return { state: 'ready', adapter: mockDatabase.adapter, schemaVersion: 2, path: mockDatabase.path };
  },
}));

const ROUTES = {
  _layout: RootLayout,
  '(tabs)/_layout': TabsLayout,
  '(tabs)/today': TodayScreen,
  '(tabs)/sell': SellScreen,
  '(tabs)/more': MoreScreen,
  '(tabs)/products/_layout': ProductsLayout,
  '(tabs)/products/index': ProductsIndexRoute,
  '(tabs)/products/new': QuickAddRoute,
  '(tabs)/products/[id]/index': ProductDetailRoute,
} as never;

describe('M2 tab navigation', () => {
  beforeEach(() => {
    mockDatabase = openIsolatedDatabase(MIGRATIONS);
    provisionStoreContext(
      mockDatabase.adapter,
      {
        ownerDisplayName: 'Funke A.',
        storeName: 'Funke Provisions',
        currencyCode: 'NGN',
        countryCode: 'NG',
        timezone: 'Africa/Lagos',
        appVersion: '0.0.1',
      },
      { generateId: deterministicIds(3000) },
    );
  });

  afterEach(() => {
    mockDatabase?.closeAndDelete();
    mockDatabase = null;
  });

  it('switches between Products and the later-milestone placeholders', async () => {
    const router = renderRouter(ROUTES, { initialUrl: '/products' });
    expect(await screen.findByText('No products yet')).toBeTruthy();

    fireEvent.press(screen.getByLabelText(/Sell, tab/));
    expect(await screen.findByText(/arrive in milestone M3/)).toBeTruthy();
    expect(router.getPathname()).toBe('/sell');

    fireEvent.press(screen.getByLabelText(/Today, tab/));
    expect(await screen.findByText(/arrives in a\s*later milestone/)).toBeTruthy();

    fireEvent.press(screen.getByLabelText(/More, tab/));
    expect(await screen.findByText(/arrives with its milestone/)).toBeTruthy();

    fireEvent.press(screen.getByLabelText(/Products, tab/));
    expect(await screen.findByText('No products yet')).toBeTruthy();
    expect(router.getPathname()).toBe('/products');
  });
});
