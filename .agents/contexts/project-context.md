# COSI Project Context and Decision Packet

**Status:** Active  
**Scope:** Whole project  
**Project ID:** COSI  
**Updated:** 2026-09-14  
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

M0 Project Foundation is complete. No business domain, SQLite schema, sync,
market network, or recognition implementation exists yet. M1 Domain + Local
Database is approved and ready for implementation through the published
tickets.

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

1. Execute the approved M1 domain primitives, money/quantity rules, local
   database, repositories, migrations, transactions, and test foundation.
2. Keep product/package entities in M2. M2 must introduce durable outbox storage
   and atomic enqueue before its first mutable catalogue operation is complete;
   network synchronization remains M7.
3. Continue through the milestone order in BUILD_PLAN.md, validating useful
   retailer workflows early instead of building all future infrastructure at
   once.
4. Keep recognition research isolated from core transaction reliability until
   its evidence and contracts are ready.

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
- Hosted Supabase development and EAS cloud builds are the current foundation
  path.
- M0 screens are a technical navigation shell, not approved product design.
- The deferred second-laptop setup check remains required before external beta
  readiness.

## Open Questions and Gates

- Define the detailed temporary-product/package-unit behavior during M2
  planning; M1 contains only domain-neutral conversion utilities.
- Confirm onboarding, session recovery, store creation/membership, multiple
  stores, and exact staff permissions before those flows are implemented.
- Review the costing policy before M4 implementation.
- Approve the application flow and design direction before substantial product
  UI implementation. See .agents/contexts/app-flow.md and
  docs/design/README.md.
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
