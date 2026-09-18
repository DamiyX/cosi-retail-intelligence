import { DomainError } from '@retail/domain';

import type { DatabaseAdapter } from '../adapter';
import { nowIso, optionalId, optionalText, requireId, requireText } from './common';

export type InventoryReconciliationStatus = 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type ReconciliationSubmissionType = 'FIRST' | 'RECOUNT';

export interface InventoryReconciliationRow {
  id: string;
  storeId: string;
  status: InventoryReconciliationStatus;
  createdByStoreMemberId: string;
  createdByUserId: string;
  deviceId: string;
  startedAt: string;
  completedAt: string | null;
  finalizationOperationId: string | null;
  createdAt: string;
}

export interface InventoryReconciliationLineRow {
  id: string;
  reconciliationId: string;
  storeId: string;
  storeProductId: string;
  recordedBaseUnitsSnapshot: string;
  initialInventoryWatermark: string;
  initialBatchWatermark: string;
  physicalBaseUnits: string | null;
  differenceBaseUnits: string | null;
  reasonCode: string | null;
  note: string | null;
  adjustmentId: string | null;
  adjustmentInventoryEventId: string | null;
  createdAt: string;
}

export interface InventoryReconciliationSubmissionRow {
  id: string;
  reconciliationLineId: string;
  storeId: string;
  storeProductId: string;
  submissionType: ReconciliationSubmissionType;
  recordedBaseUnitsSnapshot: string;
  physicalBaseUnits: string;
  differenceBaseUnits: string;
  inventoryWatermark: string;
  batchWatermark: string;
  completeGroupCount: boolean;
  reasonCode: string | null;
  note: string | null;
  createdByStoreMemberId: string;
  createdByUserId: string;
  deviceId: string;
  createdAt: string;
}

export interface InventoryReconciliationGroupCountRow {
  id: string;
  submissionId: string;
  storeId: string;
  storeProductId: string;
  groupId: string | null;
  physicalBaseUnits: string;
  lineOrder: number;
  createdAt: string;
}

export interface CreateInventoryReconciliationInput {
  id: string;
  storeId: string;
  createdByStoreMemberId: string;
  createdByUserId: string;
  deviceId: string;
  startedAt: string;
  createdAt?: string;
}

export interface CreateInventoryReconciliationLineInput {
  id: string;
  reconciliationId: string;
  storeId: string;
  storeProductId: string;
  recordedBaseUnitsSnapshot: string | number | bigint;
  initialInventoryWatermark: string;
  initialBatchWatermark: string;
  createdAt?: string;
}

export interface CreateInventoryReconciliationSubmissionInput {
  id: string;
  reconciliationLineId: string;
  storeId: string;
  storeProductId: string;
  submissionType: ReconciliationSubmissionType;
  recordedBaseUnitsSnapshot: string | number | bigint;
  physicalBaseUnits: string | number | bigint;
  differenceBaseUnits: string | number | bigint;
  inventoryWatermark: string;
  batchWatermark: string;
  completeGroupCount: boolean;
  reasonCode?: string | null;
  note?: string | null;
  createdByStoreMemberId: string;
  createdByUserId: string;
  deviceId: string;
  createdAt?: string;
}

export interface CreateInventoryReconciliationGroupCountInput {
  id: string;
  submissionId: string;
  storeId: string;
  storeProductId: string;
  groupId?: string | null;
  physicalBaseUnits: string | number | bigint;
  lineOrder: number;
  createdAt?: string;
}

type Row = Record<string, string | number | null>;

const RECONCILIATION_COLUMNS =
  'id, store_id, status, created_by_store_member_id, created_by_user_id, device_id, ' +
  'started_at, completed_at, finalization_operation_id, created_at';
const LINE_COLUMNS =
  'id, reconciliation_id, store_id, store_product_id, recorded_base_units_snapshot, ' +
  'initial_inventory_watermark, initial_batch_watermark, physical_base_units, difference_base_units, ' +
  'reason_code, note, adjustment_id, adjustment_inventory_event_id, created_at';
const SUBMISSION_COLUMNS =
  'id, reconciliation_line_id, store_id, store_product_id, submission_type, ' +
  'recorded_base_units_snapshot, physical_base_units, difference_base_units, inventory_watermark, ' +
  'batch_watermark, complete_group_count, reason_code, note, created_by_store_member_id, ' +
  'created_by_user_id, device_id, created_at';
const GROUP_COUNT_COLUMNS =
  'id, submission_id, store_id, store_product_id, group_id, physical_base_units, line_order, created_at';

