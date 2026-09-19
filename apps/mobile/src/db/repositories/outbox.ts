import { DomainError } from '@retail/domain';

import type { DatabaseAdapter } from '../adapter';
import { nowIso, requireId } from './common';

/**
 * Durable local outbox (OFFLINE_SYNC section 6). Every M2 catalogue mutation
 * enqueues exactly one complete operation envelope in the same SQLite
 * transaction as its business rows. Network push, acknowledgement, retry,
 * and conflict handling remain M7; rows rest in PENDING until then. No
 * feature invents its own envelope: all catalogue operations share the
 * types and the canonical payload builder below.
 */

export type OutboxStatus =
  | 'PENDING'
  | 'SYNCING'
  | 'SYNCED'
  | 'CONFLICT'
  | 'ERROR_RETRYABLE'
  | 'ERROR_PERMANENT';

export type OutboxEntityType =
  | 'STORE_PRODUCT'
  | 'PRODUCT_VARIANT'
  | 'PACKAGE_UNIT'
  | 'STORE_PACKAGE_SETTING'
  | 'PRODUCT_IDENTIFIER'
  | 'SALE'
  | 'CUSTOMER_ACCOUNT'
  | 'RECEIVABLE'
  | 'PURCHASE'
  | 'BATCH_OPERATION'
  | 'INVENTORY_ADJUSTMENT'
  | 'RECONCILIATION'
  | 'INVENTORY_CHECK_SETTINGS'
  | 'CHECK_ASSIGNMENT'
  | 'INVENTORY_ATTENTION_SETTINGS'
  | 'ATTENTION_SNOOZE'
  | 'EXPENSE'
  | 'OWNER_WITHDRAWAL';

export type OutboxOperationType =
  | 'PRODUCT_CREATED'
  | 'PRODUCT_IDENTITY_UPDATED'
  | 'PRODUCT_IDENTIFIER_ADDED'
  | 'PACKAGE_CREATED'
  | 'PACKAGE_UPDATED'
  | 'PACKAGE_DEACTIVATED'
  | 'STORE_PACKAGE_SETTING_SAVED'
  | 'PRODUCT_LIFECYCLE_CHANGED'
  | 'PRODUCT_REORDER_LEVEL_UPDATED'
  | 'COMPLETED_SALE_CREATED'
  | 'COMPLETED_PURCHASE_CREATED'
  | 'BATCH_CLASSIFICATION_CREATED'
  | 'INVENTORY_ADJUSTMENT_CREATED'
  | 'RECONCILIATION_FINALIZED'
  | 'CHECK_SETTINGS_SAVED'
  | 'CHECK_ASSIGNMENT_CREATED'
  | 'ATTENTION_SETTINGS_SAVED'
  | 'ATTENTION_SNOOZE_CREATED'
  | 'EXPENSE_CREATED'
  | 'OWNER_WITHDRAWAL_CREATED';

export type CatalogueOperationType = OutboxOperationType;

/** Canonical envelope version; M7 push includes it for protocol checks. */
export const OUTBOX_PAYLOAD_VERSION = 1;

export interface OutboxOperationRow {
  operationId: string;
  storeId: string;
  deviceId: string;
  entityType: OutboxEntityType;
  entityId: string;
  operationType: OutboxOperationType;
  baseServerVersion: number | null;
  /** Canonical JSON envelope (fixed key order) with full entity snapshots. */
  payload: string;
  createdAt: string;
  attemptCount: number;
  nextAttemptAt: string | null;
  lastErrorCode: string | null;
  status: OutboxStatus;
  leaseId: string | null;
  leaseExpiresAt: string | null;
  serverVersion: number | null;
  serverRevision: number | null;
  syncedAt: string | null;
}

export interface OutboxEnvelopeInput {
  operationType: OutboxOperationType;
  operationId: string;
  storeId: string;
  deviceId: string;
  entityType: OutboxEntityType;
  entityId: string;
  occurredAt: string;
  /** Complete entity snapshots the server needs to apply this operation. */
  entities: Record<string, unknown>;
  baseServerVersion?: number | null;
}

