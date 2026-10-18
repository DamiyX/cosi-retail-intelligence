# Generated isolation runner handoff — October4,2026

**STOPPED / SOURCE READY FOR COORDINATOR AUDIT. Administrative/native verification
PENDING. E05 NOT RUN; networkReviewed remains false.**

This implements the founder-approved preparation of a temporary outbound Python
firewall control under E01/E04. It does not retry the coordinator's denied
firewall creation, invoke UAC/elevation, close the native-egress gate, or authorize
private inference. The main coordinator owns independent acceptance and any
request for an administrative launch.

Actual checkout `C:\Users\doyew\Documents\DEV 2\COSI-m8-planning`, branch
`plan/m8-unified-scanner`, unchanged HEAD
`66ea3fc22595a48d7355d1729bb879496cc98896`.
Writer `01a1051f-0777-7573-ad09-0e550a4bd56a`, coordinator
`01a098ef-d830-7531-bca7-2d66b0a5b587`; no new agents/chats or Git effects.

## Artifacts and scope

One execution runner and its new self-checks live in the isolated external folder:
`C:\Users\doyew\AppData\Local\Temp\cosi-exploratory-isolation-20261004`.
Keep this folder for review; it is local evidence, not Git-synchronized source.

| Artifact | SHA256 |
| --- | --- |
| `Invoke-ExploratoryIsolation.ps1` | `466646f9af67f6dd77b325e00f6620fa4f1f6129633ca38d020a8ede52e280a0` |
| `Test-ExploratoryIsolation.ps1` | `392f4cc6435581b8b049d97673c1bc77b76ae1b413ac85947563089c5dae181a` |
| `runtime.json` | `1b576a7c235779641bd13b693f2ea4936517efcc58c39a86f7fa142ea2d2707e` |
| `baseline.json` | `1d19e3919434cd307d2ca18ec05929431d80615f0182a8c9d0dd7250703efbf6` |

The exact reviewed producer/evaluator source fingerprint stays
`1df885b33fe752ac2c81fa9a7e4b7bfa432a9bddb1b1d63435643245831b8cb0`.
No existing runtime source, old test, shared package, lock, setup, threshold,
manifest, model or project-state document was changed. This new handoff is the
only repository addition. The owned lease was restored from exact original
workflow bytes on release.

The runner allowlists paths discovered from the existing installed interpreter:

- Venv launcher:
  `C:\Users\doyew\Documents\DEV 2\COSI-m8-planning\apps\recognition-lab\runs\exploratory\e01-e03-20261004\venv\Scripts\python.exe`,
  SHA256 `9f91cee2e1b13d9779ab252507aeee120c379e2543ffe85f63cad129b58ba230`.
- Actual base executable:
  `C:\Users\doyew\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe`,
  SHA256 `b7a12c3af0b4db44191eec14ea095eba731b7328917f570806183093d19ddca2`.

The runtime manifest is itself hash-bound in the runner. Paths, executable bytes,
reparse ancestors and reviewed source fingerprint are checked. This assumes an
honest, coordinated local operator; it is not a sandbox against an administrator
or a concurrently replacing host process.

## Concrete behavior and recovery

`Plan` only reads/checks bindings and reports pending status. `Library` exposes
helpers for the source-independent tests. `VerifyGenerated` checks an active
administrator token **before** child/network/firewall/output-directory effects.
It does not elevate. It rejects inactive firewall profiles or disabled local-rule
merging rather than enabling/changing profiles. It refuses another active
interpreter using either reviewed path (and unknown-path Python processes).

The base path is shared with other Codex Python work. Temporary rules apply to
all processes using that exact program path, not merely this experiment. The
operator must coordinate other Python jobs. The runner never terminates them;
it stops or retains its own rules for inspection if another interpreter appears.

The administrator-only sequence is:

1. Require fresh output directory and explicit public IPv4/IPv6 literal control
   addresses; reject loopback, private/link-local/multicast and mapped IPv6.
2. Run native TCP-positive controls from both interpreter paths for both families.
   `ctypes.WinDLL('ws2_32.dll')` calls Winsock directly; no Python socket
   monkeypatch, DNS lookup or application payload. A missing positive control
   stops before rule creation.
3. Generate unique GUID-owned rule names, verify absence in both stores, and
   journal each intent BEFORE creation so partial creation can be recovered.
   Create only exact program outbound Block rules, Profile/Protocol/addresses/
   ports Any. No preexisting rule is modified or removed.
4. Inspect ActiveStore rule plus application/address/port/service/interface
   filters. Require exact owner/program/scope, PrimaryStatus OK and
   EnforcementStatus Full. Require native blocked controls to return explicit
   Winsock10013; timeout/refusal/unreachable does not count as blocking proof.
5. Recheck effective filters. In `finally`, remove only this attempt's exact rules
   after every owned child job is confirmed empty, ownership/program checks pass
   and no other matching Python process is present. Verify disappearance from
   both stores. Run post-cleanup positives; otherwise report incomplete.

The embedded Windows child helper creates a suspended process, assigns it to a
job BEFORE resuming, limits the job to8 processes, and uses kill-on-job-close.
It invokes no shell and creates fresh logs exclusively. Timeout/failure
terminates the owned job and waits for zero active descendants. If lifetime
cannot be confirmed, rules are retained; no unsafe cleanup is attempted.
Interrupted hosts can leave firewall rules even though job closure kills children.
`journal.json` identifies exact owner, intended names/programs and cleanup state.
Cleanup failures stop execution and require an administrator to inspect those
exact names and child state before an individually authorized removal. Never
use a prefix wildcard removal or remove rules while a worker is alive.

