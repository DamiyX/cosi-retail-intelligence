import type { QuickAddInput, TemporaryProductGraph } from '../catalogue/client';
import { createTemporaryProduct } from '../catalogue/createTemporaryProduct';
import { generateMobileId } from '../crypto/mobileIds';
import type { DatabaseAdapter } from '../db/adapter';
import {
  getDeviceById,
  getProductVariantById,
  getStoreById,
  getStoreProductById,
  listDevicesByStore,
  listPackageUnitsByVariant,
  listStores,
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
  const store = options.storeId ? getStoreById(adapter, options.storeId) : listStores(adapter)[0];
  if (!store || store.status !== 'ACTIVE') throw new Error('Cannot create PurchasesClient: no active store is provisioned.');
  const device = options.deviceId ? getDeviceById(adapter, options.deviceId) : listDevicesByStore(adapter, store.id)[0];
  if (!device || device.storeId !== store.id || device.status !== 'ACTIVE') throw new Error('Cannot create PurchasesClient: no active device is provisioned.');
  let userId = options.userId;
  if (userId) {
    const member = adapter.getFirstRow<{ id: string }>(
      `SELECT id FROM store_members WHERE store_id = ? AND user_id = ? AND status = 'ACTIVE' LIMIT 1;`,
      [store.id, userId],
    );
    if (!member) throw new Error('Cannot create PurchasesClient: user is not an active store member.');
  } else {
    const member = adapter.getFirstRow<{ user_id: string }>(
      `SELECT user_id FROM store_members WHERE store_id = ? AND status = 'ACTIVE' LIMIT 1;`,
      [store.id],
    );
    if (!member) throw new Error('Cannot create PurchasesClient: no active store member found.');
    userId = member.user_id;
  }
  return {
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
      }, { generateId });
    },
    recordPurchase(input: RecordPurchaseScreenInput): CompletedPurchaseGraph {
      const operationOptions: RecordPurchaseOptions = {
        generateId,
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
  };
}
