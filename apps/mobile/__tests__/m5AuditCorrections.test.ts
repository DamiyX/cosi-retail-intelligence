import { MICROS_PER_UNIT } from '@retail/domain';

import { createCatalogueClient } from '../src/catalogue/client';
import { CURRENT_SCHEMA_VERSION, MIGRATIONS, openDatabase } from '../src/db';
import type { DatabaseAdapter } from '../src/db/adapter';
import { openIsolatedDatabase } from '../src/db/testing';
import {
  createBatchInventoryEntry,
  createBatchInventoryInspection,
  createBatchInventoryOperation,
  createInventoryEvent,
  finalizeBatchInventoryOperation,
  getInventoryLedgerWatermark,
  getBatchInventoryOperationById,
} from '../src/db/repositories';
import { classifyInventoryBatches } from '../src/inventory/classifyBatches';
import { getBatchProjectionForStoreProduct } from '../src/inventory/batchAllocation';
import { recordInventoryAdjustment } from '../src/inventory/adjustInventory';
import { createDatabaseInventoryClient } from '../src/inventory/client';
import { completeSale } from '../src/sales/completeSale';
import { recordPurchase } from '../src/purchases/recordPurchase';
import { FailOnWriteAdapter, deterministicIds, openCatalogueFixture, testId } from './catalogueSupport';
import { provisionStoreContext } from '../src/storeContext/provisionStoreContext';

