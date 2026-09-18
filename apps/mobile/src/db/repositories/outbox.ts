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
  | 'CHECK_ASSIGNMENT'
  | 'ATTENTION_SNOOZE';

export type OutboxOperationType =
  | 'PRODUCT_CREATED'
  | 'PRODUCT_IDENTITY_UPDATED'
  | 'PRODUCT_IDENTIFIER_ADDED'
  | 'PACKAGE_CREATED'
  | 'PACKAGE_UPDATED'
  | 'PACKAGE_DEACTIVATED'
  | 'STORE_PACKAGE_SETTING_SAVED'
  | 'PRODUCT_LIFECYCLE_CHANGED'
  | 'COMPLETED_SALE_CREATED'
  | 'COMPLETED_PURCHASE_CREATED'
  | 'BATCH_CLASSIFICATION_CREATED'
  | 'INVENTORY_ADJUSTMENT_CREATED'
  | 'RECONCILIATION_FINALIZED'
  | 'CHECK_ASSIGNMENT_CREATED'
  | 'ATTENTION_SNOOZE_CREATED';

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
  };
}

const COLUMNS =
  'operation_id, store_id, device_id, entity_type, entity_id, operation_type, ' +
  'base_server_version, payload, created_at, attempt_count, next_attempt_at, ' +
  'last_error_code, status';

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
    `SELECT ${COLUMNS} FROM outbox_operations WHERE operation_id = ?;`,
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
    `SELECT ${COLUMNS} FROM outbox_operations
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
      `SELECT ${COLUMNS} FROM outbox_operations
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
