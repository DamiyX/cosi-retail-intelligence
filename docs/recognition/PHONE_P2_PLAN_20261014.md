# P2 live capture preparation and delivery plan

October16 current status: P2-03 G2 source accepted with residual risk after S1-C1;
see reports/PHONE_P2_03_S1_C1_INDEPENDENT_REVIEW_20261016.md. Writer stopped;
G3 build/static and G4 physical proof remain pending, so P2-04 is held. Founder
combined barcode/visual enrollment intent and reuse candidates are planning input
in TRACK_B_FOUNDER_REUSE_AND_ENROLLMENT_NOTES_20261016.md, not this proof scope.
The older dated progress/dispatch statements below are historical.

Progress update2026-10-15: P2-01/02 generated preparation independently accepted.
P2-03 camera review packet prepared/reviewed; see reports/PHONE_P2_03_CAMERA_PACKET_REVIEW_20261015.md.
G1 P1 physical/result review accepted October15 for the frozen packet; see
reports/PHONE_P1_OFFLINE_CONFIRMATION_RESULT_20261015.md. Founder approved G0
choiceA camera-only/URI/owned256MiB policy as D-054; see
PHONE_P2_03_G0_DECISION_20261015.md. SDK producer/cache peak is measured separately,
not proven hard-capped. Scoped source work may proceed; actual camera source
acceptance/build/physical proof have not passed, and P2-04 depends on that proof.
Original planning-time statements below describe the October14 proposal.

2026-10-14. Requested by founder: “begin P2 planning.” Planning complete for
review/model handoff; implementation has not started. Companion executable-work
ledger: PHONE_P2_TICKETS_20261014.md. Existing October11 phone plan remains the
parent for the four-arm comparison and budgets. P1 offline execution is deferred,
not failed or waived. This document does not approve a new native security boundary.

## Decision and immediate useful outcome

Prepare a bounded scan/session implementation with generated inputs on the laptop
while the phone supplies laptop internet. Deliver a readable trace/report showing
what happens during a normal scan, timeout, cancellation and interrupted enrollment.
Then reuse the verified logic in the isolated phone capture experiment after P1
is reviewed. The user should eventually enroll views and pan once per prompted
scan, without drawing rectangles or transcribing every label.

Two viable sequencing options were considered:

| Option | Benefit | Cost / decision |
| --- | --- | --- |
| Wait for all P1 results before any P2 work | No preparatory work may need revision | Leaves bounded session/recovery logic unprepared; unnecessary dependency for generated tests |
| Build isolated generated session/enrollment tooling now; integrate camera after P1 | Useful progress with current connectivity and unchanged P1 experiment | Some adapter details remain provisional; recommended within the exact scope below |

No second repository, worktree, runtime, model or parallel writer is needed.
P2-01 and P2-02 are preparation only; they cannot accept P2 or bypass its preceding
P1 physical review. Only P2-01 is the first dispatch; P2-02 follows stopped audit.

## Inspected baseline and preservation

Current branch `plan/m8-unified-scanner`, HEAD `66ea3fc`; substantial existing
uncommitted work belongs to other milestones and remains untouched.

P1 installed C2 APK SHA256:
`c7f04760381e7a3bedbff14084ec12b03c51229eb0e73660be0494a0d7afc48b`.
Its current24-file source binding:
`cf0fc3c71d475336b849aa4b3b90c382f9e65a2ea4e8124f37cc21de6bf5610d`.
The already transferred131901810-byte C4 input and existing device-run records
remain as recorded in PHONE_P2_PREPARATION_BRIEF_20261014.md. No inference starts
and no offline prompt is renewed until founder reports independent connectivity.

Current implementation facts:

- `apps/recognition-lab/src/phoneExperimentEvaluation.ts` provides timing/readiness
  selection, normalized scoring, reference maxima and four-arm reporting.
- `phoneExperimentSchema.ts` explicitly admits `GENERATED_PHONE_EXPERIMENT`,
  `nativeValidated:false`, a provisional LANCZOS recipe and fixed policy. These
  are appropriate for generated checks, not an admission route for real camera data.
- `phoneExperimentSource.ts` fingerprints root `phoneExperiment*.ts` and its
  fixtures. Preserve those files. New work lives under `src/phoneCapture/` with
  a separate source/fixture manifest; no rewrite of the old generated experiment.
- `ExperimentRoot.tsx` has no live camera; `nativeAdapter.ts` exposes generated
  probes and fixed private portability requests, not arbitrary live-frame inference.
- Actual plugin is `apps/mobile/plugins/withRecognitionExperiment.js` (not the
  historical proposed `.ts`). It excludes expo-camera. `app.config.ts` blocks
  CAMERA and INTERNET for the recognition variant. Adding a view alone cannot work.
- Installed Expo CameraView exposes readiness, picture sizes and takePictureAsync;
  inspected Android uses the normal JPEG capture path. This is not a measured
  low-latency stream or proof of preview/capture field-of-view correspondence.
