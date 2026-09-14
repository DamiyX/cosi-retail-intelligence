# Product Inception v1.1 — Retail Commerce Intelligence

**Project Codename:** COSI  
**Expanded:** Commerce Operating System Intelligence  
**Naming Status:** Temporary internal working name; final product/company brand is TBD.  

> Naming rule: use COSI for project-level communication only. Do not unnecessarily embed the codename into domain entities, database schemas, APIs, or reusable technical identifiers.

## 1. Status Legend

🟢 Confirmed / recommended direction  
🟡 Requires validation  
🔵 Proposed implementation  
🔴 Constraint  
⚪ Future consideration

---

# 2. Product Thesis

🟢 Build an **offline-first retail business intelligence and market-price intelligence product** that helps retailers understand what is happening inside their business and what is happening to the cost of goods around them.

The product should:

> **Lead with price intelligence, deliver immediate value through business and inventory control, and gradually build a data network whose intelligence improves as relevant retailers participate.**

The product must provide useful standalone value even when only one retailer is using it.

The network must enhance the product, not be required for the product to function.

---

# 3. Problem

Retailers operate in an unstable environment while frequently relying on:

- memory;
- calculators;
- paper records;
- incomplete software;
- physical stock checks;
- personal experience;
- supplier calls;
- periodic market visits.

The research shows recurring problems around:

### A. Changing replacement costs
Retailers may only discover that purchase prices have changed when they return to restock, affecting margin, pricing and the quantity they can replace.

### B. Weak business visibility
Some retailers struggle to clearly separate sales, actual profit, expenses, withdrawals and reinvestable capital.

Other experienced retailers understand these concepts but still manage them manually.

### C. Inventory truth
Digital records do not automatically solve inventory problems. Stores can have stock recorded in software that is different from what physically exists.

### D. Workflow friction
Existing software can be abandoned when maintaining records competes with attending to customers.

### E. Accountability
Theft, missed transactions, unauthorized actions and owner absence create control problems in some businesses.

### F. External growth problems
Retailers also experience:

- insufficient capital;
- customer acquisition problems;
- low demand;
- poor location;
- financing constraints.

These are real, but they are not the initial product focus.

---

# 4. Problem Structure

## Phase 1 — Protect and understand the business that already exists

🟢 Initial focus:

- business visibility;
- inventory visibility;
- transaction documentation;
- expenditure/withdrawal visibility;
- replacement-cost awareness;
- operational accountability.

Price instability is a **hybrid problem** because its causes are external while the retailer's response—pricing, selling and restocking—is internal.

## Phase 2 — Help the business grow externally

⚪ Later:

- customer acquisition;
- financing;
- supplier discovery;
- wholesale marketplace;
- procurement;
- commerce connectivity.

---

# 5. Initial Customer

🟢 **Retailers first.**

### Initial ICP hypothesis

🟢 Owner-managed or closely managed:

- supermarkets;
- provision stores;
- FMCG retailers;
- mini-supermarkets.

Initially:

> **Port Harcourt / Rivers State / Nigeria**

Ideal pilot businesses should have:

- meaningful daily transaction volume;
- recurring restocking;
- significant SKU count;
- changing purchase prices;
- owner concern about profit/stock;
- smartphone access;
- willingness to participate in testing.

🟡 FMCG is the strongest initial hypothesis, not a permanently fixed vertical.

Businesses whose dominant problem is simply **lack of customers** should not be the primary MVP test population because the MVP does not initially solve demand generation.

---

# 6. Vision

🟢

> **To promote visibility, transparency & trust within commerce while helping retailers to operate smarter and grow in an unstable market.**

---

# 7. Mission

🟢

> **To give businesses simple digital tools & real-time market intelligence that help them understand their operations, make better decisions & trade more profitably.**

---

# 8. Goal

🟢

> **To build a large network of retailers whose collective business activity creates a real-time intelligence layer for prices, demand, supply & commerce so they stop losing profit without knowing it.**

---

# 9. Initial Objective

🟢

> **Enable retailers to start gaining meaningful visibility into their business within the first 24 hours without requiring them to fully digitize their entire inventory, and later build sufficient price-data density within one geography to produce meaningfully useful market signals.**

---

# 10. Positioning

### Long term

🟢

> **A real-time intelligence network for commerce that helps retailers understand what is happening in their business and what is happening in the market around them.**

### Initial market positioning

🟢

> **A real-time market-price intelligence network for retailers.**

### Important positioning rule

🔵 **Lead with price. Deliver with control.**

Price intelligence should provide differentiation.

