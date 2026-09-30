import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert, BackHandler } from 'react-native';

import { createCatalogueClient } from '../src/catalogue/client';
import { createDatabaseSalesClient } from '../src/sales/client';
import SellScreen from '../src/screens/sales/SellScreen';
import SaleDetailScreen from '../src/screens/sales/SaleDetailScreen';
import SaleHistoryScreen from '../src/screens/sales/SaleHistoryScreen';
import {
  countRows,
  deterministicIds,
  openCatalogueFixture,
  type CatalogueFixture,
} from './catalogueSupport';

function seedSellCatalogue(fixture: CatalogueFixture) {
  const catalogueClient = createCatalogueClient(
    fixture.adapter,
    fixture.context.store,
    fixture.context.device,
    deterministicIds(1000),
  );

  // Product 1: Milo 400g with carton package
  const milo = catalogueClient.createTemporaryProduct({
    name: 'Milo 400g',
    localSku: 'ML-400',
    barcode: '6001111111111',
  });
  catalogueClient.createPackage({
    storeProductId: milo.storeProduct.id,
    name: 'carton',
    conversionText: '20',
    setting: { defaultSellingPrice: '3000.00', isPreferredForSale: true },
  });

  // Product 2: Peak Milk
  const peak = catalogueClient.createTemporaryProduct({
    name: 'Peak Milk',
    localSku: 'PK-001',
  });
  catalogueClient.createPackage({
    storeProductId: peak.storeProduct.id,
    name: 'roll',
    conversionText: '10',
    setting: { defaultSellingPrice: '1200.00', isPreferredForSale: true },
  });

  // Product 3: Sugar
  catalogueClient.createTemporaryProduct({
    name: 'Dangote Sugar',
  });

  return { catalogueClient };
}

