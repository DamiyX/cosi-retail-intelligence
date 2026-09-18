import { DomainError, MICROS_PER_UNIT } from '@retail/domain';

import { createCatalogueClient } from '../src/catalogue/client';
import { createTemporaryProduct } from '../src/catalogue/createTemporaryProduct';
import { updateProductIdentity } from '../src/catalogue/updateProductIdentity';
import { CURRENT_SCHEMA_VERSION, MIGRATIONS, openDatabase } from '../src/db';
import type { DatabaseAdapter } from '../src/db/adapter';
import {
  createCustomerAccount,
  createPackageUnit,
  createStore,
  createStoreMember,
  createUser,
  getCashReceivedTotalByStore,
  getTotalSalesValueByStore,
} from '../src/db/repositories';
import { createDatabaseSalesClient } from '../src/sales/client';
import { openIsolatedDatabase } from '../src/db/testing';
import { completeSale, getProductStock, getSaleDetail, listRecentSales } from '../src/sales';
import { provisionStoreContext } from '../src/storeContext/provisionStoreContext';
import {
  countRows,
  deterministicIds,
  FailOnWriteAdapter,
  openCatalogueFixture,
  reopenDatabase,
  testId,
} from './catalogueSupport';

function expectDomainError(fn: () => unknown, code: DomainError['code']): void {
  try {
    fn();
    throw new Error('Expected a DomainError but none was thrown.');
  } catch (error) {
    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe(code);
  }
}

const SALE_GRAPH_TABLES = [
  'sales',
  'sale_items',
  'payments',
  'inventory_events',
  'customer_accounts',
  'receivables',
  'outbox_operations',
] as const;

function saleGraphCounts(adapter: DatabaseAdapter): number[] {
  return SALE_GRAPH_TABLES.map((table) => countRows(adapter, table));
}

