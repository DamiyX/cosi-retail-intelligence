# COSI Stack Context

**Status:** Active  
**Scope:** Whole project  
**Updated:** 2026-09-14

## Implemented Foundation

| Area | Current choice | Version or state |
| --- | --- | --- |
| Runtime | Node.js | 24.21.0 |
| Package manager | npm workspaces | npm 11.19.0 |
| Mobile framework | Expo / React Native | Expo 57.0.22, RN 0.86.3 |
| UI runtime | React | 19.2.3 |
| Navigation | Expo Router | 57.0.21 |
| Development client | Expo Development Build | expo-dev-client 57.0.19 |
| Language | TypeScript, strict configuration | 6.0.3 |
| Lint | ESLint with Expo config | 9.39.5 |
| Unit/component tests | Jest, jest-expo, React Native Testing Library | Jest 29.7.0 |
| Cloud native builds | EAS | Project linked |
| CI | GitHub Actions | Windows and Ubuntu validation |

The mobile package is apps/mobile. It currently contains only the M0 Welcome
and About navigation shell. There is no approved design system, component
library, global state library, server-state library, or business feature code.

## Approved but Not Implemented

- Expo SQLite for durable local business data.
- Supabase PostgreSQL, Auth, Storage, and Edge Functions.
- A hosted Supabase development project and migration-driven schema.
- Domain packages only when M1 responsibilities justify them.
- A durable outbox schema and atomic enqueue beginning with M2 mutable catalogue
  operations; network synchronization workers remain M7 scope.

These items are architecture commitments, not evidence that a package, schema,
remote project, or runtime behavior already exists.

## Environments and Integrations

- EAS owner: damiyxs-team.
- EAS project: @damiyxs-team/cosi.
- EAS project ID: 737ed99c-2c20-4612-ac80-a8a868b827cb.
- Development and preview Android build profiles exist.
- Supabase project configuration exists locally, but no business migrations,
  functions, RLS policies, or service-role credentials are committed.
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
- Java and Docker are not required for the current EAS cloud-build and hosted
  backend path; they remain optional local tooling.
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
