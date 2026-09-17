import { DomainError } from '@retail/domain';

import type { DatabaseAdapter } from '../adapter';
import { nowIso, optionalText, requireId, requireText } from './common';

export interface CustomerAccountRow {
  id: string;
  storeId: string;
  name: string;
  phone: string | null;
  notes: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerAccountInput {
  id: string;
  storeId: string;
  name: string;
  phone?: string | null;
  notes?: string | null;
  status?: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
  updatedAt?: string;
}

type CustomerAccountRecord = Record<string, string | number | null>;

function mapRow(row: CustomerAccountRecord): CustomerAccountRow {
  return {
    id: row.id as string,
    storeId: row.store_id as string,
    name: row.name as string,
    phone: (row.phone as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    status: row.status as 'ACTIVE' | 'INACTIVE',
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

const COLUMNS = 'id, store_id, name, phone, notes, status, created_at, updated_at';

export function createCustomerAccount(
  adapter: DatabaseAdapter,
  input: CreateCustomerAccountInput,
): CustomerAccountRow {
  const id = requireId(input.id);
  const storeId = requireId(input.storeId);
  const name = requireText(input.name.trim(), 'Customer name', 200);
  const phone = optionalText(input.phone?.trim(), 'Phone', 32);
  const notes = optionalText(input.notes?.trim(), 'Notes', 500);
  const status = input.status ?? 'ACTIVE';

  if (status !== 'ACTIVE' && status !== 'INACTIVE') {
    throw new DomainError('INVALID_VALUE', 'Customer account status must be ACTIVE or INACTIVE.');
  }

  const createdAt = input.createdAt ?? nowIso();
  const updatedAt = input.updatedAt ?? createdAt;

  adapter.run(
    `INSERT INTO customer_accounts
      (id, store_id, name, phone, notes, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    [id, storeId, name, phone, notes, status, createdAt, updatedAt],
  );

  const row = adapter.getFirstRow<CustomerAccountRecord>(
    `SELECT ${COLUMNS} FROM customer_accounts WHERE id = ?;`,
    [id],
  );
  if (!row) {
    throw new Error('Customer account insert did not persist.');
  }
  return mapRow(row);
}

export function getCustomerAccountById(
  adapter: DatabaseAdapter,
  id: string,
): CustomerAccountRow | null {
  const row = adapter.getFirstRow<CustomerAccountRecord>(
    `SELECT ${COLUMNS} FROM customer_accounts WHERE id = ?;`,
    [requireId(id)],
  );
  return row ? mapRow(row) : null;
}

export function searchCustomerAccounts(
  adapter: DatabaseAdapter,
  storeId: string,
  query: string,
  limit = 20,
): CustomerAccountRow[] {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return listCustomerAccounts(adapter, storeId, limit);
  }

  const pattern = `%${trimmed.toLowerCase()}%`;
  return adapter
    .getAllRows<CustomerAccountRecord>(
      `SELECT ${COLUMNS} FROM customer_accounts
       WHERE store_id = ? AND status = 'ACTIVE' AND LOWER(name) LIKE ?
       ORDER BY name ASC
       LIMIT ?;`,
      [requireId(storeId), pattern, Math.max(1, Math.min(limit, 100))],
    )
    .map(mapRow);
}

export function listCustomerAccounts(
  adapter: DatabaseAdapter,
  storeId: string,
  limit = 50,
): CustomerAccountRow[] {
  return adapter
    .getAllRows<CustomerAccountRecord>(
      `SELECT ${COLUMNS} FROM customer_accounts
       WHERE store_id = ? AND status = 'ACTIVE'
       ORDER BY name ASC
       LIMIT ?;`,
      [requireId(storeId), Math.max(1, Math.min(limit, 100))],
    )
    .map(mapRow);
}
