begin;

select plan(18);

select has_table('public', 'app_users', 'auth subject mapping table exists');
select has_table('public', 'stores', 'store table exists');
select has_table('public', 'store_members', 'membership table exists');
select has_table('public', 'devices', 'device table exists');
select has_table('public', 'store_sync_state', 'per-store revision table exists');
select has_table('public', 'applied_sync_operations', 'idempotency table exists');
select has_table('public', 'sync_change_log', 'change log exists');
select has_table('public', 'sync_entity_document_history', 'bootstrap history exists');
select has_table('public', 'sync_normalized_facts', 'normalized fact foundation exists');

select has_function('public', 'sync_enroll_store', array['jsonb'], 'enrollment RPC exists');
select has_function('public', 'sync_push', array['jsonb'], 'push RPC exists');
select has_function('public', 'sync_pull', array['jsonb'], 'pull RPC exists');
select has_function('public', 'sync_bootstrap', array['jsonb'], 'bootstrap RPC exists');

select is_rls_enabled('public', 'stores', 'stores have RLS enabled');
select is_rls_enabled('public', 'store_members', 'memberships have RLS enabled');
select is_rls_enabled('public', 'sync_change_log', 'change log has RLS enabled');

select ok(
  not has_table_privilege('anon', 'public.sync_change_log', 'select'),
  'anonymous role cannot read the change log'
);
select ok(
  has_function_privilege('authenticated', 'public.sync_push(jsonb)', 'execute'),
  'authenticated role can call the push boundary'
);

select * from finish();
rollback;
