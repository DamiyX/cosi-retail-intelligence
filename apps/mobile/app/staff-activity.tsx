import { useMemo } from 'react';
import { useIsFocused } from 'expo-router';
import { useDatabase } from '../src/db/DatabaseContext';
import { createStaffClient } from '../src/staff/client';
import { StaffActivityScreen } from '../src/screens/staff/StaffActivityScreen';
import { createStaffControlClient } from '../src/staff/control';

export default function StaffActivityRoute() {
  const db=useDatabase(); const focused=useIsFocused();
  const client=useMemo(()=>{if(!focused)return null;try{return createStaffClient(db);}catch{return null;}},[db,focused]);
  const controls=useMemo(()=>{if(!client)return null;try{return createStaffControlClient(db,client.actor);}catch{return null;}},[db,client]);
  return <StaffActivityScreen client={client} controls={controls} isFocused={focused}/>;
}
