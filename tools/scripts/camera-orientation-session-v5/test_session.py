"""Real V5 controller and PinnedAdb methods over synthetic transport, no phone.

Callbacks complete on fake time, not when input returns. PNG and native metadata
are synthetic; this cannot establish physical timing, framing or native drain.
"""
import copy
import datetime
import importlib.util
import json
from pathlib import Path
import struct
import tempfile
import types
import unittest
from unittest.mock import patch
import uuid
import xml.etree.ElementTree as ET
import zlib
import threading

import controller_v5 as c
import main_session as runner


class Clock:
    def __init__(self): self.value = 100.
    def now(self): return self.value
    def advance(self, seconds): self.value += seconds


def png():
    def chunk(kind, body):
        return struct.pack('>I', len(body)) + kind + body + struct.pack('>I', zlib.crc32(kind + body) & 0xffffffff)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', 2, 2, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(b'\0' * 14)) + chunk(b'IEND', b'')


def packet():
    p = dict(run=c.v4.RUN, case=c.v4.CASES[0], source='1' * 64, apk='2' * 64,
             displayPixels=[2, 2], expectedViewport=dict(left=0, top=0, right=2, bottom=2), hardware={}, sandbox={})
    p['job'] = str(uuid.UUID(bytes=c.v4.hashlib.md5((p['run'] + ':' + p['case']).encode()).digest(), version=3))
    return p


