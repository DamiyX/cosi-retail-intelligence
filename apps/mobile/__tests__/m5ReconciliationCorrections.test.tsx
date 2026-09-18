import { MICROS_PER_UNIT } from '@retail/domain';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { createCatalogueClient } from '../src/catalogue/client';
import { createPackage } from '../src/catalogue/managePackages';
import { createDatabaseInventoryClient } from '../src/inventory/client';
import ReconciliationScreen from '../src/screens/inventory/ReconciliationScreen';
import { completeSale } from '../src/sales/completeSale';
import { recordPurchase } from '../src/purchases/recordPurchase';
import { deterministicIds, openCatalogueFixture, reopenDatabase, testId } from './catalogueSupport';

function seedReconciliation() {
  const fixture = openCatalogueFixture();
  const catalogue = createCatalogueClient(fixture.adapter, fixture.context.store, fixture.context.device, deterministicIds(14000));
  const rice = catalogue.createTemporaryProduct({ name: 'Rice' });
  recordPurchase(fixture.adapter, {
    storeId: fixture.context.store.id,
    deviceId: fixture.context.device.id,
    userId: fixture.context.owner.id,
    lines: [{ storeProductId: rice.storeProduct.id, packageUnitId: rice.basePackage.id, quantityPackagesMicros: 40 * MICROS_PER_UNIT, enteredCostMinor: 400 }],
  }, { generateId: deterministicIds(14010), operationId: testId(14020) });
  const client = createDatabaseInventoryClient(fixture.adapter, {
    storeId: fixture.context.store.id,
    deviceId: fixture.context.device.id,
    userId: fixture.context.owner.id,
    generateId: deterministicIds(14030),
  });
  return { fixture, rice, client };
}

