# A6 original relative geometry: measured pass with explicit physical limits

2026-10-23. Host-only analysis of accepted A6 evidence. **PASS for the independently
measured eight-marker preview-to-upright-JPEG registration in both bracket images,
marker outer extents, board-border corners and frozen crop arithmetic.** This is
one nominal upright/Layout-A scene, not full P2-03 acceptance. Whole-scene chart/
black-margins-only framing FAILS: surrounding laptop/context is visible. Continuous
stationarity, exposure correspondence and full-field/all-pose geometry remain
INCONCLUSIVE/unverified. No replacement photo requested and no code fix inferred.

Writer root: `apps/recognition-lab/runs/phone-experiment/p2-a6-original-geometry-20261023-a1/writer/`.
New scripts/derived images/measurements exist only there. No ADB/phone command,
new exposure/model/inference, dependency/network/service, production/source/recipe/
threshold/helper change, canonical tools/scripts addition, Git/CI or P2-04/05
implementation. Finite lease released at STOP; independent main audit pending.

## Frozen evidence and coordinate conventions

Job21b9d32b-5f31-45ac-b453-2a261e9e9ccc; selectedZIP687431bytes/SHAa20fcb77...f6a40.
Nine allowlisted entries exclusively unpacked only after exact accepted hashes;
original JPEG569276bytes/f6557f45...cf19 and previewe1684cbf...8b63 remain unchanged.
Raw1440x1080/EXIF6 rotates once clockwise to upright1080x1440. Pixel-edge transform:
(x_u,y_u)=(1080-y_raw,x_raw); pixel(i,j) center(i+.5,j+.5). Display copy is PNG,
not rewritten JPEG/EXIF or an assertion of Android decoder/tensor equivalence.

Both actual1080x2340 phone PNGs show SurfaceView[45,543,1035,996], verified from
hash-bound owning UI XML before/after capture. Actual Pw=990,Ph=453 agree with
request/numerical receipts. PreviewLocal=Global-(45,543); no nominal full-screen
rectangle is substituted. Status/navigation insets were not freshly instrumented
in A6; measured content origin already includes their displacement. No guessed
inset, density-derived millimetres, distance or lens-FOV calibration is used.
Requested2336x1080 is not the raw JPEG size. LayoutA/contentModeFILL is recorded.

Frozen900x1200 chart/manifest/HTML match the actual capture source-ready index
67b2e7bb9272e7a64a9380f18246d651dcdb3a12856b8b8964318821ccde0874.
Target PNG7ffd7f6f...2ef6a, manifest789f20f6...075f4. Historical draft/final indexes
remain unchanged; the actual source-ready binding, not an earlier draft, is used.
Current accepted C9 source indexad195cb1...6989 is separately preserved.

Exact selected input hashes:

- `apps/recognition-lab/runs/phone-experiment/p2-camera-retake-c8-20261023-a6/preview-pre.png`: 538961bytes, SHA`fc06e984f58b669b5e068e911dc94ce3c01b365c4788ffa174146442f3948678`.
- `apps/recognition-lab/runs/phone-experiment/p2-camera-retake-c8-20261023-a6/preview-post.png`: 534703bytes, SHA`5616ff1a95db2f36da3ab9c32f1a273c09f3881c6986b83117e47328327969e9`.
- `apps/recognition-lab/runs/phone-experiment/p2-camera-retake-c8-20261023-a6/retake-numerical.json`: 51434bytes, SHA`ba2cecda6c3e0e798c564a9b07a07bccc9aeec4785fa3d00b929e29c83a9c85d`.
- `apps/recognition-lab/runs/phone-experiment/p2-camera-retake-c8-20261023-a6/retake-complete.json`: 2505bytes, SHA`4e5a805d9e095d541ac1c77b5bdfdbedf9115a610cb581acf25438ddf56f2d50`.
- `apps/recognition-lab/runs/phone-experiment/p2-camera-retake-c8-20261023-a6/retake-tap-intent.json`: 383bytes, SHA`753b3cf5baa28aede9cded41f01c3eed802c6729d0fe7e05e99ab6e7e74bfefc`.
- `apps/recognition-lab/runs/phone-experiment/p2-camera-export-c9-status-finish-20261023-a1/writer/saved-a6-original-c9.zip`: 687431bytes, SHA`a20fcb77c0b262e01b3e7b3c6c397047a22b6d736dd0bd370d4b2325383f6a40`.
- `apps/recognition-lab/runs/phone-experiment/p2-camera-geometry-c8-source-20261022-a1/writer/target-a2/stationary-chart.png`: 15418bytes, SHA`7ffd7f6fbd778405497bbfc0d2f4649281e19c33c8d8af5c626c87d71f02ef6a`.
- `apps/recognition-lab/runs/phone-experiment/p2-camera-geometry-c8-source-20261022-a1/writer/target-a2/target-manifest.json`: 2774bytes, SHA`789f20f695cf014f3d9e9b1f736dc39b30d2d29776a5ac29eb17bac40d5075f4`.
- `apps/recognition-lab/runs/phone-experiment/p2-camera-geometry-c8-source-20261022-a1/writer/target-a2/stationary-chart.html`: 295bytes, SHA`937f2d8119946bc2245d3d0b86434e3c83cdb00d4945ebc71b950fae2c12aafc`.

