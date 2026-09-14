import { DomainError } from './errors';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function randomBytes(length: number): Uint8Array {
  const cryptoRef = globalThis.crypto;
  if (!cryptoRef || typeof cryptoRef.getRandomValues !== 'function') {
    throw new Error('A cryptographic random source (crypto.getRandomValues) is required to generate IDs.');
  }
  return cryptoRef.getRandomValues(new Uint8Array(length));
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a random UUIDv4 client ID using the platform cryptographic source.
 * IDs are created on-device before any server contact, so offline records
 * already carry their final globally unique identity (D-010).
 */
export function generateId(): string {
  const bytes = randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = toHex(bytes);
  return (
    `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-` +
    `${hex.slice(16, 20)}-${hex.slice(20, 32)}`
  );
}

/** Return true only for canonical 8-4-4-4-12 hexadecimal IDs. */
export function isValidId(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

/** Throw a typed error unless the value is a canonical ID. */
export function assertValidId(value: unknown): asserts value is string {
  if (!isValidId(value)) {
    throw new DomainError('INVALID_ID', 'Expected a canonical UUID identifier.');
  }
}
