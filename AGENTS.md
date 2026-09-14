# AGENTS.md — Retail Commerce Intelligence

## Purpose

This file is the canonical operating guide for any AI coding agent or human engineer working in this repository, including Codex, Gemini, OpenCode, Antigravity, and future compatible tools.

The repository documentation is the project memory.

Do not rely on old chat history when the repository contains a current source-of-truth document.

---

## Project Identity

**Codename:** COSI  
**Expanded:** Commerce Operating System Intelligence  
**Status:** Temporary internal working name; final brand TBD.

Use COSI at project/repository level only. Do not create names such as `CosiProduct`, `cosi_sales`, or `/cosi/*` merely for branding. Prefer domain-neutral technical names so a future brand change does not require a large refactor.

---

## 1. Read This First

Before meaningful work:

1. Read `docs/engineering/PROJECT_STATE.md`.
2. Read `.agents/workflows/index.json` and the unarchived task record, when one
   exists.
3. Read `.agents/contexts/project-context.md`.
4. Read `tickets.md` when it exists for the active milestone.
5. Read the relevant milestone in `docs/engineering/BUILD_PLAN.md`.
6. If continuing work started by another AI/model or another laptop, read
   `docs/engineering/MULTI_AGENT_WORKFLOW.md` and inspect Git state before
   changing code.
7. Read only the product/architecture documents needed for the task.
8. Inspect the current code before proposing changes.
9. Check `docs/decisions/DECISION_LOG.md` before reopening an established
   decision.

For a first-time project intake, read the full source-of-truth set.

---

## 2. Source-of-Truth Documents

### Product

- `docs/product/PRODUCT_INCEPTION.md`
- `docs/product/PRD_MVP.md`

### Architecture

- `docs/architecture/DOMAIN_DATA_MODEL.md`
- `docs/architecture/TECHNICAL_ARCHITECTURE.md`
- `docs/architecture/OFFLINE_SYNC.md`

### Recognition

- `docs/recognition/SCANNING_ARCHITECTURE.md`
- `docs/recognition/RECOGNITION_TEST_PLAN.md`

### Engineering

- `docs/engineering/BUILD_PLAN.md`
- `docs/engineering/PROJECT_STATE.md`
- `docs/engineering/MULTI_AGENT_WORKFLOW.md`
- `docs/engineering/IMPLEMENTATION_AUDIT_WORKFLOW.md`
- `docs/engineering/TICKETING.md`

### Decisions

- `docs/decisions/DECISION_LOG.md`

### Continuity Context

- `.agents/contexts/project-context.md`
- `.agents/contexts/stack-context.md`
- `.agents/contexts/app-flow.md`
- `.agents/workflows/index.json`
- `docs/design/README.md`
- `tickets.md`, while it represents the active milestone

Context files summarize and route work. They do not override the approved
product, architecture, engineering, or decision documents above.

---

## 3. Conflict Priority

If documents appear to conflict, use this order:

1. later approved decision in `DECISION_LOG.md`;
2. current architecture/domain documents;
3. PRD;
4. Product Inception;
5. continuity context under `.agents/`;
6. old chat history.

Do not silently choose between conflicting requirements.

Flag the conflict and correct any stale context summary.

---

## 4. Current Product

The project is an:

> Android-first, offline-first retail intelligence product that helps retailers understand their business, track changing restock costs, progressively digitize operations through normal daily activity, and create the foundation for a market-price intelligence network and local product-recognition system.

Current strategy:

> **Lead with price. Deliver with control. Build the network through normal business activity.**

---

## 5. Current Core Stack

Unless a later approved decision supersedes these:

- React Native
- Expo Development Build
- TypeScript
- Expo Router
- Expo SQLite
- Supabase PostgreSQL
- Supabase Auth
- Supabase Storage
- Supabase Edge Functions
- npm workspaces
- Android-first
- local-write-first / offline-first

Do not replace major stack choices without explicit architecture review.

---

## 6. Non-Negotiable Product/Architecture Rules

### Offline

Core sales, purchases/restocking, inventory adjustments, expenses and withdrawals must work without internet.

### Transactions

A locally completed business transaction must survive app restart before cloud synchronization.

### Atomicity

Related sale/purchase/inventory writes must commit atomically.

### Sync

Retries must not duplicate business transactions.

Do not use device time as the sole global ordering mechanism.

### Inventory

Inventory changes use explicit inventory events.

Do not silently rewrite stock history.

### Package units

Products may have package levels with conversion to a base inventory unit.

Historical transactions must preserve package-conversion snapshots.

### Product identity

Shared/platform product identity must remain separate from store-specific:

- price;
- cost;
- stock;
- supplier;
- reorder settings.

### Recognition

Recognition must support:

- `STRONG`;
- `AMBIGUOUS`;
- `UNKNOWN`.

