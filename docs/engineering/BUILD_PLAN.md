# BUILD_PLAN — Retail Commerce Intelligence

**Version:** 1.0  
**Status:** Engineering execution source of truth  
**Primary builder:** Any compatible AI coding agent (Codex initially)  
**Product/architecture owner:** Founder + architecture review  
**Build style:** Milestone-based, documentation-driven, local-first, test-gated

---

# 1. Purpose

This document defines how the MVP should be built.

It answers:

- what the active AI coding agent should do first;
- what order major systems should be implemented;
- which workstreams can run in parallel;
- when to open a new AI coding-agent session;
- what each milestone must produce;
- what must be reviewed before implementation continues;
- what “done” means for each milestone;
- how recognition R&D proceeds without blocking the core app.

The build should optimize for:

1. correctness;
2. fast feedback;
3. low founder cognitive load;
4. architectural consistency;
5. safe context management across many AI coding-agent sessions;
6. early real-world validation.

---

# 2. Build Operating Model

The repository is the long-term project memory.

AI coding-agent sessions are temporary working sessions.

Use:

```text
Repository documentation
        ↓
AI-agent planning
        ↓
Implementation
        ↓
Tests
        ↓
PROJECT_STATE update
        ↓
Next milestone
```

Do not rely on one giant continuous AI-agent conversation.

---

# 3. First Engineering-Agent Session

The first engineering-agent session is planning-only. Codex is the initial agent, but the workflow is tool-independent.

Do not ask the active agent to build features immediately.

Initial engineering-agent task:

1. Read `AGENTS.md`.
2. Read:
   - `docs/product/PRODUCT_INCEPTION.md`
   - `docs/product/PRD_MVP.md`
   - `docs/architecture/DOMAIN_DATA_MODEL.md`
   - `docs/architecture/TECHNICAL_ARCHITECTURE.md`
   - `docs/architecture/OFFLINE_SYNC.md`
   - `docs/recognition/SCANNING_ARCHITECTURE.md`
   - `docs/recognition/RECOGNITION_TEST_PLAN.md`
   - `docs/engineering/BUILD_PLAN.md`
   - `docs/engineering/PROJECT_STATE.md`
   - `docs/decisions/DECISION_LOG.md`
3. Inspect repository state.
4. Explain understanding.
5. Identify contradictions/blockers.
6. Propose repository scaffold.
7. Propose implementation details for M0.
8. Ask only blocking questions.
9. Wait for approval.

Do not write feature code in this first session.

---

# 4. Chat Strategy

Use one coherent engineering-agent session for one milestone, but another compatible agent may continue the same milestone/branch if the current agent stops.

Suggested chat sequence:

```text
Chat 1 — Project intake + scaffold planning
Chat 2 — M0 project foundation
Chat 3 — M1 domain/database foundation
Chat 4 — M2 product/catalog/package units
Chat 5 — M3 sales
Chat 6 — M4 restocking + costing
Chat 7 — M5 inventory + reconciliation
Chat 8 — M6 expenses + business summary
Chat 9 — M7 offline sync
Chat 10 — M8 scanner/barcode integration
Chat 11 — M9 personal price intelligence
Chat 12 — M10 market price infrastructure
Chat 13 — M11 staff/accountability
Chat 14 — M12 recognition integration
Chat 15 — M13 beta hardening
```

Recognition R&D may use separate parallel AI-agent sessions when it is genuinely parallel work.

---

# 5. When to Start a New AI-Agent Session

Start a new chat when:

- moving to a new major milestone;
- current thread contains excessive debugging history;
- switching from planning to a distinct implementation domain;
- intentionally requesting independent review;
- recognition work diverges from main app work;
- the active agent repeatedly loses the current architectural goal.

Do not start a new chat for every small bug.

---

# 6. New-Chat Boot Procedure

At the beginning of every major milestone chat:

1. Read `AGENTS.md`.
2. Read `PROJECT_STATE.md`.
3. Read `.agents/workflows/index.json` and the active task record.
4. Read `.agents/contexts/project-context.md`.
5. Read the current milestone in `BUILD_PLAN.md`.
6. Read only the architecture/product documents relevant to that milestone.
7. Inspect existing code before proposing changes.
8. Produce a concise implementation plan and proposed ticket dependency map.
9. Identify conflicts/questions.
10. Wait for approval if changes are architectural.

This prevents unnecessary context loading.

---

# 6A. Context, Design, and Ticket Gates

`BUILD_PLAN.md` defines the complete M0–M13 roadmap. Detailed tickets are
created one milestone at a time so they reflect the code, evidence, and
decisions that actually exist when that milestone starts.

Before publishing an active milestone's `tickets.md`:

1. draft vertical, independently verifiable tickets;
2. identify acceptance criteria and blocking dependencies;
3. ask the founder to verify ticket granularity and dependency edges;
4. publish only after that verification.

Follow `docs/engineering/TICKETING.md`. Do not create speculative detailed
tickets for all remaining milestones.

The implementation agent may finish every published ticket in the active
milestone without waiting between tickets. It must stop at milestone completion
for the independent review in
`docs/engineering/IMPLEMENTATION_AUDIT_WORKFLOW.md`. The next milestone's tickets
are created only after that audit, using the implementation and evidence that
now exist.

Before the first substantial product UI work, review
`.agents/contexts/app-flow.md` with the founder and complete the design gate in
`docs/design/README.md`. Under the current sequence this must happen before M2
Catalogue + Package Units UI, or earlier if M1 introduces material user-facing
screens. Create `docs/design/DESIGN.md` after the flow and direction are
approved. Create `DESIGN.json` only when an actual machine consumer exists.

Every resumable milestone task must have
`.agents/workflows/<task-id>.json` registered in
`.agents/workflows/index.json`. The record states the current gate, evidence,
blockers, and exact next action; it does not replace `PROJECT_STATE.md` or the
decision log.

---

# 6B. Interchangeable AI Continuation

The AI model/tool may change at any point.

A change from Codex to Gemini, OpenCode, Antigravity, or another capable agent does **not** require a new branch.

The branch belongs to the milestone/task.

When a new agent continues existing work it must:

1. read `AGENTS.md`;
2. read `PROJECT_STATE.md`;
3. read `MULTI_AGENT_WORKFLOW.md`;
4. inspect current branch;
5. inspect `git status`;
6. inspect recent commits;
7. inspect uncommitted diff;
8. inspect relevant tests;
9. summarize what is complete and what remains;
10. continue rather than restart.

When switching laptops, commit and push before moving, then pull/checkout the same branch on the other laptop.

Separate branches/worktrees are for genuinely parallel work, not for different AI brands.

---

# 7. Milestone Completion Procedure

At the end of every milestone:

1. Run relevant tests.
2. Run typecheck/lint.
3. Verify acceptance criteria.
4. Perform required manual device checks.
5. Update `PROJECT_STATE.md`.
6. Update `DECISION_LOG.md` if a durable decision changed.
7. Update the active workflow record and ticket statuses with evidence.
8. Summarize:
   - what changed;
   - what remains incomplete;
   - known risks;
   - next milestone readiness.

Do not mark a milestone complete only because code compiles.

---

# 8. Parallel Workstreams

Two coordinated tracks are allowed.

## Track A — Main Retail Application

Focus:
- product/catalog;
- sales;
- purchases;
- inventory;
- finance;
- offline sync;
- price intelligence.

## Track B — Recognition R&D

Focus:
- evaluation dataset;
- encoder benchmark;
- runtime benchmark;
- local retrieval;
- enrollment;
- confidence;
- unknown detection;
- OCR;
- camera;
- package recognition.

They converge through stable contracts.

---

# 9. Parallel-Work Rule

Parallel tasks must not simultaneously rewrite the same architectural area.

Examples:

Safe:
- main app sales work;
- recognition benchmark work.

