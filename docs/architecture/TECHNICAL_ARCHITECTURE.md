# TECHNICAL_ARCHITECTURE — Retail Commerce Intelligence

**Version:** 1.0  
**Status:** Architecture source of truth  
**Primary platform:** Android  
**Client:** React Native + Expo Development Build + TypeScript  
**Architecture style:** Local-first / offline-first  
**Backend:** Supabase (Postgres + Auth + Storage + Edge Functions)

---

# 1. Purpose

This document defines how the MVP should be engineered.

It turns the Product Inception, PRD and Domain/Data Model into an implementable system architecture while preserving the following constraints:

- Android-first;
- offline-first;
- sales must not depend on internet;
- transaction integrity is more important than visual polish;
- the product catalogue can grow progressively;
- product/package-unit relationships must remain correct;
- visual recognition is experimental and must not block the core retail application;
- the system should be maintainable by future human engineers;
- the architecture should remain understandable to a solo founder working primarily through the active AI coding agent;
- infrastructure cost and operational complexity should remain low during MVP/beta.

This document defines architecture-level choices.

Detailed synchronization algorithms belong in `OFFLINE_SYNC.md`.

Detailed scanner/recognition implementation belongs in `SCANNING_ARCHITECTURE.md`.

---

# 2. Architecture Decision Summary

## Locked for MVP

🟢 **Language:** TypeScript

🟢 **Mobile framework:** React Native

🟢 **Application platform/tooling:** Expo Development Build

🟢 **Primary operating system:** Android

🟢 **Navigation:** Expo Router

🟢 **Local durable database:** Expo SQLite

🟢 **Local database journal mode:** WAL where supported/configured

🟢 **Backend database:** PostgreSQL through Supabase

🟢 **Authentication platform:** Supabase Auth

🟢 **Remote file/object storage:** Supabase Storage

🟢 **Server-side application functions:** Supabase Edge Functions where custom server logic is required

🟢 **Repository strategy:** one Git repository using npm workspaces

🟢 **Core data architecture:** local database first; cloud synchronization second

🟢 **Business-state source on device:** SQLite, not React component/global memory

🟢 **Validation at boundaries:** Zod schemas

🟢 **Unit/integration testing:** Jest / jest-expo + React Native Testing Library where appropriate

🟢 **Critical end-to-end Android flows:** Maestro

🟢 **Secrets on device:** platform-secure storage via Expo SecureStore or an architecture-approved equivalent

🟢 **Recognition:** separate modular subsystem behind interfaces/contracts

## Explicitly not selected for MVP

🔴 Firebase/Firestore as the primary business database

🔴 Browser/PWA as the primary retail client

🔴 Redux or another global store as the durable business-data source

🔴 Direct cloud-first CRUD from UI screens

🔴 Dependence on continuous Realtime subscriptions for correctness

🔴 A large microservice architecture

🔴 Kubernetes/container orchestration

🔴 A dedicated vector database on the phone

🔴 Universal visual-product classification

🔴 A second disconnected repository for recognition research

---

# 3. Why This Stack

## 3.1 React Native + Expo Development Build

The MVP needs:

- Android-first native application behavior;
- fast iteration on a physical phone;
- camera/barcode access;
- SQLite;
- local filesystem;
- secure storage;
- future native ML modules;
- eventual iOS possibility;
- some reusable TypeScript/domain code for future web clients.

Expo Development Build gives us Expo's development workflow while allowing native dependencies when recognition requires them.

Expo Go may be useful for trivial early UI experiments, but it is **not** the permanent runtime assumption for this project.

---

# 4. High-Level System Architecture

```text
┌──────────────────────────────────────────────┐
│              ANDROID MOBILE APP              │
│                                              │
│  Expo Router / React Native UI               │
│                    │                         │
│            Application / Use Cases           │
│                    │                         │
│        Domain Rules / Repositories           │
│          ┌─────────┴─────────┐               │
│          │                   │               │
│      Expo SQLite       Recognition Port      │
│          │                   │               │
│      Local Files        Recognition Core     │
│          │                   │               │
│       Outbox              Native ML          │
└──────────┼───────────────────┼───────────────┘
           │                   │
           │ HTTPS sync        │ optional
           ▼                   │ catalog/model sync
┌──────────────────────────────────────────────┐
│                   SUPABASE                   │
│                                              │
│ Auth                                         │
│ Postgres + RLS                               │
│ Storage                                      │
│ Edge Functions                              │
│                                              │
│  ┌───────────────┐   ┌───────────────────┐  │
│  │ Store/private │   │ Shared/platform   │  │
│  │ business data │   │ catalog/signals   │  │
│  └───────────────┘   └───────────────────┘  │
└──────────────────────────────────────────────┘
```

---

# 5. Fundamental Architecture Rule: Local Write First

For core retailer operations, the mobile application's first durable write target is the local database.

Examples:

- sale;
- purchase/restock;
- inventory adjustment;
- expense;
- owner withdrawal;
- product creation.

Normal flow:

