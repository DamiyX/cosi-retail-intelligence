# P2-04 — guided phone enrollment implementation plan

2 November2026 current continuation: founder authorized implementation using
this existing plan after scoped P2-03 acceptance. Apply
PHONE_P2_04_NATIVE_BASELINE_DISPATCH_20261102.md for the verified native camera,
later storage decisions and current same-agent delivery workflow. The original
dated baseline and proposal statements below remain historical; no phone action
is authorized by source dispatch.

2026-10-23. Founder requested this plan only, with P2-05 reserved for a later
planning session. DOCUMENT-ONLY / NOT DISPATCHED. P2-03 acceptance remains a
hard prerequisite to source implementation. Planning is permitted while its
separate C9 build continues; this plan changes no active source or build input.

## Outcome and scope

Enroll the agreed ten familiar products on the isolated phone app. For each,
guide the operator through front, rear, complementary view 1 and complementary
view 2; preserve progress across interruption; review and freeze a local gallery.
The first two references are exactly a subset of the four, so later comparison
does not confound different reference selection. No manual boxes or label
transcription. This phase produces reference evidence, not recognition scores.

The founder's eventual experience is one pan around a product that acquires
useful views and its barcode when visible. This slice implements a guided
turn-and-pause session with explicit Capture for each view. It does not claim
automatic viewpoint detection, 360-degree reconstruction or continuous video.
This is the recommended first bounded form of that experience: it preserves
known view order and requires no unverified automatic frame-quality selector.

Barcode acquisition belongs in the same session, with explicit confirmation of
the intended product/package and a visible “Barcode acquired” state. Its native
compatibility gate below must pass before enabling it. A visual-only fallback
is a separately labelled partial delivery, not completion of combined enrollment.

No query scans, four-arm evaluation, P2-05 implementation plan, OCR/spec matcher,
colour/pattern matcher, model replacement, business catalogue integration, cloud
upload, new platform product identity or production scanner changes are included.

## Inspected baseline and dependencies

Read together with PHONE_P2_PLAN_20261014.md, PHONE_P2_TICKETS_20261014.md,
TRACK_B_FOUNDER_REUSE_AND_ENROLLMENT_NOTES_20261016.md, SCANNING_ARCHITECTURE.md,
PROJECT_STATE.md, MULTI_AGENT_WORKFLOW.md and D-054 plus its later amendments.

Current P2-03 capture/save and C9 export source checks are accepted within their
scope. Original-image export, sharpness/alignment and remaining physical matrix
are not accepted by this plan. A successful build cannot satisfy those gates.

Inspected implementation:

- Lab `src/phoneCapture/enrollment.ts` has ordered slots, replacement history and
  revisions, but explicitly generated kinds, two-element fake vectors and trial
  truth in its freeze schema. Do not import this schema into real enrollment or
  relax it to accept camera data. Reuse its invariants and regression scenarios.
- Lab `store.ts` uses Node filesystem/crypto and a fixed generated directory.
  It is not an Android durability adapter and must not enter the mobile bundle.
- Mobile `cameraProof.ts` validates native jobs/receipts and frozen model/recipe
  provenance. CameraProofPanel owns the current one-shot camera lifecycle.
- Mobile `cameraRuntime.ts` deliberately narrows Expo Camera imports. The isolated
  plugin/native closure and current camera view do not establish barcode support.
- Existing proof roots, C7/C8/C9 one-shot export journals and historical images
  remain immutable evidence. New enrollment must not consume their fixed slots.

At dispatch, pin the actual accepted P2-03 source/APK and audit reports. If its
accepted layout, recipe, ownership or interface differs, reconcile this plan
before coding. Restrict enrollment to physically accepted configurations; do not
infer support for untested orientation/layout combinations.

## User flow

1. Show experiment purpose, available storage and the agreed product roster.
   Select one local experiment product/package; distinguish similar sizes in
   the roster. Names are operator labels, never model inputs or inferred truth.
2. Show four labelled progress slots and the next view instruction. Keep the
   whole intended product inside the verified guide. For cylinders, turn to
   expose different label surfaces; for boxes, use complementary sides. “Four
   views saved” means saved slots, not proven complete surface coverage.
