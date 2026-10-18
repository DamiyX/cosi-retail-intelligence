# P2-03 G3-C1 stopped handoff: no APK, R8 review required

Completed2026-10-17, Africa/Lagos; original assigned filename retained.
**G3-C1 BLOCKED. No APK. G4/P2-04 held.**

Actual camera and recognition Kotlin, CPU Java, app compilation/bundling and
ARM64 native build get through. The exact pinned offline release fails in
`:app:minifyReleaseWithR8` on27 missing GMS/ML Kit scanner classes referenced by
Expo Camera57.0.6. The intermediate manifest additionally requests AndroidX's
app-owned signature receiver-guard permission; the strict only-CAMERA check is
unaccepted. No semantic repair, scanner runtime, suppression rule or permission
stripping was made. See `PHONE_P2_03_G3_C1_RESULT_20261016.md` for all five attempts,
provenance, failed checks and evidence limits.

## Ownership and scope

Writer `01a1051f-0777-7573-ad09-0e550a4bd56a`; parent
`01a098ef-d830-7531-bca7-2d66b0a5b587`. Same worktree
`C:/Users/doyew/Documents/DEV 2/COSI-m8-planning`, branch
`plan/m8-unified-scanner`, HEAD `66ea3fc22595a48d7355d1729bb879496cc98896`.
No delegate, branch/worktree or Git mutation was used.

Original dispatch `PHONE_P2_03_G3_C1_DISPATCH_20261016.md` plus the October17
resume record govern this result. The original finite lease expired during the
interruption. Writer declined self-renewal and made read-only continuation checks.
Coordinator renewed the same writer through2026-10-17T07:55:12+00:00. Exact renewed
workflow and PROJECT_STATE bytes are separately snapshotted/bound; all other
baseline rows retain original expectations. Writer never edited coordinator
metadata. Current helper bytes were snapshotted before lease-binding changes.

Existing repository edits are limited to the two approved helpers:
`tools/scripts/phone-camera-proof-build.py` and
`tools/scripts/phone-camera-proof-build-config.mjs`. New acquisition helper:
`tools/scripts/phone-camera-proof-build-metadata.py`. Both reports are new.
Generated focused checks, diagnostic collectors and finalizer stay below the
assigned evidence root. Production/mobile/native/installed source, repository
package/lock, models, pins, old tests/runners and prior evidence remain read-only.
No migrations or dependencies were added to repository manifests.

Evidence root:
`apps/recognition-lab/runs/phone-experiment/p2-camera-build-g3-c1-20261016-a1/writer/`.
Stage: `C:/Users/doyew/.cache/cosi-p2-camera-g3-c1-20261016-a1/`.
163 copied inputs and the approved package source-selection delta are separately
indexed. Actual Gradle selects camera source; all acquired compiler artifacts are
fixed and reviewed.54 binaries total26,275,249bytes; no network fallback in final
builds. The existing short cache and fresh task CMake root solve the path issue
without deleting stale outputs or changing toolchain/source. Receipt a5 is the
last release attempt; no rerun follows the real R8 defect.

## Evidence and remaining boundary

- 24 generated helper checks pass; C1 types/lint exit0, lint zero warnings.
- Six exact source/shadow configurations, four rejected opt-ins and actual camera
  source/module selection pass. All157 actual external file hashes bind to
  accepted or reviewed inputs; prior release runtime graphs exclude scanner SDKs.
- R8 executes and fails.27 missing classes, automatic suppression suggestions and
  12 diagnostic copies are frozen in `r8-blocker.json`/`r8-blocker-inputs-a2/`.
  The first strict intermediate permission refusal stays preserved separately.
- No final APK, DEX/ABI/JNI/static signature/alignment/asset acceptance is claimed.
  Intermediate source map/manifest/registration are labelled as intermediate.
- Original cold UI5s timeout remains unresolved. No assertion/timeout was changed;
  no warmed rerun or30-minute stress rerun substitutes for diagnosis.

`preservation-after.json` verifies961 baseline source,2995 installed input,104
asset,102 frozen,9008 broad installed-tree,866 original cache and163 staged input
expectations, with the two helper and two coordinator renewal exceptions explicit.
`short-cache-preservation-after.json` binds the saved892 short-cache artifacts and
any normal additions. `source-path-ceiling-final.json` limits new paths. Final
helper bytes, stage entries (one recorded junction, no traversal), report copies
and writer entries are frozen and hashed. The source fingerprint remains
`360042746d54c6c05cf2ed0e253e87709d05f5bf60357951daee56df7b5b9d0e`.

`build-process-drain.json` and the final freeze check confirm owned build writers
have exited. `writer/writer-stopped.json` is written LAST, read back and binds both
report hashes, writer/stage inventories and the exact blocker. No filesystem
mutation or build command follows STOP. Coordinator owns independent audit,
acceptance and lease release. The one founder-authorized direct completion message
returns the absolute report paths/hashes, STOP and no-APK blocker.

Coding/testing/devops-infra/security/review-audit informed bounded local work and
self-review; no independent assurance agent ran. Missing GLOBAL_MEMORY routing at
both repository locations remains recorded; explicit dispatch supplied scope.
There is no production, legal, device, privacy, camera, geometry or accuracy
acceptance. D-054 logical owned256MiB/B26,009,600 and unproved SDK/RAM limits stand.

Next safe action: coordinator independently reviews the exact R8 closure and
intermediate signature-permission findings, then scopes any permitted SDK/source
isolation correction. No phone/install/model/G4/P2-04 action is initiated here.
