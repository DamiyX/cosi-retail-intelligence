# OFFLINE_SYNC — Retail Commerce Intelligence

**Version:** 1.0  
**Status:** Architecture source of truth  
**Applies to:** Android MVP / local-first mobile client / Supabase backend  
**Primary rule:** A normal store transaction must not require internet to succeed.

---

# 1. Purpose

This document defines how data moves safely between:

- one or more offline-capable Android devices;
- the store's local SQLite databases;
- the Supabase backend;
- shared/platform datasets.

It defines:

- local-write behavior;
- outbox behavior;
- push/pull synchronization;
- idempotency;
- retries;
- server revisions/cursors;
- conflict handling;
- multi-device behavior;
- deletion/tombstones;
- device restore/reinstall;
- sync status;
- error recovery.

The purpose is not merely to "sync eventually."

The purpose is to ensure that intermittent connectivity does not create:

- duplicate sales;
- missing purchases;
- corrupted stock;
- silent overwrites;
- cross-store data leaks;
- false financial history.

---

# 2. Core Sync Principles

## 2.1 Local transaction first

For core store operations:

> SQLite commits first. Cloud synchronization happens afterward.

A sale must not wait for Supabase.

## 2.2 Completed business transactions are historical records

Completed:

- sales;
- purchases;
- inventory events;
- expenses;
- owner withdrawals;
- payments

should be treated as append-oriented/auditable records.

Corrections should normally create explicit corrective effects rather than destructively rewriting history.

## 2.3 Mutable reference data uses explicit versioning

Examples:

- StoreProduct;
- StorePackageSetting;
- Supplier;
- selected store settings.

These records may change, so synchronization must detect stale edits instead of silently overwriting them.

## 2.4 Every offline-created entity has a globally unique ID

A device creates the final domain ID before server contact.

The server does not replace it with an auto-increment business ID.

## 2.5 Every sync operation has its own idempotency ID

Retrying the exact same operation must not apply its effects twice.

## 2.6 Server ordering does not depend on device clocks

Device timestamps are useful business metadata.

They are not trusted as the global synchronization ordering mechanism.

## 2.7 Offline is normal

The product should not treat every pending sync as an error.

"Saved locally, waiting to sync" is a valid normal state.

---

# 3. Sync Data Categories

Not all data should use the same conflict strategy.

## Category A — Append-oriented store transactions

Examples:

- completed Sale;
- SaleItem;
- Payment;
- completed Purchase;
- PurchaseItem;
- InventoryEvent;
- Expense;
- OwnerWithdrawal;
- finalized reconciliation adjustment.

Strategy:

> preserve + deduplicate.

No last-write-wins replacement of historical transactions.

---

## Category B — Mutable store reference/configuration data

Examples:

- StoreProduct metadata;
- StorePackageSetting;
- Supplier;
- reorder threshold;
- preferred package;
- store settings.

Strategy:

> optimistic versioning + conflict detection.

---

## Category C — Server-authoritative security data

Examples:

- authentication;
- StoreMember membership;
- revoked access;
- platform admin roles.

Strategy:

> online/server authoritative.

Security membership changes are not treated as ordinary offline-editable records.

---

## Category D — Server/shared read models

Examples:

- MarketPriceSignal;
- approved shared catalog;
- approved recognition profiles;
- platform feature/config versions.

Strategy:

> server publishes; client caches.

---

## Category E — Recognition/store-local experimental data

Examples:

- local recognition references;
- embeddings;
- recognition-profile updates.

Strategy:

> store-local first, then synchronized according to `SCANNING_ARCHITECTURE.md`.

Large binary assets are synchronized separately from ordinary row payloads.

---

# 4. Local Sync Metadata

Every synchronized mutable/transactional row should have sufficient internal metadata.

The exact physical columns may vary, but the architecture requires equivalents of:

- `id`
- `storeId`
- `createdAt`
- `updatedAt` where mutable
- `createdByStoreMemberId`
- `deviceId`
- `syncStatus`
- `serverVersion?`
- `deletedAt?` where tombstones apply

