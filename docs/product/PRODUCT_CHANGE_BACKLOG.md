<!-- M8 approval checkpoint 2026-09-29: founder approved the clarified plan, DESIGN and M8-01..05 (D-046). Earlier pending-review wording below is historical. One Astra low implementation chat; coordinator reviews after handoff only. -->
# Product Change / UX Backlog and Impact Review

**Updated:** 2026-10-01. **Owner:** coordinating product/planning/audit task.
**Status:** PC-03/PC-05/PC-06 are accepted in M5; PC-01/PC-01a and the M6 Home
promotion of PC-05 are accepted in M6. Physical release-readiness checks remain
carried. Future UX ideas retain their documented gates.
**Verified baseline:** accepted M6 source on
`feat/m6-expenses-business-summary`, including coordinator correction `1d8124c`.

This is the single disposition/backlog for the founder's structured ideas,
raw transcript and external architect feedback. It routes to approved sources,
not another schema/design authority. Durable M5 decisions are D-039/D-040;
PRD, DOMAIN_DATA_MODEL, TECHNICAL_ARCHITECTURE, OFFLINE_SYNC and DESIGN now
hold the resulting specifications. The M5 plan/tickets/workflow hold execution.

## Product intent

Home should answer: What happened today? What needs attention? What should I
 do next? Keep a familiar calm operating surface with deeper detail in Reports.
Founder layouts are strong UX hypotheses, not pixel instructions. Progressive
catalogue/inventory enrichment must preserve immediate sell-first value.

## Change mapping and disposition

| ID | Requirement / disposition | Milestone and gate |
| --- | --- | --- |
| PC-01 | Live Today count and sales value after completed sales; sales value is not profit or cash received | Accepted M6 source; stored completed totals over the store-local day, full-range exact query and focus/resume/rollover refresh |
| PC-01a | Optional one popular product; deeper rankings in Reports | Accepted M6 source after audit correction: “Most frequently sold today” by distinct completed sales containing product with stable ties |
| PC-02 | One prominent accessible floating Scan on suitable major surfaces; no second global product + and no permanent Sell tab once scanner is delivered | M8 proposal prepared 2026-09-28 in M8_SCANNER_PLAN and DESIGN; founder design review pending. Preserve manual/search fallback, dirty sale state/history/deep links and accessible reachability; hide in scanner/cart/payment/restock/count/edit/keyboard flows |
| PC-03 | Blind-first count -> compare -> optional recount -> confirm difference/reason -> real reconciliation; matching check has no zero event | Approved M5, D-040; retains first/recount facts and protects event/batch watermarks while trading |
| PC-03a | Rotate quick/easy, moving and not-recently-checked stock using extensible policy | Approved simple M5 selector; advanced risk/value/discrepancy/recent-restock/random scoring future, no permanently fixed three classes |
| PC-03b | Default around three checks/day, configurable/pausable, shop-local morning/afternoon/preclosing intent | Approved M5 foreground due windows/settings; unfinished work survives day rollover; background notification delivery separately scoped |
| PC-03c | Reasoned replacement, repeated attempts auditable, no automatic suspicion | M5 owner history; M11 staff review/notifications. Physical zero against recorded positive stock is a discrepancy, not silently skipping it; exhausted pools remain valid |
| PC-04 | Different staff assignments and owner review; later independent same-product checks | M11 after M7 coordination; keep first evidence, authorized reviewer control and factual behavior rather than fraud accusations |
| PC-05 | Compact Needs attention / See All with Restock and durable Snooze; no card flood | M5 real local list; M6 Home promotion. Low/zero/negative/discrepancy/expiry conditions, resolution/worsening/due behavior; snooze never mutates stock |
| PC-05a | Review unresolved discrepancies rather than leave resolved history urgent | M5 list/M6 Home; accurate progress and check dates, no business/report “100% accurate” badge or report lock |
| PC-05b | Expiry attention from surviving recorded stock, not old receipt reminders | Approved first-pilot M5 list, M6 Home; inferred remaining wording, month/day precision, unknown coverage, actual removal/reconciliation actions |
| PC-06 | Multiple expiry groups per product; optional printed numbers, internal IDs, automatic assumed FEFO without ordinary checkout confirmation | Approved D-039; M5 receipt/sale extension, unknown residual, progressive physical classification; costing stays D-027/D-038/D-040 |
| PC-07 | Important replacement-cost/personal/market movements on Home | M9 personal/M10 market; real comparable observations, coverage/freshness/consent; no simulation in M5/M6 |
| PC-08 | Scan while selling; single-item and continuous basket modes; progressively complete catalogue and guided visual enrollment | Founder clarification 2026-09-28 below; barcode/QR sale, basket mode, feedback and temporary completion path in M8 proposal; visual/OCR/guided enrollment in Recognition Track B and M12 |
| PC-13 | Explicit same-code re-entry, Single recognition beep, first-beep investigation and compatible repeated draft quantities | M8-10/11 source reviewed at8efb1e0; native intermittent Single/silent Basket sound remains unresolved; latest exploration hold prevents runtime changes |
| PC-14 | Show today's discounts separately from sales value | M8-14 source reviewed at8efb1e0; current phone labels observed, discounted-checkout arithmetic/retention still needs native verification |
| PC-15 | Product thumbnails across list/search/cart/detail, tap-to-enlarge and normal Add/Change photo controls | M8-12/13 source reviewed at8efb1e0; native photo/capture/replacement/retention/accessibility checks remain pending |
| PC-16 | Small predictable thumbnail storage and bounded display work | M8-12/13 source enforces new300KiB/1024px limits and legacy reads; actual size/clarity/overhead still requires native measurement; recognition budgets separate |
| PC-17 | Compact checkout, product language, scoped edit cancellation and inline quantity controls | Founder explicitly deferred October1 until scanning is finished; preserve as later sales/checkout work, outside current M8 corrections |
| PC-18 | Bargained reductions shown as discounts, higher prices allowed and below-cost protection | Founder explicitly deferred October1 until scanning is finished; future pricing/cost-reference review required, outside current M8 corrections |

