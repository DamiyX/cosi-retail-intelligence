-- D-051 PROVISIONAL SOURCE ONLY. No real reference/geography seed or activation.
-- No changes to immutable M7 envelopes/private receipt flags/business sync.
begin;
create schema market_private;
revoke all on schema market_private from public, anon, authenticated, service_role;

create table market_private.configuration (
  singleton boolean primary key default true check(singleton),
  activated boolean not null default false,
  revision bigint not null default 0 check(revision between 0 and 9007199254740991)
);
insert into market_private.configuration(singleton) values(true);
create table market_private.zones (
  id uuid primary key, name text not null check(length(name) between 1 and 200),
  country_code text not null check(country_code ~ '^[A-Z]{2}$'),
  currency_code text not null check(currency_code ~ '^[A-Z]{3}$'),
  region text not null, city text not null,
  version bigint not null check(version between 1 and 9007199254740991),
  approved boolean not null default false, active boolean not null default false
);
create table market_private.controls (
  store_id uuid primary key references public.stores(id) on delete restrict,
  enabled boolean not null default false, version bigint not null default 0,
  generation bigint not null default 0, zone_id uuid references market_private.zones(id),
  zone_version bigint, enabled_at timestamptz, cutoff_revision bigint,
  check(version between 0 and 9007199254740991), check(generation between 0 and 9007199254740991),
  check(not enabled or (zone_id is not null and zone_version is not null and enabled_at is not null and cutoff_revision is not null))
);
create table market_private.control_operations (
  store_id uuid not null references public.stores(id), operation_id uuid not null,
  body_hash text not null, body jsonb not null,
  status text not null check(status in ('APPLIED','CONFLICT','DISABLED')),
  accepted_at timestamptz not null default now(),
  primary key(store_id, operation_id), unique(operation_id)
);

create table market_private.variants (
  id uuid primary key, country_code text not null check(country_code ~ '^[A-Z]{2}$'),
  currency_code text not null check(currency_code ~ '^[A-Z]{3}$'),
  version bigint not null check(version>0), reviewed boolean not null default false, active boolean not null default false
);
create table market_private.packages (
  id uuid primary key, variant_id uuid not null references market_private.variants(id),
  name text not null check(length(name) between 1 and 200),
  conversion_micros numeric(30,0) not null check(conversion_micros>0),
  version bigint not null check(version>0), reviewed boolean not null default false, active boolean not null default false,
  unique(id,variant_id)
);
create table market_private.mappings (
  store_id uuid not null references public.stores(id), local_variant_id uuid not null, local_package_id uuid not null,
  market_variant_id uuid not null, market_package_id uuid not null,
  local_variant_revision bigint not null, local_package_revision bigint not null,
  market_variant_version bigint not null, market_package_version bigint not null,
  version bigint not null check(version between 1 and 9007199254740991),
  reviewed boolean not null default false, active boolean not null default false,
  primary key(store_id,local_variant_id,local_package_id),
  foreign key(market_package_id,market_variant_id) references market_private.packages(id,variant_id)
);
create table market_private.contributions (
  observation_id uuid primary key, store_id uuid not null references public.stores(id),
  generation bigint not null, accepted_revision bigint not null, mapping_version bigint not null,
  market_variant_id uuid not null, market_package_id uuid not null, zone_id uuid not null, zone_version bigint not null,
  currency_code text not null, observed_at timestamptz not null,
  package_n numeric(60,0) not null check(package_n>0), package_d numeric(60,0) not null check(package_d>0),
  base_n numeric(60,0) not null check(base_n>0), base_d numeric(60,0) not null check(base_d>0)
);
create index market_contributions_cohort on market_private.contributions(market_variant_id,market_package_id,zone_id,currency_code,store_id,observed_at desc);
create table market_private.releases (
  market_variant_id uuid not null, market_package_id uuid not null, zone_id uuid not null, currency_code text not null,
  revision bigint not null, payload jsonb not null,
  primary key(market_variant_id,market_package_id,zone_id,currency_code)
);
create table market_private.release_members (
  revision bigint not null, market_variant_id uuid not null, market_package_id uuid not null,
  zone_id uuid not null, currency_code text not null, observation_id uuid not null,
  store_id uuid not null, generation bigint not null, mapping_version bigint not null, zone_version bigint not null,
  primary key(revision,market_variant_id,market_package_id,zone_id,currency_code,store_id)
);

