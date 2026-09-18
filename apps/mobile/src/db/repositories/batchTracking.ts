import { DomainError, normalizeBatchDate, type BatchDateMeaning, type BatchDatePrecision, type BatchGroupOrigin } from '@retail/domain';

import type { DatabaseAdapter } from '../adapter';
import { nowIso, optionalId, optionalText, requireId, requirePositiveMicros, requireText } from './common';

export type BatchOperationKind = 'EVENT_ALLOCATION' | 'CLASSIFICATION' | 'ADJUSTMENT' | 'RECONCILIATION';
export type BatchSourceType = 'SALE' | 'PURCHASE' | 'MANUAL_ADJUSTMENT' | 'RECONCILIATION' | 'PHYSICAL_INSPECTION';
export type BatchEntryType = 'RECEIPT' | 'DEFICIT_OFFSET' | 'ASSUMED_FEFO' | 'UNKNOWN_RESIDUAL' | 'CLASSIFICATION' | 'ADJUSTMENT';

export interface InventoryBatchGroupRow {
  id: string;
  storeId: string;
  storeProductId: string;
  origin: BatchGroupOrigin;
  purchaseItemId: string | null;
  quantityReceivedBaseMicros: number | null;
  printedBatchNumber: string | null;
  datePrecision: BatchDatePrecision;
  dateValue: string | null;
  dateMeaning: BatchDateMeaning;
  evidenceSource: 'RECEIPT' | 'PHYSICAL_INSPECTION';
  recordedByStoreMemberId: string;
  recordedByUserId: string;
  deviceId: string;
  originOrder: number;
  createdAt: string;
}

export interface BatchInventoryOperationRow {
  id: string;
  storeId: string;
  storeProductId: string;
  kind: BatchOperationKind;
  inventoryEventId: string | null;
  sourceType: BatchSourceType;
  sourceId: string | null;
  policyVersion: string;
  evidenceVersion: string;
  inventoryWatermark: string | null;
  batchWatermark: string | null;
  recordedByStoreMemberId: string;
  recordedByUserId: string;
  deviceId: string;
  localApplicationOrder: number;
  createdAt: string;
  sealedAt: string | null;
  sealedEntryCount: number | null;
  sealedDeltaBaseMicros: string | null;
}

export interface BatchInventoryInspectionRow {
  operationId: string;
  storeId: string;
  storeProductId: string;
  requestJson: string;
  evidenceJson: string;
  inventoryWatermark: string;
  batchWatermark: string;
  recordedByStoreMemberId: string;
  recordedByUserId: string;
  deviceId: string;
  createdAt: string;
}

export interface BatchInventoryEntryRow {
  id: string;
  operationId: string;
  storeId: string;
  storeProductId: string;
  groupId: string | null;
  entryType: BatchEntryType;
  deltaBaseMicros: number;
  entryOrder: number;
  createdAt: string;
}

export interface CreateBatchGroupInput {
  id: string;
  storeId: string;
  storeProductId: string;
  origin: BatchGroupOrigin;
  purchaseItemId?: string | null;
  quantityReceivedBaseMicros?: number | null;
  printedBatchNumber?: string | null;
  datePrecision?: BatchDatePrecision;
  dateValue?: string | null;
  dateMeaning?: BatchDateMeaning;
  recordedByStoreMemberId: string;
  recordedByUserId: string;
  deviceId: string;
  originOrder?: number;
  createdAt?: string;
}

export interface CreateBatchOperationInput {
  id: string;
  storeId: string;
  storeProductId: string;
  kind: BatchOperationKind;
  inventoryEventId?: string | null;
  sourceType: BatchSourceType;
  sourceId?: string | null;
  policyVersion: string;
  evidenceVersion: string;
  inventoryWatermark?: string | null;
  batchWatermark?: string | null;
  recordedByStoreMemberId: string;
  recordedByUserId: string;
  deviceId: string;
  localApplicationOrder?: number;
  createdAt?: string;
}

export interface CreateBatchEntryInput {
  id: string;
  operationId: string;
  storeId: string;
  storeProductId: string;
  groupId?: string | null;
  entryType: BatchEntryType;
  deltaBaseMicros: number;
  entryOrder: number;
  createdAt?: string;
}

