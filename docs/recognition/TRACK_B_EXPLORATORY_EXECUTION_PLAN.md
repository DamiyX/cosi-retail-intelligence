# Track B — first real-photo experiment and laptop tool

2026-10-04. Reconciled Astra planning proposal. Execution approval pending.
Planning only: no installation, model download, implementation, inference or dispatch.
This is existing M8 Track B lab work, not M12 or production model adoption.

## Purpose in plain language

Use two earlier photos of each of ten products as a reference catalogue. Give the
tool two newer photos of each product and show its first three matches alongside
the correct answer. One laptop tool supplies the missing image encoder and uses
the lab's existing matching mathematics. Building that tool and running the test
are two stages of this one plan. No new APK or phone connection is required.

These are the SAME ten physical items:20 references and20 queries, not40 independent
products. This tests same-item retrieval across changed views/backgrounds. Even
20/20 cannot establish general retail accuracy, safe unknown rejection, independent
holdout performance or Galaxy speed. Success here means trustworthy exploratory
measurement, not reaching an invented accuracy target or passing M8/M12.

## Source inspection and independent proposal

Read current PROJECT_STATE, BUILD_PLAN, MULTI_AGENT_WORKFLOW, Track B/evaluation
requirements and recognition decisions including D-046 and deferred model/runtime
choices. Inspected lab schema/importer/curation/precomputed/comparison/ranking/
retrievalPaths/comparisonCli plus package and candidate declarations.

- `precomputed.ts` validates recorded vectors but cannot produce image features.
- `ranking.ts` already provides stable L2 normalization, maximum reference cosine
  per product/package, distinct top3 and deterministic tie ordering.
- `curation.ts` correctly rejects physical-family overlap in formal datasets.
- Existing comparison reports use thresholds and recorded-output timing; these
  cannot become calibrated real-model evidence merely by supplying vectors.

[Independent notes](reports/EXPLORATORY_INDEPENDENT_DESIGN_20261004.md) were
written before opening the earlier proposal in this turn. Prior conversation
exposed its broad direction; this is not a blinded-review claim. The earlier
proposal is preserved verbatim in [the Sol archive](reports/EXPLORATORY_SOL_PROPOSAL_20261004.md),
SHA256 `df5f152801e6b1732362d3df439032ad659312714169f2078b622847c96594a2`.

## Reconciliation

| Topic | Earlier proposal | Final proposal |
| --- | --- | --- |
| Missing encoder | Laptop producer plus existing ranking | Retain; no duplicate matching engine or phone app. |
| Same physical items | Exploratory limitation stated | Retain; use a separate explicit study record, never bypass formal curation. |
| Model | MobileNetV3 Small provisional | Retain as one compact baseline; exact artifact rights/tensors remain setup gates. |
| Runtime | MediaPipe Tasks, also initially in independent notes | Prefer lower-level LiteRT CPU after discovering current Tasks metrics notice; verify exact runtime behavior before private inference. |
| Preprocessing | General outline | Freeze explicit full-image recipe and exact normalization before scores. |
| Audit | Coordinator review followed actual trial | Fixture checks, stopped handoff, coordinator code audit, THEN private-photo execution. |
| Evidence | Raw top3 and failures | Add complete denominators/ties/provenance and separately labelled withheld-identity diagnostic. No confidence statuses. |

This runtime adjustment is proposed for the lab only and requires approval with
the execution plan. It does not reopen the mobile runtime decision.

## Model, runtime and licences

First candidate: official MobileNetV3 Small0.75/224 float32 image-embedding export,
version1. Frozen inference, no fine-tuning or per-product training. Use its feature
vector, not classification probabilities. No OCR, barcode decoding, segmentation
or classifier-name lookup. Compact baseline first; ImageNet training does not
prove retail variant recognition.

Proposed runtime: Python3.12 x64, `ai-edge-litert==2.2.0`, CPU Interpreter,
one interpreter/thread and batch size1. Pillow for decoding/resizing, NumPy for
tensors; pin exact compatible versions and all transitive wheels in E01. No
GPU/NPU, full TensorFlow, PyTorch, MediaPipe Tasks or model conversion for this run.
Lower-level execution requires explicit preprocessing instead of Tasks defaults.

