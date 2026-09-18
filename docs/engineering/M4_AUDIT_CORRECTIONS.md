# M4 Independent Audit — Corrections Required

**Reviewed:** 2026-09-18  
**Coordinator:** task `01a098ef-d830-7531-bca7-2d66b0a5b587`  
**Implementation task:** `01a0b1a5-4512-79f0-ae55-58d39559944d` (Luna max)  
**Branch / reviewed HEAD:** `feat/m4-restocking-costing` / `2bfa3ef`  
**Scope:** Approved planning checkpoint `db5a835` through reviewed HEAD.  
**Outcome:** Source acceptance withheld; return corrections to the same implementer.

## Evidence and limits

The coordinator independently ran `npm run validate`: strict typecheck,
zero-warning lint, environment checks, 150 domain tests and 206 mobile tests
passed (356 tests / 28 suites). Passing tests did not cover the defects below.
Isolated stdin Node scripts used the actual TypeScript services/repositories,
NodeTestAdapter, and real in-memory SQLite migrations; only native module
imports/UUID randomness were adapted for Node. They did not modify production
data or source files. The reviewed purchase-item ownership triggers correctly
rejected a cross-store item injection; that suspected issue is not a finding.

Implementer-reported Expo Doctor, dependency compatibility, Android export and
workflow validation are separately reported evidence, not coordinator reruns.
No physical M3/M4, cloud, release or second-laptop checks were performed here.
The existing readiness waiver carries those gates without passing them.

## A1 — Fractional-quantity checkout blocked by legacy cost column (P1)

`apps/mobile/src/sales/completeSale.ts` converts an integral rational average
to Number for `unitCostBaseSnapshotMinor` without checking safe range.
A receipt of **1 micro base unit**, TOTAL **10,000,000,000 minor units**,
produces exact average **10,000,000,000,000,000/1**. Selling that micro unit at
unit price **1,000,000 minor units** has exact gross **1 minor unit** and safe
COGS **10,000,000,000**, but the actual service rejects it with
`INVALID_VALUE: unitCostBaseSnapshotMinor must be null or non-negative integer minor units.`

Only populate the legacy integer column when the rational is integral and its
numerator fits the safe integer range. Otherwise keep that column null while
preserving the available exact companion snapshot. Do not mark valid exact
cost unavailable or change sale arithmetic. Add service-level regression
coverage, including replay and retained exact snapshots.

## A2 — Native-stack draft removal guard unsupported (P1)

`apps/mobile/app/restock.tsx` relies on cancelling `beforeRemove` directly.
The route is in a native stack; React Navigation explicitly documents that
this prevention does not work properly with native-stack and recommends
`usePreventRemove`. See [navigation events](https://reactnavigation.org/docs/navigation-events/)
and [usePreventRemove](https://reactnavigation.org/docs/use-prevent-remove/).
This is a source/support-contract finding, not claimed physical reproduction.

Use the supported prevention mechanism and cover Android hardware Back,
header Back, Cancel, route removal and applicable tab navigation. Keep editing
must preserve every line/editor/supplier; Discard must perform the original
navigation once. Successful completion must not leave a stale guard. Quick
Add must preserve the draft and its return path. Add routed/navigation tests
that exercise the guard rather than only checking the dirty callback.

## A3 — Quick Add return and purchase reads can remain stale (P2)

RestockScreen, PurchaseHistoryScreen and PurchaseDetailScreen initialize local
reads without refreshing them on focus. Restock pushes the generic Quick Add
route, whose save replaces it with product detail; there is no contextual
restock return/selection contract. A no-match result and supplier list can
remain stale after returning, while a retained history route can omit a newly
saved receipt. Detail also retains a previous purchase/client read.

Provide an explicit preserved-draft Quick Add return and refresh/recover
catalogue and supplier reads when focus returns. Refresh history/detail on
focus and relevant identity changes without loops or clearing drafts. Test
actual create-and-return selection, unchanged cart/supplier state, new receipt
visibility, changed receipt ID, and a recoverable focus-read failure.

## A4 — Contradictory available cost snapshots accepted (P2)

The exported `createSaleItemCostSnapshot` boundary checks presence but not
exact consistency/full coverage. After a populated-M3 upgrade, the actual
repository accepted an AVAILABLE snapshot for quantity **1,000,000**, costed
quantity **0**, unit cost **100/1**, exact COGS **999/1**, and rounded COGS **1**.
This contradicts D-038 and persists immutable impossible financial evidence.

Validate canonical nonnegative rational inputs, full-line AVAILABLE coverage,
exact quantity-derived COGS and the single half-up rounded COGS. Reject
contradictions before writes; check enforceable parent/legacy-column facts at
the SQLite boundary as appropriate. Preserve valid UNAVAILABLE partial
consumption and old M3 null snapshots; do not backfill old sales. Any persisted
schema correction must append migration 5, never edit committed migrations 1–4.
Add malformed/canonicality/coverage/arithmetic and populated-upgrade regressions.

## A5 — Conflicting explicit purchase date accepted on replay (P2)

The actual `recordPurchase` service accepted the same operation ID with
`occurredAt` changed from `2026-09-18T01:00:00Z` to
`2026-09-19T01:00:00Z`, returning the old purchase rather than rejecting the
changed request. `assertReplayMatchesRequest` compares lines/supplier but
omits the explicit date.

Reject replay when a supplied explicit occurredAt differs from the stored
purchase request, following the established M3 replay convention. An omitted
date must remain retryable without generating a false conflict. Test both
cases and no new inventory/cost/observation/outbox effects.

## A6 — Current cost availability and merchant labels misleading (P2)

ProductDetail maps `currentCostCoverageStatus === KNOWN` directly to
“Estimated cost available”. D-038 permits KNOWN state at zero/nonpositive
stock with zero costed quantity and no usable average. PurchaseDetail shows
raw KNOWN/UNKNOWN; both screens expose rational numerators/denominators and
“minor units” rather than merchant-facing currency/base-unit values.

Determine current availability from the actual usable cost state (positive
covered quantity, usable average and approved coverage), and explicitly label
it current rather than a historical receipt fact. Present normalized receipt
cost as a readable currency/base-unit estimate using centralized exact
formatting with clearly stated display rounding; preserve original exact
stored values. Use estimated/unavailable language, including zero stock,
unknown coverage and fractional costs, without claiming full profit. Add UI
tests for these states.

## Return contract

Implement only these M4 corrections, commit recoverable changes with audit IDs,
run focused tests plus the complete documented checks, and update tickets,
PROJECT_STATE and the M4 workflow with truthful evidence. Do not self-accept the
audit or start M5. Send a structured report via `send_message_to_thread` to the
coordinator task listed above, including commit hashes, migration changes,
checks/results and carried limitations, then stop editing for re-audit.
