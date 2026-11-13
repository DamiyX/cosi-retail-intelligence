"""Host-only regressions. Every transport, process, clock and PNG is synthetic."""
import copy
import importlib.util
import json
from pathlib import Path
import struct
import sys
import tempfile
import unittest
from unittest import mock
import uuid
import xml.etree.ElementTree as ET
import zlib

import controller as c


def png(width=2, height=2):
    def chunk(kind, body):
        return struct.pack(">I", len(body)) + kind + body + struct.pack(">I", zlib.crc32(kind + body) & 0xffffffff)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress((b"\0" + b"\0" * width * 3) * height)) + chunk(b"IEND", b""))


class Clock:
    def __init__(self):
        self.value = 100.0

    def now(self):
        return self.value

    def advance(self, seconds):
        self.value += seconds


def packet():
    return dict(run=c.RUN, case="M00-A000", source="1" * 64, apk="2" * 64, displayPixels=[2, 2])


def snapshot():
    p = packet()
    job = str(uuid.UUID(bytes=c.hashlib.md5((c.RUN + ":" + p["case"]).encode()).digest(), version=3))
    return dict(marker=dict(version=1, run=c.RUN, caseId=p["case"], jobId=job, source=p["source"],
                           apk=p["apk"], process="a0000000-0000-4000-8000-000000000001", lifecycle=2,
                           viewGeneration=4, nonce="b0000000-0000-4000-8000-000000000001", layout="A",
                           previewMounted=True, idle=True, busy=False, phase="IDLE", published=None),
                viewport=dict(left=0, top=0, right=2, bottom=1))


class FakePhone:
    def __init__(self, clock):
        self.clock, self.state, self.events = clock, snapshot(), []
        self.started = None
        self.terminal_after = .5
        self.terminal_phase = "PUBLISHED"
        self.crash_at = None
        self.hook = None
        self.screenshot_hook = None
        self.fail_capture = False
        self.fail_close = False
        self.png = png()
        self.output = None

    def preflight(self):
        self.events.append("preflight")

    def observe(self, deadline=None):
        self.events.append("observe")
        if self.crash_at is not None and self.clock.now() >= self.crash_at:
            raise ValueError("OWN_PROCESS_CHANGED_OR_EXITED")
        if self.started is not None and self.clock.now() - self.started >= self.terminal_after:
            self.state["marker"].update(phase=self.terminal_phase, idle=True, busy=False,
                                         published=self.terminal_phase == "PUBLISHED")
        return copy.deepcopy(self.state)

    def tap(self, action, before_dispatch=None):
        if self.hook:
            self.hook(action, self)
        state = self.observe()
        if before_dispatch:
            before_dispatch(state)
        self.events.append(action)
        if action == "capture":
            self.started = self.clock.now()
            self.state["marker"].update(phase="CAPTURING", idle=False, busy=True, published=None)
            if self.fail_capture:
                raise ValueError("HOST_ADB_CLIENT_TIMEOUT_PHONE_DRAIN_UNKNOWN")
        if action == "close" and not self.fail_close:
            # Closing the actual view changes generation; the post was already fsynced.
            assert (self.output / "post.png").exists()
            assert (self.output / "post.json").exists()
            self.state["marker"].update(previewMounted=False, viewGeneration=5)
        return {"clientSettled": True}

    def screenshot(self):
        self.events.append("screenshot")
        if self.screenshot_hook:
            self.screenshot_hook(self)
        if self.crash_at is not None and self.clock.now() >= self.crash_at:
            raise ValueError("OWN_PROCESS_CHANGED_OR_EXITED")
        return self.png


class TailTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.out = Path(self.temp.name)
        self.clock = Clock()
        self.phone = FakePhone(self.clock)
        self.phone.output = self.out
        self.tail = c.CaptureTail(self.phone, packet(), self.out, self.clock.now, self.clock.advance)
        self.ready = self.clock.now()

    def prepare(self):
        return self.tail.prepare(self.ready)["sha256"]

    def test_successful_tail_fsyncs_post_before_close_or_any_diagnostics(self):
        sha = self.prepare()
        with mock.patch.object(c.os, "fsync", wraps=c.os.fsync) as sync:
            self.assertEqual(self.tail.run(self.ready, sha), "PUBLISHED")
            self.assertGreaterEqual(sync.call_count, 7)
        effects = [e for e in self.phone.events if e in {"screenshot", "ack", "capture", "close"}]
        self.assertEqual(effects, ["screenshot", "ack", "capture", "screenshot", "close"])
        outcome = c.load(self.out / "outcome.json")
        self.assertTrue(outcome["previewUnmountedObserved"])
        self.assertFalse(outcome["cameraProofAccepted"])
        self.assertFalse(outcome["physicalDrainProven"])

    def test_late_crash_old_delayed_observation_loses_post_new_tail_preserves_it(self):
        self.phone.crash_at = self.clock.now() + 10
        self.assertEqual(self.tail.run(self.ready, self.prepare()), "PUBLISHED")
        saved = (self.out / "post.png").read_bytes()
        self.clock.advance(26)
        with self.assertRaisesRegex(ValueError, "OWN_PROCESS_CHANGED"):
            self.phone.observe()
        self.assertEqual((self.out / "post.png").read_bytes(), saved)
        self.assertLess(c.load(self.out / "post.json")["monotonic"], self.phone.crash_at)

    def test_refused_terminal_is_recorded_without_promoting_publication(self):
        self.phone.terminal_phase = "REFUSED"
        self.assertEqual(self.tail.run(self.ready, self.prepare()), "REFUSED")
        self.assertEqual(c.load(self.out / "outcome.json")["status"], "REFUSED")
        self.assertFalse(c.load(self.out / "post.json")["marker"]["published"])

    def test_timeout_advances_fake_clock_and_keeps_unconfirmed_post_without_close(self):
        self.phone.terminal_after = 1000
        self.assertEqual(self.tail.run(self.ready, self.prepare()), "UNCONFIRMED")
        self.assertGreaterEqual(self.clock.now() - self.ready, 20)
        self.assertTrue((self.out / "post.png").exists())
        self.assertNotIn("close", self.phone.events)
        self.assertTrue(c.load(self.out / "outcome.json")["noReplay"])

    def test_deadline_exception_preserves_unconfirmed_post_without_replaying_capture(self):
        sha = self.prepare()
        original = self.phone.observe
        def deadline(deadline=None):
            if deadline is not None:
                self.clock.advance(20)
                raise ValueError("OBSERVATION_DEADLINE")
            return original()
        self.phone.observe = deadline
        self.assertEqual(self.tail.run(self.ready, sha), "UNCONFIRMED")
        self.assertEqual(self.phone.events.count("capture"), 1)
        self.assertEqual(self.phone.events.count("screenshot"), 2)
        self.assertNotIn("close", self.phone.events)

    def test_unknown_native_phase_never_becomes_published(self):
        sha = self.prepare()
        self.phone.terminal_phase = "UNKNOWN"
        with self.assertRaisesRegex(ValueError, "NATIVE_OUTCOME_UNKNOWN"):
            self.tail.run(self.ready, sha)
        self.assertNotIn("close", self.phone.events)
        self.assertTrue((self.out / "capture-done.json").exists())  # dispatch settled, native did not
        self.assertFalse((self.out / "outcome.json").exists())

    def test_qualification_and_pre_age_refuse_before_any_ack(self):
        sha = self.prepare()
        for value in ["0" * 64, None]:
            with self.subTest(value=value), self.assertRaisesRegex(ValueError, "PRE_SCENE_NOT_QUALIFIED"):
                self.tail.run(self.ready, value)
        self.clock.advance(30.001)
        with self.assertRaisesRegex(ValueError, "PRE_SCENE_STALE"):
            self.tail.run(self.ready, sha)
        self.assertNotIn("ack", self.phone.events)

    def test_ready_window_refuses_nonfinite_future_and_exact_120_seconds(self):
        for ready in [float('nan'), float('inf'), self.clock.now() + 1, self.clock.now() - 120, True]:
            with self.subTest(ready=ready), self.assertRaisesRegex(ValueError, "NO_LATE_SHUTTER"):
                self.tail.prepare(ready)
        self.assertNotIn("preflight", self.phone.events)

    def test_expired_ready_rejected_at_actual_capture_dispatch(self):
        sha = self.prepare()
        self.phone.hook = lambda action, p: self.clock.advance(120) if action == "capture" else None
        with self.assertRaisesRegex(ValueError, "NO_LATE_SHUTTER"):
            self.tail.run(self.ready, sha)
        self.assertEqual(self.phone.events.count("ack"), 1)
        self.assertNotIn("capture", self.phone.events)
        self.assertTrue((self.out / "capture-intent.json").exists())

    def test_pre_ages_during_ack_lookup_before_actual_shutter(self):
        sha = self.prepare()
        self.phone.hook = lambda action, p: self.clock.advance(31) if action == "capture" else None
        with self.assertRaisesRegex(ValueError, "PRE_SCENE_STALE"):
            self.tail.run(self.ready, sha)
        self.assertNotIn("capture", self.phone.events)

    def test_dispatch_refuses_every_stale_provenance_binding(self):
        mutations = dict(nonce="c0000000-0000-4000-8000-000000000001", process="d0000000-0000-4000-8000-000000000001",
                         lifecycle=3, viewGeneration=5, source="3" * 64, apk="4" * 64, layout="B", caseId="M01-A090")
        # Each attempted row has its own synthetic output; never reset a consumed journal.
        for key, value in mutations.items():
            with self.subTest(field=key), tempfile.TemporaryDirectory() as temp:
                clock, phone = Clock(), FakePhone(Clock())
                phone.clock = clock
                tail = c.CaptureTail(phone, packet(), Path(temp), clock.now, clock.advance)
                sha = tail.prepare(clock.now())["sha256"]
                phone.hook = lambda action, p, k=key, v=value: p.state["marker"].update({k: v}) if action == "capture" else None
                with self.assertRaises(ValueError):
                    tail.run(100.0, sha)
                self.assertNotIn("capture", phone.events)

    def test_physical_viewport_change_refuses_before_ack(self):
        sha = self.prepare()
        self.phone.state["viewport"]["right"] = 1
        with self.assertRaisesRegex(ValueError, "CAPTURE_VIEW_CHANGED"):
            self.tail.run(self.ready, sha)
        self.assertNotIn("ack", self.phone.events)

    def test_capture_command_uncertainty_latches_intent_and_is_never_replayed(self):
        sha = self.prepare()
        self.phone.fail_capture = True
        with self.assertRaisesRegex(ValueError, "DRAIN_UNKNOWN"):
            self.tail.run(self.ready, sha)
        self.assertTrue((self.out / "capture-intent.json").exists())
        self.assertFalse((self.out / "capture-done.json").exists())
        before = self.phone.events.count("capture")
        with self.assertRaises((ValueError, FileExistsError)):
            self.tail.run(self.ready, sha)
        self.assertEqual(self.phone.events.count("capture"), before)

    def test_post_disk_failure_preserves_consumed_capture_and_never_closes_or_retries(self):
        sha = self.prepare()
        original = c.exclusive
        def fail_post(path, data):
            if Path(path).name == "post.png":
                raise OSError("synthetic disk full")
            return original(path, data)
        with mock.patch.object(c, "exclusive", side_effect=fail_post), self.assertRaisesRegex(OSError, "disk full"):
            self.tail.run(self.ready, sha)
        self.assertTrue((self.out / "post-intent.json").exists())
        self.assertFalse((self.out / "post-done.json").exists())
        self.assertNotIn("close", self.phone.events)
        self.assertEqual(self.phone.events.count("capture"), 1)

    def test_invalid_post_png_is_not_written_or_used_to_close(self):
        sha = self.prepare()
        self.phone.png = b"truncated"
        with self.assertRaisesRegex(ValueError, "PNG_BOUND"):
            self.tail.run(self.ready, sha)
        self.assertFalse((self.out / "post.png").exists())
        self.assertNotIn("close", self.phone.events)

    def test_partial_post_write_remains_preserved_without_done_or_close(self):
        sha = self.prepare()
        original = c.exclusive
        def partial(path, data):
            if Path(path).name == "post.png":
                Path(path).write_bytes(data[:12])
                raise OSError("partial output retained")
            return original(path, data)
        with mock.patch.object(c, "exclusive", side_effect=partial), self.assertRaises(OSError):
            self.tail.run(self.ready, sha)
        self.assertEqual((self.out / "post.png").read_bytes(), self.phone.png[:12])
        self.assertFalse((self.out / "post-done.json").exists())
        self.assertNotIn("close", self.phone.events)

    def test_close_must_be_observed_not_merely_dispatched(self):
        self.phone.fail_close = True
        with self.assertRaisesRegex(ValueError, "PREVIEW_CLOSE_UNVERIFIED"):
            self.tail.run(self.ready, self.prepare())
        outcome = c.load(self.out / "outcome.json")
        self.assertTrue(outcome["postSaved"])
        self.assertFalse(outcome["previewUnmountedObserved"])
        self.assertEqual(self.phone.events.count("close"), 1)


