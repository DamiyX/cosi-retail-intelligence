"""Bounded capture tail. Imports and fake-transport checks never access a phone.

Execution requires a separately reviewed, pinned packet and a fresh human READY.
An effect intent is irrevocable even when its command fails or its outcome is unknown.
"""
from dataclasses import dataclass
from pathlib import Path
import datetime
import hashlib
import importlib.util
import json
import math
import re
import struct
import time
import uuid
import zlib
import xml.etree.ElementTree as ET
import os

ROOT = Path(__file__).resolve().parents[3]
RUN = "p203-orientation-20261027-readiness-v2"
PKG = "com.damiyx.retailintelligence.recognitionverification"
MARKER = "ORIENTATION_CAPTURE_V1 "
PROTOCOL = "OBSERVED_INSPECT_AND_ACK_V4"
CASES = tuple(f"M{i:02d}-{'A' if i < 4 else 'B'}{(i % 4) * 90:03d}" for i in range(8))
LABELS = {"inspect": "Inspect new geometry run", "ack": "Acknowledge current chart and supported phone", "capture": "Capture this geometry row once", "close": "Close idle or settled preview", "restore": "Restore preview without capture"}
PUMP = ROOT / "apps/recognition-lab/runs/phone-experiment/p203-orientation-ui-device-preparation-20261025-a1/fixture_device.py"
PUMP_SHA = "15f863aff51d5c4a944750ef919a4fce4ab30762e63978c5943b3315f87d4c03"


def require(ok, code):
    if not ok:
        raise ValueError(code)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()


def unique_pairs(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, "DUPLICATE_JSON_KEY")
        result[key] = value
    return result


def valid_uuid(value):
    return isinstance(value, str) and re.fullmatch(r"[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}", value) is not None


def png_dimensions(data):
    require(24 <= len(data) <= 4 * 1024 * 1024 and data.startswith(b"\x89PNG\r\n\x1a\n"), "PNG_BOUND")
    offset, first, ended, dimensions, image_data = 8, True, False, None, False
    while offset < len(data):
        require(offset + 12 <= len(data), "PNG_TRUNCATED")
        size = struct.unpack(">I", data[offset:offset + 4])[0]
        end = offset + 12 + size
        require(end <= len(data), "PNG_CHUNK_BOUND")
        kind, body = data[offset + 4:offset + 8], data[offset + 8:offset + 8 + size]
        require(zlib.crc32(kind + body) & 0xffffffff == struct.unpack(">I", data[end - 4:end])[0], "PNG_CRC")
        if first:
            require(kind == b"IHDR" and size == 13, "PNG_IHDR")
            dimensions = struct.unpack(">II", body[:8])
            require(body[8] == 8 and body[9] in (2, 6) and body[10:] == b"\0\0\0", "PNG_SCREEN_FORMAT")
            first = False
        else:
            require(kind != b"IHDR", "PNG_DUPLICATE_HEADER")
        if kind == b"IDAT" and size > 0:
            image_data = True
        if kind == b"IEND":
            require(size == 0 and end == len(data), "PNG_IEND")
            ended = True
            break
        offset = end
    require(ended and dimensions is not None and image_data, "PNG_INCOMPLETE")
    return dimensions


def load(path, cap=65536):
    raw = Path(path).read_bytes()
    require(len(raw) <= cap, "PACKET_CAP")
    return json.loads(raw, object_pairs_hook=unique_pairs)


def exclusive(path, data):
    require(not Path(path).is_symlink(), "OUTPUT_LINK")
    with Path(path).open("xb") as stream:
        stream.write(data)
        stream.flush()
        os.fsync(stream.fileno())


class Journal:
    def __init__(self, path, now=time.monotonic):
        self.path, self.now = Path(path), now
        require(self.path.is_dir() and not self.path.is_symlink(), "OWN_EXISTING_OUTPUT_DIRECTORY")

    def save(self, name, value):
        require(re.fullmatch(r"[A-Za-z0-9-]+", name), "FIXED_JOURNAL_NAME")
        exclusive(self.path / (name + ".json"), canonical(value))

    def once(self, name, operation):
        self.save(name + "-intent", {"state": "CONSUMED_BEFORE_DISPATCH", "monotonic": self.now()})
        # A failure leaves the intent in place; there is no automatic retry/resume.
        result = operation()
        self.save(name + "-done", {"monotonic": self.now(), "result": result})
        return result


