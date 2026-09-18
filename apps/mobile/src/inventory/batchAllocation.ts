import { batchDateSortKey, DomainError, type BatchDateMeaning, type BatchDatePrecision } from '@retail/domain';

import type { DatabaseAdapter } from '../db/adapter';
import {
  createBatchInventoryEntry,
  createBatchInventoryOperation,
  createInventoryBatchGroup,
  getInventoryBatchGroupBalanceBigInt,
  listInventoryBatchGroupsByStoreProduct,
  type BatchInventoryEntryRow,
  type BatchInventoryOperationRow,
  type InventoryBatchGroupRow,
} from '../db/repositories';
import { getInventoryBalanceBigIntByStoreProduct } from '../db/repositories/inventoryEvents';

export interface ReceiptBatchAllocationInput {
  id: string;
  storeId: string;
  storeProductId: string;
  purchaseItemId: string;
  inventoryEventId: string;
  quantityBaseMicros: number;
  priorInventoryBalanceBaseMicros: bigint;
  printedBatchNumber?: string | null;
  datePrecision?: BatchDatePrecision;
  dateValue?: string | null;
  dateMeaning?: BatchDateMeaning;
  recordedByStoreMemberId: string;
  recordedByUserId: string;
  deviceId: string;
  generateId: () => string;
  createdAt: string;
}

export interface SaleBatchAllocationInput {
  operationId: string;
  storeId: string;
  storeProductId: string;
  inventoryEventId: string;
  saleId: string;
  quantityBaseMicros: number;
  recordedByStoreMemberId: string;
  recordedByUserId: string;
  deviceId: string;
  generateId: () => string;
  createdAt: string;
}

export interface BatchAllocationResult {
  group?: InventoryBatchGroupRow;
  operation: BatchInventoryOperationRow;
  entries: BatchInventoryEntryRow[];
}

const BATCH_POLICY_VERSION = 'M5-BATCH-1';
const RECEIPT_POLICY_VERSION = 'RECEIPT_ALLOCATION_V1';
const FEFO_POLICY_VERSION = 'ASSUMED_FEFO_V1';

function safePositiveNumber(value: bigint, field: string): number {
  if (value <= 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new DomainError('INVALID_QUANTITY', `${field} exceeds the safe persisted range.`);
  }
  return Number(value);
}

function assertEntryTotal(entries: readonly BatchInventoryEntryRow[], expected: bigint): void {
  const actual = entries.reduce((total, entry) => total + BigInt(entry.deltaBaseMicros), 0n);
  if (actual !== expected) {
    throw new DomainError('INVALID_QUANTITY', 'Batch allocation entries do not explain the inventory event delta.');
  }
}

export function recordReceiptBatchAllocation(
  adapter: DatabaseAdapter,
  input: ReceiptBatchAllocationInput,
): BatchAllocationResult {
  const quantity = BigInt(input.quantityBaseMicros);
  if (quantity <= 0n || !Number.isSafeInteger(input.quantityBaseMicros)) {
    throw new DomainError('INVALID_QUANTITY', 'Receipt batch quantity must be a positive safe integer.');
  }
  const priorBalance = input.priorInventoryBalanceBaseMicros;
  const offset = priorBalance < 0n && -priorBalance < quantity ? -priorBalance : priorBalance < 0n ? quantity : 0n;
  const remainder = quantity - offset;
  const group = createInventoryBatchGroup(adapter, {
    id: input.id,
    storeId: input.storeId,
    storeProductId: input.storeProductId,
    origin: 'RECEIPT',
    purchaseItemId: input.purchaseItemId,
    quantityReceivedBaseMicros: input.quantityBaseMicros,
    printedBatchNumber: input.printedBatchNumber,
    datePrecision: input.datePrecision,
    dateValue: input.dateValue,
    dateMeaning: input.dateMeaning,
    recordedByStoreMemberId: input.recordedByStoreMemberId,
    recordedByUserId: input.recordedByUserId,
    deviceId: input.deviceId,
    createdAt: input.createdAt,
  });
  const operation = createBatchInventoryOperation(adapter, {
    id: input.generateId(),
    storeId: input.storeId,
    storeProductId: input.storeProductId,
    kind: 'EVENT_ALLOCATION',
    inventoryEventId: input.inventoryEventId,
    sourceType: 'PURCHASE',
    sourceId: input.inventoryEventId,
    policyVersion: RECEIPT_POLICY_VERSION,
    evidenceVersion: BATCH_POLICY_VERSION,
    recordedByStoreMemberId: input.recordedByStoreMemberId,
    recordedByUserId: input.recordedByUserId,
    deviceId: input.deviceId,
    createdAt: input.createdAt,
  });
  const entries: BatchInventoryEntryRow[] = [];
  let entryOrder = 1;
  if (offset > 0n) {
    entries.push(createBatchInventoryEntry(adapter, {
      id: input.generateId(),
      operationId: operation.id,
      storeId: input.storeId,
      storeProductId: input.storeProductId,
      groupId: null,
      entryType: 'DEFICIT_OFFSET',
      deltaBaseMicros: safePositiveNumber(offset, 'Receipt deficit offset'),
      entryOrder: entryOrder++,
      createdAt: input.createdAt,
    }));
  }
  if (remainder > 0n) {
    entries.push(createBatchInventoryEntry(adapter, {
      id: input.generateId(),
      operationId: operation.id,
      storeId: input.storeId,
      storeProductId: input.storeProductId,
      groupId: group.id,
      entryType: 'RECEIPT',
      deltaBaseMicros: safePositiveNumber(remainder, 'Receipt group remainder'),
      entryOrder: entryOrder++,
      createdAt: input.createdAt,
    }));
  }
  assertEntryTotal(entries, quantity);
  return { group, operation, entries };
}

