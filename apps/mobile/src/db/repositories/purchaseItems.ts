import {
  convertPackagesToBase,
  DomainError,
  normalizePurchaseCost,
  type PurchaseCostBasis,
} from '@retail/domain';

import type { DatabaseAdapter } from '../adapter';
import { nowIso, requireId, requirePositiveMicros, requireText } from './common';

export interface PurchaseItemRow {
  id: string;
  purchaseId: string;
  storeId: string;
  storeProductId: string;
  productVariantId: string;
  packageUnitId: string;
  quantityPackagesMicros: number;
  conversionToBaseSnapshotMicros: number;
  quantityBaseMicros: number;
  costBasis: PurchaseCostBasis;
  enteredCostMinor: number;
  totalPurchaseCostMinor: number;
  packageCostNumerator: string;
  packageCostDenominator: string;
  baseUnitCostNumerator: string;
  baseUnitCostDenominator: string;
  currencyCode: string;
  productNameSnapshot: string;
  packageNameSnapshot: string;
  createdAt: string;
}

export interface CreatePurchaseItemInput {
  id: string;
  purchaseId: string;
  storeId: string;
  storeProductId: string;
  productVariantId: string;
  packageUnitId: string;
  quantityPackagesMicros: number;
  conversionToBaseSnapshotMicros: number;
  quantityBaseMicros?: number;
  costBasis: PurchaseCostBasis;
  enteredCostMinor: number;
  totalPurchaseCostMinor?: number;
  packageCostNumerator?: string;
  packageCostDenominator?: string;
  baseUnitCostNumerator?: string;
  baseUnitCostDenominator?: string;
  currencyCode: string;
  productNameSnapshot: string;
  packageNameSnapshot: string;
  createdAt?: string;
}

type PurchaseItemRecord = Record<string, string | number | null>;

const COLUMNS =
  'id, purchase_id, store_id, store_product_id, product_variant_id, package_unit_id, ' +
  'quantity_packages_micros, conversion_to_base_snapshot_micros, quantity_base_micros, ' +
  'cost_basis, entered_cost_minor, total_purchase_cost_minor, package_cost_numerator, ' +
  'package_cost_denominator, base_unit_cost_numerator, base_unit_cost_denominator, currency_code, ' +
  'product_name_snapshot, package_name_snapshot, created_at';

function mapRow(row: PurchaseItemRecord): PurchaseItemRow {
  return {
    id: row.id as string,
    purchaseId: row.purchase_id as string,
    storeId: row.store_id as string,
    storeProductId: row.store_product_id as string,
    productVariantId: row.product_variant_id as string,
    packageUnitId: row.package_unit_id as string,
    quantityPackagesMicros: row.quantity_packages_micros as number,
    conversionToBaseSnapshotMicros: row.conversion_to_base_snapshot_micros as number,
    quantityBaseMicros: row.quantity_base_micros as number,
    costBasis: row.cost_basis as PurchaseCostBasis,
    enteredCostMinor: row.entered_cost_minor as number,
    totalPurchaseCostMinor: row.total_purchase_cost_minor as number,
    packageCostNumerator: row.package_cost_numerator as string,
    packageCostDenominator: row.package_cost_denominator as string,
    baseUnitCostNumerator: row.base_unit_cost_numerator as string,
    baseUnitCostDenominator: row.base_unit_cost_denominator as string,
    currencyCode: row.currency_code as string,
    productNameSnapshot: row.product_name_snapshot as string,
    packageNameSnapshot: row.package_name_snapshot as string,
    createdAt: row.created_at as string,
  };
}

