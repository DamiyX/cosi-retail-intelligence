"""Disabled-by-default successor for the existing unfinished M00 allocation.

prepare_disabled.py is offline. This entry point needs a separate accepted review,
current coordinator lease and a READY typed into THIS running process after setup.
"""
from pathlib import Path
import json
import sys
import time
import controller_v6 as c

ROOT = c.ROOT
RUNS = ROOT / 'apps/recognition-lab/runs/phone-experiment'
PREP = RUNS / 'p203-preview-v3-source-20261027-a1'
PARENT = RUNS / 'p203-readiness-device-execution-20261027-a1'
OUTPUT = PARENT / 'M00-A000/preview-v3-v6'
HOLDER = '01a098ef-d830-7531-bca7-2d66b0a5b587'
APPROVAL = RUNS / 'p203-readiness-packet-review-20261027-a1/founder-amendment-approved.json'
STATE = ROOT / '.agents/workflows/recognition-track-b.json'
ORIGINAL = PREP / 'identity.json'


def hashes(root):
    c.require(root.is_dir() and not root.is_symlink(), 'EXISTING_PIN_ROOT_REQUIRED')
    result = {}
    for p in sorted(root.rglob('*')):
        c.require(not p.is_symlink(), 'PREDECESSOR_LINK_REFUSED')
        if p.is_file() and '__pycache__' not in p.parts:
            result[p.relative_to(ROOT).as_posix()] = c.digest(p.read_bytes())
    return result


def verify_predecessors(manifest):
    for folder, expected in manifest['trees'].items():
        c.require(hashes(ROOT / folder) == expected, 'PREDECESSOR_TREE_CHANGED')
    for name, sha in manifest['files'].items():
        p = ROOT / name
        c.require(not p.is_symlink() and c.digest(p.read_bytes()) == sha, 'PREDECESSOR_FILE_CHANGED')
    old = PARENT / 'M00-A000'
    for folder in (old, old / 'main-continuation-c1'):
        for name in ('ack-intent.json', 'capture-intent.json', 'pre-intent.json', 'post-intent.json', 'pre.png', 'post.png'):
            c.require(not (folder / name).exists(), 'PREDECESSOR_PHOTO_STAGE_CONSUMED')
    slot = c.load(old / 'row-slot-intent.json')
    c.require(slot['case'] == 'M00-A000' and slot['run'] == 'p203-orientation-20261027-readiness-v2' and slot['source'] == '3aeff06cadd724ddd7be4a8085613392fac8cde7c9cdf2a212d08351e5662b66' and slot['apk'] == '0055ef13bbd18d363ccc6a00c4cee97925e2cef45dbb5ac0ab8a5685584eaefa'
              and slot['hostInputMaximum'] == 1 and slot['screenshotMaximum'] == 2, 'ORIGINAL_ROW_ALLOWANCE')
    c.require((old / 'inspect-intent.json').is_file() and
              (old / 'main-continuation-c1/continuation-intent.json').is_file(), 'CONSUMED_PREDECESSORS_REQUIRED')
    c.require(manifest['accounting'] == dict(hostCaptureCommands=1, screenshotAttempts=2,
        futureHostCaptureMaximum=8, futureScreenshotMaximum=16,
        cumulativeHostCaptureMaximum=9, cumulativeScreenshotMaximum=18, refund=0), 'UNCHANGED_ALLOWANCE_REQUIRED')


def approved_packet(manifest_path=PREP / 'predecessors.json'):
    original = c.load(ORIGINAL)
    return dict(original, hostProtocol=c.PROTOCOL,
        hostCorrection='PREVIEW_V3_SOURCE_BINDING',
        previousDisabledPacketSha256=c.digest((RUNS / 'p203-session-control-v5-timing-c1-20261027-a1/packet-M00-v5.disabled.json').read_bytes()),
        controllerSha256=c.digest(Path(c.__file__).read_bytes()),
        sessionSha256=c.digest(Path(__file__).read_bytes()),
        predecessorSha256=c.digest(manifest_path.read_bytes()),
        expectedViewport=dict(left=45, top=418, right=653, bottom=722),
        predecessorSlot='M00-A000', predecessorContinuation='main-continuation-c1',
        newRowSlots=0, extraPhotoAllowance=0, extraScreenshotAllowance=0)


