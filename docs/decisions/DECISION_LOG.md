# DECISION_LOG — Retail Commerce Intelligence

**Version:** 1.0  
**Status:** Active project decision record  
**Purpose:** Preserve durable product and architecture decisions so future AI coding-agent sessions do not reopen settled questions without evidence.

---

# 1. How to Use This File

This is **not** a meeting log.

Record a decision here only when it materially affects:

- product meaning;
- architecture;
- data model;
- synchronization;
- security;
- build strategy;
- recognition architecture;
- major dependencies;
- long-term maintainability.

Do not record:

- trivial refactors;
- variable names;
- ordinary bug fixes;
- small UI choices;
- temporary debugging steps.

---

# 2. Decision Statuses

Use one of:

- `ACTIVE` — current approved decision
- `PROVISIONAL` — current direction, still requires validation
- `SUPERSEDED` — replaced by a later approved decision
- `REJECTED` — explicitly considered and not selected
- `DEFERRED` — intentionally postponed

If a decision changes:

1. do not delete the old entry;
2. mark it `SUPERSEDED`;
3. reference the new decision ID;
4. explain why.

---

# 3. Source-of-Truth Priority

If documents conflict:

1. later approved decision in this file;
2. current architecture/domain documents;
3. PRD;
4. Product Inception;
5. old conversation history.

A decision entry does not override another source-of-truth document unless the change is explicit.

When a major decision changes, update the affected source-of-truth document too.

---

# 4. Decision Index

| ID | Decision | Status |
|---|---|---|
| D-001 | Android-first mobile MVP | ACTIVE |
| D-002 | React Native + Expo Development Build + TypeScript | ACTIVE |
| D-003 | Offline-first / local-write-first architecture | ACTIVE |
| D-004 | Expo SQLite as local durable business database | ACTIVE |
| D-005 | Supabase as MVP backend | ACTIVE |
| D-006 | One repository with npm workspaces | ACTIVE |
| D-007 | Product/package model uses base units + conversions | ACTIVE |
| D-008 | Inventory uses event/ledger model | ACTIVE |
| D-009 | Completed business transactions are append-oriented/auditable | ACTIVE |
| D-010 | Client-generated globally unique domain IDs | ACTIVE |
| D-011 | Custom sync protocol first; managed sync remains fallback | PROVISIONAL |
| D-012 | Server-controlled per-store sync revisions | ACTIVE |
| D-013 | Preserve concurrent offline sales even if stock becomes negative | ACTIVE |
| D-014 | Shared product identity separated from store commercial data | ACTIVE |
| D-015 | Price strategy: lead with price, deliver with control | ACTIVE |
| D-016 | Personal restock-price intelligence before network price intelligence | ACTIVE |
| D-017 | Recognition is local product retrieval, not universal classification | ACTIVE |
| D-018 | Recognition must support STRONG / AMBIGUOUS / UNKNOWN | ACTIVE |
| D-019 | Visual recognition uses embedding retrieval first | PROVISIONAL |
| D-020 | Recognition runs as a parallel R&D track | ACTIVE |
| D-021 | Barcode/scanner shell before production visual recognition | ACTIVE |
| D-022 | Final recognition model/runtime chosen only by benchmark | ACTIVE |
| D-023 | Future web/PWA is secondary, not MVP client | ACTIVE |
| D-024 | Product Inception/PRD/architecture docs are repo source of truth | ACTIVE |
| D-025 | AI coding agents work milestone-by-milestone with planning first | ACTIVE |
| D-026 | PROJECT_STATE is the current handoff file | ACTIVE |
| D-027 | Weighted-average costing is initial candidate, not final accounting policy | PROVISIONAL |
| D-028 | Transaction snapshots preserve historical meaning | ACTIVE |
| D-029 | No full-catalog requirement before first value | ACTIVE |
| D-030 | Recognition failure must never block checkout | ACTIVE |
| D-031 | AI coding agents are interchangeable; task branch is the continuity boundary | ACTIVE |
| D-032 | GitHub remote is the normal cross-laptop synchronization mechanism | ACTIVE |
| D-033 | COSI is the temporary internal project codename | ACTIVE |
| D-034 | Authoritative quantities use fixed-scale micro-units | ACTIVE |
| D-035 | Temporary products use store-scoped provisional variants | ACTIVE |
| D-036 | Local sale arithmetic is exact-or-reject | ACTIVE |
| D-037 | M3 uses one tender allocation with explicit credit truth | ACTIVE |
| D-038 | M4 exact cost basis, provisional COGS rounding and conservative coverage | ACTIVE |
| D-039 | Pilot batch awareness, automatic assumed FEFO and first-class unknown stock | ACTIVE |
| D-040 | Blind owner checks, sourced adjustment costing and durable attention | ACTIVE |
| D-041 | M6 money-out and truthful daily summary | ACTIVE |
| D-042 | M7 authenticated sync and PostgreSQL application boundary | ACTIVE |
| D-044 | Reject cross-device stale physical reconciliations | ACTIVE |
| D-045 | Restore authoritative historical actor and device references before bootstrap replay | ACTIVE |
| D-046 | M8 barcode scanner, basket flow and camera/service boundary | ACTIVE |
| D-047 | Price-first temporary selling and private identification photos | ACTIVE |
| D-048 | Optional unconfirmed online catalogue suggestions | ACTIVE; live provider disabled |
| D-049 | Explicit scanner re-entry, mode-specific feedback and compatible draft accumulation | ACTIVE; source/native verification pending |
| D-050 | Product thumbnails across catalogue/sales, distinct from visual enrollment | ACTIVE; source/native verification pending |
| D-051 | M10 revocable market eligibility over immutable private receipts | PROVISIONAL prototype source; external activation blocked |

---

# 5. Decision Records

## D-051 — M10 Revocable Market Eligibility Over Private Receipts

**Status:** PROVISIONAL for prototype source implementation; not market activation.
**Date:** 2026-10-03.
**Authority:** Founder explicitly delegated unattended M9 audit then M10/M11
planning/implementation, routine judgement and ticket sizing. Main coordinator
owns audit. No real contribution/deployment/privacy approval is inferred.

Keep original M4 observation consent=false and M7 immutable payloads unchanged.
Market sharing has a separate server-authoritative, prospective OWNER consent
generation with time/revision cutoffs, reviewed canonical package/zone mappings
and private sanitized provenance. Nothing is eligible by migration, catalogue
matching or ordinary business sync alone. Revoke excludes contributions and
invalidates releases; re-enable never resurrects prior generations. Default
client/server feature activation is OFF. No hosted effect in this source phase.

For version1 prototype fixtures, one recent eligible observation per independent
store/variant/package/zone/currency in30 days; fewer than five stores yields
insufficient data without numeric price. Exact rational range/median; LIMITED
coverage, explicit observed/calculated/window/expiry metadata. No fabricated
trend, confidence percentage or current universal market price. These numbers
are conservative prototype policy, not empirically validated market coverage.

Removing retailer names and five-store suppression do not prove anonymity.
Real SQL/Auth/RLS/privilege/concurrency/parity, approved reference/geography,
privacy risk/retention/cohort review and explicit activation authorization are
required before release. Previously cached aggregates cannot be instantly
recalled offline. M9 remains private/local and independent of contribution.

This additive market eligibility projection does not change costing, purchase
atomicity, business sync, staff authority or recognition. Detailed source scope
and prototype policy are in M10_MARKET_PRICE_PLAN.md. No significant dependency
or provider replacement. Reconsider prototype privacy/threshold/window policy
before any external release; do not treat PROVISIONAL as approved production.

## D-050 — Product Thumbnails Are Separate From Visual Enrollment

**Status:** ACTIVE for the requested behavior; implementation/verification pending.  
**Date:** 2026-10-01.  
**Approval:** Founder explicitly clarified that named and unfinished products should show their pictures, new test products should have thumbnail photos, and ordinary product creation/existing-product details need a photo control.

Extend D-047's existing private, store-scoped identification photo to any StoreProduct, whether temporary or enriched, with one current thumbnail. Ordinary creation offers Add product photo/preview/retake; existing detail offers Add photo/Change photo using the existing camera/staging service. Available photos appear beside product names in catalogue, sale search, basket and detail; unfinished items use a compact unfinished label rather than exposing an ID as the primary visual identifier. Tap-to-enlarge is dismissible and does not change cart state. Text-only receipts and immutable product-description snapshots stay intact.

Reuse the existing device-local metadata/files and store ownership checks, atomic attachment/replacement and conservative cleanup. Missing, damaged or absent photos have truthful placeholders; selling and progressive onboarding remain possible without a picture. No public/shared product identity, image upload/backup, business-sync URI, new native library or business-table migration is introduced by this extension. It does not enroll a visual recognizer.

One thumbnail identifies an item to a human. A bounded set of clear diverse reference views helps a future visual recognizer distinguish variant/package identity. That later enrollment experience applies to barcode/QR-bearing products too, as well as items without readable codes; it remains guided/adaptive and evidence-driven under Recognition Track B/M12, without blocking barcode selling. No fixed view count, model/runtime, OCR, automatic multi-view capture or recognition accuracy claim is approved here. See SCANNING_ARCHITECTURE enrollment guidance and PC-08/PC-15 for preserved intent.

M8-12 covers presentation and M8-13 covers normal creation/existing-product photo entry. Both remain held while founder explores the current app; source/native gates and build limits are unchanged.

**Thumbnail storage clarification, October1:** founder requires kilobyte-sized
photos across low/high-camera-quality phones. Coordinator sets new-photo targets:
JPEG preserving aspect ratio/orientation, longest edge at most1024 pixels, normally
approximately50–150KiB, hard durable-write ceiling300KiB (307,200 bytes). The target
range is a tuning goal, not a guaranteed size/clarity result. Check actual encoded
dimensions/bytes before attachment; compression quality alone is not a size cap.
Prefer available camera size/encoding facilities in the existing SDK, bounded
re-encoding of the same captured image when supported, and graceful no-photo/old-
photo fallback if requirements cannot be met. Do not install a new native image
library without explicit review or repeatedly re-capture the object automatically.

Retain only one bounded current image for thumbnail/enlargement, not a full-size
original plus several duplicates. Clean only tracked app-owned capture/encoding
temporaries; preserve committed/replayed attachments and existing recovery rules.
Existing larger D-047 images remain readable under their old integrity limits;
do not lower the legacy read limit, relabel them damaged or silently recompress/
delete old assets. New creation/replacement uses the tighter policy. Recognition
references/OCR have a separate later benchmarked quality/storage budget: never
destroy or replace them with these display thumbnails. Tests/device measurements
must verify size, recognizable enlargement and bounded storage/display work.

## D-049 — Explicit Scanner Re-entry, Feedback and Compatible Draft Accumulation

**Status:** ACTIVE for the requested behavior; implementation/verification pending.  
**Date:** 2026-10-01.  
**Approval:** Founder explicitly requested these corrections during independent phone exploration in verification chat `01a0efc0-c37e-7c83-9066-1d100b11a0d6`. Coordinator verified the original user message. This supplements D-046's feedback/draft behavior only; recognition, transaction and arithmetic contracts are unchanged.

An explicit new scan action accepts the previous barcode again. Passive focus/background resume and stationary camera frames do not reset duplicate suppression. Cancelling a scan-origin Single-item line returns to the scanner after any required dirty-form confirmation; manual line cancellation keeps its existing behavior and the basket remains intact.

Single mode emits one optional match beep after a safe product match is loaded for line configuration, with visible wording that the item is not yet in the basket. Automatic Basket known addition emits its beep after the validated mutation during that scan. October1 founder clarification additionally requires an initial sound for an unknown barcode: a distinct neutral code-read cue may accompany a valid, current UNKNOWN/AMBIGUOUS result, never implying identified product, inventory availability, basket addition or payment. Stationary duplicate detections remain silent. Later Add to cart/Add to basket from known or unknown configuration does not beep again. Invalid detections and failed lookups/mutations do not emit match/addition success feedback. Sound stays optional/nonblocking; first-use native readiness is investigated rather than assumed fixed. A no-code photo capture is not barcode recognition and must not falsely claim a product was identified.

Repeated new additions in the current draft accumulate into one row only when store product, variant, package, conversion, unit price and descriptive snapshots match, both discounts are zero and centralized exact calculations preserve the summed prior/incoming amounts and base quantity. Otherwise keep separate rows; never silently change a price, discount or rounding result to combine them. Editing an existing row replaces its quantity rather than adding it again. Undo reverses the last addition/increment, preserving prior quantity and any later user edits. Completed receipts, ledger/outbox data and immutable historical lines are never rewritten.

No migration, costing/sync change, new dependency, recognition runtime or rollout is authorized by this decision. Existing native-storage diagnosis, fresh-APK/standalone and disabled-provider gates remain open.

## D-048 — Optional Unconfirmed Online Catalogue Suggestions

**Status:** ACTIVE for the local source flow; LIVE PROVIDER DISABLED.  
**Date:** 2026-09-30.  
**Approval:** Founder approved the second/background online product-details approach; coordinator assigned M8-09 sequentially after M8-06..08 with explicit terms/contact gates.

Local known barcode resolution remains first. An unknown/no-code sale uses D-047 photo/price entry and never waits for internet. A saved temporary product with a validated UPC/EAN may receive an opportunistic foreground, unconfirmed suggestion for later completion. Ordinary Add product may show an inline ready suggestion. QR/URLs/private codes never request external data or navigate automatically.

No response automatically changes product identity, package conversion, identifiers, commercial facts, inventory or sales. Use details/Edit fills an actual editable name; explicit Save invokes the established identity command. Display name, brand, size, source and attribution together. Size is descriptive text only. Persist dismissals/corrections locally and reject stale work across product/store/barcode changes, edits, enrichment, cancellation and lifecycle exit. Local photos and historical snapshots remain intact.

A replaceable adapter sends only a validated GTIN and public application identity. No private retailer identifiers, photos or business facts leave through lookup. Additive local suggestion/cache/budget metadata stays outside business sync and is not authoritative shared product identity. No new backend, package, paid account, scraping or OS background scheduler.

Open Food Facts is a disabled candidate implementation, not verified coverage. Public contact, licence/reuse/attribution review, native transport compatibility and representative provider smoke remain activation gates. No private email is substituted; no account/form/email or real barcode request was made. See [provider comparison and precise limitations](../engineering/M8_CATALOGUE_LOOKUP_PROVIDER.md). D-046 RecognitionService and D-047 photo/price semantics are unchanged. M8-08 decorative framing is linked in M8_SCANNER_PLAN.md and changes no detector acceptance.

