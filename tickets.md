# Tickets: M9 Personal Restock-Price Intelligence

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

**Status:** Implemented locally; automated verification blocked pending locked dependency installation. **Dependency:** founder-approved M9 local execution exception; M7 acceptance remains unmet.  
**Delivers:** an owner can open one product and understand its latest comparable
restock-cost change entirely from local data.

- [x] Add a pure exact-rational comparison module that deterministically selects
  latest/previous observations, prioritizes the same package/currency, uses the
  labelled base-unit fallback only when valid, and handles increase, decrease,
  unchanged and zero-denominator cases without floating-point authority.
- [x] Add a store-scoped OWNER-authorized repository/client read returning
  immutable price/snapshot/supplier/date facts. Direct IDs, STAFF context and
  cross-store rows must not bypass the boundary.
- [x] Add the product-detail **Purchase cost change** section with latest,
  previous, basis, direction/percentage, dates, supplier and honest zero/one/
  invalid/error states. Preserve the existing full raw history.
- [x] Add exact fractional values, display rounding, malformed rational,
  deterministic tie, package-priority/fallback, currency/store/product mismatch,
  zero/one/empty, STAFF, restart, deactivated-package and read-failure cases to
  domain/repository/component tests.
- [ ] Execute focused domain/mobile tests, strict typecheck and zero-warning
  lint. **Blocked:** `jest`, `tsc` and `eslint` are not installed in this clean
  checkout. No dependencies or lockfile have been changed.

**Evidence:** authored test paths: `packages/domain/__tests__/personalPriceChanges.test.ts`, `apps/mobile/__tests__/m9PersonalPriceClient.test.ts`, and `apps/mobile/__tests__/m9ProductDetail.test.tsx`. Attempted commands failed before test/check execution because the locked workspace dependencies are absent. `git diff --check` passed.

**Out of scope:** store-wide ranking, Home, market data, contribution consent,
selling-price recommendations.

## M9-02 — Add the store-wide Personal price changes view

**Status:** Implemented locally; automated verification blocked pending locked dependency installation. **Dependency:** M9-01.  
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
and opens from Product detail. Focused UI/client tests were authored, including
inactive products, one observation, owner restriction, read failure, offline
restart, supplier/date/basis rendering and history navigation. Test/typecheck/
lint execution remains blocked by missing locked workspace dependencies;
`npm run test --workspace @retail/mobile -- --runTestsByPath
__tests__/m9PersonalPriceClient.test.ts __tests__/m9ProductDetail.test.tsx
__tests__/m9PersonalPriceChanges.test.tsx --runInBand` failed before test
execution because `jest` is not recognized. `git diff --check` passed.

**Out of scope:** global tab changes, scanner entry, network aggregation,
notifications or price-change snooze.

## M9-03 — Surface recent personal changes calmly on Home

**Status:** Planned. **Dependency:** M9-02.  
**Delivers:** Home answers what recently changed in replacement cost without
becoming a dense analytics or alert dashboard.

- [ ] Add one **Purchase cost changes** Home card with no more than three recent
  nonzero personal changes and a **See all** path to M9-02. Do not merge these
  into inventory `Needs attention` or invent urgency/materiality scores.
- [ ] Refresh from local truth on focus/foreground and after completed restocks;
  preserve Home summary/attention behavior and keep the view usable offline.
- [ ] Show observed date/basis and honest empty/error states. Old observations
  remain dated historical facts rather than live market claims.
- [ ] Verify compact limits, refresh, navigation, accessibility/text scale and
  that M8's deferred global Scan/tab contracts are unchanged.

**Evidence:** focused Home/navigation/accessibility tests, typecheck and lint.

**Out of scope:** market signals, push notifications, automatic repricing,
scanner/navigation redesign.

## M9-04 — Prove offline/sync compatibility and stop for audit

**Status:** Planned. **Dependency:** M9-01 through M9-03.  
**Delivers:** a recoverable M9 handoff whose claims match actual evidence.

- [ ] Verify M7-pulled immutable purchase observations produce the same personal
  signal as locally originated observations, echo/replay creates no duplicates,
  pending local work is not hidden and pre-M4 missing history remains absent.
- [ ] Exercise zero/one/many observations, app restart, airplane-mode local
  reads, account/session pause, cross-store/STAFF denial and corrupt-row failure
  behavior. Record physical-device evidence only when performed.
- [ ] Run focused suites, full `npm run validate`, Expo Doctor, dependency check,
  Android export, workflow/index/migration/artifact checks and `git diff --check`.
- [ ] Update tickets, PROJECT_STATE and the M9 workflow with actual commits,
  commands, results, limitations and clean branch/HEAD/status. Stop for
  independent coordinator audit; do not start M10 or M8.

**Out of scope:** production deployment, hosted-service changes, physical-device
release acceptance, M10 market infrastructure.

## Dependency frontier

```text
accepted M7 -> M9-01 -> M9-02 -> M9-03 -> M9-04 -> independent audit
```

M8 remains deferred to Astra. M9 implementation uses route-local Home/Product
entry points and may not change primary scanner/navigation contracts.
