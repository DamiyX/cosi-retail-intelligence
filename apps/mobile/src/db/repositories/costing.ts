import {
  addRational,
  applyPurchaseCostState,
  applySaleCostState,
  initialCostState,
  makeRational,
  parseRational,
  subtractRational,
  type CostCoverageStatus,
  type CostState,
  type Rational,
  DomainError,
} from '@retail/domain';

import type { DatabaseAdapter } from '../adapter';
import { getInventoryBalanceByStoreProduct } from './inventoryEvents';
import { nowIso, requireId, requirePositiveMicros, requireText } from './common';

export interface CostStateRow {
  storeProductId: string;
  storeId: string;
  method: 'MOVING_WEIGHTED_AVERAGE';
  methodVersion: string;
  coverageStatus: CostCoverageStatus;
  quantityCostedBaseMicros: number;
  averageUnitCost: Rational | null;
  remainingValue: Rational;
  updatedAt: string;
  lastMovementId: string | null;
}

export interface CostMovementRow {
  id: string;
  storeId: string;
  storeProductId: string;
  movementType: 'PURCHASE' | 'SALE';
  sourceId: string;
  sourceLineId: string;
  applicationOrder: number;
  quantityBaseDeltaMicros: number;
  costedQuantityDeltaMicros: number;
  value: Rational;
  coverageStatus: 'KNOWN' | 'UNKNOWN' | 'UNAVAILABLE';
  unitCost: Rational | null;
  method: 'MOVING_WEIGHTED_AVERAGE';
  methodVersion: string;
  createdAt: string;
}

export interface CreateCostMovementInput {
  id: string;
  storeId: string;
  storeProductId: string;
  movementType: 'PURCHASE' | 'SALE';
  sourceId: string;
  sourceLineId: string;
  quantityBaseDeltaMicros: number;
  costedQuantityDeltaMicros: number;
  value: Rational;
  coverageStatus: 'KNOWN' | 'UNKNOWN' | 'UNAVAILABLE';
  unitCost?: Rational | null;
  applicationOrder?: number;
  methodVersion?: string;
  createdAt?: string;
}

export interface SaleItemCostSnapshotRow {
  saleItemId: string;
  saleId: string;
  storeId: string;
  storeProductId: string;
  quantityBaseMicros: number;
  costedQuantityBaseMicros: number;
  coverageStatus: 'AVAILABLE' | 'UNAVAILABLE';
  method: 'MOVING_WEIGHTED_AVERAGE';
  methodVersion: string;
  unitCost: Rational | null;
  cogs: Rational | null;
  cogsAmountMinor: number | null;
  createdAt: string;
}

export interface CreateSaleItemCostSnapshotInput {
  saleItemId: string;
  saleId: string;
  storeId: string;
  storeProductId: string;
  quantityBaseMicros: number;
  costedQuantityBaseMicros: number;
  coverageStatus: 'AVAILABLE' | 'UNAVAILABLE';
  methodVersion?: string;
  unitCost?: Rational | null;
  cogs?: Rational | null;
  cogsAmountMinor?: number | null;
  createdAt?: string;
}

type CostStateRecord = Record<string, string | number | null>;
type CostMovementRecord = Record<string, string | number | null>;
type SnapshotRecord = Record<string, string | number | null>;

function parseStoredRational(numerator: string | number | null, denominator: string | number | null, field: string): Rational {
  if (numerator === null || denominator === null) {
    throw new Error(`${field} is incomplete.`);
  }
  return parseRational({ numerator: String(numerator), denominator: String(denominator) }, field);
}

function mapState(row: CostStateRecord): CostStateRow {
  const averageUnitCost = row.average_unit_cost_numerator === null || row.average_unit_cost_denominator === null
    ? null
    : parseStoredRational(row.average_unit_cost_numerator, row.average_unit_cost_denominator, 'averageUnitCost');
  return {
    storeProductId: row.store_product_id as string,
    storeId: row.store_id as string,
    method: row.method as 'MOVING_WEIGHTED_AVERAGE',
    methodVersion: row.method_version as string,
    coverageStatus: row.coverage_status as CostCoverageStatus,
    quantityCostedBaseMicros: row.quantity_costed_base_micros as number,
    averageUnitCost,
    remainingValue: parseStoredRational(
      row.remaining_value_numerator,
      row.remaining_value_denominator,
      'remainingValue',
    ),
    updatedAt: row.updated_at as string,
    lastMovementId: (row.last_movement_id as string | null) ?? null,
  };
}