-- Reviewed current accepted nested catalogue facts are the identity seam.
-- PRODUCT_CREATED is one STORE_PRODUCT envelope; its children do not necessarily
-- have independent sync_entity_documents. Bind review to their accepted revisions.
-- No local ID/name/barcode is promoted to global identity by inference.
create function market_private.valid_mappings(p_store uuid)
returns setof market_private.mappings language sql set search_path = '' as $$
  select m.* from market_private.mappings m
    join market_private.variants v on v.id=m.market_variant_id and v.version=m.market_variant_version
    join market_private.packages k on k.id=m.market_package_id and k.variant_id=v.id and k.version=m.market_package_version
    join public.stores s on s.id=m.store_id and s.country_code=v.country_code and s.currency_code=v.currency_code
    cross join lateral (
      select n.payload,n.server_revision from public.sync_normalized_facts n
      join public.applied_sync_operations op on op.store_id=n.store_id and op.operation_id=n.operation_id and op.server_revision=n.server_revision
      where n.store_id=m.store_id and n.fact_id=m.local_variant_id and n.fact_type='productVariant'
        and op.operation_type in ('PRODUCT_CREATED','PRODUCT_IDENTITY_UPDATED')
      order by n.server_revision desc,n.operation_id desc limit 1
    ) vd
    cross join lateral (
      select n.payload,n.server_revision from public.sync_normalized_facts n
      join public.applied_sync_operations op on op.store_id=n.store_id and op.operation_id=n.operation_id and op.server_revision=n.server_revision
      where n.store_id=m.store_id and n.fact_id=m.local_package_id and n.fact_type in ('packageUnit','basePackageUnit')
        and op.operation_type in ('PRODUCT_CREATED','PACKAGE_CREATED','PACKAGE_UPDATED','PACKAGE_DEACTIVATED')
      order by n.server_revision desc,n.operation_id desc limit 1
    ) kd
    where m.store_id=p_store and m.reviewed and m.active and v.reviewed and v.active and k.reviewed and k.active
      and vd.server_revision=m.local_variant_revision and kd.server_revision=m.local_package_revision
      and vd.payload->>'status'='ACTIVE' and kd.payload->>'status'='ACTIVE'
      and vd.payload->>'id'=m.local_variant_id::text and kd.payload->>'id'=m.local_package_id::text
      and kd.payload->>'productVariantId'=m.local_variant_id::text
      and kd.payload->>'conversionToBaseMicros'=k.conversion_micros::text;
$$;

