import type { DatabaseAdapter } from '../adapter';
import { requireId } from './common';

export interface ReorderLevelHistoryRow {
  operationId: string;
  storeId: string;
  storeProductId: string;
  storeProductVersion: number;
  previousReorderLevelBaseMicros: number | null | undefined;
  reorderLevelBaseMicros: number | null;
  inventoryBalanceBaseMicros: string | null;
  inventoryLedgerWatermark: string | null;
  createdAt: string;
}

export interface CreateReorderLevelHistoryInput extends Omit<ReorderLevelHistoryRow, 'previousReorderLevelBaseMicros'> {
  previousReorderLevelBaseMicros: number | null;
}

type RecordRow = Record<string, string | number | null>;

function mapRow(row: RecordRow): ReorderLevelHistoryRow {
  return {
    operationId: row.operation_id as string,
    storeId: row.store_id as string,
    storeProductId: row.store_product_id as string,
    storeProductVersion: row.store_product_version as number,
    previousReorderLevelBaseMicros: row.has_previous_threshold === 1
      ? row.previous_reorder_level_base_micros as number | null
      : undefined,
    reorderLevelBaseMicros: row.reorder_level_base_micros as number | null,
    inventoryBalanceBaseMicros: row.inventory_balance_base_micros as string | null,
    inventoryLedgerWatermark: row.inventory_ledger_watermark as string | null,
    createdAt: row.created_at as string,
  };
}

const COLUMNS = `operation_id, store_id, store_product_id, store_product_version,
  has_previous_threshold, previous_reorder_level_base_micros,
  reorder_level_base_micros, inventory_balance_base_micros,
  inventory_ledger_watermark, created_at`;

export function createReorderLevelHistory(
  adapter: DatabaseAdapter,
  input: CreateReorderLevelHistoryInput,
): ReorderLevelHistoryRow {
  adapter.run(
    `INSERT INTO store_product_reorder_level_history (
      operation_id, store_id, store_product_id, store_product_version,
      has_previous_threshold, previous_reorder_level_base_micros,
      reorder_level_base_micros, inventory_balance_base_micros,
      inventory_ledger_watermark, created_at
    ) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?);`,
    [
      requireId(input.operationId), requireId(input.storeId), requireId(input.storeProductId),
      input.storeProductVersion, input.previousReorderLevelBaseMicros,
      input.reorderLevelBaseMicros, input.inventoryBalanceBaseMicros,
      input.inventoryLedgerWatermark, input.createdAt,
    ],
  );
  const row = adapter.getFirstRow<RecordRow>(
    `SELECT ${COLUMNS} FROM store_product_reorder_level_history WHERE operation_id = ?;`,
    [input.operationId],
  );
  if (!row) throw new Error('Reorder-level history did not persist.');
  return mapRow(row);
}

export function listReorderLevelHistory(
  adapter: DatabaseAdapter,
  storeId: string,
  storeProductId: string,
): ReorderLevelHistoryRow[] {
  return adapter.getAllRows<RecordRow>(
    `SELECT ${COLUMNS} FROM store_product_reorder_level_history
     WHERE store_id = ? AND store_product_id = ?
     ORDER BY store_product_version ASC;`,
    [requireId(storeId), requireId(storeProductId)],
  ).map(mapRow);
}
