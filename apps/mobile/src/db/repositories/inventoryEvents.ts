import { convertPackagesToBase, DomainError } from '@retail/domain';

import type { DatabaseAdapter } from '../adapter';
import {
  nowIso,
  optionalId,
  optionalMicros,
  optionalText,
  requireId,
  requireText,
} from './common';

export type InventoryEventType =
  | 'PURCHASE'
  | 'SALE'
  | 'CUSTOMER_RETURN'
  | 'SUPPLIER_RETURN'
  | 'DAMAGED'
  | 'EXPIRED'
  | 'MISSING'
  | 'PERSONAL_USE'
  | 'CORRECTION'
  | 'OPENING_BALANCE';

export type InventorySourceType =
  | 'SALE'
  | 'PURCHASE'
  | 'RECONCILIATION'
  | 'MANUAL_ADJUSTMENT'
  | 'OPENING_BALANCE';

export interface InventoryEventRow {
  id: string;
  storeId: string;
  storeProductId: string;
  eventType: InventoryEventType;
  quantityBaseDeltaMicros: number;
  packageUnitId: string | null;
  quantityPackageSnapshotMicros: number | null;
  conversionToBaseSnapshotMicros: number | null;
  sourceType: InventorySourceType;
  sourceId: string | null;
  reasonCode: string | null;
  note: string | null;
  occurredAt: string;
  createdByUserId: string;
  deviceId: string;
  createdAt: string;
}

export interface CreateInventoryEventInput {
  id: string;
  storeId: string;
  storeProductId: string;
  eventType: InventoryEventType;
  quantityBaseDeltaMicros: number;
  packageUnitId?: string | null;
  quantityPackageSnapshotMicros?: number | null;
  conversionToBaseSnapshotMicros?: number | null;
  sourceType: InventorySourceType;
  sourceId?: string | null;
  reasonCode?: string | null;
  note?: string | null;
  occurredAt: string;
  createdByUserId: string;
  deviceId: string;
  createdAt?: string;
}

type InventoryEventRecord = Record<string, string | number | null>;

function mapRow(row: InventoryEventRecord): InventoryEventRow {
  return {
    id: row.id as string,
    storeId: row.store_id as string,
    storeProductId: row.store_product_id as string,
    eventType: row.event_type as InventoryEventType,
    quantityBaseDeltaMicros: row.quantity_base_delta_micros as number,
    packageUnitId: (row.package_unit_id as string | null) ?? null,
    quantityPackageSnapshotMicros: (row.quantity_package_snapshot_micros as number | null) ?? null,
    conversionToBaseSnapshotMicros: (row.conversion_to_base_snapshot_micros as number | null) ?? null,
    sourceType: row.source_type as InventorySourceType,
    sourceId: (row.source_id as string | null) ?? null,
    reasonCode: (row.reason_code as string | null) ?? null,
    note: (row.note as string | null) ?? null,
    occurredAt: row.occurred_at as string,
    createdByUserId: row.created_by_user_id as string,
    deviceId: row.device_id as string,
    createdAt: row.created_at as string,
  };
}

const COLUMNS =
  'id, store_id, store_product_id, event_type, quantity_base_delta_micros, ' +
  'package_unit_id, quantity_package_snapshot_micros, conversion_to_base_snapshot_micros, ' +
  'source_type, source_id, reason_code, note, occurred_at, created_by_user_id, ' +
  'device_id, created_at';

const VALID_EVENT_TYPES: ReadonlySet<InventoryEventType> = new Set([
  'PURCHASE',
  'SALE',
  'CUSTOMER_RETURN',
  'SUPPLIER_RETURN',
  'DAMAGED',
  'EXPIRED',
  'MISSING',
  'PERSONAL_USE',
  'CORRECTION',
  'OPENING_BALANCE',
]);

const VALID_SOURCE_TYPES: ReadonlySet<InventorySourceType> = new Set([
  'SALE',
  'PURCHASE',
  'RECONCILIATION',
  'MANUAL_ADJUSTMENT',
  'OPENING_BALANCE',
]);

