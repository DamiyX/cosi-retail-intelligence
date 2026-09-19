# DECISION_LOG — Retail Commerce Intelligence

**Version:** 1.0  
**Status:** Active project decision record  
**Purpose:** Preserve durable product and architecture decisions so future AI coding-agent sessions do not reopen settled questions without evidence.

---

# 1. How to Use This File

This is **not** a meeting log.

Record a decision here only when it materially affects:

- product meaning;
- architecture;
- data model;
- synchronization;
- security;
- build strategy;
- recognition architecture;
- major dependencies;
- long-term maintainability.

Do not record:

- trivial refactors;
- variable names;
- ordinary bug fixes;
- small UI choices;
- temporary debugging steps.

---

# 2. Decision Statuses

Use one of:

- `ACTIVE` — current approved decision
- `PROVISIONAL` — current direction, still requires validation
- `SUPERSEDED` — replaced by a later approved decision
- `REJECTED` — explicitly considered and not selected
- `DEFERRED` — intentionally postponed

If a decision changes:

1. do not delete the old entry;
2. mark it `SUPERSEDED`;
3. reference the new decision ID;
4. explain why.

---

# 3. Source-of-Truth Priority

If documents conflict:

1. later approved decision in this file;
2. current architecture/domain documents;
3. PRD;
4. Product Inception;
5. old conversation history.

A decision entry does not override another source-of-truth document unless the change is explicit.

When a major decision changes, update the affected source-of-truth document too.

---

# 4. Decision Index

| ID | Decision | Status |
|---|---|---|
| D-001 | Android-first mobile MVP | ACTIVE |
| D-002 | React Native + Expo Development Build + TypeScript | ACTIVE |
| D-003 | Offline-first / local-write-first architecture | ACTIVE |
| D-004 | Expo SQLite as local durable business database | ACTIVE |
| D-005 | Supabase as MVP backend | ACTIVE |
| D-006 | One repository with npm workspaces | ACTIVE |
| D-007 | Product/package model uses base units + conversions | ACTIVE |
| D-008 | Inventory uses event/ledger model | ACTIVE |
| D-009 | Completed business transactions are append-oriented/auditable | ACTIVE |
| D-010 | Client-generated globally unique domain IDs | ACTIVE |
| D-011 | Custom sync protocol first; managed sync remains fallback | PROVISIONAL |
| D-012 | Server-controlled per-store sync revisions | ACTIVE |
| D-013 | Preserve concurrent offline sales even if stock becomes negative | ACTIVE |
| D-014 | Shared product identity separated from store commercial data | ACTIVE |
| D-015 | Price strategy: lead with price, deliver with control | ACTIVE |
| D-016 | Personal restock-price intelligence before network price intelligence | ACTIVE |
| D-017 | Recognition is local product retrieval, not universal classification | ACTIVE |
| D-018 | Recognition must support STRONG / AMBIGUOUS / UNKNOWN | ACTIVE |
| D-019 | Visual recognition uses embedding retrieval first | PROVISIONAL |
| D-020 | Recognition runs as a parallel R&D track | ACTIVE |
| D-021 | Barcode/scanner shell before production visual recognition | ACTIVE |
| D-022 | Final recognition model/runtime chosen only by benchmark | ACTIVE |
| D-023 | Future web/PWA is secondary, not MVP client | ACTIVE |
| D-024 | Product Inception/PRD/architecture docs are repo source of truth | ACTIVE |
| D-025 | AI coding agents work milestone-by-milestone with planning first | ACTIVE |
| D-026 | PROJECT_STATE is the current handoff file | ACTIVE |
| D-027 | Weighted-average costing is initial candidate, not final accounting policy | PROVISIONAL |
| D-028 | Transaction snapshots preserve historical meaning | ACTIVE |
| D-029 | No full-catalog requirement before first value | ACTIVE |
| D-030 | Recognition failure must never block checkout | ACTIVE |
| D-031 | AI coding agents are interchangeable; task branch is the continuity boundary | ACTIVE |
| D-032 | GitHub remote is the normal cross-laptop synchronization mechanism | ACTIVE |
| D-033 | COSI is the temporary internal project codename | ACTIVE |
| D-034 | Authoritative quantities use fixed-scale micro-units | ACTIVE |
| D-035 | Temporary products use store-scoped provisional variants | ACTIVE |
| D-036 | Local sale arithmetic is exact-or-reject | ACTIVE |
| D-037 | M3 uses one tender allocation with explicit credit truth | ACTIVE |
| D-038 | M4 exact cost basis, provisional COGS rounding and conservative coverage | ACTIVE |
| D-039 | Pilot batch awareness, automatic assumed FEFO and first-class unknown stock | ACTIVE |
| D-040 | Blind owner checks, sourced adjustment costing and durable attention | ACTIVE |

---

# 5. Decision Records

## D-001 — Android-First Mobile MVP

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

The first production target is Android.

### Rationale

- Primary target retailers are expected to use Android smartphones.
- The MVP is intended for in-store operational use.
- Native device capabilities are important for:
  - offline storage;
  - barcode/camera;
  - future on-device ML;
  - secure local storage.

### Consequences

