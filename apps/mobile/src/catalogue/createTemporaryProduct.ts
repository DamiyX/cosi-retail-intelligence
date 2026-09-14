import { MICROS_PER_UNIT } from '@retail/domain';

import { generateMobileId } from '../crypto/mobileIds';
import type { DatabaseAdapter } from '../db/adapter';
import {
  createPackageUnit,
  createProductIdentifier,
  createProductVariant,
  createStoreProduct,
  enqueueOutboxOperation,
  findOutboxOperation,
  getActiveBasePackageUnit,
  getProductIdentifierById,
  getProductVariantById,
  getStoreProductById,
  type OutboxOperationRow,
  type PackageUnitRow,
  type ProductIdentifierRow,
  type ProductVariantRow,
  type StoreProductRow,
} from '../db/repositories';
import { nowIso, requireId } from '../db/repositories/common';

/**
 * Application boundary for catalogue mutations. Every operation runs its
 * business writes plus exactly one outbox envelope in a single SQLite
 * transaction, accepts an injected ID provider (Expo-backed by default),
 * and treats a repeated operation ID as idempotent: the original graph is
 * returned and no duplicate rows or envelopes are written.
 */

export interface CatalogueOperationOptions {
  /** Client ID provider; defaults to the Expo-backed mobile generator. */
  generateId?: () => string;
  /**
   * Idempotency key for this logical mutation. Retrying with the same key
   * returns the original result instead of duplicating work.
   */
  operationId?: string;
}

export interface CreateTemporaryProductInput {
  storeId: string;
  deviceId: string;
  /** Retailer-entered product name; the only required field. */
  name: string;
  /** Base-unit label, editable before save. Defaults to "piece". */
  baseUnitName?: string;
  baseUnitSymbol?: string | null;
  localSku?: string | null;
  /**
   * Optional printed barcode captured at quick add. Stored as an EAN
   * identifier on the variant (no package presentation is known yet);
   * correct it from product detail if it follows another standard.
   */
  barcode?: string | null;
}

export interface TemporaryProductGraph {
  variant: ProductVariantRow;
  basePackage: PackageUnitRow;
  storeProduct: StoreProductRow;
  identifier: ProductIdentifierRow | null;
  outbox: OutboxOperationRow;
}

/**
 * Create a usable temporary product offline (D-035): one store-scoped
 * provisional variant, its active base package, the store product marked
 * temporary, an optional barcode identifier, and exactly one PENDING
 * PRODUCT_CREATED envelope — all atomically. Any failure leaves neither
 * business rows nor an outbox row behind.
 */
export function createTemporaryProduct(
  adapter: DatabaseAdapter,
  input: CreateTemporaryProductInput,
  options: CatalogueOperationOptions = {},
): TemporaryProductGraph {
  const generateId = options.generateId ?? generateMobileId;
  const storeId = requireId(input.storeId);
  const deviceId = requireId(input.deviceId);
  const operationId = options.operationId === undefined ? generateId() : requireId(options.operationId);

  const replayed = findOutboxOperation(adapter, operationId);
  if (replayed) {
    return rehydrateTemporaryProduct(adapter, replayed);
  }

  const occurredAt = nowIso();
  return adapter.transaction(() => {
    const variant = createProductVariant(adapter, {
      id: generateId(),
      identityScope: 'STORE_LOCAL',
      ownerStoreId: storeId,
      name: input.name,
    });
    const basePackage = createPackageUnit(adapter, {
      id: generateId(),
      productVariantId: variant.id,
      name: input.baseUnitName === undefined || input.baseUnitName.trim().length === 0
        ? 'piece'
        : input.baseUnitName.trim(),
      symbol: input.baseUnitSymbol,
      conversionToBaseMicros: MICROS_PER_UNIT,
      isBaseUnit: true,
    });
    const storeProduct = createStoreProduct(adapter, {
      id: generateId(),
      storeId,
      productVariantId: variant.id,
      localSku: input.localSku,
      preferredPackageUnitId: basePackage.id,
      isTemporary: true,
    });
    const rawBarcode = input.barcode === undefined || input.barcode === null ? '' : input.barcode.trim();
    const identifier =
      rawBarcode.length === 0
        ? null
        : createProductIdentifier(adapter, {
            id: generateId(),
            productVariantId: variant.id,
            type: 'EAN',
            value: rawBarcode,
          });
    const outbox = enqueueOutboxOperation(adapter, {
      operationType: 'PRODUCT_CREATED',
      operationId,
      storeId,
      deviceId,
      entityType: 'STORE_PRODUCT',
      entityId: storeProduct.id,
      occurredAt,
      entities: {
        storeProduct,
        productVariant: variant,
        basePackageUnit: basePackage,
        identifier,
      },
    });
    return { variant, basePackage, storeProduct, identifier, outbox };
  });
}

function rehydrateTemporaryProduct(
  adapter: DatabaseAdapter,
  outbox: OutboxOperationRow,
): TemporaryProductGraph {
  const storeProduct = getStoreProductById(adapter, outbox.entityId);
  const variant = storeProduct ? getProductVariantById(adapter, storeProduct.productVariantId) : null;
  const basePackage = variant ? getActiveBasePackageUnit(adapter, variant.id) : null;
  if (!storeProduct || !variant || !basePackage) {
    throw new Error('Outbox replay references a product graph that no longer exists.');
  }
  const envelope = JSON.parse(outbox.payload) as {
    entities?: { identifier?: { id?: string } | null };
  };
  const identifierId = envelope.entities?.identifier?.id;
  const identifier =
    typeof identifierId === 'string' ? getProductIdentifierById(adapter, identifierId) : null;
  return { variant, basePackage, storeProduct, identifier, outbox };
}
