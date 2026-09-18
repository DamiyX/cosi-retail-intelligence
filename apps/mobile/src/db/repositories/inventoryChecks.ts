import { DomainError } from '@retail/domain';

import type { DatabaseAdapter } from '../adapter';
import { nowIso, optionalId, optionalText, requireId, requireText } from './common';

export const GUIDED_CHECK_POLICY_VERSION = 'M5-GUIDED-1';

export type InventoryCheckAssignmentStatus = 'PENDING' | 'COMPLETED' | 'REPLACED' | 'EXHAUSTED';
export type InventoryCheckAssignmentKind = 'INITIAL' | 'REPLACEMENT';
export type InventoryCheckAttemptStatus = 'OPEN' | 'COMPLETED' | 'CANCELLED';

export interface InventoryCheckSettingsRow {
  storeId: string;
  dailyTarget: number;
  paused: boolean;
  windowStartMinute: number;
  windowEndMinute: number;
  policyVersion: string;
  version: number;
  updatedByStoreMemberId: string | null;
  updatedByUserId: string | null;
  updatedByDeviceId: string | null;
  updatedAt: string | null;
}

export interface InventoryCheckAssignmentRow {
  id: string;
  storeId: string;
  storeProductId: string;
  localDate: string;
  status: InventoryCheckAssignmentStatus;
  assignmentKind: InventoryCheckAssignmentKind;
  replacesAssignmentId: string | null;
  rootAssignmentId: string;
  policyVersion: string;
  createdByStoreMemberId: string;
  createdByUserId: string;
  deviceId: string;
  createdAt: string;
  closedAt: string | null;
  closedByStoreMemberId: string | null;
  closedByUserId: string | null;
  closedByDeviceId: string | null;
}

export interface InventoryCheckAttemptRow {
  id: string;
  assignmentId: string;
  storeId: string;
  storeProductId: string;
  attemptKind: InventoryCheckAssignmentKind;
  status: InventoryCheckAttemptStatus;
  reasonCode: string | null;
  note: string | null;
  createdByStoreMemberId: string;
  createdByUserId: string;
  deviceId: string;
  reconciliationId: string | null;
  createdAt: string;
  closedAt: string | null;
  closedByStoreMemberId: string | null;
  closedByUserId: string | null;
  closedByDeviceId: string | null;
}

export interface SaveInventoryCheckSettingsInput {
  storeId: string;
  dailyTarget: number;
  paused: boolean;
  windowStartMinute: number;
  windowEndMinute: number;
  policyVersion?: string;
  updatedByStoreMemberId: string;
  updatedByUserId: string;
  updatedByDeviceId: string;
  updatedAt?: string;
}

export interface CreateInventoryCheckAssignmentInput {
  id: string;
  storeId: string;
  storeProductId: string;
  localDate: string;
  status?: InventoryCheckAssignmentStatus;
  assignmentKind: InventoryCheckAssignmentKind;
  replacesAssignmentId?: string | null;
  rootAssignmentId: string;
  policyVersion?: string;
  createdByStoreMemberId: string;
  createdByUserId: string;
  deviceId: string;
  createdAt?: string;
}

export interface CreateInventoryCheckAttemptInput {
  id: string;
  assignmentId: string;
  storeId: string;
  storeProductId: string;
  attemptKind: InventoryCheckAssignmentKind;
  reasonCode?: string | null;
  note?: string | null;
  createdByStoreMemberId: string;
  createdByUserId: string;
  deviceId: string;
  createdAt?: string;
}

type Row = Record<string, string | number | null>;

const SETTINGS_COLUMNS =
  'store_id, daily_target, paused, window_start_minute, window_end_minute, policy_version, version, ' +
  'updated_by_store_member_id, updated_by_user_id, updated_by_device_id, updated_at';
const ASSIGNMENT_COLUMNS =
  'id, store_id, store_product_id, local_date, status, assignment_kind, replaces_assignment_id, ' +
  'root_assignment_id, policy_version, created_by_store_member_id, created_by_user_id, device_id, created_at, closed_at, ' +
  'closed_by_store_member_id, closed_by_user_id, closed_by_device_id';
