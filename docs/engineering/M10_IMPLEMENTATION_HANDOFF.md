# M10 implementation handoff — source prototype

Current coordinator disposition:software source accepted after independent C1/C2
verification on2026-10-03. Returned implementation evidence below is historical;
see M10_INDEPENDENT_AUDIT.md final review for current acceptance and pending gates.
All writers remain stopped; activation OFF; no M11 work authorized.

Writer: `01a0ffd0-8615-7252-b7d0-a5f548067d52`, GPT-6.1 Sol HIGH as dispatched;
no model change or additional writer/auditor. Coordinator
`01a098ef-d830-7531-bca7-2d66b0a5b587` owns independent audit and acceptance.
Checkout: `C:\Users\doyew\Documents\DEV 2\COSI-m8-planning`.
Branch: `plan/m8-unified-scanner`; HEAD
`66ea3fc22595a48d7355d1729bb879496cc98896`. Valid original M8/Track B/M9/planning
dirty/untracked work is preserved. No commit/push/merge/history change.

## Current C1/C2 stopped correction return

C1/C2 repaired within ceiling;102 distinct market tests/five suites pass (mobile51/three30.924s;contracts13/one5.280s;domain38/one5.119s), no skips in these complete runs. All four workspace types/zero-warning lint passed, final mobile types/lint repeated after last test edit. Writer STOPPED; lease released; coordinator acceptance still withheld pending independent re-audit. Activation OFF; SQL/live/physical gates NOT RUN/pending.

Current correction record: M10_AUDIT_CORRECTIONS.md contains exact source changes,
failed/passed commands, limits, fresh573-file baseline and final correction hashes.
563 protected files unchanged; ten allowed deltas, zero missing/new repository files.
No schema/contract/SQL or old compatibility-test changes. Hidden tombstone capacity
can explicitly reject a same-revision replacement; expired rows stay suppressed
until a newer release. Local exact-key product labels never enter shared requests.
The original553-file record and stopped implementation evidence below are historical,
including their initial hash rows and full-validation/Doctor/export results. Those
rows are superseded only for C1/C2 source/doc paths by the fresh correction record.
Coordinator is the sole independent acceptance owner; no M11 work follows.

## Initial implementation status and scope

M10-01..04 implementation source complete under provisional D-051. Writer
STOPPED; lease released; independent coordinator acceptance remains pending.
External app/server contribution and release activation remain OFF by default.
No real retailer data, catalogue mapping, geography or market coverage was seeded.
All test fixtures explicitly represent synthetic stores/prices/authority.

Objective: separate prospective/revocable contribution controls and truthful
market-release caching while preserving immutable personal purchase facts.
Non-goals: M11 permissions, recognition, native/provider changes, hosted jobs,
real contribution, deployment and market/privacy/release acceptance.
Changed boundaries: market-only contracts; local control/cache; restricted
server reference/consent/projection/release schema and OWNER RPCs; More route.
Highest-risk assumptions: server authorization/concurrency and privacy of fixed
five-store releases. They require real SQL/Auth/privacy review before activation.
Recovery limit: migration source and disposable local fixtures only; no existing
persistent/server data migration was run. Core business sync/outbox is unchanged.

## Implemented behavior

- M10-01: strict separate request/state contracts; current ACTIVE account,
  OWNER membership, store and enrolled device guards; stable operation/body hash,
  expected-version conflict and server time/revision generation cutoffs. Original
  purchase observations remain consent=false. Durable uncertain requests reconcile
  before another intent. Local OFF suppresses saved results immediately; an unknown
  delayed enable is fenced by a new disable rather than retried. Restart preserves
  pending intent. More has a compact disabled/experimental market screen with
  informed opt-in source controls and separate personal history navigation.
- M10-02: server-only sanitizer joins accepted private M7 purchases, observations
  and operation records with reviewed current local/canonical package mappings
  and approved country/currency zones. Positive exact costs/quantities/conversion,
  source status, current generation/time/revision, active OWNER and enrolled device
  are required. Unmapped, estimated, zero, corrupt, future or pre-consent facts are
  excluded. Private provenance is confidential, not anonymous. Public release
  contracts exclude identities, supplier/contact details, raw purchases, quantities,
  private names/photos and client-asserted cost/authority.
  Current local identity comes from the latest applied M7 normalized nested
  variant/package facts and their server revisions. STORE_PRODUCT creation does
  not require separate child sync documents. Neither M7 nor accepted facts change.
- M10-03: operator-only fixed-policy refresh, latest observation per store/cohort
  in 30 UTC days, deterministic time/revision/ID ties and exact cross-product
  rational range/odd-even median. Fewer than five stores has no numerical fields.
  LIMITED coverage, contributor-count meaning, window/timestamps and at most 24h
  validity are explicit; no trend/confidence percentage. SQL release invalidation
  shares the control transaction. Source/reference/authority loss suppresses
  releases; there is no caller recompute/window/threshold endpoint or hosted job.
  A bounded 100-key cache validates the whole response before atomic replacement.
  Context/revision/generation and local identity changes prevent stale insertion.
  Tombstones remove numerics, including equal-revision expiry; equal/older available
  responses cannot restore them. Every read/resume evaluates expiry, and the UI
  hides expired numeric advice. Network/cache failure remains independent of sales,
  restocks, scanner, business sync and personal M9 history.

The shipped route has no live transport. `disabledMarketTransport` sends nothing,
and the screen explains unavailability. Injected bounded fixture transports test
source states; they are not real Supabase authentication or activated contributions.

## Migrations and SQL gate

SQLite 27: `apps/mobile/src/market/migration.ts`, registered additively in the
existing registry. Stores control acknowledgement/pending/local-off/fence state,
epoch/revision/context and a bounded cache. No rewrite/backfill of receipts,
inventory, costing, outbox or previous migrations. Populated schema26 restocks,
cost state/movements, observations, inventory and outbox survive upgrade/restart.

Server source: `supabase/migrations/20261003033504_m10_market_source_prototype.sql`,
created using installed CLI `2.117.0` (`supabase migration new`, not applied).
It follows the existing M8 identifier guard and introduces restricted market
configuration/zones/identity mappings/control ledger/projection/release provenance.
RLS and revoked table/schema/private-function privileges are explicit. Public
market_control/state/read RPCs have fixed empty search paths, qualified relations,
explicit authenticated current OWNER/device checks and narrow grants.
Operator refresh is unavailable to app/service roles. Source fixtures are in
`supabase/tests/m10_market.sql` and `m10_market_projection.sql`.

**PostgreSQL execution: NOT RUN.** No already-approved disposable environment was
established for this run. No server/persistent/hosted migration, service startup,
live Auth/RLS/parity/concurrency run or production data access occurred. Authored
SQL is not runtime-verified. Sequential delayed-enable/revoke cases are authored;
real simultaneous sessions and grants under live Auth remain independent gates.

## Verification record

Runtime: Node24.21.0/npm11.19.0, installed workspace dependencies unchanged.
Focused commands and overlapping evidence (do not sum as unique test totals):

- `npm run test --workspace @retail/mobile -- --runInBand m10MarketControl m10MarketScreen`:
  corrected 14 tests/two suites, 23.155s, exit0.
- `npm run test --workspace @retail/domain -- --runInBand marketPrices`:
  37 synthetic sanitizer/aggregate cases, 5.117s, exit0 before final microsecond case.
- `npm run test --workspace @retail/mobile -- --runInBand m10MarketControl m10MarketScreen catalogueLookup m9SyncIntegration m9PersonalPriceClient`:
  48 tests/six suites (also matches catalogueLookupUi), 61.837s, exit0.
- `npm run test --workspace @retail/mobile -- --runInBand m7Sync`:
  16 tests/one suite, 16.932s, exit0; no M7 source changes.
- `npm run test --workspace @retail/contracts -- --runInBand market`:
  13 strict response/request/privacy-boundary cases, 8.238s, exit0.
- `npm run test --workspace @retail/mobile -- --runInBand m10`:
  35 tests/three suites, 32.094s, exit0 before the final equal-revision cache case.
- `npm run typecheck` / `npm run lint`: all four workspaces passed, lint with
  `--max-warnings=0`, after each source slice. Final validation below includes
  the last changes.

Initial failures were corrected, not hidden: the first control run had 12 failed
tests/one passed plus a Jest mock-hoisting setup error (two suites failed), due to
using fixture `user` instead of `owner` and an unprefixed mock variable. Initial
types detected that fixture field; initial lint found synchronous setState in an
effect. The fixture/mock was corrected and focus/resume subscriptions replaced
that effect pattern. Corrected focused/types/lint runs passed. No final failure is
silently counted as a pass.

The first full `npm run validate` exited1: contracts25/three suites and
domain195/seven suites passed; mobile543 passed, one failed, eight skipped
(79 executed suites, two skipped;399.382s). The sole failure was the sales test's
complete schema-history expectation missing migration27. Recognition-lab did
not run because the command stopped at that failure. Its log is retained as
`cosi-m10-initial-full-failed.log`. After coordinator approval, only the new
history entry was appended; focused `--runInBand sales` passed25 tests/one suite,
38.686s, exit0 (`cosi-m10-sales-correction.log`).

The second full `npm run validate` exited0. Environment source-only check,
all four typechecks and zero-warning lint passed. Unique tests in this run:

| Workspace | Passed | Skipped | Suites | Time |
| --- | ---: | ---: | --- | --- |
| contracts | 25 | 0 | 3 passed, 3 total | 6.568 s |
| domain | 195 | 0 | 7 passed, 7 total | 6.778 s, estimated 9 s |
| mobile | 544 | 8 | 2 skipped, 79 passed, 79 of 81 total | 450.681 s |
| recognition-lab | 510 | 9 | 23 passed, 23 total | 493.825 s, estimated 518 s |

Total:1274 passed/17 skipped (1291 total). Earlier focused
runs overlap these totals. 8 mobile tests in two opt-in PostgreSQL suites
were skipped; 9 recognition-lab host filesystem-capability tests were
skipped on this host. Existing React act/VirtualizedList console notices remain;
they are not zero-warning lint failures. No skipped test is counted as a pass.
`npm run mobile:doctor` passed21/21, exit0.
`npm exec --workspace @retail/mobile --no -- expo install --check` exited0,
dependencies up to date, retaining the existing Expo exclusion.
`npm run mobile:export` exited0: Android1633 modules,29 assets,5.4MB Hermes
bundle; bundling53218ms. Exported entry:
`_expo/static/js/android/entry-96ededfa506b8a1b4aac301370fef6a5.hbc`.
Doctor/dependencies/export were not repeated for test-expectation-only changes;
the later SQL mapping correction is outside the mobile bundle. Logs are in the
local temporary directory as
`cosi-m10-final-validate.log`, `cosi-m10-doctor.log`,
`cosi-m10-dependencies.log`, `cosi-m10-android-export.log`.
Export is a source bundle; it does not produce/install an APK or prove native UI.
No development `expo start`, phone, camera, Docker/Postgres, hosted build/spending,
deployment or external contribution was performed.

## Preservation and authorized compatibility exception

Baseline: SHA256 of all 553 tracked/non-ignored untracked files BEFORE M10 edits,
including recognition lab and prepared M10 docs. Original manifest:
`C:\Users\doyew\AppData\Local\Temp\cosi-m10-baseline-20261003.json`, SHA256
`3DEC671B71FA7CFA6977D6EDDC0ACD59E1760477A24BD467CE87990E8C3C4255`.
The original baseline is embedded below for portable coordinator review. Ignored
dependencies, caches, `.expo`/export output, local secrets and Git internals are
excluded. This is a working-tree byte-preservation proof, not a secret scan or
claim of runtime security/phone availability.

Coordinator-authorized exceptions received in this chat: change ONLY three current
full-migration assertions from literal26 to literal27 and append ONLY migration27
to the sales complete schema-history expectation. The fixtures intentionally
upgrade with all current migrations, not a historical26-only registry:

```diff
apps/mobile/__tests__/catalogueLookup.test.ts:223
- expect(openDatabase(legacy.adapter).schemaVersion).toBe(26);
+ expect(openDatabase(legacy.adapter).schemaVersion).toBe(27);
apps/mobile/__tests__/m9SyncIntegration.test.tsx:143,226 (two expressions)
- expect(openDatabase(reopened, MIGRATIONS).schemaVersion).toBe(26);
+ expect(openDatabase(reopened, MIGRATIONS).schemaVersion).toBe(27);
apps/mobile/__tests__/sales.test.ts:145 (history assertion begins at118)
+ { version: 27, name: 'market_control_and_cache' },
```

These three files are approved exceptions, not claimed unchanged. Reversing only
the explicitly authorized changes restores each original baseline-file SHA256.
No other test
logic/fixtures/sync/privacy/history behavior or M8/M9 runtime was changed.
Migrations1–26 byte proof: removing ONLY the new import and two-line migration27
registration restores original full registry-file SHA256
`94B43E34C9F3CEE256324F20CF1FE1551F6A41DBCD4031178AC4CC224B40D94F`.
The old migration array also matches HEAD text. Every old server migration is
baseline-protected. Final path/hash comparison and new file list follow below.

## Remaining gates and next owner

Main coordinator must audit the stopped actual diff, hashes, contracts/SQL,
negative authority cases and evidence. This implementer does not self-accept M10.
Live SQL/Auth/RLS/privileges and simultaneous races, real approved references/zones,
retention/cohort/privacy/extremes/differencing/collusion/Sybil review, real market
quality, explicit activation and physical Android/offline/TalkBack/large-text/
second-laptop/release checks remain pending. Five synthetic store IDs do not prove
five independent retailers or representative coverage. Offline caches cannot be
instantly recalled; device clock and actual native expiry behavior require review.
No M11/M12 work follows from this source handoff.

Founder steering relayed by coordinator explicitly says DO NOT START M11:
finish only M10 validation/corrections and STOPPED handoff, then hold. No M11
planning/tickets/workflow/source/delegation occurred. The earlier sequential
M11 authorization recorded in workflow approvals is superseded by this steering.

Documentation ceiling: only M10 tickets/workflow, its PROJECT_STATE paragraph and
this handoff. Other accepted ledgers/root tickets/workflows and dirty work remain.
Writer STOPPED at 2026-10-03T06:58:06.052Z; lease null, ownership returned to main coordinator.
All implementation/check/documentation commands ended before report-back.
Coordinator is the sole independent auditor; no other writer/auditor/model was
activated. Do not start M11. The final authorized coordinator message supplies
this handoff path; it does not imply acceptance or automatic audit completion.

## Initial stopped changed-file and byte-preservation map

Original553 files:543 unchanged, ten authorized changed, zero missing.
18 new files comprise17 runtime/test/SQL sources plus this handoff. Baseline
comparison includes all original nonignored Track B/M8/M9/planning files.
Old server migrations, original schemas1–26, manifests/lockfiles/dependencies,
scanner/camera/audio/native/business/M7/M9 runtime and other ledgers remain
byte-preserved relative to that working-tree baseline. The three test-only
compatibility exceptions above are explicitly changed; restoring only approved
expectations reproduces each original hash. Additive registry reconstruction
reproduces its original hash as recorded above. Git branch/HEAD unchanged;
`git diff --check` exit0 (existing CRLF advisory messages only).
Workflow schema validates; acceptance gates remain coordinator-owned/pending.

Only original runtime edits: market exports in contracts/domain, new import +
registration in migration registry, and More market route link. Other original
edits are the three authorized tests and M10 tickets/workflow/PROJECT_STATE.

| Authorized original path | Before SHA256 | Final SHA256 |
| --- | --- | --- |
| `.agents/workflows/m10-market-price-infrastructure.json` | `B8ADE651C8AD59BF1947A1476184F8BE8303B151FCF5CE7983968CF967DBEF5C` | `233D7D1F526867E7A6316E27E397FCE487C418EC9932D5474B643D53D5614F16` |
| `apps/mobile/__tests__/catalogueLookup.test.ts` | `8CBF9E6918C5088E4349CF067D81AD8BFBDECC4D24A2CDE0624D70DD333C30CC` | `50B1B45367BD62D07ECF8CF610640E1460FBD219AAFDEAE1C643F48C796E913F` |
| `apps/mobile/__tests__/m9SyncIntegration.test.tsx` | `C3956FE9AB33A2D60ABAB61F42833973C8C675168A2B3E7A42DBF002BDD7B9AF` | `34DEF65AD753F4A3809AE5575B1613A9B6F3AA9AAA2F9386471F2B4A1AB3F13E` |
| `apps/mobile/__tests__/sales.test.ts` | `451648EA18E642006ADE946B1D8C81EDD54741B5C4C0B47A31C4FDDB7DE9FB65` | `A1690E1E1B548F4BF35F62513B07E63F476D1FCD18B7DF3E298A22E8661DAF89` |
| `apps/mobile/app/(tabs)/more.tsx` | `DC6BEC2D46D2114DC2BA0FB2569FA8EE9FD47B1AD152BEEC85EE5C5C52560F9C` | `F70209F543BB14C658402DB4BC4177D513E7A1EA5E500609F74A31E66C655EFA` |
| `apps/mobile/src/db/migrations.ts` | `94B43E34C9F3CEE256324F20CF1FE1551F6A41DBCD4031178AC4CC224B40D94F` | `945124BFDE3B41A1F468BC03C92F1212C55C9BEE8ECFF05C135BFB79047C47B3` |
| `docs/engineering/M10_MARKET_PRICE_TICKETS.md` | `E88DA97949B3B51FF07DB02038225331A938BD5BEB2D8DF3AF899CA8D339DC4D` | `4C0AFD85CB110DFD5ED566AFC13D6101BE3D63B664C5A8F035AF06EFC4BC6C63` |
| `docs/engineering/PROJECT_STATE.md` | `1D76320DCF46359F8BC00C63F4F9413459BBDAF0B0967A7F57B3A9EBC737EBB7` | `7A8C02184F3EB48AF84882EC3E22D7239889DE672616004CF876B60D5D9EA292` |
| `packages/contracts/src/index.ts` | `25905EE0EA4DE71CDCFD71F652476D35F204DE89BA812CA6003CD203A87C2F1F` | `F4204EC4FE57B0F973BD3B42E9D5912A34FAC807746D9B03B14712391AC1AC38` |
| `packages/domain/src/index.ts` | `25E4ABCBD1133F92868D145917EF9479282CD55BEFD69C73FAFCF9B90ED613AC` | `77445FBCD683D3A3687B2C285680035D5CA7FB1B869B1403FCB630848513E7E8` |

