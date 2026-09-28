begin;

select plan(13);

insert into public.app_users (id, auth_subject, display_name)
values
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Owner one'),
  ('10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'Owner two');

insert into public.stores (id, name, currency_code, timezone, created_by_user_id)
values (
  '30000000-0000-4000-8000-000000000001',
  'Authorization test store',
  'NGN',
  'Africa/Lagos',
  '10000000-0000-4000-8000-000000000001'
);

insert into public.store_members (id, store_id, user_id, role)
values
  (
    '40000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'OWNER'
  ),
  (
    '40000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002',
    'OWNER'
  );

insert into public.devices (id, store_id, user_id, platform, app_version)
values
  (
    '50000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'ANDROID',
    'test'
  ),
  (
    '50000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002',
    'ANDROID',
    'test'
  );

insert into public.store_sync_state (store_id)
values ('30000000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '20000000-0000-4000-8000-000000000001',
  true
);

select is(
  public.sync_push(
    '{"protocolVersion":1,"payloadVersion":1,"storeId":"30000000-0000-4000-8000-000000000001","deviceId":"50000000-0000-4000-8000-000000000001","operations":[{"payloadVersion":1,"operationType":"PRODUCT_CREATED","operationId":"60000000-0000-4000-8000-000000000001","storeId":"30000000-0000-4000-8000-000000000001","deviceId":"50000000-0000-4000-8000-000000000001","entityType":"PRODUCT_VARIANT","entityId":"70000000-0000-4000-8000-000000000001","baseServerVersion":null,"occurredAt":"2026-09-19T00:00:00.000Z","entities":{}}]}'::jsonb
  )->'acks'->0->>'status',
  'APPLIED',
  'member can push with their own active device'
);

select is(
  public.sync_push(
    '{"protocolVersion":1,"payloadVersion":1,"storeId":"30000000-0000-4000-8000-000000000001","deviceId":"50000000-0000-4000-8000-000000000001","operations":[{"payloadVersion":1,"operationType":"PRODUCT_CREATED","operationId":"60000000-0000-4000-8000-000000000001","storeId":"30000000-0000-4000-8000-000000000001","deviceId":"50000000-0000-4000-8000-000000000001","entityType":"PRODUCT_VARIANT","entityId":"70000000-0000-4000-8000-000000000001","baseServerVersion":null,"occurredAt":"2026-09-19T00:00:00.000Z","entities":{}}]}'::jsonb
  )->'acks'->0->>'status',
  'ALREADY_APPLIED',
  'identical push replay is idempotent'
);

select throws_ok(
  $$
    select public.sync_push(
      '{"protocolVersion":1,"payloadVersion":1,"storeId":"30000000-0000-4000-8000-000000000001","deviceId":"50000000-0000-4000-8000-000000000002","operations":[{"payloadVersion":1,"operationType":"PRODUCT_CREATED","operationId":"60000000-0000-4000-8000-000000000002","storeId":"30000000-0000-4000-8000-000000000001","deviceId":"50000000-0000-4000-8000-000000000002","entityType":"PRODUCT_VARIANT","entityId":"70000000-0000-4000-8000-000000000002","baseServerVersion":null,"occurredAt":"2026-09-19T00:00:00.000Z","entities":{}}]}'::jsonb
    )
  $$,
  '42501',
  'Store membership or device authorization failed.',
  'member cannot push with another member device'
);

select lives_ok(
  $$
    select public.sync_pull(
      '{"protocolVersion":1,"payloadVersion":1,"storeId":"30000000-0000-4000-8000-000000000001","deviceId":"50000000-0000-4000-8000-000000000001","cursor":{"revision":0,"changeIndex":0},"pageSize":10}'::jsonb
    )
  $$,
  'member can pull with their own active device'
);

select throws_ok(
  $$
    select public.sync_pull(
      '{"protocolVersion":1,"payloadVersion":1,"storeId":"30000000-0000-4000-8000-000000000001","deviceId":"50000000-0000-4000-8000-000000000002","cursor":{"revision":0,"changeIndex":0},"pageSize":10}'::jsonb
    )
  $$,
  '42501',
  'Store membership or device authorization failed.',
  'member cannot pull with another member device'
);

select lives_ok(
  $$
    select public.sync_bootstrap(
      '{"protocolVersion":1,"payloadVersion":1,"storeId":"30000000-0000-4000-8000-000000000001","deviceId":"50000000-0000-4000-8000-000000000001","cursor":null,"pageSize":10}'::jsonb
    )
  $$,
  'member can bootstrap with their own active device'
);

select throws_ok(
  $$
    select public.sync_bootstrap(
      '{"protocolVersion":1,"payloadVersion":1,"storeId":"30000000-0000-4000-8000-000000000001","deviceId":"50000000-0000-4000-8000-000000000002","cursor":null,"pageSize":10}'::jsonb
    )
  $$,
  '42501',
  'Store membership or device authorization failed.',
  'member cannot bootstrap with another member device'
);

set local role postgres;
update public.store_members set role = 'STAFF'
where user_id = '10000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', true);

