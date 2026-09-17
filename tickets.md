# Tickets: M3 Offline Sales

These tickets deliver one reliable, exact, offline sale from local catalogue
selection through inventory effect, payment/credit truth, and durable history.

## Execution Contract

- First commit the accepted M2 audit corrections, then create `feat/m3-sales`
  from that commit. Do not implement M3 on the M2 branch.
- Execute M3-01 through M3-05 in dependency order. Keep strict typecheck,
  zero-warning lint, tests, Expo compatibility, and Android export green.
- Follow active D-036 and D-037 and the M3 section of `docs/design/DESIGN.md`.
- Sale completion is one atomic local transaction: Sale, SaleItems, Payment,
  optional credit records, InventoryEvents, and one aggregate outbox envelope.
- Update this file, `.agents/workflows/m3-sales.json`, and PROJECT_STATE with
  evidence. Stop after M3-05 for independent audit; do not start M4.
- Do not push, merge, deploy, link production services, or change approved
  transaction semantics without the applicable authorization and review.

## M3 Boundaries

- Use D-034 micro-unit quantities and D-036 exact sale arithmetic. Never use
  binary floating point as the authoritative source of quantity or money.
- Use D-037: in-memory draft cart, one tender allocation, explicit credit
  receivable, nullable pre-M4 cost snapshots, and immutable completed sales.
- Preserve D-013: a genuine offline sale remains valid even if derived stock
  becomes negative; surface the discrepancy for later reconciliation.
- Use the existing local StoreMember and Device for attribution and the existing
  outbox/replay boundary. M7 owns network synchronization.
- Scanner, recognition, restocking/costing, inventory reconciliation, split
  tender, partial credit settlement, printing, returns, void/reversal, tax,
  percentage/order discounts, and M4+ summaries are outside M3.

## Verified implementation evidence — 2026-09-17

M3 source implementation is complete and awaits independent audit; it is not
yet accepted for M4.

- Exact D-034/D-036 calculations, atomic local Sale aggregate/outbox capture,
  single-tender and credit truth, immutable sale history, and durable stored
  sync status have application, SQLite, and automated-test coverage.
- Because migration 3 was uncommitted and unshipped, its pending definition was
  corrected directly rather than appending migration 4. The populated-M2
  upgrade test proves no reset, loss, false history, or duplicate sales effect.
- `npm run validate` passed 143 domain and 169 mobile tests (312 tests in 25
  suites), with strict typecheck and zero-warning lint; Doctor passed 21/21,
  Expo dependencies are current, and Android export succeeded.
- M3 physical-device verification was deliberately not run in this pass. The
  preserved Galaxy A15 evidence is M1/M2-only and must not be used as M3 proof;
  M3 device verification remains a pre-beta/native-release gate.

## Ticket M3-01: Complete one cash sale offline

**Status:** Complete  
**Outcome:** A retailer can find one existing product, sell one configured
package for cash, and receive a durable local completion record with exactly one
inventory effect and one outbox operation.  
**Blocked by:** accepted and committed M2 baseline; `feat/m3-sales` branch

**Vertical scope:**

- Add exact sale-line calculation helpers for positive D-034 package quantity,
  conversion snapshots, integer-minor-unit price/discount, and D-036 totals.
- Add migration 3 and typed repositories for the minimum Sale, SaleItem,
  Payment, and InventoryEvent fields required by a completed transaction.
- Add one `completeSale` application operation that validates store, actor,
  device, product, package, status, sellability, currency, and snapshots before
  committing the aggregate and one `COMPLETED_SALE_CREATED` envelope.
- Replace the Sell placeholder with local product search, one-line
  configuration, cash review, completion, and a snapshot-based confirmation.

**Acceptance:**

- [x] Exact domain tests cover representative whole/fractional quantities,
      package-to-base conversion, price, discount, totals, overflow, zero,
      negative, excess precision, and fractional-minor/base rejection.
- [x] In airplane-mode-compatible tests, one active sellable package completes
      a cash sale; persisted sale/item/payment snapshots match the review; one
      negative SALE InventoryEvent and one PENDING aggregate envelope exist.
- [x] Store/variant/package/actor/device/currency mismatches and inactive or
      non-sellable choices fail before commit at application and database
      boundaries where enforceable.
- [x] Injected failure at every write boundary leaves no Sale, child, inventory,
      or outbox rows.
- [x] Repeating the same operation ID returns the original sale without
      duplicating any child, inventory event, or envelope; another store/device/
      operation cannot reuse it.
- [x] The UI prevents empty/duplicate completion, retains values on validation
      or local-storage failure, and shows success only after local commit.

## Ticket M3-02: Build and edit an exact multi-line cart

**Status:** Complete  
**Outcome:** A retailer can assemble and review a realistic multi-product cart
with package choice, flexible selling price, exact quantity, and line discount.  
**Blocked by:** M3-01

**Vertical scope:**

- Support multiple cart lines, active sellable package selection, preferred
  package defaults, exact quantity, package-specific/default/manual price, and
  absolute line discount.
- Let a retailer edit or remove a line and show deterministic subtotal,
  discount total, and total before payment.
- Offer the existing Quick Add path on no match and return the new temporary
  product to line configuration without requiring cloud/scanner data.
- Guard Android Back, Cancel, and tab exit when the in-memory cart is dirty.

**Acceptance:**

- [x] Cart calculation tests prove sum invariants, safe ranges, deterministic
      line replacement/removal, no authoritative floats, and no mutation of
      catalogue price/package records.
- [x] A multi-line completion snapshots each selected product/package,
      conversion, quantity, price, and discount and creates exactly one SALE
      InventoryEvent per line inside the same aggregate transaction.
