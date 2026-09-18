import { MICROS_PER_UNIT } from '@retail/domain';

import { createCatalogueClient } from '../src/catalogue/client';
import { createInventoryEvent, createStoreMember, createUser, getCostState } from '../src/db/repositories';
import { getBatchProjectionForStoreProduct } from '../src/inventory/batchAllocation';
import { classifyInventoryBatches } from '../src/inventory/classifyBatches';
import { completeSale } from '../src/sales/completeSale';
import { countRows, deterministicIds, FailOnWriteAdapter, openCatalogueFixture, testId } from './catalogueSupport';

function seedUnknownStock() {
  const fixture = openCatalogueFixture();
  const catalogue = createCatalogueClient(fixture.adapter, fixture.context.store, fixture.context.device, deterministicIds(4000));
  const rice = catalogue.createTemporaryProduct({ name: 'Rice' });
  createInventoryEvent(fixture.adapter, {
    id: testId(4010),
    storeId: fixture.context.store.id,
    storeProductId: rice.storeProduct.id,
    eventType: 'OPENING_BALANCE',
    quantityBaseDeltaMicros: 40 * MICROS_PER_UNIT,
    sourceType: 'OPENING_BALANCE',
    sourceId: testId(4011),
    occurredAt: '2026-01-01T00:00:00.000Z',
    createdByUserId: fixture.context.owner.id,
    deviceId: fixture.context.device.id,
  });
  return { fixture, rice };
}

