import { DomainError } from '@retail/domain';

import type { DatabaseAdapter } from '../adapter';
import { nowIso, optionalId, optionalMicros, optionalText, requireId, requireText } from './common';

export type InventoryAdjustmentReason = 'EXPIRED' | 'DAMAGED' | 'MISSING' | 'PERSONAL_USE' | 'CORRECTION' | 'CUSTOMER_RETURN' | 'SUPPLIER_RETURN';

export interface InventoryAdjustmentRow {
  id: string;
  storeId: string;
  operationId: string;
  reasonCode: InventoryAdjustmentReason;
  note: string | null;
  occurredAt: string;
  createdByStoreMemberId: string;
  createdByUserId: string;
  deviceId: string;
  createdAt: string;
}

export interface InventoryAdjustmentLineRow {
  id: string;
  adjustmentId: string;
  storeId: string;
  storeProductId: string;
  groupId: string | null;
  inventoryEventId: string;
  packageUnitId: string | null;
  quantityPackageSnapshotMicros: number | null;
  conversionToBaseSnapshotMicros: number | null;
  quantityBaseDeltaMicros: number;
  lineOrder: number;
  createdAt: string;
}

export interface CreateInventoryAdjustmentInput {
  id: string;
  storeId: string;
  operationId: string;
  reasonCode: InventoryAdjustmentReason;
  note?: string | null;
  occurredAt: string;
  createdByStoreMemberId: string;
  createdByUserId: string;
  deviceId: string;
  createdAt?: string;
}

export interface CreateInventoryAdjustmentLineInput {
  id: string;
  adjustmentId: string;
  storeId: string;
  storeProductId: string;
  groupId?: string | null;
  inventoryEventId: string;
  packageUnitId?: string | null;
  quantityPackageSnapshotMicros?: number | null;
  conversionToBaseSnapshotMicros?: number | null;
  quantityBaseDeltaMicros: number;
  lineOrder: number;
  createdAt?: string;
}

type Row = Record<string, string | number | null>;

const ADJUSTMENT_COLUMNS = 'id, store_id, operation_id, reason_code, note, occurred_at, created_by_store_member_id, created_by_user_id, device_id, created_at';
const LINE_COLUMNS = 'id, adjustment_id, store_id, store_product_id, group_id, inventory_event_id, package_unit_id, quantity_package_snapshot_micros, conversion_to_base_snapshot_micros, quantity_base_delta_micros, line_order, created_at';
const REASONS: readonly InventoryAdjustmentReason[] = ['EXPIRED', 'DAMAGED', 'MISSING', 'PERSONAL_USE', 'CORRECTION', 'CUSTOMER_RETURN', 'SUPPLIER_RETURN'];

function mapAdjustment(row: Row): InventoryAdjustmentRow {
  return {
    id: row.id as string,
    storeId: row.store_id as string,
    operationId: row.operation_id as string,
    reasonCode: row.reason_code as InventoryAdjustmentReason,
    note: row.note as string | null,
    occurredAt: row.occurred_at as string,
    createdByStoreMemberId: row.created_by_store_member_id as string,
    createdByUserId: row.created_by_user_id as string,
    deviceId: row.device_id as string,
    createdAt: row.created_at as string,
  };
}

function mapLine(row: Row): InventoryAdjustmentLineRow {
  return {
    id: row.id as string,
    adjustmentId: row.adjustment_id as string,
    storeId: row.store_id as string,
    storeProductId: row.store_product_id as string,
    groupId: row.group_id as string | null,
    inventoryEventId: row.inventory_event_id as string,
    packageUnitId: row.package_unit_id as string | null,
    quantityPackageSnapshotMicros: row.quantity_package_snapshot_micros as number | null,
    conversionToBaseSnapshotMicros: row.conversion_to_base_snapshot_micros as number | null,
    quantityBaseDeltaMicros: row.quantity_base_delta_micros as number,
    lineOrder: row.line_order as number,
    createdAt: row.created_at as string,
  };
}

