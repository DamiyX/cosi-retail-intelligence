# COSI Stack Context

**Status:** Active  
**Scope:** Whole project  
**Updated:** 2026-09-29

## Implemented Foundation

| Area | Current choice | Version or state |
| --- | --- | --- |
| Runtime | Node.js | 24.21.0 |
| Package manager | npm workspaces | npm 11.19.0 |
| Mobile framework | Expo / React Native | Expo 57.0.22, RN 0.86.3 |
| UI runtime | React | 19.2.3 |
| Navigation | Expo Router | 57.0.23 |
| Barcode camera / optional feedback | expo-camera / expo-audio | 57.0.5 / 57.0.5; rebuild required |
| Development client | Expo Development Build | expo-dev-client 57.0.19 |
| Language | TypeScript, strict configuration | 6.0.3 |
| Lint | ESLint with Expo config | 9.39.5 |
| Unit/component tests | Jest, jest-expo, React Native Testing Library | Jest 29.7.0 |
| Cloud native builds | EAS | Project linked |
| CI | GitHub Actions | Windows and Ubuntu validation |

The mobile package is apps/mobile. It contains the independently accepted M0–M7
local-first source: SQLite/domain, catalogue/package units, sales, restocking and
costing, batch-aware inventory/reconciliation/attention, expenses, withdrawals
and Home/Today, plus M7 offline sync. M8 scanner source is undergoing independent
audit corrections. Physical-device, development-client/Metro and second-laptop
readiness checks remain deferred before external beta/native release. The app
uses a small project-owned component/theme layer; no global or server-state
library has been selected.

## Cloud and remaining scope

M7 implements the sync worker, Auth/Edge/PostgreSQL boundary, reference context,
migrations, RLS and local integration tests. Supabase Storage remains a future
media capability. M8 adds an undeployed server identifier guard and SQLite
quarantine migration. Physical/release gates and later recognition remain open.

## Environments and Integrations

- EAS owner: damiyxs-team.
- EAS project: @damiyxs-team/cosi.
- EAS project ID: 737ed99c-2c20-4612-ac80-a8a868b827cb.
- Development, preview and isolated scanner-verification Android build profiles exist.
- Supabase migrations, functions and authorization tests are committed; secrets
  and service-role credentials are not. M8 migration is not deployed.
- apps/mobile/.env.example documents public mobile configuration names. Secrets
  must stay outside Git, and a service-role key must never enter the mobile
  application.

## Build and Validation Interface

From the repository root:

    npm ci
    npm run check:environment
    npm run typecheck
    npm run lint
    npm test -- --runInBand
    npm run validate
    npm run mobile:doctor
    npm run mobile:export

See docs/engineering/DEVELOPMENT.md for setup and native-device commands.

## Known Constraints

- Android is the primary MVP platform.
- The second-laptop reproduction check is deferred, although clean CI installs
  pass on Windows and Ubuntu.
- Java remains optional for the current EAS cloud-build path. A real PostgreSQL
  integration environment is mandatory for M7 acceptance: Docker-backed local
  Supabase or an explicitly authorized isolated hosted development project.
- The current dependency graph retains upstream npm audit findings documented in
  docs/engineering/M0_FOUNDATION.md.
- Observability, analytics, remote configuration, state management, and database
  libraries beyond the approved foundation have not been selected.
- No final recognition model/runtime has been selected.

## Change Rules

Update exact versions from committed manifests and lockfiles, not memory. Major
framework, backend, database, sync, native dependency, or security-boundary
changes require explicit architecture review and a decision-log entry. Record
ordinary dependency changes in the relevant task and verification evidence.
