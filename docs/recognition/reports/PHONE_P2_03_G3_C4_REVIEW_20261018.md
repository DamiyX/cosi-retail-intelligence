# C4 independent review — source/static repair accepted with residual timing risk

2026-10-18. Main coordinator reviewed the stopped handoff independently on
Sol6.1High. **Accept the bounded JavaScript import repair and exact APK static
scope. Physical startup, camera geometry and P2-03 acceptance remain pending.**
The source suite is not wholly green: the writer's first rendered real-hook test
exceeded its original 5000ms limit (11864ms). Cause is unresolved; no timeout,
assertion or warm-retry waiver was applied. This was explicitly preserved by the
dispatch. It must not be described as a fully passed test suite or phone result.

## Specification and scope

Independently compared the three application/test deltas with coordinator before
copies: exactly two panel line changes, UI mock retargeting with original assertions
intact, and added fatal deep-import guards in default-route isolation. The small
cameraRuntime adapter uses real installed CameraView/ExpoCameraManager and the
same core permission hook, async wrappers and manager method receivers. It avoids
the actual C3 crash's eager Expo -> Asset bootstrap without adding native modules,
swallowing errors, changing camera behavior or touching the ordinary scanner.
Source/permission/capture checks are scoped evidence, not physical proof.

## Evidence independently checked

- STOP and handoff/result/inventory hashes verified. All 1651 writer entries and
  2957 stage entries/path sets verified; junction indexed without traversal.
- Eight helpers, 972 protected source rows with exactly six allowed writer and
  two coordinator-dispatch metadata deltas, 2995 installed inputs, 9008 broad
  installed rows, 104 assets, 866 original/893 short cache inputs, 6874 frozen
  evidence rows and all 806 exact camera-derivative rows verified.
- Fresh corrected source index: 51 actual files, canonical SHA256
  30223e6d3322605f5ad9635722781418ef8970b5adbcae2029daa5135d6cadb9.
  Native runtime ID36004274... remains a legacy field that does not cover repaired
  JavaScript. Future evidence must bind the external C4 index and exact APK/bundle;
  the old receipt field alone is insufficient provenance.
- Independently inspected actual captured release graph (532 modules/7 premodules)
  and source map (531 sources). Required camera/core-hook nodes and actual source
  hashes bind; no Expo main/Expo.fx/Asset/camera barrel/PictureRef/Camera.types
  runtime module remains. Packaged/generated bundle bytes agree.
- Fresh independent APK signature/certificate and zipalign checks pass. ZIP586
  payloads, all17 ARM64 ELF load/file alignments, DEX10762 definitions/12208 types
  verified. No GMS/MLKit/Firebase type closure. Against C3, manifest/DEX/native
  registration and other payloads remain exact; only JS bundle and two20-byte GNU
  native build IDs differ, independently parsed with every other native byte exact.
- Fresh targeted actual-import and core permission-response tests: 2 passed,
  5 intentionally unselected, 10.055s. This verifies the changed import/method
  boundary; it does not rerun or resolve the writer's cold-render timeout.
  Writer separately recorded original import counterexample failing as expected,
  corrected6/7 with the retained timeout, existing15/15 and types/lint exit0.

APK: writer/recognition-camera-proof-release.apk in the C4 run root,
39,881,316 bytes; SHA256086ee746e8fc02a85131ed355ca8752d560ccfe51de9e11e0b8040b84a47699c.
Signer48550aec63c2b09f7746775002fbc93c3c2ceb95bc388be59e95bcd26a7e2d83.
No phone/install/launch/capture/radio/model/private-image operation in this audit.
No repeated build. Source review does not accept the rest of this mixed project
checkpoint as production ready.

Evidence: apps/recognition-lab/runs/phone-experiment/
p2-camera-build-g3-c4-review-20261018-a1/verify.py, verification.json,
signature.json, zipalign.json, closure.py, closure-result.json and
fresh-startup-tests.json. All earlier failed attempts and STOP files preserved.

## Next action

Writer remains stopped; lease released after this review. Founder authorized
an unfinished-work GitHub checkpoint while asleep, including current source/tests/
documentation, with ignored private photos, build caches, APKs and the local photo
PDF remaining local. The checkpoint is a backup, not milestone/release acceptance.
Resume G4 only with founder available to aim/move the phone; preserve the existing
target and bounded capture protocol. P2-04 ->05 ->06 remain dependent on that proof.
SDK producer-cache/total-RAM hard bounds and physical geometry remain unresolved.
