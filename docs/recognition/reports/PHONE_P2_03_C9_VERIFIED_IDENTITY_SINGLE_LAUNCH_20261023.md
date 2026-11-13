# C9 verified installed identity — corrected single launch

2026-10-23. Main independently verified38 returned evidence files and STOP
83ee63be...a1cd. All11 read-only device commands succeeded, confirming exact C9
APK/UID10264/dataDir and same hardware/build. The actual post-install-verified.json
SHA is90b01aa39f1e3fbbd25b69c6deba778dc2c5989df8cd75cdeb9a9d6a56ff30af.
No launch intent exists. The main-authored packet erroneously wrote that same
exclusive receipt a second time after verify_wireless had already created it.
FileExistsError is a confirmed packet composition defect, not identity failure.
Original successful receipt and later error remain immutable.

Main High corrected ONLY the launch continuation under
apps/recognition-lab/runs/phone-experiment/c9-launch-continuation-review-20261023-a1/.
launch.py SHA6f632b86b9f42ac8c67bb2c3da136c28ced4ecc54b157d77682b02cebb6b1c1e.
Five fresh generated checks reproduce the original collision and verify corrected
one-launch flow, no replay, changed-UID refusal and locked-phone refusal. All
subprocesses mocked, zero real phone commands. No production/helper-cap/source/
APK change or fabricated update-complete receipt. Legacy device/operations/bundle
helpers remain byte-exact independently accepted versions.

Same Track B Sol6.1 Low: NEW ignored root
p2-camera-export-c9-single-launch-20261023-a1/writer/ under phone-experiment.
Copy exact accepted device.py/operations.py/bundle.py and real numerical/latest
wireless frozen inputs; fresh finite<=30minute lease/normal reviewed execution
charter. Copy reviewed launch.py exact SHA above; include its digest in charter
and verify it before execution. Copy the ACTUAL prior post-install-verified.json
from post-install-20261023-a1/writer as reviewed-post-install-identity.json; verify
exact90b01aa3...30af hash. No invented prior result. Preserve all prior roots.

Pinned Python -B executes ONLY this copied launch.py once. It checks prior
identity values, fresh real C9 installed identity/UID/dataDir, unlocked state,
one explicit app launch and actual native idle saved status (count6/owned=claimed
4356993/history/bindings/caps). It creates launch-complete only after those checks.
No post-install receipt rewrite, installation, update, reconnect/reset/unlock,
permission change, capture/model/decoder/export/picker/Save/transfer or retry.
Stop on first unexpected result, retain exclusive intents/receipts, releaselease,
STOP/direct handoff to main for actual-data audit before export readiness.

No chart/product positioning needed. Workflow byte JSON reads/ensure_ascii=True
UTF8 writes remain required. P2-04 plan preserved/implementation gated by P2-03;
P2-05 separate planning; CI deferred. No other source/build/Git work.
