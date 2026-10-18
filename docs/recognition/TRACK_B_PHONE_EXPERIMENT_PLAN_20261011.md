# Phone recognition feasibility and cue comparison plan

2026-10-11 — Astra planning complete; founder switched to Sol and approved P0.
P0 generated/source preparation is now independently accepted; see
reports/PHONE_P0_INDEPENDENT_AUDIT_20261011.md. Native adoption, build and capture
remain pending their concrete reviewed packets. The plan below retains its
staged proposal and unpassed gates.

## 1. Decision and sequence

Move to a bounded Galaxy A15 experiment using the existing visual model as the
first baseline. Establish native correctness, then compare reference coverage,
several frames per scan and readable label evidence. Treat extra visual matchers
as conditional challengers. All founder ideas are recorded in
TRACK_B_PHONE_VISUAL_EVIDENCE_ASTRA_BRIEF_20261011.md and mapped below.

This advances section B of TRACK_B_NEXT_PHASE_PLAN_20261011.md after completed
section A; it does not repeat A. The negative manual text diagnostic supports
investigating missing label visibility, not declaring OCR useful. Section C's
independent dataset requirements remain in force. No R2/R3/R4/R5/R6 or M12 gate
is passed by approving this plan.

Implementation sequence: P0 adoption/build packet and generated test preparation;
P1 reviewed native baseline; P2 automatic phone capture and four visual arms;
P3 conditional label/specification arm; P4 conditional extra visual cue;
P5 independent difficult-set evaluation. Each stage has a stopped handoff and
coordinator review. Do not build all stages speculatively.

## 2. What the existing evidence establishes

The same ten physical products supplied 20 references and 20 queries. Full-frame
retrieval was 10/20 first and 19/20 top-three; manually cropped retrieval was
17/20 and 20/20. Confirmed human text assistance changed no ranks. The two wrong
CWAY queries had no recorded volume; Airpro's wrong query supplied only partial
`Ai`. These are development observations, not automated OCR or live-phone results.
See reports/LABEL_EVIDENCE_CONFIRMED_RESULT_REVIEW_20261011.md.

The founder observed upright products among all three remaining errors and tilted
products among correct first choices. Do not make upright positioning mandatory
or prioritize a tilt-only study. Include natural angles, glare and curved labels.

## 3. Native baseline recommendation and unresolved adoption evidence

Recommend a small Android Expo module wrapping **bundled LiteRT CPU Interpreter**,
initial candidate `com.google.ai.edge.litert:litert:2.2.0`, with the exact existing
MobileNetV3 Small 0.75/224 float32 feature-vector artifact. CPU, one interpreter,
one inference thread, no GPU/NPU or default acceleration for equivalence first.
This is a feasibility candidate, not the production model/runtime selection.

Existing producer source binds:

- model SHA256 `bbbb4c51a55a53905af1daec995ca1aae355046f8839bb8c9f5ce9271394bc40`;
- model bytes 4,117,670; input float32 NHWC `[1,224,224,3]`, output `[1,1024]`;
- RGB, EXIF orientation, aspect-preserving letterbox, gray128 padding,
  floor(x+0.5) size rounding, extra odd padding right/bottom, float32 divide255;
- Pillow12.3.0 LANCZOS in the laptop recipe. Android's default resize is not
  presumed equivalent. Existing cropped inputs also have fixed 5% box padding.

Options considered:

| Option | Tradeoff | Decision |
|---|---|---|
| Small Expo Android module + bundled LiteRT | Keeps current model format and explicit preprocessing; some native code and lifecycle responsibility | First feasibility candidate |
| ONNX Runtime React Native | Documented RN support, but requires an ONNX artifact/conversion and another equivalence problem | Defer unless the TFLite path cannot satisfy the device gate |
| New encoder or accelerator immediately | May improve accuracy/speed but changes several causes together | Separate challenger after measured baseline |

