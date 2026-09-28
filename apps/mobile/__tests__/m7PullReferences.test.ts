import { MICROS_PER_UNIT } from '@retail/domain';

import { createTemporaryProduct } from '../src/catalogue/createTemporaryProduct';
import {
  createDevice,
  createStoreMember,
  createUser,
  ensureSyncStoreState,
  getActiveBasePackageUnit,
} from '../src/db/repositories';
import { recordPurchase } from '../src/purchases/recordPurchase';
import { applySyncPullPage } from '../src/sync/applier';
import { testId, deterministicIds, openCatalogueFixture, syncReferenceContextFor } from './catalogueSupport';

const NOW = '2026-09-28T08:00:00.000Z';

function responseFor(outbox: {
  operationId: string;
  storeId: string;
  entityType: string;
  entityId: string;
  operationType: string;
  payload: string;
  createdAt: string;
}, revision: number) {
  return {
    protocolVersion: 1 as const,
    payloadVersion: 1 as const,
    changes: [{
      operationId: outbox.operationId,
      storeId: outbox.storeId,
      entityType: outbox.entityType as 'PURCHASE' | 'SALE',
      entityId: outbox.entityId,
      operationType: outbox.operationType as 'COMPLETED_PURCHASE_CREATED' | 'COMPLETED_SALE_CREATED',
      changeType: 'UPSERT' as const,
      payloadVersion: 1 as const,
      payload: JSON.parse(outbox.payload),
      entityVersion: 1,
      serverRevision: revision,
      occurredAt: outbox.createdAt,
    }],
    nextCursor: { revision, changeIndex: 0 },
    hasMore: false,
    serverRevision: revision,
  };
}

