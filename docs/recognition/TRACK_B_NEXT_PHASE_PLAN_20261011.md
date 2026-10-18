# Next recognition phase: label evidence, phone feasibility, independent evaluation

Status: planning proposal complete; awaiting founder model switch and approval of
the first implementation slice. Planning only: no dispatch, code implementation,
private execution, native adoption or new capture is authorized by this document.

## Decision

Start with a bounded laptop **label-evidence diagnostic**, using the saved FC06
visual scores. Then prepare a separate, reviewed phone feasibility experiment.
Use fresh physical examples and unknown products for subsequent generalization
evaluation. This is the overall next-phase plan; CWAY and Airpro are diagnostic
examples within it, not the only products the system is intended to recognize.

Do not prioritize a tilt-only experiment. Founder reports that all three remaining
errors were upright, while the tilted examples ranked first. This weakens tilt
as the immediate explanation; it does not prove angle has no effect elsewhere.
Do not add an upright-only capture rule, infer volume from hand size, or silently
change the approved framing recipe.

The immediate question is: **if the label can be read correctly from the actual
input image, can it resolve visual ambiguity without breaking correct results?**
Human transcription answers this cheaply before choosing/installing OCR. It is
not an OCR accuracy result, and cannot establish that a machine can read the text.

## Evidence and current readiness

FC06 same-instance exploratory result: FF10/20 first,19/20 top3; CC17/20 first,
20/20 top3;8 first-choice wins/1 loss. Airpro p02-explore-2 is third; CWAY750ml
p04-explore-2 and CWAY600ml p05-explore-1 are second, with opposite sizes first.
All40 original images/annotations and the consumed run are frozen. The founder
reviewed the picture report and supplied upright/size-confusion observations;
no new box defect was reported. This is not a new independent inspection of all
40 boxes, and the cause of the Airpro error remains unknown.

Checked repository: PROJECT_STATE, BUILD_PLAN Track B R1–R6, TRACK_B_PLAN,
R1/R2/R3 preparation plans, RECOGNITION_TEST_PLAN, SCANNING_ARCHITECTURE OCR
sections31–33, and decisions D-017–022/D-030/D-046/D-050. Existing R3
deviceBenchmark/deviceEquivalence modules analyze supplied records; they execute
no Android encoder. Current mobile package and scanning source provide the
barcode/camera shell, not an implemented visual encoder or OCR path.

This plan uses existing Track B milestones. The small text diagnostic explores
the R6 hypothesis after a visual baseline exists; it does not mark R1–R5 complete
or move OCR into production. Final model/runtime selection remains open (D-022).

## A. Next executable slice: laptop label-evidence diagnostic

### Inputs and founder task

Use all20 FC06 queries and their20 reference images, with unchanged effective
crop rectangles, encoder outputs and raw visual ordering. No new product photos,
image encoding, original-image edits or repeated offline launcher attempt.

Prepare a local text-review worksheet/viewer. The founder transcribes only text
actually legible inside each existing effective crop, using full-resolution local
viewing/zoom. The112-pixel report previews are insufficient for transcription.
Do not redraw boxes, inspect another angle to fill missing query text, or obtain
query clues from the known product label. Mark unreadable/partially readable/no
text explicitly. Cover all40 inputs, including unbranded objects and correctly
ranked queries, to expose regressions rather than selecting only the three errors.

Reference cards record supported brand/name phrase, variant and labeled net
quantity with the reference-image IDs and literal text spans supporting each.
Query cards record visible text and the same optional fields independently.
The query worksheet hides truth labels, reference cards and candidate rankings;
the founder already knows the study, so this remains non-blinded development
evidence. Self-certification flags do not establish actual text visibility.

Use explicit selected originals and the existing privacy boundary: local-only
viewing; text/coordinates/hashes in JSON, no photos in export, no upload, telemetry,
network service or OCR calls. Preserve literal transcription separately from
normalization. Never auto-fill query evidence from its filename/identity/truth.