```text
User action
    ↓
Validate
    ↓
Begin local SQLite transaction
    ↓
Write business transaction
    ↓
Write dependent inventory/financial records
    ↓
Write sync/outbox record
    ↓
Commit local transaction
    ↓
Report success to user
    ↓
Sync when connectivity permits
```

The network is not in the critical path of completing a normal sale.

---

# 6. Transaction Boundary

Business operations that logically belong together must be committed atomically.

Example: completing a sale.

Within one local database transaction:

1. create/update `Sale`;
2. create `SaleItem` records;
3. create `Payment` records;
4. snapshot required names/prices/package conversions/costs;
5. create inventory events;
6. update/rebuild inventory balance projection;
7. create receivable if required;
8. create sync/outbox entries;
9. commit.

If any required write fails:

> the sale is not reported as completed.

This prevents states such as:

> sale exists but stock did not decrease.

---

# 7. Repository Structure

Use one repository.

Initial structure:

```text
/
├── AGENTS.md
├── package.json
├── package-lock.json
│
├── apps/
│   ├── mobile/
│   └── recognition-lab/          # created when Track B begins
│
├── packages/
│   ├── domain/
│   ├── contracts/
│   └── recognition-core/
│
├── supabase/
│   ├── migrations/
│   ├── functions/
│   └── tests/
│
├── docs/
│   ├── product/
│   ├── architecture/
│   ├── recognition/
│   ├── engineering/
│   └── decisions/
│
└── tools/
    └── scripts/
```

Use **npm workspaces** initially.

Reason:

- npm ships with Node;
- fewer package-manager concepts for the founder to manage;
- Expo supports workspace-based monorepos;
- recognition lab and mobile app can share contracts/domain code;
- one repository remains the project's single source of truth.

Do not create packages simply for aesthetic architecture.

A package should exist because code genuinely needs to be shared or isolated.

---

# 8. Mobile Application Structure

Inside `apps/mobile`:

```text
apps/mobile/
├── app/                         # Expo Router routes
├── src/
│   ├── features/
│   │   ├── auth/
│   │   ├── store/
│   │   ├── catalog/
│   │   ├── sales/
│   │   ├── purchases/
│   │   ├── inventory/
│   │   ├── finance/
│   │   ├── price-intelligence/
│   │   ├── scanning/
│   │   └── sync/
│   │
│   ├── db/
│   │   ├── migrations/
│   │   ├── repositories/
│   │   ├── queries/
│   │   └── projections/
│   │
│   ├── services/
│   ├── components/
│   ├── hooks/
│   ├── theme/
│   └── infrastructure/
│
├── assets/
├── app.config.ts
└── eas.json
```

Principle:

> Route files should remain thin.

Business logic should not live directly inside Expo Router screens.

---

# 9. Layering

Use pragmatic layers, not enterprise ceremony.

```text
UI / Screens
     ↓
Application Use Cases
     ↓
Domain Rules
     ↓
Ports / Repository Interfaces
     ↓
Infrastructure
(SQLite / Supabase / Files / Camera / ML)
```

Examples of application use cases:

- `CompleteSale`
- `RecordPurchase`
- `CreateTemporaryProduct`
- `ReconcileInventory`
- `RecordExpense`
- `EnrollRecognitionProfile`

the active AI coding agent should prefer small explicit use cases for important business operations rather than letting screens directly perform multiple unrelated database writes.

---

# 10. Shared Packages

## 10.1 `packages/domain`

Contains pure TypeScript business concepts/rules that do not depend on React Native or Supabase.

Examples:

- money calculations;
- package conversion;
- weighted-average calculation;
- inventory delta rules;
- price-comparison calculations;
- domain enums;
- domain value types.

It should be highly unit-testable.

## 10.2 `packages/contracts`

Contains Zod schemas and TypeScript types used at system boundaries.

Examples:

- sync payloads;
- remote DTOs;
- catalog lookup result;
- market-price signal;
- recognition result contract.

Do not expose raw database row structures as long-term API contracts.

## 10.3 `packages/recognition-core`

Contains platform-neutral recognition contracts and pure ranking/domain logic where possible.

It must not require React UI.

Native inference adapters live outside the pure core.

---

# 11. Local Database

## Decision

Use:

> **Expo SQLite**

as the mobile business-data database.

Reasons:

- persisted across app restarts;
- relational model matches this product;
- transactions;
- indexes;
- local querying;
- strong fit for sales/inventory/purchase records;
- supported directly by Expo.

The database should enable:

```sql
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
```

where appropriate and verified for the deployed platform.

---

# 12. Local Database Access Strategy

For MVP v1:

> Use Expo SQLite through an explicit database/repository layer.

Do not allow SQL calls throughout components.

Do not make the ORM itself part of the domain model.

## ORM decision

Do **not** lock Drizzle ORM into the initial architecture.

Current Drizzle support for Expo SQLite is promising and can be reconsidered during the active AI coding agent intake, but the architecture should remain valid without it.

Default starting approach:

- explicit SQL migrations;
- typed repository functions;
- parameterized statements;
- TypeScript domain types;
- Zod validation at external/boundary inputs.

