# M7 Offline Sync Plan

**Status:** Local PostgreSQL/endpoint integration and D-044 stale-reconciliation correction pass; native-device gate remains open. See `M7_INDEPENDENT_AUDIT.md`.  
**Depends on:** independently accepted M6 source/automated scope.  
**Boundary:** first controlled private-store sync only. No M8 scanner, shared
market-price network, staff administration, recognition payloads, production
deployment or final customer-facing authentication/onboarding design.

## Outcome

COSI can keep accepting durable local work offline, then synchronize it to a
store-private Supabase backend without duplicating business effects. A second
authorized installation can obtain a consistent store snapshot and continue
incremental pull from the snapshot revision.

M7 proves the controlled custom protocol selected by D-011. It does not make
network availability part of local sale, restock, stock-check, expense or
withdrawal completion.

## Verified starting point

- SQLite migrations 1–17 contain store, actor, device, catalogue, sale,
  purchase, cost, batch, reconciliation, attention, expense and withdrawal
  facts. Their business commands already commit one canonical aggregate outbox
  envelope atomically with each synchronizable mutation.
- The current outbox supports globally unique operation IDs, aggregate payloads,
  `base_server_version`, attempts, next-attempt time, error code and the required
  lifecycle states. M7 now adds the network worker, server cursor, pull applier,
  durable conflict store and remote server-version projection.
- M7 Supabase migrations, RLS policies, sync functions and Edge Function shells
  are present. Supabase CLI 2.117.0 is pinned. Docker-backed local migrations,
  pgTAP and an Auth/Edge Function/PostgreSQL integration script now pass. The
  expanded script covers D-044 stale cross-device counts; native use remains open.
- The app currently provisions a local owner/store/member/device graph before
  customer authentication exists. M7 must not silently equate a local domain
  user ID with `auth.users.id` or invent final sign-in UX.

## Protocol and security design

### Stable boundary

- Keep versioned protocol DTOs provider-independent in application code.
- Authenticated `sync-push`, `sync-pull`, store-enrolment and bootstrap endpoints
  are narrow transport adapters. They validate request envelopes and call one
  transactional PostgreSQL application boundary.
- PostgreSQL owns durable idempotency, store revision serialization, normalized
  private data, change-log creation and conflict decisions. Edge Functions do
  not perform a multi-table business commit through independent API calls.
- Each request uses a valid user JWT. The endpoint resolves the caller from the
  verified token, then the database revalidates active store membership and the
  device/store relationship. Client role claims are never authority.
- Service-role or secret keys stay server-side. The mobile app receives only the
  project URL and publishable key. Final Auth screens remain deferred; M7 exposes
  an injected authenticated-session boundary and a bounded pilot enrolment path.

## Implementation handoff

M7-01 through M7-08 are committed sequentially on `feat/m7-offline-sync`:
`66507e6`, `74b2053`, `6a15692`, `f411b0c`, `ecb1c21`, `f60c348`, `1b3236d`,
`e9ef793`. Local validation passed with 51 suites and 484 tests, root
typecheck/lint, Expo Doctor 21/21, dependency check and Android export.

The independent audit found that latest-document bootstrap omits original
creation facts after a mutable edit, and the app has no integrated sync path.
Additive operation-history bootstrap and a narrow first-owner pilot connection
path now correct these source gaps. The 2026-09-28 disposable local database
reset, pgTAP, lint, security advisor and live endpoint checks passed. Source
acceptance remains open pending native-device evidence. D-044's additive
server guard now rejects stale cross-device physical reconciliations. See
`M7_INDEPENDENT_AUDIT.md` for the exact checks and correction proposal.

### PostgreSQL shape

Use imperative Supabase migrations. Add:

- domain tables needed for the accepted M1–M6 private store graph, with UUID
  domain IDs, `timestamptz`, exact `numeric` quantity/rational boundaries,
  integer minor-money types and foreign-key/index coverage;
- an explicit mapping from Supabase auth subject to COSI domain user/member;
- store device authorization;
- per-store sync state, applied operations, ordered change log and mutable
  record versions;
- least-privilege grants and RLS on every exposed private table;
- narrowly callable sync functions with fixed `search_path`, explicit execute
  grants and negative authorization tests.

Every store mutation locks the one store sync-state row, checks idempotency,
applies the complete operation, increments the server revision and writes its
change records in one short transaction. Locks are acquired in a stable order.
The durable uniqueness key is `(store_id, operation_id)`. Reuse of an immutable
entity ID with different content is a permanent integrity rejection.

### Store enrolment and identity

The first authenticated owner may enrol an existing local-only store exactly
once through an idempotent request containing its existing store, domain-user,
owner-membership and device IDs. The server binds the verified auth subject to
that domain user and creates the owner membership/device atomically. It must not
allow an authenticated user to claim a store that already has another binding.

Later devices authenticate, select only stores authorized to that subject,
register their own device ID, and bootstrap. This technical boundary does not
decide the final sign-in, invitation, multi-store or recovery screens.

### Push, pull and local recovery

- The worker leases eligible operations so overlapping triggers do not send the
  same operation concurrently. A stale lease becomes retryable after restart.
- Retry transient network/429/5xx failures with bounded exponential backoff and
  jitter. Authentication refresh pauses transport but never blocks local work.
- Positive acknowledgement is required before an operation becomes `SYNCED`.
  A crash after server commit safely receives `ALREADY_APPLIED` on retry.
- Pull is paginated by server-controlled `(revision, changeIndex)`. Apply each
  page in one SQLite transaction and advance the cursor only after the page
  commits. Echoed changes update server metadata without duplicating effects.
