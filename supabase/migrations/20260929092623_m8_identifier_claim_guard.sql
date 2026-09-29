-- M8: additive identifier validation under the existing serialized store lock.
-- No claim table or new protocol: accepted identifier facts are the authority.
create function sync_private.identifier_claim_keys(p_identifier jsonb)
returns text[] language plpgsql immutable set search_path = pg_catalog, pg_temp as $$
declare
  v_value text := p_identifier->>'value';
  v_type text := p_identifier->>'type';
  v_keys text[];
  v_sum integer := 0;
  v_weight integer := 3;
  v_index integer;
  v_length integer;
begin
  if v_type not in ('EAN','UPC','QR') then return array[]::text[]; end if;
  if v_value is null or length(v_value) = 0 or length(v_value) > 128 then
    raise exception using errcode = '22023', message = 'Invalid identifier value.';
  end if;
  v_keys := array['legacy:' || upper(regexp_replace(btrim(v_value), '[[:space:]-]+', '', 'g'))];
  v_length := length(v_value);
  if v_value ~ '^[0-9]+$' and ((v_type = 'UPC' and v_length = 12) or (v_type = 'EAN' and v_length in (8,13))) then
    for v_index in reverse v_length - 1..1 loop
      v_sum := v_sum + substring(v_value from v_index for 1)::integer * v_weight;
      v_weight := case when v_weight = 3 then 1 else 3 end;
    end loop;
    if (10 - v_sum % 10) % 10 = right(v_value,1)::integer then
      v_keys := v_keys || ('gtin:' || case when v_length = 12 then '0' || v_value else v_value end);
    end if;
  end if;
  return v_keys;
end $$;
revoke all on function sync_private.identifier_claim_keys(jsonb) from public, anon, authenticated;

-- Refuse to hide an existing historical collision during deployment.
do $$
begin
  if exists (
    select 1 from public.sync_normalized_facts a join public.sync_normalized_facts b
      on a.store_id = b.store_id and a.fact_id < b.fact_id
      and a.fact_type = 'identifier' and b.fact_type = 'identifier'
    where a.payload->>'status' = 'ACTIVE' and b.payload->>'status' = 'ACTIVE'
      and sync_private.identifier_claim_keys(a.payload) && sync_private.identifier_claim_keys(b.payload)
  ) then raise exception 'Historical identifier collisions require review before M8 migration.'; end if;
end $$;

alter function sync_private.apply_one(jsonb, uuid) rename to apply_one_before_m8;
create function sync_private.apply_one(p_operation jsonb, p_auth_subject uuid)
returns jsonb language plpgsql security definer
set search_path = public, sync_private, auth, pg_temp as $$
declare
  v_store uuid := (p_operation->>'storeId')::uuid;
  v_identifier jsonb := p_operation->'entities'->'identifier';
  v_product jsonb := p_operation->'entities'->'storeProduct';
  v_variant jsonb;
  v_package jsonb;
  v_winner jsonb;
  v_revision bigint;
  v_keys text[];
