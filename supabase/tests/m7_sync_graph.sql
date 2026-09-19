begin;

select plan(13);

select has_table('sync_private', 'sale_headers', 'sale header projection exists');
select has_table('sync_private', 'sale_lines', 'sale line projection exists');
select has_table('sync_private', 'sale_payments', 'sale payment projection exists');
select has_table('sync_private', 'purchase_headers', 'purchase header projection exists');
select has_table('sync_private', 'purchase_lines', 'purchase line projection exists');
select has_table('sync_private', 'inventory_movements', 'inventory movement projection exists');
select has_table('sync_private', 'cost_facts', 'exact cost fact projection exists');
select has_table('sync_private', 'batch_facts', 'batch fact projection exists');
select has_function('sync_private', 'validate_sale_payload', array['jsonb'], 'sale validator exists');
select has_function('sync_private', 'validate_purchase_payload', array['jsonb'], 'purchase validator exists');
select has_trigger('public', 'sync_entity_documents', 'trg_project_sync_entity', 'projection trigger exists');
select ok(not has_schema_privilege('authenticated', 'sync_private', 'usage'), 'private projection schema is not client-visible');
select ok(not has_function_privilege('anon', 'sync_private.validate_sale_payload(jsonb)', 'execute'), 'anonymous role cannot invoke validators');

select * from finish();
rollback;
