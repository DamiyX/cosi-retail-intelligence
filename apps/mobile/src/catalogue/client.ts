import { assertCurrentActor, resolveCurrentActor, guardClient } from '../storeContext/access';
import { DomainError } from '@retail/domain';
import { createProductPhotos, type PhotoFiles, type ProductPhotos } from '../media/productPhotos';
import { createCatalogueSuggestions, type CatalogueSuggestions } from './lookup/suggestions';
import type { CatalogueLookupAdapter, LookupCode } from './lookup/provider';
import { generateMobileId } from '../crypto/mobileIds';
import type { RecognitionService } from '@retail/contracts';
import { createRecognitionService } from '../features/scanning/resolver';
import type { DatabaseAdapter } from '../db/adapter';
import {
  createTemporaryProduct,
  type CreateTemporaryProductInput,
  type TemporaryProductGraph,
} from './createTemporaryProduct';
import {
  addProductIdentifier,
  updateProductIdentity,
  type AddProductIdentifierInput,
  type AddProductIdentifierResult,
  type ProductIdentityResult,
  type UpdateProductIdentityInput,
} from './updateProductIdentity';
import {
  createPackage,
  deactivatePackage,
  updatePackage,
  type CreatePackageInput,
  type DeactivatePackageInput,
  type PackageResult,
  type UpdatePackageInput,
} from './managePackages';
import {
  markProductEnriched,
  setProductActive,
  type ProductLifecycleInput,
  type ProductLifecycleResult,
} from './manageLifecycle';
import {
  updateReorderLevel,
  type ProductReorderLevelResult,
  type UpdateReorderLevelInput,
} from './updateReorderLevel';
import {
  getProductVariantById,
  getStoreProductById,
  listPackageUnitsByVariant,
  listProductIdentifiers,
  listStores,
  listStorePackageSettings,
  listStoreProducts,
  type DeviceRow,
  type PackageUnitRow,
  type ProductIdentifierRow,
  type ProductLifecycleFilter,
  type ProductSearchHit,
  type ProductVariantRow,
  type StorePackageSettingRow,
  type StoreProductRow,
  type StoreRow,
} from '../db/repositories';

/**
 * Synchronous screen-facing seam over the catalogue application boundary.
 * Screens never touch repositories or SQL: they call this client, which
 * keeps business logic out of UI components (AGENTS.md section 12). The
 * interface also lets component tests inject a stub instead of a database.
 * It grows ticket by ticket (identity edits in M2-02, packages in M2-03,
 * lifecycle in M2-04).
 */

export interface QuickAddInput {
  lookupCode?: LookupCode;
  name: string;
  generateTemporaryLabel?: boolean;
  localPhotoId?: string;
  baseUnitName?: string;
  baseUnitSymbol?: string | null;
  localSku?: string | null;
  barcode?: string | null;
  barcodeType?: 'EAN' | 'UPC' | 'QR';
  barcodeForBasePackage?: boolean;
  defaultSellingPriceMinor?: number | null;
  operationId?: string;
}

export interface ProductDetail {
  product: StoreProductRow;
  variant: ProductVariantRow;
  packages: PackageUnitRow[];
  identifiers: ProductIdentifierRow[];
  settings: StorePackageSettingRow[];
}

export type { TemporaryProductGraph };
export type { AddProductIdentifierResult, ProductIdentityResult };
export type { PackageResult };
export type { ProductLifecycleResult };
export type { ProductReorderLevelResult };

export interface ProductReorderLevelInput {
  storeProductId: string;
  reorderLevelBaseMicros: number | null;
  expectedVersion: number;
  operationId?: string;
}

