# Tickets: M8 Unified Scanner + Barcode

**Amendment 2026-09-30:** D-047 authorizes price-first unknown-product selling
with a private identification photo. M8-06 and M8-07 below extend the existing
milestone. Native findings from HEAD 1e50d1b remain open; M8 is not accepted.

**Status:** Source re-audit and eight live PostgreSQL cases passed; isolated Galaxy A15 pass returned native findings on 2026-09-30; physical acceptance blocked.
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

**Status:** One authorized zero-additional-cost isolated APK installed and tested; scoped native evidence returned. Physical acceptance blocked by unexpected decoder values and remaining criteria. No second build authorized.
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

**Current native result (supersedes the build blocker below):** Correct Fanta
and AirPro EAN-13 additions, AirPro UNKNOWN/cancel with basket preserved,
physical torch, one audible addition beep, and manual offline NGN 4,000 sale
force-stop/receipt survival were observed. Three unexpected UPC/EAN values
paused UNKNOWN without extra lines; continuous stability is not passed.
Fanta's first addition was silent. Large-text evidence is partial; TalkBack
tutorial blocked the sample and font change lost the unfinished cart.
Composite acceptance checkboxes remain unchecked. Standalone preview,
first-use offline detector, broader code/package cases and other missing
criteria are explicitly listed in M8_ANDROID_VERIFICATION.md. Settings restored,
Metro stopped, app/data preserved; coordinator owns review and acceptance.

## Dependency and approval review

Coordinator checked five bounded outcomes against the actual code. Dependencies:
M8-01 -> {M8-02, M8-03}; M8-03 -> M8-04; all four -> M8-05. Serial execution
is an ownership policy, not an invented dependency between M8-02 and M8-03.
Founder delegated ticket granularity and approved the clarified scanner/native/
contract/navigation plan on 2026-09-29. Implementer: Astra low in one separate
chat; coordinator reviews only after handoff. No ticket is independently accepted yet; source work is available for coordinator review.


## Audit pass 1 corrections

Source e5b23ff fixes cancelled scan-intent leakage with nine scanner-sale regressions, adds two passing worker protocol-fixture recovery cases and two actual-route verification cases, and provides an isolated default-off-for-release verification build. Current routing statuses are corrected. Root and focused checks total 543 passing tests; typecheck/lint/export pass. Two new live PostgreSQL worker cases are environment-blocked, not accepted. Read M8_INDEPENDENT_AUDIT.md and the tracked M8_IMPLEMENTATION_HANDOFF.md. No physical or independent acceptance is claimed.


## Live database follow-up — 2026-09-30

Both scannerWorker.postgres cases and all six scannerSync.postgres cases passed: 8/8, two suites, exit 0, rollback-only migration injection against the existing disposable database. The earlier Docker-blocked test gap is resolved for this scope. No production source changes or physical/native verification; coordinator owns acceptance and the next sequential phone step. See M8_IMPLEMENTATION_EVIDENCE.md.

## Phone utility follow-up — 2026-09-30

Directly confirmed the SM-A156E Android 16/API 36 connection and observed
existing preview Home/development launcher. No compatible M8 APK exists in the
inspected artifacts/EAS history; installed development lacks CAMERA permission,
and local Java/Android SDK tools are unavailable. Historical dev launch logs
were inspected without clearing data; that failure did not recur in one current
launch, and root cause remains unverified. All M8 physical criteria stay
unchecked. Build quota/cost review and separately authorized isolated build are
the next prerequisites. See the superseding stopped handoff in
M8_ANDROID_VERIFICATION.md; no acceptance gate is self-approved.

Coordinator amendment tickets (the published M8-01..05 ledger is retained):

## M8-06 — Sell an unfamiliar item without typing its name

**Status:** Source implemented; independent audit and physical acceptance pending.  
**Blocked by:** Returned M8-03/source correction baseline; already available.  
**Delivers:** unknown/no-code sale creation accepts selling price as the only
required typed product field, retains the same basket and enriches the same product later.

- [ ] Name, cost, SKU, description and unit typing are absent from the normal
  selling shortcut; quantity defaults to one sold unit and remains editable.
- [ ] Nonempty generated distinguishing labels use stable product IDs, not
  names as keys; ordinary catalogue creation still works as before.