class Device:
    def __init__(self, clock, p):
        self.clock, self.packet = clock, p
        self.state = dict(viewport=p['expectedViewport'].copy(), captureControlEnabled=False, marker=dict(
            version=1, run=p['run'], caseId=p['case'], jobId=p['job'], source=p['source'], apk=p['apk'],
            process=str(uuid.uuid4()), lifecycle=4, viewGeneration=14, layout='A', phase='IDLE',
            previewMounted=True, geometryReady=True, idle=True, busy=False, nonce=None, published=None,
            generatedExportVerified=True, firstExportVerified=False, captureError=None, inspectionError=None))
        self.queue, self.calls, self.inputs = [], [], []
        self.cost = .02
        self.costs = {}
        self.delay = dict(close=.3, restore=1., geometry=2., inspect=1.5, ack=.5, capture=2.)
        self.hook = lambda args: None
        self.terminal = 'PUBLISHED'
        self.disabled = set()
        self.lost_focus = False
        self.epoch_started = clock.now()
        self.timeout_action = None
        self.fail_screenshot = False
        self.pid = '123'
        self.tick_lock = threading.RLock()

    def schedule(self, delay, callback): self.queue.append((self.clock.now() + delay, callback))
    def tick(self):
        with self.tick_lock:
            self._tick_locked()
    def _tick_locked(self):
        for when, cb in sorted(self.queue.copy(), key=lambda row: row[0]):
            if self.clock.now() >= when:
                self.queue.remove((when, cb)); cb()
        m = self.state['marker']
        if m['previewMounted'] and m['phase'] == 'IDLE' and self.clock.now() - self.epoch_started >= 120:
            m.update(previewMounted=False, geometryReady=False, viewGeneration=m['viewGeneration'] + 1)
            self.state['captureControlEnabled'] = False

    def xml(self):
        self.tick()
        tree = ET.Element('hierarchy')
        ET.SubElement(tree, 'node', {'package': c.v4.PKG, 'content-desc': c.v4.MARKER + json.dumps(self.state['marker'])})
        v = self.state['viewport']
        ET.SubElement(tree, 'node', {'package': c.v4.PKG, 'resource-id': 'orientation-viewport',
            'bounds': f"[{v['left']},{v['top']}][{v['right']},{v['bottom']}]"})
        for i, (action, label) in enumerate(c.v4.LABELS.items()):
            enabled = action not in self.disabled and (action != 'capture' or self.state['captureControlEnabled'])
            ET.SubElement(tree, 'node', {'package': c.v4.PKG, 'text': label, 'clickable': 'true',
                'enabled': str(enabled).lower(), 'bounds': f'[{i % 2},{i // 2 % 2}][{i % 2 + 1},{i // 2 % 2 + 1}]', 'action': action})
        return ET.tostring(tree)

    def input(self, action):
        self.inputs.append(action)
        m = self.state['marker']
        if action == 'close':
            def closed():
                m.update(previewMounted=False, geometryReady=False, viewGeneration=m['viewGeneration'] + 1)
                self.state['captureControlEnabled'] = False
            self.schedule(self.delay['close'], closed)
        elif action == 'restore':
            def mounted():
                self.epoch_started = self.clock.now()
                m.update(previewMounted=True, geometryReady=False, nonce=None, viewGeneration=m['viewGeneration'] + 1)
                self.state['captureControlEnabled'] = False
            self.schedule(self.delay['restore'], mounted)
            self.schedule(self.delay['geometry'], lambda: m.update(geometryReady=True))
        elif action == 'inspect':
            self.schedule(.1, lambda: m.update(busy=True))
            self.schedule(self.delay['inspect'], lambda: m.update(busy=False, nonce=str(uuid.uuid4())))
        elif action == 'ack':
            self.schedule(self.delay['ack'], lambda: self.state.update(captureControlEnabled=True))
        elif action == 'capture':
            m.update(phase='CAPTURING', busy=True, idle=False)
            def done():
                m.update(phase=self.terminal, busy=False, idle=True,
                    published=True if self.terminal == 'PUBLISHED' else False if self.terminal == 'REFUSED' else None)
            self.schedule(self.delay['capture'], done)
        if action == self.timeout_action:
            raise ValueError('HOST_ADB_CLIENT_TIMEOUT_PHONE_DRAIN_UNKNOWN')

    def adapter(self, cls=c.PinnedAdb):
        a = object.__new__(cls)
        a.packet, a.pid, a.endpoint = self.packet, None, 'SYNTHETIC_ONLY'
        a.operation_deadline = a.action = None
        a.on_input = a.on_completion = lambda action: None
        a.on_observation = lambda state: None
        a.live = lambda: None
        a.charter = dict(lease=dict(expires_at=(datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=1)).isoformat()))
        def pump(args, timeout, cap, sink, diagnostic):
            args = args[3:]
            self.calls.append((args, timeout, self.clock.now()))
            self.hook(args)
            delay = self.costs.get(' '.join(args[:3]), self.cost)
            self.clock.advance(min(delay, timeout))
            if delay >= timeout: raise ValueError('HOST_ADB_CLIENT_TIMEOUT_PHONE_DRAIN_UNKNOWN')
            self.tick()
            result = b''
            if args[:2] == ['shell', 'getprop']: result = b'SYNTHETIC'
            elif args[:3] == ['shell', 'pm', 'path']: result = ('package:/data/app/x/' + c.v4.PKG + '-x/base.apk').encode()
            elif args[:2] == ['shell', 'sha256sum']: result = (self.packet['apk'] + ' ' + args[2]).encode()
            elif args[:2] == ['shell', 'pidof']: result = self.pid.encode()
            elif args[0] == 'shell' and 'mCurrentFocus' in args[1]:
                result = ('mCurrentFocus=Window{a u0 ' + ('other.app' if self.lost_focus else c.v4.PKG) + '/Main}').encode()
            elif args[:2] == ['exec-out', 'cat']: result = self.xml()
            elif args[:3] == ['shell', 'input', 'tap']:
                # Selector coordinates collide on a 2x2 synthetic display; use
                # adapter's active fixed action after exercising real selector.
                self.input('close' if a.action == 'setup-close' else a.action)
            elif args[:2] == ['exec-out', 'screencap']:
                if self.fail_screenshot: raise ValueError('PNG_UNAVAILABLE')
                result = png()
            assert len(result) <= cap
            sink(result)
            return 0, b'', {}
        a.transport = types.SimpleNamespace(ADB='SYNTHETIC_ONLY', _pump=pump,
            preflight_values=lambda *args: dict(hardwareVerified=True, apk=self.packet['apk'], sandbox={}))
        return a


class SessionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.addCleanup(self.temp.cleanup)
        self.out = Path(self.temp.name); self.clock = Clock(); self.p = packet()
        self.device = Device(self.clock, self.p); self.adapter = self.device.adapter()
        self.patch = patch.object(c.time, 'monotonic', self.clock.now); self.patch.start(); self.addCleanup(self.patch.stop)
        self.session = c.Session(self.adapter, self.p, self.out, self.clock.now, self.clock.advance)
    def result(self): return c.load(self.out / 'session-result.json')
    def prepare(self): return self.session.prepare(self.clock.now())
    def run_all(self):
        pre = self.prepare(); self.clock.advance(2)
        return self.session.run(pre['sha256'])
    def test_v4_refuses_273640_setup_delay_v5_restores_same_ready(self):
        self.clock.advance(273.640); self.device.tick(); ready = self.clock.now()
        self.adapter.preflight(deadline=ready + 120)
        self.adapter.operation_deadline=ready+120
        with tempfile.TemporaryDirectory() as old:
            tail = c.v4.CaptureTail(self.adapter, self.p, old, self.clock.now, self.clock.advance)
            # V4's adapter signature is intentionally retained for differential.
            with patch.object(self.adapter, 'preflight', lambda: None):
                with self.assertRaisesRegex(ValueError, 'CURRENT_MOUNTED_SETUP'): tail.prepare(ready)
        self.adapter.operation_deadline=None
        self.assertEqual(self.session.prepare(ready)['sha256'], c.digest(png()))
        self.assertEqual(self.session.run(c.digest(png())), 'PUBLISHED')
        self.assertEqual(self.device.inputs, ['restore', 'inspect', 'ack', 'capture', 'close'])
        self.assertLess(self.clock.now() - ready, 120)
    def test_mounted_ready_normalizes_once_delayed_callbacks_and_settle(self):
        self.assertEqual(self.run_all(), 'PUBLISHED')
        self.assertEqual(self.device.inputs, ['close', 'restore', 'inspect', 'ack', 'capture', 'close'])
        epoch = c.load(self.out / 'preview-epoch.json')
        self.assertEqual([epoch[k] for k in ('oldGeneration', 'closedGeneration', 'restoredGeneration')], [14,15,16])
        capture = c.load(self.out / 'capture-dispatch.json')['monotonic']
        self.assertGreaterEqual(capture - epoch['geometryObserved'], 15)
        self.assertEqual(self.result()['hostCaptureDispatches'], 1)
        self.assertEqual(self.result()['screenshotAttempts'], 2)
        self.assertFalse(self.result()['cameraProofAccepted'])
    def test_restore_timeout_finalizes_without_retry(self):
        self.device.delay['restore'] = self.device.delay['geometry'] = 200
        with self.assertRaisesRegex(ValueError, 'RESTORE_COMPLETION_NOT_OBSERVED'): self.prepare()
        self.assertEqual(self.device.inputs, ['close', 'restore'])
        self.assertEqual(self.result()['phase'], 'RESTORE')
        self.assertEqual(self.result()['hostCaptureDispatches'], 0)
        self.assertIsNotNone(self.result()['lastObservation'])
    def test_initial_guards_snapshot_precedes_failure_no_inputs(self):
        changes = [('busy', True), ('phase', 'UNKNOWN'), ('idle', False), ('source', None),
            ('process', None), ('generatedExportVerified', False), ('published', True), ('previewMounted', None),
            ('inspectionError', {'code':'FAILED'}), ('captureError', {'code':'FAILED'})]
        for key, value in changes:
            with self.subTest(key=key), tempfile.TemporaryDirectory() as out:
                clock = Clock(); d = Device(clock, packet()); d.state['marker'][key] = value
                s = c.Session(d.adapter(), packet(), out, clock.now, clock.advance)
                with patch.object(c.time, 'monotonic', clock.now), self.assertRaises(Exception): s.prepare(clock.now())
                r = c.load(Path(out) / 'session-result.json')
                self.assertEqual(r['lastObservation']['marker'][key], value)
                self.assertTrue(r['lastObservationPrecededGuard']); self.assertEqual(d.inputs, [])
    def test_first_export_gate_for_later_rows(self):
        self.p['case'] = 'M01-A090'; self.device.state['marker']['caseId'] = self.p['case']
        with self.assertRaisesRegex(ValueError, 'CURRENT_EXPORT_GATES_REQUIRED'): self.prepare()
        self.assertEqual(self.device.inputs, [])
    def test_restore_epoch_process_lifecycle_layout_viewport_change_stops(self):
        for key, value in [('process',str(uuid.uuid4())), ('lifecycle',8), ('viewGeneration',100), ('layout','B')]:
            with self.subTest(key=key), tempfile.TemporaryDirectory() as out:
                clock=Clock(); d=Device(clock,packet()); a=d.adapter(); s=c.Session(a,packet(),out,clock.now,clock.advance)
                orig=d.input
                def changed(action):
                    orig(action)
                    if action=='restore':d.schedule(d.delay['geometry'],lambda:d.state['marker'].update({key:value}))
                d.input=changed
                with patch.object(c.time,'monotonic',clock.now),self.assertRaises(ValueError):s.prepare(clock.now())
                self.assertNotIn('inspect',d.inputs);self.assertNotIn('capture',d.inputs)
                self.assertEqual(c.load(Path(out)/'session-result.json')['lastObservation']['marker'][key],value)
    def test_viewport_change_during_restore(self):
        orig=self.device.input
        def changed(action):
            orig(action)
            if action=='restore':self.device.schedule(1,lambda:self.device.state['viewport'].update(right=1))
        self.device.input=changed
        with self.assertRaisesRegex(ValueError,'VIEWPORT_CHANGED'):self.prepare()
        self.assertEqual(self.result()['lastObservation']['viewport']['right'],1)
    def test_disabled_restore_permission_loss_never_dispatches(self):
        self.device.disabled.add('restore')
        with self.assertRaisesRegex(ValueError,'ONE_ENABLED_OWN_CONTROL'):self.prepare()
        self.assertEqual(self.device.inputs,['close'])
        self.assertIn('restore-intent.json',self.result()['commandIntents'])
    def test_delayed_inspect_ack_do_not_duplicate_input(self):
        self.device.delay.update(inspect=5,ack=4,geometry=4)
        self.assertEqual(self.run_all(),'PUBLISHED')
        self.assertEqual(self.device.inputs.count('inspect'),1);self.assertEqual(self.device.inputs.count('ack'),1)
    def test_pending_inspect_and_ack_exhaust_finite_observations(self):
        for stage in ['inspect','ack']:
            with self.subTest(stage=stage),tempfile.TemporaryDirectory() as out:
                clock=Clock();d=Device(clock,packet());d.delay[stage]=300
                s=c.Session(d.adapter(),packet(),out,clock.now,clock.advance)
                with patch.object(c.time,'monotonic',clock.now),self.assertRaisesRegex(ValueError,'COMPLETION_NOT_OBSERVED'):s.prepare(clock.now())
                self.assertEqual(d.inputs.count(stage),1);self.assertNotIn('capture',d.inputs)
    def test_pre_human_native_independent_deadlines_at_dispatch(self):
        for kind in ['human','native','pre']:
            with self.subTest(kind=kind),tempfile.TemporaryDirectory() as out:
                clock=Clock();d=Device(clock,packet());s=c.Session(d.adapter(),packet(),out,clock.now,clock.advance)
                with patch.object(c.time,'monotonic',clock.now):
                    pre=s.prepare(clock.now())
                    if kind=='human':s.ready=clock.now()-120
                    elif kind=='native':s.readiness['issuedStart']=clock.now()-120
                    else:s.pre['monotonic']=clock.now()-30
                    with self.assertRaises(ValueError):s.run(pre['sha256'])
                self.assertNotIn('capture',d.inputs);self.assertEqual(c.load(Path(out)/'session-result.json')['hostCaptureDispatches'],0)
    def test_qualification_hash_must_be_exact_no_automatic_capture(self):
        self.prepare()
        with self.assertRaisesRegex(ValueError,'PRE_SCENE_NOT_QUALIFIED'):self.session.run('0'*64)
        self.assertNotIn('capture',self.device.inputs)
    def test_late_ready_and_preflight_whole_deadline(self):
        self.device.cost=13
        with self.assertRaises(ValueError):self.prepare()
        self.assertLessEqual(self.clock.now(),220)
        self.assertEqual(self.device.inputs,[])
        self.assertEqual(self.result()['status'],'SETUP_TIMEOUT')
    def test_all_subprocesses_have_remaining_deadline(self):
        self.run_all()
        self.assertTrue(all(0<timeout<=20 for _,timeout,_ in self.device.calls))
        self.assertTrue(all(t+timeout<=220 for _,timeout,t in self.device.calls if t<120))
    def test_slow_screenshot_consumed_no_retry(self):
        self.device.costs['exec-out screencap -p']=150
        with self.assertRaises(ValueError):self.prepare()
        self.assertEqual(self.result()['screenshotAttempts'],1)
        self.assertNotIn('capture',self.device.inputs)
    def test_post_unknown_no_close_retains_separate_errors(self):
        self.device.terminal='UNKNOWN'
        self.device.state['marker']['captureError']=None
        pre=self.prepare()
        self.device.schedule(1,lambda:self.device.state['marker'].update(captureError={'code':'CAPTURE_FAILED'},inspectionError={'code':'INSPECT_FAILED'}))
        self.assertEqual(self.session.run(pre['sha256']),'UNCONFIRMED')
        self.assertEqual(self.device.inputs.count('close'),1) # setup only
        self.assertEqual(self.result()['screenshotAttempts'],2)
        self.assertEqual(self.result()['lastObservation']['marker']['captureError']['code'],'CAPTURE_FAILED')
    def test_unknown_lost_focus_does_not_take_unrelated_post(self):
        pre=self.prepare();self.device.schedule(.3,lambda:setattr(self.device,'lost_focus',True))
        with self.assertRaisesRegex(ValueError,'OWN_FOREGROUND_REQUIRED'):self.session.run(pre['sha256'])
        self.assertEqual(self.result()['screenshotAttempts'],1)
        self.assertIsNotNone(self.result()['observationFailure'])
    def test_replay_and_journal_collision_never_replay_effects(self):
        self.assertEqual(self.run_all(),'PUBLISHED');before=list(self.device.inputs)
        with self.assertRaises(ValueError):self.session.run(c.digest(png()))
        other=c.Session(self.adapter,self.p,self.out,self.clock.now,self.clock.advance)
        with self.assertRaises(FileExistsError):other.prepare(self.clock.now())
        self.assertEqual(self.device.inputs,before)
    def test_actual_input_time_guard_rejects_lost_gate(self):
        pre=self.prepare()
        self.device.hook=lambda args:self.device.state['marker'].update(generatedExportVerified=False) if args[:2]==['exec-out','cat'] else None
        with self.assertRaisesRegex(ValueError,'EXPORT_GATES'):self.session.run(pre['sha256'])
        self.assertNotIn('capture',self.device.inputs)
    def test_crash_at_every_input_boundary_keeps_consumed_receipt(self):
        for action in ['setup-close','restore','inspect','ack','capture','close']:
            with self.subTest(action=action),tempfile.TemporaryDirectory() as out:
                clock=Clock();d=Device(clock,packet());a=d.adapter();s=c.Session(a,packet(),out,clock.now,clock.advance)
                original=s.input_intent
                def crash(active):
                    original(active)
                    if active==action:raise KeyboardInterrupt()
                a.on_input=crash
                with patch.object(c.time,'monotonic',clock.now),self.assertRaises(KeyboardInterrupt):
                    runner.execute(s,lambda pre,deadline:pre['sha256'])
                r=c.load(Path(out)/'session-result.json');self.assertIn(action+'-intent.json',r['commandIntents'])
                self.assertTrue(r['noReplay']);self.assertEqual(r['budgetRefund'],0)

    def test_preserved_baseline_recorded_scale_refuses_slow_qualification(self):
        # Measured evidence: preflight6.766s, setup Inspect3.875s,
        # R2 Capture5.032s, pre qualification24.547s. Use the slowest measured
        # fixed-input bracket for EVERY input, plus delayed native callbacks.
        # Each input performs4 observation commands + focus + input =6 pumps.
        baseline = types.ModuleType('preserved_v5_before_timing')
        baseline.__file__ = c.__file__
        original = runner.PREP / 'before/tools/scripts/camera-orientation-session-v5/controller_v5.py'
        exec(compile(original.read_bytes(), str(original), 'exec'), baseline.__dict__)
        self.adapter = self.device.adapter(baseline.PinnedAdb)
        self.session = baseline.Session(self.adapter, self.p, self.out, self.clock.now, self.clock.advance)
        self.device.cost=5.032/6
        self.device.delay.update(close=1,restore=2,geometry=4,inspect=3,ack=2,capture=7.06545)
        ready=self.clock.now();pre=self.prepare();self.clock.advance(24.547)
        with self.assertRaises(ValueError):self.session.run(pre['sha256'])
        result=self.result()
        self.assertEqual(result['hostCaptureDispatches'],0);self.assertEqual(result['screenshotAttempts'],1)
        self.assertNotIn('capture',self.device.inputs)
        print(json.dumps(dict(profile='recorded-scale-24.547s-qualification',status='TIMING_BLOCKED',
            elapsed=self.clock.now()-ready,preAge=self.clock.now()-pre['monotonic'],
            minimumAcquisitionQualificationAndInputSeconds=3*(5.032/6)+24.547+5.032,
            unchangedPreMaximumSeconds=30,hostCaptureDispatches=0)))

    def test_recorded_transport_scale_shorter_qualification_completes_with_all_guards(self):
        # Separate synthetic possibility check. This does NOT waive the measured
        # 24.547-second qualification blocker above or authorize a phone retry.
        self.device.cost=5.032/6
        self.device.delay.update(close=1,restore=2,geometry=4,inspect=3,ack=2,capture=7.06545)
        ready=self.clock.now();pre=self.prepare();self.clock.advance(15)
        self.assertEqual(self.session.run(pre['sha256']),'PUBLISHED')
        capture=c.load(self.out/'capture-dispatch.json')['monotonic']
        self.assertLess(capture-ready,120);self.assertLess(capture-pre['monotonic'],30)
        self.assertLess(capture-self.session.readiness['issuedStart'],120)
        print(json.dumps(dict(profile='synthetic-15s-qualification',readyToCapture=capture-ready,
            readyToComplete=self.clock.now()-ready,preAgeAtInput=capture-pre['monotonic'])))

    def test_timing_limit_stops_without_shortening_checks(self):
        self.device.cost=3.5
        with self.assertRaises(ValueError):self.prepare()
        self.assertLessEqual(self.clock.now(),220)
        self.assertNotIn('capture',self.device.inputs)

    def test_terminal20s_expiry_never_extends_for_diagnostic_image(self):
        pre=self.prepare();self.device.delay['capture']=100
        with self.assertRaises(ValueError):self.session.run(pre['sha256'])
        self.assertEqual(self.result()['status'],'DISPATCHED_UNKNOWN')
        self.assertEqual(self.result()['screenshotAttempts'],1)
        self.assertEqual(self.device.inputs.count('close'),1)

    def test_settled_close10s_deadline_shared_by_input_and_observations(self):
        pre=self.prepare();self.device.delay['close']=100
        with self.assertRaises(ValueError):self.session.run(pre['sha256'])
        phase=c.load(self.out/'phase-SETTLED-CLOSE.json')['monotonic']
        self.assertLessEqual(self.clock.now()-phase,10.000001)
        self.assertEqual(self.result()['screenshotAttempts'],2)
        self.assertEqual(self.result()['nativeTerminal'],'PUBLISHED')

    def test_human_old_ready_nan_and_future_ready_finalizes(self):
        for ready in [-21,float('nan'),101]:
            with self.subTest(ready=ready),tempfile.TemporaryDirectory() as out:
                clock=Clock();d=Device(clock,packet());s=c.Session(d.adapter(),packet(),out,clock.now,clock.advance)
                with patch.object(c.time,'monotonic',clock.now),self.assertRaises(ValueError):s.prepare(ready)
                self.assertTrue((Path(out)/'session-result.json').exists());self.assertEqual(d.inputs,[])

    def test_capture_dispatch_timeout_diagnostic_current_view_no_retry(self):
        pre=self.prepare();self.device.timeout_action='capture'
        with self.assertRaisesRegex(ValueError,'DRAIN_UNKNOWN'):self.session.run(pre['sha256'])
        result=self.result()
        self.assertEqual(result['hostCaptureDispatches'],1);self.assertEqual(result['screenshotAttempts'],2)
        self.assertEqual(self.device.inputs.count('capture'),1);self.assertEqual(self.device.inputs.count('close'),1)
        self.assertEqual(result['status'],'DISPATCHED_UNKNOWN')

    def test_screenshot_budget_and_post_crash_are_consumed(self):
        pre=self.prepare();self.device.fail_screenshot=True
        with self.assertRaisesRegex(ValueError,'PNG_UNAVAILABLE'):self.session.run(pre['sha256'])
        result=self.result();self.assertEqual(result['screenshotAttempts'],2)
        with self.assertRaisesRegex(ValueError,'ROW_SCREENSHOT_CAP'):
            self.session.screenshot('post',self.session.last,self.clock.now()+20)
        self.assertEqual(result['missingImages'],['post'])

    def test_unknown_or_oversized_metadata_never_saved_as_arbitrary_contents(self):
        for key,value in [('arbitraryText','private contents'),('source','x'*9000)]:
            with self.subTest(key=key),tempfile.TemporaryDirectory() as out:
                clock=Clock();d=Device(clock,packet());d.state['marker'][key]=value
                s=c.Session(d.adapter(),packet(),out,clock.now,clock.advance)
                with patch.object(c.time,'monotonic',clock.now),self.assertRaises(ValueError):s.prepare(clock.now())
                r=c.load(Path(out)/'session-result.json');self.assertIsNone(r['lastObservation'])
                self.assertIsNotNone(r['observationFailure']);self.assertEqual(d.inputs,[])


if __name__=='__main__':unittest.main(verbosity=2)