export interface CreateBatchInspectionInput {
  operationId: string;
  storeId: string;
  storeProductId: string;
  requestJson: string;
  evidenceJson: string;
  inventoryWatermark: string;
  batchWatermark: string;
  recordedByStoreMemberId: string;
  recordedByUserId: string;
  deviceId: string;
  createdAt?: string;
}

type Row = Record<string, string | number | null>;

const GROUP_COLUMNS =
  'id, store_id, store_product_id, origin, purchase_item_id, quantity_received_base_micros, ' +
  'printed_batch_number, date_precision, date_value, date_meaning, evidence_source, ' +
  'recorded_by_store_member_id, recorded_by_user_id, device_id, origin_order, created_at';
const BASE_OPERATION_COLUMNS =
  'id, store_id, store_product_id, kind, inventory_event_id, source_type, source_id, ' +
  'policy_version, evidence_version, inventory_watermark, batch_watermark, ' +
  'recorded_by_store_member_id, recorded_by_user_id, device_id, local_application_order, created_at';
const SEALING_OPERATION_COLUMNS = ', sealed_at, sealed_entry_count, sealed_delta_base_micros';
const INSPECTION_COLUMNS =
  'operation_id, store_id, store_product_id, request_json, evidence_json, inventory_watermark, ' +
  'batch_watermark, recorded_by_store_member_id, recorded_by_user_id, device_id, created_at';
const ENTRY_COLUMNS =
  'id, operation_id, store_id, store_product_id, group_id, entry_type, delta_base_micros, entry_order, created_at';

function mapGroup(row: Row): InventoryBatchGroupRow {
  return {
    id: row.id as string,
    storeId: row.store_id as string,
    storeProductId: row.store_product_id as string,
    origin: row.origin as BatchGroupOrigin,
    purchaseItemId: (row.purchase_item_id as string | null) ?? null,
    quantityReceivedBaseMicros: (row.quantity_received_base_micros as number | null) ?? null,
    printedBatchNumber: (row.printed_batch_number as string | null) ?? null,
    datePrecision: row.date_precision as BatchDatePrecision,
    dateValue: (row.date_value as string | null) ?? null,
    dateMeaning: row.date_meaning as BatchDateMeaning,
    evidenceSource: row.evidence_source as InventoryBatchGroupRow['evidenceSource'],
    recordedByStoreMemberId: row.recorded_by_store_member_id as string,
    recordedByUserId: row.recorded_by_user_id as string,
    deviceId: row.device_id as string,
    originOrder: row.origin_order as number,
    createdAt: row.created_at as string,
  };
}

function mapOperation(row: Row): BatchInventoryOperationRow {
  return {
    id: row.id as string,
    storeId: row.store_id as string,
    storeProductId: row.store_product_id as string,
    kind: row.kind as BatchOperationKind,
    inventoryEventId: (row.inventory_event_id as string | null) ?? null,
    sourceType: row.source_type as BatchSourceType,
    sourceId: (row.source_id as string | null) ?? null,
    policyVersion: row.policy_version as string,
    evidenceVersion: row.evidence_version as string,
    inventoryWatermark: (row.inventory_watermark as string | null) ?? null,
    batchWatermark: (row.batch_watermark as string | null) ?? null,
    recordedByStoreMemberId: row.recorded_by_store_member_id as string,
    recordedByUserId: row.recorded_by_user_id as string,
    deviceId: row.device_id as string,
    localApplicationOrder: row.local_application_order as number,
    createdAt: row.created_at as string,
    sealedAt: (row.sealed_at as string | null) ?? null,
    sealedEntryCount: (row.sealed_entry_count as number | null) ?? null,
    sealedDeltaBaseMicros: row.sealed_delta_base_micros === null || row.sealed_delta_base_micros === undefined
      ? null
      : String(row.sealed_delta_base_micros),
  };
}

