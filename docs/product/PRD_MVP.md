# PRD_MVP — Retail Commerce Intelligence

**Version:** 1.0  
**Status:** Draft for architecture/build preparation  
**Primary platform:** Android  
**Client:** React Native + Expo Development Build + TypeScript  
**Product mode:** Mobile-first, offline-first

---

# 1. Purpose

This PRD defines the behavior and scope of the first testable MVP.

It converts the Product Inception into implementable product requirements.

The MVP is intended to validate whether retailers will consistently use the product to:
- record sales;
- record restocking/purchases;
- maintain more trustworthy inventory records;
- understand basic business performance;
- track changing restock costs;
- benefit from faster product identification;
- and eventually contribute useful anonymized market-price observations.

This document defines **what the MVP must do**.

Detailed implementation choices belong in the technical architecture and domain/data-model documents.

---

# 2. Product Objective

The MVP should allow a retailer to begin using the product without fully digitizing the store in advance.

The product should progressively build useful business records through normal activity.

The retailer should be able to answer:

- What did I sell?
- What did I spend?
- What happened to my stock?
- What did I actually make from the transactions I recorded?
- What did I last pay for this product?
- Is my purchase/restock cost changing?
- Can I still replace what I am selling?
- Which product am I looking at or scanning?

The MVP must remain useful even without:
- a mature network;
- a complete product catalogue;
- reliable internet;
- successful visual recognition.

---

# 3. MVP Success Principle

The MVP succeeds when a retailer can use it during normal trading without the product becoming a burden.

The product must prioritize:

1. transaction speed;
2. offline reliability;
3. inventory integrity;
4. simple workflows;
5. useful immediate information;
6. graceful failure;
7. progressive setup.

The product must not require a retailer to complete a long configuration process before receiving value.

---

# 4. Target User

Primary MVP user:

- owner-managed or closely managed retailer;
- initially supermarket / provision / FMCG-oriented;
- smartphone user;
- recurring daily sales;
- recurring restocking;
- meaningful number of products;
- experiences purchase-price changes;
- wants stronger visibility into sales, stock, expenses or profit.

Secondary MVP user:

- trusted staff member/cashier operating on behalf of the store.

---

# 5. Primary User Roles

## 5.1 Owner / Admin

Can:
- create/manage the store;
- add/edit products;
- record sales;
- record purchases/restocking;
- record expenses and withdrawals;
- view summaries;
- reconcile inventory;
- manage staff access;
- configure product/package data;
- review price intelligence;
- review recognition/enrollment data.

## 5.2 Staff / Cashier

May be allowed to:
- record sales;
- scan products;
- create temporary products when permitted;
- view limited product information;
- record selected transactions;
- operate offline.

Staff permissions should remain simple in MVP.

---

# 6. Core MVP Areas

The MVP consists of:

1. Store/account setup
2. Product catalogue
3. Package/unit model
4. Product identification/scanning
5. Sales
6. Purchases/restocking
7. Inventory ledger
8. Inventory reconciliation
9. Expenses/withdrawals
10. Basic business intelligence
11. Personal restock-price intelligence
12. Early market-price infrastructure
13. Staff attribution
14. Offline operation
15. Sync foundation
16. Data integrity and auditability

---

# 7. Onboarding

## 7.1 Goal

A retailer should reach usable product functionality quickly.

## 7.2 Required onboarding information

At minimum:
- user identity/account;
- business/store name;
- basic store location;
- preferred currency;
- basic business settings.

## 7.3 Requirements

- No requirement to enter full inventory during onboarding.
- No requirement to upload a complete SKU list.
- No requirement to configure advanced accounting.
- User should be able to start adding/selling products immediately.
- Onboarding should explain that the catalogue can grow progressively through normal use.

## 7.4 Acceptance

Onboarding is successful when a new store can reach the first sale/product workflow without completing a large setup process.

---

# 8. Product Catalogue

## 8.1 Product creation

A product may be created through:
- manual creation;
- barcode scan;
- visual scan;
- unknown-product fallback during sale;
- restocking/purchase workflow.

## 8.2 Progressive product record

A product record may initially contain only:
- temporary name or identifier;
- image/photo where available;
- selling price;
- package/unit;
- store association.

Additional data may be completed later:
- canonical name;
- brand;
- category;
- size;
- barcode;
- purchase cost;
- supplier;
- preferred package;
- reorder threshold;
- recognition references.

## 8.3 Requirement

