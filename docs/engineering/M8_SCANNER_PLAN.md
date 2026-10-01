# M8 — Unified Scanner and Barcode Plan

**Status:** Approved by founder 2026-09-29; assigned implementation follows (D-046).  
**Prepared:** 2026-09-28 by the coordinating planner.  
**Checkout:** `C:\Users\doyew\Documents\DEV 2\COSI-m8-planning`  
**Branch:** `plan/m8-unified-scanner`  
**Inspected baseline:** `c817edb`, accepted M7 local source, SQLite migrations 1–23.

## Outcome and scope

A retailer can tap Scan, identify a locally known barcode, confirm the correct
product/package, and complete the existing sale offline. An unknown item,
permission refusal, unavailable camera or disabled scanner always leaves a
usable search/quick-create path. Scanning helps record normal work; it does not
complete a sale or change inventory by itself.

M8 delivers the barcode-first scanner and PC-02 global navigation change.
Visual recognition remains the longer-term unified-scanner direction under
D-017–D-022 and D-030. Model selection, image enrollment, OCR, recognition asset
sync, discovery catalogues and M12 production visual integration are separate
work. No recognition-lab app or unused recognition-core package is needed to
deliver this slice. Later research consumes the same product/package IDs and
result meanings rather than inventing a competing scanner.

## Repository findings

| Inspected implementation | Consequence for M8 |
| --- | --- |
| `product_identifiers` already records variant, optional package, type, raw value, normalized value and status | Reuse it; no duplicate barcode database |
| Normalization strips whitespace/hyphens and uppercases every type; the exact-type index is global within this SQLite database | QR payloads cannot safely be matched on normalized text alone; do not silently rewrite old identifiers or their uniqueness policy |
| UPC/EAN lookup only compares the current normalized string | Add read-time, validated UPC-A/EAN-13 equivalent lookup; collect all candidates before choosing |
| Quick Add currently stores any supplied barcode as EAN with no package | Extend the optional input to preserve detected type; legacy callers remain valid; unknown package requires confirmation |
| Product creation and association already write one atomic outbox envelope | Extend those application commands instead of introducing scanner-specific sync operations |
| SellScreen owns an in-memory cart and line/Quick Add subviews; tab and back guards protect it | Keep that state mounted while scanning; moving Sell out of the visible tab bar must preserve every exit guard |
| M7 validates generic entity identity/version; inspected server migrations contain no barcode-value collision guard | Add a focused collision reproduction and bounded correction before accepting scanner-created associations; current evidence is source inspection, not a reproduced database failure |
| Expo SDK 57 is pinned; expo-camera is not installed | Camera adds a native dependency and needs a rebuilt APK, dependency review and device evidence |

M7 source acceptance is not a claim of complete physical/release readiness.
The carried Galaxy app-opening issue, broader M3–M7 device checks, two-phone
checks, second laptop and remote CI gates remain visible in PROJECT_STATE.

## Proposed experience

The exact screen/state specification is in `docs/design/DESIGN.md` under the
proposed M8 section. The core journey is:

```text
Today / Products list / More -> Scan -> camera permission and preview
  -> known code -> product + package -> existing quantity/price line -> cart
  -> unknown code -> search and link OR quick create -> line -> cart
  -> unavailable/disabled camera -> manual search -> existing line -> cart
cart -> existing payment and atomic completion -> durable receipt
```

Today, Products and More remain primary tabs. Sell becomes a full-screen
destination with its existing `/sell` URL preserved. Global Scan opens that
sale destination in scanner mode; manual Sell/search remains clearly available
from Home, More and scanner fallback. The global floating action appears only
on the three main overview/list surfaces; a contextual Scan next item action
belongs inside the sale. Product detail offers explicit Associate barcode,
which returns to that product rather than starting a sale. Restock scanner
integration is deferred; existing manual restock remains available.

Founder clarification PC-08 replaces the initial confirm-every-item draft with
two modes. Single-item mode opens existing quantity/price configuration, allowing
one scan followed by quantity 6, for example. Basket mode keeps the scanner open
and accumulates distinct products into one cart for a single checkout.