export function createInventoryEvent(
  adapter: DatabaseAdapter,
  input: CreateInventoryEventInput,
): InventoryEventRow {
  const id = requireId(input.id);
  const storeId = requireId(input.storeId);
  const storeProductId = requireId(input.storeProductId);
  const createdByUserId = requireId(input.createdByUserId);
  const deviceId = requireId(input.deviceId);

  if (!VALID_EVENT_TYPES.has(input.eventType)) {
    throw new DomainError('INVALID_VALUE', `Unsupported inventory event type: ${input.eventType}`);
  }

  if (!VALID_SOURCE_TYPES.has(input.sourceType)) {
    throw new DomainError('INVALID_VALUE', `Unsupported inventory source type: ${input.sourceType}`);
  }

  if (typeof input.quantityBaseDeltaMicros !== 'number' || !Number.isSafeInteger(input.quantityBaseDeltaMicros)) {
    throw new DomainError('INVALID_QUANTITY', 'Inventory delta must be a safe integer in micro-units.');
  }

  const packageUnitId = optionalId(input.packageUnitId);
  const quantityPackageSnapshotMicros = optionalMicros(
    input.quantityPackageSnapshotMicros,
    'quantityPackageSnapshotMicros',
  );
  const conversionToBaseSnapshotMicros = optionalMicros(
    input.conversionToBaseSnapshotMicros,
    'conversionToBaseSnapshotMicros',
  );

  const sourceId = optionalText(input.sourceId, 'sourceId', 64);
  const reasonCode = optionalText(input.reasonCode, 'reasonCode', 64);
  const note = optionalText(input.note, 'note', 500);
  const occurredAt = requireText(input.occurredAt, 'occurredAt', 64);
  const createdAt = input.createdAt ?? nowIso();

  if (input.eventType === 'SALE') {
    if (
      input.sourceType !== 'SALE' ||
      sourceId === null ||
      packageUnitId === null ||
      quantityPackageSnapshotMicros === null ||
      conversionToBaseSnapshotMicros === null ||
      input.quantityBaseDeltaMicros >= 0
    ) {
      throw new DomainError(
        'INVALID_VALUE',
        'A sale inventory event requires a negative, sourced package snapshot.',
      );
    }

    const quantityBaseMicros = convertPackagesToBase(
      quantityPackageSnapshotMicros,
      conversionToBaseSnapshotMicros,
    );
    if (input.quantityBaseDeltaMicros !== -quantityBaseMicros) {
      throw new DomainError(
        'INVALID_QUANTITY',
        'A sale inventory event delta must exactly match its package conversion snapshot.',
      );
    }
  }

  adapter.run(
    `INSERT INTO inventory_events
      (id, store_id, store_product_id, event_type, quantity_base_delta_micros,
       package_unit_id, quantity_package_snapshot_micros, conversion_to_base_snapshot_micros,
       source_type, source_id, reason_code, note, occurred_at, created_by_user_id,
       device_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      id,
      storeId,
      storeProductId,
      input.eventType,
      input.quantityBaseDeltaMicros,
      packageUnitId,
      quantityPackageSnapshotMicros,
      conversionToBaseSnapshotMicros,
      input.sourceType,
      sourceId,
      reasonCode,
      note,
      occurredAt,
      createdByUserId,
      deviceId,
      createdAt,
    ],
  );

  const row = adapter.getFirstRow<InventoryEventRecord>(
    `SELECT ${COLUMNS} FROM inventory_events WHERE id = ?;`,
    [id],
  );
  if (!row) {
    throw new Error('Inventory event insert did not persist.');
  }
  return mapRow(row);
}

export function listInventoryEventsByStoreProduct(
  adapter: DatabaseAdapter,
  storeProductId: string,
): InventoryEventRow[] {
  return adapter
    .getAllRows<InventoryEventRecord>(
      `SELECT ${COLUMNS} FROM inventory_events WHERE store_product_id = ? ORDER BY occurred_at ASC, created_at ASC;`,
      [requireId(storeProductId)],
    )
    .map(mapRow);
}

export function listInventoryEventsBySource(
  adapter: DatabaseAdapter,
  sourceType: InventorySourceType,
  sourceId: string,
): InventoryEventRow[] {
  return adapter
    .getAllRows<InventoryEventRecord>(
      `SELECT ${COLUMNS} FROM inventory_events WHERE source_type = ? AND source_id = ? ORDER BY rowid ASC;`,
      [sourceType, requireId(sourceId)],
    )
    .map(mapRow);
}

/**
 * Reconstruct current stock in base-unit micro-units by summing all InventoryEvents.
 * Under D-013, negative derived stock is preserved as an honest reconciliation signal.
 */
export function getInventoryBalanceByStoreProduct(
  adapter: DatabaseAdapter,
  storeProductId: string,
): number {
  const row = adapter.getFirstRow<{ balance: number | null }>(
    `SELECT COALESCE(SUM(quantity_base_delta_micros), 0) AS balance
     FROM inventory_events
     WHERE store_product_id = ?;`,
    [requireId(storeProductId)],
  );
  return row?.balance ?? 0;
}
