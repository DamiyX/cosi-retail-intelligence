import { convertPackagesToBase, DomainError } from '@retail/domain';

import { generateMobileId } from '../crypto/mobileIds';
import type { DatabaseAdapter } from '../db/adapter';
import {
  applyAdjustmentCostMovement,
  cancelInventoryReconciliation as cancelReconciliationRow,
  completeInventoryCheckAssignmentForReconciliation,
  completeInventoryReconciliation,
  createBatchInventoryEntry,
  createBatchInventoryOperation,
  createInventoryAdjustment,
  createInventoryAdjustmentLine,
  createInventoryEvent,
  createInventoryReconciliation,
  createInventoryReconciliationGroupCount,
  createInventoryReconciliationLine,
  createInventoryReconciliationSubmission,
  enqueueOutboxOperation,
  finalizeBatchInventoryOperation,
  finalizeInventoryReconciliationLine,
  findExpectedOutboxReplay,
  getCostState,
  getDeviceById,
  getInventoryBalanceBigIntByStoreProduct,
  getInventoryReconciliationById,
  getInventoryBatchGroupBalanceBigInt,
  getInventoryBatchGroupById,
  getLatestInventoryReconciliationSubmission,
  getPackageUnitById,
  getInventoryAdjustmentById,
  getInventoryCheckAssignmentById,
  getStoreById,
  getStoreProductById,
  listBatchInventoryEntriesByOperation,
  listBatchInventoryOperationsByEvent,
  listBatchInventoryOperationsByStoreProduct,
  listInventoryBatchGroupsByStoreProduct,
  listInventoryCheckAttemptsByAssignment,
  listInventoryReconciliationGroupCountsBySubmission,
  listInventoryReconciliationLinesByReconciliation,
  listInventoryReconciliationSubmissionsByLine,
  listInventoryEventsBySource,
  listInventoryAdjustmentLinesByAdjustment,
  listCostMovementsBySource,
  type BatchInventoryEntryRow,
  type BatchInventoryOperationRow,
  type CostMovementRow,
  type CostStateRow,
  type InventoryAdjustmentLineRow,
  type InventoryAdjustmentReason,
  type InventoryAdjustmentRow,
  type InventoryEventRow,
  type InventoryCheckAssignmentRow,
  type InventoryCheckAttemptRow,
  type InventoryReconciliationGroupCountRow,
  type InventoryReconciliationLineRow,
  type InventoryReconciliationRow,
  type InventoryReconciliationSubmissionRow,
  type OutboxOperationRow,
} from '../db/repositories';
import { getBatchProjectionForStoreProduct, recordAdjustmentBatchAllocation } from './batchAllocation';
import { nowIso, requireId } from '../db/repositories/common';

export interface ReconciliationGroupCountInput {
  groupId?: string | null;
  physicalBaseUnits: string | number | bigint;
}

export interface StartInventoryReconciliationInput {
  reconciliationId?: string;
  lineId?: string;
  storeId: string;
  deviceId: string;
  userId: string;
  storeProductId: string;
  checkAssignmentId?: string | null;
}

export interface SubmitInventoryReconciliationInput {
  reconciliationId: string;
  expectedInventoryWatermark: string;
  expectedBatchWatermark: string;
  physicalBaseUnits: string | number | bigint;
  completeGroupCount?: boolean;
  groupCounts?: ReconciliationGroupCountInput[];
  reasonCode?: string | null;
  note?: string | null;
}

export interface FinalizeInventoryReconciliationInput {
  operationId: string;
  reconciliationId: string;
  storeId: string;
  deviceId: string;
  userId: string;
  reasonCode?: InventoryAdjustmentReason;
  note?: string | null;
  packageUnitId?: string | null;
  quantityPackageSnapshotMicros?: number | null;
  conversionToBaseSnapshotMicros?: number | null;
}

export interface ReconciliationDraft {
  reconciliationId: string;
  lineId: string;
  storeProductId: string;
  checkAssignmentId: string | null;
  status: InventoryReconciliationRow['status'];
  hasSubmission: boolean;
  /** Opaque concurrency tokens. The UI must not render them as business quantities. */
  inventoryWatermark: string;
  batchWatermark: string;
}

export interface ReconciliationGraph {
  reconciliation: InventoryReconciliationRow;
  line: InventoryReconciliationLineRow;
  submissions: InventoryReconciliationSubmissionRow[];
  groupCounts: InventoryReconciliationGroupCountRow[];
  adjustment: InventoryAdjustmentRow | null;
  adjustmentLines: InventoryAdjustmentLineRow[];
  inventoryEvents: InventoryEventRow[];
  costMovements: CostMovementRow[];
  costStates: CostStateRow[];
  batchOperations: BatchInventoryOperationRow[];
  batchEntries: BatchInventoryEntryRow[];
  guidedAssignment: InventoryCheckAssignmentRow | null;
  guidedAttempt: InventoryCheckAttemptRow | null;
  outbox: OutboxOperationRow;
}

