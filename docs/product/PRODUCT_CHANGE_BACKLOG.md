# Product Change / UX Backlog and Impact Review

**Status:** PARTIALLY APPROVED — founder approved M5 stock-check/attention scope
and conservative adjustment costing, and requires expiry in the first pilot.
The specific lot-allocation design and expanded M5 ticket release remain proposed.  
**Received / reviewed:** 2026-09-18.  
**Owner:** coordinating product/planning/audit task.  
**Review baseline:** `feat/m4-restocking-costing`, committed source `2bfa3ef`;
approved M4 planning checkpoint `db5a835`. At intake, current HEAD `83ec8b7`
recorded the audit return; Luna was applying A1–A6 corrections. Those changes
are not reviewed or accepted by this product assessment. Reconfirmed against accepted M4 source checkpoint `9700ee3`: additive
audit migrations 5/6 strengthen immutable sale costs; no lot/expiry support
was added and the impact/milestone conclusions remain applicable.

This is the single record for this batch of proposed changes and their future
disposition. It does not override the PRD, decisions, architecture or approved
DESIGN. Once approved, authoritative behavior belongs in those existing sources;
this document keeps change IDs, rationale, milestone mapping and disposition,
with references rather than copies of the resulting specifications.

## Decision and product intent

Home should answer: What happened today? What needs attention? What should I do
next? Keep it a calm operating surface, with detailed analysis in Reports.
The founder's layouts are hypotheses; implementation may improve the experience
while meeting the underlying jobs. A stock check increases confidence in the
counted product at a particular time; it cannot certify the whole business or
its reports as 100% accurate.

Do not implement this batch immediately. Finish the independent M4 source
audit, resolve the proposed lot design below, then create the M5 brief/design/tickets.
No M5 delegation is authorized by this document.

## Actual baseline and conflicts

- M1 provides store timezone/currency, actor/device/membership, durable SQLite
  migration/transaction infrastructure and exact domain primitives.
- M2 has store-private reorder thresholds, package conversions, catalogue
  identities, identifiers, product creation and atomic outbox capture. A
  threshold column does not prove a low-stock UI or alert lifecycle exists.
- M3 has completed sales, immutable line/tender/credit facts and negative
  inventory events. Stock is reconstructed from events. There is no Today
  aggregation/reactivity service or implemented Reports screen. Today remains
  a placeholder. `listSalesByStore` is a paged history query (default 50,
  maximum 200); summing it cannot produce truthful daily totals.
- M4 has immutable purchase lines with UUIDs, original cost input, exact base
  quantity/conversion/currency/name snapshots, purchase inventory events,
  line-linked private price observations and provisional cost movements/state.
  There are no lot/batch/expiry, physical-count/assignment/attempt/replacement,
  snooze or notification-setting tables in the reviewed migration registry.
- Inventory event vocabulary includes EXPIRED and RECONCILIATION sources. These
  names are extension foundations, not implemented lot expiry/count workflows.
- PRD section 15.2 explicitly shows recorded stock before physical entry. The
  proposed blind-first workflow conflicts with this approved flow and needs an
  approved update. Normal inventory inspection can still show recorded stock;
  the initial blind-count surface must hide it.
- DESIGN/app-flow and actual tabs are Today, Sell, Products, More. The proposed
  global Scan action/removal of the permanent Sell tab conflicts with the
  approved navigation. A route change affects M3 draft ownership and exit
  guards; it is not just a button placement change.
- BUILD_PLAN M6 mentions purchase-cost change highlights; structured personal
  comparisons are M9. Recommend putting Home price-movement promotion in M9,
  leaving M4's actual receipt history available without premature trend claims.
- D-038/TECHNICAL_ARCHITECTURE already reserve adjustment costing for review in
  M5. The current cost-movement schema/rebuild accepts PURCHASE and SALE only;
  reconciliation must extend it explicitly rather than changing inventory alone.

Sources inspected at the baseline: AGENTS; PROJECT_STATE; MULTI_AGENT_WORKFLOW;
TICKETING; BUILD_PLAN; decision log; product thesis and relevant PRD sections;
DOMAIN_DATA_MODEL purchase/inventory/costing/derived-data sections;
TECHNICAL_ARCHITECTURE; OFFLINE_SYNC; DESIGN/app-flow; recognition architecture
and test principles; mobile routes, sales/purchases clients and completion
services, typed repositories, domain costing and migration registry. This is
a product/data impact review, not a replacement for the outstanding M4 code
re-audit. No additional runtime or device acceptance is claimed.

