# Track B R4 — Local retrieval and refusal preparation

Date:2026-10-02. R0–R3 preparation source independently accepted. Founder authorizes
sequential Sol6.1 HIGH preparation/audits through R4, then stops for final combined
Astra audit after return. Real data/encoders/physical tests remain pending.

## Goal and smallest useful slice

Build a lab-local, reusable retrieval path around the accepted exact cosine
ranking and recorded-embedding adapter: a query searches only its store's current
compatible gallery, presents product/package uncertainty, or fails honestly with
manual fallback. Prepare cache round-trip and stale-session safeguards without
changing production RecognitionService, native camera, app business data or schema.
This is recorded-output preparation, not image-to-embedding execution or a visual
scanner available to retailers. Actual work R4 quality awaits real R1–R3 evidence.

Existing rank() already normalizes/group-ranks product/package references and returns
STRONG/AMBIGUOUS/UNKNOWN. R2 already validates exact encoder-output provenance and
calibration-bound holdout. Extend these seams; do not duplicate ranking, metrics,
normalization or create a speculative shared recognition-core package. No final
encoder/runtime, new dependency, ANN/vector backend or production threshold change.

## Retrieval boundaries

A validated gallery snapshot/cache is derived from an explicit imported manifest,
recorded outputs and current store-local active product/package selection. Bind
store scope, dataset/version/hash, exact candidate/model/preprocessing/space/dimension,
reference identity/asset hashes, selection revision/content and cache version.
Use all compatible references for selected products; stock quantity must not hide
identity (a zero-stock product can still be recognized). Unknown dataset products
cannot become enrolled by query evidence. Reject foreign products/packages/scopes,
duplicates, corrupt/missing references and mismatched identities instead of silently
shrinking a gallery. A changed active selection requires rebuild/new binding.

Provide only a lab-local small service/facade; choose names/details from existing
patterns. Accept validated recorded embeddings, no actual image decoder/encoder.
At query time recheck current store/session/candidate/gallery generation. Reuse
rank()/package-certainty logic and return explicit package confirmation when it is
uncertain; product confidence must not authorize a guessed conversion or price.
Retain UNKNOWN for a valid low-match query. Unavailable model/cache, invalid input,
reference failure, timeout, cancellation and stale work must remain distinguishable
from valid UNKNOWN. No completed sale/cart/catalogue writes from retrieval.

Use a bounded injected async seam only as needed to test stale/cancelled work:
one in-flight request per service/session, cancellation/background-like reset
invalidates pending output, and a store/gallery/model switch discards old output.
Tests use controlled promises and explicit generations rather than flaky sleeps.
No native/thread worker/camera integration, lifecycle hooks or speculative queues.
Returned snapshots cannot be mutated by caller data to alter later results.

## Derived cache and evaluation

Keep serializable cache and file operations lab-local. Cache is disposable derived
recognition data, never a second business store. Validate exact schema/hash/binding,
space/dimension/nonfinite/zero/duplicate/ownership fields on load; corrupt/missing/
version-mismatched cache returns explicit unavailable/rebuild-required and leaves
source data unchanged. Serialized fixtures/cache stay public-toy or ignored runs;
no real image/raw private vector reports. A plain lab JSON snapshot is acceptable
preparation; it is not an approved production SQLite/file design.

Evaluate through accepted R2 comparison/metrics. Calibration uses only calibration
queries; holdout requires candidate-bound frozen config. Cache round-trip must
preserve decisions and metrics; do not introduce a route to tune on holdout or
claim calibration/quality passes from toy vectors. Existing beta targets remain
unchanged. Report candidate/product/package decisions and refusal/failure counts,
exact bindings and synthetic/precomputed/no-inference limits. Exact same inputs
must be deterministic apart from explicitly labeled Node timing.

## Scope, tests and handoff

Likely additions:lab-local gallery/cache/retrieval modules, focused regression
suites, public authored fixtures when necessary, retrieval CLI and guide/report.
Preserve R0–R3 source/fixtures/contracts; only extend through imported seams.
Existing npm/Node/TypeScript/Zod/Jest suffice. No dependency install, model download,
phone/adb/Metro/Docker, persistent backend or cloud/Git effect. No migration,
production API/camera/SQLite/sales/sync change, OCR/enrollment/R5/M12 implementation.

Acceptance tests:correct same-store known/ambiguous/unknown/package cases; zero-stock
identity unaffected; grouped views; cross-store/snapshot/model/version rejection;
active-selection changes; independent caller-mutation defense; exact cache round-trip;
missing/corrupt/incompatible cache manual fallback; empty/failed gallery not UNKNOWN;
nonfinite/dimension input; one-in-flight/cancelled/stale result control; calibrated
frozen holdout discipline; metric preservation; actual CLI positives/negatives,
confined output and truthful reports. Full lab tests/types/zero-warning lint pass.

No blocker to preparation. Actual real-capture retrieval quality, chosen encoder,
Android cache/lifecycle/persistence/performance and independent holdout remain
pending, not waived. After RB4-03 stopped handoff and coordinator source review,
stop the R1–R4 autonomous cycle; founder returns for combined Astra audit and later
real data/native planning. Do not progress into R5 or another milestone.