- Android gets priority for development and testing.
- iOS is not required for MVP readiness.
- Future web/PWA does not drive initial architecture decisions.

### Revisit if

- pilot users materially require another platform;
- platform distribution becomes a blocker.

---

## D-002 — React Native + Expo Development Build + TypeScript

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

Use:

> React Native + Expo Development Build + TypeScript

for the main mobile application.

### Rationale

- fast iteration;
- strong TypeScript ecosystem;
- access to native modules;
- camera/SQLite support;
- future model/runtime integration;
- reusable domain/contracts for future clients;
- lower founder/tooling friction than a more manually managed native stack.

### Rejected alternatives

- PWA-first
- Flutter for this new commerce product
- Expo Go as permanent runtime assumption

### Revisit if

A critical required native capability proves impractical in Expo Development Build and cannot be solved cleanly.

---

## D-003 — Offline-First / Local-Write-First Architecture

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

Core store operations write locally first.

The network is not in the critical path for:

- sales;
- restocking;
- inventory adjustments;
- expenses;
- withdrawals.

### Rationale

Retail connectivity may be unreliable, but trading cannot stop.

### Consequences

- SQLite is operational source of truth on device while offline.
- sync is asynchronous;
- pending sync is a normal state;
- cloud failure must not make a locally committed sale fail.

### Revisit if

Never for the core retailer transaction flow unless the product itself changes fundamentally.

---

## D-004 — Expo SQLite as Local Durable Business Database

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

Use Expo SQLite as the local durable relational database.

### Rationale

The product requires:

- transactions;
- relational integrity;
- local querying;
- durable offline data;
- migration support;
- inventory and financial records.

### Consequences

- business data must not live only in React state;
- migrations are mandatory;
- local SQL access is wrapped behind repository/application layers.

### Revisit if

Expo SQLite demonstrates a blocking reliability/native limitation on target devices.

---

## D-005 — Supabase as MVP Backend

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

Use Supabase for:

- PostgreSQL;
- Auth;
- Storage;
- Edge Functions.

### Rationale

- PostgreSQL fits the relational domain;
- RLS supports store-level authorization;
- Auth and Storage reduce custom infrastructure;
- Edge Functions support trusted sync endpoints;
- low infrastructure complexity for a small team.

### Rejected alternatives

- Firebase/Firestore as primary business database
- custom backend stack from scratch for MVP

### Revisit if

- cost;
- scale;
- regional availability;
- required server behavior;
- operational limits

become material blockers.

---

## D-006 — One Repository with npm Workspaces

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

Use one Git repository containing:

- main mobile app;
- recognition lab;
- shared packages;
- backend migrations/functions;
- documentation.

Use npm workspaces initially.

### Rationale

- one project memory;
- easier AI-agent context;
- shared contracts;
- simpler founder workflow;
- reduced duplication.

### Revisit if

Repository scale or team boundaries later justify separation.

---

## D-007 — Base-Unit + Package Conversion Model

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

A product variant has one base inventory unit.

Other package units define conversion factors.

Example:

```text
sachet = 1
pack = 10
carton = 40
```

### Rationale

Retailers may buy and sell the same product in different packaging levels.

Treating each packaging level as unrelated would corrupt inventory and pricing relationships.

### Consequences

- sales/purchases snapshot conversion used;
- package-unit changes cannot rewrite history.

### Revisit if

A future vertical requires a richer unit model; extend rather than discard the principle.

---

## D-008 — Inventory Event / Ledger Model

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

Inventory changes are represented as events.

Examples:

- purchase;
- sale;
- damage;
- expiry;
- missing;
- personal use;
- correction.

### Rationale

A mutable quantity alone does not explain how stock changed.

### Consequences

- current balance is derived/projected;
- reconciliation creates adjustment events;
- history remains auditable.

---

## D-009 — Completed Transactions Are Append-Oriented / Auditable

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

Completed sales, purchases and related financial/inventory history should not be casually destructively edited.

Corrections use:

- void;
- reversal;
- adjustment;
- compensating records.

### Rationale

Historical meaning must remain trustworthy for inventory, price intelligence and financial analysis.

---

## D-010 — Client-Generated Globally Unique Domain IDs

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

Offline-created entities receive their final globally unique ID on device before synchronization.

### Rationale

Devices must create transactions without contacting the backend.

### Current implementation candidate

UUID generated using a suitable cryptographic/platform-supported API.

### Revisit if

the active AI coding agent demonstrates a better globally unique ordered-ID choice with meaningful operational benefit.

---

## D-011 — Controlled Custom Sync First

**Status:** PROVISIONAL  
**Date:** 2026-09-13

### Decision

Build the first sync protocol around:

- local outbox;
- idempotent operations;
- server revisions;
- incremental pull;
- explicit conflicts.

Do not make PowerSync or another managed engine a foundational dependency yet.

### Implementation sequence clarification — 2026-09-14

- M1 establishes the reusable SQLite transaction boundary but does not create a
  feature outbox before a synchronizable business aggregate exists.
- M2 adds the durable outbox operation envelope and requires catalogue mutation
  plus enqueue to commit atomically.