Independent audit and the amended native flow remain required. This decision does not accept M8 or authorize live provider activation, deployment or another APK.

## D-047 — Price-First Temporary Selling and Private Identification Photos

**Status:** ACTIVE  
**Date:** 2026-09-30  
**Approval:** Founder requested removal of compulsory name/detail typing during
unknown-product checkout and a product photo for later identification. Coordinator
owns the bounded M8 amendment and implementation/audit sequencing.

Unknown-item selling requires only the selling price as typed product information.
Offer one quick, explicit whole-product photo with guidance to fit the product
in frame; do not require a particular distance. Generate a distinguishable
temporary label and retain the existing stable product identity, provisional
base package, exact sale arithmetic and outbox protocol. Quantity defaults to
one sold unit and remains editable. Do not infer carton conversions or opening
stock. Ordinary catalogue creation may retain its existing name-based flow.

The sale completes normally; product enrichment is pending, not payment.
Later naming/enrichment preserves identity and immutable transaction snapshots.
Display the identification photo in the temporary-product completion path.
It is an aid to the retailer, not recognition, OCR or proof of physical identity.

First delivery retains a bounded private photo on the originating device,
outside cache, with durable store-scoped metadata linked to the product.
Do not place image bytes or local file paths in business sync envelopes. This
uses the existing MediaAsset/offline media direction; private upload/restore
remains explicitly unimplemented until separately delivered and verified.
Never imply this photo is backed up or available on another phone. Camera,
storage or upload failure cannot prevent checkout: offer retry or continue
without photo and show the missing-photo state truthfully. Capture is never
silent; no public gallery, shared recognition corpus or platform upload.

This narrows D-035's retailer-entered-name requirement for the selling shortcut:
persist a generated nonempty label rather than making domain names nullable.
It extends D-046 with a single identification-photo feature, not multi-view
enrollment, visual matching or a new recognition contract. Full M8 acceptance
still requires independent audit and native verification of the changed flow.

Implementation boundaries/tests are in the amendment to M8_SCANNER_PLAN.md;
execution is recorded in tickets.md and the existing M8 workflow.

## D-001 — Android-First Mobile MVP

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

The first production target is Android.

### Rationale

- Primary target retailers are expected to use Android smartphones.
- The MVP is intended for in-store operational use.
- Native device capabilities are important for:
  - offline storage;
  - barcode/camera;
  - future on-device ML;
  - secure local storage.

### Consequences

- Android gets priority for development and testing.
- iOS is not required for MVP readiness.
- Future web/PWA does not drive initial architecture decisions.

### Revisit if

- pilot users materially require another platform;
- platform distribution becomes a blocker.

---

## D-002 — React Native + Expo Development Build + TypeScript

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

Use:

> React Native + Expo Development Build + TypeScript

for the main mobile application.

### Rationale

- fast iteration;
- strong TypeScript ecosystem;
- access to native modules;
- camera/SQLite support;
- future model/runtime integration;
- reusable domain/contracts for future clients;
- lower founder/tooling friction than a more manually managed native stack.

### Rejected alternatives

- PWA-first
- Flutter for this new commerce product
- Expo Go as permanent runtime assumption

### Revisit if

A critical required native capability proves impractical in Expo Development Build and cannot be solved cleanly.

---

## D-003 — Offline-First / Local-Write-First Architecture

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

Core store operations write locally first.

The network is not in the critical path for:

- sales;
- restocking;
- inventory adjustments;
- expenses;
- withdrawals.

### Rationale

Retail connectivity may be unreliable, but trading cannot stop.

### Consequences

- SQLite is operational source of truth on device while offline.
- sync is asynchronous;
- pending sync is a normal state;
- cloud failure must not make a locally committed sale fail.

### Revisit if

Never for the core retailer transaction flow unless the product itself changes fundamentally.

---

## D-004 — Expo SQLite as Local Durable Business Database

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

Use Expo SQLite as the local durable relational database.

### Rationale

The product requires:

- transactions;
- relational integrity;
- local querying;
- durable offline data;
- migration support;
- inventory and financial records.

### Consequences

- business data must not live only in React state;
- migrations are mandatory;
- local SQL access is wrapped behind repository/application layers.

### Revisit if

Expo SQLite demonstrates a blocking reliability/native limitation on target devices.

---

## D-005 — Supabase as MVP Backend

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

Use Supabase for:

- PostgreSQL;
- Auth;
- Storage;
- Edge Functions.

### Rationale

- PostgreSQL fits the relational domain;
- RLS supports store-level authorization;
- Auth and Storage reduce custom infrastructure;
- Edge Functions support trusted sync endpoints;
- low infrastructure complexity for a small team.

### Rejected alternatives

- Firebase/Firestore as primary business database
- custom backend stack from scratch for MVP

### Revisit if

- cost;
- scale;
- regional availability;
- required server behavior;
- operational limits

become material blockers.

---

## D-006 — One Repository with npm Workspaces

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

Use one Git repository containing:

- main mobile app;
- recognition lab;
- shared packages;
- backend migrations/functions;
- documentation.

Use npm workspaces initially.

### Rationale

- one project memory;
- easier AI-agent context;
- shared contracts;
- simpler founder workflow;
- reduced duplication.

### Revisit if

Repository scale or team boundaries later justify separation.

---

## D-007 — Base-Unit + Package Conversion Model

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

A product variant has one base inventory unit.

Other package units define conversion factors.

Example:

```text
sachet = 1
pack = 10
carton = 40
```

### Rationale

Retailers may buy and sell the same product in different packaging levels.

Treating each packaging level as unrelated would corrupt inventory and pricing relationships.

### Consequences

- sales/purchases snapshot conversion used;
- package-unit changes cannot rewrite history.

### Revisit if

A future vertical requires a richer unit model; extend rather than discard the principle.

---

## D-008 — Inventory Event / Ledger Model

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

Inventory changes are represented as events.

Examples:

- purchase;
- sale;
- damage;
- expiry;
- missing;
- personal use;
- correction.

### Rationale

A mutable quantity alone does not explain how stock changed.

### Consequences

- current balance is derived/projected;
- reconciliation creates adjustment events;
- history remains auditable.

---

## D-009 — Completed Transactions Are Append-Oriented / Auditable

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

Completed sales, purchases and related financial/inventory history should not be casually destructively edited.

Corrections use:

- void;
- reversal;
- adjustment;
- compensating records.

### Rationale

Historical meaning must remain trustworthy for inventory, price intelligence and financial analysis.

---

## D-010 — Client-Generated Globally Unique Domain IDs

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

Offline-created entities receive their final globally unique ID on device before synchronization.

### Rationale

Devices must create transactions without contacting the backend.

### Current implementation candidate

UUID generated using a suitable cryptographic/platform-supported API.

### Revisit if

the active AI coding agent demonstrates a better globally unique ordered-ID choice with meaningful operational benefit.

---

## D-011 — Controlled Custom Sync First

**Status:** PROVISIONAL  
**Date:** 2026-09-13

### Decision

Build the first sync protocol around:

- local outbox;
- idempotent operations;
- server revisions;
- incremental pull;
- explicit conflicts.

Do not make PowerSync or another managed engine a foundational dependency yet.

### Implementation sequence clarification — 2026-09-14

- M1 establishes the reusable SQLite transaction boundary but does not create a
  feature outbox before a synchronizable business aggregate exists.
- M2 adds the durable outbox operation envelope and requires catalogue mutation
  plus enqueue to commit atomically.
- M3–M6 reuse that capture boundary for completed business transactions.
- M7 adds network push/pull, acknowledgement, retry, revision, and conflict
  behavior over the already captured operations.

### Rationale

The product requires:

- aggregate transactional operations;
- auditability;
- privacy transformation for price observations;
- explicit conflict semantics.

### Risk

Custom synchronization is one of the highest-risk engineering areas.

### Fallback

Evaluate a managed sync engine such as PowerSync if implementation becomes unsafe or threatens the MVP schedule.

### Revisit trigger

Failure of the first controlled sync spike or unacceptable complexity/reliability.

---

## D-012 — Server-Controlled Per-Store Sync Revision

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

Incremental sync ordering uses a server-controlled per-store revision/cursor.

### Rationale

Device clocks are not reliable global ordering mechanisms.

### Consequences

- push operations participate in revision creation;
- pull uses server revision;
- clients advance cursor only after local application commits.

---

## D-013 — Preserve Concurrent Offline Sales

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

If multiple offline devices sell the same final recorded stock, preserve the real sales even if synchronized stock becomes negative.

### Rationale

Without connectivity, perfect global inventory reservation is impossible.

Discarding a genuine sale is worse than surfacing a stock discrepancy.

### Consequences

- negative/discrepant stock becomes a reconciliation signal;
- sync never deletes one real sale merely to maintain a non-negative balance.

---

## D-014 — Shared Product Identity Separate from Store Commercial Data

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

Platform/shared identity is separate from store-specific data.

Shared:
- product identity;
- barcode;
- brand;
- package presentation;
- recognition profile.

Store-private:
- selling price;
- cost;
- stock;
- supplier;
- reorder level.

### Rationale

A global catalog update must not overwrite the retailer's business truth.

---

## D-015 — Product Strategy: Lead With Price, Deliver With Control

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

Use price intelligence as the main differentiation/acquisition wedge while business and inventory control provide immediate standalone value and retention.

### Rationale

Research supports replacement-cost pressure as important, but the network will be weak early.

The product must still work for one retailer.

### Revisit if

Pilot evidence shows price intelligence does not materially affect adoption or decisions.

---

## D-016 — Personal Price Intelligence Before Network Price Intelligence

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

First provide purchase-price history from the retailer's own data.

Then layer network/market signals when observation density is sufficient.

### Rationale

Eliminates cold-start dependency.

---

## D-017 — Recognition Is Local Product Retrieval, Not Universal Classification

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

Recognition is designed to identify locally relevant products, especially products carried by the store.

### Rationale

This improves:

- relevance;
- offline operation;
- speed;
- cache size;
- false-match control.

### Consequences

Search order prioritizes:

1. barcode;
2. active store catalog;
3. small discovery cache;
4. wider catalog when online.

---

## D-018 — Recognition States: STRONG / AMBIGUOUS / UNKNOWN

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

Recognition must not always force a product result.

### Rationale

False confident matches are dangerous.

### Consequences

- ambiguous results can show top candidates;
- unknown falls back to search/create;
- confidence thresholds require calibration from test data.

---

## D-019 — Embedding Retrieval as Initial Visual Recognition Strategy

**Status:** PROVISIONAL  
**Date:** 2026-09-13

### Decision

Initial visual recognition architecture uses:

> pretrained/mobile encoder → embedding → local similarity retrieval

instead of a classifier requiring retraining whenever products are added.

### Rationale

Supports store-local dynamic enrollment and offline retrieval.

### Important limitation

The final model is not chosen.

This decision may be revised if benchmark evidence demonstrates a materially better architecture.

---

## D-020 — Recognition Runs in Parallel R&D Track

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

Core retail application and advanced visual recognition are developed as coordinated but separate tracks.

### Rationale

Recognition is technically uncertain and must not delay validation of:

- sales;
- restocking;
- inventory;
- business visibility.

---

## D-021 — Barcode / Unified Scanner Shell Before Production Visual Recognition

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

Build the scanner contract and barcode path before making visual recognition a production dependency.

### Rationale

This validates:

- scanner UX;
- package mapping;
- RecognitionService boundary;
- fallback behavior

with lower technical risk.

---

## D-022 — Final Recognition Model/Runtime Selected Only Through Benchmarking

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

Do not lock a production model/runtime based on popularity or convenience.

### Selection criteria

- SKU accuracy;
- false accept;
- unknown handling;
- package accuracy;
- latency;
- storage;
- RAM;
- thermal/battery;
- device compatibility;
- licensing.

---

## D-023 — Web/PWA Is Later, Not MVP

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

The MVP is mobile/Android first.

Future web/PWA may reuse:

- domain logic;
- contracts;
- backend APIs.

It does not have to reuse the native local persistence implementation.

### Rationale

Native mobile usage is the initial store workflow.

---

## D-024 — Repository Documents Are Implementation Source of Truth

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

Once repository documentation exists, any AI coding agent should use it rather than old chat history as authoritative implementation context.

### Rationale

Chat context is temporary and incomplete.

Repository documentation persists across chats.

---

## D-025 — AI Coding Agents Work Milestone-by-Milestone With Planning First

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

For each meaningful milestone:

1. the active AI coding agent reads relevant docs/repo;
2. proposes implementation plan;
3. identifies risks/conflicts;
4. implementation follows;
5. tests run;
6. project state updates.

### Rationale

Prevents uncontrolled whole-app generation and architecture drift.

---

## D-026 — PROJECT_STATE Is the Current Handoff File

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

Every new major AI coding-agent session should read `PROJECT_STATE.md` first.

### Rationale

It is a concise current-state pointer, while this file preserves historical decisions.

---

## D-027 — Moving Weighted-Average Cost Is Initial Candidate

**Status:** PROVISIONAL  
**Date:** 2026-09-13

### Decision

Use moving weighted-average cost as the initial engineering candidate for FMCG inventory costing.

### Rationale

It provides a practical way to estimate COGS/margin as purchase costs change.

### Constraint

Do not present this as finalized accounting policy until reviewed with an appropriate accounting professional.

### Revisit trigger

Accounting review or retailer workflow demonstrates another method is required.

---

## D-028 — Transaction Snapshots Preserve Historical Meaning

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

Sale and purchase lines preserve transaction-time snapshots such as:

- product display name;
- package name;
- conversion;
- price;
- cost basis.

### Rationale

Future product/package edits must not alter past transaction meaning.

---

## D-029 — No Full Catalogue Required Before Value

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

Retailers must not be forced to digitize the entire store before selling/receiving value.

### Principle

> Sell first, enrich later.

### Consequences

- temporary products are valid;
- normal transactions progressively build the catalog.

---

## D-030 — Recognition Failure Never Blocks Checkout

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

If recognition fails:

- search;
- candidate selection;
- temporary product;
- manual entry

must still allow completion of the transaction.

### Rationale

Recognition is an accelerator, not a business-critical dependency.

---

## D-031 — AI Coding Agents Are Interchangeable

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

The project must not depend on the persistent chat memory of Codex, Gemini, OpenCode, Antigravity, or another AI coding tool.

Any capable agent may continue work started by another agent.

The continuity boundary is:

- repository source-of-truth documentation;
- current Git branch;
- current code;
- Git status/diff/history;
- tests.

### Branch rule

Branches belong to tasks, not AI models.

Changing from Codex to another model does not require a new branch.

### Rationale

The founder wants to:

- switch when one provider reaches context/usage limits;
- move to a better model when available;
- use different local coding tools;
- avoid vendor lock-in.

### Consequences

`MULTI_AGENT_WORKFLOW.md` defines handoff behavior.

Tool-specific instruction files must stay thin and point back to `AGENTS.md`.

---

## D-032 — GitHub Remote for Cross-Laptop Continuity

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

Use the shared Git remote/GitHub repository as the normal mechanism for moving code and project state between development laptops.

### Workflow

On the laptop being left:

> test where practical → commit → push.

On the next laptop:

> fetch/pull → checkout same branch → inspect state → continue.

WIP commits are acceptable when moving unfinished work between computers.

### Rationale

This preserves:

- history;
- branches;
- source-of-truth docs;
- reproducibility;
- safe handoff between machines and agents.

### Consequences

Do not manually copy project directories as the normal synchronization method.

Secrets and large datasets/models require separate controlled handling.

---

## D-033 — COSI Is the Temporary Internal Project Codename

**Status:** ACTIVE  
**Date:** 2026-09-13

### Decision

Use:

> **COSI — Commerce Operating System Intelligence**

as the temporary internal project codename until the final company/product brand is selected.

### Rationale

The build needs a stable project/repository reference before final branding is resolved.

### Naming constraint

COSI should remain primarily a project-level label. Avoid unnecessary branding in domain entity/type names, database table names, APIs, reusable packages, or internal business invariants. Prefer domain-neutral technical names so the eventual brand change remains mostly a repository/app-display/marketing rename rather than a schema/code refactor.

### Brand status

COSI is **not** approved as the final public brand. A quick online search shows multiple unrelated organizations and at least one active SaaS product already using Cosi/COSI, reinforcing its use as an internal codename only.

---

## D-034 — Authoritative Quantities Use Fixed-Scale Micro-Units

**Status:** ACTIVE  
**Date:** 2026-09-14

### Decision

Represent authoritative inventory quantities and package conversions as signed
SQLite integers at a fixed scale of **1,000,000 micro-units per base unit**.
Parse user and sync inputs from canonical decimal strings. Domain arithmetic
uses integer/BigInt intermediates and must either produce an exactly
representable micro-unit result or reject the operation; it must never silently
round or use binary floating point as the source of truth.

Persisted values and values crossing React Native/native boundaries must remain
within JavaScript's safe-integer range. A later server contract will transmit
canonical decimal strings and store the corresponding values in PostgreSQL
`NUMERIC` columns.

### Rationale

Six decimal places support discrete FMCG units and foreseeable fractional
weight/volume categories while keeping local comparisons, sums, indexes, and
constraints simple. The safe-integer ceiling still permits roughly nine billion
base units per persisted value. Exact rejection exposes unsupported precision
instead of corrupting stock through hidden rounding.

### Smallest viable alternative considered

Canonical decimal strings plus an arbitrary-precision decimal dependency would
support variable precision, but would complicate SQLite ordering and aggregation
before evidence shows that more than six decimal places are needed.

### Revisit if

Pilot data requires more than six decimal places or a legitimate operation
cannot fit the safe persisted range.

---

## D-035 — Temporary Products Use Store-Scoped Provisional Variants

**Status:** ACTIVE  
**Date:** 2026-09-14

### Decision

Creating a temporary product in M2 creates one store-scoped provisional
`ProductVariant`, its active base `PackageUnit`, and the store's `StoreProduct`
record in one local transaction. A store-scoped variant has an owning store and
is private to that store. A platform variant has no owning store. New M2
`StoreProduct` records always reference a variant; `isTemporary` means the
identity still needs enrichment or matching, rather than meaning the product
has no package identity.

Later matching must be an explicit link/consolidation operation. It must retain
store-owned price, cost, stock, SKU, package settings, and historical transaction
snapshots. M2 may record the relationship but does not build the shared catalogue
or network reconciliation service.

### Rationale

Every sellable or restockable product needs a base unit and valid package
conversion. Giving temporary products a private provisional variant keeps the
existing `PackageUnit -> ProductVariant` ownership model intact and avoids a
second package table or nullable dual-owner foreign key.

### Smallest viable alternative considered

Allowing `StoreProduct.productVariantId` to remain null would require package
definitions to be owned by two different entity types or would prevent a
temporary product from participating safely in quantity calculations.

---

## D-036 — Exact Local Sale Arithmetic

**Status:** ACTIVE  
**Date:** 2026-09-14

### Decision

- Persist sale package quantity and inventory quantity as D-034 micro-unit
  integers.
- Compute `quantityBase = quantityPackages × conversionSnapshot / 1,000,000`
  and reject a result that is not exactly representable.
- Persist unit selling price and absolute line discount in integer minor units.
- Compute gross line money as
  `unitPriceMinor × quantityPackages / 1,000,000`; reject a fractional minor
  unit instead of silently rounding.
- Define `lineTotal = grossLine - discountAmount`, `subtotal = sum(grossLine)`,
  `discountTotal = sum(discountAmount)`, and `total = sum(lineTotal)`.

### Rationale

This extends the approved exact-or-reject quantity and money rules into M3,
keeps completed-sale totals reproducible, and avoids JavaScript floating-point
authority or hidden rounding.

### Consequences

The sale form must explain the rare quantity/price combination that would
produce less than one currency minor unit. Discounts are line-level absolute
amounts in M3; percentage and order-level discounts are deferred.

---

## D-037 — M3 Tender, Credit, Draft, and Correction Boundary

**Status:** ACTIVE  
**Date:** 2026-09-14

### Decision

- The M3 cart is an in-memory draft. No Sale or outbox row exists until the
  retailer confirms completion; leaving a dirty cart requires confirmation.
- One tender allocation covers the completed sale total in M3: cash, bank
  transfer, POS/card, or credit. Split tender is deferred.
- `Payment.amount` represents the amount allocated to its tender method. Credit
  is not counted as cash received.
- A credit sale requires a customer name and atomically creates or selects a
  lightweight CustomerAccount plus an OPEN Receivable for the credit amount.
  Name alone never auto-merges two accounts: the retailer explicitly selects
  an existing match or creates a new account.
  Partial settlement and debt-collection workflow are deferred.
- Cost/COGS snapshots are nullable until M4 supplies a validated cost state.
  M4 must not retroactively invent cost for already-completed sales.
- Completed sales are immutable in M3. Void/reversal/return UI waits for its
  explicit correction design; no delete or edit path is exposed.

### Rationale

This is the smallest coherent implementation of every PRD payment method while
keeping cash reporting honest and preserving completed transaction history.

### Consequences

Unexpected app termination can lose an uncompleted cart, but never a completed
sale. Completion must atomically commit the sale, items, tender, optional credit
records, inventory events, and one aggregate outbox envelope.

---

## D-038 — M4 Exact Cost Basis and Provisional Coverage Rules

**Status:** ACTIVE engineering contract; D-027 remains PROVISIONAL accounting policy  
**Date:** 2026-09-18  
**Approval:** Founder explicitly approved the M4 costing and screen proposal and
instructed the coordinator to assign M4 implementation.

### Decision

- Purchase quantity/conversion uses D-034 safe integer micro-units. Merchant
  input is total line cost or per-package unit cost in nonnegative integer minor
  units. Preserve mode/value and immutable quantity/name/conversion/currency
  snapshots. Unit-cost mode must yield an exact integer line total; total-cost
  mode can yield a fractional normalized price. Explicit zero cost is distinct
  from unavailable cost.
- Normalized package/base prices and moving average costs use reduced,
  nonnegative rational values, with BigInt internal calculations and canonical
  decimal-string numerator/denominator at storage/JSON boundaries. Cost ratios
  are minor units per whole base unit; denominators are positive.
- For fully covered positive stock, average equals exact remaining value plus
  receipt total divided by new quantity. Sales consume exact proportional value;
  processing order of repeated-product lines is stable.
- A fully covered NEW sale line snapshots its exact basis and method/version.
  Estimated COGS rounds half up once per line to integer minor units. Rounded
  COGS is not fed back into the exact stock valuation. D-036 sale amounts,
  discounts and tenders continue to use exact-or-reject arithmetic.
- Positive stock with unknown prior coverage has unavailable average/COGS;
  purchases still save and their original prices remain visible. When a receipt
  takes a prior zero/negative balance positive, initialize the positive remainder
  at that receipt's exact unit cost. Never retroactively cost the old deficit.
  Nonpositive stock has no usable average and zero costed quantity. A sale line
  exceeding coverage has unavailable COGS for the whole line, consumes remaining
  coverage, and remains a valid genuine sale under D-013.
- Completed pre-M4 sales remain unchanged. New immutable companion snapshots
  may preserve fractional cost basis; integer unit-cost fields must not pretend
  fractional values are integral. Sale cost snapshots and cost movements/state
  share the sale transaction. Cost state is store-private and reconstructable
  from immutable purchase/sale movements with explicit local application order.
- Purchase/items, positive inventory events, cost movements/state, personal
  observations, optional newly created supplier and one completed-purchase
  outbox envelope commit atomically. Replay preserves actor/store ownership and
  original immutable attribution, including resolved membership and device.
- Personal observations are private, reference purchase lines and default
  contribution consent to false. Supplier selection/creation is explicit;
  duplicate names never auto-merge. Restock draft is in memory with dirty-exit
  guards; purchase completion does not imply payment/payable settlement.

### Evidence and examples

The approved M4_RESTOCKING_COSTING_PLAN supplies verification cases: 20 units at
30000 kobo plus 40 at 35000 => 100000/3 kobo/unit; one-unit COGS 33333, three-unit
line COGS 100000. Half-kobo rounds to one kobo. Unknown positive stock retains
unavailable cost; balance -2 plus five purchased units costs only the positive
remainder of three, with no historical backfill.

### Tradeoffs and limits

Rational basis adds persistence/validation work but avoids compounding rounded
unit costs. Whole-kobo average storage was rejected because it loses basis;
leaving all subsequent sale COGS unavailable would defer required integration.
Per-line rounding can differ from rounding a combined quantity; retain exact
basis and method version, label costs as estimates, and make no finalized
accounting or full profit/P&L claim. Professional review remains required.
M5 reviews adjustment costing, and M7 reviews concurrent-device costing/order;
local application order is not global synchronization. Purchasing credit,
returns, voids, taxes and landed-cost allocation remain outside M4.

---

## D-039 — Minimal Batch Awareness and Automatic Assumed FEFO

**Status:** ACTIVE; implementation assigned to M5 planning, not completed M4.  
**Date:** 2026-09-18.  
**Approval:** Founder resolved pilot expiry/batch direction explicitly, including
automatic FEFO without ordinary batch selection and valid unknown stock.

### Decision

Use internal received/inspected groups for multiple dates per store product,
while retaining one ordinary product stock total. Dates are optional and preserve
DAY/MONTH/UNKNOWN precision and printed meaning; internal UUIDs are generated,
manufacturer lot numbers optional. One expiry group per new receipt line is
the minimum initial integration; repeated same-product lines handle mixed dates.
Product inventory events remain total-stock truth. Batch movements explain those
events and explicit net-zero classifications; projections are rebuildable.

Ordinary sales automatically use FEFO over recorded dates, then undated stock,
with stable ties and an ASSUMED_FEFO policy/evidence version. No mandatory
physical batch selection or confirmation. Inferred allocation is not physical
proof, even if the group was physically counted earlier. Unknown legacy/residual
stock, missing dates and genuine negative-stock sales remain supported.

Actual remaining recorded groups drive alerts, with estimated quantity wording
and coverage limits. No day countdown for a month-only label. Date passage
raises attention without stock subtraction; expired removal is a sourced
inventory/cost/batch/outbox operation. Normal sale recording stays possible;
elapsed-date warnings must not be confused with strict traceability/sale policy.

FEFO does not change D-027/D-038 moving-average financial costing. Old purchase,
sale, COGS, observation and outbox history remain immutable. Add schema through
new migrations after version 6; no unsafe historical date/lot reconstruction.
DOMAIN_DATA_MODEL 10.5 defines the facts and invariant placement.

### Rationale / alternatives

Single product expiry cannot represent mixed dates; historical receipt reminders
cannot indicate surviving grouped stock. Mandatory checkout batch selection adds
friction rejected by the founder. Automatic allocation with honest evidence and
physical reconciliation meets the small-retailer need. Unknown residual derived
from the event ledger avoids fabricated receipts or duplicate opening stock.

### Limits and revisit gates

M5 is local-first, not warehouse management, regulated traceability or batch-cost
accounting. M7 must review concurrent offline lot allocation and count conflicts
without discarding real sales. Strict physical identification, GS1 expiry/lot
capture and OCR are future enhancements; recognition identity stays separate.

---

## D-040 — Blind Checks, Inventory Adjustment Costing and Attention

**Status:** ACTIVE engineering/product behavior; D-027 remains provisional.  
**Date:** 2026-09-18.  
**Approval:** Founder approved expanded M5 stock-check/attention and conservative
unexplained-surplus costing before resolving D-039. Supersedes the previous
expected-quantity-first PRD 15.2 flow; extends D-038 to sourced M5 adjustments.

### Decision

Hide expected quantity before the first physical submission; retain count/recount
facts, compare and reconcile differences instead of training the user to guess.
Revalidate inventory and batch watermarks in finalization. A matching count
finishes without a zero-delta event. A total-only discrepancy cannot prove which
batch is missing; preserve the correction and mark unresolved composition unknown
or obtain a group count. Net-zero classification changes no cost or product stock.

Owner-only management is the first slice; new commands resolve the active OWNER
role rather than granting ADMIN/STAFF management implicitly. STAFF assignment and
supervisor review belong to M11. Default target three guided checks/day is
configurable/pausable and uses store-local foreground due windows. Selection is
versioned/extensible. Exclude ordinary nonpositive stock; replacements need
reasons and retain attempts. Repeated replacement is not an automatic accusation.

All nonzero adjustments/removals have immutable sourced aggregate/line facts,
explicit events and atomic cost/batch/outbox completion. Fully covered shortages
consume exact proportional moving-average value. Unknown coverage stays unknown;
unexplained positive additions make current aggregate cost unavailable, retaining
immutable value history rather than assigning zero/guessed cost. Extend cost
movement vocabulary/rebuild in a new migration; never rewrite historical COGS.

