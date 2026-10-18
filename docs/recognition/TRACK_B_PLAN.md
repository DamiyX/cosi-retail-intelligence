# Track B — Visual recognition delivery plan

Date: 2026-10-02. Status: corrected R0 source/tooling independently accepted.
Evidence: reports/R0_A2_INDEPENDENT_REVIEW.md and reports/R1_INDEPENDENT_REVIEW.md.
R0–R4 preparation final audit and sequential source corrections independently accepted. All implementers stopped. Current review:reports/R1_R4_FINAL_AUDIT.md; original handoff retained as history.
October4: forty private reference/query photos of the SAME ten physical items
are available for exploration. Astra reconciled the first laptop experiment and
tool plan in TRACK_B_EXPLORATORY_EXECUTION_PLAN.md with E01–E05 tickets; execution
approval and exact setup gates pending. Independent representative data and
executed encoder/device/accuracy acceptance gates remain open.
Owner: coordinator; founder explicitly requested Astra for this planning packet.
Implementation default: GPT-6.1 Sol HIGH, sequential stopped handoff and independent audit.

## Outcome in shop language

A retailer points the camera at one product. A readable saved barcode or QR can
identify it immediately. Otherwise, appearance can retrieve an already enrolled
store product, even offline. Similar-looking alternatives appear for confirmation;
an unfamiliar item still uses the photo-and-price selling flow. Recognition never
invents a price, stock balance, weight, package conversion or identity.

To teach the app, the retailer selects a product/package and moves the camera
around it. The eventual guided experience keeps a few clear, useful views and
reports actual capture progress. A separate thumbnail makes the product easy for
people to identify. Adding references does not require training a new neural
network for each product. Barcode-bearing products can also have visual references.

Two physically indistinguishable products cannot be reliably separated by a
camera. Offer explicit selection or an internal label. Loose produce, weight and
grade inference are outside the first FMCG commitment. Basket scanning means
successive products, not identifying an entire basket or shelf in one frame.

## Verified starting point

Inspected checkout: COSI-m8-planning, branch plan/m8-unified-scanner, HEAD
66ea3fc22595a48d7355d1729bb879496cc98896. Five pre-existing documentation changes
were present and preserved. No production source changed during this planning.

- Only apps/mobile and packages/contracts + packages/domain currently exist.
  No recognition-lab, recognition-core, trained candidate, reference dataset or
  benchmark result is present in those workspace directories.
- packages/contracts/src/recognition.ts is a strict barcode-only contract:
  BarcodeInput, method BARCODE, STRONG/AMBIGUOUS/UNKNOWN. It is consumed by
  ScannerPanel and the store-bound resolver and sale/catalogue clients.
- The resolver preserves store ownership and package relationships; inventory
  balance does not filter identity. It rejects disputed mappings as ambiguous.
- Architecture documents describe a broader conceptual interface with images and
  enrollment. That is intended architecture, not the implemented TypeScript API.
  Do not widen the production union or add enrollment calls casually.
- DOMAIN_DATA_MODEL section 14 describes RecognitionProfile, RecognitionReference
  and version-aware RecognitionEmbedding. These are design entities, not proof
  that production recognition persistence exists.
- Mobile currently uses Expo 57 / React Native 0.86.3. Native runtime compatibility
  must be established on this actual combination before adopting a library.
- Current photos are private human identification media. A small thumbnail is
  not proof of usable recognition references. Do not automatically export them
  or reuse them as evaluation data without provenance/consent.
- M8 sound is reported working by the founder in his current session. Controlled
  native gates remain limited; focus/slider follow-ups are deferred. Track B can
  be planned and tested separately without claiming M8 accepted.
- M9 returned implementation still needs its separate integration/audit. It is
  not a dependency of the initial recognition lab. M10/M11 are likewise not
  prerequisites for lab research; M12 production integration keeps its gates.

Authorities: D-017..D-022/D-030; SCANNING_ARCHITECTURE; RECOGNITION_TEST_PLAN;
TECHNICAL_ARCHITECTURE sections 37–39; DOMAIN_DATA_MODEL section 14; PC-08/PC-15.
No final model, runtime, camera replacement or shared-data policy is selected.

## Delivery sequence and stop points

The roadmap uses R0–R8 for engineering work. The test plan separately uses
evaluation phases R0 setup / R1 difficult set / R2 expanded set / R3 pilot.
Always name the work milestone AND evaluation phase in reports. Historical
report names R1_MODEL_COMPARISON and R2_DEVICE_BENCHMARK do not imply that the
expanded dataset or pilot passed.

