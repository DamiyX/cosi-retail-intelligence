import { MICROS_PER_UNIT } from '@retail/domain';

import { createCatalogueClient } from '../src/catalogue/client';
import { createDatabaseInventoryClient } from '../src/inventory/client';
import { generateGuidedChecks, getGuidedCheckOverview } from '../src/inventory/guidedChecks';
import {
  countPendingOutboxOperations,
  createStoreMember,
  createUser,
  getInventoryCheckSettings,
  listInventoryCheckAssignmentsByStore,
  listInventoryCheckAttemptsByAssignment,
} from '../src/db/repositories';
import { recordPurchase } from '../src/purchases/recordPurchase';
import { deterministicIds, openCatalogueFixture, countRows, FailOnWriteAdapter, testId } from './catalogueSupport';

function seedProducts(count: number) {
  const fixture = openCatalogueFixture();
  const catalogue = createCatalogueClient(fixture.adapter, fixture.context.store, fixture.context.device, deterministicIds(7000));
  const products = Array.from({ length: count }, (_, index) => catalogue.createTemporaryProduct({ name: `Product ${index + 1}` }));
  products.forEach((product, index) => {
    recordPurchase(fixture.adapter, {
      storeId: fixture.context.store.id,
      deviceId: fixture.context.device.id,
      userId: fixture.context.owner.id,
      occurredAt: `2026-09-18T0${index + 1}:00:00.000Z`,
      lines: [{
        storeProductId: product.storeProduct.id,
        packageUnitId: product.basePackage.id,
        quantityPackagesMicros: (index + 1) * MICROS_PER_UNIT,
        enteredCostMinor: (index + 1) * 100,
      }],
    }, { generateId: deterministicIds(7100 + index * 10), operationId: testId(7200 + index) });
  });
  const client = createDatabaseInventoryClient(fixture.adapter, {
    storeId: fixture.context.store.id,
    deviceId: fixture.context.device.id,
    userId: fixture.context.owner.id,
    generateId: deterministicIds(7300),
  });
  return { fixture, products, client };
}