Do not expose internal sync fields unnecessarily in product UI.

---

# 5. Sync Status Model

Recommended local statuses:

```text
LOCAL_ONLY
PENDING
SYNCING
SYNCED
CONFLICT
ERROR_RETRYABLE
ERROR_PERMANENT
```

The implementation may simplify names while preserving these meanings.

## Normal lifecycle

```text
local transaction
      ↓
PENDING
      ↓
SYNCING
      ↓
SYNCED
```

If connectivity fails:

```text
SYNCING
   ↓
ERROR_RETRYABLE
   ↓
PENDING / retry
```

A retryable network failure must never mark the underlying sale as failed locally.

---

# 6. Outbox Pattern

Use a durable local outbox.

The outbox records operations that the server has not yet acknowledged.

Suggested logical fields:

- `operationId`
- `storeId`
- `deviceId`
- `entityType`
- `entityId`
- `operationType`
- `baseServerVersion?`
- `payload`
- `createdAt`
- `attemptCount`
- `nextAttemptAt?`
- `lastErrorCode?`
- `status`

`operationId` must be globally unique.

---

# 7. Atomic Local Write + Outbox

The business record and its outbox record must be committed in the **same SQLite transaction**.

Correct:

```text
BEGIN

insert sale
insert sale items
insert payment
insert inventory events
update inventory projection
insert outbox operation(s)

COMMIT
```

Incorrect:

```text
save sale
COMMIT

later maybe create outbox
```

The incorrect design can produce local records that are never synchronized after a crash.

---

# 8. Sync Granularity

For important aggregate operations, prefer one logical operation envelope rather than independently syncing rows whose correctness depends on each other.

Example:

> `COMPLETED_SALE_CREATED`

Payload may contain the sale plus required child records.

The server applies the complete business operation transactionally.

Likewise:

> `COMPLETED_PURCHASE_CREATED`

This prevents:

> Sale synced, but SaleItem #3 failed separately.

The server may still store normalized tables internally.

---

# 9. Drafts

MVP default:

> Draft transactional records remain local until completed.

Examples:

- unfinished sale cart;
- unfinished purchase entry.

Reason:

- reduces sync volume;
- avoids cross-device draft conflict complexity;
- completed business events are the important shared truth.

If future requirements need cross-device drafts, add them deliberately.

---

# 10. Push Sync

Conceptual push flow:

```text
Sync worker
    ↓
load eligible outbox operations
    ↓
group small batch
    ↓
authenticate
    ↓
POST sync-push
    ↓
server validates store membership
    ↓
server checks operation IDs
    ↓
server applies operations transactionally
    ↓
server assigns store revision(s)
    ↓
server returns acknowledgements/conflicts
    ↓
client marks acknowledged operations synced
```

The client must not delete outbox entries before durable server acknowledgement.

---

# 11. Push Batch

A push request should contain:

- protocol version;
- store ID;
- device ID;
- client app version;
- operations[];
- last known server revision;
- request ID.

Each operation includes its own `operationId`.

A network retry may resend the same request safely.

---

# 12. Idempotency

The server must maintain durable knowledge of applied operation IDs.

At minimum:

> `(storeId, operationId)` must be unique.

If the same operation arrives again:

- do not re-run its business effects;
- return the previously accepted result/acknowledgement where practical.

Example:

A phone completes one ₦10,000 sale.

Network times out after server commit but before response reaches phone.

The phone retries.

Correct result:

> one sale.

Not:

> two ₦10,000 sales.

---

# 13. Entity ID Deduplication

Business entity IDs also provide protection.

For immutable/appended entities:

- duplicate entity creation with the same ID should be idempotent if payload meaning matches;
- conflicting reuse of an existing ID with different immutable content should be rejected and logged as a serious integrity error.

---

# 14. Server Store Revision

Use a server-controlled per-store revision/cursor for incremental synchronization.

Conceptually:

```text
StoreSyncState
- storeId
- currentRevision
```

