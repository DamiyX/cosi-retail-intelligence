import {
  applySyncPullPage,
} from '../src/sync/applier';
import { OfflineSyncWorker } from '../src/sync/worker';
import type { SyncTransport } from '../src/sync/transport';
import { createTemporaryProduct } from '../src/catalogue/createTemporaryProduct';
import { MIGRATIONS, openDatabase } from '../src/db';
import { openIsolatedDatabase } from '../src/db/testing';
import {
  claimOutboxBatch,
  countPendingOutboxOperations,
  createSyncConflict,
  ensureSyncStoreState,
  findOutboxOperation,
  getSyncStoreState,
  listOpenSyncConflicts,
  markOutboxRetryable,
  releaseExpiredOutboxLeases,
} from '../src/db/repositories';
import { openCatalogueFixture, testId } from './catalogueSupport';
import { provisionStoreContext } from '../src/storeContext/provisionStoreContext';

const NOW = '2026-09-19T00:00:00.000Z';

function sessionProvider() {
  return { getSession: async () => ({ accessToken: 'test-access-token' }) };
}

function emptyPull(revision: number) {
  return {
    protocolVersion: 1 as const,
    payloadVersion: 1 as const,
    changes: [],
    nextCursor: { revision, changeIndex: 0 },
    hasMore: false,
    serverRevision: revision,
  };
}