## PC-17 — Keep checkout compact and product edits local

Founder feedback, 2026-10-01, while independently exploring the current app:

- Checkout should show the basket, totals and payment/completion controls without
  forcing a scroll through the catalogue. Remove the inline search/results list
  from that final surface; a compact Add another item action opens a distinct
  product picker/search and returns to the SAME preserved basket after selection
  or cancellation. Do not delete manual product selection or require scanning.
- Use product-facing language: Edit product, Product discount and equivalent
  product/item wording where line currently means a basket item. Internal sale
  line types/schema are not renamed for copy alone.
- Cancelling/discarding one product edit restores that row's previous values and
  returns to the basket; other rows, prices, quantities and payment input survive.
  Keep editing leaves changes in place. Whole-sale discard remains a separate,
  explicit action, never a hidden consequence of leaving one product form.
- Quantity belongs directly on each cart row: decrement, current quantity and
  increment, with direct numeric entry by tapping the quantity for large orders.
  Preserve supported fractional package quantities, exact arithmetic, overflow
  rejection and clear zero/removal handling; do not silently round or discard a
  row. Price/discount editing remains separate and accessible.

Read-only source evidence: SellScreen's dirty line draft currently publishes
discardSaleDraft to the route guard; SellRoute's usePreventRemove consumes it
before leaving the route. saleDraftExitCopy explicitly describes discarding both
line AND sale. The local confirmDiscardLine/cancelLineConfiguration path instead
closes the form while preserving the cart. This distinction is a credible source
explanation, not proof of the founder's exact control sequence. Confirm header,
Android back, local Cancel and tab exit independently rather than replacing all
exit semantics with a blanket guard bypass.

Disposition: **founder-deferred until scanning is finished**, not implemented.
This supersedes the earlier proposed M8 correction placement. Ending the live
exploration hold does not authorize starting this deferred sales/checkout work.
Coordinator owns the smallest separate plan/ticket/flow update when revisited.
Actual-route regressions must cover multiple products, unsaved edit cancellation
through each relevant exit, existing-row quantity changes and stale Undo, picker
return/cancel, exact totals/snapshots, keyboard/large text/accessibility, and
payment access for a large catalogue. No business migration is presently implied.

