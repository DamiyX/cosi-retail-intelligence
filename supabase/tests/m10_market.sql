-- SYNTHETIC rollback-only executable boundary/parity cases. SOURCE ONLY.
-- Requires already-approved disposable PostgreSQL with M7/M8/M10 source applied.
-- Execute with psql -v ON_ERROR_STOP=1 -f supabase/tests/m10_market.sql.
-- Not a hosted migration, activation instruction or live-gate pass.
begin;
do $$ declare t record; begin
  assert not (select activated from market_private.configuration), 'Default activation must be OFF';
  assert not has_schema_privilege('authenticated','market_private','USAGE');
  assert not has_schema_privilege('anon','market_private','USAGE');
  for t in select tablename from pg_tables where schemaname='market_private' loop
    assert not has_table_privilege('authenticated',format('market_private.%I',t.tablename),'SELECT');
    assert not has_table_privilege('anon',format('market_private.%I',t.tablename),'SELECT');
    assert (select relrowsecurity from pg_class where oid=format('market_private.%I',t.tablename)::regclass);
  end loop;
  assert not has_function_privilege('anon','public.market_control(jsonb)','EXECUTE');
  assert has_function_privilege('authenticated','public.market_control(jsonb)','EXECUTE');
end $$;

insert into public.app_users(id,auth_subject,display_name) values
 ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','SYNTHETIC owner');
insert into public.stores(id,name,currency_code,country_code,timezone,created_by_user_id) values
 ('10000000-0000-4000-8000-000000000003','SYNTHETIC store','NGN','NG','UTC','10000000-0000-4000-8000-000000000001');
insert into public.store_members(id,store_id,user_id,role) values
 ('10000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','OWNER');
insert into public.devices(id,store_id,user_id,platform,app_version) values
 ('10000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','ANDROID','SYNTHETIC');
insert into public.store_sync_state(store_id,current_revision) values('10000000-0000-4000-8000-000000000003',12);
insert into market_private.zones(id,name,country_code,currency_code,region,city,version,approved,active) values
 ('10000000-0000-4000-8000-000000000006','SYNTHETIC zone','NG','NGN','SYNTHETIC region','SYNTHETIC city',1,true,true);

do $$ declare q jsonb; r jsonb; begin
  q := jsonb_build_object('storeId','10000000-0000-4000-8000-000000000003','deviceId','10000000-0000-4000-8000-000000000005',
    'operationId','10000000-0000-4000-8000-000000000007','policyVersion',1,'expectedVersion',0,'enabled',true,
    'zoneId','10000000-0000-4000-8000-000000000006');
  perform set_config('request.jwt.claim.sub','',true);
  begin perform public.market_control(q); raise exception 'Unauthenticated request accepted'; exception when invalid_authorization_specification then null; end;
  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
  r := public.market_control(q);
  assert r->>'status'='DISABLED'; assert r->'state'->>'enabled'='false';
  update market_private.configuration set activated=true;
  q := jsonb_set(q,'{operationId}','"10000000-0000-4000-8000-000000000008"');
  r := public.market_control(q);
  assert r->>'status'='APPLIED'; assert r->'state'->>'cutoffRevision'='12'; assert r->'state'->>'generation'='1';
  assert public.market_control(q)->'state'->>'version'='1', 'Retry must not increase version';
  begin perform public.market_control(jsonb_set(q,'{enabled}','false')); raise exception 'Body reuse accepted'; exception when invalid_parameter_value then null; end;
  -- Disable moves version forward; replay and delayed old enable cannot resurrect it.
  r := public.market_control(q || jsonb_build_object('operationId','10000000-0000-4000-8000-000000000009','expectedVersion',1,'enabled',false,'zoneId',null));
  assert r->'state'->>'enabled'='false';
  assert public.market_control(q)->'state'->>'enabled'='false';
  assert public.market_control(jsonb_set(q,'{operationId}','"10000000-0000-4000-8000-000000000010"'))->>'status'='CONFLICT';
  update public.app_users set status='SUSPENDED' where id='10000000-0000-4000-8000-000000000001';
  begin perform public.market_control(q); raise exception 'Suspended account accepted'; exception when insufficient_privilege then null; end;
  update public.app_users set status='ACTIVE' where id='10000000-0000-4000-8000-000000000001';
  update public.store_members set role='STAFF' where id='10000000-0000-4000-8000-000000000004';
  begin perform public.market_control(q); raise exception 'Staff accepted'; exception when insufficient_privilege then null; end;
  update public.store_members set role='OWNER' where id='10000000-0000-4000-8000-000000000004';
  update public.devices set status='REVOKED' where id='10000000-0000-4000-8000-000000000005';
  begin perform public.market_control(q); raise exception 'Revoked device accepted'; exception when insufficient_privilege then null; end;
end $$;
rollback;