### Fixed comparison and rule

Baseline is saved CC visual-only top3. Compare one preregistered conservative
text-assisted ordering of those same three candidates. Do not retrain, search
weights/thresholds, expand the shortlist, change visual scores or tune per SKU.

Normalize case/whitespace and exact unit equivalents (600ml = 0.6L) using bounded
decimal/integer arithmetic. Keep mass, volume and count distinct. Multipacks,
multiple competing quantities, percentages, unclear digits and contradictory
transcriptions cannot supply a decisive size clue. No guessed OCR corrections.

For each observed query field, a reference card can support, contradict or have
unknown evidence. Missing text/metadata is unknown, never a contradiction. A
candidate is supported only if at least one field matches and no observed field
explicitly contradicts it. Promote a candidate to first only if it is the sole
supported candidate AND every rival has an explicit contradiction. Otherwise
retain the original visual order. Preserve the visual order of remaining entries.
Do not add CWAY/Airpro-specific rules. Freeze the rule and reference cards before
examining assisted query rankings. Record the reason and evidence for each change.

If all candidates contradict visible text, emit a separate diagnostic
"text conflict: manual confirmation needed" flag; do not force a corrected SKU
or invent calibrated UNKNOWN/STRONG states. This ordering is experimental advice,
not a sale selection or inventory update. A readable size alone is not globally
unique identity, and a mapped barcode is a separate identification path.

### Evidence and decision

Keep the denominator20, show all20 before/after ranks, top1/top3, gains, losses,
unreadable/partial/no-text counts, conflict flags, and per-field availability.
Report CWAY and Airpro separately; do not promise either is fixed. Unreadable
records fall back to baseline; missing review records block a complete report.
All20 rows are exploratory correlated views, not20 independent physical products.

A positive diagnostic requires at least one of the three first-choice errors to
be corrected and zero previously correct first choices lost. This is an engineering
triage rule, not statistical significance or a production accuracy threshold.
If positive, prepare actual OCR feasibility. If text is unreadable, examine capture
quality/label visibility; if readable but non-discriminating, prioritize reference/
encoder alternatives. If losses occur, stop for analysis rather than post-hoc
rule tuning. Regardless, these results do not choose a final model.

## B. Phone feasibility: the next execution platform after A review

Do not repeat the complete laptop image test just to obtain another score. The
phone experiment asks a different question: can the selected exploratory baseline
run correctly and practically on the actual device? It may use the current model
as a baseline probe without declaring it the benchmark winner.

First deliver a **native adoption proposal**, not an APK: verify current official
provider documentation, exact artifact/license, Android/Expo/RN compatibility,
bundled offline assets, binary/runtime costs, camera input path, privacy and build
impact. Recommend one visual runtime and, only if A supports it, one OCR candidate.
Identify exact files/build configuration and reversible isolation from business
actions. Prefer the existing experimental app boundary where justified; no second
app/repository or production RecognitionService change by assumption. Native
dependencies/topology/security changes require concrete coordinator/founder review
before editing. Downloads, installs, builds, phone transfers and launches receive
their own explicit authorization. No provider has been selected in this plan.

After approval, stage the phone checks:

1. Generated fixtures first; then a new approved offline device run on the frozen
   image/crop inputs. Compare preprocessing, embeddings, candidate order and
   failure accounting with saved laptop outputs. Declare numerical tolerances
   from generated development evidence before private evaluation; include every
   input/failure rather than a successful intersection. Preserve near-tie changes.
2. If OCR proceeds, compare machine-extracted fields with the manual image-text
   records, then visual-only versus the same frozen text-assisted rule on identical
   inputs. Measure extraction errors, unsupported promotions and added latency;
   human transcription performance must never be reported as machine performance.