Missing non-essential product metadata must not block sale.

## 8.4 Temporary product

If the product cannot be identified:
- user may create a temporary product;
- sale can continue;
- product can be enriched later;
- temporary status should remain visible until resolved.

---

# 9. Product Identity Model

The system must distinguish between:

## 9.1 Shared/canonical product identity

Examples:
- product name;
- brand;
- category;
- size;
- barcode;
- visual identity;
- package presentation;
- packaging generation/version.

## 9.2 Store-specific product record

Examples:
- local SKU;
- selling price;
- purchase cost;
- stock;
- supplier;
- reorder level;
- active/inactive status.

A shared product update must never silently overwrite store-specific:
- cost;
- price;
- stock;
- supplier;
- inventory history.

---

# 10. Package / Unit Model

## 10.1 Principle

A product may be purchased and sold in different package levels without being treated as unrelated products.

Example:

Indomie Chicken 70g:
- sachet;
- pack;
- carton.

## 10.2 Base unit

Each product variant should have one internal base inventory unit.

Example:

- base unit = sachet;
- pack = 10 sachets;
- carton = 40 sachets.

## 10.3 Purchase conversion

If user records:

> 5 cartons

and:

> 1 carton = 40 sachets

system records:

> +200 base units.

## 10.4 Sale conversion

If user sells:
- 1 sachet → subtract 1 base unit;
- 1 pack → subtract configured pack conversion;
- 1 carton → subtract configured carton conversion.

## 10.5 Package pricing

Each package/unit may have:
- selling price;
- optional minimum price;
- barcode;
- image;
- preferred status.

## 10.6 Requirement

The user should not manually calculate package conversions during normal sale or restocking.

## 10.7 Distinct size rule

Different physical sizes remain separate product variants.

Example:

- Milo 400g
- Milo 800g

They are not package levels of the same variant.

---

# 11. Sales

## 11.1 Core sale flow

Preferred flow:

> Identify/select product → choose quantity/package → confirm/change selling price → choose payment method → complete sale.

## 11.2 Product identification options

User may:
- search;
- browse;
- scan barcode/QR;
- use visual scanner;
- select recent/frequent products;
- create temporary product if unknown.

## 11.3 Selling price

The product must support:
- default/recommended price;
- manual price change;
- discount;
- flexible/bargained selling price;
- package-specific prices.

Rigid fixed pricing must not be mandatory.

## 11.4 Quantity

User can sell:
- one unit;
- multiple units;
- configured package levels.

## 11.5 Payment methods

At minimum:
- cash;
- transfer;
- POS/card;
- credit.

## 11.6 Sale completion

When a sale is completed:
- sale record is stored locally;
- sale items are stored;
- inventory ledger is updated;
- cost basis is captured/derived where available;
- payment method is recorded;
- user/staff attribution is recorded;
- sync status is recorded;
- summary metrics update from local data.

## 11.7 Offline requirement

A sale must complete without internet.

## 11.8 Failure rule

Scanner failure, missing cloud data or unavailable network must not prevent a sale.

---

# 12. Credit Sales

## 12.1 MVP scope

Credit sale may be recorded as:
- amount owed;
- customer name or simple identifier;
- transaction date;
- amount paid;
- balance due.

## 12.2 Non-goal

Full CRM/debt-collection automation is not required in MVP.

---

# 13. Purchases / Restocking

## 13.1 Core flow

> Select/create product → select purchase package → enter quantity → enter total/unit cost → optional supplier → save.

## 13.2 Required behavior

Restocking must:
- add inventory through an inventory event;
- record purchase cost;
- preserve date/time;
- preserve package/unit;
- calculate base-unit quantity;
- update personal restock-price history;
- update costing basis;
- queue eligible price observation for later sync if consent permits.

## 13.3 Price basis

System should retain:
- entered purchase price;
- package/unit basis;
- normalized comparable basis where possible.

Example:

₦12,000/carton of 40
may also derive:
₦300/base unit.

## 13.4 Offline requirement

Restocking must work offline.

---

# 14. Inventory Ledger

## 14.1 Principle

Inventory must be based on events rather than only a mutable stock number.

Examples:
- restock;
- sale;
- return;
- damaged;
- expired;
- missing;
- personal use;
- correction.

## 14.2 Requirement

Each inventory-changing action creates an inventory event.

## 14.3 Event information