Primary evidence checked October4:

- [Google Image Embedder](https://developers.google.com/edge/mediapipe/solutions/vision/image_embedder)
  lists the small224x224 float32 model. Proposed official asset:
  `https://storage.googleapis.com/mediapipe-models/image_embedder/mobilenet_v3_small/float32/1/mobilenet_v3_small.tflite`.
- [Google's upstream feature-vector variation](https://www.kaggle.com/models/google/mobilenet-v3/tensorFlow2/small-075-224-feature-vector/1)
  declares Apache2 and1024 dimensions. This does not prove an arbitrary TFLite
  export has identical tensors, normalization or rights.
- [LiteRT documentation](https://developers.google.com/edge/litert/migration)
  supports local `Interpreter(model_path=...)` execution. [Release2.2.0](https://pypi.org/project/ai-edge-litert/2.2.0/)
  lists a Python3.12 Windows x64 wheel; [source licence](https://github.com/google-ai-edge/LiteRT/blob/main/LICENSE)
  is Apache2. Laptop compatibility remains untested.
- [MediaPipe's current notice](https://pypi.org/project/mediapipe/) says input
  processing is local but Tasks sends performance/utilization metrics. No
  verified opt-out was established here. Do not silently consent or fall back
  to Tasks while claiming zero outbound effects.
- [Inspected MobileCLIP weight terms](https://raw.githubusercontent.com/apple-aiml-research/ml-mobileclip/main/LICENSE_MODELS)
  exclude product development from their research grant. Exclude that artifact;
  its code licence cannot grant weight rights.
- [Standard DINOv2 model card](https://github.com/facebookresearch/dinov2/blob/main/MODEL_CARD.md)
  documents Apache2 weights and retrieval use. ViT-S/14 is a possible separately
  approved later challenger, not an automatic download or mobile selection.

E01 must bind exact asset URL/version/SHA256/bytes, upstream-to-export provenance,
weight/code/dependency terms and notices, feature-output tensor meaning, layout,
dtype, numeric normalization and reviewer. Unknown values stay unknown. Stop
before inference if exact rights or preprocessing remain unresolved; founder
permission cannot waive missing third-party rights. Never guess normalization
from a similarly named TF2 model or silently substitute a model/runtime.

## Private study and local setup

Already-approved private inputs are in ignored
`apps/recognition-lab/private-data/r1-pilot/`, with revised queries in its
`exploratory-20261004/` subfolder. Historical copy review records20 matching
source/copy hashes; this planning turn did not repeat the photo audit. Original
reference manifest SHA256 is
`faba50bdb6ca8a963e9bf84b78478eeaded28d4a9ad120d145249579900fbf91`.
The historical52-path preservation check preceded two intentional worksheet
copy-status updates; do not claim those worksheet bytes never changed.

After approval create a NEW private `same-instance-exploration-v1` study record:

- Exactly20 references and20 revised queries with IDs, relative paths, hashes,
  ten identities, real shared physical families and separate capture exposures.
  Preserve source selection/manifests. CWAY750/600 remain distinct trial IDs;
  no volume inference or production package-model change.
- Use revised brush/AER pairs; retain excluded originals untouched. Flash on
  lip-gloss queries only is founder-reported, not independently measured.
- No calibration/holdout label, false independent families, relaxed validator
  or edited reference manifest. Formal R1 readiness remains incomplete.
- Encoder receives pixels and opaque IDs only. Labels/names/filenames/decoded
  codes cannot improve ranking. Visible text may influence visual features;
  that does not mean OCR has been implemented.

Use a removable virtual environment under ignored lab `runs/exploratory/`.
Existing bundledPython3.12 is a possible base, never mutate its packages or global
PATH. Acquire only pinned reviewed wheels and one official model into a local
cache; record actual hashes/bytes and verify publisher hashes where available.
Proposed acquisition ceiling:500MiB downloads and2GiB added disk. These are
permission limits, not measured cost. No source builds/compiler/global install,
Docker, npm/mobile dependency, cloud account or paid fallback.

Separate online acquisition from execution. Runtime accepts local paths only;
no downloader, cloud API or telemetry integration. Review exact pinned runtime
network behavior and observe generated non-private fixture execution before
private inference. If zero-outbound operation cannot be supported, stop for a
scoped decision. A Python socket patch cannot prove native code is disconnected.
No silent firewall/global network changes; clean code search alone is not proof
of network isolation. No original-photo upload or hosted model inference.

## Frozen preprocessing and encoding

Freeze descriptor/source revision before inspecting any similarity scores:

1. Read each allowlisted file into bounded memory, hash the same bytes decoded,
   strictly validate JPEG; no recursive discovery. Reject truncated/unexpected
   data and decompression bombs; cap40MiB compressed and50megapixels per image,
   checking dimensions before allocation where supported.
2. Apply only EXIF orientation to pixels; preserve file bytes. Do not collect
   GPS/timestamps/device metadata. Declare an sRGB/untagged-sRGB policy and flag
   unsupported colour profiles rather than silently changing the experiment.
3. RGB full-image fit to224x224, no crop. Scale=min(224/w,224/h); dimensions use
   floor(original*scale+0.5), clamped1..224. Pinned Pillow LANCZOS, centred padding
   RGB(128,128,128), odd extra pixel on right/bottom.
4. Apply exact tensor layout/dtype/mean/scale proven from export metadata/source
   in E01. Those numeric values must be resolved before E02 acceptance; no guess
   between [0,1] and [-1,1], no double normalization. Record final RGB pixel hash,
   tensor hash and descriptor hash.
5. Frozen CPU inference once per image. Record actual output tensor/dimension,
   vector and provenance. Reject empty/nonfinite/zero vectors or shape changes.

No original recompression, hand/background removal, augmentation or choosing a
crop after seeing the answer. Thumbnail storage policy does not apply to raw
recognition captures. Hands do not reveal occluded text or reliably establish
size. Keep clutter/flash/occlusion to measure this full-frame baseline honestly.
New preprocessing variants require a new experiment, never recycled holdout claims.

## Matching and formal-evaluation boundary

Python produces vectors/provenance only. New thin TypeScript evaluator validates
study/model/preprocessing/asset bindings, then reuses `unitVector`,
`prepareGallery`, `rank`. An internal non-admitted projection may satisfy their
types; never export it as a formal dataset or weaken curation to admit it.

Each query compares to20 references. Identity score is maximum cosine over its
two views. Return three DISTINCT identities, raw scores and top1-minus-top2
margin. Retain stable ID tie order, but display ties within1e-12 explicitly.
L2 normalization stays in existing math. Full float vectors, no quantization,
lossy compression or ANN index needed for40 images.

`rank` also emits threshold statuses/package certainty: discard these fields.
New report schema must not expose STRONG/UNKNOWN or confidence percentages.
Test raw top3/order invariance across valid threshold configurations. No threshold
sweep, calibrated rejection, package-unit accuracy claim or production winner.
Do not relabel existing recorded-output comparator as real encoder execution.

Secondary diagnostic: remove BOTH references for each query's correct product,
rank against the other9 using the SAME vectors. Label WITHHELD-IDENTITY PROXY;
show similarity/margin separately. It is not newly sampled unknown data and
cannot prove rejection safety or determine production thresholds.

## Failures, provenance and resource limits

Require a fresh non-existing output directory per attempt. Preflight destinations;
confine canonical inputs/model/output to approved roots, reject traversal,
reparse/symlink escapes, Windows case/hardlink aliases and original overwrites.
Reuse existing path protections with stricter wrapper rules where necessary.
Hash the original files before/after; unexpected change invalidates the attempt.

Identity/hash/cardinality/rights/preprocessing mismatch: SETUP_BLOCKED, no scoring.
Failed reference: incomplete gallery, no silent19-reference test. Failed query:
visible failure row, never removed. Runtime crash/timeout: mark remaining entries
NOT_RUN and retain partial evidence. One sequential worker, per-image60s and total
encoding15min limits, no automatic retry. Record settings before execution.
Invalid model/runtime stops globally; individual decode failures remain visible.

Bind runID, producer/evaluator code fingerprints, model/input/preprocess hashes
and software inventory to every output. No stale cache reuse. An explicit later
re-score of verified vectors is REPLAY, not fresh inference. Do not put photo
bytes/private paths/background text into shared logs or source control.

## Reports and interpretation

Private outputs: frozen study/config/candidate/software inventory, vectors or
structured failures, timings, preservation record, JSON/CSV and escaped static
HTML with small local contact-sheet derivatives. Derivatives stay in the ignored
run and never become model inputs. No remote scripts/fonts/resources or uploads;
sanitize labels/paths/CSV formula prefixes. Embeddings are private too.

Show all20 primary query IDs, truth, top3 scores/margin, ties/errors and first/
first-three match indicators. Counts use denominator20 including failed/unrun
queries; also show scored count and incomplete status. Ten product rows show
0/1/2 successes; confusion table explicitly includes the two CWAY sizes. Show
nearest reference examples for mistakes. Correlated same-item views do not
support population confidence intervals or general performance claims.

Separate load/decode/preprocess/inference/ranking timing. Record CPU/OS/threads
and measured memory only if available; no invented RSS or Android latency from
laptop measurements. Small mixed cold/warm sample is not a robust p95 benchmark.
Proxy results have their own table. Shared summary contains non-identifying
counts, limitations and one recommendation, not private photos/paths/vectors.

Invalid/incomplete measurement -> repair tool; repeated confusion -> propose one
later capture/model experiment; promising results -> collect independent products
and real unknowns. No automatic alternate model, retry-until-green or score tuning.

## Actual photo-test procedure AFTER code audit

1. Coordinator approves exact source fingerprint/environment/model and fixture
   evidence. Unresolved rights, preprocessing or network gates block inference.
2. Validate40 existing private allowlisted photos/labels/hashes and fresh run
   path. Founder need not take new photos, connect the phone or watch encoding.
3. Encode20 references then20 queries in stable ID order, once. Do not change
   settings mid-run. Preserve all failures and resource-limit evidence.
4. Validate provenance, compute20 primary matches plus separate proxy, render
   local report and verify original hashes. Executor stops with commands/results.
5. Coordinator checks evidence and traces CWAY, brush, lip gloss and errors/ties
   against vectors and photos. Mathematical consistency and product usefulness
   are separate; another ML judge cannot replace ground truth.
6. Founder later reviews contact sheet and labels. Corrections create a new
   versioned attempt, retaining the old one. No recapture merely to hide poor
   results. New independent/unknown capture and interactive phone recognition
   are later stages, not silently fulfilled by this experiment.

## Tickets, approval and remaining scope

[E01–E05 tickets](TRACK_B_EXPLORATORY_TICKETS.md) define setup, producer, evaluator,
coordinator code audit, then actual execution. These are lab tasks, not milestones.
M8 planning: Astra. Implementation/code audit: Sol6.1 HIGH. Approved routine setup
may use Sol LOW. No dispatch now; no concurrent writer and coordinator audit.

Required founder approval: implement this lab tool, acquire bounded dependencies/
one model, and process the exact40 privately copied images AFTER source audit
and resolved setup gates. One approval can cover that sequential scope; already-
fulfilled photo-copy permission need not be requested again. This planning
request grants none of those execution effects.

Ask again for another model/runtime, exceeding limits, broader dependencies,
network consent/OS changes, upload, paid effects or native/architecture changes.
Missing third-party rights is a blocker, not a founder waiver. No production
RecognitionService/SQLite/sync/business changes, M9–M11 edits or new milestone.

Still open afterwards: representative independent R1 data/calibration/holdout and
real unknowns; further candidate evidence; Galaxy latency/memory; guided multiple-
angle enrollment; OCR fusion; reference lifecycle/sync; M12 integration. Existing
formal gates keep their requirements. No recognition result exists from this plan.
