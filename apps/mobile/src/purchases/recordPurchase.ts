import {
  convertPackagesToBase,
  DomainError,
  normalizePurchaseCost,
  normalizeBatchDate,
  type BatchDateMeaning,
  type BatchDatePrecision,
  type NormalizedPurchaseCost,
} from '@retail/domain';

import { generateMobileId } from '../crypto/mobileIds';
import type { DatabaseAdapter } from '../db/adapter';
import {
  applyPurchaseCostMovement,
  createInventoryEvent,
  createPriceObservation,
  createPurchase,
  createPurchaseItem,
  createSupplier,
  enqueueOutboxOperation,
  findExpectedOutboxReplay,
  getCostState,
  getDeviceById,
  getInventoryBalanceByStoreProduct,
  getInventoryBalanceBigIntByStoreProduct,
  getPackageUnitById,
  getProductVariantById,
  getPurchaseById,
  getStoreById,
  getSupplierById,
  listCostMovementsBySource,
  listBatchInventoryEntriesByOperation,
  listBatchInventoryOperationsByEvent,
  listInventoryEventsBySource,
  listPriceObservationsByPurchaseItemId,
  listPurchaseItemsByPurchaseId,
  type CostMovementRow,
  type CostStateRow,
  type InventoryEventRow,
  type OutboxOperationRow,
  type PriceObservationRow,
  type PurchaseItemRow,
  type PurchaseRow,
  type SupplierRow,
} from '../db/repositories';
import { getStoreProductById } from '../db/repositories/storeProducts';
import { nowIso, requireId, requireText } from '../db/repositories/common';
import { recordReceiptBatchAllocation } from '../inventory/batchAllocation';

export interface RecordPurchaseLineInput {
  storeProductId: string;
  packageUnitId: string;
  /** D-034 package quantity in micro-units (> 0). */
  quantityPackagesMicros: number;
  /** M4-01 uses TOTAL; M4-02 may select UNIT. */
  costBasis?: 'TOTAL' | 'UNIT';
  /** Total line cost or per-package unit cost, in integer minor units. */
  enteredCostMinor: number;
  /** Optional printed expiry/best-before facts; omitted means UNKNOWN. */
  expiryPrecision?: BatchDatePrecision;
  expiryValue?: string | null;
  expiryMeaning?: BatchDateMeaning;
  printedBatchNumber?: string | null;
}

export interface RecordPurchaseInput {
  storeId: string;
  deviceId: string;
  userId: string;
  lines: RecordPurchaseLineInput[];
  supplierId?: string | null;
  supplierName?: string | null;
  occurredAt?: string;
}

export interface RecordPurchaseOptions {
  generateId?: () => string;
  operationId?: string;
}

export interface CompletedPurchaseGraph {
  purchase: PurchaseRow;
  supplier: SupplierRow | null;
  items: PurchaseItemRow[];
  inventoryEvents: InventoryEventRow[];
  observations: PriceObservationRow[];
  costMovements: CostMovementRow[];
  costStates: CostStateRow[];
  batchGroups: import('../db/repositories').InventoryBatchGroupRow[];
  batchOperations: import('../db/repositories').BatchInventoryOperationRow[];
  batchEntries: import('../db/repositories').BatchInventoryEntryRow[];
  outbox: OutboxOperationRow;
}

interface ValidatedPurchaseLine {
  storeProductId: string;
  productVariantId: string;
  packageUnitId: string;
  productNameSnapshot: string;
  packageNameSnapshot: string;
  quantityPackagesMicros: number;
  conversionToBaseSnapshotMicros: number;
  quantityBaseMicros: number;
  normalized: NormalizedPurchaseCost;
  expiryPrecision: BatchDatePrecision;
  expiryValue: string | null;
  expiryMeaning: BatchDateMeaning;
  printedBatchNumber: string | null;
}

function checkedTotal(values: readonly number[]): number {
  let total = 0n;
  for (const value of values) {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new DomainError('INVALID_MONEY', 'Purchase totals must be non-negative safe integers.');
    }
    total += BigInt(value);
  }
  if (total > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new DomainError('INVALID_MONEY', 'Purchase total exceeds the safe integer range.');
  }
  return Number(total);
}