function canonicalInteger(value: string | number | bigint, field: string, nonnegative = false): string {
  const text = String(value);
  if (!/^-?\d+$/.test(text)) throw new DomainError('INVALID_QUANTITY', `${field} must be an integer.`);
  let parsed: bigint;
  try {
    parsed = BigInt(text);
  } catch {
    throw new DomainError('INVALID_QUANTITY', `${field} must be an integer.`);
  }
  if (nonnegative && parsed < 0n) throw new DomainError('INVALID_QUANTITY', `${field} cannot be negative.`);
  return parsed.toString();
}

function mapReconciliation(row: Row): InventoryReconciliationRow {
  return {
    id: row.id as string,
    storeId: row.store_id as string,
    status: row.status as InventoryReconciliationStatus,
    createdByStoreMemberId: row.created_by_store_member_id as string,
    createdByUserId: row.created_by_user_id as string,
    deviceId: row.device_id as string,
    startedAt: row.started_at as string,
    completedAt: (row.completed_at as string | null) ?? null,
    finalizationOperationId: (row.finalization_operation_id as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

function mapLine(row: Row): InventoryReconciliationLineRow {
  return {
    id: row.id as string,
    reconciliationId: row.reconciliation_id as string,
    storeId: row.store_id as string,
    storeProductId: row.store_product_id as string,
    recordedBaseUnitsSnapshot: String(row.recorded_base_units_snapshot),
    initialInventoryWatermark: row.initial_inventory_watermark as string,
    initialBatchWatermark: row.initial_batch_watermark as string,
    physicalBaseUnits: row.physical_base_units === null ? null : String(row.physical_base_units),
    differenceBaseUnits: row.difference_base_units === null ? null : String(row.difference_base_units),
    reasonCode: (row.reason_code as string | null) ?? null,
    note: (row.note as string | null) ?? null,
    adjustmentId: (row.adjustment_id as string | null) ?? null,
    adjustmentInventoryEventId: (row.adjustment_inventory_event_id as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

function mapSubmission(row: Row): InventoryReconciliationSubmissionRow {
  return {
    id: row.id as string,
    reconciliationLineId: row.reconciliation_line_id as string,
    storeId: row.store_id as string,
    storeProductId: row.store_product_id as string,
    submissionType: row.submission_type as ReconciliationSubmissionType,
    recordedBaseUnitsSnapshot: String(row.recorded_base_units_snapshot),
    physicalBaseUnits: String(row.physical_base_units),
    differenceBaseUnits: String(row.difference_base_units),
    inventoryWatermark: row.inventory_watermark as string,
    batchWatermark: row.batch_watermark as string,
    completeGroupCount: row.complete_group_count === 1,
    reasonCode: (row.reason_code as string | null) ?? null,
    note: (row.note as string | null) ?? null,
    createdByStoreMemberId: row.created_by_store_member_id as string,
    createdByUserId: row.created_by_user_id as string,
    deviceId: row.device_id as string,
    createdAt: row.created_at as string,
  };
}

function mapGroupCount(row: Row): InventoryReconciliationGroupCountRow {
  return {
    id: row.id as string,
    submissionId: row.submission_id as string,
    storeId: row.store_id as string,
    storeProductId: row.store_product_id as string,
    groupId: (row.group_id as string | null) ?? null,
    physicalBaseUnits: String(row.physical_base_units),
    lineOrder: row.line_order as number,
    createdAt: row.created_at as string,
  };
}

export function createInventoryReconciliation(
  adapter: DatabaseAdapter,
  input: CreateInventoryReconciliationInput,
): InventoryReconciliationRow {
  const startedAt = requireText(input.startedAt, 'startedAt', 64);
  const createdAt = input.createdAt ?? nowIso();
  adapter.run(
    `INSERT INTO inventory_reconciliations
      (id, store_id, status, created_by_store_member_id, created_by_user_id, device_id, started_at, created_at)
     VALUES (?, ?, 'IN_PROGRESS', ?, ?, ?, ?, ?);`,
    [requireId(input.id), requireId(input.storeId), requireId(input.createdByStoreMemberId), requireId(input.createdByUserId), requireId(input.deviceId), startedAt, createdAt],
  );
  const row = getInventoryReconciliationById(adapter, input.id);
  if (!row) throw new Error('Inventory reconciliation insert did not persist.');
  return row;
}

export function getInventoryReconciliationById(adapter: DatabaseAdapter, id: string): InventoryReconciliationRow | null {
  const row = adapter.getFirstRow<Row>(`SELECT ${RECONCILIATION_COLUMNS} FROM inventory_reconciliations WHERE id = ?;`, [requireId(id)]);
  return row ? mapReconciliation(row) : null;
}

export function createInventoryReconciliationLine(
  adapter: DatabaseAdapter,
  input: CreateInventoryReconciliationLineInput,
): InventoryReconciliationLineRow {
  adapter.run(
    `INSERT INTO inventory_reconciliation_lines
      (id, reconciliation_id, store_id, store_product_id, recorded_base_units_snapshot,
       initial_inventory_watermark, initial_batch_watermark, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      requireId(input.id), requireId(input.reconciliationId), requireId(input.storeId), requireId(input.storeProductId),
      canonicalInteger(input.recordedBaseUnitsSnapshot, 'recordedBaseUnitsSnapshot'),
      requireText(input.initialInventoryWatermark, 'initialInventoryWatermark', 256),
      requireText(input.initialBatchWatermark, 'initialBatchWatermark', 256),
      input.createdAt ?? nowIso(),
    ],
  );
  const row = getInventoryReconciliationLineById(adapter, input.id);
  if (!row) throw new Error('Inventory reconciliation line insert did not persist.');
  return row;
}

export function getInventoryReconciliationLineById(adapter: DatabaseAdapter, id: string): InventoryReconciliationLineRow | null {
  const row = adapter.getFirstRow<Row>(`SELECT ${LINE_COLUMNS} FROM inventory_reconciliation_lines WHERE id = ?;`, [requireId(id)]);
  return row ? mapLine(row) : null;
}

export function listInventoryReconciliationLinesByReconciliation(
  adapter: DatabaseAdapter,
  reconciliationId: string,
): InventoryReconciliationLineRow[] {
  return adapter.getAllRows<Row>(
    `SELECT ${LINE_COLUMNS} FROM inventory_reconciliation_lines WHERE reconciliation_id = ? ORDER BY created_at ASC, id ASC;`,
    [requireId(reconciliationId)],
  ).map(mapLine);
}

export function createInventoryReconciliationSubmission(
  adapter: DatabaseAdapter,
  input: CreateInventoryReconciliationSubmissionInput,
): InventoryReconciliationSubmissionRow {
  if (input.submissionType !== 'FIRST' && input.submissionType !== 'RECOUNT') {
    throw new DomainError('INVALID_VALUE', 'Reconciliation submission type is invalid.');
  }
  const recorded = canonicalInteger(input.recordedBaseUnitsSnapshot, 'recordedBaseUnitsSnapshot');
  const physical = canonicalInteger(input.physicalBaseUnits, 'physicalBaseUnits', true);
  const difference = canonicalInteger(input.differenceBaseUnits, 'differenceBaseUnits');
  if (BigInt(physical) - BigInt(recorded) !== BigInt(difference)) {
    throw new DomainError('INVALID_QUANTITY', 'Reconciliation difference does not match its snapshots.');
  }
  adapter.run(
    `INSERT INTO inventory_reconciliation_submissions
      (id, reconciliation_line_id, store_id, store_product_id, submission_type,
       recorded_base_units_snapshot, physical_base_units, difference_base_units,
       inventory_watermark, batch_watermark, complete_group_count, reason_code, note,
       created_by_store_member_id, created_by_user_id, device_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      requireId(input.id), requireId(input.reconciliationLineId), requireId(input.storeId), requireId(input.storeProductId), input.submissionType,
      recorded, physical, difference, requireText(input.inventoryWatermark, 'inventoryWatermark', 256), requireText(input.batchWatermark, 'batchWatermark', 256),
      input.completeGroupCount ? 1 : 0, optionalText(input.reasonCode, 'reasonCode', 64), optionalText(input.note, 'note', 500),
      requireId(input.createdByStoreMemberId), requireId(input.createdByUserId), requireId(input.deviceId), input.createdAt ?? nowIso(),
    ],
  );
  const row = getInventoryReconciliationSubmissionById(adapter, input.id);
  if (!row) throw new Error('Inventory reconciliation submission insert did not persist.');
  return row;
}

export function getInventoryReconciliationSubmissionById(adapter: DatabaseAdapter, id: string): InventoryReconciliationSubmissionRow | null {
  const row = adapter.getFirstRow<Row>(`SELECT ${SUBMISSION_COLUMNS} FROM inventory_reconciliation_submissions WHERE id = ?;`, [requireId(id)]);
  return row ? mapSubmission(row) : null;
}

export function listInventoryReconciliationSubmissionsByLine(
  adapter: DatabaseAdapter,
  reconciliationLineId: string,
): InventoryReconciliationSubmissionRow[] {
  return adapter.getAllRows<Row>(
    `SELECT ${SUBMISSION_COLUMNS} FROM inventory_reconciliation_submissions WHERE reconciliation_line_id = ? ORDER BY created_at ASC, id ASC;`,
    [requireId(reconciliationLineId)],
  ).map(mapSubmission);
}

export function createInventoryReconciliationGroupCount(
  adapter: DatabaseAdapter,
  input: CreateInventoryReconciliationGroupCountInput,
): InventoryReconciliationGroupCountRow {
  if (!Number.isSafeInteger(input.lineOrder) || input.lineOrder <= 0) throw new DomainError('INVALID_VALUE', 'Group count line order must be positive.');
  adapter.run(
    `INSERT INTO inventory_reconciliation_group_counts
      (id, submission_id, store_id, store_product_id, group_id, physical_base_units, line_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      requireId(input.id), requireId(input.submissionId), requireId(input.storeId), requireId(input.storeProductId), optionalId(input.groupId),
      canonicalInteger(input.physicalBaseUnits, 'group physicalBaseUnits', true), input.lineOrder, input.createdAt ?? nowIso(),
    ],
  );
  const row = getInventoryReconciliationGroupCountById(adapter, input.id);
  if (!row) throw new Error('Inventory reconciliation group count insert did not persist.');
  return row;
}

export function getInventoryReconciliationGroupCountById(adapter: DatabaseAdapter, id: string): InventoryReconciliationGroupCountRow | null {
  const row = adapter.getFirstRow<Row>(`SELECT ${GROUP_COUNT_COLUMNS} FROM inventory_reconciliation_group_counts WHERE id = ?;`, [requireId(id)]);
  return row ? mapGroupCount(row) : null;
}

export function listInventoryReconciliationGroupCountsBySubmission(
  adapter: DatabaseAdapter,
  submissionId: string,
): InventoryReconciliationGroupCountRow[] {
  return adapter.getAllRows<Row>(
    `SELECT ${GROUP_COUNT_COLUMNS} FROM inventory_reconciliation_group_counts WHERE submission_id = ? ORDER BY line_order ASC, id ASC;`,
    [requireId(submissionId)],
  ).map(mapGroupCount);
}

export function getLatestInventoryReconciliationSubmission(
  adapter: DatabaseAdapter,
  reconciliationLineId: string,
): InventoryReconciliationSubmissionRow | null {
  const row = adapter.getFirstRow<Row>(
    `SELECT ${SUBMISSION_COLUMNS} FROM inventory_reconciliation_submissions
     WHERE reconciliation_line_id = ? ORDER BY created_at DESC, id DESC LIMIT 1;`,
    [requireId(reconciliationLineId)],
  );
  return row ? mapSubmission(row) : null;
}

export function finalizeInventoryReconciliationLine(
  adapter: DatabaseAdapter,
  input: {
    id: string;
    physicalBaseUnits: string | number | bigint;
    differenceBaseUnits: string | number | bigint;
    reasonCode?: string | null;
    note?: string | null;
    adjustmentId?: string | null;
    adjustmentInventoryEventId?: string | null;
  },
): InventoryReconciliationLineRow {
  adapter.run(
    `UPDATE inventory_reconciliation_lines
     SET physical_base_units = ?, difference_base_units = ?, reason_code = ?, note = ?,
         adjustment_id = ?, adjustment_inventory_event_id = ?
     WHERE id = ?;`,
    [
      canonicalInteger(input.physicalBaseUnits, 'physicalBaseUnits', true),
      canonicalInteger(input.differenceBaseUnits, 'differenceBaseUnits'),
      optionalText(input.reasonCode, 'reasonCode', 64), optionalText(input.note, 'note', 500),
      optionalId(input.adjustmentId), optionalId(input.adjustmentInventoryEventId), requireId(input.id),
    ],
  );
  const row = getInventoryReconciliationLineById(adapter, input.id);
  if (!row) throw new Error('Finalized reconciliation line was not found.');
  return row;
}

export function completeInventoryReconciliation(
  adapter: DatabaseAdapter,
  input: { id: string; finalizationOperationId: string; completedAt: string },
): InventoryReconciliationRow {
  const result = adapter.run(
    `UPDATE inventory_reconciliations
     SET status = 'COMPLETED', completed_at = ?, finalization_operation_id = ?
     WHERE id = ? AND status = 'IN_PROGRESS';`,
    [requireText(input.completedAt, 'completedAt', 64), requireId(input.finalizationOperationId), requireId(input.id)],
  );
  if (result.changes !== 1) throw new DomainError('INVALID_VALUE', 'This reconciliation is no longer open.');
  const row = getInventoryReconciliationById(adapter, input.id);
  if (!row) throw new Error('Completed reconciliation was not found.');
  return row;
}

export function cancelInventoryReconciliation(
  adapter: DatabaseAdapter,
  input: { id: string; completedAt: string },
): InventoryReconciliationRow {
  const result = adapter.run(
    `UPDATE inventory_reconciliations
     SET status = 'CANCELLED', completed_at = ?
     WHERE id = ? AND status = 'IN_PROGRESS';`,
    [requireText(input.completedAt, 'completedAt', 64), requireId(input.id)],
  );
  if (result.changes !== 1) throw new DomainError('INVALID_VALUE', 'This reconciliation is no longer open.');
  const row = getInventoryReconciliationById(adapter, input.id);
  if (!row) throw new Error('Cancelled reconciliation was not found.');
  return row;
}
