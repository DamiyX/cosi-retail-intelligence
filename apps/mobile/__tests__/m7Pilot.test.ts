import type { SupabaseClient } from '@supabase/supabase-js';

import { createTemporaryProduct } from '../src/catalogue/createTemporaryProduct';
import { updateProductIdentity } from '../src/catalogue/updateProductIdentity';
import {
  beginSyncBootstrap,
  createSyncConflict,
  ensureSyncStoreState,
  findOutboxOperation,
  getProductVariantById,
  getSyncStoreState,
  listOpenSyncConflicts,
} from '../src/db/repositories';
import { applySyncBootstrapPage, applySyncPullPage, commitSyncBootstrapSnapshot } from '../src/sync/applier';
import {
  isPilotResolvableConflict,
  forgetPilotEnrollment,
  readPilotSyncOverview,
  resolvePilotConflict,
  resolvePilotOwner,
  runPilotSync,
} from '../src/sync/pilot';
import type { SyncTransport } from '../src/sync/transport';
import { openCatalogueFixture, testId } from './catalogueSupport';

function makeConflict(fixture: ReturnType<typeof openCatalogueFixture>) {
  const graph = createTemporaryProduct(fixture.adapter, {
    storeId: fixture.context.store.id,
    deviceId: fixture.context.device.id,
    name: 'Milo 400g',
  }, { generateId: (() => { let next = 900; return () => testId(next++); })() });
  fixture.adapter.run("UPDATE outbox_operations SET status = 'SYNCED' WHERE operation_id = ?;", [graph.outbox.operationId]);
  const local = updateProductIdentity(fixture.adapter, {
    storeId: fixture.context.store.id,
    deviceId: fixture.context.device.id,
    storeProductId: graph.storeProduct.id,
    name: 'Milo local name',
  }, { operationId: testId(910) });
  const cloud = JSON.parse(local.outbox.payload);
  cloud.operationId = testId(911);
  cloud.entities.productVariant.name = 'Milo cloud name';
  const conflict = createSyncConflict(fixture.adapter, {
    id: testId(912),
    storeId: fixture.context.store.id,
    operationId: local.outbox.operationId,
    entityType: 'STORE_PRODUCT',
    entityId: graph.storeProduct.id,
    conflictType: 'STALE_VERSION',
    localPayload: local.outbox.payload,
    serverPayload: JSON.stringify(cloud),
    serverVersion: 2,
    serverRevision: 2,
  });
  return { graph, local, cloud, conflict };
}

