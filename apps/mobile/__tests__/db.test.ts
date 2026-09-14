import {
  CURRENT_SCHEMA_VERSION,
  DatabaseError,
  MIGRATIONS,
  openDatabase,
  type Migration,
} from '../src/db';
import { NodeTestAdapter } from '../src/db/nodeTestAdapter';
import { openIsolatedDatabase } from '../src/db/testing';

const SEED_MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'seed_items',
    statements: [
      'CREATE TABLE items (id TEXT PRIMARY KEY, label TEXT NOT NULL);',
      "INSERT INTO items (id, label) VALUES ('one', 'first');",
    ],
  },
];

describe('durable database boundary', () => {
  it('brings a fresh database to the expected version with enforced pragmas', () => {
    const isolated = openIsolatedDatabase(MIGRATIONS);
    try {
      expect(isolated.report.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
      expect(isolated.report.foreignKeysEnforced).toBe(true);
      expect(isolated.report.journalMode.toLowerCase()).toBe('wal');
    } finally {
      isolated.closeAndDelete();
    }
  });

  it('reopening an up-to-date database neither reruns migrations nor loses data', () => {
    const isolated = openIsolatedDatabase(SEED_MIGRATIONS);
    try {
      isolated.adapter.close();
      const reopened = new NodeTestAdapter(isolated.path);
      try {
        const report = openDatabase(reopened, SEED_MIGRATIONS);
        expect(report.schemaVersion).toBe(1);
        const rows = reopened.getAllRows<{ id: string }>('SELECT id FROM items;');
        expect(rows).toEqual([{ id: 'one' }]);
      } finally {
        reopened.close();
      }
    } finally {
      isolated.closeAndDelete();
    }
  });

  it('rolls a failing migration back completely and keeps prior version and data', () => {
    const broken: Migration[] = [
      ...SEED_MIGRATIONS,
      {
        version: 2,
        name: 'broken_change',
        statements: ['CREATE TABLE doomed (id TEXT);', 'THIS IS NOT VALID SQL;'],
      },
    ];
    const isolated = openIsolatedDatabase(SEED_MIGRATIONS);
    try {
      let failure: unknown;
      try {
        openDatabase(isolated.adapter, broken);
      } catch (error) {
        failure = error;
      }
      expect(failure).toBeInstanceOf(DatabaseError);
      expect((failure as DatabaseError).code).toBe('MIGRATION_FAILED');
      expect((failure as Error).message).toContain('2 (broken_change)');

      const tables = isolated.adapter.getAllRows<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'doomed';",
      );
      expect(tables).toEqual([]);

      const report = openDatabase(isolated.adapter, SEED_MIGRATIONS);
      expect(report.schemaVersion).toBe(1);
      const rows = isolated.adapter.getAllRows<{ id: string }>('SELECT id FROM items;');
      expect(rows).toEqual([{ id: 'one' }]);
    } finally {
      isolated.closeAndDelete();
    }
  });

  it('refuses a database newer than the supported registry instead of resetting it', () => {
    const isolated = openIsolatedDatabase([]);
    try {
      isolated.adapter.exec(
        "INSERT INTO schema_migrations (version, name, applied_at) VALUES (99, 'future', '2026-09-14T00:00:00.000Z');",
      );
      expect(() => openDatabase(isolated.adapter, [])).toThrow(DatabaseError);
      try {
        openDatabase(isolated.adapter, []);
      } catch (error) {
        expect((error as DatabaseError).code).toBe('UNEXPECTED_SCHEMA_VERSION');
      }
    } finally {
      isolated.closeAndDelete();
    }
  });

  it('rejects an invalid migration registry before touching the database', () => {
    const isolated = openIsolatedDatabase([]);
    try {
      const duplicate: Migration[] = [
        { version: 1, name: 'first', statements: ['SELECT 1;'] },
        { version: 1, name: 'duplicate', statements: ['SELECT 1;'] },
      ];
      expect(() => openDatabase(isolated.adapter, duplicate)).toThrow(DatabaseError);
    } finally {
      isolated.closeAndDelete();
    }
  });
});
