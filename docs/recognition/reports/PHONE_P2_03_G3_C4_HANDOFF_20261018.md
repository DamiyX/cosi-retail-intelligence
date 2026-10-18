# P2-03 G3-C4 startup repair â€” stopped handoff

2026-10-18, Africa/Lagos. **The observed eager-import fault is repaired; one signed offline release and packaged JS/native static closure verification completed. One host first-render test timed out and remains unresolved. No physical startup pass is claimed.**

Same writer 01a1051f-0777-7573-ad09-0e550a4bd56a / parent 01a098ef-d830-7531-bca7-2d66b0a5b587; Sol6.1High. Existing worktree C:/Users/doyew/Documents/DEV 2/COSI-m8-planning, plan/m8-unified-scanner, HEAD 66ea3fc22595a48d7355d1729bb879496cc98896. Authority: PHONE_P2_03_G3_C4_STARTUP_DISPATCH_20261018.md. All work stayed direct; no delegation, Git mutation, install, network acquisition, phone/radio/private-image/model effect; only read-only Git source-path/head inspection.

## Exact new artifact

APK `C:\Users\doyew\Documents\DEV 2\COSI-m8-planning\apps\recognition-lab\runs\phone-experiment\p2-camera-build-g3-c4-20261018-a1\writer\recognition-camera-proof-release.apk`.
39,881,316 bytes; SHA256 `086ee746e8fc02a85131ed355ca8752d560ccfe51de9e11e0b8040b84a47699c`.
Test signer certificate SHA256 `48550aec63c2b09f7746775002fbc93c3c2ceb95bc388be59e95bcd26a7e2d83`. ARM64; min 24 / target 36.

One justified offline release: 2026-10-18T03:01:24.447033+00:00 through 2026-10-18T03:09:40.321189+00:00; Gradle BUILD SUCCESSFUL in 7m52s, 312 tasks (258 executed/54 up-to-date). R8, release lint and assemble passed. Receipt `gradle-release-a1.json` SHA256 `827334d1ce92cd0ed02f76f444944e7e734fbda8a60a9e5c0b4a4e163d4d8a22`. No successful release was repeated. Actual compile/cache status:

```text
> Task :recognition-cpu-runtime:compileReleaseJavaWithJavac
> Task :app:buildCMakeRelWithDebInfo[arm64-v8a]
> Task :recognition-experiment:compileReleaseKotlin
> Task :expo-camera:compileReleaseKotlin
> Task :app:minifyReleaseWithR8
> Task :app:assembleRelease
```

Evidence root `C:\Users\doyew\Documents\DEV 2\COSI-m8-planning\apps\recognition-lab\runs\phone-experiment\p2-camera-build-g3-c4-20261018-a1\writer`. Exact final APK/JS proof: release-success.json, inspection-run-a1.json, apk-static-result.json, startup-closure-result.json and apk-payload-comparison.json. All failed/partial source-check attempts remain preserved.

## Confirmed mechanism and minimal correction

Saved G4 physical evidence records C3 failing before permission/capture with missing ExpoAsset. The coordinator's actual C3 bundle/source-map binding and symbolication trace CameraProofPanel -> expo-camera barrel -> Expo.ts/Expo.fx -> expo-asset -> requireNativeModule('ExpoAsset'). That intentionally excluded native module was not added or stubbed.

The host counterfactual exercises actual installed camera modules. Targeted original source 73078366...dcb0e6a fails at the camera barrel's Expo import with fatal FORBIDDEN_EXPO_BOOTSTRAP; the same import assertion passes after repair. This is a controlled boundary sentinel, not a claim the host reproduced Android's native exception verbatim; the saved physical stack supplies that evidence. SDK CameraView, ExpoCameraManager, props helpers and actual core PermissionsHook are real installed code; RN/native acquisition and unused Jest global fetch are controlled, explicitly labelled boundaries. Forbidden Expo/asset/PictureRef/Camera.types evaluation remains fatal.

Only two lines in CameraProofPanel change: import the new experiment-only cameraRuntime.ts adapter, then call its getCameraPermissionsAsync in the existing capture preflight. The adapter imports installed CameraView/ExpoCameraManager deep paths and createPermissionHook from expo-modules-core. It copies the SDK's exact async get/request wrapper shapes and preserves native-manager receivers and hook options. Capture options, readiness, permission recheck, cancellation, ownership, storage, geometry, native processing, recovery, numerical and model behavior are unchanged.

Existing UI test mocks retarget the adapter and the renamed get method; all assertions are retained. Default isolation adds fatal adapter/deep-import guards without weakening its original assertions. New startup regression is the only new app test. No package/lock/plugin/ordinary app/native source changes. Three existing build/config/APK helpers bind C4 metadata and closure; two new bounded helpers implement provenance and build-time Metro observation. Other repository helpers remain unchanged. Full six-existing-file diff is writable-changes.diff; the panel diff shows the two-line repair.

