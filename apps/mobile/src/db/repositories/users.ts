import type { DatabaseAdapter } from '../adapter';
import { nowIso, optionalText, requireId, requireText } from './common';

export interface UserRow {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  id: string;
  displayName: string;
  email?: string | null;
  phone?: string | null;
}

function mapRow(row: Record<string, string | null>): UserRow {
  return {
    id: row.id as string,
    displayName: row.display_name as string,
    email: row.email,
    phone: row.phone,
    status: row.status as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function createUser(adapter: DatabaseAdapter, input: CreateUserInput): UserRow {
  const id = requireId(input.id);
  const displayName = requireText(input.displayName, 'user display name');
  const email = optionalText(input.email, 'user email');
  const phone = optionalText(input.phone, 'user phone');
  const timestamp = nowIso();
  adapter.run(
    `INSERT INTO users (id, display_name, email, phone, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?);`,
    [id, displayName, email, phone, timestamp, timestamp],
  );
  const created = getUserById(adapter, id);
  if (!created) {
    throw new Error('User insert did not persist.');
  }
  return created;
}

export function getUserById(adapter: DatabaseAdapter, id: string): UserRow | null {
  const row = adapter.getFirstRow<Record<string, string | null>>(
    `SELECT id, display_name, email, phone, status, created_at, updated_at
     FROM users WHERE id = ?;`,
    [requireId(id)],
  );
  return row ? mapRow(row) : null;
}
