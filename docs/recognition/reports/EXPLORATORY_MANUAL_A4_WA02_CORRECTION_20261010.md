# WA-02 — stopped manual-a4 native index correction

2026-10-10. Same sole Sol6.1 HIGH writer
`01a1051f-0777-7573-ad09-0e550a4bd56a`. Unchanged branch
`plan/m8-unified-scanner`, HEAD `66ea3fc22595a48d7355d1729bb879496cc98896`.
**STOPPED preparation; independent coordinator review pending.** No operational
approval/publication, attempt, helper launch or private inference by this writer.

## Outcome and exact source

The new utility accepts exact positive UInt32, Int32 and Int64 interface indices
within `1..4294967295`, without rewriting the native objects. Malformed types
and out-of-range values still reject. Actual read-only connected native state
fails the consumed a3 classifier and passes a4's waiting classifier on the same
unmodified object. This verifies the native connected type boundary; it does
not verify actual OFF/radio/helper/recovery or E05.

New external root:
`C:\Users\doyew\AppData\Local\Temp\cosi-exploratory-manual-a4-20261010`.
Future ID: `offline-manual-20261010-a4`. Runner SHA-256:
`3f57f4fa6a518d4bbf19d59e3b0e05cd9ebef3e667d94704b9799e2308d98176`.
Consumed a3 runner remains:
`633bf8a40e20fdbfe177ca4fbb98ddb97d6e7b1bac0cc135edab8d13f3e41b75`.

Actual a3 failed `WAIT_STATE_MALFORMED` before pixels. The coordinator confirmed
native UInt32 indices versus signed-only validation. Historical raw types were
not captured; current native evidence confirms the source defect and supports
the actual failure mechanism without asserting historical values. See
`EXPLORATORY_MANUAL_A3_NATIVE_TYPE_FAILURE_20261010.md`.

## Narrow change and unchanged authority

Only three index validations inside `Get-ManualOfflineWaitState` now use new
local `Test-ManualInterfaceIndex`; fixed root/ID/preview also change. The helper
first checks exact CLR type, then makes a lossless local Int64 comparison against
the UInt32 range. It never converts or modifies an input field. String, boolean,
float, decimal, null, zero, negative, overflow and other integer representations
are rejected. There is no blanket coercion, malformed-state bypass or exception
retry. Actual adapter/interface identity and route/profile rejection remain.

`index-only.patch`, `source-check.json` and `Check-Source.py` verify this scope:
32 other main functions remain unchanged, including `Wait-ManualOffline`, actual
radio-OFF/private guards, child lifetime, arguments, result parsing, publication
and recovery. Six protected siblings (Support, Native.cs, Preflight.py, runtime,
private network binding and CMD) are byte-identical a3 copies. Four existing
regression scripts are also exact copies. The CMD's historical a2 label remains.
No existing source/test/config, model/software/preprocess/recipe/data change.

Waiting still grants no offline or pixel authority. Only the unchanged full
actual network plus radio-OFF re-read can return offline. Reconnection between
candidate and native re-read rejects before pixels; later private guards reject
reconnection instead of waiting. Work stays at1500 seconds, OFF/ON observations
at180 seconds, child limits930000/60000ms, stop/drain allowance30 seconds and
one-shot stopped recovery240 seconds. Result0/2/nonzero and mandatory publication
on both operational entries remain; recovery cannot restart private work.

## Evidence actually run

**199 generated checks passed; zero failed.** One actual read-only native
connected check separately passed. No generated radio/helper/private substitute
is claimed as native OFF or inference evidence.

| Check | Final external evidence | Result |
| --- | --- | --- |
| Type-preserving indices/bounds | `generated-wa02-indices-After-e0869527cda04a11af6875c49d64077d/results.json` | 83/83 |
| UInt32 waiting/guards | `generated-wa02-wait-UInt32-After-1fa11ecfee16448b8ccdc291e11da889/results.json` | 24/24 |
| Int32 equivalent waiting/guards | `generated-wa02-wait-Int32-After-7d2835d74b5d45d0981da1897ed75486/results.json` | 24/24 |
| Int64 equivalent waiting/guards | `generated-wa02-wait-Int64-After-cd842836a27741c7bc987d29164c8d3b/results.json` | 24/24 |
| Existing entry regressions | `generated-entry-28eba0132c3e41a2a5558b00f38d6bc2/results.json` | 30/30 |
| Existing finite clocks/recovery | `generated-clocks-bd386edff3134781bf28f5e873f9ccf6/results.json` | 8/8 |
| Existing unpublished entry rejection | `generated-blocked-entries-83647834389244299b9455ba9db27027/results.json` | 4/4 |
| Existing helper orchestration with substituted effects | `generated-wait-flow-79261f212ce14527ba2fc363a2a6ce65/results.json` | 2/2 |
| Actual connected native object | `native-connected-105dddc7f6b04be0994f493c1f578fcd.json` | Pass, read-only |

The actual observation at10:49:37 Africa/Lagos used unmodified native UInt32
values on20 adapters,14 IP records and44 routes. Original connected predicate
passed. Exact a3 classifier returned `WAIT_STATE_MALFORMED`; exact a4 returned
`WAIT_EXPECTED_BOUND_WLAN`. Both classifiers used the same object before any
JSON round-trip; all values remained unchanged. Only counts/types/outcomes are
recorded, without profiles/routes/identity. No radio-OFF query or native setting
change was made.