- [x] Inactive products/packages, non-sellable packages, packages from another
      variant/store, zero/negative quantity, excessive discount, and values
      requiring hidden rounding cannot be completed.
- [x] Search/no-match Quick Add returns to Sell with the created product
      selectable; network, scanner, or recognition absence never blocks sale.
- [x] Component/navigation tests cover add, edit, remove, empty cart, totals,
      retained field errors, dirty-exit confirmation, large content scrolling,
      semantic labels, and 48dp actions.

## Ticket M3-03: Record all approved payment methods and credit truthfully

**Status:** Complete  
**Outcome:** A retailer can complete a sale by cash, transfer, POS/card, or
credit without reporting credit as cash received.  
**Blocked by:** M3-02

**Vertical scope:**

- Add BANK_TRANSFER and POS_CARD selection using one tender allocation equal to
  the completed sale total.
- Add the D-037 credit path with required customer name, lightweight
  CustomerAccount selection/creation without name-only auto-merge, and one OPEN
  Receivable for the credit amount.
- Include the tender and optional credit snapshots in the same sale outbox
  envelope and expose truthful completion/history labels.

**Acceptance:**

- [x] Cash, transfer, and POS/card each persist one Payment allocation equal to
      the sale total; invalid method/amount combinations fail atomically.
- [x] Credit requires a non-empty bounded customer name and atomically persists
      Payment, CustomerAccount, and OPEN Receivable whose original and
      outstanding amounts equal the sale total.
- [x] Cash-received queries exclude CREDIT while sale-total queries include it;
      tests prevent double counting and unsupported split/partial settlement.
- [x] Failure and operation replay cannot leave or duplicate customer,
      receivable, payment, inventory, sale, or outbox rows.
- [x] Payment controls have text labels and checked state; Credit explains the
      amount owed, retains customer input on failure, and never claims cash was
      received.

## Ticket M3-04: Recover and review completed sales

**Status:** Complete  
**Outcome:** Completed sales remain reviewable from local history after restart,
while incomplete carts and immutable-history limits are communicated clearly.  
**Blocked by:** M3-01 and M3-03

**Vertical scope:**

- Add recent sale history and sale detail using persisted snapshots, occurred
  time, tender method, total, item count, and honest local/pending status.
- Ensure catalogue renames, price changes, package changes, and later cost-state
  availability cannot rewrite an existing sale's display or totals.
- Complete loading, empty, restart, local-read-failure, negative-stock, large
  text, accessibility, and performance states for Sell/history/detail.
- Expose no edit/delete/void/return action for a completed sale in M3.

**Acceptance:**

- [x] Completed cash and credit sales survive database close/reopen and render
      from sale snapshots after linked catalogue identity/price changes.
- [x] History is scoped to the current store, ordered deterministically without
      treating device time as global sync order, and cannot expose another
      store's sale through an ID or replay path.
- [x] Derived inventory is reconstructable by summing InventoryEvents; a
      negative value is retained and labelled rather than deleting a sale.
- [x] Read failures do not claim missing/deleted history; retry recovers without
      writing or duplicating records.
- [x] Component tests cover scrollable large-text layouts, accessible line and
      payment summaries, local-save language, empty/loading/failure states, and
      the absence of destructive completed-sale actions.

## Ticket M3-05: Prove the offline sales milestone

**Status:** Implementation complete — independent audit pending  
**Outcome:** M3 has reproducible evidence and a clean handoff for independent
audit before restocking/costing starts.  
**Blocked by:** M3-01 through M3-04

**Vertical scope:**

- Run clean install, validation, Expo checks, Android export, migration upgrade,
  aggregate rollback/replay/ownership tests, and repository artifact review.
- On the Galaxy A15 5G, install the current build and exercise local store setup,
  catalogue creation, force-stop/relaunch, airplane-mode sale, inventory effect,
  history, credit truth, dirty cart, and rendered text scaling when adb tooling
  is available.
- Update tickets, workflow state, PROJECT_STATE, and durable decisions only when
  evidence warrants it; return the branch for independent audit.

**Acceptance:**

- [x] A clean `npm ci` installation (development dependencies included),
      environment check, strict typecheck, zero-warning lint, `npm run validate`
      (143 domain + 169 mobile = 312 tests / 25 suites), Expo Doctor (21/21),
      Expo dependency check, and Android export pass with exact results recorded.
- [x] Migration tests upgrade fresh and populated M2 databases without reset,
      loss, false history, or duplicate effects.
- [x] Automated evidence proves atomic sale aggregate/outbox capture, exact
      arithmetic, idempotent replay, store isolation, immutable snapshots,
      payment/credit truth, and reconstructable inventory.
- [ ] M3 physical-device evidence is deliberately deferred/blocked, not passed.
      Carried Galaxy A15 provisioning, restart, airplane-mode, and text-scale
      observations remain M1/M2-only evidence and are required again for M3
      before an external beta/native-release claim.
- [x] The final diff contains M3 scope only, no secrets/databases/exports/build
      artifacts, documentation matches code, and M4 has not started.

## Dependency Frontier

    Accepted M2 baseline + D-036/D-037 + M3 design
                         |
                         v
              M3-01 One cash sale
                         |
                         v
              M3-02 Exact cart
                         |
                         v
              M3-03 Payment + credit
                         |
                         +----------+
                                    v
                         M3-04 History/recovery
                                    |
                                    v
                         M3-05 Evidence/audit handoff

The Galaxy device gate does not block M3 source implementation, but it remains
required before external beta/native release readiness and should be completed
when the lower-cost device/tooling session is scheduled.
