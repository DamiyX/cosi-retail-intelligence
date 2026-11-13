-- M7 audit repair: a latest entity document is not a complete bootstrap.
-- Replay the bounded immutable change history up to one fixed store revision.
create or replace function public.sync_bootstrap(p_request jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, sync_private, pg_temp
as $$
declare
  v_auth_subject uuid := auth.uid();
  v_store_id uuid := (p_request->>'storeId')::uuid;
  v_device_id uuid := (p_request->>'deviceId')::uuid;
  v_current_revision bigint;
  v_snapshot_revision bigint;
  v_after_revision bigint := 0;
  v_after_change_index integer := 0;
  v_page_size integer := (p_request->>'pageSize')::integer;
  v_entities jsonb;
  v_last jsonb;
  v_last_revision bigint;
  v_last_change_index integer;
  v_has_more boolean := false;
  v_next_cursor jsonb := null;
begin
  if v_auth_subject is null then
    raise exception using errcode = '28000', message = 'Authenticated user is required.';
  end if;
  if coalesce((p_request->>'protocolVersion')::integer, 0) <> 1
     or coalesce((p_request->>'payloadVersion')::integer, 0) <> 1 then
    raise exception using errcode = '22023', message = 'Unsupported sync protocol or payload version.';
  end if;
  if v_page_size is null or v_page_size < 1 or v_page_size > 500 then
    raise exception using errcode = '22023', message = 'Bootstrap page size is outside the supported bounds.';
  end if;
  if not exists (
    select 1 from public.store_members sm
    join public.app_users au on au.id = sm.user_id
    join public.devices d on d.store_id = sm.store_id and d.user_id = au.id
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
  if p_request->'cursor' is null or p_request->'cursor' = 'null'::jsonb then
    v_snapshot_revision := v_current_revision;
  else
    if jsonb_typeof(p_request->'cursor') <> 'object' then
      raise exception using errcode = '22023', message = 'Bootstrap cursor is invalid.';
    end if;
    v_snapshot_revision := (p_request->'cursor'->>'snapshotRevision')::bigint;
    v_after_revision := (p_request->'cursor'->>'afterRevision')::bigint;
    v_after_change_index := (p_request->'cursor'->>'afterChangeIndex')::integer;
    if v_snapshot_revision is null or v_snapshot_revision < 0
       or v_snapshot_revision > v_current_revision
       or v_after_revision is null or v_after_revision < 0
       or v_after_revision > v_snapshot_revision
       or v_after_change_index is null or v_after_change_index < 0 then
      raise exception using errcode = '22023', message = 'Bootstrap cursor is outside the snapshot.';
    end if;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'operationId', c.operation_id,
    'storeId', c.store_id,
    'entityType', c.entity_type,
    'entityId', c.entity_id,
    'entityVersion', c.entity_version,
    'serverRevision', c.revision,
    'changeIndex', c.change_index,
    'payloadVersion', c.payload_version,
    'payload', c.payload
  ) order by c.revision, c.change_index), '[]'::jsonb)
  into v_entities
  from (
    select c.* from public.sync_change_log c
    where c.store_id = v_store_id and c.revision <= v_snapshot_revision
      and (c.revision, c.change_index) > (v_after_revision, v_after_change_index)
    order by c.revision, c.change_index
    limit v_page_size
  ) c;

  if jsonb_array_length(v_entities) > 0 then
    v_last := v_entities->(jsonb_array_length(v_entities) - 1);
    v_last_revision := (v_last->>'serverRevision')::bigint;
    v_last_change_index := (v_last->>'changeIndex')::integer;
    select exists (
      select 1 from public.sync_change_log c
      where c.store_id = v_store_id and c.revision <= v_snapshot_revision
        and (c.revision, c.change_index) > (v_last_revision, v_last_change_index)
    ) into v_has_more;
    if v_has_more then
      v_next_cursor := jsonb_build_object(
        'snapshotRevision', v_snapshot_revision,
        'afterRevision', v_last_revision,
        'afterChangeIndex', v_last_change_index
      );
    end if;
  end if;

  if p_request->'cursor' is null or p_request->'cursor' = 'null'::jsonb then
    insert into sync_private.bootstrap_audit
      (store_id, device_id, bootstrap_started_at, snapshot_revision, entity_count)
    values (
      v_store_id, v_device_id, timezone('utc', now()), v_snapshot_revision,
      (select count(*) from public.sync_change_log c
       where c.store_id = v_store_id and c.revision <= v_snapshot_revision)
    ) on conflict (store_id, device_id, snapshot_revision) do nothing;
  end if;

  return jsonb_build_object(
    'protocolVersion', 1, 'payloadVersion', 1,
    'snapshotRevision', v_snapshot_revision, 'entities', v_entities,
    'nextCursor', v_next_cursor, 'hasMore', v_has_more
  );
end;
$$;

revoke all on function public.sync_bootstrap(jsonb) from public, anon, authenticated;
grant execute on function public.sync_bootstrap(jsonb) to authenticated;
