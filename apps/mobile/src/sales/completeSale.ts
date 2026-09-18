import {
  calculateSaleLine,
  calculateSaleTotals,
  type CalculatedSaleLine,
  DomainError,
  applySaleCostState,
} from '@retail/domain';

import { generateMobileId } from '../crypto/mobileIds';
import type { DatabaseAdapter } from '../db/adapter';
import {
  createCustomerAccount,
  createInventoryEvent,
  applySaleCostMovement,
  createPayment,
  createReceivable,
  createSale,
  createSaleItem,
  createSaleItemCostSnapshot,
  type CustomerAccountRow,
  type CostMovementRow,
  type CostStateRow,
  enqueueOutboxOperation,
  findExpectedOutboxReplay,
  getCostState,
  getCustomerAccountById,
  getDeviceById,
  getPackageUnitById,
  getProductVariantById,
  getReceivableBySaleId,
  getSaleById,
  getStoreById,
  getStoreProductById,
  getInventoryBalanceByStoreProduct,
  type InventoryEventRow,
  listCostMovementsBySource,
  listInventoryEventsBySource,
  listPaymentsBySaleId,
  listSaleItemCostSnapshotsBySaleId,
  listSaleItemsBySaleId,
  type OutboxOperationRow,
  type PaymentMethod,
  type PaymentRow,
  type ReceivableRow,
  type SaleItemRow,
  type SaleItemCostSnapshotRow,
  type SaleRow,
} from '../db/repositories';
import { nowIso, requireId } from '../db/repositories/common';

export interface CompleteSaleLineInput {
  storeProductId: string;
  packageUnitId: string;
  /** Quantity of packages sold in D-034 micro-units (> 0). */
  quantityPackagesMicros: number;
  /** Unit selling price in integer minor units (>= 0). */
  unitPriceMinor: number;
  /** Optional absolute line discount in integer minor units (>= 0). */
  discountAmountMinor?: number;
}

export interface CompleteSalePaymentInput {
  method: PaymentMethod;
  /** Required when method is CREDIT: non-empty customer name. */
  customerName?: string;
  /** Optional customer account ID if an existing customer was explicitly selected. */
  customerAccountId?: string;
  paymentReference?: string | null;
}

export interface CompleteSaleInput {
  storeId: string;
  deviceId: string;
  userId: string;
  lines: CompleteSaleLineInput[];
  payment: CompleteSalePaymentInput;
  note?: string | null;
}

export interface CompleteSaleOptions {
  generateId?: () => string;
  operationId?: string;
}

export interface CompletedSaleGraph {
  sale: SaleRow;
  items: SaleItemRow[];
  payment: PaymentRow;
  inventoryEvents: InventoryEventRow[];
  costSnapshots: SaleItemCostSnapshotRow[];
  costMovements: CostMovementRow[];
  costStates: CostStateRow[];
  customerAccount: CustomerAccountRow | null;
  receivable: ReceivableRow | null;
  outbox: OutboxOperationRow;
}

/**
 * Application boundary for completing a sale offline (PRD section 11, D-013,
 * D-036, D-037).
 *
 * Validates store, device, user, product, package, sellability, and exact
 * arithmetic before committing the complete transaction graph:
 *   - Sale
 *   - SaleItems
 *   - Payment
 *   - InventoryEvents (one negative SALE event per line)
 *   - Optional CustomerAccount + OPEN Receivable (for credit sales)
 *   - Exactly one PENDING COMPLETED_SALE_CREATED outbox envelope
 *
 * Inside a single SQLite transaction: all commit together or none at all.
 * Repeating the same operationId returns the original graph without duplicate
 * effects.
 */
