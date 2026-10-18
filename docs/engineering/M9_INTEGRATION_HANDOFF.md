# C1 correction stopped return

Current status at 2026-10-03T03:24:29.632697+00:00: C1 implementation/self-check return only. Sole writer 01a0ff85-c793-7b63-8b59-cc06431dbed8, GPT-6.1 Sol HIGH, is stopped and its lease released. Main-coordinator independent verification and source acceptance remain WITHHELD. M10/M11 source was not started. Coordinator M9 audit/correction findings and M10 planning were not edited.

## Repair and permanent evidence

The only production delta is the centralized assertActiveOwner query in apps/mobile/src/priceIntelligence/client.ts. Its parameterized membership query now joins users by user_id and requires the present account's status ACTIVE, while retaining ACTIVE store, ACTIVE OWNER membership and existing DomainError/UI denial wording. Construction and all four reads already call this guard; explicit STAFF device handling and foreign direct-ID behavior are retained. No migration, dependency, immutable-price, sync, business protocol, costing, media, recognition or native boundary changed.

Permanent m9PersonalPriceClient regressions create real purchase observations and an ACTIVE client before changing only users.status to INACTIVE/SUSPENDED. OWNER membership remains ACTIVE. All four reads, fresh construction and explicit/default active-context resolution deny; restoring ACTIVE preserves exact comparison/history/list/overview. SQLite total_changes and durable fact/outbox snapshots prove allowed and denied reads make no writes.

Permanent m9SyncIntegration regressions use current M7 file-backed SQLite, distinct origin/receiver IDs, the accepted same-store reference context and pending local plus remote observations. Valid M7 SUSPENDED account reference materialization leaves OWNER membership ACTIVE, three observations intact and the local outbox pending; the old client and new constructors/context deny. M7 reference users permit ACTIVE/SUSPENDED (contracts/src/sync.ts); INACTIVE is tested as actual local SQLite state after that valid pull and persists across restart. No invalid INACTIVE reference DTO is used in the final tests. Both persisted states deny after reopening; an ACTIVE client constructed on the reopened adapter also rechecks all four reads after its account is revoked. Real PersonalPriceChanges UI shows its existing error path without a cost row. Whole-table snapshots and total_changes remain unchanged by denied reads/presentation. Existing replay/echo/restart, store/STAFF and UI checks still pass in the selected suites.

Before the production fix, the new permanent tests reproduced4 failures/8 passes. Initial typecheck then caught an invalid INACTIVE reference fixture; it was repaired within the test by using the supported SUSPENDED reference and independent local INACTIVE state, without casting or changing the protected protocol. The final focused tests, every documented workspace typecheck and zero-warning lint pass. This is implementation evidence, not independent acceptance or live Auth/RLS/device verification.

## Fresh correction commands and actual results

Working directory: COSI-m8-planning. Logs: `C:\Users\doyew\AppData\Local\Temp\cosi-m9-c1-correction-20261003`.

| Command | Exit | Result | Log |
| --- | --- | --- | --- |
| `npm run test --workspace @retail/mobile -- --runInBand --runTestsByPath __tests__/m9PersonalPriceClient.test.ts __tests__/m9SyncIntegration.test.tsx` | 1 (expected before repair) | 4 failed,8 passed /2 suites;20.811s;zero skips | `regression-before-fix.log` |
| `npm run test --workspace @retail/mobile -- --runInBand --runTestsByPath __tests__/m9PersonalPriceClient.test.ts __tests__/m9SyncIntegration.test.tsx __tests__/m9ProductDetail.test.tsx __tests__/m9PersonalPriceChanges.test.tsx __tests__/m6Home.test.tsx` | 0 (superseded fixture) | 30 passed /5 suites;50.149s;zero skips. Initial INACTIVE-reference fixture was outside M7 DTO; corrected below. | `focused-after-fix.log` |
| `npm run typecheck` | 2 (resolved test fixture) | Mobile TS2322: INACTIVE is not an accepted M7 reference-user enum. No protocol/source widening. | `typecheck.log` |
| `npm run lint` | 0 | Initial four-workspace max-warnings=0 lint | `lint.log` |
| `npm run test --workspace @retail/mobile -- --runInBand --runTestsByPath __tests__/m9PersonalPriceClient.test.ts __tests__/m9SyncIntegration.test.tsx __tests__/m9ProductDetail.test.tsx __tests__/m9PersonalPriceChanges.test.tsx __tests__/m6Home.test.tsx` | 0 | Final30 passed /5 suites;46.871s;zero skips; valid SUSPENDED reference and persisted local INACTIVE | `focused-final.log` |
| `npm run typecheck` | 0 | Final contracts/domain/mobile/recognition-lab typechecks | `typecheck-final.log` |
| `npm run lint` | 0 | Final four-workspace max-warnings=0 lint | `lint-final.log` |

Final workflow JSON schema/date-time/gate-dependency/artifact checks and git diff --check exit0. Existing VirtualizedList act diagnostics remain visible in the component logs; no console suppression or test/dependency exclusion changes were made. Full validate, Doctor, dependency check and Android export were not rerun for this bounded query repair. Their prior results below are historical and do not cover C1. No unrun gate is promoted to passed.

## Sibling source observations — outside this correction

Read-only sibling inspection found membership-only account-status patterns in:

- finance/client.ts:65 resolveOwnerUserId and finance/businessSummary.ts:149 assertReadableActor.
- finance/recordExpense.ts:88 and finance/recordOwnerWithdrawal.ts:78 assertOwner.
- purchases/client.ts:93 construction and inventory/client.ts:154 resolveUser.

These guards do not query users.status. The inspected expense actor trigger also validates OWNER membership without account status. This is a source-level observation for coordinator triage; other subsystem behavior was not reproduced or independently audited here. None of those files, M6/M11 source or migrations was modified. M7 sync/pilot.ts:46 resolvePilotOwner already requires a present ACTIVE account at line57; current M7 reference materialization restores separate account statuses. Any broader repair requires a separately scoped coordinator decision.

## Exact C1 changed files and preserved baseline

- `.agents/workflows/m9-personal-price-intelligence.json`
- `apps/mobile/__tests__/m9PersonalPriceClient.test.ts`
- `apps/mobile/__tests__/m9SyncIntegration.test.tsx`
- `apps/mobile/src/priceIntelligence/client.ts`
- `docs/engineering/M9_INTEGRATION_HANDOFF.md`
- `docs/engineering/M9_INTEGRATION_TICKETS.md`
- `docs/engineering/PROJECT_STATE.md`

Fresh baseline at correction start:553 tracked/non-ignored untracked files, including coordinator M10 planning and prior M9/M8/Track B dirt. The7 files above are the entire correction delta. Protected comparison:546/546 unchanged, including116 pre-existing untracked recognition-lab source files, coordinator audit/correction findings, M10 plan/tickets/workflow/index/decisions/design/domain/offline/build-plan preparation, root M8 tickets, media/scanner/contracts/sync/migrations/business domain/manifests/lockfiles/native/backend. No unexpected non-ignored files were added. PROJECT_STATE bytes outside its M9 paragraph, including its M10 section, match SHA256 `8cfe5e8a15e43ff386f6c8be4406ed82b2018f301007524a91974e5c427f698e`. The previous519 integration proof predates coordinator preparation and is historical.

Hash scope uses git ls-files and git ls-files --others --exclude-standard. Ignored secrets, installed dependencies/build caches and historical/generated run artifacts are outside the hash proof. No claim is made that every ignored file is covered. Fresh SHA256 maps, baseline diff/status and final status are retained in the log directory. A reconstructed pre-change client query matches its recorded fresh baseline SHA256, establishing that the production change is only the centralized query.

Baseline and final branch `plan/m8-unified-scanner`; baseline and final HEAD `66ea3fc22595a48d7355d1729bb879496cc98896`. No commits/reset/stash/rebase/push/merge or history effects. Existing valid dirt was preserved.

Baseline status:

```text
 M .agents/contexts/project-context.md
 M .agents/workflows/index.json
 M .agents/workflows/m8-unified-scanner.json
 M apps/mobile/__tests__/m6Home.test.tsx
 M apps/mobile/__tests__/navigation.test.tsx
 M apps/mobile/__tests__/products.test.tsx
 M apps/mobile/__tests__/shell.test.tsx
 M apps/mobile/app/(tabs)/products/[id]/index.tsx
 M apps/mobile/app/(tabs)/products/_layout.tsx
 M apps/mobile/app/(tabs)/today.tsx
 M apps/mobile/src/catalogue/client.ts
 M apps/mobile/src/db/repositories/index.ts
 M apps/mobile/src/db/repositories/priceObservations.ts
 M apps/mobile/src/screens/home/HomeScreen.tsx
 M apps/mobile/src/screens/products/ProductDetailScreen.tsx
 M apps/mobile/src/screens/sales/SellScreen.tsx
 M docs/architecture/DOMAIN_DATA_MODEL.md
 M docs/architecture/OFFLINE_SYNC.md
 M docs/decisions/DECISION_LOG.md
 M docs/design/DESIGN.md
 M docs/engineering/BUILD_PLAN.md
 M docs/engineering/IMPLEMENTATION_AUDIT_WORKFLOW.md
 M docs/engineering/M8_ANDROID_VERIFICATION.md
 M docs/engineering/M8_INDEPENDENT_AUDIT.md
 M docs/engineering/MULTI_AGENT_WORKFLOW.md
 M docs/engineering/PROJECT_STATE.md
 M docs/product/PRODUCT_CHANGE_BACKLOG.md
 M package-lock.json
 M package.json
 M packages/domain/src/index.ts
 M tickets.md
 M tools/scripts/check-environment.mjs
?? .agents/workflows/m10-market-price-infrastructure.json
?? .agents/workflows/m9-personal-price-intelligence.json
?? .agents/workflows/recognition-track-b.json
?? apps/mobile/__tests__/m9PersonalPriceChanges.test.tsx
?? apps/mobile/__tests__/m9PersonalPriceClient.test.ts
?? apps/mobile/__tests__/m9ProductDetail.test.tsx
?? apps/mobile/__tests__/m9SyncIntegration.test.tsx
?? apps/mobile/app/(tabs)/products/price-changes.tsx
?? apps/mobile/src/priceIntelligence/
?? apps/mobile/src/screens/products/PersonalPriceChangesScreen.tsx
?? apps/recognition-lab/
?? docs/engineering/M10_MARKET_PRICE_PLAN.md
?? docs/engineering/M10_MARKET_PRICE_TICKETS.md
?? docs/engineering/M9_INTEGRATION_AUDIT.md
?? docs/engineering/M9_INTEGRATION_CORRECTIONS.md
?? docs/engineering/M9_INTEGRATION_HANDOFF.md
?? docs/engineering/M9_INTEGRATION_PLAN.md
?? docs/engineering/M9_INTEGRATION_TICKETS.md
?? docs/recognition/TRACK_B_PLAN.md
?? docs/recognition/TRACK_B_R0_TICKETS.md
?? docs/recognition/TRACK_B_R1_PLAN.md
?? docs/recognition/TRACK_B_R1_TICKETS.md
?? docs/recognition/TRACK_B_R2_PLAN.md
?? docs/recognition/TRACK_B_R2_TICKETS.md
?? docs/recognition/TRACK_B_R3_PLAN.md
?? docs/recognition/TRACK_B_R3_TICKETS.md
?? docs/recognition/TRACK_B_R4_PLAN.md
?? docs/recognition/TRACK_B_R4_TICKETS.md
?? docs/recognition/reports/
?? packages/domain/__tests__/personalPriceChanges.test.ts
?? packages/domain/src/personalPriceChanges.ts
```

Final status (handoff existed before this final content write):

```text
 M .agents/contexts/project-context.md
 M .agents/workflows/index.json
 M .agents/workflows/m8-unified-scanner.json
 M apps/mobile/__tests__/m6Home.test.tsx
 M apps/mobile/__tests__/navigation.test.tsx
 M apps/mobile/__tests__/products.test.tsx
 M apps/mobile/__tests__/shell.test.tsx
 M apps/mobile/app/(tabs)/products/[id]/index.tsx
 M apps/mobile/app/(tabs)/products/_layout.tsx
 M apps/mobile/app/(tabs)/today.tsx
 M apps/mobile/src/catalogue/client.ts
 M apps/mobile/src/db/repositories/index.ts
 M apps/mobile/src/db/repositories/priceObservations.ts
 M apps/mobile/src/screens/home/HomeScreen.tsx
 M apps/mobile/src/screens/products/ProductDetailScreen.tsx
 M apps/mobile/src/screens/sales/SellScreen.tsx
 M docs/architecture/DOMAIN_DATA_MODEL.md
 M docs/architecture/OFFLINE_SYNC.md
 M docs/decisions/DECISION_LOG.md
 M docs/design/DESIGN.md
 M docs/engineering/BUILD_PLAN.md
 M docs/engineering/IMPLEMENTATION_AUDIT_WORKFLOW.md
 M docs/engineering/M8_ANDROID_VERIFICATION.md
 M docs/engineering/M8_INDEPENDENT_AUDIT.md
 M docs/engineering/MULTI_AGENT_WORKFLOW.md
 M docs/engineering/PROJECT_STATE.md
 M docs/product/PRODUCT_CHANGE_BACKLOG.md
 M package-lock.json
 M package.json
 M packages/domain/src/index.ts
 M tickets.md
 M tools/scripts/check-environment.mjs
?? .agents/workflows/m10-market-price-infrastructure.json
?? .agents/workflows/m9-personal-price-intelligence.json
?? .agents/workflows/recognition-track-b.json
?? apps/mobile/__tests__/m9PersonalPriceChanges.test.tsx
?? apps/mobile/__tests__/m9PersonalPriceClient.test.ts
?? apps/mobile/__tests__/m9ProductDetail.test.tsx
?? apps/mobile/__tests__/m9SyncIntegration.test.tsx
?? apps/mobile/app/(tabs)/products/price-changes.tsx
?? apps/mobile/src/priceIntelligence/
?? apps/mobile/src/screens/products/PersonalPriceChangesScreen.tsx
?? apps/recognition-lab/
?? docs/engineering/M10_MARKET_PRICE_PLAN.md
?? docs/engineering/M10_MARKET_PRICE_TICKETS.md
?? docs/engineering/M9_INTEGRATION_AUDIT.md
?? docs/engineering/M9_INTEGRATION_CORRECTIONS.md
?? docs/engineering/M9_INTEGRATION_HANDOFF.md
?? docs/engineering/M9_INTEGRATION_PLAN.md
?? docs/engineering/M9_INTEGRATION_TICKETS.md
?? docs/recognition/TRACK_B_PLAN.md
?? docs/recognition/TRACK_B_R0_TICKETS.md
?? docs/recognition/TRACK_B_R1_PLAN.md
?? docs/recognition/TRACK_B_R1_TICKETS.md
?? docs/recognition/TRACK_B_R2_PLAN.md
?? docs/recognition/TRACK_B_R2_TICKETS.md
?? docs/recognition/TRACK_B_R3_PLAN.md
?? docs/recognition/TRACK_B_R3_TICKETS.md
?? docs/recognition/TRACK_B_R4_PLAN.md
?? docs/recognition/TRACK_B_R4_TICKETS.md
?? docs/recognition/reports/
?? packages/domain/__tests__/personalPriceChanges.test.ts
?? packages/domain/src/personalPriceChanges.ts
```

<details>
<summary>546 fresh protected file hashes — initial/final identical</summary>

