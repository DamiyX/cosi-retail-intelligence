# Tickets: M7 Offline Sync

M7 implements the controlled custom sync protocol in
`docs/engineering/M7_OFFLINE_SYNC_PLAN.md`. The accepted M1–M6 local-write-first
behavior remains authoritative. Do not start M8 production integration.

## M7-01 — Establish the secure protocol and server transaction spine

**Status:** Planned. **Basis:** M6 source/automated scope independently accepted.
**Delivers:** versioned protocol contracts and a testable authenticated Supabase
boundary capable of one atomic, revisioned store operation.

- [ ] Add provider-independent push/pull/bootstrap DTOs with explicit protocol
  and payload versions, bounded request/page sizes, canonical decimal strings,
  typed acknowledgements/errors and runtime validation. Reject unknown versions.
- [ ] Add imperative Supabase migrations for auth-subject mapping, stores,
  memberships, devices, per-store sync state, applied operations, change log and
  the minimum normalized domain foundation. Use UUID/timestamptz, exact numeric
  quantity/rational values and integer minor-money types, plus constraints,
  foreign-key/query indexes and deterministic lock order.
- [ ] Add authenticated Edge Function shells and one transactional PostgreSQL
  application boundary. Verify JWT, active membership, device/store relation,
  operation permission and cross-store references; serialize each store revision
  and keep service credentials server-only.
- [ ] Revoke ambient access, use explicit grants, enable RLS on exposed tables,
  pin privileged-function search paths and add positive/negative pgTAP policy
  tests. Adopt current explicit Data API grants rather than platform defaults.
- [ ] Add repeatable database/function test scripts and CI integration. A real
  PostgreSQL run is required; absence of Docker/authorized dev project blocks
  completion rather than becoming a waiver.

**Evidence:** focused contract tests, clean Supabase reset/migration, database
lint/advisors where available, pgTAP RLS suite, function tests, typecheck and
zero-warning lint.

**Out of scope:** business aggregate coverage beyond a tracer fixture, final Auth
screens, production project linking/deployment.

## M7-02 — Enrol a local store and add crash-safe client sync state

**Status:** Planned. **Dependency:** M7-01.
**Delivers:** an authenticated owner can bind one existing local-only store safely,
and the app can retain retry/cursor/conflict state across restart.

- [ ] Add an idempotent first-owner enrolment transaction for the existing
  domain user/store/owner-member/device IDs. Bind verified auth subject exactly
  once; reject attempts to claim an already-bound store or inject another store.
- [ ] Add additive SQLite migration(s) for store cursor/bootstrap state, remote
  versions, durable conflicts and outbox lease/retry metadata without rewriting
  migrations 1–17 or pending envelopes.
- [ ] Build an injected authenticated-session/transport boundary and worker with
  one-active-run guard, stale-lease recovery, bounded batches/backoff/jitter,
  acknowledgement handling and permanent versus retryable errors.
- [ ] Build paginated pull application transactions: validate page, preserve
  pending local work, apply echo safely, persist conflicts and advance cursor
  only after commit.
- [ ] Add honest compact sync status/diagnostics and manual retry without exposing
  outbox/revision jargon in ordinary flows. Offline or expired tokens pause cloud
  work but never local completion.

**Evidence:** fresh/populated-v17 migration tests, restart/lease/ack/pull crash
checks, enrolment replay and hostile ownership tests, component status tests,
typecheck and zero-warning lint.

**Out of scope:** final onboarding/invitation/multi-store UI.

## M7-03 — Synchronize completed Sale end to end

**Status:** Planned. **Dependencies:** M7-01 and M7-02.
**Delivers:** one offline completed sale reaches the server once and returns by
pull/echo without duplicating inventory or financial effects.

- [ ] Add normalized server sale, items, payment, optional customer/receivable,
  inventory-event, batch-allocation and immutable cost-snapshot application from
  versioned sale envelopes. Revalidate exact arithmetic, immutable snapshots,
  store ownership and package/product references server-side.
- [ ] Apply sale graph, inventory/batch/cost effects, applied-operation result,
  revision and change records in one PostgreSQL transaction.
- [ ] Make identical operation/entity replay return `ALREADY_APPLIED`; reject
  different immutable content under reused IDs. Preserve two genuine concurrent
  offline sales and a negative/discrepancy projection where required by D-013.
- [ ] Pull/echo into a second local database without rerunning sale effects or
  overwriting local pending work.

**Evidence:** offline push, timeout-after-commit retry, two-device final-stock,
cross-store/tampered payload, echo/restart and immutable-content conflict tests;
typecheck and zero-warning lint.

**Out of scope:** voids, returns, split tender, receivable settlement.

## M7-04 — Synchronize Purchase, inventory, batch and costing facts

**Status:** Planned. **Dependency:** M7-03.
**Delivers:** a completed restock and its accepted M5 batch/cost extensions move
atomically between devices without changing historical meaning.

- [ ] Apply completed purchase, items, optional supplier, inventory events,
  private price observations, batch groups/operations/entries and immutable cost
  movements/snapshots atomically from legacy/current envelope versions.
