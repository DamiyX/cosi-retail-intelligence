import { MICROS_PER_UNIT } from '@retail/domain';

import { createCatalogueClient } from '../src/catalogue/client';
import { createTemporaryProduct } from '../src/catalogue/createTemporaryProduct';
import { MIGRATIONS, openDatabase } from '../src/db';
import { openIsolatedDatabase } from '../src/db/testing';
import {
  createInventoryEvent,
  createStoreMember,
  createUser,
  getCostState,
  getInventoryBalanceBigIntByStoreProduct,
  listInventoryEventsBySource,
  listCostMovementsBySource,
  rebuildCostStateFromMovements,
} from '../src/db/repositories';
import { recordInventoryAdjustment } from '../src/inventory/adjustInventory';
import { getBatchProjectionForStoreProduct } from '../src/inventory/batchAllocation';
import { recordPurchase } from '../src/purchases/recordPurchase';
import { provisionStoreContext } from '../src/storeContext/provisionStoreContext';
import { countRows, deterministicIds, FailOnWriteAdapter, openCatalogueFixture, reopenDatabase, testId } from './catalogueSupport';

function openKnownAdjustmentFixture() {
  const fixture = openCatalogueFixture();
  const catalogue = createCatalogueClient(fixture.adapter, fixture.context.store, fixture.context.device, deterministicIds(5000));
  const rice = catalogue.createTemporaryProduct({ name: 'Rice' });
  recordPurchase(fixture.adapter, {
    storeId: fixture.context.store.id,
    deviceId: fixture.context.device.id,
    userId: fixture.context.owner.id,
    occurredAt: '2026-09-18T10:00:00.000Z',
    lines: [{
      storeProductId: rice.storeProduct.id,
      packageUnitId: rice.basePackage.id,
      quantityPackagesMicros: 40 * MICROS_PER_UNIT,
      enteredCostMinor: 400,
      expiryPrecision: 'DAY',
      expiryValue: '2026-10-20',
      expiryMeaning: 'EXPIRY',
    }],
  }, { generateId: deterministicIds(5010), operationId: testId(5020) });
  return { fixture, rice };
}

function recordInput(fixture: ReturnType<typeof openKnownAdjustmentFixture>['fixture'], rice: ReturnType<typeof openKnownAdjustmentFixture>['rice'], operationId: string, quantityBaseDeltaMicros: number, extras: { groupId?: string | null; note?: string } = {}) {
  const projection = getBatchProjectionForStoreProduct(fixture.adapter, rice.storeProduct.id);
  return {
    operationId,
    storeId: fixture.context.store.id,
    deviceId: fixture.context.device.id,
    userId: fixture.context.owner.id,
    reasonCode: 'EXPIRED' as const,
    note: extras.note,
    lines: [{
      storeProductId: rice.storeProduct.id,
      quantityBaseDeltaMicros,
      groupId: extras.groupId,
      expectedInventoryWatermark: projection.inventoryWatermark,
      expectedBatchWatermark: projection.batchWatermark,
    }],
  };
}

