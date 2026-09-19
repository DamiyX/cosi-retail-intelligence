import { MICROS_PER_UNIT } from '@retail/domain';

import { createCatalogueClient } from '../src/catalogue/client';
import { updateReorderLevel } from '../src/catalogue/updateReorderLevel';
import { createDatabaseInventoryClient } from '../src/inventory/client';
import { saveAttentionSettings, snoozeAttention } from '../src/inventory/attention';
import {
  countPendingOutboxOperations,
  createInventoryEvent,
  createStoreMember,
  createUser,
  getInventoryAttentionSettings,
  getInventoryAttentionSnoozeById,
} from '../src/db/repositories';
import { recordPurchase } from '../src/purchases/recordPurchase';
import { completeSale } from '../src/sales/completeSale';
import { openDatabase, MIGRATIONS } from '../src/db';
import { deterministicIds, FailOnWriteAdapter, openCatalogueFixture, reopenDatabase, testId } from './catalogueSupport';

function buy(fixture: ReturnType<typeof openCatalogueFixture>, product: ReturnType<ReturnType<typeof createCatalogueClient>['createTemporaryProduct']>, quantity: number, operationSuffix: number, expiry?: { precision: 'DAY' | 'MONTH'; value: string; meaning?: 'EXPIRY' | 'BEST_BEFORE' }) {
  recordPurchase(fixture.adapter, {
    storeId: fixture.context.store.id,
    deviceId: fixture.context.device.id,
    userId: fixture.context.owner.id,
    occurredAt: '2026-09-18T08:00:00.000Z',
    lines: [{
      storeProductId: product.storeProduct.id,
      packageUnitId: product.basePackage.id,
      quantityPackagesMicros: quantity * MICROS_PER_UNIT,
      enteredCostMinor: quantity * 100,
      expiryPrecision: expiry?.precision,
      expiryValue: expiry?.value,
      expiryMeaning: expiry?.meaning ?? (expiry ? 'EXPIRY' : undefined),
    }],
  }, { generateId: deterministicIds(operationSuffix), operationId: testId(operationSuffix + 1) });
}

function setReorderLevel(fixture: ReturnType<typeof openCatalogueFixture>, productId: string, units: number): void {
  fixture.adapter.run('UPDATE store_products SET reorder_level_base_micros = ?, version = version + 1 WHERE id = ?;', [units * MICROS_PER_UNIT, productId]);
}

function sellOne(fixture: ReturnType<typeof openCatalogueFixture>, product: ReturnType<ReturnType<typeof createCatalogueClient>['createTemporaryProduct']>, operationSuffix: number): void {
  completeSale(fixture.adapter, {
    storeId: fixture.context.store.id,
    deviceId: fixture.context.device.id,
    userId: fixture.context.owner.id,
    lines: [{ storeProductId: product.storeProduct.id, packageUnitId: product.basePackage.id, quantityPackagesMicros: MICROS_PER_UNIT, unitPriceMinor: 100 }],
    payment: { method: 'CASH' },
  }, { generateId: deterministicIds(operationSuffix), operationId: testId(operationSuffix + 1) });
}