| Path | Initial and final SHA256 | Comparison |
| --- | --- | --- |
| `.agents/AGENTS.md` | `F7A0C0E110BD296C439787A91398D9A33E41EA66B35C675402EDA39DB2387FAC` | unchanged |
| `.agents/contexts/app-flow.md` | `F1DE1C9654A714F5D0111DFE92E9AF1172643A7CC9C06B0DA8A20005F1F9E8DD` | unchanged |
| `.agents/contexts/project-context.md` | `3AE33F892CC39893B893B3B51EEF99846EB8332B72C040B816E4D0F303E471D9` | unchanged |
| `.agents/contexts/stack-context.md` | `AC2BA3E3F50638236085D9C2802D13FC52C73511691D51F350C4842E0E46D7D4` | unchanged |
| `.agents/schemas/workflow-index.schema.json` | `06D955538E9A9239022F040924BE07C372D0652548BD8A871818FF0B08164887` | unchanged |
| `.agents/schemas/workflow-state.schema.json` | `05D95DD4E138FDA5D8C099A6FF5672379B549043223BD8F36318D80C9362E427` | unchanged |
| `.agents/workflows/index.json` | `5C1D7E373F3B6F3CCC701C5D957CEAE180C4CF17CFDCA4784FE0D04BE21EC093` | unchanged |
| `.agents/workflows/m1-domain-local-database.json` | `F2E36C5E32BE0177D9557593EA0FD607192AA06A0B6CA96B46140BC006DFCB34` | unchanged |
| `.agents/workflows/m10-market-price-infrastructure.json` | `6B2FA1A474DD51FDC8FF776715731CBDB018F4BF5ED4284470EDBFEB74C17786` | unchanged |
| `.agents/workflows/m2-catalogue-package-units.json` | `3008344A8AFF772B7F910229BE44285A111BC3E545FFA35533FD596C0AD49D90` | unchanged |
| `.agents/workflows/m3-sales.json` | `3DD861A02FBA2E208A84D46BB05C77DD3B9F50577993299A39FC049D3BF85115` | unchanged |
| `.agents/workflows/m4-restocking-costing.json` | `6C69BCB3BCA4B87DB50FA6192150DF0EE9A566DC439976D8BF4E6FDA7254D97A` | unchanged |
| `.agents/workflows/m5-inventory-reconciliation.json` | `67A92366E62779FE9FF1D2B14CBF2219E158782A4EFB33BE69572106C15FB98E` | unchanged |
| `.agents/workflows/m6-expenses-business-summary.json` | `55679F0604F3CE2DA65B3859FC4633D68FF7CC9272334C081E5D3BE488215550` | unchanged |
| `.agents/workflows/m7-offline-sync.json` | `862D7CB252D0A9E5587311593847DAB908938D6351E71A7DF381808B6E3C2827` | unchanged |
| `.agents/workflows/m8-unified-scanner.json` | `F3CB779A068474629D047DC6AD031A95B690734CE3E394778F7575A17EA93DC5` | unchanged |
| `.agents/workflows/recognition-track-b.json` | `464BEBC426A48A127652817A09980F19701A850A897BF541B836A8D697FB3162` | unchanged |
| `.editorconfig` | `A6B98EA7CB6D61ED8D430DD0DFFA46C87012B5CF859D4CE7207898954951FDCD` | unchanged |
| `.gitattributes` | `2A7A5DAAAE1CAD7A41ACC82B6BFCA78869DED5CD8D50FAD26969DDCCA428181A` | unchanged |
| `.github/workflows/validate.yml` | `55BFC0B6D6C8C98CEA12215F428715206A7329448F9285D946961002DD9BD1E4` | unchanged |
| `.gitignore` | `9486DED9DFC6FF0812A92C7470855ACB95EF6C46EF497A9BF56B3C95FBA1E4AF` | unchanged |
| `.node-version` | `73FB1B615E2043A933BE1C0895CDE4358036ACC28D785692509B822AA53C761F` | unchanged |
| `.npmrc` | `3B88D1057ADD6F92EC23DC22DD017E312DED13A042DEB0BA6F08BAD85D936456` | unchanged |
| `AGENTS.md` | `F469794EB1DB40DFE704AFD9DE8DBF7D46D65D91976002F6E0012F02DD9E27B9` | unchanged |
| `apps/mobile/__tests__/barcodeCamera.test.tsx` | `428B5A0B97E9F7753278136CA0668ADBF3660F93602384B39E58A35DFAA3620A` | unchanged |
| `apps/mobile/__tests__/catalogue.test.ts` | `0C17A0B60CA6BAFB9587142AEDA019135A0125C8A22F2B507D210D25D3E61E50` | unchanged |
| `apps/mobile/__tests__/catalogueIdentity.test.ts` | `CCD215B8B87E25985468B4B2E304A735D86A1DAFAAA35984550E01BAEC70B337` | unchanged |
| `apps/mobile/__tests__/catalogueLifecycle.test.ts` | `7B38EAE8E8F23077B61587C081211DD1F81F23AF6A1DCC0FE885EC981DD424C8` | unchanged |
| `apps/mobile/__tests__/catalogueLookup.test.ts` | `8CBF9E6918C5088E4349CF067D81AD8BFBDECC4D24A2CDE0624D70DD333C30CC` | unchanged |
| `apps/mobile/__tests__/catalogueLookupUi.test.tsx` | `DD8BF91C4A86246D7D0C05E2EA3B3D428C3853D85FD93F08285739954CBDE68A` | unchanged |
| `apps/mobile/__tests__/cataloguePackages.test.ts` | `C3DBABE1EF10513DDAFB307437D0D749C205497F80C6AEEE9CE23F7F3832527C` | unchanged |
| `apps/mobile/__tests__/catalogueSupport.ts` | `55525EB839B6B9556BB8A1B2D0ED92641D1F765F6A1C8BB34F545CC500F3A388` | unchanged |
| `apps/mobile/__tests__/databaseStartup.test.ts` | `5EAF512C2F99D03F03CE8E6DA72F564F72797D29611A7B6ECC2CFF99B68EEDE7` | unchanged |
| `apps/mobile/__tests__/db.test.ts` | `ECA4EA752256D79BB53C67748B691F0CF15B9F307D7CAFF73724576F086811D7` | unchanged |
| `apps/mobile/__tests__/displayMoney.test.ts` | `DA1135480290CD35DB04771A4C35818B819DAB1FBE70CFE8040D09706846E2AD` | unchanged |
| `apps/mobile/__tests__/domain-package.test.ts` | `97701852E50319A146A912E92A925EBA8652EB18650A2ED913004F2F2CBC8D02` | unchanged |
| `apps/mobile/__tests__/environment.test.ts` | `9B6F53EFFD45F98A3EB0B6F420F9A0121F663518905D23B7DB32D88E652C7680` | unchanged |
| `apps/mobile/__tests__/m5Adjustments.test.ts` | `AF626B03E3F019B877BF26B205D9FDB9101B2A6DDF22E1433B2C074EA747A094` | unchanged |
| `apps/mobile/__tests__/m5AdjustmentScreen.test.tsx` | `C22395550DB80918F61BEFC59C3ABEDFF2B50769457ABAA9508F40408A97069C` | unchanged |
| `apps/mobile/__tests__/m5Attention.test.ts` | `DE59884EC05CCAC13B90CC3791D420E62EEE513216C720DBA3CFCA7BEF1F218A` | unchanged |
| `apps/mobile/__tests__/m5AttentionScreen.test.tsx` | `A25BF92B44492C973C9D4342F4D74E8740C0ADEC688B78C68D79A443416B9BAE` | unchanged |
| `apps/mobile/__tests__/m5AuditCorrections.test.ts` | `E5FBCAA414F1DB99751F8F9A54F5F0ACF5EAD797EC16B70E7EF706B4E0D83A3D` | unchanged |
| `apps/mobile/__tests__/m5Batch.test.ts` | `549F659AFCEBD4647AAA60C7D9883AB634251AA7CE7E2A0BF5A2C93BB5662601` | unchanged |
| `apps/mobile/__tests__/m5Classification.test.ts` | `F18E97D71495729AE9530B2A057BD937E33A2C55E75ADE89E11C21B9C7FE8836` | unchanged |
| `apps/mobile/__tests__/m5GuidedChecks.test.ts` | `65D185C6EF12F392DB1937FE7F75DB1CEFC440E146096C9C5C4A12AB4F247D9C` | unchanged |
| `apps/mobile/__tests__/m5GuidedChecksScreen.test.tsx` | `8909A4C50B80CE4DABA77D0501CDB10E131B26700A902E7F34FA7C4B6B007EC2` | unchanged |
| `apps/mobile/__tests__/m5InventoryReview.test.tsx` | `AFA52612AB88062770C7C7C0BD1C44162F0A23809155EA2752A8D328850B485F` | unchanged |
| `apps/mobile/__tests__/m5Reconciliation.test.ts` | `83AD21A401B9E7E15BBECAC5DC91D0AF70E95917BE345BCF58F291062D3A6E0B` | unchanged |
| `apps/mobile/__tests__/m5ReconciliationCorrections.test.tsx` | `9611EE8157820AFB62BD1F3320F86537799348D276CB1F7FD6D139EA7F365DAF` | unchanged |
| `apps/mobile/__tests__/m5ReconciliationScreen.test.tsx` | `C6C5E2A84F6D52BE295C31D468CB2962710E04CFF6416B08EE51211EE794E2AE` | unchanged |
| `apps/mobile/__tests__/m5ReorderThreshold.test.tsx` | `03519D6E6FA90D410CB7DCB2E77838D98A847B431F7D85C9A6D457E5D13462BC` | unchanged |
| `apps/mobile/__tests__/m6BusinessSummary.test.ts` | `1E6983F79CA781345AC6F597DC966520684DC9106DF1CC66A8CB6A7FA7486D07` | unchanged |
| `apps/mobile/__tests__/m6BusinessSummaryScreen.test.tsx` | `573177D024A5A7064E9ECC1D794121CCB813DB32FC88786753942FE6C67A24BE` | unchanged |
| `apps/mobile/__tests__/m6Expenses.test.ts` | `CEBC06F2A1E0F1A9753F939B1877ED8E6ADD2D0CC7113EA5BDA83E319FBD5C30` | unchanged |
| `apps/mobile/__tests__/m6ExpenseScreens.test.tsx` | `A876C64A09E16B4B04964EF6DCBC171AC9515AB1E7CF75664D26D81E1F1E8C98` | unchanged |
| `apps/mobile/__tests__/m6Home.test.tsx` | `D94EFB02ABC757EBFCF22CCA6E64E62D859FACB769C6C6315D663CA24CBB4DC5` | unchanged |
| `apps/mobile/__tests__/m6Withdrawals.test.ts` | `3299CC88FD185282F70B5222A82BD7BAF1C0913743B19BA6B6D98EA459898F11` | unchanged |
| `apps/mobile/__tests__/m6WithdrawalScreens.test.tsx` | `7D8E83EBB3C3EB89F1145DFB67625E76BADD8D77D6D73258FE0B9D476785EBA4` | unchanged |
| `apps/mobile/__tests__/m7ConcurrentCosting.test.ts` | `74C62B6C762FDD5202D53B54F59B7368A8243E12F9AAECB9F36AC8A6B0445046` | unchanged |
| `apps/mobile/__tests__/m7M5PullSemantics.test.ts` | `18B1734EA714A5B6ECB2678DF372C7B119BDC1CEE00D3139EAA807CF92237C9A` | unchanged |
| `apps/mobile/__tests__/m7Pilot.test.ts` | `C8BD9B4A0251AE64B8C314B75A0812CF9C914C223A6E789B1A5F18FF181875D6` | unchanged |
| `apps/mobile/__tests__/m7PullReferences.test.ts` | `2C7A272D319DC0C99D7AA85DB72DCC9616CBFD92275723B0949385D72E5F4F46` | unchanged |
| `apps/mobile/__tests__/m7PurchasePull.test.ts` | `81CFF7F7B4E093E0EAE0138D47AF6327E050187EB2B21C4365721506442D212D` | unchanged |
| `apps/mobile/__tests__/m7SalePull.test.ts` | `B12D279AB327002BDF6BF813780398FE7F611828F0C7D92700C882E49A5960D2` | unchanged |
| `apps/mobile/__tests__/m7Sync.test.ts` | `C67FC47BE6975641C55C5195E4E761205AE7EC4FE05FAD3CE2D63BEF4CCFBE01` | unchanged |
| `apps/mobile/__tests__/m9PersonalPriceChanges.test.tsx` | `04B7686907F61C0BC9CB5A77BE8880ACF01BDAA20699F04258C801A6ADE3EB46` | unchanged |
| `apps/mobile/__tests__/m9ProductDetail.test.tsx` | `0EBFB02EE01E530CBB7C7D18C08104EA7D49D084EF48871D17D381D7BBBCA146` | unchanged |
| `apps/mobile/__tests__/migrationHistory.test.ts` | `3E95F43B146EC087FA9CC70B040A1A3484066B35E85A57076F8091F9E381035B` | unchanged |
| `apps/mobile/__tests__/mobileIds.test.ts` | `BE31878BA006AA436A118BECD39A414069F4397126059884FA2AE880D8C80BB7` | unchanged |
| `apps/mobile/__tests__/nativePhotoFiles.test.ts` | `AC65B439EBA29EB2D9C0B0E85D6E3A6F7206790AAA8A2D230BD663AD26603414` | unchanged |
| `apps/mobile/__tests__/navigation.test.tsx` | `0951BF7EE6CDF65E10EDB63C63DB670A84FEEDE966F12529C0FF4897FBB22931` | unchanged |
| `apps/mobile/__tests__/priceFirstSale.test.tsx` | `A1C790986E7A90BC461C61B516C8E310E5641B5778795CB47F2D5D71B091BA91` | unchanged |
| `apps/mobile/__tests__/productPhotoCamera.test.tsx` | `FC7428EA31E328C65470575BDBE825565F26D1A8CD001D7B54E544AC5655A451` | unchanged |
| `apps/mobile/__tests__/productPhotoPresentation.test.tsx` | `11D0141C97A182D48853E2DC58AC66C0919815C392D0CB202A730DE36A139DE9` | unchanged |
| `apps/mobile/__tests__/productPhotos.test.ts` | `C9C7D74197C6A9090F4343FD6F22434842F55FA4694E4C2B968029CC8EA38148` | unchanged |
| `apps/mobile/__tests__/productPhotoUi.test.tsx` | `0A40709F9EBB8E5C507D17B4B9D932BFB224518764EB16ADA1A05741D82A5A80` | unchanged |
| `apps/mobile/__tests__/products.test.tsx` | `16B26D0AFFE43CF4A4B8DBADB3B3EE212E6D69B3A97156EA78C09D68362F16A8` | unchanged |
| `apps/mobile/__tests__/provisionStoreContext.test.ts` | `62A24597050C074A748B31B303856CCBE454F5C749B13E694E34B4D23396AA34` | unchanged |
| `apps/mobile/__tests__/purchases.test.ts` | `489ECDB82282F81541C47F7CDC52B8B60D88806B91E2D77D5F80DBFD438FDBAE` | unchanged |
| `apps/mobile/__tests__/repositories.test.ts` | `8AC209D23FCA4FA38D3ED4C1A76991A922ABA3AF1F51E172EA9EAA6C6CB0A1B0` | unchanged |
| `apps/mobile/__tests__/restock.test.tsx` | `9B34AA9BDC5ABEC0D122842D62FB7FB8BD858BBB6ACF47F36944C187DF264F02` | unchanged |
| `apps/mobile/__tests__/saleDraft.test.ts` | `25C76E2FEF18BCF104F095DB71F1E5D823877049E305F844A62FE67901355C7B` | unchanged |
| `apps/mobile/__tests__/sales.test.ts` | `451648EA18E642006ADE946B1D8C81EDD54741B5C4C0B47A31C4FDDB7DE9FB65` | unchanged |
| `apps/mobile/__tests__/scannerActivity.test.tsx` | `8ED047A41F6747B321E88372C7E256774ED55D87B674A779E5F13A0ABE2B46A1` | unchanged |
| `apps/mobile/__tests__/scannerCatalogue.test.ts` | `74E5B0EEE397088DDA25873A804BFA41311A0DC3913028CA6FBA66A6DD97C554` | unchanged |
| `apps/mobile/__tests__/scannerFeedback.test.tsx` | `0BE6312D6CED55D21D42C86F4718E4276D47BBEF8D9D9AEEBA937C1863531D6C` | unchanged |
| `apps/mobile/__tests__/scannerPanel.test.tsx` | `32CE6BF8C2A40255AE57B39828BF510C6BD781E83FFE910B18B2A3F1D1E27071` | unchanged |
| `apps/mobile/__tests__/scannerSale.test.tsx` | `9C97631AF8459C1DCFBD06F1E5F66FB78ECF85F6CC56C9976BC13C99051559D0` | unchanged |
| `apps/mobile/__tests__/scannerSync.postgres.test.ts` | `B67420AA6BC0E75EDA627A214737A538D9A1AD6872167F52EC9C16390B8372D6` | unchanged |
| `apps/mobile/__tests__/scannerVerification.test.ts` | `12A5B82D6F8AE4BF49BF9279DFA05E5BC40110CFECC7300AFB604BD85B5AD4F4` | unchanged |
| `apps/mobile/__tests__/scannerVerificationRoute.test.tsx` | `27669F544AB3CD0B22C7D90F213EFD74E79E58E5051FD80334B773325EF0A0DA` | unchanged |
| `apps/mobile/__tests__/scannerWorker.postgres.test.ts` | `5CD4E19D6395F3B7B5F86C90F59F26C5119CDBFDB79D0B7C962CA088D2EE117F` | unchanged |
| `apps/mobile/__tests__/scannerWorker.test.ts` | `F138B57FA3F3DD9C186E3E0DECFCB3F29E361DE3B2EB37EFC71A6AEBE9EC3A4C` | unchanged |
| `apps/mobile/__tests__/scannerZoomSale.test.tsx` | `98B42FCF8440AE0C02F16C549AE8EDE1AA57649F3739F4D232316EE8F1D7A4BF` | unchanged |
| `apps/mobile/__tests__/scanning.test.ts` | `CA138E750982A7D98C14D542E50E1259A19A97C7C49F7F0194F1A3F27E318BB1` | unchanged |
| `apps/mobile/__tests__/sell.test.tsx` | `AA399C8359EEE92C943BF6843D868EB1243C9C7C687D03850FAB19045939349A` | unchanged |
| `apps/mobile/__tests__/shell.test.tsx` | `072E573387AD110748A02E3ED65CB0B19E4C7C40B3D6EEAED011E73E19A41FBF` | unchanged |
| `apps/mobile/__tests__/startupShell.test.tsx` | `D3CA77F5FF008EB7FD5CFD443009F4337FEF5074BC1793A7A32F4E8E9E80B79B` | unchanged |
| `apps/mobile/__tests__/theme.test.ts` | `EE53AE5A1C22BEB9F78F016B03FDFE4A0F89CF845ED81C7AA03E14624DF42737` | unchanged |
| `apps/mobile/__tests__/transaction.test.ts` | `9C00D88E5B1C9291CD295FC22965A89A75AEB6337DF888EB3EC18F5F7275ED6D` | unchanged |
| `apps/mobile/__tests__/usePreviewZoom.test.tsx` | `B69444EF72BF99C2D0089B17061F7FD1291B9539ABDC69948418FDCABFE64050` | unchanged |
| `apps/mobile/.env.example` | `72BB4F8DB96067087E59DDE9CC4511128B014007F0F44E7552C87811D35346AE` | unchanged |
| `apps/mobile/app.config.ts` | `B3981D2352CB2E54A35638855C3B4C482E8736CD8D647FB9560DDDC71C61FFD1` | unchanged |
| `apps/mobile/app/_layout.tsx` | `91F8934A251F74202E8DF90E97F7B54EF339C5788738F965AD66ADCEA77DB53D` | unchanged |
| `apps/mobile/app/(tabs)/_layout.tsx` | `15E34551A34E8669324B44BA67C4EBE22879A332CEC6BD878A8A5820343B8C9C` | unchanged |
| `apps/mobile/app/(tabs)/more.tsx` | `DC6BEC2D46D2114DC2BA0FB2569FA8EE9FD47B1AD152BEEC85EE5C5C52560F9C` | unchanged |
| `apps/mobile/app/(tabs)/products/_layout.tsx` | `DA29C35B21FBB5DC2D8D4864DE53BF805B41AD3C6CEF94382AD87ADCB660FE23` | unchanged |
| `apps/mobile/app/(tabs)/products/[id]/index.tsx` | `2B62E2B00022FA153A5CB8E465A0DFA1FDDDC7217C4BF4051888663FEBF84BA8` | unchanged |
| `apps/mobile/app/(tabs)/products/[id]/packages/[packageId].tsx` | `A26CF8D0397505BCFDC5D8AB9365687817AF705A76668D3C355F0ECA23DCA782` | unchanged |
| `apps/mobile/app/(tabs)/products/[id]/packages/new.tsx` | `642FE7211864E20F253F564B44A3511BEED54EE4CA7745ECC03CDF3D5D2403C4` | unchanged |
| `apps/mobile/app/(tabs)/products/index.tsx` | `7A2DC6C797CB6E696AF75D3FC99D2283C7AA531F94D985C31172598767608FA5` | unchanged |
| `apps/mobile/app/(tabs)/products/new.tsx` | `A133194096D65628EE1A74704B262A3C4F947495E4057CA6A643C490292D8D49` | unchanged |
| `apps/mobile/app/(tabs)/products/price-changes.tsx` | `7CBFC70FF2B14258F1CE43BDC627F3135E5210AC64642440D522CCBD2BECD9C8` | unchanged |
| `apps/mobile/app/(tabs)/today.tsx` | `8D785CB614B5A6AFFA91C80E0C4B27C65D16A97CA5651F2EDEAEE4B41547E7B5` | unchanged |
| `apps/mobile/app/adjustment.tsx` | `6FE14E0BD849E3BEA23998B4DAAE62DB18BDB7E1FF24D936DDCFCFDC875D37AA` | unchanged |
| `apps/mobile/app/attention.tsx` | `4E00C212FB9EDB13813D25CEB2B868FFABE87BFF4DBE3DFBBA1A40B02ACEF470` | unchanged |
| `apps/mobile/app/batch-review.tsx` | `357874DF8B69673EA6259EFEF49325642FB032FC8FCF39B55BB481C139C66ED4` | unchanged |
| `apps/mobile/app/expense.tsx` | `5274F8F1DDBF5957AA797B61A8C4A3295E23D6891D915FE9B5DCA9CFC563CD9A` | unchanged |
| `apps/mobile/app/expenses.tsx` | `DC828AEDE42931BFE12F1CF41919A0B58243274776A19ADA1FAF1C6509926656` | unchanged |
| `apps/mobile/app/guided-checks.tsx` | `20D11F55E5149022C388F0338ECF3C7F3275E0F40CB9C652036B839FF5641BEA` | unchanged |
| `apps/mobile/app/index.tsx` | `F76483C61D2DB85625B0B78C3E8B76F70978D48608DCDC950ECDA458F6D72836` | unchanged |
| `apps/mobile/app/purchase-history.tsx` | `49A24782FA3FDEDDE242706D05BF2B63FC05202BB3595BF4ADC60FA0ABBFEF88` | unchanged |
| `apps/mobile/app/purchases/[id].tsx` | `C1529AACB48DE9116D9A0AF583597CE9ED2C0D245A3C23D82DEC1A07D8DB4C8A` | unchanged |
| `apps/mobile/app/reconciliation.tsx` | `7EB7FEE78EC5BE627882684D2796E2150D23484A5904F9BB21251DB01946DC1B` | unchanged |
| `apps/mobile/app/restock.tsx` | `6822A665009EFCF388D10A3E59D13625D6487C17138975B8E8B1DEF86925D2D9` | unchanged |
| `apps/mobile/app/sell.tsx` | `81DB2DEB0B843D9B4389BF2D9029B09E4A694FA1D77A025DFB83E4E30787215E` | unchanged |
| `apps/mobile/app/summary.tsx` | `D4D71DF773FA7003226D72CAEFFFB5B446910FA2FE657821488C14246E82E467` | unchanged |
| `apps/mobile/app/sync.tsx` | `EB362A0A0C00D5A4C31F39AD5F78DFBFAD7FA049E1BD7EB2378546303949369F` | unchanged |
| `apps/mobile/app/withdrawal.tsx` | `5BD4011E23B8BF7A0AD0C560431A2D61A7EB158F72E4CF86E7357B6DD6E28120` | unchanged |
| `apps/mobile/app/withdrawals.tsx` | `BEAEA95AC2879B9071814FC1D0A661F0B1956CD373E16BEA18755A93DD1BCD66` | unchanged |
| `apps/mobile/eas.json` | `7DB61F778EB5CD99587E6F96D20819C0B4411BB7054D5912337400A33E8DCE48` | unchanged |
| `apps/mobile/eslint.config.js` | `AAA671E71B66F0C3FE94854D7D3B7EB671800F0A338452DCFC3B83630033E2B8` | unchanged |
| `apps/mobile/jest.config.cjs` | `CA1AE622D81A92E0750F5BBCAE0F1923C87F66C741BAA127F18E558EBB94D57D` | unchanged |
| `apps/mobile/package.json` | `BE0C891AFD5B840403C53EEFA9A404526E576F281F72ED5C34F4FEF854EB532A` | unchanged |
| `apps/mobile/src/catalogue/CatalogueContext.tsx` | `40A8949340428D397953CF1E3316599F1A5240A148A5B6E5FA175DB4B992CEE1` | unchanged |
| `apps/mobile/src/catalogue/client.ts` | `25F3A7BB3B26C4BDC718D3586E65252AB83562715764320C4BDBFC29134C0295` | unchanged |
| `apps/mobile/src/catalogue/createTemporaryProduct.ts` | `CE27B4BF6FE9B47B93E6E664CC3FF85026AAB5A9D41359151ED49C9E2100BAC3` | unchanged |
| `apps/mobile/src/catalogue/lookup/provider.ts` | `FC0D38A67FD149167BFD47A80E5F607E49EC2FF204D7A23F14FFD7173FA9AE53` | unchanged |
| `apps/mobile/src/catalogue/lookup/SuggestionCard.tsx` | `114120981A58515D67BF4B2BD817DAB34113DA596D429E39646D8FC62FB442B1` | unchanged |
| `apps/mobile/src/catalogue/lookup/suggestions.ts` | `21B2F9DDCCE14501D8215136C005B08740080D48994F0FF5ECCF6032FD581CAF` | unchanged |
| `apps/mobile/src/catalogue/manageLifecycle.ts` | `CC550ABECD94502880EDC287C41F15605564F04F4F50A027891150C153CCADFD` | unchanged |
| `apps/mobile/src/catalogue/managePackages.ts` | `9A8D3555EDAE8310A4C71BB037B8C8889048EA14C4122038B198441B506A2E12` | unchanged |
| `apps/mobile/src/catalogue/updateProductIdentity.ts` | `1AD726C8B0A9E059D40FB2A5974DAE2158D0023CD6E44A63196AB08DA1652FF0` | unchanged |
| `apps/mobile/src/catalogue/updateReorderLevel.ts` | `A0A864CF8B43DDF1B7B62825E64A1B42185E07D7D87D211EB51C5DFF6F7FA01C` | unchanged |
| `apps/mobile/src/config/environment.ts` | `DB0ABCDE768B3AC3AE19A462457C8285026EEB5F061BF70360AC16CAEA849F7E` | unchanged |
| `apps/mobile/src/crypto/mobileIds.ts` | `9D157347AAAB291D9663155919E3AD21BEB4836FFA5F036BFE4E6C93CD781969` | unchanged |
| `apps/mobile/src/db/adapter.ts` | `3612849600CB5923E646E322956A2FCA4520B9511B897C89BB4CF88AE57148B7` | unchanged |
| `apps/mobile/src/db/DatabaseContext.tsx` | `7F9E113B8852B339D781D42CF65C198ED90ECD9C85233027997D3B8B2AF1F83C` | unchanged |
| `apps/mobile/src/db/errors.ts` | `0A5CBB98EE8AD666BB9CB0ABEEDE90DE7138F96D5C93EC2C1C6C1555C3D884FF` | unchanged |
| `apps/mobile/src/db/expoSqliteAdapter.ts` | `35B85B7E6ADD681E1119F58CF1C7B232CCA3D552FFD65165C7DA98448579E755` | unchanged |
| `apps/mobile/src/db/index.ts` | `70981024644AFDE71DC4AE923FA052B4A3C00290FEF78E52532E674A8BAA69C4` | unchanged |
| `apps/mobile/src/db/initialize.ts` | `74ACB553D6A7EE36F663A09D1B19B2B77D40074E2749E769FE25EA7324E5EE89` | unchanged |
| `apps/mobile/src/db/migrations.ts` | `94B43E34C9F3CEE256324F20CF1FE1551F6A41DBCD4031178AC4CC224B40D94F` | unchanged |
| `apps/mobile/src/db/nodeTestAdapter.ts` | `CE9925A46851ACB3442C702A1B085FF295D3A69E93196AE75E8CEB344EAB9ED3` | unchanged |
| `apps/mobile/src/db/repositories/adjustments.ts` | `1FF90B7E3223808D05DC25F351C5E2D9B1089050394D93B342A0EAC54D97B39B` | unchanged |
| `apps/mobile/src/db/repositories/attention.ts` | `94C358F1CFBC9D0E0A5605E461D8AE1C411681D962D66B617AF16D06BB6675E2` | unchanged |
| `apps/mobile/src/db/repositories/batchTracking.ts` | `8C4A8DAD854D7B8E2D48DD567C33ADDC2104F998DA9807385BCE137406A9E123` | unchanged |
| `apps/mobile/src/db/repositories/common.ts` | `D40DD7F351AB0A3F29A9382CE17BAAF668E8B64E61C52B2C2D3FA30B2B15398D` | unchanged |
| `apps/mobile/src/db/repositories/costing.ts` | `9400E3D1A3AFCA77C9D534A0E95DBB5FEA5140379FA307D852AE5DDD35DAA1AF` | unchanged |
| `apps/mobile/src/db/repositories/customerAccounts.ts` | `78034F562F81B0B4DFC997DCCE5E288D96CDA2B12A7818C7A7CE38E848132306` | unchanged |
| `apps/mobile/src/db/repositories/devices.ts` | `AB38F2C51D27D6D160309899C858975FB341349C8D351066B8159FEAE6CFE871` | unchanged |
| `apps/mobile/src/db/repositories/expenses.ts` | `422249BFE2BD7ACB6A8D6C975F8FA700BFB9893A98E7CD280EC83E5F8C4B53A2` | unchanged |
| `apps/mobile/src/db/repositories/index.ts` | `81955AFDB573351B3FA8E96AFF7F46E7470534B076073D029AE87C9F8353E2F4` | unchanged |
| `apps/mobile/src/db/repositories/inventoryChecks.ts` | `1D4649C4591DF18A60C9744438D7DF9A3CE7598966D7F84B99C10F64622AE5BC` | unchanged |
| `apps/mobile/src/db/repositories/inventoryEvents.ts` | `C62CE5EA865F9C525140B62433D280BC71B1BAA9EEC06C04D8A41812A2E9F63B` | unchanged |
| `apps/mobile/src/db/repositories/outbox.ts` | `D89A8F7F175E8EE91D8DB4CFD0FCAAAE53E7742D5399D4B8A79511B1C9DA50A3` | unchanged |
| `apps/mobile/src/db/repositories/packageUnits.ts` | `8FE46E84BFB7944476DF140E46675A68F01EEC4E2706B0BF9FDE632E0417C1C3` | unchanged |
| `apps/mobile/src/db/repositories/payments.ts` | `3051BBFE73F7EF249314A68E70D563178B32BC58E4FE97A819CC8E3C4B2A1D0F` | unchanged |
| `apps/mobile/src/db/repositories/priceObservations.ts` | `81ABD0BD35E3996554CD5168D1745DE87DEADC3FEFF5001BC3AD5399B7EB85EC` | unchanged |
| `apps/mobile/src/db/repositories/productIdentifiers.ts` | `D0ADE4E915E6BF9E537E247F1A3C0073C711ADE5075D1DFDA98327921DF72988` | unchanged |
| `apps/mobile/src/db/repositories/productVariants.ts` | `4D0B9CF553DA795333E7B5A81A4DFEF0421C7905BB14AF02AEA95EA787E298F5` | unchanged |
| `apps/mobile/src/db/repositories/purchaseItems.ts` | `6698E4ED9611DF57F0FE69AA0B1261F85E8AC741DA16914B7BE9B9DE2ECFC0FE` | unchanged |
| `apps/mobile/src/db/repositories/purchases.ts` | `4C13D0331B2C96FD6B91D3B77D0273B6BDA2D68052CD250328EED9EBBAA8A446` | unchanged |
| `apps/mobile/src/db/repositories/receivables.ts` | `7BDE76C28C183DFB42F0B083BEA82AF2380BC563F9550045DF91C3D86A24F938` | unchanged |
| `apps/mobile/src/db/repositories/reconciliations.ts` | `CA941906DC40D891FE1C032BB394D78083272158DE2721905C58EC97E5D40BD1` | unchanged |
| `apps/mobile/src/db/repositories/reorderLevelHistory.ts` | `91EF99E498BB8C7DFB9C9437304AEE0A2539FCCD3C64700F2CAD1EB4574B1358` | unchanged |
| `apps/mobile/src/db/repositories/saleItems.ts` | `6399BFDEC0E4BEF55C6B604C9F69F4D9534A379277F5483ADD55FFD2D6B7AA3D` | unchanged |
| `apps/mobile/src/db/repositories/sales.ts` | `B36155D69FFAF04EB10721D24DC20683ACB38F93107A789F593F44676A49A205` | unchanged |
| `apps/mobile/src/db/repositories/storeMembers.ts` | `6D6A8A4F443AB6B1D2C14A7990EF4816EA5C2C8C2098A87D2454DE576C6A4EFF` | unchanged |
| `apps/mobile/src/db/repositories/storePackageSettings.ts` | `46274EE63F258C7C8900452C3BDFE7895537641E13D65ECE031FC506EAA29495` | unchanged |
| `apps/mobile/src/db/repositories/storeProducts.ts` | `46D7A189666B5D79FFD23B05757582CEDBA9E66A0197ABD07250FFA6C61A9C19` | unchanged |
| `apps/mobile/src/db/repositories/stores.ts` | `C049C78D4C6D9F1BC93E06248554DFA5CAD337035F0086F9461FDDF2C4D46824` | unchanged |
| `apps/mobile/src/db/repositories/suppliers.ts` | `A9CF93DDEBE08D6A0D6B6F7F7B0031D9BF13B81FDACA063C6C725F6E69895F5D` | unchanged |
| `apps/mobile/src/db/repositories/sync.ts` | `5551FE6FC838A883274825447B2CA7F0F93FC7626F9C403D243DFFA15A931882` | unchanged |
| `apps/mobile/src/db/repositories/users.ts` | `95E0B48EDA8BA17B7CEC79577B62B557EF629B3ABE0264F017ADA3089C1B82EA` | unchanged |
| `apps/mobile/src/db/repositories/withdrawals.ts` | `DDB85DA2963D61397C401F6CFBB584EDBAE4AEC19DEEB5B313274DC80CBF9AE1` | unchanged |
| `apps/mobile/src/db/testing.ts` | `7CCB54B2ED562AC16AC248222F44330C547EB7B6367FCA824C0F4D03E3FE0381` | unchanged |
| `apps/mobile/src/db/transaction.ts` | `9582E54805F225E2A155338B5B0F3B39074B78F145D45A65BE92D4F9008FD6B4` | unchanged |
| `apps/mobile/src/features/scanning/BarcodeCamera.tsx` | `9FBEB383D9DD48FBB3CCAA7E807AD6A19DDEE1A72F777E13B59567813C8A1DFD` | unchanged |
| `apps/mobile/src/features/scanning/code-read.wav` | `EFC354FCF7F5A5765EADA8BFB4FD15D5D5AD877223FDFA6E903AD01DE4A23889` | unchanged |
| `apps/mobile/src/features/scanning/GlobalScan.tsx` | `933DE8083D34BD8ACC2FB3782907B59C1012AF85B40667C0A7F89513F33FF9CF` | unchanged |
| `apps/mobile/src/features/scanning/PreviewZoomSlider.tsx` | `3D6056860639356408DF554FE811D73B80A14D302A20F247BD1308B695D67014` | unchanged |
| `apps/mobile/src/features/scanning/resolver.ts` | `A0A7B540B7948A516F89F40D5A77DDFB43AAC25C5D708A3D345412154473F459` | unchanged |
| `apps/mobile/src/features/scanning/scan-added.wav` | `9C4D0BC31317985F0D46AC06020129E276A8320F1F9FDA1C655DC5F72A9BEF20` | unchanged |
| `apps/mobile/src/features/scanning/ScannerActivity.tsx` | `FB1418D0A0F4EA9935D65F163A1B9C25A4870FB574CA63C45D85E2ABC5EE917D` | unchanged |
| `apps/mobile/src/features/scanning/ScannerPanel.tsx` | `A301C5002DA627EE7638CA31D5BEEC3A3FB01D41254AD3D7FC6E6960EA5CF559` | unchanged |
| `apps/mobile/src/features/scanning/session.ts` | `71DCC6F856884E6D0B07C961DA38A93887F6CFBE1213E6A9B8B3CA144A5CDB58` | unchanged |
| `apps/mobile/src/features/scanning/usePreviewZoom.ts` | `80671473E28908E4D7742768D9715DC6C86DADDB41741205ED33698103698D38` | unchanged |
| `apps/mobile/src/features/scanning/useScanFeedback.ts` | `705C607D8C3F196AB04A2DE9C180A6F04A279DD9C451C7823F58B2554F264386` | unchanged |
| `apps/mobile/src/features/scanning/verificationBuild.ts` | `489A5B9FA593A1FCEE28DD4EB28007620479979DD2E2129951A0394FED3A7093` | unchanged |
| `apps/mobile/src/finance/businessSummary.ts` | `5EBD5387355FC52D2AE65A5E582C317268DD98905E7DF3EC42F3BB7BF8D7B4B7` | unchanged |
| `apps/mobile/src/finance/client.ts` | `F8509F2D35A30C4D35A17D0C35E0FB125C1FFA8645FC814320C448FA0A1E77F7` | unchanged |
| `apps/mobile/src/finance/FinanceContext.tsx` | `E8B6CEDFCE147FD2395F87716D7D9E13A414AEDCCA595FB9F1D19A3FFFDF1CBA` | unchanged |
| `apps/mobile/src/finance/index.ts` | `D60A680CFCBF3D9848CC718BEA57CB942C88AB97333188CE6DBCB79093DC2D6A` | unchanged |
| `apps/mobile/src/finance/recordExpense.ts` | `6629C1C409A4397283088535B5BD119AC43C15451DB81A86369389BED4C0D10D` | unchanged |
| `apps/mobile/src/finance/recordOwnerWithdrawal.ts` | `71649DB40810CE6B9E467252E7BC2960FFFE69A1B6349481186895A24628688E` | unchanged |
| `apps/mobile/src/inventory/adjustInventory.ts` | `D355724355E74715371D0F7A7E09409DC3310DA874B641A03724C17CBDA436BD` | unchanged |
| `apps/mobile/src/inventory/attention.ts` | `676602BECA288FEA18E312D689A050C19B80C2F18DEE4008E24805F1919ABD48` | unchanged |
| `apps/mobile/src/inventory/batchAllocation.ts` | `0846816E22247AA28A4930B29EA880955769C6862515F5427BC31E027B6343F0` | unchanged |
| `apps/mobile/src/inventory/classifyBatches.ts` | `AC0FB6770CDB4B884BDFAFB3C7867F8ECD563BAC7C0323A0E4F3CF859419F831` | unchanged |
| `apps/mobile/src/inventory/client.ts` | `28B0EDF39A273B564D8E5013DC7F3A53D4FE9280DD1867B2260852E74C7486EB` | unchanged |
| `apps/mobile/src/inventory/guidedChecks.ts` | `4A5C17D0BBEB6ECA5C6079E8C889741B36959C7DF83D077A5E42E5B5273C3A6F` | unchanged |
| `apps/mobile/src/inventory/InventoryContext.tsx` | `94354151913671DA4C241885609EDA4045CABCB11B34434B858BFF5E9911E54C` | unchanged |
| `apps/mobile/src/inventory/reconcileInventory.ts` | `6B9F2FDA14D8EA513E087C8132D3DBF606679DB3CB95EF36D9852BFCD6D90858` | unchanged |
| `apps/mobile/src/media/nativePhotoFiles.ts` | `9A36241EBBF27519C6FDA21D63F3A1E9D539A8FD6BC34215102B4CBF7C654B11` | unchanged |
| `apps/mobile/src/media/photoFormat.ts` | `045781100D2FCC9C942D7D808FD78C41E88137514CEB34BB9AB5D4CDF2430274` | unchanged |
| `apps/mobile/src/media/ProductPhoto.tsx` | `37A0964E24B74E0342A1E85B511B58902DCD9A992AB78313CB72E50ABF289D3F` | unchanged |
| `apps/mobile/src/media/ProductPhotoCamera.tsx` | `27320E1860B121F82D4451DF06AE3F0FAA1287E31CCA711F3B6BCD49C6147E65` | unchanged |
| `apps/mobile/src/media/ProductPhotoEditor.tsx` | `6F19B36DE7CBDE802C52E0C2649A5C646DFB07DA30DC5C4E9BA03E655D61DFAA` | unchanged |
| `apps/mobile/src/media/ProductPhotoPreview.tsx` | `214A6F7B775748B7F15F9A768D06D8D2F5362FD6020523FCB93569D6D24841DC` | unchanged |
| `apps/mobile/src/media/productPhotos.ts` | `EF22153A136D9296DB1047715CA4058E650295C9C2DC1B2A83AD0F3CC422B57E` | unchanged |
| `apps/mobile/src/media/ProductPhotoStep.tsx` | `2CA516D72CFBC0AA9B455F533C266B408C28CA609C1F7D7C6FE71EF6AA4FC38E` | unchanged |
| `apps/mobile/src/priceIntelligence/index.ts` | `01B0ACD206499DE05EEC071EC513D5DD9048BCF6EFF9CD661986338CE6F38D9D` | unchanged |
| `apps/mobile/src/priceIntelligence/presentation.ts` | `65F43A755EE4B2DF3DCD804819ACC0A6CC49DAD4D9C0645E59AD7FD70B885BE5` | unchanged |
| `apps/mobile/src/purchases/client.ts` | `A3AFC7A45372725A185092014D9D311AB2D3F41601639FF358930389E3704702` | unchanged |
| `apps/mobile/src/purchases/index.ts` | `61A74CCADABDF947B481D3E6F73244347E1A8704DE20660DAD55C867B40FFAD1` | unchanged |
| `apps/mobile/src/purchases/PurchasesContext.tsx` | `832E9AF97214120849B3802098529AC0C710C56C6783B7930B8E75DE7BCAA716` | unchanged |
| `apps/mobile/src/purchases/recordPurchase.ts` | `07A8D86D0EBE4469A51CCF201343F404162F9E627CD9A360BE306C34EFA31099` | unchanged |
| `apps/mobile/src/sales/client.ts` | `5288853E47DD11B33E622CC14898FA8E54286BBCB50B6D8ECFC71B4FC0D67F8F` | unchanged |
| `apps/mobile/src/sales/completeSale.ts` | `2036EB56EB80E2FD2BA0CBE28993FC46F1E54C8591787923FD164961522EA055` | unchanged |
| `apps/mobile/src/sales/draft.ts` | `8A2BF8168EB1B9A20A9F79E5A7A0774303C9584938839E5CBB594D4CED2179D5` | unchanged |
| `apps/mobile/src/sales/draftExit.ts` | `CF607405B56196B0488DAB3947916FDD4242552C30A77F840C91D9A3B1BDED96` | unchanged |
| `apps/mobile/src/sales/index.ts` | `4AFAA2CCB87596D1094F47AAC63DE5EDB20CBB3A16D17DD4EB4AB752639BB353` | unchanged |
| `apps/mobile/src/sales/SaleDraftNavigationContext.tsx` | `469A0EDBBAA6C4E5F265E45595D92498BE9648CBB01D4FF08DBCB8A93152797F` | unchanged |
| `apps/mobile/src/sales/SalesContext.tsx` | `13D1DD1513456908B3DAE51BA1E8854B4D429B83AE744E1C8DA60F6C8A8C2428` | unchanged |
| `apps/mobile/src/sales/syncStatus.ts` | `C6F20F92B237548A206E74775F8B179690A0BDA3E66ED6BF074BA969E4A5A7A2` | unchanged |
| `apps/mobile/src/screens/finance/BusinessSummaryScreen.tsx` | `C159E26AA35E6AAB025BBC269125FCCDB86EF673E0D087EE43C40E41C28B7B90` | unchanged |
| `apps/mobile/src/screens/finance/ExpenseEntryScreen.tsx` | `DD26974FE97C5E6AB47B106F1B81C96C16F46F022A3DFB5726106E06AEE63E76` | unchanged |
| `apps/mobile/src/screens/finance/ExpenseHistoryScreen.tsx` | `DE33E355A497677905F2B8B558857D9A5EA6DA01C4647091A214031785E4F9E1` | unchanged |
| `apps/mobile/src/screens/finance/MissingFinanceStore.tsx` | `E0A2B6345DF2AC3548DD62F9FC94671C1CD99420577080F24DEDF9CA695A8410` | unchanged |
| `apps/mobile/src/screens/finance/OwnerWithdrawalEntryScreen.tsx` | `A82FA6205B108B11DD2CFCF2D9D4464688C5A05D052D710CB4239D0FCEC22057` | unchanged |
| `apps/mobile/src/screens/finance/OwnerWithdrawalHistoryScreen.tsx` | `33014CC3A651D27F0D21E44AE042FBF27275C200DF6B19FD78B9DE02F61816E9` | unchanged |
| `apps/mobile/src/screens/home/HomeScreen.tsx` | `2F811E971552085AD9EA0357BCA90FB4654D10C527F14D982294B3808B8E63EB` | unchanged |
| `apps/mobile/src/screens/inventory/AdjustmentScreen.tsx` | `A3AEF408004AA38718100A628D1024EB404138CD7AEAB4E68E0CE4AEDDF48B9D` | unchanged |
| `apps/mobile/src/screens/inventory/AttentionScreen.tsx` | `2EB0284841601EACAD6FE5677BED37AD1EAD8FC8135F14F0ADED5272E5EE018A` | unchanged |
| `apps/mobile/src/screens/inventory/BatchReviewScreen.tsx` | `CC0344DD9D8734BEA04310E0253201A5B4E295F3B0442217B962C001F1C22718` | unchanged |
| `apps/mobile/src/screens/inventory/GuidedChecksScreen.tsx` | `5D41969F0F5233145EA760F82A843FEC94031FF84FE003CD0B75C0E5C7063A00` | unchanged |
| `apps/mobile/src/screens/inventory/ReconciliationScreen.tsx` | `CCDE3504CEF36EABA7A892953F10A14149BB560D2BBE2AD69056DA53FD1AC30C` | unchanged |
| `apps/mobile/src/screens/products/PackageFormScreen.tsx` | `2D0DF60AE76DFA8C78796FAAF8EBF635A5AA177C4FDF997AD5555905E19037AC` | unchanged |
| `apps/mobile/src/screens/products/PersonalPriceChangesScreen.tsx` | `A40135049428B6BD27C43F6CF313C6D99FC48F7A354125D797AA37DB09A9AD64` | unchanged |
| `apps/mobile/src/screens/products/ProductDetailScreen.tsx` | `E0E2226F17C2BBDE0FBC325D7AA8A0843429780659915FFC54B18BDC71F2474F` | unchanged |
| `apps/mobile/src/screens/products/ProductsListScreen.tsx` | `8C2CDAD25FE1D3F4761A7A86865AB00D0E43D680F4A441A8DEB48EBB55F044A9` | unchanged |
| `apps/mobile/src/screens/products/QuickAddProductScreen.tsx` | `0B06A0465E6754520CB69C8BF81895AFB06727B2534B7D251F5917411D77DF46` | unchanged |
| `apps/mobile/src/screens/purchases/PurchaseDetailScreen.tsx` | `9B384160C3DA9C524FBF5E3E922F2C3A9B3C6AE5D0EACA3DC70D10F261839C6E` | unchanged |
| `apps/mobile/src/screens/purchases/PurchaseHistoryScreen.tsx` | `858B3E7BD6C3A77DAAA76245EF0487CB3D3E529B975C8E49107F310DA8225E31` | unchanged |
| `apps/mobile/src/screens/purchases/RestockScreen.tsx` | `DCFEA5DA86119F1105EF9FD71453FDCBE0701305E0C6DCC39AFC2CC3BE48862B` | unchanged |
| `apps/mobile/src/screens/sales/SaleDetailScreen.tsx` | `7A92E45C8CCB5C7859FC1FBDCF1E514E387346071F51DDFC65E2F4753A0D2599` | unchanged |
| `apps/mobile/src/screens/sales/SaleHistoryScreen.tsx` | `19866C535ACB9513CBA785435BB22CB5E0EDE5883F8BBD0768840E09C7B51871` | unchanged |
| `apps/mobile/src/screens/sales/SellScreen.tsx` | `8D83EA64BEC0FD610C6238376D8E46190722DA3C6901FA7DCDD7332F5C4CB57C` | unchanged |
| `apps/mobile/src/storeContext/provisionStoreContext.ts` | `E61B96F15A249D1AD281AF50746C2C6D711F2F119C780A9FB49F357455F94AC1` | unchanged |
| `apps/mobile/src/sync/applier.ts` | `6E2C5015908F5E2DBA005F1B0FE901F397AF6BB1567143161F4FC78F6CE79B88` | unchanged |
| `apps/mobile/src/sync/auth.ts` | `F5C674C405F227B547A4DE6BB884B2C0B67E5763C8CFF3711AF863DFF7CC236C` | unchanged |
| `apps/mobile/src/sync/identifierQuarantine.ts` | `567400F391EFA7CFD7D1C2A074060271E5E29D999CD6EE7EE7E27FF6E900B071` | unchanged |
| `apps/mobile/src/sync/index.ts` | `15E1FAA58467E3B6533E28FDCDE76365D5C05EF7E5EBD403C151F2557DCB9723` | unchanged |
| `apps/mobile/src/sync/materialize.ts` | `77B3782BB893653B482ACE01C3F315D34D6FCA1992C23DEDC5A201500D5A524D` | unchanged |
| `apps/mobile/src/sync/pilot.ts` | `1BAF9F96F4176525F14B6392826DF5838594D9E1EE462FC3F41E97B2220E70EA` | unchanged |
| `apps/mobile/src/sync/PilotSyncScheduler.tsx` | `1F2E50E80384D1FC86A5E4B6DE25280FA6157821FDD8E8F4884BB1FB410455B6` | unchanged |
| `apps/mobile/src/sync/transport.ts` | `00216A88C00155E351181681ED4478542B3921A5025A3EB9C80B7909AD373B27` | unchanged |
| `apps/mobile/src/sync/worker.ts` | `9436C9C4761E2CF602DC66E4AE906AC10FB9D987FC3DCB95F3B8DA60220D5262` | unchanged |
| `apps/mobile/src/ui/components.tsx` | `FC09AF34E29739FC822636877D5652A4EF5A667DCD76F609552F016A5606D408` | unchanged |
| `apps/mobile/src/ui/money.ts` | `7D09E6B19A6CE018120308CF751B634AF7C00D09A911EC673CA4D62E6E729EE1` | unchanged |
| `apps/mobile/src/ui/theme.ts` | `84A58A3CFFA4D8DF223EC5745EF39B4520D37904440E48605AD7AA0D15082A4A` | unchanged |
| `apps/mobile/tsconfig.json` | `3C85C9560535AF31B7E0C9B8B5EE7A594A9D1AD4153110FC77378A465F4E0B63` | unchanged |
| `apps/recognition-lab/__tests__/calibration.test.ts` | `2548F64497C1C092421CB2471E7F917148F5CA9A643E4610CD47EB428203DB17` | unchanged |
| `apps/recognition-lab/__tests__/candidateCalibration.test.ts` | `017E7C02739DAE66219E7B0F5F1249B7398D9A9FFBE3BA862A276D6D2D94FB48` | unchanged |
| `apps/recognition-lab/__tests__/cli.test.ts` | `A004EFB90CCC50D82B6305C710BD8C156D94BF69BF217DD75EC81E14C3406806` | unchanged |
| `apps/recognition-lab/__tests__/cliOutput.test.ts` | `8B9C9D2A5BF92C6A43EA3FD5EF85CB7300E7421A201C69D6CC01334F253E8410` | unchanged |
| `apps/recognition-lab/__tests__/comparison.test.ts` | `8494815F7C5DF6EBB747E5D88F91E310EA08E6B10985D8A7E8B4BF6837A53FE9` | unchanged |
| `apps/recognition-lab/__tests__/comparisonCli.test.ts` | `3F3DFD2551AB7E9D3667A587D7D08FCB957454ABAE1BE57B21ADC8E094A4F4D8` | unchanged |
| `apps/recognition-lab/__tests__/comparisonOutput.test.ts` | `C8BD14187A012CF232BC4F5E85D7B4832BC22EB59AE64C93536206B06CD54430` | unchanged |
| `apps/recognition-lab/__tests__/deviceBenchmark.test.ts` | `32B91FF0DD53FAA281FCDF64EF28BC69472D6186FD0F05AB45BD747D35236A5B` | unchanged |
| `apps/recognition-lab/__tests__/deviceBenchmarkCli.test.ts` | `960B2C49DD725373AD5D0400A8BAD8025882CB13C502D10A18DFB386A0F1C620` | unchanged |
| `apps/recognition-lab/__tests__/deviceBenchmarkOutput.test.ts` | `E5BCB2E9442EA8C7288BAF7911C90928B9B49F54DF2FC01179814CBA4655A659` | unchanged |
| `apps/recognition-lab/__tests__/deviceEquivalence.test.ts` | `99A2CF84309288F1C24D057F01FD8E73849FF3C143D6DE2A0E3AFD8502346AF8` | unchanged |
| `apps/recognition-lab/__tests__/experiment.test.ts` | `40AE0684EAE23B96B4770B4225E295EADDE0691AFB5100259F26DA83FAD761B5` | unchanged |
| `apps/recognition-lab/__tests__/importer.test.ts` | `B76F4F2D3309F4A27160EDA6F97880A5BEB105AD7495D98E907D94F99C5360F7` | unchanged |
| `apps/recognition-lab/__tests__/metricCorrections.test.ts` | `C6573FDABB787944E8E54FF1AE4C6239A562657409F4523D6EB5C843C492CF2E` | unchanged |
| `apps/recognition-lab/__tests__/metrics.test.ts` | `2F0E722F7CE187CE384DDE6AA812D8A5519A23045020AEDFA94C05795A3A6551` | unchanged |
| `apps/recognition-lab/__tests__/precomputed.test.ts` | `DB46DE786B6D5F0779EAA6DFEFE0E0880E8D35CD6F5F94E4F318DA27A65E4390` | unchanged |
| `apps/recognition-lab/__tests__/readiness.test.ts` | `0C9E26BE028D78841AE481148855B91B4983744E3D79E6588DDB432690575D8A` | unchanged |
| `apps/recognition-lab/__tests__/retrieval.test.ts` | `A9F83C6B9ACB1021370AE0F57B2EB1BBF09C7D1C80DF5F63BFD597F3AE034C7C` | unchanged |
| `apps/recognition-lab/__tests__/retrievalCache.test.ts` | `66866FAF3D45A48EC821D25BBA153EC0774A441923770E8E0F5DE80423CD94CA` | unchanged |
| `apps/recognition-lab/__tests__/retrievalCli.test.ts` | `7B7A9052D4284BBEFA6BF984B2A88F760AA9D62D934732476900975558EE1D84` | unchanged |
| `apps/recognition-lab/__tests__/retrievalCorrections.test.ts` | `A9113AD71079846F55A5CBBD3AF598685C5394211AD85476841FD4798704EAE2` | unchanged |
| `apps/recognition-lab/__tests__/retrievalEvaluation.test.ts` | `EA369C113B298AC770F545AA38AD4EE8E3D8910A6C56A26A9FF2FB669931EF46` | unchanged |
| `apps/recognition-lab/__tests__/retrievalHelpers.ts` | `C0F3C0A4AB01E491FF623CB039E476C1611C5A6092B61E689E00C30C974F745F` | unchanged |
| `apps/recognition-lab/__tests__/retrievalOutput.test.ts` | `E6F74E032A9841B2D21020F8EE264F8A88295203724A8279B8A4262CD3179552` | unchanged |
| `apps/recognition-lab/.gitattributes` | `93F6FEF224B2F7C84B540310601663DB72458EAE3E94AF7D221046A9A3208950` | unchanged |
| `apps/recognition-lab/.gitignore` | `4273B110260280F5736974EA677AF834D43B80DC4D2D207FC193B6AA59C0D5A3` | unchanged |
| `apps/recognition-lab/DATASET_CAPTURE.md` | `F4BC697E6A72D44A20EABD10DF0A7AF217F436C80D3AD3C2DB3AC068FD24BE88` | unchanged |
| `apps/recognition-lab/DEVICE_BENCHMARK.md` | `9A19061112A89ABF0030C9052BAE85753A0D54539B4A711D527FA5DEC8BE53B1` | unchanged |
| `apps/recognition-lab/ENCODER_COMPARISON.md` | `43BEA8F71923309B8D99923AF93561C2B707437E19F94084190D9E6C88E11FCC` | unchanged |
| `apps/recognition-lab/eslint.config.cjs` | `DA6766074378FC2B8519128863A649F5E8DACF70BC544FBFC2F7443BA897785C` | unchanged |
| `apps/recognition-lab/fixtures/assets/cal-a.txt` | `90617073C678565199D47845743835732A3C6640BA36C528C64335D6D0D6E0A7` | unchanged |
| `apps/recognition-lab/fixtures/assets/cal-lookalike.txt` | `877384727DC1F2BEA0C533D2D3B0E34BF92127E9E617E96CFFFE211D4F733787` | unchanged |
| `apps/recognition-lab/fixtures/assets/cal-unknown.txt` | `E99370EDD8101C6CDBA654CEE344C3B030FF6BFBE453F5FDA6BD64F89D44368E` | unchanged |
| `apps/recognition-lab/fixtures/assets/hold-a.txt` | `381F247DF637C8A8DD3053B245CBE434EB05C6DB74035B595D7DBC1EA6D61AD1` | unchanged |
| `apps/recognition-lab/fixtures/assets/hold-b.txt` | `A60435A4A24C4F12A58C1C89CCDED774C440BDA699AFE24F6BA056193AECB052` | unchanged |
| `apps/recognition-lab/fixtures/assets/hold-lookalike.txt` | `A62738DE54B6A1048B7D28759614976AF9364500DB349445045E0B9604172874` | unchanged |
| `apps/recognition-lab/fixtures/assets/hold-package-tie.txt` | `34BE6855723CD23C637E79F245797D34696F0A880BFE3DE374A05A0F58C6F005` | unchanged |
| `apps/recognition-lab/fixtures/assets/hold-tie.txt` | `05C8A16E42C64E9D18B4828F550197969E1553E0DC06E67D6251417EB5C16AC2` | unchanged |
| `apps/recognition-lab/fixtures/assets/hold-timeout.txt` | `87B2101761BD0B8B804B9C7A21E08FE95CC481930B27B9FFD9D5C542F288D373` | unchanged |
| `apps/recognition-lab/fixtures/assets/hold-unknown.txt` | `9B2B5A4C20BAC97A0AB8B5BEEDF82665CAC6FA1BF0014C1D7C3BD8964DB7ED59` | unchanged |
| `apps/recognition-lab/fixtures/assets/hold-wrong-package.txt` | `4312BC3EF01BD70634FFD26383A6FCD726261DFA27A5711E6DC044DE6E00E10A` | unchanged |
| `apps/recognition-lab/fixtures/assets/q-a.txt` | `ABE006461D55259B54DD7FC20DFA874CEEED46FB107D89F2ACE80D9005077871` | unchanged |
| `apps/recognition-lab/fixtures/assets/q-error.txt` | `979C90C3F52E9F8EAE4E403AB817680A9F28A6B43536482BB817E2147AE95851` | unchanged |
| `apps/recognition-lab/fixtures/assets/q-u.txt` | `5D85B2B072BF1E66B10967F7C940B7C3523F302A03162C2307A03B6CC4299003` | unchanged |
| `apps/recognition-lab/fixtures/assets/ref-a-pack.txt` | `B0BB62A8ACA2B954D8D83F79BA7BC65728340B9E983062A1DBFA6C1B74DC1912` | unchanged |
| `apps/recognition-lab/fixtures/assets/ref-a-view2.txt` | `A843A8DE46FBC3FF1CA3C48EEEC0420DCD848B73E607E6900EE6E593BA0D2143` | unchanged |
| `apps/recognition-lab/fixtures/assets/ref-a-view3.txt` | `5F748009327649B66152FDF9990379A56E97F638D98ED4B60F607D6D560B25E9` | unchanged |
| `apps/recognition-lab/fixtures/assets/ref-a.txt` | `A25383215C8AAFCE51889B7AE6BE7FE17B6D40A84175346F8FA0F6E290AD1327` | unchanged |
| `apps/recognition-lab/fixtures/assets/ref-b.txt` | `51255F23F016DB82277F391E9F9B68C46E82DBB490084AB03D9ED48FA31386F7` | unchanged |
| `apps/recognition-lab/fixtures/assets/ref-c.txt` | `5136B50D6D9A2785DB5CB385BCB2D7A5CFF7CC852CDD1269D994DA7C31B66801` | unchanged |
| `apps/recognition-lab/fixtures/configs.json` | `AF8EAEC94FF08D7B8307D3FFF19081DDA0CC227821DE2E93F0727F3196341A2E` | unchanged |
| `apps/recognition-lab/fixtures/dataset.json` | `6B941FCAF47AE42FFEBE5BFE9B608F638BA7700E7135E7D94EF8D00B7C25670F` | unchanged |
| `apps/recognition-lab/fixtures/generate-initial.mjs` | `D3FB0C70630B8C850B1FD1020976553C40748B4C01C27A1E06A44DA212EB5B65` | unchanged |
| `apps/recognition-lab/fixtures/r1-curation.json` | `7524C00C9DCC79339B77DF8689405BC435650F7E89277B79C36CC3510B59CB6E` | unchanged |
| `apps/recognition-lab/fixtures/r2/config.json` | `398D2539E869FBAC4B0A32E8C2AAB3C5D43B24DF569DFCC545B3D1C089A1AB01` | unchanged |
| `apps/recognition-lab/fixtures/r2/draft-registry.json` | `C4A0BCCF078BF89B440857C77DA22BD6156BB54BD8F5C2AE11799E32232DEC65` | unchanged |
| `apps/recognition-lab/fixtures/r2/generate.mjs` | `896611002F721DF8A16122BD360BAB13DB652C8B8CE08B34B0BFC00534B41358` | unchanged |
| `apps/recognition-lab/fixtures/r2/inputs-calibration.json` | `E27644298321E7F8DE2628D0BB75953FC9826EE56FC38EAB4A4A6B465F909099` | unchanged |
| `apps/recognition-lab/fixtures/r2/inputs-development.json` | `4B34B5656F0ECE35AB21DB6527527CE4647E7A75BA8BC081D9FD6BD5A5729122` | unchanged |
| `apps/recognition-lab/fixtures/r2/inputs-holdout.json` | `C2192F809F9F74AD043FA473E06B2911855505857FA310AA3A8E8B737FE345DB` | unchanged |
| `apps/recognition-lab/fixtures/r2/toy-a-artifact.json` | `3D795F77A7A548938074887A7FFC2087FEEFF6D382FED2B1AD3D64AC52DFCB9F` | unchanged |
| `apps/recognition-lab/fixtures/r2/toy-a-calibration.json` | `B0F3B2454C8517004D75B0EEFAD8507FE561ECBFA5DB2BEEF9B2941996B65BEA` | unchanged |
| `apps/recognition-lab/fixtures/r2/toy-a-development.json` | `8CADE7215452EBF50C2A49468E0C957BFB34F7FAB7C023F3B812DA90FF7248F4` | unchanged |
| `apps/recognition-lab/fixtures/r2/toy-a-holdout.json` | `8CE5DABAD9BC6CA35AA9ACAF1E4F1D9089543B0D8A86EFCFCA045F6B2F27889F` | unchanged |
| `apps/recognition-lab/fixtures/r2/toy-a.json` | `E8C1D491ABD2431878AE4FBA95588473452C404A38E5CADCF232498B6288663E` | unchanged |
| `apps/recognition-lab/fixtures/r2/toy-b-artifact.json` | `E82342EDE373B94FAAEDB590F6A83A7BB2A2B4E59F0E9D577A55A0FD7252923A` | unchanged |
| `apps/recognition-lab/fixtures/r2/toy-b-calibration.json` | `4D06F86A226E6D6366F4CED7378115A78EAE186A20FBBEDBCBA0D9B203299159` | unchanged |
| `apps/recognition-lab/fixtures/r2/toy-b-development.json` | `7DEAB0EB6ABCFBD433530598F742E9069B9F56E43266FCC7A4400C4608D4A1F2` | unchanged |
| `apps/recognition-lab/fixtures/r2/toy-b-holdout.json` | `790089EE901F5F128157EC2A3BD6AEE43695C4BB58532FDA5463C93DA3D9C514` | unchanged |
| `apps/recognition-lab/fixtures/r2/toy-b.json` | `205FD6CED459E710B7FE733CC8EB0DD856EB77A525047D17655F81E1383249F5` | unchanged |
| `apps/recognition-lab/fixtures/r3/benchmark.json` | `10457A2ECF2BCE8032A64FCCCC38A1900B49C290A9E44D11ED58C34B1C268EAA` | unchanged |
| `apps/recognition-lab/fixtures/r3/drift.json` | `7B28BF2D9208538D0F6F9A00D16EA2632BCAA4E48ECB820CA448803F1DB66DC5` | unchanged |
| `apps/recognition-lab/fixtures/r3/equivalence.json` | `94862C4F71004375812FF6FA52001E46DD3528A7479422DC570D45C05F4FB26E` | unchanged |
| `apps/recognition-lab/fixtures/r3/failure.json` | `049317CCD549CCF2329DCC18EF20910B7A4869360719801895ABF1DFB8E32296` | unchanged |
| `apps/recognition-lab/fixtures/r3/generate.mjs` | `014897714B3E2A6C204955A52F91F60147EC03705F560DA9B93018ECAD852B0F` | unchanged |
| `apps/recognition-lab/fixtures/r3/incomplete.json` | `2333C2837715014D2BF65CBAC25453D0108F02C6608BD229472330A8F4B1E287` | unchanged |
| `apps/recognition-lab/fixtures/r3/paired-benchmark.json` | `590CBB0EF9DA4274A07109DE6F5B78ED7B7C74F8EC1CD2FFE16076DFF2CCFF68` | unchanged |
| `apps/recognition-lab/fixtures/r3/paired-equivalence.json` | `88681256B0B7F987D00C7B172BBD6F8279A9551CDDF69E50D317788FED5B7F62` | unchanged |
| `apps/recognition-lab/fixtures/r3/target.json` | `ACBB174CBC7ECB0373BDA3F8F2CC403954D8239452BBD45FE2DB130D0D80A57C` | unchanged |
| `apps/recognition-lab/fixtures/r4/selection.json` | `91FD7CF9220D506FDF517BB26907F6A5BFFAC54101E14F5EE4B91C3B0BD52DAC` | unchanged |
| `apps/recognition-lab/jest.config.cjs` | `5C5C3169D18B0E6CBB74F66104491BA75D9A610A2844C0BC3785DA900EA9A990` | unchanged |
| `apps/recognition-lab/package.json` | `27E013375BBDF93E13C8D8E106C843375C752604AB053E742F74CFCA1A6FB87A` | unchanged |
| `apps/recognition-lab/README.md` | `3614469D195470ACA4BC34324BA72B98D134CBA4260489C3A7667C69BDAC3344` | unchanged |
| `apps/recognition-lab/RETRIEVAL_PREPARATION.md` | `D9873629BCAAE206FD4ED0705F4F18553B23B659A7D2A80AAB27468D8470BDD2` | unchanged |
| `apps/recognition-lab/src/calibration.ts` | `AA151B0AD451C5A2E62EE721C9528C62B9BE39BDAED5EF96F017D8E2DE3FD20A` | unchanged |
| `apps/recognition-lab/src/candidateCalibration.ts` | `6142A536B90D7CD36913BAEAC463C255C72B569EA697D33DD5CB1C7E5B24196C` | unchanged |
| `apps/recognition-lab/src/candidateFreeze.ts` | `E60C80B9EC30FA91BAB7839D879C4BC1BF78AC198B60E23AC85FEAF5F7D9F76E` | unchanged |
| `apps/recognition-lab/src/cli.ts` | `97C9F63C8DDCD04468935096CFFC3C0D9ADB5FDB66ED4A62E380CCFA28296497` | unchanged |
| `apps/recognition-lab/src/comparison.ts` | `6E7B9B91F42E0B57CCE9E02449E2A361B6095C6E4420801D13ADF6C6590865B1` | unchanged |
| `apps/recognition-lab/src/comparisonCli.ts` | `E4ECDA935DA0D89608436B39B9616803CF6108A893CCB358E2E5B67E7EF40D7A` | unchanged |
| `apps/recognition-lab/src/curation.ts` | `FBCA3BE1398688328B502073EA205B44CF53EA8F50C084FB74C00EB806AA7D7B` | unchanged |
| `apps/recognition-lab/src/deviceBenchmark.ts` | `4B13F2AC086995FDD1889010F22B6F488C8ECAF81B88544D92EFD71CAB51DD81` | unchanged |
| `apps/recognition-lab/src/deviceBenchmarkCli.ts` | `D1EBCEE13CEE26BC5513D291E541BA617825BB3BA645403DCEAFAE825BADE3D6` | unchanged |
| `apps/recognition-lab/src/deviceEquivalence.ts` | `4214139C775029F768136BE3430A42379330705A3C18DAA7D8EA4DF11961D4DC` | unchanged |
| `apps/recognition-lab/src/experiment.ts` | `D74B66BDD37D3034DFBE7E9841CF6364EAC3A5C2E0E8CDB5E15B2D547FFDCE8B` | unchanged |
| `apps/recognition-lab/src/importer.ts` | `7EB4928F05DCAE4718060011A4D9F2D161E5E3D4C1304C93A697109E00C758A6` | unchanged |
| `apps/recognition-lab/src/metrics.ts` | `E7347DB7837D8A7CF7579A25F277E2FA3832426F3986947508EEA7A887BF9A53` | unchanged |
| `apps/recognition-lab/src/precomputed.ts` | `7F47E43CA48249957240C98B7D4262DF4BB5809346A5323BD2960A1AC8BFF46F` | unchanged |
| `apps/recognition-lab/src/provenance.ts` | `900E3F2D8FFECB62105EA1B2D9536C37FA64B2EE76EF279FD05B572C6518DDC6` | unchanged |
| `apps/recognition-lab/src/ranking.ts` | `A553D95559B9BF64FD43B7E310F831B9DA53D14D9E8DC61B8503226499204A4D` | unchanged |
| `apps/recognition-lab/src/readiness.ts` | `4A56C8F2E9544F7C085F0732DC5A6EAC87D2F3DC202AEAD1159F5E9B69C2CF50` | unchanged |
| `apps/recognition-lab/src/retrieval.ts` | `D3A212EC134687CA23F496DF9F53AB4B7FDF70240F5EAC8DC4EE5FB003D2B064` | unchanged |
| `apps/recognition-lab/src/retrievalCache.ts` | `7178238BFA6C68AD38B2056448204FE7A94CB3E6EC9F509AA8F52B23A6F07381` | unchanged |
| `apps/recognition-lab/src/retrievalCli.ts` | `2F45DB114F35E0683BFEE0784576F557D4B65C8B6A979EB50DDDC362E265199E` | unchanged |
| `apps/recognition-lab/src/retrievalEvaluation.ts` | `5F6960ED52A6A3F73AAC099FF738491D9238C4A9C29351E0885593508B8366C4` | unchanged |
| `apps/recognition-lab/src/retrievalGallery.ts` | `4C1219E3A29B5AD9865C055F59F4344F1EA1C4593815BC42227007E55D2CFEAF` | unchanged |
| `apps/recognition-lab/src/retrievalPaths.ts` | `152350DBF01AA842AB037674162E04E7B596E407044073A9558A879184DD5316` | unchanged |
| `apps/recognition-lab/src/schema.ts` | `31AD6129427D2B41A9A10CAEB425A385D9ED453D572714A587B1B1AC4B399CCF` | unchanged |
| `apps/recognition-lab/templates/r1-v1/captures.csv` | `42C65204C8E8A5077268BF5526DC709D2F5D3C4D7838BFB0C3D89FF21D1F275F` | unchanged |
| `apps/recognition-lab/templates/r1-v1/curation.json` | `6DEFBC8B32F8DC203BFDA11A58673652A2E2258BD4380AB6872C9B02574672E8` | unchanged |
| `apps/recognition-lab/templates/r1-v1/dataset.json` | `BB5B6FA031985E2FCCD3E177F4F93338CCA47ED9F8089A0F6665A205E54B5C54` | unchanged |
| `apps/recognition-lab/templates/r1-v1/README.md` | `F489049CBA11BF4AC19786AFF54134AA9C751F4067994AB2A907F01A91138D52` | unchanged |
| `apps/recognition-lab/templates/r1-v1/selection.csv` | `6DDC53414C3E18ED3E7D031BE13C8DE1693E05F03BD40ABDD5948AEA28C1467D` | unchanged |
| `apps/recognition-lab/templates/r3-v1/benchmark.json` | `286AB12F2EC6F214B58B49056DE7F783CB2EFA3A1AF53B2CCF61B865DB17BADB` | unchanged |
| `apps/recognition-lab/templates/r3-v1/README.md` | `AE7B8B4E51C8A7A66BF74EC98717B04E8C65CA67FF2EDE2B896BB0D560F58FAF` | unchanged |
| `apps/recognition-lab/tsconfig.json` | `22186279AB7839DF08D469AFD21E87311C9BA35A5898EE5C566C3D263B3A878E` | unchanged |
| `docs/architecture/DOMAIN_DATA_MODEL.md` | `083DE139D804860B2FC354A74A56B0E358610B5CCAA03B4CE96FF0CAA9D00EBB` | unchanged |
| `docs/architecture/OFFLINE_SYNC.md` | `986DCEAECC476F5E881CC595D40839E04F94A8C4F18C697318E3702AF9BC77BA` | unchanged |
| `docs/architecture/TECHNICAL_ARCHITECTURE.md` | `0BCF9A69593FB73AC615B192BC9E4E2003D924A2CD5A4DA0ACAA1D069925C3E1` | unchanged |
| `docs/decisions/DECISION_LOG.md` | `E3CC963384A3B089EF23FF100BC10E20F9A02B3DF3234A786F8F97A5CD9E0288` | unchanged |
| `docs/design/DESIGN.md` | `5962912472DDC464E702E55923DAA4E625BD41DFDE8752A0ADA04E898B7B1172` | unchanged |
| `docs/design/README.md` | `C5E8CE4C8C37B4DFD52C4D46E81860FFE47E95C7C7D750FE2FD9E7C927BCAB79` | unchanged |
| `docs/engineering/BUILD_PLAN.md` | `B6506D651AFCF88CB3C8402D4B18710107D583BC721B249B7DD34839CEE09D41` | unchanged |
| `docs/engineering/DEVELOPMENT.md` | `A43C96739ECC2D5E4F61243346D58406E3E9E5949385A4D72F48332C29D0C491` | unchanged |
| `docs/engineering/FIRST_CODEX_INTAKE_PROMPT.md` | `E22BA5B465C699743C183634D3EDE97228ED2AE52922C8F300A96714EC0901CC` | unchanged |
| `docs/engineering/IMPLEMENTATION_AUDIT_WORKFLOW.md` | `722749E794B30920B01FDEDD0892791366035D3B09744A3F4E968443B081B024` | unchanged |
| `docs/engineering/LOCAL_DOCKER_WORKFLOW.md` | `42BEF19D766CC48953528C82C3D63F6BB7FA3EF6215992893A8A245FDAED9F93` | unchanged |
| `docs/engineering/M0_FOUNDATION.md` | `6BCB23781D16B2B61BC6DA43DD83683F953BC274EA1BC83DB8C29386078A0EB1` | unchanged |
| `docs/engineering/M10_MARKET_PRICE_PLAN.md` | `3C1FB78D209C99E7E4BAE342E148A917AB6129FE44D436A08F3991BD26AF0E87` | unchanged |
| `docs/engineering/M10_MARKET_PRICE_TICKETS.md` | `E5D508CE9E70D7A57902D12B844E327E46432390FB4616B5505A7CC5963A04FF` | unchanged |
| `docs/engineering/M3_AUDIT_CORRECTIONS.md` | `C8C4148BDB661521B65BF0A0D8E4E269F9C09661DDA932FDA2AC334C18073BC1` | unchanged |
| `docs/engineering/M3_SALES_PLAN.md` | `7DD6395FFE7D728D14FC46B4A6A50036102F6C505A4082518FC80820F3BF2FC3` | unchanged |
| `docs/engineering/M4_AUDIT_CORRECTIONS.md` | `49EA55FB9ACD63B32F6F96BAAB7F72226E56A26462813BFDDD5E49B00F2049E4` | unchanged |
| `docs/engineering/M4_IMPLEMENTATION_HANDOFF.md` | `C740A1DE70182C2B6700A0BC452031D62FFBB612D95D85D13364DE4276961ABE` | unchanged |
| `docs/engineering/M4_RESTOCKING_COSTING_PLAN.md` | `21631896BEFD4CB0E07F62E170671D6751BF31C59C0FD97DABAB5E9BC22D868F` | unchanged |
| `docs/engineering/M5_AUDIT_CORRECTIONS.md` | `7A76953F92782B2FCE3CFBF8653733F74C87DD9EDC0CDDE6732C34EB4039B6DF` | unchanged |
| `docs/engineering/M5_INVENTORY_RECONCILIATION_PLAN.md` | `B00001656C7DA6BEDFA4156B87CCE4F90BE0CF76C007A7606ED9AE219F100F25` | unchanged |
| `docs/engineering/M6_AUDIT_CORRECTIONS.md` | `B4FE34BEDAAF147333529526B9177434F39537EB8CF0B8DAE3C6710044A36711` | unchanged |
| `docs/engineering/M6_EXPENSES_BUSINESS_SUMMARY_PLAN.md` | `C771D02266C8E967B10CE4256A17A69D3C7DFF7B35482B42399541D891E1D90E` | unchanged |
| `docs/engineering/M7_INDEPENDENT_AUDIT.md` | `CA1A48ED08C913ADFFCAD1262F46BB0C663C0502EC5DB11CE9ED943A1F9ECE2E` | unchanged |
| `docs/engineering/M7_OFFLINE_SYNC_PLAN.md` | `2B44F0DE8AC6D92BA5677C4E6EFCDA02CB8A09527762F180C8325F097E4FADDF` | unchanged |
| `docs/engineering/M8_ANDROID_VERIFICATION.md` | `631C0406AFE440360B4B76385EBE71791BA407CFB69A76D79C224662ED73B0FB` | unchanged |
| `docs/engineering/M8_CATALOGUE_LOOKUP_PROVIDER.md` | `7CA25CC154B8801A59D782D9650FBF67A4FE4CE7F58230825207417721E8FFB0` | unchanged |
| `docs/engineering/M8_IMPLEMENTATION_EVIDENCE.md` | `0E459E3A3645EEB490E351B2127E674D1E7846A06CA0A61E039920AA6CB4F671` | unchanged |
| `docs/engineering/M8_IMPLEMENTATION_HANDOFF.md` | `DE057C7B228D507F47C39534675C8EB14349B16C762EDF8CA335BC34D55A5AA7` | unchanged |
| `docs/engineering/M8_INDEPENDENT_AUDIT.md` | `F7ECF28C1B4A401A80D8D5079339889292CB3CCC4775CBC27DBE58EF4DE345B8` | unchanged |
| `docs/engineering/M8_SCANNER_PLAN.md` | `24FF9455B451C28938C0714349671ED88ABE3D80737E282B17AFBB8BB5EC2E40` | unchanged |
| `docs/engineering/M9_INTEGRATION_AUDIT.md` | `6249C7EB954949665014AA6CA12A6E6011C1C0893D79FAB919864B458CD1BD3D` | unchanged |
| `docs/engineering/M9_INTEGRATION_CORRECTIONS.md` | `AD966C4E33C03A6E973AB91CDA05A77C281B3D5FECB39DDC48AD3A2CCD2F2359` | unchanged |
| `docs/engineering/M9_INTEGRATION_PLAN.md` | `1477AEA9537950DAEB409906D912993DFFC05EC59DFA0FABBB85C73DE835E0CD` | unchanged |
| `docs/engineering/MULTI_AGENT_WORKFLOW.md` | `ED322489BB18C9A68F86DF016A7AA5B90085270EE680DCBFEFC2D53FB2C55DFC` | unchanged |
| `docs/engineering/TICKETING.md` | `1C41E0FC9DABFF940993DB540F5A06B84659B8319FB84679A132EFA427A16ED1` | unchanged |
| `docs/engineering/tickets/M1_DOMAIN_LOCAL_DATABASE.md` | `303C25BCB27CEE9840FFBB7B36296178DB94461F40F3378A71FC6823436478A2` | unchanged |
| `docs/engineering/tickets/M3_SALES.md` | `6C7D7EE89F0B599C437C18E713CA1386A47E03E5742C22652252DE6EBF696E46` | unchanged |
| `docs/engineering/tickets/M4_RESTOCKING_COSTING.md` | `4C1C49EBE6D8018E7B2F5774A442D92CE07235A76ED2A99EC03BA1830E19A88E` | unchanged |
| `docs/engineering/tickets/M5_INVENTORY_RECONCILIATION.md` | `2A5DA759F68493AABF7D0383A4EC82FE2ECA707924A9A029B3B1808C362A529F` | unchanged |
| `docs/engineering/tickets/M6_EXPENSES_BUSINESS_SUMMARY.md` | `9E84202B62A9057A83B4808040E4BF97E1FC789EF5973738D30D37B011BFF864` | unchanged |
| `docs/engineering/tickets/M7_OFFLINE_SYNC.md` | `EAA52A786268BAD78AC62C97F6511AA23408A9207AD937BB6A982B343161BD5A` | unchanged |
| `docs/product/PRD_MVP.md` | `50A4F8F5D644E5179FF7DFF6BD9A698CB69A260A3F49638939BA27E3F4ECD708` | unchanged |
| `docs/product/PRODUCT_CHANGE_BACKLOG.md` | `77A49A4623D86777A2FC48362452E5D0D402FA166181B58D370D52190FB56188` | unchanged |
| `docs/product/PRODUCT_INCEPTION.md` | `1CECED6381F71B0806990EB9B021ADFE20A8A8D878CCE605F19BC3E72BB241B1` | unchanged |
| `docs/recognition/RECOGNITION_TEST_PLAN.md` | `53845B7F7D5A30CF85332AF6BCC9C24ABA4849946B4444AB0199F08C32E68371` | unchanged |
| `docs/recognition/reports/R0_A2_CORRECTIONS.md` | `821CD04FAD98DA8C3B439541356E6DF716A459B5FEDE760A982336F1269AF1A6` | unchanged |
| `docs/recognition/reports/R0_A2_INDEPENDENT_REVIEW.md` | `28D69BE7845318254448E2C4E4FC0DDBD339A5C0D083CCAF2B3DD7D4A028E361` | unchanged |
| `docs/recognition/reports/R0_BENCHMARK.md` | `DC92C7BDDD987405D7CFE1C6B8649C6BA911AA1668641ED4F73F0DFD347839EA` | unchanged |
| `docs/recognition/reports/R0_INDEPENDENT_AUDIT.md` | `C3C0D361277E9AD9B74C7BA1E9BF06D4FD519A925BAE426BDC1B9BF686531009` | unchanged |
| `docs/recognition/reports/R0_R1_FA03_CORRECTION_HANDOFF.md` | `423E58EDDD26104879E2C2FADCD08588BCD03910ED04CA2568897D5027A18915` | unchanged |
| `docs/recognition/reports/R0_R1_FA03_INDEPENDENT_REVIEW.md` | `C9DD8F450B4A4C4CDEEEAEEBDF452B281AC58108ADE3B8A4378EAE112ADECA7D` | unchanged |
| `docs/recognition/reports/R0_REAUDIT_REPRO.mjs` | `F8BBDD08AB3B5C33ECF901FBBE70F5FDF750D93019B387EB28CF2E350DE1EA2C` | unchanged |
| `docs/recognition/reports/R0_REAUDIT.md` | `BCCFC6451E1ED10E140943BAEA620A5D5E0CD154F7C6B9D757207894568BF31A` | unchanged |
| `docs/recognition/reports/R1_INDEPENDENT_REVIEW.md` | `A2CB342B4D88B9671105D1A98814A233D055CD80C0DC8152BAF0DC78FA2A087E` | unchanged |
| `docs/recognition/reports/R1_PREPARATION.md` | `A5960E4BCD7349123EF8DCBB78EE33E3A779ABF49A385FB3D69A7D0FFAEFC1D1` | unchanged |
| `docs/recognition/reports/R1_R4_FINAL_AUDIT_REPRO.mjs` | `230B5FBA31399AF0FC1C8055B155752C70E01282AA99610868246475893A3814` | unchanged |
| `docs/recognition/reports/R1_R4_FINAL_AUDIT.md` | `68A64EDC3FDF8C623BB5C32DB406E131E956193A3F309DBBF037B81F965F1326` | unchanged |
| `docs/recognition/reports/R1_R4_REVIEW_HANDOFF.md` | `54E6EB87AE720A96F380F9C32B0683A362607306FB839BFEB2EE3F07B74AA4FE` | unchanged |
| `docs/recognition/reports/R2_FA03_CORRECTION_HANDOFF.md` | `0ABCF961194C69E71875D57A0336BF5EC7670D6CE0DDB022B0FAC80FD9815A13` | unchanged |
| `docs/recognition/reports/R2_FA03_INDEPENDENT_REVIEW.md` | `7AA0B87D5F79FF56AA446E25D21DBA6529C741E248E27575BC061A6421F8D4C0` | unchanged |
| `docs/recognition/reports/R2_INDEPENDENT_REVIEW.md` | `ABD7AC83A1F3A69E00A9895C068C2FDE1261E6D509685044468F85131534D103` | unchanged |
| `docs/recognition/reports/R2_PREPARATION.md` | `35EFDC03A190FCE356ED50A971730938C3B77D38CCAA677466145C5E840A12E6` | unchanged |
| `docs/recognition/reports/R3_FA03_CORRECTION_HANDOFF.md` | `E9E1F7B9F27D2DA24A19731F72D7815B7A830CC847118C5F799F054F1137DD06` | unchanged |
| `docs/recognition/reports/R3_FA03_INDEPENDENT_REVIEW.md` | `BA004FBECA6F43B5D26C83C935BD73EEFD8746206AAC2B5B3A7D327B8123C6F4` | unchanged |
| `docs/recognition/reports/R3_INDEPENDENT_REVIEW.md` | `04BDCE326594B24E4DE1F01AA87C899DBDC0D55E921EE123FC7FBF93AE214BA1` | unchanged |
| `docs/recognition/reports/R3_PREPARATION.md` | `6666D2E1EF7EBFE7A31D1D985C5234196106A48911219D7D7BA4AA54491C57DE` | unchanged |
| `docs/recognition/reports/R4_FINAL_AUDIT_CORRECTION_HANDOFF.md` | `A901153CDCEFB5EB400E25C4A97C7308081CA613C27D98758ACEF2DBDC8AF736` | unchanged |
| `docs/recognition/reports/R4_FINAL_AUDIT_INDEPENDENT_REVIEW.md` | `DC7E5FDB99294D4CD5B0E570F7556E3A2BECC3724E9627E7147957B6A00E8712` | unchanged |
| `docs/recognition/reports/R4_INDEPENDENT_REVIEW.md` | `AF290E39C2A84D4001FB81F33A44B6FDCC78D68364F0BC929317DA1CABA29142` | unchanged |
| `docs/recognition/reports/R4_PREPARATION.md` | `F6906F3BDFC82F847281C3E2478E2BF51DD33F6A6D50E9862C496B1D3C6B9AB7` | unchanged |
| `docs/recognition/SCANNING_ARCHITECTURE.md` | `4F61065AE131AF64888E03DCA81992B495C89E419004CB89AF98CF4536269E3E` | unchanged |
| `docs/recognition/TRACK_B_PLAN.md` | `25E1C16CCF2E3945106117E554AFA491BCBDEF2ECBE6CBE8AF0085FC7D9AA3AF` | unchanged |
| `docs/recognition/TRACK_B_R0_TICKETS.md` | `82A741CAA73A4F1F20A3B209A4FC28D58260154C19B0CC2042D112E1F68FE8D3` | unchanged |
| `docs/recognition/TRACK_B_R1_PLAN.md` | `CE74AD3C938F13164D8263F69675955573B3D8DA67A6DBAFD890E4DD67A23B87` | unchanged |
| `docs/recognition/TRACK_B_R1_TICKETS.md` | `86E29355E0306CB182D38CA585C55499607F791CC16A280D59EA831CB34D27E4` | unchanged |
| `docs/recognition/TRACK_B_R2_PLAN.md` | `D6626EBA3540176F31A4D74A3FF78C582C21B8A8911A5B9CFCEE919E15DAFC83` | unchanged |
| `docs/recognition/TRACK_B_R2_TICKETS.md` | `92647977AAE6BA449236B0D808CD755B2F4395BE514915BC14FC2B1EC4E2B099` | unchanged |
| `docs/recognition/TRACK_B_R3_PLAN.md` | `712499B1370A2407ACC2D699D417558C7B83C1AA65607F8A294005761FEB7042` | unchanged |
| `docs/recognition/TRACK_B_R3_TICKETS.md` | `CB6DE8BF37381121DF7E77192E9D095A7E8E0AA4EFEBF59867746E93E35A0B6A` | unchanged |
| `docs/recognition/TRACK_B_R4_PLAN.md` | `7FCDCA94C95DC67A4C3A8B42CBFD3445BAC6D94A9F4CD43F247A96EA6107863A` | unchanged |
| `docs/recognition/TRACK_B_R4_TICKETS.md` | `4F166E5D8A8A139DBF688453D1B9EF6F25F8A12E72E7396458B7D9BCB276ABB6` | unchanged |
| `GEMINI.md` | `4C7F948CC1E3A41539AF7068B1E6082695812C845E901629C8C13299D9E275C5` | unchanged |
| `package-lock.json` | `9E3B66E4D3482960A034815870C2BE44E9DB59E178008D5F954829087009CEF6` | unchanged |
| `package.json` | `3CF73202F1733B87C3DC068285D1354C321F8762B3AADA88111502E1F1CA5EE1` | unchanged |
| `packages/contracts/__tests__/recognition.test.ts` | `FFFC0CCB03EE2195A32B3DD3F1D287FCD7B974BCEE691112DDD02D35F433BCFF` | unchanged |
| `packages/contracts/__tests__/sync.test.ts` | `BED72681FE47F4312AD27ACAFD7DC8762603EB46DDBE5DD2DC4FD57E14262ED0` | unchanged |
| `packages/contracts/eslint.config.js` | `FAC31767CCBCEA87A45430D3D5FA1E5EE8F3CB799100CF962540FD479C731B4F` | unchanged |
| `packages/contracts/jest.config.cjs` | `5B87D9B804D6A69E5A13C76F174F53930BCA73E61D9A586F7056618C5BC62336` | unchanged |
| `packages/contracts/package.json` | `36135771CD22B53654D0690DE9ED5C484CD5312F2E9E5787B93A3AC064AA504E` | unchanged |
| `packages/contracts/src/index.ts` | `25905EE0EA4DE71CDCFD71F652476D35F204DE89BA812CA6003CD203A87C2F1F` | unchanged |
| `packages/contracts/src/recognition.ts` | `54088F99E8157670B4B76AE04B32EB8E53DA271245FFC753BA8874A01D7872AF` | unchanged |
| `packages/contracts/src/sync.ts` | `7808C4909A5097090AE7C655734C5EEE6EF402FB2CE49899AFDA062E6A588AF8` | unchanged |
| `packages/contracts/tsconfig.json` | `D995B8ACD9EAC327668649AA82DCB25D2573B69EF8B2B0D532E68343B638E161` | unchanged |
| `packages/domain/__tests__/costing.test.ts` | `9B3D3C1A5E340C8E560A36CDC3EF81BA8374D9499D4071BEDDB9EE926D280BE7` | unchanged |
| `packages/domain/__tests__/ids.test.ts` | `7A0DB7C15DB41711B4F32FC2E05AD179FA9E9FFE667DCC8EBC0029BE000C2D84` | unchanged |
| `packages/domain/__tests__/money.test.ts` | `B7E55214211302F7C8DE480C9A2C74698B6275A4D4C4CD3519535D840B5512FE` | unchanged |
| `packages/domain/__tests__/packages.test.ts` | `675B11EAF77AFD89D28667C957E7013033789716D58836A0A60102903248D421` | unchanged |
| `packages/domain/__tests__/personalPriceChanges.test.ts` | `74121C6DCD237F125AF37F3FED774E7379C5C13659C2D275FC4A2A9FACCDBD03` | unchanged |
| `packages/domain/__tests__/sales.test.ts` | `5C934C39670DC44927912D36A1571D7EBAB1BADBDC6308EC4126BC84CC8043B2` | unchanged |
| `packages/domain/eslint.config.js` | `FAC31767CCBCEA87A45430D3D5FA1E5EE8F3CB799100CF962540FD479C731B4F` | unchanged |
| `packages/domain/jest.config.cjs` | `5B87D9B804D6A69E5A13C76F174F53930BCA73E61D9A586F7056618C5BC62336` | unchanged |
| `packages/domain/package.json` | `4C6BFC9242F4F73AB0188C71778B1B21BCE22A63DBA293DFADB18B431B1308DB` | unchanged |
| `packages/domain/src/batches.ts` | `6C25910FB7A64F7C097036A092A431F9BC49988A1019569FBB17B167F87E46AE` | unchanged |
| `packages/domain/src/costing.ts` | `827F3017D8F0C85C0374AAADEA5FD96030F40F1F38C20C2F16DF17D5231F16E7` | unchanged |
| `packages/domain/src/errors.ts` | `36A643BF85164969EC4EEB5A51DB886F3DD7E4D880AC5B7C8A9AA540CFC41236` | unchanged |
| `packages/domain/src/ids.ts` | `536DB9F235713005DD19EAD69B1AE17609112C365AA7823A176BC3600E3B99C4` | unchanged |
| `packages/domain/src/index.ts` | `25E4ABCBD1133F92868D145917EF9479282CD55BEFD69C73FAFCF9B90ED613AC` | unchanged |
| `packages/domain/src/money.ts` | `D2D967B629E397A1E188EEDB7A93F2A369C4FD68920595252564D395000ED9B7` | unchanged |
| `packages/domain/src/packages.ts` | `7121F66E19A6415149AE40B0E774445D91F220BD6137ED178F1194A9EB5E3B39` | unchanged |
| `packages/domain/src/personalPriceChanges.ts` | `690372841ED75E590C3C29A406928BD11C560EA23247B03AC898967C71032D9B` | unchanged |
| `packages/domain/src/sales.ts` | `823C221CC6D10FCB13F37135EC7B83983B2679F286417B6A46240202F77F8850` | unchanged |
| `packages/domain/tsconfig.json` | `D995B8ACD9EAC327668649AA82DCB25D2573B69EF8B2B0D532E68343B638E161` | unchanged |
| `README.md` | `A2C2C7EB2AE61B21F10AB51A9E2FB89E8963E78A7280670525774E585D9F77E1` | unchanged |
| `supabase/.gitignore` | `507699EB91144818EDF61D3A079212CACF31D8DB520EAE428E3B48FCF0D6919C` | unchanged |
| `supabase/config.toml` | `091E368063001B27F0FCC5B56A1C1FB34AE374BB591784E9D8872DA8A49D5C2D` | unchanged |
| `supabase/functions/_shared/http.ts` | `61DF9D3FD906D237925CAD196B7B94FFF30B39F743151216F07744A02F45A143` | unchanged |
| `supabase/functions/_shared/protocol.ts` | `AA7FB75236F11A10F89A216A21936710A378F4E43D77E6B0D2F70949E6A82C99` | unchanged |
| `supabase/functions/.gitkeep` | `01BA4719C80B6FE911B091A7C05124B64EEECE964E09C058EF8F9805DACA546B` | unchanged |
| `supabase/functions/sync-bootstrap/index.ts` | `975C432AE74AE21250FBFC1244D473724EE0EC02ECC4916CD3922DB5F3237481` | unchanged |
| `supabase/functions/sync-enroll/index.ts` | `D0912A48683586259A72F6D5169BDDA0B27C0BA2C9C35648DF77990A4F9B54DB` | unchanged |
| `supabase/functions/sync-pull/index.ts` | `4A58179775182FE8F474271C42447BEDFA310FDD4D753FD49A9D6F57CABAE645` | unchanged |
| `supabase/functions/sync-push/index.ts` | `87883B7C4E65E5A5E18607E532CECAC435B8513CA378A1A5ED02F02B80D74F38` | unchanged |
| `supabase/functions/sync-reference-context/index.ts` | `D7EB1B1F7EF0897B0E5AC9A2BB06B55EC975F800561FA8E7220E26CDCE8A437C` | unchanged |
| `supabase/migrations/.gitkeep` | `01BA4719C80B6FE911B091A7C05124B64EEECE964E09C058EF8F9805DACA546B` | unchanged |
| `supabase/migrations/20260919032659_m7_sync_foundation.sql` | `97DBB1D5F646830CEFD4AA544F698AAC43600F2881EF66304BAF16E844228297` | unchanged |
| `supabase/migrations/20260919211406_m7_sale_purchase_graph.sql` | `844885C1E1C87288B066BE61EECE48CF59C9D3F328A4BBE8C71783CFC46B85B3` | unchanged |
| `supabase/migrations/20260919212011_m7_catalogue_conflicts.sql` | `3616630871D1F1B52430E26757A55E08306B9527FC959FE3688A9962DCF983CC` | unchanged |
| `supabase/migrations/20260919212220_m7_m5_fact_projection.sql` | `68EB8A65F378E9CBB4EE2B49C439795FE3914D09993537EB79833E1A479D4579` | unchanged |
| `supabase/migrations/20260919212406_m7_finance_bootstrap.sql` | `DDE48DEFDB38AEE061E1966B2DF2156C3722EBA1FC79AB7DD677C52D9613F0B2` | unchanged |
| `supabase/migrations/20260919212526_m7_cost_batch_hardening.sql` | `6C6581D52DB3B24BB6974D6D8286AE97AAC7D2AF3AB338D9E643ADEB03F3E5D9` | unchanged |
| `supabase/migrations/20260919213259_m7_cursor_bootstrap_hardening.sql` | `3C79F040B5E71B7A99E6E6A408F3A27831CF4332E5E6CB8D77C123F212474729` | unchanged |
| `supabase/migrations/20260919220000_m7_device_authorization_hardening.sql` | `4CF726D3C4727462CA70224E9805D9419F9E75D94FE2BDDEF7EF98F8EC473006` | unchanged |
| `supabase/migrations/20260919223000_m7_bootstrap_operation_history.sql` | `76568B82354D5012E4F516D9D382EF16966BEF6C36B3601DDD0AE04EA3EC0989` | unchanged |
| `supabase/migrations/20260928005512_fix_apply_one_pgcrypto_search_path.sql` | `935BCC74205F176367FBE98B93491B5F2EA5C3186FE879380E715EEE1AC5A7DD` | unchanged |
| `supabase/migrations/20260928010143_prevent_revoked_device_reenrollment.sql` | `A049585FE6D89FC8FB35A6A538655C234E95A46B668EB202BBEF5950225CD8C8` | unchanged |
| `supabase/migrations/20260928010639_bind_money_out_actor_to_authenticated_owner.sql` | `2AA224037F9E6600C9C700FE10FD6A030C8B3BE69D480CF978C141EDE047B048` | unchanged |
| `supabase/migrations/20260928054000_guard_reconciliation_server_baseline.sql` | `4A2694B05AFE34C8BE7E7DA2B2217A4B610C4767538ABD528618718B29CE8E82` | unchanged |
| `supabase/migrations/20260928115526_d045_later_device_bootstrap_context.sql` | `F236A61FA91AD10ECCE225934621B1BBDC77B10F49442C016A947EC4B72B7820` | unchanged |
| `supabase/migrations/20260928160000_d045_reference_context_device_authorization.sql` | `DE9FAE5806F359353708B3ECADD933C180D6FAEB083C99DEBE07CF668D29141F` | unchanged |
| `supabase/migrations/20260929092623_m8_identifier_claim_guard.sql` | `409F8133F713BA15C3D44247636FDD3CBB8E5EDF4433D6B24A245317A762D2F5` | unchanged |
| `supabase/README.md` | `1A660001861070402C8B03145D244250D14DA185886F3BB9752B1EADBD76B9C3` | unchanged |
| `supabase/tests/.gitkeep` | `01BA4719C80B6FE911B091A7C05124B64EEECE964E09C058EF8F9805DACA546B` | unchanged |
| `supabase/tests/m7_bootstrap_history.sql` | `F1CE2CE429509C974652285497332E9AB4A22281706D0682C33D9FFF1FCE57F8` | unchanged |
| `supabase/tests/m7_catalogue.sql` | `56A1E295DBF1C8FE8D4391CC81929A700EB44DBB8DA354213407C78089BD09FD` | unchanged |
| `supabase/tests/m7_cost_batch.sql` | `857B8BB4E576070BF573A94DF12CF60DF769D386177C7B6AEBDBC433B1103F1F` | unchanged |
| `supabase/tests/m7_cursor_bootstrap.sql` | `4209611DC63D0ABE4C86F3695972C6124C5A3CDE80686A01A960C9ED27E93674` | unchanged |
| `supabase/tests/m7_device_authorization.sql` | `6158692AC152A8BD382D0CDBC52DB053D56006253CF46B20A4E6D4219C5D345D` | unchanged |
| `supabase/tests/m7_finance.sql` | `9D2D5AD59E6E6A59915015167F4B6FAF3008B211568CF54B29A9C48F5A1CBD6F` | unchanged |
| `supabase/tests/m7_m5.sql` | `9E40C66D82F483C028346F2963C494551CC67077C5D3956F72B133D6D5E6F2FE` | unchanged |
| `supabase/tests/m7_reference_context.sql` | `4E80ED46F1A32DAE782A4F5F8EDDA67A18ACDE33EC3AB6777AB00124F0B47BEB` | unchanged |
| `supabase/tests/m7_sync_graph.sql` | `AF4BCC8284AD5416E9E82F688C01064F1F1750F694E9D91E0D6763197B0E7B5B` | unchanged |
| `supabase/tests/m7_sync.sql` | `01D0610BB970162ED4C052F32FAF068475689105F7E99581B6BF94E38E345900` | unchanged |
| `tickets.md` | `11F48088B55B02F2C66E71A566AB80A78BC4E21374B7592B20228D97DCAA6A88` | unchanged |
| `tools/scripts/check-environment.mjs` | `22E68D3691D0FD1C27ADD5DF3C47B42872B5075E1320100B5811DFBCC6A5C4E7` | unchanged |
| `tools/scripts/scanner-cue-candidate.mjs` | `7A32C0A5CA398020BD9FADFC1CC486B53B39725659B4745314F5037ACD646BEE` | unchanged |
| `tools/scripts/test-local-sync.mjs` | `9AF6C3C1F54A3820B8ED5EA04600D8AB4701901BA22335F8DA0BA306C4480EAF` | unchanged |