`supplemental-input-index.json` binds11 more actual UI/timing receipts to the
accepted84-file capture index551de1ba...1f8e3. `capture-source-target-binding.json`
binds all three frozen target roles to the exact source-ready index.

## Visual quality and independently frozen annotations

Actual original JPEG, frozen target, both full phone PNGs, original-size content
crops and annotation overlays were viewed. All8 asymmetrical marker identities
and complete outer rings/border are visible and unclipped. Rings measure24-26px
in preview and27-29px in JPEG; local contrast supports their boundaries. Strong
magenta cast, horizontal bright/colour transition, vertical glare bands and faint
ghost outlines persist. Founder reports faulty laptop display; that is consistent
with these observations but does not isolate every optical cause. There is no
representative colour-quality/calibration claim. No enhancement/inpainting/redraw.

Each image was independently measured in its own coordinates, without predicted
paired positions. Fixed broad ROIs identify each marker; largest connected dark
outer ring at fixed local thresholds. Center=midpoint of opposing half-open outer
raster bounds, with threshold variation retained. Approximate projected outer
extents include a raster/local-perspective allowance. All24 overlays were visually
reviewed, no missing/ambiguous marker silently substituted. Manual border corners
were separately marked on own-coordinate raster grids +/-2px. No fitted warp,
scale tuning, feature matching or crop shifting.

**Annotations frozen before geometry code/residuals:** annotations-frozen.json
SHA`81c014798844794b134d92be031273b7a5153f81d5df7853650b4a5ede661d2a`. Centers have declared1.0-1.5 own-pixel
uncertainty per axis, outer edges1-2px; JPEG uncertainty converted to physical
preview pixels by the frozen scale also meets<=2. These are explicit annotation
envelopes, not statistical confidence or proof against arbitrary systematic bias.
Method/ROIs/all threshold observations/outer edges/corners are retained in JSON.

One host-only guide-colour selector initially stopped with591 candidates below
its diagnostic1000-pixel assertion. Actual alpha-blended stroke samples informed
a revised colour heuristic BEFORE freeze/residuals; final component4612pixels,
bounds[98,44,892,408] in each preview. Original refusal retained, no physical
acceptance threshold changed. No marker coordinate revision occurred.

## Frozen mapping and every marker result

Oriented W1080,H1440; s=max(990/1080,453/1440)=11/12, ox=0,oy=433.5.
Mapped=(previewLocal+[0,433.5])/(11/12). No capture-fitted parameters.
Frozen1% limits are10.8sourcepx horizontally and14.4vertically. Conservative
residual envelope adds previewU/s+JpegU; even its worst upper bound must pass.
Maximum nominal |dx|=0.590909px (0.054714%W), |dy|=0.363636px (0.025253%H).
Maximum uncertainty-inclusive upper errors3.727273px/3.000000px, below10.8/14.4.

Coordinates and signed errors are (x,y); U column is pre/post/JPEG own-pixel
uncertainty. Full per-edge/worst-case tables are in geometry-results.json and CSV.

