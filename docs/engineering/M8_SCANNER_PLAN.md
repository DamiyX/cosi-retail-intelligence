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