3. Operator steadies the product and taps Capture. Disable capture/navigation
   that would start another job until the current native owner completes/drains.
   Show Saving, Saved, or the concrete failure; never silently retry.
4. Review the saved view, with Keep or explicit Replace. A replacement creates
   new evidence and preserves the previous record. No score-based view selection.
5. If barcode capability is accepted, observe codes during idle preview between
   captures. A candidate prompts “Does this code belong to this product/package?”
   Confirm once, then show Barcode acquired while continuing remaining views.
   No barcode visible is a valid explicit state and never blocks visual enrollment.
6. After four committed views, mark that product ready. Freeze the gallery only
   after all ten products and review requirements are complete. Show a concise
   receipt with gallery revision, product/view counts and barcode disposition.
7. On return after interruption, show saved slots and an interrupted operation.
   Resume only on explicit action; never take a photo automatically.

Capture readiness expires on backgrounding, permission loss, layout change or
camera remount. A remote physical test additionally needs fresh human readiness
and the existing two-minute/no-late-photo protocol. No overnight physical capture.

## State, storage and ownership

Create a separately versioned observed enrollment schema and app-private store.
Use experiment-local product/package IDs; no business SQLite migration. Keep
native storage authoritative; React state renders validated native snapshots.

Reference records bind product, ordered slot, unique job ID, original/derivative
hashes, validated dimensions/orientation, vector dimension, source/model/recipe,
device/runtime identity and capture/commit observations. Validate dimension from
the frozen model contract, finite values and normalization; never use the lab's
fake two-dimensional vector. Store no future query identity or ranking truth.

Gallery freeze hashes canonical ordered references and bindings. It must work
before query images exist; P2-05 can bind its own trial manifest to this immutable
revision later. Changes after freeze create a new revision and cannot alter old
evidence. Metadata and numerical gallery target remains <=32 KiB per product;
measure the complete representation before claiming that target is met.

One global experiment operation owner covers capture, decode/inference and
publication. Logical cancellation invalidates publication immediately, but Start
remains blocked until native drain. Stale/double callbacks cannot publish a slot,
clear a newer owner or attach a barcode to another product. Capture provenance
must be real native job evidence, not a caller-supplied file path.

Before work, reserve worst-case owned bytes and persist an in-progress record.
Commit files and metadata through the accepted descriptor-safe native durability
primitives. A crash yields the old valid state or the new valid state; no partial
ready gallery. Recovery classifies residues, retains committed slots and remains
idempotent. Reject hash/version/binding mismatch, path escape, links, oversize,
missing references and duplicate slot/job identities. Never repair by deleting
old proof data or weakening the Android file protections.

Preserve D-054: total experiment-controlled storage <=256 MiB including all old
proof roots, reservations, staging, images, derivatives, metadata and exports.
SDK temporary storage and total RAM remain separately measured exposure, not a
proven hard cap. Keep existing <=12 MiB JPEG and <=4 MP admission. Ten products /
forty active reference slots are maxima, not a promise they fit. Replacements
consume budget; full storage stops admission with an honest incomplete result.
No silent eviction, recompression, cap increase or unbounded replacement history.
Bound metadata/event counts before allocation; retain the existing 4096-event
ceiling and define exact byte limits in the reviewed schema. Reserve future
query capacity only when P2-05 is planned; do not promise 115 retained images.

## Barcode compatibility gate and bounded policy

Before barcode source changes, inspect the installed camera's supported detector
path and the isolated build's actual transitive closure. Reuse an existing offline
detector only if it works with this camera and needs no new permissions/network/
runtime model download. Public API availability alone is not evidence of closure.
No new dependency or provider is approved by this plan. If adoption requires one,
return a bounded proposal and obtain explicit review before changing the boundary.

Serialize barcode and visual work initially: attach the detector only in idle
preview; detach before capture and through native drain; resume with a new epoch.
This is a proposed schedule, not proof that the library stops native work when
a callback is removed. Verify actual lifecycle/resource behavior; if quiescence
cannot be demonstrated, stop the integration gate rather than claim serialization.

