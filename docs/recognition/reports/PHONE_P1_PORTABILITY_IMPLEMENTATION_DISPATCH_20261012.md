# P1 existing-photo phone portability implementation

2026-10-12. Founder explicitly authorized test-tool preparation/build and audit,
with Sol6.1 HIGH now, and requested notification BEFORE switching to LOW for
physical test execution. This dispatch is local SOURCE/GENERATED preparation and
offline build only. No actual phone command/install/import/inference or private
pixel decoding/materialization by writer. No operational private approval file.

## Owner and purpose

Same sole writer01a1051f-0777-7573-ad09-0e550a4bd56a, GPT-6.1 Sol HIGH. Parent:
coordinator01a098ef-d830-7531-bca7-2d66b0a5b587. Same COSI-m8-planning checkout,
plan/m8-unified-scanner, unchanged HEAD66ea3fc22595a48d7355d1729bb879496cc98896.
You are not alone in the codebase. Preserve every other contributor's work,
including dirty/untracked source. No delegation/new chat/branch/worktree.
Coordinator stops editing/auditing source while your lease is active.

Implement the missing bounded frozen40-photo replay in the existing isolated
Android experiment, so the coordinator can separately audit then execute it.
Do not install an unrelated tool: reuse existing SDK/JDK/LiteRT/Pillow/runtime/
libraries and same signer. No dependency download/version/lockfile/config change.
No schema/business/RecognitionService/recognition architecture/milestone change.

Read current PROJECT_STATE/workflow, MULTI_AGENT_WORKFLOW, original phone plan
section4, generated engine result, image lifecycle C1 RESULT/HANDOFF and
PHONE_P1_IMAGE_LIFECYCLE_C1_DEVICE_RESULT_20261012.md. Accepted image APK SHA
3fd8690cfb9c3b2b2a777eb855687191c6b546d8bc533c62873a0420a2b312f8; actual42/42 image
stages and restart/orphan recovery are accepted for generated scope. Original
CPU9/9 device evidence is separate. Source/compiled/generated math remains pinned.

## Frozen comparison, no new collection

Metadata inputs ONLY during implementation:
apps/recognition-lab/runs/framing-comparison/private-framing-manual-20261011-a1/producer/
- comparison.json SHAe39e28e9af82e5798884767854f745369b23cd18e7c24d140bf8faa00799d6d4;
- annotations.json SHA94dc350fad86fbac717de276970cd1fe1a78edbe9bf60cdd8a49952689bbb134;
- bundle.json SHAaa2964e8a85c81ab5fe8d05fa76fe2716da71d350df12412cd6b15ab95b4a75d.
Twenty references/twenty queries/ten identities, same frozen originals under
apps/recognition-lab/private-data/r1-pilot. Metadata/stats/hashes may be read;
private image pixels/model inference MUST NOT be run in implementation. Do not
dump minified vectors/private images into chat/logs. Metadata stats: originals
106,954,490bytes total, maximum4,175,513bytes; maximum12,484,800oriented pixels;
40control float tensors total24,084,480bytes. Existing marked/effective boxes,
EXIF orientations, identities, roles, replacements and hashes must survive intact.
No redraw/transcription/reclassification/recapture/subsampling/silent downscale.

Prepare one automatic replay with two distinct controlled lanes:
1. Forty exact laptop cropped LANCZOS tensors, generated later by a NEW reviewed
   offline host stage using existing pinned preprocessing, each tensor SHA must
   match the frozen crop bundle. Phone CPU raw1024outputs compare to existing
   frozen laptop vectors: normalized max component<=1e-4, cosine distance<=1e-5,
   retain raw differences/order/near ties/failures. No new host model inference.
2. Forty original JPEGs processed on phone with saved effective crop and the
   accepted versioned center bilinear/gray128/float recipe, followed by same CPU.
   Independently compare recipe tensors/vectors and all20query rankings to lane1
   and original17/20first,20/20top-three cropped baseline. This is a DIFFERENT
   recipe, not equivalence to Pillow or inheritance of85% success.

Prospective device ceiling: one explicit batch, at most80inferences (40perlane),
one CPU interpreter/one worker/queue0, one fixed gallery20references/two perproduct,
full20query denominator. No camera/multi-frame/OCR/four-arm P2/P3/P4/P5 yet.
Normalized cosine, best of two references per identity, deterministic exact tie
ordering must agree with existing ranking.ts/framingComparisonEvaluation.ts.
Query truth never enters inference/selection/matching; truth is for reporting.
Keep lanes separate: no mixed recipe galleries, label-assisted selection or
parameter tuning based on this dataset. All10candidates/ranks and perquery
regressions/improvements retained, not just summary percentages. Missing/failed
reference blocks that lane's complete gallery; failed/late queries remain in20.

## Explicit private input/output boundary

This is an authorized lab-only file-input extension, independently reviewed
before private use. Prepare ONE exact fixed packet/manifest containing originals,
matching control tensors and frozen metadata. No photos/derived private tensors/
vectors in APK/assets/source maps/build logs/cloud/git/tracked source. Numeric
source hash pins and non-image contract metadata may be bound in code when
needed; do not bundle private baseline vectors. Real packet assembly and phone
transfer remain later coordinator-owned execution.

