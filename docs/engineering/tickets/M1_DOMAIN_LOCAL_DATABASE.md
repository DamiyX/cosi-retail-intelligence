# Archived Tickets: M1 Domain + Local Database Foundation

**Archived:** 2026-09-14 after independent re-audit  
**Outcome:** Accepted on automated/source evidence with a founder-approved
Galaxy A15 5G device-check waiver. The native restart check remains mandatory
before external beta/native release readiness.

These tickets establish the smallest durable local foundation needed by M2 and
later business features. The founder delegated ticket granularity and dependency
decisions to the engineering planner on 2026-09-14.

## Execution Contract

- Execute one ticket at a time in numeric order unless its declared dependencies
  allow a safe independent start.
- Keep typecheck, lint, and existing tests green after every ticket.
- Mark a checkbox complete only when the named evidence exists.
- Update this file and the active workflow record as work progresses.
- Stop after M1-05 and return the milestone for independent audit. Do not start
  M2 until that audit passes and M2 tickets are published.
- Begin feature implementation only on `feat/m1-domain-local-database` created
  from the accepted M0/context baseline. Do not add M1 code to
  `chore/m0-foundation`.

## M1 Boundary Decisions

- Use the approved explicit SQL migration and typed-repository approach. Do not
  add Drizzle or another ORM without an approved architecture decision.
- M1 implements a domain-neutral package-conversion utility. ProductVariant,
  PackageUnit, StoreProduct, temporary products, and catalogue behavior remain
  M2 scope.
- M1 establishes the reusable SQLite transaction boundary but has no completed
  synchronizable business aggregate. M2 must add the durable outbox schema and
  atomic enqueue behavior before its first mutable catalogue operation is
  considered complete.
- Auth screens, Supabase linkage, remote schema, synchronization workers,
  catalogue, sales, inventory, recognition, and final visual design are outside
  M1.
- Local database encryption remains required before real external beta data, as
  specified by the technical architecture; it is not introduced by M1.

## Ticket M1-01: Produce exact, portable commerce values

**Status:** Done (commit `a7b5c18`; typecheck, lint, and 92 workspace tests green)  
**What to build:** Add a pure TypeScript domain package whose public API creates
globally unique client IDs, performs authoritative money operations without
binary floating-point arithmetic, and converts package counts to base inventory
units exactly. The mobile workspace must be able to consume the package without
React Native or database dependencies.  
**Blocked by:** None

**Out of scope:** Product/package persistence, costing policy, currency
conversion, formatting-heavy UI, and ProductVariant or PackageUnit entities.

- [x] Automated tests prove UUID validity/uniqueness, integer-minor-unit money
      operations, and explicit rejection of invalid or unsafe values.
- [x] Automated tests prove exact package-to-base conversion for representative
      units and reject non-positive conversion factors or invalid quantities.
- [x] The mobile workspace imports the package through its public entry point,
      and workspace typecheck, lint, and tests remain green.

## Ticket M1-02: Open and safely upgrade a durable local database

**Status:** Done (commit `2d303e9`; expo-sqlite 57.0.3 matches the Expo 57 pin; `expo install --check` passes)  
**What to build:** Integrate the Expo-compatible SQLite dependency, create one
explicit database boundary, enable and verify foreign keys and WAL where the
deployed runtime supports them, and run ordered transactional migrations with a
persisted schema version. Include reusable isolated-database test utilities.  
**Blocked by:** None

**Out of scope:** Business tables beyond migration metadata, remote migrations,
Supabase access, production encryption keys, ORM adoption, and deleting/resetting
a database to recover from a migration error.

- [x] A fresh database reaches the expected schema version and reports the
      required foreign-key setting plus the verified journal mode.
- [x] Reopening an up-to-date database is idempotent: no migration reruns, schema
      drift, or data loss occurs.
- [x] An intentionally failing migration rolls back completely, preserves the
      prior version/data, and returns a diagnosable error without resetting the
      database.

## Ticket M1-03: Persist a valid local store operating context

**Status:** Done (commit `adac3b4`; migration 001; all repository tests green)
**Blocked by:** M1-01 and M1-02 (both complete)  
**What to build:** Introduce only the near-term Store, User, StoreMember, and
Device domain records, their first real migration, and typed parameterized
repositories. Demonstrate creation and retrieval of a minimal valid store
membership/device graph using client-generated IDs.
**Out of scope:** Supabase Auth, invitations, multiple-store switching UI,
staff-role expansion beyond the documented minimum, cloud RLS, catalogue
entities, and speculative fields for later milestones.

- [x] A repository-level integration test creates a valid Store/User/StoreMember/
      Device graph and reads the same typed values through public repository
      interfaces.
- [x] Foreign-key and uniqueness violations reject invalid membership/device
      data without leaving partial rows.
