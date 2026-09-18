import { DomainError } from '@retail/domain';

import type { DatabaseAdapter } from '../adapter';
import { nowIso, requireId, requireText } from './common';

export type SupplierStatus = 'ACTIVE' | 'INACTIVE';

export interface SupplierRow {
  id: string;
  storeId: string;
  name: string;
  status: SupplierStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplierInput {
  id: string;
  storeId: string;
  name: string;
  status?: SupplierStatus;
  createdAt?: string;
  updatedAt?: string;
}

type SupplierRecord = Record<string, string | number | null>;

const COLUMNS = 'id, store_id, name, status, created_at, updated_at';

function mapRow(row: SupplierRecord): SupplierRow {
  return {
    id: row.id as string,
    storeId: row.store_id as string,
    name: row.name as string,
    status: row.status as SupplierStatus,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function createSupplier(adapter: DatabaseAdapter, input: CreateSupplierInput): SupplierRow {
  const id = requireId(input.id);
  const storeId = requireId(input.storeId);
  const name = requireText(input.name.trim(), 'Supplier name', 200);
  const status = input.status ?? 'ACTIVE';
  if (status !== 'ACTIVE' && status !== 'INACTIVE') {
    throw new DomainError('INVALID_VALUE', 'Supplier status must be ACTIVE or INACTIVE.');
  }
  const createdAt = input.createdAt ?? nowIso();
  const updatedAt = input.updatedAt ?? createdAt;
  adapter.run(
    `INSERT INTO suppliers (id, store_id, name, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?);`,
    [id, storeId, name, status, createdAt, updatedAt],
  );
  const created = getSupplierById(adapter, id);
  if (!created) {
    throw new Error('Supplier insert did not persist.');
  }
  return created;
}

export function getSupplierById(adapter: DatabaseAdapter, id: string): SupplierRow | null {
  const row = adapter.getFirstRow<SupplierRecord>(
    `SELECT ${COLUMNS} FROM suppliers WHERE id = ?;`,
    [requireId(id)],
  );
  return row ? mapRow(row) : null;
}

export function listSuppliersByStore(adapter: DatabaseAdapter, storeId: string): SupplierRow[] {
  return adapter
    .getAllRows<SupplierRecord>(
      `SELECT ${COLUMNS} FROM suppliers WHERE store_id = ? ORDER BY name COLLATE NOCASE ASC, id ASC;`,
      [requireId(storeId)],
    )
    .map(mapRow);
}

export function searchSuppliersByStore(
  adapter: DatabaseAdapter,
  storeId: string,
  query: string,
): SupplierRow[] {
  const trimmed = query.trim();
  return adapter
    .getAllRows<SupplierRecord>(
      `SELECT ${COLUMNS}
       FROM suppliers
       WHERE store_id = ? AND status = 'ACTIVE' AND name LIKE ? ESCAPE '\\'
       ORDER BY name COLLATE NOCASE ASC, id ASC;`,
      [requireId(storeId), `%${trimmed.replace(/[\\%_]/g, (match) => `\\${match}`)}%`],
    )
    .map(mapRow);
}