Unsafe:
- one chat modifies `ProductVariant` schema while another modifies package recognition against the same model.

If two tasks touch the same domain model or migration:

> perform them sequentially.

---

# 10. Branching / Git Strategy

Initial recommendation:

- `main` remains stable;
- one short-lived feature/milestone branch at a time for core app;
- recognition work may use its own branch.

Example:

```text
main
├── feat/m2-catalog
└── r-and-d/recognition-r1
```

Keep branch strategy simple.

Do not create complex GitFlow.

---

# 11. Commit Strategy

Prefer small meaningful commits.

Examples:

- `feat: add package-unit conversion domain rules`
- `feat: add local sale transaction`
- `test: cover inventory event creation`
- `fix: prevent duplicate sync retry`

Do not accumulate an entire milestone into one opaque commit where avoidable.

---

# 12. Milestone Overview

```text
M0  Project Foundation
M1  Domain + Local Database Foundation
M2  Product / Catalogue / Package Units
M3  Sales
M4  Purchases / Restocking / Costing
M5  Inventory / Reconciliation
M6  Expenses / Withdrawals / Business Summary
M7  Offline Sync Foundation
M8  Unified Scanner + Barcode
M9  Personal Restock-Price Intelligence
M10 Market Price Infrastructure
M11 Staff / Accountability
M12 Recognition Integration
M13 Beta Hardening
```

Recognition Track B runs alongside M1–M11.

---

# 13. M0 — Project Foundation

## Goal

Create a stable development environment and repository skeleton.

## The active AI coding agent should create

- npm workspace root;
- Expo mobile app;
- TypeScript strict configuration;
- Expo Router;
- base lint/typecheck scripts;
- jest/jest-expo setup;
- basic folder structure;
- environment configuration;
- EAS development/preview profiles;
- Supabase project configuration files;
- initial docs folder structure;
- CI/basic validation script if appropriate.

## Must not yet build

- real sales;
- inventory;
- sync;
- visual recognition.

## Acceptance

- app runs on physical Android device;
- development build works;
- basic navigation works;
- typecheck passes;
- tests run;
- repository structure matches architecture;
- no production secrets committed.

---

# 14. M1 — Domain + Local Database Foundation

## Goal

Implement the foundations used by every later feature.

## Build

- local SQLite initialization;
- migration runner;
- schema versioning;
- core domain types;
- money utility;
- package conversion utility;
- ID generator;
- basic repository patterns;
- Store/User/StoreMember/Device core local models;
- transaction helper;
- test database utilities.

## Important decision

Do not implement every future entity just because it exists in the logical domain model.

Implement only what near-term milestones require.

## Acceptance

- database persists across app restart;
- migrations run safely;
- transaction rollback tested;
- UUID generation verified;
- money/package utilities covered by unit tests.

---

# 15. M2 — Product / Catalogue / Package Units

## Goal

Allow a retailer to build the catalogue progressively.

## Build

- ProductVariant local representation;
- StoreProduct;
- PackageUnit;
- StorePackageSetting;
- ProductIdentifier/barcode mapping;
- create/edit product;
- temporary product;
- active/inactive state;
- package conversion configuration;
- product search;
- recent/frequent product support if easy.
- durable local outbox operation envelope;
- atomic catalogue mutation + outbox enqueue;

M2 captures operations durably but does not implement network push/pull,
conflict resolution, or retry workers. Those remain M7 scope.

## UX

Do not require full product details.

## Acceptance

- create product offline;
- create temporary product;
- add package units;
- package conversion works;
- product survives restart;
- successful mutable catalogue operations commit their outbox work atomically;
- failed catalogue operations leave neither partial business rows nor orphaned
  outbox entries;
- editing shared-style identity cannot overwrite store-specific price/cost fields.

---

# 16. M3 — Sales

## Goal

Complete a reliable offline sale.

## Build

- Sale;
- SaleItem;
- Payment;
- sale cart;
- quantity;
- package selection;
- flexible selling price;
- discount;
- payment method;
- completed-sale transaction;
- inventory event generation;
- cost snapshot placeholder/logic where available;
- receipt/confirmation screen if needed.