function mapInspection(row: Row): BatchInventoryInspectionRow {
  return {
    operationId: row.operation_id as string,
    storeId: row.store_id as string,
    storeProductId: row.store_product_id as string,
    requestJson: row.request_json as string,
    evidenceJson: row.evidence_json as string,
    inventoryWatermark: row.inventory_watermark as string,
    batchWatermark: row.batch_watermark as string,
    recordedByStoreMemberId: row.recorded_by_store_member_id as string,
    recordedByUserId: row.recorded_by_user_id as string,
    deviceId: row.device_id as string,
    createdAt: row.created_at as string,
  };
}

function hasColumn(adapter: DatabaseAdapter, table: string, column: string): boolean {
  return adapter.getAllRows<{ name: string }>(`PRAGMA table_info(${table});`).some((row) => row.name === column);
}

function operationColumns(adapter: DatabaseAdapter): string {
  return BASE_OPERATION_COLUMNS + (hasColumn(adapter, 'batch_inventory_operations', 'sealed_at') ? SEALING_OPERATION_COLUMNS : '');
}

function mapEntry(row: Row): BatchInventoryEntryRow {
  return {
    id: row.id as string,
    operationId: row.operation_id as string,
    storeId: row.store_id as string,
    storeProductId: row.store_product_id as string,
    groupId: (row.group_id as string | null) ?? null,
    entryType: row.entry_type as BatchEntryType,
    deltaBaseMicros: row.delta_base_micros as number,
    entryOrder: row.entry_order as number,
    createdAt: row.created_at as string,
  };
}

function nextGroupOrder(adapter: DatabaseAdapter, storeProductId: string): number {
  const row = adapter.getFirstRow<{ max_order: number | null }>(
    'SELECT MAX(origin_order) AS max_order FROM inventory_batch_groups WHERE store_product_id = ?;',
    [requireId(storeProductId)],
  );
  const next = Number(row?.max_order ?? 0) + 1;
  if (!Number.isSafeInteger(next) || next <= 0) throw new DomainError('INVALID_VALUE', 'Batch group order exceeds the safe range.');
  return next;
}

function nextOperationOrder(adapter: DatabaseAdapter, storeProductId: string): number {
  const row = adapter.getFirstRow<{ max_order: number | null }>(
    'SELECT MAX(local_application_order) AS max_order FROM batch_inventory_operations WHERE store_product_id = ?;',
    [requireId(storeProductId)],
  );
  const next = Number(row?.max_order ?? 0) + 1;
  if (!Number.isSafeInteger(next) || next <= 0) throw new DomainError('INVALID_VALUE', 'Batch operation order exceeds the safe range.');
  return next;
}

