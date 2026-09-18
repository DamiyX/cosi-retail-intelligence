import { DomainError, type CostCoverageStatus, type PurchaseCostBasis } from '@retail/domain';

import type { DatabaseAdapter } from '../adapter';
import { fromBoolean, nowIso, optionalId, requireId, requirePositiveMicros, requireText, toBoolean } from './common';

export interface PriceObservationRow {
  id: string;
  storeId: string;
  purchaseItemId: string;
  productVariantId: string;
  packageUnitId: string;
  supplierId: string | null;
  costBasis: PurchaseCostBasis;
  enteredCostMinor: number;
  observedPriceMinor: number;
  totalPurchaseCostMinor: number;
  quantityPackagesMicros: number;
  conversionToBaseSnapshotMicros: number;
  quantityBaseMicros: number;
  packageCostNumerator: string;
  packageCostDenominator: string;
  baseUnitCostNumerator: string;
  baseUnitCostDenominator: string;
  currencyCode: string;
  sourceType: 'RETAILER_PURCHASE';
  sourceId: string;
  validationStatus: 'VALID' | 'ESTIMATED' | 'UNAVAILABLE';
  contributionConsent: boolean;
  observedAt: string;
  createdAt: string;
}

export interface PurchasePriceHistoryRow extends PriceObservationRow {
  purchaseId: string;
  occurredAt: string;
  productNameSnapshot: string;
  packageNameSnapshot: string;
  supplierNameSnapshot: string | null;
  currentCostCoverageStatus: CostCoverageStatus;
}

export interface CreatePriceObservationInput {
  id: string;
  storeId: string;
  purchaseItemId: string;
  productVariantId: string;
  packageUnitId: string;
  supplierId?: string | null;
  costBasis: PurchaseCostBasis;
  enteredCostMinor: number;
  observedPriceMinor: number;
  totalPurchaseCostMinor: number;
  quantityPackagesMicros: number;
  conversionToBaseSnapshotMicros: number;
  quantityBaseMicros: number;
  packageCostNumerator: string;
  packageCostDenominator: string;
  baseUnitCostNumerator: string;
  baseUnitCostDenominator: string;
  currencyCode: string;
  sourceId: string;
  validationStatus?: 'VALID' | 'ESTIMATED' | 'UNAVAILABLE';
  contributionConsent?: boolean;
  observedAt: string;
  createdAt?: string;
}

type PriceObservationRecord = Record<string, string | number | null>;
type PurchasePriceHistoryRecord = PriceObservationRecord & {
  purchase_id: string;
  occurred_at: string;
  product_name_snapshot: string;
  package_name_snapshot: string;
  supplier_name_snapshot: string | null;
  current_cost_coverage_status: string | null;
};

const COLUMNS =
  'id, store_id, purchase_item_id, product_variant_id, package_unit_id, supplier_id, cost_basis, ' +
  'entered_cost_minor, observed_price_minor, total_purchase_cost_minor, quantity_packages_micros, ' +
  'conversion_to_base_snapshot_micros, quantity_base_micros, package_cost_numerator, package_cost_denominator, ' +
  'base_unit_cost_numerator, base_unit_cost_denominator, currency_code, source_type, source_id, ' +
  'validation_status, contribution_consent, observed_at, created_at';

const HISTORY_COLUMNS =
  'po.id, po.store_id, po.purchase_item_id, po.product_variant_id, po.package_unit_id, po.supplier_id, po.cost_basis, ' +
  'po.entered_cost_minor, po.observed_price_minor, po.total_purchase_cost_minor, po.quantity_packages_micros, ' +
  'po.conversion_to_base_snapshot_micros, po.quantity_base_micros, po.package_cost_numerator, po.package_cost_denominator, ' +
  'po.base_unit_cost_numerator, po.base_unit_cost_denominator, po.currency_code, po.source_type, po.source_id, ' +
  'po.validation_status, po.contribution_consent, po.observed_at, po.created_at, p.id AS purchase_id, ' +
  'p.occurred_at, pi.product_name_snapshot, pi.package_name_snapshot, p.supplier_name_snapshot, ' +
  'cs.coverage_status AS current_cost_coverage_status';

