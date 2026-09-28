-- D-045: later devices need an authoritative reference graph before replaying
-- historical operation envelopes. The caller may read only a store where its
-- currently authenticated application user has active membership.

alter table public.stores
  add column country_code text null
  check (country_code is null or country_code ~ '^[A-Z]{2}$');

create or replace function public.sync_enroll_store(p_request jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_auth_subject uuid := auth.uid();
  v_store_id uuid := (p_request->>'storeId')::uuid;
  v_user_id uuid := (p_request->>'userId')::uuid;
  v_member_id uuid := (p_request->>'storeMemberId')::uuid;
  v_device_id uuid := (p_request->>'deviceId')::uuid;
  v_country_code text := p_request->>'countryCode';
  v_existing_auth uuid;
  v_existing_owner uuid;
  v_existing_member_id uuid;
  v_existing_member_role text;
  v_existing_member_status text;
  v_existing_device_store uuid;
  v_existing_device_user uuid;
  v_existing_currency text;
  v_existing_country_code text;
  v_existing_store_name text;
  v_was_enrolled boolean := false;
  v_revision bigint;
begin
  if v_auth_subject is null then
    raise exception using errcode = '28000', message = 'Authenticated user is required.';
  end if;
  if (p_request->>'protocolVersion')::integer <> 1 then
    raise exception using errcode = '22023', message = 'Unsupported sync protocol version.';
  end if;
  if v_country_code is not null and v_country_code !~ '^[A-Z]{2}$' then
    raise exception using errcode = '22023', message = 'Store country code is invalid.';
  end if;

  select au.auth_subject into v_existing_auth
  from public.app_users au
  where au.id = v_user_id
  for update;
  if v_existing_auth is not null and v_existing_auth <> v_auth_subject then
    raise exception using errcode = '42501', message = 'Local user is already bound to another auth subject.';
  end if;
  if exists (
    select 1 from public.app_users au
    where au.auth_subject = v_auth_subject and au.id <> v_user_id
  ) then
    raise exception using errcode = '42501', message = 'Auth subject is already bound to another local user.';
  end if;
  if v_existing_auth is null then
    insert into public.app_users (id, auth_subject, display_name)
    values (v_user_id, v_auth_subject, p_request->>'displayName')
    on conflict (id) do update set
      auth_subject = excluded.auth_subject,
      display_name = excluded.display_name,
      updated_at = timezone('utc', now());
  else
    update public.app_users
    set display_name = p_request->>'displayName', updated_at = timezone('utc', now())
    where id = v_user_id;
    v_was_enrolled := true;
  end if;

  select s.created_by_user_id, s.currency_code, s.country_code, s.name
    into v_existing_owner, v_existing_currency, v_existing_country_code, v_existing_store_name
  from public.stores s
  where s.id = v_store_id
  for update;
  if v_existing_owner is not null and v_existing_owner <> v_user_id then
    raise exception using errcode = '42501', message = 'Store is owned by another local user.';
  end if;
  if v_existing_currency is not null and v_existing_currency <> p_request->>'currencyCode' then
    raise exception using errcode = '22023', message = 'Store currency cannot change during enrolment.';
  end if;
  if v_existing_country_code is not null and v_country_code is not null
     and v_existing_country_code <> v_country_code then
    raise exception using errcode = '22023', message = 'Store country cannot change during enrolment.';
  end if;
  if v_existing_store_name is null then
    insert into public.stores (id, name, currency_code, country_code, timezone, created_by_user_id)
    values (
      v_store_id,
      p_request->>'storeName',
      p_request->>'currencyCode',
      v_country_code,
      p_request->>'timezone',
      v_user_id
    );
  elsif v_existing_country_code is null and v_country_code is not null then
    update public.stores set country_code = v_country_code where id = v_store_id;
  end if;

  select sm.id, sm.role, sm.status
    into v_existing_member_id, v_existing_member_role, v_existing_member_status
  from public.store_members sm
  where sm.store_id = v_store_id and sm.user_id = v_user_id
  for update;
  if v_existing_member_id is not null and v_existing_member_id <> v_member_id then
    raise exception using errcode = '42501', message = 'Store membership ID does not match the existing owner membership.';
  end if;
  if v_existing_member_id is null then
    insert into public.store_members (id, store_id, user_id, role, status)
    values (v_member_id, v_store_id, v_user_id, 'OWNER', 'ACTIVE');
  elsif v_existing_member_role <> 'OWNER' or v_existing_member_status <> 'ACTIVE' then
    raise exception using errcode = '42501', message = 'Existing member is not an active owner.';
  else
    v_was_enrolled := true;
  end if;

  select d.store_id, d.user_id into v_existing_device_store, v_existing_device_user
  from public.devices d
  where d.id = v_device_id
  for update;
  if v_existing_device_store is not null and
     (v_existing_device_store <> v_store_id or v_existing_device_user is distinct from v_user_id) then
    raise exception using errcode = '42501', message = 'Device is already bound to another store or user.';
  end if;
  if v_existing_device_store is null then
    insert into public.devices (id, store_id, user_id, platform, app_version, status, last_seen_at)
    values (v_device_id, v_store_id, v_user_id, 'ANDROID', 'unknown', 'ACTIVE', timezone('utc', now()));
  else
    update public.devices set status = 'ACTIVE', last_seen_at = timezone('utc', now()) where id = v_device_id;
  end if;

  insert into public.store_sync_state (store_id)
  values (v_store_id)
  on conflict (store_id) do nothing;
  select current_revision into v_revision from public.store_sync_state where store_id = v_store_id;

  return jsonb_build_object(
    'protocolVersion', 1,
    'storeId', v_store_id,
    'userId', v_user_id,
    'storeMemberId', v_member_id,
    'deviceId', v_device_id,
    'status', case when v_was_enrolled then 'ALREADY_ENROLLED' else 'ENROLLED' end,
    'serverRevision', v_revision
  );
end;
$$;

revoke all on function public.sync_enroll_store(jsonb) from public, anon, authenticated;
grant execute on function public.sync_enroll_store(jsonb) to authenticated;

create or replace function public.sync_reference_context(p_request jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_auth_subject uuid := auth.uid();
  v_store_id uuid := (p_request->>'storeId')::uuid;
  v_server_revision bigint;
  v_context jsonb;
begin
  if v_auth_subject is null then
    raise exception using errcode = '28000', message = 'Authenticated user is required.';
  end if;
  if jsonb_typeof(p_request) <> 'object'
     or coalesce((p_request->>'protocolVersion')::integer, 0) <> 1
     or v_store_id is null then
    raise exception using errcode = '22023', message = 'Invalid sync reference-context request.';
  end if;
  if not exists (
    select 1 from public.store_members sm
    join public.app_users au on au.id = sm.user_id
    where sm.store_id = v_store_id
      and sm.status = 'ACTIVE'
      and au.status = 'ACTIVE'
      and au.auth_subject = v_auth_subject
  ) then
    raise exception using errcode = '42501', message = 'Active store membership is required.';
  end if;

  -- Enrollment locks the store row before changing device membership. Holding
  -- the same row lock keeps the reference graph and revision read coherent.
  perform 1 from public.stores s where s.id = v_store_id for share;
  if not found then
    raise exception using errcode = '42501', message = 'Store membership or reference context was not found.';
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