describe('M5 A01 batch graph sealing', () => {
  it('seals completed graphs, retains inspection evidence, and rejects raw and typed appends', () => {
    const fixture = openCatalogueFixture();
    try {
      const catalogue = createCatalogueClient(fixture.adapter, fixture.context.store, fixture.context.device, deterministicIds(8000));
      const rice = catalogue.createTemporaryProduct({ name: 'Rice' });
      const purchase = recordPurchase(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        lines: [{
          storeProductId: rice.storeProduct.id,
          packageUnitId: rice.basePackage.id,
          quantityPackagesMicros: 2 * MICROS_PER_UNIT,
          enteredCostMinor: 200,
        }],
      }, { generateId: deterministicIds(8010), operationId: testId(8020) });
      const operation = getBatchInventoryOperationById(fixture.adapter, purchase.batchOperations[0].id);
      expect(operation?.sealedAt).not.toBeNull();
      expect(operation?.sealedEntryCount).toBe(purchase.batchEntries.length);
      expect(operation?.sealedDeltaBaseMicros).toBe(String(2 * MICROS_PER_UNIT));

      const entry = purchase.batchEntries[0];
      expect(() => fixture.adapter.run(
        `INSERT INTO batch_inventory_entries
          (id, operation_id, store_id, store_product_id, group_id, entry_type, delta_base_micros, entry_order, created_at)
         SELECT ?, operation_id, store_id, store_product_id, NULL, 'UNKNOWN_RESIDUAL', 1, 99, created_at
         FROM batch_inventory_entries WHERE id = ?;`,
        [testId(8030), entry.id],
      )).toThrow('sealed batch inventory operations');
      expect(() => createBatchInventoryEntry(fixture.adapter, {
        id: testId(8040),
        operationId: entry.operationId,
        storeId: fixture.context.store.id,
        storeProductId: rice.storeProduct.id,
        groupId: null,
        entryType: 'UNKNOWN_RESIDUAL',
        deltaBaseMicros: 1,
        entryOrder: 99,
      })).toThrow('sealed batch inventory operations');
      expect(fixture.adapter.getFirstRow<{ total: number }>(
        'SELECT COUNT(*) AS total FROM batch_inventory_entries WHERE operation_id = ?;',
        [entry.operationId],
      )?.total).toBe(purchase.batchEntries.length);

      createInventoryEvent(fixture.adapter, {
        id: testId(8050),
        storeId: fixture.context.store.id,
        storeProductId: rice.storeProduct.id,
        eventType: 'OPENING_BALANCE',
        quantityBaseDeltaMicros: 3 * MICROS_PER_UNIT,
        sourceType: 'OPENING_BALANCE',
        sourceId: testId(8051),
        occurredAt: '2026-09-18T08:00:00.000Z',
        createdByUserId: fixture.context.owner.id,
        deviceId: fixture.context.device.id,
      });
      const classification = classifyInventoryBatches(fixture.adapter, {
        operationId: testId(8060),
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        storeProductId: rice.storeProduct.id,
        expectedInventoryWatermark: getInventoryLedgerWatermark(fixture.adapter, rice.storeProduct.id),
        expectedBatchWatermark: classificationWatermark(fixture.adapter, rice.storeProduct.id),
        groups: [{ quantityBaseMicros: 3 * MICROS_PER_UNIT, datePrecision: 'DAY', dateValue: '2026-10-20', dateMeaning: 'EXPIRY' }],
      }, { generateId: deterministicIds(8070) });
      expect(classification.inspection).toMatchObject({ operationId: classification.operation.id });
      expect(fixture.adapter.getFirstRow<{ request_json: string; evidence_json: string }>(
        'SELECT request_json, evidence_json FROM batch_inventory_inspections WHERE operation_id = ?;',
        [classification.operation.id],
      )).toEqual(expect.objectContaining({ request_json: expect.stringContaining('expectedInventoryWatermark'), evidence_json: expect.stringContaining('requestedBaseMicros') }));
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('rejects incomplete, wrong-source, and wrong-sum graphs before sealing', () => {
    const fixture = openCatalogueFixture();
    try {
      const catalogue = createCatalogueClient(fixture.adapter, fixture.context.store, fixture.context.device, deterministicIds(8100));
      const rice = catalogue.createTemporaryProduct({ name: 'Rice' });
      const purchase = recordPurchase(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        lines: [{ storeProductId: rice.storeProduct.id, packageUnitId: rice.basePackage.id, quantityPackagesMicros: MICROS_PER_UNIT, enteredCostMinor: 100 }],
      }, { generateId: deterministicIds(8110), operationId: testId(8120) });
      const event = purchase.inventoryEvents[0];
      const incompleteId = testId(8130);
      const incomplete = createBatchInventoryOperation(fixture.adapter, {
        id: incompleteId,
        storeId: fixture.context.store.id,
        storeProductId: rice.storeProduct.id,
        kind: 'CLASSIFICATION',
        sourceType: 'PHYSICAL_INSPECTION',
        sourceId: incompleteId,
        policyVersion: 'TEST',
        evidenceVersion: 'TEST',
        recordedByStoreMemberId: fixture.context.membership.id,
        recordedByUserId: fixture.context.owner.id,
        deviceId: fixture.context.device.id,
      });
      expect(() => finalizeBatchInventoryOperation(fixture.adapter, incomplete.id)).toThrow('without entries');

      expect(() => createBatchInventoryOperation(fixture.adapter, {
        id: testId(8140),
        storeId: fixture.context.store.id,
        storeProductId: rice.storeProduct.id,
        kind: 'EVENT_ALLOCATION',
        inventoryEventId: event.id,
        sourceType: 'MANUAL_ADJUSTMENT',
        sourceId: event.id,
        policyVersion: 'TEST',
        evidenceVersion: 'TEST',
        recordedByStoreMemberId: fixture.context.membership.id,
        recordedByUserId: fixture.context.owner.id,
        deviceId: fixture.context.device.id,
      })).toThrow('batch event operation source');

      const wrongSumId = testId(8150);
      const wrongSum = createBatchInventoryOperation(fixture.adapter, {
        id: wrongSumId,
        storeId: fixture.context.store.id,
        storeProductId: rice.storeProduct.id,
        kind: 'CLASSIFICATION',
        sourceType: 'PHYSICAL_INSPECTION',
        sourceId: wrongSumId,
        policyVersion: 'TEST',
        evidenceVersion: 'TEST',
        inventoryWatermark: '1:event',
        batchWatermark: '1:batch',
        recordedByStoreMemberId: fixture.context.membership.id,
        recordedByUserId: fixture.context.owner.id,
        deviceId: fixture.context.device.id,
      });
      createBatchInventoryInspection(fixture.adapter, {
        operationId: wrongSum.id,
        storeId: fixture.context.store.id,
        storeProductId: rice.storeProduct.id,
        requestJson: '{"operationId":"wrong-sum"}',
        evidenceJson: '{"physical":1}',
        inventoryWatermark: '1:event',
        batchWatermark: '1:batch',
        recordedByStoreMemberId: fixture.context.membership.id,
        recordedByUserId: fixture.context.owner.id,
        deviceId: fixture.context.device.id,
      });
      createBatchInventoryEntry(fixture.adapter, {
        id: testId(8160),
        operationId: wrongSum.id,
        storeId: fixture.context.store.id,
        storeProductId: rice.storeProduct.id,
        groupId: null,
        entryType: 'UNKNOWN_RESIDUAL',
        deltaBaseMicros: 1,
        entryOrder: 1,
      });
      expect(() => finalizeBatchInventoryOperation(fixture.adapter, wrongSum.id)).toThrow('net-zero physical inspection');
      expect(getBatchInventoryOperationById(fixture.adapter, wrongSum.id)?.sealedAt).toBeNull();
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('upgrades a populated v11 graph without rewriting history and rolls back a failed migration', () => {
    const isolated = openIsolatedDatabase(MIGRATIONS.slice(0, 11));
    try {
      const context = provisionStoreContext(isolated.adapter, {
        ownerDisplayName: 'Upgrade owner',
        storeName: 'Upgrade store',
        currencyCode: 'NGN',
        countryCode: 'NG',
        timezone: 'Africa/Lagos',
        deviceLabel: 'Upgrade device',
        appVersion: '0.0.1',
      }, { generateId: deterministicIds(8200) });
      const catalogue = createCatalogueClient(isolated.adapter, context.store, context.device, deterministicIds(8210));
      const rice = catalogue.createTemporaryProduct({ name: 'Rice' });
      const purchase = recordPurchase(isolated.adapter, {
        storeId: context.store.id,
        deviceId: context.device.id,
        userId: context.owner.id,
        lines: [{ storeProductId: rice.storeProduct.id, packageUnitId: rice.basePackage.id, quantityPackagesMicros: MICROS_PER_UNIT, enteredCostMinor: 100 }],
      }, { generateId: deterministicIds(8220), operationId: testId(8230) });
      const beforeEventCount = isolated.adapter.getFirstRow<{ total: number }>('SELECT COUNT(*) AS total FROM inventory_events;')?.total;
      const beforeOperationId = purchase.batchOperations[0].id;
      const report = openDatabase(isolated.adapter, MIGRATIONS);
      expect(report.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
      expect(isolated.adapter.getFirstRow<{ total: number }>('SELECT COUNT(*) AS total FROM inventory_events;')?.total).toBe(beforeEventCount);
      expect(isolated.adapter.getFirstRow<{ sealed_at: string; sealed_entry_count: number }>(
        'SELECT sealed_at, sealed_entry_count FROM batch_inventory_operations WHERE id = ?;',
        [beforeOperationId],
      )).toEqual(expect.objectContaining({ sealed_at: expect.any(String), sealed_entry_count: purchase.batchEntries.length }));
    } finally {
      isolated.closeAndDelete();
    }

    const rollback = openIsolatedDatabase(MIGRATIONS.slice(0, 11));
    try {
      const failing = new FailOnWriteAdapter(rollback.adapter, 1, new Error('migration probe'));
      expect(() => openDatabase(failing, MIGRATIONS)).toThrow('Migration 12');
      expect(rollback.adapter.getFirstRow<{ total: number }>(
        "SELECT COUNT(*) AS total FROM schema_migrations WHERE version = 12;",
      )?.total).toBe(0);
      expect(rollback.adapter.getFirstRow<{ name: string }>(
        "SELECT name FROM pragma_table_info('batch_inventory_operations') WHERE name = 'sealed_at';",
      )).toBeNull();
      expect(rollback.adapter.getFirstRow<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'batch_inventory_inspections';",
      )).toBeNull();
    } finally {
      rollback.closeAndDelete();
    }
  });
});

describe('M5 A02 FEFO ordering', () => {
  it('consumes legacy unknown stock before a newer undated receipt', () => {
    const fixture = openCatalogueFixture();
    try {
      const catalogue = createCatalogueClient(fixture.adapter, fixture.context.store, fixture.context.device, deterministicIds(8300));
      const rice = catalogue.createTemporaryProduct({ name: 'Rice' });
      createInventoryEvent(fixture.adapter, {
        id: testId(8310),
        storeId: fixture.context.store.id,
        storeProductId: rice.storeProduct.id,
        eventType: 'OPENING_BALANCE',
        quantityBaseDeltaMicros: 40 * MICROS_PER_UNIT,
        sourceType: 'OPENING_BALANCE',
        sourceId: testId(8311),
        occurredAt: '2026-01-01T00:00:00.000Z',
        createdByUserId: fixture.context.owner.id,
        deviceId: fixture.context.device.id,
      });
      recordPurchase(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        lines: [{
          storeProductId: rice.storeProduct.id,
          packageUnitId: rice.basePackage.id,
          quantityPackagesMicros: 20 * MICROS_PER_UNIT,
          enteredCostMinor: 200,
          expiryPrecision: 'UNKNOWN',
          expiryMeaning: 'UNSPECIFIED',
        }],
      }, { generateId: deterministicIds(8320), operationId: testId(8330) });
      const sale = completeSale(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        lines: [{ storeProductId: rice.storeProduct.id, packageUnitId: rice.basePackage.id, quantityPackagesMicros: 5 * MICROS_PER_UNIT, unitPriceMinor: 20 }],
        payment: { method: 'CASH' },
      }, { generateId: deterministicIds(8340), operationId: testId(8350) });
      expect(sale.batchEntries).toEqual([
        expect.objectContaining({ entryType: 'UNKNOWN_RESIDUAL', groupId: null, deltaBaseMicros: -5 * MICROS_PER_UNIT }),
      ]);
    } finally {
      fixture.closeAndDelete();
    }
  });
});

describe('M5 A03 unallocated shortage composition', () => {
  it('moves named composition to unknown before a total-only shortage and rejects invalid directions', () => {
    const fixture = openCatalogueFixture();
    try {
      const catalogue = createCatalogueClient(fixture.adapter, fixture.context.store, fixture.context.device, deterministicIds(8400));
      const rice = catalogue.createTemporaryProduct({ name: 'Rice' });
      recordPurchase(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        lines: [{
          storeProductId: rice.storeProduct.id,
          packageUnitId: rice.basePackage.id,
          quantityPackagesMicros: 10 * MICROS_PER_UNIT,
          enteredCostMinor: 100,
          expiryPrecision: 'DAY',
          expiryValue: '2026-10-20',
          expiryMeaning: 'EXPIRY',
        }],
      }, { generateId: deterministicIds(8410), operationId: testId(8420) });
      const before = getBatchProjectionForStoreProduct(fixture.adapter, rice.storeProduct.id);
      const graph = recordInventoryAdjustment(fixture.adapter, {
        operationId: testId(8430),
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        reasonCode: 'MISSING',
        lines: [{
          storeProductId: rice.storeProduct.id,
          quantityBaseDeltaMicros: -5 * MICROS_PER_UNIT,
          expectedInventoryWatermark: before.inventoryWatermark,
          expectedBatchWatermark: before.batchWatermark,
        }],
      }, { generateId: deterministicIds(8440) });
      expect(graph.batchOperations.map((operation) => operation.kind)).toEqual(['ADJUSTMENT', 'EVENT_ALLOCATION']);
      expect(graph.batchEntries.filter((entry) => entry.operationId === graph.batchOperations[0].id).reduce((sum, entry) => sum + entry.deltaBaseMicros, 0)).toBe(0);
      expect(getBatchProjectionForStoreProduct(fixture.adapter, rice.storeProduct.id)).toMatchObject({
        inventoryBalanceBaseMicros: String(5 * MICROS_PER_UNIT),
        unknownResidualBaseMicros: String(5 * MICROS_PER_UNIT),
      });
      expect(getBatchProjectionForStoreProduct(fixture.adapter, rice.storeProduct.id).groups[0].balanceBaseMicros).toBe('0');

      const replay = recordInventoryAdjustment(fixture.adapter, {
        operationId: testId(8430),
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        reasonCode: 'MISSING',
        lines: [{
          storeProductId: rice.storeProduct.id,
          quantityBaseDeltaMicros: -5 * MICROS_PER_UNIT,
          expectedInventoryWatermark: before.inventoryWatermark,
          expectedBatchWatermark: before.batchWatermark,
        }],
      });
      expect(replay.batchOperations.map((operation) => operation.kind)).toEqual(['EVENT_ALLOCATION', 'ADJUSTMENT']);
      expect(replay.batchEntries).toHaveLength(graph.batchEntries.length);

      const after = getBatchProjectionForStoreProduct(fixture.adapter, rice.storeProduct.id);
      expect(() => recordInventoryAdjustment(fixture.adapter, {
        operationId: testId(8450),
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        reasonCode: 'EXPIRED',
        lines: [{
          storeProductId: rice.storeProduct.id,
          quantityBaseDeltaMicros: MICROS_PER_UNIT,
          expectedInventoryWatermark: after.inventoryWatermark,
          expectedBatchWatermark: after.batchWatermark,
        }],
      })).toThrow('can only remove stock');
    } finally {
      fixture.closeAndDelete();
    }
  });
});

describe('M5 A04 complete group counts', () => {
  it('applies an explicitly rediscovered zero-balance group', () => {
    const fixture = openCatalogueFixture();
    try {
      const catalogue = createCatalogueClient(fixture.adapter, fixture.context.store, fixture.context.device, deterministicIds(8500));
      const rice = catalogue.createTemporaryProduct({ name: 'Rice' });
      recordPurchase(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        lines: [{
          storeProductId: rice.storeProduct.id,
          packageUnitId: rice.basePackage.id,
          quantityPackagesMicros: 2 * MICROS_PER_UNIT,
          enteredCostMinor: 100,
          expiryPrecision: 'DAY',
          expiryValue: '2026-10-20',
          expiryMeaning: 'EXPIRY',
        }],
      }, { generateId: deterministicIds(8510), operationId: testId(8520) });
      completeSale(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        lines: [{ storeProductId: rice.storeProduct.id, packageUnitId: rice.basePackage.id, quantityPackagesMicros: 2 * MICROS_PER_UNIT, unitPriceMinor: 20 }],
        payment: { method: 'CASH' },
      }, { generateId: deterministicIds(8530), operationId: testId(8540) });
      const before = getBatchProjectionForStoreProduct(fixture.adapter, rice.storeProduct.id);
      const group = before.groups[0];
      expect(group.balanceBaseMicros).toBe('0');
      const client = createDatabaseInventoryClient(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        generateId: deterministicIds(8550),
      });
      const draft = client.startReconciliation(rice.storeProduct.id);
      client.submitReconciliation({
        reconciliationId: draft.reconciliationId,
        expectedInventoryWatermark: draft.inventoryWatermark,
        expectedBatchWatermark: draft.batchWatermark,
        physicalBaseUnits: MICROS_PER_UNIT,
        completeGroupCount: true,
        groupCounts: [{ groupId: group.id, physicalBaseUnits: MICROS_PER_UNIT }],
      });
      const graph = client.finalizeReconciliation({ reconciliationId: draft.reconciliationId, operationId: testId(8560) });
      expect(graph.batchOperations.filter((operation) => operation.kind === 'RECONCILIATION')).toHaveLength(1);
      const after = getBatchProjectionForStoreProduct(fixture.adapter, rice.storeProduct.id);
      expect(after.groups[0].balanceBaseMicros).toBe(String(MICROS_PER_UNIT));
      expect(after.unknownResidualBaseMicros).toBe('0');
      expect(after.inventoryBalanceBaseMicros).toBe(String(MICROS_PER_UNIT));
    } finally {
      fixture.closeAndDelete();
    }
  });
});

function classificationWatermark(adapter: DatabaseAdapter, storeProductId: string): string {
  const row = adapter.getFirstRow<{ local_application_order: number; id: string }>(
    'SELECT local_application_order, id FROM batch_inventory_operations WHERE store_product_id = ? ORDER BY local_application_order DESC, id DESC LIMIT 1;',
    [storeProductId],
  );
  return row ? `${row.local_application_order}:${row.id}` : '0:';
}