Each accepted server-visible change increments the store revision.

A synchronized change log records:

- `storeId`
- `revision`
- `changeIndex`
- `entityType`
- `entityId`
- `changeType`
- relevant payload/version information.

Clients remember their last successfully applied revision.

---

# 15. Why Not Use Device Time as Cursor

Do not use:

> "give me everything updated after 4:07 PM on my phone"

as the synchronization correctness mechanism.

Problems:

- clocks can be wrong;
- two devices differ;
- time zones;
- clock adjustment;
- retries;
- concurrent writes.

Business `occurredAt` remains useful.

Synchronization order is server-controlled.

---

# 16. Per-Store Revision Serialization

All server mutations that affect a store's synchronized private dataset must participate in the same revision mechanism.

Implementation should ensure revisions cannot be skipped due to concurrent commit ordering.

Preferred implementation concept:

1. server begins transaction;
2. lock the store's sync-state row (or equivalent per-store transaction lock);
3. validate/apply mutation;
4. increment store revision;
5. write change-log records;
6. commit.

This serializes synchronization revision assignment per store without serializing unrelated stores.

Exact PostgreSQL implementation may use row locks or an approved equivalent.

---

# 17. Pull Sync

Conceptual flow:

```text
client has revision 120
       ↓
GET/PULL changes after 120
       ↓
server returns:
revision 121 ...
revision N
       ↓
client validates payload
       ↓
apply changes in SQLite transaction(s)
       ↓
store cursor = N
```

If pull is interrupted:

> retry from the last fully committed revision.

Do not advance the cursor before the corresponding local changes are committed.

---

# 18. Pull Pagination

Pull responses must be bounded.

If more changes remain:

- server returns `hasMore = true`;
- client continues from returned cursor.

Do not require loading an entire store history into one response.

---

# 19. Protocol Versioning

Every sync request/response should contain a protocol version.

Example:

```text
syncProtocolVersion = 1
```

If a future app version cannot safely interpret a protocol/schema:

- server can reject with an explicit upgrade requirement;
- client must not guess.

This reduces unsafe old-client behavior.

---

# 20. Mutable Record Versioning

Mutable synchronized records require a server version.

Example:

```text
StoreProduct
serverVersion = 7
```

Offline edit is created from:

```text
baseServerVersion = 7
```

Push asks:

> apply this change if the server is still compatible with version 7.

---

# 21. Mutable Conflict Rule

Default MVP rule:

> Do not silently overwrite a newer remote edit when a stale offline edit reaches the server.

If:

```text
client base version = 7
server current version = 9
```

server returns:

> CONFLICT

with enough current server data for resolution.

This is safer than hidden last-write-wins for store configuration.

---

# 22. Conflict UI Principle

Conflicts should be rare.

When one occurs, show understandable business language.

Example:

> **Selling price changed on another device.**
>
> Your value: ₦1,450  
> Current store value: ₦1,500
>
> Keep current / Use mine

Do not show database version numbers to normal retailers.

---

# 23. Conflict Resolution

When user chooses a resolution:

1. load latest server version;
2. create a new local edit against that version;
3. push as a new operation;
4. preserve conflict audit metadata where useful.

Do not mutate the original rejected sync operation and pretend it never conflicted.

---

# 24. Conflict Policy Matrix

## Sales / Purchases / Expenses / Withdrawals

Policy:

> append + deduplicate.

They are not replaced by another device's version.

## Inventory events

Policy:

> append + deduplicate.

## StoreProduct mutable metadata

Policy:

> optimistic version conflict.

## StorePackageSetting / package conversion

Policy:

> optimistic version conflict; owner/admin resolution.

Package-conversion changes are high-impact and must never silently overwrite another device's newer change.

## Supplier metadata

Policy:

> optimistic version conflict.

## Staff membership / permissions

Policy:

> server-authoritative; changes require connectivity.

## MarketPriceSignal

Policy:

> server-authoritative cache replacement.

## Approved shared catalog

Policy:

> server-authoritative versioned updates.