export function createInventoryBatchGroup(adapter: DatabaseAdapter, input: CreateBatchGroupInput): InventoryBatchGroupRow {
  const id = requireId(input.id);
  const storeId = requireId(input.storeId);
  const storeProductId = requireId(input.storeProductId);
  const recordedByStoreMemberId = requireId(input.recordedByStoreMemberId);
  const recordedByUserId = requireId(input.recordedByUserId);
  const deviceId = requireId(input.deviceId);
  if (input.origin !== 'RECEIPT' && input.origin !== 'PHYSICAL_INSPECTION') {
    throw new DomainError('INVALID_VALUE', 'Batch group origin is invalid.');
  }
  const date = normalizeBatchDate({
    precision: input.datePrecision,
    value: input.dateValue,
    meaning: input.dateMeaning,
    printedBatchNumber: input.printedBatchNumber,
  });
  const purchaseItemId = optionalId(input.purchaseItemId);
  const quantityReceived = input.quantityReceivedBaseMicros === undefined || input.quantityReceivedBaseMicros === null
    ? null
    : requirePositiveMicros(input.quantityReceivedBaseMicros, 'quantityReceivedBaseMicros');
  if (input.origin === 'RECEIPT' && (!purchaseItemId || quantityReceived === null)) {
    throw new DomainError('INVALID_VALUE', 'Receipt batch groups require a purchase item and positive received quantity.');
  }
  if (input.origin === 'PHYSICAL_INSPECTION' && (purchaseItemId || quantityReceived !== null)) {
    throw new DomainError('INVALID_VALUE', 'Physical inspection groups cannot carry receipt facts.');
  }
  const printedBatchNumber = optionalText(date.printedBatchNumber, 'printedBatchNumber', 128);
  const originOrder = input.originOrder ?? nextGroupOrder(adapter, storeProductId);
  if (!Number.isSafeInteger(originOrder) || originOrder <= 0) throw new DomainError('INVALID_VALUE', 'Batch group order must be positive.');
  const createdAt = input.createdAt ?? nowIso();
  adapter.run(
    `INSERT INTO inventory_batch_groups
      (id, store_id, store_product_id, origin, purchase_item_id, quantity_received_base_micros,
       printed_batch_number, date_precision, date_value, date_meaning, evidence_source,
       recorded_by_store_member_id, recorded_by_user_id, device_id, origin_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      id,
      storeId,
      storeProductId,
      input.origin,
      purchaseItemId,
      quantityReceived,
      printedBatchNumber,
      date.precision,
      date.value,
      date.meaning,
      input.origin === 'RECEIPT' ? 'RECEIPT' : 'PHYSICAL_INSPECTION',
      recordedByStoreMemberId,
      recordedByUserId,
      deviceId,
      originOrder,
      createdAt,
    ],
  );
  const row = getInventoryBatchGroupById(adapter, id);
  if (!row) throw new Error('Inventory batch group insert did not persist.');
  return row;
}

export function getInventoryBatchGroupById(adapter: DatabaseAdapter, id: string): InventoryBatchGroupRow | null {
  const row = adapter.getFirstRow<Row>(`SELECT ${GROUP_COLUMNS} FROM inventory_batch_groups WHERE id = ?;`, [requireId(id)]);
  return row ? mapGroup(row) : null;
}

export function listInventoryBatchGroupsByStoreProduct(
  adapter: DatabaseAdapter,
  storeProductId: string,
): InventoryBatchGroupRow[] {
  return adapter
    .getAllRows<Row>(
      `SELECT ${GROUP_COLUMNS} FROM inventory_batch_groups WHERE store_product_id = ? ORDER BY origin_order ASC, id ASC;`,
      [requireId(storeProductId)],
    )
    .map(mapGroup);
}

export function createBatchInventoryOperation(
  adapter: DatabaseAdapter,
  input: CreateBatchOperationInput,
): BatchInventoryOperationRow {
  const id = requireId(input.id);
  const storeId = requireId(input.storeId);
  const storeProductId = requireId(input.storeProductId);
  const inventoryEventId = optionalId(input.inventoryEventId);
  const sourceId = optionalId(input.sourceId);
  if (input.kind === 'EVENT_ALLOCATION' && !inventoryEventId) {
    throw new DomainError('INVALID_VALUE', 'Event batch operations require an inventory event.');
  }
  if (input.kind !== 'EVENT_ALLOCATION' && inventoryEventId) {
    throw new DomainError('INVALID_VALUE', 'Only event allocation operations can reference an inventory event.');
  }
  const policyVersion = requireText(input.policyVersion, 'policyVersion', 64);
  const evidenceVersion = requireText(input.evidenceVersion, 'evidenceVersion', 64);
  const localApplicationOrder = input.localApplicationOrder ?? nextOperationOrder(adapter, storeProductId);
  if (!Number.isSafeInteger(localApplicationOrder) || localApplicationOrder <= 0) throw new DomainError('INVALID_VALUE', 'Batch operation order must be positive.');
  const createdAt = input.createdAt ?? nowIso();
  adapter.run(
    `INSERT INTO batch_inventory_operations
      (id, store_id, store_product_id, kind, inventory_event_id, source_type, source_id,
       policy_version, evidence_version, inventory_watermark, batch_watermark,
       recorded_by_store_member_id, recorded_by_user_id, device_id, local_application_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      id,
      storeId,
      storeProductId,
      input.kind,
      inventoryEventId,
      input.sourceType,
      sourceId,
      policyVersion,
      evidenceVersion,
      input.inventoryWatermark ?? null,
      input.batchWatermark ?? null,
      requireId(input.recordedByStoreMemberId),
      requireId(input.recordedByUserId),
      requireId(input.deviceId),
      localApplicationOrder,
      createdAt,
    ],
  );
  const row = getBatchInventoryOperationById(adapter, id);
  if (!row) throw new Error('Batch inventory operation insert did not persist.');
  return row;
}

