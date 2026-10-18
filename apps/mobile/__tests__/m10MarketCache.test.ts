import type { MarketReadResponse, MarketState } from '@retail/contracts';

import { createTemporaryProduct } from '../src/catalogue/createTemporaryProduct';
import { createMarketClient } from '../src/market/client';
import { readMarketControl } from '../src/market/storage';
import type { MarketTransport } from '../src/market/transport';
import { deterministicIds, openCatalogueFixture, reopenDatabase, testId } from './catalogueSupport';

/** SYNTHETIC releases through a bounded fake transport; actual disposable SQLite cache. */
function setup() {
  const fixture = openCatalogueFixture();
  const { store,owner,device } = fixture.context;
  const product = createTemporaryProduct(fixture.adapter,{ storeId:store.id,deviceId:device.id,name:'Synthetic package' },{ generateId:deterministicIds(1000) });
  fixture.adapter.run("UPDATE outbox_operations SET status='SYNCED';");
  fixture.adapter.run("INSERT INTO sync_store_state(store_id,device_id,status,updated_at) VALUES (?,?,'IDLE',?);",[store.id,device.id,'2026-10-03T06:00:00.000Z']);
  const key = { productVariantId: product.variant.id,packageUnitId: product.basePackage.id };
  const zone = { id:testId(900),name:'Synthetic zone',countryCode:'NG',currencyCode:'NGN',version:1 };
  const state: MarketState = { policyVersion:1,storeId:store.id,available:true,enabled:true,version:1,generation:1,
    zone,enabledAt:'2026-10-01T00:00:00.000Z',cutoffRevision:10,serverTime:'2026-10-03T06:00:00.000Z',zones:[zone] };
  const response: MarketReadResponse = { policyVersion:1,storeId:store.id,controlVersion:1,generation:1,zone,currencyCode:'NGN',
    revision:1,serverTime:'2026-10-03T06:00:00.000Z',results:[{ key,mappingVersion:1,marketVariantId:testId(901),marketPackageId:testId(902),
      packageName:'Synthetic package',status:'AVAILABLE',minimum:{ numerator:'100',denominator:'1' },median:{ numerator:'150',denominator:'1' },
      maximum:{ numerator:'200',denominator:'1' },observationCount:5,coverage:'LIMITED',windowDays:30,
      windowStart:'2026-09-03T06:00:00.000Z',observedThrough:'2026-10-02T06:00:00.000Z',calculatedAt:'2026-10-03T06:00:00.000Z',validUntil:'2026-10-04T06:00:00.000Z' }] };
  const transport: MarketTransport = { available:true,authenticatedUserId:owner.id,
    state:jest.fn(async r => ({ status:'NOT_FOUND',operationId:r.operationId,state })),
    control:jest.fn(async () => { throw new Error('Not needed'); }),read:jest.fn(async () => response) };
  let now = Date.parse(response.serverTime);
  const options = { storeId:store.id,userId:owner.id,deviceId:device.id,transport,now:() => now,generateId:deterministicIds(10000) };
  const client = createMarketClient(fixture.adapter,options);
  return { fixture,client,key,transport,response,state,options,setNow:(value:number) => { now=value; } };
}

function addAcceptedProduct(s: ReturnType<typeof setup>, suffix = 2000) {
  const product = createTemporaryProduct(s.fixture.adapter, {
    storeId:s.options.storeId,deviceId:s.options.deviceId,name:`Synthetic product ${suffix}`,
  }, { generateId:deterministicIds(suffix) });
  s.fixture.adapter.run("UPDATE outbox_operations SET status='SYNCED';");
  return { productVariantId:product.variant.id,packageUnitId:product.basePackage.id };
}

