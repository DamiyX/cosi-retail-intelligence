# Tickets: M7 Offline Sync

M7 implements the controlled custom sync protocol in
`docs/engineering/M7_OFFLINE_SYNC_PLAN.md`. The accepted M1–M6 local-write-first
behavior remains authoritative. Do not start M8 production integration.

## Implementation handoff and independent audit — 2026-09-28

Local Docker/Supabase reset, 81 pgTAP assertions, scoped lint, security
advisors and live Auth/Edge Function/PostgreSQL integration now pass. The
earlier Docker blocker described below is resolved. The server now rejects a
physical reconciliation made stale by another device's inventory/batch
operation under D-044. The Galaxy A15 check installed the rebuilt development
APK in place, enrolled against local Supabase, retained a queued restock through
a cold-started connection failure, then synchronized it after reconnection.
Purchase/sale pull graph corrections passed root validation (505 tests across
52 suites). Additive migration 22 and the cost-projection rebuild then allowed
concurrent same-product local orders without losing either sale. Two independent
SQLite databases converged on final stock, batch and cost state. Delegated root
validation passed 507 tests across 52 suites; coordinator focused tests,
typecheck and lint passed after final stock/batch assertions. The cost
correction and M5 pull parity passed independent review. Local database CI is
configured but has not run on GitHub. M7-07 historical actor/device bootstrap
and later pull pass local source checks under D-045. The reviewed audit
corrections are committed as
`9c230f1d641edc4b8aae5dc05a7f54977fec4edc` on `feat/m7-offline-sync`; there
are no staged or unstaged changes. Generated root `app.json` remains untracked
and excluded. Independent source acceptance is complete. No
physical sale or two-phone convergence was performed in the M7 device run.
See `docs/engineering/M7_INDEPENDENT_AUDIT.md`.

M7-01 through M7-08 source work is committed sequentially on
`feat/m7-offline-sync`: `66507e6`, `74b2053`, `6a15692`, `f411b0c`,
`ecb1c21`, `f60c348`, `1b3236d`, `e9ef793`. The provider-independent contracts,
SQLite sync state/worker, authenticated Supabase transport, server migrations,
RLS/grants, Edge Function shells, operation projections, conflict records and
bootstrap cursor handling are present.

The initial implementation handoff passed 51 suites/484 tests while Docker
was unavailable. That is superseded by the local PostgreSQL and phone evidence
above. Independent audit corrected operation-history bootstrap, pilot sync
entry, sale/purchase pull materialization and concurrent-device costing. See
`docs/engineering/M7_INDEPENDENT_AUDIT.md`. No M8 work
is authorized.

## M7-01 — Establish the secure protocol and server transaction spine

**Status:** Implemented; local PostgreSQL, Auth and endpoint checks passed. **Basis:** M6 source/automated scope independently accepted.
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
- [x] Add repeatable database/function test scripts and CI integration. A real
  PostgreSQL run is required; absence of Docker/authorized dev project blocks
  completion rather than becoming a waiver.

**Evidence:** local Supabase reset, 81 pgTAP assertions, scoped lint, security
advisors and Auth/Edge/Postgres integration passed. The dedicated Ubuntu CI
job is configured in `.github/workflows/validate.yml`; no remote CI run is
claimed until the branch is pushed.

**Out of scope:** business aggregate coverage beyond a tracer fixture, final Auth
screens, production project linking/deployment.

## M7-02 — Enrol a local store and add crash-safe client sync state

**Status:** First-owner pilot app path implemented; local Auth/transport and one-phone queued retry passed. **Dependency:** M7-01.
**Delivers:** an authenticated owner can bind one existing local-only store safely,
and the app can retain retry/cursor/conflict state across restart.

- [x] Add an idempotent first-owner enrolment transaction for the existing
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
the worker. Local Auth/Edge/Postgres tests passed idempotent first-owner
enrollment and denial of a different owner; the Galaxy local-backend run
enrolled and retried a queued restock.

**Out of scope:** final onboarding/invitation/multi-store UI.

## M7-03 — Synchronize completed Sale end to end

**Status:** Implemented; local server integration and two-database concurrent-sale checks passed. **Dependencies:** M7-01 and M7-02.
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

**Status:** Implemented; local server integration, remote purchase pull and cost/batch reconstruction checks passed. **Dependency:** M7-03.
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