</details>

Fresh log SHA256:

- `regression-before-fix.log`: `968464d364d503a8ce2820db2b7df5c556b29916553ceaaa7034ae09d02146ce`
- `focused-after-fix.log`: `e7cc41a950274e03d994edd32c2a715b3c178930b244d5ab06c427e3f388d91c`
- `typecheck.log`: `bfb14ca4c4b1efdf3310fcb8b2736cd3731fe1103a68f9c59151eccea385578d`
- `lint.log`: `aa823b788b653209ac5fc97190bca0beec475336fef07c4be97de2bc9dc360bf`
- `focused-final.log`: `2c8d6dea977862cbb2cf21c8c40d916472250dde2db9c800f40d1315cc47a869`
- `typecheck-final.log`: `b3dca57b2c56e83dec8f71d4ad2bedc77a2988c6759eb92e50fee659454ab207`
- `lint-final.log`: `aa823b788b653209ac5fc97190bca0beec475336fef07c4be97de2bc9dc360bf`

## Stop and next action

All implementation commands and edits stop after this handoff write; the lease is null. Main coordinator01a098ef-d830-7531-bca7-2d66b0a5b587 alone verifies C1 and grants acceptance or returns bounded corrections to this same chat. Founder-authorized direct report-back follows immediately; actual delivery result is reported in chat, without an assumed automatic wakeup. Physical/live/native/accessibility/second-laptop/recognition-quality/release gates remain pending. No services/Docker/Metro/phone, cloud builds/spending, hosted effects, new milestone or model/effort change occurred.

