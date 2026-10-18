import { captureCommandActor, assertCurrentActor, resolveCurrentActor } from '../storeContext/access';
import { DomainError, moneyFromMajorUnits, parseQuantityDecimal } from '@retail/domain';

import { generateMobileId } from '../crypto/mobileIds';
import type { DatabaseAdapter } from '../db/adapter';
import {
  createPackageUnit,
  deactivatePackageUnit,
  enqueueOutboxOperation,
  findExpectedOutboxReplay,
  getActiveBasePackageUnit,
  getPackageUnitById,
  getProductVariantById,
  getStoreById,
  getStoreProductById,
  getStoreProductByStoreAndVariant,
  getStorePackageSetting,
  listStorePackageSettings,
  saveStorePackageSetting,
  updatePackageUnit,
  updateStoreProductPreferredPackage,
  type OutboxOperationRow,
  type PackageUnitRow,
  type StorePackageSettingRow,
  type StoreProductRow,
} from '../db/repositories';
import { nowIso, requireId } from '../db/repositories/common';
import type { CatalogueOperationOptions } from './createTemporaryProduct';

export interface PackageSettingInput {
  /** Decimal major-unit selling price, for example "1450.50". */
  defaultSellingPrice?: string | null;
  minimumSellingPrice?: string | null;
  isPreferredForSale?: boolean;
  isPreferredForPurchase?: boolean;
}

export interface CreatePackageInput {
  storeId: string;
  deviceId: string;
  storeProductId: string;
  name: string;
  symbol?: string | null;
  /** Decimal base units per package, for example "40" or "0.5". */
  conversionText: string;
  isSellable?: boolean;
  isPurchasable?: boolean;
  setting?: PackageSettingInput;
}

export interface PackageResult {
  storeProduct: StoreProductRow;
  packageUnit: PackageUnitRow;
  setting: StorePackageSettingRow | null;
  outbox: OutboxOperationRow;
}

/**
 * Add a carton, pack, weight, or other package with an exact conversion
 * (M2-03): the package, its store price/preference setting, and exactly one
 * PACKAGE_CREATED envelope commit atomically. Conversion text is parsed to
 * D-034 micro-units; excess precision is rejected, never rounded.
 */
export function createPackage(
  adapter: DatabaseAdapter,
  input: CreatePackageInput,
  options: CatalogueOperationOptions = {},
): PackageResult {
  const generateId = options.generateId ?? generateMobileId;
  const storeId = requireId(input.storeId);
  const deviceId = requireId(input.deviceId);
  const actor = captureCommandActor(adapter, resolveCurrentActor(adapter, { storeId, deviceId }), options.actorContext);
  const operationId = options.operationId === undefined ? generateId() : requireId(options.operationId);

  const replayed = findExpectedOutboxReplay(adapter, {
    operationId, storeId, deviceId, operationType: 'PACKAGE_CREATED', entityType: 'PACKAGE_UNIT',
  });
  if (replayed) {
    return rehydratePackageResult(adapter, replayed);
  }

  const occurredAt = nowIso();
  return adapter.transaction(() => {
    assertCurrentActor(adapter, actor);
    const storeProduct = requireOwnedProduct(adapter, storeId, input.storeProductId);
    const currency = requireStoreCurrency(adapter, storeId);
    const conversionMicros = parseQuantityDecimal(input.conversionText);
    if (conversionMicros <= 0) {
      throw new DomainError('INVALID_CONVERSION', 'A package must contain a positive amount of the base unit.');
    }
    const packageUnit = createPackageUnit(adapter, {
      id: generateId(),
      productVariantId: storeProduct.productVariantId,
      name: input.name,
      symbol: input.symbol,
      conversionToBaseMicros: conversionMicros,
      isBaseUnit: false,
      isSellable: input.isSellable,
      isPurchasable: input.isPurchasable,
    });
    const setting = savePackageSetting(adapter, generateId, storeProduct.id, packageUnit.id, currency, input.setting);
    const updatedProduct = synchronizeSalePreference(adapter, storeProduct, packageUnit, setting);
    const outbox = enqueueOutboxOperation(adapter, {
      operationType: 'PACKAGE_CREATED',
      operationId,
      storeId,
      deviceId,
      entityType: 'PACKAGE_UNIT',
      entityId: packageUnit.id,
      occurredAt,
      entities: {
        storeProduct: updatedProduct,
        packageUnit,
        setting,
        storePackageSettings: listStorePackageSettings(adapter, updatedProduct.id),
      },
    });
    return { storeProduct: updatedProduct, packageUnit, setting, outbox };
  });
}

export interface UpdatePackageInput {
  storeId: string;
  deviceId: string;
  packageUnitId: string;
  name?: string;
  symbol?: string | null;
  isSellable?: boolean;
  isPurchasable?: boolean;
  setting?: PackageSettingInput;
}

