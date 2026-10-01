import { calculateSaleLine } from '@retail/domain';
import { insertDraftLine, undoDraftAddition, type CartLine } from '../src/sales/draft';

function line(overrides: Partial<CartLine> = {}): CartLine {
  const facts = { quantityPackagesMicros: 1000000, conversionToBaseMicros: 1000000, unitPriceMinor: 100, discountAmountMinor: 0, ...overrides };
  const calculated = calculateSaleLine(facts);
  return { id: 'a', storeProductId: 'store-product', productVariantId: 'variant', packageUnitId: 'package', productName: 'A', packageName: 'piece',
    quantityText: '1', unitPriceText: '1', discountText: '', ...facts, calculated, lineTotalMinor: calculated.netTotalMinor };
}
it('adds exact quantities and incremental Undo only against the unchanged resulting draft', () => {
  const before = [line({ quantityPackagesMicros: 10000000, quantityText: '10' })];
  const addition = insertDraftLine(before, line({ id: 'b' }));
  expect(addition.after).toHaveLength(1);
  expect(addition.after[0]).toMatchObject({ quantityPackagesMicros: 11000000, quantityText: '11', lineTotalMinor: 1100 });
  expect(before[0]!.quantityText).toBe('10');
  expect(undoDraftAddition(addition.after, addition)).toBe(before);
  const edited = [line({ quantityPackagesMicros: 3000000 })];
  expect(undoDraftAddition(edited, addition)).toBe(edited);
  expect(undoDraftAddition([], addition)).toEqual([]);
  const first = insertDraftLine([], line());
  expect(undoDraftAddition(first.after, first)).toEqual([]);
});
it.each<Partial<CartLine>>([
  { storeProductId: 'other' }, { productVariantId: 'other' }, { packageUnitId: 'other' },
  { conversionToBaseMicros: 2000000 }, { unitPriceMinor: 150 }, { productName: 'Renamed' }, { packageName: 'pack' }, { discountAmountMinor: 1 },
])('keeps unlike commercial and description snapshots separate: %j', change => {
  expect(insertDraftLine([line()], line({ id: 'b', ...change })).after).toHaveLength(2);
});
it('preserves fractional exactness and never rounds to make a merge possible', () => {
  const a = line({ quantityPackagesMicros: 500000, quantityText: '0.5' });
  const merged = insertDraftLine([a], line({ id: 'b', quantityPackagesMicros: 500000 }));
  expect(merged.after[0]).toMatchObject({ quantityText: '1', lineTotalMinor: 100 });
  expect(() => line({ quantityPackagesMicros: 333333 })).toThrow(/fractional/);
  const roundingSensitive = { ...a, calculated: { ...a.calculated, grossTotalMinor: 51, netTotalMinor: 51 } };
  expect(() => insertDraftLine([roundingSensitive], a)).toThrow(/exact/);
});
it('rejects quantity and money overflow before changing the previous array', () => {
  const huge = line({ quantityPackagesMicros: Number.MAX_SAFE_INTEGER, unitPriceMinor: 0 });
  const before = [huge];
  expect(() => insertDraftLine(before, line({ unitPriceMinor: 0 }))).toThrow(/safe/);
  expect(before).toEqual([huge]);
  const expensive = [line({ unitPriceMinor: Number.MAX_SAFE_INTEGER })];
  expect(() => insertDraftLine(expensive, line())).toThrow(/safe/);
  expect(expensive).toHaveLength(1);
});
