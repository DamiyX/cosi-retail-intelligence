# Standalone generated recovery readiness check

Founder requested clear operational steps for the separately launched Windows readiness check. Coordinator prepared a temporary external check and desktop launcher; no product runtime or recognition recipe was changed. Writer remains STOPPED and fallback automation PAUSED.

External check: `C:\Users\doyew\AppData\Local\Temp\cosi-exploratory-offline-20261010\user-check\Check-Recovery.ps1`. Desktop launcher: `COSI - Check recovery.cmd`. The launcher invokes the existing bundled PowerShell without elevation or execution-policy changes. The check verifies exact original runner and shell digests, imports only original Library definitions, and uses the same generated detached-helper launch check. No WLAN commands or photo reads run.

Each attempt has a new external results directory. A generated parent must launch a helper outside all Windows jobs, then exit; that helper must write its generated completion marker afterward. Results distinguish readiness passed, blocked and check error. This is not actual Wi-Fi restoration, host/power failure certification, executable provenance review, private execution approval or E05 recognition evidence.

Coordinator parsed and ran the check once inside Codex: generated launch reports `RECOVERY_STILL_IN_HOST_JOB`, exit 1, no Wi-Fi effect or photo execution. The desktop copy digest matches the external launcher. Source digests and result path are recorded in external `user-check/preparation-record.json`.

Founder steps: keep Wi-Fi on; double-click the desktop launcher; wait for the final message; return to the coordinator and say the check finished. No new chat or Windows recovery settings are involved. Coordinator reads the saved result and completes remaining runtime/gate review before preparing any approved visible private-test invocation. A readiness pass alone does not authorize disconnection. Do not reconnect merely because twenty minutes elapsed: actual test must report stopped, including child cleanup. That test launcher has not yet been prepared or approved.
