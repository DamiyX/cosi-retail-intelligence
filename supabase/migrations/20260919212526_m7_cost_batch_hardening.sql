-- M7-04: exact cost/rational and batch-ledger hardening.

create or replace function sync_private.validate_cost_batch_payload()
returns trigger
language plpgsql
security definer
set search_path = public, sync_private, auth, pg_temp
as $$
declare
  v_operation_type text := new.payload->>'operationType';
  v_fact jsonb;
  v_value jsonb;
  v_sum numeric := 0;
begin
  if v_operation_type in (
    'COMPLETED_SALE_CREATED', 'COMPLETED_PURCHASE_CREATED',
    'INVENTORY_ADJUSTMENT_CREATED', 'RECONCILIATION_FINALIZED'
  ) then
    for v_fact in select value from jsonb_array_elements(coalesce(new.payload->'entities'->'costMovements', '[]'::jsonb)) loop
      v_value := v_fact->'value';
      if jsonb_typeof(v_value) <> 'object'
         or (v_value->>'denominator')::numeric <= 0 then
        raise exception using errcode = '22023', message = 'Cost movement values must be exact positive-denominator rationals.';
      end if;
      if v_fact->'unitCost' is not null and jsonb_typeof(v_fact->'unitCost') = 'object'
         and (v_fact->'unitCost'->>'denominator')::numeric <= 0 then
        raise exception using errcode = '22023', message = 'Unit cost rational denominator must be positive.';
      end if;
    end loop;
  end if;
  if v_operation_type = 'BATCH_CLASSIFICATION_CREATED' then
    for v_fact in select value from jsonb_array_elements(coalesce(new.payload->'entities'->'entries', '[]'::jsonb)) loop
      v_sum := v_sum + (v_fact->>'deltaBaseMicros')::numeric;
    end loop;
    if v_sum <> 0 then
      raise exception using errcode = '22023', message = 'Batch classification entries must be net zero.';
    end if;
  end if;
  return new;
end;
$$;

create trigger aab_validate_cost_batch
before insert or update on public.sync_entity_documents
for each row execute function sync_private.validate_cost_batch_payload();

-- The projection is intentionally a deterministic ordered fact stream. A
-- consumer can rebuild a cost state from immutable movements without relying
-- on a mutable snapshot or on FEFO batch allocation order.
create or replace function sync_private.rebuild_cost_fact_order(
  p_store_id uuid,
  p_store_product_id uuid
)
returns table (
  server_revision bigint,
  fact_id uuid,
  fact_type text,
  quantity_base_micros numeric,
  value_numerator numeric,
  value_denominator numeric,
  payload jsonb
)
language sql
stable
security definer
set search_path = public, sync_private, pg_temp
as $$
  select cf.server_revision, cf.fact_id, cf.fact_type,
         cf.quantity_base_micros, cf.value_numerator, cf.value_denominator, cf.payload
  from sync_private.cost_facts cf
  where cf.store_id = p_store_id and cf.store_product_id = p_store_product_id
  order by cf.server_revision asc, cf.fact_type asc, cf.fact_id asc;
$$;

revoke all on function sync_private.validate_cost_batch_payload() from public, anon, authenticated;
revoke all on function sync_private.rebuild_cost_fact_order(uuid, uuid) from public, anon, authenticated;