## Proposed milestone mapping — whole batch

| ID / idea | Already supported | Additional change classification | Proposed milestone / disposition |
| --- | --- | --- | --- |
| PC-01 Home live Today: completed-sale count and total sales value | Durable sale totals/status/store/timezone and offline reads | New exact aggregate read model and refresh behavior; UI, no new authoritative sales table | M6: truthful live Today summaries; detailed Reports under More |
| PC-01a Optional top-selling product | Immutable sale lines/product IDs/quantities/value | Define ranking and implement aggregate query/UI; quantities across unlike products are not inherently comparable | M6 optional: propose most frequently sold by distinct completed sales, explicitly labelled; quantity/value rankings may remain in Reports; defer if it makes Home dense |
| PC-02 One prominent global Scan; no permanent Sell tab or extra global product '+' | Manual Sell/Quick Add and local barcode mappings | Navigation/UI integration and draft lifecycle change; camera/scanner work requires M8 | M8: global Scan on approved main surfaces; retain manual selling until scanner exists |
| PC-02a Hide Scan during scanner/transaction/full-screen flows; contextual product creation | Products and unknown-product creation foundations | Explicit route allowlist, accessibility and fallback integration | M8; visual recognition remains gated M12/R&D, not selected here |
| PC-03 Blind-first stock check, compare/recount/confirm discrepancy/reason/event | Exact quantities, event ledger and logical reconciliation model | Domain/database/session/attempt state, new atomic reconciliation aggregate and UI | M5 core; replace approved see-expected-first PRD flow after approval |
| PC-03a Quick/easy, high-moving and not-recently-sold/checked selection | Sales history, catalogue/package data | Deterministic candidate queries, policy/version and count recency; easy-to-count status needs honest input rather than inference | M5 simple replaceable selector; advanced risk selection future |
| PC-03b Around three checks/day, eventual configurability; exclude ordinary out-of-stock assignments | Store timezone and event-derived stock | Durable assignment settings/daily due work and eligibility; foreground prompts | M5 proposed configurable daily target, default 3 as a hypothesis, pause supported; OS/background reminders deferred |
| PC-03c Replacement with reason; repeated attempts auditable, not automatically suspicious | Actor/device primitives | Persist replacement reason/attempt history and bounded reselection; no duplicate effects | M5 owner workflow; owner-facing multi-staff review M11; no fraud scoring |
| PC-04 Different staff assignments; review completion/discrepancies/replacements/unusual activity | User/member/device attribution foundations | Authorization, assignments per member, owner review and sync coordination | M11, dependent on M7; M5 remains local owner workflow with actor provenance |
| PC-05 Compact Needs attention/See All; low/out-of-stock, Restock and Snooze | Reorder column, derived stock, Restock flow | Derived exception queries/UI plus durable snooze/reason/settings state | M5 local attention list, actionable stock exceptions/snooze; M6 compact Home promotion |
| PC-05a Inventory discrepancy attention | Negative-stock signal and forthcoming M5 checks | Distinguish unresolved discrepancy from already reconciled history | M5 list; M6 Home summary; do not leave resolved discrepancies permanently urgent |
| PC-05b Expiry and important price-movement attention | No expiry tracking; actual purchase prices exist | Lot/depletion design for expiry; valid comparability/provenance for price signals | Expiry required before first pilot: propose M5 list and M6 Home integration; personal price M9, market price M10 |
| PC-06 Multiple batches/expiry dates for one product | Stable purchase-item IDs and immutable quantity/conversion snapshots | Lot receipts plus lot-level movement/allocation/unknown-stock model; NOT StoreProduct.expiryDate | Founder requires first-pilot support: propose expiry foundation first in M5, extending restock/sale paths; exact durable contract awaits review |
| PC-07 Home replacement-cost/market-price movements | Private receipt observations, default consent off | Comparable personal signals and later consent/freshness/confidence/network signals | M9/M10; insufficient data remains explicit, never simulated |

## M4 closure and expiry assessment

**No new mandatory M4 correction follows from these ideas.** The existing A1–A6
audit findings remain separate source-acceptance blockers. M4 must still pass
that re-audit; this assessment does not close it.

M4 represents receipt facts at product/package level, not the expiry of every
physical unit. Its stable purchase-item IDs and quantity snapshots allow future
store-private, one-to-many lot receipt/allocation records to reference a line.
A line may contain multiple expiry groups; a lot may be received more than once.
An additive schema can support both without rewriting historical purchases.
Sale/adjustment lot movements will need to allocate quantities while remaining
consistent with the existing product-level inventory ledger. An aggregate
inventory event must not be counted again when its lot allocation is recorded.

