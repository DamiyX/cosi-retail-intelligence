/** Read-only validation of the native observed enrollment codec. No generated 2-D schema, ranking or file access. */
import { createHash } from 'node:crypto';

const model = 'bbbb4c51a55a53905af1daec995ca1aae355046f8839bb8c9f5ce9271394bc40';
const acquisition = 'observed-native-component-enrollment-v1';
const processing = 'native-component-roi-v2-u8-gray128-bilinear224-f32-div255-v1';
const stateCap = 360448, eventCap = stateCap + 256;
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
function requireFact(ok: unknown, code: string): asserts ok { if (!ok) throw Error(code); }
function integer(value: number, min: number, max: number) { requireFact(Number.isSafeInteger(value) && value >= min && value <= max, 'OBSERVED_INTEGER'); return value; }
function modifiedUtf(value: string) {
  const bytes: number[] = [];
  for (let i = 0; i < value.length; i++) { const c = value.charCodeAt(i); if (c > 0 && c <= 127) bytes.push(c); else if (c <= 2047) bytes.push(192 | (c >> 6), 128 | (c & 63)); else bytes.push(224 | (c >> 12), 128 | ((c >> 6) & 63), 128 | (c & 63)); }
  requireFact(bytes.length <= 65535, 'OBSERVED_UTF_LENGTH'); const prefix = Buffer.alloc(2); prefix.writeUInt16BE(bytes.length); return Buffer.concat([prefix, Buffer.from(bytes)]);
}
const intBytes = (value: number) => { const b = Buffer.alloc(4); b.writeInt32BE(value); return b; };
export class ObservedReader {
  readonly bytes: Buffer; at = 0;
  constructor(bytes: Uint8Array, cap: number) { requireFact(bytes.byteLength > 0 && bytes.byteLength <= cap, 'OBSERVED_BYTE_CAP'); this.bytes = Buffer.from(bytes); }
  take(length: number) { integer(length, 0, this.bytes.length - this.at); const result = this.bytes.subarray(this.at, this.at + length); this.at += length; return result; }
  int() { return this.take(4).readInt32BE(); }
  long() { const value = this.take(8).readBigInt64BE(); requireFact(value >= 0n && value <= BigInt(Number.MAX_SAFE_INTEGER), 'OBSERVED_EPOCH'); return Number(value); }
  bool() { const n = this.take(1)[0]; requireFact(n === 0 || n === 1, 'OBSERVED_BOOLEAN'); return n === 1; }
  utf() {
    const length = this.take(2).readUInt16BE(), raw = this.take(length); let value = '';
    for (let i = 0; i < raw.length;) {
      const a = raw[i++]; let c: number;
      if (a < 128) c = a;
      else if ((a & 224) === 192) { requireFact(i < raw.length && (raw[i] & 192) === 128, 'OBSERVED_UTF'); c = ((a & 31) << 6) | (raw[i++] & 63); }
      else { requireFact((a & 240) === 224 && i + 1 < raw.length && (raw[i] & 192) === 128 && (raw[i + 1] & 192) === 128, 'OBSERVED_UTF'); c = ((a & 15) << 12) | ((raw[i++] & 63) << 6) | (raw[i++] & 63); }
      value += String.fromCharCode(c);
    }
    requireFact(modifiedUtf(value).subarray(2).equals(raw), 'OBSERVED_UTF_CANONICAL'); return value;
  }
  hash() { const value = this.utf(); requireFact(/^[0-9a-f]{64}$/.test(value), 'OBSERVED_HASH'); return value; }
  end() { requireFact(this.at === this.bytes.length, 'OBSERVED_TRAILING'); }
}
type Reference = { job: number; product: number; view: number; epoch: number; receipt: string; source: string; bindingSha256: string };
type Product = { barcode: string; barcodeValue: string; barcodeEpoch: number; label: string; views: (Reference | null)[]; encodedBytes: number };
export type ObservedStateReport = { kind: 'OBSERVED_NATIVE_ENROLLMENT_SCHEMA_VALID'; revision: number; epoch: number; attempts: number; selectedProduct: number; products: Product[]; candidate: Reference | null; pending: boolean; frozen: string; gallerySha256: string; stateSha256: string; vectorDimension: 1024; physicalEvidenceVerified: false };
function reference(r: ObservedReader): Reference {
  const start = r.at, job = integer(r.int(), 1, 64), product = integer(r.int(), 0, 9), view = integer(r.int(), 0, 3), epoch = integer(r.long(), 1, Number.MAX_SAFE_INTEGER);
  r.hash(); r.hash(); r.hash(); const receipt = r.hash(); r.hash(); r.hash(); const source = r.hash(); requireFact(r.hash() === model, 'OBSERVED_MODEL');
  let norm = 0;
  for (let i = 0; i < 1024; i++) { const f = r.take(4).readFloatBE(); requireFact(Number.isFinite(f), 'OBSERVED_VECTOR_FINITE'); norm += f * f; }
  requireFact(Math.abs(norm - 1) <= 0.0001, 'OBSERVED_VECTOR_NORM');
  return { job, product, view, epoch, receipt, source, bindingSha256: sha(r.bytes.subarray(start, r.at)) };
}
/** Schema and numerical bindings only. This does not validate photographs, real CPU execution or Android durability. */
export function validateObservedState(bytes: Uint8Array): ObservedStateReport {
  const r = new ObservedReader(bytes, stateCap); requireFact(r.int() === 1, 'OBSERVED_STATE_VERSION');
  const barcodeAvailable = r.bool();
  const epoch = r.long(), attempts = integer(r.int(), 0, 64), interrupted = r.utf(), frozen = r.utf();
  requireFact(interrupted === '' || /^(INTERRUPTED|DECLINED):[1-9][0-9]?$/.test(interrupted) && Number(interrupted.split(':')[1]) <= attempts, 'OBSERVED_INTERRUPTION');
  requireFact(frozen === '' || /^[0-9a-f]{64}$/.test(frozen), 'OBSERVED_FREEZE_HASH');
  const revision = integer(r.int(), 1, 4096), selectedProduct = r.int(), count = integer(r.int(), 1, 10); integer(selectedProduct, 0, count - 1);
  const products: Product[] = [], labels = new Set<string>(), confirmedCodes = new Set<string>(), jobs = new Set<number>(), productBytes: Buffer[] = [];
  for (let p = 0; p < count; p++) {
    const start = r.at, label = r.utf(); requireFact(label.length > 0 && Buffer.byteLength(label) <= 192 && !/[\u0000-\u001f\u007f-\u009f]/.test(label) && !labels.has(label), 'OBSERVED_LABEL'); labels.add(label);
    const barcode = r.utf(), barcodeValue = r.utf(), format = r.utf(), canonical = r.utf(), barcodeEpoch = integer(r.long(), 0, epoch);
    requireFact(['UNAVAILABLE', 'NOT_PRESENTED', 'UNREADABLE', 'DECLINED', 'PENDING', 'CONFIRMED', 'CONFLICT'].includes(barcode) && (barcodeAvailable ? barcode !== 'UNAVAILABLE' : barcode === 'UNAVAILABLE' && barcodeEpoch === 0), 'OBSERVED_BARCODE_GATE');
    if (canonical !== '') {
      const length = format === 'ean13' ? 13 : format === 'ean8' ? 8 : format === 'upc_a' ? 12 : 0;
      requireFact(length > 0 && barcodeValue.length === length && /^[0-9]+$/.test(barcodeValue), 'OBSERVED_BARCODE_FORMAT');
      let sum = 0, weight = 3; for (let i = barcodeValue.length - 2; i >= 0; i--) { sum += Number(barcodeValue[i]) * weight; weight = weight === 3 ? 1 : 3; }
      requireFact((10 - sum % 10) % 10 === Number(barcodeValue.at(-1)) && canonical === `gtin:${length === 12 ? '0' : ''}${barcodeValue}`, 'OBSERVED_BARCODE_CHECKSUM');
    } else requireFact(barcodeValue === '' && format === '', 'OBSERVED_BARCODE_EMPTY');
    if (['PENDING', 'CONFIRMED', 'CONFLICT'].includes(barcode)) requireFact(canonical !== '' && barcodeEpoch > 0, 'OBSERVED_BARCODE_VALUE');
    if (barcode === 'CONFIRMED') { requireFact(!confirmedCodes.has(canonical), 'OBSERVED_BARCODE_DUPLICATE'); confirmedCodes.add(canonical); }
    if (barcode === 'PENDING') requireFact(p === selectedProduct && barcodeEpoch === epoch, 'OBSERVED_BARCODE_PENDING_OWNER');
    if (['UNAVAILABLE', 'NOT_PRESENTED', 'UNREADABLE'].includes(barcode)) requireFact(canonical === '', 'OBSERVED_BARCODE_EMPTY');
    const views: (Reference | null)[] = []; let gap = false;
    for (let v = 0; v < 4; v++) {
      if (!r.bool()) { views.push(null); gap = true; continue; }
      const ref = reference(r); requireFact(!gap && ref.product === p && ref.view === v && ref.job <= attempts && ref.epoch <= epoch && !jobs.has(ref.job), 'OBSERVED_REFERENCE_BINDING'); jobs.add(ref.job); views.push(ref);
    }
    const encodedBytes = r.at - start; integer(encodedBytes, 1, 32768); productBytes.push(Buffer.from(r.bytes.subarray(start, r.at))); products.push({ label, views, encodedBytes, barcode, barcodeValue, barcodeEpoch });
  }
  const pending = r.bool();
  if (pending) {
    const job = r.int(), p = r.int(), v = r.int(), e = r.long(), previous = r.utf(); integer(v, 0, 3);
    requireFact(job === attempts && job > 0 && p === selectedProduct && e === epoch && e > 0 && !jobs.has(job), 'OBSERVED_PENDING_BINDING');
    requireFact(previous === (products[p].views[v]?.receipt ?? '') && products[p].views.slice(0, v).every(x => x !== null), 'OBSERVED_PENDING_ORDER');
  }
  const candidate = r.bool() ? reference(r) : null;
  if (candidate) requireFact(!pending && candidate.job === attempts && candidate.product === selectedProduct && candidate.epoch === epoch && !jobs.has(candidate.job) && products[selectedProduct].views.slice(0, candidate.view).every(x => x !== null), 'OBSERVED_CANDIDATE_BINDING');
  r.end();
  const gallery = Buffer.concat([modifiedUtf(acquisition), modifiedUtf(processing), intBytes(revision), intBytes(count), ...productBytes.flatMap(p => [intBytes(p.length), p])]);
  const gallerySha256 = sha(gallery);
  if (frozen !== '') requireFact(!pending && !candidate && products.every(p => p.views.every(v => v !== null) && p.barcode !== 'PENDING' && p.barcode !== 'CONFLICT') && frozen === gallerySha256, 'OBSERVED_FREEZE_BINDING');
  return { kind: 'OBSERVED_NATIVE_ENROLLMENT_SCHEMA_VALID', revision, epoch, attempts, selectedProduct, products, candidate, pending, frozen, gallerySha256, stateSha256: sha(bytes), vectorDimension: 1024, physicalEvidenceVerified: false };
}
export function validateObservedJournal(files: ReadonlyMap<string, Uint8Array>) {
  requireFact(files.size > 0 && files.size <= 4096, 'OBSERVED_EVENT_COUNT'); let max = 0, total = 44172693;
  for (const [name, bytes] of files) { requireFact(/^event-[0-9]{4}(\.new)?$/.test(name) && bytes.byteLength <= eventCap, 'OBSERVED_EVENT_FILE'); max = Math.max(max, integer(Number(name.slice(6, 10)), 1, 4096)); total += bytes.byteLength; requireFact(total <= 268435456, 'OBSERVED_QUOTA'); }
  let sequence = 0, head: string = '0'.repeat(64), state: ObservedStateReport | null = null; const orphanIds: number[] = [], references = new Map<number, string>();
  for (let id = 1; id <= max; id++) {
    const name = `event-${String(id).padStart(4, '0')}`, body = files.get(name), stage = files.get(name + '.new');
    requireFact(Boolean(body) !== Boolean(stage), 'OBSERVED_EVENT_GAP_OR_DUPLICATE'); if (stage) { orphanIds.push(id); continue; }
    const r = new ObservedReader(body!, eventCap); requireFact(r.int() === 2 && r.int() === sequence + 1 && r.int() === id && r.hash() === head, 'OBSERVED_EVENT_CHAIN');
    const bytes = r.take(integer(r.int(), 1, stateCap)); requireFact(r.hash() === sha(bytes), 'OBSERVED_EVENT_HASH'); r.end(); const next = validateObservedState(bytes);
    if (state) { requireFact(next.attempts >= state.attempts && next.attempts <= state.attempts + 1 && JSON.stringify(next.products.map(p => p.label)) === JSON.stringify(state.products.map(p => p.label)), 'OBSERVED_STATE_SEQUENCE'); requireFact(state.frozen !== '' ? next.revision === state.revision + 1 && next.frozen === '' : next.revision === state.revision, 'OBSERVED_REVISION_SEQUENCE'); }
    for (const ref of [...next.products.flatMap(p => p.views), next.candidate]) { if (!ref) continue; requireFact(!references.has(ref.job) || references.get(ref.job) === ref.bindingSha256, 'OBSERVED_IMMUTABLE_REFERENCE_CHANGED'); references.set(ref.job, ref.bindingSha256); }
    state = next; head = sha(body!); sequence++;
  }
  return { state, sequence, consumedEvents: max, orphanIds, chargedLedgerAndRetainedBytes: total, head, physicalEvidenceVerified: false as const };
}

/** Independent canonical-reference check for numerical evidence; carries exact BE vector bits. */
export function validateEvidenceReference(bytes: Uint8Array) {
  const r = new ObservedReader(bytes, 8192), ref = reference(r); r.end();
  const fields = new ObservedReader(bytes, 8192); fields.take(20);
  const original = fields.hash(), crop = fields.hash(), geometry = fields.hash(), receipt = fields.hash(), tensor = fields.hash(), rawVector = fields.hash(); fields.hash(); fields.hash();
  const feature = Buffer.alloc(4096); for (let i = 0; i < 1024; i++) feature.writeFloatLE(fields.take(4).readFloatBE(), i * 4); fields.end();
  return { ...ref, original, crop, geometry, receipt, tensor, rawVector, featureSha256: sha(feature) };
}
