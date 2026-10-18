import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { formatQuantityMicros } from '@retail/domain';
import { ACTIVITY_KINDS, type ActivityFilter, type ActivityKind, type ActivityRow, type CheckReview, type StaffClient, type StaffMember } from '../../staff/client';
import type { StaffControlClient } from '../../staff/control';
import { StaffControlsPanel } from './StaffControlsPanel';

export function StaffActivityScreen({client,controls,isFocused=true}: {client:StaffClient|null;controls?:StaffControlClient|null;isFocused?:boolean}) {
  const [members,setMembers]=useState<StaffMember[]>([]);
  const [memberNext,setMemberNext]=useState<string|null>(null);
  const [memberId,setMemberId]=useState<string>();
  const [kind,setKind]=useState<ActivityKind>();
  const [from,setFrom]=useState(''); const [until,setUntil]=useState('');
  const [filter,setFilter]=useState<ActivityFilter>({});
  const [rows,setRows]=useState<ActivityRow[]>([]);
  const [next,setNext]=useState<ReturnType<StaffClient['listActivity']>['next']>(null);
  const [review,setReview]=useState<CheckReview|null>(null);
  const [deviceView,setDeviceView]=useState<{memberId:string;name:string;role:string;page:ReturnType<StaffClient['listDevices']>}|null>(null);
  const [error,setError]=useState<string|null>(null);
  const fail=useCallback((e:unknown)=>{setMembers([]);setRows([]);setReview(null);setDeviceView(null);setNext(null);setMemberNext(null);setError(e instanceof Error?e.message:'Activity is unavailable.');},[]);
  const refresh=useCallback(()=>{
    try {
      if(!client) throw new Error('An active store owner and bound device are required.');
      const people=client.listMembers(); const activity=client.listActivity(filter);
      setMembers(people.rows);setMemberNext(people.next);setRows(activity.rows);setNext(activity.next);setReview(null);setDeviceView(null);setError(null);
    } catch(e){fail(e);}
  },[client,filter,fail]);
  useEffect(()=>{
    // Synchronize the external SQLite read boundary on focus/filter changes; clear private rows on blur.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if(isFocused)refresh();else {setMembers([]);setRows([]);setReview(null);setDeviceView(null);}
    const sub=AppState.addEventListener('change',state=>{if(state==='active'&&isFocused)refresh();});return()=>sub.remove();
  },[refresh,isFocused]);
  const run=(work:()=>void)=>{try{work();setError(null);}catch(e){fail(e);}};
  return <ScrollView contentContainerStyle={styles.container}>
    <Text accessibilityRole="header" style={styles.title}>Staff and activity</Text>
    <Text style={styles.body}>{client?.storeName ?? 'No active owner store'}</Text>
    <Text style={styles.body}>Saved people, devices and recorded actions. Staff sign-in and assignments are not available yet.</Text>
    {error ? <View><Text accessibilityRole="alert" style={styles.body}>Activity unavailable</Text><Text style={styles.body}>{error}</Text></View> : <>
      <Text accessibilityRole="header" style={styles.heading}>Saved members</Text>
      <Pressable accessibilityRole="button" onPress={()=>setMemberId(undefined)} style={styles.action}><Text>All members{!memberId?' · Selected':''}</Text></Pressable>
      {members.map(member=><View key={member.id} style={styles.group}>
        <Pressable accessibilityRole="button" accessibilityState={{selected:memberId===member.id}} onPress={()=>setMemberId(member.id)} style={styles.action}>
          <Text style={styles.body}>{member.name} · {member.role}</Text><Text>Membership {member.status} · Account {member.accountStatus}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={()=>run(()=>{
          const page=client!.listDevices(member.id);
          setDeviceView({memberId:member.id,name:member.name,role:member.role,page});
        })} style={styles.action}><Text>Review devices for {member.name}</Text></Pressable>
      </View>)}
      {memberNext&&<Pressable accessibilityRole="button" style={styles.action} onPress={()=>run(()=>{const page=client!.listMembers(memberNext);setMembers(page.rows);setMemberNext(page.next);})}><Text>See more members</Text></Pressable>}
      {deviceView&&<View style={styles.group}><Text style={styles.heading}>{deviceView.name} devices</Text>
        {deviceView.page.rows.map(d=><Text key={d.id} style={styles.body}>{d.label} · {d.status}</Text>)}
        {!deviceView.page.rows.length&&<Text>No saved devices</Text>}
        {controls&&deviceView.role!=='OWNER'&&<StaffControlsPanel key={deviceView.memberId} client={controls} memberId={deviceView.memberId} name={deviceView.name} devices={deviceView.page.rows}/>}
        {deviceView.page.next&&<Pressable accessibilityRole="button" style={styles.action} onPress={()=>run(()=>setDeviceView({...deviceView,page:client!.listDevices(deviceView.memberId,deviceView.page.next!)}))}><Text>See more devices</Text></Pressable>}
      </View>}
      <Text style={styles.body}>Member controls are unavailable. Saved status is not a new permission grant.</Text>
      <Text accessibilityRole="header" style={styles.heading}>Recorded activity</Text>
      <View style={styles.filters}>{[undefined,...ACTIVITY_KINDS].map(value=><Pressable key={value??'ALL'} accessibilityRole="button" accessibilityState={{selected:kind===value}} onPress={()=>setKind(value)} style={styles.action}><Text>{value??'ALL ACTIONS'}</Text></Pressable>)}</View>
      <TextInput accessibilityLabel="Recorded date from UTC" placeholder="From YYYY-MM-DD (UTC)" value={from} onChangeText={setFrom} style={styles.input}/>
      <TextInput accessibilityLabel="Recorded date until UTC exclusive" placeholder="Until YYYY-MM-DD (UTC, exclusive)" value={until} onChangeText={setUntil} style={styles.input}/>
      <Pressable accessibilityRole="button" style={styles.action} onPress={()=>setFilter({memberId,kind,from:from?`${from}T00:00:00.000Z`:undefined,until:until?`${until}T00:00:00.000Z`:undefined})}><Text>Apply filters</Text></Pressable>
      <Text style={styles.body}>Ordered by recorded time on this device, not a verified order across devices. Names and account status are current saved labels.</Text>
      {!rows.length&&<Text style={styles.body}>No recorded activity for these filters.</Text>}
      {rows.map(row=><View key={`${row.kind}/${row.id}`} style={styles.group}>
        <Text style={styles.heading}>{row.kind} · {row.status}</Text><Text style={styles.body}>{row.actorName} · {row.actorStatus}</Text>
        <Text>{row.recordedAt} · {row.deviceLabel}</Text>{row.detail&&<Text>{row.detail}</Text>}
        {row.checkId&&<Pressable accessibilityRole="button" style={styles.action} onPress={()=>run(()=>setReview(client!.getCheckReview(row.checkId!)))}><Text>Review stock check</Text></Pressable>}
      </View>)}
      {next&&<Pressable accessibilityRole="button" style={styles.action} onPress={()=>run(()=>{const page=client!.listActivity(filter,next);setRows(page.rows);setNext(page.next);})}><Text>See more activity</Text></Pressable>}
      {review&&<View style={styles.group}><Text style={styles.heading}>Check review · {review.status}</Text>
        {review.replacesId&&<Text>Replacement of {review.replacesId}</Text>}
        <Text>Review evidence only. Replacements do not establish wrongdoing.</Text>
        {review.evidence.rows.map(e=><View key={`${e.kind}/${e.id}`} style={styles.group}><Text>{e.kind} · {e.status} · {e.actorName}</Text><Text>{e.recordedAt} · Device {e.deviceId}</Text>
          {e.closedAt&&<Text>Closed {e.closedAt} · {e.closedByName??'Unknown recorded person'}</Text>}
          {e.reason&&<Text>Reason: {e.reason}</Text>}{e.note&&<Text>{e.note}</Text>}
          {e.physical!==null&&<Text>Count {quantity(e.physical)} · Difference {quantity(e.difference??'0')} base units</Text>}
        </View>)}
        {review.evidence.next&&<Pressable accessibilityRole="button" style={styles.action} onPress={()=>run(()=>setReview(client!.getCheckReview(review.id,review.evidence.next!)))}><Text>See more check evidence</Text></Pressable>}
      </View>}
    </>}
    <Pressable accessibilityRole="button" style={styles.action} onPress={refresh}><Text>Refresh saved activity</Text></Pressable>
  </ScrollView>;
}

function quantity(value:string) {
  const magnitude=BigInt(value)<0n?-BigInt(value):BigInt(value);
  if(magnitude>BigInt(Number.MAX_SAFE_INTEGER)) return 'Too large to display';
  return `${BigInt(value)<0n?'-':''}${formatQuantityMicros(Number(magnitude))}`;
}

const styles=StyleSheet.create({container:{padding:24,gap:16,backgroundColor:'#F7F8F5'},title:{fontSize:30,fontWeight:'600',color:'#17251F'},heading:{fontSize:19,fontWeight:'600',color:'#17251F'},body:{fontSize:17,lineHeight:25,color:'#41534C'},action:{minHeight:48,padding:14,borderRadius:10,borderWidth:1,borderColor:'#7F8E88',backgroundColor:'#FFFFFF'},input:{minHeight:48,padding:14,borderWidth:1,borderColor:'#7F8E88',borderRadius:10},group:{gap:8,padding:12,backgroundColor:'#FFFFFF',borderRadius:10},filters:{gap:8,flexDirection:'row',flexWrap:'wrap'}});