If the active AI coding agent demonstrates that the current stable Drizzle release materially improves migrations/type safety without introducing unacceptable ecosystem risk, it may propose adoption before schema implementation.

That proposal requires an architecture decision entry.

---

# 13. Local Database Migrations

All schema changes must be migration-based.

Never:

> delete the local database during a normal application upgrade just because the schema changed.

Migrations should:

- be ordered;
- be committed to Git;
- be deterministic;
- run before the application exposes normal screens;
- fail safely;
- be tested against representative previous schemas.

The app should maintain a schema version.

Database migration testing becomes mandatory once beta users hold real data.

---

# 14. Local Database Encryption

Retail sales, prices, suppliers and financial information are commercially sensitive.

Architecture requirement:

🟢 Before real external beta data is stored, enable and test local database encryption at rest using an Expo-SQLite-supported encryption approach such as SQLCipher.

Key material must not be hard-coded in application source.

Device secrets should be stored using platform-secure storage.

Development builds may initially use an unencrypted disposable development database if necessary to simplify early scaffolding, but real pilot data must not rely on that configuration.

---

# 15. Secure Local Key/Token Storage

Use Expo SecureStore or an architecture-approved platform-secure equivalent for:

- authentication/session secrets;
- local encryption keys;
- other small secrets.

Do not use AsyncStorage/plain SQLite columns for long-lived secrets.

Do not put privileged server keys in the mobile application.

---

# 16. UI State Strategy

Do not duplicate the SQLite business database inside Redux or another large global state tree.

Use:

- SQLite for durable domain/business state;
- React component state for local UI state;
- small Context providers for session/store-selection concerns where appropriate;
- a lightweight store only if a concrete cross-screen UI-state need appears.

Do not introduce Redux by default.

If remote query caching becomes necessary for online-only resources, the active AI coding agent may propose TanStack Query for that boundary.

It must not become a second business-data source of truth.

---

# 17. Navigation

Use:

> **Expo Router**

Reasons:

- official Expo routing path;
- file-based navigation;
- React Native and future web support;
- deep-link support;
- conventional Expo project organization.

Navigation files should not contain domain/business logic.

---

# 18. Forms and Validation

Recommended:

- React Hook Form for non-trivial forms;
- Zod for validation schemas and boundary parsing.

Use simpler controlled inputs where a form is trivial.

Do not create generic form abstractions before repeated patterns exist.

Validation should occur:

1. close to user input for UX;
2. again at application/domain boundaries where correctness matters;
3. again server-side for remote writes.

Client validation is not a security boundary.

---

# 19. Styling / Design System

For MVP:

- React Native `StyleSheet`;
- centralized spacing/typography/color tokens;
- reusable core components;
- accessibility-conscious touch targets;
- no large UI framework unless a demonstrated need appears.

Reason:

The product prioritizes workflow speed and maintainability over visual-system complexity.

A UI framework may be introduced later if it clearly reduces rather than increases complexity.

---

# 20. Backend Platform

Use:

> **Supabase**

for MVP backend infrastructure.

Supabase responsibilities:

- PostgreSQL;
- authentication;
- row-level security;
- object storage;
- Edge Functions;
- remote migrations;
- aggregated/shared data.

The backend should remain conceptually replaceable through adapters/contracts, but the MVP should not waste time building provider-independence for every Supabase feature.

---

# 21. Backend Database

Use PostgreSQL.

The server schema should reflect the logical business meaning in `DOMAIN_DATA_MODEL.md`.

The physical mobile SQLite and server PostgreSQL schemas do not need to be byte-for-byte identical.

They must preserve compatible:

- IDs;
- domain meanings;
- transaction relationships;
- sync semantics;
- ownership;
- versioning.

Server schema changes are committed as SQL migrations under:

```text
supabase/migrations/
```

Do not make unreproducible production schema edits only through the dashboard.

---

# 22. Supabase Data Security

All exposed private/store tables must use:

- appropriate PostgreSQL grants;
- Row Level Security;
- store-membership-aware policies.

A user's store membership is the fundamental authorization boundary.

Example intent:

> A member of Store A must not be able to query Store B sales merely by guessing an ID.

RLS policies must be tested.

Service-role credentials must never be shipped inside the mobile application.

---

# 23. Authentication

Use:

> **Supabase Auth**

as the authentication system.

The precise customer-facing sign-in mechanism remains a product/onboarding decision.

Possible beta mechanisms include:

- email/password;
- assisted/invite-based account setup;
- another Supabase-supported method if testing shows it better fits retailers.

Do not build custom password authentication.

Offline behavior:

- a previously authenticated authorized device may continue performing approved local operations offline;
- synchronization and remote authorization refresh require connectivity;
- the application must not require an online token refresh to complete every local sale.

Detailed session-expiry behavior belongs in the offline/security implementation.

---

# 24. Server-Side Logic

Use Supabase Edge Functions for operations that require trusted server logic.

Examples:

