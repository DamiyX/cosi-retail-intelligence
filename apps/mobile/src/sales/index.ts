import type { DatabaseAdapter } from '../db/adapter';
import {
  findOutboxOperationForEntity,
  getCustomerAccountById,
  listSaleItemCostSnapshotsBySaleId,
  getInventoryBalanceByStoreProduct,
  getReceivableBySaleId,
  getSaleById,
  listPaymentsBySaleId,
  listSaleItemsBySaleId,
  listSalesByStore,
  type CustomerAccountRow,
  type SaleItemCostSnapshotRow,
  type OutboxStatus,
  type PaymentRow,
  type ReceivableRow,
  type SaleItemRow,
  type SaleRow,
  type SaleSummaryRow,
} from '../db/repositories';

export { completeSale } from './completeSale';
export type {
  CompletedSaleGraph,
  CompleteSaleInput,
  CompleteSaleLineInput,
  CompleteSaleOptions,
  CompleteSalePaymentInput,
} from './completeSale';
export type { SaleSummaryRow } from '../db/repositories';

export interface SaleDetail {
  sale: SaleRow;
  items: SaleItemRow[];
  costSnapshots: SaleItemCostSnapshotRow[];
  payment: PaymentRow;
  customerAccount: CustomerAccountRow | null;
  receivable: ReceivableRow | null;
  syncStatus: OutboxStatus | null;
  inventoryEffects: SaleItemInventoryEffect[];
  inventoryReadFailure: string | null;
}

/**
 * Read-only M3 view of the immutable sale effect versus the current derived
 * balance. The historical delta is never rewritten if later events change
 * stock; a missing balance only means the derived projection could not load.
 */
export interface SaleItemInventoryEffect {
  saleItemId: string;
  storeProductId: string;
  historicalSaleDeltaBaseMicros: number;
  currentDerivedBalanceBaseMicros: number | null;
}

export function getSaleDetail(
  adapter: DatabaseAdapter,
  saleId: string,
  storeId?: string,
): SaleDetail | null {
  const sale = getSaleById(adapter, saleId);
  if (!sale) {
    return null;
  }
  if (storeId !== undefined && sale.storeId !== storeId) {
    return null;
  }
  const items = listSaleItemsBySaleId(adapter, sale.id);
  const costSnapshots = listSaleItemCostSnapshotsBySaleId(adapter, sale.id);
  const payments = listPaymentsBySaleId(adapter, sale.id);
  if (payments.length === 0) {
    return null;
  }
  const payment = payments[0];
  const receivable = getReceivableBySaleId(adapter, sale.id);
  const customerAccount = receivable ? getCustomerAccountById(adapter, receivable.customerAccountId) : null;
  const outbox = findOutboxOperationForEntity(adapter, {
    storeId: sale.storeId,
    entityType: 'SALE',
    entityId: sale.id,
    operationType: 'COMPLETED_SALE_CREATED',
  });
  let inventoryReadFailure: string | null = null;
  const inventoryEffects = items.map((item) => {
    try {
      return {
        saleItemId: item.id,
        storeProductId: item.storeProductId,
        historicalSaleDeltaBaseMicros: -item.quantityBaseMicros,
        currentDerivedBalanceBaseMicros: getInventoryBalanceByStoreProduct(
          adapter,
          item.storeProductId,
        ),
      };
    } catch {
      inventoryReadFailure = 'Current inventory balance could not be read on this device.';
      return {
        saleItemId: item.id,
        storeProductId: item.storeProductId,
        historicalSaleDeltaBaseMicros: -item.quantityBaseMicros,
        currentDerivedBalanceBaseMicros: null,
      };
    }
  });

  return {
    sale,
    items,
    costSnapshots,
    payment,
    customerAccount,
    receivable,
    syncStatus: outbox?.status ?? null,
    inventoryEffects,
    inventoryReadFailure,
  };
}

export function listRecentSales(
  adapter: DatabaseAdapter,
  storeId: string,
  limit = 50,
): SaleSummaryRow[] {
  return listSalesByStore(adapter, storeId, limit);
}

export function getProductStock(
  adapter: DatabaseAdapter,
  storeProductId: string,
): number {
  return getInventoryBalanceByStoreProduct(adapter, storeProductId);
}
