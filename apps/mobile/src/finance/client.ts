import { assertCurrentActor, resolveCurrentActor, guardClient } from '../storeContext/access';
import { generateMobileId } from '../crypto/mobileIds';
import type { DatabaseAdapter } from '../db/adapter';
import {
  findOutboxOperationForEntity,
  listOwnerWithdrawalsByStore,
  listExpensesByStore,
  type ExpenseCategory,
  type ExpenseRow,
  type OwnerWithdrawalRow,
  type OutboxStatus,
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

export function createDatabaseFinanceClient(
  adapter: DatabaseAdapter,
  options: CreateFinanceClientOptions = {},
): FinanceClient {
  const generateId = options.generateId ?? generateMobileId;
  const context = resolveCurrentActor(adapter, options, true);
  const { store, device, userId } = context;
  return guardClient<FinanceClient>({
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
        actorContext: context,
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
        actorContext: context,
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
  }, () => assertCurrentActor(adapter, context, true));
}
