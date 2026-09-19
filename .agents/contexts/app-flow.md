# COSI Application Flow

**Status:** Active; M1–M5 source scope accepted with readiness carried. M6 Home, expense, withdrawal and truthful daily-summary behavior is planned.  
**Scope:** MVP user journeys  
**Updated:** 2026-09-19  
**Confidence:** High for required jobs and transaction behavior; medium or low
where later-milestone navigation, permissions, and recovery UI remain undecided.

## How to Use This Context

This file records what users must be able to accomplish across the MVP. It is
not a final sitemap, wireframe, navigation tree, or visual specification. The
PRD and approved architecture remain authoritative for behavior. Before
substantial product UI implementation, run the design gate in
docs/design/README.md, review this flow with the founder, and create the
approved design artifacts.

## Users and Entry Conditions

### Owner or Admin

Needs to create or join the correct store context, record and review activity,
manage catalogue and stock facts, see useful summaries and cost changes, and
control staff access when enabled.

### Staff or Cashier

Needs a fast, permission-appropriate path to daily actions such as sales. Their
actions must be attributable. The exact permission model remains open.

### Entry and Session Flow

The MVP needs a short path from account/store setup to the first product or sale
workflow, without full inventory onboarding. Exact registration, sign-in,
offline-expired-session, store creation, invitation, recovery, and multi-store
screens are not yet approved and must be resolved before Auth and membership UI
is built.

## Approved Navigation Baseline

The MVP begins with four primary destinations: Today, Sell, Products, and More.
Scanner entry is contextual from Sell and Products. M2 implements Products and
M3 implements Sell; Today and More remain later-milestone destinations. See
`docs/design/DESIGN.md`.

## Primary Daily Flow

    Launch or resume
      -> restore the local store/session context where safe
      -> reach a useful Today/Home entry point
      -> choose Sell, Restock, Inventory, Expense/Withdrawal,
         Catalogue, Price History, Transactions, or Staff activity
      -> complete the chosen action locally
      -> see an honest local completion state and any pending-sync state
      -> continue working while background synchronization recovers

Core local data must remain usable after app restart. Network recovery and media
upload must not block local transaction completion.

## Sale Journey

M5 automatically records assumed FEFO consumption at durable sale completion;
ordinary checkout requires no batch selection/confirmation. Unknown stock stays
sellable; physical batch identity is distinct from product recognition.

    Start sale
      -> identify product by search, barcode, recognition, or recent items
      -> if ambiguous, ask the user to choose
      -> if unknown, create a quick temporary product or use another permitted path
      -> choose package and quantity
      -> confirm or change selling price and any supported discount
      -> choose payment method, including the approved credit representation
      -> review
      -> commit sale, items, inventory events, attribution, and required outbox work
         atomically to the local database
      -> show completion/history
      -> synchronize later without duplicating the sale

Scanner, recognition, network, or cloud-catalogue failure cannot block this
journey. M3 uses an in-memory cart, one tender allocation, and the credit
boundary in D-036/D-037. Receipt printing, split tender, partial credit
settlement, void, return, correction, and reversal remain deferred.

## Restock or Purchase Journey

    Start restock
      -> find or create the product
      -> choose the purchase package
      -> enter quantity and total or unit cost
      -> optionally record supplier, expiry month/day or Unknown
      -> add another same-product line for a different expiry group
      -> review
      -> commit purchase, inventory events, cost snapshot/history, attribution,
         and required outbox work atomically to the local database
      -> show the new personal restock-cost information
      -> synchronize later without duplicating the purchase

The user must not manually perform package conversion during normal work.

The founder approved the M4 screen/state baseline on 2026-09-18. Restock and
purchase history enter through More; product Quick Add retains the in-memory
draft, dirty exits require confirmation, and total/unit input retains its exact
basis. Cost is estimated or unavailable under D-038; personal observations remain
private/non-contributing. See DESIGN and M4_RESTOCKING_COSTING_PLAN. M4 source scope is accepted. M5 adds automatic internal groups and allocation
inside the existing atomic transactions; physical readiness is still carried.

## Catalogue and Progressive Setup

    Encounter product during sale or restock
      -> match an existing shared/store product when confidence is sufficient
      -> otherwise create a minimal temporary product
      -> complete the transaction
      -> enrich name, package, image, barcode, supplier, or category later
      -> preserve transaction snapshots and stock history during enrichment

Temporary creation now produces a store-scoped provisional ProductVariant, one
base PackageUnit, and StoreProduct atomically under D-035. The user may enrich
or explicitly match it later without losing store-owned or historical facts.