describe('M5 physical batch classification', () => {
  it('classifies unknown stock into dated groups without creating inventory or cost movement', () => {
    const { fixture, rice } = seedUnknownStock();
    try {
      const beforeInventory = countRows(fixture.adapter, 'inventory_events');
      const beforeMovements = countRows(fixture.adapter, 'cost_movements');
      const beforeOutbox = countRows(fixture.adapter, 'outbox_operations');
      const projection = getBatchProjectionForStoreProduct(fixture.adapter, rice.storeProduct.id);
      const graph = classifyInventoryBatches(fixture.adapter, {
        operationId: testId(4020),
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        storeProductId: rice.storeProduct.id,
        expectedInventoryWatermark: projection.inventoryWatermark,
        expectedBatchWatermark: projection.batchWatermark,
        groups: [
          { quantityBaseMicros: 10 * MICROS_PER_UNIT, datePrecision: 'DAY', dateValue: '2026-10-20', dateMeaning: 'EXPIRY' },
          { quantityBaseMicros: 30 * MICROS_PER_UNIT, datePrecision: 'MONTH', dateValue: '2027-01', dateMeaning: 'BEST_BEFORE' },
        ],
      }, { generateId: deterministicIds(4030) });
      expect(graph.operation.kind).toBe('CLASSIFICATION');
      expect(graph.entries.reduce((total, entry) => total + entry.deltaBaseMicros, 0)).toBe(0);
      expect(countRows(fixture.adapter, 'inventory_events')).toBe(beforeInventory);
      expect(countRows(fixture.adapter, 'cost_movements')).toBe(beforeMovements);
      expect(countRows(fixture.adapter, 'outbox_operations')).toBe(beforeOutbox + 1);
      expect(getCostState(fixture.adapter, rice.storeProduct.id)).toBeNull();
      expect(getBatchProjectionForStoreProduct(fixture.adapter, rice.storeProduct.id)).toMatchObject({
        inventoryBalanceBaseMicros: String(40 * MICROS_PER_UNIT),
        unknownResidualBaseMicros: '0',
      });
      expect(getBatchProjectionForStoreProduct(fixture.adapter, rice.storeProduct.id).groups.map((group) => group.balanceBaseMicros)).toEqual([
        String(10 * MICROS_PER_UNIT),
        String(30 * MICROS_PER_UNIT),
      ]);

      const replay = classifyInventoryBatches(fixture.adapter, {
        operationId: testId(4020),
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        storeProductId: rice.storeProduct.id,
        expectedInventoryWatermark: projection.inventoryWatermark,
        expectedBatchWatermark: projection.batchWatermark,
        groups: [
          { quantityBaseMicros: 10 * MICROS_PER_UNIT, datePrecision: 'DAY', dateValue: '2026-10-20', dateMeaning: 'EXPIRY' },
          { quantityBaseMicros: 30 * MICROS_PER_UNIT, datePrecision: 'MONTH', dateValue: '2027-01', dateMeaning: 'BEST_BEFORE' },
        ],
      }, { generateId: deterministicIds(4040) });
      expect(replay.operation.id).toBe(graph.operation.id);
      expect(countRows(fixture.adapter, 'inventory_batch_groups')).toBe(2);
      expect(() => classifyInventoryBatches(fixture.adapter, {
        operationId: testId(4020),
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        storeProductId: rice.storeProduct.id,
        expectedInventoryWatermark: projection.inventoryWatermark,
        expectedBatchWatermark: projection.batchWatermark,
        groups: [{ quantityBaseMicros: 40 * MICROS_PER_UNIT, datePrecision: 'DAY', dateValue: '2026-12-01', dateMeaning: 'EXPIRY' }],
      })).toThrow('different batch classification');
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('rejects stale review watermarks after an intervening sale, even when the review total is still readable', () => {
    const { fixture, rice } = seedUnknownStock();
    try {
      const projection = getBatchProjectionForStoreProduct(fixture.adapter, rice.storeProduct.id);
      completeSale(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        lines: [{ storeProductId: rice.storeProduct.id, packageUnitId: rice.basePackage.id, quantityPackagesMicros: MICROS_PER_UNIT, unitPriceMinor: 20 }],
        payment: { method: 'CASH' },
      }, { generateId: deterministicIds(4050), operationId: testId(4060) });
      expect(() => classifyInventoryBatches(fixture.adapter, {
        operationId: testId(4070),
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        storeProductId: rice.storeProduct.id,
        expectedInventoryWatermark: projection.inventoryWatermark,
        expectedBatchWatermark: projection.batchWatermark,
        groups: [{ quantityBaseMicros: 10 * MICROS_PER_UNIT, datePrecision: 'DAY', dateValue: '2026-10-20', dateMeaning: 'EXPIRY' }],
      })).toThrow('changed while this inspection was open');
      expect(countRows(fixture.adapter, 'inventory_batch_groups')).toBe(0);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('corrects a recorded breakdown by appending net-zero history and preserving old group facts', () => {
    const { fixture, rice } = seedUnknownStock();
    try {
      const initialProjection = getBatchProjectionForStoreProduct(fixture.adapter, rice.storeProduct.id);
      const first = classifyInventoryBatches(fixture.adapter, {
        operationId: testId(4120),
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        storeProductId: rice.storeProduct.id,
        expectedInventoryWatermark: initialProjection.inventoryWatermark,
        expectedBatchWatermark: initialProjection.batchWatermark,
        groups: [
          { quantityBaseMicros: 10 * MICROS_PER_UNIT, datePrecision: 'DAY', dateValue: '2026-10-20', dateMeaning: 'EXPIRY' },
          { quantityBaseMicros: 30 * MICROS_PER_UNIT, datePrecision: 'MONTH', dateValue: '2027-01', dateMeaning: 'BEST_BEFORE' },
        ],
      }, { generateId: deterministicIds(4130) });
      const before = getBatchProjectionForStoreProduct(fixture.adapter, rice.storeProduct.id);
      const corrected = classifyInventoryBatches(fixture.adapter, {
        operationId: testId(4140),
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        storeProductId: rice.storeProduct.id,
        expectedInventoryWatermark: before.inventoryWatermark,
        expectedBatchWatermark: before.batchWatermark,
        mode: 'CORRECTION',
        groups: [
          { quantityBaseMicros: 25 * MICROS_PER_UNIT, datePrecision: 'DAY', dateValue: '2026-11-01', dateMeaning: 'EXPIRY' },
          { quantityBaseMicros: 15 * MICROS_PER_UNIT, datePrecision: 'MONTH', dateValue: '2027-02', dateMeaning: 'BEST_BEFORE' },
        ],
      }, { generateId: deterministicIds(4150) });
      expect(first.groups[0]).toMatchObject({ dateValue: '2026-10-20', datePrecision: 'DAY' });
      expect(corrected.entries.reduce((total, entry) => total + entry.deltaBaseMicros, 0)).toBe(0);
      expect(countRows(fixture.adapter, 'inventory_events')).toBe(1);
      expect(countRows(fixture.adapter, 'cost_movements')).toBe(0);
      expect(getBatchProjectionForStoreProduct(fixture.adapter, rice.storeProduct.id)).toMatchObject({
        inventoryBalanceBaseMicros: String(40 * MICROS_PER_UNIT),
        unknownResidualBaseMicros: '0',
      });
      expect(getBatchProjectionForStoreProduct(fixture.adapter, rice.storeProduct.id).groups.map((group) => group.balanceBaseMicros)).toEqual([
        '0',
        '0',
        String(25 * MICROS_PER_UNIT),
        String(15 * MICROS_PER_UNIT),
      ]);
      const replay = classifyInventoryBatches(fixture.adapter, {
        operationId: testId(4140),
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        storeProductId: rice.storeProduct.id,
        expectedInventoryWatermark: before.inventoryWatermark,
        expectedBatchWatermark: before.batchWatermark,
        mode: 'CORRECTION',
        groups: [
          { quantityBaseMicros: 25 * MICROS_PER_UNIT, datePrecision: 'DAY', dateValue: '2026-11-01', dateMeaning: 'EXPIRY' },
          { quantityBaseMicros: 15 * MICROS_PER_UNIT, datePrecision: 'MONTH', dateValue: '2027-02', dateMeaning: 'BEST_BEFORE' },
        ],
      });
      expect(replay.operation.id).toBe(corrected.operation.id);
      expect(() => classifyInventoryBatches(fixture.adapter, {
        operationId: testId(4140),
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        storeProductId: rice.storeProduct.id,
        expectedInventoryWatermark: before.inventoryWatermark,
        expectedBatchWatermark: before.batchWatermark,
        mode: 'CORRECTION',
        groups: [{ quantityBaseMicros: 40 * MICROS_PER_UNIT, datePrecision: 'DAY', dateValue: '2026-12-01', dateMeaning: 'EXPIRY' }],
      })).toThrow('different batch classification');
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('requires the owner and rolls back every classification write boundary', () => {
    const roleFixture = seedUnknownStock();
    try {
      const staffUser = createUser(roleFixture.fixture.adapter, { id: testId(4075), displayName: 'Staff user' });
      createStoreMember(roleFixture.fixture.adapter, { id: testId(4076), storeId: roleFixture.fixture.context.store.id, userId: staffUser.id, role: 'STAFF' });
      const projection = getBatchProjectionForStoreProduct(roleFixture.fixture.adapter, roleFixture.rice.storeProduct.id);
      expect(() => classifyInventoryBatches(roleFixture.fixture.adapter, {
        operationId: testId(4077),
        storeId: roleFixture.fixture.context.store.id,
        deviceId: roleFixture.fixture.context.device.id,
        userId: staffUser.id,
        storeProductId: roleFixture.rice.storeProduct.id,
        expectedInventoryWatermark: projection.inventoryWatermark,
        expectedBatchWatermark: projection.batchWatermark,
        groups: [{ quantityBaseMicros: 10 * MICROS_PER_UNIT, datePrecision: 'DAY', dateValue: '2026-10-20', dateMeaning: 'EXPIRY' }],
      })).toThrow('Only an active store owner');
    } finally {
      roleFixture.fixture.closeAndDelete();
    }

    const probe = seedUnknownStock();
    let writeCount = 0;
    try {
      const projection = getBatchProjectionForStoreProduct(probe.fixture.adapter, probe.rice.storeProduct.id);
      const adapter = new FailOnWriteAdapter(probe.fixture.adapter, Number.MAX_SAFE_INTEGER, new Error('probe'));
      classifyInventoryBatches(adapter, {
        operationId: testId(4080),
        storeId: probe.fixture.context.store.id,
        deviceId: probe.fixture.context.device.id,
        userId: probe.fixture.context.owner.id,
        storeProductId: probe.rice.storeProduct.id,
        expectedInventoryWatermark: projection.inventoryWatermark,
        expectedBatchWatermark: projection.batchWatermark,
        groups: [{ quantityBaseMicros: 40 * MICROS_PER_UNIT, datePrecision: 'DAY', dateValue: '2026-10-20', dateMeaning: 'EXPIRY' }],
      }, { generateId: deterministicIds(4090) });
      writeCount = adapter.writeCount;
    } finally {
      probe.fixture.closeAndDelete();
    }
    expect(writeCount).toBeGreaterThan(0);
    for (let failOnWrite = 1; failOnWrite <= writeCount; failOnWrite += 1) {
      const { fixture, rice } = seedUnknownStock();
      try {
        const projection = getBatchProjectionForStoreProduct(fixture.adapter, rice.storeProduct.id);
        const beforeOutbox = countRows(fixture.adapter, 'outbox_operations');
        const adapter = new FailOnWriteAdapter(fixture.adapter, failOnWrite, new Error(`classification boundary ${failOnWrite}`));
        expect(() => classifyInventoryBatches(adapter, {
          operationId: testId(4100),
          storeId: fixture.context.store.id,
          deviceId: fixture.context.device.id,
          userId: fixture.context.owner.id,
          storeProductId: rice.storeProduct.id,
          expectedInventoryWatermark: projection.inventoryWatermark,
          expectedBatchWatermark: projection.batchWatermark,
          groups: [{ quantityBaseMicros: 40 * MICROS_PER_UNIT, datePrecision: 'DAY', dateValue: '2026-10-20', dateMeaning: 'EXPIRY' }],
        }, { generateId: deterministicIds(4110) })).toThrow(`classification boundary ${failOnWrite}`);
        expect(countRows(fixture.adapter, 'inventory_batch_groups')).toBe(0);
        expect(countRows(fixture.adapter, 'batch_inventory_operations')).toBe(0);
        expect(countRows(fixture.adapter, 'batch_inventory_entries')).toBe(0);
        expect(countRows(fixture.adapter, 'outbox_operations')).toBe(beforeOutbox);
      } finally {
        fixture.closeAndDelete();
      }
    }
  });
});
