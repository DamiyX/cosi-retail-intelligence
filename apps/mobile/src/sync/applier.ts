import {
  parseSyncOperationEnvelope,
  type SyncBootstrapResponse,
  type SyncPullResponse,
} from '@retail/contracts';

import type { DatabaseAdapter } from '../db/adapter';
import {
  clearSyncBootstrapEntities,
  commitSyncBootstrap,
  createSyncConflict,
  findOutboxOperation,
  getSyncBootstrapState,
  getSyncStoreState,
  listSyncBootstrapEntities,
  listActiveOutboxOperationsForEntity,
  markOutboxEchoApplied,
  saveSyncEntityVersion,
  stageSyncBootstrapEntity,
  updateSyncStoreState,
  advanceSyncBootstrap,
  type OutboxOperationRow,
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

function compareCursor(
  left: { revision: number; changeIndex: number },
  right: { revision: number; changeIndex: number },
): number {
  return left.revision === right.revision
    ? left.changeIndex - right.changeIndex
    : left.revision - right.revision;
}

function compareBootstrapIdentity(
  left: { entityType: string; entityId: string },
  right: { entityType: string; entityId: string },
): number {
  return left.entityType === right.entityType
    ? left.entityId.localeCompare(right.entityId)
    : left.entityType.localeCompare(right.entityType);
}

function assertLocalOperationIdentity(
  operation: OutboxOperationRow,
  expected: {
    storeId: string;
    entityType: string;
    entityId: string;
    operationType: string;
  },
): void {
  if (
    operation.storeId !== expected.storeId ||
    operation.entityType !== expected.entityType ||
    operation.entityId !== expected.entityId ||
    operation.operationType !== expected.operationType
  ) {
    throw new Error('Server response reused a local operation ID for a different entity.');
  }
}

function validatePullPage(
  response: SyncPullResponse,
  input: { storeId: string; cursorRevision: number; cursorChangeIndex: number },
): void {
  const currentCursor = {
    revision: input.cursorRevision,
    changeIndex: input.cursorChangeIndex,
  };
  if (compareCursor(response.nextCursor, currentCursor) < 0) {
    throw new Error('Pull response regressed the durable sync cursor.');
  }
  if (response.serverRevision < response.nextCursor.revision) {
    throw new Error('Pull response cursor exceeds the advertised server revision.');
  }
  if (response.hasMore && response.changes.length === 0) {
    throw new Error('Pull response cannot advertise another page without advancing.');
  }

  let previous = currentCursor;
  for (const change of response.changes) {
    if (change.storeId !== input.storeId) {
      throw new Error('Pull response contains an entity from another store.');
    }
    const cursor = { revision: change.serverRevision, changeIndex: 0 };
    if (compareCursor(cursor, previous) <= 0) {
      throw new Error('Pull response changes are not in strict cursor order.');
    }
    if (change.serverRevision > response.serverRevision) {
      throw new Error('Pull response change exceeds the advertised server revision.');
    }
    previous = cursor;
  }

  if (response.changes.length === 0) {
    if (compareCursor(response.nextCursor, currentCursor) !== 0) {
      throw new Error('Empty pull response advanced the cursor without a change.');
    }
  } else if (compareCursor(response.nextCursor, previous) !== 0) {
    throw new Error('Pull response cursor does not match its final change.');
  }
}

function applyOnePullChange(
  adapter: DatabaseAdapter,
  change: SyncPullResponse['changes'][number],
  options: SyncApplyOptions,
): { applied: number; echoes: number; conflicts: number } {
  const envelope = parseSyncOperationEnvelope(change.payload);
  if (
    !matchesSyncEntity(envelope, change) ||
    envelope.operationId !== change.operationId ||
    envelope.operationType !== change.operationType
  ) {
    throw new Error('Pulled operation envelope does not match its change-log identity.');
  }
  const localOperation = findOutboxOperation(adapter, change.operationId);
  if (localOperation) {
    assertLocalOperationIdentity(localOperation, change);
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
    const currentState = getSyncStoreState(adapter, input.storeId);
    if (!currentState) throw new Error('Sync state does not exist for the requested store.');
    validatePullPage(response, {
      storeId: input.storeId,
      cursorRevision: currentState.cursorRevision,
      cursorChangeIndex: currentState.cursorChangeIndex,
    });
    let applied = 0;
    let echoes = 0;
    let conflicts = 0;
    for (const change of response.changes) {
      const result = applyOnePullChange(adapter, change, input.options);
      applied += result.applied;
      echoes += result.echoes;
      conflicts += result.conflicts;
    }
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
): { staged: number } {
  return adapter.transaction(() => {
    const state = getSyncBootstrapState(adapter, input.storeId);
    if (!state || state.status !== 'IN_PROGRESS') {
      throw new Error('Bootstrap page arrived without an active bootstrap.');
    }
    if (state.snapshotRevision !== null && state.snapshotRevision !== response.snapshotRevision) {
      throw new Error('Bootstrap snapshot revision changed between pages.');
    }
    if (response.hasMore !== (response.nextCursor !== null)) {
      throw new Error('Bootstrap pagination flags are inconsistent.');
    }
    if (response.nextCursor && response.nextCursor.snapshotRevision !== response.snapshotRevision) {
      throw new Error('Bootstrap cursor does not match the snapshot revision.');
    }

    let previous = state.snapshotAfterEntityType !== null && state.snapshotAfterEntityId !== null
      ? { entityType: state.snapshotAfterEntityType, entityId: state.snapshotAfterEntityId }
      : null;
    for (const entity of response.entities) {
      if (entity.storeId !== input.storeId) {
        throw new Error('Bootstrap response contains an entity from another store.');
      }
      if (entity.serverRevision > response.snapshotRevision) {
        throw new Error('Bootstrap entity revision exceeds the snapshot revision.');
      }
      if (previous && compareBootstrapIdentity(entity, previous) <= 0) {
        throw new Error('Bootstrap entities are not in strict cursor order.');
      }
      const envelope = parseSyncOperationEnvelope(entity.payload);
      if (!matchesSyncEntity(envelope, entity)) {
        throw new Error('Bootstrap entity envelope does not match its identity.');
      }
      stageSyncBootstrapEntity(adapter, {
        storeId: input.storeId,
        bootstrapId: state.bootstrapId,
        snapshotRevision: response.snapshotRevision,
        serverRevision: entity.serverRevision,
        entityType: entity.entityType,
        entityId: entity.entityId,
        entityVersion: entity.entityVersion,
        payload: payloadText(entity.payload),
      });
      previous = entity;
    }

    const afterEntityType = response.nextCursor?.afterEntityType ?? null;
    const afterEntityId = response.nextCursor?.afterEntityId ?? null;
    if (response.nextCursor) {
      const finalEntity = response.entities.at(-1);
      if (
        !finalEntity ||
        finalEntity.entityType !== afterEntityType ||
        finalEntity.entityId !== afterEntityId
      ) {
        throw new Error('Bootstrap next cursor does not match the final staged entity.');
      }
    }
    advanceSyncBootstrap(adapter, {
      storeId: input.storeId,
      snapshotRevision: response.snapshotRevision,
      afterEntityType,
      afterEntityId,
      updatedAt: input.options.now,
    });
    return { staged: response.entities.length };
  });
}

export function commitSyncBootstrapSnapshot(
  adapter: DatabaseAdapter,
  input: { storeId: string; snapshotRevision: number; options: SyncApplyOptions },
): { applied: number; echoes: number; conflicts: number } {
  return adapter.transaction(() => {
    const state = getSyncBootstrapState(adapter, input.storeId);
    if (
      !state ||
      state.status !== 'IN_PROGRESS' ||
      state.snapshotRevision !== input.snapshotRevision
    ) {
      throw new Error('Bootstrap snapshot is not ready to commit.');
    }
    const entities = listSyncBootstrapEntities(adapter, {
      storeId: input.storeId,
      bootstrapId: state.bootstrapId,
    });
    let applied = 0;
    let echoes = 0;
    let conflicts = 0;
    for (const entity of entities) {
      if (entity.snapshotRevision !== input.snapshotRevision) {
        throw new Error('Staged bootstrap entity belongs to another snapshot revision.');
      }
      const envelope = parseSyncOperationEnvelope(JSON.parse(entity.payload));
      if (
        envelope.storeId !== entity.storeId ||
        envelope.entityType !== entity.entityType ||
        envelope.entityId !== entity.entityId
      ) {
        throw new Error('Staged bootstrap envelope does not match its identity.');
      }
      const localOperation = findOutboxOperation(adapter, envelope.operationId);
      if (localOperation) {
        assertLocalOperationIdentity(localOperation, envelope);
        markOutboxEchoApplied(adapter, {
          operationId: envelope.operationId,
          serverVersion: entity.entityVersion,
          serverRevision: entity.serverRevision,
          syncedAt: input.options.now,
        });
        echoes += 1;
      } else {
        const activeLocalOperations = listActiveOutboxOperationsForEntity(adapter, {
          storeId: input.storeId,
          entityType: entity.entityType as Parameters<typeof listActiveOutboxOperationsForEntity>[1]['entityType'],
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
            serverPayload: entity.payload,
            serverVersion: entity.entityVersion,
            createdAt: input.options.now,
          });
          conflicts += 1;
        } else {
          materializeSyncOperation(adapter, envelope);
          applied += 1;
        }
      }
      saveSyncEntityVersion(adapter, {
        storeId: input.storeId,
        entityType: entity.entityType,
        entityId: entity.entityId,
        serverVersion: entity.entityVersion,
        serverRevision: entity.serverRevision,
        updatedAt: input.options.now,
      });
    }
    commitSyncBootstrap(adapter, {
      storeId: input.storeId,
      snapshotRevision: input.snapshotRevision,
      cursorRevision: input.snapshotRevision,
      cursorChangeIndex: 0,
      updatedAt: input.options.now,
    });
    clearSyncBootstrapEntities(adapter, {
      storeId: input.storeId,
      bootstrapId: state.bootstrapId,
    });
    return { applied, echoes, conflicts };
  });
}