export function completeSale(
  adapter: DatabaseAdapter,
  input: CompleteSaleInput,
  options: CompleteSaleOptions = {},
): CompletedSaleGraph {
  const generateId = options.generateId ?? generateMobileId;
  const storeId = requireId(input.storeId);
  const deviceId = requireId(input.deviceId);
  const userId = requireId(input.userId);
  const operationId = options.operationId === undefined ? generateId() : requireId(options.operationId);

  // 1. Validate store, device, user before resolving a replay. An operation
  // ID is not an authorization token: a caller on the same device must not be
  // able to use it to read another member's completed sale.
  const store = getStoreById(adapter, storeId);
  if (!store || store.status !== 'ACTIVE') {
    throw new DomainError('INVALID_VALUE', 'Store does not exist or is not active.');
  }

  const device = getDeviceById(adapter, deviceId);
  if (!device || device.storeId !== storeId || device.status !== 'ACTIVE') {
    throw new DomainError('INVALID_VALUE', 'Device does not belong to this store or is not active.');
  }

  const memberRow = adapter.getFirstRow<{ id: string; status: string }>(
    `SELECT id, status FROM store_members WHERE store_id = ? AND user_id = ? AND status = 'ACTIVE';`,
    [storeId, userId],
  );
  if (!memberRow) {
    throw new DomainError('INVALID_VALUE', 'User is not an active member of this store.');
  }

  // 2. Idempotent replay check after actor/device/store authorization.
  const replayed = findExpectedOutboxReplay(adapter, {
    operationId,
    storeId,
    deviceId,
    operationType: 'COMPLETED_SALE_CREATED',
    entityType: 'SALE',
  });
  if (replayed) {
    return rehydrateCompletedSale(adapter, replayed, { storeId, deviceId, userId });
  }

  // 3. Validate lines
  if (!Array.isArray(input.lines) || input.lines.length === 0) {
    throw new DomainError('INVALID_VALUE', 'A sale must have at least one line.');
  }

  interface ValidatedLine {
    storeProductId: string;
    productVariantId: string;
    packageUnitId: string;
    productNameSnapshot: string;
    packageNameSnapshot: string;
    calculated: CalculatedSaleLine;
  }

  const validatedLines: ValidatedLine[] = [];

  for (const line of input.lines) {
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
    if (
      !packageUnit ||
      packageUnit.productVariantId !== variant.id ||
      packageUnit.status !== 'ACTIVE'
    ) {
      throw new DomainError('INVALID_VALUE', 'Package unit does not belong to this variant or is not active.');
    }

    if (!packageUnit.isSellable) {
      throw new DomainError('INVALID_VALUE', `Package unit ${packageUnit.name} is not sellable.`);
    }

    const calculated = calculateSaleLine({
      quantityPackagesMicros: line.quantityPackagesMicros,
      conversionToBaseMicros: packageUnit.conversionToBaseMicros,
      unitPriceMinor: line.unitPriceMinor,
      discountAmountMinor: line.discountAmountMinor,
    });

    validatedLines.push({
      storeProductId,
      productVariantId: variant.id,
      packageUnitId,
      productNameSnapshot: variant.name,
      packageNameSnapshot: packageUnit.name,
      calculated,
    });
  }

  // 4. Calculate sale totals
  const totals = calculateSaleTotals(validatedLines.map((l) => l.calculated));

  // 5. Validate payment
  const paymentMethod = input.payment.method;
  let customerAccount: CustomerAccountRow | null = null;

  if (paymentMethod === 'CREDIT') {
    if (totals.totalMinor <= 0) {
      throw new DomainError('INVALID_MONEY', 'Credit sales must have a positive total amount owed.');
    }

    const rawCustomerName = input.payment.customerName;
    if (typeof rawCustomerName !== 'string' || rawCustomerName.trim().length === 0) {
      throw new DomainError('INVALID_VALUE', 'Credit sales require a customer name.');
    }
    const customerName = rawCustomerName.trim();
    if (customerName.length > 200) {
      throw new DomainError('INVALID_VALUE', 'Customer name exceeds 200 characters.');
    }

    if (input.payment.customerAccountId) {
      const existingAccount = getCustomerAccountById(adapter, input.payment.customerAccountId);
      if (!existingAccount || existingAccount.storeId !== storeId || existingAccount.status !== 'ACTIVE') {
        throw new DomainError('INVALID_VALUE', 'Selected customer account does not exist or is not active.');
      }
      customerAccount = existingAccount;
    }
  }

  const occurredAt = nowIso();
  const saleId = generateId();

  // 6. Commit atomic transaction
  return adapter.transaction(() => {
    // 6a. Create or select customer account if credit
    if (paymentMethod === 'CREDIT' && !customerAccount) {
      customerAccount = createCustomerAccount(adapter, {
        id: generateId(),
        storeId,
        name: input.payment.customerName!.trim(),
        createdAt: occurredAt,
        updatedAt: occurredAt,
      });
    }

    // 6b. Create sale
    const sale = createSale(adapter, {
      id: saleId,
      storeId,
      deviceId,
      createdByUserId: userId,
      occurredAt,
      currencyCode: store.currencyCode,
      subtotalMinor: totals.subtotalMinor,
      discountTotalMinor: totals.discountTotalMinor,
      totalMinor: totals.totalMinor,
      status: 'COMPLETED',
      note: input.note,
      createdAt: occurredAt,
      completedAt: occurredAt,
    });

    // 6c. Create sale items and resolve provisional cost in the same
    // transaction. Legacy integer cost fields stay null for fractional
    // rational unit costs; the immutable M4 snapshot carries the exact basis.
    const items: SaleItemRow[] = [];
    const inventoryEvents: InventoryEventRow[] = [];
    const costSnapshots: SaleItemCostSnapshotRow[] = [];
    const costMovements: CostMovementRow[] = [];
    const costStates: CostStateRow[] = [];
    for (const vLine of validatedLines) {
      let priorBalance = 0;
      try {
        priorBalance = getInventoryBalanceByStoreProduct(adapter, vLine.storeProductId);
      } catch (error) {
        // M3 deliberately preserves an append-only sale even when a legacy
        // derived stock projection is already outside the safe read range.
        // Cost is honestly unavailable for that line; the immutable sale and
        // inventory event still commit, and a later read reports the overflow.
        if (!(error instanceof DomainError) || error.code !== 'INVALID_QUANTITY') {
          throw error;
        }
      }
      const currentCostState = getCostState(adapter, vLine.storeProductId);
      const costStateInput = currentCostState
        ? {
            coverageStatus: currentCostState.coverageStatus,
            quantityCostedBaseMicros: currentCostState.quantityCostedBaseMicros,
            remainingValue: currentCostState.remainingValue,
            averageUnitCost: currentCostState.averageUnitCost,
          }
        : {
            coverageStatus: 'KNOWN' as const,
            quantityCostedBaseMicros: 0,
            remainingValue: { numerator: '0', denominator: '1' },
            averageUnitCost: null,
          };
      let costTransition;
      try {
        costTransition = applySaleCostState(costStateInput, {
          priorInventoryBalanceBaseMicros: priorBalance,
          saleQuantityBaseMicros: vLine.calculated.quantityBaseMicros,
        });
      } catch (error) {
        if (!(error instanceof DomainError) || error.code !== 'INVALID_QUANTITY') throw error;
        // A pre-existing M3 inventory projection may be at the safe boundary;
        // keep the sale append-only and mark this line's provisional cost as
        // unavailable instead of making costing change M3 overflow behaviour.
        priorBalance = 0;
        costTransition = applySaleCostState(costStateInput, {
          priorInventoryBalanceBaseMicros: priorBalance,
          saleQuantityBaseMicros: vLine.calculated.quantityBaseMicros,
        });
      }
      const legacyUnitCost = costTransition.available && currentCostState?.averageUnitCost?.denominator === '1'
        ? Number(currentCostState.averageUnitCost.numerator)
        : null;
      const item = createSaleItem(adapter, {
        id: generateId(),
        saleId: sale.id,
        storeProductId: vLine.storeProductId,
        productVariantId: vLine.productVariantId,
        packageUnitId: vLine.packageUnitId,
        quantityPackagesMicros: vLine.calculated.quantityPackagesMicros,
        conversionToBaseSnapshotMicros: vLine.calculated.conversionToBaseMicros,
        quantityBaseMicros: vLine.calculated.quantityBaseMicros,
        unitPriceMinor: vLine.calculated.unitPriceMinor,
        grossTotalMinor: vLine.calculated.grossTotalMinor,
        discountAmountMinor: vLine.calculated.discountAmountMinor,
        netTotalMinor: vLine.calculated.netTotalMinor,
        unitCostBaseSnapshotMinor: legacyUnitCost,
        cogsAmountMinor: costTransition.cogsAmountMinor,
        productNameSnapshot: vLine.productNameSnapshot,
        packageNameSnapshot: vLine.packageNameSnapshot,
        createdAt: occurredAt,
      });
      items.push(item);

      const event = createInventoryEvent(adapter, {
        id: generateId(),
        storeId,
        storeProductId: item.storeProductId,
        eventType: 'SALE',
        quantityBaseDeltaMicros: -item.quantityBaseMicros,
        packageUnitId: item.packageUnitId,
        quantityPackageSnapshotMicros: item.quantityPackagesMicros,
        conversionToBaseSnapshotMicros: item.conversionToBaseSnapshotMicros,
        sourceType: 'SALE',
        sourceId: sale.id,
        occurredAt,
        createdByUserId: userId,
        deviceId,
        createdAt: occurredAt,
      });
      inventoryEvents.push(event);

      const applied = applySaleCostMovement(adapter, {
        id: generateId(),
        storeId,
        storeProductId: item.storeProductId,
        sourceId: sale.id,
        sourceLineId: item.id,
        quantityBaseMicros: item.quantityBaseMicros,
        priorInventoryBalanceBaseMicros: priorBalance,
        createdAt: occurredAt,
      });
      costMovements.push(applied.movement);
      costStates.push(applied.state);
      costSnapshots.push(createSaleItemCostSnapshot(adapter, {
        saleItemId: item.id,
        saleId: sale.id,
        storeId,
        storeProductId: item.storeProductId,
        quantityBaseMicros: item.quantityBaseMicros,
        costedQuantityBaseMicros: applied.transition.costedQuantityBaseMicros,
        coverageStatus: applied.transition.available ? 'AVAILABLE' : 'UNAVAILABLE',
        unitCost: applied.transition.available ? currentCostState?.averageUnitCost ?? null : null,
        cogs: applied.transition.available ? applied.transition.valueConsumed : null,
        cogsAmountMinor: applied.transition.cogsAmountMinor,
        createdAt: occurredAt,
      }));
    }

    // 6d. Create payment
    const payment = createPayment(adapter, {
      id: generateId(),
      saleId: sale.id,
      method: paymentMethod,
      amountMinor: totals.totalMinor,
      currencyCode: store.currencyCode,
      recordedByUserId: userId,
      paymentReference: input.payment.paymentReference,
      createdAt: occurredAt,
    });

    // 6e. Create receivable if credit
    let receivable: ReceivableRow | null = null;
    if (paymentMethod === 'CREDIT') {
      if (!customerAccount) {
        throw new Error('Customer account was not resolved for credit sale.');
      }
      receivable = createReceivable(adapter, {
        id: generateId(),
        storeId,
        saleId: sale.id,
        customerAccountId: customerAccount.id,
        originalAmountMinor: totals.totalMinor,
        outstandingAmountMinor: totals.totalMinor,
        status: 'OPEN',
        createdAt: occurredAt,
        updatedAt: occurredAt,
      });
    }

    // 6f. Enqueue single outbox envelope
    const outbox = enqueueOutboxOperation(adapter, {
      operationType: 'COMPLETED_SALE_CREATED',
      operationId,
      storeId,
      deviceId,
      entityType: 'SALE',
      entityId: sale.id,
      occurredAt,
      entities: {
        sale,
        items,
        payment,
        inventoryEvents,
        costSnapshots,
        costMovements,
        costStates,
        customerAccount,
        receivable,
      },
    });

    return {
      sale,
      items,
      payment,
      inventoryEvents,
      costSnapshots,
      costMovements,
      costStates,
      customerAccount,
      receivable,
      outbox,
    };
  });
}