type OutboxRecord = Record<string, string | number | null>;

function mapRow(row: OutboxRecord): OutboxOperationRow {
  return {
    operationId: row.operation_id as string,
    storeId: row.store_id as string,
    deviceId: row.device_id as string,
    entityType: row.entity_type as OutboxEntityType,
    entityId: row.entity_id as string,
    operationType: row.operation_type as OutboxOperationType,
    baseServerVersion: (row.base_server_version as number | null) ?? null,
    payload: row.payload as string,
    createdAt: row.created_at as string,
    attemptCount: row.attempt_count as number,
    nextAttemptAt: (row.next_attempt_at as string | null) ?? null,
    lastErrorCode: (row.last_error_code as string | null) ?? null,
    status: row.status as OutboxStatus,
    leaseId: (row.lease_id as string | null) ?? null,
    leaseExpiresAt: (row.lease_expires_at as string | null) ?? null,
    serverVersion: (row.server_version as number | null) ?? null,
    serverRevision: (row.server_revision as number | null) ?? null,
    syncedAt: (row.synced_at as string | null) ?? null,
  };
}

const LEGACY_COLUMNS =
  'operation_id, store_id, device_id, entity_type, entity_id, operation_type, ' +
  'base_server_version, payload, created_at, attempt_count, next_attempt_at, ' +
  'last_error_code, status';

const SYNC_COLUMNS =
  `${LEGACY_COLUMNS}, lease_id, lease_expires_at, server_version, server_revision, synced_at`;

function outboxColumns(adapter: DatabaseAdapter): string {
  const columns = adapter.getAllRows<{ name: string }>('PRAGMA table_info(outbox_operations);');
  return columns.some((column) => column.name === 'lease_id') ? SYNC_COLUMNS : LEGACY_COLUMNS;
}

/**
 * Build the canonical JSON envelope. Keys are emitted in a fixed order so
 * the same logical operation always serializes identically.
 */
export function buildOutboxEnvelope(input: OutboxEnvelopeInput): string {
  const operationId = requireId(input.operationId);
  const storeId = requireId(input.storeId);
  const deviceId = requireId(input.deviceId);
  const entityId = requireId(input.entityId);
  if (typeof input.occurredAt !== 'string' || input.occurredAt.length === 0) {
    throw new DomainError('INVALID_VALUE', 'Outbox envelopes require a business occurred-at timestamp.');
  }
  return JSON.stringify({
    payloadVersion: OUTBOX_PAYLOAD_VERSION,
    operationType: input.operationType,
    operationId,
    storeId,
    deviceId,
    entityType: input.entityType,
    entityId,
    baseServerVersion: input.baseServerVersion ?? null,
    occurredAt: input.occurredAt,
    entities: input.entities,
  });
}

export interface EnqueueOutboxOperationInput extends OutboxEnvelopeInput {
  createdAt?: string;
}

/** Persist one PENDING envelope. The caller commits it with business rows. */
export function enqueueOutboxOperation(
  adapter: DatabaseAdapter,
  input: EnqueueOutboxOperationInput,
): OutboxOperationRow {
  const payload = buildOutboxEnvelope(input);
  const createdAt = input.createdAt ?? nowIso();
  adapter.run(
    `INSERT INTO outbox_operations
      (operation_id, store_id, device_id, entity_type, entity_id, operation_type,
       base_server_version, payload, created_at, attempt_count,
       next_attempt_at, last_error_code, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, NULL, 'PENDING');`,
    [
      requireId(input.operationId),
      requireId(input.storeId),
      requireId(input.deviceId),
      input.entityType,
      requireId(input.entityId),
      input.operationType,
      input.baseServerVersion ?? null,
      payload,
      createdAt,
    ],
  );
  const created = findOutboxOperation(adapter, input.operationId);
  if (!created) {
    throw new Error('Outbox operation insert did not persist.');
  }
  return created;
}