## Acceptance

With airplane mode:

1. open app;
2. select product;
3. complete sale;
4. inventory decreases;
5. sale appears in history;
6. restart app;
7. sale remains;
8. no network required.

## Critical test

Sale + inventory effect must commit atomically.

---

# 17. M4 — Purchases / Restocking / Costing

## Goal

Record restocking and generate reliable purchase-cost history.

## Build

- Purchase;
- PurchaseItem;
- supplier basic model;
- package-unit purchase;
- base-unit conversion;
- purchase cost normalization;
- weighted-average costing candidate;
- inventory increase;
- personal PriceObservation creation;
- purchase history.

## Acceptance

- record purchase offline;
- package conversion correct;
- inventory increases;
- cost state updates;
- purchase price history remains visible;
- historical purchase retains snapshot even if package definition later changes.

---

# 18. M5 — Inventory / Reconciliation

## Goal

Make recorded stock inspectable and correctable.

## Build

- inventory event history;
- inventory balance projection;
- reconciliation session;
- reconciliation line;
- discrepancy reasons;
- correction event;
- negative stock visibility;
- basic low-stock logic.

## Acceptance

- physical count can differ from recorded;
- adjustment creates explicit event;
- stock is reconstructable from events;
- no direct silent stock overwrite;
- negative inventory does not destroy real sales.

---

# 19. M6 — Expenses / Withdrawals / Business Summary

## Goal

Provide first meaningful owner visibility.

## Build

- Expense;
- OwnerWithdrawal;
- categories;
- daily summary;
- tracked sales;
- tracked COGS;
- tracked gross margin;
- expenses;
- withdrawals;
- transaction count;
- top-moving products;
- purchase-cost change highlights.

## Acceptance

Owner can answer:

> What happened in my business today?

Without misleading “full profit/P&L” claims.

---

# 20. M7 — Offline Sync Foundation

## Goal

Prove safe multi-device/cloud synchronization.

## Important

Do not attempt all sync entities at once.

Follow `OFFLINE_SYNC.md`.

## Sequence

### M7.1 Protocol skeleton

- outbox;
- protocol DTOs;
- sync status;
- sync endpoint shell;
- server store revision;
- applied-operation table.

### M7.2 Sale end-to-end

Prove:
- offline sale;
- push;
- retry;
- idempotency;
- server commit;
- pull/echo.

### M7.3 Purchase + inventory

Add purchase/inventory synchronization.

### M7.4 Mutable product data

Add versioned StoreProduct edits and conflicts.

### M7.5 Bootstrap / second device

Prove store download/recovery.

### M7.6 Remaining core entities

Expenses, withdrawals, supplier/reference data.

## Acceptance

Critical sync test suite in `OFFLINE_SYNC.md` passes.

---

# 21. M8 — Unified Scanner + Barcode

## Goal

Introduce scanner UX without waiting for advanced visual recognition.

## Build

- scanning feature shell;
- RecognitionService contract;
- camera abstraction;
- barcode detection;
- local barcode mapping;
- unknown barcode flow;
- package-unit barcode handling;
- manual/search fallback;
- feature flags.

## Acceptance

Offline:
- known barcode resolves product;
- unknown barcode does not block sale;
- scanner can be disabled without breaking product selection.

---

# 22. M9 — Personal Restock-Price Intelligence

## Goal

Deliver useful price intelligence without network effects.

## Build

- latest purchase price;
- previous price;
- percentage change;
- package basis;
- base-unit comparison where valid;
- price-history view;
- freshness/date.

## Acceptance

One retailer with no network participants can still see meaningful purchase-cost change.

---

# 23. M10 — Market Price Infrastructure

## Goal

Build the first network-price layer carefully.

## Build

- contribution consent;
- sanitized PriceObservation sync;
- market zone;
- server validation;
- basic aggregation;
- MarketPriceSignal;
- cached signal sync;
- range/typical/freshness/confidence display.

