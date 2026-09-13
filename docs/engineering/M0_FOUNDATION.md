# M0 foundation — reviewed implementation brief

Date: 2026-09-13
Branch: `chore/m0-foundation`
Remote baseline: `a393498979f4dc08cfe63f77fa313d9d62ec4ab3`

## Objective and boundary

Create a reproducible Android Expo foundation and preserve the existing Git history.
The prior session only cloned the repository, created this branch and copied docs.
All copied documentation was checked byte-for-byte against the original before
implementation resumed. No prior app implementation existed.

This is an ordinary application/tooling change (R2). Highest-risk assumptions:
Expo workspace bundling, native build compatibility, environment separation and
cross-laptop reproducibility. Recovery is reverting scaffold commits; there is no
business data or schema migration. No M1+ or recognition implementation is included.

## Reviewed decisions

- Retain the existing repository/history and task branch.
- Use stable Expo SDK 57 with its published compatible React/React Native set.
- Pin Node 24.21.0 / npm 11.19.0 and CLI versions; one npm workspace lockfile.
- Create only the mobile workspace. Shared packages and recognition lab wait
  until there is code to isolate/share.
- Use generated native projects from app config; native folders are not tracked.
- Development and preview have distinct Android IDs and explicit environments.
- Supabase configuration only; no linked Supabase remote project or business schema.
- Source-control workflow and scripts are usable without any particular AI tool.
- React, React DOM, Reanimated and Worklets are constrained at the workspace root
  to Expo's compatible versions. Without those constraints npm selected newer
  duplicate peers; the test renderer and Expo doctor detected the mismatch.
- ESLint 9.39.5 is retained for compatibility with Expo's React lint plugin.
  ESLint 10.10.0 crashed in react/display-name because that plugin still uses
  the removed context.getFilename API. Reassess when Expo's plugin set supports 10.
  The deprecated ESLint 9 line is a tooling maintenance limitation.
- EAS CLI's exact minimatch/nanoid/tar pins are overridden to compatible security
  patch versions 5.1.8/3.3.18/7.5.21. Remove overrides when upstream includes fixes.

## Intake issues retained for later milestone review

- Temporary StoreProduct has optional ProductVariant, while PackageUnit requires
  a variant and transaction lines require a package. Resolve ownership before M2/M3.
- Private purchase-price history must support noncanonical products; the logical
  PriceObservation currently requires ProductVariant. Resolve before M4.
- Atomic outbox capture is required alongside business writes before M3 completion;
  M7 adds transport. Do not retrofit durable capture after real transactions exist.
- Assign onboarding to an explicit milestone; enforce membership from the first
  remote private-data access, not only when staff UI arrives at M11.
- Recognition test phases and engineering R0–R8 milestones have overlapping
  labels with different meanings. Map them before recognition execution.
- Costing, quantity precision, offline authorization and final recognition choices
  remain deferred to their appropriate reviews.
- SQLCipher and secure key handling are required before external beta data;
  M0 creates no database.

The stale next-action text is replaced in PROJECT_STATE.md; BUILD_PLAN.md fixes
the decision-log path and chat outline. Business architecture remains unchanged.

## Verification record

Local Windows results on 2026-09-13:

- Node 24.21.0/npm 11.19.0/Git environment check passed.
- Strict typecheck and ESLint with zero warnings passed.
- Jest: 2 suites, 10 tests passed, including Home → About → back and direct About
  navigation plus accepted/rejected environment values. Router back is exercised;
  this does not simulate Android's physical back button.
- Expo Doctor: 21/21 checks passed after clean dependency resolution.
- Android development and preview JavaScript/assets exports passed (1,242 modules).
- EAS CLI version command passed with the patch overrides. Signup/sign-in is now
  complete as damiy_x, Owner of damiyxs-team. `eas project:info` verified the user-created
  @damiyxs-team/cosi project, ID 737ed99c-2c20-4612-ac80-a8a868b827cb. App config records
  these public identifiers; typecheck/lint passed after linking.
- Supabase init generated local config. Seed references were disabled because M0
  has no seed/schema. Local migration listing could parse config but could not connect
  to a local database, as expected without the optional local Docker stack.
- npm audit after compatible fixes: 22 findings (21 moderate, 1 low), no high/critical.
  Remaining chains include Expo/Router and EAS dependencies. This is not a clean
  security audit: URL decoding and CLI parsing advisories need upstream review before
  external distribution. Do not apply npm audit fix --force, which proposes unrelated
  major downgrades. ESLint 9 maintenance status is also unresolved upstream.
- Final npm ci passed; SHA256 of package-lock.json remained unchanged.
  This reproduces the install on this laptop, not a second-laptop acceptance result.
- Typecheck, lint and all 10 tests passed again after npm ci.
- Staged artifact/credential-pattern checks found no generated build paths or matching
  credentials. Markdown hard-break spaces are preserved; git diff --check passed.