Business and inventory intelligence should provide immediate utility and retention.

The data network should eventually create defensibility.

---

# 11. Core User Jobs

The product should help a retailer answer:

### Business
- What did I sell?
- How much revenue did I make?
- What did those goods cost me?
- What margin did I make?
- What money left the business?
- Am I actually growing or consuming my capital?

### Inventory
- What stock do I have?
- What is moving?
- What is running low?
- What went missing, expired or became damaged?
- Can I trust the number the system shows?

### Price
- What did I last buy this product for?
- How much has my cost changed?
- Approximately what are other relevant businesses currently paying?
- Should I reconsider my selling price?
- Can my current selling price still replace what I am selling?

---

# 12. Core Product Principles

## 🟢 Value before setup
A retailer must not be required to fully digitize hundreds of products before receiving useful information.

## 🟢 Sell first, enrich later
The checkout workflow takes priority over perfect product data.

Unknown product:
> identify/capture → price → sell.

Additional metadata can be completed later.

## 🟢 Customer waiting time is a hard constraint
If using the product becomes slower than abandoning it during rush periods, the product has failed.

## 🟢 Offline-first
Core operations must work without internet.

Online connectivity enhances:
- synchronization;
- backups;
- market intelligence;
- shared data.

It must not be required to complete a normal sale.

## 🟢 Flexible commerce
Do not impose fixed-price assumptions.

Support bargaining and different business models.

## 🟢 Accurate before impressive
Never display incomplete financial information as though it were complete.

Use **Tracked gross margin** rather than claiming **Net Profit** when required expenses or inventory costs are missing.

## 🟢 Progressive complexity
The simple retailer should see a simple interface.

The underlying system can remain sophisticated.

---

# 13. MVP Technology Direction

🟢 **Primary client:** React Native + Expo Development Build + TypeScript.

🟢 **Primary launch platform:** Android.

🟢 **Architecture:** mobile-first and offline-first.

⚪ **Web/PWA:** a later client for desktop/laptop use and secondary access. It is not the primary MVP client.

🔴 Core selling, inventory, purchase/restock capture and essential business records must not depend on continuous internet access.

🟢 Development should support fast iteration on real Android devices while retaining access to native modules required by scanning, local databases and future on-device ML.

---

# 14. MVP Scope

## A. Business/store setup

🟢

- user account;
- business/store;
- essential settings only.

No lengthy onboarding.

---

# 15. Sell

🟢 Core flow:

> Product → Quantity → Selling price → Payment → Complete.

Support:

- cash;
- bank transfer;
- POS/card;
- credit sale;
- discount;
- flexible selling price.

---

# 16. Unified Product Identification and Scanning

🟢 The product should expose one coherent scanner experience rather than separate unrelated barcode and visual-recognition products.

The recognition subsystem should be treated as:

> **An offline-first local product-identity retrieval system whose product knowledge can be synchronized and improved over time.**

It is **not** intended to be an AI that recognizes every product in the world.

The normal scan must work without internet for locally known products.

### Recognition evidence paths
The scanner may use:
- barcode / QR;
- visual embedding retrieval;
- OCR where useful;
- store/catalog context;
- additional verification methods where experiments justify them.

### Search priority
🟢 Recognition should search in this order where relevant:
1. Barcode / QR mappings
2. Active products carried by the store
3. Small locally cached discovery/popular-product set
4. Wider platform/global catalogue when online

### Unknown is a valid result
🟢 The system must be allowed to return:
> **Unknown**

A wrong confident SKU is more damaging than requiring one additional user action.

### Checkout fallback
🟢 Recognition failure must never block checkout.

If the product cannot be confidently identified:
> capture/photo → quick temporary product → sell.

---

# 17. Progressive Product Catalogue

🟢 Product records may begin incomplete.

For example:
> image  
> temporary identifier  
> selling price

Later:
- name;
- brand;
- category;
- package;
- cost;
- quantity;
- supplier;
- additional images.

Normal business activity progressively builds the catalogue.

---

# 18. Restocking / Purchases

🟢 Restocking is a first-class transaction.

Capture:
- product;
- quantity;
- purchasing unit;
- purchase cost;
- timestamp;
- supplier if known;
- optional invoice/evidence later.

This transaction drives both inventory and price intelligence.

---

# 19. Product and Packaging Model

🟢 A product and its packaging levels must not automatically become unrelated products.

Example: **Indomie Chicken 70g**

Possible units:
- sachet;
- pack;
- carton.

The business may buy cartons and sell cartons, packs or sachets.