describe('M5 A05 reconciliation review and confirmation', () => {
  it('reveals the comparison only after submission and requires a deliberate discrepancy action', () => {
    const { fixture, rice, client } = seedReconciliation();
    try {
      render(<ReconciliationScreen client={client} storeProductId={rice.storeProduct.id} onBack={() => undefined} />);
      fireEvent.press(screen.getByText('Start blind count'));
      expect(screen.queryByText('Recorded stock: 40')).toBeNull();
      fireEvent.changeText(screen.getByTestId('reconciliation-physical-quantity'), '35');
      fireEvent.press(screen.getByText('Save first count'));
      expect(screen.getByText('Recorded stock: 40')).toBeTruthy();
      expect(screen.getByText('Difference: -5')).toBeTruthy();
      expect(screen.getByText('Discrepancy reason')).toBeTruthy();
      expect(screen.getByText('Confirm discrepancy and finalize')).toBeTruthy();
      fireEvent.press(screen.getByLabelText('Discrepancy reason Missing'));
      fireEvent.press(screen.getByText('Confirm discrepancy and finalize'));
      expect(screen.getByText('Stock check finalized')).toBeTruthy();
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('guards cancellation with a destructive confirmation', () => {
    const { fixture, rice, client } = seedReconciliation();
    let cancelAction: (() => void) | undefined;
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      cancelAction = buttons?.find((button) => button.text === 'Cancel stock check')?.onPress as (() => void) | undefined;
    });
    try {
      render(<ReconciliationScreen client={client} storeProductId={rice.storeProduct.id} onBack={() => undefined} />);
      fireEvent.press(screen.getByText('Start blind count'));
      fireEvent.press(screen.getByText('Cancel stock check'));
      expect(alertSpy).toHaveBeenCalledWith(
        'Cancel stock check?',
        'No count has been saved yet. Cancel this stock check?',
        expect.any(Array),
      );
      expect(screen.getByText('First count')).toBeTruthy();
      act(() => cancelAction?.());
      expect(screen.queryByText('First count')).toBeNull();
      expect(screen.getByText('Start blind count')).toBeTruthy();
    } finally {
      alertSpy.mockRestore();
      fixture.closeAndDelete();
    }
  });
});

describe('M5 A06 reconciliation recovery and entry modes', () => {
  it('reopens a submitted draft and does not create a duplicate session', () => {
    const { fixture, rice, client } = seedReconciliation();
    const path = fixture.path;
    try {
      const started = client.startReconciliation(rice.storeProduct.id);
      client.submitReconciliation({
        reconciliationId: started.reconciliationId,
        expectedInventoryWatermark: started.inventoryWatermark,
        expectedBatchWatermark: started.batchWatermark,
        physicalBaseUnits: 35 * MICROS_PER_UNIT,
        note: 'Shelf recount note',
      });
      fixture.adapter.close();
      const reopened = reopenDatabase(path);
      try {
        const resumedClient = createDatabaseInventoryClient(reopened, {
          storeId: fixture.context.store.id,
          deviceId: fixture.context.device.id,
          userId: fixture.context.owner.id,
          generateId: deterministicIds(14040),
        });
        expect(resumedClient.listOpenReconciliations()).toEqual([
          expect.objectContaining({
            reconciliationId: started.reconciliationId,
            draft: expect.objectContaining({ physicalBaseUnits: String(35 * MICROS_PER_UNIT), note: 'Shelf recount note' }),
          }),
        ]);
        render(<ReconciliationScreen client={resumedClient} onBack={() => undefined} />);
        fireEvent.press(screen.getByText('Resume Rice'));
        expect(screen.getByText('Review count')).toBeTruthy();
        expect(screen.getByTestId('reconciliation-physical-quantity').props.value).toBe('35');
        expect(resumedClient.startReconciliation(rice.storeProduct.id).reconciliationId).toBe(started.reconciliationId);
        expect(resumedClient.listOpenReconciliations()).toHaveLength(1);
      } finally {
        reopened.close();
      }
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('converts package counts exactly and exposes zero-balance groups for complete recounts', () => {
    const { fixture, rice } = seedReconciliation();
    try {
      const pack = createPackage(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        storeProductId: rice.storeProduct.id,
        name: 'Pack',
        conversionText: '10',
        setting: { isPreferredForSale: true },
      }, { generateId: deterministicIds(14050), operationId: testId(14060) });
      const client = createDatabaseInventoryClient(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        generateId: deterministicIds(14070),
      });
      render(<ReconciliationScreen client={client} storeProductId={rice.storeProduct.id} onBack={() => undefined} />);
      fireEvent.press(screen.getByText('Start blind count'));
      fireEvent.press(screen.getByLabelText('Count in Pack'));
      fireEvent.changeText(screen.getByTestId('reconciliation-physical-quantity'), '4');
      fireEvent.press(screen.getByText('Save first count'));
      expect(screen.getByText('Recorded stock: 40')).toBeTruthy();
      expect(screen.getByText('Physical count: 40')).toBeTruthy();
      fireEvent.press(screen.getByText('Finalize stock check'));
      expect(screen.getByText('Stock check finalized')).toBeTruthy();
      expect(pack.packageUnit.conversionToBaseMicros).toBe(10 * MICROS_PER_UNIT);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('renders a zero-balance recorded group when complete recount mode is selected', () => {
    const { fixture, rice } = seedReconciliation();
    try {
      completeSale(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        lines: [{ storeProductId: rice.storeProduct.id, packageUnitId: rice.basePackage.id, quantityPackagesMicros: 40 * MICROS_PER_UNIT, unitPriceMinor: 20 }],
        payment: { method: 'CASH' },
      }, { generateId: deterministicIds(14080), operationId: testId(14090) });
      const client = createDatabaseInventoryClient(fixture.adapter, { storeId: fixture.context.store.id, deviceId: fixture.context.device.id, userId: fixture.context.owner.id, generateId: deterministicIds(14100) });
      render(<ReconciliationScreen client={client} storeProductId={rice.storeProduct.id} onBack={() => undefined} />);
      fireEvent.press(screen.getByText('Start blind count'));
      fireEvent.changeText(screen.getByTestId('reconciliation-physical-quantity'), '0');
      fireEvent.press(screen.getByText('Save first count'));
      fireEvent.press(screen.getByText('Review each recorded group'));
      expect(screen.getAllByText(/recorded 0/).length).toBeGreaterThan(0);
    } finally {
      fixture.closeAndDelete();
    }
  });
});
