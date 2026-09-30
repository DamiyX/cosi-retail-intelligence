import { createProductPhotos, type ProductPhotos } from '../media/productPhotos';
import { createCatalogueSuggestions, type CatalogueSuggestions } from '../catalogue/lookup/suggestions';
import type { CatalogueLookupAdapter } from '../catalogue/lookup/provider';
import type { QuickAddInput } from '../catalogue/client';
import type { RecognitionService } from '@retail/contracts';
import { createRecognitionService } from '../features/scanning/resolver';
import {
  createTemporaryProduct,
  type CreateTemporaryProductInput,
  type TemporaryProductGraph,
} from '../catalogue/createTemporaryProduct';
import { generateMobileId } from '../crypto/mobileIds';
import type { DatabaseAdapter } from '../db/adapter';
import {
  getDeviceById,
  getInventoryBalanceByStoreProduct,
  getProductVariantById,
  getStoreById,
  getStoreProductById,
  listDevicesByStore,
  listPackageUnitsByVariant,
  listSalesByStore,
  listStorePackageSettings,
  listStores,
  searchCustomerAccounts,
  searchStoreProducts,
  type CustomerAccountRow,
  type SaleSummaryRow,
} from '../db/repositories';
import {
  completeSale,
  type CompletedSaleGraph,
  type CompleteSaleLineInput,
  type CompleteSalePaymentInput,
} from './completeSale';
import { getSaleDetail, type SaleDetail } from './index';

export type { CompletedSaleGraph, CompleteSaleLineInput, CompleteSalePaymentInput };
export type { QuickAddInput, TemporaryProductGraph };

export interface SellablePackageOption {
  id: string;
  name: string;
  symbol: string | null;
  conversionToBaseMicros: number;
  isBaseUnit: boolean;
  sellingPriceMinor: number | null;
}

export interface SellableProductHit {
  storeProductId: string;
  variantId: string;
  productName: string;
  localSku: string | null;
  preferredPackage: SellablePackageOption | null;
  isTemporary: boolean;
  recordedBaseMicros?: number;
}

export interface CompleteSaleScreenInput {
  lines: CompleteSaleLineInput[];
  payment: CompleteSalePaymentInput;
  note?: string | null;
  operationId?: string;
}


/**
 * Screen-facing client boundary for Sell flow.
 * Screens never touch repositories or SQL: they call this client, keeping
 * business logic out of UI components (AGENTS.md section 12).
 */
export interface SalesClient {
  suggestions?: CatalogueSuggestions;
  photos?: ProductPhotos;
  readonly storeId: string;
  readonly storeName: string;
  readonly storeCurrencyCode: string;
  readonly deviceId: string;
  readonly userId: string;

  searchProducts(query: string): SellableProductHit[];
  getProductById?(storeProductId: string): SellableProductHit | null;
  recognition?: RecognitionService;
  getProductPackages(storeProductId: string): SellablePackageOption[];
  searchCustomers(query: string): CustomerAccountRow[];
  createTemporaryProduct(input: QuickAddInput): TemporaryProductGraph;
  completeSale(input: CompleteSaleScreenInput): CompletedSaleGraph;
  listSales(limit?: number): SaleSummaryRow[];
  getSaleDetail(saleId: string): SaleDetail | null;
}

export interface CreateSalesClientOptions {
  lookupAdapter?: CatalogueLookupAdapter;
  storeId?: string;
  deviceId?: string;
  userId?: string;
  generateId?: () => string;
}

