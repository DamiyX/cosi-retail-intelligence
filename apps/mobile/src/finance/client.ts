import { generateMobileId } from '../crypto/mobileIds';
import type { DatabaseAdapter } from '../db/adapter';
import {
  findOutboxOperationForEntity,
  getDeviceById,
  getStoreById,
  listOwnerWithdrawalsByStore,
  listDevicesByStore,
  listExpensesByStore,
  listStores,
  type DeviceRow,
  type ExpenseCategory,
  type ExpenseRow,
  type OwnerWithdrawalRow,
  type OutboxStatus,
  type StoreRow,
} from '../db/repositories';
import { recordExpense, type RecordedExpenseGraph } from './recordExpense';
import { recordOwnerWithdrawal, type RecordedOwnerWithdrawalGraph } from './recordOwnerWithdrawal';
import { getBusinessSummary, type BusinessSummary } from './businessSummary';

export interface ExpenseHistoryRow extends ExpenseRow {
  syncStatus: OutboxStatus | null;
}

export interface RecordExpenseScreenInput {
  category: ExpenseCategory;
  amountMinor: number;
  note?: string | null;
  occurredAt?: string;
  operationId?: string;
}

export interface OwnerWithdrawalHistoryRow extends OwnerWithdrawalRow {
  syncStatus: OutboxStatus | null;
}

export interface RecordOwnerWithdrawalScreenInput {
  amountMinor: number;
  note?: string | null;
  occurredAt?: string;
  operationId?: string;
}

export interface FinanceClient {
  readonly storeId: string;
  readonly storeName: string;
  readonly storeCurrencyCode: string;
  readonly deviceId: string;
  readonly userId: string;
  recordExpense(input: RecordExpenseScreenInput): RecordedExpenseGraph;
  listExpenses(): ExpenseHistoryRow[];
  recordOwnerWithdrawal(input: RecordOwnerWithdrawalScreenInput): RecordedOwnerWithdrawalGraph;
  listOwnerWithdrawals(): OwnerWithdrawalHistoryRow[];
  getBusinessSummary(localDate?: string, now?: string): BusinessSummary;
}

export interface CreateFinanceClientOptions {
  storeId?: string;
  deviceId?: string;
  userId?: string;
  generateId?: () => string;
}

function resolveOwnerUserId(adapter: DatabaseAdapter, storeId: string, requestedUserId?: string): string {
  if (requestedUserId) {
    const member = adapter.getFirstRow<{ user_id: string; role: string }>(
      `SELECT user_id, role FROM store_members
       WHERE store_id = ? AND user_id = ? AND role = 'OWNER' AND status = 'ACTIVE' LIMIT 1;`,
      [storeId, requestedUserId],
    );
    if (!member) throw new Error('Cannot create FinanceClient: user is not an active store owner.');
    return member.user_id;
  }
  const owner = adapter.getFirstRow<{ user_id: string }>(
    `SELECT user_id FROM store_members
     WHERE store_id = ? AND role = 'OWNER' AND status = 'ACTIVE'
     ORDER BY created_at ASC, id ASC LIMIT 1;`,
    [storeId],
  );
  if (!owner) throw new Error('Cannot create FinanceClient: no active store owner is available.');
  return owner.user_id;
}

function resolveStore(adapter: DatabaseAdapter, options: CreateFinanceClientOptions): StoreRow {
  const store = options.storeId ? getStoreById(adapter, options.storeId) : listStores(adapter)[0];
  if (!store || store.status !== 'ACTIVE') throw new Error('Cannot create FinanceClient: no active store is provisioned.');
  return store;
}

function resolveDevice(adapter: DatabaseAdapter, store: StoreRow, options: CreateFinanceClientOptions): DeviceRow {
  const device = options.deviceId ? getDeviceById(adapter, options.deviceId) : listDevicesByStore(adapter, store.id)[0];
  if (!device || device.storeId !== store.id || device.status !== 'ACTIVE') {
    throw new Error('Cannot create FinanceClient: no active device is provisioned.');
  }
  return device;
}

export function createDatabaseFinanceClient(
  adapter: DatabaseAdapter,
  options: CreateFinanceClientOptions = {},
): FinanceClient {
  const generateId = options.generateId ?? generateMobileId;
  const store = resolveStore(adapter, options);
  const device = resolveDevice(adapter, store, options);
  const userId = resolveOwnerUserId(adapter, store.id, options.userId);
  return {
    storeId: store.id,
    storeName: store.name,
    storeCurrencyCode: store.currencyCode,
    deviceId: device.id,
    userId,
    recordExpense(input: RecordExpenseScreenInput): RecordedExpenseGraph {
      return recordExpense(adapter, {
        storeId: store.id,
        deviceId: device.id,
        userId,
        category: input.category,
        amountMinor: input.amountMinor,
        currencyCode: store.currencyCode,
        note: input.note,
        occurredAt: input.occurredAt,
      }, {
        operationId: input.operationId,
        generateId,
      });
    },
    listExpenses(): ExpenseHistoryRow[] {
      return listExpensesByStore(adapter, store.id).map((expense) => ({
        ...expense,
        syncStatus: findOutboxOperationForEntity(adapter, {
          storeId: store.id,
          entityType: 'EXPENSE',
          entityId: expense.id,
          operationType: 'EXPENSE_CREATED',
        })?.status ?? null,
      }));
    },
    recordOwnerWithdrawal(input: RecordOwnerWithdrawalScreenInput): RecordedOwnerWithdrawalGraph {
      return recordOwnerWithdrawal(adapter, {
        storeId: store.id,
        deviceId: device.id,
        userId,
        amountMinor: input.amountMinor,
        currencyCode: store.currencyCode,
        note: input.note,
        occurredAt: input.occurredAt,
      }, {
        operationId: input.operationId,
        generateId,
      });
    },
    listOwnerWithdrawals(): OwnerWithdrawalHistoryRow[] {
      return listOwnerWithdrawalsByStore(adapter, store.id).map((withdrawal) => ({
        ...withdrawal,
        syncStatus: findOutboxOperationForEntity(adapter, {
          storeId: store.id,
          entityType: 'OWNER_WITHDRAWAL',
          entityId: withdrawal.id,
          operationType: 'OWNER_WITHDRAWAL_CREATED',
        })?.status ?? null,
      }));
    },
    getBusinessSummary(localDate?: string, now?: string): BusinessSummary {
      return getBusinessSummary(adapter, {
        storeId: store.id,
        deviceId: device.id,
        userId,
        localDate,
        now,
      });
    },
  };
}
