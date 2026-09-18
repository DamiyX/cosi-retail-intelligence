import {
  DomainError,
  normalizeBatchDate,
  type BatchDateMeaning,
  type BatchDatePrecision,
} from '@retail/domain';

import { generateMobileId } from '../crypto/mobileIds';
import type { DatabaseAdapter } from '../db/adapter';
import {
  createBatchInventoryEntry,
  createBatchInventoryOperation,
  createInventoryBatchGroup,
  enqueueOutboxOperation,
  findExpectedOutboxReplay,
  getBatchInventoryOperationById,
  getBatchInventoryWatermark,
  getInventoryBatchGroupBalanceBigInt,
  getInventoryLedgerWatermark,
  getStoreById,
  getStoreProductById,
  getDeviceById,
  getUnknownBatchResidualBigInt,
  listBatchInventoryEntriesByOperation,
  listInventoryBatchGroupsByStoreProduct,
  type BatchInventoryEntryRow,
  type BatchInventoryOperationRow,
  type InventoryBatchGroupRow,
  type OutboxOperationRow,
} from '../db/repositories';
import { nowIso, requireId } from '../db/repositories/common';

export interface BatchClassificationLineInput {
  quantityBaseMicros: number;
  datePrecision?: BatchDatePrecision;
  dateValue?: string | null;
  dateMeaning?: BatchDateMeaning;
  printedBatchNumber?: string | null;
}

export interface ClassifyBatchInput {
  operationId: string;
  storeId: string;
  deviceId: string;
  userId: string;
  storeProductId: string;
  expectedInventoryWatermark: string;
  expectedBatchWatermark: string;
  mode?: BatchClassificationMode;
  groups: BatchClassificationLineInput[];
}

export type BatchClassificationMode = 'UNKNOWN' | 'CORRECTION';

export interface BatchClassificationGraph {
  operation: BatchInventoryOperationRow;
  groups: InventoryBatchGroupRow[];
  entries: BatchInventoryEntryRow[];
  outbox: OutboxOperationRow;
}

interface NormalizedClassificationLine {
  quantityBaseMicros: number;
  datePrecision: BatchDatePrecision;
  dateValue: string | null;
  dateMeaning: BatchDateMeaning;
  printedBatchNumber: string | null;
}

interface ClassificationRequestFingerprint {
  storeProductId: string;
  expectedInventoryWatermark: string;
  expectedBatchWatermark: string;
  mode: BatchClassificationMode;
  groups: NormalizedClassificationLine[];
}

function normalizeInput(input: ClassifyBatchInput): {
  operationId: string;
  storeId: string;
  deviceId: string;
  userId: string;
  storeProductId: string;
  expectedInventoryWatermark: string;
  expectedBatchWatermark: string;
  mode: BatchClassificationMode;
  groups: NormalizedClassificationLine[];
} {
  if (input.mode !== undefined && input.mode !== 'UNKNOWN' && input.mode !== 'CORRECTION') {
    throw new DomainError('INVALID_VALUE', 'Batch classification mode is invalid.');
  }
  const groups = input.groups.map((group) => {
    if (!Number.isSafeInteger(group.quantityBaseMicros) || group.quantityBaseMicros <= 0) {
      throw new DomainError('INVALID_QUANTITY', 'Classification quantities must be positive safe integers.');
    }
    const date = normalizeBatchDate({
      precision: group.datePrecision,
      value: group.dateValue,
      meaning: group.dateMeaning,
      printedBatchNumber: group.printedBatchNumber,
    });
    return {
      quantityBaseMicros: group.quantityBaseMicros,
      datePrecision: date.precision,
      dateValue: date.value,
      dateMeaning: date.meaning,
      printedBatchNumber: date.printedBatchNumber,
    };
  });
  if (groups.length === 0 || groups.length > 50) {
    throw new DomainError('INVALID_VALUE', 'Add between one and fifty inspected groups.');
  }
  return {
    operationId: requireId(input.operationId),
    storeId: requireId(input.storeId),
    deviceId: requireId(input.deviceId),
    userId: requireId(input.userId),
    storeProductId: requireId(input.storeProductId),
    expectedInventoryWatermark: input.expectedInventoryWatermark,
    expectedBatchWatermark: input.expectedBatchWatermark,
    mode: input.mode ?? 'UNKNOWN',
    groups,
  };
}

function fingerprint(input: ReturnType<typeof normalizeInput>): ClassificationRequestFingerprint {
  return {
    storeProductId: input.storeProductId,
    expectedInventoryWatermark: input.expectedInventoryWatermark,
    expectedBatchWatermark: input.expectedBatchWatermark,
    mode: input.mode,
    groups: input.groups,
  };
}