- sync batch ingestion;
- idempotency enforcement;
- sync pull/change feed;
- catalog contribution processing;
- price-observation sanitization;
- price aggregation triggers/jobs where appropriate;
- signed/controlled recognition catalog delivery;
- administrative workflows.

Do not create an Edge Function for every simple read.

Prefer SQL/RLS/read models where they are sufficient.

---

# 25. Remote API Boundary

The mobile application must not scatter Supabase calls throughout features.

Use a remote service layer.

Conceptually:

```text
Application
   ↓
RemoteGateway / SyncGateway
   ↓
Supabase SDK / HTTPS
```

This keeps:

- authentication;
- retry handling;
- DTO validation;
- error translation;
- telemetry

away from screen components.

---

# 26. Remote Business Write Rule

Core business transactions are not created by:

```text
Screen → insert directly into remote sales table
```

Instead:

```text
Screen
  ↓
Local use case
  ↓
SQLite transaction
  ↓
Outbox
  ↓
Sync service
  ↓
Trusted backend sync endpoint
  ↓
Postgres
```

This is foundational to offline correctness.

---

# 27. Sync Architecture Boundary

The final synchronization protocol is defined in `OFFLINE_SYNC.md`.

The architecture assumes:

- client-generated globally unique IDs;
- local outbox/change tracking;
- idempotent server application;
- retry-safe writes;
- soft-delete/tombstone strategy where needed;
- server-visible change/version information;
- incremental pull;
- per-store authorization;
- observable sync state.

No feature may invent its own independent synchronization behavior.

---

# 28. Managed Sync Engines

PowerSync and similar managed/local-first synchronization engines are **not selected as an initial hard dependency**.

Reason:

- they can substantially reduce sync engineering work;
- but they introduce another major infrastructure dependency and pricing/operational decision;
- our domain contains transaction/audit rules that still require controlled backend write logic;
- we should understand the required sync semantics before outsourcing them.

However:

🟡 If the first-party sync spike becomes a schedule or reliability risk, the active AI coding agent should explicitly evaluate PowerSync as a fallback rather than continuing an unsafe custom implementation.

Changing to a managed sync engine requires an architecture decision entry.

---

# 29. ID Strategy

All offline-creatable business entities require IDs before server contact.

Use:

> cryptographically strong client-generated UUIDs.

Default candidate:

> UUIDv4 generated using an Expo/platform cryptographic API.

Do not use auto-increment integer IDs as cross-device business identifiers.

Local row integers may exist internally for performance if useful, but synchronized domain IDs remain globally unique.

---

# 30. Time Strategy

Every important transaction should preserve:

- `occurredAt` — when the business event happened;
- `createdAt` — when this record was created locally/server-side as appropriate;
- server receive/sync timestamp where relevant.

Store timestamps in an unambiguous machine format, preferably UTC.

Display them in the store's configured timezone.

Do not use local device time alone as proof of trusted ordering across devices.

The synchronization architecture will define server ordering/versioning.

---

# 31. Money Representation

Never use binary floating-point as the authoritative representation of money.

For Nigerian naira:

- store monetary values as integer minor units where practical;
- e.g. ₦1,250.50 → 125050 kobo.

If the initial UI only supports whole naira, the data model should still avoid floating-point financial math.

Use explicit currency codes.

Domain helpers should own money arithmetic and formatting.

---

# 32. Quantity Representation

Base inventory quantities may need fractional support in future categories.

For the initial FMCG implementation:

- package conversions should be represented with a numeric/decimal-safe strategy;
- do not assume every future base unit is always a whole integer.

If MVP explicitly limits the initial vertical to discrete units, the database can optimize for integers but must document that constraint before doing so.

Do not use uncontrolled JavaScript floating-point math for important quantity conversions.

---

# 33. Costing Calculations

Weighted-average and transaction-cost calculations belong in pure domain functions with tests.

Do not calculate financial cost independently in multiple screens.

Required behavior:

```text
Purchase input
    ↓
Domain costing function
    ↓
New cost state
    ↓
Database transaction persists result
```

Completed sale items snapshot the applicable cost basis.

---

# 34. Remote Object / Image Storage

Use:

> **Supabase Storage**

for synced remote images/files.

Examples:

- approved product images;
- recognition reference images;
- thumbnails;
- optional future purchase evidence.

Use private buckets by default for store-private assets.

Access should be protected by appropriate storage policies or trusted server flows.

Do not make private business images globally public for convenience.

---

# 35. Local Image/File Storage

Use Expo FileSystem or current architecture-approved Expo filesystem APIs for local media.

SQLite stores metadata/references, not large original image blobs.

Conceptually:

```text
SQLite
  └── mediaAsset.localUri

Filesystem
  └── compressed/reference asset
```

Recognition processing may derive:

- crop;
- resized image;
- thumbnail;
- embedding;
- OCR clues.

File lifecycle rules belong in the scanning architecture.

---

# 36. Camera Architecture

The rest of the application must depend on a camera abstraction, not directly on one vendor/library.

Initial camera implementation candidate:

> Expo Camera

It already supports camera preview and barcode detection.

