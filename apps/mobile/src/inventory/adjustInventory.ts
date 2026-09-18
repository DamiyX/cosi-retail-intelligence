import { convertPackagesToBase, DomainError } from '@retail/domain';

import { generateMobileId } from '../crypto/mobileIds';
import type { DatabaseAdapter } from '../db/adapter';
import {
  applyAdjustmentCostMovement,
  createInventoryAdjustment,
  createInventoryAdjustmentLine,
  createInventoryEvent,
  enqueueOutboxOperation,
  findExpectedOutboxReplay,
  getInventoryBatchGroupById,
  getDeviceById,
  getInventoryBatchGroupBalanceBigInt,
  getInventoryBalanceBigIntByStoreProduct,
  getInventoryAdjustmentById,
  getPackageUnitById,
  getStoreById,
  getStoreProductById,
  listBatchInventoryEntriesByOperation,
  listBatchInventoryOperationsByEvent,
  listCostMovementsBySource,
  listInventoryAdjustmentLinesByAdjustment,
  listInventoryEventsBySource,
  listBatchInventoryOperationsByStoreProduct,
  type BatchInventoryEntryRow,
  type BatchInventoryOperationRow,
  type CostMovementRow,
  type CostStateRow,
  type InventoryAdjustmentLineRow,
  type InventoryAdjustmentReason,
  type InventoryAdjustmentRow,
  type InventoryEventRow,
  type OutboxOperationRow,
} from '../db/repositories';
import {
  getBatchProjectionForStoreProduct,
  recordAdjustmentBatchAllocation,
  recordUnallocatedShortageBatchReclassification,
} from './batchAllocation';
import { nowIso, requireId } from '../db/repositories/common';

export interface InventoryAdjustmentLineInput {
  storeProductId: string;
  quantityBaseDeltaMicros: number;
  groupId?: string | null;
  packageUnitId?: string | null;
  quantityPackageSnapshotMicros?: number | null;
  conversionToBaseSnapshotMicros?: number | null;
  expectedInventoryWatermark: string;
  expectedBatchWatermark: string;
}

export interface RecordInventoryAdjustmentInput {
  operationId: string;
  storeId: string;
  deviceId: string;
  userId: string;
  reasonCode: InventoryAdjustmentReason;
  note?: string | null;
  lines: InventoryAdjustmentLineInput[];
  occurredAt?: string;
}

export interface InventoryAdjustmentGraph {
  adjustment: InventoryAdjustmentRow;
  lines: InventoryAdjustmentLineRow[];
  inventoryEvents: InventoryEventRow[];
  costMovements: CostMovementRow[];
  costStates: CostStateRow[];
  batchOperations: BatchInventoryOperationRow[];
  batchEntries: BatchInventoryEntryRow[];
  outbox: OutboxOperationRow;
}

interface NormalizedLine extends InventoryAdjustmentLineInput {
  storeProductId: string;
  quantityBaseDeltaMicros: number;
  groupId: string | null;
  packageUnitId: string | null;
  quantityPackageSnapshotMicros: number | null;
  conversionToBaseSnapshotMicros: number | null;
}

interface RequestFingerprint {
  reasonCode: InventoryAdjustmentReason;
  note: string | null;
  lines: NormalizedLine[];
}

