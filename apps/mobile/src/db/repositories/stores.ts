import { DomainError } from '@retail/domain';

import type { DatabaseAdapter } from '../adapter';
import { nowIso, requireId, requireText } from './common';

export interface StoreRow {
  id: string;
  name: string;
  currencyCode: string;
  countryCode: string;
  timezone: string;
  status: string;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStoreInput {
  id: string;
  name: string;
  currencyCode: string;
  countryCode: string;
  timezone: string;
  createdByUserId?: string | null;
}

const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const COUNTRY_PATTERN = /^[A-Z]{2}$/;

function mapRow(row: Record<string, string | null>): StoreRow {
  return {
    id: row.id as string,
    name: row.name as string,
    currencyCode: row.currency_code as string,
    countryCode: row.country_code as string,
    timezone: row.timezone as string,
    status: row.status as string,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function createStore(adapter: DatabaseAdapter, input: CreateStoreInput): StoreRow {
  const id = requireId(input.id);
  const name = requireText(input.name, 'store name');
  if (!CURRENCY_PATTERN.test(input.currencyCode)) {
    throw new DomainError('INVALID_VALUE', 'Store currency must be a 3-letter uppercase code.');
  }
  if (!COUNTRY_PATTERN.test(input.countryCode)) {
    throw new DomainError('INVALID_VALUE', 'Store country must be a 2-letter uppercase code.');
  }
  const timezone = requireText(input.timezone, 'store timezone');
  const createdByUserId =
    input.createdByUserId === undefined || input.createdByUserId === null
      ? null
      : requireId(input.createdByUserId);
  const timestamp = nowIso();
  adapter.run(
    `INSERT INTO stores
      (id, name, currency_code, country_code, timezone, status, created_by_user_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?);`,
    [id, name, input.currencyCode, input.countryCode, timezone, createdByUserId, timestamp, timestamp],
  );
  const created = getStoreById(adapter, id);
  if (!created) {
    throw new Error('Store insert did not persist.');
  }
  return created;
}

export function getStoreById(adapter: DatabaseAdapter, id: string): StoreRow | null {
  const row = adapter.getFirstRow<Record<string, string | null>>(
    `SELECT id, name, currency_code, country_code, timezone, status,
            created_by_user_id, created_at, updated_at
     FROM stores WHERE id = ?;`,
    [requireId(id)],
  );
  return row ? mapRow(row) : null;
}

export function countStores(adapter: DatabaseAdapter): number {
  const row = adapter.getFirstRow<{ total: number }>('SELECT COUNT(*) AS total FROM stores;');
  return row?.total ?? 0;
}
