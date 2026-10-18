# P1 generated image pipeline: bounded implementation charter

2026-10-12. Founder said OK PROCEED after the completed generated-runtime result
and proposed next image-processing step. Existing phone plan governs this slice;
no new Astra planning cycle or production architecture change is required.

## Outcome and ownership

Same writer01a1051f-0777-7573-ad09-0e550a4bd56a, GPT-6.1 Sol HIGH, sole source/build
owner in `C:/Users/doyew/Documents/DEV 2/COSI-m8-planning`, branch
`plan/m8-unified-scanner`, HEAD66ea3fc22595a48d7355d1729bb879496cc98896.
You are not alone in the codebase: preserve all other contributors' changes.
Do not create agents, branches, worktrees or automations. Coordinator stops source
work after dispatch and reviews only after your STOPPED direct handoff.

Read current PROJECT_STATE, MULTI_AGENT_WORKFLOW, relevant PHONE_EXPERIMENT_PLAN
correctness gate, PHONE_P1_GENERATED_DEVICE_RESULT_20261012.md and this charter.
The original runtime/model is physically verified:9/9 full-vector pairs passed.
Do not restart that experiment or change its Interpreter/options/model/inputs.

Implement generated-only Android decode/orientation/crop/letterbox/float32 probes
in the existing isolated test app; produce a new signed source-bound APK for
independent audit. This slice runs no private images, live camera, recognition,
OCR, model inference, enrollment or business code. Writer has NO device authority.
Founder continuation covers necessary local source/build work. Coordinator owns
the subsequent exact generated-image device packet and installation/run.

Claim to investigate: Android preprocessing geometry and numeric differences
versus the frozen Pillow12.3.0 recipe. Do not imply exact equality merely because
images look similar, hashes match only an oracle, or product labels agree.

## Lease, evidence and preservation

Before mutation/build check holder and unexpired workflow lease. Current valid
writer may renew ONLY expires_at to at most6h from now and updated_at before expiry,
recording old/new timestamps in NEW evidence. If expired/changed, STOP for
coordinator renewal; no retroactive renewal. Original timing-gap history remains.

NEW ignored run: `apps/recognition-lab/runs/phone-experiment/p1-image-pipeline-20261012-a1`.
Freeze current source/protected baseline and snapshots of every changed existing
file BEFORE edits. Protect all previous runs (including successful generated-device
packet and C1 APK), private-data/output, package/lock/config/business source,
accepted model/fixtures/notices, and installed toolchain/runtime assets. Never
reuse stopped fixed-output scripts against frozen runs. Retain all failures and
commands/exits; bounded evidence-driven repairs inside this charter are allowed,
but no retry until green, destructive clean or assertion/timeout weakening.

## Implementation scope

Allowed existing changes ONLY:
- recognition-native/recognition-experiment/android wrapper/helper source and
  Gradle configuration strictly required for GENERATED image APIs;
- src/recognitionExperiment isolated root/types/adapter and matching
  recognitionExperiment* tests;
- experiment plugin only necessary generated-asset/build isolation details;
- phone-native-build-* wrappers only explicit NEW run handling and stronger
  evidence checks, preserving old command/source snapshots;
- Track B workflow lease/state/updated_at only. PROJECT_STATE is coordinator-owned.

Allowed additions: narrowly named generated image pipeline Java/Kotlin/helper
tests under the same internal module, generated oracle/evidence tools under
recognition-lab/tools/phone-experiment or tools/scripts/phone-image-*, matching
tests; NEW PHONE_P1_IMAGE_PIPELINE_RESULT_20261012.md and HANDOFF report.
No app.config/package/lock/global/shared/domain/contracts/schema/business edits,
new native dependencies/compiler/SDK/runtime/model pins, network permissions,
RecognitionService or camera-provider changes. No metadata stripping/skip flags,
new dontwarn or broad excludes. Verify unfamiliar Android APIs using installed
SDK/existing source and authoritative documentation; do not assume their behavior.

### Generated inputs and recipe

Reuse byte-identical P0 image/oracle assets already bundled. Their source is
`runs/phone-experiment/p0-preparation-20261011-a1/tests/ccc990d0-1d7e-40f5-aaa0-9f0d9f23e3b2/image-oracles`.
Validate probe-manifest and each accepted generated JPEG/upright RGB/full/crop
tensor hash. Preserve manifest nativeValidated=false/modelExecuted=false as
historical preparation; real device evidence must be separate.

Start with all EIGHT EXIF orientations, both full image and saved effective crop.
Read manifest semantics/source generator before interpreting width/height or
effectiveBox: those boxes are already effective half-open bounds, not a request
for a second5% padding. Validate raw encoded dimensions and upright mapping.
Include reflection/transpose cases, RGB channel order, odd dimensions/padding,
portrait/landscape, boundaries and generated preview-to-original ROI cases from
accepted mapGuide. Additional small generated controls for downsampling/upsampling,
edge colors and asymmetric crop are permitted only if a documented coverage gap
requires them; freeze their inputs/oracles before observed device outcomes.