## PC-18 — Make negotiation visible without inventing costs

Founder feedback, 2026-10-01: a negotiated reduction from NGN5,000 to NGN3,000
should be visible as a NGN2,000 discount per unit, rather than hiding it by simply
rewriting the reference price. Selling above the reference price remains allowed;
there is no upper selling-price cap. The founder also requests protection against
selling below cost, with a clear explanation. The final request retains both
selling-price and discount editing; quantity moves to the cart under PC-17.

Disposition: **founder-deferred until scanning is finished**, with durable
accounting/product choices still unresolved. Outside current M8 corrections;
do not implement a blanket cost-floor block during scanner diagnosis.
Existing D-036 persists unit price plus an absolute per-sale-row discount in exact
minor units. For several units, a per-unit negotiated reduction must become the
correct whole-row discount without double subtraction. Preserve original reference
and confirmed sale facts, historical snapshots and M8-14's already-net summary;
do not rewrite catalogue price/history merely because one sale was negotiated.

Coordinator must resolve the reference (catalogue/package price versus the row's
prior confirmed price), increased-price handling, interactions with a separately
entered discount and quantity changes, and exact fractional-money validation.
Cost protection must use an explicitly approved store/package cost reference and
unit conversion: latest replacement cost is not automatically historical/weighted
COGS, and FEFO quantity allocation is not financial costing. Do not treat an
unknown/unavailable cost as zero or force cost entry during price-only temporary
selling. A universal rejection rule would conflict with the approved sell-first,
enrich-later/unknown-cost flow unless that exception is resolved explicitly.
No accounting/costing decision, schema, domain enforcement or founder approval of
an unresolved cost definition is asserted by this backlog entry.

When separately resumed after scanning: propose the smallest compatible rule and any genuinely blocking founder
choice before updating DECISION_LOG/PRD/architecture or implementing a financial
guard. Tests must exercise reduced/increased/reference prices, one/several and
fractional package quantities, explicit discount interaction, quantity edits,
known versus unknown costs, store/currency isolation, exact completed snapshots,
replay and summary totals. UI-only validation cannot establish a durable financial
invariant. Keep all runtime changes on hold while the founder explores.

## PC-13 — October 1 scanner exploration corrections

Original founder wording was verified in the phone verification chat and supplied
directly to coordinator. D-049 is the approved behavior authority; M8-10/11 hold
execution and regression criteria. Do not duplicate their full specification here.
First-addition silence is an unresolved native observation, not a proven load-race
cause. Separately, unknown photo/product creation hit a native DB-handle failure;
the clean UI-only restart test remains incomplete. Both native gates remain open.
Founder explicitly remains exploring: retain the current app/Metro session and
hold source changes until that session ends.

Additional October1 sound clarification: unknown barcode should give a neutral
code-read cue before photo/price input, rather than first beeping at Add to basket.
D-049/M8-10 now distinguish this from a known-product match/addition cue, with no
second form-submit beep. No-code photo capture remains separate from recognition.

## PC-15 — Product photos for identification and onboarding

Founder reports temporary creation now working in their independent exploration;
exact storage/photo/restart discriminator is still unverified. Current generated
label suffix is the last twelve characters of the StoreProduct ID, not an image
number. Existing identification photos display in catalogue/detail, but current
cart rows display product text without that photo and offer no photo enlargement.

Founder subsequently clarified the scope applies to all products, not only unnamed
temporary ones. Fanta/AirPro test fixtures lack photos because fixture creation
supplied name/code only. Ordinary Add product also currently exposes no photo
control, and existing detail has display but no add/change-photo action.

Requested delivery is all-product thumbnail/name presentation across catalogue,
sale search/cart/detail, compact unfinished label where appropriate, quantity/price
and tap-to-enlarge, using existing private store-scoped attachments. Normal creation
offers a photo control; existing detail allows Add/Change photo using the existing
camera. D-050 is the approved scope, M8-12/13 the execution ledger. Keep generated identity and receipt snapshots;
do not rename historical sales to current enriched descriptions. Missing/no-photo
cases remain valid and do not block selling. New physical-test product preparation
should include a thumbnail; existing Fanta/AirPro photo completion waits for the
next authorized phone pass, not interruption of independent exploration.

