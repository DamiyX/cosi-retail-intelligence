begin;

select plan(6);

select has_table('sync_private', 'm5_fact_history', 'M5 append-only fact history exists');
select has_function('sync_private', 'validate_m5_payload', array['jsonb'], 'M5 validator exists');
select has_function('sync_private', 'project_m5_facts', array[]::name[], 'M5 projector exists');
select has_trigger('public', 'sync_entity_documents', 'aaa_validate_m5_payload', 'M5 validation trigger exists');
select has_trigger('public', 'sync_entity_documents', 'trg_project_m5_facts', 'M5 fact projector exists');
select ok(not has_schema_privilege('authenticated', 'sync_private', 'usage'), 'M5 facts remain private');

select * from finish();
rollback;