Simply adding an expiry date to StoreProduct, a single date to PurchaseItem,
or an unconnected Lot table would give misleading remaining-expiry stock.
Expiry alerts require remaining quantity per lot, handling receipts, sales,
returns, adjustments, unknown expiry and physical checks. Physical FEFO
selection does not itself change D-027 moving-average accounting to FIFO.

The irrecoverable gap is uncaptured physical facts: dates and batches of older
stock cannot be inferred from purchase date or price. On later activation,
legacy stock must be marked unknown/unallocated, or identified by an explicit
physical opening-lot check. Do not invent dates, claim complete expiry coverage,
retroactively allocate old sales, or rewrite completed receipts/cost snapshots.

The initial recommendation to defer expiry has been superseded by the founder's
2026-09-18 requirement for the first pilot. Propose a complete minimal lot/expiry
foundation as the first dependency in M5, extending restock/sale capture before
counting and expiry-attention behavior. This preserves accepted history rather
than reopening M4 for cosmetic changes. Capture, depletion/allocation, unknown
legacy stock and migration tests are required; merely adding a date is not.

## Proposed M5 brief, before tickets are released

1. **Inspect stock:** store-scoped balance/event history, package/base-unit
   display, negative stock and low-stock threshold configuration. Use existing
   events as truth; projections remain rebuildable.
2. **Durable owner checks:** guided single-product/count sessions, selected
   package/conversion snapshots, first blind physical count, compare, optional
   recount retaining both attempts, explicit discrepancy confirmation/reason,
   final review and durable completion. Exact zero physical quantity is valid;
   physical quantity cannot be negative. A matching check is recorded without
   a zero inventory event (the existing ledger rejects zero deltas).
3. **Counting while trading:** preserve a local event watermark and expected
   snapshot hidden from the first-entry UI. If inventory changes during count
   or between comparison and completion, request a refreshed check/recount;
   never silently overwrite newer stock or block genuine sales. Snapshot
   verification/finalization must occur inside the transaction. Multi-device
   stale-count/conflict semantics remain an explicit M7 gate, before claiming
   coordinated offline staff counting.
4. **Small selector:** persist due assignment/attempt/replacement facts, actor,
   policy/version and daily configuration; deterministic selection may use
   recent base-unit movement, last completed check and an explicit quick-count
   preference. Do not compare carton counts as if conversions were equal.
   Exclude inactive/non-countable and normally nonpositive-stock candidates;
   negative stock remains attention/manual reconciliation. No eligible item
   is a truthful state, not a reason to force a nonexistent assignment.
5. **Frequency/replacement:** default daily target 3, configurable/pausable as a
   hypothesis. Use foreground due prompts in store-local days; do not promise
   background delivery. Replacing needs a reason, preserves history and selects
   an eligible alternative without immediate repetition. Empty/exhausted pools
   and repeated replacements remain reviewable, not an automatic accusation.
6. **Atomic correction and cost:** session finalization, nonzero reconciliation
   inventory event, exact adjustment cost movement/projection and one durable
   operation envelope commit together. Actor/store scope, operation replay,
   conflicting reuse rejection and restart survival are required. No direct
   stock overwrite or mutation of old sales/purchases/COGS.
7. **Cost-policy proposal requiring approval:** for shortage of fully costed
   positive stock, remove exact proportional value at its existing average;
   zero/nonpositive remainder has no usable cost. Unknown coverage remains
   unknown. Unexplained positive surplus must not acquire a fabricated zero,
   last-purchase or guessed cost: conservatively mark aggregate coverage
   unavailable until an approved acquisition/valuation flow establishes it.
   Retain original cost evidence in immutable movements. Extend movement kinds,
   rebuild and source validation in the next additive migration, using the
   actual accepted M4 migration number, never rewriting migrations 1–4 or later
   committed audit migrations. This is a proposed D-038 extension, not approved
   accounting policy or a final SQL design.
8. **Local attention:** one inventory exception list with clear distinction
   between low, zero and negative stock and unresolved discrepancies. Provide
   contextual Restock, discrepancy review and per-product Snooze/remind-later.
   Derive current conditions from the ledger; snooze is separate durable
   suppression state, not changing stock. Snooze expiry resets suppression; resolved
   conditions disappear. Proposed escalation rule: worsening from low to zero
   or negative resurfaces the item rather than silently keeping it hidden.
   Home promotion/compact See All arrives M6; M5 does not build financial Home.

