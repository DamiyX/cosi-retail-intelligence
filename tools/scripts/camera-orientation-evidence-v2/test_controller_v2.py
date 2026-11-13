"""Host-only V2 timing/safety tests; transports/clocks/images are synthetic."""
import importlib.util
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest import mock

import controller_v2 as v2

# Reuse existing fake definitions without discovering/running their older suites.
sys.modules.setdefault('controller', v2.base)
spec = importlib.util.spec_from_file_location('existing_orientation_fake_definitions', v2.BASE_PATH.with_name('test_controller.py'))
fixtures = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fixtures)
DIFFERENTIAL = {}


class LatencyPhone(fixtures.FakePhone):
    """Recorded qualification and UI/ACK delays; fake time only."""
    def __init__(self, clock):
        super().__init__(clock)
        self.in_tap = False

    def observe(self, deadline=None):
        self.clock.advance(3.766 if self.in_tap else 3.343)
        return super().observe(deadline)

    def tap(self, action, before_dispatch=None):
        self.in_tap = True
        try:
            return super().tap(action, before_dispatch)
        finally:
            self.in_tap = False


class V2TailTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.output = Path(self.temp.name)
        self.clock = fixtures.Clock()
        self.phone = fixtures.FakePhone(self.clock)
        self.phone.output = self.output
        self.tail = v2.CaptureTail(self.phone, fixtures.packet(), self.output, self.clock.now, self.clock.advance)
        self.ready = self.clock.now()

    def prepare(self):
        return self.tail.prepare(self.ready)['sha256']

    def test_observed_latency_old_refuses_new_succeeds_with_same_30s_and_120s(self):
        traces = {}
        for name, cls in [('old', v2.base.CaptureTail), ('new', v2.CaptureTail)]:
            with self.subTest(protocol=name), tempfile.TemporaryDirectory() as temp:
                clock = fixtures.Clock()
                phone = LatencyPhone(clock)
                phone.output = Path(temp)
                tail = cls(phone, fixtures.packet(), temp, clock.now, clock.advance)
                ready = clock.now()
                sha = tail.prepare(ready)['sha256']
                pre_time = tail.pre['monotonic']
                clock.advance(24.547)
                try:
                    result = tail.run(ready, sha)
                except ValueError as error:
                    result = str(error)
                traces[name] = dict(result=result, events=[x for x in phone.events if x in {'ack', 'capture', 'screenshot', 'close'}],
                                    shutterCount=phone.events.count('capture'), readyElapsed=clock.now() - ready,
                                    qualificationPreAge=24.547, preTime=pre_time)
                if name == 'old':
                    self.assertEqual(result, 'PRE_SCENE_STALE')
                    self.assertEqual(phone.events.count('capture'), 0)
                    self.assertAlmostEqual(v2.load(Path(temp) / 'ack-done.json')['monotonic'] - pre_time, 31.656)
                else:
                    self.assertEqual(result, 'PUBLISHED')
                    self.assertEqual(traces[name]['events'], ['ack', 'screenshot', 'capture', 'screenshot', 'close'])
                    # Intent precedes lookup; capture-done records completion of guarded actual tap.
                    shutter_age = v2.load(Path(temp) / 'capture-done.json')['monotonic'] - pre_time
                    self.assertAlmostEqual(shutter_age, 28.313)
                    self.assertLessEqual(shutter_age, 30)
                    self.assertLess(v2.load(Path(temp) / 'capture-done.json')['monotonic'] - ready, 120)
                    self.assertTrue(v2.load(Path(temp) / 'outcome.json')['previewUnmountedObserved'])
                    traces[name]['shutterPreAge'] = shutter_age
                    traces[name]['shutterReadyAge'] = v2.load(Path(temp) / 'capture-done.json')['monotonic'] - ready
        DIFFERENTIAL.update(traces)

    def test_prepare_really_finishes_ack_before_pre_and_does_not_fake_done(self):
        self.prepare()
        effects = [x for x in self.phone.events if x in {'ack', 'capture', 'screenshot', 'close'}]
        self.assertEqual(effects, ['ack', 'screenshot'])
        self.assertTrue((self.output / 'ack-intent.json').exists())
        self.assertTrue((self.output / 'ack-done.json').exists())
        self.assertFalse((self.output / 'capture-intent.json').exists())

    def test_timely_qualification_can_still_expire_during_final_control_lookup(self):
        sha = self.prepare()
        self.clock.advance(29)
        self.phone.hook = lambda action, phone: self.clock.advance(1.001) if action == 'capture' else None
        with self.assertRaisesRegex(ValueError, 'PRE_SCENE_STALE'):
            self.tail.run(self.ready, sha)
        self.assertEqual(self.phone.events.count('ack'), 1)
        self.assertNotIn('capture', self.phone.events)
        self.assertTrue((self.output / 'capture-intent.json').exists())

    def test_ready_expiry_is_rechecked_at_actual_shutter_even_with_fresh_pre(self):
        self.phone.hook = lambda action, phone: self.clock.advance(91) if action == 'ack' else None
        sha = self.prepare()
        self.clock.advance(26)
        self.phone.hook = lambda action, phone: self.clock.advance(4) if action == 'capture' else None
        with self.assertRaisesRegex(ValueError, 'NO_LATE_SHUTTER'):
            self.tail.run(self.ready, sha)
        self.assertNotIn('capture', self.phone.events)

    def test_wrong_hash_never_dispatches_shutter_or_repeats_setup_ack(self):
        self.prepare()
        with self.assertRaisesRegex(ValueError, 'PRE_SCENE_NOT_QUALIFIED'):
            self.tail.run(self.ready, '0' * 64)
        self.assertEqual(self.phone.events.count('ack'), 1)
        self.assertFalse((self.output / 'capture-intent.json').exists())

    def test_changed_state_at_actual_dispatch_refuses_every_provenance_boundary(self):
        mutations = [('nonce', 'd0000000-0000-4000-8000-000000000001'),
                     ('process', 'e0000000-0000-4000-8000-000000000001'), ('lifecycle', 3),
                     ('viewGeneration', 5), ('previewMounted', False), ('layout', 'B'),
                     ('idle', False), ('busy', True), ('phase', 'CAPTURING'),
                     ('source', '3' * 64), ('apk', '4' * 64), ('jobId', 'wrong-job'), ('caseId', 'M01-A090')]
        for field, value in mutations:
            with self.subTest(field=field), tempfile.TemporaryDirectory() as temp:
                clock = fixtures.Clock()
                phone = fixtures.FakePhone(clock)
                tail = v2.CaptureTail(phone, fixtures.packet(), temp, clock.now, clock.advance)
                sha = tail.prepare(100)['sha256']
                phone.hook = lambda action, p, k=field, v=value: p.state['marker'].update({k: v}) if action == 'capture' else None
                with self.assertRaises(ValueError):
                    tail.run(100, sha)
                self.assertNotIn('capture', phone.events)

    def test_changed_physical_viewport_at_dispatch_refuses(self):
        sha = self.prepare()
        self.phone.hook = lambda action, p: p.state['viewport'].update(right=1) if action == 'capture' else None
        with self.assertRaisesRegex(ValueError, 'CAPTURE_VIEW_CHANGED'):
            self.tail.run(self.ready, sha)
        self.assertNotIn('capture', self.phone.events)

    def test_nonce_change_after_completed_ack_stops_before_pre(self):
        original = self.phone.tap
        def change(action, before_dispatch=None):
            result = original(action, before_dispatch)
            self.phone.state['marker']['nonce'] = 'd0000000-0000-4000-8000-000000000001'
            return result
        self.phone.tap = change
        with self.assertRaisesRegex(ValueError, 'PRE_DISPATCH_NONCE_OR_STATE_CHANGED'):
            self.prepare()
        self.assertTrue((self.output / 'ack-done.json').exists())
        self.assertFalse((self.output / 'pre-intent.json').exists())

    def test_unknown_ack_is_consumed_before_pre_and_duplicate_prepare_cannot_retry(self):
        original = self.phone.tap
        def unknown(action, before_dispatch=None):
            original(action, before_dispatch)
            raise ValueError('HOST_ADB_CLIENT_TIMEOUT_PHONE_DRAIN_UNKNOWN')
        self.phone.tap = unknown
        with self.assertRaisesRegex(ValueError, 'DRAIN_UNKNOWN'):
            self.prepare()
        with self.assertRaises(FileExistsError):
            self.prepare()
        self.assertEqual(self.phone.events.count('ack'), 1)
        self.assertFalse((self.output / 'ack-done.json').exists())
        self.assertFalse((self.output / 'pre-intent.json').exists())

    def test_successful_prepare_is_also_one_use(self):
        self.prepare()
        with self.assertRaises(FileExistsError):
            self.prepare()
        self.assertEqual(self.phone.events.count('ack'), 1)
        self.assertEqual(self.phone.events.count('screenshot'), 1)

    def test_ack_control_error_is_consumed_before_pre_without_any_ack_dispatch(self):
        def missing_control(action, phone):
            if action == 'ack':
                raise ValueError('ONE_ENABLED_OWN_CONTROL')
        self.phone.hook = missing_control
        with self.assertRaisesRegex(ValueError, 'ONE_ENABLED_OWN_CONTROL'):
            self.prepare()
        self.assertFalse((self.output / 'pre-intent.json').exists())
        self.assertFalse((self.output / 'ack-done.json').exists())
        with self.assertRaises(FileExistsError):
            self.prepare()
        self.assertNotIn('ack', self.phone.events)

    def test_unknown_capture_is_consumed_without_post_or_replay(self):
        sha = self.prepare()
        self.phone.fail_capture = True
        with self.assertRaisesRegex(ValueError, 'DRAIN_UNKNOWN'):
            self.tail.run(self.ready, sha)
        with self.assertRaises(FileExistsError):
            self.tail.run(self.ready, sha)
        self.assertEqual(self.phone.events.count('capture'), 1)
        self.assertFalse((self.output / 'capture-done.json').exists())
        self.assertFalse((self.output / 'post-intent.json').exists())

    def test_successful_run_cannot_capture_or_save_post_twice(self):
        sha = self.prepare()
        self.assertEqual(self.tail.run(self.ready, sha), 'PUBLISHED')
        with self.assertRaises(FileExistsError):
            self.tail.run(self.ready, sha)
        self.assertEqual(self.phone.events.count('ack'), 1)
        self.assertEqual(self.phone.events.count('capture'), 1)
        self.assertEqual(self.phone.events.count('screenshot'), 2)

    def test_post_is_fsynced_before_close_and_no_memory_or_export_method_is_needed(self):
        sha = self.prepare()
        original = v2.base.exclusive
        events = []
        def save(path, data):
            result = original(path, data)
            if Path(path).name == 'post.png':
                events.append('post-fsync-returned')
            return result
        original_tap = self.phone.tap
        def tap(action, before_dispatch=None):
            if action == 'close':
                self.assertIn('post-fsync-returned', events)
                events.append('close')
            return original_tap(action, before_dispatch)
        self.phone.tap = tap
        with mock.patch.object(v2.base, 'exclusive', side_effect=save):
            self.assertEqual(self.tail.run(self.ready, sha), 'PUBLISHED')
        self.assertEqual(events, ['post-fsync-returned', 'close'])

    def test_post_write_or_fsync_error_never_closes_or_replays(self):
        for mode in ['write', 'fsync']:
            with self.subTest(mode=mode), tempfile.TemporaryDirectory() as temp:
                clock = fixtures.Clock()
                phone = fixtures.FakePhone(clock)
                phone.output = Path(temp)
                tail = v2.CaptureTail(phone, fixtures.packet(), temp, clock.now, clock.advance)
                sha = tail.prepare(100)['sha256']
                original = v2.base.exclusive
                def fail_post(path, data):
                    if Path(path).name == 'post.png':
                        if mode == 'write':
                            raise OSError('synthetic post disk error')
                        with mock.patch.object(v2.base.os, 'fsync', side_effect=OSError('synthetic fsync error')):
                            return original(path, data)
                    return original(path, data)
                with mock.patch.object(v2.base, 'exclusive', side_effect=fail_post), self.assertRaises(OSError):
                    tail.run(100, sha)
                self.assertNotIn('close', phone.events)
                self.assertTrue((Path(temp) / 'post-intent.json').exists())
                self.assertFalse((Path(temp) / 'post-done.json').exists())
                with self.assertRaises(FileExistsError):
                    tail.run(100, sha)
                self.assertEqual(phone.events.count('capture'), 1)

    def test_refused_terminal_is_not_promoted_and_can_close(self):
        self.phone.terminal_phase = 'REFUSED'
        self.assertEqual(self.tail.run(self.ready, self.prepare()), 'REFUSED')
        self.assertFalse(v2.load(self.output / 'post.json')['marker']['published'])
        self.assertFalse(v2.load(self.output / 'outcome.json')['cameraProofAccepted'])

    def test_never_terminal_or_exactly_late_terminal_stays_unconfirmed_without_close(self):
        for after in [1000, 20]:
            with self.subTest(after=after), tempfile.TemporaryDirectory() as temp:
                clock = fixtures.Clock()
                phone = fixtures.FakePhone(clock)
                phone.terminal_after = after
                tail = v2.CaptureTail(phone, fixtures.packet(), temp, clock.now, clock.advance)
                sha = tail.prepare(100)['sha256']
                self.assertEqual(tail.run(100, sha), 'UNCONFIRMED')
                self.assertTrue((Path(temp) / 'post.png').exists())
                self.assertNotIn('close', phone.events)
                self.assertGreaterEqual(clock.now(), 120)

    def test_successful_close_requires_actual_unmount(self):
        self.phone.fail_close = True
        with self.assertRaisesRegex(ValueError, 'PREVIEW_CLOSE_UNVERIFIED'):
            self.tail.run(self.ready, self.prepare())
        outcome = v2.load(self.output / 'outcome.json')
        self.assertTrue(outcome['postSaved'])
        self.assertFalse(outcome['previewUnmountedObserved'])
        self.assertEqual(self.phone.events.count('close'), 1)

    def test_terminal_post_close_body_is_byte_identical_to_reviewed_base(self):
        start = b'        deadline = self.now() + 20'
        original = v2.BASE_PATH.read_bytes().split(start, 1)[1].split(b'class PinnedAdb:', 1)[0].rstrip()
        current = Path(v2.__file__).read_bytes().split(start, 1)[1].rstrip()
        self.assertEqual(current, original)

    def test_terminal_body_content_matches_when_only_windows_line_endings_are_normalized(self):
        # Diagnostic alongside the STRICT byte test above; it does not hide its failure.
        start = b'        deadline = self.now() + 20'
        original = v2.BASE_PATH.read_bytes().split(start, 1)[1].split(b'class PinnedAdb:', 1)[0].rstrip()
        current = Path(v2.__file__).read_bytes().split(start, 1)[1].rstrip()
        self.assertEqual(current.replace(b'\r\n', b'\n'), original.replace(b'\r\n', b'\n'))