export function getBatchInventoryOperationById(adapter: DatabaseAdapter, id: string): BatchInventoryOperationRow | null {
  const row = adapter.getFirstRow<Row>(`SELECT ${operationColumns(adapter)} FROM batch_inventory_operations WHERE id = ?;`, [requireId(id)]);
  return row ? mapOperation(row) : null;
}

export function listBatchInventoryOperationsByStoreProduct(
  adapter: DatabaseAdapter,
  storeProductId: string,
): BatchInventoryOperationRow[] {
  return adapter
    .getAllRows<Row>(
      `SELECT ${operationColumns(adapter)} FROM batch_inventory_operations WHERE store_product_id = ? ORDER BY local_application_order ASC, id ASC;`,
      [requireId(storeProductId)],
    )
    .map(mapOperation);
}

export function listBatchInventoryOperationsByEvent(
  adapter: DatabaseAdapter,
  inventoryEventId: string,
): BatchInventoryOperationRow[] {
  return adapter
    .getAllRows<Row>(
      `SELECT ${operationColumns(adapter)} FROM batch_inventory_operations WHERE inventory_event_id = ? ORDER BY local_application_order ASC, id ASC;`,
      [requireId(inventoryEventId)],
    )
    .map(mapOperation);
}

export function createBatchInventoryEntry(adapter: DatabaseAdapter, input: CreateBatchEntryInput): BatchInventoryEntryRow {
  const id = requireId(input.id);
  const operationId = requireId(input.operationId);
  const storeId = requireId(input.storeId);
  const storeProductId = requireId(input.storeProductId);
  const groupId = optionalId(input.groupId);
  if (!Number.isSafeInteger(input.deltaBaseMicros) || input.deltaBaseMicros === 0) {
    throw new DomainError('INVALID_QUANTITY', 'Batch entry delta must be a non-zero safe integer.');
  }
  if (!Number.isSafeInteger(input.entryOrder) || input.entryOrder <= 0) {
    throw new DomainError('INVALID_VALUE', 'Batch entry order must be positive.');
  }
  const createdAt = input.createdAt ?? nowIso();
  adapter.run(
    `INSERT INTO batch_inventory_entries
      (id, operation_id, store_id, store_product_id, group_id, entry_type, delta_base_micros, entry_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [id, operationId, storeId, storeProductId, groupId, input.entryType, input.deltaBaseMicros, input.entryOrder, createdAt],
  );
  const row = adapter.getFirstRow<Row>(`SELECT ${ENTRY_COLUMNS} FROM batch_inventory_entries WHERE id = ?;`, [id]);
  if (!row) throw new Error('Batch inventory entry insert did not persist.');
  return mapEntry(row);
}

export function createBatchInventoryInspection(
  adapter: DatabaseAdapter,
  input: CreateBatchInspectionInput,
): BatchInventoryInspectionRow {
  if (!hasColumn(adapter, 'batch_inventory_operations', 'sealed_at')) {
    throw new DomainError('INVALID_VALUE', 'Batch inspection evidence requires the sealed batch schema.');
  }
  const requestJson = requireText(input.requestJson, 'requestJson', 200_000);
  const evidenceJson = requireText(input.evidenceJson, 'evidenceJson', 200_000);
  const inventoryWatermark = requireText(input.inventoryWatermark, 'inventoryWatermark', 200);
  const batchWatermark = requireText(input.batchWatermark, 'batchWatermark', 200);
  const createdAt = input.createdAt ?? nowIso();
  adapter.run(
    `INSERT INTO batch_inventory_inspections
      (operation_id, store_id, store_product_id, request_json, evidence_json,
       inventory_watermark, batch_watermark, recorded_by_store_member_id,
       recorded_by_user_id, device_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      requireId(input.operationId),
      requireId(input.storeId),
      requireId(input.storeProductId),
      requestJson,
      evidenceJson,
      inventoryWatermark,
      batchWatermark,
      requireId(input.recordedByStoreMemberId),
      requireId(input.recordedByUserId),
      requireId(input.deviceId),
      createdAt,
    ],
  );
  const row = adapter.getFirstRow<Row>(
    `SELECT ${INSPECTION_COLUMNS} FROM batch_inventory_inspections WHERE operation_id = ?;`,
    [requireId(input.operationId)],
  );
  if (!row) throw new Error('Batch inspection evidence insert did not persist.');
  return mapInspection(row);
}

