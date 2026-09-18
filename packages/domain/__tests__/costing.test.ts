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
});