If recognition benchmarking demonstrates that continuous high-performance frame processing requires another camera implementation, the scanner module may substitute an adapter without rewriting sales/catalog features.

---

# 37. Recognition Architecture Boundary

The mobile application communicates with recognition through a stable interface.

Conceptually:

```ts
interface RecognitionService {
  recognize(input: RecognitionInput): Promise<RecognitionResult>;
  enroll(input: EnrollmentInput): Promise<EnrollmentResult>;
}
```

A result can contain:

- product candidate;
- package-unit candidate;
- confidence;
- alternatives;
- evidence/method;
- `UNKNOWN`.

The UI/business layer must not depend directly on:

- TFLite;
- ONNX;
- a particular model;
- a particular vector-search implementation.

Detailed rules belong in `SCANNING_ARCHITECTURE.md`.

---

# 38. Recognition Local Search

Initial architecture:

- relevant recognition profiles cached locally;
- exact similarity search first;
- no dedicated ANN/vector infrastructure until benchmarks justify it;
- store-active product set searched before broader catalogs.

Expo SQLite currently supports optional bundled extensions such as sqlite-vec, but this is **not** required for the first implementation.

Benchmark first.

---

# 39. Recognition Lab

`apps/recognition-lab` is a separately runnable experimental app/workbench within the same repository.

Its purposes:

- benchmark camera paths;
- benchmark inference runtimes;
- benchmark visual encoders;
- test enrollment;
- measure latency;
- test unknown detection;
- test package-unit recognition;
- collect controlled experimental outputs.

It may share:

- domain types;
- recognition contracts;
- recognition core.

It must not directly modify production business logic merely to make an experiment easier.

---

# 40. Price Intelligence Architecture

Personal price intelligence is calculated from store purchase history in the local database.

Therefore it works offline.

Market price intelligence is server-derived from eligible observations.

Flow:

```text
Store Purchase
     ↓
Private purchase record
     ↓
Consent / eligibility
     ↓
Sanitized PriceObservation
     ↓
Sync
     ↓
Server validation / aggregation
     ↓
MarketPriceSignal
     ↓
Relevant devices
```

Do not expose raw competitor purchase records to other retailers.

---

# 41. Analytics Architecture

Do not make a third-party analytics SDK a prerequisite for MVP correctness.

Create an internal analytics/event interface.

Example:

```ts
interface Analytics {
  track(event: AnalyticsEvent): void;
}
```

Initially, important product-validation events may be:

- recorded locally;
- synchronized to a controlled backend analytics/event table;
- analyzed later.

A dedicated analytics provider may be added if it materially improves beta analysis.

Business transactions themselves remain the authoritative source for operational metrics.

---

# 42. Logging and Diagnostics

Use structured application logging.

Levels:

- debug;
- info;
- warn;
- error.

Production logs must not casually include:

- auth tokens;
- full private transaction payloads;
- passwords;
- encryption keys;
- sensitive supplier/customer data.

Recognition debugging must avoid retaining unnecessary camera imagery.

A remote crash/error service may be introduced before external beta, but must be configured to avoid sensitive-data leakage.

---

# 43. Error Model

Infrastructure errors must be translated into meaningful application errors.

Do not show:

> SQLITE_CONSTRAINT_FOREIGNKEY_787

to a normal retailer.

Application layer should receive typed categories such as:

- validation error;
- insufficient stock;
- unavailable resource;
- permission denied;
- sync pending;
- network unavailable;
- database failure;
- recognition unknown.

Technical detail remains available in diagnostic logs.

---

# 44. Security Boundaries

Trust boundaries:

```text
User
 ↓
Mobile application
 ↓
Local encrypted storage
 ↓
Authenticated network
 ↓
Supabase gateway / Edge Function
 ↓
Postgres / Storage
```

Important rules:

1. Client input is never trusted merely because it came from our app.
2. Store membership must be checked server-side.
3. RLS protects exposed database access.
4. Service-role credentials stay server-side.
5. Sensitive local secrets use SecureStore.
6. Private object storage uses access policies.
7. Sync writes are idempotent and authorized.
8. Shared/aggregated outputs must not leak raw private store data.

---

# 45. Backend Row-Level Security Model

At minimum, private rows should be scoped through `storeId`.

Authorization concept:

```text
authenticated user
      ↓
store_members
      ↓
allowed store IDs
      ↓
RLS policies
```

Platform/admin/shared tables receive separate policies.

Every new exposed table must answer:

> Who may SELECT?
> Who may INSERT?
> Who may UPDATE?
> Who may DELETE?

RLS tests belong in the repository.

---

# 46. Server Migrations

All backend schema changes are version-controlled.

Process:

```text
Edit migration
   ↓
Review
   ↓
Apply to development backend
   ↓
Run DB/RLS tests
   ↓
Apply to beta/production environment
```

Do not rely on dashboard-only schema changes that cannot be reproduced.

---

# 47. Development Environment Strategy

The founder should not be forced to maintain a complicated local backend stack simply to preview the mobile app.

Default MVP workflow:

