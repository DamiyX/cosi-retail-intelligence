# P2-03 orientation correction — Astra implementation plan

2026-10-24. **Planning complete; proposed bounded source correction, not implemented or accepted.**
Founder requested Astra planning, then a pause to switch to Sol 6.1 High.
P2-03 remains CHANGES REQUIRED; P2-04 implementation stays held.

## 1. Finding and decision

The independent S4/S5 disposition establishes a real coordinate-frame defect:
six rotated cases fail correspondence, and M01/M03 saved crops exclude six
markers visible inside the guide. All eight crop arithmetic checks pass. The
recovered originals are intact; this is not another export or storage failure.

Source inspected for this plan:

- `apps/mobile/app.config.ts:37` locks the app to portrait.
- Installed `node_modules/expo-camera/android/src/main/java/expo/modules/camera/ExpoCameraView.kt:105-120`
  changes ImageCapture targetRotation using physical orientation. Preview is
  separately created/bound at lines 469 onward; its target is not updated by that
  listener. The capture callback receives ImageProxy, but currently discards its
  geometry metadata before resolving the JPEG.
- `CameraProofFrame.java:111` applies centered FILL/FIT using EXIF-upright dimensions
  as though the upright photo and preview share axes.
- S5's declared-pose diagnostic reduces nominal residuals to at most 5.49 source
  pixels without fitting. This supports the mechanism, but is not runtime proof.

**Recommended correction:** in the isolated camera experiment only, synchronize
photo target rotation to the actual preview display rotation and attest that
binding for each capture. Keep EXIF normalization and the existing crop formula
when its same-frame precondition is verified. Physical phone rotation must not
independently rotate the saved coordinate frame away from the locked preview.

Alternative: carry full sensor/preview/photo transforms and map guide corners
through them. This is a larger integration, especially because the current use
case group does not set a shared viewport. Do not silently adopt it if the small
correction fails. Report concrete evidence for a separately reviewed amendment.
Do not hardcode case IDs, physical test poses, sensor orientation or EXIF values.

## 2. Source implementation boundary

Same Track B writer, Sol 6.1 High, owns the approved correction and generated
checks, then stops and returns a handoff. No parallel writer. Main audits after
the stop. This document does not dispatch implementation or authorize photos.

Likely files:

- `apps/mobile/plugins/withRecognitionExperiment.js` plus a small versioned,
  checked-in camera patch/applicator and its tests under the existing tooling.
- `apps/mobile/src/recognitionExperiment/CameraProofPanel.tsx` and the existing
  camera proof/matrix request types and native adapter.
- The isolated native module and `CameraProofAndroid.java`, `CameraProofFrame.java`,
  matrix profile/binding/store readers and test fixtures only where necessary.
- New test-run source/recipe/profile identities and evidence-export allowlist.

Implement a reproducible, exact-version/source-hash-checked Expo camera amendment,
not an unexplained edit left only in node_modules. It must be idempotent, fail on
unexpected upstream source, appear in the source/build evidence, and preserve
default camera behaviour outside the isolated experiment. Prefer an explicit
opt-in native property; do not change every app's camera orientation globally.
No new camera package, dependency version, business API or recognition model.
If a new native dependency is actually necessary, stop for review before adding it.

Native requirements:

1. On the UI thread, when preview is laid out/streaming, set the experiment's
   capture target to the preview's actual display rotation. The physical
   orientation listener must not overwrite it while the option is enabled.
   Set this after use-case creation too; clear it with the view's lifetime.
2. At capture admission snapshot view/use-case generation, actual display and
   capture target rotations, preview pixel bounds/scale mode, back-lens identity,
   mirror/zoom state, and available native camera sensor orientation. Bind the
   snapshot to the one capture/job, not a later JS orientation reading.
3. In the capture callback, record actual ImageProxy dimensions, crop rectangle
   and imageInfo.rotationDegrees before closing it, plus the same generation
   and rotation observations. After saving, bind actual JPEG dimensions/EXIF
   and bytes hash. Do not equate requested pictureSize with actual output size.
4. Reject stale/unknown/mismatched display, use-case, layout, mirror or rotation
   evidence. Preserve existing callback finalization/cleanup even on refusal.
   Fail before inference/publication if the same-frame contract cannot be
   established. A physical sensor-orientation event alone is not a display
   rotation change in the locked portrait UI.
5. Specify and test raw-buffer -> EXIF-upright -> preview coordinates explicitly,
   including direction/sign and half-open rectangles. Do not apply EXIF rotation
   twice. Assert metadata consistency for the supported rear-camera path;
   unsupported mirrored/ambiguous cases refuse rather than guessing.
