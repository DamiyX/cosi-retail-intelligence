-- M7-01: provider-independent sync foundation.
--
-- The mobile app never receives a service-role credential.  The public RPCs
-- below are narrow authenticated transport boundaries; the sync_private
-- implementation schema is not exposed through the Data API.

create extension if not exists pgcrypto;

create schema if not exists sync_private;

create table public.app_users (
  id uuid primary key,
  auth_subject uuid unique,
  display_name text not null check (length(btrim(display_name)) between 1 and 200),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'SUSPENDED')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.stores (
  id uuid primary key,
  name text not null check (length(btrim(name)) between 1 and 200),
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  timezone text not null check (length(btrim(timezone)) between 1 and 100),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'SUSPENDED')),
  created_by_user_id uuid not null references public.app_users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.store_members (
  id uuid primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete restrict,
  role text not null check (role in ('OWNER', 'ADMIN', 'STAFF')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'SUSPENDED')),
  joined_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (store_id, user_id)
);

create index idx_store_members_user on public.store_members(user_id, status);

create table public.devices (
  id uuid primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid references public.app_users(id) on delete set null,
  platform text not null check (platform in ('ANDROID', 'IOS', 'OTHER')),
  device_label text check (device_label is null or length(device_label) <= 200),
  app_version text not null check (length(app_version) <= 64),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'REVOKED')),
  last_seen_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique (id, store_id)
);

create index idx_devices_store_status on public.devices(store_id, status);

