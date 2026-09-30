# COSI Product Experience and M2–M5 Design Baseline

**Status:** Approved implementation baseline  
**Approved:** 2026-09-14 through founder delegation of design and ticket judgement  
**Scope:** Whole-MVP experience direction, with implementation detail for M2–M5  
**M4 approval:** Founder approved restock screens/states and D-038 on 2026-09-18  
**Reference device:** Galaxy A15 5G; low-end Android remains a required constraint

## Product Experience

COSI helps a retailer record daily work quickly, retain it without a network,
and progressively gain control and price intelligence. The interface should
feel calm, direct, and trustworthy during busy counter work. It must never make
a retailer complete the whole catalogue before receiving value.

Use these principles:

1. Put the next useful action ahead of configuration.
2. Ask for the least information required to save valid work.
3. State whether work is saved locally, pending sync, synchronized, or not saved.
4. Keep store-owned price, cost, stock, and supplier facts visibly separate from
   shared product identity.
5. Let users correct ambiguity; recognition and network failure never block the
   manual path.
6. Prefer familiar words, large touch targets, and stable layouts over novelty.

## MVP Information Architecture

The implemented pre-M8 primary navigation is:

- **Today:** current store, high-value shortcuts, honest operational summaries,
  and actionable sync/recovery status.
- **Sell:** the fastest route into a sale, with search/scanner/recent-item entry.
- **Products:** catalogue search, quick product creation, product details,
  packages, store prices, and later price history.
- **More:** restocking, inventory, expenses/withdrawals, transaction history,
  staff, settings, and diagnostics until evidence justifies a dedicated tab.

This historical baseline places the scanner as a contextual action from Sell and Products rather than a fifth
permanent tab. M2 implements the Products area only. Today, Sell, and More may
remain clearly labelled placeholders until their milestones; the M0 Welcome and
About routes are technical scaffolding and may be removed when the product shell
lands.

This navigation is a baseline for implementation, not a claim that every later
screen is fully designed. Later milestone tickets must expand this file before
adding their substantial user flows.

The approved PC-02/M8 transition is now implemented in source: Today, Products
and More tabs, global Scan on overview surfaces, and full-screen `/sell` with
draft guards. The four-destination list above is historical. M8 independent
audit and physical acceptance remain pending; see the M8 section below and the
current implementation handoff.

## M2 Catalogue Flow

### Products list

- Header: **Products**, current store context, and an honest offline indicator.
- Primary action: **Add product**.
- Search accepts product name, local SKU, or barcode text.
- Each row shows the most useful identity, temporary status when applicable,
  preferred package, active/inactive state, and store selling price only when
  one exists.
- Empty state explains that a product can be added with only a name and offers
  the same Add product action.
- Recent/frequent ordering is optional M2 scope and must not delay reliable
  search and alphabetical fallback.

### Quick add product

1. Ask for product name first.
2. Offer optional local SKU and barcode.
3. Create the provisional product with a default base unit such as **piece**;
   let the user change the label before saving.
4. Mark the record **Temporary** until it is sufficiently identified or matched.
5. Save locally and return to the product detail with a clear **Saved on this
   device** state. Sync transport is not implemented in M2, so do not claim the
   product has reached the cloud.

Advanced fields stay collapsed behind **Add more details**. Cancelling must not
leave product or outbox rows.

### Product detail and edit

Group information in this order:

1. Identity: name, temporary marker, barcode/identifier, active state.
2. Store facts: local SKU and store-owned selling-price settings.
3. Packages: base unit, additional packages, and exact conversion explanation.
4. Local save status and future sync status.

Editing shared-style identity must never make store prices or costs appear to be
shared. Deactivation uses a deliberate confirmation and retains history.

### Add or edit package

- Ask for the package name and how many base units it contains.
- Show the conversion in a sentence before save, for example: **1 carton = 40
  pieces**.
- Parse decimal input exactly to six places under D-034. Reject unsupported
  precision instead of rounding it silently.
- Exactly one active base unit exists. A package already used by completed work
  is versioned or deactivated rather than rewritten in place.
- Store-specific selling price and preferred-for-sale/purchase choices belong to
  StorePackageSetting, not the shared package identity.

## M3 Sales Flow

### Sell entry and product selection

- The Sell tab opens directly into offline catalogue search and an empty cart.
- Search and browse use the same local catalogue truth as Products. Only active,
  sellable package choices may be added.