## Recognition profile

Policy:

> defined in scanning architecture; local references may append while profile metadata remains versioned.

---

# 25. Inventory and Concurrent Offline Sales

Important scenario:

Store has:

> 1 unit recorded.

Phone A goes offline.

Phone B goes offline.

Both sell 1 unit.

Each local device believes its sale is valid.

Later both synchronize.

Correct MVP behavior:

1. preserve both real sales;
2. preserve both inventory events;
3. server stock may become `-1`;
4. flag negative/discrepant inventory;
5. require later reconciliation.

Do **not** discard one real sale just to protect the stock number.

Offline operation means globally perfect stock reservation is impossible without connectivity.

This is an accepted product constraint.

---

# 26. Insufficient Local Stock

Locally, the app may:

- warn when a sale exceeds recorded local stock;
- require confirmation depending on product settings/role.

Do not hard-block every negative sale by default.

Reasons:

- physical stock may exist even if records are wrong;
- previous unrecorded purchases may exist;
- offline devices may be stale.

The inventory system must help reveal discrepancies, not prevent genuine trading based on imperfect records.

---

# 27. Concurrent Product Edits

Example:

Phone A changes selling price to ₦1,450 offline.

Phone B changes it to ₦1,500 and syncs first.

Phone A later syncs its stale edit.

Result:

> conflict.

Do not silently choose by device clock.

The user/admin can resolve.

---

# 28. Concurrent Product Creation

Two devices may independently create what is physically the same product.

Do not automatically merge based only on similar names.

Potential safe signals:

- identical verified barcode/package identifier;
- explicit user/admin merge;
- later canonical-product matching.

Until resolved, preserve both records rather than incorrectly merging distinct SKUs.

---

# 29. Duplicate Barcode Association

If two store products attempt to claim the same exact store/package barcode mapping:

- server should reject or flag the later ambiguous association;
- client should offer merge/reassociation resolution.

Barcode uniqueness rules may be scoped to:

- product variant;
- package unit;
- store mapping;

according to the final catalog schema.

---

# 30. Package Conversion Changes

A package conversion can affect future inventory calculations.

Historical SaleItem/PurchaseItem records contain:

> `conversionToBaseSnapshot`.

Therefore:

- changing a package conversion affects future transactions only;
- historical completed transactions retain old snapshots.

Conflicting package-conversion edits require explicit resolution.

---

# 31. Corrections / Voids

Do not synchronize destructive deletion of completed financial transactions.

Example:

A sale was entered incorrectly.

Preferred model:

- original sale remains;
- sale becomes voided/reversed according to approved rules;
- compensating inventory/financial events are created;
- corrective operation syncs.

Detailed void semantics will be finalized during implementation of those flows.

---

# 32. Deletion and Tombstones

Mutable reference entities may support deletion/deactivation.

Do not simply erase a row and expect other offline devices to know.

Use a tombstone/equivalent:

- entity ID;
- store ID;
- deletedAt;
- server version/revision.

Other devices pull the tombstone and deactivate/remove local active visibility safely.

---

# 33. Tombstone Retention

Server tombstones must be retained long enough that reasonably offline devices can observe them.

For MVP/beta:

> do not aggressively purge tombstones.

A later retention/compaction policy can be designed after real offline-duration data exists.

---

# 34. StoreProduct Deactivation

Prefer:

> `INACTIVE`

over destructive deletion when a product has transaction history.

Historical sale/purchase references must remain valid.

---

# 35. Sync Triggering

Attempt synchronization opportunistically when:

- app starts/foregrounds;
- connectivity becomes available;
- a local transaction completes while online;
- user manually retries;
- periodic active-session checks occur.

Do not depend on Android background execution for correctness.

Background sync may improve freshness but is not guaranteed to run exactly when requested by the application.

---

# 36. Network Detection

Network-state detection is advisory.

Even if the operating system reports connectivity:

> the backend request can still fail.

Therefore:

- always handle actual request failure;
- do not treat "connected" as proof that sync will succeed.