<details>
<summary>Original integration handoff — historical, predates C1 and coordinator M10 preparation</summary>

# M9 current-app integration stopped handoff

Status: implementation stopped at 2026-10-03T02:45:47.744877+00:00. Sole writer: 01a0ff85-c793-7b63-8b59-cc06431dbed8, GPT-6.1 Sol HIGH. M9-I1 then M9-I2 implemented; all software self-checks passed. Independent audit and acceptance belong solely to the main coordinator and remain pending. No M10/M11 started by this writer.

## Outcome and scope

Integrated the audited exact BigInt/rational personal-price comparison and active-owner/store-rechecked read-only history client into the current accepted M7/current M8 app. Product detail, Personal price changes and the Home card (at most three changed products) use immutable package/currency snapshots and honest normalized-base, zero, invalid, estimated/unavailable and absent-history states. Removed the generic catalogue purchase-history bypass; SellScreen changed only by removing that obsolete test-stub method. Reused the existing rational money formatter under a local alias, leaving the shared money module unchanged. The photo-aware product-detail reload now includes price-client changes; its regression exercises grant/removal of the price client.

No migrations, outbox family, costing rule, market/profit/repricing feature, recognition runtime, dependencies, backend or native configuration changed. Current scan entries, private photos, temporary products, basket/discount behavior and sync wiring were preserved incrementally. Isolated source reference COSI-m9-planning remained read-only at1c8de0d; no stale screen or manifest imports, merge/cherry-pick, reset/stash/switch, install, commit/push/merge, phone/Metro, Docker, cloud build/spending or hosted effect occurred.

