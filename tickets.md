# Tickets: M7 Offline Sync

M7 implements the controlled custom sync protocol in
`docs/engineering/M7_OFFLINE_SYNC_PLAN.md`. The accepted M1–M6 local-write-first
behavior remains authoritative. Do not start M8 production integration.

## Implementation handoff and independent audit — 2026-09-28

Local Docker/Supabase reset, 81 pgTAP assertions, scoped lint, security
advisors and live Auth/Edge Function/PostgreSQL integration now pass. The
earlier Docker blocker described below is resolved. The M7 gate remains open:
the server now rejects a physical reconciliation made stale by another
device's inventory/batch operation under D-044. Native-device sync evidence is pending.
See `docs/engineering/M7_INDEPENDENT_AUDIT.md`.

M7-01 through M7-08 source work is committed sequentially on
`feat/m7-offline-sync`: `66507e6`, `74b2053`, `6a15692`, `f411b0c`,
`ecb1c21`, `f60c348`, `1b3236d`, `e9ef793`. The provider-independent contracts,
SQLite sync state/worker, authenticated Supabase transport, server migrations,
RLS/grants, Edge Function shells, operation projections, conflict records and
bootstrap cursor handling are present.

Local evidence is green: 51 suites/484 tests, root typecheck, zero-warning
lint, environment check, Expo dependency check, Expo Doctor 21/21 and Android
export. The required database evidence is still blocked: both
`supabase db lint --local --fail-on error` and `supabase test db --local`
refused at `127.0.0.1:54322` because Docker is unavailable. M7 is therefore
not accepted. Independent audit found two additional source blockers. Additive
operation-history bootstrap and a first-owner pilot sign-in/enrolment/sync/status/
conflict path now address them in source; PostgreSQL/endpoint/device evidence is
still open. See `docs/engineering/M7_INDEPENDENT_AUDIT.md`. No M8 work is authorized.

## M7-01 — Establish the secure protocol and server transaction spine

**Status:** Implemented; real PostgreSQL integration gate blocked. **Basis:** M6 source/automated scope independently accepted.
**Delivers:** versioned protocol contracts and a testable authenticated Supabase
boundary capable of one atomic, revisioned store operation.

- [x] Add provider-independent push/pull/bootstrap DTOs with explicit protocol
  and payload versions, bounded request/page sizes, canonical decimal strings,
  typed acknowledgements/errors and runtime validation. Reject unknown versions.
- [x] Add imperative Supabase migrations for auth-subject mapping, stores,
  memberships, devices, per-store sync state, applied operations, change log and
  the minimum normalized domain foundation. Use UUID/timestamptz, exact numeric
  quantity/rational values and integer minor-money types, plus constraints,
  foreign-key/query indexes and deterministic lock order.
- [x] Add authenticated Edge Function shells and one transactional PostgreSQL
  application boundary. Verify JWT, active membership, device/store relation,
  operation permission and cross-store references; serialize each store revision
  and keep service credentials server-only.
- [x] Revoke ambient access, use explicit grants, enable RLS on exposed tables,
  pin privileged-function search paths and add positive/negative pgTAP policy
  tests. Adopt current explicit Data API grants rather than platform defaults.
- [ ] Add repeatable database/function test scripts and CI integration. A real
  PostgreSQL run is required; absence of Docker/authorized dev project blocks
  completion rather than becoming a waiver.

**Evidence:** contract suite 5/5, root typecheck/lint and structural pgTAP
files are present. Supabase lint/pgTAP execution is blocked by the missing
Docker-backed database.

**Out of scope:** business aggregate coverage beyond a tracer fixture, final Auth
screens, production project linking/deployment.

## M7-02 — Enrol a local store and add crash-safe client sync state

**Status:** First-owner pilot app path implemented in source; real transport/auth evidence remains open. **Dependency:** M7-01.
**Delivers:** an authenticated owner can bind one existing local-only store safely,
and the app can retain retry/cursor/conflict state across restart.

- [ ] Add an idempotent first-owner enrolment transaction for the existing
  domain user/store/owner-member/device IDs. Bind verified auth subject exactly
  once; reject attempts to claim an already-bound store or inject another store.
- [x] Add additive SQLite migration(s) for store cursor/bootstrap state, remote
  versions, durable conflicts and outbox lease/retry metadata without rewriting
  migrations 1–17 or pending envelopes.