const STATE_COLUMNS =
  'store_product_id, store_id, method, method_version, coverage_status, quantity_costed_base_micros, ' +
  'average_unit_cost_numerator, average_unit_cost_denominator, remaining_value_numerator, ' +
  'remaining_value_denominator, updated_at, last_movement_id';

export function getCostState(adapter: DatabaseAdapter, storeProductId: string): CostStateRow | null {
  const row = adapter.getFirstRow<CostStateRecord>(
    `SELECT ${STATE_COLUMNS} FROM store_product_cost_states WHERE store_product_id = ?;`,
    [requireId(storeProductId)],
  );
  return row ? mapState(row) : null;
}

function upsertCostState(
  adapter: DatabaseAdapter,
  input: {
    storeProductId: string;
    storeId: string;
    state: CostState;
    movementId: string;
    updatedAt: string;
  },
): CostStateRow {
  const state = input.state;
  const averageUnitCost = state.averageUnitCost;
  adapter.run(
    `INSERT INTO store_product_cost_states
      (store_product_id, store_id, method, method_version, coverage_status, quantity_costed_base_micros,
       average_unit_cost_numerator, average_unit_cost_denominator, remaining_value_numerator,
       remaining_value_denominator, updated_at, last_movement_id)
     VALUES (?, ?, 'MOVING_WEIGHTED_AVERAGE', 'M4-MWA-1', ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(store_product_id) DO UPDATE SET
       store_id = excluded.store_id,
       method = excluded.method,
       method_version = excluded.method_version,
       coverage_status = excluded.coverage_status,
       quantity_costed_base_micros = excluded.quantity_costed_base_micros,
       average_unit_cost_numerator = excluded.average_unit_cost_numerator,
       average_unit_cost_denominator = excluded.average_unit_cost_denominator,
       remaining_value_numerator = excluded.remaining_value_numerator,
       remaining_value_denominator = excluded.remaining_value_denominator,
       updated_at = excluded.updated_at,
       last_movement_id = excluded.last_movement_id;`,
    [
      requireId(input.storeProductId),
      requireId(input.storeId),
      state.coverageStatus,
      state.quantityCostedBaseMicros,
      averageUnitCost?.numerator ?? null,
      averageUnitCost?.denominator ?? null,
      state.remainingValue.numerator,
      state.remainingValue.denominator,
      input.updatedAt,
      requireId(input.movementId),
    ],
  );
  const row = getCostState(adapter, input.storeProductId);
  if (!row) {
    throw new Error('Cost state upsert did not persist.');
  }
  return row;
}

function nextApplicationOrder(adapter: DatabaseAdapter, storeProductId: string): number {
  const row = adapter.getFirstRow<{ max_order: number | null }>(
    'SELECT MAX(application_order) AS max_order FROM cost_movements WHERE store_product_id = ?;',
    [requireId(storeProductId)],
  );
  const next = Number(row?.max_order ?? 0) + 1;
  if (!Number.isSafeInteger(next) || next <= 0) {
    throw new Error('Cost movement application order exceeds the safe integer range.');
  }
  return next;
}

function signedValueParts(value: Rational): { numerator: string; denominator: string } {
  if (!/^-?\d+$/.test(value.numerator) || !/^\d+$/.test(value.denominator) || value.denominator === '0') {
    throw new DomainError('INVALID_MONEY', 'Cost movement values must be canonical rational strings.');
  }
  return { numerator: value.numerator, denominator: value.denominator };
}