describe('SellScreen', () => {
  it('searches catalogue and shows sellable products with preferred package and price', () => {
    const fixture = openCatalogueFixture();
    try {
      seedSellCatalogue(fixture);
      const salesClient = createDatabaseSalesClient(fixture.adapter);

      const { unmount } = render(<SellScreen client={salesClient} />);

      expect(screen.getByText('Sell')).toBeTruthy();
      expect(screen.getByText(/Funke Provisions/)).toBeTruthy();
      expect(screen.getByPlaceholderText('Search name, local SKU, or barcode')).toBeTruthy();

      // Should show seeded products
      expect(screen.getByText('Milo 400g')).toBeTruthy();
      expect(screen.getByText('Peak Milk')).toBeTruthy();
      expect(screen.getByText('Dangote Sugar')).toBeTruthy();

      // Check package and price labels
      expect(screen.getByText('Sold per carton')).toBeTruthy();
      expect(screen.getByText('₦3,000.00')).toBeTruthy();

      // Filter by search query
      fireEvent.changeText(
        screen.getByPlaceholderText('Search name, local SKU, or barcode'),
        'Milo',
      );
      expect(screen.getByText('Milo 400g')).toBeTruthy();
      expect(screen.queryByText('Peak Milk')).toBeNull();

      unmount();
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('configures a line item with package selection, exact quantity, price, and discount', () => {
    const fixture = openCatalogueFixture();
    try {
      seedSellCatalogue(fixture);
      const salesClient = createDatabaseSalesClient(fixture.adapter);

      const { unmount } = render(<SellScreen client={salesClient} />);

      // Click Milo to configure line
      fireEvent.press(screen.getByText('Milo 400g'));

      // In line configuration view
      expect(screen.getByText('Add to sale')).toBeTruthy();
      expect(screen.getByText('Milo 400g')).toBeTruthy();

      // Package choices (piece base unit + carton)
      expect(screen.getByText('piece')).toBeTruthy();
      expect(screen.getByText('carton')).toBeTruthy();

      // Default price for preferred carton is 3000.00
      expect(screen.getByTestId('line-price-input').props.value).toBe('3000.00');

      // Change quantity to 2
      fireEvent.changeText(screen.getByTestId('line-quantity-input'), '2');

      // Live preview should show 2 * 3000 = 6000
      expect(screen.getByText('₦6,000.00')).toBeTruthy();

      // Add a line discount of 500
      fireEvent.changeText(screen.getByTestId('line-discount-input'), '500');

      // Live preview should show 6000 - 500 = 5500
      expect(screen.getByText('₦5,500.00')).toBeTruthy();

      // Add to cart
      fireEvent.press(screen.getByText('Add to cart'));

      // Back to Sell screen with cart line
      expect(screen.getByText('Cart (1)')).toBeTruthy();
      expect(screen.getByText('2 carton @ ₦3,000.00')).toBeTruthy();
      expect(screen.getByText('- ₦500.00 discount')).toBeTruthy();
      expect(screen.getAllByText('₦5,500.00').length).toBeGreaterThanOrEqual(1);

      unmount();
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('supports multi-line cart, line editing, and line removal', () => {
    const fixture = openCatalogueFixture();
    try {
      seedSellCatalogue(fixture);
      const salesClient = createDatabaseSalesClient(fixture.adapter);

      const { unmount } = render(<SellScreen client={salesClient} />);

      // Add Milo (1 carton = 3000)
      fireEvent.press(screen.getByText('Milo 400g'));
      fireEvent.press(screen.getByText('Add to cart'));

      // Add Peak Milk (2 rolls @ 1200 = 2400)
      fireEvent.press(screen.getByText('Peak Milk'));
      fireEvent.changeText(screen.getByTestId('line-quantity-input'), '2');
      fireEvent.press(screen.getByText('Add to cart'));

      expect(screen.getByText('Cart (2)')).toBeTruthy();
      // Total should be 3000 + 2400 = 5400
      expect(screen.getByText('Complete sale · ₦5,400.00')).toBeTruthy();

      // Edit Milo line
      fireEvent.press(screen.getByLabelText('Edit Milo 400g'));
      expect(screen.getByText('Edit line')).toBeTruthy();
      // Change quantity to 3
      fireEvent.changeText(screen.getByTestId('line-quantity-input'), '3');
      fireEvent.press(screen.getByText('Update line'));

      // Total should now be 3*3000 + 2400 = 11400
      expect(screen.getByText('Complete sale · ₦11,400.00')).toBeTruthy();

      // Remove Peak Milk
      fireEvent.press(screen.getByLabelText('Remove Peak Milk'));
      expect(screen.getByText('Cart (1)')).toBeTruthy();
      expect(screen.getByText('Complete sale · ₦9,000.00')).toBeTruthy();

      unmount();
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('completes an offline cash sale and shows truthful confirmation', () => {
    const fixture = openCatalogueFixture();
    try {
      seedSellCatalogue(fixture);
      const salesClient = createDatabaseSalesClient(fixture.adapter);

      const { unmount } = render(<SellScreen client={salesClient} />);

      // Add Milo
      fireEvent.press(screen.getByText('Milo 400g'));
      fireEvent.press(screen.getByText('Add to cart'));

      // Cash is default payment method
      expect(screen.getByText('Cash')).toBeTruthy();

      // Complete sale
      fireEvent.press(screen.getByText('Complete sale · ₦3,000.00'));

      // Confirmation screen appears
      expect(screen.getByText('Sale complete')).toBeTruthy();
      expect(screen.getByText('Paid with Cash')).toBeTruthy();
      expect(screen.getByText('Saved on this device')).toBeTruthy();
      expect(screen.getByText('New sale')).toBeTruthy();
      expect(screen.getByText('View sale')).toBeTruthy();

      // Verify database state: 1 sale, 1 sale item, 1 payment, 1 inventory event, 1 outbox operation
      expect(countRows(fixture.adapter, 'sales')).toBe(1);
      expect(countRows(fixture.adapter, 'sale_items')).toBe(1);
      expect(countRows(fixture.adapter, 'payments')).toBe(1);
      expect(countRows(fixture.adapter, 'inventory_events')).toBe(1);
      expect(
        fixture.adapter.getFirstRow<{ count: number }>(
          `SELECT COUNT(*) AS count FROM outbox_operations WHERE operation_type = 'COMPLETED_SALE_CREATED';`,
        )?.count,
      ).toBe(1);
      expect(countRows(fixture.adapter, 'customer_accounts')).toBe(0);
      expect(countRows(fixture.adapter, 'receivables')).toBe(0);

      // Verify inventory balance is negative (-20 base units for 1 carton of 20)
      const invRow = fixture.adapter.getFirstRow<{ quantity_base_delta_micros: number }>(
        `SELECT quantity_base_delta_micros FROM inventory_events;`,
      );
      expect(invRow?.quantity_base_delta_micros).toBe(-20_000_000);

      unmount();
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('completes bank transfer and POS/card sales', () => {
    const fixture = openCatalogueFixture();
    try {
      seedSellCatalogue(fixture);
      const salesClient = createDatabaseSalesClient(fixture.adapter);

      const { unmount } = render(<SellScreen client={salesClient} />);

      // 1. Transfer sale
      fireEvent.press(screen.getByText('Dangote Sugar'));
      fireEvent.changeText(screen.getByTestId('line-price-input'), '800');
      fireEvent.press(screen.getByText('Add to cart'));

      fireEvent.press(screen.getByText('Transfer'));
      fireEvent.press(screen.getByText('Complete sale · ₦800.00'));

      expect(screen.getByText('Sale complete')).toBeTruthy();
      expect(screen.getByText('Paid with Bank Transfer')).toBeTruthy();

      // Start new sale
      fireEvent.press(screen.getByText('New sale'));

      // 2. POS sale
      fireEvent.press(screen.getByText('Dangote Sugar'));
      fireEvent.changeText(screen.getByTestId('line-price-input'), '500');
      fireEvent.press(screen.getByText('Add to cart'));

      fireEvent.press(screen.getByText('POS/card'));
      fireEvent.press(screen.getByText('Complete sale · ₦500.00'));

      expect(screen.getByText('Sale complete')).toBeTruthy();
      expect(screen.getByText('Paid with POS / Card')).toBeTruthy();

      // Verify payments in database
      const p1 = fixture.adapter.getFirstRow<{ method: string }>(
        `SELECT method FROM payments ORDER BY created_at ASC LIMIT 1;`,
      );
      expect(p1?.method).toBe('BANK_TRANSFER');

      const p2 = fixture.adapter.getFirstRow<{ method: string }>(
        `SELECT method FROM payments ORDER BY created_at DESC LIMIT 1;`,
      );
      expect(p2?.method).toBe('POS_CARD');

      unmount();
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('completes a credit sale with customer name and records receivable truthfully', () => {
    const fixture = openCatalogueFixture();
    try {
      seedSellCatalogue(fixture);
      const salesClient = createDatabaseSalesClient(fixture.adapter);

      const { unmount } = render(<SellScreen client={salesClient} />);

      fireEvent.press(screen.getByText('Peak Milk'));
      fireEvent.press(screen.getByText('Add to cart'));

      // Select Credit
      fireEvent.press(screen.getByText('Credit'));

      // Shows warning that credit is not cash received
      expect(
        screen.getByText(
          '₦1,200.00 will be owed by the customer. This is recorded as an open receivable, not cash received.',
        ),
      ).toBeTruthy();

      // Attempt complete without name -> fails with error message
      fireEvent.press(screen.getByText('Complete sale · ₦1,200.00'));
      expect(screen.getByText('Enter a customer name for credit sales.')).toBeTruthy();

      // Provide customer name
      fireEvent.changeText(screen.getByTestId('credit-customer-name'), 'Mama Nkechi');
      expect(screen.getByText('New customer account')).toBeTruthy();
      expect(
        screen.getByText(
          'Completing this sale will create a new local customer account for “Mama Nkechi”. Existing names are never merged automatically.',
        ),
      ).toBeTruthy();
      fireEvent.press(screen.getByText('Complete sale · ₦1,200.00'));

      // Confirmation shows credit owed by Mama Nkechi
      expect(screen.getByText('Sale complete')).toBeTruthy();
      expect(screen.getByText('Recorded as Credit (owed by Mama Nkechi)')).toBeTruthy();

      // Database asserts
      expect(countRows(fixture.adapter, 'sales')).toBe(1);
      expect(countRows(fixture.adapter, 'customer_accounts')).toBe(1);
      expect(countRows(fixture.adapter, 'receivables')).toBe(1);

      const rec = fixture.adapter.getFirstRow<{
        status: string;
        original_amount_minor: number;
        outstanding_amount_minor: number;
      }>(`SELECT status, original_amount_minor, outstanding_amount_minor FROM receivables;`);
      expect(rec?.status).toBe('OPEN');
      expect(rec?.original_amount_minor).toBe(120000);
      expect(rec?.outstanding_amount_minor).toBe(120000);

      unmount();
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('renders sale detail from immutable stored snapshots and prevents editing', () => {
    const fixture = openCatalogueFixture();
    try {
      const { catalogueClient } = seedSellCatalogue(fixture);
      const salesClient = createDatabaseSalesClient(fixture.adapter);

      // Complete a sale
      const completed = salesClient.completeSale({
        lines: [
          {
            storeProductId: catalogueClient.listProducts('Milo')[0].product.id,
            packageUnitId: salesClient.getProductPackages(
              catalogueClient.listProducts('Milo')[0].product.id,
            )[0].id,
            quantityPackagesMicros: 2_000_000,
            unitPriceMinor: 300000,
            discountAmountMinor: 40000,
          },
        ],
        payment: { method: 'CASH' },
      });

      // Now rename the product in catalogue to simulate later catalogue change
      catalogueClient.updateProductIdentity({
        storeProductId: catalogueClient.listProducts('Milo')[0].product.id,
        name: 'Milo 400g NEW NAME',
      });

      const onBackCalled: string[] = [];
      const { unmount } = render(
        <SaleDetailScreen
          client={salesClient}
          saleId={completed.sale.id}
          onBack={() => onBackCalled.push('back')}
        />,
      );

      // Detail must show original snapshot name, NOT the new catalogue name
      expect(screen.getByText('Sale details')).toBeTruthy();
      expect(screen.getByText('Milo 400g')).toBeTruthy();
      expect(screen.queryByText('Milo 400g NEW NAME')).toBeNull();

      // Must show snapshot totals and discounts
      expect(screen.getByText('Subtotal')).toBeTruthy();
      expect(screen.getByText('₦6,000.00')).toBeTruthy();
      expect(screen.getByText('- ₦400.00')).toBeTruthy();
      expect(screen.getAllByText('₦5,600.00').length).toBeGreaterThanOrEqual(1);

      // The immutable sale effect is distinct from the current derived stock.
      // Negative stock remains a valid sale outcome and is a reconciliation signal.
      expect(screen.getByText('Historical sale inventory effect: -2 base units')).toBeTruthy();
      expect(screen.getByText('Current derived stock: -2 base units · Reconciliation needed')).toBeTruthy();

      // Must show truthful local-save badge
      expect(screen.getByText('Saved on this device · Sync pending')).toBeTruthy();

      // Must NOT show any edit, delete, void, or return buttons (M3 non-goals)
      expect(screen.queryByText('Edit')).toBeNull();
      expect(screen.queryByText('Delete')).toBeNull();
      expect(screen.queryByText('Void')).toBeNull();
      expect(screen.queryByText('Return')).toBeNull();

      // Test back button
      fireEvent.press(screen.getByText('Back to sales'));
      expect(onBackCalled).toEqual(['back']);

      unmount();
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('renders the persisted sale sync state instead of always claiming it is pending', () => {
    const fixture = openCatalogueFixture();
    try {
      const { catalogueClient } = seedSellCatalogue(fixture);
      const salesClient = createDatabaseSalesClient(fixture.adapter);
      const completed = salesClient.completeSale({
        lines: [
          {
            storeProductId: catalogueClient.listProducts('Peak')[0].product.id,
            packageUnitId: salesClient.getProductPackages(
              catalogueClient.listProducts('Peak')[0].product.id,
            )[0].id,
            quantityPackagesMicros: 1_000_000,
            unitPriceMinor: 120000,
          },
        ],
        payment: { method: 'CASH' },
      });
      fixture.adapter.run(
        `UPDATE outbox_operations SET status = 'SYNCED' WHERE operation_id = ?;`,
        [completed.outbox.operationId],
      );

      const { unmount } = render(
        <SaleDetailScreen client={salesClient} saleId={completed.sale.id} onBack={() => undefined} />,
      );

      expect(screen.getByText('Saved on this device · Synced')).toBeTruthy();
      expect(screen.queryByText('Saved on this device · Sync pending')).toBeNull();

      unmount();
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('renders recent sales list and navigates to detail', () => {
    const fixture = openCatalogueFixture();
    try {
      const { catalogueClient } = seedSellCatalogue(fixture);
      const salesClient = createDatabaseSalesClient(fixture.adapter);

      salesClient.completeSale({
        lines: [
          {
            storeProductId: catalogueClient.listProducts('Peak')[0].product.id,
            packageUnitId: salesClient.getProductPackages(
              catalogueClient.listProducts('Peak')[0].product.id,
            )[0].id,
            quantityPackagesMicros: 1_000_000,
            unitPriceMinor: 120000,
          },
        ],
        payment: { method: 'CASH' },
      });

      const openedSales: string[] = [];
      const onBackList: string[] = [];

      const { unmount } = render(
        <SaleHistoryScreen
          client={salesClient}
          onOpenSale={(id) => openedSales.push(id)}
          onBack={() => onBackList.push('back')}
        />,
      );

      expect(screen.getByText('Recent sales')).toBeTruthy();
      expect(screen.getByText('₦1,200.00')).toBeTruthy();
      expect(screen.getByText('Saved on this device · Sync pending · Tap to view')).toBeTruthy();

      // Tap on the sale item
      fireEvent.press(screen.getByLabelText(/Sale on .*, ₦1,200.00/));
      expect(openedSales.length).toBe(1);

      unmount();
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('guards dirty cart on discard press', () => {
    const fixture = openCatalogueFixture();
    try {
      seedSellCatalogue(fixture);
      const salesClient = createDatabaseSalesClient(fixture.adapter);

      const alertSpy = jest.spyOn(Alert, 'alert');

      const { unmount } = render(<SellScreen client={salesClient} />);

      // Add Milo to make cart dirty
      fireEvent.press(screen.getByText('Milo 400g'));
      fireEvent.press(screen.getByText('Add to cart'));

      // Press discard button
      fireEvent.press(screen.getByLabelText('Discard sale'));

      expect(alertSpy).toHaveBeenCalledWith(
        'Discard sale?',
        'Your uncompleted sale will be lost.',
        expect.any(Array),
      );

      alertSpy.mockRestore();
      unmount();
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('asks before Android hardware Back can discard a dirty in-memory cart', () => {
    const fixture = openCatalogueFixture();
    try {
      seedSellCatalogue(fixture);
      const salesClient = createDatabaseSalesClient(fixture.adapter);
      const addSpy = jest.spyOn(BackHandler, 'addEventListener');
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      try {
        const { unmount } = render(<SellScreen client={salesClient} />);
        fireEvent.press(screen.getByText('Milo 400g'));
        fireEvent.press(screen.getByText('Add to cart'));

        const handlers = addSpy.mock.calls as unknown as [string, () => boolean][];
        const currentBackHandler = handlers.at(-1)?.[1];
        expect(currentBackHandler?.()).toBe(true);
        expect(alertSpy).toHaveBeenCalledWith(
          'Discard sale?',
          'Your uncompleted sale will be lost.',
          expect.any(Array),
        );

        unmount();
      } finally {
        addSpy.mockRestore();
        alertSpy.mockRestore();
      }
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('guards cancellation of edited line input and Quick Add entries', () => {
    const fixture = openCatalogueFixture();
    try {
      seedSellCatalogue(fixture);
      const salesClient = createDatabaseSalesClient(fixture.adapter);
      const alertSpy = jest.spyOn(Alert, 'alert');
      const { unmount } = render(<SellScreen client={salesClient} />);

      fireEvent.press(screen.getByText('Milo 400g'));
      fireEvent.changeText(screen.getByTestId('line-quantity-input'), '2');
      fireEvent.press(screen.getByText('Cancel'));
      expect(alertSpy).toHaveBeenCalledWith(
        'Discard line?',
        'Your uncompleted line changes will be lost.',
        expect.any(Array),
      );

      const discardLine = alertSpy.mock.calls[0]?.[2] as
        | { text: string; onPress?: () => void }[]
        | undefined;
      act(() => {
        discardLine?.find((action) => action.text === 'Discard')?.onPress?.();
      });

      alertSpy.mockClear();
      fireEvent.changeText(screen.getByPlaceholderText('Search name, local SKU, or barcode'), 'No match');
      fireEvent.press(screen.getByText('Add product'));
      if (screen.queryByText('Continue without photo')) fireEvent.press(screen.getByText('Continue without photo'));
      fireEvent.changeText(screen.getByTestId('quick-add-price'), '25');
      fireEvent.press(screen.getByText('Cancel'));
      expect(alertSpy).toHaveBeenCalledWith(
        'Discard product?',
        'Your entries will be lost.',
        expect.any(Array),
      );

      alertSpy.mockRestore();
      unmount();
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('returns from Quick Add to the new product line without persisting a draft cart', () => {
    const fixture = openCatalogueFixture();
    try {
      const salesClient = createDatabaseSalesClient(fixture.adapter);
      const { unmount } = render(<SellScreen client={salesClient} />);

      fireEvent.changeText(screen.getByPlaceholderText('Search name, local SKU, or barcode'), 'No result');
      fireEvent.press(screen.getByText('Add product'));
      if (screen.queryByText('Continue without photo')) fireEvent.press(screen.getByText('Continue without photo'));
      fireEvent.changeText(screen.getByTestId('quick-add-price'), '75');
      fireEvent.press(screen.getByText('Add to basket'));

      expect(screen.queryByText('Add to sale')).toBeNull();
      expect(screen.getByText('Cart (1)')).toBeTruthy();
      expect(screen.getAllByText(/Unfinished product/).length).toBeGreaterThan(0);

      unmount();
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('recovers an initial catalogue read failure instead of presenting it as an empty catalogue', () => {
    const fixture = openCatalogueFixture();
    try {
      seedSellCatalogue(fixture);
      const salesClient = createDatabaseSalesClient(fixture.adapter);
      const searchSpy = jest
        .spyOn(salesClient, 'searchProducts')
        .mockImplementationOnce(() => {
          throw new Error('Injected catalogue read failure');
        });
      const { unmount } = render(<SellScreen client={salesClient} />);

      expect(screen.getByText('Products unavailable')).toBeTruthy();
      expect(screen.queryByText('No products yet')).toBeNull();
      fireEvent.press(screen.getByText('Try again'));
      expect(screen.getByText('Milo 400g')).toBeTruthy();

      searchSpy.mockRestore();
      unmount();
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('retains an existing cart and retries a package read failure', () => {
    const fixture = openCatalogueFixture();
    try {
      seedSellCatalogue(fixture);
      const salesClient = createDatabaseSalesClient(fixture.adapter);
      const { unmount } = render(<SellScreen client={salesClient} />);

      fireEvent.press(screen.getByText('Milo 400g'));
      fireEvent.press(screen.getByText('Add to cart'));
      expect(screen.getByText('Cart (1)')).toBeTruthy();

      const packageSpy = jest
        .spyOn(salesClient, 'getProductPackages')
        .mockImplementationOnce(() => {
          throw new Error('Injected package read failure');
        });
      fireEvent.press(screen.getByText('Peak Milk'));
      expect(screen.getByText('Product packages unavailable')).toBeTruthy();
      expect(screen.getByText('Cart (1)')).toBeTruthy();
      fireEvent.press(screen.getByText('Try again'));
      expect(screen.getByText('Add to sale')).toBeTruthy();
      expect(screen.getByText('Peak Milk')).toBeTruthy();

      packageSpy.mockRestore();
      unmount();
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('preserves a Quick Add product as saved when its follow-up catalogue refresh fails', () => {
    const fixture = openCatalogueFixture();
    try {
      const salesClient = createDatabaseSalesClient(fixture.adapter);
      const originalSearch = salesClient.searchProducts.bind(salesClient);
      let searches = 0;
      const searchSpy = jest.spyOn(salesClient, 'searchProducts').mockImplementation((query) => {
        searches += 1;
        if (searches === 2) {
          throw new Error('Injected refresh failure after product save');
        }
        return originalSearch(query);
      });
      const { unmount } = render(<SellScreen client={salesClient} />);

      fireEvent.press(screen.getByText('Add product'));
      if (screen.queryByText('Continue without photo')) fireEvent.press(screen.getByText('Continue without photo'));
      fireEvent.changeText(screen.getByTestId('quick-add-price'), '75');
      fireEvent.press(screen.getByText('Add to basket'));

      expect(screen.getByText('Cart (1)')).toBeTruthy();
      expect(screen.getByText('Products unavailable')).toBeTruthy();
      expect(countRows(fixture.adapter, 'store_products')).toBe(1);
      expect(screen.queryByText('Not saved')).toBeNull();

      fireEvent.press(screen.getByText('Try again'));
      expect(screen.getAllByText(/Unfinished product/)[0]).toBeTruthy();

      searchSpy.mockRestore();
      unmount();
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('retains a credit cart and customer after local commit failure, then records exactly once on retry', () => {
    const fixture = openCatalogueFixture();
    try {
      seedSellCatalogue(fixture);
      const salesClient = createDatabaseSalesClient(fixture.adapter);
      const completionSpy = jest
        .spyOn(salesClient, 'completeSale')
        .mockImplementationOnce(() => {
          throw new Error('Injected local commit failure');
        });
      const { unmount } = render(<SellScreen client={salesClient} />);

      fireEvent.press(screen.getByText('Peak Milk'));
      fireEvent.press(screen.getByText('Add to cart'));
      fireEvent.press(screen.getByText('Credit'));
      fireEvent.changeText(screen.getByTestId('credit-customer-name'), 'Retry customer');
      fireEvent.press(screen.getByText('Complete sale · ₦1,200.00'));

      expect(screen.getByText('Sale not recorded')).toBeTruthy();
      expect(screen.queryByText('Sale complete')).toBeNull();
      expect(screen.getByText('Cart (1)')).toBeTruthy();
      expect(screen.getByTestId('credit-customer-name').props.value).toBe('Retry customer');
      expect(countRows(fixture.adapter, 'sales')).toBe(0);
      expect(countRows(fixture.adapter, 'customer_accounts')).toBe(0);

      fireEvent.press(screen.getByText('Complete sale · ₦1,200.00'));
      expect(screen.getByText('Sale complete')).toBeTruthy();
      expect(countRows(fixture.adapter, 'sales')).toBe(1);
      expect(countRows(fixture.adapter, 'customer_accounts')).toBe(1);
      expect(countRows(fixture.adapter, 'receivables')).toBe(1);
      expect(countRows(fixture.adapter, 'inventory_events')).toBe(1);

      completionSpy.mockRestore();
      unmount();
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('requires a customer-search retry before offering deliberate new-account creation', () => {
    const fixture = openCatalogueFixture();
    try {
      seedSellCatalogue(fixture);
      const salesClient = createDatabaseSalesClient(fixture.adapter);
      const customerSpy = jest
        .spyOn(salesClient, 'searchCustomers')
        .mockImplementationOnce(() => {
          throw new Error('Injected customer search failure');
        });
      const { unmount } = render(<SellScreen client={salesClient} />);

      fireEvent.press(screen.getByText('Peak Milk'));
      fireEvent.press(screen.getByText('Add to cart'));
      fireEvent.press(screen.getByText('Credit'));
      fireEvent.changeText(screen.getByTestId('credit-customer-name'), 'Retry customer lookup');

      expect(screen.getByText('Customer search unavailable')).toBeTruthy();
      expect(screen.queryByText('New customer account')).toBeNull();
      fireEvent.press(screen.getByText('Try again'));
      expect(screen.queryByText('Customer search unavailable')).toBeNull();
      expect(screen.getByText('New customer account')).toBeTruthy();

      customerSpy.mockRestore();
      unmount();
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('retries an actual local sales-history read without claiming history was deleted', () => {
    const fixture = openCatalogueFixture();
    try {
      const { catalogueClient } = seedSellCatalogue(fixture);
      const salesClient = createDatabaseSalesClient(fixture.adapter);
      const product = catalogueClient.listProducts('Milo')[0];
      salesClient.completeSale({
        lines: [
          {
            storeProductId: product.product.id,
            packageUnitId: salesClient.getProductPackages(product.product.id)[0].id,
            quantityPackagesMicros: 1_000_000,
            unitPriceMinor: 300_000,
          },
        ],
        payment: { method: 'CASH' },
      });
      const historySpy = jest
        .spyOn(salesClient, 'listSales')
        .mockImplementationOnce(() => {
          throw new Error('Injected history read failure');
        });
      const { unmount } = render(
        <SaleHistoryScreen client={salesClient} onOpenSale={() => undefined} onBack={() => undefined} />,
      );

      expect(screen.getByText('Sales history unavailable')).toBeTruthy();
      expect(screen.queryByText('No sales recorded yet')).toBeNull();
      fireEvent.press(screen.getByText('Try again'));
      expect(screen.getByText('₦3,000.00')).toBeTruthy();

      historySpy.mockRestore();
      unmount();
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('removes Sell hardware Back handling while blurred and restores it when focused again', () => {
    const fixture = openCatalogueFixture();
    try {
      seedSellCatalogue(fixture);
      const salesClient = createDatabaseSalesClient(fixture.adapter);
      const subscriptions: { handler: () => boolean; remove: jest.Mock }[] = [];
      const addSpy = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_eventName, handler) => {
        const subscription = { remove: jest.fn() };
        subscriptions.push({ handler: handler as () => boolean, remove: subscription.remove });
        return subscription as never;
      });
      const { rerender, unmount } = render(<SellScreen client={salesClient} isFocused />);

      fireEvent.press(screen.getByText('Recent sales'));
      expect(screen.getByText('Recent sales')).toBeTruthy();
      const focusedHistorySubscription = subscriptions.at(-1);
      rerender(<SellScreen client={salesClient} isFocused={false} />);
      expect(focusedHistorySubscription?.remove).toHaveBeenCalledTimes(1);

      const subscriptionsWhileBlurred = subscriptions.length;
      rerender(<SellScreen client={salesClient} isFocused />);
      expect(subscriptions).toHaveLength(subscriptionsWhileBlurred + 1);
      act(() => {
        expect(subscriptions.at(-1)?.handler()).toBe(true);
      });
      expect(screen.getByText('Sell')).toBeTruthy();

      addSpy.mockRestore();
      unmount();
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('keeps the cart and line form intact when adding or editing would overflow the sale total', () => {
    const fixture = openCatalogueFixture();
    try {
      seedSellCatalogue(fixture);
      const salesClient = createDatabaseSalesClient(fixture.adapter);
      const alertSpy = jest.spyOn(Alert, 'alert');
      const { unmount } = render(<SellScreen client={salesClient} />);
      const halfSafeMoney = '45035996273704.95';
      const maximumSafeMoney = '90071992547409.91';

      fireEvent.press(screen.getByText('Milo 400g'));
      fireEvent.changeText(screen.getByTestId('line-price-input'), halfSafeMoney);
      fireEvent.press(screen.getByText('Add to cart'));
      fireEvent.press(screen.getByText('Peak Milk'));
      fireEvent.changeText(screen.getByTestId('line-price-input'), halfSafeMoney);
      fireEvent.press(screen.getByText('Add to cart'));
      expect(screen.getByText('Cart (2)')).toBeTruthy();

      fireEvent.press(screen.getByText('Dangote Sugar'));
      fireEvent.changeText(screen.getByTestId('line-price-input'), maximumSafeMoney);
      fireEvent.press(screen.getByText('Add to cart'));
      expect(screen.getByText('Sale totals exceed the safe integer range.')).toBeTruthy();
      expect(screen.getByText('Add to sale')).toBeTruthy();

      fireEvent.press(screen.getByText('Cancel'));
      const discardLine = alertSpy.mock.calls.at(-1)?.[2] as
        | { text: string; onPress?: () => void }[]
        | undefined;
      act(() => {
        discardLine?.find((action) => action.text === 'Discard')?.onPress?.();
      });
      expect(screen.getByText('Cart (2)')).toBeTruthy();

      fireEvent.press(screen.getByLabelText('Edit Milo 400g'));
      fireEvent.changeText(screen.getByTestId('line-price-input'), maximumSafeMoney);
      fireEvent.press(screen.getByText('Update line'));
      expect(screen.getByText('Sale totals exceed the safe integer range.')).toBeTruthy();
      expect(screen.getByText('Edit line')).toBeTruthy();

      alertSpy.mockRestore();
      unmount();
    } finally {
      fixture.closeAndDelete();
    }
  });
});
