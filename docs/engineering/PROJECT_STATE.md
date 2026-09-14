# PROJECT_STATE — COSI

Last updated: 2026-09-14  
Current milestone: M2 Catalogue + Package Units — design, architecture, workflow,
and tickets ready; implementation has not started.  
Completed engineering milestones: M0 Project Foundation; M1 Domain + Local
Database accepted after independent re-audit with an explicit device waiver.

## Active checkout

- Canonical remote: https://github.com/DamiyX/cosi-retail-intelligence
- Current local branch while the accepted M1 audit changes are committed:
  `feat/m1-domain-local-database`, created from M0 baseline `a50cce9`.
- Next task branch: `feat/m2-catalogue-package-units`, created from the final
  accepted M1 commit before M2 code begins.
- Local checkout: `C:\Users\doyew\Documents\DEV 2\COSI-m0`
- M0 pull request #1 remains open and `main` remains at `a393498`; the milestone
  branches are currently stacked. Rebase or retarget only after the earlier pull
  request is accepted.
- No push, merge, deployment, or production service change was performed during
  this audit/planning pass.

## M1 audit outcome

M1 supplies the pure `@retail/domain` package, versioned expo-sqlite boundary,
transactional migrations, typed parameterized repositories, Store/User/
StoreMember/Device context, atomic store-context provisioning, Expo-backed
mobile UUID creation, and startup ready/failure states.

The initial audit corrections fixed migration-history validation, async callback
rejection, mobile UUID support, foreign-key readiness, and the unresolved
fractional-quantity gate. The independent re-audit found and fixed two remaining
edges:

- normal mobile store provisioning now defaults to the Expo crypto ID provider;
- after an invalid async transaction callback is rolled back, both adapters
  permanently invalidate that connection so scheduled work cannot escape into
  autocommitted database writes.

Evidence after the final patch: domain and mobile typecheck pass; both
zero-warning lint runs pass; 87 domain plus 43 mobile tests pass (130 total);
`expo install --check` is clean; Android export succeeds. The current shell
could run only 17 of 21 Expo Doctor checks because it has Node but no `npm`
executable for Expo Doctor's dependency-tree subprocesses. The prior correction
commit recorded Expo Doctor 21/21, and this final patch changed no dependency.

## Approved M2 baseline

- D-034: quantities and package conversions use fixed-scale micro-units with
  exact integer arithmetic and canonical decimal-string boundaries.
- D-035: a temporary product has a store-scoped provisional ProductVariant,
  active base PackageUnit, and StoreProduct; later matching preserves store data
  and history.
- `docs/design/DESIGN.md`: whole-MVP experience direction plus implementable M2
  Products navigation, flows, states, accessibility, copy, and visual baseline.
- `tickets.md`: M2-01 through M2-05, with vertical outcomes, dependencies,
  non-goals, acceptance evidence, and the stop-before-M3 audit boundary.
- `.agents/workflows/m2-catalogue-package-units.json`: active resumable state.

## Deferred evidence and risks

- The Galaxy A15 5G is unavailable. The founder explicitly waived its M1 native
  force-stop/relaunch check as an M2 entry blocker. This is not a passed check;
  it must be completed before external beta/native release readiness with a
  build containing expo-sqlite and expo-crypto.
- Second-laptop clean reproduction remains deferred and is also required before
  external beta.
- `npm audit` remains at the previously recorded M0 baseline of 21 moderate and
  1 low upstream finding; M1 introduced no known increase.
- D-034 must be implemented before M2 persists PackageUnit conversions. M1's
  integer-only package helper remains provisional until M2-01 replaces or
  extends it.

## Next action

Commit the reviewed M1 audit and M2 planning artifacts, create
`feat/m2-catalogue-package-units` from that commit, then give the implementation
agent the short handoff prompt. That agent starts with M2-01, follows `tickets.md`,
and stops after M2-05 for independent audit. Do not start M3 or push, merge, or
deploy without the applicable approval.

## Continuity

Read `AGENTS.md`, `.agents/contexts/project-context.md`,
`.agents/workflows/index.json`, the active M2 workflow, `tickets.md`,
`docs/design/DESIGN.md`, the M2 section of `BUILD_PLAN.md`, D-034/D-035, and
`MULTI_AGENT_WORKFLOW.md`. Inspect Git status, history, and diff before edits.
Repository documents and Git history are the project memory.
