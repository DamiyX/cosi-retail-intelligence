export const views = ['Front', 'Rear', 'Complementary view 1', 'Complementary view 2'] as const;
export type BarcodeDisposition = 'UNAVAILABLE' | 'NOT_PRESENTED' | 'UNREADABLE' | 'DECLINED' | 'PENDING' | 'CONFIRMED' | 'CONFLICT';
export type SavedView = { job: number; receipt: string };
export type EnrollmentSnapshot = {
  schema: 1; sequence: number; revision: number; epoch: number; selectedProduct: number;
  busy: boolean; interrupted: string; frozen: string; barcodeAvailable: boolean;
  products: { label: string; views: (SavedView | null)[]; barcode: BarcodeDisposition; barcodeValue: string; barcodeEpoch: number; encodedBytes: number }[];
  candidate: { product: number; view: number; job: number; epoch: number; receipt: string } | null;
  sourceSha256: string;
};
/** Native owns the journal and bytes. Requests carry snapshot identities, never image paths or vectors. */
export interface EnrollmentBridge {
  snapshot(): Promise<unknown>;
  recover?(sequence: number): Promise<unknown>;
  enableBarcodes(sequence: number): Promise<unknown>;
  openBarcode(sequence: number, product: number, view: number, previousReceipt: string): Promise<unknown>;
  confirmBarcode(sequence: number, product: number, epoch: number, accept: boolean): Promise<unknown>;
  select(sequence: number, product: number): Promise<unknown>;
  openCapture(sequence: number, product: number, view: number, previousReceipt: string): Promise<unknown>;
  reviewCandidate(sequence: number, job: number): Promise<unknown>;
  keep(sequence: number, job: number, epoch: number): Promise<unknown>;
  decline(sequence: number, job: number, epoch: number): Promise<unknown>;
  freeze(sequence: number): Promise<unknown>;
  newRevision(sequence: number): Promise<unknown>;
}
const hash = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
function code(value: string) {
  if (!/^(?:[0-9]{8}|[0-9]{12}|[0-9]{13})$/.test(value)) return false;
  let sum = 0, weight = 3;
  for (let i = value.length - 2; i >= 0; i--) { sum += Number(value[i]) * weight; weight = weight === 3 ? 1 : 3; }
  return (10 - sum % 10) % 10 === Number(value.at(-1));
}
const integer = (value: unknown, max: number): value is number => Number.isInteger(value) && (value as number) >= 0 && (value as number) <= max;
function requireFact(ok: unknown): asserts ok { if (!ok) throw new Error('ENROLLMENT_SNAPSHOT_INVALID'); }
function record(value: unknown): Record<string, unknown> {
  requireFact(value !== null && typeof value === 'object' && !Array.isArray(value));
  return value as Record<string, unknown>;
}
function exactKeys(value: Record<string, unknown>, keys: string[]) {
  requireFact(Object.keys(value).sort().join('|') === [...keys].sort().join('|'));
}
export function parseEnrollmentSnapshot(input: unknown, expectedSource: string): EnrollmentSnapshot {
  requireFact(hash(expectedSource)); const value = record(input);
  exactKeys(value, ['schema', 'sequence', 'revision', 'epoch', 'selectedProduct', 'busy', 'interrupted', 'frozen', 'barcodeAvailable', 'products', 'candidate', 'sourceSha256']);
  requireFact(value.schema === 1 && integer(value.sequence, 4096) && integer(value.revision, 4096) && value.revision > 0 && integer(value.epoch, Number.MAX_SAFE_INTEGER));
  requireFact(value.sourceSha256 === expectedSource && typeof value.busy === 'boolean' && typeof value.barcodeAvailable === 'boolean');
  requireFact(typeof value.interrupted === 'string' && (value.interrupted === '' || /^(INTERRUPTED|DECLINED):[1-9][0-9]?$/.test(value.interrupted)));
  requireFact(value.frozen === '' || hash(value.frozen));
  requireFact(Array.isArray(value.products) && value.products.length >= 1 && value.products.length <= 10 && integer(value.selectedProduct, value.products.length - 1));
  const jobs = new Set<number>(); const labels = new Set<string>(); const confirmedCodes = new Set<string>();
  const dispositions: BarcodeDisposition[] = ['UNAVAILABLE', 'NOT_PRESENTED', 'UNREADABLE', 'DECLINED', 'PENDING', 'CONFIRMED', 'CONFLICT'];
  value.products.forEach((item, index) => {
    const p = record(item); exactKeys(p, ['label', 'views', 'barcode', 'barcodeValue', 'barcodeEpoch', 'encodedBytes']);
    requireFact(typeof p.label === 'string' && p.label.length > 0 && p.label.length <= 192 && !/[\u0000-\u001f\u007f]/.test(p.label) && !labels.has(p.label)); labels.add(p.label);
    requireFact(typeof p.barcodeValue === 'string' && (p.barcodeValue === '' || code(p.barcodeValue)) && integer(p.barcodeEpoch, value.epoch as number));
    if (p.barcode === 'PENDING' || p.barcode === 'CONFIRMED' || p.barcode === 'CONFLICT') requireFact(p.barcodeValue !== '' && (p.barcodeEpoch as number) > 0);
    if (p.barcode === 'PENDING') requireFact(index === value.selectedProduct && p.barcodeEpoch === value.epoch);
    if (p.barcode === 'CONFIRMED') { const key = (p.barcodeValue as string).length === 12 ? `0${p.barcodeValue as string}` : p.barcodeValue as string; requireFact(!confirmedCodes.has(key)); confirmedCodes.add(key); }
    if (p.barcode === 'UNAVAILABLE' || p.barcode === 'NOT_PRESENTED' || p.barcode === 'UNREADABLE') requireFact(p.barcodeValue === '');
    requireFact(value.barcodeAvailable ? p.barcode !== 'UNAVAILABLE' : p.barcodeEpoch === 0);
    requireFact(dispositions.includes(p.barcode as BarcodeDisposition) && (value.barcodeAvailable || p.barcode === 'UNAVAILABLE'));
    requireFact(integer(p.encodedBytes, 32768) && p.encodedBytes > 0 && Array.isArray(p.views) && p.views.length === 4);
    let missing = false;
    p.views.forEach(ref => {
      if (ref === null) { missing = true; return; }
      requireFact(!missing); const v = record(ref); exactKeys(v, ['job', 'receipt']);
      requireFact(integer(v.job, 64) && v.job > 0 && !jobs.has(v.job) && hash(v.receipt)); jobs.add(v.job);
    });
    if (value.frozen !== '') requireFact(!missing && p.barcode !== 'PENDING' && p.barcode !== 'CONFLICT');
  });
  if (value.candidate !== null) {
    const c = record(value.candidate); exactKeys(c, ['product', 'view', 'job', 'epoch', 'receipt']);
    requireFact(integer(c.product, value.products.length - 1) && c.product === value.selectedProduct && integer(c.view, 3) && integer(c.job, 64) && c.job > 0 && !jobs.has(c.job) && c.epoch === value.epoch && (c.epoch as number) > 0 && hash(c.receipt));
    requireFact(value.frozen === '');
  }
  if (value.busy) requireFact(value.frozen === '');
  return value as unknown as EnrollmentSnapshot;
}
