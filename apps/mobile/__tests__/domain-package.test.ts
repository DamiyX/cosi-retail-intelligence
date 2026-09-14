import {
  generateId,
  isValidId,
  money,
  moneyFromMajorUnits,
  multiplyMoney,
  toBaseUnits,
} from '@retail/domain';

describe('shared domain package consumption', () => {
  it('generates valid client IDs through the workspace entry point', () => {
    expect(isValidId(generateId())).toBe(true);
  });

  it('computes exact money and package conversion through the workspace entry point', () => {
    expect(multiplyMoney(moneyFromMajorUnits('19.99', 'NGN'), 3)).toEqual(money(5997, 'NGN'));
    expect(toBaseUnits(5, 40)).toBe(200);
  });
});
