import { fireEvent, render, screen } from '@testing-library/react-native';

import { createDatabaseFinanceClient, type FinanceClient } from '../src/finance/client';
import ExpenseEntryScreen from '../src/screens/finance/ExpenseEntryScreen';
import ExpenseHistoryScreen from '../src/screens/finance/ExpenseHistoryScreen';
import { countRows, deterministicIds, openCatalogueFixture } from './catalogueSupport';

function seedClient(): { fixture: ReturnType<typeof openCatalogueFixture>; client: FinanceClient } {
  const fixture = openCatalogueFixture();
  return {
    fixture,
    client: createDatabaseFinanceClient(fixture.adapter, {
      storeId: fixture.context.store.id,
      deviceId: fixture.context.device.id,
      userId: fixture.context.owner.id,
      generateId: deterministicIds(7000),
    }),
  };
}

describe('Expense screens', () => {
  it('reviews and saves an expense, then exposes its local history', () => {
    const { fixture, client } = seedClient();
    try {
      render(<ExpenseEntryScreen client={client} onBack={() => undefined} onOpenHistory={() => undefined} />);
      fireEvent.changeText(screen.getByTestId('expense-amount'), '1250.50');
      fireEvent.press(screen.getByTestId('expense-category-TRANSPORT'));
      fireEvent.changeText(screen.getByTestId('expense-note'), 'Market delivery');
      fireEvent.press(screen.getByText('Review expense'));
      expect(screen.getByText('Review expense')).toBeTruthy();
      fireEvent.press(screen.getByText('Confirm and save'));
      expect(screen.getByText('Expense saved')).toBeTruthy();
      expect(screen.getByText('₦1,250.50 was saved on this device under transport.')).toBeTruthy();
      expect(countRows(fixture.adapter, 'expenses')).toBe(1);

      render(<ExpenseHistoryScreen client={client} isFocused={false} onBack={() => undefined} onRecordExpense={() => undefined} />);
      expect(screen.getByText('₦1,250.50')).toBeTruthy();
      expect(screen.getByText('Market delivery')).toBeTruthy();
      expect(screen.getByText('Saved on this device · waiting to sync')).toBeTruthy();
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('keeps the draft and the same operation ID when a save fails', () => {
    const { fixture, client: realClient } = seedClient();
    try {
      const attempts: string[] = [];
      let shouldFail = true;
      const client: FinanceClient = {
        ...realClient,
        recordExpense(input) {
          attempts.push(input.operationId ?? 'missing');
          if (shouldFail) {
            shouldFail = false;
            throw new Error('Storage unavailable.');
          }
          return realClient.recordExpense(input);
        },
      };
      const dirty: boolean[] = [];
      render(<ExpenseEntryScreen client={client} onBack={() => undefined} onOpenHistory={() => undefined} onDirtyDraftChange={(value) => dirty.push(value)} />);
      fireEvent.changeText(screen.getByTestId('expense-amount'), '40.00');
      fireEvent.press(screen.getByText('Review expense'));
      fireEvent.press(screen.getByText('Confirm and save'));
      expect(screen.getByText('Storage unavailable.')).toBeTruthy();
      expect(screen.getByText('Confirm and save')).toBeTruthy();
      fireEvent.press(screen.getByText('Confirm and save'));
      expect(screen.getByText('Expense saved')).toBeTruthy();
      expect(attempts).toHaveLength(2);
      expect(attempts[0]).toBe(attempts[1]);
      expect(dirty).toContain(true);
      expect(dirty.at(-1)).toBe(false);
    } finally {
      fixture.closeAndDelete();
    }
  });
});