Founder reiterated that guided multi-angle reference enrollment should also be
available for barcode/QR-bearing products, not only unbranded/no-code ones. That
recognition requirement was already recorded in PC-08/SCANNING_ARCHITECTURE and
remains Track B/M12. One thumbnail serves a human and is not a reference set or
proof of visual recognition. No fixed image count, automatic video/multi-view
capture, OCR/model/runtime selection, upload/backup or recognition truth is added
to M8-12/13. The current app's no-code photo/price path is manual identification,
not appearance recognition.

## PC-14 — Today's discounts should be visible

Founder wants the summary to state the discount amount even if individual
discounted products are not listed there. Verified source: completed sales retain
subtotal, discount total and net total; BusinessSummary currently sums completed
net totals over the store-local day, while its interface/screen expose no separate
discount metric. Therefore this is a presentation/read-model omission; no evidence
yet establishes incorrect discount arithmetic in the founder's actual test sale.
Uncompleted basket discounts are not part of today's completed-sales summary.

Smallest proposed delivery: a compact Discounts given amount alongside clearly
labelled Sales value after discounts, using the same authorized completed-sales
query/day/currency and safe integer aggregation. For example, sales before
discounts10,000 minus discounts1,000 yields sales value9,000. Do not subtract the
discount again from net sales, tracked margin or expenses. Detailed product/line
discounts belong in sale receipts/history rather than a crowded summary card.
No business-table migration, costing/accounting change or historical rewrite is
needed. This is a bounded follow-up to M6, not barcode/recognition behavior.

Acceptance before shipping: mixed discounted/undiscounted and paid/credit completed
sales produce the exact amount; empty-day amount is zero; other stores/days/drafts
are excluded; safe-integer overflow follows existing rejection behavior. Verify
summary refresh after completion and unchanged receipt/snapshots/net sales/margin.
Implementation remains on hold during founder's live exploration; no test or
phone result is claimed for this request.

Execution update: founder ended exploration and explicitly permitted resumption
through the verification chat. M8-14 now carries this bounded read-model/display
correction after M8-10..13. The preceding hold is historical, not a current block;
no implementation or new result is claimed by this planning update.

## PC-16 — Keep product thumbnails small across camera/device qualities

Founder highlights hundreds/thousands of products, varying camera resolution
and limited phone storage. Current source already captures camera sizes up to2048
and JPEG quality0.65, but stages/copies the encoded file unchanged and accepts
up to8MiB. One returned131945-byte photo is historical evidence, not proof every
phone/photo stays small. No normalization/transcoding library is installed.

