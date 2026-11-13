begin;

select plan(8);

select has_table('sync_private', 'catalogue_mutation_history', 'catalogue mutation history exists');
select has_table('sync_private', 'package_conversion_state', 'current package conversion state exists');
select has_table('sync_private', 'package_conversion_snapshots', 'immutable package snapshots exist');
select has_table('sync_private', 'owner_setting_history', 'owner setting history exists');
select has_function('sync_private', 'validate_package_mutation', array[]::name[], 'package validator exists');
select has_trigger('public', 'sync_entity_documents', 'aaa_validate_package_mutation', 'package validator trigger exists');
select has_trigger('public', 'sync_entity_documents', 'trg_project_catalogue_history', 'catalogue history trigger exists');
select has_trigger('public', 'sync_entity_documents', 'trg_project_conversion_snapshots', 'conversion snapshot trigger exists');

select * from finish();
rollback;
