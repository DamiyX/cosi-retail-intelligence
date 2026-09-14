import { DatabaseError } from './errors';

function isThenable(value: unknown): boolean {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) {
    return false;
  }
  const candidate = value as { then?: unknown };
  return typeof candidate.then === 'function';
}

/**
 * Execute work inside one synchronous transaction. The callback must return
 * a plain value: an async callback returns a Promise immediately, which
 * would commit before the awaited writes execute. Such callbacks are
 * rejected by the adapter type signature at compile time and, where a
 * Promise still arrives at runtime, rolled back here with a typed error so
 * the premature commit can never happen silently.
 */
export function runSyncTransaction<T>(
  begin: () => void,
  commit: () => void,
  rollback: () => void,
  work: () => T,
): T {
  begin();
  try {
    const result = work();
    if (isThenable(result)) {
      throw new DatabaseError(
        'INVALID_TRANSACTION_USE',
        'Transaction callbacks must be synchronous; an async callback cannot be committed atomically.',
      );
    }
    commit();
    return result;
  } catch (error) {
    try {
      rollback();
    } catch {
      // The connection is unusable; the original failure is what matters.
    }
    throw error;
  }
}