- M3–M6 reuse that capture boundary for completed business transactions.
- M7 adds network push/pull, acknowledgement, retry, revision, and conflict
  behavior over the already captured operations.

### Rationale

The product requires:

- aggregate transactional operations;
- auditability;
- privacy transformation for price observations;
- explicit conflict semantics.

### Risk

Custom synchronization is one of the highest-risk engineering areas.

### Fallback

Evaluate a managed sync engine such as PowerSync if implementation becomes unsafe or threatens the MVP schedule.

### Revisit trigger

Failure of the first controlled sync spike or unacceptable complexity/reliability.

---

## D-012 — Server-Controlled Per-Store Sync Revision

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

Incremental sync ordering uses a server-controlled per-store revision/cursor.

### Rationale

Device clocks are not reliable global ordering mechanisms.

### Consequences

- push operations participate in revision creation;
- pull uses server revision;
- clients advance cursor only after local application commits.

---

## D-013 — Preserve Concurrent Offline Sales

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

If multiple offline devices sell the same final recorded stock, preserve the real sales even if synchronized stock becomes negative.

### Rationale

Without connectivity, perfect global inventory reservation is impossible.

Discarding a genuine sale is worse than surfacing a stock discrepancy.

### Consequences

- negative/discrepant stock becomes a reconciliation signal;
- sync never deletes one real sale merely to maintain a non-negative balance.

---

## D-014 — Shared Product Identity Separate from Store Commercial Data

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

Platform/shared identity is separate from store-specific data.

Shared:
- product identity;
- barcode;
- brand;
- package presentation;
- recognition profile.

Store-private:
- selling price;
- cost;
- stock;
- supplier;
- reorder level.

### Rationale

A global catalog update must not overwrite the retailer's business truth.

---

## D-015 — Product Strategy: Lead With Price, Deliver With Control

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

Use price intelligence as the main differentiation/acquisition wedge while business and inventory control provide immediate standalone value and retention.

### Rationale

Research supports replacement-cost pressure as important, but the network will be weak early.

The product must still work for one retailer.

### Revisit if

Pilot evidence shows price intelligence does not materially affect adoption or decisions.

---

## D-016 — Personal Price Intelligence Before Network Price Intelligence

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

First provide purchase-price history from the retailer's own data.

Then layer network/market signals when observation density is sufficient.

### Rationale

Eliminates cold-start dependency.

---

## D-017 — Recognition Is Local Product Retrieval, Not Universal Classification

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

Recognition is designed to identify locally relevant products, especially products carried by the store.

### Rationale

This improves:

- relevance;
- offline operation;
- speed;
- cache size;
- false-match control.

### Consequences

Search order prioritizes:

1. barcode;
2. active store catalog;
3. small discovery cache;
4. wider catalog when online.

---

## D-018 — Recognition States: STRONG / AMBIGUOUS / UNKNOWN

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

Recognition must not always force a product result.

### Rationale

False confident matches are dangerous.

### Consequences

- ambiguous results can show top candidates;
- unknown falls back to search/create;
- confidence thresholds require calibration from test data.

---

## D-019 — Embedding Retrieval as Initial Visual Recognition Strategy

**Status:** PROVISIONAL  
**Date:** 2026-09-13

### Decision

Initial visual recognition architecture uses:

> pretrained/mobile encoder → embedding → local similarity retrieval

instead of a classifier requiring retraining whenever products are added.

### Rationale

Supports store-local dynamic enrollment and offline retrieval.

### Important limitation

The final model is not chosen.

This decision may be revised if benchmark evidence demonstrates a materially better architecture.

---

## D-020 — Recognition Runs in Parallel R&D Track

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

Core retail application and advanced visual recognition are developed as coordinated but separate tracks.

### Rationale

Recognition is technically uncertain and must not delay validation of:

- sales;
- restocking;
- inventory;
- business visibility.

---

## D-021 — Barcode / Unified Scanner Shell Before Production Visual Recognition

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

Build the scanner contract and barcode path before making visual recognition a production dependency.

### Rationale

This validates:

- scanner UX;
- package mapping;
- RecognitionService boundary;
- fallback behavior

with lower technical risk.

---

## D-022 — Final Recognition Model/Runtime Selected Only Through Benchmarking

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

Do not lock a production model/runtime based on popularity or convenience.

### Selection criteria

- SKU accuracy;
- false accept;
- unknown handling;
- package accuracy;
- latency;
- storage;
- RAM;
- thermal/battery;
- device compatibility;
- licensing.

---

## D-023 — Web/PWA Is Later, Not MVP

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

The MVP is mobile/Android first.

Future web/PWA may reuse:

- domain logic;
- contracts;
- backend APIs.

It does not have to reuse the native local persistence implementation.

### Rationale

Native mobile usage is the initial store workflow.

---

## D-024 — Repository Documents Are Implementation Source of Truth

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

Once repository documentation exists, any AI coding agent should use it rather than old chat history as authoritative implementation context.

### Rationale

Chat context is temporary and incomplete.

Repository documentation persists across chats.

---

## D-025 — AI Coding Agents Work Milestone-by-Milestone With Planning First

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

For each meaningful milestone:

1. the active AI coding agent reads relevant docs/repo;
2. proposes implementation plan;
3. identifies risks/conflicts;
4. implementation follows;
5. tests run;
6. project state updates.

### Rationale

Prevents uncontrolled whole-app generation and architecture drift.

---

## D-026 — PROJECT_STATE Is the Current Handoff File

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

Every new major AI coding-agent session should read `PROJECT_STATE.md` first.

### Rationale

It is a concise current-state pointer, while this file preserves historical decisions.

---

## D-027 — Moving Weighted-Average Cost Is Initial Candidate

**Status:** PROVISIONAL  
**Date:** 2026-09-13

### Decision

Use moving weighted-average cost as the initial engineering candidate for FMCG inventory costing.

### Rationale

It provides a practical way to estimate COGS/margin as purchase costs change.

### Constraint

Do not present this as finalized accounting policy until reviewed with an appropriate accounting professional.

### Revisit trigger

Accounting review or retailer workflow demonstrates another method is required.

---

## D-028 — Transaction Snapshots Preserve Historical Meaning

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

Sale and purchase lines preserve transaction-time snapshots such as:

- product display name;
- package name;
- conversion;
- price;
- cost basis.

### Rationale

Future product/package edits must not alter past transaction meaning.

---

## D-029 — No Full Catalogue Required Before Value

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

Retailers must not be forced to digitize the entire store before selling/receiving value.

### Principle

> Sell first, enrich later.

### Consequences

- temporary products are valid;
- normal transactions progressively build the catalog.

---

## D-030 — Recognition Failure Never Blocks Checkout

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

If recognition fails:

- search;
- candidate selection;
- temporary product;
- manual entry

must still allow completion of the transaction.

### Rationale

Recognition is an accelerator, not a business-critical dependency.

---

## D-031 — AI Coding Agents Are Interchangeable

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

The project must not depend on the persistent chat memory of Codex, Gemini, OpenCode, Antigravity, or another AI coding tool.

Any capable agent may continue work started by another agent.

The continuity boundary is:

- repository source-of-truth documentation;
- current Git branch;
- current code;
- Git status/diff/history;
- tests.

### Branch rule

Branches belong to tasks, not AI models.

Changing from Codex to another model does not require a new branch.

### Rationale

The founder wants to:

- switch when one provider reaches context/usage limits;
- move to a better model when available;
- use different local coding tools;
- avoid vendor lock-in.

### Consequences

`MULTI_AGENT_WORKFLOW.md` defines handoff behavior.

Tool-specific instruction files must stay thin and point back to `AGENTS.md`.

---

## D-032 — GitHub Remote for Cross-Laptop Continuity

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

Use the shared Git remote/GitHub repository as the normal mechanism for moving code and project state between development laptops.

### Workflow

On the laptop being left:

> test where practical → commit → push.

On the next laptop:

> fetch/pull → checkout same branch → inspect state → continue.

WIP commits are acceptable when moving unfinished work between computers.

### Rationale

This preserves:

- history;
- branches;
- source-of-truth docs;
- reproducibility;
- safe handoff between machines and agents.

### Consequences

Do not manually copy project directories as the normal synchronization method.

Secrets and large datasets/models require separate controlled handling.

---

## D-033 — COSI Is the Temporary Internal Project Codename

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

Use:

> **COSI — Commerce Operating System Intelligence**

as the temporary internal project codename until the final company/product brand is selected.

### Rationale

The build needs a stable project/repository reference before final branding is resolved.

### Naming constraint

COSI should remain primarily a project-level label. Avoid unnecessary branding in domain entity/type names, database table names, APIs, reusable packages, or internal business invariants. Prefer domain-neutral technical names so the eventual brand change remains mostly a repository/app-display/marketing rename rather than a schema/code refactor.

### Brand status

COSI is **not** approved as the final public brand. A quick online search shows multiple unrelated organizations and at least one active SaaS product already using Cosi/COSI, reinforcing its use as an internal codename only.

---

## D-034 — Authoritative Quantities Use Fixed-Scale Micro-Units

**Status:** ACTIVE  
**Date:** 2026-09-14

### Decision

Represent authoritative inventory quantities and package conversions as signed
SQLite integers at a fixed scale of **1,000,000 micro-units per base unit**.
Parse user and sync inputs from canonical decimal strings. Domain arithmetic
uses integer/BigInt intermediates and must either produce an exactly
representable micro-unit result or reject the operation; it must never silently
round or use binary floating point as the source of truth.

Persisted values and values crossing React Native/native boundaries must remain
within JavaScript's safe-integer range. A later server contract will transmit
canonical decimal strings and store the corresponding values in PostgreSQL
`NUMERIC` columns.

### Rationale

Six decimal places support discrete FMCG units and foreseeable fractional
weight/volume categories while keeping local comparisons, sums, indexes, and
constraints simple. The safe-integer ceiling still permits roughly nine billion
base units per persisted value. Exact rejection exposes unsupported precision
instead of corrupting stock through hidden rounding.

### Smallest viable alternative considered

Canonical decimal strings plus an arbitrary-precision decimal dependency would
support variable precision, but would complicate SQLite ordering and aggregation
before evidence shows that more than six decimal places are needed.