function validateSupplierInput(input: RecordPurchaseInput): { supplierId: string | null; supplierName: string | null } {
  const supplierId = input.supplierId === undefined || input.supplierId === null ? null : requireId(input.supplierId);
  const supplierName = input.supplierName === undefined || input.supplierName === null || input.supplierName.trim().length === 0
    ? null
    : requireText(input.supplierName.trim(), 'Supplier name', 200);
  if (supplierId && supplierName) {
    throw new DomainError('INVALID_VALUE', 'Choose an existing supplier or enter a new supplier name, not both.');
  }
  return { supplierId, supplierName };
}

function validateLines(adapter: DatabaseAdapter, storeId: string, lines: readonly RecordPurchaseLineInput[]): ValidatedPurchaseLine[] {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new DomainError('INVALID_VALUE', 'A purchase must have at least one line.');
  }
  if (lines.length > 100) {
    throw new DomainError('INVALID_VALUE', 'A purchase cannot contain more than 100 lines.');
  }
  return lines.map((line) => {
    const storeProductId = requireId(line.storeProductId);
    const packageUnitId = requireId(line.packageUnitId);
    const storeProduct = getStoreProductById(adapter, storeProductId);
    if (!storeProduct || storeProduct.storeId !== storeId || storeProduct.status !== 'ACTIVE') {
      throw new DomainError('INVALID_VALUE', 'Product does not belong to this store or is not active.');
    }
    const variant = getProductVariantById(adapter, storeProduct.productVariantId);
    if (!variant || variant.status !== 'ACTIVE') {
      throw new DomainError('INVALID_VALUE', 'Product variant does not exist or is not active.');
    }
    if (variant.identityScope === 'STORE_LOCAL' && variant.ownerStoreId !== storeId) {
      throw new DomainError('INVALID_VALUE', 'Product variant belongs to another store.');
    }
    const packageUnit = getPackageUnitById(adapter, packageUnitId);
    if (!packageUnit || packageUnit.productVariantId !== variant.id || packageUnit.status !== 'ACTIVE') {
      throw new DomainError('INVALID_VALUE', 'Package unit does not belong to this variant or is not active.');
    }
    if (!packageUnit.isPurchasable) {
      throw new DomainError('INVALID_VALUE', `Package unit ${packageUnit.name} is not purchasable.`);
    }
    const quantityBaseMicros = convertPackagesToBase(
      line.quantityPackagesMicros,
      packageUnit.conversionToBaseMicros,
    );
    if (quantityBaseMicros <= 0) {
      throw new DomainError('INVALID_QUANTITY', 'Purchase quantity must convert to a positive base quantity.');
    }
    const normalized = normalizePurchaseCost({
      basis: line.costBasis ?? 'TOTAL',
      enteredCostMinor: line.enteredCostMinor,
      quantityPackagesMicros: line.quantityPackagesMicros,
      quantityBaseMicros,
    });
    const batchDate = normalizeBatchDate({
      precision: line.expiryPrecision,
      value: line.expiryValue,
      meaning: line.expiryMeaning,
      printedBatchNumber: line.printedBatchNumber,
    });
    return {
      storeProductId,
      productVariantId: variant.id,
      packageUnitId,
      productNameSnapshot: variant.name,
      packageNameSnapshot: packageUnit.name,
      quantityPackagesMicros: line.quantityPackagesMicros,
      conversionToBaseSnapshotMicros: packageUnit.conversionToBaseMicros,
      quantityBaseMicros,
      normalized,
      expiryPrecision: batchDate.precision,
      expiryValue: batchDate.value,
      expiryMeaning: batchDate.meaning,
      printedBatchNumber: batchDate.printedBatchNumber,
    };
  });
}

/**
 * Record a complete offline purchase aggregate.  Every purchase row, item,
 * positive inventory event, provisional cost movement/state, private price
 * observation, and one outbox envelope commit together in one SQLite
 * transaction.  The same operation ID rehydrates the original graph.
 */
