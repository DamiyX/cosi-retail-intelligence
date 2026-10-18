import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { ScanSession, LIMITS } from '../src/phoneCapture/session.ts';
import type { Adapter, Binding } from '../src/phoneCapture/session.ts';
import { GeneratedAdapter, VirtualClock, parseScenario, simulate } from '../src/phoneCapture/generated.ts';

const lab = path.resolve(__dirname, '..');
const evidence = path.join(lab, 'runs/phone-experiment/p2-generated-01-c1-20261014-a1');
const fixture = (name = 'complete') => JSON.parse(fs.readFileSync(path.join(lab, 'fixtures/phone-capture-session', name + '.json'), 'utf8'));
const pins = { sourceSha256: 'a'.repeat(64), modelSha256: 'b'.repeat(64), recipeSha256: 'c'.repeat(64) };
const binding = (sessionId = 'scan-1'): Binding => ({ ...pins, sessionId, galleryRevision: 'generated-gallery-v1' });
const vector = { kind: 'VECTOR' as const, values: [1, 0] };
function setup(adapter = new GeneratedAdapter()) {
  const clock = new VirtualClock(), controller = new ScanSession(clock, adapter);
  controller.start(binding()); return { clock, controller, adapter };
}
function finish(s: ReturnType<typeof setup>, job: number, at: number) {
  s.clock.set(at); s.adapter.deliver(job, 'CAPTURE'); s.adapter.deliver(job, 'COMPLETE', vector);
}