At minimum:
- store;
- product/store product;
- package/base-unit effect;
- quantity;
- event type;
- source transaction;
- timestamp;
- user/staff;
- sync status.

## 14.4 Current stock

Current stock is derived from inventory events and/or maintained as a safely derived balance.

---

# 15. Inventory Reconciliation

## 15.1 Goal

Allow the retailer to compare recorded stock against physical stock.

## 15.2 Flow

> Select product → see recorded quantity → enter checked physical quantity → system shows difference → choose reason → confirm adjustment.

## 15.3 Reasons

At minimum:
- unrecorded sale;
- damaged;
- expired;
- missing;
- personal use;
- return;
- correction;
- other.

## 15.4 Requirement

Adjustments create explicit inventory events.

The system must not silently rewrite history.

---

# 16. Costing

## 16.1 MVP proposal

Use moving weighted-average cost unless architecture/accounting review identifies a better MVP method.

## 16.2 Example

20 units remain at ₦300.

40 new units arrive at ₦350.

Average cost becomes:

₦333.33/unit.

## 16.3 Requirement

The merchant should not need to understand or manually calculate the costing method.

## 16.4 Validation

Final accounting interpretation must be reviewed before the product presents formal accounting claims.

---

# 17. Expenses

## 17.1 Expense entry

User can record:
- amount;
- category;
- note;
- date/time;
- payment source if needed.

## 17.2 Initial categories

Examples:
- transport;
- wages;
- fuel/electricity;
- rent;
- maintenance;
- levies/tax;
- miscellaneous.

## 17.3 Offline requirement

Expense recording must work offline.

---

# 18. Owner Withdrawals

Owner/personal withdrawal must be distinguishable from business operating expense.

At minimum capture:
- amount;
- date/time;
- optional note;
- user.

This supports clearer visibility into money leaving the business.

---

# 19. Business Summary / Dashboard

## 19.1 Primary question

The dashboard should answer:

> What happened in my business today?

## 19.2 MVP metrics

Where data is available:
- tracked sales;
- number of transactions;
- tracked COGS;
- tracked gross margin;
- expenses;
- owner withdrawals;
- retained/tracked margin;
- top-moving products;
- low-stock items;
- purchase-cost changes;
- inventory discrepancies;
- recent staff activity.

## 19.3 Accuracy rule

Do not label incomplete tracked information as full:
- profit;
- P&L;
- net income.

Use transparent labels such as:
- tracked gross margin;
- recorded expenses;
- estimated/tracked result.

---

# 20. Personal Restock-Price Intelligence

## 20.1 Requirement

A single retailer should receive useful price history without depending on network participation.

For each relevant product, system may show:
- previous purchase price;
- latest purchase price;
- percentage change;
- package basis;
- date/time;
- supplier where applicable.

## 20.2 Example

> Last purchase: ₦12,500/carton  
> Latest purchase: ₦14,000/carton  
> Change: +12%

## 20.3 Offline behavior

The retailer's own local purchase history should be available offline.

---

# 21. Market Restock-Price Intelligence

## 21.1 MVP status

This is a network-dependent capability and must be treated as experimental until enough trustworthy observations exist.

## 21.2 Preferred output

Where evidence supports it, show:
- observed range;
- typical/median price;
- trend;
- observation count;
- freshness;
- geography;
- confidence.

Do not present one unquestionable "market price" when the evidence does not justify it.

## 21.3 Data sources

Potential sources:
- consenting retailer purchase observations;
- manual market checks;
- selected suppliers/wholesalers;
- trusted external sources later.

## 21.4 Provenance

Every market observation should retain:
- source type;
- timestamp;
- product/package identity;
- geography;
- validation status;
- confidence;
- consent status where relevant.

---

# 22. Price Contribution / Consent

## 22.1 Principle

Retailer contribution must be transparent and consent-based.

## 22.2 The product must communicate

- what information may be contributed;
- what is not shared;
- how data is aggregated/anonymized;
- what value the retailer receives.

## 22.3 Privacy rule

The system should avoid exposing:
- retailer identity;
- competitor-specific purchasing behavior;
- unnecessary private supplier relationships.

---

# 23. Unified Scanner

## 23.1 Goal

Provide one scanner experience that can use multiple identification methods.

## 23.2 Evidence paths

Potential evidence:
- barcode/QR;
- visual embedding;
- OCR;
- local store catalogue context;
- package-unit clues.

## 23.3 Search order

Preferred search hierarchy:
1. Barcode/QR mapping
2. Active store products
3. Small cached discovery set
4. Wider platform catalogue when online