One attention list derives low/zero/negative stock, unresolved differences and
expiry. Durable snooze does not mutate inventory; resolved conditions vanish,
worsening severity resurfaces. Restock records a purchase; removed/expired actions
record real quantity effects. M6 promotes real attention to calm Home/See All.

### Consequences / rejected alternatives

Check completion proves only the observed stock facts at that time, not full
business/report accuracy. FEFO shrinkage guessing, absolute balance overwrites,
fabricated surplus costs and dismiss-only stock actions are rejected. Professional
accounting review and M7 concurrent-device order/conflict review remain gates.

---

## D-041 — M6 Money-Out Capture and Truthful Daily Summary

**Status:** ACTIVE engineering/product behavior; accounting interpretation remains provisional.  
**Date:** 2026-09-19.  
**Approval:** Established PRD/build requirements plus founder-delegated milestone
planning and ticket/design judgment; no new formal accounting claim.

### Decision

M6 records operating Expense and OwnerWithdrawal as separate immutable,
store-private, owner-attributed transactions. Initial management is active OWNER
only; later staff permissions belong to M11. Positive integer minor money, store
currency, optional note, occurred time, resolved member/user/device and one
atomic idempotent outbox envelope are required. M6 does not add edit/delete,
cash-account allocation, recurring schedules, receipts or accounting journals.

The store-local daily summary uses full half-open time ranges. Sales value includes
credit sales and is not cash received. Tracked COGS/gross margin is shown only
with explicit immutable cost coverage; unavailable coverage never becomes zero.
Expenses and owner withdrawals remain separate. No value is labelled net profit,
P&L, cash balance or retained capital. The optional popular product means the
product occurring in the most distinct completed sales that day, with stable ties,
not unlike-unit volume or revenue rank.

Home promotes these real facts and a bounded preview of M5 attention. Purchase-
cost/market movement signals remain M9/M10 under PC-07. M8 owns global Scan and
navigation changes; M11 owns staff activity/accountability.

### Consequences

Migrations are additive; expenses/withdrawals later sync as append/deduplicate
transactions. Professional accounting review remains required before formal
claims. Physical-device and release-readiness checks remain independent of source
acceptance.

---

## D-042 — M7 Authenticated Sync and PostgreSQL Application Boundary

**Status:** ACTIVE implementation contract under D-005/D-011/D-012; custom-sync
fallback remains available if the controlled spike proves unsafe.  
**Date:** 2026-09-19.  
**Approval:** Founder directed the coordinator to reconcile product changes,
prepare M7 and continue the milestone workflow; this records the smallest
transaction-safe implementation of the already approved Supabase/custom-sync
architecture rather than changing the selected stack.

### Decision

- Keep provider-independent, explicitly versioned sync DTOs in application code.
  Authenticated Edge Functions form the narrow transport boundary; PostgreSQL
  performs idempotency checks, aggregate application, store-revision assignment
  and change-log writes in one transaction.
- A verified Supabase Auth subject maps explicitly to a COSI domain user/member.
  Local user IDs are not silently treated as `auth.users.id`. The first owner may
  idempotently enrol one existing local-only store; later devices require active
  membership and explicit device registration. Final sign-in/invitation UI stays
  deferred.
- Every endpoint revalidates active membership, device/store relation, payload
  schema, operation permission and cross-store references. Secret/service-role
  credentials remain server-side. Use explicit grants, RLS and negative tests;
  never depend on automatic Data API exposure.
- Serialize accepted changes by locking one per-store sync-state row, then write
  applied-operation result, normalized business facts, incremented revision and
  change records before commit. Pull cursors advance only after local application
  commits.
- M7 includes every current M2–M6 canonical outbox operation. Append facts
  deduplicate; mutable catalogue/configuration uses base server versions and
  durable conflicts. M5 batch/count uncertainty and M6 owner-only money-out
  semantics remain intact.
- M7 source acceptance requires an actual disposable PostgreSQL/Supabase
  integration run. Mocks cannot prove transaction, grant or RLS behavior.

### Rationale

Independent Data API calls cannot make a multi-table Sale or Purchase commit
atomic. A transaction-owning database boundary preserves D-013 and the aggregate
outbox design while Edge Functions keep authentication and transport concerns
small. Explicit auth mapping allows existing local-first pilot data to enrol
without rewriting actor history or prematurely deciding final onboarding UX.

### Revisit trigger

Revisit D-011 and evaluate a managed sync engine if the M7 sale spike cannot
demonstrate safe idempotent retry, per-store ordering, RLS isolation and
recoverable pull without disproportionate complexity.

---

## D-046 — M8 Barcode Scanner, Basket Flow and Camera/Service Boundary

**Status:** ACTIVE  
**Approved:** 2026-09-29 by the founder after review and PC-08 clarification.

Implement M8-01 through M8-05 under M8_SCANNER_PLAN.md and the M8 section of
DESIGN.md. Use the SDK-compatible Expo Camera adapter and provider-independent
RecognitionService result semantics (STRONG / AMBIGUOUS / UNKNOWN), with native
and store/database types kept out of the shared contract. Barcode/QR is the
initial implementation; no final visual model/runtime or image enrollment is
approved by this decision.

PC-02 global Scan replaces the visible Sell tab while retaining manual selling,
the /sell route, history and all draft exit protections. PC-08 provides single
item and continuous basket modes. Automatic addition is allowed only for exact,
unconflicted identity with explicit valid package and known price; missing data
pauses for input. Duplicate-frame suppression, undo and physical verification
gate the fast path. Completed sales remain explicit, atomic and durable.

Reuse current catalogue/outbox commands, preserve typed identifiers and permit
temporary product enrichment after selling. Recorded zero stock does not erase
identity. Reproduce and correct the bounded identifier-claim sync gap under
OFFLINE_SYNC section 29 before enabling new associations. New ownership/protocol
semantics or broad schema redesign require a coordinator amendment.

Expo Camera is preferred over an additional high-performance camera stack for
this barcode scope. Visual/OCR/guided enrollment remain Track B/M12. The founder
selected one separate Astra implementation chat at low effort, with sequential
coordinator review after handoff; that staffing preference is not an architecture
dependency. No push, deployment or release approval is implied.

## D-044 — Reject Cross-Device Stale Physical Reconciliations

**Status:** ACTIVE  
**Date:** 2026-09-28  
**Approval:** The founder authorized completion of the M7 correction and phone
verification before M9 integration after the independent audit explained the
missing cross-device guard.

### Decision

Retain local blind-count and same-device inventory/batch watermark checks.
Each new finalized reconciliation also carries the last server revision fully
materialized on that device and a bounded set of the device's local inventory/
batch operation IDs already reflected in the counted projection. The server
checks that baseline under the store revision lock. It accepts later product
movements only when they are verified predecessors from the same device;
another device's later movement or batch change yields a durable `CONFLICT`.
Counts queued before this baseline existed fail closed for manual review.
The authenticated caller must retain an active OWNER membership to submit a
physical reconciliation; a payload role claim cannot grant this authority.
No conflict silently mutates the server inventory ledger. Genuine concurrent
sales remain append-only under D-013.

### Rationale

SQLite row IDs and local batch application order cannot compare state across
devices. A stale adjustment could otherwise overwrite the meaning of a real
sale. The server revision and operation IDs already exist in M7, so the guard
extends the canonical reconciliation envelope without a new queue or stock
system. A conflict keeps local evidence visible for review/recount.

### Revisit if

The pilot needs automatic cross-device count resolution, stronger device
cloning defenses, or counts with more than 5,000 unsynchronized product
predecessors. Those require separate UX and protocol evidence.

---

## D-045 — Restore Historical Identity References Before Bootstrap Replay

**Status:** ACTIVE  
**Date:** 2026-09-28  
**Approval:** The founder approved the bounded M7 fresh-device restore correction after the independent audit reproduced failure with a new device ID.

### Decision

An authenticated, membership-checked, store-scoped server contract supplies authoritative store, user, membership and device reference context for later-device bootstrap. The client stages that context with the paginated operation snapshot and exposes the restored store only after complete, validated replay. It preserves original actor, membership and device IDs in immutable facts, including references to devices or members whose access was later revoked or suspended. Historical-fact replay must validate same-store identity relationships without treating current ACTIVE status as a prerequisite. An atomic replay may temporarily satisfy legacy ACTIVE insert triggers if no intermediate state is exposed and authoritative statuses are restored before commit. New local business commands and server push still require current authorization under D-042; historical restore cannot reactivate access or authorize a new write. Do not synthesize identities from transaction envelopes or rewrite provenance. An incomplete restore must leave existing local and pending work intact and must not expose a partial store.

### Rationale

The existing bootstrap replays operations but omits the identity rows required by local purchase and other fact constraints. A fresh device with its own ID cannot replay a legitimate historical purchase from the originating device. Historical validity and current permission are different questions. Supplying server-authoritative references preserves provenance and permits later revocation without blocking restore.

### Verification boundary

Test a different new-device ID, later-revoked or suspended origin identities, multi-page M1–M6 facts, interrupted restore, and cross-store denial. This decision does not settle final invitation, sign-in or recovery UI.

---

# 6. Explicitly Deferred Decisions

These are intentionally unresolved and should not be reopened as though they were forgotten.

## DF-001 — Final authentication UX

**Status:** DEFERRED

Backend authentication provider is Supabase Auth.

Customer-facing sign-in method will be selected before onboarding implementation is finalized.

---

## DF-002 — Final recognition model

**Status:** DEFERRED

Requires R1/R2 benchmark evidence.

---

## DF-003 — Final inference runtime

**Status:** DEFERRED

Requires Android benchmarking.

---

## DF-004 — Final camera provider for advanced recognition

**Status:** DEFERRED

Expo Camera is an initial candidate.

Another provider may be selected if frame-processing benchmarks justify it.

---

## DF-005 — ORM

**Status:** DEFERRED

Architecture currently prefers explicit SQLite repository/migration layer.

Drizzle may be proposed before schema implementation if the active AI coding agent shows clear benefit and current stability.

---

## DF-006 — Managed sync engine

**Status:** DEFERRED

PowerSync or alternative may be evaluated if custom sync spike fails.

---

## DF-007 — Analytics/crash provider

**Status:** DEFERRED

Internal interfaces first.

Select vendor before external beta if needed.

---

## DF-008 — Subscription/pricing model

**Status:** DEFERRED

Requires product-market validation.

---

## DF-009 — Final market-price confidence algorithm

**Status:** DEFERRED

Requires actual observation data.

---

## DF-010 — Fractional quantity and conversion representation

**Status:** RESOLVED BY D-034

M1's package-conversion utility was explicitly provisional and discrete-only.
D-034 resolves the M2 gate with fixed-scale micro-units, exact integer
arithmetic, canonical decimal-string boundaries, and explicit precision/range
rejection. M2 must replace or extend the provisional utility before persisting
fractional PackageUnit definitions.

---

# 7. Explicitly Rejected Directions

## R-001 — PWA-first MVP

**Status:** REJECTED

Reason:

Native Android better matches initial offline/camera/ML workflow.

---

## R-002 — Universal visual recognition as launch prerequisite

**Status:** REJECTED

Reason:

High technical risk and unnecessary to validate core retailer value.

---

## R-003 — Cloud-first sales

**Status:** REJECTED

Reason:

Unreliable connectivity cannot be allowed to block transactions.

---

## R-004 — Full inventory setup before first sale

**Status:** REJECTED

Reason:

Creates onboarding friction and contradicts progressive value.

---

## R-005 — Last-write-wins for completed sales

**Status:** REJECTED

Reason:

Would destroy historical transaction truth.

---

## R-006 — One mutable stock number without inventory history

**Status:** REJECTED

Reason:

Does not provide auditability or reliable reconciliation.

---

## R-007 — Global catalogue searched for every offline visual scan

**Status:** REJECTED

Reason:

Unnecessary latency/storage and higher false-match risk.

---

# 8. Decision Change Template

Use this structure for future entries:

```text
## D-XXX — Decision title

Status:
Date:
Supersedes:
Superseded by:

### Decision
...

### Context
...

### Rationale
...

### Consequences
...

### Alternatives considered
...

### Revisit if
...
```

---

# 9. Current Decision Review

As of 2026-09-18:

- no active decision is known to conflict with the current Product Inception, PRD, Domain Model, Technical Architecture, Offline Sync or Scanning Architecture;
- M0–M4 source/automated scope is accepted after independent audit, with physical
  and release readiness carried; M5 planning now incorporates D-039/D-040 and
  has not been implemented or delegated;
- D-038 fixes engineering precision/coverage/rounding for M4; it does not finalize
  D-027 as accounting policy;
- D-039/D-040 approve pilot batch/FEFO, blind-check and adjustment behavior;
  implementation readiness depends on the coordinator's M5 plan/tickets/design,
  not on reopening completed M4 or treating the new documents as executed tests;
- provisional decisions requiring the strongest later validation are:
  - custom sync vs managed sync;
  - moving weighted-average costing;
  - visual embedding-retrieval approach.

---

# 10. Update Rule

Update this file when:

- a durable architecture decision is made;
- an approved decision changes;
- a major dependency is added/removed;
- a deferred choice becomes finalized;
- implementation evidence invalidates an existing assumption.

Do not rewrite historical entries to make old reasoning disappear.

Preserve the decision trail.

## D-052 — M11 source foundation and unpassed staff activation boundary

**Status:** PROVISIONAL SOURCE CEILING. **Date:**2026-10-03.
**Authority:**Founder explicitly said continue M11, lifting the prior hold;
coordinator retains tickets/audits and GPT-6.1 Sol HIGH sequential implementation.
This authorizes local source, not live accounts, role grants or deployment.

Existing actor IDs and OWNER/ADMIN/STAFF membership vocabulary are retained.
M11 hardens ACTIVE account/store/member/device and exact actor-device resolution,
adds owner-only activity/check-attempt review, and a disabled default prototype
for existing non-OWNER membership suspension/reactivation and device revocation.
No account/invite creation, role change, ownership transfer or revoked-device
reenrollment. No offline local request grants permission; only authoritative
current owner status responses can confirm a control. Current business roles
are not broadened; D-040/D-041/D-044 and M9/M10 OWNER boundaries prevail.

Historical replay preserves inactive actors under D-045; it never authorizes new
commands. M7 store-wide bootstrap/history is not a certified least-privilege staff
feed. Real staff enrollment/session switching, limited data delivery and distinct
staff blind assignments remain OPEN M11 gates, requiring explicit scoped design
and live/security verification before activation. Do not mark whole M11 complete
from source groundwork or silently move those requirements to M12.

