begin;

select plan(5);

select has_function('sync_private', 'validate_cost_batch_payload', array[]::name[], 'cost and batch validator exists');
select has_function('sync_private', 'rebuild_cost_fact_order', array['uuid', 'uuid'], 'deterministic cost rebuild exists');
select has_trigger('public', 'sync_entity_documents', 'aab_validate_cost_batch', 'cost/batch validation trigger exists');
select ok(not has_function_privilege('authenticated', 'sync_private.rebuild_cost_fact_order(uuid,uuid)', 'execute'), 'cost rebuild is not a client write boundary');
select ok(not has_schema_privilege('authenticated', 'sync_private', 'usage'), 'cost and batch projections remain private');

select * from finish();
rollback;
