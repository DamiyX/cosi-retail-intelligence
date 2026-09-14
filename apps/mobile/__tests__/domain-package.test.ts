import {
  convertPackagesToBase,
  formatMoney,
  generateId,
  isValidId,
  money,
  moneyFromMajorUnits,
  multiplyMoney,
  parseQuantityDecimal,
} from '@retail/domain';

describe('shared domain package consumption', () => {
  it('generates valid client IDs through the workspace entry point', () => {
    expect(isValidId(generateId())).toBe(true);
  });

  it('computes exact money and micro-unit conversion through the workspace entry point', () => {
    expect(multiplyMoney(moneyFromMajorUnits('19.99', 'NGN'), 3)).toEqual(money(5997, 'NGN'));
    expect(convertPackagesToBase(parseQuantityDecimal('5'), parseQuantityDecimal('40'))).toBe(
      parseQuantityDecimal('200'),
    );
    expect(formatMoney(money(145050, 'NGN'))).toBe('NGN 1,450.50');
  });
});