See M11_STAFF_PLAN/TICKETS for smallest source slices and evidence. No schema1–27
rewrite, business-envelope change, finance/costing/recognition dependency change
or persistent hosted effect. Necessary durable source control state may be added
in migration28 with populated upgrade tests; server migrations authored only.

## D-053 — Recognition lab airplane-mode policy correction

**Status:** APPROVED BOUNDED IMPLEMENTATION; acceptance pending.
**Date:** 2026-10-14, Africa/Lagos. **Authority:** Founder “ok proceed” after
PHONE_P1_OFFLINE_GATE_REVIEW_20261014.md and explicit security-boundary approval
question. Same stopped sole writer, Sol6.1 HIGH; independent coordinator audit
precedes any replacement APK/device execution.

For the isolated private-photo lab only, correct the saved-policy predicate:
airplane ON, policy includes cell/Wi-Fi/Bluetooth, Wi-Fi saved state only 0 or 3,
Bluetooth only 0 or 2. Special values are valid only in that context; enabled,
override, missing, unknown or read-error states refuse. Admission and repeated
cancellation must share the tested rule. Saved policy is not a live hardware
oracle: retain explicit founder confirmation and scoped actual radio/cellular/
network/tethering evidence, with polling/vendor/OS limits stated.

No new permissions, native dependencies, INTERNET, automatic radio mutations,
business/scanner/recognition-service contract, model/math/crop/ranking changes.
Provide a bounded non-inference status check with clear refusals and no private
store/decoder/model admission. Update truthful replay source fingerprint and
produce a separate replacement APK; preserve original APKs, failed attempts,
accepted C4 archive and all JPEG/control/box/baseline bytes. No test bypass,
runtime inference or phone installation is authorized during implementation.
Source/generated/build acceptance does not accept hardware or private quality.

October14 independent C1 audit clarification: the actual Android airplane-policy
list includes known optional `uwb` (`cell,bluetooth,uwb,wifi,wimax`). Recognize
that token within the approved interpretation while retaining all required
radios and unknown/duplicate/error refusal; this adds no radio API/permission.
C1's synthetic fixture omitted it and falsely passed the device goal. C1 APK is
not accepted; same-writer C2 correction and independent audit are required.

## D-054 — Isolated P2 camera experiment and explicit producer-storage limit

**Status:** APPROVED BOUNDED SOURCE IMPLEMENTATION; camera proof pending.
**Date:**2026-10-15,Africa/Lagos. **Authority:**Founder explicitly selected
“Approve this isolated camera experiment” after the concrete G0 question stated
camera-only access, owned256MiB storage, SDK temporary files measured separately,
no proven hard temporary-storage/total-memory cap, and later build/install/proof.

P1 G1 review is accepted only for the frozen packet in
PHONE_P1_OFFLINE_CONFIRMATION_RESULT_20261015.md. G0 choiceA is selected from
PHONE_P2_03_G0_DECISION_20261015.md and supersedes the October14 draft's proposed
all-inclusive256MiB claim for this isolated camera experiment only. Enforce256MiB
on experiment-owned retained/staged/metadata/derivative/export storage, with exact
reservation/atomic-write/residue accounting. SDK producer/cache exposure and peak
memory are separate measurements without a proven application-wide hard cap.
Do not imply24MiB headroom or the old19/20-file arithmetic proves a total bound.

Use the installed Expo Camera only behind an explicit isolated camera-proof
opt-in. CAMERA is the only new permission; retain no network/audio/gallery/media/
location access, no upload and no ordinary/business app behavior change. Explicit
permission/capture action, current native job, camera-callback provenance and
canonical app-cache UUID JPEG/open-file checks form the approved experimental
ingress boundary; directory membership is not sensor attestation. Bound accepted
JPEG<=12MiB/header<=4,000,000pixels before bitmap allocation/admitted copy, retain
strict observed metadata/EXIF refusal policy, and use the pinned CPU/bilinear
recipe under separate camera source/evidence bindings. No model/provider/native
dependency/lockfile change, silent image repair/downsample/recapture, forced drain,
evidence eviction or business-data integration is approved.

The256MiB owned cap includes unresolved reservations/partial writes, atomic
metadata/new/backup files, retained data, derivatives and exports; derive the
actual worst-case reservation from implementation. No115-capture capacity claim.
SDK files outside that cap remain reported exposure; unknown/oversized production
is retained refusal evidence rather than admission. Camera-wide allocation and
cache durability remain unproved. The later physical generated-target packet
must measure these limits and preserve every unknown/refusal.

Same stopped implementation writer resumes for an exact source/generated-check
slice, then sends a stopped handoff to the coordinator for independent audit.
No APK/native build, installation, camera capture/private data/model execution or
radio change is authorized in that source slice. G3 exact build/static APK and
G4 finite generated-target proof follow their separate reviewed packets. This is
not a final production camera-provider decision (DF-004 remains deferred), live
recognition acceptance, permission to begin P2-04 or a waiver of physical proof.

## D-055 — Test-only camera derivative and exact internal receiver guard

**Status:** APPROVED BOUNDED G3-C2 CORRECTION; APK/physical proof pending.
**Date:** 2026-10-17, Africa/Lagos. **Authority:** Founder answered “Okay, go ahead”
to the concrete camera-only experiment correction proposal after the coordinator
confirmed G3-C1's actual R8 failure and explained the native-source amendment.

Permit a task-owned derivative of the installed Expo Camera 57.0.6 for this isolated
build only. Remove scanner implementation/imports/callbacks/reflective availability
and three scanner dependency declarations using the exact copied-source targets
in PHONE_P2_03_G3_C2_PROPOSAL_20261017.md. Retain still-camera behavior and reject
barcode scan/launch before URL/image work. Keep MIT notices and separate base/
derivative fingerprints. Installed node_modules, production sources/package/lock,
P1/G2 evidence, model/recipe and other module versions remain unchanged. No new
provider, dependency version, fake SDK class, missing-class suppression or R8 bypass.

Explicitly amend the literal only-CAMERA criterion: CAMERA remains the sole Android
capability permission; also retain exactly this app's AndroidX
DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION declaration/request with signature
protection. No wildcard permission exception, guard stripping or additional Android
capability. Original C1 assertion failure remains preserved and unaccepted.

Same writer GPT-6.1 Sol High, fresh stage/evidence and finite coordinator lease,
offline build/static checks, stopped handoff and independent coordinator audit.
No phone/ADB/install/camera/private pixels/model/radio/Git or external effect.
G4 physical proof and P2-04 remain held. D-054 storage/SDK-cache/RAM limits stand;
this is not a permanent production provider choice or successful build acceptance.

## D-056 — Exclusive camera publication and staged-reservation classification

**Status:** APPROVED SOURCE/GENERATED-TEST AMENDMENT; independent review pending.
**Date:** 2026-10-18, Africa/Lagos. **Authority:** Founder explicitly instructed
the stopped Track B writer to execute the coordinator's
PHONE_P2_03_STORAGE_CAUSE_AND_REPAIR_PLAN_20261018.md after its Astra review.

Replace Android hard-link publication with a small isolated JNI adapter for
same-directory renameat2(RENAME_NOREPLACE). Keep minSdk24: lazy library loading
and runtime symbol resolution must explicitly refuse unsupported API/runtime
before capture, without an overwrite, copy/delete or hard-link fallback.
Preserve verified directory/file identity, single-link regular-file/owner checks,
file sync, directory sync, bounded names and no-replace semantics. No third-party
dependency, permission, business-data or model/recipe change.

Extend explicit interrupted classification only for an exactly complete, valid,
owner-bound reservation.new with no other job files and established drained
ownership. Preserve reservation content/hash, append only INTERRUPTED evidence,
and retain malformed/partial/extra residue as a refusal. No reset, deletion,
ownership transfer, resumed camera job or fabricated successful receipt.
Read-only inspection and interrupted-metadata publication must remain bounded
and restart-idempotent; capacity is released only after durable resolution.

This approval covers source and generated checks, followed by a stopped handoff
to the coordinator. Exact APK/native build, generated Android smoke, installation,
actual old-record classification and another camera attempt remain separate
reviewed gates. Existing C4/C5 artifacts and errors stay preserved. Legacy source
owner is not provenance for repaired code. GitHub/CI repair remains deferred.


## D-057 — One-attempt export of the saved generated-chart evidence

**Status:** APPROVED BOUNDED SOURCE/GENERATED-CHECK CORRECTION; audit pending.
**Date:** 2026-10-19, Africa/Lagos. **Authority:** Founder answered
“Approve the bounded export correction” to the explicit saved-chart local-export
request, including the new path out of app-private storage.

Implement only explicit export for job9d763e82-2a00-42ce-9a5f-0f4b2d9fde5c,
without new capture/model execution. Fixed original JPEG/PNG/JSON/commit facts and
hash/provenance manifest; user-selected local Downloads only, no remote provider,
new permission/dependency, arbitrary file reader or business-data change. Original
files/EXIF and legacy source owner remain immutable; exporter provenance separate.

Coordinator finalized the prior proposal's accounting prerequisite in
PHONE_P2_03_C7_SAVED_EVIDENCE_EXPORT_DISPATCH_20261019.md: aggregate logical cap
remains256MiB; permanent16908288byte export allowance comprises16MiB single-output
and128KiB bounded sidecar bookkeeping, leaving251527168bytes for camera claims.
The allowance is never automatically released, even on cancellation/failure.
Durable one-attempt consumption precedes the picker; torn/unknown/reopened state
refuses replay. Shared busy ownership persists until actual work is drained;
no stale callback release, evidence eviction, selected-document deletion or
truncation of pre-existing nonempty data. Verified output readback is distinct
from unproved provider directory/power-loss durability. D-054 SDK/RAM limits stand.

Same stopped Track B writer Sol6.1High owns source/generated checks, then STOP
and direct handoff for independent coordinator audit. This approval does not
execute build/install/export/phone/Git/CI. Capture/save observations passed;
quantitative geometry remains INCONCLUSIVE with unchanged measurement tolerances.
P2-03/G4 and P2-04/later acceptance remain held; GitHub/CI repair remains deferred.


## D-058 — One separate stationary-chart capture/export slot

**Status:** APPROVED SOURCE/GENERATED-CHECK CORRECTION; independent review pending.
**Date:** 2026-10-22, Africa/Lagos. **Authority:** Founder approved the proposed
controlled follow-up/tool update, said “go ahead with correcting what you need
to correct” and explicitly reiterated6.1 High for implementation, Low for tests.

The prior capture/save/export passed; geometry evidence remains incomplete.
Permit one new fixed slot/job76d28e3f-cdcd-4d1a-a86e-026e2568ce5e, not a reset of
consumed C7 or a generic exporter. Coordinator finalized the persisted authority,
cap and provenance contract before coding in
PHONE_P2_03_C8_STATIONARY_SLOT_SOURCE_DISPATCH_20261022.md. Separate owned sidecar
camera-geometry-c8-v1 has only bounded immutable intent/export-attempt/terminal
records. Durable intent precedes fixed-job reservation/capture; crash/cancellation/
failure never rearms. Only that complete PUBLISHED bound job can use one explicit
local Downloads export; all original C7 evidence/guards/outputs remain retained.

Inside the unchanged256MiB logical owned cap, permanently reserve two16MiB+128KiB
allowances (33816576bytes total), leaving234618880 camera claims. No eviction or
uncertain allowance release. Preserve existing camera ingress, CPU model/recipe,
legacy owner, shared-busy/finalization/cancellation and local-output guards.
No arbitrary job/path, new provider/permission/dependency/JNI/business contract.
New capture/export source/APK and deterministic high-contrast generated target
bindings are separate from historical C7 provenance. SDK cache/RAM unknowns stand.

Same Track B writer Sol6.1High implements SOURCE/generated tests and stops/directly
reports for coordinator audit. No phone is needed. Build/install/ONE controlled
physical capture/inference/export require the later exact reviewed packet and
founder readiness; no device execution in this approval slice. Precise geometry
still requires actual stationary/timing/annotation evidence with unchanged1%/2px/
1source-pixel criteria, not source-based promotion. P2-03/G4/later remain held;
GitHub/CI repair remains deferred. Fixed test execution Low; corrections/audits High.


## D-059 — Finite remaining P2-03 camera matrix and evidence amendment

**Status:** APPROVED bounded amendment2026-10-23; source/build/physical acceptance pending.
Founder approved commencing after main presented one test-app update,12 camera
attempts(four interruption controls/eight layout-pose rows),three permission
observations,up to16 generated-chart preview screenshots and one local90MiB ZIP.
Normative reviewed proposal: PHONE_P2_03_REMAINING_MATRIX_PROPOSAL_20261023.md,
SHA256 f3107a23cbf3cc93207046bac53c016497651e635ceb9802e145554f4a62ce83.

New matrix JPEG admission<=10MiB; legacy12MiB/R/old evidence unchanged. New90MiB
output+192KiB bookkeeping reserve stays inside existing256MiB camera-owned cap.
SDK cache/total memory remain separately exposed/unproved as D-054; this is not
an all-app bound. Fixed registry, zero automatic replacements, one local Save/
export, no upload, reset or arbitrary private export. Actual shutter requires
fresh human chart readiness; approval is not immediate phone readiness.

Source-only High assignment precedes independent review, one offline build/
static review and prepared Medium physical execution. Held pre-handoff controls
do not prove native-in-flight cancellation/hardware drain. All original gates
need an explicit evidence disposition; no automatic P2-03/P2-04 acceptance.
P2-04 plan stays held, P2-05 planning and CI repair remain deferred. See
reports/PHONE_P2_03_MATRIX_SOURCE_DISPATCH_20261023.md.


## D-060 — Native camera component early integration, isolated test only

Approved by founder directly in SAME mini-app chat after S03 scoped alignment pass and explicit packet explanation (31Oct/1Nov2026 Africa/Lagos). Permit flagged recognition-verification build effective minSDK30, preserving ordinary retail minSDK24 and carrying Android7–10 camera-component compatibility as unresolved. Add separate integrated67108864-byte allowance; retain historical253602084 logical claims and separate standalone67108864 allowance without refund/deletion. Combined logical exposure387819812 bytes, excluding SDK/build/install/RAM/GPU overhead; no total-memory guarantee. Source admission must enforce new fixed namespace, exact accounting and free-space checks; preserve legacy guards outside variant and block old ingress before history initialization inside variant. Use same tested component source and pinned CPU recipe/model with explicit new acquisition binding, shared operation ownership through actual drain, durable one-attempt records. Approval covers implementation/local checks/offline signed build. Exact install/physical I00 packet and fresh READY are later; no extra capture, Git/CI/P2-04 or recognition architecture change. See p203-mini-early-integration-packet-20261031-a1/INTEGRATION_PACKET.md.

