# COSI Product Experience and M2 Design Baseline

**Status:** Approved implementation baseline  
**Approved:** 2026-09-14 through founder delegation of design and ticket judgement  
**Scope:** Whole-MVP experience direction, with implementation detail for M2  
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

The baseline primary navigation is:

- **Today:** current store, high-value shortcuts, honest operational summaries,
  and actionable sync/recovery status.
- **Sell:** the fastest route into a sale, with search/scanner/recent-item entry.
- **Products:** catalogue search, quick product creation, product details,
  packages, store prices, and later price history.
- **More:** restocking, inventory, expenses/withdrawals, transaction history,
  staff, settings, and diagnostics until evidence justifies a dedicated tab.

The scanner is a contextual action from Sell and Products rather than a fifth
permanent tab. M2 implements the Products area only. Today, Sell, and More may
remain clearly labelled placeholders until their milestones; the M0 Welcome and
About routes are technical scaffolding and may be removed when the product shell
lands.

This navigation is a baseline for implementation, not a claim that every later
screen is fully designed. Later milestone tickets must expand this file before
adding their substantial user flows.

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
| `border.default` | `#C8D1CC` | Field and section boundaries |
| `status.warning` | `#8A5700` | Temporary/pending warnings with text |
| `status.danger` | `#A22B2B` | Destructive action or failure with text |

Use a four-point spacing base, 12-pixel field/card corner radius, and restrained
elevation. These values are the M2 baseline; implementation must verify rendered
contrast and text scaling rather than treating the table as evidence by itself.

## Product Copy

- Prefer **product**, **package**, **selling price**, **cost**, **stock**, and
  **saved on this device**.
- Explain temporary products as incomplete records the retailer can use now and
  improve later.
- Avoid accounting claims such as profit when the tracked inputs are incomplete.
- Avoid technical terms such as outbox, mutation, canonical identity, or schema
  in retailer-facing screens.

## Gates for Later Milestones

Before each substantial UI milestone, add its screen sequence, states, recovery
behavior, and accessibility details here and link the corresponding tickets.
Design JSON is intentionally absent because no current generator or token
pipeline consumes it. Create it only when a real consumer exists, and generate
it from this approved source.
