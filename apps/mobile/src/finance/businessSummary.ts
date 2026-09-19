import { DomainError } from '@retail/domain';

import type { DatabaseAdapter } from '../db/adapter';
import {
  getDeviceById,
  getStoreById,
  listCompletedSalesByStoreInRange,
  listExpensesByStoreInRange,
  listOwnerWithdrawalsByStoreInRange,
  listSaleItemCostSnapshotsBySaleId,
  listSaleItemsBySaleId,
  type SaleRangeRow,
  type StoreRow,
} from '../db/repositories';
import { sumSafeIntegers } from '../db/repositories/common';

export interface BusinessSummaryInput {
  storeId: string;
  deviceId: string;
  userId: string;
  /** Store-local calendar date. Defaults to the date containing now. */
  localDate?: string;
  now?: string;
}

export interface BusinessSummaryRange {
  localDate: string;
  startUtc: string;
  endUtc: string;
}

export interface PopularProductSummary {
  storeProductId: string;
  productName: string;
  saleCount: number;
}

export interface BusinessSummary {
  currencyCode: string;
  range: BusinessSummaryRange;
  salesValueMinor: number;
  transactionCount: number;
  recordedExpensesMinor: number;
  ownerWithdrawalsMinor: number;
  costCoverage: 'NONE' | 'PARTIAL' | 'FULL';
  coveredSaleCount: number;
  coveredSalesValueMinor: number;
  unavailableSaleCount: number;
  unavailableSalesValueMinor: number;
  trackedCogsMinor: number | null;
  trackedGrossMarginMinor: number | null;
  trackedGrossMarginAfterRecordedExpensesMinor: number | null;
  popularProduct: PopularProductSummary | null;
}

interface LocalDateParts {
  year: number;
  month: number;
  day: number;
  date: string;
  hour: number;
  minute: number;
  second: number;
}

function calendarDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new DomainError('INVALID_VALUE', 'Summary date must use YYYY-MM-DD.');
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (
    date.getUTCFullYear() !== Number(match[1]) ||
    date.getUTCMonth() !== Number(match[2]) - 1 ||
    date.getUTCDate() !== Number(match[3])
  ) {
    throw new DomainError('INVALID_VALUE', 'Summary date is not valid.');
  }
  return date;
}

function addCalendarDays(value: string, days: number): string {
  const date = calendarDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function localParts(instant: Date, timeZone: string): LocalDateParts {
  if (Number.isNaN(instant.getTime())) throw new DomainError('INVALID_VALUE', 'Summary time is invalid.');
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(instant).reduce<Record<string, string>>((result, part) => {
      if (part.type !== 'literal') result[part.type] = part.value;
      return result;
    }, {});
    const year = Number(parts.year);
    const month = Number(parts.month);
    const day = Number(parts.day);
    const hour = Number(parts.hour);
    const minute = Number(parts.minute);
    const second = Number(parts.second);
    const date = `${parts.year}-${parts.month}-${parts.day}`;
    if (![year, month, day, hour, minute, second].every(Number.isSafeInteger) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error('invalid local time parts');
    }
    return { year, month, day, date, hour, minute, second };
  } catch {
    throw new DomainError('INVALID_VALUE', 'Store timezone is invalid for business summaries.');
  }
}

/** Convert a store-local midnight to the corresponding UTC instant. */
function localDateStartUtc(localDate: string, timeZone: string): string {
  const date = calendarDate(localDate);
  const desiredMillis = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  let candidateMillis = desiredMillis;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const observed = localParts(new Date(candidateMillis), timeZone);
    const observedMillis = Date.UTC(observed.year, observed.month - 1, observed.day, observed.hour, observed.minute, observed.second);
    const delta = desiredMillis - observedMillis;
    if (delta === 0) return new Date(candidateMillis).toISOString();
    candidateMillis += delta;
  }
  const resolved = new Date(candidateMillis);
  if (localParts(resolved, timeZone).date !== localDate) {
    throw new DomainError('INVALID_VALUE', 'Store-local summary day could not be resolved safely.');
  }
  return resolved.toISOString();
}

function resolveRange(store: StoreRow, input: BusinessSummaryInput): BusinessSummaryRange {
  const now = input.now === undefined ? new Date() : new Date(input.now);
  if (Number.isNaN(now.getTime())) throw new DomainError('INVALID_VALUE', 'Summary now time is invalid.');
  const localDate = input.localDate ?? localParts(now, store.timezone).date;
  calendarDate(localDate);
  const startUtc = localDateStartUtc(localDate, store.timezone);
  const endUtc = localDateStartUtc(addCalendarDays(localDate, 1), store.timezone);
  if (startUtc >= endUtc) throw new DomainError('INVALID_VALUE', 'Summary day range is invalid.');
  return { localDate, startUtc, endUtc };
}

function assertReadableActor(adapter: DatabaseAdapter, input: BusinessSummaryInput): StoreRow {
  const store = getStoreById(adapter, input.storeId);
  if (!store || store.status !== 'ACTIVE') throw new DomainError('INVALID_VALUE', 'Store does not exist or is not active.');
  const device = getDeviceById(adapter, input.deviceId);
  if (!device || device.storeId !== store.id || device.status !== 'ACTIVE') {
    throw new DomainError('INVALID_VALUE', 'Device does not belong to this store or is not active.');
  }
  const member = adapter.getFirstRow<{ id: string }>(
    `SELECT id FROM store_members
     WHERE store_id = ? AND user_id = ? AND role = 'OWNER' AND status = 'ACTIVE'
     LIMIT 1;`,
    [store.id, input.userId],
  );
  if (!member) throw new DomainError('INVALID_VALUE', 'Only an active store owner can read this financial summary.');
  return store;
}

