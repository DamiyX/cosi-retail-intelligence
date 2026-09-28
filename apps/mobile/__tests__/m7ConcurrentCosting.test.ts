import { MICROS_PER_UNIT } from '@retail/domain';

import { createTemporaryProduct } from '../src/catalogue/createTemporaryProduct';
import { MIGRATIONS, openDatabase } from '../src/db';
import {
  createDevice,
  ensureSyncStoreState,
  getActiveBasePackageUnit,
  getInventoryBalanceByStoreProduct,
  getInventoryBatchGroupBalanceBigInt,
} from '../src/db/repositories';
import { openIsolatedDatabase } from '../src/db/testing';
import { completeSale } from '../src/sales/completeSale';
import { recordPurchase } from '../src/purchases/recordPurchase';
import { provisionStoreContext } from '../src/storeContext/provisionStoreContext';
import { applySyncPullPage } from '../src/sync/applier';
import {
  deterministicIds,
  openCatalogueFixture,
  syncReferenceContextFor,
  testId,
  type CatalogueFixture,
} from './catalogueSupport';

const NOW = '2026-09-28T08:00:00.000Z';

function pullChanges(
  receiver: CatalogueFixture,
  changes: ReturnType<typeof makeChange>[],
  nextRevision: number,
) {
  return applySyncPullPage(receiver.adapter, {
    protocolVersion: 1,
    payloadVersion: 1,
    changes,
    nextCursor: { revision: nextRevision, changeIndex: 0 },
    hasMore: false,
    serverRevision: nextRevision,
  }, {
    storeId: receiver.context.store.id,
    referenceContext: syncReferenceContextFor(receiver, nextRevision),
    options: { now: NOW, conflictIdFactory: () => testId(5100) },
  });
}

function makeChange(outbox: {
  operationId: string;
  storeId: string;
  entityType: string;
  entityId: string;
  operationType: string;
  createdAt: string;
  payload: string;
}, serverRevision: number) {
  return {
    operationId: outbox.operationId,
    storeId: outbox.storeId,
    entityType: outbox.entityType as 'PURCHASE' | 'SALE',
    entityId: outbox.entityId,
    operationType: outbox.operationType as 'COMPLETED_PURCHASE_CREATED' | 'COMPLETED_SALE_CREATED',
    changeType: 'UPSERT' as const,
    payloadVersion: 1 as const,
    payload: JSON.parse(outbox.payload),
    entityVersion: 1,
    serverRevision,
    occurredAt: outbox.createdAt,
  };
}

function readCostState(adapter: CatalogueFixture['adapter'], storeProductId: string) {
  return adapter.getFirstRow<{
    coverage_status: string;
    quantity_costed_base_micros: number;
    average_unit_cost_numerator: string | null;
    average_unit_cost_denominator: string | null;
    remaining_value_numerator: string;
    remaining_value_denominator: string;
  }>(
    `SELECT coverage_status, quantity_costed_base_micros, average_unit_cost_numerator,
            average_unit_cost_denominator, remaining_value_numerator, remaining_value_denominator
     FROM store_product_cost_states WHERE store_product_id = ?;`,
    [storeProductId],
  );
}

function readSaleSnapshots(adapter: CatalogueFixture['adapter']) {
  return adapter.getAllRows<{
    sale_item_id: string;
    coverage_status: string;
    cogs_numerator: string | null;
    cogs_denominator: string | null;
    cogs_amount_minor: number | null;
  }>(
    `SELECT sale_item_id, coverage_status, cogs_numerator, cogs_denominator, cogs_amount_minor
     FROM sale_item_cost_snapshots ORDER BY sale_item_id ASC;`,
  );
}

