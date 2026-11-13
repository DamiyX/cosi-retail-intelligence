# Recovery dependency C1 — independent review and S2 fresh-build continuation

2026-10-24. Decision: **C1 source correction and offline graph accepted**.
Main verified exact stopped/handoff/verification/source-index/graph digests,
606 unique current source inputs,599 preserved prior inputs and only the two
approved existing deltas: module build.gradle and derived RecoverySource.java.
The Gradle edit is ordinary Core/Core-KTX1.17 declarations/comments; Activity1.8,
normal conflict selection and dependency-locking policy remain. No force,
exclusion, new lifecycle declaration or lock change was added.

Independently rehashed409 actual artifact rows across eight configurations.
Module Core/Core-KTX1.17/Activity1.8 resolves offline; app/camera Core/Core-KTX1.18
selection is retained. App/camera/CPU artifact multisets (coordinate,bytes,hash,
including duplicate rows) equal the last accepted capture-build graph.
The module-edge additions are the direct Activity/Core transitive closure;
all binaries match reviewed cache records, with one documented historical case.

The exact Tracing1.2 AAR (6060bytes,
6faa90390d1fdbf0adb9a99bf99de67b94c6c6f35aea9510593a9d17973736a2)
matches the independently reviewed P1 lifecycle packet. Main verified that old
ledger/review's hashes and current cached AAR. This admits only those exact bytes;
app/camera final Tracing selections remain unchanged. Initial coordinator
comparison incorrectly compared a coordinate's POM/module metadata hashes with
its binary AAR hash; corrected to the artifact tuple without changing inputs.

Actual log contains only :app:p2ResolvedArtifacts in the main build plus Gradle
plugin tasks; BUILD SUCCESSFUL. No app compilation/APK/phone result is inferred.
Evidence: apps/recognition-lab/runs/phone-experiment/
p203-export-recovery-dependency-c1-audit-20261024-a1/review-result.json.
Unchanged implementation retains the accepted709 JVM/28 UI results; they were
not repeated for the declarative graph correction. Actual Android delivery,
grant lifetime, original-photo integrity and geometry remain unverified.

## Authorized S2 fresh offline build, Track B Sol6.1 High

Apply PHONE_P2_03_EXPORT_RECOVERY_BUILD_DISPATCH_20261024.md with these explicit
superseding pins/paths. This follows the founder's existing implementation request
and main's stopped C1 review. One source-frozen offline APK build/static evidence
task; no phone approval is granted. Preserve the failed first build and C1 probe.

- Current exporter source-index SHA256
  eed896702c8dbc7490b51e1371986f1a13571787e0c7bcade45adfb672d5a1f5,
  606 inputs. Derived RecoverySource.java SHA256
  91809532b21c52ee863e610f7676c0f41835f467ae1e437a934c9f567827c308.
- Reviewed C1 resolved graph SHA256
  a13e0eac88abbdb4b5073a5c584ebb955b7e0289b01d14cc34bb0b4a1c1f856b.
  Compare actual build graph with this graph and explain any real delta; do not
  substitute the older graph that caused the already fixed module selection gap.
- New evidence root: apps/recognition-lab/runs/phone-experiment/
  p203-export-recovery-build-c2-20261024-a1/.
- Use a NEW private staging root, recorded before creation. Old failed/C1/source
  stages and helpers remain read-only. No existing runtime/test/lock edit and no
  regeneration of historical capture-source or current frozen exporter bindings.

Verify/stage current reviewed inputs, freeze adapted helper and invoke exactly
one offline release build using existing cached tools/artifacts. No download,
network fallback, force, lock relaxation, source workaround or compiler-compatibility
suppression. If actual compilation reveals another issue, STOP with its cause
and evidence; do not patch staging or silently retry.

Collect source-to-stage mapping, actual toolchain/resolution evidence, exact signed
APK bytes/hash, same signer/package/update compatibility, isolated enabled and
non-exported recovery Activity/unchanged permissions in binary manifest, native
payload delta, ABI/16KiB alignment and signature results. Original capture/model/
recipe/run/old-root pins remain exact. Source/build/static checks never accept
S3 Android lifecycle or S4 recovery. Report any concrete fixture-method gap before
device execution; no new hooks may be implemented under this build-only slice.

Claim null lease, one writer. No other agents, APK install/ADB/phone/picker/fixture/
export/Save/transfer/capture/model/Git/CI/P2-04/05. End STOP/release lease and
return one concise artifact handoff. Founder authorizes one completion message
to main coordinator01a098ef-d830-7531-bca7-2d66b0a5b587 containing the handoff path.
