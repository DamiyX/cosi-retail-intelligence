# M9 Personal Restock-Price Intelligence Plan

**Status:** Local M9 implementation authorized under a narrow founder exception; independent audit pending. M7 acceptance remains unmet.  
**Branch:** `plan/m9-price-intelligence`  
**Scope:** one retailer's own immutable purchase observations, available offline.  

## Execution exception — 2026-09-27

The founder authorized M9 local implementation while M7 PostgreSQL, endpoint,
and device acceptance remains deferred. This exception permits only the four
M9 tickets on the existing M9 branch. It does not mark M7 accepted, verify its
pull/echo path, authorize hosted services, or permit M7/M8/M10 work, deploy,
merge, or push. The isolated M9 checkout contains the M4 observation storage
contract but no M7 pull applier; actual M7 pull/replay compatibility remains an
open evidence gate for independent audit.

## Outcome

Help an owner answer three practical questions from records they already create:

1. What did I pay the last two comparable times I restocked this product?
2. Did the replacement cost rise, fall or stay the same?
3. When and from whom did those observations come?

M9 does not require network participation. It does not claim a market price,
profit, recommended selling price or accounting truth.

## Verified starting point

M4 already commits one immutable `price_observations` row with every purchase
line. The row retains original package/conversion, exact rational package and
base-unit prices, currency, supplier, source purchase item and observed time.
It is store-private, defaults contribution consent off and is protected by
immutability triggers. Product detail already shows raw purchase history.

The existing `(store_id, product_variant_id, observed_at DESC)` index supports
the expected small-retailer read path. M9 introduces no authoritative write,
outbox operation or schema migration unless final M7 evidence reveals a real
query/index deficiency.

## Comparison contract

For each active or historical store product:

1. Select the newest `VALID` observation inside the active store, ordered by
   `observed_at`, `created_at`, then `id` descending.
2. Prefer the newest earlier observation with the same `package_unit_id` and
   currency. This is the primary package-basis comparison.
3. If no earlier same-package observation exists, use the newest earlier
   observation for the same product variant and currency only when both exact
   normalized base-unit prices are valid. Label this explicitly as a per-base-
   unit comparison across package sizes; never display it as a same-carton or
   same-pack comparison.
4. Compute direction and percentage from exact rational values with `BigInt`.
   Round only the display percentage to one decimal place. Retain the exact
   inputs; do not persist a rounded derivative.
5. A zero previous price has no percentage denominator. Show the two prices and
   state that percentage change is unavailable. Two equal values are unchanged.
6. Never compare different currencies, product variants or invalid/unavailable
   observations. `ESTIMATED` and `UNAVAILABLE` rows remain in raw history but
   do not produce an exact change claim. Do not infer a missing prior price.

Multiple receipt lines remain separate observations. Their immutable timestamps
and IDs provide deterministic ordering. Catalogue edits never rewrite history.

## Access and ownership

Purchase costs and supplier relationships are store-private. M9 management and
summary reads require an active OWNER in the first slice. UI hiding is not the
authorization boundary. M11 may later add explicit staff permissions.

Both the comparison and full purchase-history reads use the owner-scoped
PersonalPriceClient and recheck active membership on every read. The generic
catalogue client does not expose purchase-price history.

Every query requires the active `storeId`. Cross-store observations, suppliers
and products must never be returned, even when an ID is supplied directly.

## Experience

### Product detail

Add a compact **Purchase cost change** section above the existing history:

- latest and previous comparable prices;
- comparison basis (`carton`, `pack`, or explicitly `per base unit`);
- increase/decrease/unchanged and percentage when defined;
- both observation dates and latest supplier when recorded;
- honest empty, one-observation and read-failure states;
- a path to the full history already derived from immutable purchases.

### Personal price changes

Add a route-level owner view, reached from Home and product detail, rather than
a permanent tab. Show products with at least two comparable observations,
newest changed observation first. Each row names the product, basis, previous
and latest price, change direction/percentage, date and supplier where known.
No-change rows may remain available through an `All history` view, but they do
not occupy the compact default change list.

### Home

Add one calm **Purchase cost changes** card containing at most three most-recent
nonzero personal changes and a **See all** path. Show the observation date so an
old restock is not presented as a live market fact. This card is separate from
inventory `Needs attention`; M9 adds no urgency score, snooze or market claim.

The M9 routes use ordinary stack navigation and existing Home/Product entry
points. They do not change primary tabs, the future global Scan action or any
scanner/product-selection contract. This makes M9 safe to implement after M7
while founder-deferred M8 remains untouched.

## Failure behavior

- Zero or one observation: explain that another recorded restock is needed.
- No same-package predecessor: use the labelled base-unit fallback only when
  valid; otherwise show history without a change claim.
- Invalid/corrupt rational: exclude the comparison, preserve raw history and
  surface a recoverable read error; never coerce to zero.
- Offline or expired cloud session: local personal history continues to work.
- Sync arrival: M7-applied immutable observations appear after a normal refresh
  without duplicating or recalculating authoritative purchase facts.
- Deleted/deactivated product/package: history remains readable from snapshots.

## Compatibility and migration

- SQLite migrations 1-17 remain unchanged by the plan.
- M7 must synchronize immutable purchase observations before M9 begins.
- No backfill is needed: M4 observations are already historical facts; pre-M4
  purchases with no observation remain honestly absent.
- M10 may consume sanitized consented observations through its own contract.
  M9 reads private rows and must not enable contribution consent.

## Verification

Automated acceptance must cover:

- exact increase, decrease, unchanged and fractional-rational comparisons;
- one-decimal display rounding without changing exact stored values;
- zero previous price and safe-integer boundary cases;
- same-package priority and labelled cross-package base-unit fallback;
- rejection of currency/product/store mismatches and malformed rationals;
- exclusion of estimated/unavailable rows from exact change claims while
  preserving them in purchase history;
- deterministic ties, repeated receipt lines and deactivated package history;
- OWNER authorization and negative STAFF/cross-store reads;
- restart and offline behavior;
- M7 pull/echo visibility without duplicate signals;
- product-detail, full-list and Home empty/error/populated/accessibility states;
- compact Home limit and truthful non-market wording.

Full validation includes focused domain/repository/component tests, strict
TypeScript, zero-warning lint, the repository validation suite, Expo Doctor,
dependency check and Android export. Physical-device evidence is recorded only
if actually performed.

## Explicitly outside M9

- market ranges, typical price, confidence or competitor observations (M10);
- contribution consent or anonymization (M10);
- recommended selling prices, automatic repricing or margin promises;
- notifications, urgency scoring or snooze for price changes;
- scanner, barcode or recognition work (M8/M12);
- staff price-access policy (M11);
- changing D-027/D-038 costing or using FEFO as financial costing.

## Dependency frontier

```text
M7 accepted
  -> M9-01 exact personal comparison on product detail
  -> M9-02 store-wide personal price changes
  -> M9-03 compact Home surface
  -> M9-04 offline/sync/accessibility hardening and evidence
  -> independent audit
```

M8 remains explicitly deferred to Astra. M9's implementation must revalidate
the final M7 observation/pull contract before production edits begin.
