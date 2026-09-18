import { generateMobileId } from '../crypto/mobileIds';
import type { DatabaseAdapter } from '../db/adapter';
import {
  getDeviceById,
  getStoreById,
  getStoreProductById,
  listDevicesByStore,
  listStoreProducts,
  listStores,
  type DeviceRow,
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

export interface InventoryReviewProduct {
  storeProductId: string;
  productName: string;
  inventoryBalanceBaseMicros: string;
  unknownResidualBaseMicros: string;
  groupCount: number;
}

export interface InventoryClient {
  readonly storeId: string;
  readonly storeName: string;
  readonly deviceId: string;
  readonly userId: string;
  listReviewProducts(): InventoryReviewProduct[];
  getBatchProjection(storeProductId: string): BatchProjection;
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
        }];
      });
    },
    getBatchProjection(storeProductId: string): BatchProjection {
      const product = activeProduct(adapter, store, storeProductId);
      return getBatchProjectionForStoreProduct(adapter, product.id);
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
  };
}