export function recordPurchase(
  adapter: DatabaseAdapter,
  input: RecordPurchaseInput,
  options: RecordPurchaseOptions = {},
): CompletedPurchaseGraph {
  const generateId = options.generateId ?? generateMobileId;
  const storeId = requireId(input.storeId);
  const deviceId = requireId(input.deviceId);
  const userId = requireId(input.userId);
  const operationId = options.operationId === undefined ? generateId() : requireId(options.operationId);

  const store = getStoreById(adapter, storeId);
  if (!store || store.status !== 'ACTIVE') {
    throw new DomainError('INVALID_VALUE', 'Store does not exist or is not active.');
  }
  const device = getDeviceById(adapter, deviceId);
  if (!device || device.storeId !== storeId || device.status !== 'ACTIVE') {
    throw new DomainError('INVALID_VALUE', 'Device does not belong to this store or is not active.');
  }
  const member = adapter.getFirstRow<{ id: string; status: string }>(
    `SELECT id, status FROM store_members WHERE store_id = ? AND user_id = ? AND status = 'ACTIVE';`,
    [storeId, userId],
  );
  if (!member) {
    throw new DomainError('INVALID_VALUE', 'User is not an active member of this store.');
  }

  const replayed = findExpectedOutboxReplay(adapter, {
    operationId,
    storeId,
    deviceId,
    operationType: 'COMPLETED_PURCHASE_CREATED',
    entityType: 'PURCHASE',
  });
  if (replayed) {
    assertReplayMatchesRequest(replayed, input);
    return rehydrateCompletedPurchase(adapter, replayed, { storeId, deviceId, userId });
  }

  const supplierInput = validateSupplierInput(input);
  if (supplierInput.supplierId) {
    const supplier = getSupplierById(adapter, supplierInput.supplierId);
    if (!supplier || supplier.storeId !== storeId || supplier.status !== 'ACTIVE') {
      throw new DomainError('INVALID_VALUE', 'Selected supplier does not exist or is not active.');
    }
  }
  const validatedLines = validateLines(adapter, storeId, input.lines);
  const totalAmountMinor = checkedTotal(validatedLines.map((line) => line.normalized.totalCostMinor));
  const occurredAt = input.occurredAt === undefined ? nowIso() : requireText(input.occurredAt, 'occurredAt', 64);
  const purchaseId = generateId();

  return adapter.transaction(() => {
    // Repeat the ownership/active checks inside the write transaction so a
    // deactivated package or product can never be committed from stale UI.
    const transactionalLines = validateLines(adapter, storeId, input.lines);
    const transactionalTotal = checkedTotal(transactionalLines.map((line) => line.normalized.totalCostMinor));
    if (transactionalTotal !== totalAmountMinor) {
      throw new DomainError('INVALID_MONEY', 'Purchase changed while it was being recorded.');
    }

    let supplier: SupplierRow | null = null;
    if (supplierInput.supplierId) {
      supplier = getSupplierById(adapter, supplierInput.supplierId);
      if (!supplier || supplier.storeId !== storeId || supplier.status !== 'ACTIVE') {
        throw new DomainError('INVALID_VALUE', 'Selected supplier does not exist or is not active.');
      }
    } else if (supplierInput.supplierName) {
      supplier = createSupplier(adapter, {
        id: generateId(),
        storeId,
        name: supplierInput.supplierName,
        createdAt: occurredAt,
        updatedAt: occurredAt,
      });
    }

    const purchase = createPurchase(adapter, {
      id: purchaseId,
      storeId,
      supplierId: supplier?.id ?? null,
      supplierNameSnapshot: supplier?.name ?? null,
      createdByStoreMemberId: member.id,
      createdByUserId: userId,
      deviceId,
      occurredAt,
      currencyCode: store.currencyCode,
      totalAmountMinor,
      createdAt: occurredAt,
      completedAt: occurredAt,
    });

    const items: PurchaseItemRow[] = [];
    const inventoryEvents: InventoryEventRow[] = [];
    const observations: PriceObservationRow[] = [];
    const costMovements: CostMovementRow[] = [];
    const costStates: CostStateRow[] = [];
    const batchGroups: import('../db/repositories').InventoryBatchGroupRow[] = [];
    const batchOperations: import('../db/repositories').BatchInventoryOperationRow[] = [];
    const batchEntries: import('../db/repositories').BatchInventoryEntryRow[] = [];

    for (const line of transactionalLines) {
      const item = createPurchaseItem(adapter, {
        id: generateId(),
        purchaseId: purchase.id,
        storeId,
        storeProductId: line.storeProductId,
        productVariantId: line.productVariantId,
        packageUnitId: line.packageUnitId,
        quantityPackagesMicros: line.quantityPackagesMicros,
        conversionToBaseSnapshotMicros: line.conversionToBaseSnapshotMicros,
        quantityBaseMicros: line.quantityBaseMicros,
        costBasis: line.normalized.basis,
        enteredCostMinor: line.normalized.enteredCostMinor,
        totalPurchaseCostMinor: line.normalized.totalCostMinor,
        packageCostNumerator: line.normalized.packageUnitCost.numerator,
        packageCostDenominator: line.normalized.packageUnitCost.denominator,
        baseUnitCostNumerator: line.normalized.baseUnitCost.numerator,
        baseUnitCostDenominator: line.normalized.baseUnitCost.denominator,
        currencyCode: store.currencyCode,
        productNameSnapshot: line.productNameSnapshot,
        packageNameSnapshot: line.packageNameSnapshot,
        createdAt: occurredAt,
      });
      items.push(item);

      const priorBalanceBigInt = getInventoryBalanceBigIntByStoreProduct(adapter, line.storeProductId);
      let priorBalance: number;
      let costOverflowed = false;
      try {
        priorBalance = getInventoryBalanceByStoreProduct(adapter, line.storeProductId);
      } catch (error) {
        if (!(error instanceof DomainError) || error.code !== 'INVALID_QUANTITY') throw error;
        priorBalance = 0;
        costOverflowed = true;
      }
      const inventoryEvent = createInventoryEvent(adapter, {
        id: generateId(),
        storeId,
        storeProductId: line.storeProductId,
        eventType: 'PURCHASE',
        quantityBaseDeltaMicros: line.quantityBaseMicros,
        packageUnitId: line.packageUnitId,
        quantityPackageSnapshotMicros: line.quantityPackagesMicros,
        conversionToBaseSnapshotMicros: line.conversionToBaseSnapshotMicros,
        sourceType: 'PURCHASE',
        sourceId: purchase.id,
        occurredAt,
        createdByUserId: userId,
        deviceId,
        createdAt: occurredAt,
      });
      inventoryEvents.push(inventoryEvent);

      const applied = applyPurchaseCostMovement(adapter, {
        id: generateId(),
        storeId,
        storeProductId: line.storeProductId,
        sourceId: purchase.id,
        sourceLineId: item.id,
        quantityBaseMicros: line.quantityBaseMicros,
        baseUnitCost: line.normalized.baseUnitCost,
        priorInventoryBalanceBaseMicros: priorBalance,
        forceUnknown: costOverflowed,
        createdAt: occurredAt,
      });
      costMovements.push(applied.movement);
      costStates.push(applied.state);

      const batchAllocation = recordReceiptBatchAllocation(adapter, {
        id: generateId(),
        storeId,
        storeProductId: line.storeProductId,
        purchaseItemId: item.id,
        inventoryEventId: inventoryEvent.id,
        quantityBaseMicros: line.quantityBaseMicros,
        priorInventoryBalanceBaseMicros: priorBalanceBigInt,
        printedBatchNumber: line.printedBatchNumber,
        datePrecision: line.expiryPrecision,
        dateValue: line.expiryValue,
        dateMeaning: line.expiryMeaning,
        recordedByStoreMemberId: member.id,
        recordedByUserId: userId,
        deviceId,
        generateId,
        createdAt: occurredAt,
      });
      batchGroups.push(batchAllocation.group!);
      batchOperations.push(batchAllocation.operation);
      batchEntries.push(...batchAllocation.entries);

      observations.push(createPriceObservation(adapter, {
        id: generateId(),
        storeId,
        purchaseItemId: item.id,
        productVariantId: item.productVariantId,
        packageUnitId: item.packageUnitId,
        supplierId: supplier?.id ?? null,
        costBasis: item.costBasis,
        enteredCostMinor: item.enteredCostMinor,
        observedPriceMinor: item.totalPurchaseCostMinor,
        totalPurchaseCostMinor: item.totalPurchaseCostMinor,
        quantityPackagesMicros: item.quantityPackagesMicros,
        conversionToBaseSnapshotMicros: item.conversionToBaseSnapshotMicros,
        quantityBaseMicros: item.quantityBaseMicros,
        packageCostNumerator: item.packageCostNumerator,
        packageCostDenominator: item.packageCostDenominator,
        baseUnitCostNumerator: item.baseUnitCostNumerator,
        baseUnitCostDenominator: item.baseUnitCostDenominator,
        currencyCode: item.currencyCode,
        sourceId: item.id,
        observedAt: occurredAt,
        createdAt: occurredAt,
      }));
    }

    const outbox = enqueueOutboxOperation(adapter, {
      operationType: 'COMPLETED_PURCHASE_CREATED',
      operationId,
      storeId,
      deviceId,
      entityType: 'PURCHASE',
      entityId: purchase.id,
      occurredAt,
      entities: {
        purchase,
        supplier,
        items,
        inventoryEvents,
        observations,
        costMovements,
        costStates,
        batchTrackingVersion: 1,
        batchGroups,
        batchOperations,
        batchEntries,
      },
    });
    return { purchase, supplier, items, inventoryEvents, observations, costMovements, costStates, batchGroups, batchOperations, batchEntries, outbox };
  });
}

