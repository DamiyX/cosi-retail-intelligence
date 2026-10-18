import { completeSale } from '../src/sales/completeSale';
import { recordPurchase } from '../src/purchases/recordPurchase';
import { recordExpense } from '../src/finance/recordExpense';
import { recordOwnerWithdrawal } from '../src/finance/recordOwnerWithdrawal';
import { getBusinessSummary } from '../src/finance/businessSummary';
import { startInventoryReconciliation } from '../src/inventory/reconcileInventory';
import { createTemporaryProduct } from '../src/catalogue/createTemporaryProduct';
import { createUser, createStoreMember } from '../src/db/repositories';
import { openCatalogueFixture, deterministicIds, testId, countRows } from './catalogueSupport';

describe('M11 direct commands require present actor before replay or writes', () => {
  it.each(['sale','purchase','expense','withdrawal','summary','reconciliation','catalogue'])('denies a suspended account in direct %s', kind => {
    const f = openCatalogueFixture();
    try {
      const a=f.adapter;
      const actor={storeId:f.context.store.id,deviceId:f.context.device.id,userId:f.context.owner.id};
      const product=createTemporaryProduct(a,{...actor,name:'Rice'},{generateId:deterministicIds(200)});
      const command=() => {
        const options={generateId:deterministicIds(300),operationId:testId(299)};
        const line={storeProductId:product.storeProduct.id,packageUnitId:product.basePackage.id,quantityPackagesMicros:1000000};
        if(kind==='sale') return completeSale(a,{...actor,lines:[{...line,unitPriceMinor:100}],payment:{method:'CASH'}},options);
        if(kind==='purchase') return recordPurchase(a,{...actor,lines:[{...line,enteredCostMinor:100}]},options);
        if(kind==='expense') return recordExpense(a,{...actor,category:'MISCELLANEOUS',amountMinor:100,currencyCode:'NGN'},options);
        if(kind==='withdrawal') return recordOwnerWithdrawal(a,{...actor,amountMinor:100,currencyCode:'NGN'},options);
        if(kind==='summary') return getBusinessSummary(a,actor);
        if(kind==='reconciliation') return startInventoryReconciliation(a,{...actor,storeProductId:product.storeProduct.id},options);
        return createTemporaryProduct(a,{...actor,name:'Denied'},options);
      };
      a.run("UPDATE users SET status='SUSPENDED' WHERE id=?;",[actor.userId]);
      const tables=['outbox_operations','sales','purchases','expenses','owner_withdrawals','inventory_reconciliations','inventory_events','store_products'];
      const before=tables.map(t=>countRows(a,t));
      expect(command).toThrow();
      expect(tables.map(t=>countRows(a,t))).toEqual(before);
    } finally { f.closeAndDelete(); }
  });
  it('denies actor/device mismatch before an existing sale replay; authorized retry preserves facts', () => {
    const f=openCatalogueFixture();
    try {
      const actor={storeId:f.context.store.id,deviceId:f.context.device.id,userId:f.context.owner.id};
      const product=createTemporaryProduct(f.adapter,{...actor,name:'Rice'},{generateId:deterministicIds(200)});
      const input={...actor,lines:[{storeProductId:product.storeProduct.id,packageUnitId:product.basePackage.id,quantityPackagesMicros:1000000,unitPriceMinor:100}],payment:{method:'CASH' as const}};
      const options={operationId:testId(299),generateId:deterministicIds(300)};
      const graph=completeSale(f.adapter,input,options);
      expect(completeSale(f.adapter,input,options)).toEqual(graph);
      createUser(f.adapter,{id:testId(900),displayName:'Other owner'});
      createStoreMember(f.adapter,{id:testId(901),storeId:actor.storeId,userId:testId(900),role:'OWNER'});
      expect(()=>completeSale(f.adapter,{...input,userId:testId(900)},options)).toThrow();
      f.adapter.run("UPDATE users SET status='INACTIVE' WHERE id=?;",[actor.userId]);
      expect(()=>completeSale(f.adapter,input,options)).toThrow();
      expect(countRows(f.adapter,'sales')).toBe(1);
    } finally { f.closeAndDelete(); }
  });
});