- Mutable conflicts are durable local records. The original outbox operation is
  retained; resolution creates a new operation against the latest server
  version. Append-oriented facts preserve all genuine offline transactions.
- Full resync/bootstrap never discards pending local operations. A new device
  writes a fresh consistent snapshot before enabling incremental sync.

## Operation coverage

M7 must recognize every canonical M2–M6 operation already emitted:

- catalogue/package/config: `PRODUCT_CREATED`, `PRODUCT_IDENTITY_UPDATED`,
  `PRODUCT_IDENTIFIER_ADDED`, `PRODUCT_LIFECYCLE_CHANGED`, `PACKAGE_CREATED`,
  `PACKAGE_UPDATED`, `PACKAGE_DEACTIVATED`, `STORE_PACKAGE_SETTING_SAVED`,
  `PRODUCT_REORDER_LEVEL_UPDATED`;
- commerce: `COMPLETED_SALE_CREATED`, `COMPLETED_PURCHASE_CREATED`;
- inventory: `INVENTORY_ADJUSTMENT_CREATED`,
  `BATCH_CLASSIFICATION_CREATED`, `RECONCILIATION_FINALIZED`,
  `CHECK_SETTINGS_SAVED`, `CHECK_ASSIGNMENT_CREATED`,
  `ATTENTION_SETTINGS_SAVED`, `ATTENTION_SNOOZE_CREATED`;
- money-out: `EXPENSE_CREATED`, `OWNER_WITHDRAWAL_CREATED`.

Legacy and current sale/purchase payload versions remain readable as required by
`OFFLINE_SYNC.md`. Protocol parsing uses explicit version discriminants and
canonical decimal strings for D-034 quantities and rational cost values.

## M5/M6 compatibility rules

- Preserve both genuine concurrent offline sales even when aggregate stock goes
  negative. Never reject one to make the projection look nonnegative.
- Batch allocation is an assumed FEFO projection, not physical proof. Concurrent
  device allocations may create an unknown/discrepant composition while the
  product event total remains authoritative.
- A reconciliation finalization is accepted only against compatible inventory
  and batch watermarks. A stale count becomes a visible conflict; it does not
  overwrite intervening sales, purchases or classifications.
- Cost movements and immutable transaction snapshots are synchronized as facts.
  FEFO allocation never becomes the financial costing method. Concurrent order
  can invalidate a mutable cost projection; rebuild deterministically from the
  accepted immutable movements and record any unresolved coverage state.
- Reorder/check/attention settings use optimistic version checks. Assignments,
  attempts, snoozes and adjustments retain their audit facts.
- Expenses and withdrawals append and deduplicate. Owner-only authorization is
  rechecked server-side. Daily summaries remain derived local read models.

## Ticket sequence

1. M7-01 — establish protocol, authenticated server, schema, RLS and test spine.
2. M7-02 — enrol a local store and implement crash-safe worker/pull metadata.
3. M7-03 — prove completed Sale end to end.
4. M7-04 — synchronize Purchase, inventory, batch and costing facts.
5. M7-05 — synchronize mutable catalogue/package/store configuration conflicts.
6. M7-06 — synchronize reconciliation, guided-check and attention operations.
7. M7-07 — synchronize expenses/withdrawals and complete bootstrap/second device.
8. M7-08 — harden recovery, security, diagnostics and evidence; stop for audit.

This order first proves one complete aggregate, then adds bounded operation
families. One implementation task owns the M7 checkout sequentially.

## Verification boundary

Required automated evidence includes:

- protocol schema/version and canonical numeric boundary tests;
- PostgreSQL migration, constraints, indexes, grants and pgTAP RLS tests with
  owner/member/non-member/anonymous/revoked-device cases;
- Edge Function authentication and tampered cross-store request tests;
- timeout-after-server-commit retry, duplicate request and conflicting immutable
  ID cases;
- two-device sale/final-stock, stale mutable edit, deactivation versus stale
  sale, stale reconciliation and batch/cost rebuild cases;
- restart with pending/leased work, interrupted pull, echo, pagination,
  unsupported protocol and permanent-error cases;
- consistent bootstrap, interrupted bootstrap and pending-local-work protection;
- full existing repository validation, Expo Doctor and Android export.

M7 cannot receive independent source acceptance without an actual PostgreSQL
integration run. Accept either a local Docker Supabase stack or an explicitly
authorized isolated hosted development project. Never run database tests against
production. Physical Galaxy checks remain a separate carried release-readiness
gate unless the founder requests them during M7.

## Current external prerequisite

Before M7-01 can close, set up one of:

1. Docker Desktop plus the pinned local Supabase CLI; or
2. an isolated hosted Supabase development project, explicit project link and
   authorization to apply disposable development migrations/tests.

No credential, project reference, password or service key is committed. No
remote link, migration, deployment or project creation is performed by this
planning checkpoint.

## Bounded platform verification

Checked against current official Supabase guidance on 2026-09-19:

- RLS and table grants are separate controls; test both allowed and denied
  access and index policy predicates:
  https://supabase.com/docs/guides/database/postgres/row-level-security
- Signed-in callers send a user JWT to Edge Functions; the handler must keep the
  caller's RLS context or deliberately constrain any privileged client:
  https://supabase.com/docs/guides/functions/auth
- pgTAP through `supabase test db` is the documented database/RLS test path:
  https://supabase.com/docs/guides/local-development/testing/overview
- New `public` tables no longer reliably inherit Data API grants. Migrations
  must state grants explicitly rather than depend on project defaults:
  https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically

These findings reinforce D-042; they do not add enterprise warehouse scope.
