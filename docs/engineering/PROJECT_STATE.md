# PROJECT_STATE — COSI

Last updated: 2026-09-18  
Current milestone: M4 Restocking + Costing — A1–A6 implementation corrections
returned for independent re-audit; source acceptance withheld. Physical/release
gates remain pending.  
Completed engineering milestones: M0 Project Foundation; M1 Domain + Local
Database (accepted with an explicit device waiver); M2 Catalogue + Package Units
(accepted after independent audit); M3 source/automated scope (accepted after
independent audit with physical/release gates carried).

## Active checkout

- Canonical remote: https://github.com/DamiyX/cosi-retail-intelligence
- Current branch: `feat/m4-restocking-costing`, from accepted M3 checkpoint
  `66cc64d`. M4 implementation is committed in `3c4eef9`, with follow-up
  commits `b12ff0c`, `c810f5b`, `87e96a6`, `9ec9075` and correction commits
  `457d9d9`, `08871db`, `cb0566e`.
- Coordinator-created M4 plan, published tickets, D-038, cost/design sources and
  workflow registration were recorded in checkpoint `db5a835`; implementation
  evidence is now recorded separately for coordinator audit.
- Separate implementation task `01a0b1a5-4512-79f0-ae55-58d39559944d` is assigned
  M4 only as Luna max. Coordinator owns planning/tickets/workflow registration
  and independent audit; implementer owns implementation and assigned fixes.
- Local checkout: `C:\Users\doyew\Documents\DEV 2\COSI-m0`
- M0 pull request #1 remains open and `main` remains at `a393498`; the milestone
  branches are currently stacked. Rebase or retarget only after the earlier pull
  request is accepted.
- No push, merge, deployment, production-service change, device action, or cloud
  build was performed in this M4 implementation pass.

## M3 source/automated outcome

The coordinating independent auditor accepted the source/automated M3 scope at
`0a5f8c8` on 2026-09-18 (task/thread
`01a098ef-d830-7531-bca7-2d66b0a5b587`). This acceptance covers the code,
automated evidence, workflow records, and repository review described below;
it does not pass the carried physical-device, development-client/Metro, or
second-laptop readiness gates.

M3 delivers one complete offline sale on the M1/M2 foundation:

- `@retail/domain` calculates sale lines and totals with D-034 micro-unit
  quantities, integer minor units, and exact rejection rather than rounding.
- Migration 3 creates `sales`, `sale_items`, `payments`, `inventory_events`,
  `customer_accounts`, and `receivables`. Sale completion atomically writes the
  Sale aggregate, its single tender, per-line negative inventory events, optional
  credit account/OPEN receivable, and one `COMPLETED_SALE_CREATED` outbox envelope.
- Store, device, active member, product/package ownership, exact snapshots,
  single-tender amount, credit receivable, and immutable-history invariants are
  enforced at the application and SQLite boundaries where enforceable.
- The Sell flow supports catalogue search, line configuration/edit/remove,
  exact multi-line totals, Cash/Transfer/POS/Card/Credit, explicit customer
  selection or creation, durable confirmation/history/detail, and stored outbox
  sync status. Credit is not represented as cash received.
- Dirty in-memory sale state is guarded through Android Back, tabs, Cancel,
  generic route removal, and the Quick Add return path. Completed-sale edit,
  delete, void, and return actions remain outside M3.
- The corrective pass adds a read-only historical inventory delta/current
  derived-balance presentation, store-scoped client reads, exact cross-row
  aggregate rejection, and recoverable product/package/customer/history/local
  context reads. See `M3_AUDIT_CORRECTIONS.md`.

### Migration correction note

Migration 3 was corrected while it was pending, before the initial M3 commit;
it is now committed in `2ff7b4f` and was not edited by the audit-correction
pass. Single-tender, immutable-history, exact-snapshot, and outbox invariants
therefore apply on first M3 install. The populated-M2 upgrade test confirms
M1/M2 rows and migration history survive the v2-to-v3 upgrade without a reset,
loss, or false sales history. Any future persisted-schema change must append a
new migration.

## M4 independent audit

Coordinator reviewed `db5a835..2bfa3ef` and independently passed `npm run validate`
(356 tests / 28 suites, strict typecheck, zero-warning lint). Additional actual
service/repository checks reproduced a fractional-quantity sale cost rejection,
a conflicting explicit-date replay, and contradictory immutable cost snapshots.
Native-stack draft prevention, focus/Quick Add recovery and truthful current-cost
labels also required correction. See `M4_AUDIT_CORRECTIONS.md` (A1–A6).
The same implementation task returned all six fixes in `457d9d9`, `08871db` and
`cb0566e`; the coordinator must independently re-audit before source acceptance.
M5 remains blocked. No physical or cloud action performed in this review.

## M4 implementation handoff

Commit `3c4eef9` adds migration 4 and the offline purchase/costing path without
editing migrations 1–3. Follow-up commit `b12ff0c` completes the multiline
Restock cart, TOTAL/UNIT basis, supplier modes and ProductDetail purchase-price
history. Commit `c810f5b` adds exact costing edge cases, full purchase/sale
rollback matrices, conflicting sale replay rejection, populated-M3 upgrade
retention, store/device/member/product/package/currency boundary coverage and
the changed-price cold-reopen cross-flow. Commit `9ec9075` adds safe-total
overflow UI coverage; `87e96a6` aligns the authorized Expo patch versions.
Correction commit `457d9d9` covers exact fractional sale-cost preservation,
snapshot invariants and explicit-date replay; `08871db` covers supported
native-stack draft removal and focus/Quick Add recovery; `cb0566e` makes cost
availability and receipt estimates merchant-readable. Migration 5 is additive
and only adds sale-cost coverage/field triggers; migrations 1–4 remain unchanged.
Independent audit owns the final source decision.