D-050 fixes the planned new-thumbnail budget; M8-12/13 hold execution/acceptance.
Use existing camera size/encoding facilities where feasible, verify actual bytes,
bound temporary storage and displayed-image work, preserve legacy images and keep
selling independent of optional media. Original high-resolution photos should
not accumulate beside their display copy. Existing Expo docs expose pictureSize,
supported-size discovery and quality controls, but no fixed byte guarantee:
[Expo Camera documentation](https://docs.expo.dev/versions/latest/sdk/camera/).
Installed SDK also exposes PictureRef/savePictureAsync; native applicability,
same-capture encoding and cleanup remain implementation/device checks, not proof.

Recognition references and OCR require an independent bounded quality/diversity/
storage evaluation in Track B/M12; do not reuse aggressively reduced thumbnails
as the only reference or apply the display byte cap to recognition data blindly.
No dependency, runtime, photo reprocessing/deletion or phone operation was performed.

## PC-08 — Founder scanner experience clarification, 2026-09-28

This records the founder's detailed spoken intent, summarized rather than a
verbatim transcript. M8 technical/design/ticket specifics remain in their own
authoritative documents. The explanation clarified the existing sell-first
strategy and added a continuous basket UX absent from the first M8 draft.

- One coherent scanner should eventually identify a saved store product through
  its registered barcode, registered QR, or appearance. A barcode need not exist
  for the eventual visual path. A code being readable alone does not prove that
  its stored mapping is correct; never promise 100% identity accuracy.
- Visual candidates must distinguish meaningful variants and package sizes,
  including ordinary Coke versus Zero, 35cl versus 50cl, sachet/pack/carton.
  Anniversary artwork may be another reference for the same variant rather than
  an automatic new SKU. OCR may help read size/name text after measured testing.
  On uncertainty show a small set (for example three) and None of these/search.
- An active known product with zero recorded stock remains identifiable. Show
  Recorded stock: 0 or a similarly honest notice; do not say Not found. Existing
  negative-stock/manual selling rules still apply. Deactivated records follow
  explicit lifecycle review; do not erase history or reactivate automatically.
- Unknown means COSI cannot safely link the scan to a saved item. Offer Add
  product and sell with minimum information. D-047 supersedes the original
  short-name requirement: optional identification photo, selling price as the
  only typed product field, and editable quantity defaulting to one. Store the
  code when safe. The completed sale is
  durable, while the product may remain temporary/Needs details for hours or days.
  Make pending products easy to revisit using the existing Temporary filter;
  add cost, other details and future visual setup later on the same product ID.
  Never force full catalogue onboarding before checkout, invent initial stock,
  substitute guessed cost, duplicate products or rewrite old sale snapshots.
- Single scan: identify one product, change quantity if buying several identical
  units, then complete the sale. Basket scan: scan different items one after
  another into one running cart and pay once. It does not mean recognizing an
  entire basket/shelf in one image and is unrelated to expiry batches.
- In basket mode, an exact unambiguous code with explicit sellable package and
  known selling price can add one unit and keep scanning. Show last-added item,
  quantity/total, easy undo/edit and brief optional beep/visual feedback. Unknown,
  missing-price/package and ambiguous results pause for input, then resume the
  same basket. Never complete payment automatically or count repeated frames as
  repeated purchases. A quantity edit or explicit repeat action handles identical
  units safely. A mute control must not remove visual confirmation.
- Future visual enrollment should feel like moving the camera around the item,
  with useful views captured automatically when possible. No mandatory fixed
  number of manual photos. Give truthful hold-steady/light/framing guidance,
  torch control, and progress based on accepted useful views, not elapsed time.
  Stop when enough diverse clear evidence exists; allow retry/cancel/save for
  later. Do not fake knowledge of object angle/distance or guarantee facial-ID
  style capture works equally well for all retail objects without experiments.
- Product-list thumbnail and recognition reference images serve different jobs.
  One good thumbnail does not necessarily make visual recognition reliable.
  Capture a bounded useful reference set; do not retain a continuous video or
  every frame. Guided enrollment must never become a prerequisite for a first sale.
- Unbranded shoes/bags may be distinguishable from local references; physically
  identical goods cannot reveal invisible brand/grade/price differences from an
  image. Offer choices or a store label/manual selection rather than guessing.

**Milestone disposition:** M8 adds the barcode/QR basket behavior, feedback,
zero-stock identity and temporary-product continuation requirements to its
proposal. In M8 an item with no readable registered code can still be sold by
manual quick entry; appearance recognition is not claimed. Track B/R1–R6 tests
visual retrieval, adaptive guided capture and useful OCR; M12 integrates proven
capabilities. The existing model/runtime and consent/data-provenance gates stay
in force. No new recognition engine or image-retention feature is authorized by
writing this clarification.

## PC-09 — Price-first unknown-item sales and identification photo

Founder observation, 2026-09-30: name/detail typing during unknown-item selling
adds friction. Requested a whole-product photo and selling-price entry, with
name/full catalogue completion later. D-047 is the approved behavior authority;
M8_SCANNER_PLAN.md and tickets M8-06/07 specify the bounded extension.
Initial photo retention is private to the originating device; private backup
and cross-device restore remain future media work under OFFLINE_SYNC section 60.
This is not visual recognition or guided multi-view enrollment. Sale completion
is real; product enrichment is pending. Native verification must be repeated
for the new flow before acceptance. Prior physical findings are not waived.

## M4 impact — resolved

No new mandatory M4 reopening follows from these requirements. Existing stable
purchase-item UUIDs and immutable quantity/conversion/cost snapshots provide
safe additive references. Accepted M4 audit corrections are recorded separately
in M4_AUDIT_CORRECTIONS; not product-change implementation. Migrations 1–6
remain unchanged. Old stock is unknown, not reconstructed with invented dates
or duplicated purchase/opening events.

The current product total/event ledger already exists; lot/group projection,
physical count and snooze data do not. M4 source acceptance does not claim expiry,
M5 native evidence or full accounting readiness. First pilot requires actual
working expiry and the carried device/release checks.

## Founder approvals and superseded proposals

Founder approved blind owner stock checks/attention, conservative shortage and
unexplained-surplus costing, and expiry for the first real-shop pilot. Founder
then explicitly resolved minimal batch awareness and automatic FEFO without
routine sale batch selection/confirmation. UNKNOWN remains valid; shelf picking
is assumed unless actually identified/physically checked. Financial costing is
separate from batch consumption. Strict pharmacy/warehouse traceability, GS1/OCR
and recognition integration are future enhancements.

This supersedes the earlier review suggestion that normal selling should require
physical group confirmation, and rejects expiry deferral past pilot. Current
schema/UX details live in approved authorities, not copied into this backlog.

## Architect feedback retained

- External advice to finish M1/design before M2/M3 describes an old project
  state. M1–M4 exist; use the design gate for M5, without restarting them.
- Do not implement “Mark restocked” as a balance overwrite/dismissal; record
  the actual purchase. Expiry handled/removed must describe the real action.
- Completing selected checks cannot certify every inventory/financial report.
  Use actual progress/last-check/unresolved/unknown facts. Any future confidence
  score needs an explicit definition and evidence, not an undefined High badge.
- Replacements and staff attempts are review signals, not misconduct proof.
  A proposed three-replacement cap remains a future configurable policy
  hypothesis, not a mandatory suspicion threshold.
- Offline status should remain subtle, but locally saved is not cloud-acknowledged.
  Credit sales already exist; Home wording must distinguish sales from cash.
- Home/Products/Reports/More was an architect hypothesis, not a locked new tab
  contract. Global Scan navigation retains M8 review and the manual sale fallback.
- Hours/days/week/month reminder intent is supported by explicit reminder times;
  condition-specific escalation must prevent long snooze hiding worsening alerts.

## Roadmap checkpoint before M7

- M1–M4 remain accepted foundations; these product changes required no broad
  rewrite. M5 extended M4 additively for batch/expiry/reconciliation behavior.
- M5 owns PC-03, PC-05 list/actions and PC-06. M6 owns PC-01/PC-01a and Home's
  compact PC-05 preview. Their audit records and tests are the implementation
  evidence; this backlog remains a disposition index.
- M7 must preserve and synchronize the completed M5/M6 envelopes under
  `OFFLINE_SYNC.md`, including legacy/extended sale and purchase payloads,
  batch/reconciliation facts, mutable settings, expenses and withdrawals.
- M8 owns PC-02 and scanner/barcode application integration. M7 local source is
  accepted and the founder resumed coordinator M8 planning on 2026-09-28. The
  proposal and tickets are prepared; implementation approval remains pending.
  Recognition Track B uses separate branches/worktrees and does not edit shared
  schema or contracts concurrently.
- The founder authorized isolated M9 work while M8 was deferred. Its final M7
  integration/audit remains separate; no concurrent editing of catalogue, sync,
  navigation or recognition contracts is authorized by that exception.

M7 local source and integration evidence is accepted. Next: review the M8
proposal and then assign only its approved scope. PC-04 staff accountability
and PC-07 market-price signals remain outside M8.

## M8 optional catalogue enrichment follow-up — 2026-09-30

Founder approved the second/background online product-details approach, bounded by D-048 and ticket M8-09 after D-047/M8-08. Product details are unconfirmed foreground suggestions, never checkout requirements or shared platform truth. Provider selection/reuse/contact and native HTTP verification gates remain open; default live integration disabled. This is catalogue enrichment within M8, not recognition, M9 price intelligence or a new milestone. Provider comparison: docs/engineering/M8_CATALOGUE_LOOKUP_PROVIDER.md.

## PC-10 — Offline starter catalogue and wider online directory

Founder input, 2026-09-30: reduce identification effort and waiting by retaining
popular product-code/name records on the phone, updating them while connected,
and keeping a larger directory on COSI's backend. Optional further-provider
lookup could fill gaps. A later ingestion agent was suggested as one means of
maintaining the directory, not permission to scrape, publish or import data.

Disposition: **proposal preserved; not delivered by M8-09**. This expands the
existing small-cache/wider-catalogue tiers in SCANNING_ARCHITECTURE section 5.
Coordinator recommends a hybrid: store-owned exact mapping first; bounded
public discovery cache next; wider online directory/provider last. Checkout
never waits for the latter. A previous cached suggestion is not a preloaded
starter catalogue and the current cache does not provide cross-device updates.

Public matches may suggest name/brand/size, not stock, prices, costs, store
ownership or automatically confirmed package conversion. They do not silently
register a product or rewrite a retailer correction. Preserve source, licence,
version/freshness, correction and ambiguous/no-result handling. Measure pilot
coverage and device lookup/update cost before choosing catalogue size; do not
copy an entire provider database into every installation by default.

Before implementation, review approved data rights/reuse/attribution, separation
from private business data, curated ingestion/review, capped storage, atomic
versioned update/recovery and offline fallback. No new backend/schema/sync
contract, licence interpretation or always-running ingestion agent is approved
by this entry. Use licensed feeds/curated imports rather than unrestricted
Google scraping. Existing D-048 live provider gates still apply. Shared catalogue
work and Track B/M12 discovery integration need their own approved plan; they
are distinct from M9/M10 financial price observations.

## PC-11 — Target one code when several are visible

Founder input, 2026-09-30: packaging can have product, marketing, batch or serial
codes side by side. Retailer should be able to narrow the scan area or use zoom
to intentionally target one code, rather than hoping the first callback is right.

Disposition: **priority M8 follow-up proposal, not implemented or accepted**.
M8-08's brackets/sweeping line are decorative; detection currently covers the
whole preview. Do not claim shrinking a decorative frame changes detection.
Review an accessible narrow-target/zoom interaction, validated detector bounds
and preview coordinate transforms on the Galaxy A15 before publishing a new
implementation ticket. If reliable spatial filtering is unavailable, use an
honest reposition/manual-choice fallback rather than inventing precision.
Keep capture intent single-product even in sequential basket mode. Multiple
conflicting codes must not cause two items, an arbitrary automatic association,
or a wrong known-item addition. Coverage needs two codes inside/outside the
target, orientation/preview size, QR plus EAN, stationary repeat prevention,
explicit repeat and basket preservation. No new native dependency is selected.

## PC-12 — Structured QR identity versus generic QR contents

Founder input, 2026-09-30: clarify barcode versus QR priority and avoid treating
lot/serial/other codes as the product itself. Current M8 camera reads both in
one screen; exact bounded registered QR payloads resolve locally. Neither code
format universally wins. Unsupported/unknown QR contents use safe manual selling;
they do not open URLs or request arbitrary websites.

Disposition: current bounded QR behavior is already specified/tested; physical
QR verification remains required. GS1 Digital Link extraction of a GTIN from
a structured QR, keeping lot/serial/expiry as separate attributes, is a future
reviewed parser extension, **not current M8 behavior**. It may support PC-10 but
must preserve raw-QR equality/identity ownership and approved batch semantics.
Do not guess that every QR is a product code or that every numeric code is a GTIN.
Visual identification of an unbranded/no-code item, OCR and guided multi-view
enrollment remain PC-08 / Track B / M12; a D-047 photo is an identification aid
for the human, not a deployed recognition model.

Primary sanity-check sources, read 2026-09-30:
[GS1 Digital Link quick start](https://ref.gs1.org/docs/2024/digital-link-quick-start-guide)
distinguishes GTIN identity from batch/serial/expiry; [OFF licence guidance](https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/tutorials/license-be-on-the-legal-side/)
requires review of dataset/content/image reuse terms before importing or distributing data.