---

# 37. Retry Strategy

Retry transient failures with bounded exponential backoff and jitter.

Retryable examples:

- timeout;
- temporary DNS/network failure;
- HTTP 429;
- temporary 5xx;
- short backend outage.

Do not retry indefinitely at high frequency.

Reset/back off intelligently after success/app restart.

---

# 38. Permanent Errors

Examples:

- invalid schema/protocol;
- unauthorized store access;
- malformed business payload;
- unsupported app version;
- invariant violation.

Mark as:

> `ERROR_PERMANENT`

and surface an actionable diagnostic/admin state.

Do not repeatedly hammer the backend.

---

# 39. Authentication During Offline Use

First-time authentication requires connectivity.

Once a device has successfully authenticated and initialized a store:

> approved local business workflows may continue offline.

If cloud access token expires while offline:

- local sale/restock operation should not suddenly stop;
- cloud sync waits until authentication can be refreshed.

This is a deliberate offline-first requirement.

---

# 40. Membership Revocation Limitation

If a staff member's access is revoked while their device is offline:

> the device cannot know until it reconnects.

This is an unavoidable offline-security limitation.

Mitigations may later include:

- local PIN/device lock;
- shorter offline authorization windows for sensitive roles;
- owner-controlled device revocation;
- device management.

For MVP, record this risk explicitly.

When a revoked device reconnects:

- server rejects new synchronization;
- app locks/removes store access according to approved security behavior.

---

# 41. Security of Sync Endpoint

`sync-push` and `sync-pull` must:

- require authenticated user;
- validate store membership;
- validate device/store relationship;
- validate payload schema;
- enforce operation permissions;
- never trust client role claims blindly;
- prevent cross-store IDs from being injected;
- record security-relevant failures.

Service-role credentials remain server-side.

---

# 42. Server Application Transaction

A pushed business operation must be applied transactionally.

Example: completed sale.

Server transaction:

```text
verify idempotency
validate store/user
insert sale
insert sale items
insert payments
insert inventory events / server projection
record sync change log
record applied operation
commit
```

If any required part fails:

> none of that operation is accepted.

---

# 43. Server Acknowledgement

For every pushed operation, server returns one of:

- `APPLIED`
- `ALREADY_APPLIED`
- `CONFLICT`
- `REJECTED_RETRYABLE`
- `REJECTED_PERMANENT`

Response should include:

- operation ID;
- entity ID;
- resulting server version where relevant;
- resulting store revision;
- conflict/current record where relevant;
- error code where rejected.

---

# 44. Local Acknowledgement Handling

Only after receiving durable positive acknowledgement:

- mark outbox operation synced;
- store returned server version;
- advance applicable sync metadata.

If the app crashes before processing the acknowledgement:

> safe retry returns `ALREADY_APPLIED`.

---

# 45. Push Before Pull vs Pull Before Push

Default active sync cycle:

```text
1. authenticate/refresh if necessary
2. push local pending operations
3. process acknowledgements/conflicts
4. pull server changes after local cursor
5. apply pulled changes
6. repeat briefly if server reports more
```

Reason:

- local completed transactions should be preserved quickly;
- pushed changes become part of server revision stream;
- subsequent pull converges the device with other changes.

A bootstrap/restore uses a separate flow.

---

# 46. Pull Apply Rules

Pulled changes are applied through a dedicated sync application layer.

Do not route them through UI forms.

The pull applier must:

- validate schema/version;
- preserve local unsynced edits;
- update server versions;
- apply server-authoritative records;
- create conflict records when required;
- advance cursor only after commit.

---

# 47. Echo Changes

A device may pull a change that originated from itself.

This is normal.

The pull layer should:

- recognize already-synced entity/operation state;
- update authoritative server version/revision;
- avoid duplicating domain effects.

---

# 48. Sync Conflict Storage

Persist unresolved conflicts locally.

Suggested logical entity:

```text
SyncConflict
- id
- storeId
- entityType
- entityId
- operationId
- localPayload
- serverPayload
- serverVersion
- conflictType
- createdAt
- resolvedAt?
- resolution?
```

This allows:

- app restart;
- later resolution;
- audit/debugging.

---

# 49. Conflict Visibility

Do not interrupt every sale with background sync conflict dialogs.

Conflicts unrelated to the current checkout can appear in:

> "Needs attention"

or equivalent admin area.

Critical conflicts affecting current operation may be shown immediately.

---

# 50. Sync UI

Normal retailer-facing states should stay simple.

Examples:

- ✓ Up to date
- ↻ 5 changes waiting to sync
- ⚠ Sync needs attention
- Offline — saved on this device

Avoid forcing users to understand:

- outboxes;
- revisions;
- cursors;
- HTTP codes.

---

# 51. Sync Health Details

An owner/admin diagnostic screen may expose:

- last successful sync;
- pending count;
- failed count;
- device ID/name;
- current app version;
- last known server revision;
- manual retry;
- export diagnostic log where appropriate.

This is useful during beta.

---

# 52. Bootstrap — First Store Download

When an existing store is opened on a newly authorized device:

```text
authenticate
   ↓
authorize store
   ↓
register device
   ↓
request consistent bootstrap snapshot
   ↓
write fresh local SQLite database
   ↓
store bootstrap server revision
   ↓
begin incremental sync
```

Bootstrap must establish a cursor consistent with the snapshot.

---

# 53. Consistent Bootstrap

The backend should expose a bootstrap flow that produces:

- current syncable store state;
- a server revision corresponding to that state.

The snapshot and revision must be consistent enough that subsequent:

> pull changes after revision

cannot permanently miss a concurrent change.

Exact implementation may use a controlled database transaction/snapshot endpoint.

---

# 54. Bootstrap Content

Initial bootstrap may include:

- store;
- store members relevant to client;
- StoreProducts;
- package settings;
- suppliers;
- current inventory projection;
- required transaction history;
- expenses/withdrawals;
- price history;
- cached market signals;
- recognition metadata required for store;
- sync metadata.

For small beta stores, downloading full relevant history is acceptable.

Later, large-history pagination/archival can be introduced.

---

# 55. Reinstall / Device Replacement

If app data is deleted or phone is replaced:

1. sign in online;
2. authorize store;
3. register new device;
4. bootstrap from server;
5. resume incremental sync.

Only data that previously reached the server can be recovered from the server.

Therefore:

🔴 Uninstalling the app while unsynced transactions exist can destroy those unsynced records.

The app should warn before user-initiated destructive reset/logout workflows if pending unsynced business data exists.

---

# 56. Logout

Logout must distinguish:

## Safe logout

No unsynced business changes.

Can clear local credentials/data according to approved policy.

## Pending-data logout

Unsynced records exist.

The app should:

- attempt sync if online;
- clearly warn the user;
- avoid silently deleting pending data.

Exact logout UX will be defined during implementation.

---

# 57. Full Resync

A support/admin full-resync operation may:

1. verify all local pending operations are safely pushed or explicitly handled;
2. create local backup/diagnostic if appropriate;
3. download fresh server snapshot;
4. rebuild synchronized read state.

Do not implement:

> "delete local database and hope"

as the normal repair strategy.

---

# 58. Database Migration + Sync Compatibility

An application update may change local schema.

Order:

```text
launch
 ↓
run local DB migrations
 ↓
verify supported sync protocol
 ↓
start normal sync
```

A client with an unsupported sync protocol must not continue sending payloads that the server interprets incorrectly.

---

# 59. App-Version Compatibility

Push includes:

- app version;
- sync protocol version.

Server may respond:

- supported;
- upgrade recommended;
- upgrade required.

A forced upgrade should be reserved for genuine compatibility/security requirements because retailers may have intermittent connectivity.

---

# 60. Large Payloads / Media

Do not include large image binaries inside ordinary sync JSON batches.

Media workflow:

```text
local MediaAsset metadata
       ↓
upload object when online
       ↓
receive remote object reference
       ↓
sync/update metadata record
```

