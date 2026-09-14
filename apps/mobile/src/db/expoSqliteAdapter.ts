import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

import type { DatabaseAdapter, SqlParams, StatementResult, SyncWork } from './adapter';
import { DatabaseError } from './errors';
import { runSyncTransaction } from './transaction';

class ExpoSqliteAdapter implements DatabaseAdapter {
  private readonly database: SQLiteDatabase;
  private closed = false;
  private invalidAsyncTransactionDetected = false;

  constructor(database: SQLiteDatabase) {
    this.database = database;
  }

  exec(script: string): void {
    this.assertOperationsAllowed();
    this.database.execSync(script);
  }

  run(sql: string, params: SqlParams = []): StatementResult {
    this.assertOperationsAllowed();
    const result = this.database.runSync(sql, [...params]);
    return { changes: result.changes, lastInsertRowid: result.lastInsertRowId };
  }

  getFirstRow<T>(sql: string, params: SqlParams = []): T | null {
    this.assertOperationsAllowed();
    return this.database.getFirstSync<T>(sql, [...params]);
  }

  getAllRows<T>(sql: string, params: SqlParams = []): T[] {
    this.assertOperationsAllowed();
    return this.database.getAllSync<T>(sql, [...params]);
  }

  transaction<T>(work: () => SyncWork<T>): T {
    this.assertOperationsAllowed();
    // withTransactionSync cannot return a value, so the adapter controls the
    // transaction explicitly through the shared synchronous runner: same
    // BEGIN IMMEDIATE/COMMIT/ROLLBACK semantics as the node test driver, plus
    // the async-callback guard. A throw rolls back and rethrows the original
    // error, a clean return commits before this returns.
    return runSyncTransaction(
      () => this.database.execSync('BEGIN IMMEDIATE;'),
      () => this.database.execSync('COMMIT;'),
      () => this.database.execSync('ROLLBACK;'),
      work,
      () => this.invalidateAfterAsyncTransaction(),
    );
  }

  private assertOperationsAllowed(): void {
    if (this.invalidAsyncTransactionDetected) {
      throw new DatabaseError(
        'INVALID_TRANSACTION_USE',
        'This database connection is blocked after an invalid async transaction callback; reopen it before further work.',
      );
    }
  }

  private invalidateAfterAsyncTransaction(): void {
    this.invalidAsyncTransactionDetected = true;
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