- The current P1 comparator reads PhonePortabilitySource.java and Pins.java from
  current source. Changing them before comparison risks invalidating that binding.

Before/after P2 preparation, verify all24 P1 source records against the accepted
C2 manifest and preserve existing comparator/pins, all P0 source/fixtures, package
and lock/config files. No mobile/native/build edits during P2-01/02. Do not solve
preservation by quietly replacing the comparator, repinning P1 or making a new run.

## Boundaries and ownership

The new portable session controller owns session identity, monotonic times, the
single active operation, admission/cancellation/deadline decisions and a bounded
event/result ledger. It sees no product truth, ranking or camera API. Timing and
work are injected through a small adapter, with a deterministic generated adapter
for P2-01/02. No hidden file, network, native-module or timer effects in the core.

The adapter owns one capture -> image validation/preprocessing -> vector job and
its temporary resource handle. One job stays busy until completion/drain even
after logical cancellation. The generated adapter models this ownership; only
later physical tests can prove Android releases resources correctly.

An enrollment controller owns ordered front/rear/side/side slots and a gallery
revision. A bounded store owns durable checkpoints and atomic publication; it
does not own inference or product identity. Initial implementation uses a new,
disposable generated-only local directory. Later Android app-private storage is
a separately reviewed adapter, not the business SQLite or catalogue.

The report/CLI joins the event ledger and generated evaluation without passing
truth back into selection. Read-only imports from existing pure math/evaluation
are permitted where compatible; do not import Node crypto/fs into future mobile
bundles. Real observed evidence needs a new discriminated schema and truthful
recipe/runtime bindings later. Never relax the old generated schema for it.

## Session behaviour to implement now

States: IDLE -> RUNNING -> COMPLETE, or RUNNING -> DRAINING -> CANCELLED/DEADLINE/
FAILED. A terminal result may be reported at the logical deadline while an owned
job is still draining; Start remains disabled until drain finishes. Monotonic
epoch-relative times, unique session/job IDs and a gallery revision bind every
callback. Wall-clock changes cannot extend the session.

- Start requires an admitted frozen gallery, source ready and no owned job.
- At most3 attempts, no queue, minimum400ms between accepted capture timestamps,
  no new job at or beyond3000ms. Readiness may delay or skip an opportunity; never
  accumulate missed ticks to execute later. Existing policy also governs selection.
- Record request, capture and completion times separately. Admit only results
  completed before the deadline; a result exactly at3000ms is late. No score-based
  frame choice or truth-informed retake. Missing frames stay visible in reports.
- Cancel/background/unmount immediately invalidate the session. Late completion
  releases its owned handle once and cannot publish a vector, update another scan
  or start a replacement job. Timeout does not forcibly preempt native work.
- Capture/decode/inference errors terminate with explicit evidence for this initial
  slice; keep earlier usable frames as a labelled partial result. No automatic
  retry or replacement of a failed frame within the trial.
- An unresponsive owned job remains DRAINING and blocks Start; report that state.
  Never release its busy flag merely because a cancellation Promise resolved.
- An offline-policy loss is a cancellation cause in generated traces. Later app
  checks/human/live evidence remain required; controller fixtures do not prove radios.

Generated report carries attempt/selected/usable/late/failed counts, session
terminal state, still-owned-work flag, per-frame provenance and all four arms.
Failures retain denominators. One usable frame is labelled one-frame fallback,
not successful multi-frame acquisition. No automatic STRONG/product acceptance.

## Guided enrollment and restart behaviour

Use fixed ordered slots front, rear, complementary1, complementary2. First two
references are a strict subset of the four-view gallery. No query-result selection
of references. Before gallery freeze, explicit review may replace a slot; preserve
the replacement history. After freeze, a reference change creates a new gallery
revision and invalidates the corresponding evaluation session rather than altering
prior evidence. Incomplete four-view enrollment is reported incomplete.

Persist successful slot outputs atomically after validating hashes and bindings.
Store a minimal in-progress marker before work; after process restart classify it
as interrupted, retain earlier committed slots and do not automatically recapture.
User can explicitly resume the next missing slot. A failed rename/write/hash check
must never produce a ready gallery. Recovery is idempotent; reject symlink/junction
escapes, malformed state, incompatible source/model/recipe and oversized records.

Generated simulation spans setup -> slots -> freeze -> scan -> report -> reopen,
using fake vectors/handles only. Proposed local limits:10 enrolled products,
40 reference slots,25 trials,75 query attempts and4096 events per generated trace;
reject excess before allocation. Actual native timing does not derive from these
virtual-clock scenarios. Do not store a picture path, original or personal data.

## Later camera integration proposal — held pending P1 review

The same isolated recognition variant is the preferred integration location after
P1 is closed, avoiding a second permanent app architecture. Retain the immutable
C2 APK/run for evidence; do not replace the installed app while P1 is pending.
Before implementation publish a concrete camera/build packet and review the
changed security boundary and exact module/permission closure.

