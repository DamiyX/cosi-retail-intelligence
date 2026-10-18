# P2-03 G3-C3 stopped handoff

2026-10-18, Africa/Lagos. **The generated-manifest correction and exact APK static self-check passed. Independent G3 acceptance remains with the coordinator; G4/P2-04 remain held.**

Writer 01a1051f-0777-7573-ad09-0e550a4bd56a; parent 01a098ef-d830-7531-bca7-2d66b0a5b587. Same C:/Users/doyew/Documents/DEV 2/COSI-m8-planning worktree, plan/m8-unified-scanner, HEAD 66ea3fc22595a48d7355d1729bb879496cc98896. Authority: PHONE_P2_03_G3_C3_DISPATCH_20261018.md, following C2 independent review. Only the originally required manifest condition was corrected; no new provider or production architecture was introduced.

## Exact artifact and build

APK: `C:\Users\doyew\Documents\DEV 2\COSI-m8-planning\apps\recognition-lab\runs\phone-experiment\p2-camera-build-g3-c3-20261018-a1\writer\recognition-camera-proof-release.apk`.
Size 39,986,324 bytes. SHA256 `6097b9d59ceb44e0844af3b60d9c0d4a590ceb7206d54ea50dcba8b0604d0a99`.
Internal test certificate SHA256 `48550aec63c2b09f7746775002fbc93c3c2ceb95bc388be59e95bcd26a7e2d83`.
ARM64 only, minimum SDK 24 / target 36. No installation, phone, private-image, model, radio or network acquisition execution.

One C3 offline release, following a separate focused source/manifest-merger preflight. Release receipt `gradle-release-a1.json` SHA256 `d41a4ae8c252581c5f14829b1b2cee3a34f8a82d97d07be0b7ec4a256d34f8c6`; started 2026-10-18T00:25:30.823444+00:00, ended 2026-10-18T00:33:21.982983+00:00. Actual R8, release lint and assemble succeed. Successful C2/C3 releases were not rerun. The exact real tasks and their cache status are retained rather than implying every dependency was recompiled:

```text
> Task :recognition-cpu-runtime:compileReleaseJavaWithJavac
> Task :app:buildCMakeRelWithDebInfo[arm64-v8a]
> Task :recognition-experiment:compileReleaseKotlin
> Task :expo-camera:compileReleaseKotlin
> Task :app:minifyReleaseWithR8
> Task :app:assembleRelease
```

Evidence root `C:\Users\doyew\Documents\DEV 2\COSI-m8-planning\apps\recognition-lab\runs\phone-experiment\p2-camera-build-g3-c3-20261018-a1\writer`. `inspection-run-a1.json` binds the successful fresh APK inspector; `apk-static-result.json` inventories its full exact artifact. Build flags remain --offline --no-daemon --console=plain --max-workers=2 with pinned JDK17/SDK36/build-tools36.0.0/NDK27.1.12297006/CMake3.22.1/Gradle9.3.1/Node24. Existing internal signer secrets were confined to the child build environment, scrubbed from captured output and cleared; no credential content is recorded.

## Only new behavior: four generated-app merger directives

The reproducible helper `tools/scripts/phone-camera-proof-build-overlay.py` refuses any generated input differing from the exact C2 base SHA256 `445b756ee8ba47c20e945d53d52f90f9c83a95f345ae0d3fbb9732be0fb6a35a`. It inserts only namespace-keyed tools:node=remove directives for:

- uses-library androidx.camera.extensions.impl;
- uses-library androidx.window.extensions;
- uses-library androidx.window.sidecar;
- queries/intent action androidx.camera.extensions.action.VENDOR_ACTION.

It validates that removing those four markers restores all prior XML semantics. It writes only the fresh C3 generated app manifest. Overlay SHA256 `e6da8b9c7aa40cd6b5acf54e8b6b821ba301c576a5fa5664f066e5329efb5c10`. Before/after XML, helper hash and exact change receipt are preserved. No signed APK, cached dependency, installed source or native package was patched.

Actual `:app:processReleaseMainManifest` succeeds. `merged-manifest-proof.json` compares its complete parsed result against the frozen C2 corresponding merged manifest with only the four declarations removed. Actual final official aapt2/apkanalyzer decoding also passes the same complete semantic comparison. Final APK contains NO uses-library, NO uses-native-library, NO vendor-action visibility, and retains exactly the HTTPS VIEW/BROWSABLE visibility query. No wildcard new removal or blanket reference exception was introduced.

