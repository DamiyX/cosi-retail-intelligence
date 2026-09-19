-- M7-06: append-only M5 reconciliation, check, and attention facts.

create table sync_private.m5_fact_history (
  store_id uuid not null references public.stores(id) on delete cascade,
  operation_id uuid not null,
  fact_type text not null,
  fact_id uuid not null,
  server_revision bigint not null check (server_revision >= 1),
  actor_user_id uuid,
  inventory_watermark text,
  batch_watermark text,
  payload jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (store_id, operation_id, fact_type, fact_id)
);

create index sync_private_m5_fact_lookup
  on sync_private.m5_fact_history(store_id, fact_type, fact_id, server_revision);

alter table sync_private.m5_fact_history enable row level security;
revoke all on all tables in schema sync_private from public, anon, authenticated;

create or replace function sync_private.validate_m5_payload(p_payload jsonb)
returns void
language plpgsql
immutable
set search_path = public, sync_private, pg_temp
as $$
declare
  v_operation_type text := p_payload->>'operationType';
  v_entities jsonb := p_payload->'entities';
  v_request jsonb := v_entities->'request';
begin
  if v_operation_type in ('BATCH_CLASSIFICATION_CREATED', 'INVENTORY_ADJUSTMENT_CREATED', 'RECONCILIATION_FINALIZED')
     and jsonb_typeof(v_request) <> 'object' then
    raise exception using errcode = '22023', message = 'M5 operation is missing its request fingerprint.';
  end if;
  if v_operation_type = 'BATCH_CLASSIFICATION_CREATED'
     and jsonb_typeof(v_entities->'entries') <> 'array' then
    raise exception using errcode = '22023', message = 'Batch classification must include its immutable entries.';
  end if;
  if v_operation_type = 'INVENTORY_ADJUSTMENT_CREATED'
     and jsonb_typeof(v_entities->'inventoryEvents') <> 'array' then
    raise exception using errcode = '22023', message = 'Inventory adjustment must include its inventory events.';
  end if;
  if v_operation_type = 'RECONCILIATION_FINALIZED'
     and (v_entities->'reconciliation' is null or v_entities->'line' is null) then
    raise exception using errcode = '22023', message = 'Reconciliation finalization must include its parent and line facts.';
  end if;
end;
$$;

create or replace function sync_private.project_m5_facts()
returns trigger
language plpgsql
security definer
set search_path = public, sync_private, auth, pg_temp
as $$
declare
  v_operation_type text := new.payload->>'operationType';
  v_key text;
  v_values jsonb;
  v_fact jsonb;
  v_fact_id text;
  v_actor text;
  v_inventory_watermark text;
  v_batch_watermark text;
  v_revision bigint;
begin
  if v_operation_type not in (
    'BATCH_CLASSIFICATION_CREATED', 'INVENTORY_ADJUSTMENT_CREATED',
    'RECONCILIATION_FINALIZED', 'CHECK_SETTINGS_SAVED',
    'CHECK_ASSIGNMENT_CREATED', 'ATTENTION_SETTINGS_SAVED', 'ATTENTION_SNOOZE_CREATED'
  ) then
    return new;
  end if;
  perform sync_private.validate_m5_payload(new.payload);
  select current_revision into v_revision from public.store_sync_state where store_id = new.store_id;
  for v_key, v_values in select e.key, e.value from jsonb_each(coalesce(new.payload->'entities', '{}'::jsonb)) e loop
    if jsonb_typeof(v_values) = 'array' then
      for v_fact in select value from jsonb_array_elements(v_values) loop
        v_fact_id := coalesce(v_fact->>'id', v_fact->>'operationId', v_fact->>'storeProductId', new.entity_id::text);
        if v_fact_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
          continue;
        end if;
        v_actor := coalesce(v_fact->>'createdByUserId', v_fact->>'recordedByUserId', v_fact->>'updatedByUserId');
        v_inventory_watermark := coalesce(v_fact->>'inventoryWatermark', v_fact->>'expectedInventoryWatermark', v_fact->>'initialInventoryWatermark');
        v_batch_watermark := coalesce(v_fact->>'batchWatermark', v_fact->>'expectedBatchWatermark', v_fact->>'initialBatchWatermark');
        insert into sync_private.m5_fact_history
          (store_id, operation_id, fact_type, fact_id, server_revision, actor_user_id,
           inventory_watermark, batch_watermark, payload)
        values (
          new.store_id, new.last_operation_id, v_key, v_fact_id::uuid, v_revision,
          nullif(v_actor, '')::uuid, v_inventory_watermark, v_batch_watermark, v_fact
        ) on conflict do nothing;
      end loop;
    elsif jsonb_typeof(v_values) = 'object' then
      v_fact_id := coalesce(v_values->>'id', v_values->>'operationId', v_values->>'storeProductId', new.entity_id::text);
      if v_fact_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
        v_actor := coalesce(v_values->>'createdByUserId', v_values->>'recordedByUserId', v_values->>'updatedByUserId');
        v_inventory_watermark := coalesce(v_values->>'inventoryWatermark', v_values->>'expectedInventoryWatermark', v_values->>'initialInventoryWatermark');
        v_batch_watermark := coalesce(v_values->>'batchWatermark', v_values->>'expectedBatchWatermark', v_values->>'initialBatchWatermark');
        insert into sync_private.m5_fact_history
          (store_id, operation_id, fact_type, fact_id, server_revision, actor_user_id,
           inventory_watermark, batch_watermark, payload)
        values (
          new.store_id, new.last_operation_id, v_key, v_fact_id::uuid, v_revision,
          nullif(v_actor, '')::uuid, v_inventory_watermark, v_batch_watermark, v_values
        ) on conflict do nothing;
      end if;
    end if;
  end loop;
  return new;
end;
$$;

create or replace function sync_private.validate_m5_payload_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, sync_private, auth, pg_temp
as $$
begin
  perform sync_private.validate_m5_payload(new.payload);
  return new;
end;
$$;

create trigger aaa_validate_m5_payload
before insert or update on public.sync_entity_documents
for each row execute function sync_private.validate_m5_payload_trigger();

create trigger trg_project_m5_facts
after insert or update on public.sync_entity_documents
for each row execute function sync_private.project_m5_facts();

revoke all on function sync_private.validate_m5_payload(jsonb) from public, anon, authenticated;
revoke all on function sync_private.validate_m5_payload_trigger() from public, anon, authenticated;
revoke all on function sync_private.project_m5_facts() from public, anon, authenticated;
