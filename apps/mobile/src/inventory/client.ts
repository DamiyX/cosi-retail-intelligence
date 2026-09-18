import { generateMobileId } from '../crypto/mobileIds';
import type { DatabaseAdapter } from '../db/adapter';
import {
  getDeviceById,
  getPackageUnitById,
  getStoreById,
  getStoreProductById,
  listDevicesByStore,
  listStoreProducts,
  listStores,
  type DeviceRow,
  type InventoryAdjustmentReason,
  type PackageUnitRow,
  type StoreProductRow,
  type StoreRow,
} from '../db/repositories';
import { getBatchProjectionForStoreProduct, type BatchProjection } from './batchAllocation';
import {
  classifyInventoryBatches,
  type BatchClassificationLineInput,
  type BatchClassificationGraph,
  type BatchClassificationMode,
} from './classifyBatches';
import { recordInventoryAdjustment, type InventoryAdjustmentGraph } from './adjustInventory';
import {
  cancelInventoryReconciliation,
  finalizeInventoryReconciliation,
  getInventoryReconciliationDraft,
  listOpenInventoryReconciliations,
  startInventoryReconciliation,
  submitInventoryReconciliation,
  type ReconciliationDraft,
  type ReconciliationGraph,
  type ReconciliationGroupCountInput,
  type OpenReconciliationSummary,
} from './reconcileInventory';
import {
  generateGuidedChecks,
  getGuidedCheckOverview,
  replaceGuidedCheck,
  saveGuidedCheckSettings,
  type GuidedCheckGenerationResult,
  type GuidedCheckOverview,
  type GuidedCheckReplacementResult,
  type SaveGuidedCheckSettingsInput,
} from './guidedChecks';
import {
  getAttentionOverview,
  saveAttentionSettings,
  snoozeAttention,
  type AttentionOverview,
  type SaveAttentionSettingsInput,
  type SnoozeAttentionInput,
  type SaveAttentionSettingsResult,
  type SnoozeAttentionResult,
} from './attention';

export interface InventoryReviewProduct {
  storeProductId: string;
  productName: string;
  inventoryBalanceBaseMicros: string;
  unknownResidualBaseMicros: string;
  groupCount: number;
  preferredPackage: Pick<PackageUnitRow, 'id' | 'name' | 'conversionToBaseMicros'> | null;
}

export interface InventoryClient {
  readonly storeId: string;
  readonly storeName: string;
  readonly deviceId: string;
  readonly userId: string;
  listReviewProducts(): InventoryReviewProduct[];
  getBatchProjection(storeProductId: string): BatchProjection;
  listOpenReconciliations(): OpenReconciliationSummary[];
  classifyBatches(input: {
    storeProductId: string;
    expectedInventoryWatermark: string;
    expectedBatchWatermark: string;
    groups: BatchClassificationLineInput[];
    mode?: BatchClassificationMode;
    operationId?: string;
  }): BatchClassificationGraph;
  classifyUnknown(input: {
    storeProductId: string;
    expectedInventoryWatermark: string;
    expectedBatchWatermark: string;
    groups: BatchClassificationLineInput[];
    operationId?: string;
  }): BatchClassificationGraph;
  recordAdjustment(input: {
    storeProductId: string;
    expectedInventoryWatermark: string;
    expectedBatchWatermark: string;
    quantityBaseDeltaMicros: number;
    groupId?: string | null;
    packageUnitId?: string | null;
    quantityPackageSnapshotMicros?: number | null;
    conversionToBaseSnapshotMicros?: number | null;
    reasonCode: InventoryAdjustmentReason;
    note?: string | null;
    operationId?: string;
  }): InventoryAdjustmentGraph;
  startReconciliation(storeProductId: string, checkAssignmentId?: string | null): ReconciliationDraft;
  resumeReconciliation(reconciliationId: string): ReconciliationDraft;
  getReconciliationDraft(reconciliationId: string): ReconciliationDraft;
  submitReconciliation(input: {
    reconciliationId: string;
    expectedInventoryWatermark: string;
    expectedBatchWatermark: string;
    physicalBaseUnits: string | number | bigint;
    completeGroupCount?: boolean;
    groupCounts?: ReconciliationGroupCountInput[];
    reasonCode?: string | null;
    note?: string | null;
  }): ReconciliationDraft;
  finalizeReconciliation(input: {
    reconciliationId: string;
    reasonCode?: InventoryAdjustmentReason;
    note?: string | null;
    packageUnitId?: string | null;
    quantityPackageSnapshotMicros?: number | null;
    conversionToBaseSnapshotMicros?: number | null;
    operationId?: string;
  }): ReconciliationGraph;
  cancelReconciliation(reconciliationId: string): ReconciliationDraft;
  getGuidedCheckOverview(now?: string): GuidedCheckOverview;
  saveGuidedCheckSettings(input: Omit<SaveGuidedCheckSettingsInput, 'storeId' | 'deviceId' | 'userId' | 'operationId'> & { operationId?: string }): ReturnType<typeof saveGuidedCheckSettings>;
  generateGuidedChecks(input?: { operationId?: string; now?: string }): GuidedCheckGenerationResult;
  replaceGuidedCheck(input: { operationId?: string; assignmentId: string; reasonCode: string; note?: string | null; now?: string }): GuidedCheckReplacementResult;
  getAttentionOverview(now?: string): AttentionOverview;
  saveAttentionSettings(input: Omit<SaveAttentionSettingsInput, 'storeId' | 'deviceId' | 'userId' | 'operationId'> & { operationId?: string }): SaveAttentionSettingsResult;
  snoozeAttention(input: Omit<SnoozeAttentionInput, 'storeId' | 'deviceId' | 'userId' | 'operationId'> & { operationId?: string }): SnoozeAttentionResult;
}

