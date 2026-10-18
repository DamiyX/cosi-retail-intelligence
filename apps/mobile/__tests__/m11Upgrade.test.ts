import { MIGRATIONS,openDatabase } from '../src/db/migrations';
import { openIsolatedDatabase } from '../src/db/testing';
import { provisionStoreContext } from '../src/storeContext/provisionStoreContext';
import { createTemporaryProduct } from '../src/catalogue/createTemporaryProduct';
import { completeSale } from '../src/sales/completeSale';
import { recordPurchase } from '../src/purchases/recordPurchase';
import { deterministicIds,reopenDatabase,testId } from './catalogueSupport';
import type { DatabaseAdapter } from '../src/db/adapter';
import { createMarketClient } from '../src/market/client';
import type { MarketTransport } from '../src/market/transport';
import type { MarketReadResponse, MarketState } from '@retail/contracts';
import { ensureSyncStoreState, updateSyncStoreState } from '../src/db/repositories';
function snapshot(db:DatabaseAdapter,names:string[]){return names.map(name=>({name,rows:db.getAllRows(`SELECT * FROM "${name.replace(/"/g,'""')}" ORDER BY rowid;`)}));}
it('upgrades populated schema27 to28 without altering facts, exact costing, pending outbox or actor provenance; restart/retry survives',async()=>{
  const f=openIsolatedDatabase(MIGRATIONS.slice(0,27));let restarted:ReturnType<typeof reopenDatabase>|undefined;
  try{
    expect(f.report.schemaVersion).toBe(27);
    const context=provisionStoreContext(f.adapter,{ownerDisplayName:'Synthetic owner',storeName:'Synthetic store',currencyCode:'NGN',countryCode:'NG',timezone:'Africa/Lagos',appVersion:'synthetic'},{generateId:deterministicIds(100)});
    const actor={storeId:context.store.id,userId:context.owner.id,deviceId:context.device.id};
    const product=createTemporaryProduct(f.adapter,{...actor,name:'Rice'},{generateId:deterministicIds(200)});
    const line={storeProductId:product.storeProduct.id,packageUnitId:product.basePackage.id,quantityPackagesMicros:1000000};
    const purchase=recordPurchase(f.adapter,{...actor,lines:[{...line,quantityPackagesMicros:3000000,enteredCostMinor:100}]},{generateId:deterministicIds(300),operationId:testId(299)});
    const saleInput={...actor,lines:[{...line,unitPriceMinor:100}],payment:{method:'CASH' as const}};
    const saleOptions={generateId:deterministicIds(400),operationId:testId(399)};
    const sale=completeSale(f.adapter,saleInput,saleOptions);
    // Populate the actual M10 saved-state/cache path using explicit synthetic transport before upgrading.
    f.adapter.run("UPDATE outbox_operations SET status='SYNCED' WHERE operation_id=?;",[product.outbox.operationId]);
    ensureSyncStoreState(f.adapter,actor);updateSyncStoreState(f.adapter,{storeId:actor.storeId,status:'IDLE'});
    const key={productVariantId:product.variant.id,packageUnitId:product.basePackage.id};
    const zone={id:testId(900),name:'Synthetic zone',countryCode:'NG',currencyCode:'NGN',version:1};
    const state:MarketState={policyVersion:1,storeId:actor.storeId,available:true,enabled:true,version:1,generation:1,zone,
      enabledAt:'2026-10-01T00:00:00.000Z',cutoffRevision:1,serverTime:'2026-10-03T06:00:00.000Z',zones:[zone]};
    const response:MarketReadResponse={policyVersion:1,storeId:actor.storeId,controlVersion:1,generation:1,zone,currencyCode:'NGN',revision:1,
      serverTime:state.serverTime,results:[{key,mappingVersion:0,marketVariantId:null,marketPackageId:null,packageName:null,status:'UNMAPPED'}]};
    const transport:MarketTransport={available:true,authenticatedUserId:actor.userId,async state(){return{status:'NOT_FOUND',operationId:null,state};},
      async read(){return response;},async control(){throw new Error('Synthetic control not used');}};
    const market=createMarketClient(f.adapter,{...actor,transport,now:()=>Date.parse(state.serverTime)});
    await market.reconcile();await market.refresh([key]);
    const savedMarket=market.getSaved();const savedControl=market.getControl();
    expect(f.adapter.getAllRows('SELECT * FROM market_cache')).toHaveLength(1);
    expect(f.adapter.getFirstRow("SELECT COUNT(*) count FROM outbox_operations WHERE status='PENDING';")).toEqual({count:2});
    const names=f.adapter.getAllRows<{name:string}>("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name<>'schema_migrations' ORDER BY name;").map(r=>r.name);
    const before=snapshot(f.adapter,names);
    expect(openDatabase(f.adapter,MIGRATIONS).schemaVersion).toBe(28);
    expect(snapshot(f.adapter,names)).toEqual(before);
    restarted=reopenDatabase(f.path);
    expect(openDatabase(restarted,MIGRATIONS).schemaVersion).toBe(28);
    expect(snapshot(restarted,names)).toEqual(before);
    const reopenedMarket=createMarketClient(restarted,{...actor,transport,now:()=>Date.parse(state.serverTime)});
    expect(reopenedMarket.getSaved()).toEqual(savedMarket);expect(reopenedMarket.getControl()).toEqual(savedControl);
    expect(completeSale(restarted,saleInput,saleOptions)).toEqual(sale);
    expect(restarted.getFirstRow('SELECT device_id,created_by_user_id FROM purchases WHERE id=?;',[purchase.purchase.id])).toEqual({device_id:actor.deviceId,created_by_user_id:actor.userId});
    expect(snapshot(restarted,names)).toEqual(before);
  }finally{restarted?.close();f.closeAndDelete();}
});