/**
 * Edit package presentation, sale/purchase flags, and store price facts
 * with one PACKAGE_UPDATED envelope. The conversion factor is not an input:
 * changing what a package means goes through deactivate-plus-create so
 * completed transaction snapshots can never be reinterpreted.
 */
export function updatePackage(
  adapter: DatabaseAdapter,
  input: UpdatePackageInput,
  options: CatalogueOperationOptions = {},
): PackageResult {
  const generateId = options.generateId ?? generateMobileId;
  const storeId = requireId(input.storeId);
  const deviceId = requireId(input.deviceId);
  const actor = captureCommandActor(adapter, resolveCurrentActor(adapter, { storeId, deviceId }), options.actorContext);
  const operationId = options.operationId === undefined ? generateId() : requireId(options.operationId);

  const replayed = findExpectedOutboxReplay(adapter, {
    operationId, storeId, deviceId, operationType: 'PACKAGE_UPDATED', entityType: 'PACKAGE_UNIT',
    entityId: input.packageUnitId,
  });
  if (replayed) {
    return rehydratePackageResult(adapter, replayed);
  }

  const occurredAt = nowIso();
  return adapter.transaction(() => {
    assertCurrentActor(adapter, actor);
    const existing = getPackageUnitById(adapter, input.packageUnitId);
    if (!existing) {
      throw new DomainError('INVALID_VALUE', 'Package unit does not exist.');
    }
    const storeProduct = requireOwnedPackage(adapter, storeId, existing);
    if (
      existing.status === 'INACTIVE' &&
      (input.setting?.isPreferredForSale === true || input.setting?.isPreferredForPurchase === true)
    ) {
      throw new DomainError('INVALID_VALUE', 'An inactive package cannot be preferred.');
    }
    const currency = requireStoreCurrency(adapter, storeId);
    const packageUnit = updatePackageUnit(adapter, existing.id, {
      name: input.name,
      symbol: input.symbol,
      isSellable: input.isSellable,
      isPurchasable: input.isPurchasable,
    });
    const setting =
      input.setting === undefined
        ? getStorePackageSetting(adapter, storeProduct.id, packageUnit.id)
        : savePackageSetting(adapter, generateId, storeProduct.id, packageUnit.id, currency, input.setting);
    const updatedProduct = synchronizeSalePreference(adapter, storeProduct, packageUnit, setting);
    const outbox = enqueueOutboxOperation(adapter, {
      operationType: 'PACKAGE_UPDATED',
      operationId,
      storeId,
      deviceId,
      entityType: 'PACKAGE_UNIT',
      entityId: packageUnit.id,
      occurredAt,
      entities: {
        storeProduct: updatedProduct,
        packageUnit,
        setting,
        storePackageSettings: listStorePackageSettings(adapter, updatedProduct.id),
      },
    });
    return { storeProduct: updatedProduct, packageUnit, setting, outbox };
  });
}

export interface DeactivatePackageInput {
  storeId: string;
  deviceId: string;
  packageUnitId: string;
}

/**
 * Deactivate a package definition with one PACKAGE_DEACTIVATED envelope.
 * The row is retained for history. The active base unit cannot be
 * deactivated (a product must keep its base); replacing a base unit is a
 * future explicit operation. When the deactivated package was the
 * product's preferred one, preference falls back to the active base.
 */
export function deactivatePackage(
  adapter: DatabaseAdapter,
  input: DeactivatePackageInput,
  options: CatalogueOperationOptions = {},
): PackageResult {
  const generateId = options.generateId ?? generateMobileId;
  const storeId = requireId(input.storeId);
  const deviceId = requireId(input.deviceId);
  const actor = captureCommandActor(adapter, resolveCurrentActor(adapter, { storeId, deviceId }), options.actorContext);
  const operationId = options.operationId === undefined ? generateId() : requireId(options.operationId);

  const replayed = findExpectedOutboxReplay(adapter, {
    operationId, storeId, deviceId, operationType: 'PACKAGE_DEACTIVATED', entityType: 'PACKAGE_UNIT',
    entityId: input.packageUnitId,
  });
  if (replayed) {
    return rehydratePackageResult(adapter, replayed);
  }

  const occurredAt = nowIso();
  return adapter.transaction(() => {
    assertCurrentActor(adapter, actor);
    const existing = getPackageUnitById(adapter, input.packageUnitId);
    if (!existing) {
      throw new DomainError('INVALID_VALUE', 'Package unit does not exist.');
    }
    if (existing.isBaseUnit && existing.status === 'ACTIVE') {
      throw new DomainError(
        'INVALID_VALUE',
        'The base unit cannot be deactivated while it is the product\u2019s base.',
      );
    }
    const storeProduct = requireOwnedPackage(adapter, storeId, existing);
    const packageUnit = deactivatePackageUnit(adapter, existing.id);
    let updatedProduct = storeProduct;
    if (storeProduct.preferredPackageUnitId === packageUnit.id) {
      const base = getActiveBasePackageUnit(adapter, storeProduct.productVariantId);
      if (base) {
        updatedProduct = updateStoreProductPreferredPackage(adapter, storeProduct.id, base.id);
      }
    }
    const existingSetting = getStorePackageSetting(adapter, updatedProduct.id, packageUnit.id);
    const setting = existingSetting
      ? saveStorePackageSetting(adapter, {
          id: existingSetting.id,
          storeProductId: existingSetting.storeProductId,
          packageUnitId: existingSetting.packageUnitId,
          defaultSellingPriceMinor: existingSetting.defaultSellingPriceMinor,
          minimumSellingPriceMinor: existingSetting.minimumSellingPriceMinor,
          isPreferredForSale: false,
          isPreferredForPurchase: false,
        })
      : null;
    const outbox = enqueueOutboxOperation(adapter, {
      operationType: 'PACKAGE_DEACTIVATED',
      operationId,
      storeId,
      deviceId,
      entityType: 'PACKAGE_UNIT',
      entityId: packageUnit.id,
      occurredAt,
      entities: {
        storeProduct: updatedProduct,
        packageUnit,
        setting,
        storePackageSettings: listStorePackageSettings(adapter, updatedProduct.id),
      },
    });
    return { storeProduct: updatedProduct, packageUnit, setting, outbox };
  });
}

