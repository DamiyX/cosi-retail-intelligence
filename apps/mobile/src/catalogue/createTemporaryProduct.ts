import { MICROS_PER_UNIT } from '@retail/domain';

import { generateMobileId } from '../crypto/mobileIds';
import type { DatabaseAdapter } from '../db/adapter';
import {
  createPackageUnit,
  createProductIdentifier,
  createProductVariant,
  createStoreProduct,
  enqueueOutboxOperation,
  findExpectedOutboxReplay,
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
import { attachProductPhoto } from '../media/productPhotos';

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
  /** Catalogue name, or an empty input when the selling shortcut generates it. */
  name: string;
  generateTemporaryLabel?: boolean;
  /** Local metadata only; never serialized into the business envelope. */
  localPhotoId?: string;
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
  barcodeType?: 'EAN' | 'UPC' | 'QR';
  /** Explicit confirmation that the detected code names this base package. */
  barcodeForBasePackage?: boolean;
  defaultSellingPriceMinor?: number | null;
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
  options: CatalogueOperationOptions & { validatePhoto?: () => void } = {},
): TemporaryProductGraph {
  const generateId = options.generateId ?? generateMobileId;
  const storeId = requireId(input.storeId);
  const deviceId = requireId(input.deviceId);
  const operationId = options.operationId === undefined ? generateId() : requireId(options.operationId);

  const replayed = findExpectedOutboxReplay(adapter, {
    operationId,
    storeId,
    deviceId,
    operationType: 'PRODUCT_CREATED',
    entityType: 'STORE_PRODUCT',
  });
  if (replayed) {
    return rehydrateTemporaryProduct(adapter, replayed);
  }

  options.validatePhoto?.();

  const occurredAt = nowIso();
  return adapter.transaction(() => {
    const variantId = generateId();
    const packageId = generateId();
    const storeProductId = generateId();
    const variant = createProductVariant(adapter, {
      id: variantId,
      identityScope: 'STORE_LOCAL',
      ownerStoreId: storeId,
      name: input.generateTemporaryLabel ? `Unfinished product ${storeProductId.replace(/-/g, '').slice(-12)}` : input.name,
    });
    const basePackage = createPackageUnit(adapter, {
      id: packageId,
      productVariantId: variant.id,
      name: input.baseUnitName === undefined || input.baseUnitName.trim().length === 0
        ? 'piece'
        : input.baseUnitName.trim(),
      symbol: input.baseUnitSymbol,
      conversionToBaseMicros: MICROS_PER_UNIT,
      isBaseUnit: true,
    });
    const storeProduct = createStoreProduct(adapter, {
      id: storeProductId,
      storeId,
      productVariantId: variant.id,
      localSku: input.localSku,
      preferredPackageUnitId: basePackage.id,
      isTemporary: true,
      defaultSellingPriceMinor: input.defaultSellingPriceMinor,
    });
    const rawBarcode = input.barcode == null ? '' : input.barcodeType === 'QR' ? input.barcode : input.barcode.trim();
    if (input.localPhotoId) attachProductPhoto(adapter, storeId, storeProduct.id, input.localPhotoId);
    const identifier =
      rawBarcode.length === 0
        ? null
        : createProductIdentifier(adapter, {
            id: generateId(),
            productVariantId: variant.id,
            type: input.barcodeType ?? 'EAN',
            packageUnitId: input.barcodeForBasePackage ? basePackage.id : null,
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
