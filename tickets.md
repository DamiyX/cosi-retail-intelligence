# Tickets: M8 Unified Scanner + Barcode

**Status:** Source implementation submitted for independent audit; physical acceptance blocked.
**Plan:** `docs/engineering/M8_SCANNER_PLAN.md` is the scope/boundary specification.
**Workflow:** `.agents/workflows/m8-unified-scanner.json`.
**Baseline:** `c817edb` accepted M7 local source; carried device/release gates remain open.
**Execution:** One implementer; M8-01..04 source changes and M8-05 checks recorded. See M8_IMPLEMENTATION_EVIDENCE.md and M8_ANDROID_VERIFICATION.md. Unchecked criteria remain unaccepted, including physical rollout.

The M7 ledger is preserved verbatim in `docs/engineering/tickets/M7_OFFLINE_SYNC.md`.
Sources: BUILD_PLAN M8, PC-02, proposed DESIGN M8 states, SCANNING_ARCHITECTURE,
RECOGNITION_TEST_PLAN and D-017–D-022/D-030/D-034–D-037/D-042/D-044/D-045.
Common invariant: camera results cannot write stock, price, cost or completed sales.
Every ticket needs focused tests, strict typecheck and zero-warning lint before handoff.

## M8-01 — Scan a known item into the correct sale line

**Status:** Source implemented; independent audit and physical fast-add gate pending.
**Delivers:** an existing Sell flow can open the barcode camera, resolve a local
product/package offline and configure a line, with usable manual fallback.
**Likely modules:** contracts, scanning adapter/session/resolver, local identifier
queries, Sell screen, mobile config/dependencies and focused tests.

- [x] A provider-independent result contract supports STRONG, AMBIGUOUS and
  UNKNOWN; errors/cancellation remain distinct. Contract tests exercise real
  invalid states, not only TypeScript compilation. No speculative enrollment API.
- [ ] Expo Camera is confined to one adapter; only camera permission is requested.
  Preview runs only while foreground/focused. Unavailable, denied/permanently
  denied and disabled states offer search without loading a camera view.
- [ ] Known EAN-13/EAN-8/UPC-A and bounded exact QR mappings resolve only current
  store active products. Preserve zeroes, validate GTIN detection and evaluate
  UPC-A/zero-prefixed EAN-13 aliases together. QR raw differences cannot become
  false matches; scanned links never execute/open. Unsupported/long data falls back.
- [ ] Exact package is respected; missing package asks rather than assuming base
  or preferred. Inactive/wrong-product packages cannot enter the line. Multiple
  equivalent identities cannot be silently reduced to one result.
- [ ] Confirmation re-reads sellability and current price/package through the sale
  client. Existing exact arithmetic, immutable snapshots and completion own all
  effects. Late/cancelled/foreign-session results have no effect, including after
  store change. Zero recorded stock does not hide an active known product: show
  its recorded balance and retain existing sale rules without invented stock.
- [ ] Single-item mode offers quantity editing after one scan. Basket mode adds
  one unit for an exact conflict-free identity with explicit sellable package and
  known price, using existing line validation, and remains open for the next item.
  Show running count/total, last addition and Undo/edit; payment is always explicit.
- [ ] Duplicate-frame suppression is tested: stationary A-A-A adds one unit;
  deliberate A-B adds both; explicit A-again or quantity editing handles repeats.
  A timeout/focus change alone cannot rearm the same item. Missing price/package
  pauses for input. Wrong/unknown/conflicted results cannot enter the fast path.
- [ ] Successful additions have one short optional beep plus visible feedback;
  mute leaves feedback usable and failures never emit success. Torch is available
  when supported; no microphone/image retention. Any playback dependency receives
  native review. Device evidence in M8-05 gates automatic basket addition.
- [ ] Unit, real-SQLite resolver and screen tests cover these branches plus local
  read failure and unchanged cart. Existing sales tests remain green. Record
  dependency/version/license review; native behavior remains pending M8-05.

**Non-goals:** global navigation replacement, new catalogue mutations, visual model,
OCR, image storage, automatic sale completion, any new financial/inventory rules.
**Risk:** barcode aliases and legacy normalization; use safe fallback on ambiguity.
**Evidence:** Initial contract/resolver/session/scanner tests pass (6 tests), existing sale UI passes (21 tests), typecheck and focused zero-warning lint pass. See M8_IMPLEMENTATION_EVIDENCE.md. Audible feedback is now implemented and tested at source level; native feedback and automatic rollout remain pending. Ticket not accepted.

## M8-02 — Reach Scan globally without losing a sale

**Status:** Source implemented; independent navigation/accessibility audit pending.
**Delivers:** one labelled floating Scan on Today, Products list and More, and
full-screen selling with protected drafts and a clear manual entry.
**Likely modules:** root/tab routes, sale route/draft guards, Home/More/product list
entry, scanning presentation and navigation/accessibility tests. No migration.

