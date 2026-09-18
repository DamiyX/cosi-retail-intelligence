import { DomainError, MICROS_PER_UNIT, normalizePurchaseCost, parseQuantityDecimal } from '@retail/domain';

import { createTemporaryProduct } from '../src/catalogue/createTemporaryProduct';
import { CURRENT_SCHEMA_VERSION, MIGRATIONS, openDatabase } from '../src/db';
import { openIsolatedDatabase } from '../src/db/testing';
import {
  createInventoryEvent,
  createPackageUnit,
  createPayment,
  createPurchase,
  createSale,
  createSaleItem,
  createStoreMember,
  createUser,
  enqueueOutboxOperation,
  getActiveBasePackageUnit,
  getCostState,
  listPurchasePriceHistoryByStoreProduct,
  listSaleItemCostSnapshotsBySaleId,
  rebuildCostStateFromMovements,
} from '../src/db/repositories';
import { countRows, deterministicIds, FailOnWriteAdapter, openCatalogueFixture, reopenDatabase, testId } from './catalogueSupport';
import { recordPurchase } from '../src/purchases/recordPurchase';
import { completeSale } from '../src/sales/completeSale';
import { provisionStoreContext } from '../src/storeContext/provisionStoreContext';

const PURCHASE_GRAPH_TABLES = [
  'suppliers',
  'purchases',
  'purchase_items',
  'inventory_events',
  'price_observations',
  'cost_movements',
  'store_product_cost_states',
  'outbox_operations',
] as const;

function purchaseGraphCounts(adapter: Parameters<typeof countRows>[0]): number[] {
  return PURCHASE_GRAPH_TABLES.map((table) => countRows(adapter, table));
}

const SALE_COST_GRAPH_TABLES = [
  'sales',
  'sale_items',
  'payments',
  'inventory_events',
  'sale_item_cost_snapshots',
  'cost_movements',
  'store_product_cost_states',
  'outbox_operations',
] as const;

function saleCostGraphCounts(adapter: Parameters<typeof countRows>[0]): number[] {
  return SALE_COST_GRAPH_TABLES.map((table) => countRows(adapter, table));
}

