import { DomainError } from '@retail/domain';

import { recordExpense } from '../src/finance';
import { MIGRATIONS, openDatabase } from '../src/db';
import {
  countPendingOutboxOperations,
  createDevice,
  createStore,
  createStoreMember,
  createUser,
  findOutboxOperation,
  getExpenseById,
  listExpensesByStore,
} from '../src/db/repositories';
import { openIsolatedDatabase } from '../src/db/testing';
import {
  countRows,
  deterministicIds,
  FailOnWriteAdapter,
  openCatalogueFixture,
  reopenDatabase,
} from './catalogueSupport';

function expectDomainError(fn: () => unknown, code: DomainError['code']): void {
  try {
    fn();
    throw new Error('Expected a DomainError but none was thrown.');
  } catch (error) {
    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe(code);
  }
}

describe('M6-01 expenses', () => {
  it('records one immutable owner expense with one canonical outbox envelope and replays it idempotently', () => {
    const fixture = openCatalogueFixture();
    try {
      const input = {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        category: 'TRANSPORT' as const,
        amountMinor: 125050,
        currencyCode: 'NGN',
        note: 'Market delivery',
        occurredAt: '2026-09-18T08:30:00.000Z',
      };
      const first = recordExpense(fixture.adapter, input, {
        operationId: '00000000-0000-4000-8000-000000001001',
        generateId: deterministicIds(1002),
      });
      expect(first.expense.amountMinor).toBe(125050);
      expect(first.expense.currencyCode).toBe('NGN');
      expect(first.expense.createdByStoreMemberId).toBe(fixture.context.membership.id);
      expect(first.outbox.entityType).toBe('EXPENSE');
      expect(first.outbox.operationType).toBe('EXPENSE_CREATED');
      expect(countRows(fixture.adapter, 'expenses')).toBe(1);
      expect(countPendingOutboxOperations(fixture.adapter, fixture.context.store.id)).toBe(1);

      const replay = recordExpense(fixture.adapter, input, {
        operationId: first.outbox.operationId,
        generateId: deterministicIds(1100),
      });
      expect(replay.expense.id).toBe(first.expense.id);
      expect(replay.outbox.operationId).toBe(first.outbox.operationId);
      expect(countRows(fixture.adapter, 'expenses')).toBe(1);

      expectDomainError(
        () => recordExpense(fixture.adapter, { ...input, amountMinor: 125051 }, { operationId: first.outbox.operationId }),
        'INVALID_VALUE',
      );
      expectDomainError(
        () => recordExpense(fixture.adapter, { ...input, amountMinor: 0 }),
        'INVALID_MONEY',
      );
      expectDomainError(
        () => recordExpense(fixture.adapter, { ...input, category: 'OTHER' as never }),
        'INVALID_VALUE',
      );
      expect(listExpensesByStore(fixture.adapter, fixture.context.store.id)).toHaveLength(1);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('requires the active owner and store/device/currency boundary', () => {
    const fixture = openCatalogueFixture();
    try {
      const staff = createUser(fixture.adapter, { id: '00000000-0000-4000-8000-000000002001', displayName: 'Staff' });
      createStoreMember(fixture.adapter, {
        id: '00000000-0000-4000-8000-000000002002',
        storeId: fixture.context.store.id,
        userId: staff.id,
        role: 'STAFF',
      });
      const input = {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: staff.id,
        category: 'WAGES' as const,
        amountMinor: 1000,
        currencyCode: 'NGN',
      };
      expectDomainError(() => recordExpense(fixture.adapter, input), 'INVALID_VALUE');
      expectDomainError(() => recordExpense(fixture.adapter, { ...input, currencyCode: 'USD', userId: fixture.context.owner.id }), 'CURRENCY_MISMATCH');
      expect(countRows(fixture.adapter, 'expenses')).toBe(0);

      const other = openIsolatedDatabase(MIGRATIONS);
      try {
        const otherUser = createUser(other.adapter, { id: '00000000-0000-4000-8000-000000002011', displayName: 'Other' });
        const otherStore = createStore(other.adapter, {
          id: '00000000-0000-4000-8000-000000002012',
          name: 'Other Store',
          currencyCode: 'NGN',
          countryCode: 'NG',
          timezone: 'Africa/Lagos',
          createdByUserId: otherUser.id,
        });
        const otherDevice = createDevice(other.adapter, {
          id: '00000000-0000-4000-8000-000000002013',
          storeId: otherStore.id,
          userId: otherUser.id,
          platform: 'ANDROID',
          appVersion: '0.0.1',
        });
        expectDomainError(
          () => recordExpense(fixture.adapter, { ...input, userId: fixture.context.owner.id, deviceId: otherDevice.id }),
          'INVALID_VALUE',
        );
      } finally {
        other.closeAndDelete();
      }
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('rolls back the expense and outbox together on a write failure', () => {
    const fixture = openCatalogueFixture();
    try {
      const failing = new FailOnWriteAdapter(fixture.adapter, 1, new Error('injected expense failure'));
      expect(() => recordExpense(failing, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        category: 'RENT',
        amountMinor: 50000,
        currencyCode: 'NGN',
      }, { operationId: '00000000-0000-4000-8000-000000003001', generateId: deterministicIds(3002) })).toThrow('injected expense failure');
      expect(countRows(fixture.adapter, 'expenses')).toBe(0);
      expect(countPendingOutboxOperations(fixture.adapter, fixture.context.store.id)).toBe(0);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('retains the expense and envelope after restart and rejects direct mutation', () => {
    const fixture = openCatalogueFixture();
    const expenseId = '00000000-0000-4000-8000-000000004002';
    try {
      const graph = recordExpense(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        category: 'MAINTENANCE',
        amountMinor: 899,
        currencyCode: 'NGN',
      }, { operationId: '00000000-0000-4000-8000-000000004001', generateId: () => expenseId });
      expect(() => fixture.adapter.run('UPDATE expenses SET amount_minor = 900 WHERE id = ?;', [graph.expense.id])).toThrow();
      expect(() => fixture.adapter.run('DELETE FROM expenses WHERE id = ?;', [graph.expense.id])).toThrow();
      const operationId = graph.outbox.operationId;
      fixture.adapter.close();
      const reopened = reopenDatabase(fixture.path);
      try {
        openDatabase(reopened, MIGRATIONS);
        expect(getExpenseById(reopened, graph.expense.id)?.amountMinor).toBe(899);
        expect(findOutboxOperation(reopened, operationId)?.entityId).toBe(graph.expense.id);
      } finally {
        reopened.close();
      }
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('upgrades a populated v15 database without losing prior data', () => {
    const isolated = openIsolatedDatabase(MIGRATIONS.slice(0, 15));
    try {
      const owner = createUser(isolated.adapter, { id: '00000000-0000-4000-8000-000000005001', displayName: 'Legacy owner' });
      const store = createStore(isolated.adapter, {
        id: '00000000-0000-4000-8000-000000005002',
        name: 'Legacy store',
        currencyCode: 'NGN',
        countryCode: 'NG',
        timezone: 'Africa/Lagos',
        createdByUserId: owner.id,
      });
      const member = createStoreMember(isolated.adapter, {
        id: '00000000-0000-4000-8000-000000005003',
        storeId: store.id,
        userId: owner.id,
        role: 'OWNER',
      });
      expect(member.storeId).toBe(store.id);
      isolated.adapter.close();
      const reopened = reopenDatabase(isolated.path);
      try {
        expect(openDatabase(reopened, MIGRATIONS).schemaVersion).toBe(MIGRATIONS.length);
        expect(reopened.getFirstRow<{ name: string }>('SELECT name FROM stores WHERE id = ?;', [store.id])?.name).toBe('Legacy store');
        expect(reopened.getFirstRow<{ name: string }>('SELECT name FROM schema_migrations WHERE version = 15;')?.name).toBe('durable_reorder_level_history');
        expect(reopened.getFirstRow<{ name: string }>('SELECT name FROM schema_migrations WHERE version = 16;')?.name).toBe('expenses');
      } finally {
        reopened.close();
      }
    } finally {
      isolated.closeAndDelete();
    }
  });
});
