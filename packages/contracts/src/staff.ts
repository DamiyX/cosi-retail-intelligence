import { z } from 'zod';

/** D-052 disabled source foundation, independent of immutable business envelopes. */
const id=z.string().uuid();
const version=z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const target=z.object({storeId:id,deviceId:id,targetMemberId:id,targetDeviceId:id.nullable()}).strict();
export const staffControlRequestSchema=target.extend({
  protocolVersion:z.literal(1),operationId:id,expectedVersion:version,
  action:z.enum(['MEMBER_SUSPEND','MEMBER_REACTIVATE','DEVICE_REVOKE']),
}).strict().superRefine((v,ctx)=>{
  if((v.action==='DEVICE_REVOKE') !== (v.targetDeviceId!==null))ctx.addIssue({code:'custom',message:'Device revocation requires exactly one target device.'});
});
export const staffSnapshotSchema=z.object({
  targetMemberId:id,targetDeviceId:id.nullable(),userId:id,role:z.enum(['ADMIN','STAFF']),
  memberStatus:z.enum(['ACTIVE','SUSPENDED']),accountStatus:z.enum(['ACTIVE','SUSPENDED']),
  deviceStatus:z.enum(['ACTIVE','REVOKED']).nullable(),version,
}).strict().superRefine((v,ctx)=>{
  if((v.targetDeviceId===null)!==(v.deviceStatus===null))ctx.addIssue({code:'custom',message:'Invalid device snapshot.'});
});
export const staffStateRequestSchema=target.extend({protocolVersion:z.literal(1)}).strict();
export const staffStateResponseSchema=z.object({
  protocolVersion:z.literal(1),storeId:id,deviceId:id,actorUserId:id,available:z.boolean(),snapshot:staffSnapshotSchema,
}).strict();
export const staffControlResponseSchema=z.object({
  protocolVersion:z.literal(1),actorUserId:id,request:staffControlRequestSchema,
  status:z.enum(['APPLIED','CONFLICT','DISABLED']),snapshot:staffSnapshotSchema,
}).strict().superRefine((v,ctx)=>{
  if(v.snapshot.targetMemberId!==v.request.targetMemberId||v.snapshot.targetDeviceId!==v.request.targetDeviceId
    ||(v.status==='APPLIED' && (v.request.expectedVersion===Number.MAX_SAFE_INTEGER||v.snapshot.version!==v.request.expectedVersion+1
      ||(v.request.action==='MEMBER_SUSPEND'&&v.snapshot.memberStatus!=='SUSPENDED')
      ||(v.request.action==='MEMBER_REACTIVATE'&&(v.snapshot.memberStatus!=='ACTIVE'||v.snapshot.accountStatus!=='ACTIVE'))
      ||(v.request.action==='DEVICE_REVOKE'&&v.snapshot.deviceStatus!=='REVOKED'))))
    ctx.addIssue({code:'custom',message:'Response does not confirm the bound operation.'});
});
export type StaffControlRequest=z.infer<typeof staffControlRequestSchema>;
export type StaffControlResponse=z.infer<typeof staffControlResponseSchema>;
export type StaffSnapshot=z.infer<typeof staffSnapshotSchema>;
export type StaffStateRequest=z.infer<typeof staffStateRequestSchema>;
export type StaffStateResponse=z.infer<typeof staffStateResponseSchema>;
export const parseStaffControlRequest=(value:unknown):StaffControlRequest=>staffControlRequestSchema.parse(value);
export const parseStaffControlResponse=(value:unknown):StaffControlResponse=>staffControlResponseSchema.parse(value);
export const parseStaffSnapshot=(value:unknown):StaffSnapshot=>staffSnapshotSchema.parse(value);
export const parseStaffStateRequest=(value:unknown):StaffStateRequest=>staffStateRequestSchema.parse(value);
export const parseStaffStateResponse=(value:unknown):StaffStateResponse=>staffStateResponseSchema.parse(value);