| Marker | Pre local | Post local | Upright JPEG | Pre error | Post error | U pre / post / JPEG | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 442.5,87 | 442.5,87 | 483,568 | 0.273,0.182 | 0.273,0.182 | 1,1.5 / 1,1.5 / 1,1 | PASS |
| 2 | 636,82.5 | 636,82.5 | 694,563 | 0.182,0.091 | 0.182,0.091 | 1,1 / 1.5,1 / 1,1 | PASS |
| 3 | 640,362.5 | 640,362.5 | 698,868.5 | -0.182,0.136 | -0.182,0.136 | 1.5,1 / 1.5,1 / 1,1.5 | PASS |
| 4 | 447,363.5 | 447,363.5 | 487.5,869.5 | -0.136,0.045 | -0.136,0.045 | 1,1 / 1.5,1 / 1,1.5 | PASS |
| 5 | 538.5,85 | 538.5,85 | 588,566 | 0.545,0.364 | 0.545,0.364 | 1.5,1.5 / 1,1 / 1.5,1 | PASS |
| 6 | 637.5,223 | 637.5,223 | 695.5,716 | 0.045,-0.182 | 0.045,-0.182 | 1,1.5 / 1.5,1.5 / 1,1 | PASS |
| 7 | 542.5,362.5 | 542.5,362.5 | 592,868.5 | 0.182,0.136 | 0.182,0.136 | 1.5,1.5 / 1,1.5 / 1,1 | PASS |
| 8 | 445,225.5 | 444.5,225.5 | 485.5,719 | 0.045,0.091 | 0.591,0.091 | 1.5,1 / 1.5,1 / 1.5,1.5 | PASS |

All16 marker outer-extent comparisons also PASS, maximum nominal edge errors
0.909091px horizontal/0.545455vertical, including their recorded uncertainty.
All8 independent border-corner comparisons PASS, max nominal1.363636x/1.636364y,
with +/-2preview/+/-2JPEG envelope added. Measured board spans only~26% of preview
width/~74%height; do not extrapolate this central chart to global lens distortion,
extreme guide corners or equal CameraX FOV under all poses. Candidate FILL relation
is supported at these observed points only, never silently switched to FIT.

Observed golden guide stroke-center edges[99,45,891,407] differ from exact80%
edges[99,45.3,891,407.7] by[0,-.3,0,-.7]physicalpx, within the1px annotation envelope.
This rendered-stroke quantization is distinct from source crop rounding.

Map exact80% guide, add5% of mapped width/height ONCE PER SIDE. Exact padded
source edges[64.8,502.56,1015.2,937.44]. floor minima/ceil maxima/clamp gives
**[64,502,1016,938]**, identical to numerical effectiveBox. Integer edge errors0;
signed rounding[-.8,-.56,+.8,+.56]sourcepx, all<=1. Width952/height436/ROIbytes1245216
also agree. Using raw dimensions instead of EXIF-oriented size would incorrectly
produce[86,250,1354,830]; the explicit oracle rejects that confusion.

## Timing and physical limits

Capture was2026-10-23 03:17WAT (recorded UTC02:17). Pre screenshot command interval
02:17:32.940-34.011UTC; tap command02:17:34.025-34.171; first numerical UI observed
by02:17:40.651; modal close02:17:40.676-.816; post screenshot02:17:40.829-42.084.
Monotonic intervals are authoritative for durations: pre-command1062ms, end-to-tap
16ms, post-command1250ms, outer screenshot bracket9140ms, tap-to-post-start6812ms.
Native requestToReceipt1168.932923ms/inference62.892923ms are saved one-shot metrics,
not exposure timestamps or a latency acceptance. Exact shutter/frame times unknown.

Pre/post marker center drift max0.5physicalpx x/0y, within summed annotation
uncertainty. It is not proof of continuous stationarity during the9.14s bracket.
Founder said phone supported; precise support object/physical motion instrumentation
was not recorded. Keep physicalFovProven/cameraProofAccepted/geometryStatus receipt
flags unchanged. Unmeasured absolute scale/exposure/stationarity are not waived.
Framing was not chart/black-margins-only; incidental context remains local and is
excluded from chart-only figures. No analysis of unrelated context performed.

## Remaining P2-03 physical coverage

| Layout | Nominal physical pose | Actual evidence status |
| --- | --- | --- |
| A | 0 | MEASURED_RELATIVE_REGISTRATION_PASS_WITH_LIMITS |
| A | 90 | NOT_EXERCISED |
| A | 180 | NOT_EXERCISED |
| A | 270 | NOT_EXERCISED |
| B | 0 | NOT_EXERCISED |
| B | 90 | NOT_EXERCISED |
| B | 180 | NOT_EXERCISED |
| B | 270 | NOT_EXERCISED |

