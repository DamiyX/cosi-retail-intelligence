import { fireEvent, render, screen } from '@testing-library/react-native';
import { createStaffClient } from '../src/staff/client';
import { StaffActivityScreen } from '../src/screens/staff/StaffActivityScreen';
import { createTemporaryProduct } from '../src/catalogue/createTemporaryProduct';
import { completeSale } from '../src/sales/completeSale';
import { recordPurchase } from '../src/purchases/recordPurchase';
import { recordExpense } from '../src/finance/recordExpense';
import { recordOwnerWithdrawal } from '../src/finance/recordOwnerWithdrawal';
import { createDatabaseInventoryClient } from '../src/inventory/client';
import { createUser, createStoreMember, createDevice } from '../src/db/repositories';
import { openCatalogueFixture, deterministicIds, testId, countRows } from './catalogueSupport';

function setup() {
  const f=openCatalogueFixture();const actor={storeId:f.context.store.id,deviceId:f.context.device.id,userId:f.context.owner.id};
  const product=createTemporaryProduct(f.adapter,{...actor,name:'Rice'},{generateId:deterministicIds(200)});
  createUser(f.adapter,{id:testId(900),displayName:'Cashier recorded'});
  const member=createStoreMember(f.adapter,{id:testId(901),storeId:actor.storeId,userId:testId(900),role:'STAFF'});
  const device=createDevice(f.adapter,{id:testId(902),storeId:actor.storeId,userId:testId(900),platform:'ANDROID',appVersion:'synthetic'});
  const line={storeProductId:product.storeProduct.id,packageUnitId:product.basePackage.id,quantityPackagesMicros:1000000};
  const sale=completeSale(f.adapter,{...actor,userId:member.userId,deviceId:device.id,lines:[{...line,unitPriceMinor:100}],payment:{method:'CASH'}},{generateId:deterministicIds(300)});
  const purchase=recordPurchase(f.adapter,{...actor,lines:[{...line,quantityPackagesMicros:10000000,enteredCostMinor:1000}]},{generateId:deterministicIds(400)});
  recordExpense(f.adapter,{...actor,category:'MISCELLANEOUS',currencyCode:'NGN',amountMinor:100},{generateId:deterministicIds(500)});
  recordOwnerWithdrawal(f.adapter,{...actor,currencyCode:'NGN',amountMinor:100},{generateId:deterministicIds(600)});
  return {f,actor,member,device,product,sale,purchase,client:createStaffClient(f.adapter,actor)};
}
describe('M11 owner activity and evidence',()=>{
  it('shows real actors and stable tied pagination, filters store/member/action/time without writing history',()=>{
    jest.useFakeTimers({now:new Date('2026-10-03T10:00:00.000Z')});
    const {f,client,member,sale}=setup();
    try{
      const before=countRows(f.adapter,'outbox_operations');
      const first=client.listActivity({},undefined,2); const second=client.listActivity({},first.next!,2);
      expect(first.rows.length).toBe(2);expect(second.rows.length).toBe(2);expect(second.next).toBeNull();
      expect(new Set([...first.rows,...second.rows].map(r=>r.kind+'/'+r.id)).size).toBe(4);
      expect(client.listActivity({memberId:member.id}).rows).toMatchObject([{kind:'SALE',actorName:'Cashier recorded',id:sale.sale.id}]);
      expect(client.listActivity({kind:'RESTOCK'}).rows).toHaveLength(1);
      expect(client.listActivity({until:'2026-10-03T10:00:00.000Z'}).rows).toHaveLength(0);
      expect(client.listActivity({from:'2026-10-03T10:00:00.000Z'}).rows).toHaveLength(4);
      expect(()=>client.listActivity({memberId:testId(999)})).toThrow();
      expect(()=>client.listActivity({from:'2026-02-30T00:00:00.000Z'})).toThrow();
      expect(()=>client.listActivity({},undefined,51)).toThrow();
      f.adapter.run("UPDATE users SET display_name='Renamed cashier',status='INACTIVE' WHERE id=?;",[member.userId]);
      f.adapter.run("UPDATE store_members SET status='INACTIVE' WHERE id=?;",[member.id]);
      expect(client.listActivity({memberId:member.id}).rows).toMatchObject([{actorName:'Renamed cashier',actorStatus:'INACTIVE',id:sale.sale.id}]);
      expect(client.listMembers().rows.find(m=>m.id===member.id)?.status).toBe('INACTIVE');
      expect(countRows(f.adapter,'outbox_operations')).toBe(before);
      expect(f.adapter.getFirstRow('SELECT created_by_user_id FROM sales WHERE id=?;',[sale.sale.id])).toEqual({created_by_user_id:member.userId});
    }finally{f.closeAndDelete();jest.useRealTimers();}
  });
  it('reviews first-count discrepancies and reasoned replacement attempts',()=>{
    const {f,client,actor,product}=setup();
    try{
      const inventory=createDatabaseInventoryClient(f.adapter,{...actor,generateId:deterministicIds(700)});
      const generated=inventory.generateGuidedChecks({operationId:testId(699),now:'2026-10-03T10:00:00.000Z'});
      const assignment=generated.assignments[0];
      expect(assignment).toBeDefined();
      const draft=inventory.startReconciliation(product.storeProduct.id,assignment.id);
      const submitted=inventory.submitReconciliation({reconciliationId:draft.reconciliationId,expectedInventoryWatermark:draft.inventoryWatermark,expectedBatchWatermark:draft.batchWatermark,physicalBaseUnits:'8000000'});
      expect(submitted).toBeDefined();
      const review=client.getCheckReview(assignment.id);
      expect(review.evidence.rows.some(e=>e.kind==='FIRST'&&e.difference==='-1000000')).toBe(true);
      inventory.cancelReconciliation(draft.reconciliationId);
      inventory.replaceGuidedCheck({assignmentId:assignment.id,reasonCode:'SHELF_UNAVAILABLE',note:'Shelf locked',operationId:testId(799),now:'2026-10-03T11:00:00.000Z'});
      const cancelled=client.getCheckReview(assignment.id).evidence.rows.find(e=>e.kind==='ATTEMPT');
      expect(cancelled).toMatchObject({reason:'SHELF_UNAVAILABLE',note:'Shelf locked',closedById:actor.userId,status:'CANCELLED'});
      expect(()=>client.getCheckReview(testId(999))).toThrow();
    }finally{f.closeAndDelete();}
  });
  it('preserves first and recount evidence after completion with the recorded closer',()=>{
    const {f,client,actor,product}=setup();
    try{
      const inventory=createDatabaseInventoryClient(f.adapter,{...actor,generateId:deterministicIds(700)});
      const assignment=inventory.generateGuidedChecks({operationId:testId(699),now:'2026-10-03T10:00:00.000Z'}).assignments[0];
      const draft=inventory.startReconciliation(product.storeProduct.id,assignment.id);
      const input={reconciliationId:draft.reconciliationId,expectedInventoryWatermark:draft.inventoryWatermark,expectedBatchWatermark:draft.batchWatermark};
      inventory.submitReconciliation({...input,physicalBaseUnits:'8000000'});
      inventory.submitReconciliation({...input,physicalBaseUnits:'9000000'});
      inventory.finalizeReconciliation({reconciliationId:draft.reconciliationId,operationId:testId(799)});
      const review=client.getCheckReview(assignment.id);
      expect(review.status).toBe('COMPLETED');
      expect(review.evidence.rows.find(e=>e.kind==='FIRST')).toMatchObject({difference:'-1000000',physical:'8000000',actorId:actor.userId});
      expect(review.evidence.rows.find(e=>e.kind==='RECOUNT')).toMatchObject({difference:'0',physical:'9000000',actorId:actor.userId});
      expect(review.evidence.rows.find(e=>e.kind==='ATTEMPT')).toMatchObject({status:'COMPLETED',closedById:actor.userId});
      const page=client.getCheckReview(assignment.id,undefined,1);
      expect(page.evidence.next).not.toBeNull();
      expect(client.getCheckReview(assignment.id,page.evidence.next!,1).evidence.rows[0].id).not.toBe(page.evidence.rows[0].id);
    }finally{f.closeAndDelete();}
  });
  it.each(['STAFF','ADMIN'])('rejects %s at the client and clears retained UI after owner access loss',role=>{
    const {f,client,actor,device}=setup();
    try{
      f.adapter.run('UPDATE store_members SET role=? WHERE user_id=?;',[role,device.userId]);
      expect(()=>createStaffClient(f.adapter,{storeId:actor.storeId,deviceId:device.id,userId:device.userId!})).toThrow();
      render(<StaffActivityScreen client={client}/>);
      expect(screen.getByText('Recorded activity')).toBeTruthy();
      fireEvent.press(screen.getByText('Review devices for Cashier recorded'));
      f.adapter.run("UPDATE devices SET status='REVOKED' WHERE id=?;",[actor.deviceId]);
      fireEvent.press(screen.getByText('Refresh saved activity'));
      expect(screen.getByText('Activity unavailable')).toBeTruthy();
      expect(screen.queryByText('Recorded activity')).toBeNull();
      expect(screen.queryByText('Cashier recorded devices')).toBeNull();
      expect(()=>client.listActivity()).toThrow(); expect(()=>client.listMembers()).toThrow();
    }finally{f.closeAndDelete();}
  });
});