🔵 Recommended domain model:

Each product has a **base inventory unit**.

Other packaging units define conversion relationships.

Example:
> 1 carton = 40 sachets  
> 1 pack = 10 sachets

If retailer purchases 5 cartons, system automatically records 200 base units.

The retailer performs no manual conversion.

### Distinction
🟢 Different physical product sizes remain different product variants.

Example:
> Milo 400g ≠ Milo 800g.

But carton of 12 × Milo 400g is a packaging level of **Milo 400g**.

⚪ Future pharmaceutical model may extend:
> tablet → blister → pack → carton

with batch and expiry handling.

---

# 20. Product Identity vs Store Data

🟢 Shared/platform product identity must remain separate from store-specific commercial data.

### Shared/platform identity may include:
- canonical product identity;
- product variant;
- brand;
- category;
- barcode;
- package presentation;
- visual references;
- regional/packaging generation;
- recognition metadata.

### Store-specific data may include:
- local SKU;
- cost;
- selling price;
- stock;
- supplier;
- reorder level.

🔴 A shared recognition/catalogue update must never overwrite retailer-specific stock, price, cost or supplier information.

---

# 21. Recognition and Package Units

🟢 Recognition architecture must account for package/unit presentation where it materially changes the transaction.

Where possible, the scanner should distinguish the product and the package/unit presentation.

🟡 Some package-unit distinctions may remain ambiguous and require user confirmation.

---

# 22. Inventory Model

🟢 Use an **inventory ledger/event model** rather than relying only on one mutable quantity.

Examples:
```text
+40 Restock
-2 Sale
-1 Damaged
-5 Sale
-1 Missing
```

Current inventory derives from the events.

---

# 23. Inventory Reconciliation

🟢 System quantity and physical quantity must be reconcilable.

Example:
> Recorded: 23  
> Physical check: 21  
> Difference: -2

Simple adjustment reasons:
- unrecorded sale;
- damaged;
- expired;
- missing;
- personal use;
- return;
- correction;
- other.

🔵 Eventually introduce lightweight cycle counts rather than forcing full-store stock-taking.

---

# 24. Costing

🔵 Evaluate **moving weighted-average cost** for the initial FMCG product.

Example:
20 units remain at ₦300.  
40 new units arrive at ₦350.  
New average cost: ₦333.33/unit.

🟡 Costing method must be validated with an accountant before treating it as final accounting policy.

---

# 25. Business Intelligence

MVP dashboard should prioritize actionable information.

Potential outputs:
- tracked sales;
- tracked COGS;
- gross margin;
- expenses;
- withdrawals;
- retained margin;
- transactions;
- highest-moving products;
- stock running low;
- purchase-cost changes;
- staff activity where relevant.

The first dashboard should answer:
> **What happened in my business today?**

---

# 26. Price Intelligence

Price intelligence should have two layers.

## Layer 1 — Personal Restock Intelligence
🟢 Works with one retailer.

No network required.

## Layer 2 — Market Restock Intelligence
🟡 Requires sufficient external observations.

Potential sources:
- participating retailer purchases;
- manual market collection;
- wholesalers;
- supplier quotes;
- reliable external sources later.

Prefer showing observed range, typical price, trend, freshness, observation count, location and confidence rather than pretending there is always one absolute market price.

---

# 27. Price Network

🟡 Core hypothesis requiring validation.

With consent:
> Retailer purchase → anonymized observation → aggregation → market intelligence → returned value.

The system should not expose retailer identity, competitor-specific purchasing behaviour or private supplier relationships unnecessarily.

Network quality depends on:
> product overlap × location relevance × observation freshness

not simply total user count.

---

# 28. Price Cold Start

🔵 Begin with a hybrid approach.

Possible early sources:
1. retailer's own purchase history;
2. manually verified market observations;
3. pilot-retailer purchase observations;
4. selected wholesalers/suppliers.

Start with a limited set of high-frequency products rather than pretending to cover the whole market.

---

# 29. Expenses and Withdrawals

🟢 Separate at minimum:
- business expense;
- personal/owner withdrawal.

The goal is to make **money entering the business ≠ profit** visible.

---

# 30. Staff / Accountability

🔵 MVP may support lightweight staff attribution if technically feasible within the build window.

Capture who performed a sale, adjustment or expense entry.

Full HR/staff-management functionality is not required.

---

# 31. 24-Hour Value

A new retailer should not need a completed inventory to receive value.