function assertReplayMatchesRequest(outbox: OutboxOperationRow, input: RecordPurchaseInput): void {
  let entities: {
    purchase?: { occurredAt?: string };
    items?: {
      id?: string;
      storeProductId?: string;
      packageUnitId?: string;
      quantityPackagesMicros?: number;
      costBasis?: string;
      enteredCostMinor?: number;
    }[];
    batchGroups?: {
      purchaseItemId?: string | null;
      datePrecision?: BatchDatePrecision;
      dateValue?: string | null;
      dateMeaning?: BatchDateMeaning;
      printedBatchNumber?: string | null;
    }[];
    supplier?: { id?: string; name?: string } | null;
  };
  try {
    entities = (JSON.parse(outbox.payload) as { entities?: typeof entities }).entities ?? {};
  } catch {
    throw new Error('Stored purchase replay envelope is not readable.');
  }
  if (input.occurredAt !== undefined && entities.purchase?.occurredAt !== input.occurredAt) {
    throw new DomainError('INVALID_VALUE', 'This operation ID already belongs to a purchase with a different occurredAt.');
  }
  const storedLines = entities.items ?? [];
  if (storedLines.length !== input.lines.length) {
    throw new DomainError('INVALID_VALUE', 'This operation ID already belongs to a different purchase request.');
  }
  input.lines.forEach((line, index) => {
    const stored = storedLines[index];
    if (
      stored.storeProductId !== line.storeProductId ||
      stored.packageUnitId !== line.packageUnitId ||
      stored.quantityPackagesMicros !== line.quantityPackagesMicros ||
      stored.costBasis !== (line.costBasis ?? 'TOTAL') ||
      stored.enteredCostMinor !== line.enteredCostMinor
    ) {
      throw new DomainError('INVALID_VALUE', 'This operation ID already belongs to a different purchase request.');
    }
  });
  const storedGroups = entities.batchGroups ?? [];
  input.lines.forEach((line, index) => {
    const requestedDate = normalizeBatchDate({
      precision: line.expiryPrecision,
      value: line.expiryValue,
      meaning: line.expiryMeaning,
      printedBatchNumber: line.printedBatchNumber,
    });
    const storedGroup = storedGroups.find((group) => group.purchaseItemId === storedLines[index]?.id) ?? storedGroups[index];
    if (!storedGroup) {
      if (requestedDate.precision !== 'UNKNOWN' || requestedDate.printedBatchNumber !== null) {
        throw new DomainError('INVALID_VALUE', 'This operation ID already belongs to a purchase with different expiry facts.');
      }
      return;
    }
    if (
      storedGroup.datePrecision !== requestedDate.precision ||
      storedGroup.dateValue !== requestedDate.value ||
      storedGroup.dateMeaning !== requestedDate.meaning ||
      (storedGroup.printedBatchNumber ?? null) !== requestedDate.printedBatchNumber
    ) {
      throw new DomainError('INVALID_VALUE', 'This operation ID already belongs to a purchase with different expiry facts.');
    }
  });
  const requestedSupplierId = input.supplierId ?? null;
  if (requestedSupplierId !== null && entities.supplier?.id !== requestedSupplierId) {
    throw new DomainError('INVALID_VALUE', 'This operation ID already belongs to a different supplier request.');
  }
  if (input.supplierName && entities.supplier?.name !== input.supplierName.trim()) {
    throw new DomainError('INVALID_VALUE', 'This operation ID already belongs to a different supplier request.');
  }
  if (!requestedSupplierId && !input.supplierName && entities.supplier) {
    throw new DomainError('INVALID_VALUE', 'This operation ID already belongs to a purchase with a supplier.');
  }
}