3. Only after input/encoder correctness, test live camera scanning with a simple
   visible framing guide, single in-flight work, stale-frame cancellation and
   manual fallback. Live frames are not human-curated crop inputs. Distinguish
   reference enrollment from a query scan; require no manual box drawing in a
   claimed live-scanning result. Camera motion/angle/glare are normal coverage,
   not an upright-only requirement. No automatic sale or stock mutation.

Use Galaxy A15 first, lower-spec hardware when available. Record actual device/
OS, cold/warm camera-ready, capture-to-actionable and stable-result latency,
attempts/failures, memory, disk and10–15-minute sustained/offline/restart behavior.
Collect at least20 measured trials per reported p95 group, retain failed trials
and keep cold/warm/stages separate. Existing provisional median~1.5s/p95~3s goals
apply to capture-to-actionable results, not isolated inference. Never claim
lower-spec or Android-wide acceptance from one phone.

This is a bounded R3 feasibility probe, not completion of R2 candidate benchmarking,
R4 unknown calibration, R5 enrollment or M12 integration. Its native design remains
an explicit later review boundary; the first implementation slice cannot build it.

## C. Independent difficult-set evaluation and collection planning

Prepare the inventory/capture worksheet alongside A, but ask for an availability
list before asking the founder to collect a large photo set. Target the existing
R1 requirement of30–50 distinct enrolled identities, including multiple same-brand
size/flavor pairs, other lookalike brands, reflective/transparent packaging,
package levels and unbranded goods. Add true unknown queries (15–25% per evaluated
split), including unregistered lookalike identities. This is not just10 replacement
products, and the current10-item set remains development evidence only.

Reference, development, calibration and sealed holdout physical/source families
must be disjoint under the accepted R1 curator rules. Separate frames/sessions of
the same object do not establish physical independence. Unknown identities are
absent from the gallery; separate unknown identities across tuning/holdout where
possible. An unseen package of an enrolled identity remains a package challenge
under the existing schema, not an incorrectly labeled product-unknown.

The inventory must show physical-example availability and the resulting capture
burden before freezing counts. For scale only,30 known identities with2 references
and1 query in each of development/calibration/holdout give150 known images;
10 unknown queries per split give30 more (25% of each query split). This180-image
example is a workload illustration, not a final capture order or sufficient
coverage/statistical guarantee. Independent families and hard-case coverage may
require more products/examples. If unavailable, label the reduced study
exploratory; never weaken the real-data readiness validator to obtain a pass.

Freeze capture policy, candidate/reranking rules and calibration procedure before
holdout. Evaluate visual-only and any justified automated text-assisted candidate
on the same queries, retaining failures, false STRONG matches/coverage, unknown
rejection, exact-SKU/package errors and per-confusion-group results. The report
must distinguish laptop evidence from physical-phone evidence. A small unknown
set cannot substantiate a1% false-accept bound just because it has zero errors.

Use accepted R1/R2/R3/R4 schemas/tooling. Current FC06 producer/launcher binds40
images and20 queries: it cannot be reused for this population by loosening guards.
A later reviewed bridge/new producer execution packet is required. No collection
or new inference starts from the illustrative counts above.

## Handoff, ownership and preserved boundaries

Implementation handoff: TRACK_B_NEXT_PHASE_TICKETS_20261011.md. After founder
switches to Sol6.1 HIGH and authorizes dispatch, use sole existing writer
01a1051f-0777-7573-ad09-0e550a4bd56a sequentially; coordinator independently audits
its STOPPED return. No message is sent by the planning model.

First dispatch covers A preparation and C inventory worksheet only. Then stop
for source audit and founder text review. B is a conditional native proposal,
not included implementation authority. No new models/agents, automatic run,
network toggle, package reuse, crop retuning, install/download/cloud/Git effect,
phone build, M12 or production changes. Automation remains paused.

Unchanged gates: R1 real independence/coverage, R2 model comparison, R3 device
performance, R4 calibrated unknown, R5 enrollment, R6 actual OCR utility and M12;
M9 timing/M10 OFF/M11 real-staff also remain unchanged.
