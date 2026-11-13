# C9 A3 receipt audit and post-install disposition

2026-10-23. Main High independently rehashed all99 A3 evidence files and STOP
d87c56b8...db567. Actual command receipt has hostReturnCode0, host pipe readers
false, stdout exactly Performing Push Install / Success, and only stderr is the
exact reviewed APK transfer report (one pushed, zero skipped,39944042bytes).
Empty-stderr host guard raised ADB_STDERR_UNEXPECTED before the post-install
identity checks. This is a confirmed overly strict host receipt classification;
it is not proof of Android install failure or proof of preserved data.

No reinstall permitted. Original failed/uncertain receipt and single install
intent remain immutable. There is no launch intent. Main authorizes this NEW
bounded disposition for same Track B Sol6.1 Low, using exact accepted helpers
without changing their stderr guard. No further installation is needed to
resolve the actual state. Residual guard behavior is recorded for future tool
maintenance, not a reason to retry this successful-looking install.

NEW ignored root: p2-camera-export-c9-post-install-20261023-a1/writer/ under
apps/recognition-lab/runs/phone-experiment/. Copy accepted device.py/operations.py/
bundle.py and real frozen inputs; fresh finite lease<=30minutes and exact helper/
input hashes in the same reviewed C9 execution charter. Use latest verified
founder wireless config, no reconnect. Read JSON bytes, serialize workflow
ensure_ascii=True with explicit UTF-8. Preserve every old root and source.

Phase 1, pinned Python -B, exact accepted primitives only:

    import device as d
    d.begin_window(120); d.ready()
    d.put('post-install-intent', {'basis':'MAIN_AUDITED_A3_SUCCESS_WITH_TRANSFER_PROGRESS','installActionsThisRun':0})
    d.verify_wireless('post-install', d.APK_SHA)
    d.put('post-install-verified', {'apkSha256':d.APK_SHA,'uid':10264,'dataDir':'/data/user/0/'+d.PKG,'installActionsThisRun':0})

This freshly verifies selected same phone/fingerprint, actual installed exact C9
hash and existing UID/dataDir read-only. Failure STOPS without launch/update or
repair. It cannot claim saved native accounting before the app reports it.

ONLY IF phase1 succeeds: main conditionally authorizes ONE owning-app launch
using a separate pinned Python -B process, no fabricated update-complete receipt:

    import device as d, operations as o
    o.phase('launch'); o.read('post-install-verified')
    d.verify_wireless('launch-before', d.APK_SHA); d.unlocked('launch-before')
    result=d.execute('launch-single',['shell','am','start','-W','-n',d.PKG+'/.MainActivity'],timeout=30,effect=d.Effect('launch'))
    d.require('Status: ok' in result and not o.re.search(r'Error:|Exception',result),'LAUNCH_NOT_SUCCESS')
    saved=o.status('launch-after')
    d.put('launch-complete',dict(savedStatus=saved,launchActions=1,apkSha256=d.APK_SHA,installActionsThisRun=0,postInstallDisposition=True))

Exact helper status checks retain count6/owned=claimed4356993, idle/native owner,
history, model/recipe and conservative storage caps. New owning app status is
actual evidence, not inferred from APK identity. No generic update script,
update/install command or reset, second launch, automatic reconnect, unlock,
pair/radio/permission change, camera permit/capture/model/decoder/export/picker/
Save/transfer, source/helper correction, Git/CI or P2-04/05 action. Stop on first
unexpected output; no replay after failed/unknown intent. Publish actual status
and limits, release lease, STOP/direct handoff to main before export readiness.
No photograph or physical positioning needed. Source/P2-04 plan preserved;
remaining P2-03 image/geometry gate and deferred CI remain open.
