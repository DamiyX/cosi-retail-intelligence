export type DatabaseErrorCode =
  | 'OPEN_FAILED'
  | 'INVALID_MIGRATION_REGISTRY'
  | 'UNEXPECTED_SCHEMA_VERSION'
  | 'MIGRATION_FAILED';

/**
 * Infrastructure failure from the local database boundary (open, pragma,
 * migration, or unexpected schema state). Application code translates this
 * into user-facing states; the original cause stays available in logs.
 */
export class DatabaseError extends Error {
  readonly code: DatabaseErrorCode;
  readonly detail?: unknown;

  constructor(code: DatabaseErrorCode, message: string, detail?: unknown) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.detail = detail;
  }
}
