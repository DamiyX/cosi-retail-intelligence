import { captureCommandActor, type CommandActorOptions, assertCurrentActor } from '../storeContext/access';
import { DomainError } from '@retail/domain';

import { generateMobileId } from '../crypto/mobileIds';
import type { DatabaseAdapter } from '../db/adapter';
import {
  createOwnerWithdrawal,
  enqueueOutboxOperation,
  findExpectedOutboxReplay,
  getDeviceById,
  getOwnerWithdrawalById,
  getStoreById,
  type OwnerWithdrawalRow,
  type OutboxOperationRow,
} from '../db/repositories';
import { nowIso, optionalText, requireId } from '../db/repositories/common';

export interface RecordOwnerWithdrawalInput {
  storeId: string;
  deviceId: string;
  userId: string;
  amountMinor: number;
  currencyCode: string;
  note?: string | null;
  occurredAt?: string;
}

export interface RecordOwnerWithdrawalOptions extends CommandActorOptions {
  operationId?: string;
  generateId?: () => string;
}

export interface RecordedOwnerWithdrawalGraph {
  withdrawal: OwnerWithdrawalRow;
  outbox: OutboxOperationRow;
}

interface WithdrawalRequestFingerprint {
  amountMinor: number;
  currencyCode: string;
  note: string | null;
  occurredAt?: string;
}

interface NormalizedWithdrawalInput extends RecordOwnerWithdrawalInput {
  storeId: string;
  deviceId: string;
  userId: string;
  currencyCode: string;
  note: string | null;
  occurredAt?: string;
}

function normalizeOccurredAt(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.trim().length === 0 || !Number.isFinite(Date.parse(value))) {
    throw new DomainError('INVALID_VALUE', 'Owner withdrawal occurred-at time must be a valid date and time.');
  }
  return new Date(value).toISOString();
}

function normalizeInput(input: RecordOwnerWithdrawalInput): NormalizedWithdrawalInput {
  if (typeof input.amountMinor !== 'number' || !Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw new DomainError('INVALID_MONEY', 'Owner withdrawal amount must be a positive safe integer in minor units.');
  }
  if (typeof input.currencyCode !== 'string' || !/^[A-Z]{3}$/.test(input.currencyCode)) {
    throw new DomainError('CURRENCY_MISMATCH', 'Owner withdrawal currency must be a 3-letter uppercase code.');
  }
  return {
    ...input,
    storeId: requireId(input.storeId),
    deviceId: requireId(input.deviceId),
    userId: requireId(input.userId),
    note: optionalText(input.note, 'Owner withdrawal note'),
    occurredAt: normalizeOccurredAt(input.occurredAt),
  };
}

function assertOwner(adapter: DatabaseAdapter, input: NormalizedWithdrawalInput): string {
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
    throw new DomainError('INVALID_VALUE', 'Only an active store owner can record a withdrawal.');
  }
  if (store.currencyCode !== input.currencyCode) {
    throw new DomainError('CURRENCY_MISMATCH', 'Owner withdrawal currency must match the store currency.');
  }
  return member.id;
}

function requestForWrite(input: NormalizedWithdrawalInput, occurredAt: string): WithdrawalRequestFingerprint {
  return {
    amountMinor: input.amountMinor,
    currencyCode: input.currencyCode,
    note: input.note,
    occurredAt,
  };
}

function assertReplayMatchesRequest(
  outbox: OutboxOperationRow,
  input: NormalizedWithdrawalInput,
): void {
  let storedRequest: WithdrawalRequestFingerprint | undefined;
  try {
    storedRequest = (JSON.parse(outbox.payload) as { entities?: { request?: WithdrawalRequestFingerprint } }).entities?.request;
  } catch {
    throw new Error('Stored owner withdrawal replay envelope is not readable.');
  }
  if (!storedRequest ||
      storedRequest.amountMinor !== input.amountMinor ||
      storedRequest.currencyCode !== input.currencyCode ||
      storedRequest.note !== input.note ||
      (input.occurredAt !== undefined && storedRequest.occurredAt !== input.occurredAt)) {
    throw new DomainError('INVALID_VALUE', 'This operation ID already belongs to a different owner withdrawal request.');
  }
}

function rehydrateReplay(
  adapter: DatabaseAdapter,
  outbox: OutboxOperationRow,
  input: NormalizedWithdrawalInput,
): RecordedOwnerWithdrawalGraph {
  assertReplayMatchesRequest(outbox, input);
  const withdrawal = getOwnerWithdrawalById(adapter, outbox.entityId);
  if (!withdrawal) throw new Error('Owner withdrawal replay references a missing withdrawal.');
  if (withdrawal.storeId !== input.storeId || withdrawal.deviceId !== input.deviceId || withdrawal.createdByUserId !== input.userId) {
    throw new Error('Owner withdrawal replay does not match its original ownership.');
  }
  return { withdrawal, outbox };
}

/** Record one immutable owner withdrawal and its canonical local outbox envelope atomically. */
export function recordOwnerWithdrawal(
  adapter: DatabaseAdapter,
  rawInput: RecordOwnerWithdrawalInput,
  options: RecordOwnerWithdrawalOptions = {},
): RecordedOwnerWithdrawalGraph {
  const input = normalizeInput(rawInput);
  const operationId = options.operationId === undefined ? (options.generateId ?? generateMobileId)() : requireId(options.operationId);
  const actor = captureCommandActor(adapter, input, options.actorContext, true);
  assertOwner(adapter, input);
  const replayed = findExpectedOutboxReplay(adapter, {
    operationId,
    storeId: input.storeId,
    deviceId: input.deviceId,
    operationType: 'OWNER_WITHDRAWAL_CREATED',
    entityType: 'OWNER_WITHDRAWAL',
  });
  if (replayed) return rehydrateReplay(adapter, replayed, input);

  return adapter.transaction(() => {
    assertCurrentActor(adapter, actor, true);
    const memberId = assertOwner(adapter, input);
    const occurredAt = input.occurredAt ?? nowIso();
    const createdAt = nowIso();
    const request = requestForWrite(input, occurredAt);
    const withdrawal = createOwnerWithdrawal(adapter, {
      id: (options.generateId ?? generateMobileId)(),
      storeId: input.storeId,
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
      operationType: 'OWNER_WITHDRAWAL_CREATED',
      operationId,
      storeId: input.storeId,
      deviceId: input.deviceId,
      entityType: 'OWNER_WITHDRAWAL',
      entityId: withdrawal.id,
      occurredAt,
      createdAt,
      entities: { ownerWithdrawalVersion: 1, request, withdrawal },
    });
    return { withdrawal, outbox };
  });
}
