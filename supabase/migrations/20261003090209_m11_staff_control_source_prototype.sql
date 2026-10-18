-- D-052 SOURCE ONLY. No deployment or activation is authorized by this file.
-- No business envelope, role, owner, account, invitation or reenrollment changes.
begin;
create schema staff_private;
revoke all on schema staff_private from public,anon,authenticated,service_role;
create table staff_private.configuration(singleton boolean primary key default true check(singleton),activated boolean not null default false);
insert into staff_private.configuration(singleton) values(true);
create table staff_private.target_versions(
  store_id uuid not null references public.stores(id) on delete restrict,
  kind text not null check(kind in ('MEMBER','DEVICE')),target_id uuid not null,
  version bigint not null default 0 check(version between 0 and 9007199254740991),
  primary key(store_id,kind,target_id)
);
create table staff_private.operations(
  store_id uuid not null references public.stores(id) on delete restrict,operation_id uuid not null,
  actor_user_id uuid not null references public.app_users(id) on delete restrict,
  device_id uuid not null references public.devices(id) on delete restrict,
  request jsonb not null,status text not null check(status in ('APPLIED','CONFLICT')),
  result jsonb not null,created_at timestamptz not null default now(),primary key(store_id,operation_id)
);
insert into staff_private.target_versions(store_id,kind,target_id)
  select store_id,'MEMBER',id from public.store_members union all select store_id,'DEVICE',id from public.devices;
alter table staff_private.configuration enable row level security;
alter table staff_private.target_versions enable row level security;
alter table staff_private.operations enable row level security;
revoke all on all tables in schema staff_private from public,anon,authenticated,service_role;

-- Observe security-reference transitions, including other approved writers. Versions are not authority.
create function staff_private.bump(p_store uuid,p_kind text,p_id uuid) returns void
language sql set search_path='' as $$
  insert into staff_private.target_versions(store_id,kind,target_id,version) values(p_store,p_kind,p_id,1)
    on conflict(store_id,kind,target_id) do update set version=staff_private.target_versions.version+1;
$$;
create function staff_private.reference_changed() returns trigger
language plpgsql security definer set search_path='' as $$
declare d record;
begin
  if tg_table_name='store_members' then
    if tg_op='UPDATE' and (new.store_id,new.user_id,new.role,new.status) is not distinct from (old.store_id,old.user_id,old.role,old.status) then return new; end if;
    perform staff_private.bump(new.store_id,'MEMBER',new.id);
    for d in select id,store_id from public.devices where store_id=new.store_id and user_id=new.user_id order by id loop
      perform staff_private.bump(d.store_id,'DEVICE',d.id);
    end loop;
  elsif tg_table_name='devices' then
    if tg_op='UPDATE' and (new.store_id,new.user_id,new.status) is not distinct from (old.store_id,old.user_id,old.status) then return new; end if;
    perform staff_private.bump(new.store_id,'DEVICE',new.id);
  else
    if new.status is not distinct from old.status then return new; end if;
    for d in select id,store_id from public.store_members where user_id=new.id order by store_id,id loop perform staff_private.bump(d.store_id,'MEMBER',d.id); end loop;
    for d in select id,store_id from public.devices where user_id=new.id order by store_id,id loop perform staff_private.bump(d.store_id,'DEVICE',d.id); end loop;
  end if;
  return new;
end; $$;
create trigger m11_member_version after insert or update of store_id,user_id,role,status on public.store_members for each row execute function staff_private.reference_changed();
create trigger m11_device_version after insert or update of store_id,user_id,status on public.devices for each row execute function staff_private.reference_changed();
create trigger m11_account_version after update of status on public.app_users for each row execute function staff_private.reference_changed();

