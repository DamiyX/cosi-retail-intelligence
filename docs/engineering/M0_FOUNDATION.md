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
- Supabase configuration only; no remote project or business schema.
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
- EAS CLI version command passed with the patch overrides; account is not signed in.
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
physical/native/remote acceptance is incomplete. Architecture boundaries are preserved.
Imported unchanged source-of-truth documents were verified separately from scaffold
code. Remaining dependency findings and deprecated lint tooling are recorded above;
no claim of external-release readiness is made.
- Scaffold commit 588b215 was pushed; draft PR #1 opened. GitHub CI run
  https://github.com/DamiyX/cosi-retail-intelligence/actions/runs/34761033840 passed
  on both Windows and Ubuntu for commit 588b215. Each ran npm ci, validation,
  Expo dependency checks, preview Android export and clean working-tree check.
- Galaxy A15 5G (SM-A156E), Android 16 is detected and authorized over USB using
  official Android platform-tools 37.0.1. No APK installed yet.
- Native APK builds, physical app behavior and second-laptop checks are pending.

M0 acceptance has NOT passed: native/device and second-laptop checks remain required.

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