def marker_from_tree(tree):
    values = []
    for node in tree.iter("node"):
        if node.get("package") != PKG:
            continue
        for field in ("content-desc", "text"):
            text = node.get(field, "")
            if text.startswith(MARKER):
                require(len(text) <= 4096, "MARKER_CAP")
                values.append(json.loads(text[len(MARKER):], object_pairs_hook=unique_pairs))
    require(len(values) == 1, "ONE_CURRENT_VISIBLE_MARKER")
    return values[0]


@dataclass(frozen=True)
class Binding:
    case: str
    job: str
    source: str
    apk: str
    process: str
    lifecycle: int
    generation: int
    nonce: str
    layout: str
    viewport: dict

    @classmethod
    def from_snapshot(cls, observed, packet):
        m = observed["marker"]
        require(packet["case"] in CASES, "FIXED_CASE")
        expected = str(uuid.UUID(bytes=hashlib.md5((RUN + ":" + packet["case"]).encode()).digest(), version=3))
        require(type(m.get("version")) is int and m["version"] == 1 and m.get("run") == RUN and m.get("caseId") == packet["case"] and m.get("jobId") == expected, "ROW_BINDING")
        require(m.get("source") == packet["source"] and m.get("apk") == packet["apk"], "ARTIFACT_BINDING")
        require(valid_uuid(m.get("process")), "PROCESS_BINDING")
        require(type(m.get("lifecycle")) is int and m["lifecycle"] >= 0, "LIFECYCLE_BINDING")
        require(type(m.get("viewGeneration")) is int and m["viewGeneration"] > 0, "VIEW_GENERATION_BINDING")
        layout = "A" if packet["case"] in CASES[:4] else "B"
        require(m.get("layout") == layout and m.get("previewMounted") is True and m.get("idle") is True and m.get("busy") is False and m.get("phase") == "IDLE", "PREVIEW_READY_IDLE")
        require(valid_uuid(m.get("nonce")), "FRESH_NATIVE_NONCE")
        require(m.get("geometryReady") is True and m.get("generatedExportVerified") is True
                and (packet['case'] == CASES[0] or m.get('firstExportVerified') is True),
                "CURRENT_GEOMETRY_AND_EXPORT_GATES")
        return cls(packet["case"], expected, packet["source"], packet["apk"], m["process"], m["lifecycle"], m["viewGeneration"], m["nonce"], layout, observed["viewport"])

    def check(self, observed):
        m = observed["marker"]
        require(type(m.get("version")) is int and m["version"] == 1 and m.get("run") == RUN and m.get("caseId") == self.case and m.get("jobId") == self.job and m.get("source") == self.source and m.get("apk") == self.apk and m.get("process") == self.process and type(m.get("lifecycle")) is int and m["lifecycle"] == self.lifecycle and m.get("layout") == self.layout, "CAPTURE_BINDING_CHANGED")
        require(observed["viewport"] == self.viewport and m.get("viewGeneration") == self.generation and m.get("previewMounted") is True, "CAPTURE_VIEW_CHANGED")