export function createDatabaseSalesClient(
  adapter: DatabaseAdapter,
  options: CreateSalesClientOptions = {},
): SalesClient {
  const generateId = options.generateId ?? generateMobileId;
  const store = options.storeId
    ? getStoreById(adapter, options.storeId)
    : listStores(adapter)[0];
  if (!store) {
    throw new Error('Cannot create SalesClient: no store is provisioned.');
  }
  if (store.status !== 'ACTIVE') {
    throw new Error('Cannot create SalesClient: store is not active.');
  }

  const device = options.deviceId
    ? getDeviceById(adapter, options.deviceId)
    : listDevicesByStore(adapter, store.id)[0];
  if (!device || device.storeId !== store.id || device.status !== 'ACTIVE') {
    throw new Error('Cannot create SalesClient: no active device is provisioned for this store.');
  }

  let userId = options.userId;
  if (userId) {
    const memberRow = adapter.getFirstRow<{ id: string }>(
      `SELECT id FROM store_members WHERE store_id = ? AND user_id = ? AND status = 'ACTIVE' LIMIT 1;`,
      [store.id, userId],
    );
    if (!memberRow) {
      throw new Error('Cannot create SalesClient: user is not an active store member.');
    }
  } else {
    const memberRow = adapter.getFirstRow<{ user_id: string }>(
      `SELECT user_id FROM store_members WHERE store_id = ? AND status = 'ACTIVE' LIMIT 1;`,
      [store.id],
    );
    if (!memberRow) {
      throw new Error('Cannot create SalesClient: no active store member found.');
    }
    userId = memberRow.user_id;
  }

  const getPackagesForProduct = (storeProductId: string): SellablePackageOption[] => {
    const sp = getStoreProductById(adapter, storeProductId);
    if (!sp || sp.storeId !== store.id || sp.status !== 'ACTIVE') return [];
    const variant = getProductVariantById(adapter, sp.productVariantId);
    if (
      !variant ||
      variant.status !== 'ACTIVE' ||
      (variant.identityScope === 'STORE_LOCAL' && variant.ownerStoreId !== store.id)
    ) {
      return [];
    }
    const pkgs = listPackageUnitsByVariant(adapter, sp.productVariantId).filter(
      (p) => p.status === 'ACTIVE' && p.isSellable,
    );
    const settings = listStorePackageSettings(adapter, sp.id);
    const settingMap = new Map(settings.map((s) => [s.packageUnitId, s]));

    return pkgs.map((pkg) => {
      const setting = settingMap.get(pkg.id);
      const sellingPriceMinor = setting?.defaultSellingPriceMinor ?? sp.defaultSellingPriceMinor;
      return {
        id: pkg.id,
        name: pkg.name,
        symbol: pkg.symbol,
        conversionToBaseMicros: pkg.conversionToBaseMicros,
        isBaseUnit: pkg.isBaseUnit,
        sellingPriceMinor,
      };
    });
  };

  const suggestions = createCatalogueSuggestions(adapter, store.id, options.lookupAdapter);
  return {
    suggestions,
    storeId: store.id,
    storeName: store.name,
    storeCurrencyCode: store.currencyCode,
    deviceId: device.id,
    userId,

    recognition: createRecognitionService(adapter, store.id),
    photos: createProductPhotos(adapter, store.id),
    getProductById(storeProductId) {
      const product = getStoreProductById(adapter, storeProductId);
      if (!product || product.storeId !== store.id || product.status !== 'ACTIVE') return null;
      const variant = getProductVariantById(adapter, product.productVariantId);
      if (!variant || variant.status !== 'ACTIVE' || (variant.identityScope === 'STORE_LOCAL' && variant.ownerStoreId !== store.id)) return null;
      const packages = getPackagesForProduct(product.id);
      return { storeProductId: product.id, variantId: variant.id, productName: variant.name,
        localSku: product.localSku, isTemporary: product.isTemporary,
        recordedBaseMicros: getInventoryBalanceByStoreProduct(adapter, product.id),
        preferredPackage: packages.find(p => p.id === product.preferredPackageUnitId) ?? null };
    },

    searchProducts(query: string): SellableProductHit[] {
      const hits = searchStoreProducts(adapter, store.id, query, 'ACTIVE');
      return hits.map((hit) => {
        const pkgs = getPackagesForProduct(hit.product.id);
        const preferred =
          pkgs.find((p) => p.id === hit.product.preferredPackageUnitId) ??
          pkgs.find((p) => p.isBaseUnit) ??
          pkgs[0] ??
          null;

        return {
          storeProductId: hit.product.id,
          variantId: hit.product.productVariantId,
          productName: hit.variantName,
          localSku: hit.product.localSku,
          preferredPackage: preferred,
          isTemporary: hit.isTemporary,
        };
      });
    },

    getProductPackages(storeProductId: string): SellablePackageOption[] {
      return getPackagesForProduct(storeProductId);
    },

    searchCustomers(query: string): CustomerAccountRow[] {
      return searchCustomerAccounts(adapter, store.id, query);
    },

    createTemporaryProduct(input: QuickAddInput): TemporaryProductGraph {
      if (input.localPhotoId) createProductPhotos(adapter, store.id).assertReady(input.localPhotoId);
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
      const graph = createTemporaryProduct(adapter, operation, { generateId, operationId: input.operationId });
      const code = input.lookupCode ?? (input.barcode ? { value: input.barcode, type: input.barcodeType ?? 'EAN' } : undefined);
      if (code) { try { suggestions.remember(graph.storeProduct.id, code); } catch { /* Optional lookup cannot delay checkout. */ } }
      return graph;
    },

    completeSale(input: CompleteSaleScreenInput): CompletedSaleGraph {
      return completeSale(
        adapter,
        {
          storeId: store.id,
          deviceId: device.id,
          userId,
          lines: input.lines,
          payment: input.payment,
          note: input.note,
        },
        {
          ...options,
          operationId: input.operationId ?? options.generateId?.(),
        },
      );
    },

    listSales(limit = 50): SaleSummaryRow[] {
      return listSalesByStore(adapter, store.id, limit);
    },

    getSaleDetail(saleId: string): SaleDetail | null {
      return getSaleDetail(adapter, saleId, store.id);
    },
  };
}