function mapRow(row: PriceObservationRecord): PriceObservationRow {
  return {
    id: row.id as string,
    storeId: row.store_id as string,
    purchaseItemId: row.purchase_item_id as string,
    productVariantId: row.product_variant_id as string,
    packageUnitId: row.package_unit_id as string,
    supplierId: (row.supplier_id as string | null) ?? null,
    costBasis: row.cost_basis as PurchaseCostBasis,
    enteredCostMinor: row.entered_cost_minor as number,
    observedPriceMinor: row.observed_price_minor as number,
    totalPurchaseCostMinor: row.total_purchase_cost_minor as number,
    quantityPackagesMicros: row.quantity_packages_micros as number,
    conversionToBaseSnapshotMicros: row.conversion_to_base_snapshot_micros as number,
    quantityBaseMicros: row.quantity_base_micros as number,
    packageCostNumerator: row.package_cost_numerator as string,
    packageCostDenominator: row.package_cost_denominator as string,
    baseUnitCostNumerator: row.base_unit_cost_numerator as string,
    baseUnitCostDenominator: row.base_unit_cost_denominator as string,
    currencyCode: row.currency_code as string,
    sourceType: row.source_type as 'RETAILER_PURCHASE',
    sourceId: row.source_id as string,
    validationStatus: row.validation_status as PriceObservationRow['validationStatus'],
    contributionConsent: toBoolean(row.contribution_consent as number),
    observedAt: row.observed_at as string,
    createdAt: row.created_at as string,
  };
}

function mapHistoryRow(row: PurchasePriceHistoryRecord): PurchasePriceHistoryRow {
  return {
    ...mapRow(row),
    purchaseId: row.purchase_id,
    occurredAt: row.occurred_at,
    productNameSnapshot: row.product_name_snapshot,
    packageNameSnapshot: row.package_name_snapshot,
    supplierNameSnapshot: row.supplier_name_snapshot ?? null,
    currentCostCoverageStatus: row.current_cost_coverage_status === 'KNOWN' ? 'KNOWN' : 'UNKNOWN',
  };
}

function assertMoney(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new DomainError('INVALID_MONEY', `${field} must be a non-negative safe integer in minor units.`);
  }
}

