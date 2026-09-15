# PROJECT_STATE — COSI

Last updated: 2026-09-15  
Current milestone: M3 Sales — architecture/design/tickets approved and ready
for implementation after the accepted M2 audit corrections are committed and
`feat/m3-sales` is created. No M3 feature code has started.  
Completed engineering milestones: M0 Project Foundation; M1 Domain + Local
Database (accepted with an explicit device waiver); M2-01 through M2-05.

## Active checkout

- Canonical remote: https://github.com/DamiyX/cosi-retail-intelligence
- Current local branch: `feat/m2-catalogue-package-units`, created from the
  accepted M1 baseline `dca123d`. M2 commits: `5d1de89` (M2-01), `7d58673`
  (M2-02), `dc8d8d4` (M2-03), `086a696` (M2-04), and `265ca49` (M2-05).
  Independent-audit corrections and approved M3 planning artifacts are
  currently uncommitted for review.
- Local checkout: `C:\Users\doyew\Documents\DEV 2\COSI-m0`
- M0 pull request #1 remains open and `main` remains at `a393498`; the milestone
  branches are currently stacked. Rebase or retarget only after the earlier pull
  request is accepted.
- No push, merge, deployment, or production service change was performed during
  this M2 pass.

## M2 implementation outcome

M2 delivers the offline catalogue on the M1 foundation: D-034 micro-unit
quantities replace the provisional helper; migration 2 adds variants,
packages (one active base), store products, package settings, identifiers,
and the durable outbox; atomic catalogue operations (create, identity,
identifier, package, lifecycle) each commit exactly one PENDING envelope
with operation-ID replay; the Products tab (Today/Sell/More placeholders),
list with filters, Quick Add, detail, and package flows follow DESIGN.md.

The independent audit corrected ownership constraints at the SQLite boundary,
operation replay isolation, package availability and preference persistence,
fresh-install store provisioning, preferred-price display, scroll behavior, and
dirty-form navigation. Final evidence: `npm run validate` passes with 126 domain
and 137 mobile tests (263 total, 22 suites); Expo Doctor 21/21;
`expo install --check` clean; Android export succeeds with a 2.9 MB Hermes
bundle; `git diff --check` passes. No established M2 architecture decision
changed during the audit.

## M3 readiness

The founder approved D-036 exact sale arithmetic and D-037's in-memory draft,
single-tender, explicit-credit, nullable pre-M4 cost, and immutable-sale
boundary. `docs/design/DESIGN.md` now defines the M3 Sell flow and states;
`tickets.md` publishes M3-01 through M3-05; and
`.agents/workflows/m3-sales.json` is the active resumable task record.

## Deferred evidence and risks

- Galaxy A15 5G (`SM-A156E`, Android 16, 1080×2340) evidence is recorded for
  EAS preview build `90c3fd47-e9be-49cb-bdbc-f9ab649f3c34` (COSI Preview
  `0.0.1`/version code 1; APK SHA-256
  `687F787730E437DEEE1CAC4353192C2B7A44313EF2EBE92FDFC41261A4FEDA7C`).
  With Android Platform Tools 37.0.1 over authorized USB, fresh local-store
  provisioning and temporary product creation succeeded; force-stop/relaunch
  retained the store and product; airplane-mode force-stop/relaunch retained
  them with no database error; and the same records rendered at 1.3 text scale.
  Airplane mode and the original 1.0 scale were restored. This is real native
  SQLite/catalogue evidence for M1/M2 and no production/retailer data was used.
- The matching development build `1110cf51-6cfb-4b11-99af-c63e356bf9e4`
  completed in EAS, but its local transfer was corrupted after an interrupted
  download and Android rejected it before installation. The development-client
  / Metro-specific check remains open; it does not weaken the completed
  standalone preview/restart/offline evidence and remains required before an
  external beta/native release claim.
- Second-laptop clean reproduction remains deferred and is also required before
  external beta.
- `npm audit` remains at the M0 baseline; M2 introduced no known increase.

## Next action

Commit the accepted M2 audit corrections and approved M3 planning artifacts,
create `feat/m3-sales` from that commit, then hand M3-01 through M3-05 to the
implementation agent. Stop M3 at its independent audit boundary; do not start
M4, push, merge, or deploy without the applicable authorization.

## Continuity

Read `AGENTS.md`, `.agents/contexts/project-context.md`,
`.agents/workflows/index.json`, `.agents/workflows/m3-sales.json`, `tickets.md`,
`docs/engineering/M3_SALES_PLAN.md`, `docs/design/DESIGN.md`, the M3 section of
`BUILD_PLAN.md`, D-013/D-034/D-036/D-037, and `MULTI_AGENT_WORKFLOW.md`. Inspect
Git status, history, and diff before edits.
Repository documents and Git history are the project memory.
