# Offline Product Details — Bounded Experiment and MVP Integration Plan

Date: 6 November 2026  
Planning owner: Astra, Product & Strategy; accountable owner: coordinator / founder  
Status: PAUSED BY FOUNDER — 6 November2026. Retained planning draft; author marked planning complete before interruption, but final handoff/coordinator review is not confirmed. Resume only when founder requests. P2-04 is the priority; no implementation approval or measured capability.

## 1. Decision, authority and outcome

PC-21 records the founder's observation that typing ten product names/specifications was tedious and the request to make offline photo-assisted details an MVP priority. The proposed outcome is less time entering a correct, usable product description during trading, including an unknown checkout item, while retaining a retailer's review and immediate manual continuation. This is factual assistance from visible evidence, not marketing generation or automatic SKU recognition.

Recommend evaluating a reusable on-device OCR engine plus conservative field extraction before any on-device generative model. Test name, brand, visible net contents/size, variant, category and package form. An empty field is a valid result. The experiment must establish total effort saved after checking and corrections, not merely text detected.

The founder authorized detailed Astra planning. This document is the only file written by this planning lane. It does not authorize source changes, dependencies, retrieval, native builds, installation, phone access, private-photo processing, capture, export, Git/CI or release. The coordinator owns integration and gate disposition; the founder owns scope/priority and consequential approvals. Proposed technical boundaries below require the named Architecture review before becoming implementation contracts.

P2-04 source659 control-publication recovery remains a separate active task. Do not audit/edit its moving enrollment files, reuse its phone session or experimental permissions, alter its frozen evidence, or add OCR to its build. Source implementers work sequentially under the coordinator's ownership assignment. Preserve other agents' changes.

## 2. Evidence inspected and roadmap amendment

| Evidence / provenance | Observed fact or recorded claim | What it does not prove |
| --- | --- | --- |
| [PC-20/21 and PC-08](../product/PRODUCT_CHANGE_BACKLOG.md) | Founder requests the MVP flow; advanced added-writing robustness is deferred post-v1; prior PC-08 routes OCR/guided enrollment to Track B/M12. | Market demand across retailers, OCR quality or implementation authorization. |
| [PRD_MVP](../product/PRD_MVP.md), §§8, 23–29 | Progressive records, offline identification and nonblocking fallback are established. | A delivered six-field prefill form. |
| [SCANNING_ARCHITECTURE](SCANNING_ARCHITECTURE.md), §§31–33, 41–45 | OCR supplies clues; offline-required assets must be locally guaranteed; adaptive enrollment and bounded local learning are separate responsibilities. | An OCR provider choice, prefill UX or automatic learning policy. |
| [BUILD_PLAN](../engineering/BUILD_PLAN.md), M8, M12, R6 | M8 excludes OCR; R6 follows baseline visual retrieval and tests reranking; M12 integrates validated recognition. | Authorization to move this work into current M8/P2-04. |
| [PROJECT_STATE](../engineering/PROJECT_STATE.md), inspected 6 November | P2-04 recovery and other native/physical gates remain open; existing source checks are qualified evidence. | Permission to reuse the phone or run an OCR trial. |
| [DOMAIN_DATA_MODEL](../architecture/DOMAIN_DATA_MODEL.md), §5; [DECISION_LOG](../decisions/DECISION_LOG.md), D-035/D-046/D-047/D-048/D-050 | Store-local provisional variants, later explicit enrichment, price-first selling, reviewed suggestions, bounded private photos. | All conceptual identity fields already implemented in SQLite or sync. |
| Stable source entry points in §4 | Current name/edit, photo, store guard and suggestion boundaries inspected read-only. Git working state contains others' changes. | Runtime correctness, physical reliability or a frozen implementation baseline. |

**Proposed scope amendment:** add an earlier, standalone photo-details experiment and conditional MVP integration. It can run before visual-retrieval R6 because extracting a draft description from readable text does not require an embedding index. Leave R6 recognition reranking, M12 visual identification, guided multi-view enrollment and their acceptance gates unchanged. A successful prefill experiment cannot pass those gates.

Before implementation, coordinator records the approved disposition in PC-21, the decision log, PRD §8, scanning §§31–33 and BUILD_PLAN; updates active state/tickets only after exclusive ownership is available. This planner has not made those changes. Existing restrictions are still in force until the amendment is accepted. The opportunity cost is additional MVP native/UI work; founder may accept a smaller name-first slice but it must be called a scope reduction, not full six-field delivery.

## 3. Smallest useful user flow and field policy