| Work milestone | Observable result | Evidence required before advancing |
| --- | --- | --- |
| R0 lab foundation | Reproducible evaluation and failure-report pipeline | Small fixtures prove measurement correctness, not recognition quality; independent audit |
| R1 evaluation dataset | Versioned 30–50 product difficult set, independent queries and unknowns | Provenance, split integrity, capture protocol and missing strata reviewed |
| R2 encoder benchmark | Compare at most three credible pretrained encoders initially | Same split, exact preprocessing/checksums, errors and unknown results, licence/export review |
| R3 Android runtime benchmark | Shortlisted candidates measured on Galaxy A15 and a lower-spec device | Cold/warm latency, RAM, disk, thermal, offline assets and numerical equivalence |
| R4 retrieval + unknown | Store-local ranked matches with calibrated refusal | Independent holdout, package safety, threshold/coverage trade-offs and cache failure tests |
| R5 enrollment | Guided capture selects useful views and survives restart | Compare simple manual capture against guided automatic selection; friction and recognition gain |
| R6 OCR/verification experiments | Text helps resolve genuinely confusing pairs, if useful | Paired visual-only vs visual-plus-OCR results, offline assets, latency and size cost |
| R7 same-store recognition sync | Device B recognizes references enrolled on A | Explicit media protocol review; store access, compatibility, retries and deletion/revocation tests |
| R8 production candidate | Reviewed integration proposal and rollback-ready package | Expanded evaluation set, device results and all production gates accounted for |
| M12 integration | Proven visual path in the existing scanner and sale experience | Approved additive contracts/migrations, native build, regression/device and independent acceptance |

R0 is accepted; R1 preparation now has its own plan/tickets. Later tickets are written
from measured outcomes. Do not treat this table as permission to implement all
milestones. A failure can lead to rejection or a narrower optional capability;
it must not lead to silently lowering the existing acceptance thresholds.

## Smallest initial build

Use the existing monorepo. Begin with a separately runnable, headless TypeScript
workbench under apps/recognition-lab, using the existing Node/npm/Jest toolchain.
This is the first surface of the intended lab, not another customer application.
No camera, ML installation or native APK is needed to prove the evaluator.

First feed the evaluator deterministic fixture vectors and ranked outcomes.
These exercise scoring, unknown rejection and reproducibility only; mark every
such result synthetic. Real encoders and camera capture follow in R2/R3 after
their exact dependencies, licences and export paths have been reviewed. Python
may be isolated and version-pinned in the lab if a selected research encoder
requires it; do not install a second stack speculatively in R0.

Keep experimental interfaces local to the lab initially. The production barcode
contract remains unchanged. Before M12, propose additive image-input/result and
enrollment contracts with explicit cancellation, store scope, model/preprocessing
version and package uncertainty; review all consumers and error semantics. An
I/O or unavailable-model failure must remain distinguishable from a valid UNKNOWN.
Extract packages/recognition-core when validated reusable ranking logic has two
real consumers. Do not create an empty package merely to match the diagram.

Initial implementation surface: apps/recognition-lab package/config/src/tests,
root workspace validation scripts + lockfile if necessary, dataset documentation,
and benchmark reports. No production SQLite/Supabase migration, sales, costing,
inventory, runtime camera or photo-policy changes in R0.

## Data, comparison and safety rules

Dataset manifest: dataset version; product/variant/package identity; store-scope
fixture; packaging generation; reference/query role; development/calibration/
holdout split; capture-session group; image hash and relative asset locator;
device/lighting/view metadata; rights and permission record. Keep unknown product
identities absent from the enrolled gallery. Separate captures of the same item,
adjacent video frames and duplicate/cropped copies cannot leak across splits.
Hashes detect exact duplicates; capture-session grouping and curator review are
also required because hashes alone cannot detect transformed copies.

R0 fixtures can be tiny. Its optional real smoke set is 10–20 products, explicitly
not an accuracy gate. Evaluation R1 uses 30–50 difficult products and independent
queries, including close sizes/flavours, individual/pack/carton, old/new packaging,
glare and distinctive no-code goods. Start with the test plan's 15–25% unknown
query guidance, including lookalike unknowns, and report exact denominators.
The founder will be needed for representative physical samples/capture, not for
building the fixture pipeline. Do not manufacture a real-data pass while waiting.

Compare against manual search/time-to-selection and the existing barcode path.
For encoders, compare a small mobile visual baseline and a mobile image-text
encoder family, with at most one justified additional challenger. MobileCLIP or
a LiteRT-compatible embedder are candidate families, not adopted models. R2 must
pin exact weights/revision/hash, preprocessing, code AND weight licence, export
operators, runtime compatibility and asset size before running each candidate.
Do not equate brand-level or image-text benchmark success with exact SKU matching.

Use exact store-local similarity retrieval first; no vector server or ANN until
measured need. Group references by product/package before top-k so three views of
one item do not consume three alternatives. A raw cosine score is not a probability.
Tune thresholds and margins only on calibration data. Keep final holdout sealed
until configuration is frozen; any retuning makes that evaluation developmental.
Report false STRONG matches on unknowns, STRONG precision AND coverage, known
top-1/top-3, package errors, unknown recall and failures/timeouts. Never improve
reported precision by hiding low coverage or silently dropping failed queries.

