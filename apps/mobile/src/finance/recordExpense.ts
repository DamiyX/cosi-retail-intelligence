import { captureCommandActor, type CommandActorOptions, assertCurrentActor } from '../storeContext/access';
import { DomainError } from '@retail/domain';

import { generateMobileId } from '../crypto/mobileIds';
import type { DatabaseAdapter } from '../db/adapter';
import {
  createExpense,
  enqueueOutboxOperation,
  findExpectedOutboxReplay,
  getDeviceById,
  getExpenseById,
  getStoreById,
  EXPENSE_CATEGORIES,
  type ExpenseCategory,
  type ExpenseRow,
  type OutboxOperationRow,
} from '../db/repositories';
import { nowIso, optionalText, requireId } from '../db/repositories/common';

export interface RecordExpenseInput {
  storeId: string;
  deviceId: string;
  userId: string;
  category: ExpenseCategory;
  amountMinor: number;
  currencyCode: string;
  note?: string | null;
  occurredAt?: string;
}

export interface RecordExpenseOptions extends CommandActorOptions {
  operationId?: string;
  generateId?: () => string;
}

export interface RecordedExpenseGraph {
  expense: ExpenseRow;
  outbox: OutboxOperationRow;
}

interface ExpenseRequestFingerprint {
  category: ExpenseCategory;
  amountMinor: number;
  currencyCode: string;
  note: string | null;
  occurredAt?: string;
}

interface NormalizedExpenseInput extends RecordExpenseInput {
  storeId: string;
  deviceId: string;
  userId: string;
  category: ExpenseCategory;
  currencyCode: string;
  note: string | null;
  occurredAt?: string;
}

function normalizeOccurredAt(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.trim().length === 0 || !Number.isFinite(Date.parse(value))) {
    throw new DomainError('INVALID_VALUE', 'Expense occurred-at time must be a valid date and time.');
  }
  return new Date(value).toISOString();
}

function normalizeInput(input: RecordExpenseInput): NormalizedExpenseInput {
  const category = input.category;
  if (typeof category !== 'string' || !EXPENSE_CATEGORIES.includes(category as ExpenseCategory)) {
    throw new DomainError('INVALID_VALUE', 'Expense category is not supported.');
  }
  if (typeof input.amountMinor !== 'number' || !Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw new DomainError('INVALID_MONEY', 'Expense amount must be a positive safe integer in minor units.');
  }
  if (typeof input.currencyCode !== 'string' || !/^[A-Z]{3}$/.test(input.currencyCode)) {
    throw new DomainError('CURRENCY_MISMATCH', 'Expense currency must be a 3-letter uppercase code.');
  }
  return {
    ...input,
    storeId: requireId(input.storeId),
    deviceId: requireId(input.deviceId),
    userId: requireId(input.userId),
    category,
    note: optionalText(input.note, 'Expense note'),
    occurredAt: normalizeOccurredAt(input.occurredAt),
  };
}

function assertOwner(adapter: DatabaseAdapter, input: NormalizedExpenseInput): string {
  assertCurrentActor(adapter, input, true);

  const store = getStoreById(adapter, input.storeId);
  if (!store || store.status !== 'ACTIVE') {
    throw new DomainError('INVALID_VALUE', 'Store does not exist or is not active.');
  }
  const device = getDeviceById(adapter, input.deviceId);
  if (!device || device.storeId !== input.storeId || device.status !== 'ACTIVE') {
    throw new DomainError('INVALID_VALUE', 'Device does not belong to this store or is not active.');
  }
  const member = adapter.getFirstRow<{ id: string; role: string }>(
    `SELECT id, role FROM store_members
     WHERE store_id = ? AND user_id = ? AND status = 'ACTIVE' LIMIT 1;`,
    [input.storeId, input.userId],
  );
  if (!member || member.role !== 'OWNER') {
    throw new DomainError('INVALID_VALUE', 'Only an active store owner can record an expense.');
  }
  if (store.currencyCode !== input.currencyCode) {
    throw new DomainError('CURRENCY_MISMATCH', 'Expense currency must match the store currency.');
  }
  return member.id;
}

