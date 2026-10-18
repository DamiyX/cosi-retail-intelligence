import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { simulate, runFrozenTrial, enrollmentReport } from './generated.ts';
import { parseEnrollmentFixture, SLOTS, beginReference, commitReference, resumeInterrupted, freezeGallery, beginTrial, commitTrial } from './enrollment.ts';
import { GeneratedStore, digest } from './store.ts';

const lab = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const destinationRoot = path.join(lab, 'runs/phone-experiment/p2-generated-02-c1-20261014-a1');
const fixtureRoot = path.join(lab, 'fixtures/phone-capture-session');
const names = ['complete', 'cancelled', 'late', 'stale', 'never-finishing', 'failed', 'not-ready', 'permission', 'offline-loss', 'malformed'] as const;
const enrollmentNames = ['normal', 'retained', 'malformed'] as const;
const hash = (bytes: string | Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const encode = (value: unknown) => JSON.stringify(value, null, 2) + '\n';
function regularAncestors(target: string) {
  let current = path.parse(target).root;
  for (const segment of target.slice(current.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    const stat = fs.lstatSync(current);
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw Error('OUTPUT_OR_INPUT_ANCESTOR_UNSAFE');
  }
}
export function run(args: string[]) {
  if (args[0] === '--enrollment') return runEnrollment(args);
  if (args.length !== 4 || args[0] !== '--scenario' || args[2] !== '--out' ||
      !names.includes(args[1] as typeof names[number])) throw Error('Usage: --scenario <bundled-generated-name> --out <new cli-name leaf>');
  const leaf = args[3];
  if (!/^cli-[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(leaf)) throw Error('OUTPUT_ESCAPE_REFUSED');
  regularAncestors(destinationRoot); regularAncestors(fixtureRoot);
  const output = path.join(destinationRoot, leaf);
  if (fs.existsSync(output)) throw Error('OUTPUT_OVERWRITE_REFUSED');
  const fixture = path.join(fixtureRoot, args[1] + '.json'), fixtureStat = fs.lstatSync(fixture);
  if (!fixtureStat.isFile() || fixtureStat.isSymbolicLink() || fixtureStat.size > 4 * 1024 * 1024) throw Error('INVALID_BUNDLED_FIXTURE');
  const fixtureBytes = fs.readFileSync(fixture);
  const sources = ['src/phoneCapture/session.ts', 'src/phoneCapture/generated.ts', 'src/phoneCapture/cli.ts',
    'src/phoneCapture/enrollment.ts', 'src/phoneCapture/store.ts',
    'src/phoneExperimentEvaluation.ts', 'src/phoneExperimentSchema.ts',
    ...names.map(name => 'fixtures/phone-capture-session/' + name + '.json'),
    ...enrollmentNames.map(name => 'fixtures/phone-capture-enrollment/' + name + '.json')];
  const sourceManifest = sources.map(relative => {
    const absolute = path.join(lab, relative); regularAncestors(path.dirname(absolute));
    const stat = fs.lstatSync(absolute);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 4 * 1024 * 1024) throw Error('SOURCE_BINDING_INVALID');
    const bytes = fs.readFileSync(absolute); return { path: relative, bytes: bytes.length, sha256: hash(bytes) };
  });
  if (sourceManifest.find(row => row.path === 'fixtures/phone-capture-session/' + args[1] + '.json')?.sha256 !== hash(fixtureBytes)) throw Error('FIXTURE_CHANGED_DURING_BINDING');
  const sourceBytes = encode(sourceManifest), sourceSha256 = hash(sourceBytes);
  const report = simulate(JSON.parse(fixtureBytes.toString('utf8')), { sourceSha256,
    modelSha256: hash('GENERATED_FAKE_TWO_DIMENSIONAL_VECTORS_V1'), recipeSha256: hash('GENERATED_NO_IMAGE_PIPELINE_V1') });
  const reportBytes = encode({ ...report, fixtureSha256: hash(fixtureBytes) });
  // Admission/validation complete before claiming the destination. Existing directories are never reused.
  fs.mkdirSync(output);
  try {
    fs.writeFileSync(path.join(output, 'source-manifest.json'), sourceBytes, { flag: 'wx' });
    fs.writeFileSync(path.join(output, 'report.json'), reportBytes, { flag: 'wx' });
    fs.writeFileSync(path.join(output, 'receipt.json'), encode({ kind: 'GENERATED_CLI_RECEIPT', reportSha256: hash(reportBytes),
      sourceSha256, fixtureSha256: hash(fixtureBytes), exitCode: report.exitCode, destination: output, createdUtc: new Date().toISOString(),
      deterministicExclusions: ['receipt.json destination and createdUtc; report/source manifest contain neither'] }), { flag: 'wx' });
  } catch { throw Error('OUTPUT_WRITE_FAILED_RETAINED_DESTINATION'); }
  console.log(JSON.stringify({ kind: report.kind, nativeValidated: false, complete: report.complete,
    exitCode: report.exitCode, state: report.state.state, stillOwnedWork: report.state.stillOwnedWork, reportSha256: hash(reportBytes), output }));
  return report.exitCode;
}
function runEnrollment(args: string[]) {
  const phases = ['setup', 'reopen', 'resume', 'replace', 'freeze', 'scan'];
  if (args.length !== 8 || args[0] !== '--enrollment' || !phases.includes(args[1]) || args[2] !== '--fixture' || !enrollmentNames.includes(args[3] as typeof enrollmentNames[number]) || args[4] !== '--store' || args[6] !== '--out') throw Error('ENROLLMENT_USAGE');
  const leaf = args[7]; if (!/^cli-[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(leaf)) throw Error('OUTPUT_ESCAPE_REFUSED');
  regularAncestors(destinationRoot); const output = path.join(destinationRoot, leaf); if (fs.existsSync(output)) throw Error('OUTPUT_OVERWRITE_REFUSED');
  const directory = path.join(lab, 'fixtures/phone-capture-enrollment'); regularAncestors(directory);
  const file = path.join(directory, args[3] + '.json'); const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 4 * 1024 * 1024) throw Error('ENROLLMENT_FIXTURE_INVALID');
  const fixtureBytes = fs.readFileSync(file), fixture = parseEnrollmentFixture(JSON.parse(fixtureBytes.toString('utf8')));
  const paths = ['src/phoneCapture/session.ts', 'src/phoneCapture/generated.ts', 'src/phoneCapture/cli.ts', 'src/phoneCapture/enrollment.ts', 'src/phoneCapture/store.ts', 'src/phoneExperimentEvaluation.ts', 'src/phoneExperimentSchema.ts',
    ...names.map(name => 'fixtures/phone-capture-session/' + name + '.json'), ...enrollmentNames.map(name => 'fixtures/phone-capture-enrollment/' + name + '.json')];
  const manifest = paths.map(relative => {
    const absolute = path.join(lab, relative); regularAncestors(path.dirname(absolute)); const s = fs.lstatSync(absolute);
    if (!s.isFile() || s.isSymbolicLink() || s.size > 4 * 1024 * 1024) throw Error('SOURCE_BINDING_INVALID');
    const bytes = fs.readFileSync(absolute); return { path: relative, bytes: bytes.length, sha256: hash(bytes) };
  });
  if (manifest.find(r => r.path === 'fixtures/phone-capture-enrollment/' + args[3] + '.json')?.sha256 !== hash(fixtureBytes)) throw Error('FIXTURE_CHANGED_DURING_BINDING');
  const sourceBytes = encode(manifest), bindings = { sourceSha256: hash(sourceBytes), modelSha256: hash('GENERATED_FAKE_TWO_DIMENSIONAL_VECTORS_V1'), recipeSha256: hash('GENERATED_NO_IMAGE_PIPELINE_V1'), fixtureSha256: hash(fixtureBytes) };
  // Existing output refusal precedes any store mutation; malformed inputs are refused before claiming output.
  fs.mkdirSync(output);
  try {
    const store = args[1] === 'setup' ? GeneratedStore.create(destinationRoot, args[5], bindings, fixture.products.map(p => p.productId)) : GeneratedStore.open(destinationRoot, args[5], bindings);
    let state = store.read(); const saved = (next: typeof state) => { state = store.save(state.sequence, next); };
    const reference = (productId: string, slot: typeof SLOTS[number], replacing = false, override?: number[]) => {
      saved(beginReference(state, productId, slot, replacing)); const token = state.active!.token;
      saved(commitReference(state, token, override ?? fixture.products.find(p => p.productId === productId)!.views[SLOTS.indexOf(slot)], digest));
    };
    if (args[1] === 'setup') {
      const first = fixture.products[0].productId; reference(first, 'front'); reference(first, 'rear'); saved(beginReference(state, first, 'complementary1'));
    }
    if (args[1] === 'resume') {
      if (state.active) {
        if (!store.recovery.interrupted) throw Error('EXPLICIT_REOPEN_REQUIRED');
        saved(resumeInterrupted(state, state.active.token, digest));
        if (state.active?.kind === 'REFERENCE') {
          const a = state.active; saved(commitReference(state, a.token, fixture.products.find(p => p.productId === a.productId)!.views[SLOTS.indexOf(a.slot)], digest));
        }
      }
      for (const p of fixture.products) for (const slot of SLOTS) if (state.products.find(q => q.productId === p.productId)!.slots[SLOTS.indexOf(slot)] === null) reference(p.productId, slot);
    }
    if (args[1] === 'replace') reference(fixture.products[0].productId, 'front', true, [1, 1]);
    if (args[1] === 'freeze') {
      const planned = state.revisions.length ? fixture.followupTrials : fixture.trials;
      saved(freezeGallery(state, planned.map(({ vectors, ...t }) => ({ ...t, queryInputSha256: digest(JSON.stringify(vectors)) })), digest));
    }
    if (args[1] === 'scan') {
      if (!state.draftFrozen || state.active) throw Error('FROZEN_SCAN_NOT_READY');
      const revision = state.revisions.at(-1)!;
      for (const trial of revision.trials) {
        if (state.records.some(r => r.trialId === trial.trialId)) continue;
        saved(beginTrial(state, revision.revisionId, trial.trialId));
        if (trial.mode === 'INTERRUPTED') break; // Persisted marker, no controller/query work. A later explicit reopen/resume classifies it.
        const input = [...fixture.trials, ...fixture.followupTrials].find(t => t.trialId === trial.trialId)!;
        const result = runFrozenTrial(revision, trial, input.vectors, digest); saved(commitTrial(state, state.active!.token, result, digest));
        if (result.stillOwnedWork) break;
      }
    }
    const comparison = enrollmentReport(state, store.recovery.interrupted), readyGallery = state.draftFrozen && state.active?.kind !== 'REFERENCE';
    const exitCode = args[1] === 'scan' ? comparison.complete ? 0 : 2 : state.active || state.products.some(p => p.slots.some(r => r === null)) ? 2 : 0;
    const report = { schemaVersion: 1, kind: 'GENERATED_ENROLLMENT_RECOVERY', nativeValidated: false, phase: args[1], bindings, recovery: store.recovery, readyGallery, state, comparison, exitCode,
      limitations: ['Actual generated JSON reopen; injected faults are not Android/power-loss durability proof.', 'Fake vectors only; no private images/model/camera/radio or automatic recapture.'] };
    const bytes = encode(report);
    fs.writeFileSync(path.join(output, 'source-manifest.json'), sourceBytes, { flag: 'wx' }); fs.writeFileSync(path.join(output, 'report.json'), bytes, { flag: 'wx' });
    fs.writeFileSync(path.join(output, 'receipt.json'), encode({ kind: 'GENERATED_ENROLLMENT_RECEIPT', reportSha256: hash(bytes), sourceSha256: bindings.sourceSha256, fixtureSha256: bindings.fixtureSha256,
      exitCode, store: store.root, destination: output, createdUtc: new Date().toISOString(), deterministicExclusions: ['receipt.json store/destination/createdUtc only'] }), { flag: 'wx' });
    console.log(JSON.stringify({ kind: report.kind, phase: args[1], exitCode, readyGallery, interrupted: store.recovery.interrupted, output })); return exitCode;
  } catch (error) {
    fs.writeFileSync(path.join(output, 'operation-error.json'), encode({ kind: 'GENERATED_ENROLLMENT_DIAGNOSTIC', nativeValidated: false, error: error instanceof Error ? error.message : 'OPERATIONAL_ERROR', bindings, readyGallery: false }), { flag: 'wx' });
    throw error;
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.exitCode = run(process.argv.slice(2)); }
  catch (error) { console.error(JSON.stringify({ kind: 'GENERATED_SESSION_DIAGNOSTIC', exitCode: 1,
    error: error instanceof Error ? error.message : 'OPERATIONAL_ERROR' })); process.exitCode = 1; }
}
