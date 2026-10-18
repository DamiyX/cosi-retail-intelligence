import { captureCommandActor, assertCurrentActor, resolveCurrentActor } from '../storeContext/access';
import { DomainError } from '@retail/domain';

import { generateMobileId } from '../crypto/mobileIds';
import type { DatabaseAdapter } from '../db/adapter';
import {
  createProductIdentifier,
  enqueueOutboxOperation,
  findExpectedOutboxReplay,
  findOutboxOperation,
  listProductIdentifiers,
  getPackageUnitById,
  getProductIdentifierById,
  getProductVariantById,
  getStoreProductById,
  renameProductVariant,
  updateStoreProductSku,
  type OutboxOperationRow,
  type ProductIdentifierRow,
  type ProductVariantRow,
  type StoreProductRow,
} from '../db/repositories';
import { nowIso, requireId } from '../db/repositories/common';
import type { CatalogueOperationOptions } from './createTemporaryProduct';

export interface UpdateProductIdentityInput {
  storeId: string;
  deviceId: string;
  storeProductId: string;
  /** New variant display name; absent leaves the name unchanged. */
  name?: string;
  /** New local SKU (null clears it); undefined leaves it unchanged. */
  localSku?: string | null;
}

export interface ProductIdentityResult {
  storeProduct: StoreProductRow;
  variant: ProductVariantRow;
  outbox: OutboxOperationRow;
}

/**
 * Enrich identity later without losing the temporary product (M2-02): rename
 * the variant and/or change the local SKU atomically with exactly one
 * PRODUCT_IDENTITY_UPDATED envelope. Only identity columns are written, so
 * store commercial facts (prices, package settings, reorder data) and
 * variant ownership cannot be touched by this path — proven by test.
 */
export function updateProductIdentity(
  adapter: DatabaseAdapter,
  input: UpdateProductIdentityInput,
  options: CatalogueOperationOptions = {},
): ProductIdentityResult {
  const generateId = options.generateId ?? generateMobileId;
  const storeId = requireId(input.storeId);
  const deviceId = requireId(input.deviceId);
  const actor = captureCommandActor(adapter, resolveCurrentActor(adapter, { storeId, deviceId }), options.actorContext);
  const operationId = options.operationId === undefined ? generateId() : requireId(options.operationId);

  const replayed = findExpectedOutboxReplay(adapter, {
    operationId,
    storeId,
    deviceId,
    operationType: 'PRODUCT_IDENTITY_UPDATED',
    entityType: 'STORE_PRODUCT',
    entityId: input.storeProductId,
  });
  if (replayed) {
    return rehydrateIdentityResult(adapter, replayed);
  }

  const occurredAt = nowIso();
  return adapter.transaction(() => {
    assertCurrentActor(adapter, actor);
    const existing = requireOwnedProduct(adapter, storeId, input.storeProductId);
    const variant =
      input.name === undefined
        ? getProductVariantById(adapter, existing.productVariantId)
        : renameProductVariant(adapter, existing.productVariantId, input.name);
    if (!variant) {
      throw new Error('Product variant disappeared during identity update.');
    }
    const storeProduct =
      input.localSku === undefined
        ? existing
        : updateStoreProductSku(adapter, existing.id, input.localSku);
    const outbox = enqueueOutboxOperation(adapter, {
      operationType: 'PRODUCT_IDENTITY_UPDATED',
      operationId,
      storeId,
      deviceId,
      entityType: 'STORE_PRODUCT',
      entityId: storeProduct.id,
      occurredAt,
      entities: { storeProduct, productVariant: variant },
    });
    return { storeProduct, variant, outbox };
  });
}

export interface AddProductIdentifierInput {
  operationId?: string;
  storeId: string;
  deviceId: string;
  storeProductId: string;
  type: 'EAN' | 'UPC' | 'QR' | 'INTERNAL_CODE' | 'MANUFACTURER_CODE';
  value: string;
  packageUnitId?: string | null;
}

export interface AddProductIdentifierResult {
  storeProduct: StoreProductRow;
  identifier: ProductIdentifierRow;
  /** Null when an already accepted remote association needs no local write. */
  outbox: OutboxOperationRow | null;
}