describe('M10 atomic bounded cache', () => {
  it.each(['replacement','expanded'] as const)('C1 admits newly accepted keys at the same revision in a %s request',async mode => {
    const s=setup();
    try {
      await s.client.reconcile(); await s.client.refresh([s.key]);
      const nextKey=addAcceptedProduct(s);
      const keys=mode==='replacement' ? [nextKey] : [s.key,nextKey];
      s.transport.read=async () => ({ ...s.response,results:keys.map(key => ({ ...s.response.results[0],key })) });
      await s.client.refresh(keys);
      expect(s.client.getSaved().map(row => row.result.key)).toEqual(keys);
      expect(s.fixture.adapter.getAllRows('SELECT * FROM market_cache')).toHaveLength(keys.length);
    } finally { s.fixture.closeAndDelete(); }
  });
  it('C1 reads original identity-only cache metadata without a schema rewrite',async () => {
    const s=setup();
    try {
      await s.client.reconcile(); await s.client.refresh([s.key]);
      const row=s.fixture.adapter.getFirstRow<{ local_identity_context:string }>('SELECT local_identity_context FROM market_cache')!;
      const originalIdentity=JSON.parse(row.local_identity_context).identityContext as string;
      s.fixture.adapter.run('UPDATE market_cache SET local_identity_context=?',[originalIdentity]);
      expect(s.client.getSaved()[0]).toMatchObject({ status:'SAVED',result:{ key:s.key,status:'AVAILABLE' } });
      const nextKey=addAcceptedProduct(s);
      s.transport.read=async () => ({ ...s.response,results:[{ ...s.response.results[0],key:nextKey }] });
      await s.client.refresh([nextKey]);
      expect(s.client.getSaved().map(row => row.result.key)).toEqual([nextKey]);
    } finally { s.fixture.closeAndDelete(); }
  });
  it.each(['INSUFFICIENT_DATA','UNMAPPED','EXPIRED'] as const)('C1 retains an omitted %s fence through replacement and restart',async kind => {
    const s=setup();
    let restarted: ReturnType<typeof reopenDatabase> | null=null;
    try {
      await s.client.reconcile(); await s.client.refresh([s.key]);
      const { key,mappingVersion,marketVariantId,marketPackageId,packageName }=s.response.results[0];
      if(kind==='EXPIRED') {
        s.setNow(Date.parse('2026-10-04T06:00:00.000Z'));
        expect(s.client.getSaved()[0].status).toBe('EXPIRED');
      } else {
        s.transport.read=async () => ({ ...s.response,results:[{ key,mappingVersion,marketVariantId,marketPackageId,packageName,status:kind }] });
        await s.client.refresh([s.key]);
      }
      const nextKey=addAcceptedProduct(s);
      const fresh={ ...s.response,serverTime:'2026-10-04T06:00:00.000Z',results:[{ ...s.response.results[0],key:nextKey,
        calculatedAt:'2026-10-04T06:00:00.000Z',windowStart:'2026-09-04T06:00:00.000Z',validUntil:'2026-10-05T06:00:00.000Z' }] };
      // Give B a current synthetic release; A's original expiry remains fenced.
      s.setNow(Date.parse(fresh.serverTime));
      s.transport.read=async () => fresh;
      await s.client.refresh([nextKey]);
      expect(s.client.getSaved().map(row => row.result.key)).toEqual([nextKey]);
      expect(s.fixture.adapter.getAllRows('SELECT * FROM market_cache')).toHaveLength(2);
      s.fixture.adapter.close();
      restarted=reopenDatabase(s.fixture.path);
      const client=createMarketClient(restarted,s.options);
      expect(client.getSaved().map(row => row.result.key)).toEqual([nextKey]);
      s.transport.read=async () => ({ ...fresh,results:[{ ...fresh.results[0],key:s.key }] });
      await client.refresh([s.key]);
      const saved=client.getSaved()[0];
      if(kind==='EXPIRED') {
        expect(saved.status).toBe('EXPIRED');
        s.setNow(Date.parse(s.response.serverTime));
        expect(client.getSaved()[0].status).toBe('EXPIRED');
      } else {
        expect(saved.result.status).toBe(kind);
        expect(saved.result).not.toHaveProperty('median');
      }
      // A strictly newer release may replace the durable same-revision fence.
      s.setNow(Date.parse(fresh.serverTime));
      s.transport.read=async () => ({ ...fresh,revision:2,results:[{ ...fresh.results[0],key:s.key }] });
      await client.refresh([s.key]);
      expect(client.getSaved()[0]).toMatchObject({ status:'SAVED',result:{ status:'AVAILABLE' } });
      expect(restarted.getAllRows('SELECT * FROM market_cache')).toHaveLength(1);
    } finally { restarted?.close(); s.fixture.closeAndDelete(); }
  });
  it.each([1,2])('C1 rejects an atomic expanded response with a stale mapping at revision%s',async revision => {
    const s=setup();
    try {
      await s.client.reconcile();
      s.transport.read=async () => ({ ...s.response,results:[{ ...s.response.results[0],mappingVersion:2 }] });
      await s.client.refresh([s.key]);
      const nextKey=addAcceptedProduct(s);
      const before=s.fixture.adapter.getAllRows('SELECT * FROM market_cache');
      s.transport.read=async () => ({ ...s.response,revision,results:[s.response.results[0],{ ...s.response.results[0],key:nextKey }] });
      await expect(s.client.refresh([s.key,nextKey])).rejects.toThrow('Stale market mapping version');
      expect(s.fixture.adapter.getAllRows('SELECT * FROM market_cache')).toEqual(before);
    } finally { s.fixture.closeAndDelete(); }
  });
  it('C1 ignores older replies requesting a different key set',async () => {
    const s=setup();
    try {
      await s.client.reconcile(); await s.client.refresh([s.key]);
      const nextKey=addAcceptedProduct(s);
      s.transport.read=async () => ({ ...s.response,revision:2,results:[{ ...s.response.results[0],key:nextKey }] });
      await s.client.refresh([nextKey]);
      const before=s.fixture.adapter.getAllRows('SELECT * FROM market_cache');
      s.transport.read=async () => s.response;
      await s.client.refresh([s.key]);
      expect(s.client.getSaved().map(row => row.result.key)).toEqual([nextKey]);
      expect(s.fixture.adapter.getAllRows('SELECT * FROM market_cache')).toEqual(before);
    } finally { s.fixture.closeAndDelete(); }
  });
  it('C1 rejects capacity overflow atomically rather than evicting same-revision fences',async () => {
    const s=setup();
    try {
      await s.client.reconcile();
      const keys=Array.from({ length:100 },(_,i) => ({ productVariantId:testId(3000+i),packageUnitId:testId(4000+i) }));
      s.transport.read=async () => ({ ...s.response,results:keys.map(key => ({ key,mappingVersion:0,
        marketVariantId:null,marketPackageId:null,packageName:null,status:'UNMAPPED' })) });
      await s.client.refresh(keys);
      const before=s.fixture.adapter.getAllRows('SELECT * FROM market_cache');
      const beforeControl=s.client.getControl();
      s.transport.read=async () => s.response;
      await expect(s.client.refresh([s.key])).rejects.toThrow('Market cache protection limit reached');
      expect(s.fixture.adapter.getAllRows('SELECT * FROM market_cache')).toEqual(before);
      expect(s.client.getControl()).toEqual(beforeControl);
      s.transport.read=async () => ({ ...s.response,revision:2 });
      await s.client.refresh([s.key]);
      expect(s.client.getSaved()).toHaveLength(1);
      expect(s.fixture.adapter.getAllRows('SELECT * FROM market_cache')).toHaveLength(1);
    } finally { s.fixture.closeAndDelete(); }
  });
  it('C1 rejects a response in flight when confirmed control context changes',async () => {
    const s=setup();
    try {
      await s.client.reconcile();
      let finish!: (value: unknown) => void;
      s.transport.read=() => new Promise(resolve => { finish=resolve; });
      const run=s.client.refresh([s.key]);
      s.state.version=2; s.state.generation=2;
      await s.client.reconcile();
      finish(s.response); await run;
      expect(s.client.getSaved()).toEqual([]);
      expect(s.fixture.adapter.getAllRows('SELECT * FROM market_cache')).toEqual([]);
    } finally { s.fixture.closeAndDelete(); }
  });
  it('shows saved/expired explicitly and rechecks clock on every read', async () => {
    const s=setup();
    try {
      await s.client.reconcile(); await s.client.refresh([s.key]);
      expect(s.client.getSaved()[0].status).toBe('SAVED');
      s.setNow(Date.parse('2026-10-04T06:00:00.000Z'));
      expect(s.client.getSaved()[0].status).toBe('EXPIRED');
      s.setNow(Date.parse('2026-10-03T06:00:00.000Z'));
      expect(s.client.getSaved()[0].status).toBe('EXPIRED');
      s.setNow(Date.parse('2026-10-01T06:00:00.000Z'));
      expect(s.client.getSaved()[0].status).toBe('EXPIRED');
    } finally { s.fixture.closeAndDelete(); }
  });
  it('insufficient newer revision tombstones numerics and delayed older response cannot restore them', async () => {
    const s=setup();
    try {
      await s.client.reconcile(); await s.client.refresh([s.key]);
      const { key,mappingVersion,marketVariantId,marketPackageId,packageName }=s.response.results[0];
      s.transport.read=async () => ({ ...s.response,revision:2,results:[{ key,mappingVersion,marketVariantId,marketPackageId,packageName,status:'INSUFFICIENT_DATA' }] });
      await s.client.refresh([s.key]);
      expect(s.client.getSaved()[0].result).not.toHaveProperty('median');
      s.transport.read=async () => s.response;
      await s.client.refresh([s.key]);
      expect(s.client.getSaved()[0].result.status).toBe('INSUFFICIENT_DATA');
    } finally { s.fixture.closeAndDelete(); }
  });
  it('equal-revision expiry tombstones may suppress but never resurrect numbers',async () => {
    const s=setup();
    try {
      await s.client.reconcile(); await s.client.refresh([s.key]);
      const { key,mappingVersion,marketVariantId,marketPackageId,packageName }=s.response.results[0];
      s.transport.read=async () => ({ ...s.response,results:[{ key,mappingVersion,marketVariantId,marketPackageId,packageName,status:'INSUFFICIENT_DATA' }] });
      await s.client.refresh([s.key]);
      expect(s.client.getSaved()[0].result.status).toBe('INSUFFICIENT_DATA');
      s.transport.read=async () => s.response; await s.client.refresh([s.key]);
      expect(s.client.getSaved()[0].result).not.toHaveProperty('median');
    } finally { s.fixture.closeAndDelete(); }
  });
  it('rejects whole malformed response before any cache replacement', async () => {
    const s=setup();
    try {
      await s.client.reconcile(); await s.client.refresh([s.key]);
      const before=s.fixture.adapter.getAllRows('SELECT * FROM market_cache');
      s.transport.read=async () => ({ ...s.response,revision:2,results:[{ ...s.response.results[0],supplier:'PRIVATE' }] });
      await expect(s.client.refresh([s.key])).rejects.toThrow();
      expect(s.fixture.adapter.getAllRows('SELECT * FROM market_cache')).toEqual(before);
    } finally { s.fixture.closeAndDelete(); }
  });
  it.each([{ storeId:testId(909) },{ controlVersion:2 },{ generation:2 },{ zone:null },{ currencyCode:'USD' },{ results:[] }])('rejects foreign/missing response context %j',async change => {
    const s=setup();
    try {
      await s.client.reconcile();
      s.transport.read=async () => ({ ...s.response,...change });
      await expect(s.client.refresh([s.key])).rejects.toThrow();
      expect(s.client.getSaved()).toEqual([]);
    } finally { s.fixture.closeAndDelete(); }
  });
  it('old in-flight response cannot survive local OFF and pending revocation', async () => {
    const s=setup();
    try {
      await s.client.reconcile();
      let finish!: (value: unknown) => void;
      s.transport.read=() => new Promise(resolve => { finish=resolve; });
      const run=s.client.refresh([s.key]);
      s.client.queueDisable(); finish(s.response); await run;
      expect(s.client.getSaved()).toEqual([]);
      expect(s.fixture.adapter.getAllRows('SELECT * FROM market_cache')).toEqual([]);
      expect(readMarketControl(s.fixture.adapter,s.options.storeId).disableRequested).toBe(true);
    } finally { s.fixture.closeAndDelete(); }
  });
  it('local package conversion/identity changes permanently tombstone saved numerics', async () => {
    const s=setup();
    try {
      await s.client.reconcile(); await s.client.refresh([s.key]);
      s.fixture.adapter.run('UPDATE package_units SET conversion_to_base_micros=2000000 WHERE id=?',[s.key.packageUnitId]);
      expect(s.client.getSaved()).toEqual([]);
      expect(s.fixture.adapter.getAllRows('SELECT * FROM market_cache')).toEqual([]);
    } finally { s.fixture.closeAndDelete(); }
  });
  it('changed catalogue during flight blocks insertion', async () => {
    const s=setup();
    try {
      await s.client.reconcile();
      let finish!: (value: unknown) => void;
      s.transport.read=() => new Promise(resolve => { finish=resolve; });
      const run=s.client.refresh([s.key]);
      s.fixture.adapter.run('UPDATE package_units SET conversion_to_base_micros=2000000 WHERE id=?',[s.key.packageUnitId]);
      finish(s.response); await run;
      expect(s.client.getSaved()).toEqual([]);
    } finally { s.fixture.closeAndDelete(); }
  });
  it('no read sends arbitrary windows/cohorts/threshold or private names', async () => {
    const s=setup();
    try {
      await s.client.reconcile(); await s.client.refresh([s.key]);
      expect(s.transport.read).toHaveBeenCalledWith({ storeId:s.options.storeId,deviceId:s.options.deviceId,keys:[s.key] });
      expect(s.client.getProducts()[0]).toMatchObject(s.key);
      expect(JSON.stringify((s.transport.read as jest.Mock).mock.calls)).not.toMatch(/Synthetic package|supplier|quantity|window|threshold|cohort/);
      await expect(s.client.refresh(Array(101).fill(s.key))).rejects.toThrow();
    } finally { s.fixture.closeAndDelete(); }
  });
  it('invalidates and denies after account/device/ownership loss without touching business facts', async () => {
    const s=setup();
    try {
      await s.client.reconcile(); await s.client.refresh([s.key]);
      const before=s.fixture.adapter.getAllRows('SELECT * FROM outbox_operations');
      s.fixture.adapter.run("UPDATE users SET status='INACTIVE' WHERE id=?",[s.options.userId]);
      expect(() => s.client.getSaved()).toThrow('active owner');
      await expect(s.client.refresh([s.key])).rejects.toThrow('active owner');
      expect(s.fixture.adapter.getAllRows('SELECT * FROM outbox_operations')).toEqual(before);
    } finally { s.fixture.closeAndDelete(); }
  });
});