interface OwnerContext {
  memberId: string;
}

interface FinalizationFingerprint {
  reconciliationId: string;
  reasonCode: InventoryAdjustmentReason;
  note: string | null;
  packageUnitId: string | null;
  quantityPackageSnapshotMicros: number | null;
  conversionToBaseSnapshotMicros: number | null;
}

function canonicalInteger(value: string | number | bigint, field: string, nonnegative = false): bigint {
  const text = String(value);
  if (!/^-?\d+$/.test(text)) throw new DomainError('INVALID_QUANTITY', `${field} must be an integer.`);
  let parsed: bigint;
  try {
    parsed = BigInt(text);
  } catch {
    throw new DomainError('INVALID_QUANTITY', `${field} must be an integer.`);
  }
  if (nonnegative && parsed < 0n) throw new DomainError('INVALID_QUANTITY', `${field} cannot be negative.`);
  return parsed;
}

function safeNumber(value: bigint, field: string): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new DomainError('INVALID_QUANTITY', `${field} exceeds the safe persisted range.`);
  }
  return Number(value);
}

function assertOwner(adapter: DatabaseAdapter, storeId: string, deviceId: string, userId: string): OwnerContext {
  const store = getStoreById(adapter, storeId);
  if (!store || store.status !== 'ACTIVE') throw new DomainError('INVALID_VALUE', 'Store does not exist or is not active.');
  const device = getDeviceById(adapter, deviceId);
  if (!device || device.storeId !== storeId || device.status !== 'ACTIVE') {
    throw new DomainError('INVALID_VALUE', 'Device does not belong to this store or is not active.');
  }
  const member = adapter.getFirstRow<{ id: string; role: string }>(
    `SELECT id, role FROM store_members WHERE store_id = ? AND user_id = ? AND status = 'ACTIVE' LIMIT 1;`,
    [storeId, userId],
  );
  if (!member || member.role !== 'OWNER') throw new DomainError('INVALID_VALUE', 'Only an active store owner can manage reconciliation checks.');
  return { memberId: member.id };
}

function normalizeReason(reasonCode?: InventoryAdjustmentReason): InventoryAdjustmentReason {
  return reasonCode ?? 'CORRECTION';
}

function normalizeFinalization(input: FinalizeInventoryReconciliationInput): FinalizationFingerprint & FinalizeInventoryReconciliationInput {
  const packageUnitId = input.packageUnitId ?? null;
  const quantityPackageSnapshotMicros = input.quantityPackageSnapshotMicros ?? null;
  const conversionToBaseSnapshotMicros = input.conversionToBaseSnapshotMicros ?? null;
  if ((packageUnitId === null) !== (quantityPackageSnapshotMicros === null) ||
      (packageUnitId === null) !== (conversionToBaseSnapshotMicros === null)) {
    throw new DomainError('INVALID_VALUE', 'Reconciliation package snapshots must include package, quantity, and conversion together.');
  }
  if (quantityPackageSnapshotMicros !== null && (!Number.isSafeInteger(quantityPackageSnapshotMicros) || quantityPackageSnapshotMicros <= 0)) {
    throw new DomainError('INVALID_QUANTITY', 'Reconciliation package quantity must be positive and safe.');
  }
  if (conversionToBaseSnapshotMicros !== null && (!Number.isSafeInteger(conversionToBaseSnapshotMicros) || conversionToBaseSnapshotMicros <= 0)) {
    throw new DomainError('INVALID_QUANTITY', 'Reconciliation package conversion must be positive and safe.');
  }
  return {
    ...input,
    operationId: requireId(input.operationId),
    reconciliationId: requireId(input.reconciliationId),
    reasonCode: normalizeReason(input.reasonCode),
    note: input.note?.trim() || null,
    packageUnitId,
    quantityPackageSnapshotMicros,
    conversionToBaseSnapshotMicros,
  };
}

function fingerprint(input: ReturnType<typeof normalizeFinalization>): FinalizationFingerprint {
  return {
    reconciliationId: input.reconciliationId,
    reasonCode: input.reasonCode,
    note: input.note ?? null,
    packageUnitId: input.packageUnitId ?? null,
    quantityPackageSnapshotMicros: input.quantityPackageSnapshotMicros ?? null,
    conversionToBaseSnapshotMicros: input.conversionToBaseSnapshotMicros ?? null,
  };
}