export function findOutboxOperation(
  adapter: DatabaseAdapter,
  operationId: string,
): OutboxOperationRow | null {
  const row = adapter.getFirstRow<OutboxRecord>(
    `SELECT ${outboxColumns(adapter)} FROM outbox_operations WHERE operation_id = ?;`,
    [requireId(operationId)],
  );
  return row ? mapRow(row) : null;
}

export interface FindOutboxOperationForEntityInput {
  storeId: string;
  entityType: OutboxEntityType;
  entityId: string;
  operationType?: OutboxOperationType;
}

/**
 * Look up the durable sync record for one entity within its store boundary.
 * Screens use this as a status read only; M7 retains ownership of mutation,
 * acknowledgement, retry, and conflict handling.
 */
export function findOutboxOperationForEntity(
  adapter: DatabaseAdapter,
  input: FindOutboxOperationForEntityInput,
): OutboxOperationRow | null {
  const storeId = requireId(input.storeId);
  const entityId = requireId(input.entityId);
  const hasOperationType = input.operationType !== undefined;
  const row = adapter.getFirstRow<OutboxRecord>(
    `SELECT ${outboxColumns(adapter)} FROM outbox_operations
     WHERE store_id = ? AND entity_type = ? AND entity_id = ?
     ${hasOperationType ? 'AND operation_type = ?' : ''}
     ORDER BY created_at DESC, operation_id DESC
     LIMIT 1;`,
    hasOperationType
      ? [storeId, input.entityType, entityId, input.operationType!]
      : [storeId, input.entityType, entityId],
  );
  return row ? mapRow(row) : null;
}

/**
 * Return durable local mutations for one store entity in application order.
 * Rebuildable local condition episodes must not rely on created_at alone:
 * offline timestamps can be supplied by a device clock and may tie or arrive
 * out of order, while SQLite rowid records the local application sequence.
 */
export function listOutboxOperationsByStoreEntityInLedgerOrder(
  adapter: DatabaseAdapter,
  storeId: string,
  entityType: OutboxEntityType,
  entityId: string,
  operationType: OutboxOperationType,
): OutboxOperationRow[] {
  return adapter
    .getAllRows<OutboxRecord>(
      `SELECT ${outboxColumns(adapter)} FROM outbox_operations
       WHERE store_id = ? AND entity_type = ? AND entity_id = ? AND operation_type = ?
       ORDER BY rowid ASC;`,
      [requireId(storeId), entityType, requireId(entityId), operationType],
    )
    .map(mapRow);
}

export interface ExpectedOutboxReplay {
  operationId: string;
  storeId: string;
  deviceId: string;
  operationType: OutboxOperationType;
  entityType: OutboxEntityType;
  /** Known for mutations of an existing entity; omitted for create operations. */
  entityId?: string;
}

/**
 * Resolve an idempotent replay without allowing an operation ID from another
 * store, device, mutation type, or entity to be mistaken for this request.
 */
export function findExpectedOutboxReplay(
  adapter: DatabaseAdapter,
  expected: ExpectedOutboxReplay,
): OutboxOperationRow | null {
  const existing = findOutboxOperation(adapter, expected.operationId);
  if (!existing) {
    return null;
  }
  const mismatched =
    existing.storeId !== requireId(expected.storeId) ||
    existing.deviceId !== requireId(expected.deviceId) ||
    existing.operationType !== expected.operationType ||
    existing.entityType !== expected.entityType ||
    (expected.entityId !== undefined && existing.entityId !== requireId(expected.entityId));
  if (mismatched) {
    throw new DomainError(
      'INVALID_VALUE',
      'This operation ID already belongs to a different request.',
    );
  }
  return existing;
}

/** Pending envelopes for one store, oldest first (future M7 push order). */
export function listPendingOutboxOperations(
  adapter: DatabaseAdapter,
  storeId: string,
): OutboxOperationRow[] {
  return adapter
    .getAllRows<OutboxRecord>(
      `SELECT ${outboxColumns(adapter)} FROM outbox_operations
       WHERE store_id = ? AND status = 'PENDING' ORDER BY created_at ASC;`,
      [requireId(storeId)],
    )
    .map(mapRow);
}

