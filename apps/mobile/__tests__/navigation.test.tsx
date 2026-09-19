import { act, fireEvent, renderRouter, screen, testRouter } from 'expo-router/testing-library';
import { Alert, BackHandler } from 'react-native';

import RootLayout from '../app/_layout';
import IndexRoute from '../app/index';
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
import RestockRoute from '../app/restock';
import PurchaseHistoryRoute from '../app/purchase-history';
import PurchaseDetailRoute from '../app/purchases/[id]';
import BatchReviewRoute from '../app/batch-review';
import AdjustmentRoute from '../app/adjustment';
import ReconciliationRoute from '../app/reconciliation';
import GuidedChecksRoute from '../app/guided-checks';
import AttentionRoute from '../app/attention';
import ExpenseEntryRoute from '../app/expense';
import ExpenseHistoryRoute from '../app/expenses';
import OwnerWithdrawalEntryRoute from '../app/withdrawal';
import OwnerWithdrawalHistoryRoute from '../app/withdrawals';
import BusinessSummaryRoute from '../app/summary';
import type { IsolatedDatabase } from '../src/db/testing';
import { createTemporaryProduct } from '../src/catalogue/createTemporaryProduct';
import { openIsolatedDatabase } from '../src/db/testing';
import { CURRENT_SCHEMA_VERSION, MIGRATIONS } from '../src/db';
import { provisionStoreContext } from '../src/storeContext/provisionStoreContext';
import { deterministicIds } from './catalogueSupport';

let mockDatabase: IsolatedDatabase | null = null;
const mockSchemaVersion = CURRENT_SCHEMA_VERSION;

jest.mock('../src/db/initialize', () => ({
  initializeAppDatabase: () => {
    if (!mockDatabase) {
      throw new Error('Shell test database is not open.');
    }
    return { state: 'ready', adapter: mockDatabase.adapter, schemaVersion: mockSchemaVersion, path: mockDatabase.path };
  },
}));

