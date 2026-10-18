# M9–M11 audit correction handoff

2026-10-03. **STOPPED SOURCE RETURN; COORDINATOR VERIFICATION PENDING.**

C1–C5 and runtime-confirmed guard siblings are repaired. Final repository validation passed (environment/source-only, four-workspace types, zero-warning lint, tests).
This is source self-check evidence, not independent acceptance or whole M11 completion.
The M9 restart timeout cause remains unresolved.

## Source and scope

Checkout: `C:/Users/doyew/Documents/DEV 2/COSI-m8-planning`. Branch:
`plan/m8-unified-scanner`; HEAD:
`66ea3fc22595a48d7355d1729bb879496cc98896`. One writer, existing implementation
chat01a100e8-66eb-77f2-a3bd-26100a36f8de; coordinator01a098ef-d830-7531-bca7-2d66b0a5b587.

Captured context is an internal command option; clients preserve the original
member/enrollment and direct commands capture entry membership. The first
existing callback action rechecks cached ACTIVE authority and exact identity.
The shared options cover sales/purchases, catalogue commands, finance, inventory
adjustment/classification/reconciliation, guided generation/replacement/settings
and attention settings/snooze. Explicit-device semantics remain intact. No
transaction placement, durable payload/history, costing, sync or role changes.
Remote revocation unavailable to an offline cache remains a live limitation.

Domain `timestamps.ts` compares whole seconds plus canonical fraction strings,
retaining all accepted precision and offset equivalence without float money math.
M9 domain comparison and current change-list sorting share it. The independent
raw purchase-history repository reader was not changed; no universal date-reader
claim is made. Owner activity/check SQL computes equivalent read-only sort keys,
retains stored strings and returns at most51 rows. SQL may scan/sort candidate
facts; no native/performance/large-store benchmark was run. No history is loaded
wholesale into JavaScript. UI filters remain canonical UTC-ms; history cursors
accept qualified M7 timestamp precision/offsets.

## Changed source paths

- `apps/mobile/__tests__/m11AuditAuthority.test.ts`
- `apps/mobile/__tests__/m11AuditTimestamps.test.ts`
- `apps/mobile/src/catalogue/client.ts`
- `apps/mobile/src/catalogue/createTemporaryProduct.ts`
- `apps/mobile/src/catalogue/manageLifecycle.ts`
- `apps/mobile/src/catalogue/managePackages.ts`
- `apps/mobile/src/catalogue/updateProductIdentity.ts`
- `apps/mobile/src/catalogue/updateReorderLevel.ts`
- `apps/mobile/src/finance/client.ts`
- `apps/mobile/src/finance/recordExpense.ts`
- `apps/mobile/src/finance/recordOwnerWithdrawal.ts`
- `apps/mobile/src/inventory/adjustInventory.ts`
- `apps/mobile/src/inventory/attention.ts`
- `apps/mobile/src/inventory/classifyBatches.ts`
- `apps/mobile/src/inventory/client.ts`
- `apps/mobile/src/inventory/guidedChecks.ts`
- `apps/mobile/src/inventory/reconcileInventory.ts`
- `apps/mobile/src/priceIntelligence/client.ts`
- `apps/mobile/src/purchases/client.ts`
- `apps/mobile/src/purchases/recordPurchase.ts`
- `apps/mobile/src/sales/client.ts`
- `apps/mobile/src/sales/completeSale.ts`
- `apps/mobile/src/staff/client.ts`
- `apps/mobile/src/storeContext/access.ts`
- `packages/domain/__tests__/timestampOrdering.test.ts`
- `packages/domain/src/index.ts`
- `packages/domain/src/personalPriceChanges.ts`
- `packages/domain/src/timestamps.ts`

## Reproduction and current evidence

All commands ran in the exact checkout above, installed Node24.21.0/npm11.19.0;
all disposable migrated SQLite and scratch/cache/results use the new directory
`C:/Users/doyew/AppData/Local/Temp/cosi-m9-m11-corrections-20261003`.