create function staff_private.require_owner(p_store uuid,p_device uuid) returns uuid
language plpgsql set search_path='' as $$
declare v_user uuid;
begin
  if auth.uid() is null then raise exception using errcode='28000',message='Authentication required'; end if;
  -- Same store then sync-state lock order as existing enrollment/reference boundary.
  perform 1 from public.stores where id=p_store for update;
  perform 1 from public.store_sync_state where store_id=p_store for update;
  if not found then raise exception using errcode='42501',message='Enrolled owner store required'; end if;
  select u.id into v_user from public.stores s join public.store_members m on m.store_id=s.id
    join public.app_users u on u.id=m.user_id join public.devices d on d.store_id=s.id and d.user_id=u.id
    where s.id=p_store and s.status='ACTIVE' and m.status='ACTIVE' and m.role='OWNER'
      and u.status='ACTIVE' and u.auth_subject=auth.uid() and d.id=p_device and d.status='ACTIVE'
    for share of s,m,u,d;
  if v_user is null then raise exception using errcode='42501',message='Active owner/store/bound device required'; end if;
  return v_user;
end; $$;
create function staff_private.snapshot(p_store uuid,p_member uuid,p_device uuid) returns jsonb
language plpgsql set search_path='' as $$
declare m public.store_members;u public.app_users;d public.devices;v_version bigint;v_kind text;v_id uuid;
begin
  select * into m from public.store_members where id=p_member and store_id=p_store for update;
  if m.id is null or m.role='OWNER' then raise exception using errcode='42501',message='Existing same-store non-owner target required'; end if;
  select * into u from public.app_users where id=m.user_id for share;
  if u.id is null then raise exception using errcode='42501',message='Target account missing'; end if;
  if p_device is not null then
    select * into d from public.devices where id=p_device and store_id=p_store and user_id=m.user_id for update;
    if d.id is null then raise exception using errcode='42501',message='Same-store member bound device required'; end if;
  end if;
  v_kind:=case when p_device is null then 'MEMBER' else 'DEVICE' end;v_id:=coalesce(p_device,p_member);
  insert into staff_private.target_versions(store_id,kind,target_id) values(p_store,v_kind,v_id) on conflict do nothing;
  select version into v_version from staff_private.target_versions where store_id=p_store and kind=v_kind and target_id=v_id for update;
  return jsonb_build_object('targetMemberId',m.id,'targetDeviceId',p_device,'userId',m.user_id,'role',m.role,
    'memberStatus',m.status,'accountStatus',u.status,'deviceStatus',case when p_device is null then null else d.status end,'version',v_version);
end; $$;
create function staff_private.validate_target_request(q jsonb,p_control boolean) returns void
language plpgsql set search_path='' as $$
begin
  if jsonb_typeof(q) is distinct from 'object' or q->'protocolVersion' is distinct from '1'::jsonb
    or jsonb_typeof(q->'storeId') is distinct from 'string' or jsonb_typeof(q->'deviceId') is distinct from 'string'
    or jsonb_typeof(q->'targetMemberId') is distinct from 'string'
    or jsonb_typeof(q->'targetDeviceId') not in ('string','null') or not(q?'targetDeviceId') then
    raise exception using errcode='22023',message='Invalid target request';
  end if;
  if p_control then
    if (q-array['protocolVersion','storeId','deviceId','targetMemberId','targetDeviceId','operationId','expectedVersion','action'])<>'{}'::jsonb
      or jsonb_typeof(q->'operationId') is distinct from 'string' or jsonb_typeof(q->'expectedVersion') is distinct from 'number'
      or coalesce(q->>'expectedVersion','')!~'^(0|[1-9][0-9]*)$' or (q->>'expectedVersion')::numeric>9007199254740991
      or coalesce(q->>'action','') not in ('MEMBER_SUSPEND','MEMBER_REACTIVATE','DEVICE_REVOKE')
      or ((q->>'action'='DEVICE_REVOKE') is distinct from (q->>'targetDeviceId' is not null)) then
      raise exception using errcode='22023',message='Invalid control request';
    end if;
  elsif (q-array['protocolVersion','storeId','deviceId','targetMemberId','targetDeviceId'])<>'{}'::jsonb then
    raise exception using errcode='22023',message='Invalid state request';
  end if;
