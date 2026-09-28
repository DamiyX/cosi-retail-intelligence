import { parseSyncOperationEnvelope } from '@retail/contracts';
import type { SupabaseClient } from '@supabase/supabase-js';

import { resolveCurrentStore } from '../catalogue/client';
import { generateMobileId } from '../crypto/mobileIds';
import type { DatabaseAdapter } from '../db/adapter';
import {
  enqueueOutboxOperation,
  ensureSyncStoreState,
  getSyncEntityVersion,
  getSyncStoreState,
  getUserById,
  listActiveOutboxOperationsForEntity,
  listOpenSyncConflicts,
  quarantineOutboxConflict,
  resolveSyncConflict,
  saveSyncEntityVersion,
  updateSyncStoreState,
  type SyncConflictRow,
  type SyncStoreStateRow,
} from '../db/repositories';
import { cloudSessionProvider, cloudSyncConfiguration } from './auth';
import { materializeSyncOperation } from './materialize';
import { createHttpSyncTransport, type AuthenticatedSessionProvider, type SyncTransport } from './transport';
import { OfflineSyncWorker, type SyncCycleResult } from './worker';

export interface PilotOwnerContext {
  storeId: string;
  storeName: string;
  currencyCode: string;
  countryCode: string;
  timezone: string;
  userId: string;
  displayName: string;
  memberId: string;
  deviceId: string;
}

export interface PilotSyncOverview {
  context: PilotOwnerContext | null;
  state: SyncStoreStateRow | null;
  unsyncedCount: number;
  conflicts: SyncConflictRow[];
}

export function resolvePilotOwner(adapter: DatabaseAdapter): PilotOwnerContext | null {
  const current = resolveCurrentStore(adapter);
  if (!current?.store.createdByUserId || current.device.userId !== current.store.createdByUserId) {
    return null;
  }
  const owner = getUserById(adapter, current.store.createdByUserId);
  const member = adapter.getFirstRow<{ id: string }>(
    `SELECT id FROM store_members WHERE store_id = ? AND user_id = ?
     AND role = 'OWNER' AND status = 'ACTIVE' LIMIT 1;`,
    [current.store.id, current.store.createdByUserId],
  );
  if (!owner || owner.status !== 'ACTIVE' || !member || current.store.status !== 'ACTIVE' ||
      current.device.status !== 'ACTIVE') return null;
  return {
    storeId: current.store.id,
    storeName: current.store.name,
    currencyCode: current.store.currencyCode,
    countryCode: current.store.countryCode,
    timezone: current.store.timezone,
    userId: owner.id,
    displayName: owner.displayName,
    memberId: member.id,
    deviceId: current.device.id,
  };
}

export function readPilotSyncOverview(adapter: DatabaseAdapter): PilotSyncOverview {
  const context = resolvePilotOwner(adapter);
  if (!context) return { context: null, state: null, unsyncedCount: 0, conflicts: [] };
  const pending = adapter.getFirstRow<{ total: number }>(
    `SELECT COUNT(*) AS total FROM outbox_operations
     WHERE store_id = ? AND status IN ('PENDING', 'SYNCING', 'ERROR_RETRYABLE', 'ERROR_PERMANENT');`,
    [context.storeId],
  );
  return {
    context,
    state: getSyncStoreState(adapter, context.storeId),
    unsyncedCount: pending?.total ?? 0,
    conflicts: listOpenSyncConflicts(adapter, context.storeId),
  };
}

let activePilotRun: Promise<SyncCycleResult | null> | null = null;
let enrolledAuthSubject: string | null = null;
let enrolledStoreId: string | null = null;

export interface PilotRunOptions {
  configuration?: { url: string; publishableKey: string };
  sessionProvider?: AuthenticatedSessionProvider;
  transport?: SyncTransport;
}

