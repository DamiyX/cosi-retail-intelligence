# Empty R1 capture packet — version 1

These are unfilled templates, not a dataset, permission record or model choice.
Copy them into a later explicitly approved private dataset root. No real folder
has been authorized yet. Do not put private photos/worksheets in this directory.

- `selection.csv`: header-only product availability worksheet. One row per product
  identity; list its package forms and old/new packaging separately. Record missing
  samples instead of inventing coverage.
- `captures.csv`: header-only capture/review worksheet. One row per actual image.
  The CSVs are human worksheets; the CLI accepts the JSON files only.
- `dataset.json`: strict existing schemaVersion1 manifest, zero products/images,
  explicitly synthetic. Replace unfilled IDs only when actual evidence exists.
  `unselected` adapter metadata is a placeholder; dimension1 does not select or
  execute an encoder. Change kind to real-capture only for actual real captures.
- `curation.json`: strict curation schemaVersion1, null bindings, no entry reviews,
  pending human decision, false attestations, no seal. Null bindings are incomplete;
  incorrect non-null bindings are invalid. Pending reviews must use actual entry
  IDs and asset hashes, not zero hashes or invented permission IDs.

Run the empty packet from repository root:

```powershell
node apps/recognition-lab/src/cli.ts readiness --manifest apps/recognition-lab/templates/r1-v1/dataset.json --dataset-root apps/recognition-lab/templates/r1-v1 --curation apps/recognition-lab/templates/r1-v1/curation.json --out apps/recognition-lab/runs/r1-empty
```

Expected exit2: valid integrity, incomplete review/coverage/seal, realDatasetReady
false. Inspect `readiness.json` and `readiness.md` in the explicitly selected output.
Both files are replaced on a valid readiness invocation, including invalid dataset
or sidecar input; argument/I/O failures may leave old files. Check the command exit.

## Curation shape

`src/curation.ts` owns the strict lab-local shape; unknown fields and omitted keys
are invalid. All identifiers must be ASCII pseudonyms matching the existing lab
ID convention (letters/digits/dot/underscore/hyphen, at most128 characters).
Do not use names, serial numbers, EXIF or private notes. The schema cannot detect
whether an identifier is a person's name; that privacy check is human-owned.

Top level: schemaVersion1, datasetId, datasetVersion, manifestSha256, evidenceKind,
entries, review, holdoutSeal. Binding fields may be null only while unfilled.
Hash fields contain lowercase SHA256 of the exact bytes. evidenceKind is pending,
synthetic-tooling-only or real-capture-attested. Never relabel authored data as real.

Each entry review has exactly:

| Field | Meaning |
| --- | --- |
| entryId / assetSha256 | Actual manifest entry ID and exact asset byte hash |
| decision | pending, accepted or rejected |
| reviewerId | Pseudonymous reviewer ID, or null while pending |
| sourceFamily | Source-image/adjacent-frame/derivative family ID, or null |
| physicalFamily | Physical item/sample family ID, or null |
| usability | pending, accepted or rejected after inspecting the image |
| permission | pending, accepted or rejected after inspecting private rights records |
| permissionId / provenanceId | Exact manifest rights.permissionId / rights.provenance, or null |
| challengeTags | Array of the vocabulary below; no duplicates |

Challenge tags: close-size, close-flavour, similar-packaging, single, pack, carton,
old-packaging, new-packaging, reflective, transparent, damaged, no-code,
distinctive-local, unknown-lookalike, unknown-unrelated, unknown-unregistered-size,
unseen-package, manual-choice-required. Tag only conditions actually observed.
Unknown tags cannot be applied to known entries. unseen-package is only for a
known query whose labelled package has no reference for that product. These are
capture labels, not predicted scores or a replacement product catalogue.

`review` has reviewerId, decision and three Boolean human attestations:
imageUsabilityInspected, rightsRecordsInspected, physicalIndependenceInspected.
All must be explicitly accepted/true after inspection to record completeness.
A flag records a decision; the tool cannot prove the decision's truth.

`holdoutSeal` is null until curator review. Then it has reviewerId,
decision=`sealed-before-tuning`, exact manifestSha256 and inventory. Inventory
contains exactly every holdout query as `{entryId, assetSha256}` once, including
known and unknown queries. No references or other-split queries may appear.
The seal detects drift, but does not encrypt data or prove nobody inspected it.

Set datasetId/version/hash only after the manifest is written. In PowerShell:

```powershell
(Get-FileHash -LiteralPath <approved-root>/dataset.json -Algorithm SHA256).Hash.ToLowerInvariant()
```

Use the actual resulting hash; even whitespace changes require a renewed binding
and seal review. A changed capture, rejected entry removal or split change needs an
explicit revised manifest/version and refreshed curator decision. The tool never
removes rejected entries. Keep the private reviewer/rights evidence with the dataset.
The capture protocol and exact coverage policy are in `../../DATASET_CAPTURE.md`.
