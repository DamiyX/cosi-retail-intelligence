import type { DatabaseAdapter, SyncWork } from '../src/db/adapter';
import { FailOnWriteAdapter } from './catalogueSupport';

export class BoundaryAdapter extends FailOnWriteAdapter {
  beforeTransaction?: () => void;
  afterRead?: (sql: string) => void;
  constructor(readonly base: DatabaseAdapter) { super(base, Number.MAX_SAFE_INTEGER, new Error('Unused')); }
  transaction<T>(work: () => SyncWork<T>): T {
    const change = this.beforeTransaction; this.beforeTransaction = undefined; change?.();
    return this.base.transaction(work);
  }
  getFirstRow<T>(sql: string, params: Parameters<DatabaseAdapter['getFirstRow']>[1]): T | null {
    const result = this.base.getFirstRow<T>(sql, params); this.afterRead?.(sql); return result;
  }
}

export function businessSnapshot(db: DatabaseAdapter) {
  const references = new Set(['users', 'stores', 'store_members', 'devices', 'sync_store_state']);
  return db.getAllRows<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;")
    .filter(row => !references.has(row.name)).map(({ name }) => ({ name, rows: db.getAllRows(`SELECT * FROM "${name.replace(/"/g, '""')}" ORDER BY rowid;`) }));
}