### Revisit if

Pilot data requires more than six decimal places or a legitimate operation
cannot fit the safe persisted range.

---

## D-035 — Temporary Products Use Store-Scoped Provisional Variants

**Status:** ACTIVE  
**Date:** 2026-09-14

### Decision

Creating a temporary product in M2 creates one store-scoped provisional
`ProductVariant`, its active base `PackageUnit`, and the store's `StoreProduct`
record in one local transaction. A store-scoped variant has an owning store and
is private to that store. A platform variant has no owning store. New M2
`StoreProduct` records always reference a variant; `isTemporary` means the
identity still needs enrichment or matching, rather than meaning the product
has no package identity.

Later matching must be an explicit link/consolidation operation. It must retain
store-owned price, cost, stock, SKU, package settings, and historical transaction
snapshots. M2 may record the relationship but does not build the shared catalogue
or network reconciliation service.

### Rationale

Every sellable or restockable product needs a base unit and valid package
conversion. Giving temporary products a private provisional variant keeps the
existing `PackageUnit -> ProductVariant` ownership model intact and avoids a
second package table or nullable dual-owner foreign key.

### Smallest viable alternative considered

Allowing `StoreProduct.productVariantId` to remain null would require package
definitions to be owned by two different entity types or would prevent a
temporary product from participating safely in quantity calculations.

---

## D-036 — Exact Local Sale Arithmetic

**Status:** ACTIVE  
**Date:** 2026-09-14

### Decision

- Persist sale package quantity and inventory quantity as D-034 micro-unit
  integers.
- Compute `quantityBase = quantityPackages × conversionSnapshot / 1,000,000`
  and reject a result that is not exactly representable.
- Persist unit selling price and absolute line discount in integer minor units.
- Compute gross line money as
  `unitPriceMinor × quantityPackages / 1,000,000`; reject a fractional minor
  unit instead of silently rounding.
- Define `lineTotal = grossLine - discountAmount`, `subtotal = sum(grossLine)`,
  `discountTotal = sum(discountAmount)`, and `total = sum(lineTotal)`.

### Rationale

This extends the approved exact-or-reject quantity and money rules into M3,
keeps completed-sale totals reproducible, and avoids JavaScript floating-point
authority or hidden rounding.

### Consequences

The sale form must explain the rare quantity/price combination that would
produce less than one currency minor unit. Discounts are line-level absolute
amounts in M3; percentage and order-level discounts are deferred.

---

## D-037 — M3 Tender, Credit, Draft, and Correction Boundary

**Status:** ACTIVE  
**Date:** 2026-09-14

### Decision

- The M3 cart is an in-memory draft. No Sale or outbox row exists until the
  retailer confirms completion; leaving a dirty cart requires confirmation.
- One tender allocation covers the completed sale total in M3: cash, bank
  transfer, POS/card, or credit. Split tender is deferred.
- `Payment.amount` represents the amount allocated to its tender method. Credit
  is not counted as cash received.
- A credit sale requires a customer name and atomically creates or selects a
  lightweight CustomerAccount plus an OPEN Receivable for the credit amount.
  Name alone never auto-merges two accounts: the retailer explicitly selects
  an existing match or creates a new account.
  Partial settlement and debt-collection workflow are deferred.
- Cost/COGS snapshots are nullable until M4 supplies a validated cost state.
  M4 must not retroactively invent cost for already-completed sales.
- Completed sales are immutable in M3. Void/reversal/return UI waits for its
  explicit correction design; no delete or edit path is exposed.

### Rationale

This is the smallest coherent implementation of every PRD payment method while
keeping cash reporting honest and preserving completed transaction history.

### Consequences

Unexpected app termination can lose an uncompleted cart, but never a completed
sale. Completion must atomically commit the sale, items, tender, optional credit
records, inventory events, and one aggregate outbox envelope.

---

## D-038 — M4 Exact Cost Basis and Provisional Coverage Rules

**Status:** ACTIVE engineering contract; D-027 remains PROVISIONAL accounting policy  
**Date:** 2026-09-18  
**Approval:** Founder explicitly approved the M4 costing and screen proposal and
instructed the coordinator to assign M4 implementation.

### Decision

- Purchase quantity/conversion uses D-034 safe integer micro-units. Merchant
  input is total line cost or per-package unit cost in nonnegative integer minor
  units. Preserve mode/value and immutable quantity/name/conversion/currency
  snapshots. Unit-cost mode must yield an exact integer line total; total-cost
  mode can yield a fractional normalized price. Explicit zero cost is distinct
  from unavailable cost.
- Normalized package/base prices and moving average costs use reduced,
  nonnegative rational values, with BigInt internal calculations and canonical
  decimal-string numerator/denominator at storage/JSON boundaries. Cost ratios
  are minor units per whole base unit; denominators are positive.
- For fully covered positive stock, average equals exact remaining value plus
  receipt total divided by new quantity. Sales consume exact proportional value;
  processing order of repeated-product lines is stable.