## Important

Do not fake market density.

If observations are insufficient:

> show insufficient data.

## Acceptance

Market signal displays:
- provenance/freshness;
- no competitor identity;
- no false claim of universal “current price.”

---

# 24. M11 — Staff / Accountability

## Goal

Support basic staff attribution and ownership visibility.

## Build

- StoreMember role handling;
- owner/admin/staff basics;
- transaction attribution;
- basic member management;
- authorized device relation;
- server membership checks.

## Acceptance

Owner can see who performed important store actions.

Do not build full HR.

---

# 25. M12 — Recognition Integration

## Goal

Integrate the best validated recognition implementation without destabilizing checkout.

## Prerequisites

- RecognitionService contract stable;
- R1/R2 benchmark completed;
- model/runtime candidate approved;
- UNKNOWN handling works;
- lower-end device performance acceptable.

## Build

- visual embedding adapter;
- local reference cache;
- exact similarity retrieval;
- confidence decision;
- AMBIGUOUS result list;
- UNKNOWN;
- adaptive enrollment;
- package-unit confirmation;
- local recognition sync where ready.

## Optional

- OCR reranking;
- local-feature verification;

only if benchmark evidence justifies them.

## Acceptance

Use `RECOGNITION_TEST_PLAN.md`.

---

# 26. M13 — Beta Hardening

## Goal

Prepare for real retailer pilots.

## Build/fix

- crash recovery;
- migration tests;
- security/RLS tests;
- sync diagnostics;
- loading/error states;
- backup/restore flow;
- analytics events;
- beta feature flags;
- app update flow;
- performance profiling;
- offline edge cases;
- accessibility/basic usability polish.

## Required real-device checks

- lower/mid-range Android;
- airplane mode;
- intermittent network;
- app force-close;
- restart;
- low storage where practical;
- camera permission denial;
- sync failure.

---

# 27. Recognition Track B Milestones

Track B begins around M1/M2 and runs independently.

```text
R0 Recognition Lab Foundation
R1 Evaluation Dataset
R2 Encoder Benchmark
R3 Android Runtime Benchmark
R4 Local Retrieval + Unknown
R5 Enrollment
R6 OCR / Verification Experiments
R7 Same-Store Recognition Sync
R8 Production Integration Candidate
```

---

# 28. R0 — Recognition Lab Foundation

Create:

- `apps/recognition-lab`;
- shared RecognitionService contracts;
- benchmark runner;
- model/runtime adapter interface;
- result logging.

No production checkout integration yet.

---

# 29. R1 — Evaluation Dataset

Create the first 30–50 product difficult set.

Document:

- reference images;
- query images;
- known/unknown set;
- package-unit examples;
- device metadata.

Do not commit private/large data blindly to Git.

---

# 30. R2 — Encoder Benchmark

Compare multiple candidate encoders.

Reject candidates for:

- poor SKU discrimination;
- unacceptable licensing;
- excessive size;
- impractical runtime support.

Produce:

> `R1_MODEL_COMPARISON.md`

---

# 31. R3 — Android Runtime Benchmark

Take strongest candidates to real Android.

Measure:

- inference;
- memory;
- model size;
- thermal;
- stability.

Produce:

> `R2_DEVICE_BENCHMARK.md`

---

# 32. R4 — Local Retrieval + Unknown

Build:

- image → embedding;
- local exact similarity;
- ranked candidates;
- STRONG / AMBIGUOUS / UNKNOWN.

Calibrate using dataset.

---

# 33. R5 — Enrollment

Build adaptive enrollment.

Measure friction.

Do not assume fixed image count.

---

# 34. R6 — OCR / Verification Experiments

Only after baseline visual retrieval exists.

Test whether OCR/local features materially improve difficult SKU pairs.

Reject if cost > benefit.

---

# 35. R7 — Same-Store Recognition Sync

Prove:

Device A enrolls product.

Device B later recognizes it without independent enrollment.

