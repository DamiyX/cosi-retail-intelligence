# Tickets: M2 Catalogue + Package Units

These tickets deliver the smallest offline catalogue that later sales and
restocking can safely use. The founder delegated ticket size, dependency, and
design judgement to the engineering planner on 2026-09-14.

## Execution Contract

- Work on `feat/m2-catalogue-package-units`, created from the accepted M1
  baseline. Do not add M2 implementation to the M1 branch.
- Execute tickets in dependency order and keep typecheck, zero-warning lint,
  tests, Expo compatibility, and Android export green.
- A mutable catalogue action is incomplete unless its business data and durable
  outbox operation commit atomically.
- Update this file and `.agents/workflows/m2-catalogue-package-units.json` with
  evidence after each ticket.
- Stop after M2-05 for an independent milestone audit. Do not start M3.
- Do not push, merge, deploy, link production services, or change an established
  architecture decision without the required approval.

## M2 Boundaries

- Follow D-034 for fixed-scale micro-unit quantities and D-035 for temporary
  store-scoped provisional variants.
- Follow `docs/design/DESIGN.md` for the Products flow, states, accessibility,
  and visual baseline. Do not invent final sale/restock UI in M2.
- The outbox stores complete local operation envelopes. Network push/pull,
  retries, conflict resolution, and Supabase application remain M7.
- StoreProduct and StorePackageSetting own store price/cost/preferences. Shared
  or platform-style identity edits may not overwrite those fields.
- Sales, purchases, inventory events, recognition inference, auth UX, cloud
  catalogue, and market-price sharing are outside M2.

## Ticket M2-01: Create a usable temporary product offline

**Status:** Complete (commit pending with M2-02 unless the founder asks for a per-ticket commit)  
**Outcome:** A retailer can enter a product name, save it without a network, and
immediately reopen a valid product with a base package.  
**Blocked by:** Accepted M1 baseline; D-034; D-035; M2 design gate (all met)

**Vertical scope:**

- Replace or extend the provisional integer-only quantity utility with the D-034
  micro-unit value, exact decimal parser/formatter, and conversion operation.
- Add the minimal migrations and typed repositories for store-scoped
  ProductVariant, PackageUnit, StoreProduct, and durable OutboxOperation.
- Add one application operation that atomically creates the provisional variant,
  active base package, store product, and one complete outbox envelope.
- Add the Products empty/list state and Quick Add flow from `DESIGN.md`.

**Non-goals:** Additional package units, barcode search, platform matching,
network sync, price/cost history, sales, inventory.

**Acceptance:**

- [x] Decimal parsing and conversion tests prove exact six-place behavior,
      reject excess precision/unsafe ranges, and use no authoritative float math.
- [x] A Quick Add with only name and base-unit label succeeds offline and returns
      a temporary product whose required graph survives database close/reopen.
- [x] Exactly one PENDING outbox envelope with a unique operation ID, store ID,
      device ID, entity identity, operation type, canonical payload, timestamp,
      attempt count, and status is committed with the product graph.
- [x] Injected failures at each write boundary leave neither business rows nor an
      outbox row; duplicate submit is prevented while saving.
- [x] Empty, validation, saving, locally-saved, and local-database-failure states
      are component-tested; the screen remains usable with no network.

**Evidence (2026-09-14):** `packages/domain/src/packages.ts` implements D-034
micro-units (`parseQuantityDecimal`, `formatQuantityMicros`,
`convertPackagesToBase`, BigInt intermediates, exact-or-reject) and replaces
the provisional `toBaseUnits`; `formatMoney` added for display. Migration 2
`catalogue` adds product_variants, package_units (partial unique index: one
active base), store_products, store_package_settings, product_identifiers
(type-scoped uniqueness), and outbox_operations. `createTemporaryProduct`
commits variant + base package + temporary store product + optional EAN
identifier + one PRODUCT_CREATED envelope atomically, with operation-ID
replay. Products tab shell (Today/Sell/More placeholders), list, Quick Add,
and detail screens follow DESIGN.md; the border token moved to `#7F8E88`
after measured contrast verification (recorded in DESIGN.md). Full validate
green: 126 domain + 78 mobile tests, typecheck, zero-warning lint.