class V2SessionTests(unittest.TestCase):
    def setUp(self):
        spec = importlib.util.spec_from_file_location('reviewed_v2_session_test', Path(v2.__file__).with_name('session.py'))
        self.session = importlib.util.module_from_spec(spec)
        with mock.patch('subprocess.Popen', side_effect=AssertionError('NO_DEVICE_IMPORT')) as process:
            spec.loader.exec_module(self.session)
            process.assert_not_called()
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.output = self.root / 'apps/recognition-lab/runs/phone-experiment/fake-host-case'
        self.output.mkdir(parents=True)
        self.packet = self.root / 'packet.json'
        self.charter = self.root / 'charter.json'
        self.value = {**fixtures.packet(), 'hostProtocol': v2.PROTOCOL, 'baseControllerSha256': v2.BASE_SHA,
                      'controllerSha256': v2.digest(Path(v2.__file__).read_bytes()),
                      'sessionSha256': v2.digest(Path(self.session.__file__).read_bytes())}

    def files(self, value=None, approved=False):
        self.packet.write_bytes(v2.base.canonical(value if value is not None else self.value))
        self.charter.write_bytes(v2.base.canonical(dict(executionDir=str(self.output), executionApproved=approved,
                                                       packetSha256=v2.digest(self.packet.read_bytes()))))

    def invoke(self):
        with mock.patch.object(self.session, 'ROOT', self.root), mock.patch.object(sys, 'argv', ['session.py', str(self.packet), str(self.charter)]):
            self.session.main()

    def test_import_is_effect_free_and_disabled_charter_still_refuses_before_transport(self):
        self.files()
        with mock.patch('subprocess.Popen', side_effect=AssertionError('NO_PHONE')) as process:
            with self.assertRaisesRegex(ValueError, 'REVIEWED_EXECUTION_PACKET_REQUIRED'):
                self.invoke()
            process.assert_not_called()

    def test_original_or_mutated_protocol_hashes_cannot_reach_adapter(self):
        for key in ['hostProtocol', 'baseControllerSha256', 'controllerSha256', 'sessionSha256']:
            for kind in ['missing', 'wrong']:
                value = dict(self.value)
                if kind == 'missing':
                    value.pop(key)
                else:
                    value[key] = 'wrong'
                self.files(value)
                with self.subTest(key=key, kind=kind), mock.patch.object(self.session, 'PinnedAdb') as adapter:
                    with self.assertRaisesRegex(ValueError, 'REVIEWED_HOST_PROTOCOL_REQUIRED'):
                        self.invoke()
                    adapter.assert_not_called()

    def test_exact_new_bindings_reach_only_the_fake_adapter_boundary(self):
        self.files()
        class BoundaryReached(Exception):
            pass
        with mock.patch.object(self.session, 'PinnedAdb', side_effect=BoundaryReached) as adapter:
            with self.assertRaises(BoundaryReached):
                self.invoke()
            adapter.assert_called_once_with(self.packet, self.charter)

    def test_protocol_approval_cannot_adopt_a_different_packet_or_zero_artifact(self):
        self.files(approved=True)
        charter = json.loads(self.charter.read_bytes())
        charter['packetSha256'] = '0' * 64
        self.charter.write_bytes(v2.base.canonical(charter))
        with mock.patch('subprocess.Popen', side_effect=AssertionError('NO_PHONE')):
            with self.assertRaisesRegex(ValueError, 'REVIEWED_EXECUTION_PACKET_REQUIRED'):
                self.invoke()
            self.files({**self.value, 'source': '0' * 64}, approved=True)
            with self.assertRaisesRegex(ValueError, 'FROZEN_ARTIFACT_PINS_REQUIRED'):
                self.invoke()


if __name__ == '__main__':
    unittest.main()