Repository stack is Expo57.0.22, RN0.86.3, expo-camera~57.0.6. Official docs support
LiteRT Android and Kotlin Expo modules; they do not prove this exact combination
builds. P0 must resolve exact AAR/transitive versions, licenses/notices (including
model-weight redistribution), min/target SDK, ABI/16KB-page compatibility,
Kotlin/Gradle/Expo compatibility, CPU/delegate settings, build prerequisites and
estimated binary cost. No silent version or model substitution.

The current `scanner-verification` app ID is separate, but its root still starts
the business database and PilotSyncScheduler. A different package ID alone is
not a sufficient experiment boundary. Recommend an experiment-only entry in the
existing mobile workspace, separately installed as a proposed
`com.damiyx.retailintelligence.recognitionverification` build variant, with no
business providers, sync scheduler or sale/stock commands reachable. No second
repository/workspace app. P0 must show the exact build-entry/import isolation and
ordinary-build exclusion before this native/build boundary is approved.

Use a locally built standalone APK with its JS/model bundled, rather than requiring
Metro or first-use model downloads. Exclude INTERNET permission and unrelated
network SDK initialization from this private experiment build; verify the merged
manifest and actual artifact. No private photos enter APK/build uploads. Existing
EAS development profile is not proof of this isolation. If local build prerequisites
are absent, report exact setup requirements; do not silently use cloud EAS.

For initial capture, assess the installed expo-camera Android JPEG/cache path.
Its CameraView source routes `pictureRef` to the special native-reference method
only on iOS. Do not assume Android zero-copy access from the public signature.
Measure snapshot-path cost. If it prevents a responsive preview or budget, stop
and propose a bounded native frame source; do not label repeated slow photos a
successful continuous scanner or automatically add another camera library.

## 4. Correctness gate before live-camera claims

Split equivalence into two tests so preprocessing errors cannot hide inside a
ranking score:

1. **Runtime:** identical generated 224x224 float tensors on laptop and phone,
   same model, finite nonzero 1024-vector output. Provisional ceilings are
   max absolute normalized-component error <=1e-4 and cosine distance <=1e-5.
   Record raw-vector differences too. P0/generated development must justify or
   revise these thresholds before any private run, then freeze them. Exact
   candidate ordering required except independently documented near ties whose
   gaps fall within the measured score-error bound; count/report every change.
2. **Image pipeline:** generated rotations/mirrors, odd sizes, crops, colors and
   borders prove coordinate mapping, orientation and padding. Compare decoded
   pixels/tensors, not just final labels. Native JPEG decoding/resize differences
   must be quantified separately. If exact Pillow behavior cannot be reproduced,
   version the phone recipe and run a controlled recipe comparison; do not call
   it identical preprocessing or silently reuse the 85% score.

Then use a fresh approved offline device packet for the existing 40 images and
saved boxes, with automated processing and no founder redraw. Preserve all IDs,
inputs, raw outputs and failures. This checks portability, not a new accuracy
dataset. Private tensor construction/transfer is itself part of that later packet;
no consumed laptop launcher is rerun. Native replay timing is separate from live
camera timing.

## 5. Founder flow and collection burden

No capture is requested today. After P1 review, the tool should guide this flow:

1. Import the prepared experiment packet once. Run the automatic portability check.
2. Enroll the familiar ten products, if still available: four guided views per
   product, usually front, rear and two complementary sides/diagonals. The app
   takes the photos; no rectangle drawing or manual 40-image transcription.
   For cylinders, expose different label sections. Record enrollment time.
3. For each prompted product, tap Start scan and pan gently while keeping the whole
   product inside the guide. Run two scans per product: usual view and a changed
   angle/label view. Include five available unenrolled products, one scan each.
   This is 25 development scans, not 25 independent products.
4. Review the automatically produced picture/rank report. Verify only disputed
   text/identity examples needed to diagnose a result. The tool exports results;
   the founder does not calculate comparisons.