Minimum M5 evidence: blind-first UI, retained first/recount values, correct
positive/negative/zero discrepancies, changed-event watermark protection,
failure injection across all writes, matching/repeated/conflicting operation
replay, actor/store isolation, exact adjustment costing and projection rebuild,
populated accepted-M4 upgrade, cold restart of assignment/check/snooze,
candidate exclusions/empty pools/replacement history, snooze expiry/resolution/
worsening conditions, and existing sale/restock regressions. Native/offline/
large-text observations must remain truthful separate device gates.

## Later acceptance notes

- M6 Today: count COMPLETED transactions and sum their stored net sale totals
  over the store-local business day, including credit sales as sales value but
  not cash received. Separate payment metrics if displayed. Use complete range
  queries, safe integer/BigInt aggregation, store isolation and explicit
  empty/error states; never sum paged history. Refresh after durable writes,
  focus/app resume, day rollover and eventual applied sync. Do not maintain a
  second authoritative counter. After reviewing the raw transcript, propose
  optional “Most frequently sold today” ranked by distinct completed sales
  containing that product, with a stable tie rule. This measures popularity
  rather than letting an expensive item automatically lead by value. It is
  not a claim about greatest unit quantity; quantity/value rankings can live
  in Reports. Confirm this non-blocking metric in the M6 design gate.
- M6 Home attention: compact summary/list with See All, check/restock actions
  and existing snooze. Do not build many analytics cards or imply checked stock
  validates sales, receivables, COGS or profit. Reports is a deeper destination
  under More unless its later design review supports another arrangement.
- M8 navigation proposal: Today/Home, Products and More are primary surfaces;
  one labelled accessible Scan action launches the unified scanner and sale
  flow. Hide it on scanner/cart/payment/restock/count/edit/full-screen/keyboard
  flows using a reviewed allowlist; avoid content occlusion and inaccessible
  gesture-only activation. Remove the permanent Sell tab then, preserving the
  manual/search sale fallback and all M3 draft guards/history/deep links. Do
  not expose a working-camera claim or remove the existing reliable manual
  sale entry in M5/M6 before scanner delivery. No additional global product '+'.
- M9/M10 Home price highlights must use actual comparable observations/signals,
  dates, freshness and coverage. Consent/private supplier and identity rules
  remain in force. M11 introduces per-member assignments and authorized owner
  review; M5 attribution does not implement those permissions.

## Raw transcript clarification — 2026-09-18

The founder supplied the original spoken idea after the initial review. It
clarifies immediate standalone value, daily counting habits, staggered checks,
configurable frequency, staff accountability and a familiar, calm interface.
The earlier structured prompt intentionally refined unsafe parts of that raw
idea; this review retains those corrections. These are proposed clarifications,
not new approved implementation scope.

- **Count correctness:** the system quantity is an estimate from recorded
  activity, not the answer to a quiz. If expected stock is 50 and the first
  count is 45, preserve 45, allow a recount, then confirm/review the difference.
  Do not make the person guess until entering 50. Completion may be “Matched”
  or “Discrepancy reconciled”; do not award accuracy by forced agreement.
- **Reports:** keep them accessible. A notice such as “2 stock checks pending;
  these products have not been physically verified today” is useful. Do not
  lock Reports or claim finished checks make the whole report/business 100%
  accurate. A mismatch does not prove theft or an inaccurate sale total.
- **Scheduling:** raw intent is morning, afternoon and before closing, not
  three interruptions at arbitrary times or three permanent product classes.
  Propose configurable store-local check windows with a default target of
  three, accounting for shop hours; show due work when the app is in use.
  Incomplete assignments must not be silently erased by the next slot/day.
  Business hours/windows are product settings, not a question the founder
  must answer for every shop now. Background reminders remain separately
  scoped; foreground prompts must not be described as guaranteed delivery.
- **Selection:** mix quick/easy, recently moving and less recently checked
  products, using a replaceable versioned policy. Rotate across eligible stock
  rather than promising every item will be checked in days/weeks. Eligibility,
  pool size and check capacity determine actual coverage; no theft-prevention
  guarantee follows from three daily counts.
