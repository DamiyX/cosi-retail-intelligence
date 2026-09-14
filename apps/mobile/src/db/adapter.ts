/**
 * Minimal synchronous database port.
 *
 * Both supported drivers expose a synchronous API (expo-sqlite's sync
 * interface on-device, node:sqlite in Jest). A synchronous port keeps
 * transaction boundaries explicit: when a repository call returns, its
 * statement has executed, and when a transaction callback returns without
 * throwing, the commit has completed. This avoids splitting transaction
 * control across async schedulers for M1's small local writes.
 */
export type SqlParams = readonly (string | number | null)[];

export interface StatementResult {
  changes: number;
  lastInsertRowid: number;
}

/**
 * A synchronous transaction body. The conditional return type collapses to
 * never for async functions, so passing an async callback is a compile-time
 * error; a runtime thenable guard in each adapter covers the rest.
 */
export type SyncWork<T> = T extends PromiseLike<unknown> ? never : T;

export interface DatabaseAdapter {
  /** Run a multi-statement script (migrations, pragmas). No parameters. */
  exec(script: string): void;
  /** Run one parameterized INSERT/UPDATE/DELETE statement. */
  run(sql: string, params?: SqlParams): StatementResult;
  /** Return the first row of a parameterized SELECT, or null. */
  getFirstRow<T>(sql: string, params?: SqlParams): T | null;
  /** Return every row of a parameterized SELECT. */
  getAllRows<T>(sql: string, params?: SqlParams): T[];
  /**
   * Run work atomically. A throw rolls everything back and propagates the
   * original error; a clean return commits before this returns.
   */
  transaction<T>(work: () => SyncWork<T>): T;
  /** Release the underlying connection. */
  close(): void;
}