## Real current M7/M9 integration evidence

`m9SyncIntegration.test.tsx` runs current applySyncPullPage and materializeSyncOperation against file-backed real SQLite, with distinct origin/receiver device IDs and the validated authoritative reference context helper. Remote purchases coexist with an unsynchronized local purchase; the latest exact package cost100/3 versus prior local25 produces +33.3%, three history rows and one list/Home signal. Original device attribution and private contribution=false survive.

A stale cursor redelivery throws atomically without data changes. Aggregate redelivery at a later cursor and direct materialization preserve purchase/observation/inventory counts; pending local work stays pending until its acknowledgement echo, which marks the existing outbox row SYNCED. Repeated echo, reopening the same database and the unchanged26-migration registry preserve exact history/comparison and one rendered Home/list product. Whole-table snapshots and SQLite total_changes prove comparison/history/list/overview and post-restart UI reads add no business, projection, financial, inventory or outbox write.

STAFF and foreign owners are denied; foreign direct product IDs return null in both directions; lists stay store-scoped. Existing clients recheck every read after OWNER demotion, INACTIVE and SUSPENDED membership; the cross-store pull is rejected. These are implementation tests, not a live Auth/Edge/PostgreSQL or phone result.

## Commands and actual results

Commands ran in COSI-m8-planning. Logs are in `C:\Users\doyew\AppData\Local\Temp\cosi-m9-current-integration-20261003`. All focused runs have zero skipped tests.

| Command | Exit | Result | Log |
| --- | --- | --- | --- |
| `npm run test --workspace @retail/domain -- --runInBand --runTestsByPath __tests__/personalPriceChanges.test.ts` | 0 | 7 passed / 1 suite | `focused-domain.log` |
| `npm run test --workspace @retail/mobile -- --runInBand --runTestsByPath __tests__/m9PersonalPriceClient.test.ts __tests__/m9ProductDetail.test.tsx __tests__/m9PersonalPriceChanges.test.tsx __tests__/m6Home.test.tsx __tests__/products.test.tsx __tests__/navigation.test.tsx __tests__/shell.test.tsx` | 0 | 64 passed / 7 suites | `focused-mobile.log` |
| `npm run typecheck` | 0 | all four workspaces | `typecheck-I1.log` |
| `npm run lint` | 0 | all four workspaces, max-warnings=0 | `lint-I1.log` |
| `npm run test --workspace @retail/mobile -- --runInBand --runTestsByPath __tests__/m9ProductDetail.test.tsx` | 0 | 10 passed / 1 suite after rerender correction | `product-rerender.log` |
| `npm run test --workspace @retail/mobile -- --runInBand --runTestsByPath __tests__/m9SyncIntegration.test.tsx __tests__/m7Sync.test.ts __tests__/scannerSale.test.tsx __tests__/priceFirstSale.test.tsx __tests__/productPhotoPresentation.test.tsx __tests__/catalogueLookup.test.ts` | 0 | 51 passed / 6 suites | `current-sync-regressions.log` |
| `npm run typecheck --workspace @retail/mobile` | 0 | I2 test typecheck | `typecheck-I2.log` |
| `npm run test --workspace @retail/mobile -- --runInBand --runTestsByPath __tests__/m9SyncIntegration.test.tsx` | 0 | 2 passed / 1 suite, final async cleanup and direct-ID negatives | `current-sync-final.log` |
| `npm run test --workspace @retail/mobile -- --runInBand --runTestsByPath __tests__/sell.test.tsx __tests__/saleDraft.test.ts` | 0 | 32 passed / 2 suites | `sell-stub-draft.log` |
| `npm run validate` | 0 | 1183 passed tests; 17 skipped; all four workspace typechecks and zero-warning lint passed | `validate.log` |
| `npm run mobile:doctor` | 0 | 21/21 checks | `doctor.log` |
| `npm exec --workspace @retail/mobile -- expo install --check` | 0 | dependencies up to date; existing expo.install.exclude skips expo itself | `dependency-check.log` |
| `npm run mobile:export` | 0 | 1,627 modules; 5.3 MB Hermes; apps/mobile/dist | `android-export.log` |

Full validation workspace counts:

- contracts: Test Suites: 2 passed, 2 total; Tests:       12 passed, 12 total
- domain: Test Suites: 6 passed, 6 total; Tests:       157 passed, 157 total
- mobile: Test Suites: 2 skipped, 76 passed, 76 of 78 total; Tests:       8 skipped, 504 passed, 512 total
- recognition-lab: Test Suites: 23 passed, 23 total; Tests:       9 skipped, 510 passed, 519 total

Root validate also passed source-only environment checks, every workspace typecheck and max-warnings=0 lint. Source-only intentionally skipped optional adb/java/docker probes. The existing two mobile live PostgreSQL suites (scannerSync.postgres/scannerWorker.postgres) skipped8 tests under their existing M8_POSTGRES_TESTS gate. Recognition-lab has9 existing native-file-symlink capability skips on this host; its Windows alias/junction checks still run. No exclusions or test/dependency configuration changed. React VirtualizedList/suspended-resource act diagnostics remain in existing component logs and full validation; the final new SQLite integration run is clean. Android export retained scanner WAV assets; it is an export, not a physical/native/release check.

Final workflow schema/date-time, gate-dependency and artifact-path validation exited0 using existing AJV2020/ajv-formats. Final git diff --check exited0. No failed required software check remains.

## Schema and populated-data compatibility

Migration registry1–26 is byte-for-byte protected and unchanged; M9 adds no migration/backfill. The focused current catalogueLookup fixture upgraded populated schema25 to26 while retaining existing product, private photo, sale, inventory and outbox rows. The full suite also ran existing populated migration fixtures. The new integration reopened its populated schema26 database with unchanged whole-table snapshots. Real retailer/phone databases were not accessed.

## Exact changed files relative to the recorded dirty baseline

- `.agents/workflows/m9-personal-price-intelligence.json`
- `apps/mobile/__tests__/m6Home.test.tsx`
- `apps/mobile/__tests__/m9PersonalPriceChanges.test.tsx`
- `apps/mobile/__tests__/m9PersonalPriceClient.test.ts`
- `apps/mobile/__tests__/m9ProductDetail.test.tsx`
- `apps/mobile/__tests__/m9SyncIntegration.test.tsx`
- `apps/mobile/__tests__/navigation.test.tsx`
- `apps/mobile/__tests__/products.test.tsx`
- `apps/mobile/__tests__/shell.test.tsx`
- `apps/mobile/app/(tabs)/products/[id]/index.tsx`
- `apps/mobile/app/(tabs)/products/_layout.tsx`
- `apps/mobile/app/(tabs)/products/price-changes.tsx`
- `apps/mobile/app/(tabs)/today.tsx`
- `apps/mobile/src/catalogue/client.ts`
- `apps/mobile/src/db/repositories/index.ts`
- `apps/mobile/src/db/repositories/priceObservations.ts`
- `apps/mobile/src/priceIntelligence/client.ts`
- `apps/mobile/src/priceIntelligence/index.ts`
- `apps/mobile/src/priceIntelligence/presentation.ts`
- `apps/mobile/src/screens/home/HomeScreen.tsx`
- `apps/mobile/src/screens/products/PersonalPriceChangesScreen.tsx`
- `apps/mobile/src/screens/products/ProductDetailScreen.tsx`
- `apps/mobile/src/screens/sales/SellScreen.tsx`
- `docs/engineering/M9_INTEGRATION_HANDOFF.md`
- `docs/engineering/M9_INTEGRATION_TICKETS.md`
- `docs/engineering/PROJECT_STATE.md`
- `packages/domain/__tests__/personalPriceChanges.test.ts`
- `packages/domain/src/index.ts`
- `packages/domain/src/personalPriceChanges.ts`

Only the M9 integration ledger/workflow, this handoff and the M9 PROJECT_STATE paragraph were updated as task evidence. Root M8 tickets, M8/Track B documentation/workflow/index/context evidence remain unchanged. PROJECT_STATE bytes outside the M9 section have matching SHA256 `8a8ec7970027a4dd207bf2cc6fa43298eb348e82268e23cc0e2d0ed728265684`.

## Branch, HEAD and exact status

Baseline and final branch: `plan/m8-unified-scanner`. Baseline and final HEAD: `66ea3fc22595a48d7355d1729bb879496cc98896`. Existing dirty/untracked work was preserved. No history effects.

Baseline status:

```text
 M .agents/contexts/project-context.md
 M .agents/workflows/index.json
 M .agents/workflows/m8-unified-scanner.json
 M docs/engineering/BUILD_PLAN.md
 M docs/engineering/IMPLEMENTATION_AUDIT_WORKFLOW.md
 M docs/engineering/M8_ANDROID_VERIFICATION.md
 M docs/engineering/M8_INDEPENDENT_AUDIT.md
 M docs/engineering/MULTI_AGENT_WORKFLOW.md
 M docs/engineering/PROJECT_STATE.md
 M docs/product/PRODUCT_CHANGE_BACKLOG.md
 M package-lock.json
 M package.json
 M tickets.md
 M tools/scripts/check-environment.mjs
?? .agents/workflows/m9-personal-price-intelligence.json
?? .agents/workflows/recognition-track-b.json
?? apps/recognition-lab/
?? docs/engineering/M9_INTEGRATION_PLAN.md
?? docs/engineering/M9_INTEGRATION_TICKETS.md
?? docs/recognition/TRACK_B_PLAN.md
?? docs/recognition/TRACK_B_R0_TICKETS.md
?? docs/recognition/TRACK_B_R1_PLAN.md
?? docs/recognition/TRACK_B_R1_TICKETS.md
?? docs/recognition/TRACK_B_R2_PLAN.md
?? docs/recognition/TRACK_B_R2_TICKETS.md
?? docs/recognition/TRACK_B_R3_PLAN.md
?? docs/recognition/TRACK_B_R3_TICKETS.md
?? docs/recognition/TRACK_B_R4_PLAN.md
?? docs/recognition/TRACK_B_R4_TICKETS.md
?? docs/recognition/reports/
```

Final status (handoff path was registered before this final write; content edit does not change porcelain status):

```text
 M .agents/contexts/project-context.md
 M .agents/workflows/index.json
 M .agents/workflows/m8-unified-scanner.json
 M apps/mobile/__tests__/m6Home.test.tsx
 M apps/mobile/__tests__/navigation.test.tsx
 M apps/mobile/__tests__/products.test.tsx
 M apps/mobile/__tests__/shell.test.tsx
 M apps/mobile/app/(tabs)/products/[id]/index.tsx
 M apps/mobile/app/(tabs)/products/_layout.tsx
 M apps/mobile/app/(tabs)/today.tsx
 M apps/mobile/src/catalogue/client.ts
 M apps/mobile/src/db/repositories/index.ts
 M apps/mobile/src/db/repositories/priceObservations.ts
 M apps/mobile/src/screens/home/HomeScreen.tsx
 M apps/mobile/src/screens/products/ProductDetailScreen.tsx
 M apps/mobile/src/screens/sales/SellScreen.tsx
 M docs/engineering/BUILD_PLAN.md
 M docs/engineering/IMPLEMENTATION_AUDIT_WORKFLOW.md
 M docs/engineering/M8_ANDROID_VERIFICATION.md
 M docs/engineering/M8_INDEPENDENT_AUDIT.md
 M docs/engineering/MULTI_AGENT_WORKFLOW.md
 M docs/engineering/PROJECT_STATE.md
 M docs/product/PRODUCT_CHANGE_BACKLOG.md
 M package-lock.json
 M package.json
 M packages/domain/src/index.ts
 M tickets.md
 M tools/scripts/check-environment.mjs
?? .agents/workflows/m9-personal-price-intelligence.json
?? .agents/workflows/recognition-track-b.json
?? apps/mobile/__tests__/m9PersonalPriceChanges.test.tsx
?? apps/mobile/__tests__/m9PersonalPriceClient.test.ts
?? apps/mobile/__tests__/m9ProductDetail.test.tsx
?? apps/mobile/__tests__/m9SyncIntegration.test.tsx
?? apps/mobile/app/(tabs)/products/price-changes.tsx
?? apps/mobile/src/priceIntelligence/
?? apps/mobile/src/screens/products/PersonalPriceChangesScreen.tsx
?? apps/recognition-lab/
?? docs/engineering/M9_INTEGRATION_HANDOFF.md
?? docs/engineering/M9_INTEGRATION_PLAN.md
?? docs/engineering/M9_INTEGRATION_TICKETS.md
?? docs/recognition/TRACK_B_PLAN.md
?? docs/recognition/TRACK_B_R0_TICKETS.md
?? docs/recognition/TRACK_B_R1_PLAN.md
?? docs/recognition/TRACK_B_R1_TICKETS.md
?? docs/recognition/TRACK_B_R2_PLAN.md
?? docs/recognition/TRACK_B_R2_TICKETS.md
?? docs/recognition/TRACK_B_R3_PLAN.md
?? docs/recognition/TRACK_B_R3_TICKETS.md
?? docs/recognition/TRACK_B_R4_PLAN.md
?? docs/recognition/TRACK_B_R4_TICKETS.md
?? docs/recognition/reports/
?? packages/domain/__tests__/personalPriceChanges.test.ts
?? packages/domain/src/personalPriceChanges.ts
```

## Protected hashes and limits

Initial baseline:536 Git tracked plus non-ignored untracked files. Final comparison:519/519 protected files unchanged, including116 existing untracked recognition-lab source files, scanner/audio/camera/photo assets/services, contracts, sync engine, migrations, business domain, manifests/lockfiles/native/backend and all preserved M8/Track B evidence. No unexpected non-ignored files were added. SHA256 maps, baseline diff/status and final status are retained in the log directory. Hash coverage uses git ls-files plus git ls-files --others --exclude-standard; ignored historical runs, installed dependencies/build caches and ignored secret files were not included in the initial hash proof. The required existing recognition-lab test command generated ignored disposable fixtures under its runs directory; source was untouched. No blanket hash claim is made for ignored artifacts.

Every protected path and its identical initial/final SHA256 is below:

<details>
<summary>519 protected file hashes</summary>

