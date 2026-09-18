import { fireEvent, render, screen } from '@testing-library/react-native';
import { MICROS_PER_UNIT } from '@retail/domain';

import { createCatalogueClient } from '../src/catalogue/client';
import { createInventoryEvent } from '../src/db/repositories';
import { createDatabaseInventoryClient, type InventoryClient } from '../src/inventory/client';
import BatchReviewScreen from '../src/screens/inventory/BatchReviewScreen';
import { deterministicIds, openCatalogueFixture, testId } from './catalogueSupport';

function seed() {
  const fixture = openCatalogueFixture();
  const catalogue = createCatalogueClient(fixture.adapter, fixture.context.store, fixture.context.device, deterministicIds(4200));
  const rice = catalogue.createTemporaryProduct({ name: 'Rice' });
  createInventoryEvent(fixture.adapter, {
    id: testId(4210),
    storeId: fixture.context.store.id,
    storeProductId: rice.storeProduct.id,
    eventType: 'OPENING_BALANCE',
    quantityBaseDeltaMicros: 40 * MICROS_PER_UNIT,
    sourceType: 'OPENING_BALANCE',
    sourceId: testId(4211),
    occurredAt: '2026-01-01T00:00:00.000Z',
    createdByUserId: fixture.context.owner.id,
    deviceId: fixture.context.device.id,
  });
  const client = createDatabaseInventoryClient(fixture.adapter, {
    storeId: fixture.context.store.id,
    deviceId: fixture.context.device.id,
    userId: fixture.context.owner.id,
    generateId: deterministicIds(4220),
  });
  return { fixture, rice, client };
}

describe('BatchReviewScreen', () => {
  it('retains two inspected group inputs and saves a net-zero classification', () => {
    const { fixture, rice, client } = seed();
    try {
      render(<BatchReviewScreen client={client} storeProductId={rice.storeProduct.id} onBack={() => undefined} />);
      expect(screen.getByText('Unknown remaining: 40')).toBeTruthy();
      fireEvent.changeText(screen.getByTestId('batch-review-quantity'), '10');
      fireEvent.press(screen.getByLabelText('Review date date'));
      fireEvent.changeText(screen.getByTestId('batch-review-date'), '2026-10-20');
      fireEvent.press(screen.getByLabelText('Review meaning expiry'));
      fireEvent.press(screen.getByText('Add inspected group'));
      fireEvent.changeText(screen.getByTestId('batch-review-quantity'), '30');
      fireEvent.press(screen.getByLabelText('Review date month'));
      fireEvent.changeText(screen.getByTestId('batch-review-date'), '2027-01');
      fireEvent.press(screen.getByLabelText('Review meaning best before'));
      fireEvent.press(screen.getByText('Add inspected group'));
      expect(screen.getByText('Pending classification (2)')).toBeTruthy();
      fireEvent.press(screen.getByText('Classify inspected stock'));
      expect(screen.getByText('Classification saved')).toBeTruthy();
      expect(client.getBatchProjection(rice.storeProduct.id).unknownResidualBaseMicros).toBe('0');
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('keeps pending entries when the durable classification write fails', () => {
    const { fixture, rice, client: realClient } = seed();
    try {
      const client: InventoryClient = {
        ...realClient,
        classifyUnknown() {
          throw new Error('Storage unavailable.');
        },
      };
      render(<BatchReviewScreen client={client} storeProductId={rice.storeProduct.id} onBack={() => undefined} />);
      fireEvent.changeText(screen.getByTestId('batch-review-quantity'), '10');
      fireEvent.press(screen.getByLabelText('Review date date'));
      fireEvent.changeText(screen.getByTestId('batch-review-date'), '2026-10-20');
      fireEvent.press(screen.getByText('Add inspected group'));
      fireEvent.press(screen.getByText('Classify inspected stock'));
      expect(screen.getByText('Storage unavailable.')).toBeTruthy();
      expect(screen.getByText('Pending classification (1)')).toBeTruthy();
    } finally {
      fixture.closeAndDelete();
    }
  });
});
