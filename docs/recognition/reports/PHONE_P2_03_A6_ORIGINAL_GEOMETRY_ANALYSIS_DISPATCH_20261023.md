# P2-03 A6 original image quality and relative geometry analysis

2026-10-23. Founder requested continuation through P2-03 before P2-04. Existing
Track B writer, Sol6.1 High for new diagnostic measurement code/technical analysis.
Interactive phone tests remain Medium under the October23 routine-recovery policy.
This is HOST-ONLY analysis of accepted existing generated-chart evidence, no
phone operation, new exposure, model inference, production correction or new plan.

## Exact starting point and ownership

Writer's C9 export work completed and STOPPED; coordinator independently accepted
the original transfer in PHONE_P2_03_C9_ORIGINAL_TRANSFER_INDEPENDENT_REVIEW_20261023.md.
Use explicit COSI-m8-planning worktree/plan-m8 task branch, preserve all dirty work.
Claim finite analysis lease, NEW ignored root:
apps/recognition-lab/runs/phone-experiment/p2-a6-original-geometry-20261023-a1/writer/.
Keep any scripts, measurements, derived crops/plots and logs ONLY in that new root;
no tools/scripts addition that changes frozen C9 source-renderer inputs. New
handoff: docs/recognition/reports/PHONE_P2_03_A6_ORIGINAL_GEOMETRY_HANDOFF_20261023.md.
No child delegation; same sole writer stops/releases/directly notifies main.

Read existing approved geometry procedure, not a replacement threshold:
PHONE_P2_03_CAMERA_REVIEW_PACKET_20261014.md sections4/6, later clarification
PHONE_P2_03_C8_PHASE_A_AUDIT_AND_PIXEL_GEOMETRY_CONTINUATION_20261022.md and
PHONE_P2_03_C8_STATIONARY_OBSERVATION_CHECKLIST_20261022.md (millimetre requirement
superseded ONLY by the explicit relative-pixel-registration amendment).
Use PHONE_RETAKE_C8_A6_INDEPENDENT_REVIEW_20261023.md, actual A6 numerical/request/
capture timing/preview rectangle and frozen target-manifest.json. Respect
PHONE_TEST_EXECUTION_RECOVERY_20261023.md; don't escalate routine host/path issues.

## Frozen evidence

- Exact selected ZIP: p2-camera-export-c9-status-finish-20261023-a1/writer/
  saved-a6-original-c9.zip;687431bytes/SHA
  a20fcb77c0b262e01b3e7b3c6c397047a22b6d736dd0bd370d4b2325383f6a40.
- Only A6 job21b9d32b-5f31-45ac-b453-2a261e9e9ccc. Original JPEG569276bytes/SHA
  f6557f45aa2188ae38f13ce886838ca3f6e13b0ad012cca96bbc8593a492cf19;
  native preview PNG SHAe1684cbf5d2fe39c304bb47d26cd60d3ed499b376066497df60ffbd7c6a38b63.
- Original pre/post phone PNGs: p2-camera-retake-c8-20261023-a6/preview-pre.png,
  preview-post.png, bound to its84-file accepted capture index. These are the
  temporal bracket, not the native224px processed preview in the ZIP.
- Frozen chart: p2-camera-geometry-c8-source-20261022-a1/writer/target-a2/
  stationary-chart.png,900x1200/SHA
  7ffd7f6fbd778405497bbfc0d2f4649281e19c33c8d8af5c626c87d71f02ef6a,
  accompanying manifest/HTML. Eight labelled square markers and outer border.
- Accepted source83 indexad195cb1...6989 and original C8 capture binding67b2e7bb...
  remain unchanged. Raw observed1440x1080/EXIF6, requested2336x1080, preview990x453,
  layoutA/FILL, effective upright box[64,502,1016,938]. Re-read actual receipts;
  do not confuse requested size, raw size and oriented size.

Verify inputs/hashes before pixel decode. Unpack only validated allowlisted ZIP
entries into NEW root with exclusive files; originals/EXIF never rewritten.
Lossless orientation/display copies and analytical overlays are derived evidence
with recorded transforms/hashes, not repaired originals. Use installed libraries/
cached pinned Python only; no download/new dependency, service or web upload.

## Work and acceptance oracle

