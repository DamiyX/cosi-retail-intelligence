import { DomainError } from '../src/errors';
import { MICROS_PER_UNIT } from '../src/packages';
import {
  calculateSaleLine,
  calculateSaleTotals,
  type CalculatedSaleLine,
} from '../src/sales';

function expectDomainError(fn: () => unknown, code: DomainError['code']): void {
  try {
    fn();
    throw new Error('Expected a DomainError but none was thrown.');
  } catch (error) {
    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe(code);
  }
}

describe('D-036 exact sale arithmetic', () => {
  describe('calculateSaleLine', () => {
    it('calculates exact line for whole-quantity discrete package', () => {
      // 3 cartons, 40 base units per carton, unit price 5,000 minor units (e.g. ₦50.00), no discount
      const line = calculateSaleLine({
        quantityPackagesMicros: 3 * MICROS_PER_UNIT,
        conversionToBaseMicros: 40 * MICROS_PER_UNIT,
        unitPriceMinor: 5000,
      });

      expect(line).toEqual({
        quantityPackagesMicros: 3_000_000,
        conversionToBaseMicros: 40_000_000,
        quantityBaseMicros: 120_000_000,
        unitPriceMinor: 5000,
        grossTotalMinor: 15000,
        discountAmountMinor: 0,
        netTotalMinor: 15000,
      });
    });

    it('calculates exact line with valid fractional quantity and conversion', () => {
      // 0.5 kg (500,000 micros), 1,000 grams per kg (1,000,000,000 micros), unit price 2,500 minor units, discount 100
      const line = calculateSaleLine({
        quantityPackagesMicros: 500_000,
        conversionToBaseMicros: 1000 * MICROS_PER_UNIT,
        unitPriceMinor: 2500,
        discountAmountMinor: 100,
      });

      expect(line).toEqual({
        quantityPackagesMicros: 500_000,
        conversionToBaseMicros: 1_000_000_000,
        quantityBaseMicros: 500_000_000,
        unitPriceMinor: 2500,
        grossTotalMinor: 1250, // 2500 * 0.5 = 1250
        discountAmountMinor: 100,
        netTotalMinor: 1150,
      });
    });

    it('allows 100% discount where net total becomes zero', () => {
      const line = calculateSaleLine({
        quantityPackagesMicros: 1 * MICROS_PER_UNIT,
        conversionToBaseMicros: 1 * MICROS_PER_UNIT,
        unitPriceMinor: 1000,
        discountAmountMinor: 1000,
      });

      expect(line.grossTotalMinor).toBe(1000);
      expect(line.discountAmountMinor).toBe(1000);
      expect(line.netTotalMinor).toBe(0);
    });

    it('allows zero unit price', () => {
      const line = calculateSaleLine({
        quantityPackagesMicros: 2 * MICROS_PER_UNIT,
        conversionToBaseMicros: 1 * MICROS_PER_UNIT,
        unitPriceMinor: 0,
        discountAmountMinor: 0,
      });

      expect(line.grossTotalMinor).toBe(0);
      expect(line.netTotalMinor).toBe(0);
    });

    it('rejects zero package quantity', () => {
      expectDomainError(
        () =>
          calculateSaleLine({
            quantityPackagesMicros: 0,
            conversionToBaseMicros: 1 * MICROS_PER_UNIT,
            unitPriceMinor: 1000,
          }),
        'INVALID_QUANTITY',
      );
    });

    it('rejects negative package quantity', () => {
      expectDomainError(
        () =>
          calculateSaleLine({
            quantityPackagesMicros: -1_000_000,
            conversionToBaseMicros: 1 * MICROS_PER_UNIT,
            unitPriceMinor: 1000,
          }),
        'INVALID_QUANTITY',
      );
    });

    it('rejects zero or negative conversion factor', () => {
      expectDomainError(
        () =>
          calculateSaleLine({
            quantityPackagesMicros: 1_000_000,
            conversionToBaseMicros: 0,
            unitPriceMinor: 1000,
          }),
        'INVALID_QUANTITY',
      );
      expectDomainError(
        () =>
          calculateSaleLine({
            quantityPackagesMicros: 1_000_000,
            conversionToBaseMicros: -1_000_000,
            unitPriceMinor: 1000,
          }),
        'INVALID_QUANTITY',
      );
    });

    it('rejects negative unit price', () => {
      expectDomainError(
        () =>
          calculateSaleLine({
            quantityPackagesMicros: 1_000_000,
            conversionToBaseMicros: 1_000_000,
            unitPriceMinor: -500,
          }),
        'INVALID_MONEY',
      );
    });

    it('rejects negative discount', () => {
      expectDomainError(
        () =>
          calculateSaleLine({
            quantityPackagesMicros: 1_000_000,
            conversionToBaseMicros: 1_000_000,
            unitPriceMinor: 1000,
            discountAmountMinor: -50,
          }),
        'INVALID_MONEY',
      );
    });

    it('rejects discount greater than gross total', () => {
      expectDomainError(
        () =>
          calculateSaleLine({
            quantityPackagesMicros: 1_000_000,
            conversionToBaseMicros: 1_000_000,
            unitPriceMinor: 1000,
            discountAmountMinor: 1001,
          }),
        'INVALID_MONEY',
      );
    });

    it('rejects fractional minor currency units rather than silently rounding', () => {
      // 0.333333 packages at 100 minor units: 100 * 333333 = 33,333,300 micros -> 33.3333 minor units (remainder 333,300)
      expectDomainError(
        () =>
          calculateSaleLine({
            quantityPackagesMicros: 333_333,
            conversionToBaseMicros: 1_000_000,
            unitPriceMinor: 100,
          }),
        'INVALID_MONEY',
      );
    });

    it('rejects quantities that produce fractional base units', () => {
      // 1 micro-unit of package with conversion 3 micros per package unit -> 3 / 1,000,000 has remainder
      expectDomainError(
        () =>
          calculateSaleLine({
            quantityPackagesMicros: 1,
            conversionToBaseMicros: 3,
            unitPriceMinor: 1_000_000,
          }),
        'INVALID_CONVERSION',
      );
    });

    it('rejects non-integer micros or non-safe integer values', () => {
      expectDomainError(
        () =>
          calculateSaleLine({
            quantityPackagesMicros: 1.5,
            conversionToBaseMicros: 1_000_000,
            unitPriceMinor: 1000,
          }),
        'INVALID_QUANTITY',
      );
      expectDomainError(
        () =>
          calculateSaleLine({
            quantityPackagesMicros: Number.MAX_SAFE_INTEGER + 1,
            conversionToBaseMicros: 1_000_000,
            unitPriceMinor: 1000,
          }),
        'INVALID_QUANTITY',
      );
    });
  });

  describe('calculateSaleTotals', () => {
    it('calculates totals across multiple lines', () => {
      const line1: CalculatedSaleLine = {
        quantityPackagesMicros: 2_000_000,
        conversionToBaseMicros: 1_000_000,
        quantityBaseMicros: 2_000_000,
        unitPriceMinor: 1500,
        grossTotalMinor: 3000,
        discountAmountMinor: 200,
        netTotalMinor: 2800,
      };

      const line2: CalculatedSaleLine = {
        quantityPackagesMicros: 1_000_000,
        conversionToBaseMicros: 10_000_000,
        quantityBaseMicros: 10_000_000,
        unitPriceMinor: 5000,
        grossTotalMinor: 5000,
        discountAmountMinor: 0,
        netTotalMinor: 5000,
      };

      const totals = calculateSaleTotals([line1, line2]);

      expect(totals).toEqual({
        subtotalMinor: 8000,
        discountTotalMinor: 200,
        totalMinor: 7800,
        lineCount: 2,
      });
    });

    it('rejects empty lines array', () => {
      expectDomainError(() => calculateSaleTotals([]), 'INVALID_VALUE');
    });

    it('maintains total = subtotal - discount invariant', () => {
      const line1: CalculatedSaleLine = {
        quantityPackagesMicros: 1_000_000,
        conversionToBaseMicros: 1_000_000,
        quantityBaseMicros: 1_000_000,
        unitPriceMinor: 12345,
        grossTotalMinor: 12345,
        discountAmountMinor: 345,
        netTotalMinor: 12000,
      };

      const totals = calculateSaleTotals([line1]);
      expect(totals.totalMinor).toBe(totals.subtotalMinor - totals.discountTotalMinor);
    });

    it('rejects structurally fabricated lines that do not preserve exact line invariants', () => {
      const fabricated: CalculatedSaleLine = {
        quantityPackagesMicros: 1_000_000,
        conversionToBaseMicros: 1_000_000,
        quantityBaseMicros: 1_000_000,
        unitPriceMinor: 5000,
        grossTotalMinor: 5000,
        discountAmountMinor: 100,
        netTotalMinor: 4999,
      };

      expectDomainError(() => calculateSaleTotals([fabricated]), 'INVALID_VALUE');
    });
  });
});