-- Internal, server-facts-only sanitizer. No request body or client-provided price.
create function market_private.eligible_sources() returns setof market_private.contributions
language sql set search_path = '' as $$
  select o.observation_id,o.store_id,c.generation,o.server_revision,m.version,
    m.market_variant_id,m.market_package_id,z.id,z.version,p.currency_code,p.occurred_at,
    l.package_cost_numerator,l.package_cost_denominator,l.base_unit_cost_numerator,l.base_unit_cost_denominator
  from sync_private.price_observation_facts o
    join market_private.controls c on c.store_id=o.store_id and c.enabled
    join market_private.zones z on z.id=c.zone_id and z.version=c.zone_version and z.approved and z.active
    join public.stores s on s.id=o.store_id and s.status='ACTIVE' and s.country_code=z.country_code and s.currency_code=z.currency_code
    join sync_private.purchase_lines l on l.line_id=(o.payload->>'purchaseItemId')::uuid and l.store_id=o.store_id
    join sync_private.purchase_headers p on p.purchase_id=l.purchase_id and p.store_id=o.store_id and p.operation_id=o.operation_id
    join public.applied_sync_operations op on op.store_id=o.store_id and op.operation_id=o.operation_id
      and op.operation_type='COMPLETED_PURCHASE_CREATED' and op.server_revision=o.server_revision
    join public.app_users u on u.id=p.created_by_user_id and u.status='ACTIVE' and u.auth_subject is not null
    join public.store_members owner on owner.store_id=p.store_id and owner.user_id=u.id and owner.role='OWNER' and owner.status='ACTIVE'
    join public.devices d on d.id=p.device_id and d.store_id=p.store_id and d.user_id=u.id and d.status='ACTIVE'
    join public.store_sync_state ss on ss.store_id=p.store_id
    cross join lateral market_private.valid_mappings(o.store_id) m
    join market_private.packages k on k.id=m.market_package_id
  where (select activated from market_private.configuration)
    and m.local_variant_id=l.product_variant_id and m.local_package_id=l.package_unit_id
    and o.payload->>'productVariantId'=l.product_variant_id::text and o.payload->>'packageUnitId'=l.package_unit_id::text
    and o.payload->>'sourceId'=p.purchase_id::text and o.payload->>'storeId'=o.store_id::text
    and o.payload->>'sourceType'='RETAILER_PURCHASE' and o.payload->>'validationStatus'='VALID'
    and o.payload->'contributionConsent'='false'::jsonb and p.status='COMPLETED'
    and p.currency_code=s.currency_code and o.payload->>'currencyCode'=p.currency_code
    and o.server_revision>c.cutoff_revision and p.server_revision=o.server_revision
    and (o.payload->>'observedAt')::timestamptz=p.occurred_at and p.occurred_at>=c.enabled_at and p.occurred_at<=clock_timestamp()
    and o.observed_price_minor>0 and l.total_purchase_cost_minor>0
    and l.quantity_packages_micros>0 and l.quantity_base_micros>0
    and l.conversion_to_base_snapshot_micros=k.conversion_micros
    and l.quantity_packages_micros*k.conversion_micros=l.quantity_base_micros*1000000
    and l.package_cost_numerator>0 and l.package_cost_denominator>0 and l.base_unit_cost_numerator>0 and l.base_unit_cost_denominator>0
    and l.package_cost_numerator*l.quantity_packages_micros=l.total_purchase_cost_minor*1000000*l.package_cost_denominator
    and l.base_unit_cost_numerator*l.quantity_base_micros=l.total_purchase_cost_minor*1000000*l.base_unit_cost_denominator
    and o.payload->>'packageCostNumerator'=l.package_cost_numerator::text
    and o.payload->>'packageCostDenominator'=l.package_cost_denominator::text
    and o.payload->>'baseUnitCostNumerator'=l.base_unit_cost_numerator::text
    and o.payload->>'baseUnitCostDenominator'=l.base_unit_cost_denominator::text
    and o.payload->>'totalPurchaseCostMinor'=l.total_purchase_cost_minor::text
    and o.payload->>'quantityPackagesMicros'=l.quantity_packages_micros::text
    and o.payload->>'quantityBaseMicros'=l.quantity_base_micros::text
    and o.payload->>'conversionToBaseSnapshotMicros'=l.conversion_to_base_snapshot_micros::text;
$$;

-- All market operations take this transaction lock. Operator refresh/revocation
-- cannot race to publish or return an invalidated release. No hosted scheduler.
create function market_private.lock_market() returns void language sql
set search_path = '' as $$ select pg_catalog.pg_advisory_xact_lock(100310, 51); $$;

create function market_private.require_owner(p_store uuid, p_device uuid) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then raise exception using errcode='28000', message='Authentication required'; end if;
  perform 1 from public.stores s
    join public.store_members m on m.store_id=s.id
    join public.app_users u on u.id=m.user_id
    join public.devices d on d.store_id=s.id and d.user_id=u.id
    join public.store_sync_state ss on ss.store_id=s.id
    where s.id=p_store and s.status='ACTIVE' and m.status='ACTIVE' and m.role='OWNER'
      and u.status='ACTIVE' and u.auth_subject=auth.uid() and d.id=p_device and d.status='ACTIVE'
    for share of s,m,u,d,ss;
  if not found then raise exception using errcode='42501', message='Active owner/store/enrolled device required'; end if;