export function createInventoryAdjustment(adapter: DatabaseAdapter, input: CreateInventoryAdjustmentInput): InventoryAdjustmentRow {
  if (!REASONS.includes(input.reasonCode)) throw new DomainError('INVALID_VALUE', 'Adjustment reason is invalid.');
  adapter.run(
    `INSERT INTO inventory_adjustments
      (id, store_id, operation_id, reason_code, note, occurred_at,
       created_by_store_member_id, created_by_user_id, device_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      requireId(input.id), requireId(input.storeId), requireId(input.operationId), input.reasonCode,
      optionalText(input.note, 'note', 500), requireText(input.occurredAt, 'occurredAt', 64),
      requireId(input.createdByStoreMemberId), requireId(input.createdByUserId), requireId(input.deviceId), input.createdAt ?? nowIso(),
    ],
  );
  const row = adapter.getFirstRow<Row>(`SELECT ${ADJUSTMENT_COLUMNS} FROM inventory_adjustments WHERE id = ?;`, [input.id]);
  if (!row) throw new Error('Inventory adjustment insert did not persist.');
  return mapAdjustment(row);
}

export function getInventoryAdjustmentById(adapter: DatabaseAdapter, id: string): InventoryAdjustmentRow | null {
  const row = adapter.getFirstRow<Row>(`SELECT ${ADJUSTMENT_COLUMNS} FROM inventory_adjustments WHERE id = ?;`, [requireId(id)]);
  return row ? mapAdjustment(row) : null;
}

export function createInventoryAdjustmentLine(adapter: DatabaseAdapter, input: CreateInventoryAdjustmentLineInput): InventoryAdjustmentLineRow {
  const quantityPackageSnapshotMicros = optionalMicros(input.quantityPackageSnapshotMicros, 'quantityPackageSnapshotMicros');
  const conversionToBaseSnapshotMicros = optionalMicros(input.conversionToBaseSnapshotMicros, 'conversionToBaseSnapshotMicros');
  if ((quantityPackageSnapshotMicros === null) !== (conversionToBaseSnapshotMicros === null) ||
      (input.packageUnitId === undefined || input.packageUnitId === null) !== (quantityPackageSnapshotMicros === null)) {
    throw new DomainError('INVALID_VALUE', 'Package adjustment snapshots must include package, quantity, and conversion together.');
  }
  if (!Number.isSafeInteger(input.quantityBaseDeltaMicros) || input.quantityBaseDeltaMicros === 0) {
    throw new DomainError('INVALID_QUANTITY', 'Adjustment line quantity must be a non-zero safe integer.');
  }
  if (!Number.isSafeInteger(input.lineOrder) || input.lineOrder <= 0) throw new DomainError('INVALID_VALUE', 'Adjustment line order must be positive.');
  adapter.run(
    `INSERT INTO inventory_adjustment_lines
      (id, adjustment_id, store_id, store_product_id, group_id, inventory_event_id,
       package_unit_id, quantity_package_snapshot_micros, conversion_to_base_snapshot_micros,
       quantity_base_delta_micros, line_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      requireId(input.id), requireId(input.adjustmentId), requireId(input.storeId), requireId(input.storeProductId), optionalId(input.groupId),
      requireId(input.inventoryEventId), optionalId(input.packageUnitId), quantityPackageSnapshotMicros, conversionToBaseSnapshotMicros,
      input.quantityBaseDeltaMicros, input.lineOrder, input.createdAt ?? nowIso(),
    ],
  );
  const row = adapter.getFirstRow<Row>(`SELECT ${LINE_COLUMNS} FROM inventory_adjustment_lines WHERE id = ?;`, [input.id]);
  if (!row) throw new Error('Inventory adjustment line insert did not persist.');
  return mapLine(row);
}

export function listInventoryAdjustmentLinesByAdjustment(adapter: DatabaseAdapter, adjustmentId: string): InventoryAdjustmentLineRow[] {
  return adapter.getAllRows<Row>(
    `SELECT ${LINE_COLUMNS} FROM inventory_adjustment_lines WHERE adjustment_id = ? ORDER BY line_order ASC;`,
    [requireId(adjustmentId)],
  ).map(mapLine);
}
