# Product availability before a capture order

`availability.csv` is header-only. The founder supplies actual availability for
30–50 enrolled identities and unknown candidates. It is a human planning worksheet,
not an admitted dataset, capture campaign or permission to collect images.
Keep a filled copy in a later explicitly approved private root, outside Git.
Use pseudonymous aliases; omit personal names, serial numbers and private rights
details. A rights-record alias points to separately retained evidence.

One row represents a specific identity/package form/generation. Separate close
sizes, flavors and package units when identity differs. Record literal packaging
text and barcode availability/condition; do not infer a barcode from a product
name. Unknown candidates have `enrollment_role=unknown-query` and never enter the
reference gallery. Known rows use `enrollment_role=known`.

List available independently obtained physical sample families. Fresh photographs,
new backgrounds, timestamps, adjacent frames and derivatives of the same item do
not create physical independence. R1 references are development references;
queries belong to development, calibration or holdout. Keep reference/query and
query-split physical and source families disjoint under accepted R1 rules. Mark
missing families instead of allocating the same sample across incompatible roles.
Holdout queries remain sealed before tuning; this worksheet is not a seal.

Capture-condition availability can include lighting, distance, angle, clutter,
blur, glare, occlusion, reflective/transparent/damaged packaging, old/new packaging,
single/pack/carton and readable/partial/absent text. Unknown strata include
lookalike, unrelated and unregistered size. Record gaps honestly. The coordinator
uses these facts to propose an exact bounded capture order later; no photo count
or collection order is fixed here.

Reuse `../r1-v1/dataset.json` and `curation.json` only after an approved actual
manifest exists. The worksheet itself is not accepted by the readiness CLI.
The unchanged empty R1 packet must remain integrity-valid but incomplete
(exit2, `realDatasetReady=false`); it cannot certify this blank availability sheet.
No validator, coverage, independence, rights or holdout condition is weakened.