describe('M5 inventory adjustments', () => {
  it('records selected-group removal with exact MWA value, batch allocation, replay, and rebuild agreement', () => {
    const { fixture, rice } = openKnownAdjustmentFixture();
    try {
      const before = getBatchProjectionForStoreProduct(fixture.adapter, rice.storeProduct.id);
      const group = before.groups.find((candidate) => BigInt(candidate.balanceBaseMicros) > 0n)!;
      const beforeOutbox = countRows(fixture.adapter, 'outbox_operations');
      const input = recordInput(fixture, rice, testId(5030), -5 * MICROS_PER_UNIT, { groupId: group.id, note: 'Expired sample' });
      const graph = recordInventoryAdjustment(fixture.adapter, input, { generateId: deterministicIds(5040) });
      expect(graph.adjustment.reasonCode).toBe('EXPIRED');
      expect(graph.inventoryEvents[0]).toMatchObject({ quantityBaseDeltaMicros: -5 * MICROS_PER_UNIT, sourceType: 'MANUAL_ADJUSTMENT', sourceId: graph.adjustment.id });
      expect(graph.lines[0].groupId).toBe(group.id);
      expect(graph.costMovements[0]).toMatchObject({ movementType: 'ADJUSTMENT', coverageStatus: 'KNOWN', costedQuantityDeltaMicros: -5 * MICROS_PER_UNIT });
      expect(graph.costMovements[0].value).toEqual({ numerator: '-50', denominator: '1' });
      expect(graph.batchEntries[0]).toMatchObject({ groupId: group.id, entryType: 'ADJUSTMENT', deltaBaseMicros: -5 * MICROS_PER_UNIT });
      expect(countRows(fixture.adapter, 'inventory_adjustments')).toBe(1);
      expect(countRows(fixture.adapter, 'inventory_adjustment_lines')).toBe(1);
      expect(countRows(fixture.adapter, 'outbox_operations')).toBe(beforeOutbox + 1);
      expect(getInventoryBalanceBigIntByStoreProduct(fixture.adapter, rice.storeProduct.id)).toBe(35n * BigInt(MICROS_PER_UNIT));
      expect(getBatchProjectionForStoreProduct(fixture.adapter, rice.storeProduct.id).groups.find((candidate) => candidate.id === group.id)?.balanceBaseMicros).toBe(String(35 * MICROS_PER_UNIT));
      const live = getCostState(fixture.adapter, rice.storeProduct.id)!;
      expect(live).toMatchObject({ coverageStatus: 'KNOWN', quantityCostedBaseMicros: 35 * MICROS_PER_UNIT, remainingValue: { numerator: '350', denominator: '1' } });
      expect(rebuildCostStateFromMovements(fixture.adapter, rice.storeProduct.id)).toMatchObject({
        coverageStatus: live.coverageStatus,
        quantityCostedBaseMicros: live.quantityCostedBaseMicros,
        remainingValue: live.remainingValue,
        averageUnitCost: live.averageUnitCost,
      });

      const excessive = recordInventoryAdjustment(fixture.adapter, recordInput(fixture, rice, testId(5035), -40 * MICROS_PER_UNIT, { note: 'Uncovered loss' }), { generateId: deterministicIds(5036) });
      expect(excessive.costMovements[0]).toMatchObject({ coverageStatus: 'UNAVAILABLE', costedQuantityDeltaMicros: -35 * MICROS_PER_UNIT });
      expect(getCostState(fixture.adapter, rice.storeProduct.id)).toMatchObject({ coverageStatus: 'KNOWN', quantityCostedBaseMicros: 0 });
      expect(rebuildCostStateFromMovements(fixture.adapter, rice.storeProduct.id)).toMatchObject({ coverageStatus: 'KNOWN', quantityCostedBaseMicros: 0 });

      const replay = recordInventoryAdjustment(fixture.adapter, input, { generateId: deterministicIds(5050) });
      expect(replay.adjustment.id).toBe(graph.adjustment.id);
      expect(replay.costStates).toEqual(graph.costStates);
      expect(replay.costStates).not.toEqual(excessive.costStates);
      expect(countRows(fixture.adapter, 'inventory_adjustments')).toBe(2);
      expect(() => recordInventoryAdjustment(fixture.adapter, { ...input, note: 'different retry' })).toThrow('different inventory adjustment');
      expect(listInventoryEventsBySource(fixture.adapter, 'MANUAL_ADJUSTMENT', graph.adjustment.id)).toHaveLength(1);
      expect(listCostMovementsBySource(fixture.adapter, 'ADJUSTMENT', graph.adjustment.id)).toHaveLength(1);
      const path = fixture.path;
      fixture.adapter.close();
      const reopened = reopenDatabase(path);
      try {
        openDatabase(reopened, MIGRATIONS);
        expect(getBatchProjectionForStoreProduct(reopened, rice.storeProduct.id).inventoryBalanceBaseMicros).toBe(String(-5 * MICROS_PER_UNIT));
        expect(getCostState(reopened, rice.storeProduct.id)).toMatchObject({ coverageStatus: 'KNOWN', quantityCostedBaseMicros: 0 });
      } finally {
        reopened.close();
      }
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('keeps unknown and excessive coverage truthful for additions and shortages', () => {
    const fixture = openCatalogueFixture();
    const catalogue = createCatalogueClient(fixture.adapter, fixture.context.store, fixture.context.device, deterministicIds(5100));
    const rice = catalogue.createTemporaryProduct({ name: 'Rice' });
    createInventoryEvent(fixture.adapter, {
      id: testId(5110),
      storeId: fixture.context.store.id,
      storeProductId: rice.storeProduct.id,
      eventType: 'OPENING_BALANCE',
      quantityBaseDeltaMicros: 10 * MICROS_PER_UNIT,
      sourceType: 'OPENING_BALANCE',
      sourceId: testId(5111),
      occurredAt: '2026-09-18T10:00:00.000Z',
      createdByUserId: fixture.context.owner.id,
      deviceId: fixture.context.device.id,
    });
    try {
      const addition = recordInventoryAdjustment(fixture.adapter, {
        operationId: testId(5120),
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        reasonCode: 'CUSTOMER_RETURN',
        lines: [{
          storeProductId: rice.storeProduct.id,
          quantityBaseDeltaMicros: 5 * MICROS_PER_UNIT,
          expectedInventoryWatermark: getBatchProjectionForStoreProduct(fixture.adapter, rice.storeProduct.id).inventoryWatermark,
          expectedBatchWatermark: getBatchProjectionForStoreProduct(fixture.adapter, rice.storeProduct.id).batchWatermark,
        }],
      }, { generateId: deterministicIds(5130) });
      expect(addition.costMovements[0]).toMatchObject({ coverageStatus: 'UNKNOWN', costedQuantityDeltaMicros: 0, value: { numerator: '0', denominator: '1' } });
      expect(getCostState(fixture.adapter, rice.storeProduct.id)).toMatchObject({ coverageStatus: 'UNKNOWN', quantityCostedBaseMicros: 0 });
      expect(getBatchProjectionForStoreProduct(fixture.adapter, rice.storeProduct.id).unknownResidualBaseMicros).toBe(String(15 * MICROS_PER_UNIT));

      const beforeRemoval = getBatchProjectionForStoreProduct(fixture.adapter, rice.storeProduct.id);
      const excessive = recordInventoryAdjustment(fixture.adapter, {
        operationId: testId(5140),
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        reasonCode: 'MISSING',
        lines: [{
          storeProductId: rice.storeProduct.id,
          quantityBaseDeltaMicros: -20 * MICROS_PER_UNIT,
          expectedInventoryWatermark: beforeRemoval.inventoryWatermark,
          expectedBatchWatermark: beforeRemoval.batchWatermark,
        }],
      }, { generateId: deterministicIds(5150) });
      expect(excessive.costMovements[0].coverageStatus).toBe('UNKNOWN');
      expect(getInventoryBalanceBigIntByStoreProduct(fixture.adapter, rice.storeProduct.id)).toBe(-5n * BigInt(MICROS_PER_UNIT));
      expect(getBatchProjectionForStoreProduct(fixture.adapter, rice.storeProduct.id).unknownResidualBaseMicros).toBe(String(-5 * MICROS_PER_UNIT));
      expect(rebuildCostStateFromMovements(fixture.adapter, rice.storeProduct.id).coverageStatus).toBe('UNKNOWN');
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('supports multiple products in one adjustment with one outbox envelope and distinct batch event allocations', () => {
    const { fixture, rice } = openKnownAdjustmentFixture();
    try {
      const catalogue = createCatalogueClient(fixture.adapter, fixture.context.store, fixture.context.device, deterministicIds(5060));
      const beans = catalogue.createTemporaryProduct({ name: 'Beans' });
      createInventoryEvent(fixture.adapter, {
        id: testId(5061),
        storeId: fixture.context.store.id,
        storeProductId: beans.storeProduct.id,
        eventType: 'OPENING_BALANCE',
        quantityBaseDeltaMicros: 2 * MICROS_PER_UNIT,
        sourceType: 'OPENING_BALANCE',
        sourceId: testId(5062),
        occurredAt: '2026-09-18T10:00:00.000Z',
        createdByUserId: fixture.context.owner.id,
        deviceId: fixture.context.device.id,
      });
      const riceProjection = getBatchProjectionForStoreProduct(fixture.adapter, rice.storeProduct.id);
      const beansProjection = getBatchProjectionForStoreProduct(fixture.adapter, beans.storeProduct.id);
      const beforeOutbox = countRows(fixture.adapter, 'outbox_operations');
      const graph = recordInventoryAdjustment(fixture.adapter, {
        operationId: testId(5063),
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        reasonCode: 'CORRECTION',
        lines: [
          {
            storeProductId: rice.storeProduct.id,
            quantityBaseDeltaMicros: -MICROS_PER_UNIT,
            groupId: riceProjection.groups[0].id,
            expectedInventoryWatermark: riceProjection.inventoryWatermark,
            expectedBatchWatermark: riceProjection.batchWatermark,
          },
          {
            storeProductId: beans.storeProduct.id,
            quantityBaseDeltaMicros: MICROS_PER_UNIT,
            expectedInventoryWatermark: beansProjection.inventoryWatermark,
            expectedBatchWatermark: beansProjection.batchWatermark,
          },
        ],
      }, { generateId: deterministicIds(5070) });
      expect(graph.lines).toHaveLength(2);
      expect(graph.batchOperations).toHaveLength(2);
      expect(graph.outbox.operationType).toBe('INVENTORY_ADJUSTMENT_CREATED');
      expect(countRows(fixture.adapter, 'outbox_operations')).toBe(beforeOutbox + 1);
      expect(getInventoryBalanceBigIntByStoreProduct(fixture.adapter, rice.storeProduct.id)).toBe(39n * BigInt(MICROS_PER_UNIT));
      expect(getInventoryBalanceBigIntByStoreProduct(fixture.adapter, beans.storeProduct.id)).toBe(3n * BigInt(MICROS_PER_UNIT));
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('enforces owner replay authorization, stale selected-group protection, raw immutability, and atomic rollback', () => {
    const roleFixture = openKnownAdjustmentFixture();
    try {
      const staffUser = createUser(roleFixture.fixture.adapter, { id: testId(5160), displayName: 'Staff user' });
      createStoreMember(roleFixture.fixture.adapter, { id: testId(5161), storeId: roleFixture.fixture.context.store.id, userId: staffUser.id, role: 'STAFF' });
      const input = recordInput(roleFixture.fixture, roleFixture.rice, testId(5170), -1 * MICROS_PER_UNIT);
      expect(() => recordInventoryAdjustment(roleFixture.fixture.adapter, { ...input, userId: staffUser.id })).toThrow('Only an active store owner');
      const graph = recordInventoryAdjustment(roleFixture.fixture.adapter, input, { generateId: deterministicIds(5180) });
      expect(() => recordInventoryAdjustment(roleFixture.fixture.adapter, { ...input, userId: staffUser.id })).toThrow('Only an active store owner');
      expect(() => roleFixture.fixture.adapter.run('UPDATE inventory_adjustments SET note = ? WHERE id = ?;', ['tampered', graph.adjustment.id])).toThrow(/inventory adjustments are immutable/);
      expect(() => roleFixture.fixture.adapter.run('DELETE FROM inventory_adjustment_lines WHERE id = ?;', [graph.lines[0].id])).toThrow(/inventory adjustment lines are immutable/);
    } finally {
      roleFixture.fixture.closeAndDelete();
    }

    const staleFixture = openKnownAdjustmentFixture();
    try {
      const before = getBatchProjectionForStoreProduct(staleFixture.fixture.adapter, staleFixture.rice.storeProduct.id);
      createInventoryEvent(staleFixture.fixture.adapter, {
        id: testId(5190),
        storeId: staleFixture.fixture.context.store.id,
        storeProductId: staleFixture.rice.storeProduct.id,
        eventType: 'OPENING_BALANCE',
        quantityBaseDeltaMicros: 1,
        sourceType: 'OPENING_BALANCE',
        sourceId: testId(5191),
        occurredAt: '2026-09-18T10:00:00.000Z',
        createdByUserId: staleFixture.fixture.context.owner.id,
        deviceId: staleFixture.fixture.context.device.id,
      });
      expect(() => recordInventoryAdjustment(staleFixture.fixture.adapter, {
        operationId: testId(5200),
        storeId: staleFixture.fixture.context.store.id,
        deviceId: staleFixture.fixture.context.device.id,
        userId: staleFixture.fixture.context.owner.id,
        reasonCode: 'EXPIRED',
        lines: [{ storeProductId: staleFixture.rice.storeProduct.id, quantityBaseDeltaMicros: -MICROS_PER_UNIT, expectedInventoryWatermark: before.inventoryWatermark, expectedBatchWatermark: before.batchWatermark }],
      })).toThrow('changed while this adjustment was open');
      expect(countRows(staleFixture.fixture.adapter, 'inventory_adjustments')).toBe(0);
    } finally {
      staleFixture.fixture.closeAndDelete();
    }

    const probe = openKnownAdjustmentFixture();
    let writeCount = 0;
    try {
      const input = recordInput(probe.fixture, probe.rice, testId(5210), -MICROS_PER_UNIT);
      const adapter = new FailOnWriteAdapter(probe.fixture.adapter, Number.MAX_SAFE_INTEGER, new Error('adjustment probe'));
      recordInventoryAdjustment(adapter, input, { generateId: deterministicIds(5220) });
      writeCount = adapter.writeCount;
    } finally {
      probe.fixture.closeAndDelete();
    }
    expect(writeCount).toBeGreaterThan(0);
    for (let failOnWrite = 1; failOnWrite <= writeCount; failOnWrite += 1) {
      const { fixture, rice } = openKnownAdjustmentFixture();
      try {
        const input = recordInput(fixture, rice, testId(5230), -MICROS_PER_UNIT);
        const beforeEvents = countRows(fixture.adapter, 'inventory_events');
        const beforeOutbox = countRows(fixture.adapter, 'outbox_operations');
        const adapter = new FailOnWriteAdapter(fixture.adapter, failOnWrite, new Error(`adjustment boundary ${failOnWrite}`));
        expect(() => recordInventoryAdjustment(adapter, input, { generateId: deterministicIds(5240) })).toThrow(`adjustment boundary ${failOnWrite}`);
        expect(countRows(fixture.adapter, 'inventory_adjustments')).toBe(0);
        expect(countRows(fixture.adapter, 'inventory_adjustment_lines')).toBe(0);
        expect(countRows(fixture.adapter, 'inventory_events')).toBe(beforeEvents);
        expect(countRows(fixture.adapter, 'cost_movements')).toBe(1);
        expect(countRows(fixture.adapter, 'batch_inventory_operations')).toBe(1);
        expect(countRows(fixture.adapter, 'outbox_operations')).toBe(beforeOutbox);
      } finally {
        fixture.closeAndDelete();
      }
    }
  });

  it('upgrades a populated v7 database while preserving every M4 cost row', () => {
    const isolated = openIsolatedDatabase(MIGRATIONS.slice(0, 7));
    try {
      const context = provisionStoreContext(isolated.adapter, {
        ownerDisplayName: 'Upgrade owner',
        storeName: 'Upgrade store',
        currencyCode: 'NGN',
        countryCode: 'NG',
        timezone: 'Africa/Lagos',
        deviceLabel: 'Upgrade device',
        appVersion: '0.0.1',
      }, { generateId: deterministicIds(5300) });
      const product = createTemporaryProduct(isolated.adapter, { storeId: context.store.id, deviceId: context.device.id, name: 'Upgrade rice' }, { generateId: deterministicIds(5310) });
      recordPurchase(isolated.adapter, {
        storeId: context.store.id,
        deviceId: context.device.id,
        userId: context.owner.id,
        lines: [{ storeProductId: product.storeProduct.id, packageUnitId: product.basePackage.id, quantityPackagesMicros: 3 * MICROS_PER_UNIT, enteredCostMinor: 75 }],
      }, { generateId: deterministicIds(5320), operationId: testId(5330) });
      const before = isolated.adapter.getAllRows<Record<string, string | number | null>>('SELECT * FROM cost_movements ORDER BY application_order;');
      const report = openDatabase(isolated.adapter, MIGRATIONS);
      expect(report.schemaVersion).toBe(13);
      expect(isolated.adapter.getAllRows<Record<string, string>>('SELECT * FROM cost_movements ORDER BY application_order;')).toEqual(before);
      expect(isolated.adapter.getAllRows<Record<string, string>>('PRAGMA foreign_key_check;')).toEqual([]);
      expect(isolated.adapter.getFirstRow<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'cost_movements_m4';")).toBeNull();
      expect(countRows(isolated.adapter, 'inventory_adjustments')).toBe(0);
    } finally {
      isolated.closeAndDelete();
    }
  });
});