| New runtime/test/SQL source | SHA256 |
| --- | --- |
| `apps/mobile/__tests__/m10MarketCache.test.ts` | `313BCB809CBC99FFDA24E8724C1820724BE497150674D716019BA12107EE0BF7` |
| `apps/mobile/__tests__/m10MarketControl.test.ts` | `F729D266DE59A5165E8EB1BD31EBF1DE5D8EB90A07EA4F663668C9B130E62F78` |
| `apps/mobile/__tests__/m10MarketScreen.test.tsx` | `60D34EB77747F36F52F37AEBAD11BE59341536C642CCF16E20C76433ACD21443` |
| `apps/mobile/app/market-prices.tsx` | `B198150EDF65B7943E1B0A6F2E8F6693FB808442EB2D4C9D921F3525E28B96EC` |
| `apps/mobile/src/market/client.ts` | `4BB435B263256E5609D982ABD8BD7102D4E521E65A8B31EC3263F8BCD83E5133` |
| `apps/mobile/src/market/migration.ts` | `AA92F0B494FB8C693C71ECA943F6A02824830D15BDFE009765EEDF860D726B45` |
| `apps/mobile/src/market/presentation.ts` | `E7D65A1A19CE8B646304D6BF7FEF55A0B1CE9B6328D9128315FC5259439B4F74` |
| `apps/mobile/src/market/storage.ts` | `1F588990BB5560FFC182BCB7FA6ED60D6464BB6947EAAE7E20E4DB6B7C1E061D` |
| `apps/mobile/src/market/transport.ts` | `546F614D3D082F7E2C4566F5D4E857B322487886C61BACFA0E5478C9A26468A7` |
| `apps/mobile/src/screens/market/MarketPricesScreen.tsx` | `B65517186ECE6C20F5D728305D56FA685C66416EE5D7704DA27262ADADD0A23E` |
| `packages/contracts/__tests__/market.test.ts` | `455BB22847D81AEEA16EA3EAE49C9DA8169CFC9E27583D85EB1F5F6FAFF51627` |
| `packages/contracts/src/market.ts` | `64F5925FFA99995FC1D13F5100C51DDD01FAD96A316B6345EC88CA102E7927E4` |
| `packages/domain/__tests__/marketPrices.test.ts` | `F021F5B264BB873D2EED633E6E9E5A67B14F3F718656677EC831A57E5A4C1807` |
| `packages/domain/src/marketPrices.ts` | `F8B173681BE1C8CB76BBCDF8156201E777FB6A913ABEE59F0832BECF6454BFAC` |
| `supabase/migrations/20261003033504_m10_market_source_prototype.sql` | `9BE4A063BAAEDB1A81B173D8A862E6912C4680D3F98EFB76F35138EE475CD091` |
| `supabase/tests/m10_market.sql` | `0861DC410197C513E206FF68F47616063F72EA82A3C79FA7C1F0472453F1CD47` |
| `supabase/tests/m10_market_projection.sql` | `1CD587DF1A7EAAC671B4852F642EA29534D2823F5DB051F1F6C5E90E8D4CD5B7` |

This handoff excludes its own SHA256 to avoid a circular digest; the reviewer
can hash the returned final file independently. Ignored export/dependency/cache/
secret/Git files are outside this proof. Temporary command logs are local evidence
artifacts, not required runtime inputs; these digests identify the stopped logs.

| Command log | SHA256 |
| --- | --- |
| `C:\Users\doyew\AppData\Local\Temp\cosi-m10-initial-full-failed.log` | `1FE7EB84DC49A566C3BD63BA49A2556D4E9F0932278E6510A7FE8819A55F1F60` |
| `C:\Users\doyew\AppData\Local\Temp\cosi-m10-sales-correction.log` | `5B9CD93416781DA1E55240C3570721C886FF9481062CE8F3FA719E7BF6F38870` |
| `C:\Users\doyew\AppData\Local\Temp\cosi-m10-final-validate.log` | `BBC80A62DE0D972FF18E1478883DDB9A6AB3EFFAF5D0EDB70FFB04038C4D90CF` |
| `C:\Users\doyew\AppData\Local\Temp\cosi-m10-doctor.log` | `2D7AFF048B41888F86FCC3B1E746FFD86DF8E0035832F254505106C4A6B71FC4` |
| `C:\Users\doyew\AppData\Local\Temp\cosi-m10-dependencies.log` | `0379DB0E67F3E2D25AD266D2ED164F94383164514BE300F84D5758558FB9A0E7` |
| `C:\Users\doyew\AppData\Local\Temp\cosi-m10-android-export.log` | `CADB8D8980A0AE96DF427821640082C7F0B0A7A1C5F5D7C5094E72CCB3FD88A1` |

## Original 553-file byte baseline

<details>
<summary>Original path/SHA256 manifest (before all M10 edits)</summary>