select is(
  public.sync_push(
    '{"protocolVersion":1,"payloadVersion":1,"storeId":"30000000-0000-4000-8000-000000000001","deviceId":"50000000-0000-4000-8000-000000000002","operations":[{"payloadVersion":1,"operationType":"EXPENSE_CREATED","operationId":"60000000-0000-4000-8000-000000000003","storeId":"30000000-0000-4000-8000-000000000001","deviceId":"50000000-0000-4000-8000-000000000002","entityType":"EXPENSE","entityId":"70000000-0000-4000-8000-000000000003","baseServerVersion":null,"occurredAt":"2026-09-19T00:00:00.000Z","entities":{"expense":{"id":"70000000-0000-4000-8000-000000000003","storeId":"30000000-0000-4000-8000-000000000001","deviceId":"50000000-0000-4000-8000-000000000002","createdByUserId":"10000000-0000-4000-8000-000000000001","amountMinor":500,"currencyCode":"NGN","occurredAt":"2026-09-19T00:00:00.000Z"}}}]}'::jsonb
  )->'acks'->0->>'status',
  'REJECTED_PERMANENT',
  'staff cannot submit a money-out fact by naming the owner in its payload'
);

set local role postgres;
select is((select count(*)::integer from sync_private.finance_fact_history
  where fact_id = '70000000-0000-4000-8000-000000000003'),
  0, 'forged money-out fact leaves no finance history');

select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select is(
  public.sync_push(
    '{"protocolVersion":1,"payloadVersion":1,"storeId":"30000000-0000-4000-8000-000000000001","deviceId":"50000000-0000-4000-8000-000000000001","operations":[{"payloadVersion":1,"operationType":"EXPENSE_CREATED","operationId":"60000000-0000-4000-8000-000000000004","storeId":"30000000-0000-4000-8000-000000000001","deviceId":"50000000-0000-4000-8000-000000000001","entityType":"EXPENSE","entityId":"70000000-0000-4000-8000-000000000004","baseServerVersion":null,"occurredAt":"2026-09-19T00:00:00.000Z","entities":{"expense":{"id":"70000000-0000-4000-8000-000000000004","storeId":"30000000-0000-4000-8000-000000000001","deviceId":"50000000-0000-4000-8000-000000000001","createdByUserId":"10000000-0000-4000-8000-000000000001","amountMinor":500,"currencyCode":"NGN","occurredAt":"2026-09-19T00:00:00.000Z"}}}]}'::jsonb
  )->'acks'->0->>'status',
  'APPLIED',
  'authenticated owner can synchronize their own expense'
);
set local role postgres;
select is((select count(*)::integer from sync_private.finance_fact_history
  where fact_id = '70000000-0000-4000-8000-000000000004'),
  1, 'owner expense creates one immutable finance fact');

update public.devices set status = 'REVOKED'
where id = '50000000-0000-4000-8000-000000000001';
set local role authenticated;

select throws_ok(
  $$
    select public.sync_enroll_store(
      '{"protocolVersion":1,"storeId":"30000000-0000-4000-8000-000000000001","userId":"10000000-0000-4000-8000-000000000001","storeMemberId":"40000000-0000-4000-8000-000000000001","deviceId":"50000000-0000-4000-8000-000000000001","storeName":"Authorization test store","currencyCode":"NGN","countryCode":"NG","timezone":"Africa/Lagos","displayName":"Owner one"}'::jsonb
    )
  $$,
  '42501',
  'Revoked device cannot be re-enrolled.',
  'enrolment cannot reactivate a revoked device'
);

set local role postgres;
select is((select status from public.devices
  where id = '50000000-0000-4000-8000-000000000001'),
  'REVOKED', 'revoked device state stays revoked');

select * from finish();
rollback;