- local mobile app;
- local SQLite;
- hosted Supabase development project;
- backend migration/function files in Git.

A fully local Supabase/Docker environment is optional for engineering/CI use and should not be a prerequisite for every founder preview session.

This minimizes the type of environment friction previously experienced with development tooling.

---

# 48. Environment Separation

Use configuration profiles:

- `development`;
- `preview/beta`;
- `production`.

At minimum, do not let development experimentation accidentally write into real retailer production data.

Environment variables should be managed through:

- local `.env` files excluded from Git for local development where appropriate;
- EAS environment/secrets;
- Supabase project secrets for server-side secrets.

Only intentionally public client configuration may use `EXPO_PUBLIC_*`.

---

# 49. Expo Build Profiles

Use EAS build profiles conceptually:

## development

- development client;
- physical-device debugging;
- native module development.

## preview

- installable Android build for internal/beta testing;
- production-like configuration.

## production

- release build;
- production backend configuration.

Exact `eas.json` is created by the active AI coding agent during scaffold work.

---

# 50. OTA Updates

EAS Update may be used for compatible JavaScript/assets updates.

Important rule:

An OTA update must not assume a native dependency or database schema that the installed binary cannot support.

Native module/config changes require an appropriate new native build.

Database migrations must be backward/forward considered when OTA updates are used.

---

# 51. Future Web / PWA

The architecture should allow reuse of:

- TypeScript domain logic;
- contracts;
- validation schemas;
- backend APIs;
- product concepts.

Do **not** assume the future web/PWA application will reuse the native local persistence implementation unchanged.

At the time of this architecture decision, Expo SQLite's web support is still described as alpha.

A future web client may use:

- IndexedDB;
- browser-compatible SQLite/WASM;
- another local persistence adapter;
- online-first access for selected desktop workflows.

That decision belongs to the future web architecture.

---

# 52. Testing Strategy

Testing is layered.

## Domain unit tests

Required for:

- package conversion;
- money calculations;
- cost calculations;
- inventory delta logic;
- price calculations;
- confidence/ranking logic where pure.

These should be fast and numerous.

## Repository/database integration tests

Required for:

- migrations;
- sale transaction atomicity;
- purchase transaction atomicity;
- inventory events;
- idempotency support;
- projections/balances.

## Component tests

Use where they provide value for:

- forms;
- important validation behavior;
- reusable transactional UI components.

## End-to-end tests

Use Maestro for critical Android user journeys.

First critical flows:

1. create/open store;
2. create product;
3. record restock;
4. sell product offline;
5. verify inventory decreased;
6. record expense;
7. restart app and verify data survived;
8. reconnect and verify safe sync.

Recognition gets its own test plan.

---

# 53. Quality Gates

Before a milestone is marked complete, the active AI coding agent should run the relevant combination of:

- TypeScript typecheck;
- lint;
- unit tests;
- database/integration tests;
- critical E2E flows where applicable;
- manual real-device check for native/camera/offline behavior.

No milestone should be declared complete solely because:

> "the code compiled."

---

# 54. Code Quality Rules

## TypeScript

- use strict mode;
- avoid `any` unless explicitly justified;
- validate external data;
- prefer explicit domain types.

## Functions/modules

- keep business operations readable;
- avoid giant service classes;
- prefer composition;
- separate I/O from pure calculations where practical.

## Dependencies

Before adding a significant dependency, the active AI coding agent should answer:

- What problem does it solve?
- Can existing stack solve it?
- Is it maintained?
- Does it support current Expo/React Native?
- Does it add native rebuild requirements?
- What is its license?
- What is the exit cost?

Native dependencies deserve extra scrutiny.

---

# 55. Performance Principles

Optimize first for actual retailer bottlenecks.

Critical paths:

- app startup;
- local product search;
- scanner response;
- sale completion;
- restock completion;
- inventory lookup.

Do not prematurely optimize dashboard/report queries before measurements exist.

Use indexes for actual query patterns.

Do not load entire large tables into JavaScript memory unnecessarily.

---

# 56. Offline UX Requirements

The application should make network state understandable without being intrusive.

Examples:

- local operation succeeds immediately;
- small sync indicator;
- pending sync count when useful;
- visible actionable sync error if intervention is required.

Do not present every offline action as an error.

Offline is a normal operating mode.

---

# 57. Multi-Device Principle

Architecture must not assume there will only ever be one phone.

However, full conflict behavior is defined in `OFFLINE_SYNC.md`.

Design implications now:

- globally unique IDs;
- device IDs;
- user attribution;
- immutable/event-oriented transaction records;
- version metadata for mutable records;
- server ordering independent of device clock.

---

# 58. Data Backup / Recovery

Cloud synchronization acts as remote recovery for synchronized business data.

Requirements:

- unsynced local work remains visibly pending;
- server database backups are enabled according to environment/plan capability;
- object/file recovery is planned separately from database backups;
- device restore must not duplicate previously synchronized transactions.

A real beta release must test:

> lose/reinstall device → sign in → recover synchronized store data.

---

