import { DatabaseError } from '../src/db';
import { NodeTestAdapter } from '../src/db/nodeTestAdapter';
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
      () => undefined,
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
        () => undefined,
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
        () => undefined,
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
        () => undefined,
      );
    } catch (error) {
      failure = error;
    }
    expect(failure).toBe(original);
  });
});

describe('adapter transaction contract', () => {
  it('rolls back an async callback on the node driver with a typed error', async () => {
    const isolated = openIsolatedDatabase([]);
    let pendingWork!: Promise<string>;
    try {
      isolated.adapter.exec('CREATE TABLE probe (id TEXT);');
      let failure: unknown;
      try {
        isolated.adapter.transaction(() => {
          isolated.adapter.run("INSERT INTO probe (id) VALUES ('early');");
          pendingWork = Promise.resolve('late');
          return pendingWork as unknown as string;
        });
      } catch (error) {
        failure = error;
      }
      expect(failure).toBeInstanceOf(DatabaseError);
      expect((failure as DatabaseError).code).toBe('INVALID_TRANSACTION_USE');
      await pendingWork;
      expect(() => isolated.adapter.getAllRows('SELECT id FROM probe;')).toThrow(
        'reopen it before further work',
      );
      isolated.adapter.close();
      const reopened = new NodeTestAdapter(isolated.path);
      try {
        expect(reopened.getAllRows<{ id: string }>('SELECT id FROM probe;')).toEqual([]);
      } finally {
        reopened.close();
      }
    } finally {
      isolated.closeAndDelete();
    }
  });

  it('blocks writes from a rejected async continuation after rollback', async () => {
    const isolated = openIsolatedDatabase([]);
    let lateAttempt!: Promise<void>;
    try {
      isolated.adapter.exec('CREATE TABLE continuation_probe (id TEXT);');

      expect(() =>
        isolated.adapter.transaction(() => {
          lateAttempt = (async () => {
            await Promise.resolve();
            isolated.adapter.run("INSERT INTO continuation_probe (id) VALUES ('escaped');");
          })();
          return lateAttempt as unknown as string;
        }),
      ).toThrow(DatabaseError);

      await expect(lateAttempt).rejects.toMatchObject({ code: 'INVALID_TRANSACTION_USE' });
      isolated.adapter.close();
      const reopened = new NodeTestAdapter(isolated.path);
      try {
        expect(
          reopened.getAllRows<{ id: string }>('SELECT id FROM continuation_probe;'),
        ).toEqual([]);
      } finally {
        reopened.close();
      }
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
