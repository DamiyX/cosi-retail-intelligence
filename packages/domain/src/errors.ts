export type DomainErrorCode =
  | 'INVALID_ID'
  | 'INVALID_MONEY'
  | 'INVALID_QUANTITY'
  | 'INVALID_CONVERSION'
  | 'CURRENCY_MISMATCH';

/**
 * Typed failure for invalid domain input or unsafe domain arithmetic.
 * Repository and application layers propagate this so callers can distinguish
 * bad input from infrastructure failures.
 */
export class DomainError extends Error {
  readonly code: DomainErrorCode;

  constructor(code: DomainErrorCode, message: string) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
  }
}