export interface CreateInventoryClientOptions {
  storeId?: string;
  deviceId?: string;
  userId?: string;
  generateId?: () => string;
}

function resolveStore(adapter: DatabaseAdapter, storeId?: string): StoreRow {
  const store = storeId ? getStoreById(adapter, storeId) : listStores(adapter)[0];
  if (!store || store.status !== 'ACTIVE') throw new Error('Cannot create InventoryClient: no active store is provisioned.');
  return store;
}

function resolveDevice(adapter: DatabaseAdapter, store: StoreRow, deviceId?: string): DeviceRow {
  const device = deviceId ? getDeviceById(adapter, deviceId) : listDevicesByStore(adapter, store.id)[0];
  if (!device || device.storeId !== store.id || device.status !== 'ACTIVE') throw new Error('Cannot create InventoryClient: no active device is provisioned.');
  return device;
}

function resolveUser(adapter: DatabaseAdapter, store: StoreRow, userId?: string): string {
  if (userId) {
    const member = adapter.getFirstRow<{ id: string }>(
      `SELECT id FROM store_members WHERE store_id = ? AND user_id = ? AND status = 'ACTIVE' LIMIT 1;`,
      [store.id, userId],
    );
    if (!member) throw new Error('Cannot create InventoryClient: user is not an active store member.');
    return userId;
  }
  const member = adapter.getFirstRow<{ user_id: string }>(
    `SELECT user_id FROM store_members WHERE store_id = ? AND status = 'ACTIVE' ORDER BY role = 'OWNER' DESC, created_at ASC LIMIT 1;`,
    [store.id],
  );
  if (!member) throw new Error('Cannot create InventoryClient: no active store member found.');
  return member.user_id;
}

function activeProduct(adapter: DatabaseAdapter, store: StoreRow, storeProductId: string): StoreProductRow {
  const product = getStoreProductById(adapter, storeProductId);
  if (!product || product.storeId !== store.id || product.status !== 'ACTIVE') {
    throw new Error('Product does not belong to this store or is not active.');
  }
  return product;
}

