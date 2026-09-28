import type { DatabaseAdapter } from './adapter';
import { DatabaseError } from './errors';

export interface Migration {
  /** 1-based, contiguous position in the registry. */
  version: number;
  /** Short human-readable label used in diagnostics. */
  name: string;
  /** Ordered scripts applied atomically as one unit. */
  statements: string[];
}

export interface OpenDatabaseReport {
  schemaVersion: number;
  foreignKeysEnforced: boolean;
  journalMode: string;
}

/**
 * Ordered migration registry. Append-only: never reorder, rewrite, or delete
 * an entry once devices may hold it.
 */
export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'store_context',
    statements: [
      `CREATE TABLE stores (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        currency_code TEXT NOT NULL,
        country_code TEXT NOT NULL,
        timezone TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,
      `CREATE TABLE users (
        id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,
      `CREATE TABLE store_members (
        id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        role TEXT NOT NULL CHECK (role IN ('OWNER', 'ADMIN', 'STAFF')),
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        joined_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE (store_id, user_id)
      );`,
      'CREATE INDEX idx_store_members_store ON store_members(store_id);',
      'CREATE INDEX idx_store_members_user ON store_members(user_id);',
      `CREATE TABLE devices (
        id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
        user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        platform TEXT NOT NULL CHECK (platform IN ('ANDROID', 'IOS', 'OTHER')),
        device_label TEXT,
        app_version TEXT NOT NULL,
        last_seen_at TEXT,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        created_at TEXT NOT NULL
      );`,
      'CREATE INDEX idx_devices_store ON devices(store_id);',
    ],
  },
  {
    version: 2,
    name: 'catalogue',
    statements: [
      `CREATE TABLE product_variants (
        id TEXT PRIMARY KEY,
        canonical_product_id TEXT,
        identity_scope TEXT NOT NULL CHECK (identity_scope IN ('STORE_LOCAL', 'PLATFORM')),
        owner_store_id TEXT REFERENCES stores(id) ON DELETE RESTRICT,
        name TEXT NOT NULL CHECK (length(name) > 0 AND length(name) <= 500),
        status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        CHECK (
          (identity_scope = 'STORE_LOCAL' AND owner_store_id IS NOT NULL)
          OR (identity_scope = 'PLATFORM' AND owner_store_id IS NULL)
        )
      );`,
      'CREATE INDEX idx_product_variants_owner ON product_variants(owner_store_id);',
      'CREATE INDEX idx_product_variants_name ON product_variants(name);',
      `CREATE TABLE package_units (
        id TEXT PRIMARY KEY,
        product_variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
        name TEXT NOT NULL CHECK (length(name) > 0 AND length(name) <= 100),
        symbol TEXT CHECK (symbol IS NULL OR (length(symbol) > 0 AND length(symbol) <= 24)),
        conversion_to_base_micros INTEGER NOT NULL CHECK (conversion_to_base_micros > 0),
        is_base_unit INTEGER NOT NULL DEFAULT 0 CHECK (is_base_unit IN (0, 1)),
        is_sellable INTEGER NOT NULL DEFAULT 1 CHECK (is_sellable IN (0, 1)),
        is_purchasable INTEGER NOT NULL DEFAULT 1 CHECK (is_purchasable IN (0, 1)),
        status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,
      `CREATE UNIQUE INDEX uq_package_units_active_base
        ON package_units(product_variant_id)
        WHERE is_base_unit = 1 AND status = 'ACTIVE';`,
      'CREATE INDEX idx_package_units_variant ON package_units(product_variant_id);',
      `CREATE TABLE store_products (
        id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
        product_variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
        local_sku TEXT CHECK (local_sku IS NULL OR (length(local_sku) > 0 AND length(local_sku) <= 64)),
        preferred_package_unit_id TEXT REFERENCES package_units(id) ON DELETE RESTRICT,
        default_selling_price_minor INTEGER CHECK (default_selling_price_minor >= 0),
        minimum_selling_price_minor INTEGER CHECK (minimum_selling_price_minor >= 0),
        reorder_level_base_micros INTEGER CHECK (reorder_level_base_micros >= 0),
        is_temporary INTEGER NOT NULL DEFAULT 1 CHECK (is_temporary IN (0, 1)),
        status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE (store_id, product_variant_id)
      );`,
      `CREATE UNIQUE INDEX uq_store_products_sku
        ON store_products(store_id, local_sku)
        WHERE local_sku IS NOT NULL;`,
      'CREATE INDEX idx_store_products_store ON store_products(store_id, status);',
      `CREATE TRIGGER trg_store_products_variant_owner_insert
        BEFORE INSERT ON store_products
        WHEN NOT EXISTS (
          SELECT 1 FROM product_variants pv
          WHERE pv.id = NEW.product_variant_id
            AND (pv.identity_scope = 'PLATFORM' OR pv.owner_store_id = NEW.store_id)
        )
        BEGIN SELECT RAISE(ABORT, 'store product variant ownership mismatch'); END;`,
      `CREATE TRIGGER trg_store_products_variant_owner_update
        BEFORE UPDATE OF store_id, product_variant_id ON store_products
        WHEN NOT EXISTS (
          SELECT 1 FROM product_variants pv
          WHERE pv.id = NEW.product_variant_id
            AND (pv.identity_scope = 'PLATFORM' OR pv.owner_store_id = NEW.store_id)
        )
        BEGIN SELECT RAISE(ABORT, 'store product variant ownership mismatch'); END;`,
      `CREATE TRIGGER trg_store_products_preferred_package_insert
        BEFORE INSERT ON store_products
        WHEN NEW.preferred_package_unit_id IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM package_units pu
          WHERE pu.id = NEW.preferred_package_unit_id
            AND pu.product_variant_id = NEW.product_variant_id
            AND pu.status = 'ACTIVE'
        )
        BEGIN SELECT RAISE(ABORT, 'preferred package does not belong to product variant'); END;`,
      `CREATE TRIGGER trg_store_products_preferred_package_update
        BEFORE UPDATE OF preferred_package_unit_id, product_variant_id ON store_products
        WHEN NEW.preferred_package_unit_id IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM package_units pu
          WHERE pu.id = NEW.preferred_package_unit_id
            AND pu.product_variant_id = NEW.product_variant_id
            AND pu.status = 'ACTIVE'
        )
        BEGIN SELECT RAISE(ABORT, 'preferred package does not belong to product variant'); END;`,
      `CREATE TABLE store_package_settings (
        id TEXT PRIMARY KEY,
        store_product_id TEXT NOT NULL REFERENCES store_products(id) ON DELETE RESTRICT,
        package_unit_id TEXT NOT NULL REFERENCES package_units(id) ON DELETE RESTRICT,
        default_selling_price_minor INTEGER CHECK (default_selling_price_minor >= 0),
        minimum_selling_price_minor INTEGER CHECK (minimum_selling_price_minor >= 0),
        is_preferred_for_sale INTEGER NOT NULL DEFAULT 0 CHECK (is_preferred_for_sale IN (0, 1)),
        is_preferred_for_purchase INTEGER NOT NULL DEFAULT 0 CHECK (is_preferred_for_purchase IN (0, 1)),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE (store_product_id, package_unit_id)
      );`,
      'CREATE INDEX idx_store_package_settings_product ON store_package_settings(store_product_id);',
      `CREATE UNIQUE INDEX uq_store_package_settings_preferred_sale
        ON store_package_settings(store_product_id)
        WHERE is_preferred_for_sale = 1;`,
      `CREATE UNIQUE INDEX uq_store_package_settings_preferred_purchase
        ON store_package_settings(store_product_id)
        WHERE is_preferred_for_purchase = 1;`,
      `CREATE TRIGGER trg_store_package_settings_variant_insert
        BEFORE INSERT ON store_package_settings
        WHEN NOT EXISTS (
          SELECT 1 FROM store_products sp
          JOIN package_units pu ON pu.id = NEW.package_unit_id
          WHERE sp.id = NEW.store_product_id
            AND sp.product_variant_id = pu.product_variant_id
        )
        BEGIN SELECT RAISE(ABORT, 'package setting variant mismatch'); END;`,
      `CREATE TRIGGER trg_store_package_settings_variant_update
        BEFORE UPDATE OF store_product_id, package_unit_id ON store_package_settings
        WHEN NOT EXISTS (
          SELECT 1 FROM store_products sp
          JOIN package_units pu ON pu.id = NEW.package_unit_id
          WHERE sp.id = NEW.store_product_id
            AND sp.product_variant_id = pu.product_variant_id
        )
        BEGIN SELECT RAISE(ABORT, 'package setting variant mismatch'); END;`,
      `CREATE TRIGGER trg_store_package_settings_active_preference_insert
        BEFORE INSERT ON store_package_settings
        WHEN (NEW.is_preferred_for_sale = 1 OR NEW.is_preferred_for_purchase = 1)
          AND NOT EXISTS (
            SELECT 1 FROM package_units pu
            WHERE pu.id = NEW.package_unit_id AND pu.status = 'ACTIVE'
          )
        BEGIN SELECT RAISE(ABORT, 'inactive package cannot be preferred'); END;`,
      `CREATE TRIGGER trg_store_package_settings_active_preference_update
        BEFORE UPDATE OF package_unit_id, is_preferred_for_sale, is_preferred_for_purchase
        ON store_package_settings
        WHEN (NEW.is_preferred_for_sale = 1 OR NEW.is_preferred_for_purchase = 1)
          AND NOT EXISTS (
            SELECT 1 FROM package_units pu
            WHERE pu.id = NEW.package_unit_id AND pu.status = 'ACTIVE'
          )
        BEGIN SELECT RAISE(ABORT, 'inactive package cannot be preferred'); END;`,
      `CREATE TABLE product_identifiers (
        id TEXT PRIMARY KEY,
        product_variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
        package_unit_id TEXT REFERENCES package_units(id) ON DELETE RESTRICT,
        type TEXT NOT NULL CHECK (type IN ('EAN', 'UPC', 'QR', 'INTERNAL_CODE', 'MANUFACTURER_CODE')),
        value TEXT NOT NULL CHECK (length(value) > 0 AND length(value) <= 128),
        normalized_value TEXT NOT NULL CHECK (length(normalized_value) > 0 AND length(normalized_value) <= 128),
        country_market TEXT,
        status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
        created_at TEXT NOT NULL
      );`,
      `CREATE UNIQUE INDEX uq_identifiers_exact
        ON product_identifiers(normalized_value)
        WHERE type IN ('EAN', 'UPC', 'QR') AND status = 'ACTIVE';`,
      `CREATE UNIQUE INDEX uq_identifiers_internal
        ON product_identifiers(product_variant_id, type, normalized_value)
        WHERE type IN ('INTERNAL_CODE', 'MANUFACTURER_CODE') AND status = 'ACTIVE';`,
      'CREATE INDEX idx_identifiers_variant ON product_identifiers(product_variant_id);',
      'CREATE INDEX idx_identifiers_lookup ON product_identifiers(normalized_value);',
      `CREATE TRIGGER trg_product_identifiers_package_insert
        BEFORE INSERT ON product_identifiers
        WHEN NEW.package_unit_id IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM package_units pu
          WHERE pu.id = NEW.package_unit_id
            AND pu.product_variant_id = NEW.product_variant_id
        )
        BEGIN SELECT RAISE(ABORT, 'identifier package variant mismatch'); END;`,
      `CREATE TRIGGER trg_product_identifiers_package_update
        BEFORE UPDATE OF product_variant_id, package_unit_id ON product_identifiers
        WHEN NEW.package_unit_id IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM package_units pu
          WHERE pu.id = NEW.package_unit_id
            AND pu.product_variant_id = NEW.product_variant_id
        )
        BEGIN SELECT RAISE(ABORT, 'identifier package variant mismatch'); END;`,
      `CREATE TABLE outbox_operations (
        operation_id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
        device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE RESTRICT,
        entity_type TEXT NOT NULL CHECK (length(entity_type) > 0),
        entity_id TEXT NOT NULL CHECK (length(entity_id) > 0),
        operation_type TEXT NOT NULL CHECK (length(operation_type) > 0),
        base_server_version INTEGER,
        payload TEXT NOT NULL CHECK (length(payload) > 0),
        created_at TEXT NOT NULL,
        attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
        next_attempt_at TEXT,
        last_error_code TEXT,
        status TEXT NOT NULL DEFAULT 'PENDING'
          CHECK (status IN ('PENDING', 'SYNCING', 'SYNCED', 'CONFLICT', 'ERROR_RETRYABLE', 'ERROR_PERMANENT'))
      );`,
      'CREATE INDEX idx_outbox_store_status ON outbox_operations(store_id, status, created_at);',
      `CREATE TRIGGER trg_outbox_device_store_insert
        BEFORE INSERT ON outbox_operations
        WHEN NOT EXISTS (
          SELECT 1 FROM devices d
          WHERE d.id = NEW.device_id AND d.store_id = NEW.store_id
        )
        BEGIN SELECT RAISE(ABORT, 'outbox device does not belong to store'); END;`,
      `CREATE TRIGGER trg_outbox_device_store_update
        BEFORE UPDATE OF store_id, device_id ON outbox_operations
        WHEN NOT EXISTS (
          SELECT 1 FROM devices d
          WHERE d.id = NEW.device_id AND d.store_id = NEW.store_id
        )
        BEGIN SELECT RAISE(ABORT, 'outbox device does not belong to store'); END;`,
    ],
  },
  {
    version: 3,
    name: 'sales_and_inventory',
    statements: [
      `CREATE TABLE sales (
        id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
        device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE RESTRICT,
        created_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        occurred_at TEXT NOT NULL,
        currency_code TEXT NOT NULL CHECK (length(currency_code) = 3),
        subtotal_minor INTEGER NOT NULL CHECK (subtotal_minor >= 0),
        discount_total_minor INTEGER NOT NULL DEFAULT 0 CHECK (discount_total_minor >= 0),
        total_minor INTEGER NOT NULL CHECK (total_minor >= 0),
        status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'VOIDED')),
        note TEXT CHECK (note IS NULL OR length(note) <= 500),
        created_at TEXT NOT NULL,
        completed_at TEXT NOT NULL,
        CHECK (total_minor = subtotal_minor - discount_total_minor)
      );`,
      'CREATE INDEX idx_sales_store_occurred ON sales(store_id, occurred_at DESC);',
      'CREATE INDEX idx_sales_store_status ON sales(store_id, status);',
      `CREATE TRIGGER trg_sales_device_store_insert
        BEFORE INSERT ON sales
        WHEN NOT EXISTS (
          SELECT 1 FROM devices d
          WHERE d.id = NEW.device_id AND d.store_id = NEW.store_id
        )
        BEGIN SELECT RAISE(ABORT, 'sales device does not belong to store'); END;`,
      `CREATE TRIGGER trg_sales_user_store_insert
        BEFORE INSERT ON sales
        WHEN NOT EXISTS (
          SELECT 1 FROM store_members sm
          WHERE sm.user_id = NEW.created_by_user_id AND sm.store_id = NEW.store_id AND sm.status = 'ACTIVE'
        )
        BEGIN SELECT RAISE(ABORT, 'sales user is not an active store member'); END;`,
      `CREATE TRIGGER trg_sales_currency_store_insert
        BEFORE INSERT ON sales
        WHEN NOT EXISTS (
          SELECT 1 FROM stores s
          WHERE s.id = NEW.store_id AND s.currency_code = NEW.currency_code
        )
        BEGIN SELECT RAISE(ABORT, 'sales currency mismatch with store'); END;`,
      `CREATE TABLE sale_items (
        id TEXT PRIMARY KEY,
        sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
        store_product_id TEXT NOT NULL REFERENCES store_products(id) ON DELETE RESTRICT,
        product_variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
        package_unit_id TEXT NOT NULL REFERENCES package_units(id) ON DELETE RESTRICT,
        quantity_packages_micros INTEGER NOT NULL CHECK (quantity_packages_micros > 0),
        conversion_to_base_snapshot_micros INTEGER NOT NULL CHECK (conversion_to_base_snapshot_micros > 0),
        quantity_base_micros INTEGER NOT NULL CHECK (quantity_base_micros > 0),
        unit_price_minor INTEGER NOT NULL CHECK (unit_price_minor >= 0),
        gross_total_minor INTEGER NOT NULL CHECK (gross_total_minor >= 0),
        discount_amount_minor INTEGER NOT NULL DEFAULT 0 CHECK (discount_amount_minor >= 0),
        net_total_minor INTEGER NOT NULL CHECK (net_total_minor >= 0),
        unit_cost_base_snapshot_minor INTEGER CHECK (unit_cost_base_snapshot_minor IS NULL OR unit_cost_base_snapshot_minor >= 0),
        cogs_amount_minor INTEGER CHECK (cogs_amount_minor IS NULL OR cogs_amount_minor >= 0),
        product_name_snapshot TEXT NOT NULL CHECK (length(product_name_snapshot) > 0),
        package_name_snapshot TEXT NOT NULL CHECK (length(package_name_snapshot) > 0),
        created_at TEXT NOT NULL,
        CHECK (net_total_minor = gross_total_minor - discount_amount_minor)
      );`,
      'CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);',
      'CREATE INDEX idx_sale_items_store_product ON sale_items(store_product_id);',
      `CREATE TRIGGER trg_sale_items_store_product_insert
        BEFORE INSERT ON sale_items
        WHEN NOT EXISTS (
          SELECT 1 FROM sales s
          JOIN store_products sp ON sp.id = NEW.store_product_id
          WHERE s.id = NEW.sale_id AND sp.store_id = s.store_id
        )
        BEGIN SELECT RAISE(ABORT, 'sale item store product does not belong to sale store'); END;`,
      `CREATE TRIGGER trg_sale_items_variant_insert
        BEFORE INSERT ON sale_items
        WHEN NOT EXISTS (
          SELECT 1 FROM store_products sp
          WHERE sp.id = NEW.store_product_id AND sp.product_variant_id = NEW.product_variant_id
        )
        BEGIN SELECT RAISE(ABORT, 'sale item variant mismatch with store product'); END;`,
      `CREATE TRIGGER trg_sale_items_package_insert
        BEFORE INSERT ON sale_items
        WHEN NOT EXISTS (
          SELECT 1 FROM package_units pu
          WHERE pu.id = NEW.package_unit_id AND pu.product_variant_id = NEW.product_variant_id
        )
        BEGIN SELECT RAISE(ABORT, 'sale item package unit does not belong to product variant'); END;`,
      `CREATE TABLE payments (
        id TEXT PRIMARY KEY,
        sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
        method TEXT NOT NULL CHECK (method IN ('CASH', 'BANK_TRANSFER', 'POS_CARD', 'CREDIT')),
        amount_minor INTEGER NOT NULL CHECK (amount_minor >= 0),
        currency_code TEXT NOT NULL CHECK (length(currency_code) = 3),
        recorded_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        payment_reference TEXT CHECK (payment_reference IS NULL OR length(payment_reference) <= 128),
        created_at TEXT NOT NULL,
        UNIQUE (sale_id)
      );`,
      'CREATE INDEX idx_payments_sale ON payments(sale_id);',
      'CREATE INDEX idx_payments_method ON payments(method);',
      `CREATE TRIGGER trg_payments_currency_insert
        BEFORE INSERT ON payments
        WHEN NOT EXISTS (
          SELECT 1 FROM sales s
          WHERE s.id = NEW.sale_id AND s.currency_code = NEW.currency_code
        )
        BEGIN SELECT RAISE(ABORT, 'payment currency mismatch with sale'); END;`,
      `CREATE TRIGGER trg_payments_user_store_insert
        BEFORE INSERT ON payments
        WHEN NOT EXISTS (
          SELECT 1 FROM sales s
          JOIN store_members sm ON sm.store_id = s.store_id AND sm.user_id = NEW.recorded_by_user_id
          WHERE s.id = NEW.sale_id AND sm.status = 'ACTIVE'
        )
        BEGIN SELECT RAISE(ABORT, 'payment user is not an active store member'); END;`,
      `CREATE TRIGGER trg_payments_amount_matches_sale_insert
        BEFORE INSERT ON payments
        WHEN NOT EXISTS (
          SELECT 1 FROM sales s
          WHERE s.id = NEW.sale_id AND s.total_minor = NEW.amount_minor
        )
        BEGIN SELECT RAISE(ABORT, 'payment amount must equal completed sale total'); END;`,
      `CREATE TRIGGER trg_payments_credit_positive_insert
        BEFORE INSERT ON payments
        WHEN NEW.method = 'CREDIT' AND NEW.amount_minor <= 0
        BEGIN SELECT RAISE(ABORT, 'credit payment amount must be positive'); END;`,
      `CREATE TABLE inventory_events (
        id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
        store_product_id TEXT NOT NULL REFERENCES store_products(id) ON DELETE RESTRICT,
        event_type TEXT NOT NULL CHECK (event_type IN ('PURCHASE', 'SALE', 'CUSTOMER_RETURN', 'SUPPLIER_RETURN', 'DAMAGED', 'EXPIRED', 'MISSING', 'PERSONAL_USE', 'CORRECTION', 'OPENING_BALANCE')),
        quantity_base_delta_micros INTEGER NOT NULL CHECK (quantity_base_delta_micros <> 0),
        package_unit_id TEXT REFERENCES package_units(id) ON DELETE RESTRICT,
        quantity_package_snapshot_micros INTEGER,
        conversion_to_base_snapshot_micros INTEGER,
        source_type TEXT NOT NULL CHECK (source_type IN ('SALE', 'PURCHASE', 'RECONCILIATION', 'MANUAL_ADJUSTMENT', 'OPENING_BALANCE')),
        source_id TEXT,
        reason_code TEXT,
        note TEXT CHECK (note IS NULL OR length(note) <= 500),
        occurred_at TEXT NOT NULL,
        created_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE RESTRICT,
        created_at TEXT NOT NULL
      );`,
      'CREATE INDEX idx_inventory_events_store_product ON inventory_events(store_id, store_product_id, occurred_at);',
      'CREATE INDEX idx_inventory_events_source ON inventory_events(source_type, source_id);',
      `CREATE TRIGGER trg_inventory_events_store_product_insert
        BEFORE INSERT ON inventory_events
        WHEN NOT EXISTS (
          SELECT 1 FROM store_products sp
          WHERE sp.id = NEW.store_product_id AND sp.store_id = NEW.store_id
        )
        BEGIN SELECT RAISE(ABORT, 'inventory event store product does not belong to store'); END;`,
      `CREATE TRIGGER trg_inventory_events_device_store_insert
        BEFORE INSERT ON inventory_events
        WHEN NOT EXISTS (
          SELECT 1 FROM devices d
          WHERE d.id = NEW.device_id AND d.store_id = NEW.store_id
        )
        BEGIN SELECT RAISE(ABORT, 'inventory event device does not belong to store'); END;`,
      `CREATE TRIGGER trg_inventory_events_user_store_insert
        BEFORE INSERT ON inventory_events
        WHEN NOT EXISTS (
          SELECT 1 FROM store_members sm
          WHERE sm.store_id = NEW.store_id
            AND sm.user_id = NEW.created_by_user_id
            AND sm.status = 'ACTIVE'
        )
        BEGIN SELECT RAISE(ABORT, 'inventory event user is not an active store member'); END;`,
      `CREATE TRIGGER trg_inventory_events_package_variant_insert
        BEFORE INSERT ON inventory_events
        WHEN NEW.package_unit_id IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM store_products sp
          JOIN package_units pu ON pu.id = NEW.package_unit_id
          WHERE sp.id = NEW.store_product_id
            AND pu.product_variant_id = sp.product_variant_id
        )
        BEGIN SELECT RAISE(ABORT, 'inventory event package does not belong to store product'); END;`,
      `CREATE TRIGGER trg_inventory_events_sale_source_insert
        BEFORE INSERT ON inventory_events
        WHEN NEW.event_type = 'SALE' AND (
          NEW.source_type <> 'SALE'
          OR NEW.source_id IS NULL
          OR NEW.quantity_base_delta_micros >= 0
          OR NEW.package_unit_id IS NULL
          OR NEW.quantity_package_snapshot_micros IS NULL
          OR NEW.conversion_to_base_snapshot_micros IS NULL
          OR NOT EXISTS (
            SELECT 1 FROM sales s
            WHERE s.id = NEW.source_id AND s.store_id = NEW.store_id
          )
        )
        BEGIN SELECT RAISE(ABORT, 'sale inventory event must be a negative snapshot for its sale'); END;`,
      `CREATE TABLE customer_accounts (
        id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
        name TEXT NOT NULL CHECK (length(name) > 0 AND length(name) <= 200),
        phone TEXT CHECK (phone IS NULL OR (length(phone) > 0 AND length(phone) <= 32)),
        notes TEXT CHECK (notes IS NULL OR length(notes) <= 500),
        status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,
      'CREATE INDEX idx_customer_accounts_store_name ON customer_accounts(store_id, name);',
      `CREATE TABLE receivables (
        id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
        sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
        customer_account_id TEXT NOT NULL REFERENCES customer_accounts(id) ON DELETE RESTRICT,
        original_amount_minor INTEGER NOT NULL CHECK (original_amount_minor > 0),
        outstanding_amount_minor INTEGER NOT NULL CHECK (outstanding_amount_minor >= 0 AND outstanding_amount_minor <= original_amount_minor),
        status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'PARTIALLY_PAID', 'PAID', 'WRITTEN_OFF')),
        due_date TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE (sale_id)
      );`,
      'CREATE INDEX idx_receivables_store_status ON receivables(store_id, status);',
      'CREATE INDEX idx_receivables_customer ON receivables(customer_account_id);',
      `CREATE TRIGGER trg_receivables_customer_store_insert
        BEFORE INSERT ON receivables
        WHEN NOT EXISTS (
          SELECT 1 FROM customer_accounts ca
          WHERE ca.id = NEW.customer_account_id AND ca.store_id = NEW.store_id
        )
        BEGIN SELECT RAISE(ABORT, 'receivable customer account does not belong to store'); END;`,
      `CREATE TRIGGER trg_receivables_sale_store_insert
        BEFORE INSERT ON receivables
        WHEN NOT EXISTS (
          SELECT 1 FROM sales s
          WHERE s.id = NEW.sale_id AND s.store_id = NEW.store_id
        )
        BEGIN SELECT RAISE(ABORT, 'receivable sale does not belong to store'); END;`,
      `CREATE TRIGGER trg_receivables_credit_payment_insert
        BEFORE INSERT ON receivables
        WHEN NEW.status <> 'OPEN'
          OR NEW.outstanding_amount_minor <> NEW.original_amount_minor
          OR NOT EXISTS (
            SELECT 1 FROM payments p
            WHERE p.sale_id = NEW.sale_id
              AND p.method = 'CREDIT'
              AND p.amount_minor = NEW.original_amount_minor
          )
        BEGIN SELECT RAISE(ABORT, 'receivable must open for the matching credit payment'); END;`,
      `CREATE UNIQUE INDEX uq_outbox_completed_sale_entity
        ON outbox_operations(entity_type, entity_id)
        WHERE operation_type = 'COMPLETED_SALE_CREATED';`,
      `CREATE TRIGGER trg_sales_immutable_update
        BEFORE UPDATE ON sales
        BEGIN SELECT RAISE(ABORT, 'completed sales are immutable'); END;`,
      `CREATE TRIGGER trg_sales_immutable_delete
        BEFORE DELETE ON sales
        BEGIN SELECT RAISE(ABORT, 'completed sales are immutable'); END;`,
      `CREATE TRIGGER trg_sale_items_immutable_update
        BEFORE UPDATE ON sale_items
        BEGIN SELECT RAISE(ABORT, 'completed sale items are immutable'); END;`,
      `CREATE TRIGGER trg_sale_items_immutable_delete
        BEFORE DELETE ON sale_items
        BEGIN SELECT RAISE(ABORT, 'completed sale items are immutable'); END;`,
      `CREATE TRIGGER trg_payments_immutable_update
        BEFORE UPDATE ON payments
        BEGIN SELECT RAISE(ABORT, 'completed sale payments are immutable'); END;`,
      `CREATE TRIGGER trg_payments_immutable_delete
        BEFORE DELETE ON payments
        BEGIN SELECT RAISE(ABORT, 'completed sale payments are immutable'); END;`,
      `CREATE TRIGGER trg_inventory_events_immutable_update
        BEFORE UPDATE ON inventory_events
        BEGIN SELECT RAISE(ABORT, 'inventory events are append-only'); END;`,
      `CREATE TRIGGER trg_inventory_events_immutable_delete
        BEFORE DELETE ON inventory_events
        BEGIN SELECT RAISE(ABORT, 'inventory events are append-only'); END;`,
    ],
  },
  {
    version: 4,
    name: 'restocking_costing',
    statements: [
      `CREATE TABLE suppliers (
        id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
        name TEXT NOT NULL CHECK (length(name) > 0 AND length(name) <= 200),
        status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,
      'CREATE INDEX idx_suppliers_store_name ON suppliers(store_id, name);',
      `CREATE TABLE purchases (
        id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
        supplier_id TEXT REFERENCES suppliers(id) ON DELETE RESTRICT,
        supplier_name_snapshot TEXT CHECK (supplier_name_snapshot IS NULL OR length(supplier_name_snapshot) > 0),
        created_by_store_member_id TEXT NOT NULL REFERENCES store_members(id) ON DELETE RESTRICT,
        created_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE RESTRICT,
        occurred_at TEXT NOT NULL,
        currency_code TEXT NOT NULL CHECK (length(currency_code) = 3),
        total_amount_minor INTEGER NOT NULL CHECK (total_amount_minor >= 0),
        status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'VOIDED')),
        created_at TEXT NOT NULL,
        completed_at TEXT NOT NULL
      );`,
      'CREATE INDEX idx_purchases_store_occurred ON purchases(store_id, occurred_at DESC);',
      'CREATE INDEX idx_purchases_supplier ON purchases(supplier_id, occurred_at DESC);',
      `CREATE TRIGGER trg_purchases_device_store_insert
        BEFORE INSERT ON purchases
        WHEN NOT EXISTS (
          SELECT 1 FROM devices d
          WHERE d.id = NEW.device_id AND d.store_id = NEW.store_id AND d.status = 'ACTIVE'
        )
        BEGIN SELECT RAISE(ABORT, 'purchase device does not belong to store'); END;`,
      `CREATE TRIGGER trg_purchases_member_store_insert
        BEFORE INSERT ON purchases
        WHEN NOT EXISTS (
          SELECT 1 FROM store_members sm
          WHERE sm.id = NEW.created_by_store_member_id
            AND sm.store_id = NEW.store_id
            AND sm.user_id = NEW.created_by_user_id
            AND sm.status = 'ACTIVE'
        )
        BEGIN SELECT RAISE(ABORT, 'purchase creator is not an active store member'); END;`,
      `CREATE TRIGGER trg_purchases_currency_store_insert
        BEFORE INSERT ON purchases
        WHEN NOT EXISTS (
          SELECT 1 FROM stores s
          WHERE s.id = NEW.store_id AND s.currency_code = NEW.currency_code
        )
        BEGIN SELECT RAISE(ABORT, 'purchase currency mismatch with store'); END;`,
      `CREATE TRIGGER trg_purchases_supplier_store_insert
        BEFORE INSERT ON purchases
        WHEN NEW.supplier_id IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM suppliers su
          WHERE su.id = NEW.supplier_id AND su.store_id = NEW.store_id
        )
        BEGIN SELECT RAISE(ABORT, 'purchase supplier does not belong to store'); END;`,
      `CREATE TABLE purchase_items (
        id TEXT PRIMARY KEY,
        purchase_id TEXT NOT NULL REFERENCES purchases(id) ON DELETE RESTRICT,
        store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
        store_product_id TEXT NOT NULL REFERENCES store_products(id) ON DELETE RESTRICT,
        product_variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
        package_unit_id TEXT NOT NULL REFERENCES package_units(id) ON DELETE RESTRICT,
        quantity_packages_micros INTEGER NOT NULL CHECK (quantity_packages_micros > 0),
        conversion_to_base_snapshot_micros INTEGER NOT NULL CHECK (conversion_to_base_snapshot_micros > 0),
        quantity_base_micros INTEGER NOT NULL CHECK (quantity_base_micros > 0),
        cost_basis TEXT NOT NULL CHECK (cost_basis IN ('TOTAL', 'UNIT')),
        entered_cost_minor INTEGER NOT NULL CHECK (entered_cost_minor >= 0),
        total_purchase_cost_minor INTEGER NOT NULL CHECK (total_purchase_cost_minor >= 0),
        package_cost_numerator TEXT NOT NULL,
        package_cost_denominator TEXT NOT NULL CHECK (package_cost_denominator <> '0'),
        base_unit_cost_numerator TEXT NOT NULL,
        base_unit_cost_denominator TEXT NOT NULL CHECK (base_unit_cost_denominator <> '0'),
        currency_code TEXT NOT NULL CHECK (length(currency_code) = 3),
        product_name_snapshot TEXT NOT NULL CHECK (length(product_name_snapshot) > 0),
        package_name_snapshot TEXT NOT NULL CHECK (length(package_name_snapshot) > 0),
        created_at TEXT NOT NULL
      );`,
      'CREATE INDEX idx_purchase_items_purchase ON purchase_items(purchase_id);',
      'CREATE INDEX idx_purchase_items_product ON purchase_items(store_product_id, created_at DESC);',
      `CREATE TRIGGER trg_purchase_items_purchase_store_insert
        BEFORE INSERT ON purchase_items
        WHEN NOT EXISTS (
          SELECT 1 FROM purchases p
          WHERE p.id = NEW.purchase_id AND p.store_id = NEW.store_id AND p.currency_code = NEW.currency_code
        )
        BEGIN SELECT RAISE(ABORT, 'purchase item does not match purchase store or currency'); END;`,
      `CREATE TRIGGER trg_purchase_items_product_store_insert
        BEFORE INSERT ON purchase_items
        WHEN NOT EXISTS (
          SELECT 1 FROM store_products sp
          WHERE sp.id = NEW.store_product_id AND sp.store_id = NEW.store_id AND sp.product_variant_id = NEW.product_variant_id
        )
        BEGIN SELECT RAISE(ABORT, 'purchase item product does not belong to store'); END;`,
      `CREATE TRIGGER trg_purchase_items_package_insert
        BEFORE INSERT ON purchase_items
        WHEN NOT EXISTS (
          SELECT 1 FROM package_units pu
          WHERE pu.id = NEW.package_unit_id
            AND pu.product_variant_id = NEW.product_variant_id
            AND pu.status = 'ACTIVE'
            AND pu.is_purchasable = 1
        )
        BEGIN SELECT RAISE(ABORT, 'purchase item package is not active or purchasable'); END;`,
      `CREATE TRIGGER trg_purchase_items_conversion_insert
        BEFORE INSERT ON purchase_items
        WHEN NOT EXISTS (
          SELECT 1 FROM package_units pu
          WHERE pu.id = NEW.package_unit_id AND pu.conversion_to_base_micros = NEW.conversion_to_base_snapshot_micros
        )
        BEGIN SELECT RAISE(ABORT, 'purchase item conversion snapshot does not match package'); END;`,
      `CREATE TABLE price_observations (
        id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
        purchase_item_id TEXT NOT NULL REFERENCES purchase_items(id) ON DELETE RESTRICT,
        product_variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
        package_unit_id TEXT NOT NULL REFERENCES package_units(id) ON DELETE RESTRICT,
        supplier_id TEXT REFERENCES suppliers(id) ON DELETE RESTRICT,
        cost_basis TEXT NOT NULL CHECK (cost_basis IN ('TOTAL', 'UNIT')),
        entered_cost_minor INTEGER NOT NULL CHECK (entered_cost_minor >= 0),
        observed_price_minor INTEGER NOT NULL CHECK (observed_price_minor >= 0),
        total_purchase_cost_minor INTEGER NOT NULL CHECK (total_purchase_cost_minor >= 0),
        quantity_packages_micros INTEGER NOT NULL CHECK (quantity_packages_micros > 0),
        conversion_to_base_snapshot_micros INTEGER NOT NULL CHECK (conversion_to_base_snapshot_micros > 0),
        quantity_base_micros INTEGER NOT NULL CHECK (quantity_base_micros > 0),
        package_cost_numerator TEXT NOT NULL,
        package_cost_denominator TEXT NOT NULL CHECK (package_cost_denominator <> '0'),
        base_unit_cost_numerator TEXT NOT NULL,
        base_unit_cost_denominator TEXT NOT NULL CHECK (base_unit_cost_denominator <> '0'),
        currency_code TEXT NOT NULL CHECK (length(currency_code) = 3),
        source_type TEXT NOT NULL DEFAULT 'RETAILER_PURCHASE' CHECK (source_type = 'RETAILER_PURCHASE'),
        source_id TEXT NOT NULL,
        validation_status TEXT NOT NULL DEFAULT 'VALID' CHECK (validation_status IN ('VALID', 'ESTIMATED', 'UNAVAILABLE')),
        contribution_consent INTEGER NOT NULL DEFAULT 0 CHECK (contribution_consent = 0),
        observed_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );`,
      'CREATE INDEX idx_price_observations_store_product ON price_observations(store_id, product_variant_id, observed_at DESC);',
      `CREATE TRIGGER trg_price_observations_item_store_insert
        BEFORE INSERT ON price_observations
        WHEN NOT EXISTS (
          SELECT 1 FROM purchase_items pi
          JOIN purchases p ON p.id = pi.purchase_id
          WHERE pi.id = NEW.purchase_item_id
            AND pi.store_id = NEW.store_id
            AND pi.product_variant_id = NEW.product_variant_id
            AND pi.package_unit_id = NEW.package_unit_id
            AND p.currency_code = NEW.currency_code
        )
        BEGIN SELECT RAISE(ABORT, 'price observation does not match purchase item'); END;`,
      `CREATE TRIGGER trg_price_observations_supplier_store_insert
        BEFORE INSERT ON price_observations
        WHEN NEW.supplier_id IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM suppliers su WHERE su.id = NEW.supplier_id AND su.store_id = NEW.store_id
        )
        BEGIN SELECT RAISE(ABORT, 'price observation supplier does not belong to store'); END;`,
      `CREATE TABLE store_product_cost_states (
        store_product_id TEXT PRIMARY KEY REFERENCES store_products(id) ON DELETE RESTRICT,
        store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
        method TEXT NOT NULL DEFAULT 'MOVING_WEIGHTED_AVERAGE' CHECK (method = 'MOVING_WEIGHTED_AVERAGE'),
        method_version TEXT NOT NULL DEFAULT 'M4-MWA-1',
        coverage_status TEXT NOT NULL CHECK (coverage_status IN ('KNOWN', 'UNKNOWN')),
        quantity_costed_base_micros INTEGER NOT NULL CHECK (quantity_costed_base_micros >= 0),
        average_unit_cost_numerator TEXT,
        average_unit_cost_denominator TEXT,
        remaining_value_numerator TEXT NOT NULL DEFAULT '0',
        remaining_value_denominator TEXT NOT NULL DEFAULT '1' CHECK (remaining_value_denominator <> '0'),
        updated_at TEXT NOT NULL,
        last_movement_id TEXT
      );`,
      'CREATE INDEX idx_cost_states_store ON store_product_cost_states(store_id);',
      `CREATE TRIGGER trg_cost_states_product_store_insert
        BEFORE INSERT ON store_product_cost_states
        WHEN NOT EXISTS (
          SELECT 1 FROM store_products sp
          WHERE sp.id = NEW.store_product_id AND sp.store_id = NEW.store_id
        )
        BEGIN SELECT RAISE(ABORT, 'cost state product does not belong to store'); END;`,
      `CREATE TRIGGER trg_cost_states_product_store_update
        BEFORE UPDATE OF store_product_id, store_id ON store_product_cost_states
        WHEN NOT EXISTS (
          SELECT 1 FROM store_products sp
          WHERE sp.id = NEW.store_product_id AND sp.store_id = NEW.store_id
        )
        BEGIN SELECT RAISE(ABORT, 'cost state product does not belong to store'); END;`,
      `CREATE TABLE cost_movements (
        id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
        store_product_id TEXT NOT NULL REFERENCES store_products(id) ON DELETE RESTRICT,
        movement_type TEXT NOT NULL CHECK (movement_type IN ('PURCHASE', 'SALE')),
        source_id TEXT NOT NULL,
        source_line_id TEXT NOT NULL,
        application_order INTEGER NOT NULL CHECK (application_order > 0),
        quantity_base_delta_micros INTEGER NOT NULL,
        costed_quantity_delta_micros INTEGER NOT NULL,
        value_numerator TEXT NOT NULL,
        value_denominator TEXT NOT NULL CHECK (value_denominator <> '0'),
        coverage_status TEXT NOT NULL CHECK (coverage_status IN ('KNOWN', 'UNKNOWN', 'UNAVAILABLE')),
        unit_cost_numerator TEXT,
        unit_cost_denominator TEXT,
        method TEXT NOT NULL DEFAULT 'MOVING_WEIGHTED_AVERAGE',
        method_version TEXT NOT NULL DEFAULT 'M4-MWA-1',
        created_at TEXT NOT NULL,
        UNIQUE (store_product_id, application_order),
        UNIQUE (movement_type, source_line_id)
      );`,
      'CREATE INDEX idx_cost_movements_store_product_order ON cost_movements(store_product_id, application_order);',
      'CREATE INDEX idx_cost_movements_source ON cost_movements(movement_type, source_id);',
      `CREATE TRIGGER trg_cost_movements_product_store_insert
        BEFORE INSERT ON cost_movements
        WHEN NOT EXISTS (
          SELECT 1 FROM store_products sp
          WHERE sp.id = NEW.store_product_id AND sp.store_id = NEW.store_id
        )
        BEGIN SELECT RAISE(ABORT, 'cost movement product does not belong to store'); END;`,
      `CREATE TRIGGER trg_cost_movements_source_insert
        BEFORE INSERT ON cost_movements
        WHEN (NEW.movement_type = 'PURCHASE' AND NOT EXISTS (
          SELECT 1 FROM purchase_items pi
          JOIN purchases p ON p.id = pi.purchase_id
          WHERE pi.id = NEW.source_line_id AND p.id = NEW.source_id AND pi.store_id = NEW.store_id AND pi.store_product_id = NEW.store_product_id
        ))
        OR (NEW.movement_type = 'SALE' AND NOT EXISTS (
          SELECT 1 FROM sale_items si
          JOIN sales s ON s.id = si.sale_id
          WHERE si.id = NEW.source_line_id AND s.id = NEW.source_id AND si.store_product_id = NEW.store_product_id AND s.store_id = NEW.store_id
        ))
        BEGIN SELECT RAISE(ABORT, 'cost movement source does not match product and store'); END;`,
      `CREATE TABLE sale_item_cost_snapshots (
        sale_item_id TEXT PRIMARY KEY REFERENCES sale_items(id) ON DELETE RESTRICT,
        sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
        store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
        store_product_id TEXT NOT NULL REFERENCES store_products(id) ON DELETE RESTRICT,
        quantity_base_micros INTEGER NOT NULL CHECK (quantity_base_micros > 0),
        costed_quantity_base_micros INTEGER NOT NULL CHECK (costed_quantity_base_micros >= 0),
        coverage_status TEXT NOT NULL CHECK (coverage_status IN ('AVAILABLE', 'UNAVAILABLE')),
        method TEXT NOT NULL DEFAULT 'MOVING_WEIGHTED_AVERAGE',
        method_version TEXT NOT NULL DEFAULT 'M4-MWA-1',
        unit_cost_numerator TEXT,
        unit_cost_denominator TEXT,
        cogs_numerator TEXT,
        cogs_denominator TEXT,
        cogs_amount_minor INTEGER CHECK (cogs_amount_minor IS NULL OR cogs_amount_minor >= 0),
        created_at TEXT NOT NULL
      );`,
      'CREATE INDEX idx_sale_item_cost_snapshots_sale ON sale_item_cost_snapshots(sale_id);',
      `CREATE TRIGGER trg_sale_cost_snapshots_sale_store_insert
        BEFORE INSERT ON sale_item_cost_snapshots
        WHEN NOT EXISTS (
          SELECT 1 FROM sale_items si
          JOIN sales s ON s.id = si.sale_id
          WHERE si.id = NEW.sale_item_id
            AND s.id = NEW.sale_id
            AND s.store_id = NEW.store_id
            AND si.store_product_id = NEW.store_product_id
            AND si.quantity_base_micros = NEW.quantity_base_micros
        )
        BEGIN SELECT RAISE(ABORT, 'sale cost snapshot does not match sale item'); END;`,
      `CREATE TRIGGER trg_sale_cost_snapshots_coverage_insert
        BEFORE INSERT ON sale_item_cost_snapshots
        WHEN (NEW.coverage_status = 'AVAILABLE' AND (
          NEW.cogs_amount_minor IS NULL OR NEW.cogs_numerator IS NULL OR NEW.cogs_denominator IS NULL
        ))
        OR (NEW.coverage_status = 'UNAVAILABLE' AND NEW.cogs_amount_minor IS NOT NULL)
        BEGIN SELECT RAISE(ABORT, 'sale cost snapshot coverage and cogs do not match'); END;`,
      `CREATE UNIQUE INDEX uq_outbox_completed_purchase_entity
        ON outbox_operations(entity_type, entity_id)
        WHERE operation_type = 'COMPLETED_PURCHASE_CREATED';`,
      `CREATE TRIGGER trg_purchases_immutable_update
        BEFORE UPDATE ON purchases
        BEGIN SELECT RAISE(ABORT, 'completed purchases are immutable'); END;`,
      `CREATE TRIGGER trg_purchases_immutable_delete
        BEFORE DELETE ON purchases
        BEGIN SELECT RAISE(ABORT, 'completed purchases are immutable'); END;`,
      `CREATE TRIGGER trg_purchase_items_immutable_update
        BEFORE UPDATE ON purchase_items
        BEGIN SELECT RAISE(ABORT, 'purchase items are immutable'); END;`,
      `CREATE TRIGGER trg_purchase_items_immutable_delete
        BEFORE DELETE ON purchase_items
        BEGIN SELECT RAISE(ABORT, 'purchase items are immutable'); END;`,
      `CREATE TRIGGER trg_price_observations_immutable_update
        BEFORE UPDATE ON price_observations
        BEGIN SELECT RAISE(ABORT, 'price observations are immutable'); END;`,
      `CREATE TRIGGER trg_price_observations_immutable_delete
        BEFORE DELETE ON price_observations
        BEGIN SELECT RAISE(ABORT, 'price observations are immutable'); END;`,
      `CREATE TRIGGER trg_cost_movements_immutable_update
        BEFORE UPDATE ON cost_movements
        BEGIN SELECT RAISE(ABORT, 'cost movements are append-only'); END;`,
      `CREATE TRIGGER trg_cost_movements_immutable_delete
        BEFORE DELETE ON cost_movements
        BEGIN SELECT RAISE(ABORT, 'cost movements are append-only'); END;`,
      `CREATE TRIGGER trg_sale_cost_snapshots_immutable_update
        BEFORE UPDATE ON sale_item_cost_snapshots
        BEGIN SELECT RAISE(ABORT, 'sale cost snapshots are immutable'); END;`,
      `CREATE TRIGGER trg_sale_cost_snapshots_immutable_delete
        BEFORE DELETE ON sale_item_cost_snapshots
        BEGIN SELECT RAISE(ABORT, 'sale cost snapshots are immutable'); END;`,
      `CREATE TRIGGER trg_purchase_inventory_source_insert
        BEFORE INSERT ON inventory_events
        WHEN NEW.event_type = 'PURCHASE' AND (
          NEW.source_type <> 'PURCHASE'
          OR NEW.source_id IS NULL
          OR NEW.quantity_base_delta_micros <= 0
          OR NEW.package_unit_id IS NULL
          OR NEW.quantity_package_snapshot_micros IS NULL
          OR NEW.conversion_to_base_snapshot_micros IS NULL
          OR NOT EXISTS (
            SELECT 1 FROM purchases p
            WHERE p.id = NEW.source_id AND p.store_id = NEW.store_id
          )
        )
        BEGIN SELECT RAISE(ABORT, 'purchase inventory event must be a positive snapshot for its purchase'); END;`,
      `CREATE TRIGGER trg_purchase_inventory_conversion_insert
        BEFORE INSERT ON inventory_events
        WHEN NEW.event_type = 'PURCHASE' AND NOT EXISTS (
          SELECT 1 FROM package_units pu
          WHERE pu.id = NEW.package_unit_id
            AND pu.conversion_to_base_micros = NEW.conversion_to_base_snapshot_micros
        )
        BEGIN SELECT RAISE(ABORT, 'purchase inventory event conversion snapshot does not match package'); END;`,
    ],
  },
  {
    version: 5,
    name: 'sale_cost_snapshot_invariants',
    statements: [
      `CREATE TRIGGER trg_sale_cost_snapshots_quantity_insert
        BEFORE INSERT ON sale_item_cost_snapshots
        WHEN NEW.costed_quantity_base_micros > NEW.quantity_base_micros
          OR (NEW.coverage_status = 'AVAILABLE' AND NEW.costed_quantity_base_micros <> NEW.quantity_base_micros)
        BEGIN SELECT RAISE(ABORT, 'sale cost snapshot quantity coverage is invalid'); END;`,
      `CREATE TRIGGER trg_sale_cost_snapshots_fields_insert
        BEFORE INSERT ON sale_item_cost_snapshots
        WHEN (NEW.coverage_status = 'AVAILABLE' AND (
          NEW.unit_cost_numerator IS NULL OR NEW.unit_cost_denominator IS NULL
          OR NEW.cogs_numerator IS NULL OR NEW.cogs_denominator IS NULL
        ))
        OR (NEW.coverage_status = 'UNAVAILABLE' AND (
          NEW.unit_cost_numerator IS NOT NULL OR NEW.unit_cost_denominator IS NOT NULL
          OR NEW.cogs_numerator IS NOT NULL OR NEW.cogs_denominator IS NOT NULL
          OR NEW.cogs_amount_minor IS NOT NULL
        ))
        BEGIN SELECT RAISE(ABORT, 'sale cost snapshot fields do not match coverage'); END;`,
    ],
  },
  {
    version: 6,
    name: 'sale_cost_snapshot_parent_invariants',
    statements: [
      `CREATE TRIGGER trg_sale_cost_snapshots_parent_insert
        BEFORE INSERT ON sale_item_cost_snapshots
        WHEN (NEW.coverage_status = 'AVAILABLE' AND (
          (SELECT cogs_amount_minor FROM sale_items WHERE id = NEW.sale_item_id) IS NOT NEW.cogs_amount_minor
          OR (
            NEW.unit_cost_denominator = '1'
            AND (
              (
                (
                  length(CAST(NEW.unit_cost_numerator AS TEXT)) < 16
                  OR (
                    length(CAST(NEW.unit_cost_numerator AS TEXT)) = 16
                    AND CAST(NEW.unit_cost_numerator AS TEXT) <= '9007199254740991'
                  )
                )
                AND (SELECT unit_cost_base_snapshot_minor FROM sale_items WHERE id = NEW.sale_item_id) IS NOT CAST(NEW.unit_cost_numerator AS INTEGER)
              )
              OR (
                NOT (
                  length(CAST(NEW.unit_cost_numerator AS TEXT)) < 16
                  OR (
                    length(CAST(NEW.unit_cost_numerator AS TEXT)) = 16
                    AND CAST(NEW.unit_cost_numerator AS TEXT) <= '9007199254740991'
                  )
                )
                AND (SELECT unit_cost_base_snapshot_minor FROM sale_items WHERE id = NEW.sale_item_id) IS NOT NULL
              )
            )
            OR (
              NEW.unit_cost_denominator <> '1'
              AND (SELECT unit_cost_base_snapshot_minor FROM sale_items WHERE id = NEW.sale_item_id) IS NOT NULL
            )
          )
        ))
        OR (NEW.coverage_status = 'UNAVAILABLE' AND
          (SELECT cogs_amount_minor FROM sale_items WHERE id = NEW.sale_item_id) IS NOT NULL
        )
        BEGIN SELECT RAISE(ABORT, 'sale cost snapshot does not match immutable sale item cost parent'); END;`,
    ],
  },
  {
    version: 7,
    name: 'batch_inventory_tracking',
    statements: [
      `CREATE TABLE inventory_batch_groups (
        id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
        store_product_id TEXT NOT NULL REFERENCES store_products(id) ON DELETE RESTRICT,
        origin TEXT NOT NULL CHECK (origin IN ('RECEIPT', 'PHYSICAL_INSPECTION')),
        purchase_item_id TEXT REFERENCES purchase_items(id) ON DELETE RESTRICT,
        quantity_received_base_micros INTEGER,
        printed_batch_number TEXT CHECK (printed_batch_number IS NULL OR length(printed_batch_number) <= 128),
        date_precision TEXT NOT NULL CHECK (date_precision IN ('UNKNOWN', 'MONTH', 'DAY')),
        date_value TEXT,
        date_meaning TEXT NOT NULL CHECK (date_meaning IN ('EXPIRY', 'BEST_BEFORE', 'UNSPECIFIED')),
        evidence_source TEXT NOT NULL CHECK (evidence_source IN ('RECEIPT', 'PHYSICAL_INSPECTION')),
        recorded_by_store_member_id TEXT NOT NULL REFERENCES store_members(id) ON DELETE RESTRICT,
        recorded_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE RESTRICT,
        origin_order INTEGER NOT NULL CHECK (origin_order > 0),
        created_at TEXT NOT NULL,
        CHECK (
          (origin = 'RECEIPT'
            AND purchase_item_id IS NOT NULL
            AND quantity_received_base_micros IS NOT NULL
            AND quantity_received_base_micros > 0
            AND evidence_source = 'RECEIPT')
          OR
          (origin = 'PHYSICAL_INSPECTION'
            AND purchase_item_id IS NULL
            AND quantity_received_base_micros IS NULL
            AND evidence_source = 'PHYSICAL_INSPECTION')
        ),
        CHECK (
          (date_precision = 'UNKNOWN' AND date_value IS NULL)
          OR (date_precision = 'MONTH' AND date_value IS NOT NULL AND length(date_value) = 7 AND date_value LIKE '____-__')
          OR (date_precision = 'DAY' AND date_value IS NOT NULL AND length(date_value) = 10 AND date_value LIKE '____-__-__')
        )
      );`,
      'CREATE UNIQUE INDEX uq_batch_groups_purchase_item ON inventory_batch_groups(purchase_item_id) WHERE purchase_item_id IS NOT NULL;',
      'CREATE INDEX idx_batch_groups_store_product ON inventory_batch_groups(store_id, store_product_id, origin_order);',
      'CREATE INDEX idx_batch_groups_date ON inventory_batch_groups(store_product_id, date_precision, date_value, origin_order);',
      `CREATE TRIGGER trg_batch_groups_store_product_insert
        BEFORE INSERT ON inventory_batch_groups
        WHEN NOT EXISTS (
          SELECT 1 FROM store_products sp
          WHERE sp.id = NEW.store_product_id AND sp.store_id = NEW.store_id
        )
        BEGIN SELECT RAISE(ABORT, 'batch group store product does not belong to store'); END;`,
      `CREATE TRIGGER trg_batch_groups_purchase_item_insert
        BEFORE INSERT ON inventory_batch_groups
        WHEN NEW.purchase_item_id IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM purchase_items pi
          WHERE pi.id = NEW.purchase_item_id
            AND pi.store_id = NEW.store_id
            AND pi.store_product_id = NEW.store_product_id
        )
        BEGIN SELECT RAISE(ABORT, 'batch group purchase item does not match store product'); END;`,
      `CREATE TRIGGER trg_batch_groups_member_store_insert
        BEFORE INSERT ON inventory_batch_groups
        WHEN NOT EXISTS (
          SELECT 1 FROM store_members sm
          WHERE sm.id = NEW.recorded_by_store_member_id
            AND sm.store_id = NEW.store_id
            AND sm.user_id = NEW.recorded_by_user_id
            AND sm.status = 'ACTIVE'
        )
        BEGIN SELECT RAISE(ABORT, 'batch group actor is not an active store member'); END;`,
      `CREATE TRIGGER trg_batch_groups_device_store_insert
        BEFORE INSERT ON inventory_batch_groups
        WHEN NOT EXISTS (
          SELECT 1 FROM devices d
          WHERE d.id = NEW.device_id AND d.store_id = NEW.store_id AND d.status = 'ACTIVE'
        )
        BEGIN SELECT RAISE(ABORT, 'batch group device does not belong to store'); END;`,
      `CREATE TABLE batch_inventory_operations (
        id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
        store_product_id TEXT NOT NULL REFERENCES store_products(id) ON DELETE RESTRICT,
        kind TEXT NOT NULL CHECK (kind IN ('EVENT_ALLOCATION', 'CLASSIFICATION', 'ADJUSTMENT', 'RECONCILIATION')),
        inventory_event_id TEXT REFERENCES inventory_events(id) ON DELETE RESTRICT,
        source_type TEXT NOT NULL CHECK (source_type IN ('SALE', 'PURCHASE', 'MANUAL_ADJUSTMENT', 'RECONCILIATION', 'PHYSICAL_INSPECTION')),
        source_id TEXT,
        policy_version TEXT NOT NULL,
        evidence_version TEXT NOT NULL,
        inventory_watermark TEXT,
        batch_watermark TEXT,
        recorded_by_store_member_id TEXT NOT NULL REFERENCES store_members(id) ON DELETE RESTRICT,
        recorded_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE RESTRICT,
        local_application_order INTEGER NOT NULL CHECK (local_application_order > 0),
        created_at TEXT NOT NULL,
        CHECK ((kind = 'EVENT_ALLOCATION' AND inventory_event_id IS NOT NULL) OR (kind <> 'EVENT_ALLOCATION' AND inventory_event_id IS NULL))
      );`,
      'CREATE UNIQUE INDEX uq_batch_operations_inventory_event ON batch_inventory_operations(inventory_event_id) WHERE inventory_event_id IS NOT NULL;',
      'CREATE UNIQUE INDEX uq_batch_operations_source ON batch_inventory_operations(kind, source_type, source_id) WHERE source_id IS NOT NULL;',
      'CREATE INDEX idx_batch_operations_store_product ON batch_inventory_operations(store_id, store_product_id, local_application_order);',
      `CREATE TRIGGER trg_batch_operations_store_product_insert
        BEFORE INSERT ON batch_inventory_operations
        WHEN NOT EXISTS (
          SELECT 1 FROM store_products sp
          WHERE sp.id = NEW.store_product_id AND sp.store_id = NEW.store_id
        )
        BEGIN SELECT RAISE(ABORT, 'batch operation store product does not belong to store'); END;`,
      `CREATE TRIGGER trg_batch_operations_event_insert
        BEFORE INSERT ON batch_inventory_operations
        WHEN NEW.inventory_event_id IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM inventory_events ie
          WHERE ie.id = NEW.inventory_event_id
            AND ie.store_id = NEW.store_id
            AND ie.store_product_id = NEW.store_product_id
        )
        BEGIN SELECT RAISE(ABORT, 'batch operation inventory event does not match store product'); END;`,
      `CREATE TRIGGER trg_batch_operations_member_store_insert
        BEFORE INSERT ON batch_inventory_operations
        WHEN NOT EXISTS (
          SELECT 1 FROM store_members sm
          WHERE sm.id = NEW.recorded_by_store_member_id
            AND sm.store_id = NEW.store_id
            AND sm.user_id = NEW.recorded_by_user_id
            AND sm.status = 'ACTIVE'
        )
        BEGIN SELECT RAISE(ABORT, 'batch operation actor is not an active store member'); END;`,
      `CREATE TRIGGER trg_batch_operations_device_store_insert
        BEFORE INSERT ON batch_inventory_operations
        WHEN NOT EXISTS (
          SELECT 1 FROM devices d
          WHERE d.id = NEW.device_id AND d.store_id = NEW.store_id AND d.status = 'ACTIVE'
        )
        BEGIN SELECT RAISE(ABORT, 'batch operation device does not belong to store'); END;`,
      `CREATE TABLE batch_inventory_entries (
        id TEXT PRIMARY KEY,
        operation_id TEXT NOT NULL REFERENCES batch_inventory_operations(id) ON DELETE RESTRICT,
        store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
        store_product_id TEXT NOT NULL REFERENCES store_products(id) ON DELETE RESTRICT,
        group_id TEXT REFERENCES inventory_batch_groups(id) ON DELETE RESTRICT,
        entry_type TEXT NOT NULL CHECK (entry_type IN ('RECEIPT', 'DEFICIT_OFFSET', 'ASSUMED_FEFO', 'UNKNOWN_RESIDUAL', 'CLASSIFICATION', 'ADJUSTMENT')),
        delta_base_micros INTEGER NOT NULL CHECK (delta_base_micros <> 0),
        entry_order INTEGER NOT NULL CHECK (entry_order > 0),
        created_at TEXT NOT NULL,
        UNIQUE (operation_id, entry_order)
      );`,
      'CREATE INDEX idx_batch_entries_operation ON batch_inventory_entries(operation_id, entry_order);',
      'CREATE INDEX idx_batch_entries_group ON batch_inventory_entries(group_id, created_at);',
      `CREATE TRIGGER trg_batch_entries_operation_insert
        BEFORE INSERT ON batch_inventory_entries
        WHEN NOT EXISTS (
          SELECT 1 FROM batch_inventory_operations bo
          WHERE bo.id = NEW.operation_id
            AND bo.store_id = NEW.store_id
            AND bo.store_product_id = NEW.store_product_id
        )
        BEGIN SELECT RAISE(ABORT, 'batch entry operation does not match store product'); END;`,
      `CREATE TRIGGER trg_batch_entries_group_insert
        BEFORE INSERT ON batch_inventory_entries
        WHEN NEW.group_id IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM inventory_batch_groups bg
          WHERE bg.id = NEW.group_id
            AND bg.store_id = NEW.store_id
            AND bg.store_product_id = NEW.store_product_id
        )
        BEGIN SELECT RAISE(ABORT, 'batch entry group does not match store product'); END;`,
      `CREATE TRIGGER trg_batch_groups_immutable_update
        BEFORE UPDATE ON inventory_batch_groups
        BEGIN SELECT RAISE(ABORT, 'inventory batch groups are immutable'); END;`,
      `CREATE TRIGGER trg_batch_groups_immutable_delete
        BEFORE DELETE ON inventory_batch_groups
        BEGIN SELECT RAISE(ABORT, 'inventory batch groups are immutable'); END;`,
      `CREATE TRIGGER trg_batch_operations_immutable_update
        BEFORE UPDATE ON batch_inventory_operations
        BEGIN SELECT RAISE(ABORT, 'batch inventory operations are immutable'); END;`,
      `CREATE TRIGGER trg_batch_operations_immutable_delete
        BEFORE DELETE ON batch_inventory_operations
        BEGIN SELECT RAISE(ABORT, 'batch inventory operations are immutable'); END;`,
      `CREATE TRIGGER trg_batch_entries_immutable_update
        BEFORE UPDATE ON batch_inventory_entries
        BEGIN SELECT RAISE(ABORT, 'batch inventory entries are immutable'); END;`,
      `CREATE TRIGGER trg_batch_entries_immutable_delete
        BEFORE DELETE ON batch_inventory_entries
        BEGIN SELECT RAISE(ABORT, 'batch inventory entries are immutable'); END;`,
    ],
  },
  {
    version: 8,
    name: 'inventory_adjustments_and_cost_extension',
    statements: [
      `CREATE TABLE inventory_adjustments (
        id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
        operation_id TEXT NOT NULL UNIQUE,
        reason_code TEXT NOT NULL CHECK (length(reason_code) > 0 AND length(reason_code) <= 64),
        note TEXT CHECK (note IS NULL OR length(note) <= 500),
        occurred_at TEXT NOT NULL,
        created_by_store_member_id TEXT NOT NULL REFERENCES store_members(id) ON DELETE RESTRICT,
        created_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE RESTRICT,
        created_at TEXT NOT NULL
      );`,
      'CREATE INDEX idx_inventory_adjustments_store ON inventory_adjustments(store_id, occurred_at DESC);',
      `CREATE TABLE inventory_adjustment_lines (
        id TEXT PRIMARY KEY,
        adjustment_id TEXT NOT NULL REFERENCES inventory_adjustments(id) ON DELETE RESTRICT,
        store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
        store_product_id TEXT NOT NULL REFERENCES store_products(id) ON DELETE RESTRICT,
        group_id TEXT REFERENCES inventory_batch_groups(id) ON DELETE RESTRICT,
        inventory_event_id TEXT NOT NULL UNIQUE REFERENCES inventory_events(id) ON DELETE RESTRICT,
        package_unit_id TEXT REFERENCES package_units(id) ON DELETE RESTRICT,
        quantity_package_snapshot_micros INTEGER,
        conversion_to_base_snapshot_micros INTEGER,
        quantity_base_delta_micros INTEGER NOT NULL CHECK (quantity_base_delta_micros <> 0),
        line_order INTEGER NOT NULL CHECK (line_order > 0),
        created_at TEXT NOT NULL,
        UNIQUE (adjustment_id, line_order),
        CHECK (
          (package_unit_id IS NULL
            AND quantity_package_snapshot_micros IS NULL
            AND conversion_to_base_snapshot_micros IS NULL)
          OR
          (package_unit_id IS NOT NULL
            AND quantity_package_snapshot_micros IS NOT NULL
            AND quantity_package_snapshot_micros > 0
            AND conversion_to_base_snapshot_micros IS NOT NULL
            AND conversion_to_base_snapshot_micros > 0)
        )
      );`,
      'CREATE INDEX idx_inventory_adjustment_lines_store_product ON inventory_adjustment_lines(store_product_id, created_at DESC);',
      'CREATE INDEX idx_inventory_adjustment_lines_group ON inventory_adjustment_lines(group_id, created_at DESC);',
      `CREATE TRIGGER trg_inventory_adjustments_member_store_insert
        BEFORE INSERT ON inventory_adjustments
        WHEN NOT EXISTS (
          SELECT 1 FROM store_members sm
          WHERE sm.id = NEW.created_by_store_member_id
            AND sm.store_id = NEW.store_id
            AND sm.user_id = NEW.created_by_user_id
            AND sm.status = 'ACTIVE'
        )
        BEGIN SELECT RAISE(ABORT, 'inventory adjustment actor is not an active store member'); END;`,
      `CREATE TRIGGER trg_inventory_adjustments_device_store_insert
        BEFORE INSERT ON inventory_adjustments
        WHEN NOT EXISTS (
          SELECT 1 FROM devices d
          WHERE d.id = NEW.device_id AND d.store_id = NEW.store_id AND d.status = 'ACTIVE'
        )
        BEGIN SELECT RAISE(ABORT, 'inventory adjustment device does not belong to store'); END;`,
      `CREATE TRIGGER trg_inventory_adjustment_lines_parent_insert
        BEFORE INSERT ON inventory_adjustment_lines
        WHEN NOT EXISTS (
          SELECT 1 FROM inventory_adjustments ia
          WHERE ia.id = NEW.adjustment_id AND ia.store_id = NEW.store_id
        )
        BEGIN SELECT RAISE(ABORT, 'inventory adjustment line parent does not match store'); END;`,
      `CREATE TRIGGER trg_inventory_adjustment_lines_product_insert
        BEFORE INSERT ON inventory_adjustment_lines
        WHEN NOT EXISTS (
          SELECT 1 FROM store_products sp
          WHERE sp.id = NEW.store_product_id AND sp.store_id = NEW.store_id
        )
        BEGIN SELECT RAISE(ABORT, 'inventory adjustment line product does not belong to store'); END;`,
      `CREATE TRIGGER trg_inventory_adjustment_lines_event_insert
        BEFORE INSERT ON inventory_adjustment_lines
        WHEN NOT EXISTS (
          SELECT 1 FROM inventory_events ie
          WHERE ie.id = NEW.inventory_event_id
            AND ie.store_id = NEW.store_id
            AND ie.store_product_id = NEW.store_product_id
            AND ie.source_type = 'MANUAL_ADJUSTMENT'
            AND ie.source_id = NEW.adjustment_id
        )
        BEGIN SELECT RAISE(ABORT, 'inventory adjustment line event does not match adjustment'); END;`,
      `CREATE TRIGGER trg_inventory_adjustment_lines_package_insert
        BEFORE INSERT ON inventory_adjustment_lines
        WHEN NEW.package_unit_id IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM package_units pu
          JOIN store_products sp ON sp.id = NEW.store_product_id
          WHERE pu.id = NEW.package_unit_id
            AND pu.product_variant_id = sp.product_variant_id
            AND pu.conversion_to_base_micros = NEW.conversion_to_base_snapshot_micros
        )
        BEGIN SELECT RAISE(ABORT, 'inventory adjustment package snapshot does not match product'); END;`,
      `CREATE TRIGGER trg_inventory_adjustment_lines_group_insert
        BEFORE INSERT ON inventory_adjustment_lines
        WHEN NEW.group_id IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM inventory_batch_groups bg
          WHERE bg.id = NEW.group_id
            AND bg.store_id = NEW.store_id
            AND bg.store_product_id = NEW.store_product_id
        )
        BEGIN SELECT RAISE(ABORT, 'inventory adjustment line group does not match product'); END;`,
      `CREATE TRIGGER trg_inventory_adjustments_immutable_update
        BEFORE UPDATE ON inventory_adjustments
        BEGIN SELECT RAISE(ABORT, 'inventory adjustments are immutable'); END;`,
      `CREATE TRIGGER trg_inventory_adjustments_immutable_delete
        BEFORE DELETE ON inventory_adjustments
        BEGIN SELECT RAISE(ABORT, 'inventory adjustments are immutable'); END;`,
      `CREATE TRIGGER trg_inventory_adjustment_lines_immutable_update
        BEFORE UPDATE ON inventory_adjustment_lines
        BEGIN SELECT RAISE(ABORT, 'inventory adjustment lines are immutable'); END;`,
      `CREATE TRIGGER trg_inventory_adjustment_lines_immutable_delete
        BEFORE DELETE ON inventory_adjustment_lines
        BEGIN SELECT RAISE(ABORT, 'inventory adjustment lines are immutable'); END;`,
      'DROP TRIGGER trg_cost_movements_product_store_insert;',
      'DROP TRIGGER trg_cost_movements_source_insert;',
      'DROP TRIGGER trg_cost_movements_immutable_update;',
      'DROP TRIGGER trg_cost_movements_immutable_delete;',
      'DROP INDEX idx_cost_movements_store_product_order;',
      'DROP INDEX idx_cost_movements_source;',
      'ALTER TABLE cost_movements RENAME TO cost_movements_m4;',
      `CREATE TABLE cost_movements (
        id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
        store_product_id TEXT NOT NULL REFERENCES store_products(id) ON DELETE RESTRICT,
        movement_type TEXT NOT NULL CHECK (movement_type IN ('PURCHASE', 'SALE', 'ADJUSTMENT')),
        source_id TEXT NOT NULL,
        source_line_id TEXT NOT NULL,
        application_order INTEGER NOT NULL CHECK (application_order > 0),
        quantity_base_delta_micros INTEGER NOT NULL,
        costed_quantity_delta_micros INTEGER NOT NULL,
        value_numerator TEXT NOT NULL,
        value_denominator TEXT NOT NULL CHECK (value_denominator <> '0'),
        coverage_status TEXT NOT NULL CHECK (coverage_status IN ('KNOWN', 'UNKNOWN', 'UNAVAILABLE')),
        unit_cost_numerator TEXT,
        unit_cost_denominator TEXT,
        method TEXT NOT NULL DEFAULT 'MOVING_WEIGHTED_AVERAGE',
        method_version TEXT NOT NULL DEFAULT 'M4-MWA-1',
        created_at TEXT NOT NULL,
        UNIQUE (store_product_id, application_order),
        UNIQUE (movement_type, source_line_id)
      );`,
      `INSERT INTO cost_movements
        (id, store_id, store_product_id, movement_type, source_id, source_line_id,
         application_order, quantity_base_delta_micros, costed_quantity_delta_micros,
         value_numerator, value_denominator, coverage_status, unit_cost_numerator,
         unit_cost_denominator, method, method_version, created_at)
       SELECT id, store_id, store_product_id, movement_type, source_id, source_line_id,
              application_order, quantity_base_delta_micros, costed_quantity_delta_micros,
              value_numerator, value_denominator, coverage_status, unit_cost_numerator,
              unit_cost_denominator, method, method_version, created_at
       FROM cost_movements_m4;`,
      'DROP TABLE cost_movements_m4;',
      'CREATE INDEX idx_cost_movements_store_product_order ON cost_movements(store_product_id, application_order);',
      'CREATE INDEX idx_cost_movements_source ON cost_movements(movement_type, source_id);',
      `CREATE TRIGGER trg_cost_movements_product_store_insert
        BEFORE INSERT ON cost_movements
        WHEN NOT EXISTS (
          SELECT 1 FROM store_products sp
          WHERE sp.id = NEW.store_product_id AND sp.store_id = NEW.store_id
        )
        BEGIN SELECT RAISE(ABORT, 'cost movement product does not belong to store'); END;`,
      `CREATE TRIGGER trg_cost_movements_source_insert
        BEFORE INSERT ON cost_movements
        WHEN (NEW.movement_type = 'PURCHASE' AND NOT EXISTS (
          SELECT 1 FROM purchase_items pi
          JOIN purchases p ON p.id = pi.purchase_id
          WHERE pi.id = NEW.source_line_id AND p.id = NEW.source_id
            AND pi.store_id = NEW.store_id AND pi.store_product_id = NEW.store_product_id
        ))
        OR (NEW.movement_type = 'SALE' AND NOT EXISTS (
          SELECT 1 FROM sale_items si
          JOIN sales s ON s.id = si.sale_id
          WHERE si.id = NEW.source_line_id AND s.id = NEW.source_id
            AND si.store_product_id = NEW.store_product_id AND s.store_id = NEW.store_id
        ))
        OR (NEW.movement_type = 'ADJUSTMENT' AND NOT EXISTS (
          SELECT 1 FROM inventory_adjustment_lines ial
          JOIN inventory_adjustments ia ON ia.id = ial.adjustment_id
          WHERE ial.id = NEW.source_line_id AND ia.id = NEW.source_id
            AND ial.store_id = NEW.store_id AND ial.store_product_id = NEW.store_product_id
        ))
        BEGIN SELECT RAISE(ABORT, 'cost movement source does not match product and store'); END;`,
      `CREATE TRIGGER trg_cost_movements_immutable_update
        BEFORE UPDATE ON cost_movements
        BEGIN SELECT RAISE(ABORT, 'cost movements are append-only'); END;`,
      `CREATE TRIGGER trg_cost_movements_immutable_delete
        BEFORE DELETE ON cost_movements
        BEGIN SELECT RAISE(ABORT, 'cost movements are append-only'); END;`,
    ],
  },
  {
    version: 9,
    name: 'inventory_reconciliation_checks',
    statements: [
      `CREATE TABLE inventory_reconciliations (
        id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
        status TEXT NOT NULL CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
        created_by_store_member_id TEXT NOT NULL REFERENCES store_members(id) ON DELETE RESTRICT,
        created_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE RESTRICT,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        finalization_operation_id TEXT UNIQUE,
        created_at TEXT NOT NULL
      );`,
      'CREATE INDEX idx_inventory_reconciliations_store_status ON inventory_reconciliations(store_id, status, started_at DESC);',
      `CREATE TABLE inventory_reconciliation_lines (
        id TEXT PRIMARY KEY,
        reconciliation_id TEXT NOT NULL REFERENCES inventory_reconciliations(id) ON DELETE RESTRICT,
        store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
        store_product_id TEXT NOT NULL REFERENCES store_products(id) ON DELETE RESTRICT,
        recorded_base_units_snapshot TEXT NOT NULL,
        initial_inventory_watermark TEXT NOT NULL,
        initial_batch_watermark TEXT NOT NULL,
        physical_base_units TEXT,
        difference_base_units TEXT,
        reason_code TEXT,
        note TEXT,
        adjustment_id TEXT REFERENCES inventory_adjustments(id) ON DELETE RESTRICT,
        adjustment_inventory_event_id TEXT REFERENCES inventory_events(id) ON DELETE RESTRICT,
        created_at TEXT NOT NULL,
        UNIQUE (reconciliation_id, store_product_id)
      );`,
      'CREATE INDEX idx_inventory_reconciliation_lines_store_product ON inventory_reconciliation_lines(store_product_id, created_at DESC);',
      `CREATE TABLE inventory_reconciliation_submissions (
        id TEXT PRIMARY KEY,
        reconciliation_line_id TEXT NOT NULL REFERENCES inventory_reconciliation_lines(id) ON DELETE RESTRICT,
        store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
        store_product_id TEXT NOT NULL REFERENCES store_products(id) ON DELETE RESTRICT,
        submission_type TEXT NOT NULL CHECK (submission_type IN ('FIRST', 'RECOUNT')),
        recorded_base_units_snapshot TEXT NOT NULL,
        physical_base_units TEXT NOT NULL,
        difference_base_units TEXT NOT NULL,
        inventory_watermark TEXT NOT NULL,
        batch_watermark TEXT NOT NULL,
        complete_group_count INTEGER NOT NULL DEFAULT 0 CHECK (complete_group_count IN (0, 1)),
        reason_code TEXT,
        note TEXT,
        created_by_store_member_id TEXT NOT NULL REFERENCES store_members(id) ON DELETE RESTRICT,
        created_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE RESTRICT,
        created_at TEXT NOT NULL
      );`,
      'CREATE INDEX idx_inventory_reconciliation_submissions_line ON inventory_reconciliation_submissions(reconciliation_line_id, created_at ASC, id ASC);',
      `CREATE TABLE inventory_reconciliation_group_counts (
        id TEXT PRIMARY KEY,
        submission_id TEXT NOT NULL REFERENCES inventory_reconciliation_submissions(id) ON DELETE RESTRICT,
        store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
        store_product_id TEXT NOT NULL REFERENCES store_products(id) ON DELETE RESTRICT,
        group_id TEXT REFERENCES inventory_batch_groups(id) ON DELETE RESTRICT,
        physical_base_units TEXT NOT NULL,
        line_order INTEGER NOT NULL CHECK (line_order > 0),
        created_at TEXT NOT NULL,
        UNIQUE (submission_id, line_order)
      );`,
      'CREATE INDEX idx_inventory_reconciliation_group_counts_submission ON inventory_reconciliation_group_counts(submission_id, line_order ASC);',
      'CREATE INDEX idx_inventory_reconciliation_group_counts_group ON inventory_reconciliation_group_counts(group_id, created_at DESC);',
      'ALTER TABLE inventory_adjustments ADD COLUMN reconciliation_id TEXT REFERENCES inventory_reconciliations(id) ON DELETE RESTRICT;',
      'CREATE UNIQUE INDEX uq_inventory_adjustments_reconciliation ON inventory_adjustments(reconciliation_id) WHERE reconciliation_id IS NOT NULL;',
      'DROP TRIGGER trg_inventory_adjustment_lines_event_insert;',
      `CREATE TRIGGER trg_inventory_adjustment_lines_event_insert
        BEFORE INSERT ON inventory_adjustment_lines
        WHEN NOT EXISTS (
          SELECT 1 FROM inventory_events ie
          WHERE ie.id = NEW.inventory_event_id
            AND ie.store_id = NEW.store_id
            AND ie.store_product_id = NEW.store_product_id
            AND ie.source_type IN ('MANUAL_ADJUSTMENT', 'RECONCILIATION')
            AND ie.source_id = NEW.adjustment_id
        )
        BEGIN SELECT RAISE(ABORT, 'inventory adjustment line event does not match adjustment'); END;`,
      `CREATE TRIGGER trg_inventory_reconciliations_member_store_insert
        BEFORE INSERT ON inventory_reconciliations
        WHEN NOT EXISTS (
          SELECT 1 FROM store_members sm
          WHERE sm.id = NEW.created_by_store_member_id
            AND sm.store_id = NEW.store_id
            AND sm.user_id = NEW.created_by_user_id
            AND sm.status = 'ACTIVE'
        )
        BEGIN SELECT RAISE(ABORT, 'reconciliation actor is not an active store member'); END;`,
      `CREATE TRIGGER trg_inventory_reconciliations_device_store_insert
        BEFORE INSERT ON inventory_reconciliations
        WHEN NOT EXISTS (
          SELECT 1 FROM devices d
          WHERE d.id = NEW.device_id AND d.store_id = NEW.store_id AND d.status = 'ACTIVE'
        )
        BEGIN SELECT RAISE(ABORT, 'reconciliation device does not belong to store'); END;`,
      `CREATE TRIGGER trg_inventory_reconciliation_lines_parent_insert
        BEFORE INSERT ON inventory_reconciliation_lines
        WHEN NOT EXISTS (
          SELECT 1 FROM inventory_reconciliations r
          WHERE r.id = NEW.reconciliation_id AND r.store_id = NEW.store_id
        )
        BEGIN SELECT RAISE(ABORT, 'reconciliation line parent does not match store'); END;`,
      `CREATE TRIGGER trg_inventory_reconciliation_lines_product_insert
        BEFORE INSERT ON inventory_reconciliation_lines
        WHEN NOT EXISTS (
          SELECT 1 FROM store_products sp
          WHERE sp.id = NEW.store_product_id AND sp.store_id = NEW.store_id
        )
        BEGIN SELECT RAISE(ABORT, 'reconciliation line product does not belong to store'); END;`,
      `CREATE TRIGGER trg_inventory_reconciliation_lines_final_refs_insert
        BEFORE INSERT ON inventory_reconciliation_lines
        WHEN (NEW.adjustment_id IS NOT NULL OR NEW.adjustment_inventory_event_id IS NOT NULL)
          AND NOT EXISTS (
            SELECT 1
            FROM inventory_adjustment_lines ial
            JOIN inventory_adjustments ia ON ia.id = ial.adjustment_id
            WHERE ia.id = NEW.adjustment_id
              AND ial.inventory_event_id = NEW.adjustment_inventory_event_id
              AND ial.store_id = NEW.store_id
              AND ial.store_product_id = NEW.store_product_id
          )
        BEGIN SELECT RAISE(ABORT, 'reconciliation final adjustment references do not match'); END;`,
      `CREATE TRIGGER trg_inventory_adjustments_reconciliation_insert
        BEFORE INSERT ON inventory_adjustments
        WHEN NEW.reconciliation_id IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM inventory_reconciliations r
          WHERE r.id = NEW.reconciliation_id AND r.store_id = NEW.store_id
        )
        BEGIN SELECT RAISE(ABORT, 'adjustment reconciliation does not match store'); END;`,
      `CREATE TRIGGER trg_batch_reconciliation_source_insert
        BEFORE INSERT ON batch_inventory_operations
        WHEN NEW.kind = 'RECONCILIATION' AND NOT EXISTS (
          SELECT 1 FROM inventory_reconciliation_lines rl
          WHERE rl.id = NEW.source_id
            AND rl.store_id = NEW.store_id
            AND rl.store_product_id = NEW.store_product_id
        )
        BEGIN SELECT RAISE(ABORT, 'reconciliation batch operation source does not match line'); END;`,
      `CREATE TRIGGER trg_inventory_reconciliation_submissions_parent_insert
        BEFORE INSERT ON inventory_reconciliation_submissions
        WHEN NOT EXISTS (
          SELECT 1 FROM inventory_reconciliation_lines rl
          WHERE rl.id = NEW.reconciliation_line_id
            AND rl.store_id = NEW.store_id
            AND rl.store_product_id = NEW.store_product_id
        )
        BEGIN SELECT RAISE(ABORT, 'reconciliation submission parent does not match product'); END;`,
      `CREATE TRIGGER trg_inventory_reconciliation_submissions_actor_insert
        BEFORE INSERT ON inventory_reconciliation_submissions
        WHEN NOT EXISTS (
          SELECT 1 FROM inventory_reconciliations r
          JOIN inventory_reconciliation_lines rl ON rl.reconciliation_id = r.id
          WHERE rl.id = NEW.reconciliation_line_id
            AND r.created_by_store_member_id = NEW.created_by_store_member_id
            AND r.created_by_user_id = NEW.created_by_user_id
            AND r.device_id = NEW.device_id
        )
        BEGIN SELECT RAISE(ABORT, 'reconciliation submission actor does not match session'); END;`,
      `CREATE TRIGGER trg_inventory_reconciliation_group_counts_parent_insert
        BEFORE INSERT ON inventory_reconciliation_group_counts
        WHEN NOT EXISTS (
          SELECT 1 FROM inventory_reconciliation_submissions rs
          WHERE rs.id = NEW.submission_id
            AND rs.store_id = NEW.store_id
            AND rs.store_product_id = NEW.store_product_id
        )
        BEGIN SELECT RAISE(ABORT, 'reconciliation group count parent does not match product'); END;`,
      `CREATE TRIGGER trg_inventory_reconciliation_group_counts_group_insert
        BEFORE INSERT ON inventory_reconciliation_group_counts
        WHEN NEW.group_id IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM inventory_batch_groups bg
          WHERE bg.id = NEW.group_id
            AND bg.store_id = NEW.store_id
            AND bg.store_product_id = NEW.store_product_id
        )
        BEGIN SELECT RAISE(ABORT, 'reconciliation group count group does not match product'); END;`,
      `CREATE TRIGGER trg_inventory_reconciliations_finalized_update
        BEFORE UPDATE ON inventory_reconciliations
        WHEN OLD.status <> 'IN_PROGRESS'
          OR NEW.id <> OLD.id
          OR NEW.store_id <> OLD.store_id
          OR NEW.created_by_store_member_id <> OLD.created_by_store_member_id
          OR NEW.created_by_user_id <> OLD.created_by_user_id
          OR NEW.device_id <> OLD.device_id
          OR NEW.started_at <> OLD.started_at
          OR NEW.created_at <> OLD.created_at
          OR (NEW.status = 'IN_PROGRESS' AND (NEW.completed_at IS NOT NULL OR NEW.finalization_operation_id IS NOT NULL))
          OR (NEW.status = 'COMPLETED' AND (
            NEW.completed_at IS NULL
            OR NEW.finalization_operation_id IS NULL
            OR NOT EXISTS (
              SELECT 1 FROM inventory_reconciliation_lines rl
              WHERE rl.reconciliation_id = NEW.id
                AND rl.physical_base_units IS NOT NULL
                AND rl.difference_base_units IS NOT NULL
            )
            OR NOT EXISTS (
              SELECT 1 FROM inventory_reconciliation_submissions rs
              JOIN inventory_reconciliation_lines rl ON rl.id = rs.reconciliation_line_id
              WHERE rl.reconciliation_id = NEW.id
            )
          ))
        BEGIN SELECT RAISE(ABORT, 'finalized reconciliations are immutable'); END;`,
      `CREATE TRIGGER trg_inventory_reconciliation_lines_final_refs_update
        BEFORE UPDATE ON inventory_reconciliation_lines
        WHEN (NEW.adjustment_id IS NOT NULL OR NEW.adjustment_inventory_event_id IS NOT NULL)
          AND NOT EXISTS (
            SELECT 1
            FROM inventory_adjustment_lines ial
            JOIN inventory_adjustments ia ON ia.id = ial.adjustment_id
            WHERE ia.id = NEW.adjustment_id
              AND ial.inventory_event_id = NEW.adjustment_inventory_event_id
              AND ial.store_id = NEW.store_id
              AND ial.store_product_id = NEW.store_product_id
          )
        BEGIN SELECT RAISE(ABORT, 'reconciliation final adjustment references do not match'); END;`,
      `CREATE TRIGGER trg_inventory_reconciliation_lines_finalized_update
        BEFORE UPDATE ON inventory_reconciliation_lines
        WHEN EXISTS (
          SELECT 1 FROM inventory_reconciliations r
          WHERE r.id = OLD.reconciliation_id AND r.status <> 'IN_PROGRESS'
        )
          OR NEW.id <> OLD.id
          OR NEW.reconciliation_id <> OLD.reconciliation_id
          OR NEW.store_id <> OLD.store_id
          OR NEW.store_product_id <> OLD.store_product_id
          OR NEW.recorded_base_units_snapshot <> OLD.recorded_base_units_snapshot
          OR NEW.initial_inventory_watermark <> OLD.initial_inventory_watermark
          OR NEW.initial_batch_watermark <> OLD.initial_batch_watermark
          OR NEW.created_at <> OLD.created_at
        BEGIN SELECT RAISE(ABORT, 'finalized reconciliation lines are immutable'); END;`,
      `CREATE TRIGGER trg_inventory_reconciliation_submissions_immutable_update
        BEFORE UPDATE ON inventory_reconciliation_submissions
        BEGIN SELECT RAISE(ABORT, 'reconciliation submissions are immutable'); END;`,
      `CREATE TRIGGER trg_inventory_reconciliation_submissions_immutable_delete
        BEFORE DELETE ON inventory_reconciliation_submissions
        BEGIN SELECT RAISE(ABORT, 'reconciliation submissions are immutable'); END;`,
      `CREATE TRIGGER trg_inventory_reconciliation_group_counts_immutable_update
        BEFORE UPDATE ON inventory_reconciliation_group_counts
        BEGIN SELECT RAISE(ABORT, 'reconciliation group counts are immutable'); END;`,
      `CREATE TRIGGER trg_inventory_reconciliation_group_counts_immutable_delete
        BEFORE DELETE ON inventory_reconciliation_group_counts
        BEGIN SELECT RAISE(ABORT, 'reconciliation group counts are immutable'); END;`,
    ],
  },
  {
    version: 10,
    name: 'guided_inventory_checks',
    statements: [
      `CREATE TABLE inventory_check_settings (
        store_id TEXT PRIMARY KEY REFERENCES stores(id) ON DELETE RESTRICT,
        daily_target INTEGER NOT NULL DEFAULT 3 CHECK (daily_target >= 0 AND daily_target <= 100),
        paused INTEGER NOT NULL DEFAULT 0 CHECK (paused IN (0, 1)),
        window_start_minute INTEGER NOT NULL DEFAULT 0 CHECK (window_start_minute >= 0 AND window_start_minute <= 1439),
        window_end_minute INTEGER NOT NULL DEFAULT 1439 CHECK (window_end_minute >= 0 AND window_end_minute <= 1439),
        policy_version TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
        updated_by_store_member_id TEXT NOT NULL REFERENCES store_members(id) ON DELETE RESTRICT,
        updated_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        updated_by_device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE RESTRICT,
        updated_at TEXT NOT NULL,
        CHECK (window_start_minute <= window_end_minute)
      );`,
      `CREATE TABLE inventory_check_assignments (
        id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
        store_product_id TEXT NOT NULL REFERENCES store_products(id) ON DELETE RESTRICT,
        local_date TEXT NOT NULL CHECK (length(local_date) = 10),
        status TEXT NOT NULL CHECK (status IN ('PENDING', 'COMPLETED', 'REPLACED', 'EXHAUSTED')),
        assignment_kind TEXT NOT NULL CHECK (assignment_kind IN ('INITIAL', 'REPLACEMENT')),
        replaces_assignment_id TEXT REFERENCES inventory_check_assignments(id) ON DELETE RESTRICT,
        root_assignment_id TEXT NOT NULL REFERENCES inventory_check_assignments(id) ON DELETE RESTRICT,
        policy_version TEXT NOT NULL,
        created_by_store_member_id TEXT NOT NULL REFERENCES store_members(id) ON DELETE RESTRICT,
        created_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE RESTRICT,
        created_at TEXT NOT NULL,
        closed_at TEXT,
        closed_by_store_member_id TEXT REFERENCES store_members(id) ON DELETE RESTRICT,
        closed_by_user_id TEXT REFERENCES users(id) ON DELETE RESTRICT,
        closed_by_device_id TEXT REFERENCES devices(id) ON DELETE RESTRICT,
        UNIQUE (store_id, local_date, store_product_id),
        CHECK ((assignment_kind = 'INITIAL' AND replaces_assignment_id IS NULL AND root_assignment_id = id)
          OR (assignment_kind = 'REPLACEMENT' AND replaces_assignment_id IS NOT NULL AND root_assignment_id <> id)),
        CHECK ((status = 'PENDING' AND closed_at IS NULL AND closed_by_store_member_id IS NULL AND closed_by_user_id IS NULL AND closed_by_device_id IS NULL)
          OR (status <> 'PENDING' AND closed_at IS NOT NULL AND closed_by_store_member_id IS NOT NULL AND closed_by_user_id IS NOT NULL AND closed_by_device_id IS NOT NULL))
      );`,
      'CREATE INDEX idx_inventory_check_assignments_store_date ON inventory_check_assignments(store_id, local_date, status, created_at);',
      'CREATE INDEX idx_inventory_check_assignments_product ON inventory_check_assignments(store_product_id, status, created_at DESC);',
      `CREATE TABLE inventory_check_attempts (
        id TEXT PRIMARY KEY,
        assignment_id TEXT NOT NULL REFERENCES inventory_check_assignments(id) ON DELETE RESTRICT,
        store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
        store_product_id TEXT NOT NULL REFERENCES store_products(id) ON DELETE RESTRICT,
        attempt_kind TEXT NOT NULL CHECK (attempt_kind IN ('INITIAL', 'REPLACEMENT')),
        status TEXT NOT NULL CHECK (status IN ('OPEN', 'COMPLETED', 'CANCELLED')),
        reason_code TEXT,
        note TEXT,
        created_by_store_member_id TEXT NOT NULL REFERENCES store_members(id) ON DELETE RESTRICT,
        created_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE RESTRICT,
        reconciliation_id TEXT REFERENCES inventory_reconciliations(id) ON DELETE RESTRICT,
        created_at TEXT NOT NULL,
        closed_at TEXT,
        closed_by_store_member_id TEXT REFERENCES store_members(id) ON DELETE RESTRICT,
        closed_by_user_id TEXT REFERENCES users(id) ON DELETE RESTRICT,
        closed_by_device_id TEXT REFERENCES devices(id) ON DELETE RESTRICT,
        CHECK ((status = 'OPEN' AND closed_at IS NULL AND closed_by_store_member_id IS NULL AND closed_by_user_id IS NULL AND closed_by_device_id IS NULL)
          OR (status <> 'OPEN' AND closed_at IS NOT NULL AND closed_by_store_member_id IS NOT NULL AND closed_by_user_id IS NOT NULL AND closed_by_device_id IS NOT NULL)),
        CHECK (status <> 'COMPLETED' OR reconciliation_id IS NOT NULL)
      );`,
      'CREATE INDEX idx_inventory_check_attempts_assignment ON inventory_check_attempts(assignment_id, created_at ASC, id ASC);',
      'CREATE INDEX idx_inventory_check_attempts_product ON inventory_check_attempts(store_product_id, status, closed_at DESC);',
      'CREATE INDEX idx_inventory_check_attempts_reconciliation ON inventory_check_attempts(reconciliation_id);',
      'ALTER TABLE inventory_reconciliations ADD COLUMN check_assignment_id TEXT REFERENCES inventory_check_assignments(id) ON DELETE RESTRICT;',
      'CREATE INDEX idx_inventory_reconciliations_assignment ON inventory_reconciliations(check_assignment_id);',
      `CREATE TRIGGER trg_inventory_check_settings_member_store_insert
        BEFORE INSERT ON inventory_check_settings
        WHEN NOT EXISTS (
          SELECT 1 FROM store_members sm
          WHERE sm.id = NEW.updated_by_store_member_id
            AND sm.store_id = NEW.store_id
            AND sm.user_id = NEW.updated_by_user_id
            AND sm.status = 'ACTIVE'
        )
        BEGIN SELECT RAISE(ABORT, 'check settings actor is not an active store member'); END;`,
      `CREATE TRIGGER trg_inventory_check_settings_device_store_insert
        BEFORE INSERT ON inventory_check_settings
        WHEN NOT EXISTS (
          SELECT 1 FROM devices d
          WHERE d.id = NEW.updated_by_device_id AND d.store_id = NEW.store_id AND d.status = 'ACTIVE'
        )
        BEGIN SELECT RAISE(ABORT, 'check settings device does not belong to store'); END;`,
      `CREATE TRIGGER trg_inventory_check_settings_member_store_update
        BEFORE UPDATE ON inventory_check_settings
        WHEN NOT EXISTS (
          SELECT 1 FROM store_members sm
          WHERE sm.id = NEW.updated_by_store_member_id
            AND sm.store_id = NEW.store_id
            AND sm.user_id = NEW.updated_by_user_id
            AND sm.status = 'ACTIVE'
        )
        BEGIN SELECT RAISE(ABORT, 'check settings actor is not an active store member'); END;`,
      `CREATE TRIGGER trg_inventory_check_settings_device_store_update
        BEFORE UPDATE ON inventory_check_settings
        WHEN NOT EXISTS (
          SELECT 1 FROM devices d
          WHERE d.id = NEW.updated_by_device_id AND d.store_id = NEW.store_id AND d.status = 'ACTIVE'
        )
        BEGIN SELECT RAISE(ABORT, 'check settings device does not belong to store'); END;`,
      `CREATE TRIGGER trg_inventory_check_assignments_member_store_insert
        BEFORE INSERT ON inventory_check_assignments
        WHEN NOT EXISTS (
          SELECT 1 FROM store_members sm
          WHERE sm.id = NEW.created_by_store_member_id
            AND sm.store_id = NEW.store_id
            AND sm.user_id = NEW.created_by_user_id
            AND sm.status = 'ACTIVE'
        )
        BEGIN SELECT RAISE(ABORT, 'check assignment actor is not an active store member'); END;`,
      `CREATE TRIGGER trg_inventory_check_assignments_device_store_insert
        BEFORE INSERT ON inventory_check_assignments
        WHEN NOT EXISTS (
          SELECT 1 FROM devices d
          WHERE d.id = NEW.device_id AND d.store_id = NEW.store_id AND d.status = 'ACTIVE'
        )
        BEGIN SELECT RAISE(ABORT, 'check assignment device does not belong to store'); END;`,
      `CREATE TRIGGER trg_inventory_check_assignments_product_store_insert
        BEFORE INSERT ON inventory_check_assignments
        WHEN NOT EXISTS (
          SELECT 1 FROM store_products sp
          WHERE sp.id = NEW.store_product_id AND sp.store_id = NEW.store_id
        )
        BEGIN SELECT RAISE(ABORT, 'check assignment product does not belong to store'); END;`,
      `CREATE TRIGGER trg_inventory_check_assignments_replacement_insert
        BEFORE INSERT ON inventory_check_assignments
        WHEN (NEW.assignment_kind = 'REPLACEMENT' AND NOT EXISTS (
          SELECT 1 FROM inventory_check_assignments parent
          WHERE parent.id = NEW.replaces_assignment_id
            AND parent.store_id = NEW.store_id
            AND parent.local_date = NEW.local_date
            AND parent.root_assignment_id = NEW.root_assignment_id
        ))
        BEGIN SELECT RAISE(ABORT, 'check replacement parent does not match assignment'); END;`,
      `CREATE TRIGGER trg_inventory_check_assignments_update
        BEFORE UPDATE ON inventory_check_assignments
        WHEN OLD.status <> 'PENDING'
          OR NEW.id <> OLD.id
          OR NEW.store_id <> OLD.store_id
          OR NEW.store_product_id <> OLD.store_product_id
          OR NEW.local_date <> OLD.local_date
          OR NEW.assignment_kind <> OLD.assignment_kind
          OR COALESCE(NEW.replaces_assignment_id, '') <> COALESCE(OLD.replaces_assignment_id, '')
          OR NEW.root_assignment_id <> OLD.root_assignment_id
          OR NEW.policy_version <> OLD.policy_version
          OR NEW.created_by_store_member_id <> OLD.created_by_store_member_id
          OR NEW.created_by_user_id <> OLD.created_by_user_id
          OR NEW.device_id <> OLD.device_id
          OR NEW.created_at <> OLD.created_at
          OR NEW.status NOT IN ('PENDING', 'COMPLETED', 'REPLACED', 'EXHAUSTED')
          OR (NEW.status = 'PENDING' AND (NEW.closed_at IS NOT NULL OR NEW.closed_by_store_member_id IS NOT NULL OR NEW.closed_by_user_id IS NOT NULL OR NEW.closed_by_device_id IS NOT NULL))
          OR (NEW.status <> 'PENDING' AND (NEW.closed_at IS NULL OR NEW.closed_by_store_member_id IS NULL OR NEW.closed_by_user_id IS NULL OR NEW.closed_by_device_id IS NULL))
          OR (NEW.status = 'COMPLETED' AND NOT EXISTS (
            SELECT 1 FROM inventory_check_attempts ia
            WHERE ia.assignment_id = NEW.id AND ia.status = 'COMPLETED'
          ))
          OR (NEW.status IN ('REPLACED', 'EXHAUSTED') AND NOT EXISTS (
            SELECT 1 FROM inventory_check_attempts ia
            WHERE ia.assignment_id = NEW.id AND ia.status = 'CANCELLED'
          ))
        BEGIN SELECT RAISE(ABORT, 'check assignments preserve immutable history'); END;`,
      `CREATE TRIGGER trg_inventory_check_assignments_immutable_delete
        BEFORE DELETE ON inventory_check_assignments
        BEGIN SELECT RAISE(ABORT, 'check assignments are immutable'); END;`,
      `CREATE TRIGGER trg_inventory_check_assignments_close_actor_update
        BEFORE UPDATE ON inventory_check_assignments
        WHEN NEW.status <> 'PENDING' AND (
          NOT EXISTS (
            SELECT 1 FROM store_members sm
            WHERE sm.id = NEW.closed_by_store_member_id
              AND sm.store_id = NEW.store_id
              AND sm.user_id = NEW.closed_by_user_id
              AND sm.status = 'ACTIVE'
          )
          OR NOT EXISTS (
            SELECT 1 FROM devices d
            WHERE d.id = NEW.closed_by_device_id AND d.store_id = NEW.store_id AND d.status = 'ACTIVE'
          )
        )
        BEGIN SELECT RAISE(ABORT, 'check assignment close actor does not belong to store'); END;`,
      `CREATE TRIGGER trg_inventory_check_attempts_parent_insert
        BEFORE INSERT ON inventory_check_attempts
        WHEN NOT EXISTS (
          SELECT 1 FROM inventory_check_assignments a
          WHERE a.id = NEW.assignment_id
            AND a.store_id = NEW.store_id
            AND a.store_product_id = NEW.store_product_id
            AND a.assignment_kind = NEW.attempt_kind
        )
        BEGIN SELECT RAISE(ABORT, 'check attempt parent does not match assignment'); END;`,
      `CREATE TRIGGER trg_inventory_check_attempts_member_store_insert
        BEFORE INSERT ON inventory_check_attempts
        WHEN NOT EXISTS (
          SELECT 1 FROM store_members sm
          WHERE sm.id = NEW.created_by_store_member_id
            AND sm.store_id = NEW.store_id
            AND sm.user_id = NEW.created_by_user_id
            AND sm.status = 'ACTIVE'
        )
        BEGIN SELECT RAISE(ABORT, 'check attempt actor is not an active store member'); END;`,
      `CREATE TRIGGER trg_inventory_check_attempts_device_store_insert
        BEFORE INSERT ON inventory_check_attempts
        WHEN NOT EXISTS (
          SELECT 1 FROM devices d
          WHERE d.id = NEW.device_id AND d.store_id = NEW.store_id AND d.status = 'ACTIVE'
        )
        BEGIN SELECT RAISE(ABORT, 'check attempt device does not belong to store'); END;`,
      `CREATE TRIGGER trg_inventory_check_attempts_reconciliation_insert
        BEFORE INSERT ON inventory_check_attempts
        WHEN NEW.reconciliation_id IS NOT NULL AND NOT EXISTS (
          SELECT 1
          FROM inventory_reconciliations r
          JOIN inventory_reconciliation_lines rl ON rl.reconciliation_id = r.id
          WHERE r.id = NEW.reconciliation_id
            AND r.store_id = NEW.store_id
            AND rl.store_product_id = NEW.store_product_id
        )
        BEGIN SELECT RAISE(ABORT, 'check attempt reconciliation does not match product'); END;`,
      `CREATE TRIGGER trg_inventory_check_attempts_update
        BEFORE UPDATE ON inventory_check_attempts
        WHEN OLD.status <> 'OPEN'
          OR NEW.id <> OLD.id
          OR NEW.assignment_id <> OLD.assignment_id
          OR NEW.store_id <> OLD.store_id
          OR NEW.store_product_id <> OLD.store_product_id
          OR NEW.attempt_kind <> OLD.attempt_kind
          OR NEW.created_by_store_member_id <> OLD.created_by_store_member_id
          OR NEW.created_by_user_id <> OLD.created_by_user_id
          OR NEW.device_id <> OLD.device_id
          OR NEW.created_at <> OLD.created_at
          OR NEW.status NOT IN ('OPEN', 'COMPLETED', 'CANCELLED')
          OR (NEW.status = 'OPEN' AND (NEW.closed_at IS NOT NULL OR NEW.closed_by_store_member_id IS NOT NULL OR NEW.closed_by_user_id IS NOT NULL OR NEW.closed_by_device_id IS NOT NULL))
          OR (NEW.status <> 'OPEN' AND (NEW.closed_at IS NULL OR NEW.closed_by_store_member_id IS NULL OR NEW.closed_by_user_id IS NULL OR NEW.closed_by_device_id IS NULL))
          OR (NEW.status = 'COMPLETED' AND NEW.reconciliation_id IS NULL)
        BEGIN SELECT RAISE(ABORT, 'check attempts preserve immutable history'); END;`,
      `CREATE TRIGGER trg_inventory_check_attempts_immutable_delete
        BEFORE DELETE ON inventory_check_attempts
        BEGIN SELECT RAISE(ABORT, 'check attempts are immutable'); END;`,
      `CREATE TRIGGER trg_inventory_check_attempts_close_actor_update
        BEFORE UPDATE ON inventory_check_attempts
        WHEN NEW.status <> 'OPEN' AND (
          NOT EXISTS (
            SELECT 1 FROM store_members sm
            WHERE sm.id = NEW.closed_by_store_member_id
              AND sm.store_id = NEW.store_id
              AND sm.user_id = NEW.closed_by_user_id
              AND sm.status = 'ACTIVE'
          )
          OR NOT EXISTS (
            SELECT 1 FROM devices d
            WHERE d.id = NEW.closed_by_device_id AND d.store_id = NEW.store_id AND d.status = 'ACTIVE'
          )
        )
        BEGIN SELECT RAISE(ABORT, 'check attempt close actor does not belong to store'); END;`,
      `CREATE TRIGGER trg_inventory_check_attempts_reconciliation_update
        BEFORE UPDATE ON inventory_check_attempts
        WHEN NEW.reconciliation_id IS NOT NULL AND NOT EXISTS (
          SELECT 1
          FROM inventory_reconciliations r
          JOIN inventory_reconciliation_lines rl ON rl.reconciliation_id = r.id
          WHERE r.id = NEW.reconciliation_id
            AND r.store_id = NEW.store_id
            AND rl.store_product_id = NEW.store_product_id
        )
        BEGIN SELECT RAISE(ABORT, 'check attempt reconciliation does not match product'); END;`,
      `CREATE TRIGGER trg_inventory_reconciliations_assignment_insert
        BEFORE INSERT ON inventory_reconciliations
        WHEN NEW.check_assignment_id IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM inventory_check_assignments a
          WHERE a.id = NEW.check_assignment_id AND a.store_id = NEW.store_id AND a.status = 'PENDING'
        )
        BEGIN SELECT RAISE(ABORT, 'reconciliation check assignment does not belong to store'); END;`,
      `CREATE TRIGGER trg_inventory_reconciliation_lines_assignment_insert
        BEFORE INSERT ON inventory_reconciliation_lines
        WHEN EXISTS (
          SELECT 1 FROM inventory_reconciliations r
          WHERE r.id = NEW.reconciliation_id AND r.check_assignment_id IS NOT NULL
            AND NOT EXISTS (
              SELECT 1 FROM inventory_check_assignments a
              WHERE a.id = r.check_assignment_id AND a.store_product_id = NEW.store_product_id
            )
        )
        BEGIN SELECT RAISE(ABORT, 'reconciliation check assignment does not match product'); END;`,
      `DROP TRIGGER trg_inventory_reconciliations_finalized_update;`,
      `CREATE TRIGGER trg_inventory_reconciliations_finalized_update
        BEFORE UPDATE ON inventory_reconciliations
        WHEN OLD.status <> 'IN_PROGRESS'
          OR NEW.id <> OLD.id
          OR NEW.store_id <> OLD.store_id
          OR NEW.created_by_store_member_id <> OLD.created_by_store_member_id
          OR NEW.created_by_user_id <> OLD.created_by_user_id
          OR NEW.device_id <> OLD.device_id
          OR NEW.started_at <> OLD.started_at
          OR NEW.check_assignment_id IS NOT OLD.check_assignment_id
          OR NEW.created_at <> OLD.created_at
          OR (NEW.status = 'IN_PROGRESS' AND (NEW.completed_at IS NOT NULL OR NEW.finalization_operation_id IS NOT NULL))
          OR (NEW.status = 'COMPLETED' AND (
            NEW.completed_at IS NULL
            OR NEW.finalization_operation_id IS NULL
            OR NOT EXISTS (
              SELECT 1 FROM inventory_reconciliation_lines rl
              WHERE rl.reconciliation_id = NEW.id
                AND rl.physical_base_units IS NOT NULL
                AND rl.difference_base_units IS NOT NULL
            )
            OR NOT EXISTS (
              SELECT 1 FROM inventory_reconciliation_submissions rs
              JOIN inventory_reconciliation_lines rl ON rl.id = rs.reconciliation_line_id
              WHERE rl.reconciliation_id = NEW.id
            )
          ))
        BEGIN SELECT RAISE(ABORT, 'finalized reconciliations are immutable'); END;`,
    ],
  },
  {
    version: 11,
    name: 'inventory_attention',
    statements: [
      `CREATE TABLE inventory_attention_settings (
        store_id TEXT PRIMARY KEY REFERENCES stores(id) ON DELETE RESTRICT,
        expiry_lead_days INTEGER NOT NULL DEFAULT 30 CHECK (expiry_lead_days >= 0 AND expiry_lead_days <= 3650),
        policy_version TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
        updated_by_store_member_id TEXT NOT NULL REFERENCES store_members(id) ON DELETE RESTRICT,
        updated_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        updated_by_device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE RESTRICT,
        updated_at TEXT NOT NULL
      );`,
      `CREATE TABLE inventory_attention_snoozes (
        id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
        store_product_id TEXT NOT NULL REFERENCES store_products(id) ON DELETE RESTRICT,
        condition_key TEXT NOT NULL CHECK (length(condition_key) > 0 AND length(condition_key) <= 200),
        condition_type TEXT NOT NULL CHECK (condition_type IN ('STOCK', 'EXPIRY', 'DISCREPANCY', 'UNKNOWN_COVERAGE')),
        group_id TEXT REFERENCES inventory_batch_groups(id) ON DELETE RESTRICT,
        severity_rank INTEGER NOT NULL CHECK (severity_rank > 0),
        snooze_kind TEXT NOT NULL CHECK (snooze_kind IN ('LATER_TODAY', 'TOMORROW', 'CHOOSE_DATE_TIME')),
        due_local_date TEXT NOT NULL CHECK (length(due_local_date) = 10),
        due_local_minute INTEGER NOT NULL CHECK (due_local_minute >= 0 AND due_local_minute <= 1439),
        policy_version TEXT NOT NULL,
        created_by_store_member_id TEXT NOT NULL REFERENCES store_members(id) ON DELETE RESTRICT,
        created_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE RESTRICT,
        created_at TEXT NOT NULL,
        CHECK ((condition_type = 'EXPIRY' AND group_id IS NOT NULL)
          OR (condition_type <> 'EXPIRY' AND group_id IS NULL))
      );`,
      'CREATE INDEX idx_attention_snoozes_condition ON inventory_attention_snoozes(store_id, store_product_id, condition_key, created_at DESC, id DESC);',
      'CREATE INDEX idx_attention_snoozes_store ON inventory_attention_snoozes(store_id, due_local_date, due_local_minute);',
      `CREATE TRIGGER trg_attention_settings_member_store_insert
        BEFORE INSERT ON inventory_attention_settings
        WHEN NOT EXISTS (
          SELECT 1 FROM store_members sm
          WHERE sm.id = NEW.updated_by_store_member_id
            AND sm.store_id = NEW.store_id
            AND sm.user_id = NEW.updated_by_user_id
            AND sm.status = 'ACTIVE'
        )
        BEGIN SELECT RAISE(ABORT, 'attention settings actor is not an active store member'); END;`,
      `CREATE TRIGGER trg_attention_settings_device_store_insert
        BEFORE INSERT ON inventory_attention_settings
        WHEN NOT EXISTS (
          SELECT 1 FROM devices d
          WHERE d.id = NEW.updated_by_device_id
            AND d.store_id = NEW.store_id
            AND d.status = 'ACTIVE'
        )
        BEGIN SELECT RAISE(ABORT, 'attention settings device does not belong to store'); END;`,
      `CREATE TRIGGER trg_attention_settings_member_store_update
        BEFORE UPDATE ON inventory_attention_settings
        WHEN NOT EXISTS (
          SELECT 1 FROM store_members sm
          WHERE sm.id = NEW.updated_by_store_member_id
            AND sm.store_id = NEW.store_id
            AND sm.user_id = NEW.updated_by_user_id
            AND sm.status = 'ACTIVE'
        )
        BEGIN SELECT RAISE(ABORT, 'attention settings actor is not an active store member'); END;`,
      `CREATE TRIGGER trg_attention_settings_device_store_update
        BEFORE UPDATE ON inventory_attention_settings
        WHEN NOT EXISTS (
          SELECT 1 FROM devices d
          WHERE d.id = NEW.updated_by_device_id
            AND d.store_id = NEW.store_id
            AND d.status = 'ACTIVE'
        )
        BEGIN SELECT RAISE(ABORT, 'attention settings device does not belong to store'); END;`,
      `CREATE TRIGGER trg_attention_settings_version_update
        BEFORE UPDATE ON inventory_attention_settings
        WHEN NEW.store_id <> OLD.store_id OR NEW.version <> OLD.version + 1
        BEGIN SELECT RAISE(ABORT, 'attention settings version must advance by one'); END;`,
      `CREATE TRIGGER trg_attention_settings_immutable_delete
        BEFORE DELETE ON inventory_attention_settings
        BEGIN SELECT RAISE(ABORT, 'attention settings history cannot be deleted'); END;`,
      `CREATE TRIGGER trg_attention_snoozes_product_store_insert
        BEFORE INSERT ON inventory_attention_snoozes
        WHEN NOT EXISTS (
          SELECT 1 FROM store_products sp
          WHERE sp.id = NEW.store_product_id AND sp.store_id = NEW.store_id
        )
        BEGIN SELECT RAISE(ABORT, 'attention snooze product does not belong to store'); END;`,
      `CREATE TRIGGER trg_attention_snoozes_group_store_insert
        BEFORE INSERT ON inventory_attention_snoozes
        WHEN NEW.group_id IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM inventory_batch_groups bg
          WHERE bg.id = NEW.group_id
            AND bg.store_id = NEW.store_id
            AND bg.store_product_id = NEW.store_product_id
        )
        BEGIN SELECT RAISE(ABORT, 'attention snooze group does not belong to store product'); END;`,
      `CREATE TRIGGER trg_attention_snoozes_member_store_insert
        BEFORE INSERT ON inventory_attention_snoozes
        WHEN NOT EXISTS (
          SELECT 1 FROM store_members sm
          WHERE sm.id = NEW.created_by_store_member_id
            AND sm.store_id = NEW.store_id
            AND sm.user_id = NEW.created_by_user_id
            AND sm.status = 'ACTIVE'
        )
        BEGIN SELECT RAISE(ABORT, 'attention snooze actor is not an active store member'); END;`,
      `CREATE TRIGGER trg_attention_snoozes_device_store_insert
        BEFORE INSERT ON inventory_attention_snoozes
        WHEN NOT EXISTS (
          SELECT 1 FROM devices d
          WHERE d.id = NEW.device_id
            AND d.store_id = NEW.store_id
            AND d.status = 'ACTIVE'
        )
        BEGIN SELECT RAISE(ABORT, 'attention snooze device does not belong to store'); END;`,
      `CREATE TRIGGER trg_attention_snoozes_immutable_update
        BEFORE UPDATE ON inventory_attention_snoozes
        BEGIN SELECT RAISE(ABORT, 'attention snoozes are immutable'); END;`,
      `CREATE TRIGGER trg_attention_snoozes_immutable_delete
        BEFORE DELETE ON inventory_attention_snoozes
        BEGIN SELECT RAISE(ABORT, 'attention snoozes are immutable'); END;`,
    ],
  },
  {
    version: 12,
    name: 'batch_operation_sealing_and_inspection_evidence',
    statements: [
      // v7 operation headers were immutable, but they had no durable point at
      // which their entry graph became complete. These nullable columns are
      // intentionally additive so the v1-v11 history remains untouched.
      'ALTER TABLE batch_inventory_operations ADD COLUMN sealed_at TEXT;',
      'ALTER TABLE batch_inventory_operations ADD COLUMN sealed_entry_count INTEGER;',
      'ALTER TABLE batch_inventory_operations ADD COLUMN sealed_delta_base_micros TEXT;',
      'DROP TRIGGER trg_batch_operations_immutable_update;',
      // Do not manufacture missing entries, source rows, or inspection facts
      // for old devices. A malformed pre-v12 graph fails the upgrade instead
      // of being silently declared complete.
      `CREATE TEMP TABLE m12_batch_validation_guard (
        value INTEGER NOT NULL CHECK (value = 0)
      );`,
      `INSERT INTO m12_batch_validation_guard (value)
        SELECT 1
        WHERE EXISTS (
          SELECT 1
          FROM batch_inventory_operations bo
          WHERE NOT EXISTS (
            SELECT 1 FROM batch_inventory_entries bie WHERE bie.operation_id = bo.id
          )
          OR (
            bo.kind = 'EVENT_ALLOCATION'
            AND NOT EXISTS (
              SELECT 1
              FROM inventory_events ie
              WHERE ie.id = bo.inventory_event_id
                AND ie.id = bo.source_id
                AND ie.store_id = bo.store_id
                AND ie.store_product_id = bo.store_product_id
                AND ie.source_type = bo.source_type
                AND CAST(COALESCE((SELECT SUM(delta_base_micros) FROM batch_inventory_entries WHERE operation_id = bo.id), 0) AS TEXT)
                    = CAST(ie.quantity_base_delta_micros AS TEXT)
            )
          )
          OR (
            bo.kind IN ('CLASSIFICATION', 'RECONCILIATION')
            AND CAST(COALESCE((SELECT SUM(delta_base_micros) FROM batch_inventory_entries WHERE operation_id = bo.id), 0) AS TEXT) <> '0'
          )
        );`,
      'DROP TABLE m12_batch_validation_guard;',
      `UPDATE batch_inventory_operations
        SET sealed_at = created_at,
            sealed_entry_count = (SELECT COUNT(*) FROM batch_inventory_entries WHERE operation_id = batch_inventory_operations.id),
            sealed_delta_base_micros = CAST(COALESCE((SELECT SUM(delta_base_micros) FROM batch_inventory_entries WHERE operation_id = batch_inventory_operations.id), 0) AS TEXT)
        WHERE sealed_at IS NULL;`,
      `CREATE TABLE batch_inventory_inspections (
        operation_id TEXT PRIMARY KEY REFERENCES batch_inventory_operations(id) ON DELETE RESTRICT,
        store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
        store_product_id TEXT NOT NULL REFERENCES store_products(id) ON DELETE RESTRICT,
        request_json TEXT NOT NULL CHECK (length(request_json) > 0),
        evidence_json TEXT NOT NULL CHECK (length(evidence_json) > 0),
        inventory_watermark TEXT NOT NULL,
        batch_watermark TEXT NOT NULL,
        recorded_by_store_member_id TEXT NOT NULL REFERENCES store_members(id) ON DELETE RESTRICT,
        recorded_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE RESTRICT,
        created_at TEXT NOT NULL
      );`,
      `CREATE TRIGGER trg_batch_inspections_operation_insert
        BEFORE INSERT ON batch_inventory_inspections
        WHEN NOT EXISTS (
          SELECT 1 FROM batch_inventory_operations bo
          WHERE bo.id = NEW.operation_id
            AND bo.store_id = NEW.store_id
            AND bo.store_product_id = NEW.store_product_id
            AND bo.kind = 'CLASSIFICATION'
            AND bo.source_type = 'PHYSICAL_INSPECTION'
        )
        BEGIN SELECT RAISE(ABORT, 'batch inspection operation does not match classification'); END;`,
      `CREATE TRIGGER trg_batch_inspections_member_store_insert
        BEFORE INSERT ON batch_inventory_inspections
        WHEN NOT EXISTS (
          SELECT 1 FROM store_members sm
          WHERE sm.id = NEW.recorded_by_store_member_id
            AND sm.store_id = NEW.store_id
            AND sm.user_id = NEW.recorded_by_user_id
            AND sm.status = 'ACTIVE'
        )
        BEGIN SELECT RAISE(ABORT, 'batch inspection actor is not an active store member'); END;`,
      `CREATE TRIGGER trg_batch_inspections_device_store_insert
        BEFORE INSERT ON batch_inventory_inspections
        WHEN NOT EXISTS (
          SELECT 1 FROM devices d
          WHERE d.id = NEW.device_id AND d.store_id = NEW.store_id AND d.status = 'ACTIVE'
        )
        BEGIN SELECT RAISE(ABORT, 'batch inspection device does not belong to store'); END;`,
      `CREATE TRIGGER trg_batch_inspections_immutable_update
        BEFORE UPDATE ON batch_inventory_inspections
        BEGIN SELECT RAISE(ABORT, 'batch inspection evidence is immutable'); END;`,
      `CREATE TRIGGER trg_batch_inspections_immutable_delete
        BEFORE DELETE ON batch_inventory_inspections
        BEGIN SELECT RAISE(ABORT, 'batch inspection evidence is immutable'); END;`,
      `CREATE TRIGGER trg_batch_operations_event_source_insert
        BEFORE INSERT ON batch_inventory_operations
        WHEN NEW.kind = 'EVENT_ALLOCATION' AND NOT EXISTS (
          SELECT 1 FROM inventory_events ie
          WHERE ie.id = NEW.inventory_event_id
            AND ie.id = NEW.source_id
            AND ie.store_id = NEW.store_id
            AND ie.store_product_id = NEW.store_product_id
            AND ie.source_type = NEW.source_type
        )
        BEGIN SELECT RAISE(ABORT, 'batch event operation source does not match inventory event'); END;`,
      `CREATE TRIGGER trg_batch_operations_classification_source_insert
        BEFORE INSERT ON batch_inventory_operations
        WHEN NEW.kind = 'CLASSIFICATION' AND (
          NEW.source_type <> 'PHYSICAL_INSPECTION' OR NEW.source_id IS NOT NEW.id
        )
        BEGIN SELECT RAISE(ABORT, 'batch classification source does not match operation'); END;`,
      `CREATE TRIGGER trg_batch_operations_seal_update
        BEFORE UPDATE ON batch_inventory_operations
        WHEN OLD.sealed_at IS NOT NULL
          OR NEW.id IS NOT OLD.id
          OR NEW.store_id IS NOT OLD.store_id
          OR NEW.store_product_id IS NOT OLD.store_product_id
          OR NEW.kind IS NOT OLD.kind
          OR NEW.inventory_event_id IS NOT OLD.inventory_event_id
          OR NEW.source_type IS NOT OLD.source_type
          OR NEW.source_id IS NOT OLD.source_id
          OR NEW.policy_version IS NOT OLD.policy_version
          OR NEW.evidence_version IS NOT OLD.evidence_version
          OR NEW.inventory_watermark IS NOT OLD.inventory_watermark
          OR NEW.batch_watermark IS NOT OLD.batch_watermark
          OR NEW.recorded_by_store_member_id IS NOT OLD.recorded_by_store_member_id
          OR NEW.recorded_by_user_id IS NOT OLD.recorded_by_user_id
          OR NEW.device_id IS NOT OLD.device_id
          OR NEW.local_application_order IS NOT OLD.local_application_order
          OR NEW.created_at IS NOT OLD.created_at
          OR (OLD.sealed_at IS NULL AND (
            NEW.sealed_at IS NULL
            OR NEW.sealed_entry_count IS NULL
            OR NEW.sealed_delta_base_micros IS NULL
            OR NEW.sealed_entry_count <> (SELECT COUNT(*) FROM batch_inventory_entries WHERE operation_id = OLD.id)
            OR NEW.sealed_delta_base_micros <> CAST(COALESCE((SELECT SUM(delta_base_micros) FROM batch_inventory_entries WHERE operation_id = OLD.id), 0) AS TEXT)
          ))
        BEGIN SELECT RAISE(ABORT, 'batch inventory operations are immutable except one valid seal'); END;`,
      `CREATE TRIGGER trg_batch_operations_seal_graph
        BEFORE UPDATE ON batch_inventory_operations
        WHEN OLD.sealed_at IS NULL AND NEW.sealed_at IS NOT NULL AND (
          (SELECT COUNT(*) FROM batch_inventory_entries WHERE operation_id = NEW.id) = 0
          OR (
            NEW.kind = 'EVENT_ALLOCATION'
            AND NOT EXISTS (
              SELECT 1
              FROM inventory_events ie
              WHERE ie.id = NEW.inventory_event_id
                AND ie.id = NEW.source_id
                AND ie.store_id = NEW.store_id
                AND ie.store_product_id = NEW.store_product_id
                AND ie.source_type = NEW.source_type
                AND CAST(COALESCE((SELECT SUM(delta_base_micros) FROM batch_inventory_entries WHERE operation_id = NEW.id), 0) AS TEXT)
                    = CAST(ie.quantity_base_delta_micros AS TEXT)
            )
          )
          OR (NEW.kind = 'CLASSIFICATION' AND (
            NEW.source_type <> 'PHYSICAL_INSPECTION'
            OR NEW.source_id IS NOT NEW.id
            OR CAST(COALESCE((SELECT SUM(delta_base_micros) FROM batch_inventory_entries WHERE operation_id = NEW.id), 0) AS TEXT) <> '0'
            OR NOT EXISTS (SELECT 1 FROM batch_inventory_inspections bi WHERE bi.operation_id = NEW.id)
          ))
          OR (NEW.kind = 'RECONCILIATION' AND (
            NEW.source_type <> 'RECONCILIATION'
            OR NOT EXISTS (
              SELECT 1 FROM inventory_reconciliation_lines rl
              WHERE rl.id = NEW.source_id
                AND rl.store_id = NEW.store_id
                AND rl.store_product_id = NEW.store_product_id
            )
            OR CAST(COALESCE((SELECT SUM(delta_base_micros) FROM batch_inventory_entries WHERE operation_id = NEW.id), 0) AS TEXT) <> '0'
          ))
        )
        BEGIN SELECT RAISE(ABORT, 'batch inventory operation graph is incomplete or mismatched'); END;`,
      `CREATE TRIGGER trg_batch_entries_sealed_insert
        BEFORE INSERT ON batch_inventory_entries
        WHEN EXISTS (
          SELECT 1 FROM batch_inventory_operations bo
          WHERE bo.id = NEW.operation_id AND bo.sealed_at IS NOT NULL
        )
        BEGIN SELECT RAISE(ABORT, 'sealed batch inventory operations cannot accept entries'); END;`,
    ],
  },
  {
    version: 13,
    name: 'adjustment_batch_reclassification_sealing',
    statements: [
      `CREATE TRIGGER trg_batch_operations_adjustment_source_insert
        BEFORE INSERT ON batch_inventory_operations
        WHEN NEW.kind = 'ADJUSTMENT' AND (
          NEW.source_type <> 'MANUAL_ADJUSTMENT'
          OR NEW.source_id IS NULL
          OR NOT EXISTS (
            SELECT 1 FROM inventory_adjustments ia
            WHERE ia.id = NEW.source_id AND ia.store_id = NEW.store_id
          )
        )
        BEGIN SELECT RAISE(ABORT, 'batch adjustment source does not match adjustment'); END;`,
      `CREATE TRIGGER trg_batch_operations_adjustment_seal_graph
        BEFORE UPDATE ON batch_inventory_operations
        WHEN OLD.sealed_at IS NULL AND NEW.sealed_at IS NOT NULL
          AND NEW.kind = 'ADJUSTMENT'
          AND (
            NEW.source_type <> 'MANUAL_ADJUSTMENT'
            OR NEW.source_id IS NULL
            OR NOT EXISTS (
              SELECT 1 FROM inventory_adjustments ia
              WHERE ia.id = NEW.source_id AND ia.store_id = NEW.store_id
            )
            OR CAST(COALESCE((SELECT SUM(delta_base_micros) FROM batch_inventory_entries WHERE operation_id = NEW.id), 0) AS TEXT) <> '0'
          )
        BEGIN SELECT RAISE(ABORT, 'adjustment batch reclassification is incomplete or mismatched'); END;`,
    ],
  },
  {
    version: 14,
    name: 'store_product_configuration_versioning',
    statements: [
      `ALTER TABLE store_products
        ADD COLUMN version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0);`,
      `CREATE TRIGGER trg_store_products_version_update
        BEFORE UPDATE ON store_products
        WHEN NEW.version <> OLD.version + 1
        BEGIN SELECT RAISE(ABORT, 'store product version must advance by one'); END;`,
    ],
  },
  {
    version: 15,
    name: 'durable_reorder_level_history',
    statements: [
      `CREATE TABLE store_product_reorder_level_history (
        operation_id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
        store_product_id TEXT NOT NULL REFERENCES store_products(id) ON DELETE RESTRICT,
        store_product_version INTEGER NOT NULL CHECK (store_product_version > 0),
        has_previous_threshold INTEGER NOT NULL CHECK (has_previous_threshold IN (0, 1)),
        previous_reorder_level_base_micros INTEGER NULL CHECK (previous_reorder_level_base_micros IS NULL OR previous_reorder_level_base_micros >= 0),
        reorder_level_base_micros INTEGER NULL CHECK (reorder_level_base_micros IS NULL OR reorder_level_base_micros >= 0),
        inventory_balance_base_micros TEXT NULL,
        inventory_ledger_watermark TEXT NULL,
        created_at TEXT NOT NULL,
        UNIQUE (store_product_id, store_product_version)
      );`,
      `CREATE INDEX idx_reorder_level_history_product_version
        ON store_product_reorder_level_history(store_id, store_product_id, store_product_version);`,
      `INSERT INTO store_product_reorder_level_history (
        operation_id, store_id, store_product_id, store_product_version,
        has_previous_threshold, previous_reorder_level_base_micros,
        reorder_level_base_micros, inventory_balance_base_micros,
        inventory_ledger_watermark, created_at
      )
      SELECT
        operation_id, store_id, entity_id,
        CAST(json_extract(payload, '$.entities.storeProduct.version') AS INTEGER),
        CASE WHEN json_type(payload, '$.entities.previousReorderLevelBaseMicros') IS NULL THEN 0 ELSE 1 END,
        CASE WHEN json_type(payload, '$.entities.previousReorderLevelBaseMicros') = 'integer'
          THEN CAST(json_extract(payload, '$.entities.previousReorderLevelBaseMicros') AS INTEGER) ELSE NULL END,
        CASE WHEN json_type(payload, '$.entities.request.reorderLevelBaseMicros') = 'integer'
          THEN CAST(json_extract(payload, '$.entities.request.reorderLevelBaseMicros') AS INTEGER) ELSE NULL END,
        CASE WHEN json_type(payload, '$.entities.inventoryBalanceBaseMicros') IN ('integer', 'text')
          THEN CAST(json_extract(payload, '$.entities.inventoryBalanceBaseMicros') AS TEXT) ELSE NULL END,
        CASE WHEN json_type(payload, '$.entities.inventoryLedgerWatermark') = 'text'
          THEN CAST(json_extract(payload, '$.entities.inventoryLedgerWatermark') AS TEXT) ELSE NULL END,
        created_at
      FROM outbox_operations
      WHERE operation_type = 'PRODUCT_REORDER_LEVEL_UPDATED'
        AND entity_type = 'STORE_PRODUCT'
        AND json_valid(payload)
        AND json_type(payload, '$.entities.storeProduct.version') = 'integer'
        AND json_type(payload, '$.entities.request.reorderLevelBaseMicros') IN ('integer', 'null');`,
      `CREATE TRIGGER trg_reorder_level_history_update
        BEFORE UPDATE ON store_product_reorder_level_history
        BEGIN SELECT RAISE(ABORT, 'reorder level history is immutable'); END;`,
      `CREATE TRIGGER trg_reorder_level_history_delete
        BEFORE DELETE ON store_product_reorder_level_history
        BEGIN SELECT RAISE(ABORT, 'reorder level history is immutable'); END;`,
    ],
  },
  {
    version: 16,
    name: 'expenses',
    statements: [
      `CREATE TABLE expenses (
        id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
        category TEXT NOT NULL CHECK (category IN (
          'TRANSPORT', 'WAGES', 'FUEL_ELECTRICITY', 'RENT',
          'MAINTENANCE', 'LEVIES_TAX', 'MISCELLANEOUS'
        )),
        amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
        currency_code TEXT NOT NULL CHECK (length(currency_code) = 3),
        note TEXT CHECK (note IS NULL OR length(note) <= 500),
        occurred_at TEXT NOT NULL,
        created_by_store_member_id TEXT NOT NULL REFERENCES store_members(id) ON DELETE RESTRICT,
        created_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE RESTRICT,
        created_at TEXT NOT NULL
      );`,
      `CREATE INDEX idx_expenses_store_occurred
        ON expenses(store_id, occurred_at DESC, created_at DESC, id DESC);`,
      `CREATE TRIGGER trg_expenses_member_store_owner_insert
        BEFORE INSERT ON expenses
        WHEN NOT EXISTS (
          SELECT 1 FROM store_members sm
          WHERE sm.id = NEW.created_by_store_member_id
            AND sm.store_id = NEW.store_id
            AND sm.user_id = NEW.created_by_user_id
            AND sm.role = 'OWNER'
            AND sm.status = 'ACTIVE'
        )
        BEGIN SELECT RAISE(ABORT, 'expense creator is not an active store owner'); END;`,
      `CREATE TRIGGER trg_expenses_member_store_owner_update
        BEFORE UPDATE ON expenses
        WHEN NOT EXISTS (
          SELECT 1 FROM store_members sm
          WHERE sm.id = NEW.created_by_store_member_id
            AND sm.store_id = NEW.store_id
            AND sm.user_id = NEW.created_by_user_id
            AND sm.role = 'OWNER'
            AND sm.status = 'ACTIVE'
        )
        BEGIN SELECT RAISE(ABORT, 'expense creator is not an active store owner'); END;`,
      `CREATE TRIGGER trg_expenses_device_store_insert
        BEFORE INSERT ON expenses
        WHEN NOT EXISTS (
          SELECT 1 FROM devices d
          WHERE d.id = NEW.device_id
            AND d.store_id = NEW.store_id
            AND d.status = 'ACTIVE'
        )
        BEGIN SELECT RAISE(ABORT, 'expense device does not belong to active store'); END;`,
      `CREATE TRIGGER trg_expenses_device_store_update
        BEFORE UPDATE OF store_id, device_id ON expenses
        WHEN NOT EXISTS (
          SELECT 1 FROM devices d
          WHERE d.id = NEW.device_id
            AND d.store_id = NEW.store_id
            AND d.status = 'ACTIVE'
        )
        BEGIN SELECT RAISE(ABORT, 'expense device does not belong to active store'); END;`,
      `CREATE TRIGGER trg_expenses_currency_store_insert
        BEFORE INSERT ON expenses
        WHEN NOT EXISTS (
          SELECT 1 FROM stores s
          WHERE s.id = NEW.store_id
            AND s.currency_code = NEW.currency_code
        )
        BEGIN SELECT RAISE(ABORT, 'expense currency mismatch with store'); END;`,
      `CREATE TRIGGER trg_expenses_currency_store_update
        BEFORE UPDATE OF store_id, currency_code ON expenses
        WHEN NOT EXISTS (
          SELECT 1 FROM stores s
          WHERE s.id = NEW.store_id
            AND s.currency_code = NEW.currency_code
        )
        BEGIN SELECT RAISE(ABORT, 'expense currency mismatch with store'); END;`,
      `CREATE TRIGGER trg_expenses_immutable_update
        BEFORE UPDATE ON expenses
        BEGIN SELECT RAISE(ABORT, 'expenses are immutable'); END;`,
      `CREATE TRIGGER trg_expenses_immutable_delete
        BEFORE DELETE ON expenses
        BEGIN SELECT RAISE(ABORT, 'expenses are immutable'); END;`,
    ],
  },
  {
    version: 17,
    name: 'owner_withdrawals',
    statements: [
      `CREATE TABLE owner_withdrawals (
        id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
        amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
        currency_code TEXT NOT NULL CHECK (length(currency_code) = 3),
        note TEXT CHECK (note IS NULL OR length(note) <= 500),
        occurred_at TEXT NOT NULL,
        created_by_store_member_id TEXT NOT NULL REFERENCES store_members(id) ON DELETE RESTRICT,
        created_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE RESTRICT,
        created_at TEXT NOT NULL
      );`,
      `CREATE INDEX idx_owner_withdrawals_store_occurred
        ON owner_withdrawals(store_id, occurred_at DESC, created_at DESC, id DESC);`,
      `CREATE TRIGGER trg_owner_withdrawals_member_store_owner_insert
        BEFORE INSERT ON owner_withdrawals
        WHEN NOT EXISTS (
          SELECT 1 FROM store_members sm
          WHERE sm.id = NEW.created_by_store_member_id
            AND sm.store_id = NEW.store_id
            AND sm.user_id = NEW.created_by_user_id
            AND sm.role = 'OWNER'
            AND sm.status = 'ACTIVE'
        )
        BEGIN SELECT RAISE(ABORT, 'withdrawal creator is not an active store owner'); END;`,
      `CREATE TRIGGER trg_owner_withdrawals_member_store_owner_update
        BEFORE UPDATE ON owner_withdrawals
        WHEN NOT EXISTS (
          SELECT 1 FROM store_members sm
          WHERE sm.id = NEW.created_by_store_member_id
            AND sm.store_id = NEW.store_id
            AND sm.user_id = NEW.created_by_user_id
            AND sm.role = 'OWNER'
            AND sm.status = 'ACTIVE'
        )
        BEGIN SELECT RAISE(ABORT, 'withdrawal creator is not an active store owner'); END;`,
      `CREATE TRIGGER trg_owner_withdrawals_device_store_insert
        BEFORE INSERT ON owner_withdrawals
        WHEN NOT EXISTS (
          SELECT 1 FROM devices d
          WHERE d.id = NEW.device_id
            AND d.store_id = NEW.store_id
            AND d.status = 'ACTIVE'
        )
        BEGIN SELECT RAISE(ABORT, 'withdrawal device does not belong to active store'); END;`,
      `CREATE TRIGGER trg_owner_withdrawals_device_store_update
        BEFORE UPDATE OF store_id, device_id ON owner_withdrawals
        WHEN NOT EXISTS (
          SELECT 1 FROM devices d
          WHERE d.id = NEW.device_id
            AND d.store_id = NEW.store_id
            AND d.status = 'ACTIVE'
        )
        BEGIN SELECT RAISE(ABORT, 'withdrawal device does not belong to active store'); END;`,
      `CREATE TRIGGER trg_owner_withdrawals_currency_store_insert
        BEFORE INSERT ON owner_withdrawals
        WHEN NOT EXISTS (
          SELECT 1 FROM stores s
          WHERE s.id = NEW.store_id
            AND s.currency_code = NEW.currency_code
        )
        BEGIN SELECT RAISE(ABORT, 'withdrawal currency mismatch with store'); END;`,
      `CREATE TRIGGER trg_owner_withdrawals_currency_store_update
        BEFORE UPDATE OF store_id, currency_code ON owner_withdrawals
        WHEN NOT EXISTS (
          SELECT 1 FROM stores s
          WHERE s.id = NEW.store_id
            AND s.currency_code = NEW.currency_code
        )
        BEGIN SELECT RAISE(ABORT, 'withdrawal currency mismatch with store'); END;`,
      `CREATE TRIGGER trg_owner_withdrawals_immutable_update
        BEFORE UPDATE ON owner_withdrawals
        BEGIN SELECT RAISE(ABORT, 'owner withdrawals are immutable'); END;`,
      `CREATE TRIGGER trg_owner_withdrawals_immutable_delete
        BEFORE DELETE ON owner_withdrawals
        BEGIN SELECT RAISE(ABORT, 'owner withdrawals are immutable'); END;`,
    ],
  },
  {
    version: 18,
    name: 'offline_sync_state',
    statements: [
      `CREATE TABLE sync_store_state (
        store_id TEXT PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
        device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE RESTRICT,
        status TEXT NOT NULL CHECK (status IN (
          'UNINITIALIZED', 'BOOTSTRAPPING', 'IDLE', 'RUNNING',
          'PAUSED_AUTH', 'ERROR_RETRYABLE'
        )),
        cursor_revision INTEGER NOT NULL DEFAULT 0 CHECK (cursor_revision >= 0),
        cursor_change_index INTEGER NOT NULL DEFAULT 0 CHECK (cursor_change_index >= 0),
        server_revision INTEGER NOT NULL DEFAULT 0 CHECK (server_revision >= 0),
        last_attempt_at TEXT NULL,
        last_success_at TEXT NULL,
        last_error_code TEXT NULL,
        last_error_message TEXT NULL,
        updated_at TEXT NOT NULL
      );`,
      `CREATE INDEX idx_sync_store_state_device ON sync_store_state(device_id);`,
      `CREATE TABLE sync_bootstrap_state (
        store_id TEXT PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
        device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE RESTRICT,
        bootstrap_id TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL CHECK (status IN ('IN_PROGRESS', 'COMMITTED', 'FAILED')),
        snapshot_revision INTEGER NULL CHECK (snapshot_revision IS NULL OR snapshot_revision >= 0),
        snapshot_cursor_revision INTEGER NOT NULL DEFAULT 0 CHECK (snapshot_cursor_revision >= 0),
        snapshot_cursor_change_index INTEGER NOT NULL DEFAULT 0 CHECK (snapshot_cursor_change_index >= 0),
        snapshot_after_entity_type TEXT NULL,
        snapshot_after_entity_id TEXT NULL,
        started_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_error_code TEXT NULL,
        last_error_message TEXT NULL
      );`,
      `CREATE TABLE sync_entity_versions (
        store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        server_version INTEGER NOT NULL CHECK (server_version >= 0),
        server_revision INTEGER NOT NULL CHECK (server_revision >= 0),
        updated_at TEXT NOT NULL,
        PRIMARY KEY (store_id, entity_type, entity_id)
      );`,
      `CREATE INDEX idx_sync_entity_versions_store_revision
        ON sync_entity_versions(store_id, server_revision);`,
      `CREATE TABLE sync_conflicts (
        id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        operation_id TEXT NOT NULL REFERENCES outbox_operations(operation_id) ON DELETE RESTRICT,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        conflict_type TEXT NOT NULL CHECK (conflict_type IN (
          'STALE_VERSION', 'IMMUTABLE_ID_REUSE', 'SERVER_REJECTED'
        )),
        local_payload TEXT NOT NULL,
        server_payload TEXT NULL,
        server_version INTEGER NULL CHECK (server_version IS NULL OR server_version >= 0),
        status TEXT NOT NULL CHECK (status IN ('OPEN', 'RESOLVED')),
        resolution TEXT NULL,
        created_at TEXT NOT NULL,
        resolved_at TEXT NULL
      );`,
      `CREATE UNIQUE INDEX idx_sync_conflicts_open_operation
        ON sync_conflicts(operation_id) WHERE status = 'OPEN';`,
      `CREATE INDEX idx_sync_conflicts_store_status
        ON sync_conflicts(store_id, status, created_at DESC);`,
      `ALTER TABLE outbox_operations ADD COLUMN lease_id TEXT NULL;`,
      `ALTER TABLE outbox_operations ADD COLUMN lease_expires_at TEXT NULL;`,
      `ALTER TABLE outbox_operations ADD COLUMN server_version INTEGER NULL CHECK (server_version IS NULL OR server_version >= 0);`,
      `ALTER TABLE outbox_operations ADD COLUMN server_revision INTEGER NULL CHECK (server_revision IS NULL OR server_revision >= 0);`,
      `ALTER TABLE outbox_operations ADD COLUMN synced_at TEXT NULL;`,
      `CREATE INDEX idx_outbox_sync_lease
        ON outbox_operations(store_id, status, next_attempt_at, lease_expires_at, created_at);`,
    ],
  },
  {
    version: 19,
    name: 'offline_sync_bootstrap_staging',
    statements: [
      `CREATE TABLE sync_bootstrap_entities (
        store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        bootstrap_id TEXT NOT NULL,
        snapshot_revision INTEGER NOT NULL CHECK (snapshot_revision >= 0),
        server_revision INTEGER NOT NULL CHECK (server_revision >= 0),
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        entity_version INTEGER NOT NULL CHECK (entity_version >= 0),
        payload TEXT NOT NULL,
        PRIMARY KEY (store_id, bootstrap_id, entity_type, entity_id),
        FOREIGN KEY (store_id) REFERENCES sync_bootstrap_state(store_id) ON DELETE CASCADE
      );`,
      `CREATE INDEX idx_sync_bootstrap_entities_order
        ON sync_bootstrap_entities(store_id, bootstrap_id, server_revision, entity_type, entity_id);`,
    ],
  },
  {
    version: 20,
    name: 'offline_sync_bootstrap_operation_history',
    statements: [
      `CREATE TABLE sync_bootstrap_operations (
        store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        bootstrap_id TEXT NOT NULL,
        snapshot_revision INTEGER NOT NULL CHECK (snapshot_revision >= 0),
        server_revision INTEGER NOT NULL CHECK (server_revision > 0),
        change_index INTEGER NOT NULL CHECK (change_index >= 0),
        operation_id TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        entity_version INTEGER NOT NULL CHECK (entity_version >= 0),
        payload TEXT NOT NULL,
        PRIMARY KEY (store_id, bootstrap_id, server_revision, change_index),
        UNIQUE (store_id, bootstrap_id, operation_id),
        FOREIGN KEY (store_id) REFERENCES sync_bootstrap_state(store_id) ON DELETE CASCADE
      );`,
      `UPDATE sync_bootstrap_state SET status = 'FAILED',
        last_error_code = 'BOOTSTRAP_PROTOCOL_UPGRADED'
        WHERE status = 'IN_PROGRESS';`,
      `UPDATE sync_store_state SET status = 'ERROR_RETRYABLE',
        last_error_code = 'BOOTSTRAP_PROTOCOL_UPGRADED'
        WHERE status = 'BOOTSTRAPPING';`,
    ],
  },
  {
    version: 21,
    name: 'offline_sync_conflict_server_revision',
    statements: [
      `ALTER TABLE sync_conflicts ADD COLUMN server_revision INTEGER NULL
        CHECK (server_revision IS NULL OR server_revision >= 0);`,
    ],
  },
  {
    version: 22,
    name: 'allow_concurrent_cost_movement_orders',
    statements: [
      'DROP TRIGGER trg_cost_movements_product_store_insert;',
      'DROP TRIGGER trg_cost_movements_source_insert;',
      'DROP TRIGGER trg_cost_movements_immutable_update;',
      'DROP TRIGGER trg_cost_movements_immutable_delete;',
      'DROP INDEX idx_cost_movements_store_product_order;',
      'DROP INDEX idx_cost_movements_source;',
      'ALTER TABLE cost_movements RENAME TO cost_movements_before_concurrent_order;',
      `CREATE TABLE cost_movements (
        id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
        store_product_id TEXT NOT NULL REFERENCES store_products(id) ON DELETE RESTRICT,
        movement_type TEXT NOT NULL CHECK (movement_type IN ('PURCHASE', 'SALE', 'ADJUSTMENT')),
        source_id TEXT NOT NULL,
        source_line_id TEXT NOT NULL,
        application_order INTEGER NOT NULL CHECK (application_order > 0),
        quantity_base_delta_micros INTEGER NOT NULL,
        costed_quantity_delta_micros INTEGER NOT NULL,
        value_numerator TEXT NOT NULL,
        value_denominator TEXT NOT NULL CHECK (value_denominator <> '0'),
        coverage_status TEXT NOT NULL CHECK (coverage_status IN ('KNOWN', 'UNKNOWN', 'UNAVAILABLE')),
        unit_cost_numerator TEXT,
        unit_cost_denominator TEXT,
        method TEXT NOT NULL DEFAULT 'MOVING_WEIGHTED_AVERAGE',
        method_version TEXT NOT NULL DEFAULT 'M4-MWA-1',
        created_at TEXT NOT NULL,
        UNIQUE (movement_type, source_line_id)
      );`,
      `INSERT INTO cost_movements
        (id, store_id, store_product_id, movement_type, source_id, source_line_id,
         application_order, quantity_base_delta_micros, costed_quantity_delta_micros,
         value_numerator, value_denominator, coverage_status, unit_cost_numerator,
         unit_cost_denominator, method, method_version, created_at)
       SELECT id, store_id, store_product_id, movement_type, source_id, source_line_id,
              application_order, quantity_base_delta_micros, costed_quantity_delta_micros,
              value_numerator, value_denominator, coverage_status, unit_cost_numerator,
              unit_cost_denominator, method, method_version, created_at
       FROM cost_movements_before_concurrent_order;`,
      'DROP TABLE cost_movements_before_concurrent_order;',
      'CREATE INDEX idx_cost_movements_store_product_order ON cost_movements(store_product_id, application_order, id);',
      'CREATE INDEX idx_cost_movements_source ON cost_movements(movement_type, source_id);',
      `CREATE TRIGGER trg_cost_movements_product_store_insert
        BEFORE INSERT ON cost_movements
        WHEN NOT EXISTS (
          SELECT 1 FROM store_products sp
          WHERE sp.id = NEW.store_product_id AND sp.store_id = NEW.store_id
        )
        BEGIN SELECT RAISE(ABORT, 'cost movement product does not belong to store'); END;`,
      `CREATE TRIGGER trg_cost_movements_source_insert
        BEFORE INSERT ON cost_movements
        WHEN (NEW.movement_type = 'PURCHASE' AND NOT EXISTS (
          SELECT 1 FROM purchase_items pi
          JOIN purchases p ON p.id = pi.purchase_id
          WHERE pi.id = NEW.source_line_id AND p.id = NEW.source_id
            AND pi.store_id = NEW.store_id AND pi.store_product_id = NEW.store_product_id
        ))
        OR (NEW.movement_type = 'SALE' AND NOT EXISTS (
          SELECT 1 FROM sale_items si
          JOIN sales s ON s.id = si.sale_id
          WHERE si.id = NEW.source_line_id AND s.id = NEW.source_id
            AND si.store_product_id = NEW.store_product_id AND s.store_id = NEW.store_id
        ))
        OR (NEW.movement_type = 'ADJUSTMENT' AND NOT EXISTS (
          SELECT 1 FROM inventory_adjustment_lines ial
          JOIN inventory_adjustments ia ON ia.id = ial.adjustment_id
          WHERE ial.id = NEW.source_line_id AND ia.id = NEW.source_id
            AND ial.store_id = NEW.store_id AND ial.store_product_id = NEW.store_product_id
        ))
        BEGIN SELECT RAISE(ABORT, 'cost movement source does not match product and store'); END;`,
      `CREATE TRIGGER trg_cost_movements_immutable_update
        BEFORE UPDATE ON cost_movements
        BEGIN SELECT RAISE(ABORT, 'cost movements are append-only'); END;`,
      `CREATE TRIGGER trg_cost_movements_immutable_delete
        BEFORE DELETE ON cost_movements
        BEGIN SELECT RAISE(ABORT, 'cost movements are append-only'); END;`,
    ],
  },
  {
    version: 23,
    name: 'offline_sync_later_device_restore_staging',
    statements: [
      `CREATE TABLE sync_bootstrap_restore_state (
        store_id TEXT PRIMARY KEY,
        device_id TEXT NOT NULL,
        bootstrap_id TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL CHECK (status IN ('IN_PROGRESS', 'COMMITTED', 'FAILED')),
        reference_context TEXT NOT NULL,
        snapshot_revision INTEGER NOT NULL CHECK (snapshot_revision >= 0),
        snapshot_cursor_revision INTEGER NOT NULL DEFAULT 0 CHECK (snapshot_cursor_revision >= 0),
        snapshot_cursor_change_index INTEGER NOT NULL DEFAULT 0 CHECK (snapshot_cursor_change_index >= 0),
        started_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_error_code TEXT NULL,
        last_error_message TEXT NULL
      );`,
      `CREATE TABLE sync_bootstrap_restore_operations (
        store_id TEXT NOT NULL,
        bootstrap_id TEXT NOT NULL,
        snapshot_revision INTEGER NOT NULL CHECK (snapshot_revision >= 0),
        server_revision INTEGER NOT NULL CHECK (server_revision > 0),
        change_index INTEGER NOT NULL CHECK (change_index >= 0),
        operation_id TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        entity_version INTEGER NOT NULL CHECK (entity_version >= 0),
        payload TEXT NOT NULL,
        PRIMARY KEY (store_id, bootstrap_id, server_revision, change_index),
        UNIQUE (store_id, bootstrap_id, operation_id),
        FOREIGN KEY (store_id) REFERENCES sync_bootstrap_restore_state(store_id) ON DELETE CASCADE
      );`,
      `CREATE INDEX idx_sync_bootstrap_restore_operations_order
        ON sync_bootstrap_restore_operations(store_id, bootstrap_id, server_revision, change_index);`,
      `UPDATE sync_bootstrap_state SET status = 'FAILED', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
        last_error_code = 'D045_RESTART_REQUIRED',
        last_error_message = 'Bootstrap will restart with an authoritative reference context.'
        WHERE status = 'IN_PROGRESS';`,
      `UPDATE sync_store_state SET status = 'ERROR_RETRYABLE', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
        last_error_code = 'D045_RESTART_REQUIRED',
        last_error_message = 'Bootstrap will restart with an authoritative reference context.'
        WHERE status = 'BOOTSTRAPPING';`,
    ],
  },
];

export const CURRENT_SCHEMA_VERSION = MIGRATIONS.length;

function validateRegistry(migrations: readonly Migration[]): void {
  migrations.forEach((migration, index) => {
    const expectedVersion = index + 1;
    if (
      migration.version !== expectedVersion ||
      typeof migration.name !== 'string' ||
      migration.name.length === 0 ||
      !Array.isArray(migration.statements) ||
      migration.statements.length === 0
    ) {
      throw new DatabaseError(
        'INVALID_MIGRATION_REGISTRY',
        `Migration registry is invalid at position ${index}: expected version ${expectedVersion} with a name and at least one statement.`,
      );
    }
  });
}

function readPragma(adapter: DatabaseAdapter, name: string): string | number | null {
  const row = adapter.getFirstRow<Record<string, string | number | null>>(`PRAGMA ${name}`);
  if (!row) {
    return null;
  }
  const value = row[name];
  return value ?? null;
}

/**
 * Bring a database to the registry version. Safe to call on every launch:
 * applied migrations are recorded in schema_migrations and never rerun.
 * A failing migration rolls back completely, keeps the prior version and
 * data, and throws a diagnosable error. The database is never reset.
 */
export function openDatabase(
  adapter: DatabaseAdapter,
  migrations: readonly Migration[] = MIGRATIONS,
): OpenDatabaseReport {
  validateRegistry(migrations);

  adapter.exec('PRAGMA foreign_keys = ON;');
  adapter.exec('PRAGMA journal_mode = WAL;');

  adapter.exec(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );`,
  );

  const applied = adapter.getAllRows<{ version: number; name: string }>(
    'SELECT version, name FROM schema_migrations ORDER BY version ASC;',
  );

  if (applied.length > migrations.length) {
    throw new DatabaseError(
      'UNEXPECTED_SCHEMA_VERSION',
      `Database holds ${applied.length} applied migrations but only ${migrations.length} are registered. Update the app instead of resetting data.`,
    );
  }

  // The applied history must be an exact contiguous prefix of the registry:
  // same versions in order with matching names. Anything else (a fabricated
  // version record, a gap, or a renamed entry) means this database was not
  // produced by these migrations, so applying more on top would corrupt it.
  applied.forEach((row, index) => {
    const expected = migrations[index];
    if (row.version !== expected.version || row.name !== expected.name) {
      throw new DatabaseError(
        'MIGRATION_HISTORY_MISMATCH',
        `Local migration history is not a prefix of the registered migrations at position ${index}: ` +
          `found version ${row.version} (${row.name}), expected version ${expected.version} (${expected.name}). ` +
          `Update the app instead of resetting data.`,
      );
    }
  });
  const appliedVersion = applied.length;

  for (const migration of migrations.slice(appliedVersion)) {
    try {
      adapter.transaction(() => {
        for (const statement of migration.statements) {
          adapter.exec(statement);
        }
        adapter.run('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?);', [
          migration.version,
          migration.name,
          new Date().toISOString(),
        ]);
      });
    } catch (error) {
      throw new DatabaseError(
        'MIGRATION_FAILED',
        `Migration ${migration.version} (${migration.name}) failed and was rolled back; schema remains at version ${appliedVersion}.`,
        error,
      );
    }
  }

  const foreignKeys = readPragma(adapter, 'foreign_keys');
  const journalMode = readPragma(adapter, 'journal_mode');
  return {
    schemaVersion: migrations.length,
    foreignKeysEnforced: foreignKeys === 1,
    journalMode: typeof journalMode === 'string' ? journalMode : String(journalMode),
  };
}
