/** Node-only disposable generated checkpoints; no business database or Android durability claim. */
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { initialEnrollment, validateState } from './enrollment.ts';
import type { EnrollmentBindings, EnrollmentState } from './enrollment.ts';
export const STORE_LIMITS = Object.freeze({ checkpointBytes: 4 * 1024 * 1024, stagedFiles: 4 });
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const encode = (value: unknown) => JSON.stringify(value) + '\n';
const envelope = z.object({ schemaVersion: z.literal(1), kind: z.literal('GENERATED_ENROLLMENT_CHECKPOINT'), sha256: z.string().regex(/^[0-9a-f]{64}$/), state: z.unknown() }).strict();
const ownerBytes = encode({ schemaVersion: 1, kind: 'GENERATED_DISPOSABLE_ENROLLMENT_STORE' });
export type FaultStage = 'beforeWrite' | 'afterWrite' | 'beforeRename' | 'afterRename';
export type FaultHook = (stage: FaultStage, context: { root: string; staged: string }) => void;
export function checkedScope(scope: string) {
  const resolved = path.resolve(scope);
  if (path.basename(resolved) !== 'p2-generated-02-c1-20261014-a1' || path.basename(path.dirname(resolved)) !== 'phone-experiment' || path.basename(path.dirname(path.dirname(resolved))) !== 'runs') throw Error('GENERATED_SCOPE_REQUIRED');
  let current = path.parse(resolved).root;
  for (const part of resolved.slice(current.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part); const stat = fs.lstatSync(current);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw Error('STORE_ANCESTOR_LINK_OR_TYPE');
  }
  return resolved;
}
function leafRoot(scope: string, leaf: string) {
  if (!/^store-[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(leaf)) throw Error('STORE_PATH_ESCAPE');
  return path.join(checkedScope(scope), leaf);
}
function regular(file: string, cap: number) {
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.size > cap) throw Error('STORE_FILE_LINK_TYPE_OR_SIZE');
}
export class GeneratedStore {
  readonly root: string;
  readonly expected: EnrollmentBindings;
  readonly recovery: { interrupted: boolean; pendingToken: string | null };
  private readonly scope: string;
  private readonly fault: FaultHook;
  private constructor(scope: string, root: string, expected: EnrollmentBindings, fault: FaultHook) {
    this.scope = scope; this.root = root; this.expected = { ...expected }; this.fault = fault;
    const state = this.read(); this.recovery = { interrupted: state.active !== null, pendingToken: state.active?.token ?? null };
  }
  static create(scope: string, leaf: string, expected: EnrollmentBindings, products: string[], fault: FaultHook = () => {}) {
    const root = leafRoot(scope, leaf), state = initialEnrollment(expected, products, digest), body = encode({ schemaVersion: 1, kind: 'GENERATED_ENROLLMENT_CHECKPOINT', sha256: digest(JSON.stringify(state)), state });
    if (Buffer.byteLength(body) > STORE_LIMITS.checkpointBytes) throw Error('CHECKPOINT_BYTE_CAP');
    if (fs.existsSync(root)) throw Error('STORE_OVERWRITE_REFUSED');
    fs.mkdirSync(root); fs.writeFileSync(path.join(root, 'owner.json'), ownerBytes, { flag: 'wx' });
    fs.writeFileSync(path.join(root, 'state.json'), body, { flag: 'wx' });
    return new GeneratedStore(scope, root, expected, fault);
  }
  static open(scope: string, leaf: string, expected: EnrollmentBindings, fault: FaultHook = () => {}) {
    return new GeneratedStore(scope, leafRoot(scope, leaf), expected, fault);
  }
  private checkRoot() {
    checkedScope(this.scope); const stat = fs.lstatSync(this.root);
    if (!stat.isDirectory() || stat.isSymbolicLink() || path.relative(fs.realpathSync(this.scope), fs.realpathSync(this.root)) !== path.basename(this.root)) throw Error('STORE_ROOT_ALIAS');
    let staged = 0;
    for (const name of fs.readdirSync(this.root)) {
      if (!['owner.json', 'state.json', 'commit.lock'].includes(name) && !/^checkpoint-[0-9a-f-]{36}\.tmp$/.test(name)) throw Error('STORE_UNOWNED_ENTRY');
      if (name.endsWith('.tmp')) staged++;
      regular(path.join(this.root, name), name === 'owner.json' || name === 'commit.lock' ? 4096 : STORE_LIMITS.checkpointBytes);
    }
    if (staged > STORE_LIMITS.stagedFiles || fs.readFileSync(path.join(this.root, 'owner.json'), 'utf8') !== ownerBytes) throw Error('STORE_OWNER_OR_CAP');
  }
  private decode(bytes: Buffer) {
    if (bytes.length > STORE_LIMITS.checkpointBytes) throw Error('CHECKPOINT_BYTE_CAP');
    const e = envelope.parse(JSON.parse(bytes.toString('utf8'))), state = validateState(e.state, this.expected, digest);
    if (digest(JSON.stringify(state)) !== e.sha256) throw Error('CHECKPOINT_HASH');
    return state;
  }
  read(): EnrollmentState {
    this.checkRoot(); return this.decode(fs.readFileSync(path.join(this.root, 'state.json')));
  }
  save(expectedSequence: number, value: EnrollmentState) {
    this.checkRoot(); const candidate = validateState(value, this.expected, digest), current = this.read();
    if (current.sequence !== expectedSequence || candidate.sequence <= current.sequence) throw Error('STALE_CHECKPOINT_SEQUENCE');
    if (JSON.stringify(candidate.events.slice(0, current.events.length)) !== JSON.stringify(current.events) ||
        JSON.stringify(candidate.revisions.slice(0, current.revisions.length)) !== JSON.stringify(current.revisions) ||
        current.records.some(r => !r.stillOwnedWork && JSON.stringify(candidate.records.find(n => n.trialId === r.trialId)) !== JSON.stringify(r))) throw Error('IMMUTABLE_HISTORY_CHANGED');
    const bytes = Buffer.from(encode({ schemaVersion: 1, kind: 'GENERATED_ENROLLMENT_CHECKPOINT', sha256: digest(JSON.stringify(candidate)), state: candidate }));
    if (bytes.length > STORE_LIMITS.checkpointBytes) throw Error('CHECKPOINT_BYTE_CAP');
    if (fs.readdirSync(this.root).filter(n => n.endsWith('.tmp')).length >= STORE_LIMITS.stagedFiles) throw Error('STAGED_FILE_CAP');
    const lock = path.join(this.root, 'commit.lock'), lockBytes = encode({ kind: 'OWNED_GENERATED_COMMIT', pid: process.pid, nonce: randomUUID() });
    let fd: number;
    try { fd = fs.openSync(lock, 'wx'); } catch { throw Error('STORE_WRITE_BUSY'); }
    fs.writeFileSync(fd, lockBytes); fs.fsyncSync(fd); fs.closeSync(fd);
    const staged = path.join(this.root, 'checkpoint-' + randomUUID() + '.tmp');
    try {
      const original = fs.readFileSync(path.join(this.root, 'state.json')), locked = this.decode(original);
      if (locked.sequence !== current.sequence || JSON.stringify(locked) !== JSON.stringify(current)) throw Error('STALE_CHECKPOINT_UNDER_LOCK');
      this.fault('beforeWrite', { root: this.root, staged });
      fd = fs.openSync(staged, 'wx');
      try { fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
      this.fault('afterWrite', { root: this.root, staged });
      regular(staged, STORE_LIMITS.checkpointBytes); this.decode(fs.readFileSync(staged));
      if (!fs.readFileSync(staged).equals(bytes)) throw Error('STAGED_BYTES_CHANGED');
      this.fault('beforeRename', { root: this.root, staged });
      this.checkRoot(); regular(staged, STORE_LIMITS.checkpointBytes);
      if (!fs.readFileSync(staged).equals(bytes) || !fs.readFileSync(path.join(this.root, 'state.json')).equals(original)) throw Error('CHECKPOINT_CHANGED_BEFORE_PUBLISH');
      fs.renameSync(staged, path.join(this.root, 'state.json'));
      this.fault('afterRename', { root: this.root, staged });
    } finally {
      // Only this invocation's unchanged lock is removed. Staged failure evidence is retained, never auto-published.
      regular(lock, 4096);
      if (fs.readFileSync(lock, 'utf8') !== lockBytes) throw Error('STORE_LOCK_CHANGED');
      fs.unlinkSync(lock);
    }
    return this.read();
  }
}
