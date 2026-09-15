import { DomainError } from '@retail/domain';

import { generateMobileId } from '../crypto/mobileIds';
import type { DatabaseAdapter } from '../db/adapter';
import {
  enqueueOutboxOperation,
  findExpectedOutboxReplay,
  getProductVariantById,
  getStoreProductById,
  updateStoreProductLifecycle,
  type CatalogueStatus,
  type OutboxOperationRow,
  type StoreProductRow,
} from '../db/repositories';
import { nowIso, requireId } from '../db/repositories/common';
import type { CatalogueOperationOptions } from './createTemporaryProduct';

export interface ProductLifecycleInput {
  storeId: string;
  deviceId: string;
  storeProductId: string;
}

export interface ProductLifecycleResult {
  storeProduct: StoreProductRow;
  outbox: OutboxOperationRow;
}

/**
 * Mark a temporary product enriched (M2-04): the identity is now
 * sufficiently identified, but the store keeps its private provisional
 * variant, local SKU, prices, and package settings untouched. Later
 * platform matching stays an explicit future consolidation under D-035.
 */
export function markProductEnriched(
  adapter: DatabaseAdapter,
  input: ProductLifecycleInput,
  options: CatalogueOperationOptions = {},
): ProductLifecycleResult {
  return changeLifecycle(adapter, input, options, { isTemporary: false }, 'enriched');
}

/**
 * Deactivate or reactivate a store product (M2-04) with one
 * PRODUCT_LIFECYCLE_CHANGED envelope. Deactivation retains the record and
 * its history for later transactions; it never deletes.
 */
export function setProductActive(
  adapter: DatabaseAdapter,
  input: ProductLifecycleInput,
  active: boolean,
  options: CatalogueOperationOptions = {},
): ProductLifecycleResult {
  const status: CatalogueStatus = active ? 'ACTIVE' : 'INACTIVE';
  return changeLifecycle(adapter, input, options, { status }, active ? 'reactivated' : 'deactivated');
}

function changeLifecycle(
  adapter: DatabaseAdapter,
  input: ProductLifecycleInput,
  options: CatalogueOperationOptions,
  change: { isTemporary?: boolean; status?: CatalogueStatus },
  verb: string,
): ProductLifecycleResult {
  const generateId = options.generateId ?? generateMobileId;
  const storeId = requireId(input.storeId);
  const deviceId = requireId(input.deviceId);
  const operationId = options.operationId === undefined ? generateId() : requireId(options.operationId);

  const replayed = findExpectedOutboxReplay(adapter, {
    operationId,
    storeId,
    deviceId,
    operationType: 'PRODUCT_LIFECYCLE_CHANGED',
    entityType: 'STORE_PRODUCT',
    entityId: input.storeProductId,
  });
  if (replayed) {
    const storeProduct = getStoreProductById(adapter, replayed.entityId);
    if (!storeProduct) {
      throw new Error('Outbox replay references a product that no longer exists.');
    }
    return { storeProduct, outbox: replayed };
  }

  const occurredAt = nowIso();
  return adapter.transaction(() => {
    const existing = getStoreProductById(adapter, input.storeProductId);
    if (!existing || existing.storeId !== storeId) {
      throw new DomainError('INVALID_VALUE', 'Store product does not exist in this store.');
    }
    const variant = getProductVariantById(adapter, existing.productVariantId);
    if (!variant) {
      throw new Error('Store product references a variant that no longer exists.');
    }
    const storeProduct = updateStoreProductLifecycle(adapter, existing.id, change);
    const outbox = enqueueOutboxOperation(adapter, {
      operationType: 'PRODUCT_LIFECYCLE_CHANGED',
      operationId,
      storeId,
      deviceId,
      entityType: 'STORE_PRODUCT',
      entityId: storeProduct.id,
      occurredAt,
      entities: {
        storeProduct,
        lifecycleChange: { ...change, verb },
        ownerStoreId: variant.ownerStoreId,
      },
    });
    return { storeProduct, outbox };
  });
}