export function countPendingOutboxOperations(adapter: DatabaseAdapter, storeId: string): number {
  const row = adapter.getFirstRow<{ total: number }>(
    `SELECT COUNT(*) AS total FROM outbox_operations WHERE store_id = ? AND status = 'PENDING';`,
    [requireId(storeId)],
  );
  return row?.total ?? 0;
}

export interface ClaimOutboxBatchInput {
  storeId: string;
  leaseId: string;
  now: string;
  leaseExpiresAt: string;
  limit: number;
}

/**
 * Requeue abandoned work and claim one bounded batch atomically. A lease is
 * local process state only; the operation remains durable until a server ack
 * moves it to a terminal status.
 */
export function claimOutboxBatch(
  adapter: DatabaseAdapter,
  input: ClaimOutboxBatchInput,
): OutboxOperationRow[] {
  const storeId = requireId(input.storeId);
  const leaseId = requireId(input.leaseId);
  if (!Number.isInteger(input.limit) || input.limit <= 0) {
    throw new DomainError('INVALID_VALUE', 'Outbox claim limit must be a positive integer.');
  }
  return adapter.transaction(() => {
    releaseExpiredOutboxLeases(adapter, storeId, input.now);
    const candidates = adapter.getAllRows<OutboxRecord>(
      `SELECT operation_id FROM outbox_operations
       WHERE store_id = ?
         AND status IN ('PENDING', 'ERROR_RETRYABLE')
         AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
       ORDER BY created_at ASC, rowid ASC
       LIMIT ?;`,
      [storeId, input.now, input.limit],
    );
    if (candidates.length === 0) {
      return [];
    }
    const placeholders = candidates.map(() => '?').join(', ');
    const operationIds = candidates.map((row) => row.operation_id as string);
    adapter.run(
      `UPDATE outbox_operations
       SET status = 'SYNCING', lease_id = ?, lease_expires_at = ?,
           attempt_count = attempt_count + 1, last_error_code = NULL
       WHERE store_id = ? AND operation_id IN (${placeholders})
         AND status IN ('PENDING', 'ERROR_RETRYABLE');`,
      [leaseId, input.leaseExpiresAt, storeId, ...operationIds],
    );
    return adapter
      .getAllRows<OutboxRecord>(
        `SELECT ${outboxColumns(adapter)} FROM outbox_operations
         WHERE store_id = ? AND lease_id = ?
         ORDER BY created_at ASC, rowid ASC;`,
        [storeId, leaseId],
      )
      .map(mapRow);
  });
}

export function releaseExpiredOutboxLeases(
  adapter: DatabaseAdapter,
  storeId: string,
  now: string,
): number {
  const result = adapter.run(
    `UPDATE outbox_operations
     SET status = 'PENDING', lease_id = NULL, lease_expires_at = NULL
     WHERE store_id = ? AND status = 'SYNCING'
       AND lease_expires_at IS NOT NULL AND lease_expires_at <= ?;`,
    [requireId(storeId), now],
  );
  return result.changes;
}

export interface OutboxStatusUpdate {
  operationId: string;
  leaseId?: string;
  serverVersion?: number | null;
  serverRevision?: number | null;
  errorCode?: string | null;
  nextAttemptAt?: string | null;
  syncedAt?: string | null;
}

function statusLeasePredicate(update: OutboxStatusUpdate): { sql: string; params: string[] } {
  if (update.leaseId === undefined) {
    return { sql: '', params: [] };
  }
  return { sql: ' AND lease_id = ?', params: [requireId(update.leaseId)] };
}

export function markOutboxApplied(
  adapter: DatabaseAdapter,
  update: OutboxStatusUpdate,
): void {
  const lease = statusLeasePredicate(update);
  adapter.run(
    `UPDATE outbox_operations
     SET status = 'SYNCED', lease_id = NULL, lease_expires_at = NULL,
         server_version = ?, server_revision = ?, synced_at = ?,
         last_error_code = NULL, next_attempt_at = NULL
     WHERE operation_id = ? AND status = 'SYNCING'${lease.sql};`,
    [
      update.serverVersion ?? null,
      update.serverRevision ?? null,
      update.syncedAt ?? nowIso(),
      requireId(update.operationId),
      ...lease.params,
    ],
  );
}