- [ ] Preserve exact D-034 quantities and D-038 rational cost values. FEFO batch
  projection remains separate from financial costing; unknown stock and negative
  stock remain valid first-class states.
- [ ] Define deterministic server projection/rebuild ordering for accepted
  immutable movements and surface unresolved cost/batch coverage instead of
  inventing certainty after concurrent device work.
- [ ] Pull purchases and dependent reference/fact rows in safe dependency order;
  replay and echo never duplicate inventory, observations or cost.

**Evidence:** legacy/current envelope, replay, timeout, two-device purchase/sale,
unknown-batch, rational-cost, cross-store and rebuild tests; typecheck and lint.

**Out of scope:** payables, batch financial costing, strict traceability.

## M7-05 — Synchronize mutable catalogue, package and store configuration

**Status:** Planned. **Dependency:** M7-04.
**Delivers:** catalogue/config edits use explicit versions and visible conflicts
instead of last-write-wins.

- [ ] Cover product creation/identity/lifecycle, identifier addition, package
  create/update/deactivation, preferred store package, reorder level/history and
  supplier metadata under the approved ownership and cross-symbology uniqueness
  rules.
- [ ] Populate and require `baseServerVersion` for existing mutable records.
  Apply only compatible edits; return current record/version on conflict and
  retain the original local operation plus durable conflict.
- [ ] Protect immutable package conversions/historical snapshots and stale-cart
  sales. Concurrent deactivation or metadata change cannot erase a genuine
  completed transaction.
- [ ] Add bounded conflict review/resolution that creates a new operation against
  the latest version. Owner-only high-impact settings remain enforced.

**Evidence:** concurrent price/name/package/reorder edits, stale deactivation
versus sale, barcode ownership collision, conflict restart/resolution, store
isolation and authorization tests; typecheck and lint.

**Out of scope:** shared-catalogue consolidation, staff permission management.

## M7-06 — Synchronize M5 reconciliation, checks and attention

**Status:** Planned. **Dependency:** M7-05.
**Delivers:** batch classification, adjustments, blind checks and attention state
retain their audit meaning across devices.

- [ ] Apply inventory adjustments, batch classifications and finalized
  reconciliation graphs with actor/source links, immutable submissions,
  inventory/batch/cost effects and one applied operation.
- [ ] Recheck inventory-event and batch-operation watermarks. A stale physical
  count becomes a conflict and never overwrites intervening work.
- [ ] Synchronize check and attention settings with optimistic versions;
  synchronize assignments, attempts and snoozes as auditable facts with stable
  idempotency and owner authorization.
- [ ] Preserve inferred-versus-physical evidence labels, unknown composition,
  actual expired removal and condition-driven attention semantics on pull.

**Evidence:** concurrent sale-versus-count, classification-versus-count, expired
removal, duplicate attempts, settings conflict, snooze/worsening, restart and
cross-store tests; typecheck and lint.

**Out of scope:** M11 staff assignment/reviewer policy, background notifications.

## M7-07 — Synchronize money-out and prove consistent bootstrap

**Status:** Planned. **Dependency:** M7-06.
**Delivers:** expenses/withdrawals deduplicate and a newly authorized installation
can reconstruct the accepted M1–M6 private store state.

- [ ] Apply expenses and owner withdrawals as immutable owner-authorized facts;
  preserve exact store currency, actor/device/time and separation from purchases
  or each other.
- [ ] Build a consistent paginated bootstrap snapshot with its matching revision.
  Restore dependencies, immutable history, current projections, mutable versions
  and sync metadata into a fresh SQLite database, then start incremental pull.
- [ ] Register a later device only for an authorized member. Interrupted
  bootstrap restarts safely; a failed snapshot never becomes the active store.
- [ ] Protect unsynced local work during full resync/logout/reset paths and state
  clearly that only server-acknowledged records are recoverable after uninstall.

**Evidence:** expense/withdrawal retry/isolation, concurrent bootstrap mutation,
interrupted bootstrap, fresh second database, subsequent incremental pull,
pending-work protection and derived Home-summary parity tests.

**Out of scope:** final multi-store selector, invitation UI, production recovery
support process.

## M7-08 — Harden, validate and stop for independent audit

**Status:** Planned. **Dependency:** M7-01 through M7-07.
**Delivers:** a recoverable M7 handoff with actual server integration evidence.

- [ ] Run all required scenarios in `OFFLINE_SYNC.md`: restart/crash boundaries,
  commit-before-ack, pagination, unsupported versions, revoked user/device,
  tampered cross-store IDs, duplicate/reused IDs and two-device conflicts.
- [ ] Run Supabase reset/migrations, database lint/advisors where available,
  pgTAP/RLS and Edge Function integration tests against local Docker or an
  explicitly authorized isolated hosted development project. Do not substitute
  mocks for this gate.
- [ ] Run focused suites, full `npm run validate`, Expo Doctor, dependency check,
  Android export, workflow/index/artifact/migration checks and `git diff --check`.
- [ ] Update tickets, PROJECT_STATE and M7 workflow with actual commits/commands,
  server migrations, residual risks and clean branch/HEAD/status. Stop for
  independent audit; do not start M8, push, deploy or claim physical-device work.

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