export interface CatalogueClient {
  suggestions?: CatalogueSuggestions;
  photos?: ProductPhotos;
  recognition?: RecognitionService;
  readonly storeId: string;
  readonly storeName: string;
  readonly storeCurrencyCode: string;
  listProducts(query: string, filter?: ProductLifecycleFilter): ProductSearchHit[];
  createTemporaryProduct(input: QuickAddInput): TemporaryProductGraph;
  getProductDetail(productId: string): ProductDetail | null;
  updateProductIdentity(
    input: Omit<UpdateProductIdentityInput, 'storeId' | 'deviceId'> & { storeProductId: string },
  ): ProductIdentityResult;
  addProductIdentifier(
    input: Omit<AddProductIdentifierInput, 'storeId' | 'deviceId'> & { storeProductId: string },
  ): AddProductIdentifierResult;
  createPackage(
    input: Omit<CreatePackageInput, 'storeId' | 'deviceId'> & { storeProductId: string },
  ): PackageResult;
  updatePackage(
    input: Omit<UpdatePackageInput, 'storeId' | 'deviceId'> & { packageUnitId: string },
  ): PackageResult;
  deactivatePackage(input: Omit<DeactivatePackageInput, 'storeId' | 'deviceId'>): PackageResult;
  markProductEnriched(
    input: Omit<ProductLifecycleInput, 'storeId' | 'deviceId'>,
  ): ProductLifecycleResult;
  setProductActive(
    input: Omit<ProductLifecycleInput, 'storeId' | 'deviceId'>,
    active: boolean,
  ): ProductLifecycleResult;
  updateReorderLevel(input: ProductReorderLevelInput): ProductReorderLevelResult;
}

