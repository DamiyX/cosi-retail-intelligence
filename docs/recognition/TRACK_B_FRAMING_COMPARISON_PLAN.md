# Track B — controlled product-framing comparison

Date: 2026-10-10. Status: planning complete; implementation and execution pending.
This plan does not authorize a private run, model adoption or M12. No agent was
dispatched during planning. Founder switches to Sol6.1 HIGH for the subsequent
implementation/coordinator-audit cycle.

## Decision and evidence

Use the existing forty photographs of the same ten physical products to compare
the saved A5 full-picture baseline with manually boxed product crops. Keep the
encoder, numerical recipe after cropping, reference/query split and ranking fixed.
Do not collect another ten products or repeat A5 unchanged at this stage.

A5 produced forty vectors and twenty scored queries: ten correct identities
ranked first, four second, five third and one ninth. Founder confirmed that the
ninth-ranked Airpro query depicts the intended product. The line on that product
is not a proven cause. CWAY750/600 confusion and weaker brush/lip-gloss rankings
are observations, not explanations. Remaining reference identities and labels
need checking during annotation; Airpro confirmation does not certify all forty.

Source inspection shows that producer.preprocess includes the whole photograph,
then letterboxes it to224 pixels. This makes framing a useful first variable to
test. The intervention changes BOTH background/context and the number of pixels
occupied by the product. It cannot separate those effects, prove that background
caused the original errors, or remove an occluding hand/line. A successful manual
crop is an assisted-framing diagnostic, not evidence of automatic segmentation.

Independent alternatives considered before selecting this comparison:

| Alternative | Why not the first comparison |
|---|---|
| Another encoder | Changes representation and setup; does not isolate framing. |
| New photos/products | Needed later, but changes subjects/capture as well as method. |
| Automatic segmentation | Adds a model and another failure source before testing whether framing helps. |
| Fixed central crop | Can remove the intended product; manual boxes provide a clearer diagnostic. |
| OCR/barcodes/more references | Different evidence pathways or gallery sizes; require a separate planned comparison. |

Official image-embedder documentation explains feature-vector comparison using
cosine similarity; it does not establish that cropping improves this dataset:
https://developers.google.com/edge/mediapipe/solutions/vision/image_embedder/python
No Tasks runtime, quantization example or telemetry behavior is adopted from that
page. Existing exact artifact provenance remains the licensing authority.

## Reconciliation with the first exploratory plan

Retain TRACK_B_EXPLORATORY_EXECUTION_PLAN.md and E01–E05 as completed/historical
baseline authority. Preserve forty original hashes, A1–A5 consumed attempts,
saved vectors, reports and numerical review. Do not rewrite their recipe, claims
or reports. This is a separately versioned follow-up, not a repair to A5.

Retain offline private inference, reviewed exact software/model bindings, local
reports, complete twenty-query accounting and audit before real-photo execution.
Add only explicit crop annotations, a new preprocessing recipe and paired analysis.
Existing literal baseline schemas must not be loosened or supplied false recipe
identifiers to admit the new vectors. Formal STRONG/AMBIGUOUS/UNKNOWN and dataset
gates remain unchanged; this report must not issue those calibrated classifications.

## Fixed protocol

1. Freeze the A5 inputs, software/model/source bindings and saved results. Verify
   their hashes before using them. Reuse the saved full-image vectors; do not run
   the baseline again or replace it with a more favorable run.
2. Founder confirms the intended identity and marks one box on every reference
   and query photo. The annotation tool shows photo ID/expected label, not scores
   or suggested matches. Founder has already seen some results, so this is NOT
   a blinded study. All boxes are frozen together before any new scores appear.
3. Box the entire visible intended product, including cap/packaging/transparent
   outline where discernible. No text-only boxes, manual background painting,
   line removal, invented hidden edges or product-specific optimization. Hands
   within the rectangle remain. Ambiguous identity/bounds are recorded and block
   the complete comparison until reviewed; do not silently omit that photograph.
4. Coordinates use the full-resolution EXIF-oriented image: integer left/top
   inclusive, right/bottom exclusive. Require 0 <= left < right <= width and
   0 <= top < bottom <= height. Reject strings, booleans, nonintegers and overflow.
5. Expand the marked rectangle by ceil(0.05 * box width) on each horizontal side
   and ceil(0.05 * box height) vertically, clamped to the image. Fixed5% padding
   for every image; no per-product adjustment. Record marked and effective boxes.
6. Decode with the reviewed bounded JPEG/container path; orient; convert RGB;
   crop the full-resolution RGB image; then use the existing224 letterbox,
   grey128 padding, LANCZOS, rounding and float32 /255 normalization unchanged.
   No crop of the112-pixel report thumbnail. No JPEG re-encoding of originals.
7. Encode each of the forty crops once with the same pinned MobileNetV3 Small
   0.75/224 float32 version1 artifact, CPU1thread LiteRT2.2.0, existing Pillow/
   NumPy environment and1024-dimensional output. No training or model download.
8. Rank distinct identities using the existing maximum cosine over the two
   references per identity and deterministic tie rule. Keep all twenty queries.

New recipe ID: `rgb-product-box5-letterbox-224-v1`. Its manifest binds original
photo hashes, IDs/roles/identities, oriented dimensions, all boxes, exact operation
order, model/software/source hashes and the A5 baseline digest. Hash the frozen
annotation manifest itself. Changed boxes require a separately approved experiment,
not a silent retry. If a true label error is discovered, stop and document it;
retain A5 as historical and propose any corrected baseline explicitly.

## Four views of one paired comparison