end; $$;

create function market_private.zone_json(p_zone market_private.zones) returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_object('id',p_zone.id,'name',p_zone.name,'countryCode',p_zone.country_code,
    'currencyCode',p_zone.currency_code,'version',p_zone.version);
$$;

create function market_private.state_json(p_store uuid) returns jsonb
language sql set search_path = '' as $$
  select jsonb_build_object('policyVersion',1,'storeId',s.id,'available',cfg.activated,
    'enabled',coalesce(c.enabled,false) and z.id is not null,'version',coalesce(c.version,0),'generation',coalesce(c.generation,0),
    'zone',case when z.id is null then null else market_private.zone_json(z) end,
    'enabledAt',c.enabled_at,'cutoffRevision',c.cutoff_revision,'serverTime',now(),
    'zones',(select coalesce(jsonb_agg(market_private.zone_json(q) order by q.id),'[]'::jsonb)
      from (select * from market_private.zones where approved and active
        and country_code=s.country_code and currency_code=s.currency_code order by id limit 100) q))
  from public.stores s cross join market_private.configuration cfg
  left join market_private.controls c on c.store_id=s.id
  left join market_private.zones z on z.id=c.zone_id and z.version=c.zone_version
    and z.active and z.approved and z.country_code=s.country_code and z.currency_code=s.currency_code
  where s.id=p_store;
$$;

