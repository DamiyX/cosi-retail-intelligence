import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

import type { DatabaseAdapter, SqlParams, StatementResult } from './adapter';
import { DatabaseError } from './errors';

class ExpoSqliteAdapter implements DatabaseAdapter {
  private readonly database: SQLiteDatabase;
  private closed = false;

  constructor(database: SQLiteDatabase) {
    this.database = database;
  }

  exec(script: string): void {
    this.database.execSync(script);
  }

  run(sql: string, params: SqlParams = []): StatementResult {
    const result = this.database.runSync(sql, [...params]);
    return { changes: result.changes, lastInsertRowid: result.lastInsertRowId };
  }

  getFirstRow<T>(sql: string, params: SqlParams = []): T | null {
    return this.database.getFirstSync<T>(sql, [...params]);
  }

  getAllRows<T>(sql: string, params: SqlParams = []): T[] {
    return this.database.getAllSync<T>(sql, [...params]);
  }

  transaction<T>(work: () => T): T {
    // withTransactionSync cannot return a value, so the adapter controls the
    // transaction explicitly. Same BEGIN IMMEDIATE/COMMIT/ROLLBACK semantics
    // as the node test driver: a throw rolls back and rethrows the original
    // error, a clean return commits before this returns.
    this.database.execSync('BEGIN IMMEDIATE;');
    try {
      const result = work();
      this.database.execSync('COMMIT;');
      return result;
    } catch (error) {
      this.database.execSync('ROLLBACK;');
      throw error;
    }
  }

  close(): void {
    if (!this.closed) {
      this.closed = true;
      this.database.closeSync();
    }
  }
}

/**
 * Open the production on-device database. Thin wrapper only: every behavior
 * (pragmas, migrations, repositories) runs through the adapter port so the
 * same code paths are exercised by tests on the node driver.
 */
export function openExpoSqliteAdapter(path: string): DatabaseAdapter {
  try {
    return new ExpoSqliteAdapter(openDatabaseSync(path));
  } catch (error) {
    throw new DatabaseError('OPEN_FAILED', `Unable to open the local database at ${path}.`, error);
  }
}
