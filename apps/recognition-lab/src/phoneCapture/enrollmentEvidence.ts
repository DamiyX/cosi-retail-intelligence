/** Private numerical container parser. No phone, file traversal, images, decompression or native code. */
import { retainedReference } from './enrollmentReferenceCompatibility.ts';
import { createHash } from 'node:crypto';
import { validateEvidenceInventory, inventoryRegistry, reportSlots, type InventoryReference, type InventoryWitness } from './enrollmentInventory.ts';
import { ObservedReader, validateObservedState, validateEvidenceReference } from './observedEnrollment.ts';
const sha = (b: Uint8Array) => createHash('sha256').update(b).digest('hex');
const limits = [16384, 360960, 1048576, 1048576, 1048576] as const;

export const EVIDENCE_BOUND = 3527168;
function fact(value: unknown, why: string): asserts value { if (!value) throw Error(why); }
function block(r: ObservedReader, cap: number) { const n = r.int(); fact(n >= 0 && n <= cap, 'EVIDENCE_BLOCK'); return r.take(n); }
export type EvidenceBindings = { source: string; apk: string; registry: string; report: number; session: string };
// The only predecessor descriptor accepted after the D-067 implementation update.
const originalDescriptor = {
  "source": "3d9ad3427b4f192d1a3cf8f918e1403ff8e3d82fe803724cca4541d033d11a4f",
  "session": "enrollment-mw4zmxro",
  "labels": [
    "Fanta Orange / 33cl",
    "Airport air freshener / Cherry Blossom,  300ml",
    "GM Whiteboard cleaner / 8.44 fl  oz",
    "CWAY water / 750ml",
    "CWAY water / 600ml",
    "Hair brush / Wooden red",
    "Freshglow Bar soap / Milk & papaya",
    "NIVEVA MEN roll-on / Dry Impact 72H, 50ml",
    "Itel light bulb / 10W",
    "Godrej aer / Lemon Tangy  Delight, 10g"
  ]
} as const;
export function validateEnrollmentEvidence(input: Uint8Array, expected: EvidenceBindings) {
  fact(input.byteLength <= EVIDENCE_BOUND && input.byteLength <= 4194304 && input.byteLength >= 117, 'EVIDENCE_SIZE');
  const all = Buffer.from(input), table = new ObservedReader(all, EVIDENCE_BOUND);
  fact(table.take(8).toString('ascii') === 'P204EV01' && table.int() === 1 && table.int() === 5, 'EVIDENCE_CONTAINER');
  const sections: Buffer[] = []; let offset = 76;
  for (let i = 0; i < 5; i++) { fact(table.int() === i + 1 && table.int() === offset, 'EVIDENCE_SECTION_ORDER'); const n = table.int(); fact(n > 0 && n <= limits[i] - (i === 0 ? 76 : 0) && offset + n <= all.length - 32, 'EVIDENCE_SECTION_BOUND'); sections.push(all.subarray(offset, offset + n)); offset += n; }
  fact(offset === all.length - 32 && sha(all.subarray(0, offset)) === all.subarray(offset).toString('hex'), 'EVIDENCE_CHECKSUM_OR_TRAILING');
  const h = new ObservedReader(sections[0], 16384); fact(h.utf() === 'p204-evidence-v1', 'EVIDENCE_SCHEMA');
  const source = h.hash(), model = h.hash(), processing = h.utf(), acquisition = h.utf(), apk = h.hash(), session = h.utf(), rosterHash = h.hash(), head = h.hash(), registry = h.hash();
  fact(source === expected.source && apk === expected.apk && registry === expected.registry && inventoryRegistry(registry) && session === expected.session && /^[a-zA-Z0-9][a-zA-Z0-9-]{0,63}$/.test(session), 'EVIDENCE_BINDINGS');
  fact(model === 'bbbb4c51a55a53905af1daec995ca1aae355046f8839bb8c9f5ce9271394bc40' && processing === 'native-component-roi-v2-u8-gray128-bilinear224-f32-div255-v1' && acquisition === 'observed-native-component-enrollment-v1', 'EVIDENCE_MODEL_RECIPE');
  const report = h.int(), sequence = h.int(), revision = h.int(), initialized = h.bool(), descriptor = block(h, 8192), refCount = h.int(), witnessCount = h.int();
  fact(report === expected.report && report >= 1 && report <= reportSlots(registry) && sequence >= 0 && sequence <= 4096 && refCount >= 0 && refCount <= 64 && witnessCount >= sequence && witnessCount <= 4096, 'EVIDENCE_COUNTS');
  fact(h.int() === 1, 'EVIDENCE_COLLECTION_STATUS');
  const accounting = Array.from({ length: 8 }, () => h.long()); h.end();
  const [historical, measured, reserved, external, total, free, historicalClaim, standaloneClaim] = accounting;
  fact(total === measured + reserved + external && total <= 268435456 && historicalClaim === 253602084 && standaloneClaim === 67108864 && free >= 0, 'EVIDENCE_ACCOUNTING');
  const event = new ObservedReader(sections[1], 360960), eventBytes = block(event, 360704); event.end();
  let state: ReturnType<typeof validateObservedState> | null = null, previous = '0'.repeat(64), latestPhysical = 0;
  let labels: string[] = []; let descriptorSource = source;
  if (descriptor.length) {
    const d = new ObservedReader(descriptor, 8192);
    fact(d.int() === 1 && d.utf() === 'REAL_PRODUCT_ENROLLMENT' && d.utf() === session, 'EVIDENCE_DESCRIPTOR'); descriptorSource = d.hash(); fact(d.hash() === rosterHash, 'EVIDENCE_DESCRIPTOR');
    const rosterStart = d.at; fact(d.int() === 10, 'EVIDENCE_TEN_PRODUCTS'); labels = Array.from({ length: 10 }, () => d.utf()); d.end();
    fact(descriptorSource === source || (descriptorSource === originalDescriptor.source && session === 'enrollment-mw4zmxro' && labels.every((label, i) => label === originalDescriptor.labels[i])), 'EVIDENCE_DESCRIPTOR_SOURCE');
    fact(sha(descriptor.subarray(rosterStart)) === rosterHash && new Set(labels.map(x => x.toLowerCase())).size === 10 && labels.every(x => x.trim() === x && x !== '' && Buffer.byteLength(x) <= 192 && !/[\u0000-\u001f\u007f-\u009f]/.test(x) && !/^product[ -]?0?[0-9]+$/i.test(x) && Array.from(x).every(ch => { const n = ch.codePointAt(0)!; return n < 0xd800 || n > 0xdfff; })), 'EVIDENCE_ROSTER');
  } else fact(rosterHash === '0'.repeat(64), 'EVIDENCE_ABSENT_ROSTER_HASH');
  let latestBodyHash = '';
  if (initialized) {
    fact(labels.length === 10 && eventBytes.length > 0, 'EVIDENCE_INITIALIZED');
    const e = new ObservedReader(eventBytes, 360704); fact(e.int() === 2 && e.int() === sequence, 'EVIDENCE_EVENT'); latestPhysical = e.int(); previous = e.hash(); const body = block(e, 360448); latestBodyHash = sha(body); fact(e.hash() === latestBodyHash, 'EVIDENCE_EVENT_HASH'); e.end(); fact(sha(eventBytes) === head, 'EVIDENCE_HEAD'); state = validateObservedState(body);
    fact(state.revision === revision && !state.pending && state.candidate === null && state.products.every(p => p.barcode !== 'PENDING' && p.barcode !== 'CONFLICT') && JSON.stringify(labels) === JSON.stringify(state.products.map(p => p.label)), 'EVIDENCE_STATE_ROSTER');
  } else fact(eventBytes.length === 0 && sequence === 0 && revision === 0 && refCount === 0 && witnessCount === 0 && head === '0'.repeat(64), 'EVIDENCE_UNINITIALIZED');
  let logical = 0, witnessHead = '0'.repeat(64), attempts = 0; const witnessIds: number[] = []; const inventoryWitnesses: InventoryWitness[] = []; const inventoryReferences: InventoryReference[] = [];
  if (witnessCount === 0) fact(sections[3].equals(Buffer.from([0])), 'EVIDENCE_EMPTY_WITNESSES');
  else {
    fact(sections[3].length === witnessCount * 256, 'EVIDENCE_WITNESS_LENGTH'); const w = new ObservedReader(sections[3], 1048576);
    for (let i = 0; i < witnessCount; i++) { const id = w.int(), seq = w.int(), staged = w.int(), length = w.int(), prev = w.take(32).toString('hex'), hash = w.take(32).toString('hex'), body = w.take(32).toString('hex'), count = w.int(); fact(id === i + 1 && (staged === 0 || staged === 1) && length >= 0 && length <= 360704 && count >= attempts && count <= 64 && prev === witnessHead && w.take(140).equals(Buffer.alloc(140)), 'EVIDENCE_WITNESS'); witnessIds.push(id); inventoryWitnesses.push({ id, staged: staged === 1, length });
      if (staged) fact(seq === 0 && body === '0'.repeat(64) && count === attempts && (length > 0 || hash === sha(Buffer.alloc(0))), 'EVIDENCE_STAGED_WITNESS');
      else { fact(seq === ++logical && count <= attempts + 1, 'EVIDENCE_WITNESS_SEQUENCE'); attempts = count; if (seq === sequence) fact(id === latestPhysical && hash === head && prev === previous && hash === sha(eventBytes) && body === latestBodyHash && length === eventBytes.length, 'EVIDENCE_LATEST_WITNESS'); witnessHead = hash; }
    } w.end(); fact(logical === sequence && witnessHead === head && (!state || state.attempts === attempts), 'EVIDENCE_WITNESS_HEAD');
  }
  const refs = new Map<number, ReturnType<typeof validateEvidenceReference>>();
  if (refCount === 0) fact(sections[2].equals(Buffer.from([0])), 'EVIDENCE_EMPTY_REFERENCES');
  else {
    const r = new ObservedReader(sections[2], 1048576);
    for (let i = 0; i < refCount; i++) { const framed = block(r, 16380), f = new ObservedReader(framed, 16380), role = f.int(), raw = block(f, 8192), geometry = block(f, 4096), receipt = block(f, 1024), featureReceipt = block(f, 2048), featureHash = block(f, 32); f.end();
      const ref = validateEvidenceReference(raw); fact((refs.size === 0 || ref.job > Math.max(...refs.keys())) && (role === 1 || role === 4) && (ref.source === source || retainedReference(ref, session, descriptorSource, rosterHash)) && ref.epoch > 0 && ref.job <= attempts && !refs.has(ref.job) && sha(geometry) === ref.geometry && sha(receipt) === ref.receipt && featureHash.length === 32 && featureHash.toString('hex') === ref.featureSha256, 'EVIDENCE_REFERENCE_BINDING');
      const captureReceipt = new ObservedReader(receipt, 1024); fact(captureReceipt.int() === 1 && captureReceipt.hash() === ref.original, 'EVIDENCE_CAPTURE_RECEIPT'); const originalBytes = captureReceipt.int(); fact(originalBytes > 0 && originalBytes <= 10485760 && captureReceipt.hash() === ref.crop, 'EVIDENCE_CAPTURE_RECEIPT'); const cropBytes = captureReceipt.int(); fact(cropBytes > 0 && cropBytes <= 2097152, 'EVIDENCE_CAPTURE_RECEIPT'); captureReceipt.hash(); fact(captureReceipt.hash() === ref.geometry, 'EVIDENCE_CAPTURE_RECEIPT'); captureReceipt.end();
      fact(geometry.toString('utf8').startsWith(`originalSha256=${ref.original}\n`), 'EVIDENCE_ORIGINAL_GEOMETRY');
      inventoryReferences.push({ job: ref.job, active: role === 1, geometry: geometry.length, receipt: receipt.length, featureReceipt: featureReceipt.length, original: originalBytes, crop: cropBytes });
      const binding = `schema=1|job=${ref.job}|product=${ref.product}|view=${ref.view}|epoch=${ref.epoch}|reference=${sha(raw)}|feature=${ref.featureSha256}|acquisition=${acquisition}|processing=${processing}`;
      fact(featureReceipt.toString('ascii') === binding && geometry.toString('utf8').includes(`|enrollmentJob=${ref.job}|enrollmentProduct=${ref.product}|enrollmentView=${ref.view}|enrollmentEpoch=${ref.epoch}|`) && geometry.toString('utf8').includes(`|source=${ref.source}|`), 'EVIDENCE_NATIVE_RECEIPT');
      const active = state?.products[ref.product]?.views[ref.view]; fact(role === 1 ? active?.job === ref.job && active.bindingSha256 === ref.bindingSha256 : active?.job !== ref.job, 'EVIDENCE_REFERENCE_ROLE'); refs.set(ref.job, ref);
    } r.end();
  }
  for (const ref of state?.products.flatMap(p => p.views) ?? []) if (ref) fact(refs.get(ref.job)?.bindingSha256 === ref.bindingSha256, 'EVIDENCE_ACTIVE_REFERENCE_MISSING');
  if (report >= 6) {
    fact(state !== null && session === 'enrollment-mw4zmxro' && state.products.length === 10, 'EVIDENCE_NEW_REPORT_STATE');
    if (report === 6) fact(session === 'enrollment-mw4zmxro' && descriptorSource === originalDescriptor.source && sequence === 24 && revision === 1 && state.epoch === 9 && state.attempts === 8 && refs.size === 7 && state.products.every((p, product) => p.views.every((ref, view) => product === 0 ? ref?.job === [8, 5, 6, 7][view] : ref === null)), 'EVIDENCE_FANTA_CHECKPOINT');
    else fact(state.products.length === 10 && state.products.every(p => p.views.every(Boolean)), 'EVIDENCE_FULL_GALLERY');
  }

  const inventory = validateEvidenceInventory(sections[4], { registry, report, sequence, session, descriptorBytes: descriptor.length, attempts, references: inventoryReferences, witnesses: inventoryWitnesses, historical, measured, reserved, external });

  return { kind: 'P204_NUMERICAL_EVIDENCE_VALID' as const, source, descriptorSource, apk, session, rosterHash, report, sequence, revision, head, state, inventory, references: refs.size, witnessIds, accounting: { historical, measured, reserved, external, total, free }, physicalEvidenceVerified: false as const, journalProof: 'NATIVE_FULL_CHAIN_VALIDATION_WITH_HOST_WITNESS_LINKAGE_ONLY' as const, historicalMembershipDeviceVerifiedOnly: true as const, privacy: 'CONTAINS_PRODUCT_LABELS_BARCODES_AND_PRIVATE_IMAGE_DERIVED_VECTORS' as const };
}