## Ticket M2-02: Find and enrich a store product

**Status:** Complete (committed with M2-01 follow-up)  
**Outcome:** A retailer can find a product and add useful identity details later
without losing the temporary product or changing store commercial facts.  
**Blocked by:** M2-01 (complete)

**Vertical scope:**

- Add ProductIdentifier records for barcode/internal-code values with normalized
  uniqueness rules appropriate to their type.
- Support exact/localized name, local SKU, and identifier search through indexed,
  parameterized repository queries.
- Add Product detail/edit UI for name, temporary status, identifier, local SKU,
  and active state.
- Atomically persist each supported mutable operation with its outbox envelope.

**Non-goals:** Camera scanning, fuzzy/cloud search, canonical catalogue merge,
selling-price history, bulk import.

**Acceptance:**

- [x] Offline search finds expected products by name, local SKU, and exact
      barcode; quotes/SQL-like text remains data and cannot alter queries.
- [x] Editing identity or store SKU survives restart and creates one matching
      outbox operation; injected failure rolls back both sides.
- [x] Identity edits cannot overwrite local SKU, store selling-price fields, or
      package settings, proven by repository integration tests; the boundary
      leaves later cost, stock, and supplier ownership outside identity updates.
- [x] No-match search offers Quick Add with the query as a proposed editable
      name; loading, empty, validation, inactive, and local-save states match
      `DESIGN.md`.

**Evidence (2026-09-14):** `updateProductIdentity` (rename/SKU + one
PRODUCT_IDENTITY_UPDATED envelope) and `addProductIdentifier` (+ one
PRODUCT_IDENTIFIER_ADDED envelope) commit atomically with operation-ID
replay and store-ownership checks; identity writes are column-restricted so
prices, settings, and variant ownership are unreachable. Exact-type barcode
uniqueness is cross-symbology by normalized digits (OFFLINE_SYNC section
29); the unreleased migration-2 index was corrected in place to
`(normalized_value)` before any device holds it. Detail screen supports
edit, identifier add with type choice, and field-mapped errors; no-match
search prefills Quick Add. Full validate green.

## Ticket M2-03: Configure packages with exact conversions

**Status:** Complete (committed)  
**Outcome:** A retailer can add a carton, pack, weight, or other package and see
an exact conversion to the product's base unit.  
**Blocked by:** M2-01 (complete)

**Vertical scope:**

- Add StorePackageSetting persistence for store-owned price and preferred
  sale/purchase behavior.
- Add package create/edit/deactivate application operations and Package UI.
- Enforce one active base unit, positive exact conversion, and store/variant
  ownership integrity in domain, application, and database boundaries.
- Version or deactivate package definitions that have acquired historical use;
  never silently rewrite completed transaction meaning.

**Non-goals:** Costing calculations, purchase/sale lines, inventory balances,
server reconciliation.

**Acceptance:**

- [x] Representative whole and fractional conversions round-trip through SQLite
      and display as canonical decimal text without binary-float drift.
- [x] The UI previews a sentence such as `1 carton = 40 pieces` before save and
      gives field-specific errors for zero, negative, excess-precision, or
      unsafe values.
- [x] Package plus store setting plus one outbox envelope commit atomically;
      deterministic failures leave no partial rows or orphaned envelopes.
- [x] Database constraints reject a second active base unit and cross-store or
      cross-variant package references.
- [x] Package component tests cover add, edit, deactivate, text scaling, labels,
      and Android Back handling for dirty forms.

**Evidence (2026-09-14):** `createPackage`/`updatePackage`/`deactivatePackage`
commit package + store price/preference setting + one envelope atomically
with operation-ID replay; conversion text parses to D-034 micro-units
(excess precision rejected); conversion is immutable after creation
(deactivate-plus-create); the active base cannot be deactivated and
preference falls back to it; prices use the store's currency; package form
shows the live conversion sentence, field errors, two-step deactivate
confirmation, and dirty-form Back/cancel confirmation. Full validate green.

## Ticket M2-04: Manage catalogue lifecycle without losing ownership

**Status:** Complete (committed)  
**Outcome:** A retailer can distinguish temporary, enriched, active, and
inactive products without losing store-owned data or history.  
**Blocked by:** M2-02 and M2-03 (complete)

