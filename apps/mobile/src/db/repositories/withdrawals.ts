import { DomainError } from '@retail/domain';

import type { DatabaseAdapter } from '../adapter';
import { nowIso, optionalText, requireId, requireText } from './common';

export interface OwnerWithdrawalRow {
  id: string;
  storeId: string;
  amountMinor: number;
  currencyCode: string;
  note: string | null;
  occurredAt: string;
  createdByStoreMemberId: string;
  createdByUserId: string;
  deviceId: string;
  createdAt: string;
}

export interface CreateOwnerWithdrawalInput {
  id: string;
  storeId: string;
  amountMinor: number;
  currencyCode: string;
  note?: string | null;
  occurredAt: string;
  createdByStoreMemberId: string;
  createdByUserId: string;
  deviceId: string;
  createdAt?: string;
}

type WithdrawalRecord = Record<string, string | number | null>;

const CURRENCY_PATTERN = /^[A-Z]{3}$/;

function requireAmountMinor(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new DomainError('INVALID_MONEY', 'Owner withdrawal amount must be a positive safe integer in minor units.');
  }
  return value;
}

function requireCurrencyCode(value: unknown): string {
  if (typeof value !== 'string' || !CURRENCY_PATTERN.test(value)) {
    throw new DomainError('CURRENCY_MISMATCH', 'Owner withdrawal currency must be a 3-letter uppercase code.');
  }
  return value;
}

function mapRow(row: WithdrawalRecord): OwnerWithdrawalRow {
  return {
    id: row.id as string,
    storeId: row.store_id as string,
    amountMinor: requireAmountMinor(row.amount_minor),
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
  'id, store_id, amount_minor, currency_code, note, occurred_at, ' +
  'created_by_store_member_id, created_by_user_id, device_id, created_at';

export function createOwnerWithdrawal(
  adapter: DatabaseAdapter,
  input: CreateOwnerWithdrawalInput,
): OwnerWithdrawalRow {
  const id = requireId(input.id);
  const storeId = requireId(input.storeId);
  const amountMinor = requireAmountMinor(input.amountMinor);
  const currencyCode = requireCurrencyCode(input.currencyCode);
  const note = optionalText(input.note, 'Owner withdrawal note');
  const occurredAt = requireText(input.occurredAt, 'Owner withdrawal occurred-at timestamp', 64);
  const createdByStoreMemberId = requireId(input.createdByStoreMemberId);
  const createdByUserId = requireId(input.createdByUserId);
  const deviceId = requireId(input.deviceId);
  const createdAt = input.createdAt === undefined ? nowIso() : requireText(input.createdAt, 'Owner withdrawal created-at timestamp', 64);
  adapter.run(
    `INSERT INTO owner_withdrawals
      (id, store_id, amount_minor, currency_code, note, occurred_at,
       created_by_store_member_id, created_by_user_id, device_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      id,
      storeId,
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
  const created = getOwnerWithdrawalById(adapter, id);
  if (!created) throw new Error('Owner withdrawal insert did not persist.');
  return created;
}

export function getOwnerWithdrawalById(adapter: DatabaseAdapter, id: string): OwnerWithdrawalRow | null {
  const row = adapter.getFirstRow<WithdrawalRecord>(
    `SELECT ${COLUMNS} FROM owner_withdrawals WHERE id = ?;`,
    [requireId(id)],
  );
  return row ? mapRow(row) : null;
}

export function listOwnerWithdrawalsByStore(adapter: DatabaseAdapter, storeId: string): OwnerWithdrawalRow[] {
  return adapter
    .getAllRows<WithdrawalRecord>(
      `SELECT ${COLUMNS}
       FROM owner_withdrawals
       WHERE store_id = ?
       ORDER BY occurred_at DESC, created_at DESC, id DESC;`,
      [requireId(storeId)],
    )
    .map(mapRow);
}

export function listOwnerWithdrawalsByStoreInRange(
  adapter: DatabaseAdapter,
  storeId: string,
  startUtc: string,
  endUtc: string,
): OwnerWithdrawalRow[] {
  return adapter
    .getAllRows<WithdrawalRecord>(
      `SELECT ${COLUMNS}
       FROM owner_withdrawals
       WHERE store_id = ? AND occurred_at >= ? AND occurred_at < ?
       ORDER BY occurred_at ASC, created_at ASC, id ASC;`,
      [requireId(storeId), startUtc, endUtc],
    )
    .map(mapRow);
}