function normalizeInput(input: RecordInventoryAdjustmentInput): RecordInventoryAdjustmentInput & { operationId: string; lines: NormalizedLine[] } {
  if (!Array.isArray(input.lines) || input.lines.length === 0 || input.lines.length > 50) {
    throw new DomainError('INVALID_VALUE', 'An adjustment must contain between one and fifty lines.');
  }
  const lines = input.lines.map((line) => {
    if (!Number.isSafeInteger(line.quantityBaseDeltaMicros) || line.quantityBaseDeltaMicros === 0) {
      throw new DomainError('INVALID_QUANTITY', 'Adjustment quantity must be a non-zero safe integer.');
    }
    const storeProductId = requireId(line.storeProductId);
    const groupId = line.groupId === undefined || line.groupId === null ? null : requireId(line.groupId);
    const packageUnitId = line.packageUnitId === undefined || line.packageUnitId === null ? null : requireId(line.packageUnitId);
    const quantityPackageSnapshotMicros = line.quantityPackageSnapshotMicros ?? null;
    const conversionToBaseSnapshotMicros = line.conversionToBaseSnapshotMicros ?? null;
    if ((packageUnitId === null) !== (quantityPackageSnapshotMicros === null) ||
        (packageUnitId === null) !== (conversionToBaseSnapshotMicros === null)) {
      throw new DomainError('INVALID_VALUE', 'Package adjustment snapshots must include package, quantity, and conversion together.');
    }
    if (quantityPackageSnapshotMicros !== null && (!Number.isSafeInteger(quantityPackageSnapshotMicros) || quantityPackageSnapshotMicros <= 0)) {
      throw new DomainError('INVALID_QUANTITY', 'Package quantity snapshots must be positive safe integers.');
    }
    if (conversionToBaseSnapshotMicros !== null && (!Number.isSafeInteger(conversionToBaseSnapshotMicros) || conversionToBaseSnapshotMicros <= 0)) {
      throw new DomainError('INVALID_QUANTITY', 'Package conversion snapshots must be positive safe integers.');
    }
    return { ...line, storeProductId, groupId, packageUnitId, quantityPackageSnapshotMicros, conversionToBaseSnapshotMicros };
  });
  if (['EXPIRED', 'DAMAGED', 'MISSING', 'PERSONAL_USE', 'SUPPLIER_RETURN'].includes(input.reasonCode)) {
    if (lines.some((line) => line.quantityBaseDeltaMicros > 0)) {
      throw new DomainError('INVALID_VALUE', `${input.reasonCode} adjustments can only remove stock.`);
    }
  }
  if (new Set(lines.map((line) => line.storeProductId)).size !== lines.length) {
    throw new DomainError('INVALID_VALUE', 'Use one adjustment line per product.');
  }
  return { ...input, operationId: requireId(input.operationId), lines };
}

function fingerprint(input: ReturnType<typeof normalizeInput>): RequestFingerprint {
  return { reasonCode: input.reasonCode, note: input.note?.trim() || null, lines: input.lines };
}

function assertOwner(adapter: DatabaseAdapter, input: ReturnType<typeof normalizeInput>): string {
  const store = getStoreById(adapter, input.storeId);
  if (!store || store.status !== 'ACTIVE') throw new DomainError('INVALID_VALUE', 'Store does not exist or is not active.');
  const device = getDeviceById(adapter, input.deviceId);
  if (!device || device.storeId !== input.storeId || device.status !== 'ACTIVE') throw new DomainError('INVALID_VALUE', 'Device does not belong to this store or is not active.');
  const member = adapter.getFirstRow<{ id: string; role: string }>(
    `SELECT id, role FROM store_members WHERE store_id = ? AND user_id = ? AND status = 'ACTIVE' LIMIT 1;`,
    [input.storeId, input.userId],
  );
  if (!member || member.role !== 'OWNER') throw new DomainError('INVALID_VALUE', 'Only an active store owner can record inventory adjustments.');
  return member.id;
}

function replayGraph(adapter: DatabaseAdapter, outbox: OutboxOperationRow, request: RequestFingerprint): InventoryAdjustmentGraph {
  const envelope = JSON.parse(outbox.payload) as { entities?: { request?: RequestFingerprint; costStates?: unknown } };
  if (JSON.stringify(envelope.entities?.request) !== JSON.stringify(request)) throw new DomainError('INVALID_VALUE', 'This operation ID already belongs to a different inventory adjustment.');
  if (!Array.isArray(envelope.entities?.costStates)) throw new Error('Inventory adjustment replay is missing its original cost snapshots.');
  const adjustment = getInventoryAdjustmentById(adapter, outbox.entityId);
  if (!adjustment) throw new Error('Inventory adjustment replay references a missing aggregate.');
  const lines = listInventoryAdjustmentLinesByAdjustment(adapter, adjustment.id);
  const inventoryEvents = listInventoryEventsBySource(adapter, 'MANUAL_ADJUSTMENT', adjustment.id);
  const costMovements = listCostMovementsBySource(adapter, 'ADJUSTMENT', adjustment.id);
  const costStates = envelope.entities.costStates as CostStateRow[];
  const eventOperations = inventoryEvents.flatMap((event) => listBatchInventoryOperationsByEvent(adapter, event.id));
  const reclassificationOperations = lines.flatMap((line) => listBatchInventoryOperationsByStoreProduct(adapter, line.storeProductId))
    .filter((operation) => operation.kind === 'ADJUSTMENT' && operation.sourceId === adjustment.id);
  const batchOperations = [...eventOperations, ...reclassificationOperations];
  const batchEntries = batchOperations.flatMap((operation) => listBatchInventoryEntriesByOperation(adapter, operation.id));
  return { adjustment, lines, inventoryEvents, costMovements, costStates, batchOperations, batchEntries, outbox };
}

