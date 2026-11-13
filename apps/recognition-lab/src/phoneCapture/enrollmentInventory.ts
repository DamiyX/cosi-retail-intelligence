/** Independent observable inventory contract. No filesystem access or historical image replay. */
import { createHash } from 'node:crypto';
import { ObservedReader } from './observedEnrollment.ts';
import { RETAINED_PROOFS } from './enrollmentRetainedFacts.ts';
export const LEGACY_INVENTORY_REGISTRY_SHA256 = 'a237a94282907d3e11c35f36d8bd653703043cf4a89d5145950f42c1eb5eb17f';
export const READ_DIAGNOSTIC_REGISTRY_SHA256 = 'f1eb0500346f0891cd20b4668fb5613c5d297c9f5e59ef97a88854c55b9f8d43';
export const INVENTORY_REGISTRY_SHA256 = 'a354cedb24f30f315570381e46617ac8ed0b0fe1f5de4268738fd637717efa6d';
export function inventoryRegistry(value: string) { return [INVENTORY_REGISTRY_SHA256, READ_DIAGNOSTIC_REGISTRY_SHA256, LEGACY_INVENTORY_REGISTRY_SHA256].includes(value); }
export function reportSlots(registry: string) { fact(inventoryRegistry(registry), 'EVIDENCE_REGISTRY'); return registry === INVENTORY_REGISTRY_SHA256 ? 8 : 5; }
export const RETAINED_MEASURED = Object.values(RETAINED_PROOFS).reduce((sum, leaves) => sum + Object.values(leaves).reduce((a, b) => a + b, 0), 0);
const sha = (b: string | Uint8Array) => createHash('sha256').update(b).digest('hex');
const empty = sha(''), hard = 4194304;
function fact(value: unknown, code: string): asserts value { if (!value) throw Error(code); }
type Leaf = { name: string; role: number; cap: number; staged: boolean };
type Row = { root: number; category: number; size: number; digest: string; role: number; status: number; job: number; disposition: number; leaf: Leaf | null };
export type InventoryReference = { job: number; active: boolean; geometry: number; receipt: number; featureReceipt: number; original: number; crop: number };
export type InventoryWitness = { id: number; staged: boolean; length: number };
export type InventoryContext = { registry?: string; report: number; sequence: number; session: string; descriptorBytes: number; attempts: number; references: InventoryReference[]; witnesses: InventoryWitness[]; historical: number; measured: number; reserved: number; external: number };
const fixed = ['owner.lock', 'owner', 'registry', 'refusals', 'seal', 'intent', 'receipt', 'failure', 'terminal', 'setup-owner', 'ready-attempt', 'pre-ready-closed', 'pre-ready-declined', 'release', 'result', 'export-attempt', 'export-terminal', 'lock', 'selection', 'destination', 'write', 'verified', 'recreate-intent', 'recreate-receipt', 'attempt', 'geometry', 'original.jpeg', 'crop.png', 'feature.bin', 'feature-receipt', 'tensor.f32le', 'cpu-intent', 'cpu-receipt', 'cpu-result', 'export-result', 'session', 'jpeg-header', 'image', 'capture.jpeg'];
const privateNames = ['owner.dat', 'requests.dat', 'packet.zip', 'result.zip', 'result-index.json', 'packet-index.json', 'packet-stage.zip', 'result-stage.zip', 'store.lock', 'completed.dat'];
const camera = ['raw.jpg', 'preview.png', 'receipt.json', 'numerical.json', 'failure.json', 'interruption.json', 'reservation', 'done', 'invalidated', 'request.json', 'resolution'];
const cases = ['M00-A000', 'M01-A090', 'M02-A180', 'M03-A270', 'M04-B000', 'M05-B090', 'M06-B180', 'M07-B270', 'L01-USER-CANCEL', 'L02-BACKGROUND', 'L03-VIEW-UNMOUNT', 'L04-PERMISSION-LOSS', 'D01-DENIED', 'D02-GRANTED-RESTORED', 'D03-RESTORED-AFTER-L04'];
const recordSizes: Record<string, number> = { intent: 4096, geometry: 4096, 'original.jpeg': 10485760, 'crop.png': 2097152, receipt: 1024, failure: 512, 'feature.bin': 4096, 'feature-receipt': 2048 };
const cache = new Map<string, Map<string, Leaf>>();
function category(root: number) { return root >= 1 && root <= 56 ? 1 : root >= 57 && root <= 67 ? 2 : root >= 100 && root <= 164 || root === 200 ? 3 : root === 250 ? 0 : -1; }
function allowed(root: number, registry: string) {
  const key = `${root}:${registry}`; const old = cache.get(key); if (old) return old;
  const map = new Map<string, Leaf>();
  function add(name: string, cap: number, role = fixed.indexOf(name) + 1, backup = false) {
    for (const suffix of backup ? ['', '.new', '.bak', '.bak.new'] : ['', '.new']) { const n = name + suffix; map.set(sha(n), { name: n, cap, role, staged: suffix.endsWith('.new') }); }
  }
  if (root >= 57 && root <= 67) { for (const [name, size] of Object.entries(RETAINED_PROOFS[root])) map.set(sha(name), { name, cap: size, role: fixed.indexOf(name.replace(/\.new$/, '')) + 1, staged: name.endsWith('.new') }); }
  else if (root === 100) { add('owner.lock', 0); for (let n = 1; n <= 4096; n++) add(`event-${String(n).padStart(4, '0')}`, 360704, 400); }
  else if (root > 100 && root <= 164) for (const [name, cap] of Object.entries(recordSizes)) add(name, cap);
  else if (root === 200) { add('session', 8192); for (let n = 1; n <= reportSlots(registry); n++) ['bin', 'intent', 'result', 'export-intent', 'destination', 'export-result'].forEach((role, i) => add(`R0${n}.${role}`, i === 0 ? hard : 65536, 500 + i)); }
  else if (root >= 1 && root <= 4) { ['setup-owner', 'ready-attempt', 'pre-ready-closed', 'jpeg-header', 'image'].forEach(n => add(n, 2048)); add('capture.jpeg', 10485760); for (let n = 0; n < 128; n++) add(`event-${String(n).padStart(3, '0')}`, 2048, 411); }
  else if (root === 5 || root === 6) ['attempt', 'terminal'].forEach(n => add(n, 4096));
  else if (root === 7) ['intent', 'export-attempt', 'export-terminal'].forEach(n => add(n, 4096));
  else if (root === 53 || root === 54) for (let n = 0; n < 32; n++) add(`record-${String(n).padStart(2, '0')}.json`, 2048, 410);
  else if (root === 55 || root === 56) for (const name of root === 55 ? ['owner.dat', 'requests.dat', 'completed.dat', 'store.lock'] : privateNames) add(name, root === 55 ? 50331648 : 134217728, 200 + privateNames.indexOf(name), true);
  else if (root >= 44 && root <= 52) { add('owner', 1024, 2, true); add('refusals', 65536, 4, true); }
  else if (root === 14 || root === 15 || root >= 18 && root <= 23 || root === 42 || root === 43) {
    ['owner', 'seal', 'export-attempt', 'export-terminal'].forEach(n => add(n, 4096)); add('registry', root === 14 || root === 15 ? 16384 : 4096);
    cases.forEach((name, i) => { const roles = i < 8 ? ['intent', 'terminal'] : root === 14 || root === 15 ? i < 12 ? ['intent', 'terminal', 'invoke', 'phase'] : ['permission'] : []; roles.forEach(role => add(`${name}.${role}`, 4096, 600 + ['intent', 'terminal', 'invoke', 'phase', 'permission'].indexOf(role))); });
  } else if (category(root) === 1) ['lock', 'owner', 'selection', 'destination', 'write', 'verified', 'terminal', 'recreate-intent', 'recreate-receipt'].forEach(n => add(n, 2048));
  if (root === 200 && (registry === INVENTORY_REGISTRY_SHA256 || registry === READ_DIAGNOSTIC_REGISTRY_SHA256)) { add('R04.read-diagnostic-intent', 2048, 506); add('R04.read-diagnostic-result', 4096, 507); }
  cache.set(key, map); return map;
}
export function validateEvidenceInventory(bytes: Buffer, context: InventoryContext) {
  const registry = context.registry ?? LEGACY_INVENTORY_REGISTRY_SHA256; fact(inventoryRegistry(registry), 'EVIDENCE_REGISTRY');
  fact(bytes.length > 0 && bytes.length % 128 === 0 && bytes.length / 128 <= 8192, 'EVIDENCE_INVENTORY_LENGTH');
  const roots = new Map<number, Map<string, Row>>(), r = new ObservedReader(bytes, 1048576), refMap = new Map(context.references.map(ref => [ref.job, ref])); let historical = 0, measured = 0;
  for (let at = 0; at < bytes.length; at += 128) {
    const root = r.int(), kind = r.int(), size = r.long(), digest = r.take(32).toString('hex'), identity = r.take(32).toString('hex');
    const role = r.int(), status = r.int(), job = r.int(), disposition = r.int();
    fact(r.take(32).equals(Buffer.alloc(32)) && category(root) >= 0 && kind === category(root) && identity !== '0'.repeat(64) && job === (root > 100 && root <= 164 ? root - 100 : 0), 'EVIDENCE_INVENTORY_ROW');
    const ref = refMap.get(job), expectedDisposition = job ? ref ? ref.active ? 1 : 2 : job <= context.attempts ? 3 : 4 : 0;
    fact(disposition === expectedDisposition, 'EVIDENCE_RECORD_DISPOSITION');
    let map = roots.get(root); if (!map) { map = new Map(); roots.set(root, map); } fact(!map.has(digest), 'EVIDENCE_INVENTORY_DUPLICATE');
    let leaf: Leaf | null = null;
    if (digest === empty) fact(size === 0 && role === 0 && status === 0, 'EVIDENCE_INVENTORY_DIRECTORY');
    else {
      leaf = allowed(root, registry).get(digest) ?? null;
      if (!leaf && root >= 44 && root <= 52 && role >= 300 && role <= 310) {
        // UUID text is not recoverable from its hash. Grammar remains explicitly native-validated only.
        const suffix = camera[role - 300], cap = suffix === 'raw.jpg' ? 12582912 : suffix === 'preview.png' ? 262144 : ['receipt.json', 'numerical.json'].includes(suffix) ? 65536 : 4096;
        fact(size <= cap && status === 1, 'EVIDENCE_LEGACY_DYNAMIC_METADATA');
      } else fact(leaf && role === leaf.role && size <= leaf.cap && kind !== 0, 'EVIDENCE_LEAF_DIGEST_ROLE_OR_BOUND');
      const expectedStatus = kind === 2 ? 2 : root === 100 && role === 400 && !leaf?.staged ? 3 : ref && leaf && ['original.jpeg', 'crop.png', 'geometry', 'receipt', 'feature.bin', 'feature-receipt'].includes(leaf.name) ? 4 : root === 200 && leaf?.name === 'session' ? 5 : 1;
      fact(status === expectedStatus, 'EVIDENCE_INVENTORY_CONTENT_STATUS');
      if (kind === 1) historical += size; else measured += size;
    }
    map.set(digest, { root, category: kind, size, digest, role, status, job, disposition, leaf });
  } r.end();
  fact(roots.size <= 512 && [...roots.values()].every(map => map.has(empty)), 'EVIDENCE_MISSING_PARENT_ROOT');
  for (const root of [57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 100, 200]) fact(roots.has(root), 'EVIDENCE_REQUIRED_ROOT');
  function row(root: number, name: string) { const found = roots.get(root)?.get(sha(name)); fact(found, 'EVIDENCE_REQUIRED_LEAF'); return found; }
  function exactLeaves(root: number, names: string[]) { const actual = roots.get(root); fact(actual && actual.size === names.length + 1 && names.every(name => actual.has(sha(name))), 'EVIDENCE_ROOT_SHAPE'); }
  for (let root = 57; root <= 67; root++) { const facts = RETAINED_PROOFS[root]; exactLeaves(root, Object.keys(facts)); for (const [name, length] of Object.entries(facts)) fact(row(root, name).size === length, 'EVIDENCE_RETAINED_LENGTH'); }
  const events = context.witnesses.map(w => `event-${String(w.id).padStart(4, '0')}${w.staged ? '.new' : ''}`); exactLeaves(100, ['owner.lock', ...events]);
  context.witnesses.forEach((w, i) => fact(row(100, events[i]).size === w.length, 'EVIDENCE_EVENT_INVENTORY_LENGTH'));
  for (const ref of context.references) {
    const root = ref.job + 100, sizes: Record<string, number> = { geometry: ref.geometry, receipt: ref.receipt, 'feature-receipt': ref.featureReceipt, 'feature.bin': 4096, 'original.jpeg': ref.original, 'crop.png': ref.crop };
    exactLeaves(root, ['intent', ...Object.keys(sizes)]); fact(row(root, 'intent').size > 0, 'EVIDENCE_REFERENCE_INTENT');
    for (const [name, size] of Object.entries(sizes)) fact(row(root, name).size === size && size > 0, 'EVIDENCE_REFERENCE_INVENTORY_LENGTH');
  }
  const control = roots.get(200)!; fact(control.size - 1 <= 64, 'EVIDENCE_CONTROL_COUNT'); fact(!control.has(sha('session.new')), 'EVIDENCE_UNCERTAIN_DESCRIPTOR');
  if (context.descriptorBytes) fact(row(200, 'session').size === context.descriptorBytes, 'EVIDENCE_DESCRIPTOR_INVENTORY'); else fact(!control.has(sha('session')), 'EVIDENCE_UNEXPECTED_DESCRIPTOR');
  const current = `R0${context.report}`;
  const currentRows = [...control.values()].filter(v => v.leaf?.name.startsWith(`${current}.`));
  fact(currentRows.length === 1 && currentRows[0].leaf?.name === `${current}.intent` && currentRows[0].size === 105 + context.session.length + String(context.sequence).length, 'EVIDENCE_CURRENT_INTENT_CUT');
  let reserved = 44172693 - RETAINED_MEASURED; let possibleExternal = new Set([0]);
  for (let n = 1; n <= reportSlots(registry); n++) {
    const slot = `R0${n}`, rows = [...control.values()].filter(v => v.leaf?.name.startsWith(`${slot}.`)), names = new Set(rows.map(v => v.leaf!.name)), find = (role: string) => control.get(sha(`${slot}.${role}`));
    if (!rows.length) { if (n >= 6) { reserved += hard + 65536; possibleExternal = new Set([...possibleExternal].map(v => v + 2 * hard)); } continue; }
    const intent = find('intent'), intentStage = find('intent.new'); fact(!!intent !== !!intentStage, 'EVIDENCE_REPORT_INTENT');
    if (intentStage) fact(rows.length === 1 && intentStage.size <= 109 + (n === 1 ? 64 : context.session.length), 'EVIDENCE_TORN_INTENT');
    if (intent) fact(intent.size >= 106 + context.session.length && intent.size <= 109 + context.session.length, 'EVIDENCE_INTENT_LENGTH');
    for (const name of names) if (!name.endsWith('.new')) fact(!names.has(`${name}.new`), 'EVIDENCE_DUPLICATE_STAGE');
    const internal = find('bin')?.size ?? find('bin.new')?.size ?? 0, result = find('result'), exportIntent = find('export-intent'), destination = find('destination'), terminal = find('export-result');
    if (result || find('result.new')) fact(find('bin') && !find('bin.new') && internal > 0 && internal <= 3527168, 'EVIDENCE_RESULT_WITHOUT_INTERNAL');
    if (result) fact(result.size === String(internal).length + 65, 'EVIDENCE_RESULT_LENGTH');
    if (rows.some(v => /\.(export-intent|destination|export-result)(\.new)?$/.test(v.leaf!.name))) fact(result, 'EVIDENCE_TRANSFER_WITHOUT_PREPARED');
    if (destination || find('destination.new') || terminal || find('export-result.new')) fact(exportIntent, 'EVIDENCE_TRANSFER_WITHOUT_INTENT');
    if (exportIntent) fact(exportIntent.size === 105 + context.session.length + String(internal).length, 'EVIDENCE_EXPORT_INTENT_LENGTH');
    if (destination) fact(destination.size > 0 && destination.size <= 16384, 'EVIDENCE_DESTINATION_LENGTH');
    fact((terminal?.size ?? 0) <= 4096 && (find('export-result.new')?.size ?? 0) <= 4096, 'EVIDENCE_TRANSFER_DIAGNOSTIC_BOUND');
    const di = find('read-diagnostic-intent'), dis = find('read-diagnostic-intent.new'), dr = find('read-diagnostic-result'), drs = find('read-diagnostic-result.new');
    if (di || dis || dr || drs) { fact(n === 4 && (registry === INVENTORY_REGISTRY_SHA256 || registry === READ_DIAGNOSTIC_REGISTRY_SHA256) && context.session === 'enrollment-mw4zmxro' && internal === 148563 && result && exportIntent && destination && terminal, 'EVIDENCE_READ_DIAGNOSTIC_BINDING'); fact(!(di && dis) && !(dr && drs) && (!(dr || drs) || di), 'EVIDENCE_READ_DIAGNOSTIC_SHAPE'); }
    const controls = rows.filter(v => !/\.bin(\.new)?$/.test(v.leaf!.name)).reduce((a, b) => a + b.size, 0); fact(controls <= 65536, 'EVIDENCE_CONTROL_BYTES');
    reserved += (result ? 0 : hard - internal) + 65536 - controls;
    let charges = [2 * hard];
    if (terminal && terminal.size !== 9) { fact(destination && result && terminal.size >= 93 + 2 * String(internal).length && terminal.size <= 4096, 'EVIDENCE_TRANSFER_RESULT_LENGTH'); if (!(di || dis || dr || drs)) charges = [hard + internal, 2 * hard]; }
    possibleExternal = new Set([...possibleExternal].flatMap(a => charges.map(b => a + b)));
  }
  fact(historical === context.historical && measured === context.measured, 'EVIDENCE_INVENTORY_ACCOUNTING');
  fact(reserved === context.reserved && possibleExternal.has(context.external), 'EVIDENCE_INVENTORY_RESERVATIONS');
  return { rows: bytes.length / 128, roots: roots.size, retainedMeasured: RETAINED_MEASURED, retainedUnmaterializedCharge: 44172693 - RETAINED_MEASURED, dynamicHistoricalNamesDeviceValidatedOnly: true as const, controlReceiptContentsDeviceValidatedOnly: true as const };
}