1. Use an existing selected front/label photo. For a new photo, guidance is “Show the front label with the product name.” Existing Add photo, retake and continue-without-photo paths remain. No compulsory second image or enrollment sequence.
2. Offer **Suggest details from photo**. Start only on explicit request in v1; no continuous OCR, hidden batch processing or automatic requests on every edit/open. Close the capture preview before OCR. Processing never disables Add to basket, manual editing or cancellation.
3. Present a compact draft with separate labels and **Use details**, **Edit**, **Dismiss**. Show “Not read” for absent values; do not invent confidence percentages. Review can show the selected existing photo and a small evidence region; do not display the whole OCR transcript as product data.
4. On Use details, copy only the accepted, still-current suggestions into the editable form. Explicit Save/Add to basket performs the existing business command; OCR completion itself writes no identity. Already entered values win unless the retailer deliberately replaces each conflicting value.
5. If skipped or unavailable, unknown checkout still needs only selling price as typed product information, with existing editable quantity and safe generated label. Products → Temporary can revisit the same product and photo later. Saving a suggested name does not automatically mark the record fully enriched.

| Field | Allowed v1 evidence and review | Prohibited inference / persistence boundary |
| --- | --- | --- |
| Product name | Readable printed product wording; conservative whitespace cleanup; editable final display name. | Do not complete obscured words from general world knowledge, infer exact saved SKU, auto-merge duplicates or rewrite a known product. |
| Brand | Visible manufacturer brand wording, or an explicitly selected existing local product's confirmed details. | Manufacturer/address/company text is not automatically a brand. No global brand creation. |
| Size / net contents | Preserve visible value and unit as descriptive text, e.g. `70 g` or `500 ml`; reject ambiguous decimal/unit readings. | Never convert to inventory quantity, stock, weight sold or package conversion. Do not reinterpret `12 × 70 g` as a confirmed count/conversion. |
| Variant | Visible distinguishing wording such as flavour/formulation; retain meaningful differences. | Do not assume ordinary and Zero, differing strengths/sizes or unlabelled grades are interchangeable. |
| Category | Optional coarse label from an explicitly reviewed, bundled mapping of supported product terms; retailer can edit/omit. | No universal category classifier or inferred exact identity. Mapping absence/ambiguity means blank. |
| Package form | Explicitly supported label or conservative visible description such as bottle/sachet/carton, with confirmation. Text-only baseline omits shape-only guesses. | Descriptive package form is not the business base unit. Do not change base package, sale package, preferred unit, carton contents or conversion. |

Prices, costs, stock, supplier, tax, expiry, delivery address, phone numbers, local SKU and barcode association are outside extraction. Barcode detection retains its existing independent rules. Readable carton-count text can be shown only as an unconfirmed descriptive clue if the product scope later includes it; it is excluded from the initial six-field save path. No OCR arithmetic is authoritative.

Added handwriting/labels: ignore or omit uncertain text rather than classify it as manufacturer identity. Printed shipping labels are also incidental; not all irrelevant text is handwriting. A marker can obscure real evidence, so omission is safer than reconstruction. Same-product/different-shop comparisons are evaluation cases, not a promise of automatic invariance. PC-20 advanced robustness remains post-v1.

## 4. Existing entry points and proposed source boundary

Paths below are relative to the repository root. These were inspected in the stable core; no runtime code was changed.

