import { DomainError } from '@retail/domain';

import type { DatabaseAdapter } from '../adapter';
import { nowIso, optionalId, requireId, requireText } from './common';
import type { OutboxStatus } from './outbox';

export type PurchaseStatus = 'COMPLETED' | 'VOIDED';

export interface PurchaseRow {
  id: string;
  storeId: string;
  supplierId: string | null;
  supplierNameSnapshot: string | null;
  createdByStoreMemberId: string;
  createdByUserId: string;
  deviceId: string;
  occurredAt: string;
  currencyCode: string;
  totalAmountMinor: number;
  status: PurchaseStatus;
  createdAt: string;
  completedAt: string;
}

export interface PurchaseSummaryRow extends PurchaseRow {
  itemCount: number;
  syncStatus: OutboxStatus | null;
}

export interface CreatePurchaseInput {
  id: string;
  storeId: string;
  supplierId?: string | null;
  supplierNameSnapshot?: string | null;
  createdByStoreMemberId: string;
  createdByUserId: string;
  deviceId: string;
  occurredAt: string;
  currencyCode: string;
  totalAmountMinor: number;
  status?: PurchaseStatus;
  createdAt?: string;
  completedAt?: string;
}

type PurchaseRecord = Record<string, string | number | null>;

const COLUMNS =
  'id, store_id, supplier_id, supplier_name_snapshot, created_by_store_member_id, created_by_user_id, device_id, ' +
  'occurred_at, currency_code, total_amount_minor, status, created_at, completed_at';

function mapRow(row: PurchaseRecord): PurchaseRow {
  return {
    id: row.id as string,
    storeId: row.store_id as string,
    supplierId: (row.supplier_id as string | null) ?? null,
    supplierNameSnapshot: (row.supplier_name_snapshot as string | null) ?? null,
    createdByStoreMemberId: row.created_by_store_member_id as string,
    createdByUserId: row.created_by_user_id as string,
    deviceId: row.device_id as string,
    occurredAt: row.occurred_at as string,
    currencyCode: row.currency_code as string,
    totalAmountMinor: row.total_amount_minor as number,
    status: row.status as PurchaseStatus,
    createdAt: row.created_at as string,
    completedAt: row.completed_at as string,
  };
}

function assertMoney(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new DomainError('INVALID_MONEY', `${field} must be a non-negative safe integer in minor units.`);
  }
}

export function createPurchase(adapter: DatabaseAdapter, input: CreatePurchaseInput): PurchaseRow {
  const id = requireId(input.id);
  const storeId = requireId(input.storeId);
  const supplierId = optionalId(input.supplierId);
  const supplierNameSnapshot = input.supplierNameSnapshot === undefined || input.supplierNameSnapshot === null
    ? null
    : requireText(input.supplierNameSnapshot.trim(), 'Supplier name snapshot', 200);
  const memberId = requireId(input.createdByStoreMemberId);
  const userId = requireId(input.createdByUserId);
  const deviceId = requireId(input.deviceId);
  const occurredAt = requireText(input.occurredAt, 'Purchase occurredAt', 64);
  const currencyCode = requireText(input.currencyCode, 'Currency code', 3).toUpperCase();
  assertMoney(input.totalAmountMinor, 'Purchase total');
  const status = input.status ?? 'COMPLETED';
  if (status !== 'COMPLETED' && status !== 'VOIDED') {
    throw new DomainError('INVALID_VALUE', 'Purchase status must be COMPLETED or VOIDED.');
  }
  const createdAt = input.createdAt ?? nowIso();
  const completedAt = input.completedAt ?? createdAt;

  adapter.run(
    `INSERT INTO purchases
      (id, store_id, supplier_id, supplier_name_snapshot, created_by_store_member_id, created_by_user_id, device_id,
       occurred_at, currency_code, total_amount_minor, status, created_at, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [id, storeId, supplierId, supplierNameSnapshot, memberId, userId, deviceId, occurredAt, currencyCode, input.totalAmountMinor, status, createdAt, completedAt],
  );
  const created = getPurchaseById(adapter, id);
  if (!created) {
    throw new Error('Purchase insert did not persist.');
  }
  return created;
}

export function getPurchaseById(adapter: DatabaseAdapter, id: string): PurchaseRow | null {
  const row = adapter.getFirstRow<PurchaseRecord>(
    `SELECT ${COLUMNS} FROM purchases WHERE id = ?;`,
    [requireId(id)],
  );
  return row ? mapRow(row) : null;
}

export function listPurchasesByStore(adapter: DatabaseAdapter, storeId: string, limit = 50): PurchaseSummaryRow[] {
  const rows = adapter.getAllRows<PurchaseRecord & { item_count: number | null; sync_status: string | null }>(
    `SELECT p.id, p.store_id, p.supplier_id, p.supplier_name_snapshot, p.created_by_store_member_id, p.created_by_user_id,
            p.device_id, p.occurred_at, p.currency_code, p.total_amount_minor, p.status,
            p.created_at, p.completed_at,
            (SELECT COUNT(*) FROM purchase_items pi WHERE pi.purchase_id = p.id) AS item_count,
            (SELECT o.status FROM outbox_operations o
             WHERE o.store_id = p.store_id AND o.entity_type = 'PURCHASE'
               AND o.entity_id = p.id AND o.operation_type = 'COMPLETED_PURCHASE_CREATED'
             ORDER BY o.created_at DESC, o.operation_id DESC LIMIT 1) AS sync_status
     FROM purchases p
     WHERE p.store_id = ?
     ORDER BY p.occurred_at DESC, p.created_at DESC, p.id DESC
     LIMIT ?;`,
    [requireId(storeId), Math.max(1, Math.min(limit, 200))],
  );
  return rows.map((row) => ({
    ...mapRow(row),
    itemCount: Number(row.item_count ?? 0),
    syncStatus: (row.sync_status as OutboxStatus | null) ?? null,
  }));
}
