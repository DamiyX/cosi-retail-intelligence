-- M7-08: keep bounded pull cursors and bootstrap page cursors lossless.
--
-- The original transport functions already enforce authentication and store /
-- device membership.  These replacements correct only page-boundary behavior
-- and record the bootstrap snapshot audit row created by M7-07.

create or replace function public.sync_pull(p_request jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_auth_subject uuid := auth.uid();
  v_store_id uuid := (p_request->>'storeId')::uuid;
  v_device_id uuid := (p_request->>'deviceId')::uuid;
  v_cursor_revision bigint := coalesce((p_request->'cursor'->>'revision')::bigint, 0);
  v_cursor_index integer := coalesce((p_request->'cursor'->>'changeIndex')::integer, 0);
  v_page_size integer := least(greatest(coalesce((p_request->>'pageSize')::integer, 1), 1), 100);
  v_server_revision bigint;
  v_next_revision bigint;
  v_next_index integer;
  v_changes jsonb;
  v_has_more boolean;
begin
  if v_auth_subject is null then
    raise exception using errcode = '28000', message = 'Authenticated user is required.';
  end if;
  if coalesce((p_request->>'protocolVersion')::integer, 0) <> 1
     or coalesce((p_request->>'payloadVersion')::integer, 0) <> 1 then
    raise exception using errcode = '22023', message = 'Unsupported sync protocol or payload version.';
  end if;
  if not exists (
    select 1 from public.store_members sm
    join public.app_users au on au.id = sm.user_id
    join public.devices d on d.store_id = sm.store_id
    where sm.store_id = v_store_id and sm.status = 'ACTIVE' and au.status = 'ACTIVE'
      and au.auth_subject = v_auth_subject and d.id = v_device_id and d.status = 'ACTIVE'
  ) then
    raise exception using errcode = '42501', message = 'Store membership or device authorization failed.';
  end if;

  select current_revision into v_server_revision
  from public.store_sync_state where store_id = v_store_id for share;
  if v_server_revision is null then
    raise exception using errcode = '22023', message = 'Store is not enrolled for sync.';
  end if;
  if v_cursor_revision < 0 or v_cursor_index < 0 then
    raise exception using errcode = '22023', message = 'Sync cursor cannot be negative.';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
      'operationId', c.operation_id,
      'storeId', c.store_id,
      'entityType', c.entity_type,
      'entityId', c.entity_id,
      'operationType', c.operation_type,
      'changeType', c.change_type,
      'payloadVersion', c.payload_version,
      'payload', c.payload,
      'entityVersion', c.entity_version,
      'serverRevision', c.revision,
      'occurredAt', c.occurred_at
    ) order by c.revision, c.change_index), '[]'::jsonb)
    into v_changes
  from (
    select c.* from public.sync_change_log c
    where c.store_id = v_store_id
      and (c.revision > v_cursor_revision or (c.revision = v_cursor_revision and c.change_index > v_cursor_index))
    order by c.revision, c.change_index
    limit v_page_size
  ) c;

  -- Re-run the same bounded page and take its final row.  Taking the final
  -- row from the entire change log would jump over changes after this page.
  select c.revision, c.change_index into v_next_revision, v_next_index
  from (
    select c.revision, c.change_index from public.sync_change_log c
    where c.store_id = v_store_id
      and (c.revision > v_cursor_revision or (c.revision = v_cursor_revision and c.change_index > v_cursor_index))
    order by c.revision, c.change_index
    limit v_page_size
  ) c
  order by c.revision desc, c.change_index desc
  limit 1;
  if v_next_revision is null then
    v_next_revision := v_cursor_revision;
    v_next_index := v_cursor_index;
  end if;

  select exists (
    select 1 from public.sync_change_log c
    where c.store_id = v_store_id
      and (c.revision > v_next_revision or (c.revision = v_next_revision and c.change_index > v_next_index))
  ) into v_has_more;

  return jsonb_build_object(
    'protocolVersion', 1, 'payloadVersion', 1, 'changes', v_changes,
    'nextCursor', jsonb_build_object('revision', v_next_revision, 'changeIndex', v_next_index),
    'hasMore', coalesce(v_has_more, false), 'serverRevision', v_server_revision
  );
end;
$$;

