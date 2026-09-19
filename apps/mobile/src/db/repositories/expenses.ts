import { DomainError } from '@retail/domain';

import type { DatabaseAdapter } from '../adapter';
import { nowIso, optionalText, requireId, requireText } from './common';

export const EXPENSE_CATEGORIES = [
  'TRANSPORT',
  'WAGES',
  'FUEL_ELECTRICITY',
  'RENT',
  'MAINTENANCE',
  'LEVIES_TAX',
  'MISCELLANEOUS',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export interface ExpenseRow {
  id: string;
  storeId: string;
  category: ExpenseCategory;
  amountMinor: number;
  currencyCode: string;
  note: string | null;
  occurredAt: string;
  createdByStoreMemberId: string;
  createdByUserId: string;
  deviceId: string;
  createdAt: string;
}

export interface CreateExpenseInput {
  id: string;
  storeId: string;
  category: ExpenseCategory;
  amountMinor: number;
  currencyCode: string;
  note?: string | null;
  occurredAt: string;
  createdByStoreMemberId: string;
  createdByUserId: string;
  deviceId: string;
  createdAt?: string;
}

type ExpenseRecord = Record<string, string | number | null>;

const CURRENCY_PATTERN = /^[A-Z]{3}$/;

function requireCategory(value: unknown): ExpenseCategory {
  if (typeof value !== 'string' || !EXPENSE_CATEGORIES.includes(value as ExpenseCategory)) {
    throw new DomainError('INVALID_VALUE', 'Expense category is not supported.');
  }
  return value as ExpenseCategory;
}

function requireAmountMinor(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new DomainError('INVALID_MONEY', 'Expense amount must be a positive safe integer in minor units.');
  }
  return value;
}

function requireCurrencyCode(value: unknown): string {
  if (typeof value !== 'string' || !CURRENCY_PATTERN.test(value)) {
    throw new DomainError('CURRENCY_MISMATCH', 'Expense currency must be a 3-letter uppercase code.');
  }
  return value;
}

function mapRow(row: ExpenseRecord): ExpenseRow {
  const category = requireCategory(row.category);
  const amountMinor = requireAmountMinor(row.amount_minor);
  return {
    id: row.id as string,
    storeId: row.store_id as string,
    category,
    amountMinor,
    currencyCode: row.currency_code as string,
    note: (row.note as string | null) ?? null,
    occurredAt: row.occurred_at as string,
    createdByStoreMemberId: row.created_by_store_member_id as string,
    createdByUserId: row.created_by_user_id as string,
    deviceId: row.device_id as string,
    createdAt: row.created_at as string,
  };
}

const COLUMNS =
  'id, store_id, category, amount_minor, currency_code, note, occurred_at, ' +
  'created_by_store_member_id, created_by_user_id, device_id, created_at';

export function createExpense(adapter: DatabaseAdapter, input: CreateExpenseInput): ExpenseRow {
  const id = requireId(input.id);
  const storeId = requireId(input.storeId);
  const category = requireCategory(input.category);
  const amountMinor = requireAmountMinor(input.amountMinor);
  const currencyCode = requireCurrencyCode(input.currencyCode);
  const note = optionalText(input.note, 'Expense note');
  const occurredAt = requireText(input.occurredAt, 'Expense occurred-at timestamp', 64);
  const createdByStoreMemberId = requireId(input.createdByStoreMemberId);
  const createdByUserId = requireId(input.createdByUserId);
  const deviceId = requireId(input.deviceId);
  const createdAt = input.createdAt === undefined ? nowIso() : requireText(input.createdAt, 'Expense created-at timestamp', 64);
  adapter.run(
    `INSERT INTO expenses
      (id, store_id, category, amount_minor, currency_code, note, occurred_at,
       created_by_store_member_id, created_by_user_id, device_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      id,
      storeId,
      category,
      amountMinor,
      currencyCode,
      note,
      occurredAt,
      createdByStoreMemberId,
      createdByUserId,
      deviceId,
      createdAt,
    ],
  );
  const created = getExpenseById(adapter, id);
  if (!created) throw new Error('Expense insert did not persist.');
  return created;
}

export function getExpenseById(adapter: DatabaseAdapter, id: string): ExpenseRow | null {
  const row = adapter.getFirstRow<ExpenseRecord>(
    `SELECT ${COLUMNS} FROM expenses WHERE id = ?;`,
    [requireId(id)],
  );
  return row ? mapRow(row) : null;
}

export function listExpensesByStore(adapter: DatabaseAdapter, storeId: string): ExpenseRow[] {
  return adapter
    .getAllRows<ExpenseRecord>(
      `SELECT ${COLUMNS}
       FROM expenses
       WHERE store_id = ?
       ORDER BY occurred_at DESC, created_at DESC, id DESC;`,
      [requireId(storeId)],
    )
    .map(mapRow);
}

export function listExpensesByStoreInRange(
  adapter: DatabaseAdapter,
  storeId: string,
  startUtc: string,
  endUtc: string,
): ExpenseRow[] {
  return adapter
    .getAllRows<ExpenseRecord>(
      `SELECT ${COLUMNS}
       FROM expenses
       WHERE store_id = ? AND occurred_at >= ? AND occurred_at < ?
       ORDER BY occurred_at ASC, created_at ASC, id ASC;`,
      [requireId(storeId), startUtc, endUtc],
    )
    .map(mapRow);
}
