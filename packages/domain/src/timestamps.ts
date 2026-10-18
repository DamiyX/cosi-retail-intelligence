import { DomainError } from './errors';

export interface TimestampInstant { seconds: number; fraction: string }

/** Keep arbitrary accepted fractional precision; canonical digits have no trailing zeroes. */
export function parseTimestampInstant(value: string): TimestampInstant | null {
  const iso = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (iso) {
    const milliseconds = Date.parse(iso[1] + iso[3]);
    if (!Number.isFinite(milliseconds)) return null;
    return { seconds: milliseconds / 1000, fraction: (iso[2] ?? '').replace(/0+$/, '') };
  }
  // Preserve the domain's existing Date.parse-compatible legacy inputs.
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) return null;
  const seconds = Math.floor(milliseconds / 1000);
  return { seconds, fraction: String(milliseconds - seconds * 1000).padStart(3, '0').replace(/0+$/, '') };
}

export function compareTimestampInstants(left: string, right: string): -1 | 0 | 1 {
  const a = parseTimestampInstant(left), b = parseTimestampInstant(right);
  if (!a || !b) throw new DomainError('INVALID_VALUE', 'Timestamp must be a valid date and time.');
  if (a.seconds !== b.seconds) return a.seconds < b.seconds ? -1 : 1;
  return a.fraction === b.fraction ? 0 : a.fraction < b.fraction ? -1 : 1;
}
