<!-- October3 current routing: founder authorized M11 continuation. Read PROJECT_STATE, M11_STAFF_PLAN/TICKETS and m11-staff-accountability.json. M9/M10 software source accepted; live gates pending. M11 implementation sequential, coordinator audits stopped returns. No real staff activation/assignee scope or M12 is claimed. -->
# COSI Project Context and Decision Packet

**October2 routing supersedes earlier current-priority prose:** source/phone agents
are stopped. Track B corrected R0 source/tooling is independently accepted;
R0-A2-01/02 resolved. See docs/recognition/reports/R0_A2_INDEPENDENT_REVIEW.md.
R0–R4 preparation final audit and sequential FA-01/02/03/04 repairs independently accepted; all implementers stopped. See docs/recognition/reports/R1_R4_FINAL_AUDIT.md and correction independent reviews. Real dataset/models/actual inference/native/device/quality gates remain pending, not waived. Founder authorized Sol HIGH correction reviews after the Astra audit. No R5/M12 or physical action started. Synthetic/precomputed lab exists; no real visual model or production recognition implemented. PROJECT_STATE and recognition-track-b.json own current routing.
Founder reports current beep works; focus/slider follow-ups are deferred and M8
physical gates remain open. PROJECT_STATE.md owns latest status.

**Active amendment 2026-09-30:** D-047 and M8_SCANNER_PLAN authorize price-first
unknown-product selling with one private identification photo and later naming.
Original M8 implementer has implemented M8-06..09 after the phone utility stopped
at evidence HEAD 1e50d1b. Photo initially stays on the originating device; cloud
backup/restore is not claimed. D-048 optional catalogue suggestions default to a disabled live provider pending contact/licence/native transport review. Scanner activity uses existing animation facilities. Coordinator audits after stopped handoff; source evidence
for the earlier flow and native findings remain recorded, not new-flow acceptance.
Earlier correction source adc8b8f has passed coordinator re-audit, full593-test
validation and Android export. SDK57 patch alignment is committed at824b2af;
historical593 validation, Doctor21/21, dependency check and Android export pass. Existing APK native
modules remain unchanged; compatibility source review passed and
provider/native gates remain open. New offline/shared-catalogue, code-targeting
and structured-QR ideas are proposals PC-10/11/12 in PRODUCT_CHANGE_BACKLOG.
For local Docker startup/recovery read docs/engineering/LOCAL_DOCKER_WORKFLOW.md;
it contains the initial laptop's bounded preserved-runtime workaround.

**Status:** Active  
**Scope:** Whole project  
**Project ID:** COSI  
**Updated:** 2026-10-01  
**Confidence:** High for approved product and architecture; explicit unknowns
remain below.

**October1 source update:** D-049/D-050/M8-10..14 are implemented through runtime8efb1e0: deliberate scan feedback/re-arm, exact compatible draft accumulation/Undo, all-product private thumbnails/enlargement, ordinary Add/detail photo controls with new300KiB/1024px limits and legacy reads, and separate Today discount totals. Independent source re-audit passed against8efb1e0 with75 tests/10 suites; native storage/audio/photo/clarity/accessibility acceptance remains pending. Latest checks/ownership are in PROJECT_STATE and M8_IMPLEMENTATION_HANDOFF; prior593 is historical.

## Runtime Summary

COSI is an Android-first, offline-first retail intelligence product for
owner-managed retailers. It should make sales, restocking, inventory,
expenses, withdrawals, and the retailer's own price history useful during
normal daily work, while preserving a later path to market-price intelligence
and local product recognition.

The current strategy is:

> Lead with price. Deliver with control. Build the network through normal
> business activity.

M0–M6 source/automated scope is independently accepted. M5 added minimal
batch-aware expiry, assumed FEFO, blind reconciliation, guided owner checks and
attention. M6 added owner-only expenses/withdrawals and truthful Home/Today.
Physical/release gates remain carried and native/release readiness is not yet
approved. M7 local source is accepted at `c817edb`, including D-044/D-045 and
local integration evidence. M8 source and audit corrections are active in `COSI-m8-planning` on
`plan/m8-unified-scanner`, based on that accepted commit. D-046 approved the plan;
independent source acceptance and physical Android verification remain pending. M9 source work
exists separately on `plan/m9-price-intelligence` and awaits final M7 integration
and audit. The coordinator owns tickets and independent acceptance.

## Product Snapshot

### Problem

Target retailers often lack reliable visibility into sales, stock, business
spending, withdrawals, and changing restock costs. Heavy catalogue onboarding
and continuous-connectivity assumptions make many retail tools impractical in
the intended operating environment.

### Target Users

- Primary: owner-managed or closely managed retailers, initially around Port
  Harcourt, Rivers State, Nigeria.
