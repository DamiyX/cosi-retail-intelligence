import { DatabaseError, openDatabase, type Migration } from '../src/db';
import { openIsolatedDatabase } from '../src/db/testing';

const SECOND_TABLE: Migration = {
  version: 2,
  name: 'second_table',
  statements: ['CREATE TABLE second_table (id TEXT PRIMARY KEY);'],
};

describe('migration history integrity', () => {
  it('rejects a fabricated migration name without resetting data', () => {
    const isolated = openIsolatedDatabase([
      {
        version: 1,
        name: 'seed_items',
        statements: [
          'CREATE TABLE items (id TEXT PRIMARY KEY);',
          "INSERT INTO items (id) VALUES ('one');",
        ],
      },
    ]);
    try {
      isolated.adapter.exec("UPDATE schema_migrations SET name = 'tampered' WHERE version = 1;");
      let failure: unknown;
      try {
        openDatabase(isolated.adapter, [
          {
            version: 1,
            name: 'seed_items',
            statements: ['SELECT 1;'],
          },
        ]);
      } catch (error) {
        failure = error;
      }
      expect(failure).toBeInstanceOf(DatabaseError);
      expect((failure as DatabaseError).code).toBe('MIGRATION_HISTORY_MISMATCH');
      expect((failure as Error).message).toContain('tampered');
      const rows = isolated.adapter.getAllRows<{ id: string }>('SELECT id FROM items;');
      expect(rows).toEqual([{ id: 'one' }]);
    } finally {
      isolated.closeAndDelete();
    }
  });

  it('rejects noncontiguous history with an unexpected later version', () => {
    const registry: Migration[] = [
      {
        version: 1,
        name: 'seed_items',
        statements: ['CREATE TABLE items (id TEXT PRIMARY KEY);'],
      },
      SECOND_TABLE,
    ];
    const isolated = openIsolatedDatabase([registry[0]]);
    try {
      isolated.adapter.exec(
        "INSERT INTO schema_migrations (version, name, applied_at) VALUES (3, 'invented', '2026-09-14T00:00:00.000Z');",
      );
      let failure: unknown;
      try {
        openDatabase(isolated.adapter, registry);
      } catch (error) {
        failure = error;
      }
      expect(failure).toBeInstanceOf(DatabaseError);
      expect((failure as DatabaseError).code).toBe('MIGRATION_HISTORY_MISMATCH');
      const tables = isolated.adapter.getAllRows<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'second_table';",
      );
      expect(tables).toEqual([]);
    } finally {
      isolated.closeAndDelete();
    }
  });

  it('rejects history missing its first migration', () => {
    const registry: Migration[] = [
      {
        version: 1,
        name: 'seed_items',
        statements: ['CREATE TABLE items (id TEXT PRIMARY KEY);'],
      },
      SECOND_TABLE,
    ];
    const isolated = openIsolatedDatabase([]);
    try {
      isolated.adapter.exec(
        "INSERT INTO schema_migrations (version, name, applied_at) VALUES (2, 'second_table', '2026-09-14T00:00:00.000Z');",
      );
      let failure: unknown;
      try {
        openDatabase(isolated.adapter, registry);
      } catch (error) {
        failure = error;
      }
      expect(failure).toBeInstanceOf(DatabaseError);
      expect((failure as DatabaseError).code).toBe('MIGRATION_HISTORY_MISMATCH');
    } finally {
      isolated.closeAndDelete();
    }
  });
});
