import { DomainError } from './errors';

export type BatchDatePrecision = 'UNKNOWN' | 'MONTH' | 'DAY';
export type BatchDateMeaning = 'EXPIRY' | 'BEST_BEFORE' | 'UNSPECIFIED';
export type BatchGroupOrigin = 'RECEIPT' | 'PHYSICAL_INSPECTION';

export interface BatchDateInput {
  precision?: BatchDatePrecision;
  value?: string | null;
  meaning?: BatchDateMeaning;
  printedBatchNumber?: string | null;
}

export interface NormalizedBatchDate {
  precision: BatchDatePrecision;
  value: string | null;
  meaning: BatchDateMeaning;
  printedBatchNumber: string | null;
}

const DATE_MEANINGS: readonly BatchDateMeaning[] = ['EXPIRY', 'BEST_BEFORE', 'UNSPECIFIED'];
const DATE_PRECISIONS: readonly BatchDatePrecision[] = ['UNKNOWN', 'MONTH', 'DAY'];

function isValidCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const candidate = new Date(Date.UTC(year, month - 1, day));
  return candidate.getUTCFullYear() === year
    && candidate.getUTCMonth() === month - 1
    && candidate.getUTCDate() === day;
}

function isValidCalendarMonth(value: string): boolean {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return false;
  const month = Number(match[2]);
  return month >= 1 && month <= 12;
}

/** Normalize the optional printed date without inventing precision. */
export function normalizeBatchDate(input: BatchDateInput = {}): NormalizedBatchDate {
  const precision = input.precision ?? 'UNKNOWN';
  if (!DATE_PRECISIONS.includes(precision)) {
    throw new DomainError('INVALID_VALUE', 'Batch date precision must be UNKNOWN, MONTH, or DAY.');
  }
  const meaning = input.meaning ?? 'UNSPECIFIED';
  if (!DATE_MEANINGS.includes(meaning)) {
    throw new DomainError('INVALID_VALUE', 'Batch date meaning is invalid.');
  }
  const value = input.value === undefined || input.value === null ? null : input.value.trim();
  if (precision === 'UNKNOWN') {
    if (value !== null && value.length > 0) {
      throw new DomainError('INVALID_VALUE', 'An unknown batch date cannot include a date value.');
    }
  } else if (precision === 'MONTH') {
    if (value === null || !isValidCalendarMonth(value)) {
      throw new DomainError('INVALID_VALUE', 'Month dates must use the YYYY-MM calendar format.');
    }
  } else if (value === null || !isValidCalendarDate(value)) {
    throw new DomainError('INVALID_VALUE', 'Day dates must use the valid YYYY-MM-DD calendar format.');
  }
  const printedBatchNumber = input.printedBatchNumber === undefined || input.printedBatchNumber === null
    ? null
    : input.printedBatchNumber.trim();
  if (printedBatchNumber !== null && printedBatchNumber.length > 128) {
    throw new DomainError('INVALID_VALUE', 'Printed batch number exceeds 128 characters.');
  }
  return {
    precision,
    value: precision === 'UNKNOWN' ? null : value,
    meaning,
    printedBatchNumber: printedBatchNumber && printedBatchNumber.length > 0 ? printedBatchNumber : null,
  };
}

/**
 * Return the conservative FEFO ordering key. A month uses its interval start
 * only for ordering; callers must not present it as an invented exact day.
 */
export function batchDateSortKey(date: Pick<NormalizedBatchDate, 'precision' | 'value'>): string | null {
  if (date.precision === 'DAY') return date.value;
  if (date.precision === 'MONTH') return `${date.value}-01`;
  return null;
}

