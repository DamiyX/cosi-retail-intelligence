import { parseSyncOperationEnvelope, type SyncPullResponse } from '@retail/contracts';
import { MICROS_PER_UNIT } from '@retail/domain';
import { cleanupAsync, renderAsync, screen } from '@testing-library/react-native';

import { createCatalogueClient } from '../src/catalogue/client';
import { createTemporaryProduct } from '../src/catalogue/createTemporaryProduct';
import { MIGRATIONS, openDatabase } from '../src/db';
import type { DatabaseAdapter } from '../src/db/adapter';
import {
  createDevice, createStoreMember, createUser, ensureSyncStoreState,
  findOutboxOperation, getSyncStoreState, type OutboxOperationRow,
} from '../src/db/repositories';
import { createDatabaseFinanceClient } from '../src/finance/client';
import { createDatabasePersonalPriceClient, createPersonalPriceClientForActiveContext } from '../src/priceIntelligence/client';
import { recordPurchase } from '../src/purchases/recordPurchase';
import HomeScreen from '../src/screens/home/HomeScreen';
import PersonalPriceChangesScreen from '../src/screens/products/PersonalPriceChangesScreen';
import { provisionStoreContext } from '../src/storeContext/provisionStoreContext';
import { applySyncPullPage } from '../src/sync/applier';
import { materializeSyncOperation } from '../src/sync/materialize';
import {
  countRows, deterministicIds, openCatalogueFixture, reopenDatabase,
  syncReferenceContextFor, testId,
} from './catalogueSupport';

const NOW = '2026-09-20T10:00:00.000Z';

/** Read every durable table, including business facts, projections and outbox. */
function snapshot(adapter: DatabaseAdapter) {
  return adapter.getAllRows<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name;",
  ).map(({ name }) => ({
    name,
    rows: adapter.getAllRows(`SELECT * FROM "${name.replace(/"/g, '""')}" ORDER BY rowid;`),
  }));
}

function pullPage(outbox: OutboxOperationRow, revision: number): SyncPullResponse {
  return {
    protocolVersion: 1, payloadVersion: 1,
    changes: [{
      operationId: outbox.operationId, storeId: outbox.storeId,
      entityType: outbox.entityType, entityId: outbox.entityId,
      operationType: outbox.operationType, changeType: 'UPSERT', payloadVersion: 1,
      payload: parseSyncOperationEnvelope(JSON.parse(outbox.payload)),
      entityVersion: 1, serverRevision: revision, occurredAt: NOW,
    }],
    nextCursor: { revision, changeIndex: 0 }, hasMore: false, serverRevision: revision,
  };
}

function setup() {
  const origin = openCatalogueFixture();
  const receiver = openCatalogueFixture();
  try {
    const storeId = origin.context.store.id;
    const userId = origin.context.owner.id;
    const receiverDeviceId = testId(8000);
    // The same accepted store/member context, with a genuinely different writer device.
    for (const fixture of [origin, receiver]) {
      createDevice(fixture.adapter, {
        id: receiverDeviceId, storeId, userId, platform: 'ANDROID',
        appVersion: '0.0.1', deviceLabel: 'Receiving phone',
      });
    }
    expect(receiverDeviceId).not.toBe(origin.context.device.id);
    ensureSyncStoreState(receiver.adapter, { storeId, deviceId: receiverDeviceId, now: NOW });
    const product = createTemporaryProduct(origin.adapter, {
      storeId, deviceId: origin.context.device.id, name: 'Pulled rice',
    }, { generateId: deterministicIds(8100), operationId: testId(8099) });
    const apply = (outbox: OutboxOperationRow, revision: number) => applySyncPullPage(
      receiver.adapter, pullPage(outbox, revision), {
        storeId, referenceContext: syncReferenceContextFor(origin, revision),
        options: { now: NOW, conflictIdFactory: () => testId(8999) },
      },
    );
    expect(apply(product.outbox, 1)).toMatchObject({ applied: 1, echoes: 0, conflicts: 0 });
    expect(countRows(receiver.adapter, 'outbox_operations')).toBe(0);
    const restock = (fixture: typeof origin, deviceId: string, day: number, cost: number, quantity: number, ids: number) => recordPurchase(
      fixture.adapter, {
        storeId, deviceId, userId, occurredAt: `2026-09-0${day}T10:00:00.000Z`,
        lines: [{
          storeProductId: product.storeProduct.id, packageUnitId: product.basePackage.id,
          quantityPackagesMicros: quantity * MICROS_PER_UNIT, enteredCostMinor: cost,
        }],
      }, { generateId: deterministicIds(ids), operationId: testId(ids - 1) },
    );
    const firstRemote = restock(origin, origin.context.device.id, 1, 90, 3, 8200);
    expect(apply(firstRemote.outbox, 2)).toMatchObject({ applied: 1, echoes: 0 });
    const local = restock(receiver, receiverDeviceId, 2, 50, 2, 8300);
    const latestRemote = restock(origin, origin.context.device.id, 3, 100, 3, 8400);
    expect(apply(latestRemote.outbox, 3)).toMatchObject({ applied: 1, echoes: 0 });
    const client = createDatabasePersonalPriceClient(receiver.adapter, { storeId, userId, deviceId: receiverDeviceId });
    return { origin, receiver, storeId, userId, receiverDeviceId, product, local, firstRemote, latestRemote, apply, client };
  } catch (error) {
    origin.closeAndDelete(); receiver.closeAndDelete(); throw error;
  }
}