function getSessionLine(adapter: DatabaseAdapter, reconciliationId: string, storeId: string): { reconciliation: InventoryReconciliationRow; line: InventoryReconciliationLineRow } {
  const reconciliation = getInventoryReconciliationById(adapter, reconciliationId);
  if (!reconciliation || reconciliation.storeId !== storeId) throw new DomainError('INVALID_VALUE', 'Reconciliation does not belong to this store.');
  const lines = listInventoryReconciliationLinesByReconciliation(adapter, reconciliation.id);
  if (lines.length !== 1) throw new DomainError('INVALID_VALUE', 'This reconciliation does not have exactly one product line.');
  return { reconciliation, line: lines[0] };
}

function draftFromSession(adapter: DatabaseAdapter, reconciliation: InventoryReconciliationRow, line: InventoryReconciliationLineRow): ReconciliationDraft {
  const latest = getLatestInventoryReconciliationSubmission(adapter, line.id);
  const projection = getBatchProjectionForStoreProduct(adapter, line.storeProductId);
  return {
    reconciliationId: reconciliation.id,
    lineId: line.id,
    storeProductId: line.storeProductId,
    checkAssignmentId: reconciliation.checkAssignmentId,
    status: reconciliation.status,
    hasSubmission: latest !== null,
    inventoryWatermark: projection.inventoryWatermark,
    batchWatermark: projection.batchWatermark,
  };
}