- A no-match result offers **Add product** through the existing Quick Add flow,
  then returns the saved product to Sell. Scanner entry remains visibly deferred
  to M8 and cannot block manual search.
- Each result shows product name, preferred package, and package selling price
  when known. Selecting a product opens line configuration rather than silently
  adding an assumed quantity or price.

### Configure a sale line

1. Choose an active sellable package; start with the preferred sale package.
2. Enter a positive quantity using exact D-034 decimal handling.
3. Show the configured package price when one exists and allow a retailer to
   replace it with the agreed selling price.
4. Offer an optional absolute discount for this line.
5. Show quantity, package, price, discount, and calculated line total before
   **Add to cart** or **Update line**.

Invalid values stay in the form with field-level guidance. A value combination
that would require hidden quantity or currency rounding is rejected plainly.

### Review cart

- Show all lines with product/package snapshots, quantity, unit price, discount,
  and line total.
- Show subtotal, discount total, and sale total in the store currency.
- Let the retailer edit or remove a line before completion. An empty cart cannot
  continue to payment.
- The cart is an in-memory draft under D-037. Android Back or tab exit from a
  dirty cart requires confirmation that the uncompleted sale will be discarded.

### Payment and credit

- Present one large, text-labelled choice: **Cash**, **Transfer**, **POS/card**,
  or **Credit**.
- Cash, transfer, and POS/card allocate the full sale total. M3 does not ask for
  split-tender amounts.
- Credit shows the amount owed and requires a customer name before completion.
  Existing matches are selectable, but name alone never auto-merges accounts;
  the retailer can create a separate customer. Credit must never be presented
  as cash received.
- The final button states the amount, for example **Complete sale · ₦4,250**,
  and is disabled while the local transaction commits.

### Completion and history

- Success appears only after the complete local aggregate and outbox commit.
- Confirmation shows total, payment method, item count, **Saved on this device**,
  and actions for **New sale** and **View sale**.
- Recent sales show occurred time, total, payment method, and local status.
  Detail renders stored transaction snapshots so later catalogue edits do not
  rewrite history.
- Completed sales expose no edit, delete, void, return, or reversal action in
  M3. Those require a later correction-flow decision.

### Sale failure and recovery

- Validation or arithmetic failure retains the cart and points to the field.
- Local database failure says **Sale not recorded** and retains the cart for a
  deliberate retry. It must not navigate to confirmation.
- Duplicate completion presses and operation replay cannot duplicate a sale,
  payment, receivable, inventory effect, or outbox operation.
- Negative derived stock may be shown as a reconciliation signal but never
  causes a real offline sale to be discarded.
- Sale, history, and completion content must scroll at large text sizes; payment
  choices and cart actions retain 48dp targets and text labels.

## State Requirements

| State | Required behavior |
| --- | --- |
| Loading | Preserve the shell and show a short, non-blocking progress state. |
| Empty | Explain the benefit and provide one primary creation action. |
| Offline | Keep local catalogue actions available and state that cloud sync is unavailable. |
| Saving | Disable duplicate submission while retaining entered values. |
| Saved locally | Confirm the durable local commit; do not imply cloud completion. |
| Validation error | Place plain-language guidance beside the field and retain all valid input. |
| Local database failure | Do not claim success; offer retry and a safe return path. |
| Inactive product | Keep it discoverable through an explicit filter and protect its history. |
| No search match | Offer quick creation using the current query as the proposed name. |

## Accessibility and Android Constraints

- Interactive targets are at least 48 by 48 density-independent pixels.
- Support Android font scaling without clipping primary actions or values.
- Use semantic accessibility roles, names, hints where needed, and deterministic
  focus order. Icon-only actions require text alternatives.
- Never encode temporary, inactive, offline, error or error status solely by
  color; pair color with text or an icon and label.
- Maintain at least 4.5:1 contrast for normal text and 3:1 for large text and
  meaningful UI boundaries when rendered.
- The Android Back action closes a modal/form layer first, returns to the prior
  screen second, and never discards dirty input without confirmation.
- Avoid heavy animation, large unbounded lists, and network-dependent rendering.
  Respect reduced-motion settings and keep transitions short and functional.

## Visual Foundation

Use the system font and a compact, readable hierarchy. The palette is semantic:

| Token | Baseline value | Use |
| --- | --- | --- |
| `surface.canvas` | `#F7F8F5` | Main background |
| `surface.raised` | `#FFFFFF` | Cards, fields, sheets |
| `text.primary` | `#17251F` | Primary text |
| `text.secondary` | `#41534C` | Supporting text |
| `action.primary` | `#174F46` | Primary actions and selected state |
| `border.default` | `#7F8E88` | Field and section boundaries |
| `status.warning` | `#8A5700` | Temporary/pending warnings with text |
| `status.danger` | `#A22B2B` | Destructive action or failure with text |

Use a four-point spacing base, 12-pixel field/card corner radius, and restrained
elevation. These values are the M2 baseline; implementation must verify rendered
contrast and text scaling rather than treating the table as evidence by itself.

**M2 verification note (2026-09-14):** measured contrast of the approved text
pairs passes WCAG AA (primary 15.9, secondary 8.2, warning 6.1, danger 7.2 on
raised; button text 9.4 on the primary action). The first-draft border
(`#C8D1CC`, ~1.5:1) failed the 3:1 boundary bar, so the baseline now uses
`#7F8E88` (3.43:1 on raised, 3.22:1 on canvas). Automated tests assert these
ratios; real-device text scaling still needs the deferred device check.

## Product Copy

- Prefer **product**, **package**, **selling price**, **cost**, **stock**, and
  **saved on this device**.
- Explain temporary products as incomplete records the retailer can use now and
  improve later.
- Avoid accounting claims such as profit when the tracked inputs are incomplete.
- Avoid technical terms such as outbox, mutation, canonical identity, or schema
  in retailer-facing screens.

## M4 Restocking, Purchase History and Cost Availability

M4 adds a minimal **More** destination containing **Restock** and **Purchase
history**; do not present other More capabilities as implemented. Use existing
theme/components and store context. No scanner or accounting redesign.

### Enter and review

1. Find a local product or use the established Quick Add return path.
2. Choose an active purchase package and enter package quantity.
3. Choose **Total cost** or **Unit cost**; show exact converted base quantity,
   entered cost basis, store currency and labelled derived price information.
   Reject nonintegral unit-price totals with a field error; never silently round.
4. Add/edit/remove lines, review exact totals and optionally explicitly choose
   or create a supplier. Matching names do not automatically merge suppliers.
5. Review then confirm; no supplier-payment/credit settlement is implied.

Draft is in memory. Dirty header Back, hardware Back, tab changes and Cancel
require discard confirmation; internal review and Quick Add transitions retain
it. Focus-aware handlers do not intercept Back from other tabs. Preserve draft
through read/refresh/save failures with visible retry. Do not allow an overflow
or malformed input to crash rendering.

### Complete and inspect

Disable duplicate submission and retain the operation ID for retry. Only an
atomic durable local commit shows success. Receipt and offline history display
stored names, package/conversion/quantity/cost snapshots, optional supplier
attribution and the established saved-on-device/sync status language. Retry after
commit returns the original purchase. Later catalogue edits never replace facts.

Product purchase-price history shows original total/unit input basis plus
labelled normalized values; no market trend or shared-data feature is implied.
Current average and applicable sale cost are **Estimated weighted-average cost**;
unknown coverage is **Cost unavailable**, never zero or full profit. Preserve
original sale snapshots even after another restock. D-027/D-038 limitations apply.

### States and accessibility

Provide empty/loading/error/retry states for product, package, supplier, history
and detail reads, with focus reload and retained drafts. Reuse accessible labels,
field errors, 48dp targets, keyboard-safe review, large-text wrapping and existing
contrast tokens. Galaxy offline/restart/history/dirty-exit/large-text evidence is
still required; approval of this baseline is not physical-device proof.

## M5 Inventory, Expiry Groups and Blind Checks

Founder approved the behavior/expiry direction on 2026-09-18; coordinator
prepared these states under delegated design judgment. D-039/D-040 govern data
behavior. Reuse existing tokens, components, guards and accessible typography;
no visual redesign or navigation/tab replacement in M5.

### Entry and inspection

More -> Inventory opens searchable aggregate product stock, with Active/All
scope and clear low/zero/negative distinctions. Product detail links to the
same product inventory/history surface. Show “Milo — 50 cartons”; “Expiry
groups” reveals dates and recorded remaining quantities only when useful.
Label assumed quantities “Estimated remaining”; show unknown-date/unknown
breakdown coverage, last physical observation date and pending local sync.
Never call recorded FEFO quantities physically guaranteed.

### Restock and ordinary sale