## Honest test results

- Original targeted real-import assertion: EXPECTED FAILURE at forbidden Expo bootstrap (startup-original-regression-a2.json). Six other tests were unselected by the intentional counterfactual filter, not skipped in source.
- Corrected real-import/permission suite: **6 passed, 1 failed by 5000ms timeout, 7 total**, no source skip or timeout change (startup-corrected-regression.json). The import assertion, exact get/request/hook-option behavior, denial/request-error handling, and real-adapter revoked/get-error preflight checks pass. The first rendered default-hook test took 11864ms and timed out. It is not retroactively passed and was not rerun warm as a cure. Cause remains unexplained; the prior cold UI risk also remains open.
- Required existing camera UI/isolation/configuration suites: **15/15 pass, 3 suites**, 26.735s, original assertions retained (focused-existing-results.json and receipt). These do not cure the separate real-module timing failure.
- Fresh mobile typecheck and zero-warning lint: exit 0. Config isolation: six valid exact source/shadow variants and four invalid opt-ins reject, with actual resolver results. No ordinary/default native execution claim.
- Metro observer boundary tests: 4 VM-controlled cases for exact premodules identity/unchanged graph, deterministic duplicate capture, lease refusal and STOP refusal; 5 path/filename/JSON-format cases. Synthetic graph data stayed in memory and never contaminated actual graph evidence.

First harness invocation failed before tests because jest-expo installs a lazy fetch getter that Jest global enumeration hydrated through the strict native double. It is preserved as a harness failure, not causal app evidence. The corrected test-only unused fetch boundary throws if called; no production fetch/module/native-error behavior changed. The meaningful original counterfactual is a2. No warmed retry, hidden missing-native error, new native provider or ExpoAsset fake was used.

The build proceeded under the dispatch's explicit instruction to preserve cold timing failures as unresolved. It is not a fully green source suite or timing acceptance. startup-import-counterfactual.json binds the exact passing import case, six passing corrected cases, sole timeout, original source and source-index fingerprint; existing 15/types/lint passed separately.

## Fresh source provenance â€” old runtime ID is not new acceptance

Fresh C4 source 51-row SHA256 `30223e6d3322605f5ad9635722781418ef8970b5adbcae2029daa5135d6cadb9`. source-index.json contains canonical path/size/SHA rows; source-index-binding.json and fresh-source-preservation.json bind its exact bytes. It includes repaired panel/adapter, existing native/recipe-related source and pinned installed JS/Metro inputs plus the provenance/observer helpers. Expo Camera 57.0.6 / Modules Core 57.0.18 and all 15 curated installed JS/serializer files are asserted by exact hashes; unexpected files/versions refuse before build. The new JS index covers the new source; old G2/C3 source pins are not presented as its acceptance.

**Native CameraProofSource.java runtime ID remains `360042746d54c6c05cf2ed0e253e87709d05f5bf60357951daee56df7b5b9d0e`**, unchanged under the no-native/runtime-pin-edit ceiling. It does NOT cover the repaired JavaScript. The fresh C4 pin is external build/source provenance linked to the exact packaged bundle/APK; this does not silently rewrite the older native receipt ID. Future reviewers/physical packets must use this C4 source index and artifact binding, and distinguish the legacy runtime field. Use phone-camera-proof-build-provenance.py check for C4; the readonly older source.py --check targets its old generated-native binding and is not the C4 source validator.

Native camera derivative remains exactly 806 C3 source rows/fingerprint 187019dce6c54652bd3b61d5fa69d38534d3077f1b2d3bafc129451fc7a0d4a3, including the same six-file derivative and excluded analyzer files; no new native patch. Actual Gradle selects exactly 16 camera Kotlin files and the same eight projects. Native SDK/compiler/runtime assets remain unchanged. Model `bbbb4c51a55a53905af1daec995ca1aae355046f8839bb8c9f5ce9271394bc40` and recipe `76142a4e3bada43fe6f91fe295cfc624df4b1157cf92dd7ae680bc236bc15522` are unchanged and unexecuted.

## Actual packaged startup graph and native closure

The fresh shadow metro.config.js uses the installed, hash-pinned getDefaultConfig unstable_beforeAssetSerializationPlugins option. It observes the real postprocessor graph, returns the identical premodules array and does not replace/mutate Expo's serializer, IDs, transforms or source. Configuration/observer hashes are recorded; this is build-time instrumentation, not shipped application logic.

