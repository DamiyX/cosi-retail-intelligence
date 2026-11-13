# P2-03 recovered evidence: independent S4/S5 disposition

2026-10-24. **S3 and S4 verified for scope; P2-03 CHANGES REQUIRED. P2-04 held.**
All twelve physical attempts are completed and their eight original JPEGs have
been recovered. No new phone command, picture, model run, source patch, Git or CI
action was performed by main during this independent audit. Track B is stopped.

## What passed

- S3 independently verified actual Activity recreation, process-death callback,
  tiny-file write/readback and receipt/content preservation on completed restart.
- S4 existing-file recovery completed once. Native/device/host agree on6168761
  bytes and SHA256f2c899be90928e5e4e173a3c6e843c253a7bbb0717eff4ea6440da163cd30478.
  Same currently observed inode1772848; no historic-inode attestation invented.
  Main rehashed every indexed S4 evidence file and independently checked ZIP CRC,
 124 safe unique stored entries and123 exact manifest sizes/hashes. Original and
  exporter source/APK identities remain separate. Original failed export remains
  consumed with no terminal; separate recovery succeeded. All originals retained.
- Independent reconstruction verified36 run-envelope digests/owner bindings,
  all12 profile hashes and seal-terminal hashes. D01 denied/D02 granted/D03
  post-loss restored native checks have zero SDK calls and idle/preview facts.
- L01 cancel/L02 background/L03 unmount suppress publication with observed
  finalized callbacks. Their actions occurred2991/483/2945ms AFTER SDK settlement;
  this verifies pre-handoff suppression, not camera-hardware preemption. L04
  permission loss has exact old-process classification with unknown SDK outcome,
  not observed sensor drain. These are the approved finite control scopes.
- Exact rational FILL arithmetic reproduces all8 native crop rectangles within
  the existing one-source-pixel rounding rule. Arithmetic is not correspondence.

## Blocking finding: rotated preview and photo axes disagree

Specification/correctness severity HIGH, strongly supported. Current
CameraProofFrame.roi uses EXIF-upright width/height and preview width/height as if
both coordinate frames have the same orientation. CameraProofPanel's current
matrix preview/capture path does not bind the missing relative orientation into
that calculation. Observed rotated rows disprove the assumption.

Original-only reviewer froze64 numbered ring measurements before any preview,
transform or paired-coordinate access. Main rechecked all8 input hashes and all
320 threshold/uncertainty computations; then compared against independently
frozen128 pre/post preview measurements, preserving ambiguity. Main evaluates
original uncertainty after conversion to physical-preview pixels, following the
existing2px rule, rather than treating the reviewer's stricter own-source2px
summary as a new acceptance standard. No fitted transform/tolerance change.

| Case | Current qualified center comparisons | Max nominal error in source pixels |
| --- | --- | ---: |
| M00 A upright |12 pass;4 annotation-inconclusive|0.95|
| M01 A90 |14 fail;2 annotation-inconclusive|636.54|
| M02 A180 |14 fail;2 annotation-inconclusive|732.37|
| M03 A270 |16 fail|596.32|
| M04 B upright |14 pass;2 annotation-inconclusive|4.13|
| M05 B90 |14 fail;2 annotation-inconclusive|667.44|
| M06 B180 |16 fail|686.02|
| M07 B270 |16 fail|652.09|

For M01 and M03, six marker centers each lie outside the actual saved crop even
though their corresponding preview markers were inside the guide. Main viewed
M01's exact saved224px tensor preview: the chart is visibly cut off. This is a
functional coordinate-frame mismatch, not a ZIP/upload problem or rounding bug.

Diagnostic only: applying each PREDECLARED case pose as an extra quarter-turn
reduces maximum nominal residuals to<=5.49source pixels across all rows. No angle,
scale or offset was fitted. This supports the missing-relative-rotation mechanism;
it is NOT an accepted runtime transform, permission to hardcode test poses, a
source fix or retrospective relabeling of stored crops/tensors/scores.

## Independent evidence limits and disposition

Damaged-display bands/moire leave annotation uncertainties; the four previously
inconclusive preview markers remain unchanged. Preview-only review also records
non-target display content/desktop strip outside the chart. Main visually
confirmed examples M00/M05. Strict chart-only/black-margins framing is not closed.
Full border/full-guide acceptance is not completed after decisive registration
failure; do not report unrun checks as passed. Sensor timing/continuous
stationarity, native-in-flight physical drain, SDK/cache/total-RAM hard limits and
power-loss/provider-directory durability remain their existing limited scope.

S3/S4 recovery success does not establish camera alignment or general performance.
No inference-speed claim or recognition accuracy result follows from this chart
matrix. Original failed export, ambiguous measurements and old source pins remain.

**Next action:** founder selects Astra, per current M8 planning preference, for a
focused rotation/camera-coordinate correction and bounded verification plan.
Implementation/audit then use Sol6.1 High; interactive tests use Medium. Do not
repeat twelve attempts, add pictures, reset frozen cases or begin P2-04 without
the appropriate reviewed plan and required authorization. Existing images can
support failure-before offline checks; any future physical verification must be
specified separately. P2-04's existing plan is ready, but its hard prerequisite
has not passed. P2-05 planning and GitHub CI repair remain deferred.

Evidence under apps/recognition-lab/runs/phone-experiment:
- p203-export-recovery-s4-device-20261024-a1: original stopped S4 receipts/archive.
- p203-export-recovery-s4-audit-20261024-a1: independent archive/crop/control/marker
  comparison helpers, result JSONs, exact saved M01 preview and review index.
- p203-original-annotation-audit-20261024-a1: independent original freeze/HANDOFF;
  frozen SHA7a0caba3ab7c1ff9a619a0bcff82b87527e59ec422d231aaebf7e0a4e5eae3b5.
- p203-preview-audit-20261023-a1: unchanged independent preview freeze,
  SHA2ab4b9e48107552b1679f11c26f703911e8ecada60506daab53ea7352404d9de.
