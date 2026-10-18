# P2-03 G3-C2 independent review

2026-10-18, Africa/Lagos. **Audit complete: CHANGES REQUIRED for one manifest
scope condition. Signed offline build is independently confirmed; G3 is not yet
accepted and G4/P2-04 remain held.** Writer was stopped before review began.

Review comparison: D-055, approved C2 proposal/dispatch, frozen C1 and accepted G2
inputs versus the exact C2 derivative, actual Gradle receipts and signed APK.
No new production source, install, camera/private pixels or model execution.

## Specification

**Medium, correction required — optional device-library declarations remain.**
Original G3 static criterion forbids optional vendor/NPU declarations. Fresh
official aapt2 decoding of the final APK still shows optional uses-library entries
`androidx.camera.extensions.impl`, `androidx.window.extensions` and
`androidx.window.sidecar`, plus package visibility for
`androidx.camera.extensions.action.VENDOR_ACTION`. C2 retained and correctly
reported these stock transitive declarations for coordinator review. They do not
prove scanner execution, network access, an NPU dependency or an observed device
failure. They do leave optional device-supplied code available to the package
class loader, so absence cannot be inferred from bundled DEX alone.

Android documents [uses-library](https://developer.android.com/guide/topics/manifest/uses-library-element)
as a class-loader linkage declaration; required=false permits installation when
absent, rather than forbidding use when present. The vendor intent in
[queries](https://developer.android.com/guide/topics/manifest/queries-element)
expands package discovery and does not itself launch another app. The exact APK
has no uses-native-library or NPU feature declaration. These distinctions prevent
an exaggerated runtime/security claim, but do not silently waive the original
isolated-build criterion. Retain the C2 APK as evidence; correct only the fresh
proof app manifest via standard merger removal directives, then inspect a new APK.

**Resolved — unused barcode closure.** Actual offline release a2 exits 0 with
R8/assemble. Six changed copied-source targets match the approved set; all 806
base/derivative source hashes and canonical fingerprints verify. The still-photo
plane-copy helper is byte-identical after relocation. Source review finds scanner
availability false, setters cannot activate scanning, and scan/launch requests
reject without URL/image work. Three scanner implementations are actually absent
from selected compilation, not merely hidden from runtime graphs. Fresh parsing
of both final DEX files finds no GMS/ML Kit/Firebase type references or definitions.

**Resolved — exact AndroidX receiver guard.** Fresh official manifest decoding and
badging show CAMERA plus precisely the app-qualified signature guard allowed by
D-055. Protection level is signature (0x2); backup and cleartext are false. No
network/audio/storage/media/location/radio/foreground permission. Preserve this
guard during manifest correction.

**Resolved for static scope — optional OkHttp reference.** The exact
`com.google.android.gms.org.conscrypt` string is traced in preserved accepted
OkHttp 4.9.2 bytecode to its deferred TLS adapter. It is not a scanner definition
or SDK type; original G3 permits separately reviewed optional references. No
blanket prefix exception, missing-class suppression or runtime addition is
accepted. No INTERNET permission exists. Dynamic loading behavior remains a
physical-proof question; this review does not claim the string is absent.

## Standards and fresh evidence

The coordinator verifier is in
`apps/recognition-lab/runs/phone-experiment/p2-camera-build-g3-c2-review-20261018-a1/verify.py`.
Its complete first invocation passed, with `verification.json` and separate
official tool receipts. It did not import or execute writer build helpers.

- STOP-bound handoff/result/inventory hashes match. All 543 writer and 2,955 stage
  entries hash correctly; independent directory enumeration matches exact path
  sets, with the one junction indexed and not traversed.
- 966 protected source expectations, 2,995 installed inputs, 9,008 broad installed
  entries, 104 native assets, 2,984 frozen bindings, 866 original and 893 short-cache
  artifacts verify. Five current helpers and exact two coordinator renewal deltas
  are explicit exceptions. Earlier C1/source/model/recipe inputs stay preserved.
- The exact 39,986,480-byte APK hashes to
  `5d3ad41be4bbf3a8bc3f4836cf4c8f4c737692dfe07db6d86a9046c0f91826a9`.
  Fresh apksigner verifies certificate
  `48550aec63c2b09f7746775002fbc93c3c2ceb95bc388be59e95bcd26a7e2d83`.
  Fresh official zipalign passes. Independent ELF parsing verifies ARM64 and
  16KiB-compatible PT_LOAD/ZIP placement for all 17 shared objects.
- All 586 APK entries match recorded hashes. Fresh DEX table parsing matches
  all 10,762 definitions and 12,208 unique types recorded by inspection; writer
  dexdump cross-checks are preserved evidence, not newly rerun here.
- Fresh original camera configuration Jest suite: 3/3 tests pass, 9.678s. Command:
  node ../../node_modules/jest/bin/jest.js --runInBand --cacheDirectory <review-root>/jest-cache
  --runTestsByPath __tests__/recognitionExperimentCameraProofConfig.test.ts,
  cwd apps/mobile. Ordinary/zero-camera behavior and invalid opt-ins are covered.
- Coordinator process check after verification found zero Java/CMake/Ninja/clang/
  Python build tools. Writer's final STOP still protects its evidence.

Writer helper/negative/JVM/types/lint/graph/JNI/notices results were reviewed in
the stopped handoff and are source-bound preserved evidence; they are not all
newly executed by the coordinator. No broad storage or cold UI replay was needed.
The original cold UI 5s timeout remains unresolved. All 583 native methods are
inventoried, not dynamically proven; model/native loading, physical camera,
geometry, offline/radio, speed, accuracy, SDK producer cache and total RAM remain
outside this static acceptance. No generic legal/security/production verdict.

## Correction boundary

`PHONE_P2_03_G3_C3_DISPATCH_20261018.md` scopes one generated-proof-manifest
correction to meet the original G3 requirement, with a fresh offline build and
stopped handoff. This narrows optional device inputs; it adds no permission,
provider, source algorithm, SDK/version, dependency or phone effect. It does not
expand D-055's six-file native derivative. Coordinator may authorize this routine
correction within the existing requested build/audit cycle without a new founder
approval. C2 remains preserved and unaccepted against that manifest criterion.
