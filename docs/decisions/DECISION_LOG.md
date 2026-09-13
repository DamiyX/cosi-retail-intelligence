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

As of 2026-09-13:

- no active decision is known to conflict with the current Product Inception, PRD, Domain Model, Technical Architecture, Offline Sync or Scanning Architecture;
- no code exists yet that requires migration from an older implementation;
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
