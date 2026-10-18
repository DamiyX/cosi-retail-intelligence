import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { GeneratedStore, digest, STORE_LIMITS } from '../src/phoneCapture/store.ts';
import { SLOTS, initialEnrollment, beginReference, commitReference, resumeInterrupted, freezeGallery, beginTrial, commitTrial, validateState, parseEnrollmentFixture } from '../src/phoneCapture/enrollment.ts';
import type { EnrollmentState, EnrollmentBindings, FrozenTrial, TrialRecord } from '../src/phoneCapture/enrollment.ts';
import { runFrozenTrial, enrollmentReport, simulate } from '../src/phoneCapture/generated.ts';
const lab = path.resolve(__dirname, '..'), scope = path.join(lab, 'runs/phone-experiment/p2-generated-02-c1-20261014-a1');
const bindings: EnrollmentBindings = { sourceSha256: 'a'.repeat(64), modelSha256: 'b'.repeat(64), recipeSha256: 'c'.repeat(64), fixtureSha256: 'd'.repeat(64) };
const vectors = [[1, 0], [0, 1], [0, 1]];
const trial = (n = 1): FrozenTrial => ({ trialId: 'trial-' + n, sessionId: 'scan-' + n, mode: 'NORMAL', queryInputSha256: digest(JSON.stringify(vectors)), truth: { kind: 'KNOWN', productId: 'a' } });
const leaf = () => 'store-jest-' + randomUUID();
function fill(input: EnrollmentState) {
  let s = input;
  for (const p of s.products) for (const slot of SLOTS) if (s.products.find(q => q.productId === p.productId)!.slots[SLOTS.indexOf(slot)] === null) {
    s = beginReference(s, p.productId, slot); s = commitReference(s, s.active!.token, slot === 'front' || slot === 'rear' ? [1, 0] : [0, 1], digest);
  }
  return s;
}
function frozen(products = ['a']) { return freezeGallery(fill(initialEnrollment(bindings, products, digest)), [trial()], digest); }
test('ordered slot commits and actual file reopen classify interruption; reads never resume or recapture', () => {
  const name = leaf(), store = GeneratedStore.create(scope, name, bindings, ['a']); let s = store.read();
  s = store.save(s.sequence, beginReference(s, 'a', 'front')); const token = s.active!.token;
  s = store.save(s.sequence, commitReference(s, token, [1, 0], digest)); const committed = s.products[0].slots[0];
  expect(() => beginReference(s, 'a', 'complementary1')).toThrow('ORDER');
  s = store.save(s.sequence, beginReference(s, 'a', 'rear')); const oldToken = s.active!.token;
  const bytes = fs.readFileSync(path.join(store.root, 'state.json'));
  const reopen = GeneratedStore.open(scope, name, bindings); expect(reopen.recovery).toEqual({ interrupted: true, pendingToken: oldToken });
  expect(reopen.read()).toEqual(reopen.read()); expect(fs.readFileSync(path.join(store.root, 'state.json'))).toEqual(bytes);
  s = reopen.save(s.sequence, resumeInterrupted(s, oldToken, digest)); expect(s.active!.token).not.toBe(oldToken);
  expect(() => commitReference(s, oldToken, [1, 0], digest)).toThrow('STALE');
  s = reopen.save(s.sequence, commitReference(s, s.active!.token, [0, 1], digest));
  expect(s.products[0].slots[0]).toEqual(committed); expect(s.products[0].slots.filter(r => r !== null)).toHaveLength(2);
  expect(() => freezeGallery(s, [trial()], digest)).toThrow('NOT_READY');
});
test('pre-freeze replacement history and post-freeze fork preserve old gallery/trial byte identities', () => {
  const name = leaf(), store = GeneratedStore.create(scope, name, bindings, ['a']); let s = store.save(0, fill(store.read()));
  s = store.save(s.sequence, beginReference(s, 'a', 'front', true)); s = store.save(s.sequence, commitReference(s, s.active!.token, [1, 1], digest));
  expect(s.replacements).toHaveLength(1); expect(s.replacements[0].from.sha256).not.toBe(s.replacements[0].to.sha256);
  s = store.save(s.sequence, freezeGallery(s, [trial()], digest)); const old = JSON.stringify(s.revisions[0]);
  expect(s.revisions[0].products[0].slots.slice(0, 2)).toEqual(s.products[0].slots.slice(0, 2));
  s = store.save(s.sequence, beginTrial(s, 'gallery-1', 'trial-1'));
  s = store.save(s.sequence, commitTrial(s, s.active!.token, runFrozenTrial(s.revisions[0], s.revisions[0].trials[0], vectors, digest), digest)); const oldRecord = JSON.stringify(s.records[0]);
  s = store.save(s.sequence, beginReference(s, 'a', 'front', true)); expect(s.draftNumber).toBe(2); expect(s.draftFrozen).toBe(false);
  s = store.save(s.sequence, commitReference(s, s.active!.token, [0, 1], digest)); s = store.save(s.sequence, freezeGallery(s, [trial(2)], digest));
  expect(JSON.stringify(s.revisions[0])).toBe(old); expect(JSON.stringify(s.records[0])).toBe(oldRecord);
  expect(s.revisions[1].sha256).not.toBe(s.revisions[0].sha256); expect(enrollmentReport(s).trialDenominator).toBe(2);
  const malicious = JSON.parse(JSON.stringify(s)); malicious.revisions[0].products[0].slots[0].values = [0, 1];
  expect(() => store.save(s.sequence, malicious)).toThrow(); expect(store.read()).toEqual(s);
});
test.each(['beforeWrite', 'afterWrite', 'beforeRename', 'afterRename'] as const)('injected crash at %s leaves old-valid or new-valid freeze, never partial ready data', stage => {
  const name = leaf(), store = GeneratedStore.create(scope, name, bindings, ['a']); const old = store.save(0, fill(store.read())), next = freezeGallery(old, [trial()], digest);
  const faulty = GeneratedStore.open(scope, name, bindings, at => { if (at === stage) throw Error('INJECTED_CRASH_' + stage); });
  expect(() => faulty.save(old.sequence, next)).toThrow('INJECTED');
  const reopened = GeneratedStore.open(scope, name, bindings).read(); expect(reopened).toEqual(stage === 'afterRename' ? next : old);
  expect(reopened.draftFrozen).toBe(stage === 'afterRename'); expect(fs.existsSync(path.join(store.root, 'commit.lock'))).toBe(false);
  if (stage === 'afterWrite' || stage === 'beforeRename') expect(fs.readdirSync(store.root).filter(n => n.endsWith('.tmp'))).toHaveLength(1);
});
test('injected write/rename failures and tampered staged checksum never publish a ready gallery', () => {
  for (const kind of ['write', 'rename', 'hash']) {
    const name = leaf(), store = GeneratedStore.create(scope, name, bindings, ['a']); const old = store.save(0, fill(store.read()));
    const faulty = GeneratedStore.open(scope, name, bindings, (stage, context) => {
      if (kind === 'write' && stage === 'beforeWrite' || kind === 'rename' && stage === 'beforeRename') throw Error('INJECTED_IO_FAILURE');
      if (kind === 'hash' && stage === 'afterWrite') fs.writeFileSync(context.staged, '{"schemaVersion":1,"kind":"CORRUPT"}');
    });
    expect(() => faulty.save(old.sequence, freezeGallery(old, [trial()], digest))).toThrow(); expect(GeneratedStore.open(scope, name, bindings).read()).toEqual(old);
  }
});
test('exclusive commit lock rejects factory-like reentry and stale writes without changing old-valid state', () => {
  const name = leaf(), store = GeneratedStore.create(scope, name, bindings, ['a']), old = store.read(), next = beginReference(old, 'a', 'front');
  let nested = false;
  const faulty = GeneratedStore.open(scope, name, bindings, stage => {
    if (stage === 'beforeWrite') { expect(() => GeneratedStore.open(scope, name, bindings).save(old.sequence, next)).toThrow('BUSY'); nested = true; }
  });
  faulty.save(0, next); expect(nested).toBe(true); expect(() => store.save(0, next)).toThrow('STALE'); expect(store.read()).toEqual(next);
});
test('publication rechecks the version under its lock when another writer commits before acquisition', () => {
  const name = leaf(), first = GeneratedStore.create(scope, name, bindings, ['a']), second = GeneratedStore.open(scope, name, bindings);
  const old = first.read(), pending = beginReference(old, 'a', 'front'), completed = commitReference(pending, pending.active!.token, [1, 0], digest);
  const originalRead = first.read.bind(first); let intervened = false;
  first.read = () => { const captured = originalRead(); if (!intervened) { intervened = true; second.save(old.sequence, completed); } return captured; };
  expect(() => first.save(old.sequence, pending)).toThrow('STALE');
  expect(second.read()).toEqual(completed); expect(second.read().products[0].slots[0]).not.toBeNull();
});
test('malformed/version/hash/source/recipe/fixture mismatch and oversized checkpoint refuse recovery', () => {
  const name = leaf(), store = GeneratedStore.create(scope, name, bindings, ['a']), before = fs.readFileSync(path.join(store.root, 'state.json'));
  for (const key of ['sourceSha256', 'modelSha256', 'recipeSha256', 'fixtureSha256'] as const) expect(() => GeneratedStore.open(scope, name, { ...bindings, [key]: 'e'.repeat(64) })).toThrow('BINDING');
  expect(fs.readFileSync(path.join(store.root, 'state.json'))).toEqual(before);
  for (const kind of ['json', 'version', 'hash', 'oversized']) {
    const other = leaf(), s = GeneratedStore.create(scope, other, bindings, ['a']); const file = path.join(s.root, 'state.json'), data = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (kind === 'json') fs.writeFileSync(file, '{');
    if (kind === 'version') { data.schemaVersion = 2; fs.writeFileSync(file, JSON.stringify(data)); }
    if (kind === 'hash') { data.sha256 = '0'.repeat(64); fs.writeFileSync(file, JSON.stringify(data)); }
    if (kind === 'oversized') fs.writeFileSync(file, Buffer.alloc(STORE_LIMITS.checkpointBytes + 1));
    expect(() => GeneratedStore.open(scope, other, bindings)).toThrow();
  }
});
test('path traversal, actual junction and hardlink aliases refuse without deleting targets or user entries', () => {
  expect(() => GeneratedStore.create(scope, '../escape', bindings, ['a'])).toThrow('ESCAPE');
  const name = leaf(), store = GeneratedStore.create(scope, name, bindings, ['a']); const original = fs.readFileSync(path.join(store.root, 'state.json'));
  const alias = leaf(); fs.symlinkSync(store.root, path.join(scope, alias), 'junction'); expect(() => GeneratedStore.open(scope, alias, bindings)).toThrow();
  fs.linkSync(path.join(store.root, 'state.json'), path.join(scope, 'owned-hardlink-' + randomUUID() + '.json'));
  expect(() => GeneratedStore.open(scope, name, bindings)).toThrow('LINK'); expect(fs.readFileSync(path.join(store.root, 'state.json'))).toEqual(original);
  const userRoot = GeneratedStore.create(scope, leaf(), bindings, ['a']); fs.writeFileSync(path.join(userRoot.root, 'user.txt'), 'GENERATED_SENTINEL', { flag: 'wx' });
  expect(() => userRoot.read()).toThrow('UNOWNED'); expect(fs.readFileSync(path.join(userRoot.root, 'user.txt'), 'utf8')).toBe('GENERATED_SENTINEL');
});
test('ten products/forty slots/twenty-five trials/seventy-five attempts work; excess and event caps refuse', () => {
  const ids = Array.from({ length: 10 }, (_, i) => i ? 'p' + i : 'a'); let s = fill(initialEnrollment(bindings, ids, digest));
  expect(s.products.flatMap(p => p.slots)).toHaveLength(40);
  const trials = Array.from({ length: 25 }, (_, i) => trial(i + 1)); s = freezeGallery(s, trials, digest);
  for (const t of s.revisions[0].trials) { s = beginTrial(s, 'gallery-1', t.trialId); s = commitTrial(s, s.active!.token, runFrozenTrial(s.revisions[0], t, vectors, digest), digest); }
  const report = enrollmentReport(s); expect(report.complete).toBe(true); expect(report.attemptDenominator).toBe(75); expect(report.rows.flatMap(r => r.frames)).toHaveLength(75);
  expect(() => initialEnrollment(bindings, [...ids, 'excess'], digest)).toThrow('CAP');
  expect(() => freezeGallery(fill(initialEnrollment(bindings, ['a'], digest)), Array.from({ length: 26 }, (_, i) => trial(i + 1)), digest)).toThrow('CAP');
  expect(() => validateState({ ...s, events: Array(4097).fill(s.events[0]) }, bindings, digest)).toThrow('CAP');
});
test('truth is evaluator metadata only; interrupted and failed scheduled rows retain all denominators on reopen', () => {
  let s = frozen(); const t = s.revisions[0].trials[0];
  const known = runFrozenTrial(s.revisions[0], t, vectors, digest), unknown = runFrozenTrial(s.revisions[0], { ...t, truth: { kind: 'UNKNOWN' } }, vectors, digest);
  expect(known.frames).toEqual(unknown.frames);
  const name = leaf(), store = GeneratedStore.create(scope, name, bindings, ['a']); s = store.save(0, s); s = store.save(s.sequence, beginTrial(s, 'gallery-1', t.trialId));
  const reopened = GeneratedStore.open(scope, name, bindings); expect(reopened.recovery.interrupted).toBe(true);
  const interrupted = enrollmentReport(reopened.read(), true); expect(interrupted.rows[0].terminal).toBe('INTERRUPTED'); expect(interrupted.armDenominator).toBe(4);
  s = reopened.save(s.sequence, resumeInterrupted(s, s.active!.token, digest)); expect(s.records[0].terminal).toBe('INTERRUPTED'); expect(enrollmentReport(s).attemptDenominator).toBe(3);
  expect(() => beginTrial(s, 'gallery-1', t.trialId)).toThrow('ADMITTED');
});
test('generated fixture/schema vectors/caps reject real kinds and frozen query-input mismatch', () => {
  const f = JSON.parse(fs.readFileSync(path.join(lab, 'fixtures/phone-capture-enrollment/normal.json'), 'utf8'));
  expect(parseEnrollmentFixture(f).products).toHaveLength(2);
  expect(() => parseEnrollmentFixture({ ...f, kind: 'REAL' })).toThrow();
  expect(() => parseEnrollmentFixture({ ...f, products: Array(11).fill(f.products[0]) })).toThrow('CAP');
  const s = frozen(); expect(() => runFrozenTrial(s.revisions[0], s.revisions[0].trials[0], [[0, 1], [0, 1], [0, 1]], digest)).toThrow('BINDING');
});
test('extended current CLI performs partial/reopen/explicit resume/freeze/scan/revision with deterministic outputs and refusals', () => {
  const cli = path.join(lab, 'src/phoneCapture/cli.ts'); const receipts: unknown[] = [];
  const call = (phase: string, store: string, fixture = 'normal', out = 'cli-enrollment-jest-' + randomUUID()) => {
    const result = spawnSync(process.execPath, [cli, '--enrollment', phase, '--fixture', fixture, '--store', store, '--out', out], { cwd: lab, encoding: 'utf8' });
    receipts.push({ phase, store, fixture, out, exit: result.status, stdout: result.stdout, stderr: result.stderr }); return { ...result, out, report: fs.existsSync(path.join(scope, out, 'report.json')) ? JSON.parse(fs.readFileSync(path.join(scope, out, 'report.json'), 'utf8')) : null };
  };
  const stores = [leaf(), leaf()]; const finals: string[] = [];
  for (const name of stores) {
    expect(call('setup', name).status).toBe(2); const reopened = call('reopen', name); expect(reopened.status).toBe(2); expect(reopened.report.recovery.interrupted).toBe(true);
    expect(call('resume', name).status).toBe(0); expect(call('freeze', name).status).toBe(0);
    const scanned = call('scan', name); expect(scanned.status).toBe(0); expect(scanned.report.comparison.armDenominator).toBe(8); finals.push(scanned.out);
    const before = fs.readFileSync(path.join(scope, name, 'state.json')); expect(call('replace', name, 'normal', scanned.out).status).toBe(1); expect(fs.readFileSync(path.join(scope, name, 'state.json'))).toEqual(before);
  }
  expect(fs.readFileSync(path.join(scope, finals[0], 'report.json'))).toEqual(fs.readFileSync(path.join(scope, finals[1], 'report.json')));
  const beforeRevision = call('reopen', stores[0]).report.state.revisions[0]; expect(call('replace', stores[0]).status).toBe(0); expect(call('freeze', stores[0]).status).toBe(0);
  const after = call('scan', stores[0]); expect(after.status).toBe(0); expect(after.report.state.revisions).toHaveLength(2); expect(after.report.state.revisions[0]).toEqual(beforeRevision);
  expect(call('reopen', stores[1], 'retained').status).toBe(1); expect(call('setup', leaf(), 'malformed').status).toBe(1); expect(call('setup', '../escape').status).toBe(1);
  const legacyOut = 'cli-legacy-jest-' + randomUUID(), legacy = spawnSync(process.execPath, [cli, '--scenario', 'complete', '--out', legacyOut], { cwd: lab, encoding: 'utf8' }); expect(legacy.status).toBe(0);
  const legacyReport = JSON.parse(fs.readFileSync(path.join(scope, legacyOut, 'report.json'), 'utf8')); expect(legacyReport.trials[0].arms.map((a: { candidates: { productId: string }[] }) => a.candidates[0].productId)).toEqual(['a', 'a', 'b', 'a']);
  fs.writeFileSync(path.join(scope, 'enrollment-jest-cli-' + randomUUID() + '.json'), JSON.stringify(receipts, null, 2), { flag: 'wx' });
});
test('unchanged legacy simulator still enforces exact deadline after extension', () => {
  const f = JSON.parse(fs.readFileSync(path.join(lab, 'fixtures/phone-capture-session/late.json'), 'utf8'));
  const result = simulate(f, { sourceSha256: bindings.sourceSha256, modelSha256: bindings.modelSha256, recipeSha256: bindings.recipeSha256 });
  expect(result.exitCode).toBe(2); expect(result.trials[0].counts.late).toBe(1); expect(result.trials[0].counts.usable).toBe(0);
});

