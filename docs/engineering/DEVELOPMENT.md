# Developer setup

## Canonical project

Repository: https://github.com/DamiyX/cosi-retail-intelligence
Task branch: `chore/m0-foundation`.

The original `COSI` folder was a documentation package without Git metadata.
The first implementation checkout is `COSI-m0`. Use that checkout in your editor
or coding agent. The original folder remains untouched; it is no longer the
active source of truth. Other laptops can clone into any ordinary local path.

## Prerequisites

- Git with access to the private repository.
- Node **24.21.0**, including npm **11.19.0**. Install from nodejs.org.
  `.node-version`, package engines, CI, and EAS pin the same Node release.
- A physical Android device for native acceptance.
- An Expo account authorized for the intended EAS project for cloud builds.
- Optional Android SDK/platform-tools (adb) for USB installation/debugging.
  Download from https://developer.android.com/tools/releases/platform-tools.
  The initial laptop uses portable platform-tools 37.0.1 outside the repository;
  add your chosen platform-tools directory to your terminal PATH to use `adb`.
  Enable USB debugging on the phone and authorize only your intended development laptop.
- Optional Java/Android SDK for local native builds; Docker only for local Supabase.

This project does not depend on a Codex runtime or any particular AI tool.
The initial session used a checksum-verified portable official Node distribution;
a normal Node installation on PATH runs the exact same scripts.

## First clone — PowerShell

```powershell
git clone https://github.com/DamiyX/cosi-retail-intelligence.git "C:\Projects\COSI"
Set-Location "C:\Projects\COSI"
git switch chore/m0-foundation
node --version
npm --version
npm ci
npm run check:environment
npm run validate
npm run mobile:doctor
npm run mobile:export
```

Use `npm ci` from the repository root on subsequent checkouts. Do not regenerate
the app with create-expo-app or run separate installs in each workspace. There is
one lockfile. Install changes are deliberate and committed.

## Preview while developing

```powershell
npm run mobile:start
```

This starts Metro for the **development client**, not Expo Go. Install a matching
development APK once, then connect the phone to Metro on the same network.
For USB use adb reverse when appropriate; a native dependency or app-config
change requires a new binary. Ordinary JS changes use Fast Refresh.

The app has Welcome and About screens only. There is no authentication, SQLite,
catalogue, business data, sync, or scanner yet.

## Environment configuration

The shell starts without an env file or backend keys. The default is development.
If local overrides are needed:

```powershell
Copy-Item apps/mobile/.env.example apps/mobile/.env.local
```

`EXPO_PUBLIC_APP_ENV` accepts exactly `development`, `preview`, or `production`.
Invalid values fail configuration. EAS profiles set their value explicitly.
Never use NODE_ENV to select the business environment.

The user-created Expo project is `@damiyxs-team/cosi`, project ID
`737ed99c-2c20-4612-ac80-a8a868b827cb`. These non-secret defaults are recorded in
app.config.ts so a second laptop targets the same project. The Expo slug is `cosi`
to match that hosted project; domain and Android identifiers stay unchanged.
`EAS_OWNER` and `EAS_PROJECT_ID` may override these identifiers only for a deliberate
project change. Each laptop signs in separately using `npm exec -- eas login`
from apps/mobile, then confirms access with `npm exec -- eas whoami`.

M0 does not consume Supabase credentials. Later client configuration may contain
only a project URL and publishable key. Privileged keys, passwords, signing
material, and server secrets stay out of the app and Git.
Environment files, credentials.json, native directories, APKs, and keystores
are ignored.

## EAS builds

Run the root scripts; they enter the mobile workspace automatically:

```powershell
npm run mobile:build:development
npm run mobile:build:preview
```

- Development: internal APK, development client, `.dev` Android ID.
- Preview: internal standalone APK, no development client, `.preview` Android ID.
- Production: reserved environment, no build/release profile in M0.

The internal Android ID prefix is `com.damiyx.retailintelligence`. It is not a
final public brand decision. Signing credentials must remain consistent across
laptops/builds; use the approved EAS credential store. No iOS, store submission,
or OTA publication is part of M0.

Account/project setup and build results are recorded in M0_FOUNDATION.md.
A successful Android JS export alone does not prove a native build is valid.

## Available root scripts

| Script | Purpose |
| --- | --- |
| `npm run check:environment` | Check required Node/npm/Git; report optional native tools without secrets |
| `npm run typecheck` | Strict TypeScript checks |
| `npm run lint` | Mobile/config ESLint with zero warnings |
| `npm test -- --runInBand` | Navigation and environment tests |
| `npm run validate` | Required local toolchain, typecheck, lint, tests |
| `npm run mobile:doctor` | Expo configuration/dependency health |
| `npm run mobile:export` | Android JS/assets export |
| `npm run mobile:start` | Metro for development client |
| `npm run mobile:build:development` | EAS development APK |
| `npm run mobile:build:preview` | EAS standalone preview APK |

Pinned EAS, Expo Doctor and Supabase CLIs are dev dependencies, not required global
installs. From the mobile workspace, `npm exec -- eas whoami` checks authentication.
From root, `npm exec -- supabase --help` shows backend commands.

## Switching laptops or coding agents

Before leaving: inspect status, run relevant checks, commit, push the task branch.
On the next laptop: fetch, switch to the same branch, pull with `--ff-only`,
read PROJECT_STATE.md, inspect status/history, run `npm ci` and validation.
Never reset somebody else's uncommitted work. One writer per working tree.

CI runs a clean installation on Windows and Linux. A second OS in CI is useful
evidence but does not substitute for the required second-laptop/phone check.

## Native acceptance checklist

Record build IDs, source commit, Android device/OS, tester and outcome:

1. Install development APK; launch and connect to Metro.
2. Tap About; confirm content and Android hardware back returns to Welcome.
3. Install preview APK; stop Metro.
4. Enable airplane mode, force-stop/reopen; navigate and return successfully.
5. Repeat documented clone/setup on laptop B with the same lockfile.

Do not use real retailer data in M0. If a native check cannot be performed, leave
M0 acceptance pending rather than inferring success from Jest or export.