create or replace function public.sync_bootstrap(p_request jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_auth_subject uuid := auth.uid();
  v_store_id uuid := (p_request->>'storeId')::uuid;
  v_device_id uuid := (p_request->>'deviceId')::uuid;
  v_current_revision bigint;
  v_snapshot_revision bigint;
  v_after_type text;
  v_after_id uuid;
  v_page_size integer := least(greatest(coalesce((p_request->>'pageSize')::integer, 1), 1), 500);
  v_entities jsonb;
  v_last_type text;
  v_last_id uuid;
  v_has_more boolean;
  v_next_cursor jsonb;
  v_entity_count bigint;
  v_is_continuation boolean := false;
begin
  if v_auth_subject is null then
    raise exception using errcode = '28000', message = 'Authenticated user is required.';
  end if;
  if coalesce((p_request->>'protocolVersion')::integer, 0) <> 1
     or coalesce((p_request->>'payloadVersion')::integer, 0) <> 1 then
    raise exception using errcode = '22023', message = 'Unsupported sync protocol or payload version.';
  end if;
  if not exists (
    select 1 from public.store_members sm
    join public.app_users au on au.id = sm.user_id
    join public.devices d on d.store_id = sm.store_id
    where sm.store_id = v_store_id and sm.status = 'ACTIVE' and au.status = 'ACTIVE'
      and au.auth_subject = v_auth_subject and d.id = v_device_id and d.status = 'ACTIVE'
  ) then
    raise exception using errcode = '42501', message = 'Store membership or device authorization failed.';
  end if;

  select current_revision into v_current_revision
  from public.store_sync_state where store_id = v_store_id for share;
  if v_current_revision is null then
    raise exception using errcode = '22023', message = 'Store is not enrolled for sync.';
  end if;
  if p_request->'cursor' is not null and jsonb_typeof(p_request->'cursor') = 'object' then
    v_is_continuation := true;
    v_snapshot_revision := (p_request->'cursor'->>'snapshotRevision')::bigint;
    v_after_type := p_request->'cursor'->>'afterEntityType';
    v_after_id := (p_request->'cursor'->>'afterEntityId')::uuid;
    if v_snapshot_revision is null or v_snapshot_revision < 0 or v_snapshot_revision > v_current_revision then
      raise exception using errcode = '22023', message = 'Bootstrap snapshot revision is invalid.';
    end if;
  else
    v_snapshot_revision := v_current_revision;
  end if;

  if not v_is_continuation then
    with latest as (
      select distinct on (h.store_id, h.entity_type, h.entity_id)
        h.store_id, h.entity_type, h.entity_id
      from public.sync_entity_document_history h
      where h.store_id = v_store_id and h.server_revision <= v_snapshot_revision
      order by h.store_id, h.entity_type, h.entity_id, h.server_revision desc
    )
    select count(*) into v_entity_count from latest;
    insert into sync_private.bootstrap_audit
      (store_id, device_id, bootstrap_started_at, snapshot_revision, entity_count)
    values (v_store_id, v_device_id, timezone('utc', now()), v_snapshot_revision, v_entity_count)
    on conflict (store_id, device_id, snapshot_revision) do nothing;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
      'storeId', q.store_id, 'entityType', q.entity_type, 'entityId', q.entity_id,
      'entityVersion', q.server_version, 'payloadVersion', 1, 'payload', q.payload
    ) order by q.entity_type, q.entity_id), '[]'::jsonb)
    into v_entities
  from (
    with latest as (
      select distinct on (h.store_id, h.entity_type, h.entity_id)
        h.store_id, h.entity_type, h.entity_id, h.server_version, h.payload
      from public.sync_entity_document_history h
      where h.store_id = v_store_id and h.server_revision <= v_snapshot_revision
      order by h.store_id, h.entity_type, h.entity_id, h.server_revision desc
    )
    select l.* from latest l
    where v_after_type is null or (l.entity_type, l.entity_id::text) > (v_after_type, v_after_id::text)
    order by l.entity_type, l.entity_id
    limit v_page_size
  ) q;

  -- The endpoint must be the last row of the same ascending page returned
  -- above, not the last row of the whole remaining snapshot.
  select q.entity_type, q.entity_id into v_last_type, v_last_id
  from (
    with latest as (
      select distinct on (h.store_id, h.entity_type, h.entity_id)
        h.store_id, h.entity_type, h.entity_id
      from public.sync_entity_document_history h
      where h.store_id = v_store_id and h.server_revision <= v_snapshot_revision
      order by h.store_id, h.entity_type, h.entity_id, h.server_revision desc
    )
    select l.* from latest l
    where v_after_type is null or (l.entity_type, l.entity_id::text) > (v_after_type, v_after_id::text)
    order by l.entity_type, l.entity_id
    limit v_page_size
  ) q
  order by q.entity_type desc, q.entity_id desc
  limit 1;

  if v_last_type is null then
    v_has_more := false;
    v_next_cursor := null;
  else
    with latest as (
      select distinct on (h.store_id, h.entity_type, h.entity_id)
        h.store_id, h.entity_type, h.entity_id
      from public.sync_entity_document_history h
      where h.store_id = v_store_id and h.server_revision <= v_snapshot_revision
      order by h.store_id, h.entity_type, h.entity_id, h.server_revision desc
    )
    select exists (
      select 1 from latest l
      where (l.entity_type, l.entity_id::text) > (v_last_type, v_last_id::text)
    ) into v_has_more;
    v_next_cursor := case when v_has_more then jsonb_build_object(
      'snapshotRevision', v_snapshot_revision, 'afterEntityType', v_last_type, 'afterEntityId', v_last_id
    ) else null end;
  end if;

  return jsonb_build_object(
    'protocolVersion', 1, 'payloadVersion', 1,
    'snapshotRevision', v_snapshot_revision, 'entities', v_entities,
    'nextCursor', v_next_cursor, 'hasMore', coalesce(v_has_more, false)
  );
end;
$$;

revoke all on function public.sync_pull(jsonb) from public, anon, authenticated;
revoke all on function public.sync_bootstrap(jsonb) from public, anon, authenticated;
grant execute on function public.sync_pull(jsonb) to authenticated;
grant execute on function public.sync_bootstrap(jsonb) to authenticated;