- A fully covered NEW sale line snapshots its exact basis and method/version.
  Estimated COGS rounds half up once per line to integer minor units. Rounded
  COGS is not fed back into the exact stock valuation. D-036 sale amounts,
  discounts and tenders continue to use exact-or-reject arithmetic.
- Positive stock with unknown prior coverage has unavailable average/COGS;
  purchases still save and their original prices remain visible. When a receipt
  takes a prior zero/negative balance positive, initialize the positive remainder
  at that receipt's exact unit cost. Never retroactively cost the old deficit.
  Nonpositive stock has no usable average and zero costed quantity. A sale line
  exceeding coverage has unavailable COGS for the whole line, consumes remaining
  coverage, and remains a valid genuine sale under D-013.
- Completed pre-M4 sales remain unchanged. New immutable companion snapshots
  may preserve fractional cost basis; integer unit-cost fields must not pretend
  fractional values are integral. Sale cost snapshots and cost movements/state
  share the sale transaction. Cost state is store-private and reconstructable
  from immutable purchase/sale movements with explicit local application order.
- Purchase/items, positive inventory events, cost movements/state, personal
  observations, optional newly created supplier and one completed-purchase
  outbox envelope commit atomically. Replay preserves actor/store ownership and
  original immutable attribution, including resolved membership and device.
- Personal observations are private, reference purchase lines and default
  contribution consent to false. Supplier selection/creation is explicit;
  duplicate names never auto-merge. Restock draft is in memory with dirty-exit
  guards; purchase completion does not imply payment/payable settlement.

### Evidence and examples

The approved M4_RESTOCKING_COSTING_PLAN supplies verification cases: 20 units at
30000 kobo plus 40 at 35000 => 100000/3 kobo/unit; one-unit COGS 33333, three-unit
line COGS 100000. Half-kobo rounds to one kobo. Unknown positive stock retains
unavailable cost; balance -2 plus five purchased units costs only the positive
remainder of three, with no historical backfill.

### Tradeoffs and limits

Rational basis adds persistence/validation work but avoids compounding rounded
unit costs. Whole-kobo average storage was rejected because it loses basis;
leaving all subsequent sale COGS unavailable would defer required integration.
Per-line rounding can differ from rounding a combined quantity; retain exact
basis and method version, label costs as estimates, and make no finalized
accounting or full profit/P&L claim. Professional review remains required.
M5 reviews adjustment costing, and M7 reviews concurrent-device costing/order;
local application order is not global synchronization. Purchasing credit,
returns, voids, taxes and landed-cost allocation remain outside M4.

---

## D-039 — Minimal Batch Awareness and Automatic Assumed FEFO

**Status:** ACTIVE; implementation assigned to M5 planning, not completed M4.  
**Date:** 2026-09-18.  
**Approval:** Founder resolved pilot expiry/batch direction explicitly, including
automatic FEFO without ordinary batch selection and valid unknown stock.

### Decision

Use internal received/inspected groups for multiple dates per store product,
while retaining one ordinary product stock total. Dates are optional and preserve
DAY/MONTH/UNKNOWN precision and printed meaning; internal UUIDs are generated,
manufacturer lot numbers optional. One expiry group per new receipt line is
the minimum initial integration; repeated same-product lines handle mixed dates.
Product inventory events remain total-stock truth. Batch movements explain those
events and explicit net-zero classifications; projections are rebuildable.

Ordinary sales automatically use FEFO over recorded dates, then undated stock,
with stable ties and an ASSUMED_FEFO policy/evidence version. No mandatory
physical batch selection or confirmation. Inferred allocation is not physical
proof, even if the group was physically counted earlier. Unknown legacy/residual
stock, missing dates and genuine negative-stock sales remain supported.

Actual remaining recorded groups drive alerts, with estimated quantity wording
and coverage limits. No day countdown for a month-only label. Date passage
raises attention without stock subtraction; expired removal is a sourced
inventory/cost/batch/outbox operation. Normal sale recording stays possible;
elapsed-date warnings must not be confused with strict traceability/sale policy.

FEFO does not change D-027/D-038 moving-average financial costing. Old purchase,
sale, COGS, observation and outbox history remain immutable. Add schema through
new migrations after version 6; no unsafe historical date/lot reconstruction.
DOMAIN_DATA_MODEL 10.5 defines the facts and invariant placement.

### Rationale / alternatives

Single product expiry cannot represent mixed dates; historical receipt reminders
cannot indicate surviving grouped stock. Mandatory checkout batch selection adds
friction rejected by the founder. Automatic allocation with honest evidence and
physical reconciliation meets the small-retailer need. Unknown residual derived
from the event ledger avoids fabricated receipts or duplicate opening stock.

### Limits and revisit gates

M5 is local-first, not warehouse management, regulated traceability or batch-cost
accounting. M7 must review concurrent offline lot allocation and count conflicts
without discarding real sales. Strict physical identification, GS1 expiry/lot
capture and OCR are future enhancements; recognition identity stays separate.

---

## D-040 — Blind Checks, Inventory Adjustment Costing and Attention

**Status:** ACTIVE engineering/product behavior; D-027 remains provisional.  
**Date:** 2026-09-18.  
**Approval:** Founder approved expanded M5 stock-check/attention and conservative
unexplained-surplus costing before resolving D-039. Supersedes the previous
expected-quantity-first PRD 15.2 flow; extends D-038 to sourced M5 adjustments.

