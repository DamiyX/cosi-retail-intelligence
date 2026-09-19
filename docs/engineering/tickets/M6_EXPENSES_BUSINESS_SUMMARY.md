# Tickets: M6 Expenses, Withdrawals and Business Summary

M6 provides owner-only offline money-out capture and a truthful local Live Today surface. The implementation follows `docs/engineering/M6_EXPENSES_BUSINESS_SUMMARY_PLAN.md`. Do not start M7.

## M6-01 — Record and review operating expenses

**Status:** Implemented in `86e526b`; source/automated scope accepted after coordinator correction `1d8124c`. **Basis:** M5 source scope is independently accepted.
**Delivers:** an owner can record an operating expense offline and find it after restart.

- [x] Add an append-only migration for store-scoped expenses with approved category, positive integer minor amount, store currency, optional note, occurred/created time, resolved owner member/user/device and useful store/time index. Preserve migrations 1–15 exactly and prove populated-v15 upgrade/rollback/retention.
- [x] Complete expense row plus one canonical version-1 outbox envelope atomically. Same operation and explicit request replay returns the original; conflicting intent, inactive/non-owner actor, cross-store references, invalid/zero/overflow amount and malformed category fail without partial rows.
- [x] More exposes Record expense and Expenses. Entry/review/history use store currency, approved categories, optional note/time, dirty-exit protection, retained failure input and operation ID, duplicate-submit prevention, empty/error/retry/restart states and truthful local sync wording.
- [x] Focused domain/repository/component tests prove offline completion, exact money, owner/store isolation, idempotency, rollback, restart, routing and accessibility. Typecheck and zero-warning lint pass.

**Implementation evidence (self-check; source/automated scope accepted after coordinator correction `1d8124c`):** Commit `86e526b`; `m6Expenses.test.ts` and `m6ExpenseScreens.test.tsx` pass, covering exact integer money, owner/store isolation, replay/conflict, rollback, restart and populated-v15 upgrade retention. Mobile typecheck and zero-warning lint passed at the ticket checkpoint.

**Out of scope:** withdrawal, receipt media, recurring expenses, cash accounts, edit/delete, tax/accounting automation, M7 transport.

## M6-02 — Record and review owner withdrawals

**Status:** Implemented in `1cce732`; source/automated scope accepted after coordinator correction `1d8124c`. **Dependency:** M6-01 complete.
**Delivers:** an owner can record personal money removed from the business without misclassifying it as expense.

- [x] Add a separate append-only migration/table for owner withdrawals with positive integer store-currency amount, optional note, occurred/created time and immutable owner/member/device attribution. Prove populated prior-schema upgrade/rollback/retention.
- [x] Complete withdrawal plus one canonical outbox envelope atomically with owner/store authorization, stable operation replay, conflicting-intent rejection and no duplicate/partial rows after retry or injected failure.
- [x] More exposes Record owner withdrawal and Withdrawals with explicit non-expense copy, review/confirm, dirty-exit/failure recovery, accessible exact amount/history and restart survival.
- [x] Focused tests distinguish expense and withdrawal queries/envelopes under identical dates/amounts and cover boundary, isolation, replay, rollback, UI and restart. Typecheck and zero-warning lint pass.

**Implementation evidence (self-check; source/automated scope accepted after coordinator correction `1d8124c`):** Commit `1cce732`; `m6Withdrawals.test.ts` and `m6WithdrawalScreens.test.tsx` pass, covering the separate immutable table/envelope, owner/store isolation, replay/conflict, rollback, restart and non-expense UI wording. Mobile typecheck and zero-warning lint passed at the ticket checkpoint.

**Out of scope:** drawings accounts, dividends, payroll, staff permissions, edit/delete, cash settlement.

## M6-03 — Calculate an exact local daily business summary

**Status:** Implemented in `ef47fab`; source/automated scope accepted after coordinator correction `1d8124c`. **Dependencies:** M6-01 and M6-02 complete.
**Delivers:** one read model truthfully explains the selected store-local day.

- [x] Build full-range, store-scoped half-open day queries for completed sales value (credit included), sale count, expenses and withdrawals. Handle store timezone, DST/offset boundaries, empty days and safe integer aggregation without paged-history truncation or SQLite overflow.
- [x] Derive tracked COGS/gross margin only from immutable available cost snapshots. Report explicit covered/unavailable sale counts/value; never treat unavailable COGS as zero or label partial data profit/P&L/cash.
- [x] Derive optional Most frequently sold today by distinct completed-sale appearances, with stable count/earliest-application/product-ID ties. Do not sum unlike package quantities or substitute revenue rank.
- [x] Provide an accessible summary-detail surface with exact values, coverage/label explanations, empty/error/retry/restart behavior and no mutation. Tests cover credit, partial cost, expenses versus withdrawals, ties, cross-store isolation and local-day rollover.