/** First-device pilot: enrol the local owner/store IDs, then drain its durable outbox. */
export function runPilotSync(
  adapter: DatabaseAdapter,
  auth: SupabaseClient,
  options: PilotRunOptions = {},
): Promise<SyncCycleResult | null> {
  if (activePilotRun) return activePilotRun;
  activePilotRun = runOwned(adapter, auth, options).finally(() => { activePilotRun = null; });
  return activePilotRun;
}

async function runOwned(
  adapter: DatabaseAdapter,
  auth: SupabaseClient,
  options: PilotRunOptions,
): Promise<SyncCycleResult | null> {
  const configuration = options.configuration ?? cloudSyncConfiguration();
  const context = resolvePilotOwner(adapter);
  if (!configuration || !context) return null;
  const now = new Date().toISOString();
  ensureSyncStoreState(adapter, { storeId: context.storeId, deviceId: context.deviceId });
  const sessionProvider = options.sessionProvider ?? cloudSessionProvider(auth);
  let session;
  try {
    session = await sessionProvider.getSession();
  } catch (error) {
    updateSyncStoreState(adapter, {
      storeId: context.storeId,
      status: 'ERROR_RETRYABLE',
      lastAttemptAt: now,
      lastErrorCode: 'SESSION_CHECK_FAILED',
      lastErrorMessage: error instanceof Error ? error.message : 'Cloud session check failed.',
    });
    throw error;
  }
  if (!session) {
    updateSyncStoreState(adapter, {
      storeId: context.storeId,
      status: 'PAUSED_AUTH',
      lastAttemptAt: now,
      lastErrorCode: 'AUTH_REQUIRED',
      lastErrorMessage: 'Sign in to resume cloud sync.',
    });
    return null;
  }
  let userData;
  try {
    const response = await auth.auth.getUser();
    if (response.error || !response.data.user) throw response.error ?? new Error('Cloud sign-in needs to be renewed.');
    userData = response.data;
  } catch (error) {
    updateSyncStoreState(adapter, {
      storeId: context.storeId,
      status: 'ERROR_RETRYABLE',
      lastAttemptAt: now,
      lastErrorCode: 'USER_CHECK_FAILED',
      lastErrorMessage: error instanceof Error ? error.message : 'Cloud account check failed.',
    });
    throw error;
  }
  const transport = options.transport ?? createHttpSyncTransport({
    baseUrl: configuration.url,
    publishableKey: configuration.publishableKey,
    sessionProvider,
  });
  if (enrolledAuthSubject !== userData.user.id || enrolledStoreId !== context.storeId) {
    try {
      await transport.enroll({
        protocolVersion: 1,
        storeId: context.storeId,
        userId: context.userId,
        storeMemberId: context.memberId,
        deviceId: context.deviceId,
        storeName: context.storeName,
        currencyCode: context.currencyCode,
        countryCode: context.countryCode,
        timezone: context.timezone,
        displayName: context.displayName,
      });
      enrolledAuthSubject = userData.user.id;
      enrolledStoreId = context.storeId;
    } catch (error) {
      updateSyncStoreState(adapter, {
        storeId: context.storeId,
        status: 'ERROR_RETRYABLE',
        lastAttemptAt: new Date().toISOString(),
        lastErrorCode: 'ENROLLMENT_FAILED',
        lastErrorMessage: error instanceof Error ? error.message : 'Cloud enrolment failed.',
      });
      throw error;
    }
  }
  const worker = new OfflineSyncWorker({
    adapter,
    storeId: context.storeId,
    deviceId: context.deviceId,
    sessionProvider,
    transport,
  });
  return worker.runOnce();
}

export function forgetPilotEnrollment(): void {
  enrolledAuthSubject = null;
  enrolledStoreId = null;
}

