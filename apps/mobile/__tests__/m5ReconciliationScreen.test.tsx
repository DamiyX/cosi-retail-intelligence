import { fireEvent, render, screen } from '@testing-library/react-native';
import { MICROS_PER_UNIT } from '@retail/domain';

import { createCatalogueClient } from '../src/catalogue/client';
import { createDatabaseInventoryClient, type InventoryClient } from '../src/inventory/client';
import { recordPurchase } from '../src/purchases/recordPurchase';
import ReconciliationScreen from '../src/screens/inventory/ReconciliationScreen';
import { deterministicIds, openCatalogueFixture, testId } from './catalogueSupport';

function seed() {
  const fixture = openCatalogueFixture();
  const catalogue = createCatalogueClient(fixture.adapter, fixture.context.store, fixture.context.device, deterministicIds(6200));
  const rice = catalogue.createTemporaryProduct({ name: 'Rice' });
  recordPurchase(fixture.adapter, {
    storeId: fixture.context.store.id,
    deviceId: fixture.context.device.id,
    userId: fixture.context.owner.id,
    lines: [{ storeProductId: rice.storeProduct.id, packageUnitId: rice.basePackage.id, quantityPackagesMicros: 40 * MICROS_PER_UNIT, enteredCostMinor: 400 }],
  }, { generateId: deterministicIds(6210), operationId: testId(6220) });
  const client = createDatabaseInventoryClient(fixture.adapter, { storeId: fixture.context.store.id, deviceId: fixture.context.device.id, userId: fixture.context.owner.id, generateId: deterministicIds(6230) });
  return { fixture, rice, client };
}

describe('ReconciliationScreen', () => {
  it('keeps the expected quantity blind and finalizes a matching count', () => {
    const { fixture, rice, client } = seed();
    try {
      render(<ReconciliationScreen client={client} storeProductId={rice.storeProduct.id} onBack={() => undefined} />);
      expect(screen.queryByText('Recorded stock')).toBeNull();
      fireEvent.press(screen.getByText('Start blind count'));
      expect(screen.getByTestId('reconciliation-physical-quantity').props.value).toBe('');
      expect(screen.queryByText(String(40 * MICROS_PER_UNIT))).toBeNull();
      fireEvent.changeText(screen.getByTestId('reconciliation-physical-quantity'), '40');
      fireEvent.press(screen.getByText('Save first count'));
      expect(screen.getByText('Save recount')).toBeTruthy();
      fireEvent.press(screen.getByText('Finalize stock check'));
      expect(screen.getByText('Stock check finalized')).toBeTruthy();
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('retains the physical input when the durable submission fails', () => {
    const { fixture, rice, client: realClient } = seed();
    try {
      const client: InventoryClient = {
        ...realClient,
        submitReconciliation() {
          throw new Error('Storage unavailable.');
        },
      };
      render(<ReconciliationScreen client={client} storeProductId={rice.storeProduct.id} onBack={() => undefined} />);
      fireEvent.press(screen.getByText('Start blind count'));
      fireEvent.changeText(screen.getByTestId('reconciliation-physical-quantity'), '40');
      fireEvent.press(screen.getByText('Save first count'));
      expect(screen.getByText('Storage unavailable.')).toBeTruthy();
      expect(screen.getByTestId('reconciliation-physical-quantity').props.value).toBe('40');
    } finally {
      fixture.closeAndDelete();
    }
  });
});