- **Replacements:** preserve the stated reasons (too time-consuming, cannot
  locate, physically out of stock, other). Initially exclude system-recorded
  nonpositive stock from routine assignment, but “physically out of stock” for
  a system-positive item is a zero-count discrepancy requiring review, not a
  silent skip. The suggested maximum of three replacements is a configurable
  policy hypothesis, not an automatic suspicion threshold or a reason to
  force an impractical count. Staff attempts/replacements are factual owner
  review signals in M11; notifications must not allege misconduct.
- **Home popularity:** revise the earlier proposal of top by sales value to
  “Most frequently sold today” by distinct sales as the initial M6 hypothesis.
  Explain the metric explicitly; it is different from most units or highest
  sales value. Home can show one item; deeper rankings belong in Reports.
- **Snooze:** preserve optional hours/days/week/month choices for applicable
  alerts and show the reminder when due. Low-stock snooze need not permit
  hiding serious expiry or safety conditions for a month. Exact supported
  durations/escalation behavior require the relevant design gate; do not
  implement expiry-specific policy without real lot/expiry support.
- **Sale reachability:** keep the one-action selling goal and no second global
  product '+'; maintain a manual/search fallback when camera permission,
  recognition or connectivity fails. A floating action appears on suitable
  major surfaces, not every screen regardless of an active transaction.

The transcript answers intended default frequency, configurability, blind
entry, product rotation, Home immediacy and single Scan entry. At that review,
expiry timing and unexplained extra-stock valuation remained unresolved. The
founder subsequently answered both, as recorded below. Exact
schemas, selector scoring and screen layout stay with the normal engineering
and design gates rather than requiring technical choices from the founder.

## Approval and documentation changes proposed

Approval received from the founder on 2026-09-18:

1. Approved the M5 expansion: blind-first owner checks, configurable default
   target 3, auditable replacement and durable local attention/snooze; adopt
   conservative changed-stock/recount handling. This replaces PRD 15.2.
2. Approved the conservative shortage/surplus costing extension before M5 writes
   adjustments. Financial interpretation remains provisional/professional-review
   gated under D-027; acceptance must not imply full accounting readiness.
3. Required expiry alerts for the first real-shop pilot/MVP/prototype; deferral
   past that pilot is rejected. Completed M4 currently does not implement expiry.

Further review remains for the specific lot/allocation behavior below and the
milestone direction for live Home (M6), global Scan/navigation change (M8),
real Home price signals (M9/M10) and staff review (M11). Detailed screen layouts
and selection heuristics can be reviewed in their normal gates.

After approval and M4 re-audit, update only the necessary existing authorities:
PRD blind check/Home/attention requirements; BUILD_PLAN M5 and relevant future
milestone boundaries; DECISION_LOG for counting/cost/navigation decisions;
DOMAIN_DATA_MODEL/TECHNICAL_ARCHITECTURE for approved reconciliation/adjustment
semantics; DESIGN and app-flow for reviewed M5 states. Root then creates one
M5 plan, rolling tickets and `.agents/workflows/m5-inventory-reconciliation.json`
registration, and updates PROJECT_STATE/project-context with the exact accepted
checkpoint and next approval gate. Reference this change record in those files;
do not clone the backlog into each architecture document. No DESIGN.json without
a real consumer, speculative full-MVP tickets, global workflow changes or new
tool-specific source of truth.

**Disposition:** Approval of M5 behavior/cost handling and first-pilot expiry
priority is recorded above; none of these new features is implemented or source
accepted. Remaining design proposals await review. No completed M4 source or existing shared ledger was changed by
this review. M4 A1–A6 fixes and independent re-audit remain in their own audit
record; M4 source is now independently accepted at `9700ee3`; M5 delegation still
waits for reviewed lot design/tickets.

## Architect response and expiry options — 2026-09-18

The founder supplied an external architect's response. It broadly agrees on
live Home, one Scan action, blind discrepancy-based counts, configurable
selection, factual staff review, honest accuracy language, compact attention and
proper lots. Its suggestions to finish M1/design before M2/M3 describe an older
project state: those milestones already exist. Apply the design gate to the next
approved change; do not restart them. Citation placeholders in that response
are not independently checked source evidence.

### Existing structure and two credible expiry options

Currently, product-level inventory events reconstruct the total stock for a
StoreProduct. Purchase lines preserve receipt facts; sale lines preserve sale
facts. There is no existing expiry strategy or lot stock balance. Example: a
receipt adds 20 milk cartons, another adds 30; current recorded total is 50.
The app cannot tell which cartons expire in June or September.

