import { fireEvent, render, screen } from '@testing-library/react-native';
import { MICROS_PER_UNIT } from '@retail/domain';

import { createCatalogueClient } from '../src/catalogue/client';
import { createSupplier } from '../src/db/repositories';
import { createDatabasePurchasesClient, type PurchasesClient } from '../src/purchases/client';
import { completeSale } from '../src/sales/completeSale';
import PurchaseDetailScreen from '../src/screens/purchases/PurchaseDetailScreen';
import PurchaseHistoryScreen from '../src/screens/purchases/PurchaseHistoryScreen';
import RestockScreen from '../src/screens/purchases/RestockScreen';
import { countRows, deterministicIds, openCatalogueFixture, testId } from './catalogueSupport';

function seedClient() {
  const fixture = openCatalogueFixture();
  const catalogue = createCatalogueClient(
    fixture.adapter,
    fixture.context.store,
    fixture.context.device,
    deterministicIds(2000),
  );
  const rice = catalogue.createTemporaryProduct({ name: 'Rice' });
  const sugar = catalogue.createTemporaryProduct({ name: 'Sugar' });
  const client = createDatabasePurchasesClient(fixture.adapter, {
    storeId: fixture.context.store.id,
    deviceId: fixture.context.device.id,
    userId: fixture.context.owner.id,
    generateId: deterministicIds(3000),
  });
  return { fixture, client, rice, sugar };
}

