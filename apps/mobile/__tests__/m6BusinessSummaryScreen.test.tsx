import { render, screen } from '@testing-library/react-native';

import { createDatabaseFinanceClient } from '../src/finance/client';
import BusinessSummaryScreen from '../src/screens/finance/BusinessSummaryScreen';
import { deterministicIds, openCatalogueFixture } from './catalogueSupport';

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
      expect(screen.getByText('Includes completed credit sales; this is not cash received.')).toBeTruthy();
      expect(screen.getByText('Tracked cost coverage is unavailable for today’s sales. Unavailable is not the same as zero.')).toBeTruthy();
      expect(screen.getByText('This is a tracked operating summary, not a full profit and loss, net profit, or cash-balance calculation.')).toBeTruthy();
    } finally {
      fixture.closeAndDelete();
    }
  });
});
