import { DomainError } from '@retail/domain';

import type { DatabaseAdapter } from '../adapter';
import {
  fromBoolean,
  nowIso,
  optionalId,
  requireId,
  toBoolean,
} from './common';
import type { CatalogueStatus } from './productVariants';

export interface StoreProductRow {
  id: string;
  storeId: string;
  productVariantId: string;
  localSku: string | null;
  preferredPackageUnitId: string | null;
  defaultSellingPriceMinor: number | null;
  minimumSellingPriceMinor: number | null;
  reorderLevelBaseMicros: number | null;
  isTemporary: boolean;
  status: CatalogueStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStoreProductInput {
  id: string;
  storeId: string;
  productVariantId: string;
  localSku?: string | null;
  preferredPackageUnitId?: string | null;
  isTemporary?: boolean;
}

type StoreProductRecord = Record<string, string | number | null>;

function mapRow(row: StoreProductRecord): StoreProductRow {
  return {
    id: row.id as string,
    storeId: row.store_id as string,
    productVariantId: row.product_variant_id as string,
    localSku: (row.local_sku as string | null) ?? null,
    preferredPackageUnitId: (row.preferred_package_unit_id as string | null) ?? null,
    defaultSellingPriceMinor: (row.default_selling_price_minor as number | null) ?? null,
    minimumSellingPriceMinor: (row.minimum_selling_price_minor as number | null) ?? null,
    reorderLevelBaseMicros: (row.reorder_level_base_micros as number | null) ?? null,
    isTemporary: toBoolean(row.is_temporary as number),
    status: row.status as CatalogueStatus,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

const COLUMNS =
  'id, store_id, product_variant_id, local_sku, preferred_package_unit_id, ' +
  'default_selling_price_minor, minimum_selling_price_minor, reorder_level_base_micros, ' +
  'is_temporary, status, created_at, updated_at';

function normalizeSku(sku: string | null | undefined): string | null {
  if (sku === undefined || sku === null) {
    return null;
  }
  const trimmed = sku.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (trimmed.length > 64) {
    throw new DomainError('INVALID_VALUE', 'Local SKU exceeds 64 characters.');
  }
  return trimmed;
}

export function createStoreProduct(
  adapter: DatabaseAdapter,
  input: CreateStoreProductInput,
): StoreProductRow {
  const id = requireId(input.id);
  const storeId = requireId(input.storeId);
  const productVariantId = requireId(input.productVariantId);
  const localSku = normalizeSku(input.localSku);
  const preferredPackageUnitId = optionalId(input.preferredPackageUnitId);
  if (localSku !== null) {
    const clash = getStoreProductBySku(adapter, storeId, localSku);
    if (clash) {
      throw new DomainError(
        'INVALID_VALUE',
        'This store already uses that local SKU on another product.',
      );
    }
  }
  const timestamp = nowIso();
  adapter.run(
    `INSERT INTO store_products
      (id, store_id, product_variant_id, local_sku, preferred_package_unit_id,
       default_selling_price_minor, minimum_selling_price_minor, reorder_level_base_micros,
       is_temporary, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, ?, 'ACTIVE', ?, ?);`,
    [
      id,
      storeId,
      productVariantId,
      localSku,
      preferredPackageUnitId,
      fromBoolean(input.isTemporary ?? true),
      timestamp,
      timestamp,
    ],
  );
  const created = getStoreProductById(adapter, id);
  if (!created) {
    throw new Error('Store product insert did not persist.');
  }
  return created;
}

export function getStoreProductById(adapter: DatabaseAdapter, id: string): StoreProductRow | null {
  const row = adapter.getFirstRow<StoreProductRecord>(
    `SELECT ${COLUMNS} FROM store_products WHERE id = ?;`,
    [requireId(id)],
  );
  return row ? mapRow(row) : null;
}

export function getStoreProductByStoreAndVariant(
  adapter: DatabaseAdapter,
  storeId: string,
  productVariantId: string,
): StoreProductRow | null {
  const row = adapter.getFirstRow<StoreProductRecord>(
    `SELECT ${COLUMNS} FROM store_products WHERE store_id = ? AND product_variant_id = ?;`,
    [requireId(storeId), requireId(productVariantId)],
  );
  return row ? mapRow(row) : null;
}

export function getStoreProductBySku(
  adapter: DatabaseAdapter,
  storeId: string,
  localSku: string,
): StoreProductRow | null {
  const row = adapter.getFirstRow<StoreProductRecord>(
    `SELECT ${COLUMNS} FROM store_products WHERE store_id = ? AND local_sku = ?;`,
    [requireId(storeId), localSku],
  );
  return row ? mapRow(row) : null;
}

/**
 * Change only the local SKU. Prices, package settings, variant identity,
 * and lifecycle flags are outside this update by construction, so an
 * identity edit can never overwrite store commercial facts.
 */
export function updateStoreProductSku(
  adapter: DatabaseAdapter,
  id: string,
  localSku: string | null,
): StoreProductRow {
  const existing = getStoreProductById(adapter, requireId(id));
  if (!existing) {
    throw new DomainError('INVALID_VALUE', 'Store product does not exist.');
  }
  const normalized = normalizeSku(localSku ?? null);
  if (normalized !== null) {
    const clash = getStoreProductBySku(adapter, existing.storeId, normalized);
    if (clash && clash.id !== existing.id) {
      throw new DomainError(
        'INVALID_VALUE',
        'This store already uses that local SKU on another product.',
      );
    }
  }
  adapter.run('UPDATE store_products SET local_sku = ?, updated_at = ? WHERE id = ?;', [
    normalized,
    nowIso(),
    existing.id,
  ]);
  const updated = getStoreProductById(adapter, existing.id);
  if (!updated) {
    throw new Error('Store product SKU update did not persist.');
  }
  return updated;
}

/** Point the product at a different preferred package. Nothing else changes. */
export function updateStoreProductPreferredPackage(
  adapter: DatabaseAdapter,
  id: string,
  packageUnitId: string,
): StoreProductRow {
  const existing = getStoreProductById(adapter, requireId(id));
  if (!existing) {
    throw new DomainError('INVALID_VALUE', 'Store product does not exist.');
  }
  const preferred = requireId(packageUnitId);
  adapter.run('UPDATE store_products SET preferred_package_unit_id = ?, updated_at = ? WHERE id = ?;', [
    preferred,
    nowIso(),
    existing.id,
  ]);
  const updated = getStoreProductById(adapter, existing.id);
  if (!updated) {
    throw new Error('Store product preferred-package update did not persist.');
  }
  return updated;
}

/**
 * Lifecycle transition: temporary flag and active state only. Commercial
 * fields and variant ownership are untouched.
 */
export function updateStoreProductLifecycle(
  adapter: DatabaseAdapter,
  id: string,
  input: { isTemporary?: boolean; status?: CatalogueStatus },
): StoreProductRow {
  const existing = getStoreProductById(adapter, requireId(id));
  if (!existing) {
    throw new DomainError('INVALID_VALUE', 'Store product does not exist.');
  }
  if (input.status !== undefined && input.status !== 'ACTIVE' && input.status !== 'INACTIVE') {
    throw new DomainError('INVALID_VALUE', 'Store product status must be ACTIVE or INACTIVE.');
  }
  const isTemporary = input.isTemporary ?? existing.isTemporary;
  const status = input.status ?? existing.status;
  adapter.run('UPDATE store_products SET is_temporary = ?, status = ?, updated_at = ? WHERE id = ?;', [
    fromBoolean(isTemporary),
    status,
    nowIso(),
    existing.id,
  ]);
  const updated = getStoreProductById(adapter, existing.id);
  if (!updated) {
    throw new Error('Store product lifecycle update did not persist.');
  }
  return updated;
}

export type ProductLifecycleFilter = 'ALL' | 'ACTIVE' | 'INACTIVE' | 'TEMPORARY';

/** Escape user text for a LIKE pattern: %, _, and the escape itself stay data. */
export function escapeLikePattern(text: string): string {
  return text.replace(/[\\%_]/g, (match) => `\\${match}`);
}

export interface ProductSearchHit {
  product: StoreProductRow;
  variantName: string;
  variantStatus: CatalogueStatus;
  preferredPackageName: string | null;
  isTemporary: boolean;
}

/**
 * Offline catalogue search across variant name (substring), local SKU
 * (substring), and identifier value (exact normalized match). One
 * parameterized query; quotes and SQL-like input remain data. Results are
 * scoped to one store and ordered alphabetically with exact matches first.
 */
export function searchStoreProducts(
  adapter: DatabaseAdapter,
  storeId: string,
  query: string,
  filter: ProductLifecycleFilter = 'ALL',
): ProductSearchHit[] {
  const validatedStore = requireId(storeId);
  const trimmed = query.trim();
  const like = `%${escapeLikePattern(trimmed)}%`;
  const conditions: string[] = ['sp.store_id = ?'];
  const params: (string | number | null)[] = [validatedStore];
  if (filter === 'ACTIVE') {
    conditions.push("sp.status = 'ACTIVE'");
  } else if (filter === 'INACTIVE') {
    conditions.push("sp.status = 'INACTIVE'");
  } else if (filter === 'TEMPORARY') {
    conditions.push('sp.is_temporary = 1');
  }
  let rankExpression = '0';
  if (trimmed.length > 0) {
    conditions.push(
      `(pv.name LIKE ? ESCAPE '\\' OR sp.local_sku LIKE ? ESCAPE '\\' OR EXISTS (` +
        `SELECT 1 FROM product_identifiers pi ` +
        `WHERE pi.product_variant_id = pv.id AND pi.status = 'ACTIVE' AND pi.normalized_value = ?))`,
    );
    params.push(like, like, trimmed.toUpperCase());
    rankExpression =
      `CASE WHEN sp.local_sku = ? THEN 0 ` +
      `WHEN EXISTS (SELECT 1 FROM product_identifiers pi WHERE pi.product_variant_id = pv.id ` +
      `AND pi.status = 'ACTIVE' AND pi.normalized_value = ?) THEN 1 ELSE 2 END`;
    params.push(trimmed, trimmed.toUpperCase());
  }
  const orderBy =
    trimmed.length > 0
      ? `${rankExpression}, pv.name COLLATE NOCASE ASC`
      : 'pv.name COLLATE NOCASE ASC';
  const rows = adapter.getAllRows<
    StoreProductRecord & {
      variant_name: string;
      variant_status: CatalogueStatus;
      preferred_package_name: string | null;
    }
  >(
    `SELECT sp.${COLUMNS.split(', ').join(', sp.')}, pv.name AS variant_name, pv.status AS variant_status,
            ppu.name AS preferred_package_name
     FROM store_products sp
     JOIN product_variants pv ON pv.id = sp.product_variant_id
     LEFT JOIN package_units ppu ON ppu.id = sp.preferred_package_unit_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY ${orderBy};`,
    params,
  );
  return rows.map((row) => ({
    product: mapRow(row),
    variantName: row.variant_name,
    variantStatus: row.variant_status,
    preferredPackageName: row.preferred_package_name,
    isTemporary: toBoolean(row.is_temporary as number),
  }));
}

/**
 * Catalogue listing for one store: substring name/SKU match plus exact
 * identifier match, or the full alphabetical catalogue for an empty query.
 */
export function listStoreProducts(
  adapter: DatabaseAdapter,
  storeId: string,
  query = '',
  filter: ProductLifecycleFilter = 'ALL',
): ProductSearchHit[] {
  return searchStoreProducts(adapter, storeId, query, filter);
}