describe('M4 restocking and costing', () => {
  it('records an exact offline purchase graph and replays it without duplicates', () => {
    const fixture = openCatalogueFixture();
    try {
      const product = createTemporaryProduct(
        fixture.adapter,
        { storeId: fixture.context.store.id, deviceId: fixture.context.device.id, name: 'Rice' },
        { generateId: deterministicIds(200) },
      );
      const base = getActiveBasePackageUnit(fixture.adapter, product.variant.id)!;
      const ids = deterministicIds(300);
      const input = {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        lines: [{ storeProductId: product.storeProduct.id, packageUnitId: base.id, quantityPackagesMicros: 3 * MICROS_PER_UNIT, enteredCostMinor: 750 }],
      };
      const graph = recordPurchase(fixture.adapter, input, { generateId: ids, operationId: '00000000-0000-4000-8000-000000000301' });
      expect(graph.items[0].totalPurchaseCostMinor).toBe(750);
      expect(graph.items[0].baseUnitCostNumerator).toBe('250');
      expect(graph.items[0].baseUnitCostDenominator).toBe('1');
      expect(graph.observations[0].contributionConsent).toBe(false);
      expect(graph.outbox.operationType).toBe('COMPLETED_PURCHASE_CREATED');
      expect(countRows(fixture.adapter, 'inventory_events')).toBe(1);
      const replay = recordPurchase(fixture.adapter, input, { operationId: '00000000-0000-4000-8000-000000000301' });
      expect(replay.purchase.id).toBe(graph.purchase.id);
      expect(countRows(fixture.adapter, 'purchases')).toBe(1);
      expect(countRows(fixture.adapter, 'outbox_operations')).toBe(2);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('normalizes fractional total costs exactly and rejects inexact unit totals', () => {
    const normalized = normalizePurchaseCost({
      basis: 'TOTAL',
      enteredCostMinor: 100,
      quantityPackagesMicros: 3 * MICROS_PER_UNIT,
      quantityBaseMicros: 3 * MICROS_PER_UNIT,
    });
    expect(normalized.baseUnitCost).toEqual({ numerator: '100', denominator: '3' });
    expect(() => normalizePurchaseCost({
      basis: 'UNIT',
      enteredCostMinor: 1,
      quantityPackagesMicros: 500_000,
      quantityBaseMicros: 500_000,
    })).toThrow(DomainError);
    expect(parseQuantityDecimal('1.25')).toBe(1_250_000);
  });

  it('snapshots available provisional cost on a later sale', () => {
    const fixture = openCatalogueFixture();
    try {
      const product = createTemporaryProduct(
        fixture.adapter,
        { storeId: fixture.context.store.id, deviceId: fixture.context.device.id, name: 'Beans' },
        { generateId: deterministicIds(400) },
      );
      const base = getActiveBasePackageUnit(fixture.adapter, product.variant.id)!;
      const purchase = recordPurchase(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        lines: [{ storeProductId: product.storeProduct.id, packageUnitId: base.id, quantityPackagesMicros: 3 * MICROS_PER_UNIT, enteredCostMinor: 100 }],
      }, { generateId: deterministicIds(500), operationId: '00000000-0000-4000-8000-000000000501' });
      const sale = completeSale(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        lines: [{ storeProductId: product.storeProduct.id, packageUnitId: base.id, quantityPackagesMicros: MICROS_PER_UNIT, unitPriceMinor: 200 }],
        payment: { method: 'CASH' },
      }, { generateId: deterministicIds(600), operationId: '00000000-0000-4000-8000-000000000601' });
      expect(purchase.items[0].totalPurchaseCostMinor).toBe(100);
      expect(sale.costSnapshots[0].coverageStatus).toBe('AVAILABLE');
      expect(sale.costSnapshots[0].cogsAmountMinor).toBe(33);
      expect(sale.items[0].cogsAmountMinor).toBe(33);
      expect(sale.items[0].unitCostBaseSnapshotMinor).toBeNull();
      const state = getCostState(fixture.adapter, product.storeProduct.id);
      const rebuilt = rebuildCostStateFromMovements(fixture.adapter, product.storeProduct.id);
      expect(rebuilt).toEqual({
        coverageStatus: state?.coverageStatus,
        quantityCostedBaseMicros: state?.quantityCostedBaseMicros,
        remainingValue: state?.remainingValue,
        averageUnitCost: state?.averageUnitCost,
      });
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('rejects conflicting purchase replay and preserves immutable original facts', () => {
    const fixture = openCatalogueFixture();
    try {
      const product = createTemporaryProduct(
        fixture.adapter,
        { storeId: fixture.context.store.id, deviceId: fixture.context.device.id, name: 'Original Rice' },
        { generateId: deterministicIds(700) },
      );
      const base = getActiveBasePackageUnit(fixture.adapter, product.variant.id)!;
      const operationId = testId(701);
      const input = {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        supplierName: 'Original Supplier',
        lines: [{
          storeProductId: product.storeProduct.id,
          packageUnitId: base.id,
          quantityPackagesMicros: 2 * MICROS_PER_UNIT,
          enteredCostMinor: 500,
        }],
      };
      const graph = recordPurchase(fixture.adapter, input, {
        generateId: deterministicIds(710),
        operationId,
      });
      const before = purchaseGraphCounts(fixture.adapter);

      expect(() => recordPurchase(fixture.adapter, {
        ...input,
        lines: [{ ...input.lines[0], enteredCostMinor: 501 }],
      }, { operationId })).toThrow(DomainError);
      expect(purchaseGraphCounts(fixture.adapter)).toEqual(before);

      fixture.adapter.run('UPDATE product_variants SET name = ? WHERE id = ?;', ['Renamed Rice', product.variant.id]);
      fixture.adapter.run('UPDATE package_units SET name = ? WHERE id = ?;', ['Renamed piece', base.id]);
      fixture.adapter.run('UPDATE suppliers SET name = ? WHERE id = ?;', ['Renamed Supplier', graph.supplier!.id]);
      const history = listPurchasePriceHistoryByStoreProduct(
        fixture.adapter,
        fixture.context.store.id,
        product.storeProduct.id,
      );
      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({
        productNameSnapshot: 'Original Rice',
        packageNameSnapshot: 'piece',
        supplierNameSnapshot: 'Original Supplier',
        contributionConsent: false,
        totalPurchaseCostMinor: 500,
      });

      expect(() => fixture.adapter.run('UPDATE purchases SET total_amount_minor = 1 WHERE id = ?;', [graph.purchase.id])).toThrow(/completed purchases are immutable/);
      expect(() => fixture.adapter.run('DELETE FROM purchase_items WHERE id = ?;', [graph.items[0].id])).toThrow(/purchase items are immutable/);
      expect(() => fixture.adapter.run('UPDATE price_observations SET entered_cost_minor = 1 WHERE id = ?;', [graph.observations[0].id])).toThrow(/price observations are immutable/);
      expect(() => fixture.adapter.run('DELETE FROM cost_movements WHERE id = ?;', [graph.costMovements[0].id])).toThrow(/cost movements are append-only/);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('keeps purchase writes inside store, device, member, product, package and currency boundaries', () => {
    const fixture = openCatalogueFixture();
    try {
      const product = createTemporaryProduct(
        fixture.adapter,
        { storeId: fixture.context.store.id, deviceId: fixture.context.device.id, name: 'Boundary product' },
        { generateId: deterministicIds(730) },
      );
      const base = getActiveBasePackageUnit(fixture.adapter, product.variant.id)!;
      const secondContext = provisionStoreContext(
        fixture.adapter,
        {
          ownerDisplayName: 'Second store owner',
          storeName: 'Second store',
          currencyCode: 'USD',
          countryCode: 'US',
          timezone: 'UTC',
          appVersion: '0.0.1',
        },
        { generateId: deterministicIds(740) },
      );
      const secondProduct = createTemporaryProduct(
        fixture.adapter,
        { storeId: secondContext.store.id, deviceId: secondContext.device.id, name: 'Private product' },
        { generateId: deterministicIds(750) },
      );
      const secondBase = getActiveBasePackageUnit(fixture.adapter, secondProduct.variant.id)!;
      const sameStoreMember = createUser(fixture.adapter, { id: testId(760), displayName: 'Second member' });
      createStoreMember(fixture.adapter, {
        id: testId(761),
        storeId: fixture.context.store.id,
        userId: sameStoreMember.id,
        role: 'STAFF',
      });

      const common = {
        lines: [{ storeProductId: product.storeProduct.id, packageUnitId: base.id, quantityPackagesMicros: MICROS_PER_UNIT, enteredCostMinor: 100 }],
      };
      recordPurchase(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        supplierName: 'Duplicate supplier',
        ...common,
      }, { generateId: deterministicIds(770), operationId: testId(771) });
      recordPurchase(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        supplierName: 'Duplicate supplier',
        ...common,
      }, { generateId: deterministicIds(780), operationId: testId(781) });
      expect(countRows(fixture.adapter, 'suppliers')).toBe(2);

      const before = purchaseGraphCounts(fixture.adapter);
      expect(() => recordPurchase(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: sameStoreMember.id,
        supplierName: 'Duplicate supplier',
        ...common,
      }, { operationId: testId(771) })).toThrow(DomainError);
      expect(() => recordPurchase(fixture.adapter, {
        storeId: secondContext.store.id,
        deviceId: secondContext.device.id,
        userId: secondContext.owner.id,
        lines: [{ storeProductId: product.storeProduct.id, packageUnitId: base.id, quantityPackagesMicros: MICROS_PER_UNIT, enteredCostMinor: 100 }],
      })).toThrow(DomainError);
      expect(() => recordPurchase(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: secondContext.device.id,
        userId: fixture.context.owner.id,
        ...common,
      })).toThrow(DomainError);
      expect(() => recordPurchase(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        lines: [{ storeProductId: product.storeProduct.id, packageUnitId: secondBase.id, quantityPackagesMicros: MICROS_PER_UNIT, enteredCostMinor: 100 }],
      })).toThrow(DomainError);
      expect(purchaseGraphCounts(fixture.adapter)).toEqual(before);
      expect(listPurchasePriceHistoryByStoreProduct(fixture.adapter, secondContext.store.id, product.storeProduct.id)).toEqual([]);

      expect(() => createPurchase(fixture.adapter, {
        id: testId(790),
        storeId: fixture.context.store.id,
        createdByStoreMemberId: fixture.context.membership.id,
        createdByUserId: fixture.context.owner.id,
        deviceId: fixture.context.device.id,
        occurredAt: '2026-09-18T10:00:00.000Z',
        currencyCode: 'USD',
        totalAmountMinor: 100,
      })).toThrow(/currency mismatch/);
      expect(countRows(fixture.adapter, 'purchases')).toBe(2);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('rolls back every multiline purchase write including a new supplier and repeated product lines', () => {
    const makeInput = (fixture: ReturnType<typeof openCatalogueFixture>) => {
      const product = createTemporaryProduct(
        fixture.adapter,
        { storeId: fixture.context.store.id, deviceId: fixture.context.device.id, name: 'Bulk Rice' },
        { generateId: deterministicIds(800) },
      );
      const carton = createPackageUnit(fixture.adapter, {
        id: testId(801),
        productVariantId: product.variant.id,
        name: 'Carton',
        conversionToBaseMicros: 2 * MICROS_PER_UNIT,
        isBaseUnit: false,
        isSellable: true,
        isPurchasable: true,
      });
      return {
        product,
        input: {
          storeId: fixture.context.store.id,
          deviceId: fixture.context.device.id,
          userId: fixture.context.owner.id,
          supplierName: 'Bulk Supplier',
          lines: [
            {
              storeProductId: product.storeProduct.id,
              packageUnitId: product.basePackage.id,
              quantityPackagesMicros: 2 * MICROS_PER_UNIT,
              costBasis: 'TOTAL' as const,
              enteredCostMinor: 200,
            },
            {
              storeProductId: product.storeProduct.id,
              packageUnitId: carton.id,
              quantityPackagesMicros: MICROS_PER_UNIT,
              costBasis: 'TOTAL' as const,
              enteredCostMinor: 300,
            },
          ],
        },
      };
    };

    let writeCount = 0;
    const probe = openCatalogueFixture();
    try {
      const { input } = makeInput(probe);
      const adapter = new FailOnWriteAdapter(probe.adapter, Number.MAX_SAFE_INTEGER, new Error('probe'));
      const graph = recordPurchase(adapter, input, {
        generateId: deterministicIds(820),
        operationId: testId(821),
      });
      expect(graph.items).toHaveLength(2);
      writeCount = adapter.writeCount;
      expect(writeCount).toBeGreaterThan(10);
    } finally {
      probe.closeAndDelete();
    }

    for (let failOnWrite = 1; failOnWrite <= writeCount; failOnWrite += 1) {
      const fixture = openCatalogueFixture();
      try {
        const { input, product } = makeInput(fixture);
        const before = purchaseGraphCounts(fixture.adapter);
        const failing = new FailOnWriteAdapter(
          fixture.adapter,
          failOnWrite,
          new Error(`Injected purchase failure at write ${failOnWrite}`),
        );
        expect(() => recordPurchase(failing, input, {
          generateId: deterministicIds(840),
          operationId: testId(850 + failOnWrite),
        })).toThrow(`Injected purchase failure at write ${failOnWrite}`);
        expect(purchaseGraphCounts(fixture.adapter)).toEqual(before);
        expect(fixture.adapter.getFirstRow<{ total: number }>('SELECT COUNT(*) AS total FROM suppliers WHERE store_id = ?;', [fixture.context.store.id])).toEqual({ total: 0 });
        expect(fixture.adapter.getFirstRow<{ total: number }>('SELECT COUNT(*) AS total FROM inventory_events WHERE store_product_id = ?;', [product.storeProduct.id])).toEqual({ total: 0 });
      } finally {
        fixture.closeAndDelete();
      }
    }
  });

  it('rolls back every sale cost write after a purchase without consuming stock or cost state', () => {
    let writeCount = 0;
    const probe = openCatalogueFixture();
    try {
      const product = createTemporaryProduct(
        probe.adapter,
        { storeId: probe.context.store.id, deviceId: probe.context.device.id, name: 'Sale rollback item' },
        { generateId: deterministicIds(900) },
      );
      const base = getActiveBasePackageUnit(probe.adapter, product.variant.id)!;
      recordPurchase(probe.adapter, {
        storeId: probe.context.store.id,
        deviceId: probe.context.device.id,
        userId: probe.context.owner.id,
        lines: [{ storeProductId: product.storeProduct.id, packageUnitId: base.id, quantityPackagesMicros: 2 * MICROS_PER_UNIT, enteredCostMinor: 200 }],
      }, { generateId: deterministicIds(910), operationId: testId(911) });
      const failing = new FailOnWriteAdapter(probe.adapter, Number.MAX_SAFE_INTEGER, new Error('probe'));
      completeSale(failing, {
        storeId: probe.context.store.id,
        deviceId: probe.context.device.id,
        userId: probe.context.owner.id,
        lines: [{ storeProductId: product.storeProduct.id, packageUnitId: base.id, quantityPackagesMicros: MICROS_PER_UNIT, unitPriceMinor: 400 }],
        payment: { method: 'CASH' },
      }, { generateId: deterministicIds(920), operationId: testId(921) });
      writeCount = failing.writeCount;
      expect(writeCount).toBeGreaterThan(7);
    } finally {
      probe.closeAndDelete();
    }

    for (let failOnWrite = 1; failOnWrite <= writeCount; failOnWrite += 1) {
      const fixture = openCatalogueFixture();
      try {
        const product = createTemporaryProduct(
          fixture.adapter,
          { storeId: fixture.context.store.id, deviceId: fixture.context.device.id, name: 'Sale rollback item' },
          { generateId: deterministicIds(930) },
        );
        const base = getActiveBasePackageUnit(fixture.adapter, product.variant.id)!;
        recordPurchase(fixture.adapter, {
          storeId: fixture.context.store.id,
          deviceId: fixture.context.device.id,
          userId: fixture.context.owner.id,
          lines: [{ storeProductId: product.storeProduct.id, packageUnitId: base.id, quantityPackagesMicros: 2 * MICROS_PER_UNIT, enteredCostMinor: 200 }],
        }, { generateId: deterministicIds(940), operationId: testId(941) });
        const before = saleCostGraphCounts(fixture.adapter);
        const stateBefore = getCostState(fixture.adapter, product.storeProduct.id);
        const failing = new FailOnWriteAdapter(
          fixture.adapter,
          failOnWrite,
          new Error(`Injected sale cost failure at write ${failOnWrite}`),
        );
        expect(() => completeSale(failing, {
          storeId: fixture.context.store.id,
          deviceId: fixture.context.device.id,
          userId: fixture.context.owner.id,
          lines: [{ storeProductId: product.storeProduct.id, packageUnitId: base.id, quantityPackagesMicros: MICROS_PER_UNIT, unitPriceMinor: 400 }],
          payment: { method: 'CASH' },
        }, { generateId: deterministicIds(950), operationId: testId(960 + failOnWrite) })).toThrow(`Injected sale cost failure at write ${failOnWrite}`);
        expect(saleCostGraphCounts(fixture.adapter)).toEqual(before);
        expect(getCostState(fixture.adapter, product.storeProduct.id)).toEqual(stateBefore);
        expect(fixture.adapter.getFirstRow<{ total: number }>('SELECT COALESCE(SUM(quantity_base_delta_micros), 0) AS total FROM inventory_events WHERE store_product_id = ?;', [product.storeProduct.id])).toEqual({ total: 2_000_000 });
      } finally {
        fixture.closeAndDelete();
      }
    }
  });

  it('upgrades a populated M3 database without inventing historical purchase costs', () => {
    const isolated = openIsolatedDatabase(MIGRATIONS.slice(0, 3));
    let saleId = '';
    try {
      const context = provisionStoreContext(
        isolated.adapter,
        {
          ownerDisplayName: 'M3 Owner',
          storeName: 'M3 Store',
          currencyCode: 'NGN',
          countryCode: 'NG',
          timezone: 'Africa/Lagos',
          appVersion: '0.0.1',
        },
        { generateId: deterministicIds(1000) },
      );
      const product = createTemporaryProduct(
        isolated.adapter,
        { storeId: context.store.id, deviceId: context.device.id, name: 'M3 historical product' },
        { generateId: deterministicIds(1010) },
      );
      const occurredAt = '2026-09-18T10:00:00.000Z';
      isolated.adapter.transaction(() => {
        const sale = createSale(isolated.adapter, {
          id: testId(1020),
          storeId: context.store.id,
          deviceId: context.device.id,
          createdByUserId: context.owner.id,
          occurredAt,
          currencyCode: 'NGN',
          subtotalMinor: 120,
          totalMinor: 120,
          createdAt: occurredAt,
          completedAt: occurredAt,
        });
        saleId = sale.id;
        const item = createSaleItem(isolated.adapter, {
          id: testId(1021),
          saleId: sale.id,
          storeProductId: product.storeProduct.id,
          productVariantId: product.variant.id,
          packageUnitId: product.basePackage.id,
          quantityPackagesMicros: MICROS_PER_UNIT,
          conversionToBaseSnapshotMicros: MICROS_PER_UNIT,
          quantityBaseMicros: MICROS_PER_UNIT,
          unitPriceMinor: 120,
          grossTotalMinor: 120,
          netTotalMinor: 120,
          productNameSnapshot: 'M3 historical product',
          packageNameSnapshot: 'piece',
          createdAt: occurredAt,
        });
        const event = createInventoryEvent(isolated.adapter, {
          id: testId(1022),
          storeId: context.store.id,
          storeProductId: product.storeProduct.id,
          eventType: 'SALE',
          quantityBaseDeltaMicros: -MICROS_PER_UNIT,
          packageUnitId: product.basePackage.id,
          quantityPackageSnapshotMicros: MICROS_PER_UNIT,
          conversionToBaseSnapshotMicros: MICROS_PER_UNIT,
          sourceType: 'SALE',
          sourceId: sale.id,
          occurredAt,
          createdByUserId: context.owner.id,
          deviceId: context.device.id,
          createdAt: occurredAt,
        });
        const payment = createPayment(isolated.adapter, {
          id: testId(1023),
          saleId: sale.id,
          method: 'CASH',
          amountMinor: 120,
          currencyCode: 'NGN',
          recordedByUserId: context.owner.id,
          createdAt: occurredAt,
        });
        enqueueOutboxOperation(isolated.adapter, {
          operationType: 'COMPLETED_SALE_CREATED',
          operationId: testId(1024),
          storeId: context.store.id,
          deviceId: context.device.id,
          entityType: 'SALE',
          entityId: sale.id,
          occurredAt,
          entities: { sale, items: [item], payment, inventoryEvents: [event] },
          createdAt: occurredAt,
        });
      });
      isolated.adapter.close();
      const reopened = reopenDatabase(isolated.path);
      try {
        const report = openDatabase(reopened, MIGRATIONS);
        expect(report.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
        expect(countRows(reopened, 'sales')).toBe(1);
        expect(countRows(reopened, 'sale_item_cost_snapshots')).toBe(0);
        expect(countRows(reopened, 'purchases')).toBe(0);
        expect(reopened.getFirstRow<{ unit_cost_base_snapshot_minor: number | null; cogs_amount_minor: number | null }>('SELECT unit_cost_base_snapshot_minor, cogs_amount_minor FROM sale_items WHERE sale_id = ?;', [saleId])).toEqual({ unit_cost_base_snapshot_minor: null, cogs_amount_minor: null });
        expect(reopened.getFirstRow<{ total: number }>("SELECT COUNT(*) AS total FROM sqlite_master WHERE type = 'table' AND name IN ('purchases', 'cost_movements', 'price_observations');")).toEqual({ total: 3 });
      } finally {
        reopened.close();
      }
    } finally {
      isolated.closeAndDelete();
    }
  });

  it('replays a changed-price restock-to-sale flow after cold reopen with identical projection and history', () => {
    const fixture = openCatalogueFixture();
    let productId = '';
    let firstSaleId = '';
    let secondSaleId = '';
    try {
      const product = createTemporaryProduct(
        fixture.adapter,
        { storeId: fixture.context.store.id, deviceId: fixture.context.device.id, name: 'Flow product' },
        { generateId: deterministicIds(1100) },
      );
      productId = product.storeProduct.id;
      const base = getActiveBasePackageUnit(fixture.adapter, product.variant.id)!;
      recordPurchase(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        supplierName: 'First supplier',
        lines: [{ storeProductId: productId, packageUnitId: base.id, quantityPackagesMicros: 3 * MICROS_PER_UNIT, enteredCostMinor: 300 }],
      }, { generateId: deterministicIds(1110), operationId: testId(1111) });
      const firstSale = completeSale(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        lines: [{ storeProductId: productId, packageUnitId: base.id, quantityPackagesMicros: MICROS_PER_UNIT, unitPriceMinor: 500 }],
        payment: { method: 'CASH' },
      }, { generateId: deterministicIds(1120), operationId: testId(1121) });
      firstSaleId = firstSale.sale.id;
      recordPurchase(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        supplierName: 'Second supplier',
        lines: [{ storeProductId: productId, packageUnitId: base.id, quantityPackagesMicros: 2 * MICROS_PER_UNIT, enteredCostMinor: 400 }],
      }, { generateId: deterministicIds(1130), operationId: testId(1131) });
      const secondSale = completeSale(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        lines: [{ storeProductId: productId, packageUnitId: base.id, quantityPackagesMicros: 3 * MICROS_PER_UNIT, unitPriceMinor: 600 }],
        payment: { method: 'CASH' },
      }, { generateId: deterministicIds(1140), operationId: testId(1141) });
      secondSaleId = secondSale.sale.id;
      expect(firstSale.costSnapshots[0].cogsAmountMinor).toBe(100);
      expect(secondSale.costSnapshots[0].cogsAmountMinor).toBe(450);

      fixture.adapter.run('UPDATE product_variants SET name = ? WHERE id = ?;', ['Renamed after flow', product.variant.id]);
      fixture.adapter.run('UPDATE package_units SET name = ? WHERE id = ?;', ['Renamed pack', base.id]);
      const beforeState = getCostState(fixture.adapter, productId)!;
      const historyBefore = listPurchasePriceHistoryByStoreProduct(fixture.adapter, fixture.context.store.id, productId);
      expect(historyBefore.map((entry) => entry.totalPurchaseCostMinor)).toEqual([400, 300]);

      fixture.adapter.close();
      const reopened = reopenDatabase(fixture.path);
      try {
        openDatabase(reopened, MIGRATIONS);
        const afterState = getCostState(reopened, productId)!;
        expect(rebuildCostStateFromMovements(reopened, productId)).toEqual({
          coverageStatus: afterState.coverageStatus,
          quantityCostedBaseMicros: afterState.quantityCostedBaseMicros,
          remainingValue: afterState.remainingValue,
          averageUnitCost: afterState.averageUnitCost,
        });
        expect(afterState).toMatchObject({
          coverageStatus: beforeState.coverageStatus,
          quantityCostedBaseMicros: MICROS_PER_UNIT,
          remainingValue: { numerator: '150', denominator: '1' },
          averageUnitCost: { numerator: '150', denominator: '1' },
        });
        expect(listPurchasePriceHistoryByStoreProduct(reopened, fixture.context.store.id, productId)).toMatchObject([
          { productNameSnapshot: 'Flow product', packageNameSnapshot: 'piece', supplierNameSnapshot: 'Second supplier', contributionConsent: false },
          { productNameSnapshot: 'Flow product', packageNameSnapshot: 'piece', supplierNameSnapshot: 'First supplier', contributionConsent: false },
        ]);
        expect(listSaleItemCostSnapshotsBySaleId(reopened, firstSaleId)[0].cogsAmountMinor).toBe(100);
        expect(listSaleItemCostSnapshotsBySaleId(reopened, secondSaleId)[0].cogsAmountMinor).toBe(450);
      } finally {
        reopened.close();
      }
    } finally {
      fixture.closeAndDelete();
    }
  });
});