Business transaction synchronization must not wait for non-essential image upload unless that image is required for correctness.

Example:

> product photo upload failure must not prevent a sale.

---

# 61. Media Idempotency

Use stable asset IDs/checksums/object keys so retries do not create uncontrolled duplicate files.

Upload status should be independently retryable.

---

# 62. Recognition Sync

Recognition synchronization follows the general rules but has specialist constraints.

Store-local recognition references may sync as:

- profile metadata;
- reference metadata;
- media assets;
- derived embeddings when architecture permits.

Platform-approved profiles are server-authoritative distributed data.

Detailed:

- profile merge;
- model-version migration;
- embedding refresh;
- recognition catalog publication

belongs in `SCANNING_ARCHITECTURE.md`.

---

# 63. Price Observation Sync

A completed PurchaseItem may produce:

1. private store purchase history;
2. potentially eligible network `PriceObservation`.

Network contribution must respect consent.

The shared observation sent to backend should contain only the required sanitized fields.

Do not expose the retailer's entire Purchase record merely because price contribution is enabled.

---

# 64. Market Signal Sync

`MarketPriceSignal` is server-generated.

Client:

- pulls relevant signals;
- caches them;
- displays freshness timestamp;
- never treats stale cached signal as freshly verified.

No client conflict merging is needed.

---

# 65. Staff Membership Sync

Staff invite/create/revoke requires online server confirmation.

Reason:

> permissions are security-sensitive.

Once downloaded, membership is cached for offline attribution/use according to offline authorization rules.

The client cannot self-authorize a new staff account offline.

---

# 66. Audit Data

For important synchronized operations preserve:

- operation ID;
- entity ID;
- user/store member;
- device;
- client occurred time;
- server received/applied time;
- server revision;
- app/protocol version where useful.

This materially improves debugging during beta.

---

# 67. Server Integrity Checks

Examples:

- SaleItem store product belongs to same store.
- Package unit belongs to intended product variant.
- User is authorized for store.
- Money values satisfy expected constraints.
- Entity IDs are not cross-store reused.
- Immutable entity payload is not mutated on replay.
- Package conversion snapshot is valid.
- Sync operation type is allowed for role.

Never rely only on mobile validation.

---

# 68. Sync Testing — Required Scenarios

Before controlled beta, automated/manual tests must include at least:

## Basic

1. offline sale → reconnect → one server sale;
2. offline purchase → reconnect;
3. offline expense → reconnect;
4. app restart with pending outbox;
5. network timeout after server commit → retry without duplicate.

## Multi-device

6. Phone A sale + Phone B sale offline → both preserved;
7. both sell final stock → negative/discrepancy surfaced;
8. both edit same selling price → conflict;
9. one edits product while another sells it → historical sale remains valid;
10. one deactivates product while other has stale cache.

## Recovery

11. app crash during local transaction;
12. app crash after local commit before sync;
13. app crash after server commit before ack handling;
14. reinstall new device → bootstrap;
15. interrupted bootstrap → safe restart.

## Security

16. user attempts cross-store push;
17. revoked member reconnects;
18. tampered payload references another store's entity.

## Protocol

19. outdated client protocol;
20. schema validation failure.

---

# 69. Sync Invariants

Implementation must preserve:

1. One local completed sale can produce at most one accepted server sale.
2. Retrying does not duplicate business effects.
3. Inventory effects for a completed transaction apply exactly once per system.
4. A sync cursor never advances past unapplied local pull changes.
5. Historical transactions are not silently overwritten by mutable master data.
6. A stale mutable edit cannot silently replace a newer server edit.
7. Unsynced local work survives normal app restart.
8. Network failure does not undo a locally committed sale.
9. Store A cannot sync Store B private data.
10. Server-generated shared data cannot overwrite private store commercial values.
11. Device time is not the authoritative global change order.
12. Media upload failure does not block unrelated business sync.
13. Unknown recognition does not block sale synchronization.
14. Conflicts survive app restart until resolved.
15. Full resync does not silently discard pending local business operations.