Only a uniquely resolved, conflict-free code with an explicit active package and
known selling price may add one package directly through the existing cart/line
validation in basket mode. Missing price/package, unknown, malformed or ambiguous
identity pauses for the existing form; then return to the same scanner/basket.
No automatic sale completion. Show a running count/total, last-added product and
Undo/edit, with one optional short beep and visual confirmation per successful
addition. Sound is playback only; no microphone permission. Review any necessary
playback dependency before installing it and allow mute. Do not play a success
beep for a failed lookup or failed addition.

October 1 amendment D-049 supersedes the preceding feedback timing for Single
mode: beep once after a safe match is loaded for configuration, visibly distinguish
recognition from basket addition, and do not beep again at Add to cart. Unknown
valid barcode/QR results get one distinct neutral code-read cue before photo/price
entry, not a product-match cue; later Add to basket is silent. Automatic Basket
known addition retains its immediate successful-addition cue. No-code pictures
are human references, not inferred recognition. Explicit Scan next item and confirmed
scan-origin Single cancellation re-arm recognition; passive resume does not.
Compatible new draft additions accumulate safely under D-049, including incremental
Undo; unlike prices/packages/discounts and rounding-sensitive lines stay separate.
Execution and focused regression criteria are M8-10/M8-11 in tickets.md.

October1 photo presentation clarification is D-050/M8-12: the existing private
photo identifies all products in list/search/cart/detail, with tap-to-enlarge,
product name or compact unfinished label, quantity and price where applicable.
Preserve stored identity/receipt snapshots; do not show UUID suffixes as primary
visual identification. Missing/no-photo products retain an honest text fallback.
M8-13 adds optional normal-creation and existing-detail Add/Change photo controls
using the existing camera/storage service. No new migration/native dependency or
upload. Guided multi-view recognition remains Track B/M12 and is not implemented
by attaching one thumbnail, even for products with barcodes/QR codes.

D-050 additionally governs the kilobyte-sized new-thumbnail policy: actual byte/
dimension enforcement, bounded same-capture encoding/capture-cache cleanup and
legacy readability. M8-12/13 require bounded image work and physical clarity/size
measurements; reducing JPEG quality alone is not enough. Current runtime limits
remain unchanged until approved source work resumes after founder exploration.

Latch each accepted detection. A stationary barcode must not keep adding units,
and a timeout alone is not proof that a new physical item was presented. Allow
the next distinct accepted code, or explicit Scan same item again/quantity edit;
only adopt automatic removal/re-entry detection if actual camera evidence proves
it is reliable. Hold the latch across pause/resume so an interrupted preview does
not add another unit. Test A-A-A callbacks as one unit, A-B as two intentional
items and explicit A-again as an intentional additional unit. Camera evidence
and independent review gate the fast path under SCANNING_ARCHITECTURE section 37;
an unproven fast path
remains disabled and is reported as incomplete rather than quietly claimed done.

Zero recorded stock must not filter an active known item out of recognition.
Show the recorded balance and apply existing sale rules; do not infer physical
absence or unknown identity. No-code/illegible-code items can use manual quick
entry in M8; appearance recognition and guided capture remain later work.
Test back, cancel, app backgrounding, focus loss, rapid taps, history and direct
`/sell` entry before removing the visible Sell tab.

After quick creation, the completed sale is real and durable while product
details may remain unfinished. Keep the product in the existing Temporary filter,
with a clear Complete details route. Later enrichment keeps the same identity
and preserves transaction snapshots; it never retroactively invents cost or
opening inventory. PC-08 records the full founder vision, including future
automatic multi-view capture, candidate choices, thumbnails and OCR.

## Boundaries and proposed contract

Use existing `packages/contracts` for provider-independent recognition types
and `apps/mobile/src/features/scanning/` for the local resolver, session and
camera adapter. Dependencies point from UI/adapters to the contract and existing
catalogue/sales applications. Contracts never import Expo or SQLite.

Proposed minimum service: `recognize(input)` on a service bound to a validated
current store. M8 input is a bounded barcode detection with raw value and
supported symbology, plus a request/session identity. The future image input is
an extension gate, not an unused production implementation. The conceptual
`enroll` method in architecture documents remains future capability; do not
publish an always-throwing enrollment stub.

