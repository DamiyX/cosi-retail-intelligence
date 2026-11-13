# C9 fixed A6 export source — implementer stopped for independent audit

Implemented the reviewed scope amendment, source/generated checks only. The
existing exporter now selects only accepted A6 job21b9d32b-5f31-45ac-b453-2a261e9e9ccc,
original JPEGf6557f45aa2188ae38f13ce886838ca3f6e13b0ad012cca96bbc8593a492cf19
(569276bytes) and previewe1684cbf5d2fe39c304bb47d26cd60d3ed499b376066497df60ffbd7c6a38b63.
Capture APKfea1596d...958f6c/source67b2e7bb...0874 and original owner36004274...d0e
stay distinct from the new exporter source and eventual APK. No further photo.

## Changed behavior and exact boundary

CameraEvidenceC9 is the single contained pure helper. It requires canonical,
hash-linked original C7 attempt/terminal records with exact original job, source
ef111de532d7787b4d44d89340f34eb3b8987278b6d9add454ce74261f8bcb84,
APK4eee45f910ff9cc1ceb127f8707d5a4420c0c1b743982019f60e0556326b6827,
16MiB declaration and READBACK_VERIFIED terminal. Missing/empty/torn/forged/wrong
owner/job/APK/source/status records refuse. Legacy and current record parsing
remain separate; no C7 record is rebound to the new selection.

CameraProofFiles admits exactly camera-evidence-export-c9-v1 after that proof.
Root creation consumes its one attempt, including empty residue; reopening never
resets it. Existing Android canonical/type/owner/link/exclusive/fsync IO is used.
Old C7 and C8 namespaces remain intact. C9 current journal records are canonical,
exclusive, hash-linked and bounded; partial records refuse. No arbitrary path,
job/profile or external limit argument is introduced. Adapter selection is fixed.

The existing saved-output16MiB reserve is shared: frozen independently measured
C7 output799317bytes/SHA04c7ddc70163513b6c3d26733c0b36bdcc40f58e9179bbf93076203c7b3cea88
plus C9 strict1MiB <=1847893bytes. This is the expressly reviewed observed-device
admission, not a runtime measurement/general assumption about unknown legacy
outputs. Combined C7+C9 journal metadata stays inside existing128KiB; each of
four possible records also has4096byte cap. No third reserve/cap increase. Full
separate C8 allowance/footprint validation and CameraProofStore status/cap/owner/
scan/resolution logic unchanged. The existing shared write() retains16MiB for C8;
fixed writeSaved() and C9 entries preflight enforce1MiB. TS result validates same
new job and1MiB ceiling. Provider/no-overwrite/readback/cancellation semantics remain.

## Evidence actually run

- Host javac -Xlint:all and six generated native programs:776 assertions total
  (C9 admission/binding/quota67, stationary82, export90, durability188,
  recovery215, finalization134). All exit0.
- C9 exact1MiB ZIP passes;1MiB+1 refuses without exceeding cap. Existing shared
  writer successfully writes1MiB+1 under its unchanged16MiB ceiling. Strict
  old-job/owner/source/APK/header/cap/hash/terminal mutations, empty/partial C9
  roots, reopened attempt, combined metadata boundary/overflow, and old Store
  job rejection covered.128KiB boundary exercise is pure arithmetic; real role
  caps are stricter and do not manufacture a128KiB valid journal fixture.
- Additional isolated entry-validation fixture:23 assertions, all pass. ONLY
  JPEG/PREVIEW hash constants in a separate generated source copy were replaced
  with synthetic header/preview hashes, exact reversible replacement verified.
  Production source pins were never relaxed. Exercises valid nine-role manifest,
  original-byte preservation, separate capture/exporter provenance and exact
  older-job/image/metadata/owner/allowlist refusal reasons. This is NOT actual
  original-photo or full PNG validity evidence; no decoder/model was invoked.
- Focused mobile TS/UI:65 tests/six suites pass,59.464seconds. Mobile typecheck
  and zero-warning lint pass. Android API36/LiteRT installed-jar javac passes
  against actual final Java sources/derived pin. This is source compilation,
  not Gradle/APK build, device execution or release proof.
- Fresh deterministic C9 source-index/check:83 inputs hash match; exporter
  derived SHA source constant equals index digest. Before78 protected inputs:
  exactly seven authorized existing files changed;71 unchanged. Five new code/
  tooling files. Patch and flat before/final snapshots included. Frozen C7/C8
  source-index file hashes and all84 A6 capture evidence files plus STOP reverified
  unchanged. Original owner/stationary-derived pin/old scripts untouched.

No failing execution/check in this continuation. Prior a1 scope blocker and
Windows nested-snapshot failure remain frozen in their original stopped root;
this continuation uses flat snapshots. No retry-to-green/threshold relaxation.

## Files and review artifacts

Existing changes: CameraEvidenceExport.java, CameraEvidenceAndroid.java,
CameraEvidenceJournal.java, CameraProofFiles.java, derived CameraEvidenceExportSource.java,
cameraEvidenceExport.ts and its focused TS test. New: CameraEvidenceC9.java,
CameraEvidenceC9Checks.java, phone-camera-export-c9-source.py,
phone-camera-export-c9-checks.py and phone-camera-export-c9-fixture.py.
No CameraProofStore, capture/model/recipe/contracts/dependency/storage ledger edit.

Evidence root apps/recognition-lab/runs/phone-experiment/p2-camera-export-c9-source-20261023-a2/writer/.
Source-index SHAad195cb12ae90c98f86b259a546c46c62814d5fb04a12af49f49ed431f2c6989;
derived source byte SHA97ae67ac939d733d07f25121924697c793ca114dc34be7dd25cbc6535d16bb8c.
Review.patch SHAe55fb04412364ee8e4ffd2043bd34762d8739d00111191879136e608685a6d01;
self-review.json SHA2f1d5dbb4e6cb4047a60ca133c891ab346d41e610a74e0de88b32d1b94ea5bba.
Full commands/results in h1,u1,t1,l1,f1,a1; fixture-binding.json labels generated
copy. Original/final input indexes and snapshots permit byte-level review.

## Residual risk and next action

Independent main audit pending, especially observed-C7 shared-output assumption,
legacy canonical admission, C9 one-shot/footprint integration and unchanged C8
writer. Actual private legacy journal was not extracted/read in this task;
strict on-device admission can still refuse an unexpected actual record.
Generated HostIO is not Android fsync/alias/hardlink/provider/lifecycle proof.
No APK/build/install/phone/private extraction/public export/network/dependency/
CI/Git effect occurred. Current APK remains the accepted C8 artifact. Original
A6 JPEG is still private, so sharpness, glare, faulty-screen effects and pixel
alignment remain unmeasured. No P2/G4/physical-scale/exposure/stationarity pass.

After independent source acceptance, coordinator decides a separate exact build/
install/export packet. Use a NEW local Downloads filename, preserving prior public
outputs; existing default picker filename may already exist. No automatic next
stage or more capture. GitHub CI repair remains explicitly deferred. Lease is
released at final STOP; no commands/edits follow it, except authorized direct
completion message to coordinator.