export function createPriceObservation(
  adapter: DatabaseAdapter,
  input: CreatePriceObservationInput,
): PriceObservationRow {
  const id = requireId(input.id);
  const storeId = requireId(input.storeId);
  const purchaseItemId = requireId(input.purchaseItemId);
  const productVariantId = requireId(input.productVariantId);
  const packageUnitId = requireId(input.packageUnitId);
  const supplierId = optionalId(input.supplierId);
  const quantityPackagesMicros = requirePositiveMicros(input.quantityPackagesMicros, 'quantityPackagesMicros');
  const conversionToBaseSnapshotMicros = requirePositiveMicros(
    input.conversionToBaseSnapshotMicros,
    'conversionToBaseSnapshotMicros',
  );
  const quantityBaseMicros = requirePositiveMicros(input.quantityBaseMicros, 'quantityBaseMicros');
  assertMoney(input.enteredCostMinor, 'Entered cost');
  assertMoney(input.observedPriceMinor, 'Observed price');
  assertMoney(input.totalPurchaseCostMinor, 'Purchase total');
  if (input.contributionConsent !== undefined && input.contributionConsent !== false) {
    throw new DomainError('INVALID_VALUE', 'Purchase price observations cannot contribute to shared data.');
  }
  const currencyCode = requireText(input.currencyCode, 'Currency code', 3).toUpperCase();
  const sourceId = requireId(input.sourceId);
  const observedAt = requireText(input.observedAt, 'observedAt', 64);
  const validationStatus = input.validationStatus ?? 'VALID';
  if (!['VALID', 'ESTIMATED', 'UNAVAILABLE'].includes(validationStatus)) {
    throw new DomainError('INVALID_VALUE', 'Unsupported price observation validation status.');
  }
  const createdAt = input.createdAt ?? nowIso();
  adapter.run(
    `INSERT INTO price_observations
      (id, store_id, purchase_item_id, product_variant_id, package_unit_id, supplier_id,
       cost_basis, entered_cost_minor, observed_price_minor, total_purchase_cost_minor,
       quantity_packages_micros, conversion_to_base_snapshot_micros, quantity_base_micros,
       package_cost_numerator, package_cost_denominator, base_unit_cost_numerator,
       base_unit_cost_denominator, currency_code, source_type, source_id, validation_status,
       contribution_consent, observed_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'RETAILER_PURCHASE', ?, ?, ?, ?, ?);`,
    [
      id,
      storeId,
      purchaseItemId,
      productVariantId,
      packageUnitId,
      supplierId,
      input.costBasis,
      input.enteredCostMinor,
      input.observedPriceMinor,
      input.totalPurchaseCostMinor,
      quantityPackagesMicros,
      conversionToBaseSnapshotMicros,
      quantityBaseMicros,
      input.packageCostNumerator,
      input.packageCostDenominator,
      input.baseUnitCostNumerator,
      input.baseUnitCostDenominator,
      currencyCode,
      sourceId,
      validationStatus,
      fromBoolean(false),
      observedAt,
      createdAt,
    ],
  );
  const row = adapter.getFirstRow<PriceObservationRecord>(
    `SELECT ${COLUMNS} FROM price_observations WHERE id = ?;`,
    [id],
  );
  if (!row) {
    throw new Error('Price observation insert did not persist.');
  }
  return mapRow(row);
}

export function getPriceObservationById(adapter: DatabaseAdapter, id: string): PriceObservationRow | null {
  const row = adapter.getFirstRow<PriceObservationRecord>(
    `SELECT ${COLUMNS} FROM price_observations WHERE id = ?;`,
    [requireId(id)],
  );
  return row ? mapRow(row) : null;
}

export function listPriceObservationsByPurchaseItemId(
  adapter: DatabaseAdapter,
  purchaseItemId: string,
): PriceObservationRow[] {
  return adapter
    .getAllRows<PriceObservationRecord>(
      `SELECT ${COLUMNS} FROM price_observations WHERE purchase_item_id = ? ORDER BY rowid ASC;`,
      [requireId(purchaseItemId)],
    )
    .map(mapRow);
}

export function listPriceObservationsByStoreProduct(
  adapter: DatabaseAdapter,
  storeId: string,
  productVariantId: string,
): PriceObservationRow[] {
  return adapter
    .getAllRows<PriceObservationRecord>(
      `SELECT ${COLUMNS} FROM price_observations WHERE store_id = ? AND product_variant_id = ? ORDER BY observed_at DESC, id DESC;`,
      [requireId(storeId), requireId(productVariantId)],
    )
    .map(mapRow);
}

export function listPurchasePriceHistoryByStoreProduct(
  adapter: DatabaseAdapter,
  storeId: string,
  storeProductId: string,
): PurchasePriceHistoryRow[] {
  return adapter
    .getAllRows<PurchasePriceHistoryRecord>(
      `SELECT ${HISTORY_COLUMNS}
       FROM price_observations po
       JOIN purchase_items pi ON pi.id = po.purchase_item_id
       JOIN purchases p ON p.id = pi.purchase_id
       LEFT JOIN store_product_cost_states cs
         ON cs.store_product_id = pi.store_product_id AND cs.store_id = po.store_id
       WHERE po.store_id = ? AND pi.store_id = ? AND pi.store_product_id = ?
       ORDER BY p.occurred_at DESC, p.created_at DESC, po.id DESC;`,
      [requireId(storeId), requireId(storeId), requireId(storeProductId)],
    )
    .map(mapHistoryRow);
}
