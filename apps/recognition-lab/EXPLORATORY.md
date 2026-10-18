# Separate same-instance exploratory tool

E01–E03 implementation; E04 independent source acceptance is pending. This is a
lab tool, not a production encoder, formal dataset, confidence calibration,
independent holdout or M12 integration. The private forty photos are the same ten
physical items, two references and two later query views per item. Original
formal manifests/curation/thresholds and earlier selections are not modified.

The tool produces full feature vectors with one CPU interpreter, then imports
the existing `unitVector`, `prepareGallery` and `rank` math. It reports distinct
top three trial identities, maximum reference cosine, nearest reference, raw
margin and ties within 1e-12. Threshold and package-confidence fields are dropped.
Both target references are removed in the separate WITHHELD-IDENTITY PROXY.
This proxy is not newly sampled unknown data or rejection safety evidence.

All twenty queries remain in the denominator, including errors and NOT_RUN.
One failed reference blocks the entire gallery. Tie ordering is deterministic
ID ordering, with ties displayed rather than turned into confidence. Evaluation
is explicitly `REPLAY_OF_VERIFIED_VECTORS`; the bundle's mode separately records
whether its vector origin was generated-fixture or private inference.

## Exact setup and current blocker

The isolated environment is in ignored
`runs/exploratory/e01-e03-20261004/venv`. No bundled/global packages were changed.
The wheel-only [requirements.lock](tools/exploratory/requirements.lock) pins
LiteRT2.2.0, Pillow12.3.0, NumPy2.5.3 and all transitive dependencies, with actual
PyPI SHA256 values. `backports.strenum==1.3.1` excludes Python3.12 and the initial
install failed. The published compatible1.2.8 was selected, inspected and locked;
the failed log and unused1.3.1 wheel remain in evidence. No constraints were
ignored, no source builds, conversion, TensorFlow/PyTorch/Tasks or GPU installed.