Extend the existing restock line with optional expiry (Unknown / Month / Date),
keeping quantity and TOTAL/UNIT cost. “Same product, different expiry? Add another
group” creates a separate repeated-product line with its own quantity/cost/date;
do not automatically distribute rounded totals. Optional printed batch number
is secondary metadata. No “lot setup” prerequisite. Dirty exit/Quick Add recovery
must retain date inputs as well as existing cart/supplier facts. Receipt detail
shows original group date facts without editing history.

Sales stay at the existing M3 speed: no batch picker/confirmation. Allocation
happens at durable completion. Optional sale detail explains estimated expiry
group effects. Show a concise elapsed-date warning when recorded relevant stock
has passed its date, without an invented guarantee or new mandatory prompt.
Unknown/negative-stock manual sale remains possible.

### Review expiry / classify existing stock

Inventory group review accepts observed quantity and printed date, allowing
another group and an unknown remainder. Preview “Total stock unchanged” for
classification-only inspection; mismatched product totals route into the real
reconciliation flow. Corrections preserve prior observations/dates. Partial
inspection cannot imply the entire stock was physically verified.

“Mark expired/removed” asks actual quantity/group and reason, previews the
negative stock effect and confirms a durable adjustment. It is not a dismiss
button or an automatic whole-batch write-off. If quantity changed meanwhile,
refresh/review rather than apply a stale removal.

### Blind reconciliation and guided checks

More -> Stock checks or Inventory -> Count starts a durable session. The first
count screen hides expected quantity in text, accessibility labels and prefills;
it accepts exact supported package/base quantities. After submission show
recorded versus physical, the difference, Recount and Confirm/reason. Retain
both submissions. A match finishes as “Matched”; discrepancy can finish as
“Reconciled”, not “wrong until you guess correctly”. Batch observations are
optional unless claiming a verified breakdown; total-only changes show unknown
group coverage and a Review groups action.

If sales/restocks/classification changed the watermark, preserve entered evidence
and offer Refresh and recount. Never block sales or silently overwrite newer
stock. First/recount submissions survive restart; guard unsaved input and
destructive Cancel/header/Android Back using existing supported navigation
patterns. Finalization failure retains the session and operation ID for retry.

Guided check list shows due/pending/completed facts. Settings offer daily target
(default 3), pause and store-local check windows. Selection rotates eligible
items using a versioned policy; no candidates is a calm empty state. “Can't count
this item?” records a reason and replacement history; physical zero for expected
positive stock offers a zero-count discrepancy. No accusation or accuracy badge.
No staff invitation/assignment or supervisor-review workflow in this first
owner-only slice; ADMIN/STAFF management permissions await explicit later review.

### Attention and snooze

More -> Needs attention is one compact list with condition-specific detail/actions:
Restock for low/zero stock; Review/Reconcile for negative stock/differences;
Review stock/Snooze/Mark expired or removed for expiry. Unknown breakdown/date
coverage is explicit. Keep financial Home/report cards for M6.

DAY date messages may show a calendar-day countdown; MONTH says “October 2026
expiry”, never invented exact days. BEST_BEFORE/UNSPECIFIED labels retain their
meaning rather than calling every date “unsafe expiry”. About/estimated wording
explains inferred remaining quantities. Zero remaining removes that condition.

Snooze offers Later today, Tomorrow and Choose date/time; it affects reminders,
not stock. Display due time; reject past times. Condition resolution clears it,
and worsening severity (low -> zero/negative, upcoming date -> reached/passed)
resurfaces the item. No report locking or 100% accurate claim. M6 adds Home/See All.

All surfaces require loading/empty/error/retry, retained input after read errors,
locally saved/pending sync versus acknowledged status, accessible labelled actions,
large text and hardware/header exit checks. Physical evidence remains separate.

## M6 Expenses, Withdrawals and Live Today

M6 keeps the established navigation. **Today** becomes the calm Home operating
surface; **More** receives expense/withdrawal entry and history. Do not add a
Reports tab, global Scan action or price-movement simulation in this milestone.

### Home sequence

1. Header identifies the store and local day without presenting a cloud state as
   business truth.
2. **Live today** leads with Sales value and Transactions. Sales value includes
   recorded credit sales and is labelled as sales, never cash received or profit.
3. Show Recorded expenses and Owner withdrawals as separate facts. Cost coverage
   may expose Tracked COGS / Tracked gross margin with an explanation; partial
   coverage stays visibly unavailable and never becomes zero.
