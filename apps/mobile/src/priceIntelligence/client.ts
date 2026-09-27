import { DomainError, selectPersonalPriceComparison, type PersonalPriceComparisonSelection } from '@retail/domain';

import type { DatabaseAdapter } from '../db/adapter';
import { getStoreById, getStoreProductById, listDevicesByStore, listStores } from '../db/repositories';
import {
  listPurchasePriceHistoryByStore,
  listPurchasePriceHistoryByStoreProduct,
  type PurchasePriceHistoryRow,
} from '../db/repositories/priceObservations';
import { requireId } from '../db/repositories/common';

export interface PersonalPriceComparisonRecord {
  storeProductId: string;
  productVariantId: string;
  historyCount: number;
  latest: PurchasePriceHistoryRow | null;
  previous: PurchasePriceHistoryRow | null;
  comparison: PersonalPriceComparisonSelection;
}

export interface PersonalPriceChangeRow extends PersonalPriceComparisonRecord {
  latest: PurchasePriceHistoryRow;
  previous: PurchasePriceHistoryRow;
  comparison: Extract<PersonalPriceComparisonSelection, { kind: 'comparison' }>;
}

export interface PersonalPriceOverview {
  oneObservationProductCount: number;
  unchangedComparisonCount: number;
}

export interface PersonalPriceClient {
  readonly storeId: string;
  readonly userId: string;
  getProductPriceComparison(storeProductId: string): PersonalPriceComparisonRecord | null;
  getProductPurchasePriceHistory(storeProductId: string): PurchasePriceHistoryRow[] | null;
  listPriceChanges(options?: { includeUnchanged?: boolean }): PersonalPriceChangeRow[];
  getOverview(): PersonalPriceOverview;
}

export interface CreatePersonalPriceClientOptions {
  storeId: string;
  userId: string;
}

function assertActiveOwner(adapter: DatabaseAdapter, storeId: string, userId: string): void {
  const store = getStoreById(adapter, storeId);
  if (!store || store.status !== 'ACTIVE') {
    throw new DomainError('INVALID_VALUE', 'Personal purchase costs are unavailable for this store.');
  }
  const member = adapter.getFirstRow<{ id: string }>(
    `SELECT id FROM store_members
     WHERE store_id = ? AND user_id = ? AND role = 'OWNER' AND status = 'ACTIVE'
     LIMIT 1;`,
    [storeId, userId],
  );
  if (!member) {
    throw new DomainError('INVALID_VALUE', 'Only an active store owner can read personal purchase costs.');
  }
}

function comparisonForRows(
  storeId: string,
  storeProductId: string,
  productVariantId: string,
  rows: readonly PurchasePriceHistoryRow[],
): PersonalPriceComparisonRecord {
  const comparison = selectPersonalPriceComparison({
    storeId,
    productVariantId,
    observations: rows,
  });
  return {
    storeProductId,
    productVariantId,
    historyCount: rows.length,
    latest: comparison.latestId ? rows.find((row) => row.id === comparison.latestId) ?? null : null,
    previous: comparison.kind === 'comparison'
      ? rows.find((row) => row.id === comparison.previousId) ?? null
      : null,
    comparison,
  };
}

function compareTimestampDescending(left: string, right: string): number {
  const leftTime = Date.parse(left);
  const rightTime = Date.parse(right);
  return rightTime - leftTime;
}

function compareChanges(left: PersonalPriceChangeRow, right: PersonalPriceChangeRow): number {
  return compareTimestampDescending(left.latest.observedAt, right.latest.observedAt)
    || compareTimestampDescending(left.latest.createdAt, right.latest.createdAt)
    || (left.latest.id === right.latest.id ? 0 : left.latest.id > right.latest.id ? -1 : 1)
    || (left.storeProductId === right.storeProductId ? 0 : left.storeProductId > right.storeProductId ? -1 : 1);
}