export function createCostMovement(adapter: DatabaseAdapter, input: CreateCostMovementInput): CostMovementRow {
  const id = requireId(input.id);
  const storeId = requireId(input.storeId);
  const storeProductId = requireId(input.storeProductId);
  const sourceId = requireId(input.sourceId);
  const sourceLineId = requireId(input.sourceLineId);
  if (input.movementType !== 'PURCHASE' && input.movementType !== 'SALE') {
    throw new DomainError('INVALID_VALUE', 'Unsupported cost movement type.');
  }
  if (!Number.isSafeInteger(input.quantityBaseDeltaMicros) || input.quantityBaseDeltaMicros === 0) {
    throw new DomainError('INVALID_QUANTITY', 'Cost movement quantity delta must be a non-zero safe integer.');
  }
  if (!Number.isSafeInteger(input.costedQuantityDeltaMicros)) {
    throw new DomainError('INVALID_QUANTITY', 'Costed quantity delta must be a safe integer.');
  }
  const coverageStatus = input.coverageStatus;
  if (!['KNOWN', 'UNKNOWN', 'UNAVAILABLE'].includes(coverageStatus)) {
    throw new DomainError('INVALID_VALUE', 'Unsupported cost movement coverage status.');
  }
  const value = signedValueParts(input.value);
  const unitCost = input.unitCost ?? null;
  if (unitCost) {
    parseRational(unitCost, 'unitCost');
  }
  const order = input.applicationOrder ?? nextApplicationOrder(adapter, storeProductId);
  if (!Number.isSafeInteger(order) || order <= 0) {
    throw new DomainError('INVALID_VALUE', 'Cost movement application order must be positive.');
  }
  const methodVersion = requireText(input.methodVersion ?? 'M4-MWA-1', 'methodVersion', 32);
  const createdAt = input.createdAt ?? nowIso();
  adapter.run(
    `INSERT INTO cost_movements
      (id, store_id, store_product_id, movement_type, source_id, source_line_id, application_order,
       quantity_base_delta_micros, costed_quantity_delta_micros, value_numerator, value_denominator,
       coverage_status, unit_cost_numerator, unit_cost_denominator, method, method_version, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'MOVING_WEIGHTED_AVERAGE', ?, ?);`,
    [
      id,
      storeId,
      storeProductId,
      input.movementType,
      sourceId,
      sourceLineId,
      order,
      input.quantityBaseDeltaMicros,
      input.costedQuantityDeltaMicros,
      value.numerator,
      value.denominator,
      coverageStatus,
      unitCost?.numerator ?? null,
      unitCost?.denominator ?? null,
      methodVersion,
      createdAt,
    ],
  );
  const row = adapter.getFirstRow<CostMovementRecord>(
    `SELECT id, store_id, store_product_id, movement_type, source_id, source_line_id, application_order,
            quantity_base_delta_micros, costed_quantity_delta_micros, value_numerator, value_denominator,
            coverage_status, unit_cost_numerator, unit_cost_denominator, method, method_version, created_at
     FROM cost_movements WHERE id = ?;`,
    [id],
  );
  if (!row) {
    throw new Error('Cost movement insert did not persist.');
  }
  return mapMovement(row);
}

function mapMovement(row: CostMovementRecord): CostMovementRow {
  const valueNumerator = String(row.value_numerator);
  const valueDenominator = String(row.value_denominator);
  if (!/^-?\d+$/.test(valueNumerator) || !/^\d+$/.test(valueDenominator) || valueDenominator === '0') {
    throw new Error('Stored cost movement value is not a valid rational.');
  }
  const unitCost = row.unit_cost_numerator === null || row.unit_cost_denominator === null
    ? null
    : parseStoredRational(row.unit_cost_numerator, row.unit_cost_denominator, 'unitCost');
  return {
    id: row.id as string,
    storeId: row.store_id as string,
    storeProductId: row.store_product_id as string,
    movementType: row.movement_type as CostMovementRow['movementType'],
    sourceId: row.source_id as string,
    sourceLineId: row.source_line_id as string,
    applicationOrder: row.application_order as number,
    quantityBaseDeltaMicros: row.quantity_base_delta_micros as number,
    costedQuantityDeltaMicros: row.costed_quantity_delta_micros as number,
    value: { numerator: valueNumerator, denominator: valueDenominator },
    coverageStatus: row.coverage_status as CostMovementRow['coverageStatus'],
    unitCost,
    method: row.method as 'MOVING_WEIGHTED_AVERAGE',
    methodVersion: row.method_version as string,
    createdAt: row.created_at as string,
  };
}

function toCostState(row: CostStateRow | null): CostState {
  return row
    ? {
        coverageStatus: row.coverageStatus,
        quantityCostedBaseMicros: row.quantityCostedBaseMicros,
        remainingValue: row.remainingValue,
        averageUnitCost: row.averageUnitCost,
      }
    : initialCostState();
}