**Status:** Pilot conflict review/resolution implemented; local server stale-edit evidence passed. **Dependency:** M7-04.
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

**Status:** Implemented; local stale-reconciliation server tests passed. **Dependency:** M7-05.
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
- [x] Preserve inferred-versus-physical evidence labels, unknown composition,
  actual expired removal and condition-driven attention semantics on pull.

**Evidence:** local server stale-count tests passed. The M5 pull regression
materializes receipt and physical groups, unknown residual, attention snooze
and expired-stock removal as a real inventory event. A required materializer
dependency-order correction passed a failing-before/passing-after test.

**Out of scope:** M11 staff assignment/reviewer policy, background notifications.

## M7-07 — Synchronize money-out and prove consistent bootstrap

**Status:** Source and local-server restore checks pass under D-045; handoff commit `9c230f1d641edc4b8aae5dc05a7f54977fec4edc` has independent source acceptance. Physical release checks remain. **Dependency:** M7-06.
**Delivers:** expenses/withdrawals deduplicate and a newly authorized installation
can reconstruct the accepted M1–M6 private store state.

- [x] Apply expenses and owner withdrawals as immutable owner-authorized facts;
  preserve exact store currency, actor/device/time and separation from purchases
  or each other.
- [x] Build a consistent paginated bootstrap snapshot with its matching revision.
  Restore dependencies, immutable history, current projections, mutable versions
  and sync metadata into a fresh SQLite database, then start incremental pull.
  The former latest-document query lost earlier creation facts after edits;
  operation-history pagination now preserves them in local source tests.
- [x] Register a later device only for an authorized member. Interrupted
  bootstrap restarts safely; a failed snapshot never becomes the active store.
- [x] Protect unsynced local work during full resync/logout/reset paths and state
  clearly that only server-acknowledged records are recoverable after uninstall.

**Evidence:** D-045 server-authoritative reference context and additive SQLite
staging, a different-device multi-page M1–M6 restore, interrupted/rollback
tests, delayed pull from newly registered and later-revoked origins, 92 pgTAP
assertions, and live local Auth/Edge/Postgres checks passed. See
`docs/engineering/M7_INDEPENDENT_AUDIT.md` for the independent trace and
physical limits.

**Out of scope:** final multi-store selector, invitation UI, production recovery
support process.

## M7-08 — Harden, validate and stop for independent audit

**Status:** Independently accepted for local source scope after committed D-045 correction and Git handoff `9c230f1d641edc4b8aae5dc05a7f54977fec4edc`. Remote CI and physical two-phone checks remain release gates. **Dependency:** M7-01 through M7-07.
**Delivers:** a recoverable M7 handoff with actual server integration evidence.

- [x] Run source and local-server scenarios in `OFFLINE_SYNC.md`: restart/crash boundaries,
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

**Current evidence:** audited source handoff committed as
`9c230f1d641edc4b8aae5dc05a7f54977fec4edc` on `feat/m7-offline-sync`; the
working tree has no staged or unstaged changes except generated root
`app.json`, which remains untracked and excluded. Coordinator
`npm run validate` passed 515 tests across 57 suites, strict typecheck and
zero-warning lint. `npm run test:sync:local`
and `npx supabase test db` passed (92 assertions/10 files). Prior Expo Doctor
21/21, dependency check and Android export passed. Local database lint and
security advisors passed in Luna's D-045 handoff; remote CI has not run.
Galaxy A15 local-backend enrollment, queued-restock retention and retry passed
earlier; the installed app's later failure to open needs diagnosis. A physical
sale and second-device phone pull remain unverified.
The scenario ledger is supported by `m7Sync.test.ts` (lease/restart, pull
cursor, interrupted bootstrap, conflicts), contract version tests,
`m7ConcurrentCosting.test.ts` (two independent local databases),
`m7PullReferences.test.ts` (late origins), pgTAP authorization/snapshot tests
and the live local script (identical replay, conflicting ID reuse, cross-store
denial, stale cross-device reconciliation). These are automated source/local
server checks, not physical two-phone or release evidence.
The staged `git diff --cached --check` reported one extra blank line at EOF in
`apps/mobile/__tests__/m7Pilot.test.ts`; it was preserved with the reviewed
source change and did not alter test behavior.

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