## Verified validation evidence

- Clean dependency installation completed with `npm ci` (development dependencies
  included for workspace validation).
- Corrective-pass `npm run validate`: passed — 143 domain tests in 4 suites and
  186 mobile tests in 21 suites (329 tests / 25 suites total); strict typecheck
  and zero-warning lint both passed.
- `npm run mobile:doctor`: 21/21 checks passed.
- `npx expo install --check` from `apps/mobile`: dependencies are up to date;
  `expo` is intentionally excluded by the project configuration.
- `npm run mobile:export`: Android export succeeded (1,341 modules; 3 MB Hermes
  bundle). Generated `apps/mobile/dist` is ignored and is not part of the diff.
- Corrective coverage includes every write position for new-credit, selected-
  customer, and multiline aggregates; credit replay; cross-store client-read
  denial; exact aggregate overflow; negative-stock detail label; local-read
  retry; retained cart/customer failure; Quick Add refresh recovery; and focused
  Android Back lifecycle. The focused correction suites passed 50 tests / 3
  suites before the full run.
- M3 workflow JSON Schema (including date-time formats) and gate dependencies
  passed local validation, and the independent auditor repeated that validation
  with AJV draft 2020 plus `ajv-formats`. `git diff --check 9476297 HEAD` and
  clean Git status passed at the acceptance checkpoint; generated
  `apps/mobile/dist` remains ignored.
- The independent auditor reviewed the existing Expo Doctor, dependency-check,
  and Android-export evidence rather than claiming a redundant rerun.

### M4 implementation checks

- `npm run validate`: passed — 150 domain tests in 5 suites and 214 mobile
  tests in 23 suites (364 tests / 28 suites total); strict typecheck and
  zero-warning lint passed.
- `npm run mobile:doctor`: 21/21 checks passed after the authorized patch
  updates (`expo-constants` ~57.0.19 and `expo-router` ~57.0.22).
- `npx expo install --check` from `apps/mobile`: dependencies are up to date;
  Expo itself remains intentionally excluded by project configuration.
- `npm run mobile:export`: Android export passed (1,357 modules; 3.2 MB Hermes
  bundle). Generated `apps/mobile/dist` is ignored.
- Active M4 workflow JSON Schema, date-time, gate-dependency and artifact
  validation passed. The historical M2 workflow retains its previously
  recorded `tests-and-review` schema limitation.
- `git diff --check` passed. No device,
  cloud, push, merge or release action was performed.

## Deferred evidence and risks

- The Galaxy A15 5G (`SM-A156E`, Android 16, 1080×2340) evidence below is real
  M1/M2 evidence only: EAS preview build
  `90c3fd47-e9be-49cb-bdbc-f9ab649f3c34` (COSI Preview `0.0.1`/version code 1;
  APK SHA-256 `687F787730E437DEEE1CAC4353192C2B7A44313EF2EBE92FDFC41261A4FEDA7C`)
  successfully provisioned a local store and temporary product over authorized
  USB Android Platform Tools 37.0.1; force-stop/relaunch and airplane-mode
  force-stop/relaunch retained them without database error; and the same records
  rendered at 1.3 text scale. Airplane mode and the original 1.0 scale were
  restored. No production or retailer data was used.
- No M3 physical-device session was performed by explicit scope instruction.
  The current environment reports `adb` available, but it was intentionally not
  used. M3 offline sale, history, dirty-cart, and large-text device evidence is
  therefore deferred/blocked and required before an external beta/native-release
  claim. The earlier standalone-preview evidence must not be treated as M3 proof.
- No M4 physical restock/restart/history/cost-availability/dirty-exit or
  large-text session was performed. Existing Galaxy evidence remains M1/M2 only
  and must not be treated as M4 proof.
- The development build `1110cf51-6cfb-4b11-99af-c63e356bf9e4` completed in EAS,
  but its local transfer was corrupted after an interrupted download and Android
  rejected it before installation. The development-client/Metro check remains
  open.
- Second-laptop clean reproduction remains deferred and is also required before
  external beta. `npm audit` remains at the M0 baseline; M3 introduced no known
  increase.

## Next action

Independent coordinator re-audit of the returned M4 A1–A6 source/automated
evidence is the next action. The implementation task must return structured
completion via send_message_to_thread to coordinator task
`01a098ef-d830-7531-bca7-2d66b0a5b587`, then stop; no M4 code acceptance or M5
release has occurred. Accepted M3 tickets are archived in
`docs/engineering/tickets/M3_SALES.md`. Complete the carried
M3 physical-device/offline-sale, development-client/Metro, large-text, and
second-laptop reproduction checks before any external beta or native-release
readiness claim. Do not push, merge, deploy, or alter the carried device gate
without applicable authorization.

## Continuity

Read `AGENTS.md`, `.agents/contexts/project-context.md`,
`.agents/workflows/index.json`, `.agents/workflows/m4-restocking-costing.json`,
`tickets.md`, `docs/engineering/M4_RESTOCKING_COSTING_PLAN.md`,
`docs/engineering/M3_SALES_PLAN.md`, `docs/engineering/M3_AUDIT_CORRECTIONS.md`,
`docs/design/DESIGN.md`, the M4 section of `BUILD_PLAN.md`, D-013/D-027/D-028/
D-034/D-036/D-037/D-038, and `MULTI_AGENT_WORKFLOW.md`. Inspect Git status, history, and diff
before edits. Repository documents and Git history are the project memory.