function replayGraph(adapter: DatabaseAdapter, outbox: OutboxOperationRow, request: ClassificationRequestFingerprint): BatchClassificationGraph {
  let entities: { request?: ClassificationRequestFingerprint; operation?: { id?: string }; groups?: { id?: string }[] };
  try {
    entities = (JSON.parse(outbox.payload) as { entities?: typeof entities }).entities ?? {};
  } catch {
    throw new Error('Stored batch classification replay envelope is not readable.');
  }
  if (JSON.stringify(entities.request) !== JSON.stringify(request)) {
    throw new DomainError('INVALID_VALUE', 'This operation ID already belongs to a different batch classification.');
  }
  const operationId = entities.operation?.id ?? outbox.entityId;
  const operation = getBatchInventoryOperationById(adapter, operationId);
  if (!operation) throw new Error('Batch classification replay references a missing operation.');
  const groups = (entities.groups ?? []).flatMap((row) => {
    if (!row.id) return [];
    const group = adapter.getFirstRow<Record<string, string | number | null>>(
      `SELECT id, store_id, store_product_id, origin, purchase_item_id, quantity_received_base_micros,
              printed_batch_number, date_precision, date_value, date_meaning, evidence_source,
              recorded_by_store_member_id, recorded_by_user_id, device_id, origin_order, created_at
       FROM inventory_batch_groups WHERE id = ?;`,
      [row.id],
    );
    if (!group) return [];
    return [{
      id: group.id as string,
      storeId: group.store_id as string,
      storeProductId: group.store_product_id as string,
      origin: group.origin as InventoryBatchGroupRow['origin'],
      purchaseItemId: group.purchase_item_id as string | null,
      quantityReceivedBaseMicros: group.quantity_received_base_micros as number | null,
      printedBatchNumber: group.printed_batch_number as string | null,
      datePrecision: group.date_precision as BatchDatePrecision,
      dateValue: group.date_value as string | null,
      dateMeaning: group.date_meaning as BatchDateMeaning,
      evidenceSource: group.evidence_source as InventoryBatchGroupRow['evidenceSource'],
      recordedByStoreMemberId: group.recorded_by_store_member_id as string,
      recordedByUserId: group.recorded_by_user_id as string,
      deviceId: group.device_id as string,
      originOrder: group.origin_order as number,
      createdAt: group.created_at as string,
    }];
  });
  return { operation, groups, entries: listBatchInventoryEntriesByOperation(adapter, operation.id), outbox };
}

function assertOwner(adapter: DatabaseAdapter, input: ReturnType<typeof normalizeInput>): { memberId: string } {
  const store = getStoreById(adapter, input.storeId);
  if (!store || store.status !== 'ACTIVE') throw new DomainError('INVALID_VALUE', 'Store does not exist or is not active.');
  const device = getDeviceById(adapter, input.deviceId);
  if (!device || device.storeId !== input.storeId || device.status !== 'ACTIVE') {
    throw new DomainError('INVALID_VALUE', 'Device does not belong to this store or is not active.');
  }
  const member = adapter.getFirstRow<{ id: string; role: string }>(
    `SELECT id, role FROM store_members WHERE store_id = ? AND user_id = ? AND status = 'ACTIVE' LIMIT 1;`,
    [input.storeId, input.userId],
  );
  if (!member || member.role !== 'OWNER') {
    throw new DomainError('INVALID_VALUE', 'Only an active store owner can classify inventory batches.');
  }
  const product = getStoreProductById(adapter, input.storeProductId);
  if (!product || product.storeId !== input.storeId || product.status !== 'ACTIVE') {
    throw new DomainError('INVALID_VALUE', 'Product does not belong to this store or is not active.');
  }
  return { memberId: member.id };
}

function appendSignedEntries(
  adapter: DatabaseAdapter,
  entries: BatchInventoryEntryRow[],
  input: {
    operationId: string;
    storeId: string;
    storeProductId: string;
    groupId: string | null;
    entryType: BatchInventoryEntryRow['entryType'];
    deltaBaseMicros: bigint;
    generateId: () => string;
    createdAt: string;
  },
): void {
  const maxSafe = BigInt(Number.MAX_SAFE_INTEGER);
  let remaining = input.deltaBaseMicros;
  while (remaining !== 0n) {
    const chunk = remaining > maxSafe ? maxSafe : remaining < -maxSafe ? -maxSafe : remaining;
    entries.push(createBatchInventoryEntry(adapter, {
      id: input.generateId(),
      operationId: input.operationId,
      storeId: input.storeId,
      storeProductId: input.storeProductId,
      groupId: input.groupId,
      entryType: input.entryType,
      deltaBaseMicros: Number(chunk),
      entryOrder: entries.length + 1,
      createdAt: input.createdAt,
    }));
    remaining -= chunk;
  }
}

