import {
  MAX_BOOTSTRAP_ENTITIES,
  MAX_PULL_CHANGES,
  MAX_PUSH_OPERATIONS,
  parseSyncOperationEnvelope,
  type SyncEntityType,
  type SyncBootstrapRequest,
  type SyncPullRequest,
  type SyncPushRequest,
  type SyncPushResponse,
} from '@retail/contracts';

import type { DatabaseAdapter } from '../db/adapter';
import {
  beginSyncBootstrap,
  claimOutboxBatch,
  commitSyncBootstrap,
  createSyncConflict,
  ensureSyncStoreState,
  failSyncBootstrap,
  getSyncBootstrapState,
  getSyncStoreState,
  markOutboxApplied,
  markOutboxConflict,
  markOutboxPermanent,
  markOutboxRetryable,
  type OutboxOperationRow,
  updateSyncStoreState,
} from '../db/repositories';
import { generateMobileId } from '../crypto/mobileIds';
import { applySyncBootstrapPage, applySyncPullPage } from './applier';
import {
  type AuthenticatedSessionProvider,
  SyncTransportError,
  type SyncTransport,
} from './transport';

const activeRuns = new Set<string>();
const DEFAULT_LEASE_MS = 2 * 60 * 1000;
const DEFAULT_PULL_PAGE_SIZE = MAX_PULL_CHANGES;
const DEFAULT_PUSH_BATCH_SIZE = MAX_PUSH_OPERATIONS;
const MAX_PULL_PAGES_PER_RUN = 50;
const MAX_BOOTSTRAP_PAGES_PER_RUN = 100;

export type SyncCycleStatus =
  | 'SYNCED'
  | 'NO_WORK'
  | 'PAUSED_AUTH'
  | 'RETRY_SCHEDULED'
  | 'ALREADY_RUNNING';

export interface SyncCycleResult {
  status: SyncCycleStatus;
  pushed: number;
  pulled: number;
  conflicts: number;
  retryableErrors: number;
  permanentErrors: number;
}

export interface OfflineSyncWorkerOptions {
  adapter: DatabaseAdapter;
  storeId: string;
  deviceId: string;
  sessionProvider: AuthenticatedSessionProvider;
  transport: SyncTransport;
  now?: () => string;
  random?: () => number;
  idFactory?: () => string;
  leaseDurationMs?: number;
  pushBatchSize?: number;
  pullPageSize?: number;
}

function addMilliseconds(iso: string, milliseconds: number): string {
  const time = new Date(iso).getTime();
  if (!Number.isFinite(time)) throw new Error('Sync clock returned an invalid timestamp.');
  return new Date(time + milliseconds).toISOString();
}

function retryDelayMs(attemptCount: number, random: () => number): number {
  const exponent = Math.min(Math.max(attemptCount - 1, 0), 10);
  const base = Math.min(15 * 60 * 1000, 1000 * 2 ** exponent);
  const jitter = 0.5 + Math.max(0, Math.min(1, random()));
  return Math.round(base * jitter);
}

function errorCode(error: unknown): string {
  if (error instanceof SyncTransportError) return error.code;
  return error instanceof Error ? error.name || 'SYNC_ERROR' : 'SYNC_ERROR';
}

function asServerPayload(error: SyncPushResponse['acks'][number]['error']): string | null {
  const candidate = error?.details?.serverPayload;
  return candidate === undefined ? null : JSON.stringify(candidate);
}

function operationRequest(
  storeId: string,
  deviceId: string,
  operations: OutboxOperationRow[],
): SyncPushRequest {
  return {
    protocolVersion: 1,
    payloadVersion: 1,
    storeId,
    deviceId,
    operations: operations.map((row) => {
      const parsed: unknown = JSON.parse(row.payload);
      const envelope = parseSyncOperationEnvelope(parsed);
      if (envelope.storeId !== storeId || envelope.deviceId !== deviceId || envelope.operationId !== row.operationId) {
        throw new Error('Outbox envelope identity does not match its SQLite row.');
      }
      return envelope;
    }),
  };
}

