# P1 C2 finite phone continuation

2026-10-14, Africa/Lagos. C2 source/exact APK independently accepted; execution
waits for founder Sol6.1 LOW response and selected-phone connection. This replaces
the original packet's APK/source and adds non-inference offline diagnostics.
All input/model/recipes, 80-inference/20-query limits and private-only constraints
remain. No actual device test is accepted by publishing this supplement.

## Fixed continuation and installation

Continue existing device run `p1-private-portability-device-20261013-a1`; create
new absent `offline-gate-c2-replacement` receipts beneath it. Preserve original
install/transfer/failure/diagnosis records. No new inference attempt context.

New APK SHA `c7f04760381e7a3bedbff14084ec12b03c51229eb0e73660be0494a0d7afc48b`,
38,915,609 bytes, source
`cf0fc3c71d475336b849aa4b3b90c382f9e65a2ea4e8124f37cc21de6bf5610d`.
Use exact writer-run candidate identified in C2 INDEPENDENT AUDIT; same signer/
package/version/min24/target36/arm64. Fresh scoped selected Galaxy A15/API36/arm64
and USB check; require currently installed old APK SHA d19a1181da0111f408b989f3c7222a889fe0a093f49d611185af255b3bd4511e.
One -r install (120 s), verify installed base.apk SHA; force-stop/relaunch only
isolated package. No uninstall/reset/ordinary app/phone-radio changes by tools.

Input already at `/sdcard/Download/cosi-p1-private-portability-c4-20261014-a1.zip`.
Require size131,901,810 and SHA059b6f93ee151b421123a9b18f6dafde7583e80da54abfaab96d5b3b18f2f92e.
Never list unrelated downloads/gallery or overwrite/retransfer without review.

## Diagnostic sequence before private work

Maximum eight total status checks; planned sequence is exactly three:

1. Founder confirms airplane ON, actual Wi-Fi/Bluetooth/cellular/tethering OFF.
   Capture scoped live evidence and select only `Check private offline gate`.
   Require eligible saved policy, modelCalls0/privateStateTouchedfalse, no import
   readiness or replay effect. Readiness alone does not authorize private work.
2. For one finite negative check, ask founder to turn Bluetooth ON manually while
   keeping airplane ON/Wi-Fi/cellular/tethering OFF. No private operation active.
   Read actual state and select status once; require refusal BLUETOOTH_ENABLED,
   zero model/store effects. Unexpected eligibility or unknown state means stop
   for HIGH review, not an inference probe or repeat until green.
3. Founder manually turns Bluetooth OFF again. Capture fresh actual OFF evidence,
   select status once, require eligibility. Keep phone offline. Do not repeat the
   ineffective airplane-mode toggle-order workaround.

No automation changes radios, launches network apps or clicks generated controls.
No private import/picker/decoder/model work occurs during these diagnostic steps.
Read-only observation does not prove an atomic OS barrier; preserve its limits.

## Remaining single private replay

After independent physical diagnostic acceptance, reuse exact input for one
reviewed local import (120 s) and record admitted40/hash. Obtain explicit fresh
human offline confirmation and toggle only the app's confirmation switch. Run
ONE private replay, max80 actual attempts across40 controls/40 phone records,
one worker/interpreter/thread, CPU-only/from-application, no NNAPI/GPU/XNNPACK.
1500 s batch and60 s per-frame lateness accounting, full80 rows/20 queries per
lane even on failure. No runtime or output-derived tuning/rerun.

Monitor saved policy and actual Wi-Fi disabled/Bluetooth service OFF/current
cellular service POWER_OFF/no default network/no tether upstream in finite read
windows<=3 s, gaps<=5 s. Telephony parsing must use current service-state blocks,
not any occurrence of POWER_OFF in historical logs; retain no identifiers/raw
dumps. Bind initial native status/source/device and time each current observation;
do not query the native diagnostic during busy replay. Unknown/drift/timeout/USB
loss: request private cancellation once, keep offline and observe owned drain
within120 s. Do not force-kill a running inference or claim native preemption.
Retain all incomplete evidence and return HIGH if closure is uncertain.

Observe saved numerical receipt/hash/bytes/counts. One isolated force-stop/restart,
explicit private recovery must return same input/result hashes/counts without
new replay. ONE numerical export to an observed new absent local Downloads
`private-portability-ID.zip` (120 s), <=48MiB/zero JPEGs. Scope transfer to that
exact selected file, match SHA/bytes, then unchanged comparator into a NEW output.
Comparator must enforce new cf0fc3c7... source, exact input/model/manifest/options,
80 records/ten candidates/20 queries and original fixed parity tolerances.

No host recovery/launcher retry, generated mode, extra snapshots/private-image
preview/export, arbitrary documents, installs/dependencies/cloud/Git changes.
Recognition scores and hardware/lifecycle/parity/memory/timing remain pending
until real results and independent comparison. Founder stays available for manual
radio/USB/picker/offline confirmations; restore settings only after owned-work
completion and explicit procedure, not a timer.
