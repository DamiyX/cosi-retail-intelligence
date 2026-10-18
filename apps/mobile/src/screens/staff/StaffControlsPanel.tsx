import { useState } from 'react';
import { Alert,Pressable,Text,View } from 'react-native';
import type { StaffControlRequest } from '@retail/contracts';
import type { StaffControlClient, StaffRequestCursor } from '../../staff/control';
import type { StaffDevice } from '../../staff/client';

const labels:Record<StaffControlRequest['action'],string>={MEMBER_SUSPEND:'Suspend membership',MEMBER_REACTIVATE:'Request membership reactivation',DEVICE_REVOKE:'Revoke device'};
const statusLabels={PENDING:'Pending server confirmation',CONFIRMED:'Confirmed response',CONFLICT:'Conflict — review current state',DISABLED:'Unavailable — no change confirmed'};
export function StaffControlsPanel({client,memberId,name,devices}:{client:StaffControlClient;memberId:string;name:string;devices:StaffDevice[]}){
  const [busy,setBusy]=useState(false);const [message,setMessage]=useState<string|null>(null);const [revision,setRevision]=useState(0);
  const [pendingAfter,setPendingAfter]=useState<StaffRequestCursor|undefined>();
  const [recentAfter,setRecentAfter]=useState<StaffRequestCursor|undefined>();
  let pending:ReturnType<StaffControlClient['listMemberRequests']>={rows:[],next:null};
  let recent:ReturnType<StaffControlClient['listMemberRequests']>={rows:[],next:null};let denied=false;
  let snapshot:ReturnType<StaffControlClient['getSnapshot']>=null;
  try{pending=client.listMemberRequests(memberId,{status:'PENDING',after:pendingAfter});recent=client.listMemberRequests(memberId,{status:'TERMINAL',after:recentAfter});snapshot=client.getSnapshot(memberId);}catch{denied=true;}
  const run=async(work:()=>Promise<unknown>)=>{setBusy(true);try{await work();setMessage(null);}catch(e){setMessage(e instanceof Error?e.message:'Confirmation unavailable.');}finally{setBusy(false);setPendingAfter(undefined);setRecentAfter(undefined);setRevision(v=>v+1);}};
  const request=(action:StaffControlRequest['action'],deviceId:string|null)=>{
    Alert.alert(`${labels[action]} for ${name}?`,'This needs server confirmation. A pending request does not change permission.',[
      {text:'Cancel',style:'cancel'},
      {text:'Confirm',onPress:()=>void run(async()=>{const result=client.queueRequest(memberId,action,deviceId,true);await client.sendPending(result.request.operationId);})},
    ]);
  };
  const action=(label:string,work:()=>void)=><Pressable key={label} accessibilityRole="button" accessibilityState={{disabled:busy||!client.available||denied}}
    disabled={busy||!client.available||denied} style={{minHeight:48,padding:14,borderWidth:1,borderColor:'#7F8E88',borderRadius:10}} onPress={work}><Text>{label}</Text></Pressable>;
  const pageAction=(label:string,work:()=>void)=><Pressable accessibilityRole="button" accessibilityState={{disabled:busy||denied}}
    disabled={busy||denied} style={{minHeight:48,padding:14,borderWidth:1,borderColor:'#7F8E88',borderRadius:10}} onPress={work}><Text>{label}</Text></Pressable>;
  return <View style={{gap:12}} key={`control-${memberId}`}>
    <Text accessibilityRole="header" style={{fontSize:19,fontWeight:'600'}}>Member access</Text>
    <Text>{denied?'Member access review unavailable.':!client.available?'Member access changes are unavailable on this build.':'Read the current state online before confirming a request.'}</Text>
    {!denied&&snapshot&&<Text>Saved server response: Membership {snapshot.memberStatus} · Account {snapshot.accountStatus}. This response may be stale while offline.</Text>}
    <Text>Confirmed reactivation still requires current account, membership and device references before local access can resume. Revoked devices cannot be reactivated here.</Text>
    {message&&<Text accessibilityRole="alert">{message}</Text>}
    {action('Read confirmed membership state',()=>void run(()=>client.refreshTarget(memberId)))}
    {action('Suspend membership',()=>request('MEMBER_SUSPEND',null))}
    {action('Request membership reactivation',()=>request('MEMBER_REACTIVATE',null))}
    {devices.map(device=><View key={device.id} style={{gap:8}}>
      {action(`Read confirmed device state: ${device.label}`,()=>void run(()=>client.refreshTarget(memberId,device.id)))}
      {action(`Revoke device: ${device.label}`,()=>request('DEVICE_REVOKE',device.id))}
    </View>)}
    {!denied&&<View key={`requests-${revision}`} style={{gap:8}}><Text>Pending access requests</Text>
      {pending.rows.map(r=><View key={r.operationId} style={{gap:8}}><Text>{labels[r.request.action]} · {statusLabels[r.status]}</Text>
        {action('Retry pending confirmation',()=>void run(()=>client.sendPending(r.operationId)))}
      </View>)}
      {pending.next&&pageAction('See more pending requests',()=>setPendingAfter(pending.next!))}
      {pendingAfter&&pageAction('First pending requests',()=>setPendingAfter(undefined))}
      <Text>Recent access requests</Text>
      {recent.rows.map(r=><View key={r.operationId}><Text>{labels[r.request.action]} · {statusLabels[r.status]}</Text></View>)}
      {recent.next&&pageAction('See more recent requests',()=>setRecentAfter(recent.next!))}
      {recentAfter&&pageAction('First recent requests',()=>setRecentAfter(undefined))}
    </View>}
  </View>;
}
