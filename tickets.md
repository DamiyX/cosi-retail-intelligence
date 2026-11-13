# Tickets: M9 Personal Restock-Price Intelligence

## Current coordinator checkpoint — October3

Initial ticket evidence below is historical. M7 local source is accepted at
c817edb and M8 is active in COSI-m8-planning. This isolated reference lacks the
current pull/runtime integration, so M9-04 remains incomplete. Fresh coordinator
validate passes501 tests/53 suites/types/lint; focused41 and Android export pass.
Doctor20/21 and dependency check fail on stale constants/router patches; earlier
21/21 remains historical. Current application M9_INTEGRATION_PLAN.md and
M9_INTEGRATION_TICKETS.md own remaining integration. Main coordinator audits
stopped handoff; physical/native checks pending.


M9 turns the retailer's own immutable purchase observations into useful offline
cost-change information. It follows
`docs/engineering/M9_PERSONAL_PRICE_INTELLIGENCE_PLAN.md`. M9 normally depends
on accepted M7. On 2026-09-27 the founder authorized a narrow exception for
local M9 implementation while M7 PostgreSQL/endpoint/device acceptance remains
deferred. This does not claim M7 acceptance or verify M7 pull/echo behavior.
M9 does not touch M7 sync code or M8 scanner/navigation contracts.

The founder has delegated ticket granularity and dependency judgment to the
coordinator for this milestone.

## M9-01 — Show an exact personal cost comparison on product detail

**Status:** Implemented locally; focused and full automated validation pass. **Dependency:** founder-approved M9 local execution exception; M7 acceptance remains unmet.  
**Delivers:** an owner can open one product and understand its latest comparable
restock-cost change entirely from local data.

- [x] Add a pure exact-rational comparison module that deterministically selects
  latest/previous observations, prioritizes the same package/currency, uses the
  labelled base-unit fallback only when valid, and handles increase, decrease,
  unchanged and zero-denominator cases without floating-point authority.
- [x] Add store-scoped OWNER-authorized comparison and full-history reads
  returning immutable price/snapshot/supplier/date facts. Direct IDs, STAFF
  context and cross-store rows must not bypass the boundary. The generic
  catalogue client no longer exposes purchase-price history.
- [x] Add the product-detail **Purchase cost change** section with latest,
  previous, basis, direction/percentage, dates, supplier and honest zero/one/
  invalid/error states. Preserve the existing full raw history.
- [x] Add exact fractional values, display rounding, malformed rational,
  deterministic tie, package-priority/fallback, currency/store/product mismatch,
  zero/one/empty, STAFF, restart, deactivated-package and read-failure cases to
  domain/repository/component tests.
- [x] Execute focused domain/mobile tests, strict typecheck and zero-warning
  lint. Focused tests and full `npm run validate` pass after the audit fixes.

**Evidence:** authored tests in `packages/domain/__tests__/personalPriceChanges.test.ts`, `apps/mobile/__tests__/m9PersonalPriceClient.test.ts`, and `apps/mobile/__tests__/m9ProductDetail.test.tsx` pass. Comparison and full-history reads both use the owner-scoped client; the generic catalogue client no longer exposes purchase-price history. `npm run validate` passes strict typecheck, zero-warning lint, and the full domain/mobile suites. The owner-history correction is in `7273eeb`; subsequent audit fixes are in `414b4dc`.

**Out of scope:** store-wide ranking, Home, market data, contribution consent,
selling-price recommendations.

## M9-02 — Add the store-wide Personal price changes view

**Status:** Implemented locally; focused and full automated validation pass. **Dependency:** M9-01.  
**Delivers:** the owner can review all recent personal restock-cost changes and
open the affected product without relying on network participation.

- [x] Add a store-wide projection that emits at most one current signal per
  store product, includes only comparable same-currency observations, orders
  changed products by latest observation time with stable ties and retains an
  explicit path to unchanged/history information.
- [x] Add a route-level **Personal price changes** screen reached from product
  detail/ordinary stack navigation. Show product, comparison basis, previous and
  latest prices, exact direction/percentage display, freshness and supplier when
  known.
- [x] Add accessible empty/one-observation/read-failure/refresh states and keep
  copy grounded in purchase/restock costs. Local SQLite reads are synchronous,
  so the screen has no separate asynchronous loading state; copy does not claim
  market price, profit, recommended selling price or an undated live price.
- [x] Author tests for store isolation, OWNER authorization, deterministic ordering,
  mixed packages/currencies, deactivated products and offline restart.

**Evidence:** `apps/mobile/src/priceIntelligence/client.ts` returns one store-scoped
comparison per store product with stable newest-observation ordering and an
explicit unchanged-comparison view; the route is nested in the Products stack
and opens from Product detail. Focused UI/client tests pass, including inactive
products, one observation, owner restriction, read failure, offline restart,
supplier/date/basis rendering and history navigation. The router maps include the
price-changes route and exercise navigation from Product detail into that route.
The focused suites and full `npm run validate` pass.

