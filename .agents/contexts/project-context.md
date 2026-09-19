# COSI Project Context and Decision Packet

**Status:** Active  
**Scope:** Whole project  
**Project ID:** COSI  
**Updated:** 2026-09-19  
**Confidence:** High for approved product and architecture; explicit unknowns
remain below.

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
approved. M7 planning is active on `feat/m7-offline-sync`; no M7 runtime code is
claimed. Coordinator task `01a098ef-d830-7531-bca7-2d66b0a5b587` owns tickets
and independent acceptance.

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

1. Implement M7 under `M7_OFFLINE_SYNC_PLAN.md` and tickets M7-01 through M7-08.
   Cover all accepted M2–M6 outbox envelopes, store/device authorization,
   idempotent push, revisioned pull, conflicts and bootstrap. A real disposable
   PostgreSQL/Supabase integration run is mandatory before acceptance.
2. Complete the explicitly deferred M3 physical-device/offline-sale,
   development-client/Metro, large-text, and second-laptop checks before any
   external beta/native-release claim; preserve the M1/M2 Galaxy evidence as
   historical evidence only.
3. Continue validating useful retailer workflows early instead of building all
   future infrastructure at once.
4. Keep M8 scanner/recognition planning coordinator-owned. It may proceed in a
   separate worktree while M7 implementation runs, but production M8 and shared
   contract edits wait for accepted M7.

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
- EAS cloud builds are linked. M7 needs either Docker-backed local Supabase or an
  explicitly authorized isolated hosted development project; neither is active
  at this checkpoint.
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