Four enrollment views are an experimental maximum, not a permanent retail demand.
Fix their order before seeing query scores; the two-view arm uses front/rear from
that same four-view set. If a required view is unavailable, report it before
freezing the gallery. Do not selectively replace failed scans with better ones.
New phone galleries mean a new baseline; do not directly advertise gains over
the old 17/20 as if only the algorithm changed.

After choosing a development candidate, freeze it and repeat the 25-scan schedule
in a later session as an exploratory confirmation. Same physical items remain
correlated; this is not the formal sealed holdout. Ask for product availability
before any wider collection, buying products or large capture assignment.

## 6. Four controlled visual arms on shared scan evidence

| Arm | Reference views/product | Query frames | Question |
|---|---:|---:|---|
| V21 | 2 | first eligible frame | Phone visual baseline |
| V41 | 4 | same first frame | Does reference coverage help? |
| V23 | 2 | up to 3 selected frames | Does panning supply useful evidence? |
| V43 | 4 | same selected frames | Do the two benefits combine? |

Use the same frozen query packets for all arms; replay avoids making the founder
scan four times. A trial remains one scan. Arm accuracy can be compared by replay;
end-to-end latency requires the corresponding executable arm on-device, including
its capture/preprocessing cost. Offline replay time is not live latency.

Proposed fixed scan policy: at most three frames, at least400ms apart, one active
capture/inference job, no work queue, three-second session deadline. Select by
time/readiness, never ground truth or candidate score. Record actual offsets and
skipped/missing frames. First implementation omits learned quality selection;
blur/glare guidance and any later selector are separate changes. Invalidate late
results using session IDs; cancellation must not assume an in-flight native call
can be forcibly interrupted. Release resources when it finishes; no overlapping
replacement session while the worker is still busy.

Start with a centered guide spanning80% of preview width and height. Map the
guide to the actual capture using rotation, mirroring and preview aspect-fill
transforms; add5% padding and clamp. Show the effective crop in the report.
This is a live ROI hypothesis, not the previous hand-boxed crop or automatic
segmentation. Do not claim the whole product is captured when it crosses the guide.

Preserve existing per-frame L2-normalized cosine and maximum similarity across
references per product. For multiple frames, use the arithmetic mean of each
product's per-frame maximum scores over available selected frames, then stable
distinct top-three. This tests one fusion rule, not a search over many rules.
Always report the actual frame count; one-frame fallbacks do not count as successful
three-frame acquisitions. Capture/inference failures stay in the trial denominator
and are separately visible even when a usable fallback exists.

## 7. Conditional text and specifications arm

Recommend bundled Latin ML Kit text recognition as the first OCR candidate only
after P0 license/privacy/network review and P2 capture evidence support proceeding.
Candidate coordinate from official docs: `com.google.mlkit:text-recognition:16.0.1`.
No downloaded-on-first-use or cloud path. Review SDK behavior rather than assuming
bundled means no telemetry. If its terms/behavior conflict with the private offline
boundary, defer it; do not silently relax that boundary.

Trigger: at least one unresolved visual confusion has a newly captured, actually
readable distinguishing field. If visibility still fails, improve capture before
adding OCR. If text is clear but shared, prefer visual alternatives. This is the
explicit interpretation of A's failed positive criterion, not a claim it passed.

Run OCR as a separate measured arm over at most the same three ROI frames at
bounded resolution. Compare machine text with human review for the diagnostic
cases, and report extraction availability/errors independently of ranking.
Reuse the conservative unique-support/every-rival-explicitly-contradicts principle
within a fixed visual top-three. Missing or partial evidence abstains. Contradictory
observations across frames abstain; no concatenating `Ai` and guessed suffixes.
Any automatic completeness gate must be defined and tested before OCR promotions;
human-selected readability is not a runtime capability. Until then OCR is shadow
evidence, not a ranking change. No guessed brand repair from truth/catalogue IDs.

For specifications, propose distinct lab-only typed dimensions: volume, mass,
count, electrical power(W), luminous output(lm). Keep literal spans and frame
provenance; compare exact normalized values only within a dimension. W is input
power; lm describes light output. Do not infer one from the other or from bottle
size/hand proportions. Ambiguous digits/units or multiple competing specifications
abstain. This is a versioned experimental extension, not modification of the
frozen label diagnostic or product/package business model.

