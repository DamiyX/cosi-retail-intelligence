import type { QuickAddInput } from '../catalogue/client';
import {
  createTemporaryProduct,
  type CreateTemporaryProductInput,
  type TemporaryProductGraph,
} from '../catalogue/createTemporaryProduct';
import { generateMobileId } from '../crypto/mobileIds';
import type { DatabaseAdapter } from '../db/adapter';
import {
  getDeviceById,
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
  readonly storeId: string;
  readonly storeName: string;
  readonly storeCurrencyCode: string;
  readonly deviceId: string;
  readonly userId: string;

  searchProducts(query: string): SellableProductHit[];
  getProductPackages(storeProductId: string): SellablePackageOption[];
  searchCustomers(query: string): CustomerAccountRow[];
  createTemporaryProduct(input: QuickAddInput): TemporaryProductGraph;
  completeSale(input: CompleteSaleScreenInput): CompletedSaleGraph;
  listSales(limit?: number): SaleSummaryRow[];
  getSaleDetail(saleId: string): SaleDetail | null;
}

export interface CreateSalesClientOptions {
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

  const device = options.deviceId
    ? getDeviceById(adapter, options.deviceId)
    : listDevicesByStore(adapter, store.id)[0];
  if (!device || device.storeId !== store.id) {
    throw new Error('Cannot create SalesClient: no valid device is provisioned for this store.');
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
    if (!sp) return [];
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

  return {
    storeId: store.id,
    storeName: store.name,
    storeCurrencyCode: store.currencyCode,
    deviceId: device.id,
    userId,

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