create table public.store_sync_state (
  store_id uuid primary key references public.stores(id) on delete cascade,
  current_revision bigint not null default 0 check (current_revision >= 0),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.applied_sync_operations (
  store_id uuid not null references public.stores(id) on delete cascade,
  operation_id uuid not null,
  entity_type text not null,
  entity_id uuid not null,
  operation_type text not null,
  payload jsonb not null,
  payload_hash text not null,
  result jsonb not null,
  server_revision bigint not null check (server_revision >= 0),
  applied_at timestamptz not null default timezone('utc', now()),
  primary key (store_id, operation_id)
);

create index idx_applied_sync_operations_entity
  on public.applied_sync_operations(store_id, entity_type, entity_id);

create table public.sync_entity_documents (
  store_id uuid not null references public.stores(id) on delete cascade,
  entity_type text not null check (entity_type in (
    'STORE_PRODUCT', 'PRODUCT_VARIANT', 'PACKAGE_UNIT', 'STORE_PACKAGE_SETTING',
    'PRODUCT_IDENTIFIER', 'SALE', 'CUSTOMER_ACCOUNT', 'RECEIVABLE', 'PURCHASE',
    'BATCH_OPERATION', 'INVENTORY_ADJUSTMENT', 'RECONCILIATION',
    'INVENTORY_CHECK_SETTINGS', 'CHECK_ASSIGNMENT',
    'INVENTORY_ATTENTION_SETTINGS', 'ATTENTION_SNOOZE', 'EXPENSE', 'OWNER_WITHDRAWAL'
  )),
  entity_id uuid not null,
  server_version bigint not null check (server_version >= 1),
  last_operation_id uuid not null,
  payload jsonb not null,
  is_immutable boolean not null,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (store_id, entity_type, entity_id)
);

create index idx_sync_entity_documents_store on public.sync_entity_documents(store_id, entity_type);

-- History makes bootstrap a real snapshot at a server revision even when a
-- mutable entity changed after the snapshot began.
create table public.sync_entity_document_history (
  store_id uuid not null references public.stores(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  server_version bigint not null check (server_version >= 1),
  server_revision bigint not null check (server_revision >= 1),
  operation_id uuid not null,
  payload jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (store_id, entity_type, entity_id, server_version),
  unique (store_id, operation_id)
);

create index idx_sync_entity_history_revision
  on public.sync_entity_document_history(store_id, server_revision, entity_type, entity_id);

-- Nested graph rows remain individually addressable for later normalized
-- projections, while the aggregate envelope remains the authoritative write.
create table public.sync_normalized_facts (
  store_id uuid not null references public.stores(id) on delete cascade,
  operation_id uuid not null,
  fact_type text not null,
  fact_id uuid not null,
  payload jsonb not null,
  server_revision bigint not null check (server_revision >= 1),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (store_id, operation_id, fact_type, fact_id)
);

create index idx_sync_normalized_facts_entity
  on public.sync_normalized_facts(store_id, fact_type, fact_id);

create table public.sync_change_log (
  store_id uuid not null references public.stores(id) on delete cascade,
  revision bigint not null check (revision >= 1),
  change_index integer not null check (change_index >= 0),
  operation_id uuid not null,
  entity_type text not null,
  entity_id uuid not null,
  operation_type text not null,
  change_type text not null check (change_type in ('UPSERT', 'DELETE')),
  payload_version integer not null check (payload_version = 1),
  payload jsonb not null,
  entity_version bigint not null check (entity_version >= 1),
  occurred_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (store_id, revision, change_index),
  unique (store_id, operation_id)
);

create index idx_sync_change_log_pull
  on public.sync_change_log(store_id, revision, change_index);

create or replace function public.sync_is_active_member(p_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.store_members sm
    join public.app_users au on au.id = sm.user_id
    where sm.store_id = p_store_id
      and sm.status = 'ACTIVE'
      and au.status = 'ACTIVE'
      and au.auth_subject = auth.uid()
  );
$$;

alter table public.app_users enable row level security;
alter table public.stores enable row level security;
alter table public.store_members enable row level security;
alter table public.devices enable row level security;
alter table public.store_sync_state enable row level security;
alter table public.applied_sync_operations enable row level security;
alter table public.sync_entity_documents enable row level security;
alter table public.sync_entity_document_history enable row level security;
alter table public.sync_normalized_facts enable row level security;
alter table public.sync_change_log enable row level security;

create policy app_users_self_read on public.app_users
  for select to authenticated
  using (auth_subject = auth.uid());

create policy stores_member_read on public.stores
  for select to authenticated
  using (public.sync_is_active_member(id));

create policy store_members_member_read on public.store_members
  for select to authenticated
  using (public.sync_is_active_member(store_id));

create policy devices_member_read on public.devices
  for select to authenticated
  using (public.sync_is_active_member(store_id));

create policy sync_state_member_read on public.store_sync_state
  for select to authenticated
  using (public.sync_is_active_member(store_id));

create policy applied_operations_member_read on public.applied_sync_operations
  for select to authenticated
  using (public.sync_is_active_member(store_id));

create policy sync_documents_member_read on public.sync_entity_documents
  for select to authenticated
  using (public.sync_is_active_member(store_id));

create policy sync_history_member_read on public.sync_entity_document_history
  for select to authenticated
  using (public.sync_is_active_member(store_id));

create policy sync_facts_member_read on public.sync_normalized_facts
  for select to authenticated
  using (public.sync_is_active_member(store_id));

create policy sync_changes_member_read on public.sync_change_log
  for select to authenticated
  using (public.sync_is_active_member(store_id));

revoke all on all tables in schema public from anon, authenticated;
grant select on public.stores, public.store_members, public.devices to authenticated;
revoke all on function public.sync_is_active_member(uuid) from public, anon, authenticated;
grant execute on function public.sync_is_active_member(uuid) to authenticated;

create or replace function sync_private.is_mutable_operation(p_operation_type text)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select p_operation_type in (
    'PRODUCT_IDENTITY_UPDATED',
    'PRODUCT_LIFECYCLE_CHANGED',
    'PRODUCT_REORDER_LEVEL_UPDATED',
    'PACKAGE_UPDATED',
    'PACKAGE_DEACTIVATED',
    'STORE_PACKAGE_SETTING_SAVED',
    'CHECK_SETTINGS_SAVED',
    'ATTENTION_SETTINGS_SAVED'
  );
$$;

create or replace function public.sync_enroll_store(p_request jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_auth_subject uuid := auth.uid();
  v_store_id uuid := (p_request->>'storeId')::uuid;
  v_user_id uuid := (p_request->>'userId')::uuid;
  v_member_id uuid := (p_request->>'storeMemberId')::uuid;
  v_device_id uuid := (p_request->>'deviceId')::uuid;
  v_existing_auth uuid;
  v_existing_owner uuid;
  v_existing_member_id uuid;
  v_existing_member_role text;
  v_existing_member_status text;
  v_existing_device_store uuid;
  v_existing_device_user uuid;
  v_existing_currency text;
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

  select s.created_by_user_id, s.currency_code, s.name
    into v_existing_owner, v_existing_currency, v_existing_store_name
  from public.stores s
  where s.id = v_store_id
  for update;
  if v_existing_owner is not null and v_existing_owner <> v_user_id then
    raise exception using errcode = '42501', message = 'Store is owned by another local user.';
  end if;
  if v_existing_currency is not null and v_existing_currency <> p_request->>'currencyCode' then
    raise exception using errcode = '22023', message = 'Store currency cannot change during enrolment.';
  end if;
  if v_existing_store_name is null then
    insert into public.stores (id, name, currency_code, timezone, created_by_user_id)
    values (
      v_store_id,
      p_request->>'storeName',
      p_request->>'currencyCode',
      p_request->>'timezone',
      v_user_id
    );
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

create or replace function sync_private.apply_one(p_operation jsonb, p_auth_subject uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_store_id uuid := (p_operation->>'storeId')::uuid;
  v_device_id uuid := (p_operation->>'deviceId')::uuid;
  v_operation_id uuid := (p_operation->>'operationId')::uuid;
  v_entity_id uuid := (p_operation->>'entityId')::uuid;
  v_entity_type text := p_operation->>'entityType';
  v_operation_type text := p_operation->>'operationType';
  v_base_version bigint;
  v_current_version bigint;
  v_current_revision bigint;
  v_new_revision bigint;
  v_new_version bigint;
  v_current_payload jsonb;
  v_existing_payload jsonb;
  v_existing_result jsonb;
  v_is_mutable boolean;
  v_fact_key text;
  v_fact_values jsonb;
  v_fact jsonb;
  v_ack jsonb;
begin
  if p_auth_subject is null then
    return jsonb_build_object(
      'operationId', coalesce(p_operation->>'operationId', 'invalid-operation'),
      'status', 'REJECTED_PERMANENT', 'entityType', 'STORE_PRODUCT', 'entityId', 'invalid-entity',
      'serverVersion', null, 'serverRevision', null,
      'error', jsonb_build_object('code', 'UNAUTHENTICATED', 'message', 'Authentication is required.', 'retryable', false)
    );
  end if;
  if (p_operation->>'payloadVersion')::integer <> 1 then
    return jsonb_build_object(
      'operationId', coalesce(p_operation->>'operationId', 'invalid-operation'),
      'status', 'REJECTED_PERMANENT', 'entityType', 'STORE_PRODUCT', 'entityId', 'invalid-entity',
      'serverVersion', null, 'serverRevision', null,
      'error', jsonb_build_object('code', 'INVALID_PAYLOAD', 'message', 'Unsupported payload version.', 'retryable', false)
    );
  end if;
  if not exists (
    select 1
    from public.store_members sm
    join public.app_users au on au.id = sm.user_id
    join public.stores s on s.id = sm.store_id
    where sm.store_id = v_store_id
      and sm.status = 'ACTIVE' and au.status = 'ACTIVE'
      and au.auth_subject = p_auth_subject and s.status = 'ACTIVE'
  ) then
    return jsonb_build_object(
      'operationId', v_operation_id, 'status', 'REJECTED_PERMANENT',
      'entityType', v_entity_type, 'entityId', v_entity_id,
      'serverVersion', null, 'serverRevision', null,
      'error', jsonb_build_object('code', 'FORBIDDEN', 'message', 'Active store membership is required.', 'retryable', false)
    );
  end if;
  if not exists (
    select 1 from public.devices d
    left join public.app_users au on au.id = d.user_id
    where d.id = v_device_id and d.store_id = v_store_id and d.status = 'ACTIVE'
      and (d.user_id is null or au.auth_subject = p_auth_subject)
  ) then
    return jsonb_build_object(
      'operationId', v_operation_id, 'status', 'REJECTED_PERMANENT',
      'entityType', v_entity_type, 'entityId', v_entity_id,
      'serverVersion', null, 'serverRevision', null,
      'error', jsonb_build_object('code', 'UNKNOWN_DEVICE', 'message', 'Device is not active for this store and user.', 'retryable', false)
    );
  end if;

  select s.current_revision into v_current_revision
  from public.store_sync_state s
  where s.store_id = v_store_id
  for update;
  if v_current_revision is null then
    return jsonb_build_object(
      'operationId', v_operation_id, 'status', 'REJECTED_PERMANENT',
      'entityType', v_entity_type, 'entityId', v_entity_id,
      'serverVersion', null, 'serverRevision', null,
      'error', jsonb_build_object('code', 'UNKNOWN_STORE', 'message', 'Store sync state is not enrolled.', 'retryable', false)
    );
  end if;
  if v_operation_type not in (
    'PRODUCT_CREATED', 'PRODUCT_IDENTITY_UPDATED', 'PRODUCT_IDENTIFIER_ADDED',
    'PACKAGE_CREATED', 'PACKAGE_UPDATED', 'PACKAGE_DEACTIVATED',
    'STORE_PACKAGE_SETTING_SAVED', 'PRODUCT_LIFECYCLE_CHANGED',
    'PRODUCT_REORDER_LEVEL_UPDATED', 'COMPLETED_SALE_CREATED',
    'COMPLETED_PURCHASE_CREATED', 'BATCH_CLASSIFICATION_CREATED',
    'INVENTORY_ADJUSTMENT_CREATED', 'RECONCILIATION_FINALIZED',
    'CHECK_SETTINGS_SAVED', 'CHECK_ASSIGNMENT_CREATED',
    'ATTENTION_SETTINGS_SAVED', 'ATTENTION_SNOOZE_CREATED',
    'EXPENSE_CREATED', 'OWNER_WITHDRAWAL_CREATED'
  ) then
    return jsonb_build_object(
      'operationId', v_operation_id, 'status', 'REJECTED_PERMANENT',
      'entityType', v_entity_type, 'entityId', v_entity_id,
      'serverVersion', null, 'serverRevision', null,
      'error', jsonb_build_object('code', 'OPERATION_NOT_ALLOWED', 'message', 'Operation type is not registered.', 'retryable', false)
    );
  end if;

  select a.payload, a.result into v_existing_payload, v_existing_result
  from public.applied_sync_operations a
  where a.store_id = v_store_id and a.operation_id = v_operation_id;
  if v_existing_payload is not null then
    if v_existing_payload = p_operation then
      return jsonb_build_object(
        'operationId', v_operation_id, 'status', 'ALREADY_APPLIED',
        'entityType', v_entity_type, 'entityId', v_entity_id,
        'serverVersion', v_existing_result->'serverVersion',
        'serverRevision', v_existing_result->'serverRevision', 'error', null
      );
    end if;
    return jsonb_build_object(
      'operationId', v_operation_id, 'status', 'REJECTED_PERMANENT',
      'entityType', v_entity_type, 'entityId', v_entity_id,
      'serverVersion', null, 'serverRevision', null,
      'error', jsonb_build_object('code', 'DUPLICATE_OPERATION_ID', 'message', 'Operation ID was reused with different content.', 'retryable', false)
    );
  end if;

  select d.server_version, d.payload into v_current_version, v_current_payload
  from public.sync_entity_documents d
  where d.store_id = v_store_id and d.entity_type = v_entity_type and d.entity_id = v_entity_id
  for update;
  v_is_mutable := sync_private.is_mutable_operation(v_operation_type);
  v_base_version := nullif(p_operation->>'baseServerVersion', '')::bigint;
  if v_is_mutable then
    if (v_current_version is null and v_base_version is not null and v_base_version <> 0)
       or (v_current_version is not null and (v_base_version is null or v_base_version <> v_current_version)) then
      return jsonb_build_object(
        'operationId', v_operation_id, 'status', 'CONFLICT',
        'entityType', v_entity_type, 'entityId', v_entity_id,
        'serverVersion', v_current_version, 'serverRevision', v_current_revision,
        'error', jsonb_build_object(
          'code', 'CONFLICT', 'message', 'The local base version is stale.', 'retryable', false,
          'details', jsonb_build_object('serverPayload', coalesce(v_current_payload, '{}'::jsonb))
        )
      );
    end if;
  elsif v_current_version is not null then
    return jsonb_build_object(
      'operationId', v_operation_id, 'status', 'REJECTED_PERMANENT',
      'entityType', v_entity_type, 'entityId', v_entity_id,
      'serverVersion', v_current_version, 'serverRevision', v_current_revision,
      'error', jsonb_build_object('code', 'PERMANENT', 'message', 'Immutable entity ID is already used.', 'retryable', false,
        'details', jsonb_build_object('reason', 'IMMUTABLE_ID_REUSE'))
    );
  end if;

  v_new_version := coalesce(v_current_version, 0) + 1;
  update public.store_sync_state
  set current_revision = current_revision + 1, updated_at = timezone('utc', now())
  where store_id = v_store_id
  returning current_revision into v_new_revision;

  insert into public.sync_entity_documents
    (store_id, entity_type, entity_id, server_version, last_operation_id, payload, is_immutable)
  values (v_store_id, v_entity_type, v_entity_id, v_new_version, v_operation_id, p_operation, not v_is_mutable)
  on conflict (store_id, entity_type, entity_id) do update set
    server_version = excluded.server_version,
    last_operation_id = excluded.last_operation_id,
    payload = excluded.payload,
    is_immutable = excluded.is_immutable,
    updated_at = timezone('utc', now());

  insert into public.sync_entity_document_history
    (store_id, entity_type, entity_id, server_version, server_revision, operation_id, payload)
  values (v_store_id, v_entity_type, v_entity_id, v_new_version, v_new_revision, v_operation_id, p_operation);

  for v_fact_key, v_fact_values in
    select e.key, e.value from jsonb_each(coalesce(p_operation->'entities', '{}'::jsonb)) e
  loop
    if jsonb_typeof(v_fact_values) = 'array' then
      for v_fact in select value from jsonb_array_elements(v_fact_values) loop
        if jsonb_typeof(v_fact) = 'object' and (v_fact->>'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
          insert into public.sync_normalized_facts
            (store_id, operation_id, fact_type, fact_id, payload, server_revision)
          values (v_store_id, v_operation_id, v_fact_key, (v_fact->>'id')::uuid, v_fact, v_new_revision)
          on conflict do nothing;
        end if;
      end loop;
    elsif jsonb_typeof(v_fact_values) = 'object'
      and (v_fact_values->>'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      insert into public.sync_normalized_facts
        (store_id, operation_id, fact_type, fact_id, payload, server_revision)
      values (v_store_id, v_operation_id, v_fact_key, (v_fact_values->>'id')::uuid, v_fact_values, v_new_revision)
      on conflict do nothing;
    end if;
  end loop;

  insert into public.sync_change_log
    (store_id, revision, change_index, operation_id, entity_type, entity_id,
     operation_type, change_type, payload_version, payload, entity_version, occurred_at)
  values (
    v_store_id, v_new_revision, 0, v_operation_id, v_entity_type, v_entity_id,
    v_operation_type, 'UPSERT', 1, p_operation, v_new_version,
    (p_operation->>'occurredAt')::timestamptz
  );

  v_ack := jsonb_build_object(
    'operationId', v_operation_id, 'status', 'APPLIED',
    'entityType', v_entity_type, 'entityId', v_entity_id,
    'serverVersion', v_new_version, 'serverRevision', v_new_revision, 'error', null
  );
  insert into public.applied_sync_operations
    (store_id, operation_id, entity_type, entity_id, operation_type, payload, payload_hash, result, server_revision)
  values (
    v_store_id, v_operation_id, v_entity_type, v_entity_id, v_operation_type, p_operation,
    encode(digest(p_operation::text, 'sha256'), 'hex'), v_ack, v_new_revision
  );
  update public.devices set last_seen_at = timezone('utc', now()) where id = v_device_id;
  return v_ack;
end;
$$;

create or replace function public.sync_push(p_request jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, sync_private, pg_temp
as $$
declare
  v_operation jsonb;
  v_acks jsonb := '[]'::jsonb;
  v_ack jsonb;
  v_auth_subject uuid := auth.uid();
  v_sqlstate text;
begin
  if v_auth_subject is null then
    raise exception using errcode = '28000', message = 'Authenticated user is required.';
  end if;
  if coalesce((p_request->>'protocolVersion')::integer, 0) <> 1
     or coalesce((p_request->>'payloadVersion')::integer, 0) <> 1 then
    raise exception using errcode = '22023', message = 'Unsupported sync protocol or payload version.';
  end if;
  if jsonb_typeof(p_request->'operations') <> 'array'
     or jsonb_array_length(p_request->'operations') < 1
     or jsonb_array_length(p_request->'operations') > 50 then
    raise exception using errcode = '22023', message = 'Push batch is outside the supported bounds.';
  end if;
  for v_operation in select value from jsonb_array_elements(p_request->'operations') loop
    begin
      if v_operation->>'storeId' <> p_request->>'storeId'
         or v_operation->>'deviceId' <> p_request->>'deviceId' then
        v_ack := jsonb_build_object(
          'operationId', coalesce(v_operation->>'operationId', 'invalid-operation'),
          'status', 'REJECTED_PERMANENT',
          'entityType', coalesce(v_operation->>'entityType', 'STORE_PRODUCT'),
          'entityId', coalesce(v_operation->>'entityId', 'invalid-entity'),
          'serverVersion', null, 'serverRevision', null,
          'error', jsonb_build_object('code', 'FORBIDDEN', 'message', 'Operation store or device does not match the request.', 'retryable', false)
        );
      else
        v_ack := sync_private.apply_one(v_operation, v_auth_subject);
      end if;
    exception when others then
      get stacked diagnostics v_sqlstate = returned_sqlstate;
      v_ack := jsonb_build_object(
        'operationId', coalesce(v_operation->>'operationId', 'invalid-operation'),
        'status', case when v_sqlstate = '40001' then 'REJECTED_RETRYABLE' else 'REJECTED_PERMANENT' end,
        'entityType', coalesce(v_operation->>'entityType', 'STORE_PRODUCT'),
        'entityId', coalesce(v_operation->>'entityId', 'invalid-entity'),
        'serverVersion', null, 'serverRevision', null,
        'error', jsonb_build_object(
          'code', case when v_sqlstate = '40001' then 'RETRYABLE' else 'INVALID_PAYLOAD' end,
          'message', 'The server rejected the operation envelope.',
          'retryable', v_sqlstate = '40001'
        )
      );
    end;
    v_acks := v_acks || jsonb_build_array(v_ack);
  end loop;
  return jsonb_build_object('protocolVersion', 1, 'payloadVersion', 1, 'acks', v_acks);
end;
$$;

create or replace function public.sync_pull(p_request jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_auth_subject uuid := auth.uid();
  v_store_id uuid := (p_request->>'storeId')::uuid;
  v_device_id uuid := (p_request->>'deviceId')::uuid;
  v_cursor_revision bigint := coalesce((p_request->'cursor'->>'revision')::bigint, 0);
  v_cursor_index integer := coalesce((p_request->'cursor'->>'changeIndex')::integer, 0);
  v_page_size integer := least(greatest(coalesce((p_request->>'pageSize')::integer, 1), 1), 100);
  v_server_revision bigint;
  v_next_revision bigint;
  v_next_index integer;
  v_change_count integer;
  v_has_more boolean;
  v_changes jsonb;
begin
  if v_auth_subject is null then
    raise exception using errcode = '28000', message = 'Authenticated user is required.';
  end if;
  if not exists (
    select 1 from public.store_members sm
    join public.app_users au on au.id = sm.user_id
    join public.devices d on d.store_id = sm.store_id
    where sm.store_id = v_store_id and sm.status = 'ACTIVE' and au.status = 'ACTIVE'
      and au.auth_subject = v_auth_subject and d.id = v_device_id and d.status = 'ACTIVE'
  ) then
    raise exception using errcode = '42501', message = 'Store membership or device authorization failed.';
  end if;
  select current_revision into v_server_revision
  from public.store_sync_state where store_id = v_store_id for share;
  if v_server_revision is null then
    raise exception using errcode = '22023', message = 'Store is not enrolled for sync.';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
      'operationId', c.operation_id,
      'storeId', c.store_id,
      'entityType', c.entity_type,
      'entityId', c.entity_id,
      'operationType', c.operation_type,
      'changeType', c.change_type,
      'payloadVersion', c.payload_version,
      'payload', c.payload,
      'entityVersion', c.entity_version,
      'serverRevision', c.revision,
      'occurredAt', c.occurred_at
    ) order by c.revision, c.change_index), '[]'::jsonb), count(*)::integer
    into v_changes, v_change_count
  from (
    select c.* from public.sync_change_log c
    where c.store_id = v_store_id
      and (c.revision > v_cursor_revision or (c.revision = v_cursor_revision and c.change_index > v_cursor_index))
    order by c.revision, c.change_index
    limit v_page_size
  ) c;

  select c.revision, c.change_index into v_next_revision, v_next_index
  from public.sync_change_log c
  where c.store_id = v_store_id
    and (c.revision > v_cursor_revision or (c.revision = v_cursor_revision and c.change_index > v_cursor_index))
  order by c.revision desc, c.change_index desc
  limit 1;
  if v_next_revision is null then
    v_next_revision := v_cursor_revision;
    v_next_index := v_cursor_index;
  end if;
  select exists (
    select 1 from public.sync_change_log c
    where c.store_id = v_store_id
      and (c.revision > v_next_revision or (c.revision = v_next_revision and c.change_index > v_next_index))
  ) into v_has_more;

  return jsonb_build_object(
    'protocolVersion', 1, 'payloadVersion', 1, 'changes', v_changes,
    'nextCursor', jsonb_build_object('revision', v_next_revision, 'changeIndex', v_next_index),
    'hasMore', coalesce(v_has_more, false), 'serverRevision', v_server_revision
  );
end;
$$;

create or replace function public.sync_bootstrap(p_request jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_auth_subject uuid := auth.uid();
  v_store_id uuid := (p_request->>'storeId')::uuid;
  v_device_id uuid := (p_request->>'deviceId')::uuid;
  v_snapshot_revision bigint;
  v_after_type text;
  v_after_id uuid;
  v_page_size integer := least(greatest(coalesce((p_request->>'pageSize')::integer, 1), 1), 500);
  v_entities jsonb;
  v_last_type text;
  v_last_id uuid;
  v_has_more boolean;
  v_next_cursor jsonb;
begin
  if v_auth_subject is null then
    raise exception using errcode = '28000', message = 'Authenticated user is required.';
  end if;
  if not exists (
    select 1 from public.store_members sm
    join public.app_users au on au.id = sm.user_id
    join public.devices d on d.store_id = sm.store_id
    where sm.store_id = v_store_id and sm.status = 'ACTIVE' and au.status = 'ACTIVE'
      and au.auth_subject = v_auth_subject and d.id = v_device_id and d.status = 'ACTIVE'
  ) then
    raise exception using errcode = '42501', message = 'Store membership or device authorization failed.';
  end if;
  select current_revision into v_snapshot_revision
  from public.store_sync_state where store_id = v_store_id for share;
  if v_snapshot_revision is null then
    raise exception using errcode = '22023', message = 'Store is not enrolled for sync.';
  end if;
  if p_request->'cursor' is not null and jsonb_typeof(p_request->'cursor') = 'object' then
    v_snapshot_revision := (p_request->'cursor'->>'snapshotRevision')::bigint;
    v_after_type := p_request->'cursor'->>'afterEntityType';
    v_after_id := (p_request->'cursor'->>'afterEntityId')::uuid;
  end if;

  with latest as (
    select distinct on (h.store_id, h.entity_type, h.entity_id)
      h.store_id, h.entity_type, h.entity_id, h.server_version, h.payload
    from public.sync_entity_document_history h
    where h.store_id = v_store_id and h.server_revision <= v_snapshot_revision
    order by h.store_id, h.entity_type, h.entity_id, h.server_revision desc
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'storeId', q.store_id, 'entityType', q.entity_type, 'entityId', q.entity_id,
      'entityVersion', q.server_version, 'payloadVersion', 1, 'payload', q.payload
    ) order by q.entity_type, q.entity_id), '[]'::jsonb)
    into v_entities
  from (
    select l.* from latest l
    where v_after_type is null or (l.entity_type, l.entity_id::text) > (v_after_type, v_after_id::text)
    order by l.entity_type, l.entity_id
    limit v_page_size
  ) q;

  select q.entity_type, q.entity_id into v_last_type, v_last_id
  from (
    with latest as (
      select distinct on (h.store_id, h.entity_type, h.entity_id)
        h.store_id, h.entity_type, h.entity_id
      from public.sync_entity_document_history h
      where h.store_id = v_store_id and h.server_revision <= v_snapshot_revision
      order by h.store_id, h.entity_type, h.entity_id, h.server_revision desc
    )
    select l.* from latest l
    where v_after_type is null or (l.entity_type, l.entity_id::text) > (v_after_type, v_after_id::text)
    order by l.entity_type desc, l.entity_id desc
    limit v_page_size
  ) q;
  if v_last_type is null then
    v_has_more := false;
    v_next_cursor := null;
  else
    with latest as (
      select distinct on (h.store_id, h.entity_type, h.entity_id)
        h.store_id, h.entity_type, h.entity_id
      from public.sync_entity_document_history h
      where h.store_id = v_store_id and h.server_revision <= v_snapshot_revision
      order by h.store_id, h.entity_type, h.entity_id, h.server_revision desc
    )
    select exists (
      select 1 from latest l
      where (l.entity_type, l.entity_id::text) > (v_last_type, v_last_id::text)
    ) into v_has_more;
    v_next_cursor := case when v_has_more then jsonb_build_object(
      'snapshotRevision', v_snapshot_revision, 'afterEntityType', v_last_type, 'afterEntityId', v_last_id
    ) else null end;
  end if;

  return jsonb_build_object(
    'protocolVersion', 1, 'payloadVersion', 1,
    'snapshotRevision', v_snapshot_revision, 'entities', v_entities,
    'nextCursor', v_next_cursor, 'hasMore', coalesce(v_has_more, false)
  );
end;
$$;

revoke all on schema sync_private from public, anon, authenticated;
revoke all on function sync_private.is_mutable_operation(text) from public, anon, authenticated;
revoke all on function sync_private.apply_one(jsonb, uuid) from public, anon, authenticated;
revoke all on function public.sync_enroll_store(jsonb) from public, anon, authenticated;
revoke all on function public.sync_push(jsonb) from public, anon, authenticated;
revoke all on function public.sync_pull(jsonb) from public, anon, authenticated;
revoke all on function public.sync_bootstrap(jsonb) from public, anon, authenticated;
grant execute on function public.sync_enroll_store(jsonb) to authenticated;
grant execute on function public.sync_push(jsonb) to authenticated;
grant execute on function public.sync_pull(jsonb) to authenticated;
grant execute on function public.sync_bootstrap(jsonb) to authenticated;