create function public.market_state(p_request jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_store uuid := (p_request->>'storeId')::uuid; v_device uuid := (p_request->>'deviceId')::uuid;
  v_operation uuid := (p_request->>'operationId')::uuid; v_status text;
begin
  perform market_private.lock_market();
  perform market_private.require_owner(v_store,v_device);
  if jsonb_typeof(p_request)<>'object' or
    (p_request - array['storeId','deviceId','operationId']) <> '{}'::jsonb then
    raise exception using errcode='22023',message='Invalid state request';
  end if;
  select status into v_status from market_private.control_operations where store_id=v_store and operation_id=v_operation;
  return jsonb_build_object('status',coalesce(v_status,'NOT_FOUND'),'operationId',v_operation,
    'state',market_private.state_json(v_store));
end; $$;

-- Invalidation is implemented below when releases are introduced; it is called
-- within the same control transaction, never deferred to an app callback.
create function market_private.invalidate_store(p_store uuid) returns void
language plpgsql set search_path = '' as $$ begin
  update market_private.configuration set revision=revision+1 where singleton;
  delete from market_private.contributions where store_id=p_store;
  -- Conservative full tombstone avoids overlapping/differencing releases during revocation.
  update market_private.releases set payload='{"status":"INSUFFICIENT_DATA"}'::jsonb,
    revision=(select revision from market_private.configuration);
end; $$;

create function public.market_control(p_request jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_store uuid := (p_request->>'storeId')::uuid; v_device uuid := (p_request->>'deviceId')::uuid;
  v_operation uuid := (p_request->>'operationId')::uuid; v_zone uuid := (p_request->>'zoneId')::uuid;
  v_enabled boolean := (p_request->>'enabled')::boolean; v_expected bigint := (p_request->>'expectedVersion')::bigint;
  v_control market_private.controls; v_old market_private.control_operations; v_status text;
  v_hash text := encode(sha256(convert_to(p_request::text,'UTF8')),'hex'); v_cutoff bigint; v_zone_version bigint;
begin
  perform market_private.lock_market();
  perform market_private.require_owner(v_store,v_device);
  if jsonb_typeof(p_request)<>'object' or (p_request-array['storeId','deviceId','operationId','zoneId','enabled','expectedVersion','policyVersion']) <> '{}'::jsonb
    or coalesce(p_request->>'policyVersion','')<>'1' or v_operation is null or v_enabled is null
    or jsonb_typeof(p_request->'enabled')<>'boolean' or v_expected is null or v_expected<0
    or (v_enabled and v_zone is null) then raise exception using errcode='22023',message='Invalid control request'; end if;
  select * into v_old from market_private.control_operations where operation_id=v_operation;
  if found then
    if v_old.store_id<>v_store or v_old.body_hash<>v_hash or v_old.body<>p_request then
      raise exception using errcode='22023',message='Operation ID/body conflict'; end if;
    return jsonb_build_object('status',v_old.status,'operationId',v_operation,'state',market_private.state_json(v_store));
  end if;
  insert into market_private.controls(store_id) values(v_store) on conflict do nothing;
  select * into v_control from market_private.controls where store_id=v_store for update;
  if v_control.version<>v_expected then v_status := 'CONFLICT';
  elsif v_enabled and not (select activated from market_private.configuration) then v_status := 'DISABLED';
  else
    if v_enabled then
      select z.version into v_zone_version from market_private.zones z join public.stores s on s.id=v_store
        where z.id=v_zone and z.active and z.approved and z.country_code=s.country_code and z.currency_code=s.currency_code;
      if not found then raise exception using errcode='22023',message='Approved country/currency zone required'; end if;
    end if;
    select current_revision into v_cutoff from public.store_sync_state where store_id=v_store;
    perform market_private.invalidate_store(v_store);
    update market_private.controls set enabled=v_enabled,version=version+1,generation=generation+1,
      zone_id=case when v_enabled then v_zone else null end, zone_version=case when v_enabled then v_zone_version else null end,
      enabled_at=case when v_enabled then clock_timestamp() else null end,
      cutoff_revision=case when v_enabled then v_cutoff else null end where store_id=v_store;
    v_status := 'APPLIED';
  end if;
  insert into market_private.control_operations(store_id,operation_id,body_hash,body,status)
    values(v_store,v_operation,v_hash,p_request,v_status);
  return jsonb_build_object('status',v_status,'operationId',v_operation,'state',market_private.state_json(v_store));
end; $$;

create function market_private.rational_json(p_n numeric,p_d numeric) returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_object('numerator',div(p_n,gcd(p_n,p_d))::text,'denominator',div(p_d,gcd(p_n,p_d))::text);
$$;

-- Exact cross-product ranking. Never ORDER BY a rounded numeric quotient.
-- This operator-only helper is a SQL parity seam, not an app recompute endpoint.
create function market_private.aggregate_cohort(p_variant uuid,p_package uuid,p_zone uuid,p_currency text,p_now timestamptz)
returns jsonb language sql set search_path = '' as $$
  with chosen as materialized (
    select distinct on (store_id) * from market_private.contributions
    where market_variant_id=p_variant and market_package_id=p_package and zone_id=p_zone and currency_code=p_currency
      and observed_at between p_now-interval '720 hours' and p_now
    order by store_id, observed_at desc,accepted_revision desc,observation_id desc
  ), ranked as (
    select a.*,1+(select count(*) from chosen b
      where b.package_n*a.package_d<a.package_n*b.package_d or
        (b.package_n*a.package_d=a.package_n*b.package_d and b.store_id<a.store_id)) as position
    from chosen a
  ), size as (select count(*) n,max(observed_at) observed from chosen)
  select case when size.n<5 then '{"status":"INSUFFICIENT_DATA"}'::jsonb else
    jsonb_build_object('status','AVAILABLE','minimum',market_private.rational_json(lo.package_n,lo.package_d),
      'maximum',market_private.rational_json(hi.package_n,hi.package_d),
      'median',case when mod(size.n,2)=1 then market_private.rational_json(midlo.package_n,midlo.package_d) else
        market_private.rational_json(midlo.package_n*midhi.package_d+midhi.package_n*midlo.package_d,2*midlo.package_d*midhi.package_d) end,
      'observationCount',size.n,'coverage','LIMITED','windowDays',30,
      'windowStart',p_now-interval '720 hours','observedThrough',size.observed,
      'calculatedAt',p_now,'validUntil',p_now+interval '24 hours') end
  from size
    left join ranked lo on lo.position=1
    left join ranked hi on hi.position=size.n
    left join ranked midlo on midlo.position=(size.n+1)/2
    left join ranked midhi on midhi.position=size.n/2+1;
$$;

create function market_private.refresh_releases() returns bigint
language plpgsql security invoker set search_path = '' as $$
declare v_now timestamptz := clock_timestamp(); v_revision bigint; v_cohort record;
begin
  perform market_private.lock_market();
  update market_private.configuration set revision=revision+1 returning revision into v_revision;
  delete from market_private.release_members;
  delete from market_private.releases;
  delete from market_private.contributions;
  if not (select activated from market_private.configuration) then return v_revision; end if;
  -- Projection reads ONLY accepted private facts under current authority/cutoffs.
  insert into market_private.contributions select * from market_private.eligible_sources();
  for v_cohort in select distinct market_variant_id,market_package_id,zone_id,currency_code from market_private.contributions loop
    insert into market_private.releases values(v_cohort.market_variant_id,v_cohort.market_package_id,v_cohort.zone_id,v_cohort.currency_code,
      v_revision,market_private.aggregate_cohort(v_cohort.market_variant_id,v_cohort.market_package_id,v_cohort.zone_id,v_cohort.currency_code,v_now));
    insert into market_private.release_members
      select distinct on (store_id) v_revision,market_variant_id,market_package_id,zone_id,currency_code,observation_id,
        store_id,generation,mapping_version,zone_version from market_private.contributions
      where market_variant_id=v_cohort.market_variant_id and market_package_id=v_cohort.market_package_id
        and zone_id=v_cohort.zone_id and currency_code=v_cohort.currency_code and observed_at between v_now-interval '720 hours' and v_now
      order by store_id,observed_at desc,accepted_revision desc,observation_id desc;
  end loop;
  return v_revision;
end; $$;

-- Configuration/reference mutations invalidate existing numeric releases in the
-- same transaction. These operator-owned tables have no client write privileges.
create function market_private.reference_changed() returns trigger
language plpgsql set search_path = '' as $$ begin
  perform market_private.lock_market();
  perform market_private.invalidate_store(null);
  return null;
end; $$;
create function market_private.reference_version_guard() returns trigger
language plpgsql set search_path = '' as $$ begin
  if new is distinct from old and new.version<=old.version then
    raise exception using errcode='22023',message='Reference edits require a newer reviewed version'; end if;
  return new;
end; $$;
create trigger market_zone_version before update on market_private.zones
  for each row execute function market_private.reference_version_guard();
create trigger market_variant_version before update on market_private.variants
  for each row execute function market_private.reference_version_guard();
create trigger market_package_version before update on market_private.packages
  for each row execute function market_private.reference_version_guard();
create trigger market_mapping_version before update on market_private.mappings
  for each row execute function market_private.reference_version_guard();
create trigger market_zone_changed after insert or update or delete on market_private.zones
  for each statement execute function market_private.reference_changed();
create trigger market_variant_changed after insert or update or delete on market_private.variants
  for each statement execute function market_private.reference_changed();
create trigger market_package_changed after insert or update or delete on market_private.packages
  for each statement execute function market_private.reference_changed();
create trigger market_mapping_changed after insert or update or delete on market_private.mappings
  for each statement execute function market_private.reference_changed();
create trigger market_activation_changed after update of activated on market_private.configuration
  for each statement execute function market_private.reference_changed();

create function public.market_read(p_request jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_store uuid := (p_request->>'storeId')::uuid; v_device uuid := (p_request->>'deviceId')::uuid;
  v_state jsonb; v_key jsonb; v_keys jsonb := p_request->'keys'; v_m market_private.mappings;
  v_payload jsonb; v_results jsonb := '[]'::jsonb; v_base jsonb; v_currency text; v_invalid boolean;
begin
  perform market_private.lock_market();
  perform market_private.require_owner(v_store,v_device);
  if jsonb_typeof(p_request)<>'object' or p_request-array['storeId','deviceId','keys']<>'{}'::jsonb
    or v_keys is null or jsonb_typeof(v_keys)<>'array' then raise exception using errcode='22023',message='Invalid read request'; end if;
  if jsonb_array_length(v_keys) not between 1 and 100 or
    (select count(distinct value) from jsonb_array_elements(v_keys))<>jsonb_array_length(v_keys) then
    raise exception using errcode='22023',message='Read limit/duplicate keys'; end if;
  -- Invalidate, never recompute. Loss of ANY participating authority/source/mapping
  -- tombstones before assembling ANY response, preventing partial stale numerics.
  with eligible as materialized(select * from market_private.eligible_sources())
  select exists(select 1 from market_private.release_members rm join market_private.releases r
    on r.revision=rm.revision and r.market_variant_id=rm.market_variant_id and r.market_package_id=rm.market_package_id
      and r.zone_id=rm.zone_id and r.currency_code=rm.currency_code
    where r.payload->>'status'='AVAILABLE' and not exists(select 1 from eligible e where e.observation_id=rm.observation_id
      and e.store_id=rm.store_id and e.generation=rm.generation and e.mapping_version=rm.mapping_version and e.zone_version=rm.zone_version))
    into v_invalid;
  if v_invalid then perform market_private.invalidate_store(null); end if;
  v_state := market_private.state_json(v_store);
  select currency_code into v_currency from public.stores where id=v_store;
  for v_key in select value from jsonb_array_elements(v_keys) loop
    if jsonb_typeof(v_key)<>'object' or v_key-array['productVariantId','packageUnitId']<>'{}'::jsonb
      or v_key->>'productVariantId' is null or v_key->>'packageUnitId' is null then
      raise exception using errcode='22023',message='Invalid market key'; end if;
    select * into v_m from market_private.valid_mappings(v_store)
      where local_variant_id=(v_key->>'productVariantId')::uuid and local_package_id=(v_key->>'packageUnitId')::uuid;
    v_base := jsonb_build_object('key',v_key,'mappingVersion',coalesce(v_m.version,0),
      'marketVariantId',v_m.market_variant_id,'marketPackageId',v_m.market_package_id,
      'packageName',(select name from market_private.packages where id=v_m.market_package_id));
    if v_state->>'available'<>'true' or v_state->>'enabled'<>'true' or v_state->'zone'='null'::jsonb then
      v_payload := '{"status":"DISABLED"}'::jsonb;
    elsif v_m.store_id is null then v_payload := '{"status":"UNMAPPED"}'::jsonb;
    else
      select payload into v_payload from market_private.releases
        where market_variant_id=v_m.market_variant_id and market_package_id=v_m.market_package_id
          and zone_id=(v_state->'zone'->>'id')::uuid and currency_code=v_currency;
      if v_payload is null or (v_payload->>'status'='AVAILABLE' and (v_payload->>'validUntil')::timestamptz<=clock_timestamp()) then
        v_payload := '{"status":"INSUFFICIENT_DATA"}'::jsonb; end if;
    end if;
    v_results := v_results || jsonb_build_array(v_base || v_payload);
  end loop;
  return jsonb_build_object('policyVersion',1,'storeId',v_store,'controlVersion',(v_state->>'version')::bigint,
    'generation',(v_state->>'generation')::bigint,'zone',v_state->'zone','currencyCode',v_currency,
    'revision',(select revision from market_private.configuration),'serverTime',clock_timestamp(),'results',v_results);
end; $$;

alter table market_private.configuration enable row level security;
alter table market_private.zones enable row level security;
alter table market_private.controls enable row level security;
alter table market_private.control_operations enable row level security;
alter table market_private.variants enable row level security;
alter table market_private.packages enable row level security;
alter table market_private.mappings enable row level security;
alter table market_private.contributions enable row level security;
alter table market_private.releases enable row level security;
alter table market_private.release_members enable row level security;
revoke all on all tables in schema market_private from public, anon, authenticated, service_role;
revoke all on all functions in schema market_private from public, anon, authenticated, service_role;
revoke all on function public.market_state(jsonb), public.market_control(jsonb), public.market_read(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.market_state(jsonb), public.market_control(jsonb), public.market_read(jsonb) to authenticated;
commit;
