# R4 store-local retrieval preparation

This is a headless recorded-output lab, not a retailer-facing visual scanner.
It executes no image decoder/encoder, Android work, native cache, business write,
model download or network request. Public toy vectors establish mechanics only.
Real R1 photos/curation, exact R2 weights/rights/export/execution, R3 two-device
measurements and R4 independently held-out real calibration/quality remain pending.
No final model/runtime/tolerance/production threshold is selected.

## Gallery and query boundary

`src/retrievalGallery.ts` uses the accepted R2 `adaptPrecomputed` validation and
the central `unitVector`. Supply an imported dataset, exact manifest hash,
candidate/bundle, split, current store and explicit selection. The CLI imports
and verifies assets first; the in-memory API expects that importer result and
rechecks structural identity/ownership plus recorded-output provenance.
Checksums detect changes; they do not authenticate a deliberately forged source.

`fixtures/r4/selection.json` is authored public toy input. It identifies a store,
revision and active product/package mappings. Every selected product needs
enrolled references; every package mapping must belong to that product. All
references of a selected product are retained. Omitting a mapped referenced
package rejects instead of silently shrinking that product's gallery. Duplicate,
foreign, missing, invalid or failed references cannot form a partial gallery.
Selection can exclude whole products, but a query cannot enroll a new one.
Optional recordedStock is advisory toy metadata; zero never suppresses identity.
All supplied selection content is bound, including that metadata.

`createRetrieval` in `src/retrieval.ts` copies source/config/cache data and returns
fresh contexts, snapshots and results. Its query loader receives a copied,
validated recorded output and AbortSignal; it is a controlled async seam, not
an image encoder. Query ID/asset/output must match the selected recorded bundle.
Ranking/grouping and package safety are imported unchanged from `rank`.

- DECISION contains STRONG / AMBIGUOUS / UNKNOWN. A valid weak match is UNKNOWN.
  Uncertain packages are null with packageUnitNeedsConfirmation=true; no guessed
  price, conversion, commercial value or transaction effect is returned.
- INVALID, UNAVAILABLE, FAILURE (including TIMEOUT), CANCELLED, STALE and BUSY
  are distinct manual-fallback outcomes. Creation rejects invalid/unavailable
  galleries; the evaluator reports setup failures with null metrics/results.
- One query can be pending per facade/session. cancel invalidates its generation
  and aborts its signal. It remains occupied until that loader settles, even when
  abort is ignored; an old context cannot become current again.
- close permanently invalidates old work. Close the old facade before creating
  a replacement for store/model/gallery/session changes. The lab does not create
  a global queue, native worker, background hook or compute-termination guarantee.
- Contexts bind the complete gallery hash and a unique facade incarnation, in
  addition to store/session/candidate/generation. Recreating even an unchanged
  facade with the same session ID rejects its predecessor's context before loading
  a query. Contexts are ephemeral; incarnation IDs do not enter public reports.
- Direct holdout facade creation, public evaluation and the CLI all require the
  complete R4 calibration wrapper, including its R2 freeze and exact gallery
  binding. Missing/inner-only freezes, changed selection/revision/store/reference
  output or config reject before queries or metrics, including unavailable-cache
  evaluation. Generic single-query decisions do not themselves establish quality.

## Disposable cache and recovery

`src/retrievalCache.ts` serializes only derived gallery identity and normalized
reference vectors under lab-derived-gallery-v1. Binding includes current store,
dataset/version/manifest/content hashes, exact candidate/model/preprocessing/
space/dimension, reference identity/assets/output hash, and selection revision/
content hash. It contains no asset locators or business data.

Load validates strict schema, checksum and exact equality to a rebuild from all
current source references. This includes recomputed-checksum tampering, dimensions,
zero/nonfinite vectors, duplicates and product/package ownership. No tolerance
or partial acceptance is introduced. This deliberately revalidates/rebuilds in
memory; it is not a performance optimization or production storage decision.
Missing/corrupt/incompatible cache yields UNAVAILABLE with rebuildRequired and
manualFallback. Source data stays unchanged. Explicit rebuild produces a new
compatible snapshot; source failure still prohibits setup.

Cache vectors may live only in public authored toy fixtures or ignored runs.
Never put private vectors/photos in a public report. The CLI keeps every cache
target in ignored lab runs. JSON/Markdown summaries contain IDs/hashes/config,
candidate/product/package decisions, all failure/refusal counts, and limits,
without raw vectors or free-text producer/private file locators.

## Commands from the repository root

Use the already installed pinned toolchain; no installs:

