import { resolvePilotOwner, readPilotSyncOverview } from '../src/sync/pilot';
import { createDevice, createStore, createStoreMember, createUser, ensureSyncStoreState } from '../src/db/repositories';
import { openCatalogueFixture, testId, countRows, reopenDatabase } from './catalogueSupport';

describe('M11 pilot current local enrollment context', () => {
  it('uses the enrolled local device among restored devices and preserves its provenance after restart', () => {
    const f = openCatalogueFixture();
    try {
      const { store, device, owner } = f.context;
      ensureSyncStoreState(f.adapter, { storeId: store.id, deviceId: device.id });
      createDevice(f.adapter, { id: testId(900), storeId: store.id, userId: owner.id, platform: 'ANDROID', appVersion: 'replicated' });
      expect(resolvePilotOwner(f.adapter)).toMatchObject({ storeId: store.id, deviceId: device.id, userId: owner.id });
      const reopened = reopenDatabase(f.path);
      try { expect(resolvePilotOwner(reopened)).toMatchObject({ deviceId: device.id, userId: owner.id }); } finally { reopened.close(); }
      expect(f.adapter.getFirstRow('SELECT device_id FROM sync_store_state WHERE store_id=?;', [store.id])).toEqual({ device_id: device.id });
    } finally { f.closeAndDelete(); }
  });
  it.each(['revoked', 'unbound', 'wrong-user', 'foreign-device', 'suspended', 'member-inactive', 'store-inactive'] as const)('denies stale %s enrollment without falling back to another active owner device', change => {
    const f = openCatalogueFixture();
    try {
      const { store, device, owner, membership } = f.context;
      const before = countRows(f.adapter, 'outbox_operations');
      ensureSyncStoreState(f.adapter, { storeId: store.id, deviceId: device.id });
      const overview = () => readPilotSyncOverview(f.adapter);
      expect(overview().context?.deviceId).toBe(device.id);
      createDevice(f.adapter, { id: testId(900), storeId: store.id, userId: owner.id, platform: 'ANDROID', appVersion: 'replicated' });
      if (change === 'revoked') f.adapter.run("UPDATE devices SET status='REVOKED' WHERE id=?;", [device.id]);
      if (change === 'unbound') f.adapter.run('UPDATE devices SET user_id=NULL WHERE id=?;', [device.id]);
      if (change === 'wrong-user') {
        const user = createUser(f.adapter, { id: testId(901), displayName: 'Other owner' });
        createStoreMember(f.adapter, { id: testId(902), storeId: store.id, userId: user.id, role: 'OWNER' });
        f.adapter.run('UPDATE devices SET user_id=? WHERE id=?;', [user.id, device.id]);
      }
      if (change === 'foreign-device') {
        createStore(f.adapter, { id: testId(901), name: 'Other', currencyCode: 'NGN', countryCode: 'NG', timezone: 'UTC' });
        f.adapter.run('UPDATE devices SET store_id=? WHERE id=?;', [testId(901), device.id]);
      }
      if (change === 'suspended') f.adapter.run("UPDATE users SET status='SUSPENDED' WHERE id=?;", [owner.id]);
      if (change === 'member-inactive') f.adapter.run("UPDATE store_members SET status='INACTIVE' WHERE id=?;", [membership.id]);
      if (change === 'store-inactive') f.adapter.run("UPDATE stores SET status='INACTIVE' WHERE id=?;", [store.id]);
      expect(resolvePilotOwner(f.adapter)).toBeNull();
      expect(overview()).toMatchObject({ context: null, state: null, unsyncedCount: 0, conflicts: [] });
      expect(countRows(f.adapter, 'outbox_operations')).toBe(before);
    } finally { f.closeAndDelete(); }
  });
  it('database integrity rejects dangling enrollment identity without changing the persisted local device', () => {
    const f = openCatalogueFixture();
    try {
      ensureSyncStoreState(f.adapter, { storeId: f.context.store.id, deviceId: f.context.device.id });
      expect(() => f.adapter.run('UPDATE sync_store_state SET device_id=? WHERE store_id=?;', [testId(999), f.context.store.id])).toThrow(/FOREIGN KEY/);
      expect(resolvePilotOwner(f.adapter)?.deviceId).toBe(f.context.device.id);
    } finally { f.closeAndDelete(); }
  });
  it('allows genuine unenrolled singleton context but denies omitted enrollment with ambiguous devices or stores', () => {
    const f = openCatalogueFixture();
    try {
      expect(resolvePilotOwner(f.adapter)?.deviceId).toBe(f.context.device.id);
      createDevice(f.adapter, { id: testId(900), storeId: f.context.store.id, userId: f.context.owner.id, platform: 'ANDROID', appVersion: 'replicated' });
      expect(resolvePilotOwner(f.adapter)).toBeNull();
      ensureSyncStoreState(f.adapter, { storeId: f.context.store.id, deviceId: f.context.device.id });
      createStore(f.adapter, { id: testId(901), name: 'Other', currencyCode: 'NGN', countryCode: 'NG', timezone: 'UTC' });
      expect(resolvePilotOwner(f.adapter)).toBeNull();
    } finally { f.closeAndDelete(); }
  });
});