| Path | Initial and final SHA256 | Comparison |
| --- | --- | --- |
| `.agents/AGENTS.md` | `F7A0C0E110BD296C439787A91398D9A33E41EA66B35C675402EDA39DB2387FAC` | unchanged |
| `.agents/contexts/app-flow.md` | `F1DE1C9654A714F5D0111DFE92E9AF1172643A7CC9C06B0DA8A20005F1F9E8DD` | unchanged |
| `.agents/contexts/project-context.md` | `3AE33F892CC39893B893B3B51EEF99846EB8332B72C040B816E4D0F303E471D9` | unchanged |
| `.agents/contexts/stack-context.md` | `AC2BA3E3F50638236085D9C2802D13FC52C73511691D51F350C4842E0E46D7D4` | unchanged |
| `.agents/schemas/workflow-index.schema.json` | `06D955538E9A9239022F040924BE07C372D0652548BD8A871818FF0B08164887` | unchanged |
| `.agents/schemas/workflow-state.schema.json` | `05D95DD4E138FDA5D8C099A6FF5672379B549043223BD8F36318D80C9362E427` | unchanged |
| `.agents/workflows/index.json` | `79EED7DF6FD26CFC8682F9083F0116117A4AC0A39A6DFC0D9A9DF8294986689D` | unchanged |
| `.agents/workflows/m1-domain-local-database.json` | `F2E36C5E32BE0177D9557593EA0FD607192AA06A0B6CA96B46140BC006DFCB34` | unchanged |
| `.agents/workflows/m2-catalogue-package-units.json` | `3008344A8AFF772B7F910229BE44285A111BC3E545FFA35533FD596C0AD49D90` | unchanged |
| `.agents/workflows/m3-sales.json` | `3DD861A02FBA2E208A84D46BB05C77DD3B9F50577993299A39FC049D3BF85115` | unchanged |
| `.agents/workflows/m4-restocking-costing.json` | `6C69BCB3BCA4B87DB50FA6192150DF0EE9A566DC439976D8BF4E6FDA7254D97A` | unchanged |
| `.agents/workflows/m5-inventory-reconciliation.json` | `67A92366E62779FE9FF1D2B14CBF2219E158782A4EFB33BE69572106C15FB98E` | unchanged |
| `.agents/workflows/m6-expenses-business-summary.json` | `55679F0604F3CE2DA65B3859FC4633D68FF7CC9272334C081E5D3BE488215550` | unchanged |
| `.agents/workflows/m7-offline-sync.json` | `862D7CB252D0A9E5587311593847DAB908938D6351E71A7DF381808B6E3C2827` | unchanged |
| `.agents/workflows/m8-unified-scanner.json` | `F3CB779A068474629D047DC6AD031A95B690734CE3E394778F7575A17EA93DC5` | unchanged |
| `.agents/workflows/recognition-track-b.json` | `464BEBC426A48A127652817A09980F19701A850A897BF541B836A8D697FB3162` | unchanged |
| `.editorconfig` | `A6B98EA7CB6D61ED8D430DD0DFFA46C87012B5CF859D4CE7207898954951FDCD` | unchanged |
| `.gitattributes` | `2A7A5DAAAE1CAD7A41ACC82B6BFCA78869DED5CD8D50FAD26969DDCCA428181A` | unchanged |
| `.github/workflows/validate.yml` | `55BFC0B6D6C8C98CEA12215F428715206A7329448F9285D946961002DD9BD1E4` | unchanged |
| `.gitignore` | `9486DED9DFC6FF0812A92C7470855ACB95EF6C46EF497A9BF56B3C95FBA1E4AF` | unchanged |
| `.node-version` | `73FB1B615E2043A933BE1C0895CDE4358036ACC28D785692509B822AA53C761F` | unchanged |
| `.npmrc` | `3B88D1057ADD6F92EC23DC22DD017E312DED13A042DEB0BA6F08BAD85D936456` | unchanged |
| `AGENTS.md` | `F469794EB1DB40DFE704AFD9DE8DBF7D46D65D91976002F6E0012F02DD9E27B9` | unchanged |
| `apps/mobile/__tests__/barcodeCamera.test.tsx` | `428B5A0B97E9F7753278136CA0668ADBF3660F93602384B39E58A35DFAA3620A` | unchanged |
| `apps/mobile/__tests__/catalogue.test.ts` | `0C17A0B60CA6BAFB9587142AEDA019135A0125C8A22F2B507D210D25D3E61E50` | unchanged |
| `apps/mobile/__tests__/catalogueIdentity.test.ts` | `CCD215B8B87E25985468B4B2E304A735D86A1DAFAAA35984550E01BAEC70B337` | unchanged |
| `apps/mobile/__tests__/catalogueLifecycle.test.ts` | `7B38EAE8E8F23077B61587C081211DD1F81F23AF6A1DCC0FE885EC981DD424C8` | unchanged |
| `apps/mobile/__tests__/catalogueLookup.test.ts` | `8CBF9E6918C5088E4349CF067D81AD8BFBDECC4D24A2CDE0624D70DD333C30CC` | unchanged |
| `apps/mobile/__tests__/catalogueLookupUi.test.tsx` | `DD8BF91C4A86246D7D0C05E2EA3B3D428C3853D85FD93F08285739954CBDE68A` | unchanged |
| `apps/mobile/__tests__/cataloguePackages.test.ts` | `C3DBABE1EF10513DDAFB307437D0D749C205497F80C6AEEE9CE23F7F3832527C` | unchanged |
| `apps/mobile/__tests__/catalogueSupport.ts` | `55525EB839B6B9556BB8A1B2D0ED92641D1F765F6A1C8BB34F545CC500F3A388` | unchanged |
| `apps/mobile/__tests__/databaseStartup.test.ts` | `5EAF512C2F99D03F03CE8E6DA72F564F72797D29611A7B6ECC2CFF99B68EEDE7` | unchanged |
| `apps/mobile/__tests__/db.test.ts` | `ECA4EA752256D79BB53C67748B691F0CF15B9F307D7CAFF73724576F086811D7` | unchanged |
| `apps/mobile/__tests__/displayMoney.test.ts` | `DA1135480290CD35DB04771A4C35818B819DAB1FBE70CFE8040D09706846E2AD` | unchanged |
| `apps/mobile/__tests__/domain-package.test.ts` | `97701852E50319A146A912E92A925EBA8652EB18650A2ED913004F2F2CBC8D02` | unchanged |
| `apps/mobile/__tests__/environment.test.ts` | `9B6F53EFFD45F98A3EB0B6F420F9A0121F663518905D23B7DB32D88E652C7680` | unchanged |
| `apps/mobile/__tests__/m5Adjustments.test.ts` | `AF626B03E3F019B877BF26B205D9FDB9101B2A6DDF22E1433B2C074EA747A094` | unchanged |
| `apps/mobile/__tests__/m5AdjustmentScreen.test.tsx` | `C22395550DB80918F61BEFC59C3ABEDFF2B50769457ABAA9508F40408A97069C` | unchanged |
| `apps/mobile/__tests__/m5Attention.test.ts` | `DE59884EC05CCAC13B90CC3791D420E62EEE513216C720DBA3CFCA7BEF1F218A` | unchanged |
| `apps/mobile/__tests__/m5AttentionScreen.test.tsx` | `A25BF92B44492C973C9D4342F4D74E8740C0ADEC688B78C68D79A443416B9BAE` | unchanged |
| `apps/mobile/__tests__/m5AuditCorrections.test.ts` | `E5FBCAA414F1DB99751F8F9A54F5F0ACF5EAD797EC16B70E7EF706B4E0D83A3D` | unchanged |
| `apps/mobile/__tests__/m5Batch.test.ts` | `549F659AFCEBD4647AAA60C7D9883AB634251AA7CE7E2A0BF5A2C93BB5662601` | unchanged |
| `apps/mobile/__tests__/m5Classification.test.ts` | `F18E97D71495729AE9530B2A057BD937E33A2C55E75ADE89E11C21B9C7FE8836` | unchanged |
| `apps/mobile/__tests__/m5GuidedChecks.test.ts` | `65D185C6EF12F392DB1937FE7F75DB1CEFC440E146096C9C5C4A12AB4F247D9C` | unchanged |
| `apps/mobile/__tests__/m5GuidedChecksScreen.test.tsx` | `8909A4C50B80CE4DABA77D0501CDB10E131B26700A902E7F34FA7C4B6B007EC2` | unchanged |
| `apps/mobile/__tests__/m5InventoryReview.test.tsx` | `AFA52612AB88062770C7C7C0BD1C44162F0A23809155EA2752A8D328850B485F` | unchanged |
| `apps/mobile/__tests__/m5Reconciliation.test.ts` | `83AD21A401B9E7E15BBECAC5DC91D0AF70E95917BE345BCF58F291062D3A6E0B` | unchanged |
| `apps/mobile/__tests__/m5ReconciliationCorrections.test.tsx` | `9611EE8157820AFB62BD1F3320F86537799348D276CB1F7FD6D139EA7F365DAF` | unchanged |
| `apps/mobile/__tests__/m5ReconciliationScreen.test.tsx` | `C6C5E2A84F6D52BE295C31D468CB2962710E04CFF6416B08EE51211EE794E2AE` | unchanged |
| `apps/mobile/__tests__/m5ReorderThreshold.test.tsx` | `03519D6E6FA90D410CB7DCB2E77838D98A847B431F7D85C9A6D457E5D13462BC` | unchanged |
| `apps/mobile/__tests__/m6BusinessSummary.test.ts` | `1E6983F79CA781345AC6F597DC966520684DC9106DF1CC66A8CB6A7FA7486D07` | unchanged |
| `apps/mobile/__tests__/m6BusinessSummaryScreen.test.tsx` | `573177D024A5A7064E9ECC1D794121CCB813DB32FC88786753942FE6C67A24BE` | unchanged |
| `apps/mobile/__tests__/m6Expenses.test.ts` | `CEBC06F2A1E0F1A9753F939B1877ED8E6ADD2D0CC7113EA5BDA83E319FBD5C30` | unchanged |
| `apps/mobile/__tests__/m6ExpenseScreens.test.tsx` | `A876C64A09E16B4B04964EF6DCBC171AC9515AB1E7CF75664D26D81E1F1E8C98` | unchanged |
| `apps/mobile/__tests__/m6Withdrawals.test.ts` | `3299CC88FD185282F70B5222A82BD7BAF1C0913743B19BA6B6D98EA459898F11` | unchanged |
| `apps/mobile/__tests__/m6WithdrawalScreens.test.tsx` | `7D8E83EBB3C3EB89F1145DFB67625E76BADD8D77D6D73258FE0B9D476785EBA4` | unchanged |
| `apps/mobile/__tests__/m7ConcurrentCosting.test.ts` | `74C62B6C762FDD5202D53B54F59B7368A8243E12F9AAECB9F36AC8A6B0445046` | unchanged |
| `apps/mobile/__tests__/m7M5PullSemantics.test.ts` | `18B1734EA714A5B6ECB2678DF372C7B119BDC1CEE00D3139EAA807CF92237C9A` | unchanged |
| `apps/mobile/__tests__/m7Pilot.test.ts` | `C8BD9B4A0251AE64B8C314B75A0812CF9C914C223A6E789B1A5F18FF181875D6` | unchanged |
| `apps/mobile/__tests__/m7PullReferences.test.ts` | `2C7A272D319DC0C99D7AA85DB72DCC9616CBFD92275723B0949385D72E5F4F46` | unchanged |
| `apps/mobile/__tests__/m7PurchasePull.test.ts` | `81CFF7F7B4E093E0EAE0138D47AF6327E050187EB2B21C4365721506442D212D` | unchanged |
| `apps/mobile/__tests__/m7SalePull.test.ts` | `B12D279AB327002BDF6BF813780398FE7F611828F0C7D92700C882E49A5960D2` | unchanged |
| `apps/mobile/__tests__/m7Sync.test.ts` | `C67FC47BE6975641C55C5195E4E761205AE7EC4FE05FAD3CE2D63BEF4CCFBE01` | unchanged |
| `apps/mobile/__tests__/migrationHistory.test.ts` | `3E95F43B146EC087FA9CC70B040A1A3484066B35E85A57076F8091F9E381035B` | unchanged |
| `apps/mobile/__tests__/mobileIds.test.ts` | `BE31878BA006AA436A118BECD39A414069F4397126059884FA2AE880D8C80BB7` | unchanged |
| `apps/mobile/__tests__/nativePhotoFiles.test.ts` | `AC65B439EBA29EB2D9C0B0E85D6E3A6F7206790AAA8A2D230BD663AD26603414` | unchanged |
| `apps/mobile/__tests__/priceFirstSale.test.tsx` | `A1C790986E7A90BC461C61B516C8E310E5641B5778795CB47F2D5D71B091BA91` | unchanged |
| `apps/mobile/__tests__/productPhotoCamera.test.tsx` | `FC7428EA31E328C65470575BDBE825565F26D1A8CD001D7B54E544AC5655A451` | unchanged |
| `apps/mobile/__tests__/productPhotoPresentation.test.tsx` | `11D0141C97A182D48853E2DC58AC66C0919815C392D0CB202A730DE36A139DE9` | unchanged |
| `apps/mobile/__tests__/productPhotos.test.ts` | `C9C7D74197C6A9090F4343FD6F22434842F55FA4694E4C2B968029CC8EA38148` | unchanged |
| `apps/mobile/__tests__/productPhotoUi.test.tsx` | `0A40709F9EBB8E5C507D17B4B9D932BFB224518764EB16ADA1A05741D82A5A80` | unchanged |
| `apps/mobile/__tests__/provisionStoreContext.test.ts` | `62A24597050C074A748B31B303856CCBE454F5C749B13E694E34B4D23396AA34` | unchanged |
| `apps/mobile/__tests__/purchases.test.ts` | `489ECDB82282F81541C47F7CDC52B8B60D88806B91E2D77D5F80DBFD438FDBAE` | unchanged |
| `apps/mobile/__tests__/repositories.test.ts` | `8AC209D23FCA4FA38D3ED4C1A76991A922ABA3AF1F51E172EA9EAA6C6CB0A1B0` | unchanged |
| `apps/mobile/__tests__/restock.test.tsx` | `9B34AA9BDC5ABEC0D122842D62FB7FB8BD858BBB6ACF47F36944C187DF264F02` | unchanged |
| `apps/mobile/__tests__/saleDraft.test.ts` | `25C76E2FEF18BCF104F095DB71F1E5D823877049E305F844A62FE67901355C7B` | unchanged |
| `apps/mobile/__tests__/sales.test.ts` | `451648EA18E642006ADE946B1D8C81EDD54741B5C4C0B47A31C4FDDB7DE9FB65` | unchanged |
| `apps/mobile/__tests__/scannerActivity.test.tsx` | `8ED047A41F6747B321E88372C7E256774ED55D87B674A779E5F13A0ABE2B46A1` | unchanged |
| `apps/mobile/__tests__/scannerCatalogue.test.ts` | `74E5B0EEE397088DDA25873A804BFA41311A0DC3913028CA6FBA66A6DD97C554` | unchanged |
| `apps/mobile/__tests__/scannerFeedback.test.tsx` | `0BE6312D6CED55D21D42C86F4718E4276D47BBEF8D9D9AEEBA937C1863531D6C` | unchanged |
| `apps/mobile/__tests__/scannerPanel.test.tsx` | `32CE6BF8C2A40255AE57B39828BF510C6BD781E83FFE910B18B2A3F1D1E27071` | unchanged |
| `apps/mobile/__tests__/scannerSale.test.tsx` | `9C97631AF8459C1DCFBD06F1E5F66FB78ECF85F6CC56C9976BC13C99051559D0` | unchanged |
| `apps/mobile/__tests__/scannerSync.postgres.test.ts` | `B67420AA6BC0E75EDA627A214737A538D9A1AD6872167F52EC9C16390B8372D6` | unchanged |
| `apps/mobile/__tests__/scannerVerification.test.ts` | `12A5B82D6F8AE4BF49BF9279DFA05E5BC40110CFECC7300AFB604BD85B5AD4F4` | unchanged |
| `apps/mobile/__tests__/scannerVerificationRoute.test.tsx` | `27669F544AB3CD0B22C7D90F213EFD74E79E58E5051FD80334B773325EF0A0DA` | unchanged |
| `apps/mobile/__tests__/scannerWorker.postgres.test.ts` | `5CD4E19D6395F3B7B5F86C90F59F26C5119CDBFDB79D0B7C962CA088D2EE117F` | unchanged |
| `apps/mobile/__tests__/scannerWorker.test.ts` | `F138B57FA3F3DD9C186E3E0DECFCB3F29E361DE3B2EB37EFC71A6AEBE9EC3A4C` | unchanged |
| `apps/mobile/__tests__/scannerZoomSale.test.tsx` | `98B42FCF8440AE0C02F16C549AE8EDE1AA57649F3739F4D232316EE8F1D7A4BF` | unchanged |
| `apps/mobile/__tests__/scanning.test.ts` | `CA138E750982A7D98C14D542E50E1259A19A97C7C49F7F0194F1A3F27E318BB1` | unchanged |
| `apps/mobile/__tests__/sell.test.tsx` | `AA399C8359EEE92C943BF6843D868EB1243C9C7C687D03850FAB19045939349A` | unchanged |
| `apps/mobile/__tests__/startupShell.test.tsx` | `D3CA77F5FF008EB7FD5CFD443009F4337FEF5074BC1793A7A32F4E8E9E80B79B` | unchanged |
| `apps/mobile/__tests__/theme.test.ts` | `EE53AE5A1C22BEB9F78F016B03FDFE4A0F89CF845ED81C7AA03E14624DF42737` | unchanged |
| `apps/mobile/__tests__/transaction.test.ts` | `9C00D88E5B1C9291CD295FC22965A89A75AEB6337DF888EB3EC18F5F7275ED6D` | unchanged |
| `apps/mobile/__tests__/usePreviewZoom.test.tsx` | `B69444EF72BF99C2D0089B17061F7FD1291B9539ABDC69948418FDCABFE64050` | unchanged |
| `apps/mobile/.env.example` | `72BB4F8DB96067087E59DDE9CC4511128B014007F0F44E7552C87811D35346AE` | unchanged |
| `apps/mobile/app.config.ts` | `B3981D2352CB2E54A35638855C3B4C482E8736CD8D647FB9560DDDC71C61FFD1` | unchanged |
| `apps/mobile/app/_layout.tsx` | `91F8934A251F74202E8DF90E97F7B54EF339C5788738F965AD66ADCEA77DB53D` | unchanged |
| `apps/mobile/app/(tabs)/_layout.tsx` | `15E34551A34E8669324B44BA67C4EBE22879A332CEC6BD878A8A5820343B8C9C` | unchanged |
| `apps/mobile/app/(tabs)/more.tsx` | `DC6BEC2D46D2114DC2BA0FB2569FA8EE9FD47B1AD152BEEC85EE5C5C52560F9C` | unchanged |
| `apps/mobile/app/(tabs)/products/[id]/packages/[packageId].tsx` | `A26CF8D0397505BCFDC5D8AB9365687817AF705A76668D3C355F0ECA23DCA782` | unchanged |
| `apps/mobile/app/(tabs)/products/[id]/packages/new.tsx` | `642FE7211864E20F253F564B44A3511BEED54EE4CA7745ECC03CDF3D5D2403C4` | unchanged |
| `apps/mobile/app/(tabs)/products/index.tsx` | `7A2DC6C797CB6E696AF75D3FC99D2283C7AA531F94D985C31172598767608FA5` | unchanged |
| `apps/mobile/app/(tabs)/products/new.tsx` | `A133194096D65628EE1A74704B262A3C4F947495E4057CA6A643C490292D8D49` | unchanged |
| `apps/mobile/app/adjustment.tsx` | `6FE14E0BD849E3BEA23998B4DAAE62DB18BDB7E1FF24D936DDCFCFDC875D37AA` | unchanged |
| `apps/mobile/app/attention.tsx` | `4E00C212FB9EDB13813D25CEB2B868FFABE87BFF4DBE3DFBBA1A40B02ACEF470` | unchanged |
| `apps/mobile/app/batch-review.tsx` | `357874DF8B69673EA6259EFEF49325642FB032FC8FCF39B55BB481C139C66ED4` | unchanged |
| `apps/mobile/app/expense.tsx` | `5274F8F1DDBF5957AA797B61A8C4A3295E23D6891D915FE9B5DCA9CFC563CD9A` | unchanged |
| `apps/mobile/app/expenses.tsx` | `DC828AEDE42931BFE12F1CF41919A0B58243274776A19ADA1FAF1C6509926656` | unchanged |
| `apps/mobile/app/guided-checks.tsx` | `20D11F55E5149022C388F0338ECF3C7F3275E0F40CB9C652036B839FF5641BEA` | unchanged |
| `apps/mobile/app/index.tsx` | `F76483C61D2DB85625B0B78C3E8B76F70978D48608DCDC950ECDA458F6D72836` | unchanged |
| `apps/mobile/app/purchase-history.tsx` | `49A24782FA3FDEDDE242706D05BF2B63FC05202BB3595BF4ADC60FA0ABBFEF88` | unchanged |
| `apps/mobile/app/purchases/[id].tsx` | `C1529AACB48DE9116D9A0AF583597CE9ED2C0D245A3C23D82DEC1A07D8DB4C8A` | unchanged |
| `apps/mobile/app/reconciliation.tsx` | `7EB7FEE78EC5BE627882684D2796E2150D23484A5904F9BB21251DB01946DC1B` | unchanged |
| `apps/mobile/app/restock.tsx` | `6822A665009EFCF388D10A3E59D13625D6487C17138975B8E8B1DEF86925D2D9` | unchanged |
| `apps/mobile/app/sell.tsx` | `81DB2DEB0B843D9B4389BF2D9029B09E4A694FA1D77A025DFB83E4E30787215E` | unchanged |
| `apps/mobile/app/summary.tsx` | `D4D71DF773FA7003226D72CAEFFFB5B446910FA2FE657821488C14246E82E467` | unchanged |
| `apps/mobile/app/sync.tsx` | `EB362A0A0C00D5A4C31F39AD5F78DFBFAD7FA049E1BD7EB2378546303949369F` | unchanged |
| `apps/mobile/app/withdrawal.tsx` | `5BD4011E23B8BF7A0AD0C560431A2D61A7EB158F72E4CF86E7357B6DD6E28120` | unchanged |
| `apps/mobile/app/withdrawals.tsx` | `BEAEA95AC2879B9071814FC1D0A661F0B1956CD373E16BEA18755A93DD1BCD66` | unchanged |
| `apps/mobile/eas.json` | `7DB61F778EB5CD99587E6F96D20819C0B4411BB7054D5912337400A33E8DCE48` | unchanged |
| `apps/mobile/eslint.config.js` | `AAA671E71B66F0C3FE94854D7D3B7EB671800F0A338452DCFC3B83630033E2B8` | unchanged |
| `apps/mobile/jest.config.cjs` | `CA1AE622D81A92E0750F5BBCAE0F1923C87F66C741BAA127F18E558EBB94D57D` | unchanged |
| `apps/mobile/package.json` | `BE0C891AFD5B840403C53EEFA9A404526E576F281F72ED5C34F4FEF854EB532A` | unchanged |
| `apps/mobile/src/catalogue/CatalogueContext.tsx` | `40A8949340428D397953CF1E3316599F1A5240A148A5B6E5FA175DB4B992CEE1` | unchanged |
| `apps/mobile/src/catalogue/createTemporaryProduct.ts` | `CE27B4BF6FE9B47B93E6E664CC3FF85026AAB5A9D41359151ED49C9E2100BAC3` | unchanged |
| `apps/mobile/src/catalogue/lookup/provider.ts` | `FC0D38A67FD149167BFD47A80E5F607E49EC2FF204D7A23F14FFD7173FA9AE53` | unchanged |
| `apps/mobile/src/catalogue/lookup/SuggestionCard.tsx` | `114120981A58515D67BF4B2BD817DAB34113DA596D429E39646D8FC62FB442B1` | unchanged |
| `apps/mobile/src/catalogue/lookup/suggestions.ts` | `21B2F9DDCCE14501D8215136C005B08740080D48994F0FF5ECCF6032FD581CAF` | unchanged |
| `apps/mobile/src/catalogue/manageLifecycle.ts` | `CC550ABECD94502880EDC287C41F15605564F04F4F50A027891150C153CCADFD` | unchanged |
| `apps/mobile/src/catalogue/managePackages.ts` | `9A8D3555EDAE8310A4C71BB037B8C8889048EA14C4122038B198441B506A2E12` | unchanged |
| `apps/mobile/src/catalogue/updateProductIdentity.ts` | `1AD726C8B0A9E059D40FB2A5974DAE2158D0023CD6E44A63196AB08DA1652FF0` | unchanged |
| `apps/mobile/src/catalogue/updateReorderLevel.ts` | `A0A864CF8B43DDF1B7B62825E64A1B42185E07D7D87D211EB51C5DFF6F7FA01C` | unchanged |
| `apps/mobile/src/config/environment.ts` | `DB0ABCDE768B3AC3AE19A462457C8285026EEB5F061BF70360AC16CAEA849F7E` | unchanged |
| `apps/mobile/src/crypto/mobileIds.ts` | `9D157347AAAB291D9663155919E3AD21BEB4836FFA5F036BFE4E6C93CD781969` | unchanged |
| `apps/mobile/src/db/adapter.ts` | `3612849600CB5923E646E322956A2FCA4520B9511B897C89BB4CF88AE57148B7` | unchanged |
| `apps/mobile/src/db/DatabaseContext.tsx` | `7F9E113B8852B339D781D42CF65C198ED90ECD9C85233027997D3B8B2AF1F83C` | unchanged |
| `apps/mobile/src/db/errors.ts` | `0A5CBB98EE8AD666BB9CB0ABEEDE90DE7138F96D5C93EC2C1C6C1555C3D884FF` | unchanged |
| `apps/mobile/src/db/expoSqliteAdapter.ts` | `35B85B7E6ADD681E1119F58CF1C7B232CCA3D552FFD65165C7DA98448579E755` | unchanged |
| `apps/mobile/src/db/index.ts` | `70981024644AFDE71DC4AE923FA052B4A3C00290FEF78E52532E674A8BAA69C4` | unchanged |
| `apps/mobile/src/db/initialize.ts` | `74ACB553D6A7EE36F663A09D1B19B2B77D40074E2749E769FE25EA7324E5EE89` | unchanged |
| `apps/mobile/src/db/migrations.ts` | `94B43E34C9F3CEE256324F20CF1FE1551F6A41DBCD4031178AC4CC224B40D94F` | unchanged |
| `apps/mobile/src/db/nodeTestAdapter.ts` | `CE9925A46851ACB3442C702A1B085FF295D3A69E93196AE75E8CEB344EAB9ED3` | unchanged |
| `apps/mobile/src/db/repositories/adjustments.ts` | `1FF90B7E3223808D05DC25F351C5E2D9B1089050394D93B342A0EAC54D97B39B` | unchanged |
| `apps/mobile/src/db/repositories/attention.ts` | `94C358F1CFBC9D0E0A5605E461D8AE1C411681D962D66B617AF16D06BB6675E2` | unchanged |
| `apps/mobile/src/db/repositories/batchTracking.ts` | `8C4A8DAD854D7B8E2D48DD567C33ADDC2104F998DA9807385BCE137406A9E123` | unchanged |
| `apps/mobile/src/db/repositories/common.ts` | `D40DD7F351AB0A3F29A9382CE17BAAF668E8B64E61C52B2C2D3FA30B2B15398D` | unchanged |
| `apps/mobile/src/db/repositories/costing.ts` | `9400E3D1A3AFCA77C9D534A0E95DBB5FEA5140379FA307D852AE5DDD35DAA1AF` | unchanged |
| `apps/mobile/src/db/repositories/customerAccounts.ts` | `78034F562F81B0B4DFC997DCCE5E288D96CDA2B12A7818C7A7CE38E848132306` | unchanged |
| `apps/mobile/src/db/repositories/devices.ts` | `AB38F2C51D27D6D160309899C858975FB341349C8D351066B8159FEAE6CFE871` | unchanged |
| `apps/mobile/src/db/repositories/expenses.ts` | `422249BFE2BD7ACB6A8D6C975F8FA700BFB9893A98E7CD280EC83E5F8C4B53A2` | unchanged |
| `apps/mobile/src/db/repositories/inventoryChecks.ts` | `1D4649C4591DF18A60C9744438D7DF9A3CE7598966D7F84B99C10F64622AE5BC` | unchanged |
| `apps/mobile/src/db/repositories/inventoryEvents.ts` | `C62CE5EA865F9C525140B62433D280BC71B1BAA9EEC06C04D8A41812A2E9F63B` | unchanged |
| `apps/mobile/src/db/repositories/outbox.ts` | `D89A8F7F175E8EE91D8DB4CFD0FCAAAE53E7742D5399D4B8A79511B1C9DA50A3` | unchanged |
| `apps/mobile/src/db/repositories/packageUnits.ts` | `8FE46E84BFB7944476DF140E46675A68F01EEC4E2706B0BF9FDE632E0417C1C3` | unchanged |
| `apps/mobile/src/db/repositories/payments.ts` | `3051BBFE73F7EF249314A68E70D563178B32BC58E4FE97A819CC8E3C4B2A1D0F` | unchanged |
| `apps/mobile/src/db/repositories/productIdentifiers.ts` | `D0ADE4E915E6BF9E537E247F1A3C0073C711ADE5075D1DFDA98327921DF72988` | unchanged |
| `apps/mobile/src/db/repositories/productVariants.ts` | `4D0B9CF553DA795333E7B5A81A4DFEF0421C7905BB14AF02AEA95EA787E298F5` | unchanged |
| `apps/mobile/src/db/repositories/purchaseItems.ts` | `6698E4ED9611DF57F0FE69AA0B1261F85E8AC741DA16914B7BE9B9DE2ECFC0FE` | unchanged |
| `apps/mobile/src/db/repositories/purchases.ts` | `4C13D0331B2C96FD6B91D3B77D0273B6BDA2D68052CD250328EED9EBBAA8A446` | unchanged |
| `apps/mobile/src/db/repositories/receivables.ts` | `7BDE76C28C183DFB42F0B083BEA82AF2380BC563F9550045DF91C3D86A24F938` | unchanged |
| `apps/mobile/src/db/repositories/reconciliations.ts` | `CA941906DC40D891FE1C032BB394D78083272158DE2721905C58EC97E5D40BD1` | unchanged |
| `apps/mobile/src/db/repositories/reorderLevelHistory.ts` | `91EF99E498BB8C7DFB9C9437304AEE0A2539FCCD3C64700F2CAD1EB4574B1358` | unchanged |
| `apps/mobile/src/db/repositories/saleItems.ts` | `6399BFDEC0E4BEF55C6B604C9F69F4D9534A379277F5483ADD55FFD2D6B7AA3D` | unchanged |
| `apps/mobile/src/db/repositories/sales.ts` | `B36155D69FFAF04EB10721D24DC20683ACB38F93107A789F593F44676A49A205` | unchanged |
| `apps/mobile/src/db/repositories/storeMembers.ts` | `6D6A8A4F443AB6B1D2C14A7990EF4816EA5C2C8C2098A87D2454DE576C6A4EFF` | unchanged |
| `apps/mobile/src/db/repositories/storePackageSettings.ts` | `46274EE63F258C7C8900452C3BDFE7895537641E13D65ECE031FC506EAA29495` | unchanged |
| `apps/mobile/src/db/repositories/storeProducts.ts` | `46D7A189666B5D79FFD23B05757582CEDBA9E66A0197ABD07250FFA6C61A9C19` | unchanged |
| `apps/mobile/src/db/repositories/stores.ts` | `C049C78D4C6D9F1BC93E06248554DFA5CAD337035F0086F9461FDDF2C4D46824` | unchanged |
| `apps/mobile/src/db/repositories/suppliers.ts` | `A9CF93DDEBE08D6A0D6B6F7F7B0031D9BF13B81FDACA063C6C725F6E69895F5D` | unchanged |
| `apps/mobile/src/db/repositories/sync.ts` | `5551FE6FC838A883274825447B2CA7F0F93FC7626F9C403D243DFFA15A931882` | unchanged |
| `apps/mobile/src/db/repositories/users.ts` | `95E0B48EDA8BA17B7CEC79577B62B557EF629B3ABE0264F017ADA3089C1B82EA` | unchanged |
| `apps/mobile/src/db/repositories/withdrawals.ts` | `DDB85DA2963D61397C401F6CFBB584EDBAE4AEC19DEEB5B313274DC80CBF9AE1` | unchanged |
| `apps/mobile/src/db/testing.ts` | `7CCB54B2ED562AC16AC248222F44330C547EB7B6367FCA824C0F4D03E3FE0381` | unchanged |
| `apps/mobile/src/db/transaction.ts` | `9582E54805F225E2A155338B5B0F3B39074B78F145D45A65BE92D4F9008FD6B4` | unchanged |
| `apps/mobile/src/features/scanning/BarcodeCamera.tsx` | `9FBEB383D9DD48FBB3CCAA7E807AD6A19DDEE1A72F777E13B59567813C8A1DFD` | unchanged |
| `apps/mobile/src/features/scanning/code-read.wav` | `EFC354FCF7F5A5765EADA8BFB4FD15D5D5AD877223FDFA6E903AD01DE4A23889` | unchanged |
| `apps/mobile/src/features/scanning/GlobalScan.tsx` | `933DE8083D34BD8ACC2FB3782907B59C1012AF85B40667C0A7F89513F33FF9CF` | unchanged |
| `apps/mobile/src/features/scanning/PreviewZoomSlider.tsx` | `3D6056860639356408DF554FE811D73B80A14D302A20F247BD1308B695D67014` | unchanged |
| `apps/mobile/src/features/scanning/resolver.ts` | `A0A7B540B7948A516F89F40D5A77DDFB43AAC25C5D708A3D345412154473F459` | unchanged |
| `apps/mobile/src/features/scanning/scan-added.wav` | `9C4D0BC31317985F0D46AC06020129E276A8320F1F9FDA1C655DC5F72A9BEF20` | unchanged |
| `apps/mobile/src/features/scanning/ScannerActivity.tsx` | `FB1418D0A0F4EA9935D65F163A1B9C25A4870FB574CA63C45D85E2ABC5EE917D` | unchanged |
| `apps/mobile/src/features/scanning/ScannerPanel.tsx` | `A301C5002DA627EE7638CA31D5BEEC3A3FB01D41254AD3D7FC6E6960EA5CF559` | unchanged |
| `apps/mobile/src/features/scanning/session.ts` | `71DCC6F856884E6D0B07C961DA38A93887F6CFBE1213E6A9B8B3CA144A5CDB58` | unchanged |
| `apps/mobile/src/features/scanning/usePreviewZoom.ts` | `80671473E28908E4D7742768D9715DC6C86DADDB41741205ED33698103698D38` | unchanged |
| `apps/mobile/src/features/scanning/useScanFeedback.ts` | `705C607D8C3F196AB04A2DE9C180A6F04A279DD9C451C7823F58B2554F264386` | unchanged |
| `apps/mobile/src/features/scanning/verificationBuild.ts` | `489A5B9FA593A1FCEE28DD4EB28007620479979DD2E2129951A0394FED3A7093` | unchanged |
| `apps/mobile/src/finance/businessSummary.ts` | `5EBD5387355FC52D2AE65A5E582C317268DD98905E7DF3EC42F3BB7BF8D7B4B7` | unchanged |
| `apps/mobile/src/finance/client.ts` | `F8509F2D35A30C4D35A17D0C35E0FB125C1FFA8645FC814320C448FA0A1E77F7` | unchanged |
| `apps/mobile/src/finance/FinanceContext.tsx` | `E8B6CEDFCE147FD2395F87716D7D9E13A414AEDCCA595FB9F1D19A3FFFDF1CBA` | unchanged |
| `apps/mobile/src/finance/index.ts` | `D60A680CFCBF3D9848CC718BEA57CB942C88AB97333188CE6DBCB79093DC2D6A` | unchanged |
| `apps/mobile/src/finance/recordExpense.ts` | `6629C1C409A4397283088535B5BD119AC43C15451DB81A86369389BED4C0D10D` | unchanged |
| `apps/mobile/src/finance/recordOwnerWithdrawal.ts` | `71649DB40810CE6B9E467252E7BC2960FFFE69A1B6349481186895A24628688E` | unchanged |
| `apps/mobile/src/inventory/adjustInventory.ts` | `D355724355E74715371D0F7A7E09409DC3310DA874B641A03724C17CBDA436BD` | unchanged |
| `apps/mobile/src/inventory/attention.ts` | `676602BECA288FEA18E312D689A050C19B80C2F18DEE4008E24805F1919ABD48` | unchanged |
| `apps/mobile/src/inventory/batchAllocation.ts` | `0846816E22247AA28A4930B29EA880955769C6862515F5427BC31E027B6343F0` | unchanged |
| `apps/mobile/src/inventory/classifyBatches.ts` | `AC0FB6770CDB4B884BDFAFB3C7867F8ECD563BAC7C0323A0E4F3CF859419F831` | unchanged |
| `apps/mobile/src/inventory/client.ts` | `28B0EDF39A273B564D8E5013DC7F3A53D4FE9280DD1867B2260852E74C7486EB` | unchanged |
| `apps/mobile/src/inventory/guidedChecks.ts` | `4A5C17D0BBEB6ECA5C6079E8C889741B36959C7DF83D077A5E42E5B5273C3A6F` | unchanged |
| `apps/mobile/src/inventory/InventoryContext.tsx` | `94354151913671DA4C241885609EDA4045CABCB11B34434B858BFF5E9911E54C` | unchanged |
| `apps/mobile/src/inventory/reconcileInventory.ts` | `6B9F2FDA14D8EA513E087C8132D3DBF606679DB3CB95EF36D9852BFCD6D90858` | unchanged |
| `apps/mobile/src/media/nativePhotoFiles.ts` | `9A36241EBBF27519C6FDA21D63F3A1E9D539A8FD6BC34215102B4CBF7C654B11` | unchanged |
| `apps/mobile/src/media/photoFormat.ts` | `045781100D2FCC9C942D7D808FD78C41E88137514CEB34BB9AB5D4CDF2430274` | unchanged |
| `apps/mobile/src/media/ProductPhoto.tsx` | `37A0964E24B74E0342A1E85B511B58902DCD9A992AB78313CB72E50ABF289D3F` | unchanged |
| `apps/mobile/src/media/ProductPhotoCamera.tsx` | `27320E1860B121F82D4451DF06AE3F0FAA1287E31CCA711F3B6BCD49C6147E65` | unchanged |
| `apps/mobile/src/media/ProductPhotoEditor.tsx` | `6F19B36DE7CBDE802C52E0C2649A5C646DFB07DA30DC5C4E9BA03E655D61DFAA` | unchanged |
| `apps/mobile/src/media/ProductPhotoPreview.tsx` | `214A6F7B775748B7F15F9A768D06D8D2F5362FD6020523FCB93569D6D24841DC` | unchanged |
| `apps/mobile/src/media/productPhotos.ts` | `EF22153A136D9296DB1047715CA4058E650295C9C2DC1B2A83AD0F3CC422B57E` | unchanged |
| `apps/mobile/src/media/ProductPhotoStep.tsx` | `2CA516D72CFBC0AA9B455F533C266B408C28CA609C1F7D7C6FE71EF6AA4FC38E` | unchanged |
| `apps/mobile/src/purchases/client.ts` | `A3AFC7A45372725A185092014D9D311AB2D3F41601639FF358930389E3704702` | unchanged |
| `apps/mobile/src/purchases/index.ts` | `61A74CCADABDF947B481D3E6F73244347E1A8704DE20660DAD55C867B40FFAD1` | unchanged |
| `apps/mobile/src/purchases/PurchasesContext.tsx` | `832E9AF97214120849B3802098529AC0C710C56C6783B7930B8E75DE7BCAA716` | unchanged |
| `apps/mobile/src/purchases/recordPurchase.ts` | `07A8D86D0EBE4469A51CCF201343F404162F9E627CD9A360BE306C34EFA31099` | unchanged |
| `apps/mobile/src/sales/client.ts` | `5288853E47DD11B33E622CC14898FA8E54286BBCB50B6D8ECFC71B4FC0D67F8F` | unchanged |
| `apps/mobile/src/sales/completeSale.ts` | `2036EB56EB80E2FD2BA0CBE28993FC46F1E54C8591787923FD164961522EA055` | unchanged |
| `apps/mobile/src/sales/draft.ts` | `8A2BF8168EB1B9A20A9F79E5A7A0774303C9584938839E5CBB594D4CED2179D5` | unchanged |
| `apps/mobile/src/sales/draftExit.ts` | `CF607405B56196B0488DAB3947916FDD4242552C30A77F840C91D9A3B1BDED96` | unchanged |
| `apps/mobile/src/sales/index.ts` | `4AFAA2CCB87596D1094F47AAC63DE5EDB20CBB3A16D17DD4EB4AB752639BB353` | unchanged |
| `apps/mobile/src/sales/SaleDraftNavigationContext.tsx` | `469A0EDBBAA6C4E5F265E45595D92498BE9648CBB01D4FF08DBCB8A93152797F` | unchanged |
| `apps/mobile/src/sales/SalesContext.tsx` | `13D1DD1513456908B3DAE51BA1E8854B4D429B83AE744E1C8DA60F6C8A8C2428` | unchanged |
| `apps/mobile/src/sales/syncStatus.ts` | `C6F20F92B237548A206E74775F8B179690A0BDA3E66ED6BF074BA969E4A5A7A2` | unchanged |
| `apps/mobile/src/screens/finance/BusinessSummaryScreen.tsx` | `C159E26AA35E6AAB025BBC269125FCCDB86EF673E0D087EE43C40E41C28B7B90` | unchanged |
| `apps/mobile/src/screens/finance/ExpenseEntryScreen.tsx` | `DD26974FE97C5E6AB47B106F1B81C96C16F46F022A3DFB5726106E06AEE63E76` | unchanged |
| `apps/mobile/src/screens/finance/ExpenseHistoryScreen.tsx` | `DE33E355A497677905F2B8B558857D9A5EA6DA01C4647091A214031785E4F9E1` | unchanged |
| `apps/mobile/src/screens/finance/MissingFinanceStore.tsx` | `E0A2B6345DF2AC3548DD62F9FC94671C1CD99420577080F24DEDF9CA695A8410` | unchanged |
| `apps/mobile/src/screens/finance/OwnerWithdrawalEntryScreen.tsx` | `A82FA6205B108B11DD2CFCF2D9D4464688C5A05D052D710CB4239D0FCEC22057` | unchanged |
| `apps/mobile/src/screens/finance/OwnerWithdrawalHistoryScreen.tsx` | `33014CC3A651D27F0D21E44AE042FBF27275C200DF6B19FD78B9DE02F61816E9` | unchanged |
| `apps/mobile/src/screens/inventory/AdjustmentScreen.tsx` | `A3AEF408004AA38718100A628D1024EB404138CD7AEAB4E68E0CE4AEDDF48B9D` | unchanged |
| `apps/mobile/src/screens/inventory/AttentionScreen.tsx` | `2EB0284841601EACAD6FE5677BED37AD1EAD8FC8135F14F0ADED5272E5EE018A` | unchanged |
| `apps/mobile/src/screens/inventory/BatchReviewScreen.tsx` | `CC0344DD9D8734BEA04310E0253201A5B4E295F3B0442217B962C001F1C22718` | unchanged |
| `apps/mobile/src/screens/inventory/GuidedChecksScreen.tsx` | `5D41969F0F5233145EA760F82A843FEC94031FF84FE003CD0B75C0E5C7063A00` | unchanged |
| `apps/mobile/src/screens/inventory/ReconciliationScreen.tsx` | `CCDE3504CEF36EABA7A892953F10A14149BB560D2BBE2AD69056DA53FD1AC30C` | unchanged |
| `apps/mobile/src/screens/products/PackageFormScreen.tsx` | `2D0DF60AE76DFA8C78796FAAF8EBF635A5AA177C4FDF997AD5555905E19037AC` | unchanged |
| `apps/mobile/src/screens/products/ProductsListScreen.tsx` | `8C2CDAD25FE1D3F4761A7A86865AB00D0E43D680F4A441A8DEB48EBB55F044A9` | unchanged |
| `apps/mobile/src/screens/products/QuickAddProductScreen.tsx` | `0B06A0465E6754520CB69C8BF81895AFB06727B2534B7D251F5917411D77DF46` | unchanged |
| `apps/mobile/src/screens/purchases/PurchaseDetailScreen.tsx` | `9B384160C3DA9C524FBF5E3E922F2C3A9B3C6AE5D0EACA3DC70D10F261839C6E` | unchanged |
| `apps/mobile/src/screens/purchases/PurchaseHistoryScreen.tsx` | `858B3E7BD6C3A77DAAA76245EF0487CB3D3E529B975C8E49107F310DA8225E31` | unchanged |
| `apps/mobile/src/screens/purchases/RestockScreen.tsx` | `DCFEA5DA86119F1105EF9FD71453FDCBE0701305E0C6DCC39AFC2CC3BE48862B` | unchanged |
| `apps/mobile/src/screens/sales/SaleDetailScreen.tsx` | `7A92E45C8CCB5C7859FC1FBDCF1E514E387346071F51DDFC65E2F4753A0D2599` | unchanged |
| `apps/mobile/src/screens/sales/SaleHistoryScreen.tsx` | `19866C535ACB9513CBA785435BB22CB5E0EDE5883F8BBD0768840E09C7B51871` | unchanged |
| `apps/mobile/src/storeContext/provisionStoreContext.ts` | `E61B96F15A249D1AD281AF50746C2C6D711F2F119C780A9FB49F357455F94AC1` | unchanged |
| `apps/mobile/src/sync/applier.ts` | `6E2C5015908F5E2DBA005F1B0FE901F397AF6BB1567143161F4FC78F6CE79B88` | unchanged |
| `apps/mobile/src/sync/auth.ts` | `F5C674C405F227B547A4DE6BB884B2C0B67E5763C8CFF3711AF863DFF7CC236C` | unchanged |
| `apps/mobile/src/sync/identifierQuarantine.ts` | `567400F391EFA7CFD7D1C2A074060271E5E29D999CD6EE7EE7E27FF6E900B071` | unchanged |
| `apps/mobile/src/sync/index.ts` | `15E1FAA58467E3B6533E28FDCDE76365D5C05EF7E5EBD403C151F2557DCB9723` | unchanged |
| `apps/mobile/src/sync/materialize.ts` | `77B3782BB893653B482ACE01C3F315D34D6FCA1992C23DEDC5A201500D5A524D` | unchanged |
| `apps/mobile/src/sync/pilot.ts` | `1BAF9F96F4176525F14B6392826DF5838594D9E1EE462FC3F41E97B2220E70EA` | unchanged |
| `apps/mobile/src/sync/PilotSyncScheduler.tsx` | `1F2E50E80384D1FC86A5E4B6DE25280FA6157821FDD8E8F4884BB1FB410455B6` | unchanged |
| `apps/mobile/src/sync/transport.ts` | `00216A88C00155E351181681ED4478542B3921A5025A3EB9C80B7909AD373B27` | unchanged |
| `apps/mobile/src/sync/worker.ts` | `9436C9C4761E2CF602DC66E4AE906AC10FB9D987FC3DCB95F3B8DA60220D5262` | unchanged |
| `apps/mobile/src/ui/components.tsx` | `FC09AF34E29739FC822636877D5652A4EF5A667DCD76F609552F016A5606D408` | unchanged |
| `apps/mobile/src/ui/money.ts` | `7D09E6B19A6CE018120308CF751B634AF7C00D09A911EC673CA4D62E6E729EE1` | unchanged |
| `apps/mobile/src/ui/theme.ts` | `84A58A3CFFA4D8DF223EC5745EF39B4520D37904440E48605AD7AA0D15082A4A` | unchanged |
| `apps/mobile/tsconfig.json` | `3C85C9560535AF31B7E0C9B8B5EE7A594A9D1AD4153110FC77378A465F4E0B63` | unchanged |
| `apps/recognition-lab/__tests__/calibration.test.ts` | `2548F64497C1C092421CB2471E7F917148F5CA9A643E4610CD47EB428203DB17` | unchanged |
| `apps/recognition-lab/__tests__/candidateCalibration.test.ts` | `017E7C02739DAE66219E7B0F5F1249B7398D9A9FFBE3BA862A276D6D2D94FB48` | unchanged |
| `apps/recognition-lab/__tests__/cli.test.ts` | `A004EFB90CCC50D82B6305C710BD8C156D94BF69BF217DD75EC81E14C3406806` | unchanged |
| `apps/recognition-lab/__tests__/cliOutput.test.ts` | `8B9C9D2A5BF92C6A43EA3FD5EF85CB7300E7421A201C69D6CC01334F253E8410` | unchanged |
| `apps/recognition-lab/__tests__/comparison.test.ts` | `8494815F7C5DF6EBB747E5D88F91E310EA08E6B10985D8A7E8B4BF6837A53FE9` | unchanged |
| `apps/recognition-lab/__tests__/comparisonCli.test.ts` | `3F3DFD2551AB7E9D3667A587D7D08FCB957454ABAE1BE57B21ADC8E094A4F4D8` | unchanged |
| `apps/recognition-lab/__tests__/comparisonOutput.test.ts` | `C8BD14187A012CF232BC4F5E85D7B4832BC22EB59AE64C93536206B06CD54430` | unchanged |
| `apps/recognition-lab/__tests__/deviceBenchmark.test.ts` | `32B91FF0DD53FAA281FCDF64EF28BC69472D6186FD0F05AB45BD747D35236A5B` | unchanged |
| `apps/recognition-lab/__tests__/deviceBenchmarkCli.test.ts` | `960B2C49DD725373AD5D0400A8BAD8025882CB13C502D10A18DFB386A0F1C620` | unchanged |
| `apps/recognition-lab/__tests__/deviceBenchmarkOutput.test.ts` | `E5BCB2E9442EA8C7288BAF7911C90928B9B49F54DF2FC01179814CBA4655A659` | unchanged |
| `apps/recognition-lab/__tests__/deviceEquivalence.test.ts` | `99A2CF84309288F1C24D057F01FD8E73849FF3C143D6DE2A0E3AFD8502346AF8` | unchanged |
| `apps/recognition-lab/__tests__/experiment.test.ts` | `40AE0684EAE23B96B4770B4225E295EADDE0691AFB5100259F26DA83FAD761B5` | unchanged |
| `apps/recognition-lab/__tests__/importer.test.ts` | `B76F4F2D3309F4A27160EDA6F97880A5BEB105AD7495D98E907D94F99C5360F7` | unchanged |
| `apps/recognition-lab/__tests__/metricCorrections.test.ts` | `C6573FDABB787944E8E54FF1AE4C6239A562657409F4523D6EB5C843C492CF2E` | unchanged |
| `apps/recognition-lab/__tests__/metrics.test.ts` | `2F0E722F7CE187CE384DDE6AA812D8A5519A23045020AEDFA94C05795A3A6551` | unchanged |
| `apps/recognition-lab/__tests__/precomputed.test.ts` | `DB46DE786B6D5F0779EAA6DFEFE0E0880E8D35CD6F5F94E4F318DA27A65E4390` | unchanged |
| `apps/recognition-lab/__tests__/readiness.test.ts` | `0C9E26BE028D78841AE481148855B91B4983744E3D79E6588DDB432690575D8A` | unchanged |
| `apps/recognition-lab/__tests__/retrieval.test.ts` | `A9F83C6B9ACB1021370AE0F57B2EB1BBF09C7D1C80DF5F63BFD597F3AE034C7C` | unchanged |
| `apps/recognition-lab/__tests__/retrievalCache.test.ts` | `66866FAF3D45A48EC821D25BBA153EC0774A441923770E8E0F5DE80423CD94CA` | unchanged |
| `apps/recognition-lab/__tests__/retrievalCli.test.ts` | `7B7A9052D4284BBEFA6BF984B2A88F760AA9D62D934732476900975558EE1D84` | unchanged |
| `apps/recognition-lab/__tests__/retrievalCorrections.test.ts` | `A9113AD71079846F55A5CBBD3AF598685C5394211AD85476841FD4798704EAE2` | unchanged |
| `apps/recognition-lab/__tests__/retrievalEvaluation.test.ts` | `EA369C113B298AC770F545AA38AD4EE8E3D8910A6C56A26A9FF2FB669931EF46` | unchanged |
| `apps/recognition-lab/__tests__/retrievalHelpers.ts` | `C0F3C0A4AB01E491FF623CB039E476C1611C5A6092B61E689E00C30C974F745F` | unchanged |
| `apps/recognition-lab/__tests__/retrievalOutput.test.ts` | `E6F74E032A9841B2D21020F8EE264F8A88295203724A8279B8A4262CD3179552` | unchanged |
| `apps/recognition-lab/.gitattributes` | `93F6FEF224B2F7C84B540310601663DB72458EAE3E94AF7D221046A9A3208950` | unchanged |
| `apps/recognition-lab/.gitignore` | `4273B110260280F5736974EA677AF834D43B80DC4D2D207FC193B6AA59C0D5A3` | unchanged |
| `apps/recognition-lab/DATASET_CAPTURE.md` | `F4BC697E6A72D44A20EABD10DF0A7AF217F436C80D3AD3C2DB3AC068FD24BE88` | unchanged |
| `apps/recognition-lab/DEVICE_BENCHMARK.md` | `9A19061112A89ABF0030C9052BAE85753A0D54539B4A711D527FA5DEC8BE53B1` | unchanged |
| `apps/recognition-lab/ENCODER_COMPARISON.md` | `43BEA8F71923309B8D99923AF93561C2B707437E19F94084190D9E6C88E11FCC` | unchanged |
| `apps/recognition-lab/eslint.config.cjs` | `DA6766074378FC2B8519128863A649F5E8DACF70BC544FBFC2F7443BA897785C` | unchanged |
| `apps/recognition-lab/fixtures/assets/cal-a.txt` | `90617073C678565199D47845743835732A3C6640BA36C528C64335D6D0D6E0A7` | unchanged |
| `apps/recognition-lab/fixtures/assets/cal-lookalike.txt` | `877384727DC1F2BEA0C533D2D3B0E34BF92127E9E617E96CFFFE211D4F733787` | unchanged |
| `apps/recognition-lab/fixtures/assets/cal-unknown.txt` | `E99370EDD8101C6CDBA654CEE344C3B030FF6BFBE453F5FDA6BD64F89D44368E` | unchanged |
| `apps/recognition-lab/fixtures/assets/hold-a.txt` | `381F247DF637C8A8DD3053B245CBE434EB05C6DB74035B595D7DBC1EA6D61AD1` | unchanged |
| `apps/recognition-lab/fixtures/assets/hold-b.txt` | `A60435A4A24C4F12A58C1C89CCDED774C440BDA699AFE24F6BA056193AECB052` | unchanged |
| `apps/recognition-lab/fixtures/assets/hold-lookalike.txt` | `A62738DE54B6A1048B7D28759614976AF9364500DB349445045E0B9604172874` | unchanged |
| `apps/recognition-lab/fixtures/assets/hold-package-tie.txt` | `34BE6855723CD23C637E79F245797D34696F0A880BFE3DE374A05A0F58C6F005` | unchanged |
| `apps/recognition-lab/fixtures/assets/hold-tie.txt` | `05C8A16E42C64E9D18B4828F550197969E1553E0DC06E67D6251417EB5C16AC2` | unchanged |
| `apps/recognition-lab/fixtures/assets/hold-timeout.txt` | `87B2101761BD0B8B804B9C7A21E08FE95CC481930B27B9FFD9D5C542F288D373` | unchanged |
| `apps/recognition-lab/fixtures/assets/hold-unknown.txt` | `9B2B5A4C20BAC97A0AB8B5BEEDF82665CAC6FA1BF0014C1D7C3BD8964DB7ED59` | unchanged |
| `apps/recognition-lab/fixtures/assets/hold-wrong-package.txt` | `4312BC3EF01BD70634FFD26383A6FCD726261DFA27A5711E6DC044DE6E00E10A` | unchanged |
| `apps/recognition-lab/fixtures/assets/q-a.txt` | `ABE006461D55259B54DD7FC20DFA874CEEED46FB107D89F2ACE80D9005077871` | unchanged |
| `apps/recognition-lab/fixtures/assets/q-error.txt` | `979C90C3F52E9F8EAE4E403AB817680A9F28A6B43536482BB817E2147AE95851` | unchanged |
| `apps/recognition-lab/fixtures/assets/q-u.txt` | `5D85B2B072BF1E66B10967F7C940B7C3523F302A03162C2307A03B6CC4299003` | unchanged |
| `apps/recognition-lab/fixtures/assets/ref-a-pack.txt` | `B0BB62A8ACA2B954D8D83F79BA7BC65728340B9E983062A1DBFA6C1B74DC1912` | unchanged |
| `apps/recognition-lab/fixtures/assets/ref-a-view2.txt` | `A843A8DE46FBC3FF1CA3C48EEEC0420DCD848B73E607E6900EE6E593BA0D2143` | unchanged |
| `apps/recognition-lab/fixtures/assets/ref-a-view3.txt` | `5F748009327649B66152FDF9990379A56E97F638D98ED4B60F607D6D560B25E9` | unchanged |
| `apps/recognition-lab/fixtures/assets/ref-a.txt` | `A25383215C8AAFCE51889B7AE6BE7FE17B6D40A84175346F8FA0F6E290AD1327` | unchanged |
| `apps/recognition-lab/fixtures/assets/ref-b.txt` | `51255F23F016DB82277F391E9F9B68C46E82DBB490084AB03D9ED48FA31386F7` | unchanged |
| `apps/recognition-lab/fixtures/assets/ref-c.txt` | `5136B50D6D9A2785DB5CB385BCB2D7A5CFF7CC852CDD1269D994DA7C31B66801` | unchanged |
| `apps/recognition-lab/fixtures/configs.json` | `AF8EAEC94FF08D7B8307D3FFF19081DDA0CC227821DE2E93F0727F3196341A2E` | unchanged |
| `apps/recognition-lab/fixtures/dataset.json` | `6B941FCAF47AE42FFEBE5BFE9B608F638BA7700E7135E7D94EF8D00B7C25670F` | unchanged |
| `apps/recognition-lab/fixtures/generate-initial.mjs` | `D3FB0C70630B8C850B1FD1020976553C40748B4C01C27A1E06A44DA212EB5B65` | unchanged |
| `apps/recognition-lab/fixtures/r1-curation.json` | `7524C00C9DCC79339B77DF8689405BC435650F7E89277B79C36CC3510B59CB6E` | unchanged |
| `apps/recognition-lab/fixtures/r2/config.json` | `398D2539E869FBAC4B0A32E8C2AAB3C5D43B24DF569DFCC545B3D1C089A1AB01` | unchanged |
| `apps/recognition-lab/fixtures/r2/draft-registry.json` | `C4A0BCCF078BF89B440857C77DA22BD6156BB54BD8F5C2AE11799E32232DEC65` | unchanged |
| `apps/recognition-lab/fixtures/r2/generate.mjs` | `896611002F721DF8A16122BD360BAB13DB652C8B8CE08B34B0BFC00534B41358` | unchanged |
| `apps/recognition-lab/fixtures/r2/inputs-calibration.json` | `E27644298321E7F8DE2628D0BB75953FC9826EE56FC38EAB4A4A6B465F909099` | unchanged |
| `apps/recognition-lab/fixtures/r2/inputs-development.json` | `4B34B5656F0ECE35AB21DB6527527CE4647E7A75BA8BC081D9FD6BD5A5729122` | unchanged |
| `apps/recognition-lab/fixtures/r2/inputs-holdout.json` | `C2192F809F9F74AD043FA473E06B2911855505857FA310AA3A8E8B737FE345DB` | unchanged |
| `apps/recognition-lab/fixtures/r2/toy-a-artifact.json` | `3D795F77A7A548938074887A7FFC2087FEEFF6D382FED2B1AD3D64AC52DFCB9F` | unchanged |
| `apps/recognition-lab/fixtures/r2/toy-a-calibration.json` | `B0F3B2454C8517004D75B0EEFAD8507FE561ECBFA5DB2BEEF9B2941996B65BEA` | unchanged |
| `apps/recognition-lab/fixtures/r2/toy-a-development.json` | `8CADE7215452EBF50C2A49468E0C957BFB34F7FAB7C023F3B812DA90FF7248F4` | unchanged |
| `apps/recognition-lab/fixtures/r2/toy-a-holdout.json` | `8CE5DABAD9BC6CA35AA9ACAF1E4F1D9089543B0D8A86EFCFCA045F6B2F27889F` | unchanged |
| `apps/recognition-lab/fixtures/r2/toy-a.json` | `E8C1D491ABD2431878AE4FBA95588473452C404A38E5CADCF232498B6288663E` | unchanged |
| `apps/recognition-lab/fixtures/r2/toy-b-artifact.json` | `E82342EDE373B94FAAEDB590F6A83A7BB2A2B4E59F0E9D577A55A0FD7252923A` | unchanged |
| `apps/recognition-lab/fixtures/r2/toy-b-calibration.json` | `4D06F86A226E6D6366F4CED7378115A78EAE186A20FBBEDBCBA0D9B203299159` | unchanged |
| `apps/recognition-lab/fixtures/r2/toy-b-development.json` | `7DEAB0EB6ABCFBD433530598F742E9069B9F56E43266FCC7A4400C4608D4A1F2` | unchanged |
| `apps/recognition-lab/fixtures/r2/toy-b-holdout.json` | `790089EE901F5F128157EC2A3BD6AEE43695C4BB58532FDA5463C93DA3D9C514` | unchanged |
| `apps/recognition-lab/fixtures/r2/toy-b.json` | `205FD6CED459E710B7FE733CC8EB0DD856EB77A525047D17655F81E1383249F5` | unchanged |
| `apps/recognition-lab/fixtures/r3/benchmark.json` | `10457A2ECF2BCE8032A64FCCCC38A1900B49C290A9E44D11ED58C34B1C268EAA` | unchanged |
| `apps/recognition-lab/fixtures/r3/drift.json` | `7B28BF2D9208538D0F6F9A00D16EA2632BCAA4E48ECB820CA448803F1DB66DC5` | unchanged |
| `apps/recognition-lab/fixtures/r3/equivalence.json` | `94862C4F71004375812FF6FA52001E46DD3528A7479422DC570D45C05F4FB26E` | unchanged |
| `apps/recognition-lab/fixtures/r3/failure.json` | `049317CCD549CCF2329DCC18EF20910B7A4869360719801895ABF1DFB8E32296` | unchanged |
| `apps/recognition-lab/fixtures/r3/generate.mjs` | `014897714B3E2A6C204955A52F91F60147EC03705F560DA9B93018ECAD852B0F` | unchanged |
| `apps/recognition-lab/fixtures/r3/incomplete.json` | `2333C2837715014D2BF65CBAC25453D0108F02C6608BD229472330A8F4B1E287` | unchanged |
| `apps/recognition-lab/fixtures/r3/paired-benchmark.json` | `590CBB0EF9DA4274A07109DE6F5B78ED7B7C74F8EC1CD2FFE16076DFF2CCFF68` | unchanged |
| `apps/recognition-lab/fixtures/r3/paired-equivalence.json` | `88681256B0B7F987D00C7B172BBD6F8279A9551CDDF69E50D317788FED5B7F62` | unchanged |
| `apps/recognition-lab/fixtures/r3/target.json` | `ACBB174CBC7ECB0373BDA3F8F2CC403954D8239452BBD45FE2DB130D0D80A57C` | unchanged |
| `apps/recognition-lab/fixtures/r4/selection.json` | `91FD7CF9220D506FDF517BB26907F6A5BFFAC54101E14F5EE4B91C3B0BD52DAC` | unchanged |
| `apps/recognition-lab/jest.config.cjs` | `5C5C3169D18B0E6CBB74F66104491BA75D9A610A2844C0BC3785DA900EA9A990` | unchanged |
| `apps/recognition-lab/package.json` | `27E013375BBDF93E13C8D8E106C843375C752604AB053E742F74CFCA1A6FB87A` | unchanged |
| `apps/recognition-lab/README.md` | `3614469D195470ACA4BC34324BA72B98D134CBA4260489C3A7667C69BDAC3344` | unchanged |
| `apps/recognition-lab/RETRIEVAL_PREPARATION.md` | `D9873629BCAAE206FD4ED0705F4F18553B23B659A7D2A80AAB27468D8470BDD2` | unchanged |
| `apps/recognition-lab/src/calibration.ts` | `AA151B0AD451C5A2E62EE721C9528C62B9BE39BDAED5EF96F017D8E2DE3FD20A` | unchanged |
| `apps/recognition-lab/src/candidateCalibration.ts` | `6142A536B90D7CD36913BAEAC463C255C72B569EA697D33DD5CB1C7E5B24196C` | unchanged |
| `apps/recognition-lab/src/candidateFreeze.ts` | `E60C80B9EC30FA91BAB7839D879C4BC1BF78AC198B60E23AC85FEAF5F7D9F76E` | unchanged |
| `apps/recognition-lab/src/cli.ts` | `97C9F63C8DDCD04468935096CFFC3C0D9ADB5FDB66ED4A62E380CCFA28296497` | unchanged |
| `apps/recognition-lab/src/comparison.ts` | `6E7B9B91F42E0B57CCE9E02449E2A361B6095C6E4420801D13ADF6C6590865B1` | unchanged |
| `apps/recognition-lab/src/comparisonCli.ts` | `E4ECDA935DA0D89608436B39B9616803CF6108A893CCB358E2E5B67E7EF40D7A` | unchanged |
| `apps/recognition-lab/src/curation.ts` | `FBCA3BE1398688328B502073EA205B44CF53EA8F50C084FB74C00EB806AA7D7B` | unchanged |
| `apps/recognition-lab/src/deviceBenchmark.ts` | `4B13F2AC086995FDD1889010F22B6F488C8ECAF81B88544D92EFD71CAB51DD81` | unchanged |
| `apps/recognition-lab/src/deviceBenchmarkCli.ts` | `D1EBCEE13CEE26BC5513D291E541BA617825BB3BA645403DCEAFAE825BADE3D6` | unchanged |
| `apps/recognition-lab/src/deviceEquivalence.ts` | `4214139C775029F768136BE3430A42379330705A3C18DAA7D8EA4DF11961D4DC` | unchanged |
| `apps/recognition-lab/src/experiment.ts` | `D74B66BDD37D3034DFBE7E9841CF6364EAC3A5C2E0E8CDB5E15B2D547FFDCE8B` | unchanged |
| `apps/recognition-lab/src/importer.ts` | `7EB4928F05DCAE4718060011A4D9F2D161E5E3D4C1304C93A697109E00C758A6` | unchanged |
| `apps/recognition-lab/src/metrics.ts` | `E7347DB7837D8A7CF7579A25F277E2FA3832426F3986947508EEA7A887BF9A53` | unchanged |
| `apps/recognition-lab/src/precomputed.ts` | `7F47E43CA48249957240C98B7D4262DF4BB5809346A5323BD2960A1AC8BFF46F` | unchanged |
| `apps/recognition-lab/src/provenance.ts` | `900E3F2D8FFECB62105EA1B2D9536C37FA64B2EE76EF279FD05B572C6518DDC6` | unchanged |
| `apps/recognition-lab/src/ranking.ts` | `A553D95559B9BF64FD43B7E310F831B9DA53D14D9E8DC61B8503226499204A4D` | unchanged |
| `apps/recognition-lab/src/readiness.ts` | `4A56C8F2E9544F7C085F0732DC5A6EAC87D2F3DC202AEAD1159F5E9B69C2CF50` | unchanged |
| `apps/recognition-lab/src/retrieval.ts` | `D3A212EC134687CA23F496DF9F53AB4B7FDF70240F5EAC8DC4EE5FB003D2B064` | unchanged |
| `apps/recognition-lab/src/retrievalCache.ts` | `7178238BFA6C68AD38B2056448204FE7A94CB3E6EC9F509AA8F52B23A6F07381` | unchanged |
| `apps/recognition-lab/src/retrievalCli.ts` | `2F45DB114F35E0683BFEE0784576F557D4B65C8B6A979EB50DDDC362E265199E` | unchanged |
| `apps/recognition-lab/src/retrievalEvaluation.ts` | `5F6960ED52A6A3F73AAC099FF738491D9238C4A9C29351E0885593508B8366C4` | unchanged |
| `apps/recognition-lab/src/retrievalGallery.ts` | `4C1219E3A29B5AD9865C055F59F4344F1EA1C4593815BC42227007E55D2CFEAF` | unchanged |
| `apps/recognition-lab/src/retrievalPaths.ts` | `152350DBF01AA842AB037674162E04E7B596E407044073A9558A879184DD5316` | unchanged |
| `apps/recognition-lab/src/schema.ts` | `31AD6129427D2B41A9A10CAEB425A385D9ED453D572714A587B1B1AC4B399CCF` | unchanged |
| `apps/recognition-lab/templates/r1-v1/captures.csv` | `42C65204C8E8A5077268BF5526DC709D2F5D3C4D7838BFB0C3D89FF21D1F275F` | unchanged |
| `apps/recognition-lab/templates/r1-v1/curation.json` | `6DEFBC8B32F8DC203BFDA11A58673652A2E2258BD4380AB6872C9B02574672E8` | unchanged |
| `apps/recognition-lab/templates/r1-v1/dataset.json` | `BB5B6FA031985E2FCCD3E177F4F93338CCA47ED9F8089A0F6665A205E54B5C54` | unchanged |
| `apps/recognition-lab/templates/r1-v1/README.md` | `F489049CBA11BF4AC19786AFF54134AA9C751F4067994AB2A907F01A91138D52` | unchanged |
| `apps/recognition-lab/templates/r1-v1/selection.csv` | `6DDC53414C3E18ED3E7D031BE13C8DE1693E05F03BD40ABDD5948AEA28C1467D` | unchanged |
| `apps/recognition-lab/templates/r3-v1/benchmark.json` | `286AB12F2EC6F214B58B49056DE7F783CB2EFA3A1AF53B2CCF61B865DB17BADB` | unchanged |
| `apps/recognition-lab/templates/r3-v1/README.md` | `AE7B8B4E51C8A7A66BF74EC98717B04E8C65CA67FF2EDE2B896BB0D560F58FAF` | unchanged |
| `apps/recognition-lab/tsconfig.json` | `22186279AB7839DF08D469AFD21E87311C9BA35A5898EE5C566C3D263B3A878E` | unchanged |
| `docs/architecture/DOMAIN_DATA_MODEL.md` | `E370117E366FFBDAEE1F92B5DFBB0F704B3EE02E41E6AC129F13998FE4736E92` | unchanged |
| `docs/architecture/OFFLINE_SYNC.md` | `E35449E4DBD53F8C02790123F13B15B4703EFA5F5DF9003D82CC08F55220DF3A` | unchanged |
| `docs/architecture/TECHNICAL_ARCHITECTURE.md` | `0BCF9A69593FB73AC615B192BC9E4E2003D924A2CD5A4DA0ACAA1D069925C3E1` | unchanged |
| `docs/decisions/DECISION_LOG.md` | `FED0DE90E473E523B831702E3355FD5EFC70E0B525CB28636A7461721D739591` | unchanged |
| `docs/design/DESIGN.md` | `B13E9248DF22FB31700E56F67E1CA260FBB991E2113603D4935DD8886DB82B3A` | unchanged |
| `docs/design/README.md` | `C5E8CE4C8C37B4DFD52C4D46E81860FFE47E95C7C7D750FE2FD9E7C927BCAB79` | unchanged |
| `docs/engineering/BUILD_PLAN.md` | `D63CF3C779ED8A37F19E1FFCD190EE2417578F8B1AF545B7D3E34B6689C72B20` | unchanged |
| `docs/engineering/DEVELOPMENT.md` | `A43C96739ECC2D5E4F61243346D58406E3E9E5949385A4D72F48332C29D0C491` | unchanged |
| `docs/engineering/FIRST_CODEX_INTAKE_PROMPT.md` | `E22BA5B465C699743C183634D3EDE97228ED2AE52922C8F300A96714EC0901CC` | unchanged |
| `docs/engineering/IMPLEMENTATION_AUDIT_WORKFLOW.md` | `722749E794B30920B01FDEDD0892791366035D3B09744A3F4E968443B081B024` | unchanged |
| `docs/engineering/LOCAL_DOCKER_WORKFLOW.md` | `42BEF19D766CC48953528C82C3D63F6BB7FA3EF6215992893A8A245FDAED9F93` | unchanged |
| `docs/engineering/M0_FOUNDATION.md` | `6BCB23781D16B2B61BC6DA43DD83683F953BC274EA1BC83DB8C29386078A0EB1` | unchanged |
| `docs/engineering/M3_AUDIT_CORRECTIONS.md` | `C8C4148BDB661521B65BF0A0D8E4E269F9C09661DDA932FDA2AC334C18073BC1` | unchanged |
| `docs/engineering/M3_SALES_PLAN.md` | `7DD6395FFE7D728D14FC46B4A6A50036102F6C505A4082518FC80820F3BF2FC3` | unchanged |
| `docs/engineering/M4_AUDIT_CORRECTIONS.md` | `49EA55FB9ACD63B32F6F96BAAB7F72226E56A26462813BFDDD5E49B00F2049E4` | unchanged |
| `docs/engineering/M4_IMPLEMENTATION_HANDOFF.md` | `C740A1DE70182C2B6700A0BC452031D62FFBB612D95D85D13364DE4276961ABE` | unchanged |
| `docs/engineering/M4_RESTOCKING_COSTING_PLAN.md` | `21631896BEFD4CB0E07F62E170671D6751BF31C59C0FD97DABAB5E9BC22D868F` | unchanged |
| `docs/engineering/M5_AUDIT_CORRECTIONS.md` | `7A76953F92782B2FCE3CFBF8653733F74C87DD9EDC0CDDE6732C34EB4039B6DF` | unchanged |
| `docs/engineering/M5_INVENTORY_RECONCILIATION_PLAN.md` | `B00001656C7DA6BEDFA4156B87CCE4F90BE0CF76C007A7606ED9AE219F100F25` | unchanged |
| `docs/engineering/M6_AUDIT_CORRECTIONS.md` | `B4FE34BEDAAF147333529526B9177434F39537EB8CF0B8DAE3C6710044A36711` | unchanged |
| `docs/engineering/M6_EXPENSES_BUSINESS_SUMMARY_PLAN.md` | `C771D02266C8E967B10CE4256A17A69D3C7DFF7B35482B42399541D891E1D90E` | unchanged |
| `docs/engineering/M7_INDEPENDENT_AUDIT.md` | `CA1A48ED08C913ADFFCAD1262F46BB0C663C0502EC5DB11CE9ED943A1F9ECE2E` | unchanged |
| `docs/engineering/M7_OFFLINE_SYNC_PLAN.md` | `2B44F0DE8AC6D92BA5677C4E6EFCDA02CB8A09527762F180C8325F097E4FADDF` | unchanged |
| `docs/engineering/M8_ANDROID_VERIFICATION.md` | `631C0406AFE440360B4B76385EBE71791BA407CFB69A76D79C224662ED73B0FB` | unchanged |
| `docs/engineering/M8_CATALOGUE_LOOKUP_PROVIDER.md` | `7CA25CC154B8801A59D782D9650FBF67A4FE4CE7F58230825207417721E8FFB0` | unchanged |
| `docs/engineering/M8_IMPLEMENTATION_EVIDENCE.md` | `0E459E3A3645EEB490E351B2127E674D1E7846A06CA0A61E039920AA6CB4F671` | unchanged |
| `docs/engineering/M8_IMPLEMENTATION_HANDOFF.md` | `DE057C7B228D507F47C39534675C8EB14349B16C762EDF8CA335BC34D55A5AA7` | unchanged |
| `docs/engineering/M8_INDEPENDENT_AUDIT.md` | `F7ECF28C1B4A401A80D8D5079339889292CB3CCC4775CBC27DBE58EF4DE345B8` | unchanged |
| `docs/engineering/M8_SCANNER_PLAN.md` | `24FF9455B451C28938C0714349671ED88ABE3D80737E282B17AFBB8BB5EC2E40` | unchanged |
| `docs/engineering/M9_INTEGRATION_PLAN.md` | `1477AEA9537950DAEB409906D912993DFFC05EC59DFA0FABBB85C73DE835E0CD` | unchanged |
| `docs/engineering/MULTI_AGENT_WORKFLOW.md` | `ED322489BB18C9A68F86DF016A7AA5B90085270EE680DCBFEFC2D53FB2C55DFC` | unchanged |
| `docs/engineering/TICKETING.md` | `1C41E0FC9DABFF940993DB540F5A06B84659B8319FB84679A132EFA427A16ED1` | unchanged |
| `docs/engineering/tickets/M1_DOMAIN_LOCAL_DATABASE.md` | `303C25BCB27CEE9840FFBB7B36296178DB94461F40F3378A71FC6823436478A2` | unchanged |
| `docs/engineering/tickets/M3_SALES.md` | `6C7D7EE89F0B599C437C18E713CA1386A47E03E5742C22652252DE6EBF696E46` | unchanged |
| `docs/engineering/tickets/M4_RESTOCKING_COSTING.md` | `4C1C49EBE6D8018E7B2F5774A442D92CE07235A76ED2A99EC03BA1830E19A88E` | unchanged |
| `docs/engineering/tickets/M5_INVENTORY_RECONCILIATION.md` | `2A5DA759F68493AABF7D0383A4EC82FE2ECA707924A9A029B3B1808C362A529F` | unchanged |
| `docs/engineering/tickets/M6_EXPENSES_BUSINESS_SUMMARY.md` | `9E84202B62A9057A83B4808040E4BF97E1FC789EF5973738D30D37B011BFF864` | unchanged |
| `docs/engineering/tickets/M7_OFFLINE_SYNC.md` | `EAA52A786268BAD78AC62C97F6511AA23408A9207AD937BB6A982B343161BD5A` | unchanged |
| `docs/product/PRD_MVP.md` | `50A4F8F5D644E5179FF7DFF6BD9A698CB69A260A3F49638939BA27E3F4ECD708` | unchanged |
| `docs/product/PRODUCT_CHANGE_BACKLOG.md` | `77A49A4623D86777A2FC48362452E5D0D402FA166181B58D370D52190FB56188` | unchanged |
| `docs/product/PRODUCT_INCEPTION.md` | `1CECED6381F71B0806990EB9B021ADFE20A8A8D878CCE605F19BC3E72BB241B1` | unchanged |
| `docs/recognition/RECOGNITION_TEST_PLAN.md` | `53845B7F7D5A30CF85332AF6BCC9C24ABA4849946B4444AB0199F08C32E68371` | unchanged |
| `docs/recognition/reports/R0_A2_CORRECTIONS.md` | `821CD04FAD98DA8C3B439541356E6DF716A459B5FEDE760A982336F1269AF1A6` | unchanged |
| `docs/recognition/reports/R0_A2_INDEPENDENT_REVIEW.md` | `28D69BE7845318254448E2C4E4FC0DDBD339A5C0D083CCAF2B3DD7D4A028E361` | unchanged |
| `docs/recognition/reports/R0_BENCHMARK.md` | `DC92C7BDDD987405D7CFE1C6B8649C6BA911AA1668641ED4F73F0DFD347839EA` | unchanged |
| `docs/recognition/reports/R0_INDEPENDENT_AUDIT.md` | `C3C0D361277E9AD9B74C7BA1E9BF06D4FD519A925BAE426BDC1B9BF686531009` | unchanged |
| `docs/recognition/reports/R0_R1_FA03_CORRECTION_HANDOFF.md` | `423E58EDDD26104879E2C2FADCD08588BCD03910ED04CA2568897D5027A18915` | unchanged |
| `docs/recognition/reports/R0_R1_FA03_INDEPENDENT_REVIEW.md` | `C9DD8F450B4A4C4CDEEEAEEBDF452B281AC58108ADE3B8A4378EAE112ADECA7D` | unchanged |
| `docs/recognition/reports/R0_REAUDIT_REPRO.mjs` | `F8BBDD08AB3B5C33ECF901FBBE70F5FDF750D93019B387EB28CF2E350DE1EA2C` | unchanged |
| `docs/recognition/reports/R0_REAUDIT.md` | `BCCFC6451E1ED10E140943BAEA620A5D5E0CD154F7C6B9D757207894568BF31A` | unchanged |
| `docs/recognition/reports/R1_INDEPENDENT_REVIEW.md` | `A2CB342B4D88B9671105D1A98814A233D055CD80C0DC8152BAF0DC78FA2A087E` | unchanged |
| `docs/recognition/reports/R1_PREPARATION.md` | `A5960E4BCD7349123EF8DCBB78EE33E3A779ABF49A385FB3D69A7D0FFAEFC1D1` | unchanged |
| `docs/recognition/reports/R1_R4_FINAL_AUDIT_REPRO.mjs` | `230B5FBA31399AF0FC1C8055B155752C70E01282AA99610868246475893A3814` | unchanged |
| `docs/recognition/reports/R1_R4_FINAL_AUDIT.md` | `68A64EDC3FDF8C623BB5C32DB406E131E956193A3F309DBBF037B81F965F1326` | unchanged |
| `docs/recognition/reports/R1_R4_REVIEW_HANDOFF.md` | `54E6EB87AE720A96F380F9C32B0683A362607306FB839BFEB2EE3F07B74AA4FE` | unchanged |
| `docs/recognition/reports/R2_FA03_CORRECTION_HANDOFF.md` | `0ABCF961194C69E71875D57A0336BF5EC7670D6CE0DDB022B0FAC80FD9815A13` | unchanged |
| `docs/recognition/reports/R2_FA03_INDEPENDENT_REVIEW.md` | `7AA0B87D5F79FF56AA446E25D21DBA6529C741E248E27575BC061A6421F8D4C0` | unchanged |
| `docs/recognition/reports/R2_INDEPENDENT_REVIEW.md` | `ABD7AC83A1F3A69E00A9895C068C2FDE1261E6D509685044468F85131534D103` | unchanged |
| `docs/recognition/reports/R2_PREPARATION.md` | `35EFDC03A190FCE356ED50A971730938C3B77D38CCAA677466145C5E840A12E6` | unchanged |
| `docs/recognition/reports/R3_FA03_CORRECTION_HANDOFF.md` | `E9E1F7B9F27D2DA24A19731F72D7815B7A830CC847118C5F799F054F1137DD06` | unchanged |
| `docs/recognition/reports/R3_FA03_INDEPENDENT_REVIEW.md` | `BA004FBECA6F43B5D26C83C935BD73EEFD8746206AAC2B5B3A7D327B8123C6F4` | unchanged |
| `docs/recognition/reports/R3_INDEPENDENT_REVIEW.md` | `04BDCE326594B24E4DE1F01AA87C899DBDC0D55E921EE123FC7FBF93AE214BA1` | unchanged |
| `docs/recognition/reports/R3_PREPARATION.md` | `6666D2E1EF7EBFE7A31D1D985C5234196106A48911219D7D7BA4AA54491C57DE` | unchanged |
| `docs/recognition/reports/R4_FINAL_AUDIT_CORRECTION_HANDOFF.md` | `A901153CDCEFB5EB400E25C4A97C7308081CA613C27D98758ACEF2DBDC8AF736` | unchanged |
| `docs/recognition/reports/R4_FINAL_AUDIT_INDEPENDENT_REVIEW.md` | `DC7E5FDB99294D4CD5B0E570F7556E3A2BECC3724E9627E7147957B6A00E8712` | unchanged |
| `docs/recognition/reports/R4_INDEPENDENT_REVIEW.md` | `AF290E39C2A84D4001FB81F33A44B6FDCC78D68364F0BC929317DA1CABA29142` | unchanged |
| `docs/recognition/reports/R4_PREPARATION.md` | `F6906F3BDFC82F847281C3E2478E2BF51DD33F6A6D50E9862C496B1D3C6B9AB7` | unchanged |
| `docs/recognition/SCANNING_ARCHITECTURE.md` | `4F61065AE131AF64888E03DCA81992B495C89E419004CB89AF98CF4536269E3E` | unchanged |
| `docs/recognition/TRACK_B_PLAN.md` | `25E1C16CCF2E3945106117E554AFA491BCBDEF2ECBE6CBE8AF0085FC7D9AA3AF` | unchanged |
| `docs/recognition/TRACK_B_R0_TICKETS.md` | `82A741CAA73A4F1F20A3B209A4FC28D58260154C19B0CC2042D112E1F68FE8D3` | unchanged |
| `docs/recognition/TRACK_B_R1_PLAN.md` | `CE74AD3C938F13164D8263F69675955573B3D8DA67A6DBAFD890E4DD67A23B87` | unchanged |
| `docs/recognition/TRACK_B_R1_TICKETS.md` | `86E29355E0306CB182D38CA585C55499607F791CC16A280D59EA831CB34D27E4` | unchanged |
| `docs/recognition/TRACK_B_R2_PLAN.md` | `D6626EBA3540176F31A4D74A3FF78C582C21B8A8911A5B9CFCEE919E15DAFC83` | unchanged |
| `docs/recognition/TRACK_B_R2_TICKETS.md` | `92647977AAE6BA449236B0D808CD755B2F4395BE514915BC14FC2B1EC4E2B099` | unchanged |
| `docs/recognition/TRACK_B_R3_PLAN.md` | `712499B1370A2407ACC2D699D417558C7B83C1AA65607F8A294005761FEB7042` | unchanged |
| `docs/recognition/TRACK_B_R3_TICKETS.md` | `CB6DE8BF37381121DF7E77192E9D095A7E8E0AA4EFEBF59867746E93E35A0B6A` | unchanged |
| `docs/recognition/TRACK_B_R4_PLAN.md` | `7FCDCA94C95DC67A4C3A8B42CBFD3445BAC6D94A9F4CD43F247A96EA6107863A` | unchanged |
| `docs/recognition/TRACK_B_R4_TICKETS.md` | `4F166E5D8A8A139DBF688453D1B9EF6F25F8A12E72E7396458B7D9BCB276ABB6` | unchanged |
| `GEMINI.md` | `4C7F948CC1E3A41539AF7068B1E6082695812C845E901629C8C13299D9E275C5` | unchanged |
| `package-lock.json` | `9E3B66E4D3482960A034815870C2BE44E9DB59E178008D5F954829087009CEF6` | unchanged |
| `package.json` | `3CF73202F1733B87C3DC068285D1354C321F8762B3AADA88111502E1F1CA5EE1` | unchanged |
| `packages/contracts/__tests__/recognition.test.ts` | `FFFC0CCB03EE2195A32B3DD3F1D287FCD7B974BCEE691112DDD02D35F433BCFF` | unchanged |
| `packages/contracts/__tests__/sync.test.ts` | `BED72681FE47F4312AD27ACAFD7DC8762603EB46DDBE5DD2DC4FD57E14262ED0` | unchanged |
| `packages/contracts/eslint.config.js` | `FAC31767CCBCEA87A45430D3D5FA1E5EE8F3CB799100CF962540FD479C731B4F` | unchanged |
| `packages/contracts/jest.config.cjs` | `5B87D9B804D6A69E5A13C76F174F53930BCA73E61D9A586F7056618C5BC62336` | unchanged |
| `packages/contracts/package.json` | `36135771CD22B53654D0690DE9ED5C484CD5312F2E9E5787B93A3AC064AA504E` | unchanged |
| `packages/contracts/src/index.ts` | `25905EE0EA4DE71CDCFD71F652476D35F204DE89BA812CA6003CD203A87C2F1F` | unchanged |
| `packages/contracts/src/recognition.ts` | `54088F99E8157670B4B76AE04B32EB8E53DA271245FFC753BA8874A01D7872AF` | unchanged |
| `packages/contracts/src/sync.ts` | `7808C4909A5097090AE7C655734C5EEE6EF402FB2CE49899AFDA062E6A588AF8` | unchanged |
| `packages/contracts/tsconfig.json` | `D995B8ACD9EAC327668649AA82DCB25D2573B69EF8B2B0D532E68343B638E161` | unchanged |
| `packages/domain/__tests__/costing.test.ts` | `9B3D3C1A5E340C8E560A36CDC3EF81BA8374D9499D4071BEDDB9EE926D280BE7` | unchanged |
| `packages/domain/__tests__/ids.test.ts` | `7A0DB7C15DB41711B4F32FC2E05AD179FA9E9FFE667DCC8EBC0029BE000C2D84` | unchanged |
| `packages/domain/__tests__/money.test.ts` | `B7E55214211302F7C8DE480C9A2C74698B6275A4D4C4CD3519535D840B5512FE` | unchanged |
| `packages/domain/__tests__/packages.test.ts` | `675B11EAF77AFD89D28667C957E7013033789716D58836A0A60102903248D421` | unchanged |
| `packages/domain/__tests__/sales.test.ts` | `5C934C39670DC44927912D36A1571D7EBAB1BADBDC6308EC4126BC84CC8043B2` | unchanged |
| `packages/domain/eslint.config.js` | `FAC31767CCBCEA87A45430D3D5FA1E5EE8F3CB799100CF962540FD479C731B4F` | unchanged |
| `packages/domain/jest.config.cjs` | `5B87D9B804D6A69E5A13C76F174F53930BCA73E61D9A586F7056618C5BC62336` | unchanged |
| `packages/domain/package.json` | `4C6BFC9242F4F73AB0188C71778B1B21BCE22A63DBA293DFADB18B431B1308DB` | unchanged |
| `packages/domain/src/batches.ts` | `6C25910FB7A64F7C097036A092A431F9BC49988A1019569FBB17B167F87E46AE` | unchanged |
| `packages/domain/src/costing.ts` | `827F3017D8F0C85C0374AAADEA5FD96030F40F1F38C20C2F16DF17D5231F16E7` | unchanged |
| `packages/domain/src/errors.ts` | `36A643BF85164969EC4EEB5A51DB886F3DD7E4D880AC5B7C8A9AA540CFC41236` | unchanged |
| `packages/domain/src/ids.ts` | `536DB9F235713005DD19EAD69B1AE17609112C365AA7823A176BC3600E3B99C4` | unchanged |
| `packages/domain/src/money.ts` | `D2D967B629E397A1E188EEDB7A93F2A369C4FD68920595252564D395000ED9B7` | unchanged |
| `packages/domain/src/packages.ts` | `7121F66E19A6415149AE40B0E774445D91F220BD6137ED178F1194A9EB5E3B39` | unchanged |
| `packages/domain/src/sales.ts` | `823C221CC6D10FCB13F37135EC7B83983B2679F286417B6A46240202F77F8850` | unchanged |
| `packages/domain/tsconfig.json` | `D995B8ACD9EAC327668649AA82DCB25D2573B69EF8B2B0D532E68343B638E161` | unchanged |
| `README.md` | `A2C2C7EB2AE61B21F10AB51A9E2FB89E8963E78A7280670525774E585D9F77E1` | unchanged |
| `supabase/.gitignore` | `507699EB91144818EDF61D3A079212CACF31D8DB520EAE428E3B48FCF0D6919C` | unchanged |
| `supabase/config.toml` | `091E368063001B27F0FCC5B56A1C1FB34AE374BB591784E9D8872DA8A49D5C2D` | unchanged |
| `supabase/functions/_shared/http.ts` | `61DF9D3FD906D237925CAD196B7B94FFF30B39F743151216F07744A02F45A143` | unchanged |
| `supabase/functions/_shared/protocol.ts` | `AA7FB75236F11A10F89A216A21936710A378F4E43D77E6B0D2F70949E6A82C99` | unchanged |
| `supabase/functions/.gitkeep` | `01BA4719C80B6FE911B091A7C05124B64EEECE964E09C058EF8F9805DACA546B` | unchanged |
| `supabase/functions/sync-bootstrap/index.ts` | `975C432AE74AE21250FBFC1244D473724EE0EC02ECC4916CD3922DB5F3237481` | unchanged |
| `supabase/functions/sync-enroll/index.ts` | `D0912A48683586259A72F6D5169BDDA0B27C0BA2C9C35648DF77990A4F9B54DB` | unchanged |
| `supabase/functions/sync-pull/index.ts` | `4A58179775182FE8F474271C42447BEDFA310FDD4D753FD49A9D6F57CABAE645` | unchanged |
| `supabase/functions/sync-push/index.ts` | `87883B7C4E65E5A5E18607E532CECAC435B8513CA378A1A5ED02F02B80D74F38` | unchanged |
| `supabase/functions/sync-reference-context/index.ts` | `D7EB1B1F7EF0897B0E5AC9A2BB06B55EC975F800561FA8E7220E26CDCE8A437C` | unchanged |
| `supabase/migrations/.gitkeep` | `01BA4719C80B6FE911B091A7C05124B64EEECE964E09C058EF8F9805DACA546B` | unchanged |
| `supabase/migrations/20260919032659_m7_sync_foundation.sql` | `97DBB1D5F646830CEFD4AA544F698AAC43600F2881EF66304BAF16E844228297` | unchanged |
| `supabase/migrations/20260919211406_m7_sale_purchase_graph.sql` | `844885C1E1C87288B066BE61EECE48CF59C9D3F328A4BBE8C71783CFC46B85B3` | unchanged |
| `supabase/migrations/20260919212011_m7_catalogue_conflicts.sql` | `3616630871D1F1B52430E26757A55E08306B9527FC959FE3688A9962DCF983CC` | unchanged |
| `supabase/migrations/20260919212220_m7_m5_fact_projection.sql` | `68EB8A65F378E9CBB4EE2B49C439795FE3914D09993537EB79833E1A479D4579` | unchanged |
| `supabase/migrations/20260919212406_m7_finance_bootstrap.sql` | `DDE48DEFDB38AEE061E1966B2DF2156C3722EBA1FC79AB7DD677C52D9613F0B2` | unchanged |
| `supabase/migrations/20260919212526_m7_cost_batch_hardening.sql` | `6C6581D52DB3B24BB6974D6D8286AE97AAC7D2AF3AB338D9E643ADEB03F3E5D9` | unchanged |
| `supabase/migrations/20260919213259_m7_cursor_bootstrap_hardening.sql` | `3C79F040B5E71B7A99E6E6A408F3A27831CF4332E5E6CB8D77C123F212474729` | unchanged |
| `supabase/migrations/20260919220000_m7_device_authorization_hardening.sql` | `4CF726D3C4727462CA70224E9805D9419F9E75D94FE2BDDEF7EF98F8EC473006` | unchanged |
| `supabase/migrations/20260919223000_m7_bootstrap_operation_history.sql` | `76568B82354D5012E4F516D9D382EF16966BEF6C36B3601DDD0AE04EA3EC0989` | unchanged |
| `supabase/migrations/20260928005512_fix_apply_one_pgcrypto_search_path.sql` | `935BCC74205F176367FBE98B93491B5F2EA5C3186FE879380E715EEE1AC5A7DD` | unchanged |
| `supabase/migrations/20260928010143_prevent_revoked_device_reenrollment.sql` | `A049585FE6D89FC8FB35A6A538655C234E95A46B668EB202BBEF5950225CD8C8` | unchanged |
| `supabase/migrations/20260928010639_bind_money_out_actor_to_authenticated_owner.sql` | `2AA224037F9E6600C9C700FE10FD6A030C8B3BE69D480CF978C141EDE047B048` | unchanged |
| `supabase/migrations/20260928054000_guard_reconciliation_server_baseline.sql` | `4A2694B05AFE34C8BE7E7DA2B2217A4B610C4767538ABD528618718B29CE8E82` | unchanged |
| `supabase/migrations/20260928115526_d045_later_device_bootstrap_context.sql` | `F236A61FA91AD10ECCE225934621B1BBDC77B10F49442C016A947EC4B72B7820` | unchanged |
| `supabase/migrations/20260928160000_d045_reference_context_device_authorization.sql` | `DE9FAE5806F359353708B3ECADD933C180D6FAEB083C99DEBE07CF668D29141F` | unchanged |
| `supabase/migrations/20260929092623_m8_identifier_claim_guard.sql` | `409F8133F713BA15C3D44247636FDD3CBB8E5EDF4433D6B24A245317A762D2F5` | unchanged |
| `supabase/README.md` | `1A660001861070402C8B03145D244250D14DA185886F3BB9752B1EADBD76B9C3` | unchanged |
| `supabase/tests/.gitkeep` | `01BA4719C80B6FE911B091A7C05124B64EEECE964E09C058EF8F9805DACA546B` | unchanged |
| `supabase/tests/m7_bootstrap_history.sql` | `F1CE2CE429509C974652285497332E9AB4A22281706D0682C33D9FFF1FCE57F8` | unchanged |
| `supabase/tests/m7_catalogue.sql` | `56A1E295DBF1C8FE8D4391CC81929A700EB44DBB8DA354213407C78089BD09FD` | unchanged |
| `supabase/tests/m7_cost_batch.sql` | `857B8BB4E576070BF573A94DF12CF60DF769D386177C7B6AEBDBC433B1103F1F` | unchanged |
| `supabase/tests/m7_cursor_bootstrap.sql` | `4209611DC63D0ABE4C86F3695972C6124C5A3CDE80686A01A960C9ED27E93674` | unchanged |
| `supabase/tests/m7_device_authorization.sql` | `6158692AC152A8BD382D0CDBC52DB053D56006253CF46B20A4E6D4219C5D345D` | unchanged |
| `supabase/tests/m7_finance.sql` | `9D2D5AD59E6E6A59915015167F4B6FAF3008B211568CF54B29A9C48F5A1CBD6F` | unchanged |
| `supabase/tests/m7_m5.sql` | `9E40C66D82F483C028346F2963C494551CC67077C5D3956F72B133D6D5E6F2FE` | unchanged |
| `supabase/tests/m7_reference_context.sql` | `4E80ED46F1A32DAE782A4F5F8EDDA67A18ACDE33EC3AB6777AB00124F0B47BEB` | unchanged |
| `supabase/tests/m7_sync_graph.sql` | `AF4BCC8284AD5416E9E82F688C01064F1F1750F694E9D91E0D6763197B0E7B5B` | unchanged |
| `supabase/tests/m7_sync.sql` | `01D0610BB970162ED4C052F32FAF068475689105F7E99581B6BF94E38E345900` | unchanged |
| `tickets.md` | `11F48088B55B02F2C66E71A566AB80A78BC4E21374B7592B20228D97DCAA6A88` | unchanged |
| `tools/scripts/check-environment.mjs` | `22E68D3691D0FD1C27ADD5DF3C47B42872B5075E1320100B5811DFBCC6A5C4E7` | unchanged |
| `tools/scripts/scanner-cue-candidate.mjs` | `7A32C0A5CA398020BD9FADFC1CC486B53B39725659B4745314F5037ACD646BEE` | unchanged |
| `tools/scripts/test-local-sync.mjs` | `9AF6C3C1F54A3820B8ED5EA04600D8AB4701901BA22335F8DA0BA306C4480EAF` | unchanged |