function rehydrateCompletedSale(
  adapter: DatabaseAdapter,
  outbox: OutboxOperationRow,
  expected: { storeId: string; deviceId: string; userId: string },
): CompletedSaleGraph {
  const sale = getSaleById(adapter, outbox.entityId);
  if (!sale) {
    throw new Error('Outbox replay references a sale that does not exist.');
  }
  if (sale.storeId !== expected.storeId || sale.deviceId !== expected.deviceId) {
    throw new Error('Outbox replay does not match its completed sale ownership.');
  }
  if (sale.createdByUserId !== expected.userId) {
    throw new DomainError(
      'INVALID_VALUE',
      'This operation ID belongs to a sale recorded by a different store member.',
    );
  }

  const items = listSaleItemsBySaleId(adapter, sale.id);
  const payments = listPaymentsBySaleId(adapter, sale.id);
  if (payments.length === 0) {
    throw new Error('Outbox replay references a sale with no payments.');
  }
  const payment = payments[0];

  const receivable = getReceivableBySaleId(adapter, sale.id);
  const customerAccount = receivable ? getCustomerAccountById(adapter, receivable.customerAccountId) : null;

  const inventoryEvents = listInventoryEventsBySource(adapter, 'SALE', sale.id);
  const costSnapshots = listSaleItemCostSnapshotsBySaleId(adapter, sale.id);
  const costMovements = listCostMovementsBySource(adapter, 'SALE', sale.id);
  const envelope = JSON.parse(outbox.payload) as { entities?: { costStates?: CostStateRow[] } };
  const costStates: CostStateRow[] = Array.isArray(envelope.entities?.costStates)
    ? envelope.entities.costStates
    : items
        .map((item) => getCostState(adapter, item.storeProductId))
        .filter((state): state is CostStateRow => state !== null);

  return {
    sale,
    items,
    payment,
    inventoryEvents,
    costSnapshots,
    costMovements,
    costStates,
    customerAccount,
    receivable,
    outbox,
  };
}