Separate mechanisms: JPEG native decode differences; EXIF coordinate mapping;
crop extraction; resize kernel/rounding/letterbox; float32 divide255 conversion.
Use raw-RGB/generated controls to isolate geometry/resize from JPEG decoding.
No EXIF parser/image decoder accepting arbitrary files/URIs in this generated API:
only hash-bound whitelisted asset IDs and predeclared probe configurations.
Prefer existing Android facilities without dependencies. All decode byte/pixel/
dimension/allocation bounds, malformed metadata and invalid IDs/boxes fail explicitly.
Keep one-worker/busy/closed/drain semantics; do not claim true native cancellation.

Exact Pillow LANCZOS equality is an investigative question, not a forced promise.
If native decoding/resize differs, name/version the actual phone recipe and report
complete decoded RGB/tensor mismatch counts and max/mean error by stage. Keep the
original Pillow outputs unchanged. Do not label a bilinear replacement identical
to LANCZOS or transfer the85% laptop accuracy automatically. Freeze any proposed
geometry/float tolerances before phone execution; no post-result tolerance tuning.
Recipe differences can be an honest measured result rather than a hidden failure.

### Results and usable evidence

Keep existing three runtime probe buttons/contract unchanged and no inference on
mount. Add a clearly named generated-image test action, progress/failure/counts,
bounded summaries with IDs, hashes, dimensions/boxes/padding, stage comparisons
and timings. Explain that this is generated geometry/processing verification,
not product scanning. No founder rectangle drawing or label transcription.

Independent stage comparison needs actual phone-generated decoded pixels/tensors,
not only hardcoded oracle hashes or aggregate success booleans. Provide a bounded
structured generated-only local evidence export or equally reviewable extraction
path for full output bytes and receipts. Use existing Android/Expo facilities;
no new library or broad storage permission. If choosing native system CREATE_DOCUMENT,
it must export only the current generated-result bundle, with exact size/count/hash
bounds, no import/gallery/arbitrary caller path/URI, single pending request and
safe cancellation/activity destruction. No actual picker/export by writer. Avoid
megabytes of inline UI text or hundreds of manual chunk clicks; coordinator must
be able to process the complete packet without guessing/transcription. If no
viable evidence path exists within these boundaries, return the concrete blocker.

No repeated model inference is needed for these pixel/tensor probes. Do not change
the verified CPU helper to accept camera/images/private buffers opportunistically.
Later private40-image replay is its own inspected packet, using saved annotations.

## Verification and build

Meaningful unit/Java checks for orientation1–8, half-open crop, one-time padding,
odd rounding, RGB/float conversion, bounds/malformed/rejected fixture IDs, export
size/hash/queue/cancel boundaries and no automatic work; tests should distinguish
actual logic defects. Host/mocked checks are preparation, not Android JPEG proof.
Affected types/lint/tests; actual Java/Kotlin release/R8 build with same task-local
JDK/SDK/Gradle/signing cache. NEW APK same isolated package and internal test signer
is allowed, preserving installed/old APK rather than replacing it yourself.
No downloads beyond already accepted caches; report a new prerequisite first.

Inspect new actual APK: signed hash/certificate, manifest/component/permission/
provider/entry/import isolation, six dependency scopes/no Play-GMS, all native
ZIP/ELF16KB alignment, exact original model/fixtures/notices, new generated assets,
R8/JNI retention and ordinary config/discovery exclusion. No ordinary APK required
unless evidence justifies it; do not claim ordinary native regression from config.
Record APK size separately from installed/memory/live-performance budgets.

Freeze final source/build/generated inventories, preservation comparison, recipe
spec/coverage and exact proposed generated phone procedure/count/outputs. Run
zero private images/model inference/device commands. No Git/cloud/Metro/services/
account/upload/install/phone/WiFi/global environment/recursive delete/cleanup.

## Return contract and end condition

Finish with NEW result and handoff files, exact new APK/source/model/asset hashes,
fresh checks, failures and unmeasured gates. Do not claim acceptance. STOP all
commands/edits; release lease=NULL and set current_state
`phone-p1-image-pipeline-writer-stopped-await-audit`, updated_at only.
You are explicitly authorized and REQUIRED to send ONE DIRECT completion message
to coordinator01a098ef-d830-7531-bca7-2d66b0a5b587 with handoff/result/APK paths,
STOPPED/leaseNULL, pass/fail/blockers and next evidence. If you ask a question and
later finish, report directly again. A file in your own chat is not sufficient;
delivery acknowledgement is not proof the coordinator audit started.
