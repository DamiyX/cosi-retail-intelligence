import { formatMoney, money } from '@retail/domain';

import { displayMoney } from '../src/ui/money';

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
});
