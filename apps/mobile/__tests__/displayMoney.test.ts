import { formatMoney, money } from '@retail/domain';

import { displayMoney, displayRationalMinorPerBaseUnit } from '../src/ui/money';

describe('displayMoney', () => {
  it.each([
    [145050, 'NGN', '₦1,450.50'],
    [145000, 'NGN', '₦1,450.00'],
    [0, 'NGN', '₦0.00'],
    [9999, 'USD', '$99.99'],
  ])('formats %d minor units in %s', (minor, code, expected) => {
    expect(displayMoney(minor, code)).toBe(expected);
  });

  it('omits the line when no price is set', () => {
    expect(displayMoney(null, 'NGN')).toBeNull();
    expect(displayMoney(undefined, 'NGN')).toBeNull();
  });

  it('falls back to the currency code for unknown currencies', () => {
    expect(displayMoney(100, 'KES')).toBe(formatMoney(money(100, 'KES')));
  });

  it('formats exact rational estimates without narrowing valid large values to Number', () => {
    expect(displayRationalMinorPerBaseUnit('10000000000000000', '1', 'NGN')).toBe('₦100,000,000,000,000.00');
    expect(displayRationalMinorPerBaseUnit('100', '3', 'NGN')).toBe('₦0.33');
    expect(displayRationalMinorPerBaseUnit('0', '1', 'NGN')).toBe('₦0.00');
    expect(displayRationalMinorPerBaseUnit(null, '1', 'NGN')).toBeNull();
  });
});
