import { assertValidId, DomainError } from '@retail/domain';

/** Validate a client-generated record ID. */
export function requireId(id: string): string {
  assertValidId(id);
  return id;
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