### 1 November 2026 amendment — finite Layout B batch

Founder approved proceeding with the presented M04–M07 batch and necessary app update in SAME mini-app chat01a18b1c-dddc-76f3-b147-610604e47e08, user message01a19889-7cdd-7872-a3e6-202d2acf81c3: “All right then, so let's begin ... the B version ... M04 to M07 ... do everything ... then ... measurements.” Coordinator verified that actual user message following the explicit256MiB proposal and pending allowance discussion; approval is the contextual go-ahead, not a claim that founder restated the byte value.

Raise ONLY integrated logical test-evidence allowance from67108864 to268435456bytes (64 to256MiB) for fixed non-reusable I06/B000,I07/B090,I08/B180,I09/B270. Retain old253602084 claims and separate standalone67108864 allowance. Combined logical exposure589146404bytes, increase201326592bytes, excluding APK/build/SDK/RAM/GPU; not a finding of phone storage exhaustion or a memory guarantee. Recorded retained integrated private/spent outputs18539262 plus four unchanged49MiB reservations205520896 totals224060158, leaving44375298 under the new cap. Actual inventories, uncertain residue/spent outputs, projected remaining reservations and existing free-space floor must be checked; no deletion/adoption/refund or shared-reserve optimization.

Same agent may implement/self-check/build one coherent fixed four-row update and perform the requested same-signer in-place update and finite trial after artifact/device/retention/free-space checks. One exclusive active owner with actual camera/worker/CPU/picker drain; durable per-row consumption, selection and image/CPU/export identity across reopen; no READY transfer or rearm. Four photos/eight screenshots maximum, fresh positioned human READY per photo and unchanged120second dispatch deadline, verify original/crop/receipt SAVED/hash before each next photo. Detailed measurements and one CPU run, one<=16MiB streaming ZIP/readback and one selected transfer per saved row afterward, at most four each. Invalid frame or uncertain effect stops, no automatic retake or refund. New4:3 preview and analysis must use actual captured geometry/dimensions, unchanged1%/4px/2px criteria and mandatory manual raw/outer-ring review. Existing successful Layout A evidence remains retained.

Implementation/repair stays Sol6.1High, interactive test TerraMedium per founder preference; agent asks founder directly for changes. No per-slot coordinator source-review gate. Later timed interruption and remaining invalidation/permission dispositions are outside this finite packet, as are Git/CI/P2-04 and fullP2-03 acceptance. See p203-mini-layout-a-sol-verification-20261101-a1/REVIEW_AND_BATCH_PROPOSAL.md and p203-mini-layout-b-proposal-coordinator-review-20261101-a1/REVIEW.md. No implementation/build/device effect has occurred merely by recording this decision.

### 2 November2026 — P2-03 scoped acceptance and M07 retention

Coordinator accepts P2-03's experimental camera proof based on standalone/early
integration, eight A/B alignment positions below unchanged1% including uncertainty,
saved photo/crop/CPU/export/reopen identity, scoped IC01 recreated-screen recovery
and labelled generated invalidation checks. IC01 measured51.219seconds rather
than planned30 and does not prove continuous focus or surviving-component stale
ticket refusal. Missing hardware demonstrations remain limitations; approved
standalone plan step4 assigns other invalidations to generated checks.

Founder message01a199bd-337f-79f3-8adc-f3954a997d3e in the dedicated mini-app chat
accepts keeping M07 conditionally if outside-chart laptop content does not affect
the work/result. Independent review finds its border/eight marker windows clear
and0.4921726480% geometry valid, satisfying that condition. Keep it as restricted
alignment evidence, no retake; do not assert clean-scene conformity or a blanket
waiver. Formal report:
apps/recognition-lab/runs/phone-experiment/p203-final-disposition-20261102-a1/COORDINATOR_ACCEPTANCE.md.
P2/M8 overall, production reliability, GPU cause, current-native physical
in-flight/revoke/hardware-drain proof and Android7–10 compatibility are not
accepted. Existing storage/consumed records remain; no new effect allowance.
P2-04 may now be considered against its existing plan after current-native baseline
reconciliation; this decision does not dispatch code, phone, Git or CI actions.


## D-061 — P2-04 barcode dependency integration, experimental source only

**APPROVED by founder, 2 November 2026:** selected “Approve source-only barcode integration (Recommended)” after the explicit card identified17 dependency additions, initialization/background components, unchanged no-Internet permissions and no installation/phone/photo authority. Normative scope: docs/recognition/PHONE_P2_04_BARCODE_INTEGRATION_DECISION_20261102.md, layered on the existing Astra P2-04 plan/native reconciliation.

Permit SAME dedicated chat01a18b1c-dddc-76f3-b147-610604e47e08 at Sol6.1 High to add the exact cached bundled MLKit17.3.0 closure only to the isolated experimental source variant and implement/self-check barcode observation/confirmation/dedup/conflict and safe camera/CPU handover. Preserve129 baseline artifact identities, old source/APKs/data/consumed attempts and integrated256MiB cap. No retail scanner/business/schema/model/framework replacement. Keep existing CAMERA/internal-signature permissions; no Internet/network permission, network download or unreviewed transitive change. Retain actual provider/job/receiver/license consequences for review; static compatibility is not proof of runtime/offline/privacy behavior.

Actual public-API detector/image/resource ownership and drain must be justified before enabling handover. Task completion, count-only bookkeeping, a timeout/fence or void close is not proof; unknown drain holds the owner and leaves barcode disabled. No internal API cast or guard weakening. One coherent implementation with self-check/fixes then stopped coordinator handoff, no interim batch audits/new agents. Source approval includes focused local checks, not a new APK build/install, phone detector execution, photos/screenshots/CPU/export/general private reader, Git/CI or P2-05. Later physical work needs exact finite packet and fresh human READY. Combined P2-04 remains open.


## D-062 — Bounded Java ZXing retrieval and conditional experimental source substitution

**APPROVED by founder, 2 November 2026:** selected “Approve retrieval and conditional source integration (Recommended)” after the coordinator card identified Maven Central retrieval, source/license/lifecycle inspection, conditional replacement of proposed MLKit and no APK build/installation/phone/photo authority. Normative packet: docs/recognition/PHONE_P2_04_DECODER_RETRIEVAL_PROPOSAL_20261102.md. D-061 remains historical authorization, not evidence that MLKit was implemented.

SAME dedicated agent at Sol6.1 High may retrieve ONE stable com.google.zxing:core release from the specified primary sources, exact version/URLs pinned before artifact transfer, binary/POM/source/checksum/license evidence under aggregate10MiB. No global caches/package-manager install/lifecycle scripts or arbitrary mirrors. Inspect actual public synchronous decode/reset, owned luminance/image lifetime, closure/licenses/toolchain and no-native/GMS/provider/network/extra-runtime-dependency conditions. Only if all stated criteria pass, continue directly to one coherent isolated enrollment source integration/self-check within the packet's optional Gradle/native analyzer/worker/owner/state/Activity/bridge/UI/tests scope. Failed criteria return a concrete decision with barcode disabled; no silent alternate release/library/architecture.

Preserve129 baseline identities, frozen A2/APKs/data/caps and all prior evidence; result cancellation/interrupt does not release ownership until actual worker/error/reset/image cleanup and terminal callbacks finish. Keep GTIN/stability/confirmation/dedup/conflict/no-code/product-generation safeguards and fresh human READY policy. No business/core scanner/schema/npm lock/global cache change, new service/process architecture, APK build/sign/install, phone/radio/settings/photos/screenshots/model processing/export/general reader, Git/CI/P2-05 or new agents. One stopped final source handoff after self-review/fixes/local checks; full combined P2-04 acceptance and exact later build/physical packet remain open.


## D-063 — One ZXing offline APK build and conditional update/setup

**APPROVED by founder, 3 November 2026:** selected “Approve build and conditional update/setup (Recommended)” after the explicit coordinator card described one offline build, independent APK review, one data-preserving update and initial setup check. Normative exact packet: docs/recognition/PHONE_P2_04_ZXING_BUILD_SETUP_PACKET_20261103.md. Source639 index a0ef1e99888ea28b9a5f8d6cfa240d6013bb80f86db2d027b9a0de08f5d2f815 independently reviewed in p204-zxing-coordinator-review-20261103-a1/REVIEW.md; residual physical/build and expired-writer-lease limitations retained.

SAME agent uses Sol6.1 High for one offline release assembly/sign attempt and static proof. Require129 baseline artifact identities plus exact reviewed core3.5.4, source/template/signature/model/manifest/R8/license assets/arm64/16KiB/CRC checks, unchanged CAMERA/internal signature permissions and no MLKit additions. Maintain a live own lease; no retroactive validity or rearming a consumed attempt. Preserve branch/dirty work/source/APKs/data and all failed evidence. No source relaxation, downloads or global cache mutation.

Only after coordinator independently inspects the actual successful artifact may SAME agent at Terra6.1 Medium perform one same-package -r update and one normal initial setup/text inspection on confirmed Galaxy A15 RZCX22H432K/SM-A156E/UID10264 from expected installed visualA2 APK4cb2cb8d. Verify exact before/after APK/signer/UID/device/free-space and preserve data. No Initialize, capability enable, permission/settings/radio changes, scanning/preview, photos/screenshots/model CPU/export/general reader, force-stop/clear/uninstall/downgrade/automatic rollback, Git/CI/P2-05 or new agents. Unknown effects are reconciled, never blindly repeated. Full P2-04 and finite physical/readback/product/READY gates remain open.

## D-064 — P2-04 bounded evidence source and available-product roster

**APPROVED by founder, 5 November 2026:** after the focused plan and source-only approval request, founder said to proceed and clarified that missing historical products may need replacing to complete ten. SAME dedicated chat01a18b1c-dddc-76f3-b147-610604e47e08 at Sol6.1 High owns implementation/self-checks and one stopped final handoff under PHONE_P2_04_EVIDENCE_BOUNDARY_PLAN_20261105.md, including its roster clarification.

Permit controlled-root accounting, five bounded numerical-report slots containing canonical product labels/barcodes and image-derived feature vectors, and local-only report transport SOURCE implementation. Retain one real gallery; use first-real-product recovery/replacement proof instead of synthetic phone practice. Integrated256MiB, separate historical/standalone claims,64 admissions/4096 events and all prior evidence stay unchanged. No general private reader, new dependency/permission, capture/model/recipe change or business schema change.

Allow editable roster preparation before initialization, with exactly ten actual founder-confirmed product/package identities required at initialization; historical P1 names are suggestions, not mandatory. Missing items may be replaced before that point. Bind and retain the final roster/session; never relabel committed evidence or use a view replacement to substitute a product. No direct matched old-P1 comparison claim for changed membership. Roster confirmation can wait while source implementation proceeds.

This authorizes source/local checks only, not APK build/install, phone initialization/scanning/photo/report/export, extra attempts, Git/CI/P2-05 or new agents. Proposed41 photos/42 admissions and other physical counts require their later exact approval. Same writer handles routine fixes; one coherent stopped handoff for coordinator review, no interim coding-batch audits.

## D-065 — Evidence source659 offline build and conditional update/setup

**APPROVED by founder, 6 November 2026:** selected “Approve build and conditional update/setup” after the coordinator's explicit card described one offline APK, review before installation, one data-preserving update and initial setup check, excluding scanning/photos/exports. Normative packet: docs/recognition/PHONE_P2_04_EVIDENCE_BUILD_SETUP_PACKET_20261106.md.

SAME dedicated chat01a18b1c-dddc-76f3-b147-610604e47e08 uses Sol6.1 High for accepted source659 preparation/build/self-checks and one stopped artifact handoff. Coordinator independently reviews the actual APK before the same chat at Terra6.1 Medium may perform one same-package update and initial setup/text check on the confirmed Galaxy A15, preserving data. Source index3d9ad3427b4f192d1a3cf8f918e1403ff8e3d82fe803724cca4541d033d11a4f and archivea3a2a68f076a25ecb0002a5f47c23efe12848b93c13424b0895d4a68602e71f8 bind the reviewed inputs. Keep130 dependency identities, toolchain/model/signer/permissions, all caps, old evidence and prospective ownership checks. Preserve/reconcile uncertain effects; no blind retries or retroactive lease renewal.

No initialization, scanner/camera preview, photo/screenshot, CPU model run, report preparation/export/readback/transfer, permissions/settings/radio changes, data clearing/uninstall, dependency/network changes, Git/CI/P2-05 or new agents. The finite physical packet and ten confirmed product identities remain later gates. Build/setup success is not P2-04 physical acceptance.

## D-067 — Bounded control-publication and initialization recovery source

**APPROVED by founder, 6 November 2026:** selected “Approve source correction and recovery implementation” after the focused plan. Normative plan: docs/recognition/PHONE_P2_04_CONTROL_PUBLICATION_RECOVERY_PLAN_20261106.md. SAME dedicated chat01a18b1c-dddc-76f3-b147-610604e47e08 at Sol6.1 High owns exact native saving allowlist correction, bounded read-only setup reconciliation, and explicit continuation source only for a saved initialization exactly matching the recorded roster/session/source. Partial, conflicting or journal-stage evidence stays untouched. Preserve all existing evidence, consumed attempts, R01 uncertainty and charges, limits and later R02 gate.

Approval includes source implementation, self-review/correction and local checks with ONE stopped handoff. No APK build, installation, phone inspection/recovery, photos/screenshots, scanning, model execution, report preparation/export, settings/network, Git/CI/P2-05 or new agents. Those effects require their applicable later approval. Source verification is not device recovery or P2-04 acceptance.

## D-066 — Retain uncertain R01, provisional metadata preflight and one initialization

**APPROVED by founder, 6 November2026:** selected “Approve provisional baseline and initialization (Recommended)” after the explicit card disclosed permanent absence of the canonical pre-initialization R01 report and the mandatory later R02 report gate. Normative disposition: docs/recognition/PHONE_P2_04_R01_DISPOSITION_PROPOSAL_20261106.md, recommended no-code route only.