Recognition failure must never block checkout.

### Financial reporting

Do not label incomplete tracked metrics as full profit/P&L.

---

## 7. Work Style

For each meaningful milestone:

1. inspect;
2. plan;
3. identify risks/conflicts;
4. implement;
5. test;
6. update project state.

Do not jump from task description directly into broad implementation without inspecting the existing repository.

---

## 8. Planning Before Coding

Before a new major milestone, produce a concise plan containing:

- understanding of the requested outcome;
- files/modules likely to change;
- migrations/schema changes;
- tests required;
- risks;
- architecture conflicts;
- genuinely blocking questions.

Then draft the active milestone's vertical tickets and dependency edges. Ask the
founder to verify their granularity and dependencies before publishing
`tickets.md` or external tracker items. Follow
`docs/engineering/TICKETING.md`; do not pre-write detailed tickets for every
future milestone. The founder may explicitly delegate this technical judgment to
the planning agent.

An implementation agent may complete all published tickets inside one milestone.
It must then stop for the independent audit defined in
`docs/engineering/IMPLEMENTATION_AUDIT_WORKFLOW.md` before starting the next
milestone.

Before substantial product UI work, read `.agents/contexts/app-flow.md` and run
the design gate in `docs/design/README.md`. Do not infer final navigation or a
design system from the M0 placeholder screens.

Do not ask questions that can be answered from the repository.

Do not repeat questions already answered in source-of-truth documents.

---

## 9. What You May Decide Without Escalation

You may independently choose ordinary implementation details such as:

- function names;
- component decomposition;
- test organization;
- small refactors;
- internal helper structure;
- SQL indexes justified by queries;
- minor dependency upgrades that do not change architecture.

Prefer the simplest maintainable implementation.

---

## 10. What Requires Explicit Review Before Changing

Stop and explain before changing:

- mobile framework;
- backend provider;
- local database;
- sync strategy;
- transaction semantics;
- product/package model;
- inventory ledger rules;
- costing policy;
- security boundary;
- repository topology;
- RecognitionService contract;
- recognition architecture;
- major native dependencies;
- store/private vs shared-data ownership.

If approved:

1. update `DECISION_LOG.md`;
2. update affected architecture docs;
3. implement.

---

## 11. Scope Discipline

Keep changes limited to the active milestone.

Do not:

- build future features opportunistically;
- refactor unrelated subsystems without need;
- introduce abstractions only because they may be useful someday;
- turn a bug fix into an architecture rewrite;
- create a second source of truth for business data.

New ideas outside the milestone should be recorded for later rather than implemented automatically.

---

## 12. Database Rules

- All schema changes use migrations.
- Never solve migration problems by casually deleting real user data.
- Use parameterized SQL.
- Preserve foreign-key/domain integrity.
- Keep business logic out of UI components.
- SQLite is the durable local business-data store.
- Derived projections must be reconstructable where architecture says so.

---

## 13. Money and Quantities

Do not use uncontrolled JavaScript floating-point arithmetic for authoritative financial calculations.

Use the project money/domain utilities.

Package conversion and costing logic must be centralized and tested.

Do not duplicate these calculations across screens.

---

## 14. Sync Rules

Follow `OFFLINE_SYNC.md`.

In particular:

- write business data + outbox atomically;
- use globally unique client-created IDs;
- use unique operation IDs;
- make server application idempotent;
- do not delete outbox work before acknowledgement;
- append/deduplicate completed transactions;
- use explicit version conflicts for mutable records;
- preserve real concurrent offline sales;
- do not let media uploads block transaction sync.

No feature may invent its own independent sync protocol.

---

## 15. Recognition Rules

Follow `SCANNING_ARCHITECTURE.md` and `RECOGNITION_TEST_PLAN.md`.

Do not:

- build a universal classifier first;
- remove `UNKNOWN`;
- force internet for locally known products;
- bind main business logic directly to one ML runtime;
- choose a model without benchmark evidence;
- treat retailer-contributed recognition data as automatic platform truth;
- make visual recognition a prerequisite for the core MVP.

Recognition R&D belongs in the dedicated track/lab.

---

## 16. Testing Expectations

Run the tests appropriate to the change.

At minimum consider:

- TypeScript typecheck;
- lint;
- domain unit tests;
- SQLite/repository integration tests;
- sync tests;
- React Native component tests;
- Maestro critical-flow tests;
- physical Android verification for native/offline/camera behavior.

A feature is not complete merely because it compiles.

---

## 17. Dependency Rules

Before adding a significant dependency, check:

- problem it solves;
- whether existing stack already solves it;
- maintenance status;
- current Expo/React Native compatibility;
- native-build impact;
- license;
- binary/runtime cost;
- exit/migration cost.

Native dependencies require extra scrutiny.