describe('M5 local attention and snooze', () => {
  it('replays a relative snooze without recomputing the due time from the current clock', () => {
    const fixture = openCatalogueFixture();
    try {
      const catalogue = createCatalogueClient(fixture.adapter, fixture.context.store, fixture.context.device, deterministicIds(9800));
      const product = catalogue.createTemporaryProduct({ name: 'Clock-stable rice' });
      buy(fixture, product, 2, 9810);
      setReorderLevel(fixture, product.storeProduct.id, 5);
      const client = createDatabaseInventoryClient(fixture.adapter, { storeId: fixture.context.store.id, deviceId: fixture.context.device.id, userId: fixture.context.owner.id });
      const low = client.getAttentionOverview('2026-09-18T08:00:00.000Z').items.find((item) => item.storeProductId === product.storeProduct.id)!;
      jest.useFakeTimers({ now: new Date('2026-09-18T08:00:00.000Z') });
      try {
        const first = client.snoozeAttention({
          operationId: testId(9820),
          conditionKey: low.conditionKey,
          conditionType: low.conditionType,
          storeProductId: low.storeProductId,
          groupId: low.groupId,
          severityRank: low.severityRank,
          snoozeKind: 'LATER_TODAY',
        });
        jest.setSystemTime(new Date('2026-09-18T09:00:00.000Z'));
        const replay = client.snoozeAttention({
          operationId: testId(9820),
          conditionKey: low.conditionKey,
          conditionType: low.conditionType,
          storeProductId: low.storeProductId,
          groupId: low.groupId,
          severityRank: low.severityRank,
          snoozeKind: 'LATER_TODAY',
        });
        expect(replay.snooze.id).toBe(first.snooze.id);
        expect(replay.snooze.dueLocalMinute).toBe(first.snooze.dueLocalMinute);
      } finally {
        jest.useRealTimers();
      }
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('derives low, zero, negative, unknown, discrepancy and remaining expiry conditions from current truth', () => {
    const fixture = openCatalogueFixture();
    try {
      const catalogue = createCatalogueClient(fixture.adapter, fixture.context.store, fixture.context.device, deterministicIds(9000));
      const low = catalogue.createTemporaryProduct({ name: 'Low rice' });
      const zero = catalogue.createTemporaryProduct({ name: 'Zero beans' });
      const negative = catalogue.createTemporaryProduct({ name: 'Negative flour' });
      const day = catalogue.createTemporaryProduct({ name: 'Day milk' });
      const month = catalogue.createTemporaryProduct({ name: 'Month soap' });
      const unknown = catalogue.createTemporaryProduct({ name: 'Unknown oil' });
      buy(fixture, low, 2, 9010);
      setReorderLevel(fixture, low.storeProduct.id, 3);
      buy(fixture, zero, 1, 9020);
      sellOne(fixture, zero, 9030);
      sellOne(fixture, negative, 9040);
      buy(fixture, day, 4, 9050, { precision: 'DAY', value: '2026-09-19' });
      buy(fixture, month, 4, 9060, { precision: 'MONTH', value: '2026-10' });
      createInventoryEvent(fixture.adapter, {
        id: testId(9070),
        storeId: fixture.context.store.id,
        storeProductId: unknown.storeProduct.id,
        eventType: 'OPENING_BALANCE',
        quantityBaseDeltaMicros: 5 * MICROS_PER_UNIT,
        sourceType: 'OPENING_BALANCE',
        sourceId: testId(9071),
        occurredAt: '2026-09-18T08:00:00.000Z',
        createdByUserId: fixture.context.owner.id,
        deviceId: fixture.context.device.id,
      });
      const client = createDatabaseInventoryClient(fixture.adapter, { storeId: fixture.context.store.id, deviceId: fixture.context.device.id, userId: fixture.context.owner.id });

      const overview = client.getAttentionOverview('2026-09-18T10:00:00.000Z');
      expect(overview.items).toEqual(expect.arrayContaining([
        expect.objectContaining({ storeProductId: low.storeProduct.id, kind: 'LOW_STOCK', primaryAction: 'RESTOCK' }),
        expect.objectContaining({ storeProductId: zero.storeProduct.id, kind: 'ZERO_STOCK' }),
        expect.objectContaining({ storeProductId: negative.storeProduct.id, kind: 'NEGATIVE_STOCK', primaryAction: 'RECONCILE' }),
        expect.objectContaining({ storeProductId: unknown.storeProduct.id, kind: 'UNKNOWN_COVERAGE' }),
        expect.objectContaining({ storeProductId: day.storeProduct.id, kind: 'EXPIRY', severity: 'UPCOMING' }),
        expect.objectContaining({ storeProductId: month.storeProduct.id, kind: 'EXPIRY', severity: 'UPCOMING' }),
      ]));
      expect(overview.items.some((item) => item.storeProductId === day.storeProduct.id && /countdown|days? left/i.test(item.detail))).toBe(false);
      expect(client.getAttentionOverview('2026-09-20T10:00:00.000Z').items).toEqual(expect.arrayContaining([
        expect.objectContaining({ storeProductId: day.storeProduct.id, severity: 'PASSED' }),
      ]));
      expect(client.getAttentionOverview('2026-11-01T10:00:00.000Z').items).toEqual(expect.arrayContaining([
        expect.objectContaining({ storeProductId: month.storeProduct.id, severity: 'PASSED' }),
      ]));
      expect(client.getBatchProjection(day.storeProduct.id).inventoryBalanceBaseMicros).toBe(String(4 * MICROS_PER_UNIT));
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('keeps month-only dates reached through their interval and passes at the next month', () => {
    const fixture = openCatalogueFixture();
    try {
      const catalogue = createCatalogueClient(fixture.adapter, fixture.context.store, fixture.context.device, deterministicIds(9600));
      const october = catalogue.createTemporaryProduct({ name: 'October soap' });
      const bestBefore = catalogue.createTemporaryProduct({ name: 'October flour' });
      const day = catalogue.createTemporaryProduct({ name: 'October milk' });
      const leap = catalogue.createTemporaryProduct({ name: 'Leap soap' });
      buy(fixture, october, 1, 9610, { precision: 'MONTH', value: '2026-10' });
      buy(fixture, bestBefore, 1, 9615, { precision: 'MONTH', value: '2026-10', meaning: 'BEST_BEFORE' });
      buy(fixture, day, 1, 9617, { precision: 'DAY', value: '2026-10-15' });
      buy(fixture, leap, 1, 9620, { precision: 'MONTH', value: '2028-02' });
      const client = createDatabaseInventoryClient(fixture.adapter, { storeId: fixture.context.store.id, deviceId: fixture.context.device.id, userId: fixture.context.owner.id });
      const itemAt = (productId: string, iso: string) => client.getAttentionOverview(iso).items.find((item) => item.storeProductId === productId && item.kind === 'EXPIRY');
      const severityAt = (productId: string, iso: string) => itemAt(productId, iso)?.severity;

      expect(severityAt(october.storeProduct.id, '2026-09-30T10:00:00.000Z')).toBe('UPCOMING');
      for (const iso of ['2026-10-01T10:00:00.000Z', '2026-10-15T10:00:00.000Z', '2026-10-31T10:00:00.000Z']) {
        expect(itemAt(october.storeProduct.id, iso)).toEqual(expect.objectContaining({
          severity: 'REACHED',
          detail: expect.stringContaining('within this month'),
        }));
        expect(itemAt(october.storeProduct.id, iso)?.detail).not.toMatch(/reaches today/i);
      }
      expect(itemAt(october.storeProduct.id, '2026-10-15T10:00:00.000Z')?.title).toContain('expiry');
      expect(itemAt(bestBefore.storeProduct.id, '2026-10-15T10:00:00.000Z')).toEqual(expect.objectContaining({
        severity: 'REACHED',
        title: expect.stringContaining('best-before'),
        detail: expect.stringContaining('within this month'),
      }));
      expect(itemAt(day.storeProduct.id, '2026-10-15T10:00:00.000Z')).toEqual(expect.objectContaining({
        severity: 'REACHED',
        detail: expect.stringContaining('reaches today'),
      }));
      expect(itemAt(day.storeProduct.id, '2026-10-15T10:00:00.000Z')?.detail).not.toMatch(/countdown|days? left/i);
      expect(severityAt(october.storeProduct.id, '2026-11-01T10:00:00.000Z')).toBe('PASSED');
      expect(severityAt(leap.storeProduct.id, '2028-02-29T10:00:00.000Z')).toBe('REACHED');
      expect(severityAt(leap.storeProduct.id, '2028-03-01T10:00:00.000Z')).toBe('PASSED');
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('keeps settings and snoozes replayable, hides due reminders, and resurfaces worsening severity', () => {
    const fixture = openCatalogueFixture();
    try {
      const catalogue = createCatalogueClient(fixture.adapter, fixture.context.store, fixture.context.device, deterministicIds(9100));
      const product = catalogue.createTemporaryProduct({ name: 'Snoozed rice' });
      buy(fixture, product, 2, 9110);
      setReorderLevel(fixture, product.storeProduct.id, 5);
      const client = createDatabaseInventoryClient(fixture.adapter, { storeId: fixture.context.store.id, deviceId: fixture.context.device.id, userId: fixture.context.owner.id, generateId: deterministicIds(9200) });
      const beforeOutbox = countPendingOutboxOperations(fixture.adapter, fixture.context.store.id);
      const saved = client.saveAttentionSettings({ operationId: testId(9210), expiryLeadDays: 0 });
      expect(saved.settings).toMatchObject({ expiryLeadDays: 0, version: 1 });
      expect(countPendingOutboxOperations(fixture.adapter, fixture.context.store.id)).toBe(beforeOutbox + 1);
      expect(client.saveAttentionSettings({ operationId: testId(9210), expiryLeadDays: 0 }).settings.version).toBe(1);
      expect(() => client.saveAttentionSettings({ operationId: testId(9210), expiryLeadDays: 1 })).toThrow('different attention settings');

      const low = client.getAttentionOverview('2026-09-18T08:00:00.000Z').items.find((item) => item.storeProductId === product.storeProduct.id)!;
      const snoozed = client.snoozeAttention({
        operationId: testId(9220),
        conditionKey: low.conditionKey,
        conditionType: low.conditionType,
        storeProductId: low.storeProductId,
        groupId: low.groupId,
        severityRank: low.severityRank,
        snoozeKind: 'LATER_TODAY',
        now: '2026-09-18T08:00:00.000Z',
      });
      expect(snoozed.snooze.dueLocalDate).toBe('2026-09-18');
      expect(client.snoozeAttention({
        operationId: testId(9220),
        conditionKey: low.conditionKey,
        conditionType: low.conditionType,
        storeProductId: low.storeProductId,
        groupId: low.groupId,
        severityRank: low.severityRank,
        snoozeKind: 'LATER_TODAY',
        now: '2026-09-18T08:00:00.000Z',
      }).snooze.id).toBe(snoozed.snooze.id);
      expect(client.snoozeAttention({
        operationId: testId(9220),
        conditionKey: low.conditionKey,
        conditionType: low.conditionType,
        storeProductId: low.storeProductId,
        groupId: low.groupId,
        severityRank: low.severityRank,
        snoozeKind: 'LATER_TODAY',
        now: '2026-09-18T09:30:00.000Z',
      }).snooze.id).toBe(snoozed.snooze.id);
      expect(fixture.adapter.getFirstRow<{ total: number }>('SELECT COUNT(*) AS total FROM inventory_attention_snoozes;')?.total).toBe(1);
      expect(client.getAttentionOverview('2026-09-18T08:30:00.000Z').items).toEqual([
        expect.objectContaining({ storeProductId: product.storeProduct.id, kind: 'UNKNOWN_COVERAGE' }),
      ]);
      expect(client.getAttentionOverview('2026-09-18T08:30:00.000Z').suppressedCount).toBe(1);
      const chosen = client.snoozeAttention({
        operationId: testId(9221),
        conditionKey: low.conditionKey,
        conditionType: low.conditionType,
        storeProductId: low.storeProductId,
        groupId: low.groupId,
        severityRank: low.severityRank,
        snoozeKind: 'CHOOSE_DATE_TIME',
        dueLocalDate: '2026-09-18',
        dueLocalMinute: 600,
        now: '2026-09-18T08:00:00.000Z',
      });
      expect(client.snoozeAttention({
        operationId: testId(9221),
        conditionKey: low.conditionKey,
        conditionType: low.conditionType,
        storeProductId: low.storeProductId,
        groupId: low.groupId,
        severityRank: low.severityRank,
        snoozeKind: 'CHOOSE_DATE_TIME',
        dueLocalDate: '2026-09-18',
        dueLocalMinute: 600,
        now: '2026-09-18T10:00:00.000Z',
      }).snooze.id).toBe(chosen.snooze.id);
      expect(() => client.snoozeAttention({
        operationId: testId(9221),
        conditionKey: low.conditionKey,
        conditionType: low.conditionType,
        storeProductId: low.storeProductId,
        groupId: low.groupId,
        severityRank: low.severityRank,
        snoozeKind: 'CHOOSE_DATE_TIME',
        dueLocalDate: '2026-09-19',
        dueLocalMinute: 600,
        now: '2026-09-18T10:00:00.000Z',
      })).toThrow('different attention snooze');
      expect(fixture.adapter.getFirstRow<{ total: number }>('SELECT COUNT(*) AS total FROM inventory_attention_snoozes;')?.total).toBe(2);

      const projection = client.getBatchProjection(product.storeProduct.id);
      client.recordAdjustment({
        storeProductId: product.storeProduct.id,
        expectedInventoryWatermark: projection.inventoryWatermark,
        expectedBatchWatermark: projection.batchWatermark,
        quantityBaseDeltaMicros: -2 * MICROS_PER_UNIT,
        groupId: projection.groups.find((group) => BigInt(group.balanceBaseMicros) > 0n)?.id,
        reasonCode: 'MISSING',
      });
      expect(client.getAttentionOverview('2026-09-18T08:30:00.000Z').items).toEqual(expect.arrayContaining([
        expect.objectContaining({ storeProductId: product.storeProduct.id, kind: 'ZERO_STOCK' }),
      ]));
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('enforces owner/store relationships, rolls back attention writes, and survives reopen', () => {
    const fixture = openCatalogueFixture();
    try {
      const catalogue = createCatalogueClient(fixture.adapter, fixture.context.store, fixture.context.device, deterministicIds(9300));
      const product = catalogue.createTemporaryProduct({ name: 'Attention oil' });
      buy(fixture, product, 2, 9310);
      setReorderLevel(fixture, product.storeProduct.id, 5);
      const client = createDatabaseInventoryClient(fixture.adapter, { storeId: fixture.context.store.id, deviceId: fixture.context.device.id, userId: fixture.context.owner.id, generateId: deterministicIds(9400) });
      const staff = createUser(fixture.adapter, { id: testId(9320), displayName: 'Staff' });
      createStoreMember(fixture.adapter, { id: testId(9321), storeId: fixture.context.store.id, userId: staff.id, role: 'STAFF' });
      expect(() => saveAttentionSettings(fixture.adapter, {
        operationId: testId(9330), storeId: fixture.context.store.id, deviceId: fixture.context.device.id, userId: staff.id, expiryLeadDays: 5,
      })).toThrow('active store owner');

      const beforeSettings = fixture.adapter.getFirstRow<{ total: number }>('SELECT COUNT(*) AS total FROM inventory_attention_settings;')?.total ?? 0;
      const beforeOutbox = fixture.adapter.getFirstRow<{ total: number }>('SELECT COUNT(*) AS total FROM outbox_operations;')?.total ?? 0;
      expect(() => saveAttentionSettings(new FailOnWriteAdapter(fixture.adapter, 1, new Error('settings boundary')), {
        operationId: testId(9340), storeId: fixture.context.store.id, deviceId: fixture.context.device.id, userId: fixture.context.owner.id, expiryLeadDays: 5,
      })).toThrow('settings boundary');
      expect(fixture.adapter.getFirstRow<{ total: number }>('SELECT COUNT(*) AS total FROM inventory_attention_settings;')?.total).toBe(beforeSettings);
      expect(fixture.adapter.getFirstRow<{ total: number }>('SELECT COUNT(*) AS total FROM outbox_operations;')?.total).toBe(beforeOutbox);

      const lowBeforeSettings = client.getAttentionOverview('2026-09-18T08:00:00.000Z').items[0];
      expect(() => snoozeAttention(new FailOnWriteAdapter(fixture.adapter, 1, new Error('snooze boundary')), {
        operationId: testId(9350), storeId: fixture.context.store.id, deviceId: fixture.context.device.id, userId: fixture.context.owner.id,
        conditionKey: lowBeforeSettings.conditionKey, conditionType: lowBeforeSettings.conditionType, storeProductId: lowBeforeSettings.storeProductId, groupId: lowBeforeSettings.groupId,
        severityRank: lowBeforeSettings.severityRank, snoozeKind: 'TOMORROW', now: '2026-09-18T08:00:00.000Z',
      }, { generateId: deterministicIds(9360) })).toThrow('snooze boundary');
      expect(fixture.adapter.getFirstRow<{ total: number }>('SELECT COUNT(*) AS total FROM inventory_attention_snoozes;')?.total).toBe(0);

      client.saveAttentionSettings({ operationId: testId(9370), expiryLeadDays: 7 });
      const low = client.getAttentionOverview('2026-09-18T08:00:00.000Z').items[0];
      const savedSnooze = client.snoozeAttention({
        operationId: testId(9380), conditionKey: low.conditionKey, conditionType: low.conditionType, storeProductId: low.storeProductId,
        groupId: low.groupId, severityRank: low.severityRank, snoozeKind: 'TOMORROW', now: '2026-09-18T08:00:00.000Z',
      });
      expect(getInventoryAttentionSettings(fixture.adapter, fixture.context.store.id)?.expiryLeadDays).toBe(7);
      expect(getInventoryAttentionSnoozeById(fixture.adapter, savedSnooze.snooze.id)).toBeTruthy();

      const path = fixture.path;
      fixture.adapter.close();
      const reopened = reopenDatabase(path);
      try {
        openDatabase(reopened, MIGRATIONS);
        expect(getInventoryAttentionSettings(reopened, fixture.context.store.id)?.expiryLeadDays).toBe(7);
        expect(getInventoryAttentionSnoozeById(reopened, savedSnooze.snooze.id)?.snoozeKind).toBe('TOMORROW');
      } finally {
        reopened.close();
      }
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('surfaces undated coverage, clears completed discrepancies, and starts a new snooze episode after stock changes', () => {
    const fixture = openCatalogueFixture();
    try {
      const catalogue = createCatalogueClient(fixture.adapter, fixture.context.store, fixture.context.device, deterministicIds(9700));
      const undated = catalogue.createTemporaryProduct({ name: 'Undated rice' });
      const counted = catalogue.createTemporaryProduct({ name: 'Counted rice' });
      const lowProduct = catalogue.createTemporaryProduct({ name: 'Recurring low rice' });
      recordPurchase(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        occurredAt: '2026-09-18T08:00:00.000Z',
        lines: [
          { storeProductId: undated.storeProduct.id, packageUnitId: undated.basePackage.id, quantityPackagesMicros: 2 * MICROS_PER_UNIT, enteredCostMinor: 200, expiryPrecision: 'UNKNOWN', expiryMeaning: 'UNSPECIFIED' },
          { storeProductId: counted.storeProduct.id, packageUnitId: counted.basePackage.id, quantityPackagesMicros: 2 * MICROS_PER_UNIT, enteredCostMinor: 200, expiryPrecision: 'DAY', expiryValue: '2026-09-17', expiryMeaning: 'BEST_BEFORE' },
          { storeProductId: lowProduct.storeProduct.id, packageUnitId: lowProduct.basePackage.id, quantityPackagesMicros: 2 * MICROS_PER_UNIT, enteredCostMinor: 200, expiryPrecision: 'DAY', expiryValue: '2026-12-31', expiryMeaning: 'EXPIRY' },
        ],
      }, { generateId: deterministicIds(9710), operationId: testId(9720) });
      setReorderLevel(fixture, lowProduct.storeProduct.id, 5);
      const client = createDatabaseInventoryClient(fixture.adapter, { storeId: fixture.context.store.id, deviceId: fixture.context.device.id, userId: fixture.context.owner.id, generateId: deterministicIds(9730) });

      const initial = client.getAttentionOverview('2026-09-18T08:00:00.000Z');
      expect(initial.items).toEqual(expect.arrayContaining([
        expect.objectContaining({ storeProductId: undated.storeProduct.id, kind: 'UNKNOWN_COVERAGE', primaryAction: 'RECONCILE' }),
        expect.objectContaining({ storeProductId: counted.storeProduct.id, kind: 'EXPIRY', primaryAction: 'RECONCILE' }),
      ]));

      const firstCheck = client.startReconciliation(counted.storeProduct.id);
      client.submitReconciliation({ reconciliationId: firstCheck.reconciliationId, expectedInventoryWatermark: firstCheck.inventoryWatermark, expectedBatchWatermark: firstCheck.batchWatermark, physicalBaseUnits: MICROS_PER_UNIT });
      expect(client.getAttentionOverview('2026-09-18T08:00:00.000Z').items).toEqual(expect.arrayContaining([
        expect.objectContaining({ storeProductId: counted.storeProduct.id, kind: 'DISCREPANCY', severity: 'UNRESOLVED' }),
      ]));
      client.finalizeReconciliation({ reconciliationId: firstCheck.reconciliationId, operationId: testId(9740) });
      expect(client.getAttentionOverview('2026-09-18T08:00:00.000Z').items.some((item) => item.storeProductId === counted.storeProduct.id && item.kind === 'DISCREPANCY')).toBe(false);

      const low = client.getAttentionOverview('2026-09-18T08:00:00.000Z').items.find((item) => item.storeProductId === lowProduct.storeProduct.id && item.kind === 'LOW_STOCK')!;
      client.snoozeAttention({ operationId: testId(9750), conditionKey: low.conditionKey, conditionType: low.conditionType, storeProductId: low.storeProductId, groupId: low.groupId, severityRank: low.severityRank, snoozeKind: 'LATER_TODAY', now: '2026-09-18T08:00:00.000Z' });
      let projection = client.getBatchProjection(lowProduct.storeProduct.id);
      client.recordAdjustment({ operationId: testId(9760), storeProductId: lowProduct.storeProduct.id, expectedInventoryWatermark: projection.inventoryWatermark, expectedBatchWatermark: projection.batchWatermark, quantityBaseDeltaMicros: 4 * MICROS_PER_UNIT, reasonCode: 'CORRECTION' });
      projection = client.getBatchProjection(lowProduct.storeProduct.id);
      client.recordAdjustment({ operationId: testId(9770), storeProductId: lowProduct.storeProduct.id, expectedInventoryWatermark: projection.inventoryWatermark, expectedBatchWatermark: projection.batchWatermark, quantityBaseDeltaMicros: -MICROS_PER_UNIT, groupId: projection.groups.find((group) => BigInt(group.balanceBaseMicros) > 0n)?.id, reasonCode: 'MISSING' });
      expect(client.getAttentionOverview('2026-09-18T08:30:00.000Z').items).toEqual(expect.arrayContaining([
        expect.objectContaining({ storeProductId: lowProduct.storeProduct.id, kind: 'LOW_STOCK' }),
      ]));
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('keeps active stock snoozes through same-severity movements and settings/restart, then resurfaces after resolution and recurrence', () => {
    const fixture = openCatalogueFixture();
    try {
      const catalogue = createCatalogueClient(fixture.adapter, fixture.context.store, fixture.context.device, deterministicIds(9900));
      const product = catalogue.createTemporaryProduct({ name: 'Episode rice' });
      buy(fixture, product, 4, 9910);
      setReorderLevel(fixture, product.storeProduct.id, 5);
      const client = createDatabaseInventoryClient(fixture.adapter, { storeId: fixture.context.store.id, deviceId: fixture.context.device.id, userId: fixture.context.owner.id, generateId: deterministicIds(9920) });
      const low = client.getAttentionOverview('2026-09-18T08:00:00.000Z').items.find((item) => item.storeProductId === product.storeProduct.id && item.kind === 'LOW_STOCK')!;
      client.snoozeAttention({ operationId: testId(9930), conditionKey: low.conditionKey, conditionType: low.conditionType, storeProductId: low.storeProductId, groupId: low.groupId, severityRank: low.severityRank, snoozeKind: 'LATER_TODAY', now: '2026-09-18T08:00:00.000Z' });

      sellOne(fixture, product, 9940);
      client.saveAttentionSettings({ operationId: testId(9950), expiryLeadDays: 31 });
      const beforeRestart = client.getAttentionOverview('2026-09-18T08:30:00.000Z');
      expect(beforeRestart.items.some((item) => item.storeProductId === product.storeProduct.id && item.kind === 'LOW_STOCK')).toBe(false);

      const path = fixture.path;
      fixture.adapter.close();
      const reopened = reopenDatabase(path);
      try {
        const resumed = createDatabaseInventoryClient(reopened, { storeId: fixture.context.store.id, deviceId: fixture.context.device.id, userId: fixture.context.owner.id, generateId: deterministicIds(9960) });
        expect(resumed.getAttentionOverview('2026-09-18T08:30:00.000Z').items.some((item) => item.storeProductId === product.storeProduct.id && item.kind === 'LOW_STOCK')).toBe(false);

        let projection = resumed.getBatchProjection(product.storeProduct.id);
        resumed.recordAdjustment({ operationId: testId(9970), storeProductId: product.storeProduct.id, expectedInventoryWatermark: projection.inventoryWatermark, expectedBatchWatermark: projection.batchWatermark, quantityBaseDeltaMicros: 4 * MICROS_PER_UNIT, reasonCode: 'CORRECTION' });
        projection = resumed.getBatchProjection(product.storeProduct.id);
        resumed.recordAdjustment({ operationId: testId(9980), storeProductId: product.storeProduct.id, expectedInventoryWatermark: projection.inventoryWatermark, expectedBatchWatermark: projection.batchWatermark, quantityBaseDeltaMicros: -3 * MICROS_PER_UNIT, groupId: projection.groups.find((group) => BigInt(group.balanceBaseMicros) > 0n)?.id, reasonCode: 'MISSING' });
        const recurring = resumed.getAttentionOverview('2026-09-18T08:30:00.000Z');
        expect(recurring.items).toEqual(expect.arrayContaining([
          expect.objectContaining({ storeProductId: product.storeProduct.id, kind: 'LOW_STOCK' }),
        ]));
      } finally {
        reopened.close();
      }
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('keeps expiry snoozes through same-group, unrelated-group and settings movements, then shows them at due time', () => {
    const fixture = openCatalogueFixture();
    try {
      const catalogue = createCatalogueClient(fixture.adapter, fixture.context.store, fixture.context.device, deterministicIds(9990));
      const product = catalogue.createTemporaryProduct({ name: 'Episode soap' });
      buy(fixture, product, 4, 10000, { precision: 'DAY', value: '2026-09-18' });
      buy(fixture, product, 4, 10020, { precision: 'DAY', value: '2026-12-31' });
      const client = createDatabaseInventoryClient(fixture.adapter, { storeId: fixture.context.store.id, deviceId: fixture.context.device.id, userId: fixture.context.owner.id, generateId: deterministicIds(10040) });
      const reached = client.getAttentionOverview('2026-09-18T08:00:00.000Z').items.find((item) => item.storeProductId === product.storeProduct.id && item.kind === 'EXPIRY' && item.groupId !== null)!;
      client.snoozeAttention({ operationId: testId(10050), conditionKey: reached.conditionKey, conditionType: reached.conditionType, storeProductId: reached.storeProductId, groupId: reached.groupId, severityRank: reached.severityRank, snoozeKind: 'LATER_TODAY', now: '2026-09-18T08:00:00.000Z' });

      let projection = client.getBatchProjection(product.storeProduct.id);
      const reachedGroup = projection.groups.find((group) => group.id === reached.groupId)!;
      const unrelatedGroup = projection.groups.find((group) => group.id !== reached.groupId)!;
      client.recordAdjustment({ operationId: testId(10060), storeProductId: product.storeProduct.id, expectedInventoryWatermark: projection.inventoryWatermark, expectedBatchWatermark: projection.batchWatermark, quantityBaseDeltaMicros: -MICROS_PER_UNIT, groupId: reachedGroup.id, reasonCode: 'MISSING' });
      projection = client.getBatchProjection(product.storeProduct.id);
      client.recordAdjustment({ operationId: testId(10070), storeProductId: product.storeProduct.id, expectedInventoryWatermark: projection.inventoryWatermark, expectedBatchWatermark: projection.batchWatermark, quantityBaseDeltaMicros: -MICROS_PER_UNIT, groupId: unrelatedGroup.id, reasonCode: 'MISSING' });
      client.saveAttentionSettings({ operationId: testId(10080), expiryLeadDays: 31 });

      const beforeDue = client.getAttentionOverview('2026-09-18T08:30:00.000Z');
      expect(beforeDue.items.some((item) => item.groupId === reached.groupId && item.kind === 'EXPIRY')).toBe(false);
      const atDue = client.getAttentionOverview('2026-09-18T09:01:00.000Z');
      expect(atDue.items).toEqual(expect.arrayContaining([
        expect.objectContaining({ groupId: reached.groupId, kind: 'EXPIRY', severity: 'REACHED' }),
      ]));
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('starts a new low-stock episode when a threshold resolves and recreates it without an overview read', () => {
    const fixture = openCatalogueFixture();
    const path = fixture.path;
    try {
      const catalogue = createCatalogueClient(fixture.adapter, fixture.context.store, fixture.context.device, deterministicIds(10100));
      const product = catalogue.createTemporaryProduct({ name: 'Threshold episode rice' });
      buy(fixture, product, 4, 10110);
      const initial = catalogue.getProductDetail(product.storeProduct.id);
      if (!initial) throw new Error('Threshold episode product missing.');
      const setFive = updateReorderLevel(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        storeProductId: product.storeProduct.id,
        reorderLevelBaseMicros: 5 * MICROS_PER_UNIT,
        expectedVersion: initial.product.version,
      }, { generateId: deterministicIds(10120), operationId: testId(10121) });
      const staff = createUser(fixture.adapter, { id: testId(10122), displayName: 'Threshold staff' });
      createStoreMember(fixture.adapter, {
        id: testId(10123),
        storeId: fixture.context.store.id,
        userId: staff.id,
        role: 'STAFF',
      });
      expect(() => updateReorderLevel(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: staff.id,
        storeProductId: product.storeProduct.id,
        reorderLevelBaseMicros: 6 * MICROS_PER_UNIT,
        expectedVersion: setFive.storeProduct.version,
      }, { operationId: testId(10124) })).toThrow('active store owner');
      const client = createDatabaseInventoryClient(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
      });
      const low = client.getAttentionOverview('2026-09-18T08:00:00.000Z').items.find((item) => item.storeProductId === product.storeProduct.id && item.kind === 'LOW_STOCK');
      if (!low) throw new Error('Expected low-stock episode before snoozing.');
      client.snoozeAttention({
        operationId: testId(10130),
        conditionKey: low.conditionKey,
        conditionType: low.conditionType,
        storeProductId: low.storeProductId,
        groupId: low.groupId,
        severityRank: low.severityRank,
        snoozeKind: 'TOMORROW',
        now: '2026-09-18T08:00:00.000Z',
      });

      const sameActive = updateReorderLevel(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        storeProductId: product.storeProduct.id,
        reorderLevelBaseMicros: 6 * MICROS_PER_UNIT,
        expectedVersion: setFive.storeProduct.version,
      }, { generateId: deterministicIds(10140), operationId: testId(10141) });
      const outboxBeforeReplay = countPendingOutboxOperations(fixture.adapter, fixture.context.store.id);
      const replay = updateReorderLevel(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        storeProductId: product.storeProduct.id,
        reorderLevelBaseMicros: 6 * MICROS_PER_UNIT,
        expectedVersion: setFive.storeProduct.version,
      }, { generateId: deterministicIds(10150), operationId: testId(10141) });
      expect(replay.storeProduct.version).toBe(sameActive.storeProduct.version);
      expect(countPendingOutboxOperations(fixture.adapter, fixture.context.store.id)).toBe(outboxBeforeReplay);
      expect(client.getAttentionOverview('2026-09-18T08:20:00.000Z').items.some((item) => item.storeProductId === product.storeProduct.id && item.kind === 'LOW_STOCK')).toBe(false);

      const resolved = updateReorderLevel(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        storeProductId: product.storeProduct.id,
        reorderLevelBaseMicros: 3 * MICROS_PER_UNIT,
        expectedVersion: sameActive.storeProduct.version,
      }, { generateId: deterministicIds(10160), operationId: testId(10161) });
      updateReorderLevel(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        storeProductId: product.storeProduct.id,
        reorderLevelBaseMicros: 5 * MICROS_PER_UNIT,
        expectedVersion: resolved.storeProduct.version,
      }, { generateId: deterministicIds(10170), operationId: testId(10171) });

      fixture.adapter.close();
      const reopened = reopenDatabase(path);
      try {
        const resumed = createDatabaseInventoryClient(reopened, {
          storeId: fixture.context.store.id,
          deviceId: fixture.context.device.id,
          userId: fixture.context.owner.id,
        });
        const recurring = resumed.getAttentionOverview('2026-09-18T08:20:00.000Z');
        const recurringItem = recurring.items.find((item) => item.storeProductId === product.storeProduct.id && item.kind === 'LOW_STOCK');
        expect(recurringItem).toEqual(expect.objectContaining({ storeProductId: product.storeProduct.id, kind: 'LOW_STOCK' }));
        expect(recurringItem?.conditionKey).not.toBe(low.conditionKey);
        expect(recurring.suppressedCount).toBe(0);
      } finally {
        reopened.close();
      }
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('rebuilds an interleaved inventory recurrence after a threshold resolution and same-active edit', () => {
    const fixture = openCatalogueFixture();
    const path = fixture.path;
    try {
      const catalogue = createCatalogueClient(fixture.adapter, fixture.context.store, fixture.context.device, deterministicIds(10200));
      const product = catalogue.createTemporaryProduct({ name: 'Interleaved episode rice' });
      buy(fixture, product, 4, 10210);
      const initial = catalogue.getProductDetail(product.storeProduct.id);
      if (!initial) throw new Error('Interleaved episode product missing.');

      const thresholdFive = updateReorderLevel(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        storeProductId: product.storeProduct.id,
        reorderLevelBaseMicros: 5 * MICROS_PER_UNIT,
        expectedVersion: initial.product.version,
      }, { generateId: deterministicIds(10220), operationId: testId(10221) });
      const client = createDatabaseInventoryClient(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
      });
      const low = client.getAttentionOverview('2026-09-18T08:00:00.000Z').items.find((item) => item.storeProductId === product.storeProduct.id && item.kind === 'LOW_STOCK');
      if (!low) throw new Error('Expected interleaved low-stock episode before snoozing.');
      client.snoozeAttention({
        operationId: testId(10230),
        conditionKey: low.conditionKey,
        conditionType: low.conditionType,
        storeProductId: low.storeProductId,
        groupId: low.groupId,
        severityRank: low.severityRank,
        snoozeKind: 'TOMORROW',
        now: '2026-09-18T08:00:00.000Z',
      });

      const thresholdThree = updateReorderLevel(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        storeProductId: product.storeProduct.id,
        reorderLevelBaseMicros: 3 * MICROS_PER_UNIT,
        expectedVersion: thresholdFive.storeProduct.version,
      }, { generateId: deterministicIds(10240), operationId: testId(10241) });
      sellOne(fixture, product, 10250);
      sellOne(fixture, product, 10260);
      updateReorderLevel(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        storeProductId: product.storeProduct.id,
        reorderLevelBaseMicros: 5 * MICROS_PER_UNIT,
        expectedVersion: thresholdThree.storeProduct.version,
      }, { generateId: deterministicIds(10270), operationId: testId(10271) });

      fixture.adapter.close();
      const reopened = reopenDatabase(path);
      try {
        const resumed = createDatabaseInventoryClient(reopened, {
          storeId: fixture.context.store.id,
          deviceId: fixture.context.device.id,
          userId: fixture.context.owner.id,
        });
        const overview = resumed.getAttentionOverview('2026-09-18T08:20:00.000Z');
        const recurring = overview.items.find((item) => item.storeProductId === product.storeProduct.id && item.kind === 'LOW_STOCK');
        expect(recurring).toEqual(expect.objectContaining({ storeProductId: product.storeProduct.id, kind: 'LOW_STOCK' }));
        expect(recurring?.conditionKey).not.toBe(low.conditionKey);
        expect(overview.suppressedCount).toBe(0);
        expect(resumed.getBatchProjection(product.storeProduct.id).inventoryBalanceBaseMicros).toBe(String(2 * MICROS_PER_UNIT));
      } finally {
        reopened.close();
      }
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('rebuilds an inventory-resolved episode before threshold recurrence and preserves it through a same-active edit', () => {
    const fixture = openCatalogueFixture();
    try {
      const catalogue = createCatalogueClient(fixture.adapter, fixture.context.store, fixture.context.device, deterministicIds(10300));
      const product = catalogue.createTemporaryProduct({ name: 'Inverse episode rice' });
      buy(fixture, product, 4, 10310);
      const initial = catalogue.getProductDetail(product.storeProduct.id);
      if (!initial) throw new Error('Inverse episode product missing.');
      const thresholdFive = updateReorderLevel(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        storeProductId: product.storeProduct.id,
        reorderLevelBaseMicros: 5 * MICROS_PER_UNIT,
        expectedVersion: initial.product.version,
      }, { generateId: deterministicIds(10320), operationId: testId(10321) });
      const client = createDatabaseInventoryClient(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
      });
      const low = client.getAttentionOverview('2026-09-18T08:00:00.000Z').items.find((item) => item.storeProductId === product.storeProduct.id && item.kind === 'LOW_STOCK');
      if (!low) throw new Error('Expected inverse low-stock episode before snoozing.');
      client.snoozeAttention({
        operationId: testId(10330),
        conditionKey: low.conditionKey,
        conditionType: low.conditionType,
        storeProductId: low.storeProductId,
        groupId: low.groupId,
        severityRank: low.severityRank,
        snoozeKind: 'TOMORROW',
        now: '2026-09-18T08:00:00.000Z',
      });

      buy(fixture, product, 2, 10340);
      const thresholdSeven = updateReorderLevel(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        storeProductId: product.storeProduct.id,
        reorderLevelBaseMicros: 7 * MICROS_PER_UNIT,
        expectedVersion: thresholdFive.storeProduct.version,
      }, { generateId: deterministicIds(10350), operationId: testId(10351) });
      updateReorderLevel(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        storeProductId: product.storeProduct.id,
        reorderLevelBaseMicros: 9 * MICROS_PER_UNIT,
        expectedVersion: thresholdSeven.storeProduct.version,
      }, { generateId: deterministicIds(10360), operationId: testId(10361) });

      const overview = client.getAttentionOverview('2026-09-18T08:20:00.000Z');
      const recurring = overview.items.find((item) => item.storeProductId === product.storeProduct.id && item.kind === 'LOW_STOCK');
      expect(recurring).toEqual(expect.objectContaining({ storeProductId: product.storeProduct.id, kind: 'LOW_STOCK' }));
      expect(recurring?.conditionKey).not.toBe(low.conditionKey);
      expect(overview.suppressedCount).toBe(0);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('keeps low-stock episode identity after acknowledged threshold outbox cleanup', () => {
    const fixture = openCatalogueFixture();
    try {
      const catalogue = createCatalogueClient(fixture.adapter, fixture.context.store, fixture.context.device, deterministicIds(10400));
      const product = catalogue.createTemporaryProduct({ name: 'Durable episode rice' });
      buy(fixture, product, 4, 10410);
      const initial = catalogue.getProductDetail(product.storeProduct.id);
      if (!initial) throw new Error('Durable episode product missing.');
      updateReorderLevel(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        storeProductId: product.storeProduct.id,
        reorderLevelBaseMicros: 5 * MICROS_PER_UNIT,
        expectedVersion: initial.product.version,
      }, { generateId: deterministicIds(10420), operationId: testId(10421) });
      const client = createDatabaseInventoryClient(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
      });
      const low = client.getAttentionOverview('2026-09-18T08:00:00.000Z').items.find((item) => item.kind === 'LOW_STOCK');
      if (!low) throw new Error('Expected durable low-stock condition.');
      client.snoozeAttention({
        operationId: testId(10430), conditionKey: low.conditionKey,
        conditionType: low.conditionType, storeProductId: low.storeProductId,
        groupId: low.groupId, severityRank: low.severityRank,
        snoozeKind: 'TOMORROW', now: '2026-09-18T08:00:00.000Z',
      });

      // M7 may clean acknowledged transport rows. Business episode identity
      // must continue to come from its immutable domain history.
      fixture.adapter.run("DELETE FROM outbox_operations WHERE operation_type = 'PRODUCT_REORDER_LEVEL_UPDATED';");
      const beforeDue = client.getAttentionOverview('2026-09-18T08:20:00.000Z');
      expect(beforeDue.items.some((item) => item.kind === 'LOW_STOCK')).toBe(false);
      expect(beforeDue.suppressedCount).toBeGreaterThan(0);
      const atDue = client.getAttentionOverview('2026-09-19T09:01:00.000Z');
      expect(atDue.items.find((item) => item.kind === 'LOW_STOCK')?.conditionKey).toBe(low.conditionKey);
      expect(() => fixture.adapter.run('DELETE FROM store_product_reorder_level_history;')).toThrow('immutable');
    } finally {
      fixture.closeAndDelete();
    }
  });
});