---

# 36. R8 — Production Candidate

Only after metrics pass agreed gates.

Then integrate behind feature flag in M12.

---

# 37. Build Order Dependencies

```text
M0
 ↓
M1
 ↓
M2
 ↓
M3
 ├──→ M4 → M5 → M6
 │
 └────────→ M7
              ↓
             M8
              ↓
             M9
              ↓
             M10
              ↓
             M11
              ↓
             M12
              ↓
             M13
```

Track B can run from M1 onward.

---

# 38. Why Sales Comes Before Full Sync

We must first prove:

> the local business transaction model is correct.

If sales/purchases/inventory logic is unstable, sync only multiplies the instability.

Therefore:

1. local transaction correctness;
2. then synchronization.

---

# 39. Why Barcode Comes Before Visual Recognition

Barcode provides:

- immediate product-identification value;
- lower technical risk;
- scanner UX validation;
- RecognitionService integration path.

It lets us validate the scanner shell while visual recognition remains experimental.

---

# 40. Why Personal Price Intelligence Comes Before Market Price Network

Personal restock history:

- requires no network density;
- works offline;
- is already useful;
- validates whether price-change information affects decisions.

Only then should the market network add complexity.

---

# 41. Founder Review Gates

Founder review is required before:

- M0 scaffold implementation;
- major architecture change;
- final local database schema before M3;
- sync protocol implementation;
- production recognition model selection;
- beta release.

Minor implementation choices do not require founder approval.

---

# 42. Architecture Review Gates

Bring major AI-agent proposals back for architecture review if they change:

- backend provider;
- local database;
- sync model;
- transaction semantics;
- product/package relationships;
- costing model;
- security boundary;
- recognition contract;
- repository structure;
- major native dependency.

Do not escalate ordinary coding choices.

---

# 43. AI Coding-Agent Planning Prompt Pattern

Before each milestone:

```text
Read AGENTS.md and PROJECT_STATE.md.

Read the current milestone in BUILD_PLAN.md and the relevant
architecture/product documents.

Inspect the current repository before proposing changes.

Do not implement yet.

Produce:
1. your understanding of the milestone;
2. implementation plan;
3. files/modules you expect to change;
4. migrations/schema changes;
5. tests required;
6. risks/conflicts/questions.

Do not re-architect unrelated systems.

If this milestone requires changing an established architecture
decision, explain that before implementation.
```

---

# 44. AI Coding-Agent Implementation Prompt Pattern

After plan approval:

```text
Implement the approved milestone plan.

Follow AGENTS.md and the project source-of-truth documents.

Keep changes scoped to this milestone.

Run all relevant tests and typechecks.

Do not mark the milestone complete unless acceptance criteria pass.

At completion:
- summarize changes;
- list tests run/results;
- identify unresolved issues;
- update PROJECT_STATE.md;
- update DECISION_LOG.md only if a durable decision changed.
```

---

# 45. Debugging Prompt Pattern

For bugs:

```text
Investigate the reported behavior.

First reproduce or reason from evidence.

Do not patch blindly.

Identify root cause and explain whether the issue is:
- local implementation bug;
- architecture mismatch;
- data/migration issue;
- environment/tooling issue;
- dependency issue.

Make the smallest safe fix.

Add a regression test where practical.

Do not modify unrelated architecture.
```

---

# 46. Context Management

The active AI coding agent should not reread every document for every tiny task.

Use targeted context.

Example:

## Sales milestone

Read:
- Product Inception;
- PRD sales section;
- Domain model sales/inventory sections;
- Technical Architecture;
- current Project State.

Do not require full recognition documents.

## Recognition milestone

Read:
- Scanning Architecture;
- Recognition Test Plan;
- relevant Domain Model;
- Technical Architecture;
- Project State.

This conserves context.

---

# 47. PROJECT_STATE Usage

`PROJECT_STATE.md` is the current project handoff summary.

It should remain short.

Contains:

