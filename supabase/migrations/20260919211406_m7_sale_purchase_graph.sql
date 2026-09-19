-- M7-03/M7-04: relational projections and exact graph validation.
-- The aggregate envelope remains the sync write boundary. These private
-- projections make sale, purchase, inventory, cost, and batch facts queryable
-- without allowing a client to bypass the authenticated operation path.

create table sync_private.sale_headers (
  sale_id uuid primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  operation_id uuid not null,
  server_revision bigint not null check (server_revision >= 1),
  device_id uuid not null,
  created_by_user_id uuid not null,
  occurred_at timestamptz not null,
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  subtotal_minor numeric(30,0) not null check (subtotal_minor >= 0),
  discount_total_minor numeric(30,0) not null check (discount_total_minor >= 0),
  total_minor numeric(30,0) not null check (total_minor >= 0),
  status text not null,
  payload jsonb not null
);

create table sync_private.sale_lines (
  line_id uuid primary key,
  sale_id uuid not null references sync_private.sale_headers(sale_id) on delete restrict,
  store_id uuid not null references public.stores(id) on delete cascade,
  store_product_id uuid not null,
  product_variant_id uuid not null,
  package_unit_id uuid not null,
  quantity_packages_micros numeric(30,0) not null check (quantity_packages_micros > 0),
  conversion_to_base_snapshot_micros numeric(30,0) not null check (conversion_to_base_snapshot_micros > 0),
  quantity_base_micros numeric(30,0) not null check (quantity_base_micros > 0),
  unit_price_minor numeric(30,0) not null check (unit_price_minor >= 0),
  gross_total_minor numeric(30,0) not null check (gross_total_minor >= 0),
  discount_amount_minor numeric(30,0) not null check (discount_amount_minor >= 0),
  net_total_minor numeric(30,0) not null check (net_total_minor >= 0),
  payload jsonb not null
);

create table sync_private.sale_payments (
  payment_id uuid primary key,
  sale_id uuid not null references sync_private.sale_headers(sale_id) on delete restrict,
  store_id uuid not null references public.stores(id) on delete cascade,
  method text not null,
  amount_minor numeric(30,0) not null check (amount_minor >= 0),
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  payload jsonb not null
);

create table sync_private.purchase_headers (
  purchase_id uuid primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  operation_id uuid not null,
  server_revision bigint not null check (server_revision >= 1),
  supplier_id uuid,
  created_by_user_id uuid not null,
  device_id uuid not null,
  occurred_at timestamptz not null,
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  total_amount_minor numeric(30,0) not null check (total_amount_minor >= 0),
  status text not null,
  payload jsonb not null
);

create table sync_private.purchase_lines (
  line_id uuid primary key,
  purchase_id uuid not null references sync_private.purchase_headers(purchase_id) on delete restrict,
  store_id uuid not null references public.stores(id) on delete cascade,
  store_product_id uuid not null,
  product_variant_id uuid not null,
  package_unit_id uuid not null,
  quantity_packages_micros numeric(30,0) not null check (quantity_packages_micros > 0),
  conversion_to_base_snapshot_micros numeric(30,0) not null check (conversion_to_base_snapshot_micros > 0),
  quantity_base_micros numeric(30,0) not null check (quantity_base_micros > 0),
  entered_cost_minor numeric(30,0) not null check (entered_cost_minor >= 0),
  total_purchase_cost_minor numeric(30,0) not null check (total_purchase_cost_minor >= 0),
  package_cost_numerator numeric(60,0) not null,
  package_cost_denominator numeric(60,0) not null check (package_cost_denominator > 0),
  base_unit_cost_numerator numeric(60,0) not null,
  base_unit_cost_denominator numeric(60,0) not null check (base_unit_cost_denominator > 0),
  payload jsonb not null
);

create table sync_private.inventory_movements (
  movement_id uuid primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  operation_id uuid not null,
  server_revision bigint not null check (server_revision >= 1),
  store_product_id uuid not null,
  event_type text not null,
  quantity_base_delta_micros numeric(30,0) not null,
  source_type text not null,
  source_id uuid,
  occurred_at timestamptz not null,
  payload jsonb not null
);

create table sync_private.cost_facts (
  fact_id uuid not null,
  store_id uuid not null references public.stores(id) on delete cascade,
  operation_id uuid not null,
  server_revision bigint not null check (server_revision >= 1),
  fact_type text not null check (fact_type in ('MOVEMENT', 'SALE_SNAPSHOT', 'STATE')),
  store_product_id uuid not null,
  quantity_base_micros numeric(30,0),
  value_numerator numeric(60,0),
  value_denominator numeric(60,0) check (value_denominator is null or value_denominator > 0),
  payload jsonb not null,
  primary key (store_id, fact_type, fact_id, server_revision)
);

