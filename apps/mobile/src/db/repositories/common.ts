import { assertValidId, DomainError } from '@retail/domain';

/** Validate a client-generated record ID. */
export function requireId(id: string): string {
  assertValidId(id);
  return id;
}

/** Validate an optional foreign-key ID: absent, or a canonical ID. */
export function optionalId(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  assertValidId(value);
  return value;
}

/** Validate required short text: non-empty with a documented accident cap. */
export function requireText(value: unknown, field: string, maxLength = 500): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new DomainError('INVALID_VALUE', `${field} must be a non-empty string.`);
  }
  if (value.length > maxLength) {
    throw new DomainError('INVALID_VALUE', `${field} exceeds ${maxLength} characters.`);
  }
  return value;
}

/** Validate optional text: absent, or non-empty within the cap. */
export function optionalText(value: unknown, field: string, maxLength = 500): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  return requireText(value, field, maxLength);
}

/** Current UTC time for record timestamps. */
export function nowIso(): string {
  return new Date().toISOString();
}

/** Read a 0/1 SQLite flag as a boolean. */
export function toBoolean(value: number): boolean {
  return value === 1;
}

/** Write a boolean as a 0/1 SQLite flag. */
export function fromBoolean(value: boolean): number {
  return value ? 1 : 0;
}

/**
 * Validate an optional money amount in integer minor units: absent, or a
 * non-negative safe integer. Binary-float money never reaches storage.
 */
export function optionalMoneyMinor(value: unknown, field: string): number | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new DomainError('INVALID_VALUE', `${field} must be null or non-negative integer minor units.`);
  }
  return value;
}

/**
 * Validate an optional micro-unit quantity: absent, or a non-negative safe
 * integer in micro-units (D-034). Decimal text must be parsed with
 * parseQuantityDecimal before calling.
 */
export function optionalMicros(value: unknown, field: string): number | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new DomainError('INVALID_VALUE', `${field} must be null or non-negative integer micro-units.`);
  }
  return value;
}

/** Validate a strictly positive micro-unit conversion factor. */
export function requirePositiveMicros(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new DomainError('INVALID_VALUE', `${field} must be a positive integer in micro-units.`);
  }
  return value;
}