# 59. Initial Backend Services

Avoid excessive services.

MVP backend should conceptually contain:

```text
Auth
Database
Storage
Sync API
Catalog API/read path
Price intelligence service
Recognition catalog/profile delivery
```

Some of these can be Postgres functions/views rather than separate deployed services.

Do not create microservices simply because they have different names.

---

# 60. Initial Edge Functions

Likely initial functions/endpoints:

- `sync-push`
- `sync-pull`

Potential later functions:

- `catalog-contribute`
- `price-observation-submit`
- `price-signal-refresh`
- `recognition-profile-publish`

The exact number should remain small.

---

# 61. Server Background Work

Do not put long-running ML/model work inside request/response Edge Functions.

Longer recognition training/benchmarking is an R&D/build process, not a normal server request.

Future background processing may use:

- scheduled jobs;
- queues/workers;
- external compute;

only when justified.

---

# 62. Dependency Direction

The desired dependency flow is:

```text
UI
 ↓
Application
 ↓
Domain
 ↑
Infrastructure adapters
```

Domain code must not import React Native UI or Supabase SDKs.

Recognition implementation must not leak model-runtime types into sales/inventory domain logic.

---

# 63. Architecture Ports

Use explicit interfaces where replacing an infrastructure component is plausible and valuable.

Examples:

- `ProductRepository`
- `SaleRepository`
- `PurchaseRepository`
- `InventoryRepository`
- `SyncGateway`
- `MediaStorage`
- `RecognitionService`
- `CameraProvider`
- `Analytics`

Do not create interfaces for every trivial helper.

---

# 64. Key Application Services / Use Cases

Expected important operations include:

- `CreateStore`
- `CreateStoreProduct`
- `ResolveProductIdentity`
- `CompleteSale`
- `VoidSale`
- `RecordPurchase`
- `ReconcileInventory`
- `RecordExpense`
- `RecordOwnerWithdrawal`
- `GetBusinessSummary`
- `GetPersonalRestockHistory`
- `EnrollProductRecognition`
- `SyncPendingChanges`

Naming may evolve, but business operations should remain explicit.

---

# 65. Architecture of a Sale

```text
Sale Screen
   ↓
CompleteSale
   ↓
validate request
   ↓
begin SQLite transaction
   ↓
load StoreProduct + PackageUnit
   ↓
calculate base quantity
   ↓
resolve current cost snapshot
   ↓
insert Sale
   ↓
insert SaleItems
   ↓
insert Payment/Receivable
   ↓
insert InventoryEvents
   ↓
update InventoryBalance projection
   ↓
enqueue sync records
   ↓
commit
   ↓
return local success
```

No network call is required before returning success.

---

# 66. Architecture of a Restock

```text
Restock Screen
   ↓
RecordPurchase
   ↓
validate
   ↓
begin SQLite transaction
   ↓
resolve package conversion
   ↓
calculate base quantity
   ↓
insert Purchase/PurchaseItem
   ↓
update cost state
   ↓
insert InventoryEvent
   ↓
update InventoryBalance
   ↓
record personal PriceObservation
   ↓
enqueue eligible sync
   ↓
commit
```

---

# 67. Architecture of Product Scan

```text
Unified Scanner
   ↓
RecognitionService
   ↓
barcode / visual / OCR / context
   ↓
Strong candidate?
   ├─ yes → product/package confirmation
   └─ no
       ↓
   Ambiguous candidates?
       ├─ yes → user selects
       └─ no → UNKNOWN
                 ↓
          search / quick product
                 ↓
               sale
```

Scanner failure does not alter transaction integrity.

---

# 68. Price Signal Read Path

```text
Local Store History
      ↓
Personal Restock Intelligence
      ↓
available offline

Server Aggregated Signals
      ↓
sync/cache locally
      ↓
Market Restock Intelligence
```

The app should cache useful market signals for offline viewing when practical, but should always display freshness.

---

# 69. Architecture Change Process

the active AI coding agent must not silently change decisions in this file.

If implementation reveals a better approach:

1. identify the conflict;
2. explain why current architecture fails or is unnecessarily costly;
3. propose alternative;
4. describe migration/impact;
5. obtain approval;
6. update `DECISION_LOG.md`;
7. update this architecture if decision changes;
8. implement.

---

# 70. Decisions Intentionally Deferred

These are not forgotten.

They are delegated to later documents/spikes.

## `OFFLINE_SYNC.md`

- push/pull protocol;
- outbox schema;
- change feed;
- server sequence;
- conflict policies;
- tombstones;
- retry/backoff;
- multi-device merges;
- restore/resync.

## `SCANNING_ARCHITECTURE.md`

- camera adapter details;
- preprocessing;
- model candidates;
- inference runtime;
- embedding storage;
- thresholding;
- enrollment;
- OCR;
- local ranking;
- model/catalog versions.

## `RECOGNITION_TEST_PLAN.md`

- evaluation dataset;
- device matrix;
- metrics;
- go/no-go thresholds.

## `BUILD_PLAN.md`

