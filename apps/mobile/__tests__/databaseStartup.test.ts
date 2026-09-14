import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { MIGRATIONS, openDatabase } from '../src/db';
import type { DatabaseAdapter, SqlParams, StatementResult, SyncWork } from '../src/db/adapter';
import { initializeAppDatabase } from '../src/db/initialize';
import { NodeTestAdapter } from '../src/db/nodeTestAdapter';
import { openIsolatedDatabase } from '../src/db/testing';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { appEnvironment: 'development' } } },
}));

function makeFileOpener() {
  const directory = mkdtempSync(join(tmpdir(), 'retail-init-test-'));
  const path = join(directory, 'app.db');
  return {
    path,
    open: () => new NodeTestAdapter(path),
    remove: () => rmSync(directory, { recursive: true, force: true }),
  };
}

describe('application database startup', () => {
  it('reaches readiness on a fresh install', () => {
    const files = makeFileOpener();
    try {
      const status = initializeAppDatabase(files.open);
      expect(status.state).toBe('ready');
      if (status.state === 'ready') {
        expect(status.schemaVersion).toBe(1);
        expect(status.path).toBe('retail.db');
        status.adapter.close();
      }
    } finally {
      files.remove();
    }
  });

  it('reaches readiness on an existing migrated database', () => {
    const files = makeFileOpener();
    try {
      const first = new NodeTestAdapter(files.path);
      openDatabase(first, MIGRATIONS);
      first.close();

      const status = initializeAppDatabase(files.open);
      expect(status.state).toBe('ready');
      if (status.state === 'ready') {
        expect(status.schemaVersion).toBe(1);
        status.adapter.close();
      }
    } finally {
      files.remove();
    }
  });

  it('reports a diagnosable failure instead of readiness when migration state is unsupported', () => {
    const isolated = openIsolatedDatabase([]);
    try {
      isolated.adapter.exec(
        "INSERT INTO schema_migrations (version, name, applied_at) VALUES (99, 'future', '2026-09-14T00:00:00.000Z');",
      );
      const status = initializeAppDatabase(() => isolated.adapter);
      expect(status.state).toBe('failed');
      if (status.state === 'failed') {
        expect(status.code).toBe('MIGRATION_HISTORY_MISMATCH');
        expect(status.message).toContain('99');
      }
    } finally {
      isolated.closeAndDelete();
    }
  });

  it('reports opener failures without a false ready state', () => {
    const status = initializeAppDatabase(() => {
      throw new Error('No native database module in this runtime.');
    });
    expect(status).toEqual({
      state: 'failed',
      code: 'UNEXPECTED',
      message: 'No native database module in this runtime.',
    });
  });

  it('refuses readiness when foreign keys cannot be enforced', () => {
    const isolated = openIsolatedDatabase([]);
    try {
      isolated.adapter.exec('PRAGMA foreign_keys = OFF;');
      const withoutForeignKeys = new NoForeignKeysAdapter(isolated.adapter);
      const status = initializeAppDatabase(() => withoutForeignKeys);
      expect(status.state).toBe('failed');
      if (status.state === 'failed') {
        expect(status.code).toBe('FOREIGN_KEYS_NOT_ENFORCED');
      }
    } finally {
      isolated.closeAndDelete();
    }
  });
});

/** Simulates a platform where PRAGMA foreign_keys cannot be enabled. */
class NoForeignKeysAdapter implements DatabaseAdapter {
  constructor(private readonly inner: DatabaseAdapter) {}

  exec(script: string): void {
    if (!script.includes('foreign_keys')) {
      this.inner.exec(script);
    }
  }

  run(sql: string, params?: SqlParams): StatementResult {
    return this.inner.run(sql, params);
  }

  getFirstRow<T>(sql: string, params?: SqlParams): T | null {
    return this.inner.getFirstRow<T>(sql, params);
  }

  getAllRows<T>(sql: string, params?: SqlParams): T[] {
    return this.inner.getAllRows<T>(sql, params);
  }

  transaction<T>(work: () => SyncWork<T>): T {
    return this.inner.transaction(work);
  }

  close(): void {
    this.inner.close();
  }
}
