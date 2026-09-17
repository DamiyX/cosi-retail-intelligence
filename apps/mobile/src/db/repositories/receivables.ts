import { DomainError } from '@retail/domain';

import type { DatabaseAdapter } from '../adapter';
import { nowIso, optionalText, requireId } from './common';

export type ReceivableStatus = 'OPEN' | 'PARTIALLY_PAID' | 'PAID' | 'WRITTEN_OFF';

export interface ReceivableRow {
  id: string;
  storeId: string;
  saleId: string;
  customerAccountId: string;
  originalAmountMinor: number;
  outstandingAmountMinor: number;
  status: ReceivableStatus;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReceivableInput {
  id: string;
  storeId: string;
  saleId: string;
  customerAccountId: string;
  originalAmountMinor: number;
  outstandingAmountMinor?: number;
  status?: ReceivableStatus;
  dueDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

type ReceivableRecord = Record<string, string | number | null>;

function mapRow(row: ReceivableRecord): ReceivableRow {
  return {
    id: row.id as string,
    storeId: row.store_id as string,
    saleId: row.sale_id as string,
    customerAccountId: row.customer_account_id as string,
    originalAmountMinor: row.original_amount_minor as number,
    outstandingAmountMinor: row.outstanding_amount_minor as number,
    status: row.status as ReceivableStatus,
    dueDate: (row.due_date as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

const COLUMNS =
  'id, store_id, sale_id, customer_account_id, original_amount_minor, ' +
  'outstanding_amount_minor, status, due_date, created_at, updated_at';

const VALID_STATUSES: ReadonlySet<ReceivableStatus> = new Set([
  'OPEN',
  'PARTIALLY_PAID',
  'PAID',
  'WRITTEN_OFF',
]);

export function createReceivable(
  adapter: DatabaseAdapter,
  input: CreateReceivableInput,
): ReceivableRow {
  const id = requireId(input.id);
  const storeId = requireId(input.storeId);
  const saleId = requireId(input.saleId);
  const customerAccountId = requireId(input.customerAccountId);

  if (
    typeof input.originalAmountMinor !== 'number' ||
    !Number.isSafeInteger(input.originalAmountMinor) ||
    input.originalAmountMinor <= 0
  ) {
    throw new DomainError('INVALID_MONEY', 'Receivable original amount must be a positive safe integer in minor units.');
  }

  const outstandingAmountMinor = input.outstandingAmountMinor ?? input.originalAmountMinor;
  if (
    typeof outstandingAmountMinor !== 'number' ||
    !Number.isSafeInteger(outstandingAmountMinor) ||
    outstandingAmountMinor < 0 ||
    outstandingAmountMinor > input.originalAmountMinor
  ) {
    throw new DomainError(
      'INVALID_MONEY',
      'Receivable outstanding amount must be between 0 and original amount.',
    );
  }

  const status: ReceivableStatus = input.status ?? 'OPEN';
  if (!VALID_STATUSES.has(status)) {
    throw new DomainError('INVALID_VALUE', `Invalid receivable status: ${status}`);
  }

  const dueDate = optionalText(input.dueDate, 'dueDate', 64);
  const createdAt = input.createdAt ?? nowIso();
  const updatedAt = input.updatedAt ?? createdAt;

  adapter.run(
    `INSERT INTO receivables
      (id, store_id, sale_id, customer_account_id, original_amount_minor,
       outstanding_amount_minor, status, due_date, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      id,
      storeId,
      saleId,
      customerAccountId,
      input.originalAmountMinor,
      outstandingAmountMinor,
      status,
      dueDate,
      createdAt,
      updatedAt,
    ],
  );

  const row = adapter.getFirstRow<ReceivableRecord>(
    `SELECT ${COLUMNS} FROM receivables WHERE id = ?;`,
    [id],
  );
  if (!row) {
    throw new Error('Receivable insert did not persist.');
  }
  return mapRow(row);
}

export function getReceivableById(adapter: DatabaseAdapter, id: string): ReceivableRow | null {
  const row = adapter.getFirstRow<ReceivableRecord>(
    `SELECT ${COLUMNS} FROM receivables WHERE id = ?;`,
    [requireId(id)],
  );
  return row ? mapRow(row) : null;
}

export function getReceivableBySaleId(
  adapter: DatabaseAdapter,
  saleId: string,
): ReceivableRow | null {
  const row = adapter.getFirstRow<ReceivableRecord>(
    `SELECT ${COLUMNS} FROM receivables WHERE sale_id = ?;`,
    [requireId(saleId)],
  );
  return row ? mapRow(row) : null;
}

export function listReceivablesByStore(
  adapter: DatabaseAdapter,
  storeId: string,
  status?: ReceivableStatus,
): ReceivableRow[] {
  if (status) {
    return adapter
      .getAllRows<ReceivableRecord>(
        `SELECT ${COLUMNS} FROM receivables WHERE store_id = ? AND status = ? ORDER BY created_at DESC;`,
        [requireId(storeId), status],
      )
      .map(mapRow);
  }
  return adapter
    .getAllRows<ReceivableRecord>(
      `SELECT ${COLUMNS} FROM receivables WHERE store_id = ? ORDER BY created_at DESC;`,
      [requireId(storeId)],
    )
    .map(mapRow);
}
