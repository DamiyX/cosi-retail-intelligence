# P2-03 recovery S2 — BLOCKED offline build handoff

2026-10-24. Track B writer01a1051f-0777-7573-ad09-0e550a4bd56a to coordinator
01a098ef-d830-7531-bca7-2d66b0a5b587. Same C:/Users/doyew/Documents/DEV 2/COSI-m8-planning,
branch plan/m8-unified-scanner. **BLOCKED: no APK was produced.** The single
approved offline release attempt failed during dependency resolution, before
recovery Java/Kotlin/native compilation, packaging, signing or artifact checks.
No source/dependency correction or second attempt was made. Writer STOP/lease
release are recorded in the evidence root's writer-stopped.json.

Evidence root: apps/recognition-lab/runs/phone-experiment/p203-export-recovery-build-20261024-a1/.
New private stage: C:/Users/doyew/.cache/cosi-p203-export-recovery-build-20261024-a1.
Prior staging and artifacts were read-only. No phone/ADB/install/picker/export/
Save/transfer/capture/model execution, download, Git/CI or P2-04/05 activity.

## Exact failure

Task dependency determination for :recognition-experiment:generateReleaseLintModel
could not resolve :recognition-experiment:releaseRuntimeClasspath offline:

- androidx.core:core:1.8.0, required by directly declared androidx.activity:activity:1.8.0;
- androidx.core:core-ktx:1.13.1, via Activity1.8.0 → lifecycle-viewmodel-savedstate2.10.0
  → lifecycle-viewmodel-savedstate-android2.10.0.

For both: “No cached version … available for offline mode.” Gradle additionally
reports six failures with identical causes; no other missing coordinates are
inferred. See blocker.json and the complete redacted gradle-live.log, SHA256
76a79b61013c767067c80314e2978a4c842c0b98911dfdc389df5c9288fac96c.

Activity1.8.0 itself is cached. Prior reviewed app graph resolved newer Core/Core-KTX
artifacts; prior-androidx-resolution.json preserves those exact coordinates,
paths and digests for all reviewed configurations. The observed failure indicates
that the newly direct module runtime configuration does not inherit the app's
resolution. S1's direct compile against prior app artifacts could not prove this
new module Gradle graph. This is a dependency/tooling blocker, not evidence of a
new phone storage failure or a failure while writing the saved-photo ZIP.

## Attempt and preservation evidence

build-attempt-intent.json and gradle-release.json contain the exact command:
cmd.exe /d /c gradlew.bat with explicit CPU Java/module Kotlin/camera Kotlin,
app build-input/resolution-evidence tasks, assembleRelease and runtime dependencies;
--offline --no-daemon --console=plain --max-workers=2, frozen release.init.gradle.
One invocation only. Exit1 after3m1s;28 build-plugin tasks executed. Log7931bytes,
below64MiB cap,1800s deadline. No network fallback, lock relaxation, daemon reset
or forced retry. The wrapper exited and the log reader closed; its recorded host
PID35856 and direct children were absent at final inspection. The runner does not
claim proof of every descendant process lifetime. No signing credential appears
in the persisted log or command arguments.

Actual build log reports Gradle9.3.1, SDK/build-tools36, minSdk24/targetSdk36,
NDK27.1.12297006, Kotlin2.1.20 and KSP2.1.20-2.0.1. toolchain-observations.json
records local executable hashes/version-command results and SDK/NDK properties.
Plugin compilation completed, with an existing Expo targetSdk deprecation warning;
application compilation never started.

Frozen exporter source-index remains
161995276f4ffe6940e771055a8b59d035a5bab250b32c59c0c099d5bf9c7a7f;
derived RecoverySource remains
2e6fc1f203285cc5dd73ad8d5cc8dc18469887e5ea0d92b39eeb8a8cbf86c0e6.
All600 source inputs were verified before/after. source-to-stage-mapping.json maps
588 indexed mobile files into the staged app;12 binding-only evidence/helper
inputs remain unbundled. The separately derived RecoverySource is also overlaid,
for589 reviewed mobile paths. New stage contains1059 frozen source files; all1043
old-stage source files and original b83 capture APK remain byte-identical.
Build helper/init/observer/charter hashes were frozen before the attempt in
build-inputs.json (SHA2564adf2dc768d03cf76b72ee57fae0e2de2b47b5ec51c083d11b994d3661a47d98).
Dependency project build output was directed into this new stage; ordinary cached
toolchain use was offline. No runtime/test/lockfile was edited in workspace/stage.
See preservation-after.json and old-stage-source-before.json.

## Unfulfilled S2 evidence and next decision

No recovery APK hash, signer verification, binary manifest, resolved new dependency
graph, native delta, ZIP/ELF16KiB alignment or packaged registration/UI claim exists.
artifact-check.py was prepared but NOT executed because there is no APK. S1 source
acceptance remains source-only; none of these artifact checks is waived.

Main should review a narrow explicit dependency-alignment correction using the
already reviewed/cached AndroidX artifacts, including both module compile/runtime
configurations and app compatibility. This is a proposed next decision, not an
implemented fix. Do not silently force versions, add uncached dependencies, relax
locks or patch the staged source. Freeze and review any approved source correction
before authorizing a new bounded build attempt.

S3 generated native lifecycle proof, S4 fixed existing empty ZIP recovery and S5
original-image/phase/geometry audit remain pending. Original sealed12 attempts and
consumed zero-byte output were untouched. Four preview markers remain inconclusive;
strict chart-only scene gate is unestablished. P2-03 OPEN/P2-04 held, P2-05+CI deferred.