const observed = (id: string, requestAtMs: number, disposition: 'USABLE' | 'FAILED' | 'LATE' | 'PENDING'): TrialRecord['frames'][number] => ({
  id, requestAtMs, capturedAtMs: requestAtMs, completedAtMs: disposition === 'PENDING' ? null : disposition === 'LATE' ? 3000 : requestAtMs + 100,
  selected: true, disposition, values: disposition === 'USABLE' ? [1, 0] : null, failureCode: disposition === 'FAILED' ? 'INFERENCE_ERROR' : null,
});
test.each([
  ['usable and pending', [observed('job-1', 0, 'USABLE'), observed('job-2', 400, 'PENDING')]],
  ['two usable and pending', [observed('job-1', 0, 'USABLE'), observed('job-2', 400, 'USABLE'), observed('job-3', 800, 'PENDING')]],
  ['failure and pending', [observed('job-1', 0, 'FAILED'), observed('job-2', 400, 'PENDING')]],
  ['late observation and pending', [observed('job-1', 0, 'LATE'), observed('job-2', 400, 'PENDING')]],
] as const)('persisted interrupted recovery preserves observed evidence: %s', (_name, frames) => {
  const name = leaf(), store = GeneratedStore.create(scope, name, bindings, ['a']);
  let s = store.save(0, freezeGallery(fill(store.read()), [trial(1), trial(2)], digest));
  s = store.save(s.sequence, beginTrial(s, 'gallery-1', 'trial-1'));
  s = store.save(s.sequence, commitTrial(s, s.active!.token, runFrozenTrial(s.revisions[0], s.revisions[0].trials[0], vectors, digest), digest));
  const completeRecord = JSON.stringify(s.records[0]), revision = JSON.stringify(s.revisions[0]);
  s = store.save(s.sequence, beginTrial(s, 'gallery-1', 'trial-2'));
  s = store.save(s.sequence, commitTrial(s, s.active!.token, { revisionId: 'gallery-1', trialId: 'trial-2', queryInputSha256: trial(2).queryInputSha256,
    terminal: 'DRAINING', reason: 'SESSION_DEADLINE', stillOwnedWork: true, frames: JSON.parse(JSON.stringify(frames)) }, digest));
  const oldFrames = JSON.stringify(s.records[1].frames), token = s.active!.token, before = fs.readFileSync(path.join(store.root, 'state.json'));
  const reopened = GeneratedStore.open(scope, name, bindings); expect(reopened.recovery.interrupted).toBe(true);
  expect(reopened.read()).toEqual(reopened.read()); expect(fs.readFileSync(path.join(store.root, 'state.json'))).toEqual(before);
  const admissions = s.events.filter(e => e.kind === 'BEGIN_TRIAL').length, sequence = s.sequence;
  s = reopened.save(s.sequence, resumeInterrupted(reopened.read(), token, digest));
  expect(JSON.stringify(s.records[1].frames)).toBe(oldFrames); expect(s.records[1].terminal).toBe('INTERRUPTED');
  expect(s.records[1].stillOwnedWork).toBe(false); expect(s.active).toBeNull(); expect(s.sequence).toBe(sequence + 1);
  expect(s.events.filter(e => e.kind === 'BEGIN_TRIAL')).toHaveLength(admissions);
  expect(JSON.stringify(s.records[0])).toBe(completeRecord); expect(JSON.stringify(s.revisions[0])).toBe(revision);
  const comparison = enrollmentReport(s), row = comparison.rows[1];
  expect(row.complete).toBe(false); expect(row.attempted).toBe(frames.length); expect(row.missing).toBe(3 - frames.length);
  expect(row.frames.filter(f => f.values !== null)).toHaveLength(frames.filter(f => f.values !== null).length);
  expect(comparison.trialDenominator).toBe(2); expect(comparison.armDenominator).toBe(8); expect(comparison.attemptDenominator).toBe(6);
  const classified = fs.readFileSync(path.join(store.root, 'state.json')), again = GeneratedStore.open(scope, name, bindings);
  expect(again.recovery.interrupted).toBe(false); expect(again.read()).toEqual(s);
  expect(() => resumeInterrupted(again.read(), token, digest)).toThrow('NO_MATCHING');
  expect(() => beginTrial(s, 'gallery-1', 'trial-2')).toThrow('ADMITTED');
  expect(fs.readFileSync(path.join(store.root, 'state.json'))).toEqual(classified);
});
