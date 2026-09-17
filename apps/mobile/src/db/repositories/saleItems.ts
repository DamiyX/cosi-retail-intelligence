import { calculateSaleLine, DomainError } from '@retail/domain';

import type { DatabaseAdapter } from '../adapter';
import {
  nowIso,
  optionalMoneyMinor,
  requireId,
  requirePositiveMicros,
  requireText,
} from './common';

export interface SaleItemRow {
  id: string;
  saleId: string;
  storeProductId: string;
  productVariantId: string;
  packageUnitId: string;
  quantityPackagesMicros: number;
  conversionToBaseSnapshotMicros: number;
  quantityBaseMicros: number;
  unitPriceMinor: number;
  grossTotalMinor: number;
  discountAmountMinor: number;
  netTotalMinor: number;
  unitCostBaseSnapshotMinor: number | null;
  cogsAmountMinor: number | null;
  productNameSnapshot: string;
  packageNameSnapshot: string;
  createdAt: string;
}

export interface CreateSaleItemInput {
  id: string;
  saleId: string;
  storeProductId: string;
  productVariantId: string;
  packageUnitId: string;
  quantityPackagesMicros: number;
  conversionToBaseSnapshotMicros: number;
  quantityBaseMicros: number;
  unitPriceMinor: number;
  grossTotalMinor: number;
  discountAmountMinor?: number;
  netTotalMinor: number;
  unitCostBaseSnapshotMinor?: number | null;
  cogsAmountMinor?: number | null;
  productNameSnapshot: string;
  packageNameSnapshot: string;
  createdAt?: string;
}

type SaleItemRecord = Record<string, string | number | null>;

function mapRow(row: SaleItemRecord): SaleItemRow {
  return {
    id: row.id as string,
    saleId: row.sale_id as string,
    storeProductId: row.store_product_id as string,
    productVariantId: row.product_variant_id as string,
    packageUnitId: row.package_unit_id as string,
    quantityPackagesMicros: row.quantity_packages_micros as number,
    conversionToBaseSnapshotMicros: row.conversion_to_base_snapshot_micros as number,
    quantityBaseMicros: row.quantity_base_micros as number,
    unitPriceMinor: row.unit_price_minor as number,
    grossTotalMinor: row.gross_total_minor as number,
    discountAmountMinor: row.discount_amount_minor as number,
    netTotalMinor: row.net_total_minor as number,
    unitCostBaseSnapshotMinor: (row.unit_cost_base_snapshot_minor as number | null) ?? null,
    cogsAmountMinor: (row.cogs_amount_minor as number | null) ?? null,
    productNameSnapshot: row.product_name_snapshot as string,
    packageNameSnapshot: row.package_name_snapshot as string,
    createdAt: row.created_at as string,
  };
}

const COLUMNS =
  'id, sale_id, store_product_id, product_variant_id, package_unit_id, ' +
  'quantity_packages_micros, conversion_to_base_snapshot_micros, quantity_base_micros, ' +
  'unit_price_minor, gross_total_minor, discount_amount_minor, net_total_minor, ' +
  'unit_cost_base_snapshot_minor, cogs_amount_minor, product_name_snapshot, ' +
  'package_name_snapshot, created_at';

function assertMoney(value: number, field: string): void {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new DomainError('INVALID_MONEY', `${field} must be a non-negative safe integer in minor units.`);
  }
}

export function createSaleItem(adapter: DatabaseAdapter, input: CreateSaleItemInput): SaleItemRow {
  const id = requireId(input.id);
  const saleId = requireId(input.saleId);
  const storeProductId = requireId(input.storeProductId);
  const productVariantId = requireId(input.productVariantId);
  const packageUnitId = requireId(input.packageUnitId);

  const quantityPackagesMicros = requirePositiveMicros(input.quantityPackagesMicros, 'quantityPackagesMicros');
  const conversionToBaseSnapshotMicros = requirePositiveMicros(
    input.conversionToBaseSnapshotMicros,
    'conversionToBaseSnapshotMicros',
  );
  const quantityBaseMicros = requirePositiveMicros(input.quantityBaseMicros, 'quantityBaseMicros');

  assertMoney(input.unitPriceMinor, 'Unit price');
  assertMoney(input.grossTotalMinor, 'Gross total');
  const discountAmountMinor = input.discountAmountMinor ?? 0;
  assertMoney(discountAmountMinor, 'Discount amount');
  assertMoney(input.netTotalMinor, 'Net total');

  if (input.netTotalMinor !== input.grossTotalMinor - discountAmountMinor) {
    throw new DomainError('INVALID_MONEY', 'Sale item net total must equal gross total minus discount.');
  }

  const calculated = calculateSaleLine({
    quantityPackagesMicros,
    conversionToBaseMicros: conversionToBaseSnapshotMicros,
    unitPriceMinor: input.unitPriceMinor,
    discountAmountMinor,
  });
  if (
    quantityBaseMicros !== calculated.quantityBaseMicros ||
    input.grossTotalMinor !== calculated.grossTotalMinor ||
    input.netTotalMinor !== calculated.netTotalMinor
  ) {
    throw new DomainError(
      'INVALID_VALUE',
      'Sale item snapshots must match the exact quantity, conversion, price, and discount calculation.',
    );
  }

  const unitCostBaseSnapshotMinor = optionalMoneyMinor(
    input.unitCostBaseSnapshotMinor,
    'unitCostBaseSnapshotMinor',
  );
  const cogsAmountMinor = optionalMoneyMinor(input.cogsAmountMinor, 'cogsAmountMinor');

  const productNameSnapshot = requireText(input.productNameSnapshot, 'productNameSnapshot', 500);
  const packageNameSnapshot = requireText(input.packageNameSnapshot, 'packageNameSnapshot', 100);
  const createdAt = input.createdAt ?? nowIso();

  adapter.run(
    `INSERT INTO sale_items
      (id, sale_id, store_product_id, product_variant_id, package_unit_id,
       quantity_packages_micros, conversion_to_base_snapshot_micros, quantity_base_micros,
       unit_price_minor, gross_total_minor, discount_amount_minor, net_total_minor,
       unit_cost_base_snapshot_minor, cogs_amount_minor, product_name_snapshot,
       package_name_snapshot, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      id,
      saleId,
      storeProductId,
      productVariantId,
      packageUnitId,
      quantityPackagesMicros,
      conversionToBaseSnapshotMicros,
      quantityBaseMicros,
      input.unitPriceMinor,
      input.grossTotalMinor,
      discountAmountMinor,
      input.netTotalMinor,
      unitCostBaseSnapshotMinor,
      cogsAmountMinor,
      productNameSnapshot,
      packageNameSnapshot,
      createdAt,
    ],
  );

  const row = adapter.getFirstRow<SaleItemRecord>(
    `SELECT ${COLUMNS} FROM sale_items WHERE id = ?;`,
    [id],
  );
  if (!row) {
    throw new Error('Sale item insert did not persist.');
  }
  return mapRow(row);
}

export function listSaleItemsBySaleId(adapter: DatabaseAdapter, saleId: string): SaleItemRow[] {
  return adapter
    .getAllRows<SaleItemRecord>(
      `SELECT ${COLUMNS} FROM sale_items WHERE sale_id = ? ORDER BY rowid ASC;`,
      [requireId(saleId)],
    )
    .map(mapRow);
}
