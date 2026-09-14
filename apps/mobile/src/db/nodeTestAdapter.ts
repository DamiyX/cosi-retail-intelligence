import { DatabaseSync } from 'node:sqlite';

import type { DatabaseAdapter, SqlParams, StatementResult, SyncWork } from './adapter';
import { DatabaseError } from './errors';
import { runSyncTransaction } from './transaction';

/**
 * TEST-ONLY driver. Production code must never import this module: it binds
 * node:sqlite, which does not exist in the Metro/Expo runtime. Jest tests use
 * it to exercise the exact same migration and repository code that runs
 * on-device through the expo-sqlite adapter.
 */
export class NodeTestAdapter implements DatabaseAdapter {
  private readonly database: DatabaseSync;
  private closed = false;
  private invalidAsyncTransactionDetected = false;

  constructor(path: string) {
    try {
      this.database = new DatabaseSync(path);
    } catch (error) {
      throw new DatabaseError('OPEN_FAILED', `Unable to open the test database at ${path}.`, error);
    }
  }

  exec(script: string): void {
    this.assertOperationsAllowed();
    this.database.exec(script);
  }

  run(sql: string, params: SqlParams = []): StatementResult {
    this.assertOperationsAllowed();
    const result = this.database.prepare(sql).run(...params);
    return { changes: Number(result.changes), lastInsertRowid: Number(result.lastInsertRowid) };
  }

  getFirstRow<T>(sql: string, params: SqlParams = []): T | null {
    this.assertOperationsAllowed();
    const row = this.database.prepare(sql).get(...params) as T | undefined;
    return row ?? null;
  }

  getAllRows<T>(sql: string, params: SqlParams = []): T[] {
    this.assertOperationsAllowed();
    return this.database.prepare(sql).all(...params) as T[];
  }

  transaction<T>(work: () => SyncWork<T>): T {
    this.assertOperationsAllowed();
    return runSyncTransaction(
      () => this.database.exec('BEGIN IMMEDIATE'),
      () => this.database.exec('COMMIT'),
      () => this.database.exec('ROLLBACK'),
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
      this.database.close();
    }
  }
}
