import { DomainError } from '@retail/domain';

import type { DatabaseAdapter } from '../adapter';
import { nowIso, optionalText, requireId, requireText } from './common';

import type { PaymentMethod } from './payments';
import type { OutboxStatus } from './outbox';

export type SaleStatus = 'COMPLETED' | 'VOIDED';

export interface SaleRow {
  id: string;
  storeId: string;
  deviceId: string;
  createdByUserId: string;
  occurredAt: string;
  currencyCode: string;
  subtotalMinor: number;
  discountTotalMinor: number;
  totalMinor: number;
  status: SaleStatus;
  note: string | null;
  createdAt: string;
  completedAt: string;
}

export interface SaleSummaryRow extends SaleRow {
  paymentMethod: PaymentMethod | null;
  itemCount: number;
  syncStatus: OutboxStatus | null;
}

export interface SaleRangeRow extends SaleRow {
  /** SQLite rowid records local application order for deterministic ties. */
  applicationOrder: number;
}

export interface CreateSaleInput {
  id: string;
  storeId: string;
  deviceId: string;
  createdByUserId: string;
  occurredAt: string;
  currencyCode: string;
  subtotalMinor: number;
  discountTotalMinor?: number;
  totalMinor: number;
  status?: SaleStatus;
  note?: string | null;
  createdAt?: string;
  completedAt?: string;
}

type SaleRecord = Record<string, string | number | null>;

function mapRow(row: SaleRecord): SaleRow {
  return {
    id: row.id as string,
    storeId: row.store_id as string,
    deviceId: row.device_id as string,
    createdByUserId: row.created_by_user_id as string,
    occurredAt: row.occurred_at as string,
    currencyCode: row.currency_code as string,
    subtotalMinor: row.subtotal_minor as number,
    discountTotalMinor: row.discount_total_minor as number,
    totalMinor: row.total_minor as number,
    status: row.status as SaleStatus,
    note: (row.note as string | null) ?? null,
    createdAt: row.created_at as string,
    completedAt: row.completed_at as string,
  };
}

const COLUMNS =
  'id, store_id, device_id, created_by_user_id, occurred_at, currency_code, ' +
  'subtotal_minor, discount_total_minor, total_minor, status, note, created_at, completed_at';

function assertMoneyAmount(value: number, field: string): void {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new DomainError('INVALID_MONEY', `${field} must be a non-negative safe integer in minor units.`);
  }
}

export function createSale(adapter: DatabaseAdapter, input: CreateSaleInput): SaleRow {
  const id = requireId(input.id);
  const storeId = requireId(input.storeId);
  const deviceId = requireId(input.deviceId);
  const createdByUserId = requireId(input.createdByUserId);
  const occurredAt = requireText(input.occurredAt, 'Sale occurredAt', 64);
  const currencyCode = requireText(input.currencyCode, 'Currency code', 3).toUpperCase();
  assertMoneyAmount(input.subtotalMinor, 'Subtotal');
  const discountTotalMinor = input.discountTotalMinor ?? 0;
  assertMoneyAmount(discountTotalMinor, 'Discount total');
  assertMoneyAmount(input.totalMinor, 'Total');

  if (input.totalMinor !== input.subtotalMinor - discountTotalMinor) {
    throw new DomainError(
      'INVALID_MONEY',
      'Sale total must equal subtotal minus discount total.',
    );
  }

  const status: SaleStatus = input.status ?? 'COMPLETED';
  if (status !== 'COMPLETED' && status !== 'VOIDED') {
    throw new DomainError('INVALID_VALUE', 'Sale status must be COMPLETED or VOIDED.');
  }

  const note = optionalText(input.note, 'Note', 500);
  const createdAt = input.createdAt ?? nowIso();
  const completedAt = input.completedAt ?? createdAt;

  adapter.run(
    `INSERT INTO sales
      (id, store_id, device_id, created_by_user_id, occurred_at, currency_code,
       subtotal_minor, discount_total_minor, total_minor, status, note, created_at, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      id,
      storeId,
      deviceId,
      createdByUserId,
      occurredAt,
      currencyCode,
      input.subtotalMinor,
      discountTotalMinor,
      input.totalMinor,
      status,
      note,
      createdAt,
      completedAt,
    ],
  );

  const created = getSaleById(adapter, id);
  if (!created) {
    throw new Error('Sale insert did not persist.');
  }
  return created;
}

export function getSaleById(adapter: DatabaseAdapter, id: string): SaleRow | null {
  const row = adapter.getFirstRow<SaleRecord>(
    `SELECT ${COLUMNS} FROM sales WHERE id = ?;`,
    [requireId(id)],
  );
  return row ? mapRow(row) : null;
}

export function listSalesByStore(
  adapter: DatabaseAdapter,
  storeId: string,
  limit = 50,
): SaleSummaryRow[] {
  const rows = adapter.getAllRows<
      SaleRecord & {
        payment_method: string | null;
        item_count: number | null;
        sync_status: string | null;
      }
  >(
    `SELECT s.id, s.store_id, s.device_id, s.created_by_user_id, s.occurred_at, s.currency_code,
            s.subtotal_minor, s.discount_total_minor, s.total_minor, s.status, s.note, s.created_at, s.completed_at,
            (SELECT p.method FROM payments p WHERE p.sale_id = s.id ORDER BY p.rowid ASC LIMIT 1) AS payment_method,
            (SELECT COUNT(*) FROM sale_items si WHERE si.sale_id = s.id) AS item_count,
            (SELECT o.status FROM outbox_operations o
             WHERE o.store_id = s.store_id
               AND o.entity_type = 'SALE'
               AND o.entity_id = s.id
               AND o.operation_type = 'COMPLETED_SALE_CREATED'
             ORDER BY o.created_at DESC, o.operation_id DESC
             LIMIT 1) AS sync_status
     FROM sales s
     WHERE s.store_id = ?
     ORDER BY s.occurred_at DESC, s.created_at DESC, s.id DESC
     LIMIT ?;`,
    [requireId(storeId), Math.max(1, Math.min(limit, 200))],
  );

  return rows.map((row) => ({
    ...mapRow(row),
    paymentMethod: (row.payment_method as PaymentMethod | null) ?? null,
    itemCount: Number(row.item_count ?? 0),
    syncStatus: (row.sync_status as OutboxStatus | null) ?? null,
  }));
}

export function listCompletedSalesByStoreInRange(
  adapter: DatabaseAdapter,
  storeId: string,
  startUtc: string,
  endUtc: string,
): SaleRangeRow[] {
  const rows = adapter.getAllRows<SaleRecord & { application_order: number }>(
    `SELECT s.id, s.store_id, s.device_id, s.created_by_user_id, s.occurred_at, s.currency_code,
            s.subtotal_minor, s.discount_total_minor, s.total_minor, s.status, s.note, s.created_at, s.completed_at,
            s.rowid AS application_order
     FROM sales s
     WHERE s.store_id = ? AND s.status = 'COMPLETED'
       AND s.occurred_at >= ? AND s.occurred_at < ?
     ORDER BY s.rowid ASC;`,
    [requireId(storeId), startUtc, endUtc],
  );
  return rows.map((row) => ({ ...mapRow(row), applicationOrder: row.application_order }));
}
