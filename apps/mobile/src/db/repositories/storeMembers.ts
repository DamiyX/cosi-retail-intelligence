import { DomainError } from '@retail/domain';

import type { DatabaseAdapter } from '../adapter';
import { nowIso, requireId } from './common';

export type MemberRole = 'OWNER' | 'ADMIN' | 'STAFF';

const ROLES: readonly MemberRole[] = ['OWNER', 'ADMIN', 'STAFF'];

export interface StoreMemberRow {
  id: string;
  storeId: string;
  userId: string;
  role: MemberRole;
  status: string;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStoreMemberInput {
  id: string;
  storeId: string;
  userId: string;
  role: MemberRole;
}

function mapRow(row: Record<string, string | null>): StoreMemberRow {
  const role = row.role as string;
  if (role !== 'OWNER' && role !== 'ADMIN' && role !== 'STAFF') {
    throw new DomainError('INVALID_VALUE', `Stored member role is invalid: ${role}.`);
  }
  return {
    id: row.id as string,
    storeId: row.store_id as string,
    userId: row.user_id as string,
    role,
    status: row.status as string,
    joinedAt: row.joined_at as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function createStoreMember(
  adapter: DatabaseAdapter,
  input: CreateStoreMemberInput,
): StoreMemberRow {
  const id = requireId(input.id);
  const storeId = requireId(input.storeId);
  const userId = requireId(input.userId);
  if (!ROLES.includes(input.role)) {
    throw new DomainError('INVALID_VALUE', 'Member role must be OWNER, ADMIN, or STAFF.');
  }
  const timestamp = nowIso();
  adapter.run(
    `INSERT INTO store_members
      (id, store_id, user_id, role, status, joined_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?, ?);`,
    [id, storeId, userId, input.role, timestamp, timestamp, timestamp],
  );
  const created = getStoreMemberById(adapter, id);
  if (!created) {
    throw new Error('Store member insert did not persist.');
  }
  return created;
}

export function getStoreMemberById(adapter: DatabaseAdapter, id: string): StoreMemberRow | null {
  const row = adapter.getFirstRow<Record<string, string | null>>(
    `SELECT id, store_id, user_id, role, status, joined_at, created_at, updated_at
     FROM store_members WHERE id = ?;`,
    [requireId(id)],
  );
  return row ? mapRow(row) : null;
}

export function countStoreMembers(adapter: DatabaseAdapter, storeId: string): number {
  const row = adapter.getFirstRow<{ total: number }>(
    'SELECT COUNT(*) AS total FROM store_members WHERE store_id = ?;',
    [requireId(storeId)],
  );
  return row?.total ?? 0;
}