Beta targets remain those in RECOGNITION_TEST_PLAN section 62: about 90% known
top-1, 97% top-3, at most 1% unknown false acceptance, 98–99% STRONG precision,
95% claimed package accuracy, median about 1.5s and p95 about 3s. Report raw
counts and uncertainty; tiny samples cannot establish rare-error safety. R0 is
not required to meet these numbers and cannot claim them. Ambiguous package
identity requires confirmation even if product identity is strong.

## Capture, storage and runtime direction

Single intended object first. Start from still-image inference; benchmark a
bounded sampled preview path later. At most one inference in flight; stale
session/store/model results are discarded and buffers released. Stop work on
background/navigation and preserve manual fallback. No continuous expensive OCR
or saving every frame. Camera provider changes require evidence and explicit review.

Guided enrollment must measure useful sharpness/exposure/diversity. Avoid a fake
percentage or fixed four-view requirement. Show successful useful captures,
honest prompts and a finish/retry option. Test compression/input resolution against
recognition and OCR before choosing limits. The existing 300KiB thumbnail policy
does not silently become the recognition-reference policy. Keep bounded approved
source references for model migration, separate from thumbnails and regenerable
embeddings; measure MB/100 products and extrapolate to 500/1,000/5,000.

Future profile/reference storage retains product/package/store ownership,
provenance, status and asset version/hash. Embeddings retain model hash/version,
preprocessing and dimension. Never compare incompatible vectors. Migration builds
a new cache alongside the previous one, validates it then switches atomically;
failure leaves the old version available. Interrupted enrollments need draft
cleanup without deleting committed references. No production schema numbers are
reserved before integration because the business schema may advance meanwhile.

R7 must extend the approved media/sync architecture, not invent a second business
outbox or include image bytes in transaction envelopes. Store references stay
private; platform contribution requires separate consent/moderation. Missing media
or recognition cache corruption must not block or corrupt business transactions.

## Bounded research sanity check

Research question: is the existing embedding/retrieval plan feasible enough to
test, and what could invalidate it? Criteria: SKU discrimination/open-set safety,
offline device performance, licensing, Expo integration risk, reproducibility.
Baseline is current barcode/manual/photo-price. Stop research once these risks
are assigned a concrete benchmark; no model catalogue sweep is warranted now.

Primary sources checked 2026-10-02:

- Google [Android image embedding guide](https://ai.google.dev/edge/mediapipe/solutions/vision/image_embedder/android):
  source-reported capability, high confidence within its native sample scope.
  Supports image/video/stream embedding; busy stream frames can be ignored.
  This supports testing bounded inference, not COSI accuracy or Expo compatibility.
- ONNX Runtime [mobile usability checker](https://onnxruntime.ai/docs/tutorials/mobile/helpers/model-usability-checker.html):
  source-reported tooling, high confidence within model/operator analysis scope.
  Export and acceleration suitability need inspection; theoretical mobile support
  does not prove fast end-to-end execution on this phone. This is a falsification
  check against assuming an exportable model will automatically be practical.
- Apple [MobileCLIP model terms](https://github.com/apple-aiml-research/ml-mobileclip/blob/main/LICENSE_MODELS):
  observed separate weight terms, high confidence that code licence alone is
  insufficient. No legal/commercial approval or redistribution permission is
  concluded by this planning review; assess the exact selected artifact.

Recommendation: retain the approved retrieval experiment, benchmark before
adoption. Desktop model rankings, commercial rights and native compatibility are
unknown until evaluated. Cloud image identification adds a network dependency;
a closed per-SKU classifier adds retraining friction. Neither replaces the
approved local-reference baseline without comparative evidence and review.

## Execution and approval boundary

See TRACK_B_R0_TICKETS.md for the bounded first packet. After plan approval, assign
one separate implementation chat using Sol 6.1 HIGH. It reads the actual baseline,
preserves pending work, implements only R0, reports exact evidence and stops.
Coordinator audits after the stop; no simultaneous edits/phone ownership. Commit,
push, native build spending and deployment follow existing explicit authorizations.

Later device checks use the utility lane and real founder availability. Dataset
collection, runtime/native adoption and final model selection have their own
gates. No phone connection, Docker or external backend is required for R0 fixtures.
No blocking product question prevents presenting this plan. Real representative
data and target-device access will be required before model acceptance.


October2 execution checkpoint: R0-A2-01/02 resolved and corrected R0 source/tooling
independently accepted. See reports/R0_A2_INDEPENDENT_REVIEW.md. Implementation
is stopped; R1 dataset/capture planning is next. Earlier audits are historical;
no model/runtime or recognition-quality gate passed.

## Founder-authorized R1–R4 preparation cycle — October2

Sol6.1 HIGH implements and independently audits sequentially, with stopped
handoffs/corrections before advancing. Founder defers physical photos/tests until
return and reserves final combined audit for Astra. Code/preparation acceptance
may advance; R1 real dataset, R2 real encoder results, R3 device performance and
R4 real calibration/holdout gates remain pending until actual evidence exists.
No final model/runtime, M12 integration or lowered threshold follows from mocks.
No new spending, deployment or private-data reuse permission is implied.