- [x] Build an injected authenticated-session/transport boundary and worker with
  one-active-run guard, stale-lease recovery, bounded batches/backoff/jitter,
  acknowledgement handling and permanent versus retryable errors.
- [x] Build paginated pull application transactions: validate page, preserve
  pending local work, apply echo safely, persist conflicts and advance cursor
  only after commit.
- [x] Add honest compact sync status/diagnostics and manual retry without exposing
  outbox/revision jargon in ordinary flows. Offline or expired tokens pause cloud
  work but never local completion.

**Evidence:** More → Cloud sync invokes the worker, shows waiting work/conflicts
and offers retry; the pilot integration test proves owner IDs reach enrolment and
the worker. Real enrolment authorization/transport tests remain pending.

**Out of scope:** final onboarding/invitation/multi-store UI.

## M7-03 — Synchronize completed Sale end to end

**Status:** Implemented in source; real server integration gate blocked. **Dependencies:** M7-01 and M7-02.
**Delivers:** one offline completed sale reaches the server once and returns by
pull/echo without duplicating inventory or financial effects.

- [x] Add normalized server sale, items, payment, optional customer/receivable,
  inventory-event, batch-allocation and immutable cost-snapshot application from
  versioned sale envelopes. Revalidate exact arithmetic, immutable snapshots,
  store ownership and package/product references server-side.
- [x] Apply sale graph, inventory/batch/cost effects, applied-operation result,
  revision and change records in one PostgreSQL transaction.
- [x] Make identical operation/entity replay return `ALREADY_APPLIED`; reject
  different immutable content under reused IDs. Preserve two genuine concurrent
  offline sales and a negative/discrepancy projection where required by D-013.
- [x] Pull/echo into a second local database without rerunning sale effects or
  overwriting local pending work.

**Evidence:** server graph migrations and local echo/conflict tests are present;
timeout-after-commit, two-device, cross-store and real PostgreSQL cases are
pending the integration environment.

**Out of scope:** voids, returns, split tender, receivable settlement.

## M7-04 — Synchronize Purchase, inventory, batch and costing facts

**Status:** Implemented in source; real server integration gate blocked. **Dependency:** M7-03.
**Delivers:** a completed restock and its accepted M5 batch/cost extensions move
atomically between devices without changing historical meaning.

- [x] Apply completed purchase, items, optional supplier, inventory events,
  private price observations, batch groups/operations/entries and immutable cost
  movements/snapshots atomically from legacy/current envelope versions.
- [x] Preserve exact D-034 quantities and D-038 rational cost values. FEFO batch
  projection remains separate from financial costing; unknown stock and negative
  stock remain valid first-class states.
- [x] Define deterministic server projection/rebuild ordering for accepted
  immutable movements and surface unresolved cost/batch coverage instead of
  inventing certainty after concurrent device work.
- [x] Pull purchases and dependent reference/fact rows in safe dependency order;
  replay and echo never duplicate inventory, observations or cost.

**Evidence:** sale/purchase graph, cost/batch validation and deterministic
rebuild migrations are present; real database and two-device evidence is
pending.

**Out of scope:** payables, batch financial costing, strict traceability.

## M7-05 — Synchronize mutable catalogue, package and store configuration

**Status:** Pilot conflict review/resolution implemented in source; real server evidence remains open. **Dependency:** M7-04.
**Delivers:** catalogue/config edits use explicit versions and visible conflicts
instead of last-write-wins.

- [x] Cover product creation/identity/lifecycle, identifier addition, package
  create/update/deactivation, preferred store package, reorder level/history and
  supplier metadata under the approved ownership and cross-symbology uniqueness
  rules.
- [x] Populate and require `baseServerVersion` for existing mutable records.
  Apply only compatible edits; return current record/version on conflict and
  retain the original local operation plus durable conflict.
- [x] Protect immutable package conversions/historical snapshots and stale-cart
  sales. Concurrent deactivation or metadata change cannot erase a genuine
  completed transaction.
- [x] Add bounded conflict review/resolution that creates a new operation against
  the latest version. Owner-only high-impact settings remain enforced.

**Evidence:** catalogue history, conversion snapshots and durable conflict
storage are present. Owner pilot tests prove explicit cloud/local choice,
versioned re-enqueue, rejected-operation preservation, newer-version refusal
and quarantine of a pending local edit. Real server authorization/isolation
tests are pending.

**Out of scope:** shared-catalogue consolidation, staff permission management.

## M7-06 — Synchronize M5 reconciliation, checks and attention

