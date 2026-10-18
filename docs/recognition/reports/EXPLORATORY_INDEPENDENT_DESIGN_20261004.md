# Independent design notes before proposal reconciliation

Prepared 2026-10-04 in the founder-requested Astra planning turn. These notes
were written after requirements/source inspection and before opening the prior
`TRACK_B_EXPLORATORY_EXECUTION_PLAN.md` in this turn. Prior conversation already
exposed that proposal's broad direction; this is an independent derivation from
requirements, not a claim of a blinded review. Planning only; no execution.

## Starting evidence

- Existing Track B plan expressly permits a 10–20-product real smoke exercise,
  distinct from full R1 representative evaluation and later M12 integration.
- Forty private images are available: twenty reference and twenty revised query
  images for ten trial identities. Same physical items; no unknown images.
  Stored coordinator copy report records twenty verified copies and unchanged
  references; it is historical evidence, not a fresh file audit in this turn.
- Source `precomputed.ts` validates recorded vectors but does not generate them.
  `ranking.ts` already implements stable L2 normalization, maximum reference
  cosine per product/package and distinct-product top3. Reuse it.
- `curation.ts` rejects physical-family overlap between reference/query roles.
  Do not relabel families, weaken that rule or label this study calibration/
  holdout. A separate small exploratory-study record must preserve that overlap.
- `rank` always returns a STRONG/AMBIGUOUS/UNKNOWN decision using thresholds.
  Raw retrieval must be projected separately for this uncalibrated exercise;
  do not present existing defaults as evidence-based confidence.

## Independently proposed experiment

One laptop CLI producer plus a thin TypeScript exploratory evaluator/reporter,
not a phone app, camera session, new service or production ML contract. Use a
single frozen visual embedding model in inference mode; no per-product training.
Encode forty exact allowlisted images once, retain individual failures, and
score twenty query images against all ten identities/twenty reference images.
Private human labels are for reporting only; filenames, barcodes, names and
ground truth cannot influence feature extraction or ranking.

Start with one compact mobile embedding baseline: Google MobileNetV3 Small
0.75/224 float32 through MediaPipe Python CPU. It is a provisional experiment
choice, conditional on proving the exact model/export's terms and local wheel
compatibility, not a production model/runtime decision. Google publishes an
Apache2 small-075 feature-vector upstream model card; that does not by itself
prove provenance of an arbitrary similarly named TFLite file. Bind the official
artifact version, actual hash and export evidence at setup.

Do not use the MobileCLIP artifact under the currently inspected restrictive
Apple research-model terms for COSI product development. DINOv2 ViT-S/14 has an
official Apache2 model card and a retrieval use case; retain as an explicitly
reviewed later challenger if needed, not a silent runtime/download fallback.
Its greater setup/compute cost is not justified before this small baseline runs.

Separate asset preparation from evaluation. Define one exact full-image
preprocessing recipe before seeing scores: upright RGB, aspect-preserving fit
within 224x224, fixed neutral padding, pinned resize kernel; model normalization
occurs once. Read orientation only if needed, never collect unrelated EXIF.
No detection, segmentation, OCR, manual query crops, augmentations, source edits
or automatic selection of the best of many preprocessing variants. A poor result
should diagnose the next experiment rather than trigger an unrecorded retry.

Main output: per-query top3/margin/ties, raw top1/top3 counts out of20, failures,
per-product results and CWAY size confusion. All queries remain in denominators.
No calibrated STRONG, unknown-safety or package-unit accuracy claims.

Cheap optional-to-explain but prescribed diagnostic: remove the true product's
two references for each query, then rank against the other nine identities using
the SAME vectors. Report similarity/margin when the right answer is absent.
This is a withheld-identity proxy, not twenty newly collected unknown examples,
and cannot validate unknown rejection or set a production threshold.

## Boundary and implementation shape

- Explicit read-only study input, immutable asset/model/preprocessing bindings;
  execution ID and fresh output directory per attempt, no stale output reuse.
- Python environment isolated under ignored lab runs; existing bundled3.12 is
  a possible base, never mutate bundled/global packages. Reviewed wheels only.
- Python emits exact vectors/provenance and failures. Node validates them and
  uses existing ranking math; no second handwritten ranking implementation.
- Fixed input/output roots, no path discovery, upload, auto model download at
  runtime, executable model-supplied code, source-file overwrite or symlink escape.
- Reference failure prevents scoring a silently smaller gallery. Query failure
  stays visible; systemic model failures stop the run with truthful accounting.
- Report measured laptop loading/decoding/preprocessing/inference/ranking times
  separately; never transplant Pixel6 or laptop latency into Galaxy claims.
- Private human-readable HTML/Markdown plus JSON/CSV, no external scripts/fonts,
  escaped labels and local-only photo links. No confidence percentage UI.
- Small producer/evaluator tests with authored vectors/generated non-private
  image fixtures first; coordinator source audit before the real-photo run.

Tickets should separate frozen study/terms setup, producer, evaluator/reporter,
coordinator audit, and actual execution/report. Installation and model downloads
need explicit execution approval; original-photo copy approval is already done.
No new dependency/model install, source implementation, recognition run, agents,
phone control, services or Git publication is authorized by this planning turn.

## Primary sources inspected in this turn

- https://developers.google.com/edge/mediapipe/solutions/vision/image_embedder
- https://developers.google.com/edge/mediapipe/solutions/vision/image_embedder/python
- https://www.kaggle.com/models/google/mobilenet-v3/tensorFlow2/small-075-224-feature-vector/1
- https://raw.githubusercontent.com/apple-aiml-research/ml-mobileclip/main/LICENSE_MODELS
- https://raw.githubusercontent.com/facebookresearch/dinov2/main/MODEL_CARD.md

Provider claims establish supported task/licence statements only, not local
model correctness, exact artifact equivalence or retail-recognition performance.
