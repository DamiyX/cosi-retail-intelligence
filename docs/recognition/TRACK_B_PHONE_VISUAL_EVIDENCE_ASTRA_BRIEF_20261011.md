# Founder feedback and Astra brief: phone recognition experiments

Date: 2026-10-11. Status: recorded founder ideas and proposed planning scope.
This is an addendum to TRACK_B_NEXT_PHASE_PLAN_20261011.md, not an approved
algorithm, native dependency, architecture change or implementation dispatch.

Planning outcome: TRACK_B_PHONE_EXPERIMENT_PLAN_20261011.md now contains the
integrated Astra proposal, with TRACK_B_PHONE_EXPERIMENT_TICKETS_20261011.md
defining the first bounded handoff. Founder subsequently switched to Sol and
approved P0, whose generated/source preparation is independently accepted in
reports/PHONE_P0_INDEPENDENT_AUDIT_20261011.md. Native build/device gates remain
pending. This original idea record remains the shared input for other models.

## Requested outcome

Plan the next recognition phase as one coordinated phone/live-scanning feasibility
study that considers the ideas below. Avoid another complete manual laptop
annotation exercise. Keep recognition fast, offline and bounded in storage.
Record enough context for another AI/model to work from the same evidence and
for the founder to compare implementations fairly. Consider every idea; do not
assume every idea deserves implementation or that combining everything helps.

## Evidence already available

- Ten physical products, two reference and two query photos each: 40 photos,
  20 query trials. These are correlated exploratory development evidence.
- Full-frame visual result: 10/20 correct first, 19/20 within first three.
- Cropped visual result: 17/20 correct first, 20/20 within first three.
- Confirmed human label evidence: still 17/20 first and 20/20 within first three;
  zero gains, losses or promotions. This did not test actual OCR extraction.
- Remaining errors: Airpro p02-explore-2 correct third, recorded text `Ai`,
  partial; CWAY750 p04-explore-2 and CWAY600 p05-explore-1 correct second,
  recorded `CWAY ultra` without a volume. Those words support both sizes.
- Founder observed those three products were upright. Other slanted examples
  were first choices despite larger rectangular crops. This does not establish
  that angle never matters, but gives no basis for an upright-only requirement.
- Bulb 10W/900lm remains in literal text. Current frozen quantity rule supports
  volume/mass/count, not power or luminous output. These need distinct semantics.

See reports/LABEL_EVIDENCE_CONFIRMED_RESULT_REVIEW_20261011.md for checked
bindings, coverage, limitations and preservation evidence. The negative manual
result did not meet the previous positive engineering triage criterion; any
new OCR experiment must explicitly justify investigating new visibility/data
conditions rather than claiming that criterion passed.

## Founder suggestions: preserve as hypotheses

| Idea | Founder example or purpose | What must be checked |
|---|---|---|
| Color | Airpro pink/purple; Fanta orange; distinguish otherwise similar products | Lighting/glare changes and shared colors; benefit beyond existing image matching |
| Packaging patterns and layout | Background designs, arrangement and recurring patterns | Partial views, background distractions and similar packaging families |
| Artwork/pictures | Airpro flowers, cartoons; matching a partial or smaller drawing | Local detail correspondence under viewpoint/scale changes; false matches |
| Fonts, logos and typography | Matching distinctive printed styles | Resolution, curvature, shared brand styles and runtime cost |
| Shape/material/transparency/tint | Clear or translucent bodies, green-tinted packaging | Viewpoint and lighting; size cannot be inferred reliably from distance alone |
| Additional readable text | Ingredients, instructions and other descriptions | Whether text actually distinguishes candidates; shared generic wording and processing/storage cost |
| Typed specifications | 10W versus 5W/15W; 900lm; bottle volume | Separate power, luminous output and net quantity; missing/ambiguous units must abstain |
| Three or four representative reference views | Front/back/sides; cylindrical labels; diagonal box photos showing two faces | Added coverage versus gallery/search/storage cost; this is approximate coverage, not guaranteed 360 degrees |
| Several useful views during one live scan | Pan around product to expose complementary label/artwork evidence | Frame selection, motion/glare, result stability and end-to-end delay; avoid repeatedly processing every frame |

The current image encoder already compares product pixels, so visual cues are
not wholly absent. Better local detail matching or explicit cues may add value,
but color alone is not a demonstrated Airpro fix. More text and more views can
also introduce errors. No exact storage or latency benefit is claimed.

## Recommended integrated study for Astra to specify

1. **Phone feasibility baseline:** propose the exact offline visual runtime,
   model, preprocessing and camera boundary. Declare numerical equivalence
   tolerances before device comparison with saved laptop evidence. Measure the
   baseline before attributing gains to new cues. Resolve native/build/security
   review gates before implementation or phone effects.