**Vertical scope:**

- Implement active/inactive catalogue filtering and a clear Temporary marker.
- Allow a temporary product to be marked enriched while retaining its private
  provisional identity; leave later platform matching as an explicit future
  consolidation operation under D-035.
- Preserve StoreProduct and StorePackageSetting; make repeated operation IDs
  idempotent at the local application boundary.
- Complete Product list/detail states needed for M2 lifecycle behavior.

**Non-goals:** Platform-identity linking/consolidation, remote shared catalogue,
automated matching, recognition model, cross-store exposure, conflict resolution.

**Acceptance:**

- [x] Temporary and inactive states are visible in text, searchable through
      explicit filters, and never rely on color alone.
- [x] Enriching identity keeps local SKU, store selling-price fields, and package
      settings unchanged, and does not change the variant's owning store.
- [x] Reapplying the same operation ID cannot duplicate the logical mutation or
      outbox work; a different valid operation remains independent.
- [x] Deactivation requires confirmation, remains after restart, and retains the
      record for history; failure rolls back business and outbox changes.

**Evidence (2026-09-14):** `markProductEnriched` and `setProductActive`
commit lifecycle-only changes with one PRODUCT_LIFECYCLE_CHANGED envelope
each, with operation-ID replay (repeat returns the original; fresh IDs stay
independent) and store-ownership checks; enrichment preserves SKU, prices,
settings, and variant ownership by construction. List gains All/Temporary/
Active/Inactive text filter chips; detail gains the enrich action and
two-step deactivate/reactivate. Full validate green.

## Ticket M2-05: Prove the offline catalogue milestone

**Status:** Complete — branch returned for independent audit  
**Outcome:** M2 has reproducible evidence and a clean handoff for independent
audit before sales implementation starts.  
**Blocked by:** M2-01 through M2-04 (complete)

**Vertical scope:**

- Run clean install, typecheck, zero-warning lint, all automated tests, Expo
  Doctor, Expo dependency check, and Android export.
- Manually exercise offline create, restart, search, edit, package conversion,
  inactive filtering, and failure/recovery on the reference Android device when
  it is available.
- Review migration upgrade paths from a populated M1 database and ensure no
  secrets, generated databases, exports, or build artifacts are committed.
- Update tickets, workflow state, PROJECT_STATE, and milestone evidence; return
  the branch for independent audit.

**Acceptance:**

- [x] Automated checks are green from a clean checkout and exact counts/results
      are recorded rather than inferred.
- [x] Migration tests upgrade both fresh and populated M1 databases without
      reset, loss, duplicate rows, or false schema history.
- [x] Device evidence records actual build/device identifiers and clearly marks
      any unavailable check as blocked or explicitly waived rather than passed.
- [x] The final diff contains M2 scope only, documentation matches code, and M3
      has not started.

**Evidence (2026-09-14, after `npm ci`):** environment check passes,
typecheck passes, zero-warning lint passes, 126 domain + 131 mobile tests
pass (257 total, 22 suites), Expo Doctor 21/21, `expo install --check`
clean, Android export succeeds (2.9 MB bundle), `npm audit` unchanged at 1
low + 21 moderate pre-existing findings. Migration 2 is additive only (six
new tables plus indexes; no data rewrite) and the populated-M1 upgrade path
is tested. Device checks: the Galaxy A15 5G remains unavailable and no adb
tooling exists on this machine, so no device evidence is claimed; the
carried M1 device gate and rendered text-scaling verification stay deferred
and required before external beta/native release readiness. M2 diff is 61
files with no database, build, export, or secret artifacts; no sales,
purchase, inventory, sync-transport, or recognition code was added.

## Dependency Frontier

    M2-01 Offline temporary product
       |\
       | +--> M2-03 Exact packages --------+
       +----> M2-02 Search and enrich ------+--> M2-04 Lifecycle/linking
                                                     |
                                                     v
                                             M2-05 Acceptance/audit handoff

The deferred M1 Galaxy A15 5G check is a non-blocking carried gate for M2
implementation. It remains mandatory before external beta/native release
readiness and should be completed as soon as the phone is available.
