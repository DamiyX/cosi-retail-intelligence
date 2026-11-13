"""Timing C1: same command costs, actual concurrent adapter, no phone client.

The real-clock profile spends 24.547 seconds on visual qualification. Its transport
is synthetic; concurrency is executed by the production ThreadPoolExecutor path.
"""
import copy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from unittest.mock import patch
import uuid

import controller_v5 as c
from test_session import Clock, Device, packet


DIAGNOSTICS = c.ROOT / 'apps/recognition-lab/runs/phone-experiment/p203-session-control-v5-timing-c2-20261027-a1'


def command_trace(adapter, session, clock):
    """Test-only attribution at transport entry, independent of clock precision.

    The adapter clears action in tap's finally before TERMINAL observations.
    Capture workers finish before that return. Sequence/action/phase are fixed
    at entry; only the corresponding transport completion fields change later.
    """
    transport = adapter.transport._pump
    trace, lock = [], threading.Lock()
    def pump(args, timeout, cap, sink, diagnostic):
        with lock:
            c.require(len(trace) < 256, 'TEST_TRACE_CAP')
            row = dict(sequence=len(trace), action=adapter.action, phase=session.phase,
                       command=list(args[3:]), started=clock.now(), timeout=timeout, cap=cap)
            trace.append(row)
        try:
            result = transport(args, timeout, cap, sink, diagnostic)
            row['transportExitCode'] = result[0]
            return result
        except BaseException as error:
            row['transportError'] = c.code(error)
            raise
        finally:
            row['ended'] = clock.now()
    adapter.transport._pump = pump
    return trace


def persist_diagnostic(report, trace):
    # Write BEFORE assertions, including on session/transport exceptions. Unique
    # names preserve failed runs; no existing receipt is replaced or retried.
    DIAGNOSTICS.mkdir(parents=True, exist_ok=True)
    path = DIAGNOSTICS / ('command-trace-' + str(uuid.uuid4()) + '.json')
    c.v4.exclusive(path, c.canonical(dict(report, commands=trace)))
    print(json.dumps(dict(report, commandTracePath=str(path))), flush=True)
    return path


def assert_capture_stage(case, trace):
    rows = [row for row in trace if row['action'] == 'capture']
    case.assertTrue(all(row['phase'] == 'CAPTURE' for row in rows))
    calls = [row['command'] for row in rows]
    case.assertEqual(sum(args[:2] == ['shell', 'pidof'] for args in calls), 2)
    case.assertEqual(sum(args[0] == 'shell' and 'mCurrentFocus' in args[1] for args in calls), 2)
    case.assertEqual(sum(args[:3] == ['shell', 'uiautomator', 'dump'] for args in calls), 1)
    case.assertEqual(sum(args[:2] == ['exec-out', 'cat'] for args in calls), 1)
    case.assertEqual(sum(args[:3] == ['shell', 'input', 'tap'] for args in calls), 1)
    case.assertEqual(len(calls), 7)


class CommandAttributionTests(unittest.TestCase):
    def test_identical_completion_and_terminal_timestamp_does_not_add_capture_pid(self):
        with tempfile.TemporaryDirectory() as out:
            clock=Clock();d=Device(clock,packet());a=d.adapter()
            s=c.Session(a,packet(),out,clock.now,clock.advance);trace=command_trace(a,s,clock)
            with patch.object(c.time,'monotonic',clock.now):
                pre=s.prepare(clock.now());clock.advance(24.547);after=clock.now()
                outcome=s.run(pre['sha256'])
            completion=c.load(Path(out)/'capture-completion.json')['monotonic']
            legacy=[row for row in trace if after<=row['started']<=completion]
            capture=[row for row in trace if row['action']=='capture']
            tied=[row for row in trace if row['phase']=='TERMINAL' and row['started']==completion]
            report=dict(profile='C2-deterministic-adjacent-timestamp-tie',outcome=outcome,
                completion=completion,legacyPidCount=sum(row['command'][:2]==['shell','pidof'] for row in legacy),
                semanticPidCount=sum(row['command'][:2]==['shell','pidof'] for row in capture),
                tiedTerminalCommands=[row['sequence'] for row in tied])
            persist_diagnostic(report,trace)
            self.assertEqual(outcome,'PUBLISHED')
            self.assertEqual(report['legacyPidCount'],3)
            self.assertEqual(report['semanticPidCount'],2)
            self.assertEqual(len(tied),1)
            self.assertEqual(tied[0]['command'][:2],['shell','pidof'])
            assert_capture_stage(self,trace)
    def test_genuine_extra_capture_pid_is_still_rejected_and_trace_retained(self):
        with tempfile.TemporaryDirectory() as out:
            clock=Clock();d=Device(clock,packet());a=d.adapter()
            s=c.Session(a,packet(),out,clock.now,clock.advance);trace=command_trace(a,s,clock)
            observation=a._capture_observation
            def extra_pid(deadline):
                state=observation(deadline);a._same_pid(deadline);return state
            a._capture_observation=extra_pid
            with patch.object(c.time,'monotonic',clock.now):
                pre=s.prepare(clock.now());outcome=s.run(pre['sha256'])
            rows=[row for row in trace if row['action']=='capture']
            path=persist_diagnostic(dict(profile='C2-injected-extra-capture-pid',outcome=outcome,
                semanticPidCount=sum(row['command'][:2]==['shell','pidof'] for row in rows)),trace)
            with self.assertRaises(AssertionError):assert_capture_stage(self,trace)
            self.assertEqual(sum(row['command'][:2]==['shell','pidof'] for row in rows),3)
            self.assertEqual(len(c.load(path,1024*1024)['commands']),len(trace))


class AdapterBoundaryTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.out=Path(self.temp.name);self.clock=Clock();self.p=packet();self.d=Device(self.clock,self.p)
        self.a=self.d.adapter();self.s=c.Session(self.a,self.p,self.out,self.clock.now,self.clock.advance)
        self.clock_patch=patch.object(c.time,'monotonic',self.clock.now);self.clock_patch.start();self.addCleanup(self.clock_patch.stop)
        self.pre=self.s.prepare(self.clock.now())
    def test_screenshot_identity_checks_overlap_but_pixels_wait_for_both(self):
        for fail in ['pid','focus']:
            with self.subTest(fail=fail):
                if fail=='pid':self.d.pid='999'
                else:self.d.lost_focus=True
                start=len(self.d.calls)
                with self.assertRaises(ValueError):self.a.screenshot(self.clock.now()+20)
                commands=[args[:2] for args,_,_ in self.d.calls[start:]]
                self.assertNotIn(['exec-out','screencap'],commands)
                self.d.pid='123';self.d.lost_focus=False
    def test_new_capture_read_boundaries_refuse_changed_identity_and_state(self):
        # Each variant gets its own consumed session, never reuses this setUp row.
        mutations=[('process',str(uuid.uuid4())),('lifecycle',99),('viewGeneration',99),
            ('nonce',str(uuid.uuid4())),('generatedExportVerified',False),('previewMounted',False),
            ('geometryReady',False),('busy',True),('layout','B'),('source','0'*64),('apk','0'*64)]
        for boundary in ['dump','cat']:
            for field,value in mutations:
                with self.subTest(boundary=boundary,field=field),tempfile.TemporaryDirectory() as out:
                    clock=Clock();p=packet();d=Device(clock,p);a=d.adapter();s=c.Session(a,p,out,clock.now,clock.advance)
                    with patch.object(c.time,'monotonic',clock.now):
                        pre=s.prepare(clock.now())
                        def mutate(args):
                            if boundary=='dump' and args[:3]==['shell','uiautomator','dump'] or boundary=='cat' and args[:2]==['exec-out','cat']:
                                d.state['marker'][field]=value
                        d.hook=mutate
                        with self.assertRaises(ValueError):s.run(pre['sha256'])
                    self.assertNotIn('capture',d.inputs)
                    self.assertTrue(c.load(Path(out)/'session-result.json')['noReplay'])
    def test_process_and_focus_rechecked_after_dump_before_input(self):
        for changed in ['pid','focus']:
            with self.subTest(changed=changed),tempfile.TemporaryDirectory() as out:
                clock=Clock();p=packet();d=Device(clock,p);a=d.adapter();s=c.Session(a,p,out,clock.now,clock.advance)
                with patch.object(c.time,'monotonic',clock.now):
                    pre=s.prepare(clock.now());count=0
                    def mutate(args):
                        nonlocal count
                        if args[:2]==['shell','pidof']:
                            count+=1
                            if count==2:
                                if changed=='pid':d.pid='999'
                                else:d.lost_focus=True
                    d.hook=mutate
                    with self.assertRaises(ValueError):s.run(pre['sha256'])
                self.assertNotIn('capture',d.inputs)
    def test_lease_change_at_snapshot_guard_and_input_all_refuse(self):
        for boundary in ['dump','cat','guard']:
            with self.subTest(boundary=boundary),tempfile.TemporaryDirectory() as out:
                clock=Clock();p=packet();d=Device(clock,p);a=d.adapter();s=c.Session(a,p,out,clock.now,clock.advance)
                with patch.object(c.time,'monotonic',clock.now):
                    pre=s.prepare(clock.now());valid=[True]
                    def live():c.require(valid[0],'CURRENT_EXECUTION_LEASE_REQUIRED')
                    a.live=live
                    if boundary=='guard':
                        original=a.on_observation
                        def snapshot(state):original(state);valid[0]=False
                        a.on_observation=snapshot
                    else:
                        d.hook=lambda args:valid.__setitem__(0,False) if (boundary=='dump' and args[:3]==['shell','uiautomator','dump'] or boundary=='cat' and args[:2]==['exec-out','cat']) else None
                    with self.assertRaisesRegex(ValueError,'CURRENT_EXECUTION_LEASE_REQUIRED'):s.run(pre['sha256'])
                self.assertNotIn('capture',d.inputs)
    def test_each_new_read_stage_and_input_share_original_deadline(self):
        for command in ['shell uiautomator dump','exec-out cat '+self.a.UI,'shell input tap']:
            with self.subTest(command=command),tempfile.TemporaryDirectory() as out:
                clock=Clock();p=packet();d=Device(clock,p);a=d.adapter();s=c.Session(a,p,out,clock.now,clock.advance)
                with patch.object(c.time,'monotonic',clock.now):
                    pre=s.prepare(clock.now());d.costs[command]=150
                    with self.assertRaises(ValueError):s.run(pre['sha256'])
                    # Parallel read jobs may consume fake time sequentially; the
                    # real production _run still passes the same absolute bound.
                    self.assertLessEqual(clock.now(),s.capture_deadline())
                if command!='shell input tap':self.assertNotIn('capture',d.inputs)
    def test_parallel_failure_drains_all_jobs_and_does_not_dispatch(self):
        events=[]
        def failed():events.append('failed');raise ValueError('READ_FAILED')
        def done():events.append('done');return 1
        with self.assertRaisesRegex(ValueError,'READ_FAILED'):self.a._parallel(failed,done)
        self.assertCountEqual(events,['failed','done']);self.assertNotIn('capture',self.d.inputs)
    def test_current_selector_disabled_control_refuses(self):
        self.d.disabled.add('capture')
        with self.assertRaisesRegex(ValueError,'ONE_ENABLED_OWN_CONTROL'):self.s.run(self.pre['sha256'])
        self.assertNotIn('capture',self.d.inputs)