Accept only reviewed retail symbologies with bounded payload length and proper
format/check-digit handling. Preserve raw payload/type and explicit normalized
identity; no URL opening, network lookup or automatic QR interpretation. Declare
the exact allowed formats and alias rules in the compatibility packet, reusing
the project's existing barcode rules where applicable. Deduplicate repeated
callbacks; cap pending candidates; conflicting codes require user resolution.
Never use the first visible background code as automatic association. If detector
bounds are not trustworthy, require a deliberate barcode presentation plus human
confirmation. Same code across different experiment products is a visible conflict,
not an automatic merge. Persist accepted identity atomically with its product and
epoch; absent, declined, conflicting and unreadable remain distinct dispositions.

## Sequential implementation and evidence

All work uses the existing Track B real-photo experiment tool chat. Sol 6.1 High
for implementation/corrections; Low for an already reviewed fixed device script.
No child delegation. Each slice stops and sends a direct handoff; coordinator
audits before the next slice. No automatic chaining across a failed audit.

| Slice | Deliverable | Acceptance evidence |
| --- | --- | --- |
| 04-A | Observed schema, native durable enrollment adapter and generated fault tests | Ordered slots, genuine vector schema, atomicity, recovery, quota accounting, immutable freeze; no phone |
| 04-B | Guided mobile UI wired to accepted capture pipeline | Component/protocol tests for save/review/replace/resume, permission/background/drain races; no ranking dependency |
| 04-C | Barcode compatibility packet, then combined flow if accepted | Actual closure/scheduling evidence; duplicate/conflict/no-code/late-callback tests; no new dependency by inference |
| 04-D | One reviewed build/static packet | Exact APK/source/signer/package/manifest/assets/runtime/size deltas, permissions and offline closure; source pass is not build pass |
| 04-E | Bounded physical enrollment, restart and freeze | Genuine committed references and barcode dispositions, no lost/duplicated slots, storage/RAM observations, immutable gallery receipt |

Likely change areas, to become an exact allowlist in each dispatch: new mobile
`src/recognitionExperiment/enrollment/` protocol/schema/UI; isolated
ExperimentRoot integration; narrow Kotlin bridge additions; new Java enrollment
helpers beside existing CPU-runtime proof helpers; focused mobile/native tests;
new lab read-only enrollment-report validator and reports. Only necessary
isolated plugin changes after barcode review. Preserve old generated schemas,
P0/P1 pins, capture recipe/model, fixed exporters, business app and dependencies.
Do not widen all of these directories as one unrestricted writer assignment.

Required negative tests include crash before/after commit, disk full/reservation
exhaustion, process restart mid-capture, freeze during active work, wrong product
epoch, stale receipt, replacement failure, malformed/truncated records, corrupt
hash, unsupported orientation, denied/revoked camera permission, background
while busy, and duplicate/conflicting barcode callbacks. Retain failed evidence.
Run focused tests, mobile/lab types and lint where touched; unchanged proof checks
must still pass. Independently verify hash manifests and real output artifacts.

Physical packet first uses a finite generated-target recovery check, then the
agreed ten real products. Confirm availability and schedule with the founder;
they must position/turn products. Freeze capture/replacement policy before data
collection. Choose a predeclared interruption point, verify committed slots
survive restart and resume the next missing slot. No extra product photographs
are requested now. Failure stops its affected trial; no hidden retry loop.

Numerical reports exclude photographs and unnecessary barcode content by default.
Any image export needs a separately bounded reviewed packet; do not repurpose
C9's fixed historical-photo export as a general gallery exporter.

## Completion, handoff and stop

P2-04 passes only when source, artifact and physical evidence support the guided
flow, durable gallery and declared barcode scope. Report unavailable barcode
integration as partial/blocked, with the precise decision needed. No claim of
better recognition accuracy, live scanning latency or production readiness here.

Every handoff must include exact file/source hashes, commands/exits, test counts,
preservation checks, artifact paths, failures, residual limits and a STOP state.
Release ownership before directly notifying the coordinator. The coordinator
then records independent acceptance and updates project state. Do not overwrite
another active writer's workflow or state while it owns those files.

After P2-04 acceptance, STOP. Founder switches for a separate P2-05 plan. This
document neither starts P2-04 now nor authorizes P2-05, new photographs, installation,
external services, Git publication or the deferred CI repair.
