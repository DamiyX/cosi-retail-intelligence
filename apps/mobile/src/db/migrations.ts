import type { DatabaseAdapter } from './adapter';
import { DatabaseError } from './errors';

export interface Migration {
  /** 1-based, contiguous position in the registry. */
  version: number;
  /** Short human-readable label used in diagnostics. */
  name: string;
  /** Ordered scripts applied atomically as one unit. */
  statements: string[];
}

export interface OpenDatabaseReport {
  schemaVersion: number;
  foreignKeysEnforced: boolean;
  journalMode: string;
}

/**
 * Ordered migration registry. Append-only: never reorder, rewrite, or delete
 * an entry once devices may hold it.
 */
export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'store_context',
    statements: [
      `CREATE TABLE stores (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        currency_code TEXT NOT NULL,
        country_code TEXT NOT NULL,
        timezone TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,
      `CREATE TABLE users (
        id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,
      `CREATE TABLE store_members (
        id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        role TEXT NOT NULL CHECK (role IN ('OWNER', 'ADMIN', 'STAFF')),
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        joined_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE (store_id, user_id)
      );`,
      'CREATE INDEX idx_store_members_store ON store_members(store_id);',
      'CREATE INDEX idx_store_members_user ON store_members(user_id);',
      `CREATE TABLE devices (
        id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
        user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        platform TEXT NOT NULL CHECK (platform IN ('ANDROID', 'IOS', 'OTHER')),
        device_label TEXT,
        app_version TEXT NOT NULL,
        last_seen_at TEXT,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        created_at TEXT NOT NULL
      );`,
      'CREATE INDEX idx_devices_store ON devices(store_id);',
    ],
  },
];

export const CURRENT_SCHEMA_VERSION = MIGRATIONS.length;

function validateRegistry(migrations: readonly Migration[]): void {
  migrations.forEach((migration, index) => {
    const expectedVersion = index + 1;
    if (
      migration.version !== expectedVersion ||
      typeof migration.name !== 'string' ||
      migration.name.length === 0 ||
      !Array.isArray(migration.statements) ||
      migration.statements.length === 0
    ) {
      throw new DatabaseError(
        'INVALID_MIGRATION_REGISTRY',
        `Migration registry is invalid at position ${index}: expected version ${expectedVersion} with a name and at least one statement.`,
      );
    }
  });
}

function readPragma(adapter: DatabaseAdapter, name: string): string | number | null {
  const row = adapter.getFirstRow<Record<string, string | number | null>>(`PRAGMA ${name}`);
  if (!row) {
    return null;
  }
  const value = row[name];
  return value ?? null;
}

/**
 * Bring a database to the registry version. Safe to call on every launch:
 * applied migrations are recorded in schema_migrations and never rerun.
 * A failing migration rolls back completely, keeps the prior version and
 * data, and throws a diagnosable error. The database is never reset.
 */
export function openDatabase(
  adapter: DatabaseAdapter,
  migrations: readonly Migration[] = MIGRATIONS,
): OpenDatabaseReport {
  validateRegistry(migrations);

  adapter.exec('PRAGMA foreign_keys = ON;');
  adapter.exec('PRAGMA journal_mode = WAL;');

  adapter.exec(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );`,
  );

  const appliedRow = adapter.getFirstRow<{ max_version: number | null }>(
    'SELECT MAX(version) AS max_version FROM schema_migrations;',
  );
  const appliedVersion = appliedRow?.max_version ?? 0;

  if (appliedVersion > migrations.length) {
    throw new DatabaseError(
      'UNEXPECTED_SCHEMA_VERSION',
      `Database schema version ${appliedVersion} is newer than the supported version ${migrations.length}. Update the app instead of resetting data.`,
    );
  }

  for (const migration of migrations.slice(appliedVersion)) {
    try {
      adapter.transaction(() => {
        for (const statement of migration.statements) {
          adapter.exec(statement);
        }
        adapter.run('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?);', [
          migration.version,
          migration.name,
          new Date().toISOString(),
        ]);
      });
    } catch (error) {
      throw new DatabaseError(
        'MIGRATION_FAILED',
        `Migration ${migration.version} (${migration.name}) failed and was rolled back; schema remains at version ${appliedVersion}.`,
        error,
      );
    }
  }

  const foreignKeys = readPragma(adapter, 'foreign_keys');
  const journalMode = readPragma(adapter, 'journal_mode');
  return {
    schemaVersion: migrations.length,
    foreignKeysEnforced: foreignKeys === 1,
    journalMode: typeof journalMode === 'string' ? journalMode : String(journalMode),
  };
}