export function createDatabaseInventoryClient(
  adapter: DatabaseAdapter,
  options: CreateInventoryClientOptions = {},
): InventoryClient {
  const store = resolveStore(adapter, options.storeId);
  const device = resolveDevice(adapter, store, options.deviceId);
  const userId = resolveUser(adapter, store, options.userId);
  const generateId = options.generateId ?? generateMobileId;
  return {
    storeId: store.id,
    storeName: store.name,
    deviceId: device.id,
    userId,
    listReviewProducts(): InventoryReviewProduct[] {
      return listStoreProducts(adapter, store.id, '', 'ACTIVE').flatMap((hit) => {
        const projection = getBatchProjectionForStoreProduct(adapter, hit.product.id);
        return [{
          storeProductId: hit.product.id,
          productName: hit.variantName,
          inventoryBalanceBaseMicros: projection.inventoryBalanceBaseMicros,
          unknownResidualBaseMicros: projection.unknownResidualBaseMicros,
          groupCount: projection.groups.length,
          preferredPackage: hit.product.preferredPackageUnitId
            ? (() => {
              const packageUnit = getPackageUnitById(adapter, hit.product.preferredPackageUnitId!);
              return packageUnit ? { id: packageUnit.id, name: packageUnit.name, conversionToBaseMicros: packageUnit.conversionToBaseMicros } : null;
            })()
            : null,
        }];
      });
    },
    getBatchProjection(storeProductId: string): BatchProjection {
      const product = activeProduct(adapter, store, storeProductId);
      return getBatchProjectionForStoreProduct(adapter, product.id);
    },
    listOpenReconciliations(): OpenReconciliationSummary[] {
      return listOpenInventoryReconciliations(adapter, { storeId: store.id, deviceId: device.id, userId });
    },
    classifyBatches(input): BatchClassificationGraph {
      activeProduct(adapter, store, input.storeProductId);
      return classifyInventoryBatches(adapter, {
        operationId: input.operationId ?? generateId(),
        storeId: store.id,
        deviceId: device.id,
        userId,
        storeProductId: input.storeProductId,
        expectedInventoryWatermark: input.expectedInventoryWatermark,
        expectedBatchWatermark: input.expectedBatchWatermark,
        mode: input.mode,
        groups: input.groups,
      }, { generateId });
    },
    classifyUnknown(input): BatchClassificationGraph {
      return this.classifyBatches({ ...input, mode: 'UNKNOWN' });
    },
    recordAdjustment(input): InventoryAdjustmentGraph {
      activeProduct(adapter, store, input.storeProductId);
      return recordInventoryAdjustment(adapter, {
        operationId: input.operationId ?? generateId(),
        storeId: store.id,
        deviceId: device.id,
        userId,
        reasonCode: input.reasonCode,
        note: input.note,
        lines: [{
          storeProductId: input.storeProductId,
          expectedInventoryWatermark: input.expectedInventoryWatermark,
          expectedBatchWatermark: input.expectedBatchWatermark,
          quantityBaseDeltaMicros: input.quantityBaseDeltaMicros,
          groupId: input.groupId,
          packageUnitId: input.packageUnitId,
          quantityPackageSnapshotMicros: input.quantityPackageSnapshotMicros,
          conversionToBaseSnapshotMicros: input.conversionToBaseSnapshotMicros,
        }],
      }, { generateId });
    },
    startReconciliation(storeProductId: string, checkAssignmentId?: string | null): ReconciliationDraft {
      activeProduct(adapter, store, storeProductId);
      return startInventoryReconciliation(adapter, {
        storeId: store.id,
        deviceId: device.id,
        userId,
        storeProductId,
        checkAssignmentId,
      }, { generateId });
    },
    resumeReconciliation(reconciliationId: string): ReconciliationDraft {
      return getInventoryReconciliationDraft(adapter, {
        reconciliationId,
        storeId: store.id,
        deviceId: device.id,
        userId,
      });
    },
    getReconciliationDraft(reconciliationId: string): ReconciliationDraft {
      return getInventoryReconciliationDraft(adapter, {
        reconciliationId,
        storeId: store.id,
        deviceId: device.id,
        userId,
      });
    },
    submitReconciliation(input): ReconciliationDraft {
      return submitInventoryReconciliation(adapter, {
        ...input,
        storeId: store.id,
        deviceId: device.id,
        userId,
      }, { generateId });
    },
    finalizeReconciliation(input): ReconciliationGraph {
      return finalizeInventoryReconciliation(adapter, {
        ...input,
        operationId: input.operationId ?? generateId(),
        storeId: store.id,
        deviceId: device.id,
        userId,
      }, { generateId });
    },
    cancelReconciliation(reconciliationId: string): ReconciliationDraft {
      return cancelInventoryReconciliation(adapter, {
        reconciliationId,
        storeId: store.id,
        deviceId: device.id,
        userId,
      });
    },
    getGuidedCheckOverview(now?: string): GuidedCheckOverview {
      return getGuidedCheckOverview(adapter, { storeId: store.id, deviceId: device.id, userId, now });
    },
    saveGuidedCheckSettings(input) {
      return saveGuidedCheckSettings(adapter, {
        ...input,
        operationId: input.operationId ?? generateId(),
        storeId: store.id,
        deviceId: device.id,
        userId,
      });
    },
    generateGuidedChecks(input = {}) {
      return generateGuidedChecks(adapter, {
        operationId: input.operationId ?? generateId(),
        now: input.now,
        storeId: store.id,
        deviceId: device.id,
        userId,
      }, { generateId });
    },
    replaceGuidedCheck(input) {
      return replaceGuidedCheck(adapter, {
        ...input,
        operationId: input.operationId ?? generateId(),
        storeId: store.id,
        deviceId: device.id,
        userId,
      }, { generateId });
    },
    getAttentionOverview(now?: string): AttentionOverview {
      return getAttentionOverview(adapter, { storeId: store.id, deviceId: device.id, userId, now });
    },
    saveAttentionSettings(input) {
      return saveAttentionSettings(adapter, {
        ...input,
        operationId: input.operationId ?? generateId(),
        storeId: store.id,
        deviceId: device.id,
        userId,
      });
    },
    snoozeAttention(input) {
      return snoozeAttention(adapter, {
        ...input,
        operationId: input.operationId ?? generateId(),
        storeId: store.id,
        deviceId: device.id,
        userId,
      }, { generateId });
    },
  };
}