export class OfflineSyncWorker {
  private readonly options: Required<Pick<OfflineSyncWorkerOptions, 'now' | 'random' | 'idFactory'>> &
    OfflineSyncWorkerOptions;

  constructor(options: OfflineSyncWorkerOptions) {
    this.options = {
      now: () => new Date().toISOString(),
      random: Math.random,
      idFactory: generateMobileId,
      ...options,
    };
  }

  async runOnce(): Promise<SyncCycleResult> {
    const key = `${this.options.storeId}:${this.options.deviceId}`;
    if (activeRuns.has(key)) {
      return { status: 'ALREADY_RUNNING', pushed: 0, pulled: 0, conflicts: 0, retryableErrors: 0, permanentErrors: 0 };
    }
    activeRuns.add(key);
    try {
      return await this.runOnceOwned();
    } finally {
      activeRuns.delete(key);
    }
  }

  async bootstrap(): Promise<SyncCycleResult> {
    const key = `${this.options.storeId}:${this.options.deviceId}:bootstrap`;
    if (activeRuns.has(key)) {
      return { status: 'ALREADY_RUNNING', pushed: 0, pulled: 0, conflicts: 0, retryableErrors: 0, permanentErrors: 0 };
    }
    activeRuns.add(key);
    try {
      return await this.bootstrapOwned();
    } finally {
      activeRuns.delete(key);
    }
  }