function rehydrateCompletedPurchase(
  adapter: DatabaseAdapter,
  outbox: OutboxOperationRow,
  expected: { storeId: string; deviceId: string; userId: string },
): CompletedPurchaseGraph {
  const purchase = getPurchaseById(adapter, outbox.entityId);
  if (!purchase) {
    throw new Error('Outbox replay references a purchase that does not exist.');
  }
  if (purchase.storeId !== expected.storeId || purchase.deviceId !== expected.deviceId) {
    throw new Error('Outbox replay does not match its completed purchase ownership.');
  }
  if (purchase.createdByUserId !== expected.userId) {
    throw new DomainError('INVALID_VALUE', 'This operation ID belongs to a purchase recorded by a different store member.');
  }
  const items = listPurchaseItemsByPurchaseId(adapter, purchase.id);
  const inventoryEvents = listInventoryEventsBySource(adapter, 'PURCHASE', purchase.id);
  const costMovements = listCostMovementsBySource(adapter, 'PURCHASE', purchase.id);
  const observations = items.flatMap((item) => listPriceObservationsByPurchaseItemId(adapter, item.id));
  const envelope = JSON.parse(outbox.payload) as { entities?: { supplier?: { id?: string } | null; costStates?: CostStateRow[] } };
  const supplierId = envelope.entities?.supplier?.id;
  const supplier = supplierId ? getSupplierById(adapter, supplierId) : null;
  const costStates = Array.isArray(envelope.entities?.costStates)
    ? envelope.entities.costStates
    : items.map((item) => getCostState(adapter, item.storeProductId)).filter((row): row is CostStateRow => row !== null);
  const batchGroups = items.flatMap((item) => adapter.getAllRows<Record<string, string | number | null>>(
    `SELECT id, store_id, store_product_id, origin, purchase_item_id, quantity_received_base_micros,
            printed_batch_number, date_precision, date_value, date_meaning, evidence_source,
            recorded_by_store_member_id, recorded_by_user_id, device_id, origin_order, created_at
     FROM inventory_batch_groups WHERE purchase_item_id = ? ORDER BY origin_order ASC;`,
    [item.id],
  )).map((row) => ({
    id: row.id as string,
    storeId: row.store_id as string,
    storeProductId: row.store_product_id as string,
    origin: row.origin as 'RECEIPT' | 'PHYSICAL_INSPECTION',
    purchaseItemId: row.purchase_item_id as string | null,
    quantityReceivedBaseMicros: row.quantity_received_base_micros as number | null,
    printedBatchNumber: row.printed_batch_number as string | null,
    datePrecision: row.date_precision as BatchDatePrecision,
    dateValue: row.date_value as string | null,
    dateMeaning: row.date_meaning as BatchDateMeaning,
    evidenceSource: row.evidence_source as 'RECEIPT' | 'PHYSICAL_INSPECTION',
    recordedByStoreMemberId: row.recorded_by_store_member_id as string,
    recordedByUserId: row.recorded_by_user_id as string,
    deviceId: row.device_id as string,
    originOrder: row.origin_order as number,
    createdAt: row.created_at as string,
  }));
  const batchOperations = inventoryEvents.flatMap((event) => listBatchInventoryOperationsByEvent(adapter, event.id));
  const batchEntries = batchOperations.flatMap((operation) => listBatchInventoryEntriesByOperation(adapter, operation.id));
  return { purchase, supplier, items, inventoryEvents, observations, costMovements, costStates, batchGroups, batchOperations, batchEntries, outbox };
}
