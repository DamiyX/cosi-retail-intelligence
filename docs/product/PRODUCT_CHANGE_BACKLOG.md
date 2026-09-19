# Product Change / UX Backlog and Impact Review

**Updated:** 2026-09-19. **Owner:** coordinating product/planning/audit task.
**Status:** PC-03/PC-05/PC-06 are accepted in M5; PC-01/PC-01a and the M6 Home
promotion of PC-05 are accepted in M6. Physical release-readiness checks remain
carried. Future UX ideas retain their documented gates.
**Verified baseline:** accepted M6 source on
`feat/m6-expenses-business-summary`, including coordinator correction `1d8124c`.

This is the single disposition/backlog for the founder's structured ideas,
raw transcript and external architect feedback. It routes to approved sources,
not another schema/design authority. Durable M5 decisions are D-039/D-040;
PRD, DOMAIN_DATA_MODEL, TECHNICAL_ARCHITECTURE, OFFLINE_SYNC and DESIGN now
hold the resulting specifications. The M5 plan/tickets/workflow hold execution.

## Product intent

Home should answer: What happened today? What needs attention? What should I
 do next? Keep a familiar calm operating surface with deeper detail in Reports.
Founder layouts are strong UX hypotheses, not pixel instructions. Progressive
catalogue/inventory enrichment must preserve immediate sell-first value.

## Change mapping and disposition

| ID | Requirement / disposition | Milestone and gate |
| --- | --- | --- |
| PC-01 | Live Today count and sales value after completed sales; sales value is not profit or cash received | Accepted M6 source; stored completed totals over the store-local day, full-range exact query and focus/resume/rollover refresh |
| PC-01a | Optional one popular product; deeper rankings in Reports | Accepted M6 source after audit correction: “Most frequently sold today” by distinct completed sales containing product with stable ties |
| PC-02 | One prominent accessible floating Scan on suitable major surfaces; no second global product + and no permanent Sell tab once scanner is delivered | M8 navigation gate; preserve manual/search fallback, dirty sale state/history/deep links and accessible reachability; hide in scanner/cart/payment/restock/count/edit/keyboard flows |
| PC-03 | Blind-first count -> compare -> optional recount -> confirm difference/reason -> real reconciliation; matching check has no zero event | Approved M5, D-040; retains first/recount facts and protects event/batch watermarks while trading |
| PC-03a | Rotate quick/easy, moving and not-recently-checked stock using extensible policy | Approved simple M5 selector; advanced risk/value/discrepancy/recent-restock/random scoring future, no permanently fixed three classes |
| PC-03b | Default around three checks/day, configurable/pausable, shop-local morning/afternoon/preclosing intent | Approved M5 foreground due windows/settings; unfinished work survives day rollover; background notification delivery separately scoped |
| PC-03c | Reasoned replacement, repeated attempts auditable, no automatic suspicion | M5 owner history; M11 staff review/notifications. Physical zero against recorded positive stock is a discrepancy, not silently skipping it; exhausted pools remain valid |
| PC-04 | Different staff assignments and owner review; later independent same-product checks | M11 after M7 coordination; keep first evidence, authorized reviewer control and factual behavior rather than fraud accusations |
| PC-05 | Compact Needs attention / See All with Restock and durable Snooze; no card flood | M5 real local list; M6 Home promotion. Low/zero/negative/discrepancy/expiry conditions, resolution/worsening/due behavior; snooze never mutates stock |
| PC-05a | Review unresolved discrepancies rather than leave resolved history urgent | M5 list/M6 Home; accurate progress and check dates, no business/report “100% accurate” badge or report lock |
| PC-05b | Expiry attention from surviving recorded stock, not old receipt reminders | Approved first-pilot M5 list, M6 Home; inferred remaining wording, month/day precision, unknown coverage, actual removal/reconciliation actions |
| PC-06 | Multiple expiry groups per product; optional printed numbers, internal IDs, automatic assumed FEFO without ordinary checkout confirmation | Approved D-039; M5 receipt/sale extension, unknown residual, progressive physical classification; costing stays D-027/D-038/D-040 |
| PC-07 | Important replacement-cost/personal/market movements on Home | M9 personal/M10 market; real comparable observations, coverage/freshness/consent; no simulation in M5/M6 |

