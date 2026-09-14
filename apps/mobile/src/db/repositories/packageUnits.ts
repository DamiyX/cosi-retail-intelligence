import { DomainError } from '@retail/domain';

import type { DatabaseAdapter } from '../adapter';
import {
  fromBoolean,
  nowIso,
  optionalText,
  requireId,
  requirePositiveMicros,
  requireText,
  toBoolean,
} from './common';
import type { CatalogueStatus } from './productVariants';

export interface PackageUnitRow {
  id: string;
  productVariantId: string;
  name: string;
  symbol: string | null;
  /** Base-unit micro-units per one package unit (D-034). */
  conversionToBaseMicros: number;
  isBaseUnit: boolean;
  isSellable: boolean;
  isPurchasable: boolean;
  status: CatalogueStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePackageUnitInput {
  id: string;
  productVariantId: string;
  name: string;
  symbol?: string | null;
  conversionToBaseMicros: number;
  isBaseUnit: boolean;
}

type PackageRecord = Record<string, string | number | null>;

function mapRow(row: PackageRecord): PackageUnitRow {
  return {
    id: row.id as string,
    productVariantId: row.product_variant_id as string,
    name: row.name as string,
    symbol: (row.symbol as string | null) ?? null,
    conversionToBaseMicros: row.conversion_to_base_micros as number,
    isBaseUnit: toBoolean(row.is_base_unit as number),
    isSellable: toBoolean(row.is_sellable as number),
    isPurchasable: toBoolean(row.is_purchasable as number),
    status: row.status as CatalogueStatus,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

const COLUMNS =
  'id, product_variant_id, name, symbol, conversion_to_base_micros, is_base_unit, ' +
  'is_sellable, is_purchasable, status, created_at, updated_at';

export function createPackageUnit(
  adapter: DatabaseAdapter,
  input: CreatePackageUnitInput,
): PackageUnitRow {
  const id = requireId(input.id);
  const productVariantId = requireId(input.productVariantId);
  const name = requireText(input.name, 'package name', 100);
  const symbol = optionalText(input.symbol, 'package symbol', 24);
  const conversion = requirePositiveMicros(input.conversionToBaseMicros, 'package conversion');
  if (input.isBaseUnit) {
    const existing = getActiveBasePackageUnit(adapter, productVariantId);
    if (existing) {
      throw new DomainError(
        'INVALID_VALUE',
        `This product already has an active base unit (${existing.name}); deactivate it before assigning another.`,
      );
    }
    if (conversion !== 1_000_000) {
      throw new DomainError(
        'INVALID_CONVERSION',
        'The base unit converts to exactly one base unit (1,000,000 micro-units).',
      );
    }
  }
  const timestamp = nowIso();
  adapter.run(
    `INSERT INTO package_units
      (id, product_variant_id, name, symbol, conversion_to_base_micros,
       is_base_unit, is_sellable, is_purchasable, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, 1, 'ACTIVE', ?, ?);`,
    [id, productVariantId, name, symbol, conversion, fromBoolean(input.isBaseUnit), timestamp, timestamp],
  );
  const created = getPackageUnitById(adapter, id);
  if (!created) {
    throw new Error('Package unit insert did not persist.');
  }
  return created;
}

export function getPackageUnitById(adapter: DatabaseAdapter, id: string): PackageUnitRow | null {
  const row = adapter.getFirstRow<PackageRecord>(
    `SELECT ${COLUMNS} FROM package_units WHERE id = ?;`,
    [requireId(id)],
  );
  return row ? mapRow(row) : null;
}

export function getActiveBasePackageUnit(
  adapter: DatabaseAdapter,
  productVariantId: string,
): PackageUnitRow | null {
  const row = adapter.getFirstRow<PackageRecord>(
    `SELECT ${COLUMNS} FROM package_units
     WHERE product_variant_id = ? AND is_base_unit = 1 AND status = 'ACTIVE';`,
    [requireId(productVariantId)],
  );
  return row ? mapRow(row) : null;
}

/** Every package of a variant, base unit first, then alphabetical. */
export function listPackageUnitsByVariant(
  adapter: DatabaseAdapter,
  productVariantId: string,
): PackageUnitRow[] {
  return adapter
    .getAllRows<PackageRecord>(
      `SELECT ${COLUMNS} FROM package_units
       WHERE product_variant_id = ?
       ORDER BY is_base_unit DESC, name COLLATE NOCASE ASC;`,
      [requireId(productVariantId)],
    )
    .map(mapRow);
}

export interface UpdatePackageUnitInput {
  name?: string;
  symbol?: string | null;
  isSellable?: boolean;
  isPurchasable?: boolean;
}

/**
 * Edit package presentation and sale/purchase flags. The conversion factor
 * is intentionally immutable here: changing what a package means must go
 * through deactivate-plus-create so completed transaction snapshots (M3+)
 * can never be silently reinterpreted.
 */
export function updatePackageUnit(
  adapter: DatabaseAdapter,
  id: string,
  input: UpdatePackageUnitInput,
): PackageUnitRow {
  const existing = getPackageUnitById(adapter, requireId(id));
  if (!existing) {
    throw new DomainError('INVALID_VALUE', 'Package unit does not exist.');
  }
  const name = input.name === undefined ? existing.name : requireText(input.name, 'package name', 100);
  const symbol = input.symbol === undefined ? existing.symbol : optionalText(input.symbol, 'package symbol', 24);
  const isSellable = input.isSellable ?? existing.isSellable;
  const isPurchasable = input.isPurchasable ?? existing.isPurchasable;
  adapter.run(
    `UPDATE package_units
     SET name = ?, symbol = ?, is_sellable = ?, is_purchasable = ?, updated_at = ?
     WHERE id = ?;`,
    [name, symbol, fromBoolean(isSellable), fromBoolean(isPurchasable), nowIso(), existing.id],
  );
  const updated = getPackageUnitById(adapter, existing.id);
  if (!updated) {
    throw new Error('Package unit update did not persist.');
  }
  return updated;
}

/**
 * Deactivate a package definition. The row is retained for history; it
 * simply stops being offered for new work.
 */
export function deactivatePackageUnit(adapter: DatabaseAdapter, id: string): PackageUnitRow {
  const existing = getPackageUnitById(adapter, requireId(id));
  if (!existing) {
    throw new DomainError('INVALID_VALUE', 'Package unit does not exist.');
  }
  adapter.run("UPDATE package_units SET status = 'INACTIVE', updated_at = ? WHERE id = ?;", [
    nowIso(),
    existing.id,
  ]);
  const updated = getPackageUnitById(adapter, existing.id);
  if (!updated) {
    throw new Error('Package unit deactivation did not persist.');
  }
  return updated;
}