A0 refers to founder's nominal upright positioning, not a measured IMU pose.
Earlier C6 A used990x1100, unlike A6's990x453; labelA alone does not establish
identical content geometry. C6 successful capture/commit and later different-PID
saved-state persistence stand (PHONE_P2_03_C6_CAPTURE_PERSISTENCE_AND_TRACK_B_HANDOFF_20261019.md).
C4 failed reservation/old classification and C6 recovery are retained
(PHONE_P2_03_G4_C4_DEVICE_RESULT_20261018.md and C6_GATE_C_DEVICE_RESULT).
C7 export and accepted C9 original readback/transfer/accounting stand; none cover
other pose/layout or in-flight lifecycle rows. Count6 is admission history, not
six successful matrix combinations or proof of unused future capacity.

| Boundary | Actual supported result | Still open |
| --- | --- | --- |
| Permission | Founder allowed C4 immediately; granted/USER_SET observed | Deny/request-error/revoked while active not physically exercised; initial denied state is not choosing Don't allow |
| Background/unmount | Normal picker/background/return and generated cancellation tests | Outstanding camera capture background/unmount/permission loss plus native drain/stale result physical controls |
| Cancellation | Retained failed initial chain/classification, generated cases | Deliberate physical user cancel during owned camera job; no credit from ordinary navigation |
| Persistence/storage | C6 new-process saved profile; C9 update/launch/postexport preserved count6/owned4356993/idle; old interrupted admission/classification | Capacity/low-disk boundary, power loss, OEM/SDK peak/total RAM hard caps; sdkHardCap/nativeValidated false |
| Export | C7/C9 selected generated original readback/hash/provenance and chosen public transfer | Provider directory/power-loss durability false, exact human Save time unknown; future job export capability not established |
| Privacy/offline | Reviewed static noINTERNET/gallery boundary and selected-file export scope | No new runtime offline/radio/network/invalid-private-input physical proof; incidental context violates chart-only framing |
| Performance/decoder | Actual one-shot receipt metrics and original EXIF/crop arithmetic | No p95/live3s/accuracy acceptance; Pillow is not Android decoder/tensor parity |

P1 image-picker intentional process-death evidence is a separate pipeline and
is not camera-in-flight lifecycle acceptance. Generated tests/mock helpers/static
APK checks cannot fill physical rows. Full P2-03 acceptance remains pending;
P2-04 plan unchanged/implementation held, P2-05 separate, GitHub CI deferred.

## Verification and smallest next proposal

Final **15 oracle checks PASS/0failure/0error**, oracle-a2 exact input snapshots;
previous12-pass run retained. Checks cover EXIF1-8, raw/upright, offsets, physical
origin, padding once, half-open boundaries/odd sizes/clamp, synthetic coloured ring/
distractor/blank and conservative PASS/INCONCLUSIVE/FAIL decisions. These are
calculator/detector oracles, not extra physical trials. No new dependency; installed
Pillow/Numpy, figure drawn using Pillow because matplotlib absent. Five scripts
AST checked at final closure; exact code/output hashes in analysis-output-index.

Smallest next device packet PROPOSAL: zero-exposure capability/readiness survey
with fresh same C9identity/idle/accounting/slot facts; founder oneB layout selection
thenA restore, own UI XML bounds/readiness only, no preview screenshot, capture,
model, Save/export or install. Up to two bounded fresh read-only recoveries per
incident under founder policy. No ruler/chart aiming needed for rectangle-only
step. This proposal is NOT execution authority; main first audits measurements.

Before future pose capture, resolve evidence path and finite budget: current C9
exporter is fixed to A6 and consumed, stationary C8 has separate fixed-job/history.
No reset/repin/replay or generic private-file exporter. If another narrowly bounded
job export capability is required, a High source/review/build lane and explicit
privacy/scope decision precede exposures. Reconcile seven untested matrix rows
and prior trial count with original finite ceiling; do not assume free capacity.
Full rationale/limits/human actions: next-device-packet-proposal.md.

Main independently audits frozen measurements before scoped acceptance, code
correction or any new physical packet. All prior inputs/source/build/P204plan
preserved. Writer releases lease and STOPs before direct authorized completion.