def guards(cfg, packet):
    c.require(cfg.get('executionApproved') is True, 'V6_NOT_ACTIVATED')
    c.require(isinstance(packet.get('apk'),str) and c.re.fullmatch(r'[a-f0-9]{64}',packet['apk']) and packet['apk'] != '0'*64,'REVIEWED_BUILT_APK_REQUIRED')
    c.require(packet == approved_packet() and cfg.get('packetSha256') == c.digest(c.canonical(packet)), 'EXACT_SUCCESSOR_PACKET_REQUIRED')
    review = c.load(PREP / 'accepted-review.json')
    c.require(review.get('accepted') is True and cfg.get('reviewSha256') == c.digest((PREP / 'accepted-review.json').read_bytes())
        and review.get('packetSha256') == cfg['packetSha256'], 'INDEPENDENT_ACCEPTED_REVIEW_REQUIRED')
    c.require(cfg.get('executionDir') == str(OUTPUT) and cfg.get('lease', {}).get('holder') == HOLDER,
              'FIXED_OWNER_AND_SUCCESSOR_DIRECTORY')
    c.require(c.load(STATE, 1024 * 1024)['lease'] == cfg['lease'], 'CURRENT_EXCLUSIVE_LEASE_REQUIRED')
    amendment = c.load(APPROVAL)['budgetAmendment']
    c.require(cfg.get('budgetAmendment') == amendment and amendment['amendmentApproved'] is True
              and amendment['proposedCumulative'] == dict(hostCaptureCommands=9, screenshotAttempts=18), 'UNCHANGED_FOUNDER_BUDGET_REQUIRED')
    verify_predecessors(c.load(PREP / 'predecessors.json', 1024 * 1024))
    c.require(not OUTPUT.exists(), 'SUCCESSOR_ALREADY_CONSUMED')


def release_lease(cfg):
    # Compare before release. Never steal/clear a different owner or claim drain.
    state = c.load(STATE, 1024 * 1024)
    if state['lease'] == cfg.get('lease'):
        state['lease'] = None
        STATE.write_bytes(c.canonical(state) + b'\n')


def execute(session, qualify):
    try:
        pre = session.prepare(session.now())
        # The caller must actually inspect the live pre.png, never infer framing.
        qualified = qualify(pre, session.capture_deadline())
        c.require(qualified == pre['sha256'], 'PRE_SCENE_NOT_QUALIFIED')
        return session.run(qualified)
    except BaseException as error:
        session.finalize(error)
        raise


def main():
    c.require(len(sys.argv) == 3, 'EXACT_PACKET_AND_CHARTER_REQUIRED')
    packet_path, charter_path = map(Path, sys.argv[1:])
    packet, cfg = c.load(packet_path), c.load(charter_path)
    try:
        guards(cfg, packet)  # Disabled packet refuses before constructing transport.
        OUTPUT.mkdir()  # Exclusive successor; any crash leaves the allocation consumed.
    except BaseException as error:
        # Pre-ownership refusal cannot write inside somebody else's consumed row.
        receipt = dict(status='HOST_REFUSED', phase='PREPARED', reason=c.code(error),
            hostCaptureDispatches=0, screenshotAttempts=0, noReplay=True, budgetRefund=0)
        refusal = PREP / ('host-refusal-' + str(c.uuid.uuid4()) + '.json')
        c.v4.exclusive(refusal, c.canonical(receipt))
        raise
    session = None
    try:
        c.v4.exclusive(OUTPUT / 'successor-intent.json', c.canonical(dict(packetSha256=cfg['packetSha256'],
            reusesExistingSlot=True, extraPhotoAllowance=0, extraScreenshotAllowance=0, noReplay=True)))
        adapter = c.PinnedAdb(packet_path, charter_path)
        session = c.Session(adapter, packet, OUTPUT)
        prepared_deadline = time.monotonic() + 120
        proof = adapter.preflight(deadline=prepared_deadline)
        session.journal.save('prepared-preflight', dict(monotonic=time.monotonic(), proof=proof))
        prepared = session.observe(prepared_deadline)
        session.idle(prepared)
        print('PREPARED. Position the supported phone and chart. After READY the preview may briefly close/reopen. Keep still for two minutes. Type READY only now; old READY is invalid.', flush=True)
        c.require(input().strip() == 'READY', 'FRESH_READY_REQUIRED')
        def qualify(pre, deadline):
            print(json.dumps(dict(status='PRE_REVIEW_REQUIRED', path=str(OUTPUT / 'pre.png'),
                sha256=pre['sha256'], deadlineMonotonic=deadline)), flush=True)
            decision = OUTPUT / 'pre-qualified.json'
            while not decision.exists() and time.monotonic() < deadline:
                time.sleep(min(.1, max(0, deadline - time.monotonic())))
            c.require(time.monotonic() < deadline and decision.is_file() and not decision.is_symlink(), 'NO_TIMELY_PRE_QUALIFICATION')
            q = c.load(decision, 8192)
            c.require(q.get('sceneQualified') is True and q.get('packetSha256') == cfg['packetSha256'], 'EXACT_VISUAL_QUALIFICATION_REQUIRED')
            return q.get('preSha256')
        print(json.dumps(dict(status=execute(session, qualify), cameraProofAccepted=False)), flush=True)
    except BaseException as error:
        if session:
            session.finalize(error)
        elif not (OUTPUT / 'session-result.json').exists():
            c.v4.exclusive(OUTPUT / 'session-result.json', c.canonical(dict(status='HOST_REFUSED', phase='PREPARED',
                reason=c.code(error), hostCaptureDispatches=0, screenshotAttempts=0, noReplay=True, budgetRefund=0)))
        raise
    finally:
        release_lease(cfg)


if __name__ == '__main__':
    main()
