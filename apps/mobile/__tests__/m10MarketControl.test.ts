import type { MarketControlRequest, MarketState } from '@retail/contracts';
import { createTemporaryProduct } from '../src/catalogue/createTemporaryProduct';
import { recordPurchase } from '../src/purchases/recordPurchase';

import { openDatabase, MIGRATIONS } from '../src/db/migrations';
import { openIsolatedDatabase } from '../src/db/testing';
import { provisionStoreContext } from '../src/storeContext/provisionStoreContext';
import { createMarketClient } from '../src/market/client';
import { readMarketControl } from '../src/market/storage';
import type { MarketTransport } from '../src/market/transport';
import { deterministicIds, openCatalogueFixture, reopenDatabase, testId } from './catalogueSupport';

/** Entire authority/network dataset below is SYNTHETIC, not real consent/market evidence. */
function fixtureTransport(userId: string, storeId: string) {
  let state: MarketState = { policyVersion: 1, storeId, available: true, enabled: false, version: 0,
    generation: 0, zone: null, enabledAt: null, cutoffRevision: null, serverTime: '2026-10-03T06:00:00.000Z',
    zones: [{ id: testId(900), name: 'Synthetic test zone', countryCode: 'NG', currencyCode: 'NGN', version: 1 }] };
  const requests = new Map<string, { body: string; status: 'APPLIED' | 'CONFLICT' }>();
  const transport: MarketTransport = { available: true, authenticatedUserId: userId,
    state: jest.fn(async request => ({ state, operationId: request.operationId,
      status: request.operationId ? requests.get(request.operationId)?.status ?? 'NOT_FOUND' : 'NOT_FOUND' })),
    control: jest.fn(async (request: MarketControlRequest) => {
      const old = requests.get(request.operationId);
      if (old && old.body !== JSON.stringify(request)) throw new Error('Body conflict');
      const status = old?.status ?? (request.expectedVersion === state.version ? 'APPLIED' : 'CONFLICT');
      if (!old && status === 'APPLIED') state = { ...state, enabled: request.enabled, version: state.version + 1,
        generation: state.generation + 1, zone: request.enabled ? state.zones[0] : null,
        enabledAt: request.enabled ? state.serverTime : null, cutoffRevision: request.enabled ? 12 : null };
      requests.set(request.operationId, { body: JSON.stringify(request), status });
      return { state, operationId: request.operationId, status };
    }),
    read: jest.fn(async () => { throw new Error('No release fixture'); }),
  };
  return { transport, getState: () => state, setState: (next: MarketState) => { state = next; } };
}

function setup() {
  const fixture = openCatalogueFixture();
  const { store, owner: user, device } = fixture.context;
  fixture.adapter.run(`INSERT INTO sync_store_state(store_id,device_id,status,updated_at) VALUES (?,?,'IDLE',?);`,
    [store.id, device.id, '2026-10-03T06:00:00.000Z']);
  const synthetic = fixtureTransport(user.id, store.id);
  const options = { storeId: store.id, userId: user.id, deviceId: device.id, transport: synthetic.transport, generateId: deterministicIds(10000) };
  return { fixture, synthetic, options, client: createMarketClient(fixture.adapter, options) };
}