**Status:** Implemented in source; real server semantic tests remain open. **Dependency:** M7-05.
**Delivers:** batch classification, adjustments, blind checks and attention state
retain their audit meaning across devices.

- [x] Apply inventory adjustments, batch classifications and finalized
  reconciliation graphs with actor/source links, immutable submissions,
  inventory/batch/cost effects and one applied operation.
- [x] Recheck inventory-event and batch-operation watermarks. A stale physical
  count becomes a conflict and never overwrites intervening work.
- [x] Synchronize check and attention settings with optimistic versions;
  synchronize assignments, attempts and snoozes as auditable facts with stable
  idempotency and owner authorization.
- [ ] Preserve inferred-versus-physical evidence labels, unknown composition,
  actual expired removal and condition-driven attention semantics on pull.

**Evidence:** M5 fact validation/projection migration and local persistence
boundaries are present; concurrent watermark, cross-store and semantic parity
tests require the real database gate.

**Out of scope:** M11 staff assignment/reviewer policy, background notifications.

## M7-07 — Synchronize money-out and prove consistent bootstrap

**Status:** Bootstrap reconstruction corrected in source; real server and device evidence remain open. **Dependency:** M7-06.
**Delivers:** expenses/withdrawals deduplicate and a newly authorized installation
can reconstruct the accepted M1–M6 private store state.

- [x] Apply expenses and owner withdrawals as immutable owner-authorized facts;
  preserve exact store currency, actor/device/time and separation from purchases
  or each other.
- [ ] Build a consistent paginated bootstrap snapshot with its matching revision.
  Restore dependencies, immutable history, current projections, mutable versions
  and sync metadata into a fresh SQLite database, then start incremental pull.
  The former latest-document query lost earlier creation facts after edits;
  operation-history pagination now preserves them in local source tests.
- [x] Register a later device only for an authorized member. Interrupted
  bootstrap restarts safely; a failed snapshot never becomes the active store.
- [x] Protect unsynced local work during full resync/logout/reset paths and state
  clearly that only server-acknowledged records are recoverable after uninstall.

**Evidence:** finance/bootstrap migrations, audit metadata, a fresh second-
database create/edit two-page regression and a new fixed-snapshot pgTAP test are
present. The pgTAP test and real server authorization remain unrun.

**Out of scope:** final multi-store selector, invitation UI, production recovery
support process.

## M7-08 — Harden, validate and stop for independent audit

**Status:** Local PostgreSQL/endpoint and stale-reconciliation checks pass; native checks remain open. **Dependency:** M7-01 through M7-07.
**Delivers:** a recoverable M7 handoff with actual server integration evidence.

- [ ] Run all required scenarios in `OFFLINE_SYNC.md`: restart/crash boundaries,
  commit-before-ack, pagination, unsupported versions, revoked user/device,
  tampered cross-store IDs, duplicate/reused IDs and two-device conflicts.
- [x] Run Supabase reset/migrations, database lint/advisors where available,
  pgTAP/RLS and Edge Function integration tests against local Docker or an
  explicitly authorized isolated hosted development project. Do not substitute
  mocks for this gate.
- [x] Run focused suites, full `npm run validate`, Expo Doctor, dependency check,
  Android export, workflow/index/artifact/migration checks and `git diff --check`.
- [x] Update tickets, PROJECT_STATE and M7 workflow with actual commits/commands,
  server migrations, residual risks and clean branch/HEAD/status. Stop for
  independent audit; do not start M8, push, deploy or claim physical-device work.

**Current evidence:** `npm run validate` passed 503 tests across 52 suites,
strict typecheck and zero-warning lint. Expo Doctor 21/21, Expo dependency
check and Android export passed. Local reset, pgTAP (81 assertions), scoped
lint, security advisors and `npm run test:sync:local` passed. The endpoint
script covers core replay, bootstrap, store denial, and the D-044 stale-count
conflict. Physical-device sync remains unverified.

**Out of scope:** production Supabase migration, App Store/Play deployment,
physical-device release acceptance, M8 code.

## Dependency frontier

```text
M6 accepted -> M7-01 -> M7-02 -> M7-03 -> M7-04
            -> M7-05 -> M7-06 -> M7-07 -> M7-08 -> independent audit
```

The coordinator owns plan/ticket decisions and independent acceptance. One M7
implementation task owns this checkout sequentially. M8 planning may occur in a
separate worktree, but production M8 and shared-contract edits wait for accepted
M7.