By the end of Day 1 the product should ideally provide:
- tracked sales;
- transactions;
- tracked margin where cost data exists;
- expenses/withdrawals;
- products created through normal selling;
- basic inventory movement;
- initial personal price history where purchase data exists.

🟡 Whether this is sufficiently compelling must be tested rather than assumed.

---

# 32. Offline-First Requirement

🔴 Hard architectural constraint.

Core offline operations should include:
- sales;
- product lookup;
- catalogue;
- barcode/local product identification;
- restocking;
- inventory updates;
- expenses;
- essential business summary using local data.

When connectivity returns, local changes synchronize with backend.

Network-price intelligence and wider/global catalogue search may require connectivity.

---

# 33. Recognition Technical Boundary

🟢 Recognition is a modular subsystem and should progress in parallel with the core retail application.

Its internal implementation should remain abstracted from:
- the camera provider;
- the selected visual encoder;
- the inference runtime;
- OCR provider;
- similarity-search implementation.

🟢 The initial visual approach should use pretrained/mobile visual embeddings and local candidate retrieval rather than a classifier that must be retrained every time a retailer adds a product.

🟡 The final embedding model and inference runtime must be chosen through benchmarking on representative retail products and target Android hardware.

🟢 The recognition subsystem should support controlled local enrollment and synchronization of approved recognition profiles.

🔴 Recognition failure must never prevent ordinary sales or catalogue creation.

---

# 34. Recognition Data and Model Versioning

🟢 Recognition references and embeddings must be version-aware.

At minimum, embeddings should be associated with:
- embedding model identity;
- embedding model version;
- preprocessing version.

The system should retain sufficient approved source/reference assets to regenerate embeddings when recognition models change.

Retailer contributions may help improve recognition, but they must not automatically become platform-wide canonical truth.

---

# 35. Data Integrity

🔴 Financial and inventory operations require strong integrity.

Important requirements include:
- durable local transaction storage;
- immutable/auditable transaction history where practical;
- safe synchronization;
- conflict handling;
- protection against duplicated synchronization;
- backup;
- timestamps;
- user attribution;
- correction through controlled adjustments rather than silently rewriting history.

---

# 36. Privacy

🟢 Price contribution should be transparent and consent-based.

Users must understand what information is contributed, what is not contributed, how it becomes anonymous/aggregated and what value they receive.

🟡 Exact consent model requires design.

Recognition contributions intended for shared/platform use must also have appropriate provenance, permission and validation.

---

# 37. Product-Led Growth

🟡 Important strategy but not yet validated.

Do not begin with complicated referral economics.

The stronger potential growth loop is:
> more relevant participants → better market intelligence → stronger value → more participation.

This must be demonstrated, not assumed.

---

# 38. Beta Strategy

## Cohort 1 — Workflow validation
🔵 Approximately 10–15 closely observed retailers.

Primary questions:
- Can they sell through the product during busy periods?
- Do they continue using it?
- Do they record purchases?
- Does progressive catalogue creation work?
- Do the reports provide useful information?

## Cohort 2 — Network validation
🔵 Expand toward approximately 20–50 relevant businesses within the same market/category/geography.

Test whether overlapping purchase observations create sufficiently useful market intelligence.

---

# 39. Recognition Validation Strategy

🟢 Recognition should be tested independently from the main app before being treated as reliable.

Measure at minimum:
- top-1 SKU accuracy;
- top-3 recovery;
- false-accept rate;
- open-set false-accept rate;
- unknown detection quality;
- scan-to-stable-result latency;
- package-unit accuracy where applicable;
- staff correction rate;
- enrollment friction;
- storage per product;
- model size;
- memory use;
- battery/thermal behaviour;
- lower-end Android performance.

🔴 False confident matches are particularly dangerous because they can corrupt price, sales, inventory and analytics simultaneously.

---

# 40. Key Success Signals

🟢 More important than signups:
- sustained usage without founder intervention;
- high transaction coverage;
- rush-hour resilience;
- consistent purchase capture;
- decision impact;
- retailer reluctance to return to the previous manual workflow.

---

# 41. Failure Signals

🔴 Serious warning if:
- users regularly bypass the product during busy periods;
- restocking is not recorded;
- inventory records quickly become unreliable;
- product creation is too slow;
- price observations have insufficient product/location overlap;
- retailers refuse anonymous data contribution;
- market-price intelligence rarely changes decisions;
- merchants receive information but do not change behaviour;
- the core experience depends on reliable internet;
- scanner false positives create transaction errors;
- recognition R&D begins delaying the core retail MVP.

---

# 42. MVP Non-Goals