/** Classify unknown stock or replace the named breakdown without changing product stock or cost. */
export function classifyInventoryBatches(
  adapter: DatabaseAdapter,
  input: ClassifyBatchInput,
  options: { generateId?: () => string } = {},
): BatchClassificationGraph {
  const request = normalizeInput(input);
  const replayed = findExpectedOutboxReplay(adapter, {
    operationId: request.operationId,
    storeId: request.storeId,
    deviceId: request.deviceId,
    operationType: 'BATCH_CLASSIFICATION_CREATED',
    entityType: 'BATCH_OPERATION',
  });
  if (replayed) return replayGraph(adapter, replayed, fingerprint(request));

  const generateId = options.generateId ?? generateMobileId;
  return adapter.transaction(() => {
    const { memberId } = assertOwner(adapter, request);
    const currentInventoryWatermark = getInventoryLedgerWatermark(adapter, request.storeProductId);
    const currentBatchWatermark = getBatchInventoryWatermark(adapter, request.storeProductId);
    if (currentInventoryWatermark !== request.expectedInventoryWatermark || currentBatchWatermark !== request.expectedBatchWatermark) {
      throw new DomainError('INVALID_VALUE', 'Inventory changed while this inspection was open. Refresh before saving.');
    }
    const currentGroups = listInventoryBatchGroupsByStoreProduct(adapter, request.storeProductId);
    const currentGroupBalances = currentGroups.map((group) => ({
      group,
      balance: getInventoryBatchGroupBalanceBigInt(adapter, group.id),
    })).filter(({ balance }) => balance > 0n);
    const requested = request.groups.reduce((total, group) => total + BigInt(group.quantityBaseMicros), 0n);
    if (request.mode === 'CORRECTION') {
      const namedTotal = currentGroupBalances.reduce((total, row) => total + row.balance, 0n);
      if (namedTotal <= 0n || requested !== namedTotal) {
        throw new DomainError('INVALID_QUANTITY', 'Correction groups must exactly replace the current named stock breakdown.');
      }
    } else {
      const unknownResidual = getUnknownBatchResidualBigInt(adapter, request.storeProductId);
      if (unknownResidual <= 0n || requested > unknownResidual) {
        throw new DomainError('INVALID_QUANTITY', 'Inspected groups cannot exceed current unknown stock.');
      }
    }

    const occurredAt = nowIso();
    const groups: InventoryBatchGroupRow[] = [];
    for (const line of request.groups) {
      groups.push(createInventoryBatchGroup(adapter, {
        id: generateId(),
        storeId: request.storeId,
        storeProductId: request.storeProductId,
        origin: 'PHYSICAL_INSPECTION',
        datePrecision: line.datePrecision,
        dateValue: line.dateValue,
        dateMeaning: line.dateMeaning,
        printedBatchNumber: line.printedBatchNumber,
        recordedByStoreMemberId: memberId,
        recordedByUserId: request.userId,
        deviceId: request.deviceId,
        createdAt: occurredAt,
      }));
    }
    const operation = createBatchInventoryOperation(adapter, {
      id: request.operationId,
      storeId: request.storeId,
      storeProductId: request.storeProductId,
      kind: 'CLASSIFICATION',
      sourceType: 'PHYSICAL_INSPECTION',
      sourceId: request.operationId,
      policyVersion: 'CLASSIFICATION_NET_ZERO_V1',
      evidenceVersion: 'M5-BATCH-1',
      inventoryWatermark: request.expectedInventoryWatermark,
      batchWatermark: request.expectedBatchWatermark,
      recordedByStoreMemberId: memberId,
      recordedByUserId: request.userId,
      deviceId: request.deviceId,
      createdAt: occurredAt,
    });
    const entries: BatchInventoryEntryRow[] = [];
    if (request.mode === 'CORRECTION') {
      currentGroupBalances.forEach(({ group, balance }) => appendSignedEntries(adapter, entries, {
        operationId: operation.id,
        storeId: request.storeId,
        storeProductId: request.storeProductId,
        groupId: group.id,
        entryType: 'CLASSIFICATION',
        deltaBaseMicros: -balance,
        generateId,
        createdAt: occurredAt,
      }));
    } else {
      appendSignedEntries(adapter, entries, {
        operationId: operation.id,
        storeId: request.storeId,
        storeProductId: request.storeProductId,
        groupId: null,
        entryType: 'UNKNOWN_RESIDUAL',
        deltaBaseMicros: -requested,
        generateId,
        createdAt: occurredAt,
      });
    }
    groups.forEach((group, index) => appendSignedEntries(adapter, entries, {
      operationId: operation.id,
      storeId: request.storeId,
      storeProductId: request.storeProductId,
      groupId: group.id,
      entryType: 'CLASSIFICATION',
      deltaBaseMicros: BigInt(request.groups[index].quantityBaseMicros),
      generateId,
      createdAt: occurredAt,
    }));
    const entryTotal = entries.reduce((total, entry) => total + BigInt(entry.deltaBaseMicros), 0n);
    if (entryTotal !== 0n) throw new DomainError('INVALID_QUANTITY', 'Classification entries must be net zero.');
    const outbox = enqueueOutboxOperation(adapter, {
      operationType: 'BATCH_CLASSIFICATION_CREATED',
      operationId: request.operationId,
      storeId: request.storeId,
      deviceId: request.deviceId,
      entityType: 'BATCH_OPERATION',
      entityId: operation.id,
      occurredAt,
      entities: {
        classificationVersion: 2,
        classificationMode: request.mode,
        request: fingerprint(request),
        operation,
        groups,
        entries,
      },
    });
    return { operation, groups, entries, outbox };
  });
}