create table sync_private.batch_facts (
  fact_id uuid not null,
  store_id uuid not null references public.stores(id) on delete cascade,
  operation_id uuid not null,
  server_revision bigint not null check (server_revision >= 1),
  fact_type text not null check (fact_type in ('GROUP', 'OPERATION', 'ENTRY', 'INSPECTION')),
  store_product_id uuid,
  quantity_base_micros numeric(30,0),
  payload jsonb not null,
  primary key (store_id, fact_type, fact_id, server_revision)
);

create table sync_private.supplier_facts (
  supplier_id uuid primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  operation_id uuid not null,
  server_revision bigint not null check (server_revision >= 1),
  payload jsonb not null
);

create table sync_private.price_observation_facts (
  observation_id uuid primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  operation_id uuid not null,
  server_revision bigint not null check (server_revision >= 1),
  observed_price_minor numeric(30,0) check (observed_price_minor is null or observed_price_minor >= 0),
  payload jsonb not null
);

create index sync_private_sale_store_time on sync_private.sale_headers(store_id, occurred_at desc, sale_id);
create index sync_private_purchase_store_time on sync_private.purchase_headers(store_id, occurred_at desc, purchase_id);
create index sync_private_inventory_store_product on sync_private.inventory_movements(store_id, store_product_id, occurred_at);
create index sync_private_batch_store_product on sync_private.batch_facts(store_id, store_product_id, fact_type);

alter table sync_private.sale_headers enable row level security;
alter table sync_private.sale_lines enable row level security;
alter table sync_private.sale_payments enable row level security;
alter table sync_private.purchase_headers enable row level security;
alter table sync_private.purchase_lines enable row level security;
alter table sync_private.inventory_movements enable row level security;
alter table sync_private.cost_facts enable row level security;
alter table sync_private.batch_facts enable row level security;
alter table sync_private.supplier_facts enable row level security;
alter table sync_private.price_observation_facts enable row level security;
revoke all on all tables in schema sync_private from public, anon, authenticated;

create or replace function sync_private.validate_sale_payload(p_payload jsonb)
returns void
language plpgsql
immutable
set search_path = public, sync_private, pg_temp
as $$
declare
  v_sale jsonb := p_payload->'entities'->'sale';
  v_items jsonb := p_payload->'entities'->'items';
  v_payment jsonb := p_payload->'entities'->'payment';
  v_item jsonb;
  v_subtotal numeric;
  v_discount numeric;
  v_total numeric;
  v_sum numeric := 0;
  v_gross numeric;
  v_item_discount numeric;
  v_net numeric;
  v_packages numeric;
  v_conversion numeric;
  v_base numeric;
begin
  if jsonb_typeof(v_sale) <> 'object' or jsonb_typeof(v_items) <> 'array' or jsonb_array_length(v_items) = 0 then
    raise exception using errcode = '22023', message = 'Completed sale payload must contain a sale and at least one item.';
  end if;
  if jsonb_typeof(v_payment) <> 'object' then
    raise exception using errcode = '22023', message = 'Completed sale payload must contain one payment.';
  end if;
  v_subtotal := (v_sale->>'subtotalMinor')::numeric;
  v_discount := (v_sale->>'discountTotalMinor')::numeric;
  v_total := (v_sale->>'totalMinor')::numeric;
  if v_subtotal < 0 or v_discount < 0 or v_total < 0 or v_total <> v_subtotal - v_discount then
    raise exception using errcode = '22023', message = 'Sale money totals are inconsistent.';
  end if;
  if (v_payment->>'amountMinor')::numeric <> v_total then
    raise exception using errcode = '22023', message = 'Payment total does not match the completed sale.';
  end if;
  for v_item in select value from jsonb_array_elements(v_items) loop
    v_gross := (v_item->>'grossTotalMinor')::numeric;
    v_item_discount := (v_item->>'discountAmountMinor')::numeric;
    v_net := (v_item->>'netTotalMinor')::numeric;
    if v_gross < 0 or v_item_discount < 0 or v_net < 0 or v_net <> v_gross - v_item_discount then
      raise exception using errcode = '22023', message = 'Sale line money totals are inconsistent.';
    end if;
    v_packages := (v_item->>'quantityPackagesMicros')::numeric;
    v_conversion := (v_item->>'conversionToBaseSnapshotMicros')::numeric;
    v_base := (v_item->>'quantityBaseMicros')::numeric;
    if v_packages <= 0 or v_conversion <= 0 or v_base <= 0
       or mod(v_packages * v_conversion, 1000000) <> 0
       or v_base <> (v_packages * v_conversion) / 1000000 then
      raise exception using errcode = '22023', message = 'Sale package conversion is not exactly representable.';
    end if;
    v_sum := v_sum + v_net;
  end loop;
  if v_sum <> v_total then
    raise exception using errcode = '22023', message = 'Sale line totals do not match the sale total.';
  end if;
  for v_item in select value from jsonb_array_elements(coalesce(p_payload->'entities'->'inventoryEvents', '[]'::jsonb)) loop
    if v_item->>'eventType' <> 'SALE' or (v_item->>'quantityBaseDeltaMicros')::numeric >= 0 then
      raise exception using errcode = '22023', message = 'Sale inventory events must be negative SALE movements.';
    end if;
  end loop;