</details>

Log SHA256 values:

- `focused-domain.log`: `ebb741700ed13e63eb1b0805a36aad4a65dc0e429f60c3863e7953c05dad8bb3`
- `focused-mobile.log`: `260911278a150ce5ab7e18461df8b2dffebd22bef3844a3e6b4dc4e3dc4135ff`
- `typecheck-I1.log`: `b3dca57b2c56e83dec8f71d4ad2bedc77a2988c6759eb92e50fee659454ab207`
- `lint-I1.log`: `aa823b788b653209ac5fc97190bca0beec475336fef07c4be97de2bc9dc360bf`
- `product-rerender.log`: `3f2604dd717528b1e7fec0cb2e62f7ab71ff9ac75d9887135771c042a74b81ee`
- `current-sync-regressions.log`: `704bad0ba2b0cb52fda89f99635c3b8630be175673be5d67ed975babfde46189`
- `typecheck-I2.log`: `a5cfa35b0c458eb42be54e784363e2132a197aef0558627f188a9177488cc126`
- `current-sync-final.log`: `8e7ce421b3fa407d3b0795014b5162f2d9a5e3f7d28039543e5164b5548c2f04`
- `sell-stub-draft.log`: `4ca688acf8f2666cf92110db51ef4ce634017e97f59b581a05567026034528cb`
- `validate.log`: `a4b451e98d8a817afa4d585a087dbd3690f7312a959490a5453e7720a6bf4fbc`
- `doctor.log`: `2d7aff048b41888f86fcc3b1e746ffd86df8e0035832f254505106c4a6b71fc4`
- `dependency-check.log`: `0379db0e67f3e2d25ad266d2ed164f94383164514be300f84d5758558fb9a0e7`
- `android-export.log`: `02e3be02db274264ed26ccf15c09e4adcec2d871cf96c9290c6f13ae836818ad`

## Remaining gates and return

Main coordinator independent source audit and acceptance are pending. Physical Android/offline/native camera/photo/audio, large text/accessibility, live Auth/Edge/PostgreSQL, broader release/second-laptop gates remain pending wherever unrun. Existing historical M7/M8 evidence was preserved, not promoted to fresh M9 acceptance. Recognition-lab source tests do not select or accept a real model/runtime.

The writer has released its lease and stops all commands and edits after this handoff write. Next action: main coordinator reviews this stopped handoff and actual current diff, then returns bounded corrections to this same chat if needed. Founder-authorized report-back to coordinator01a098ef-d830-7531-bca7-2d66b0a5b587 follows immediately; actual delivery status will be reported in this chat, with no assumed automatic wakeup.


</details>
