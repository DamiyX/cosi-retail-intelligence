import type { MarketReadResponse, MarketState } from '@retail/contracts';
import { createTemporaryProduct } from '../src/catalogue/createTemporaryProduct';
import { createMarketClient } from '../src/market/client';
import type { MarketTransport } from '../src/market/transport';
import { BoundaryAdapter, businessSnapshot } from './m11MaxSupport';
import { deterministicIds, openCatalogueFixture, testId } from './catalogueSupport';

function setup() {
  const f = openCatalogueFixture(), db = new BoundaryAdapter(f.adapter);
  const actor = { storeId: f.context.store.id, userId: f.context.owner.id, deviceId: f.context.device.id };
  const p = createTemporaryProduct(f.adapter, { ...actor, name: 'Market package' }, { generateId: deterministicIds(1000) });
  f.adapter.run("UPDATE outbox_operations SET status='SYNCED';");
  f.adapter.run("INSERT INTO sync_store_state(store_id,device_id,status,updated_at) VALUES (?,?,'IDLE',?);", [actor.storeId, actor.deviceId, '2026-10-03T06:00:00.000Z']);
  const key = { productVariantId: p.variant.id, packageUnitId: p.basePackage.id };
  const zone = { id: testId(8000), name: 'Synthetic zone', countryCode: 'NG', currencyCode: 'NGN', version: 1 };
  let state: MarketState = { policyVersion: 1, storeId: actor.storeId, available: true, enabled: true, version: 1, generation: 1, zone, enabledAt: '2026-10-01T00:00:00.000Z', cutoffRevision: 10, serverTime: '2026-10-03T06:00:00.000Z', zones: [zone] };
  let response: MarketReadResponse = { policyVersion: 1, storeId: actor.storeId, controlVersion: 1, generation: 1, zone, currencyCode: 'NGN', revision: 1, serverTime: state.serverTime,
    results: [{ key, mappingVersion: 1, marketVariantId: testId(8001), marketPackageId: testId(8002), packageName: 'Unit', status: 'AVAILABLE', minimum: { numerator: '100', denominator: '1' }, median: { numerator: '150', denominator: '1' }, maximum: { numerator: '200', denominator: '1' }, observationCount: 5, coverage: 'LIMITED', windowDays: 30, windowStart: '2026-09-03T06:00:00.000Z', observedThrough: '2026-10-02T06:00:00.000Z', calculatedAt: state.serverTime, validUntil: '2026-10-04T06:00:00.000Z' }] };
  let fail = false, changeNow: (() => void) | undefined, failureChange: (() => void) | undefined, generateChange: (() => void) | undefined;
  const transport: MarketTransport = { available: true, authenticatedUserId: actor.userId,
    async state(r) { return { status: 'NOT_FOUND', operationId: r.operationId, state }; },
    async control(r) { if (fail) { failureChange?.(); throw new Error('Synthetic unknown outcome'); } state = { ...state, enabled: r.enabled, zone: r.enabled ? zone : null, version: state.version + 1, generation: state.generation + 1, enabledAt: r.enabled ? state.serverTime : null, cutoffRevision: r.enabled ? 10 : null }; return { status: 'APPLIED', operationId: r.operationId, state }; },
    async read() { return response; },
  };
  const ids = deterministicIds(9000);
  const client = createMarketClient(db, { ...actor, transport, generateId: () => { generateChange?.(); return ids(); }, now: () => { changeNow?.(); return Date.parse(state.serverTime); } });
  const suspend = () => f.adapter.run("UPDATE users SET status='SUSPENDED' WHERE id=?;", [actor.userId]);
  return { f, db, actor, client, key, p, suspend, revise: () => { response = { ...response, revision: 2, results: response.results.map(r => r.status === 'AVAILABLE' ? { ...r, median: { numerator: '160', denominator: '1' } } : r) }; }, fail: (change?: () => void) => { fail = true; failureChange = change; }, generateChange: (change: () => void) => { generateChange = change; }, expire: (change?: () => void) => { state = { ...state, serverTime: '2026-10-05T06:00:00.000Z' }; changeNow = change; } };
}
async function prepare(s: ReturnType<typeof setup>, command: string) {
  await s.client.reconcile(); await s.client.refresh([s.key]);
  if (command === 'sendPending' || command === 'error') { s.fail(); await expect(s.client.requestControl(false, null, true)).rejects.toThrow('unknown'); }
  if (command === 'invalidate') s.f.adapter.run("UPDATE product_variants SET updated_at='2026-10-04T06:00:00.000Z' WHERE id=?;", [s.p.variant.id]);
  s.revise();
  return () => command === 'reconcile' ? s.client.reconcile() : command === 'request' ? s.client.requestControl(false, null, true)
    : command === 'queueDisable' ? s.client.queueDisable() : command === 'sendPending' || command === 'error' ? s.client.retryPending()
      : command === 'invalidate' ? s.client.getSaved() : s.client.refresh([s.key]);
}
it.each(['refresh', 'reconcile', 'request', 'queueDisable', 'sendPending', 'invalidate'])('denies %s mutation after authority loss at BEGIN with full cache/control/business snapshots unchanged', async command => {
  const s = setup(); try {
    const run = await prepare(s, command), before = businessSnapshot(s.f.adapter);
    s.db.beforeTransaction = s.suspend;
    let error: unknown; try { await run(); } catch (e) { error = e; }
    expect(error).toBeDefined(); expect(businessSnapshot(s.f.adapter)).toEqual(before);
  } finally { s.f.closeAndDelete(); }
});
it('preserves uncertain pending body/message when transport failure follows authority loss', async () => {
  const s = setup(); try {
    await s.client.reconcile(); let before: ReturnType<typeof businessSnapshot> | undefined;
    s.fail(() => { before = businessSnapshot(s.f.adapter); s.suspend(); });
    await expect(s.client.requestControl(false, null, true)).rejects.toThrow();
    expect(before).toBeDefined(); expect(businessSnapshot(s.f.adapter)).toEqual(before);
  } finally { s.f.closeAndDelete(); }
});
it('denies a retry fence intent after authority loss during ID generation, retaining the reconciled state', async () => {
  const s = setup(); try {
    await s.client.reconcile(); s.client.queueDisable(); let before: ReturnType<typeof businessSnapshot> | undefined;
    s.generateChange(() => { before = businessSnapshot(s.f.adapter); s.suspend(); });
    await expect(s.client.retryPending()).rejects.toThrow();
    expect(before).toBeDefined(); expect(businessSnapshot(s.f.adapter)).toEqual(before);
  } finally { s.f.closeAndDelete(); }
});
it('has legitimate controls for each callback and unknown-outcome path', async () => {
  const s = setup(); try {
    await s.client.reconcile(); await s.client.refresh([s.key]); s.fail();
    await expect(s.client.requestControl(false, null, true)).rejects.toThrow('unknown');
    expect(s.client.getControl().pending).not.toBeNull(); expect(s.client.getControl().message).toMatch(/Confirmation pending/);
    const body = JSON.stringify(s.client.getControl().pending); await expect(s.client.retryPending()).rejects.toThrow('unknown');
    expect(JSON.stringify(s.client.getControl().pending)).toBe(body);
  } finally { s.f.closeAndDelete(); }
  const other = setup(); try {
    await other.client.reconcile(); other.client.queueDisable(); await other.client.retryPending();
    expect(other.client.getControl()).toMatchObject({ pending: null, acknowledgement: { enabled: false } });
  } finally { other.f.closeAndDelete(); }
});
it('denies foreground expiry marker after authority loss during expiry evaluation', async () => {
  const s = setup(); try {
    await s.client.reconcile(); await s.client.refresh([s.key]); const before = businessSnapshot(s.f.adapter);
    s.expire(s.suspend); expect(() => s.client.getSaved()).toThrow(); expect(businessSnapshot(s.f.adapter)).toEqual(before);
  } finally { s.f.closeAndDelete(); }
});
it('valid controls preserve exact cache updates, expiry tombstone and local suppression', async () => {
  const s = setup(); try {
    await s.client.reconcile(); await s.client.refresh([s.key]); s.revise(); await s.client.refresh([s.key]);
    expect(s.client.getSaved()[0]).toMatchObject({ status: 'SAVED', result: { median: { numerator: '160', denominator: '1' } } });
    s.expire(); expect(s.client.getSaved()[0].status).toBe('EXPIRED'); s.client.queueDisable(); expect(s.client.getSaved()).toEqual([]);
  } finally { s.f.closeAndDelete(); }
});
