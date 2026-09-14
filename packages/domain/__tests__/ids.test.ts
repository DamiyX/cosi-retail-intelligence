import { DomainError } from '../src/errors';
import { assertValidId, generateId, isValidId } from '../src/ids';

describe('generateId', () => {
  it('produces canonical UUID strings', () => {
    expect(isValidId(generateId())).toBe(true);
  });

  it('marks version 4 and the RFC variant bits', () => {
    const id = generateId();
    expect(id[14]).toBe('4');
    expect('89ab').toContain(id[19].toLowerCase());
  });

  it('produces unique values across a large batch', () => {
    const seen = new Set<string>();
    for (let index = 0; index < 5000; index += 1) {
      seen.add(generateId());
    }
    expect(seen.size).toBe(5000);
  });
});

describe('isValidId', () => {
  it.each([
    '123e4567-e89b-42d3-a456-426614174000',
    'AAAAAAAA-BBBB-4CCC-8DDD-EEEEEEEEEEEE',
  ])('accepts canonical UUID %s', (value) => {
    expect(isValidId(value)).toBe(true);
  });

  it.each([
    '',
    'not-an-id',
    '123e4567-e89b-12d3-a456-42661417400',
    '123e4567-e89b-12d3-a456-4266141740000',
    '123e4567e89b12d3a456426614174000',
    '123e4567_e89b_12d3_a456_426614174000',
    'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    null,
    undefined,
    42,
    {},
    [],
  ])('rejects invalid identifier %p', (value) => {
    expect(isValidId(value)).toBe(false);
  });
});

describe('assertValidId', () => {
  it('passes valid IDs through without throwing', () => {
    expect(() => assertValidId(generateId())).not.toThrow();
  });

  it('throws a typed error for invalid IDs', () => {
    try {
      assertValidId('bad-id');
      throw new Error('assertValidId did not throw');
    } catch (error) {
      expect(error).toBeInstanceOf(DomainError);
      expect((error as DomainError).code).toBe('INVALID_ID');
    }
  });
});
