import { DomainError } from '@retail/domain';

import { generateMobileId } from '../crypto/mobileIds';
import type { DatabaseAdapter } from '../db/adapter';
import {
  enqueueOutboxOperation,
  createReorderLevelHistory,
  findExpectedOutboxReplay,
  getInventoryBalanceBigIntByStoreProduct,
  getInventoryLedgerWatermark,
  getDeviceById,
  getStoreById,
  getStoreProductById,
  updateStoreProductReorderLevel,
  type OutboxOperationRow,
  type StoreProductRow,
} from '../db/repositories';
import { nowIso, requireId } from '../db/repositories/common';
import type { CatalogueOperationOptions } from './createTemporaryProduct';

export interface UpdateReorderLevelInput {
  storeId: string;
  deviceId: string;
  userId: string;
  storeProductId: string;
  /** Null clears the control; zero is a valid threshold. */
  reorderLevelBaseMicros: number | null;
  /** Local optimistic revision read with the product detail. */
  expectedVersion: number;
}

export interface ProductReorderLevelResult {
  storeProduct: StoreProductRow;
  outbox: OutboxOperationRow;
}

interface ReorderLevelRequest {
  reorderLevelBaseMicros: number | null;
}

function requestFor(input: UpdateReorderLevelInput): ReorderLevelRequest {
  const value = input.reorderLevelBaseMicros;
  if (
    value !== null &&
    (!Number.isSafeInteger(value) || value < 0)
  ) {
    throw new DomainError(
      'INVALID_QUANTITY',
      'Reorder threshold must be a non-negative safe integer in micro-units.',
    );
  }
  if (!Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 1) {
    throw new DomainError('INVALID_VALUE', 'Store product version is invalid. Refresh before saving.');
  }
  return { reorderLevelBaseMicros: value };
}

function assertOwner(adapter: DatabaseAdapter, input: UpdateReorderLevelInput): void {
  const storeId = requireId(input.storeId);
  const deviceId = requireId(input.deviceId);
  const userId = requireId(input.userId);
  const store = getStoreById(adapter, storeId);
  if (!store || store.status !== 'ACTIVE') {
    throw new DomainError('INVALID_VALUE', 'Store does not exist or is not active.');
  }
  const device = getDeviceById(adapter, deviceId);
  if (!device || device.storeId !== storeId || device.status !== 'ACTIVE') {
    throw new DomainError('INVALID_VALUE', 'Device does not belong to this store or is not active.');
  }
  const member = adapter.getFirstRow<{ id: string; role: string }>(
    `SELECT id, role FROM store_members
     WHERE store_id = ? AND user_id = ? AND status = 'ACTIVE' LIMIT 1;`,
    [storeId, userId],
  );
  if (!member || member.role !== 'OWNER') {
    throw new DomainError('INVALID_VALUE', 'Only an active store owner can manage reorder thresholds.');
  }
}

function requireOwnedProduct(
  adapter: DatabaseAdapter,
  storeId: string,
  storeProductId: string,
): StoreProductRow {
  const storeProduct = getStoreProductById(adapter, storeProductId);
  if (!storeProduct || storeProduct.storeId !== storeId) {
    throw new DomainError('INVALID_VALUE', 'Store product does not exist in this store.');
  }
  return storeProduct;
}

function rehydrateReplay(
  outbox: OutboxOperationRow,
  request: ReorderLevelRequest,
): ProductReorderLevelResult {
  const envelope = JSON.parse(outbox.payload) as {
    entities?: {
      request?: ReorderLevelRequest;
      storeProduct?: StoreProductRow;
    };
  };
  if (JSON.stringify(envelope.entities?.request) !== JSON.stringify(request)) {
    throw new DomainError(
      'INVALID_VALUE',
      'This operation ID already belongs to a different reorder threshold request.',
    );
  }
  const storeProduct = envelope.entities?.storeProduct;
  if (!storeProduct || storeProduct.id !== outbox.entityId) {
    throw new Error('Reorder threshold replay is missing its original store-product snapshot.');
  }
  return { storeProduct, outbox };
}

/**
 * Set or clear the store-private low-stock threshold. Authorization is
 * checked before replay and again inside the atomic business/outbox
 * transaction, so an operation ID is never an authorization token.
 */
export function updateReorderLevel(
  adapter: DatabaseAdapter,
  input: UpdateReorderLevelInput,
  options: CatalogueOperationOptions = {},
): ProductReorderLevelResult {
  const storeId = requireId(input.storeId);
  const deviceId = requireId(input.deviceId);
  const userId = requireId(input.userId);
  const storeProductId = requireId(input.storeProductId);
  const request = requestFor(input);
  const generateId = options.generateId ?? generateMobileId;
  const operationId = options.operationId === undefined ? generateId() : requireId(options.operationId);

  assertOwner(adapter, { ...input, storeId, deviceId, userId, storeProductId });
  const replayed = findExpectedOutboxReplay(adapter, {
    operationId,
    storeId,
    deviceId,
    operationType: 'PRODUCT_REORDER_LEVEL_UPDATED',
    entityType: 'STORE_PRODUCT',
    entityId: storeProductId,
  });
  if (replayed) {
    return rehydrateReplay(replayed, request);
  }

  const occurredAt = nowIso();
  return adapter.transaction(() => {
    assertOwner(adapter, { ...input, storeId, deviceId, userId, storeProductId });
    const existing = requireOwnedProduct(adapter, storeId, storeProductId);
    if (existing.version !== input.expectedVersion) {
      throw new DomainError(
        'INVALID_VALUE',
        'Product settings changed while this threshold was open. Refresh before saving.',
      );
    }
    const inventoryBalanceAtUpdate = getInventoryBalanceBigIntByStoreProduct(adapter, storeProductId);
    const inventoryLedgerWatermarkAtUpdate = getInventoryLedgerWatermark(adapter, storeProductId);
    const storeProduct = updateStoreProductReorderLevel(
      adapter,
      existing.id,
      request.reorderLevelBaseMicros,
      input.expectedVersion,
      occurredAt,
    );
    createReorderLevelHistory(adapter, {
      operationId,
      storeId,
      storeProductId,
      storeProductVersion: storeProduct.version,
      previousReorderLevelBaseMicros: existing.reorderLevelBaseMicros,
      reorderLevelBaseMicros: request.reorderLevelBaseMicros,
      inventoryBalanceBaseMicros: inventoryBalanceAtUpdate.toString(),
      inventoryLedgerWatermark: inventoryLedgerWatermarkAtUpdate,
      createdAt: occurredAt,
    });
    const outbox = enqueueOutboxOperation(adapter, {
      operationType: 'PRODUCT_REORDER_LEVEL_UPDATED',
      operationId,
      storeId,
      deviceId,
      entityType: 'STORE_PRODUCT',
      entityId: storeProduct.id,
      occurredAt,
      createdAt: occurredAt,
      entities: {
        storeProductVersion: 1,
        previousStoreProductVersion: existing.version,
        previousReorderLevelBaseMicros: existing.reorderLevelBaseMicros,
        inventoryBalanceBaseMicros: inventoryBalanceAtUpdate.toString(),
        inventoryLedgerWatermark: inventoryLedgerWatermarkAtUpdate,
        request,
        storeProduct,
      },
    });
    return { storeProduct, outbox };
  });
}