function appendSignedBatchEntries(
  adapter: DatabaseAdapter,
  entries: BatchInventoryEntryRow[],
  input: {
    operationId: string;
    storeId: string;
    storeProductId: string;
    groupId: string | null;
    delta: bigint;
    entryType: BatchInventoryEntryRow['entryType'];
    generateId: () => string;
    createdAt: string;
  },
): void {
  const maxSafe = BigInt(Number.MAX_SAFE_INTEGER);
  let remaining = input.delta;
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

function createReconciliationBatchOperation(
  adapter: DatabaseAdapter,
  input: {
    operationId: string;
    sourceId: string;
    storeId: string;
    storeProductId: string;
    memberId: string;
    userId: string;
    deviceId: string;
    inventoryWatermark: string;
    batchWatermark: string;
    policyVersion: string;
    deltas: { groupId: string | null; delta: bigint }[];
    generateId: () => string;
    createdAt: string;
  },
): { operation: BatchInventoryOperationRow; entries: BatchInventoryEntryRow[] } | null {
  const nonzero = input.deltas.filter((row) => row.delta !== 0n);
  if (nonzero.length === 0) return null;
  const total = nonzero.reduce((sum, row) => sum + row.delta, 0n);
  if (total !== 0n) throw new DomainError('INVALID_QUANTITY', 'Reconciliation batch evidence must be net zero.');
  const operation = createBatchInventoryOperation(adapter, {
    id: input.operationId,
    storeId: input.storeId,
    storeProductId: input.storeProductId,
    kind: 'RECONCILIATION',
    sourceType: 'RECONCILIATION',
    sourceId: input.sourceId,
    policyVersion: input.policyVersion,
    evidenceVersion: 'M5-BATCH-1',
    inventoryWatermark: input.inventoryWatermark,
    batchWatermark: input.batchWatermark,
    recordedByStoreMemberId: input.memberId,
    recordedByUserId: input.userId,
    deviceId: input.deviceId,
    createdAt: input.createdAt,
  });
  const entries: BatchInventoryEntryRow[] = [];
  for (const delta of nonzero) {
    appendSignedBatchEntries(adapter, entries, {
      operationId: operation.id,
      storeId: input.storeId,
      storeProductId: input.storeProductId,
      groupId: delta.groupId,
      delta: delta.delta,
      entryType: delta.groupId ? 'CLASSIFICATION' : 'UNKNOWN_RESIDUAL',
      generateId: input.generateId,
      createdAt: input.createdAt,
    });
  }
  return { operation: finalizeBatchInventoryOperation(adapter, operation.id, input.createdAt), entries };
}

function validateCompleteGroupCounts(
  adapter: DatabaseAdapter,
  line: InventoryReconciliationLineRow,
  submission: InventoryReconciliationSubmissionRow,
  counts: InventoryReconciliationGroupCountRow[],
  physical: bigint,
): Map<string | null, bigint> {
  const currentGroups = listInventoryBatchGroupsByStoreProduct(adapter, line.storeProductId)
    .map((group) => ({ group, balance: getInventoryBatchGroupBalanceBigInt(adapter, group.id) }));
  const byGroup = new Map<string | null, bigint>();
  for (const count of counts) {
    if (byGroup.has(count.groupId)) throw new DomainError('INVALID_VALUE', 'A physical group may be counted only once.');
    byGroup.set(count.groupId, canonicalInteger(count.physicalBaseUnits, 'group physicalBaseUnits', true));
  }
  for (const current of currentGroups.filter((row) => row.balance > 0n)) {
    if (!byGroup.has(current.group.id)) throw new DomainError('INVALID_VALUE', 'Complete group counts must include every recorded positive group.');
  }
  const currentUnknown = getInventoryBalanceBigIntByStoreProduct(adapter, line.storeProductId) - currentGroups.reduce((sum, row) => sum + row.balance, 0n);
  if (currentUnknown !== 0n && !byGroup.has(null)) {
    throw new DomainError('INVALID_VALUE', 'Complete group counts must include the unknown or unallocated remainder.');
  }
  const counted = [...byGroup.values()].reduce((sum, value) => sum + value, 0n);
  if (counted !== physical) throw new DomainError('INVALID_QUANTITY', 'Complete group counts must add up to the physical total.');
  if (!submission.completeGroupCount) throw new DomainError('INVALID_VALUE', 'Group counts were submitted without complete-count mode.');
  return byGroup;
}

function replayGraph(adapter: DatabaseAdapter, outbox: OutboxOperationRow, request: FinalizationFingerprint): ReconciliationGraph {
  let stored: { request?: FinalizationFingerprint } = {};
  try {
    stored = (JSON.parse(outbox.payload) as { entities?: { request?: FinalizationFingerprint } }).entities ?? {};
  } catch {
    throw new Error('Stored reconciliation replay envelope is not readable.');
  }
  if (JSON.stringify(stored.request) !== JSON.stringify(request)) throw new DomainError('INVALID_VALUE', 'This operation ID already belongs to a different reconciliation finalization.');
  const reconciliation = getInventoryReconciliationById(adapter, request.reconciliationId);
  if (!reconciliation) throw new Error('Reconciliation replay references a missing session.');
  const lines = listInventoryReconciliationLinesByReconciliation(adapter, reconciliation.id);
  if (lines.length !== 1) throw new Error('Reconciliation replay references an invalid line graph.');
  const line = lines[0];
  const submissions = listInventoryReconciliationSubmissionsByLine(adapter, line.id);
  const latest = submissions[submissions.length - 1];
  const groupCounts = latest ? listInventoryReconciliationGroupCountsBySubmission(adapter, latest.id) : [];
  const adjustment = line.adjustmentId ? getInventoryAdjustmentById(adapter, line.adjustmentId) : null;
  const adjustmentLines = adjustment ? listInventoryAdjustmentLinesByAdjustment(adapter, adjustment.id) : [];
  const inventoryEvents = adjustment ? listInventoryEventsBySource(adapter, 'RECONCILIATION', adjustment.id) : [];
  const costMovements = adjustment ? listCostMovementsBySource(adapter, 'ADJUSTMENT', adjustment.id) : [];
  const costStates = adjustmentLines.map((row) => getCostState(adapter, row.storeProductId)).filter((row): row is CostStateRow => row !== null);
  const reconciliationOperations = listBatchInventoryOperationsByStoreProduct(adapter, line.storeProductId)
    .filter((operation) => operation.sourceType === 'RECONCILIATION' && operation.sourceId === line.id);
  const eventOperations = inventoryEvents.flatMap((event) => listBatchInventoryOperationsByEvent(adapter, event.id));
  const batchOperations = [...reconciliationOperations, ...eventOperations];
  const batchEntries = batchOperations.flatMap((operation) => listBatchInventoryEntriesByOperation(adapter, operation.id));
  const guidedAssignment = reconciliation.checkAssignmentId
    ? getInventoryCheckAssignmentById(adapter, reconciliation.checkAssignmentId)
    : null;
  const guidedAttempt = guidedAssignment
    ? listInventoryCheckAttemptsByAssignment(adapter, guidedAssignment.id).find((attempt) => attempt.reconciliationId === reconciliation.id) ?? null
    : null;
  return {
    reconciliation,
    line,
    submissions,
    groupCounts,
    adjustment,
    adjustmentLines,
    inventoryEvents,
    costMovements,
    costStates,
    batchOperations,
    batchEntries,
    guidedAssignment,
    guidedAttempt,
    outbox,
  };
}

export function startInventoryReconciliation(
  adapter: DatabaseAdapter,
  input: StartInventoryReconciliationInput,
  options: { generateId?: () => string } = {},
): ReconciliationDraft {
  const storeId = requireId(input.storeId);
  const deviceId = requireId(input.deviceId);
  const userId = requireId(input.userId);
  const storeProductId = requireId(input.storeProductId);
  const { memberId } = assertOwner(adapter, storeId, deviceId, userId);
  const product = getStoreProductById(adapter, storeProductId);
  if (!product || product.storeId !== storeId || product.status !== 'ACTIVE') throw new DomainError('INVALID_VALUE', 'Product does not belong to this store or is not active.');
  const checkAssignmentId = input.checkAssignmentId ?? null;
  if (checkAssignmentId) {
    const assignment = getInventoryCheckAssignmentById(adapter, checkAssignmentId);
    if (!assignment || assignment.storeId !== storeId || assignment.storeProductId !== storeProductId || assignment.status !== 'PENDING') {
      throw new DomainError('INVALID_VALUE', 'Guided check assignment does not belong to this product or is no longer pending.');
    }
  }
  const generateId = options.generateId ?? generateMobileId;
  return adapter.transaction(() => {
    const projection = getBatchProjectionForStoreProduct(adapter, storeProductId);
    const startedAt = nowIso();
    const reconciliation = createInventoryReconciliation(adapter, {
      id: input.reconciliationId ?? generateId(),
      storeId,
      createdByStoreMemberId: memberId,
      createdByUserId: userId,
      deviceId,
      startedAt,
      checkAssignmentId,
      createdAt: startedAt,
    });
    const line = createInventoryReconciliationLine(adapter, {
      id: input.lineId ?? generateId(),
      reconciliationId: reconciliation.id,
      storeId,
      storeProductId,
      recordedBaseUnitsSnapshot: projection.inventoryBalanceBaseMicros,
      initialInventoryWatermark: projection.inventoryWatermark,
      initialBatchWatermark: projection.batchWatermark,
      createdAt: startedAt,
    });
    return draftFromSession(adapter, reconciliation, line);
  });
}

export function getInventoryReconciliationDraft(
  adapter: DatabaseAdapter,
  input: { reconciliationId: string; storeId: string; deviceId: string; userId: string },
): ReconciliationDraft {
  assertOwner(adapter, input.storeId, input.deviceId, input.userId);
  const { reconciliation, line } = getSessionLine(adapter, input.reconciliationId, input.storeId);
  return draftFromSession(adapter, reconciliation, line);
}

export function cancelInventoryReconciliation(
  adapter: DatabaseAdapter,
  input: { reconciliationId: string; storeId: string; deviceId: string; userId: string },
): ReconciliationDraft {
  assertOwner(adapter, input.storeId, input.deviceId, input.userId);
  return adapter.transaction(() => {
    const { reconciliation, line } = getSessionLine(adapter, input.reconciliationId, input.storeId);
    if (reconciliation.status !== 'IN_PROGRESS') throw new DomainError('INVALID_VALUE', 'This reconciliation is no longer open.');
    const cancelled = cancelReconciliationRow(adapter, { id: reconciliation.id, completedAt: nowIso() });
    return draftFromSession(adapter, cancelled, line);
  });
}

export function submitInventoryReconciliation(
  adapter: DatabaseAdapter,
  rawInput: SubmitInventoryReconciliationInput & { storeId: string; deviceId: string; userId: string },
  options: { generateId?: () => string } = {},
): ReconciliationDraft {
  const { storeId, deviceId, userId } = rawInput;
  const { memberId } = assertOwner(adapter, storeId, deviceId, userId);
  const generateId = options.generateId ?? generateMobileId;
  const physical = canonicalInteger(rawInput.physicalBaseUnits, 'physicalBaseUnits', true);
  const completeGroupCount = rawInput.completeGroupCount ?? false;
  const groupCounts = rawInput.groupCounts ?? [];
  if (!completeGroupCount && groupCounts.length > 0) throw new DomainError('INVALID_VALUE', 'Group counts require complete-count mode.');
  if (groupCounts.length > 100) throw new DomainError('INVALID_VALUE', 'A reconciliation cannot contain more than one hundred group counts.');
  return adapter.transaction(() => {
    const { reconciliation, line } = getSessionLine(adapter, rawInput.reconciliationId, storeId);
    if (reconciliation.status !== 'IN_PROGRESS') throw new DomainError('INVALID_VALUE', 'This reconciliation is no longer open.');
    const currentProjection = getBatchProjectionForStoreProduct(adapter, line.storeProductId);
    if (currentProjection.inventoryWatermark !== rawInput.expectedInventoryWatermark || currentProjection.batchWatermark !== rawInput.expectedBatchWatermark) {
      throw new DomainError('INVALID_VALUE', 'Inventory changed while this count was open. Refresh before saving the count.');
    }
    const recorded = canonicalInteger(currentProjection.inventoryBalanceBaseMicros, 'recordedBaseUnitsSnapshot');
    const difference = physical - recorded;
    const submissions = listInventoryReconciliationSubmissionsByLine(adapter, line.id);
    const submissionType = submissions.length === 0 ? 'FIRST' : 'RECOUNT';
    const submission = createInventoryReconciliationSubmission(adapter, {
      id: generateId(),
      reconciliationLineId: line.id,
      storeId,
      storeProductId: line.storeProductId,
      submissionType,
      recordedBaseUnitsSnapshot: recorded,
      physicalBaseUnits: physical,
      differenceBaseUnits: difference,
      inventoryWatermark: currentProjection.inventoryWatermark,
      batchWatermark: currentProjection.batchWatermark,
      completeGroupCount,
      reasonCode: rawInput.reasonCode,
      note: rawInput.note,
      createdByStoreMemberId: memberId,
      createdByUserId: userId,
      deviceId,
      createdAt: nowIso(),
    });
    const seen = new Set<string | null>();
    for (const [index, count] of groupCounts.entries()) {
      const groupId = count.groupId === undefined || count.groupId === null ? null : requireId(count.groupId);
      if (seen.has(groupId)) throw new DomainError('INVALID_VALUE', 'A physical group may be counted only once.');
      seen.add(groupId);
      if (groupId) {
        const group = getInventoryBatchGroupById(adapter, groupId);
        if (!group || group.storeId !== storeId || group.storeProductId !== line.storeProductId) throw new DomainError('INVALID_VALUE', 'A counted group does not belong to this product.');
      }
      createInventoryReconciliationGroupCount(adapter, {
        id: generateId(),
        submissionId: submission.id,
        storeId,
        storeProductId: line.storeProductId,
        groupId,
        physicalBaseUnits: canonicalInteger(count.physicalBaseUnits, 'group physicalBaseUnits', true),
        lineOrder: index + 1,
        createdAt: submission.createdAt,
      });
    }
    if (completeGroupCount) {
      const savedCounts = listInventoryReconciliationGroupCountsBySubmission(adapter, submission.id);
      validateCompleteGroupCounts(adapter, line, submission, savedCounts, physical);
    }
    return draftFromSession(adapter, reconciliation, line);
  });
}

export function finalizeInventoryReconciliation(
  adapter: DatabaseAdapter,
  rawInput: FinalizeInventoryReconciliationInput,
  options: { generateId?: () => string } = {},
): ReconciliationGraph {
  const input = normalizeFinalization(rawInput);
  assertOwner(adapter, input.storeId, input.deviceId, input.userId);
  const replayed = findExpectedOutboxReplay(adapter, {
    operationId: input.operationId,
    storeId: input.storeId,
    deviceId: input.deviceId,
    operationType: 'RECONCILIATION_FINALIZED',
    entityType: 'RECONCILIATION',
  });
  if (replayed) return replayGraph(adapter, replayed, fingerprint(input));
  const generateId = options.generateId ?? generateMobileId;
  return adapter.transaction(() => {
    const { memberId } = assertOwner(adapter, input.storeId, input.deviceId, input.userId);
    const { reconciliation, line } = getSessionLine(adapter, input.reconciliationId, input.storeId);
    if (reconciliation.status !== 'IN_PROGRESS') throw new DomainError('INVALID_VALUE', 'This reconciliation is no longer open.');
    const latest = getLatestInventoryReconciliationSubmission(adapter, line.id);
    if (!latest) throw new DomainError('INVALID_VALUE', 'Submit a physical count before finalizing.');
    const currentProjection = getBatchProjectionForStoreProduct(adapter, line.storeProductId);
    if (currentProjection.inventoryWatermark !== latest.inventoryWatermark || currentProjection.batchWatermark !== latest.batchWatermark) {
      throw new DomainError('INVALID_VALUE', 'Inventory changed while this count was open. Refresh and recount before finalizing.');
    }
    const physical = canonicalInteger(latest.physicalBaseUnits, 'physicalBaseUnits', true);
    const recorded = canonicalInteger(latest.recordedBaseUnitsSnapshot, 'recordedBaseUnitsSnapshot');
    const difference = physical - recorded;
    const savedCounts = listInventoryReconciliationGroupCountsBySubmission(adapter, latest.id);
    const generateAt = nowIso();
    const adjustment = difference === 0n ? null : createInventoryAdjustment(adapter, {
      id: generateId(),
      operationId: input.operationId,
      reconciliationId: reconciliation.id,
      storeId: input.storeId,
      reasonCode: input.reasonCode,
      note: input.note,
      occurredAt: generateAt,
      createdByStoreMemberId: memberId,
      createdByUserId: input.userId,
      deviceId: input.deviceId,
      createdAt: generateAt,
    });
    const batchOperations: BatchInventoryOperationRow[] = [];
    const batchEntries: BatchInventoryEntryRow[] = [];
    const currentGroups = listInventoryBatchGroupsByStoreProduct(adapter, line.storeProductId)
      .map((group) => ({ group, balance: getInventoryBatchGroupBalanceBigInt(adapter, group.id) }))
    const positiveGroups = currentGroups.filter((row) => row.balance > 0n);
    if (latest.completeGroupCount) {
      const counts = validateCompleteGroupCounts(adapter, line, latest, savedCounts, physical);
      const deltas: { groupId: string | null; delta: bigint }[] = currentGroups
        .filter(({ group }) => counts.has(group.id))
        .map(({ group, balance }) => ({ groupId: group.id, delta: (counts.get(group.id) ?? 0n) - balance }))
        .filter((row) => row.delta !== 0n);
      const namedDelta = deltas.reduce((sum, row) => sum + row.delta, 0n);
      if (namedDelta !== 0n) deltas.push({ groupId: null, delta: -namedDelta });
      const corrected = createReconciliationBatchOperation(adapter, {
        operationId: generateId(),
        sourceId: line.id,
        storeId: input.storeId,
        storeProductId: line.storeProductId,
        memberId,
        userId: input.userId,
        deviceId: input.deviceId,
        inventoryWatermark: latest.inventoryWatermark,
        batchWatermark: latest.batchWatermark,
        policyVersion: 'COMPLETE_GROUP_COUNT_V1',
        deltas,
        generateId,
        createdAt: generateAt,
      });
      if (corrected) {
        batchOperations.push(corrected.operation);
        batchEntries.push(...corrected.entries);
      }
    } else if (difference !== 0n && positiveGroups.length > 0) {
      const namedTotal = positiveGroups.reduce((sum, row) => sum + row.balance, 0n);
      const unknown = createReconciliationBatchOperation(adapter, {
        operationId: generateId(),
        sourceId: line.id,
        storeId: input.storeId,
        storeProductId: line.storeProductId,
        memberId,
        userId: input.userId,
        deviceId: input.deviceId,
        inventoryWatermark: latest.inventoryWatermark,
        batchWatermark: latest.batchWatermark,
        policyVersion: 'TOTAL_DISCREPANCY_UNKNOWN_V1',
        deltas: [
          ...positiveGroups.map(({ group, balance }) => ({ groupId: group.id, delta: -balance })),
          { groupId: null, delta: namedTotal },
        ],
        generateId,
        createdAt: generateAt,
      });
      if (unknown) {
        batchOperations.push(unknown.operation);
        batchEntries.push(...unknown.entries);
      }
    }
    const inventoryEvents: InventoryEventRow[] = [];
    const adjustmentLines: InventoryAdjustmentLineRow[] = [];
    const costMovements: CostMovementRow[] = [];
    const costStates: CostStateRow[] = [];
    if (adjustment) {
      const priorBalance = getInventoryBalanceBigIntByStoreProduct(adapter, line.storeProductId);
      const forceUnknown = priorBalance > BigInt(Number.MAX_SAFE_INTEGER) || priorBalance < BigInt(Number.MIN_SAFE_INTEGER);
      const packageUnitId = input.packageUnitId ?? null;
      if (packageUnitId) {
        const packageUnit = getPackageUnitById(adapter, packageUnitId);
        if (!packageUnit || packageUnit.productVariantId !== getStoreProductById(adapter, line.storeProductId)?.productVariantId || packageUnit.status !== 'ACTIVE') {
          throw new DomainError('INVALID_VALUE', 'Reconciliation package does not belong to this active product.');
        }
        if (BigInt(convertPackagesToBase(input.quantityPackageSnapshotMicros!, input.conversionToBaseSnapshotMicros!)) !== (difference < 0n ? -difference : difference)) {
          throw new DomainError('INVALID_QUANTITY', 'Reconciliation package snapshot does not exactly explain the adjustment.');
        }
        if (packageUnit.conversionToBaseMicros !== input.conversionToBaseSnapshotMicros) {
          throw new DomainError('INVALID_QUANTITY', 'Reconciliation package conversion snapshot is stale.');
        }
      }
      const event = createInventoryEvent(adapter, {
        id: generateId(),
        storeId: input.storeId,
        storeProductId: line.storeProductId,
        eventType: 'CORRECTION',
        quantityBaseDeltaMicros: safeNumber(difference, 'Reconciliation adjustment'),
        packageUnitId,
        quantityPackageSnapshotMicros: input.quantityPackageSnapshotMicros ?? null,
        conversionToBaseSnapshotMicros: input.conversionToBaseSnapshotMicros ?? null,
        sourceType: 'RECONCILIATION',
        sourceId: adjustment.id,
        reasonCode: input.reasonCode,
        note: input.note,
        occurredAt: generateAt,
        createdByUserId: input.userId,
        deviceId: input.deviceId,
        createdAt: generateAt,
      });
      inventoryEvents.push(event);
      const adjustmentLine = createInventoryAdjustmentLine(adapter, {
        id: generateId(),
        adjustmentId: adjustment.id,
        storeId: input.storeId,
        storeProductId: line.storeProductId,
        groupId: null,
        inventoryEventId: event.id,
        packageUnitId,
        quantityPackageSnapshotMicros: input.quantityPackageSnapshotMicros ?? null,
        conversionToBaseSnapshotMicros: input.conversionToBaseSnapshotMicros ?? null,
        quantityBaseDeltaMicros: safeNumber(difference, 'Reconciliation adjustment'),
        lineOrder: 1,
        createdAt: generateAt,
      });
      adjustmentLines.push(adjustmentLine);
      const applied = applyAdjustmentCostMovement(adapter, {
        id: generateId(),
        storeId: input.storeId,
        storeProductId: line.storeProductId,
        sourceId: adjustment.id,
        sourceLineId: adjustmentLine.id,
        quantityBaseDeltaMicros: safeNumber(difference, 'Reconciliation adjustment'),
        priorInventoryBalanceBaseMicros: forceUnknown ? 0 : Number(priorBalance),
        forceUnknown,
        createdAt: generateAt,
      });
      costMovements.push(applied.movement);
      costStates.push(applied.state);
      const allocation = recordAdjustmentBatchAllocation(adapter, {
        operationId: generateId(),
        storeId: input.storeId,
        storeProductId: line.storeProductId,
        inventoryEventId: event.id,
        sourceId: event.id,
        groupId: null,
        quantityBaseDeltaMicros: safeNumber(difference, 'Reconciliation adjustment'),
        sourceType: 'RECONCILIATION',
        recordedByStoreMemberId: memberId,
        recordedByUserId: input.userId,
        deviceId: input.deviceId,
        generateId,
        createdAt: generateAt,
      });
      batchOperations.push(allocation.operation);
      batchEntries.push(...allocation.entries);
      const finalizedLine = finalizeInventoryReconciliationLine(adapter, {
        id: line.id,
        physicalBaseUnits: physical,
        differenceBaseUnits: difference,
        reasonCode: input.reasonCode,
        note: input.note,
        adjustmentId: adjustment.id,
        adjustmentInventoryEventId: event.id,
      });
      line.physicalBaseUnits = finalizedLine.physicalBaseUnits;
      line.differenceBaseUnits = finalizedLine.differenceBaseUnits;
      line.reasonCode = finalizedLine.reasonCode;
      line.note = finalizedLine.note;
      line.adjustmentId = finalizedLine.adjustmentId;
      line.adjustmentInventoryEventId = finalizedLine.adjustmentInventoryEventId;
    } else {
      const finalizedLine = finalizeInventoryReconciliationLine(adapter, {
        id: line.id,
        physicalBaseUnits: physical,
        differenceBaseUnits: difference,
        reasonCode: input.reasonCode,
        note: input.note,
      });
      line.physicalBaseUnits = finalizedLine.physicalBaseUnits;
      line.differenceBaseUnits = finalizedLine.differenceBaseUnits;
      line.reasonCode = finalizedLine.reasonCode;
      line.note = finalizedLine.note;
    }
    let guidedAssignment: InventoryCheckAssignmentRow | null = null;
    let guidedAttempt: InventoryCheckAttemptRow | null = null;
    if (reconciliation.checkAssignmentId) {
      const completedGuided = completeInventoryCheckAssignmentForReconciliation(adapter, {
        assignmentId: reconciliation.checkAssignmentId,
        reconciliationId: reconciliation.id,
        completedAt: generateAt,
        closedByStoreMemberId: memberId,
        closedByUserId: input.userId,
        closedByDeviceId: input.deviceId,
      });
      guidedAssignment = completedGuided.assignment;
      guidedAttempt = completedGuided.attempt;
    }
    const completed = completeInventoryReconciliation(adapter, {
      id: reconciliation.id,
      finalizationOperationId: input.operationId,
      completedAt: generateAt,
    });
    const outbox = enqueueOutboxOperation(adapter, {
      operationType: 'RECONCILIATION_FINALIZED',
      operationId: input.operationId,
      storeId: input.storeId,
      deviceId: input.deviceId,
      entityType: 'RECONCILIATION',
      entityId: completed.id,
      occurredAt: generateAt,
      entities: {
        batchTrackingVersion: 1,
        reconciliationVersion: 1,
        request: fingerprint(input),
        reconciliation: completed,
        line,
        submissions: listInventoryReconciliationSubmissionsByLine(adapter, line.id),
        groupCounts: savedCounts,
        adjustment,
        adjustmentLines,
        inventoryEvents,
        costMovements,
        costStates,
        batchOperations,
        batchEntries,
        guidedAssignment,
        guidedAttempt,
      },
    });
    return {
      reconciliation: completed,
      line,
      submissions: listInventoryReconciliationSubmissionsByLine(adapter, line.id),
      groupCounts: savedCounts,
      adjustment,
      adjustmentLines,
      inventoryEvents,
      costMovements,
      costStates,
      batchOperations,
      batchEntries,
      guidedAssignment,
      guidedAttempt,
      outbox,
    };
  });
}
