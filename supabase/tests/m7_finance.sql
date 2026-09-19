begin;

select plan(5);

select has_table('sync_private', 'finance_fact_history', 'finance fact history exists');
select has_table('sync_private', 'bootstrap_audit', 'bootstrap audit exists');
select has_function('sync_private', 'project_finance_facts', array[], 'finance projector exists');
select has_trigger('public', 'sync_entity_documents', 'trg_project_finance_facts', 'finance projection trigger exists');
select ok(not has_schema_privilege('authenticated', 'sync_private', 'usage'), 'finance facts remain private');

select * from finish();
rollback;
