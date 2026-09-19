import { DomainError, MICROS_PER_UNIT } from '@retail/domain';

import { createCatalogueClient } from '../src/catalogue/client';
import { getBusinessSummary, recordExpense, recordOwnerWithdrawal } from '../src/finance';
import {
  createPayment,
  createSale,
  createSaleItem,
  createSaleItemCostSnapshot,
  createStoreMember,
  createUser,
} from '../src/db/repositories';
import { deterministicIds, openCatalogueFixture, testId } from './catalogueSupport';

function summarySaleAt(
  fixture: ReturnType<typeof openCatalogueFixture>,
  product: ReturnType<ReturnType<typeof createCatalogueClient>['createTemporaryProduct']>,
  suffix: number,
  priceMinor: number,
  coverageStatus: 'AVAILABLE' | 'UNAVAILABLE',
  occurredAt: string,
) {
  const sale = createSale(fixture.adapter, {
    id: testId(suffix),
    storeId: fixture.context.store.id,
    deviceId: fixture.context.device.id,
    createdByUserId: fixture.context.owner.id,
    occurredAt,
    currencyCode: fixture.context.store.currencyCode,
    subtotalMinor: priceMinor,
    totalMinor: priceMinor,
    createdAt: occurredAt,
    completedAt: occurredAt,
  });
  const item = createSaleItem(fixture.adapter, {
    id: testId(suffix + 1),
    saleId: sale.id,
    storeProductId: product.storeProduct.id,
    productVariantId: product.variant.id,
    packageUnitId: product.basePackage.id,
    quantityPackagesMicros: MICROS_PER_UNIT,
    conversionToBaseSnapshotMicros: product.basePackage.conversionToBaseMicros,
    quantityBaseMicros: MICROS_PER_UNIT,
    unitPriceMinor: priceMinor,
    grossTotalMinor: priceMinor,
    netTotalMinor: priceMinor,
    unitCostBaseSnapshotMinor: coverageStatus === 'AVAILABLE' ? 100 : null,
    cogsAmountMinor: coverageStatus === 'AVAILABLE' ? 100 : null,
    productNameSnapshot: product.variant.name,
    packageNameSnapshot: product.basePackage.name,
    createdAt: occurredAt,
  });
  createSaleItemCostSnapshot(fixture.adapter, {
    saleItemId: item.id,
    saleId: sale.id,
    storeId: fixture.context.store.id,
    storeProductId: product.storeProduct.id,
    quantityBaseMicros: MICROS_PER_UNIT,
    costedQuantityBaseMicros: coverageStatus === 'AVAILABLE' ? MICROS_PER_UNIT : 0,
    coverageStatus,
    unitCost: coverageStatus === 'AVAILABLE' ? { numerator: '100', denominator: '1' } : null,
    cogs: coverageStatus === 'AVAILABLE' ? { numerator: '100', denominator: '1' } : null,
    cogsAmountMinor: coverageStatus === 'AVAILABLE' ? 100 : null,
    createdAt: occurredAt,
  });
  return sale;
}

