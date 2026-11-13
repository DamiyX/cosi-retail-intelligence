# P2-03 mini-app: crop-aware acquisition and preview alignment

2026-10-30. Founder requested this coordinator planning review after S01. Status: planning complete; proposed material geometry amendment, awaiting implementation handoff/model transition. No source, APK, device, slot or allowance changed by this plan.

## Outcome and evidence

Make a legitimate camera crop usable while proving that the saved derivative corresponds to the yellow preview guide. Keep the independent native app and reusable component; do not rebuild the app again or import the old React capture path.

S01 reported buffer 1440x1440, crop [180,0,1260,1440), EXIF6 and proxy rotation90. Only the full-buffer predicate failed. Rotation matched. Current source rejects before JPEG-header comparison, decode and original retention. Thus encoded dimensions, pixels and preview correspondence remain unverified for S01. S00's hidden values remain unknown. Neither result proves a graphics repair or a faulty phone. The originating HAL/resolution-negotiation cause is not established.

Baseline C4 source index 3287f3ce1b80a71bebebca17d6c3d3bb53589ca509a76620e37c2501cd4ba92e; installed APK 24d42811aa5767912173b6b27db6b99de9e12789f90015974a7c3014b47e7ec2. Stopped device evidence: `p203-mini-s01-device-20261030-a1`; coordinator disposition: `p203-mini-s01-coordinator-disposition-20261030-a1/REVIEW_AND_PLANNING_BRIEF.md`, both under `apps/recognition-lab/runs/phone-experiment/`.

## Decision and alternatives

Recommend shared CameraX ViewPort plus explicit crop/coordinate handling. This supports legitimate output and makes preview correspondence a checked contract. It needs geometry and lifecycle tests, but does not require another dependency or renderer.

Alternative: keep full-buffer-only admission and search for a camera configuration that always supplies full crops. Rejected as the next step: no such configuration is proven on this phone, changing requested resolution does not guarantee actual output, and a full crop alone still does not prove preview correspondence. Blindly removing the predicate or center-cropping the requested 1440x1080 would conceal the mismatch.

This plan supersedes only the original standalone plan's non-full-crop rejection for the new geometry recipe, once implementation is authorized. Historical records and their recipe remain unchanged. No RecognitionService, business-data, native-dependency, framework or storage-policy change.

## Acquisition and readiness contract

1. Keep current rear camera, zero zoom, flash OFF, display/target rotation, requested resolution, preview layout, FILL_CENTER and renderer selection. Do not switch to TextureView/COMPATIBLE to obtain a transform as an incidental fix.
2. On the main thread, after the preview is attached and positively measured, obtain `PreviewView.getViewPort()` and bind Preview and ImageCapture together in ONE `UseCaseGroup` with that exact viewport. A null viewport is NOT_READY; no fallback to separate binding. Snapshot viewport aspect/rotation/scale/layout-direction and binding generation.
3. Obtain fresh `PreviewView.getSensorToViewTransform()` at READY, dispatch and callback. Copy matrices; do not retain a mutable SDK object as evidence. Snapshot actual view bounds, location, layout direction, scale type, target rotations and implementation mode. Prohibit custom nonidentity View/ancestor visual transforms for this test surface unless separately represented; do not overlook scale/translation/rotation applied outside this API.
4. Require finite, invertible affine transforms and unchanged camera/binding/layout/permission/foreground/focus/stream/zoom state. A changed transform invalidates readiness. Compare normalized matrix values deterministically; no tolerance that permits scene movement. Exact copied float-bit equality is acceptable within one stable binding; if it causes real churn, report evidence rather than loosening it. No auto-READY, automatic rebind during capture, delayed shutter or deadline reset.
5. On callback, while ImageProxy is alive, copy its dimensions, crop, timestamp, rotation and `ImageInfo.getSensorToBufferTransformMatrix()` plus the current preview transform. Close the proxy exactly once on all paths. Preserve existing worker, cancellation, operation owner and drain rules.

CameraX shared viewport supplies the common sensor-area contract; numeric consistency and later physical registration must still verify the application's use of it. Do not infer common area from matching aspect ratios alone.

## Geometry recipe v2

Use named coordinate spaces, with half-open rectangle edges:

- S: the common sensor coordinate system provided by CameraX.
- B: unrotated JPEG/proxy buffer coordinates.
- V: local PreviewView pixels, not screenshot or global screen coordinates.
- U: the complete JPEG after its EXIF rotation, with positive translated bounds.

Let A map S to B (image metadata), P map S to V (PreviewView), and R map B to U (one supported clockwise EXIF rotation, including translation). Then V-to-B = A * inverse(P), V-to-U = R * A * inverse(P). State matrix multiplication convention explicitly in code; test composition with asymmetric known points, not SDK documentation snippets alone.