- [ ] Exact price validation, temporary graph/outbox atomicity, operation replay,
  existing association gates and no invented stock/package conversion are preserved.
- [ ] Cancel/retry/repeat/unknown-search return preserve existing basket and never
  leak an abandoned identifier; no extra line appears from rapid duplicate taps.
- [ ] Later naming/enrichment preserves identity and immutable sale snapshots;
  wording distinguishes completed sale from unfinished product details.
- [ ] Focused UI/SQLite regression tests, typecheck and zero-warning lint pass.

## M8-07 — Identify unfinished products with a saved photo

**Status:** Source implemented; amendment corrections independently re-audited at adc8b8f. Native photo acceptance pending.  
**Blocked by:** M8-06.  
**Delivers:** one explicit whole-product photo accompanies price-first selling
and is visible in the temporary-product completion path after restart.

- [ ] Clear photo/price flow without mandatory name typing, simultaneous camera
  previews, silent capture, OCR or visual identity claims; no-code flow supported.
- [ ] One bounded store-private file survives restart outside cache, with durable
  metadata tied to stable product identity; reads/replacements reject other stores.
- [ ] Staging/transaction failures, retry/replay, cancel and missing files have
  tested recovery; no dangling saved reference or deletion of committed photos.
- [ ] Camera denied/storage failure allows retry or Continue without photo,
  with a truthful missing-photo state; completed sale remains atomic/durable.
- [ ] Temporary list/detail/Complete details show the photo and permit enrichment
  without rewriting transaction snapshots. No bytes/device URI in business sync.
- [ ] Device-local retention limitation is visible/documented; no claim of cloud
  backup or cross-device photo restore. Public uploads and recognition enrollment excluded.
- [ ] Existing installed native module compatibility is checked before proposing
  APK rebuild; no extra build submitted. Focused tests and root validation,
  Expo Doctor and Android export pass; physical capture/restart remains separately verified.

**Coordinator sizing review:** two end-to-end slices, sequential 06 -> 07. Founder
previously delegated technical granularity. Acceptance remains coordinator-owned.

---

## M8-08 — Show when the scanner is actively looking

Status: Source implemented at e71674c; independent audit/native appearance pending. Sequential M8-07 ownership dependency satisfied.
Delivers: four corner brackets and a restrained up/down scanning line help retailer frame the barcode and understand that the live scanner is active.
Acceptance:
- Four clear corner markers and sweeping line appear over live barcode preview without obscuring codes or torch/back/mode controls; overlay does not consume touches. Use existing animation facilities/dependencies, no new native package.
- Animation runs only when camera is mounted/ready, screen focused, app foreground and scan session accepting detections. Stop/freeze or hide while UNKNOWN/AMBIGUOUS/confirmation/photo capture, processing, permission-denied/error, paused, background or unmounted; no dangling timers/animation loops.
- Animation is an activity indicator, NOT percentage/progress, success or a promise of recognition. Honest status copy distinguishes active scanning, checking and paused/result states. A framing guide is NOT a claimed restricted detector ROI unless actual implementation constrains it; do not change detection scope here.
- Respect system reduced-motion with static framing/status; decorative brackets/line do not create repeated TalkBack announcements. Accessibility/large-text/contrast remain usable.
- Existing duplicate-frame latch, exact resolution, single/basket choices, basket totals, unknown pause/return, photo/price flow and explicit payment unchanged. Moving line never generates product additions or feedback itself.
- Focused lifecycle/status/reduced-motion UI tests and strict typecheck/zero-warning lint pass. Native appearance/continuous-basket behavior remains unverified until later phone pass, not inferred from animation.

## M8-09 — Offer optional online product details after local lookup

Status: Source implemented; amendment corrections independently re-audited at adc8b8f, fresh593 tests/export passed. Native/provider acceptance pending. Live provider DISABLED.
Blocked by: M8-06..08 for sequential ownership; contact/licensing/transport/provider-smoke review for live activation.
Delivers: unconfirmed inline catalogue suggestions from a narrow replaceable GTIN-only adapter; photo/price checkout never awaits internet.