CAMERA plus the exact D-055 app-qualified signature guard remain, with the sole guard declaration at signature enum2. No other capability permission. Backup=false and cleartext=false. Exported MainActivity retains its launcher and retail-intelligence-recognitionverification / exp+cosi deep links; disabled/nonexported CameraX MetadataHolderService and its provider metadata remain. No receiver/provider/alias or scanner download metadata appears. All other decoded C2 manifest settings are equal, including component attributes, intents, SDK and package data. This closes the C2 manifest finding in the implementation self-check, not by retroactively changing C2's failed criterion.

Existing writable helpers changed only: phone-camera-proof-build.py, phone-camera-proof-build-config.mjs and phone-camera-proof-apk.py. Their changes bind C3 roots/current lease/current baseline counts, generate the overlay and enforce strict merged/final absence/full comparison. C2 renewal exceptions are not carried into C3's fresh source baseline. One new bounded overlay helper was added. The three existing helpers were snapshotted before editing; all six relevant repository helpers are snapshotted/indexed at finalization, including the unchanged derivative helper which was not executed in C3; no package/lock, product, schema or migration change. PROJECT_STATE/workflow remain coordinator-owned.

## Unchanged native and recognition inputs

The real C3 copied camera package is byte-exact to all 806 C2 derivative source rows, including the same six previously changed targets and three preserved-but-excluded scanner files. Derivative fingerprint `187019dce6c54652bd3b61d5fa69d38534d3077f1b2d3bafc129451fc7a0d4a3`. Installed distributed JS 68, metadata, licence/copyright and still-photo helper remain unchanged. No new Kotlin/Java/Gradle source edit or dependency/provider/version change. Actual Gradle selects the C3 source directory, exactly 16 Kotlin files and the same eight projects; it excludes all three analyzers and scanner declarations from compile/runtime. Other module selections match C2 after only the stage-root substitution.

Recognition source 35-row pin `360042746d54c6c05cf2ed0e253e87709d05f5bf60357951daee56df7b5b9d0e`; model `bbbb4c51a55a53905af1daec995ca1aae355046f8839bb8c9f5ce9271394bc40`; recipe `76142a4e3bada43fe6f91fe295cfc624df4b1157cf92dd7ae680bc236bc15522`. The pins remain exact; no model or private-image execution occurred. The source pin does not substitute for the separate native derivative fingerprint.

## Fresh verification and bounded reuse

Nineteen unique focused overlay/final-manifest cases pass (overlay-checks-a2.json): exact input/four-marker retention; changed structure/settings rejected; ordinary manifest rejected without mutation; old C2 manifest rejected; camera/guard/deep-link/service/backup/HTTPS retention; injected shared/native library, vendor/unknown query and extra permission rejected. Original first 19 passing checks are retained; self-review refined one mislabelled launcher-attribute mutation to mutate the actual deep-link scheme, then reran the same 19-case set. This is not 38 unique tests. The actual merger/final APK comparisons additionally cover every retained XML setting.

Fresh C3 config isolation passes six valid exact source/shadow variants and four invalid opt-ins (both source/shadow reject). Actual Expo/RN resolver results show only the intended five Expo/native modules and Expo RN integration. Ordinary/default native behavior is not claimed executed. Existing tests/assertions/timeouts were not modified. No broad stress/warmed UI rerun. No unrelated TypeScript/lint suite rerun: product/TS/config source is unchanged and protected; new Python/JS helpers receive AST/compile/Node syntax and focused boundary checks.

C2's reviewed 8 derivative tests and 13 generated exact-body JVM checks are reused explicitly as source-bound old evidence because all 806 native source bytes match; not fresh C3 Android tests. Source-reviewed OkHttp Conscrypt bytecode trace is likewise retained, with the exact C3 DEX literal checked afresh. No source/string broad exception.

Fresh final static evidence:

- Verified internal signature/certificate; official zipalign -c -P16; all 17 ARM64 ELF PT_LOAD and uncompressed ZIP library offsets 16KiB-compatible, plus official readelf diagnostics. Size/alignment do not prove physical compatibility or installed RAM/storage use.
- 2 DEX files, 10,762 definitions, 12,208 unique types; robust bounded parsing cross-checks definitions with official dexdump. No scanner/GMS/MLKit/Play/Firebase/ODML/datatransport definitions/types or analyzer implementations. The sole related string `com.google.android.gms.org.conscrypt` remains exactly the C2 source-reviewed OkHttp deferred TLS provider prefix, not scanner code; runtime loading is unverified.
- Eight actual compile/runtime graph scopes and accepted external artifact hashes; scanner dependencies/ai-delivery absent. 116 runtime coordinates have retained metadata, 39 present notice texts, and exact camera MIT/copyright; no legal-compliance conclusion.
- All 104 pinned generated/model/licence/notice assets exact, one unchanged tflite model. Extra assets are generated baseline profiles, isolated app.config and Hermes bundle. Exact bundle matches generated bytes, static hermesc -b disassembly succeeds, source map contains 588 sources/nine owned recognition entry files, no ordinary router/Supabase entry, and actual Expo package registration remains isolated.
- R8 mapping/configuration and all 583 native declarations retained. Required mapped camera/recognition/CPU classes and TFLite reflection factory constructor survive. Fresh supplemental check confirms all 44 retained TFLite JNI names/descriptors/static flags and corresponding LiteRt exports; nine unused signature-runner native methods have no remaining final class/type/string references. No model/native library was loaded/executed; these are not dynamic tests of all native methods.

C2/C3 ZIP entry path sets match (586 entries). Changed payloads: lib/arm64-v8a/libappmodules.so, lib/arm64-v8a/libexpo-modules-core.so, AndroidManifest.xml. `apk-payload-comparison.json` records every before/after hash; all other entry bytes match. Additional bounded section/full-file comparison in native-section-comparison.json and native-payload-equivalence.json proves both rebuilt libraries differ only in their 20-byte GNU build IDs; every other library byte is identical. This is static byte evidence, not native execution.

## Preservation and stopped return

Initial and final protected preservation covers source 972 with exactly three allowed existing helper changes; installed 2995 / broad 9008; assets 104; original artifacts 866; frozen 6486 (including all C2 APK/writer/stage/reports/STOP and older C1/P1/G2); staged accepted inputs 163; derivative 806 / JS 68; C1 Maven 471; toolchain 331/short Gradle 314. Short cache original 893, current 893, additions 0. All indexed input bytes are exact. Fresh stage has 2955 entries and exactly one app/node_modules junction, indexed with target and never traversed. Derivative is a real directory. Full helper/source/stage/writer inventories bind the evidence.

Finite C3 lease expires 2026-10-18T06:16:10.000Z; no self-renewal. No source/native/SDK repair outside the ceiling, new download/install/cache deletion, Git effect, new chat/agent or delegation occurred. Coding/testing/review-audit skills were read and used; work stayed direct. No adjacent/workspace GLOBAL_MEMORY router was available from the prior verified route; explicit approved dispatch and current project truth control this isolated continuation.

Process drain checks all named build/SDK tools and current proof-script processes, excludes only finalizer ancestry/query itself and does not rely on old numeric PID identity. No unrelated process termination. Finalization rechecks the frozen baselines, helper/report copies and unchanged stage, writes writer inventory, then writes writer-stopped.json LAST/readback. STOP contains exact APK, report and inventory hashes. No writes/builds afterward; the one authorized direct completion message follows. Messaging success is confirmed separately by its tool result, not predicted here.

The generated-manifest correction acceptance criteria passed in the implementation self-check. Coordinator independently audits after STOP before G3 acceptance or any G4 dispatch. Physical camera preview/capture/restart/native-loading/OEM fallback/offline/radio/privacy/performance/accuracy remain unverified. Cold UI 5 s timeout remains unresolved; no changed timeout or warmed substitute. D-054 logical owned 256 MiB / B 26,009,600 remains, SDK producer-cache/total RAM hard bounds unproved. Geometry stays INCONCLUSIVE, no autoaccept. G4 and P2-04 held. No production-readiness, physical/privacy or accuracy verdict.

Recommended next action: independent C3 manifest/artifact/preservation audit, then separately authorized physical G4 planning if accepted.
