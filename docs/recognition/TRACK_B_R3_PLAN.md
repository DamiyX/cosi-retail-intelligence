# Track B R3 — Android benchmark preparation

Date:2026-10-02. R2 preparation independently accepted. Founder authorizes
sequential Sol6.1 HIGH preparation/audits through R4; all physical checks remain
pending until return. This packet implements usable offline record-validation and
analysis tools, not an Android encoder or executed benchmark.

## Outcome and verified boundary

Prepare a reproducible way to evaluate whether shortlisted visual recognition
candidates run fast and reliably on affordable Android phones. Actual work R3
requires Galaxy A15 and a lower-spec device. Missing real photos, reviewed exact
encoders/exports and physical measurements cannot be replaced by toy vectors.
Use accepted R0/R1/R2 lab patterns and existing Node/TypeScript/Zod/Jest. R2's
comparison adapter imports outputs and does not execute inference; R3 must not
mislabel its Node timing as camera/encoder/device latency.

Build only a lab-local, explicitly supplied benchmark-record validator,
failure-inclusive summary and numerical-equivalence analysis, with a standalone
CLI, public authored fixtures, empty capture template and later-run instructions.
Do not create a second customer app or install/adopt native/model dependencies.
No production RecognitionService, camera, store schema, sales, thumbnails, sync,
package/lockfile, persistent backend or final-model contract changes. No migration.

## Smallest record and report

Versioned records distinguish authored synthetic tooling from reported physical
observations requiring independent verification. Bind each record to validated
R2 candidate declaration/hash, model/preprocessing/space/dimension, exact exported
artifact/runtime/version/precision/delegate provenance and dataset/entry/asset
hashes where relevant. Separate an exported artifact from original weights; do
not pretend the two files must have identical hashes. Draft facts cannot become
measured evidence. Use device pseudonyms/model/Android version, no serials,
accounts, absolute private paths, images or raw vectors in summary reports.

Record explicit trials with unique identity, stage and cold/warm/warmup phase,
finite nonnegative elapsed milliseconds or explicit failure/timeout. The trial
inventory comes from the supplied record, not a claim of complete collection.
Retain failed and intentional warmup counts. Summarize successful latency by
candidate/device/runtime/stage/phase, never pooling cold, warm, camera and inference.
Report successful timing count, all attempted/failure counts and missing fields;
null remains unmeasured, never zero. Median/nearest-rank p90 at n>=10, p95 at n>=20
follow existing lab convention; small samples must not imply tail reliability.
Timing is supplied/unverified; the analysis CLI measures no actual Android work.

Memory stages (idle/loaded/inference/after sustained runs), actual disk/model/runtime/
cache byte measurements, thermal/battery/stability notes, sustained duration and
first-use/restart airplane-mode checks may be missing. Record method and provenance
for supplied observations, list missing coverage and keep independent native
acceptance pending regardless of declared completeness. No invented memory/thermal
safety cap or automatic device pass. Measured versus extrapolated storage must
remain distinct; do not require speculative extrapolation in this preparation.

Numerical-equivalence checks compare explicitly paired reference/native recorded
outputs for the same entry/asset, candidate/preprocessing/space/dimension and
identified export/runtime. Reject duplicates, stale/missing/foreign pairs and
invalid/zero/nonfinite/dimension-mismatched vectors. Preserve failures instead of
comparing successful intersection only. Use centralized vector normalization;
report max error/cosine difference with explicit finite nonnegative tolerances
chosen for the stated experiment, not production guarantees. Near-threshold or
ranking changes remain a later real-data concern. Toy equivalence establishes no
actual export correctness, real inference or universal precision tolerance.

## Verification protocol and limits

RECOGNITION_TEST_PLAN sections26–34 and62 already require camera-ready,
capture-to-result and stable-result latency; repeated scans; actual overhead;
idle/loaded/inference/repeated memory;10–15-minute sustained sessions; offline and
first-use assets. The plan's provisional visual median~1.5s/p95~3s concerns actual
capture-to-actionable result, not isolated inference or supplied toy timing.
Prepare instructions separating cold startup, explicit warmup and repeated trials;
record failures, device conditions, actual hardware and measurement method.
Runtime compatibility with Expo57/RN0.86.3, licence/export review and native adoption
remain separate approvals. No broad model/runtime search is needed now.

Likely files:lab-local benchmark/equivalence/CLI modules and tests, authored R3
fixtures, empty benchmark template, DEVICE_BENCHMARK.md guide and R3_PREPARATION
report. Preserve accepted R0–R2 source/contracts/fixtures. No dependency install,
model download, phone/adb/Metro/Docker/cloud job, spending or Git mutation.

Acceptance is source preparation only: strict valid/invalid binding/measurement
cases; hand-count percentile and failure tests; incomplete versus supplied record
coverage; actual executable positive/negative CLI with explicit exits and confined
ignored outputs; all lab tests/typecheck/zero-warning lint pass. Source review must
not mark work R3's real device gate met. No blocking question for preparation.
