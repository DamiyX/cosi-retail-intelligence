import {
  applySyncPullPage,
} from '../src/sync/applier';
import { OfflineSyncWorker } from '../src/sync/worker';
import { SyncTransportError, type SyncTransport } from '../src/sync/transport';
import { createTemporaryProduct } from '../src/catalogue/createTemporaryProduct';
import { updateProductIdentity } from '../src/catalogue/updateProductIdentity';
import { MIGRATIONS, openDatabase } from '../src/db';
import { openIsolatedDatabase } from '../src/db/testing';
import {
  claimOutboxBatch,
  countPendingOutboxOperations,
  createSyncConflict,
  ensureSyncStoreState,
  findOutboxOperation,
  getSyncBootstrapState,
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

function remoteProductEnvelope(input: {
  storeId: string;
  deviceId: string;
  operationId: string;
  entityId: string;
}) {
  return {
    payloadVersion: 1 as const,
    operationType: 'PRODUCT_CREATED' as const,
    operationId: input.operationId,
    storeId: input.storeId,
    deviceId: input.deviceId,
    entityType: 'PRODUCT_VARIANT' as const,
    entityId: input.entityId,
    baseServerVersion: null,
    occurredAt: NOW,
    entities: {
      productVariant: {
        id: input.entityId,
        canonicalProductId: null,
        identityScope: 'STORE_LOCAL',
        ownerStoreId: input.storeId,
        name: 'Remote product',
        status: 'ACTIVE',
        createdAt: NOW,
        updatedAt: NOW,
      },
    },
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

  it('resumes a paginated bootstrap and commits its snapshot cursor atomically', async () => {
    const fixture = openCatalogueFixture();
    try {
      const entityId = testId(700);
      const envelope = {
        payloadVersion: 1 as const,
        operationType: 'EXPENSE_CREATED' as const,
        operationId: testId(701),
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        entityType: 'EXPENSE' as const,
        entityId,
        baseServerVersion: null,
        occurredAt: NOW,
        entities: {},
      };
      const requests: { cursor: unknown }[] = [];
      const transport: SyncTransport = {
        enroll: async () => { throw new Error('not used'); },
        push: async () => { throw new Error('not used'); },
        pull: async () => emptyPull(5),
        bootstrap: async (request) => {
          requests.push({ cursor: request.cursor });
          if (requests.length === 1) {
            return {
              protocolVersion: 1,
              payloadVersion: 1,
              snapshotRevision: 5,
              entities: [{
                storeId: fixture.context.store.id,
                operationId: envelope.operationId,
                entityType: 'EXPENSE' as const,
                entityId,
                entityVersion: 1,
                serverRevision: 4,
                changeIndex: 0,
                payloadVersion: 1 as const,
                payload: envelope,
              }],
              nextCursor: {
                snapshotRevision: 5,
                afterRevision: 4,
                afterChangeIndex: 0,
              },
              hasMore: true,
            };
          }
          return {
            protocolVersion: 1,
            payloadVersion: 1,
            snapshotRevision: 5,
            entities: [],
            nextCursor: null,
            hasMore: false,
          };
        },
      };
      const worker = new OfflineSyncWorker({
        adapter: fixture.adapter,
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        sessionProvider: sessionProvider(),
        transport,
        now: () => NOW,
        idFactory: () => testId(701),
      });

      const result = await worker.bootstrap();
      expect(result.status).toBe('SYNCED');
      expect(result.pulled).toBe(1);
      expect(requests).toEqual([
        { cursor: null },
        { cursor: {
          snapshotRevision: 5,
          afterRevision: 4,
          afterChangeIndex: 0,
        } },
      ]);
      expect(getSyncBootstrapState(fixture.adapter, fixture.context.store.id)).toMatchObject({
        status: 'COMMITTED',
        snapshotRevision: 5,
        snapshotAfterEntityType: null,
        snapshotAfterEntityId: null,
      });
      expect(getSyncStoreState(fixture.adapter, fixture.context.store.id)).toMatchObject({
        status: 'IDLE',
        cursorRevision: 5,
        serverRevision: 5,
      });
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('does not expose a partial bootstrap when a later page fails', async () => {
    const fixture = openCatalogueFixture();
    try {
      const entityId = testId(710);
      const envelope = remoteProductEnvelope({
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        operationId: testId(711),
        entityId,
      });
      let callCount = 0;
      const transport: SyncTransport = {
        enroll: async () => { throw new Error('not used'); },
        push: async () => { throw new Error('not used'); },
        pull: async () => emptyPull(0),
        bootstrap: async () => {
          callCount += 1;
          if (callCount > 1) {
            throw new SyncTransportError('NETWORK', 'offline', { retryable: true });
          }
          return {
            protocolVersion: 1,
            payloadVersion: 1,
            snapshotRevision: 8,
            entities: [{
              storeId: fixture.context.store.id,
              operationId: envelope.operationId,
              entityType: 'PRODUCT_VARIANT' as const,
              entityId,
              entityVersion: 1,
              serverRevision: 7,
              changeIndex: 0,
              payloadVersion: 1,
              payload: envelope,
            }],
            nextCursor: {
              snapshotRevision: 8,
              afterRevision: 7,
              afterChangeIndex: 0,
            },
            hasMore: true,
          };
        },
      };
      const worker = new OfflineSyncWorker({
        adapter: fixture.adapter,
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        sessionProvider: sessionProvider(),
        transport,
        now: () => NOW,
        idFactory: () => testId(712),
      });

      ensureSyncStoreState(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        now: NOW,
      });
      fixture.adapter.run(
        `UPDATE sync_store_state
         SET cursor_revision = 3, cursor_change_index = 0, server_revision = 3
         WHERE store_id = ?;`,
        [fixture.context.store.id],
      );

      expect(await worker.bootstrap()).toMatchObject({ status: 'RETRY_SCHEDULED', pulled: 0 });
      expect(fixture.adapter.getFirstRow<{ total: number }>(
        'SELECT COUNT(*) AS total FROM product_variants WHERE id = ?;',
        [entityId],
      )?.total).toBe(0);
      expect(getSyncBootstrapState(fixture.adapter, fixture.context.store.id)?.status).toBe('FAILED');
      expect(getSyncStoreState(fixture.adapter, fixture.context.store.id)).toMatchObject({
        cursorRevision: 3,
        cursorChangeIndex: 0,
        serverRevision: 3,
      });
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('replays create then edit across pages without losing the base package or barcode', async () => {
    const source = openCatalogueFixture();
    const destination = openCatalogueFixture();
    try {
      const graph = createTemporaryProduct(source.adapter, {
        storeId: source.context.store.id,
        deviceId: source.context.device.id,
        name: 'Milo 400g',
        barcode: '4006381333931',
      }, { generateId: (() => { let next = 714; return () => testId(next++); })() });
      const edit = updateProductIdentity(source.adapter, {
        storeId: source.context.store.id,
        deviceId: source.context.device.id,
        storeProductId: graph.storeProduct.id,
        name: 'Milo 400g tin',
      }, { operationId: testId(719) });
      const firstPayload = JSON.parse(graph.outbox.payload);
      const secondPayload = JSON.parse(edit.outbox.payload);
      let page = 0;
      const transport: SyncTransport = {
        enroll: async () => { throw new Error('not used'); },
        push: async () => { throw new Error('not used'); },
        pull: async () => emptyPull(0),
        bootstrap: async () => {
          page += 1;
          return page === 1 ? {
            protocolVersion: 1,
            payloadVersion: 1,
            snapshotRevision: 2,
            entities: [{
              operationId: graph.outbox.operationId,
              storeId: destination.context.store.id,
              entityType: 'STORE_PRODUCT' as const,
              entityId: graph.storeProduct.id,
              entityVersion: 1,
              serverRevision: 1,
              changeIndex: 0,
              payloadVersion: 1 as const,
              payload: firstPayload,
            }],
            nextCursor: {
              snapshotRevision: 2,
              afterRevision: 1,
              afterChangeIndex: 0,
            },
            hasMore: true,
          } : {
            protocolVersion: 1,
            payloadVersion: 1,
            snapshotRevision: 2,
            entities: [{
              operationId: edit.outbox.operationId,
              storeId: destination.context.store.id,
              entityType: 'STORE_PRODUCT' as const,
              entityId: graph.storeProduct.id,
              entityVersion: 2,
              serverRevision: 2,
              changeIndex: 0,
              payloadVersion: 1 as const,
              payload: secondPayload,
            }],
            nextCursor: null,
            hasMore: false,
          };
        },
      };
      const worker = new OfflineSyncWorker({
        adapter: destination.adapter,
        storeId: destination.context.store.id,
        deviceId: destination.context.device.id,
        sessionProvider: sessionProvider(),
        transport,
        now: () => NOW,
        idFactory: () => testId(718),
      });
      const result = await worker.bootstrap();
      expect({ result, error: getSyncBootstrapState(destination.adapter, destination.context.store.id)?.lastErrorMessage })
        .toMatchObject({ result: { status: 'SYNCED', pulled: 2 }, error: null });
      expect(destination.adapter.getFirstRow<{ product_variant_id: string }>(
        'SELECT product_variant_id FROM package_units WHERE id = ?;',
        [graph.basePackage.id],
      )?.product_variant_id).toBe(graph.variant.id);
      expect(destination.adapter.getFirstRow<{ name: string }>(
        'SELECT name FROM product_variants WHERE id = ?;', [graph.variant.id],
      )?.name).toBe('Milo 400g tin');
      expect(destination.adapter.getFirstRow<{ id: string }>(
        'SELECT id FROM product_identifiers WHERE id = ?;', [graph.identifier!.id],
      )?.id).toBe(graph.identifier?.id);
    } finally {
      source.closeAndDelete();
      destination.closeAndDelete();
    }
  });

  it('uses one active-run guard for incremental sync and bootstrap', async () => {
    const fixture = openCatalogueFixture();
    try {
      createTemporaryProduct(
        fixture.adapter,
        { storeId: fixture.context.store.id, deviceId: fixture.context.device.id, name: 'Guard product' },
        { generateId: () => testId(720) },
      );
      let releasePush!: () => void;
      const pushGate = new Promise<void>((resolve) => { releasePush = resolve; });
      const transport: SyncTransport = {
        enroll: async () => { throw new Error('not used'); },
        bootstrap: async () => { throw new Error('bootstrap should be guarded'); },
        pull: async () => emptyPull(0),
        push: async (request) => {
          await pushGate;
          return {
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
          };
        },
      };
      const worker = new OfflineSyncWorker({
        adapter: fixture.adapter,
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        sessionProvider: sessionProvider(),
        transport,
        now: () => NOW,
        idFactory: () => testId(721),
      });
      const running = worker.runOnce();
      await Promise.resolve();
      expect(await worker.bootstrap()).toMatchObject({ status: 'ALREADY_RUNNING' });
      releasePush();
      await expect(running).resolves.toMatchObject({ status: 'SYNCED' });
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('does not start incremental sync while a persisted bootstrap is in progress', async () => {
    const fixture = openCatalogueFixture();
    try {
      ensureSyncStoreState(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        now: NOW,
      });
      fixture.adapter.run(
        `INSERT INTO sync_bootstrap_state
          (store_id, device_id, bootstrap_id, status, started_at, updated_at)
         VALUES (?, ?, ?, 'IN_PROGRESS', ?, ?);`,
        [fixture.context.store.id, fixture.context.device.id, testId(725), NOW, NOW],
      );
      let transportCalled = false;
      const transport: SyncTransport = {
        enroll: async () => { throw new Error('not used'); },
        bootstrap: async () => { throw new Error('not used'); },
        push: async () => { transportCalled = true; throw new Error('must not run'); },
        pull: async () => { transportCalled = true; return emptyPull(0); },
      };
      const worker = new OfflineSyncWorker({
        adapter: fixture.adapter,
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        sessionProvider: sessionProvider(),
        transport,
        now: () => NOW,
      });
      expect(await worker.runOnce()).toMatchObject({ status: 'ALREADY_RUNNING' });
      expect(transportCalled).toBe(false);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('rejects a cross-store pull page without advancing the cursor', () => {
    const fixture = openCatalogueFixture();
    try {
      ensureSyncStoreState(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        now: NOW,
      });
      const otherStoreId = testId(730);
      const envelope = remoteProductEnvelope({
        storeId: otherStoreId,
        deviceId: fixture.context.device.id,
        operationId: testId(731),
        entityId: testId(732),
      });
      expect(() => applySyncPullPage(fixture.adapter, {
        protocolVersion: 1,
        payloadVersion: 1,
        changes: [{
          operationId: envelope.operationId,
          storeId: otherStoreId,
          entityType: envelope.entityType,
          entityId: envelope.entityId,
          operationType: envelope.operationType,
          changeType: 'UPSERT',
          payloadVersion: 1,
          payload: envelope,
          entityVersion: 1,
          serverRevision: 1,
          occurredAt: NOW,
        }],
        nextCursor: { revision: 1, changeIndex: 0 },
        hasMore: false,
        serverRevision: 1,
      }, {
        storeId: fixture.context.store.id,
        options: { now: NOW, conflictIdFactory: () => testId(733) },
      })).toThrow('another store');
      expect(getSyncStoreState(fixture.adapter, fixture.context.store.id)).toMatchObject({
        cursorRevision: 0,
        cursorChangeIndex: 0,
      });
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('does not acknowledge a local operation when the server identity is mismatched', async () => {
    const fixture = openCatalogueFixture();
    try {
      const graph = createTemporaryProduct(
        fixture.adapter,
        { storeId: fixture.context.store.id, deviceId: fixture.context.device.id, name: 'Ack identity product' },
        { generateId: () => testId(740) },
      );
      const transport: SyncTransport = {
        enroll: async () => { throw new Error('not used'); },
        bootstrap: async () => { throw new Error('not used'); },
        pull: async () => emptyPull(0),
        push: async () => ({
          protocolVersion: 1,
          payloadVersion: 1,
          acks: [{
            operationId: graph.outbox.operationId,
            status: 'APPLIED',
            entityType: graph.outbox.entityType,
            entityId: testId(741),
            serverVersion: 1,
            serverRevision: 1,
            error: null,
          }],
        }),
      };
      const worker = new OfflineSyncWorker({
        adapter: fixture.adapter,
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        sessionProvider: sessionProvider(),
        transport,
        now: () => NOW,
        random: () => 0,
        idFactory: () => testId(742),
      });
      expect(await worker.runOnce()).toMatchObject({ status: 'RETRY_SCHEDULED', retryableErrors: 1 });
      expect(findOutboxOperation(fixture.adapter, graph.outbox.operationId)).toMatchObject({
        status: 'ERROR_RETRYABLE',
        lastErrorCode: 'INVALID_RESPONSE',
      });
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('reports a permanent pull rejection without overwriting it as success', async () => {
    const fixture = openCatalogueFixture();
    try {
      const transport: SyncTransport = {
        enroll: async () => { throw new Error('not used'); },
        bootstrap: async () => { throw new Error('not used'); },
        push: async () => { throw new Error('not used'); },
        pull: async () => {
          throw new SyncTransportError('INVALID_REQUEST', 'request rejected', { retryable: false, status: 400 });
        },
      };
      const worker = new OfflineSyncWorker({
        adapter: fixture.adapter,
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        sessionProvider: sessionProvider(),
        transport,
        now: () => NOW,
      });
      expect(await worker.runOnce()).toMatchObject({ status: 'PERMANENT_ERROR', permanentErrors: 1 });
      expect(getSyncStoreState(fixture.adapter, fixture.context.store.id)).toMatchObject({
        status: 'IDLE',
        lastErrorCode: 'INVALID_REQUEST',
      });
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