  private async runOnceOwned(): Promise<SyncCycleResult> {
    const { adapter, storeId, deviceId } = this.options;
    const now = this.options.now();
    ensureSyncStoreState(adapter, { storeId, deviceId, now });

    const session = await this.options.sessionProvider.getSession();
    if (!session?.accessToken) {
      updateSyncStoreState(adapter, {
        storeId,
        status: 'PAUSED_AUTH',
        lastAttemptAt: now,
        updatedAt: now,
      });
      return { status: 'PAUSED_AUTH', pushed: 0, pulled: 0, conflicts: 0, retryableErrors: 0, permanentErrors: 0 };
    }

    updateSyncStoreState(adapter, { storeId, status: 'RUNNING', lastAttemptAt: now, updatedAt: now });
    const leaseId = this.options.idFactory();
    const operations = claimOutboxBatch(adapter, {
      storeId,
      leaseId,
      now,
      leaseExpiresAt: addMilliseconds(now, this.options.leaseDurationMs ?? DEFAULT_LEASE_MS),
      limit: Math.min(this.options.pushBatchSize ?? DEFAULT_PUSH_BATCH_SIZE, MAX_PUSH_OPERATIONS),
    });

    let pushed = 0;
    let conflicts = 0;
    let retryableErrors = 0;
    let permanentErrors = 0;
    const validOperations: OutboxOperationRow[] = [];
    for (const operation of operations) {
      try {
        JSON.parse(operation.payload);
        parseSyncOperationEnvelope(JSON.parse(operation.payload));
        validOperations.push(operation);
      } catch {
        markOutboxPermanent(adapter, {
          operationId: operation.operationId,
          leaseId,
          errorCode: 'INVALID_PAYLOAD',
        });
        permanentErrors += 1;
      }
    }

    if (validOperations.length > 0) {
      let pushResponse: SyncPushResponse;
      try {
        pushResponse = await this.options.transport.push(operationRequest(storeId, deviceId, validOperations));
      } catch (error) {
        if (error instanceof SyncTransportError && !error.retryable && error.code !== 'AUTH_REQUIRED') {
          for (const operation of validOperations) {
            markOutboxPermanent(adapter, {
              operationId: operation.operationId,
              leaseId,
              errorCode: error.code,
            });
            permanentErrors += 1;
          }
        } else {
          for (const operation of validOperations) {
            markOutboxRetryable(adapter, {
              operationId: operation.operationId,
              leaseId,
              errorCode: errorCode(error),
              nextAttemptAt: addMilliseconds(now, retryDelayMs(operation.attemptCount, this.options.random)),
            });
            retryableErrors += 1;
          }
          updateSyncStoreState(adapter, {
            storeId,
            status: error instanceof SyncTransportError && error.code === 'AUTH_REQUIRED'
              ? 'PAUSED_AUTH'
              : 'ERROR_RETRYABLE',
            lastErrorCode: errorCode(error),
            lastErrorMessage: error instanceof Error ? error.message : 'Push failed.',
            updatedAt: now,
          });
        }
        return {
          status: error instanceof SyncTransportError && error.code === 'AUTH_REQUIRED'
            ? 'PAUSED_AUTH'
            : retryableErrors > 0 ? 'RETRY_SCHEDULED' : 'SYNCED',
          pushed,
          pulled: 0,
          conflicts,
          retryableErrors,
          permanentErrors,
        };
      }

      const acknowledgements = new Map(pushResponse.acks.map((ack) => [ack.operationId, ack]));
      for (const operation of validOperations) {
        const ack = acknowledgements.get(operation.operationId);
        if (!ack) {
          markOutboxRetryable(adapter, {
            operationId: operation.operationId,
            leaseId,
            errorCode: 'MISSING_ACK',
            nextAttemptAt: addMilliseconds(now, retryDelayMs(operation.attemptCount, this.options.random)),
          });
          retryableErrors += 1;
          continue;
        }
        if (ack.status === 'APPLIED' || ack.status === 'ALREADY_APPLIED') {
          markOutboxApplied(adapter, {
            operationId: operation.operationId,
            leaseId,
            serverVersion: ack.serverVersion,
            serverRevision: ack.serverRevision,
            syncedAt: now,
          });
          pushed += 1;
        } else if (ack.status === 'CONFLICT') {
          createSyncConflict(adapter, {
            id: this.options.idFactory(),
            storeId,
            operationId: operation.operationId,
            entityType: operation.entityType,
            entityId: operation.entityId,
            conflictType: 'STALE_VERSION',
            localPayload: operation.payload,
            serverPayload: asServerPayload(ack.error),
            serverVersion: ack.serverVersion,
            createdAt: now,
          });
          markOutboxConflict(adapter, {
            operationId: operation.operationId,
            leaseId,
            errorCode: ack.error?.code ?? 'CONFLICT',
          });
          conflicts += 1;
        } else if (ack.status === 'REJECTED_RETRYABLE') {
          markOutboxRetryable(adapter, {
            operationId: operation.operationId,
            leaseId,
            errorCode: ack.error?.code ?? 'RETRYABLE',
            nextAttemptAt: addMilliseconds(now, retryDelayMs(operation.attemptCount, this.options.random)),
          });
          retryableErrors += 1;
        } else {
          markOutboxPermanent(adapter, {
            operationId: operation.operationId,
            leaseId,
            errorCode: ack.error?.code ?? 'PERMANENT',
          });
          permanentErrors += 1;
        }
      }
    }

    let pulled = 0;
    for (let page = 0; page < MAX_PULL_PAGES_PER_RUN; page += 1) {
      const state = getSyncStoreState(adapter, storeId);
      if (!state) throw new Error('Sync state disappeared during sync.');
      const request: SyncPullRequest = {
        protocolVersion: 1,
        payloadVersion: 1,
        storeId,
        deviceId,
        cursor: { revision: state.cursorRevision, changeIndex: state.cursorChangeIndex },
        pageSize: Math.min(this.options.pullPageSize ?? DEFAULT_PULL_PAGE_SIZE, MAX_PULL_CHANGES),
      };
      let response;
      try {
        response = await this.options.transport.pull(request);
      } catch (error) {
        updateSyncStoreState(adapter, {
          storeId,
          status: error instanceof SyncTransportError && !error.retryable ? 'PAUSED_AUTH' : 'ERROR_RETRYABLE',
          lastErrorCode: errorCode(error),
          lastErrorMessage: error instanceof Error ? error.message : 'Pull failed.',
          updatedAt: now,
        });
        if (error instanceof SyncTransportError && !error.retryable) permanentErrors += 1;
        else retryableErrors += 1;
        break;
      }
      const result = applySyncPullPage(adapter, response, { storeId, options: {
        now,
        conflictIdFactory: this.options.idFactory,
      } });
      pulled += result.applied + result.echoes;
      conflicts += result.conflicts;
      if (!response.hasMore) break;
    }

    const finalStatus: SyncCycleStatus = retryableErrors > 0 ? 'RETRY_SCHEDULED' :
      pushed + pulled + conflicts + permanentErrors > 0 ? 'SYNCED' : 'NO_WORK';
    updateSyncStoreState(adapter, {
      storeId,
      status: retryableErrors > 0 ? 'ERROR_RETRYABLE' : 'IDLE',
      lastSuccessAt: retryableErrors > 0 ? undefined : now,
      updatedAt: now,
    });
    return { status: finalStatus, pushed, pulled, conflicts, retryableErrors, permanentErrors };
  }