⚪ Do not build initially:
- consumer ecommerce marketplace;
- delivery logistics;
- full wholesaler marketplace;
- manufacturer marketplace;
- lending;
- automated credit scoring;
- full tax filing;
- complete ERP;
- complete accounting suite;
- nationwide real-time pricing;
- universal visual recognition of every physical product;
- complex referral economy;
- advanced AI agents;
- large multi-country architecture.

---

# 43. Longer-Term Direction

If the initial product succeeds, the data and network may enable:

Retailer intelligence  
↓  
Market-price intelligence  
↓  
Supplier / wholesale intelligence  
↓  
Procurement connectivity  
↓  
Financing intelligence  
↓  
Consumer product discovery  
↓  
Connected commerce ecosystem

⚪ Long-term ambition:
> Turn physical commerce into a more visible, connected and intelligent network.

---

# 44. Major Assumptions Still Requiring Validation

🟡

1. Price intelligence is strong enough to be the acquisition wedge.
2. Retailers care sufficiently about replacement-cost intelligence.
3. Retailers will consistently record purchases/restocking.
4. Retailers will consent to anonymous price contribution.
5. Sufficient identical-product overlap exists locally.
6. A concentrated local retailer network can produce useful early market signals.
7. Progressive inventory can replace traditional full onboarding.
8. Mobile checkout is fast enough for supermarket environments.
9. Visual recognition materially improves adoption or speed enough to justify its complexity.
10. Store-first retrieval can achieve acceptable recognition performance on lower-end Android hardware.
11. Retailers will pay for the eventual product.
12. FMCG is the optimal initial vertical.
13. Business-control functionality creates meaningful retention.

None should be treated as proven simply because the concept is logical.

---

# 45. Product Architecture at the Conceptual Level

The product currently consists of four conceptual layers:

## 1. Retail Control Engine
> Sales + Purchases + Inventory + Expenses + Business visibility

Purpose:
> **Immediate standalone value and retention**

## 2. Product Identity / Recognition Layer
> Barcode + visual retrieval + OCR/context + package-unit identification + Unknown fallback

Purpose:
> **Reduce product-entry friction without compromising transaction accuracy**

This layer must remain optional to the core transaction path: when recognition is uncertain, the retailer must still be able to complete the sale.

## 3. Price Intelligence Engine
> Personal purchase history + market observations

Purpose:
> **Decision support and differentiation**

## 4. Commerce Data Network
> Anonymous relevant observations → aggregation → intelligence

Purpose:
> **Compounding data advantage / potential moat**

The product must remain useful if Layers 2 and 4 are initially weak.

---

# 46. Parallel Build Strategy

🟢 Development should proceed in two coordinated tracks.

### Track A — Main Retail Application
- React Native + Expo foundation;
- local database;
- product/catalogue;
- package units;
- sales;
- restocking;
- inventory ledger;
- expenses;
- business intelligence;
- barcode integration;
- offline sync;
- price intelligence.

### Track B — Recognition R&D
- evaluation dataset;
- model/encoder benchmarks;
- recognition core;
- enrollment;
- local similarity search;
- confidence/Unknown handling;
- device inference;
- camera integration;
- OCR/context reranking;
- package-unit recognition;
- recognition-profile synchronization.

The tracks should converge through a stable recognition contract.

🟢 The Recognition R&D track must not delay validation of the core retail product.

---

# 47. Central Product Strategy

🟢 Current recommended strategy:

> **Lead with price. Deliver with control. Build the network through normal business activity.**

Do not force retailers to perform extra work merely to feed the network.

The best network data should emerge naturally from actions they already need to perform for themselves.

---

# 48. Build Constraint

🔴 Initial prototype target remains aggressive.

The MVP should therefore prioritize the shortest reliable path to testing the major assumptions.

Functionality, transaction integrity and workflow correctness outrank visual polish.

Experimental recognition work should be isolated behind stable interfaces so it cannot destabilize core transaction development.

---

# 49. Product Inception Decision

The initial product is **not** another generic inventory-management application.

It is also **not yet** a mature nationwide real-time pricing network.

And the scanner is **not** an AI expected to recognize every product automatically.

The initial product is:

> **An Android-first, offline-first retail intelligence tool that helps retailers understand their business, track changing restock costs and progressively digitize their operations through normal daily activity—while creating the foundation for an anonymous market-price intelligence network and a locally intelligent product-identification system.**

This Product Inception is the product-level source of truth.

Detailed implementation decisions belong in the PRD, domain/data model, technical architecture, offline/sync architecture, recognition architecture and engineering build plan.