class RealClock:
    def now(self):return time.monotonic()
    def advance(self,seconds):time.sleep(max(0,seconds))


class ActualConcurrentPathTests(unittest.TestCase):
    def test_same_slow_profile_passes_real_concurrent_path_with_positive_margin(self):
        with tempfile.TemporaryDirectory() as out:
            clock=RealClock();p=packet();d=Device(clock,p);a=d.adapter()
            d.cost=5.032/6
            d.delay.update(close=1,restore=2,geometry=4,inspect=3,ack=2,capture=7.06545)
            s=c.Session(a,p,out,clock.now,clock.advance)
            trace=command_trace(a,s,clock)
            row=dict(profile='C2-real-clock-synthetic-transport',perCommandSeconds=d.cost,
                requestedQualificationSeconds=24.547)
            try:
                ready=clock.now();pre=s.prepare(ready)
                qualification_start=clock.now();clock.advance(24.547);qualification_elapsed=clock.now()-qualification_start
                outcome=s.run(pre['sha256'])
                result=c.load(Path(out)/'session-result.json')
                dispatch=c.load(Path(out)/'capture-dispatch.json')['monotonic']
                completion=c.load(Path(out)/'capture-completion.json')['monotonic']
                row.update(outcome=outcome,actualQualificationSeconds=qualification_elapsed,
                    preAcquisitionSeconds=pre['savedMonotonic']-pre['monotonic'],
                    preAgeAtDispatch=dispatch-pre['monotonic'],preAgeAtClientCompletion=completion-pre['monotonic'],
                    dispatchMarginSeconds=pre['monotonic']+30-dispatch,
                    completionMarginSeconds=pre['monotonic']+30-completion,
                    readyToCapture=dispatch-ready,readyToComplete=clock.now()-ready,
                    totalAdapterCommands=len(trace),hostCaptureDispatches=result['hostCaptureDispatches'],
                    screenshotAttempts=result['screenshotAttempts'])
            except BaseException as error:
                row['failure']=c.code(error)
                raise
            finally:
                persist_diagnostic(row,trace)
            self.assertEqual(outcome,'PUBLISHED')
            assert_capture_stage(self,trace)
            self.assertGreaterEqual(qualification_elapsed,24.547)
            self.assertGreater(row['completionMarginSeconds'],0)
            self.assertEqual(result['hostCaptureDispatches'],1);self.assertEqual(result['screenshotAttempts'],2)
    def test_parallel_path_runs_real_local_subprocesses_without_phone(self):
        clock=RealClock();d=Device(clock,packet());a=d.adapter();a.pid='123'
        lock=threading.Lock();active=[0,0]
        def pump(args,timeout,cap,sink,diagnostic):
            with lock:active[0]+=1;active[1]=max(active)
            try:
                run=subprocess.run([sys.executable,'-c',"import time;time.sleep(.05);print('123')"],
                    capture_output=True,timeout=timeout)
                sink(run.stdout);return run.returncode,run.stderr,{}
            finally:
                with lock:active[0]-=1
        a.transport._pump=pump
        a._parallel(*(lambda:a._same_pid(clock.now()+10) for _ in range(3)))
        self.assertEqual(active,[0,3])


if __name__=='__main__':unittest.main(verbosity=2)
