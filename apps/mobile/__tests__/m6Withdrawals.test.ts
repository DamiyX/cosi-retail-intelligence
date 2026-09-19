import { DomainError } from '@retail/domain';

import { recordOwnerWithdrawal } from '../src/finance';
import { MIGRATIONS, openDatabase } from '../src/db';
import {
  countPendingOutboxOperations,
  createDevice,
  createStore,
  createStoreMember,
  createUser,
  findOutboxOperation,
  getOwnerWithdrawalById,
  listOwnerWithdrawalsByStore,
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

describe('M6-02 owner withdrawals', () => {
  it('records a distinct immutable owner withdrawal with one canonical outbox envelope and replays it', () => {
    const fixture = openCatalogueFixture();
    try {
      const input = {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        amountMinor: 75000,
        currencyCode: 'NGN',
        note: 'Personal use',
        occurredAt: '2026-09-18T09:00:00.000Z',
      };
      const first = recordOwnerWithdrawal(fixture.adapter, input, {
        operationId: '00000000-0000-4000-8000-000000006001',
        generateId: deterministicIds(6002),
      });
      expect(first.withdrawal.amountMinor).toBe(75000);
      expect(first.outbox.entityType).toBe('OWNER_WITHDRAWAL');
      expect(first.outbox.operationType).toBe('OWNER_WITHDRAWAL_CREATED');
      expect(countRows(fixture.adapter, 'owner_withdrawals')).toBe(1);
      expect(countRows(fixture.adapter, 'expenses')).toBe(0);
      expect(countPendingOutboxOperations(fixture.adapter, fixture.context.store.id)).toBe(1);

      const replay = recordOwnerWithdrawal(fixture.adapter, input, {
        operationId: first.outbox.operationId,
        generateId: deterministicIds(6100),
      });
      expect(replay.withdrawal.id).toBe(first.withdrawal.id);
      expect(countRows(fixture.adapter, 'owner_withdrawals')).toBe(1);
      expectDomainError(
        () => recordOwnerWithdrawal(fixture.adapter, { ...input, amountMinor: 75001 }, { operationId: first.outbox.operationId }),
        'INVALID_VALUE',
      );
      expect(listOwnerWithdrawalsByStore(fixture.adapter, fixture.context.store.id)).toHaveLength(1);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('rejects staff, wrong currency, and cross-store devices without partial rows', () => {
    const fixture = openCatalogueFixture();
    try {
      const staff = createUser(fixture.adapter, { id: '00000000-0000-4000-8000-000000007001', displayName: 'Staff' });
      createStoreMember(fixture.adapter, {
        id: '00000000-0000-4000-8000-000000007002',
        storeId: fixture.context.store.id,
        userId: staff.id,
        role: 'STAFF',
      });
      const input = {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: staff.id,
        amountMinor: 1000,
        currencyCode: 'NGN',
      };
      expectDomainError(() => recordOwnerWithdrawal(fixture.adapter, input), 'INVALID_VALUE');
      expectDomainError(() => recordOwnerWithdrawal(fixture.adapter, { ...input, userId: fixture.context.owner.id, currencyCode: 'USD' }), 'CURRENCY_MISMATCH');

      const other = openIsolatedDatabase(MIGRATIONS);
      try {
        const otherUser = createUser(other.adapter, { id: '00000000-0000-4000-8000-000000007011', displayName: 'Other' });
        const otherStore = createStore(other.adapter, {
          id: '00000000-0000-4000-8000-000000007012',
          name: 'Other Store',
          currencyCode: 'NGN',
          countryCode: 'NG',
          timezone: 'Africa/Lagos',
          createdByUserId: otherUser.id,
        });
        const otherDevice = createDevice(other.adapter, {
          id: '00000000-0000-4000-8000-000000007013',
          storeId: otherStore.id,
          userId: otherUser.id,
          platform: 'ANDROID',
          appVersion: '0.0.1',
        });
        expectDomainError(
          () => recordOwnerWithdrawal(fixture.adapter, { ...input, userId: fixture.context.owner.id, deviceId: otherDevice.id }),
          'INVALID_VALUE',
        );
      } finally {
        other.closeAndDelete();
      }
      expect(countRows(fixture.adapter, 'owner_withdrawals')).toBe(0);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('rolls back the withdrawal and outbox together when the local write fails', () => {
    const fixture = openCatalogueFixture();
    try {
      const failing = new FailOnWriteAdapter(fixture.adapter, 1, new Error('injected withdrawal failure'));
      expect(() => recordOwnerWithdrawal(failing, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        amountMinor: 50000,
        currencyCode: 'NGN',
      }, { operationId: '00000000-0000-4000-8000-000000008001', generateId: deterministicIds(8002) })).toThrow('injected withdrawal failure');
      expect(countRows(fixture.adapter, 'owner_withdrawals')).toBe(0);
      expect(countPendingOutboxOperations(fixture.adapter, fixture.context.store.id)).toBe(0);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('retains the separate withdrawal history and envelope after restart', () => {
    const fixture = openCatalogueFixture();
    try {
      const graph = recordOwnerWithdrawal(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        amountMinor: 899,
        currencyCode: 'NGN',
      }, { operationId: '00000000-0000-4000-8000-000000009001', generateId: deterministicIds(9002) });
      expect(() => fixture.adapter.run('UPDATE owner_withdrawals SET amount_minor = 900 WHERE id = ?;', [graph.withdrawal.id])).toThrow();
      expect(() => fixture.adapter.run('DELETE FROM owner_withdrawals WHERE id = ?;', [graph.withdrawal.id])).toThrow();
      const operationId = graph.outbox.operationId;
      fixture.adapter.close();
      const reopened = reopenDatabase(fixture.path);
      try {
        openDatabase(reopened, MIGRATIONS);
        expect(getOwnerWithdrawalById(reopened, graph.withdrawal.id)?.amountMinor).toBe(899);
        expect(findOutboxOperation(reopened, operationId)?.entityType).toBe('OWNER_WITHDRAWAL');
      } finally {
        reopened.close();
      }
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('upgrades a populated v16 database without losing its expense schema or prior data', () => {
    const isolated = openIsolatedDatabase(MIGRATIONS.slice(0, 16));
    try {
      const owner = createUser(isolated.adapter, { id: '00000000-0000-4000-8000-000000010001', displayName: 'Legacy owner' });
      const store = createStore(isolated.adapter, {
        id: '00000000-0000-4000-8000-000000010002',
        name: 'Legacy store',
        currencyCode: 'NGN',
        countryCode: 'NG',
        timezone: 'Africa/Lagos',
        createdByUserId: owner.id,
      });
      createStoreMember(isolated.adapter, {
        id: '00000000-0000-4000-8000-000000010003',
        storeId: store.id,
        userId: owner.id,
        role: 'OWNER',
      });
      isolated.adapter.close();
      const reopened = reopenDatabase(isolated.path);
      try {
        expect(openDatabase(reopened, MIGRATIONS).schemaVersion).toBe(MIGRATIONS.length);
        expect(reopened.getFirstRow<{ name: string }>('SELECT name FROM stores WHERE id = ?;', [store.id])?.name).toBe('Legacy store');
        expect(reopened.getFirstRow<{ name: string }>('SELECT name FROM schema_migrations WHERE version = 16;')?.name).toBe('expenses');
        expect(reopened.getFirstRow<{ name: string }>('SELECT name FROM schema_migrations WHERE version = 17;')?.name).toBe('owner_withdrawals');
      } finally {
        reopened.close();
      }
    } finally {
      isolated.closeAndDelete();
    }
  });
});
