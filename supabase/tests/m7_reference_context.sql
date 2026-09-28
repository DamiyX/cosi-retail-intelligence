begin;

select plan(11);

insert into public.app_users (id, auth_subject, display_name, status)
values
  ('10000000-0000-4000-8000-000000000021', '20000000-0000-4000-8000-000000000021', 'Active owner', 'ACTIVE'),
  ('10000000-0000-4000-8000-000000000022', null, 'Suspended former member', 'SUSPENDED'),
  ('10000000-0000-4000-8000-000000000023', '20000000-0000-4000-8000-000000000023', 'Other store owner', 'ACTIVE');

insert into public.stores (id, name, currency_code, country_code, timezone, created_by_user_id)
values
  ('30000000-0000-4000-8000-000000000021', 'Reference store', 'NGN', 'NG', 'Africa/Lagos', '10000000-0000-4000-8000-000000000021'),
  ('30000000-0000-4000-8000-000000000022', 'Other store', 'USD', 'US', 'America/New_York', '10000000-0000-4000-8000-000000000023');

insert into public.store_members (id, store_id, user_id, role, status)
values
  ('40000000-0000-4000-8000-000000000021', '30000000-0000-4000-8000-000000000021', '10000000-0000-4000-8000-000000000021', 'OWNER', 'ACTIVE'),
  ('40000000-0000-4000-8000-000000000022', '30000000-0000-4000-8000-000000000021', '10000000-0000-4000-8000-000000000022', 'STAFF', 'SUSPENDED'),
  ('40000000-0000-4000-8000-000000000023', '30000000-0000-4000-8000-000000000022', '10000000-0000-4000-8000-000000000023', 'OWNER', 'ACTIVE');

insert into public.devices (id, store_id, user_id, platform, app_version, status)
values
  ('50000000-0000-4000-8000-000000000021', '30000000-0000-4000-8000-000000000021', '10000000-0000-4000-8000-000000000021', 'ANDROID', 'test', 'ACTIVE'),
  ('50000000-0000-4000-8000-000000000022', '30000000-0000-4000-8000-000000000021', '10000000-0000-4000-8000-000000000022', 'ANDROID', 'old', 'REVOKED'),
  ('50000000-0000-4000-8000-000000000023', '30000000-0000-4000-8000-000000000021', '10000000-0000-4000-8000-000000000021', 'ANDROID', 'revoked owner handset', 'REVOKED'),
  ('50000000-0000-4000-8000-000000000024', '30000000-0000-4000-8000-000000000022', '10000000-0000-4000-8000-000000000023', 'ANDROID', 'other store handset', 'ACTIVE');

insert into public.store_sync_state (store_id)
values ('30000000-0000-4000-8000-000000000021');

select has_function('public', 'sync_reference_context', array['jsonb'], 'reference context RPC exists');
select ok(has_function_privilege('authenticated', 'public.sync_reference_context(jsonb)', 'execute'), 'authenticated callers can read reference context');
select ok(not has_function_privilege('anon', 'public.sync_reference_context(jsonb)', 'execute'), 'anonymous callers cannot read reference context');

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000021', true);

select is(
  public.sync_reference_context('{"protocolVersion":1,"storeId":"30000000-0000-4000-8000-000000000021","deviceId":"50000000-0000-4000-8000-000000000021"}'::jsonb)->'store'->>'countryCode',
  'NG',
  'reference context carries the authoritative store country'
);
select is(
  public.sync_reference_context('{"protocolVersion":1,"storeId":"30000000-0000-4000-8000-000000000021","deviceId":"50000000-0000-4000-8000-000000000021"}'::jsonb)->'members'->1->>'status',
  'SUSPENDED',
  'historical member status is retained in the store reference context'
);
select is(
  public.sync_reference_context('{"protocolVersion":1,"storeId":"30000000-0000-4000-8000-000000000021","deviceId":"50000000-0000-4000-8000-000000000021"}'::jsonb)->'devices'->1->>'status',
  'REVOKED',
  'revoked origin device remains available as a historical reference'
);
select is(
  public.sync_reference_context('{"protocolVersion":1,"storeId":"30000000-0000-4000-8000-000000000021","deviceId":"50000000-0000-4000-8000-000000000021"}'::jsonb)->>'protocolVersion',
  '1',
  'authenticated active member receives the protocol context'
);
select throws_ok(
  $$ select public.sync_reference_context('{"protocolVersion":1,"storeId":"30000000-0000-4000-8000-000000000022","deviceId":"50000000-0000-4000-8000-000000000024"}'::jsonb) $$,
  '42501',
  'Store membership or device authorization failed.',
  'a member cannot read another store reference context'
);

select throws_ok(
  $$ select public.sync_reference_context('{"protocolVersion":1,"storeId":"30000000-0000-4000-8000-000000000021","deviceId":"50000000-0000-4000-8000-000000000023"}'::jsonb) $$,
  '42501',
  'Store membership or device authorization failed.',
  'a revoked device cannot read reference context with its former owner session'
);
select throws_ok(
  $$ select public.sync_reference_context('{"protocolVersion":1,"storeId":"30000000-0000-4000-8000-000000000021","deviceId":"50000000-0000-4000-8000-000000000024"}'::jsonb) $$,
  '42501',
  'Store membership or device authorization failed.',
  'a registered device from another store cannot read this store reference context'
);
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000023', true);
select throws_ok(
  $$ select public.sync_reference_context('{"protocolVersion":1,"storeId":"30000000-0000-4000-8000-000000000021","deviceId":"50000000-0000-4000-8000-000000000021"}'::jsonb) $$,
  '42501',
  'Store membership or device authorization failed.',
  'an authenticated nonmember cannot read reference context with another owner device'
);

select * from finish();
rollback;