export function createDatabasePersonalPriceClient(
  adapter: DatabaseAdapter,
  options: CreatePersonalPriceClientOptions,
): PersonalPriceClient {
  const storeId = requireId(options.storeId);
  const userId = requireId(options.userId);
  assertActiveOwner(adapter, storeId, userId);

  return {
    storeId,
    userId,
    getProductPriceComparison(storeProductId: string): PersonalPriceComparisonRecord | null {
      assertActiveOwner(adapter, storeId, userId);
      const id = requireId(storeProductId);
      const product = getStoreProductById(adapter, id);
      if (!product || product.storeId !== storeId) return null;
      const rows = listPurchasePriceHistoryByStoreProduct(adapter, storeId, id);
      return comparisonForRows(storeId, id, product.productVariantId, rows);
    },
    getProductPurchasePriceHistory(storeProductId: string): PurchasePriceHistoryRow[] | null {
      assertActiveOwner(adapter, storeId, userId);
      const id = requireId(storeProductId);
      const product = getStoreProductById(adapter, id);
      if (!product || product.storeId !== storeId) return null;
      return listPurchasePriceHistoryByStoreProduct(adapter, storeId, id);
    },
    listPriceChanges(optionsForList: { includeUnchanged?: boolean } = {}): PersonalPriceChangeRow[] {
      assertActiveOwner(adapter, storeId, userId);
      const rowsByProduct = new Map<string, PurchasePriceHistoryRow[]>();
      for (const row of listPurchasePriceHistoryByStore(adapter, storeId)) {
        const rows = rowsByProduct.get(row.storeProductId) ?? [];
        rows.push(row);
        rowsByProduct.set(row.storeProductId, rows);
      }

      const changes: PersonalPriceChangeRow[] = [];
      for (const [storeProductId, rows] of rowsByProduct) {
        const product = getStoreProductById(adapter, storeProductId);
        if (!product || product.storeId !== storeId) continue;
        const result = comparisonForRows(storeId, storeProductId, product.productVariantId, rows);
        if (result.comparison.kind !== 'comparison') continue;
        if (!optionsForList.includeUnchanged && result.comparison.direction === 'UNCHANGED') continue;
        if (!result.latest || !result.previous) continue;
        changes.push({
          ...result,
          latest: result.latest,
          previous: result.previous,
          comparison: result.comparison,
        });
      }
      return changes.sort(compareChanges);
    },
    getOverview(): PersonalPriceOverview {
      assertActiveOwner(adapter, storeId, userId);
      const rowsByProduct = new Map<string, PurchasePriceHistoryRow[]>();
      for (const row of listPurchasePriceHistoryByStore(adapter, storeId)) {
        const rows = rowsByProduct.get(row.storeProductId) ?? [];
        rows.push(row);
        rowsByProduct.set(row.storeProductId, rows);
      }

      let oneObservationProductCount = 0;
      let unchangedComparisonCount = 0;
      for (const [storeProductId, rows] of rowsByProduct) {
        const product = getStoreProductById(adapter, storeProductId);
        if (!product || product.storeId !== storeId) continue;
        const result = comparisonForRows(storeId, storeProductId, product.productVariantId, rows);
        if (result.comparison.kind === 'none' && result.comparison.reason === 'ONE_VALID_OBSERVATION') {
          oneObservationProductCount += 1;
        } else if (result.comparison.kind === 'comparison' && result.comparison.direction === 'UNCHANGED') {
          unchangedComparisonCount += 1;
        }
      }
      return { oneObservationProductCount, unchangedComparisonCount };
    },
  };
}

/** Resolve the local device actor without falling back around an explicit non-owner identity. */
export function createPersonalPriceClientForActiveContext(
  adapter: DatabaseAdapter,
  requestedStoreId?: string,
): PersonalPriceClient | null {
  const store = requestedStoreId
    ? getStoreById(adapter, requireId(requestedStoreId))
    : listStores(adapter).find((candidate) => candidate.status === 'ACTIVE');
  if (!store) return null;
  if (store.status !== 'ACTIVE') return null;
  const device = listDevicesByStore(adapter, store.id).find((candidate) => candidate.status === 'ACTIVE');
  if (!device) return null;
  const userId = device.userId ?? adapter.getFirstRow<{ user_id: string }>(
    `SELECT user_id FROM store_members
     WHERE store_id = ? AND role = 'OWNER' AND status = 'ACTIVE'
     ORDER BY created_at ASC, id ASC
     LIMIT 1;`,
    [store.id],
  )?.user_id;
  if (!userId) return null;
  return createDatabasePersonalPriceClient(adapter, { storeId: store.id, userId });
}
