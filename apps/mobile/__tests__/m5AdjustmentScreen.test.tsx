import { fireEvent, render, screen } from '@testing-library/react-native';
import { MICROS_PER_UNIT } from '@retail/domain';

import { createCatalogueClient } from '../src/catalogue/client';
import { createDatabaseInventoryClient, type InventoryClient } from '../src/inventory/client';
import { recordPurchase } from '../src/purchases/recordPurchase';
import AdjustmentScreen from '../src/screens/inventory/AdjustmentScreen';
import { deterministicIds, openCatalogueFixture, testId } from './catalogueSupport';

function seed() {
  const fixture = openCatalogueFixture();
  const catalogue = createCatalogueClient(fixture.adapter, fixture.context.store, fixture.context.device, deterministicIds(5400));
  const rice = catalogue.createTemporaryProduct({ name: 'Rice' });
  recordPurchase(fixture.adapter, {
    storeId: fixture.context.store.id,
    deviceId: fixture.context.device.id,
    userId: fixture.context.owner.id,
    lines: [{
      storeProductId: rice.storeProduct.id,
      packageUnitId: rice.basePackage.id,
      quantityPackagesMicros: 40 * MICROS_PER_UNIT,
      enteredCostMinor: 400,
      expiryPrecision: 'DAY',
      expiryValue: '2026-10-20',
      expiryMeaning: 'EXPIRY',
    }],
  }, { generateId: deterministicIds(5410), operationId: testId(5420) });
  const client = createDatabaseInventoryClient(fixture.adapter, {
    storeId: fixture.context.store.id,
    deviceId: fixture.context.device.id,
    userId: fixture.context.owner.id,
    generateId: deterministicIds(5430),
  });
  return { fixture, rice, client };
}

describe('AdjustmentScreen', () => {
  it('records an expired removal against a selected group', () => {
    const { fixture, rice, client } = seed();
    try {
      const group = client.getBatchProjection(rice.storeProduct.id).groups[0];
      render(<AdjustmentScreen client={client} storeProductId={rice.storeProduct.id} onBack={() => undefined} />);
      fireEvent.changeText(screen.getByTestId('adjustment-quantity'), '5');
      fireEvent.press(screen.getByLabelText(`Adjust group ${group.id}`));
      fireEvent.press(screen.getByText('Record adjustment'));
      expect(screen.getByText('Adjustment saved')).toBeTruthy();
      expect(client.getBatchProjection(rice.storeProduct.id).groups[0].balanceBaseMicros).toBe(String(35 * MICROS_PER_UNIT));
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('retains quantity and group input when the durable adjustment fails', () => {
    const { fixture, rice, client: realClient } = seed();
    try {
      const group = realClient.getBatchProjection(rice.storeProduct.id).groups[0];
      const client: InventoryClient = {
        ...realClient,
        recordAdjustment() {
          throw new Error('Storage unavailable.');
        },
      };
      render(<AdjustmentScreen client={client} storeProductId={rice.storeProduct.id} onBack={() => undefined} />);
      fireEvent.changeText(screen.getByTestId('adjustment-quantity'), '5');
      fireEvent.press(screen.getByLabelText(`Adjust group ${group.id}`));
      fireEvent.press(screen.getByText('Record adjustment'));
      expect(screen.getByText('Storage unavailable.')).toBeTruthy();
      expect(screen.getByTestId('adjustment-quantity').props.value).toBe('5');
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('reuses the same operation ID when an adjustment action is retried', () => {
    const { fixture, rice, client: realClient } = seed();
    try {
      const calls: { operationId?: string }[] = [];
      let failed = true;
      const client: InventoryClient = {
        ...realClient,
        recordAdjustment(input) {
          calls.push(input);
          if (failed) {
            failed = false;
            throw new Error('Temporary storage failure.');
          }
          return realClient.recordAdjustment(input);
        },
      };
      render(<AdjustmentScreen client={client} storeProductId={rice.storeProduct.id} onBack={() => undefined} />);
      fireEvent.press(screen.getByText('Record adjustment'));
      expect(screen.getByText('Temporary storage failure.')).toBeTruthy();
      fireEvent.press(screen.getByText('Record adjustment'));
      expect(screen.getByText('Adjustment saved')).toBeTruthy();
      expect(calls).toHaveLength(2);
      expect(calls[0].operationId).toBeDefined();
      expect(calls[1].operationId).toBe(calls[0].operationId);
    } finally {
      fixture.closeAndDelete();
    }
  });
});