**Implementation evidence (self-check; source/automated scope accepted after coordinator correction `1d8124c`):** Commit `ef47fab`; `m6BusinessSummary.test.ts` and `m6BusinessSummaryScreen.test.tsx` pass, covering store-local half-open/DST boundaries, credit-inclusive value, cost coverage truth, safe-integer overflow rejection, stable popular-product ties, isolation and exact accessible copy. Mobile typecheck and zero-warning lint passed at the ticket checkpoint.

**Out of scope:** arbitrary analytics ranges, cash received, balance sheet, formal accounting, purchase-cost/market signals.

## M6-04 — Promote Live Today and real attention to Home

**Status:** Implemented in `1c9a134`; source/automated scope accepted after coordinator correction `1d8124c`. **Dependencies:** M6-03 and accepted M5 attention.
**Delivers:** Today answers what happened, what needs attention and what to do next without becoming a dense dashboard.

- [x] Replace the Today shell with a restrained Home surface: Sales value, Transactions, recorded expenses/withdrawals, optional popular product and cautious cost-coverage link. Include credit-aware and non-profit copy.
- [x] Add a bounded severity-ordered Needs attention preview backed by the real M5 service, with See all and real contextual routing. Preserve snooze/due/worsening/episode behavior; no duplicate attention store or decorative dismissals.
- [x] Add compact next actions for Sell, Restock, Stock checks and Record expense. No global Scan, second add-product action, Reports tab or M9/M10 price signal.
- [x] Refresh after durable local writes, focus, foreground resume and store-local rollover without background spin or dirty-form loss. Component/routed tests cover zero/loading/error/partial states, navigation, accessibility, large-content structure and refresh timing.

**Implementation evidence (self-check; source/automated scope accepted after coordinator correction `1d8124c`):** Commit `1c9a134`; `m6Home.test.tsx` passes with the combined M6 suite, covering summary/attention loading and failure states, bounded real M5 attention, approved actions, focus/foreground/interval refresh and route behavior. Mobile typecheck and zero-warning lint passed at the ticket checkpoint.

**Out of scope:** M8 scanner navigation, M9/M10 price intelligence, M11 staff activity, dense analytics.

## M6-05 — Complete evidence and stop for independent audit

**Status:** Source/automated scope accepted after coordinator correction `1d8124c`. **Dependencies:** M6-01 through M6-04 complete.
**Delivers:** a recoverable M6 handoff; no M7 implementation.

- [x] Run focused suites, strict typecheck, zero-warning lint and full tests; prove expense/withdrawal migrations, atomicity/replay, local-day summary, cost-coverage truth, Home refresh/attention and M1–M5 regression behavior.
- [x] Run Expo Doctor, dependency compatibility, Android export, workflow/index/gate/artifact/migration checks and `git diff --check`. Keep secrets/generated builds out of Git.
- [x] Update this ledger, PROJECT_STATE and M6 workflow with actual commits/commands/results, remaining accounting/device risks and a clean branch/full HEAD/status. Notify the coordinator and stop for independent audit.
- [x] Do not start M7, push, merge, deploy, claim physical-device checks or call the tracked summary full profit/P&L.

**Implementation evidence (self-check; source/automated scope accepted after coordinator correction `1d8124c`):** Commits `86e526b`, `1cce732`, `ef47fab` and `1c9a134` implement M6-01 through M6-04. Independent final validation after `1d8124c` passes: environment checks, strict typecheck, zero-warning lint, 5 domain suites/150 tests and 44 mobile suites/322 tests. `npm run mobile:doctor` passes 21/21; Expo dependency compatibility is up to date; Android export passes with 1,402 modules and a 3.6 MB Hermes bundle. Workflow/index/gate/artifact/migration checks and `git diff --check` pass. Generated export output is ignored. Separate Luna Max implementation task `01a0b72e-5fdf-7022-afc8-2e1796f49b66` completed the implementation and stopped; coordinator audit and corrections are recorded in `M6_AUDIT_CORRECTIONS.md`.

## Dependency frontier

```text
M5 accepted -> M6-01 -> M6-02 -> M6-03 -> M6-04 -> M6-05 -> independent audit
```

One implementation task owns the checkout sequentially. Corrections return to that same task; the coordinator alone records independent acceptance.
