begin;

select plan(9);

insert into public.app_users (id, auth_subject, display_name)
values ('11000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', 'History owner');
insert into public.stores (id, name, currency_code, timezone, created_by_user_id)
values ('31000000-0000-4000-8000-000000000001', 'History store', 'NGN', 'Africa/Lagos',
        '11000000-0000-4000-8000-000000000001');
insert into public.store_members (id, store_id, user_id, role)
values ('41000000-0000-4000-8000-000000000001', '31000000-0000-4000-8000-000000000001',
        '11000000-0000-4000-8000-000000000001', 'OWNER');
insert into public.devices (id, store_id, user_id, platform, app_version)
values ('51000000-0000-4000-8000-000000000001', '31000000-0000-4000-8000-000000000001',
        '11000000-0000-4000-8000-000000000001', 'ANDROID', 'test');
insert into public.store_sync_state (store_id)
values ('31000000-0000-4000-8000-000000000001');

create temp table history_test_result (page jsonb);
grant select, insert on history_test_result to authenticated;

set local role authenticated;
select set_config('request.jwt.claim.sub', '21000000-0000-4000-8000-000000000001', true);
select is(
  public.sync_push(jsonb_build_object(
    'protocolVersion', 1, 'payloadVersion', 1,
    'storeId', '31000000-0000-4000-8000-000000000001',
    'deviceId', '51000000-0000-4000-8000-000000000001',
    'operations', jsonb_build_array(jsonb_build_object(
      'payloadVersion', 1, 'operationType', 'PRODUCT_CREATED',
      'operationId', '61000000-0000-4000-8000-000000000001',
      'storeId', '31000000-0000-4000-8000-000000000001',
      'deviceId', '51000000-0000-4000-8000-000000000001',
      'entityType', 'STORE_PRODUCT', 'entityId', '71000000-0000-4000-8000-000000000001',
      'baseServerVersion', null, 'occurredAt', '2026-09-19T00:00:00.000Z',
      'entities', jsonb_build_object('creationMarker', 'base package and identifier')
    ))
  ))->'acks'->0->>'status', 'APPLIED', 'creation was accepted');

select is(
  public.sync_push(jsonb_build_object(
    'protocolVersion', 1, 'payloadVersion', 1,
    'storeId', '31000000-0000-4000-8000-000000000001',
    'deviceId', '51000000-0000-4000-8000-000000000001',
    'operations', jsonb_build_array(jsonb_build_object(
      'payloadVersion', 1, 'operationType', 'PRODUCT_IDENTITY_UPDATED',
      'operationId', '61000000-0000-4000-8000-000000000002',
      'storeId', '31000000-0000-4000-8000-000000000001',
      'deviceId', '51000000-0000-4000-8000-000000000001',
      'entityType', 'STORE_PRODUCT', 'entityId', '71000000-0000-4000-8000-000000000001',
      'baseServerVersion', 1, 'occurredAt', '2026-09-19T00:01:00.000Z',
      'entities', jsonb_build_object('editMarker', 'renamed')
    ))
  ))->'acks'->0->>'status', 'APPLIED', 'edit of the same entity was accepted');

insert into history_test_result (page)
select public.sync_bootstrap(jsonb_build_object(
  'protocolVersion', 1, 'payloadVersion', 1,
  'storeId', '31000000-0000-4000-8000-000000000001',
  'deviceId', '51000000-0000-4000-8000-000000000001',
  'cursor', null, 'pageSize', 1
));

select is((page->>'snapshotRevision')::integer, 2, 'first page fixes the snapshot at revision two')
from history_test_result;
select is(page->'entities'->0->>'operationId', '61000000-0000-4000-8000-000000000001',
  'first page retains the creation operation') from history_test_result;
select ok((page->>'hasMore')::boolean, 'creation page advertises another page')
from history_test_result;

select is(
  public.sync_push(jsonb_build_object(
    'protocolVersion', 1, 'payloadVersion', 1,
    'storeId', '31000000-0000-4000-8000-000000000001',
    'deviceId', '51000000-0000-4000-8000-000000000001',
    'operations', jsonb_build_array(jsonb_build_object(
      'payloadVersion', 1, 'operationType', 'PRODUCT_IDENTITY_UPDATED',
      'operationId', '61000000-0000-4000-8000-000000000003',
      'storeId', '31000000-0000-4000-8000-000000000001',
      'deviceId', '51000000-0000-4000-8000-000000000001',
      'entityType', 'STORE_PRODUCT', 'entityId', '71000000-0000-4000-8000-000000000001',
      'baseServerVersion', 2, 'occurredAt', '2026-09-19T00:02:00.000Z',
      'entities', jsonb_build_object('laterMarker', 'not in snapshot')
    ))
  ))->'acks'->0->>'status', 'APPLIED', 'a concurrent later edit was accepted');

insert into history_test_result (page)
select public.sync_bootstrap(jsonb_build_object(
  'protocolVersion', 1, 'payloadVersion', 1,
  'storeId', '31000000-0000-4000-8000-000000000001',
  'deviceId', '51000000-0000-4000-8000-000000000001',
  'cursor', (select page->'nextCursor' from history_test_result limit 1), 'pageSize', 1
));

select is(page->'entities'->0->>'operationId', '61000000-0000-4000-8000-000000000002',
  'second page retains the edit of the same entity')
from history_test_result order by (page->'entities'->0->>'serverRevision')::integer desc limit 1;
select is((page->>'snapshotRevision')::integer, 2,
  'later write does not move the snapshot')
from history_test_result order by (page->'entities'->0->>'serverRevision')::integer desc limit 1;
select ok(not (page->>'hasMore')::boolean, 'later write is excluded from the snapshot')
from history_test_result order by (page->'entities'->0->>'serverRevision')::integer desc limit 1;

select * from finish();
rollback;
