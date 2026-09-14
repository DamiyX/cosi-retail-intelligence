import { DomainError } from '@retail/domain';

import type { DatabaseAdapter, SqlParams, StatementResult } from '../src/db/adapter';
import { MIGRATIONS, openDatabase } from '../src/db';
import { NodeTestAdapter } from '../src/db/nodeTestAdapter';
import { createStore } from '../src/db/repositories';
import { openIsolatedDatabase } from '../src/db/testing';
import {
  provisionStoreContext,
  type ProvisionStoreContextInput,
} from '../src/storeContext/provisionStoreContext';

/** Decorator that throws a typed error on the Nth write, then delegates. */
class FailOnWriteAdapter implements DatabaseAdapter {
  private writes = 0;

  constructor(
    private readonly inner: DatabaseAdapter,
    private readonly failOnWrite: number,
    private readonly failure: Error,
  ) {}

  exec(script: string): void {
    this.inner.exec(script);
  }

  run(sql: string, params?: SqlParams): StatementResult {
    this.writes += 1;
    if (this.writes === this.failOnWrite) {
      throw this.failure;
    }
    return this.inner.run(sql, params);
  }

  getFirstRow<T>(sql: string, params?: SqlParams): T | null {
    return this.inner.getFirstRow<T>(sql, params);
  }

  getAllRows<T>(sql: string, params?: SqlParams): T[] {
    return this.inner.getAllRows<T>(sql, params);
  }

  transaction<T>(work: () => T): T {
    return this.inner.transaction(work);
  }

  close(): void {
    this.inner.close();
  }
}

const VALID_INPUT: ProvisionStoreContextInput = {
  ownerDisplayName: 'Funke A.',
  storeName: 'Funke Provisions',
  currencyCode: 'NGN',
  countryCode: 'NG',
  timezone: 'Africa/Lagos',
  deviceLabel: 'Counter phone',
  appVersion: '0.0.1',
};

function countRows(adapter: DatabaseAdapter, table: string): number {
  const row = adapter.getFirstRow<{ total: number }>(`SELECT COUNT(*) AS total FROM ${table};`);
  return row?.total ?? 0;
}

describe('atomic store-context provisioning', () => {
  it('commits every row as one unit and keeps it after reopen', () => {
    const isolated = openIsolatedDatabase(MIGRATIONS);
    let storeId = '';
    try {
      const result = provisionStoreContext(isolated.adapter, VALID_INPUT);
      storeId = result.store.id;
      expect(result.membership.role).toBe('OWNER');
      expect(result.membership.storeId).toBe(storeId);
      expect(result.device.storeId).toBe(storeId);
      expect(countRows(isolated.adapter, 'users')).toBe(1);
      expect(countRows(isolated.adapter, 'stores')).toBe(1);
      expect(countRows(isolated.adapter, 'store_members')).toBe(1);
      expect(countRows(isolated.adapter, 'devices')).toBe(1);

      isolated.adapter.close();
      const reopened = new NodeTestAdapter(isolated.path);
      try {
        openDatabase(reopened, MIGRATIONS);
        expect(countRows(reopened, 'stores')).toBe(1);
        expect(countRows(reopened, 'devices')).toBe(1);
      } finally {
        reopened.close();
      }
    } finally {
      isolated.closeAndDelete();
    }
    expect(storeId.length).toBeGreaterThan(0);
  });

  it('rolls back every write when a failure is injected after intermediate writes', () => {
    const isolated = openIsolatedDatabase(MIGRATIONS);
    try {
      const preexisting = createStore(isolated.adapter, {
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Pre-existing store',
        currencyCode: 'NGN',
        countryCode: 'NG',
        timezone: 'Africa/Lagos',
      });
      const injected = new DomainError('INVALID_VALUE', 'Injected device-write failure.');
      // user, store, and membership writes succeed; the device write throws.
      const sabotaged = new FailOnWriteAdapter(isolated.adapter, 4, injected);

      let failure: unknown;
      try {
        provisionStoreContext(sabotaged, VALID_INPUT);
      } catch (error) {
        failure = error;
      }
      expect(failure).toBe(injected);

      expect(countRows(isolated.adapter, 'users')).toBe(0);
      expect(countRows(isolated.adapter, 'stores')).toBe(1);
      expect(countRows(isolated.adapter, 'store_members')).toBe(0);
      expect(countRows(isolated.adapter, 'devices')).toBe(0);
      const survivor = isolated.adapter.getFirstRow<{ name: string }>(
        'SELECT name FROM stores WHERE id = ?;',
        [preexisting.id],
      );
      expect(survivor?.name).toBe('Pre-existing store');
    } finally {
      isolated.closeAndDelete();
    }
  });

  it('propagates typed validation errors with nothing committed', () => {
    const isolated = openIsolatedDatabase(MIGRATIONS);
    try {
      let failure: unknown;
      try {
        provisionStoreContext(isolated.adapter, { ...VALID_INPUT, currencyCode: 'XX' });
      } catch (error) {
        failure = error;
      }
      expect(failure).toBeInstanceOf(DomainError);
      expect((failure as DomainError).code).toBe('INVALID_VALUE');
      expect(countRows(isolated.adapter, 'users')).toBe(0);
      expect(countRows(isolated.adapter, 'stores')).toBe(0);
      expect(countRows(isolated.adapter, 'store_members')).toBe(0);
      expect(countRows(isolated.adapter, 'devices')).toBe(0);
    } finally {
      isolated.closeAndDelete();
    }
  });
});