Acceptance:
- Local known mapping wins; no-code, invalid checksum, QR/URL/private codes make no external requests. Sale graph/price/photo and same-basket return remain immediate.
- Ordinary Add can show name/brand/size/source + Use details/Edit/Dismiss; Temporary details retain suggestions for later completion. Explicit selection fills actual editable values; Save reuses existing identity command. Provider never changes package conversions/prices/cost/stock/identifiers or historical sale snapshots automatically.
- Store/product/name/version/identifier/enriched/cancel/lifecycle guards reject stale work; dismissals and corrections persist. Lookup-only metadata remains outside the business outbox.
- Five-second timeout, one active request, deduplication, bounded positive/negative cache, persistent ten/minute and hundred/day budgets, backoff and manual retry; no scan-frame/search flood or OS background scheduler.
- Provider comparison records precise API version/docs discrepancy, cost/account/coverage/accuracy/licensing/attribution/privacy/rates before selection. No account signup, form, email, scraping, paid plan or remote images. Missing public contact/reuse review keeps live integration disabled; representative provider smoke not claimed.
- Real SQLite + boundary/UI tests and fresh root validation, Doctor and Android export. Native/provider tests remain separately unverified; M8 acceptance is coordinator-owned.

SDK57 maintenance return (2026-09-30): runtime824b2af aligns camera57.0.6/constants57.0.20/router57.0.24 and Router's required existing @expo/ui57.0.21 patch. Fresh593 tests, all workspace typecheck/lint, Doctor21/21, dependency check and Android export pass; eight opt-in PostgreSQL tests skipped. Current source handoff awaits coordinator compatibility review; existing APK/native/provider gates and PC-10/11/12 proposal status unchanged. See M8_IMPLEMENTATION_HANDOFF.md; no new feature or native build.

## M8-10 — Recognize the next deliberate scan and give honest feedback

Status: Source implemented under D-049; 25 focused tests, mobile typecheck and zero-warning lint pass. Native first-beep/stability and independent acceptance remain pending.
Blocked by: Existing M8-01/02/08 source; no new schema or provider prerequisite.
Delivers: reopening a scan accepts the same product, Single cancellation returns to scanning, and sound matches the current mode without a second beep.

- [ ] Actual Sell-route tests demonstrate same-code recognition after explicit Scan next item following Single cancel and successful addition; Basket stationary duplicates and passive focus/background resume remain suppressed, stale callbacks cannot add and existing cart/unknown-association cleanup survives.
- [ ] Scan-origin Single cancellation (including confirmed dirty/back exit) returns directly to scanner; cancelled discard leaves the form, manual cancellation retains its behavior, and completed-payment/navigation exits never accidentally reopen the camera. Existing basket is preserved.
- [ ] Single safe match gives one optional recognition beep and honest not-yet-added status; automatic Basket known addition gives one beep after validated addition during the scan. A valid current UNKNOWN/AMBIGUOUS barcode/QR result gives one distinct neutral code-read cue before photo/price entry, not a product-match/addition cue. Later known/unknown form Add to cart/Add to basket is silent. Invalid/duplicate/stale detections and failed lookup/write, muted/background/unmounted state never play success feedback. No-code photos do not imply recognition. Inspect first-use audio load/seek readiness before changing the hook; bounded cancellation prevents delayed/stale sounds and audio never blocks checkout.
- [ ] Add failing-before/fixed-after route regressions plus audio first-ready/delayed-ready/mute/release/failure tests as justified by actual source mechanism. Focused tests, strict typecheck and zero-warning lint pass with actual evidence. No native first-beep/stability acceptance inferred from mocks; physical retest remains pending.

Out of scope: decoder/ROI redesign, automatic timeout re-arming, recognition model/OCR, new audio/native dependency, cloud build or provider/backend enablement.

## M8-11 — Accumulate compatible products within the same basket

Status: Source implemented under D-049; 30 focused tests and mobile typecheck pass, corrected import-order warning and fresh zero-warning lint pass. Independent/native acceptance pending.
Blocked by: Existing M3/M8 draft paths. No semantic dependence on M8-10, but ownership is sequential 10 then 11 because both extend the Sell flow.
Delivers: five deliberate identical scans show one row with quantity five; Fanta quantity ten plus one deliberate addition shows eleven; alternating Fanta/AirPro leaves two compatible rows.