export function getBatchInventoryInspectionByOperationId(
  adapter: DatabaseAdapter,
  operationId: string,
): BatchInventoryInspectionRow | null {
  if (!hasColumn(adapter, 'batch_inventory_operations', 'sealed_at')) return null;
  const row = adapter.getFirstRow<Row>(
    `SELECT ${INSPECTION_COLUMNS} FROM batch_inventory_inspections WHERE operation_id = ?;`,
    [requireId(operationId)],
  );
  return row ? mapInspection(row) : null;
}

function validateEventAllocationGraph(
  adapter: DatabaseAdapter,
  operation: BatchInventoryOperationRow,
  entries: readonly BatchInventoryEntryRow[],
  total: bigint,
): void {
  if (!operation.inventoryEventId || operation.sourceId !== operation.inventoryEventId) {
    throw new DomainError('INVALID_VALUE', 'Batch event operation source does not match its inventory event.');
  }
  const event = adapter.getFirstRow<{
    store_id: string;
    store_product_id: string;
    event_type: string;
    quantity_base_delta_micros: string | number;
    source_type: string;
    source_id: string | null;
  }>(
    `SELECT store_id, store_product_id, event_type, quantity_base_delta_micros, source_type, source_id
     FROM inventory_events WHERE id = ?;`,
    [operation.inventoryEventId],
  );
  if (
    !event ||
    event.store_id !== operation.storeId ||
    event.store_product_id !== operation.storeProductId ||
    event.source_type !== operation.sourceType ||
    total !== BigInt(String(event.quantity_base_delta_micros))
  ) {
    throw new DomainError('INVALID_VALUE', 'Batch event operation does not explain its immutable inventory event.');
  }

  if (operation.sourceType === 'PURCHASE') {
    if (event.event_type !== 'PURCHASE' || !event.source_id || total <= 0n) {
      throw new DomainError('INVALID_VALUE', 'Purchase batch allocation has an invalid event source or direction.');
    }
    const parent = adapter.getFirstRow<{ id: string; quantity_base_micros: string | number }>(
      `SELECT pi.id, pi.quantity_base_micros
       FROM purchase_items pi
       JOIN purchases p ON p.id = pi.purchase_id
       WHERE pi.purchase_id = ? AND pi.store_id = ? AND pi.store_product_id = ?
         AND p.store_id = ? AND pi.quantity_base_micros = ?
       ORDER BY pi.id ASC LIMIT 1;`,
      [event.source_id, operation.storeId, operation.storeProductId, operation.storeId, Number(total)],
    );
    if (!parent) throw new DomainError('INVALID_VALUE', 'Purchase batch allocation is missing its immutable purchase item.');
    const group = adapter.getFirstRow<{ id: string; quantity_received_base_micros: string | number }>(
      `SELECT id, quantity_received_base_micros
       FROM inventory_batch_groups
       WHERE purchase_item_id = ? AND store_id = ? AND store_product_id = ?;`,
      [parent.id, operation.storeId, operation.storeProductId],
    );
    if (!group || BigInt(String(group.quantity_received_base_micros)) !== BigInt(String(parent.quantity_base_micros))) {
      throw new DomainError('INVALID_VALUE', 'Receipt batch group does not preserve its purchase quantity snapshot.');
    }
    entries.forEach((entry) => {
      if (entry.entryType === 'DEFICIT_OFFSET' && entry.groupId !== null) {
        throw new DomainError('INVALID_VALUE', 'Receipt deficit offsets cannot name a batch group.');
      }
      if (entry.entryType === 'RECEIPT' && entry.groupId !== group.id) {
        throw new DomainError('INVALID_VALUE', 'Receipt entry does not name its purchase batch group.');
      }
    });
    return;
  }

  if (operation.sourceType === 'SALE') {
    if (event.event_type !== 'SALE' || !event.source_id || total >= 0n) {
      throw new DomainError('INVALID_VALUE', 'Sale batch allocation has an invalid event source or direction.');
    }
    const parent = adapter.getFirstRow<{ quantity_base_micros: string | number }>(
      `SELECT si.quantity_base_micros
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       WHERE si.sale_id = ? AND si.store_product_id = ? AND s.store_id = ?
         AND si.quantity_base_micros = ?
       LIMIT 1;`,
      [event.source_id, operation.storeProductId, operation.storeId, Number(-total)],
    );
    if (!parent) throw new DomainError('INVALID_VALUE', 'Sale batch allocation is missing its immutable sale item.');
    entries.forEach((entry) => {
      if (entry.entryType === 'ASSUMED_FEFO' && entry.groupId === null) {
        throw new DomainError('INVALID_VALUE', 'FEFO sale entries must name a batch group.');
      }
      if (entry.entryType === 'UNKNOWN_RESIDUAL' && entry.groupId !== null) {
        throw new DomainError('INVALID_VALUE', 'Unknown sale residuals cannot name a batch group.');
      }
    });
    return;
  }

  if (operation.sourceType === 'MANUAL_ADJUSTMENT' || operation.sourceType === 'RECONCILIATION') {
    if (!event.source_id) throw new DomainError('INVALID_VALUE', 'Adjustment batch allocation is missing its parent source.');
    const parent = adapter.getFirstRow<{ quantity_base_delta_micros: string | number }>(
      `SELECT ial.quantity_base_delta_micros
       FROM inventory_adjustment_lines ial
       JOIN inventory_adjustments ia ON ia.id = ial.adjustment_id
       WHERE ial.inventory_event_id = ? AND ial.store_id = ? AND ial.store_product_id = ?
         AND ia.store_id = ? AND ia.id = ?
       LIMIT 1;`,
      [operation.inventoryEventId, operation.storeId, operation.storeProductId, operation.storeId, event.source_id],
    );
    if (!parent || BigInt(String(parent.quantity_base_delta_micros)) !== total) {
      throw new DomainError('INVALID_VALUE', 'Adjustment batch allocation does not match its immutable adjustment line.');
    }
    return;
  }

  throw new DomainError('INVALID_VALUE', 'Batch event operation source type is unsupported.');
}