Keep brand/variant/quantity assistance and the W/lm extension separately reported.
Without an available contrasting specification pair, the extension is untested for
disambiguation. Do not invent a success from one bulb.

## 8. Disposition of the other founder ideas

| Cue | Treatment in this study | Trigger for a separate added method |
|---|---|---|
| Color; transparency/tint; shape | Already present in visual input; annotate difficult-case coverage | Stable confusion with distinguishing visible cue after view/ROI checks |
| Flowers, cartoons, layout, packaging patterns | Covered by complementary views and normal visual baseline | Remaining local-detail failure warrants one local matcher challenger |
| Font/logo styling | Preserve sufficiently detailed views; OCR text alone does not measure font appearance | Residual confusion demonstrably distinguished by typography |
| Ingredients/instructions/long descriptions | Retain only bounded useful diagnostic evidence; no full-label indexing now | Specific text distinguishes candidates beyond selected fields |

Do not claim these cues received independent algorithm tests merely because
images contain them. P4 may propose one extra method after P2/P3 evidence: a
compact color descriptor or local feature/detail comparison, with explicit
background/lighting/viewpoint handling and exact rule frozen before queries.
No production color override or flower detector is preselected. If baseline
coverage already resolves errors, defer extra models and their maintenance cost.

## 9. Budgets and decision criteria

Proposed experiment limits, not established production requirements:

- At most4 references/product and3 frames/scan; one active native job, queue0.
- Camera-ready latency reported separately; capture/start-to-first actionable
  result median<=1.5s and p95<=3s target. Also report time to stable final result.
  A wrong fast result is not a success. Count timeouts/failures and report the
  fraction both correct and within deadline; never calculate p95 on successes
  alone. At least20 trials per reported latency group, otherwise descriptive only.
  Use nearest-rank percentiles over all attempted trials; a trial with no
  actionable result has infinite latency for this calculation, with its observed
  timeout duration reported separately. Also give successful-trial timing as a
  secondary, explicitly conditional statistic. Define stable as unchanged first
  choice over two successive processed frames through session completion; a
  single-frame result is not evidence of multi-frame stability.
- Initial planning guardrails: <=50MiB incremental installed recognition size and
  <=200MiB incremental peak memory over the same empty experiment build. These
  are proposed ceilings, to review against P0 estimates before native adoption.
  A ceiling breach is a feasibility finding, not permission to raise it silently.
- Numerical gallery plus bounded text/metadata target<=32KiB/product. Four1024-D
  float32 vectors alone are16KiB/product; 1,000 products are15.625MiB of vectors,
  excluding all indexes/metadata/runtime overhead. Report total measured storage.
  Optional review thumbnails/originals are a separate explicit diagnostic budget.
- No indefinite video storage. Trial evidence retained only in the approved local
  run packet for review; normal runtime uses temporary frames. Exported metrics
  contain IDs/timings, not images unless the founder approves a picture packet.

Measure catalogues of100/1,000/5,000 product identities with2/4 references each,
using generated vectors to expose search/memory cost; these measure scale only,
not recognition accuracy. Use exact
retrieval first; optimization requires measured need.

For each added arm, report all before/after rows, paired gains and losses, per-pair
errors, top-three retention, missing evidence and costs. Engineering promotion
requires positive net first-choice gains with zero observed previously-correct
first-choice losses on development AND the later frozen confirmation session,
no unsupported text promotions, and budgets met. Otherwise retain simpler baseline
or mark mixed/inconclusive; do not tune on confirmation then reuse its name.
This is conservative triage, not a statistically supported production threshold.

Unknown trials must not produce automatic product acceptance: the experiment
shows suggestions requiring confirmation and records unknown behavior separately.
Do not invent STRONG/UNKNOWN thresholds from this small set. Formal R4 calibration
and sealed evaluation are required before claiming false-accept performance.