| Check | Actual result | Evidence file |
| --- | --- | --- |
| Pre-repair authority (50 initial permanent cases) |29 denied-boundary failures;21 valid controls pass|authority-permanent-before.log|
| Pre-repair domain precise ordering |5/5 fail|timestamp-domain-before.log|
| Pre-repair mobile timestamp/cursors |3/3 fail|timestamp-mobile-before.log|
| Isolated missing snooze callback guard |1 denial fails;1 valid control passes;68 filtered|snooze-before.log|
| New plus affected mobile compatibility |143 pass/11 suites;168.361s|compatibility-focused.log|
| Entire domain |200 pass/8 suites;11.318s|domain-focused.log|
| Original reviewer A probes, unchanged |5 pass;32.291s|authority-original-after.log; authority-original-after-results.json|
| Original reviewer B timestamps, unchanged |3 pass;8 filtered;43.893s|timestamp-original-after.log; timestamp-original-after-results.json|
| All-workspace zero-warning lint |exit0|repair-lint.log|
| ONE bounded M9 timeout diagnosis |exit1;target20557ms>15000ms;suite55.272s|m9-timeout-diagnosis.log|
| ONE final repository validation |exit0|final-validate.log;final-results.json|

Final command: `npm run validate` (source-only environment, four-workspace
types/lint, contracts/domain/mobile/lab tests sequentially). No full-green retry
or original assertion/timeout/config edit. Retain intermediate typecheck failure
and corrected fixture/seam diagnostics in the new evidence directory. New
coverage is70 authority,3 mobile timestamp and5 domain tests (78 cases total);
it includes valid business controls, complete denied business/outbox snapshots,
direct/client membership replacement, explicit identity, arbitrary precision,
offset equivalence, exact ties, half-open filters, and read-only history checks.

| Workspace | Tests | Suites | Time |
| --- | --- | --- | --- |
| contracts | 38 passed, 38 total | 4 passed, 4 total | 7.164 s |
| domain | 200 passed, 200 total | 8 passed, 8 total | 8.274 s, estimated 10 s |
| mobile | 8 skipped, 703 passed, 711 total | 2 skipped, 91 passed, 91 of 93 total | 500.098 s, estimated 584 s |
| recognition-lab | 9 skipped, 510 passed, 519 total | 23 passed, 23 total | 494.813 s |

M9 diagnosis included `--detectOpenHandles --logHeapUsage`;305MB heap, no
reported open handles and runner exited. Overhead is only a possible contributor;
no root cause has been established. A final pass does not erase this failed
observation. No additional timing/config changes are authorized or made.
Jest React act warnings in unchanged UI tests are retained in the final log;
zero-warning lint does not mean a warning-free Jest console.

## Preservation and handoff evidence

New599-path baseline SHA256:
`2fc8a55f6986cbc3ac893fb2b3f7ec4c5b36fa426ea2b36007be8ca3539052a6`.
Original audited598-path fingerprint remains:
`6e7de3285cc20b828208be2c7b58d25dea3d839da6d8b6936b642f7df888929c`.
Coordinator's three intervening documentation changes are separately recorded in
`coordinator-documentation-deltas.json`. Original builder handoff and all
independent evidence remain historical and unmodified. The34 original audit
files and127 original test hashes are checked against the new baseline.

`validation-input-manifest.json` freezes all source input before the ONE final
run. `corrected-source-manifest.json` is the final stopped source/doc inventory,
with `preservation-check.json` listing every changed/new path and byte hash.
`return-verification.json` records independent-of-report schema/DAG/artifact/
lease/source-freeze/protected-file checks. No dropped paths, unrelated changes or
Git identity mutation are permitted. All prior protected-test exceptions remain
exact and untouched in this cycle; migrations and authoritative server/config
source are unchanged. PROJECT_STATE edits are confined to current-work line and
M11 section. Workflow index and other milestone state remain untouched.

## Remaining gates and next action

Coordinator independently verifies these corrected bytes after the writer stops.
All M11 acceptance gates remain pending except the previously met prior-source
and plan-review gates. Whole M11 remains OPEN; M10 OFF/provisional. Real staff
Auth/session/least-privilege feed/blind assignees, actual SQL/Auth/RLS/concurrency/
privacy/native/physical/accessibility/offline/multiple-device/second-laptop/release
evidence remain pending. Staff transport/server configuration remains OFF.
Doctor, dependency check and Android source export were not rerun for this
correction; previous results are historical and do not validate these new bytes.
No services/hosted SQL/account effects, Git mutations, builds/phone task, spend,
new dependencies, migrations, M12, subagents or other writing/audit lane.

Changed documentation: this new handoff, correction ledger, M11 tickets/current
workflow and current PROJECT_STATE. M11_IMPLEMENTATION_HANDOFF.md is preserved.
