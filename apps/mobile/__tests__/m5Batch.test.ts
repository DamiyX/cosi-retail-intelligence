import { MICROS_PER_UNIT } from '@retail/domain';

import { createCatalogueClient } from '../src/catalogue/client';
import { CURRENT_SCHEMA_VERSION, MIGRATIONS, openDatabase } from '../src/db';
import { openIsolatedDatabase } from '../src/db/testing';
import { getBatchProjectionForStoreProduct } from '../src/inventory/batchAllocation';
import {
  createInventoryEvent,
  getInventoryBatchGroupBalanceBigInt,
  getInventoryBalanceBigIntByStoreProduct,
  getUnknownBatchResidualBigInt,
  listBatchInventoryEntriesByStoreProduct,
  listInventoryBatchGroupsByStoreProduct,
} from '../src/db/repositories';
import { createDatabasePurchasesClient } from '../src/purchases/client';
import { recordPurchase } from '../src/purchases/recordPurchase';
import { completeSale } from '../src/sales/completeSale';
import { countRows, deterministicIds, FailOnWriteAdapter, openCatalogueFixture, reopenDatabase, testId } from './catalogueSupport';
import { provisionStoreContext } from '../src/storeContext/provisionStoreContext';

const BATCH_GRAPH_TABLES = ['purchases', 'purchase_items', 'sales', 'sale_items', 'inventory_events', 'cost_movements', 'store_product_cost_states', 'inventory_batch_groups', 'batch_inventory_operations', 'batch_inventory_entries', 'outbox_operations'];

function batchGraphCounts(adapter: Parameters<typeof countRows>[0]): number[] {
  return BATCH_GRAPH_TABLES.map((table) => countRows(adapter, table));
}

function openBatchFixture() {
  const fixture = openCatalogueFixture();
  const catalogue = createCatalogueClient(
    fixture.adapter,
    fixture.context.store,
    fixture.context.device,
    deterministicIds(2000),
  );
  catalogue.createTemporaryProduct({ name: 'Rice' });
  const client = createDatabasePurchasesClient(fixture.adapter, {
    storeId: fixture.context.store.id,
    deviceId: fixture.context.device.id,
    userId: fixture.context.owner.id,
    generateId: deterministicIds(3000),
  });
  return { fixture, client };
}

