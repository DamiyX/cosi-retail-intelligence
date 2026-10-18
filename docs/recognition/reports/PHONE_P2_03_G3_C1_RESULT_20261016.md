# P2-03 G3-C1 result: R8 closure blocked, no APK

Completed 2026-10-17, Africa/Lagos; filename retained from the October16 dispatch.
**G3-C1 has not passed. No APK exists. G4 and P2-04 remain held.**

The exact installed Expo Camera57.0.6 source and accepted G2 camera source compile.
The pinned offline ARM64 release reaches `:app:minifyReleaseWithR8`, which fails
on27 missing GMS/ML Kit scanner classes. No scanner runtime was added, no generated
`-dontwarn` suggestions were applied, and no installed/production source was fixed.
The dispatch explicitly requires returning this closure defect before repair.

All evidence below is relative to:
`apps/recognition-lab/runs/phone-experiment/p2-camera-build-g3-c1-20261016-a1/writer/`.
The companion `PHONE_P2_03_G3_C1_HANDOFF_20261016.md` describes ownership and STOP.

## Exact source and preparation

- Same worktree `C:/Users/doyew/Documents/DEV 2/COSI-m8-planning`, branch
  `plan/m8-unified-scanner`, HEAD `66ea3fc22595a48d7355d1729bb879496cc98896`.
- Camera35-row source fingerprint remains
  `360042746d54c6c05cf2ed0e253e87709d05f5bf60357951daee56df7b5b9d0e`.
  Model remains `bbbb4c51a55a53905af1daec995ca1aae355046f8839bb8c9f5ce9271394bc40`;
  recipe remains `76142a4e3bada43fe6f91fe295cfc624df4b1157cf92dd7ae680bc236bc15522`.
- Stage `C:/Users/doyew/.cache/cosi-p2-camera-g3-c1-20261016-a1/` contains163
  indexed source/asset copies. Its package has only the approved source selector
  `expo.autolinking.android.buildFromSource=['^expo-camera$']` plus separately
  recorded ordinary prebuild script generation. Dependency/version fields are
  unchanged. The staged package is deliberately not claimed byte-identical to
  the repository package. Wrapper checksum binding is separately indexed.
- Existing installed node_modules is reached through one indexed directory
  junction; inventories record its target and never traverse it. Old Android
  builds/evidence are not write destinations.
- Fresh offline prebuild and actual Gradle selection prove the eight projects
  including `:expo-camera`. Six valid source/shadow configurations match, four
  invalid opt-ins reject, and actual autolinking retains five intended modules.
  Three barcode dependencies are compileOnly, absent from direct runtime.

## Fixed prerequisites and provenance

`graph-a7.json`/`graph-a8.json` contain complete resolved compile/runtime/processor
graphs. `pinned-cache-graph-equivalence.json` proves coordinate and variant
equivalence with the supplemental fixed Maven repository first. Actual raw-file
resolution covers157 unique files; every hash matches an accepted cache input or
a reviewed download. The four modules' release compile/runtime scopes are retained
again in `r8-blocker.json`. Their prior resolved runtime graphs contain no GMS,
Play, ML Kit, Firebase, datatransport, ODML, camera-mlkit-vision or ai-delivery
artifacts. This is graph evidence, not final DEX or final release graph-task proof.

83 fixed metadata receipts and54 required binaries were reviewed/acquired from
official Google Maven and Maven Central HTTPS only. Binary bytes26,275,249 plus
retained metadata1,239,887 total27,515,136 against the250MiB planned new-payload
budget. This budget is not a hard network-transfer cap. Published digests and
advertised sizes match; all54 current binary hashes were reverified in
`acquisition-preservation-after.json`. The task Maven repository has471 files,
including exact old cache materialization and aliases, not471 new downloads.
278 accepted cached files and11 selected filename aliases were materialized with
zero network bytes. Original866 artifact bytes remain unchanged.

19 acquired scanner-related artifacts are compiler inputs only. The approved
barcode AAR may contain bundled scanner-model assets; it was not executed and
those assets were not extracted or packaged into an APK. No recognition model was
changed or invoked. Do not describe this as an absolute absence of model bytes
from compiler prerequisites.

`binary-plan-review.json`, individual download/metadata receipts, and
`published-terms-review.json`/`published-sdk-terms-review.json` retain licence,
size, provenance and terms review. ML Kit/Android SDK terms are not relabelled
Apache. Public terms were inspected; no account, API or interactive agreement
was activated, and no legal/compliance conclusion is claimed. Current runtime
AAR minCompileSdk36/minAGP8.9.1 requirements fit SDK36/AGP8.12.0.

## Preserved release attempts

All five commands use the pinned toolchain and `--offline --no-daemon
--console=plain --max-workers=2`, explicit CPU Java/recognition Kotlin/camera
Kotlin tasks, release assembly and requested artifact/runtime reports.
All five exit1 and verify protected source stability afterward.