const ATTEMPT_COLUMNS =
  'id, assignment_id, store_id, store_product_id, attempt_kind, status, reason_code, note, ' +
  'created_by_store_member_id, created_by_user_id, device_id, reconciliation_id, created_at, closed_at, ' +
  'closed_by_store_member_id, closed_by_user_id, closed_by_device_id';

function minute(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value < 0 || value > 1439) {
    throw new DomainError('INVALID_VALUE', `${field} must be an integer between 0 and 1439.`);
  }
  return value;
}

function target(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0 || value > 100) {
    throw new DomainError('INVALID_VALUE', 'dailyTarget must be an integer between 0 and 100.');
  }
  return value;
}

function localDate(value: string): string {
  const date = requireText(value, 'localDate', 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new DomainError('INVALID_VALUE', 'localDate must use YYYY-MM-DD.');
  return date;
}

function mapSettings(row: Row): InventoryCheckSettingsRow {
  return {
    storeId: row.store_id as string,
    dailyTarget: row.daily_target as number,
    paused: row.paused === 1,
    windowStartMinute: row.window_start_minute as number,
    windowEndMinute: row.window_end_minute as number,
    policyVersion: row.policy_version as string,
    version: row.version as number,
    updatedByStoreMemberId: (row.updated_by_store_member_id as string | null) ?? null,
    updatedByUserId: (row.updated_by_user_id as string | null) ?? null,
    updatedByDeviceId: (row.updated_by_device_id as string | null) ?? null,
    updatedAt: (row.updated_at as string | null) ?? null,
  };
}

function mapAssignment(row: Row): InventoryCheckAssignmentRow {
  return {
    id: row.id as string,
    storeId: row.store_id as string,
    storeProductId: row.store_product_id as string,
    localDate: row.local_date as string,
    status: row.status as InventoryCheckAssignmentStatus,
    assignmentKind: row.assignment_kind as InventoryCheckAssignmentKind,
    replacesAssignmentId: (row.replaces_assignment_id as string | null) ?? null,
    rootAssignmentId: row.root_assignment_id as string,
    policyVersion: row.policy_version as string,
    createdByStoreMemberId: row.created_by_store_member_id as string,
    createdByUserId: row.created_by_user_id as string,
    deviceId: row.device_id as string,
    createdAt: row.created_at as string,
    closedAt: (row.closed_at as string | null) ?? null,
    closedByStoreMemberId: (row.closed_by_store_member_id as string | null) ?? null,
    closedByUserId: (row.closed_by_user_id as string | null) ?? null,
    closedByDeviceId: (row.closed_by_device_id as string | null) ?? null,
  };
}

function mapAttempt(row: Row): InventoryCheckAttemptRow {
  return {
    id: row.id as string,
    assignmentId: row.assignment_id as string,
    storeId: row.store_id as string,
    storeProductId: row.store_product_id as string,
    attemptKind: row.attempt_kind as InventoryCheckAssignmentKind,
    status: row.status as InventoryCheckAttemptStatus,
    reasonCode: (row.reason_code as string | null) ?? null,
    note: (row.note as string | null) ?? null,
    createdByStoreMemberId: row.created_by_store_member_id as string,
    createdByUserId: row.created_by_user_id as string,
    deviceId: row.device_id as string,
    reconciliationId: (row.reconciliation_id as string | null) ?? null,
    createdAt: row.created_at as string,
    closedAt: (row.closed_at as string | null) ?? null,
    closedByStoreMemberId: (row.closed_by_store_member_id as string | null) ?? null,
    closedByUserId: (row.closed_by_user_id as string | null) ?? null,
    closedByDeviceId: (row.closed_by_device_id as string | null) ?? null,
  };
}

export function getInventoryCheckSettings(adapter: DatabaseAdapter, storeId: string): InventoryCheckSettingsRow | null {
  const row = adapter.getFirstRow<Row>(
    `SELECT ${SETTINGS_COLUMNS} FROM inventory_check_settings WHERE store_id = ?;`,
    [requireId(storeId)],
  );
  return row ? mapSettings(row) : null;
}

export function saveInventoryCheckSettings(
  adapter: DatabaseAdapter,
  input: SaveInventoryCheckSettingsInput,
): InventoryCheckSettingsRow {
  const storeId = requireId(input.storeId);
  const dailyTarget = target(input.dailyTarget);
  const windowStartMinute = minute(input.windowStartMinute, 'windowStartMinute');
  const windowEndMinute = minute(input.windowEndMinute, 'windowEndMinute');
  if (windowStartMinute > windowEndMinute) throw new DomainError('INVALID_VALUE', 'The check window must finish after it starts.');
  const policyVersion = requireText(input.policyVersion ?? GUIDED_CHECK_POLICY_VERSION, 'policyVersion', 64);
  const updatedAt = input.updatedAt ?? nowIso();
  adapter.run(
    `INSERT INTO inventory_check_settings
      (store_id, daily_target, paused, window_start_minute, window_end_minute, policy_version, version,
       updated_by_store_member_id, updated_by_user_id, updated_by_device_id, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
     ON CONFLICT(store_id) DO UPDATE SET
       daily_target = excluded.daily_target,
       paused = excluded.paused,
       window_start_minute = excluded.window_start_minute,
       window_end_minute = excluded.window_end_minute,
       policy_version = excluded.policy_version,
       version = inventory_check_settings.version + 1,
       updated_by_store_member_id = excluded.updated_by_store_member_id,
       updated_by_user_id = excluded.updated_by_user_id,
       updated_by_device_id = excluded.updated_by_device_id,
       updated_at = excluded.updated_at;`,
    [
      storeId,
      dailyTarget,
      input.paused ? 1 : 0,
      windowStartMinute,
      windowEndMinute,
      policyVersion,
      requireId(input.updatedByStoreMemberId),
      requireId(input.updatedByUserId),
      requireId(input.updatedByDeviceId),
      requireText(updatedAt, 'updatedAt', 64),
    ],
  );
  const row = getInventoryCheckSettings(adapter, storeId);
  if (!row) throw new Error('Inventory check settings did not persist.');
  return row;
}

export function createInventoryCheckAssignment(
  adapter: DatabaseAdapter,
  input: CreateInventoryCheckAssignmentInput,
): InventoryCheckAssignmentRow {
  const id = requireId(input.id);
  const storeId = requireId(input.storeId);
  const assignmentKind = input.assignmentKind;
  if (assignmentKind !== 'INITIAL' && assignmentKind !== 'REPLACEMENT') throw new DomainError('INVALID_VALUE', 'Check assignment kind is invalid.');
  const createdAt = input.createdAt ?? nowIso();
  adapter.run(
    `INSERT INTO inventory_check_assignments
      (id, store_id, store_product_id, local_date, status, assignment_kind,
       replaces_assignment_id, root_assignment_id, policy_version,
       created_by_store_member_id, created_by_user_id, device_id, created_at, closed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL);`,
    [
      id,
      storeId,
      requireId(input.storeProductId),
      localDate(input.localDate),
      input.status ?? 'PENDING',
      assignmentKind,
      optionalId(input.replacesAssignmentId),
      requireId(input.rootAssignmentId),
      requireText(input.policyVersion ?? GUIDED_CHECK_POLICY_VERSION, 'policyVersion', 64),
      requireId(input.createdByStoreMemberId),
      requireId(input.createdByUserId),
      requireId(input.deviceId),
      requireText(createdAt, 'createdAt', 64),
    ],
  );
  const row = getInventoryCheckAssignmentById(adapter, id);
  if (!row) throw new Error('Inventory check assignment did not persist.');
  return row;
}

export function getInventoryCheckAssignmentById(adapter: DatabaseAdapter, id: string): InventoryCheckAssignmentRow | null {
  const row = adapter.getFirstRow<Row>(`SELECT ${ASSIGNMENT_COLUMNS} FROM inventory_check_assignments WHERE id = ?;`, [requireId(id)]);
  return row ? mapAssignment(row) : null;
}

export function listInventoryCheckAssignmentsByStore(
  adapter: DatabaseAdapter,
  storeId: string,
  localDateFilter?: string,
): InventoryCheckAssignmentRow[] {
  const date = localDateFilter === undefined ? null : localDate(localDateFilter);
  const rows = adapter.getAllRows<Row>(
    `SELECT ${ASSIGNMENT_COLUMNS} FROM inventory_check_assignments
     WHERE store_id = ? ${date === null ? '' : 'AND local_date = ?'}
     ORDER BY local_date ASC, created_at ASC, id ASC;`,
    date === null ? [requireId(storeId)] : [requireId(storeId), date],
  );
  return rows.map(mapAssignment);
}

export function listInventoryCheckAssignmentsByProduct(
  adapter: DatabaseAdapter,
  storeProductId: string,
): InventoryCheckAssignmentRow[] {
  return adapter.getAllRows<Row>(
    `SELECT ${ASSIGNMENT_COLUMNS} FROM inventory_check_assignments
     WHERE store_product_id = ? ORDER BY created_at ASC, id ASC;`,
    [requireId(storeProductId)],
  ).map(mapAssignment);
}

export function createInventoryCheckAttempt(
  adapter: DatabaseAdapter,
  input: CreateInventoryCheckAttemptInput,
): InventoryCheckAttemptRow {
  const attemptKind = input.attemptKind;
  if (attemptKind !== 'INITIAL' && attemptKind !== 'REPLACEMENT') throw new DomainError('INVALID_VALUE', 'Check attempt kind is invalid.');
  const createdAt = input.createdAt ?? nowIso();
  adapter.run(
    `INSERT INTO inventory_check_attempts
      (id, assignment_id, store_id, store_product_id, attempt_kind, status, reason_code, note,
       created_by_store_member_id, created_by_user_id, device_id, reconciliation_id, created_at, closed_at)
     VALUES (?, ?, ?, ?, ?, 'OPEN', ?, ?, ?, ?, ?, NULL, ?, NULL);`,
    [
      requireId(input.id),
      requireId(input.assignmentId),
      requireId(input.storeId),
      requireId(input.storeProductId),
      attemptKind,
      optionalText(input.reasonCode, 'reasonCode', 64),
      optionalText(input.note, 'note', 500),
      requireId(input.createdByStoreMemberId),
      requireId(input.createdByUserId),
      requireId(input.deviceId),
      requireText(createdAt, 'createdAt', 64),
    ],
  );
  const row = getInventoryCheckAttemptById(adapter, input.id);
  if (!row) throw new Error('Inventory check attempt did not persist.');
  return row;
}

export function getInventoryCheckAttemptById(adapter: DatabaseAdapter, id: string): InventoryCheckAttemptRow | null {
  const row = adapter.getFirstRow<Row>(`SELECT ${ATTEMPT_COLUMNS} FROM inventory_check_attempts WHERE id = ?;`, [requireId(id)]);
  return row ? mapAttempt(row) : null;
}

export function listInventoryCheckAttemptsByAssignment(adapter: DatabaseAdapter, assignmentId: string): InventoryCheckAttemptRow[] {
  return adapter.getAllRows<Row>(
    `SELECT ${ATTEMPT_COLUMNS} FROM inventory_check_attempts WHERE assignment_id = ? ORDER BY created_at ASC, id ASC;`,
    [requireId(assignmentId)],
  ).map(mapAttempt);
}

export function getLatestCompletedInventoryCheckAt(adapter: DatabaseAdapter, storeProductId: string): string | null {
  const row = adapter.getFirstRow<{ completed_at: string | null }>(
    `SELECT MAX(closed_at) AS completed_at FROM inventory_check_attempts
     WHERE store_product_id = ? AND status = 'COMPLETED';`,
    [requireId(storeProductId)],
  );
  return row?.completed_at ?? null;
}

export function closeInventoryCheckAttempt(
  adapter: DatabaseAdapter,
  input: {
    id: string;
    status: Exclude<InventoryCheckAttemptStatus, 'OPEN'>;
    closedAt: string;
    reasonCode?: string | null;
    note?: string | null;
    reconciliationId?: string | null;
    closedByStoreMemberId: string;
    closedByUserId: string;
    closedByDeviceId: string;
  },
): InventoryCheckAttemptRow {
  const result = adapter.run(
    `UPDATE inventory_check_attempts
     SET status = ?, reason_code = ?, note = ?, reconciliation_id = ?, closed_at = ?,
         closed_by_store_member_id = ?, closed_by_user_id = ?, closed_by_device_id = ?
     WHERE id = ? AND status = 'OPEN';`,
    [
      input.status,
      optionalText(input.reasonCode, 'reasonCode', 64),
      optionalText(input.note, 'note', 500),
      optionalId(input.reconciliationId),
      requireText(input.closedAt, 'closedAt', 64),
      requireId(input.closedByStoreMemberId),
      requireId(input.closedByUserId),
      requireId(input.closedByDeviceId),
      requireId(input.id),
    ],
  );
  if (result.changes !== 1) throw new DomainError('INVALID_VALUE', 'This check attempt is no longer open.');
  const row = getInventoryCheckAttemptById(adapter, input.id);
  if (!row) throw new Error('Closed inventory check attempt was not found.');
  return row;
}

export function closeInventoryCheckAssignment(
  adapter: DatabaseAdapter,
  input: {
    id: string;
    status: Exclude<InventoryCheckAssignmentStatus, 'PENDING'>;
    closedAt: string;
    closedByStoreMemberId: string;
    closedByUserId: string;
    closedByDeviceId: string;
  },
): InventoryCheckAssignmentRow {
  const result = adapter.run(
    `UPDATE inventory_check_assignments
     SET status = ?, closed_at = ?, closed_by_store_member_id = ?, closed_by_user_id = ?, closed_by_device_id = ?
     WHERE id = ? AND status = 'PENDING';`,
    [input.status, requireText(input.closedAt, 'closedAt', 64), requireId(input.closedByStoreMemberId), requireId(input.closedByUserId), requireId(input.closedByDeviceId), requireId(input.id)],
  );
  if (result.changes !== 1) throw new DomainError('INVALID_VALUE', 'This check assignment is no longer pending.');
  const row = getInventoryCheckAssignmentById(adapter, input.id);
  if (!row) throw new Error('Closed inventory check assignment was not found.');
  return row;
}

/** Complete the durable guided attempt together with the reconciliation transaction. */
export function completeInventoryCheckAssignmentForReconciliation(
  adapter: DatabaseAdapter,
  input: {
    assignmentId: string;
    reconciliationId: string;
    completedAt: string;
    closedByStoreMemberId: string;
    closedByUserId: string;
    closedByDeviceId: string;
  },
): { assignment: InventoryCheckAssignmentRow; attempt: InventoryCheckAttemptRow } {
  const assignment = getInventoryCheckAssignmentById(adapter, input.assignmentId);
  if (!assignment || assignment.status !== 'PENDING') throw new DomainError('INVALID_VALUE', 'This guided check is no longer pending.');
  const attempts = listInventoryCheckAttemptsByAssignment(adapter, assignment.id);
  const attempt = attempts.find((candidate) => candidate.status === 'OPEN');
  if (!attempt) throw new DomainError('INVALID_VALUE', 'This guided check has no open attempt.');
  const completedAttempt = closeInventoryCheckAttempt(adapter, {
    id: attempt.id,
    status: 'COMPLETED',
    closedAt: input.completedAt,
    reconciliationId: input.reconciliationId,
    closedByStoreMemberId: input.closedByStoreMemberId,
    closedByUserId: input.closedByUserId,
    closedByDeviceId: input.closedByDeviceId,
  });
  const completedAssignment = closeInventoryCheckAssignment(adapter, {
    id: assignment.id,
    status: 'COMPLETED',
    closedAt: input.completedAt,
    closedByStoreMemberId: input.closedByStoreMemberId,
    closedByUserId: input.closedByUserId,
    closedByDeviceId: input.closedByDeviceId,
  });
  return { assignment: completedAssignment, attempt: completedAttempt };
}