describe('M5 batch inventory tracking', () => {
  it('creates receipt groups and consumes the oldest dated group before the newer group', () => {
    const { fixture, client } = openBatchFixture();
    try {
      const rice = client.searchProducts('Rice')[0];
      const first = client.recordPurchase({
        lines: [{
          storeProductId: rice.storeProductId,
          packageUnitId: rice.preferredPackage!.id,
          quantityPackagesMicros: 20 * MICROS_PER_UNIT,
          enteredCostMinor: 200,
          expiryPrecision: 'DAY',
          expiryValue: '2026-10-20',
          expiryMeaning: 'EXPIRY',
          printedBatchNumber: 'OCT-20',
        }],
        operationId: testId(3010),
      });
      const second = client.recordPurchase({
        lines: [{
          storeProductId: rice.storeProductId,
          packageUnitId: rice.preferredPackage!.id,
          quantityPackagesMicros: 30 * MICROS_PER_UNIT,
          enteredCostMinor: 360,
          expiryPrecision: 'MONTH',
          expiryValue: '2027-01',
          expiryMeaning: 'BEST_BEFORE',
        }],
        operationId: testId(3020),
      });

      const sale = completeSale(fixture.adapter, {
        storeId: client.storeId,
        deviceId: client.deviceId,
        userId: client.userId,
        lines: [{
          storeProductId: rice.storeProductId,
          packageUnitId: rice.preferredPackage!.id,
          quantityPackagesMicros: 25 * MICROS_PER_UNIT,
          unitPriceMinor: 20,
        }],
        payment: { method: 'CASH' },
      }, { generateId: deterministicIds(3030), operationId: testId(3040) });

      const groups = listInventoryBatchGroupsByStoreProduct(fixture.adapter, rice.storeProductId);
      expect(groups.map((group) => ({ purchaseItemId: group.purchaseItemId, precision: group.datePrecision, value: group.dateValue }))).toEqual([
        { purchaseItemId: first.items[0].id, precision: 'DAY', value: '2026-10-20' },
        { purchaseItemId: second.items[0].id, precision: 'MONTH', value: '2027-01' },
      ]);
      expect(sale.batchEntries.map((entry) => ({ type: entry.entryType, delta: entry.deltaBaseMicros }))).toEqual([
        { type: 'ASSUMED_FEFO', delta: -20 * MICROS_PER_UNIT },
        { type: 'ASSUMED_FEFO', delta: -5 * MICROS_PER_UNIT },
      ]);
      expect(getInventoryBatchGroupBalanceBigInt(fixture.adapter, groups[0].id)).toBe(0n);
      expect(getInventoryBatchGroupBalanceBigInt(fixture.adapter, groups[1].id)).toBe(25n * BigInt(MICROS_PER_UNIT));
      expect(getUnknownBatchResidualBigInt(fixture.adapter, rice.storeProductId)).toBe(0n);
      expect(getBatchProjectionForStoreProduct(fixture.adapter, rice.storeProductId)).toMatchObject({
        unknownResidualBaseMicros: '0',
        inventoryBalanceBaseMicros: String(25 * MICROS_PER_UNIT),
      });
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('records a prior negative balance as a deficit offset instead of assigning it to the new group', () => {
    const { fixture, client } = openBatchFixture();
    try {
      const rice = client.searchProducts('Rice')[0];
      const sale = completeSale(fixture.adapter, {
        storeId: client.storeId,
        deviceId: client.deviceId,
        userId: client.userId,
        lines: [{
          storeProductId: rice.storeProductId,
          packageUnitId: rice.preferredPackage!.id,
          quantityPackagesMicros: 3 * MICROS_PER_UNIT,
          unitPriceMinor: 20,
        }],
        payment: { method: 'CASH' },
      }, { generateId: deterministicIds(3110), operationId: testId(3120) });
      expect(sale.batchEntries).toHaveLength(1);
      expect(sale.batchEntries[0]).toMatchObject({ entryType: 'UNKNOWN_RESIDUAL', deltaBaseMicros: -3 * MICROS_PER_UNIT });

      const purchase = client.recordPurchase({
        lines: [{
          storeProductId: rice.storeProductId,
          packageUnitId: rice.preferredPackage!.id,
          quantityPackagesMicros: 5 * MICROS_PER_UNIT,
          enteredCostMinor: 500,
          expiryPrecision: 'DAY',
          expiryValue: '2026-11-02',
          expiryMeaning: 'EXPIRY',
        }],
        operationId: testId(3130),
      });
      expect(purchase.batchEntries.map((entry) => ({ type: entry.entryType, delta: entry.deltaBaseMicros }))).toEqual([
        { type: 'DEFICIT_OFFSET', delta: 3 * MICROS_PER_UNIT },
        { type: 'RECEIPT', delta: 2 * MICROS_PER_UNIT },
      ]);
      expect(getUnknownBatchResidualBigInt(fixture.adapter, rice.storeProductId)).toBe(0n);
      const projection = getBatchProjectionForStoreProduct(fixture.adapter, rice.storeProductId);
      expect(projection.groups[0].balanceBaseMicros).toBe(String(2 * MICROS_PER_UNIT));
      expect(projection.inventoryBalanceBaseMicros).toBe(String(2 * MICROS_PER_UNIT));
      expect(listBatchInventoryEntriesByStoreProduct(fixture.adapter, rice.storeProductId)).toHaveLength(3);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('uses receipt order for equal dates and leaves undated stock as the final FEFO fallback', () => {
    const { fixture, client } = openBatchFixture();
    try {
      const rice = client.searchProducts('Rice')[0];
      const lines = [
        { expiryPrecision: 'DAY' as const, expiryValue: '2026-10-20', expiryMeaning: 'EXPIRY' as const },
        { expiryPrecision: 'DAY' as const, expiryValue: '2026-10-20', expiryMeaning: 'EXPIRY' as const },
        { expiryPrecision: 'UNKNOWN' as const, expiryValue: null, expiryMeaning: 'UNSPECIFIED' as const },
      ];
      lines.forEach((date, index) => {
        client.recordPurchase({
          lines: [{
            storeProductId: rice.storeProductId,
            packageUnitId: rice.preferredPackage!.id,
            quantityPackagesMicros: MICROS_PER_UNIT,
            enteredCostMinor: 100,
            ...date,
          }],
          operationId: testId(3050 + index),
        });
      });
      const sale = completeSale(fixture.adapter, {
        storeId: client.storeId,
        deviceId: client.deviceId,
        userId: client.userId,
        lines: [{
          storeProductId: rice.storeProductId,
          packageUnitId: rice.preferredPackage!.id,
          quantityPackagesMicros: 2 * MICROS_PER_UNIT + MICROS_PER_UNIT / 2,
          unitPriceMinor: 20,
        }],
        payment: { method: 'CASH' },
      }, { generateId: deterministicIds(3060), operationId: testId(3070) });
      expect(sale.batchEntries.map((entry) => ({ type: entry.entryType, delta: entry.deltaBaseMicros }))).toEqual([
        { type: 'ASSUMED_FEFO', delta: -MICROS_PER_UNIT },
        { type: 'ASSUMED_FEFO', delta: -MICROS_PER_UNIT },
        { type: 'ASSUMED_FEFO', delta: -(MICROS_PER_UNIT / 2) },
      ]);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('preserves receipt facts in the outbox and survives replay and database reopen', () => {
    const { fixture, client } = openBatchFixture();
    let reopened: ReturnType<typeof reopenDatabase> | null = null;
    try {
      const rice = client.searchProducts('Rice')[0];
      const operationId = testId(3210);
      const purchase = client.recordPurchase({
        lines: [{
          storeProductId: rice.storeProductId,
          packageUnitId: rice.preferredPackage!.id,
          quantityPackagesMicros: MICROS_PER_UNIT,
          enteredCostMinor: 250,
          expiryPrecision: 'MONTH',
          expiryValue: '2026-12',
          expiryMeaning: 'BEST_BEFORE',
          printedBatchNumber: 'DEC-26',
        }],
        operationId,
      });
      const payload = JSON.parse(purchase.outbox.payload) as {
        entities: {
          batchTrackingVersion: number;
          batchGroups: { datePrecision: string; dateValue: string | null; dateMeaning: string; printedBatchNumber: string | null }[];
        };
      };
      expect(payload.entities.batchTrackingVersion).toBe(1);
      expect(payload.entities.batchGroups).toEqual([
        expect.objectContaining({ datePrecision: 'MONTH', dateValue: '2026-12', dateMeaning: 'BEST_BEFORE', printedBatchNumber: 'DEC-26' }),
      ]);

      const replay = client.recordPurchase({
        lines: [{
          storeProductId: rice.storeProductId,
          packageUnitId: rice.preferredPackage!.id,
          quantityPackagesMicros: MICROS_PER_UNIT,
          enteredCostMinor: 250,
          expiryPrecision: 'MONTH',
          expiryValue: '2026-12',
          expiryMeaning: 'BEST_BEFORE',
          printedBatchNumber: 'DEC-26',
        }],
        operationId,
      });
      expect(replay.purchase.id).toBe(purchase.purchase.id);
      expect(listInventoryBatchGroupsByStoreProduct(fixture.adapter, rice.storeProductId)).toHaveLength(1);

      fixture.adapter.close();
      reopened = reopenDatabase(fixture.path);
      const reopenedGroup = reopened.getFirstRow<{ date_precision: string; date_value: string; date_meaning: string; printed_batch_number: string }>(
        'SELECT date_precision, date_value, date_meaning, printed_batch_number FROM inventory_batch_groups WHERE purchase_item_id = ?;',
        [purchase.items[0].id],
      );
      expect(reopenedGroup).toEqual({ date_precision: 'MONTH', date_value: '2026-12', date_meaning: 'BEST_BEFORE', printed_batch_number: 'DEC-26' });
    } finally {
      reopened?.close();
      fixture.closeAndDelete();
    }
  });

  it('rolls back every purchase and sale write boundary, including batch rows', () => {
    const probe = openBatchFixture();
    let purchaseWriteCount = 0;
    try {
      const rice = probe.client.searchProducts('Rice')[0];
      const adapter = new FailOnWriteAdapter(probe.fixture.adapter, Number.MAX_SAFE_INTEGER, new Error('probe failure'));
      recordPurchase(adapter, {
        storeId: probe.client.storeId,
        deviceId: probe.client.deviceId,
        userId: probe.client.userId,
        lines: [{
          storeProductId: rice.storeProductId,
          packageUnitId: rice.preferredPackage!.id,
          quantityPackagesMicros: MICROS_PER_UNIT,
          enteredCostMinor: 100,
        }],
      }, { generateId: deterministicIds(3700), operationId: testId(3710) });
      purchaseWriteCount = adapter.writeCount;
    } finally {
      probe.fixture.closeAndDelete();
    }
    expect(purchaseWriteCount).toBeGreaterThan(0);

    for (let failOnWrite = 1; failOnWrite <= purchaseWriteCount; failOnWrite += 1) {
      const fixture = openBatchFixture();
      try {
        const rice = fixture.client.searchProducts('Rice')[0];
        const before = batchGraphCounts(fixture.fixture.adapter);
        const failingAdapter = new FailOnWriteAdapter(fixture.fixture.adapter, failOnWrite, new Error(`purchase boundary ${failOnWrite}`));
        expect(() => recordPurchase(failingAdapter, {
          storeId: fixture.client.storeId,
          deviceId: fixture.client.deviceId,
          userId: fixture.client.userId,
          lines: [{
            storeProductId: rice.storeProductId,
            packageUnitId: rice.preferredPackage!.id,
            quantityPackagesMicros: MICROS_PER_UNIT,
            enteredCostMinor: 100,
          }],
        }, { generateId: deterministicIds(3720), operationId: testId(3730) })).toThrow(`purchase boundary ${failOnWrite}`);
        expect(batchGraphCounts(fixture.fixture.adapter)).toEqual(before);
      } finally {
        fixture.fixture.closeAndDelete();
      }
    }

    const saleProbe = openBatchFixture();
    let saleWriteCount = 0;
    try {
      const rice = saleProbe.client.searchProducts('Rice')[0];
      saleProbe.client.recordPurchase({
        lines: [{ storeProductId: rice.storeProductId, packageUnitId: rice.preferredPackage!.id, quantityPackagesMicros: MICROS_PER_UNIT, enteredCostMinor: 100 }],
        operationId: testId(3740),
      });
      const adapter = new FailOnWriteAdapter(saleProbe.fixture.adapter, Number.MAX_SAFE_INTEGER, new Error('probe failure'));
      completeSale(adapter, {
        storeId: saleProbe.client.storeId,
        deviceId: saleProbe.client.deviceId,
        userId: saleProbe.client.userId,
        lines: [{ storeProductId: rice.storeProductId, packageUnitId: rice.preferredPackage!.id, quantityPackagesMicros: MICROS_PER_UNIT, unitPriceMinor: 20 }],
        payment: { method: 'CASH' },
      }, { generateId: deterministicIds(3750), operationId: testId(3760) });
      saleWriteCount = adapter.writeCount;
    } finally {
      saleProbe.fixture.closeAndDelete();
    }
    expect(saleWriteCount).toBeGreaterThan(0);

    for (let failOnWrite = 1; failOnWrite <= saleWriteCount; failOnWrite += 1) {
      const fixture = openBatchFixture();
      try {
        const rice = fixture.client.searchProducts('Rice')[0];
        fixture.client.recordPurchase({
          lines: [{ storeProductId: rice.storeProductId, packageUnitId: rice.preferredPackage!.id, quantityPackagesMicros: MICROS_PER_UNIT, enteredCostMinor: 100 }],
          operationId: testId(3770),
        });
        const before = batchGraphCounts(fixture.fixture.adapter);
        const failingAdapter = new FailOnWriteAdapter(fixture.fixture.adapter, failOnWrite, new Error(`sale boundary ${failOnWrite}`));
        expect(() => completeSale(failingAdapter, {
          storeId: fixture.client.storeId,
          deviceId: fixture.client.deviceId,
          userId: fixture.client.userId,
          lines: [{ storeProductId: rice.storeProductId, packageUnitId: rice.preferredPackage!.id, quantityPackagesMicros: MICROS_PER_UNIT, unitPriceMinor: 20 }],
          payment: { method: 'CASH' },
        }, { generateId: deterministicIds(3780), operationId: testId(3790) })).toThrow(`sale boundary ${failOnWrite}`);
        expect(batchGraphCounts(fixture.fixture.adapter)).toEqual(before);
      } finally {
        fixture.fixture.closeAndDelete();
      }
    }
  });

  it('rejects mutation of immutable receipt facts', () => {
    const { fixture, client } = openBatchFixture();
    try {
      const rice = client.searchProducts('Rice')[0];
      const purchase = client.recordPurchase({
        lines: [{
          storeProductId: rice.storeProductId,
          packageUnitId: rice.preferredPackage!.id,
          quantityPackagesMicros: MICROS_PER_UNIT,
          enteredCostMinor: 250,
          expiryPrecision: 'DAY',
          expiryValue: '2026-10-20',
          expiryMeaning: 'EXPIRY',
        }],
        operationId: testId(3310),
      });
      const groupId = purchase.batchGroups[0].id;
      expect(() => fixture.adapter.run('UPDATE inventory_batch_groups SET date_value = ? WHERE id = ?;', ['2026-10-21', groupId])).toThrow();
      expect(() => fixture.adapter.run('DELETE FROM inventory_batch_groups WHERE id = ?;', [groupId])).toThrow();
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('upgrades a v6 ledger without rewriting positive, zero, negative, or overflow history', () => {
    const fixture = openIsolatedDatabase(MIGRATIONS.slice(0, 6));
    let reopened: ReturnType<typeof reopenDatabase> | null = null;
    try {
      const context = provisionStoreContext(
        fixture.adapter,
        {
          ownerDisplayName: 'Legacy owner',
          storeName: 'Legacy store',
          currencyCode: 'NGN',
          countryCode: 'NG',
          timezone: 'Africa/Lagos',
          deviceLabel: 'Legacy phone',
          appVersion: '0.0.1',
        },
        { generateId: deterministicIds(3400) },
      );
      const catalogue = createCatalogueClient(fixture.adapter, context.store, context.device, deterministicIds(3500));
      const rice = catalogue.createTemporaryProduct({ name: 'Rice' });
      const beans = catalogue.createTemporaryProduct({ name: 'Beans' });
      const legacyValues = [Number.MAX_SAFE_INTEGER, 1, -3, 5];
      legacyValues.forEach((quantityBaseDeltaMicros, index) => {
        createInventoryEvent(fixture.adapter, {
          id: testId(3510 + index),
          storeId: context.store.id,
          storeProductId: rice.storeProduct.id,
          eventType: 'CORRECTION',
          quantityBaseDeltaMicros,
          sourceType: 'MANUAL_ADJUSTMENT',
          sourceId: testId(3520 + index),
          reasonCode: 'LEGACY_IMPORT',
          occurredAt: `2026-01-0${index + 1}T00:00:00.000Z`,
          createdByUserId: context.owner.id,
          deviceId: context.device.id,
        });
      });
      [1, -1].forEach((quantityBaseDeltaMicros, index) => {
        createInventoryEvent(fixture.adapter, {
          id: testId(3530 + index),
          storeId: context.store.id,
          storeProductId: beans.storeProduct.id,
          eventType: 'CORRECTION',
          quantityBaseDeltaMicros,
          sourceType: 'MANUAL_ADJUSTMENT',
          sourceId: testId(3540 + index),
          reasonCode: 'LEGACY_IMPORT',
          occurredAt: `2026-02-0${index + 1}T00:00:00.000Z`,
          createdByUserId: context.owner.id,
          deviceId: context.device.id,
        });
      });
      expect(getInventoryBalanceBigIntByStoreProduct(fixture.adapter, rice.storeProduct.id)).toBe(9007199254740994n);
      expect(getInventoryBalanceBigIntByStoreProduct(fixture.adapter, beans.storeProduct.id)).toBe(0n);

      const report = openDatabase(fixture.adapter, MIGRATIONS);
      expect(report.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
      expect(fixture.adapter.getFirstRow<{ total: number }>('SELECT COUNT(*) AS total FROM inventory_events;')?.total).toBe(6);
      expect(getInventoryBalanceBigIntByStoreProduct(fixture.adapter, rice.storeProduct.id)).toBe(9007199254740994n);
      expect(getInventoryBalanceBigIntByStoreProduct(fixture.adapter, beans.storeProduct.id)).toBe(0n);

      const client = createDatabasePurchasesClient(fixture.adapter, {
        storeId: context.store.id,
        deviceId: context.device.id,
        userId: context.owner.id,
        generateId: deterministicIds(3600),
      });
      const packageId = client.searchProducts('Rice')[0].preferredPackage!.id;
      const purchase = client.recordPurchase({
        lines: [{
          storeProductId: rice.storeProduct.id,
          packageUnitId: packageId,
          quantityPackagesMicros: MICROS_PER_UNIT,
          enteredCostMinor: 100,
        }],
        operationId: testId(3610),
      });
      expect(getInventoryBalanceBigIntByStoreProduct(fixture.adapter, rice.storeProduct.id)).toBe(9007199255740994n);
      const sale = completeSale(fixture.adapter, {
        storeId: context.store.id,
        deviceId: context.device.id,
        userId: context.owner.id,
        lines: [{
          storeProductId: rice.storeProduct.id,
          packageUnitId: packageId,
          quantityPackagesMicros: MICROS_PER_UNIT,
          unitPriceMinor: 20,
        }],
        payment: { method: 'CASH' },
      }, { generateId: deterministicIds(3620), operationId: testId(3630) });
      expect(sale.batchEntries[0]).toMatchObject({ entryType: 'UNKNOWN_RESIDUAL', deltaBaseMicros: -MICROS_PER_UNIT });
      expect(purchase.batchGroups[0].datePrecision).toBe('UNKNOWN');

      fixture.adapter.close();
      reopened = reopenDatabase(fixture.path);
      expect(getInventoryBalanceBigIntByStoreProduct(reopened, rice.storeProduct.id)).toBe(9007199254740994n);
    } finally {
      reopened?.close();
      fixture.closeAndDelete();
    }
  });
});