Preserve consumed/uncertain R01, all private records, conservative reservations/external charges and five-slot accounting without refund, retry, reset or substitute report. Accept the successful CLASSIFIED_METADATA_ONLY app accounting observation as a provisional pre-initialization baseline, not a passed R01 or reconstruction of its missing cut. Cause of unfinished report remains unproven. SAME agent Terra6.1 Medium may verify the ten live draft product/package identities, confirmation, session/source/uninitialized state and current bounded accounting, then perform ONE founder-requested initialization and verify the saved mapping. Preserve the draft and reconcile uncertain effects; no blind repeated initialization. Slot07 replaces lip gloss with Freshglow Bar soap / Milk & papaya; ordinary practical labels remain acceptable.

R02 must supply full canonical/host-validated descriptor/journal/inventory/accounting including retained R01 after the separately approved first-product recovery milestone, before additional photos. This approval grants no photo, detector session, force-stop, CPU model run, report preparation/local export/readback/host transfer, extra slot, source/build/install/settings/network/Git/CI/P2-05 or new agent. The broader finite physical packet still needs its exact approval. This is an explicit evidence limitation, not a recovery of missing R01 or Android physical acceptance.

## D-068 — Source665 offline build and conditional update/read-only check

**APPROVED by founder, 6 November2026:** after the plain-language explanation, founder replied “Proceed with the update and check”. This approves PHONE_P2_04_CONTROL_RECOVERY_BUILD_OBSERVE_PACKET_20261106.md: SAME dedicated agent at Sol6.1 High prepares ONE offline APK from frozen665, self-checks and returns a stopped artifact handoff; coordinator reviews actual APK before SAME agent at Terra6.1 Medium performs ONE data-preserving update, normal launch and ONE explicit read-only original-initialization inspection on the confirmed Galaxy A15. Preserve old APK/source/data, exact original roster/session, R01 uncertainty, all charges and current limits. Retain unexplained source-test startup timeout qualification.

No resumeInitialization or new initialization, camera/preview/photo/screenshot/barcode/CPU, report preparation/export/readback/transfer, settings/network/dependency changes, Git/CI/P2-05 or new agent. Unknown effects must be reconciled rather than repeated. Phone unlock/connection may be requested directly if needed. Subsequent recovery is a separate decision based on actual saved-state observation and founder roster reconfirmation.

## D-069 — Explicit completion of original matching initialization

**APPROVED by founder, 7 November2026:** after seeing all ten ordered product/package entries and the plain-language explanation, founder replied “Confirmed—finish saving these ten products”. Approve PHONE_P2_04_MATCHING_INITIALIZATION_CONTINUATION_PACKET_20261107.md: SAME dedicated chat Terra6.1 Medium verifies current expected artifact/device/focus, performs ONE fresh read-only eligibility inspection, reconfirms the exact recorded identities and dispatches at most ONE explicit matching original-initialization continuation. MATCHING_STAGE/DESCRIPTOR_ONLY require the exact bound request and empty journal; COMMITTED_MATCH is verification only. Unknown/conflicting/partial/staged-journal state stops without retry or replacement. Record intent before effect and preserve primary result/readback plus ONE normal read-only setup refresh when appropriate.

Preserve session enrollment-mw4zmxro, original source659/descriptor/roster spelling and whitespace, original interrupted evidence, R01 uncertainty/charges and later mandatory R02. No new initialization, relabel/session substitution, build/install/reset/restart, camera/preview/photo/screenshot/barcode/model CPU, report preparation/export/transfer, settings/network/dependency/Git/CI/P2-05/new agent. Approval completes this original save only; P2-04 physical enrollment remains separate.

## D-070 — First real product photo, pre-shutter recovery and R02 proof

**APPROVED by founder, 7 November2026:** selected “Proceed with the first-product check” after explicit plain-language request for ONE Fanta Orange33cl front photo after fresh READY/review, test-app close/reopen save check, and ONE local test report containing product details/image-derived numbers but no photographs. Normative packet: PHONE_P2_04_FIRST_PRODUCT_PHYSICAL_PACKET_20261107.md. SAME dedicated chat Terra6.1 Medium owns coherent execution and direct user interaction; no new agent.

Allow prospective preparation/preflight; ordinary camera permission setup if required; at most2 capture admissions, ONE actual front shutter/CPU after fresh human READY and explicit review/Keep; one next-view pre-shutter interrupted job with ONE test-package-only force-stop/normal reopen and explicit classification; ONE R02 numerical preparation/local Download export/readback/host transfer and independent validation. These consume the prefix of the existing finite proposal, not new budgets. No automatic retake/repeated uncertain effects. R02 must pass before more photos. Exact local filename/provider, source665/APKce5aaef8/confirmed roster/session, existing caps and accounting remain bound.

Preserve original save/evidence, consumed R01 uncertainty and charges; no R01 retry/refund. No screenshot/image export/barcode session/other products or views/freeze/P2-05/new build/install/source/dependency/settings/network/Git/CI/PC-21 resumption. Routine Android permission prompt is included only as needed for this approved camera use; no deliberate deny/revoke test in this prefix. Stop with precise evidence for unexpected state/material failure; source correction follows existing High escalation policy and cannot silently enlarge this physical packet.

## D-071 — Accept independently verified R02 checkpoint with native confirmation limitation

**APPROVED by founder, 7 November2026:** selected “Accept verified report with limitation (Recommended)” after explicit disclosure that the Fanta photo/report were saved and independently verified on the laptop, while the app's own export confirmation remains uncertain. Accept actual77332B R02/dcfb1ddd as the first-product checkpoint using exact-file device/host readback and independent numerical validation. This expressly disposes the missing native transfer confirmation AT R02 ONLY; native terminal stays UNCERTAIN, conservative charges stay unchanged and transport-protocol acceptance remains open. This does not reconstruct missing R01 or silently pass later export checks.

Normative evidence: p204-r02-coordinator-review-20261107-a1/REVIEW.md and results.json, with immutable executor/reconciliation receipts. Fanta front job1/epoch1 and two consumed attempts/no pending validated; no retake or repeat export required. D-070 first-product checkpoint is accepted with this qualification; P2-04 overall is open. This approval grants NO additional photographs, report preparations/exports, barcode sessions, capacity increase/refund, source/build/install, Git/CI/P2-05 or PC-21 resumption. Further finite physical work requires its own exact scope; later uncertain exports stop for reconciliation and are not automatically covered by this exception.

## D-072 — Complete Fanta views, planned front replacement and idle reopen

**APPROVED by founder, 7 November2026:** said “Ok, fine, let's proceed” after coordinator stated next is Fanta remaining views and replacement/reopen check. Normative packet: PHONE_P2_04_FANTA_COMPLETION_PACKET_20261107.md. SAME dedicated agent Terra6.1 Medium may take up to4 additional photos/CPU (rear, two complementary views, deliberate front replacement), each after fresh READY and explicit review/Keep, preserving original front and all consumed attempts; then ONE idle test-package-only force-stop/normal reopen and saved-view verification. No automatic retakes, barcode sessions or other products. Cumulative proposed first-product usage6 admissions/5 photos/two reopen checks remains inside parent limits.

R03 numerical preparation/local export/host transfer is NOT granted by this approval. Same test agent should request founder directly for that exact additional report effect, record the trusted answer, and proceed only if approved. D-071's native confirmation disposition applies only to R02; no silent waiver for R03. No source/build/install/reset/cap increase/refund/Git/CI/P2-05/new agent/PC-21 resumption.

## D-073 — Founder-directed Fanta rear retakes and separate R03 report

**APPROVED directly by founder in SAME test chat, 7 November2026; coordinator verified user messages:** turn01a1b47b-7cad-7723-b623-196f67a369c4 requests retake because item was not fully within guide and explicitly says proceed without coordinator permission; turn01a1b482-d825-7ae2-827f-7583189b3629 requests another retake for small-print blur/glare. These add two actual consumed rear attempts beyond D-072; neither is refunded. New READY/Keep/Decline decisions remain required. Accepted rear5/sides6/7/replacement front8 retained; total8 admissions/7 photos including original front1, pre-shutter interruption2 and rejected3/4.

Founder separately approved ONE new R03 numerical report/laptop copy in turn01a1b495-7158-72d0-afb4-4cf1b237179b after explicit private product-details/image-derived-numbers/no-photo/no-cloud explanation, and confirmed Save in turn01a1b497-f87a-7a40-9a7a-4147f8eff502. R03 prepared once147795B/5360c9b2; native transfer UNCERTAIN. No re-export/extra report is authorized. Exact existing-file reconciliation and one still-unconsumed approved host copy/parser may complete under this original allowance. D-071 exception does not cover R03. Full checkpoint/transfer acceptance pending.

Remaining36 ordinary product views would bring proposal totals44 admissions/43 photos; that future scope is not approved by these two consumed retakes. Existing global64/integrated cap and no-refund rules stay. No source/build/install/guide/flash change, new agent, P2-05/Git/CI or paused PC-21 resumption.

## D-074 — Coordinator-authorized source diagnostic/completion correction under absent-founder delegation

Founder directly selected Sol6.1 High and authorized investigation/correction and coordinator recommended decisions while absent in SAME chat user turn01a1b4a8-7cd4-7860-8949-b6ff9ef8882e (verified by coordinator7November). Ordinary phone UI/Save may be operated autonomously within applicable later scope; physical photo setup still requires founder/fresh READY. This is authority to choose bounded next decisions, not an instruction to bypass platform/privacy/data constraints or erase uncertain effects.

Coordinator approves SOURCE/LOCAL CHECKS ONLY per PHONE_P2_04_EXPORT_DIAGNOSTICS_SOURCE_DISPATCH_20261107.md: bounded versioned phase/primary-secondary error diagnostics, truthful actual export-completion UI/read-only status, historical terminal grammar/charge compatibility and narrow exact-seven-reference source665 rollover policy. Preserve exact original descriptor659, seven Fanta references and all immutable R01–R03 receipts; no speculative identity/provider/deadline weakening. Exact Galaxy exception remains unconfirmed. SAME chat Sol6.1 High implements/self-checks one coherent change then stopped handoff for independent review.

No build/install/phone/report-slot/export/capture/new dependencies/Git/CI/P2-05/new agent/PC-21 resumption is released by this source dispatch. Source outcome will determine a separately reviewed finite no-photo diagnostic device packet. Do not count the change as a proven physical export fix or native transfer acceptance.

## D-075 — One offline diagnostics APK build after independent source acceptance

Coordinator approved7November2026 under founder delegated recommended-decision authority verified in SAME chat user turn01a1b4a8-7cd4-7860-8949-b6ff9ef8882e. D-074 source671 independently accepted; fresh20 UI/codec tests,22 adapter executions,71 actual-report/synthetic rollover checks, terminal-bound refusal and671 frozen-source/ZIP matches passed. Normative packet: PHONE_P2_04_EXPORT_DIAGNOSTICS_BUILD_PACKET_20261107.md. SAME chat Sol6.1 High may perform ONE pinned offline signed build and artifact self-checks, then stopped handoff for independent APK review. No source/dependency change, phone/install/report/capture effect is released. Exact physical exception/native R03 gate remains unresolved; R01-R03 uncertainty and all charges persist. R04 diagnostic use would displace original final-gallery pre-restart evidence and requires a separate explicit decision before device execution. No hidden report capacity, retry, waiver or PC-21 resumption.

## D-076 — One diagnostic update/R04 and explicit final-evidence displacement

Coordinator approved8November2026 under founder delegated recommended decisions and routine phone UI/Save authority, verified same-chat user turn01a1b4a8-7cd4-7860-8949-b6ff9ef8882e. Actual APKf207e50a/source671 passed independent artifact review. PHONE_P2_04_EXPORT_DIAGNOSTICS_DEVICE_PACKET_20261108.md authorizes SAME Terra6.1 Medium chat ONE same-package data-preserving update, ONE normal launch/read-only saved-state verification, ONE R04 preparation/local Download export and, only on native VERIFIED, ONE exact-file readback/host transfer/parser. No photos/screenshots/model inference, blind repeat or R03 waiver. Stop if device inaccessible/locked or state differs.

R04 is explicitly reassigned from original final-gallery pre-restart evidence to diagnostic transport evidence, consuming fourth of existing five slots without capacity increase/refund. R05 stays reserved. The old paired finalR04/R05 plan can no longer be claimed satisfied: later final-evidence amendment is required before final physical collection/acceptance. All original R01-R03 uncertainty/charges persist; native R03 and P2-04 remain open. Diagnostic success proves only the new R04 transfer. PC-21 stays paused.

### D-076 ordering amendment after successful update — 8November

Coordinator accepted indexed stopped update receipts: APKf207/same UID/dataDir/firstInstallTime, four displayed saved Fanta views, R01-R03 report identities/charges retained, R04/R05 unused. Exact sequence/epoch/attempt/reference IDs are not exposed by existing UI, so their independent comparison moves from pre-preparation to R04 output. This explicitly accepts the risk of consuming R04 before that external exact identity comparison; it does not assume or waive the values. Native setup/idle/full journal/saved-reference checks remain mandatory; later R04 mismatch fails. No new private reader/source/build/install/launch is authorized. SAME agent continues only unconsumed report steps under original D-076 budgets. Native VERIFIED still gates host copy, R05 stays reserved; all previous final-evidence limitations persist. Normative detail in DEVICE_PACKET_20261108.md ordering correction.

## D-077 — Existing R04 diagnostic read and source-only completion visibility

Coordinator approved8November2026 under founder explicit investigation/correction and absent-founder recommended-decision/routine-phone delegation. R04 actual uncertainty is localized to READBACK; exact cause remains unobserved. Confirmed operator visibility gap: UI discards detailed canonical terminal although strict reportStatus returns it. Normative packet PHONE_P2_04_R04_READBACK_DIAGNOSIS_PACKET_20261108.md authorizes SAME Sol6.1 High ONE exact existing public Download R04 metadata/hash observation without copy, then minimal source-only completion detail/read-only reinspection through existing strict bridge and local checks/stopped handoff. This read is a new diagnostic decision, not a waiver of D-076 native VERIFIED hostcopy gate. No private-image reader, transport guard change, build/install/launch/report/preparation/export/hostcopy/R05/photo/inference is granted. All consumed uncertainty/charges remain. Do not claim specific length/hash/stat/focus/provider cause without evidence. PC-21 stays paused.

## D-078 — Offline build of independently accepted R04 visibility correction