export function createPurchaseItem(adapter: DatabaseAdapter, input: CreatePurchaseItemInput): PurchaseItemRow {
  const id = requireId(input.id);
  const purchaseId = requireId(input.purchaseId);
  const storeId = requireId(input.storeId);
  const storeProductId = requireId(input.storeProductId);
  const productVariantId = requireId(input.productVariantId);
  const packageUnitId = requireId(input.packageUnitId);
  const quantityPackagesMicros = requirePositiveMicros(input.quantityPackagesMicros, 'quantityPackagesMicros');
  const conversionToBaseSnapshotMicros = requirePositiveMicros(
    input.conversionToBaseSnapshotMicros,
    'conversionToBaseSnapshotMicros',
  );
  const quantityBaseMicros = input.quantityBaseMicros ?? convertPackagesToBase(
    quantityPackagesMicros,
    conversionToBaseSnapshotMicros,
  );
  const calculatedBaseMicros = convertPackagesToBase(
    quantityPackagesMicros,
    conversionToBaseSnapshotMicros,
  );
  if (quantityBaseMicros !== calculatedBaseMicros) {
    throw new DomainError('INVALID_CONVERSION', 'Purchase item base quantity does not match its package conversion snapshot.');
  }
  if (!Number.isSafeInteger(quantityBaseMicros) || quantityBaseMicros <= 0) {
    throw new DomainError('INVALID_QUANTITY', 'quantityBaseMicros must be a positive safe integer.');
  }
  const normalized = normalizePurchaseCost({
    basis: input.costBasis,
    enteredCostMinor: input.enteredCostMinor,
    quantityPackagesMicros,
    quantityBaseMicros,
  });
  if (input.totalPurchaseCostMinor !== undefined && input.totalPurchaseCostMinor !== normalized.totalCostMinor) {
    throw new DomainError('INVALID_MONEY', 'Purchase item total does not match its exact cost basis.');
  }
  if (input.packageCostNumerator !== undefined && input.packageCostNumerator !== normalized.packageUnitCost.numerator) {
    throw new DomainError('INVALID_MONEY', 'Purchase item package-cost snapshot does not match its exact basis.');
  }
  if (input.packageCostDenominator !== undefined && input.packageCostDenominator !== normalized.packageUnitCost.denominator) {
    throw new DomainError('INVALID_MONEY', 'Purchase item package-cost denominator does not match its exact basis.');
  }
  if (input.baseUnitCostNumerator !== undefined && input.baseUnitCostNumerator !== normalized.baseUnitCost.numerator) {
    throw new DomainError('INVALID_MONEY', 'Purchase item base-cost snapshot does not match its exact basis.');
  }
  if (input.baseUnitCostDenominator !== undefined && input.baseUnitCostDenominator !== normalized.baseUnitCost.denominator) {
    throw new DomainError('INVALID_MONEY', 'Purchase item base-cost denominator does not match its exact basis.');
  }
  const currencyCode = requireText(input.currencyCode, 'Currency code', 3).toUpperCase();
  const productNameSnapshot = requireText(input.productNameSnapshot, 'productNameSnapshot', 500);
  const packageNameSnapshot = requireText(input.packageNameSnapshot, 'packageNameSnapshot', 100);
  const createdAt = input.createdAt ?? nowIso();

  adapter.run(
    `INSERT INTO purchase_items
      (id, purchase_id, store_id, store_product_id, product_variant_id, package_unit_id,
       quantity_packages_micros, conversion_to_base_snapshot_micros, quantity_base_micros,
       cost_basis, entered_cost_minor, total_purchase_cost_minor, package_cost_numerator,
       package_cost_denominator, base_unit_cost_numerator, base_unit_cost_denominator,
       currency_code, product_name_snapshot, package_name_snapshot, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      id,
      purchaseId,
      storeId,
      storeProductId,
      productVariantId,
      packageUnitId,
      quantityPackagesMicros,
      conversionToBaseSnapshotMicros,
      quantityBaseMicros,
      normalized.basis,
      normalized.enteredCostMinor,
      normalized.totalCostMinor,
      normalized.packageUnitCost.numerator,
      normalized.packageUnitCost.denominator,
      normalized.baseUnitCost.numerator,
      normalized.baseUnitCost.denominator,
      currencyCode,
      productNameSnapshot,
      packageNameSnapshot,
      createdAt,
    ],
  );
  const row = adapter.getFirstRow<PurchaseItemRecord>(
    `SELECT ${COLUMNS} FROM purchase_items WHERE id = ?;`,
    [id],
  );
  if (!row) {
    throw new Error('Purchase item insert did not persist.');
  }
  return mapRow(row);
}

export function getPurchaseItemById(adapter: DatabaseAdapter, id: string): PurchaseItemRow | null {
  const row = adapter.getFirstRow<PurchaseItemRecord>(
    `SELECT ${COLUMNS} FROM purchase_items WHERE id = ?;`,
    [requireId(id)],
  );
  return row ? mapRow(row) : null;
}

export function listPurchaseItemsByPurchaseId(adapter: DatabaseAdapter, purchaseId: string): PurchaseItemRow[] {
  return adapter
    .getAllRows<PurchaseItemRecord>(
      `SELECT ${COLUMNS} FROM purchase_items WHERE purchase_id = ? ORDER BY rowid ASC;`,
      [requireId(purchaseId)],
    )
    .map(mapRow);
}
