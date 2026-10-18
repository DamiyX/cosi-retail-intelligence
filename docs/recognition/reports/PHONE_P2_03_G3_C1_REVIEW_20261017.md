# P2-03 G3-C1 independent blocker review

2026-10-17, Africa/Lagos. Coordinator review of the stopped C1 handoff against
the G3/C1 dispatch, renewal, coordinator baselines and actual release receipts.
**Decision: BLOCKED / NO APK. No G3 acceptance.** G2 source acceptance stands;
G4 and P2-04 remain held. This review does not redo G2 or accept an APK that was
never produced. Same writer is stopped; its lease is released after this review.

## Specification findings

**High: real R8 closure failure.** Saved release a5 exits 1 at
`:app:minifyReleaseWithR8`; stderr independently contains 27 missing-class lines.
Its command is offline. Earlier Kotlin/Java and ARM64 native build progress is
real, but final release assembly and static APK checks did not complete.
Expo Camera 57.0.6's installed build.gradle changes three barcode dependencies
from implementation to compileOnly when barcode=false; it does not exclude the
scanner implementation. CameraViewModule still registers scanFromURLAsync and
launchScanner with scanner calls. ExpoCameraView references BarcodeAnalyzer;
three analyzer/serializer files import ML Kit/GMS types. CameraUtils uses a
Class.forName availability check, not compile-time removal. CameraRecords imports
Barcode constants and must also be considered in an isolation correction.
Resolved runtime absence alone therefore did not establish a shrinkable APK.

No generic -dontwarn, scanner runtime addition, dependency/provider upgrade or
installed-source patch is an accepted remedy. The writer correctly stopped
instead of suppressing the defect. Path-limit and stale Ninja-cache failures are
separate preserved attempts; a5 progressed beyond them to the real R8 failure.

**Medium: literal permission criterion needs an explicit reviewed amendment.**
The saved merged manifest requests CAMERA plus the exact app-owned
`com.damiyx.retailintelligence.recognitionverification.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`,
declared with signature protection. The merger traces it to AndroidX Core 1.18.0.
It is an internal receiver guard, not Android network/audio/storage/radio access.
The literal only-CAMERA assertion nevertheless failed, and this review does not
silently mark that assertion passed. Retaining and explicitly checking this guard
is preferable to stripping a security control. Final APK and signature remain
unavailable; no package-level permission acceptance is possible yet.

Primary cross-check: AndroidX
[ContextCompat source](https://android.googlesource.com/platform/frameworks/support/+/8fd733189a41fcc1a494c7c3cffb2c253f56e157/core/core/src/main/java/androidx/core/content/ContextCompat.java)
uses this app-specific permission to protect non-exported dynamic receivers on
older Android versions and checks that the app holds it. That source explains
the control; the exact installed 1.18.0 manifest/merger supplies this build's
provenance. A same-signer permission is not a universal isolation guarantee.

## Standards and preservation

Fresh coordinator checks, not merely the writer's conclusion:

- Handoff, result and inventory hashes match STOP and direct report-back.
- All 467 writer entries and 2,413 stage entries hash correctly; separately
  enumerated path sets match exactly. The stage's one node_modules junction is
  indexed by target without traversal. No APK exists in that exact stage set.
- 961 protected source expectations, 2,995 installed inputs, 104 native assets
  and 102 frozen bindings verify. The three current helper hashes and the two
  coordinator renewal overrides are checked explicitly rather than hidden.
- 866 original and 892 saved short-cache artifacts retain exact bytes. All
  twelve blocker originals and their frozen diagnostic copies match.
- No java/javaw, CMake, Ninja, clang/clang++ or Python process was present in the
  coordinator process check before verification. Writer reports processes drained.
- Final receipt states no source repair, scanner runtime, applied suppression or
  phone/model effect. This review did not execute a build, model or phone command.

Evidence: `apps/recognition-lab/runs/phone-experiment/p2-camera-build-g3-c1-review-20261017-a1/verification.json`
and `pathsets.json`, with coordinator verifier source `review.py`. The first
verifier invocation stopped on its own bytes-field assumption for hash-only
frozen rows; that reader was corrected to require sizes only when recorded.
The subsequent complete verification passed. This was a review-tool schema error,
not an application fix or an altered writer assertion. Writer files stayed frozen.

This is a blocker/preservation review. No broad dependency-security or legal
compliance verdict is made. The writer's 24 helper tests, lint and types are
reported evidence, not newly rerun here; unchanged G2 suites need no repeat to
confirm the already-observed R8 failure. Signer, final DEX/native/JNI/assets,
alignment, geometry, actual camera loading, SDK-cache/RAM and physical proof are
still unverified. The earlier cold UI timeout remains unresolved.

## Next action and authority

Concrete proposal: `PHONE_P2_03_G3_C2_PROPOSAL_20261017.md`. A task-only modified
native library would exceed C1's read-only source ceiling and D-054's prohibition
on provider/native-dependency changes. Obtain founder approval of that narrowly
described experimental amendment before dispatching it. No source correction,
permission exception, new writer lease, build or phone action is authorized by
this review alone.
