# C9 independent artifact audit

2026-10-23. Coordinator decision: ACCEPT WITH RESIDUAL RISK for the exact static
artifact. No blocking specification or standards finding. This does not prove
successful phone update/export, full-resolution alignment or P2-03 acceptance.

APK SHA256 9939439b1ab3e7c4ff29184ec767e85c28e8f5f3f9d821febce788cc6c814145,
39944042 bytes. Compared with accepted C8 fea1596d...8f6c /39944046 bytes,
not the unrelated historical Git diff. Writer stopped and lease was null before
review. No builder evidence file or production source changed during audit.

Fresh coordinator review.py/result.json under
apps/recognition-lab/runs/phone-experiment/p2-camera-export-c9-artifact-independent-review-20261023-a1/:

- Rehashed STOP, handoff, evidence-index, all128 evidence files,83 current source
  inputs, eight old static inputs,1029 old-stage and1031 new-stage files,138 actual
  external dependency files. Every expected size/hash matches. Extended Windows
  paths used for hashing; no false missing-file claim.
- Fresh apksigner verifies same48550aec...e2d83 certificate; fresh zipalign16KiB
  check and aapt2 verify exact package/min24/target36/ARM64. Manifest/resources
  byte-exact C8, so no permission/provider/network/backup capability delta.
- Independently compares all ZIP payloads and semantic service-loader mappings.
  Exactly eight changed payloads: two DEX, two generated ART profiles, bundle and
  three libraries.18 ARM64 ELFs pass16KiB load alignment;15 exact, three differ
  solely in independently parsed GNU build-ID descriptors. Other assets/model/
  licences unchanged. R8 mapping IDs match actual DEX markers.
- Actual DEX parsing validates checksums/bounds, fixed A6 job/JPEG/preview and
  new C9 source/namespace, without forbidden business/test-harness types.
- Metro module set and premodule order match C8; only cameraEvidenceExport.ts
  source bytes change. Builder's source/stage graph, R8 class/backport movement,
  generated profiles and component-coordinate checks reviewed alongside fresh
  file/payload comparison. These are static code/packaging facts.

Builder executed one601.255-second offline release, exit0; reviewed captured
intent/logs/closure. Coordinator did not rebuild or claim reproducibility from
a second build. Builder's final evidence-index prefix error was packaging-only,
retained and corrected before STOP; no artifact/source/checker retry by builder.
Coordinator's first audit checker expected old sdkVersion field; actual aapt2
uses minSdkVersion. initial-checker-failure.json preserves that failure. Corrected
the field name with required24/36 values unchanged; second audit exits0. This was
not an APK or product defect. No assertion loosened to admit a changed capability.

Residuals: actual preserved private data/UID, old C7 journal admission, SAF IO/
readback/cancel/restart, native filesystem and runtime behavior remain unverified
on C9. Frozen observed C7 output budget is not a general public-storage measure.
Original A6 photo remains private; sharpness/glare/marker uncertainty/geometry and
remaining P2-03 physical matrix remain pending. No phone command occurred here.

Next: High host-only finite execution-helper preparation, coordinator review,
then Low exact data-preserving update/export packet. No fresh photo/model run.
P2-04 plan PHONE_P2_04_IMPLEMENTATION_PLAN_20261023.md is now saved per founder;
implementation remains gated by P2-03. P2-05 awaits separate planning. Older
builder statement that both plans await Astra is superseded. CI remains deferred.