```powershell
$taskNodeFolder='C:\Users\doyew\.cache\cosi-toolchain\node-v24.21.0-win-x64'
$env:PATH="$taskNodeFolder;$env:PATH"
node apps/recognition-lab/src/retrievalCli.ts evaluate --manifest apps/recognition-lab/fixtures/dataset.json --dataset-root apps/recognition-lab/fixtures --candidate apps/recognition-lab/fixtures/r2/toy-a.json --bundle apps/recognition-lab/fixtures/r2/toy-a-calibration.json --selection apps/recognition-lab/fixtures/r4/selection.json --store synthetic-store --split calibration --config apps/recognition-lab/fixtures/r2/config.json --cache apps/recognition-lab/runs/r4-guide/gallery.json --cache-mode build --out apps/recognition-lab/runs/r4-guide/build
node apps/recognition-lab/src/retrievalCli.ts evaluate --manifest apps/recognition-lab/fixtures/dataset.json --dataset-root apps/recognition-lab/fixtures --candidate apps/recognition-lab/fixtures/r2/toy-a.json --bundle apps/recognition-lab/fixtures/r2/toy-a-calibration.json --selection apps/recognition-lab/fixtures/r4/selection.json --store synthetic-store --split calibration --config apps/recognition-lab/fixtures/r2/config.json --cache apps/recognition-lab/runs/r4-guide/gallery.json --cache-mode reuse --out apps/recognition-lab/runs/r4-guide/reuse
node apps/recognition-lab/src/retrievalCli.ts calibrate --manifest apps/recognition-lab/fixtures/dataset.json --dataset-root apps/recognition-lab/fixtures --candidate apps/recognition-lab/fixtures/r2/toy-a.json --bundle apps/recognition-lab/fixtures/r2/toy-a-calibration.json --selection apps/recognition-lab/fixtures/r4/selection.json --store synthetic-store --split calibration --configs apps/recognition-lab/fixtures/configs.json --choose 0 --out apps/recognition-lab/runs/r4-guide/calibration
node apps/recognition-lab/src/retrievalCli.ts evaluate --manifest apps/recognition-lab/fixtures/dataset.json --dataset-root apps/recognition-lab/fixtures --candidate apps/recognition-lab/fixtures/r2/toy-a.json --bundle apps/recognition-lab/fixtures/r2/toy-a-holdout.json --selection apps/recognition-lab/fixtures/r4/selection.json --store synthetic-store --split holdout --frozen apps/recognition-lab/runs/r4-guide/calibration/frozen-retrieval.json --cache apps/recognition-lab/runs/r4-guide/gallery.json --cache-mode reuse --out apps/recognition-lab/runs/r4-guide/holdout
```

Expected exits: **0,0,0,2**. Holdout deliberately includes one TIMEOUT; all eight
selected queries remain inventoried. Calibration has three queries with two
STRONG (including a deliberately unsafe lookalike) and one UNKNOWN. These are
toy tooling results, not acceptable model quality. Development similarly exits2
for its authored ADAPTER_ERROR.

evaluate writes retrieval.json/.md. calibrate writes retrieval-calibration.json/
.md and frozen-retrieval.json. Exit0 means a failure-free tooling report; exit2
means reported query/setup/cache failures; exit1 means rejected arguments/input/
path/I/O. Old reports can remain after a rejected run; inspect exit/hash rather
than assuming old files belong to the new attempt. `--cache-mode reuse` never
silently repairs. `rebuild` repairs an unavailable cache explicitly and records
its earlier failure; `build` creates a snapshot from current source.

Calibration reuses `calibrateCandidate` and requires the complete enrolled
selection, so the accepted R2 full-gallery sweep is not misrepresented as subset
calibration. No subset-calibration algorithm is introduced. Its R4 wrapper also
binds exact store/selection/reference identity. Holdout rejects ordinary config,
missing/cross-candidate/stale freeze, selection drift and config override. Tuning
on development/holdout rejects before bundle evaluation. A checksum freeze cannot
prove secrecy or prevent deliberate human retuning; independent review remains.
Subset development evaluation retains every query and labels removed products
as unknown to the current active gallery.

`src/retrievalEvaluation.ts` evaluates through the facade and uses existing metrics,
then checks decision/rate parity against accepted R2 evaluation of the same scoped
gallery. This is self-check parity, not independent assurance. Failed references
or cache setup leave selected/evaluated/blocked counts, reported query failures
and reference failures visible with metrics N/A. Node elapsedMs/timing are the
only nondeterministic measurement fields, explicitly labelled postprocessing;
they do not measure inference or Android performance.

## Filesystem and verification boundary

All explicit CLI inputs must reside inside this lab, normally public fixtures or
ignored authorized private-data/runs. The R0 importer still enforces the explicit
dataset root and hashes/leakage. R4 additionally checks every existing path
ancestor and file for links, including links back inside the lab. Output/report/
cache paths require ignored runs; all targets are checked before any creation or
write. Junction/symlink/hardlink targets, duplicate output targets and collisions
with source manifests/assets/candidate/bundle/selection/config/freeze are rejected.
Every source and existing destination is compared by exact bigint device/inode
identity as well as canonical path. This detects real Windows 8.3 aliases even
when realpath retains short names. Distinct future destinations are bound to the
nearest existing physical ancestor plus their remaining path components; aliases
cannot bypass the check merely because a report/cache file does not yet exist.
Do not run another process that swaps these files during a lab command; this is
a sequential local tool, not a hardened concurrent multi-user file server.
Preflight protects rejected invocations; separate successful report/cache writes
are not an atomic multi-file transaction if a later filesystem write fails.

```powershell
npm test --workspace @retail/recognition-lab
npm run typecheck --workspace @retail/recognition-lab
npm run lint --workspace @retail/recognition-lab
```

The R4 suites exercise controlled promises rather than sleeps, real standalone
Node CLI exits, freeze discipline, mutation safety, exact cache/metric round-trip,
failure counts and linked paths. See docs/recognition/reports/R4_PREPARATION.md for
actual commands/results, failed attempts and protected-scope evidence. Root/mobile,
camera, SQLite, sales/sync and native physical checks are outside this lab addition.
The final-audit corrections and actual Windows short-path results are recorded in
docs/recognition/reports/R4_FINAL_AUDIT_CORRECTION_HANDOFF.md.
Stop after this R4 preparation handoff for coordinator source audit, founder-return
combined Astra review and later physical work. No R5 or M12 begins here.