describe('M7 pull reference context', () => {
  it('installs a newly registered same-store origin device before materializing its purchase', () => {
    const origin = openCatalogueFixture();
    const receiver = openCatalogueFixture();
    try {
      const originProduct = createTemporaryProduct(origin.adapter, {
        storeId: origin.context.store.id,
        deviceId: origin.context.device.id,
        name: 'Rice',
      }, { generateId: deterministicIds(1000) });
      const receivingProduct = createTemporaryProduct(receiver.adapter, {
        storeId: receiver.context.store.id,
        deviceId: receiver.context.device.id,
        name: 'Rice',
      }, { generateId: deterministicIds(1000) });
      expect(receivingProduct.storeProduct.id).toBe(originProduct.storeProduct.id);

      const thirdDevice = createDevice(origin.adapter, {
        id: testId(9501),
        storeId: origin.context.store.id,
        userId: origin.context.owner.id,
        platform: 'ANDROID',
        deviceLabel: 'Third counter phone',
        appVersion: '1.0.0',
      });
      const packageUnit = getActiveBasePackageUnit(origin.adapter, originProduct.variant.id);
      if (!packageUnit) throw new Error('Test product has no active base package unit.');
      const purchase = recordPurchase(origin.adapter, {
        storeId: origin.context.store.id,
        deviceId: thirdDevice.id,
        userId: origin.context.owner.id,
        occurredAt: NOW,
        lines: [{
          storeProductId: originProduct.storeProduct.id,
          packageUnitId: packageUnit.id,
          quantityPackagesMicros: MICROS_PER_UNIT,
          enteredCostMinor: 101,
        }],
      }, { generateId: deterministicIds(1200), operationId: testId(9502) });
      ensureSyncStoreState(receiver.adapter, {
        storeId: receiver.context.store.id,
        deviceId: receiver.context.device.id,
        now: NOW,
      });

      expect(receiver.adapter.getFirstRow('SELECT id FROM devices WHERE id = ?;', [thirdDevice.id])).toBeNull();
      const result = applySyncPullPage(
        receiver.adapter,
        responseFor(purchase.outbox, 1),
        {
          storeId: receiver.context.store.id,
          referenceContext: syncReferenceContextFor(origin, 1),
          options: { now: NOW, conflictIdFactory: () => testId(9503) },
        },
      );

      expect(result.applied).toBe(1);
      expect(receiver.adapter.getFirstRow<{ id: string; user_id: string; device_label: string }>(
        'SELECT id, user_id, device_label FROM devices WHERE id = ?;', [thirdDevice.id],
      )).toEqual({
        id: thirdDevice.id,
        user_id: origin.context.owner.id,
        device_label: 'Third counter phone',
      });
      expect(receiver.adapter.getFirstRow<{ device_id: string; created_by_user_id: string }>(
        'SELECT device_id, created_by_user_id FROM purchases WHERE id = ?;', [purchase.purchase.id],
      )).toEqual({ device_id: thirdDevice.id, created_by_user_id: origin.context.owner.id });
    } finally {
      origin.closeAndDelete();
      receiver.closeAndDelete();
    }
  });

  it('materializes an accepted purchase from a subsequently suspended member and revoked device, then restores those statuses', () => {
    const origin = openCatalogueFixture();
    const receiver = openCatalogueFixture();
    try {
      const staffUser = createUser(origin.adapter, {
        id: testId(9601),
        displayName: 'Former stock clerk',
      });
      const staffMember = createStoreMember(origin.adapter, {
        id: testId(9602),
        storeId: origin.context.store.id,
        userId: staffUser.id,
        role: 'STAFF',
      });
      const staffDevice = createDevice(origin.adapter, {
        id: testId(9603),
        storeId: origin.context.store.id,
        userId: staffUser.id,
        platform: 'ANDROID',
        deviceLabel: 'Former staff handset',
        appVersion: '1.0.0',
      });
      const originProduct = createTemporaryProduct(origin.adapter, {
        storeId: origin.context.store.id,
        deviceId: origin.context.device.id,
        name: 'Beans',
      }, { generateId: deterministicIds(1300) });
      const receivingProduct = createTemporaryProduct(receiver.adapter, {
        storeId: receiver.context.store.id,
        deviceId: receiver.context.device.id,
        name: 'Beans',
      }, { generateId: deterministicIds(1300) });
      expect(receivingProduct.storeProduct.id).toBe(originProduct.storeProduct.id);
      const packageUnit = getActiveBasePackageUnit(origin.adapter, originProduct.variant.id);
      if (!packageUnit) throw new Error('Test product has no active base package unit.');
      const purchase = recordPurchase(origin.adapter, {
        storeId: origin.context.store.id,
        deviceId: staffDevice.id,
        userId: staffUser.id,
        occurredAt: NOW,
        lines: [{
          storeProductId: originProduct.storeProduct.id,
          packageUnitId: packageUnit.id,
          quantityPackagesMicros: MICROS_PER_UNIT,
          enteredCostMinor: 140,
        }],
      }, { generateId: deterministicIds(1400), operationId: testId(9604) });
      origin.adapter.run("UPDATE users SET status = 'SUSPENDED' WHERE id = ?;", [staffUser.id]);
      origin.adapter.run("UPDATE store_members SET status = 'SUSPENDED' WHERE id = ?;", [staffMember.id]);
      origin.adapter.run("UPDATE devices SET status = 'REVOKED' WHERE id = ?;", [staffDevice.id]);
      ensureSyncStoreState(receiver.adapter, {
        storeId: receiver.context.store.id,
        deviceId: receiver.context.device.id,
        now: NOW,
      });

      const result = applySyncPullPage(
        receiver.adapter,
        responseFor(purchase.outbox, 1),
        {
          storeId: receiver.context.store.id,
          referenceContext: syncReferenceContextFor(origin, 1),
          options: { now: NOW, conflictIdFactory: () => testId(9605) },
        },
      );

      expect(result.applied).toBe(1);
      expect(receiver.adapter.getFirstRow<{ created_by_store_member_id: string; created_by_user_id: string; device_id: string }>(
        'SELECT created_by_store_member_id, created_by_user_id, device_id FROM purchases WHERE id = ?;',
        [purchase.purchase.id],
      )).toEqual({
        created_by_store_member_id: staffMember.id,
        created_by_user_id: staffUser.id,
        device_id: staffDevice.id,
      });
      expect(receiver.adapter.getFirstRow<{ status: string }>(
        'SELECT status FROM users WHERE id = ?;', [staffUser.id],
      )?.status).toBe('SUSPENDED');
      expect(receiver.adapter.getFirstRow<{ status: string }>(
        'SELECT status FROM store_members WHERE id = ?;', [staffMember.id],
      )?.status).toBe('SUSPENDED');
      expect(receiver.adapter.getFirstRow<{ status: string; device_label: string }>(
        'SELECT status, device_label FROM devices WHERE id = ?;', [staffDevice.id],
      )).toEqual({ status: 'REVOKED', device_label: 'Former staff handset' });
    } finally {
      origin.closeAndDelete();
      receiver.closeAndDelete();
    }
  });
});