---

# 70. First Sync Implementation Scope

For initial implementation, prioritize:

1. Store bootstrap;
2. StoreProduct/package settings;
3. completed Sale aggregate push;
4. completed Purchase aggregate push;
5. InventoryEvent synchronization;
6. Expense;
7. OwnerWithdrawal;
8. incremental pull;
9. basic conflict storage;
10. sync status UI/diagnostics.

Do not initially synchronize every experimental/future entity.

Recognition and network-price data can join after the core protocol is proven.

---

# 71. Sync Implementation Milestones

Suggested engineering sequence:

## S0 — Protocol skeleton

- sync metadata tables;
- outbox;
- operation envelopes;
- protocol types;
- server endpoint skeleton.

## S1 — One append-only aggregate

Implement Sale end-to-end.

Prove:

- offline create;
- retry;
- idempotency;
- pull/echo;
- restart.

## S2 — Purchases/inventory

Add Purchase + InventoryEvent.

## S3 — Mutable reference records

Add StoreProduct versioning/conflicts.

## S4 — Bootstrap / second device

Prove new device restoration.

## S5 — Expenses/withdrawals

Add remaining core transactions.

## S6 — Hardening

- failures;
- security tests;
- app-version/protocol checks;
- diagnostics.

Do not implement all entity sync simultaneously before proving the protocol on one aggregate.

---

# 72. What the active AI coding agent Must Not Do

the active AI coding agent must not:

- sync by simply looping through tables and "upserting everything";
- use device timestamps as the only conflict strategy;
- use last-write-wins for completed sales;
- regenerate IDs on server;
- delete outbox before acknowledgement;
- mark a sale failed because internet is unavailable;
- directly expose service-role secrets in the app;
- allow each feature to invent its own sync logic;
- silently reset the local database after migration errors;
- discard transactions to avoid negative stock;
- hide synchronization conflicts;
- make image uploads part of sale completion correctness.

---

# 73. Fallback to Managed Sync

The architecture currently prefers a controlled custom sync layer because:

- core writes are aggregate business operations;
- transaction/audit behavior matters;
- price contribution has privacy transformation;
- we need explicit idempotency/business validation.

However, if implementation proves that custom synchronization threatens MVP schedule or reliability, evaluate a managed engine such as PowerSync.

Decision criteria should include:

- supported conflict model;
- Postgres/Supabase compatibility;
- offline writes;
- transaction semantics;
- pricing;
- self-hosting/exit path;
- React Native/Expo maturity;
- observability;
- migration cost.

Do not continue building an unsafe custom system merely because it was the first choice.

---

# 74. Open Questions to Resolve During Implementation

These do not block writing the architecture but the active AI coding agent must surface them before their milestone:

1. Exact UUID library/API.
2. Exact outbox physical schema.
3. Exact server RPC/Edge Function boundary.
4. Whether server push is implemented primarily in Edge Function + SQL RPC or another transaction-safe pattern.
5. Exact store-revision table/locking SQL.
6. Pull change-log payload representation.
7. Maximum push batch size.
8. Maximum pull page size.
9. Conflict-review UI.
10. Exact void/reversal mechanics.
11. Exact negative-stock alert UX.
12. Offline authorization grace/security policy.
13. Tombstone retention duration.
14. Large-history bootstrap strategy after beta scale.

These should be answered with implementation evidence, not guessed prematurely.

---

# 75. Source-of-Truth Relationship

This document is subordinate to:

- approved product behavior in `PRD_MVP.md`;
- domain invariants in `DOMAIN_DATA_MODEL.md`;
- overall platform decisions in `TECHNICAL_ARCHITECTURE.md`.

It is authoritative for synchronization behavior.

If the active AI coding agent discovers a conflict:

1. stop;
2. explain it;
3. propose the better rule;
4. obtain approval;
5. record decision;
6. update documentation;
7. implement.

Old chat history is not the synchronization specification once this document exists.
