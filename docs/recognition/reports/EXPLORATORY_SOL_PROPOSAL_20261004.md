# Track B first real-photo exploratory trial

Date: 2026-10-04. Prepared after founder approved the revised twenty-photo
private copy. This is an execution proposal within the existing R2 lab track,
not a production model decision, R5 enrollment, or M12 integration.

## What is ready

Twenty reference photos of ten trial identities remain in the ignored private
`apps/recognition-lab/private-data/r1-pilot/` packet. Twenty revised query photos
are now in its separate `exploratory-20261004/` folder. Coordinator independently
checked every selected original/copy against its expected SHA256 and rehashed
all 52 protected paths in the utility report. Twenty copied JPEGs total
52,359,931 bytes. Reference manifest remains
`faba50bdb6ca8a963e9bf84b78478eeaded28d4a9ad120d145249579900fbf91`.
Private copy evidence: `copy-verification.json` and
`coordinator-copy-review.json` in that exploratory folder.
After review, the two exploratory worksheets were intentionally updated with
copy status. The 52-path preservation result refers to the review before those
metadata edits, not a claim that every worksheet byte is still unchanged.

Queries show the SAME physical items as references. They support an early
same-item experiment only; no independent product/generalization/holdout claim.
All twenty queries are known items. Unknown rejection cannot be measured yet.
Keep the original reference manifest/curation and strict readiness rules intact.
The improved brush/AER pairs replace four photos in this trial's selected set,
without deleting historical originals or mislabelling their conditions.

## Observed execution gap

`src/precomputed.ts` consumes recorded vectors; it does not decode images or
execute an encoder. The lab package has only Zod as a runtime dependency.
Read-only module-discovery checks found no MediaPipe, ONNX Runtime or PyTorch
in either bundled Python 3.12.14 or the user's Python 3.13.15. No installer,
weights download or encoder inference has run. Existing toy fixture outputs
must never substitute for the forty real image encodings.

## Bounded evidence and options

Decision criteria: local/offline execution, removable setup, explicit model
and preprocessing provenance, practical small baseline, and suitable weight
terms. Short primary-source review, accessed October4:

| Option | Evidence and limit | Disposition |
| --- | --- | --- |
| Keep preparation tooling only | Inspected source supports recorded outputs but no image encoding. | Valid baseline; cannot answer whether these pictures identify products. |
| MobileNetV3 small via MediaPipe Image Embedder | [Official task guide](https://developers.google.com/edge/mediapipe/solutions/vision/image_embedder) lists a 224x224 float32 embedding model; [Python guide](https://developers.google.com/edge/mediapipe/solutions/vision/image_embedder/python) documents local image embedding and cosine similarity. | Proposed first removable lab trial, conditional on exact artifact/weight terms and runtime review. No SKU accuracy inferred from ImageNet or Pixel6 performance. |
| MobileCLIP model from the earlier draft family | [Actual model terms](https://raw.githubusercontent.com/apple-aiml-research/ml-mobileclip/main/LICENSE_MODELS) restrict the defined research use and expressly exclude product development/commercial products. | Exclude this artifact from the proposed COSI trial; do not infer eligibility from its code licence or the earlier draft suggestion. No new substitute family adopted here. |

[MediaPipe Python setup](https://developers.google.com/edge/mediapipe/solutions/setup_python)
documents Windows and Python3.9+. This is not proof that a particular package
wheel works on this laptop. The [runtime code licence](https://github.com/google-ai-edge/mediapipe/blob/master/LICENSE)
does not by itself establish the exact downloaded model's weight terms.
The bounded exact-name source search did not resolve those weight terms.
Stop if exact proposed-use terms cannot be established; never fill a reviewed
candidate declaration with placeholder provenance or fabricated checksums.

## Proposed sequential task

1. With dependency/download approval, prepare a removable environment in an
   ignored lab location using the existing compatible Python where possible.
   Pin package versions/locked dependency inventory; no global installation,
   npm/mobile dependencies or native build changes. Download one official model
   artifact, record source/version/actual SHA256/bytes, and review its exact
   terms before using it. Stop on incompatibility or unresolved terms rather
   than silently changing model/runtime or installing further tools.
2. Implement a lab-only producer accepting ONLY an explicit allowlist of these
   twenty reference and twenty revised query paths/hashes. No gallery sweep,
   upload, EXIF extraction or source-image transformation. Decode/preprocess
   in memory using documented orientation/color/resize/normalization settings;
   record the descriptor and actual model output dimension. Keep original
   reference manifest/curation unchanged. The existing R2 comparator remains
   a recorded-output consumer; production RecognitionService is untouched.
3. Execute one exploratory full-image baseline. Aggregate the two reference
   views per identity with the existing maximum cosine-ranking rule; show each
   query's correct label, closest three distinct identities, similarity/margin
   and failures. Account for all20 queries. Keep raw scores separate from
   confidence/probability; no invented calibrated STRONG/UNKNOWN threshold.
4. Verify candidate/asset/output bindings and retained errors. Emit readable
   results plus local machine evidence under ignored runs, never photo bytes
   or sensitive background text in shared reports. Inspect CWAY size confusion,
   dark brush, hand occlusion and recurring clutter; do not tune on results
   and present the same examples as a fresh holdout. Report laptop timings
   as laptop measurements, never Galaxy latency.
5. Builder stops with source/evidence handoff; coordinator reviews independently
   before any further model, preprocessing, unknown-data or device phase.

Coding owner: existing Track B implementation chat, GPT-6.1 Sol HIGH, after
scope/approval dispatch; routine setup may use the approved utility effort.
No implementation chat has been resumed for this proposal. No concurrent writer
and coordinator review. Photo utility task is stopped and copy accepted.

## Limits and approval boundary

Photo copy approval is fulfilled. New package/model downloads and installation
still need the repository policy's dependency approval. Exact weight licence,
package version, downloaded size/hash and observed runtime remain unreviewed
until bounded setup; no broad install authority, account, paid service or upload.
No Docker/backend/Metro/phone/cloud build, OCR, enrollment, M12, new milestone
or production model adoption. No recognition results exist yet. Full R1 capture,
unknown cases, independent calibration/holdout and later Android evidence remain
open regardless of how this twenty-query exploratory trial performs.