Result semantics remain STRONG / AMBIGUOUS / UNKNOWN. A candidate identifies
StoreProduct, ProductVariant and optional PackageUnit, method evidence, and
whether package confirmation is required. Resolve names, active state, price
and conversion through the current store catalogue/sale client on confirmation.
Do not carry price or stock as authoritative camera data. STRONG means one safe
identity, not permission to commit a sale. An I/O failure is a retryable scanner
error state, not a dishonest UNKNOWN answer. Barcode confidence must not be
displayed as a fabricated AI probability.

Keep one focused camera adapter, with preview/permission lifecycle and barcode
events exposed to the scanner session. Only that adapter imports expo-camera.
Cancel/ignore results when request generation, route focus, session or store
changes. The service owns lookup, not writes; existing catalogue commands own
association/creation and existing sales commands own all financial/stock effects.
Drafts remain in memory under D-037; completed sales remain restart durable.

## Identifier rules

1. Initial camera formats: EAN-13, EAN-8, UPC-A and QR. Other symbologies,
   UPC-E expansion, GS1 application-identifier/Digital Link parsing and variable
   weight/price extraction are explicitly unsupported in this slice. Offer
   manual entry/search rather than pretending to decode them.
2. Keep leading zeroes. Validate detected EAN/UPC digit length and check digit.
   UPC-A and its leading-zero EAN-13 representation may share a read-time key;
   do not modify stored values, widen equivalence to arbitrary numbers, or
   infer a carton from a barcode prefix.
3. QR is a bounded opaque product identifier (existing 128-character limit).
   Require raw equality as well as safe lookup; legacy lossy normalization
   alone cannot yield STRONG. Never open scanned links, execute contents or
   log payloads. Long/unsupported payloads get manual fallback without truncation.
4. Scope candidate joins to the active store, active variant/product and valid
   package relationship. Exact identifiers in another store must not reveal
   private names/prices or silently attach that store's provisional product.
5. Gather all equivalent candidates. Conflicting identities/packages or known
   sync conflicts yield choice/manual review, never first-row-wins. Package-less
   mapping does not mean base unit; ask for a sellable package explicitly.
6. Deactivated/broken mappings cannot silently fall back to a different package.
   A legacy invalid EAN/manual code stays preserved and searchable; it is not
   proof of a valid camera identity. No data cleanup as a side effect of scanning.
7. Creating/associating a detected code requires an explicit user action and
   current store/package checks. Retain operation IDs across retry/double taps.
   Barcode saved and product saved are distinct from sale completed.

## Data and synchronization impact

No new business entities or local business migration are expected for the
scanner itself. Add typed optional identifier input to product creation while
retaining the existing EAN legacy default. Persist the detected type in the
existing identifier row and existing PRODUCT_CREATED envelope. Association uses
PRODUCT_IDENTIFIER_ADDED. Keep payload version 1 only if backward-compatibility
tests prove existing receivers accept this already-supported row shape.

The collision gap needs a bounded proof in M8-04. Two same-store devices can
independently attach one value to different IDs. Generic entity-version checks
alone cannot detect this, and the losing device may then hit its local unique
index on pull. Tests must cover PRODUCT_CREATED with nested identifier as well
as PRODUCT_IDENTIFIER_ADDED, equivalent UPC/EAN values and legacy QR collisions.

Recommended correction if the reproduction confirms the gap: additive server
claim validation within the existing serialized store transaction and explicit
conflict evidence, using the existing protocol. A narrow private claim projection
may be justified for efficient uniqueness; it must be rebuildable from accepted
facts, RLS/grant protected, and scoped to store. Validate the key from the raw
payload rather than trusting a client-supplied normalized value. Existing legacy
collisions must be reported, not silently assigned a winner during migration.

The client must surface the conflict, suppress unsafe scanner selection and
continue pulling unrelated valid operations. Preserve rejected operation payloads,
products and completed sale history. Define explicit projection/quarantine or
user-resolution handling before changing any local identifier status; never
delete an unsynchronized product to satisfy an index. If this requires a new
protocol shape, ownership policy or broad identifier-model migration, stop and
return the smallest amendment to the coordinator. This is a scoped completion
of OFFLINE_SYNC section 29, not a redesign of M7.

