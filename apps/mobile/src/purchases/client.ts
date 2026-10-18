import { assertCurrentActor, resolveCurrentActor, guardClient } from '../storeContext/access';
import type { QuickAddInput, TemporaryProductGraph } from '../catalogue/client';
import { createTemporaryProduct } from '../catalogue/createTemporaryProduct';
import { generateMobileId } from '../crypto/mobileIds';
import type { DatabaseAdapter } from '../db/adapter';
import {
  getProductVariantById,
  getStoreProductById,
  listPackageUnitsByVariant,
  listSuppliersByStore,
  searchStoreProducts,
  type SupplierRow,
  type StoreRow,
  type ProductSearchHit,
} from '../db/repositories';
import {
  getPurchaseDetail,
  listRecentPurchases,
  recordPurchase,
  type CompletedPurchaseGraph,
  type PurchaseDetail,
  type RecordPurchaseInput,
  type RecordPurchaseOptions,
} from './index';

export interface PurchasablePackageOption {
  id: string;
  name: string;
  symbol: string | null;
  conversionToBaseMicros: number;
  isBaseUnit: boolean;
}

export interface PurchasableProductHit {
  storeProductId: string;
  variantId: string;
  productName: string;
  localSku: string | null;
  preferredPackage: PurchasablePackageOption | null;
  packages: PurchasablePackageOption[];
  isTemporary: boolean;
}

export interface RecordPurchaseScreenInput {
  lines: RecordPurchaseInput['lines'];
  supplierId?: string | null;
  supplierName?: string | null;
  occurredAt?: string;
  operationId?: string;
}

export interface PurchasesClient {
  readonly storeId: string;
  readonly storeName: string;
  readonly storeCurrencyCode: string;
  readonly deviceId: string;
  readonly userId: string;
  searchProducts(query: string): PurchasableProductHit[];
  getProductPackages(storeProductId: string): PurchasablePackageOption[];
  listSuppliers(): SupplierRow[];
  createTemporaryProduct(input: QuickAddInput): TemporaryProductGraph;
  recordPurchase(input: RecordPurchaseScreenInput): CompletedPurchaseGraph;
  listPurchases(limit?: number): ReturnType<typeof listRecentPurchases>;
  getPurchaseDetail(purchaseId: string): PurchaseDetail | null;
}

export interface CreatePurchasesClientOptions {
  storeId?: string;
  deviceId?: string;
  userId?: string;
  generateId?: () => string;
}

function packageOptions(adapter: DatabaseAdapter, store: StoreRow, storeProductId: string): PurchasablePackageOption[] {
  const product = getStoreProductById(adapter, storeProductId);
  if (!product || product.storeId !== store.id || product.status !== 'ACTIVE') return [];
  const variant = getProductVariantById(adapter, product.productVariantId);
  if (!variant || variant.status !== 'ACTIVE') return [];
  return listPackageUnitsByVariant(adapter, variant.id)
    .filter((pkg) => pkg.status === 'ACTIVE' && pkg.isPurchasable)
    .map((pkg) => ({
      id: pkg.id,
      name: pkg.name,
      symbol: pkg.symbol,
      conversionToBaseMicros: pkg.conversionToBaseMicros,
      isBaseUnit: pkg.isBaseUnit,
    }));
}

export function createDatabasePurchasesClient(
  adapter: DatabaseAdapter,
  options: CreatePurchasesClientOptions = {},
): PurchasesClient {
  const generateId = options.generateId ?? generateMobileId;
  const context = resolveCurrentActor(adapter, options, false);
  const { store, device, userId } = context;
  return guardClient<PurchasesClient>({
    storeId: store.id,
    storeName: store.name,
    storeCurrencyCode: store.currencyCode,
    deviceId: device.id,
    userId,
    searchProducts(query: string): PurchasableProductHit[] {
      const hits: ProductSearchHit[] = searchStoreProducts(adapter, store.id, query, 'ACTIVE');
      return hits
        .map((hit) => {
          const packages = packageOptions(adapter, store, hit.product.id);
          const preferred = packages.find((pkg) => pkg.id === hit.product.preferredPackageUnitId) ?? packages.find((pkg) => pkg.isBaseUnit) ?? packages[0] ?? null;
          return {
            storeProductId: hit.product.id,
            variantId: hit.product.productVariantId,
            productName: hit.variantName,
            localSku: hit.product.localSku,
            preferredPackage: preferred,
            packages,
            isTemporary: hit.isTemporary,
          };
        })
        .filter((hit) => hit.packages.length > 0);
    },
    getProductPackages(storeProductId: string): PurchasablePackageOption[] {
      return packageOptions(adapter, store, storeProductId);
    },
    listSuppliers(): SupplierRow[] {
      return listSuppliersByStore(adapter, store.id);
    },
    createTemporaryProduct(input: QuickAddInput): TemporaryProductGraph {
      return createTemporaryProduct(adapter, {
        storeId: store.id,
        deviceId: device.id,
        name: input.name,
        baseUnitName: input.baseUnitName,
        baseUnitSymbol: input.baseUnitSymbol,
        localSku: input.localSku,
        barcode: input.barcode,
      }, { generateId, actorContext: context });
    },
    recordPurchase(input: RecordPurchaseScreenInput): CompletedPurchaseGraph {
      const operationOptions: RecordPurchaseOptions = {
        generateId,
        actorContext: context,
        operationId: input.operationId,
      };
      return recordPurchase(adapter, {
        storeId: store.id,
        deviceId: device.id,
        userId,
        lines: input.lines,
        supplierId: input.supplierId,
        supplierName: input.supplierName,
        occurredAt: input.occurredAt,
      }, operationOptions);
    },
    listPurchases(limit = 50) {
      return listRecentPurchases(adapter, store.id, limit);
    },
    getPurchaseDetail(purchaseId: string): PurchaseDetail | null {
      return getPurchaseDetail(adapter, purchaseId, store.id);
    },
  }, () => assertCurrentActor(adapter, context, false));
}
