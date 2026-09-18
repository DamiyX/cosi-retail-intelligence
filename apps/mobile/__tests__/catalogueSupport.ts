import type { DatabaseAdapter, SqlParams, StatementResult, SyncWork } from '../src/db/adapter';
import { MIGRATIONS } from '../src/db';
import { NodeTestAdapter } from '../src/db/nodeTestAdapter';
import { openIsolatedDatabase, type IsolatedDatabase } from '../src/db/testing';
import {
  provisionStoreContext,
  type ProvisionStoreContextResult,
} from '../src/storeContext/provisionStoreContext';

/** Deterministic canonical UUIDs for readable, repeatable tests. */
export function testId(suffix: number): string {
  return `00000000-0000-4000-8000-${String(suffix).padStart(12, '0')}`;
}

/** Deterministic ID provider starting at the given suffix. */
export function deterministicIds(start = 1): () => string {
  let next = start;
  return () => testId(next++);
}

export interface CatalogueFixture extends IsolatedDatabase {
  context: ProvisionStoreContextResult;
}

/** Isolated migrated database with one provisioned owner store and device. */
export function openCatalogueFixture(): CatalogueFixture {
  const isolated = openIsolatedDatabase(MIGRATIONS);
  try {
    const context = provisionStoreContext(
      isolated.adapter,
      {
        ownerDisplayName: 'Funke A.',
        storeName: 'Funke Provisions',
        currencyCode: 'NGN',
        countryCode: 'NG',
        timezone: 'Africa/Lagos',
        deviceLabel: 'Counter phone',
        appVersion: '0.0.1',
      },
      { generateId: deterministicIds(100) },
    );
    return { ...isolated, context };
  } catch (error) {
    isolated.closeAndDelete();
    throw error;
  }
}

/** Reopen the same database file to prove restart survival. */
export function reopenDatabase(path: string): NodeTestAdapter {
  return new NodeTestAdapter(path);
}

export function countRows(adapter: DatabaseAdapter, table: string): number {
  const row = adapter.getFirstRow<{ total: number }>(`SELECT COUNT(*) AS total FROM ${table};`);
  return row?.total ?? 0;
}

/** Decorator that throws on the Nth write call, then delegates (M1 pattern). */
export class FailOnWriteAdapter implements DatabaseAdapter {
  private writes = 0;

  constructor(
    private readonly inner: DatabaseAdapter,
    private readonly failOnWrite: number,
    private readonly failure: Error,
  ) {}

  get writeCount(): number {
    return this.writes;
  }

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

  transaction<T>(work: () => SyncWork<T>): T {
    return this.inner.transaction(work);
  }

  close(): void {
    this.inner.close();
  }
}
