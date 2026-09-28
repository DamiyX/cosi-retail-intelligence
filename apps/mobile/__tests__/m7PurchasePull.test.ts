import { MICROS_PER_UNIT } from '@retail/domain';

import { createTemporaryProduct } from '../src/catalogue/createTemporaryProduct';
import { ensureSyncStoreState, getActiveBasePackageUnit } from '../src/db/repositories';
import { recordPurchase } from '../src/purchases/recordPurchase';
import { applySyncPullPage } from '../src/sync/applier';
import { materializeSyncOperation } from '../src/sync/materialize';
import { countRows, deterministicIds, openCatalogueFixture, syncReferenceContextFor, testId } from './catalogueSupport';

const NOW = '2026-09-28T08:00:00.000Z';

describe('M7 remote purchase pull', () => {
  it('materializes purchase items, exact cost values and sealed receipt batches; replay is idempotent', () => {
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

      const packageUnit = getActiveBasePackageUnit(origin.adapter, originProduct.variant.id);
      if (!packageUnit) throw new Error('Test product has no active base package unit.');
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
          storeProductId: originProduct.storeProduct.id,
          packageUnitId: packageUnit.id,
          quantityPackagesMicros: 3 * MICROS_PER_UNIT,
          enteredCostMinor: 101,
        }],
      }, { generateId: deterministicIds(1100), operationId: testId(1900) });
      const envelope = JSON.parse(purchase.outbox.payload);
      const outboxCountBeforePull = countRows(receiver.adapter, 'outbox_operations');

      const result = applySyncPullPage(receiver.adapter, {
        protocolVersion: 1,
        payloadVersion: 1,
        changes: [{
          operationId: purchase.outbox.operationId,
          storeId: purchase.outbox.storeId,
          entityType: purchase.outbox.entityType,
          entityId: purchase.outbox.entityId,
          operationType: purchase.outbox.operationType,
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
        storeId: receiver.context.store.id,
        referenceContext: syncReferenceContextFor(receiver, 1),
        options: { now: NOW, conflictIdFactory: () => testId(1901) },
      });

      expect(result.applied).toBe(1);
      expect(countRows(receiver.adapter, 'purchases')).toBe(1);
      expect(countRows(receiver.adapter, 'purchase_items')).toBe(1);
      expect(countRows(receiver.adapter, 'cost_movements')).toBe(1);
      expect(countRows(receiver.adapter, 'batch_inventory_operations')).toBe(1);
      expect(countRows(receiver.adapter, 'batch_inventory_entries')).toBe(purchase.batchEntries.length);

      const movement = receiver.adapter.getFirstRow<{
        value_numerator: string;
        value_denominator: string;
        unit_cost_numerator: string | null;
        unit_cost_denominator: string | null;
      }>(
        `SELECT value_numerator, value_denominator, unit_cost_numerator, unit_cost_denominator
         FROM cost_movements WHERE id = ?;`,
        [purchase.costMovements[0].id],
      );
      expect(movement).toEqual({
        value_numerator: purchase.costMovements[0].value.numerator,
        value_denominator: purchase.costMovements[0].value.denominator,
        unit_cost_numerator: purchase.costMovements[0].unitCost?.numerator ?? null,
        unit_cost_denominator: purchase.costMovements[0].unitCost?.denominator ?? null,
      });

      const costState = receiver.adapter.getFirstRow<{
        average_unit_cost_numerator: string | null;
        average_unit_cost_denominator: string | null;
        remaining_value_numerator: string;
        remaining_value_denominator: string;
      }>(
        `SELECT average_unit_cost_numerator, average_unit_cost_denominator,
                remaining_value_numerator, remaining_value_denominator
         FROM store_product_cost_states WHERE store_product_id = ?;`,
        [originProduct.storeProduct.id],
      );
      expect(costState).toEqual({
        average_unit_cost_numerator: purchase.costStates[0].averageUnitCost?.numerator ?? null,
        average_unit_cost_denominator: purchase.costStates[0].averageUnitCost?.denominator ?? null,
        remaining_value_numerator: purchase.costStates[0].remainingValue.numerator,
        remaining_value_denominator: purchase.costStates[0].remainingValue.denominator,
      });

      const batchOperation = receiver.adapter.getFirstRow<{
        sealed_at: string | null;
        sealed_entry_count: number | null;
        sealed_delta_base_micros: string | null;
      }>(
        `SELECT sealed_at, sealed_entry_count, sealed_delta_base_micros
         FROM batch_inventory_operations WHERE id = ?;`,
        [purchase.batchOperations[0].id],
      );
      expect(batchOperation).toEqual({
        sealed_at: purchase.batchOperations[0].sealedAt,
        sealed_entry_count: purchase.batchOperations[0].sealedEntryCount,
        sealed_delta_base_micros: purchase.batchOperations[0].sealedDeltaBaseMicros,
      });

      materializeSyncOperation(receiver.adapter, envelope);
      expect(countRows(receiver.adapter, 'purchases')).toBe(1);
      expect(countRows(receiver.adapter, 'purchase_items')).toBe(1);
      expect(countRows(receiver.adapter, 'cost_movements')).toBe(1);
      expect(countRows(receiver.adapter, 'batch_inventory_operations')).toBe(1);
      expect(countRows(receiver.adapter, 'batch_inventory_entries')).toBe(purchase.batchEntries.length);
      expect(countRows(receiver.adapter, 'outbox_operations')).toBe(outboxCountBeforePull);
    } finally {
      origin.closeAndDelete();
      receiver.closeAndDelete();
    }
  });
});
