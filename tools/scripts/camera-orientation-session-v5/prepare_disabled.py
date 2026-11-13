"""Offline preparation only. Creates no execution directory, lease or device client."""
from pathlib import Path
import controller_v5 as c
import main_session as m


def main():
    c.require(not m.PREP.exists(), 'PREPARATION_ALREADY_EXISTS')
    c.require(c.load(m.STATE, 1024 * 1024)['lease'] is None, 'OTHER_OWNER_ACTIVE')
    runs = m.RUNS
    trees = [
        str(m.PARENT.relative_to(m.ROOT)),
        'tools/scripts/camera-orientation-evidence',
        'tools/scripts/camera-orientation-evidence-v2',
        'tools/scripts/camera-orientation-evidence-v3',
        'tools/scripts/camera-orientation-evidence-v4',
        str((runs / 'p203-main-host-wait-20261027-a1').relative_to(m.ROOT)),
        str((m.PARENT / 'M00-A000/main-continuation-c1').relative_to(m.ROOT)),
        str((runs / 'p203-evidence-device-execution-20261026-a1').relative_to(m.ROOT)),
        str((runs / 'p203-readiness-device-preparation-20261027-a1').relative_to(m.ROOT)),
        str((runs / 'p203-readiness-packet-review-20261027-a1').relative_to(m.ROOT)),
    ]
    files = list((m.PARENT / 'M00-A000').glob('*'))
    files += [m.PARENT / 'received-fixture.zip', m.APPROVAL, c.v4.PUMP,
        runs / 'p203-readiness-build-20261027-a1/recognition-camera-orientation-release.apk']
    manifest = dict(trees={Path(p).as_posix(): m.hashes(m.ROOT / p) for p in trees},
        files={p.relative_to(m.ROOT).as_posix(): c.digest(p.read_bytes()) for p in files if p.is_file()},
        accounting=dict(hostCaptureCommands=1, screenshotAttempts=2,
            futureHostCaptureMaximum=8, futureScreenshotMaximum=16,
            cumulativeHostCaptureMaximum=9, cumulativeScreenshotMaximum=18, refund=0),
        accountingEvidence=dict(
            refusedOriginal='p203-evidence-device-execution-20261026-a1/M00-A000/guard-failure.json',
            dispatchedR2='p203-evidence-device-execution-20261026-a1/M00-A000-host-r2/capture-done.json',
            note='Two original Capture intents stay consumed; first refused before input, second dispatched. Two pre intents, no posts. No native-count refund.'))
    refusal = c.load(runs / manifest['accountingEvidence']['refusedOriginal'])
    c.require(refusal['actualShutterDispatch'] is False and refusal['hostIntentConsumed'] is True, 'ORIGINAL_REFUSAL_PROOF')
    prior = runs / 'p203-evidence-device-execution-20261026-a1'
    c.require(len(list(prior.rglob('pre-intent.json'))) == 2
        and len(list(prior.rglob('post-intent.json'))) == 0
        and len(list(prior.rglob('capture-intent.json'))) == 2
        and len(list(prior.rglob('capture-done.json'))) == 1, 'PRIOR_EFFECT_LEDGER_CHANGED')
    c.require(c.digest((m.PARENT / 'received-fixture.zip').read_bytes()) ==
        'b9991e85b14ecd87f868bfa888e59178830f366c84fd4b20c0963fa9e70b5ff8', 'GENERATED_EXPORT_CHANGED')
    m.verify_predecessors(manifest)
    m.PREP.mkdir()
    c.v4.exclusive(m.PREP / 'predecessors.json', c.canonical(manifest))
    packet = m.approved_packet()
    c.v4.exclusive(m.PREP / 'packet-M00-v5.disabled.json', c.canonical(packet))
    charter = dict(executionApproved=False, executionDir=str(m.OUTPUT),
        packetSha256=c.digest(c.canonical(packet)), reviewSha256=None,
        budgetAmendment=c.load(m.APPROVAL)['budgetAmendment'], lease=None, transport=None,
        readyMonotonic=None, readyUtc=None, freshReadyMustBeEnteredInRunner=True)
    c.v4.exclusive(m.PREP / 'capture-charter.disabled.json', c.canonical(charter))
    print('DISABLED_SUCCESSOR_PREPARED: ' + str(m.PREP))


if __name__ == '__main__': main()