test('normal authored scan retains three attempts/four arms; hand-computed first vs three-frame rankings', () => {
  const report = simulate(fixture(), pins), trial = report.trials[0];
  expect(report.complete).toBe(true); expect(report.exitCode).toBe(0);
  expect(report.scheduledAttemptDenominator).toBe(3); expect(report.armDenominator).toBe(4);
  expect(trial.counts).toMatchObject({ attempted: 3, selected: 3, usable: 3, missing: 0 });
  expect(trial.arms.map(a => a.candidates[0].productId)).toEqual(['a', 'a', 'b', 'a']);
  expect(trial.arms[2].candidates[0].score).toBeCloseTo(2 / 3, 14);
  expect(trial.arms[2].candidates[1].score).toBeCloseTo(1 / 3, 14);
  expect(trial.arms[3].candidates[0].score).toBe(1);
  expect(report.resources.every(r => r.releaseCalls === 1)).toBe(true);
  expect(report.state.sessions[0].frames.map(f => [f.requestAtMs, f.capturedAtMs, f.completedAtMs])).toEqual([[0, 0, 100], [400, 400, 500], [800, 800, 900]]);
});
test('ties follow ASCII product/reference IDs and selection never uses vector magnitude or outcome score', () => {
  const scenario = fixture();
  scenario.gallery.reverse(); scenario.gallery[0].productId = 'z';
  for (const product of scenario.gallery) for (const ref of product.references) ref.values = [1, 0];
  const report = simulate(scenario, pins);
  for (const arm of report.trials[0].arms) { expect(arm.exactTopTie).toEqual(['a', 'z']); expect(arm.candidates[0].perFrame[0].nearestReferenceId).toBe('a1'); }
  const changed = fixture(); for (const e of changed.events) if (e.action === 'COMPLETE') e.outcome.values = [50, 50];
  expect(simulate(changed, pins).trials[0].slots.map(s => s.frame?.selected)).toEqual([true, true, true]);
});
test('zero queue, maximum three attempts and exact capture gap with no deferred catch-up jobs', () => {
  const s = setup(); expect(s.controller.request()).toBe(true); expect(s.controller.request()).toBe(false);
  finish(s, 1, 0); s.clock.set(399); expect(s.controller.request()).toBe(false);
  s.clock.set(400); expect(s.controller.request()).toBe(true); finish(s, 2, 400);
  s.clock.set(800); expect(s.controller.request()).toBe(true); finish(s, 3, 800);
  expect(s.controller.request()).toBe(false); expect(s.adapter.handles).toHaveLength(3);
  expect(s.controller.snapshot().state).toBe('COMPLETE');
});
test.each([2999, 3000, 3001])('completion boundary %i is strict; exact deadline is late and job admission denied', at => {
  const s = setup(); s.controller.request(); finish(s, 1, 0);
  s.clock.set(400); s.controller.request(); finish(s, 2, 400);
  s.clock.set(800); s.controller.request(); s.adapter.deliver(3, 'CAPTURE');
  s.clock.set(at); s.adapter.deliver(3, 'COMPLETE', vector);
  const result = s.controller.snapshot();
  expect(result.sessions[0].frames[2].disposition).toBe(at < 3000 ? 'USABLE' : 'LATE');
  expect(result.state).toBe(at < 3000 ? 'COMPLETE' : 'DEADLINE');
  expect(s.adapter.handles[2].releaseCalls).toBe(1);
  expect(s.controller.request()).toBe(false);
});
test('first capture job starting exactly at deadline is refused without allocating a handle', () => {
  const s = setup(); s.clock.set(3000); expect(s.controller.request()).toBe(false);
  expect(s.adapter.handles).toHaveLength(0); expect(s.controller.snapshot().state).toBe('DEADLINE');
});
test.each(['USER', 'BACKGROUND', 'UNMOUNT', 'OFFLINE_POLICY_LOSS'] as const)('%s invalidation blocks Start until actual owned completion', reason => {
  const s = setup(); s.controller.request(); s.adapter.deliver(1, 'CAPTURE');
  s.clock.set(20); s.controller.cancel(reason); expect(s.controller.snapshot().state).toBe('DRAINING');
  expect(s.controller.start(binding('scan-2'))).toBe(false); expect(s.adapter.handles[0].releaseCalls).toBe(0);
  s.clock.set(30); s.adapter.deliver(1, 'COMPLETE', vector);
  expect(s.controller.snapshot().sessions[0].frames[0].values).toBeNull();
  expect(s.controller.start(binding('scan-2'))).toBe(true); expect(s.adapter.handles[0].releaseCalls).toBe(1);
});
test('cancel-at-final-completion ordering is explicit; cancellation cannot erase earlier partial evidence', () => {
  for (const cancelFirst of [true, false]) {
    const s = setup(); s.controller.request(); finish(s, 1, 0); s.clock.set(400); s.controller.request(); finish(s, 2, 400);
    s.clock.set(800); s.controller.request(); s.adapter.deliver(3, 'CAPTURE'); s.clock.set(900);
    if (cancelFirst) s.controller.cancel(); s.adapter.deliver(3, 'COMPLETE', vector); if (!cancelFirst) s.controller.cancel();
    const result = s.controller.snapshot(); expect(result.state).toBe(cancelFirst ? 'CANCELLED' : 'COMPLETE');
    expect(result.sessions[0].frames.filter(f => f.disposition === 'USABLE')).toHaveLength(cancelFirst ? 2 : 3);
    expect(s.adapter.handles[2].releaseCalls).toBe(1);
  }
});
test('never-finishing job remains draining after deadline, even though cancel signal returns normally', () => {
  const s = setup(); s.controller.request(); s.clock.set(3000); s.controller.poll();
  s.clock.set(60000); expect(s.controller.poll().stillOwnedWork).toBe(true);
  expect(s.controller.start(binding('scan-2'))).toBe(false); expect(s.adapter.handles[0].releaseCalls).toBe(0);
  expect(s.adapter.handles[0].cancelReasons).toEqual(['SESSION_DEADLINE']);
});
test('duplicate/old/wrong-gallery callbacks cannot publish vectors or release a new job', () => {
  const s = setup(); s.controller.request(); s.adapter.deliver(1, 'CAPTURE'); s.controller.cancel(); s.adapter.deliver(1, 'COMPLETE', vector);
  s.controller.start(binding('scan-2')); s.controller.request(); s.adapter.deliver(2, 'CAPTURE');
  s.adapter.deliver(1, 'COMPLETE', { kind: 'VECTOR', values: [0, 1] }); s.adapter.deliver(1, 'CAPTURE');
  s.adapter.deliver(2, 'COMPLETE', vector, { galleryRevision: 'wrong' });
  s.adapter.deliver(2, 'COMPLETE', vector, { sessionId: 'scan-1' });
  expect(s.controller.snapshot().stillOwnedWork).toBe(true); expect(s.adapter.handles.map(h => h.releaseCalls)).toEqual([1, 0]);
  s.adapter.deliver(2, 'COMPLETE', vector); s.adapter.deliver(2, 'COMPLETE', vector);
  expect(s.adapter.handles.map(h => h.releaseCalls)).toEqual([1, 1]);
  expect(s.controller.snapshot().sessions[0].frames[0].values).toBeNull();
  expect(s.controller.snapshot().sessions[1].frames[0].values).toEqual([1, 0]);
});
test.each(['CAPTURE_ERROR', 'DECODE_ERROR', 'INFERENCE_ERROR'])('%s terminalizes retained partial frames without automatic retry', code => {
  const s = setup(); s.controller.request(); finish(s, 1, 0); s.clock.set(400); s.controller.request();
  s.adapter.deliver(2, 'COMPLETE', { kind: 'FAILURE', code });
  expect(s.controller.snapshot().state).toBe('FAILED'); expect(s.controller.request()).toBe(false);
  expect(s.controller.snapshot().sessions[0].frames[0].values).toEqual([1, 0]);
  expect(s.controller.snapshot().sessions[0].frames[1].failureCode).toBe(code);
});
test('resource creation/start/release failures never invent a drain or repeat release', () => {
  const clock = new VirtualClock(); let callbacks: Parameters<ReturnType<Adapter['create']>['begin']>[0] | undefined; let releases = 0;
  const c = new ScanSession(clock, { create: () => ({ begin: cb => { callbacks = cb; throw Error('start'); }, cancel: () => {}, release: () => { releases++; throw Error('release'); } }) });
  c.start(binding()); c.request(); expect(c.snapshot().state).toBe('DRAINING');
  callbacks!.completed(c.snapshot().sessions[0].frames[0].binding, vector);
  callbacks!.completed(c.snapshot().sessions[0].frames[0].binding, vector);
  expect(releases).toBe(1); expect(c.snapshot().stillOwnedWork).toBe(true); expect(c.start(binding('scan-2'))).toBe(false);
  const noHandle = new ScanSession(clock, { create: () => { throw Error('create'); } });
  noHandle.start(binding()); noHandle.request(); expect(noHandle.snapshot().state).toBe('FAILED'); expect(noHandle.snapshot().stillOwnedWork).toBe(false);
});
test('start error stays a failed frame after actual drain, without publishing a vector', () => {
  const clock = new VirtualClock(); let callbacks: Parameters<ReturnType<Adapter['create']>['begin']>[0] | undefined; let releases = 0;
  const c = new ScanSession(clock, { create: () => ({ begin: cb => { callbacks = cb; throw Error('start'); }, cancel: () => {}, release: () => { releases++; } }) });
  c.start(binding()); c.request(); expect(c.snapshot().state).toBe('DRAINING');
  const token = c.snapshot().sessions[0].frames[0].binding;
  callbacks!.completed(token, vector);
  expect(c.snapshot().sessions[0].frames[0]).toMatchObject({ disposition: 'FAILED', failureCode: 'START_ERROR', values: null, released: true });
  expect(releases).toBe(1); expect(c.snapshot().stillOwnedWork).toBe(false);
});
test('empty/readiness/permission/offline/error traces retain every arm and planned attempt denominator', () => {
  for (const name of ['not-ready', 'permission', 'offline-loss', 'failed', 'late', 'never-finishing', 'cancelled']) {
    const report = simulate(fixture(name), pins); expect(report.complete).toBe(false); expect(report.exitCode).toBe(2);
    expect(report.trialDenominator).toBe(1); expect(report.armDenominator).toBe(4); expect(report.trials[0].slots).toHaveLength(3);
    expect(report.trials[0].arms).toHaveLength(4);
  }
  const empty = fixture(); empty.events = [];
  expect(simulate(empty, pins).trials[0].counts).toMatchObject({ attempted: 0, missing: 3 });
  expect(simulate(fixture('failed'), pins).trials[0].arms[0]).toMatchObject({ status: 'GENERATED_PARTIAL', acquisition: 'ONE_FRAME_FALLBACK' });
  expect(simulate(fixture('stale'), pins).armDenominator).toBe(8);
});
test('malformed/real/oversized/nonmonotonic/capped traces and product truth in core bindings refuse', () => {
  expect(() => parseScenario(fixture('malformed'))).toThrow();
  const valid = fixture(); expect(() => parseScenario({ ...valid, truth: 'a' })).toThrow();
  expect(() => parseScenario({ ...valid, nativeValidated: true })).toThrow();
  expect(() => parseScenario({ ...valid, events: Array(4097).fill({ atMs: 0, action: 'POLL' }) })).toThrow('OVERSIZED');
  expect(() => parseScenario({ ...valid, events: [{ atMs: 1, action: 'POLL' }, { atMs: 0, action: 'POLL' }] })).toThrow('NON_MONOTONIC');
  expect(() => parseScenario({ ...valid, events: Array(76).fill(valid.events[0]) })).toThrow('CAP');
  const s = setup(); s.clock.set(1); s.controller.poll(); expect(() => s.clock.set(0)).toThrow();
  s.controller.cancel(); expect(() => s.controller.start({ ...binding('scan-2'), truth: 'a' } as Binding)).toThrow('INVALID_BINDING');
});
test('event limit retains bounded ledger and owned work drains only on actual completion', () => {
  const s = setup(); s.controller.request(); s.adapter.deliver(1, 'CAPTURE');
  for (let i = 0; i < 4100; i++) s.adapter.deliver(1, 'CAPTURE');
  expect(s.controller.snapshot().events).toHaveLength(LIMITS.events); expect(s.controller.snapshot().stillOwnedWork).toBe(true);
  s.adapter.deliver(1, 'COMPLETE', vector); expect(s.controller.snapshot().stillOwnedWork).toBe(false);
  expect(s.controller.snapshot().sessions[0].frames[0].values).toBeNull(); expect(s.adapter.handles[0].releaseCalls).toBe(1);
});
test('snapshots isolate mutable report consumers from ownership and frozen evidence', () => {
  const s = setup(); s.controller.request(); finish(s, 1, 0); const snapshot = s.controller.snapshot();
  snapshot.sessions[0].frames[0].values![0] = 99; snapshot.sessions[0].binding.galleryRevision = 'changed';
  expect(s.controller.snapshot().sessions[0].frames[0].values).toEqual([1, 0]);
  expect(s.controller.snapshot().sessions[0].binding.galleryRevision).toBe('generated-gallery-v1');
});
test('C1 A1 factory re-entry reserves admission before another request or Start', () => {
  const clock = new VirtualClock(); let controller: ScanSession; let creates = 0;
  const nested: boolean[] = [], begun: string[] = [];
  controller = new ScanSession(clock, { create: token => {
    creates++;
    if (creates === 1) { nested.push(controller.request()); controller.cancel(); nested.push(controller.start(binding('scan-2'))); }
    return { begin: () => { begun.push(token.jobId); }, cancel: () => {}, release: () => {} };
  } });
  controller.start(binding()); controller.request();
  expect(nested).toEqual([false, false]); expect(creates).toBe(1); expect(begun).toEqual(['job-1']);
  expect(controller.snapshot().sessions).toHaveLength(1); expect(controller.snapshot().sessions[0].frames).toHaveLength(1);
  expect(controller.snapshot().stillOwnedWork).toBe(true);
});
test.each(['offline', 'permission'] as const)('C1 A2 busy %s loss invalidates publication once and retains earlier usable evidence', gate => {
  const s = setup(); s.controller.request(); finish(s, 1, 0); s.clock.set(400); s.controller.request(); s.adapter.deliver(2, 'CAPTURE');
  s.clock.set(450); const gates = { ready: true, offline: true, permission: true, [gate]: false };
  expect(s.controller.request(gates)).toBe(false); expect(s.controller.request(gates)).toBe(false);
  expect(s.controller.snapshot().state).toBe('DRAINING'); expect(s.controller.start(binding('scan-2'))).toBe(false);
  expect(s.adapter.handles[1].cancelReasons).toEqual([gate === 'offline' ? 'OFFLINE_POLICY_LOSS' : 'PERMISSION_DENIED']);
  expect(s.adapter.handles[1].releaseCalls).toBe(0);
  s.clock.set(500); s.adapter.deliver(2, 'COMPLETE', vector); s.adapter.deliver(2, 'COMPLETE', vector);
  const result = s.controller.snapshot(); expect(result.sessions[0].frames[0].values).toEqual([1, 0]);
  expect(result.sessions[0].frames[1].values).toBeNull(); expect(s.adapter.handles[1].releaseCalls).toBe(1);
  expect(result.sessions[0].terminal).toBe(gate === 'offline' ? 'CANCELLED' : 'FAILED');
  expect(s.controller.start(binding('scan-2'))).toBe(true);
});
test.each([2999, 3000, 3001])('C1 factory crossing to %i observes strict deadline before begin and never invents drain', at => {
  const clock = new VirtualClock(); let callbacks: Parameters<ReturnType<Adapter['create']>['begin']>[0] | undefined;
  let controller: ScanSession; const cancel: string[] = []; let releases = 0;
  controller = new ScanSession(clock, { create: () => {
    clock.set(at);
    return { begin: cb => { callbacks = cb; }, cancel: reason => { cancel.push(reason); }, release: () => { releases++; } };
  } });
  controller.start(binding()); controller.request(); const before = controller.snapshot();
  expect(before.state).toBe(at < 3000 ? 'RUNNING' : 'DRAINING'); expect(before.stillOwnedWork).toBe(true);
  expect(releases).toBe(0); expect(cancel).toEqual(at < 3000 ? [] : ['SESSION_DEADLINE']);
  const token = before.sessions[0].frames[0].binding; callbacks!.captured(token); callbacks!.completed(token, vector);
  expect(controller.snapshot().sessions[0].frames[0].disposition).toBe(at < 3000 ? 'USABLE' : 'LATE'); expect(releases).toBe(1);
});
test.each(['cancel', 'deadline-poll'] as const)('C1 %s during creation retains the reservation and signals the returned resource once', cause => {
  const clock = new VirtualClock(); let controller: ScanSession;
  let callbacks: Parameters<ReturnType<Adapter['create']>['begin']>[0] | undefined;
  const observations: boolean[] = [], signals: string[] = []; let released = 0;
  controller = new ScanSession(clock, { create: () => {
    if (cause === 'cancel') controller.cancel(); else { clock.set(3000); controller.poll(); }
    observations.push(controller.snapshot().stillOwnedWork, controller.start(binding('scan-2')));
    return { begin: cb => { callbacks = cb; }, cancel: reason => { signals.push(reason); }, release: () => { released++; } };
  } });
  controller.start(binding()); controller.request(); expect(observations).toEqual([true, false]);
  expect(signals).toEqual([cause === 'cancel' ? 'USER' : 'SESSION_DEADLINE']); expect(released).toBe(0);
  expect(controller.snapshot().state).toBe('DRAINING'); const token = controller.snapshot().sessions[0].frames[0].binding;
  callbacks!.completed(token, vector); expect(released).toBe(1); expect(controller.snapshot().stillOwnedWork).toBe(false);
  expect(controller.snapshot().sessions[0].frames[0].values).toBeNull();
});
test('C1 factory cancellation followed by throw clears only its unstarted reservation, without a fictional release', () => {
  const clock = new VirtualClock(); let controller: ScanSession; let nested: boolean | undefined; let creates = 0;
  controller = new ScanSession(clock, { create: () => { creates++; controller.cancel(); nested = controller.start(binding('scan-2')); throw Error('factory'); } });
  controller.start(binding()); controller.request(); expect(nested).toBe(false); expect(creates).toBe(1);
  expect(controller.snapshot().stillOwnedWork).toBe(false);
  expect(controller.snapshot().sessions[0].frames[0]).toMatchObject({ failureCode: 'CREATE_ERROR', releaseAttempts: 0, released: false });
  expect(controller.start(binding('scan-2'))).toBe(true);
});
test('C1 synchronous cancellation drain can start a newer owner without the old cancel path touching it', () => {
  const clock = new VirtualClock(); let controller: ScanSession; let creates = 0; const releaseCalls = [0, 0], signals = [0, 0];
  controller = new ScanSession(clock, { create: token => {
    const index = creates++; let callbacks: Parameters<ReturnType<Adapter['create']>['begin']>[0];
    return { begin: cb => { callbacks = cb; cb.captured(token); }, release: () => { releaseCalls[index]++; }, cancel: () => {
      signals[index]++; callbacks.completed(token, vector);
      if (index === 0) { expect(controller.start(binding('scan-2'))).toBe(true); expect(controller.request()).toBe(true); throw Error('old cancel returned error after drain'); }
    } };
  } });
  controller.start(binding()); controller.request(); controller.request({ ready: true, offline: false, permission: true });
  const snapshot = controller.snapshot(); expect(snapshot.sessions[0].frames[0].values).toBeNull();
  expect(snapshot.sessions[1].terminal).toBeNull(); expect(snapshot.activeJobId).toBe('job-2'); expect(snapshot.stillOwnedWork).toBe(true);
  expect(releaseCalls).toEqual([1, 0]); expect(signals).toEqual([1, 0]);
});
test('C1 ready:false while busy is readiness only, and synchronous normal completion remains usable', () => {
  const s = setup(); s.controller.request(); s.adapter.deliver(1, 'CAPTURE');
  expect(s.controller.request({ ready: false, permission: true, offline: true })).toBe(false);
  expect(s.controller.snapshot().sessions[0].terminal).toBeNull(); expect(s.adapter.handles[0].cancelReasons).toEqual([]);
  s.adapter.deliver(1, 'COMPLETE', vector); expect(s.controller.snapshot().sessions[0].frames[0].disposition).toBe('USABLE');
});
test('actual CLI retains valid incomplete exits, deterministic output, invalid input/escape and overwrite refusals', () => {
  const cli = path.join(lab, 'src/phoneCapture/cli.ts');
  const call = (scenario: string, leaf: string) => spawnSync(process.execPath, [cli, '--scenario', scenario, '--out', leaf], { cwd: lab, encoding: 'utf8' });
  const names = ['complete', 'complete', 'cancelled', 'late', 'stale', 'malformed'];
  const outputs = names.map((name, i) => {
    const leaf = 'cli-jest-' + randomUUID(); const done = call(name, leaf);
    expect(done.status).toBe(i < 2 ? 0 : name === 'malformed' ? 1 : 2);
    return { name, leaf, done, destination: path.join(evidence, leaf) };
  });
  expect(fs.readFileSync(path.join(outputs[0].destination, 'report.json'))).toEqual(fs.readFileSync(path.join(outputs[1].destination, 'report.json')));
  expect(fs.readFileSync(path.join(outputs[0].destination, 'source-manifest.json'))).toEqual(fs.readFileSync(path.join(outputs[1].destination, 'source-manifest.json')));
  const before = fs.readFileSync(path.join(outputs[0].destination, 'report.json'));
  expect(call('complete', outputs[0].leaf).status).toBe(1); expect(fs.readFileSync(path.join(outputs[0].destination, 'report.json'))).toEqual(before);
  expect(call('complete', '../escape').status).toBe(1); expect(call('complete', 'C:\\escape').status).toBe(1);
  expect(call('private-path.jpg', 'cli-refused-' + randomUUID()).status).toBe(1);
  expect(fs.existsSync(outputs[5].destination)).toBe(false);
  fs.writeFileSync(path.join(evidence, 'jest-cli-evidence-' + randomUUID() + '.json'), JSON.stringify(outputs.map(o => ({ name: o.name, output: o.destination, exit: o.done.status, stdout: o.done.stdout, stderr: o.done.stderr })), null, 2), { flag: 'wx' });
});
