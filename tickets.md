# Tickets: M6 Expenses, Withdrawals and Business Summary

M6 provides owner-only offline money-out capture and a truthful local Live Today surface. The implementation follows `docs/engineering/M6_EXPENSES_BUSINESS_SUMMARY_PLAN.md`. Do not start M7.

## M6-01 — Record and review operating expenses

**Status:** Not started. **Blocked by:** independently accepted M5 source scope.
**Delivers:** an owner can record an operating expense offline and find it after restart.

- [ ] Add an append-only migration for store-scoped expenses with approved category, positive integer minor amount, store currency, optional note, occurred/created time, resolved owner member/user/device and useful store/time index. Preserve migrations 1–15 exactly and prove populated-v15 upgrade/rollback/retention.
- [ ] Complete expense row plus one canonical version-1 outbox envelope atomically. Same operation and explicit request replay returns the original; conflicting intent, inactive/non-owner actor, cross-store references, invalid/zero/overflow amount and malformed category fail without partial rows.
- [ ] More exposes Record expense and Expenses. Entry/review/history use store currency, approved categories, optional note/time, dirty-exit protection, retained failure input and operation ID, duplicate-submit prevention, empty/error/retry/restart states and truthful local sync wording.
- [ ] Focused domain/repository/component tests prove offline completion, exact money, owner/store isolation, idempotency, rollback, restart, routing and accessibility. Typecheck and zero-warning lint pass.

**Out of scope:** withdrawal, receipt media, recurring expenses, cash accounts, edit/delete, tax/accounting automation, M7 transport.

## M6-02 — Record and review owner withdrawals

**Status:** Not started. **Blocked by:** M6-01.
**Delivers:** an owner can record personal money removed from the business without misclassifying it as expense.

- [ ] Add a separate append-only migration/table for owner withdrawals with positive integer store-currency amount, optional note, occurred/created time and immutable owner/member/device attribution. Prove populated prior-schema upgrade/rollback/retention.
- [ ] Complete withdrawal plus one canonical outbox envelope atomically with owner/store authorization, stable operation replay, conflicting-intent rejection and no duplicate/partial rows after retry or injected failure.
- [ ] More exposes Record owner withdrawal and Withdrawals with explicit non-expense copy, review/confirm, dirty-exit/failure recovery, accessible exact amount/history and restart survival.
- [ ] Focused tests distinguish expense and withdrawal queries/envelopes under identical dates/amounts and cover boundary, isolation, replay, rollback, UI and restart. Typecheck and zero-warning lint pass.

**Out of scope:** drawings accounts, dividends, payroll, staff permissions, edit/delete, cash settlement.

## M6-03 — Calculate an exact local daily business summary

**Status:** Not started. **Blocked by:** M6-01, M6-02.
**Delivers:** one read model truthfully explains the selected store-local day.

- [ ] Build full-range, store-scoped half-open day queries for completed sales value (credit included), sale count, expenses and withdrawals. Handle store timezone, DST/offset boundaries, empty days and safe integer aggregation without paged-history truncation or SQLite overflow.
- [ ] Derive tracked COGS/gross margin only from immutable available cost snapshots. Report explicit covered/unavailable sale counts/value; never treat unavailable COGS as zero or label partial data profit/P&L/cash.
- [ ] Derive optional Most frequently sold today by distinct completed-sale appearances, with stable count/earliest-application/product-ID ties. Do not sum unlike package quantities or substitute revenue rank.
- [ ] Provide an accessible summary-detail surface with exact values, coverage/label explanations, empty/error/retry/restart behavior and no mutation. Tests cover credit, partial cost, expenses versus withdrawals, ties, cross-store isolation and local-day rollover.

**Out of scope:** arbitrary analytics ranges, cash received, balance sheet, formal accounting, purchase-cost/market signals.

## M6-04 — Promote Live Today and real attention to Home

**Status:** Not started. **Blocked by:** M6-03 and accepted M5 attention.
**Delivers:** Today answers what happened, what needs attention and what to do next without becoming a dense dashboard.

- [ ] Replace the Today shell with a restrained Home surface: Sales value, Transactions, recorded expenses/withdrawals, optional popular product and cautious cost-coverage link. Include credit-aware and non-profit copy.
- [ ] Add a bounded severity-ordered Needs attention preview backed by the real M5 service, with See all and real contextual routing. Preserve snooze/due/worsening/episode behavior; no duplicate attention store or decorative dismissals.
- [ ] Add compact next actions for Sell, Restock, Stock checks and Record expense. No global Scan, second add-product action, Reports tab or M9/M10 price signal.
- [ ] Refresh after durable local writes, focus, foreground resume and store-local rollover without background spin or dirty-form loss. Component/routed tests cover zero/loading/error/partial states, navigation, accessibility, large-content structure and refresh timing.

**Out of scope:** M8 scanner navigation, M9/M10 price intelligence, M11 staff activity, dense analytics.

## M6-05 — Complete evidence and stop for independent audit

**Status:** Not started. **Blocked by:** M6-01, M6-02, M6-03, M6-04.
**Delivers:** a recoverable M6 handoff; no M7 implementation.

- [ ] Run focused suites, strict typecheck, zero-warning lint and full tests; prove expense/withdrawal migrations, atomicity/replay, local-day summary, cost-coverage truth, Home refresh/attention and M1–M5 regression behavior.
- [ ] Run Expo Doctor, dependency compatibility, Android export, workflow/index/gate/artifact/migration checks and `git diff --check`. Keep secrets/generated builds out of Git.
- [ ] Update this ledger, PROJECT_STATE and M6 workflow with actual commits/commands/results, remaining accounting/device risks and a clean branch/full HEAD/status. Notify the coordinator and stop for independent audit.
- [ ] Do not start M7, push, merge, deploy, claim physical-device checks or call the tracked summary full profit/P&L.

## Dependency frontier

```text
M5 accepted -> M6-01 -> M6-02 -> M6-03 -> M6-04 -> M6-05 -> independent audit
```

One implementation task owns the checkout sequentially. Corrections return to that same task; the coordinator alone records independent acceptance.
