-- SYNTHETIC rollback-only accepted-fact fixture and exact SQL parity source.
-- NOT proof of real independent stores, Auth enrollment, privacy or live M7 ingress.
-- Requires disposable approved database, source migration applied, psql ON_ERROR_STOP=1.
begin;
update market_private.configuration set activated=true;
insert into market_private.zones values('20000000-0000-4000-8000-000000000001','SYNTHETIC zone','NG','NGN','SYNTHETIC region','SYNTHETIC city',1,true,true);
insert into market_private.variants values('20000000-0000-4000-8000-000000000002','NG','NGN',1,true,true);
insert into market_private.packages values('20000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000002','SYNTHETIC package',1000000,1,true,true);

do $$ declare i integer; owner_id uuid; store_id uuid; device_id uuid; variant_id uuid; package_id uuid;
  purchase_id uuid; line_id uuid; observation_id uuid; operation_id uuid; catalogue_operation uuid; fact jsonb;
begin
  for i in 1..6 loop
    owner_id := ('21000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid;
    store_id := ('22000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid;
    device_id := ('23000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid;
    variant_id := ('24000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid;
    package_id := ('25000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid;
    purchase_id := ('26000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid;
    line_id := ('27000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid;
    observation_id := ('28000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid;
    operation_id := ('29000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid;
    catalogue_operation := ('29500000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid;
    insert into public.app_users(id,auth_subject,display_name) values(owner_id,owner_id,'SYNTHETIC private owner');
    insert into public.stores(id,name,country_code,currency_code,timezone,created_by_user_id)
      values(store_id,'SYNTHETIC store','NG','NGN','UTC',owner_id);
    insert into public.store_members(id,store_id,user_id,role) values(owner_id,store_id,owner_id,'OWNER');
    insert into public.devices(id,store_id,user_id,platform,app_version) values(device_id,store_id,owner_id,'ANDROID','SYNTHETIC');
    insert into public.store_sync_state(store_id,current_revision) values(store_id,2);
    insert into public.applied_sync_operations(store_id,operation_id,entity_type,entity_id,operation_type,payload,payload_hash,result,server_revision)
      values(store_id,catalogue_operation,'STORE_PRODUCT',variant_id,'PRODUCT_CREATED','{}','SYNTHETIC accepted nested catalogue fixture','{}',1);
    insert into public.sync_normalized_facts(store_id,operation_id,fact_type,fact_id,payload,server_revision)
      values(store_id,catalogue_operation,'productVariant',variant_id,jsonb_build_object('id',variant_id,'status','ACTIVE'),1),
        (store_id,catalogue_operation,'basePackageUnit',package_id,jsonb_build_object('id',package_id,'status','ACTIVE','productVariantId',variant_id,'conversionToBaseMicros',1000000),1);
    insert into market_private.mappings values(store_id,variant_id,package_id,'20000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000003',1,1,1,1,1,true,true);
    insert into market_private.controls values(store_id,true,1,1,'20000000-0000-4000-8000-000000000001',1,now()-interval '24 hours',1);
    insert into public.applied_sync_operations(store_id,operation_id,entity_type,entity_id,operation_type,payload,payload_hash,result,server_revision)
      values(store_id,operation_id,'PURCHASE',purchase_id,'COMPLETED_PURCHASE_CREATED','{}','SYNTHETIC fixture','{}',2);
    insert into sync_private.purchase_headers values(purchase_id,store_id,operation_id,2,null,owner_id,device_id,now()-interval '1 hour','NGN',100+i,'COMPLETED','{}');
    insert into sync_private.purchase_lines values(line_id,purchase_id,store_id,variant_id,variant_id,package_id,1000000,1000000,1000000,100+i,100+i,100+i,1,100+i,1,'{}');
    fact := jsonb_build_object('storeId',store_id,'purchaseItemId',line_id,'productVariantId',variant_id,'packageUnitId',package_id,
      'sourceId',purchase_id,'sourceType','RETAILER_PURCHASE','validationStatus','VALID','contributionConsent',false,'currencyCode','NGN',
      'observedAt',now()-interval '1 hour','packageCostNumerator',(100+i)::text,'packageCostDenominator','1','baseUnitCostNumerator',(100+i)::text,
      'baseUnitCostDenominator','1','totalPurchaseCostMinor',100+i,'quantityPackagesMicros',1000000,'quantityBaseMicros',1000000,'conversionToBaseSnapshotMicros',1000000);
    insert into sync_private.price_observation_facts values(observation_id,store_id,operation_id,2,100+i,fact);
  end loop;
end $$;

do $$ declare a jsonb; revision bigint; response jsonb; begin
  assert (select count(*) from market_private.eligible_sources())=6;
  -- Private source spoof/zero/future/estimated facts fail closed.
  update sync_private.price_observation_facts set payload=jsonb_set(payload,'{validationStatus}','"ESTIMATED"')
    where observation_id='28000000-0000-4000-8000-000000000006';
  assert (select count(*) from market_private.eligible_sources())=5;
  update sync_private.price_observation_facts set payload=jsonb_set(payload,'{validationStatus}','"VALID"')
    where observation_id='28000000-0000-4000-8000-000000000006';
  revision := market_private.refresh_releases();
  select payload into a from market_private.releases;
  assert a->>'observationCount'='6'; assert a->'median'='{"numerator":"207","denominator":"2"}'::jsonb;
  assert a->'minimum'='{"numerator":"101","denominator":"1"}'::jsonb;
  assert a->'maximum'='{"numerator":"106","denominator":"1"}'::jsonb;
  -- One-store repeated observation cannot inflate independent contribution count.
  insert into market_private.contributions select '28000000-0000-4000-8000-000000000099',store_id,generation,accepted_revision,mapping_version,
    market_variant_id,market_package_id,zone_id,zone_version,currency_code,observed_at,package_n,package_d,base_n,base_d
    from market_private.contributions where store_id='22000000-0000-4000-8000-000000000001';
  a := market_private.aggregate_cohort('20000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000001','NGN',clock_timestamp());
  assert a->>'observationCount'='6';
  delete from market_private.contributions where store_id in ('22000000-0000-4000-8000-000000000005','22000000-0000-4000-8000-000000000006');
  assert market_private.aggregate_cohort('20000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000001','NGN',clock_timestamp())='{"status":"INSUFFICIENT_DATA"}'::jsonb;
  perform market_private.refresh_releases();
  perform set_config('request.jwt.claim.sub','21000000-0000-4000-8000-000000000001',true);
  response := public.market_read(jsonb_build_object('storeId','22000000-0000-4000-8000-000000000001','deviceId','23000000-0000-4000-8000-000000000001',
    'keys',jsonb_build_array(jsonb_build_object('productVariantId','24000000-0000-4000-8000-000000000001','packageUnitId','25000000-0000-4000-8000-000000000001'))));
  assert response->'results'->0->>'status'='AVAILABLE';
  assert response::text !~ 'SYNTHETIC private owner|purchaseId|supplier|quantity|observationId|storeName';
  -- Consent revoke and release invalidation are one transaction.
  perform public.market_control(jsonb_build_object('policyVersion',1,'storeId','22000000-0000-4000-8000-000000000001','deviceId','23000000-0000-4000-8000-000000000001',
    'operationId','30000000-0000-4000-8000-000000000001','expectedVersion',1,'enabled',false,'zoneId',null));
  assert not exists(select 1 from market_private.releases where payload ? 'median');
  assert not exists(select 1 from market_private.contributions where store_id='22000000-0000-4000-8000-000000000001');
  assert (select count(*) from sync_private.price_observation_facts)=6;
end $$;
rollback;