| Attempt | Actual result | Narrow follow-up |
| --- | --- | --- |
| a1 | CPU Java and Expo native compilation ran; mergeReleaseNativeLibs could not retrieve an already accepted lifecycle AAR through the old cache index. | Exact old-byte materialization into the task Maven repository. |
| a2 | CPU compile classpath could not match lifecycle-runtime's published filename to the accepted cached display filename. | Eleven selected aliases; all157 required external files subsequently resolve. |
| a3 | Recognition and camera Kotlin compile successfully; Ninja fails on a React header path longer than260 characters. | Existing accepted short cache reviewed, no SDK/tool/source upgrade. |
| a4 | Short cache selected, but Ninja still stats the old long header paths. | Captured build.ninja has zero old/nine short references; preserved .ninja_deps contains249 stale old references. |
| a5 | Fresh task-owned CMake directory gets through ARM64 native build, app Java/Kotlin and bundling; R8 executes and fails. | STOP for closure review; no further build/source repair. |

a5 ran2026-10-17T02:01:30.540654Z–02:06:20.246186Z (Gradle reports4m41s).
Its unchanged sources and all task output are in `gradle-release-a5.json`.
Short cache `C:/p1g-20261012-a1` is a real pre-existing accepted directory.
All892 saved artifacts, including866 original matching keys, were rehashed before
reuse. All331 pinned installed tool inputs and314 short-cache Gradle distribution
files match. Fresh CMake output uses only short paths in `stage/cxx-a5/`; old
`stage/cxx/` and every failure are preserved. No clean/delete/move, registry,
global configuration, version upgrade or installed-source edit occurred.

## Material blocker and intermediate findings

`r8-blocker.json` and12 frozen diagnostic/input copies identify27 missing classes:
GMS Tasks/listeners; ML Kit BarcodeScanner/options/scanning and Barcode/nested
data types; GmsBarcodeScanner/options/scanning; and InputImage. Referencing code
includes CameraViewModule's registered async function and BarcodeAnalyzer.
Compiler-only dependencies make Kotlin typechecking possible but do not make the
scanner references disappear from R8's reachable program. Runtime Class.forName
guards do not establish successful shrinker elimination or device class loading.
The generated missing_rules.txt is retained as failure evidence, never applied.
No R8 success, finished mapping, packaged DEX or signed release follows.

The intermediate merged manifest requests CAMERA and the additional app-owned
`com.damiyx.retailintelligence.recognitionverification.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`.
The merger traces the latter declaration/use to AndroidX Core1.18.0, with
signature protection. It is not another Android capability permission, but the
literal only-CAMERA assertion **failed** and remains unaccepted. Its first
collector refusal/partial copies are preserved. No permission was stripped.
Backup and cleartext are false; barcode download metadata is absent. The
manifest also retains launcher/deep-link intents and a disabled, non-exported
CameraX metadata-holder service. The exact components/intents/metadata are
recorded for review, not accepted from this intermediate file.

The intermediate source map has588 sources, including nine recognition entry/UI
sources and no Supabase/expo-router paths. Generated Expo registration includes
camera, constants and the recognition wrapper. These copied bundle/map/module
observations do not substitute for inspecting a final packaged entry and DEX.
An initial read-only map probe failed on Windows' default cp1252; explicit UTF-8
resolved the read. An earlier CMake probe assumed the old AGP hash directory;
the unique new generated directory was then enumerated. Both probe issues are
recorded; neither changed build/source behavior.

No APK was produced. Final signature/certificate, ZIP16KiB/ELF alignment, final
permissions/exports/DEX/class definitions/JNI retention/assets/notices/size checks
are **unexecuted**, as is the post-assembly resolved-artifact task. No old
zero-camera APK inventory or intermediate manifest is substituted for them.

## Verification and preservation

24 generated helper checks pass:8 metadata/coordinate/URL/cache,7 acquisition
fault checks,2 selected-alias/hash checks and7 renewal-binding refusal checks.
C1 mobile typecheck and lint exit0, lint with zero warnings. Their October16
receipts remain current because mobile/installed sources did not change; no
unnecessary rerun or new UI timeout was introduced. Source35-row check passes.
The original G3 cold default-route UI5s timeout remains unexplained; a previous
warmed pass is not a timing diagnosis. The30-minute storage stress was not rerun.

`preservation-after.json`:961 baseline source rows (two allowlisted helper deltas
and two explicitly indexed coordinator renewal records),2995 installed inputs,
104 assets,102 frozen bindings,9008 broader installed entries,866 old cached
artifacts and163 staged accepted inputs preserve their expected bytes. Short
cache preservation, source-path ceiling, final helper copies, stage inventory,
report copies and writer inventory are separately bound by STOP. The coordinator
alone updated its workflow/PROJECT_STATE for renewal; writer did not edit them.

The test signer password existed only in child signing environment, was scrubbed
from captured output and removed in finally. No private key/password/environment
dump was copied to evidence. No phone/ADB/install/radio/private-image/model action,
service, Git mutation, new worktree or delegation occurred.

Independent coordinator acceptance is pending. SDK/cache/RAM hard caps, physical
camera/class-loading/JNI behavior, geometry, accuracy and G4 proof remain open
under D-054 choiceA. Logical256MiB/B26,009,600 constraints are unchanged. Review
the R8 SDK-isolation defect and signature-permission finding before authorizing
any source/provider/runtime correction or another release attempt.