class CaptureTail:
    """Adapter has only preflight/observe/tap/screenshot. No inference or arbitrary command API."""
    def __init__(self, adapter, packet, output, now=time.monotonic, pause=time.sleep):
        self.adapter, self.packet, self.now, self.pause = adapter, packet, now, pause
        self.journal = Journal(output, now)
        self.binding = None
        self.pre = None
        self.readiness = None
        self.clock_instance = str(uuid.uuid4())

    def window(self, ready):
        require(type(ready) in (int, float) and math.isfinite(ready) and 0 <= self.now() - ready < 120, "NO_LATE_SHUTTER")

    def screenshot(self, name, state):
        def save():
            started = self.now()
            data = self.adapter.screenshot()
            dimensions = png_dimensions(data)
            require(dimensions == tuple(self.packet["displayPixels"]), "PNG_DISPLAY_SIZE")
            exclusive(self.journal.path / (name + ".png"), data)
            proof = {"sha256": digest(data), "bytes": len(data), "viewport": state["viewport"], "marker": state["marker"], "monotonic": started, "savedMonotonic": self.now()}
            self.journal.save(name, proof)
            return proof
        return self.journal.once(name, save)

    def prepare(self, ready):
        self.window(ready)
        self.adapter.preflight()
        before = self.adapter.observe()
        self.window(ready)
        require(before['marker'].get('previewMounted') is True
                and before['marker'].get('geometryReady') is True
                and before['marker'].get('busy') is False, 'CURRENT_MOUNTED_SETUP')
        issued_start = self.now()
        def same_setup(observed):
            self.window(ready)
            require(observed['viewport'] == before['viewport'] and all(
                observed['marker'].get(k) == before['marker'].get(k)
                for k in ('process', 'lifecycle', 'viewGeneration', 'layout', 'previewMounted')),
                'INSPECT_SETUP_CHANGED')
        self.journal.once('inspect', lambda: self.adapter.tap(
            'inspect', before_dispatch=same_setup, deadline=ready + 120))
        def inspect_complete(state):
            # A settled input client is not a settled native/React callback.
            # Only observations repeat; the Inspect command above remains one-use.
            m = state['marker']
            self._setup_binding(before, state)
            if m.get('nonce') == before['marker'].get('nonce') or m.get('busy') is True:
                return False
            require(valid_uuid(m.get('nonce')), 'FRESH_NATIVE_NONCE')
            return True
        state = self._wait_setup('inspect', ready, min(ready + 120, issued_start + 120), inspect_complete)
        self.binding = Binding.from_snapshot(state, self.packet)
        self.readiness = dict(ready=ready, issuedStart=issued_start,
            observedEnd=self.now(), clockInstance=self.clock_instance,
            binding=self.binding.__dict__, packetSha256=digest(canonical(self.packet)))
        self.journal.save('native-readiness', self.readiness)
        self._fresh_idle(ready, state)
        self.journal.once('ack', lambda: self.adapter.tap('ack',
            before_dispatch=lambda observed: self._fresh_idle(ready, observed),
            deadline=min(ready + 120, issued_start + 120)))
        def ack_complete(state):
            self._fresh_idle(ready, state)
            return state.get('captureControlEnabled') is True
        state = self._wait_setup('ack', ready, min(ready + 120, issued_start + 120), ack_complete)
        self.pre = self.screenshot("pre", state)
        return self.pre  # Stop here for the agent's real visual scene qualification.

    def _setup_binding(self, before, state):
        m, previous = state['marker'], before['marker']
        require(state['viewport'] == before['viewport'] and all(
            m.get(k) == previous.get(k) for k in
            ('lifecycle', 'viewGeneration', 'layout', 'previewMounted'))
            and (previous.get('process') is None or previous['process'] == m.get('process')),
            'INSPECT_VIEW_OR_PROCESS_CHANGED')
        expected_job = str(uuid.UUID(bytes=hashlib.md5((RUN + ':' + self.packet['case']).encode()).digest(), version=3))
        require(m.get('run') == RUN and m.get('source') == self.packet['source']
                and m.get('apk') == self.packet['apk'] and m.get('caseId') == self.packet['case']
                and m.get('jobId') == expected_job and m.get('phase') == 'IDLE'
                and m.get('idle') is True and m.get('previewMounted') is True
                and m.get('geometryReady') is True, 'INSPECT_SETUP_OR_ARTIFACT_CHANGED')
        require(m.get('generatedExportVerified') is True and
                (self.packet['case'] == CASES[0] or m.get('firstExportVerified') is True),
                'CURRENT_GEOMETRY_AND_EXPORT_GATES')

    def _wait_setup(self, phase, ready, deadline, complete):
        # Finite metadata observations, no screenshots/effect retries. Keep the
        # original READY/native deadlines even when a callback stays pending.
        for number in range(32):
            self.window(ready)
            require(self.now() < deadline, 'SETUP_COMPLETION_DEADLINE')
            try:
                state = self.adapter.observe(deadline=deadline)
            except Exception as error:
                self.journal.save(phase + '-observation-error', dict(
                    monotonic=self.now(), code=str(error) if re.fullmatch(r'[A-Z][A-Z0-9_]{0,119}',str(error)) else 'OBSERVATION_UNAVAILABLE', noReplay=True))
                raise
            encoded = canonical(state)
            require(len(encoded) <= 8192, 'SETUP_OBSERVATION_CAP')
            self.journal.save(phase + '-observation-%02d' % number, dict(
                monotonic=self.now(), state=state))
            self.window(ready)
            require(self.now() < deadline, 'SETUP_COMPLETION_DEADLINE')
            if complete(state):
                return state
            self.pause(min(.25, max(0, deadline-self.now())))
        raise ValueError(phase.upper() + '_COMPLETION_NOT_OBSERVED')

    def _native_window(self, ready):
        self.window(ready)
        require(self.readiness is not None and self.readiness['ready'] == ready
                and self.readiness['clockInstance'] == self.clock_instance
                and 0 <= self.now() - self.readiness['issuedStart'] < 120,
                'NATIVE_READINESS_STALE_OR_OTHER_READY')

    def _fresh_idle(self, ready, observed):
        self._native_window(ready)
        self.binding.check(observed)
        m = observed['marker']
        require(m.get('nonce') == self.binding.nonce and m.get('phase') == 'IDLE'
                and m.get('idle') is True and m.get('busy') is False
                and m.get('geometryReady') is True, 'PRE_DISPATCH_NONCE_OR_STATE_CHANGED')
        require(m.get('generatedExportVerified') is True
                and (self.binding.case == CASES[0] or m.get('firstExportVerified') is True),
                'CURRENT_GEOMETRY_AND_EXPORT_GATES')

    def unconfirmed(self, reason, observed=None):
        # Exactly one attempt at a matching-view diagnostic post. Failure to
        # acquire it never becomes authority to retry or to close unknown work.
        post_saved = False
        failure = None
        try:
            if observed is None:
                observed = self.adapter.observe()
            self.binding.check(observed)
            self.screenshot('post', observed)
            post_saved = True
        except Exception as error:
            failure = str(error) if re.fullmatch(r'[A-Z][A-Z0-9_]{0,119}', str(error)) else 'POST_UNAVAILABLE'
        self.journal.save('outcome', dict(status='UNCONFIRMED', reason=reason,
            postSaved=post_saved, postFailure=failure, noReplay=True,
            cameraProofAccepted=False, previewCloseDispatched=False))
        return 'UNCONFIRMED'

    def run(self, ready, qualified_pre_sha):
        require(self.binding is not None and self.pre is not None and qualified_pre_sha == self.pre["sha256"], "PRE_SCENE_NOT_QUALIFIED")
        self.window(ready)
        require(0 <= self.now() - self.pre["monotonic"] <= 30, "PRE_SCENE_STALE")
        self._native_window(ready)
        def dispatch_guard(observed):
            self._fresh_idle(ready, observed)
            require(0 <= self.now() - self.pre["monotonic"] <= 30, "PRE_SCENE_STALE")
            require(self.now() - ready >= 15, 'POSITIONING_INTERVAL_REQUIRED')
        dispatch_deadline = min(ready + 120, self.pre['monotonic'] + 30,
                                self.readiness['issuedStart'] + 120)
        try:
            self.journal.once("capture", lambda: self.adapter.tap(
                "capture", before_dispatch=dispatch_guard, deadline=dispatch_deadline))
        except Exception as error:
            if str(error) in {'NO_LATE_SHUTTER', 'PRE_SCENE_STALE',
                             'NATIVE_READINESS_STALE_OR_OTHER_READY',
                             'PRE_DISPATCH_NONCE_OR_STATE_CHANGED',
                             'CURRENT_GEOMETRY_AND_EXPORT_GATES',
                             'POSITIONING_INTERVAL_REQUIRED', 'CAPTURE_BINDING_CHANGED',
                             'CAPTURE_VIEW_CHANGED'}:
                self.journal.save('outcome', dict(status='HOST_REFUSED_BEFORE_INPUT',
                    reason=str(error), noReplay=True, postSaved=False,
                    cameraProofAccepted=False, previewCloseDispatched=False))
            else:
                self.unconfirmed('CAPTURE_DISPATCH_REFUSED_OR_UNKNOWN')
            raise
        deadline = self.now() + 20
        terminal = None
        while self.now() < deadline:
            try:
                observed = self.adapter.observe(deadline=deadline)
            except ValueError as error:
                if str(error) not in {"OBSERVATION_DEADLINE", "HOST_ADB_CLIENT_TIMEOUT_PHONE_DRAIN_UNKNOWN"}:
                    self.unconfirmed('POST_OBSERVATION_LOST')
                    raise
                break
            try:
                self.binding.check(observed)
            except Exception:
                self.unconfirmed('POST_BINDING_LOST', observed)
                raise
            m = observed["marker"]
            if m.get("phase") in ("PUBLISHED", "REFUSED") and m.get("idle") is True and m.get("busy") is False:
                require(m.get("published") is (m["phase"] == "PUBLISHED"), "TERMINAL_PUBLICATION_BINDING")
                terminal = observed
                break
            if m.get('phase') == 'UNKNOWN':
                return self.unconfirmed('NATIVE_OUTCOME_UNKNOWN', observed)
            if m.get('phase') not in ('IDLE', 'CAPTURING'):
                return self.unconfirmed('NATIVE_PHASE_UNRECOGNIZED', observed)
            self.pause(min(0.25, max(0, deadline - self.now())))
        if terminal is None:
            return self.unconfirmed('TERMINAL_NOT_OBSERVED_IN_20_SECONDS')
        try:
            self.screenshot("post", terminal)  # No status scrolling/memory/export before this fsync.
        except Exception:
            self.journal.save('outcome', dict(status='UNCONFIRMED',
                reason='TERMINAL_OBSERVED_POST_SAVE_FAILED', nativePhase=terminal['marker']['phase'],
                postSaved=False, noReplay=True, previewCloseDispatched=False, cameraProofAccepted=False))
            raise
        self.journal.once("close", lambda: self.adapter.tap("close", before_dispatch=self.binding.check))
        close_deadline = self.now() + 10
        closed = False
        while self.now() < close_deadline:
            observed = self.adapter.observe(deadline=close_deadline)
            m = observed["marker"]
            require(m.get("run") == RUN and m.get("caseId") == self.binding.case and m.get("jobId") == self.binding.job and m.get("source") == self.binding.source and m.get("apk") == self.binding.apk and m.get("process") == self.binding.process and m.get("lifecycle") == self.binding.lifecycle, "CLOSE_BINDING_CHANGED")
            if m.get("previewMounted") is False and m.get("idle") is True and m.get("busy") is False:
                closed = True
                break
            self.pause(min(0.25, max(0, close_deadline - self.now())))
        self.journal.save("outcome", {"status": terminal["marker"]["phase"], "postSaved": True, "previewCloseDispatched": True, "previewUnmountedObserved": closed, "physicalDrainProven": False, "cameraProofAccepted": False})
        require(closed, "PREVIEW_CLOSE_UNVERIFIED_NO_FURTHER_ROW")
        return terminal["marker"]["phase"]