**Out of scope:** global tab changes, scanner entry, network aggregation,
notifications or price-change snooze.

## M9-03 — Surface recent personal changes calmly on Home

**Status:** Implemented locally; focused and full automated validation pass. **Dependency:** M9-02.  
**Delivers:** Home answers what recently changed in replacement cost without
becoming a dense analytics or alert dashboard.

- [x] Add one **Purchase cost changes** Home card with no more than three recent
  nonzero personal changes and a **See all** path to M9-02. Do not merge these
  into inventory `Needs attention` or invent urgency/materiality scores.
- [x] Refresh from local truth on focus/foreground and after completed restocks;
  preserve Home summary/attention behavior and keep the view usable offline.
- [x] Show observed date/basis and honest empty/error states. Old observations
  remain dated historical facts rather than live market claims.
- [x] Author focused Home tests for the three-row limit, focus refresh,
  navigation, screen-reader labels, retryable local-read errors and separation
  from inventory attention. Home text uses the existing scalable theme sizes.
- [x] Keep the M9 entry points inside the existing Today and Products routes;
  the M8 global Scan/tab contracts are unchanged in this diff.
- [x] Execute the focused Home test, typecheck and lint. Focused and full
  validation pass.

**Evidence:** `HomeScreen` reads the owner-scoped local client and shows no more
than three newest changes, package/base-unit basis and observed date. It refreshes
on Home focus/foreground return, including return from the completed restock
route. Focused tests in `apps/mobile/__tests__/m6Home.test.tsx` pass as part of
the full mobile suite and `npm run validate`.

**Out of scope:** market signals, push notifications, automatic repricing,
scanner/navigation redesign.

## M9-04 — Prove offline/sync compatibility and stop for audit

**Status:** Source audit passed; M7 integration and physical-device evidence remain incomplete. **Dependency:** M9-01 through M9-03.  
**Delivers:** a recoverable M9 handoff whose claims match actual evidence.

The OWNER-scoped product-history correction is committed locally as `7273eeb`;
independent-audit corrections are committed as `414b4dc`. The branch remains
unpushed.

- [ ] Verify M7-pulled immutable purchase observations produce the same personal
  signal as locally originated observations, echo/replay creates no duplicates,
  pending local work is not hidden and pre-M4 missing history remains absent.
  **Blocked:** this checkout has no M7 pull applier, and M7 PostgreSQL/endpoint/
  device acceptance remains deferred.
- [x] Author regression coverage for zero/one/many observations, app database
  restart, account/session pause, cross-store/STAFF denial, deactivated-package
  snapshots, corrupt-rational failure and OWNER-only full-history access. The
  corrupt-row test uses a disposable local fixture and removes the immutability
  trigger only inside that test.
- [ ] Perform physical airplane-mode/device checks. No device evidence was
  collected.
- [x] Execute focused suites, full `npm run validate`, Expo Doctor, dependency
  check and Android export. Focused domain tests pass (7 tests); focused M9,
  Product detail, navigation and shell suites pass (28 tests). `npm run validate`
  passes environment checks, both typechecks, zero-warning lint, 157 domain
  tests and 344 mobile tests (501 total across 53 suites). The coordinator ran
  `npm ci` from the committed lockfile with exit 0. The coordinator then aligned
  `expo-linking` to `57.0.11` and `expo-router` to `57.0.23` in the mobile
  manifest and lockfile. After that change, the Expo dependency check passes,
  `npm run mobile:doctor` passes 21/21, full `npm run validate` passes again,
  and `npm run mobile:export` passes with 1,408 Android modules and a 3.6 MB
  Hermes bundle. A second clean `npm ci` from the updated lockfile also passes,
  followed by the same green validation, Doctor, dependency check and export.
  The mobile suite emits a React `act(...)` warning in `products.test.tsx` but
  no test fails. `npm ci` reports 22 dependency advisories (1 low, 21 moderate);
  these were not triaged in M9. The dependency alignment is not yet committed.
  `git diff --check`,
  workflow JSON/index/artifact checks pass, and migration source is unchanged
  from the branch base.
- [x] Update tickets, PROJECT_STATE and workflow with actual commits, commands,
  results and limitations. No physical-device or airplane-mode evidence was
  collected; M7 pull/echo/replay remains unverified. The branch remains local
  and unpushed. The coordinator source re-audit found no further blocker after
  the Expo alignment. Do not start M10 or M8.

**Out of scope:** production deployment, hosted-service changes, physical-device
release acceptance, M10 market infrastructure.

## Dependency frontier

```text
accepted M7 -> M9-01 -> M9-02 -> M9-03 -> M9-04 -> independent audit
```

M8 remains deferred to Astra. M9 implementation uses route-local Home/Product
entry points and may not change primary scanner/navigation contracts.
