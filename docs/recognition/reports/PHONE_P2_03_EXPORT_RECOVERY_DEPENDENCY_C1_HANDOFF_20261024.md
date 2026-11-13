# Recovery dependency C1 — stopped source/resolution handoff

2026-10-24. **DONE for C1 source correction and offline resolution only.** Main
independent C1 review is pending. No new APK build is authorized by this result.
Writer01a1051f-0777-7573-ad09-0e550a4bd56a, same workspace
C:/Users/doyew/Documents/DEV 2/COSI-m8-planning, branch plan/m8-unified-scanner.
STOP/lease release: evidence root writer-stopped.json.

Evidence root: apps/recognition-lab/runs/phone-experiment/p203-export-recovery-dependency-c1-20261024-a1/.
Private probe stage: C:/Users/doyew/.cache/cosi-p203-export-recovery-dependency-c1-20261024-a1.
Approved scope: PHONE_P2_03_EXPORT_RECOVERY_DEPENDENCY_C1_20261024.md.

## Change and exact binding

Only two existing inputs changed (source-delta-before-probe.json/preservation-after.json
contain their exact before/after hashes):

- apps/mobile/recognition-native/recognition-experiment/android/build.gradle:
  ordinary implementation declarations for androidx.core:core:1.17.0 and
  androidx.core:core-ktx:1.17.0, with explanation. Activity stays1.8.0. No force,
  strict version, global resolution rule, exclusion or lock-policy change.
- cpu-runtime/src/main/java/expo/modules/recognitioncpu/CameraMatrixRecoverySource.java:
  derived exporter binding only. Its source index is new; no historical index or
  capture source class was regenerated or overwritten.

New source-index.json:606 bound inputs, SHA256
 eed896702c8dbc7490b51e1371986f1a13571787e0c7bcade45adfb672d5a1f5.
Derived RecoverySource file SHA256
 91809532b21c52ee863e610f7676c0f41835f467ae1e437a934c9f567827c308.
render-source.py --check reproduces both. Six added binding inputs are C1 helpers,
baseline/protection records and dispatch; historical600-input index is preserved.
Of601 prior bound+derived inputs,599 remain byte-identical and only the two
approved paths differ. All606 new inputs match after the probe. Old failed
stage's1059 source files remain exact; new probe stage has1059 frozen source files.
All recorded lock/package-lock sources are unchanged.74 files in the earlier
stopped source/build evidence indexes and original capture APKb83a2b2d6cc744345c46106c3d76c9c1a52eddddeecb7c2535394230f3512674
were rechecked unchanged. Capture source08d1f1f3…, camera owner36004274…,
model/recipe/registry/classes/native implementation/UI/tests remain unchanged.

## Actual probe and selection evidence

One invocation: probe.py probe launches cmd.exe /d /c gradlew.bat
:app:p2ResolvedArtifacts --init-script resolve.init.gradle --offline --no-daemon
--console=plain --max-workers=2. Full command, helper digests, times and output
are in probe-attempt-intent.json, probe-result.json and probe-live.log.
Exit0, BUILD SUCCESSFUL in1m50s,29 tasks.900s deadline/16MiB log cap;5948 log bytes.
A task-graph fence allowed only :app:p2ResolvedArtifacts in the application build;
the other28 tasks compile/configure Gradle plugins. No application/native compile,
lint, bundling, APK assembly or signing task ran. No password was supplied/read.
The existing keystore path was present only because app signing configuration
requires a non-null file path even when signing tasks are not invoked.

The task resolves actual external artifacts, then hashes files; this is not a
possibly successful dependencies report containing unresolved FAILED nodes.
All8 release compile/runtime configurations across module, app, CPU and camera
resolved offline;409 artifact rows rehashed successfully:

| Configuration family | Actual Core/Core-KTX selection | Activity |
| --- | --- | --- |
| recognition-experiment compile/runtime |1.17.0 /1.17.0 |1.8.0 |
| app compile/runtime |1.18.0 /1.18.0 |1.8.0 |
| expo-camera compile/runtime |1.18.0 /1.18.0 |1.8.0 |
| CPU compile/runtime |No new Core/Activity selection |Unchanged |

App, Expo-camera and CPU artifact coordinate/byte/hash sets are identical to the
reviewed capture build. Module additions follow the Activity/Core transitive
edges; no existing-coordinate artifact bytes changed. graph-verification.json
records all selected artifacts and edge additions/removals with actual paths.

One review detail is explicit: module runtime now selects cached
androidx.tracing:tracing:1.2.0 (6060bytes, SHA256
6faa90390d1fdbf0adb9a99bf99de67b94c6c6f35aea9510593a9d17973736a2),
replacing its prior1.0.0 selection. The newest graph's artifact rows did not contain
these1.2.0 bytes, so the first conservative comparison flagged it. That result is
retained as graph-latest-baseline-comparison.json. The exact AAR hash is already
recorded in p1-image-lifecycle-c1-20261012-a1/resolved-artifacts.json; that packet's
independent review accepted its source/build and six dependency graphs. The
cache bytes match. tracing-historical-provenance.json binds that older record
and review. Final checking adds only this exact historically reviewed artifact;
it does not broaden source constraints or perform another Gradle invocation.
App/camera retain unchanged tracing-android/ktx1.3.0 selections and hashes.

The analysis helper initially had a parenthesis typo, then its latest-only
baseline check flagged the Tracing provenance gap; both were analysis-only.
No runtime edit, probe retry, download or extra version declaration followed.
No uncached coordinate or observed graph incompatibility remains in this probe.

## Limits and next action

Existing accepted709 JVM assertions/28 UI tests are retained for unchanged
implementation; they were not unnecessarily rerun for a declarative graph fix.
Actual Gradle artifact resolution is the new evidence. Main must independently
review this stopped two-file C1 delta, new606-input binding, module transitive
changes and historical Tracing provenance before authorizing a NEW bounded APK
build. The failed S2 attempt remains preserved and must not be resumed/relabelled.

No recovery APK/signature/merged binary manifest/native delta/alignment result
exists yet. No phone/ADB/install/fixture/picker/export/Save/transfer/capture/model,
network download, Git/CI, agents or P2-04/05 action occurred. S3 lifecycle proof,
S4 fixed saved-evidence recovery and S5 original-image/phase/geometry audit remain
pending. Four preview markers remain inconclusive and strict scene gate remains
unestablished. P2-03 OPEN/P2-04 held; P2-05+CI deferred.
