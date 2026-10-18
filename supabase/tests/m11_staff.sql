-- SYNTHETIC rollback-only executable SQL/Auth/grant cases. AUTHORED, NOT EXECUTED here.
-- Needs explicitly approved disposable PostgreSQL with the M7/M8/M10/M11 source migrations.
-- Future approved execution: psql -v ON_ERROR_STOP=1 -f supabase/tests/m11_staff.sql
begin;
do $$ declare t record;begin
  assert not(select activated from staff_private.configuration), 'Activation defaults OFF';
  for t in select tablename from pg_tables where schemaname='staff_private' loop
    assert (select relrowsecurity from pg_class where oid=format('staff_private.%I',t.tablename)::regclass);
    assert not has_table_privilege('authenticated',format('staff_private.%I',t.tablename),'SELECT');
    assert not has_table_privilege('anon',format('staff_private.%I',t.tablename),'SELECT');
  end loop;
  assert not has_schema_privilege('authenticated','staff_private','USAGE');
  assert not has_function_privilege('anon','public.staff_control(jsonb)','EXECUTE');
  assert not has_function_privilege('anon','public.staff_state(jsonb)','EXECUTE');
  assert has_function_privilege('authenticated','public.staff_control(jsonb)','EXECUTE');
end; $$;
insert into public.app_users(id,auth_subject,display_name) values
 ('11000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000011','SYNTHETIC owner'),
 ('11000000-0000-4000-8000-000000000002','11000000-0000-4000-8000-000000000012','SYNTHETIC staff'),
 ('11000000-0000-4000-8000-000000000003','11000000-0000-4000-8000-000000000013','SYNTHETIC admin'),
 ('11000000-0000-4000-8000-000000000004','11000000-0000-4000-8000-000000000014','SYNTHETIC foreign owner');
insert into public.stores(id,name,currency_code,timezone,created_by_user_id) values
 ('11000000-0000-4000-8000-000000000020','SYNTHETIC store','NGN','UTC','11000000-0000-4000-8000-000000000001'),
 ('11000000-0000-4000-8000-000000000021','SYNTHETIC foreign','NGN','UTC','11000000-0000-4000-8000-000000000004');
insert into public.store_members(id,store_id,user_id,role) values
 ('11000000-0000-4000-8000-000000000030','11000000-0000-4000-8000-000000000020','11000000-0000-4000-8000-000000000001','OWNER'),
 ('11000000-0000-4000-8000-000000000031','11000000-0000-4000-8000-000000000020','11000000-0000-4000-8000-000000000002','STAFF'),
 ('11000000-0000-4000-8000-000000000032','11000000-0000-4000-8000-000000000020','11000000-0000-4000-8000-000000000003','ADMIN'),
 ('11000000-0000-4000-8000-000000000033','11000000-0000-4000-8000-000000000021','11000000-0000-4000-8000-000000000004','OWNER');
insert into public.devices(id,store_id,user_id,platform,app_version) values
 ('11000000-0000-4000-8000-000000000040','11000000-0000-4000-8000-000000000020','11000000-0000-4000-8000-000000000001','ANDROID','SYNTHETIC'),
 ('11000000-0000-4000-8000-000000000041','11000000-0000-4000-8000-000000000020','11000000-0000-4000-8000-000000000002','ANDROID','SYNTHETIC'),
 ('11000000-0000-4000-8000-000000000042','11000000-0000-4000-8000-000000000020','11000000-0000-4000-8000-000000000003','ANDROID','SYNTHETIC'),
 ('11000000-0000-4000-8000-000000000043','11000000-0000-4000-8000-000000000021','11000000-0000-4000-8000-000000000004','ANDROID','SYNTHETIC');