- [ ] Scanner auto-add and new configured additions use one tested draft rule: merge only matching store product/variant/package/conversion/unit price/descriptive snapshots, zero discounts and safe exact combined quantities/calculations whose totals/base quantity equal prior plus incoming. Reuse centralized money/quantity utilities. Differing commercial/snapshot facts or rounding-sensitive calculations remain separate; overflow rejects before mutation and preserves basket.
- [ ] Editing a row replaces its quantity without double accumulation. Undo of the latest scan increments restores prior quantity and totals rather than removing the whole merged row; protect subsequent edits/removals/checkout/new-sale state from stale Undo. A new-row Undo removes only that addition. Last-added/running-count text accurately reflects the resulting basket.
- [ ] Actual-route tests cover repeated and alternating scans, configured quantity10+1, package/price/discount distinctions, fractional exactness/rounding distinction, overflow, edit and incremental Undo. Existing temporary-product photo/price retry and cancellation behavior remains intact. Completing the merged draft produces correct immutable sale-line snapshots, quantities, inventory effects and one outbox operation; replay remains idempotent.
- [ ] Focused tests and complete root validation pass; Expo Doctor/dependency check/Android export run once after the final source changes. Record only actual results. Device confirmation and the separate unresolved storage-handle failure remain required; no physical or standalone gate is waived.

Out of scope: combining completed transactions, discount allocation redesign, package normalization, schema/migration, costing or sync changes, draft persistence across process restart, multi-photo enrollment, cloud build/push/deployment.

## M8-12 — Identify products by their photos across catalogue and selling

Status: Source implemented under D-050; 19 focused tests/three suites and mounted-snapshot regression passed. Mobile typecheck and zero-warning lint passed. Independent/native acceptance remains pending.
Blocked by: Existing M8-07 private-photo storage. No semantic dependence on M8-10/11; execute after them to preserve sequential ownership of the Sell flow.
Delivers: named and unfinished products with photos are visually distinguishable in catalogue, sale search, basket and detail; tapping a thumbnail shows the whole photo. D-050 extends the original temporary-cart request.

- [ ] Catalogue/sale-search/cart/detail resolve the existing store-scoped photo for temporary AND enriched products by product identity, with thumbnail and product name (compact Unfinished product label for generated-name cart entries), plus quantity/price where applicable. UUID suffixes are not primary visual identification. Preserve unique generated stored labels and historical receipt snapshots; no mandatory name, new migration, upload, remote image or business-outbox photo field.
- [ ] Tap-to-enlarge uses a dismissible accessible image view with explicit Close, Android back, appropriate focus/large text and no basket mutation. Thumbnail press is distinct from row selection/Edit/Remove. Existing Temporary catalogue/detail photo display stays consistent; enrichment retains the image. Photo acquisition is M8-13; multi-view recognition is excluded.
- [ ] Missing/damaged/no-photo states have a usable honest fallback; switching products/stores never reuses a stale image. Read-only lookup/verification errors do not block selling. Bound photo lookup/checksum work rather than repeating native file inspections on every price/quantity/total render or scanner frame; preserve file-integrity/privacy contracts.
- [ ] A catalogue with hundreds/thousands of stored photo-bearing products does not eagerly decode every image or load all image bytes into JS. Bound visible/paged image work using existing list patterns; verify repeated renders do not reread/rechecksum every asset. No unmeasured smoothness/low-memory claim; native scroll/display checks remain separate.
- [ ] Component/actual cart/catalogue/search regressions cover two different temporary products/photos and a named/enriched product, enlarge/close/back, no-photo/damaged fallback, enrichment and unchanged receipt descriptions/quantities/prices. Focused typecheck/lint/tests pass; run final root validation/export once after the full correction packet. Native photo creation/attachment/restart remains a separate required gate; founder-reported successful creation is not formal acceptance.

## M8-13 — Add or change a product thumbnail through normal onboarding

Status: Founder requested October1; D-050 and coordinator-delegated sizing. Not implemented/tested. Source edits remain held during phone exploration.
Blocked by: Existing M8-07 camera/private-photo persistence; M8-12 provides the consistent presentation. Execute after M8-10..12 under the same sequential source ownership.
Delivers: an ordinary named product can be created with a photo; an existing named/temporary/enriched product can receive or replace its photo without repeating product creation.

