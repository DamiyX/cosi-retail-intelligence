# Local Docker startup and bounded recovery

Repository workflow for any engineer/agent using the initial Windows laptop.
Read this before Docker startup/recovery. It grants no installation, deletion,
reset or deployment authority. Other laptops must inspect their own paths and
errors; do not assume they have this fault. Docker is needed for local Supabase
integration checks, not ordinary typecheck, lint, Jest, Android export or local
app browsing. Notify the founder before starting Docker when requested.

## 1. Check before launching

Run `docker info` and `docker ps` once. If the engine responds, use it as-is;
do not restart it. Check the specific required containers, not just the UI.
If unavailable, inspect whether Docker Desktop/backend is already running and
capture the actual startup error. Resolve the installed executable path; do
not install or reinstall Docker as the first action.

If stopped and startup is authorized, launch it once with PowerShell
`Start-Process -FilePath <verified Docker Desktop executable> -WindowStyle Hidden`.
Use bounded readiness checks, not repeated launch/repair loops. A visible UI
alone is not evidence of a healthy engine.

## 2. Recognize the previously repaired fault

Observed 2026-09-30 with Docker Desktop 4.91.0: Windows could not access or
rename old Unix socket reparse points `sailor-ingest.sock` and `engine.sock`.
Restarting Windows or the UI alone did not fix that occurrence. The successful
reversible workaround preserved both runtime directories under timestamped
backup names, recreated empty directories, then launched Docker Desktop.

Exact original targets:

- `%LOCALAPPDATA%\Docker\run`
- `%LOCALAPPDATA%\docker-secrets-engine`

This is an observed workaround, not a diagnosed general Windows root cause.
Do not apply it automatically to a different error.

## 3. Safety gate before runtime-directory recovery

Before any move, verify the resolved absolute targets equal the two intended
directories inside this user's LocalAppData. Reject a target directory that is
itself a reparse point. Inspect every entry, including hidden entries: the
recorded safe contents were only zero-byte socket reparse points; the second
directory contained only `engine.sock`. If other files/data/subdirectories are
present, stop this workaround and report what differs. Do not follow links.

Only under authorization for this recovery, stop the identified Docker
Desktop/backend processes and verify they have stopped. Preserve both
directories with unique timestamped names in their existing parent directories;
the socket itself could not be moved, but its containing directory could.
Use PowerShell `Move-Item -LiteralPath`/`New-Item` end to end. Do not build
commands for cmd.exe or another shell. Keep the backups and record the exact
paths. Do not overwrite a prior backup or delete the old runtime directories.

Recreate only the two verified runtime directories and launch the verified
Docker executable once, hidden. If this bounded recovery fails, preserve the
evidence and report; do not escalate to factory reset, recursive deletion,
volume/container removal, WSL unregister or database reset. Container data,
images, volumes and the Docker WSL disk are outside this workaround's scope.

## 4. Prove the needed service works

Run `docker info` and `docker ps`. The previous recovery reported engine 29.8.0
and `supabase_db_retail-intelligence` healthy; these are historical results,
not today's status. For a server test, verify the particular Supabase services
and run that test's documented command. Report commands/results, recovered
paths, preserved backups, failures and unrun checks. Never call an engine
startup result a sync or migration correctness result.

No Docker startup/recovery was executed while preparing this workflow.