2. **Bounded view coverage:** distinguish two experiments: two versus three/four
   reference views with query trials fixed; one versus a few selected query
   frames from the same live scan with the reference gallery fixed. Keep an
   entire scan as one trial, not several independent successes.
3. **Readable labels/specifications:** assess whether selected live views expose
   the missing distinguishing words/volume. If justified, compare actual OCR
   with human transcription and measure extraction errors separately from
   ranking. Review a typed specification proposal for W/lm. Preserve the current
   partial-text abstention rule; any new field-level completeness policy needs
   its own reviewed contract and regression evidence.
4. **Additional visual detail:** consider color, patterns, artwork, fonts and
   material cues together in the plan, but test any extra matcher separately
   against the visual baseline before combining improvements. Prefer the
   smallest useful option. Long ingredients/instruction matching has lower
   priority unless a concrete discriminating case warrants it.

Astra should make the smallest experimental matrix, with explicit deferred
ideas and reasons. Where technically valid, one authorized capture session can
supply several controlled comparisons through bounded local replay, reducing
founder effort. Automatic/generated laptop checks and equivalence checks may
still be necessary; this is not another full 40-photo manual exercise.

Natural angles, curved labels, glare and motion belong in capture conditions.
Do not require upright-only handling or a mandatory full rotation for checkout.
Recognition failure must keep manual/barcode paths available.

## Speed, storage and acceptance evidence

Predeclare selected-frame/reference limits, retained data, timeouts and fallback.
Evaluate bounded embeddings and useful text/specification fields before proposing
all-frame processing, indefinite video retention or full packaging transcription.
Measure installed model/build size, per-product gallery/cache size, RAM and
search cost as the catalogue grows. Short text is not the whole app-size budget;
images/models/embeddings and implementation choices must be measured too.

Measure cold/warm startup, camera readiness, capture-to-actionable result,
stable result, median/p95 latency, failures, offline/restart behavior and sustained
10–15 minute use on Galaxy A15 first. Existing roughly 1.5s median / 3s p95
end-to-end goals are provisional, not measured device achievements. One phone
cannot establish Android-wide performance.

Report first-choice and top-three gains/losses, unknown false accepts, abstentions
and stability, not accuracy alone. Do not tune against these ten products and
claim generalization. Carry forward independent physical/source-family splits,
lookalikes and unknowns, calibration and a sealed holdout from the existing plan.

## Fair comparison across AI implementations

- Give each implementer this same brief, approved scope, development evidence,
  baseline, data permissions and speed/storage budgets. Pin source/model/runtime
  versions. Separate coding-model contributions from vision-model performance.
- Use the same device, catalogue, query sessions, capture/preprocessing conditions
  and declared scoring rules; document intentionally varied reference/frame counts.
  Retain failures, ties and unknowns. Keep final holdout equally hidden from all
  implementers and have an independent evaluation apply the same criteria.
- Avoid concurrent edits to shared files. Any later parallel implementation needs
  separate approved ownership/workspace boundaries, not competing writes here.
- Combine findings only after incremental benefit and regression checks; merging
  two approaches is not automatically better. Document costs and failed hypotheses
  as well as wins so later models do not repeat unsupported assumptions.

## Astra return contract and pause

Return one decision-focused plan covering phone feasibility, the selected/deferred
cue experiments, runtime/dependency evidence, files/contracts affected, capture
instructions, privacy/offline boundaries, fair evaluation and explicit acceptance
criteria. Show any conflict with existing plans and resolve it before implementation.

Then PAUSE. Founder switches to Sol 6.1 for implementation coordination after
review. Astra must not dispatch the writer. The existing writer must return a
direct completion message to the coordinator with the exact handoff file,
checks, bindings, limitations and STOPPED/lease NULL state. Do not merely leave
the handoff in the writer's chat.

Current authorization covers this documentation and planning discussion only:
no new pixels/inference, native adoption, dependencies, builds, phone captures,
services, uploads, automatic retries, Git effects or M12 integration. Previous
attempts and result artifacts remain immutable; automation remains paused.

## Primary technical reference for planning

[Google ML Kit Android text recognition](https://developers.google.com/ml-kit/vision/text-recognition/v2/android),
checked 2026-10-11: bundled versus downloaded models have different availability
and size implications; input quality matters and live processing should be
throttled. This supports measuring visibility and bounded processing, not choosing
ML Kit or proving this project's Expo/native compatibility or phone performance.

Read alongside SCANNING_ARCHITECTURE.md, RECOGNITION_TEST_PLAN.md,
TRACK_B_NEXT_PHASE_PLAN_20261011.md, PROJECT_STATE.md and DECISION_LOG.md.