- [ ] Ordinary Add product offers visible Add product photo, preview and Retake using the existing camera/service; no-code/price-first selling keeps its approved low-typing flow. Saving a new named product with a staged photo attaches it through the existing atomic creation command; retries do not duplicate product/outbox/photo. Skipping or denied-camera/missing-module fallback still permits product creation and selling.
- [ ] Existing product detail offers Add photo/Change photo for either temporary or enriched records. Use existing store ownership, readiness checks and transactional replacement. Cancel/failed staging/save retains the old attachment; cleanup never deletes committed/replayed assets and conservatively reclaims only unreferenced staging. New image appears after refresh, enrichment retains it, old receipt descriptions/prices/quantities remain immutable.
- [ ] All NEW ordinary/unknown thumbnail captures and replacements satisfy D-050's actual encoded limits before durable attachment: JPEG, preserved aspect/orientation, long edge<=1024px, hard<=307200bytes, normal tuning target50–150KiB. Existing camera is currently<=2048/quality0.65 with8MiB acceptance; quality-only changes do not satisfy the byte cap. Inspect existing SDK size/encoding options before implementation; bounded same-capture encoding is preferred over automatic re-capture or new native packages. Unsupported/oversized/error/cancel/stale work keeps old attachment or allows honest no-photo selling; never persists a large original as a fallback thumbnail.
- [ ] Legacy valid images up to their prior8MiB bound still display/read/replay unchanged; separate new-write policy from legacy integrity checks. New staging enforces bytes/dimensions even if UI/native mocks bypass camera choices. Only the bounded image is durable; tracked capture/encoding temporaries are cleaned safely on success/cancel/failure without deleting unrelated app cache or committed attachments. Test actual just-below/at/above size boundaries, oversize/high-detail input, orientation, stale callbacks, disk errors, replacement rollback, cache cleanup and legacy compatibility. No arbitrary batch rewriting of existing assets or recognition-reference compression.
- [ ] Focused repository/UI tests cover ordinary named creation/photo/retry, existing-product replacement, cancel/failure, cross-store rejection, missing native module/permission, stale/unmounted callbacks and no new photo data in business-sync envelopes. No new camera/media library, schema, gallery-picker scope, upload/backup or reference enrollment; privacy and bounds remain D-047.
- [ ] Strict typecheck/zero-warning lint/focused tests pass; final combined validation/export follows this ticket. Native normal-onboarding/replace/relaunch and Fanta/AirPro thumbnail fixture completion require a later authorized phone pass. Do not operate on the founder's current live phone/session or claim native evidence during source work.

Compression evidence before acceptance: actual encoded bytes/dimensions and staging
cleanup, readable representative product previews/enlargements, and measured
capture/display overhead on available devices. Target sizes are not passed tests.

## M8-14 — Show discounts separately in Today's Summary

Status: Founder requested October1, PC-14; bounded correction to existing M6 summary in the current founder-feedback packet. Not implemented/tested; exploration hold released by founder through verification chat.
Blocked by: Existing completed-sale/summary data only. Execute after M8-10..13 for sequential ownership, not because scanner logic is a semantic prerequisite.
Delivers: retailer sees today's total Discounts given and understands Sales value is after discounts; summary remains compact.

- [ ] Aggregate existing immutable completed-sale discount totals with the current authorized store-local-day/currency query and safe-integer utilities. Show Discounts given and label existing sales value as after discounts; do not subtract discounts again from net sales or tracked margin/expenses. No migration, sale write, accounting/costing change or product ranking redesign.
- [ ] Cover mixed discounted/undiscounted, paid/partial/credit completed sales, empty day, other stores/days/drafts exclusion, timezone boundaries, arithmetic overflow and refresh after completion. Existing receipts/history retain individual line detail; no crowded per-product discount dashboard. Older completed records remain readable.
- [ ] Summary data and component tests prove exact discounted amount and unchanged sales value/cost coverage/margin/withdrawals/expense semantics. Focused tests/typecheck/lint and final combined root validation/export pass with actual evidence. Native display/refresh remains a separate phone check; no device evidence inferred from mocks.