describe('M7 owner pilot sync integration', () => {
  it('records a paused state when the owner has no cloud session', async () => {
    const fixture = openCatalogueFixture();
    try {
      const getUser = jest.fn();
      const auth = { auth: { getUser } } as unknown as SupabaseClient;
      const result = await runPilotSync(fixture.adapter, auth, {
        configuration: { url: 'https://example.invalid', publishableKey: 'public-test-key' },
        sessionProvider: { getSession: async () => null },
      });
      expect(result).toBeNull();
      expect(getUser).not.toHaveBeenCalled();
      expect(getSyncStoreState(fixture.adapter, fixture.context.store.id)).toMatchObject({
        status: 'PAUSED_AUTH', lastErrorCode: 'AUTH_REQUIRED',
      });
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('records a retryable account-check failure without touching local work', async () => {
    const fixture = openCatalogueFixture();
    try {
      const auth = { auth: { getUser: async () => { throw new Error('offline'); } } } as unknown as SupabaseClient;
      await expect(runPilotSync(fixture.adapter, auth, {
        configuration: { url: 'https://example.invalid', publishableKey: 'public-test-key' },
        sessionProvider: { getSession: async () => ({ accessToken: 'test-token' }) },
      })).rejects.toThrow('offline');
      expect(getSyncStoreState(fixture.adapter, fixture.context.store.id)).toMatchObject({
        status: 'ERROR_RETRYABLE', lastErrorCode: 'USER_CHECK_FAILED',
      });
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('enrols the verified owner and invokes the worker from the pilot entry point', async () => {
    const fixture = openCatalogueFixture();
    forgetPilotEnrollment();
    try {
      const graph = createTemporaryProduct(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        name: 'Pilot product',
      }, { generateId: (() => { let next = 960; return () => testId(next++); })() });
      const auth = { auth: { getUser: async () => ({
        data: { user: { id: testId(970) } }, error: null,
      }) } } as unknown as SupabaseClient;
      let enrolled = false;
      let pushed = false;
      const transport: SyncTransport = {
        enroll: async (request) => {
          expect(request).toMatchObject({
            storeId: fixture.context.store.id,
            userId: fixture.context.owner.id,
            storeMemberId: fixture.context.membership.id,
            deviceId: fixture.context.device.id,
          });
          enrolled = true;
          return { protocolVersion: 1, storeId: request.storeId, userId: request.userId,
            storeMemberId: request.storeMemberId, deviceId: request.deviceId,
            status: 'ENROLLED', serverRevision: 0 };
        },
        push: async (request) => {
          expect(enrolled).toBe(true);
          pushed = true;
          return { protocolVersion: 1, payloadVersion: 1,
            acks: request.operations.map((operation) => ({
              operationId: operation.operationId,
              status: 'APPLIED' as const,
              entityType: operation.entityType,
              entityId: operation.entityId,
              serverVersion: 1,
              serverRevision: 1,
              error: null,
            })) };
        },
        pull: async () => ({ protocolVersion: 1, payloadVersion: 1,
          changes: [], nextCursor: { revision: 0, changeIndex: 0 },
          hasMore: false, serverRevision: 0 }),
        bootstrap: async () => { throw new Error('not used'); },
      };
      const result = await runPilotSync(fixture.adapter, auth, {
        configuration: { url: 'https://example.invalid', publishableKey: 'public-test-key' },
        sessionProvider: { getSession: async () => ({ accessToken: 'test-token' }) },
        transport,
      });
      expect(result).toMatchObject({ status: 'SYNCED', pushed: 1 });
      expect(pushed).toBe(true);
      expect(findOutboxOperation(fixture.adapter, graph.outbox.operationId)?.status).toBe('SYNCED');
    } finally {
      forgetPilotEnrollment();
      fixture.closeAndDelete();
    }
  });
  it('uses the existing local owner/store/device and reports waiting work', () => {
    const fixture = openCatalogueFixture();
    try {
      const owner = resolvePilotOwner(fixture.adapter);
      expect(owner).toMatchObject({
        storeId: fixture.context.store.id,
        userId: fixture.context.owner.id,
        memberId: fixture.context.membership.id,
        deviceId: fixture.context.device.id,
      });
      createTemporaryProduct(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        name: 'Waiting product',
      }, { generateId: (() => { let next = 920; return () => testId(next++); })() });
      expect(readPilotSyncOverview(fixture.adapter).unsyncedCount).toBe(1);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('keeps the rejected edit and enqueues a new versioned operation when owner retries', () => {
    const fixture = openCatalogueFixture();
    try {
      const { local, conflict } = makeConflict(fixture);
      expect(isPilotResolvableConflict(conflict)).toBe(true);
      resolvePilotConflict(fixture.adapter, conflict.id, 'RETRY_LOCAL', () => testId(913));
      expect(findOutboxOperation(fixture.adapter, local.outbox.operationId)?.status).toBe('CONFLICT');
      expect(findOutboxOperation(fixture.adapter, testId(913))).toMatchObject({
        status: 'PENDING', baseServerVersion: 2,
      });
      expect(listOpenSyncConflicts(fixture.adapter, fixture.context.store.id)).toHaveLength(0);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('applies the reviewed cloud version and preserves rejected local history', () => {
    const fixture = openCatalogueFixture();
    try {
      const { graph, local, conflict } = makeConflict(fixture);
      resolvePilotConflict(fixture.adapter, conflict.id, 'USE_CLOUD');
      expect(getProductVariantById(fixture.adapter, graph.variant.id)?.name).toBe('Milo cloud name');
      expect(findOutboxOperation(fixture.adapter, local.outbox.operationId)?.status).toBe('CONFLICT');
      expect(listOpenSyncConflicts(fixture.adapter, fixture.context.store.id)).toHaveLength(0);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('refuses to resolve an obsolete cloud version after later server changes', () => {
    const fixture = openCatalogueFixture();
    try {
      const { conflict, graph } = makeConflict(fixture);
      fixture.adapter.run(
        `INSERT INTO sync_entity_versions
          (store_id, entity_type, entity_id, server_version, server_revision, updated_at)
         VALUES (?, 'STORE_PRODUCT', ?, 3, 3, ?);`,
        [fixture.context.store.id, graph.storeProduct.id, '2026-09-19T00:00:00.000Z'],
      );
      expect(() => resolvePilotConflict(fixture.adapter, conflict.id, 'RETRY_LOCAL', () => testId(914)))
        .toThrow('changed again');
      expect(listOpenSyncConflicts(fixture.adapter, fixture.context.store.id)).toHaveLength(1);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('quarantines a pending local edit and keeps it visible while newer cloud edits arrive', () => {
    const fixture = openCatalogueFixture();
    try {
      const { graph, local, cloud } = makeConflict(fixture);
      fixture.adapter.run('DELETE FROM sync_conflicts WHERE operation_id = ?;', [local.outbox.operationId]);
      ensureSyncStoreState(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
      });
      const change = (revision: number, name: string) => ({
        operationId: testId(920 + revision),
        storeId: fixture.context.store.id,
        entityType: 'STORE_PRODUCT' as const,
        entityId: graph.storeProduct.id,
        operationType: 'PRODUCT_IDENTITY_UPDATED' as const,
        changeType: 'UPSERT' as const,
        payloadVersion: 1 as const,
        payload: {
          ...cloud,
          operationId: testId(920 + revision),
          entities: { ...cloud.entities,
            productVariant: { ...cloud.entities.productVariant, name } },
        },
        entityVersion: revision,
        serverRevision: revision,
        occurredAt: '2026-09-19T00:00:00.000Z',
      });
      for (const revision of [2, 3]) {
        applySyncPullPage(fixture.adapter, {
          protocolVersion: 1,
          payloadVersion: 1,
          changes: [change(revision, `Cloud name ${revision}`)],
          nextCursor: { revision, changeIndex: 0 },
          hasMore: false,
          serverRevision: revision,
        }, {
          storeId: fixture.context.store.id,
          options: { now: '2026-09-19T00:00:00.000Z', conflictIdFactory: () => testId(930) },
        });
      }
      expect(findOutboxOperation(fixture.adapter, local.outbox.operationId)?.status).toBe('CONFLICT');
      expect(getProductVariantById(fixture.adapter, graph.variant.id)?.name).toBe('Milo local name');
      expect(listOpenSyncConflicts(fixture.adapter, fixture.context.store.id)[0]).toMatchObject({
        serverVersion: 3,
        serverRevision: 3,
      });
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('preserves a local edit through multiple bootstrap changes for the same product', () => {
    const fixture = openCatalogueFixture();
    try {
      const { graph, local, cloud } = makeConflict(fixture);
      fixture.adapter.run('DELETE FROM sync_conflicts WHERE operation_id = ?;', [local.outbox.operationId]);
      ensureSyncStoreState(fixture.adapter, {
        storeId: fixture.context.store.id, deviceId: fixture.context.device.id,
      });
      beginSyncBootstrap(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        bootstrapId: testId(940),
      });
      const later = {
        ...cloud,
        operationId: testId(941),
        entities: { ...cloud.entities,
          productVariant: { ...cloud.entities.productVariant, name: 'Latest cloud name' } },
      };
      applySyncBootstrapPage(fixture.adapter, {
        protocolVersion: 1, payloadVersion: 1, snapshotRevision: 3,
        entities: [cloud, later].map((payload, index) => ({
          operationId: payload.operationId,
          storeId: fixture.context.store.id,
          entityType: 'STORE_PRODUCT' as const,
          entityId: graph.storeProduct.id,
          entityVersion: index + 2,
          serverRevision: index + 2,
          changeIndex: 0,
          payloadVersion: 1 as const,
          payload,
        })),
        nextCursor: null, hasMore: false,
      }, {
        storeId: fixture.context.store.id,
        options: { now: '2026-09-19T00:00:00.000Z', conflictIdFactory: () => testId(942) },
      });
      const result = commitSyncBootstrapSnapshot(fixture.adapter, {
        storeId: fixture.context.store.id,
        snapshotRevision: 3,
        options: { now: '2026-09-19T00:00:00.000Z', conflictIdFactory: () => testId(942) },
      });
      expect(result.conflicts).toBe(1);
      expect(getProductVariantById(fixture.adapter, graph.variant.id)?.name).toBe('Milo local name');
      expect(findOutboxOperation(fixture.adapter, local.outbox.operationId)?.status).toBe('CONFLICT');
      expect(listOpenSyncConflicts(fixture.adapter, fixture.context.store.id)[0]).toMatchObject({
        serverVersion: 3, serverRevision: 3,
      });
    } finally {
      fixture.closeAndDelete();
    }
  });
});