| Condition | References | Queries | Purpose |
|---|---|---|---|
| FF | Saved full-image | Saved full-image | Immutable A5 baseline |
| CC | Cropped | Cropped | Primary comparison with FF |
| FC | Saved full-image | Cropped | Diagnostic: query framing only |
| CF | Cropped | Saved full-image | Diagnostic: reference framing only |

All four use the same encoder and identity set. Cross-recipe FC/CF are intentional
analytical conditions, never evidence that production caches may mix recipes.
Only forty new encodings are needed; other conditions reuse vectors. These are
twenty paired queries, NOT eighty independent observations. Do not select whichever
condition wins and present it as the preselected primary result.

Report rank/top1/top3 for all twenty per condition, paired improvements/regressions/
unchanged, complete failures, per-product two-query results, exact-size CWAY
confusions, attracting wrong identities, raw similarity/margins and timing/resources.
Scores are not probabilities. One query changes these sample percentages by5points.
If retaining withheld-identity proxy reporting, remove BOTH references of the target
in each applicable condition; label it proxy only. It is not genuine unknown data
and cannot justify a rejection threshold. No threshold search is in scope.

Invalid queries remain in the denominator as unscored failures. Missing/invalid
reference vectors mark the affected condition incomplete, not an easier valid
gallery. Preserve row-level reasons and do not claim recognition quality from an
incomplete condition. Runtime errors stop according to existing bounded policy;
no retry-until-green or repeat-until-perfect.

## Local annotation and privacy

Provide a small static local annotation page, tested on generated images first.
Founder selects the exact approved originals through a local file picker; match
hashes against the allowlist rather than trusting filenames. Do not add a server,
remote assets, analytics, upload endpoint, automatic filesystem discovery or image
data in exported annotations. Use restrictive CSP and escaped labels. Export only
the bound annotation JSON and a local completeness checklist.

Human viewing is separate from model inference, as with the existing local report.
Execution approval must explicitly cover this new local display/annotation tool;
planning does not grant it. No private image bytes go to an agent or remote model.
The page must work offline. Founder may disconnect while annotating and save progress
locally; this is not the timed inference attempt and does not claim its native guard.
No Python preview-generation pass online. Browser EXIF orientation and CSS-to-image
coordinates must be verified against generated orientation fixtures and the producer's
dimension checks before the annotations are accepted. If local-browser restrictions
prevent this design, stop for a bounded revised design; do not introduce services.

The subsequent single inference attempt uses the audited manual OFF/confirmed-empty
ON mechanism with a NEW bound package. Keep all existing native predicates, radio
checks, process lifetime controls and deadlines. No firewall/adapter/profile changes,
network sandbox redesign, automatic toggles or old-package reuse. Founder participation
is needed for OFF/ON, even though no phone or new capture is needed.

## Implementation boundaries and licensing

Prefer new files in `apps/recognition-lab/tools/framing-comparison/` and new
`src/framingComparison*` modules/tests. Use a separate strict comparison schema.
Reuse unchanged safe file/container/interpreter primitives and ranking utilities;
do not duplicate cosine arithmetic or impersonate the baseline bundle validator.
The existing producer worker hardwires preprocess: a new narrow crop-worker adapter
needs its own lifecycle audit. Do not monkeypatch the old producer or broadly
refactor the baseline to inject arbitrary processing functions.

The new source fingerprint must include every imported helper and relevant schema,
report and runner file, not just the new directory. Existing source fingerprint
enumerates Python files in the baseline tools directory; keep new implementation
outside it and verify preservation of the historical source manifest. Escalate any
necessary old-source change with an exact rationale/delta before editing it.

No mobile, domain/contracts, migrations, sync, dependency/lock changes or production
RecognitionService changes. No new model/license is needed: verify the same artifact
hash, stored license/provenance and dependency inventory. Never infer rights from a
download URL. Missing provenance is a setup blocker. Reuse the isolated environment;
no global installs, cloud jobs, costs or uploads. Budget remains forty new encodes,
existing per-image60s/producer900s limits and bounded evaluator. Do not raise limits
without reviewing a concrete failure. A5's laptop duration is evidence, not an ETA.

## Audit and result decision

Tickets in TRACK_B_FRAMING_COMPARISON_TICKETS.md specify generated regressions and
independent coordinator checks. Code/fixture acceptance precedes annotation-tool use
and private inference. Generated fixtures do not pass native/private/accuracy gates.

Positive evidence: CC improves first-choice counts over FF, with every loss visible
and no incomplete rows. Call this promising on these same instances, not a production
pass. Unchanged/worse results provide useful evidence against this particular framing
intervention; do not retune boxes after seeing results. A top3 gain alone is not a
first-choice gain. FC/CF may guide the next hypothesis but cannot isolate background
from pixel scale or demonstrate an automatic capture system. No significance or
generalization claim from two correlated views per product.

After coordinator verifies hashes, scores and result accounting, founder reviews
paired contact sheets. A later separately planned step must test an operationally
realistic capture/cropping method, fresh physical instances/captures and true unknowns.
The formal test plan's representative30–50-product stage and15–25% unknown queries
remain open. Android speed/memory, guided enrollment, OCR and M12 integration remain
separate gates. Do not automatically expand into them from this result.

## Authorization and next action

Current authority ends at these planning documents. Founder switches to Sol6.1 HIGH
and approves this packet for implementation. Sol dispatches the existing implementer
sequentially; coordinator audits its stopped return. No new audit agent is needed.
After source acceptance, founder performs forty local annotations (no new photographs).
Coordinator validates/finalizes their manifest and issues exact new execution approval
and single-attempt package. Founder runs the manual OFF/ON experiment. No repeat copy
permission for unchanged approved originals is needed; changed recipe/tool execution
and exact E04 binding must nevertheless be approved rather than borrowed from A5.