insert into public.store_sync_state(store_id) values('11000000-0000-4000-8000-000000000020'),('11000000-0000-4000-8000-000000000021');
do $$ declare q jsonb;s jsonb;r jsonb;old jsonb;v bigint;before_count bigint;begin
  s:=jsonb_build_object('protocolVersion',1,'storeId','11000000-0000-4000-8000-000000000020','deviceId','11000000-0000-4000-8000-000000000040',
    'targetMemberId','11000000-0000-4000-8000-000000000031','targetDeviceId',null);
  perform set_config('request.jwt.claim.sub','',true);
  begin perform public.staff_state(s);raise exception 'Anonymous accepted';exception when invalid_authorization_specification then null;end;
  perform set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000011',true);
  r:=public.staff_state(s);assert r->>'available'='false';v:=(r->'snapshot'->>'version')::bigint;
  assert (r->'snapshot')-array['targetMemberId','targetDeviceId','userId','role','memberStatus','accountStatus','deviceStatus','version']='{}'::jsonb,'Minimum response only';
  q:=s||jsonb_build_object('operationId','11000000-0000-4000-8000-000000000050','expectedVersion',v,'action','MEMBER_SUSPEND');
  assert public.staff_control(q)->>'status'='DISABLED';
  assert (select status from public.store_members where id='11000000-0000-4000-8000-000000000031')='ACTIVE';
  assert (select count(*) from staff_private.operations where store_id=(s->>'storeId')::uuid)=0;
  update staff_private.configuration set activated=true;
  old:=public.staff_control(q);assert old->>'status'='APPLIED';assert old->'snapshot'->>'memberStatus'='SUSPENDED';
  assert (old->'snapshot'->>'version')::bigint=v+1;
  assert public.staff_control(q)=old,'Identical retry is original durable receipt';
  begin perform public.staff_control(q||jsonb_build_object('action','MEMBER_REACTIVATE'));raise exception 'Changed body accepted';exception when invalid_parameter_value then null;end;
  assert public.staff_control(q||jsonb_build_object('operationId','11000000-0000-4000-8000-000000000051'))->>'status'='CONFLICT';
  q:=s||jsonb_build_object('operationId','11000000-0000-4000-8000-000000000052','expectedVersion',v+1,'action','MEMBER_REACTIVATE');
  r:=public.staff_control(q);assert r->>'status'='APPLIED';assert r->'snapshot'->>'memberStatus'='ACTIVE';
  assert (select count(*) from staff_private.operations where store_id=(s->>'storeId')::uuid)=3;
  -- Different token cannot use owner device; STAFF/ADMIN devices cannot acquire owner authority.
  perform set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000012',true);
  begin perform public.staff_control(q);raise exception 'Wrong token accepted';exception when insufficient_privilege then null;end;
  begin perform public.staff_state(s||jsonb_build_object('deviceId','11000000-0000-4000-8000-000000000041'));raise exception 'Staff accepted';exception when insufficient_privilege then null;end;
  perform set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000013',true);
  begin perform public.staff_state(s||jsonb_build_object('deviceId','11000000-0000-4000-8000-000000000042'));raise exception 'Admin accepted';exception when insufficient_privilege then null;end;
  perform set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000014',true);
  begin perform public.staff_state(s);raise exception 'Foreign owner accepted';exception when insufficient_privilege then null;end;
  perform set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000011',true);
  begin perform public.staff_state(s||jsonb_build_object('targetMemberId','11000000-0000-4000-8000-000000000030'));raise exception 'Self owner target accepted';exception when insufficient_privilege then null;end;
  begin perform public.staff_state(s||jsonb_build_object('targetMemberId','11000000-0000-4000-8000-000000000033'));raise exception 'Foreign target accepted';exception when insufficient_privilege then null;end;
  begin perform public.staff_state(s||jsonb_build_object('targetDeviceId','11000000-0000-4000-8000-000000000042'));raise exception 'Wrong target device accepted';exception when insufficient_privilege then null;end;
  begin perform public.staff_control(q||jsonb_build_object('role','OWNER'));raise exception 'Role input accepted';exception when invalid_parameter_value then null;end;
  -- Account/member/store/device status revocation denies even an old durable receipt.
  update public.app_users set status='SUSPENDED' where id='11000000-0000-4000-8000-000000000001';
  begin perform public.staff_control(q);raise exception 'Suspended owner accepted';exception when insufficient_privilege then null;end;
  update public.app_users set status='ACTIVE' where id='11000000-0000-4000-8000-000000000001';
  update public.store_members set status='SUSPENDED' where id='11000000-0000-4000-8000-000000000030';
  begin perform public.staff_control(q);raise exception 'Suspended membership accepted';exception when insufficient_privilege then null;end;
  update public.store_members set status='ACTIVE' where id='11000000-0000-4000-8000-000000000030';
  update public.stores set status='SUSPENDED' where id=(s->>'storeId')::uuid;
  begin perform public.staff_control(q);raise exception 'Suspended store accepted';exception when insufficient_privilege then null;end;
  update public.stores set status='ACTIVE' where id=(s->>'storeId')::uuid;
  update public.devices set status='REVOKED' where id=(s->>'deviceId')::uuid;
  begin perform public.staff_control(q);raise exception 'Revoked owner device accepted';exception when insufficient_privilege then null;end;
  update public.devices set status='ACTIVE' where id=(s->>'deviceId')::uuid; -- Fixture reset only, never an enrollment path.
  s:=s||jsonb_build_object('targetDeviceId','11000000-0000-4000-8000-000000000041');
  v:=(public.staff_state(s)->'snapshot'->>'version')::bigint;
  q:=s||jsonb_build_object('operationId','11000000-0000-4000-8000-000000000053','expectedVersion',v,'action','DEVICE_REVOKE');
  r:=public.staff_control(q);assert r->>'status'='APPLIED';assert r->'snapshot'->>'deviceStatus'='REVOKED';
  assert public.staff_control(q)=r;
  begin perform public.staff_control(q||jsonb_build_object('action','DEVICE_REACTIVATE'));raise exception 'Device reactivation accepted';exception when invalid_parameter_value then null;end;
  assert (select status from public.store_members where id='11000000-0000-4000-8000-000000000030')='ACTIVE';
  assert (select role from public.store_members where id='11000000-0000-4000-8000-000000000031')='STAFF';
end; $$;
rollback;
-- True independent-session SQL contention, real Auth token lifecycle, RLS role execution,
-- staff-feed privacy and multiple devices remain separate unexecuted live gates.
