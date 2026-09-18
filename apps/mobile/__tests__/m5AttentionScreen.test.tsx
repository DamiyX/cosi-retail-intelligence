import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
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
  it('refreshes when a first focused mount reveals a previously stale view', async () => {
    const { fixture, client: realClient } = seed();
    try {
      const current = realClient.getAttentionOverview('2026-09-18T08:00:00.000Z');
      const stale = { ...current, items: [], allConditionCount: 0, suppressedCount: 0 };
      let firstRead = true;
      const client: InventoryClient = {
        ...realClient,
        getAttentionOverview: () => {
          if (firstRead) {
            firstRead = false;
            return stale;
          }
          return current;
        },
      };
      const view = render(<AttentionScreen client={client} onBack={() => undefined} onRestock={() => undefined} onReconcile={() => undefined} onRemove={() => undefined} isFocused={false} />);
      expect(screen.queryByText('Rice: low recorded stock')).toBeNull();
      view.rerender(<AttentionScreen client={client} onBack={() => undefined} onRestock={() => undefined} onReconcile={() => undefined} onRemove={() => undefined} isFocused />);
      await waitFor(() => expect(screen.getByText('Rice: low recorded stock')).toBeTruthy());
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('shows a real low-stock condition, routes the primary action, and can snooze it', async () => {
    const { fixture, client } = seed();
    const onRestock = jest.fn();
    try {
      render(<AttentionScreen client={client} onBack={() => undefined} onRestock={onRestock} onReconcile={() => undefined} onRemove={() => undefined} />);
      await waitFor(() => expect(screen.getByText('Needs attention')).toBeTruthy());
      expect(screen.getByText('Rice: low recorded stock')).toBeTruthy();

      fireEvent.press(screen.getByText('Restock product'));
      expect(onRestock).toHaveBeenCalledWith(expect.any(String));

      fireEvent.press(screen.getAllByText('Later today')[0]);
      expect(screen.queryByText('Rice: low recorded stock')).toBeNull();
      expect(screen.getByText('Rice: undated stock coverage')).toBeTruthy();
      expect(screen.getByText(/1 current reminder snoozed/)).toBeTruthy();
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('preserves the lead-time entry when the durable settings save fails', async () => {
    const { fixture, client: realClient } = seed();
    try {
      const client: InventoryClient = {
        ...realClient,
        saveAttentionSettings() {
          throw new Error('Storage unavailable.');
        },
      };
      render(<AttentionScreen client={client} onBack={() => undefined} onRestock={() => undefined} onReconcile={() => undefined} onRemove={() => undefined} />);
      await waitFor(() => expect(screen.getByTestId('attention-lead-days')).toBeTruthy());
      fireEvent.changeText(screen.getByTestId('attention-lead-days'), '45');
      fireEvent.press(screen.getByText('Save reminder settings'));
      expect(screen.getByText('Storage unavailable.')).toBeTruthy();
      expect(screen.getByTestId('attention-lead-days').props.value).toBe('45');
    } finally {
      fixture.closeAndDelete();
    }
  });
});
