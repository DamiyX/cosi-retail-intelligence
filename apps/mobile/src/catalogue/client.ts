import { generateMobileId } from '../crypto/mobileIds';
import type { DatabaseAdapter } from '../db/adapter';
import {
  createTemporaryProduct,
  type CreateTemporaryProductInput,
  type TemporaryProductGraph,
} from './createTemporaryProduct';
import {
  getProductVariantById,
  getStoreProductById,
  listDevicesByStore,
  listPackageUnitsByVariant,
  listProductIdentifiers,
  listStores,
  listStoreProducts,
  type DeviceRow,
  type PackageUnitRow,
  type ProductIdentifierRow,
  type ProductLifecycleFilter,
  type ProductSearchHit,
  type ProductVariantRow,
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
  name: string;
  baseUnitName?: string;
  baseUnitSymbol?: string | null;
  localSku?: string | null;
  barcode?: string | null;
}

export interface ProductDetail {
  product: StoreProductRow;
  variant: ProductVariantRow;
  packages: PackageUnitRow[];
  identifiers: ProductIdentifierRow[];
}

export type { TemporaryProductGraph };

export interface CatalogueClient {
  readonly storeId: string;
  readonly storeName: string;
  listProducts(query: string, filter?: ProductLifecycleFilter): ProductSearchHit[];
  createTemporaryProduct(input: QuickAddInput): TemporaryProductGraph;
  getProductDetail(productId: string): ProductDetail | null;
}

export function createCatalogueClient(
  adapter: DatabaseAdapter,
  store: StoreRow,
  device: DeviceRow,
  generateId: () => string = generateMobileId,
): CatalogueClient {
  return {
    storeId: store.id,
    storeName: store.name,
    listProducts(query: string, filter: ProductLifecycleFilter = 'ALL'): ProductSearchHit[] {
      return listStoreProducts(adapter, store.id, query, filter);
    },
    createTemporaryProduct(input: QuickAddInput): TemporaryProductGraph {
      const operation: CreateTemporaryProductInput = {
        storeId: store.id,
        deviceId: device.id,
        name: input.name,
        baseUnitName: input.baseUnitName,
        baseUnitSymbol: input.baseUnitSymbol,
        localSku: input.localSku,
        barcode: input.barcode,
      };
      return createTemporaryProduct(adapter, operation, { generateId });
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
      };
    },
  };
}

export interface CurrentStoreContext {
  store: StoreRow;
  device: DeviceRow;
}

/**
 * Resolve the acting store context for the Products area. M2 assumes the
 * single-store retailer and uses the first store with its newest device;
 * onboarding defines real store switching later. Returns null when no
 * store exists so the UI can say so honestly instead of inventing one.
 */
export function resolveCurrentStore(adapter: DatabaseAdapter): CurrentStoreContext | null {
  const stores = listStores(adapter);
  const store = stores[0];
  if (!store) {
    return null;
  }
  const devices = listDevicesByStore(adapter, store.id);
  const device = devices[0];
  if (!device) {
    return null;
  }
  return { store, device };
}
