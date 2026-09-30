import { fireEvent, render, screen } from '@testing-library/react-native';
import { createCatalogueClient } from '../src/catalogue/client';
import { createTemporaryProduct } from '../src/catalogue/createTemporaryProduct';
import { createDatabaseSalesClient } from '../src/sales/client';
import QuickAddProductScreen from '../src/screens/products/QuickAddProductScreen';
import { deterministicIds, openCatalogueFixture, reopenDatabase, testId } from './catalogueSupport';

it('price is the only typed requirement; validates before writing and guards rapid duplicate save', () => {
  const f = openCatalogueFixture();
  try {
    const ready = jest.fn();
    const client = createCatalogueClient(f.adapter, f.context.store, f.context.device, deterministicIds(1000));
    const { unmount } = render(<QuickAddProductScreen client={client} saleShortcut onSaleReady={ready} onSaved={jest.fn()} onCancel={jest.fn()} />);
    expect(screen.queryByTestId('quick-add-name')).toBeNull();
    expect(screen.queryByTestId('quick-add-base-unit')).toBeNull();
    expect(screen.getByTestId('quick-add-quantity').props.value).toBe('1');
    fireEvent.changeText(screen.getByTestId('quick-add-price'), '1.001');
    fireEvent.press(screen.getByText('Add to basket'));
    expect(f.adapter.getAllRows('SELECT id FROM store_products')).toHaveLength(0);
    fireEvent.changeText(screen.getByTestId('quick-add-price'), '1.25');
    fireEvent.changeText(screen.getByTestId('quick-add-quantity'), '2');
    const button = screen.getByText('Add to basket');
    fireEvent.press(button);
    fireEvent.press(button);
    expect(ready).toHaveBeenCalledTimes(1);
    expect(ready.mock.calls[0][1]).toBe(2000000);
    expect(ready.mock.calls[0][0].storeProduct.defaultSellingPriceMinor).toBe(125);
    expect(f.adapter.getAllRows('SELECT id FROM store_products')).toHaveLength(1);
    unmount();
  } finally { f.closeAndDelete(); }
});

it('generated products are distinct, replay keeps identity, and later naming never changes a completed sale', () => {
  const f = openCatalogueFixture();
  try {
    const input = { storeId: f.context.store.id, deviceId: f.context.device.id, name: '', generateTemporaryLabel: true, defaultSellingPriceMinor: 125 };
    const a = createTemporaryProduct(f.adapter, input, { generateId: deterministicIds(1000), operationId: testId(9000) });
    const b = createTemporaryProduct(f.adapter, input, { generateId: deterministicIds(2000), operationId: testId(9001) });
    expect(a.variant.name).not.toBe(b.variant.name);
    expect(a.variant.name).toMatch(/^Unfinished product /);
    expect(createTemporaryProduct(f.adapter, input, { operationId: testId(9000) }).storeProduct.id).toBe(a.storeProduct.id);
    expect(f.adapter.getAllRows('SELECT id FROM store_products')).toHaveLength(2);
    const sale = createDatabaseSalesClient(f.adapter).completeSale({ lines: [{ storeProductId: a.storeProduct.id, packageUnitId: a.basePackage.id, quantityPackagesMicros: 2000000, unitPriceMinor: 125 }], payment: { method: 'CASH' } });
    const before = f.adapter.getAllRows('SELECT * FROM sale_items WHERE sale_id = ?', [sale.sale.id]);
    createCatalogueClient(f.adapter, f.context.store, f.context.device).updateProductIdentity({ storeProductId: a.storeProduct.id, name: 'Identified later' });
    const restarted = reopenDatabase(f.path);
    try { expect(restarted.getAllRows('SELECT * FROM sale_items WHERE sale_id = ?', [sale.sale.id])).toEqual(before); } finally { restarted.close(); }
  } finally { f.closeAndDelete(); }
});