4. Optionally show **Most frequently sold today** using distinct completed-sale
   frequency. Omit it calmly when there is no qualifying product.
5. **Needs attention** previews a small severity-ordered subset of real M5
   conditions. `See all` opens the complete existing list; actions retain their
   real restock/reconcile/remove behavior and snooze rules.
6. A compact next-action row links to Sell, Restock, Stock checks and Record
   expense. Avoid another global add-product button.

Use zero-day, partial-coverage, loading, failure/retry and local-day rollover
states. Refresh on focus/foreground and after local durable mutations without
continuous background polling. Cards wrap at large text and actions retain 48dp
targets and explicit accessible labels.

### Record money leaving the business

Expense entry: amount in store currency, one approved category, optional note
and date/time, followed by review/confirm. Withdrawal entry: amount, optional
note and date/time, visibly described as owner/personal withdrawal rather than an
operating expense. Invalid/overflow values stay in the field with a clear error.
Dirty header/hardware Back and Cancel require discard confirmation. A failed
save retains input and retry identity; success appears only after durable local
completion.

Expense and withdrawal histories use human category/amount/time/actor labels,
empty and retry states, and established saved-on-device sync wording. Records are
immutable in M6; no swipe delete, silent edit, receipt upload, recurring schedule,
cash-account allocation or accounting journal.

### Summary explanation

The detail surface explains the store-local day, tracked inputs, missing cost
coverage and why the values are not a complete P&L. Use labels such as **Tracked
gross margin** and **Recorded expenses**. Do not display **Net profit**, **cash
balance**, **100% accurate**, or equivalent certainty.

## Gates for Later Milestones

Before each substantial UI milestone, add its screen sequence, states, recovery
behavior, and accessibility details here and link the corresponding tickets.
Design JSON is intentionally absent because no current generator or token
pipeline consumes it. Create it only when a real consumer exists, and generate
it from this approved source.

## M8 Scanner and Global Entry — Approved, 2026-09-29

**September 30 amendment:** D-047 replaces required name/unit entry in the
unknown-item selling shortcut with one whole-product identification photo and
numeric selling price. Quantity defaults to one and remains editable. Offer a
clear Continue without photo fallback when camera/storage is unavailable.
Generated temporary labels and thumbnails support later Complete details;
payment is normal, not pending. Ordinary Products creation remains available.
The originating-device photo is private and not yet cloud-backed. The amended
flow and failure tests are specified in M8_SCANNER_PLAN.md; guided multi-view
enrollment, visual matching and OCR remain later work. Earlier physical evidence
does not verify this changed flow.

**Status:** Founder approved 2026-09-29 (D-046), including PC-08. Implements the
PC-02 direction; earlier milestone navigation describes the pre-M8 application. Technical scope: `../engineering/M8_SCANNER_PLAN.md`.

### Entry and navigation

- Keep Today, Products and More as primary tabs. Move selling to a full-screen
  `/sell` route, preserving its URL and manual functionality. Do not add a Reports
  tab in this change. Sale history stays accessible from manual selling and More.
- One labelled **Scan** floating action appears on Today, Products list and More
  only. It opens the sale session in camera mode. Use safe-area spacing and list
  bottom padding so the control cannot cover content. Hide while the keyboard
  is open or a focused form/transaction is shown; avoid a global Add/+ control.
- **Sell manually** remains available from Home and More. The scanner always
  offers **Search products**. Camera permission is optional for manual selling.
- Inside a sale, **Scan next item** is contextual and explicitly opens capture.
  Keep the same mounted cart across camera/search/Quick Add. Product detail has
  **Associate barcode** with a product-scoped return path, never an implicit sale.
- Offer **Single item** and **Basket** modes per PC-08. Basket scanning stays
  open between accepted items, shows the last-added name/package, running count
  and total, and an easy Undo/edit path plus Review and pay. A known exact code
  with explicit package/price may add one unit; incomplete/uncertain items pause
  for input. Do not send the retailer back to the cart after every known item.
- Keep existing styles, colors and components. Use a text label with any scan
  icon, at least 48dp targets, readable focus order and 200% text-scale layouts.
  Avoid icon-only fallback controls, continuous animation or a new design system.

### Camera and result states