describe('M10-01 prospective control (synthetic transport, real disposable SQLite)', () => {
  it('default-disabled sends nothing and does not manufacture acknowledgement', async () => {
    const { fixture, options } = setup();
    try {
      const client = createMarketClient(fixture.adapter, { ...options, transport: undefined });
      await expect(client.reconcile()).rejects.toThrow('Nothing was sent');
      await expect(client.requestControl(true, testId(900), true)).rejects.toThrow('Nothing was sent');
      expect(readMarketControl(fixture.adapter, options.storeId).acknowledgement).toBeNull();
    } finally { fixture.closeAndDelete(); }
  });
  it('requires informed approval and an approved zone before acknowledged generation', async () => {
    const { fixture, client } = setup();
    try {
      await expect(client.requestControl(true, testId(900), true)).rejects.toThrow('Read server state');
      await client.reconcile();
      await expect(client.requestControl(true, testId(900), false)).rejects.toThrow('Explicit informed');
      await expect(client.requestControl(true, testId(901), true)).rejects.toThrow('Explicit informed');
      await client.requestControl(true, testId(900), true);
      expect(client.getControl()).toMatchObject({ localOff: false, pending: null, acknowledgement: { version: 1, generation: 1, cutoffRevision: 12 } });
    } finally { fixture.closeAndDelete(); }
  });
  it('preserves operation across timeout/restart and reconciles an applied enable before revoke', async () => {
    const { fixture, client, synthetic, options } = setup();
    try {
      await client.reconcile();
      const original = synthetic.transport.control;
      synthetic.transport.control = async request => { await original(request); throw new Error('Timeout after acceptance'); };
      await expect(client.requestControl(true, testId(900), true)).rejects.toThrow('Timeout');
      const pendingId = client.getControl().pending?.operationId;
      client.queueDisable();
      const restarted = reopenDatabase(fixture.path);
      try {
        synthetic.transport.control = original;
        const resumed = createMarketClient(restarted, options);
        expect(resumed.getControl()).toMatchObject({ localOff: true, pending: { operationId: pendingId }, disableRequested: true });
        await resumed.retryPending();
        expect(resumed.getControl()).toMatchObject({ localOff: true, pending: null, acknowledgement: { enabled: false, version: 2, generation: 2 } });
        expect(synthetic.getState().enabled).toBe(false);
      } finally { restarted.close(); }
    } finally { fixture.closeAndDelete(); }
  });
  it('retries an unknown timeout with exactly the same body and ID', async () => {
    const { fixture, client, synthetic } = setup();
    try {
      await client.reconcile();
      const original = synthetic.transport.control;
      synthetic.transport.control = jest.fn(async () => { throw new Error('Offline'); });
      await expect(client.requestControl(true, testId(900), true)).rejects.toThrow('Offline');
      const pending = client.getControl().pending;
      await expect(client.requestControl(false, null, false)).rejects.toThrow('Reconcile');
      synthetic.transport.control = original;
      await client.retryPending();
      expect(original).toHaveBeenLastCalledWith(pending);
      expect(client.getControl().pending).toBeNull();
    } finally { fixture.closeAndDelete(); }
  });
  it('shows expected-version conflict instead of optimistic enable', async () => {
    const { fixture, client, synthetic } = setup();
    try {
      await client.reconcile();
      synthetic.setState({ ...synthetic.getState(), version: 2, generation: 2 });
      await client.requestControl(true, testId(900), true);
      expect(client.getControl()).toMatchObject({ localOff: true, pending: null, message: expect.stringContaining('Conflict'), acknowledgement: { enabled: false, version: 2 } });
    } finally { fixture.closeAndDelete(); }
  });
  it.each(['account','member','role','device','store','enrollment','auth'])('fails closed on current %s authority', async field => {
    const { fixture, client, synthetic, options } = setup();
    try {
      if (field === 'account') fixture.adapter.run("UPDATE users SET status='INACTIVE' WHERE id=?", [options.userId]);
      if (field === 'member') fixture.adapter.run("UPDATE store_members SET status='INACTIVE' WHERE user_id=?", [options.userId]);
      if (field === 'role') fixture.adapter.run("UPDATE store_members SET role='STAFF' WHERE user_id=?", [options.userId]);
      if (field === 'device') fixture.adapter.run("UPDATE devices SET status='REVOKED' WHERE id=?", [options.deviceId]);
      if (field === 'store') fixture.adapter.run("UPDATE stores SET status='INACTIVE' WHERE id=?", [options.storeId]);
      if (field === 'enrollment') fixture.adapter.run('DELETE FROM sync_store_state WHERE store_id=?', [options.storeId]);
      if (field === 'auth') Object.assign(synthetic.transport, { authenticatedUserId: null });
      await expect(client.reconcile()).rejects.toThrow('active owner');
      expect(synthetic.transport.state).not.toHaveBeenCalled();
      expect(() => client.getSaved()).toThrow('active owner');
    } finally { fixture.closeAndDelete(); }
  });
  it('upgrades populated 26 to 27 without changing private facts and survives restart', () => {
    const fixture = openIsolatedDatabase(MIGRATIONS.slice(0,26));
    try {
      const context = provisionStoreContext(fixture.adapter, {
        ownerDisplayName: 'Synthetic owner', storeName: 'Synthetic store', currencyCode: 'NGN', countryCode: 'NG',
        timezone: 'Africa/Lagos', appVersion: '0.0.1',
      }, { generateId: deterministicIds(100) });
      const product = createTemporaryProduct(fixture.adapter, { storeId:context.store.id,deviceId:context.device.id,name:'Synthetic restock' },{ generateId:deterministicIds(2000) });
      recordPurchase(fixture.adapter,{ storeId:context.store.id,deviceId:context.device.id,userId:context.owner.id,
        occurredAt:'2026-10-02T06:00:00.000Z',lines:[{ storeProductId:product.storeProduct.id,packageUnitId:product.basePackage.id,
          quantityPackagesMicros:1000000,enteredCostMinor:100 }] },{ generateId:deterministicIds(3000),operationId:testId(4000) });
      const tables = ['stores','users','devices','store_members','outbox_operations','purchases','purchase_items','price_observations','inventory_events','store_product_cost_states','cost_movements'];
      const before = tables.map(t => fixture.adapter.getAllRows(`SELECT * FROM ${t} ORDER BY rowid`));
      expect(openDatabase(fixture.adapter,MIGRATIONS.slice(0,27)).schemaVersion).toBe(27);
      expect(tables.map(t => fixture.adapter.getAllRows(`SELECT * FROM ${t} ORDER BY rowid`))).toEqual(before);
      expect(readMarketControl(fixture.adapter, context.store.id).localOff).toBe(true);
      expect(fixture.adapter.getFirstRow('SELECT contribution_consent FROM price_observations')).toEqual({ contribution_consent:0 });
      const restarted = reopenDatabase(fixture.path);
      try { expect(openDatabase(restarted,MIGRATIONS.slice(0,27)).schemaVersion).toBe(27); expect(restarted.getFirstRow('PRAGMA quick_check')).toEqual({ quick_check: 'ok' }); }
      finally { restarted.close(); }
    } finally { fixture.closeAndDelete(); }
  });
  it('locally revoking an unaccepted enable never retries enable and fences delayed requests', async () => {
    const { fixture,client,synthetic }=setup();
    try {
      await client.reconcile();
      const original=synthetic.transport.control;
      synthetic.transport.control=jest.fn(async () => { throw new Error('Offline before acceptance'); });
      await expect(client.requestControl(true,testId(900),true)).rejects.toThrow('Offline');
      const delayed=client.getControl().pending!;
      client.queueDisable();
      synthetic.transport.control=original;
      await client.retryPending();
      expect(original).toHaveBeenCalledTimes(1);
      expect(original).toHaveBeenCalledWith(expect.objectContaining({ enabled:false,expectedVersion:0 }));
      expect(synthetic.getState().version).toBe(1);
      const late=await original(delayed);
      expect(late).toMatchObject({ status:'CONFLICT',state:{ enabled:false } });
    } finally { fixture.closeAndDelete(); }
  });
});
