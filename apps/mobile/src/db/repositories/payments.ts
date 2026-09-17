import { DomainError } from '@retail/domain';

import type { DatabaseAdapter } from '../adapter';
import { nowIso, optionalText, requireId, requireText, sumSafeIntegers } from './common';

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'POS_CARD' | 'CREDIT';

export interface PaymentRow {
  id: string;
  saleId: string;
  method: PaymentMethod;
  amountMinor: number;
  currencyCode: string;
  recordedByUserId: string;
  paymentReference: string | null;
  createdAt: string;
}

export interface CreatePaymentInput {
  id: string;
  saleId: string;
  method: PaymentMethod;
  amountMinor: number;
  currencyCode: string;
  recordedByUserId: string;
  paymentReference?: string | null;
  createdAt?: string;
}

type PaymentRecord = Record<string, string | number | null>;

function mapRow(row: PaymentRecord): PaymentRow {
  return {
    id: row.id as string,
    saleId: row.sale_id as string,
    method: row.method as PaymentMethod,
    amountMinor: row.amount_minor as number,
    currencyCode: row.currency_code as string,
    recordedByUserId: row.recorded_by_user_id as string,
    paymentReference: (row.payment_reference as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

const COLUMNS =
  'id, sale_id, method, amount_minor, currency_code, recorded_by_user_id, ' +
  'payment_reference, created_at';

const VALID_METHODS: ReadonlySet<PaymentMethod> = new Set([
  'CASH',
  'BANK_TRANSFER',
  'POS_CARD',
  'CREDIT',
]);

export function createPayment(adapter: DatabaseAdapter, input: CreatePaymentInput): PaymentRow {
  const id = requireId(input.id);
  const saleId = requireId(input.saleId);
  const recordedByUserId = requireId(input.recordedByUserId);

  if (!VALID_METHODS.has(input.method)) {
    throw new DomainError('INVALID_VALUE', `Unsupported payment method: ${input.method}`);
  }

  if (typeof input.amountMinor !== 'number' || !Number.isSafeInteger(input.amountMinor) || input.amountMinor < 0) {
    throw new DomainError('INVALID_MONEY', 'Payment amount must be a non-negative safe integer in minor units.');
  }

  const currencyCode = requireText(input.currencyCode, 'Currency code', 3).toUpperCase();
  const paymentReference = optionalText(input.paymentReference, 'Payment reference', 128);
  const createdAt = input.createdAt ?? nowIso();

  adapter.run(
    `INSERT INTO payments
      (id, sale_id, method, amount_minor, currency_code, recorded_by_user_id,
       payment_reference, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      id,
      saleId,
      input.method,
      input.amountMinor,
      currencyCode,
      recordedByUserId,
      paymentReference,
      createdAt,
    ],
  );

  const row = adapter.getFirstRow<PaymentRecord>(
    `SELECT ${COLUMNS} FROM payments WHERE id = ?;`,
    [id],
  );
  if (!row) {
    throw new Error('Payment insert did not persist.');
  }
  return mapRow(row);
}

export function listPaymentsBySaleId(adapter: DatabaseAdapter, saleId: string): PaymentRow[] {
  return adapter
    .getAllRows<PaymentRecord>(
      `SELECT ${COLUMNS} FROM payments WHERE sale_id = ? ORDER BY rowid ASC;`,
      [requireId(saleId)],
    )
    .map(mapRow);
}

/**
 * Total cash received for a store across non-credit tender methods.
 * D-037 requirement: Credit is excluded from cash received.
 */
export function getCashReceivedTotalByStore(adapter: DatabaseAdapter, storeId: string): number {
  const rows = adapter.getAllRows<{ amount_minor: number }>(
    `SELECT p.amount_minor
     FROM payments p
     JOIN sales s ON s.id = p.sale_id
     WHERE s.store_id = ? AND s.status = 'COMPLETED' AND p.method IN ('CASH', 'BANK_TRANSFER', 'POS_CARD');`,
    [requireId(storeId)],
  );
  return sumSafeIntegers(
    rows.map((row) => row.amount_minor),
    'Cash received total',
    'INVALID_MONEY',
  );
}

/**
 * Total sales value for a store, including credit sales.
 */
export function getTotalSalesValueByStore(adapter: DatabaseAdapter, storeId: string): number {
  const rows = adapter.getAllRows<{ total_minor: number }>(
    `SELECT total_minor
     FROM sales
     WHERE store_id = ? AND status = 'COMPLETED';`,
    [requireId(storeId)],
  );
  return sumSafeIntegers(
    rows.map((row) => row.total_minor),
    'Total sales value',
    'INVALID_MONEY',
  );
}
