import { DomainError } from '@retail/domain';

import type { DatabaseAdapter } from '../adapter';
import { nowIso, optionalId, requireId, requireText } from './common';

export type IdentityScope = 'STORE_LOCAL' | 'PLATFORM';
export type CatalogueStatus = 'ACTIVE' | 'INACTIVE';

const SCOPES: readonly IdentityScope[] = ['STORE_LOCAL', 'PLATFORM'];
const STATUSES: readonly CatalogueStatus[] = ['ACTIVE', 'INACTIVE'];

export interface ProductVariantRow {
  id: string;
  canonicalProductId: string | null;
  identityScope: IdentityScope;
  ownerStoreId: string | null;
  name: string;
  status: CatalogueStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductVariantInput {
  id: string;
  identityScope: IdentityScope;
  /** Required for STORE_LOCAL provisional variants (D-035); absent for PLATFORM. */
  ownerStoreId?: string | null;
  name: string;
}

type VariantRecord = Record<string, string | null>;

function mapRow(row: VariantRecord): ProductVariantRow {
  return {
    id: row.id as string,
    canonicalProductId: row.canonical_product_id,
    identityScope: row.identity_scope as IdentityScope,
    ownerStoreId: row.owner_store_id,
    name: row.name as string,
    status: row.status as CatalogueStatus,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

const COLUMNS =
  'id, canonical_product_id, identity_scope, owner_store_id, name, status, created_at, updated_at';

export function createProductVariant(
  adapter: DatabaseAdapter,
  input: CreateProductVariantInput,
): ProductVariantRow {
  const id = requireId(input.id);
  if (!SCOPES.includes(input.identityScope)) {
    throw new DomainError('INVALID_VALUE', 'Product variant scope must be STORE_LOCAL or PLATFORM.');
  }
  const ownerStoreId = optionalId(input.ownerStoreId);
  if (input.identityScope === 'STORE_LOCAL' && ownerStoreId === null) {
    throw new DomainError('INVALID_VALUE', 'A store-local provisional variant must name its owning store (D-035).');
  }
  if (input.identityScope === 'PLATFORM' && ownerStoreId !== null) {
    throw new DomainError('INVALID_VALUE', 'A platform variant must not carry an owning store.');
  }
  const name = requireText(input.name, 'product name');
  const timestamp = nowIso();
  adapter.run(
    `INSERT INTO product_variants
      (id, canonical_product_id, identity_scope, owner_store_id, name, status, created_at, updated_at)
     VALUES (?, NULL, ?, ?, ?, 'ACTIVE', ?, ?);`,
    [id, input.identityScope, ownerStoreId, name, timestamp, timestamp],
  );
  const created = getProductVariantById(adapter, id);
  if (!created) {
    throw new Error('Product variant insert did not persist.');
  }
  return created;
}

export function getProductVariantById(adapter: DatabaseAdapter, id: string): ProductVariantRow | null {
  const row = adapter.getFirstRow<VariantRecord>(
    `SELECT ${COLUMNS} FROM product_variants WHERE id = ?;`,
    [requireId(id)],
  );
  return row ? mapRow(row) : null;
}

/** Rename a variant. Ownership, scope, and linked store facts are untouched. */
export function renameProductVariant(
  adapter: DatabaseAdapter,
  id: string,
  name: string,
): ProductVariantRow {
  const validated = requireText(name, 'product name');
  const existing = getProductVariantById(adapter, requireId(id));
  if (!existing) {
    throw new DomainError('INVALID_VALUE', 'Product variant does not exist.');
  }
  adapter.run('UPDATE product_variants SET name = ?, updated_at = ? WHERE id = ?;', [
    validated,
    nowIso(),
    existing.id,
  ]);
  const updated = getProductVariantById(adapter, existing.id);
  if (!updated) {
    throw new Error('Product variant rename did not persist.');
  }
  return updated;
}

export function setProductVariantStatus(
  adapter: DatabaseAdapter,
  id: string,
  status: CatalogueStatus,
): ProductVariantRow {
  if (!STATUSES.includes(status)) {
    throw new DomainError('INVALID_VALUE', 'Product variant status must be ACTIVE or INACTIVE.');
  }
  const existing = getProductVariantById(adapter, requireId(id));
  if (!existing) {
    throw new DomainError('INVALID_VALUE', 'Product variant does not exist.');
  }
  adapter.run('UPDATE product_variants SET status = ?, updated_at = ? WHERE id = ?;', [
    status,
    nowIso(),
    existing.id,
  ]);
  const updated = getProductVariantById(adapter, existing.id);
  if (!updated) {
    throw new Error('Product variant status change did not persist.');
  }
  return updated;
}

/** Store-owned provisional variants, alphabetical by name. */
export function listStoreVariants(
  adapter: DatabaseAdapter,
  ownerStoreId: string,
): ProductVariantRow[] {
  return adapter
    .getAllRows<VariantRecord>(
      `SELECT ${COLUMNS} FROM product_variants
       WHERE identity_scope = 'STORE_LOCAL' AND owner_store_id = ?
       ORDER BY name COLLATE NOCASE ASC;`,
      [requireId(ownerStoreId)],
    )
    .map(mapRow);
}
