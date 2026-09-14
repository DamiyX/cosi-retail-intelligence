import { DatabaseSync } from 'node:sqlite';

import type { DatabaseAdapter, SqlParams, StatementResult } from './adapter';
import { DatabaseError } from './errors';

/**
 * TEST-ONLY driver. Production code must never import this module: it binds
 * node:sqlite, which does not exist in the Metro/Expo runtime. Jest tests use
 * it to exercise the exact same migration and repository code that runs
 * on-device through the expo-sqlite adapter.
 */
export class NodeTestAdapter implements DatabaseAdapter {
  private readonly database: DatabaseSync;
  private closed = false;

  constructor(path: string) {
    try {
      this.database = new DatabaseSync(path);
    } catch (error) {
      throw new DatabaseError('OPEN_FAILED', `Unable to open the test database at ${path}.`, error);
    }
  }

  exec(script: string): void {
    this.database.exec(script);
  }

  run(sql: string, params: SqlParams = []): StatementResult {
    const result = this.database.prepare(sql).run(...params);
    return { changes: Number(result.changes), lastInsertRowid: Number(result.lastInsertRowid) };
  }

  getFirstRow<T>(sql: string, params: SqlParams = []): T | null {
    const row = this.database.prepare(sql).get(...params) as T | undefined;
    return row ?? null;
  }

  getAllRows<T>(sql: string, params: SqlParams = []): T[] {
    return this.database.prepare(sql).all(...params) as T[];
  }

  transaction<T>(work: () => T): T {
    this.database.exec('BEGIN IMMEDIATE');
    try {
      const result = work();
      this.database.exec('COMMIT');
      return result;
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }
  }

  close(): void {
    if (!this.closed) {
      this.closed = true;
      this.database.close();
    }
  }
}
