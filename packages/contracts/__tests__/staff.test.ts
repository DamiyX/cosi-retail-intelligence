import { parseStaffControlRequest,parseStaffControlResponse,parseStaffStateResponse } from '../src/staff';
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const request={protocolVersion:1,storeId:id(1),deviceId:id(2),targetMemberId:id(3),targetDeviceId:null,operationId:id(4),expectedVersion:0,action:'MEMBER_SUSPEND'};
const snapshot={targetMemberId:id(3),targetDeviceId:null,userId:id(5),role:'STAFF',memberStatus:'SUSPENDED',accountStatus:'ACTIVE',deviceStatus:null,version:1};
describe('M11 disabled status-control contract',()=>{
  it('binds exact operation/body/version and minimal non-owner target response',()=>{
    const parsed=parseStaffControlRequest(request);
    expect(parseStaffControlResponse({protocolVersion:1,actorUserId:id(6),request:parsed,status:'APPLIED',snapshot}).snapshot.version).toBe(1);
    expect(()=>parseStaffControlRequest({...request,role:'OWNER'})).toThrow();
    expect(()=>parseStaffStateResponse({protocolVersion:1,storeId:id(1),deviceId:id(2),actorUserId:id(6),available:false,snapshot:{...snapshot,email:'private'}})).toThrow();
  });
  it.each([
    {snapshot:{...snapshot,targetMemberId:id(9)}},{snapshot:{...snapshot,version:0}},
    {snapshot:{...snapshot,role:'OWNER'}},{snapshot:{...snapshot,memberStatus:'ACTIVE'}},
    {snapshot:{...snapshot,targetDeviceId:id(9),deviceStatus:'REVOKED'}},
    {request:{...request,action:'MEMBER_REACTIVATE'},snapshot:{...snapshot,memberStatus:'ACTIVE',accountStatus:'SUSPENDED'}},
  ])('rejects mismatched or unsafe confirmation %#',delta=>{
    const response={protocolVersion:1,actorUserId:id(6),request,status:'APPLIED',snapshot};
    expect(()=>parseStaffControlResponse({...response,...delta})).toThrow();
  });
  it.each([{action:'DEVICE_REVOKE'},{targetDeviceId:id(9)},{expectedVersion:-1},{expectedVersion:0.5},{action:'ROLE_CHANGE'},{protocolVersion:2}])('rejects invalid intent %#',delta=>{
    expect(()=>parseStaffControlRequest({...request,...delta})).toThrow();
  });
});
