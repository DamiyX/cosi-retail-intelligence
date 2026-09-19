begin;
select plan(4);

select has_function('public', 'sync_pull', array['jsonb'], 'pull RPC exists after cursor hardening');
select has_function('public', 'sync_bootstrap', array['jsonb'], 'bootstrap RPC exists after cursor hardening');
select has_table('sync_private', 'bootstrap_audit', 'bootstrap audit table exists');
select has_index('public', 'sync_change_log', 'idx_sync_change_log_pull', 'bounded pull index exists');

select * from finish();
rollback;