begin
  if p_operation->>'operationType' not in ('PRODUCT_CREATED','PRODUCT_IDENTIFIER_ADDED','COMPLETED_SALE_CREATED')
     or (p_operation->>'operationType' <> 'COMPLETED_SALE_CREATED' and (v_identifier is null or v_identifier = 'null'::jsonb)) then
    return sync_private.apply_one_before_m8(p_operation,p_auth_subject);
  end if;
  -- Preserve the original rejection path before examining private facts.
  if p_auth_subject is null or not exists (
    select 1 from public.store_members sm join public.app_users u on u.id = sm.user_id
    join public.stores s on s.id = sm.store_id
    join public.devices d on d.store_id = sm.store_id and (d.user_id is null or d.user_id = u.id)
    where sm.store_id = v_store and u.auth_subject = p_auth_subject
      and sm.status = 'ACTIVE' and u.status = 'ACTIVE' and s.status = 'ACTIVE'
      and d.status = 'ACTIVE' and d.id = (p_operation->>'deviceId')::uuid
  ) then return sync_private.apply_one_before_m8(p_operation,p_auth_subject); end if;
  insert into public.store_sync_state(store_id) values (v_store) on conflict do nothing;
  select current_revision into v_revision from public.store_sync_state where store_id = v_store for update;
  if exists (select 1 from public.applied_sync_operations where store_id = v_store and operation_id = (p_operation->>'operationId')::uuid) then
    return sync_private.apply_one_before_m8(p_operation,p_auth_subject);
  end if;
  if p_operation->>'operationType' = 'COMPLETED_SALE_CREATED' then
    if exists (select 1 from jsonb_array_elements(p_operation->'entities'->'items') item
      where not exists (select 1 from public.sync_normalized_facts f where f.store_id = v_store
        and f.fact_type = 'storeProduct' and f.fact_id = (item->>'storeProductId')::uuid)) then
      return jsonb_build_object('operationId',p_operation->>'operationId','status','REJECTED_RETRYABLE',
        'entityType',p_operation->>'entityType','entityId',p_operation->>'entityId',
        'serverVersion',null,'serverRevision',v_revision,
        'error',jsonb_build_object('code','RETRYABLE','message','A product must finish syncing before this sale. Resolve its barcode conflict if present.',
          'retryable',true,'details',jsonb_build_object('reason','PRODUCT_DEPENDENCY')));
    end if;
    return sync_private.apply_one_before_m8(p_operation,p_auth_subject);
  end if;
  if p_operation->>'operationType' = 'PRODUCT_IDENTIFIER_ADDED' then
    select payload into v_product from public.sync_normalized_facts
      where store_id = v_store and fact_type = 'storeProduct'
        and fact_id = (p_operation->'entities'->'storeProduct'->>'id')::uuid
      order by server_revision desc limit 1;
  end if;
  v_variant := case when p_operation->>'operationType' = 'PRODUCT_CREATED'
    then p_operation->'entities'->'productVariant' else null end;
  if v_variant is null then
    select payload into v_variant from public.sync_normalized_facts
      where store_id = v_store and fact_type = 'productVariant' and fact_id = (v_identifier->>'productVariantId')::uuid
      order by server_revision desc limit 1;
  end if;
  if v_product is null or v_product->>'storeId' is distinct from v_store::text or v_variant is null
    or (p_operation->>'operationType' = 'PRODUCT_CREATED' and v_product->>'id' is distinct from p_operation->>'entityId')
    or (p_operation->>'operationType' = 'PRODUCT_IDENTIFIER_ADDED' and v_identifier->>'id' is distinct from p_operation->>'entityId')
    or v_identifier->>'status' is distinct from 'ACTIVE'
    or v_variant->>'id' is distinct from v_identifier->>'productVariantId'
    or v_product->>'productVariantId' is distinct from v_variant->>'id'
    or v_variant->>'status' is distinct from 'ACTIVE' or v_product->>'status' is distinct from 'ACTIVE'
    or (v_variant->>'identityScope' = 'STORE_LOCAL' and v_variant->>'ownerStoreId' is distinct from v_store::text)
  then raise exception using errcode = '22023', message = 'Invalid store identifier binding.'; end if;
  if v_identifier->>'packageUnitId' is not null then
    v_package := case when p_operation->>'operationType' = 'PRODUCT_CREATED'
      then p_operation->'entities'->'basePackageUnit' else null end;
    if v_package is null or v_package->>'id' is distinct from v_identifier->>'packageUnitId' then
      select payload into v_package from public.sync_normalized_facts where store_id = v_store
        and fact_type in ('basePackageUnit','packageUnit') and fact_id = (v_identifier->>'packageUnitId')::uuid
        order by server_revision desc limit 1;
    end if;
    if v_package is null or v_package->>'productVariantId' is distinct from v_variant->>'id'
      or v_package->>'status' is distinct from 'ACTIVE' then
      raise exception using errcode = '22023', message = 'Invalid identifier package binding.';
    end if;
  end if;
  v_keys := sync_private.identifier_claim_keys(v_identifier);
  select a.payload into v_winner from public.sync_normalized_facts f
    join public.applied_sync_operations a on a.store_id = f.store_id and a.operation_id = f.operation_id
    where f.store_id = v_store and f.fact_type = 'identifier' and f.payload->>'status' = 'ACTIVE'
      and ((f.fact_id is distinct from (v_identifier->>'id')::uuid and sync_private.identifier_claim_keys(f.payload) && v_keys)
        or (f.fact_id = (v_identifier->>'id')::uuid and f.payload is distinct from v_identifier))
    order by f.server_revision limit 1;
  if v_winner is not null then
    return jsonb_build_object('operationId',p_operation->>'operationId','status','CONFLICT',
      'entityType',p_operation->>'entityType','entityId',p_operation->>'entityId',
      'serverVersion',null,'serverRevision',v_revision,
      'error',jsonb_build_object('code','CONFLICT','message','This barcode is already claimed by another product or package.',
        'retryable',false,'details',jsonb_build_object('reason','IDENTIFIER_COLLISION','serverPayload',v_winner)));
  end if;
  return sync_private.apply_one_before_m8(p_operation,p_auth_subject);
end $$;
revoke all on function sync_private.apply_one_before_m8(jsonb,uuid) from public, anon, authenticated;
revoke all on function sync_private.apply_one(jsonb,uuid) from public, anon, authenticated;