- [x] Values containing quotes or SQL-like text round-trip as data through
      parameterized statements, and the graph remains available after closing
      and reopening the database.

## Ticket M1-04: Commit or roll back a complete local work unit

**Status:** Done (commit `e0d4464`; provision operation tested for commit, injected-failure rollback, and typed errors)
**Blocked by:** M1-02 and M1-03 (both complete)  
**What to build:** Add the reusable application/database transaction helper and
use it in a small store-context operation that performs multiple repository
writes. The caller must receive success only after the SQLite commit completes.

**Out of scope:** A feature-specific outbox protocol, sync transport, retries,
conflict resolution, sales, purchases, inventory events, or nested-transaction
abstractions without a demonstrated M1 need.

- [x] The success-path integration test commits every expected row as one unit
      and the result remains after database reopen.
- [x] A deterministic failure injected after an intermediate write leaves none
      of the operation's rows committed and preserves unrelated prior data.
- [x] The transaction helper propagates a useful typed/domain error and no
      repository or UI caller can report completion before commit succeeds.

## Ticket M1-05: Prove M1 during application startup and Android restart

**Status:** Accepted after independent re-audit; device check waived as an M2
entry blocker and carried before external beta/native release readiness
**Blocked by:** M1-01, M1-02, M1-03, and M1-04 (all complete)  
**What to build:** Initialize the versioned local database through the mobile
application startup boundary, surface initialization failure to the existing
technical shell without inventing final product UI, and gather the complete M1
acceptance evidence on the reference Android device.

**Out of scope:** Final onboarding, navigation redesign, production data,
Supabase sign-in, background sync, catalogue screens, and design-system choices.

- [x] Fresh-install and existing-database automated paths both reach application
      readiness, while a migration failure prevents a false ready/completed
      state and exposes a diagnosable recovery state.
- [x] Clean-install validation, typecheck, lint, all automated tests, Expo
      Doctor, and Android export pass with no committed secret or generated
      database/build artifact.
- [ ] On the Galaxy A15 5G development build, a force-stop/relaunch opens the
      migrated database successfully; the milestone report records exact manual
      evidence, limitations, ticket results, and updated project/workflow state.
      WAIVED AS M2 ENTRY BLOCKER 2026-09-14: the founder approved proceeding
      while the phone is unavailable. The check is not passed; a new build plus
      force-stop/relaunch evidence remains mandatory before external beta/native
      release readiness.

## Dependency Frontier

    M1-01 Exact commerce values ─────────────┐
                                             ├──> M1-03 Store context
    M1-02 Durable database ──────────────────┘          |
           |                                            v
           └────────────────────────────────────> M1-04 Atomic work unit
                                                        |
                                                        v
                                               M1-05 Android acceptance

M1-01 and M1-02 are the initial frontier. They may be implemented in either
order by one writer. Separate concurrent writers require separate worktrees and
must not modify shared workspace configuration independently.

## Audit correction record (2026-09-14, commit `6650f82`)

The independent audit rejected M1 with four P1 and one P2 finding. All five
are corrected on this branch; the Galaxy device gate remains the only open
acceptance item:

1. Migration runner now validates the full applied history (versions and
   names) as an exact contiguous registry prefix and rejects fabricated,
   gapped, or over-new histories with typed errors. Regression tests:
   fabricated name, unexpected later version, missing first migration.
2. The synchronous transaction contract rejects async callbacks at compile
   time (`SyncWork`) and rolls back with `INVALID_TRANSACTION_USE` at
   runtime via a shared runner used by both adapters. Contract tests cover
   the runner, the node driver, and the type-level rejection.
3. ID generation is injectable: domain exposes pure `formatUuidV4` plus
   `createIdGenerator`; `provisionStoreContext` accepts a generator; the
   Android provider uses `expo-crypto@57.0.3` (Expo 57 pin, `expo install
   --check` clean, no new audit findings). Real Android entropy plus the
   native rebuild still require the deferred device session.
4. `initializeAppDatabase` now fails with `FOREIGN_KEYS_NOT_ENFORCED` when
   foreign keys cannot be enabled; WAL stays informational. Regression test
   proves a false ready state is impossible.
5. Integer-only package semantics are documented as provisional/discrete-only
   and gated by new deferred decision DF-010, which blocks M2 PackageUnit
   persistence until fractional representation is reviewed.

Evidence after corrections: typecheck clean, zero-warning lint, 87 domain +
42 mobile tests green, Expo Doctor 21/21, `expo install --check` clean,
Android export passes, `npm audit` unchanged (1 low, 21 moderate,
pre-existing). The independent re-audit then fixed the mobile-default UUID path
and escaped async-continuation write risk; 130 tests, typecheck, lint, dependency
compatibility, and Android export pass. M1 is accepted with the explicit device
waiver described above.
