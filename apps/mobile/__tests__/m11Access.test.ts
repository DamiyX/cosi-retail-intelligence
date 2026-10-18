import { createDatabaseSalesClient } from '../src/sales/client';
import { createDatabasePurchasesClient } from '../src/purchases/client';
import { createDatabaseFinanceClient } from '../src/finance/client';
import { createDatabaseInventoryClient } from '../src/inventory/client';
import { completeSale } from '../src/sales/completeSale';
import { recordPurchase } from '../src/purchases/recordPurchase';
import { recordExpense } from '../src/finance/recordExpense';
import { startInventoryReconciliation } from '../src/inventory/reconcileInventory';
import { createTemporaryProduct } from '../src/catalogue/createTemporaryProduct';
import { createUser, createStoreMember, createDevice, createStore } from '../src/db/repositories';
import { assertCurrentActor, guardClient } from '../src/storeContext/access';
import { openCatalogueFixture, deterministicIds, testId, countRows, reopenDatabase } from './catalogueSupport';

const factories = [createDatabaseSalesClient, createDatabasePurchasesClient, createDatabaseFinanceClient, createDatabaseInventoryClient] as const;
describe('M11 current actor boundary (actual file-backed SQLite)', () => {
  it('rejects missing or cross-store identity without falling back to the first owner', () => {
    const f = openCatalogueFixture();
    try {
      const actor = { storeId: f.context.store.id, deviceId: f.context.device.id, userId: f.context.owner.id };
      for (const factory of factories) expect(() => factory(f.adapter, { ...actor, deviceId: testId(999) })).toThrow();
      createStore(f.adapter, { id: testId(900), name: 'Foreign store', currencyCode: 'NGN', countryCode: 'NG', timezone: 'Africa/Lagos' });
      const before = countRows(f.adapter, 'outbox_operations');
      for (const factory of factories) {
        expect(() => factory(f.adapter)).toThrow();
        expect(() => factory(f.adapter, { ...actor, storeId: testId(900) })).toThrow();
      }
      expect(countRows(f.adapter, 'outbox_operations')).toBe(before);
    } finally { f.closeAndDelete(); }
  });
  it('withholds a delayed private result from a retained subclient after actual local revocation', async () => {
    const f = openCatalogueFixture();
    try {
      const actor = { storeId: f.context.store.id, deviceId: f.context.device.id, userId: f.context.owner.id };
      let resolve!: (value: string) => void;
      const client = guardClient({ photos: { read: () => new Promise<string>(done => { resolve = done; }) } }, () => assertCurrentActor(f.adapter, actor));
      const retained = client.photos.read;
      const pending = retained();
      f.adapter.run("UPDATE devices SET status='REVOKED' WHERE id=?;", [actor.deviceId]);
      resolve('private photo location');
      await expect(pending).rejects.toThrow(/active device/);
      expect(() => retained()).toThrow(/active device/);
    } finally { f.closeAndDelete(); }
  });
  it.each(['INACTIVE', 'SUSPENDED'])('rejects %s account at construction and on cached reads/commands without writes', status => {
    const f = openCatalogueFixture();
    try {
      const a = f.adapter;
      const actor = { storeId: f.context.store.id, deviceId: f.context.device.id, userId: f.context.owner.id };
      const product = createTemporaryProduct(a, { storeId: actor.storeId, deviceId: actor.deviceId, name: 'Soap', defaultSellingPriceMinor: 100 }, { generateId: deterministicIds(200) });
      const sales = createDatabaseSalesClient(a, actor);
      const purchases = createDatabasePurchasesClient(a, actor);
      const finance = createDatabaseFinanceClient(a, actor);
      const inventory = createDatabaseInventoryClient(a, actor);
      a.run('UPDATE users SET status = ? WHERE id = ?;', [status, actor.userId]);
      const before = ['sales','purchases','expenses','inventory_reconciliations','inventory_events','outbox_operations'].map(t => countRows(a,t));
      for (const factory of factories) expect(() => factory(a, actor)).toThrow();
      for (const read of [() => sales.searchProducts(''), () => sales.listSales(), () => purchases.listPurchases(), () => purchases.listSuppliers(), () => finance.listExpenses(), () => finance.getBusinessSummary(), () => inventory.listReviewProducts(), () => inventory.getAttentionOverview()]) expect(read).toThrow();
      const line = { storeProductId: product.storeProduct.id, packageUnitId: product.basePackage.id, quantityPackagesMicros: 1000000, unitPriceMinor: 100 };
      expect(() => completeSale(a, { ...actor, lines: [line], payment: { method: 'CASH' } }, { generateId: deterministicIds(300) })).toThrow();
      expect(() => recordPurchase(a, { ...actor, lines: [{ storeProductId: product.storeProduct.id, packageUnitId: product.basePackage.id, quantityPackagesMicros: 1000000, enteredCostMinor: 100 }] }, { generateId: deterministicIds(400) })).toThrow();
      expect(() => recordExpense(a, { ...actor, category: 'MISCELLANEOUS', amountMinor: 100, currencyCode: 'NGN' }, { generateId: deterministicIds(500) })).toThrow();
      expect(() => startInventoryReconciliation(a, { ...actor, storeProductId: product.storeProduct.id })).toThrow();
      expect(['sales','purchases','expenses','inventory_reconciliations','inventory_events','outbox_operations'].map(t => countRows(a,t))).toEqual(before);
      const reopened = reopenDatabase(f.path);
      try { for (const factory of factories) expect(() => factory(reopened, actor)).toThrow(); } finally { reopened.close(); }
    } finally { f.closeAndDelete(); }
  });
  it.each(['store', 'member', 'device', 'unbound', 'wrong-user'])('denies %s change through an already constructed client', change => {
    const f = openCatalogueFixture();
    try {
      const a = f.adapter;
      const clients = [createDatabaseSalesClient(a), createDatabasePurchasesClient(a), createDatabaseFinanceClient(a), createDatabaseInventoryClient(a)] as const;
      if (change === 'store') a.run("UPDATE stores SET status = 'INACTIVE' WHERE id = ?;", [f.context.store.id]);
      if (change === 'member') a.run("UPDATE store_members SET status = 'INACTIVE' WHERE id = ?;", [f.context.membership.id]);
      if (change === 'device') a.run("UPDATE devices SET status = 'REVOKED' WHERE id = ?;", [f.context.device.id]);
      if (change === 'unbound') a.run('UPDATE devices SET user_id = NULL WHERE id = ?;', [f.context.device.id]);
      if (change === 'wrong-user') {
        createUser(a, { id: testId(900), displayName: 'Other' });
        createStoreMember(a, { id: testId(901), storeId: f.context.store.id, userId: testId(900), role: 'OWNER' });
        a.run('UPDATE devices SET user_id = ? WHERE id = ?;', [testId(900),f.context.device.id]);
      }
      const reads = [() => clients[0].listSales(), () => clients[1].listPurchases(), () => clients[2].listExpenses(), () => clients[3].listReviewProducts()];
      for (const read of reads) expect(read).toThrow();
    } finally { f.closeAndDelete(); }
  });
  it('uses the bound user; rejects mismatched and ambiguous device selection', () => {
    const f = openCatalogueFixture();
    try {
      const a = f.adapter;
      createUser(a, { id:testId(900),displayName:'Staff' });
      createStoreMember(a, { id:testId(901),storeId:f.context.store.id,userId:testId(900),role:'STAFF' });
      for (const factory of factories) expect(() => factory(a, { userId: testId(900) })).toThrow();
      expect(createDatabaseSalesClient(a).userId).toBe(f.context.owner.id);
      createDevice(a, { id:testId(902),storeId:f.context.store.id,userId:testId(900),platform:'ANDROID',appVersion:'test' });
      for (const factory of factories) expect(() => factory(a)).toThrow();
      const staff = { storeId:f.context.store.id,deviceId:testId(902),userId:testId(900) };
      expect(createDatabaseSalesClient(a,staff).userId).toBe(testId(900));
      expect(() => createDatabaseFinanceClient(a,staff)).toThrow();
      expect(createDatabaseInventoryClient(a,staff).userId).toBe(testId(900));
    } finally { f.closeAndDelete(); }
  });
  it.each(['STAFF', 'ADMIN'] as const)('preserves %s stock reads while denying owner management commands without writes', role => {
    const f = openCatalogueFixture();
    try {
      const a = f.adapter;
      const product = createTemporaryProduct(a, { storeId: f.context.store.id, deviceId: f.context.device.id, name: 'Stock' }, { generateId: deterministicIds(200) });
      const user = createUser(a, { id: testId(900), displayName: 'Synthetic bound member' });
      createStoreMember(a, { id: testId(901), storeId: f.context.store.id, userId: user.id, role });
      const device = createDevice(a, { id: testId(902), storeId: f.context.store.id, userId: user.id, platform: 'ANDROID', appVersion: 'synthetic' });
      const client = createDatabaseInventoryClient(a, { storeId: f.context.store.id, deviceId: device.id, userId: user.id });
      const before = ['inventory_events', 'inventory_reconciliations', 'outbox_operations'].map(table => countRows(a, table));
      expect(client.getAttentionOverview()).toHaveProperty('items');
      expect(client.listReviewProducts().map(row => row.storeProductId)).toContain(product.storeProduct.id);
      expect(client.getBatchProjection(product.storeProduct.id).inventoryBalanceBaseMicros).toBe('0');
      expect(() => client.startReconciliation(product.storeProduct.id)).toThrow(/active store owner/);
      expect(() => client.generateGuidedChecks()).toThrow(/active store owner/);
      expect(['inventory_events', 'inventory_reconciliations', 'outbox_operations'].map(table => countRows(a, table))).toEqual(before);
      a.run("UPDATE users SET status='SUSPENDED' WHERE id=?;", [user.id]);
      expect(() => client.getAttentionOverview()).toThrow(/active account/i);
    } finally { f.closeAndDelete(); }
  });
});