export function applyPurchaseCostMovement(
  adapter: DatabaseAdapter,
  input: {
    id: string;
    storeId: string;
    storeProductId: string;
    sourceId: string;
    sourceLineId: string;
    quantityBaseMicros: number;
    baseUnitCost: Rational;
    priorInventoryBalanceBaseMicros?: number;
    createdAt?: string;
  },
): { movement: CostMovementRow; state: CostStateRow } {
  const priorBalance = input.priorInventoryBalanceBaseMicros ?? getInventoryBalanceByStoreProduct(adapter, input.storeProductId);
  const transition = applyPurchaseCostState(toCostState(getCostState(adapter, input.storeProductId)), {
    priorInventoryBalanceBaseMicros: priorBalance,
    receiptQuantityBaseMicros: input.quantityBaseMicros,
    receiptBaseUnitCost: input.baseUnitCost,
  });
  const createdAt = input.createdAt ?? nowIso();
  const movement = createCostMovement(adapter, {
    id: input.id,
    storeId: input.storeId,
    storeProductId: input.storeProductId,
    movementType: 'PURCHASE',
    sourceId: input.sourceId,
    sourceLineId: input.sourceLineId,
    quantityBaseDeltaMicros: input.quantityBaseMicros,
    costedQuantityDeltaMicros: transition.costedQuantityBaseMicros,
    value: transition.valueAdded,
    coverageStatus: transition.state.coverageStatus,
    unitCost: input.baseUnitCost,
    createdAt,
  });
  const state = upsertCostState(adapter, {
    storeProductId: input.storeProductId,
    storeId: input.storeId,
    state: transition.state,
    movementId: movement.id,
    updatedAt: createdAt,
  });
  return { movement, state };
}

export function applySaleCostMovement(
  adapter: DatabaseAdapter,
  input: {
    id: string;
    storeId: string;
    storeProductId: string;
    sourceId: string;
    sourceLineId: string;
    quantityBaseMicros: number;
    priorInventoryBalanceBaseMicros: number;
    createdAt?: string;
  },
): { movement: CostMovementRow; state: CostStateRow; transition: ReturnType<typeof applySaleCostState> } {
  const currentState = getCostState(adapter, input.storeProductId);
  const transition = applySaleCostState(toCostState(currentState), {
    priorInventoryBalanceBaseMicros: input.priorInventoryBalanceBaseMicros,
    saleQuantityBaseMicros: input.quantityBaseMicros,
  });
  const valueNumerator = transition.valueConsumed.numerator === '0'
    ? '0'
    : `-${transition.valueConsumed.numerator}`;
  const movement = createCostMovement(adapter, {
    id: input.id,
    storeId: input.storeId,
    storeProductId: input.storeProductId,
    movementType: 'SALE',
    sourceId: input.sourceId,
    sourceLineId: input.sourceLineId,
    quantityBaseDeltaMicros: -input.quantityBaseMicros,
    costedQuantityDeltaMicros: -transition.costedQuantityBaseMicros,
    value: { numerator: valueNumerator, denominator: transition.valueConsumed.denominator },
    coverageStatus: transition.available
      ? 'KNOWN'
      : currentState?.coverageStatus === 'UNKNOWN' || !currentState
        ? 'UNKNOWN'
        : 'UNAVAILABLE',
    unitCost: transition.available ? currentState?.averageUnitCost ?? null : null,
    createdAt: input.createdAt,
  });
  const state = upsertCostState(adapter, {
    storeProductId: input.storeProductId,
    storeId: input.storeId,
    state: transition.state,
    movementId: movement.id,
    updatedAt: input.createdAt ?? nowIso(),
  });
  return { movement, state, transition };
}