| State | What the retailer sees and can do |
| --- | --- |
| No ready local store | Existing setup or retry; preserve corrupt-store protection |
| First permission request | Brief purpose, Allow camera and Search products; ask on explicit entry |
| Denied, can ask again | Enable camera or Search products |
| Permanently denied | Open settings or Search products; no repeated permission loop |
| Camera starting | Short progress state plus cancel/search; one active preview |
| Ready | Frame one barcode, optional torch, Search products and Back |
| Resolving | Pause repeated detections; no line/write yet; keep cancel available |
| Strong match | Single mode: quantity/price confirmation. Basket: add one only when package/price are explicit and valid, show last addition and allow Undo/edit |
| Package unknown | Explicit available package choices; do not silently assume a piece/carton |
| Ambiguous/conflicted | Small safe choice set or manual search; no automatic association repair |
| Unknown | Code text, Search and link, Add product or Scan again |
| Recorded stock is zero | Identify the known item, display recorded balance and follow existing sale rules |
| Invalid/unsupported/too long | Plain explanation and manual search; do not truncate identity |
| Local read/camera failure | Retry and manual search; do not describe an error as an unknown product |
| Association save failed | Keep entries/cart; explain nothing saved when atomic transaction failed |
| Product saved, refresh failed | Say product is saved and offer retry; do not create a duplicate |
| Scanner disabled | Manual product selection works without mounting native camera |

Single mode uses the existing sale-line form for quantity and price. Basket mode
uses the same validations to add a complete known line and continue scanning;
it never completes payment automatically. Unknown/missing-price/package input
returns to that same basket after completion. One optional beep plus visible
feedback follows a successful addition; provide mute and a torch control when
available. No microphone permission is needed for this experience.

Hold a detection latch: the same stationary barcode cannot add repeatedly or
rearm merely because time passed or the app resumed. A different accepted code,
explicit Scan same item again or quantity edit expresses a new intention. Any
more automatic removal/re-entry mechanism requires real-device proof. This
supersedes the first proposal's confirm-every-item rule. Fast addition remains
subject to actual safety evidence before rollout.

Quick creation asks for a short name and selling price, plus unit/quantity where
needed; full cost/stock/photo setup is deferred. Products -> Temporary should
make **Complete details** easy to find after minutes or days. The saved product
persists separately from the sale draft. Enrichment keeps its ID and historical
sale snapshots; it does not invent historical cost or initial inventory.

### Recovery, privacy and correctness

Back/cancel from the camera preserves the cart. Dirty line/Quick Add/cart exits
retain explicit discard confirmation on header, hardware and system navigation.
Backgrounding stops preview; resume starts a fresh capture generation so a late
result cannot modify a newer session. Drafts remain in memory under D-037;
completed sales retain their existing durable receipt/restart behavior.

The current store's price is obtained from the catalogue, never from the QR or
camera. QR is treated as data, never a web-link action. Do not request microphone
permission, save camera frames, or upload images for this barcode milestone.
Expiry groups and FEFO remain inventory concerns; a product scan does not prove
which physical expiry group was picked. Batch OCR and strict lot verification
remain future capabilities.

### Design acceptance evidence

Automated navigation/state tests plus physical A15 verification must cover the
state table, repeated scans, all exit paths, text scale, TalkBack, camera release,
offline scan-to-sale and receipt survival. Compare time/errors with manual
search. No screenshots or physical passes are claimed by this specification.

### M8-08 scanner activity feedback — coordinator-specified, 2026-09-30

Four visible corner brackets and one restrained sweeping line frame the live barcode preview. Motion runs only for a ready scanner accepting detections; show static framing/status with reduced motion and remove activity while paused, processing or displaying a result. The decoration consumes no touches, is hidden from repeated screen-reader announcements, and does not imply a detector ROI, success or multi-object recognition. See tickets.md M8-08 and the M8_SCANNER_PLAN addition linked to D-047. Physical appearance and continuous basket flow remain unverified.

## M8-09 — optional unconfirmed catalogue suggestions (D-048)

Keep the selling shortcut photo + price + same basket. No online spinner or name requirement enters checkout. Later Temporary detail may show one compact inline card with proposed name, brand, size and source/attribution. Use details or Edit fills the actual editable name; Save confirms it using the existing command. Dismiss is persistent. Ordinary Add product shows the same card for a ready valid-barcode response, with existing typing remaining usable. Late results never write current form fields. Distinguish no result, offline/error/timeout, bounded retry and disabled provider truthfully; reduced confidence is explicit, not a success badge. No remote images, modal, package inference or visual recognition. Live default remains disabled under the provider review.