end;
$$;

create or replace function sync_private.validate_purchase_payload(p_payload jsonb)
returns void
language plpgsql
immutable
set search_path = public, sync_private, pg_temp
as $$
declare
  v_purchase jsonb := p_payload->'entities'->'purchase';
  v_items jsonb := p_payload->'entities'->'items';
  v_item jsonb;
  v_total numeric;
  v_sum numeric := 0;
  v_packages numeric;
  v_conversion numeric;
  v_base numeric;
begin
  if jsonb_typeof(v_purchase) <> 'object' or jsonb_typeof(v_items) <> 'array' or jsonb_array_length(v_items) = 0 then
    raise exception using errcode = '22023', message = 'Completed purchase payload must contain a purchase and at least one item.';
  end if;
  v_total := (v_purchase->>'totalAmountMinor')::numeric;
  if v_total < 0 then
    raise exception using errcode = '22023', message = 'Purchase total cannot be negative.';
  end if;
  for v_item in select value from jsonb_array_elements(v_items) loop
    v_packages := (v_item->>'quantityPackagesMicros')::numeric;
    v_conversion := (v_item->>'conversionToBaseSnapshotMicros')::numeric;
    v_base := (v_item->>'quantityBaseMicros')::numeric;
    if v_packages <= 0 or v_conversion <= 0 or v_base <= 0
       or mod(v_packages * v_conversion, 1000000) <> 0
       or v_base <> (v_packages * v_conversion) / 1000000 then
      raise exception using errcode = '22023', message = 'Purchase package conversion is not exactly representable.';
    end if;
    if (v_item->>'totalPurchaseCostMinor')::numeric < 0
       or (v_item->>'packageCostDenominator')::numeric <= 0
       or (v_item->>'baseUnitCostDenominator')::numeric <= 0 then
      raise exception using errcode = '22023', message = 'Purchase cost rational is invalid.';
    end if;
    v_sum := v_sum + (v_item->>'totalPurchaseCostMinor')::numeric;
  end loop;
  if v_sum <> v_total then
    raise exception using errcode = '22023', message = 'Purchase line totals do not match the purchase total.';
  end if;
  for v_item in select value from jsonb_array_elements(coalesce(p_payload->'entities'->'inventoryEvents', '[]'::jsonb)) loop
    if v_item->>'eventType' <> 'PURCHASE' or (v_item->>'quantityBaseDeltaMicros')::numeric <= 0 then
      raise exception using errcode = '22023', message = 'Purchase inventory events must be positive PURCHASE movements.';
    end if;
  end loop;
end;
$$;

