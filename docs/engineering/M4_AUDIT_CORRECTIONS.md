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

## Independent re-audit at 52a772a — 2026-09-18

**Comparison:** `2bfa3ef..52a772a`, including the separate correction commits
`457d9d9`, `08871db` and `cb0566e`. The coordinator independently reran
`npm run validate`: PASS, strict typecheck, zero-warning lint, 150 domain tests
and 214 mobile tests (364 / 28 suites). Migration 5 is additive. Builder Expo
Doctor/export/compatibility results remain reviewed builder evidence, not new
coordinator runs. No device/release/accounting gates are passed here.

**Specification:** A1 and A5 are resolved for source/automated scope. Independent
real SQLite service checks confirmed the exact 1-micro sale succeeds, retains
10,000,000,000 COGS and exact 10,000,000,000,000,000/1 basis with null legacy
unit cost, and replays without changing its sale ID. Changed explicit purchase
date is rejected; an omitted date retries the original purchase. A2 uses the
supported usePreventRemove hook and routed guard/Quick Add tests pass; native
behavior remains part of the carried physical gate. Focus refresh and happy-path
Quick Add return improve A3. Usable-current-stock detection improves A6.

**Standards / remaining correction requests:** source acceptance is withheld
until the following bounded gaps are repaired. Do not reopen resolved work.

### A4-R — Parent sale-item cost consistency / old null costs (P2)

The exact arithmetic/canonicality/full-coverage validation now rejects the
original impossible snapshot, but it does not check the immutable parent cost
columns. An independent populated-M3 upgrade reproduction still accepted an
AVAILABLE snapshot with exact unit cost 100/3, COGS 100/3 and rounded COGS 33
for an old completed sale item whose `cogs_amount_minor` is null. The snapshot
and original immutable receipt then disagree; this also permits invented cost
backfill forbidden by D-038. The new purportedly valid repository test likewise
creates a parent with null COGS before adding an AVAILABLE companion.

At the typed and enforceable SQLite boundaries, require AVAILABLE companion
COGS to equal the existing parent COGS; UNAVAILABLE requires null parent COGS.
Check the safe integral legacy unit-cost projection against the exact basis;
fractional/too-large bases legitimately have null legacy unit cost. Preserve
existing old null rows without adding invented AVAILABLE facts. Adjust valid
fixtures to create matching parent cost columns, and test rejection/no writes,
valid fractional/unsafe-integral companions, raw SQLite mismatches and populated
upgrade preservation. Append migration 6 if new persisted triggers are needed;
do not edit committed migrations 1–5.

### A3-R — Retry does not resume pending contextual selection (P2)

A coordinator-only temporary RNTL probe used the real SQLite catalogue/client
with an injected product-read failure: add a 7.50 line, leave for Quick Add,
create a product, return with quickAddProductId while reads fail, restore reads,
press the actual **Try again** action. The cart and list recover, but the created
product is not selected (`Purchase package` is absent). The probe failed at
that behavioral assertion; it was then removed and is not committed evidence.
An earlier probe invocation used the wrong Retry label and is not defect proof.

The return effect is not retriggered by Retry because its dependencies exclude
the retry result/revision. Unify retry with pending contextual resolution or
use an explicit retry signal; ensure the returned product is selected once and
all cart/editor/supplier facts survive. Add the described failing-path regression
to the permanent restock suite, plus retry failure then success and prevention
of reselecting an already handled return. No new navigation/layout redesign.

### A6-R — Internal fractions remain in product/receipt UI (P2)

Both screens still render `Exact stored receipt basis: numerator/denominator
minor units per base unit`. That exposes implementation detail without a
merchant decision and leaves A6 incomplete despite the added readable estimate.
Keep exact values in persistence/outbox; remove the raw internal fraction from
normal merchant screens and update assertions accordingly. Explain rounding in
currency language (for NGN, nearest kobo) rather than internal “minor units”.
The formatter also returns null for a valid normalized basis whose rounded
per-unit value exceeds MAX_SAFE_INTEGER (the A1 receipt has this property).
Use BigInt/string-only display formatting or an honest bounded display message
instead of implying the valid receipt cost is unavailable; never convert an
unsafe integer to Number or alter stored authoritative amounts. Test this
boundary alongside fractional/zero/unknown-current-stock UI cases.

**Product planning hold:** the founder has additionally requested a planning
review before M5. `docs/product/PRODUCT_CHANGE_BACKLOG.md` is coordinator-owned,
unapproved and excluded from implementation scope/commits. Founder scope and
expiry-timing answers remain pending. Fix the three requests above, report and
stop for re-audit; do not implement the new ideas or begin M5.