export function createCatalogueClient(
  adapter: DatabaseAdapter,
  store: StoreRow,
  device: DeviceRow & { localEnrollmentDeviceId?: string },
  generateId: () => string = generateMobileId,
  photoFiles?: () => PhotoFiles,
  lookupAdapter?: CatalogueLookupAdapter,
): CatalogueClient {
  const context = resolveCurrentActor(adapter, { storeId: store.id, deviceId: device.id, userId: device.userId ?? '',
    localEnrollmentDeviceId: device.localEnrollmentDeviceId });
  const catalogueUserId = context.userId;
  const photos = createProductPhotos(adapter, store.id, photoFiles, generateId, undefined, context);
  const suggestions = createCatalogueSuggestions(adapter, store.id, lookupAdapter);
  return guardClient<CatalogueClient>({
    suggestions,
    storeId: store.id,
    recognition: createRecognitionService(adapter, store.id),
    photos,
    storeName: store.name,
    storeCurrencyCode: store.currencyCode,
    listProducts(query: string, filter: ProductLifecycleFilter = 'ALL'): ProductSearchHit[] {
      return listStoreProducts(adapter, store.id, query, filter);
    },
    createTemporaryProduct(input: QuickAddInput): TemporaryProductGraph {
      const operation: CreateTemporaryProductInput = {
        storeId: store.id,
        deviceId: device.id,
        name: input.name,
        generateTemporaryLabel: input.generateTemporaryLabel,
        localPhotoId: input.localPhotoId,
        baseUnitName: input.baseUnitName,
        baseUnitSymbol: input.baseUnitSymbol,
        localSku: input.localSku,
        barcode: input.barcode,
        barcodeType: input.barcodeType,
        barcodeForBasePackage: input.barcodeForBasePackage,
        defaultSellingPriceMinor: input.defaultSellingPriceMinor,
      };
      const graph = createTemporaryProduct(adapter, operation, { generateId, actorContext: context, operationId: input.operationId,
        validatePhoto: () => { if (input.localPhotoId) photos.assertReady(input.localPhotoId); } });
      const code = input.lookupCode ?? (input.barcode ? { value: input.barcode, type: input.barcodeType ?? 'EAN' } : undefined);
      if (code) { try { suggestions.remember(graph.storeProduct.id, code); } catch { /* Lookup never invalidates a durable product. */ } }
      return graph;
    },
    getProductDetail(productId: string): ProductDetail | null {
      const product = getStoreProductById(adapter, productId);
      if (!product || product.storeId !== store.id) {
        return null;
      }
      const variant = getProductVariantById(adapter, product.productVariantId);
      if (!variant) {
        return null;
      }
      return {
        product,
        variant,
        packages: listPackageUnitsByVariant(adapter, variant.id),
        identifiers: listProductIdentifiers(adapter, variant.id),
        settings: listStorePackageSettings(adapter, product.id),
      };
    },
    updateProductIdentity(
      input: Omit<UpdateProductIdentityInput, 'storeId' | 'deviceId'> & { storeProductId: string },
    ): ProductIdentityResult {
      const result = updateProductIdentity(
        adapter,
        { ...input, storeId: store.id, deviceId: device.id },
        { generateId, actorContext: context },
      );
      try { suggestions.decide(input.storeProductId, 'CORRECTED'); } catch { /* Name fingerprint still rejects late responses. */ }
      return result;
    },
    addProductIdentifier(
      input: Omit<AddProductIdentifierInput, 'storeId' | 'deviceId'> & { storeProductId: string },
    ): AddProductIdentifierResult {
      return addProductIdentifier(
        adapter,
        { ...input, storeId: store.id, deviceId: device.id },
        { generateId, actorContext: context },
      );
    },
    createPackage(
      input: Omit<CreatePackageInput, 'storeId' | 'deviceId'> & { storeProductId: string },
    ): PackageResult {
      return createPackage(adapter, { ...input, storeId: store.id, deviceId: device.id }, { generateId, actorContext: context });
    },
    updatePackage(
      input: Omit<UpdatePackageInput, 'storeId' | 'deviceId'> & { packageUnitId: string },
    ): PackageResult {
      return updatePackage(adapter, { ...input, storeId: store.id, deviceId: device.id }, { generateId, actorContext: context });
    },
    deactivatePackage(input: Omit<DeactivatePackageInput, 'storeId' | 'deviceId'>): PackageResult {
      return deactivatePackage(
        adapter,
        { ...input, storeId: store.id, deviceId: device.id },
        { generateId, actorContext: context },
      );
    },
    markProductEnriched(
      input: Omit<ProductLifecycleInput, 'storeId' | 'deviceId'>,
    ): ProductLifecycleResult {
      return markProductEnriched(
        adapter,
        { ...input, storeId: store.id, deviceId: device.id },
        { generateId, actorContext: context },
      );
    },
    setProductActive(
      input: Omit<ProductLifecycleInput, 'storeId' | 'deviceId'>,
      active: boolean,
    ): ProductLifecycleResult {
      return setProductActive(
        adapter,
        { ...input, storeId: store.id, deviceId: device.id },
        active,
        { generateId, actorContext: context },
      );
    },
    updateReorderLevel(input: ProductReorderLevelInput): ProductReorderLevelResult {
      const operation: UpdateReorderLevelInput = {
        storeId: store.id,
        deviceId: device.id,
        userId: catalogueUserId,
        storeProductId: input.storeProductId,
        reorderLevelBaseMicros: input.reorderLevelBaseMicros,
        expectedVersion: input.expectedVersion,
      };
      return updateReorderLevel(adapter, operation, {
        generateId,
        actorContext: context,
        operationId: input.operationId,
      });
    },
  }, () => assertCurrentActor(adapter, context));
}

export interface CurrentStoreContext {
  store: StoreRow;
  device: DeviceRow;
}

/**
 * Resolve the acting store context for the Products area. M2 assumes the
 * single-store retailer and requires an unambiguous bound actor;
 * onboarding defines real store switching later. Returns null when
 * current authority is unavailable so the UI can say so honestly.
 */
export function resolveCurrentStore(adapter: DatabaseAdapter): CurrentStoreContext | null {
  if (listStores(adapter).length === 0) return null;
  try {
    const { store, device } = resolveCurrentActor(adapter);
    return { store, device };
  } catch (error) {
    if (error instanceof DomainError) return null;
    throw error;
  }
}
