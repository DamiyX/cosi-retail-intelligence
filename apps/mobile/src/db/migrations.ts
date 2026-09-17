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
