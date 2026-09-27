import {
  parseSyncOperationEnvelope,
  type SyncEntityType,
  type SyncOperationEnvelope,
  type SyncOperationType,
} from '@retail/contracts';

import type { DatabaseAdapter } from '../db/adapter';

type JsonRecord = Record<string, unknown>;

const ENTITY_TABLES = new Set([
  'product_variants',
  'package_units',
  'store_products',
  'store_package_settings',
  'product_identifiers',
  'sales',
  'sale_items',
  'payments',
  'inventory_events',
  'customer_accounts',
  'receivables',
  'suppliers',
  'purchases',
  'purchase_items',
  'price_observations',
  'store_product_cost_states',
  'cost_movements',
  'sale_item_cost_snapshots',
  'inventory_batch_groups',
  'batch_inventory_operations',
  'batch_inventory_entries',
  'batch_inventory_inspections',
  'inventory_adjustments',
  'inventory_adjustment_lines',
  'inventory_reconciliations',
  'inventory_reconciliation_lines',
  'inventory_reconciliation_submissions',
  'inventory_reconciliation_group_counts',
  'inventory_check_settings',
  'inventory_check_assignments',
  'inventory_check_attempts',
  'inventory_attention_settings',
  'inventory_attention_snoozes',
  'store_product_reorder_level_history',
  'expenses',
  'owner_withdrawals',
]);

const IMMUTABLE_TABLES = new Set([
  'product_identifiers',
  'sales',
  'sale_items',
  'payments',
  'inventory_events',
  'customer_accounts',
  'receivables',
  'suppliers',
  'purchases',
  'purchase_items',
  'price_observations',
  'cost_movements',
  'sale_item_cost_snapshots',
  'inventory_batch_groups',
  'batch_inventory_operations',
  'batch_inventory_entries',
  'batch_inventory_inspections',
  'inventory_adjustments',
  'inventory_adjustment_lines',
  'inventory_reconciliations',
  'inventory_reconciliation_lines',
  'inventory_reconciliation_submissions',
  'inventory_reconciliation_group_counts',
  'inventory_check_assignments',
  'inventory_check_attempts',
  'inventory_attention_snoozes',
  'store_product_reorder_level_history',
  'expenses',
  'owner_withdrawals',
]);

const KEY_PRIORITY: Record<string, number> = {
  productVariant: 1,
  basePackageUnit: 2,
  packageUnit: 2,
  storeProduct: 3,
  identifier: 4,
  storePackageSettings: 5,
  setting: 5,
  supplier: 6,
  customerAccount: 6,
  sale: 7,
  purchase: 7,
  items: 8,
  payment: 9,
  inventoryEvents: 10,
  costMovements: 11,
  costStates: 12,
  batchGroups: 13,
  groups: 13,
  operation: 14,
  batchOperations: 14,
  entries: 15,
  batchEntries: 15,
  adjustment: 16,
  reconciliation: 16,
  line: 17,
  lines: 17,
  adjustmentLines: 17,
  submissions: 18,
  groupCounts: 19,
  expense: 20,
  withdrawal: 20,
};

