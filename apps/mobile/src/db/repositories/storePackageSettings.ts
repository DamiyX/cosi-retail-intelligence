import { DomainError } from '@retail/domain';

import type { DatabaseAdapter } from '../adapter';
import { fromBoolean, nowIso, optionalMoneyMinor, requireId, toBoolean } from './common';

export interface StorePackageSettingRow {
  id: string;
  storeProductId: string;
  packageUnitId: string;
  defaultSellingPriceMinor: number | null;
  minimumSellingPriceMinor: number | null;
  isPreferredForSale: boolean;
  isPreferredForPurchase: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SaveStorePackageSettingInput {
  id: string;
  storeProductId: string;
  packageUnitId: string;
  defaultSellingPriceMinor?: number | null;
  minimumSellingPriceMinor?: number | null;
  isPreferredForSale?: boolean;
  isPreferredForPurchase?: boolean;
}

type SettingRecord = Record<string, string | number | null>;

function mapRow(row: SettingRecord): StorePackageSettingRow {
  return {
    id: row.id as string,
    storeProductId: row.store_product_id as string,
    packageUnitId: row.package_unit_id as string,
    defaultSellingPriceMinor: (row.default_selling_price_minor as number | null) ?? null,
    minimumSellingPriceMinor: (row.minimum_selling_price_minor as number | null) ?? null,
    isPreferredForSale: toBoolean(row.is_preferred_for_sale as number),
    isPreferredForPurchase: toBoolean(row.is_preferred_for_purchase as number),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

const COLUMNS =
  'id, store_product_id, package_unit_id, default_selling_price_minor, ' +
  'minimum_selling_price_minor, is_preferred_for_sale, is_preferred_for_purchase, ' +
  'created_at, updated_at';

/**
 * Create or replace the store's price and preference facts for one package.
 * Only store-owned fields are written; package identity (name, conversion)
 * lives in package_units and is never touched here.
 */
export function saveStorePackageSetting(
  adapter: DatabaseAdapter,
  input: SaveStorePackageSettingInput,
): StorePackageSettingRow {
  const id = requireId(input.id);
  const storeProductId = requireId(input.storeProductId);
  const packageUnitId = requireId(input.packageUnitId);
  const defaultPrice = optionalMoneyMinor(input.defaultSellingPriceMinor, 'default selling price');
  const minimumPrice = optionalMoneyMinor(input.minimumSellingPriceMinor, 'minimum selling price');
  if (defaultPrice !== null && minimumPrice !== null && minimumPrice > defaultPrice) {
    throw new DomainError(
      'INVALID_VALUE',
      'The minimum selling price cannot exceed the default selling price.',
    );
  }
  const timestamp = nowIso();
  adapter.run(
    `INSERT INTO store_package_settings
      (id, store_product_id, package_unit_id, default_selling_price_minor,
       minimum_selling_price_minor, is_preferred_for_sale, is_preferred_for_purchase,
       created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (store_product_id, package_unit_id) DO UPDATE SET
       default_selling_price_minor = excluded.default_selling_price_minor,
       minimum_selling_price_minor = excluded.minimum_selling_price_minor,
       is_preferred_for_sale = excluded.is_preferred_for_sale,
       is_preferred_for_purchase = excluded.is_preferred_for_purchase,
       updated_at = excluded.updated_at;`,
    [
      id,
      storeProductId,
      packageUnitId,
      defaultPrice,
      minimumPrice,
      fromBoolean(input.isPreferredForSale ?? false),
      fromBoolean(input.isPreferredForPurchase ?? false),
      timestamp,
      timestamp,
    ],
  );
  const saved = getStorePackageSetting(adapter, storeProductId, packageUnitId);
  if (!saved) {
    throw new Error('Store package setting did not persist.');
  }
  return saved;
}

export function getStorePackageSetting(
  adapter: DatabaseAdapter,
  storeProductId: string,
  packageUnitId: string,
): StorePackageSettingRow | null {
  const row = adapter.getFirstRow<SettingRecord>(
    `SELECT ${COLUMNS} FROM store_package_settings
     WHERE store_product_id = ? AND package_unit_id = ?;`,
    [requireId(storeProductId), requireId(packageUnitId)],
  );
  return row ? mapRow(row) : null;
}

/** Every store-owned package setting for one product. */
export function listStorePackageSettings(
  adapter: DatabaseAdapter,
  storeProductId: string,
): StorePackageSettingRow[] {
  return adapter
    .getAllRows<SettingRecord>(
      `SELECT ${COLUMNS} FROM store_package_settings WHERE store_product_id = ?;`,
      [requireId(storeProductId)],
    )
    .map(mapRow);
}