/** Attach one identifier plus exactly one PRODUCT_IDENTIFIER_ADDED envelope. */
export function addProductIdentifier(
  adapter: DatabaseAdapter,
  input: AddProductIdentifierInput,
  options: CatalogueOperationOptions = {},
): AddProductIdentifierResult {
  const generateId = options.generateId ?? generateMobileId;
  const storeId = requireId(input.storeId);
  const deviceId = requireId(input.deviceId);
  const actor = captureCommandActor(adapter, resolveCurrentActor(adapter, { storeId, deviceId }), options.actorContext);
  const operationId = options.operationId === undefined ? (input.operationId ?? generateId()) : requireId(options.operationId);

  const replayed = findExpectedOutboxReplay(adapter, {
    operationId,
    storeId,
    deviceId,
    operationType: 'PRODUCT_IDENTIFIER_ADDED',
    entityType: 'PRODUCT_IDENTIFIER',
  });
  if (replayed) {
    return rehydrateIdentifierResult(adapter, replayed);
  }

  const occurredAt = nowIso();
  return adapter.transaction(() => {
    assertCurrentActor(adapter, actor);
    const storeProduct = requireOwnedProduct(adapter, storeId, input.storeProductId);
    const variant = getProductVariantById(adapter, storeProduct.productVariantId);
    if (storeProduct.status !== 'ACTIVE' || !variant || variant.status !== 'ACTIVE' ||
        (variant.identityScope === 'STORE_LOCAL' && variant.ownerStoreId !== storeId)) {
      throw new DomainError('INVALID_VALUE', 'This product is not active in this store.');
    }
    const already = listProductIdentifiers(adapter, variant.id).find(identifier =>
      identifier.status === 'ACTIVE' && identifier.type === input.type && identifier.value === input.value &&
      identifier.packageUnitId === (input.packageUnitId ?? null));
    if (already) {
      const original = adapter.getFirstRow<{ operation_id: string }>(
        "SELECT operation_id FROM outbox_operations WHERE store_id = ? AND json_extract(payload, '$.entities.identifier.id') = ? LIMIT 1;",
        [storeId, already.id],
      );
      const outbox = original ? findOutboxOperation(adapter, original.operation_id) : null;
      return { storeProduct, identifier: already, outbox };
    }
    if (input.packageUnitId) {
      const packageUnit = getPackageUnitById(adapter, input.packageUnitId);
      if (!packageUnit || packageUnit.status !== 'ACTIVE' || packageUnit.productVariantId !== storeProduct.productVariantId) {
        throw new DomainError('INVALID_VALUE', 'Package unit does not belong to this product.');
      }
    }
    const identifier = createProductIdentifier(adapter, {
      id: generateId(),
      productVariantId: storeProduct.productVariantId,
      packageUnitId: input.packageUnitId,
      type: input.type,
      value: input.value,
    });
    const outbox = enqueueOutboxOperation(adapter, {
      operationType: 'PRODUCT_IDENTIFIER_ADDED',
      operationId,
      storeId,
      deviceId,
      entityType: 'PRODUCT_IDENTIFIER',
      entityId: identifier.id,
      occurredAt,
      entities: { storeProduct, identifier },
    });
    return { storeProduct, identifier, outbox };
  });
}

function requireOwnedProduct(
  adapter: DatabaseAdapter,
  storeId: string,
  storeProductId: string,
): StoreProductRow {
  const product = getStoreProductById(adapter, storeProductId);
  if (!product || product.storeId !== storeId) {
    throw new DomainError('INVALID_VALUE', 'Store product does not exist in this store.');
  }
  return product;
}

function rehydrateIdentityResult(
  adapter: DatabaseAdapter,
  outbox: OutboxOperationRow,
): ProductIdentityResult {
  const storeProduct = getStoreProductById(adapter, outbox.entityId);
  const variant = storeProduct ? getProductVariantById(adapter, storeProduct.productVariantId) : null;
  if (!storeProduct || !variant) {
    throw new Error('Outbox replay references an identity that no longer exists.');
  }
  return { storeProduct, variant, outbox };
}

function rehydrateIdentifierResult(
  adapter: DatabaseAdapter,
  outbox: OutboxOperationRow,
): AddProductIdentifierResult {
  const identifier = getProductIdentifierById(adapter, outbox.entityId);
  if (!identifier) {
    throw new Error('Outbox replay references an identifier that no longer exists.');
  }
  const envelope = JSON.parse(outbox.payload) as {
    entities?: { storeProduct?: { id?: string } };
  };
  const storeProductId = envelope.entities?.storeProduct?.id;
  const storeProduct =
    typeof storeProductId === 'string' ? getStoreProductById(adapter, storeProductId) : null;
  if (!storeProduct) {
    throw new Error('Outbox replay references a product that no longer exists.');
  }
  return { storeProduct, identifier, outbox };
}