| Existing source | Current responsibility | Proposed integration constraint |
| --- | --- | --- |
| `apps/mobile/src/screens/products/QuickAddProductScreen.tsx` | Add product and checkout shortcut; per-store keyed form; staged photo ID; existing operation ID and retry graph. Checkout currently always sets `generateTemporaryLabel: saleShortcut`. | Add optional draft review after staging. If an explicit reviewed nonempty name is used, intentionally revise that input decision; otherwise preserve generated label. Never submit twice or auto-save on OCR completion. |
| `apps/mobile/src/screens/products/ProductDetailScreen.tsx` | Name/local-SKU editing, Temporary lifecycle, saved photo and online suggestion presentation. | Offer explicit photo assistance for an owned provisional product. Existing values are not overwritten. Keep separate explicit enriched action. |
| `apps/mobile/src/screens/sales/SellScreen.tsx` | Supplies the catalogue-compatible Quick Add client to selling. | Thread the optional assistance seam through that existing adapter only; do not change basket calculation, payment, scanner resolution or sale completion. |
| `apps/mobile/src/catalogue/client.ts`; `apps/mobile/src/sales/client.ts` | Captured store/actor context and application commands. | Expose a store-scoped optional assistance boundary; native types stay outside screens. Do not route through online lookup. |
| `apps/mobile/src/catalogue/createTemporaryProduct.ts` | Creates STORE_LOCAL variant/base package/store product, attaches local photo and writes one outbox envelope atomically. | Retain IDs, operation replay and transaction semantics; no asynchronous OCR inside the transaction. Confirmed name is ordinary input. No extra create on late result. |
| `apps/mobile/src/catalogue/updateProductIdentity.ts`; `manageLifecycle.ts` | Name/SKU mutation and explicit enriched status; business writes plus outbox. | Use established commands for allowed confirmed edits. Metadata must not bypass ownership or mutate shared PLATFORM identities. Broader fields require §5 review. |
| `apps/mobile/src/db/repositories/productVariants.ts`; `db/migrations.ts` | Implemented variant has name, identity scope/owner and canonical link; inspected row interface/schema do not expose six structured prefill fields. | Domain document's optional brand/category/size fields are future intent, not an existing storage contract. No silent schema changes. |
| `apps/mobile/src/media/productPhotos.ts`; `nativePhotoFiles.ts` | Private media_assets, store/product checks, checksum/dimension validation; new images ≤1024px edge and ≤300KiB; legacy reads up to 8MiB; replacement/recovery. | Resolve only an authorized staged/attached photo, then bind its identity for the request. No arbitrary paths/gallery/network URLs. Do not widen caps, retention or cleanup rules. |
| `apps/mobile/src/media/ProductPhotoCamera.tsx`; `ProductPhotoStep.tsx` | Bounded still capture, no concurrent barcode path, cache cleanup, optional fallback. | Wording may be refined. Do not retain the camera cache original for OCR; work from staged media after ownership/geometry validation. Camera tuning/extra retention is separate scope. |
| `apps/mobile/src/storeContext/access.ts` | Guards current actor and selected nested client services. | A new nested service is not automatically protected: currently the nested list names photos/suggestions/recognition. Explicitly guard assistance before reads, after await and before apply; no broader authorization change. |
| `apps/mobile/src/catalogue/lookup/{provider,suggestions,SuggestionCard}.ts[x]` | Existing barcode/online suggestion lifecycle and attribution; default live provider disabled. | Reuse interaction lessons only. Do not store private OCR in public lookup cache, copy network timeout-as-drain logic, activate the provider or label OCR as provider catalogue truth. |

Initial proposed pure source slice, after explicit source authorization: new `apps/mobile/src/catalogue/photoDetails.ts` (bounded draft types and conservative parsing), `photoDetailsSession.ts` (request/currentness and edit protection), and matching `apps/mobile/__tests__/photoDetails.test.ts` / `photoDetailsSession.test.ts`. Inputs for these tests are synthetic or explicitly licensed text blocks, not phone photos. The pure slice has no SDK, database writes or live network and is not evidence of native OCR.

Conditional UI slice: new `apps/mobile/src/catalogue/PhotoDetailsReview.tsx`, its focused component test, and the existing QuickAdd/ProductDetail/client/Sell adapter/media prompt/guard paths listed above only where needed. Add `photoDetailsAdapter.ts` as the application-facing boundary with an unavailable default; do not invent a second RecognitionService contract or spread SDK types into domain/contracts. These file names are a proposed allowlist, not files created by this plan.

Native bridge/config/dependency files are deliberately NOT preauthorized here. The feasibility gate must identify exact SDK/model artifacts, bridge placement, manifests/build config and a finite allowlist for coordinator/Architecture review before a native implementer is dispatched. Do not borrow or patch the P2-04 module, its tests or plugin. No new workspace/package/repository topology is proposed.

## 5. Structured fields, ownership and migration decision

**Experiment:** all six fields and source evidence are transient review data. No SQLite/server migration, retained OCR transcript, local training database or business-schema addition. An isolated review trial may evaluate all six fields without pretending it saves them. Compare equivalent manual and assisted tasks, including the same required output fields.

**Small name-first integration option:** compose an editable display name from explicitly accepted name/brand/variant/size components and save through the existing name command. Show the exact final string before Save; never encode hidden JSON or silently parse it back into authoritative fields. Category/package form remain unsaved suggestions in this option, and the UI must say so. This can demonstrate usefulness without a migration but is a limited delivery, not full PC-21 structured persistence. Existing name length rules apply.

