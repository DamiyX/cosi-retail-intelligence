import { DomainError, MICROS_PER_UNIT, normalizePurchaseCost, parseQuantityDecimal } from '@retail/domain';

import { createTemporaryProduct } from '../src/catalogue/createTemporaryProduct';
import { getActiveBasePackageUnit, getCostState, rebuildCostStateFromMovements } from '../src/db/repositories';
import { countRows, deterministicIds, openCatalogueFixture } from './catalogueSupport';
import { recordPurchase } from '../src/purchases/recordPurchase';
import { completeSale } from '../src/sales/completeSale';

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
});
