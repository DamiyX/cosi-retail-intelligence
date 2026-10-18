import { createCatalogueClient, resolveCurrentStore } from '../src/catalogue/client';
import { createDatabaseSalesClient } from '../src/sales/client';
import { createDatabasePurchasesClient } from '../src/purchases/client';
import { createDatabaseInventoryClient } from '../src/inventory/client';
import { createDatabaseFinanceClient } from '../src/finance/client';
import { createPersonalPriceClientForActiveContext, createDatabasePersonalPriceClient } from '../src/priceIntelligence/client';
import { createDevice, createStoreMember, createUser, ensureSyncStoreState } from '../src/db/repositories';
import { openCatalogueFixture, testId, countRows } from './catalogueSupport';

function clients(f: ReturnType<typeof openCatalogueFixture>) {
  const context = resolveCurrentStore(f.adapter);
  if (!context) throw new Error('Current catalogue context unavailable');
  const catalogue = createCatalogueClient(f.adapter, context.store, context.device);
  const sales = createDatabaseSalesClient(f.adapter);
  const purchases = createDatabasePurchasesClient(f.adapter);
  const inventory = createDatabaseInventoryClient(f.adapter);
  const finance = createDatabaseFinanceClient(f.adapter);
  const prices = createPersonalPriceClientForActiveContext(f.adapter);
  if (!prices) throw new Error('Current price context unavailable');
  return { context, sales, purchases, inventory, finance, prices,
    reads: [() => catalogue.listProducts(''), () => sales.listSales(), () => purchases.listPurchases(),
      () => inventory.listReviewProducts(), () => finance.listExpenses(), () => prices.getOverview()] };
}

describe('M11 current-app local enrollment discovery', () => {
  it('default catalogue and business/price clients use the exact enrolled local device after two-device restoration', () => {
    const f = openCatalogueFixture();
    try {
      ensureSyncStoreState(f.adapter, { storeId: f.context.store.id, deviceId: f.context.device.id });
      createDevice(f.adapter, { id: testId(900), storeId: f.context.store.id, userId: f.context.owner.id, platform: 'ANDROID', appVersion: 'replicated' });
      const all = clients(f);
      expect(all.context.device.id).toBe(f.context.device.id);
      for (const client of [all.sales, all.purchases, all.inventory, all.finance]) expect(client.deviceId).toBe(f.context.device.id);
      for (const read of all.reads) expect(read).not.toThrow();
      expect(all.prices.userId).toBe(f.context.owner.id);
      expect(countRows(f.adapter, 'outbox_operations')).toBe(0);
      expect(() => createDatabaseSalesClient(f.adapter, { userId: testId(999) })).toThrow();
    } finally { f.closeAndDelete(); }
  });
  it.each(['revoked', 'unbound', 'suspended', 'wrong-user'] as const)('denies %s enrollment and retained default clients despite another active device', change => {
    const f = openCatalogueFixture();
    try {
      ensureSyncStoreState(f.adapter, { storeId: f.context.store.id, deviceId: f.context.device.id });
      createDevice(f.adapter, { id: testId(900), storeId: f.context.store.id, userId: f.context.owner.id, platform: 'ANDROID', appVersion: 'replicated' });
      const all = clients(f);
      if (change === 'revoked') f.adapter.run("UPDATE devices SET status='REVOKED' WHERE id=?;", [f.context.device.id]);
      if (change === 'unbound') f.adapter.run('UPDATE devices SET user_id=NULL WHERE id=?;', [f.context.device.id]);
      if (change === 'suspended') f.adapter.run("UPDATE users SET status='SUSPENDED' WHERE id=?;", [f.context.owner.id]);
      if (change === 'wrong-user') {
        const other = createUser(f.adapter, { id: testId(901), displayName: 'Other recorded person' });
        createStoreMember(f.adapter, { id: testId(902), storeId: f.context.store.id, userId: other.id, role: 'STAFF' });
        f.adapter.run('UPDATE devices SET user_id=? WHERE id=?;', [other.id, f.context.device.id]);
        expect(() => createDatabaseSalesClient(f.adapter, { userId: f.context.owner.id })).toThrow();
      } else {
        expect(resolveCurrentStore(f.adapter)).toBeNull();
        expect(() => clients(f)).toThrow();
      }
      for (const read of all.reads) expect(read).toThrow();
      expect(countRows(f.adapter, 'outbox_operations')).toBe(0);
    } finally { f.closeAndDelete(); }
  });
  it('changing local enrollment invalidates captured discovery clients; explicit identities remain fixed and new discovery uses the new local device', () => {
    const f = openCatalogueFixture();
    try {
      ensureSyncStoreState(f.adapter, { storeId: f.context.store.id, deviceId: f.context.device.id });
      createDevice(f.adapter, { id: testId(900), storeId: f.context.store.id, userId: f.context.owner.id, platform: 'ANDROID', appVersion: 'synthetic' });
      const captured = clients(f);
      const explicit = createDatabasePersonalPriceClient(f.adapter, { storeId: f.context.store.id, deviceId: f.context.device.id, userId: f.context.owner.id });
      ensureSyncStoreState(f.adapter, { storeId: f.context.store.id, deviceId: testId(900) });
      for (const read of captured.reads) expect(read).toThrow(/enrollment/);
      expect(explicit.getOverview()).toEqual({ oneObservationProductCount: 0, unchangedComparisonCount: 0 });
      expect(clients(f).context.device.id).toBe(testId(900));
      expect(captured.sales.deviceId).toBe(f.context.device.id);
    } finally { f.closeAndDelete(); }
  });
  it('replaced membership invalidates retained clients without silently adopting the new membership identity', () => {
    const f = openCatalogueFixture();
    try {
      ensureSyncStoreState(f.adapter, { storeId: f.context.store.id, deviceId: f.context.device.id });
      const captured = clients(f);
      f.adapter.run('UPDATE store_members SET id=? WHERE id=?;', [testId(900), f.context.membership.id]);
      for (const read of captured.reads) expect(read).toThrow();
      for (const read of clients(f).reads) expect(read).not.toThrow();
    } finally { f.closeAndDelete(); }
  });
});