6. Preserve crop padding, FILL/FIT policy, decoder/allocation limits, cancellation
   ownership, resource accounting and inference recipe except for the explicitly
   versioned orientation contract. Synchronized rotation does not itself prove
   identical preview/photo field of view; physical registration remains required.

Freeze the concrete metadata schema and mapping in the implementation handoff.
Snapshot-before/after alone does not prove absence of a transient change: record
a native monotonic geometry generation and reject if it changes during the job.
Do not introduce a second exposure, hidden retry or replacement of a consumed case.

## 3. Preserve existing evidence and export recovery

Keep all original photos, profiles, recipes, failed exports and audit freezes
unchanged. Existing v1 records remain readable as historical evidence; do not
retroactively attach new rotation metadata or mark old crops corrected.

Use a new recipe/profile version and fresh run IDs for new captures. Keep model
weights fixed. A host-derived image from an old original is diagnostic only,
not a new device result or recognition score. Preserve the accepted recovery
Activity/journal/process-death handling. Extend export by an exact new run binding,
not arbitrary paths or general private-storage export. Generated round-trip export
must include the new metadata and prove restart recovery before physical capture.
Recalculate space reservation for retained old evidence plus the proposed new run;
do not delete old evidence or silently exceed the existing cap to make room.

## 4. Finite verification sequence

### A. Host/source checks — no phone or new photos

- Retain the independent failure-before result on the eight frozen originals.
  Reuse those bytes for diagnostic expected-frame overlays; no reannotation,
  fitted alignment, threshold change or claim that legacy photos attest new code.
- Generated asymmetric grids verify all four display/target rotations, sensor
  quarter turns, both layouts, non-square dimensions, and supported EXIF mapping.
  Include wrong-sign/double-rotation, stale generation, changed layout, null
  display, absent/malformed metadata and requested/actual-size disagreement.
- Verify default Expo behaviour is unchanged when opt-in is off; physical
  orientation callbacks cannot override it when on; rebuild/rebind restores it.
- Run existing camera ownership, cancellation, permission, storage and export
  regressions affected by the patch. Test rejection during callback still closes
  ImageProxy and settles the owner. No weakening of the historical controls.
- Main independently reviews source, reproducible patch and tests. Then prepare
  one reviewed APK/build packet and update-in-place installation; never uninstall
  or clear storage. Source success is not physical camera acceptance.

### B. Physical geometry — proposed later budget, not authorized by this plan

The minimum complete geometry matrix is **eight new photos: two layouts x four
physical poses**. All eight rows need valid evidence: six previously failed and
the upright rows still have scene/annotation limitations; the repair also changes
the capture path. Do not repeat the four interrupted captures merely for symmetry.
Their accepted scoped results remain, unless source audit identifies a changed
control boundary requiring a specific additional test and approval.

Before asking for photo authority, verify export/recovery with generated data,
review capacity, and give the founder the exact eight-photo packet. Before each
shutter, verify full-screen target, black margins only, whole border/eight markers
inside the guide, and border extent >=80% of guide width AND height. Review the
preview for damaged-screen interference/legibility before consuming a case.
Improve framing/display/lighting first; if the current screen cannot meet the
gate, stop with that concrete limitation rather than taking unusable pictures.
No requirement to buy equipment or assume a printer is available.

Use the first upright row to check capture, metadata and export/readback before
continuing the remaining seven. Keep sequential bounded exports in the reviewed
packet if needed for this early check; do not improvise new export authority.
Each photo needs fresh READY and a two-minute capture window; no late shutter,
automatic replacement or resetting failed/uncertain attempts. Setup questions
remain pending while the founder positions the phone. Testing agent uses Medium.

Independently freeze original and preview measurements before correspondence.
Unchanged acceptance: <=2 physical-preview-pixel annotation uncertainty, <=1%
oriented-image width/height registration error with uncertainty accounted for,
and <=1 source-pixel crop rounding; also verify scene, full border and guide
extent. An inconclusive row is not a pass. Inspect actual saved tensor previews
for clipping and verify the exported metadata/hash bindings.

## 5. Completion and handoff

One concise source handoff: files changed, exact patch/source hashes, test commands
and results, geometry contract, remaining limits, and explicit STOP. Track B must
notify the coordinator directly when finished; routine recoverable setup/file
questions go directly to the founder, not through repeated coordinator approval.

P2-03 closes only after independent source/build and physical evidence acceptance.
Then dispatch the existing P2-04 plan; do not replan P2-04 here. P2-05 and GitHub CI
remain deferred. Existing unknowns about SDK cache/RAM, physical sensor drain and
power-loss durability remain scoped limitations, not silently claimed guarantees.

**Now:** pause for founder to switch back to Sol 6.1 High. Next authorized slice
should be source implementation and host checks; phone presence is unnecessary.