describe('RestockScreen', () => {
  it('adds, edits and removes multiple exact lines, then records a supplier purchase', () => {
    const { fixture, client } = seedClient();
    try {
      render(<RestockScreen client={client} onBack={() => undefined} />);

      fireEvent.changeText(screen.getByTestId('restock-product-search'), 'Rice');
      fireEvent.press(screen.getByLabelText('Restock Rice'));
      fireEvent.changeText(screen.getByTestId('restock-total-cost'), '7.50');
      fireEvent.press(screen.getByText('Add line'));
      expect(screen.getByText('Restock lines (1)')).toBeTruthy();
      expect(screen.getByText('Running total: ₦7.50')).toBeTruthy();

      fireEvent.press(screen.getByText('Edit'));
      fireEvent.changeText(screen.getByTestId('restock-quantity'), '2');
      fireEvent.changeText(screen.getByTestId('restock-total-cost'), '8.00');
      fireEvent.press(screen.getByText('Update line'));
      expect(screen.getByText('Running total: ₦8.00')).toBeTruthy();

      fireEvent.changeText(screen.getByTestId('restock-product-search'), 'Sugar');
      fireEvent.press(screen.getByLabelText('Restock Sugar'));
      fireEvent.changeText(screen.getByTestId('restock-quantity'), '2');
      fireEvent.changeText(screen.getByTestId('restock-total-cost'), '3.00');
      fireEvent.press(screen.getByText('Add line'));
      expect(screen.getByText('Restock lines (2)')).toBeTruthy();
      expect(screen.getByText('Running total: ₦11.00')).toBeTruthy();

      fireEvent.press(screen.getAllByText('Remove')[1]);
      expect(screen.getByText('Restock lines (1)')).toBeTruthy();
      fireEvent.changeText(screen.getByTestId('restock-product-search'), 'Sugar');
      fireEvent.press(screen.getByLabelText('Restock Sugar'));
      fireEvent.changeText(screen.getByTestId('restock-quantity'), '2');
      fireEvent.changeText(screen.getByTestId('restock-total-cost'), '3.00');
      fireEvent.press(screen.getByText('Add line'));
      expect(screen.getByText('Restock lines (2)')).toBeTruthy();

      fireEvent.press(screen.getByLabelText('Create supplier'));
      fireEvent.changeText(screen.getByTestId('restock-supplier-name'), 'Market Wholesaler');
      fireEvent.press(screen.getByText('Record restock'));

      expect(screen.getByText('Restock saved')).toBeTruthy();
      expect(screen.getByText('Supplier: Market Wholesaler')).toBeTruthy();
      expect(countRows(fixture.adapter, 'purchases')).toBe(1);
      expect(countRows(fixture.adapter, 'purchase_items')).toBe(2);
      expect(countRows(fixture.adapter, 'suppliers')).toBe(1);
      expect(countRows(fixture.adapter, 'inventory_events')).toBe(2);
      expect(countRows(fixture.adapter, 'outbox_operations')).toBe(3);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('rejects an inexact unit-cost total before adding the line', () => {
    const { fixture, client } = seedClient();
    try {
      render(<RestockScreen client={client} onBack={() => undefined} />);
      fireEvent.changeText(screen.getByTestId('restock-product-search'), 'Rice');
      fireEvent.press(screen.getByLabelText('Restock Rice'));
      fireEvent.press(screen.getByLabelText('Unit cost'));
      fireEvent.changeText(screen.getByTestId('restock-quantity'), '0.5');
      fireEvent.changeText(screen.getByTestId('restock-unit-cost'), '0.01');
      fireEvent.press(screen.getByText('Add line'));
      expect(screen.getByText('Per-package unit cost and quantity must produce an exact integer total in minor units.')).toBeTruthy();
      expect(screen.queryByText('Restock lines (1)')).toBeNull();
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('retains the draft and operation ID across a failed save and retry', () => {
    const { fixture, client: realClient } = seedClient();
    try {
      const attempts: string[] = [];
      let fail = true;
      const client: PurchasesClient = {
        ...realClient,
        recordPurchase(input) {
          attempts.push(input.operationId ?? 'missing');
          if (fail) {
            fail = false;
            throw new Error('Disk full in test.');
          }
          return realClient.recordPurchase(input);
        },
      };
      const dirty: boolean[] = [];
      render(<RestockScreen client={client} onBack={() => undefined} onDirtyDraftChange={(value) => dirty.push(value)} />);
      fireEvent.changeText(screen.getByTestId('restock-product-search'), 'Rice');
      fireEvent.press(screen.getByLabelText('Restock Rice'));
      fireEvent.changeText(screen.getByTestId('restock-total-cost'), '7.50');
      fireEvent.press(screen.getByText('Add line'));
      fireEvent.press(screen.getByText('Record restock'));
      expect(screen.getByText('Disk full in test.')).toBeTruthy();
      expect(screen.getByText('Restock lines (1)')).toBeTruthy();
      fireEvent.press(screen.getByText('Record restock'));
      expect(screen.getByText('Restock saved')).toBeTruthy();
      expect(attempts).toHaveLength(2);
      expect(attempts[0]).toBe(attempts[1]);
      expect(dirty).toContain(true);
      expect(dirty.at(-1)).toBe(false);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('keeps a cart while Quick Add is requested from a no-match search', () => {
    const { fixture, client } = seedClient();
    try {
      const quickAddQueries: string[] = [];
      render(
        <RestockScreen
          client={client}
          onBack={() => undefined}
          onQuickAdd={(query) => quickAddQueries.push(query)}
        />,
      );
      fireEvent.changeText(screen.getByTestId('restock-product-search'), 'Rice');
      fireEvent.press(screen.getByLabelText('Restock Rice'));
      fireEvent.changeText(screen.getByTestId('restock-total-cost'), '7.50');
      fireEvent.press(screen.getByText('Add line'));
      fireEvent.changeText(screen.getByTestId('restock-product-search'), 'New product');
      fireEvent.press(screen.getByText('Quick Add product'));
      expect(quickAddQueries).toEqual(['New product']);
      expect(screen.getByText('Restock lines (1)')).toBeTruthy();
      expect(screen.getByText('Running total: ₦7.50')).toBeTruthy();
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('selects a newly created Quick Add product on return without clearing the existing cart', () => {
    const { fixture, client } = seedClient();
    try {
      const view = render(<RestockScreen client={client} onBack={() => undefined} isFocused />);
      fireEvent.changeText(screen.getByTestId('restock-product-search'), 'Rice');
      fireEvent.press(screen.getByLabelText('Restock Rice'));
      fireEvent.changeText(screen.getByTestId('restock-total-cost'), '7.50');
      fireEvent.press(screen.getByText('Add line'));
      const newProduct = client.createTemporaryProduct({ name: 'Quick Added Restock Product' });
      view.rerender(
        <RestockScreen
          client={client}
          onBack={() => undefined}
          isFocused
          quickAddProductId={newProduct.storeProduct.id}
        />,
      );
      expect(screen.getByText('Quick Added Restock Product')).toBeTruthy();
      expect(screen.getByText('Purchase package')).toBeTruthy();
      expect(screen.getByText('Restock lines (1)')).toBeTruthy();
      expect(screen.getByText('Running total: ₦7.50')).toBeTruthy();
      view.unmount();
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('refreshes purchase history and detail reads when focus returns', () => {
    const { fixture, client } = seedClient();
    try {
      const historyView = render(<PurchaseHistoryScreen client={client} onBack={() => undefined} onOpenPurchase={() => undefined} isFocused />);
      expect(screen.getByText('No restocks yet')).toBeTruthy();
      historyView.rerender(<PurchaseHistoryScreen client={client} onBack={() => undefined} onOpenPurchase={() => undefined} isFocused={false} />);
      const rice = client.searchProducts('Rice')[0];
      const purchase = client.recordPurchase({
        lines: [{ storeProductId: rice.storeProductId, packageUnitId: rice.preferredPackage!.id, quantityPackagesMicros: MICROS_PER_UNIT, enteredCostMinor: 250 }],
        operationId: testId(4300),
      });
      historyView.rerender(<PurchaseHistoryScreen client={client} onBack={() => undefined} onOpenPurchase={() => undefined} isFocused />);
      expect(screen.getByText('₦2.50 · 1 line')).toBeTruthy();
      historyView.unmount();

      const detailView = render(<PurchaseDetailScreen client={client} purchaseId={purchase.purchase.id} onBack={() => undefined} isFocused />);
      expect(screen.getByText('Restock receipt')).toBeTruthy();
      const secondPurchase = client.recordPurchase({
        lines: [{ storeProductId: rice.storeProductId, packageUnitId: rice.preferredPackage!.id, quantityPackagesMicros: MICROS_PER_UNIT, enteredCostMinor: 375 }],
        operationId: testId(4301),
      });
      detailView.rerender(<PurchaseDetailScreen client={client} purchaseId={secondPurchase.purchase.id} onBack={() => undefined} isFocused={false} />);
      detailView.rerender(<PurchaseDetailScreen client={client} purchaseId={secondPurchase.purchase.id} onBack={() => undefined} isFocused />);
      expect(screen.getByText('Total')).toBeTruthy();
      expect(screen.getByText('₦3.75')).toBeTruthy();
      detailView.unmount();
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('shows a readable receipt estimate while marking current stock unavailable after sale consumption', () => {
    const { fixture, client } = seedClient();
    try {
      const rice = client.searchProducts('Rice')[0];
      const purchase = client.recordPurchase({
        lines: [{ storeProductId: rice.storeProductId, packageUnitId: rice.preferredPackage!.id, quantityPackagesMicros: 2 * MICROS_PER_UNIT, enteredCostMinor: 750 }],
        operationId: testId(4310),
      });
      completeSale(fixture.adapter, {
        storeId: client.storeId,
        deviceId: client.deviceId,
        userId: client.userId,
        lines: [{ storeProductId: rice.storeProductId, packageUnitId: rice.preferredPackage!.id, quantityPackagesMicros: 2 * MICROS_PER_UNIT, unitPriceMinor: 500 }],
        payment: { method: 'CASH' },
      }, { generateId: deterministicIds(4311), operationId: testId(4312) });
      render(<PurchaseDetailScreen client={client} purchaseId={purchase.purchase.id} onBack={() => undefined} />);
      expect(screen.getByText('Receipt cost estimate: ₦3.75 per base unit (rounded to the nearest minor unit)')).toBeTruthy();
      expect(screen.getByText('Current cost availability: Unavailable for current stock; do not infer profit')).toBeTruthy();
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('selects an existing supplier explicitly and preserves supplier attribution', () => {
    const { fixture, client } = seedClient();
    try {
      createSupplier(fixture.adapter, {
        id: testId(4100),
        storeId: fixture.context.store.id,
        name: 'Existing supplier',
      });
      render(<RestockScreen client={client} onBack={() => undefined} />);
      fireEvent.changeText(screen.getByTestId('restock-product-search'), 'Rice');
      fireEvent.press(screen.getByLabelText('Restock Rice'));
      fireEvent.changeText(screen.getByTestId('restock-total-cost'), '7.50');
      fireEvent.press(screen.getByText('Add line'));
      fireEvent.press(screen.getByLabelText('Choose supplier'));
      fireEvent.press(screen.getByLabelText('Supplier Existing supplier'));
      fireEvent.press(screen.getByText('Record restock'));
      expect(screen.getByText('Restock saved')).toBeTruthy();
      expect(screen.getByText('Supplier: Existing supplier')).toBeTruthy();
      expect(fixture.adapter.getFirstRow<{ supplier_id: string }>('SELECT supplier_id FROM purchases LIMIT 1;')).toEqual({ supplier_id: testId(4100) });
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('retains a selected package and draft when it is deactivated before save', () => {
    const { fixture, client } = seedClient();
    try {
      const catalogue = createCatalogueClient(
        fixture.adapter,
        fixture.context.store,
        fixture.context.device,
        deterministicIds(4200),
      );
      const rice = client.searchProducts('Rice')[0];
      const carton = catalogue.createPackage({
        storeProductId: rice.storeProductId,
        name: 'Carton',
        conversionText: '12',
      });
      render(<RestockScreen client={client} onBack={() => undefined} />);
      fireEvent.changeText(screen.getByTestId('restock-product-search'), 'Rice');
      fireEvent.press(screen.getByLabelText('Restock Rice'));
      fireEvent.press(screen.getByLabelText('Carton'));
      catalogue.deactivatePackage({ packageUnitId: carton.packageUnit.id });
      fireEvent.changeText(screen.getByTestId('restock-total-cost'), '12.00');
      fireEvent.press(screen.getByText('Add line'));
      fireEvent.press(screen.getByText('Record restock'));
      expect(screen.getByText('Package unit does not belong to this variant or is not active.')).toBeTruthy();
      expect(screen.getByText('Restock lines (1)')).toBeTruthy();
      expect(countRows(fixture.adapter, 'purchases')).toBe(0);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('recovers an unavailable product read without discarding the draft search state', () => {
    const { fixture, client: realClient } = seedClient();
    try {
      let fail = true;
      const client: PurchasesClient = {
        ...realClient,
        searchProducts(query) {
          if (fail) {
            fail = false;
            throw new Error('Catalogue read failed.');
          }
          return realClient.searchProducts(query);
        },
      };
      render(<RestockScreen client={client} onBack={() => undefined} />);
      expect(screen.getByText('Products could not be read from this device. Your draft is preserved.')).toBeTruthy();
      fireEvent.press(screen.getByText('Try again'));
      fireEvent.changeText(screen.getByTestId('restock-product-search'), 'Rice');
      expect(screen.getByLabelText('Restock Rice')).toBeTruthy();
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('shows an unavailable running total when individually valid lines exceed safe money bounds', () => {
    const { fixture, client } = seedClient();
    try {
      render(<RestockScreen client={client} onBack={() => undefined} />);
      fireEvent.changeText(screen.getByTestId('restock-product-search'), 'Rice');
      fireEvent.press(screen.getByLabelText('Restock Rice'));
      fireEvent.changeText(screen.getByTestId('restock-total-cost'), '90071992547409.91');
      fireEvent.press(screen.getByText('Add line'));
      fireEvent.changeText(screen.getByTestId('restock-product-search'), 'Sugar');
      fireEvent.press(screen.getByLabelText('Restock Sugar'));
      fireEvent.changeText(screen.getByTestId('restock-total-cost'), '90071992547409.91');
      fireEvent.press(screen.getByText('Add line'));
      expect(screen.getByText('Running total: Unavailable; review line costs')).toBeTruthy();
    } finally {
      fixture.closeAndDelete();
    }
  });
});
