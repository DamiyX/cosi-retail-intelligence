# M6 Independent Audit Corrections

**Date:** 2026-09-19  
**Review comparison:** `3ffad0d..92949a8`, followed by coordinator correction
`1d8124c` on `feat/m6-expenses-business-summary`.  
**Decision:** M6 source/automated scope accepted after bounded corrections.

## Scope

The coordinator independently reviewed migrations 16–17, expense and withdrawal
commands/repositories, the daily summary, Finance client/context, Home and
finance routes/screens, M6 tests, workflow evidence and the accepted M1–M5
contracts. No M7, cloud, deployment or phone work is included.

## Specification findings and corrections

### A01 — Home omitted the computed popular-product fact

**Severity:** medium. M6-04 and PC-01a require the optional most-frequently-sold
product on Home. The summary calculated it, but Home discarded it. A
failing-before component assertion now proves Home displays the product name and
distinct completed-sale appearance count. Corrected in `1d8124c`.

### A02 — The promoted Home surface was not the default entry

**Severity:** medium. `app/index.tsx` and the tab navigator still selected
Products, so launching the app bypassed the new operating surface. A
failing-before routed regression now proves `/` opens `/today`. The root redirect
and tab initial route now select Today/Home. Corrected in `1d8124c`.

### A03 — Staff could call the owner financial-summary service

**Severity:** high authorization boundary. UI client construction selected an
owner, but the underlying summary service accepted any active staff member,
contradicting D-041 and the M11 permission boundary. A failing-before SQLite
service regression now proves STAFF is rejected; the read boundary requires an
active OWNER for the store. Corrected in `1d8124c`.

### A04 — Expense history exposed storage terminology

**Severity:** low. The footer told retailers that values were stored in minor
units. It now says that displayed amounts use the store currency. Corrected in
`1d8124c`.

## Independent evidence

- Failing-before regressions reproduced A01, A02 and A03.
- Focused M6/navigation run after correction: PASS — 8 suites, 30 tests.
- `npm run validate`: PASS — environment check, strict typecheck, zero-warning
  lint, 5 domain suites/150 tests and 44 mobile suites/322 tests (472 total).
- `npm run mobile:doctor`: PASS — 21/21.
- `npm exec --workspace @retail/mobile -- expo install --check`: PASS;
  dependencies are up to date.
- `npm run mobile:export`: PASS — 1,402 Android modules and 3.6 MB Hermes bundle;
  generated output remains ignored.
- Active M6 workflow/index JSON Schema and date-time validation, gate dependency
  graph, artifact existence, unchanged migrations 1–15, contiguous migrations
  1–17 and `git diff --check`: PASS.

## Remaining limits

Physical Galaxy M3–M6, development-client/Metro, second-laptop, cloud/deployment
and professional accounting checks remain carried. Source acceptance does not
imply pilot, beta, release or formal-accounting readiness. No M7 implementation,
push, merge or deployment was performed.