create or replace function sync_private.validate_finance_payload(p_store_id uuid, p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = public, sync_private, auth, pg_temp
as $$
declare
  v_record jsonb;
  v_user_id uuid;
  v_amount numeric;
  v_currency text;
begin
  v_record := coalesce(p_payload->'entities'->'expense', p_payload->'entities'->'withdrawal');
  if jsonb_typeof(v_record) <> 'object' then
    raise exception using errcode = '22023', message = 'Financial operation payload is missing its immutable record.';
  end if;
  v_user_id := (v_record->>'createdByUserId')::uuid;
  v_amount := (v_record->>'amountMinor')::numeric;
  v_currency := v_record->>'currencyCode';
  if v_amount <= 0 or v_currency is null or not exists (
    select 1 from public.stores s where s.id = p_store_id and s.currency_code = v_currency
  ) then
    raise exception using errcode = '22023', message = 'Financial operation amount or currency is invalid.';
  end if;
  if not exists (
    select 1 from public.store_members sm
    where sm.store_id = p_store_id and sm.user_id = v_user_id
      and sm.role = 'OWNER' and sm.status = 'ACTIVE'
  ) then
    raise exception using errcode = '42501', message = 'Only an active store owner can create money-out facts.';
  end if;
end;
$$;

create or replace function sync_private.validate_catalogue_payload(p_payload jsonb)
returns void
language plpgsql
immutable
set search_path = public, sync_private, pg_temp
as $$
declare
  v_unit jsonb;
begin
  v_unit := coalesce(p_payload->'entities'->'packageUnit', p_payload->'entities'->'basePackageUnit');
  if v_unit is not null and (v_unit->>'conversionToBaseMicros')::numeric <= 0 then
    raise exception using errcode = '22023', message = 'Package conversion must be positive.';
  end if;
end;
$$;

create or replace function sync_private.project_sync_entity()
returns trigger
language plpgsql
security definer
set search_path = public, sync_private, auth, pg_temp
as $$
declare
  v_operation_type text := new.payload->>'operationType';
  v_entities jsonb := new.payload->'entities';
  v_sale jsonb;
  v_purchase jsonb;
  v_item jsonb;
  v_event jsonb;
  v_fact jsonb;
  v_revision bigint;
  v_store_id uuid := new.store_id;
begin
  if v_operation_type = 'COMPLETED_SALE_CREATED' then
    perform sync_private.validate_sale_payload(new.payload);
    v_sale := v_entities->'sale';
    select current_revision into v_revision from public.store_sync_state where store_id = v_store_id;
    insert into sync_private.sale_headers
      (sale_id, store_id, operation_id, server_revision, device_id, created_by_user_id,
       occurred_at, currency_code, subtotal_minor, discount_total_minor, total_minor, status, payload)
    values (
      (v_sale->>'id')::uuid, v_store_id, new.last_operation_id, v_revision,
      (v_sale->>'deviceId')::uuid, (v_sale->>'createdByUserId')::uuid,
      (v_sale->>'occurredAt')::timestamptz, v_sale->>'currencyCode',
      (v_sale->>'subtotalMinor')::numeric, (v_sale->>'discountTotalMinor')::numeric,
      (v_sale->>'totalMinor')::numeric, v_sale->>'status', v_sale
    );
    for v_item in select value from jsonb_array_elements(v_entities->'items') loop
      insert into sync_private.sale_lines
        (line_id, sale_id, store_id, store_product_id, product_variant_id, package_unit_id,
         quantity_packages_micros, conversion_to_base_snapshot_micros, quantity_base_micros,
         unit_price_minor, gross_total_minor, discount_amount_minor, net_total_minor, payload)
      values (
        (v_item->>'id')::uuid, (v_sale->>'id')::uuid, v_store_id,
        (v_item->>'storeProductId')::uuid, (v_item->>'productVariantId')::uuid, (v_item->>'packageUnitId')::uuid,
        (v_item->>'quantityPackagesMicros')::numeric, (v_item->>'conversionToBaseSnapshotMicros')::numeric,
        (v_item->>'quantityBaseMicros')::numeric, (v_item->>'unitPriceMinor')::numeric,
        (v_item->>'grossTotalMinor')::numeric, (v_item->>'discountAmountMinor')::numeric,
        (v_item->>'netTotalMinor')::numeric, v_item
      );
    end loop;
    insert into sync_private.sale_payments
      (payment_id, sale_id, store_id, method, amount_minor, currency_code, payload)
    values (
      (v_entities->'payment'->>'id')::uuid, (v_sale->>'id')::uuid, v_store_id,
      v_entities->'payment'->>'method', (v_entities->'payment'->>'amountMinor')::numeric,
      v_entities->'payment'->>'currencyCode', v_entities->'payment'
    );
    for v_event in select value from jsonb_array_elements(coalesce(v_entities->'inventoryEvents', '[]'::jsonb)) loop
      insert into sync_private.inventory_movements
        (movement_id, store_id, operation_id, server_revision, store_product_id, event_type,
         quantity_base_delta_micros, source_type, source_id, occurred_at, payload)
      values (
        (v_event->>'id')::uuid, v_store_id, new.last_operation_id, v_revision,
        (v_event->>'storeProductId')::uuid, v_event->>'eventType',
        (v_event->>'quantityBaseDeltaMicros')::numeric, v_event->>'sourceType',
        nullif(v_event->>'sourceId', '')::uuid, (v_event->>'occurredAt')::timestamptz, v_event
      );
    end loop;
  elsif v_operation_type = 'COMPLETED_PURCHASE_CREATED' then
    perform sync_private.validate_purchase_payload(new.payload);
    v_purchase := v_entities->'purchase';
    select current_revision into v_revision from public.store_sync_state where store_id = v_store_id;
    insert into sync_private.purchase_headers
      (purchase_id, store_id, operation_id, server_revision, supplier_id, created_by_user_id,
       device_id, occurred_at, currency_code, total_amount_minor, status, payload)
    values (
      (v_purchase->>'id')::uuid, v_store_id, new.last_operation_id, v_revision,
      nullif(v_purchase->>'supplierId', '')::uuid, (v_purchase->>'createdByUserId')::uuid,
      (v_purchase->>'deviceId')::uuid, (v_purchase->>'occurredAt')::timestamptz,
      v_purchase->>'currencyCode', (v_purchase->>'totalAmountMinor')::numeric,
      v_purchase->>'status', v_purchase
    );
    for v_item in select value from jsonb_array_elements(v_entities->'items') loop
      insert into sync_private.purchase_lines
        (line_id, purchase_id, store_id, store_product_id, product_variant_id, package_unit_id,
         quantity_packages_micros, conversion_to_base_snapshot_micros, quantity_base_micros,
         entered_cost_minor, total_purchase_cost_minor, package_cost_numerator,
         package_cost_denominator, base_unit_cost_numerator, base_unit_cost_denominator, payload)
      values (
        (v_item->>'id')::uuid, (v_purchase->>'id')::uuid, v_store_id,
        (v_item->>'storeProductId')::uuid, (v_item->>'productVariantId')::uuid, (v_item->>'packageUnitId')::uuid,
        (v_item->>'quantityPackagesMicros')::numeric, (v_item->>'conversionToBaseSnapshotMicros')::numeric,
        (v_item->>'quantityBaseMicros')::numeric, (v_item->>'enteredCostMinor')::numeric,
        (v_item->>'totalPurchaseCostMinor')::numeric, (v_item->>'packageCostNumerator')::numeric,
        (v_item->>'packageCostDenominator')::numeric, (v_item->>'baseUnitCostNumerator')::numeric,
        (v_item->>'baseUnitCostDenominator')::numeric, v_item
      );
    end loop;
    for v_event in select value from jsonb_array_elements(coalesce(v_entities->'inventoryEvents', '[]'::jsonb)) loop
      insert into sync_private.inventory_movements
        (movement_id, store_id, operation_id, server_revision, store_product_id, event_type,
         quantity_base_delta_micros, source_type, source_id, occurred_at, payload)
      values (
        (v_event->>'id')::uuid, v_store_id, new.last_operation_id, v_revision,
        (v_event->>'storeProductId')::uuid, v_event->>'eventType',
        (v_event->>'quantityBaseDeltaMicros')::numeric, v_event->>'sourceType',
        nullif(v_event->>'sourceId', '')::uuid, (v_event->>'occurredAt')::timestamptz, v_event
      );
    end loop;
  elsif v_operation_type in ('EXPENSE_CREATED', 'OWNER_WITHDRAWAL_CREATED') then
    perform sync_private.validate_finance_payload(v_store_id, new.payload);
  elsif v_operation_type in (
    'PRODUCT_CREATED', 'PACKAGE_CREATED', 'PACKAGE_UPDATED', 'PACKAGE_DEACTIVATED'
  ) then
    perform sync_private.validate_catalogue_payload(new.payload);
  end if;
  return new;
end;
$$;

create trigger trg_project_sync_entity
before insert or update on public.sync_entity_documents
for each row execute function sync_private.project_sync_entity();

create or replace function sync_private.project_graph_facts()
returns trigger
language plpgsql
security definer
set search_path = public, sync_private, auth, pg_temp
as $$
declare
  v_key text;
  v_values jsonb;
  v_fact jsonb;
  v_fact_id text;
  v_fact_type text;
  v_revision bigint;
  v_store_product_id uuid;
  v_value jsonb;
begin
  select current_revision into v_revision from public.store_sync_state where store_id = new.store_id;
  for v_key, v_values in select e.key, e.value from jsonb_each(coalesce(new.payload->'entities', '{}'::jsonb)) e loop
    if jsonb_typeof(v_values) = 'array' then
      for v_fact in select value from jsonb_array_elements(v_values) loop
        v_fact_id := coalesce(v_fact->>'id', v_fact->>'saleItemId', v_fact->>'operationId', v_fact->>'storeProductId');
        if v_fact_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
          continue;
        end if;
        if v_key in ('costMovements', 'costSnapshots', 'costStates') then
          v_fact_type := case v_key when 'costMovements' then 'MOVEMENT' when 'costSnapshots' then 'SALE_SNAPSHOT' else 'STATE' end;
          v_store_product_id := nullif(v_fact->>'storeProductId', '')::uuid;
          v_value := case when v_key = 'costMovements' then v_fact->'value' when v_key = 'costSnapshots' then v_fact->'cogs' else v_fact->'remainingValue' end;
          insert into sync_private.cost_facts
            (fact_id, store_id, operation_id, server_revision, fact_type, store_product_id,
             quantity_base_micros, value_numerator, value_denominator, payload)
          values (
            v_fact_id::uuid, new.store_id, new.last_operation_id, v_revision, v_fact_type,
            v_store_product_id,
            nullif(coalesce(v_fact->>'quantityBaseDeltaMicros', v_fact->>'quantityBaseMicros', v_fact->>'quantityCostedBaseMicros'), '')::numeric,
            nullif(v_value->>'numerator', '')::numeric,
            nullif(v_value->>'denominator', '')::numeric,
            v_fact
          ) on conflict do nothing;
        elsif v_key in ('batchGroups', 'groups', 'batchOperations', 'operation', 'batchEntries', 'entries', 'inspection') then
          v_fact_type := case
            when v_key in ('batchGroups', 'groups') then 'GROUP'
            when v_key in ('batchOperations', 'operation') then 'OPERATION'
            when v_key in ('batchEntries', 'entries') then 'ENTRY'
            else 'INSPECTION'
          end;
          insert into sync_private.batch_facts
            (fact_id, store_id, operation_id, server_revision, fact_type, store_product_id, quantity_base_micros, payload)
          values (
            v_fact_id::uuid, new.store_id, new.last_operation_id, v_revision, v_fact_type,
            nullif(v_fact->>'storeProductId', '')::uuid,
            nullif(coalesce(v_fact->>'quantityReceivedBaseMicros', v_fact->>'deltaBaseMicros'), '')::numeric,
            v_fact
          ) on conflict do nothing;
        elsif v_key = 'supplier' then
          insert into sync_private.supplier_facts
            (supplier_id, store_id, operation_id, server_revision, payload)
          values (v_fact_id::uuid, new.store_id, new.last_operation_id, v_revision, v_fact)
          on conflict (supplier_id) do update set
            operation_id = excluded.operation_id,
            server_revision = excluded.server_revision,
            payload = excluded.payload;
        elsif v_key = 'observations' then
          insert into sync_private.price_observation_facts
            (observation_id, store_id, operation_id, server_revision, observed_price_minor, payload)
          values (
            v_fact_id::uuid, new.store_id, new.last_operation_id, v_revision,
            nullif(v_fact->>'observedPriceMinor', '')::numeric, v_fact
          ) on conflict (observation_id) do nothing;
        end if;
      end loop;
    elsif v_key = 'supplier' and jsonb_typeof(v_values) = 'object' then
      v_fact_id := v_values->>'id';
      if v_fact_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
        insert into sync_private.supplier_facts
          (supplier_id, store_id, operation_id, server_revision, payload)
        values (v_fact_id::uuid, new.store_id, new.last_operation_id, v_revision, v_values)
        on conflict (supplier_id) do update set
          operation_id = excluded.operation_id,
          server_revision = excluded.server_revision,
          payload = excluded.payload;
      end if;
    end if;
  end loop;
  return new;
end;
$$;

create trigger trg_project_sync_graph_facts
after insert or update on public.sync_entity_documents
for each row execute function sync_private.project_graph_facts();

revoke all on function sync_private.validate_sale_payload(jsonb) from public, anon, authenticated;
revoke all on function sync_private.validate_purchase_payload(jsonb) from public, anon, authenticated;
revoke all on function sync_private.validate_finance_payload(uuid, jsonb) from public, anon, authenticated;
revoke all on function sync_private.validate_catalogue_payload(jsonb) from public, anon, authenticated;
revoke all on function sync_private.project_sync_entity() from public, anon, authenticated;
revoke all on function sync_private.project_graph_facts() from public, anon, authenticated;
