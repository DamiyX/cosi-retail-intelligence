# Track B R1 — Dataset preparation and real-capture gate

Date: 2026-10-02. Founder authorized sequential Sol6.1 HIGH implementation and
independent audits through work milestones R1–R4, with physical work deferred.
This packet is R1 only. R0 corrected tooling is independently accepted. Source
acceptance of preparation does not complete the 30–50-product real dataset.

## Outcome and minimum scope

Make later capture easy to organize: a short product selection/capture worksheet,
one reusable manifest format, and a command that says exactly what is missing
before real encoder comparison. Current R0 already validates hashes, paths,
identity/package relationships and exact-copy/session leakage. Extend it with
curator provenance, coverage and a review/seal record; do not build another app.

The founder chose tools first, photos later. No approved real-photo folder or
representative photos are provided. No current customer thumbnails are authorized
for export/reuse. Physical capture and device tests stay pending while independently
reviewed preparation code may advance. Do not fabricate a real-data gate pass.

## Verified baseline and boundary

Checkout COSI-m8-planning, branch plan/m8-unified-scanner, HEAD66ea3fc.
All pending R0 and coordinator/native work is preserved. Existing Node24.21.0,
TypeScript, Zod, Jest and ESLint suffice. No model/runtime/native adoption,
production SQLite/Supabase migration, RecognitionService expansion, installed
phone app changes, media upload or production cache is needed in R1.

Sources: TRACK_B_PLAN, R0_A2_INDEPENDENT_REVIEW, RECOGNITION_TEST_PLAN sections
5–12/14–15/55–59/61/77 and D-017..22/D-030. Apply these in the existing lab.

## Capture policy

Target30–50 distinct enrolled product identities selected for difficult real-shop
recognition. Report package and packaging-generation counts separately, never
inflate distinct-product counts by counting the same product's angles. Include
close sizes/flavours, individual/pack/carton, old/new packaging, reflective and
transparent packages, damaged packs and distinctive no-code goods. Missing
availability is explicitly reported, never invented.

Plan multiple useful reference views; do not impose a fixed four-shot UI. Later
queries must be separate captures, with multiple examples per known identity
across development/calibration/holdout. Record bright/normal/dim/glare conditions,
angles and occlusion, and disclose uncovered strata. Aim15–25% unknown queries,
report numerator/denominator overall and per split. Unknown products never enter
the gallery. A product absent from the gallery is product-unknown. An unseen
package of an enrolled product is product-known with its actual package label,
marked a package challenge; do not set known=false and bypass package safety.
Do not change this R0 known/unknown contract. Visually indistinguishable goods
require a disclosed manual-choice/internal-label limit.

Keep adjacent frames, derivatives and the same physical sample in one leakage
family. Capture-session grouping alone is insufficient: a private curator record
must identify source/physical families and verify that reference/query and
query-split boundaries do not mix them. If independently captured physical samples
are unavailable, report the limitation and do not self-certify independence.

Images are product-focused, privately retained under an explicitly supplied root.
No faces, payment screens, business records, private EXIF, serial device IDs or
personal names in public artifacts. No recursive discovery outside that root.
No commit/upload/automatic transfer of private images; ignored files are not access
control. Retain only pseudonymous rights/provenance/reviewer references in reports.
Manual inspection/rights records cannot be automatically proved by a JSON flag.

## Lab-local extension

Keep dataset schemaVersion1 and the actual R0 importer authoritative. Prefer one
strict sidecar for curator review, bound to datasetId/version and exact manifest
SHA256; no independent product database. It records per-entry review status,
physical/source leakage-family grouping, image-usability review, source/permission
references and challenge tags, plus named pseudonymous review decisions and the
sealed holdout entry/hash inventory. Unknown/missing fields, stale hash bindings,
duplicate/orphan entry records and conflicting leakage groups must be rejected or
reported as incomplete. A seal is checksum/change detection and a recorded human
attestation, not encryption or proof that nobody saw the holdout. No holdout-based
configuration changes. Rejected entries need an explicit revised manifest/version,
not silent skipping.

Use an additive lab CLI readiness command or a dedicated small entry point. It
calls the existing importer, then writes machine JSON and readable coverage/gaps
under ignored runs. Existing validate/run/sweep behavior is preserved. Small
readiness interface: manifest, approved dataset root, curator sidecar, output.
The output records actual kind/hash/version; real data never acquires toy-vector
observations. Synthetic fixtures and authored/test image assets may test the
pipeline but always remain synthetic and cannot make R1 real readiness true.
No encoder or recognition score runs during assessment.

Report separate states: integrity validity; curator review completeness; capture
coverage; holdout seal; and real-dataset readiness. Missing/incomplete preparation
is a valid report, not an invalid-input crash. Document exact exit codes for
ready/incomplete/invalid. Never infer image sharpness or decodability from hashes
or file extensions; those remain inspected human evidence unless a reviewed
existing decoder is available. No new decoder dependency by default.

## Likely changes and checks

Lab-local curation/readiness modules, CLI dispatch/tests, versioned empty templates,
DATASET_CAPTURE/README, R1 report/ledger and existing task workflow. Existing schema,
ranking, thresholds, metric semantics and production directories remain preserved.
No migration/dependency/model download needed. Use lab tests, typecheck and
zero-warning lint, independent readiness CLI examples and existing R0 CLI tests.
Root validation only if root integration or broader consumers actually change.

## Acceptance split and next stages

RB1-01..03: runnable capture/readiness preparation, source audit and documentation.
RB1-04: real dataset assembled and curator-reviewed; pending founder photos.
Preparation source acceptance may unlock R2 **preparation code**, then R3
**benchmark preparation**, then R4 **retrieval preparation** under the founder's
physical deferral. Each gets its own rolling plan and independent audit; no
unpublished next-phase implementation or lowering of the real acceptance gates.

R2 model comparisons remain pending real data, exact artifact/licence/preprocessing
review and actual execution. R3 runtime claims remain pending reviewed candidate
and physical Galaxy A15/lower-spec measurement. R4 confidence/performance acceptance
remains pending real calibration/frozen holdout evidence. R5/M12 are not authorized
by this R1–R4 cycle. No final model/runtime is selected through mocks.