- current milestone;
- completed milestones;
- in-progress work;
- blockers;
- active branch;
- important recent decisions;
- known technical debt;
- next milestone;
- last validated build.

Every milestone chat starts here.

---

# 48. DECISION_LOG Usage

`DECISION_LOG.md` records only durable decisions.

Examples:

- Supabase chosen;
- Expo SQLite chosen;
- custom sync retained;
- PowerSync adopted later;
- model/runtime selected;
- weighted-average costing confirmed/changed.

Do not log trivial code choices.

---

# 49. Definition of Done — Feature

A feature is not done until:

- implementation complete;
- expected errors handled;
- unit/integration tests added where appropriate;
- TypeScript passes;
- lint passes;
- relevant E2E/manual flow tested;
- offline behavior checked when applicable;
- source-of-truth docs updated if behavior changed.

---

# 50. Definition of Done — Milestone

A milestone is complete when:

1. all milestone acceptance criteria pass;
2. no known critical bug remains;
3. architectural conflicts are resolved;
4. relevant tests pass;
5. physical Android check completed where required;
6. `PROJECT_STATE.md` updated;
7. code is committed;
8. next milestone can start without hidden unfinished dependency.

---

# 51. Build Failure Rule

If a milestone reveals a foundational architecture problem:

> stop adding features.

Do not stack work on a broken foundation.

Examples:

- package model wrong;
- transaction atomicity broken;
- sync duplicates records;
- migrations unsafe.

Fix foundational issues first.

---

# 52. Token / Context Efficiency Rule

To reduce wasted AI-agent context:

- use repository docs, not pasted history;
- send milestone-specific prompt;
- avoid resending whole Product Inception;
- open new chat for major milestone changes;
- keep `PROJECT_STATE.md` concise;
- let the active agent inspect code directly;
- use architecture docs as references rather than repeating them.

---

# 53. What the Founder Needs to Do

The founder does **not** need to understand every implementation detail.

Founder responsibilities:

- confirm product behavior;
- test important workflows;
- provide real retailer context;
- approve major product/architecture changes;
- report actual bugs/observations;
- manage whether a milestone meets user needs.

The active AI coding agent handles engineering implementation.

Architecture review translates technical trade-offs when necessary.

---

# 54. First Real-World Validation Point

Do not wait for all milestones before showing retailers.

Recommended first real workflow validation:

after:

- M2 catalogue;
- M3 sales;
- M4 restocking;
- basic M5 inventory.

Use founder/internal test stores first.

Goal:

> Is the core transaction workflow actually fast enough?

Do not wait for market-price network or visual recognition.

---

# 55. Pilot Readiness Gate

Before external controlled pilot:

Required:

- M0–M7 substantially stable;
- barcode path available or product search fast;
- local data survives restart;
- critical sync works;
- RLS/security tested;
- migrations safe;
- crash/blocking bugs addressed;
- support diagnostic screen available.

Visual recognition may still be feature-flagged/experimental.

---

# 56. Beta Feedback Loop

For each pilot cycle:

```text
Observe
 ↓
Record failure/friction
 ↓
Classify:
 product / UX / bug / architecture / training
 ↓
Prioritize
 ↓
Fix smallest important issue
 ↓
Retest
```

Do not immediately add features to solve every complaint.

---

# 57. MVP Scope Protection

If a new request appears during build, classify it:

- required for current workflow;
- bug/correctness;
- important beta improvement;
- future feature.

Future features go to backlog, not into current milestone automatically.

---

# 58. Change Control

If scope changes:

1. state why;
2. identify affected docs;
3. identify migration/architecture impact;
4. decide whether current milestone should pause;
5. update source of truth;
6. then implement.

Do not let code become the only record of product change.

---

# 59. Recommended Initial Timeline

The earlier 3-weeks-build + 1-week-test target is aggressive for this scope.

A more realistic plan is to treat it as:

## First 3–4 weeks

Target:
- M0–M6;
- local-only usable retail prototype;
- barcode shell may begin;
- Recognition R&D running separately.