A rejected PRODUCT_CREATED envelope can have dependent completed sales. Preserve
those local facts and expose their blocked dependency; never acknowledge them
prematurely or rewrite their product/package snapshots to the winning identity.
The focused correction must state how the original provisional product remains
usable and how an owner can resolve its association without losing its history.
Return an amendment before enabling association if that recovery cannot be
implemented within the existing conflict protocol.

Reserve a timestamped `m8_identifier_claim_guard.sql` only if justified by the
reproduction. Any necessary local metadata migration must be additive after
23 (recheck latest version at implementation). Never edit migrations 1–23 or
past Supabase migrations. M8-03 association stays feature-gated until M8-04
passes; known-code reading and manual selling can be verified independently.

## Native choice and alternatives

Recommend expo-camera for the pinned SDK 57, installed with Expo's version
resolver and committed lockfile. Official SDK 57 guidance currently recommends
~57.0.5; recheck compatibility at installation without upgrading the SDK.
Use CameraView barcode callbacks; request camera permission only when needed,
disable Android audio recording permission, and unmount preview on focus loss.
No image saving/uploading, video recording or microphone access is needed.

Expo Camera satisfies this barcode slice with one adapter. VisionCamera would
add an unproven native/performance investment; reconsider only if later measured
visual frame-processing needs exceed the adapter. Direct library imports into
SellScreen are smaller initially but make camera replacement and failure tests
spread through sale code, so reject that alternative. Avoid a plugin framework
or multiple runtime abstractions before there is a second measured backend.

Measure APK-size delta, camera-ready time, result-to-line time and battery/thermal
behavior on the reference phone. A mock or Android export cannot prove native
camera behavior or first-use offline detector availability.

## Ticket sequence and evidence

`tickets.md` is the only implementation ledger. Its five proposed tickets are:

1. M8-01 — Known barcode to safe sale line, with offline/manual fallback.
2. M8-02 — Global Scan and guarded full-screen selling.
3. M8-03 — Unknown code to typed, durable catalogue association/creation.
4. M8-04 — Conflicting associations remain safe across sync and restart.
5. M8-05 — Native/offline/accessibility evidence and independent audit handoff.

M8-02 and M8-03 both depend on M8-01; M8-04 depends on M8-03; M8-05 depends on
all prior tickets. Execute sequentially in this checkout as the founder requested;
the dependency graph is not permission for concurrent writers.

Expected implementation verification, from repository root:

```powershell
npm ci
npm run typecheck
npm run lint
npm run test --workspace @retail/contracts -- --runInBand
npm run test --workspace @retail/mobile -- --runInBand
npm run validate
npm exec --workspace @retail/mobile -- expo install --check
npm run mobile:doctor
npm run mobile:export
npm exec -- supabase test db --local
npm run test:sync:local
```

At implementation only, install camera from `apps/mobile` with
`npx expo install expo-camera`; inspect the resolved native dependency/license
and permission configuration. A new development/preview build is necessary for
device checks. Cloud builds/account actions retain their existing authorization
rules. No package install, native build or database test was run during planning.

Required fixtures: known base and carton; package-less mapping; inactive
product/package; foreign store; equivalent UPC/EAN collisions; QR case/hyphen
differences and URL; duplicate callbacks; cancel/stale callback; camera denied;
storage/read failure; create/associate rollback and idempotent replay; same-store
two-client push/pull collision; completed sale with correct existing FEFO/cost
snapshots. Use real SQLite/PostgreSQL for data claims and injected adapter events
for UI state tests. Reuse M2–M7 tests rather than replacing them with mocks.

Galaxy A15 proof: diagnose the carried app-opening failure first, preserve user
data, install the appropriate new binary, cold launch, grant/deny permissions,
scan printed known/unknown/package labels in airplane mode, make a sale,
force-stop/relaunch and verify its receipt. Check repeated scans, back/cancel,
background/resume, large text and accessible actions. Preview must work without
Metro; development-client failure to reach Metro is a different result. Record
exact build/source, phone/OS, commands and evidence. Do not repeat a failed device
loop indefinitely or call automated two-client tests a two-phone pass.

## Approval and orchestration

Ticket sizing is coordinator-reviewed under the founder's standing delegation.
Founder approved the experience, RecognitionService boundary and native-camera
addition on 2026-09-29 (D-046). No final model/runtime is selected.

