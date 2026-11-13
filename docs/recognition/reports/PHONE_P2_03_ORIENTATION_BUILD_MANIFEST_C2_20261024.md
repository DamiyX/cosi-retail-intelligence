# Orientation build C2 — restore approved generated camera manifest

2026-10-24. Main confirms C1 APK is BLOCKED/DO NOT INSTALL. Independently hashed
APK35991c9d655ccbf0e558023c331e0568fa122785eed826e426fbd6572094a62a
and read actual aapt2 badging: CAMERA permission absent. All81 indexed C1 evidence
files match. Evidence: p203-orientation-build-c1-manifest-audit-20261024-a1/.

Confirmed cause: broad source overlay copied recovery-generated
apps/mobile/android/app/src/main/AndroidManifest.xml (SHA8428d0a5268ad9f39f33c3d765969d8cac2b13b217af5e746deed7bdca4c6987)
over the camera-enabled build scaffold. It removes CAMERA and lacks the camera
vendor query/optional-library removal policy. Replaying dangerous/manifest mods
only adds V2 metadata; it does not restore the already-approved camera permission.
This is a generated staging defect, not a new camera runtime failure.

Bounded correction: same Track B Sol6.1High, NEW p203-orientation-build-c2-20261024-a1
output/private stage. All700 workspace source hashes/pin remain exact. Preserve
the prior source, C1 failed APK/stages and all evidence. Retain accepted C1 camera
autolinking/settings correction, actual graph prechecks and instruction-aware R8
verifier; no repeat of already resolved string-only reflection false positive.

In the NEW private stage, restore the known accepted camera-enabled base manifest
from C:/Users/doyew/.cache/cosi-p203-recreate-fix-20261024-a1/app/android/app/src/main/AndroidManifest.xml,
requiring SHAe6da8b9c7aa40cd6b5acf54e8b6b821ba301c576a5fa5664f066e5329efb5c10
before use. Replay reviewed V2 manifest metadata against it. This explicitly
permits that generated manifest derivative instead of byte-copying the recovery
manifest among700 inputs. Record full source-to-stage exception/diff/hash; do not
claim a byte-identical overlay where this permitted generation changes bytes.
No runtime, plugin, package, lockfile, permission policy or source-pin edit.

Before :app:assembleRelease, run offline manifest processing ONLY and inspect the
actual merged result. Require the approved CAMERA-only permission/isolation policy,
no Internet/audio/storage/location permissions, preserved application/exported
component policy, removed vendor camera query and optional uses-library entries,
and only reviewed V2 metadata/non-exported Activity additions to the compatible
baseline. Check all attributes/queries/providers/services/receivers, not CAMERA
alone. Preserve findings and stop without a release if any unexplained delta remains.
Also reassert actual autolinking chooses the patched camera derivative and full
matching native/public V2 flags. Freeze helpers/staging/provenance before ONE
offline release attempt. No network/dependency change or runtime fix in staging.

Then perform every original build packet's actual APK/signature/R8/JS/manifest/model/
ABI/alignment/graph/update check. Inherit no artifact pass solely from C1's APK;
verify the new artifact. C1 source/build successes are scoped evidence, not a
manifest acceptance. Existing storage timeout remains unverified.

Routine bounded tooling corrections within this exact staging scope may be handled
by the writer with retained evidence. Source/dependency/policy changes stop for main.
No ADB/install/photo/export/private inference/Git/CI/P204/P205/new agent. STOP/release
lease and send main one completion message with concise handoff/artifact pins. Main
audits actual artifact before preparing phone installation/generated export checks.