- actual milestone sequence;
- the active AI coding agent task boundaries;
- parallel Track A/Track B schedule.

---

# 71. Architecture Risks

## Risk 1 — Custom synchronization complexity

Severity: High.

Mitigation:
- event-oriented domain;
- append-first transactions;
- idempotency;
- dedicated sync specification;
- limited initial sync feature set;
- consider managed sync fallback if spike fails.

## Risk 2 — Local database migration damage

Severity: High once pilots contain real records.

Mitigation:
- migration tests;
- backups/sync;
- never reset production DB casually;
- staged beta updates.

## Risk 3 — Visual recognition dependency creep

Severity: High.

Mitigation:
- separate recognition track;
- stable interface;
- UNKNOWN fallback;
- no blocking dependency.

## Risk 4 — Schema over-complexity before validation

Severity: Medium.

Mitigation:
- implement only required MVP entities;
- preserve logical model without necessarily materializing every future table immediately.

## Risk 5 — Supabase/vendor coupling

Severity: Medium.

Mitigation:
- domain stays provider-independent;
- remote access behind gateways;
- Postgres remains portable;
- avoid proprietary logic when normal SQL/TypeScript suffices.

## Risk 6 — Founder/tooling friction

Severity: High for development velocity.

Mitigation:
- physical Android device as primary preview;
- Expo Development Build;
- hosted dev backend;
- npm rather than additional package-manager complexity;
- documented commands;
- the active AI coding agent owns repetitive environment setup;
- avoid unnecessary native dependencies.

---

# 72. Architecture Acceptance Criteria

The technical architecture is being implemented correctly when:

1. A core sale can complete with airplane mode enabled.
2. Completed local sale survives process/app restart.
3. Sale and inventory effects cannot partially commit.
4. Package conversions are centralized and tested.
5. Store business data is queried from SQLite, not dependent on live cloud reads.
6. Pending operations can safely retry.
7. Server authorization prevents cross-store private access.
8. Private service-role credentials are absent from the app.
9. Product/shared catalog updates cannot overwrite store commercial data.
10. Recognition can return UNKNOWN without breaking the sale flow.
11. Recognition implementation can be replaced behind its interface.
12. Database schema is migration-driven.
13. the active AI coding agent can open the repo and determine current architecture from documentation rather than old chat history.
14. Future web code can reuse domain/contracts without requiring the native SQLite implementation.
15. Core tests run through documented commands.

---

# 73. Current Official Technology Notes

The following were verified against current official documentation while preparing this architecture:

- Expo provides first-class support for workspace monorepos using npm, pnpm, Yarn and Bun.
- Expo SQLite persists data across application restarts and supports WAL configuration; current documentation also exposes optional SQLCipher configuration.
- Expo SQLite web support is currently marked alpha, so the future PWA persistence layer must not be assumed to match Android unchanged.
- Expo Camera supports camera preview and barcode scanning.
- Expo SecureStore provides encrypted platform storage for small secrets.
- Expo Router is Expo's file-based router for React Native and web.
- Supabase provides React Native/Expo integration, PostgreSQL, Auth, Storage and Edge Functions.
- Supabase recommends RLS/grants for exposed tables and provides database-policy testing guidance.
- Supabase Edge Functions are TypeScript/Deno server-side functions suitable for authenticated API endpoints and short-lived idempotent operations.
- Expo documents Maestro-based E2E testing for Android/iOS builds.

---

# 74. Reference Documentation

Current official references used for architecture verification:

- Expo SQLite: https://docs.expo.dev/versions/latest/sdk/sqlite/
- Expo SecureStore: https://docs.expo.dev/versions/latest/sdk/securestore/
- Expo Camera: https://docs.expo.dev/versions/latest/sdk/camera/
- Expo Router: https://docs.expo.dev/versions/latest/sdk/router/
- Expo Monorepos: https://docs.expo.dev/guides/monorepos/
- Expo Unit Testing: https://docs.expo.dev/develop/unit-testing/
- Expo Maestro E2E: https://docs.expo.dev/eas/workflows/examples/e2e-tests/
- Supabase Expo React Native: https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native
- Supabase React Native Auth: https://supabase.com/docs/guides/auth/quickstarts/react-native
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Storage: https://supabase.com/docs/guides/storage
- Supabase Edge Functions: https://supabase.com/docs/guides/functions

---

# 75. Source-of-Truth Relationship

Read this document together with:

- `PRODUCT_INCEPTION.md`
- `PRD_MVP.md`
- `DOMAIN_DATA_MODEL.md`
- `OFFLINE_SYNC.md`
- `SCANNING_ARCHITECTURE.md`
- `RECOGNITION_TEST_PLAN.md`
- `BUILD_PLAN.md`
- `PROJECT_STATE.md`
- `DECISION_LOG.md`
- `AGENTS.md`

Priority when conflicts arise:

1. explicit later approved decision in `DECISION_LOG.md`;
2. current architecture/domain documents;
3. PRD;
4. Product Inception;
5. old chat history.

Old conversation history is not an implementation source of truth once the repository documents exist.
