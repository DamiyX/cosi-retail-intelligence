import type { StaffControlRequest,StaffSnapshot } from '@retail/contracts';
import { createStaffControlClient,type StaffControlTransport } from '../src/staff/control';
import { createUser,createStoreMember,createDevice } from '../src/db/repositories';
import { openCatalogueFixture,testId,reopenDatabase,deterministicIds,countRows } from './catalogueSupport';

function setup(){
  const f=openCatalogueFixture();const actor={storeId:f.context.store.id,userId:f.context.owner.id,deviceId:f.context.device.id};
  const user=createUser(f.adapter,{id:testId(900),displayName:'Synthetic staff'});
  const member=createStoreMember(f.adapter,{id:testId(901),storeId:actor.storeId,userId:user.id,role:'STAFF'});
  const device=createDevice(f.adapter,{id:testId(902),storeId:actor.storeId,userId:user.id,platform:'ANDROID',appVersion:'synthetic'});
  let snapshot:StaffSnapshot={targetMemberId:member.id,targetDeviceId:null,userId:user.id,role:'STAFF',memberStatus:'ACTIVE',accountStatus:'ACTIVE',deviceStatus:null,version:0};
  const requests:StaffControlRequest[]=[];
  const transport:StaffControlTransport={mode:'SYNTHETIC',authenticatedUserId:actor.userId,online:true,
    async state(r){return{protocolVersion:1,storeId:actor.storeId,deviceId:actor.deviceId,actorUserId:actor.userId,available:true,snapshot:{...snapshot,targetDeviceId:r.targetDeviceId,deviceStatus:r.targetDeviceId?'ACTIVE':null}};},
    async control(r){requests.push({...r});snapshot={...snapshot,targetDeviceId:r.targetDeviceId,deviceStatus:r.targetDeviceId?'REVOKED':null,memberStatus:r.action==='MEMBER_REACTIVATE'?'ACTIVE':r.action==='MEMBER_SUSPEND'?'SUSPENDED':snapshot.memberStatus,version:r.expectedVersion+1};return{protocolVersion:1,actorUserId:actor.userId,request:r,status:'APPLIED',snapshot};},
  };
  return{f,actor,user,member,device,transport,requests,client:createStaffControlClient(f.adapter,{...actor,transport,generateId:deterministicIds(1000)})};
}
describe('M11 synthetic control with actual durable SQLite',()=>{
  it('shipped transport stays unavailable and creates no intent or authority',()=>{
    const {f,actor,member}=setup();try{
      const client=createStaffControlClient(f.adapter,actor);
      expect(client.available).toBe(false);expect(()=>client.queueRequest(member.id,'MEMBER_REACTIVATE',null,true)).toThrow(/unavailable/);
      expect(countRows(f.adapter,'staff_control_requests')).toBe(0);expect(client.listRequests()).toEqual([]);
    }finally{f.closeAndDelete();}
  });
  it('offline pending/restart preserves immutable body; timeout and same-ID retry cannot grant access',async()=>{
    const {f,actor,member,transport,client,requests}=setup();let reopened:ReturnType<typeof reopenDatabase>|undefined;
    try{
      await client.refreshTarget(member.id);
      const intent=client.queueRequest(member.id,'MEMBER_SUSPEND',null,true,testId(1000));
      expect(()=>client.queueRequest(member.id,'MEMBER_REACTIVATE',null,true,testId(1000))).toThrow(/different/);
      expect(()=>client.queueRequest(member.id,'MEMBER_SUSPEND',null,false)).toThrow(/confirmation/);
      expect(f.adapter.getFirstRow('SELECT status FROM store_members WHERE id=?;',[member.id])).toEqual({status:'ACTIVE'});
      const offline={...transport,online:false};
      const offlineClient=createStaffControlClient(f.adapter,{...actor,transport:offline});
      await expect(offlineClient.sendPending(intent.request.operationId)).rejects.toThrow(/confirmation/);
      const timedOut=createStaffControlClient(f.adapter,{...actor,transport:{...transport,async control(){throw new Error('Synthetic timeout after unknown server outcome');}}});
      await expect(timedOut.sendPending(intent.request.operationId)).rejects.toThrow(/timeout/);
      expect(client.listRequests()[0].status).toBe('PENDING');
      reopened=reopenDatabase(f.path);
      const restarted=createStaffControlClient(reopened,{...actor,transport});
      expect(restarted.listRequests()[0].request).toEqual(intent.request);
      await restarted.sendPending(intent.request.operationId);
      expect(restarted.listRequests()[0].status).toBe('CONFIRMED');
      expect(reopened.getFirstRow('SELECT status FROM store_members WHERE id=?;',[member.id])).toEqual({status:'SUSPENDED'});
      expect(await client.sendPending(intent.request.operationId)).toBeNull();expect(requests).toHaveLength(1);
      const reactivation=restarted.queueRequest(member.id,'MEMBER_REACTIVATE',null,true,testId(1001));
      await restarted.sendPending(reactivation.request.operationId);
      expect(restarted.listRequests().find(r=>r.operationId===testId(1001))?.status).toBe('CONFIRMED');
      expect(reopened.getFirstRow('SELECT status FROM store_members WHERE id=?;',[member.id])).toEqual({status:'SUSPENDED'});
      expect(countRows(reopened,'outbox_operations')).toBe(0);
    }finally{reopened?.close();f.closeAndDelete();}
  });
  it('conflicts and changed/foreign replies do not change membership or device authority',async()=>{
    const {f,actor,member,device,transport,client}=setup();try{
      await client.refreshTarget(member.id);
      const intent=client.queueRequest(member.id,'MEMBER_SUSPEND',null,true);
      const foreign=createStaffControlClient(f.adapter,{...actor,transport:{...transport,async control(r){return{protocolVersion:1,actorUserId:testId(999),request:r,status:'APPLIED',snapshot:{...client.getSnapshot(member.id)!,memberStatus:'SUSPENDED',version:1}};}}});
      await expect(foreign.sendPending(intent.request.operationId)).rejects.toThrow(/match/);
      const conflict=createStaffControlClient(f.adapter,{...actor,transport:{...transport,async control(r){return{protocolVersion:1,actorUserId:actor.userId,request:r,status:'CONFLICT',snapshot:{...client.getSnapshot(member.id)!,version:1}};}}});
      await conflict.sendPending(intent.request.operationId);
      expect(client.listRequests()[0].status).toBe('CONFLICT');
      expect(f.adapter.getFirstRow('SELECT status FROM store_members WHERE id=?;',[member.id])).toEqual({status:'ACTIVE'});
      expect(f.adapter.getFirstRow('SELECT status FROM devices WHERE id=?;',[device.id])).toEqual({status:'ACTIVE'});
      expect(()=>client.queueRequest(f.context.membership.id,'MEMBER_SUSPEND',null,true)).toThrow(/non-owner/);
      expect(()=>client.queueRequest(member.id,'DEVICE_REVOKE',f.context.device.id,true)).toThrow(/belong/);
    }finally{f.closeAndDelete();}
  });
  it('delayed lower-version reply cannot overwrite newer saved state',async()=>{
    const {f,actor,member,transport,client}=setup();try{
      await client.refreshTarget(member.id);
      const request=client.queueRequest(member.id,'MEMBER_SUSPEND',null,true).request;
      let resolve!:(value:unknown)=>void;
      const delayed=createStaffControlClient(f.adapter,{...actor,transport:{...transport,control:()=>new Promise(r=>{resolve=r;})}});
      const flight=delayed.sendPending(request.operationId);
      const newer=createStaffControlClient(f.adapter,{...actor,transport:{...transport,async state(){return{protocolVersion:1,storeId:actor.storeId,deviceId:actor.deviceId,actorUserId:actor.userId,available:true,snapshot:{...client.getSnapshot(member.id)!,version:2}};}}});
      await newer.refreshTarget(member.id);
      resolve({protocolVersion:1,actorUserId:actor.userId,request,status:'APPLIED',snapshot:{...client.getSnapshot(member.id)!,version:1,memberStatus:'SUSPENDED'}});
      await flight;expect(client.listRequests()[0].status).toBe('CONFLICT');
      expect(client.getSnapshot(member.id)?.version).toBe(2);
      expect(f.adapter.getFirstRow('SELECT status FROM store_members WHERE id=?;',[member.id])).toEqual({status:'ACTIVE'});
    }finally{f.closeAndDelete();}
  });
  it('two clients sending one persisted operation apply one terminal receipt and ignore the late duplicate',async()=>{
    const {f,actor,member,transport,client}=setup();try{
      await client.refreshTarget(member.id);
      const request=client.queueRequest(member.id,'MEMBER_SUSPEND',null,true).request;
      const replies:((value:unknown)=>void)[]=[];
      const shared:StaffControlTransport={...transport,control:()=>new Promise(resolve=>{replies.push(resolve);})};
      const first=createStaffControlClient(f.adapter,{...actor,transport:shared}).sendPending(request.operationId);
      const second=createStaffControlClient(f.adapter,{...actor,transport:shared}).sendPending(request.operationId);
      expect(replies).toHaveLength(2);
      const response={protocolVersion:1,actorUserId:actor.userId,request,status:'APPLIED',snapshot:{...client.getSnapshot(member.id)!,memberStatus:'SUSPENDED',version:1}};
      replies[1](response);await second;
      const receipt=f.adapter.getFirstRow('SELECT status,receipt FROM staff_control_requests WHERE operation_id=?;',[request.operationId]);
      replies[0](response);await first;
      expect(f.adapter.getFirstRow('SELECT status,receipt FROM staff_control_requests WHERE operation_id=?;',[request.operationId])).toEqual(receipt);
      expect(client.listRequests()).toHaveLength(1);expect(client.listRequests()[0].status).toBe('CONFIRMED');
      expect(client.getSnapshot(member.id)?.version).toBe(1);
      expect(f.adapter.getFirstRow('SELECT status FROM store_members WHERE id=?;',[member.id])).toEqual({status:'SUSPENDED'});
    }finally{f.closeAndDelete();}
  });
  it.each(['STAFF','ADMIN','SUSPENDED','REVOKED'])('denies %s actor and late confirmations after authority changes',async mode=>{
    const {f,actor,member,transport,client}=setup();try{
      await client.refreshTarget(member.id);const request=client.queueRequest(member.id,'MEMBER_SUSPEND',null,true).request;
      let resolve!:(value:unknown)=>void;
      const delayed=createStaffControlClient(f.adapter,{...actor,transport:{...transport,control:()=>new Promise(r=>{resolve=r;})}});
      const flight=delayed.sendPending(request.operationId);
      if(mode==='SUSPENDED')f.adapter.run("UPDATE users SET status='SUSPENDED' WHERE id=?;",[actor.userId]);
      else if(mode==='REVOKED')f.adapter.run("UPDATE devices SET status='REVOKED' WHERE id=?;",[actor.deviceId]);
      else f.adapter.run('UPDATE store_members SET role=? WHERE id=?;',[mode,f.context.membership.id]);
      resolve({protocolVersion:1,actorUserId:actor.userId,request,status:'APPLIED',snapshot:{...parseSnapshot(f),memberStatus:'SUSPENDED',version:1}});
      await expect(flight).rejects.toThrow();expect(()=>client.listRequests()).toThrow();
      expect(f.adapter.getFirstRow('SELECT status FROM store_members WHERE id=?;',[member.id])).toEqual({status:'ACTIVE'});
      expect(f.adapter.getFirstRow('SELECT status FROM staff_control_requests WHERE operation_id=?;',[request.operationId])).toEqual({status:'PENDING'});
    }finally{f.closeAndDelete();}
  });
  it('revokes only the target bound device and never reenrolls it',async()=>{
    const {f,client,member,device}=setup();try{
      await client.refreshTarget(member.id,device.id);
      const request=client.queueRequest(member.id,'DEVICE_REVOKE',device.id,true).request;
      await client.sendPending(request.operationId);
      expect(f.adapter.getFirstRow('SELECT status FROM devices WHERE id=?;',[device.id])).toEqual({status:'REVOKED'});
      expect(f.adapter.getFirstRow('SELECT status FROM devices WHERE id=?;',[f.context.device.id])).toEqual({status:'ACTIVE'});
    }finally{f.closeAndDelete();}
  });
});
function parseSnapshot(f:ReturnType<typeof openCatalogueFixture>):StaffSnapshot{return JSON.parse(f.adapter.getFirstRow<{snapshot:string}>('SELECT snapshot FROM staff_control_snapshots LIMIT 1;')!.snapshot);}
