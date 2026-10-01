import { calculateSaleLine, calculateSaleTotals, formatQuantityMicros, type CalculatedSaleLine } from '@retail/domain';
import { sumSafeIntegers } from '../db/repositories/common';

export interface CartLine {
  id: string;
  storeProductId: string;
  productVariantId: string;
  packageUnitId: string;
  productName: string;
  packageName: string;
  conversionToBaseMicros: number;
  quantityPackagesMicros: number;
  quantityText: string;
  unitPriceMinor: number;
  unitPriceText: string;
  discountAmountMinor: number;
  discountText: string;
  lineTotalMinor: number;
  calculated: CalculatedSaleLine;
}


export interface DraftAddition { before: CartLine[]; after: CartLine[]; added: CartLine }

/** One draft rule for scanner and configured additions; persisted sales are never merged. */
export function insertDraftLine(lines: CartLine[], incoming: CartLine): DraftAddition {
  // Validate the full candidate before any mutation, including aggregate money overflow.
  calculateSaleTotals([...lines, incoming].map(line => line.calculated));
  let after = [...lines, incoming];
  const index = lines.findIndex(line => line.storeProductId === incoming.storeProductId
    && line.productVariantId === incoming.productVariantId && line.packageUnitId === incoming.packageUnitId
    && line.conversionToBaseMicros === incoming.conversionToBaseMicros && line.unitPriceMinor === incoming.unitPriceMinor
    && line.productName === incoming.productName && line.packageName === incoming.packageName
    && line.discountAmountMinor === 0 && incoming.discountAmountMinor === 0);
  if (index !== -1) {
    const previous = lines[index]!;
    const quantity = sumSafeIntegers([previous.quantityPackagesMicros, incoming.quantityPackagesMicros], 'Draft quantity', 'INVALID_QUANTITY');
    const calculated = calculateSaleLine({ ...incoming, quantityPackagesMicros: quantity });
    // Preserve totals/base quantity exactly, even if a future calculation policy changes.
    if (['quantityBaseMicros', 'grossTotalMinor', 'netTotalMinor'].every(key => {
      const field = key as 'quantityBaseMicros' | 'grossTotalMinor' | 'netTotalMinor';
      return BigInt(calculated[field]) === BigInt(previous.calculated[field]) + BigInt(incoming.calculated[field]);
    })) {
      after = lines.map((line, i) => i === index ? { ...previous, quantityPackagesMicros: quantity,
        quantityText: formatQuantityMicros(quantity), calculated, lineTotalMinor: calculated.netTotalMinor } : line);
    }
  }
  calculateSaleTotals(after.map(line => line.calculated));
  return { before: lines, after, added: incoming };
}

/** Reference ownership rejects stale Undo after any later edit, removal or completion. */
export function undoDraftAddition(lines: CartLine[], addition: DraftAddition | null): CartLine[] {
  return addition?.after === lines ? addition.before : lines;
}
