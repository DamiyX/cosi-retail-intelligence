import { DomainError } from '../src/errors';
import { formatMoney, money } from '../src/money';
import {
  convertPackagesToBase,
  formatQuantityMicros,
  MICROS_PER_UNIT,
  parseQuantityDecimal,
} from '../src/packages';

function expectDomainError(fn: () => unknown, code: DomainError['code']): void {
  try {
    fn();
    throw new Error('Expected a DomainError but none was thrown.');
  } catch (error) {
    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe(code);
  }
}

describe('D-034 micro-unit quantities', () => {
  it('uses one million micro-units per base unit', () => {
    expect(MICROS_PER_UNIT).toBe(1_000_000);
  });

  it.each([
    ['0', 0],
    ['1', 1_000_000],
    ['40', 40_000_000],
    ['0.5', 500_000],
    ['2.000001', 2_000_001],
    ['0.000001', 1],
    ['  3.25  ', 3_250_000],
    ['007', 7_000_000],
  ])('parses %p exactly into %d micro-units', (text, expected) => {
    expect(parseQuantityDecimal(text)).toBe(expected);
  });

  it.each([
    '',
    '   ',
    '-1',
    '+2',
    '1.',
    '.5',
    '1.0000001',
    '1,000',
    'NaN',
    'Infinity',
    '1e3',
    '0x10',
    'two',
    '9007199254740993',
  ])('rejects quantity text %p without rounding', (text) => {
    expectDomainError(() => parseQuantityDecimal(text), 'INVALID_QUANTITY');
  });

  it.each([
    [0, '0'],
    [1_000_000, '1'],
    [40_000_000, '40'],
    [500_000, '0.5'],
    [2_000_001, '2.000001'],
    [1, '0.000001'],
    [3_250_000, '3.25'],
  ])('formats %d micro-units as canonical %p', (micros, expected) => {
    expect(formatQuantityMicros(micros)).toBe(expected);
  });

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects non-micro-unit value %p for formatting',
    (value) => {
      expectDomainError(() => formatQuantityMicros(value), 'INVALID_QUANTITY');
    },
  );

  it('round-trips accepted decimal input through canonical form', () => {
    expect(formatQuantityMicros(parseQuantityDecimal('40.500000'))).toBe('40.5');
    expect(formatQuantityMicros(parseQuantityDecimal('0.000001'))).toBe('0.000001');
  });

  it.each([
    [2_000_000, 40_000_000, 80_000_000],
    [1_000_000, 1_000_000, 1_000_000],
    [500_000, 2_000_000, 1_000_000],
    [0, 40_000_000, 0],
    [1_000_000, 333_333, 333_333],
  ])(
    'converts %d package micro-units at factor %d into %d base micro-units',
    (quantity, factor, expected) => {
      expect(convertPackagesToBase(quantity, factor)).toBe(expected);
    },
  );

  it('converts a fractional package across a fractional factor exactly', () => {
    // 0.5 packs of 2.5 kg (base grams): 0.5 * 2500 g = 1250 g.
    expect(convertPackagesToBase(500_000, 2_500_000_000)).toBe(1_250_000_000);
  });

  it('rejects a conversion with no exact micro-unit result instead of rounding', () => {
    // One micro-unit of a package worth a third of a base micro-unit.
    expectDomainError(() => convertPackagesToBase(1, 333_333), 'INVALID_CONVERSION');
  });

  it.each([0, -1, -40, 2.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects conversion factor %p',
    (factor) => {
      expectDomainError(() => convertPackagesToBase(2_000_000, factor), 'INVALID_CONVERSION');
    },
  );

  it.each([-1, -100, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects package quantity %p',
    (quantity) => {
      expectDomainError(() => convertPackagesToBase(quantity, 10_000_000), 'INVALID_QUANTITY');
    },
  );

  it('rejects converted results outside the safe integer range', () => {
    expectDomainError(
      () => convertPackagesToBase(Number.MAX_SAFE_INTEGER, 2_000_000),
      'INVALID_QUANTITY',
    );
  });

  it('uses no binary floating point for authoritative values', () => {
    // 0.1 + 0.2 drift must not leak into parsed quantities.
    expect(parseQuantityDecimal('0.1') + parseQuantityDecimal('0.2')).toBe(
      parseQuantityDecimal('0.3'),
    );
  });
});

describe('formatMoney', () => {
  it.each([
    [145050, 'NGN 1,450.50'],
    [145000, 'NGN 1,450.00'],
    [0, 'NGN 0.00'],
    [-250, 'NGN -2.50'],
    [123456789, 'NGN 1,234,567.89'],
  ])('formats %d minor units as %p', (minor, expected) => {
    expect(formatMoney(money(minor, 'NGN'))).toBe(expected);
  });
});
