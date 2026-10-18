-- M7 audit correction: a physical count cannot overwrite inventory or batch
-- changes that this device had not observed. Keep the original application
-- function intact; the narrow wrapper runs under the same store revision lock.
alter function sync_private.apply_one(jsonb, uuid) rename to apply_one_unchecked;

create function sync_private.apply_one(p_operation jsonb, p_auth_subject uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, sync_private, pg_temp
as $$
declare
  v_store_id uuid := nullif(p_operation->>'storeId', '')::uuid;
  v_device_id uuid := nullif(p_operation->>'deviceId', '')::uuid;
  v_operation_id uuid := nullif(p_operation->>'operationId', '')::uuid;
  v_product_text text := p_operation->'entities'->'line'->>'storeProductId';
  v_baseline jsonb := p_operation->'entities'->'syncBaseline';
  v_predecessors jsonb;
  v_current_revision bigint;
  v_baseline_revision bigint;
  v_reason text;
  v_stale boolean;
begin
  if p_operation->>'operationType' is distinct from 'RECONCILIATION_FINALIZED'
     or p_auth_subject is null then
    return sync_private.apply_one_unchecked(p_operation, p_auth_subject);
  end if;

  -- Do not disclose a store revision before the original membership/device
  -- checks. Unauthorised requests retain their existing rejection path.
  if not exists (
    select 1 from public.store_members sm
    join public.app_users au on au.id = sm.user_id
    join public.stores s on s.id = sm.store_id
    where sm.store_id = v_store_id and sm.status = 'ACTIVE'
      and au.status = 'ACTIVE' and au.auth_subject = p_auth_subject
      and s.status = 'ACTIVE'
  ) or not exists (
    select 1 from public.devices d
    left join public.app_users au on au.id = d.user_id
    where d.id = v_device_id and d.store_id = v_store_id and d.status = 'ACTIVE'
      and (d.user_id is null or au.auth_subject = p_auth_subject)
  ) then
    return sync_private.apply_one_unchecked(p_operation, p_auth_subject);
  end if;

  -- M5 reconciliation is owner-only. A caller cannot gain that authority by
  -- forging the role or actor fields in an otherwise valid envelope.
  if not exists (
    select 1 from public.store_members sm
    join public.app_users au on au.id = sm.user_id
    where sm.store_id = v_store_id and sm.status = 'ACTIVE'
      and sm.role = 'OWNER' and au.status = 'ACTIVE'
      and au.auth_subject = p_auth_subject
  ) then
    return jsonb_build_object(
      'operationId', v_operation_id, 'status', 'REJECTED_PERMANENT',
      'entityType', p_operation->>'entityType', 'entityId', p_operation->>'entityId',
      'serverVersion', null, 'serverRevision', null,
      'error', jsonb_build_object('code', 'FORBIDDEN',
        'message', 'An active owner is required for physical reconciliation.',
        'retryable', false)
    );
  end if;

  select s.current_revision into v_current_revision
  from public.store_sync_state s where s.store_id = v_store_id for update;
  if v_current_revision is null or exists (
    select 1 from public.applied_sync_operations a
    where a.store_id = v_store_id and a.operation_id = v_operation_id
  ) then
    return sync_private.apply_one_unchecked(p_operation, p_auth_subject);
  end if;

  if jsonb_typeof(v_baseline) is distinct from 'object'
     or coalesce(v_baseline->>'serverRevision', '') !~ '^(0|[1-9][0-9]*)$'
     or length(coalesce(v_baseline->>'serverRevision', '')) > 18
     or jsonb_typeof(v_baseline->'predecessorOperationIds') is distinct from 'array'
     or coalesce(v_baseline->>'incomplete', 'true') <> 'false'
     or coalesce(v_product_text, '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
     or p_operation->'entities'->'line'->>'storeId' is distinct from v_store_id::text
     or p_operation->'entities'->'reconciliation'->>'storeId' is distinct from v_store_id::text
     or p_operation->'entities'->'line'->>'reconciliationId' is distinct from p_operation->>'entityId'
     or p_operation->'entities'->'reconciliation'->>'id' is distinct from p_operation->>'entityId'
     or p_operation->'entities'->'reconciliation'->>'finalizationOperationId' is distinct from v_operation_id::text
     or p_operation->'entities'->'reconciliation'->>'status' is distinct from 'COMPLETED'
  then
    v_reason := 'The count has no trustworthy server baseline.';
  else
    v_baseline_revision := (v_baseline->>'serverRevision')::bigint;
    v_predecessors := v_baseline->'predecessorOperationIds';
    if v_baseline_revision > v_current_revision
       or jsonb_array_length(v_predecessors) > 5000
       or exists (
         select 1 from jsonb_array_elements_text(v_predecessors) as p(id)
         where p.id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       )
    then
      v_reason := 'The count baseline cannot be verified.';
    elsif exists (
      select 1 from jsonb_array_elements(coalesce(p_operation->'entities'->'inventoryEvents', '[]'::jsonb)) as e(fact)
      where e.fact->>'storeProductId' is distinct from v_product_text
         or e.fact->>'storeId' is distinct from v_store_id::text
    ) or exists (
      select 1 from jsonb_array_elements(coalesce(p_operation->'entities'->'batchOperations', '[]'::jsonb)) as e(fact)
      where e.fact->>'storeProductId' is distinct from v_product_text
         or e.fact->>'storeId' is distinct from v_store_id::text
    ) or exists (
      select 1 from jsonb_array_elements(coalesce(p_operation->'entities'->'batchEntries', '[]'::jsonb)) as e(fact)
      where e.fact->>'storeProductId' is distinct from v_product_text
         or e.fact->>'storeId' is distinct from v_store_id::text
    ) then
      v_reason := 'The count facts do not belong to its product and store.';
    else
      select exists (
        select 1 from (
          select im.operation_id from sync_private.inventory_movements im
          where im.store_id = v_store_id and im.store_product_id = v_product_text::uuid
            and im.server_revision > v_baseline_revision
          union
          select bf.operation_id from sync_private.batch_facts bf
          where bf.store_id = v_store_id and bf.store_product_id = v_product_text::uuid
            and bf.server_revision > v_baseline_revision
        ) changed
        where not (
          v_predecessors ? changed.operation_id::text
          and exists (
            select 1 from public.applied_sync_operations a
            where a.store_id = v_store_id and a.operation_id = changed.operation_id
              and a.payload->>'deviceId' = v_device_id::text
          )
        )
      ) into v_stale;
      if v_stale then
        v_reason := 'Inventory or expiry groups changed on another device; review and recount.';
      end if;
    end if;
  end if;

  if v_reason is not null then
    return jsonb_build_object(
      'operationId', v_operation_id, 'status', 'CONFLICT',
      'entityType', p_operation->>'entityType', 'entityId', p_operation->>'entityId',
      'serverVersion', null, 'serverRevision', v_current_revision,
      'error', jsonb_build_object(
        'code', 'CONFLICT', 'message', v_reason, 'retryable', false,
        'details', jsonb_build_object('reason', 'STALE_RECONCILIATION')
      )
    );
  end if;
  return sync_private.apply_one_unchecked(p_operation, p_auth_subject);
end;
$$;

revoke all on function sync_private.apply_one(jsonb, uuid) from public, anon, authenticated;
