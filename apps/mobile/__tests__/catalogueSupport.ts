import type { DatabaseAdapter, SqlParams, StatementResult, SyncWork } from '../src/db/adapter';
import { parseSyncReferenceContext } from '@retail/contracts';
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

/** Build the authoritative reference snapshot represented by a local fixture. */
export function syncReferenceContextFor(
  fixture: CatalogueFixture,
  serverRevision: number,
) {
  const store = fixture.adapter.getFirstRow<{
    id: string;
    name: string;
    currency_code: string;
    country_code: string | null;
    timezone: string;
    status: string;
    created_by_user_id: string | null;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT id, name, currency_code, country_code, timezone, status,
            created_by_user_id, created_at, updated_at
     FROM stores WHERE id = ?;`,
    [fixture.context.store.id],
  );
  if (!store?.created_by_user_id) throw new Error('Fixture store has no creator identity.');

  const users = fixture.adapter.getAllRows<{
    id: string;
    display_name: string;
    status: string;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT id, display_name, status, created_at, updated_at FROM users
     WHERE id = ?
        OR id IN (SELECT user_id FROM store_members WHERE store_id = ?)
        OR id IN (SELECT user_id FROM devices WHERE store_id = ?)
     ORDER BY id;`,
    [store.created_by_user_id, store.id, store.id],
  );
  const members = fixture.adapter.getAllRows<{
    id: string;
    store_id: string;
    user_id: string;
    role: string;
    status: string;
    joined_at: string;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT id, store_id, user_id, role, status, joined_at, created_at, updated_at
     FROM store_members WHERE store_id = ? ORDER BY id;`,
    [store.id],
  );
  const devices = fixture.adapter.getAllRows<{
    id: string;
    store_id: string;
    user_id: string | null;
    platform: string;
    device_label: string | null;
    app_version: string | null;
    status: string;
    created_at: string;
  }>(
    `SELECT id, store_id, user_id, platform, device_label, app_version, status, created_at
     FROM devices WHERE store_id = ? ORDER BY id;`,
    [store.id],
  );

  return parseSyncReferenceContext({
    protocolVersion: 1,
    payloadVersion: 1,
    serverRevision,
    store: {
      id: store.id,
      name: store.name,
      currencyCode: store.currency_code,
      countryCode: store.country_code,
      timezone: store.timezone,
      status: store.status,
      createdByUserId: store.created_by_user_id,
      createdAt: store.created_at,
      updatedAt: store.updated_at,
    },
    users: users.map((user) => ({
      id: user.id,
      displayName: user.display_name,
      status: user.status,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    })),
    members: members.map((member) => ({
      id: member.id,
      storeId: member.store_id,
      userId: member.user_id,
      role: member.role,
      status: member.status,
      joinedAt: member.joined_at,
      createdAt: member.created_at,
      updatedAt: member.updated_at,
    })),
    devices: devices.map((device) => ({
      id: device.id,
      storeId: device.store_id,
      userId: device.user_id,
      platform: device.platform,
      deviceLabel: device.device_label,
      appVersion: device.app_version,
      status: device.status,
      createdAt: device.created_at,
    })),
  });
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