Admission remains JPEG-only, one plane, bytes >0 and <=10MiB, positive actual dimensions <=4MP, valid timestamp, supported EXIF1/3/6/8, and current rotation checks. JPEG bounds must equal reported proxy dimensions. Do not substitute requested dimensions, strip EXIF, or add mirrored/unknown-orientation support in this correction.

Replace full-buffer equality with strictly in-bounds nonempty crop validation: 0 <= left < right <= width, 0 <= top < bottom <= height. Invalid crops still refuse. Validate finite/invertible A and P, and that their composition is the expected nonmirrored right-angle/scale/translation mapping. Reject skew/perspective or an unexplained reflection; a bounding rectangle must not hide an unsupported polygon.

Cross-check the inverse-mapped full V rectangle against the native crop in B. Edge disagreement may be at most one B pixel, accounting for viewport integer rounding; numeric epsilon only for floating arithmetic (<=0.0001 B pixel). This is not the physical 1% registration tolerance and must not absorb an incorrect field of view. A default/identity metadata matrix is not accepted merely because it is invertible: it must pass the common-area and corner checks. Missing/inconsistent matrices produce a typed refusal, not fallback center-crop arithmetic.

The visible guide remains [0.1*pw,0.1*ph,0.9*pw,0.9*ph]. Pad each side by 5% of the guide's width/height in V, giving [0.06*pw,0.06*ph,0.94*pw,0.94*ph]. Map ALL four padded corners to U. Verify their corresponding B points lie within the declared crop (only the one-pixel edge-rounding allowance above). Take floor of minima/ceil of maxima once, and bound the derivative by rotated native crop and U image bounds. Record any rounding/clipping; never silently clip a materially out-of-bounds guide. The resulting axis-aligned derivative must be nonempty and rounding error <=1 source pixel.

Keep original JPEG bytes intact. Decode unscaled, rotate once by EXIF and extract the planned U crop. Never apply physical phone pose or proxy rotation a second time. Recycling must handle aliased raw/upright/ROI bitmaps. Preserve <=2MiB PNG derivative and existing memory observations; do not claim SDK/GPU/total RAM hard caps. At 4MP, each ARGB bitmap can approach16MB: avoid an extra intermediate native-crop bitmap or other unnecessary full-size copy.

S01's crop rotated90 gives [0,180,1440,1260), size1440x1080. Use it as a numeric regression fixture, NOT a promised next-camera output or proof of a 2:1 preview mapping. A synthetic 4:3 viewport can map to this rectangle; a mismatched 2:1 transform must fail. A new shared viewport may legitimately return a different crop.

## Evidence, ownership and scope

Version the new acquisition/geometry metadata (`v2`) and provenance. Within existing 4096-byte native record, retain actual buffer/JPEG dimensions, raw crop, EXIF/proxy rotation, A/P/composed transforms, viewport/layout/binding identity, guide/padding, unrounded and rounded U boxes, and invocation/callback times. Use bounded canonical finite numeric serialization and SHA binding. Old v1 data remains readable under its old rules; do not relabel historical files.

Preserve original-before-downstream-pixel-work retention after successful header/geometry admission, original checksum, no-follow/no-replace/sync/readback publication, receipt ordering, partial/refused states, exclusive RecordOwner and canceled-after-commit classification. A geometry refusal must include the specific predicate and bounded numeric observations, without private paths or exception text. Unknown effects remain consumed.

Allowed future implementation paths: `camera-mini/android/camera-component/.../CameraComponent.java`, `Geometry.java`, small geometry snapshot/helper if justified, necessary provenance/metadata consumers, targeted tests and offline verification scripts. App changes only where required to expose typed status or validate the existing view contract. Preserve `PreviewFrame` layout fix. No storage/JNI redesign, extra Activity, arbitrary reader, new dependency/download, SDK change, old-app integration, CI or Git work.

S00 and S01 remain consumed and immutable; cumulative TWO shutters/FOUR preview screenshots, zero exports/transfers. The64MiB aggregate and old253602084 claims remain. Do not add S02, reset/rearm a slot, change startup retained-record validation, increase allowance or install during source correction. Existing single successful-only ZIP allowance is unspent and not expanded. A built corrected component can remain unable to take another real photo until a separately approved fixed-slot packet exists.

## Verification and delivery

The SAME dedicated chat01a18b1c-dddc-76f3-b147-610604e47e08 implements at Sol6.1 High after the founder's implementation transition. It owns complete correction, self-review, local checks and offline signed APK, then ONE stopped handoff. No interim batch audits or second writer. Coordinator independently reviews the stopped result under the selected audit workflow before installation.

Required evidence:

