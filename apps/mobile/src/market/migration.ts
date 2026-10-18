import type { Migration } from '../db/migrations';

/** Append only: private receipts, outbox and schema 1–26 are untouched. */
export const marketMigration: Migration = {
  version: 27,
  name: 'market_control_and_cache',
  statements: [
    `CREATE TABLE market_control (
      store_id TEXT PRIMARY KEY REFERENCES stores(id) ON DELETE RESTRICT,
      acknowledgement TEXT, pending_request TEXT,
      local_off INTEGER NOT NULL DEFAULT 1 CHECK(local_off IN (0,1)),
      disable_requested INTEGER NOT NULL DEFAULT 0 CHECK(disable_requested IN (0,1)),
      epoch INTEGER NOT NULL DEFAULT 0 CHECK(epoch >= 0),
      cache_revision INTEGER NOT NULL DEFAULT 0 CHECK(cache_revision >= 0),
      cache_context TEXT, message TEXT
    );`,
    `CREATE TABLE market_cache (
      store_id TEXT NOT NULL REFERENCES market_control(store_id) ON DELETE CASCADE,
      product_variant_id TEXT NOT NULL, package_unit_id TEXT NOT NULL,
      response TEXT NOT NULL, local_identity_context TEXT NOT NULL,
      PRIMARY KEY(store_id, product_variant_id, package_unit_id)
    );`,
    `CREATE TRIGGER market_cache_limit BEFORE INSERT ON market_cache
      WHEN NOT EXISTS(SELECT 1 FROM market_cache WHERE store_id=NEW.store_id
        AND product_variant_id=NEW.product_variant_id AND package_unit_id=NEW.package_unit_id)
        AND (SELECT COUNT(*) FROM market_cache WHERE store_id=NEW.store_id) >= 100
      BEGIN SELECT RAISE(ABORT, 'Market cache limit'); END;`,
  ],
};
