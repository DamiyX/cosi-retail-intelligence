import { DomainError } from '../src/errors';
import { toBaseUnits } from '../src/packages';

function expectDomainError(fn: () => unknown, code: DomainError['code']): void {
  try {
    fn();
    throw new Error('Expected a DomainError but none was thrown.');
  } catch (error) {
    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe(code);
  }
}

describe('toBaseUnits', () => {
  it.each([
    [1, 1, 1],
    [10, 1, 10],
    [2, 10, 20],
    [5, 40, 200],
    [0, 40, 0],
  ])('converts %d packages at factor %d into %d base units', (quantity, factor, expected) => {
    expect(toBaseUnits(quantity, factor)).toBe(expected);
  });

  it.each([0, -1, -40, 2.5, Number.NaN, Number.POSITIVE_INFINITY, '10', null])(
    'rejects conversion factor %p',
    (factor) => {
      expectDomainError(() => toBaseUnits(2, factor as number), 'INVALID_CONVERSION');
    },
  );

  it.each([-1, -100, 1.5, Number.NaN, Number.POSITIVE_INFINITY, '2', undefined])(
    'rejects quantity %p',
    (quantity) => {
      expectDomainError(() => toBaseUnits(quantity as number, 10), 'INVALID_QUANTITY');
    },
  );

  it('rejects converted results outside the safe integer range', () => {
    expectDomainError(
      () => toBaseUnits(Number.MAX_SAFE_INTEGER, 2),
      'INVALID_QUANTITY',
    );
  });
});
