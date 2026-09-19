-- M7-07: immutable finance projections and bootstrap audit metadata.

create table sync_private.finance_fact_history (
  store_id uuid not null references public.stores(id) on delete cascade,
  operation_id uuid not null,
  fact_type text not null check (fact_type in ('EXPENSE', 'OWNER_WITHDRAWAL')),
  fact_id uuid not null,
  server_revision bigint not null check (server_revision >= 1),
  created_by_user_id uuid not null,
  amount_minor numeric(30,0) not null check (amount_minor > 0),
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  occurred_at timestamptz not null,
  payload jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (store_id, fact_type, fact_id)
);

create index sync_private_finance_store_time
  on sync_private.finance_fact_history(store_id, occurred_at desc, fact_id);

create table sync_private.bootstrap_audit (
  store_id uuid not null references public.stores(id) on delete cascade,
  device_id uuid not null,
  bootstrap_started_at timestamptz not null,
  snapshot_revision bigint not null check (snapshot_revision >= 0),
  entity_count bigint not null check (entity_count >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (store_id, device_id, snapshot_revision)
);

alter table sync_private.finance_fact_history enable row level security;
alter table sync_private.bootstrap_audit enable row level security;
revoke all on all tables in schema sync_private from public, anon, authenticated;

create or replace function sync_private.project_finance_facts()
returns trigger
language plpgsql
security definer
set search_path = public, sync_private, auth, pg_temp
as $$
declare
  v_fact jsonb;
  v_fact_type text;
  v_revision bigint;
  v_operation_type text := new.payload->>'operationType';
begin
  if v_operation_type not in ('EXPENSE_CREATED', 'OWNER_WITHDRAWAL_CREATED') then
    return new;
  end if;
  v_fact_type := case when new.payload->'entities'->'expense' is not null then 'EXPENSE' else 'OWNER_WITHDRAWAL' end;
  v_fact := case when v_fact_type = 'EXPENSE' then new.payload->'entities'->'expense' else new.payload->'entities'->'withdrawal' end;
  select current_revision into v_revision from public.store_sync_state where store_id = new.store_id;
  insert into sync_private.finance_fact_history
    (store_id, operation_id, fact_type, fact_id, server_revision, created_by_user_id,
     amount_minor, currency_code, occurred_at, payload)
  values (
    new.store_id, new.last_operation_id, v_fact_type, (v_fact->>'id')::uuid, v_revision,
    (v_fact->>'createdByUserId')::uuid, (v_fact->>'amountMinor')::numeric,
    v_fact->>'currencyCode', (v_fact->>'occurredAt')::timestamptz, v_fact
  ) on conflict do nothing;
  return new;
end;
$$;

create trigger trg_project_finance_facts
after insert or update on public.sync_entity_documents
for each row execute function sync_private.project_finance_facts();

revoke all on function sync_private.project_finance_facts() from public, anon, authenticated;
