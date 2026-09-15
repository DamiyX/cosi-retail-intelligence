import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import RootLayout from '../app/_layout';
import MoreScreen from '../app/(tabs)/more';
import ProductsLayout from '../app/(tabs)/products/_layout';
import ProductDetailRoute from '../app/(tabs)/products/[id]/index';
import ProductsIndexRoute from '../app/(tabs)/products/index';
import QuickAddRoute from '../app/(tabs)/products/new';
import NewPackageRoute from '../app/(tabs)/products/[id]/packages/new';
import EditPackageRoute from '../app/(tabs)/products/[id]/packages/[packageId]';
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
  '(tabs)/products/[id]/packages/new': NewPackageRoute,
  '(tabs)/products/[id]/packages/[packageId]': EditPackageRoute,
} as never;

function openStoreDatabase(): IsolatedDatabase {
  const isolated = openIsolatedDatabase(MIGRATIONS);
  provisionStoreContext(
    isolated.adapter,
    {
      ownerDisplayName: 'Funke A.',
      storeName: 'Funke Provisions',
      currencyCode: 'NGN',
      countryCode: 'NG',
      timezone: 'Africa/Lagos',
      appVersion: '0.0.1',
    },
    { generateId: deterministicIds(2000) },
  );
  return isolated;
}

describe('M2 product shell', () => {
  beforeEach(() => {
    mockDatabase = openStoreDatabase();
  });

  afterEach(() => {
    mockDatabase?.closeAndDelete();
    mockDatabase = null;
  });

  it('opens Products with the empty state and reaches Quick Add', async () => {
    renderRouter(ROUTES, { initialUrl: '/products' });
    expect(await screen.findByText('No products yet')).toBeTruthy();
    fireEvent.press(screen.getAllByText('Add product')[0]);
    expect(
      await screen.findByText('Only a name is required. The product saves on this device.'),
    ).toBeTruthy();
  });

  it('offers Quick Add with the query as the proposed name on no match', async () => {
    renderRouter(ROUTES, { initialUrl: '/products' });
    expect(await screen.findByText('No products yet')).toBeTruthy();
    fireEvent.changeText(screen.getByPlaceholderText('Search name, local SKU, or barcode'), 'Zobo Mix');
    expect(await screen.findByText('No matching product')).toBeTruthy();
    fireEvent.press(screen.getAllByText('Add product')[0]);
    const nameInput = await screen.findByTestId('quick-add-name');
    expect(nameInput.props.value).toBe('Zobo Mix');
    expect(nameInput.props.value).not.toBe('');
  });

  it('saves a quick-add product offline and lands on its detail with local save state', async () => {
    const router = renderRouter(ROUTES, { initialUrl: '/products/new' });
    fireEvent.changeText(screen.getByTestId('quick-add-name'), 'Milo 400g');
    fireEvent.press(screen.getByText('Save product'));
    expect(await screen.findByText('Saved on this device. It has not been sent anywhere.')).toBeTruthy();
    expect(screen.getByText('Milo 400g')).toBeTruthy();
    expect(screen.getByText(/Temporary — an incomplete record/)).toBeTruthy();
    expect(router.getPathname()).toMatch(/^\/products\//);
  });

  it('adds a package from product detail and shows its exact conversion on return', async () => {
    const router = renderRouter(ROUTES, { initialUrl: '/products/new' });
    fireEvent.changeText(screen.getByTestId('quick-add-name'), 'Indomie 70g');
    fireEvent.press(screen.getByText('Save product'));
    expect(await screen.findByText('Saved on this device. It has not been sent anywhere.')).toBeTruthy();
    const detailPath = router.getPathname();
    expect(detailPath).toMatch(/^\/products\//);
    fireEvent.press(screen.getByText('Add package'));
    expect(await screen.findByText('Add package')).toBeTruthy();
    fireEvent.changeText(screen.getByTestId('package-name'), 'carton');
    fireEvent.changeText(screen.getByTestId('package-conversion'), '40');
    expect(await screen.findByText('1 carton = 40 piece')).toBeTruthy();
    fireEvent.press(screen.getByText('Save package'));
    expect(await screen.findByText('1 carton = 40 base units')).toBeTruthy();
    expect(router.getPathname()).toBe(detailPath);
  });

  it('keeps later-milestone areas as clearly labelled placeholders', async () => {
    renderRouter(ROUTES, { initialUrl: '/sell' });
    expect(await screen.findByText(/arrive in milestone M3/)).toBeTruthy();
  });

  it('provisions a local store from a fresh database and reaches Products', async () => {
    mockDatabase?.closeAndDelete();
    mockDatabase = openIsolatedDatabase(MIGRATIONS);
    renderRouter(ROUTES, { initialUrl: '/products' });
    expect(await screen.findByText('Set up this store')).toBeTruthy();
    fireEvent.changeText(screen.getByTestId('setup-owner-name'), 'Ada');
    fireEvent.changeText(screen.getByTestId('setup-store-name'), 'Ada Provisions');
    fireEvent.press(screen.getByText('Create local store'));
    expect(await screen.findByText('No products yet')).toBeTruthy();
  });
});
