# P1 native build: stopped review and correction decision

2026-10-12 Africa/Lagos. **Changes required; no APK acceptance.** The reported
build blocker is verified. Native source/setup and intermediate isolation evidence
are reviewable, but neither intermediate output nor previous passing unit tests
can substitute for the failed release build.

## Reviewed evidence

Direct stopped handoff SHA256
fb0f1ac018d382967a7695732246c7139d0804a0fb9c64c79873a39504413f82;
source fingerprint aab75e7535ff4e6f3c8d4764a63f23602c063e69b3d29ebc465a636418e7d12b.
Writer idle/lease NULL and no task-owned Java build process were observed.

- Independently read the pinned API AAR's24-byte Kotlin module header: version
  `[2,3,0]`; exact entry/hash agrees with the worker receipt. Releasea9 reports
  the pinned2.1 compiler rejecting it at recognition-experiment:compileReleaseKotlin.
- Inspected Kotlin generated-only admission/hash/tensor/output/lifecycle code,
  bridge validation, isolated entry/plugin/guard changes and the build wrapper.
  The direct LiteRT imports in the Kotlin module explain compile visibility.
- Rehashed111 resolved runtime coordinates/288 records: no Play/GMS coordinates;
  exact runtime artifact pins retained. Verified41 public/generated/notice copies.
- Independently inspected generated merged manifest: only the app-private signature
  permission, no Android hardware/network/storage/FGS permission, providers or
  receivers; backup/cleartext disabled. Rehashed the521-source Hermes bundle and
  checked absence of business route/Supabase/Router sources. These are intermediate
  checks, not final APK/DEX/signature/privacy or numerical-runtime acceptance.
- Rehashed76,808 protected records and748 unchanged baseline source/config records;
  existing allowed changes are app.config/.gitignore/workflow only. Verified27
  frozen source and1,106 frozen run records. Private buffers were hashed, not decoded.
- Fresh mobile TypeScript check exit0. Fresh targeted Jest: adapter/probe cases PASS;
  root UI case FAIL after exceeding the unchanged5000ms limit;3 suites/3 tests,
  2 pass/1 fail,16.045s. Worker earlier3/3 passing result remains historical.
  No arbitrary repeated test, timeout relaxation or assertion weakening was used.

Independent receipts live in NEW ignored
`apps/recognition-lab/runs/phone-experiment/p1-native-build-review-20261012-a1`.
No coordinator source rewrite, build rerun or device/native/private inference.

## Findings and bounded correction

**NB-C1 — build blocked (high):** retain the pinned Expo/RN/Kotlin/LiteRT/model
and create a Java-only Android helper inside the isolated experiment. Keep LiteRT
as its implementation dependency; expose only Java/Android types to the Expo
Kotlin wrapper. Prove the wrapper's actual compile classpath no longer contains
the incompatible LiteRT API metadata, while the actual runtime/APK still contains
the original pinned CPU runtime. No metadata stripping/compiler bypass, version
substitution, missing-class suppression or broad toolchain upgrade.

This is a bounded internal implementation correction under the founder's existing
build authorization, not a new shared contract or final runtime decision. Gradle's
[API/implementation separation](https://docs.gradle.org/current/userguide/java_library_plugin.html#sec:java_library_separation)
supports the mechanism; actual Android compilation/R8/runtime behavior must prove
it. The version-specific web documentation URL was unavailable; current generic
documentation is not a compatibility result for this build.

**NB-C2 — fresh UI verification timeout (medium):** investigate cold renderer/
interaction timing with bounded diagnostics; preserve the failed execution.
Make the mount/no-inference/failure assertions deterministic without changing
global configuration, increasing timeout or weakening conditions. If only a host
timing risk remains, report that explicitly; do not turn retries into acceptance.

**NB-C3 — lease expired during resumed work (medium coordination gap):** original
expiry05:20:30.205UTC preceded stopped07:14:14.347UTC. Receipt preserved; no
retroactive renewal or waiver. The independent byte comparison found no foreign/
protected changes, but this does not erase the lapse. The coordinator will issue
a fresh exclusive C1 lease. The C1 charter authorizes only that valid holder to
renew its expiry before expiration and record each renewal; expired/mismatched
ownership requires stopping before any further mutation/build.

## Next action

Same writer Sol6.1 HIGH performs PHONE_P1_NATIVE_BUILD_C1_DISPATCH_20261012.md,
using the accepted existing task-local toolchain and a NEW correction receipt run.
Preserve old stopped evidence and snapshot the original source bytes before
correcting live files. Obtain a real release/R8 APK with class/manifest/asset/native/
signing/ZIP/ELF checks, or return concrete unresolved diagnostics. All physical
phone execution, private portability, live camera, calibration and M12 gates stay OPEN.