Actual captured release graph: 532 modules + 7 premodules; SHA `f6fb2b2683dcd0bcf649200d2738022d3b0ee2bcfae63141376df134c780633c`. Its transformed factories, dependency edges and on-disk source hashes are recorded. The packaged Hermes source map has 531 sources (529 real mapped sources); all real mapped nodes bind to the actual capture and required deep camera/core-hook nodes occur in both. The exact packaged bundle equals generated bytes; SHA256 `d31faccc498b088622aa719bf29bc1b29a34129249e7ec531855f9d5bc9f3de1`; static Hermes disassembly passes. Only ten owned recognition/entry sources occur; ordinary router/Supabase entry remains absent.

The ENTIRE captured graph has no Expo main/Expo.fx, expo-asset, camera barrel, PictureRef or Camera.types value moduleâ€”not just absence of one error string. No winter/fetch modules remain in this graph either. The eight nodes without individual source-map entries are two virtual prelude/environment records and six empty/type-only factories; metro-source-map-projection.json and metro-empty-module-review.json retain the exact evidence. No forbidden lazy/dead module exception is needed. The original mocked UI tests are not substituted for this actual-module/actual-release-graph boundary.

Fresh exact APK checks verify signature/certificate, SDK/ABI, ZIP and all 17 ARM64 ELF PT_LOAD 16 KiB placement, both DEX files/10,762 definitions (official dexdump cross-check), native/JNI/mapping and 104 pinned model/generated/licence/notice assets. All 44 retained TFLite JNI names/descriptors/static flags and corresponding LiteRt exports pass; all 583 native declarations are inventoried, not dynamically executed. Actual runtime 116-coordinate metadata and 39 present notice texts/MIT copyright retained; no legal compliance conclusion.

C3/C4 payload comparison: same 586 paths. Changed: lib/arm64-v8a/libappmodules.so, lib/arm64-v8a/libexpo-modules-core.so, assets/index.android.bundle. Only the JS bundle changes runtime payload; both native files differ exclusively in 20-byte GNU build IDs, every other native byte identical. Manifest, DEX, resources, all other assets and ExpoModulesPackageList bytes are exact to C3. All eight dependency scopes' external coordinates/hashes match C3. Fresh config still resolves exactly the prior five Expo/native modules; no ExpoAsset or new native runtime, scanner/GMS/MLKit/ai-delivery introduced.

The four-removal manifest overlay is exact to C3: CAMERA plus the exact app-qualified signature guard only, backup/cleartext false, launcher/deep links/disabled service/HTTPS visibility retained; no shared/vendor-native library or vendor-action query, and no barcode delivery metadata. No native/DEX/manifest discrepancy was hidden.

## Preservation, finite ownership and stopped return

Protected source 972 has exactly six allowed existing writer deltas. The coordinator baseline was captured before its dispatch updated workflow and PROJECT_STATE; initial bootstrap refused before code/stage mutation. Those exact two legitimate metadata deltas are separately snapshotted and hash-bound to coordinator-dispatch.py, dispatch receipt and C4 authority in coordinator-dispatch-bindings.json. No metadata was changed by the writer and no broad rebaseline/ignore rule was introduced. All other protected rows remain exact.

Installed 2995 / broad 9008, native-assets 104, original artifacts 866, short-cache 893 (zero additions), frozen 6874 and staged 164 inputs verify. Additionally, all 2955 accepted C3 stage entries and exact path set verify directly through its frozen inventory, without traversing the junction. Current stage 2957 entries / one indexed nontraversed node_modules junction; derivative 806/installed JS 68; C1 Maven 471; selected toolchain 331 / short Gradle 314 exact. Fresh 51-row source, complete initial 983-source path set, source delta ceiling, helpers/stage/writer inventories and report copies bind all work. Existing writable originals were snapshotted before editing. No old APK/report/STOP was rewritten, no cache deletion, install or new download.

Current finite lease expires 2026-10-18T08:35:19.472Z; no self-renewal. Before STOP, finalization drains owned proof/build/SDK processes, checks all helper/report/source copies and unchanged current/C3 stages, writes writer inventory then writer-stopped.json LAST/readback. No writes/builds afterward. The single authorized direct parent completion message follows; its tool result separately confirms actual delivery.

Independent C4 audit remains required. The saved C3 physical startup FAILED; no physical C4 startup/camera/permission/radio action occurred. First-render host timing remains unaccepted. Native loading/OEM fallback, actual offline/camera/cancellation/restart/geometry/privacy/speed/accuracy require the founder's later Medium G4 packet. D-054 logical owned 256 MiB / B 26,009,600 remains; SDK producer cache and total RAM hard bounds are unproved. Geometry INCONCLUSIVE, no autoaccept. G4/P2-04/05/06 stay held. PROJECT_STATE/workflow and the founder-authorized GitHub checkpoint remain coordinator-owned after stopped audit.

Recommended next action: independently audit this source repair, 51-row provenance, actual graph/native closure and exact artifact while retaining the timing failure; only then plan a separately authorized physical startup/camera retry when the founder returns.