function compareGroupForFefo(left: { group: InventoryBatchGroupRow; balance: bigint }, right: { group: InventoryBatchGroupRow; balance: bigint }): number {
  const leftKey = batchDateSortKey({ precision: left.group.datePrecision, value: left.group.dateValue });
  const rightKey = batchDateSortKey({ precision: right.group.datePrecision, value: right.group.dateValue });
  if (leftKey === null && rightKey !== null) return 1;
  if (leftKey !== null && rightKey === null) return -1;
  if (leftKey !== null && rightKey !== null && leftKey !== rightKey) return leftKey < rightKey ? -1 : 1;
  if (left.group.originOrder !== right.group.originOrder) return left.group.originOrder - right.group.originOrder;
  return left.group.id.localeCompare(right.group.id);
}

export function recordSaleBatchAllocation(
  adapter: DatabaseAdapter,
  input: SaleBatchAllocationInput,
): BatchAllocationResult {
  if (!Number.isSafeInteger(input.quantityBaseMicros) || input.quantityBaseMicros <= 0) {
    throw new DomainError('INVALID_QUANTITY', 'Sale batch quantity must be a positive safe integer.');
  }
  const groups = listInventoryBatchGroupsByStoreProduct(adapter, input.storeProductId)
    .map((group) => ({ group, balance: getInventoryBatchGroupBalanceBigInt(adapter, group.id) }))
    .filter((entry) => entry.balance > 0n)
    .sort(compareGroupForFefo);
  let remaining = BigInt(input.quantityBaseMicros);
  const allocations: { groupId: string | null; entryType: 'ASSUMED_FEFO' | 'UNKNOWN_RESIDUAL'; delta: bigint }[] = [];
  for (const entry of groups) {
    if (remaining <= 0n) break;
    const consumed = entry.balance < remaining ? entry.balance : remaining;
    allocations.push({ groupId: entry.group.id, entryType: 'ASSUMED_FEFO', delta: -consumed });
    remaining -= consumed;
  }
  if (remaining > 0n) {
    allocations.push({ groupId: null, entryType: 'UNKNOWN_RESIDUAL', delta: -remaining });
  }
  const operation = createBatchInventoryOperation(adapter, {
    id: input.operationId,
    storeId: input.storeId,
    storeProductId: input.storeProductId,
    kind: 'EVENT_ALLOCATION',
    inventoryEventId: input.inventoryEventId,
    sourceType: 'SALE',
    sourceId: input.inventoryEventId,
    policyVersion: FEFO_POLICY_VERSION,
    evidenceVersion: BATCH_POLICY_VERSION,
    recordedByStoreMemberId: input.recordedByStoreMemberId,
    recordedByUserId: input.recordedByUserId,
    deviceId: input.deviceId,
    createdAt: input.createdAt,
  });
  const entries = allocations.map((allocation, index) => createBatchInventoryEntry(adapter, {
    id: input.generateId(),
    operationId: operation.id,
    storeId: input.storeId,
    storeProductId: input.storeProductId,
    groupId: allocation.groupId,
    entryType: allocation.entryType,
    deltaBaseMicros: Number(allocation.delta),
    entryOrder: index + 1,
    createdAt: input.createdAt,
  }));
  assertEntryTotal(entries, -BigInt(input.quantityBaseMicros));
  return { operation, entries };
}

export function getBatchProjectionForStoreProduct(adapter: DatabaseAdapter, storeProductId: string): {
  groups: (InventoryBatchGroupRow & { balanceBaseMicros: string })[];
  unknownResidualBaseMicros: string;
  inventoryBalanceBaseMicros: string;
} {
  const groups = listInventoryBatchGroupsByStoreProduct(adapter, storeProductId).map((group) => ({
    ...group,
    balanceBaseMicros: getInventoryBatchGroupBalanceBigInt(adapter, group.id).toString(),
  }));
  const inventoryBalance = getInventoryBalanceBigIntByStoreProduct(adapter, storeProductId);
  const named = groups.reduce((total, group) => total + BigInt(group.balanceBaseMicros), 0n);
  return {
    groups,
    unknownResidualBaseMicros: (inventoryBalance - named).toString(),
    inventoryBalanceBaseMicros: inventoryBalance.toString(),
  };
}