- [ ] Today/Products/More remain tabs; Sell is a full-screen destination retaining
  `/sell`. Global Scan opens scanner mode in that sale session. Manual Sell/search
  and sale history remain reachable without granting camera permission.
- [ ] One global Scan is visible only on the allowlisted overview surfaces. Hide
  it for keyboard, forms, product detail, scanner, cart/payment, restock, counts,
  adjustments and sync screens. Contextual Scan next item remains inside the sale.
- [ ] Keep the original cart mounted across scan, unknown/search and return.
  Header/hardware/system back, cancel, direct routes and rapid navigation never
  bypass line/Quick Add/cart discard confirmation. Cancelled scanning preserves
  existing lines; completed receipt/history navigation is safe. Do not make drafts
  durable or claim crash recovery of unfinished carts under D-037.
- [ ] Missing/corrupt store context follows current safe setup/retry flow; camera
  cannot create a second store. New routes do not expose another store's data.
- [ ] Use existing tokens/components, labelled 48dp minimum touch targets, safe
  area and content padding; large text does not obscure search or checkout.
  Navigation tests cover the actual move from tab to stack and scanner disabled.

**Non-goals:** Reports tab redesign, global Add product action, scanner on every
screen, M9 price UI or a new visual identity.
**Risk:** existing sale state and draft guards are coupled to the Sell tab.
**Evidence:** See docs/engineering/M8_IMPLEMENTATION_EVIDENCE.md for executed checks and exact limitations.

## M8-03 — Keep selling when the code is unknown

**Status:** Source implemented; association rollout disabled by default pending backend migration and review.
**Delivers:** unknown scan can link an existing owned product/package or quickly
create a typed provisional product, return to the sale, and survive restart.
**Likely modules:** scanning fallback, Quick Add, catalogue application/client,
product-detail association, existing outbox commands and repository/UI tests.

- [ ] Unknown offers Search, Add product and Scan again. Never prefill a barcode as
  the product name. Preserve the detected code/type visibly; use minimal existing
  required fields. Cancel has no write; exiting a dirty form asks.
- [ ] Association is explicit and store-owned, checks current package/product
  status, and never rebinds a claimed value silently. A variant-only association
  remains valid but requires package choice on future sale. A known association
  to the same target is a safe no-op/replay rather than duplicate rows.
- [x] Typed optional identifier input preserves EAN/UPC/QR for new scanner callers;
  legacy Quick Add input remains compatible. New product plus optional identifier
  plus one PRODUCT_CREATED envelope is atomic. Existing-product link plus one
  PRODUCT_IDENTIFIER_ADDED envelope is atomic. Reuse operation ID on retries.
- [ ] Existing catalog paths apply the same bounded input/collision checks where
  necessary; scanner cannot be the only path protecting a new invariant. No QR
  lossy match, UPC/EAN alias duplicate, foreign-store detail leak or guessed package.
- [ ] Product saved/association saved state is truthful if refresh or later sale
  fails. A newly created product is fetched by ID rather than relying on a bounded
  search page; the existing cart and correct line configuration survive return.
- [ ] In basket mode unknown/None of these pauses scanning, accepts minimum short
  name and selling price (plus package/quantity when needed), adds the configured
  line and resumes the same basket. No readable barcode still permits manual
  quick creation. No repeated prompt/re-add from the paused detection on resume.
- [ ] A saved temporary product is discoverable through the existing Temporary
  filter and Complete details path after restart/days later. Enrichment preserves
  its ID and prior sales; missing cost/stock stays unknown rather than invented.
  Cancelled unsaved forms create nothing; cancelling a sale does not delete a
  product already explicitly saved. Visual enrollment is not required to sell.
- [ ] Real-SQLite rollback, restart, replay, double-tap, conflict/validation and
  component tests pass. Keep new scan-association rollout disabled until M8-04
  proves same-store sync compatibility; tests can explicitly enable it.

**Non-goals:** shared catalogue discovery/publishing, image enrollment, product
merging, deletion/reassignment of existing identifiers, manufacturer batch parsing.
**Risk:** legacy Quick Add currently hardcodes EAN; preserve existing envelopes.
**Evidence:** See docs/engineering/M8_IMPLEMENTATION_EVIDENCE.md for executed checks and exact limitations.

## M8-04 — Conflicting barcode assignments do not break synchronization

**Status:** Collision correction implemented and integration-tested; independent audit pending.
**Delivers:** two devices' new catalogue mappings converge or surface a recoverable
conflict; safe manual sales and unrelated synchronization remain available.
**Likely modules:** local sync materialization/conflict display, scanner exclusion
of disputed mappings, existing server apply boundary, additive migration if needed,
pgTAP and live Auth/Edge/PostgreSQL plus two-SQLite-client tests.

- [x] First reproduce the source-inspected gap with two offline same-store clients:
  different product/identifier IDs claim one raw value, a UPC/EAN equivalent, or a
  legacy-normalized QR collision. Exercise PRODUCT_CREATED and
  PRODUCT_IDENTIFIER_ADDED. Record observed result before any correction.