### Decision

Hide expected quantity before the first physical submission; retain count/recount
facts, compare and reconcile differences instead of training the user to guess.
Revalidate inventory and batch watermarks in finalization. A matching count
finishes without a zero-delta event. A total-only discrepancy cannot prove which
batch is missing; preserve the correction and mark unresolved composition unknown
or obtain a group count. Net-zero classification changes no cost or product stock.

Owner-only management is the first slice; new commands resolve the active OWNER
role rather than granting ADMIN/STAFF management implicitly. STAFF assignment and
supervisor review belong to M11. Default target three guided checks/day is
configurable/pausable and uses store-local foreground due windows. Selection is
versioned/extensible. Exclude ordinary nonpositive stock; replacements need
reasons and retain attempts. Repeated replacement is not an automatic accusation.

All nonzero adjustments/removals have immutable sourced aggregate/line facts,
explicit events and atomic cost/batch/outbox completion. Fully covered shortages
consume exact proportional moving-average value. Unknown coverage stays unknown;
unexplained positive additions make current aggregate cost unavailable, retaining
immutable value history rather than assigning zero/guessed cost. Extend cost
movement vocabulary/rebuild in a new migration; never rewrite historical COGS.

One attention list derives low/zero/negative stock, unresolved differences and
expiry. Durable snooze does not mutate inventory; resolved conditions vanish,
worsening severity resurfaces. Restock records a purchase; removed/expired actions
record real quantity effects. M6 promotes real attention to calm Home/See All.

### Consequences / rejected alternatives

Check completion proves only the observed stock facts at that time, not full
business/report accuracy. FEFO shrinkage guessing, absolute balance overwrites,
fabricated surplus costs and dismiss-only stock actions are rejected. Professional
accounting review and M7 concurrent-device order/conflict review remain gates.

---

## D-041 — M6 Money-Out Capture and Truthful Daily Summary

**Status:** ACTIVE engineering/product behavior; accounting interpretation remains provisional.  
**Date:** 2026-09-19.  
**Approval:** Established PRD/build requirements plus founder-delegated milestone
planning and ticket/design judgment; no new formal accounting claim.

### Decision

M6 records operating Expense and OwnerWithdrawal as separate immutable,
store-private, owner-attributed transactions. Initial management is active OWNER
only; later staff permissions belong to M11. Positive integer minor money, store
currency, optional note, occurred time, resolved member/user/device and one
atomic idempotent outbox envelope are required. M6 does not add edit/delete,
cash-account allocation, recurring schedules, receipts or accounting journals.

The store-local daily summary uses full half-open time ranges. Sales value includes
credit sales and is not cash received. Tracked COGS/gross margin is shown only
with explicit immutable cost coverage; unavailable coverage never becomes zero.
Expenses and owner withdrawals remain separate. No value is labelled net profit,
P&L, cash balance or retained capital. The optional popular product means the
product occurring in the most distinct completed sales that day, with stable ties,
not unlike-unit volume or revenue rank.

Home promotes these real facts and a bounded preview of M5 attention. Purchase-
cost/market movement signals remain M9/M10 under PC-07. M8 owns global Scan and
navigation changes; M11 owns staff activity/accountability.

### Consequences

Migrations are additive; expenses/withdrawals later sync as append/deduplicate
transactions. Professional accounting review remains required before formal
claims. Physical-device and release-readiness checks remain independent of source
acceptance.

---

## D-042 — M7 Authenticated Sync and PostgreSQL Application Boundary

**Status:** ACTIVE implementation contract under D-005/D-011/D-012; custom-sync
fallback remains available if the controlled spike proves unsafe.  
**Date:** 2026-09-19.  
**Approval:** Founder directed the coordinator to reconcile product changes,
prepare M7 and continue the milestone workflow; this records the smallest
transaction-safe implementation of the already approved Supabase/custom-sync
architecture rather than changing the selected stack.

### Decision

- Keep provider-independent, explicitly versioned sync DTOs in application code.
  Authenticated Edge Functions form the narrow transport boundary; PostgreSQL
  performs idempotency checks, aggregate application, store-revision assignment
  and change-log writes in one transaction.
- A verified Supabase Auth subject maps explicitly to a COSI domain user/member.
  Local user IDs are not silently treated as `auth.users.id`. The first owner may
  idempotently enrol one existing local-only store; later devices require active
  membership and explicit device registration. Final sign-in/invitation UI stays
  deferred.
- Every endpoint revalidates active membership, device/store relation, payload
  schema, operation permission and cross-store references. Secret/service-role
  credentials remain server-side. Use explicit grants, RLS and negative tests;
  never depend on automatic Data API exposure.
- Serialize accepted changes by locking one per-store sync-state row, then write
  applied-operation result, normalized business facts, incremented revision and
  change records before commit. Pull cursors advance only after local application
  commits.
- M7 includes every current M2–M6 canonical outbox operation. Append facts
  deduplicate; mutable catalogue/configuration uses base server versions and
  durable conflicts. M5 batch/count uncertainty and M6 owner-only money-out
  semantics remain intact.
