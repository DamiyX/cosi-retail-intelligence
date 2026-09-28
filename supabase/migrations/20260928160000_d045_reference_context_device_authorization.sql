begin;

create or replace function public.sync_reference_context(p_request jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_auth_subject uuid := auth.uid();
  v_store_id uuid := (p_request->>'storeId')::uuid;
  v_device_id uuid := (p_request->>'deviceId')::uuid;
  v_server_revision bigint;
  v_context jsonb;
begin
  if v_auth_subject is null then
    raise exception using errcode = '28000', message = 'Authenticated user is required.';
  end if;
  if jsonb_typeof(p_request) <> 'object'
     or coalesce((p_request->>'protocolVersion')::integer, 0) <> 1
     or v_store_id is null
     or v_device_id is null then
    raise exception using errcode = '22023', message = 'Invalid sync reference-context request.';
  end if;

  -- Enrollment and device authorization changes take this lock first, so the
  -- membership/device check and returned reference graph observe one state.
  perform 1 from public.stores s where s.id = v_store_id for share;
  if not found then
    raise exception using errcode = '42501', message = 'Store membership or device authorization failed.';
  end if;

  perform 1 from public.devices d
  where d.id = v_device_id and d.store_id = v_store_id
  for share;
  if not found or not exists (
    select 1 from public.store_members sm
    join public.app_users au on au.id = sm.user_id
    join public.devices d on d.store_id = sm.store_id and d.user_id = au.id
    where sm.store_id = v_store_id
      and sm.status = 'ACTIVE'
      and au.status = 'ACTIVE'
      and au.auth_subject = v_auth_subject
      and d.id = v_device_id
      and d.status = 'ACTIVE'
      and d.user_id = au.id
  ) then
    raise exception using errcode = '42501', message = 'Store membership or device authorization failed.';
  end if;

  select state.current_revision into v_server_revision
  from public.store_sync_state state
  where state.store_id = v_store_id
  for share;
  if v_server_revision is null then
    raise exception using errcode = '22023', message = 'Store is not enrolled for sync.';
  end if;

  select jsonb_build_object(
    'protocolVersion', 1,
    'payloadVersion', 1,
    'serverRevision', v_server_revision,
    'store', jsonb_build_object(
      'id', s.id,
      'name', s.name,
      'currencyCode', s.currency_code,
      'countryCode', s.country_code,
      'timezone', s.timezone,
      'status', s.status,
      'createdByUserId', s.created_by_user_id,
      'createdAt', s.created_at,
      'updatedAt', s.updated_at
    ),
    'users', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', au.id,
        'displayName', au.display_name,
        'status', au.status,
        'createdAt', au.created_at,
        'updatedAt', au.updated_at
      ) order by au.id), '[]'::jsonb)
      from public.app_users au
      where au.id = s.created_by_user_id
         or exists (select 1 from public.store_members sm where sm.store_id = s.id and sm.user_id = au.id)
         or exists (select 1 from public.devices d where d.store_id = s.id and d.user_id = au.id)
    ),
    'members', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', sm.id,
        'storeId', sm.store_id,
        'userId', sm.user_id,
        'role', sm.role,
        'status', sm.status,
        'joinedAt', sm.joined_at,
        'createdAt', sm.created_at,
        'updatedAt', sm.updated_at
      ) order by sm.id), '[]'::jsonb)
      from public.store_members sm where sm.store_id = s.id
    ),
    'devices', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', d.id,
        'storeId', d.store_id,
        'userId', d.user_id,
        'platform', d.platform,
        'deviceLabel', d.device_label,
        'appVersion', d.app_version,
        'status', d.status,
        'createdAt', d.created_at
      ) order by d.id), '[]'::jsonb)
      from public.devices d where d.store_id = s.id
    )
  ) into v_context
  from public.stores s where s.id = v_store_id;

  return v_context;
end;
$$;

revoke all on function public.sync_reference_context(jsonb) from public, anon, authenticated;
grant execute on function public.sync_reference_context(jsonb) to authenticated;

commit;
