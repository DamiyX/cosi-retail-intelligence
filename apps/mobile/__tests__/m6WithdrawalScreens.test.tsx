import { fireEvent, render, screen } from '@testing-library/react-native';

import { createDatabaseFinanceClient, type FinanceClient } from '../src/finance/client';
import OwnerWithdrawalEntryScreen from '../src/screens/finance/OwnerWithdrawalEntryScreen';
import OwnerWithdrawalHistoryScreen from '../src/screens/finance/OwnerWithdrawalHistoryScreen';
import { countRows, deterministicIds, openCatalogueFixture } from './catalogueSupport';

function seedClient(): { fixture: ReturnType<typeof openCatalogueFixture>; client: FinanceClient } {
  const fixture = openCatalogueFixture();
  return {
    fixture,
    client: createDatabaseFinanceClient(fixture.adapter, {
      storeId: fixture.context.store.id,
      deviceId: fixture.context.device.id,
      userId: fixture.context.owner.id,
      generateId: deterministicIds(11000),
    }),
  };
}

describe('Owner withdrawal screens', () => {
  it('reviews and saves a withdrawal without creating an expense', () => {
    const { fixture, client } = seedClient();
    try {
      render(<OwnerWithdrawalEntryScreen client={client} onBack={() => undefined} onOpenHistory={() => undefined} />);
      fireEvent.changeText(screen.getByTestId('withdrawal-amount'), '750.00');
      fireEvent.changeText(screen.getByTestId('withdrawal-note'), 'Personal use');
      fireEvent.press(screen.getByText('Review owner withdrawal'));
      fireEvent.press(screen.getByText('Confirm and save'));
      expect(screen.getByText('Owner withdrawal saved')).toBeTruthy();
      expect(screen.getByText('₦750.00 was saved on this device as an owner or personal withdrawal.')).toBeTruthy();
      expect(countRows(fixture.adapter, 'owner_withdrawals')).toBe(1);
      expect(countRows(fixture.adapter, 'expenses')).toBe(0);

      render(<OwnerWithdrawalHistoryScreen client={client} isFocused={false} onBack={() => undefined} onRecordWithdrawal={() => undefined} />);
      expect(screen.getByText('₦750.00')).toBeTruthy();
      expect(screen.getByText('Personal use')).toBeTruthy();
      expect(screen.getByText('Withdrawals are not store expenses or a cash-balance calculation.')).toBeTruthy();
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('keeps the withdrawal draft and operation ID across a failed save', () => {
    const { fixture, client: realClient } = seedClient();
    try {
      const attempts: string[] = [];
      let shouldFail = true;
      const client: FinanceClient = {
        ...realClient,
        recordOwnerWithdrawal(input) {
          attempts.push(input.operationId ?? 'missing');
          if (shouldFail) {
            shouldFail = false;
            throw new Error('Storage unavailable.');
          }
          return realClient.recordOwnerWithdrawal(input);
        },
      };
      render(<OwnerWithdrawalEntryScreen client={client} onBack={() => undefined} onOpenHistory={() => undefined} />);
      fireEvent.changeText(screen.getByTestId('withdrawal-amount'), '40.00');
      fireEvent.press(screen.getByText('Review owner withdrawal'));
      fireEvent.press(screen.getByText('Confirm and save'));
      expect(screen.getByText('Storage unavailable.')).toBeTruthy();
      fireEvent.press(screen.getByText('Confirm and save'));
      expect(screen.getByText('Owner withdrawal saved')).toBeTruthy();
      expect(attempts).toHaveLength(2);
      expect(attempts[0]).toBe(attempts[1]);
    } finally {
      fixture.closeAndDelete();
    }
  });
});
