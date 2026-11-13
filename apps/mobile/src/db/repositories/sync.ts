import { DomainError } from '@retail/domain';

import type { DatabaseAdapter } from '../adapter';
import { nowIso, requireId } from './common';

export type SyncStoreStatus =
  | 'UNINITIALIZED'
  | 'BOOTSTRAPPING'
  | 'IDLE'
  | 'RUNNING'
  | 'PAUSED_AUTH'
  | 'ERROR_RETRYABLE';

export type SyncBootstrapStatus = 'IN_PROGRESS' | 'COMMITTED' | 'FAILED';
export type SyncConflictType = 'STALE_VERSION' | 'IMMUTABLE_ID_REUSE' | 'SERVER_REJECTED';
export type SyncConflictStatus = 'OPEN' | 'RESOLVED';

export interface SyncStoreStateRow {
  storeId: string;
  deviceId: string;
  status: SyncStoreStatus;
  cursorRevision: number;
  cursorChangeIndex: number;
  serverRevision: number;
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  updatedAt: string;
}

export interface SyncBootstrapStateRow {
  storeId: string;
  deviceId: string;
  bootstrapId: string;
  status: SyncBootstrapStatus;
  snapshotRevision: number | null;
  snapshotCursorRevision: number;
  snapshotCursorChangeIndex: number;
  snapshotAfterEntityType: string | null;
  snapshotAfterEntityId: string | null;
  startedAt: string;
  updatedAt: string;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
}

export interface SyncEntityVersionRow {
  storeId: string;
  entityType: string;
  entityId: string;
  serverVersion: number;
  serverRevision: number;
  updatedAt: string;
}

export interface SyncBootstrapEntityRow {
  storeId: string;
  bootstrapId: string;
  snapshotRevision: number;
  serverRevision: number;
  changeIndex: number;
  operationId: string;
  entityType: string;
  entityId: string;
  entityVersion: number;
  payload: string;
}