## 23.4 Offline requirement

Locally known products must remain identifiable offline.

---

# 24. Barcode / QR

## 24.1 Requirement

If a recognized barcode/QR is found locally:
- map to product/package;
- show product candidate;
- allow confirmation/continuation.

## 24.2 Unknown barcode

If no mapping exists:
- allow user to create/associate a product;
- optionally search broader catalogue when online;
- never block sale.

---

# 25. Visual Product Recognition

## 25.1 MVP principle

Recognition is primarily local product retrieval, not universal classification.

## 25.2 Expected behavior

Camera image:
- quality check;
- generate visual representation;
- compare against relevant local recognition references;
- rank candidates;
- optionally use OCR/context;
- return result.

## 25.3 Result states

System should support:
- strong candidate;
- ambiguous result;
- unknown.

## 25.4 Ambiguous result

Show a small candidate list, e.g. top 3.

## 25.5 Unknown

User may:
- search manually;
- create temporary product;
- enroll product;
- continue sale.

## 25.6 Safety rule

A wrong confident match is worse than an extra tap.

---

# 26. Recognition Enrollment

## 26.1 Goal

Allow a store to create recognition references for products it carries.

## 26.2 Flow

> capture useful view → quality check → create reference → determine whether more visual diversity is needed → finish or request another view.

## 26.3 Requirement

Do not hard-code a universal fixed image count.

## 26.4 Data generated

Potentially:
- compressed reference image;
- thumbnail;
- embedding;
- OCR clues;
- package-unit association;
- model/preprocessing version metadata.

---

# 27. Recognition and Package Units

Where relevant, recognition may return both:
- product variant;
- package unit.

Example:
- product = Indomie Chicken 70g;
- package = carton.

If package-unit confidence is insufficient:
- product may still be identified;
- package unit should require user confirmation.

---

# 28. Recognition Failure / Fallback

Recognition must never be mandatory for transaction completion.

Fallback sequence may include:
- candidate selection;
- text search;
- recent products;
- photo capture;
- quick temporary product creation.

---

# 29. Recognition R&D Boundary

The MVP product must not depend on the success of advanced visual recognition.

Recognition will be developed as a parallel subsystem.

Its internal technology may change without changing the main sales/product workflows, provided its external contract remains stable.

---

# 30. Staff Attribution

Where staff accounts are enabled:
- sales should record performing user;
- purchases/restocks should record performing user;
- expenses/withdrawals should record performing user;
- inventory adjustments should record performing user.

Full HR functionality is outside MVP.

---

# 31. Offline-First Requirements

The following must work without internet:
- open app after initial setup;
- search local products;
- access recent products;
- scan locally known barcode mappings;
- perform supported local recognition;
- create temporary/local product;
- record sale;
- record purchase/restock;
- update inventory;
- record expense;
- record withdrawal;
- view summaries derived from local data;
- perform inventory reconciliation.

---

# 32. Sync Requirements

When internet returns:
- pending local changes should sync automatically or through a simple user-triggered retry;
- successful sync should not duplicate transactions;
- failed sync should remain retryable;
- sync state should be inspectable;
- remote acknowledgements should be recorded;
- conflicts must be handled according to the offline-sync architecture.

Detailed conflict rules belong in `OFFLINE_SYNC.md`.

---

# 33. Data Integrity Requirements

The application must:
- save financial/inventory transactions durably before reporting success;
- avoid duplicate sale/restock creation during retry;
- preserve transaction timestamps;
- preserve creating user/device;
- preserve source transaction relationships;
- avoid silent destructive edits;
- use explicit corrections/adjustments where appropriate.

---

# 34. Error Handling

Errors should:
- use understandable language;
- avoid exposing technical stack traces to normal users;
- preserve unsaved user work where possible;
- provide retry/recovery path;
- never convert a temporary network problem into lost local transaction data.

---

# 35. Performance Requirements

The MVP should be optimized for:
- low- to mid-range Android hardware;
- unreliable connectivity;
- limited storage;
- busy retail conditions.

Critical actions such as:
- product lookup;
- sale completion;
- barcode scanning;
- inventory updates

must feel fast enough for normal store use.

Exact latency targets will be established in technical/test documents.

---

# 36. Security / Privacy Product Requirements

