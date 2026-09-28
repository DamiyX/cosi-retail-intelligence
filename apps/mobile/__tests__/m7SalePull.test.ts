import { MICROS_PER_UNIT } from '@retail/domain';

import { createTemporaryProduct } from '../src/catalogue/createTemporaryProduct';
import { completeSale } from '../src/sales/completeSale';
import { recordPurchase } from '../src/purchases/recordPurchase';
import {
  ensureSyncStoreState,
  getActiveBasePackageUnit,
  getSyncStoreState,
  type OutboxOperationRow,
} from '../src/db/repositories';
import { applySyncPullPage } from '../src/sync/applier';
import { materializeSyncOperation } from '../src/sync/materialize';
import {
  countRows,
  deterministicIds,
  openCatalogueFixture,
  syncReferenceContextFor,
  testId,
  type CatalogueFixture,
} from './catalogueSupport';

const NOW = '2026-09-28T08:00:00.000Z';

function pullOperation(
  receiver: CatalogueFixture,
  outbox: OutboxOperationRow,
  payload: Record<string, unknown>,
  revision: number,
) {
  return applySyncPullPage(receiver.adapter, {
    protocolVersion: 1,
    payloadVersion: 1,
    changes: [{
      operationId: outbox.operationId,
      storeId: outbox.storeId,
      entityType: outbox.entityType,
      entityId: outbox.entityId,
      operationType: outbox.operationType,
      changeType: 'UPSERT',
      payloadVersion: 1,
      payload,
      entityVersion: 1,
      serverRevision: revision,
      occurredAt: outbox.createdAt,
    }],
    nextCursor: { revision, changeIndex: 0 },
    hasMore: false,
    serverRevision: revision,
  }, {
    storeId: receiver.context.store.id,
    referenceContext: syncReferenceContextFor(receiver, revision),
    options: { now: NOW, conflictIdFactory: () => testId(2100 + revision) },
  });
}