const ROUTES = {
  _layout: RootLayout,
  index: IndexRoute,
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
  restock: RestockRoute,
  'purchase-history': PurchaseHistoryRoute,
  'purchases/[id]': PurchaseDetailRoute,
  'batch-review': BatchReviewRoute,
  adjustment: AdjustmentRoute,
  reconciliation: ReconciliationRoute,
  'guided-checks': GuidedChecksRoute,
  attention: AttentionRoute,
  expense: ExpenseEntryRoute,
  expenses: ExpenseHistoryRoute,
  withdrawal: OwnerWithdrawalEntryRoute,
  withdrawals: OwnerWithdrawalHistoryRoute,
  summary: BusinessSummaryRoute,
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

  it('opens the promoted Home operating surface by default', async () => {
    const router = renderRouter(ROUTES, { initialUrl: '/' });
    expect(await screen.findByText('Live today')).toBeTruthy();
    expect(router.getPathname()).toBe('/today');
  });

  it('switches between Products and the live Home summary', async () => {
    const router = renderRouter(ROUTES, { initialUrl: '/products' });
    expect(await screen.findByText('No products yet')).toBeTruthy();

    fireEvent.press(screen.getByLabelText(/Sell, tab/));
    expect(await screen.findByPlaceholderText('Search name, local SKU, or barcode')).toBeTruthy();
    expect(router.getPathname()).toBe('/sell');

    fireEvent.press(screen.getByLabelText(/Today, tab/));
    expect(await screen.findByText('Live today')).toBeTruthy();

    fireEvent.press(screen.getByLabelText(/More, tab/));
    expect(await screen.findByText(/Keep purchases and receipts available/)).toBeTruthy();

    fireEvent.press(screen.getByLabelText(/Products, tab/));
    expect(await screen.findByText('No products yet')).toBeTruthy();
    expect(router.getPathname()).toBe('/products');
  });

  it('shows an existing-store read failure with retry instead of offering duplicate setup', async () => {
    if (!mockDatabase) {
      throw new Error('Test database is not open.');
    }
    mockDatabase.adapter.run(`UPDATE devices SET status = 'INACTIVE';`);
    const router = renderRouter(ROUTES, { initialUrl: '/sell' });
    expect(await screen.findByText('Local store unavailable')).toBeTruthy();
    expect(screen.queryByText('Set up this store')).toBeNull();

    mockDatabase.adapter.run(`UPDATE devices SET status = 'ACTIVE';`);
    fireEvent.press(screen.getByText('Try again'));
    expect(await screen.findByPlaceholderText('Search name, local SKU, or barcode')).toBeTruthy();
    expect(router.getPathname()).toBe('/sell');
  });

  it('requires confirmation before a dirty in-memory cart can leave through a tab', async () => {
    if (!mockDatabase) {
      throw new Error('Test database is not open.');
    }
    const store = mockDatabase.adapter.getFirstRow<{ id: string }>('SELECT id FROM stores LIMIT 1;');
    const device = mockDatabase.adapter.getFirstRow<{ id: string }>('SELECT id FROM devices LIMIT 1;');
    if (!store || !device) {
      throw new Error('Test store context is missing.');
    }
    createTemporaryProduct(
      mockDatabase.adapter,
      { storeId: store.id, deviceId: device.id, name: 'Tab guard item' },
      { generateId: deterministicIds(3500) },
    );

    const alertSpy = jest.spyOn(Alert, 'alert');
    const router = renderRouter(ROUTES, { initialUrl: '/sell' });
    expect(await screen.findByText('Tab guard item')).toBeTruthy();
    fireEvent.press(screen.getByText('Tab guard item'));
    fireEvent.changeText(screen.getByTestId('line-price-input'), '100');
    fireEvent.press(screen.getByText('Add to cart'));
    expect(screen.getByText('Cart (1)')).toBeTruthy();

    fireEvent.press(screen.getByLabelText(/Today, tab/));
    expect(alertSpy).toHaveBeenCalledWith(
      'Discard sale?',
      'Your uncompleted sale will be lost.',
      expect.any(Array),
    );
    expect(router.getPathname()).toBe('/sell');

    const actions = alertSpy.mock.calls[0]?.[2] as
      | { text: string; onPress?: () => void }[]
      | undefined;
    act(() => {
      actions?.find((action) => action.text === 'Discard')?.onPress?.();
    });
    expect(await screen.findByText('Live today')).toBeTruthy();
    expect(router.getPathname()).toBe('/today');

    alertSpy.mockRestore();
  });

  it('uses the supported route-removal guard for a dirty restock draft and discards once', async () => {
    if (!mockDatabase) {
      throw new Error('Shell test database is not open.');
    }
    const store = mockDatabase.adapter.getFirstRow<{ id: string }>('SELECT id FROM stores LIMIT 1;');
    const device = mockDatabase.adapter.getFirstRow<{ id: string }>('SELECT id FROM devices LIMIT 1;');
    if (!store || !device) {
      throw new Error('Test store context is missing.');
    }
    createTemporaryProduct(
      mockDatabase.adapter,
      { storeId: store.id, deviceId: device.id, name: 'Restock guard item' },
      { generateId: deterministicIds(3600) },
    );
    const alertSpy = jest.spyOn(Alert, 'alert');
    const router = renderRouter(ROUTES, { initialUrl: '/products' });
    testRouter.push('/restock');
    expect(await screen.findByText('Restock guard item')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Restock Restock guard item'));
    fireEvent.changeText(screen.getByTestId('restock-total-cost'), '5.00');
    fireEvent.press(screen.getByText('Add line'));

    testRouter.back();
    expect(alertSpy).toHaveBeenCalledWith(
      'Discard restock draft?',
      'Your unsaved restock details will be cleared.',
      expect.any(Array),
    );
    expect(router.getPathname()).toBe('/restock');
    const actions = alertSpy.mock.calls.at(-1)?.[2] as
      | { text: string; onPress?: () => void }[]
      | undefined;
    act(() => {
      actions?.find((action) => action.text === 'Discard')?.onPress?.();
      jest.runAllTimers();
    });
    expect(await screen.findByText('Restock guard item')).toBeTruthy();
    expect(router.getPathname()).toBe('/products');
    alertSpy.mockRestore();
  });

  it('returns contextual Quick Add to the existing restock route and selects the new product', async () => {
    if (!mockDatabase) {
      throw new Error('Shell test database is not open.');
    }
    const store = mockDatabase.adapter.getFirstRow<{ id: string }>('SELECT id FROM stores LIMIT 1;');
    const device = mockDatabase.adapter.getFirstRow<{ id: string }>('SELECT id FROM devices LIMIT 1;');
    if (!store || !device) {
      throw new Error('Test store context is missing.');
    }
    createTemporaryProduct(
      mockDatabase.adapter,
      { storeId: store.id, deviceId: device.id, name: 'Existing restock line' },
      { generateId: deterministicIds(3650) },
    );
    const router = renderRouter(ROUTES, { initialUrl: '/restock' });
    expect(await screen.findByText('Existing restock line')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Restock Existing restock line'));
    fireEvent.changeText(screen.getByTestId('restock-total-cost'), '5.00');
    fireEvent.press(screen.getByText('Add line'));
    fireEvent.changeText(screen.getByTestId('restock-product-search'), 'Context Quick Add');
    fireEvent.press(screen.getByText('Quick Add product'));
    expect(router.getPathname()).toBe('/products/new');
    expect(screen.getByTestId('quick-add-name').props.value).toBe('Context Quick Add');
    fireEvent.press(screen.getByText('Save product'));
    expect(await screen.findByText('Context Quick Add')).toBeTruthy();
    expect(router.getPathname()).toBe('/restock');
    expect(screen.getByText('Context Quick Add')).toBeTruthy();
    expect(screen.getByText('Purchase package')).toBeTruthy();
  });

  it('requires confirmation before a dirty Quick Add form can leave through a tab', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const router = renderRouter(ROUTES, { initialUrl: '/sell' });
    expect(await screen.findByPlaceholderText('Search name, local SKU, or barcode')).toBeTruthy();

    fireEvent.changeText(screen.getByPlaceholderText('Search name, local SKU, or barcode'), 'New tab product');
    fireEvent.press(screen.getByText('Add product'));
    fireEvent.changeText(screen.getByTestId('quick-add-name'), 'Changed tab product');

    fireEvent.press(screen.getByLabelText(/Today, tab/));
    expect(alertSpy).toHaveBeenCalledWith(
      'Discard product and sale?',
      'Your product entries and uncompleted sale will be lost.',
      expect.any(Array),
    );
    expect(router.getPathname()).toBe('/sell');

    const actions = alertSpy.mock.calls[0]?.[2] as
      | { text: string; onPress?: () => void }[]
      | undefined;
    act(() => {
      actions?.find((action) => action.text === 'Discard')?.onPress?.();
    });
    expect(await screen.findByText('Live today')).toBeTruthy();
    expect(router.getPathname()).toBe('/today');

    alertSpy.mockRestore();
  });

  it('removes Sell history Back handling while another tab is focused, then restores it on return', async () => {
    const subscriptions: { handler: () => boolean; remove: jest.Mock }[] = [];
    const addSpy = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_eventName, handler) => {
      const subscription = { remove: jest.fn() };
      subscriptions.push({ handler: handler as () => boolean, remove: subscription.remove });
      return subscription as never;
    });
    const router = renderRouter(ROUTES, { initialUrl: '/sell' });
    expect(await screen.findByPlaceholderText('Search name, local SKU, or barcode')).toBeTruthy();

    fireEvent.press(screen.getByText('Recent sales'));
    expect(await screen.findByText('Recent sales')).toBeTruthy();
    const sellHistorySubscription = subscriptions.at(-1);

    fireEvent.press(screen.getByLabelText(/Products, tab/));
    expect(await screen.findByText('No products yet')).toBeTruthy();
    expect(router.getPathname()).toBe('/products');
    expect(sellHistorySubscription?.remove).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByLabelText(/Sell, tab/));
    expect(await screen.findByText('Recent sales')).toBeTruthy();
    const returnedSellSubscription = subscriptions.at(-1);
    act(() => {
      expect(returnedSellSubscription?.handler()).toBe(true);
    });
    expect(await screen.findByPlaceholderText('Search name, local SKU, or barcode')).toBeTruthy();

    addSpy.mockRestore();
  });
});