function validateBatchOperationGraph(
  adapter: DatabaseAdapter,
  operation: BatchInventoryOperationRow,
  entries: readonly BatchInventoryEntryRow[],
): bigint {
  if (entries.length === 0) throw new DomainError('INVALID_VALUE', 'Batch inventory operation cannot be sealed without entries.');
  const total = entries.reduce((sum, entry) => sum + BigInt(entry.deltaBaseMicros), 0n);
  if (operation.kind === 'EVENT_ALLOCATION') {
    validateEventAllocationGraph(adapter, operation, entries, total);
    return total;
  }
  if (operation.kind === 'CLASSIFICATION') {
    if (operation.sourceType !== 'PHYSICAL_INSPECTION' || operation.sourceId !== operation.id || total !== 0n) {
      throw new DomainError('INVALID_VALUE', 'Classification batch evidence must be a net-zero physical inspection.');
    }
    if (!getBatchInventoryInspectionByOperationId(adapter, operation.id)) {
      throw new DomainError('INVALID_VALUE', 'Classification batch evidence is missing its durable inspection fact.');
    }
    return total;
  }
  if (operation.kind === 'RECONCILIATION') {
    if (operation.sourceType !== 'RECONCILIATION' || !operation.sourceId || total !== 0n) {
      throw new DomainError('INVALID_VALUE', 'Reconciliation batch evidence must be a net-zero reconciliation.');
    }
    const line = adapter.getFirstRow<{ store_id: string; store_product_id: string }>(
      'SELECT store_id, store_product_id FROM inventory_reconciliation_lines WHERE id = ?;',
      [operation.sourceId],
    );
    if (!line || line.store_id !== operation.storeId || line.store_product_id !== operation.storeProductId) {
      throw new DomainError('INVALID_VALUE', 'Reconciliation batch evidence does not match its durable count line.');
    }
    return total;
  }
  throw new DomainError('INVALID_VALUE', 'Unsupported batch inventory operation kind.');
}