function camelToSnake(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function tableForKey(operationType: SyncOperationType, key: string): string | null {
  switch (key) {
    case 'productVariant':
      return 'product_variants';
    case 'basePackageUnit':
    case 'packageUnit':
      return 'package_units';
    case 'storeProduct':
    case 'storeProductVersion':
      return key === 'storeProduct' ? 'store_products' : null;
    case 'storePackageSettings':
    case 'setting':
      if (operationType === 'CHECK_SETTINGS_SAVED') return 'inventory_check_settings';
      if (operationType === 'ATTENTION_SETTINGS_SAVED') return 'inventory_attention_settings';
      return 'store_package_settings';
    case 'identifier':
      return 'product_identifiers';
    case 'sale':
      return 'sales';
    case 'payment':
      return 'payments';
    case 'customerAccount':
      return 'customer_accounts';
    case 'receivable':
      return 'receivables';
    case 'purchase':
      return 'purchases';
    case 'supplier':
      return 'suppliers';
    case 'inventoryEvents':
      return 'inventory_events';
    case 'costSnapshots':
      return 'sale_item_cost_snapshots';
    case 'costMovements':
      return 'cost_movements';
    case 'costStates':
      return 'store_product_cost_states';
    case 'observations':
      return 'price_observations';
    case 'batchGroups':
    case 'groups':
      return 'inventory_batch_groups';
    case 'batchOperations':
    case 'operation':
      return 'batch_inventory_operations';
    case 'batchEntries':
    case 'entries':
      return 'batch_inventory_entries';
    case 'inspection':
      return 'batch_inventory_inspections';
    case 'adjustment':
      return 'inventory_adjustments';
    case 'adjustmentLines':
      return 'inventory_adjustment_lines';
    case 'reconciliation':
      return 'inventory_reconciliations';
    case 'line':
      return operationType === 'RECONCILIATION_FINALIZED'
        ? 'inventory_reconciliation_lines'
        : 'inventory_adjustment_lines';
    case 'lines':
      if (operationType === 'RECONCILIATION_FINALIZED') return 'inventory_reconciliation_lines';
      if (operationType === 'INVENTORY_ADJUSTMENT_CREATED') return 'inventory_adjustment_lines';
      return operationType === 'COMPLETED_SALE_CREATED' ? 'sale_items' : 'purchase_items';
    case 'submissions':
      return 'inventory_reconciliation_submissions';
    case 'groupCounts':
      return 'inventory_reconciliation_group_counts';
    case 'assignments':
    case 'replacementAssignment':
    case 'replacedAssignment':
      return 'inventory_check_assignments';
    case 'attempts':
    case 'replacementAttempt':
    case 'cancelledAttempt':
    case 'guidedAttempt':
      return 'inventory_check_attempts';
    case 'guidedAssignment':
      return 'inventory_check_assignments';
    case 'snooze':
      return 'inventory_attention_snoozes';
    case 'expense':
      return 'expenses';
    case 'withdrawal':
      return 'owner_withdrawals';
    case 'request':
    case 'overview':
    case 'lifecycleChange':
    case 'previousStoreProductVersion':
    case 'previousReorderLevelBaseMicros':
    case 'inventoryBalanceBaseMicros':
    case 'inventoryLedgerWatermark':
      return null;
    default:
      return null;
  }
}

function scalarValue(value: unknown): string | number | null | undefined {
  if (value === null || value === undefined) return value ?? null;
  if (typeof value === 'string' || typeof value === 'number') return value;
  if (typeof value === 'boolean') return value ? 1 : 0;
  return undefined;
}

function safeIdentifier(value: string): string {
  if (!/^[a-z_][a-z0-9_]*$/.test(value)) {
    throw new Error(`Unsafe SQLite identifier: ${value}`);
  }
  return value;
}

function upsertRow(
  adapter: DatabaseAdapter,
  tableName: string,
  value: JsonRecord,
  expectedStoreId: string,
): void {
  if (!ENTITY_TABLES.has(tableName)) return;
  const table = safeIdentifier(tableName);
  const columns = adapter
    .getAllRows<{ name: string; pk: number }>(`PRAGMA table_info(${table});`)
    .sort((left, right) => left.pk - right.pk);
  const available = new Set(columns.map((column) => column.name));
  const row = new Map<string, string | number | null>();
  for (const [key, rawValue] of Object.entries(value)) {
    const column = camelToSnake(key);
    const scalar = scalarValue(rawValue);
    if (available.has(column) && scalar !== undefined) row.set(column, scalar);
  }
  if (available.has('store_id') && row.has('store_id') && row.get('store_id') !== expectedStoreId) {
    throw new Error(`Sync payload row for ${table} belongs to another store.`);
  }
  const primaryKeyColumns = columns.filter((column) => column.pk > 0).map((column) => column.name);
  if (primaryKeyColumns.length === 0 || primaryKeyColumns.some((column) => !row.has(column))) return;
  const primaryKeyParams = primaryKeyColumns.map((column) => row.get(column) ?? null);
  const existing = adapter.getFirstRow<Record<string, string | number | null>>(
    `SELECT * FROM ${table} WHERE ${primaryKeyColumns.map((column) => `${safeIdentifier(column)} = ?`).join(' AND ')} LIMIT 1;`,
    primaryKeyParams,
  );
  if (existing && IMMUTABLE_TABLES.has(table)) {
    for (const [column, incomingValue] of row) {
      if ((existing[column] ?? null) !== incomingValue) {
        throw new Error(`Immutable sync row ${table}.${column} does not match local history.`);
      }
    }
    return;
  }

  if (!existing) {
    const insertColumns = [...row.keys()];
    adapter.run(
      `INSERT INTO ${table} (${insertColumns.map(safeIdentifier).join(', ')})
       VALUES (${insertColumns.map(() => '?').join(', ')});`,
      insertColumns.map((column) => row.get(column) ?? null),
    );
    return;
  }

  const updateColumns = [...row.keys()].filter((column) => !primaryKeyColumns.includes(column));
  if (updateColumns.length === 0) return;
  adapter.run(
    `UPDATE ${table} SET ${updateColumns.map((column) => `${safeIdentifier(column)} = ?`).join(', ')}
     WHERE ${primaryKeyColumns.map((column) => `${safeIdentifier(column)} = ?`).join(' AND ')};`,
    [
      ...updateColumns.map((column) => row.get(column) ?? null),
      ...primaryKeyParams,
    ],
  );
}

function rowsForValue(value: unknown): JsonRecord[] {
  if (Array.isArray(value)) return value.filter(isRecord);
  return isRecord(value) ? [value] : [];
}

/**
 * Apply a complete aggregate envelope without creating another outbox entry.
 * Table names are an allowlist and columns are read from the local schema;
 * arbitrary remote JSON never becomes executable SQL.
 */
export function materializeSyncOperation(
  adapter: DatabaseAdapter,
  envelope: SyncOperationEnvelope,
): void {
  const entries = Object.entries(envelope.entities).sort(
    ([left], [right]) => (KEY_PRIORITY[left] ?? 100) - (KEY_PRIORITY[right] ?? 100),
  );
  for (const [key, rawValue] of entries) {
    const tableName = tableForKey(envelope.operationType, key);
    if (!tableName) continue;
    for (const row of rowsForValue(rawValue)) {
      upsertRow(adapter, tableName, row, envelope.storeId);
    }
  }
}

export function parseAndMaterializeSyncPayload(
  adapter: DatabaseAdapter,
  payload: unknown,
): SyncOperationEnvelope {
  const envelope = parseSyncOperationEnvelope(payload);
  materializeSyncOperation(adapter, envelope);
  return envelope;
}

export function matchesSyncEntity(
  envelope: SyncOperationEnvelope,
  expected: { storeId: string; entityType: SyncEntityType; entityId: string },
): boolean {
  return envelope.storeId === expected.storeId &&
    envelope.entityType === expected.entityType &&
    envelope.entityId === expected.entityId;
}
