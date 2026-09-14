import type { DatabaseAdapter } from './adapter';
import { DatabaseError } from './errors';
import { openExpoSqliteAdapter } from './expoSqliteAdapter';
import { MIGRATIONS, openDatabase } from './migrations';

export const APP_DATABASE_FILE_NAME = 'retail.db';

export type DatabaseInitStatus =
  | { state: 'ready'; adapter: DatabaseAdapter; schemaVersion: number; path: string }
  | { state: 'failed'; code: string; message: string };

/**
 * Open and migrate the application database during startup. Returns a plain
 * status instead of throwing so the shell can show loading, ready, or a
 * diagnosable error without ever reporting a false ready state. The opener
 * is injectable so automated tests cover fresh, existing, and failing
 * databases without a native runtime.
 *
 * Foreign-key enforcement is required for readiness: without it the
 * relational-integrity boundary is gone. WAL mode stays informational
 * because it is conditional on platform support.
 */
export function initializeAppDatabase(
  openAdapter: () => DatabaseAdapter = () => openExpoSqliteAdapter(APP_DATABASE_FILE_NAME),
): DatabaseInitStatus {
  let adapter: DatabaseAdapter | null = null;
  try {
    adapter = openAdapter();
    const report = openDatabase(adapter, MIGRATIONS);
    if (!report.foreignKeysEnforced) {
      throw new DatabaseError(
        'FOREIGN_KEYS_NOT_ENFORCED',
        'SQLite foreign-key enforcement could not be enabled; refusing to report a ready database.',
      );
    }
    return { state: 'ready', adapter, schemaVersion: report.schemaVersion, path: APP_DATABASE_FILE_NAME };
  } catch (error) {
    if (adapter) {
      try {
        adapter.close();
      } catch {
        // Best-effort cleanup; the original failure is what matters.
      }
    }
    if (error instanceof DatabaseError) {
      return { state: 'failed', code: error.code, message: error.message };
    }
    return {
      state: 'failed',
      code: 'UNEXPECTED',
      message: error instanceof Error ? error.message : 'Unknown local database failure.',
    };
  }
}
