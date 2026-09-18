import { MICROS_PER_UNIT } from '@retail/domain';

import { createCatalogueClient } from '../src/catalogue/client';
import { createDatabaseInventoryClient } from '../src/inventory/client';
import { classifyInventoryBatches } from '../src/inventory/classifyBatches';
import { finalizeInventoryReconciliation, startInventoryReconciliation } from '../src/inventory/reconcileInventory';
import {
  createStoreMember,
  createUser,
  getInventoryReconciliationById,
  getInventoryReconciliationLineById,
  getCostState,
  listInventoryEventsBySource,
} from '../src/db/repositories';
import { recordPurchase } from '../src/purchases/recordPurchase';
import { FailOnWriteAdapter, openCatalogueFixture, countRows, deterministicIds, reopenDatabase, testId } from './catalogueSupport';

function openReconciliationFixture() {
  const fixture = openCatalogueFixture();
  const catalogue = createCatalogueClient(fixture.adapter, fixture.context.store, fixture.context.device, deterministicIds(6000));
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
  }, { generateId: deterministicIds(6010), operationId: testId(6020) });
  const client = createDatabaseInventoryClient(fixture.adapter, {
    storeId: fixture.context.store.id,
    deviceId: fixture.context.device.id,
    userId: fixture.context.owner.id,
    generateId: deterministicIds(6030),
  });
  return { fixture, rice, client };
}