- Secondary: trusted staff or cashiers acting for a store, with attributable
  actions when staff support is enabled.

### Core Outcome

A new retailer should start gaining useful business visibility within the first
24 hours without first digitizing the entire catalogue. Core transactions must
survive app restart and work without internet.

### Product Boundaries

The MVP is not a full accounting suite, wholesaler marketplace, universal image
classifier, demand-generation product, or credit-scoring system. Incomplete
financial coverage must be labelled as tracked gross margin or another accurate
partial measure, never full profit or P&L.


## Approved Architecture

- React Native with Expo Development Build, Expo Router, and TypeScript.
- Expo SQLite is the durable local business-data store.
- Supabase PostgreSQL, Auth, Storage, and Edge Functions form the planned cloud
  platform.
- Business writes are local-write-first. Related business data and its outbox
  entry must commit atomically.
- Globally unique client IDs, unique operation IDs, server idempotency, and
  acknowledgement-before-outbox-deletion are required.
- Inventory is an explicit event ledger. Package conversions and historical
  conversion snapshots are domain facts.
- Shared product identity stays separate from store-specific price, cost,
  stock, supplier, and reorder data.
- Recognition returns STRONG, AMBIGUOUS, or UNKNOWN; failure cannot block
  checkout. The final model and runtime require benchmark evidence.

## Current Priorities

1. Review `M8_INDEPENDENT_AUDIT.md`, `M8_IMPLEMENTATION_HANDOFF.md`, active tickets
   and `.agents/workflows/m8-unified-scanner.json`. The assigned implementer owns
   corrections exclusively until it stops; coordinator then independently reviews.
   Scanner association rollout and ordinary-build fast addition stay off.
2. Complete the explicitly deferred M3 physical-device/offline-sale,
   development-client/Metro, large-text, and second-laptop checks before any
   external beta/native-release claim; preserve the M1/M2 Galaxy evidence as
   historical evidence only.
3. Continue validating useful retailer workflows early instead of building all
   future infrastructure at once.
4. Keep M8 correction work in its existing chat and branch. M9 was allowed to proceed
   in isolation during the M8 deferral. Coordinate shared contract edits and
   reconcile branches deliberately; no simultaneous writers in one checkout.

## Decision Budget

- Plan and implement one milestone at a time.
- Prefer the smallest dependency and abstraction set that protects offline
  reliability, transaction integrity, privacy, and package correctness.
- Do not change major stack, data ownership, transaction, sync, inventory,
  costing, or recognition decisions without explicit review and a decision-log
  update.
- Do not begin milestone implementation before its plan and ticket dependency
  map are reviewed.
- External actions such as commit, push, merge, deployment, or account changes
  follow the user's current authorization and repository rules.

## Safe Assumptions

- main is the canonical accepted branch; task branches carry active work.
- The temporary codename may change, so domain names remain brand-neutral.
- EAS cloud builds are linked. Docker-backed local Supabase was used for accepted
  M7 integration evidence. Recheck availability before running future checks;
  that evidence does not authorize deployment or mutation of a hosted project.
- M0 screens are a technical navigation shell, not approved product design.
- The deferred second-laptop setup check remains required before external beta
  readiness.

## Open Questions and Gates

- Validate D-036 exact-or-reject sale arithmetic against real retailer values;
  split tender, partial credit settlement, and reversal remain later gates.
- Confirm onboarding, session recovery, store creation/membership, multiple
  stores, and exact staff permissions before those flows are implemented.
- D-038 approves M4 engineering costing. Founder approved conservative M5
  shortage/surplus handling in the product change record; D-040 and domain/design sources now record its engineering contract. Professional
  accounting review and M7 concurrent-device cost/lot allocation remain gates.
- M5 application flow/design states are prepared under founder delegation;
  validate actual retailer/device use before pilot. Future Home/Scan navigation
  retains later design gates. See app-flow and docs/design/README.md.
- Define consent and privacy rules before contributing observations to shared
  price or recognition datasets.

## Authority and Source Map

This file is a routing summary. Approved sources retain authority in this order:

1. later approved entries in docs/decisions/DECISION_LOG.md;
2. current architecture and domain documents under docs/architecture/;
3. docs/product/PRD_MVP.md;
4. docs/product/PRODUCT_INCEPTION.md;
5. this summary and old chat history.

Execution order and current status are defined by
docs/engineering/BUILD_PLAN.md and docs/engineering/PROJECT_STATE.md. Future
agents must flag inconsistencies rather than treating this summary as a way to
override those sources.

## Maintenance Triggers

Update this file when the product boundary, approved architecture, current
priority, decision budget, or a project-level open question changes. Keep
historical reasoning in the decision log and current execution details in
PROJECT_STATE.md or .agents/workflows/.