function sumAmounts(values: readonly number[], field: string): number {
  return sumSafeIntegers(values, field, 'INVALID_MONEY');
}

interface ProductCounter {
  storeProductId: string;
  productName: string;
  saleCount: number;
  firstSaleOrder: number;
}

function findPopularProduct(adapter: DatabaseAdapter, sales: readonly SaleRangeRow[]): PopularProductSummary | null {
  const counters = new Map<string, ProductCounter>();
  for (const sale of sales) {
    const seenInSale = new Set<string>();
    for (const item of listSaleItemsBySaleId(adapter, sale.id)) {
      if (seenInSale.has(item.storeProductId)) continue;
      seenInSale.add(item.storeProductId);
      const existing = counters.get(item.storeProductId);
      if (existing) {
        existing.saleCount += 1;
      } else {
        counters.set(item.storeProductId, {
          storeProductId: item.storeProductId,
          productName: item.productNameSnapshot,
          saleCount: 1,
          firstSaleOrder: sale.applicationOrder,
        });
      }
    }
  }
  const ordered = [...counters.values()].sort((left, right) =>
    right.saleCount - left.saleCount ||
    left.firstSaleOrder - right.firstSaleOrder ||
    left.storeProductId.localeCompare(right.storeProductId),
  );
  const popular = ordered[0];
  return popular ? {
    storeProductId: popular.storeProductId,
    productName: popular.productName,
    saleCount: popular.saleCount,
  } : null;
}

/** Read the store-local daily operating summary without cash/profit claims. */
export function getBusinessSummary(adapter: DatabaseAdapter, input: BusinessSummaryInput): BusinessSummary {
  const store = assertReadableActor(adapter, input);
  const range = resolveRange(store, input);
  const sales = listCompletedSalesByStoreInRange(adapter, store.id, range.startUtc, range.endUtc);
  const expenses = listExpensesByStoreInRange(adapter, store.id, range.startUtc, range.endUtc);
  const withdrawals = listOwnerWithdrawalsByStoreInRange(adapter, store.id, range.startUtc, range.endUtc);

  const salesValueMinor = sumAmounts(sales.map((sale) => sale.totalMinor), 'Summary sales value');
  const recordedExpensesMinor = sumAmounts(expenses.map((expense) => expense.amountMinor), 'Summary recorded expenses');
  const ownerWithdrawalsMinor = sumAmounts(withdrawals.map((withdrawal) => withdrawal.amountMinor), 'Summary owner withdrawals');

  let coveredSaleCount = 0;
  let coveredSalesValueMinor = 0;
  let unavailableSaleCount = 0;
  let unavailableSalesValueMinor = 0;
  const coveredCogs: number[] = [];
  for (const sale of sales) {
    const items = listSaleItemsBySaleId(adapter, sale.id);
    const snapshots = listSaleItemCostSnapshotsBySaleId(adapter, sale.id);
    const snapshotsByItem = new Map(snapshots.map((snapshot) => [snapshot.saleItemId, snapshot]));
    const saleCovered = items.length > 0 && items.every((item) => {
      const snapshot = snapshotsByItem.get(item.id);
      return snapshot?.coverageStatus === 'AVAILABLE' && snapshot.cogsAmountMinor !== null;
    });
    if (saleCovered) {
      coveredSaleCount += 1;
      coveredSalesValueMinor = sumAmounts([coveredSalesValueMinor, sale.totalMinor], 'Summary covered sales value');
      for (const item of items) {
        const cogsAmountMinor = snapshotsByItem.get(item.id)?.cogsAmountMinor;
        if (cogsAmountMinor === null || cogsAmountMinor === undefined) {
          throw new Error('Covered sale cost snapshot is missing its exact minor-unit COGS amount.');
        }
        coveredCogs.push(cogsAmountMinor);
      }
    } else {
      unavailableSaleCount += 1;
      unavailableSalesValueMinor = sumAmounts([unavailableSalesValueMinor, sale.totalMinor], 'Summary unavailable sales value');
    }
  }

  const trackedCogsMinor = coveredSaleCount > 0 ? sumAmounts(coveredCogs, 'Summary tracked COGS') : null;
  const trackedGrossMarginMinor = trackedCogsMinor === null
    ? null
    : sumAmounts([coveredSalesValueMinor, -trackedCogsMinor], 'Summary tracked gross margin');
  const allSalesCovered = sales.length > 0 && unavailableSaleCount === 0;
  const trackedGrossMarginAfterRecordedExpensesMinor = allSalesCovered && trackedGrossMarginMinor !== null
    ? sumAmounts([trackedGrossMarginMinor, -recordedExpensesMinor], 'Summary tracked gross margin after recorded expenses')
    : null;
  const costCoverage: BusinessSummary['costCoverage'] = coveredSaleCount === 0
    ? 'NONE'
    : unavailableSaleCount === 0
      ? 'FULL'
      : 'PARTIAL';

  return {
    currencyCode: store.currencyCode,
    range,
    salesValueMinor,
    transactionCount: sales.length,
    recordedExpensesMinor,
    ownerWithdrawalsMinor,
    costCoverage,
    coveredSaleCount,
    coveredSalesValueMinor,
    unavailableSaleCount,
    unavailableSalesValueMinor,
    trackedCogsMinor,
    trackedGrossMarginMinor,
    trackedGrossMarginAfterRecordedExpensesMinor,
    popularProduct: findPopularProduct(adapter, sales),
  };
}
