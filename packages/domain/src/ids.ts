import { DomainError } from './errors';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function defaultRandomBytes(length: number): Uint8Array {
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
 * Format 16 random bytes as a UUIDv4 string. Pure function: the entropy
 * source stays outside so each runtime (Node, browser, Android) supplies
 * its own supported provider while formatting stays identical everywhere.
 */
export function formatUuidV4(randomBytes: Uint8Array): string {
  if (!(randomBytes instanceof Uint8Array) || randomBytes.length !== 16) {
    throw new DomainError('INVALID_ID', 'UUIDv4 formatting requires exactly 16 random bytes.');
  }
  const bytes = Uint8Array.from(randomBytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = toHex(bytes);
  return (
    `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-` +
    `${hex.slice(16, 20)}-${hex.slice(20, 32)}`
  );
}

/**
 * Build an ID generator from an explicit entropy source. Application
 * operations accept the generator by injection so Android can supply its
 * Expo-supported provider instead of assuming a global.
 */
export function createIdGenerator(randomBytes: () => Uint8Array): () => string {
  return () => formatUuidV4(randomBytes());
}

/**
 * Generate a random UUIDv4 client ID using the platform cryptographic
 * source. IDs are created on-device before any server contact, so offline
 * records already carry their final globally unique identity (D-010).
 * Runtimes without globalThis.crypto must inject their own provider via
 * createIdGenerator instead of calling this.
 */
export function generateId(): string {
  return formatUuidV4(defaultRandomBytes(16));
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
