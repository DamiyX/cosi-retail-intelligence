import { DomainError } from '../src/errors';
import {
  applyPurchaseCostState,
  applySaleCostState,
  initialCostState,
  normalizePurchaseCost,
  roundRationalHalfUp,
} from '../src/costing';

describe('M4 exact provisional costing', () => {
  it('keeps fractional total-cost normalization as a reduced rational', () => {
    expect(normalizePurchaseCost({
      basis: 'TOTAL',
      enteredCostMinor: 100,
      quantityPackagesMicros: 3_000_000,
      quantityBaseMicros: 3_000_000,
    }).baseUnitCost).toEqual({ numerator: '100', denominator: '3' });
  });

  it('rejects inexact per-package unit totals and rounds half-up once', () => {
    expect(() => normalizePurchaseCost({
      basis: 'UNIT',
      enteredCostMinor: 1,
      quantityPackagesMicros: 500_000,
      quantityBaseMicros: 500_000,
    })).toThrow(DomainError);
    expect(roundRationalHalfUp({ numerator: '1', denominator: '2' })).toBe(1);
    expect(roundRationalHalfUp({ numerator: '1', denominator: '3' })).toBe(0);
  });

  it('costs only the positive remainder after a negative balance', () => {
    const transition = applyPurchaseCostState(initialCostState(), {
      priorInventoryBalanceBaseMicros: -2_000_000,
      receiptQuantityBaseMicros: 3_000_000,
      receiptBaseUnitCost: { numerator: '90', denominator: '1' },
    });
    expect(transition.costedQuantityBaseMicros).toBe(1_000_000);
    expect(transition.state.coverageStatus).toBe('KNOWN');
    expect(transition.state.remainingValue).toEqual({ numerator: '90', denominator: '1' });
  });

  it('marks positive unknown coverage unavailable until stock is non-positive', () => {
    const unknown = {
      coverageStatus: 'UNKNOWN' as const,
      quantityCostedBaseMicros: 0,
      remainingValue: { numerator: '0', denominator: '1' },
      averageUnitCost: null,
    };
    const sale = applySaleCostState(unknown, {
      priorInventoryBalanceBaseMicros: 5_000_000,
      saleQuantityBaseMicros: 1_000_000,
    });
    expect(sale.available).toBe(false);
    expect(sale.cogsAmountMinor).toBeNull();
    expect(sale.state.coverageStatus).toBe('UNKNOWN');
  });

  it('rejects costed quantity overflow instead of rounding', () => {
    expect(() => applyPurchaseCostState(initialCostState(), {
      priorInventoryBalanceBaseMicros: Number.MAX_SAFE_INTEGER,
      receiptQuantityBaseMicros: 1,
      receiptBaseUnitCost: { numerator: '1', denominator: '1' },
    })).toThrow(DomainError);
  });

  it('preserves weighted-average fractions and consumes them with half-up COGS', () => {
    const first = applyPurchaseCostState(initialCostState(), {
      priorInventoryBalanceBaseMicros: 0,
      receiptQuantityBaseMicros: 20_000_000,
      receiptBaseUnitCost: { numerator: '30000', denominator: '1' },
    });
    const second = applyPurchaseCostState(first.state, {
      priorInventoryBalanceBaseMicros: first.state.quantityCostedBaseMicros,
      receiptQuantityBaseMicros: 40_000_000,
      receiptBaseUnitCost: { numerator: '35000', denominator: '1' },
    });

    expect(second.state.quantityCostedBaseMicros).toBe(60_000_000);
    expect(second.state.remainingValue).toEqual({ numerator: '2000000', denominator: '1' });
    expect(second.state.averageUnitCost).toEqual({ numerator: '100000', denominator: '3' });

    const one = applySaleCostState(second.state, {
      priorInventoryBalanceBaseMicros: 60_000_000,
      saleQuantityBaseMicros: 1_000_000,
    });
    expect(one.available).toBe(true);
    expect(one.valueConsumed).toEqual({ numerator: '100000', denominator: '3' });
    expect(one.cogsAmountMinor).toBe(33_333);

    const three = applySaleCostState(second.state, {
      priorInventoryBalanceBaseMicros: 60_000_000,
      saleQuantityBaseMicros: 3_000_000,
    });
    expect(three.available).toBe(true);
    expect(three.valueConsumed).toEqual({ numerator: '100000', denominator: '1' });
    expect(three.cogsAmountMinor).toBe(100_000);
  });

  it('keeps zero-cost receipts known and makes oversells unavailable without losing the ledger transition', () => {
    const zero = applyPurchaseCostState(initialCostState(), {
      priorInventoryBalanceBaseMicros: 0,
      receiptQuantityBaseMicros: 2_000_000,
      receiptBaseUnitCost: { numerator: '0', denominator: '1' },
    });
    expect(zero.state.coverageStatus).toBe('KNOWN');
    expect(zero.state.averageUnitCost).toEqual({ numerator: '0', denominator: '1' });

    const oversell = applySaleCostState(zero.state, {
      priorInventoryBalanceBaseMicros: 2_000_000,
      saleQuantityBaseMicros: 3_000_000,
    });
    expect(oversell.available).toBe(false);
    expect(oversell.cogsAmountMinor).toBeNull();
    expect(oversell.state.coverageStatus).toBe('KNOWN');

    const replenished = applyPurchaseCostState(oversell.state, {
      priorInventoryBalanceBaseMicros: -1_000_000,
      receiptQuantityBaseMicros: 2_000_000,
      receiptBaseUnitCost: { numerator: '50', denominator: '1' },
    });
    expect(replenished.state.coverageStatus).toBe('KNOWN');
    expect(replenished.costedQuantityBaseMicros).toBe(1_000_000);
    expect(replenished.state.remainingValue).toEqual({ numerator: '50', denominator: '1' });
  });
});
