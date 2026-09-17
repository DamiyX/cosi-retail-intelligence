# PROJECT_STATE — COSI

Last updated: 2026-09-17  
Current milestone: M3 Sales — M3-01 through M3-05 source implementation and
automated validation are complete; independent audit is required before M4.  
Completed engineering milestones: M0 Project Foundation; M1 Domain + Local
Database (accepted with an explicit device waiver); M2 Catalogue + Package Units
(accepted after independent audit); M3 implementation (audit pending).

## Active checkout

- Canonical remote: https://github.com/DamiyX/cosi-retail-intelligence
- Current local branch: `feat/m3-sales`, based on `9476297`.
- Local checkout: `C:\Users\doyew\Documents\DEV 2\COSI-m0`
- M0 pull request #1 remains open and `main` remains at `a393498`; the milestone
  branches are currently stacked. Rebase or retarget only after the earlier pull
  request is accepted.
- No push, merge, deployment, production-service change, device action, or cloud
  build was performed in this M3 implementation pass.

## M3 implementation outcome

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

### Migration correction note

Migration 3 had not been committed, shipped, or persisted by an accepted M3
build. The implementation therefore corrected its pending definition directly
(rather than appending a fictitious migration 4): single-tender, immutable
history, exact snapshot, and outbox invariants now apply on first M3 install.
The populated-M2 upgrade test confirms M1/M2 rows and migration history survive
the v2-to-v3 upgrade without a reset, loss, or false sales history. Once version
3 reaches any persisted build, future changes must be append-only.

## Verified validation evidence

- Clean dependency installation completed with `npm ci` (development dependencies
  included for workspace validation).
- `npm run validate`: passed — 143 domain tests in 4 suites and 169 mobile tests
  in 21 suites (312 tests / 25 suites total); strict typecheck and zero-warning
  lint both passed.
- `npm run mobile:doctor`: 21/21 checks passed.
- `npx expo install --check` from `apps/mobile`: dependencies are up to date;
  `expo` is intentionally excluded by the project configuration.
- `npm run mobile:export`: Android export succeeded (1,341 modules; 3 MB Hermes
  bundle). Generated `apps/mobile/dist` is ignored and is not part of the diff.
- Migration, rollback-at-every-write-boundary, replay/actor isolation, store
  isolation, historical snapshot, inventory, credit, stored-sync-status, tab,
  Android Back, Cancel, and Quick Add coverage passed.
- `git diff --check` passed after the final documentation update. Generated
  `apps/mobile/dist` remains ignored and is not part of the implementation
  commit.

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
- The development build `1110cf51-6cfb-4b11-99af-c63e356bf9e4` completed in EAS,
  but its local transfer was corrupted after an interrupted download and Android
  rejected it before installation. The development-client/Metro check remains
  open.
- Second-laptop clean reproduction remains deferred and is also required before
  external beta. `npm audit` remains at the M0 baseline; M3 introduced no known
  increase.

## Next action

Hand `feat/m3-sales` to an independent auditor for review of M3-01 through
M3-05. Stop before M4 (Restocking + Costing); do not push, merge, deploy, or make
the M3 device gate pass without the applicable authorization.

## Continuity

Read `AGENTS.md`, `.agents/contexts/project-context.md`,
`.agents/workflows/index.json`, `.agents/workflows/m3-sales.json`, `tickets.md`,
`docs/engineering/M3_SALES_PLAN.md`, `docs/design/DESIGN.md`, the M3 section of
`BUILD_PLAN.md`, D-013/D-034/D-036/D-037, and `MULTI_AGENT_WORKFLOW.md`. Inspect
Git status, history, and diff before edits. Repository documents and Git history
are the project memory.
