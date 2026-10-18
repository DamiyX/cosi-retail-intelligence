# Next-phase implementation handoff — first slice only

Planning date2026-10-11. This is a reviewable proposal; wait for founder switch to
Sol6.1 HIGH and explicit implementation/dispatch. Do not send it from Astra.
Full scope/decision rules: TRACK_B_NEXT_PHASE_PLAN_20261011.md.

## Ownership and start

Use existing writer01a1051f-0777-7573-ad09-0e550a4bd56a, sequential local Sol6.1 HIGH,
checkout COSI-m8-planning, branch plan/m8-unified-scanner, last inspectedHEAD66ea3fc.
Recheck current source and lease before work. Do not reset unrelated dirty work.
The writer is not alone in this repository: preserve other edits and contracts.
No new agent, model switch, branch, Git effect or parallel implementation.

Owned scope: new lab-local label-evidence schema/rule/CLI/report, narrowly required
local review UI, generated regressions, capture inventory template and handoff.
Suggested new files: src/labelEvidence*.ts, tools/label-evidence/, __tests__/
labelEvidence*.test.ts, templates/next-phase-inventory.*, docs/recognition/
LABEL_EVIDENCE_REVIEW_GUIDE.md and reports/LABEL_EVIDENCE_PREPARATION_20261011.md.
Names are provisional; choose the smallest implementation. No dependency needed
for typed records, exact matching, saved-score analysis or a static local viewer.

## A1 — bound inputs and local text review

Read FC06 comparison.json, annotations.json, bundle/report and source bindings as
immutable inputs. New sidecar binds exact input hashes, schema/rule versions and
all40 entry IDs. No copied/modified baseline or changed crop. Keep literal text,
readability state, observed fields and source spans separate from normalization.
Reference cards require supporting reference IDs/spans; do not use query truth
to populate them. Identity labels remain in evaluation only, not query evidence.

Reuse safe local-viewer/file-selection patterns while preserving existing source.
Show full-resolution effective crop with zoom and the expected reviewed image ID;
hide query truth/candidates/reference clues. No picture uploads or JSON image data.
Local export/import saves progress, distinguishes partial from complete, and rejects
stale bindings, duplicate/orphan entries and invalid fields. No image-generation,
OCR runtime or new private-image processing by the writer. Use generated images
for implementation/browser checks. Founder performs actual private text review
only after coordinator acceptance. Avoid another drawn-box exercise.

## A2 — one fixed analytical comparison

Implement the exact conservative unique-support/rival-contradiction rule in the
plan. Reference metadata missing => unknown, not exclusion. Preserve missing-text
fallback, candidate set, scores and stable remaining order. Do not hardcode
product IDs, add confidence states or introduce fuzzy learned corrections.
Use exact dimension-safe unit normalization with bounded arithmetic.

Read-only analysis of saved numeric results may create NEW JSON/CSV/local HTML
outputs; never invoke an encoder or consumed launcher. All20 query IDs remain in
the report, including missing/unreadable/conflicting text. Partial review means
incomplete; no success-only denominator. Show full before/after first/top3, gains/
losses, visible-text coverage, per-field reasons and honest non-blinded/manual-text
limits. Reuse the picture-report arrangement: truth/query and three suggestions,
with unchanged raw similarity scores, explicit assisted order and reason.

## A3 — meaningful checks and source handoff

Generated tests must distinguish:600ml versus750ml;0.6L equivalence;mass versus
volume;flavor/name conflicts;multiple quantities/multipacks;partial/absent text;
missing rival metadata;two supported candidates;all-candidate contradictions;
true-product outside top3;wrong transcription that can cause a regression;unchanged
fallback;all20 denominator;no truth-field access by the rule;binding drift;duplicate/
missing rows;output no-overwrite and linked-path rejection;JSON/HTML escaping.
Use invented brands/SKUs so tests cannot merely memorize CWAY/Airpro.

Run relevant lab tests/types/lint and actual positive/negative CLI checks. Generated
browser checks cover reading/zoom, progress round trip and completion gating. No
real OCR/phone/generalization claim follows. Preserve all accepted tests and
frozen original/A1–A5/FC06/package artifacts; report exact baseline and deltas.

Return STOPPED, leaseNULL, changed files, exact commands/exits, failure evidence,
source/output bindings, constraints, a short founder guide and review-ready sample
report. Coordinator verifies the stopped bytes independently. Source acceptance
precedes actual private text review. No automatic new execution authorization.

## C1 — inventory worksheet only

Prepare a concise worksheet for30–50 enrolled identities plus unknown candidates:
category/confusion group, brand/variant/net quantity/package identity, barcode
availability, available independent physical samples, planned reference/development/
calibration/holdout families, capture conditions, rights and missing strata.
Reuse accepted R1 semantics; validate with existing readiness tools where possible.
Do not fabricate filled identities, request180 photos, or weaken family separation.
The founder supplies availability before the coordinator freezes a capture order.

## Explicit later gates — excluded from this dispatch

After A result review, B native proposal must address actual current runtime/license/
offline assets, Expo/RN/camera/build integration, isolated experimental boundary,
numerical equivalence and device instrumentation. Official-source compatibility
research belongs to that proposal; no runtime selected or approved here.
Coordinator/founder review is required before any native dependency/build/phone
change. Fresh-dataset production also needs a new exact bounded execution packet;
existing fixed40/20 guards and consumed authorizations remain immutable.

End condition for this dispatch: A preparation plus C inventory worksheet complete,
generated verification and stopped handoff. No actual text-assisted result, private
inference, phone operation, OCR install, capture campaign, M12 or further dispatch.