1. Inspect original JPEG, target and both original phone PNGs using actual image
   viewing. Explain sharpness, glare/magenta tint, damaged-display artefacts,
   ghosting, clipping and visible marker identity. Distinguish the screen's colour
   rendering from crop/geometry. Quality is adequate only if the required
   boundaries/landmarks can be located with defensible uncertainty; a global
   sharpness score alone cannot prove this. No enhancement/inpainting/AI redraw.
2. Establish actual preview content rectangle in each phone PNG, global-to-local
   coordinate conventions, raw EXIF transform, oriented dimensions and expected
   half-open pixel-edge convention. Verify insets from actual evidence; do not
   assume a nominal full-screen preview. Preserve captures' request/completion/
   bracket timings and unknown sensor-exposure/stationarity intervals.
3. Independently locate each of8 marker centers/outer boundaries in pre-preview,
   post-preview and upright JPEG. Store a measurement table with method and
   uncertainty for EVERY marker, including missing/ambiguous observations.
   Preserve measurement revisions/reasons; freeze/hash coordinates before
   computing registration residuals. Detection/annotations must not select
   locations according to the expected mapped answer or desired pass.
4. Apply frozen FILL mapping with oriented W,H, preview Pw,Ph:
   s=max(Pw/W,Ph/H), ox=(sW-Pw)/2, oy=(sH-Ph)/2;
   x=(previewLocalX+ox)/s, y=(previewLocalY+oy)/s. Compare independently measured
   JPEG landmarks, separately for pre/post frames. No per-capture fitted warp,
   learned correction, scale tuning or shifted crop to force agreement.
5. Derive the80% guide[.1Pw,.1Ph,.9Pw,.9Ph], map to upright JPEG, add5% of mapped
   width/height once per side, floor minima/ceil maxima and clamp. Independently
   verify numerical effectiveBox and edge rounding. Respect actual content mode;
   if FILL correspondence itself is not established, classify it unknown/mismatch
   rather than silently switch to FIT or assume equal CameraX FOVs.
6. Frozen thresholds: each x/y landmark registration residual<=1% of oriented W/H;
   annotation uncertainty<=2physical preview pixels; crop rounding<=1sourcepixel
   per edge. Show per-marker residual/uncertainty, edge errors and every mismatch.
   Missing measurements or larger uncertainty means INCONCLUSIVE, never a pass.
   A clearly measured threshold violation is FAIL for that geometry, not merely
   blur. Quantify drift between bracket frames, while retaining the limit that
   non-simultaneous screenshots/human support do not prove continuous stationarity.
7. Any new calculator gets small meaningful oracle checks (EXIF6/raw-versus-upright,
   offset/aspect mismatch, physical/global coordinates, half-open floor/ceil/padding,
   clamping and boundary cases). Preserve code/commands/results/hashes. Reuse
   installed pure primitives, but don't use the implementation under test as its
   sole geometry oracle. Pillow JPEG decoding is not a claim of exact Android
   decoder/tensor equivalence. No new tensor/model run.

Do not infer absolute physical scale, distance, lens FOV, sensor exposure or an
upright-only product requirement. No ruler needed for this relative subtest.
Do not change any source/model/recipe/cap/threshold or ask for a better-looking
replacement photo. If original quality or mapping fails, finish with the actual
evidence and a narrow proposed next diagnostic/correction, not repeated capture.

## Finish P2-03 evidence map and next packet proposal

In the same stopped handoff provide a concise remaining-coverage ledger against
the approved original eight layoutA/B x physical pose0/90/180/270 combinations
and permission/background/unmount/cancellation/storage/privacy observations.
Point to actual reviewed physical results where present; generated fixtures,
source tests, app launch, APK checks and one photo do not accept untested rows.
Do not assume all earlier tests must be repeated or all rows passed. Separate
this A6 relative-geometry outcome from full P2-03 acceptance.

Propose the smallest finite next device packet only if its prerequisites are
supported, grouping routine setup/read-only recovery under the new policy.
Mark which steps truly need founder positioning/input. No device execution in
this assignment; no new product enrollment/P2-04 or P2-05 plan. Respect historical
consumed attempts; don't claim unused capacity without current reviewed evidence.

End with exact input/output/hash/measurement/code evidence, PASS/FAIL/INCONCLUSIVE
for defined subclaims, limitations, unresolved discrepancy and next safe action.
Use one integrated handoff, release lease/STOP and directly notify main. Keep
PROJECT_STATE concise and workflow byteJSON/ensure_ascii=True explicitUTF8, preserve
full prior history. No Git/CI repair/publication. Main independently audits the
stopped measurements before any acceptance, code correction or new physical test.