describe('M7 offline sync local durability', () => {
  it('upgrades a v17 local database without dropping the outbox or business rows', () => {
    const isolated = openIsolatedDatabase(MIGRATIONS.slice(0, 17));
    try {
      const context = provisionStoreContext(
        isolated.adapter,
        {
          ownerDisplayName: 'Legacy M7 owner',
          storeName: 'Legacy M7 store',
          currencyCode: 'NGN',
          countryCode: 'NG',
          timezone: 'Africa/Lagos',
          appVersion: '0.0.1',
        },
        { generateId: () => testId(150) },
      );
      const graph = createTemporaryProduct(
        isolated.adapter,
        { storeId: context.store.id, deviceId: context.device.id, name: 'Legacy sync product' },
        { generateId: () => testId(160) },
      );
      expect(() => openDatabase(isolated.adapter, MIGRATIONS)).not.toThrow();
      expect(isolated.adapter.getFirstRow<{ total: number }>('SELECT COUNT(*) AS total FROM outbox_operations;')?.total).toBe(1);
      expect(isolated.adapter.getFirstRow<{ lease_id: string | null }>(
        'SELECT lease_id FROM outbox_operations WHERE operation_id = ?;',
        [graph.outbox.operationId],
      )).toEqual({ lease_id: null });
      expect(isolated.adapter.getFirstRow<{ total: number }>('SELECT COUNT(*) AS total FROM sync_store_state;')?.total).toBe(0);
    } finally {
      isolated.closeAndDelete();
    }
  });

  it('claims bounded outbox work, recovers stale leases, and preserves retry state', () => {
    const fixture = openCatalogueFixture();
    try {
      const graph = createTemporaryProduct(
        fixture.adapter,
        { storeId: fixture.context.store.id, deviceId: fixture.context.device.id, name: 'Lease product' },
        { generateId: () => testId(200) },
      );
      ensureSyncStoreState(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        now: NOW,
      });
      const first = claimOutboxBatch(fixture.adapter, {
        storeId: fixture.context.store.id,
        leaseId: testId(201),
        now: NOW,
        leaseExpiresAt: '2026-09-19T00:01:00.000Z',
        limit: 1,
      });
      expect(first).toHaveLength(1);
      expect(first[0].status).toBe('SYNCING');
      expect(releaseExpiredOutboxLeases(fixture.adapter, fixture.context.store.id, '2026-09-19T00:02:00.000Z')).toBe(1);

      const second = claimOutboxBatch(fixture.adapter, {
        storeId: fixture.context.store.id,
        leaseId: testId(202),
        now: '2026-09-19T00:02:00.000Z',
        leaseExpiresAt: '2026-09-19T00:03:00.000Z',
        limit: 1,
      });
      expect(second[0].attemptCount).toBe(2);
      expect(second[0].leaseId).toBe(testId(202));
      markOutboxRetryable(fixture.adapter, {
        operationId: graph.outbox.operationId,
        leaseId: testId(202),
        errorCode: 'NETWORK',
        nextAttemptAt: '2026-09-19T00:03:00.000Z',
      });
      expect(findOutboxOperation(fixture.adapter, graph.outbox.operationId)?.status).toBe('ERROR_RETRYABLE');
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('applies a pull echo atomically without duplicating the local business write', () => {
    const fixture = openCatalogueFixture();
    try {
      const graph = createTemporaryProduct(
        fixture.adapter,
        { storeId: fixture.context.store.id, deviceId: fixture.context.device.id, name: 'Echo product' },
        { generateId: () => testId(300) },
      );
      ensureSyncStoreState(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        now: NOW,
      });
      const envelope = JSON.parse(graph.outbox.payload);
      const result = applySyncPullPage(fixture.adapter, {
        protocolVersion: 1,
        payloadVersion: 1,
        changes: [{
          operationId: graph.outbox.operationId,
          storeId: fixture.context.store.id,
          entityType: graph.outbox.entityType,
          entityId: graph.outbox.entityId,
          operationType: graph.outbox.operationType,
          changeType: 'UPSERT',
          payloadVersion: 1,
          payload: envelope,
          entityVersion: 1,
          serverRevision: 7,
          occurredAt: NOW,
        }],
        nextCursor: { revision: 7, changeIndex: 0 },
        hasMore: false,
        serverRevision: 7,
      }, { storeId: fixture.context.store.id, options: { now: NOW, conflictIdFactory: () => testId(301) } });
      expect(result.echoes).toBe(1);
      expect(findOutboxOperation(fixture.adapter, graph.outbox.operationId)?.status).toBe('SYNCED');
      expect(countPendingOutboxOperations(fixture.adapter, fixture.context.store.id)).toBe(0);
      expect(getSyncStoreState(fixture.adapter, fixture.context.store.id)).toMatchObject({ cursorRevision: 7, status: 'IDLE' });
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('runs one authenticated push/pull cycle and records a server acknowledgement', async () => {
    const fixture = openCatalogueFixture();
    try {
      const graph = createTemporaryProduct(
        fixture.adapter,
        { storeId: fixture.context.store.id, deviceId: fixture.context.device.id, name: 'Worker product' },
        { generateId: () => testId(400) },
      );
      const transport: SyncTransport = {
        enroll: async () => { throw new Error('not used'); },
        bootstrap: async () => { throw new Error('not used'); },
        push: async (request) => ({
          protocolVersion: 1,
          payloadVersion: 1,
          acks: request.operations.map((operation) => ({
            operationId: operation.operationId,
            status: 'APPLIED' as const,
            entityType: operation.entityType,
            entityId: operation.entityId,
            serverVersion: 1,
            serverRevision: 1,
            error: null,
          })),
        }),
        pull: async () => emptyPull(1),
      };
      const worker = new OfflineSyncWorker({
        adapter: fixture.adapter,
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        sessionProvider: sessionProvider(),
        transport,
        now: () => NOW,
        random: () => 0,
        idFactory: () => testId(401),
      });
      const result = await worker.runOnce();
      expect(result.status).toBe('SYNCED');
      expect(result.pushed).toBe(1);
      expect(findOutboxOperation(fixture.adapter, graph.outbox.operationId)).toMatchObject({ status: 'SYNCED', serverRevision: 1 });
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('turns a server conflict into a durable local conflict without deleting the outbox', async () => {
    const fixture = openCatalogueFixture();
    try {
      const graph = createTemporaryProduct(
        fixture.adapter,
        { storeId: fixture.context.store.id, deviceId: fixture.context.device.id, name: 'Conflict product' },
        { generateId: () => testId(500) },
      );
      const transport: SyncTransport = {
        enroll: async () => { throw new Error('not used'); },
        bootstrap: async () => { throw new Error('not used'); },
        push: async (request) => ({
          protocolVersion: 1,
          payloadVersion: 1,
          acks: request.operations.map((operation) => ({
            operationId: operation.operationId,
            status: 'CONFLICT' as const,
            entityType: operation.entityType,
            entityId: operation.entityId,
            serverVersion: 3,
            serverRevision: 9,
            error: { code: 'CONFLICT' as const, message: 'stale', retryable: false, details: { serverPayload: { name: 'remote' } } },
          })),
        }),
        pull: async () => emptyPull(0),
      };
      const worker = new OfflineSyncWorker({
        adapter: fixture.adapter,
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        sessionProvider: sessionProvider(),
        transport,
        now: () => NOW,
        random: () => 0,
        idFactory: () => testId(501),
      });
      const result = await worker.runOnce();
      expect(result.conflicts).toBe(1);
      expect(findOutboxOperation(fixture.adapter, graph.outbox.operationId)?.status).toBe('CONFLICT');
      expect(listOpenSyncConflicts(fixture.adapter, fixture.context.store.id)).toEqual([
        expect.objectContaining({ operationId: graph.outbox.operationId, serverVersion: 3, status: 'OPEN' }),
      ]);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('does not permit a conflict record without the local operation boundary', () => {
    const fixture = openCatalogueFixture();
    try {
      ensureSyncStoreState(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        now: NOW,
      });
      expect(() => createSyncConflict(fixture.adapter, {
        id: testId(600),
        storeId: fixture.context.store.id,
        operationId: testId(601),
        entityType: 'STORE_PRODUCT',
        entityId: testId(602),
        conflictType: 'STALE_VERSION',
        localPayload: '{}',
      })).toThrow();
    } finally {
      fixture.closeAndDelete();
    }
  });
});