export function createSaleItemCostSnapshot(
  adapter: DatabaseAdapter,
  input: CreateSaleItemCostSnapshotInput,
): SaleItemCostSnapshotRow {
  const saleItemId = requireId(input.saleItemId);
  const saleId = requireId(input.saleId);
  const storeId = requireId(input.storeId);
  const storeProductId = requireId(input.storeProductId);
  requirePositiveMicros(input.quantityBaseMicros, 'quantityBaseMicros');
  if (!Number.isSafeInteger(input.costedQuantityBaseMicros) || input.costedQuantityBaseMicros < 0 || input.costedQuantityBaseMicros > input.quantityBaseMicros) {
    throw new DomainError('INVALID_QUANTITY', 'Costed sale quantity must be within the sale quantity.');
  }
  if (input.coverageStatus !== 'AVAILABLE' && input.coverageStatus !== 'UNAVAILABLE') {
    throw new DomainError('INVALID_VALUE', 'Unsupported sale cost coverage status.');
  }
  const unitCost = input.unitCost ?? null;
  const cogs = input.cogs ?? null;
  if (input.coverageStatus === 'AVAILABLE' && (!unitCost || !cogs || input.cogsAmountMinor === null || input.cogsAmountMinor === undefined)) {
    throw new DomainError('INVALID_VALUE', 'Available sale cost snapshots require exact unit cost and COGS.');
  }
  if (input.coverageStatus === 'UNAVAILABLE' && (cogs || input.cogsAmountMinor !== null && input.cogsAmountMinor !== undefined)) {
    throw new DomainError('INVALID_VALUE', 'Unavailable sale cost snapshots cannot include COGS.');
  }
  const methodVersion = requireText(input.methodVersion ?? 'M4-MWA-1', 'methodVersion', 32);
  if (input.cogsAmountMinor !== null && input.cogsAmountMinor !== undefined && (!Number.isSafeInteger(input.cogsAmountMinor) || input.cogsAmountMinor < 0)) {
    throw new DomainError('INVALID_MONEY', 'Sale COGS must be a non-negative safe integer.');
  }
  const createdAt = input.createdAt ?? nowIso();
  adapter.run(
    `INSERT INTO sale_item_cost_snapshots
      (sale_item_id, sale_id, store_id, store_product_id, quantity_base_micros,
       costed_quantity_base_micros, coverage_status, method, method_version,
       unit_cost_numerator, unit_cost_denominator, cogs_numerator, cogs_denominator,
       cogs_amount_minor, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'MOVING_WEIGHTED_AVERAGE', ?, ?, ?, ?, ?, ?, ?);`,
    [
      saleItemId,
      saleId,
      storeId,
      storeProductId,
      input.quantityBaseMicros,
      input.costedQuantityBaseMicros,
      input.coverageStatus,
      methodVersion,
      unitCost?.numerator ?? null,
      unitCost?.denominator ?? null,
      cogs?.numerator ?? null,
      cogs?.denominator ?? null,
      input.cogsAmountMinor ?? null,
      createdAt,
    ],
  );
  const row = adapter.getFirstRow<SnapshotRecord>(
    `SELECT sale_item_id, sale_id, store_id, store_product_id, quantity_base_micros,
            costed_quantity_base_micros, coverage_status, method, method_version,
            unit_cost_numerator, unit_cost_denominator, cogs_numerator, cogs_denominator,
            cogs_amount_minor, created_at
     FROM sale_item_cost_snapshots WHERE sale_item_id = ?;`,
    [saleItemId],
  );
  if (!row) {
    throw new Error('Sale cost snapshot insert did not persist.');
  }
  return mapSnapshot(row);
}

function mapSnapshot(row: SnapshotRecord): SaleItemCostSnapshotRow {
  return {
    saleItemId: row.sale_item_id as string,
    saleId: row.sale_id as string,
    storeId: row.store_id as string,
    storeProductId: row.store_product_id as string,
    quantityBaseMicros: row.quantity_base_micros as number,
    costedQuantityBaseMicros: row.costed_quantity_base_micros as number,
    coverageStatus: row.coverage_status as SaleItemCostSnapshotRow['coverageStatus'],
    method: row.method as 'MOVING_WEIGHTED_AVERAGE',
    methodVersion: row.method_version as string,
    unitCost: row.unit_cost_numerator === null || row.unit_cost_denominator === null
      ? null
      : parseStoredRational(row.unit_cost_numerator, row.unit_cost_denominator, 'unitCost'),
    cogs: row.cogs_numerator === null || row.cogs_denominator === null
      ? null
      : parseStoredRational(row.cogs_numerator, row.cogs_denominator, 'cogs'),
    cogsAmountMinor: (row.cogs_amount_minor as number | null) ?? null,
    createdAt: row.created_at as string,
  };
}

export function getSaleItemCostSnapshot(adapter: DatabaseAdapter, saleItemId: string): SaleItemCostSnapshotRow | null {
  const row = adapter.getFirstRow<SnapshotRecord>(
    `SELECT sale_item_id, sale_id, store_id, store_product_id, quantity_base_micros,
            costed_quantity_base_micros, coverage_status, method, method_version,
            unit_cost_numerator, unit_cost_denominator, cogs_numerator, cogs_denominator,
            cogs_amount_minor, created_at
     FROM sale_item_cost_snapshots WHERE sale_item_id = ?;`,
    [requireId(saleItemId)],
  );
  return row ? mapSnapshot(row) : null;
}

export function listSaleItemCostSnapshotsBySaleId(adapter: DatabaseAdapter, saleId: string): SaleItemCostSnapshotRow[] {
  return adapter
    .getAllRows<SnapshotRecord>(
      `SELECT sale_item_id, sale_id, store_id, store_product_id, quantity_base_micros,
              costed_quantity_base_micros, coverage_status, method, method_version,
              unit_cost_numerator, unit_cost_denominator, cogs_numerator, cogs_denominator,
              cogs_amount_minor, created_at
       FROM sale_item_cost_snapshots WHERE sale_id = ? ORDER BY rowid ASC;`,
      [requireId(saleId)],
    )
    .map(mapSnapshot);
}