export function recordInventoryAdjustment(
  adapter: DatabaseAdapter,
  rawInput: RecordInventoryAdjustmentInput,
  options: { generateId?: () => string } = {},
): InventoryAdjustmentGraph {
  const input = normalizeInput(rawInput);
  // Operation IDs are not authorization tokens. Resolve the owner boundary
  // before returning any replayed graph, then repeat it inside the write tx.
  assertOwner(adapter, input);
  const replayed = findExpectedOutboxReplay(adapter, {
    operationId: input.operationId,
    storeId: input.storeId,
    deviceId: input.deviceId,
    operationType: 'INVENTORY_ADJUSTMENT_CREATED',
    entityType: 'INVENTORY_ADJUSTMENT',
  });
  if (replayed) return replayGraph(adapter, replayed, fingerprint(input));
  const generateId = options.generateId ?? generateMobileId;
  return adapter.transaction(() => {
    const memberId = assertOwner(adapter, input);
    const occurredAt = input.occurredAt ?? nowIso();
    const adjustment = createInventoryAdjustment(adapter, {
      id: generateId(), operationId: input.operationId, storeId: input.storeId, reasonCode: input.reasonCode,
      note: input.note, occurredAt, createdByStoreMemberId: memberId, createdByUserId: input.userId, deviceId: input.deviceId, createdAt: occurredAt,
    });
    const lines: InventoryAdjustmentLineRow[] = [];
    const inventoryEvents: InventoryEventRow[] = [];
    const costMovements: CostMovementRow[] = [];
    const costStates: CostStateRow[] = [];
    const batchOperations: BatchInventoryOperationRow[] = [];
    const batchEntries: BatchInventoryEntryRow[] = [];
    for (const [index, line] of input.lines.entries()) {
      const product = getStoreProductById(adapter, line.storeProductId);
      if (!product || product.storeId !== input.storeId || product.status !== 'ACTIVE') throw new DomainError('INVALID_VALUE', 'Adjustment product does not belong to this store or is not active.');
      const currentProjection = getBatchProjectionForStoreProduct(adapter, line.storeProductId);
      if (currentProjection.inventoryWatermark !== line.expectedInventoryWatermark || currentProjection.batchWatermark !== line.expectedBatchWatermark) throw new DomainError('INVALID_VALUE', 'Inventory changed while this adjustment was open. Refresh before saving.');
      if (line.groupId) {
        const group = getInventoryBatchGroupById(adapter, line.groupId);
        if (!group || group.storeId !== input.storeId || group.storeProductId !== line.storeProductId) {
          throw new DomainError('INVALID_VALUE', 'Selected group does not belong to this store product.');
        }
        const groupBalance = getInventoryBatchGroupBalanceBigInt(adapter, line.groupId);
        if (line.quantityBaseDeltaMicros < 0 && -BigInt(line.quantityBaseDeltaMicros) > groupBalance) throw new DomainError('INVALID_QUANTITY', 'Selected group does not have enough recorded remainder. Refresh before saving.');
      }
      const packageUnit = line.packageUnitId ? getPackageUnitById(adapter, line.packageUnitId) : null;
      if (line.packageUnitId && (!packageUnit || packageUnit.productVariantId !== product.productVariantId || packageUnit.status !== 'ACTIVE')) {
        throw new DomainError('INVALID_VALUE', 'Adjustment package does not belong to this active product.');
      }
      const quantityPackageSnapshotMicros = line.quantityPackageSnapshotMicros as number | null;
      const conversionToBaseSnapshotMicros = line.conversionToBaseSnapshotMicros as number | null;
      if (packageUnit && quantityPackageSnapshotMicros !== null && conversionToBaseSnapshotMicros !== null) {
        if (packageUnit.conversionToBaseMicros !== conversionToBaseSnapshotMicros ||
            convertPackagesToBase(quantityPackageSnapshotMicros, conversionToBaseSnapshotMicros) !== Math.abs(line.quantityBaseDeltaMicros)) {
          throw new DomainError('INVALID_QUANTITY', 'Adjustment package snapshot does not match the base quantity.');
        }
      }
      let priorBalance = 0;
      let forceUnknown = false;
      try {
        const priorBalanceBigInt = getInventoryBalanceBigIntByStoreProduct(adapter, line.storeProductId);
        if (priorBalanceBigInt > BigInt(Number.MAX_SAFE_INTEGER) || priorBalanceBigInt < BigInt(Number.MIN_SAFE_INTEGER)) {
          forceUnknown = true;
        } else {
          priorBalance = Number(priorBalanceBigInt);
        }
      } catch (error) {
        if (!(error instanceof DomainError) || error.code !== 'INVALID_QUANTITY') throw error;
        forceUnknown = true;
      }
      if (line.quantityBaseDeltaMicros < 0 && !line.groupId) {
        const reclassification = recordUnallocatedShortageBatchReclassification(adapter, {
          operationId: generateId(),
          sourceId: adjustment.id,
          storeId: input.storeId,
          storeProductId: line.storeProductId,
          recordedByStoreMemberId: memberId,
          recordedByUserId: input.userId,
          deviceId: input.deviceId,
          generateId,
          createdAt: occurredAt,
        });
        if (reclassification) {
          batchOperations.push(reclassification.operation);
          batchEntries.push(...reclassification.entries);
        }
      }
      const inventoryEventId = generateId();
      const inventoryEvent = createInventoryEvent(adapter, {
        id: inventoryEventId,
        storeId: input.storeId,
        storeProductId: line.storeProductId,
        eventType: input.reasonCode,
        quantityBaseDeltaMicros: line.quantityBaseDeltaMicros,
        packageUnitId: line.packageUnitId,
        quantityPackageSnapshotMicros: line.quantityPackageSnapshotMicros,
        conversionToBaseSnapshotMicros: line.conversionToBaseSnapshotMicros,
        sourceType: 'MANUAL_ADJUSTMENT',
        sourceId: adjustment.id,
        reasonCode: input.reasonCode,
        note: input.note,
        occurredAt,
        createdByUserId: input.userId,
        deviceId: input.deviceId,
        createdAt: occurredAt,
      });
      inventoryEvents.push(inventoryEvent);
      const adjustmentLine = createInventoryAdjustmentLine(adapter, {
        id: generateId(), adjustmentId: adjustment.id, storeId: input.storeId, storeProductId: line.storeProductId,
        groupId: line.groupId, inventoryEventId: inventoryEvent.id, packageUnitId: line.packageUnitId,
        quantityPackageSnapshotMicros: line.quantityPackageSnapshotMicros,
        conversionToBaseSnapshotMicros: line.conversionToBaseSnapshotMicros,
        quantityBaseDeltaMicros: line.quantityBaseDeltaMicros, lineOrder: index + 1, createdAt: occurredAt,
      });
      lines.push(adjustmentLine);
      const applied = applyAdjustmentCostMovement(adapter, {
        id: generateId(), storeId: input.storeId, storeProductId: line.storeProductId, sourceId: adjustment.id,
        sourceLineId: adjustmentLine.id, quantityBaseDeltaMicros: line.quantityBaseDeltaMicros,
        priorInventoryBalanceBaseMicros: priorBalance, forceUnknown, createdAt: occurredAt,
      });
      costMovements.push(applied.movement);
      costStates.push(applied.state);
      const allocation = recordAdjustmentBatchAllocation(adapter, {
        operationId: generateId(), storeId: input.storeId, storeProductId: line.storeProductId,
        inventoryEventId: inventoryEvent.id, sourceId: inventoryEvent.id, groupId: line.groupId,
        quantityBaseDeltaMicros: line.quantityBaseDeltaMicros, recordedByStoreMemberId: memberId,
        recordedByUserId: input.userId, deviceId: input.deviceId, generateId, createdAt: occurredAt,
      });
      batchOperations.push(allocation.operation);
      batchEntries.push(...allocation.entries);
    }
    const outbox = enqueueOutboxOperation(adapter, {
      operationType: 'INVENTORY_ADJUSTMENT_CREATED', operationId: input.operationId, storeId: input.storeId,
      deviceId: input.deviceId, entityType: 'INVENTORY_ADJUSTMENT', entityId: adjustment.id, occurredAt,
      entities: { batchTrackingVersion: 1, adjustmentVersion: 1, request: fingerprint(input), adjustment, lines, inventoryEvents, costMovements, costStates, batchOperations, batchEntries },
    });
    return { adjustment, lines, inventoryEvents, costMovements, costStates, batchOperations, batchEntries, outbox };
  });
}