Record device/OS/RAM/build/model/recipe, cold and warm conditions, camera and
inference timings, memory/storage, and10–15-minute sustained behavior, thermal
state where available, battery observations and offline restart. Do not claim
precise power consumption from a battery percentage change. No crashes, stale
results after cancel, uncontrolled queue growth or business-data writes allowed.

## 10. Generalization and fair AI comparison

P5 retains the existing30–50 enrolled-identity target with size/flavor/lookalike
groups and15–25% unknown queries per formal split. Obtain an availability inventory
first. Physical/source-family disjointness across reference/development/calibration/
holdout is required; repeated views of the same package are not independence.
The familiar ten items are development/debugging only. Smaller available sets
may support feasibility, not formal readiness.

Every competing implementation receives the same brief, approved source/evidence,
development data, device/budgets and permission boundaries. Freeze its version
before independent evaluation. Keep holdout hidden equally. Use identical query
packets and report method-specific costs; compare AI-written implementations,
not a coding model's conversational confidence. Controlled view-count changes
must be explicit. Sequential ownership now; any later parallel build needs
separate approved workspace ownership. Combine methods only after another
incremental comparison proves the combination useful.

## 11. Scope, risks and next handoff

No business schema/migration, RecognitionService change, sale/stock command,
Supabase integration or M12 wiring is proposed in this experiment. Lab experiment
records are separate from store catalogue truth. Proposed new boundary is confined
to the mobile experiment entry/native adapter plus lab evaluation records.
The concrete native/build isolation proposal still needs founder review.

Dominant risks: native preprocessing differs from Pillow; existing camera snapshot
path is too slow; multiple views reinforce a distractor; readable text lacks a
reliable automatic completeness signal; ten items overfit; separate app ID is
mistaken for data/network isolation. P0–P5 explicitly test or gate each risk.

Next coordinator dispatch, only after founder switches to Sol6.1 HIGH and approves:
P0 in TRACK_B_PHONE_EXPERIMENT_TICKETS_20261011.md. The implementer must STOP and
message the coordinator directly with the handoff/checks/bindings/limits. Astra
does not dispatch. Native implementation/build/capture require the reviewed
packet; do not send the founder another unexplained test page meanwhile.

## 12. Evidence reviewed for this plan

Local: PROJECT_STATE, BUILD_PLAN R3/R6, MULTI_AGENT_WORKFLOW, recognition architecture
and test plan, previous next-phase plan/brief, confirmed label report, producer
and crop producer, mobile package/config/EAS/root/sell/scanning boundaries and
installed expo-camera CameraView. Worktree plan/m8-unified-scanner at
66ea3fc22595a48d7355d1729bb879496cc98896, with pre-existing uncommitted work.

Primary documentation checked2026-10-11:

- [LiteRT Android](https://developers.google.com/edge/litert/android): v2.2.0 lists
  CPU Interpreter support/minSDK23; page quickstart still uses2.1.0. Pin and verify
  actual resolved artifacts rather than copying mixed-version examples.
- [LiteRT license](https://github.com/google-ai-edge/LiteRT/blob/main/LICENSE):
  upstream software license is separate from exact model weights/transitives.
- [Expo native modules](https://docs.expo.dev/modules/overview/): Kotlin bridge is
  supported in principle; exact project build remains unverified.
- [Expo Camera](https://docs.expo.dev/versions/latest/sdk/camera/): capture API;
  installed Android source behavior takes precedence over a generic shortcut claim.
- [ML Kit Android text](https://developers.google.com/ml-kit/vision/text-recognition/v2/android):
  bundled versus downloaded options, image quality and processing-frequency concerns.
- [ONNX Runtime RN](https://onnxruntime.ai/docs/get-started/with-javascript/react-native.html):
  alternative supported integration surface; no compatible replacement model selected.

No provider documentation is a compatibility test. Exact artifact rights, native
build, device timings and new accuracy remain unmeasured. Planning artifacts only
were written; previous evidence and all implementations remain unchanged.