## M4 impact — resolved

No new mandatory M4 reopening follows from these requirements. Existing stable
purchase-item UUIDs and immutable quantity/conversion/cost snapshots provide
safe additive references. Accepted M4 audit corrections are recorded separately
in M4_AUDIT_CORRECTIONS; not product-change implementation. Migrations 1–6
remain unchanged. Old stock is unknown, not reconstructed with invented dates
or duplicated purchase/opening events.

The current product total/event ledger already exists; lot/group projection,
physical count and snooze data do not. M4 source acceptance does not claim expiry,
M5 native evidence or full accounting readiness. First pilot requires actual
working expiry and the carried device/release checks.

## Founder approvals and superseded proposals

Founder approved blind owner stock checks/attention, conservative shortage and
unexplained-surplus costing, and expiry for the first real-shop pilot. Founder
then explicitly resolved minimal batch awareness and automatic FEFO without
routine sale batch selection/confirmation. UNKNOWN remains valid; shelf picking
is assumed unless actually identified/physically checked. Financial costing is
separate from batch consumption. Strict pharmacy/warehouse traceability, GS1/OCR
and recognition integration are future enhancements.

This supersedes the earlier review suggestion that normal selling should require
physical group confirmation, and rejects expiry deferral past pilot. Current
schema/UX details live in approved authorities, not copied into this backlog.

## Architect feedback retained

- External advice to finish M1/design before M2/M3 describes an old project
  state. M1–M4 exist; use the design gate for M5, without restarting them.
- Do not implement “Mark restocked” as a balance overwrite/dismissal; record
  the actual purchase. Expiry handled/removed must describe the real action.
- Completing selected checks cannot certify every inventory/financial report.
  Use actual progress/last-check/unresolved/unknown facts. Any future confidence
  score needs an explicit definition and evidence, not an undefined High badge.
- Replacements and staff attempts are review signals, not misconduct proof.
  A proposed three-replacement cap remains a future configurable policy
  hypothesis, not a mandatory suspicion threshold.
- Offline status should remain subtle, but locally saved is not cloud-acknowledged.
  Credit sales already exist; Home wording must distinguish sales from cash.
- Home/Products/Reports/More was an architect hypothesis, not a locked new tab
  contract. Global Scan navigation retains M8 review and the manual sale fallback.
- Hours/days/week/month reminder intent is supported by explicit reminder times;
  condition-specific escalation must prevent long snooze hiding worsening alerts.

## Roadmap checkpoint before M7

- M1–M4 remain accepted foundations; these product changes required no broad
  rewrite. M5 extended M4 additively for batch/expiry/reconciliation behavior.
- M5 owns PC-03, PC-05 list/actions and PC-06. M6 owns PC-01/PC-01a and Home's
  compact PC-05 preview. Their audit records and tests are the implementation
  evidence; this backlog remains a disposition index.
- M7 must preserve and synchronize the completed M5/M6 envelopes under
  `OFFLINE_SYNC.md`, including legacy/extended sale and purchase payloads,
  batch/reconciliation facts, mutable settings, expenses and withdrawals.
- M8 owns PC-02 and scanner/barcode application integration after the M7 source
  contract is accepted. Founder deferred Astra/coordinator M8 planning until this
  coordinator task is explicitly switched to Astra. When resumed, any parallel
  Recognition Track B work uses separate branches/worktrees and does not edit
  shared schema or contracts concurrently.
- Production M8 and M9 remain sequential in the core app. Recognition R&D is the
  parallel track; M9 must not begin in the same checkout while M8 is changing
  navigation, catalogue or scanner contracts.

M7 tickets are now published and include every accepted M5/M6 envelope. Next:
establish the non-production Supabase integration environment and assign M7
implementation. Do not implement PC-02, PC-04 or PC-07 inside M7.