describe('M7 concurrent-device costing', () => {
  it('preserves existing cost movements when upgrading the local order constraint', () => {
    const isolated = openIsolatedDatabase(MIGRATIONS.slice(0, -1));
    try {
      const context = provisionStoreContext(isolated.adapter, {
        ownerDisplayName: 'Test Owner',
        storeName: 'Test Store',
        currencyCode: 'NGN',
        countryCode: 'NG',
        timezone: 'Africa/Lagos',
        appVersion: '0.0.1',
      }, { generateId: deterministicIds(6000) });
      const product = createTemporaryProduct(isolated.adapter, {
        storeId: context.store.id,
        deviceId: context.device.id,
        name: 'Rice',
      }, { generateId: deterministicIds(6100) });
      const packageUnit = getActiveBasePackageUnit(isolated.adapter, product.variant.id);
      if (!packageUnit) throw new Error('Test product has no active base package unit.');
      const purchase = recordPurchase(isolated.adapter, {
        storeId: context.store.id,
        deviceId: context.device.id,
        userId: context.owner.id,
        occurredAt: NOW,
        lines: [{
          storeProductId: product.storeProduct.id,
          packageUnitId: packageUnit.id,
          quantityPackagesMicros: MICROS_PER_UNIT,
          enteredCostMinor: 100,
        }],
      }, { generateId: deterministicIds(6200), operationId: testId(6300) });

      openDatabase(isolated.adapter, MIGRATIONS);

      const movement = isolated.adapter.getFirstRow<{ id: string; application_order: number }>(
        'SELECT id, application_order FROM cost_movements WHERE id = ?;',
        [purchase.costMovements[0].id],
      );
      expect(movement).toEqual({ id: purchase.costMovements[0].id, application_order: 1 });
      const uniqueIndexes = isolated.adapter.getAllRows<{ name: string; unique: number }>(
        'PRAGMA index_list(cost_movements);',
      ).filter((index) => index.unique === 1);
      const uniqueColumnSets = uniqueIndexes.map((index) =>
        isolated.adapter.getAllRows<{ name: string }>(`PRAGMA index_info(${index.name});`)
          .map((column) => column.name)
          .join(','),
      );
      expect(uniqueColumnSets).toContain('movement_type,source_line_id');
      expect(uniqueColumnSets).not.toContain('store_product_id,application_order');
    } finally {
      isolated.closeAndDelete();
    }
  });

  it('pulls concurrent same-product sales without losing facts or copying a sender cost state', () => {
    const left = openCatalogueFixture();
    const right = openCatalogueFixture();
    try {
      const leftDevice = createDevice(left.adapter, {
        id: testId(5201),
        storeId: left.context.store.id,
        userId: left.context.owner.id,
        platform: 'ANDROID',
        deviceLabel: 'Left offline device',
        appVersion: '0.0.1',
      });
      const rightDevice = createDevice(right.adapter, {
        id: testId(5202),
        storeId: right.context.store.id,
        userId: right.context.owner.id,
        platform: 'ANDROID',
        deviceLabel: 'Right offline device',
        appVersion: '0.0.1',
      });
      createDevice(left.adapter, {
        id: rightDevice.id,
        storeId: left.context.store.id,
        userId: left.context.owner.id,
        platform: 'ANDROID',
        deviceLabel: rightDevice.deviceLabel,
        appVersion: rightDevice.appVersion,
      });
      createDevice(right.adapter, {
        id: leftDevice.id,
        storeId: right.context.store.id,
        userId: right.context.owner.id,
        platform: 'ANDROID',
        deviceLabel: leftDevice.deviceLabel,
        appVersion: leftDevice.appVersion,
      });
      const leftProduct = createTemporaryProduct(left.adapter, {
        storeId: left.context.store.id,
        deviceId: leftDevice.id,
        name: 'Rice',
      }, { generateId: deterministicIds(1000) });
      const rightProduct = createTemporaryProduct(right.adapter, {
        storeId: right.context.store.id,
        deviceId: rightDevice.id,
        name: 'Rice',
      }, { generateId: deterministicIds(1000) });
      expect(rightProduct.storeProduct.id).toBe(leftProduct.storeProduct.id);

      const leftPackage = getActiveBasePackageUnit(left.adapter, leftProduct.variant.id);
      const rightPackage = getActiveBasePackageUnit(right.adapter, rightProduct.variant.id);
      if (!leftPackage || !rightPackage) throw new Error('Test product has no base package unit.');

      ensureSyncStoreState(left.adapter, { storeId: left.context.store.id, deviceId: leftDevice.id, now: NOW });
      ensureSyncStoreState(right.adapter, { storeId: right.context.store.id, deviceId: rightDevice.id, now: NOW });

      const baseline = recordPurchase(left.adapter, {
        storeId: left.context.store.id,
        deviceId: leftDevice.id,
        userId: left.context.owner.id,
        occurredAt: NOW,
        lines: [{
          storeProductId: leftProduct.storeProduct.id,
          packageUnitId: leftPackage.id,
          quantityPackagesMicros: 5 * MICROS_PER_UNIT,
          enteredCostMinor: 500,
        }],
      }, { generateId: deterministicIds(1100), operationId: testId(1900) });
      const baselineChange = makeChange(baseline.outbox, 1);
      expect(pullChanges(left, [baselineChange], 1).echoes).toBe(1);
      expect(pullChanges(right, [baselineChange], 1).applied).toBe(1);

      const leftSale = completeSale(left.adapter, {
        storeId: left.context.store.id,
        deviceId: leftDevice.id,
        userId: left.context.owner.id,
        lines: [{
          storeProductId: leftProduct.storeProduct.id,
          packageUnitId: leftPackage.id,
          quantityPackagesMicros: MICROS_PER_UNIT,
          unitPriceMinor: 200,
        }],
        payment: { method: 'CASH' },
      }, { generateId: deterministicIds(1200), operationId: testId(2000) });
      const rightSale = completeSale(right.adapter, {
        storeId: right.context.store.id,
        deviceId: rightDevice.id,
        userId: right.context.owner.id,
        lines: [{
          storeProductId: rightProduct.storeProduct.id,
          packageUnitId: rightPackage.id,
          quantityPackagesMicros: 2 * MICROS_PER_UNIT,
          unitPriceMinor: 200,
        }],
        payment: { method: 'CASH' },
      }, { generateId: deterministicIds(2200), operationId: testId(3000) });

      const leftSnapshotBeforePull = readSaleSnapshots(left.adapter);
      const rightSnapshotBeforePull = readSaleSnapshots(right.adapter);
      expect(leftSnapshotBeforePull).toHaveLength(1);
      expect(rightSnapshotBeforePull).toHaveLength(1);
      expect(readCostState(left.adapter, leftProduct.storeProduct.id)?.quantity_costed_base_micros)
        .toBe(4 * MICROS_PER_UNIT);
      expect(readCostState(right.adapter, rightProduct.storeProduct.id)?.quantity_costed_base_micros)
        .toBe(3 * MICROS_PER_UNIT);

      const concurrentChanges = [
        makeChange(leftSale.outbox, 2),
        makeChange(rightSale.outbox, 3),
      ];
      expect(pullChanges(left, concurrentChanges, 3)).toMatchObject({
        applied: 1,
        echoes: 1,
        cursorRevision: 3,
      });
      expect(pullChanges(right, concurrentChanges, 3)).toMatchObject({
        applied: 1,
        echoes: 1,
        cursorRevision: 3,
      });

      for (const fixture of [left, right]) {
        expect(fixture.adapter.getFirstRow<{ total: number }>('SELECT COUNT(*) AS total FROM sales;')?.total).toBe(2);
        expect(fixture.adapter.getFirstRow<{ total: number }>('SELECT COUNT(*) AS total FROM cost_movements;')?.total).toBe(3);
        expect(fixture.adapter.getFirstRow<{ total: number }>('SELECT COUNT(*) AS total FROM sale_item_cost_snapshots;')?.total).toBe(2);
        expect(fixture.adapter.getFirstRow<{ total: number }>('SELECT COUNT(*) AS total FROM batch_inventory_operations;')?.total).toBe(3);
        expect(getInventoryBalanceByStoreProduct(fixture.adapter, leftProduct.storeProduct.id))
          .toBe(2 * MICROS_PER_UNIT);
        expect(getInventoryBatchGroupBalanceBigInt(fixture.adapter, baseline.batchGroups[0].id))
          .toBe(2n * BigInt(MICROS_PER_UNIT));
        expect(fixture.adapter.getAllRows<{ id: string; local_application_order: number }>(
          `SELECT id, local_application_order FROM batch_inventory_operations
           WHERE source_type = 'SALE' ORDER BY local_application_order ASC, id ASC;`,
        )).toEqual([
          { id: leftSale.batchOperations[0].id, local_application_order: 2 },
          { id: rightSale.batchOperations[0].id, local_application_order: 2 },
        ].sort((a, b) => a.id.localeCompare(b.id)));
        expect(fixture.adapter.getFirstRow<{ cursor_revision: number }>(
          'SELECT cursor_revision FROM sync_store_state WHERE store_id = ?;',
          [fixture.context.store.id],
        )?.cursor_revision).toBe(3);
        expect(readCostState(fixture.adapter, leftProduct.storeProduct.id)).toEqual({
          coverage_status: 'KNOWN',
          quantity_costed_base_micros: 2 * MICROS_PER_UNIT,
          average_unit_cost_numerator: '100',
          average_unit_cost_denominator: '1',
          remaining_value_numerator: '200',
          remaining_value_denominator: '1',
        });
      }

      expect(readSaleSnapshots(left.adapter)).toEqual([
        ...leftSnapshotBeforePull,
        ...rightSnapshotBeforePull,
      ].sort((a, b) => a.sale_item_id.localeCompare(b.sale_item_id)));
      expect(readSaleSnapshots(right.adapter)).toEqual(readSaleSnapshots(left.adapter));
    } finally {
      left.closeAndDelete();
      right.closeAndDelete();
    }
  });
});
