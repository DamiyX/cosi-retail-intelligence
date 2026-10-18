export function formatPercentageMagnitude(percentageTenths: string | null): string | null {
  if (percentageTenths === null || !/^-?\d+$/.test(percentageTenths)) return null;
  const value = BigInt(percentageTenths);
  const magnitude = value < 0n ? -value : value;
  return `${magnitude / 10n}.${magnitude % 10n}%`;
}

export function formatObservedDate(value: string): string {
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? 'Date unavailable' : timestamp.toLocaleDateString();
}
