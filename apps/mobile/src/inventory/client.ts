import { assertCurrentActor, resolveCurrentActor, guardClient } from '../storeContext/access';
import { generateMobileId } from '../crypto/mobileIds';
import type { DatabaseAdapter } from '../db/adapter';
import {
  getPackageUnitById,
  getStoreProductById,
  listStoreProducts,
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
  const context = resolveCurrentActor(adapter, options);
  const { store, device, userId } = context;
  const generateId = options.generateId ?? generateMobileId;
  return guardClient<InventoryClient>({
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
      }, { generateId, actorContext: context });
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
      }, { generateId, actorContext: context });
    },
    startReconciliation(storeProductId: string, checkAssignmentId?: string | null): ReconciliationDraft {
      activeProduct(adapter, store, storeProductId);
      return startInventoryReconciliation(adapter, {
        storeId: store.id,
        deviceId: device.id,
        userId,
        storeProductId,
        checkAssignmentId,
      }, { generateId, actorContext: context });
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
      }, { generateId, actorContext: context });
    },
    finalizeReconciliation(input): ReconciliationGraph {
      return finalizeInventoryReconciliation(adapter, {
        ...input,
        operationId: input.operationId ?? generateId(),
        storeId: store.id,
        deviceId: device.id,
        userId,
      }, { generateId, actorContext: context });
    },
    cancelReconciliation(reconciliationId: string): ReconciliationDraft {
      return cancelInventoryReconciliation(adapter, {
        reconciliationId,
        storeId: store.id,
        deviceId: device.id,
        userId,
      }, { actorContext: context });
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
      }, { actorContext: context });
    },
    generateGuidedChecks(input = {}) {
      return generateGuidedChecks(adapter, {
        operationId: input.operationId ?? generateId(),
        now: input.now,
        storeId: store.id,
        deviceId: device.id,
        userId,
      }, { generateId, actorContext: context });
    },
    replaceGuidedCheck(input) {
      return replaceGuidedCheck(adapter, {
        ...input,
        operationId: input.operationId ?? generateId(),
        storeId: store.id,
        deviceId: device.id,
        userId,
      }, { generateId, actorContext: context });
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
      }, { actorContext: context });
    },
    snoozeAttention(input) {
      return snoozeAttention(adapter, {
        ...input,
        operationId: input.operationId ?? generateId(),
        storeId: store.id,
        deviceId: device.id,
        userId,
      }, { generateId, actorContext: context });
    },
  }, () => assertCurrentActor(adapter, context));
}