const REVIEWABLE_MUTATIONS = new Set([
  'PRODUCT_IDENTITY_UPDATED',
  'PACKAGE_UPDATED',
  'PACKAGE_DEACTIVATED',
  'STORE_PACKAGE_SETTING_SAVED',
  'PRODUCT_LIFECYCLE_CHANGED',
  'PRODUCT_REORDER_LEVEL_UPDATED',
  'CHECK_SETTINGS_SAVED',
  'ATTENTION_SETTINGS_SAVED',
]);

export function isPilotResolvableConflict(conflict: SyncConflictRow): boolean {
  if (!conflict.serverPayload || conflict.serverVersion === null || conflict.serverRevision === null) return false;
  try {
    const local = parseSyncOperationEnvelope(JSON.parse(conflict.localPayload));
    const cloud = parseSyncOperationEnvelope(JSON.parse(conflict.serverPayload));
    return REVIEWABLE_MUTATIONS.has(local.operationType) &&
      local.operationId === conflict.operationId &&
      local.storeId === conflict.storeId && cloud.storeId === conflict.storeId &&
      local.entityType === conflict.entityType && cloud.entityType === conflict.entityType &&
      local.entityId === conflict.entityId && cloud.entityId === conflict.entityId;
  } catch {
    return false;
  }
}

/** Explicit owner decision. The rejected operation stays in the audit ledger. */
export function resolvePilotConflict(
  adapter: DatabaseAdapter,
  conflictId: string,
  decision: 'USE_CLOUD' | 'RETRY_LOCAL',
  generateId: () => string = generateMobileId,
): void {
  adapter.transaction(() => {
    const context = resolvePilotOwner(adapter);
    if (!context) throw new Error('Only the active local owner can resolve sync conflicts.');
    const conflict = listOpenSyncConflicts(adapter, context.storeId).find((item) => item.id === conflictId);
    if (!conflict || conflict.serverVersion === null || conflict.serverRevision === null || !conflict.serverPayload) {
      throw new Error('This conflict has no cloud version to review. It needs manual support.');
    }
    const local = parseSyncOperationEnvelope(JSON.parse(conflict.localPayload));
    const cloud = parseSyncOperationEnvelope(JSON.parse(conflict.serverPayload));
    if (!isPilotResolvableConflict(conflict) || local.storeId !== context.storeId ||
        cloud.storeId !== context.storeId || cloud.entityType !== local.entityType ||
        cloud.entityId !== local.entityId || conflict.operationId !== local.operationId) {
      throw new Error('This conflict cannot be safely resolved in the pilot app.');
    }
    const version = getSyncEntityVersion(adapter, {
      storeId: context.storeId,
      entityType: conflict.entityType,
      entityId: conflict.entityId,
    });
    if (version && version.serverVersion !== conflict.serverVersion) {
      throw new Error('Cloud data changed again. Sync before resolving this conflict.');
    }
    const otherPending = listActiveOutboxOperationsForEntity(adapter, {
      storeId: context.storeId,
      entityType: local.entityType,
      entityId: local.entityId,
      excludeOperationId: local.operationId,
    });
    if (otherPending.length > 0) {
      throw new Error('Another local edit is waiting. Sync or review it before resolving this conflict.');
    }
    quarantineOutboxConflict(adapter, local.operationId);
    if (decision === 'USE_CLOUD') {
      materializeSyncOperation(adapter, cloud);
    } else {
      enqueueOutboxOperation(adapter, {
        operationType: local.operationType,
        operationId: generateId(),
        storeId: context.storeId,
        deviceId: context.deviceId,
        entityType: local.entityType,
        entityId: local.entityId,
        baseServerVersion: conflict.serverVersion,
        occurredAt: new Date().toISOString(),
        entities: local.entities,
      });
    }
    saveSyncEntityVersion(adapter, {
      storeId: context.storeId,
      entityType: conflict.entityType,
      entityId: conflict.entityId,
      serverVersion: conflict.serverVersion,
      serverRevision: conflict.serverRevision,
    });
    resolveSyncConflict(adapter, { id: conflict.id, resolution: decision });
  });
}