- M7 source acceptance requires an actual disposable PostgreSQL/Supabase
  integration run. Mocks cannot prove transaction, grant or RLS behavior.

### Rationale

Independent Data API calls cannot make a multi-table Sale or Purchase commit
atomic. A transaction-owning database boundary preserves D-013 and the aggregate
outbox design while Edge Functions keep authentication and transport concerns
small. Explicit auth mapping allows existing local-first pilot data to enrol
without rewriting actor history or prematurely deciding final onboarding UX.

### Revisit trigger

Revisit D-011 and evaluate a managed sync engine if the M7 sale spike cannot
demonstrate safe idempotent retry, per-store ordering, RLS isolation and
recoverable pull without disproportionate complexity.

---

# 6. Explicitly Deferred Decisions

These are intentionally unresolved and should not be reopened as though they were forgotten.

## DF-001 — Final authentication UX

**Status:** DEFERRED

Backend authentication provider is Supabase Auth.

Customer-facing sign-in method will be selected before onboarding implementation is finalized.

---

## DF-002 — Final recognition model

**Status:** DEFERRED

Requires R1/R2 benchmark evidence.

---

## DF-003 — Final inference runtime

**Status:** DEFERRED

Requires Android benchmarking.

---

## DF-004 — Final camera provider for advanced recognition

**Status:** DEFERRED

Expo Camera is an initial candidate.

Another provider may be selected if frame-processing benchmarks justify it.

---

## DF-005 — ORM

**Status:** DEFERRED

Architecture currently prefers explicit SQLite repository/migration layer.

Drizzle may be proposed before schema implementation if the active AI coding agent shows clear benefit and current stability.

---

## DF-006 — Managed sync engine

**Status:** DEFERRED

PowerSync or alternative may be evaluated if custom sync spike fails.

---

## DF-007 — Analytics/crash provider

**Status:** DEFERRED

Internal interfaces first.

Select vendor before external beta if needed.

---

## DF-008 — Subscription/pricing model

**Status:** DEFERRED

Requires product-market validation.

---

## DF-009 — Final market-price confidence algorithm

**Status:** DEFERRED

Requires actual observation data.

---

## DF-010 — Fractional quantity and conversion representation

**Status:** RESOLVED BY D-034

M1's package-conversion utility was explicitly provisional and discrete-only.
D-034 resolves the M2 gate with fixed-scale micro-units, exact integer
arithmetic, canonical decimal-string boundaries, and explicit precision/range
rejection. M2 must replace or extend the provisional utility before persisting
fractional PackageUnit definitions.

---

# 7. Explicitly Rejected Directions

## R-001 — PWA-first MVP

**Status:** REJECTED

Reason:

Native Android better matches initial offline/camera/ML workflow.

---

## R-002 — Universal visual recognition as launch prerequisite

**Status:** REJECTED

Reason:

High technical risk and unnecessary to validate core retailer value.

---

## R-003 — Cloud-first sales

**Status:** REJECTED

Reason:

Unreliable connectivity cannot be allowed to block transactions.

---

## R-004 — Full inventory setup before first sale

**Status:** REJECTED

Reason:

Creates onboarding friction and contradicts progressive value.

---

## R-005 — Last-write-wins for completed sales

**Status:** REJECTED

Reason:

Would destroy historical transaction truth.

---

## R-006 — One mutable stock number without inventory history

**Status:** REJECTED

Reason:

Does not provide auditability or reliable reconciliation.

---

## R-007 — Global catalogue searched for every offline visual scan

**Status:** REJECTED

Reason:

Unnecessary latency/storage and higher false-match risk.

---

# 8. Decision Change Template

Use this structure for future entries:

```text
## D-XXX — Decision title

Status:
Date:
Supersedes:
Superseded by:

### Decision
...

### Context
...

### Rationale
...

### Consequences
...

### Alternatives considered
...

### Revisit if
...
```

---

# 9. Current Decision Review

As of 2026-09-18:

- no active decision is known to conflict with the current Product Inception, PRD, Domain Model, Technical Architecture, Offline Sync or Scanning Architecture;
- M0–M4 source/automated scope is accepted after independent audit, with physical
  and release readiness carried; M5 planning now incorporates D-039/D-040 and
  has not been implemented or delegated;
- D-038 fixes engineering precision/coverage/rounding for M4; it does not finalize
  D-027 as accounting policy;
- D-039/D-040 approve pilot batch/FEFO, blind-check and adjustment behavior;
  implementation readiness depends on the coordinator's M5 plan/tickets/design,
  not on reopening completed M4 or treating the new documents as executed tests;
- provisional decisions requiring the strongest later validation are:
  - custom sync vs managed sync;
  - moving weighted-average costing;
  - visual embedding-retrieval approach.

---

# 10. Update Rule

Update this file when:

- a durable architecture decision is made;
- an approved decision changes;
- a major dependency is added/removed;
- a deferred choice becomes finalized;
- implementation evidence invalidates an existing assumption.

Do not rewrite historical entries to make old reasoning disappear.

Preserve the decision trail.