- [ ] Server applies at most one incompatible claim and returns explicit evidence
  for the other using the existing protocol; derive identity from validated raw
  data and bind it to the authorized store/variant/package. Replays do not add
  revisions/facts. Cross-store callers cannot see another store's conflict data.
- [ ] If needed, add the smallest server claim guard/projection as an additive
  migration; audit historical collisions before backfill and preserve history.
  Do not rewrite old migrations. Any new protocol/ownership/identifier-model
  requirement returns to the coordinator before implementation.
- [ ] On the losing client, preserve outbox/conflict evidence, products and completed
  transactions; do not mark it synchronized or silently reassign its mapping.
  Explicitly define and test quarantine/resolution of the conflicting identifier
  projection so a local unique-index failure cannot wedge unrelated pull work.
  Scanner excludes disputed identities and offers manual selection/review.
- [ ] A rejected new-product envelope's dependent sale stays durable and visibly
  blocked until recovery; never acknowledge it prematurely or change its snapshot
  to another product. Prove a safe owner recovery path or return a coordinator
  amendment before enabling association.
- [ ] Retry, reconnect, cold-start and fresh-device bootstrap do not duplicate
  mappings, skip unprocessed changes or resurrect an unsafe mapping. Existing
  M7 sync/reference/history/cost/batch tests pass. Existing local unique constraints
  and real PostgreSQL integration are part of the oracle, not mocked away.
- [ ] Run a scan-created-product -> offline completed sale -> sync -> second client
  lookup chain, preserving price/package/FEFO snapshots. Enable association only
  after this gate passes. Record any exact local/server migrations used.

**Non-goals:** broad M7 redesign, cross-store catalogue canonicalization, automatic
product merges or a general conflict-resolution product.
**Risk:** unsafe ambiguity can propagate into stock/price; source inspection alone
is insufficient evidence that the server or pull path handles it correctly.
**Evidence:** See docs/engineering/M8_IMPLEMENTATION_EVIDENCE.md for executed checks and exact limitations.

## M8-05 — Verify the scanner on Android and return it for independent audit

**Status:** Source checks recorded; physical verification blocked by unavailable device/native build.
**Delivers:** a reproducible handoff with explicit source and physical acceptance.
**Likely modules:** focused failure regression tests, device procedure/evidence,
plan/ticket/workflow state. No unrelated features.

- [x] Root validation, Expo dependency check/Doctor and Android export pass. Run
  local pgTAP/live-sync checks for M8-04. Record commands/results and exact source;
  retain baseline M2–M7 tests and explain any legitimate fixture changes.
- [ ] Resolve or precisely isolate the carried Galaxy A15 launch issue without
  deleting real data. Rebuild for the native dependency; record application ID,
  version/build/source, device/OS and development-versus-preview behavior.
- [ ] On the physical A15, cold launch and test permission denial/grant, airplane
  mode known/unknown/carton/package-less scans, repeated code, back/cancel,
  background/resume and completion -> force-stop -> receipt survival. Verify
  first-use detector availability offline after required store provisioning.
- [ ] Test a basket of several products, repeated identical units, unknown-item
  interruption/resume, missing price, zero recorded stock, Undo/edit, beep/mute
  and torch. A stationary code never increments repeatedly and exactly one
  completed sale contains the intended lines. Reopen and enrich a temporary
  product without changing its saved sale. Record actual fast-path false-add
  behavior before enabling it; no accuracy percentage is invented.
- [ ] Preview works without Metro; test 200% text scale and TalkBack reachability,
  controls not covered by keyboard/system UI, camera release and usable manual
  flow with scanner disabled. Record speed/size observations honestly; compare
  product-selection time with manual search rather than inventing benchmarks.
- [x] If device/build/tooling is unavailable, mark its gate pending/blocked and
  return source evidence promptly. Do not claim complete physical acceptance or
  keep repeating unchanged waits. No second phone is implied by a two-client test.
- [ ] Update tickets, PROJECT_STATE and workflow, send a concise final handoff to
  the coordinator and stop. Report commits, changes/migrations, passed/failed/
  deferred checks and risks. Coordinator performs independent audit; implementer
  does not accept its own work or begin another milestone.

**Non-goals:** M9 integration, M10, M12 production visual recognition, release.
**Evidence:** See docs/engineering/M8_IMPLEMENTATION_EVIDENCE.md for executed checks and exact limitations.

## Dependency and approval review

Coordinator checked five bounded outcomes against the actual code. Dependencies:
M8-01 -> {M8-02, M8-03}; M8-03 -> M8-04; all four -> M8-05. Serial execution
is an ownership policy, not an invented dependency between M8-02 and M8-03.
Founder delegated ticket granularity and approved the clarified scanner/native/
contract/navigation plan on 2026-09-29. Implementer: Astra low in one separate
chat; coordinator reviews only after handoff. No ticket is independently accepted yet; source work is available for coordinator review.