export interface SyncConflictRow {
  id: string;
  storeId: string;
  operationId: string;
  entityType: string;
  entityId: string;
  conflictType: SyncConflictType;
  localPayload: string;
  serverPayload: string | null;
  serverVersion: number | null;
  serverRevision: number | null;
  status: SyncConflictStatus;
  resolution: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

type Row = Record<string, string | number | null>;

function mapStoreState(row: Row): SyncStoreStateRow {
  return {
    storeId: row.store_id as string,
    deviceId: row.device_id as string,
    status: row.status as SyncStoreStatus,
    cursorRevision: row.cursor_revision as number,
    cursorChangeIndex: row.cursor_change_index as number,
    serverRevision: row.server_revision as number,
    lastAttemptAt: (row.last_attempt_at as string | null) ?? null,
    lastSuccessAt: (row.last_success_at as string | null) ?? null,
    lastErrorCode: (row.last_error_code as string | null) ?? null,
    lastErrorMessage: (row.last_error_message as string | null) ?? null,
    updatedAt: row.updated_at as string,
  };
}

function mapBootstrapState(row: Row): SyncBootstrapStateRow {
  return {
    storeId: row.store_id as string,
    deviceId: row.device_id as string,
    bootstrapId: row.bootstrap_id as string,
    status: row.status as SyncBootstrapStatus,
    snapshotRevision: (row.snapshot_revision as number | null) ?? null,
    snapshotCursorRevision: row.snapshot_cursor_revision as number,
    snapshotCursorChangeIndex: row.snapshot_cursor_change_index as number,
    snapshotAfterEntityType: (row.snapshot_after_entity_type as string | null) ?? null,
    snapshotAfterEntityId: (row.snapshot_after_entity_id as string | null) ?? null,
    startedAt: row.started_at as string,
    updatedAt: row.updated_at as string,
    lastErrorCode: (row.last_error_code as string | null) ?? null,
    lastErrorMessage: (row.last_error_message as string | null) ?? null,
  };
}

function mapEntityVersion(row: Row): SyncEntityVersionRow {
  return {
    storeId: row.store_id as string,
    entityType: row.entity_type as string,
    entityId: row.entity_id as string,
    serverVersion: row.server_version as number,
    serverRevision: row.server_revision as number,
    updatedAt: row.updated_at as string,
  };
}

function mapBootstrapEntity(row: Row): SyncBootstrapEntityRow {
  return {
    storeId: row.store_id as string,
    bootstrapId: row.bootstrap_id as string,
    snapshotRevision: row.snapshot_revision as number,
    serverRevision: row.server_revision as number,
    changeIndex: row.change_index as number,
    operationId: row.operation_id as string,
    entityType: row.entity_type as string,
    entityId: row.entity_id as string,
    entityVersion: row.entity_version as number,
    payload: row.payload as string,
  };
}

function mapConflict(row: Row): SyncConflictRow {
  return {
    id: row.id as string,
    storeId: row.store_id as string,
    operationId: row.operation_id as string,
    entityType: row.entity_type as string,
    entityId: row.entity_id as string,
    conflictType: row.conflict_type as SyncConflictType,
    localPayload: row.local_payload as string,
    serverPayload: (row.server_payload as string | null) ?? null,
    serverVersion: (row.server_version as number | null) ?? null,
    serverRevision: (row.server_revision as number | null) ?? null,
    status: row.status as SyncConflictStatus,
    resolution: (row.resolution as string | null) ?? null,
    createdAt: row.created_at as string,
    resolvedAt: (row.resolved_at as string | null) ?? null,
  };
}

const STORE_STATE_COLUMNS =
  'store_id, device_id, status, cursor_revision, cursor_change_index, server_revision, ' +
  'last_attempt_at, last_success_at, last_error_code, last_error_message, updated_at';

export interface EnsureSyncStoreStateInput {
  storeId: string;
  deviceId: string;
  now?: string;
}

export function ensureSyncStoreState(
  adapter: DatabaseAdapter,
  input: EnsureSyncStoreStateInput,
): SyncStoreStateRow {
  const now = input.now ?? nowIso();
  adapter.run(
    `INSERT INTO sync_store_state
      (store_id, device_id, status, cursor_revision, cursor_change_index,
       server_revision, updated_at)
     VALUES (?, ?, 'UNINITIALIZED', 0, 0, 0, ?)
     ON CONFLICT(store_id) DO UPDATE SET device_id = excluded.device_id, updated_at = excluded.updated_at;`,
    [requireId(input.storeId), requireId(input.deviceId), now],
  );
  const state = getSyncStoreState(adapter, input.storeId);
  if (!state) {
    throw new Error('Sync store state was not persisted.');
  }
  return state;
}

export function getSyncStoreState(adapter: DatabaseAdapter, storeId: string): SyncStoreStateRow | null {
  const row = adapter.getFirstRow<Row>(
    `SELECT ${STORE_STATE_COLUMNS} FROM sync_store_state WHERE store_id = ?;`,
    [requireId(storeId)],
  );
  return row ? mapStoreState(row) : null;
}

export interface UpdateSyncStoreStateInput {
  storeId: string;
  status?: SyncStoreStatus;
  cursorRevision?: number;
  cursorChangeIndex?: number;
  serverRevision?: number;
  lastAttemptAt?: string | null;
  lastSuccessAt?: string | null;
  lastErrorCode?: string | null;
  lastErrorMessage?: string | null;
  updatedAt?: string;
}

export function updateSyncStoreState(
  adapter: DatabaseAdapter,
  input: UpdateSyncStoreStateInput,
): SyncStoreStateRow {
  const assignments: string[] = [];
  const params: (string | number | null)[] = [];
  const add = (column: string, value: string | number | null | undefined): void => {
    if (value !== undefined) {
      assignments.push(`${column} = ?`);
      params.push(value);
    }
  };
  add('status', input.status);
  add('cursor_revision', input.cursorRevision);
  add('cursor_change_index', input.cursorChangeIndex);
  add('server_revision', input.serverRevision);
  add('last_attempt_at', input.lastAttemptAt);
  add('last_success_at', input.lastSuccessAt);
  add('last_error_code', input.lastErrorCode);
  add('last_error_message', input.lastErrorMessage);
  add('updated_at', input.updatedAt ?? nowIso());
  if (assignments.length === 0) {
    throw new DomainError('INVALID_VALUE', 'Sync state update requires at least one field.');
  }
  adapter.run(
    `UPDATE sync_store_state SET ${assignments.join(', ')} WHERE store_id = ?;`,
    [...params, requireId(input.storeId)],
  );
  const state = getSyncStoreState(adapter, input.storeId);
  if (!state) {
    throw new Error('Sync store state does not exist.');
  }
  return state;
}

const BOOTSTRAP_STATE_COLUMNS =
  'store_id, device_id, bootstrap_id, status, snapshot_revision, snapshot_cursor_revision, ' +
  'snapshot_cursor_change_index, snapshot_after_entity_type, snapshot_after_entity_id, ' +
  'started_at, updated_at, last_error_code, last_error_message';

export function getSyncBootstrapState(
  adapter: DatabaseAdapter,
  storeId: string,
): SyncBootstrapStateRow | null {
  const row = adapter.getFirstRow<Row>(
    `SELECT ${BOOTSTRAP_STATE_COLUMNS} FROM sync_bootstrap_state WHERE store_id = ?;`,
    [requireId(storeId)],
  );
  return row ? mapBootstrapState(row) : null;
}

export interface BeginSyncBootstrapInput {
  storeId: string;
  deviceId: string;
  bootstrapId: string;
  startedAt?: string;
}

export function beginSyncBootstrap(
  adapter: DatabaseAdapter,
  input: BeginSyncBootstrapInput,
): SyncBootstrapStateRow {
  const startedAt = input.startedAt ?? nowIso();
  adapter.transaction(() => {
    adapter.run('DELETE FROM sync_bootstrap_entities WHERE store_id = ?;', [requireId(input.storeId)]);
    adapter.run('DELETE FROM sync_bootstrap_operations WHERE store_id = ?;', [requireId(input.storeId)]);
    adapter.run(
      `INSERT INTO sync_bootstrap_state
        (store_id, device_id, bootstrap_id, status, started_at, updated_at)
       VALUES (?, ?, ?, 'IN_PROGRESS', ?, ?)
       ON CONFLICT(store_id) DO UPDATE SET
         device_id = excluded.device_id,
         bootstrap_id = excluded.bootstrap_id,
         status = 'IN_PROGRESS',
         snapshot_revision = NULL,
         snapshot_cursor_revision = 0,
         snapshot_cursor_change_index = 0,
         snapshot_after_entity_type = NULL,
         snapshot_after_entity_id = NULL,
         started_at = excluded.started_at,
         updated_at = excluded.updated_at,
         last_error_code = NULL,
         last_error_message = NULL;`,
      [requireId(input.storeId), requireId(input.deviceId), requireId(input.bootstrapId), startedAt, startedAt],
    );
    updateSyncStoreState(adapter, {
      storeId: input.storeId,
      status: 'BOOTSTRAPPING',
      updatedAt: startedAt,
    });
  });
  const state = getSyncBootstrapState(adapter, input.storeId);
  if (!state) {
    throw new Error('Sync bootstrap state was not persisted.');
  }
  return state;
}

export function stageSyncBootstrapEntity(
  adapter: DatabaseAdapter,
  input: SyncBootstrapEntityRow,
): void {
  adapter.run(
    `INSERT INTO sync_bootstrap_operations
      (store_id, bootstrap_id, snapshot_revision, server_revision, change_index,
       operation_id, entity_type, entity_id, entity_version, payload)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(store_id, bootstrap_id, server_revision, change_index) DO UPDATE SET
       snapshot_revision = excluded.snapshot_revision,
       operation_id = excluded.operation_id,
       entity_type = excluded.entity_type,
       entity_id = excluded.entity_id,
       entity_version = excluded.entity_version,
       payload = excluded.payload;`,
    [
      requireId(input.storeId),
      requireId(input.bootstrapId),
      input.snapshotRevision,
      input.serverRevision,
      input.changeIndex,
      requireId(input.operationId),
      input.entityType,
      requireId(input.entityId),
      input.entityVersion,
      input.payload,
    ],
  );
}

export function listSyncBootstrapEntities(
  adapter: DatabaseAdapter,
  input: { storeId: string; bootstrapId: string },
): SyncBootstrapEntityRow[] {
  return adapter.getAllRows<Row>(
    `SELECT store_id, bootstrap_id, snapshot_revision, server_revision, change_index,
            operation_id, entity_type, entity_id, entity_version, payload
     FROM sync_bootstrap_operations
     WHERE store_id = ? AND bootstrap_id = ?
     ORDER BY server_revision ASC, change_index ASC;`,
    [requireId(input.storeId), requireId(input.bootstrapId)],
  ).map(mapBootstrapEntity);
}

export function clearSyncBootstrapEntities(
  adapter: DatabaseAdapter,
  input: { storeId: string; bootstrapId: string },
): void {
  adapter.run(
    'DELETE FROM sync_bootstrap_operations WHERE store_id = ? AND bootstrap_id = ?;',
    [requireId(input.storeId), requireId(input.bootstrapId)],
  );
}

export function commitSyncBootstrap(
  adapter: DatabaseAdapter,
  input: {
    storeId: string;
    snapshotRevision: number;
    cursorRevision: number;
    cursorChangeIndex: number;
    updatedAt?: string;
  },
): void {
  const updatedAt = input.updatedAt ?? nowIso();
  adapter.run(
    `UPDATE sync_bootstrap_state
     SET status = 'COMMITTED', snapshot_revision = ?, snapshot_cursor_revision = ?,
         snapshot_cursor_change_index = ?, snapshot_after_entity_type = NULL,
         snapshot_after_entity_id = NULL, updated_at = ?, last_error_code = NULL,
         last_error_message = NULL
     WHERE store_id = ? AND status = 'IN_PROGRESS';`,
    [
      input.snapshotRevision,
      input.cursorRevision,
      input.cursorChangeIndex,
      updatedAt,
      requireId(input.storeId),
    ],
  );
  updateSyncStoreState(adapter, {
    storeId: input.storeId,
    status: 'IDLE',
    cursorRevision: input.cursorRevision,
    cursorChangeIndex: input.cursorChangeIndex,
    serverRevision: input.snapshotRevision,
    lastSuccessAt: updatedAt,
    lastErrorCode: null,
    lastErrorMessage: null,
    updatedAt,
  });
}

export function advanceSyncBootstrap(
  adapter: DatabaseAdapter,
  input: {
    storeId: string;
    snapshotRevision: number;
    afterRevision: number;
    afterChangeIndex: number;
    updatedAt?: string;
  },
): void {
  const updatedAt = input.updatedAt ?? nowIso();
  adapter.run(
    `UPDATE sync_bootstrap_state
     SET snapshot_revision = ?, snapshot_cursor_revision = ?,
         snapshot_cursor_change_index = ?, snapshot_after_entity_type = NULL,
         snapshot_after_entity_id = NULL, updated_at = ?
     WHERE store_id = ? AND status = 'IN_PROGRESS';`,
    [
      input.snapshotRevision,
      input.afterRevision,
      input.afterChangeIndex,
      updatedAt,
      requireId(input.storeId),
    ],
  );
}

export function failSyncBootstrap(
  adapter: DatabaseAdapter,
  input: {
    storeId: string;
    errorCode: string;
    errorMessage: string;
    storeStatus?: SyncStoreStatus;
    updatedAt?: string;
  },
): void {
  const updatedAt = input.updatedAt ?? nowIso();
  adapter.run(
    `UPDATE sync_bootstrap_state SET status = 'FAILED', updated_at = ?,
       last_error_code = ?, last_error_message = ? WHERE store_id = ?;`,
    [updatedAt, input.errorCode, input.errorMessage, requireId(input.storeId)],
  );
  updateSyncStoreState(adapter, {
    storeId: input.storeId,
    status: input.storeStatus ?? 'ERROR_RETRYABLE',
    lastErrorCode: input.errorCode,
    lastErrorMessage: input.errorMessage,
    updatedAt,
  });
}

const ENTITY_VERSION_COLUMNS =
  'store_id, entity_type, entity_id, server_version, server_revision, updated_at';

export function getSyncEntityVersion(
  adapter: DatabaseAdapter,
  input: { storeId: string; entityType: string; entityId: string },
): SyncEntityVersionRow | null {
  const row = adapter.getFirstRow<Row>(
    `SELECT ${ENTITY_VERSION_COLUMNS} FROM sync_entity_versions
     WHERE store_id = ? AND entity_type = ? AND entity_id = ?;`,
    [requireId(input.storeId), input.entityType, requireId(input.entityId)],
  );
  return row ? mapEntityVersion(row) : null;
}

export function saveSyncEntityVersion(
  adapter: DatabaseAdapter,
  input: {
    storeId: string;
    entityType: string;
    entityId: string;
    serverVersion: number;
    serverRevision: number;
    updatedAt?: string;
  },
): SyncEntityVersionRow {
  const updatedAt = input.updatedAt ?? nowIso();
  adapter.run(
    `INSERT INTO sync_entity_versions
      (store_id, entity_type, entity_id, server_version, server_revision, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(store_id, entity_type, entity_id) DO UPDATE SET
       server_version = excluded.server_version,
       server_revision = excluded.server_revision,
       updated_at = excluded.updated_at;`,
    [
      requireId(input.storeId),
      input.entityType,
      requireId(input.entityId),
      input.serverVersion,
      input.serverRevision,
      updatedAt,
    ],
  );
  const row = getSyncEntityVersion(adapter, input);
  if (!row) {
    throw new Error('Sync entity version was not persisted.');
  }
  return row;
}

const CONFLICT_COLUMNS =
  'id, store_id, operation_id, entity_type, entity_id, conflict_type, local_payload, ' +
  'server_payload, server_version, server_revision, status, resolution, created_at, resolved_at';

export interface CreateSyncConflictInput {
  id: string;
  storeId: string;
  operationId: string;
  entityType: string;
  entityId: string;
  conflictType: SyncConflictType;
  localPayload: string;
  serverPayload?: string | null;
  serverVersion?: number | null;
  serverRevision?: number | null;
  createdAt?: string;
}

export function createSyncConflict(
  adapter: DatabaseAdapter,
  input: CreateSyncConflictInput,
): SyncConflictRow {
  const createdAt = input.createdAt ?? nowIso();
  adapter.run(
    `UPDATE sync_conflicts SET server_payload = COALESCE(?, server_payload),
       server_version = COALESCE(?, server_version),
       server_revision = COALESCE(?, server_revision)
     WHERE operation_id = ? AND status = 'OPEN'
       AND (server_revision IS NULL OR server_revision <= ?);`,
    [input.serverPayload ?? null, input.serverVersion ?? null, input.serverRevision ?? null,
      requireId(input.operationId), input.serverRevision ?? -1],
  );
  adapter.run(
    `INSERT OR IGNORE INTO sync_conflicts
      (id, store_id, operation_id, entity_type, entity_id, conflict_type,
       local_payload, server_payload, server_version, server_revision, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?);`,
    [
      requireId(input.id),
      requireId(input.storeId),
      requireId(input.operationId),
      input.entityType,
      requireId(input.entityId),
      input.conflictType,
      input.localPayload,
      input.serverPayload ?? null,
      input.serverVersion ?? null,
      input.serverRevision ?? null,
      createdAt,
    ],
  );
  const row = adapter.getFirstRow<Row>(
    `SELECT ${CONFLICT_COLUMNS} FROM sync_conflicts WHERE operation_id = ? AND status = 'OPEN';`,
    [requireId(input.operationId)],
  );
  if (!row) {
    throw new Error('Sync conflict was not persisted.');
  }
  return mapConflict(row);
}

export function listOpenSyncConflicts(
  adapter: DatabaseAdapter,
  storeId: string,
): SyncConflictRow[] {
  return adapter
    .getAllRows<Row>(
      `SELECT ${CONFLICT_COLUMNS} FROM sync_conflicts
       WHERE store_id = ? AND status = 'OPEN'
       ORDER BY created_at ASC, id ASC;`,
      [requireId(storeId)],
    )
    .map(mapConflict);
}

export function resolveSyncConflict(
  adapter: DatabaseAdapter,
  input: { id: string; resolution: string; resolvedAt?: string },
): void {
  const resolvedAt = input.resolvedAt ?? nowIso();
  adapter.run(
    `UPDATE sync_conflicts SET status = 'RESOLVED', resolution = ?, resolved_at = ?
     WHERE id = ? AND status = 'OPEN';`,
    [input.resolution, resolvedAt, requireId(input.id)],
  );
}