Self-review against baseline a393498: M0 specification is implemented locally;
remaining acceptance checks are listed below. Architecture boundaries are preserved.
Imported unchanged source-of-truth documents were verified separately from scaffold
code. Remaining dependency findings and deprecated lint tooling are recorded above;
no claim of external-release readiness is made.
- Scaffold commit 588b215 was pushed; draft PR #1 opened. GitHub CI run
  https://github.com/DamiyX/cosi-retail-intelligence/actions/runs/34761033840 passed
  on both Windows and Ubuntu for commit 588b215. Each ran npm ci, validation,
  Expo dependency checks, preview Android export and clean working-tree check.
- CI also passed on linked-project commit beb7a81:
  https://github.com/DamiyX/cosi-retail-intelligence/actions/runs/34761941894.
  Local changes made after that commit still require their own CI result.

Native build requests from linked-project commit `beb7a8183ee914966d9e87695ae341d793477381`:

- Development: `cc7fcfe2-a642-454b-81a8-d5d28992ea4b` — FINISHED, APK artifact present,
  no build error; package `com.damiyx.retailintelligence.dev`.
- Preview: `12b2a32d-4c97-4cb5-9d3c-2d28e656015c` — FINISHED, APK artifact present,
  no build error; package `com.damiyx.retailintelligence.preview`.
- Both use EAS-managed signing credentials generated for their separate Android IDs.
  No keystores or credentials are stored in Git. Check current build status before
  retrying; do not submit duplicates merely because a session was interrupted.

Post-startup configuration review: installed Expo CLI's
`startTypescriptTypeGenerationAsync` deliberately removes `expo-env.d.ts` and its
generated-type include entries when experiments.typedRoutes is false/absent.
This app has not enabled typed routes. Accept the generated deletion and simplified
tsconfig includes; strict mode and explicit test/React/Node types remain enabled.
Applying Expo's normalization function again produces no updates. This change
affects TypeScript tooling, not the already-built APKs' runtime configuration.
Typecheck, zero-warning lint and both Jest suites (10 tests) passed after this review.

## Physical-device evidence and final review

Executed in the same task under Terra, reviewed under Astra on 2026-09-13.
Device: Galaxy A15 5G (SM-A156E), Android 16; official adb 37.0.1 over authorized USB.
Both APKs above installed successfully. UIAutomator observations support these results:

- Development: Welcome displayed the development environment; About content displayed;
  Android back returned to Welcome, observed before any restart. Metro bundled the app.
- Preview: with Metro stopped and airplane-mode setting verified as 1, force-stop and
  launch displayed Welcome with the preview environment. About content displayed.
  A second force-stop/relaunch displayed Welcome again without Metro.
- Follow-up preview check: Wi-Fi and mobile-data settings were explicitly changed from
  1 to 0; with airplane mode still 1, cold launch displayed Welcome, About displayed,
  and Android back immediately displayed Welcome before any restart.
- Airplane mode, Wi-Fi, and mobile data started at 0/1/1 and were restored to 0/1/1.
  Metro was stopped throughout the preview check.

The settings provide credible device-side evidence for the offline shell smoke check;
they do not establish every possible carrier/network behavior. No business persistence
or sync exists in M0; these are shell smoke checks only.

Development connection troubleshooting: Windows Metro in localhost mode listened only
on IPv6 loopback; IPv4 access failed. Restarting with `--host lan` served successfully,
and the phone selected the discovered LAN address. USB reverse was configured, but
this run does not establish that the app loaded through the USB tunnel.

Downloaded APK SHA256 checksums (artifacts remain outside Git):

- Development: `AA02EC00BCCC6C6012345D9CA7975593937DDA14633580D150D740598F8E8484`
- Preview: `268DA53333E77AB1C6216D21E0FA7A981D8572327CCD3D84D192F5DB1FBE5F06`

Second-laptop reproduction is explicitly deferred by the user on 2026-09-13. CI clean
installs on Windows and Ubuntu remain useful reproducibility evidence, but do not replace
the deferred physical-laptop check. Notify the user before Git commit/push utility work;
the reviewed local changes then need CI on their resulting commit.

M0 acceptance has NOT passed: publishing/CI of the final reviewed changes remains open.
The second-laptop check is deferred rather than passed. No M1 work has started.

A browser showing the private repository proves browser access only. The successful
Git clone verifies Git read authentication separately. Push/build/CI/native results
must be evidenced individually.

## Sources

- https://docs.expo.dev/versions/latest/
- https://docs.expo.dev/router/installation/
- https://docs.expo.dev/guides/monorepos/
- https://docs.expo.dev/develop/unit-testing/
- https://docs.expo.dev/build-reference/build-with-monorepos/
- https://docs.expo.dev/eas/environment-variables/
- https://supabase.com/docs/guides/local-development/cli/getting-started
- Expo 57.0.22 published bundledNativeModules.json
- Node official distribution manifest and SHA256 checksums