```json
[
  {
    "path": ".agents/AGENTS.md",
    "sha256": "F7A0C0E110BD296C439787A91398D9A33E41EA66B35C675402EDA39DB2387FAC"
  },
  {
    "path": ".agents/contexts/app-flow.md",
    "sha256": "F1DE1C9654A714F5D0111DFE92E9AF1172643A7CC9C06B0DA8A20005F1F9E8DD"
  },
  {
    "path": ".agents/contexts/project-context.md",
    "sha256": "3AE33F892CC39893B893B3B51EEF99846EB8332B72C040B816E4D0F303E471D9"
  },
  {
    "path": ".agents/contexts/stack-context.md",
    "sha256": "AC2BA3E3F50638236085D9C2802D13FC52C73511691D51F350C4842E0E46D7D4"
  },
  {
    "path": ".agents/schemas/workflow-index.schema.json",
    "sha256": "06D955538E9A9239022F040924BE07C372D0652548BD8A871818FF0B08164887"
  },
  {
    "path": ".agents/schemas/workflow-state.schema.json",
    "sha256": "05D95DD4E138FDA5D8C099A6FF5672379B549043223BD8F36318D80C9362E427"
  },
  {
    "path": ".agents/workflows/index.json",
    "sha256": "4968C9166D797D24215B78A954E864E5C9F53D445D468EC9948DD181B96A084F"
  },
  {
    "path": ".agents/workflows/m1-domain-local-database.json",
    "sha256": "F2E36C5E32BE0177D9557593EA0FD607192AA06A0B6CA96B46140BC006DFCB34"
  },
  {
    "path": ".agents/workflows/m10-market-price-infrastructure.json",
    "sha256": "B8ADE651C8AD59BF1947A1476184F8BE8303B151FCF5CE7983968CF967DBEF5C"
  },
  {
    "path": ".agents/workflows/m2-catalogue-package-units.json",
    "sha256": "3008344A8AFF772B7F910229BE44285A111BC3E545FFA35533FD596C0AD49D90"
  },
  {
    "path": ".agents/workflows/m3-sales.json",
    "sha256": "3DD861A02FBA2E208A84D46BB05C77DD3B9F50577993299A39FC049D3BF85115"
  },
  {
    "path": ".agents/workflows/m4-restocking-costing.json",
    "sha256": "6C69BCB3BCA4B87DB50FA6192150DF0EE9A566DC439976D8BF4E6FDA7254D97A"
  },
  {
    "path": ".agents/workflows/m5-inventory-reconciliation.json",
    "sha256": "67A92366E62779FE9FF1D2B14CBF2219E158782A4EFB33BE69572106C15FB98E"
  },
  {
    "path": ".agents/workflows/m6-expenses-business-summary.json",
    "sha256": "55679F0604F3CE2DA65B3859FC4633D68FF7CC9272334C081E5D3BE488215550"
  },
  {
    "path": ".agents/workflows/m7-offline-sync.json",
    "sha256": "862D7CB252D0A9E5587311593847DAB908938D6351E71A7DF381808B6E3C2827"
  },
  {
    "path": ".agents/workflows/m8-unified-scanner.json",
    "sha256": "F3CB779A068474629D047DC6AD031A95B690734CE3E394778F7575A17EA93DC5"
  },
  {
    "path": ".agents/workflows/m9-personal-price-intelligence.json",
    "sha256": "201654688202AF3CCFBFBD8C79D654FB9C4EDD034BB119ABB0DA75B1A7629725"
  },
  {
    "path": ".agents/workflows/recognition-track-b.json",
    "sha256": "464BEBC426A48A127652817A09980F19701A850A897BF541B836A8D697FB3162"
  },
  {
    "path": ".editorconfig",
    "sha256": "A6B98EA7CB6D61ED8D430DD0DFFA46C87012B5CF859D4CE7207898954951FDCD"
  },
  {
    "path": ".gitattributes",
    "sha256": "2A7A5DAAAE1CAD7A41ACC82B6BFCA78869DED5CD8D50FAD26969DDCCA428181A"
  },
  {
    "path": ".github/workflows/validate.yml",
    "sha256": "55BFC0B6D6C8C98CEA12215F428715206A7329448F9285D946961002DD9BD1E4"
  },
  {
    "path": ".gitignore",
    "sha256": "9486DED9DFC6FF0812A92C7470855ACB95EF6C46EF497A9BF56B3C95FBA1E4AF"
  },
  {
    "path": ".node-version",
    "sha256": "73FB1B615E2043A933BE1C0895CDE4358036ACC28D785692509B822AA53C761F"
  },
  {
    "path": ".npmrc",
    "sha256": "3B88D1057ADD6F92EC23DC22DD017E312DED13A042DEB0BA6F08BAD85D936456"
  },
  {
    "path": "AGENTS.md",
    "sha256": "F469794EB1DB40DFE704AFD9DE8DBF7D46D65D91976002F6E0012F02DD9E27B9"
  },
  {
    "path": "apps/mobile/__tests__/barcodeCamera.test.tsx",
    "sha256": "428B5A0B97E9F7753278136CA0668ADBF3660F93602384B39E58A35DFAA3620A"
  },
  {
    "path": "apps/mobile/__tests__/catalogue.test.ts",
    "sha256": "0C17A0B60CA6BAFB9587142AEDA019135A0125C8A22F2B507D210D25D3E61E50"
  },
  {
    "path": "apps/mobile/__tests__/catalogueIdentity.test.ts",
    "sha256": "CCD215B8B87E25985468B4B2E304A735D86A1DAFAAA35984550E01BAEC70B337"
  },
  {
    "path": "apps/mobile/__tests__/catalogueLifecycle.test.ts",
    "sha256": "7B38EAE8E8F23077B61587C081211DD1F81F23AF6A1DCC0FE885EC981DD424C8"
  },
  {
    "path": "apps/mobile/__tests__/catalogueLookup.test.ts",
    "sha256": "8CBF9E6918C5088E4349CF067D81AD8BFBDECC4D24A2CDE0624D70DD333C30CC"
  },
  {
    "path": "apps/mobile/__tests__/catalogueLookupUi.test.tsx",
    "sha256": "DD8BF91C4A86246D7D0C05E2EA3B3D428C3853D85FD93F08285739954CBDE68A"
  },
  {
    "path": "apps/mobile/__tests__/cataloguePackages.test.ts",
    "sha256": "C3DBABE1EF10513DDAFB307437D0D749C205497F80C6AEEE9CE23F7F3832527C"
  },
  {
    "path": "apps/mobile/__tests__/catalogueSupport.ts",
    "sha256": "55525EB839B6B9556BB8A1B2D0ED92641D1F765F6A1C8BB34F545CC500F3A388"
  },
  {
    "path": "apps/mobile/__tests__/databaseStartup.test.ts",
    "sha256": "5EAF512C2F99D03F03CE8E6DA72F564F72797D29611A7B6ECC2CFF99B68EEDE7"
  },
  {
    "path": "apps/mobile/__tests__/db.test.ts",
    "sha256": "ECA4EA752256D79BB53C67748B691F0CF15B9F307D7CAFF73724576F086811D7"
  },
  {
    "path": "apps/mobile/__tests__/displayMoney.test.ts",
    "sha256": "DA1135480290CD35DB04771A4C35818B819DAB1FBE70CFE8040D09706846E2AD"
  },
  {
    "path": "apps/mobile/__tests__/domain-package.test.ts",
    "sha256": "97701852E50319A146A912E92A925EBA8652EB18650A2ED913004F2F2CBC8D02"
  },
  {
    "path": "apps/mobile/__tests__/environment.test.ts",
    "sha256": "9B6F53EFFD45F98A3EB0B6F420F9A0121F663518905D23B7DB32D88E652C7680"
  },
  {
    "path": "apps/mobile/__tests__/m5Adjustments.test.ts",
    "sha256": "AF626B03E3F019B877BF26B205D9FDB9101B2A6DDF22E1433B2C074EA747A094"
  },
  {
    "path": "apps/mobile/__tests__/m5AdjustmentScreen.test.tsx",
    "sha256": "C22395550DB80918F61BEFC59C3ABEDFF2B50769457ABAA9508F40408A97069C"
  },
  {
    "path": "apps/mobile/__tests__/m5Attention.test.ts",
    "sha256": "DE59884EC05CCAC13B90CC3791D420E62EEE513216C720DBA3CFCA7BEF1F218A"
  },
  {
    "path": "apps/mobile/__tests__/m5AttentionScreen.test.tsx",
    "sha256": "A25BF92B44492C973C9D4342F4D74E8740C0ADEC688B78C68D79A443416B9BAE"
  },
  {
    "path": "apps/mobile/__tests__/m5AuditCorrections.test.ts",
    "sha256": "E5FBCAA414F1DB99751F8F9A54F5F0ACF5EAD797EC16B70E7EF706B4E0D83A3D"
  },
  {
    "path": "apps/mobile/__tests__/m5Batch.test.ts",
    "sha256": "549F659AFCEBD4647AAA60C7D9883AB634251AA7CE7E2A0BF5A2C93BB5662601"
  },
  {
    "path": "apps/mobile/__tests__/m5Classification.test.ts",
    "sha256": "F18E97D71495729AE9530B2A057BD937E33A2C55E75ADE89E11C21B9C7FE8836"
  },
  {
    "path": "apps/mobile/__tests__/m5GuidedChecks.test.ts",
    "sha256": "65D185C6EF12F392DB1937FE7F75DB1CEFC440E146096C9C5C4A12AB4F247D9C"
  },
  {
    "path": "apps/mobile/__tests__/m5GuidedChecksScreen.test.tsx",
    "sha256": "8909A4C50B80CE4DABA77D0501CDB10E131B26700A902E7F34FA7C4B6B007EC2"
  },
  {
    "path": "apps/mobile/__tests__/m5InventoryReview.test.tsx",
    "sha256": "AFA52612AB88062770C7C7C0BD1C44162F0A23809155EA2752A8D328850B485F"
  },
  {
    "path": "apps/mobile/__tests__/m5Reconciliation.test.ts",
    "sha256": "83AD21A401B9E7E15BBECAC5DC91D0AF70E95917BE345BCF58F291062D3A6E0B"
  },
  {
    "path": "apps/mobile/__tests__/m5ReconciliationCorrections.test.tsx",
    "sha256": "9611EE8157820AFB62BD1F3320F86537799348D276CB1F7FD6D139EA7F365DAF"
  },
  {
    "path": "apps/mobile/__tests__/m5ReconciliationScreen.test.tsx",
    "sha256": "C6C5E2A84F6D52BE295C31D468CB2962710E04CFF6416B08EE51211EE794E2AE"
  },
  {
    "path": "apps/mobile/__tests__/m5ReorderThreshold.test.tsx",
    "sha256": "03519D6E6FA90D410CB7DCB2E77838D98A847B431F7D85C9A6D457E5D13462BC"
  },
  {
    "path": "apps/mobile/__tests__/m6BusinessSummary.test.ts",
    "sha256": "1E6983F79CA781345AC6F597DC966520684DC9106DF1CC66A8CB6A7FA7486D07"
  },
  {
    "path": "apps/mobile/__tests__/m6BusinessSummaryScreen.test.tsx",
    "sha256": "573177D024A5A7064E9ECC1D794121CCB813DB32FC88786753942FE6C67A24BE"
  },
  {
    "path": "apps/mobile/__tests__/m6Expenses.test.ts",
    "sha256": "CEBC06F2A1E0F1A9753F939B1877ED8E6ADD2D0CC7113EA5BDA83E319FBD5C30"
  },
  {
    "path": "apps/mobile/__tests__/m6ExpenseScreens.test.tsx",
    "sha256": "A876C64A09E16B4B04964EF6DCBC171AC9515AB1E7CF75664D26D81E1F1E8C98"
  },
  {
    "path": "apps/mobile/__tests__/m6Home.test.tsx",
    "sha256": "D94EFB02ABC757EBFCF22CCA6E64E62D859FACB769C6C6315D663CA24CBB4DC5"
  },
  {
    "path": "apps/mobile/__tests__/m6Withdrawals.test.ts",
    "sha256": "3299CC88FD185282F70B5222A82BD7BAF1C0913743B19BA6B6D98EA459898F11"
  },
  {
    "path": "apps/mobile/__tests__/m6WithdrawalScreens.test.tsx",
    "sha256": "7D8E83EBB3C3EB89F1145DFB67625E76BADD8D77D6D73258FE0B9D476785EBA4"
  },
  {
    "path": "apps/mobile/__tests__/m7ConcurrentCosting.test.ts",
    "sha256": "74C62B6C762FDD5202D53B54F59B7368A8243E12F9AAECB9F36AC8A6B0445046"
  },
  {
    "path": "apps/mobile/__tests__/m7M5PullSemantics.test.ts",
    "sha256": "18B1734EA714A5B6ECB2678DF372C7B119BDC1CEE00D3139EAA807CF92237C9A"
  },
  {
    "path": "apps/mobile/__tests__/m7Pilot.test.ts",
    "sha256": "C8BD9B4A0251AE64B8C314B75A0812CF9C914C223A6E789B1A5F18FF181875D6"
  },
  {
    "path": "apps/mobile/__tests__/m7PullReferences.test.ts",
    "sha256": "2C7A272D319DC0C99D7AA85DB72DCC9616CBFD92275723B0949385D72E5F4F46"
  },
  {
    "path": "apps/mobile/__tests__/m7PurchasePull.test.ts",
    "sha256": "81CFF7F7B4E093E0EAE0138D47AF6327E050187EB2B21C4365721506442D212D"
  },
  {
    "path": "apps/mobile/__tests__/m7SalePull.test.ts",
    "sha256": "B12D279AB327002BDF6BF813780398FE7F611828F0C7D92700C882E49A5960D2"
  },
  {
    "path": "apps/mobile/__tests__/m7Sync.test.ts",
    "sha256": "C67FC47BE6975641C55C5195E4E761205AE7EC4FE05FAD3CE2D63BEF4CCFBE01"
  },
  {
    "path": "apps/mobile/__tests__/m9PersonalPriceChanges.test.tsx",
    "sha256": "04B7686907F61C0BC9CB5A77BE8880ACF01BDAA20699F04258C801A6ADE3EB46"
  },
  {
    "path": "apps/mobile/__tests__/m9PersonalPriceClient.test.ts",
    "sha256": "D9FD84F0CC7A9CCFC3524A2AD9A2DAA5A4E85340C6091C4FFB2B75EEF69D4F7A"
  },
  {
    "path": "apps/mobile/__tests__/m9ProductDetail.test.tsx",
    "sha256": "0EBFB02EE01E530CBB7C7D18C08104EA7D49D084EF48871D17D381D7BBBCA146"
  },
  {
    "path": "apps/mobile/__tests__/m9SyncIntegration.test.tsx",
    "sha256": "C3956FE9AB33A2D60ABAB61F42833973C8C675168A2B3E7A42DBF002BDD7B9AF"
  },
  {
    "path": "apps/mobile/__tests__/migrationHistory.test.ts",
    "sha256": "3E95F43B146EC087FA9CC70B040A1A3484066B35E85A57076F8091F9E381035B"
  },
  {
    "path": "apps/mobile/__tests__/mobileIds.test.ts",
    "sha256": "BE31878BA006AA436A118BECD39A414069F4397126059884FA2AE880D8C80BB7"
  },
  {
    "path": "apps/mobile/__tests__/nativePhotoFiles.test.ts",
    "sha256": "AC65B439EBA29EB2D9C0B0E85D6E3A6F7206790AAA8A2D230BD663AD26603414"
  },
  {
    "path": "apps/mobile/__tests__/navigation.test.tsx",
    "sha256": "0951BF7EE6CDF65E10EDB63C63DB670A84FEEDE966F12529C0FF4897FBB22931"
  },
  {
    "path": "apps/mobile/__tests__/priceFirstSale.test.tsx",
    "sha256": "A1C790986E7A90BC461C61B516C8E310E5641B5778795CB47F2D5D71B091BA91"
  },
  {
    "path": "apps/mobile/__tests__/productPhotoCamera.test.tsx",
    "sha256": "FC7428EA31E328C65470575BDBE825565F26D1A8CD001D7B54E544AC5655A451"
  },
  {
    "path": "apps/mobile/__tests__/productPhotoPresentation.test.tsx",
    "sha256": "11D0141C97A182D48853E2DC58AC66C0919815C392D0CB202A730DE36A139DE9"
  },
  {
    "path": "apps/mobile/__tests__/productPhotos.test.ts",
    "sha256": "C9C7D74197C6A9090F4343FD6F22434842F55FA4694E4C2B968029CC8EA38148"
  },
  {
    "path": "apps/mobile/__tests__/productPhotoUi.test.tsx",
    "sha256": "0A40709F9EBB8E5C507D17B4B9D932BFB224518764EB16ADA1A05741D82A5A80"
  },
  {
    "path": "apps/mobile/__tests__/products.test.tsx",
    "sha256": "16B26D0AFFE43CF4A4B8DBADB3B3EE212E6D69B3A97156EA78C09D68362F16A8"
  },
  {
    "path": "apps/mobile/__tests__/provisionStoreContext.test.ts",
    "sha256": "62A24597050C074A748B31B303856CCBE454F5C749B13E694E34B4D23396AA34"
  },
  {
    "path": "apps/mobile/__tests__/purchases.test.ts",
    "sha256": "489ECDB82282F81541C47F7CDC52B8B60D88806B91E2D77D5F80DBFD438FDBAE"
  },
  {
    "path": "apps/mobile/__tests__/repositories.test.ts",
    "sha256": "8AC209D23FCA4FA38D3ED4C1A76991A922ABA3AF1F51E172EA9EAA6C6CB0A1B0"
  },
  {
    "path": "apps/mobile/__tests__/restock.test.tsx",
    "sha256": "9B34AA9BDC5ABEC0D122842D62FB7FB8BD858BBB6ACF47F36944C187DF264F02"
  },
  {
    "path": "apps/mobile/__tests__/saleDraft.test.ts",
    "sha256": "25C76E2FEF18BCF104F095DB71F1E5D823877049E305F844A62FE67901355C7B"
  },
  {
    "path": "apps/mobile/__tests__/sales.test.ts",
    "sha256": "451648EA18E642006ADE946B1D8C81EDD54741B5C4C0B47A31C4FDDB7DE9FB65"
  },
  {
    "path": "apps/mobile/__tests__/scannerActivity.test.tsx",
    "sha256": "8ED047A41F6747B321E88372C7E256774ED55D87B674A779E5F13A0ABE2B46A1"
  },
  {
    "path": "apps/mobile/__tests__/scannerCatalogue.test.ts",
    "sha256": "74E5B0EEE397088DDA25873A804BFA41311A0DC3913028CA6FBA66A6DD97C554"
  },
  {
    "path": "apps/mobile/__tests__/scannerFeedback.test.tsx",
    "sha256": "0BE6312D6CED55D21D42C86F4718E4276D47BBEF8D9D9AEEBA937C1863531D6C"
  },
  {
    "path": "apps/mobile/__tests__/scannerPanel.test.tsx",
    "sha256": "32CE6BF8C2A40255AE57B39828BF510C6BD781E83FFE910B18B2A3F1D1E27071"
  },
  {
    "path": "apps/mobile/__tests__/scannerSale.test.tsx",
    "sha256": "9C97631AF8459C1DCFBD06F1E5F66FB78ECF85F6CC56C9976BC13C99051559D0"
  },
  {
    "path": "apps/mobile/__tests__/scannerSync.postgres.test.ts",
    "sha256": "B67420AA6BC0E75EDA627A214737A538D9A1AD6872167F52EC9C16390B8372D6"
  },
  {
    "path": "apps/mobile/__tests__/scannerVerification.test.ts",
    "sha256": "12A5B82D6F8AE4BF49BF9279DFA05E5BC40110CFECC7300AFB604BD85B5AD4F4"
  },
  {
    "path": "apps/mobile/__tests__/scannerVerificationRoute.test.tsx",
    "sha256": "27669F544AB3CD0B22C7D90F213EFD74E79E58E5051FD80334B773325EF0A0DA"
  },
  {
    "path": "apps/mobile/__tests__/scannerWorker.postgres.test.ts",
    "sha256": "5CD4E19D6395F3B7B5F86C90F59F26C5119CDBFDB79D0B7C962CA088D2EE117F"
  },
  {
    "path": "apps/mobile/__tests__/scannerWorker.test.ts",
    "sha256": "F138B57FA3F3DD9C186E3E0DECFCB3F29E361DE3B2EB37EFC71A6AEBE9EC3A4C"
  },
  {
    "path": "apps/mobile/__tests__/scannerZoomSale.test.tsx",
    "sha256": "98B42FCF8440AE0C02F16C549AE8EDE1AA57649F3739F4D232316EE8F1D7A4BF"
  },
  {
    "path": "apps/mobile/__tests__/scanning.test.ts",
    "sha256": "CA138E750982A7D98C14D542E50E1259A19A97C7C49F7F0194F1A3F27E318BB1"
  },
  {
    "path": "apps/mobile/__tests__/sell.test.tsx",
    "sha256": "AA399C8359EEE92C943BF6843D868EB1243C9C7C687D03850FAB19045939349A"
  },
  {
    "path": "apps/mobile/__tests__/shell.test.tsx",
    "sha256": "072E573387AD110748A02E3ED65CB0B19E4C7C40B3D6EEAED011E73E19A41FBF"
  },
  {
    "path": "apps/mobile/__tests__/startupShell.test.tsx",
    "sha256": "D3CA77F5FF008EB7FD5CFD443009F4337FEF5074BC1793A7A32F4E8E9E80B79B"
  },
  {
    "path": "apps/mobile/__tests__/theme.test.ts",
    "sha256": "EE53AE5A1C22BEB9F78F016B03FDFE4A0F89CF845ED81C7AA03E14624DF42737"
  },
  {
    "path": "apps/mobile/__tests__/transaction.test.ts",
    "sha256": "9C00D88E5B1C9291CD295FC22965A89A75AEB6337DF888EB3EC18F5F7275ED6D"
  },
  {
    "path": "apps/mobile/__tests__/usePreviewZoom.test.tsx",
    "sha256": "B69444EF72BF99C2D0089B17061F7FD1291B9539ABDC69948418FDCABFE64050"
  },
  {
    "path": "apps/mobile/.env.example",
    "sha256": "72BB4F8DB96067087E59DDE9CC4511128B014007F0F44E7552C87811D35346AE"
  },
  {
    "path": "apps/mobile/app.config.ts",
    "sha256": "B3981D2352CB2E54A35638855C3B4C482E8736CD8D647FB9560DDDC71C61FFD1"
  },
  {
    "path": "apps/mobile/app/_layout.tsx",
    "sha256": "91F8934A251F74202E8DF90E97F7B54EF339C5788738F965AD66ADCEA77DB53D"
  },
  {
    "path": "apps/mobile/app/(tabs)/_layout.tsx",
    "sha256": "15E34551A34E8669324B44BA67C4EBE22879A332CEC6BD878A8A5820343B8C9C"
  },
  {
    "path": "apps/mobile/app/(tabs)/more.tsx",
    "sha256": "DC6BEC2D46D2114DC2BA0FB2569FA8EE9FD47B1AD152BEEC85EE5C5C52560F9C"
  },
  {
    "path": "apps/mobile/app/(tabs)/products/_layout.tsx",
    "sha256": "DA29C35B21FBB5DC2D8D4864DE53BF805B41AD3C6CEF94382AD87ADCB660FE23"
  },
  {
    "path": "apps/mobile/app/(tabs)/products/[id]/index.tsx",
    "sha256": "2B62E2B00022FA153A5CB8E465A0DFA1FDDDC7217C4BF4051888663FEBF84BA8"
  },
  {
    "path": "apps/mobile/app/(tabs)/products/[id]/packages/[packageId].tsx",
    "sha256": "A26CF8D0397505BCFDC5D8AB9365687817AF705A76668D3C355F0ECA23DCA782"
  },
  {
    "path": "apps/mobile/app/(tabs)/products/[id]/packages/new.tsx",
    "sha256": "642FE7211864E20F253F564B44A3511BEED54EE4CA7745ECC03CDF3D5D2403C4"
  },
  {
    "path": "apps/mobile/app/(tabs)/products/index.tsx",
    "sha256": "7A2DC6C797CB6E696AF75D3FC99D2283C7AA531F94D985C31172598767608FA5"
  },
  {
    "path": "apps/mobile/app/(tabs)/products/new.tsx",
    "sha256": "A133194096D65628EE1A74704B262A3C4F947495E4057CA6A643C490292D8D49"
  },
  {
    "path": "apps/mobile/app/(tabs)/products/price-changes.tsx",
    "sha256": "7CBFC70FF2B14258F1CE43BDC627F3135E5210AC64642440D522CCBD2BECD9C8"
  },
  {
    "path": "apps/mobile/app/(tabs)/today.tsx",
    "sha256": "8D785CB614B5A6AFFA91C80E0C4B27C65D16A97CA5651F2EDEAEE4B41547E7B5"
  },
  {
    "path": "apps/mobile/app/adjustment.tsx",
    "sha256": "6FE14E0BD849E3BEA23998B4DAAE62DB18BDB7E1FF24D936DDCFCFDC875D37AA"
  },
  {
    "path": "apps/mobile/app/attention.tsx",
    "sha256": "4E00C212FB9EDB13813D25CEB2B868FFABE87BFF4DBE3DFBBA1A40B02ACEF470"
  },
  {
    "path": "apps/mobile/app/batch-review.tsx",
    "sha256": "357874DF8B69673EA6259EFEF49325642FB032FC8FCF39B55BB481C139C66ED4"
  },
  {
    "path": "apps/mobile/app/expense.tsx",
    "sha256": "5274F8F1DDBF5957AA797B61A8C4A3295E23D6891D915FE9B5DCA9CFC563CD9A"
  },
  {
    "path": "apps/mobile/app/expenses.tsx",
    "sha256": "DC828AEDE42931BFE12F1CF41919A0B58243274776A19ADA1FAF1C6509926656"
  },
  {
    "path": "apps/mobile/app/guided-checks.tsx",
    "sha256": "20D11F55E5149022C388F0338ECF3C7F3275E0F40CB9C652036B839FF5641BEA"
  },
  {
    "path": "apps/mobile/app/index.tsx",
    "sha256": "F76483C61D2DB85625B0B78C3E8B76F70978D48608DCDC950ECDA458F6D72836"
  },
  {
    "path": "apps/mobile/app/purchase-history.tsx",
    "sha256": "49A24782FA3FDEDDE242706D05BF2B63FC05202BB3595BF4ADC60FA0ABBFEF88"
  },
  {
    "path": "apps/mobile/app/purchases/[id].tsx",
    "sha256": "C1529AACB48DE9116D9A0AF583597CE9ED2C0D245A3C23D82DEC1A07D8DB4C8A"
  },
  {
    "path": "apps/mobile/app/reconciliation.tsx",
    "sha256": "7EB7FEE78EC5BE627882684D2796E2150D23484A5904F9BB21251DB01946DC1B"
  },
  {
    "path": "apps/mobile/app/restock.tsx",
    "sha256": "6822A665009EFCF388D10A3E59D13625D6487C17138975B8E8B1DEF86925D2D9"
  },
  {
    "path": "apps/mobile/app/sell.tsx",
    "sha256": "81DB2DEB0B843D9B4389BF2D9029B09E4A694FA1D77A025DFB83E4E30787215E"
  },
  {
    "path": "apps/mobile/app/summary.tsx",
    "sha256": "D4D71DF773FA7003226D72CAEFFFB5B446910FA2FE657821488C14246E82E467"
  },
  {
    "path": "apps/mobile/app/sync.tsx",
    "sha256": "EB362A0A0C00D5A4C31F39AD5F78DFBFAD7FA049E1BD7EB2378546303949369F"
  },
  {
    "path": "apps/mobile/app/withdrawal.tsx",
    "sha256": "5BD4011E23B8BF7A0AD0C560431A2D61A7EB158F72E4CF86E7357B6DD6E28120"
  },
  {
    "path": "apps/mobile/app/withdrawals.tsx",
    "sha256": "BEAEA95AC2879B9071814FC1D0A661F0B1956CD373E16BEA18755A93DD1BCD66"
  },
  {
    "path": "apps/mobile/eas.json",
    "sha256": "7DB61F778EB5CD99587E6F96D20819C0B4411BB7054D5912337400A33E8DCE48"
  },
  {
    "path": "apps/mobile/eslint.config.js",
    "sha256": "AAA671E71B66F0C3FE94854D7D3B7EB671800F0A338452DCFC3B83630033E2B8"
  },
  {
    "path": "apps/mobile/jest.config.cjs",
    "sha256": "CA1AE622D81A92E0750F5BBCAE0F1923C87F66C741BAA127F18E558EBB94D57D"
  },
  {
    "path": "apps/mobile/package.json",
    "sha256": "BE0C891AFD5B840403C53EEFA9A404526E576F281F72ED5C34F4FEF854EB532A"
  },
  {
    "path": "apps/mobile/src/catalogue/CatalogueContext.tsx",
    "sha256": "40A8949340428D397953CF1E3316599F1A5240A148A5B6E5FA175DB4B992CEE1"
  },
  {
    "path": "apps/mobile/src/catalogue/client.ts",
    "sha256": "25F3A7BB3B26C4BDC718D3586E65252AB83562715764320C4BDBFC29134C0295"
  },
  {
    "path": "apps/mobile/src/catalogue/createTemporaryProduct.ts",
    "sha256": "CE27B4BF6FE9B47B93E6E664CC3FF85026AAB5A9D41359151ED49C9E2100BAC3"
  },
  {
    "path": "apps/mobile/src/catalogue/lookup/provider.ts",
    "sha256": "FC0D38A67FD149167BFD47A80E5F607E49EC2FF204D7A23F14FFD7173FA9AE53"
  },
  {
    "path": "apps/mobile/src/catalogue/lookup/SuggestionCard.tsx",
    "sha256": "114120981A58515D67BF4B2BD817DAB34113DA596D429E39646D8FC62FB442B1"
  },
  {
    "path": "apps/mobile/src/catalogue/lookup/suggestions.ts",
    "sha256": "21B2F9DDCCE14501D8215136C005B08740080D48994F0FF5ECCF6032FD581CAF"
  },
  {
    "path": "apps/mobile/src/catalogue/manageLifecycle.ts",
    "sha256": "CC550ABECD94502880EDC287C41F15605564F04F4F50A027891150C153CCADFD"
  },
  {
    "path": "apps/mobile/src/catalogue/managePackages.ts",
    "sha256": "9A8D3555EDAE8310A4C71BB037B8C8889048EA14C4122038B198441B506A2E12"
  },
  {
    "path": "apps/mobile/src/catalogue/updateProductIdentity.ts",
    "sha256": "1AD726C8B0A9E059D40FB2A5974DAE2158D0023CD6E44A63196AB08DA1652FF0"
  },
  {
    "path": "apps/mobile/src/catalogue/updateReorderLevel.ts",
    "sha256": "A0A864CF8B43DDF1B7B62825E64A1B42185E07D7D87D211EB51C5DFF6F7FA01C"
  },
  {
    "path": "apps/mobile/src/config/environment.ts",
    "sha256": "DB0ABCDE768B3AC3AE19A462457C8285026EEB5F061BF70360AC16CAEA849F7E"
  },
  {
    "path": "apps/mobile/src/crypto/mobileIds.ts",
    "sha256": "9D157347AAAB291D9663155919E3AD21BEB4836FFA5F036BFE4E6C93CD781969"
  },
  {
    "path": "apps/mobile/src/db/adapter.ts",
    "sha256": "3612849600CB5923E646E322956A2FCA4520B9511B897C89BB4CF88AE57148B7"
  },
  {
    "path": "apps/mobile/src/db/DatabaseContext.tsx",
    "sha256": "7F9E113B8852B339D781D42CF65C198ED90ECD9C85233027997D3B8B2AF1F83C"
  },
  {
    "path": "apps/mobile/src/db/errors.ts",
    "sha256": "0A5CBB98EE8AD666BB9CB0ABEEDE90DE7138F96D5C93EC2C1C6C1555C3D884FF"
  },
  {
    "path": "apps/mobile/src/db/expoSqliteAdapter.ts",
    "sha256": "35B85B7E6ADD681E1119F58CF1C7B232CCA3D552FFD65165C7DA98448579E755"
  },
  {
    "path": "apps/mobile/src/db/index.ts",
    "sha256": "70981024644AFDE71DC4AE923FA052B4A3C00290FEF78E52532E674A8BAA69C4"
  },
  {
    "path": "apps/mobile/src/db/initialize.ts",
    "sha256": "74ACB553D6A7EE36F663A09D1B19B2B77D40074E2749E769FE25EA7324E5EE89"
  },
  {
    "path": "apps/mobile/src/db/migrations.ts",
    "sha256": "94B43E34C9F3CEE256324F20CF1FE1551F6A41DBCD4031178AC4CC224B40D94F"
  },
  {
    "path": "apps/mobile/src/db/nodeTestAdapter.ts",
    "sha256": "CE9925A46851ACB3442C702A1B085FF295D3A69E93196AE75E8CEB344EAB9ED3"
  },
  {
    "path": "apps/mobile/src/db/repositories/adjustments.ts",
    "sha256": "1FF90B7E3223808D05DC25F351C5E2D9B1089050394D93B342A0EAC54D97B39B"
  },
  {
    "path": "apps/mobile/src/db/repositories/attention.ts",
    "sha256": "94C358F1CFBC9D0E0A5605E461D8AE1C411681D962D66B617AF16D06BB6675E2"
  },
  {
    "path": "apps/mobile/src/db/repositories/batchTracking.ts",
    "sha256": "8C4A8DAD854D7B8E2D48DD567C33ADDC2104F998DA9807385BCE137406A9E123"
  },
  {
    "path": "apps/mobile/src/db/repositories/common.ts",
    "sha256": "D40DD7F351AB0A3F29A9382CE17BAAF668E8B64E61C52B2C2D3FA30B2B15398D"
  },
  {
    "path": "apps/mobile/src/db/repositories/costing.ts",
    "sha256": "9400E3D1A3AFCA77C9D534A0E95DBB5FEA5140379FA307D852AE5DDD35DAA1AF"
  },
  {
    "path": "apps/mobile/src/db/repositories/customerAccounts.ts",
    "sha256": "78034F562F81B0B4DFC997DCCE5E288D96CDA2B12A7818C7A7CE38E848132306"
  },
  {
    "path": "apps/mobile/src/db/repositories/devices.ts",
    "sha256": "AB38F2C51D27D6D160309899C858975FB341349C8D351066B8159FEAE6CFE871"
  },
  {
    "path": "apps/mobile/src/db/repositories/expenses.ts",
    "sha256": "422249BFE2BD7ACB6A8D6C975F8FA700BFB9893A98E7CD280EC83E5F8C4B53A2"
  },
  {
    "path": "apps/mobile/src/db/repositories/index.ts",
    "sha256": "81955AFDB573351B3FA8E96AFF7F46E7470534B076073D029AE87C9F8353E2F4"
  },
  {
    "path": "apps/mobile/src/db/repositories/inventoryChecks.ts",
    "sha256": "1D4649C4591DF18A60C9744438D7DF9A3CE7598966D7F84B99C10F64622AE5BC"
  },
  {
    "path": "apps/mobile/src/db/repositories/inventoryEvents.ts",
    "sha256": "C62CE5EA865F9C525140B62433D280BC71B1BAA9EEC06C04D8A41812A2E9F63B"
  },
  {
    "path": "apps/mobile/src/db/repositories/outbox.ts",
    "sha256": "D89A8F7F175E8EE91D8DB4CFD0FCAAAE53E7742D5399D4B8A79511B1C9DA50A3"
  },
  {
    "path": "apps/mobile/src/db/repositories/packageUnits.ts",
    "sha256": "8FE46E84BFB7944476DF140E46675A68F01EEC4E2706B0BF9FDE632E0417C1C3"
  },
  {
    "path": "apps/mobile/src/db/repositories/payments.ts",
    "sha256": "3051BBFE73F7EF249314A68E70D563178B32BC58E4FE97A819CC8E3C4B2A1D0F"
  },
  {
    "path": "apps/mobile/src/db/repositories/priceObservations.ts",
    "sha256": "81ABD0BD35E3996554CD5168D1745DE87DEADC3FEFF5001BC3AD5399B7EB85EC"
  },
  {
    "path": "apps/mobile/src/db/repositories/productIdentifiers.ts",
    "sha256": "D0ADE4E915E6BF9E537E247F1A3C0073C711ADE5075D1DFDA98327921DF72988"
  },
  {
    "path": "apps/mobile/src/db/repositories/productVariants.ts",
    "sha256": "4D0B9CF553DA795333E7B5A81A4DFEF0421C7905BB14AF02AEA95EA787E298F5"
  },
  {
    "path": "apps/mobile/src/db/repositories/purchaseItems.ts",
    "sha256": "6698E4ED9611DF57F0FE69AA0B1261F85E8AC741DA16914B7BE9B9DE2ECFC0FE"
  },
  {
    "path": "apps/mobile/src/db/repositories/purchases.ts",
    "sha256": "4C13D0331B2C96FD6B91D3B77D0273B6BDA2D68052CD250328EED9EBBAA8A446"
  },
  {
    "path": "apps/mobile/src/db/repositories/receivables.ts",
    "sha256": "7BDE76C28C183DFB42F0B083BEA82AF2380BC563F9550045DF91C3D86A24F938"
  },
  {
    "path": "apps/mobile/src/db/repositories/reconciliations.ts",
    "sha256": "CA941906DC40D891FE1C032BB394D78083272158DE2721905C58EC97E5D40BD1"
  },
  {
    "path": "apps/mobile/src/db/repositories/reorderLevelHistory.ts",
    "sha256": "91EF99E498BB8C7DFB9C9437304AEE0A2539FCCD3C64700F2CAD1EB4574B1358"
  },
  {
    "path": "apps/mobile/src/db/repositories/saleItems.ts",
    "sha256": "6399BFDEC0E4BEF55C6B604C9F69F4D9534A379277F5483ADD55FFD2D6B7AA3D"
  },
  {
    "path": "apps/mobile/src/db/repositories/sales.ts",
    "sha256": "B36155D69FFAF04EB10721D24DC20683ACB38F93107A789F593F44676A49A205"
  },
  {
    "path": "apps/mobile/src/db/repositories/storeMembers.ts",
    "sha256": "6D6A8A4F443AB6B1D2C14A7990EF4816EA5C2C8C2098A87D2454DE576C6A4EFF"
  },
  {
    "path": "apps/mobile/src/db/repositories/storePackageSettings.ts",
    "sha256": "46274EE63F258C7C8900452C3BDFE7895537641E13D65ECE031FC506EAA29495"
  },
  {
    "path": "apps/mobile/src/db/repositories/storeProducts.ts",
    "sha256": "46D7A189666B5D79FFD23B05757582CEDBA9E66A0197ABD07250FFA6C61A9C19"
  },
  {
    "path": "apps/mobile/src/db/repositories/stores.ts",
    "sha256": "C049C78D4C6D9F1BC93E06248554DFA5CAD337035F0086F9461FDDF2C4D46824"
  },
  {
    "path": "apps/mobile/src/db/repositories/suppliers.ts",
    "sha256": "A9CF93DDEBE08D6A0D6B6F7F7B0031D9BF13B81FDACA063C6C725F6E69895F5D"
  },
  {
    "path": "apps/mobile/src/db/repositories/sync.ts",
    "sha256": "5551FE6FC838A883274825447B2CA7F0F93FC7626F9C403D243DFFA15A931882"
  },
  {
    "path": "apps/mobile/src/db/repositories/users.ts",
    "sha256": "95E0B48EDA8BA17B7CEC79577B62B557EF629B3ABE0264F017ADA3089C1B82EA"
  },
  {
    "path": "apps/mobile/src/db/repositories/withdrawals.ts",
    "sha256": "DDB85DA2963D61397C401F6CFBB584EDBAE4AEC19DEEB5B313274DC80CBF9AE1"
  },
  {
    "path": "apps/mobile/src/db/testing.ts",
    "sha256": "7CCB54B2ED562AC16AC248222F44330C547EB7B6367FCA824C0F4D03E3FE0381"
  },
  {
    "path": "apps/mobile/src/db/transaction.ts",
    "sha256": "9582E54805F225E2A155338B5B0F3B39074B78F145D45A65BE92D4F9008FD6B4"
  },
  {
    "path": "apps/mobile/src/features/scanning/BarcodeCamera.tsx",
    "sha256": "9FBEB383D9DD48FBB3CCAA7E807AD6A19DDEE1A72F777E13B59567813C8A1DFD"
  },
  {
    "path": "apps/mobile/src/features/scanning/code-read.wav",
    "sha256": "EFC354FCF7F5A5765EADA8BFB4FD15D5D5AD877223FDFA6E903AD01DE4A23889"
  },
  {
    "path": "apps/mobile/src/features/scanning/GlobalScan.tsx",
    "sha256": "933DE8083D34BD8ACC2FB3782907B59C1012AF85B40667C0A7F89513F33FF9CF"
  },
  {
    "path": "apps/mobile/src/features/scanning/PreviewZoomSlider.tsx",
    "sha256": "3D6056860639356408DF554FE811D73B80A14D302A20F247BD1308B695D67014"
  },
  {
    "path": "apps/mobile/src/features/scanning/resolver.ts",
    "sha256": "A0A7B540B7948A516F89F40D5A77DDFB43AAC25C5D708A3D345412154473F459"
  },
  {
    "path": "apps/mobile/src/features/scanning/scan-added.wav",
    "sha256": "9C4D0BC31317985F0D46AC06020129E276A8320F1F9FDA1C655DC5F72A9BEF20"
  },
  {
    "path": "apps/mobile/src/features/scanning/ScannerActivity.tsx",
    "sha256": "FB1418D0A0F4EA9935D65F163A1B9C25A4870FB574CA63C45D85E2ABC5EE917D"
  },
  {
    "path": "apps/mobile/src/features/scanning/ScannerPanel.tsx",
    "sha256": "A301C5002DA627EE7638CA31D5BEEC3A3FB01D41254AD3D7FC6E6960EA5CF559"
  },
  {
    "path": "apps/mobile/src/features/scanning/session.ts",
    "sha256": "71DCC6F856884E6D0B07C961DA38A93887F6CFBE1213E6A9B8B3CA144A5CDB58"
  },
  {
    "path": "apps/mobile/src/features/scanning/usePreviewZoom.ts",
    "sha256": "80671473E28908E4D7742768D9715DC6C86DADDB41741205ED33698103698D38"
  },
  {
    "path": "apps/mobile/src/features/scanning/useScanFeedback.ts",
    "sha256": "705C607D8C3F196AB04A2DE9C180A6F04A279DD9C451C7823F58B2554F264386"
  },
  {
    "path": "apps/mobile/src/features/scanning/verificationBuild.ts",
    "sha256": "489A5B9FA593A1FCEE28DD4EB28007620479979DD2E2129951A0394FED3A7093"
  },
  {
    "path": "apps/mobile/src/finance/businessSummary.ts",
    "sha256": "5EBD5387355FC52D2AE65A5E582C317268DD98905E7DF3EC42F3BB7BF8D7B4B7"
  },
  {
    "path": "apps/mobile/src/finance/client.ts",
    "sha256": "F8509F2D35A30C4D35A17D0C35E0FB125C1FFA8645FC814320C448FA0A1E77F7"
  },
  {
    "path": "apps/mobile/src/finance/FinanceContext.tsx",
    "sha256": "E8B6CEDFCE147FD2395F87716D7D9E13A414AEDCCA595FB9F1D19A3FFFDF1CBA"
  },
  {
    "path": "apps/mobile/src/finance/index.ts",
    "sha256": "D60A680CFCBF3D9848CC718BEA57CB942C88AB97333188CE6DBCB79093DC2D6A"
  },
  {
    "path": "apps/mobile/src/finance/recordExpense.ts",
    "sha256": "6629C1C409A4397283088535B5BD119AC43C15451DB81A86369389BED4C0D10D"
  },
  {
    "path": "apps/mobile/src/finance/recordOwnerWithdrawal.ts",
    "sha256": "71649DB40810CE6B9E467252E7BC2960FFFE69A1B6349481186895A24628688E"
  },
  {
    "path": "apps/mobile/src/inventory/adjustInventory.ts",
    "sha256": "D355724355E74715371D0F7A7E09409DC3310DA874B641A03724C17CBDA436BD"
  },
  {
    "path": "apps/mobile/src/inventory/attention.ts",
    "sha256": "676602BECA288FEA18E312D689A050C19B80C2F18DEE4008E24805F1919ABD48"
  },
  {
    "path": "apps/mobile/src/inventory/batchAllocation.ts",
    "sha256": "0846816E22247AA28A4930B29EA880955769C6862515F5427BC31E027B6343F0"
  },
  {
    "path": "apps/mobile/src/inventory/classifyBatches.ts",
    "sha256": "AC0FB6770CDB4B884BDFAFB3C7867F8ECD563BAC7C0323A0E4F3CF859419F831"
  },
  {
    "path": "apps/mobile/src/inventory/client.ts",
    "sha256": "28B0EDF39A273B564D8E5013DC7F3A53D4FE9280DD1867B2260852E74C7486EB"
  },
  {
    "path": "apps/mobile/src/inventory/guidedChecks.ts",
    "sha256": "4A5C17D0BBEB6ECA5C6079E8C889741B36959C7DF83D077A5E42E5B5273C3A6F"
  },
  {
    "path": "apps/mobile/src/inventory/InventoryContext.tsx",
    "sha256": "94354151913671DA4C241885609EDA4045CABCB11B34434B858BFF5E9911E54C"
  },
  {
    "path": "apps/mobile/src/inventory/reconcileInventory.ts",
    "sha256": "6B9F2FDA14D8EA513E087C8132D3DBF606679DB3CB95EF36D9852BFCD6D90858"
  },
  {
    "path": "apps/mobile/src/media/nativePhotoFiles.ts",
    "sha256": "9A36241EBBF27519C6FDA21D63F3A1E9D539A8FD6BC34215102B4CBF7C654B11"
  },
  {
    "path": "apps/mobile/src/media/photoFormat.ts",
    "sha256": "045781100D2FCC9C942D7D808FD78C41E88137514CEB34BB9AB5D4CDF2430274"
  },
  {
    "path": "apps/mobile/src/media/ProductPhoto.tsx",
    "sha256": "37A0964E24B74E0342A1E85B511B58902DCD9A992AB78313CB72E50ABF289D3F"
  },
  {
    "path": "apps/mobile/src/media/ProductPhotoCamera.tsx",
    "sha256": "27320E1860B121F82D4451DF06AE3F0FAA1287E31CCA711F3B6BCD49C6147E65"
  },
  {
    "path": "apps/mobile/src/media/ProductPhotoEditor.tsx",
    "sha256": "6F19B36DE7CBDE802C52E0C2649A5C646DFB07DA30DC5C4E9BA03E655D61DFAA"
  },
  {
    "path": "apps/mobile/src/media/ProductPhotoPreview.tsx",
    "sha256": "214A6F7B775748B7F15F9A768D06D8D2F5362FD6020523FCB93569D6D24841DC"
  },
  {
    "path": "apps/mobile/src/media/productPhotos.ts",
    "sha256": "EF22153A136D9296DB1047715CA4058E650295C9C2DC1B2A83AD0F3CC422B57E"
  },
  {
    "path": "apps/mobile/src/media/ProductPhotoStep.tsx",
    "sha256": "2CA516D72CFBC0AA9B455F533C266B408C28CA609C1F7D7C6FE71EF6AA4FC38E"
  },
  {
    "path": "apps/mobile/src/priceIntelligence/client.ts",
    "sha256": "4108456C24DF6E7B839AD93EF159E7F413FA41E0E18779F00CE12F159FA92261"
  },
  {
    "path": "apps/mobile/src/priceIntelligence/index.ts",
    "sha256": "01B0ACD206499DE05EEC071EC513D5DD9048BCF6EFF9CD661986338CE6F38D9D"
  },
  {
    "path": "apps/mobile/src/priceIntelligence/presentation.ts",
    "sha256": "65F43A755EE4B2DF3DCD804819ACC0A6CC49DAD4D9C0645E59AD7FD70B885BE5"
  },
  {
    "path": "apps/mobile/src/purchases/client.ts",
    "sha256": "A3AFC7A45372725A185092014D9D311AB2D3F41601639FF358930389E3704702"
  },
  {
    "path": "apps/mobile/src/purchases/index.ts",
    "sha256": "61A74CCADABDF947B481D3E6F73244347E1A8704DE20660DAD55C867B40FFAD1"
  },
  {
    "path": "apps/mobile/src/purchases/PurchasesContext.tsx",
    "sha256": "832E9AF97214120849B3802098529AC0C710C56C6783B7930B8E75DE7BCAA716"
  },
  {
    "path": "apps/mobile/src/purchases/recordPurchase.ts",
    "sha256": "07A8D86D0EBE4469A51CCF201343F404162F9E627CD9A360BE306C34EFA31099"
  },
  {
    "path": "apps/mobile/src/sales/client.ts",
    "sha256": "5288853E47DD11B33E622CC14898FA8E54286BBCB50B6D8ECFC71B4FC0D67F8F"
  },
  {
    "path": "apps/mobile/src/sales/completeSale.ts",
    "sha256": "2036EB56EB80E2FD2BA0CBE28993FC46F1E54C8591787923FD164961522EA055"
  },
  {
    "path": "apps/mobile/src/sales/draft.ts",
    "sha256": "8A2BF8168EB1B9A20A9F79E5A7A0774303C9584938839E5CBB594D4CED2179D5"
  },
  {
    "path": "apps/mobile/src/sales/draftExit.ts",
    "sha256": "CF607405B56196B0488DAB3947916FDD4242552C30A77F840C91D9A3B1BDED96"
  },
  {
    "path": "apps/mobile/src/sales/index.ts",
    "sha256": "4AFAA2CCB87596D1094F47AAC63DE5EDB20CBB3A16D17DD4EB4AB752639BB353"
  },
  {
    "path": "apps/mobile/src/sales/SaleDraftNavigationContext.tsx",
    "sha256": "469A0EDBBAA6C4E5F265E45595D92498BE9648CBB01D4FF08DBCB8A93152797F"
  },
  {
    "path": "apps/mobile/src/sales/SalesContext.tsx",
    "sha256": "13D1DD1513456908B3DAE51BA1E8854B4D429B83AE744E1C8DA60F6C8A8C2428"
  },
  {
    "path": "apps/mobile/src/sales/syncStatus.ts",
    "sha256": "C6F20F92B237548A206E74775F8B179690A0BDA3E66ED6BF074BA969E4A5A7A2"
  },
  {
    "path": "apps/mobile/src/screens/finance/BusinessSummaryScreen.tsx",
    "sha256": "C159E26AA35E6AAB025BBC269125FCCDB86EF673E0D087EE43C40E41C28B7B90"
  },
  {
    "path": "apps/mobile/src/screens/finance/ExpenseEntryScreen.tsx",
    "sha256": "DD26974FE97C5E6AB47B106F1B81C96C16F46F022A3DFB5726106E06AEE63E76"
  },
  {
    "path": "apps/mobile/src/screens/finance/ExpenseHistoryScreen.tsx",
    "sha256": "DE33E355A497677905F2B8B558857D9A5EA6DA01C4647091A214031785E4F9E1"
  },
  {
    "path": "apps/mobile/src/screens/finance/MissingFinanceStore.tsx",
    "sha256": "E0A2B6345DF2AC3548DD62F9FC94671C1CD99420577080F24DEDF9CA695A8410"
  },
  {
    "path": "apps/mobile/src/screens/finance/OwnerWithdrawalEntryScreen.tsx",
    "sha256": "A82FA6205B108B11DD2CFCF2D9D4464688C5A05D052D710CB4239D0FCEC22057"
  },
  {
    "path": "apps/mobile/src/screens/finance/OwnerWithdrawalHistoryScreen.tsx",
    "sha256": "33014CC3A651D27F0D21E44AE042FBF27275C200DF6B19FD78B9DE02F61816E9"
  },
  {
    "path": "apps/mobile/src/screens/home/HomeScreen.tsx",
    "sha256": "2F811E971552085AD9EA0357BCA90FB4654D10C527F14D982294B3808B8E63EB"
  },
  {
    "path": "apps/mobile/src/screens/inventory/AdjustmentScreen.tsx",
    "sha256": "A3AEF408004AA38718100A628D1024EB404138CD7AEAB4E68E0CE4AEDDF48B9D"
  },
  {
    "path": "apps/mobile/src/screens/inventory/AttentionScreen.tsx",
    "sha256": "2EB0284841601EACAD6FE5677BED37AD1EAD8FC8135F14F0ADED5272E5EE018A"
  },
  {
    "path": "apps/mobile/src/screens/inventory/BatchReviewScreen.tsx",
    "sha256": "CC0344DD9D8734BEA04310E0253201A5B4E295F3B0442217B962C001F1C22718"
  },
  {
    "path": "apps/mobile/src/screens/inventory/GuidedChecksScreen.tsx",
    "sha256": "5D41969F0F5233145EA760F82A843FEC94031FF84FE003CD0B75C0E5C7063A00"
  },
  {
    "path": "apps/mobile/src/screens/inventory/ReconciliationScreen.tsx",
    "sha256": "CCDE3504CEF36EABA7A892953F10A14149BB560D2BBE2AD69056DA53FD1AC30C"
  },
  {
    "path": "apps/mobile/src/screens/products/PackageFormScreen.tsx",
    "sha256": "2D0DF60AE76DFA8C78796FAAF8EBF635A5AA177C4FDF997AD5555905E19037AC"
  },
  {
    "path": "apps/mobile/src/screens/products/PersonalPriceChangesScreen.tsx",
    "sha256": "A40135049428B6BD27C43F6CF313C6D99FC48F7A354125D797AA37DB09A9AD64"
  },
  {
    "path": "apps/mobile/src/screens/products/ProductDetailScreen.tsx",
    "sha256": "E0E2226F17C2BBDE0FBC325D7AA8A0843429780659915FFC54B18BDC71F2474F"
  },
  {
    "path": "apps/mobile/src/screens/products/ProductsListScreen.tsx",
    "sha256": "8C2CDAD25FE1D3F4761A7A86865AB00D0E43D680F4A441A8DEB48EBB55F044A9"
  },
  {
    "path": "apps/mobile/src/screens/products/QuickAddProductScreen.tsx",
    "sha256": "0B06A0465E6754520CB69C8BF81895AFB06727B2534B7D251F5917411D77DF46"
  },
  {
    "path": "apps/mobile/src/screens/purchases/PurchaseDetailScreen.tsx",
    "sha256": "9B384160C3DA9C524FBF5E3E922F2C3A9B3C6AE5D0EACA3DC70D10F261839C6E"
  },
  {
    "path": "apps/mobile/src/screens/purchases/PurchaseHistoryScreen.tsx",
    "sha256": "858B3E7BD6C3A77DAAA76245EF0487CB3D3E529B975C8E49107F310DA8225E31"
  },
  {
    "path": "apps/mobile/src/screens/purchases/RestockScreen.tsx",
    "sha256": "DCFEA5DA86119F1105EF9FD71453FDCBE0701305E0C6DCC39AFC2CC3BE48862B"
  },
  {
    "path": "apps/mobile/src/screens/sales/SaleDetailScreen.tsx",
    "sha256": "7A92E45C8CCB5C7859FC1FBDCF1E514E387346071F51DDFC65E2F4753A0D2599"
  },
  {
    "path": "apps/mobile/src/screens/sales/SaleHistoryScreen.tsx",
    "sha256": "19866C535ACB9513CBA785435BB22CB5E0EDE5883F8BBD0768840E09C7B51871"
  },
  {
    "path": "apps/mobile/src/screens/sales/SellScreen.tsx",
    "sha256": "8D83EA64BEC0FD610C6238376D8E46190722DA3C6901FA7DCDD7332F5C4CB57C"
  },
  {
    "path": "apps/mobile/src/storeContext/provisionStoreContext.ts",
    "sha256": "E61B96F15A249D1AD281AF50746C2C6D711F2F119C780A9FB49F357455F94AC1"
  },
  {
    "path": "apps/mobile/src/sync/applier.ts",
    "sha256": "6E2C5015908F5E2DBA005F1B0FE901F397AF6BB1567143161F4FC78F6CE79B88"
  },
  {
    "path": "apps/mobile/src/sync/auth.ts",
    "sha256": "F5C674C405F227B547A4DE6BB884B2C0B67E5763C8CFF3711AF863DFF7CC236C"
  },
  {
    "path": "apps/mobile/src/sync/identifierQuarantine.ts",
    "sha256": "567400F391EFA7CFD7D1C2A074060271E5E29D999CD6EE7EE7E27FF6E900B071"
  },
  {
    "path": "apps/mobile/src/sync/index.ts",
    "sha256": "15E1FAA58467E3B6533E28FDCDE76365D5C05EF7E5EBD403C151F2557DCB9723"
  },
  {
    "path": "apps/mobile/src/sync/materialize.ts",
    "sha256": "77B3782BB893653B482ACE01C3F315D34D6FCA1992C23DEDC5A201500D5A524D"
  },
  {
    "path": "apps/mobile/src/sync/pilot.ts",
    "sha256": "1BAF9F96F4176525F14B6392826DF5838594D9E1EE462FC3F41E97B2220E70EA"
  },
  {
    "path": "apps/mobile/src/sync/PilotSyncScheduler.tsx",
    "sha256": "1F2E50E80384D1FC86A5E4B6DE25280FA6157821FDD8E8F4884BB1FB410455B6"
  },
  {
    "path": "apps/mobile/src/sync/transport.ts",
    "sha256": "00216A88C00155E351181681ED4478542B3921A5025A3EB9C80B7909AD373B27"
  },
  {
    "path": "apps/mobile/src/sync/worker.ts",
    "sha256": "9436C9C4761E2CF602DC66E4AE906AC10FB9D987FC3DCB95F3B8DA60220D5262"
  },
  {
    "path": "apps/mobile/src/ui/components.tsx",
    "sha256": "FC09AF34E29739FC822636877D5652A4EF5A667DCD76F609552F016A5606D408"
  },
  {
    "path": "apps/mobile/src/ui/money.ts",
    "sha256": "7D09E6B19A6CE018120308CF751B634AF7C00D09A911EC673CA4D62E6E729EE1"
  },
  {
    "path": "apps/mobile/src/ui/theme.ts",
    "sha256": "84A58A3CFFA4D8DF223EC5745EF39B4520D37904440E48605AD7AA0D15082A4A"
  },
  {
    "path": "apps/mobile/tsconfig.json",
    "sha256": "3C85C9560535AF31B7E0C9B8B5EE7A594A9D1AD4153110FC77378A465F4E0B63"
  },
  {
    "path": "apps/recognition-lab/__tests__/calibration.test.ts",
    "sha256": "2548F64497C1C092421CB2471E7F917148F5CA9A643E4610CD47EB428203DB17"
  },
  {
    "path": "apps/recognition-lab/__tests__/candidateCalibration.test.ts",
    "sha256": "017E7C02739DAE66219E7B0F5F1249B7398D9A9FFBE3BA862A276D6D2D94FB48"
  },
  {
    "path": "apps/recognition-lab/__tests__/cli.test.ts",
    "sha256": "A004EFB90CCC50D82B6305C710BD8C156D94BF69BF217DD75EC81E14C3406806"
  },
  {
    "path": "apps/recognition-lab/__tests__/cliOutput.test.ts",
    "sha256": "8B9C9D2A5BF92C6A43EA3FD5EF85CB7300E7421A201C69D6CC01334F253E8410"
  },
  {
    "path": "apps/recognition-lab/__tests__/comparison.test.ts",
    "sha256": "8494815F7C5DF6EBB747E5D88F91E310EA08E6B10985D8A7E8B4BF6837A53FE9"
  },
  {
    "path": "apps/recognition-lab/__tests__/comparisonCli.test.ts",
    "sha256": "3F3DFD2551AB7E9D3667A587D7D08FCB957454ABAE1BE57B21ADC8E094A4F4D8"
  },
  {
    "path": "apps/recognition-lab/__tests__/comparisonOutput.test.ts",
    "sha256": "C8BD14187A012CF232BC4F5E85D7B4832BC22EB59AE64C93536206B06CD54430"
  },
  {
    "path": "apps/recognition-lab/__tests__/deviceBenchmark.test.ts",
    "sha256": "32B91FF0DD53FAA281FCDF64EF28BC69472D6186FD0F05AB45BD747D35236A5B"
  },
  {
    "path": "apps/recognition-lab/__tests__/deviceBenchmarkCli.test.ts",
    "sha256": "960B2C49DD725373AD5D0400A8BAD8025882CB13C502D10A18DFB386A0F1C620"
  },
  {
    "path": "apps/recognition-lab/__tests__/deviceBenchmarkOutput.test.ts",
    "sha256": "E5BCB2E9442EA8C7288BAF7911C90928B9B49F54DF2FC01179814CBA4655A659"
  },
  {
    "path": "apps/recognition-lab/__tests__/deviceEquivalence.test.ts",
    "sha256": "99A2CF84309288F1C24D057F01FD8E73849FF3C143D6DE2A0E3AFD8502346AF8"
  },
  {
    "path": "apps/recognition-lab/__tests__/experiment.test.ts",
    "sha256": "40AE0684EAE23B96B4770B4225E295EADDE0691AFB5100259F26DA83FAD761B5"
  },
  {
    "path": "apps/recognition-lab/__tests__/importer.test.ts",
    "sha256": "B76F4F2D3309F4A27160EDA6F97880A5BEB105AD7495D98E907D94F99C5360F7"
  },
  {
    "path": "apps/recognition-lab/__tests__/metricCorrections.test.ts",
    "sha256": "C6573FDABB787944E8E54FF1AE4C6239A562657409F4523D6EB5C843C492CF2E"
  },
  {
    "path": "apps/recognition-lab/__tests__/metrics.test.ts",
    "sha256": "2F0E722F7CE187CE384DDE6AA812D8A5519A23045020AEDFA94C05795A3A6551"
  },
  {
    "path": "apps/recognition-lab/__tests__/precomputed.test.ts",
    "sha256": "DB46DE786B6D5F0779EAA6DFEFE0E0880E8D35CD6F5F94E4F318DA27A65E4390"
  },
  {
    "path": "apps/recognition-lab/__tests__/readiness.test.ts",
    "sha256": "0C9E26BE028D78841AE481148855B91B4983744E3D79E6588DDB432690575D8A"
  },
  {
    "path": "apps/recognition-lab/__tests__/retrieval.test.ts",
    "sha256": "A9F83C6B9ACB1021370AE0F57B2EB1BBF09C7D1C80DF5F63BFD597F3AE034C7C"
  },
  {
    "path": "apps/recognition-lab/__tests__/retrievalCache.test.ts",
    "sha256": "66866FAF3D45A48EC821D25BBA153EC0774A441923770E8E0F5DE80423CD94CA"
  },
  {
    "path": "apps/recognition-lab/__tests__/retrievalCli.test.ts",
    "sha256": "7B7A9052D4284BBEFA6BF984B2A88F760AA9D62D934732476900975558EE1D84"
  },
  {
    "path": "apps/recognition-lab/__tests__/retrievalCorrections.test.ts",
    "sha256": "A9113AD71079846F55A5CBBD3AF598685C5394211AD85476841FD4798704EAE2"
  },
  {
    "path": "apps/recognition-lab/__tests__/retrievalEvaluation.test.ts",
    "sha256": "EA369C113B298AC770F545AA38AD4EE8E3D8910A6C56A26A9FF2FB669931EF46"
  },
  {
    "path": "apps/recognition-lab/__tests__/retrievalHelpers.ts",
    "sha256": "C0F3C0A4AB01E491FF623CB039E476C1611C5A6092B61E689E00C30C974F745F"
  },
  {
    "path": "apps/recognition-lab/__tests__/retrievalOutput.test.ts",
    "sha256": "E6F74E032A9841B2D21020F8EE264F8A88295203724A8279B8A4262CD3179552"
  },
  {
    "path": "apps/recognition-lab/.gitattributes",
    "sha256": "93F6FEF224B2F7C84B540310601663DB72458EAE3E94AF7D221046A9A3208950"
  },
  {
    "path": "apps/recognition-lab/.gitignore",
    "sha256": "4273B110260280F5736974EA677AF834D43B80DC4D2D207FC193B6AA59C0D5A3"
  },
  {
    "path": "apps/recognition-lab/DATASET_CAPTURE.md",
    "sha256": "F4BC697E6A72D44A20EABD10DF0A7AF217F436C80D3AD3C2DB3AC068FD24BE88"
  },
  {
    "path": "apps/recognition-lab/DEVICE_BENCHMARK.md",
    "sha256": "9A19061112A89ABF0030C9052BAE85753A0D54539B4A711D527FA5DEC8BE53B1"
  },
  {
    "path": "apps/recognition-lab/ENCODER_COMPARISON.md",
    "sha256": "43BEA8F71923309B8D99923AF93561C2B707437E19F94084190D9E6C88E11FCC"
  },
  {
    "path": "apps/recognition-lab/eslint.config.cjs",
    "sha256": "DA6766074378FC2B8519128863A649F5E8DACF70BC544FBFC2F7443BA897785C"
  },
  {
    "path": "apps/recognition-lab/fixtures/assets/cal-a.txt",
    "sha256": "90617073C678565199D47845743835732A3C6640BA36C528C64335D6D0D6E0A7"
  },
  {
    "path": "apps/recognition-lab/fixtures/assets/cal-lookalike.txt",
    "sha256": "877384727DC1F2BEA0C533D2D3B0E34BF92127E9E617E96CFFFE211D4F733787"
  },
  {
    "path": "apps/recognition-lab/fixtures/assets/cal-unknown.txt",
    "sha256": "E99370EDD8101C6CDBA654CEE344C3B030FF6BFBE453F5FDA6BD64F89D44368E"
  },
  {
    "path": "apps/recognition-lab/fixtures/assets/hold-a.txt",
    "sha256": "381F247DF637C8A8DD3053B245CBE434EB05C6DB74035B595D7DBC1EA6D61AD1"
  },
  {
    "path": "apps/recognition-lab/fixtures/assets/hold-b.txt",
    "sha256": "A60435A4A24C4F12A58C1C89CCDED774C440BDA699AFE24F6BA056193AECB052"
  },
  {
    "path": "apps/recognition-lab/fixtures/assets/hold-lookalike.txt",
    "sha256": "A62738DE54B6A1048B7D28759614976AF9364500DB349445045E0B9604172874"
  },
  {
    "path": "apps/recognition-lab/fixtures/assets/hold-package-tie.txt",
    "sha256": "34BE6855723CD23C637E79F245797D34696F0A880BFE3DE374A05A0F58C6F005"
  },
  {
    "path": "apps/recognition-lab/fixtures/assets/hold-tie.txt",
    "sha256": "05C8A16E42C64E9D18B4828F550197969E1553E0DC06E67D6251417EB5C16AC2"
  },
  {
    "path": "apps/recognition-lab/fixtures/assets/hold-timeout.txt",
    "sha256": "87B2101761BD0B8B804B9C7A21E08FE95CC481930B27B9FFD9D5C542F288D373"
  },
  {
    "path": "apps/recognition-lab/fixtures/assets/hold-unknown.txt",
    "sha256": "9B2B5A4C20BAC97A0AB8B5BEEDF82665CAC6FA1BF0014C1D7C3BD8964DB7ED59"
  },
  {
    "path": "apps/recognition-lab/fixtures/assets/hold-wrong-package.txt",
    "sha256": "4312BC3EF01BD70634FFD26383A6FCD726261DFA27A5711E6DC044DE6E00E10A"
  },
  {
    "path": "apps/recognition-lab/fixtures/assets/q-a.txt",
    "sha256": "ABE006461D55259B54DD7FC20DFA874CEEED46FB107D89F2ACE80D9005077871"
  },
  {
    "path": "apps/recognition-lab/fixtures/assets/q-error.txt",
    "sha256": "979C90C3F52E9F8EAE4E403AB817680A9F28A6B43536482BB817E2147AE95851"
  },
  {
    "path": "apps/recognition-lab/fixtures/assets/q-u.txt",
    "sha256": "5D85B2B072BF1E66B10967F7C940B7C3523F302A03162C2307A03B6CC4299003"
  },
  {
    "path": "apps/recognition-lab/fixtures/assets/ref-a-pack.txt",
    "sha256": "B0BB62A8ACA2B954D8D83F79BA7BC65728340B9E983062A1DBFA6C1B74DC1912"
  },
  {
    "path": "apps/recognition-lab/fixtures/assets/ref-a-view2.txt",
    "sha256": "A843A8DE46FBC3FF1CA3C48EEEC0420DCD848B73E607E6900EE6E593BA0D2143"
  },
  {
    "path": "apps/recognition-lab/fixtures/assets/ref-a-view3.txt",
    "sha256": "5F748009327649B66152FDF9990379A56E97F638D98ED4B60F607D6D560B25E9"
  },
  {
    "path": "apps/recognition-lab/fixtures/assets/ref-a.txt",
    "sha256": "A25383215C8AAFCE51889B7AE6BE7FE17B6D40A84175346F8FA0F6E290AD1327"
  },
  {
    "path": "apps/recognition-lab/fixtures/assets/ref-b.txt",
    "sha256": "51255F23F016DB82277F391E9F9B68C46E82DBB490084AB03D9ED48FA31386F7"
  },
  {
    "path": "apps/recognition-lab/fixtures/assets/ref-c.txt",
    "sha256": "5136B50D6D9A2785DB5CB385BCB2D7A5CFF7CC852CDD1269D994DA7C31B66801"
  },
  {
    "path": "apps/recognition-lab/fixtures/configs.json",
    "sha256": "AF8EAEC94FF08D7B8307D3FFF19081DDA0CC227821DE2E93F0727F3196341A2E"
  },
  {
    "path": "apps/recognition-lab/fixtures/dataset.json",
    "sha256": "6B941FCAF47AE42FFEBE5BFE9B608F638BA7700E7135E7D94EF8D00B7C25670F"
  },
  {
    "path": "apps/recognition-lab/fixtures/generate-initial.mjs",
    "sha256": "D3FB0C70630B8C850B1FD1020976553C40748B4C01C27A1E06A44DA212EB5B65"
  },
  {
    "path": "apps/recognition-lab/fixtures/r1-curation.json",
    "sha256": "7524C00C9DCC79339B77DF8689405BC435650F7E89277B79C36CC3510B59CB6E"
  },
  {
    "path": "apps/recognition-lab/fixtures/r2/config.json",
    "sha256": "398D2539E869FBAC4B0A32E8C2AAB3C5D43B24DF569DFCC545B3D1C089A1AB01"
  },
  {
    "path": "apps/recognition-lab/fixtures/r2/draft-registry.json",
    "sha256": "C4A0BCCF078BF89B440857C77DA22BD6156BB54BD8F5C2AE11799E32232DEC65"
  },
  {
    "path": "apps/recognition-lab/fixtures/r2/generate.mjs",
    "sha256": "896611002F721DF8A16122BD360BAB13DB652C8B8CE08B34B0BFC00534B41358"
  },
  {
    "path": "apps/recognition-lab/fixtures/r2/inputs-calibration.json",
    "sha256": "E27644298321E7F8DE2628D0BB75953FC9826EE56FC38EAB4A4A6B465F909099"
  },
  {
    "path": "apps/recognition-lab/fixtures/r2/inputs-development.json",
    "sha256": "4B34B5656F0ECE35AB21DB6527527CE4647E7A75BA8BC081D9FD6BD5A5729122"
  },
  {
    "path": "apps/recognition-lab/fixtures/r2/inputs-holdout.json",
    "sha256": "C2192F809F9F74AD043FA473E06B2911855505857FA310AA3A8E8B737FE345DB"
  },
  {
    "path": "apps/recognition-lab/fixtures/r2/toy-a-artifact.json",
    "sha256": "3D795F77A7A548938074887A7FFC2087FEEFF6D382FED2B1AD3D64AC52DFCB9F"
  },
  {
    "path": "apps/recognition-lab/fixtures/r2/toy-a-calibration.json",
    "sha256": "B0F3B2454C8517004D75B0EEFAD8507FE561ECBFA5DB2BEEF9B2941996B65BEA"
  },
  {
    "path": "apps/recognition-lab/fixtures/r2/toy-a-development.json",
    "sha256": "8CADE7215452EBF50C2A49468E0C957BFB34F7FAB7C023F3B812DA90FF7248F4"
  },
  {
    "path": "apps/recognition-lab/fixtures/r2/toy-a-holdout.json",
    "sha256": "8CE5DABAD9BC6CA35AA9ACAF1E4F1D9089543B0D8A86EFCFCA045F6B2F27889F"
  },
  {
    "path": "apps/recognition-lab/fixtures/r2/toy-a.json",
    "sha256": "E8C1D491ABD2431878AE4FBA95588473452C404A38E5CADCF232498B6288663E"
  },
  {
    "path": "apps/recognition-lab/fixtures/r2/toy-b-artifact.json",
    "sha256": "E82342EDE373B94FAAEDB590F6A83A7BB2A2B4E59F0E9D577A55A0FD7252923A"
  },
  {
    "path": "apps/recognition-lab/fixtures/r2/toy-b-calibration.json",
    "sha256": "4D06F86A226E6D6366F4CED7378115A78EAE186A20FBBEDBCBA0D9B203299159"
  },
  {
    "path": "apps/recognition-lab/fixtures/r2/toy-b-development.json",
    "sha256": "7DEAB0EB6ABCFBD433530598F742E9069B9F56E43266FCC7A4400C4608D4A1F2"
  },
  {
    "path": "apps/recognition-lab/fixtures/r2/toy-b-holdout.json",
    "sha256": "790089EE901F5F128157EC2A3BD6AEE43695C4BB58532FDA5463C93DA3D9C514"
  },
  {
    "path": "apps/recognition-lab/fixtures/r2/toy-b.json",
    "sha256": "205FD6CED459E710B7FE733CC8EB0DD856EB77A525047D17655F81E1383249F5"
  },
  {
    "path": "apps/recognition-lab/fixtures/r3/benchmark.json",
    "sha256": "10457A2ECF2BCE8032A64FCCCC38A1900B49C290A9E44D11ED58C34B1C268EAA"
  },
  {
    "path": "apps/recognition-lab/fixtures/r3/drift.json",
    "sha256": "7B28BF2D9208538D0F6F9A00D16EA2632BCAA4E48ECB820CA448803F1DB66DC5"
  },
  {
    "path": "apps/recognition-lab/fixtures/r3/equivalence.json",
    "sha256": "94862C4F71004375812FF6FA52001E46DD3528A7479422DC570D45C05F4FB26E"
  },
  {
    "path": "apps/recognition-lab/fixtures/r3/failure.json",
    "sha256": "049317CCD549CCF2329DCC18EF20910B7A4869360719801895ABF1DFB8E32296"
  },
  {
    "path": "apps/recognition-lab/fixtures/r3/generate.mjs",
    "sha256": "014897714B3E2A6C204955A52F91F60147EC03705F560DA9B93018ECAD852B0F"
  },
  {
    "path": "apps/recognition-lab/fixtures/r3/incomplete.json",
    "sha256": "2333C2837715014D2BF65CBAC25453D0108F02C6608BD229472330A8F4B1E287"
  },
  {
    "path": "apps/recognition-lab/fixtures/r3/paired-benchmark.json",
    "sha256": "590CBB0EF9DA4274A07109DE6F5B78ED7B7C74F8EC1CD2FFE16076DFF2CCFF68"
  },
  {
    "path": "apps/recognition-lab/fixtures/r3/paired-equivalence.json",
    "sha256": "88681256B0B7F987D00C7B172BBD6F8279A9551CDDF69E50D317788FED5B7F62"
  },
  {
    "path": "apps/recognition-lab/fixtures/r3/target.json",
    "sha256": "ACBB174CBC7ECB0373BDA3F8F2CC403954D8239452BBD45FE2DB130D0D80A57C"
  },
  {
    "path": "apps/recognition-lab/fixtures/r4/selection.json",
    "sha256": "91FD7CF9220D506FDF517BB26907F6A5BFFAC54101E14F5EE4B91C3B0BD52DAC"
  },
  {
    "path": "apps/recognition-lab/jest.config.cjs",
    "sha256": "5C5C3169D18B0E6CBB74F66104491BA75D9A610A2844C0BC3785DA900EA9A990"
  },
  {
    "path": "apps/recognition-lab/package.json",
    "sha256": "27E013375BBDF93E13C8D8E106C843375C752604AB053E742F74CFCA1A6FB87A"
  },
  {
    "path": "apps/recognition-lab/README.md",
    "sha256": "3614469D195470ACA4BC34324BA72B98D134CBA4260489C3A7667C69BDAC3344"
  },
  {
    "path": "apps/recognition-lab/RETRIEVAL_PREPARATION.md",
    "sha256": "D9873629BCAAE206FD4ED0705F4F18553B23B659A7D2A80AAB27468D8470BDD2"
  },
  {
    "path": "apps/recognition-lab/src/calibration.ts",
    "sha256": "AA151B0AD451C5A2E62EE721C9528C62B9BE39BDAED5EF96F017D8E2DE3FD20A"
  },
  {
    "path": "apps/recognition-lab/src/candidateCalibration.ts",
    "sha256": "6142A536B90D7CD36913BAEAC463C255C72B569EA697D33DD5CB1C7E5B24196C"
  },
  {
    "path": "apps/recognition-lab/src/candidateFreeze.ts",
    "sha256": "E60C80B9EC30FA91BAB7839D879C4BC1BF78AC198B60E23AC85FEAF5F7D9F76E"
  },
  {
    "path": "apps/recognition-lab/src/cli.ts",
    "sha256": "97C9F63C8DDCD04468935096CFFC3C0D9ADB5FDB66ED4A62E380CCFA28296497"
  },
  {
    "path": "apps/recognition-lab/src/comparison.ts",
    "sha256": "6E7B9B91F42E0B57CCE9E02449E2A361B6095C6E4420801D13ADF6C6590865B1"
  },
  {
    "path": "apps/recognition-lab/src/comparisonCli.ts",
    "sha256": "E4ECDA935DA0D89608436B39B9616803CF6108A893CCB358E2E5B67E7EF40D7A"
  },
  {
    "path": "apps/recognition-lab/src/curation.ts",
    "sha256": "FBCA3BE1398688328B502073EA205B44CF53EA8F50C084FB74C00EB806AA7D7B"
  },
  {
    "path": "apps/recognition-lab/src/deviceBenchmark.ts",
    "sha256": "4B13F2AC086995FDD1889010F22B6F488C8ECAF81B88544D92EFD71CAB51DD81"
  },
  {
    "path": "apps/recognition-lab/src/deviceBenchmarkCli.ts",
    "sha256": "D1EBCEE13CEE26BC5513D291E541BA617825BB3BA645403DCEAFAE825BADE3D6"
  },
  {
    "path": "apps/recognition-lab/src/deviceEquivalence.ts",
    "sha256": "4214139C775029F768136BE3430A42379330705A3C18DAA7D8EA4DF11961D4DC"
  },
  {
    "path": "apps/recognition-lab/src/experiment.ts",
    "sha256": "D74B66BDD37D3034DFBE7E9841CF6364EAC3A5C2E0E8CDB5E15B2D547FFDCE8B"
  },
  {
    "path": "apps/recognition-lab/src/importer.ts",
    "sha256": "7EB4928F05DCAE4718060011A4D9F2D161E5E3D4C1304C93A697109E00C758A6"
  },
  {
    "path": "apps/recognition-lab/src/metrics.ts",
    "sha256": "E7347DB7837D8A7CF7579A25F277E2FA3832426F3986947508EEA7A887BF9A53"
  },
  {
    "path": "apps/recognition-lab/src/precomputed.ts",
    "sha256": "7F47E43CA48249957240C98B7D4262DF4BB5809346A5323BD2960A1AC8BFF46F"
  },
  {
    "path": "apps/recognition-lab/src/provenance.ts",
    "sha256": "900E3F2D8FFECB62105EA1B2D9536C37FA64B2EE76EF279FD05B572C6518DDC6"
  },
  {
    "path": "apps/recognition-lab/src/ranking.ts",
    "sha256": "A553D95559B9BF64FD43B7E310F831B9DA53D14D9E8DC61B8503226499204A4D"
  },
  {
    "path": "apps/recognition-lab/src/readiness.ts",
    "sha256": "4A56C8F2E9544F7C085F0732DC5A6EAC87D2F3DC202AEAD1159F5E9B69C2CF50"
  },
  {
    "path": "apps/recognition-lab/src/retrieval.ts",
    "sha256": "D3A212EC134687CA23F496DF9F53AB4B7FDF70240F5EAC8DC4EE5FB003D2B064"
  },
  {
    "path": "apps/recognition-lab/src/retrievalCache.ts",
    "sha256": "7178238BFA6C68AD38B2056448204FE7A94CB3E6EC9F509AA8F52B23A6F07381"
  },
  {
    "path": "apps/recognition-lab/src/retrievalCli.ts",
    "sha256": "2F45DB114F35E0683BFEE0784576F557D4B65C8B6A979EB50DDDC362E265199E"
  },
  {
    "path": "apps/recognition-lab/src/retrievalEvaluation.ts",
    "sha256": "5F6960ED52A6A3F73AAC099FF738491D9238C4A9C29351E0885593508B8366C4"
  },
  {
    "path": "apps/recognition-lab/src/retrievalGallery.ts",
    "sha256": "4C1219E3A29B5AD9865C055F59F4344F1EA1C4593815BC42227007E55D2CFEAF"
  },
  {
    "path": "apps/recognition-lab/src/retrievalPaths.ts",
    "sha256": "152350DBF01AA842AB037674162E04E7B596E407044073A9558A879184DD5316"
  },
  {
    "path": "apps/recognition-lab/src/schema.ts",
    "sha256": "31AD6129427D2B41A9A10CAEB425A385D9ED453D572714A587B1B1AC4B399CCF"
  },
  {
    "path": "apps/recognition-lab/templates/r1-v1/captures.csv",
    "sha256": "42C65204C8E8A5077268BF5526DC709D2F5D3C4D7838BFB0C3D89FF21D1F275F"
  },
  {
    "path": "apps/recognition-lab/templates/r1-v1/curation.json",
    "sha256": "6DEFBC8B32F8DC203BFDA11A58673652A2E2258BD4380AB6872C9B02574672E8"
  },
  {
    "path": "apps/recognition-lab/templates/r1-v1/dataset.json",
    "sha256": "BB5B6FA031985E2FCCD3E177F4F93338CCA47ED9F8089A0F6665A205E54B5C54"
  },
  {
    "path": "apps/recognition-lab/templates/r1-v1/README.md",
    "sha256": "F489049CBA11BF4AC19786AFF54134AA9C751F4067994AB2A907F01A91138D52"
  },
  {
    "path": "apps/recognition-lab/templates/r1-v1/selection.csv",
    "sha256": "6DDC53414C3E18ED3E7D031BE13C8DE1693E05F03BD40ABDD5948AEA28C1467D"
  },
  {
    "path": "apps/recognition-lab/templates/r3-v1/benchmark.json",
    "sha256": "286AB12F2EC6F214B58B49056DE7F783CB2EFA3A1AF53B2CCF61B865DB17BADB"
  },
  {
    "path": "apps/recognition-lab/templates/r3-v1/README.md",
    "sha256": "AE7B8B4E51C8A7A66BF74EC98717B04E8C65CA67FF2EDE2B896BB0D560F58FAF"
  },
  {
    "path": "apps/recognition-lab/tsconfig.json",
    "sha256": "22186279AB7839DF08D469AFD21E87311C9BA35A5898EE5C566C3D263B3A878E"
  },
  {
    "path": "docs/architecture/DOMAIN_DATA_MODEL.md",
    "sha256": "083DE139D804860B2FC354A74A56B0E358610B5CCAA03B4CE96FF0CAA9D00EBB"
  },
  {
    "path": "docs/architecture/OFFLINE_SYNC.md",
    "sha256": "986DCEAECC476F5E881CC595D40839E04F94A8C4F18C697318E3702AF9BC77BA"
  },
  {
    "path": "docs/architecture/TECHNICAL_ARCHITECTURE.md",
    "sha256": "0BCF9A69593FB73AC615B192BC9E4E2003D924A2CD5A4DA0ACAA1D069925C3E1"
  },
  {
    "path": "docs/decisions/DECISION_LOG.md",
    "sha256": "E3CC963384A3B089EF23FF100BC10E20F9A02B3DF3234A786F8F97A5CD9E0288"
  },
  {
    "path": "docs/design/DESIGN.md",
    "sha256": "5962912472DDC464E702E55923DAA4E625BD41DFDE8752A0ADA04E898B7B1172"
  },
  {
    "path": "docs/design/README.md",
    "sha256": "C5E8CE4C8C37B4DFD52C4D46E81860FFE47E95C7C7D750FE2FD9E7C927BCAB79"
  },
  {
    "path": "docs/engineering/BUILD_PLAN.md",
    "sha256": "B6506D651AFCF88CB3C8402D4B18710107D583BC721B249B7DD34839CEE09D41"
  },
  {
    "path": "docs/engineering/DEVELOPMENT.md",
    "sha256": "A43C96739ECC2D5E4F61243346D58406E3E9E5949385A4D72F48332C29D0C491"
  },
  {
    "path": "docs/engineering/FIRST_CODEX_INTAKE_PROMPT.md",
    "sha256": "E22BA5B465C699743C183634D3EDE97228ED2AE52922C8F300A96714EC0901CC"
  },
  {
    "path": "docs/engineering/IMPLEMENTATION_AUDIT_WORKFLOW.md",
    "sha256": "722749E794B30920B01FDEDD0892791366035D3B09744A3F4E968443B081B024"
  },
  {
    "path": "docs/engineering/LOCAL_DOCKER_WORKFLOW.md",
    "sha256": "42BEF19D766CC48953528C82C3D63F6BB7FA3EF6215992893A8A245FDAED9F93"
  },
  {
    "path": "docs/engineering/M0_FOUNDATION.md",
    "sha256": "6BCB23781D16B2B61BC6DA43DD83683F953BC274EA1BC83DB8C29386078A0EB1"
  },
  {
    "path": "docs/engineering/M10_MARKET_PRICE_PLAN.md",
    "sha256": "7080437BC3113756A580DFFA0F81BF7C57652B63CB81DA1768674733D07271C5"
  },
  {
    "path": "docs/engineering/M10_MARKET_PRICE_TICKETS.md",
    "sha256": "E88DA97949B3B51FF07DB02038225331A938BD5BEB2D8DF3AF899CA8D339DC4D"
  },
  {
    "path": "docs/engineering/M3_AUDIT_CORRECTIONS.md",
    "sha256": "C8C4148BDB661521B65BF0A0D8E4E269F9C09661DDA932FDA2AC334C18073BC1"
  },
  {
    "path": "docs/engineering/M3_SALES_PLAN.md",
    "sha256": "7DD6395FFE7D728D14FC46B4A6A50036102F6C505A4082518FC80820F3BF2FC3"
  },
  {
    "path": "docs/engineering/M4_AUDIT_CORRECTIONS.md",
    "sha256": "49EA55FB9ACD63B32F6F96BAAB7F72226E56A26462813BFDDD5E49B00F2049E4"
  },
  {
    "path": "docs/engineering/M4_IMPLEMENTATION_HANDOFF.md",
    "sha256": "C740A1DE70182C2B6700A0BC452031D62FFBB612D95D85D13364DE4276961ABE"
  },
  {
    "path": "docs/engineering/M4_RESTOCKING_COSTING_PLAN.md",
    "sha256": "21631896BEFD4CB0E07F62E170671D6751BF31C59C0FD97DABAB5E9BC22D868F"
  },
  {
    "path": "docs/engineering/M5_AUDIT_CORRECTIONS.md",
    "sha256": "7A76953F92782B2FCE3CFBF8653733F74C87DD9EDC0CDDE6732C34EB4039B6DF"
  },
  {
    "path": "docs/engineering/M5_INVENTORY_RECONCILIATION_PLAN.md",
    "sha256": "B00001656C7DA6BEDFA4156B87CCE4F90BE0CF76C007A7606ED9AE219F100F25"
  },
  {
    "path": "docs/engineering/M6_AUDIT_CORRECTIONS.md",
    "sha256": "B4FE34BEDAAF147333529526B9177434F39537EB8CF0B8DAE3C6710044A36711"
  },
  {
    "path": "docs/engineering/M6_EXPENSES_BUSINESS_SUMMARY_PLAN.md",
    "sha256": "C771D02266C8E967B10CE4256A17A69D3C7DFF7B35482B42399541D891E1D90E"
  },
  {
    "path": "docs/engineering/M7_INDEPENDENT_AUDIT.md",
    "sha256": "CA1A48ED08C913ADFFCAD1262F46BB0C663C0502EC5DB11CE9ED943A1F9ECE2E"
  },
  {
    "path": "docs/engineering/M7_OFFLINE_SYNC_PLAN.md",
    "sha256": "2B44F0DE8AC6D92BA5677C4E6EFCDA02CB8A09527762F180C8325F097E4FADDF"
  },
  {
    "path": "docs/engineering/M8_ANDROID_VERIFICATION.md",
    "sha256": "631C0406AFE440360B4B76385EBE71791BA407CFB69A76D79C224662ED73B0FB"
  },
  {
    "path": "docs/engineering/M8_CATALOGUE_LOOKUP_PROVIDER.md",
    "sha256": "7CA25CC154B8801A59D782D9650FBF67A4FE4CE7F58230825207417721E8FFB0"
  },
  {
    "path": "docs/engineering/M8_IMPLEMENTATION_EVIDENCE.md",
    "sha256": "0E459E3A3645EEB490E351B2127E674D1E7846A06CA0A61E039920AA6CB4F671"
  },
  {
    "path": "docs/engineering/M8_IMPLEMENTATION_HANDOFF.md",
    "sha256": "DE057C7B228D507F47C39534675C8EB14349B16C762EDF8CA335BC34D55A5AA7"
  },
  {
    "path": "docs/engineering/M8_INDEPENDENT_AUDIT.md",
    "sha256": "F7ECF28C1B4A401A80D8D5079339889292CB3CCC4775CBC27DBE58EF4DE345B8"
  },
  {
    "path": "docs/engineering/M8_SCANNER_PLAN.md",
    "sha256": "24FF9455B451C28938C0714349671ED88ABE3D80737E282B17AFBB8BB5EC2E40"
  },
  {
    "path": "docs/engineering/M9_INTEGRATION_AUDIT.md",
    "sha256": "A8163511765F996944F9420709466BDABE9B59C6D8B5F0AE2215FB5F6E759B2A"
  },
  {
    "path": "docs/engineering/M9_INTEGRATION_CORRECTIONS.md",
    "sha256": "C384B78378719697A9F2F01BA01A0DBF94A4241E20C7BDEC13D7132B95FA9F94"
  },
  {
    "path": "docs/engineering/M9_INTEGRATION_HANDOFF.md",
    "sha256": "7F78668509798FC6E0E6CF9E8D0816BEBD040454B8E5D05039C4F5C6FE6B2B73"
  },
  {
    "path": "docs/engineering/M9_INTEGRATION_PLAN.md",
    "sha256": "1477AEA9537950DAEB409906D912993DFFC05EC59DFA0FABBB85C73DE835E0CD"
  },
  {
    "path": "docs/engineering/M9_INTEGRATION_TICKETS.md",
    "sha256": "48D43010D7DF07AEF6604302E845316594C293D4434A8E0D1C27635D3AC02A08"
  },
  {
    "path": "docs/engineering/MULTI_AGENT_WORKFLOW.md",
    "sha256": "ED322489BB18C9A68F86DF016A7AA5B90085270EE680DCBFEFC2D53FB2C55DFC"
  },
  {
    "path": "docs/engineering/PROJECT_STATE.md",
    "sha256": "1D76320DCF46359F8BC00C63F4F9413459BBDAF0B0967A7F57B3A9EBC737EBB7"
  },
  {
    "path": "docs/engineering/TICKETING.md",
    "sha256": "1C41E0FC9DABFF940993DB540F5A06B84659B8319FB84679A132EFA427A16ED1"
  },
  {
    "path": "docs/engineering/tickets/M1_DOMAIN_LOCAL_DATABASE.md",
    "sha256": "303C25BCB27CEE9840FFBB7B36296178DB94461F40F3378A71FC6823436478A2"
  },
  {
    "path": "docs/engineering/tickets/M3_SALES.md",
    "sha256": "6C7D7EE89F0B599C437C18E713CA1386A47E03E5742C22652252DE6EBF696E46"
  },
  {
    "path": "docs/engineering/tickets/M4_RESTOCKING_COSTING.md",
    "sha256": "4C1C49EBE6D8018E7B2F5774A442D92CE07235A76ED2A99EC03BA1830E19A88E"
  },
  {
    "path": "docs/engineering/tickets/M5_INVENTORY_RECONCILIATION.md",
    "sha256": "2A5DA759F68493AABF7D0383A4EC82FE2ECA707924A9A029B3B1808C362A529F"
  },
  {
    "path": "docs/engineering/tickets/M6_EXPENSES_BUSINESS_SUMMARY.md",
    "sha256": "9E84202B62A9057A83B4808040E4BF97E1FC789EF5973738D30D37B011BFF864"
  },
  {
    "path": "docs/engineering/tickets/M7_OFFLINE_SYNC.md",
    "sha256": "EAA52A786268BAD78AC62C97F6511AA23408A9207AD937BB6A982B343161BD5A"
  },
  {
    "path": "docs/product/PRD_MVP.md",
    "sha256": "50A4F8F5D644E5179FF7DFF6BD9A698CB69A260A3F49638939BA27E3F4ECD708"
  },
  {
    "path": "docs/product/PRODUCT_CHANGE_BACKLOG.md",
    "sha256": "77A49A4623D86777A2FC48362452E5D0D402FA166181B58D370D52190FB56188"
  },
  {
    "path": "docs/product/PRODUCT_INCEPTION.md",
    "sha256": "1CECED6381F71B0806990EB9B021ADFE20A8A8D878CCE605F19BC3E72BB241B1"
  },
  {
    "path": "docs/recognition/RECOGNITION_TEST_PLAN.md",
    "sha256": "53845B7F7D5A30CF85332AF6BCC9C24ABA4849946B4444AB0199F08C32E68371"
  },
  {
    "path": "docs/recognition/reports/R0_A2_CORRECTIONS.md",
    "sha256": "821CD04FAD98DA8C3B439541356E6DF716A459B5FEDE760A982336F1269AF1A6"
  },
  {
    "path": "docs/recognition/reports/R0_A2_INDEPENDENT_REVIEW.md",
    "sha256": "28D69BE7845318254448E2C4E4FC0DDBD339A5C0D083CCAF2B3DD7D4A028E361"
  },
  {
    "path": "docs/recognition/reports/R0_BENCHMARK.md",
    "sha256": "DC92C7BDDD987405D7CFE1C6B8649C6BA911AA1668641ED4F73F0DFD347839EA"
  },
  {
    "path": "docs/recognition/reports/R0_INDEPENDENT_AUDIT.md",
    "sha256": "C3C0D361277E9AD9B74C7BA1E9BF06D4FD519A925BAE426BDC1B9BF686531009"
  },
  {
    "path": "docs/recognition/reports/R0_R1_FA03_CORRECTION_HANDOFF.md",
    "sha256": "423E58EDDD26104879E2C2FADCD08588BCD03910ED04CA2568897D5027A18915"
  },
  {
    "path": "docs/recognition/reports/R0_R1_FA03_INDEPENDENT_REVIEW.md",
    "sha256": "C9DD8F450B4A4C4CDEEEAEEBDF452B281AC58108ADE3B8A4378EAE112ADECA7D"
  },
  {
    "path": "docs/recognition/reports/R0_REAUDIT_REPRO.mjs",
    "sha256": "F8BBDD08AB3B5C33ECF901FBBE70F5FDF750D93019B387EB28CF2E350DE1EA2C"
  },
  {
    "path": "docs/recognition/reports/R0_REAUDIT.md",
    "sha256": "BCCFC6451E1ED10E140943BAEA620A5D5E0CD154F7C6B9D757207894568BF31A"
  },
  {
    "path": "docs/recognition/reports/R1_INDEPENDENT_REVIEW.md",
    "sha256": "A2CB342B4D88B9671105D1A98814A233D055CD80C0DC8152BAF0DC78FA2A087E"
  },
  {
    "path": "docs/recognition/reports/R1_PREPARATION.md",
    "sha256": "A5960E4BCD7349123EF8DCBB78EE33E3A779ABF49A385FB3D69A7D0FFAEFC1D1"
  },
  {
    "path": "docs/recognition/reports/R1_R4_FINAL_AUDIT_REPRO.mjs",
    "sha256": "230B5FBA31399AF0FC1C8055B155752C70E01282AA99610868246475893A3814"
  },
  {
    "path": "docs/recognition/reports/R1_R4_FINAL_AUDIT.md",
    "sha256": "68A64EDC3FDF8C623BB5C32DB406E131E956193A3F309DBBF037B81F965F1326"
  },
  {
    "path": "docs/recognition/reports/R1_R4_REVIEW_HANDOFF.md",
    "sha256": "54E6EB87AE720A96F380F9C32B0683A362607306FB839BFEB2EE3F07B74AA4FE"
  },
  {
    "path": "docs/recognition/reports/R2_FA03_CORRECTION_HANDOFF.md",
    "sha256": "0ABCF961194C69E71875D57A0336BF5EC7670D6CE0DDB022B0FAC80FD9815A13"
  },
  {
    "path": "docs/recognition/reports/R2_FA03_INDEPENDENT_REVIEW.md",
    "sha256": "7AA0B87D5F79FF56AA446E25D21DBA6529C741E248E27575BC061A6421F8D4C0"
  },
  {
    "path": "docs/recognition/reports/R2_INDEPENDENT_REVIEW.md",
    "sha256": "ABD7AC83A1F3A69E00A9895C068C2FDE1261E6D509685044468F85131534D103"
  },
  {
    "path": "docs/recognition/reports/R2_PREPARATION.md",
    "sha256": "35EFDC03A190FCE356ED50A971730938C3B77D38CCAA677466145C5E840A12E6"
  },
  {
    "path": "docs/recognition/reports/R3_FA03_CORRECTION_HANDOFF.md",
    "sha256": "E9E1F7B9F27D2DA24A19731F72D7815B7A830CC847118C5F799F054F1137DD06"
  },
  {
    "path": "docs/recognition/reports/R3_FA03_INDEPENDENT_REVIEW.md",
    "sha256": "BA004FBECA6F43B5D26C83C935BD73EEFD8746206AAC2B5B3A7D327B8123C6F4"
  },
  {
    "path": "docs/recognition/reports/R3_INDEPENDENT_REVIEW.md",
    "sha256": "04BDCE326594B24E4DE1F01AA87C899DBDC0D55E921EE123FC7FBF93AE214BA1"
  },
  {
    "path": "docs/recognition/reports/R3_PREPARATION.md",
    "sha256": "6666D2E1EF7EBFE7A31D1D985C5234196106A48911219D7D7BA4AA54491C57DE"
  },
  {
    "path": "docs/recognition/reports/R4_FINAL_AUDIT_CORRECTION_HANDOFF.md",
    "sha256": "A901153CDCEFB5EB400E25C4A97C7308081CA613C27D98758ACEF2DBDC8AF736"
  },
  {
    "path": "docs/recognition/reports/R4_FINAL_AUDIT_INDEPENDENT_REVIEW.md",
    "sha256": "DC7E5FDB99294D4CD5B0E570F7556E3A2BECC3724E9627E7147957B6A00E8712"
  },
  {
    "path": "docs/recognition/reports/R4_INDEPENDENT_REVIEW.md",
    "sha256": "AF290E39C2A84D4001FB81F33A44B6FDCC78D68364F0BC929317DA1CABA29142"
  },
  {
    "path": "docs/recognition/reports/R4_PREPARATION.md",
    "sha256": "F6906F3BDFC82F847281C3E2478E2BF51DD33F6A6D50E9862C496B1D3C6B9AB7"
  },
  {
    "path": "docs/recognition/SCANNING_ARCHITECTURE.md",
    "sha256": "4F61065AE131AF64888E03DCA81992B495C89E419004CB89AF98CF4536269E3E"
  },
  {
    "path": "docs/recognition/TRACK_B_PLAN.md",
    "sha256": "25E1C16CCF2E3945106117E554AFA491BCBDEF2ECBE6CBE8AF0085FC7D9AA3AF"
  },
  {
    "path": "docs/recognition/TRACK_B_R0_TICKETS.md",
    "sha256": "82A741CAA73A4F1F20A3B209A4FC28D58260154C19B0CC2042D112E1F68FE8D3"
  },
  {
    "path": "docs/recognition/TRACK_B_R1_PLAN.md",
    "sha256": "CE74AD3C938F13164D8263F69675955573B3D8DA67A6DBAFD890E4DD67A23B87"
  },
  {
    "path": "docs/recognition/TRACK_B_R1_TICKETS.md",
    "sha256": "86E29355E0306CB182D38CA585C55499607F791CC16A280D59EA831CB34D27E4"
  },
  {
    "path": "docs/recognition/TRACK_B_R2_PLAN.md",
    "sha256": "D6626EBA3540176F31A4D74A3FF78C582C21B8A8911A5B9CFCEE919E15DAFC83"
  },
  {
    "path": "docs/recognition/TRACK_B_R2_TICKETS.md",
    "sha256": "92647977AAE6BA449236B0D808CD755B2F4395BE514915BC14FC2B1EC4E2B099"
  },
  {
    "path": "docs/recognition/TRACK_B_R3_PLAN.md",
    "sha256": "712499B1370A2407ACC2D699D417558C7B83C1AA65607F8A294005761FEB7042"
  },
  {
    "path": "docs/recognition/TRACK_B_R3_TICKETS.md",
    "sha256": "CB6DE8BF37381121DF7E77192E9D095A7E8E0AA4EFEBF59867746E93E35A0B6A"
  },
  {
    "path": "docs/recognition/TRACK_B_R4_PLAN.md",
    "sha256": "7FCDCA94C95DC67A4C3A8B42CBFD3445BAC6D94A9F4CD43F247A96EA6107863A"
  },
  {
    "path": "docs/recognition/TRACK_B_R4_TICKETS.md",
    "sha256": "4F166E5D8A8A139DBF688453D1B9EF6F25F8A12E72E7396458B7D9BCB276ABB6"
  },
  {
    "path": "GEMINI.md",
    "sha256": "4C7F948CC1E3A41539AF7068B1E6082695812C845E901629C8C13299D9E275C5"
  },
  {
    "path": "package-lock.json",
    "sha256": "9E3B66E4D3482960A034815870C2BE44E9DB59E178008D5F954829087009CEF6"
  },
  {
    "path": "package.json",
    "sha256": "3CF73202F1733B87C3DC068285D1354C321F8762B3AADA88111502E1F1CA5EE1"
  },
  {
    "path": "packages/contracts/__tests__/recognition.test.ts",
    "sha256": "FFFC0CCB03EE2195A32B3DD3F1D287FCD7B974BCEE691112DDD02D35F433BCFF"
  },
  {
    "path": "packages/contracts/__tests__/sync.test.ts",
    "sha256": "BED72681FE47F4312AD27ACAFD7DC8762603EB46DDBE5DD2DC4FD57E14262ED0"
  },
  {
    "path": "packages/contracts/eslint.config.js",
    "sha256": "FAC31767CCBCEA87A45430D3D5FA1E5EE8F3CB799100CF962540FD479C731B4F"
  },
  {
    "path": "packages/contracts/jest.config.cjs",
    "sha256": "5B87D9B804D6A69E5A13C76F174F53930BCA73E61D9A586F7056618C5BC62336"
  },
  {
    "path": "packages/contracts/package.json",
    "sha256": "36135771CD22B53654D0690DE9ED5C484CD5312F2E9E5787B93A3AC064AA504E"
  },
  {
    "path": "packages/contracts/src/index.ts",
    "sha256": "25905EE0EA4DE71CDCFD71F652476D35F204DE89BA812CA6003CD203A87C2F1F"
  },
  {
    "path": "packages/contracts/src/recognition.ts",
    "sha256": "54088F99E8157670B4B76AE04B32EB8E53DA271245FFC753BA8874A01D7872AF"
  },
  {
    "path": "packages/contracts/src/sync.ts",
    "sha256": "7808C4909A5097090AE7C655734C5EEE6EF402FB2CE49899AFDA062E6A588AF8"
  },
  {
    "path": "packages/contracts/tsconfig.json",
    "sha256": "D995B8ACD9EAC327668649AA82DCB25D2573B69EF8B2B0D532E68343B638E161"
  },
  {
    "path": "packages/domain/__tests__/costing.test.ts",
    "sha256": "9B3D3C1A5E340C8E560A36CDC3EF81BA8374D9499D4071BEDDB9EE926D280BE7"
  },
  {
    "path": "packages/domain/__tests__/ids.test.ts",
    "sha256": "7A0DB7C15DB41711B4F32FC2E05AD179FA9E9FFE667DCC8EBC0029BE000C2D84"
  },
  {
    "path": "packages/domain/__tests__/money.test.ts",
    "sha256": "B7E55214211302F7C8DE480C9A2C74698B6275A4D4C4CD3519535D840B5512FE"
  },
  {
    "path": "packages/domain/__tests__/packages.test.ts",
    "sha256": "675B11EAF77AFD89D28667C957E7013033789716D58836A0A60102903248D421"
  },
  {
    "path": "packages/domain/__tests__/personalPriceChanges.test.ts",
    "sha256": "74121C6DCD237F125AF37F3FED774E7379C5C13659C2D275FC4A2A9FACCDBD03"
  },
  {
    "path": "packages/domain/__tests__/sales.test.ts",
    "sha256": "5C934C39670DC44927912D36A1571D7EBAB1BADBDC6308EC4126BC84CC8043B2"
  },
  {
    "path": "packages/domain/eslint.config.js",
    "sha256": "FAC31767CCBCEA87A45430D3D5FA1E5EE8F3CB799100CF962540FD479C731B4F"
  },
  {
    "path": "packages/domain/jest.config.cjs",
    "sha256": "5B87D9B804D6A69E5A13C76F174F53930BCA73E61D9A586F7056618C5BC62336"
  },
  {
    "path": "packages/domain/package.json",
    "sha256": "4C6BFC9242F4F73AB0188C71778B1B21BCE22A63DBA293DFADB18B431B1308DB"
  },
  {
    "path": "packages/domain/src/batches.ts",
    "sha256": "6C25910FB7A64F7C097036A092A431F9BC49988A1019569FBB17B167F87E46AE"
  },
  {
    "path": "packages/domain/src/costing.ts",
    "sha256": "827F3017D8F0C85C0374AAADEA5FD96030F40F1F38C20C2F16DF17D5231F16E7"
  },
  {
    "path": "packages/domain/src/errors.ts",
    "sha256": "36A643BF85164969EC4EEB5A51DB886F3DD7E4D880AC5B7C8A9AA540CFC41236"
  },
  {
    "path": "packages/domain/src/ids.ts",
    "sha256": "536DB9F235713005DD19EAD69B1AE17609112C365AA7823A176BC3600E3B99C4"
  },
  {
    "path": "packages/domain/src/index.ts",
    "sha256": "25E4ABCBD1133F92868D145917EF9479282CD55BEFD69C73FAFCF9B90ED613AC"
  },
  {
    "path": "packages/domain/src/money.ts",
    "sha256": "D2D967B629E397A1E188EEDB7A93F2A369C4FD68920595252564D395000ED9B7"
  },
  {
    "path": "packages/domain/src/packages.ts",
    "sha256": "7121F66E19A6415149AE40B0E774445D91F220BD6137ED178F1194A9EB5E3B39"
  },
  {
    "path": "packages/domain/src/personalPriceChanges.ts",
    "sha256": "690372841ED75E590C3C29A406928BD11C560EA23247B03AC898967C71032D9B"
  },
  {
    "path": "packages/domain/src/sales.ts",
    "sha256": "823C221CC6D10FCB13F37135EC7B83983B2679F286417B6A46240202F77F8850"
  },
  {
    "path": "packages/domain/tsconfig.json",
    "sha256": "D995B8ACD9EAC327668649AA82DCB25D2573B69EF8B2B0D532E68343B638E161"
  },
  {
    "path": "README.md",
    "sha256": "A2C2C7EB2AE61B21F10AB51A9E2FB89E8963E78A7280670525774E585D9F77E1"
  },
  {
    "path": "supabase/.gitignore",
    "sha256": "507699EB91144818EDF61D3A079212CACF31D8DB520EAE428E3B48FCF0D6919C"
  },
  {
    "path": "supabase/config.toml",
    "sha256": "091E368063001B27F0FCC5B56A1C1FB34AE374BB591784E9D8872DA8A49D5C2D"
  },
  {
    "path": "supabase/functions/_shared/http.ts",
    "sha256": "61DF9D3FD906D237925CAD196B7B94FFF30B39F743151216F07744A02F45A143"
  },
  {
    "path": "supabase/functions/_shared/protocol.ts",
    "sha256": "AA7FB75236F11A10F89A216A21936710A378F4E43D77E6B0D2F70949E6A82C99"
  },
  {
    "path": "supabase/functions/.gitkeep",
    "sha256": "01BA4719C80B6FE911B091A7C05124B64EEECE964E09C058EF8F9805DACA546B"
  },
  {
    "path": "supabase/functions/sync-bootstrap/index.ts",
    "sha256": "975C432AE74AE21250FBFC1244D473724EE0EC02ECC4916CD3922DB5F3237481"
  },
  {
    "path": "supabase/functions/sync-enroll/index.ts",
    "sha256": "D0912A48683586259A72F6D5169BDDA0B27C0BA2C9C35648DF77990A4F9B54DB"
  },
  {
    "path": "supabase/functions/sync-pull/index.ts",
    "sha256": "4A58179775182FE8F474271C42447BEDFA310FDD4D753FD49A9D6F57CABAE645"
  },
  {
    "path": "supabase/functions/sync-push/index.ts",
    "sha256": "87883B7C4E65E5A5E18607E532CECAC435B8513CA378A1A5ED02F02B80D74F38"
  },
  {
    "path": "supabase/functions/sync-reference-context/index.ts",
    "sha256": "D7EB1B1F7EF0897B0E5AC9A2BB06B55EC975F800561FA8E7220E26CDCE8A437C"
  },
  {
    "path": "supabase/migrations/.gitkeep",
    "sha256": "01BA4719C80B6FE911B091A7C05124B64EEECE964E09C058EF8F9805DACA546B"
  },
  {
    "path": "supabase/migrations/20260919032659_m7_sync_foundation.sql",
    "sha256": "97DBB1D5F646830CEFD4AA544F698AAC43600F2881EF66304BAF16E844228297"
  },
  {
    "path": "supabase/migrations/20260919211406_m7_sale_purchase_graph.sql",
    "sha256": "844885C1E1C87288B066BE61EECE48CF59C9D3F328A4BBE8C71783CFC46B85B3"
  },
  {
    "path": "supabase/migrations/20260919212011_m7_catalogue_conflicts.sql",
    "sha256": "3616630871D1F1B52430E26757A55E08306B9527FC959FE3688A9962DCF983CC"
  },
  {
    "path": "supabase/migrations/20260919212220_m7_m5_fact_projection.sql",
    "sha256": "68EB8A65F378E9CBB4EE2B49C439795FE3914D09993537EB79833E1A479D4579"
  },
  {
    "path": "supabase/migrations/20260919212406_m7_finance_bootstrap.sql",
    "sha256": "DDE48DEFDB38AEE061E1966B2DF2156C3722EBA1FC79AB7DD677C52D9613F0B2"
  },
  {
    "path": "supabase/migrations/20260919212526_m7_cost_batch_hardening.sql",
    "sha256": "6C6581D52DB3B24BB6974D6D8286AE97AAC7D2AF3AB338D9E643ADEB03F3E5D9"
  },
  {
    "path": "supabase/migrations/20260919213259_m7_cursor_bootstrap_hardening.sql",
    "sha256": "3C79F040B5E71B7A99E6E6A408F3A27831CF4332E5E6CB8D77C123F212474729"
  },
  {
    "path": "supabase/migrations/20260919220000_m7_device_authorization_hardening.sql",
    "sha256": "4CF726D3C4727462CA70224E9805D9419F9E75D94FE2BDDEF7EF98F8EC473006"
  },
  {
    "path": "supabase/migrations/20260919223000_m7_bootstrap_operation_history.sql",
    "sha256": "76568B82354D5012E4F516D9D382EF16966BEF6C36B3601DDD0AE04EA3EC0989"
  },
  {
    "path": "supabase/migrations/20260928005512_fix_apply_one_pgcrypto_search_path.sql",
    "sha256": "935BCC74205F176367FBE98B93491B5F2EA5C3186FE879380E715EEE1AC5A7DD"
  },
  {
    "path": "supabase/migrations/20260928010143_prevent_revoked_device_reenrollment.sql",
    "sha256": "A049585FE6D89FC8FB35A6A538655C234E95A46B668EB202BBEF5950225CD8C8"
  },
  {
    "path": "supabase/migrations/20260928010639_bind_money_out_actor_to_authenticated_owner.sql",
    "sha256": "2AA224037F9E6600C9C700FE10FD6A030C8B3BE69D480CF978C141EDE047B048"
  },
  {
    "path": "supabase/migrations/20260928054000_guard_reconciliation_server_baseline.sql",
    "sha256": "4A2694B05AFE34C8BE7E7DA2B2217A4B610C4767538ABD528618718B29CE8E82"
  },
  {
    "path": "supabase/migrations/20260928115526_d045_later_device_bootstrap_context.sql",
    "sha256": "F236A61FA91AD10ECCE225934621B1BBDC77B10F49442C016A947EC4B72B7820"
  },
  {
    "path": "supabase/migrations/20260928160000_d045_reference_context_device_authorization.sql",
    "sha256": "DE9FAE5806F359353708B3ECADD933C180D6FAEB083C99DEBE07CF668D29141F"
  },
  {
    "path": "supabase/migrations/20260929092623_m8_identifier_claim_guard.sql",
    "sha256": "409F8133F713BA15C3D44247636FDD3CBB8E5EDF4433D6B24A245317A762D2F5"
  },
  {
    "path": "supabase/README.md",
    "sha256": "1A660001861070402C8B03145D244250D14DA185886F3BB9752B1EADBD76B9C3"
  },
  {
    "path": "supabase/tests/.gitkeep",
    "sha256": "01BA4719C80B6FE911B091A7C05124B64EEECE964E09C058EF8F9805DACA546B"
  },
  {
    "path": "supabase/tests/m7_bootstrap_history.sql",
    "sha256": "F1CE2CE429509C974652285497332E9AB4A22281706D0682C33D9FFF1FCE57F8"
  },
  {
    "path": "supabase/tests/m7_catalogue.sql",
    "sha256": "56A1E295DBF1C8FE8D4391CC81929A700EB44DBB8DA354213407C78089BD09FD"
  },
  {
    "path": "supabase/tests/m7_cost_batch.sql",
    "sha256": "857B8BB4E576070BF573A94DF12CF60DF769D386177C7B6AEBDBC433B1103F1F"
  },
  {
    "path": "supabase/tests/m7_cursor_bootstrap.sql",
    "sha256": "4209611DC63D0ABE4C86F3695972C6124C5A3CDE80686A01A960C9ED27E93674"
  },
  {
    "path": "supabase/tests/m7_device_authorization.sql",
    "sha256": "6158692AC152A8BD382D0CDBC52DB053D56006253CF46B20A4E6D4219C5D345D"
  },
  {
    "path": "supabase/tests/m7_finance.sql",
    "sha256": "9D2D5AD59E6E6A59915015167F4B6FAF3008B211568CF54B29A9C48F5A1CBD6F"
  },
  {
    "path": "supabase/tests/m7_m5.sql",
    "sha256": "9E40C66D82F483C028346F2963C494551CC67077C5D3956F72B133D6D5E6F2FE"
  },
  {
    "path": "supabase/tests/m7_reference_context.sql",
    "sha256": "4E80ED46F1A32DAE782A4F5F8EDDA67A18ACDE33EC3AB6777AB00124F0B47BEB"
  },
  {
    "path": "supabase/tests/m7_sync_graph.sql",
    "sha256": "AF4BCC8284AD5416E9E82F688C01064F1F1750F694E9D91E0D6763197B0E7B5B"
  },
  {
    "path": "supabase/tests/m7_sync.sql",
    "sha256": "01D0610BB970162ED4C052F32FAF068475689105F7E99581B6BF94E38E345900"
  },
  {
    "path": "tickets.md",
    "sha256": "11F48088B55B02F2C66E71A566AB80A78BC4E21374B7592B20228D97DCAA6A88"
  },
  {
    "path": "tools/scripts/check-environment.mjs",
    "sha256": "22E68D3691D0FD1C27ADD5DF3C47B42872B5075E1320100B5811DFBCC6A5C4E7"
  },
  {
    "path": "tools/scripts/scanner-cue-candidate.mjs",
    "sha256": "7A32C0A5CA398020BD9FADFC1CC486B53B39725659B4745314F5037ACD646BEE"
  },
  {
    "path": "tools/scripts/test-local-sync.mjs",
    "sha256": "9AF6C3C1F54A3820B8ED5EA04600D8AB4701901BA22335F8DA0BA306C4480EAF"
  }
]

```
</details>