export function listCostMovementsByStoreProduct(adapter: DatabaseAdapter, storeProductId: string): CostMovementRow[] {
  return adapter
    .getAllRows<CostMovementRecord>(
      `SELECT id, store_id, store_product_id, movement_type, source_id, source_line_id, application_order,
              quantity_base_delta_micros, costed_quantity_delta_micros, value_numerator, value_denominator,
              coverage_status, unit_cost_numerator, unit_cost_denominator, method, method_version, created_at
       FROM cost_movements WHERE store_product_id = ? ORDER BY application_order ASC;`,
      [requireId(storeProductId)],
    )
    .map(mapMovement);
}

export function listCostMovementsBySource(
  adapter: DatabaseAdapter,
  movementType: 'PURCHASE' | 'SALE',
  sourceId: string,
): CostMovementRow[] {
  return adapter
    .getAllRows<CostMovementRecord>(
      `SELECT id, store_id, store_product_id, movement_type, source_id, source_line_id, application_order,
              quantity_base_delta_micros, costed_quantity_delta_micros, value_numerator, value_denominator,
              coverage_status, unit_cost_numerator, unit_cost_denominator, method, method_version, created_at
       FROM cost_movements WHERE movement_type = ? AND source_id = ? ORDER BY application_order ASC, id ASC;`,
      [movementType, requireId(sourceId)],
    )
    .map(mapMovement);
}

/** Rebuild a projection from immutable, explicitly ordered movement rows. */
export function rebuildCostStateFromMovements(adapter: DatabaseAdapter, storeProductId: string): CostState {
  const movements = listCostMovementsByStoreProduct(adapter, storeProductId);
  let state = initialCostState();
  for (const movement of movements) {
    const valueNumerator = BigInt(movement.value.numerator);
    const valueDenominator = BigInt(movement.value.denominator);
    const value = valueNumerator < 0n
      ? { numerator: (-valueNumerator).toString(), denominator: valueDenominator.toString() }
      : { numerator: valueNumerator.toString(), denominator: valueDenominator.toString() };
    if (movement.movementType === 'PURCHASE' && movement.coverageStatus === 'KNOWN') {
      const quantity = state.quantityCostedBaseMicros + Math.max(0, movement.costedQuantityDeltaMicros);
      state = quantity > 0
        ? {
            coverageStatus: 'KNOWN',
            quantityCostedBaseMicros: quantity,
            remainingValue: addRational(state.remainingValue, value),
            averageUnitCost: makeRational(
              BigInt(addRational(state.remainingValue, value).numerator) * BigInt(1_000_000),
              BigInt(addRational(state.remainingValue, value).denominator) * BigInt(quantity),
            ),
          }
        : initialCostState();
    } else if (movement.movementType === 'SALE') {
      const nextQuantity = Math.max(0, state.quantityCostedBaseMicros + movement.costedQuantityDeltaMicros);
      if (state.coverageStatus === 'UNKNOWN' || movement.coverageStatus === 'UNKNOWN') {
        state = {
          coverageStatus: 'UNKNOWN',
          quantityCostedBaseMicros: 0,
          remainingValue: { numerator: '0', denominator: '1' },
          averageUnitCost: null,
        };
      } else if (nextQuantity === 0) {
        state = initialCostState();
      } else if (state.coverageStatus === 'KNOWN' && movement.coverageStatus === 'KNOWN') {
        state = {
          coverageStatus: 'KNOWN',
          quantityCostedBaseMicros: nextQuantity,
          remainingValue: subtractRational(state.remainingValue, value),
          averageUnitCost: makeRational(
            BigInt(subtractRational(state.remainingValue, value).numerator) * BigInt(1_000_000),
            BigInt(subtractRational(state.remainingValue, value).denominator) * BigInt(nextQuantity),
          ),
        };
      } else {
        state = {
          coverageStatus: 'UNKNOWN',
          quantityCostedBaseMicros: 0,
          remainingValue: { numerator: '0', denominator: '1' },
          averageUnitCost: null,
        };
      }
    } else if (movement.coverageStatus !== 'KNOWN') {
      state = {
        coverageStatus: 'UNKNOWN',
        quantityCostedBaseMicros: 0,
        remainingValue: { numerator: '0', denominator: '1' },
        averageUnitCost: null,
      };
    }
  }
  return state;
}