class ParserAndAdapterTests(unittest.TestCase):
    def test_png_rejects_truncation_crc_duplicate_header_and_wrong_display(self):
        valid = png()
        for data in [b"", valid[:-1], valid + b"x", valid[:30] + bytes([valid[30] ^ 1]) + valid[31:],
                     valid[:33] + valid[8:33] + valid[33:]]:
            with self.subTest(data=data[:12]), self.assertRaises(ValueError):
                c.png_dimensions(data)
        self.assertEqual(c.png_dimensions(valid), (2, 2))
        with tempfile.TemporaryDirectory() as temp:
            phone, clock = FakePhone(Clock()), Clock()
            phone.png = png(3, 2)
            with self.assertRaisesRegex(ValueError, "PNG_DISPLAY_SIZE"):
                c.CaptureTail(phone, packet(), temp, clock.now, clock.advance).prepare(clock.now())

    def test_visible_marker_must_be_unique_current_own_package_and_valid_json(self):
        def tree(text, package=c.PKG):
            root = ET.Element("hierarchy")
            ET.SubElement(root, "node", {"package": package, "content-desc": text})
            return root
        text = c.MARKER + json.dumps(snapshot()["marker"])
        self.assertEqual(c.marker_from_tree(tree(text))["caseId"], "M00-A000")
        for root in [tree(text, "unrelated"), tree(c.MARKER + '{"version":1,"version":2}'), tree(c.MARKER + "{"), tree(c.MARKER + "x" * 4100)]:
            with self.subTest(xml=ET.tostring(root)[:50]), self.assertRaises((ValueError, json.JSONDecodeError)):
                c.marker_from_tree(root)
        root = tree(text)
        ET.SubElement(root, "node", {"package": c.PKG, "text": text})
        with self.assertRaisesRegex(ValueError, "ONE_CURRENT_VISIBLE_MARKER"):
            c.marker_from_tree(root)

    def test_disabled_examples_and_imports_never_reach_subprocess_or_transport(self):
        with mock.patch("subprocess.Popen", side_effect=AssertionError("no device calls")):
            spec = importlib.util.spec_from_file_location("test_only_session", Path(c.__file__).with_name("session.py"))
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            with self.assertRaisesRegex(ValueError, "REVIEWED_EXECUTION_PACKET_REQUIRED"):
                c.PinnedAdb(Path(c.__file__).with_name("packet.example.json"), Path(c.__file__).with_name("charter.example.json"))

    def test_approved_but_unfrozen_zero_source_still_refuses_before_adb(self):
        with tempfile.TemporaryDirectory() as temp, mock.patch("subprocess.Popen", side_effect=AssertionError("no device calls")):
            p, charter = Path(temp) / "packet.json", Path(temp) / "charter.json"
            p.write_bytes(c.canonical({**packet(), "source": "0" * 64}))
            charter.write_bytes(c.canonical({"executionApproved": True, "packetSha256": c.digest(p.read_bytes())}))
            with self.assertRaisesRegex(ValueError, "FROZEN_ARTIFACT_PINS_REQUIRED"):
                c.PinnedAdb(p, charter)

    def test_binding_admission_refuses_malformed_or_non_idle_native_marker(self):
        invalid = dict(version=True, run="old-run", jobId="wrong-job", process="not-uuid", lifecycle=True,
                       viewGeneration=0, nonce=None, previewMounted=False, busy=True, phase="PUBLISHED", idle=False)
        for key, value in invalid.items():
            state = snapshot()
            state["marker"][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                c.Binding.from_snapshot(state, packet())

    def adapter(self, xml, pid="123", focus=c.PKG):
        adapter = object.__new__(c.PinnedAdb)
        adapter.pid = "123"
        adapter.packet = packet()
        self.commands = []
        def run(args, cap=131072, deadline=None):
            self.commands.append(args)
            if args[:2] == ["shell", "pidof"]:
                return pid.encode()
            if args[0] == "shell" and "dumpsys window" in args[1]:
                return ("mCurrentFocus=Window{0 u0 " + focus + "/.MainActivity}").encode()
            if args[:2] == ["exec-out", "cat"]:
                return xml
            return b""
        adapter._run = run
        return adapter

    def xml(self):
        root = ET.Element("hierarchy")
        ET.SubElement(root, "node", {"package": c.PKG, "content-desc": c.MARKER + json.dumps(snapshot()["marker"])})
        ET.SubElement(root, "node", {"package": c.PKG, "resource-id": "orientation-viewport", "bounds": "[0,0][2,1]"})
        return root

    def test_real_adapter_refuses_process_focus_xml_and_viewport_failures(self):
        root = self.xml()
        malformed = [b"bad xml", b'<!DOCTYPE hierarchy><hierarchy/>', b'<!ENTITY x "y"><hierarchy/>']
        for data in malformed:
            with self.subTest(data=data), self.assertRaises((ValueError, ET.ParseError)):
                self.adapter(data).observe()
        for pid, focus in [("124", c.PKG), ("", c.PKG), ("123", "unrelated")]:
            with self.subTest(pid=pid, focus=focus), self.assertRaises(ValueError):
                self.adapter(ET.tostring(root), pid, focus).observe()
        root[-1].set("bounds", "[0,0][3,1]")
        with self.assertRaisesRegex(ValueError, "VIEWPORT_DISPLAY_BOUND"):
            self.adapter(ET.tostring(root)).observe()

    def test_real_adapter_rechecks_dispatch_and_only_taps_enabled_own_visible_control(self):
        root = self.xml()
        button = ET.SubElement(root, "node", {"package": c.PKG, "text": c.LABELS["capture"], "clickable": "true", "enabled": "true", "bounds": "[0,0][2,2]"})
        adapter = self.adapter(ET.tostring(root))
        def refuse(_observed):
            raise ValueError("stale at actual dispatch")
        with self.assertRaisesRegex(ValueError, "stale at actual dispatch"):
            adapter.tap("capture", before_dispatch=refuse)
        self.assertFalse(any(args[:3] == ["shell", "input", "tap"] for args in self.commands))
        for key, value in [("enabled", "false"), ("bounds", "[0,0][3,2]"), ("package", "unrelated")]:
            candidate = copy.deepcopy(root)
            candidate[-1].set(key, value)
            with self.subTest(key=key), self.assertRaises(ValueError):
                self.adapter(ET.tostring(candidate)).tap("capture")
        adapter = self.adapter(ET.tostring(root))
        adapter.tap("capture", before_dispatch=lambda state: c.Binding.from_snapshot(state, packet()))
        self.assertEqual(self.commands[-1], ["shell", "input", "tap", "1", "1"])

    def test_consumed_journal_never_reexecutes_failed_effect(self):
        with tempfile.TemporaryDirectory() as temp:
            journal = c.Journal(temp)
            operation = mock.Mock(side_effect=OSError("uncertain write"))
            with self.assertRaises(OSError):
                journal.once("capture", operation)
            with self.assertRaises(FileExistsError):
                journal.once("capture", operation)
            operation.assert_called_once()


class NativeNamespaceContractTests(unittest.TestCase):
    """Static selector contract plus separately reviewed NDK syntax; no C execution claim."""
    native = c.ROOT / "apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src/main/cpp/camera_proof_publish.c"
    java = c.ROOT / "apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src/main/java/expo/modules/recognitioncpu"

    @classmethod
    def sources(cls):
        return (cls.native.read_text(), (cls.java / "CameraOrientationPlan.java").read_text(),
                (cls.java / "CameraMatrixRecoveryPlan.java").read_text(),
                (cls.java / "CameraOrientationUiRetained.java").read_text())

    @staticmethod
    def selectors(source):
        # Parse only the complete, fixed strcmp gate expressions. A new algorithm
        # shape fails closed and requires this contract to be reviewed again.
        def body(name):
            match = c.re.search(r"static int " + name + r"\([^)]*\)\{(.*?)\n\}", source, c.re.S)
            c.require(match is not None, "NATIVE_SELECTOR_FUNCTION")
            return c.re.sub(r"\s+", "", match[1])
        orientation = c.re.search(r'if\(base==NULL\|\|strcmp\(base\+1,"([^"]+)"\)!=0\)return0;', body("orientation_leaf"))
        c.require(orientation is not None, "FIXED_ORIENTATION_ROOT_GATE")
        recovery = c.re.fullmatch(r"constchar\*base=strrchr\(directory,'/'\);returnbase!=NULL&&\((.+)\);", body("recovery_root"))
        c.require(recovery is not None, "FIXED_RECOVERY_ROOT_GATE")
        roots = []
        for expression in recovery[1].split("||"):
            match = c.re.fullmatch(r'strcmp\(base\+1,"([^"]+)"\)==0', expression)
            c.require(match is not None, "FIXED_RECOVERY_ROOT_COMPARISON")
            roots.append(match[1])
        c.require(len(roots) == len(set(roots)), "UNIQUE_RECOVERY_ROOTS")
        return orientation[1], set(roots)

    def assert_contract(self, native, plan, lanes):
        java_root = c.re.search(r'\bROOT\s*=\s*"([^"]+)"', plan)
        self.assertIsNotNone(java_root)
        active = dict(c.re.findall(r'^\s*(ACTUAL|FIXTURE|ORIENTATION_(?:FIRST|FINAL|FIXTURE))\("([^"]+)"', lanes, c.re.M))
        self.assertEqual(set(active), {"ACTUAL", "FIXTURE", "ORIENTATION_FIRST", "ORIENTATION_FINAL", "ORIENTATION_FIXTURE"})
        root, exports = self.selectors(native)
        self.assertEqual(root, java_root[1], "C publisher must accept the exact Java run root")
        self.assertEqual(exports, set(active.values()), "C writable recovery roots must equal Java active lanes, including legacy originals")

    def test_current_java_run_and_three_exports_match_native_writable_selectors(self):
        native, plan, lanes, _ = self.sources()
        self.assert_contract(native, plan, lanes)

    def test_old_ui_roots_are_not_writable_and_original_recovery_roots_still_are(self):
        native, _, lanes, retained = self.sources()
        root, exports = self.selectors(native)
        old_root = c.re.search(r'\bROOT\s*=\s*"([^"]+)"', retained)[1]
        old_exports = set(c.re.findall(r'RETAINED_UI_ORIENTATION_(?:FIRST|FINAL|FIXTURE)\("([^"]+)"', lanes))
        self.assertEqual(len(old_exports), 3)
        self.assertNotEqual(root, old_root)
        self.assertTrue(exports.isdisjoint(old_exports))
        legacy = set(c.re.findall(r'^\s*(?:ACTUAL|FIXTURE)\("([^"]+)"', lanes, c.re.M))
        self.assertEqual(legacy, {"camera-matrix-recovery-20261024-v1", "camera-matrix-recovery-fixture-20261024-v1"})
        self.assertTrue(legacy.issubset(exports))

    def test_prior_four_literals_and_each_individual_partial_fix_fail_contract(self):
        native, plan, lanes, retained = self.sources()
        replacements = {c.re.search(r'\bROOT\s*=\s*"([^"]+)"', plan)[1]:
                        c.re.search(r'\bROOT\s*=\s*"([^"]+)"', retained)[1]}
        for lane in ["FIRST", "FINAL", "FIXTURE"]:
            current = c.re.search(r'^\s*ORIENTATION_' + lane + r'\("([^"]+)"', lanes, c.re.M)[1]
            old = c.re.search(r'RETAINED_UI_ORIENTATION_' + lane + r'\("([^"]+)"', lanes)[1]
            replacements[current] = old
        prior = native
        for current, old in replacements.items():
            self.assertEqual(native.count('"' + current + '"'), 1)
            prior = prior.replace('"' + current + '"', '"' + old + '"')
            with self.subTest(stale_root=old), self.assertRaises(AssertionError):
                self.assert_contract(native.replace('"' + current + '"', '"' + old + '"'), plan, lanes)
        with self.assertRaises(AssertionError):
            self.assert_contract(prior, plan, lanes)
        # Actual source remains untouched and still satisfies the very same oracle.
        self.assert_contract(native, plan, lanes)


if __name__ == "__main__":
    unittest.main()