end; $$;
create function public.staff_state(p_request jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_user uuid;v_snapshot jsonb;
begin
  perform staff_private.validate_target_request(p_request,false);
  v_user:=staff_private.require_owner((p_request->>'storeId')::uuid,(p_request->>'deviceId')::uuid);
  v_snapshot:=staff_private.snapshot((p_request->>'storeId')::uuid,(p_request->>'targetMemberId')::uuid,(p_request->>'targetDeviceId')::uuid);
  return jsonb_build_object('protocolVersion',1,'storeId',p_request->>'storeId','deviceId',p_request->>'deviceId',
    'actorUserId',v_user,'available',(select activated from staff_private.configuration where singleton),'snapshot',v_snapshot);
end; $$;
create function public.staff_control(p_request jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_user uuid;v_store uuid;v_device uuid;v_member uuid;v_target_device uuid;v_operation uuid;
  v_snapshot jsonb;v_result jsonb;v_old staff_private.operations;v_expected bigint;v_status text;v_action text;
begin
  perform staff_private.validate_target_request(p_request,true);
  v_store:=(p_request->>'storeId')::uuid;v_device:=(p_request->>'deviceId')::uuid;
  v_member:=(p_request->>'targetMemberId')::uuid;v_target_device:=(p_request->>'targetDeviceId')::uuid;
  v_operation:=(p_request->>'operationId')::uuid;v_expected:=(p_request->>'expectedVersion')::bigint;v_action:=p_request->>'action';
  v_user:=staff_private.require_owner(v_store,v_device);
  v_snapshot:=staff_private.snapshot(v_store,v_member,v_target_device);
  select * into v_old from staff_private.operations where store_id=v_store and operation_id=v_operation;
  if v_old.operation_id is not null then
    if v_old.request<>p_request or v_old.actor_user_id<>v_user or v_old.device_id<>v_device then
      raise exception using errcode='22023',message='Operation identity/body reused';
    end if;
    return v_old.result;
  end if;
  if not(select activated from staff_private.configuration where singleton) then
    return jsonb_build_object('protocolVersion',1,'actorUserId',v_user,'request',p_request,'status','DISABLED','snapshot',v_snapshot);
  end if;
  v_status:='CONFLICT';
  if (v_snapshot->>'version')::bigint=v_expected and v_expected<9007199254740991 then
    if v_action='MEMBER_REACTIVATE' and v_snapshot->>'accountStatus'<>'ACTIVE' then
      raise exception using errcode='42501',message='Suspended account cannot be reactivated by membership control';
    end if;
    if v_action in ('MEMBER_SUSPEND','MEMBER_REACTIVATE') then
      update public.store_members set status=case when v_action='MEMBER_SUSPEND' then 'SUSPENDED' else 'ACTIVE' end,updated_at=now()
        where id=v_member and store_id=v_store and role in ('ADMIN','STAFF');
    else
      update public.devices set status='REVOKED' where id=v_target_device and store_id=v_store and user_id=(v_snapshot->>'userId')::uuid;
    end if;
    -- The reference trigger advances actual transitions; a no-op request still binds its own version.
    update staff_private.target_versions set version=v_expected+1 where store_id=v_store
      and kind=case when v_target_device is null then 'MEMBER' else 'DEVICE' end
      and target_id=coalesce(v_target_device,v_member) and version=v_expected;
    v_snapshot:=staff_private.snapshot(v_store,v_member,v_target_device);v_status:='APPLIED';
  end if;
  v_result:=jsonb_build_object('protocolVersion',1,'actorUserId',v_user,'request',p_request,'status',v_status,'snapshot',v_snapshot);
  insert into staff_private.operations(store_id,operation_id,actor_user_id,device_id,request,status,result)
    values(v_store,v_operation,v_user,v_device,p_request,v_status,v_result);
  return v_result;
end; $$;
revoke all on all functions in schema staff_private from public,anon,authenticated,service_role;
revoke all on function public.staff_state(jsonb),public.staff_control(jsonb) from public,anon,authenticated,service_role;
grant execute on function public.staff_state(jsonb),public.staff_control(jsonb) to authenticated;
commit;