Assign one separate implementation chat using gpt-6-astra at low effort. The
founder selected medium effort for the coordinator; its UI setting remains
user-controlled. Give the exact checkout,
branch, ticket range, evidence contract and coordinator chat ID. The implementer
must stop and send its final handoff, including pending phone gates, to the
coordinator; receipt of a message is not an independent audit. Coordinator reviews
only after implementation stops. No polling loop, simultaneous edits or automatic
M9/M10 advancement. M9 work remains isolated; reconcile shared catalogue/sync
changes deliberately before combining branches.

## Sources checked and limitations

Repository: AGENTS, current M7 state/audit ledger, BUILD_PLAN M8 and recognition
track, PRD scanner sections, SCANNING_ARCHITECTURE, RECOGNITION_TEST_PLAN,
D-017–D-022/D-030/D-034–D-037/D-042/D-044/D-045, PC-02 and current mobile/server
code named above. Older DESIGN/app-flow Sell-tab statements describe the
pre-M8 implementation; PC-02 supplies the requested change, subject to this gate.

Bounded external verification on 2026-09-28:

- [Expo Camera SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/camera/):
  version compatibility, barcode preview, single active preview, config plugin.
- [Expo permissions](https://docs.expo.dev/guides/permissions/): native permission
  configuration and runtime permission behavior.
- [GS1 GTIN uniqueness](https://support.gs1.org/support/solutions/articles/43000734386-are-all-gtins-unique-numbers-):
  variable GTIN lengths and uniform leading-zero representation. This does not
  justify dropping arbitrary leading zeroes or treating packaging levels alike.

Planning verifies feasibility and identifies tests; it does not prove a camera,
new scanner path or concurrent-identifier correction already works.

## Approved amendment — price-first unknown items, 2026-09-30

D-047 records the founder's observed checkout friction and supersedes mandatory
name/base-unit typing in the unknown-item selling shortcut. Existing M8-01..05
evidence remains attributed to its tested source; it cannot accept this new flow.
The phone utility is stopped at evidence HEAD 1e50d1b. The original M8 implementer
owns M8-06 then M8-07 sequentially; coordinator audits after its stopped handoff.

### User flow

Unknown barcode/QR -> Sell this item -> quick whole-product photo -> numeric
selling-price entry -> Add to basket -> resume the same sale/scanner.
Use helpful copy such as 'Take a photo so you can finish this product later'
and 'Fit the whole product in the frame'. No forced distance, name, SKU, cost,
description or unit typing. Quantity is editable and defaults to one sold unit.
Offer search/link instead if the product already exists. If photo cannot be
captured or saved, expose retry and Continue without photo; preserve sale access.
The no-code selling shortcut can use the same photo/price path without inventing
a barcode. Do not route ordinary Products creation through mandatory photography.

Generate a recognizable temporary label with a stable distinguishing suffix;
IDs remain globally unique, names never become identity keys. Repeated operation
IDs cannot duplicate products, assets, outbox entries or basket lines. Keep the
typed raw identifier and existing collision/association rollout protections.
Do not enable disabled scanner associations to make this shortcut appear complete.
Keep generated labels in immutable sale snapshots; later enrichment may expose
the current name alongside history but never rewrite past transaction facts.

### Data and media boundary

Reuse temporary-product graph, exact price parsing, local creation/outbox
atomicity and current provisional package model. Do not make variant names null
or change costing/stock rules. Keep one store-private identification photo and
bounded metadata tied to stable StoreProduct identity; use an additive SQLite
migration only if needed. The documented MediaAsset model is the guide, not a
second business ledger. Restrict this first implementation to originating-device
retention; private media upload/restore is a named future gate, not a hidden claim.

Persist files in app-private durable storage, not Camera cache. Use generated
asset/file identities and bounds on dimensions/size; never use scanned values
as paths. Stage file persistence before attaching its metadata in the product
transaction. Handle failed writes/transactions/retries and cancelled drafts
without dangling 'saved' references, duplicate attachments or deletion of an
already committed asset. Filesystem and SQLite are not one atomic transaction:
define conservative orphan/staging recovery and test each failure boundary.
Missing/corrupt files display a truthful fallback and do not block sales.
Scope every asset read/write/replacement to the active authorized store/product.
Do not send device URIs or bytes through PRODUCT_CREATED or sale envelopes.

Existing expo-camera supports explicit still capture. expo-file-system 57.0.7
is already locked transitively; review and declare it directly if used, without
unrelated upgrades. Verify native module presence in the installed verification
APK before claiming Metro can deliver the change; report before any extra native
dependency/build/config change. Do not submit another cloud job under this task.
Official bounded source: https://docs.expo.dev/versions/v57.0.0/sdk/camera/
(photos initially go to cache; one active camera preview).

### Likely change surface and proof

Sell/Quick Add shortcut, scanning camera adapter, catalogue application boundary,
temporary product list/detail, a focused local media repository/service and
additive metadata migration if justified; direct filesystem dependency/lockfile
only if needed. Existing contracts/server protocol remain unchanged.

Focused UI/SQLite/file-adapter tests must show price-only creation, two distinct
unnamed products, same operation replay, cancellation/retry, existing basket
preservation, no stale identifier/photo attachment, current-store isolation,
camera-denied/storage-full/missing-file fallback, restart after completed sale,
later naming with unchanged sale/price/package/cost snapshots, and no media
bytes/URI in synced business JSON. Existing manual/catalogue and scanner tests
remain green. Root validation, Expo Doctor and Android export are source checks.
Real capture/display and restart retention require a subsequent physical pass.

### Returned native findings remain open

The September 30 physical handoff records unexpected detector codes, an initially
silent addition, incomplete permission-return/continuous-scan/accessibility
checks and memory-only unfinished basket loss on font/configuration recreation.
Some real known additions, unknown cancel and a manually reconstructed completed
offline sale survived restart. Do not confuse that sale with the original scanned
basket or claim standalone cold launch. No verified detector/audio root cause yet.
These remain separate audit/retest findings; this amendment does not waive them.

## Coordinator-specified scanner activity addition — M8-08

Founder requested four right-angle corner brackets and one restrained line sweeping up/down over the live barcode preview. Ticket M8-08 in tickets.md follows M8-07 for sequential ownership only. Use existing React Native animation facilities; no new dependency/native build. Show motion only while the ready, focused, foreground scanner accepts detections, with static framing/status for reduced motion. Pause or hide on processing/results/errors/permission denial/photo entry or lifecycle exit; dispose animation loops. The guide does not constrain detector ROI, signal progress/success or authorize simultaneous multi-product recognition. D-047 photo/price scope and all existing physical findings remain unchanged. Source tests must cover lifecycle, honest status and reduced motion; continuous basket behavior still needs the physical procedure.

## Approved optional catalogue suggestions — M8-09 / D-048

Objective: help complete unfamiliar products without slowing D-047 photo/price checkout. Surface: narrow replaceable provider adapter, local suggestion/cache/budget service, client forwarding, ordinary Add inline card and Temporary product detail card. SQLite migration26 adds only local non-authoritative metadata, not business envelopes or server schema. No new dependency/backend/native build.

Unknown selling returns the durable graph immediately and opportunistically requests only a validated UPC/EAN GTIN. Locally known mapping wins; no-code/QR/URL/private identifier never requests. Foreground work is bounded to one request, five-second timeout, deduplication, positive/negative caching, ten/minute and hundred/day persistent device budgets. No OS background completion promise. The retailer chooses Use details/Edit and Save through the existing identity command; provider size never sets package conversion. Name/barcode/version/enrichment/store/lifecycle guards reject stale results; dismissals/corrections survive restart. Private photos and completed sale snapshots remain unchanged.

Highest-risk assumptions: provider accuracy/coverage, ODbL private-catalogue reuse and native HTTP behavior. Evidence: real SQLite request/cache/decision/restart/late-result tests, mock provider contract and payload bounds, explicit UI acceptance/edit/dismiss/manual-typing cases, then root validation/Doctor/Android export. Recovery: optional metadata failures never undo a durable sale/product; provider is hard disabled in application defaults. Contact/terms/transport/staging/live smoke gates are in M8_CATALOGUE_LOOKUP_PROVIDER.md. No real external barcode lookup, signup/form/message/upload or provider activation authorized by this slice.
