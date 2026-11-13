"""Regression evidence only: synthetic clocks/PNG/transport, never a device."""
import copy
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

import controller_v4 as c


class Clock:
    def __init__(self): self.value = 100.0
    def now(self): return self.value
    def advance(self, seconds): self.value += seconds


def png():
    def chunk(kind, body):
        return struct.pack('>I', len(body)) + kind + body + struct.pack('>I', zlib.crc32(kind + body) & 0xffffffff)
    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', 2, 2, 8, 2, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(b'\x00' * 14)) + chunk(b'IEND', b''))


def packet():
    return dict(run=c.RUN, case='M00-A000', source='1' * 64, apk='2' * 64, displayPixels=[2, 2])


def snapshot():
    return dict(viewport=dict(left=0, top=0, right=2, bottom=2), marker=dict(
        version=1, run=c.RUN, phase='IDLE', caseId='M00-A000',
        jobId=str(uuid.uuid3(uuid.NAMESPACE_DNS, 'unused')), source='1' * 64, apk='2' * 64,
        process='a0000000-0000-4000-8000-000000000001', lifecycle=3, viewGeneration=7,
        layout='A', previewMounted=True, busy=False, idle=True,
        nonce='b0000000-0000-4000-8000-000000000001', published=None,
        geometryReady=True, generatedExportVerified=True, firstExportVerified=False))


class Phone:
    def __init__(self, clock, output):
        self.clock, self.output = clock, output
        self.state = snapshot()
        self.state['marker']['jobId'] = str(uuid.UUID(bytes=__import__('hashlib').md5((c.RUN + ':M00-A000').encode()).digest(), version=3))
        self.events, self.deadlines = [], []
        self.hook = lambda action: None
        self.terminal = 'PUBLISHED'
        self.image_delay = 0
        self.post_error = None
        self.lost_after_capture = None
    def preflight(self): self.events.append('preflight')
    def observe(self, deadline=None):
        self.deadlines.append(('observe', deadline))
        if 'capture' in self.events and self.lost_after_capture:
            raise ValueError(self.lost_after_capture)
        state = copy.deepcopy(self.state)
        state["captureControlEnabled"] = "ack" in self.events
        return state
    def tap(self, action, before_dispatch=None, deadline=None):
        self.deadlines.append((action, deadline))
        self.hook(action)
        observed = self.observe(deadline)
        if before_dispatch: before_dispatch(observed)
        self.events.append(action)
        if action == 'inspect':
            self.state['marker']['nonce'] = 'c0000000-0000-4000-8000-000000000001'
        if action == 'capture':
            self.state['marker'].update(phase=self.terminal, published=True if self.terminal == 'PUBLISHED' else False if self.terminal == 'REFUSED' else None)
        if action == 'close':
            assert (self.output / 'post.png').is_file() and (self.output / 'post-done.json').is_file(), 'CLOSE_BEFORE_DURABLE_POST'
            self.state['marker']['previewMounted'] = False
        return {'clientSettled': True}
    def screenshot(self):
        self.events.append('screenshot')
        if self.events.count('screenshot') > 1 and self.post_error: raise ValueError(self.post_error)
        self.clock.advance(self.image_delay)
        return png()


class TailTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.addCleanup(self.temp.cleanup)
        self.out = Path(self.temp.name); self.clock = Clock(); self.phone = Phone(self.clock, self.out)
        self.tail = c.CaptureTail(self.phone, packet(), self.out, self.clock.now, self.clock.advance)
        self.ready = self.clock.now()
    def prepare(self): return self.tail.prepare(self.ready)['sha256']
    def run_ready(self):
        sha = self.prepare(); self.clock.advance(15); return sha
    def outcome(self): return c.load(self.out / 'outcome.json')
    def test_fresh_inspect_after_ready_ack_pre_and_post_before_close(self):
        sha = self.run_ready()
        self.assertEqual(self.tail.run(self.ready, sha), 'PUBLISHED')
        self.assertEqual(self.phone.events, ['preflight', 'inspect', 'ack', 'screenshot', 'capture', 'screenshot', 'close'])
        self.assertTrue(self.outcome()['previewUnmountedObserved'])
        self.assertFalse(self.outcome()['cameraProofAccepted'])
        self.assertEqual(c.load(self.out / 'native-readiness.json')['binding']['nonce'], 'c0000000-0000-4000-8000-000000000001')
    def test_original_132078_native_age_fresh_human_and_pre_refuses(self):
        sha = self.run_ready(); self.tail.readiness['issuedStart'] = self.clock.now() - 132.078
        with self.assertRaisesRegex(ValueError, 'NATIVE_READINESS_STALE'): self.tail.run(self.ready, sha)
        self.assertNotIn('capture', self.phone.events)
    def test_native_boundary_is_strict_120_independent_of_human(self):
        sha = self.run_ready(); self.tail.readiness['issuedStart'] = self.clock.now() - 120
        with self.assertRaisesRegex(ValueError, 'NATIVE_READINESS_STALE'): self.tail.run(self.ready, sha)
    def test_human_boundary_is_strict_120_with_fresh_native_and_pre(self):
        sha = self.prepare(); self.clock.advance(120); self.tail.pre['monotonic'] = self.clock.now()
        self.tail.readiness['issuedStart'] = self.clock.now()
        with self.assertRaisesRegex(ValueError, 'NO_LATE_SHUTTER'): self.tail.run(self.ready, sha)
        self.assertNotIn('capture', self.phone.events)
    def test_pre_boundary_accepts_30_and_refuses_over_30(self):
        sha = self.prepare(); self.clock.advance(30)
        self.assertEqual(self.tail.run(self.ready, sha), 'PUBLISHED')
    def test_pre_over_30_refuses_even_with_other_clocks_fresh(self):
        sha = self.prepare(); self.clock.advance(30.001)
        with self.assertRaisesRegex(ValueError, 'PRE_SCENE_STALE'): self.tail.run(self.ready, sha)
        self.assertNotIn('capture', self.phone.events)
    def test_lookup_delay_crossing_pre_clock_is_consumed_before_input(self):
        sha = self.run_ready(); self.clock.advance(14)
        self.phone.hook = lambda action: self.clock.advance(1.001) if action == 'capture' else None
        with self.assertRaisesRegex(ValueError, 'PRE_SCENE_STALE'): self.tail.run(self.ready, sha)
        self.assertTrue((self.out / 'capture-intent.json').exists()); self.assertNotIn('capture', self.phone.events)
        self.assertEqual(self.outcome()['status'], 'HOST_REFUSED_BEFORE_INPUT')
    def test_lookup_delay_crossing_human_clock_refuses_at_input(self):
        self.phone.hook = lambda action: self.clock.advance(91) if action == 'ack' else None
        sha = self.prepare(); self.clock.advance(26)
        self.phone.hook = lambda action: self.clock.advance(3) if action == 'capture' else None
        with self.assertRaisesRegex(ValueError, 'NO_LATE_SHUTTER'): self.tail.run(self.ready, sha)
        self.assertNotIn('capture', self.phone.events)
    def test_native_expiry_crossed_during_lookup_refuses(self):
        sha = self.run_ready(); self.tail.readiness['issuedStart'] = self.clock.now() - 119
        self.phone.hook = lambda action: self.clock.advance(1) if action == 'capture' else None
        with self.assertRaisesRegex(ValueError, 'NATIVE_READINESS_STALE'): self.tail.run(self.ready, sha)
        self.assertNotIn('capture', self.phone.events)
    def test_second_ready_cannot_adopt_old_readiness(self):
        sha = self.run_ready()
        with self.assertRaisesRegex(ValueError, 'OTHER_READY'): self.tail.run(self.ready + 1, sha)
        self.assertNotIn('capture', self.phone.events)
    def test_other_clock_instance_cannot_adopt_readiness(self):
        sha = self.run_ready(); self.tail.clock_instance = str(uuid.uuid4())
        with self.assertRaisesRegex(ValueError, 'OTHER_READY'): self.tail.run(self.ready, sha)
    def test_minimum_positioning_interval(self):
        sha = self.prepare(); self.clock.advance(14.999)
        with self.assertRaisesRegex(ValueError, 'POSITIONING_INTERVAL_REQUIRED'): self.tail.run(self.ready, sha)
        self.assertNotIn('capture', self.phone.events)
    def test_slow_screenshot_clock_starts_before_acquisition(self):
        self.phone.image_delay = 31; sha = self.prepare()
        self.assertEqual(self.tail.pre['savedMonotonic'] - self.tail.pre['monotonic'], 31)
        with self.assertRaisesRegex(ValueError, 'PRE_SCENE_STALE'): self.tail.run(self.ready, sha)
    def test_inspect_must_refresh_nonce(self):
        self.phone.state['marker']['nonce'] = 'c0000000-0000-4000-8000-000000000001'
        with self.assertRaisesRegex(ValueError, 'INSPECT_COMPLETION_NOT_OBSERVED'): self.prepare()
        self.assertNotIn('ack', self.phone.events); self.assertNotIn('screenshot', self.phone.events)
    def test_prepare_refuses_unmounted_or_unready_before_inspect(self):
        self.phone.state['marker']['previewMounted'] = False
        with self.assertRaisesRegex(ValueError, 'CURRENT_MOUNTED_SETUP'): self.prepare()
        self.assertNotIn('inspect', self.phone.events)
    def test_unknown_saves_exactly_one_diagnostic_post_never_closes(self):
        sha = self.run_ready(); self.phone.terminal = 'UNKNOWN'
        self.assertEqual(self.tail.run(self.ready, sha), 'UNCONFIRMED')
        self.assertEqual(self.phone.events.count('screenshot'), 2); self.assertNotIn('close', self.phone.events)
        self.assertTrue(self.outcome()['postSaved']); self.assertEqual(self.outcome()['reason'], 'NATIVE_OUTCOME_UNKNOWN')
    def test_unknown_post_failure_is_consumed_no_retry_no_close(self):
        sha = self.run_ready(); self.phone.terminal = 'UNKNOWN'; self.phone.post_error = 'PNG_UNAVAILABLE'
        self.assertEqual(self.tail.run(self.ready, sha), 'UNCONFIRMED')
        self.assertFalse(self.outcome()['postSaved']); self.assertTrue((self.out / 'post-intent.json').exists())
        self.assertFalse((self.out / 'post-done.json').exists()); self.assertNotIn('close', self.phone.events)
    def test_published_post_failure_cannot_close_or_claim_pass(self):
        sha = self.run_ready(); self.phone.post_error = 'PNG_UNAVAILABLE'
        with self.assertRaisesRegex(ValueError, 'PNG_UNAVAILABLE'): self.tail.run(self.ready, sha)
        self.assertEqual(self.outcome()['status'], 'UNCONFIRMED'); self.assertNotIn('close', self.phone.events)
    def test_lost_focus_or_process_never_screenshots_unrelated_surface(self):
        for error in ['OWN_FOREGROUND_REQUIRED', 'OWN_PROCESS_CHANGED_OR_EXITED']:
            with self.subTest(error=error), tempfile.TemporaryDirectory() as d:
                clock = Clock(); p = Phone(clock, Path(d)); t = c.CaptureTail(p, packet(), d, clock.now, clock.advance)
                sha = t.prepare(100)['sha256']; clock.advance(15); p.lost_after_capture = error
                with self.assertRaisesRegex(ValueError, error): t.run(100, sha)
                self.assertEqual(p.events.count('screenshot'), 1); self.assertNotIn('close', p.events)
                self.assertFalse(c.load(Path(d) / 'outcome.json')['postSaved'])
    def test_changed_view_after_capture_cannot_become_post(self):
        sha = self.run_ready(); original = self.phone.tap
        def tap(action, **kwargs):
            result = original(action, **kwargs)
            if action == 'capture': self.phone.state['viewport']['right'] = 1
            return result
        self.phone.tap = tap
        with self.assertRaisesRegex(ValueError, 'CAPTURE_VIEW_CHANGED'): self.tail.run(self.ready, sha)
        self.assertEqual(self.phone.events.count('screenshot'), 1); self.assertNotIn('close', self.phone.events)
    def test_single_use_successful_prepare_and_capture_intents(self):
        sha = self.run_ready()
        with self.assertRaises(FileExistsError): self.prepare()
        self.assertEqual(self.phone.events.count('inspect'), 1)
        self.assertEqual(self.tail.run(self.ready, sha), 'PUBLISHED')
        with self.assertRaises(FileExistsError): self.tail.run(self.ready, sha)
        self.assertEqual(self.phone.events.count('capture'), 1)
    def test_provenance_and_geometry_changes_at_actual_input_refuse(self):
        for field, value in [('nonce', str(uuid.uuid4())), ('source', '3' * 64), ('apk', '4' * 64),
                             ('process', str(uuid.uuid4())), ('lifecycle', 4), ('viewGeneration', 8),
                             ('geometryReady', False), ('generatedExportVerified', False),
                             ('previewMounted', False), ('phase', 'UNKNOWN'),
                             ('idle', False), ('busy', True), ('caseId', 'M01-A090')]:
            with self.subTest(field=field), tempfile.TemporaryDirectory() as d:
                clock = Clock(); p = Phone(clock, Path(d)); t = c.CaptureTail(p, packet(), d, clock.now, clock.advance)
                sha = t.prepare(100)['sha256']; clock.advance(15)
                p.hook = lambda action, k=field, v=value: p.state['marker'].update({k: v}) if action == 'capture' else None
                with self.assertRaises(ValueError): t.run(100, sha)
                self.assertNotIn('capture', p.events)

    def test_later_rows_require_current_first_export_at_ack_and_capture(self):
        for action in ['ack', 'capture']:
            with self.subTest(action=action), tempfile.TemporaryDirectory() as d:
                clock = Clock(); p = Phone(clock, Path(d)); q = packet(); q['case'] = 'M01-A090'
                p.state['marker'].update(caseId=q['case'], firstExportVerified=True,
                    jobId=str(uuid.UUID(bytes=__import__('hashlib').md5((c.RUN + ':' + q['case']).encode()).digest(), version=3)))
                t = c.CaptureTail(p, q, d, clock.now, clock.advance)
                def invalidate(at):
                    if at == action: p.state['marker']['firstExportVerified'] = False
                p.hook = invalidate
                if action == 'ack':
                    with self.assertRaisesRegex(ValueError, 'CURRENT_GEOMETRY_AND_EXPORT_GATES'): t.prepare(100)
                    self.assertNotIn('ack', p.events); self.assertNotIn('screenshot', p.events)
                else:
                    sha = t.prepare(100)['sha256']; clock.advance(15)
                    with self.assertRaisesRegex(ValueError, 'CURRENT_GEOMETRY_AND_EXPORT_GATES'): t.run(100, sha)
                    self.assertEqual(c.load(Path(d) / 'outcome.json')['status'], 'HOST_REFUSED_BEFORE_INPUT')
                    self.assertEqual(p.events.count('screenshot'), 1)
                self.assertNotIn('capture', p.events); self.assertNotIn('close', p.events)

    def test_uncertain_inspect_is_consumed_and_cannot_replay(self):
        self.phone.hook = lambda action: (_ for _ in ()).throw(ValueError('OBSERVATION_DEADLINE')) if action == 'inspect' else None
        with self.assertRaisesRegex(ValueError, 'OBSERVATION_DEADLINE'): self.prepare()
        with self.assertRaises(FileExistsError): self.prepare()
        self.assertTrue((self.out / 'inspect-intent.json').exists())
        self.assertFalse((self.out / 'inspect-done.json').exists())
        self.assertNotIn('ack', self.phone.events); self.assertNotIn('screenshot', self.phone.events)

    def test_slow_setup_pause_restore_second_ready_rehearsal(self):
        # Setup may be arbitrarily long; only an explicit mounted restore and
        # final READY may enter this session. Restore has cleared its old token.
        self.clock.advance(300); self.phone.state['marker']['previewMounted'] = False
        self.ready = self.clock.now()
        with self.assertRaisesRegex(ValueError, 'CURRENT_MOUNTED_SETUP'): self.prepare()
        self.assertNotIn('inspect', self.phone.events)
        self.phone.state['marker'].update(previewMounted=True, nonce=None, viewGeneration=8)
        self.clock.advance(10); self.ready = self.clock.now(); self.clock.advance(15)
        sha = self.prepare()
        self.assertEqual(self.tail.readiness['ready'], self.ready)
        self.assertGreaterEqual(self.tail.readiness['issuedStart'], self.ready + 15)
        self.assertEqual(self.tail.run(self.ready, sha), 'PUBLISHED')
        self.assertEqual(self.phone.events.count('capture'), 1)

    def test_unknown_diagnostic_post_retains_original_structured_error(self):
        sha = self.run_ready(); self.phone.terminal = 'UNKNOWN'
        original = self.phone.tap
        error = dict(code='CAMERA_MATRIX_READINESS_STALE', stage='NATIVE_CAPTURE', caseId='M00-A000')
        def tap(action, **kwargs):
            result = original(action, **kwargs)
            if action == 'capture': self.phone.state['marker']['captureError'] = error
            return result
        self.phone.tap = tap
        self.assertEqual(self.tail.run(self.ready, sha), 'UNCONFIRMED')
        self.assertEqual(c.load(self.out / 'post.json')['marker']['captureError'], error)
        self.assertNotIn('close', self.phone.events)

    def test_unknown_dispatch_timeout_is_consumed_then_one_diagnostic_post(self):
        sha = self.run_ready()
        self.phone.hook = lambda action: (_ for _ in ()).throw(ValueError('HOST_ADB_CLIENT_TIMEOUT_PHONE_DRAIN_UNKNOWN')) if action == 'capture' else None
        with self.assertRaisesRegex(ValueError, 'DRAIN_UNKNOWN'): self.tail.run(self.ready, sha)
        self.assertTrue((self.out / 'capture-intent.json').exists())
        self.assertFalse((self.out / 'capture-done.json').exists())
        self.assertEqual(self.phone.events.count('screenshot'), 2)
        self.assertEqual(self.outcome()['status'], 'UNCONFIRMED'); self.assertNotIn('close', self.phone.events)

    def test_close_failure_preserves_post_and_consumed_close_without_second_capture(self):
        sha = self.run_ready()
        self.phone.hook = lambda action: (_ for _ in ()).throw(ValueError('CLOSE_UNKNOWN')) if action == 'close' else None
        with self.assertRaisesRegex(ValueError, 'CLOSE_UNKNOWN'): self.tail.run(self.ready, sha)
        self.assertTrue((self.out / 'post-done.json').exists())
        self.assertTrue((self.out / 'close-intent.json').exists()); self.assertFalse((self.out / 'close-done.json').exists())
        with self.assertRaises(Exception): self.tail.run(self.ready, sha)
        self.assertEqual(self.phone.events.count('capture'), 1); self.assertEqual(self.phone.events.count('screenshot'), 2)