function requestForWrite(input: NormalizedExpenseInput, occurredAt: string): ExpenseRequestFingerprint {
  return {
    category: input.category,
    amountMinor: input.amountMinor,
    currencyCode: input.currencyCode,
    note: input.note,
    occurredAt,
  };
}

function assertReplayMatchesRequest(
  outbox: OutboxOperationRow,
  input: NormalizedExpenseInput,
): void {
  let storedRequest: ExpenseRequestFingerprint | undefined;
  try {
    storedRequest = (JSON.parse(outbox.payload) as { entities?: { request?: ExpenseRequestFingerprint } }).entities?.request;
  } catch {
    throw new Error('Stored expense replay envelope is not readable.');
  }
  if (!storedRequest ||
      storedRequest.category !== input.category ||
      storedRequest.amountMinor !== input.amountMinor ||
      storedRequest.currencyCode !== input.currencyCode ||
      storedRequest.note !== input.note ||
      (input.occurredAt !== undefined && storedRequest.occurredAt !== input.occurredAt)) {
    throw new DomainError('INVALID_VALUE', 'This operation ID already belongs to a different expense request.');
  }
}

function rehydrateReplay(
  adapter: DatabaseAdapter,
  outbox: OutboxOperationRow,
  input: NormalizedExpenseInput,
): RecordedExpenseGraph {
  assertReplayMatchesRequest(outbox, input);
  const expense = getExpenseById(adapter, outbox.entityId);
  if (!expense) throw new Error('Expense replay references a missing expense.');
  if (expense.storeId !== input.storeId || expense.deviceId !== input.deviceId || expense.createdByUserId !== input.userId) {
    throw new Error('Expense replay does not match its original ownership.');
  }
  return { expense, outbox };
}

/** Record one immutable owner expense and its canonical local outbox envelope atomically. */
export function recordExpense(
  adapter: DatabaseAdapter,
  rawInput: RecordExpenseInput,
  options: RecordExpenseOptions = {},
): RecordedExpenseGraph {
  const input = normalizeInput(rawInput);
  const operationId = options.operationId === undefined ? (options.generateId ?? generateMobileId)() : requireId(options.operationId);
  const actor = captureCommandActor(adapter, input, options.actorContext, true);
  assertOwner(adapter, input);
  const replayed = findExpectedOutboxReplay(adapter, {
    operationId,
    storeId: input.storeId,
    deviceId: input.deviceId,
    operationType: 'EXPENSE_CREATED',
    entityType: 'EXPENSE',
  });
  if (replayed) return rehydrateReplay(adapter, replayed, input);

  return adapter.transaction(() => {
    assertCurrentActor(adapter, actor, true);
    const memberId = assertOwner(adapter, input);
    const occurredAt = input.occurredAt ?? nowIso();
    const createdAt = nowIso();
    const request = requestForWrite(input, occurredAt);
    const expense = createExpense(adapter, {
      id: (options.generateId ?? generateMobileId)(),
      storeId: input.storeId,
      category: input.category,
      amountMinor: input.amountMinor,
      currencyCode: input.currencyCode,
      note: input.note,
      occurredAt,
      createdByStoreMemberId: memberId,
      createdByUserId: input.userId,
      deviceId: input.deviceId,
      createdAt,
    });
    const outbox = enqueueOutboxOperation(adapter, {
      operationType: 'EXPENSE_CREATED',
      operationId,
      storeId: input.storeId,
      deviceId: input.deviceId,
      entityType: 'EXPENSE',
      entityId: expense.id,
      occurredAt,
      createdAt,
      entities: { expenseVersion: 1, request, expense },
    });
    return { expense, outbox };
  });
}
