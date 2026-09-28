import { MICROS_PER_UNIT } from '@retail/domain';

import { createTemporaryProduct } from '../src/catalogue/createTemporaryProduct';
import { ensureSyncStoreState } from '../src/db/repositories';
import { recordInventoryAdjustment } from '../src/inventory/adjustInventory';
import { getBatchProjectionForStoreProduct } from '../src/inventory/batchAllocation';
import { classifyInventoryBatches } from '../src/inventory/classifyBatches';
import { createDatabaseInventoryClient } from '../src/inventory/client';
import { recordPurchase } from '../src/purchases/recordPurchase';
import { applySyncPullPage } from '../src/sync/applier';
import { countRows, deterministicIds, openCatalogueFixture, syncReferenceContextFor, testId } from './catalogueSupport';

const NOW = '2026-09-28T08:00:00.000Z';

describe('M7 M5 pull semantics', () => {
  it('preserves receipt and physical evidence, unknown stock, expiry removal, and active attention conditions', () => {
    const origin = openCatalogueFixture();
    const receiver = openCatalogueFixture();
    try {
      const product = createTemporaryProduct(origin.adapter, {
        storeId: origin.context.store.id,
        deviceId: origin.context.device.id,
        name: 'Dated rice',
      }, { generateId: deterministicIds(1000), operationId: testId(1090) });
      ensureSyncStoreState(receiver.adapter, {
        storeId: receiver.context.store.id,
        deviceId: receiver.context.device.id,
        now: NOW,
      });

      const purchase = recordPurchase(origin.adapter, {
        storeId: origin.context.store.id,
        deviceId: origin.context.device.id,
        userId: origin.context.owner.id,
        occurredAt: NOW,
        lines: [{
          storeProductId: product.storeProduct.id,
          packageUnitId: product.basePackage.id,
          quantityPackagesMicros: 3 * MICROS_PER_UNIT,
          enteredCostMinor: 300,
          expiryPrecision: 'DAY',
          expiryValue: '2026-09-10',
          expiryMeaning: 'EXPIRY',
        }],
      }, { generateId: deterministicIds(1100), operationId: testId(1190) });
      const receiptGroup = purchase.batchGroups[0];

      const beforeCorrection = getBatchProjectionForStoreProduct(origin.adapter, product.storeProduct.id);
      const openingAdjustment = recordInventoryAdjustment(origin.adapter, {
        operationId: testId(1290),
        storeId: origin.context.store.id,
        deviceId: origin.context.device.id,
        userId: origin.context.owner.id,
        occurredAt: NOW,
        reasonCode: 'CORRECTION',
        lines: [{
          storeProductId: product.storeProduct.id,
          quantityBaseDeltaMicros: 4 * MICROS_PER_UNIT,
          expectedInventoryWatermark: beforeCorrection.inventoryWatermark,
          expectedBatchWatermark: beforeCorrection.batchWatermark,
        }],
      }, { generateId: deterministicIds(1200) });
      expect(getBatchProjectionForStoreProduct(origin.adapter, product.storeProduct.id).unknownResidualBaseMicros)
        .toBe(String(4 * MICROS_PER_UNIT));

      const beforeClassification = getBatchProjectionForStoreProduct(origin.adapter, product.storeProduct.id);
      const classification = classifyInventoryBatches(origin.adapter, {
        operationId: testId(1390),
        storeId: origin.context.store.id,
        deviceId: origin.context.device.id,
        userId: origin.context.owner.id,
        storeProductId: product.storeProduct.id,
        expectedInventoryWatermark: beforeClassification.inventoryWatermark,
        expectedBatchWatermark: beforeClassification.batchWatermark,
        groups: [{
          quantityBaseMicros: 4 * MICROS_PER_UNIT,
          datePrecision: 'DAY',
          dateValue: '2026-10-02',
          dateMeaning: 'EXPIRY',
        }],
      }, { generateId: deterministicIds(1300) });
      const physicalGroup = classification.groups[0];
      expect(getBatchProjectionForStoreProduct(origin.adapter, product.storeProduct.id).unknownResidualBaseMicros).toBe('0');

      const inventory = createDatabaseInventoryClient(origin.adapter, {
        storeId: origin.context.store.id,
        deviceId: origin.context.device.id,
        userId: origin.context.owner.id,
        generateId: deterministicIds(1500),
      });
      const expiredCondition = inventory.getAttentionOverview(NOW).items.find(
        (item) => item.storeProductId === product.storeProduct.id && item.groupId === receiptGroup.id,
      );
      expect(expiredCondition).toMatchObject({ conditionType: 'EXPIRY', groupId: receiptGroup.id });
      if (!expiredCondition) throw new Error('The expired receipt group did not produce an active attention condition.');
      const snooze = inventory.snoozeAttention({
        operationId: testId(1590),
        conditionKey: expiredCondition.conditionKey,
        conditionType: expiredCondition.conditionType,
        storeProductId: expiredCondition.storeProductId,
        groupId: expiredCondition.groupId,
        severityRank: expiredCondition.severityRank,
        snoozeKind: 'TOMORROW',
        now: NOW,
      });

      const beforeExpiryRemoval = getBatchProjectionForStoreProduct(origin.adapter, product.storeProduct.id);
      const expiredRemoval = recordInventoryAdjustment(origin.adapter, {
        operationId: testId(1690),
        storeId: origin.context.store.id,
        deviceId: origin.context.device.id,
        userId: origin.context.owner.id,
        occurredAt: NOW,
        reasonCode: 'EXPIRED',
        lines: [{
          storeProductId: product.storeProduct.id,
          quantityBaseDeltaMicros: -3 * MICROS_PER_UNIT,
          groupId: receiptGroup.id,
          expectedInventoryWatermark: beforeExpiryRemoval.inventoryWatermark,
          expectedBatchWatermark: beforeExpiryRemoval.batchWatermark,
        }],
      }, { generateId: deterministicIds(1600) });

      const operations = [
        product.outbox,
        purchase.outbox,
        openingAdjustment.outbox,
        classification.outbox,
        snooze.outbox,
        expiredRemoval.outbox,
      ];
      const changes = operations.map((outbox, index) => {
        const payload = JSON.parse(outbox.payload) as { occurredAt: string };
        return {
          operationId: outbox.operationId,
          storeId: outbox.storeId,
          entityType: outbox.entityType,
          entityId: outbox.entityId,
          operationType: outbox.operationType,
          changeType: 'UPSERT' as const,
          payloadVersion: 1 as const,
          payload,
          entityVersion: 1,
          serverRevision: index + 1,
          occurredAt: payload.occurredAt,
        };
      });

      const firstPage = applySyncPullPage(receiver.adapter, {
        protocolVersion: 1,
        payloadVersion: 1,
        changes: changes.slice(0, 5),
        nextCursor: { revision: 5, changeIndex: 0 },
        hasMore: false,
        serverRevision: 5,
      }, {
        storeId: receiver.context.store.id,
        referenceContext: syncReferenceContextFor(receiver, 5),
        options: { now: NOW, conflictIdFactory: () => testId(1800) },
      });
      expect(firstPage.applied).toBe(5);
      expect(receiver.adapter.getFirstRow<{ evidence_source: string; date_precision: string; date_value: string }>(
        'SELECT evidence_source, date_precision, date_value FROM inventory_batch_groups WHERE id = ?;',
        [receiptGroup.id],
      )).toEqual({ evidence_source: 'RECEIPT', date_precision: 'DAY', date_value: '2026-09-10' });
      expect(receiver.adapter.getFirstRow<{ evidence_source: string; origin: string }>(
        'SELECT evidence_source, origin FROM inventory_batch_groups WHERE id = ?;',
        [physicalGroup.id],
      )).toEqual({ evidence_source: 'PHYSICAL_INSPECTION', origin: 'PHYSICAL_INSPECTION' });
      expect(getBatchProjectionForStoreProduct(receiver.adapter, product.storeProduct.id)).toMatchObject({
        unknownResidualBaseMicros: '0',
        inventoryBalanceBaseMicros: String(7 * MICROS_PER_UNIT),
      });
      expect(countRows(receiver.adapter, 'inventory_attention_snoozes')).toBe(1);
      expect(createDatabaseInventoryClient(receiver.adapter, {
        storeId: receiver.context.store.id,
        deviceId: receiver.context.device.id,
        userId: receiver.context.owner.id,
      }).getAttentionOverview(NOW)).toMatchObject({ suppressedCount: 1 });

      const finalPage = applySyncPullPage(receiver.adapter, {
        protocolVersion: 1,
        payloadVersion: 1,
        changes: [changes[5]],
        nextCursor: { revision: 6, changeIndex: 0 },
        hasMore: false,
        serverRevision: 6,
      }, {
        storeId: receiver.context.store.id,
        referenceContext: syncReferenceContextFor(receiver, 6),
        options: { now: NOW, conflictIdFactory: () => testId(1801) },
      });
      expect(finalPage.applied).toBe(1);
      expect(receiver.adapter.getFirstRow<{ event_type: string; quantity_base_delta_micros: number }>(
        'SELECT event_type, quantity_base_delta_micros FROM inventory_events WHERE source_id = ?;',
        [expiredRemoval.adjustment.id],
      )).toEqual({ event_type: 'EXPIRED', quantity_base_delta_micros: -3 * MICROS_PER_UNIT });
      expect(getBatchProjectionForStoreProduct(receiver.adapter, product.storeProduct.id)).toMatchObject({
        unknownResidualBaseMicros: '0',
        inventoryBalanceBaseMicros: String(4 * MICROS_PER_UNIT),
      });
      expect(getBatchProjectionForStoreProduct(receiver.adapter, product.storeProduct.id).groups.find(
        (group) => group.id === receiptGroup.id,
      )?.balanceBaseMicros).toBe('0');
      const finalOverview = createDatabaseInventoryClient(receiver.adapter, {
        storeId: receiver.context.store.id,
        deviceId: receiver.context.device.id,
        userId: receiver.context.owner.id,
      }).getAttentionOverview(NOW);
      expect(finalOverview.items.some((item) => item.groupId === receiptGroup.id)).toBe(false);
      expect(finalOverview.items).toEqual(expect.arrayContaining([
        expect.objectContaining({ groupId: physicalGroup.id, conditionType: 'EXPIRY' }),
      ]));
    } finally {
      origin.closeAndDelete();
      receiver.closeAndDelete();
    }
  });
});
