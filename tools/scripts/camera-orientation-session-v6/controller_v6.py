"""One bounded host session. Importing this module never contacts a device.

Only the pinned V4 transport/parser is reused. V1-V4 remain immutable evidence.
READY is a live monotonic timestamp in this process, never a resumable token.
"""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import importlib.util
import math
import re
import sys
import time
import uuid

ROOT = Path(__file__).resolve().parents[3]
V4 = ROOT / 'tools/scripts/camera-orientation-session-v6/base_v6.py'
import hashlib
assert hashlib.sha256(V4.read_bytes()).hexdigest() == '3fc48324205c0631c55da06dca983f541390e7bb7cb2444306fb19eb6075c2ad', 'PINNED_V6_BASE_CHANGED'
spec = importlib.util.spec_from_file_location('p203_preview_v3_base', V4)
v4 = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = v4
spec.loader.exec_module(v4)
require, canonical, digest, load = v4.require, v4.canonical, v4.digest, v4.load
PROTOCOL = 'FRESH_PREVIEW_EPOCH_OBSERVED_SESSION_V6'


def code(error):
    value = str(error)
    return value if re.fullmatch(r'[A-Z][A-Z0-9_]{0,119}', value) else type(error).__name__.upper()


class PinnedAdb(v4.PinnedAdb):
    """Same fixed commands and transport, with one deadline for multi-command calls.

    Hooks run before the real input subprocess (not after successful completion).
    Their durable receipts distinguish consumed intent from dispatched/unknown.
    """
    def __init__(self, *args):
        self.operation_deadline = None
        self.on_input = lambda action: None
        self.on_completion = lambda action: None
        self.on_observation = lambda state: None
        self.on_observation_failure = lambda error: None
        self.action = None
        super().__init__(*args)

    def _run(self, args, cap=131072, deadline=None):
        bounds = [d for d in (deadline, self.operation_deadline) if d is not None]
        deadline = min(bounds) if bounds else None
        require(deadline is not None and time.monotonic() < deadline, 'OBSERVATION_DEADLINE')
        is_input = args[:3] == ['shell', 'input', 'tap']
        if is_input:
            self.on_input(self.action)
        value = super()._run(args, cap, deadline)
        require(time.monotonic() < deadline, 'OBSERVATION_DEADLINE')
        if is_input:
            self.on_completion(self.action)
        return value

    def preflight(self, deadline):
        self.operation_deadline = deadline
        try:
            return super().preflight()
        finally:
            self.operation_deadline = None

    def observe(self, deadline=None):
        try:
            state = super().observe(deadline)
            self.on_observation(state)
            return state
        except Exception as error:
            self.on_observation_failure(error)
            raise

    def _parallel(self, *operations):
        # Only independent read commands run here. Wait for every bounded
        # subprocess even when one refuses; never leave background host work.
        with ThreadPoolExecutor(max_workers=len(operations)) as executor:
            pending = [executor.submit(operation) for operation in operations]
            results, errors = [], []
            for future in pending:
                try:
                    results.append(future.result())
                except BaseException as error:
                    errors.append(error)
            if errors:
                raise errors[0]
            return results

    def _same_pid(self, deadline):
        pid = self._run(['shell', 'pidof', v4.PKG], 4096, deadline).decode().strip()
        require(self.pid is not None and pid == self.pid, 'OWN_PROCESS_CHANGED_OR_EXITED')

    def _capture_observation(self, deadline):
        # PID, focus and a bounded XML dump do not depend on one another. The
        # XML is not read/parsed/recorded unless all three complete successfully.
        # After the dump, read it alongside NEW focus and PID checks. These
        # replace the former serial final-focus call and add a final PID check.
        try:
            self._parallel(
                lambda: self._same_pid(deadline),
                lambda: self._own_focus(deadline),
                lambda: self._run(['shell', 'uiautomator', 'dump', self.UI], 8192, deadline))
            raw, _, _ = self._parallel(
                lambda: self._run(['exec-out', 'cat', self.UI], 131072, deadline),
                lambda: self._same_pid(deadline),
                lambda: self._own_focus(deadline))
            require(b'<!DOCTYPE' not in raw and b'<!ENTITY' not in raw, 'UI_XML_DECLARATION_REFUSED')
            tree = v4.ET.fromstring(raw)
            marker = v4.marker_from_tree(tree)
            boxes = [n.get('bounds') for n in tree.iter('node') if n.get('package') == v4.PKG
                and n.get('resource-id', '').split('/')[-1] == 'orientation-viewport']
            require(len(boxes) == 1, 'ONE_PHYSICAL_VIEWPORT')
            match = re.fullmatch(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]', boxes[0])
            require(match is not None, 'VIEWPORT_BOUNDS')
            left, top, right, bottom = map(int, match.groups())
            require(0 <= left < right <= self.packet['displayPixels'][0]
                    and 0 <= top < bottom <= self.packet['displayPixels'][1], 'VIEWPORT_DISPLAY_BOUND')
            self.tree = tree
            state = dict(marker=marker, viewport=dict(left=left, top=top, right=right, bottom=bottom),
                         captureControlEnabled=self.capture_control_enabled(tree))
            self.on_observation(state)  # Persist before the dispatch guard.
            return state
        except Exception as error:
            self.on_observation_failure(error)
            raise

    def _capture_point(self):
        parents = {child: parent for parent in self.tree.iter() for child in parent}
        points = set()
        for node in self.tree.iter('node'):
            if node.get('package') != v4.PKG or node.get('text') != v4.LABELS['capture']:
                continue
            while node is not None and node.get('clickable') != 'true':
                node = parents.get(node)
            if node is None or node.get('package') != v4.PKG or node.get('enabled') != 'true':
                continue
            match = re.fullmatch(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]', node.get('bounds', ''))
            require(match is not None, 'OWN_CONTROL_BOUNDS')
            left, top, right, bottom = map(int, match.groups())
            require(0 <= left < right <= self.packet['displayPixels'][0]
                    and 0 <= top < bottom <= self.packet['displayPixels'][1], 'VISIBLE_OWN_CONTROL')
            points.add(((left + right) // 2, (top + bottom) // 2))
        require(len(points) == 1, 'ONE_ENABLED_OWN_CONTROL')
        return next(iter(points))

    def tap(self, action, before_dispatch=None, deadline=None):
        self.action = action
        try:
            if action == 'capture':
                require(before_dispatch is not None, 'CAPTURE_GUARD_REQUIRED')
                observed = self._capture_observation(deadline)
                x, y = self._capture_point()
                before_dispatch(observed)
                # _run revalidates the current host lease and remaining absolute
                # deadline immediately before input. Native admission remains
                # final authority for any change after the last UI observation.
                output = self._run(['shell', 'input', 'tap', str(x), str(y)], 8192, deadline)
                return dict(clientSettled=True, responseSha256=digest(output), nativeOutcomeNeedsObservation=True)
            return super().tap('close' if action == 'setup-close' else action, before_dispatch, deadline)
        finally:
            self.action = None

    def screenshot(self, deadline):
        # The image command depends on both current identity checks; the checks
        # themselves can overlap. Never acquire pixels after a failed check.
        self._parallel(lambda: self._same_pid(deadline), lambda: self._own_focus(deadline))
        return self._run(['exec-out', 'screencap', '-p'], 4 * 1024 * 1024, deadline)


class Session:
    """PREPARED -> READY -> CLOSE? -> RESTORE -> INSPECT -> ACK -> PRE -> ...

    The runner owns this instance across visual qualification. No second READY,
    state adoption, effect retry, preview restore in the tail, or auto qualification.
    """
    def __init__(self, adapter, packet, output, now=time.monotonic, pause=time.sleep):
        self.adapter, self.packet, self.now, self.pause = adapter, packet, now, pause
        self.journal = v4.Journal(output, now)
        self.clock_instance = str(uuid.uuid4())
        self.phase, self.last, self.observation_error = 'PREPARED', None, None
        self.observations = 0
        self.observation_failures = 0
        self.binding = self.initial = self.pre = self.readiness = None
        self.ready = self.restored = None
        self.finalized = self.started = False
        self.terminal = None
        self.failure_observation = None
        self.terminal_deadline = None
        adapter.on_observation = self.record
        adapter.on_observation_failure = self.failed_observation
        adapter.on_input = self.input_intent
        adapter.on_completion = self.input_done

    def transition(self, phase):
        self.phase = phase
        self.journal.save('phase-' + phase.replace('_', '-'), dict(monotonic=self.now()))

    def record(self, state):
        # Round-trip isolates mutable adapter data. Strict field/type validation
        # follows the durable snapshot so a failed guard retains its exact input.
        raw = canonical(state)
        require(len(raw) <= 8192, 'OBSERVATION_CAP')
        require(set(state) == {'marker', 'viewport', 'captureControlEnabled'}
                and isinstance(state['marker'], dict) and isinstance(state['viewport'], dict), 'TYPED_OBSERVATION_REQUIRED')
        allowed = {'version', 'run', 'phase', 'caseId', 'jobId', 'source', 'apk', 'process', 'lifecycle',
            'viewGeneration', 'layout', 'previewMounted', 'busy', 'idle', 'nonce', 'published',
            'captureError', 'inspectionError', 'geometryReady', 'generatedExportVerified', 'firstExportVerified'}
        require(set(state['marker']) <= allowed and set(state['viewport']) == {'left', 'top', 'right', 'bottom'},
                'OWN_METADATA_FIELDS_ONLY')
        for key, value in state['marker'].items():
            if key in ('captureError', 'inspectionError') and value is not None:
                require(isinstance(value, dict) and set(value) <= {'code','stage','caseId','jobId','process','lifecycle','viewGeneration'}
                    and all(v is None or type(v) in (int, bool) or isinstance(v, str) and len(v) <= 160 for v in value.values()),
                    'TYPED_ERROR_METADATA_REQUIRED')
            else:
                require(value is None or type(value) in (bool, int) or isinstance(value, str) and len(value) <= 160,
                        'TYPED_MARKER_METADATA_REQUIRED')
        require(self.observations < 256, 'OBSERVATION_COUNT_CAP')
        state = v4.json.loads(raw)
        self.journal.save('observation-%03d' % self.observations,
                          dict(phase=self.phase, monotonic=self.now(), state=state))
        self.observations += 1
        self.last = state

    def failed_observation(self, error):
        if self.observation_error is not None:
            return  # Keep the first unavailable observation; never replace it.
        self.observation_error = dict(code=code(error), phase=self.phase, monotonic=self.now())
        self.journal.save('observation-error', self.observation_error)

    def observe(self, deadline):
        require(self.now() < deadline, 'OBSERVATION_DEADLINE')
        try:
            state = self.adapter.observe(deadline=deadline)
        except Exception as error:
            self.failed_observation(error)
            raise
        require(self.now() < deadline, 'OBSERVATION_DEADLINE')
        return state

    def input_intent(self, action):
        self.journal.save(action + '-dispatch', dict(monotonic=self.now(), outcome='DISPATCHED_OR_UNKNOWN'))

    def input_done(self, action):
        self.journal.save(action + '-completion', dict(monotonic=self.now(), clientSettled=True,
                                                       nativeAdmissionProven=False))

    def effect(self, action, guard, deadline):
        require(self.now() < deadline, 'OBSERVATION_DEADLINE')
        return self.journal.once(action, lambda: self.adapter.tap(action, before_dispatch=guard, deadline=deadline))

    def human(self):
        require(self.ready is not None and 0 <= self.now() - self.ready < 120, 'NO_LATE_SHUTTER')

    def identity(self, state):
        m = state['marker']
        require(type(m.get('version')) is int and m['version'] == 1 and m.get('run') == self.packet['run']
                and m.get('run') == v4.RUN and m.get('caseId') == self.packet['case']
                and m.get('jobId') == self.packet['job'] and m.get('source') == self.packet['source']
                and m.get('apk') == self.packet['apk'], 'SETUP_ROW_OR_ARTIFACT_CHANGED')
        require(v4.valid_uuid(m.get('process')) and type(m.get('lifecycle')) is int
                and m['lifecycle'] >= 0 and type(m.get('viewGeneration')) is int
                and m['viewGeneration'] > 0, 'SETUP_PROVENANCE_REQUIRED')
        require(m.get('layout') == ('A' if self.packet['case'] in v4.CASES[:4] else 'B')
                and state['viewport'] == self.packet['expectedViewport'], 'SETUP_LAYOUT_OR_VIEWPORT_CHANGED')
        if self.initial is not None:
            require(all(m.get(k) == self.initial['marker'].get(k) for k in ('process', 'lifecycle', 'layout')),
                    'SETUP_PROCESS_OR_LIFECYCLE_CHANGED')
        require(m.get('generatedExportVerified') is True and
                (self.packet['case'] == v4.CASES[0] or m.get('firstExportVerified') is True), 'CURRENT_EXPORT_GATES_REQUIRED')
        require(type(m.get('previewMounted')) is bool and type(m.get('geometryReady')) is bool
                and type(m.get('busy')) is bool and type(state.get('captureControlEnabled')) is bool,
                'TYPED_SETUP_STATE_REQUIRED')

    def idle(self, state, generation=None, mounted=None):
        self.identity(state)
        m = state['marker']
        require(m.get('phase') == 'IDLE' and m.get('idle') is True and m.get('busy') is False
                and m.get('published') is None and m.get('captureError') is None
                and m.get('inspectionError') is None, 'SETUP_NOT_ELIGIBLE_IDLE')
        if generation is not None:
            require(m['viewGeneration'] == generation, 'UNEXPECTED_VIEW_GENERATION')
        if mounted is not None:
            require(m['previewMounted'] is mounted, 'UNEXPECTED_PREVIEW_STATE')

    def wait(self, complete, deadline, maximum=32):
        for _ in range(maximum):
            state = self.observe(deadline)
            if complete(state):
                return state
            self.pause(min(.25, max(0, deadline - self.now())))
        raise ValueError(self.phase + '_COMPLETION_NOT_OBSERVED')

    def prepare(self, ready):
        try:
            require(not self.started and not self.finalized, 'SESSION_NO_REPLAY')
            # Set only after exclusive consumption; a collision cannot adopt or
            # overwrite any prior session's final receipt.
            self.journal.save('session-intent', dict(packetSha256=digest(canonical(self.packet)),
                clockInstance=self.clock_instance, monotonic=self.now(), noReplay=True))
            self.started = True
            require(type(ready) in (int, float) and math.isfinite(ready), 'FRESH_READY_REQUIRED')
            self.ready = ready
            self.human()
            self.transition('READY')
            deadline = ready + 120
            self.adapter.preflight(deadline=deadline)
            state = self.observe(deadline)  # Saved before the very first field guard.
            self.human()
            self.idle(state)
            self.initial = state
            old = state['marker']['viewGeneration']
            if state['marker']['previewMounted']:
                self.transition('SETUP_CLOSE')
                self.effect('setup-close', lambda s: self.idle(s, old, True), deadline)
                def unmounted(s):
                    self.idle(s)
                    m = s['marker']
                    if m['previewMounted']:
                        require(m['viewGeneration'] == old, 'UNEXPECTED_VIEW_GENERATION')
                        return False
                    require(m['viewGeneration'] == old + 1 and m['geometryReady'] is False,
                            'UNEXPECTED_CLOSE_EPOCH')
                    return True
                state = self.wait(unmounted, deadline)
            else:
                require(state['marker']['geometryReady'] is False, 'UNMOUNTED_GEOMETRY_CONFLICT')
            closed = state['marker']['viewGeneration']
            self.transition('RESTORE')
            self.effect('restore', lambda s: self.idle(s, closed, False), deadline)
            def mounted(s):
                self.idle(s)
                m = s['marker']
                if not m['previewMounted']:
                    require(m['viewGeneration'] == closed, 'UNEXPECTED_VIEW_GENERATION')
                    return False
                require(m['viewGeneration'] == closed + 1, 'UNEXPECTED_RESTORE_EPOCH')
                require(m.get('nonce') is None and s['captureControlEnabled'] is False,
                        'RESTORE_DID_NOT_CLEAR_READINESS')
                return m['geometryReady']
            state = self.wait(mounted, deadline)
            self.restored = self.now()
            self.journal.save('preview-epoch', dict(oldGeneration=old, closedGeneration=closed,
                restoredGeneration=state['marker']['viewGeneration'], ready=self.ready,
                geometryObserved=self.restored, binding=state))
            frozen = state['marker']['viewGeneration']
            self.transition('INSPECT')
            issued = self.now()
            self.effect('inspect', lambda s: self.idle(s, frozen, True), deadline)
            def inspected(s):
                self.identity(s)
                m = s['marker']
                require(m['viewGeneration'] == frozen and m['previewMounted'] is True
                        and m['geometryReady'] is True and m.get('phase') == 'IDLE'
                        and m.get('idle') is True, 'INSPECT_FROZEN_VIEW_CHANGED')
                if m['busy'] or m.get('nonce') is None:
                    return False
                require(v4.valid_uuid(m.get('nonce')) and m['nonce'] != state['marker'].get('nonce'),
                        'FRESH_NATIVE_NONCE_REQUIRED')
                self.idle(s, frozen, True)
                return True
            state = self.wait(inspected, min(deadline, issued + 120))
            self.binding = v4.Binding.from_snapshot(state, self.packet)
            self.readiness = dict(ready=ready, issuedStart=issued, observedEnd=self.now(),
                clockInstance=self.clock_instance, packetSha256=digest(canonical(self.packet)))
            self.journal.save('native-readiness', dict(self.readiness, binding=self.binding.__dict__))
            self.transition('ACK')
            self.effect('ack', self.fresh, self.capture_deadline())
            state = self.wait(lambda s: self.fresh(s) or s['captureControlEnabled'], self.capture_deadline())
            self.transition('SETTLE')
            # Settle BEFORE pre acquisition/qualification, preserving its 30s.
            settle = max(ready + 15, self.restored + 15)
            self.pause(max(0, settle - self.now()))
            self.human()
            state = self.observe(self.capture_deadline())
            self.fresh(state)
            require(state['captureControlEnabled'] is True, 'CAPTURE_CONTROL_DISABLED')
            self.transition('PRE')
            self.pre = self.screenshot('pre', state, self.capture_deadline())
            self.transition('QUALIFY')
            return self.pre
        except BaseException as error:
            self.finalize(error)
            raise

    def capture_deadline(self):
        bounds = [self.ready + 120]
        if self.readiness:
            bounds.append(self.readiness['issuedStart'] + 120)
        if self.pre:
            bounds.append(self.pre['monotonic'] + 30)
        return min(bounds)

    def fresh(self, state):
        self.human()
        require(self.readiness and self.readiness['clockInstance'] == self.clock_instance
                and self.readiness['ready'] == self.ready
                and self.readiness['packetSha256'] == digest(canonical(self.packet))
                and 0 <= self.now() - self.readiness['issuedStart'] < 120, 'NATIVE_READINESS_STALE')
        self.binding.check(state)
        self.idle(state, self.binding.generation, True)
        require(state['marker'].get('nonce') == self.binding.nonce
                and state['marker']['geometryReady'] is True, 'PRE_DISPATCH_NONCE_OR_STATE_CHANGED')

    def screenshot(self, name, state, deadline):
        require(name in ('pre', 'post'), 'FIXED_SCREENSHOT_NAME')
        require(self.now() < deadline, 'SCREENSHOT_DEADLINE')
        require(len(list(self.journal.path.glob('*-image-intent.json'))) < 2, 'ROW_SCREENSHOT_CAP')
        def acquire():
            started = self.now()
            data = self.adapter.screenshot(deadline=deadline)
            require(self.now() < deadline, 'SCREENSHOT_DEADLINE')
            require(v4.png_dimensions(data) == tuple(self.packet['displayPixels']), 'PNG_DISPLAY_SIZE')
            v4.exclusive(self.journal.path / (name + '.png'), data)
            proof = dict(sha256=digest(data), bytes=len(data), viewport=state['viewport'],
                marker=state['marker'], monotonic=started, savedMonotonic=self.now())
            self.journal.save(name, proof)
            return proof
        return self.journal.once(name + '-image', acquire)

    def run(self, qualified_pre_sha):
        try:
            require(self.started and not self.finalized and self.phase == 'QUALIFY', 'SESSION_NO_REPLAY')
            require(self.pre is not None and qualified_pre_sha == self.pre['sha256'], 'PRE_SCENE_NOT_QUALIFIED')
            self.transition('CAPTURE')
            def guard(state):
                self.fresh(state)
                require(0 <= self.now() - self.pre['monotonic'] < 30, 'PRE_SCENE_STALE')
                require(self.now() >= max(self.ready + 15, self.restored + 15), 'POSITIONING_INTERVAL_REQUIRED')
                require(state['captureControlEnabled'] is True, 'CAPTURE_CONTROL_DISABLED')
            self.effect('capture', guard, self.capture_deadline())
            self.transition('TERMINAL')
            deadline = self.now() + 20
            self.terminal_deadline = deadline
            def terminal(s):
                self.binding.check(s)
                m = s['marker']
                require(type(m.get('idle')) is bool and type(m.get('busy')) is bool, 'TYPED_TERMINAL_REQUIRED')
                if m.get('phase') in ('PUBLISHED', 'REFUSED') and m['idle'] and not m['busy']:
                    require(m.get('published') is (m['phase'] == 'PUBLISHED'), 'TERMINAL_PUBLICATION_BINDING')
                    self.terminal = m['phase']
                    return True
                return m.get('phase') == 'UNKNOWN'
            state = self.wait(terminal, deadline, maximum=80)
            self.transition('POST')
            self.binding.check(state)
            # Terminal observation AND post acquisition fit inside 20 seconds;
            # unknown diagnostics use the same bound and never close preview.
            self.screenshot('post', state, deadline)
            if self.terminal is None:
                self.finalize(reason='NATIVE_OUTCOME_UNKNOWN')
                return 'UNCONFIRMED'
            self.transition('SETTLED_CLOSE')
            close_deadline = self.now() + 10
            def close_guard(s):
                self.binding.check(s)
                m = s['marker']
                require(m.get('phase') == self.terminal and m.get('idle') is True and m.get('busy') is False
                        and m.get('published') is (self.terminal == 'PUBLISHED'), 'CLOSE_NOT_SETTLED')
            self.effect('close', close_guard, close_deadline)
            def closed(s):
                m = s['marker']
                require(all(m.get(k) == getattr(self.binding, attr) for k, attr in
                    [('process', 'process'), ('lifecycle', 'lifecycle'), ('source', 'source'),
                     ('apk', 'apk'), ('caseId', 'case'), ('jobId', 'job'), ('layout', 'layout')])
                    and m.get('run') == v4.RUN and s['viewport'] == self.binding.viewport, 'CLOSE_BINDING_CHANGED')
                require(m.get('phase') == self.terminal and m.get('idle') is True and m.get('busy') is False,
                        'CLOSE_NOT_SETTLED')
                if m.get('previewMounted') is False:
                    require(m.get('viewGeneration') == self.binding.generation + 1, 'CLOSE_EPOCH_CHANGED')
                    return True
                require(m.get('viewGeneration') == self.binding.generation, 'CLOSE_EPOCH_CHANGED')
                return False
            self.wait(closed, close_deadline, maximum=40)
            self.transition('COMPLETE')
            self.finalize()
            return self.terminal
        except BaseException as error:
            # Never replace an unavailable/failing observation by a later one.
            # A safe matching last observation can support one diagnostic post.
            self.failure_observation = self.last
            if self.dispatched('capture') and not (self.journal.path / 'post-image-intent.json').exists():
                try:
                    if self.observation_error is None and self.last is not None:
                        deadline = self.terminal_deadline or self.now() + 20
                        if self.phase == 'CAPTURE':
                            self.observe(deadline)  # Dispatch uncertainty needs a current view.
                        self.binding.check(self.last)
                        self.screenshot('post', self.last, deadline)
                except Exception:
                    pass
            self.finalize(error)
            raise

    def dispatched(self, action):
        return (self.journal.path / (action + '-dispatch.json')).exists()

    def finalize(self, error=None, reason=None):
        if self.finalized or (not self.started and (self.journal.path / 'session-intent.json').exists()):
            return
        self.finalized = True
        captures = int(self.dispatched('capture'))
        status = ('NATIVE_TERMINAL' if self.terminal else 'DISPATCHED_UNKNOWN') if captures else (
            'SETUP_TIMEOUT' if error and ('DEADLINE' in code(error) or 'TIMEOUT' in code(error)
                or code(error) == 'NO_LATE_SHUTTER') else 'HOST_REFUSED')
        if self.phase == 'COMPLETE':
            status = 'NATIVE_TERMINAL'
        self.journal.save('session-result', dict(status=status, phase=self.phase,
            reason=reason or (code(error) if error else 'COMPLETE'), monotonic=self.now(),
            readyMonotonic=self.ready, restoredGeometryMonotonic=self.restored,
            lastObservation=self.last, lastObservationPrecededGuard=self.last is not None and self.observation_error is None,
            observationAtFailure=self.failure_observation or (self.last if error else None),
            observationFailure=self.observation_error, nativeTerminal=self.terminal,
            hostCaptureDispatches=captures, screenshotAttempts=len(list(self.journal.path.glob('*-image-intent.json'))),
            commandIntents=sorted(p.name for p in self.journal.path.glob('*-intent.json')),
            commandDispatches=sorted(p.name for p in self.journal.path.glob('*-dispatch.json')),
            commandCompletions=sorted(p.name for p in self.journal.path.glob('*-completion.json')),
            missingImages=[n for n in ('pre', 'post') if not (self.journal.path / (n + '-image-done.json')).exists()],
            noReplay=True, budgetRefund=0, leaseReleaseDoesNotCancelDevice=True,
            cameraProofAccepted=False, physicalDrainProven=False))
