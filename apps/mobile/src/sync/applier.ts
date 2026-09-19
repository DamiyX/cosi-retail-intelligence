import {
  parseSyncOperationEnvelope,
  type SyncBootstrapResponse,
  type SyncPullResponse,
} from '@retail/contracts';

import type { DatabaseAdapter } from '../db/adapter';
import {
  createSyncConflict,
  findOutboxOperation,
  getSyncStoreState,
  listActiveOutboxOperationsForEntity,
  markOutboxEchoApplied,
  saveSyncEntityVersion,
  updateSyncStoreState,
  advanceSyncBootstrap,
} from '../db/repositories';
import { materializeSyncOperation, matchesSyncEntity } from './materialize';

export interface SyncApplyOptions {
  now: string;
  conflictIdFactory: () => string;
}

export interface SyncApplyResult {
  applied: number;
  echoes: number;
  conflicts: number;
  cursorRevision: number;
  cursorChangeIndex: number;
}

function payloadText(payload: unknown): string {
  return JSON.stringify(payload);
}

function applyOnePullChange(
  adapter: DatabaseAdapter,
  change: SyncPullResponse['changes'][number],
  options: SyncApplyOptions,
): { applied: number; echoes: number; conflicts: number } {
  const localOperation = findOutboxOperation(adapter, change.operationId);
  if (localOperation && localOperation.storeId === change.storeId) {
    markOutboxEchoApplied(adapter, {
      operationId: change.operationId,
      serverVersion: change.entityVersion,
      serverRevision: change.serverRevision,
      syncedAt: options.now,
    });
    saveSyncEntityVersion(adapter, {
      storeId: change.storeId,
      entityType: change.entityType,
      entityId: change.entityId,
      serverVersion: change.entityVersion,
      serverRevision: change.serverRevision,
      updatedAt: options.now,
    });
    return { applied: 0, echoes: 1, conflicts: 0 };
  }

  const activeLocalOperations = listActiveOutboxOperationsForEntity(adapter, {
    storeId: change.storeId,
    entityType: change.entityType,
    entityId: change.entityId,
    excludeOperationId: change.operationId,
  });
  if (activeLocalOperations.length > 0) {
    createSyncConflict(adapter, {
      id: options.conflictIdFactory(),
      storeId: change.storeId,
      operationId: activeLocalOperations[0].operationId,
      entityType: change.entityType,
      entityId: change.entityId,
      conflictType: 'STALE_VERSION',
      localPayload: activeLocalOperations[0].payload,
      serverPayload: payloadText(change.payload),
      serverVersion: change.entityVersion,
      createdAt: options.now,
    });
    saveSyncEntityVersion(adapter, {
      storeId: change.storeId,
      entityType: change.entityType,
      entityId: change.entityId,
      serverVersion: change.entityVersion,
      serverRevision: change.serverRevision,
      updatedAt: options.now,
    });
    return { applied: 0, echoes: 0, conflicts: 1 };
  }

  const envelope = parseSyncOperationEnvelope(change.payload);
  if (!matchesSyncEntity(envelope, change)) {
    throw new Error('Pulled operation envelope does not match its change-log identity.');
  }
  materializeSyncOperation(adapter, envelope);
  saveSyncEntityVersion(adapter, {
    storeId: change.storeId,
    entityType: change.entityType,
    entityId: change.entityId,
    serverVersion: change.entityVersion,
    serverRevision: change.serverRevision,
    updatedAt: options.now,
  });
  return { applied: 1, echoes: 0, conflicts: 0 };
}

export function applySyncPullPage(
  adapter: DatabaseAdapter,
  response: SyncPullResponse,
  input: { storeId: string; options: SyncApplyOptions },
): SyncApplyResult {
  return adapter.transaction(() => {
    let applied = 0;
    let echoes = 0;
    let conflicts = 0;
    for (const change of response.changes) {
      const result = applyOnePullChange(adapter, change, input.options);
      applied += result.applied;
      echoes += result.echoes;
      conflicts += result.conflicts;
    }
    const currentState = getSyncStoreState(adapter, input.storeId);
    updateSyncStoreState(adapter, {
      storeId: input.storeId,
      status: 'IDLE',
      cursorRevision: response.nextCursor.revision,
      cursorChangeIndex: response.nextCursor.changeIndex,
      serverRevision: Math.max(currentState?.serverRevision ?? 0, response.serverRevision),
      lastSuccessAt: input.options.now,
      lastErrorCode: null,
      lastErrorMessage: null,
      updatedAt: input.options.now,
    });
    return {
      applied,
      echoes,
      conflicts,
      cursorRevision: response.nextCursor.revision,
      cursorChangeIndex: response.nextCursor.changeIndex,
    };
  });
}

export function applySyncBootstrapPage(
  adapter: DatabaseAdapter,
  response: SyncBootstrapResponse,
  input: { storeId: string; options: SyncApplyOptions },
): { applied: number; echoes: number; conflicts: number } {
  return adapter.transaction(() => {
    let applied = 0;
    let echoes = 0;
    let conflicts = 0;
    for (const entity of response.entities) {
      const envelope = parseSyncOperationEnvelope(entity.payload);
      if (!matchesSyncEntity(envelope, entity)) {
        throw new Error('Bootstrap entity envelope does not match its identity.');
      }
      const localOperation = findOutboxOperation(adapter, envelope.operationId);
      if (localOperation && localOperation.storeId === input.storeId) {
        markOutboxEchoApplied(adapter, {
          operationId: envelope.operationId,
          serverVersion: entity.entityVersion,
          serverRevision: response.snapshotRevision,
          syncedAt: input.options.now,
        });
        echoes += 1;
        saveSyncEntityVersion(adapter, {
          storeId: input.storeId,
          entityType: entity.entityType,
          entityId: entity.entityId,
          serverVersion: entity.entityVersion,
          serverRevision: response.snapshotRevision,
          updatedAt: input.options.now,
        });
        continue;
      }
      const activeLocalOperations = listActiveOutboxOperationsForEntity(adapter, {
        storeId: input.storeId,
        entityType: entity.entityType,
        entityId: entity.entityId,
        excludeOperationId: envelope.operationId,
      });
      if (activeLocalOperations.length > 0) {
        createSyncConflict(adapter, {
          id: input.options.conflictIdFactory(),
          storeId: input.storeId,
          operationId: activeLocalOperations[0].operationId,
          entityType: entity.entityType,
          entityId: entity.entityId,
          conflictType: 'STALE_VERSION',
          localPayload: activeLocalOperations[0].payload,
          serverPayload: payloadText(entity.payload),
          serverVersion: entity.entityVersion,
          createdAt: input.options.now,
        });
        conflicts += 1;
        continue;
      }
      materializeSyncOperation(adapter, envelope);
      saveSyncEntityVersion(adapter, {
        storeId: input.storeId,
        entityType: entity.entityType,
        entityId: entity.entityId,
        serverVersion: entity.entityVersion,
        serverRevision: response.snapshotRevision,
        updatedAt: input.options.now,
      });
      applied += 1;
    }

    const afterEntityType = response.nextCursor?.afterEntityType ?? null;
    const afterEntityId = response.nextCursor?.afterEntityId ?? null;
    advanceSyncBootstrap(adapter, {
      storeId: input.storeId,
      snapshotRevision: response.snapshotRevision,
      afterEntityType,
      afterEntityId,
      updatedAt: input.options.now,
    });
    return { applied, echoes, conflicts };
  });
}
