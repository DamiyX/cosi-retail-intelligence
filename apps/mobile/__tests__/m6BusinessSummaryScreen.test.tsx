import { fireEvent, render, screen } from '@testing-library/react-native';

import { createDatabaseFinanceClient } from '../src/finance/client';
import BusinessSummaryScreen from '../src/screens/finance/BusinessSummaryScreen';
import SellScreen from '../src/screens/sales/SellScreen';
import { createCatalogueClient } from '../src/catalogue/client';
import { createDatabaseSalesClient } from '../src/sales/client';
import { deterministicIds, openCatalogueFixture } from './catalogueSupport';
jest.mock('../src/features/scanning/useScanFeedback', () => ({ useScanFeedback: () => jest.fn() }));

describe('BusinessSummaryScreen', () => {
  it('states the scope and avoids full-profit or cash-balance claims', () => {
    const fixture = openCatalogueFixture();
    try {
      const client = createDatabaseFinanceClient(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        generateId: deterministicIds(15000),
      });
      render(<BusinessSummaryScreen client={client} isFocused={false} localDate="2026-09-18" onBack={() => undefined} />);
      expect(screen.getByText('Today’s summary')).toBeTruthy();
      expect(screen.getByText('Sales value (after discounts)')).toBeTruthy();
      expect(screen.getByText('Discounts given: ₦0.00')).toBeTruthy();
      expect(screen.getByText('Includes completed credit sales; this is not cash received.')).toBeTruthy();
      expect(screen.getByText('Tracked cost coverage is unavailable for today’s sales. Unavailable is not the same as zero.')).toBeTruthy();
      expect(screen.getByText('This is a tracked operating summary, not a full profit and loss, net profit, or cash-balance calculation.')).toBeTruthy();
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('excludes an actual discounted Sell draft and refreshes exact discounts after completion without subtracting twice', () => {
    const fixture = openCatalogueFixture();
    try {
      const catalogue = createCatalogueClient(fixture.adapter, fixture.context.store, fixture.context.device, deterministicIds(15500));
      const product = catalogue.createTemporaryProduct({ name: 'Discounted rice', defaultSellingPriceMinor: 1000 });
      const sales = createDatabaseSalesClient(fixture.adapter);
      const finance = createDatabaseFinanceClient(fixture.adapter);
      const day = finance.getBusinessSummary().range.localDate;
      const sell = render(<SellScreen client={sales} catalogueClient={catalogue} />);
      fireEvent.press(screen.getByText('Discounted rice'));
      fireEvent.changeText(screen.getByTestId('line-discount-input'), '2.50');
      fireEvent.press(screen.getByText('Add to cart'));
      expect(finance.getBusinessSummary(day)).toMatchObject({ discountsGivenMinor: 0, salesValueMinor: 0, transactionCount: 0 });
      fireEvent.press(screen.getByText(/^Complete sale ·/));
      expect(finance.getBusinessSummary(day)).toMatchObject({ discountsGivenMinor: 250, salesValueMinor: 750, transactionCount: 1 });
      sell.unmount();
      const summary = render(<BusinessSummaryScreen client={finance} localDate={day} isFocused={false} onBack={jest.fn()} />);
      expect(screen.getByText('Discounts given: ₦2.50')).toBeTruthy();
      expect(screen.getByText('₦7.50')).toBeTruthy();
      sales.completeSale({ lines: [{ storeProductId: product.storeProduct.id, packageUnitId: product.basePackage.id,
        quantityPackagesMicros: 1000000, unitPriceMinor: 500, discountAmountMinor: 100 }], payment: { method: 'CREDIT', customerName: 'Customer' } });
      fireEvent.press(screen.getByText('Refresh summary'));
      expect(screen.getByText('Discounts given: ₦3.50')).toBeTruthy();
      expect(screen.getByText('₦11.50')).toBeTruthy();
      expect(screen.getByText('Tracked cost coverage is unavailable for today’s sales. Unavailable is not the same as zero.')).toBeTruthy();
      const facts = finance.getBusinessSummary(day);
      expect(facts.recordedExpensesMinor).toBe(0); expect(facts.ownerWithdrawalsMinor).toBe(0);
      expect(facts.trackedGrossMarginMinor).toBeNull();
      summary.unmount();
    } finally { fixture.closeAndDelete(); }
  });
});
