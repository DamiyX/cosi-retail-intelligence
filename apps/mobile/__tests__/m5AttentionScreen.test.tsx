import { fireEvent, render, screen } from '@testing-library/react-native';
import { MICROS_PER_UNIT } from '@retail/domain';

import { createCatalogueClient } from '../src/catalogue/client';
import { createDatabaseInventoryClient, type InventoryClient } from '../src/inventory/client';
import AttentionScreen from '../src/screens/inventory/AttentionScreen';
import { recordPurchase } from '../src/purchases/recordPurchase';
import { deterministicIds, openCatalogueFixture, testId } from './catalogueSupport';

function seed() {
  const fixture = openCatalogueFixture();
  const catalogue = createCatalogueClient(fixture.adapter, fixture.context.store, fixture.context.device, deterministicIds(9600));
  const rice = catalogue.createTemporaryProduct({ name: 'Rice' });
  recordPurchase(fixture.adapter, {
    storeId: fixture.context.store.id,
    deviceId: fixture.context.device.id,
    userId: fixture.context.owner.id,
    lines: [{
      storeProductId: rice.storeProduct.id,
      packageUnitId: rice.basePackage.id,
      quantityPackagesMicros: 2 * MICROS_PER_UNIT,
      enteredCostMinor: 200,
    }],
  }, { generateId: deterministicIds(9610), operationId: testId(9620) });
  fixture.adapter.run('UPDATE store_products SET reorder_level_base_micros = ? WHERE id = ?;', [5 * MICROS_PER_UNIT, rice.storeProduct.id]);
  const client = createDatabaseInventoryClient(fixture.adapter, {
    storeId: fixture.context.store.id,
    deviceId: fixture.context.device.id,
    userId: fixture.context.owner.id,
    generateId: deterministicIds(9630),
  });
  return { fixture, client };
}

describe('AttentionScreen', () => {
  it('shows a real low-stock condition, routes the primary action, and can snooze it', () => {
    const { fixture, client } = seed();
    const onRestock = jest.fn();
    try {
      render(<AttentionScreen client={client} onBack={() => undefined} onRestock={onRestock} onReconcile={() => undefined} onRemove={() => undefined} />);
      expect(screen.getByText('Needs attention')).toBeTruthy();
      expect(screen.getByText('Rice: low recorded stock')).toBeTruthy();

      fireEvent.press(screen.getByText('Restock product'));
      expect(onRestock).toHaveBeenCalledWith(expect.any(String));

      fireEvent.press(screen.getByText('Later today'));
      expect(screen.getByText('Reminders are snoozed')).toBeTruthy();
      expect(screen.getByText(/1 current reminder snoozed/)).toBeTruthy();
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('preserves the lead-time entry when the durable settings save fails', () => {
    const { fixture, client: realClient } = seed();
    try {
      const client: InventoryClient = {
        ...realClient,
        saveAttentionSettings() {
          throw new Error('Storage unavailable.');
        },
      };
      render(<AttentionScreen client={client} onBack={() => undefined} onRestock={() => undefined} onReconcile={() => undefined} onRemove={() => undefined} />);
      fireEvent.changeText(screen.getByTestId('attention-lead-days'), '45');
      fireEvent.press(screen.getByText('Save reminder settings'));
      expect(screen.getByText('Storage unavailable.')).toBeTruthy();
      expect(screen.getByTestId('attention-lead-days').props.value).toBe('45');
    } finally {
      fixture.closeAndDelete();
    }
  });
});