Proposed scope: allow only CAMERA as an added Android platform permission; retain
no INTERNET, microphone, gallery/media permissions, business DB, sync or Play
delivery. Reuse installed expo-camera first. Resolve its actual Android transitive
modules/providers and build costs; no unconditional autolinking of all mobile
packages or speculative new dependency. A failure of the installed path returns
for review rather than silently adopting a new CameraX/ML SDK.

One-shot capture first: permission -> readiness -> capture -> validate dimensions/
orientation -> crop/encode -> vector -> review -> durable numerical receipt.
Then attach guided enrollment and multiple-frame sessions. This lets physical
geometry and privacy failures be diagnosed before a25-scan experiment.

Retain the parent proposal: choose an actually reported size <=4MP, encoded JPEG
<=12MiB; validate returned size before decoding and do not assume the requested
size is honored. Android JPEG options use no base64/pictureRef/fastMode and avoid
unreviewed double processing. Zoom initially1x, rear camera, no focus feature work.
The centered80% guide plus5% padding is a hypothesis requiring measured orientation,
aspect-fill and field-of-view alignment. If extents differ, fail the ROI check;
do not label a decorative guide as the captured crop.

Native recipe will identify Android JPEG decode and reviewed bilinear pipeline;
it must not claim the old Pillow LANCZOS recipe. First physically verify a generated
target's orientation, boundaries and crop at the allowed preview layouts. Phone
portability results inform this packet before its recipe is frozen.

Proposed diagnostic retention cap for later review:256MiB total app-private JPEG
evidence, maximum115 retained captures (40 refs+75 query frames), <=12MiB each.
Reserve the worst-case per-capture space before capture; if capacity is exhausted,
stop with a retained failure, not silent deletion/downsampling. This total may
stop capture before115 images; report availability/storage and revise only before
a new frozen experiment. Temporary files are bounded by one owned job. Numerical
gallery target<=32KiB/product remains separate. Images never enter the default
numerical export; any picture report needs an explicit reviewed local packet.

## Later experiment, evidence and decisions

After P1/camera/source review, confirm availability of10 familiar and5 unenrolled
products. Four reference views, then2 scans per known product plus1 per unknown
make25 development trials. Reuse identical captured evidence across V21/V41/V23/
V43. Repeat a frozen confirmation session later; same physical products are still
exploratory, not the independent30–50-product difficult set.

Report first/top-three ranks, all paired improvements/regressions, failed trials,
unknown suggestions, frame counts and source/recipe/device bindings. Keep parent
decision rule: positive net first-choice gains and zero observed losses of prior
correct first choices on development and untouched confirmation, with budgets met;
otherwise retain simpler baseline or classify mixed/inconclusive. No tuning on
confirmation and then claiming it remains an untouched confirmation.

Reuse parent provisional targets: first actionable median<=1.5s/p95<=3s, measured
end-to-end including capture; no actionable output is infinite in all-attempt
latency. At least20 trials per timing group or descriptive only. Replaying four
arms proves paired ranking, not four live latency measurements. Separately measure
camera-ready and capture/decode/inference/retrieval, cold/warm/sustained use, RAM
and storage. Parent50MiB incremental installed/200MiB incremental peak-memory
guardrails require a comparable baseline; breaches are findings, not silent waivers.

P3 OCR/specifications and P4 one additional cue stay conditional on residual errors
with actually visible distinguishing evidence. Colour/tint, flowers/patterns,
typography and label sections are represented by normal views; that alone does
not test a separate matcher. Preserve partial-text abstention. No new models,
upright-only requirement, hand-size estimate, exhaustive text indexing or forced
product acceptance in this plan.

## Delivery and stop points

1. Founder reviews plan and switches to Sol6.1 HIGH for P2-01 implementation.
2. Same sole writer receives only P2-01; stops and returns direct handoff. Coordinator
   independently checks actual generated outputs and preservation before P2-02.
3. P2-02 has the same stopped handoff/audit. Neither needs phone disconnection.
4. Resume P1 when founder has independent laptop internet: fresh offline evidence,
   existing finite diagnostic/replay/recovery/export/comparison; no reinstall or
   retransfer. Any P1 findings are resolved before native P2 work.
5. Prepare/review the concrete native camera packet, then source/build/audit and
   separately scheduled LOW physical work. Later roadmap slices below are not
   automatic dispatch authorization.

No business migration, RecognitionService contract, ordinary barcode scanner,
inventory, finance, backend, package/lock changes or external effects in P2-01/02.
Root M8 tickets and other milestone files remain owned by their existing tasks.
No implementation agent was started by this planning turn. Automation stays paused.

Planning sources: PHONE_P2_PREPARATION_BRIEF_20261014.md; October11 phone plan/
tickets/adoption packet; current C2 independent audit/finite device supplement;
inspected files above; PROJECT_STATE, D-053 and MULTI_AGENT_WORKFLOW. No new
dependency recommendation depends on unverified current web claims.