**Option A — receipt-date reminders only:** capture dates on receipt batch
records and show reminders to inspect those dates. Sales continue to consume
only total product stock. Smaller change, but the app cannot know whether that
batch remains or how many affected units are left. Alerts must say to physically
check a received batch, never claim accurate remaining expiry quantity. This
is a legitimate reminder-only prototype, not full expiry inventory support.
It does not meet the stronger proposed remaining-stock behavior.

**Option B — minimal expiry-aware lot inventory (recommended):** represent
physical receipt groups separately, with store/product/source, exact base
quantity and recorded expiry information. Allocate sale and adjustment effects
to the physical groups involved, without double-counting their parent inventory
event. Twenty June cartons plus thirty September cartons remain distinguishable;
if all twenty June cartons are genuinely sold, their remaining-stock alert
disappears while September stock remains. More initial work, but consistent
offline remaining-quantity alerts, expiry handling and later audits are possible.

A single expiry date on StoreProduct is not a viable third option for mixed
batches. One date on a purchase line also fails if that line represents mixed
expiry groups. For pilot UX, repeated lines/split receipt groups can handle
different dates; the durable model must not assume every product has one date.

### Minimum proposed lot contract and gaps to resolve in the design gate

- Capture the actual date printed on the physical group at restock; preserve
  unknown/date precision rather than inventing dates. Allow multiple date
  groups for one product. Non-expiry-tracked products retain the fast flow.
- A normal product barcode identifies product/package, not necessarily which
  expiry group was taken from the shelf. Suggest earliest-expiring available
  groups to the seller, but obtain an explicit batch choice/confirmation or
  identify the allocation as unverified. Never claim the app knows what was
  physically picked merely because it used an automatic ordering rule.
- Keep selling possible when batch information is missing or stock is negative;
  record unallocated/unknown coverage rather than fabricating a batch. Any
  uncertain allocation must be visible in expiry-coverage status and review.
  Define allocation across multiple groups and manual/search fallbacks.
- Existing stock starts unknown/unallocated. A physical opening batch check
  may classify it without creating stock a second time. Never rewrite old
  receipts, guessed expiry dates, sales/COGS or price observations.
- Use lot-aware counts for tracked products when establishing lot accuracy.
  A total-product shortage alone cannot prove which batch is short. Preserve
  the total discrepancy while marking the unresolved batch breakdown uncertain;
  request batch review/count rather than silently assigning missing units.
- Expiry warnings refer to remaining dated stock with an explicit coverage
  limit. Calendar/date interpretation uses the store's timezone; lead times
  belong in settings. Passing a date does not automatically remove physical
  stock. Disposing/returning/handling requires a reviewed sourced movement.
- Retain moving-average cost under D-027/D-038. Choosing earlier-expiring
  physical stock is not a switch to FIFO accounting or per-lot profit. Preserve
  atomic sale/purchase/adjustment, allocation, cost and outbox completion,
  actor/store isolation and idempotency. Lot read models remain reconstructable
  and consistent with the product inventory ledger, not a second stock truth.
- No recalls, warehouse locations, manufacturing traceability, advanced staff
  assignment, expiry safety guarantees or full accounting suite in this slice.
  M7 must review concurrent-device lot allocations before those claims.

Proposed sequence: accept corrected M4 source first; coordinator approves the
expiry-aware M5 design/decision contract with founder review, aligns the existing
authorities, then publishes dependency-ordered tickets. First implement the lot
foundation and sale/restock integration, then reconciliation/cycle checks and
attention; M6 presents those real alerts on Home before the first pilot. No
implementation agent is delegated M5 until its plan/design/tickets are ready.

### Additional architect refinements

- Do not implement one-tap “Mark restocked” as a balance update or dismiss-only
  action: route into a recorded purchase or explicit reconciliation. “Mark
  handled” expiry actions must record the actual disposition/coverage change;
  merely hiding an alert cannot establish that physical stock was removed.
- Avoid an undefined “Inventory confidence: High” badge. Start with factual
  check progress, dates, unresolved differences and unknown expiry coverage.
  A future confidence score needs explicit evidence/rules and explanation.
- Staff may later independently count the same product as well as different
  assignments; retain blind first results, authorization and reviewer control
  in M11 rather than adding them to the owner-only first implementation.
- Subtle offline status is compatible with local-first operation; locally saved
  must never be presented as cloud-acknowledged. Current credit sales already
  exist, so Home sales/cash wording must distinguish them from its first release.
- Reports need not become a new primary tab solely because the architect drew
  Home/Products/Reports/More. Preserve navigation as a proposed design decision
  until that gate; no extra chart/card/role ceremony is required.
