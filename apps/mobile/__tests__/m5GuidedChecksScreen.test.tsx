import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { createCatalogueClient } from '../src/catalogue/client';
import { createDatabaseInventoryClient, type InventoryClient } from '../src/inventory/client';
import GuidedChecksScreen from '../src/screens/inventory/GuidedChecksScreen';
import { recordPurchase } from '../src/purchases/recordPurchase';
import { MICROS_PER_UNIT } from '@retail/domain';
import { deterministicIds, openCatalogueFixture, testId } from './catalogueSupport';

function seed() {
  const fixture = openCatalogueFixture();
  const catalogue = createCatalogueClient(fixture.adapter, fixture.context.store, fixture.context.device, deterministicIds(7800));
  const product = catalogue.createTemporaryProduct({ name: 'Rice' });
  recordPurchase(fixture.adapter, {
    storeId: fixture.context.store.id,
    deviceId: fixture.context.device.id,
    userId: fixture.context.owner.id,
    lines: [{ storeProductId: product.storeProduct.id, packageUnitId: product.basePackage.id, quantityPackagesMicros: 4 * MICROS_PER_UNIT, enteredCostMinor: 400 }],
  }, { generateId: deterministicIds(7810), operationId: testId(7820) });
  const client = createDatabaseInventoryClient(fixture.adapter, {
    storeId: fixture.context.store.id,
    deviceId: fixture.context.device.id,
    userId: fixture.context.owner.id,
    generateId: deterministicIds(7830),
  });
  return { fixture, client };
}

describe('GuidedChecksScreen', () => {
  it('refreshes when a first focused mount reveals a newly assigned check', async () => {
    const { fixture, client: realClient } = seed();
    try {
      realClient.generateGuidedChecks({ operationId: testId(7840), now: '2026-09-18T10:00:00.000Z' });
      const current = realClient.getGuidedCheckOverview('2026-09-18T10:00:00.000Z');
      const stale = { ...current, pending: [], today: [], reason: 'READY' as const, generatedInitialCount: 0, pendingAssignmentCount: 0, completedInitialCount: 0, replacedAssignmentCount: 0, exhaustedAssignmentCount: 0, remainingTarget: 3 };
      let firstRead = true;
      const client: InventoryClient = {
        ...realClient,
        getGuidedCheckOverview: () => {
          if (firstRead) {
            firstRead = false;
            return stale;
          }
          return current;
        },
      };
      const view = render(<GuidedChecksScreen client={client} onBack={() => undefined} onStartCheck={() => undefined} isFocused={false} />);
      expect(screen.queryByText('Rice')).toBeNull();
      view.rerender(<GuidedChecksScreen client={client} onBack={() => undefined} onStartCheck={() => undefined} isFocused />);
      await waitFor(() => expect(screen.getByText('Rice')).toBeTruthy());
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('shows the owner routine and preserves settings after a durable save failure', async () => {
    const { fixture, client: realClient } = seed();
    try {
      const client: InventoryClient = {
        ...realClient,
        saveGuidedCheckSettings() {
          throw new Error('Storage unavailable.');
        },
      };
      render(<GuidedChecksScreen client={client} onBack={() => undefined} onStartCheck={() => undefined} />);
      await waitFor(() => expect(screen.getByText('Guided stock checks')).toBeTruthy());
      fireEvent.changeText(screen.getByTestId('guided-daily-target'), '5');
      fireEvent.press(screen.getByText('Save routine settings'));
      expect(screen.getByText('Storage unavailable.')).toBeTruthy();
      expect(screen.getByTestId('guided-daily-target').props.value).toBe('5');
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('does not render an accusation or an accuracy claim in replacement guidance', async () => {
    const { fixture, client } = seed();
    try {
      render(<GuidedChecksScreen client={client} onBack={() => undefined} onStartCheck={() => undefined} />);
      fireEvent.press(screen.getByText('Generate today’s checks'));
      await waitFor(() => expect(screen.getByText('Rice')).toBeTruthy());
      expect(screen.queryByText(/theft|stolen|accuracy verified/i)).toBeNull();
    } finally {
      fixture.closeAndDelete();
    }
  });
});
