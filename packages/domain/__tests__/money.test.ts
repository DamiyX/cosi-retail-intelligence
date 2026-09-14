import { DomainError } from '../src/errors';
import {
  addMoney,
  compareMoney,
  equalMoney,
  money,
  moneyFromMajorUnits,
  multiplyMoney,
  subtractMoney,
} from '../src/money';

function expectMoneyError(fn: () => unknown, code: DomainError['code']): void {
  try {
    fn();
    throw new Error('Expected a DomainError but none was thrown.');
  } catch (error) {
    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe(code);
  }
}

describe('money', () => {
  it('stores integer minor units with a currency code', () => {
    expect(money(125050, 'NGN')).toEqual({ amountMinorUnits: 125050, currencyCode: 'NGN' });
  });

  it.each([1250.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
    'rejects unsafe minor-unit input %p',
    (value) => {
      expectMoneyError(() => money(value, 'NGN'), 'INVALID_MONEY');
    },
  );

  it.each(['ngn', 'N', 'NGNA', 'N1N', '', 42, null])('rejects currency code %p', (value) => {
    expectMoneyError(() => money(100, value as string), 'INVALID_MONEY');
  });
});

describe('moneyFromMajorUnits', () => {
  it.each([
    ['1250.50', 125050],
    ['1250.5', 125050],
    ['1250', 125000],
    ['0', 0],
    ['0.07', 7],
    ['-12.34', -1234],
  ])('parses %s exactly into %d minor units', (input, expected) => {
    expect(moneyFromMajorUnits(input, 'NGN')).toEqual({ amountMinorUnits: expected, currencyCode: 'NGN' });
  });

  it('parses finite numbers through their exact decimal text', () => {
    expect(moneyFromMajorUnits(19.99, 'NGN').amountMinorUnits).toBe(1999);
  });

  it.each(['', 'abc', '12.345', '1,250.50', '₦50', '12.', '.5', '1e3', '--5'])(
    'rejects decimal text %p instead of rounding',
    (input) => {
      expectMoneyError(() => moneyFromMajorUnits(input, 'NGN'), 'INVALID_MONEY');
    },
  );

  it.each([Number.NaN, Number.POSITIVE_INFINITY, 19.995])('rejects unsafe number %p', (value) => {
    expectMoneyError(() => moneyFromMajorUnits(value, 'NGN'), 'INVALID_MONEY');
  });
});

describe('money arithmetic', () => {
  it('adds and subtracts same-currency amounts exactly', () => {
    expect(addMoney(money(10000, 'NGN'), money(250, 'NGN'))).toEqual(money(10250, 'NGN'));
    expect(subtractMoney(money(10000, 'NGN'), money(250, 'NGN'))).toEqual(money(9750, 'NGN'));
  });

  it('multiplies by integer quantities without floating-point math', () => {
    expect(multiplyMoney(money(1999, 'NGN'), 3)).toEqual(money(5997, 'NGN'));
    expect(multiplyMoney(money(1999, 'NGN'), 0)).toEqual(money(0, 'NGN'));
  });

  it.each([1.5, -1, Number.NaN, Number.MAX_SAFE_INTEGER + 1])('rejects multiplier %p', (quantity) => {
    expectMoneyError(() => multiplyMoney(money(100, 'NGN'), quantity), 'INVALID_MONEY');
  });

  it('rejects cross-currency operations', () => {
    const naira = money(100, 'NGN');
    const dollars = money(100, 'USD');
    expectMoneyError(() => addMoney(naira, dollars), 'CURRENCY_MISMATCH');
    expectMoneyError(() => subtractMoney(naira, dollars), 'CURRENCY_MISMATCH');
    expect(() => compareMoney(naira, dollars)).toThrow(DomainError);
  });

  it('compares and equates amounts', () => {
    expect(compareMoney(money(100, 'NGN'), money(200, 'NGN'))).toBe(-1);
    expect(compareMoney(money(200, 'NGN'), money(200, 'NGN'))).toBe(0);
    expect(compareMoney(money(300, 'NGN'), money(200, 'NGN'))).toBe(1);
    expect(equalMoney(money(200, 'NGN'), money(200, 'NGN'))).toBe(true);
    expect(equalMoney(money(200, 'NGN'), money(200, 'USD'))).toBe(false);
  });

  it('rejects results outside the safe integer range', () => {
    expectMoneyError(
      () => addMoney(money(Number.MAX_SAFE_INTEGER, 'NGN'), money(1, 'NGN')),
      'INVALID_MONEY',
    );
  });
});