**Recommended full PC-21 product target, conditional on review:** durable user-confirmed structured identity belongs to the store-owned provisional product identity, using the existing STORE_LOCAL variant boundary, not a new global catalogue claim or a duplicate private suggestion database. The proposed semantics are optional brand wording, descriptive net-contents text, variant wording, coarse category and descriptive package form, independent of PackageUnit conversion. Architecture must decide whether/how these align with the conceptual fields in DOMAIN_DATA_MODEL, including canonical IDs versus provisional text and shared-variant restrictions. This is a product recommendation, not approved schema.

Before full structured implementation, Systems Architecture returns a concrete migration/contract proposal naming SQLite and PostgreSQL changes, repository/command fields, sync envelopes/version compatibility, old-client handling, validation bounds and same-store concurrent correction behaviour. Founder/coordinator review the identity/data-ownership change explicitly, update decisions/docs, then assign source work. Tests must prove additive migration of existing temporary/sold products, retry/dedup, server replay, privacy and unchanged historical snapshots. Do not put only half the authoritative facts in an unsynced sidecar or silently claim cross-device durability. If the proposal materially expands scope, stop for the founder's choice of full fields versus the explicit name-first slice.

**Local correction policy for v1:** confirmed values on that selected product take precedence on future opens; photo assistance does not replace them. An explicit new request may offer alternatives for review. Reuse existing local products by manual/search/exact known identifier; OCR text alone cannot bind another object to them. No new cross-product OCR alias cache, broad dictionary learning, embeddings or automatic model retraining. Durable “remember dismissed photo suggestions” or generalized correction reuse needs a separately reviewed store/photo/model-bound retention policy; the transient experiment does not claim persistence of dismissals across restart. Saved corrections remain durable through the established business command.

PLATFORM-linked records are view-only for this new assistive mutation path until Architecture verifies an approved local-override/consolidation route. Do not call a general variant rename merely because the UI has a store product. Explicit scope/owner checks are required at application boundary and mutation time.

## 6. Asynchronous handling and failure behaviour

These are proposed observable rules, not a prescribed schema:

- Bind each request to captured actor/member and store, current client/session, product ID or unsaved draft identity, selected photo asset/checksum, request generation and the form's field-edit generation. Resolve the photo through the store-owned media service and capture immutable input; recheck before delivery/apply. A URI alone is insufficient provenance.
- Only one OCR operation is admitted at a time per engine owner; no background queue. Repeated taps show current work. Discarded results can finish native cleanup but cannot publish to a newer form, store, photo or request.
- Result completion updates a suggestion panel only. Use details rechecks context and field revisions synchronously; fields edited since launch remain untouched unless the user explicitly chooses replacement. User text is not lost when changing the photo or requesting another draft.
- Blur/background, sign-out, store/member/client switch, permission loss, product deactivation, photo replacement/deletion, dismissal and save invalidate delivery. Native cancellation and UI invalidation are separate. A UI timeout is never proof of released native resources.
- Save/Add to basket invalidates pending assistance before committing. A late result must not rename the newly saved product or cart line. The existing operation ID/rehydration path continues to govern retry; failure/retry never creates a second product or outbox entry because a result arrived.
- After process restart, transient suggestions are absent. Saved catalogue edits and completed sales retain their ordinary durability. No background resume/reprocessing or claim that unsaved edits survived; existing draft-exit protections remain.
- Missing/corrupt/unsupported photo, no readable label, engine unavailable, low resources or failed inference shows a short explanation plus manual entry/continue. Explicit retry is available only after confirmed native cleanup. If native ownership is unresolved, keep assistance disabled for that session and report the failure; never repeatedly launch work or kill/reset the app automatically.

Architecture must justify process/image/buffer ownership through successful completion, error, cancellation, background and shutdown. Use a still-image input, not a live camera stream. Keep camera and OCR ownership sequenced; do not infer that callback arrival, counter zero, timer expiry or a void `close()` proves drain. Unknown lifecycle semantics block native selection. Manual selling must remain available when the optional module is absent from an installed binary.

## 7. Reusable candidates and bounded feasibility gate

Official sources checked 6 November 2026; these are source-reported capabilities, not COSI measurements. No artifact was downloaded, version pinned or licence accepted. Versions in documentation URLs identify the page, not a selected runtime release.

