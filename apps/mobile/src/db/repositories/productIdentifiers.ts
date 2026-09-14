import { DomainError } from '@retail/domain';

import type { DatabaseAdapter } from '../adapter';
import { nowIso, optionalId, optionalText, requireId, requireText } from './common';
import type { CatalogueStatus } from './productVariants';

export type IdentifierType = 'EAN' | 'UPC' | 'QR' | 'INTERNAL_CODE' | 'MANUFACTURER_CODE';

const IDENTIFIER_TYPES: readonly IdentifierType[] = [
  'EAN',
  'UPC',
  'QR',
  'INTERNAL_CODE',
  'MANUFACTURER_CODE',
];

/** Exact-match identifier types resolve to one package presentation globally. */
const EXACT_TYPES: readonly IdentifierType[] = ['EAN', 'UPC', 'QR'];

export interface ProductIdentifierRow {
  id: string;
  productVariantId: string;
  packageUnitId: string | null;
  type: IdentifierType;
  value: string;
  normalizedValue: string;
  countryMarket: string | null;
  status: CatalogueStatus;
  createdAt: string;
}

export interface CreateProductIdentifierInput {
  id: string;
  productVariantId: string;
  packageUnitId?: string | null;
  type: IdentifierType;
  value: string;
  countryMarket?: string | null;
}

type IdentifierRecord = Record<string, string | null>;

function mapRow(row: IdentifierRecord): ProductIdentifierRow {
  return {
    id: row.id as string,
    productVariantId: row.product_variant_id as string,
    packageUnitId: row.package_unit_id,
    type: row.type as IdentifierType,
    value: row.value as string,
    normalizedValue: row.normalized_value as string,
    countryMarket: row.country_market,
    status: row.status as CatalogueStatus,
    createdAt: row.created_at as string,
  };
}

/**
 * Normalize an identifier for exact matching: trim, drop insignificant
 * separators and case. The raw entered value is still stored for display;
 * matching and uniqueness use the normalized form.
 */
export function normalizeIdentifierValue(value: string): string {
  const normalized = value.trim().replace(/[\s-]+/g, '').toUpperCase();
  if (normalized.length === 0 || normalized.length > 128) {
    throw new DomainError(
      'INVALID_VALUE',
      'Identifier values must hold 1 to 128 significant characters.',
    );
  }
  return normalized;
}

const COLUMNS =
  'id, product_variant_id, package_unit_id, type, value, normalized_value, ' +
  'country_market, status, created_at';

/**
 * Attach an identifier to a variant (optionally to one package
 * presentation). Exact types (EAN/UPC/QR) must be globally unambiguous;
 * store codes must be unambiguous within their variant. Deactivated rows
 * free their value for correction.
 */
export function createProductIdentifier(
  adapter: DatabaseAdapter,
  input: CreateProductIdentifierInput,
): ProductIdentifierRow {
  const id = requireId(input.id);
  const productVariantId = requireId(input.productVariantId);
  const packageUnitId = optionalId(input.packageUnitId);
  if (!IDENTIFIER_TYPES.includes(input.type)) {
    throw new DomainError('INVALID_VALUE', 'Unknown product identifier type.');
  }
  const value = requireText(input.value, 'identifier value', 128).trim();
  const normalizedValue = normalizeIdentifierValue(value);
  const countryMarket = optionalText(input.countryMarket, 'country market', 8);
  if (EXACT_TYPES.includes(input.type)) {
    const clash = findActiveIdentifier(adapter, input.type, normalizedValue);
    if (clash) {
      throw new DomainError(
        'INVALID_VALUE',
        'That barcode is already attached to another product; merge or correct it instead of duplicating.',
      );
    }
  } else {
    const clash = findActiveVariantIdentifier(adapter, productVariantId, input.type, normalizedValue);
    if (clash) {
      throw new DomainError(
        'INVALID_VALUE',
        'That code is already attached to this product.',
      );
    }
  }
  const timestamp = nowIso();
  adapter.run(
    `INSERT INTO product_identifiers
      (id, product_variant_id, package_unit_id, type, value, normalized_value,
       country_market, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?);`,
    [id, productVariantId, packageUnitId, input.type, value, normalizedValue, countryMarket, timestamp],
  );
  const created = getProductIdentifierById(adapter, id);
  if (!created) {
    throw new Error('Product identifier insert did not persist.');
  }
  return created;
}

export function getProductIdentifierById(
  adapter: DatabaseAdapter,
  id: string,
): ProductIdentifierRow | null {
  const row = adapter.getFirstRow<IdentifierRecord>(
    `SELECT ${COLUMNS} FROM product_identifiers WHERE id = ?;`,
    [requireId(id)],
  );
  return row ? mapRow(row) : null;
}

/** Active exact-type identifier by normalized value, any variant. */
export function findActiveIdentifier(
  adapter: DatabaseAdapter,
  type: IdentifierType,
  normalizedValue: string,
): ProductIdentifierRow | null {
  const row = adapter.getFirstRow<IdentifierRecord>(
    `SELECT ${COLUMNS} FROM product_identifiers
     WHERE type = ? AND normalized_value = ? AND status = 'ACTIVE';`,
    [type, normalizedValue],
  );
  return row ? mapRow(row) : null;
}

function findActiveVariantIdentifier(
  adapter: DatabaseAdapter,
  productVariantId: string,
  type: IdentifierType,
  normalizedValue: string,
): ProductIdentifierRow | null {
  const row = adapter.getFirstRow<IdentifierRecord>(
    `SELECT ${COLUMNS} FROM product_identifiers
     WHERE product_variant_id = ? AND type = ? AND normalized_value = ? AND status = 'ACTIVE';`,
    [productVariantId, type, normalizedValue],
  );
  return row ? mapRow(row) : null;
}

/** Every identifier on a variant, newest last. */
export function listProductIdentifiers(
  adapter: DatabaseAdapter,
  productVariantId: string,
): ProductIdentifierRow[] {
  return adapter
    .getAllRows<IdentifierRecord>(
      `SELECT ${COLUMNS} FROM product_identifiers
       WHERE product_variant_id = ? ORDER BY created_at ASC;`,
      [requireId(productVariantId)],
    )
    .map(mapRow);
}

/** Deactivate an identifier. The row is retained; its value becomes reusable. */
export function deactivateProductIdentifier(adapter: DatabaseAdapter, id: string): ProductIdentifierRow {
  const existing = getProductIdentifierById(adapter, requireId(id));
  if (!existing) {
    throw new DomainError('INVALID_VALUE', 'Product identifier does not exist.');
  }
  adapter.run("UPDATE product_identifiers SET status = 'INACTIVE' WHERE id = ?;", [existing.id]);
  const updated = getProductIdentifierById(adapter, existing.id);
  if (!updated) {
    throw new Error('Product identifier deactivation did not persist.');
  }
  return updated;
}