Do not add libraries only to reduce a few lines of straightforward code.

---

## 18. Security Rules

Never commit:

- passwords;
- service-role keys;
- private tokens;
- production secrets.

Never ship Supabase service-role credentials in the mobile app.

Use store membership as the private-data authorization boundary.

RLS/security policies are part of the implementation, not optional cleanup.

Do not log sensitive secrets or unnecessary private business data.

---

## 19. Documentation Updates

At milestone completion:

### Always update

`docs/engineering/PROJECT_STATE.md`

Keep it concise.

### Update when a durable decision changed

`docs/decisions/DECISION_LOG.md`

### Update architecture/product documents

Only when approved behavior/architecture materially changed.

Do not leave the code and source-of-truth documents knowingly inconsistent.

---

## 20. Project State Rule

`PROJECT_STATE.md` answers:

> Where are we now?

It is not a history file.

Update:

- current milestone;
- completed milestones;
- blocker status;
- active important work;
- next action;
- important recent decision references.

Historical reasoning belongs in `DECISION_LOG.md`.

---

## 21. Error / Bug Work

When debugging:

1. reproduce or gather evidence;
2. identify root cause;
3. classify the issue;
4. make the smallest safe correction;
5. add regression coverage where practical;
6. avoid unrelated refactors.

Possible classifications:

- implementation bug;
- data/schema issue;
- migration issue;
- architecture conflict;
- dependency/tooling issue;
- environment issue;
- invalid product assumption.

---

## 22. Recognition and Core-App Parallel Work

Main retail work and recognition R&D may proceed simultaneously only when they do not make conflicting changes to shared domain/schema/contracts.

Shared boundaries include:

- `ProductVariant`;
- `PackageUnit`;
- `StoreProduct`;
- recognition contracts;
- shared packages.

If both branches need to change a shared boundary:

> coordinate and sequence the change rather than independently diverging.

---

## 23. Repository Intent

Expected structure:

```text
/
├── AGENTS.md
├── .agents/
│   ├── contexts/
│   ├── schemas/
│   └── workflows/
├── apps/
│   ├── mobile/
│   └── recognition-lab/
├── packages/
│   ├── domain/
│   ├── contracts/
│   └── recognition-core/
├── supabase/
│   ├── migrations/
│   ├── functions/
│   └── tests/
├── docs/
│   ├── design/
│   ├── product/
│   ├── architecture/
│   ├── recognition/
│   ├── engineering/
│   └── decisions/
└── tools/
    └── scripts/
```

Do not create packages/folders only for architectural appearance.

Create them when responsibilities genuinely justify separation.

---

## 24. Initial Build Sequence

Follow `BUILD_PLAN.md`.

Current intended order:

```text
M0  Project Foundation
M1  Domain + Local Database
M2  Catalogue + Package Units
M3  Sales
M4  Restocking + Costing
M5  Inventory + Reconciliation
M6  Expenses + Business Summary
M7  Offline Sync
M8  Unified Scanner + Barcode
M9  Personal Price Intelligence
M10 Market Price Infrastructure
M11 Staff / Accountability
M12 Recognition Integration
M13 Beta Hardening
```

Do not reorder materially without explaining dependency benefits and updating the plan.

---

## 25. First-Session Rule

For the first engineering-agent session on this project (Codex is the initial agent):

**Do not implement feature code immediately.**

The active AI tool is replaceable. A later agent must be able to continue from Git/repository state without prior chat history.

First:

1. read all source-of-truth documents;
2. inspect repository state;
3. summarize understanding;
4. identify contradictions/gaps;
5. propose M0 scaffold;
6. identify blocking questions;
7. wait for approval.

---

## 26. Interchangeable AI Agent Rule

Branches belong to tasks, not AI models.

If one agent stops because of context, usage limits, tool availability, or a better model becomes available:

- continue on the same task branch;
- read `docs/engineering/MULTI_AGENT_WORKFLOW.md`;
- inspect `git status`, recent commits and current diff;
- do not restart the task from scratch;
- do not create a new branch merely because the model changed.

When moving to another laptop, commit and push the current task branch first.

Use separate branches/worktrees only for genuinely parallel work.

---

## 26. Completion Report

At the end of a milestone, report:

- what was implemented;
- files/migrations added;
- tests run;
- test results;
- manual checks performed;
- unresolved risks;
- documentation updated;
- workflow-state and ticket statuses updated;
- whether the milestone acceptance criteria passed;
- recommended next action.

Be explicit about anything incomplete.

---

## 28. Final Engineering Principle

Optimize for:

> **the simplest architecture that preserves offline reliability, transaction integrity, store-data privacy, product/package correctness, and the ability to learn from real retailer use.**

Do not optimize for architectural novelty.

Do not make experimental recognition or future marketplace ambitions destabilize the core retail transaction system.