## Inventory and Reconciliation

    More -> Inventory / Stock checks / Needs attention
      -> inspect aggregate stock and optional expiry-group detail
      -> start assigned/manual count with expected quantity hidden
      -> submit first count, compare, optionally recount
      -> choose reason and review nonzero difference
      -> revalidate inventory AND batch movement watermark
      -> commit check, sourced adjustment, batch/cost/outbox atomically
      -> preserve history and show locally saved / pending sync

A matching count has no zero stock event. Optional physical group inspection
can classify unknown stock net zero; total-only discrepancy does not identify
missing batches and leaves breakdown unknown. Actual expired removal records
real quantity/event effects. Guided owner checks are configurable and reasoned
replacements auditable. Attention snooze suppresses reminders, never stock.
No 100% business accuracy, misconduct or physically guaranteed FEFO claim.
D-039/D-040 and DESIGN define the approved M5 behavior; the source and automated
scope is implemented and independently accepted, with physical-device evidence
still carried.

## Expenses and Withdrawals

    Choose expense or owner withdrawal
      -> enter amount and minimal classification/details
      -> review
      -> save locally with actor attribution
      -> update only summaries supported by tracked data
      -> synchronize later

The product must distinguish operating expense from owner/personal withdrawal.

## Price Intelligence

The retailer first sees their own previous and latest restock prices and the
change by package. Personal history must work offline. Later shared market
signals require consent, privacy controls, sufficient local data density, and
honest confidence. A shared observation must never expose another store's
private sales, margin, stock, or supplier relationship.

## Scanner and Recognition

One scanner entry point may route barcode and visual recognition. Results have
three user-facing states:

- STRONG: offer the best match with an easy correction path.
- AMBIGUOUS: present a small choice set or search.
- UNKNOWN: use quick creation or manual search and continue.

The core sale/catalogue code depends on a recognition contract, not one final
model/runtime. Final camera treatment and result UI wait for benchmark evidence
and the design gate.

## Offline, Sync, and Recovery States

Every core transaction flow needs clear states for:

- local save in progress;
- locally completed and pending sync;
- synchronized;
- retrying or blocked by a resolvable conflict;
- validation failure before local commit;
- unexpected local-storage failure where completion cannot be claimed.

The exact wording, placement, retry controls, and diagnostics UI remain design
work. Device time alone cannot define global order. A user must never be told a
transaction completed if its local atomic commit failed.

## Capability Inventory

| Capability | MVP intent | Design status |
| --- | --- | --- |
| Account/store onboarding | Minimal path to useful work | Flow details open |
| Today/Home | Live daily facts, compact M5 attention and next actions | M6 contract in DESIGN/D-041; implementation pending |
| Sale/cart/payment/completion | Required offline workflow | Capability flow approved |
| Catalogue/search/product edit | Progressive digitization | M2 flow approved in `docs/design/DESIGN.md` |
| Restock/purchase | Required offline workflow | M4 source accepted; M5 expiry-group extension accepted |
| Inventory/reconciliation | Event-based blind checks and batch control | M5 source accepted; physical checks carried |
| Expense/withdrawal | Separate immutable owner-only offline records | M6 contract in DESIGN/D-041; implementation pending |
| Transactions/history | Review and accountability | Filters/actions open |
| Price history/signals | Lead value proposition | Presentation open |
| Scanner | Barcode first, recognition later | Interaction open |
| Sync status/recovery | Honest offline state | Interaction open |
| Staff/accountability | Attributed permitted actions | Permissions open |

The M0 Welcome/About screens prove routing and builds only; they are not part of
the approved final information architecture.

## Design Questions That Must Be Resolved

- Validate the approved Today / Sell / Products / More baseline with retailer
  use before beta and adjust only through an explicit design update.
- Owner/admin versus cashier information density and shortcuts.
- Onboarding, membership, invitation, recovery, and multiple-store behavior.
- Receipt, split-tender, partial-credit, cancellation, correction, reversal,
  and return behavior after the approved M3 boundary.
- Detailed shared-catalogue consolidation after temporary-product enrichment.
- Offline session expiry, local-write failure, sync conflict, and recovery UI.
- Accessibility, text scale, touch targets, low-end device performance, camera
  permissions, and outdoor/low-light use.
- Which summaries are understandable and honest when catalogue, stock, costs,
  or expenses are incomplete.

## Maintenance

Update this file when an approved product flow changes. Do not fill open design
questions by inference. Record durable behavior decisions in the PRD or decision
log, and keep visual details in the future approved design specification.
