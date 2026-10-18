# G4-A initial phone launch — blocked before capture

2026-10-18, Africa/Lagos. **FAILED AT APP STARTUP; camera test not completed.**
Founder selected Sol6.1Medium and confirmed phone/USB readiness. Main ran the
bounded initial packet directly; no implementation agent or code correction.

Fresh physical device SM-A156E (Galaxy A15), Android16/API36/arm64, non-emulator.
Prior test APK c7f04760381e7a3bedbff14084ec12b03c51229eb0e73660be0494a0d7afc48b
was copied/hash-verified into the task evidence root before update. Its process
was absent. `adb install -r --no-streaming` installed the accepted C3 APK without
uninstall, clearing data, downgrade or grant flags. Device base.apk hash matches
6097b9d59ceb44e0844af3b60d9c0d4a590ceb7206d54ea50dcba8b0604d0a99; UID10264
and data directory are retained. This is not a hash audit of every private file.

One explicit MainActivity launch returned Android Status:ok, COLD, TotalTime1622ms.
The app then exited before its permission/capture screen. Latest target-specific
ApplicationExitInfo records PID17573/reason4(APP CRASH(EXCEPTION)) at device local
2026-10-18 01:54:43.689. Matching crash-buffer block reports:

```text
com.facebook.react.common.JavascriptException:
Error: Cannot find native module 'ExpoAsset'
...
ExperimentRoot
```

No second launch, camera-permission request/grant, screenshot/photo capture or
camera-model chain was started. Final target pidof is empty. Radio settings were
not changed. Initial UI hierarchy did not contain the target app; it is not used
as evidence of a camera screen, and no unrelated app was interacted with.

The accepted C3 static/signature/alignment results remain historical facts; they
did not establish successful JavaScript-to-native startup closure. This physical
failure reopens that dependency/registration check. The exact import/call path,
minimal correction and any native-module/dependency consequences require High
investigation before implementation/rebuild/reinstall. Do not assume broad native
autolinking, new permissions, Asset/provider substitution or source changes are
approved by this result. No retry while the fault remains unresolved.

Evidence root:
`apps/recognition-lab/runs/phone-experiment/p2-camera-device-g4-20261018-a1/`.
Key receipts: preflight-summary.json, prior-installed-base.apk,
install-reviewed-c3.json, installed-c3-device-sha.json, installed-c3-summary.json,
open-isolated-camera-proof.json, target-exit-info.json, target-launch-crash.json.
The deterministic generated target-a2 and frozen manifest are ready; preparation
a1's reversed arrow was corrected before any physical capture. Preflight initially
compared adb's underscore model spelling with getprop's hyphen spelling; the
reader assertion was corrected, with raw receipts preserved. Neither preparation
issue is a consumed capture or an explanation of the ExpoAsset startup failure.

Counts: install/update1; app launch1; capture0; model calls0; automatic retries0.
G4/P2-03/P2 not passed; geometry INCONCLUSIVE and P2-04 held. Founder requested
High for diagnosis/correction, Medium for bounded execution: ask for that model
switch now. Phone can remain connected; no physical aiming/permission action is
needed while the saved startup evidence is investigated.
