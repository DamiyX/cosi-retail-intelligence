-- M7-05: mutable catalogue history and immutable package conversion evidence.

create table sync_private.catalogue_mutation_history (
  store_id uuid not null references public.stores(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  server_version bigint not null check (server_version >= 1),
  server_revision bigint not null check (server_revision >= 1),
  operation_id uuid not null,
  operation_type text not null,
  payload jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (store_id, entity_type, entity_id, server_version),
  unique (store_id, operation_id)
);

create table sync_private.package_conversion_state (
  store_id uuid not null references public.stores(id) on delete cascade,
  package_unit_id uuid not null,
  conversion_to_base_micros numeric(30,0) not null check (conversion_to_base_micros > 0),
  last_server_version bigint not null check (last_server_version >= 1),
  last_server_revision bigint not null check (last_server_revision >= 1),
  payload jsonb not null,
  primary key (store_id, package_unit_id)
);

create table sync_private.package_conversion_snapshots (
  store_id uuid not null references public.stores(id) on delete cascade,
  operation_id uuid not null,
  operation_type text not null check (operation_type in ('COMPLETED_SALE_CREATED', 'COMPLETED_PURCHASE_CREATED')),
  source_entity_id uuid not null,
  package_unit_id uuid not null,
  conversion_to_base_micros numeric(30,0) not null check (conversion_to_base_micros > 0),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (store_id, operation_id, package_unit_id)
);

create table sync_private.owner_setting_history (
  store_id uuid not null references public.stores(id) on delete cascade,
  operation_id uuid not null,
  entity_type text not null,
  entity_id uuid not null,
  server_version bigint not null check (server_version >= 1),
  server_revision bigint not null check (server_revision >= 1),
  payload jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (store_id, operation_id)
);

alter table sync_private.catalogue_mutation_history enable row level security;
alter table sync_private.package_conversion_state enable row level security;
alter table sync_private.package_conversion_snapshots enable row level security;
alter table sync_private.owner_setting_history enable row level security;
revoke all on all tables in schema sync_private from public, anon, authenticated;

create or replace function sync_private.validate_package_mutation()
returns trigger
language plpgsql
security definer
set search_path = public, sync_private, auth, pg_temp
as $$
declare
  v_package jsonb;
  v_package_id uuid;
  v_conversion numeric;
  v_existing numeric;
  v_operation_type text := new.payload->>'operationType';
begin
  if new.entity_type = 'PACKAGE_UNIT' and v_operation_type in ('PACKAGE_CREATED', 'PACKAGE_UPDATED', 'PACKAGE_DEACTIVATED') then
    v_package := coalesce(new.payload->'entities'->'packageUnit', new.payload->'entities'->'basePackageUnit');
    v_package_id := coalesce(nullif(v_package->>'id', '')::uuid, new.entity_id);
    v_conversion := (v_package->>'conversionToBaseMicros')::numeric;
    if v_conversion is null or v_conversion <= 0 then
      raise exception using errcode = '22023', message = 'Package conversion must be a positive exact integer.';
    end if;
    select conversion_to_base_micros into v_existing
    from sync_private.package_conversion_state
    where store_id = new.store_id and package_unit_id = v_package_id
    for update;
    if v_existing is not null and v_existing <> v_conversion then
      raise exception using errcode = '42501', message = 'Package conversion is immutable after enrolment.';
    end if;
    insert into sync_private.package_conversion_state
      (store_id, package_unit_id, conversion_to_base_micros, last_server_version, last_server_revision, payload)
    values (new.store_id, v_package_id, v_conversion, new.server_version,
      (select current_revision from public.store_sync_state where store_id = new.store_id), v_package)
    on conflict (store_id, package_unit_id) do update set
      last_server_version = excluded.last_server_version,
      last_server_revision = excluded.last_server_revision,
      payload = excluded.payload;
  end if;
  return new;
end;
$$;

create trigger aaa_validate_package_mutation
before insert or update on public.sync_entity_documents
for each row execute function sync_private.validate_package_mutation();

create or replace function sync_private.project_catalogue_history()
returns trigger
language plpgsql
security definer
set search_path = public, sync_private, auth, pg_temp
as $$
declare
  v_operation_type text := new.payload->>'operationType';
begin
  if new.entity_type in ('STORE_PRODUCT', 'PRODUCT_VARIANT', 'PACKAGE_UNIT', 'STORE_PACKAGE_SETTING', 'PRODUCT_IDENTIFIER') then
    insert into sync_private.catalogue_mutation_history
      (store_id, entity_type, entity_id, server_version, server_revision, operation_id, operation_type, payload)
    values (
      new.store_id, new.entity_type, new.entity_id, new.server_version,
      (select current_revision from public.store_sync_state where store_id = new.store_id),
      new.last_operation_id, new.payload->>'operationType', new.payload
    ) on conflict do nothing;
  end if;
  if v_operation_type in ('STORE_PACKAGE_SETTING_SAVED', 'PRODUCT_REORDER_LEVEL_UPDATED', 'CHECK_SETTINGS_SAVED', 'ATTENTION_SETTINGS_SAVED') then
    insert into sync_private.owner_setting_history
      (store_id, operation_id, entity_type, entity_id, server_version, server_revision, payload)
    values (
      new.store_id, new.last_operation_id, new.entity_type, new.entity_id, new.server_version,
      (select current_revision from public.store_sync_state where store_id = new.store_id), new.payload
    ) on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger trg_project_catalogue_history
after insert or update on public.sync_entity_documents
for each row execute function sync_private.project_catalogue_history();

create or replace function sync_private.project_conversion_snapshots()
returns trigger
language plpgsql
security definer
set search_path = public, sync_private, auth, pg_temp
as $$
declare
  v_items jsonb;
  v_item jsonb;
  v_conversion numeric;
  v_operation_type text := new.payload->>'operationType';
begin
  if v_operation_type in ('COMPLETED_SALE_CREATED', 'COMPLETED_PURCHASE_CREATED') then
    v_items := new.payload->'entities'->'items';
    for v_item in select value from jsonb_array_elements(coalesce(v_items, '[]'::jsonb)) loop
      v_conversion := (v_item->>'conversionToBaseSnapshotMicros')::numeric;
      insert into sync_private.package_conversion_snapshots
        (store_id, operation_id, operation_type, source_entity_id, package_unit_id, conversion_to_base_micros)
      values (
        new.store_id, new.last_operation_id, v_operation_type, new.entity_id,
        (v_item->>'packageUnitId')::uuid, v_conversion
      ) on conflict do nothing;
    end loop;
  end if;
  return new;
end;
$$;

create trigger trg_project_conversion_snapshots
after insert or update on public.sync_entity_documents
for each row execute function sync_private.project_conversion_snapshots();

revoke all on function sync_private.validate_package_mutation() from public, anon, authenticated;
revoke all on function sync_private.project_catalogue_history() from public, anon, authenticated;
revoke all on function sync_private.project_conversion_snapshots() from public, anon, authenticated;
