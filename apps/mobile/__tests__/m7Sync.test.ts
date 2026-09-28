import {
  applySyncPullPage,
} from '../src/sync/applier';
import { OfflineSyncWorker } from '../src/sync/worker';
import { SyncTransportError, type SyncTransport } from '../src/sync/transport';
import type { SyncReferenceContext } from '@retail/contracts';
import { createTemporaryProduct } from '../src/catalogue/createTemporaryProduct';
import { updateProductIdentity } from '../src/catalogue/updateProductIdentity';
import { MIGRATIONS, openDatabase } from '../src/db';
import { openIsolatedDatabase } from '../src/db/testing';
import {
  claimOutboxBatch,
  beginSyncBootstrap,
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
import { createDevice } from '../src/db/repositories/devices';
import { createStoreMember } from '../src/db/repositories/storeMembers';
import { createUser } from '../src/db/repositories/users';
import { recordPurchase } from '../src/purchases/recordPurchase';
import { MICROS_PER_UNIT } from '@retail/domain';
import { completeSale } from '../src/sales/completeSale';
import { recordInventoryAdjustment } from '../src/inventory/adjustInventory';
import { getBatchProjectionForStoreProduct } from '../src/inventory/batchAllocation';
import { recordExpense } from '../src/finance/recordExpense';
import { recordOwnerWithdrawal } from '../src/finance/recordOwnerWithdrawal';
import { openCatalogueFixture, testId } from './catalogueSupport';
import { provisionStoreContext } from '../src/storeContext/provisionStoreContext';

const NOW = '2026-09-19T00:00:00.000Z';

function sessionProvider() {
  return { getSession: async () => ({ accessToken: 'test-access-token' }) };
}

function referenceContextFor(
  fixture: ReturnType<typeof openCatalogueFixture>,
  serverRevision = 0,
): SyncReferenceContext {
  const { store, owner, membership, device } = fixture.context;
  return {
    protocolVersion: 1,
    payloadVersion: 1,
    serverRevision,
    store: {
      id: store.id,
      name: store.name,
      currencyCode: store.currencyCode,
      countryCode: store.countryCode,
      timezone: store.timezone,
      status: 'ACTIVE',
      createdByUserId: owner.id,
      createdAt: store.createdAt,
      updatedAt: store.updatedAt,
    },
    users: [{
      id: owner.id,
      displayName: owner.displayName,
      status: 'ACTIVE',
      createdAt: owner.createdAt,
      updatedAt: owner.updatedAt,
    }],
    members: [{
      id: membership.id,
      storeId: membership.storeId,
      userId: membership.userId,
      role: membership.role,
      status: 'ACTIVE',
      joinedAt: membership.joinedAt,
      createdAt: membership.createdAt,
      updatedAt: membership.updatedAt,
    }],
    devices: [{
      id: device.id,
      storeId: device.storeId,
      userId: device.userId,
      platform: device.platform,
      deviceLabel: device.deviceLabel,
      appVersion: device.appVersion,
      status: 'ACTIVE',
      createdAt: device.createdAt,
    }],
  };
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
      }, {
        storeId: fixture.context.store.id,
        referenceContext: referenceContextFor(fixture, 7),
        options: { now: NOW, conflictIdFactory: () => testId(301) },
      });
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
        referenceContext: async () => referenceContextFor(fixture),
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
        referenceContext: async () => referenceContextFor(fixture),
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
        referenceContext: async () => referenceContextFor(fixture, 5),
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
        { cursor: { snapshotRevision: 5, afterRevision: 0, afterChangeIndex: 0 } },
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

  it('restores a fresh device from paginated history with revoked origin references', async () => {
    const origin = openCatalogueFixture();
    const receiver = openIsolatedDatabase(MIGRATIONS);
    try {
      const staffUser = createUser(origin.adapter, {
        id: testId(820),
        displayName: 'Former stock clerk',
      });
      const staffMember = createStoreMember(origin.adapter, {
        id: testId(821),
        storeId: origin.context.store.id,
        userId: staffUser.id,
        role: 'STAFF',
      });
      const staffDevice = createDevice(origin.adapter, {
        id: testId(822),
        storeId: origin.context.store.id,
        userId: staffUser.id,
        platform: 'ANDROID',
        appVersion: '1.0.0',
      });
      const product = createTemporaryProduct(origin.adapter, {
        storeId: origin.context.store.id,
        deviceId: origin.context.device.id,
        name: 'Restore rice',
      }, { generateId: (() => { let next = 830; return () => testId(next++); })(), operationId: testId(829) });
      const purchase = recordPurchase(origin.adapter, {
        storeId: origin.context.store.id,
        deviceId: staffDevice.id,
        userId: staffUser.id,
        occurredAt: NOW,
        lines: [{
          storeProductId: product.storeProduct.id,
          packageUnitId: product.basePackage.id,
          quantityPackagesMicros: 5 * MICROS_PER_UNIT,
          enteredCostMinor: 125,
        }],
      }, { generateId: (() => { let next = 850; return () => testId(next++); })(), operationId: testId(849) });
      const sale = completeSale(origin.adapter, {
        storeId: origin.context.store.id,
        deviceId: origin.context.device.id,
        userId: origin.context.owner.id,
        lines: [{
          storeProductId: product.storeProduct.id,
          packageUnitId: product.basePackage.id,
          quantityPackagesMicros: MICROS_PER_UNIT,
          unitPriceMinor: 200,
        }],
        payment: { method: 'CASH' },
      }, { generateId: (() => { let next = 870; return () => testId(next++); })(), operationId: testId(869) });
      const beforeAdjustment = getBatchProjectionForStoreProduct(origin.adapter, product.storeProduct.id);
      const adjustment = recordInventoryAdjustment(origin.adapter, {
        operationId: testId(879),
        storeId: origin.context.store.id,
        deviceId: origin.context.device.id,
        userId: origin.context.owner.id,
        occurredAt: NOW,
        reasonCode: 'CORRECTION',
        lines: [{
          storeProductId: product.storeProduct.id,
          quantityBaseDeltaMicros: MICROS_PER_UNIT,
          expectedInventoryWatermark: beforeAdjustment.inventoryWatermark,
          expectedBatchWatermark: beforeAdjustment.batchWatermark,
        }],
      }, { generateId: (() => { let next = 880; return () => testId(next++); })() });
      const expense = recordExpense(origin.adapter, {
        storeId: origin.context.store.id,
        deviceId: origin.context.device.id,
        userId: origin.context.owner.id,
        category: 'TRANSPORT',
        amountMinor: 125,
        currencyCode: 'NGN',
        occurredAt: NOW,
      }, { generateId: () => testId(889), operationId: testId(888) });
      const withdrawal = recordOwnerWithdrawal(origin.adapter, {
        storeId: origin.context.store.id,
        deviceId: origin.context.device.id,
        userId: origin.context.owner.id,
        amountMinor: 50,
        currencyCode: 'NGN',
        occurredAt: NOW,
      }, { generateId: () => testId(891), operationId: testId(890) });
      origin.adapter.run("UPDATE users SET status = 'SUSPENDED' WHERE id = ?;", [staffUser.id]);
      origin.adapter.run("UPDATE store_members SET status = 'SUSPENDED' WHERE id = ?;", [staffMember.id]);
      origin.adapter.run("UPDATE devices SET status = 'REVOKED' WHERE id = ?;", [staffDevice.id]);

      const newDeviceId = testId(823);
      const referenceContext: SyncReferenceContext = {
        protocolVersion: 1,
        payloadVersion: 1,
        serverRevision: 6,
        store: {
          id: origin.context.store.id,
          name: origin.context.store.name,
          currencyCode: origin.context.store.currencyCode,
          countryCode: origin.context.store.countryCode,
          timezone: origin.context.store.timezone,
          status: 'ACTIVE',
          createdByUserId: origin.context.owner.id,
          createdAt: origin.context.store.createdAt,
          updatedAt: origin.context.store.updatedAt,
        },
        users: [
          {
            id: origin.context.owner.id,
            displayName: origin.context.owner.displayName,
            status: 'ACTIVE',
            createdAt: origin.context.owner.createdAt,
            updatedAt: origin.context.owner.updatedAt,
          },
          {
            id: staffUser.id,
            displayName: staffUser.displayName,
            status: 'SUSPENDED',
            createdAt: staffUser.createdAt,
            updatedAt: staffUser.updatedAt,
          },
        ],
        members: [
          {
            id: origin.context.membership.id,
            storeId: origin.context.membership.storeId,
            userId: origin.context.membership.userId,
            role: origin.context.membership.role,
            status: 'ACTIVE',
            joinedAt: origin.context.membership.joinedAt,
            createdAt: origin.context.membership.createdAt,
            updatedAt: origin.context.membership.updatedAt,
          },
          {
            id: staffMember.id,
            storeId: staffMember.storeId,
            userId: staffMember.userId,
            role: staffMember.role,
            status: 'SUSPENDED',
            joinedAt: staffMember.joinedAt,
            createdAt: staffMember.createdAt,
            updatedAt: staffMember.updatedAt,
          },
        ],
        devices: [
          {
            id: origin.context.device.id,
            storeId: origin.context.device.storeId,
            userId: origin.context.device.userId,
            platform: origin.context.device.platform,
            deviceLabel: origin.context.device.deviceLabel,
            appVersion: origin.context.device.appVersion,
            status: 'ACTIVE',
            createdAt: origin.context.device.createdAt,
          },
          {
            id: staffDevice.id,
            storeId: staffDevice.storeId,
            userId: staffDevice.userId,
            platform: staffDevice.platform,
            deviceLabel: staffDevice.deviceLabel,
            appVersion: staffDevice.appVersion,
            status: 'REVOKED',
            createdAt: staffDevice.createdAt,
          },
          {
            id: newDeviceId,
            storeId: origin.context.store.id,
            userId: origin.context.owner.id,
            platform: 'ANDROID',
            deviceLabel: 'New handset',
            appVersion: '1.0.0',
            status: 'ACTIVE',
            createdAt: NOW,
          },
        ],
      };
      const operations = [
        product.outbox,
        purchase.outbox,
        sale.outbox,
        adjustment.outbox,
        expense.outbox,
        withdrawal.outbox,
      ];
      let page = 0;
      const transport: SyncTransport = {
        referenceContext: async () => referenceContext,
        enroll: async () => { throw new Error('not used'); },
        push: async () => { throw new Error('not used'); },
        pull: async () => emptyPull(2),
        bootstrap: async (request) => {
          expect(request.cursor).toEqual({
            snapshotRevision: 6,
            afterRevision: page,
            afterChangeIndex: 0,
          });
          const operation = operations[page];
          if (!operation) throw new Error('Bootstrap requested an unexpected page.');
          page += 1;
          return {
            protocolVersion: 1,
            payloadVersion: 1,
            snapshotRevision: 6,
            entities: [{
              operationId: operation.operationId,
              storeId: operation.storeId,
              entityType: operation.entityType,
              entityId: operation.entityId,
              entityVersion: 1,
              serverRevision: page,
              changeIndex: 0,
              payloadVersion: 1,
              payload: JSON.parse(operation.payload),
            }],
            nextCursor: page === operations.length ? null : {
              snapshotRevision: 6,
              afterRevision: page,
              afterChangeIndex: 0,
            },
            hasMore: page !== operations.length,
          };
        },
      };
      const worker = new OfflineSyncWorker({
        adapter: receiver.adapter,
        storeId: origin.context.store.id,
        deviceId: newDeviceId,
        sessionProvider: sessionProvider(),
        transport,
        now: () => NOW,
        idFactory: () => testId(890),
      });

      expect(receiver.adapter.getFirstRow<{ total: number }>('SELECT COUNT(*) AS total FROM stores;')?.total).toBe(0);
      const result = await worker.bootstrap();
      expect(result).toMatchObject({ status: 'SYNCED', pulled: 6 });
      expect(receiver.adapter.getFirstRow<{ total: number }>('SELECT COUNT(*) AS total FROM stores;')?.total).toBe(1);
      expect(receiver.adapter.getFirstRow<{ total: number }>('SELECT COUNT(*) AS total FROM purchases;')?.total).toBe(1);
      expect(receiver.adapter.getFirstRow<{ total: number }>('SELECT COUNT(*) AS total FROM sales;')?.total).toBe(1);
      expect(receiver.adapter.getFirstRow<{ total: number }>('SELECT COUNT(*) AS total FROM inventory_adjustments;')?.total).toBe(1);
      expect(receiver.adapter.getFirstRow<{ total: number }>('SELECT COUNT(*) AS total FROM expenses;')?.total).toBe(1);
      expect(receiver.adapter.getFirstRow<{ total: number }>('SELECT COUNT(*) AS total FROM owner_withdrawals;')?.total).toBe(1);
      expect(receiver.adapter.getFirstRow<{ created_by_store_member_id: string }>(
        'SELECT created_by_store_member_id FROM purchases WHERE id = ?;', [purchase.purchase.id],
      )?.created_by_store_member_id).toBe(staffMember.id);
      expect(receiver.adapter.getFirstRow<{ status: string }>(
        'SELECT status FROM store_members WHERE id = ?;', [staffMember.id],
      )?.status).toBe('SUSPENDED');
      expect(receiver.adapter.getFirstRow<{ status: string }>(
        'SELECT status FROM devices WHERE id = ?;', [staffDevice.id],
      )?.status).toBe('REVOKED');
      expect(receiver.adapter.getFirstRow<{ status: string; device_id: string }>(
        'SELECT status, device_id FROM sync_store_state WHERE store_id = ?;', [origin.context.store.id],
      )).toEqual({ status: 'IDLE', device_id: newDeviceId });
      expect(receiver.adapter.getFirstRow<{ total: number }>('SELECT COUNT(*) AS total FROM outbox_operations;')?.total).toBe(0);
    } finally {
      origin.closeAndDelete();
      receiver.closeAndDelete();
    }
  });

  it('keeps a fresh store hidden when bootstrap is interrupted after a staged page', async () => {
    const origin = openCatalogueFixture();
    const receiver = openIsolatedDatabase(MIGRATIONS);
    try {
      const product = createTemporaryProduct(origin.adapter, {
        storeId: origin.context.store.id,
        deviceId: origin.context.device.id,
        name: 'Interrupted restore product',
      }, { generateId: (() => { let next = 910; return () => testId(next++); })(), operationId: testId(909) });
      const newDeviceId = testId(901);
      const baseContext = referenceContextFor(origin, 1);
      const referenceContext: SyncReferenceContext = {
        ...baseContext,
        devices: [...baseContext.devices, {
          id: newDeviceId,
          storeId: origin.context.store.id,
          userId: origin.context.owner.id,
          platform: 'ANDROID',
          deviceLabel: null,
          appVersion: '1.0.0',
          status: 'ACTIVE',
          createdAt: NOW,
        }],
      };
      let bootstrapCalls = 0;
      const transport: SyncTransport = {
        referenceContext: async () => referenceContext,
        enroll: async () => { throw new Error('not used'); },
        push: async () => { throw new Error('not used'); },
        pull: async () => emptyPull(1),
        bootstrap: async () => {
          bootstrapCalls += 1;
          if (bootstrapCalls === 1) {
            return {
              protocolVersion: 1,
              payloadVersion: 1,
              snapshotRevision: 1,
              entities: [{
                operationId: product.outbox.operationId,
                storeId: product.outbox.storeId,
                entityType: product.outbox.entityType,
                entityId: product.outbox.entityId,
                entityVersion: 1,
                serverRevision: 1,
                changeIndex: 0,
                payloadVersion: 1,
                payload: JSON.parse(product.outbox.payload),
              }],
              nextCursor: { snapshotRevision: 1, afterRevision: 1, afterChangeIndex: 0 },
              hasMore: true,
            };
          }
          expect(receiver.adapter.getFirstRow<{ total: number }>('SELECT COUNT(*) AS total FROM stores;')?.total).toBe(0);
          expect(receiver.adapter.getFirstRow<{ total: number }>(
            'SELECT COUNT(*) AS total FROM sync_bootstrap_restore_operations;',
          )?.total).toBe(1);
          throw new SyncTransportError('NETWORK', 'connection interrupted', { retryable: true });
        },
      };
      const worker = new OfflineSyncWorker({
        adapter: receiver.adapter,
        storeId: origin.context.store.id,
        deviceId: newDeviceId,
        sessionProvider: sessionProvider(),
        transport,
        now: () => NOW,
        idFactory: () => testId(902),
      });

      expect(await worker.bootstrap()).toMatchObject({ status: 'RETRY_SCHEDULED' });
      expect(receiver.adapter.getFirstRow<{ total: number }>('SELECT COUNT(*) AS total FROM stores;')?.total).toBe(0);
      expect(receiver.adapter.getFirstRow<{ total: number }>('SELECT COUNT(*) AS total FROM users;')?.total).toBe(0);
      expect(receiver.adapter.getFirstRow<{ total: number }>('SELECT COUNT(*) AS total FROM sync_store_state;')?.total).toBe(0);
      expect(getSyncBootstrapState(receiver.adapter, origin.context.store.id)).toMatchObject({
        status: 'FAILED',
        referenceContext: { store: { id: origin.context.store.id }, serverRevision: 1 },
      });
      expect(receiver.adapter.getFirstRow<{ total: number }>('SELECT COUNT(*) AS total FROM outbox_operations;')?.total).toBe(0);
    } finally {
      origin.closeAndDelete();
      receiver.closeAndDelete();
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
        referenceContext: async () => referenceContextFor(fixture, 8),
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
        referenceContext: async () => referenceContextFor(destination, 2),
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
        referenceContext: async () => referenceContextFor(fixture),
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
      beginSyncBootstrap(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        bootstrapId: testId(725),
        referenceContext: referenceContextFor(fixture),
        startedAt: NOW,
      });
      let transportCalled = false;
      const transport: SyncTransport = {
        referenceContext: async () => referenceContextFor(fixture),
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
        referenceContext: async () => referenceContextFor(fixture),
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
        referenceContext: async () => referenceContextFor(fixture),
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