describe('M6-03 daily business summary', () => {
  it('keeps owner financial summaries unavailable to staff before M11 permissions', () => {
    const fixture = openCatalogueFixture();
    try {
      const staff = createUser(fixture.adapter, {
        id: testId(11901),
        displayName: 'Staff member',
      });
      createStoreMember(fixture.adapter, {
        id: testId(11902),
        storeId: fixture.context.store.id,
        userId: staff.id,
        role: 'STAFF',
      });
      expect(() => getBusinessSummary(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: staff.id,
        localDate: '2026-09-18',
      })).toThrow(DomainError);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('uses the store-local half-open day, includes credit sales, preserves unavailable cost, and ranks sale appearances', () => {
    const fixture = openCatalogueFixture();
    try {
      const catalogue = createCatalogueClient(fixture.adapter, fixture.context.store, fixture.context.device, deterministicIds(12000));
      const rice = catalogue.createTemporaryProduct({ name: 'Rice' });
      const beans = catalogue.createTemporaryProduct({ name: 'Beans' });
      const boundary = catalogue.createTemporaryProduct({ name: 'Boundary item' });
      const includedAtStart = summarySaleAt(fixture, rice, 12200, 300, 'AVAILABLE', '2026-09-17T23:00:00.000Z');
      summarySaleAt(fixture, rice, 12300, 300, 'AVAILABLE', '2026-09-18T12:00:00.000Z');
      summarySaleAt(fixture, beans, 12400, 500, 'UNAVAILABLE', '2026-09-18T13:00:00.000Z');
      const excludedAtEnd = summarySaleAt(fixture, boundary, 12500, 900, 'UNAVAILABLE', '2026-09-18T23:00:00.000Z');
      expect(includedAtStart.totalMinor).toBe(300);
      expect(excludedAtEnd.totalMinor).toBe(900);

      createPayment(fixture.adapter, {
        id: testId(12402),
        saleId: testId(12400),
        method: 'CREDIT',
        amountMinor: 500,
        currencyCode: 'NGN',
        recordedByUserId: fixture.context.owner.id,
      });

      recordExpense(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        category: 'TRANSPORT',
        amountMinor: 50,
        currencyCode: 'NGN',
        occurredAt: '2026-09-18T15:00:00.000Z',
      }, { operationId: testId(12601), generateId: deterministicIds(12602) });
      recordOwnerWithdrawal(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        amountMinor: 75,
        currencyCode: 'NGN',
        occurredAt: '2026-09-18T16:00:00.000Z',
      }, { operationId: testId(12701), generateId: deterministicIds(12702) });

      const summary = getBusinessSummary(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        localDate: '2026-09-18',
      });
      expect(summary.range.startUtc).toBe('2026-09-17T23:00:00.000Z');
      expect(summary.range.endUtc).toBe('2026-09-18T23:00:00.000Z');
      expect(summary.salesValueMinor).toBe(1100);
      expect(summary.transactionCount).toBe(3);
      expect(summary.recordedExpensesMinor).toBe(50);
      expect(summary.ownerWithdrawalsMinor).toBe(75);
      expect(summary.costCoverage).toBe('PARTIAL');
      expect(summary.coveredSaleCount).toBe(2);
      expect(summary.coveredSalesValueMinor).toBe(600);
      expect(summary.unavailableSaleCount).toBe(1);
      expect(summary.unavailableSalesValueMinor).toBe(500);
      expect(summary.trackedCogsMinor).toBe(200);
      expect(summary.trackedGrossMarginMinor).toBe(400);
      expect(summary.trackedGrossMarginAfterRecordedExpensesMinor).toBeNull();
      expect(summary.popularProduct).toEqual({ storeProductId: rice.storeProduct.id, productName: 'Rice', saleCount: 2 });
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('returns a full-coverage tracked result only when every sale is covered', () => {
    const fixture = openCatalogueFixture();
    try {
      const catalogue = createCatalogueClient(fixture.adapter, fixture.context.store, fixture.context.device, deterministicIds(13000));
      const rice = catalogue.createTemporaryProduct({ name: 'Covered rice' });
      summarySaleAt(fixture, rice, 13200, 300, 'AVAILABLE', '2026-09-18T12:00:00.000Z');
      recordExpense(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        category: 'MISCELLANEOUS',
        amountMinor: 20,
        currencyCode: 'NGN',
        occurredAt: '2026-09-18T13:00:00.000Z',
      }, { operationId: testId(13301), generateId: deterministicIds(13302) });
      const summary = getBusinessSummary(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        localDate: '2026-09-18',
      });
      expect(summary.costCoverage).toBe('FULL');
      expect(summary.trackedGrossMarginMinor).toBe(200);
      expect(summary.trackedGrossMarginAfterRecordedExpensesMinor).toBe(180);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('resolves a DST transition as a store-local half-open range', () => {
    const fixture = openCatalogueFixture();
    try {
      fixture.adapter.run('UPDATE stores SET timezone = ? WHERE id = ?;', ['America/New_York', fixture.context.store.id]);
      const summary = getBusinessSummary(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        localDate: '2026-03-08',
      });
      expect(summary.range.startUtc).toBe('2026-03-08T05:00:00.000Z');
      expect(summary.range.endUtc).toBe('2026-03-09T04:00:00.000Z');
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('fails safely instead of rounding a summary total beyond the JavaScript safe integer range', () => {
    const fixture = openCatalogueFixture();
    try {
      const common = {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        createdByUserId: fixture.context.owner.id,
        occurredAt: '2026-09-18T12:00:00.000Z',
        currencyCode: 'NGN',
        subtotalMinor: Number.MAX_SAFE_INTEGER,
        totalMinor: Number.MAX_SAFE_INTEGER,
      };
      createSale(fixture.adapter, { id: testId(14001), ...common });
      createSale(fixture.adapter, { id: testId(14002), ...common });
      expect(() => getBusinessSummary(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        localDate: '2026-09-18',
      })).toThrow(DomainError);
    } finally {
      fixture.closeAndDelete();
    }
  });
});
