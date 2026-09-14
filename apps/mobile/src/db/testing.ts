import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { DatabaseAdapter } from './adapter';
import { type Migration, openDatabase, type OpenDatabaseReport } from './migrations';
import { NodeTestAdapter } from './nodeTestAdapter';

export interface IsolatedDatabase {
  adapter: DatabaseAdapter;
  report: OpenDatabaseReport;
  path: string;
  closeAndDelete(): void;
}

/**
 * Open a throwaway file database for one test. File-backed (not :memory:) so
 * WAL journal mode is exercised exactly like on-device storage. Nothing is
 * written inside the repository; closeAndDelete removes the temp directory.
 */
export function openIsolatedDatabase(migrations: readonly Migration[] = []): IsolatedDatabase {
  const directory = mkdtempSync(join(tmpdir(), 'retail-db-test-'));
  const path = join(directory, 'test.db');
  const adapter = new NodeTestAdapter(path);
  let closed = false;
  const closeAdapter = (): void => {
    if (!closed) {
      closed = true;
      adapter.close();
    }
  };
  try {
    const report = openDatabase(adapter, migrations);
    return {
      adapter,
      report,
      path,
      closeAndDelete() {
        closeAdapter();
        rmSync(directory, { recursive: true, force: true });
      },
    };
  } catch (error) {
    closeAdapter();
    rmSync(directory, { recursive: true, force: true });
    throw error;
  }
}
