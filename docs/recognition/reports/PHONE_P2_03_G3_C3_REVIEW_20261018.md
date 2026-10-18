# P2-03 G3-C3 independent acceptance

2026-10-18, Africa/Lagos. **G3 VERIFIED FOR THE EXACT BUILD/STATIC SCOPE.**
The coordinator reviewed the stopped C3 handoff, independently verified the
artifact and preservation, and closed C2's manifest finding. This is not physical
camera acceptance, completion of P2-03/P2, production readiness or an accuracy claim.
G4 remains pending; P2-04 does not begin through this review. Writer lease released.

Exact accepted test APK: `apps/recognition-lab/runs/phone-experiment/p2-camera-build-g3-c3-20261018-a1/writer/recognition-camera-proof-release.apk`.
Size 39,986,324 bytes; SHA256
`6097b9d59ceb44e0844af3b60d9c0d4a590ceb7206d54ea50dcba8b0604d0a99`.
Certificate SHA256
`48550aec63c2b09f7746775002fbc93c3c2ceb95bc388be59e95bcd26a7e2d83`.

## Findings resolved

**Specification:** Fresh official aapt2 decoding of C3 versus the coordinator's
previous C2 decoding proves exactly four removals: the three optional device
libraries and CameraX VENDOR_ACTION query. An independent indentation/tree reader
compares every retained manifest node/attribute, ignoring only source line numbers
and attribute order. All remaining manifest semantics match. CAMERA plus the exact
D-055 signature guard remain; backup/cleartext are false, approved launcher/deep
links and disabled CameraX service remain, HTTPS visibility remains, and shared/
native-library declarations and vendor query are absent. No signed APK patch or
runtime/source workaround was used. The generated overlay bytes match the stage.

The native camera derivative remains exactly C2's 806 indexed source rows and
fingerprint `187019dce6c54652bd3b61d5fa69d38534d3077f1b2d3bafc129451fc7a0d4a3`.
The original recognition/model/recipe pins are unchanged. C3 source selection and
offline R8/assemble receipts are source-bound, and the actual successful release
was not repeated by the coordinator. No native algorithm/provider/dependency or
ordinary app change was needed to close the manifest finding.

**Standards:** No material unresolved finding for this static gate. The STOP
remainingGates template still calls its first audit C2; actual outcome, report
paths, artifact and this review consistently identify C3. This is a low-impact
metadata label; preserve the immutable STOP rather than reopen a finished build
to change it. It does not move any physical gate to accepted.

## Independent evidence actually run

Coordinator-only scripts and receipts are under
`apps/recognition-lab/runs/phone-experiment/p2-camera-build-g3-c3-review-20261018-a1/`:
`verify.py`, `verification.json`, official `signature.json`, `zipalign.json`,
`manifest.json`, `badging.json`, and `correction.py`/`correction-verification.json`.
Both complete verifier runs passed. No APK/model/native library was executed.

- STOP-bound handoff/result/inventory hashes match. Exact hashes and separately
  enumerated path sets match for all 326 writer and 2,955 stage entries; junction
  targets are indexed without traversal.
- 972 protected source expectations (exactly three approved existing helper
  deltas), 2,995 installed inputs, 9,008 broad installed entries, 104 assets,
  6,486 frozen bindings, 866 original and 893 short-cache artifacts verify.
  Six current helpers and all 806 camera base/derivative hashes verify. The
  approved canonical derivative fingerprint and still-photo helper body match.
- All 586 APK payloads match the recorded hashes. The coordinator freshly
  parses both DEX tables: 10,762 definitions and 12,208 unique types match the
  inventory, with no GMS/ML Kit/Firebase types or definitions.
- Fresh official apksigner verifies the exact certificate, official zipalign
  passes, and independent ELF/header/ZIP offset parsing verifies all 17 ARM64
  libraries have 16KiB-compatible load segments and placement.
- Independent C2/C3 ZIP comparison proves every DEX, bundle, model and other
  asset byte unchanged. Only manifest and two native payload hashes differ.
  A fresh PT_NOTE/GNU parser identifies one 20-byte build ID in each rebuilt
  library; masking precisely those descriptors makes every other file byte
  equal. This is stronger than relying only on a section-name comparison.
- Eight fresh negative cases exercise the actual pure overlay helper: changed
  base bytes, INTERNET permission, shared library, native library, backup,
  downgraded signature guard, exported service and additional package query all
  refuse. Positive generation/final comparison succeeds against exact stage and
  preserved final XML. The official decoded-manifest comparison is separate.

The writer's 19-case overlay suite, configuration isolation, dexdump, graph,
registration/entry, notices and 44 retained JNI signature/export checks are
reviewed source-bound evidence, not all independently rerun. The C2 coordinator
already ran the three original configuration tests; unchanged source/payload
evidence justifies reuse. No unnecessary successful release or broad stress rerun.

## Residual risk and next action

Native loading/OEM camera fallback after optional-library removal, preview/capture
geometry, cancellation/background/restart behavior, live/offline timing, radio,
privacy and recognition accuracy require the separate physical G4 packet. The
original cold UI 5-second timeout remains unresolved. D-054 logical owned 256MiB
storage remains; SDK producer cache and total RAM do not have proven hard bounds.
All 583 native declarations are inventoried, not dynamically tested. Geometry is
INCONCLUSIVE until measured. The source-reviewed OkHttp Conscrypt string remains
an explicit optional reference, not a scanner SDK or a general reference waiver.

Next: prepare/review the exact generated-target G4 phone packet bound to this APK,
then obtain the required fresh physical-test readiness/approval before installing
or opening the camera. No phone/ADB/install/camera/private images/model/radio/Git
action occurred during this audit. No requirement to retake or reannotate the
earlier 40 product photos follows from G3 acceptance.