  private async bootstrapOwned(): Promise<SyncCycleResult> {
    const { adapter, storeId, deviceId } = this.options;
    const now = this.options.now();
    ensureSyncStoreState(adapter, { storeId, deviceId, now });
    const session = await this.options.sessionProvider.getSession();
    if (!session?.accessToken) {
      updateSyncStoreState(adapter, { storeId, status: 'PAUSED_AUTH', lastAttemptAt: now, updatedAt: now });
      return { status: 'PAUSED_AUTH', pushed: 0, pulled: 0, conflicts: 0, retryableErrors: 0, permanentErrors: 0 };
    }

    const existing = getSyncBootstrapState(adapter, storeId);
    const bootstrapId = existing?.status === 'IN_PROGRESS' ? existing.bootstrapId : this.options.idFactory();
    const bootstrapState = existing?.status === 'IN_PROGRESS'
      ? existing
      : beginSyncBootstrap(adapter, { storeId, deviceId, bootstrapId, startedAt: now });
    let cursor: SyncBootstrapRequest['cursor'] = bootstrapState.snapshotRevision !== null &&
      bootstrapState.snapshotAfterEntityType !== null && bootstrapState.snapshotAfterEntityId !== null
      ? {
        snapshotRevision: bootstrapState.snapshotRevision,
        afterEntityType: bootstrapState.snapshotAfterEntityType as SyncEntityType,
        afterEntityId: bootstrapState.snapshotAfterEntityId,
      }
      : null;
    let applied = 0;
    let echoes = 0;
    let conflicts = 0;
    try {
      for (let page = 0; page < MAX_BOOTSTRAP_PAGES_PER_RUN; page += 1) {
        const response = await this.options.transport.bootstrap({
          protocolVersion: 1,
          payloadVersion: 1,
          storeId,
          deviceId,
          cursor,
          pageSize: Math.min(MAX_BOOTSTRAP_ENTITIES, MAX_BOOTSTRAP_ENTITIES),
        });
        const result = applySyncBootstrapPage(adapter, response, {
          storeId,
          options: { now, conflictIdFactory: this.options.idFactory },
        });
        applied += result.applied;
        echoes += result.echoes;
        conflicts += result.conflicts;
        if (!response.hasMore || response.nextCursor === null) {
          commitSyncBootstrap(adapter, {
            storeId,
            snapshotRevision: response.snapshotRevision,
            cursorRevision: response.snapshotRevision,
            cursorChangeIndex: 0,
            updatedAt: now,
          });
          return {
            status: conflicts > 0 ? 'SYNCED' : 'SYNCED',
            pushed: 0,
            pulled: applied + echoes,
            conflicts,
            retryableErrors: 0,
            permanentErrors: 0,
          };
        }
        cursor = response.nextCursor;
      }
      throw new Error('Bootstrap exceeded the bounded page limit.');
    } catch (error) {
      failSyncBootstrap(adapter, {
        storeId,
        errorCode: errorCode(error),
        errorMessage: error instanceof Error ? error.message : 'Bootstrap failed.',
        updatedAt: now,
      });
      return {
        status: 'RETRY_SCHEDULED',
        pushed: 0,
        pulled: applied + echoes,
        conflicts,
        retryableErrors: 1,
        permanentErrors: 0,
      };
    }
  }
}