Job and firewall semantics were checked against Microsoft's primary documentation:
[job objects](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects),
[rule creation](https://learn.microsoft.com/en-us/powershell/module/netsecurity/new-netfirewallrule?view=windowsserver2025-ps),
[ActiveStore and associated filters](https://learn.microsoft.com/en-us/powershell/module/netsecurity/get-netfirewallrule?view=windowsserver2025-ps),
[enforcement status](https://learn.microsoft.com/en-us/windows/win32/fwp/wmi/wfascimprov/msft-netfirewallrule).
Actual firewall integration remains untested here.

## Evidence actually run

From the existing checkout, using current PowerShell7.6.5:

```powershell
$isolationEvidence = 'C:\Users\doyew\AppData\Local\Temp\cosi-exploratory-isolation-20261004'
& "$isolationEvidence/Invoke-ExploratoryIsolation.ps1" -Mode Plan
& "$isolationEvidence/Test-ExploratoryIsolation.ps1"
```

Plan exit0: exact bindings match; Administrator false; native verification pending;
private mode unsupported; NetworkReviewed false. Final self-checks exit0 with
**45 passes** in `self-checks-native-syntax.log`:

- Actual PowerShell AST parse and embedded C# compilation.
- Actual launcher/base interpreter argument roundtrips including spaces, quotes,
  trailing backslashes and shell-like text.
- Actual timeout termination; actual parent exit with a live Python descendant,
  followed by a verified empty job and stopped descendant.
- Fresh-log overwrite refusal; actual unowned-interpreter preflight.
- Native probe Python syntax compilation under both executables, without executing
  Winsock or network code.
- Actual medium-token administrator denial before operational effects; unsupported
  private/approval-bypass arguments rejected.
- Pure address, ownership, cleanup and effective-filter shape checks, including
  scope mismatches. These are **synthetic helper evidence**, not effective
  firewall/native isolation passes.

Earlier40/42/43-pass check logs are retained alongside final45-pass evidence.
No failed integration was retried; administrative firewall creation, native
TCP-positive/blocked controls, IPv6 availability, partial-rule recovery and actual
firewall cleanup were **NOT RUN**. Read-only owned-prefix inspection recorded
zero rules; the preflight denial did not create a rule. No dependencies, services,
profile changes, model substitutions or private decode/inference occurred.
No wholesale existing lab suite was repeated for this external-only runner.

Fresh baseline captured638 source paths and63753 protected ignored/external
entries, including49 private intake files, all prior runs/evidence and earlier
coordinator E04 evidence. Final preservation evidence verifies all638 source
paths unchanged after lease release, this handoff added, no deletion, all63753
protected entries unchanged, and branch/HEAD unchanged. Records and exact release
time are in external `delta-final.json`, `preservation-final.log` and
`lease-release.json`. Original model/setup/software and earlier accepted
correction/audit evidence remain byte-identical.

## Pending administrative action and limits

After independent source audit, the coordinator may request a human launch in an
already elevated PowerShell7 session. The assistant did not request/launch UAC
or run the following administrative command. Verify the reviewed hashes first:

```powershell
$isolationEvidence = 'C:\Users\doyew\AppData\Local\Temp\cosi-exploratory-isolation-20261004'
$runnerHash = (Get-FileHash -LiteralPath "$isolationEvidence/Invoke-ExploratoryIsolation.ps1" -Algorithm SHA256).Hash.ToLowerInvariant()
if ($runnerHash -ne '466646f9af67f6dd77b325e00f6620fa4f1f6129633ca38d020a8ede52e280a0') { throw 'Reviewed runner changed' }
& "$isolationEvidence/Invoke-ExploratoryIsolation.ps1" -Mode VerifyGenerated -ControlIPv4 '1.1.1.1' -ControlIPv6 '2606:4700:4700::1111' -ControlPort 443 -RunId 'generated-admin-audit-01'
```

Those literal public endpoints are examples, **untested here**; the coordinator
must approve the control destinations. No application request/data is sent.
Unavailable IPv6, denied rule creation, ineffective merging/filter/status or
missing10013 denial means incomplete verification, with no fallback to an IPv4-only
pass or firewall/global-policy change. Use a new RunId for a separately authorized
attempt; never overwrite retained evidence.

Even an administrative pass establishes only fresh native TCP controls for both
families and inspected Any-protocol policy. It does not directly test UDP/ICMP,
loopback, brokered OS DNS, proxy/service/helper-process egress, every network path,
or future policy changes. The rules are removed after validation: **a later
private command would not be protected by this completed attempt**.

There is deliberately no private producer mode or generic command passthrough.
E05 requires a separately reviewed integration that keeps effective isolation
through the private worker lifetime, adequate exact-runtime gate evidence and
coordinator hash-bound approval. Existing producer approval/setup guards remain
unchanged. This runner never sets networkReviewed true, writes an approval artifact
or claims private-run safety from synthetic tests. If the above limitations
prevent trustworthy gate closure, stop for a precise founder decision rather
than widening this assignment into a sandbox investigation.