Exact Google asset:
`https://storage.googleapis.com/mediapipe-models/image_embedder/mobilenet_v3_small/float32/1/mobilenet_v3_small.tflite`.
4,117,670 bytes; SHA256
`bbbb4c51a55a53905af1daec995ca1aae355046f8839bb8c9f5ce9271394bc40`.
The [official task guide](https://developers.google.com/edge/mediapipe/solutions/vision/image_embedder)
identifies the0.75 small float32 model. The actual export's metadata declares
Apache2 and a feature vector; its generic model title says “image classifier”,
but the output is explicitly `feature`, not classification probabilities.
Its packaged labels are never read by the encoder/evaluator. Exact metadata
is reproducible with `inspect_model.py`; tensor allocation inspection established:

- Input `serving_default_inputs:0`, index0, float32 `[1,224,224,3]`.
- Output `StatefulPartitionedCall:0`, index221, float32 `[1,1024]`.
- Metadata NormalizationOptions mean `[0]`, std `[255]`; formula `(x-mean)/std`.

Frozen recipe hash:
`ac67af950aed4789c275425b93e8816cf0950f2d6bd01a199879a011b669b81a`.
Decode strictly as JPEG, compressed<=40MiB and dimensions<=50MP. Read/hash/decode
the same bounded buffer. Apply EXIF orientation274 only; collect no GPS/time/device
fields. Convert supported RGB/gray images to RGB, preserve the full image, fit224
using min scale, floor(x+0.5), pinned Pillow LANCZOS, centered RGB128 padding,
odd extra pixel at right/bottom. Untagged images are assumed sRGB. Embedded
profiles must parse as RGB with the pinned LCMS `sRGB built-in` profile name;
other/malformed profiles fail visibly. This is a conservative supported-profile
policy, not a colour-management conversion. Tensor is contiguous NHWC float32
little endian /255. Record RGB pixel, tensor and recipe hashes.

Runtime uses `BUILTIN_WITHOUT_DEFAULT_DELEGATES`, one thread, batch1; one interpreter
is allocated in a sequential child process. No plugins or delegate loaders are
called. The pinned Windows package temporarily registers local DLL directories
and prepends them to its process PATH on import. The wrapper immediately restores
the inherited process PATH; no persistent/global PATH change is made.

**Network gate remains UNRESOLVED.** The exact wheel's Python metrics helper is
no-op, and generated-image smoke observed no Python socket events or IPv4 TCP/UDP
endpoints before/after inference. `observe_generated.py` explicitly documents why
this does not prove native, transient or IPv6 egress absence. It cannot promote
`networkReviewed`. No firewall/network policy changes were made. Private encoding
is blocked until the coordinator resolves this gate with adequate exact-runtime
evidence and independently accepts the source. Changing model/runtime is outside
this assignment.

## Files and guards

`producer.py` receives an explicit study/root/local model/setup/software inventory.
It does no discovery or downloading. Its worker receives opaque IDs, bound file
locators/hashes and pixels; identity labels, families and truth never enter the
interpreter. The parent enforces60s per image,900s total encoding including load,
terminates on timeout/crash and retains unrun rows. Decode errors remain visible;
runtime/model failures stop globally. It writes new PNG derivatives only from
oriented letterbox pixels, not model inputs or recompressed originals.

Load failures record an optional, strictly validated `runFailure` with stage
`load` and reason `TIMEOUT`, `WORKER_FATAL`, `DISCONNECTED`, `OS_ERROR` or
`INVALID_READY`. New producer bundles always include it (null on success).
No exception text or file paths enter this field. All forty records remain
`NOT_RUN` on a load failure. JSON, HTML, shared summary and CLI output retain
the cause, twenty-query denominator and incomplete status (exit2).
`loadMs` measures parent elapsed time from spawning through ready/failure receipt;
`encodingMs` measures image work and is zero when loading fails. `attemptMs`
includes both intervals and worker cleanup. Earlier bundles may omit these new
fields; their absent total attempt time is shown as unrecorded.

The Python path wrapper rejects reparse/symlink/hardlink/case/short-name aliases
and traversal. Inputs are confined to the lab, fixtures to exploratory runs,
private images to private-data, models/software/outputs to exploratory runs.
Fresh output directories and exclusive writes prevent overwrite. OS restrictions
prevented creation of a true file symlink in tests; junction and hardlink cases
executed. These checks assume no hostile concurrently rewriting process; hash
and file identity checks reduce races but are not an OS sandbox.

`inventory.py` hashes1,344 installed non-pyc dependency files. Producer checks
actual installed versions, absence of unreviewed packages, and exact inventory
bytes before execution. Every bundle binds runID, study/source/model/recipe/setup/
software hashes, asset hashes and before/after preservation. Current source hashes
include new Python modules/lock and the imported ranking/path/schema/provenance
modules. Editing these makes old bundles stale; no cache is accepted silently.

`exploratoryCli.ts` validates bindings, rechecks original bytes, and creates a fresh
ignored report. JSON/CSV/static HTML have all query rows, per-item counts and the
full confusion table including the two separate CWAY trial IDs. Reports escape
labels, neutralize CSV formula prefixes and load only copied local PNG derivatives.
No remote scripts/fonts/assets. Contact sheets and full vectors remain private.
Shared `summary.txt` omits labels, paths and vectors. Rendering/input failures do
not authorize retrying a real experiment or changing settings after scores.

## Reproduce generated checks (PowerShell from repository root)

No downloads or model needed for these tests once Pillow/NumPy are installed in
the isolated environment. Existing lock supports offline installation from the
reviewed wheel cache. Do not install into the base bundled Python.

```powershell
$trialEvidence = 'apps/recognition-lab/runs/exploratory/e01-e03-20261004'
$trialPython = "$trialEvidence/venv/Scripts/python.exe"
& $trialPython apps/recognition-lab/tools/exploratory/test_producer.py
node --test --test-reporter=tap apps/recognition-lab/__tests__/exploratory.node.ts
npm run typecheck --workspace @retail/recognition-lab
npm run lint --workspace @retail/recognition-lab
npm test --workspace @retail/recognition-lab
```

For a new generated end-to-end check, use a new directory. First create its parent
inside exploratory runs, then `generate_fixtures.py --out <new-parent>/generated`.
Use the reviewed local model, `setup.json` and `software.json` in the evidence
folder; call producer with all explicit paths and a new runID. The generated-only
mode may run while the native-egress gate is unresolved. It is never permission
to put private pixels in a generated study. The documented E01 evidence includes
one generated smoke plus one40-image generated attempt, not real recognition data.

```powershell
& $trialPython apps/recognition-lab/tools/exploratory/producer.py --study <fresh-generated>/study.json --root <fresh-generated> --model "$trialEvidence/mobilenet_v3_small.tflite" --setup "$trialEvidence/setup.json" --software "$trialEvidence/software.json" --out <fresh-producer-output> --run-id <new-generated-id>
node apps/recognition-lab/src/exploratoryCli.ts --study <fresh-generated>/study.json --root <fresh-generated> --bundle <fresh-producer-output>/bundle.json --setup "$trialEvidence/setup.json" --out <fresh-report-output> --run-id <new-generated-id>
```

The angle-bracket placeholders above must be replaced; they are not shell commands.
The handoff contains concrete paths for the already-run generated attempt and
proposed E05 commands. `prepare_study.py` reads original intake metadata/selection
and hashes without decoding, creates a separate non-admitted private study, and
uses recorded labels only for reports. Actual private inference additionally
requires `--approval` with six exact fields: `status=APPROVED_FOR_EXPLORATORY_RUN`,
`studySha256`, `sourceSha256`, `setupSha256`, `softwareSha256`, `runId`. The coordinator
must author that after E04; the implementer does not self-authorize it.

CLI exits:0 complete;2 incomplete/failure evidence;1 setup/binding/path rejection.
Retain failed logs and partial outputs. Do not retry until green, retune
thresholds, substitute a model, overwrite original selections or call laptop
timings Galaxy/native performance.
