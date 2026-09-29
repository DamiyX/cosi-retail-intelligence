# PROJECT_STATE — COSI

Last updated: 2026-09-29  
Current milestone: M8 approved (D-046); assigning a separate Astra low implementation chat.

## Active work

- Checkout: `C:\Users\doyew\Documents\DEV 2\COSI-m8-planning`.
- Branch: `plan/m8-unified-scanner`, fast-forwarded from its unused M7-planning
  baseline to accepted M7 commit `c817edb`; no history rewritten or new clone.
- Coordinator: `01a098ef-d830-7531-bca7-2d66b0a5b587`.
- Read `M8_SCANNER_PLAN.md`, active `tickets.md`, proposed M8 section of
  `docs/design/DESIGN.md`, and `.agents/workflows/m8-unified-scanner.json`.
- Five proposed tickets cover known barcode -> sale, global Scan/navigation,
  unknown code creation/association, identifier sync safety and Android evidence.
  Ticket sizing is coordinator-reviewed under founder delegation; implementation
  and the new native/contract/design boundaries are approved 2026-09-29.
  Implementer: gpt-6-astra, low effort; its chat ID will be recorded in workflow.

Founder scanner clarification is preserved as PC-08 in PRODUCT_CHANGE_BACKLOG.
The proposal now includes single-item/basket modes, safe continuous exact-code
addition, unknown-item pause/resume, optional beep/torch, zero-stock identity and
temporary-product completion later. Guided visual enrollment/OCR remain Track B
and M12. The first draft's confirm-every-item flow is superseded; no runtime
implementation or camera evidence is claimed.

Planning checks passed: workflow/index JSON schemas, acyclic gate dependencies,
artifact paths, five pending tickets, exact M7 archive content and
`git diff --check`. All changes are documentation/workflow files; no runtime
checks are claimed. Planning changes are uncommitted on the branch above.

## Accepted baseline and evidence limits

M0–M7 local source/automated scope is independently accepted. M7 evidence and
limitations remain in `M7_INDEPENDENT_AUDIT.md`, archived
`tickets/M7_OFFLINE_SYNC.md` and `.agents/workflows/m7-offline-sync.json`.
Prior coordinator evidence includes 515 tests/57 suites, strict typecheck,
zero-warning lint, live local Auth/Edge/PostgreSQL checks and 92 pgTAP assertions.
Those are baseline results, not reruns or M8 evidence.

Physical M3–M7 workflows, two-phone verification, the reported Galaxy A15 app-
opening failure, remote GitHub CI and second-laptop reproduction remain release
readiness gates. A previous A15 development-build restock survived restart and
synced; it did not prove physical sale or two-phone convergence. M8 planning
neither clears these gates nor requires another phone to begin.

## M8 findings and boundaries

Existing identifier rows, catalogue commands and sale domain can support the
barcode slice. The proposal handles typed Quick Add, package confirmation,
UPC/EAN representation differences, QR exactness, permission/camera failure and
cart-safe navigation. Source inspection found no server barcode-value claim
check corresponding to the SQLite uniqueness rule; M8-04 must reproduce and
correct that bounded sync risk before scanner-created associations are accepted.
No runtime bug reproduction, dependency install, native build or database
mutation was performed in planning. New runtime checks remain pending.

The M7 implementation checkout `COSI-m0` remains on `feat/m7-offline-sync`.
Its generated root `app.json` was not copied into this clean M8 worktree.
M9 work remains isolated on `plan/m9-price-intelligence` in `COSI-m9-planning`;
final accepted-M7 reconciliation, pull/echo integration and M9-04 audit remain
separate. M9 completion is not a prerequisite for M8 planning. Coordinate any
shared catalogue/sync changes before integration.

## Next action

Assigned Astra low implementer executes M8-01 through M8-05 sequentially in this
checkout. It records its chat ID in the workflow, writes M8_IMPLEMENTATION_HANDOFF.md,
stops all edits, then sends the coordinator a final notification. Coordinator
ends its dispatch turn and performs no implementation/audit in parallel. After
handoff, coordinator independently audits and returns corrections to the same
chat. Medium coordinator effort is a user-controlled setting. M9/M10 and visual
model selection remain outside this assignment. No push/deployment is authorized.