At product level:
- user accounts require authentication;
- staff access should be attributable;
- sensitive store data should not be publicly exposed;
- shared network data must not reveal identifiable competitor transactions by default;
- permissions should follow least-privilege principles;
- local sensitive data should be protected using platform-appropriate mechanisms;
- lost/replaced device recovery should be considered in architecture.

Detailed security design belongs in Technical Architecture.

---

# 37. MVP Non-Goals

Do not build in the initial MVP:
- consumer marketplace;
- delivery logistics;
- full wholesaler marketplace;
- manufacturer marketplace;
- lending;
- credit scoring;
- advanced CRM;
- full bookkeeping/accounting suite;
- tax filing;
- payroll/HR suite;
- nationwide live-pricing coverage;
- universal visual recognition;
- complex recommendation AI;
- elaborate referral economy;
- multi-country support;
- advanced multi-warehouse ERP.

---

# 38. Beta Validation

## 38.1 Cohort A — Workflow

Approx. 10–15 retailers.

Validate:
- onboarding;
- sales usage;
- rush-period usability;
- restock capture;
- catalogue growth;
- inventory reliability;
- dashboard usefulness;
- price-history usefulness.

## 38.2 Cohort B — Network

Expand toward approx. 20–50 concentrated relevant retailers.

Validate:
- product overlap;
- observation density;
- contribution consent;
- useful market-price signals;
- whether price intelligence changes decisions.

---

# 39. Product Success Signals

Strong signals include:
- users continue without founder chasing;
- transactions are consistently recorded;
- users do not abandon the product during busy periods;
- purchases/restocks are recorded;
- inventory remains reasonably trustworthy;
- users notice useful purchase-cost changes;
- information changes real decisions;
- scanner reduces friction without increasing errors;
- users do not want to return to the old workflow.

---

# 40. Product Failure Signals

Serious warnings include:
- users routinely bypass app during sales;
- full product setup is still required before value;
- restocking is rarely captured;
- inventory diverges quickly from reality;
- scanner creates frequent false matches;
- recognition slows checkout;
- price intelligence rarely affects decisions;
- market observations lack local overlap;
- users reject contribution;
- offline failures cause lost/duplicated transactions.

---

# 41. MVP Acceptance Definition

The MVP is ready for controlled retailer beta when:

1. A store can be created and configured.
2. Products can be created progressively.
3. Package/unit conversions work.
4. Sales work reliably offline.
5. Restocking works reliably offline.
6. Inventory ledger updates correctly.
7. Inventory can be reconciled.
8. Expenses/withdrawals can be recorded.
9. Dashboard provides useful tracked summaries.
10. Personal restock-price history works.
11. Barcode scanning works for known mappings.
12. Unknown products can be handled without blocking sale.
13. Recognition subsystem can be integrated behind a stable contract, even if advanced visual recognition remains experimental.
14. Local data survives app restarts.
15. Sync foundation can safely transmit local changes without duplication.
16. Core workflows pass the agreed test/acceptance suite.

---

# 42. Open Questions Requiring Architecture / Validation

The following are intentionally unresolved here:

- exact backend/provider;
- authentication provider;
- cloud database;
- local database implementation;
- sync protocol;
- conflict resolution rules;
- device ownership and multi-device behavior;
- state management library;
- exact API style;
- image/object storage;
- analytics stack;
- exact security implementation;
- exact recognition model/runtime;
- exact camera library;
- final costing/accounting policy;
- exact market-price confidence algorithm;
- exact staff permission model;
- exact pricing/subscription model.

These must be resolved in the appropriate architecture, research or validation documents rather than guessed inside the PRD.

---

# 43. Source-of-Truth Relationship

This document must be interpreted together with:

- `PRODUCT_INCEPTION.md` — product purpose and strategic direction;
- `DOMAIN_DATA_MODEL.md` — entities, relationships and business invariants;
- `TECHNICAL_ARCHITECTURE.md` — implementation architecture;
- `OFFLINE_SYNC.md` — synchronization/conflict behavior;
- `SCANNING_ARCHITECTURE.md` — detailed scanner/recognition architecture;
- `RECOGNITION_TEST_PLAN.md` — recognition benchmarking and acceptance;
- `BUILD_PLAN.md` — implementation sequence;
- `PROJECT_STATE.md` — current implementation state;
- `DECISION_LOG.md` — durable decisions and rationale;
- `AGENTS.md` — AI coding-agent operating rules.

If implementation reveals a conflict with this PRD, the conflict should be resolved explicitly rather than silently changing product behavior.
