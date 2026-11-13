"""Host-only acquisition ordering correction; no device effects on import.

The APK/source freeze and original controller remain immutable. Acknowledgement
is completed before acquiring the pre image; actual shutter still requires a
qualified image <=30s old and fresh same-process/nonce/view proof at dispatch.
"""
from pathlib import Path
import hashlib
import importlib.util
import sys

BASE_PATH = Path(__file__).resolve().parents[1] / "camera-orientation-evidence/controller.py"
BASE_SHA = "89257163307e476fcb0c243d6c69e4f9a7a222347cca2aa04ebea49e2580670a"
assert hashlib.sha256(BASE_PATH.read_bytes()).hexdigest() == BASE_SHA, "REVIEWED_BASE_CONTROLLER_CHANGED"
spec = importlib.util.spec_from_file_location("reviewed_orientation_controller_v1", BASE_PATH)
base = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = base
spec.loader.exec_module(base)
require, digest, load, ROOT = base.require, base.digest, base.load, base.ROOT
PinnedAdb, Binding = base.PinnedAdb, base.Binding
RUN = base.RUN
PROTOCOL = "ACK_BEFORE_PRE_V2"


class CaptureTail(base.CaptureTail):
    def _fresh_idle(self, ready, observed):
        self.window(ready)
        self.binding.check(observed)
        marker = observed["marker"]
        require(marker.get("nonce") == self.binding.nonce and marker.get("phase") == "IDLE"
                and marker.get("idle") is True and marker.get("busy") is False,
                "PRE_DISPATCH_NONCE_OR_STATE_CHANGED")

    def prepare(self, ready):
        self.window(ready)
        self.adapter.preflight()
        state = self.adapter.observe()
        self.binding = Binding.from_snapshot(state, self.packet)
        # ACK is setup only. Failure/uncertainty is consumed and stops before pre.
        self.journal.once("ack", lambda: self.adapter.tap(
            "ack", before_dispatch=lambda observed: self._fresh_idle(ready, observed)))
        state = self.adapter.observe()
        self._fresh_idle(ready, state)
        self.pre = self.screenshot("pre", state)
        return self.pre

    def run(self, ready, qualified_pre_sha):
        require(self.binding is not None and self.pre is not None
                and qualified_pre_sha == self.pre["sha256"], "PRE_SCENE_NOT_QUALIFIED")
        self.window(ready)
        require(0 <= self.now() - self.pre["monotonic"] <= 30, "PRE_SCENE_STALE")
        def dispatch_guard(observed):
            self._fresh_idle(ready, observed)
            require(0 <= self.now() - self.pre["monotonic"] <= 30, "PRE_SCENE_STALE")
        # PinnedAdb.tap obtains its own fresh control/marker/focus proof. Do not add
        # redundant UI reads or model/chat work between qualification and shutter.
        self.journal.once("capture", lambda: self.adapter.tap(
            "capture", before_dispatch=dispatch_guard))
        deadline = self.now() + 20
        terminal = None
        while self.now() < deadline:
            try:
                observed = self.adapter.observe(deadline=deadline)
            except ValueError as error:
                if str(error) not in {"OBSERVATION_DEADLINE", "HOST_ADB_CLIENT_TIMEOUT_PHONE_DRAIN_UNKNOWN"}:
                    raise
                break
            self.binding.check(observed)
            m = observed["marker"]
            if m.get("phase") in ("PUBLISHED", "REFUSED") and m.get("idle") is True and m.get("busy") is False:
                require(m.get("published") is (m["phase"] == "PUBLISHED"), "TERMINAL_PUBLICATION_BINDING")
                terminal = observed
                break
            require(m.get("phase") in ("IDLE", "CAPTURING"), "NATIVE_OUTCOME_UNKNOWN")
            self.pause(min(0.25, max(0, deadline - self.now())))
        if terminal is None:
            # An unconfirmed screenshot is preserved once, never promoted to a pass.
            observed = self.adapter.observe()
            self.binding.check(observed)
            self.screenshot("post", observed)
            self.journal.save("outcome", {"status": "UNCONFIRMED", "reason": "TERMINAL_NOT_OBSERVED_IN_20_SECONDS", "noReplay": True})
            return "UNCONFIRMED"
        self.screenshot("post", terminal)  # No status scrolling/memory/export before this fsync.
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
