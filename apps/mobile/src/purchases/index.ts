import type { DatabaseAdapter } from '../db/adapter';
import {
  findOutboxOperationForEntity,
  getCostState,
  getPurchaseById,
  getSupplierById,
  listCostMovementsBySource,
  listInventoryEventsBySource,
  listInventoryBatchGroupsByStoreProduct,
  listPriceObservationsByPurchaseItemId,
  listPurchaseItemsByPurchaseId,
  listPurchasesByStore,
  type CostMovementRow,
  type CostStateRow,
  type InventoryBatchGroupRow,
  type InventoryEventRow,
  type OutboxStatus,
  type PriceObservationRow,
  type PurchaseItemRow,
  type PurchaseRow,
  type PurchaseSummaryRow,
  type SupplierRow,
} from '../db/repositories';

export interface PurchaseDetail {
  purchase: PurchaseRow;
  supplier: SupplierRow | null;
  items: PurchaseItemRow[];
  inventoryEvents: InventoryEventRow[];
  batchGroups: InventoryBatchGroupRow[];
  observations: PriceObservationRow[];
  costMovements: CostMovementRow[];
  costStates: CostStateRow[];
  syncStatus: OutboxStatus | null;
}

export function getPurchaseDetail(
  adapter: DatabaseAdapter,
  purchaseId: string,
  storeId?: string,
): PurchaseDetail | null {
  const purchase = getPurchaseById(adapter, purchaseId);
  if (!purchase || (storeId !== undefined && purchase.storeId !== storeId)) {
    return null;
  }
  const items = listPurchaseItemsByPurchaseId(adapter, purchase.id);
  const inventoryEvents = listInventoryEventsBySource(adapter, 'PURCHASE', purchase.id);
  const batchGroups = items.flatMap((item) => listInventoryBatchGroupsByStoreProduct(adapter, item.storeProductId)
    .filter((group) => group.purchaseItemId === item.id));
  const observations = items.flatMap((item) => listPriceObservationsByPurchaseItemId(adapter, item.id));
  const costMovements = listCostMovementsBySource(adapter, 'PURCHASE', purchase.id);
  const costStates = items
    .map((item) => getCostState(adapter, item.storeProductId))
    .filter((state): state is CostStateRow => state !== null);
  const outbox = findOutboxOperationForEntity(adapter, {
    storeId: purchase.storeId,
    entityType: 'PURCHASE',
    entityId: purchase.id,
    operationType: 'COMPLETED_PURCHASE_CREATED',
  });
  return {
    purchase,
    supplier: purchase.supplierId ? getSupplierById(adapter, purchase.supplierId) : null,
    items,
    inventoryEvents,
    batchGroups,
    observations,
    costMovements,
    costStates,
    syncStatus: outbox?.status ?? null,
  };
}

export function listRecentPurchases(adapter: DatabaseAdapter, storeId: string, limit = 50): PurchaseSummaryRow[] {
  return listPurchasesByStore(adapter, storeId, limit);
}

export { recordPurchase } from './recordPurchase';
export type {
  CompletedPurchaseGraph,
  RecordPurchaseInput,
  RecordPurchaseLineInput,
  RecordPurchaseOptions,
} from './recordPurchase';
