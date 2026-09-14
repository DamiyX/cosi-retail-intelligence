import { DatabaseError } from '../src/db';
import { openIsolatedDatabase } from '../src/db/testing';
import { runSyncTransaction } from '../src/db/transaction';

describe('runSyncTransaction', () => {
  it('begins, works, and commits in order, returning the value', () => {
    const calls: string[] = [];
    const result = runSyncTransaction(
      () => calls.push('begin'),
      () => calls.push('commit'),
      () => calls.push('rollback'),
      () => {
        calls.push('work');
        return 42;
      },
    );
    expect(result).toBe(42);
    expect(calls).toEqual(['begin', 'work', 'commit']);
  });

  it('rolls back and rethrows the original synchronous error', () => {
    const calls: string[] = [];
    const original = new Error('work failed');
    let failure: unknown;
    try {
      runSyncTransaction(
        () => calls.push('begin'),
        () => calls.push('commit'),
        () => calls.push('rollback'),
        () => {
          throw original;
        },
      );
    } catch (error) {
      failure = error;
    }
    expect(failure).toBe(original);
    expect(calls).toEqual(['begin', 'rollback']);
  });

  it('rolls back an async callback instead of committing its promise', () => {
    const calls: string[] = [];
    let failure: unknown;
    try {
      runSyncTransaction(
        () => calls.push('begin'),
        () => calls.push('commit'),
        () => calls.push('rollback'),
        () => Promise.resolve(1) as unknown as number,
      );
    } catch (error) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(DatabaseError);
    expect((failure as DatabaseError).code).toBe('INVALID_TRANSACTION_USE');
    expect(calls).toEqual(['begin', 'rollback']);
  });

  it('still reports the original error when rollback itself fails', () => {
    const original = new Error('work failed');
    let failure: unknown;
    try {
      runSyncTransaction(
        () => undefined,
        () => undefined,
        () => {
          throw new Error('rollback failed');
        },
        () => {
          throw original;
        },
      );
    } catch (error) {
      failure = error;
    }
    expect(failure).toBe(original);
  });
});

describe('adapter transaction contract', () => {
  it('rolls back an async callback on the node driver with a typed error', () => {
    const isolated = openIsolatedDatabase([]);
    try {
      isolated.adapter.exec('CREATE TABLE probe (id TEXT);');
      let failure: unknown;
      try {
        isolated.adapter.transaction(() => {
          isolated.adapter.run("INSERT INTO probe (id) VALUES ('early');");
          return Promise.resolve('late') as unknown as string;
        });
      } catch (error) {
        failure = error;
      }
      expect(failure).toBeInstanceOf(DatabaseError);
      expect((failure as DatabaseError).code).toBe('INVALID_TRANSACTION_USE');
      const rows = isolated.adapter.getAllRows<{ id: string }>('SELECT id FROM probe;');
      expect(rows).toEqual([]);
    } finally {
      isolated.closeAndDelete();
    }
  });

  it('does not accept async callbacks in its TypeScript API', () => {
    const isolated = openIsolatedDatabase([]);
    try {
      expect(() =>
        isolated.adapter.transaction(
          // @ts-expect-error async callbacks cannot satisfy the sync transaction contract
          async () => 1,
        ),
      ).toThrow(DatabaseError);
    } finally {
      isolated.closeAndDelete();
    }
  });
});