describe('M3 Sales milestone', () => {
  describe('Migration 3: sales_and_inventory', () => {
    it('migrates a fresh database to version 3 with empty sales and inventory tables', () => {
      const isolated = openIsolatedDatabase(MIGRATIONS);
      try {
        expect(isolated.report.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
        for (const table of [
          'sales',
          'sale_items',
          'payments',
          'inventory_events',
          'customer_accounts',
          'receivables',
        ]) {
          expect(countRows(isolated.adapter, table)).toBe(0);
        }
      } finally {
        isolated.closeAndDelete();
      }
    });

    it('upgrades a populated M2 database without reset, loss, or false history', () => {
      const isolated = openIsolatedDatabase(MIGRATIONS.slice(0, 2));
      try {
        const fixture = provisionStoreContext(
          isolated.adapter,
          {
            ownerDisplayName: 'Adaeze O.',
            storeName: 'Adaeze Provisions',
            currencyCode: 'NGN',
            countryCode: 'NG',
            timezone: 'Africa/Lagos',
            appVersion: '0.0.1',
          },
          { generateId: deterministicIds(100) },
        );

        createTemporaryProduct(
          isolated.adapter,
          {
            storeId: fixture.store.id,
            deviceId: fixture.device.id,
            name: 'Peak Milk Sachet',
          },
          { generateId: deterministicIds(200) },
        );

        expect(countRows(isolated.adapter, 'store_products')).toBe(1);
        expect(countRows(isolated.adapter, 'outbox_operations')).toBe(1);

        isolated.adapter.close();

        const reopened = reopenDatabase(isolated.path);
        try {
          const report = openDatabase(reopened, MIGRATIONS);
          expect(report.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
          expect(countRows(reopened, 'stores')).toBe(1);
          expect(countRows(reopened, 'store_products')).toBe(1);
          expect(countRows(reopened, 'outbox_operations')).toBe(1);
          expect(countRows(reopened, 'sales')).toBe(0);

          const history = reopened.getAllRows<{ version: number; name: string }>(
            'SELECT version, name FROM schema_migrations ORDER BY version ASC;',
          );
          expect(history).toEqual([
            { version: 1, name: 'store_context' },
            { version: 2, name: 'catalogue' },
            { version: 3, name: 'sales_and_inventory' },
            { version: 4, name: 'restocking_costing' },
            { version: 5, name: 'sale_cost_snapshot_invariants' },
            { version: 6, name: 'sale_cost_snapshot_parent_invariants' },
            { version: 7, name: 'batch_inventory_tracking' },
            { version: 8, name: 'inventory_adjustments_and_cost_extension' },
            { version: 9, name: 'inventory_reconciliation_checks' },
          ]);
        } finally {
          reopened.close();
        }
      } finally {
        isolated.closeAndDelete();
      }
    });
  });

  describe('Ticket M3-01: Complete one cash sale offline', () => {
    it('completes one cash sale offline with exact snapshots, negative inventory event, and outbox envelope', () => {
      const fixture = openCatalogueFixture();
      try {
        const prod = createTemporaryProduct(
          fixture.adapter,
          {
            storeId: fixture.context.store.id,
            deviceId: fixture.context.device.id,
            name: 'Golden Penny Semovita 1kg',
          },
          { generateId: deterministicIds(300) },
        );

        const saleResult = completeSale(
          fixture.adapter,
          {
            storeId: fixture.context.store.id,
            deviceId: fixture.context.device.id,
            userId: fixture.context.owner.id,
            lines: [
              {
                storeProductId: prod.storeProduct.id,
                packageUnitId: prod.basePackage.id,
                quantityPackagesMicros: 2 * MICROS_PER_UNIT, // 2 units
                unitPriceMinor: 150000, // ₦1,500.00 each
                discountAmountMinor: 0,
              },
            ],
            payment: {
              method: 'CASH',
            },
            note: 'Walk-in customer',
          },
          { generateId: deterministicIds(400), operationId: testId(999) },
        );

        // Verify sale row
        expect(saleResult.sale.storeId).toBe(fixture.context.store.id);
        expect(saleResult.sale.deviceId).toBe(fixture.context.device.id);
        expect(saleResult.sale.createdByUserId).toBe(fixture.context.owner.id);
        expect(saleResult.sale.currencyCode).toBe('NGN');
        expect(saleResult.sale.subtotalMinor).toBe(300000);
        expect(saleResult.sale.discountTotalMinor).toBe(0);
        expect(saleResult.sale.totalMinor).toBe(300000);
        expect(saleResult.sale.status).toBe('COMPLETED');
        expect(saleResult.sale.note).toBe('Walk-in customer');

        // Verify sale item snapshots
        expect(saleResult.items).toHaveLength(1);
        const item = saleResult.items[0];
        expect(item.productNameSnapshot).toBe('Golden Penny Semovita 1kg');
        expect(item.packageNameSnapshot).toBe('piece');
        expect(item.quantityPackagesMicros).toBe(2_000_000);
        expect(item.conversionToBaseSnapshotMicros).toBe(MICROS_PER_UNIT);
        expect(item.quantityBaseMicros).toBe(2_000_000);
        expect(item.unitPriceMinor).toBe(150000);
        expect(item.grossTotalMinor).toBe(300000);
        expect(item.discountAmountMinor).toBe(0);
        expect(item.netTotalMinor).toBe(300000);
        expect(item.unitCostBaseSnapshotMinor).toBeNull();
        expect(item.cogsAmountMinor).toBeNull();

        // Verify payment
        expect(saleResult.payment.method).toBe('CASH');
        expect(saleResult.payment.amountMinor).toBe(300000);
        expect(saleResult.payment.currencyCode).toBe('NGN');
        expect(saleResult.payment.recordedByUserId).toBe(fixture.context.owner.id);

        // Verify inventory event
        expect(saleResult.inventoryEvents).toHaveLength(1);
        const invEvent = saleResult.inventoryEvents[0];
        expect(invEvent.eventType).toBe('SALE');
        expect(invEvent.quantityBaseDeltaMicros).toBe(-2_000_000);
        expect(invEvent.storeProductId).toBe(prod.storeProduct.id);
        expect(invEvent.sourceType).toBe('SALE');
        expect(invEvent.sourceId).toBe(saleResult.sale.id);

        // Reconstruct stock
        expect(getProductStock(fixture.adapter, prod.storeProduct.id)).toBe(-2_000_000);

        // Verify outbox
        expect(saleResult.outbox.operationType).toBe('COMPLETED_SALE_CREATED');
        expect(saleResult.outbox.entityType).toBe('SALE');
        expect(saleResult.outbox.entityId).toBe(saleResult.sale.id);
        expect(saleResult.outbox.status).toBe('PENDING');

        const envelope = JSON.parse(saleResult.outbox.payload);
        expect(envelope.operationType).toBe('COMPLETED_SALE_CREATED');
        expect(envelope.entities.sale.id).toBe(saleResult.sale.id);
        expect(envelope.entities.items).toHaveLength(1);
        expect(envelope.entities.payment.method).toBe('CASH');
        expect(envelope.entities.inventoryEvents).toHaveLength(1);

        // Row counts in database
        expect(countRows(fixture.adapter, 'sales')).toBe(1);
        expect(countRows(fixture.adapter, 'sale_items')).toBe(1);
        expect(countRows(fixture.adapter, 'payments')).toBe(1);
        expect(countRows(fixture.adapter, 'inventory_events')).toBe(1);
        expect(countRows(fixture.adapter, 'customer_accounts')).toBe(0);
        expect(countRows(fixture.adapter, 'receivables')).toBe(0);
      } finally {
        fixture.closeAndDelete();
      }
    });

    it('replaying the same operationId returns the original sale without duplicate effects', () => {
      const fixture = openCatalogueFixture();
      try {
        const prod = createTemporaryProduct(
          fixture.adapter,
          {
            storeId: fixture.context.store.id,
            deviceId: fixture.context.device.id,
            name: 'Milo 500g',
          },
          { generateId: deterministicIds(300) },
        );

        const opId = testId(888);

        const sale1 = completeSale(
          fixture.adapter,
          {
            storeId: fixture.context.store.id,
            deviceId: fixture.context.device.id,
            userId: fixture.context.owner.id,
            lines: [
              {
                storeProductId: prod.storeProduct.id,
                packageUnitId: prod.basePackage.id,
                quantityPackagesMicros: 1 * MICROS_PER_UNIT,
                unitPriceMinor: 250000,
              },
            ],
            payment: { method: 'CASH' },
          },
          { generateId: deterministicIds(400), operationId: opId },
        );

        const sale2 = completeSale(
          fixture.adapter,
          {
            storeId: fixture.context.store.id,
            deviceId: fixture.context.device.id,
            userId: fixture.context.owner.id,
            lines: [
              {
                storeProductId: prod.storeProduct.id,
                packageUnitId: prod.basePackage.id,
                quantityPackagesMicros: 1 * MICROS_PER_UNIT,
                unitPriceMinor: 250000,
              },
            ],
            payment: { method: 'CASH' },
          },
          { generateId: deterministicIds(500), operationId: opId },
        );

        expect(sale2.sale.id).toBe(sale1.sale.id);
        expect(sale2.sale.totalMinor).toBe(sale1.sale.totalMinor);
        expect(sale2.items[0].id).toBe(sale1.items[0].id);
        expect(sale2.payment.id).toBe(sale1.payment.id);

        // Crucial: no duplicate rows in database!
        expect(countRows(fixture.adapter, 'sales')).toBe(1);
        expect(countRows(fixture.adapter, 'sale_items')).toBe(1);
        expect(countRows(fixture.adapter, 'payments')).toBe(1);
        expect(countRows(fixture.adapter, 'inventory_events')).toBe(1);
        expect(getProductStock(fixture.adapter, prod.storeProduct.id)).toBe(-1_000_000);
      } finally {
        fixture.closeAndDelete();
      }
    });

    it('rejects conflicting same-device sale replay instead of returning a different request', () => {
      const fixture = openCatalogueFixture();
      try {
        const prod = createTemporaryProduct(
          fixture.adapter,
          {
            storeId: fixture.context.store.id,
            deviceId: fixture.context.device.id,
            name: 'Conflicting replay item',
          },
          { generateId: deterministicIds(560) },
        );
        const operationId = testId(889);
        const original = {
          storeId: fixture.context.store.id,
          deviceId: fixture.context.device.id,
          userId: fixture.context.owner.id,
          lines: [{
            storeProductId: prod.storeProduct.id,
            packageUnitId: prod.basePackage.id,
            quantityPackagesMicros: MICROS_PER_UNIT,
            unitPriceMinor: 250000,
          }],
          payment: { method: 'CASH' as const },
        };
        const first = completeSale(fixture.adapter, original, {
          generateId: deterministicIds(570),
          operationId,
        });
        const counts = saleGraphCounts(fixture.adapter);
        expect(() => completeSale(fixture.adapter, {
          ...original,
          lines: [{ ...original.lines[0], unitPriceMinor: 260000 }],
        }, { operationId })).toThrow(DomainError);
        expect(saleGraphCounts(fixture.adapter)).toEqual(counts);
        expect(getSaleDetail(fixture.adapter, first.sale.id)?.sale.totalMinor).toBe(250000);
      } finally {
        fixture.closeAndDelete();
      }
    });

    it('does not treat an operation ID as permission for another active member to read a replay', () => {
      const fixture = openCatalogueFixture();
      try {
        const prod = createTemporaryProduct(
          fixture.adapter,
          {
            storeId: fixture.context.store.id,
            deviceId: fixture.context.device.id,
            name: 'Actor-bound replay item',
          },
          { generateId: deterministicIds(300) },
        );
        const otherUser = createUser(fixture.adapter, {
          id: testId(710),
          displayName: 'Second Cashier',
        });
        createStoreMember(fixture.adapter, {
          id: testId(711),
          storeId: fixture.context.store.id,
          userId: otherUser.id,
          role: 'STAFF',
        });
        const operationId = testId(712);

        completeSale(
          fixture.adapter,
          {
            storeId: fixture.context.store.id,
            deviceId: fixture.context.device.id,
            userId: fixture.context.owner.id,
            lines: [
              {
                storeProductId: prod.storeProduct.id,
                packageUnitId: prod.basePackage.id,
                quantityPackagesMicros: MICROS_PER_UNIT,
                unitPriceMinor: 10_000,
              },
            ],
            payment: { method: 'CASH' },
          },
          { generateId: deterministicIds(400), operationId },
        );

        expectDomainError(
          () =>
            completeSale(
              fixture.adapter,
              {
                storeId: fixture.context.store.id,
                deviceId: fixture.context.device.id,
                userId: otherUser.id,
                lines: [
                  {
                    storeProductId: prod.storeProduct.id,
                    packageUnitId: prod.basePackage.id,
                    quantityPackagesMicros: MICROS_PER_UNIT,
                    unitPriceMinor: 10_000,
                  },
                ],
                payment: { method: 'CASH' },
              },
              { generateId: deterministicIds(500), operationId },
            ),
          'INVALID_VALUE',
        );
        expect(countRows(fixture.adapter, 'sales')).toBe(1);
      } finally {
        fixture.closeAndDelete();
      }
    });

    it('enforces one exact tender and immutable completed transaction records at the SQLite boundary', () => {
      const fixture = openCatalogueFixture();
      try {
        const prod = createTemporaryProduct(
          fixture.adapter,
          {
            storeId: fixture.context.store.id,
            deviceId: fixture.context.device.id,
            name: 'SQLite boundary item',
          },
          { generateId: deterministicIds(300) },
        );
        const completed = completeSale(
          fixture.adapter,
          {
            storeId: fixture.context.store.id,
            deviceId: fixture.context.device.id,
            userId: fixture.context.owner.id,
            lines: [
              {
                storeProductId: prod.storeProduct.id,
                packageUnitId: prod.basePackage.id,
                quantityPackagesMicros: MICROS_PER_UNIT,
                unitPriceMinor: 10_000,
              },
            ],
            payment: { method: 'CASH' },
          },
          { generateId: deterministicIds(400) },
        );

        expect(() =>
          fixture.adapter.run(
            `INSERT INTO payments
              (id, sale_id, method, amount_minor, currency_code, recorded_by_user_id, payment_reference, created_at)
             VALUES (?, ?, 'CASH', ?, 'NGN', ?, NULL, ?);`,
            [testId(720), completed.sale.id, completed.sale.totalMinor - 1, fixture.context.owner.id, completed.sale.createdAt],
          ),
        ).toThrow(/payment amount must equal completed sale total/);
        expect(() =>
          fixture.adapter.run(
            `INSERT INTO payments
              (id, sale_id, method, amount_minor, currency_code, recorded_by_user_id, payment_reference, created_at)
             VALUES (?, ?, 'CASH', ?, 'NGN', ?, NULL, ?);`,
            [testId(721), completed.sale.id, completed.sale.totalMinor, fixture.context.owner.id, completed.sale.createdAt],
          ),
        ).toThrow(/UNIQUE constraint failed: payments.sale_id/);
        expect(() =>
          fixture.adapter.run(
            `UPDATE sale_items SET net_total_minor = 0 WHERE id = ?;`,
            [completed.items[0].id],
          ),
        ).toThrow(/completed sale items are immutable/);
        expect(() =>
          fixture.adapter.run(`UPDATE sales SET total_minor = 0 WHERE id = ?;`, [completed.sale.id]),
        ).toThrow(/completed sales are immutable/);
        expect(() =>
          fixture.adapter.run(
            `UPDATE inventory_events SET quantity_base_delta_micros = 0 WHERE id = ?;`,
            [completed.inventoryEvents[0].id],
          ),
        ).toThrow(/inventory events are append-only/);
      } finally {
        fixture.closeAndDelete();
      }
    });

    it('rejects reusing an existing operationId across another store or device', () => {
      const fixture = openCatalogueFixture();
      try {
        const prod = createTemporaryProduct(
          fixture.adapter,
          {
            storeId: fixture.context.store.id,
            deviceId: fixture.context.device.id,
            name: 'Indomie Super Pack',
          },
          { generateId: deterministicIds(300) },
        );

        const opId = testId(777);

        completeSale(
          fixture.adapter,
          {
            storeId: fixture.context.store.id,
            deviceId: fixture.context.device.id,
            userId: fixture.context.owner.id,
            lines: [
              {
                storeProductId: prod.storeProduct.id,
                packageUnitId: prod.basePackage.id,
                quantityPackagesMicros: 1 * MICROS_PER_UNIT,
                unitPriceMinor: 50000,
              },
            ],
            payment: { method: 'CASH' },
          },
          { generateId: deterministicIds(400), operationId: opId },
        );

        // Different device reusing opId
        expectDomainError(
          () =>
            completeSale(
              fixture.adapter,
              {
                storeId: fixture.context.store.id,
                deviceId: testId(999), // different device
                userId: fixture.context.owner.id,
                lines: [
                  {
                    storeProductId: prod.storeProduct.id,
                    packageUnitId: prod.basePackage.id,
                    quantityPackagesMicros: 1 * MICROS_PER_UNIT,
                    unitPriceMinor: 50000,
                  },
                ],
                payment: { method: 'CASH' },
              },
              { generateId: deterministicIds(500), operationId: opId },
            ),
          'INVALID_VALUE',
        );
      } finally {
        fixture.closeAndDelete();
      }
    });

    it('rolls back completely when a write fails at any boundary', () => {
      // Test fail on write 1 (sale insert), write 2 (item insert), write 3 (payment insert), write 4 (inv event), write 5 (outbox)
      for (const failOnWrite of [1, 2, 3, 4, 5]) {
        const fixture = openCatalogueFixture();
        try {
          const prod = createTemporaryProduct(
            fixture.adapter,
            {
              storeId: fixture.context.store.id,
              deviceId: fixture.context.device.id,
              name: 'Rollback Test Item',
            },
            { generateId: deterministicIds(300) },
          );

          const initialSales = countRows(fixture.adapter, 'sales');
          const initialItems = countRows(fixture.adapter, 'sale_items');
          const initialPayments = countRows(fixture.adapter, 'payments');
          const initialInvEvents = countRows(fixture.adapter, 'inventory_events');
          const initialOutbox = countRows(fixture.adapter, 'outbox_operations');

          const failingAdapter = new FailOnWriteAdapter(
            fixture.adapter,
            failOnWrite,
            new Error(`Injected failure at write ${failOnWrite}`),
          );

          expect(() =>
            completeSale(
              failingAdapter,
              {
                storeId: fixture.context.store.id,
                deviceId: fixture.context.device.id,
                userId: fixture.context.owner.id,
                lines: [
                  {
                    storeProductId: prod.storeProduct.id,
                    packageUnitId: prod.basePackage.id,
                    quantityPackagesMicros: 1 * MICROS_PER_UNIT,
                    unitPriceMinor: 10000,
                  },
                ],
                payment: { method: 'CASH' },
              },
              { generateId: deterministicIds(400) },
            ),
          ).toThrow(`Injected failure at write ${failOnWrite}`);

          // None of the writes leaked!
          expect(countRows(fixture.adapter, 'sales')).toBe(initialSales);
          expect(countRows(fixture.adapter, 'sale_items')).toBe(initialItems);
          expect(countRows(fixture.adapter, 'payments')).toBe(initialPayments);
          expect(countRows(fixture.adapter, 'inventory_events')).toBe(initialInvEvents);
          expect(countRows(fixture.adapter, 'outbox_operations')).toBe(initialOutbox);
          expect(getProductStock(fixture.adapter, prod.storeProduct.id)).toBe(0);
        } finally {
          fixture.closeAndDelete();
        }
      }
    });

    it('rolls back every credit write for a new customer and receivable', () => {
      // New-credit writes: customer, sale, item, payment, receivable, inventory, outbox.
      for (const failOnWrite of [1, 2, 3, 4, 5, 6, 7]) {
        const fixture = openCatalogueFixture();
        try {
          const product = createTemporaryProduct(
            fixture.adapter,
            {
              storeId: fixture.context.store.id,
              deviceId: fixture.context.device.id,
              name: 'Credit rollback item',
            },
            { generateId: deterministicIds(300) },
          );
          const before = saleGraphCounts(fixture.adapter);
          const failingAdapter = new FailOnWriteAdapter(
            fixture.adapter,
            failOnWrite,
            new Error(`Injected credit failure at write ${failOnWrite}`),
          );

          expect(() =>
            completeSale(
              failingAdapter,
              {
                storeId: fixture.context.store.id,
                deviceId: fixture.context.device.id,
                userId: fixture.context.owner.id,
                lines: [
                  {
                    storeProductId: product.storeProduct.id,
                    packageUnitId: product.basePackage.id,
                    quantityPackagesMicros: MICROS_PER_UNIT,
                    unitPriceMinor: 10_000,
                  },
                ],
                payment: { method: 'CREDIT', customerName: 'New credit customer' },
              },
              { generateId: deterministicIds(400), operationId: testId(8_000 + failOnWrite) },
            ),
          ).toThrow(`Injected credit failure at write ${failOnWrite}`);

          expect(saleGraphCounts(fixture.adapter)).toEqual(before);
          expect(getProductStock(fixture.adapter, product.storeProduct.id)).toBe(0);
        } finally {
          fixture.closeAndDelete();
        }
      }
    });

    it('rolls back every selected-customer credit write without mutating that account', () => {
      // Selected-credit writes: sale, item, payment, receivable, inventory, outbox.
      for (const failOnWrite of [1, 2, 3, 4, 5, 6]) {
        const fixture = openCatalogueFixture();
        try {
          const product = createTemporaryProduct(
            fixture.adapter,
            {
              storeId: fixture.context.store.id,
              deviceId: fixture.context.device.id,
              name: 'Selected credit rollback item',
            },
            { generateId: deterministicIds(300) },
          );
          const account = createCustomerAccount(fixture.adapter, {
            id: testId(8_100),
            storeId: fixture.context.store.id,
            name: 'Selected customer',
          });
          const before = saleGraphCounts(fixture.adapter);
          const failingAdapter = new FailOnWriteAdapter(
            fixture.adapter,
            failOnWrite,
            new Error(`Injected selected credit failure at write ${failOnWrite}`),
          );

          expect(() =>
            completeSale(
              failingAdapter,
              {
                storeId: fixture.context.store.id,
                deviceId: fixture.context.device.id,
                userId: fixture.context.owner.id,
                lines: [
                  {
                    storeProductId: product.storeProduct.id,
                    packageUnitId: product.basePackage.id,
                    quantityPackagesMicros: MICROS_PER_UNIT,
                    unitPriceMinor: 10_000,
                  },
                ],
                payment: {
                  method: 'CREDIT',
                  customerName: account.name,
                  customerAccountId: account.id,
                },
              },
              { generateId: deterministicIds(400), operationId: testId(8_100 + failOnWrite) },
            ),
          ).toThrow(`Injected selected credit failure at write ${failOnWrite}`);

          expect(saleGraphCounts(fixture.adapter)).toEqual(before);
          expect(
            fixture.adapter.getFirstRow<{ name: string }>('SELECT name FROM customer_accounts WHERE id = ?;', [
              account.id,
            ]),
          ).toEqual({ name: 'Selected customer' });
          expect(getProductStock(fixture.adapter, product.storeProduct.id)).toBe(0);
        } finally {
          fixture.closeAndDelete();
        }
      }
    });

    it('rolls back every multiline aggregate write without leaking a child or envelope', () => {
      // Multiline cash writes: sale, two items, payment, two inventory events, outbox.
      for (const failOnWrite of [1, 2, 3, 4, 5, 6, 7]) {
        const fixture = openCatalogueFixture();
        try {
          const first = createTemporaryProduct(
            fixture.adapter,
            {
              storeId: fixture.context.store.id,
              deviceId: fixture.context.device.id,
              name: 'Multiline first item',
            },
            { generateId: deterministicIds(300) },
          );
          const second = createTemporaryProduct(
            fixture.adapter,
            {
              storeId: fixture.context.store.id,
              deviceId: fixture.context.device.id,
              name: 'Multiline second item',
            },
            { generateId: deterministicIds(350) },
          );
          const before = saleGraphCounts(fixture.adapter);
          const failingAdapter = new FailOnWriteAdapter(
            fixture.adapter,
            failOnWrite,
            new Error(`Injected multiline failure at write ${failOnWrite}`),
          );

          expect(() =>
            completeSale(
              failingAdapter,
              {
                storeId: fixture.context.store.id,
                deviceId: fixture.context.device.id,
                userId: fixture.context.owner.id,
                lines: [
                  {
                    storeProductId: first.storeProduct.id,
                    packageUnitId: first.basePackage.id,
                    quantityPackagesMicros: MICROS_PER_UNIT,
                    unitPriceMinor: 10_000,
                  },
                  {
                    storeProductId: second.storeProduct.id,
                    packageUnitId: second.basePackage.id,
                    quantityPackagesMicros: MICROS_PER_UNIT,
                    unitPriceMinor: 20_000,
                  },
                ],
                payment: { method: 'CASH' },
              },
              { generateId: deterministicIds(400), operationId: testId(8_200 + failOnWrite) },
            ),
          ).toThrow(`Injected multiline failure at write ${failOnWrite}`);

          expect(saleGraphCounts(fixture.adapter)).toEqual(before);
          expect(getProductStock(fixture.adapter, first.storeProduct.id)).toBe(0);
          expect(getProductStock(fixture.adapter, second.storeProduct.id)).toBe(0);
        } finally {
          fixture.closeAndDelete();
        }
      }
    });

    it('replays a credit operation without duplicating a customer, receivable, inventory, or outbox effect', () => {
      const fixture = openCatalogueFixture();
      try {
        const first = createTemporaryProduct(
          fixture.adapter,
          {
            storeId: fixture.context.store.id,
            deviceId: fixture.context.device.id,
            name: 'Credit replay first item',
          },
          { generateId: deterministicIds(300) },
        );
        const second = createTemporaryProduct(
          fixture.adapter,
          {
            storeId: fixture.context.store.id,
            deviceId: fixture.context.device.id,
            name: 'Credit replay second item',
          },
          { generateId: deterministicIds(350) },
        );
        const operationId = testId(8_300);
        const input = {
          storeId: fixture.context.store.id,
          deviceId: fixture.context.device.id,
          userId: fixture.context.owner.id,
          lines: [
            {
              storeProductId: first.storeProduct.id,
              packageUnitId: first.basePackage.id,
              quantityPackagesMicros: MICROS_PER_UNIT,
              unitPriceMinor: 10_000,
            },
            {
              storeProductId: second.storeProduct.id,
              packageUnitId: second.basePackage.id,
              quantityPackagesMicros: MICROS_PER_UNIT,
              unitPriceMinor: 20_000,
            },
          ],
          payment: { method: 'CREDIT' as const, customerName: 'Replay credit customer' },
        };

        const firstCompletion = completeSale(fixture.adapter, input, {
          generateId: deterministicIds(400),
          operationId,
        });
        const countsAfterFirst = saleGraphCounts(fixture.adapter);
        const replay = completeSale(fixture.adapter, input, {
          generateId: deterministicIds(500),
          operationId,
        });

        expect(replay.sale.id).toBe(firstCompletion.sale.id);
        expect(replay.customerAccount?.id).toBe(firstCompletion.customerAccount?.id);
        expect(replay.receivable?.id).toBe(firstCompletion.receivable?.id);
        expect(saleGraphCounts(fixture.adapter)).toEqual(countsAfterFirst);
        expect(countRows(fixture.adapter, 'customer_accounts')).toBe(1);
        expect(countRows(fixture.adapter, 'receivables')).toBe(1);
        expect(countRows(fixture.adapter, 'inventory_events')).toBe(2);
      } finally {
        fixture.closeAndDelete();
      }
    });

    it('rejects inactive or non-sellable packages', () => {
      const fixture = openCatalogueFixture();
      try {
        const prod = createTemporaryProduct(
          fixture.adapter,
          {
            storeId: fixture.context.store.id,
            deviceId: fixture.context.device.id,
            name: 'Carton Test Product',
          },
          { generateId: deterministicIds(300) },
        );

        // Add a non-sellable package (e.g. bulk storage container)
        const nonSellablePkg = createPackageUnit(fixture.adapter, {
          id: testId(601),
          productVariantId: prod.variant.id,
          name: 'Storage Crate',
          conversionToBaseMicros: 100 * MICROS_PER_UNIT,
          isBaseUnit: false,
          isSellable: false,
        });

        expectDomainError(
          () =>
            completeSale(fixture.adapter, {
              storeId: fixture.context.store.id,
              deviceId: fixture.context.device.id,
              userId: fixture.context.owner.id,
              lines: [
                {
                  storeProductId: prod.storeProduct.id,
                  packageUnitId: nonSellablePkg.id,
                  quantityPackagesMicros: 1 * MICROS_PER_UNIT,
                  unitPriceMinor: 50000,
                },
              ],
              payment: { method: 'CASH' },
            }),
          'INVALID_VALUE',
        );
      } finally {
        fixture.closeAndDelete();
      }
    });

    it('rejects cross-store or invalid user/device/currency', () => {
      const fixture = openCatalogueFixture();
      try {
        const prod = createTemporaryProduct(
          fixture.adapter,
          {
            storeId: fixture.context.store.id,
            deviceId: fixture.context.device.id,
            name: 'Store Test Item',
          },
          { generateId: deterministicIds(300) },
        );

        // Non-existent user
        expectDomainError(
          () =>
            completeSale(fixture.adapter, {
              storeId: fixture.context.store.id,
              deviceId: fixture.context.device.id,
              userId: testId(999),
              lines: [
                {
                  storeProductId: prod.storeProduct.id,
                  packageUnitId: prod.basePackage.id,
                  quantityPackagesMicros: 1 * MICROS_PER_UNIT,
                  unitPriceMinor: 10000,
                },
              ],
              payment: { method: 'CASH' },
            }),
          'INVALID_VALUE',
        );

        // Non-existent device
        expectDomainError(
          () =>
            completeSale(fixture.adapter, {
              storeId: fixture.context.store.id,
              deviceId: testId(998),
              userId: fixture.context.owner.id,
              lines: [
                {
                  storeProductId: prod.storeProduct.id,
                  packageUnitId: prod.basePackage.id,
                  quantityPackagesMicros: 1 * MICROS_PER_UNIT,
                  unitPriceMinor: 10000,
                },
              ],
              payment: { method: 'CASH' },
            }),
          'INVALID_VALUE',
        );
      } finally {
        fixture.closeAndDelete();
      }
    });
  });

  describe('Ticket M3-02: Exact multi-line cart and line configuration', () => {
    it('completes multi-line sale with packages, conversion, and line discounts', () => {
      const fixture = openCatalogueFixture();
      try {
        const prod1 = createTemporaryProduct(
          fixture.adapter,
          {
            storeId: fixture.context.store.id,
            deviceId: fixture.context.device.id,
            name: 'Sugar 500g',
          },
          { generateId: deterministicIds(300) },
        );

        // Create carton package for prod1: 20 packs of 500g
        const cartonPkg = createPackageUnit(fixture.adapter, {
          id: testId(501),
          productVariantId: prod1.variant.id,
          name: 'Carton (20x500g)',
          conversionToBaseMicros: 20 * MICROS_PER_UNIT,
          isBaseUnit: false,
          isSellable: true,
        });

        const prod2 = createTemporaryProduct(
          fixture.adapter,
          {
            storeId: fixture.context.store.id,
            deviceId: fixture.context.device.id,
            name: 'Milk 400g',
          },
          { generateId: deterministicIds(350) },
        );

        const saleResult = completeSale(
          fixture.adapter,
          {
            storeId: fixture.context.store.id,
            deviceId: fixture.context.device.id,
            userId: fixture.context.owner.id,
            lines: [
              {
                storeProductId: prod1.storeProduct.id,
                packageUnitId: cartonPkg.id,
                quantityPackagesMicros: 2 * MICROS_PER_UNIT, // 2 cartons
                unitPriceMinor: 1800000, // ₦18,000.00 each -> gross ₦36,000.00
                discountAmountMinor: 100000, // ₦1,000.00 discount -> net ₦35,000.00
              },
              {
                storeProductId: prod2.storeProduct.id,
                packageUnitId: prod2.basePackage.id,
                quantityPackagesMicros: 3 * MICROS_PER_UNIT, // 3 pieces
                unitPriceMinor: 250000, // ₦2,500.00 each -> gross ₦7,500.00
                discountAmountMinor: 0, // net ₦7,500.00
              },
            ],
            payment: { method: 'CASH' },
          },
          { generateId: deterministicIds(600) },
        );

        expect(saleResult.items).toHaveLength(2);
        expect(saleResult.sale.subtotalMinor).toBe(4350000); // 36,000 + 7,500 = 43,500
        expect(saleResult.sale.discountTotalMinor).toBe(100000); // 1,000
        expect(saleResult.sale.totalMinor).toBe(4250000); // 42,500

        // Check inventory events
        expect(saleResult.inventoryEvents).toHaveLength(2);
        // Carton: 2 cartons * 20 base = 40 base units
        expect(saleResult.inventoryEvents[0].quantityBaseDeltaMicros).toBe(-40_000_000);
        expect(getProductStock(fixture.adapter, prod1.storeProduct.id)).toBe(-40_000_000);

        // Piece: 3 pieces * 1 base = 3 base units
        expect(saleResult.inventoryEvents[1].quantityBaseDeltaMicros).toBe(-3_000_000);
        expect(getProductStock(fixture.adapter, prod2.storeProduct.id)).toBe(-3_000_000);
      } finally {
        fixture.closeAndDelete();
      }
    });

    it('rejects sale with zero lines', () => {
      const fixture = openCatalogueFixture();
      try {
        expectDomainError(
          () =>
            completeSale(fixture.adapter, {
              storeId: fixture.context.store.id,
              deviceId: fixture.context.device.id,
              userId: fixture.context.owner.id,
              lines: [],
              payment: { method: 'CASH' },
            }),
          'INVALID_VALUE',
        );
      } finally {
        fixture.closeAndDelete();
      }
    });
  });

  describe('Ticket M3-03: Record all payment methods and credit truthfully', () => {
    it('supports BANK_TRANSFER and POS_CARD payments', () => {
      const fixture = openCatalogueFixture();
      try {
        const prod = createTemporaryProduct(
          fixture.adapter,
          {
            storeId: fixture.context.store.id,
            deviceId: fixture.context.device.id,
            name: 'Custard 2kg',
          },
          { generateId: deterministicIds(300) },
        );

        // Bank transfer
        const transferSale = completeSale(
          fixture.adapter,
          {
            storeId: fixture.context.store.id,
            deviceId: fixture.context.device.id,
            userId: fixture.context.owner.id,
            lines: [
              {
                storeProductId: prod.storeProduct.id,
                packageUnitId: prod.basePackage.id,
                quantityPackagesMicros: 1 * MICROS_PER_UNIT,
                unitPriceMinor: 350000,
              },
            ],
            payment: {
              method: 'BANK_TRANSFER',
              paymentReference: 'GTB-TRF-98234',
            },
          },
          { generateId: deterministicIds(400) },
        );
        expect(transferSale.payment.method).toBe('BANK_TRANSFER');
        expect(transferSale.payment.paymentReference).toBe('GTB-TRF-98234');

        // POS Card
        const posSale = completeSale(
          fixture.adapter,
          {
            storeId: fixture.context.store.id,
            deviceId: fixture.context.device.id,
            userId: fixture.context.owner.id,
            lines: [
              {
                storeProductId: prod.storeProduct.id,
                packageUnitId: prod.basePackage.id,
                quantityPackagesMicros: 1 * MICROS_PER_UNIT,
                unitPriceMinor: 350000,
              },
            ],
            payment: {
              method: 'POS_CARD',
              paymentReference: 'MONIEPOINT-STAN-0012',
            },
          },
          { generateId: deterministicIds(500) },
        );
        expect(posSale.payment.method).toBe('POS_CARD');
        expect(posSale.payment.paymentReference).toBe('MONIEPOINT-STAN-0012');

        // Cash received includes cash, transfer, and POS
        expect(getCashReceivedTotalByStore(fixture.adapter, fixture.context.store.id)).toBe(
          700000,
        );
      } finally {
        fixture.closeAndDelete();
      }
    });

    it('records CREDIT sale with CustomerAccount and OPEN Receivable, excluding from cash received', () => {
      const fixture = openCatalogueFixture();
      try {
        const prod = createTemporaryProduct(
          fixture.adapter,
          {
            storeId: fixture.context.store.id,
            deviceId: fixture.context.device.id,
            name: 'Bag of Rice 50kg',
          },
          { generateId: deterministicIds(300) },
        );

        // 1. Credit sale with new customer name
        const creditSale = completeSale(
          fixture.adapter,
          {
            storeId: fixture.context.store.id,
            deviceId: fixture.context.device.id,
            userId: fixture.context.owner.id,
            lines: [
              {
                storeProductId: prod.storeProduct.id,
                packageUnitId: prod.basePackage.id,
                quantityPackagesMicros: 1 * MICROS_PER_UNIT,
                unitPriceMinor: 7500000, // ₦75,000.00
              },
            ],
            payment: {
              method: 'CREDIT',
              customerName: 'Mama Nkechi',
            },
          },
          { generateId: deterministicIds(400) },
        );

        expect(creditSale.payment.method).toBe('CREDIT');
        expect(creditSale.payment.amountMinor).toBe(7500000);
        expect(creditSale.customerAccount).not.toBeNull();
        expect(creditSale.customerAccount?.name).toBe('Mama Nkechi');
        expect(creditSale.receivable).not.toBeNull();
        expect(creditSale.receivable?.originalAmountMinor).toBe(7500000);
        expect(creditSale.receivable?.outstandingAmountMinor).toBe(7500000);
        expect(creditSale.receivable?.status).toBe('OPEN');

        // D-037 critical invariant: Credit is NOT counted as cash received!
        const cashReceived = getCashReceivedTotalByStore(
          fixture.adapter,
          fixture.context.store.id,
        );
        expect(cashReceived).toBe(0);

        // But total sales value DOES include credit sale!
        const totalSales = getTotalSalesValueByStore(
          fixture.adapter,
          fixture.context.store.id,
        );
        expect(totalSales).toBe(7500000);

        // 2. Repeat credit sale using the explicitly selected existing CustomerAccount
        const creditSale2 = completeSale(
          fixture.adapter,
          {
            storeId: fixture.context.store.id,
            deviceId: fixture.context.device.id,
            userId: fixture.context.owner.id,
            lines: [
              {
                storeProductId: prod.storeProduct.id,
                packageUnitId: prod.basePackage.id,
                quantityPackagesMicros: 1 * MICROS_PER_UNIT,
                unitPriceMinor: 200000,
              },
            ],
            payment: {
              method: 'CREDIT',
              customerName: 'Mama Nkechi',
              customerAccountId: creditSale.customerAccount!.id,
            },
          },
          { generateId: deterministicIds(500) },
        );

        expect(creditSale2.customerAccount?.id).toBe(creditSale.customerAccount!.id);
        expect(creditSale2.receivable?.originalAmountMinor).toBe(200000);

        // Exactly 1 customer account was created (reused existing), but 2 receivables
        expect(countRows(fixture.adapter, 'customer_accounts')).toBe(1);
        expect(countRows(fixture.adapter, 'receivables')).toBe(2);
      } finally {
        fixture.closeAndDelete();
      }
    });

    it('rejects credit sale with empty or missing customer name', () => {
      const fixture = openCatalogueFixture();
      try {
        const prod = createTemporaryProduct(
          fixture.adapter,
          {
            storeId: fixture.context.store.id,
            deviceId: fixture.context.device.id,
            name: 'Flour 1kg',
          },
          { generateId: deterministicIds(300) },
        );

        expectDomainError(
          () =>
            completeSale(fixture.adapter, {
              storeId: fixture.context.store.id,
              deviceId: fixture.context.device.id,
              userId: fixture.context.owner.id,
              lines: [
                {
                  storeProductId: prod.storeProduct.id,
                  packageUnitId: prod.basePackage.id,
                  quantityPackagesMicros: 1 * MICROS_PER_UNIT,
                  unitPriceMinor: 100000,
                },
              ],
              payment: {
                method: 'CREDIT',
                customerName: '   ', // whitespace only
              },
            }),
          'INVALID_VALUE',
        );
      } finally {
        fixture.closeAndDelete();
      }
    });
  });

  describe('Ticket M3-04: Recover and review completed sales', () => {
    it('completed sales survive database close/reopen and render from snapshots after catalogue edits', () => {
      const fixture = openCatalogueFixture();
      try {
        const prod = createTemporaryProduct(
          fixture.adapter,
          {
            storeId: fixture.context.store.id,
            deviceId: fixture.context.device.id,
            name: 'Original Biscuit Name',
          },
          { generateId: deterministicIds(300) },
        );

        const saleResult = completeSale(
          fixture.adapter,
          {
            storeId: fixture.context.store.id,
            deviceId: fixture.context.device.id,
            userId: fixture.context.owner.id,
            lines: [
              {
                storeProductId: prod.storeProduct.id,
                packageUnitId: prod.basePackage.id,
                quantityPackagesMicros: 5 * MICROS_PER_UNIT,
                unitPriceMinor: 20000, // ₦200 each -> ₦1,000 total
              },
            ],
            payment: { method: 'CASH' },
          },
          { generateId: deterministicIds(400) },
        );

        // Edit the product name in catalogue AFTER the sale
        updateProductIdentity(
          fixture.adapter,
          {
            storeId: fixture.context.store.id,
            deviceId: fixture.context.device.id,
            storeProductId: prod.storeProduct.id,
            name: 'New Enriched Biscuit Name 2026',
          },
          { generateId: deterministicIds(500) },
        );

        // Close and reopen database
        fixture.adapter.close();

        const reopened = reopenDatabase(fixture.path);
        try {
          openDatabase(reopened, MIGRATIONS);

          // List recent sales
          const recent = listRecentSales(reopened, fixture.context.store.id);
          expect(recent).toHaveLength(1);
          expect(recent[0].id).toBe(saleResult.sale.id);
          expect(recent[0].totalMinor).toBe(100000);

          // Get sale detail
          const detail = getSaleDetail(reopened, saleResult.sale.id);
          expect(detail).not.toBeNull();
          expect(detail!.items).toHaveLength(1);

          // CRITICAL: productNameSnapshot preserves the historical name, NOT the new name!
          expect(detail!.items[0].productNameSnapshot).toBe('Original Biscuit Name');
          expect(detail!.items[0].unitPriceMinor).toBe(20000);
          expect(detail!.items[0].netTotalMinor).toBe(100000);
          expect(detail!.payment.method).toBe('CASH');
          expect(detail!.payment.amountMinor).toBe(100000);

          // Stock is still negative 5 units
          expect(getProductStock(reopened, prod.storeProduct.id)).toBe(-5_000_000);
        } finally {
          reopened.close();
        }
      } finally {
        fixture.closeAndDelete();
      }
    });

    it('isolates sales by store', () => {
      const fixture = openCatalogueFixture();
      try {
        // Create second store
        const store2 = createStore(fixture.adapter, {
          id: testId(201),
          name: 'Store Two',
          currencyCode: 'NGN',
          countryCode: 'NG',
          timezone: 'Africa/Lagos',
        });

        const user2 = createUser(fixture.adapter, {
          id: testId(202),
          displayName: 'User Two',
        });

        createStoreMember(fixture.adapter, {
          id: testId(203),
          storeId: store2.id,
          userId: user2.id,
          role: 'OWNER',
        });

        const prod = createTemporaryProduct(
          fixture.adapter,
          {
            storeId: fixture.context.store.id,
            deviceId: fixture.context.device.id,
            name: 'Store 1 Item',
          },
          { generateId: deterministicIds(300) },
        );

        completeSale(
          fixture.adapter,
          {
            storeId: fixture.context.store.id,
            deviceId: fixture.context.device.id,
            userId: fixture.context.owner.id,
            lines: [
              {
                storeProductId: prod.storeProduct.id,
                packageUnitId: prod.basePackage.id,
                quantityPackagesMicros: 1 * MICROS_PER_UNIT,
                unitPriceMinor: 10000,
              },
            ],
            payment: { method: 'CASH' },
          },
          { generateId: deterministicIds(400) },
        );

        // Store 1 has 1 sale
        expect(listRecentSales(fixture.adapter, fixture.context.store.id)).toHaveLength(1);
        // Store 2 has 0 sales
        expect(listRecentSales(fixture.adapter, store2.id)).toHaveLength(0);
      } finally {
        fixture.closeAndDelete();
      }
    });

    it('keeps all screen-facing sales-client reads within the bound store', () => {
      const fixture = openCatalogueFixture();
      try {
        const secondContext = provisionStoreContext(
          fixture.adapter,
          {
            ownerDisplayName: 'Store B Owner',
            storeName: 'Store B',
            currencyCode: 'NGN',
            countryCode: 'NG',
            timezone: 'Africa/Lagos',
            appVersion: '0.0.1',
          },
          { generateId: deterministicIds(900) },
        );
        const secondCatalogue = createCatalogueClient(
          fixture.adapter,
          secondContext.store,
          secondContext.device,
          deterministicIds(1_000),
        );
        const secondProduct = secondCatalogue.createTemporaryProduct({ name: 'Store B private price' });
        const secondPackage = secondCatalogue.createPackage({
          storeProductId: secondProduct.storeProduct.id,
          name: 'Store B carton',
          conversionText: '12',
          setting: { defaultSellingPrice: '123.45', isPreferredForSale: true },
        });
        const secondCustomer = createCustomerAccount(fixture.adapter, {
          id: testId(1_100),
          storeId: secondContext.store.id,
          name: 'Store B customer',
        });
        const secondSalesClient = createDatabaseSalesClient(fixture.adapter, {
          storeId: secondContext.store.id,
          deviceId: secondContext.device.id,
          userId: secondContext.owner.id,
          generateId: deterministicIds(1_200),
        });
        const secondSale = secondSalesClient.completeSale({
          lines: [
            {
              storeProductId: secondProduct.storeProduct.id,
              packageUnitId: secondPackage.packageUnit.id,
              quantityPackagesMicros: MICROS_PER_UNIT,
              unitPriceMinor: 12_345,
            },
          ],
          payment: { method: 'CASH' },
        });
        const firstSalesClient = createDatabaseSalesClient(fixture.adapter, {
          storeId: fixture.context.store.id,
          deviceId: fixture.context.device.id,
          userId: fixture.context.owner.id,
        });

        expect(secondSalesClient.getProductPackages(secondProduct.storeProduct.id)).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ id: secondPackage.packageUnit.id, sellingPriceMinor: 12_345 }),
          ]),
        );
        expect(firstSalesClient.getProductPackages(secondProduct.storeProduct.id)).toEqual([]);
        expect(firstSalesClient.searchProducts('Store B private price')).toEqual([]);
        expect(firstSalesClient.searchCustomers('Store B customer')).toEqual([]);
        expect(firstSalesClient.listSales()).toEqual([]);
        expect(firstSalesClient.getSaleDetail(secondSale.sale.id)).toBeNull();
        expect(secondCustomer.storeId).toBe(secondContext.store.id);
      } finally {
        fixture.closeAndDelete();
      }
    });

    it('rejects client construction for an inactive bound store or device', () => {
      const fixture = openCatalogueFixture();
      try {
        fixture.adapter.run(`UPDATE devices SET status = 'INACTIVE' WHERE id = ?;`, [fixture.context.device.id]);
        expect(() =>
          createDatabaseSalesClient(fixture.adapter, {
            storeId: fixture.context.store.id,
            deviceId: fixture.context.device.id,
          }),
        ).toThrow(/active device/);

        fixture.adapter.run(`UPDATE devices SET status = 'ACTIVE' WHERE id = ?;`, [fixture.context.device.id]);
        fixture.adapter.run(`UPDATE stores SET status = 'INACTIVE' WHERE id = ?;`, [fixture.context.store.id]);
        expect(() =>
          createDatabaseSalesClient(fixture.adapter, {
            storeId: fixture.context.store.id,
            deviceId: fixture.context.device.id,
          }),
        ).toThrow(/store is not active/);
      } finally {
        fixture.closeAndDelete();
      }
    });

    it('rejects unsafe cross-row money and inventory aggregates instead of rounding them', () => {
      const fixture = openCatalogueFixture();
      try {
        const product = createTemporaryProduct(
          fixture.adapter,
          {
            storeId: fixture.context.store.id,
            deviceId: fixture.context.device.id,
            name: 'Aggregate boundary item',
          },
          { generateId: deterministicIds(300) },
        );
        const input = {
          storeId: fixture.context.store.id,
          deviceId: fixture.context.device.id,
          userId: fixture.context.owner.id,
          lines: [
            {
              storeProductId: product.storeProduct.id,
              packageUnitId: product.basePackage.id,
              quantityPackagesMicros: Number.MAX_SAFE_INTEGER,
              unitPriceMinor: MICROS_PER_UNIT,
            },
          ],
          payment: { method: 'CASH' as const },
        };

        completeSale(fixture.adapter, input, {
          generateId: deterministicIds(400),
          operationId: testId(1_300),
        });
        completeSale(fixture.adapter, input, {
          generateId: deterministicIds(500),
          operationId: testId(1_301),
        });

        expectDomainError(
          () => getCashReceivedTotalByStore(fixture.adapter, fixture.context.store.id),
          'INVALID_MONEY',
        );
        expectDomainError(
          () => getTotalSalesValueByStore(fixture.adapter, fixture.context.store.id),
          'INVALID_MONEY',
        );
        expectDomainError(
          () => getProductStock(fixture.adapter, product.storeProduct.id),
          'INVALID_QUANTITY',
        );
      } finally {
        fixture.closeAndDelete();
      }
    });
  });
});