class AdapterTests(unittest.TestCase):
    def adapter(self, action='inspect'):
        a = object.__new__(c.PinnedAdb); a.packet = dict(displayPixels=[1080, 2340]); a.pid = '123'
        tree = ET.Element('hierarchy')
        ET.SubElement(tree, 'node', {'package': c.PKG, 'text': c.LABELS[action], 'clickable': 'true', 'enabled': 'true', 'bounds': '[10,20][110,120]'})
        a.tree = tree; return a
    def test_actual_inspect_selector_and_all_lookup_input_deadlines(self):
        a = self.adapter(); events = []
        a.observe = lambda deadline=None: events.append(('observe', deadline)) or snapshot()
        a._own_focus = lambda deadline=None: events.append(('focus', deadline))
        a._run = lambda args, cap, deadline=None: events.append((args, deadline)) or b''
        a.tap('inspect', before_dispatch=lambda _: events.append(('guard', None)), deadline=123.5)
        self.assertEqual(events, [('observe', 123.5), ('focus', 123.5), ('guard', None), (['shell', 'input', 'tap', '60', '70'], 123.5)])
    def test_actual_run_deadline_caps_transport_and_expired_input_never_pumps(self):
        a = self.adapter('capture'); calls = []; a.endpoint = 'fake:1'; a.live = lambda: None
        a.charter = dict(lease=dict(expires_at=(c.datetime.datetime.now(c.datetime.timezone.utc) + c.datetime.timedelta(hours=1)).isoformat()))
        def pump(args, timeout, cap, sink, diagnostic): calls.append((args, timeout)); return 0, b'', {}
        a.transport = types.SimpleNamespace(ADB='FAKE_ONLY', _pump=pump)
        with patch.object(c.time, 'monotonic', return_value=100):
            a._run(['shell', 'input', 'tap', '60', '70'], deadline=100.25)
            self.assertEqual(calls[0][1], .25)
            with self.assertRaisesRegex(ValueError, 'OBSERVATION_DEADLINE'):
                a._run(['shell', 'input', 'tap', '60', '70'], deadline=100)
        self.assertEqual(len(calls), 1)


if __name__ == '__main__': unittest.main(verbosity=2)
