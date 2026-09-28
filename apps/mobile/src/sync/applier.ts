import {
  parseSyncOperationEnvelope,
  type SyncReferenceContext,
  type SyncBootstrapResponse,
  type SyncPullResponse,
} from '@retail/contracts';

import type { DatabaseAdapter } from '../db/adapter';
import {
  clearSyncBootstrapEntities,
  commitSyncBootstrap,
  createSyncConflict,
  ensureSyncStoreState,
  findOutboxOperation,
  getSyncBootstrapState,
  getSyncStoreState,
  listSyncBootstrapEntities,
  listOpenSyncConflicts,
  listActiveOutboxOperationsForEntity,
  markOutboxEchoApplied,
  quarantineOutboxConflict,
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

function installAuthoritativeReferenceContext(
  adapter: DatabaseAdapter,
  context: SyncReferenceContext,
): void {
  const existingStore = adapter.getFirstRow<{ country_code: string }>(
    'SELECT country_code FROM stores WHERE id = ?;', [context.store.id],
  );
  const countryCode = context.store.countryCode ?? existingStore?.country_code ?? null;
  if (countryCode === null) {
    throw new Error('Store reference context is missing its country code; the owner device must sync store metadata first.');
  }
  const existingStoreIdentity = adapter.getFirstRow<{ created_by_user_id: string | null }>(
    'SELECT created_by_user_id FROM stores WHERE id = ?;', [context.store.id],
  );
  if (existingStoreIdentity?.created_by_user_id &&
      existingStoreIdentity.created_by_user_id !== context.store.createdByUserId) {
    throw new Error('Store creator reference conflicts with an existing local identity.');
  }

  for (const user of context.users) {
    adapter.run(
      `INSERT INTO users (id, display_name, email, phone, status, created_at, updated_at)
       VALUES (?, ?, NULL, NULL, 'ACTIVE', ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         display_name = excluded.display_name,
         status = 'ACTIVE',
         created_at = excluded.created_at,
         updated_at = excluded.updated_at;`,
      [user.id, user.displayName, user.createdAt, user.updatedAt],
    );
  }

  adapter.run(
    `INSERT INTO stores
      (id, name, currency_code, country_code, timezone, status, created_by_user_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       currency_code = excluded.currency_code,
       country_code = excluded.country_code,
       timezone = excluded.timezone,
       status = excluded.status,
       created_by_user_id = excluded.created_by_user_id,
       created_at = excluded.created_at,
       updated_at = excluded.updated_at;`,
    [context.store.id, context.store.name, context.store.currencyCode, countryCode,
      context.store.timezone, context.store.status, context.store.createdByUserId,
      context.store.createdAt, context.store.updatedAt],
  );

  for (const member of context.members) {
    const existing = adapter.getFirstRow<{ store_id: string; user_id: string }>(
      'SELECT store_id, user_id FROM store_members WHERE id = ?;', [member.id],
    );
    if (existing && (existing.store_id !== member.storeId || existing.user_id !== member.userId)) {
      throw new Error('Store member reference conflicts with an existing local identity.');
    }
    adapter.run(
      `INSERT INTO store_members
        (id, store_id, user_id, role, status, joined_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         role = excluded.role,
         status = 'ACTIVE',
         joined_at = excluded.joined_at,
         created_at = excluded.created_at,
         updated_at = excluded.updated_at;`,
      [member.id, member.storeId, member.userId, member.role, member.joinedAt,
        member.createdAt, member.updatedAt],
    );
  }
  for (const device of context.devices) {
    const existing = adapter.getFirstRow<{ store_id: string; user_id: string | null }>(
      'SELECT store_id, user_id FROM devices WHERE id = ?;', [device.id],
    );
    if (existing && (existing.store_id !== device.storeId ||
        (existing.user_id !== null && device.userId !== null && existing.user_id !== device.userId))) {
      throw new Error('Device reference conflicts with an existing local identity.');
    }
    adapter.run(
      `INSERT INTO devices
        (id, store_id, user_id, platform, device_label, app_version, last_seen_at, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL, 'ACTIVE', ?)
       ON CONFLICT(id) DO UPDATE SET
         user_id = excluded.user_id,
         platform = excluded.platform,
         device_label = excluded.device_label,
         app_version = excluded.app_version,
         status = 'ACTIVE',
         created_at = excluded.created_at;`,
      [device.id, device.storeId, device.userId, device.platform, device.deviceLabel,
        device.appVersion, device.createdAt],
    );
  }
}

function restoreAuthoritativeReferenceStatuses(
  adapter: DatabaseAdapter,
  context: SyncReferenceContext,
): void {
  for (const user of context.users) {
    adapter.run('UPDATE users SET status = ? WHERE id = ?;', [user.status, user.id]);
  }
  for (const member of context.members) {
    adapter.run('UPDATE store_members SET status = ? WHERE id = ?;', [member.status, member.id]);
  }
  for (const device of context.devices) {
    adapter.run('UPDATE devices SET status = ? WHERE id = ?;', [device.status, device.id]);
  }
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
  const openConflict = listOpenSyncConflicts(adapter, change.storeId).find(
    (item) => item.entityType === change.entityType && item.entityId === change.entityId,
  );
  if (openConflict) {
    createSyncConflict(adapter, {
      id: openConflict.id,
      storeId: change.storeId,
      operationId: openConflict.operationId,
      entityType: change.entityType,
      entityId: change.entityId,
      conflictType: openConflict.conflictType,
      localPayload: openConflict.localPayload,
      serverPayload: payloadText(change.payload),
      serverVersion: change.entityVersion,
      serverRevision: change.serverRevision,
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
    return { applied: 0, echoes: 0, conflicts: 0 };
  }
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
      serverRevision: change.serverRevision,
      createdAt: options.now,
    });
    quarantineOutboxConflict(adapter, activeLocalOperations[0].operationId);
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
  input: {
    storeId: string;
    referenceContext?: SyncReferenceContext;
    options: SyncApplyOptions;
  },
): SyncApplyResult {
  return adapter.transaction(() => {
    const currentState = getSyncStoreState(adapter, input.storeId);
    if (!currentState) throw new Error('Sync state does not exist for the requested store.');
    validatePullPage(response, {
      storeId: input.storeId,
      cursorRevision: currentState.cursorRevision,
      cursorChangeIndex: currentState.cursorChangeIndex,
    });
    if (response.changes.length > 0 && !input.referenceContext) {
      throw new Error('Pulled operations require an authoritative reference context.');
    }
    if (input.referenceContext) {
      if (
        input.referenceContext.store.id !== input.storeId ||
        input.referenceContext.serverRevision < response.serverRevision ||
        input.referenceContext.serverRevision < currentState.serverRevision
      ) {
        throw new Error('Pull reference context is stale or belongs to another store.');
      }
      // Install references from the server context, never from actor IDs in an
      // operation envelope. Historical facts may point at suspended members
      // or revoked devices, so the context installer enables those rows only
      // inside this transaction while the existing insert triggers validate
      // their store and member identity relationships.
      installAuthoritativeReferenceContext(adapter, input.referenceContext);
    }
    let applied = 0;
    let echoes = 0;
    let conflicts = 0;
    for (const change of response.changes) {
      const result = applyOnePullChange(adapter, change, input.options);
      applied += result.applied;
      echoes += result.echoes;
      conflicts += result.conflicts;
    }
    if (input.referenceContext) {
      restoreAuthoritativeReferenceStatuses(adapter, input.referenceContext);
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

    let previous = {
      revision: state.snapshotCursorRevision,
      changeIndex: state.snapshotCursorChangeIndex,
    };
    for (const entity of response.entities) {
      if (entity.storeId !== input.storeId) {
        throw new Error('Bootstrap response contains an entity from another store.');
      }
      if (entity.serverRevision > response.snapshotRevision) {
        throw new Error('Bootstrap entity revision exceeds the snapshot revision.');
      }
      if (compareCursor({ revision: entity.serverRevision, changeIndex: entity.changeIndex }, previous) <= 0) {
        throw new Error('Bootstrap operations are not in strict cursor order.');
      }
      const envelope = parseSyncOperationEnvelope(entity.payload);
      if (!matchesSyncEntity(envelope, entity) || envelope.operationId !== entity.operationId) {
        throw new Error('Bootstrap operation envelope does not match its identity.');
      }
      stageSyncBootstrapEntity(adapter, {
        storeId: input.storeId,
        bootstrapId: state.bootstrapId,
        snapshotRevision: response.snapshotRevision,
        serverRevision: entity.serverRevision,
        changeIndex: entity.changeIndex,
        operationId: entity.operationId,
        entityType: entity.entityType,
        entityId: entity.entityId,
        entityVersion: entity.entityVersion,
        payload: payloadText(entity.payload),
      });
      previous = { revision: entity.serverRevision, changeIndex: entity.changeIndex };
    }

    if (response.nextCursor) {
      if (response.entities.length === 0 ||
        compareCursor({ revision: response.nextCursor.afterRevision,
          changeIndex: response.nextCursor.afterChangeIndex }, previous) !== 0) {
        throw new Error('Bootstrap next cursor does not match the final staged operation.');
      }
    }
    advanceSyncBootstrap(adapter, {
      storeId: input.storeId,
      snapshotRevision: response.snapshotRevision,
      afterRevision: previous.revision,
      afterChangeIndex: previous.changeIndex,
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
    if (
      state.referenceContext.store.id !== input.storeId ||
      state.referenceContext.serverRevision !== input.snapshotRevision
    ) {
      throw new Error('Bootstrap reference context does not match the staged snapshot.');
    }
    installAuthoritativeReferenceContext(adapter, state.referenceContext);
    ensureSyncStoreState(adapter, {
      storeId: input.storeId,
      deviceId: state.deviceId,
      now: input.options.now,
    });
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
        envelope.entityId !== entity.entityId ||
        envelope.operationId !== entity.operationId
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
        const openConflict = listOpenSyncConflicts(adapter, input.storeId).find(
          (item) => item.entityType === entity.entityType && item.entityId === entity.entityId,
        );
        const activeLocalOperations = listActiveOutboxOperationsForEntity(adapter, {
          storeId: input.storeId,
          entityType: entity.entityType as Parameters<typeof listActiveOutboxOperationsForEntity>[1]['entityType'],
          entityId: entity.entityId,
          excludeOperationId: envelope.operationId,
        });
        if (openConflict) {
          createSyncConflict(adapter, {
            id: openConflict.id,
            storeId: input.storeId,
            operationId: openConflict.operationId,
            entityType: entity.entityType,
            entityId: entity.entityId,
            conflictType: openConflict.conflictType,
            localPayload: openConflict.localPayload,
            serverPayload: entity.payload,
            serverVersion: entity.entityVersion,
            serverRevision: entity.serverRevision,
            createdAt: input.options.now,
          });
        } else if (activeLocalOperations.length > 0) {
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
            serverRevision: entity.serverRevision,
            createdAt: input.options.now,
          });
          quarantineOutboxConflict(adapter, activeLocalOperations[0].operationId);
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
    restoreAuthoritativeReferenceStatuses(adapter, state.referenceContext);
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