class PinnedAdb:
    """Fixed own-app transport adapter. No installation, launch, export, reset or pairing."""
    UI = "/data/local/tmp/p203-readiness-capture-ui.xml"

    def __init__(self, packet_path, charter_path):
        self.packet = load(packet_path)
        self.charter = load(charter_path)
        require(self.charter.get("executionApproved") is True and self.charter.get("packetSha256") == digest(Path(packet_path).read_bytes()), "REVIEWED_EXECUTION_PACKET_REQUIRED")
        require(self.packet.get("run") == RUN and self.packet.get("case") in CASES and all(isinstance(self.packet.get(k), str) and re.fullmatch(r"[a-f0-9]{64}", self.packet[k]) and self.packet[k] != "0" * 64 for k in ("apk", "source")), "FROZEN_ARTIFACT_PINS_REQUIRED")
        require(digest(PUMP.read_bytes()) == PUMP_SHA, "BOUNDED_TRANSPORT_CHANGED")
        spec = importlib.util.spec_from_file_location("reviewed_p203_bounded_transport", PUMP)
        self.transport = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.transport)
        self.endpoint = self.transport.transport(self.charter["transport"])
        self.pid = None
        self.live()

    def live(self):
        lease = self.charter["lease"]
        current = load(ROOT / ".agents/workflows/recognition-track-b.json", 1024 * 1024)["lease"]
        now = datetime.datetime.now(datetime.timezone.utc)
        require(current == lease and lease["holder"] == "01a098ef-d830-7531-bca7-2d66b0a5b587" and now < datetime.datetime.fromisoformat(lease["expires_at"]) <= now + datetime.timedelta(hours=3), "CURRENT_EXECUTION_LEASE_REQUIRED")

    def _run(self, args, cap=131072, deadline=None):
        self.live()
        expiry = (datetime.datetime.fromisoformat(self.charter["lease"]["expires_at"]) - datetime.datetime.now(datetime.timezone.utc)).total_seconds()
        timeout = min(expiry, 20 if deadline is None else min(20, deadline - time.monotonic()))
        require(timeout > 0, "OBSERVATION_DEADLINE")
        chunks = []
        rc, error, _ = self.transport._pump([self.transport.ADB, "-s", self.endpoint, *args], timeout, cap, chunks.append, {})
        require(rc == 0 and not error.strip(), "ADB_REFUSAL_OR_UNKNOWN")
        return b"".join(chunks)

    def _own_focus(self, deadline=None):
        # Reuse the exact previously reviewed single-line window observation.
        raw = self._run(["shell", "dumpsys window | grep -E '^[[:space:]]*mCurrentFocus='"], 8192, deadline).decode()
        matches = re.findall(r"\bu0 ([A-Za-z0-9_.]+)/", raw)
        require(len(matches) == 1 and matches[0] == PKG, "OWN_FOREGROUND_REQUIRED")

    def preflight(self):
        p = self.packet
        keys = ["ro.serialno", "ro.boot.serialno", "ro.product.model", "ro.build.version.sdk", "ro.product.cpu.abi"]
        identity = {k: self._run(["shell", "getprop", k], 4096).decode().strip() for k in keys}
        path = self._run(["shell", "pm", "path", PKG], 8192).decode().strip()
        require(path.startswith("package:") and "\n" not in path, "ONE_APK")
        path = path[8:]
        require(re.fullmatch(r"/data/app/[A-Za-z0-9_~+=./-]+/base.apk", path) and "/" + PKG + "-" in path and ".." not in path, "APK_PATH")
        checksum = self._run(["shell", "sha256sum", path], 8192).decode().split()
        require(checksum == [p["apk"], path], "INSTALLED_EXACT_APK")
        proof = self.transport.preflight_values(identity, self._run(["shell", "dumpsys", "package", PKG]).decode(), path, p["apk"], {"hardware": p["hardware"], "sandbox": p["sandbox"], "oldApkSha256": p["apk"]})
        self.pid = self._run(["shell", "pidof", PKG], 4096).decode().strip()
        require(re.fullmatch(r"[1-9][0-9]{0,8}", self.pid), "ONE_EXISTING_PROCESS")
        return proof

    def observe(self, deadline=None):
        pid = self._run(["shell", "pidof", PKG], 4096, deadline).decode().strip()
        require(self.pid is not None and pid == self.pid, "OWN_PROCESS_CHANGED_OR_EXITED")
        self._own_focus(deadline)
        self._run(["shell", "uiautomator", "dump", self.UI], 8192, deadline)
        raw = self._run(["exec-out", "cat", self.UI], 131072, deadline)
        require(b"<!DOCTYPE" not in raw and b"<!ENTITY" not in raw, "UI_XML_DECLARATION_REFUSED")
        tree = ET.fromstring(raw)
        marker = marker_from_tree(tree)
        boxes = [n.get("bounds") for n in tree.iter("node") if n.get("package") == PKG and n.get("resource-id", "").split("/")[-1] == "orientation-viewport"]
        require(len(boxes) == 1, "ONE_PHYSICAL_VIEWPORT")
        match = re.fullmatch(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", boxes[0])
        require(match is not None, "VIEWPORT_BOUNDS")
        left, top, right, bottom = map(int, match.groups())
        require(0 <= left < right <= self.packet["displayPixels"][0] and 0 <= top < bottom <= self.packet["displayPixels"][1], "VIEWPORT_DISPLAY_BOUND")
        self.tree = tree
        return {"marker": marker, "viewport": dict(left=left, top=top, right=right, bottom=bottom),
                "captureControlEnabled": self.capture_control_enabled(tree)}

    @staticmethod
    def capture_control_enabled(tree):
        parents = {child: parent for parent in tree.iter() for child in parent}
        matches = []
        for node in tree.iter('node'):
            if node.get('package') != PKG or node.get('text') != LABELS['capture']:
                continue
            while node is not None and node.get('clickable') != 'true':
                node = parents.get(node)
            matches.append(node is not None and node.get('package') == PKG and node.get('enabled') == 'true')
        return len(matches) == 1 and matches[0] is True

    def tap(self, action, before_dispatch=None, deadline=None):
        require(action in LABELS, "FIXED_OWN_ACTION")
        observed = self.observe(deadline=deadline)
        parents = {child: parent for parent in self.tree.iter() for child in parent}
        points = set()
        for node in self.tree.iter("node"):
            if node.get("package") != PKG or node.get("text") != LABELS[action]:
                continue
            while node is not None and node.get("clickable") != "true":
                node = parents.get(node)
            if node is None or node.get("package") != PKG or node.get("enabled") != "true":
                continue
            m = re.fullmatch(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", node.get("bounds", ""))
            require(m is not None, "OWN_CONTROL_BOUNDS")
            left, top, right, bottom = map(int, m.groups())
            require(0 <= left < right <= self.packet["displayPixels"][0] and 0 <= top < bottom <= self.packet["displayPixels"][1], "VISIBLE_OWN_CONTROL")
            points.add(((left + right) // 2, (top + bottom) // 2))
        require(len(points) == 1, "ONE_ENABLED_OWN_CONTROL")
        x, y = next(iter(points))
        self._own_focus(deadline)
        if before_dispatch is not None:
            before_dispatch(observed)
        output = self._run(["shell", "input", "tap", str(x), str(y)], 8192, deadline)
        return {"clientSettled": True, "responseSha256": digest(output), "nativeOutcomeNeedsObservation": True}

    def screenshot(self):
        require(self._run(["shell", "pidof", PKG], 4096).decode().strip() == self.pid, "OWN_PROCESS_CHANGED_OR_EXITED")
        self._own_focus()
        return self._run(["exec-out", "screencap", "-p"], 4 * 1024 * 1024)

    def memory_sample(self):
        """Outside the capture tail only; own package and aggregate fields, no app inventory."""
        require(self.pid is not None, "PREFLIGHT_REQUIRED")
        own = self._run(["shell", "dumpsys", "meminfo", PKG]).decode()
        keep = ("TOTAL", "TOTAL PSS", "TOTAL RSS", "Java Heap:", "Native Heap:", "Graphics:", "EGL mtrack", "GL mtrack")
        summary = [line.strip() for line in own.splitlines() if any(k in line for k in keep)]
        raw = self._run(["shell", "cat", "/proc/meminfo"], 16384).decode()
        aggregate = {}
        for key, value in re.findall(r"^(MemTotal|MemAvailable|MemFree):\s+(\d+) kB$", raw, re.M):
            aggregate[key + "KiB"] = int(value)
        return {"ownPid": int(self.pid), "ownSummary": summary, "aggregate": aggregate, "missingFieldsAreNotZero": True}