Use existing Android local document facilities without new permissions/library/
provider. Input only exact owned local Downloads system selection; reject cloud,
caller-supplied arbitrary paths/URI and unexpected packet kinds. Inspect bounds,
whole manifest/file hashes/IDs, duplicate JSON keys, zip entry duplication/
traversal/encryption/size/CRC/expansion/type before any decode or inference.
Cap encoded/uncompressed packet to128MiB, metadata to2MiB, each bound JPEG to6MiB,
pixels to12,484,800, control tensors exactly602112bytes finite float32NHWC,
outputs finite nonzero1024. Actual known packet fits these caps; do not truncate
originals to meet them. Streaming/one-image memory ownership; no whole128MiB ZIP
or all40decoded bitmaps/tensors in RAM. Decode exact full resolution, recycle/
release safely; actual memory budget acceptance is OPEN. No broad storage/photo
permission/gallery enumeration or automatic imports/models on mount.

Store only exact task-owned bounded private staging/results in a separate fixed
app-private area; never relabel private evidence as GENERATED or weaken the
generated cache validator. Preserve its accepted restart safety and counter
behavior. Private completion must commit/read-back before export, survive
restart and reject stale/corrupt/mismatched current-source cache. Lost pending
import/export sessions are classified, not resumed; durable request identities
cannot collide with existing generated requests or new process/module instances.
No stale/duplicate callback may authorize a new operation. Unsupported/cancelled/
partial imports produce explicit unready status; no partial batch success.
No automatic deletion of selected documents or unrelated private/cached files.

Export bounded numerical evidence/tensors/hashes/timing/ranks, not original JPEGs;
cap complete result48MiB. Device/laptop comparison checks all records/dimensions/
hashes/counts and independently recomputes ranking. Same tested local-only
Downloads output gate; new private filenames/request IDs, no overwrite. No
private image preview/screenshot during coordinator automation. Save progress/
failure/results honestly; cancellation invalidates session then drains owned
work, not a claim of forcibly preempting native decode/interpreter/blocking I/O.
No foreground service/wakelock/largeheap/keepalive or relaxed budget.

Host private tensor-preparation stage must reuse unchanged reviewed actual
software-radio-OFF/no-usable-uplink predicates, job containment and restoration
proof, bound NEW run/operation/hash/approval. Existing consumed Windows launchers
cannot be rerun/modified/re-published or private processing run while connected.
Prepare generated fixtures/negative checks and a concrete later operational
packet only; no operational approval, private source materialization, radio
commands/toggles or phone accesses. Do not silently redefine offline to unblock
the host. Specify any necessary brief founder toggle/picker actions explicitly.
Phone APK must remain without INTERNET; private execution procedure must record
how device offline state is verified with required human/device confirmations.

## Mutation ceiling, evidence and lease

NEW ignored run p1-portability-preparation-20261012-a1 for source snapshots,
generated fixtures/negative tests/check receipts/build. Snapshot existing source,
all frozen runs/private-data/output, installed runtime files and original assets
before edits; verify preservation after. Never rerun fixed-output scripts/tests
inside frozen runs; redirect every writer BEFORE setup. Do not recursively delete.

Allowed: new narrowly named phonePortability lab schema/evaluation/CLI/tests,
tools/scripts/phone-portability-* preparation/comparison/build checks, new host
preparation controller copies under NEW task-owned Temp root; new bounded private
replay Java helpers/tests in existing cpu-runtime; native Kotlin wrapper and
isolated recognitionExperiment root/types/adapter plus matching tests; build
wrappers only for explicit NEW run handling; result/HANDOFF docs. Generated CPU/
image math/spec/fixtures/options and original tests stay byte-identical when
possible; if sharing requires a change, identify it and prove no option/math/
behavior drift with existing positive/negative/generated parity evidence. No
app.config/package/npm-lock/entry/permissions/dependency/shared-domain/contracts/
business/schema/topology/old producer/old offline guard edits. No downloads,
clean-prebuild, services/cloud/global config/automation/Git effects.

Fresh tests must disprove malformed/stale/partial/reordered/oversized/duplicate/
traversal/out-of-root/wrong hash/recipe/model/missing-gallery/bounds/nonfinite/
cancel/restart/orphan paths, generated two-lane ranking/runtime arithmetic with
near ties and perquery failures. No protection weakening or timeout relaxation.
Run affected lab/mobile tests/types/zero-warning lint, host native contract checks,
actual offline Java/Kotlin/R8 signed release. Verify ordinary-build exclusion,
merged manifest/no network/provider/business drift, source maps/import isolation,
same graphs/assets/JNI/ABI/16KB/signer/model/tensor/runtime options/notices. Package
only generated fixtures/public model; no private assets. Prepare reusable bounded
APK/replay-packet comparators; no physical/private acceptance from host mocks.
Retain failed checks with cause/correction rather than retry-until-green.

Exclusive six-hour writer lease; valid holder can renew only before expiry with
receipt. Workflow assigned writes only lease/current_state/updated_at. PROJECT_STATE
coordinator-owned. If holder/lease changes/expires or material new dependency/
architecture/rights problem occurs, STOP with concrete evidence. No more agents.

## Direct stopped handoff is mandatory

Write PHONE_P1_PORTABILITY_IMPLEMENTATION_RESULT_20261012.md and HANDOFF with
exact APK/source/frozen inventory hashes, changed paths, checks/exits/failures,
isolation/boundaries, packet schemas/caps, reproducible generated checks, actual
unknowns and minimal finite future device/host preparation procedure. STOP all
commands/edits; clear leaseNULL; current_state=phone-p1-portability-writer-stopped-await-audit.
Then send ONE DIRECT completion to coordinator01a098ef-d830-7531-bca7-2d66b0a5b587
using send_message_to_thread. Founder explicitly authorizes this direct return.
File-only finish or a message only in writer chat is insufficient. Return delivery
status honestly. No phone installs/tests until coordinator audit passes AND founder
has been told to switch main chat to LOW for execution. Audit/corrections stayHIGH.
