import {
  parseStaffControlRequest,parseStaffControlResponse,parseStaffSnapshot,parseStaffStateResponse,
  type StaffControlRequest,type StaffControlResponse,type StaffSnapshot,type StaffStateRequest,
} from '@retail/contracts';
import type { DatabaseAdapter } from '../db/adapter';
import { generateMobileId } from '../crypto/mobileIds';
import { assertCurrentActor,resolveCurrentActor,type ActorIdentity } from '../storeContext/access';
import { requireId } from '../db/repositories/common';

/** No live implementation exists. Injection is explicitly synthetic evidence only. */
export interface StaffControlTransport {
  readonly mode:'DISABLED'|'SYNTHETIC';readonly authenticatedUserId:string|null;readonly online:boolean;
  state(request:StaffStateRequest):Promise<unknown>;control(request:StaffControlRequest):Promise<unknown>;
}
export const disabledStaffControlTransport:StaffControlTransport=Object.freeze({
  mode:'DISABLED',authenticatedUserId:null,online:false,
  async state(){throw new Error('Member controls are unavailable. Nothing was sent.');},
  async control(){throw new Error('Member controls are unavailable. Nothing was sent.');},
});
interface RequestRow {operation_id:string;request:string;status:'PENDING'|'CONFIRMED'|'CONFLICT'|'DISABLED';receipt:string|null}
export interface StaffRequestCursor { createdAt:string; operationId:string }
export interface StaffRequestPageOptions { after?:StaffRequestCursor; limit?:number; status?:'PENDING'|'TERMINAL' }
const key=(memberId:string,deviceId:string|null)=>deviceId?`DEVICE/${deviceId}`:`MEMBER/${memberId}`;
export function createStaffControlClient(db:DatabaseAdapter,options:Partial<ActorIdentity>&{transport?:StaffControlTransport;generateId?:()=>string}={}) {
  const actor=resolveCurrentActor(db,options,true);
  const transport=options.transport??disabledStaffControlTransport;
  const guard=()=>assertCurrentActor(db,actor,true);
  const transportGuard=()=>{guard();if(transport.mode!=='SYNTHETIC'||transport.authenticatedUserId!==actor.userId)throw new Error('Member controls are unavailable. Nothing was sent.');};
  const target=(memberId:string,deviceId:string|null)=>{
    guard();requireId(memberId);if(deviceId)requireId(deviceId);
    const member=db.getFirstRow<{user_id:string;role:string}>("SELECT user_id,role FROM store_members WHERE id=? AND store_id=? AND role IN ('ADMIN','STAFF');",[memberId,actor.storeId]);
    if(!member||member.user_id===actor.userId)throw new Error('Only existing non-owner members in this store can be managed.');
    if(deviceId&&!db.getFirstRow('SELECT id FROM devices WHERE id=? AND store_id=? AND user_id=?;',[deviceId,actor.storeId,member.user_id]))throw new Error('Target device does not belong to this member and store.');
    return member;
  };
  const validateSnapshot=(snapshot:StaffSnapshot,memberId:string,deviceId:string|null)=>{
    const member=target(memberId,deviceId);
    if(snapshot.targetMemberId!==memberId||snapshot.targetDeviceId!==deviceId||snapshot.userId!==member.user_id||snapshot.role!==member.role)throw new Error('Member response identity mismatch.');
  };
  const readSnapshot=(memberId:string,deviceId:string|null)=>{
    target(memberId,deviceId);
    const row=db.getFirstRow<{snapshot:string}>('SELECT snapshot FROM staff_control_snapshots WHERE store_id=? AND target_key=?;',[actor.storeId,key(memberId,deviceId)]);
    if(!row)return null;const snapshot=parseStaffSnapshot(JSON.parse(row.snapshot));validateSnapshot(snapshot,memberId,deviceId);return snapshot;
  };
  const saveSnapshot=(snapshot:StaffSnapshot)=>{
    validateSnapshot(snapshot,snapshot.targetMemberId,snapshot.targetDeviceId);
    const saved=readSnapshot(snapshot.targetMemberId,snapshot.targetDeviceId);
    if(saved&&snapshot.version<saved.version)return false;
    if(saved&&snapshot.version===saved.version){if(JSON.stringify(saved)!==JSON.stringify(snapshot))throw new Error('Conflicting saved member response.');return true;}
    db.run('INSERT INTO staff_control_snapshots(store_id,target_key,version,snapshot) VALUES (?,?,?,?) ON CONFLICT(store_id,target_key) DO UPDATE SET version=excluded.version,snapshot=excluded.snapshot;',
      [actor.storeId,key(snapshot.targetMemberId,snapshot.targetDeviceId),snapshot.version,JSON.stringify(snapshot)]);
    return true;
  };
  const readRequest=(operationId:string)=>{
    guard();const row=db.getFirstRow<RequestRow>('SELECT operation_id,request,status,receipt FROM staff_control_requests WHERE operation_id=? AND store_id=? AND actor_user_id=? AND device_id=?;',
      [requireId(operationId),actor.storeId,actor.userId,actor.deviceId]);
    if(!row)throw new Error('Pending member request is unavailable for this owner/device.');return row;
  };
  return {
    available:transport.mode==='SYNTHETIC',
    getSnapshot(memberId:string,deviceId:string|null=null){return readSnapshot(memberId,deviceId);},
    listRequests(limit=20) {
      guard();if(!Number.isInteger(limit)||limit<1||limit>50)throw new Error('Request page size must be 1 to 50.');
      return db.getAllRows<RequestRow>('SELECT operation_id,request,status,receipt FROM staff_control_requests WHERE store_id=? AND actor_user_id=? AND device_id=? ORDER BY created_at DESC,operation_id DESC LIMIT ?;',
        [actor.storeId,actor.userId,actor.deviceId,limit]).map(r=>({operationId:r.operation_id,request:parseStaffControlRequest(JSON.parse(r.request)),status:r.status}));
    },
    /** Scope member/status before LIMIT so terminal history cannot bury an uncertain intent. */
    listMemberRequests(memberId:string,options:StaffRequestPageOptions={}) {
      guard();target(memberId,null);
      const limit=options.limit??20,after=options.after;
      if(!Number.isInteger(limit)||limit<1||limit>50)throw new Error('Request page size must be 1 to 50.');
      if(options.status!==undefined&&!['PENDING','TERMINAL'].includes(options.status))throw new Error('Unsupported request status filter.');
      if(after) {
        requireId(after.operationId);
        if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(after.createdAt)||!Number.isFinite(Date.parse(after.createdAt)))throw new Error('Invalid request cursor.');
      }
      const rows=db.getAllRows<RequestRow&{created_at:string}>(
        `SELECT operation_id,request,status,receipt,created_at FROM staff_control_requests
         WHERE store_id=? AND actor_user_id=? AND device_id=? AND json_extract(request,'$.targetMemberId')=?
           AND (? IS NULL OR (?='PENDING' AND status='PENDING') OR (?='TERMINAL' AND status<>'PENDING'))
           AND (? IS NULL OR (created_at,operation_id)<(?,?))
         ORDER BY created_at DESC,operation_id DESC LIMIT ?;`,
        [actor.storeId,actor.userId,actor.deviceId,memberId,options.status??null,options.status??null,options.status??null,
          after?.createdAt??null,after?.createdAt??null,after?.operationId??null,limit+1]);
      const last=rows[limit-1];
      return {rows:rows.slice(0,limit).map(r=>({operationId:r.operation_id,request:parseStaffControlRequest(JSON.parse(r.request)),status:r.status})),
        next:rows.length>limit?{createdAt:last.created_at,operationId:last.operation_id}:null};
    },
    async refreshTarget(memberId:string,deviceId:string|null=null) {
      transportGuard();target(memberId,deviceId);if(!transport.online)throw new Error('Online confirmation is required to read member state.');
      const reply=parseStaffStateResponse(await transport.state({protocolVersion:1,storeId:actor.storeId,deviceId:actor.deviceId,targetMemberId:memberId,targetDeviceId:deviceId}));
      transportGuard();if(reply.storeId!==actor.storeId||reply.deviceId!==actor.deviceId||reply.actorUserId!==actor.userId||!reply.available)throw new Error('Member state is unavailable for this context.');
      db.transaction(()=>{transportGuard();validateSnapshot(reply.snapshot,memberId,deviceId);saveSnapshot(reply.snapshot);});
      return readSnapshot(memberId,deviceId);
    },
    queueRequest(memberId:string,action:StaffControlRequest['action'],deviceId:string|null=null,confirmed=false,operationId?:string) {
      transportGuard();target(memberId,deviceId);if(!confirmed)throw new Error('Owner confirmation is required.');
      const saved=readSnapshot(memberId,deviceId);if(!saved)throw new Error('Read confirmed member state online first.');
      const request=parseStaffControlRequest({protocolVersion:1,storeId:actor.storeId,deviceId:actor.deviceId,targetMemberId:memberId,targetDeviceId:deviceId,
        operationId:operationId??(options.generateId??generateMobileId)(),expectedVersion:saved.version,action});
      return db.transaction(()=>{
        transportGuard();target(memberId,deviceId);
        const old=db.getFirstRow<RequestRow>('SELECT operation_id,request,status,receipt FROM staff_control_requests WHERE operation_id=?;',[request.operationId]);
        if(old){if(old.request!==JSON.stringify(request))throw new Error('Operation ID already belongs to a different member request.');readRequest(request.operationId);return {request,status:old.status};}
        db.run("INSERT INTO staff_control_requests(operation_id,store_id,actor_user_id,device_id,target_key,request,status,receipt,created_at) VALUES (?,?,?,?,?,?,'PENDING',NULL,?);",
          [request.operationId,actor.storeId,actor.userId,actor.deviceId,key(memberId,deviceId),JSON.stringify(request),new Date().toISOString()]);
        return {request,status:'PENDING' as const};
      });
    },
    async sendPending(operationId:string):Promise<StaffControlResponse|null> {
      transportGuard();const pending=readRequest(operationId);if(pending.status!=='PENDING')return null;
      const request=parseStaffControlRequest(JSON.parse(pending.request));target(request.targetMemberId,request.targetDeviceId);
      if(!transport.online)throw new Error('Saved pending request. Server confirmation is still required.');
      const response=parseStaffControlResponse(await transport.control(request));
      transportGuard();if(response.actorUserId!==actor.userId||JSON.stringify(response.request)!==pending.request)throw new Error('Member confirmation does not match the saved request.');
      db.transaction(()=>{
        transportGuard();const current=readRequest(operationId);if(current.status!=='PENDING')return;
        validateSnapshot(response.snapshot,request.targetMemberId,request.targetDeviceId);
        const fresh=saveSnapshot(response.snapshot);
        const status=!fresh?'CONFLICT':response.status==='APPLIED'?'CONFIRMED':response.status==='DISABLED'?'DISABLED':'CONFLICT';
        // Restrict only on a fresh matching APPLIED response. Reactivation never grants local authority:
        // an authoritative M7 reference refresh must supply current membership/account/device state.
        if(fresh&&response.status==='APPLIED') {
          if(request.action==='MEMBER_SUSPEND')db.run("UPDATE store_members SET status='SUSPENDED' WHERE id=? AND store_id=? AND user_id=? AND role IN ('ADMIN','STAFF');",[request.targetMemberId,actor.storeId,response.snapshot.userId]);
          if(request.action==='DEVICE_REVOKE')db.run("UPDATE devices SET status='REVOKED' WHERE id=? AND store_id=? AND user_id=?;",[request.targetDeviceId,actor.storeId,response.snapshot.userId]);
        }
        db.run('UPDATE staff_control_requests SET status=?,receipt=? WHERE operation_id=? AND status=\'PENDING\';',[status,JSON.stringify(response),operationId]);
      });
      return response;
    },
  };
}
export type StaffControlClient=ReturnType<typeof createStaffControlClient>;