| Candidate | Primary-source facts | Decision-sensitive uncertainty / disposition |
| --- | --- | --- |
| ML Kit Text Recognition v2, bundled path | [Android guide](https://developers.google.com/ml-kit/vision/text-recognition/v2/android) distinguishes bundled immediate model availability from dynamically downloaded models and notes resolution/focus sensitivity. [TextRecognizer API](https://developers.google.com/android/reference/com/google/mlkit/vision/text/TextRecognizer) exposes asynchronous processing and a void close method. | Plausible small reuse candidate; no automatic selection. Exact artifact/transitive graph, Expo/native compatibility, input lifetime, terminal cleanup and memory need fresh OCR-specific review. Prior barcode findings do not establish OCR compatibility. Public API description alone is not a drain guarantee. Unbundled first-use download is excluded. |
| ML Kit terms/privacy boundary | [Terms and privacy](https://developers.google.com/ml-kit/terms) says inputs/results are processed on-device and not sent to Google, while describing SDK server contact and performance/utilization metrics. SDK terms are distinct from sample-code licensing. | Local inference is not network silence. Candidate gate must determine actual allowed network behaviour/configuration and disclosures in this app; do not assume switches exist or disable essential app networking globally. If no network-silent candidate configuration can be justified for this feature, exclude it under the current strict local-only proposal or seek an explicit founder privacy-policy decision. |
| PaddleOCR mobile deployment | [Versioned on-device guide](https://www.paddleocr.ai/v3.0.3/en/version3.x/deployment/on_device_deployment.html) documents an Android shell demo with mobile models and Paddle Lite deployment. [Repository licence](https://github.com/PaddlePaddle/PaddleOCR/blob/main/LICENSE) is Apache-2.0. | A shell demo is not an Expo adapter or a verified maintained Android artifact. Exact code/model/dictionary/runtime releases and separate licences, ABI/toolchain, provenance/download route, threading/cleanup and cost remain unverified. Consider as alternative if it passes the same gate; repo licence does not settle every weight/dependency. |
| Tesseract printed-text baseline | [FAQ](https://tesseract-ocr.github.io/tessdoc/FAQ) describes poor handwriting performance; [engine licence](https://github.com/tesseract-ocr/tesseract/blob/main/LICENSE) is Apache-2.0. | Candidate for a simple printed-label baseline; actual Android bridge, exact traineddata and dependency rights, scene-text usefulness and resource/cleanup behaviour are unverified. Poor handwriting recognition does not mean added writing is safely ignored. |
| Current manual entry / confirmed local catalogue reuse | Already available product path; no OCR dependency. | Mandatory comparison and fallback. Avoid building a custom OCR engine or introducing an LLM/VLM unless these simpler options fail a named need and the founder reopens scope. |

**Feasibility gate F0 — owner: Systems Architecture with Staff Engineering evidence; coordinator accepts the return.** Study the most promising admissible reusable engine first; compare the alternatives on the table's criteria rather than integrating all three. Return one candidate or “no admissible candidate” with:

1. Exact release/artifact/model/dictionary identifiers, official retrieval locations, immutable hashes once retrieval is separately authorized, full dependency/native/ABI/build impact and licence/notice/redistribution obligations. No floating `latest` or guessed pin. Model files must be installed with the app; updates are explicit later work.
2. Documented and experimentally checkable image/request/recognizer ownership, cancellation/close/error sequencing and a bounded no-overlap policy. Source inspection must respect licence restrictions; unavailable internal source is a limitation, not permission to reverse engineer.
3. A network/privacy determination including SDK initialization/metrics when the device reconnects; supported scripts and limits; absent-module fallback; a finite source/config allowlist and proposed native bridge placement. No hosted inference, catalogue query, image upload or runtime model downloader.
4. A resource budget sheet to freeze before the real comparison: packaged and installed size delta, decoded-image bound, peak/retained memory, cold/warm latency, cancellation/cleanup observation, repeat-run thermal/battery and UI responsiveness measures. Establish budgets from target-device headroom and the manual task, not vendor benchmarks. Any numerical acceptance budgets are proposed until coordinator/founder accepts the packet.

If public evidence cannot establish lifecycle or strict privacy suitability, stop selection and return the specific gap. A timed abandonment or another abstraction does not resolve it. No new service/process architecture is authorized as a workaround.

## 8. Photo quality, privacy and provenance

The first experiment uses the exact staged/saved representation available to this flow. New thumbnails are already limited to 1024px/300KiB. Validate readable text on those inputs; do not apply a document-OCR demo's success to small glossy/curved product labels. Legacy assets can be larger and require a separately approved bounded decode/downsample policy; excluding oversized legacy inputs with manual fallback is preferable to an unbounded decode. No enlargement can recover missing label information.

If existing images fail, first report which fields and capture conditions fail. The fallback is manual entry or an explicit front-label retake under existing photo rules. Do not silently replace the user's saved thumbnail, retain a larger original, add automatic multiple captures, or repurpose recognition references. A separate label image, higher-resolution transient processing or retained crop requires an explicit quality/storage/lifecycle decision and new bounded permission. Full guided enrollment remains later.

Production proposal: derived OCR blocks, rejected tokens and evidence regions live only for the current request/review; no transcript in logs, outbox, public cache, analytics, crash attachments or shared training. Preserve only user-confirmed product fields through approved business commands. Do not copy incidental address/price tokens into provenance. Minimize raw text even locally: field extraction may inspect the image in memory, but its output is restricted to the six permitted categories and small supporting regions. Filtering cannot guarantee address detection; omit ambiguous blocks and test leakage explicitly. Do not claim automatic image redaction. Existing private photo retention is unchanged and may itself contain a visible label.

Evaluation evidence is separate from product persistence. Before processing, curate an explicit authorized asset list with opaque case ID, rights/use permission, originating capture/source family, representation dimensions/bytes/checksum, transformation history, printed-language/script, condition tags and truth labels/visibility. Do not include real address/name strings in the case ID or exported report. Use synthetic shipping-address labels where possible; real sensitive examples require explicit private evidence handling, access/retention and deletion disposition. Raw images/transcripts do not enter Git by default.

Record engine/model/parser/mapping version, source revision and device/build identity per run; record error types, field presence/correctness, timings and resource numbers without incidental text. A restricted reviewer may use the authorized original to adjudicate; export only approved redacted evidence/aggregates. Existing P2-04 photos, sessions and artifacts are not automatically authorized for this experiment. No private images were read for this plan.

## 9. Test and evaluation packet

### 9.1 Source-only checks after source approval

Use synthetic printed-text blocks to test parsing independently from OCR. Expected results include omitted/ambiguous fields and evidence attribution. Cover explicit `70 g` versus `700 g`, decimal separators, `12 × 70 g`, manufacturer address versus brand, printed price versus size, expiry/lot digits, promotional copy, mixed scripts, no text, conflicting sizes, partial/obscured words, oversized/malformed output, and added shipping/marker tokens. Bound output sizes and normalize conservatively; no unsupported unit conversion or hidden completion.

Session/component checks: out-of-order requests; repeated tap; editing while processing; explicit replacement; dismissal; saved/current photo mismatch; changed checksum; product/store/member/client switch; unmount/background; permission loss; absent native module; cancellation/error/late success; save-before-result; duplicate save/retry; product no longer active; platform-linked product; restart with no transient draft. Assert no read/write across store boundaries, no raw transcript persistence and a usable fallback.

Integration regression targets: `catalogue.test.ts`, `catalogueIdentity.test.ts`, `catalogueLifecycle.test.ts`, `catalogueLookup.test.ts`/`catalogueLookupUi.test.tsx`, `products.test.tsx`, `sell.test.tsx`, `productPhotos.test.ts`, `productPhotoUi.test.tsx`, `productPhotoCamera.test.tsx`, `nativePhotoFiles.test.ts` and applicable actor/photo guard tests. Select affected cases; run mobile typecheck/zero-warning lint and affected Jest suites, then the required repository validation at the approved integration handoff. Exact commands follow current package scripts. Do not touch protected assertions, dependency checks or P2-04 tests to make this slice pass. No checks were executed by this planner.

### 9.2 Representative real-data matrix

| Case family | Required contrast / expected conservative result |
| --- | --- |
| Clear front label | Printed name/brand/size; visible values suggested, absent fields blank. |
| Similar variant pair | Same brand, genuine differing flavour/formulation/size; no accidental collapse. |
| Unit versus outer carton | Readable outer form/count versus inner product; no inferred stock or conversion. |
| Unmarked/unbranded item | No supported brand/specification; useful abstention/manual naming. |
| Small or decorative text | Actual thumbnail representation, fine print and nonstandard wordmarks; omissions recorded. |
| Curved/glossy/shelf/held image | Glare, hand occlusion, clutter, angle and light variation; no studio-only assumption. |
| Missing/covered manufacturer text | Hidden name/size; no reconstruction from an attractive guess. |
| Same product, different shop markings | Clean versus marker price/destination/printed shipping label; additions must not become identity. |
| Genuine printed change | Different size/variant beside added shop text; do not discard meaningful manufacturer differences. |
| Scripts/languages | Actual target-market printed scripts identified during curation; unsupported script fails honestly. |
| Multiple products/background text | No mixing fields from neighbouring objects; ask for a clearer single-product photo or return no draft. |
| Bad/legacy asset | Missing, corrupt, rotated or larger legacy representation; bounded decode and manual continuation. |

A single physical product may cover multiple condition cells; do not count those as independent SKUs or independent evidence. Keep the same physical/capture family, crops and compression variants together when splitting development and frozen evaluation. Paired shop markings deliberately share identity; record that relationship. The founder's initial ten products may inform rehearsal if separately authorized, but cannot establish broad category/retailer accuracy.

Before real execution, the coordinator freezes a finite roster manifest: exact assets, expected visible fields and abstentions, development/holdout membership, permissions, device(s), source/APK/model hashes, allowable operations/retries and evidence destination. The matrix defines required coverage, not permission to capture. Missing coverage is reported rather than filled with synthetic “real” success. If the founder is absent, complete only authorized independent work; do not start a physical trial or infer READY.

### 9.3 Paired manual-versus-assisted method

Ground truth is independently transcribed/reviewed from permitted visible packaging and known product identity; uncertain labels are marked unscorable/ambiguous before model outputs are seen. Include genuinely absent fields in the denominator for unsupported-output measurement. Human-prepared text blocks are a parser baseline and must never be reported as native OCR output.

Compare two separate tasks: (A) unknown checkout with optional details and a correct completed sale; (B) later catalogue completion with the same requested final fields in both manual and assisted arms. Do not compare manual name-only entry with assisted six-field completion. Record time from the same starting state through review, correction and explicit save; include OCR wait, retry and fallback. Alternate task order across matched independent products where possible; do not let memorizing the same label always favour the second arm. Founder-only observations are a pilot, not a retailer-population claim.

Report per field and condition: suggested count, correct/incorrect/unsupported count, readable-field coverage, appropriate omissions, accepted unchanged/edited/rejected values, final saved errors, correction actions and total time. Report all failed/abandoned requests, not only successful OCR. Separate cold first request from warm requests; include median and slow-tail/maximum with actual sample count, paired time differences and aggregate elapsed time. A higher omission rate can be preferable to unsupported details, but an all-blank engine is not useful assistance.

### 9.4 Proposed go/no-go rules — not approved benchmark thresholds

Hard boundary checks require **zero observed violations** in the finite packet: unauthorized identity/financial/package writes; stale/store-crossing overwrite; lost/duplicated completed transactions; incidental address saved as product metadata; private OCR export/network processing; or unsafe unresolved native reuse. One violation blocks progression and requires repair/review. Zero observed failures does not establish zero population risk.

For the limited product pilot, proposed usefulness rule: both the median paired completion time and aggregate completion time improve over equivalent manual tasks, without more final saved errors. Report task A and task B separately and condition-specific regressions. Count corrections/omissions so gains are not created by silently doing less work. If evidence is too small, tied, confounded or missing a required condition, disposition is inconclusive; do not tune on the holdout and relabel the same cases independent validation.

Before the frozen device comparison, set concrete numeric memory/storage/latency/thermal limits from the selected phone's headroom and manual baseline in F0. No invented universal number is inserted here. Record the budgets before running holdout cases; exceedance is a fail/narrow decision, not permission to relax limits after seeing results. Include immediate continuation while work is pending, fresh-install first invocation offline with bundled assets, reconnect network behaviour, repeated sequential use, background/cancel and return-to-scanner. A cached online warmup does not prove first-use offline readiness.

Use the known Galaxy A15 only under a separate approved packet; it is one target device, not proof for weaker Android phones. Confirm its actual RAM/OS/storage configuration then. Broader MVP support requires a representative lower-resource target chosen before claiming weak-phone suitability. Report incremental APK/installed size, peak/retained memory after drain, first/warm times, dropped/UI-unresponsive periods, thermal/battery trend over the finite session and cleanup failures. Mock tests cannot pass these checks.

Decision outcomes: proceed to a limited integration proposal when safety, usefulness and resource gates pass; narrow fields or name-first scope when only some fields help; improve capture only under a reviewed separate scope if photo quality dominates; retain manual fallback and stop native adoption when lifecycle/privacy/first-use offline fails. No universal accuracy/launch claim from the pilot.

## 10. Sequenced work and approval boundaries

| Gate / bounded work | Owner and required output | Permission / stop boundary |
| --- | --- | --- |
| P0: accept product/scheduling plan | Founder/coordinator selects earlier experiment and desired delivery target; coordinator reconciles roadmap. | Planning approval is not source/dependency/device approval. P2-04 ownership unchanged. |
| F0: technical feasibility and data decision | Systems Architecture + Staff Engineering return exact admissible candidate/bridge/allowlist, lifecycle/privacy evidence, field persistence decision and proposed budgets. | Read-only review first. Retrieval/install/native experiments require their explicit finite approval. If no candidate satisfies constraints, stop. |
| E1: pure parser/review/session experiment | Sol6.1 High implements the §4 pure slice and authorized UI harness with synthetic inputs; self-check, correct ordinary scoped defects, then one stopped handoff. | No native engine, private images, schema or app-store/phone effect. Coordinator independently reviews after stop; mocks are labelled. |
| E2: approved native adapter source | Same assigned implementation lane integrates only the selected reviewed engine using the final F0 file/dependency allowlist; absent-module fallback and native lifecycle checks. | Separate source/dependency approval; no P2-04 modifications. Any unresolved drain or hidden network contact blocks. Source pass is not physical acceptance. |
| E3: build and finite device/data trial | Coordinator approves concrete build/setup/data packet; designated phone agent and founder execute exact authorized operations and return evidence. | Build, install/update, first-use setup, radio/settings, private-image use and any capture/export each follow their actual approval scope; no automatic reset, retake or inferred readiness. Never use/clear P2-04 state. |
| E4: independent evidence decision | Coordinator assigns independent Assurance outside implementation ownership; assess source, paired outcomes, privacy/lifecycle, failure/resource results and gaps. | No threshold waiver or acceptance by the implementer. Failed/inconclusive gate stays named. |
| I1: conditional MVP integration | Founder accepts exact name-first/full-structured scope; Architecture approves any schema/contracts; Sol6.1 High implements allowed integration and required migrations/tests. | Full structured persistence cannot ship through the migration-free experiment. Preserve completed sales/sync and store ownership. |
| I2: integration acceptance | Coordinator reviews stopped handoff, real offline flow/regression/accessibility evidence and updates state/decisions. | Feature may remain disabled pending physical/privacy gates. No deployment/release/Git effect follows automatically. |

This is one bounded plan, not a request to create a standing research programme or swarm. F0 may narrow the candidate list without implementing all candidates. Existing source code may be reused where fit is proved; no custom OCR engine, training pipeline, backend, general image-ingestion service or background job is in scope.

## 11. Decisions still required and final handoff

| Decision | Recommendation / owner | Invalidating or escalation condition |
| --- | --- | --- |
| Earlier MVP sequencing | Founder approves standalone prefill evaluation before R6 retrieval; coordinator records amendment. | It cannot consume P2-04 ownership or alter its recovery/evidence gates. |
| Full structured details versus explicit name-first delivery | Evaluate all six fields transiently first. Preserve full PC-21 as target; use name-first only if founder explicitly accepts the limitation after persistence/cost review. | Separate fields are expected to survive but only a display name is saved; stop misleading scope claims. |
| Engine/native placement and exact dependencies | Architecture selects only after F0; no pin or winner now. | Unjustified drain, licence, offline first-use, SDK network behaviour or resource cost. |
| Private data/resource packet | Coordinator/founder approve exact assets/device/actions, retention/export and frozen budgets. Prefer synthetic incidental labels and existing authorized images. | Missing rights/physical readiness, unbounded original retention, or inadequate representative inputs. |
| Local correction behaviour | Retain confirmed product values; no automatic retraining or cross-product alias learning. | Founder requires generalized learning or persistent per-photo dismissal: return a separate storage/privacy proposal. |

Confidence: high in the documented roadmap and implemented-field mismatch; moderate in the proposed assisted flow; native OCR accuracy, lifecycle admissibility, resource cost and actual effort savings remain unmeasured. The strongest contrary outcome is that small photos produce enough plausible mistakes that review takes longer than typing. The defined paired experiment can invalidate the recommendation.

Self-review completed against PC-20/21 and the bounded charter: field assistance separated from recognition; sales/manual fallback and immutable history retained; package/stock/cost inference excluded; added-writing modelling deferred; no engine/schema authority assumed; current source/photo/guard entry points identified; all technical/physical claims have named later evidence gates. This is planning self-review, not independent assurance or acceptance.

Only this plan document was written. Stable source/docs and official pages were read; no private photo/model/native execution, tests, downloads/installations, build, phone, source/dependency change, Git commit or new agents. General profile used; `product-thinking` and `research-analysis` were available, selected, loaded and used. Optional packs were not selected. No workflow state was created. Host-hidden capability states are unknown.

**Stopped handoff:** detailed planning is complete. Next action is coordinator/founder review of P0 and the bounded F0 evidence charter. Implementation remains stopped pending its concrete authorization; source659 recovery remains with its existing owner.