describe('M5 guided owner checks', () => {
  it('uses the default target, rotates eligible positive stock, links completion to blind reconciliation, and reopens with history', () => {
    const { fixture, client } = seedProducts(4);
    try {
      const at = '2026-09-18T10:00:00.000Z';
      expect(client.getGuidedCheckOverview(at)).toMatchObject({ reason: 'READY', settings: { dailyTarget: 3 }, eligibleCandidateCount: 4 });
      const beforeOutbox = countRows(fixture.adapter, 'outbox_operations');
      const generated = client.generateGuidedChecks({ operationId: testId(7400), now: at });
      expect(generated.assignments).toHaveLength(3);
      expect(generated.assignments.every((assignment) => BigInt(assignment.inventoryBalanceBaseMicros) > 0n)).toBe(true);
      expect(countRows(fixture.adapter, 'outbox_operations')).toBe(beforeOutbox + 1);
      const replay = client.generateGuidedChecks({ operationId: testId(7400), now: at });
      expect(replay.assignments.map((assignment) => assignment.id)).toEqual(generated.assignments.map((assignment) => assignment.id));
      expect(countRows(fixture.adapter, 'inventory_check_assignments')).toBe(3);

      const first = generated.assignments[0];
      const draft = client.startReconciliation(first.storeProductId, first.id);
      const submitted = client.submitReconciliation({
        reconciliationId: draft.reconciliationId,
        expectedInventoryWatermark: draft.inventoryWatermark,
        expectedBatchWatermark: draft.batchWatermark,
        physicalBaseUnits: first.inventoryBalanceBaseMicros,
      });
      client.finalizeReconciliation({ reconciliationId: draft.reconciliationId, operationId: testId(7410) });
      const firstAfter = listInventoryCheckAssignmentsByStore(fixture.adapter, fixture.context.store.id).find((row) => row.id === first.id);
      expect(firstAfter).toMatchObject({ status: 'COMPLETED' });
      expect(listInventoryCheckAttemptsByAssignment(fixture.adapter, first.id)).toMatchObject([{ status: 'COMPLETED', reconciliationId: draft.reconciliationId }]);
      expect(submitted.hasSubmission).toBe(true);

      const reopenedOverview = client.getGuidedCheckOverview(at);
      expect(reopenedOverview.pending).toHaveLength(2);
      expect(reopenedOverview.today.filter((assignment) => assignment.status === 'COMPLETED')).toHaveLength(1);
      expect(client.getGuidedCheckOverview('2026-09-19T10:00:00.000Z').pending).toHaveLength(2);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('keeps a physical zero on a positive guided assignment in the reconciliation discrepancy flow', () => {
    const { fixture, client } = seedProducts(1);
    try {
      const assignment = client.generateGuidedChecks({ operationId: testId(7450), now: '2026-09-18T10:00:00.000Z' }).assignments[0];
      const draft = client.startReconciliation(assignment.storeProductId, assignment.id);
      client.submitReconciliation({
        reconciliationId: draft.reconciliationId,
        expectedInventoryWatermark: draft.inventoryWatermark,
        expectedBatchWatermark: draft.batchWatermark,
        physicalBaseUnits: 0,
      });
      const graph = client.finalizeReconciliation({ reconciliationId: draft.reconciliationId, operationId: testId(7460) });
      expect(graph.adjustment).not.toBeNull();
      expect(graph.inventoryEvents[0]).toMatchObject({ sourceType: 'RECONCILIATION', quantityBaseDeltaMicros: -MICROS_PER_UNIT });
      expect(graph.guidedAssignment).toMatchObject({ id: assignment.id, status: 'COMPLETED' });
      expect(graph.guidedAttempt).toMatchObject({ status: 'COMPLETED', reconciliationId: draft.reconciliationId });
      expect(countRows(fixture.adapter, 'inventory_check_assignments')).toBe(1);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('keeps settings store-local, supports pause/window controls, and emits one replayable settings envelope', () => {
    const { fixture, client } = seedProducts(1);
    try {
      const beforeOutbox = countRows(fixture.adapter, 'outbox_operations');
      const settings = client.saveGuidedCheckSettings({
        operationId: testId(7500),
        dailyTarget: 1,
        paused: true,
        windowStartMinute: 600,
        windowEndMinute: 720,
      });
      expect(settings.settings).toMatchObject({ dailyTarget: 1, paused: true, windowStartMinute: 600, windowEndMinute: 720, version: 1 });
      expect(getInventoryCheckSettings(fixture.adapter, fixture.context.store.id)?.version).toBe(1);
      expect(countPendingOutboxOperations(fixture.adapter, fixture.context.store.id)).toBe(beforeOutbox + 1);
      const replay = client.saveGuidedCheckSettings({ operationId: testId(7500), dailyTarget: 1, paused: true, windowStartMinute: 600, windowEndMinute: 720 });
      expect(replay.settings.version).toBe(1);
      expect(countRows(fixture.adapter, 'outbox_operations')).toBe(beforeOutbox + 1);
      expect(client.generateGuidedChecks({ operationId: testId(7510), now: '2026-09-18T10:00:00.000Z' }).assignments).toHaveLength(0);
      expect(client.getGuidedCheckOverview('2026-09-18T10:00:00.000Z').reason).toBe('PAUSED');
      const saved = client.saveGuidedCheckSettings({ operationId: testId(7520), dailyTarget: 1, paused: false, windowStartMinute: 600, windowEndMinute: 720 });
      expect(saved.settings.version).toBe(2);
      expect(client.getGuidedCheckOverview('2026-09-18T08:00:00.000Z').reason).toBe('OUTSIDE_WINDOW');
      expect(client.getGuidedCheckOverview('2026-09-18T10:00:00.000Z').reason).toBe('READY');
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('records replacement reasons without repeating the same day and truthfully exhausts a one-product pool', () => {
    const { fixture, products, client } = seedProducts(2);
    try {
      client.saveGuidedCheckSettings({ operationId: testId(7600), dailyTarget: 1, paused: false, windowStartMinute: 0, windowEndMinute: 1439 });
      const generated = client.generateGuidedChecks({ operationId: testId(7610), now: '2026-09-18T10:00:00.000Z' });
      const old = generated.assignments[0];
      const replaced = client.replaceGuidedCheck({ operationId: testId(7620), assignmentId: old.id, reasonCode: 'UNAVAILABLE', note: 'Shelf is being rearranged.', now: '2026-09-18T10:30:00.000Z' });
      expect(replaced.exhausted).toBe(false);
      expect(replaced.replacementAssignment?.storeProductId).not.toBe(old.storeProductId);
      expect(replaced.replacedAssignment.status).toBe('REPLACED');
      expect(replaced.replacementAssignment?.latestAttempt).toMatchObject({ status: 'OPEN', reasonCode: 'UNAVAILABLE' });
      expect(listInventoryCheckAssignmentsByStore(fixture.adapter, fixture.context.store.id)).toHaveLength(2);

      const solo = seedProducts(1);
      try {
        solo.client.saveGuidedCheckSettings({ operationId: testId(7630), dailyTarget: 1, paused: false, windowStartMinute: 0, windowEndMinute: 1439 });
        const soloAssignment = solo.client.generateGuidedChecks({ operationId: testId(7640), now: '2026-09-18T10:00:00.000Z' }).assignments[0];
        const exhausted = solo.client.replaceGuidedCheck({ operationId: testId(7650), assignmentId: soloAssignment.id, reasonCode: 'UNAVAILABLE', now: '2026-09-18T10:30:00.000Z' });
        expect(exhausted.exhausted).toBe(true);
        expect(exhausted.replacementAssignment).toBeNull();
        expect(exhausted.replacedAssignment.status).toBe('EXHAUSTED');
        expect(listInventoryCheckAssignmentsByStore(solo.fixture.adapter, solo.fixture.context.store.id)).toHaveLength(1);
      } finally {
        solo.fixture.closeAndDelete();
      }
      expect(products.length).toBe(2);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('rejects non-owner management before writes and keeps no-candidate generation free of fake rows', () => {
    const { fixture, client } = seedProducts(1);
    try {
      const staff = createUser(fixture.adapter, { id: testId(7690), displayName: 'Staff' });
      createStoreMember(fixture.adapter, { id: testId(7691), storeId: fixture.context.store.id, userId: staff.id, role: 'STAFF' });
      expect(() => generateGuidedChecks(fixture.adapter, {
        operationId: testId(7692),
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: staff.id,
        now: '2026-09-18T10:00:00.000Z',
      })).toThrow('Only an active store owner');
      client.saveGuidedCheckSettings({ operationId: testId(7700), dailyTarget: 1, paused: false, windowStartMinute: 0, windowEndMinute: 1439 });
      const settingsBefore = getInventoryCheckSettings(fixture.adapter, fixture.context.store.id);
      const generated = client.generateGuidedChecks({ operationId: testId(7710), now: '2026-09-18T10:00:00.000Z' });
      expect(generated.assignments).toHaveLength(1);
      const beforeAssignments = countRows(fixture.adapter, 'inventory_check_assignments');
      const assignment = generated.assignments[0];
      const draft = client.startReconciliation(assignment.storeProductId, assignment.id);
      client.submitReconciliation({ reconciliationId: draft.reconciliationId, expectedInventoryWatermark: draft.inventoryWatermark, expectedBatchWatermark: draft.batchWatermark, physicalBaseUnits: assignment.inventoryBalanceBaseMicros });
      client.finalizeReconciliation({ reconciliationId: draft.reconciliationId, operationId: testId(7720) });
      client.saveGuidedCheckSettings({ operationId: testId(7722), dailyTarget: 2, paused: false, windowStartMinute: 0, windowEndMinute: 1439 });
      const noCandidate = client.generateGuidedChecks({ operationId: testId(7721), now: '2026-09-18T11:00:00.000Z' });
      expect(noCandidate.assignments).toHaveLength(0);
      expect(noCandidate.overview.reason).toBe('NO_ELIGIBLE_CANDIDATE');
      expect(beforeAssignments).toBe(countRows(fixture.adapter, 'inventory_check_assignments'));
      expect(settingsBefore?.dailyTarget).toBe(1);
      expect(getGuidedCheckOverview(fixture.adapter, { storeId: fixture.context.store.id, deviceId: fixture.context.device.id, userId: fixture.context.owner.id, now: '2026-09-18T10:00:00.000Z' }).today[0].status).toBe('COMPLETED');
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('rolls back every guided assignment generation write boundary', () => {
    const probe = seedProducts(3);
    let writeCount = 0;
    try {
      const failing = new FailOnWriteAdapter(probe.fixture.adapter, Number.MAX_SAFE_INTEGER, new Error('generation probe'));
      generateGuidedChecks(failing, {
        operationId: testId(7800),
        storeId: probe.fixture.context.store.id,
        deviceId: probe.fixture.context.device.id,
        userId: probe.fixture.context.owner.id,
        now: '2026-09-18T10:00:00.000Z',
      }, { generateId: deterministicIds(7810) });
      writeCount = failing.writeCount;
    } finally {
      probe.fixture.closeAndDelete();
    }
    expect(writeCount).toBeGreaterThan(0);
    for (let failOnWrite = 1; failOnWrite <= writeCount; failOnWrite += 1) {
      const { fixture } = seedProducts(3);
      try {
        const beforeAssignments = countRows(fixture.adapter, 'inventory_check_assignments');
        const beforeAttempts = countRows(fixture.adapter, 'inventory_check_attempts');
        const beforeOutbox = countRows(fixture.adapter, 'outbox_operations');
        const failing = new FailOnWriteAdapter(fixture.adapter, failOnWrite, new Error(`generation boundary ${failOnWrite}`));
        expect(() => generateGuidedChecks(failing, {
          operationId: testId(7900 + failOnWrite),
          storeId: fixture.context.store.id,
          deviceId: fixture.context.device.id,
          userId: fixture.context.owner.id,
          now: '2026-09-18T10:00:00.000Z',
        }, { generateId: deterministicIds(8000) })).toThrow(`generation boundary ${failOnWrite}`);
        expect(countRows(fixture.adapter, 'inventory_check_assignments')).toBe(beforeAssignments);
        expect(countRows(fixture.adapter, 'inventory_check_attempts')).toBe(beforeAttempts);
        expect(countRows(fixture.adapter, 'outbox_operations')).toBe(beforeOutbox);
      } finally {
        fixture.closeAndDelete();
      }
    }
  });
});
