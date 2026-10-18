# M9 integration tickets

Complete the previously open M9-04 software integration gate on the current
accepted M7/M8 baseline. Founder delegated granularity/dependencies to the
coordinator; these two sequential slices preserve existing root M8 tickets.

## M9-I1 — See personal cost changes in the current app

Status:software source independently accepted after C1 verification; physical/live gates pending.
Delivers: the owner can use Product detail, Personal price changes and Home
while current scanner, photo, discount and retail behavior is preserved.

- [x] Integrate the reviewed exact/store-private read model and UI into current
  screens without importing stale screen/manifests, enabling shared contribution,
  creating business writes or changing migrations. Current scan/photo/basket/
  discount paths remain covered and unchanged.
- [x] Owner/store and direct-ID negative tests, exact/package/base-unit/zero/
  invalid cases, history snapshots, Home three-row limit and route/focus behavior
  pass against current real SQLite and component/navigation seams.
- [x] Focused checks, typecheck and zero-warning lint pass; record actual results
  and prove protected source content, including existing untracked lab files,
  was preserved. Failures remain visible.

## M9-I2 — Keep price history correct after synchronization and restart

Status:software source independently accepted after C1 verification. Physical/live gates pending. M9-I1 accepted. Delivers: pulled and local purchase records produce
one stable personal comparison per product without replay duplicates.

- [x] Current M7 pull/materialization over real SQLite with distinct device
  identities covers remote observations, pending local purchases, replay,
  acknowledgement echo and restart. Compare exact facts/history count/signals;
  reads add no outbox or financial/inventory effects. Forbidden owner/store
  reads remain denied after pull and membership changes.
- [x] Full documented validation, Doctor, dependency compatibility and Android
  export are run with exact exit/results/skips; preserve schema, current SDK,
  scanner/photo/recognition contracts and source hashes. Phone/live/backend/
  quality gates are pending where not exercised, never implied by source tests.
- [x] Update only this task's evidence and deliver a stopped handoff to the
  main coordinator for independent audit. M10/M11 remain unstarted and no
  external effect, build spending, model/runtime choice or Git history change
  is performed.

M9-I1 self-check evidence: exact domain 7/7; current client/UI/routes 64/64 in 7 suites; detail rerender follow-up 10/10. All four workspace typechecks and zero-warning lint exit 0. Interim baseline hash comparison changed only allowed files; 116 existing untracked recognition-lab files preserved. Full evidence follows in M9_INTEGRATION_HANDOFF.md. React VirtualizedList act timing diagnostics remain recorded. These checks do not grant independent acceptance.

M9-I2 self-check evidence: current real SQLite integration 2/2; current M7/M8 compatibility 51/51 in 6 suites; Sell/stub/draft 32/32 in 2 suites. Full validate exit 0: 1183 passed tests; 17 skipped; all four workspace typechecks and zero-warning lint passed. Doctor 21/21 exit 0; dependency check exit 0 with existing Expo exclusion; Android export exit 0, 1,627 modules/5.3 MB Hermes. Protected baseline comparison: 519/519 unchanged, including 116 existing non-ignored untracked lab files. Stopped handoff: M9_INTEGRATION_HANDOFF.md. All acceptance gates remain coordinator-owned; physical/live/accessibility/release checks pending.

October3 main-coordinator review initially accepted the selected paths, then
withheld both software-slice acceptances after account-status diagnostic C1:
68 fresh tests/ten suites pass;519 protected hashes unchanged; actual diff and
current SQLite pull/pending-local/echo/replay/restart/privacy paths reviewed.
M9_INTEGRATION_AUDIT.md records scope and residual risk. Physical/live/skipped
checks are not passed by this source decision.

- [x] C1 ACTIVE user authorization at construction/every read; actual
 INACTIVE/SUSPENDED user with ACTIVE membership denied after pull/restart.
 See M9_INTEGRATION_CORRECTIONS.md; two independent failing probes reproduced.

C1 correction self-check return: central M9 guard now joins the present ACTIVE
user with the existing ACTIVE OWNER membership and store checks. Permanent
real-price tests reproduced4 failures before the fix and now pass within30
focused tests/five suites (zero skips). Direct INACTIVE/SUSPENDED account states
with ACTIVE membership deny all four reads and fresh construction/context.
M7 permits ACTIVE/SUSPENDED reference users; accepted SUSPENDED materialization
and both persisted SQLite account states deny after restart without widening
the DTO. Final all-workspace types/zero-warning lint exit0;546 fresh protected
hashes match. See current C1 handoff for the resolved test-fixture typecheck
failure and separate pre-existing sibling guard observations. This checkbox
records implementation/self-check completion, not coordinator acceptance.
At the stopped writer return, M9 acceptance awaited coordinator verification.
That checkpoint is superseded by the final coordinator acceptance below;
physical/live/native/accessibility/release gates remain pending.

Final main-coordinator C1 acceptance:16 fresh tests/three suites/22.142s,
zero skips and546 rehashed protected files unchanged. No source edit by
coordinator. Prior full/Doctor/export results remain historical.