describe('M7 remote completed-sale pull', () => {
  it('materializes the exact sale graph atomically and replays it without duplicates', () => {
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
      ensureSyncStoreState(receiver.adapter, {
        storeId: receiver.context.store.id,
        deviceId: receiver.context.device.id,
        now: NOW,
      });

      const packageUnit = getActiveBasePackageUnit(origin.adapter, originProduct.variant.id);
      if (!packageUnit) throw new Error('Test product has no active base package unit.');
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
      expect(pullOperation(receiver, purchase.outbox, JSON.parse(purchase.outbox.payload), 1).applied).toBe(1);

      const sale = completeSale(origin.adapter, {
        storeId: origin.context.store.id,
        deviceId: origin.context.device.id,
        userId: origin.context.owner.id,
        lines: [{
          storeProductId: originProduct.storeProduct.id,
          packageUnitId: packageUnit.id,
          quantityPackagesMicros: MICROS_PER_UNIT,
          unitPriceMinor: 200,
        }],
        payment: { method: 'CASH' },
      }, { generateId: deterministicIds(1200), operationId: testId(2000) });
      const envelope = JSON.parse(sale.outbox.payload);

      const malformedEnvelope = JSON.parse(sale.outbox.payload);
      malformedEnvelope.entities.costSnapshots[0].cogs.numerator = '01';
      const baselineCounts = [
        'sales', 'sale_items', 'payments', 'sale_item_cost_snapshots', 'cost_movements',
        'store_product_cost_states', 'inventory_events', 'batch_inventory_operations', 'batch_inventory_entries',
      ].map((table) => countRows(receiver.adapter, table));
      const outboxCountBeforeSale = countRows(receiver.adapter, 'outbox_operations');

      expect(() => pullOperation(receiver, sale.outbox, malformedEnvelope, 2))
        .toThrow('Sync payload has an invalid cogs rational.');
      expect(getSyncStoreState(receiver.adapter, receiver.context.store.id)).toMatchObject({
        cursorRevision: 1,
        cursorChangeIndex: 0,
        status: 'IDLE',
      });
      expect([
        'sales', 'sale_items', 'payments', 'sale_item_cost_snapshots', 'cost_movements',
        'store_product_cost_states', 'inventory_events', 'batch_inventory_operations', 'batch_inventory_entries',
      ].map((table) => countRows(receiver.adapter, table))).toEqual(baselineCounts);

      expect(pullOperation(receiver, sale.outbox, envelope, 2).applied).toBe(1);
      expect(countRows(receiver.adapter, 'sales')).toBe(1);
      expect(countRows(receiver.adapter, 'sale_items')).toBe(1);
      expect(countRows(receiver.adapter, 'payments')).toBe(1);
      expect(countRows(receiver.adapter, 'sale_item_cost_snapshots')).toBe(1);
      expect(countRows(receiver.adapter, 'cost_movements')).toBe(2);
      expect(countRows(receiver.adapter, 'store_product_cost_states')).toBe(1);
      expect(countRows(receiver.adapter, 'inventory_events')).toBe(2);
      expect(countRows(receiver.adapter, 'batch_inventory_operations')).toBe(2);
      expect(countRows(receiver.adapter, 'batch_inventory_entries')).toBe(
        purchase.batchEntries.length + sale.batchEntries.length,
      );

      const saleItem = receiver.adapter.getFirstRow<{
        id: string;
        sale_id: string;
        store_product_id: string;
        quantity_base_micros: number;
        unit_price_minor: number;
      }>(
        `SELECT id, sale_id, store_product_id, quantity_base_micros, unit_price_minor
         FROM sale_items WHERE id = ?;`,
        [sale.items[0].id],
      );
      expect(saleItem).toEqual({
        id: sale.items[0].id,
        sale_id: sale.sale.id,
        store_product_id: originProduct.storeProduct.id,
        quantity_base_micros: MICROS_PER_UNIT,
        unit_price_minor: 200,
      });

      const payment = receiver.adapter.getFirstRow<{
        id: string;
        sale_id: string;
        method: string;
        amount_minor: number;
      }>(
        'SELECT id, sale_id, method, amount_minor FROM payments WHERE id = ?;',
        [sale.payment.id],
      );
      expect(payment).toEqual({
        id: sale.payment.id,
        sale_id: sale.sale.id,
        method: 'CASH',
        amount_minor: sale.payment.amountMinor,
      });

      const event = receiver.adapter.getFirstRow<{ id: string; quantity_base_delta_micros: number }>(
        `SELECT id, quantity_base_delta_micros FROM inventory_events
         WHERE source_type = 'SALE' AND source_id = ?;`,
        [sale.sale.id],
      );
      expect(event).toEqual({
        id: sale.inventoryEvents[0].id,
        quantity_base_delta_micros: sale.inventoryEvents[0].quantityBaseDeltaMicros,
      });

      const snapshot = receiver.adapter.getFirstRow<{
        unit_cost_numerator: string | null;
        unit_cost_denominator: string | null;
        cogs_numerator: string | null;
        cogs_denominator: string | null;
        cogs_amount_minor: number | null;
      }>(
        `SELECT unit_cost_numerator, unit_cost_denominator, cogs_numerator, cogs_denominator, cogs_amount_minor
         FROM sale_item_cost_snapshots WHERE sale_item_id = ?;`,
        [sale.items[0].id],
      );
      expect(snapshot).toEqual({
        unit_cost_numerator: sale.costSnapshots[0].unitCost?.numerator ?? null,
        unit_cost_denominator: sale.costSnapshots[0].unitCost?.denominator ?? null,
        cogs_numerator: sale.costSnapshots[0].cogs?.numerator ?? null,
        cogs_denominator: sale.costSnapshots[0].cogs?.denominator ?? null,
        cogs_amount_minor: sale.costSnapshots[0].cogsAmountMinor,
      });

      const saleMovement = receiver.adapter.getFirstRow<{
        application_order: number;
        value_numerator: string;
        value_denominator: string;
        unit_cost_numerator: string | null;
        unit_cost_denominator: string | null;
      }>(
        `SELECT application_order, value_numerator, value_denominator,
                unit_cost_numerator, unit_cost_denominator
         FROM cost_movements WHERE id = ?;`,
        [sale.costMovements[0].id],
      );
      expect(saleMovement).toEqual({
        application_order: sale.costMovements[0].applicationOrder,
        value_numerator: sale.costMovements[0].value.numerator,
        value_denominator: sale.costMovements[0].value.denominator,
        unit_cost_numerator: sale.costMovements[0].unitCost?.numerator ?? null,
        unit_cost_denominator: sale.costMovements[0].unitCost?.denominator ?? null,
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
        average_unit_cost_numerator: sale.costStates[0].averageUnitCost?.numerator ?? null,
        average_unit_cost_denominator: sale.costStates[0].averageUnitCost?.denominator ?? null,
        remaining_value_numerator: sale.costStates[0].remainingValue.numerator,
        remaining_value_denominator: sale.costStates[0].remainingValue.denominator,
      });

      const batchOperation = receiver.adapter.getFirstRow<{
        sealed_at: string | null;
        sealed_entry_count: number | null;
        sealed_delta_base_micros: string | null;
      }>(
        `SELECT sealed_at, sealed_entry_count, sealed_delta_base_micros
         FROM batch_inventory_operations WHERE id = ?;`,
        [sale.batchOperations[0].id],
      );
      expect(batchOperation).toEqual({
        sealed_at: sale.batchOperations[0].sealedAt,
        sealed_entry_count: sale.batchOperations[0].sealedEntryCount,
        sealed_delta_base_micros: sale.batchOperations[0].sealedDeltaBaseMicros,
      });

      const batchEntries = receiver.adapter.getAllRows<{
        id: string;
        group_id: string | null;
        delta_base_micros: number;
      }>(
        `SELECT id, group_id, delta_base_micros FROM batch_inventory_entries
         WHERE operation_id = ? ORDER BY entry_order ASC;`,
        [sale.batchOperations[0].id],
      );
      expect(batchEntries).toEqual(sale.batchEntries.map((entry) => ({
        id: entry.id,
        group_id: entry.groupId,
        delta_base_micros: entry.deltaBaseMicros,
      })));

      materializeSyncOperation(receiver.adapter, envelope);
      expect(countRows(receiver.adapter, 'sales')).toBe(1);
      expect(countRows(receiver.adapter, 'sale_items')).toBe(1);
      expect(countRows(receiver.adapter, 'payments')).toBe(1);
      expect(countRows(receiver.adapter, 'sale_item_cost_snapshots')).toBe(1);
      expect(countRows(receiver.adapter, 'cost_movements')).toBe(2);
      expect(countRows(receiver.adapter, 'inventory_events')).toBe(2);
      expect(countRows(receiver.adapter, 'batch_inventory_operations')).toBe(2);
      expect(countRows(receiver.adapter, 'batch_inventory_entries')).toBe(
        purchase.batchEntries.length + sale.batchEntries.length,
      );
      expect(countRows(receiver.adapter, 'outbox_operations')).toBe(outboxCountBeforeSale);
    } finally {
      origin.closeAndDelete();
      receiver.closeAndDelete();
    }
  });
});