## Following period

Target:
- M7 sync hardening;
- price intelligence;
- staff;
- recognition integration;
- external beta hardening.

If AI-assisted implementation progresses faster safely, advance.

Do not force architecture-critical work into an arbitrary deadline.

---

# 60. Fastest Safe MVP Variant

If schedule must be compressed severely:

Ship first with:

- one owner/store;
- product catalogue;
- package units;
- sales;
- purchases;
- inventory;
- expenses;
- personal price history;
- local-only/offline;
- export/backup or limited sync;
- barcode/manual search.

Delay:

- multi-device;
- market price network;
- visual recognition;
- staff accounts.

This is preferable to shipping unsafe sync or unreliable recognition.

---

# 61. Highest-Risk Engineering Areas

Ranked:

1. offline/multi-device synchronization;
2. transaction/accounting integrity;
3. package-unit correctness;
4. migrations with real user data;
5. recognition false-confidence;
6. permissions/security;
7. price-network data quality.

These areas deserve more testing than ordinary screens.

---

# 62. Lowest-Risk Areas

Examples:

- simple settings screens;
- static onboarding copy;
- basic category UI;
- cosmetic dashboards.

Do not spend disproportionate architecture time here.

---

# 63. AI Coding-Agent Autonomy

The active AI coding agent is encouraged to:

- inspect dependencies;
- propose simpler implementation;
- write tests;
- improve code structure;
- detect contradictions;
- challenge technically weak decisions.

The active AI coding agent must not silently change:

- product meaning;
- business invariants;
- architecture boundaries;
- security model;
- sync semantics.

---

# 64. Implementation Review Style

When the active AI coding agent proposes a plan, evaluate:

1. Does it preserve the source-of-truth rules?
2. Is it simpler?
3. Is it testable?
4. Does it add unnecessary dependency?
5. Does it improve or damage offline behavior?
6. Is it understandable by future developers?
7. Does it create migration debt?

Prefer the simplest correct implementation.

---

# 65. Final Build Sequence Summary

```text
DOCUMENTATION READY
       ↓
ENGINEERING AGENT INTAKE / PLAN
       ↓
M0 FOUNDATION
       ↓
M1 DOMAIN + SQLITE
       ↓
M2 CATALOG + PACKAGE UNITS
       ↓
M3 SALES
       ↓
M4 RESTOCKING + COSTING
       ↓
M5 INVENTORY
       ↓
M6 EXPENSES + SUMMARY
       ↓
FIRST REAL WORKFLOW TEST
       ↓
M7 OFFLINE SYNC
       ↓
M8 BARCODE / SCANNER SHELL
       ↓
M9 PERSONAL PRICE INTELLIGENCE
       ↓
M10 MARKET PRICE INFRASTRUCTURE
       ↓
M11 STAFF
       ↓
M12 VISUAL RECOGNITION INTEGRATION
       ↓
M13 BETA HARDENING
       ↓
CONTROLLED RETAILER PILOT
```

Parallel:

```text
R0 → R1 → R2 → R3 → R4 → R5 → R6 → R7 → R8
```

---

# 66. Source-of-Truth Relationship

This file is authoritative for engineering execution order and AI-agent milestone boundaries.

Read together with:

- `PRODUCT_INCEPTION.md`
- `PRD_MVP.md`
- `DOMAIN_DATA_MODEL.md`
- `TECHNICAL_ARCHITECTURE.md`
- `OFFLINE_SYNC.md`
- `SCANNING_ARCHITECTURE.md`
- `RECOGNITION_TEST_PLAN.md`
- `PROJECT_STATE.md`
- `MULTI_AGENT_WORKFLOW.md`
- `DECISION_LOG.md`
- `AGENTS.md`

If implementation evidence shows the milestone order is inefficient:

1. explain the dependency issue;
2. propose reorder;
3. update this file and `DECISION_LOG.md` if material;
4. proceed.

The plan is a controlled execution guide, not a reason to ignore better engineering evidence.