Consumed-a3 differential evidence is preserved: indices60 cases/3 failed new
expectations (UInt32 connected/IP-lag/offline), with signed equivalents and
rejection controls passing; UInt32 wait24 cases/17 failed new expectations.
The latter includes rejection ordering and inability to reach later checks,
not17 independent defects. On the connected fixture, exact a3 rejects on poll1
in0.320s; a4 waits then passes full generated offline plus mocked radio-OFF in
1.722s. Candidate-to-reread reconnection rejects
`OTHER_USABLE_IP_INTERFACE` before radio/private work. All before failures remain
in `indices-before-round1.log`, `wait-u32-before-round2.log` and their JSON.

The index harness preserves actual CLR types and numeric values in memory.
The wait harness now uses a type-preserving deep clone, not JSON serialization
between generated state and classifier. Cases include three index columns,
minimum/maximum valid representations, unsupported/malformed types and overflow,
connected/IP/adapter lag, full-offline/mock-radio-OFF, extra usable IP/UP adapter,
identity/profile/routes, no waiting pixel authority, cancel/deadline, strict later
guard and candidate re-read race. Timeout fixtures alone substitute a generated
stopwatch/sleep while retaining the literal180-second production bound; actual
session expiry and ordinary500ms waiting remain exercised.

The initial wait-harness builder accidentally targeted its own conversion
helper's return, producing recursion before case completion. Both owned test
processes were stopped after exact command ownership checks; no operational
helper was involved. Old harness/builder, partial directories and logs are
preserved with `fixture-round1-failure.json`. Only NEW test code was corrected;
runner bytes stayed unchanged. Fresh repaired runs above pass. No runtime
deadline/assertion/config was weakened and no retry concealed a source failure.

Eleven PowerShell files parse (including preserved failed harness source);
runtime/source verification and C# compilation pass, with no native effect.
Python AST and exact scope comparison pass. Workflow schema/formats and scoped
diff check are recorded in the final package; no broad app suite was rerun for
this isolated external utility correction.

## Review commands

These inspect or run preparation checks; they do not operate a real attempt.
Generated tests make fresh evidence directories. The native command performs
the explicitly allowed connected read-only observation and must run with WiFi ON.

```powershell
$root = 'C:\Users\doyew\AppData\Local\Temp\cosi-exploratory-manual-a4-20261010'
$pw = 'C:\Users\doyew\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\powershell\pwsh.exe'
$py = 'C:\Users\doyew\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
& $py "$root\Check-Source.py"
& $pw -NoProfile -NonInteractive -File "$root\Check-Parse.ps1"
& $pw -NoProfile -NonInteractive -File "$root\Test-NativeConnected.ps1"
& $pw -NoProfile -NonInteractive -File "$root\Test-WA02-Indices.ps1" -Version Before
& $pw -NoProfile -NonInteractive -File "$root\Test-WA02-Indices.ps1" -Version After
& $pw -NoProfile -NonInteractive -File "$root\Test-WA02-Wait.ps1" -Version Before -IndexType UInt32
foreach ($type in 'UInt32','Int32','Int64') {
  & $pw -NoProfile -NonInteractive -File "$root\Test-WA02-Wait.ps1" -Version After -IndexType $type
}
foreach ($test in 'Test-Entry.ps1','Test-Clocks.ps1','Test-BlockedOperationalEntry.ps1','Test-WaitFlow.ps1') {
  & $pw -NoProfile -NonInteractive -File "$root\$test"
}
```

Before commands intentionally exit1 on the preserved new expectations. Reviewer
runs create new artifacts; the writer's freeze records the package as handed off.

## Preservation and stop

Fresh baseline660 source/66860 protected entries. Only active workflow fields,
the current PROJECT_STATE line and this new handoff may change in the repository;
all other658 source entries and all protected entries are checked unchanged.
Original845, corrected-a2 854 and prepared-a3 276 indexed artifacts/freezes,
14a1/19a2/19a3 consumed failed/package/authorization/publication/Desktop hashes,
all40 approved photo hashes and49 private intake files are preserved. Photos
were hashed only. Actual a3 diagnosis/native snapshot and failed-attempt records
remain private and intact. See `preservation.json`, `allowed-state-delta.patch`
and `frozen-handoff.json` for exact digests, membership and released lease.

No operational a4 authorization/publication/attempt/output, controller/helper
launch, Desktop promotion, WiFi/global setting, inference, elevation/firewall/
profile/adapter/Sandbox/install/download/phone/Docker/Metro/service/cloud/paid/
upload/hosted/Git/M12 effect. Consumed a1/a2/a3 are never reopened or retried.
The only native action was the authorized read-only connected observation.
The writer stops after one direct coordinator completion handoff.

Coordinator must independently review stopped exact bytes and evidence before
any future publication. Actual manual OFF/radio/adapter compatibility, visible
helper launch/close/crash/recovery, restoration, private experiment and E05
remain **PENDING**. Existing polling/OS/power/helper and association-versus-
internet-reachability limits remain. No recognition quality or M12 claim.
Keep WiFi ON and do not launch consumed or unreviewed utilities.