1. Preserve/replay the original S01 refusal as historical evidence; prove the new crop predicate accepts its valid rectangle and rejects negative, empty, inverted, overflow/outside and excessive dimensions. Original parity test is now a historical/full-crop compatibility test; document intended acceptance differences, do not claim old full-crop parity for all inputs.
2. Independent pixel/landmark oracle: asymmetric generated grid with distinct corners, off-center crops, odd dimensions, all four supported EXIF rotations, A2:1 and B4:3 layouts, full/subrect/edge cases and padding. Expected outputs use a separately expressed discrete reference (e.g. enumerated pixel-coordinate rotation), not the production formula or only round-trip agreement. Assert actual decoded derivative pixels where the local Android codec harness supports it; label pure host bitmap doubles honestly. Physical codec proof stays pending when unavailable locally.
3. Real cached API binding plus runtime-contract tests: shared group/viewport; READY before transform exists; changed layout/rotation/matrix after READY, at dispatch and callback; null/singular/NaN/infinite/perspective/mirrored matrices; wrong sensor origin/crop offset; mismatched preview crop; JPEG/proxy mismatch; positive unchanged path. Record actual cached API signatures/bytecode inspected and compile against them. Do not fabricate stub-only API compatibility.
4. Re-run relevant existing cancellation/drain/stale callback/timer/ownership/proxy-close/publication/quota/export tests. Add metadata-size/version/hash and original-retention regression checks for the modified boundary. No retry-until-green or deadline/assertion relaxation.
5. Offline signed artifact: exact source delta/index, dependency graph unchanged, manifest/permission/package/signer/ABI checks, protected-record/slot code unchanged or precisely justified consumer-only changes. Report failures as well as successful commands; no physical acceptance claim from these checks.

Stop after handoff. Source acceptance is NOT P2-03 acceptance.

## Next physical gate, proposed only

After source/artifact acceptance, prepare a concrete separately authorized fixed next slot that retains both failed slots within the SAME64MiB budget; inventory and reserve actual retained bytes. No capture enabled by this plan. One upright A photo/two screenshots with fresh human READY, original/crop/receipt, closed-preview reopen, and existing successful-only bounded ZIP/readback/transfer would test the correction. Prepare command before readiness, retain120s shutter window and existing post/close timing; no automatic retake.

Independent registration uses pre/post preview, full original and derivative: <=2 physical-preview-pixel annotation uncertainty, <=1% upright width/height including uncertainty, <=1 source-pixel crop rounding, full border/eight readable markers spanning >=80% of guide on both axes. Scene obstruction/banding is assessed independently from geometry. Insufficient imagery means inconclusive, not an application pass or inferred crash.

If upright standalone passes, proceed to the already mandatory SAME-component early integration plan and its minSDK/storage amendment review, then integrated normal entry/crop/CPU/result/reopen proof. Only afterward authorize remaining orientation/layout coverage and P2-03 closure; P2-04 stays pending. If this trial fails, classify bind/transform/header/save/registration/crash separately and use exact evidence, not another identical trial.

## Basis checked for this plan

Current C4 Geometry/CameraComponent/Evidence/Activity/PreviewFrame and stopped S01 evidence were read. Cached CameraX1.6.0 `javap` confirms ViewPort/UseCaseGroup, PreviewView sensor-to-view API, ImageInfo sensor-to-buffer API; `JpegImage2Result` carries packet size/crop/rotation/sensor transform into returned ImageProxy. This establishes API availability/metadata plumbing, not this phone's future matrix values. Current PreviewView implementation mode is not explicitly overridden.

Primary documentation checked2026-10-30:
- [CameraX shared viewport/crop contract](https://developer.android.com/media/camera/camerax/configuration#crop-rect).
- [PreviewView sensor-to-view and viewport APIs](https://developer.android.com/reference/androidx/camera/view/PreviewView#getSensorToViewTransform()). Fetch latest matrix; custom app view transforms are excluded.
- [ImageInfo sensor-to-buffer/rotation](https://developer.android.com/reference/androidx/camera/core/ImageInfo#getSensorToBufferTransformMatrix()).
- [CoordinateTransform](https://developer.android.com/reference/androidx/camera/view/transform/CoordinateTransform) requires shared viewport. It is not used as an unverified replacement for common sensor-area binding.
- [PreviewView output transform](https://developer.android.com/reference/androidx/camera/view/PreviewView#getOutputTransform()) has implementation-mode qualifications; avoid introducing a renderer switch merely to use it.

No phone access, image acquisition, APK build/install or implementation was performed for planning. The scoped implementer is stopped. Remaining decisions: implementation/model transition, later exact physical allowance, then separate integration amendments. No claim of zero bugs, graphics repair or completed P2-03.