/** A pull echo can arrive before the push response; it is still a server ack. */
export function markOutboxEchoApplied(
  adapter: DatabaseAdapter,
  update: Omit<OutboxStatusUpdate, 'leaseId'>,
): void {
  adapter.run(
    `UPDATE outbox_operations
     SET status = 'SYNCED', lease_id = NULL, lease_expires_at = NULL,
         server_version = ?, server_revision = ?, synced_at = ?,
         last_error_code = NULL, next_attempt_at = NULL
     WHERE operation_id = ? AND status IN ('PENDING', 'SYNCING', 'ERROR_RETRYABLE');`,
    [
      update.serverVersion ?? null,
      update.serverRevision ?? null,
      update.syncedAt ?? nowIso(),
      requireId(update.operationId),
    ],
  );
}

export function listActiveOutboxOperationsForEntity(
  adapter: DatabaseAdapter,
  input: {
    storeId: string;
    entityType: OutboxEntityType;
    entityId: string;
    excludeOperationId?: string;
  },
): OutboxOperationRow[] {
  const exclude = input.excludeOperationId !== undefined;
  return adapter
    .getAllRows<OutboxRecord>(
      `SELECT ${outboxColumns(adapter)} FROM outbox_operations
       WHERE store_id = ? AND entity_type = ? AND entity_id = ?
         AND status IN ('PENDING', 'SYNCING', 'ERROR_RETRYABLE')
         ${exclude ? 'AND operation_id <> ?' : ''}
       ORDER BY created_at ASC, rowid ASC;`,
      exclude
        ? [requireId(input.storeId), input.entityType, requireId(input.entityId), requireId(input.excludeOperationId!)]
        : [requireId(input.storeId), input.entityType, requireId(input.entityId)],
    )
    .map(mapRow);
}

export function markOutboxRetryable(
  adapter: DatabaseAdapter,
  update: Required<Pick<OutboxStatusUpdate, 'operationId' | 'errorCode' | 'nextAttemptAt'>> &
    Pick<OutboxStatusUpdate, 'leaseId'>,
): void {
  const lease = statusLeasePredicate(update);
  adapter.run(
    `UPDATE outbox_operations
     SET status = 'ERROR_RETRYABLE', lease_id = NULL, lease_expires_at = NULL,
         last_error_code = ?, next_attempt_at = ?
     WHERE operation_id = ? AND status = 'SYNCING'${lease.sql};`,
    [update.errorCode, update.nextAttemptAt, requireId(update.operationId), ...lease.params],
  );
}

export function markOutboxPermanent(
  adapter: DatabaseAdapter,
  update: Required<Pick<OutboxStatusUpdate, 'operationId' | 'errorCode'>> &
    Pick<OutboxStatusUpdate, 'leaseId'>,
): void {
  const lease = statusLeasePredicate(update);
  adapter.run(
    `UPDATE outbox_operations
     SET status = 'ERROR_PERMANENT', lease_id = NULL, lease_expires_at = NULL,
         last_error_code = ?, next_attempt_at = NULL
     WHERE operation_id = ? AND status = 'SYNCING'${lease.sql};`,
    [update.errorCode, requireId(update.operationId), ...lease.params],
  );
}

export function markOutboxConflict(
  adapter: DatabaseAdapter,
  update: Required<Pick<OutboxStatusUpdate, 'operationId' | 'errorCode'>> &
    Pick<OutboxStatusUpdate, 'leaseId'>,
): void {
  const lease = statusLeasePredicate(update);
  adapter.run(
    `UPDATE outbox_operations
     SET status = 'CONFLICT', lease_id = NULL, lease_expires_at = NULL,
         last_error_code = ?, next_attempt_at = NULL
     WHERE operation_id = ? AND status = 'SYNCING'${lease.sql};`,
    [update.errorCode, requireId(update.operationId), ...lease.params],
  );
}