describe('M9 integration with current M7 SQLite pull/materialization', () => {
  it.each(['INACTIVE', 'SUSPENDED'] as const)('denies a stored %s account after valid M7 suspension and restart with ACTIVE membership', async (status) => {
    const fixture = setup();
    const { receiver, origin, client, product, storeId, userId, receiverDeviceId } = fixture;
    try {
      expect(client.getProductPurchasePriceHistory(product.storeProduct.id)).toHaveLength(3);
      expect(client.listPriceChanges()).toHaveLength(1);
      const context = syncReferenceContextFor(origin, 4);
      expect(applySyncPullPage(receiver.adapter, pullPage(fixture.latestRemote.outbox, 4), {
        storeId,
        referenceContext: { ...context, users: context.users.map(user => user.id === userId ? { ...user, status: 'SUSPENDED' as const } : user) },
        options: { now: NOW, conflictIdFactory: () => testId(9991) },
      })).toMatchObject({ applied: 1, echoes: 0, conflicts: 0, cursorRevision: 4 });
      expect(receiver.adapter.getFirstRow('SELECT status FROM users WHERE id = ?;', [userId])).toEqual({ status: 'SUSPENDED' });
      // M7 references permit ACTIVE/SUSPENDED accounts. INACTIVE is a local
      // account state; keep it out of the accepted reference DTO and protocol.
      if (status === 'INACTIVE') receiver.adapter.run('UPDATE users SET status = ? WHERE id = ?;', [status, userId]);
      expect(receiver.adapter.getFirstRow('SELECT status FROM users WHERE id = ?;', [userId])).toEqual({ status });
      expect(receiver.adapter.getFirstRow('SELECT role, status FROM store_members WHERE id = ?;', [receiver.context.membership.id]))
        .toEqual({ role: 'OWNER', status: 'ACTIVE' });
      expect(countRows(receiver.adapter, 'price_observations')).toBe(3);
      expect(findOutboxOperation(receiver.adapter, fixture.local.outbox.operationId)?.status).toBe('PENDING');
      const beforeDenied = snapshot(receiver.adapter);
      const writesBeforeDenied = receiver.adapter.getFirstRow('SELECT total_changes() AS total;');
      for (const read of [
        () => client.getProductPriceComparison(product.storeProduct.id),
        () => client.getProductPurchasePriceHistory(product.storeProduct.id),
        () => client.listPriceChanges(), () => client.getOverview(),
        () => createDatabasePersonalPriceClient(receiver.adapter, { storeId, userId, deviceId: receiverDeviceId }),
        () => createPersonalPriceClientForActiveContext(receiver.adapter, storeId),
      ]) expect(read).toThrow(/active store owner/i);
      const deniedList = await renderAsync(<PersonalPriceChangesScreen
        client={client} onOpenProduct={() => undefined} onOpenPurchaseHistory={() => undefined}
      />);
      expect(screen.getByText('Personal price changes unavailable')).toBeTruthy();
      expect(screen.queryByText('Pulled rice')).toBeNull();
      await deniedList.unmountAsync();
      expect(snapshot(receiver.adapter)).toEqual(beforeDenied);
      expect(receiver.adapter.getFirstRow('SELECT total_changes() AS total;')).toEqual(writesBeforeDenied);

      receiver.adapter.close();
      const reopened = reopenDatabase(receiver.path);
      try {
        expect(openDatabase(reopened, MIGRATIONS).schemaVersion).toBe(28);
        expect(reopened.getFirstRow('SELECT status FROM users WHERE id = ?;', [userId])).toEqual({ status });
        const beforeRestartReads = snapshot(reopened);
        const writesBeforeRestartReads = reopened.getFirstRow('SELECT total_changes() AS total;');
        expect(() => createDatabasePersonalPriceClient(reopened, { storeId, userId, deviceId: fixture.receiverDeviceId })).toThrow(/active store owner/i);
        expect(() => createPersonalPriceClientForActiveContext(reopened, storeId)).toThrow(/active store owner/i);
        expect(snapshot(reopened)).toEqual(beforeRestartReads);
        expect(reopened.getFirstRow('SELECT total_changes() AS total;')).toEqual(writesBeforeRestartReads);

        reopened.run("UPDATE users SET status = 'ACTIVE' WHERE id = ?;", [userId]);
        const restartedClient = createDatabasePersonalPriceClient(reopened, { storeId, userId, deviceId: fixture.receiverDeviceId });
        expect(restartedClient.getProductPurchasePriceHistory(product.storeProduct.id)).toHaveLength(3);
        expect(restartedClient.getProductPriceComparison(product.storeProduct.id)?.comparison).toMatchObject({ kind: 'comparison', percentageTenths: '333' });
        expect(restartedClient.listPriceChanges()).toHaveLength(1);
        expect(restartedClient.getOverview()).toEqual({ oneObservationProductCount: 0, unchangedComparisonCount: 0 });
        reopened.run('UPDATE users SET status = ? WHERE id = ?;', [status, userId]);
        const beforeExistingRestartReads = snapshot(reopened);
        const writesBeforeExistingRestartReads = reopened.getFirstRow('SELECT total_changes() AS total;');
        for (const read of [
          () => restartedClient.getProductPriceComparison(product.storeProduct.id),
          () => restartedClient.getProductPurchasePriceHistory(product.storeProduct.id),
          () => restartedClient.listPriceChanges(), () => restartedClient.getOverview(),
        ]) expect(read).toThrow(/active store owner/i);
        expect(snapshot(reopened)).toEqual(beforeExistingRestartReads);
        expect(reopened.getFirstRow('SELECT total_changes() AS total;')).toEqual(writesBeforeExistingRestartReads);
      } finally { await cleanupAsync(); reopened.close(); }
    } finally { origin.closeAndDelete(); receiver.closeAndDelete(); }
  }, 15000);

  it('combines remote and pending local rational costs, deduplicates replay/echo, and survives restart', async () => {
    const fixture = setup();
    const { receiver, origin, client, product, local, latestRemote, storeId, userId, apply } = fixture;
    try {
      expect(findOutboxOperation(receiver.adapter, local.outbox.operationId)?.status).toBe('PENDING');
      const comparison = client.getProductPriceComparison(product.storeProduct.id)!;
      expect(comparison.historyCount).toBe(3);
      expect(comparison.comparison).toMatchObject({
        kind: 'comparison', basis: 'PACKAGE', direction: 'INCREASE', percentageTenths: '333',
        latestId: latestRemote.observations[0].id, previousId: local.observations[0].id,
      });
      expect(comparison.latest).toMatchObject({ packageCostNumerator: '100', packageCostDenominator: '3', contributionConsent: false });
      expect(comparison.previous).toMatchObject({ packageCostNumerator: '25', packageCostDenominator: '1' });
      expect(receiver.adapter.getAllRows('SELECT device_id FROM purchases ORDER BY occurred_at;')).toEqual([
        { device_id: origin.context.device.id }, { device_id: fixture.receiverDeviceId }, { device_id: origin.context.device.id },
      ]);

      const beforeReads = snapshot(receiver.adapter);
      const changesBeforeReads = receiver.adapter.getFirstRow('SELECT total_changes() AS total;');
      const history = client.getProductPurchasePriceHistory(product.storeProduct.id)!;
      expect(history).toHaveLength(3);
      expect(client.listPriceChanges()).toHaveLength(1);
      expect(client.getOverview()).toEqual({ oneObservationProductCount: 0, unchangedComparisonCount: 0 });
      expect(client.getProductPriceComparison(product.storeProduct.id)).toEqual(comparison);
      expect(snapshot(receiver.adapter)).toEqual(beforeReads);
      expect(receiver.adapter.getFirstRow('SELECT total_changes() AS total;')).toEqual(changesBeforeReads);

      // Current M7 rejects a stale page before writing, rather than rewinding its cursor.
      expect(() => apply(latestRemote.outbox, 3)).toThrow(/cursor/i);
      expect(snapshot(receiver.adapter)).toEqual(beforeReads);
      // Redelivered aggregate at a new cursor and direct materialization both deduplicate facts.
      expect(apply(latestRemote.outbox, 4)).toMatchObject({ applied: 1, echoes: 0, conflicts: 0 });
      receiver.adapter.transaction(() => materializeSyncOperation(
        receiver.adapter, parseSyncOperationEnvelope(JSON.parse(latestRemote.outbox.payload)),
      ));
      expect(countRows(receiver.adapter, 'purchases')).toBe(3);
      expect(countRows(receiver.adapter, 'price_observations')).toBe(3);
      expect(countRows(receiver.adapter, 'inventory_events')).toBe(3);
      expect(client.getProductPriceComparison(product.storeProduct.id)?.comparison).toEqual(comparison.comparison);
      expect(client.getProductPurchasePriceHistory(product.storeProduct.id)).toEqual(history);
      expect(countRows(receiver.adapter, 'outbox_operations')).toBe(1);
      expect(findOutboxOperation(receiver.adapter, local.outbox.operationId)?.status).toBe('PENDING');

      expect(apply(local.outbox, 5)).toMatchObject({ applied: 0, echoes: 1, conflicts: 0 });
      expect(findOutboxOperation(receiver.adapter, local.outbox.operationId)?.status).toBe('SYNCED');
      expect(apply(local.outbox, 6)).toMatchObject({ applied: 0, echoes: 1, conflicts: 0 });
      expect(client.getProductPurchasePriceHistory(product.storeProduct.id)).toEqual(history);
      expect(client.listPriceChanges()).toHaveLength(1);
      expect(countRows(receiver.adapter, 'outbox_operations')).toBe(1);

      receiver.adapter.close();
      const reopened = reopenDatabase(receiver.path);
      try {
        const beforeOpen = snapshot(reopened);
        expect(openDatabase(reopened, MIGRATIONS).schemaVersion).toBe(28);
        expect(snapshot(reopened)).toEqual(beforeOpen);
        const restartedClient = createDatabasePersonalPriceClient(reopened, { storeId, userId, deviceId: fixture.receiverDeviceId });
        expect(restartedClient.getProductPriceComparison(product.storeProduct.id)?.comparison).toEqual(comparison.comparison);
        expect(restartedClient.getProductPurchasePriceHistory(product.storeProduct.id)).toEqual(history);
        expect(restartedClient.listPriceChanges()).toHaveLength(1);
        expect(getSyncStoreState(reopened, storeId)).toMatchObject({ cursorRevision: 6, deviceId: fixture.receiverDeviceId });
        const beforePresentation = snapshot(reopened);
        const changesBeforePresentation = reopened.getFirstRow('SELECT total_changes() AS total;');
        const home = await renderAsync(<HomeScreen
          financeClient={createDatabaseFinanceClient(reopened, { storeId, userId, deviceId: fixture.receiverDeviceId })} inventoryClient={null}
          personalPriceClient={restartedClient} isFocused={false}
          onSell={() => undefined} onRestock={() => undefined} onStockChecks={() => undefined}
          onRecordExpense={() => undefined} onOpenSummary={() => undefined} onSeeAttention={() => undefined}
          onSeePriceChanges={() => undefined} onOpenPriceProduct={() => undefined}
        />);
        expect(screen.getAllByText('Pulled rice')).toHaveLength(1);
        expect(screen.getByText('Increase · 33.3% · per piece')).toBeTruthy();
        await home.unmountAsync();
        const list = await renderAsync(<PersonalPriceChangesScreen
          client={restartedClient} onOpenProduct={() => undefined} onOpenPurchaseHistory={() => undefined}
        />);
        expect(screen.getAllByText('Pulled rice')).toHaveLength(1);
        expect(screen.getByText('Per piece · Increase · 33.3%')).toBeTruthy();
        await list.unmountAsync();
        expect(snapshot(reopened)).toEqual(beforePresentation);
        expect(reopened.getFirstRow('SELECT total_changes() AS total;')).toEqual(changesBeforePresentation);
      } finally { await cleanupAsync(); reopened.close(); }
    } finally { origin.closeAndDelete(); receiver.closeAndDelete(); }
  });

  it('denies STAFF, foreign owners and direct foreign IDs after pull, and rechecks every read on demotion/revocation', () => {
    const fixture = setup();
    const { receiver, origin, client, product, storeId, userId } = fixture;
    try {
      const staff = createUser(receiver.adapter, { id: testId(8500), displayName: 'Staff' });
      createStoreMember(receiver.adapter, { id: testId(8501), storeId, userId: staff.id, role: 'STAFF' });
      expect(() => createDatabasePersonalPriceClient(receiver.adapter, { storeId, userId: staff.id })).toThrow(/active store owner/i);
      const other = provisionStoreContext(receiver.adapter, {
        ownerDisplayName: 'Foreign owner', storeName: 'Foreign store', currencyCode: 'NGN',
        countryCode: 'NG', timezone: 'Africa/Lagos', appVersion: '0.0.1',
      }, { generateId: deterministicIds(8600) });
      const otherProduct = createTemporaryProduct(receiver.adapter, {
        storeId: other.store.id, deviceId: other.device.id, name: 'Private foreign product',
      }, { generateId: deterministicIds(8700), operationId: testId(8699) });
      ensureSyncStoreState(receiver.adapter, { storeId: other.store.id, deviceId: other.device.id, now: NOW });
      for (let index = 0; index < 2; index += 1) {
        recordPurchase(receiver.adapter, {
          storeId: other.store.id, deviceId: other.device.id, userId: other.owner.id,
          occurredAt: `2026-09-0${index + 1}T10:00:00.000Z`,
          lines: [{ storeProductId: otherProduct.storeProduct.id, packageUnitId: otherProduct.basePackage.id,
            quantityPackagesMicros: MICROS_PER_UNIT, enteredCostMinor: 100 + 50 * index }],
        }, { generateId: deterministicIds(8800 + index * 100), operationId: testId(8799 + index * 100) });
      }
      const before = snapshot(receiver.adapter);
      expect(client.getProductPriceComparison(otherProduct.storeProduct.id)).toBeNull();
      expect(client.getProductPurchasePriceHistory(otherProduct.storeProduct.id)).toBeNull();
      expect(client.listPriceChanges().map(row => row.storeProductId)).toEqual([product.storeProduct.id]);
      expect(() => createDatabasePersonalPriceClient(receiver.adapter, { storeId, userId: other.owner.id })).toThrow(/active store owner/i);
      const foreignClient = createDatabasePersonalPriceClient(receiver.adapter, { storeId: other.store.id, userId: other.owner.id });
      expect(foreignClient.getProductPriceComparison(product.storeProduct.id)).toBeNull();
      expect(foreignClient.getProductPurchasePriceHistory(product.storeProduct.id)).toBeNull();
      // Generic catalogue can no longer bypass owner purchase-history authorization.
      expect(createCatalogueClient(receiver.adapter, receiver.context.store, receiver.context.device)).not.toHaveProperty('getPurchasePriceHistory');
      expect(snapshot(receiver.adapter)).toEqual(before);

      const reads = [
        () => client.getProductPriceComparison(product.storeProduct.id),
        () => client.getProductPurchasePriceHistory(product.storeProduct.id),
        () => client.listPriceChanges(), () => client.getOverview(),
      ];
      for (const [role, status] of [['STAFF', 'ACTIVE'], ['OWNER', 'INACTIVE'], ['OWNER', 'SUSPENDED']]) {
        receiver.adapter.run('UPDATE store_members SET role = ?, status = ? WHERE store_id = ? AND user_id = ?;', [role, status, storeId, userId]);
        const beforeDenied = snapshot(receiver.adapter);
        for (const read of reads) expect(read).toThrow(/active store owner/i);
        expect(snapshot(receiver.adapter)).toEqual(beforeDenied);
      }
      receiver.adapter.run("UPDATE store_members SET role = 'OWNER', status = 'ACTIVE' WHERE store_id = ? AND user_id = ?;", [storeId, userId]);
      expect(client.getProductPurchasePriceHistory(product.storeProduct.id)).toHaveLength(3);
      const beforeCrossStorePull = snapshot(receiver.adapter);
      expect(() => applySyncPullPage(receiver.adapter, pullPage(fixture.latestRemote.outbox, 4), {
        storeId: other.store.id, referenceContext: syncReferenceContextFor(origin, 4),
        options: { now: NOW, conflictIdFactory: () => testId(9990) },
      })).toThrow(/another store/i);
      expect(snapshot(receiver.adapter)).toEqual(beforeCrossStorePull);
    } finally { origin.closeAndDelete(); receiver.closeAndDelete(); }
  });
});