Coordinator approved8November2026 under founder delegated correction/recommended decisions. D-077 source671/52795501 accepted after fresh36 UI/codec tests,671 source/archive matches/exact four-file delta. Stable existing R04 size/hash supports file-byte receipt only; native READBACK cause unobserved. PHONE_P2_04_R04_VISIBILITY_BUILD_PACKET_20261108.md grants SAME Sol6.1 High chat ONE cached offline signed build/self-check/stopped handoff, preserving source/native/dependency pins and all receipts. No phone/install/launch/new report/export/Save/copy/photo/inference; later one update/read-existing-status needs artifact review/dispatch. R04 uncertain, R05 reserved, no waived native or final-evidence gate. PC-21 paused.

## D-079 — One bounded admission of retained stage after failed preparation

Coordinator approved8November2026 under founder delegated recommended decisions/scoped repair. D-078 original2400s preparation FAILED, own process terminated/no admission or assembly/APK; all39 stopped receipts independently matched. Retained stage metadata count64870 Node files is not content proof. Normative PHONE_P2_04_R04_BUILD_RECOVERY_PACKET_20261108.md grants SAME Sol6.1 High ONE separately recorded retained-stage exact-inventory/hash recovery2400s, then first final admission1200s and original still-unconsumed ONE offline release build. New exclusive recovery controls preserve original failed clocks/evidence; reuse matching bytes, copy only missing approved files, never overwrite conflicts/delete or silently restart a deadline. No fresh clone, network/source/native/dependency changes or phone effects. Failure to admit within bounded recovery stops. Existing R04/native uncertainty/R05 reservation preserved.

## D-080 — Fresh final validation immediately coupled to original build

Coordinator approved8November2026 under founder delegated recommended decisions/scoped repair. D-079 recovery and first final validation passed, but admission aged out during interruption. Driver refusal caught missed stale precheck before assembly/Gradle; release allowance unconsumed. PHONE_P2_04_R04_ATOMIC_BUILD_DISPATCH_20261108.md grants SAME Sol6.1 High ONE separately recorded fresh1200s full final validation over exact recovered stage, then original ONE2700s release build in same bounded host orchestrator with no chat/model wait boundary. Original failed/stale clocks immutable; freshness/assertions unchanged, no copy/recovery/automatic retry. Task-local control/observer/sole generated Metro binding retarget explicitly recorded before clock. Artifact/self-preservation/stopped review remains; no phone/report/R05/other effect.

## D-081 — Reviewed visibility update and existing R04 status observation

Coordinator approved8November2026 under founder delegated recommended decisions/routine phone authority. D-080 actual APKc7323408/source52795501 passed independent static artifact review. PHONE_P2_04_R04_SAVED_STATUS_DEVICE_PACKET_20261108.md grants SAME Terra6.1 Medium chat ONE same-package data-preserving update, ONE normal launch and ONE existing read-only R04 status action. No prepare/export/picker/Save/new report/filecopy/photo/R05. Observe bounded sanitized original primary/secondary/code/timing/stat facts or honest missing durable terminal; no source/provider repair or native waiver inferred. Preserve all original data/charges, R05 reservation/final-evidence limitation; PC21 stays paused.

## D-082 — Evidence-led investigation of composite READBACK check

Coordinator approved8November2026 under founder delegated investigation/scoped repair. D-081 delivered exact old R04 READBACK/STATE primary, no cleanup/terminal error, elapsed31309ms/148563B and matching written/reopened start identities. Source composite total/hash/final-stat assertion is localized; failed conjunct/cause remains unknown. PHONE_P2_04_R04_COMPOSITE_CHECK_INVESTIGATION_20261108.md assigns SAME Sol6.1 High source/evidence/local causal investigation. One minimal proven existing-contract repair permitted; otherwise concrete no-new-report diagnostic proposal only for new probe/API/codec/boundary behavior. No speculative guard weakening/device/file read/build/report/R05/photo. All original uncertainty/charges/final-evidence limitation persist; PC21 paused.

## D-083 — Fixed existing-report read diagnostic source boundary

Coordinator approved8November2026 under founder explicit delegated investigation/correction/recommended decisions. D082 information-loss fixture independently rerun: seven failed conjunctions yield same retained diagnostic; no proven transport correction. Normative PHONE_P2_04_R04_FIXED_READ_DIAGNOSTIC_SOURCE_20261108.md explicitly adopts SOURCE ONLY new fixed-R04 read permission/at-most-once operation/strict independent codec and exact two R04 diagnostic control leaves, within existing control/quota budgets with native/host/policy compatibility and preserved original reports. SAME Sol6.1 High implements one coherent self-reviewed/local-checked frozen source handoff. Original R04 never upgraded by fresh read; R05 reserved. No arbitrary reader/guard weakening/new report/write/export/photo, build/install/phone/picker/file-read effect or model escalation is released. Actual operation requires later artifact/device review/dispatch. PC21 paused/final-evidence gap open.

### D-083 adopted picker-action correction — 8November

Coordinator independently verified AOSP ActionHandler observed blob4ea7bbc2de7484152b282688b410e779fe5d436b/onPickFinished517–533: GET_CONTENT reference result READ; ordinary OPEN/CREATE result READ|WRITE|PERSISTABLE. This is not Samsung/device cause proof. Accept recommended narrow ACTION_GET_CONTENT replacement only under same founder delegated authority, retaining strict exact original-R04 document/read-only/no WRITE/no persistent grant/no import/cache/copy/fallback and all D083 storage/owner/codec limits. Seven stopped evidence hashes and16 permission cases verified; no production changes yet. SAME High writer resumes complete source-only packet, no build/picker/read/device/report/photo released. Normative adopted correction appended to PHONE_P2_04_R04_FIXED_READ_DIAGNOSTIC_SOURCE_20261108.md.

## D-084 — One offline build of independently accepted fixed-R04 diagnostic source

Coordinator approved8November2026 under founder delegated investigation/correction/recommended decisions. Frozen679/047aa4c0 accepted after fresh source/evidence/Java/core/adapter/UI/compatibility/policy verification; limits in coordinator REVIEW.md. PHONE_P2_04_FIXED_R04_DIAGNOSTIC_BUILD_PACKET_20261108.md grants SAME Sol6.1 High ONE NEW cached offline signed artifact build, bounded preparation/final validation immediately coupled to one assembly (2400/1200/2700s), truthful679/718 inputs/new native two-leaf policy/R8/source closure, stopped handoff/independent artifact review. No repeat of consumed D080 build/no clock resets. No phone/diagnostic permission/read/export/report/photo/R05 effect. Installed Samsung provider/grant proof remains later; original R04 uncertainty and all budgets/final-evidence limitations preserved, PC21 paused.

## D-085 — Reviewed fixed-R04 diagnostic update and one device read

Coordinator approved9November under founder overnight installation/nonphysical recommended-decision authority. D084 exact4ab23d93 signed APK independently accepted with fresh artifact/source/graph/registry/native-policy checks. PHONE_P2_04_FIXED_R04_READ_DEVICE_PACKET_20261109.md releases SAME Terra6.1 Medium bounded actual installed identity/provider review, ONE data-preserving update/normal launch and ONE distinct permanently consumed fixed existing-file read diagnostic. Actual callback URI/grants remain guarded before open; no broader WRITE/persistence/fallback permission or arbitrary file. No new report/export/Save/copy/photo/screenshot/R05. Original R04 stays uncertain regardless of fresh outcome; all charges/final-evidence gap preserved. Phone unavailable stops without bypass; coordinator retains five-minute conditional secondary-planning fallback.

## D-086 — Exact existing-file metadata after cancelled diagnostic

9November coordinator uses founder overnight safe recommended-decision delegation for SAME Terra6.1 Medium ONE exact-path stat and, only if useful, ONE exact document query for document_id/display_name/MIME/size/modified/flags. Original R04 public Download path/URI only; no content open/hash/copy, child listing/search/provider workaround/new grant/UI/diagnostic/report/R05. Denial/unsupported stops. D085 update succeeded but diagnostic cancelled by operator after mistaken30s picker interpretation; actual120s total/30s post-callback corrected separately, no allowance reset. Existing file presence/MIME remain unverified until observation; no source repair justified by incomplete picker evidence.

## D-087 — Original export verifier source acceptance and new offline artifact

Founder-selected Astra brief implemented by SAME High chat. Coordinator independently accepted681/848ddbfe source after538 receipt hashes, source/archive closure, fresh adapter33/helper61/mobile52 cases and Android API compilation. Versioned T2 retains independent count/hash/final-identity outcomes and existing success guards. Historical failed conjunct remains unobserved. Under founder ongoing build authority, PHONE_P2_04_EXPORT_VERIFIER_BUILD_20261109.md releases SAME Sol6.1 High ONE new offline artifact with fixed2400/1200/2700 phase ceilings and stopped independent artifact review. No device effects, checkpoint waiver or extra report slot follows. Exact R03 numerical continuation and proposed R05/R06 final comparison await gate disposition before remaining collection.

## D-088 — Founder-requested original-export test using R05

Founder explicitly requested phone connection and testing after diagnostic clarification. Coordinator adopts the unspent R05 for one current-Fanta original-export test under existing recommended-decision/report-only delegation, disclosed before dispatch. PHONE_P2_04_R05_ORIGINAL_EXPORT_TEST_20261109.md defines current installed3329a2b2, setup/capacity, one prepare/export/local Save/T2 result and only on native VERIFIED one exact host copy/strict parser. No old attempt reset or new report slot. Prior R05PRE/R06POST proposal was unapproved and is superseded. Final full-gallery pre/post evidence needs a later explicit amendment, potentially two additional reports; no such slots or future collection authorized here. Original R03/R04 uncertainty stays recorded; a successful new R05 can establish current checkpoint without the proposed R03 exception.

## D-089 — Founder-adopted independent Astra export criterion and three source-policy slots

Founder requested independent Astra recommendation and implementation of its final result. Same paused implementer remains sole source writer at Sol6.1 High. PHONE_P2_04_ASTRA_CTIME_REVIEW_20261109.md is adopted for SOURCE/LOCAL CHECKS ONLY. T3 public-export success means expected EOF/count/SHA and stable dev/inode/fullmode/UID/nlink/size/mtime, with unchanged or advancing ctime and exact before/final metadata displayed. All existing ownership/currentness/cleanup/publication guards remain. T1/T2 keep original semantics and old uncertainty. Shared private lock/inventory/full identity guards remain strict. This is an explicit prospective evidence-criterion change, replacing the coordinator's proposed separate content-only state.

Add exactly R06 qualification on existing Fanta, R07 complete-gallery PRE and R08 POST in same coherent source amendment, truthful new root policy/registry/JNI/Kotlin/host bindings and bounded legacy namespaces. Keep256MiB logical/physical limits and all historical charges; fresh budget must reserve all three before qualification and all outstanding final slots during later capture. Worst-case additional initial report reservation37945344B. A future qualified T3 R06 plus strict host validation satisfies the numerical Fanta-continuation gate. No R03 waiver or retrospective R05 reclassification. Build/device/report/copy/physical collection effects await concrete packets under their existing exact authority. No additional slot, retry, cap increase, deletion or photo is authorized here.

## D-090 — Astra publication acknowledgment and cold-reconciliation amendment

Founder-directed independent Astra review continued for D089 F1. Coordinator independently matched1731 receipts/686 source files and reran both current/baseline counterexamples. Adopt PHONE_P2_04_ASTRA_PUBLICATION_REVIEW_20261109.md for SAME Sol6.1 High source correction. The exclusive rename commits the private name; live acknowledgment also requires existing later checks/sync/close/readback. A live error stays UNCERTAIN, fully charged and poisoned. After process loss a coherent exact read-only private six-role cut can establish current receipt contents, with original acknowledgment explicitly UNKNOWN. Such reconciliation may supply new-slot local accounting/R08 prerequisite, never evidence that an earlier call returned successfully or power-loss durability. Physical R06/R07/R08 qualification still requires witnessed live success and strict host proof; any observed/missing live error/acknowledgment stops the packet. This explicitly changes D089 cold eligibility, preserving old R01-R05 criteria, all old records/charges, six roles, quotas and private guards. No extra marker, overwrite, retry, new device effect or release of source686. One corrected source handoff and independent review before build.

## D-091 — Accepted publication correction and one offline T3 artifact

Coordinator independently accepts D090 source688/e49b1b2a after1581 receipt hashes/688 archive-current bindings, fresh Android API compilation/54 decision+213 T3 checks, ten consumer scenarios/fourteen fresh JVM reads/76 mobile tests. Reviewer local fixture setup failures retained and corrected in isolated output, no production repair from review. PHONE_P2_04_T3_RECONCILIATION_BUILD_20261109.md releases SAME Sol6.1 High ONE offline signed artifact under founder ongoing build authority. Actual current policybaa68733/registrya354cedb, exact R06-R08 native/routing/host namespace and T3/provenance closure required, fixed2400/1200/2700 coupled phases. Source686 stays blocked, historicalF1 preserved. No phone/connect/report/photo or R06 consumption follows this packet.

## D-092 — Independently accepted T3 APK and one R06 phone qualification

D091 actual a88c6596/44621323B signed artifact independently accepted with194 evidence hashes/688 source-stage-archive/525Metro source bindings, actual signature/manifest/ELF/R8/current v3 registry/native object lineage and16 built-codec/live-precedence probe checks. Reviewer predecessor index/policy assumptions retained and corrected without artifact changes. Under founder explicit original-export test and final Astra-plan authority, PHONE_P2_04_R06_QUALIFICATION_DEVICE_20261109.md releases SAME Terra6.1 Medium ONE verified data-preserving update/launch, fresh full capacity, ONE R06 prepare/local export/Save. Only witnessed LIVE ACKNOWLEDGED permits exact file check/ONE host copy/strict truthful source688-newregistry and exact Fanta proof. Cold UNKNOWN cannot qualify. R07/R08 remain reserved and no photos/extra reports/retry follow.

### D092 qualification accepted — 12 November

Actual R06 LIVE VERIFIED/ACKNOWLEDGED with matching count/SHA/EOF, unchanged stable fields and ctime-only+52ms. Independent31 receipt hashes and strict actual-source688/APKa88/registrya354 host report plus exact R03 state/reference comparison pass. Numerical Fanta-continuation gate accepted under D089/D090, no R03 waiver. Old failure records retained. Prepared-only UNKNOWN stop was a coordinator ordering error, corrected before first export using documented zero dispatches and unchanged exclusive export-intent guard. One export/Save/copy, no retry/new photo. Physical gallery and R07/R08 final comparison remain open.
