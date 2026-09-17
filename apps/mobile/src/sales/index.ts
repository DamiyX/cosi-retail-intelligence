import type { DatabaseAdapter } from '../db/adapter';
import {
  findOutboxOperationForEntity,
  getCustomerAccountById,
  getInventoryBalanceByStoreProduct,
  getReceivableBySaleId,
  getSaleById,
  listPaymentsBySaleId,
  listSaleItemsBySaleId,
  listSalesByStore,
  type CustomerAccountRow,
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
  payment: PaymentRow;
  customerAccount: CustomerAccountRow | null;
  receivable: ReceivableRow | null;
  syncStatus: OutboxStatus | null;
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

  return {
    sale,
    items,
    payment,
    customerAccount,
    receivable,
    syncStatus: outbox?.status ?? null,
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