export function finalizeBatchInventoryOperation(
  adapter: DatabaseAdapter,
  operationId: string,
  sealedAt = nowIso(),
): BatchInventoryOperationRow {
  const operation = getBatchInventoryOperationById(adapter, operationId);
  if (!operation) throw new DomainError('INVALID_VALUE', 'Batch inventory operation does not exist.');
  if (!hasColumn(adapter, 'batch_inventory_operations', 'sealed_at')) return operation;
  if (operation.sealedAt !== null) return operation;
  const entries = listBatchInventoryEntriesByOperation(adapter, operation.id);
  const total = validateBatchOperationGraph(adapter, operation, entries);
  const result = adapter.run(
    `UPDATE batch_inventory_operations
     SET sealed_at = ?, sealed_entry_count = ?, sealed_delta_base_micros = ?
     WHERE id = ? AND sealed_at IS NULL;`,
    [sealedAt, entries.length, total.toString(), operation.id],
  );
  if (result.changes !== 1) throw new DomainError('INVALID_VALUE', 'Batch inventory operation was sealed concurrently.');
  const sealed = getBatchInventoryOperationById(adapter, operation.id);
  if (!sealed || sealed.sealedAt === null) throw new Error('Batch inventory operation seal did not persist.');
  return sealed;
}

export function listBatchInventoryEntriesByOperation(
  adapter: DatabaseAdapter,
  operationId: string,
): BatchInventoryEntryRow[] {
  return adapter
    .getAllRows<Row>(
      `SELECT ${ENTRY_COLUMNS} FROM batch_inventory_entries WHERE operation_id = ? ORDER BY entry_order ASC, id ASC;`,
      [requireId(operationId)],
    )
    .map(mapEntry);
}

export function listBatchInventoryEntriesByStoreProduct(
  adapter: DatabaseAdapter,
  storeProductId: string,
): BatchInventoryEntryRow[] {
  return adapter
    .getAllRows<Row>(
      `SELECT ${ENTRY_COLUMNS} FROM batch_inventory_entries WHERE store_product_id = ? ORDER BY rowid ASC;`,
      [requireId(storeProductId)],
    )
    .map(mapEntry);
}

export function getInventoryBatchGroupBalanceBigInt(adapter: DatabaseAdapter, groupId: string): bigint {
  const rows = adapter.getAllRows<{ delta_base_micros: string }>(
    'SELECT CAST(delta_base_micros AS TEXT) AS delta_base_micros FROM batch_inventory_entries WHERE group_id = ? ORDER BY rowid ASC;',
    [requireId(groupId)],
  );
  return rows.reduce((total, row) => total + BigInt(row.delta_base_micros), 0n);
}

export function getUnknownBatchResidualBigInt(adapter: DatabaseAdapter, storeProductId: string): bigint {
  const ledger = adapter.getAllRows<{ quantity_base_delta_micros: string }>(
    'SELECT CAST(quantity_base_delta_micros AS TEXT) AS quantity_base_delta_micros FROM inventory_events WHERE store_product_id = ? ORDER BY rowid ASC;',
    [requireId(storeProductId)],
  ).reduce((total, row) => total + BigInt(row.quantity_base_delta_micros), 0n);
  const named = listInventoryBatchGroupsByStoreProduct(adapter, storeProductId).reduce(
    (total, group) => total + getInventoryBatchGroupBalanceBigInt(adapter, group.id),
    0n,
  );
  return ledger - named;
}

export function getBatchInventoryWatermark(adapter: DatabaseAdapter, storeProductId: string): string {
  const row = adapter.getFirstRow<{ local_application_order: number | null; id: string | null }>(
    `SELECT local_application_order, id FROM batch_inventory_operations
     WHERE store_product_id = ? ORDER BY local_application_order DESC, id DESC LIMIT 1;`,
    [requireId(storeProductId)],
  );
  return row?.id ? `${row.local_application_order ?? 0}:${row.id}` : '0:';
}