describe('M5 blind reconciliation checks', () => {
  it('keeps the expected quantity out of the draft, persists a matching count, and replays after reopen', () => {
    const { fixture, rice, client } = openReconciliationFixture();
    try {
      const beforeEvents = countRows(fixture.adapter, 'inventory_events');
      const beforeOutbox = countRows(fixture.adapter, 'outbox_operations');
      const draft = client.startReconciliation(rice.storeProduct.id);
      expect(draft.recordedBaseUnitsSnapshot).toBeNull();
      expect(draft.physicalBaseUnits).toBeNull();
      const submitted = client.submitReconciliation({
        reconciliationId: draft.reconciliationId,
        expectedInventoryWatermark: draft.inventoryWatermark,
        expectedBatchWatermark: draft.batchWatermark,
        physicalBaseUnits: 40 * MICROS_PER_UNIT,
      });
      expect(submitted.hasSubmission).toBe(true);
      const graph = client.finalizeReconciliation({
        reconciliationId: draft.reconciliationId,
        operationId: testId(6040),
      });
      expect(graph.adjustment).toBeNull();
      expect(graph.inventoryEvents).toHaveLength(0);
      expect(graph.reconciliation.status).toBe('COMPLETED');
      expect(countRows(fixture.adapter, 'inventory_events')).toBe(beforeEvents);
      expect(countRows(fixture.adapter, 'outbox_operations')).toBe(beforeOutbox + 1);
      const replay = client.finalizeReconciliation({
        reconciliationId: draft.reconciliationId,
        operationId: testId(6040),
      });
      expect(replay.reconciliation.id).toBe(graph.reconciliation.id);
      expect(replay.outbox.operationId).toBe(graph.outbox.operationId);
      expect(() => client.finalizeReconciliation({
        reconciliationId: draft.reconciliationId,
        operationId: testId(6040),
        note: 'different retry',
      })).toThrow('different reconciliation finalization');
      const path = fixture.path;
      fixture.adapter.close();
      const reopened = reopenDatabase(path);
      try {
        expect(getInventoryReconciliationById(reopened, draft.reconciliationId)?.status).toBe('COMPLETED');
        expect(getInventoryReconciliationLineById(reopened, draft.lineId)?.differenceBaseUnits).toBe('0');
      } finally {
        reopened.close();
      }
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('records total-only discrepancies as real corrections and moves named composition to unknown', () => {
    const { fixture, rice, client } = openReconciliationFixture();
    try {
      const draft = client.startReconciliation(rice.storeProduct.id);
      client.submitReconciliation({
        reconciliationId: draft.reconciliationId,
        expectedInventoryWatermark: draft.inventoryWatermark,
        expectedBatchWatermark: draft.batchWatermark,
        physicalBaseUnits: 35 * MICROS_PER_UNIT,
      });
      const graph = client.finalizeReconciliation({ reconciliationId: draft.reconciliationId, operationId: testId(6050) });
      expect(graph.adjustment).not.toBeNull();
      expect(graph.inventoryEvents[0]).toMatchObject({ quantityBaseDeltaMicros: -5 * MICROS_PER_UNIT, sourceType: 'RECONCILIATION' });
      expect(graph.batchOperations.some((operation) => operation.kind === 'RECONCILIATION')).toBe(true);
      expect(graph.batchOperations.some((operation) => operation.kind === 'EVENT_ALLOCATION')).toBe(true);
      expect(graph.batchEntries.filter((entry) => entry.groupId !== null).reduce((sum, entry) => sum + entry.deltaBaseMicros, 0)).toBe(-40 * MICROS_PER_UNIT);
      const projection = client.getBatchProjection(rice.storeProduct.id);
      expect(projection.inventoryBalanceBaseMicros).toBe(String(35 * MICROS_PER_UNIT));
      expect(projection.groups[0].balanceBaseMicros).toBe('0');
      expect(projection.unknownResidualBaseMicros).toBe(String(35 * MICROS_PER_UNIT));
      expect(getCostState(fixture.adapter, rice.storeProduct.id)).toMatchObject({ coverageStatus: 'KNOWN', quantityCostedBaseMicros: 35 * MICROS_PER_UNIT });
      expect(listInventoryEventsBySource(fixture.adapter, 'RECONCILIATION', graph.adjustment!.id)).toHaveLength(1);
      const originalCostStates = graph.costStates;
      recordPurchase(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        occurredAt: '2026-09-19T10:00:00.000Z',
        lines: [{ storeProductId: rice.storeProduct.id, packageUnitId: rice.basePackage.id, quantityPackagesMicros: MICROS_PER_UNIT, enteredCostMinor: 999 }],
      }, { generateId: deterministicIds(6056), operationId: testId(6055) });
      expect(getCostState(fixture.adapter, rice.storeProduct.id)).not.toEqual(originalCostStates[0]);
      const replay = client.finalizeReconciliation({ reconciliationId: draft.reconciliationId, operationId: testId(6050) });
      expect(replay.costStates).toEqual(originalCostStates);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('uses complete group counts directly without FEFO shrinkage guessing', () => {
    const fixture = openCatalogueFixture();
    const catalogue = createCatalogueClient(fixture.adapter, fixture.context.store, fixture.context.device, deterministicIds(6100));
    const rice = catalogue.createTemporaryProduct({ name: 'Rice' });
    try {
      for (const [operationId, date, cost] of [[testId(6110), '2026-10-20', 200], [testId(6120), '2027-01-20', 240]] as const) {
        recordPurchase(fixture.adapter, {
          storeId: fixture.context.store.id,
          deviceId: fixture.context.device.id,
          userId: fixture.context.owner.id,
          lines: [{ storeProductId: rice.storeProduct.id, packageUnitId: rice.basePackage.id, quantityPackagesMicros: 20 * MICROS_PER_UNIT, enteredCostMinor: cost, expiryPrecision: 'DAY', expiryValue: date, expiryMeaning: 'EXPIRY' }],
        }, { generateId: deterministicIds(cost + 10), operationId });
      }
      const client = createDatabaseInventoryClient(fixture.adapter, { storeId: fixture.context.store.id, deviceId: fixture.context.device.id, userId: fixture.context.owner.id, generateId: deterministicIds(6130) });
      const before = client.getBatchProjection(rice.storeProduct.id);
      const groups = before.groups.filter((group) => BigInt(group.balanceBaseMicros) > 0n);
      const draft = client.startReconciliation(rice.storeProduct.id);
      client.submitReconciliation({
        reconciliationId: draft.reconciliationId,
        expectedInventoryWatermark: draft.inventoryWatermark,
        expectedBatchWatermark: draft.batchWatermark,
        physicalBaseUnits: 30 * MICROS_PER_UNIT,
        completeGroupCount: true,
        groupCounts: [{ groupId: groups[0].id, physicalBaseUnits: 10 * MICROS_PER_UNIT }, { groupId: groups[1].id, physicalBaseUnits: 20 * MICROS_PER_UNIT }],
      });
      const graph = client.finalizeReconciliation({ reconciliationId: draft.reconciliationId, operationId: testId(6140) });
      const after = client.getBatchProjection(rice.storeProduct.id);
      expect(graph.adjustment).not.toBeNull();
      expect(after.inventoryBalanceBaseMicros).toBe(String(30 * MICROS_PER_UNIT));
      expect(after.groups.filter((group) => BigInt(group.balanceBaseMicros) > 0n).map((group) => group.balanceBaseMicros)).toEqual([String(10 * MICROS_PER_UNIT), String(20 * MICROS_PER_UNIT)]);
      expect(after.unknownResidualBaseMicros).toBe('0');
      expect(graph.batchOperations.filter((operation) => operation.kind === 'RECONCILIATION')).toHaveLength(1);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('requires both watermarks to remain current and retains evidence for a recount', () => {
    const { fixture, rice, client } = openReconciliationFixture();
    try {
      const draft = client.startReconciliation(rice.storeProduct.id);
      client.submitReconciliation({ reconciliationId: draft.reconciliationId, expectedInventoryWatermark: draft.inventoryWatermark, expectedBatchWatermark: draft.batchWatermark, physicalBaseUnits: 40 * MICROS_PER_UNIT });
      const before = client.getBatchProjection(rice.storeProduct.id);
      classifyInventoryBatches(fixture.adapter, {
        operationId: testId(6150),
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        storeProductId: rice.storeProduct.id,
        expectedInventoryWatermark: before.inventoryWatermark,
        expectedBatchWatermark: before.batchWatermark,
        mode: 'CORRECTION',
        groups: [{ quantityBaseMicros: 40 * MICROS_PER_UNIT, datePrecision: 'DAY', dateValue: '2026-10-21', dateMeaning: 'EXPIRY' }],
      }, { generateId: deterministicIds(6160) });
      expect(() => client.finalizeReconciliation({ reconciliationId: draft.reconciliationId, operationId: testId(6170) })).toThrow('changed while this count was open');
      expect(countRows(fixture.adapter, 'inventory_reconciliation_submissions')).toBe(1);
      const refreshed = client.getReconciliationDraft(draft.reconciliationId);
      client.submitReconciliation({ reconciliationId: draft.reconciliationId, expectedInventoryWatermark: refreshed.inventoryWatermark, expectedBatchWatermark: refreshed.batchWatermark, physicalBaseUnits: 40 * MICROS_PER_UNIT });
      const graph = client.finalizeReconciliation({ reconciliationId: draft.reconciliationId, operationId: testId(6170) });
      expect(graph.reconciliation.status).toBe('COMPLETED');
      expect(graph.submissions.map((submission) => submission.submissionType)).toEqual(['FIRST', 'RECOUNT']);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('keeps owner boundaries and package exactness at finalization', () => {
    const { fixture, rice, client } = openReconciliationFixture();
    try {
      const staff = createUser(fixture.adapter, { id: testId(6180), displayName: 'Staff' });
      createStoreMember(fixture.adapter, { id: testId(6181), storeId: fixture.context.store.id, userId: staff.id, role: 'STAFF' });
      expect(() => startInventoryReconciliation(fixture.adapter, { storeId: fixture.context.store.id, deviceId: fixture.context.device.id, userId: staff.id, storeProductId: rice.storeProduct.id })).toThrow('Only an active store owner');
      const draft = client.startReconciliation(rice.storeProduct.id);
      client.submitReconciliation({ reconciliationId: draft.reconciliationId, expectedInventoryWatermark: draft.inventoryWatermark, expectedBatchWatermark: draft.batchWatermark, physicalBaseUnits: 35 * MICROS_PER_UNIT });
      const staffClient = createDatabaseInventoryClient(fixture.adapter, { storeId: fixture.context.store.id, deviceId: fixture.context.device.id, userId: staff.id });
      expect(() => staffClient.finalizeReconciliation({ reconciliationId: draft.reconciliationId, operationId: testId(6190) })).toThrow('Only an active store owner');
      const before = countRows(fixture.adapter, 'inventory_adjustments');
      expect(() => client.finalizeReconciliation({ reconciliationId: draft.reconciliationId, operationId: testId(6191), packageUnitId: rice.basePackage.id, quantityPackageSnapshotMicros: 4 * MICROS_PER_UNIT, conversionToBaseSnapshotMicros: rice.basePackage.conversionToBaseMicros })).toThrow('does not exactly explain');
      expect(countRows(fixture.adapter, 'inventory_adjustments')).toBe(before);
      const graph = client.finalizeReconciliation({ reconciliationId: draft.reconciliationId, operationId: testId(6192), packageUnitId: rice.basePackage.id, quantityPackageSnapshotMicros: 5 * MICROS_PER_UNIT, conversionToBaseSnapshotMicros: rice.basePackage.conversionToBaseMicros });
      expect(graph.adjustment).not.toBeNull();
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('rolls back every finalization write boundary', () => {
    const probe = openReconciliationFixture();
    let writeCount = 0;
    let operationId = testId(6200);
    try {
      const draft = probe.client.startReconciliation(probe.rice.storeProduct.id);
      probe.client.submitReconciliation({ reconciliationId: draft.reconciliationId, expectedInventoryWatermark: draft.inventoryWatermark, expectedBatchWatermark: draft.batchWatermark, physicalBaseUnits: 35 * MICROS_PER_UNIT });
      const failing = new FailOnWriteAdapter(probe.fixture.adapter, Number.MAX_SAFE_INTEGER, new Error('finalization probe'));
      finalizeInventoryReconciliation(failing, {
        operationId,
        reconciliationId: draft.reconciliationId,
        storeId: probe.fixture.context.store.id,
        deviceId: probe.fixture.context.device.id,
        userId: probe.fixture.context.owner.id,
      }, { generateId: deterministicIds(6250) });
      writeCount = failing.writeCount;
    } finally {
      probe.fixture.closeAndDelete();
    }
    expect(writeCount).toBeGreaterThan(0);
    for (let failOnWrite = 1; failOnWrite <= writeCount; failOnWrite += 1) {
      const { fixture, rice, client } = openReconciliationFixture();
      try {
        const draft = client.startReconciliation(rice.storeProduct.id);
        client.submitReconciliation({ reconciliationId: draft.reconciliationId, expectedInventoryWatermark: draft.inventoryWatermark, expectedBatchWatermark: draft.batchWatermark, physicalBaseUnits: 35 * MICROS_PER_UNIT });
        const beforeEvents = countRows(fixture.adapter, 'inventory_events');
        const beforeOutbox = countRows(fixture.adapter, 'outbox_operations');
        const failing = new FailOnWriteAdapter(fixture.adapter, failOnWrite, new Error(`finalization boundary ${failOnWrite}`));
        expect(() => finalizeInventoryReconciliation(failing, {
          operationId,
          reconciliationId: draft.reconciliationId,
          storeId: fixture.context.store.id,
          deviceId: fixture.context.device.id,
          userId: fixture.context.owner.id,
        }, { generateId: deterministicIds(6260) })).toThrow(`finalization boundary ${failOnWrite}`);
        expect(getInventoryReconciliationById(fixture.adapter, draft.reconciliationId)?.status).toBe('IN_PROGRESS');
        expect(countRows(fixture.adapter, 'inventory_events')).toBe(beforeEvents);
        expect(countRows(fixture.adapter, 'inventory_adjustments')).toBe(0);
        expect(countRows(fixture.adapter, 'outbox_operations')).toBe(beforeOutbox);
      } finally {
        fixture.closeAndDelete();
      }
      operationId = testId(6200 + failOnWrite);
    }
  });
});