function parsePriceMinor(text: string | null | undefined, field: string, currencyCode: string): number | null {
  if (text === undefined || text === null || text.trim().length === 0) {
    return null;
  }
  try {
    return moneyFromMajorUnits(text.trim(), currencyCode).amountMinorUnits;
  } catch {
    throw new DomainError(
      'INVALID_VALUE',
      `${field} must be an amount with at most two decimal places.`,
    );
  }
}

function savePackageSetting(
  adapter: DatabaseAdapter,
  generateId: () => string,
  storeProductId: string,
  packageUnitId: string,
  currencyCode: string,
  input: PackageSettingInput | undefined,
): StorePackageSettingRow | null {
  if (!input) {
    return null;
  }
  return saveStorePackageSetting(adapter, {
    id: generateId(),
    storeProductId,
    packageUnitId,
    defaultSellingPriceMinor: parsePriceMinor(input.defaultSellingPrice, 'Default selling price', currencyCode),
    minimumSellingPriceMinor: parsePriceMinor(input.minimumSellingPrice, 'Minimum selling price', currencyCode),
    isPreferredForSale: input.isPreferredForSale,
    isPreferredForPurchase: input.isPreferredForPurchase,
  });
}

function requireStoreCurrency(adapter: DatabaseAdapter, storeId: string): string {
  const store = getStoreById(adapter, storeId);
  if (!store) {
    throw new DomainError('INVALID_VALUE', 'Store does not exist.');
  }
  return store.currencyCode;
}

function synchronizeSalePreference(
  adapter: DatabaseAdapter,
  storeProduct: StoreProductRow,
  packageUnit: PackageUnitRow,
  setting: StorePackageSettingRow | null,
): StoreProductRow {
  if (setting?.isPreferredForSale) {
    return updateStoreProductPreferredPackage(adapter, storeProduct.id, packageUnit.id);
  }
  if (storeProduct.preferredPackageUnitId !== packageUnit.id || packageUnit.isBaseUnit) {
    return storeProduct;
  }
  const base = getActiveBasePackageUnit(adapter, storeProduct.productVariantId);
  return base
    ? updateStoreProductPreferredPackage(adapter, storeProduct.id, base.id)
    : storeProduct;
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

/** The package must belong to the store's variant through its product. */
function requireOwnedPackage(
  adapter: DatabaseAdapter,
  storeId: string,
  packageUnit: PackageUnitRow,
): StoreProductRow {
  const variant = getProductVariantById(adapter, packageUnit.productVariantId);
  if (!variant || variant.ownerStoreId !== storeId) {
    throw new DomainError('INVALID_VALUE', 'Package unit does not exist in this store.');
  }
  const storeProduct = getStoreProductByStoreAndVariant(adapter, storeId, variant.id);
  if (!storeProduct) {
    throw new DomainError('INVALID_VALUE', 'Package unit does not exist in this store.');
  }
  return storeProduct;
}

function rehydratePackageResult(
  adapter: DatabaseAdapter,
  outbox: OutboxOperationRow,
): PackageResult {
  const packageUnit = getPackageUnitById(adapter, outbox.entityId);
  if (!packageUnit) {
    throw new Error('Outbox replay references a package that no longer exists.');
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
  const setting = getStorePackageSetting(adapter, storeProduct.id, packageUnit.id);
  return { storeProduct, packageUnit, setting, outbox };
}
