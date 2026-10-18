# M9 integration into the current retail application

Status: coordinator-prepared correction/integration packet; implementation
authorized by the founder's October3 M9-through-M11 request. Coordinator audit
and acceptance remain required. Physical gates are explicitly pending.

## Verified starting point

- Destination: COSI-m8-planning, branch plan/m8-unified-scanner,
  HEAD66ea3fc22595a48d7355d1729bb879496cc98896 plus existing preserved work.
- Accepted M7 local source is inherited from c817edb. Current scanner/photo,
  exact basket accumulation, discount summary and Track B R0–R4 preparation
  must survive this integration. Track B has no real model/runtime adoption.
- Source reference: COSI-m9-planning, branch plan/m9-price-intelligence,
  HEAD1c8de0d plus preserved local Expo/evidence changes. The coordinator's
  audit is M9_COORDINATOR_AUDIT.md in that checkout.
- The older COSI-m9-integration-audit checkout contains mixed staged/unstaged
  M7/M9 experiments. It is read-only reference, not a safe integration baseline.
  Its drafted m9SyncIntegration test is an idea, not current passing evidence.

This is completion of M9-04's integration gate, not a new product milestone.
Do not reset, stash, checkout another branch, replace the destination wholesale,
merge/cherry-pick old branches, or commit unrelated existing work.

## Outcome and unchanged contract

Owners see their own immutable recorded restock-cost changes in product detail,
a Personal price changes route and one compact Home card of at most three
changed products. Use exact rational BigInt arithmetic, deterministic observed/
created/ID ordering, same-package/same-currency preference and explicit normalized
base-unit fallback. Zero previous cost has no percentage; unchanged and zero/
one/invalid observation states remain honest. ESTIMATED/UNAVAILABLE observations
remain history and cannot create exact change claims.

Both comparison and full product purchase-history reads require active OWNER
membership, rechecked on every read. Every query is scoped to storeId, with
negative STAFF/cross-store/direct-ID tests. Generic catalogue clients must not
retain the old raw purchase-history bypass. M11 will define later permissions.

M9 is a derived read model. It adds no business write, outbox family, migration,
consent, market data, costing rule or recognition change. It cannot enable live
catalogue suggestions or scanner associations. Recorded purchase cost is not
market price, profit or a selling-price recommendation.

## Smallest integration and ownership

Reuse the audited isolated domain module, personal-price client/presentation,
price-observation read seam and list route. Integrate individual compatible
changes into current Home/product/detail/navigation and shared consumers;
never replace current screens with old versions. Retain scanner entry points,
photo controls/previews, temporary-product presentation, discount totals,
current sync binding and all current migrations. Preserve current installed
SDK manifest/lockfile; the old dependency patches must not be copied here.

Implementation may modify only the domain personal-price module/export/tests,
mobile priceIntelligence modules, price-observation read repository/export,
Home/product-detail/personal-price screens and corresponding Products/Today
routes, catalogue's legacy purchase-history method and its consumers/test
stubs, relevant M9/Home/navigation/product regression tests, and this task's
handoff/ticket/workflow/project-state evidence. A minimal SellScreen test-stub
adaptation is permitted solely to remove the legacy catalogue method; existing
scan/basket/payment logic is protected. Any additional production boundary
requires a stopped explanation before modification.

Recognition lab, scanner source/assets, camera/audio/photo services, contracts,
sync engine, database migrations, purchases/sales/inventory/finance domain,
all package manifests/lockfiles, native config, backend and secrets are protected.
Record initial hashes and status, and prove protected content is unchanged at
handoff, including all existing untracked recognition files. Do not touch the
phone, reload Metro, collect photos, start Docker or create a build job.

## Compatibility proof

Exercise current M7 applySyncPullPage/materializeSyncOperation over real local
SQLite databases with distinct origin/receiver device identities and valid
accepted reference context. Imported purchase observations must be visible to
the owner comparison after refresh and restart alongside unsynced local
observations. Re-delivery and the local acknowledgement echo must not duplicate
history or Home/list signals. Assert store isolation and owner restrictions
through these reads; history and stored facts remain unchanged by reading.

This local test proves client integration, not a live Auth/Edge/PostgreSQL or
physical-device pass. Preserve M7's existing live evidence as historical and
mark any newly unrun live/native checks pending. Do not mock the M9 comparison
or SQLite persistence boundary and claim integration proved.

## Verification and return

Run focused domain/M9 client, sync compatibility, Home/product/list/navigation
and affected stub checks; all workspace typecheck and zero-warning lint;
then the documented full validate, Expo Doctor, dependency check and Android
export. If a check fails or is unavailable, record its actual result and stop
with a concrete limitation; do not hide tests or alter dependency exclusions.

Migrations1–26, immutable purchases/costing and business-sync photo exclusion
remain unchanged. Test an existing populated database upgraded with the current
registry through existing fixtures; no M9 migration/backfill is intended.

Use M9_INTEGRATION_TICKETS.md as this task's ledger. Preserve root tickets.md,
which still records M8. Update only the M9 integration paragraph in PROJECT_STATE
and this task's workflow; do not rewrite Track B/M8 evidence. Return exact changed
files, tests/exits/counts/skips, protected-hash comparison, status and limitations
in M9_INTEGRATION_HANDOFF.md. Stop all commands and edits before report-back.
The main coordinator audits and accepts; the implementer cannot mark acceptance
or begin M10/M11. No automatic model escalation, Git push/merge or external effect.
