# Offline execution preparation — October 10, 2026

**STOPPED for coordinator audit after exact lease release. Operational execution
BLOCKED by recovery-helper capability. WiFi disconnect/reconnect NOT RUN;
private decode/inference and E05 NOT RUN. Original `networkReviewed:false`
setup preserved. No operational approval/setup/network record authored.**

The founder-approved temporary laptop WiFi disconnection is settled authority,
but this assignment permits preparation only before coordinator audit. This is a
bounded E01/E04/E05 operational alternative, not a new recognition plan or change
to product/architecture. No extra founder prompt is needed for this preparation.
The current host cannot demonstrate the required independent recovery process;
the runner refuses to proceed rather than relying on a manual internet toggle.

Checkout `C:\Users\doyew\Documents\DEV 2\COSI-m8-planning`, branch
`plan/m8-unified-scanner`, HEAD `66ea3fc22595a48d7355d1729bb879496cc98896`.
Writer `01a1051f-0777-7573-ad09-0e550a4bd56a`; coordinator
`01a098ef-d830-7531-bca7-2d66b0a5b587`. No new model, agent or chat.

## Decision and precise blocker

Read-only `netsh wlan show interfaces` and `show profiles` both returned 0, with
no location/access denial. The current physical WiFi interface 18 is connected
to an existing saved profile. Ethernet 16 and Bluetooth 8 are disconnected.
The only external default route is IPv4 on WiFi; no IPv6 default route exists.
Hyper-V Default Switch 26 is connected with local on-link routes. Hidden up
adapters were inspected: the switch extension and WAN IP/IPv6/network-monitor
miniports have no connected IP paths. Their exact identities, along with the
full adapter set and allowed internal routes, are bound in a private local file.
No personal profile/interface name, SSID, password, key or profile XML was
printed in the shared handoff. No profile export or key query was used.

A generated non-admin process probe tried `CREATE_BREAKAWAY_FROM_JOB`, suspended
and noninheriting, then called `IsProcessInJob` before resuming the child.
Creation succeeded, but Windows reported that the child **still belonged to a
host job**: `RECOVERY_STILL_IN_HOST_JOB`. The helper candidate was terminated
while suspended and its exit was confirmed. No WLAN command ran. An independent
helper's survival outside the execution host cannot therefore be established.
The source maps this to `DETACHED_RECOVERY_CAPABILITY_UNAVAILABLE_NO_EFFECT`
before any arm signal/disconnection. It does not bypass the job restriction,
invoke UAC, request elevation, disable an adapter, create a service/scheduler or
change host configuration.

**Do not execute the unattended private attempt in this host.** The coordinator
must audit the source and this native capability result. A supported execution
context that can demonstrate an independent bounded recovery helper would be
needed before reconsidering execution; that capability is not established here.
Successful ordinary parent exit inside a shared host job is not sufficient proof
of recovery through execution-host termination.

## Frozen artifacts and review scope

New external root (retain locally; not Git-synchronized):
`C:\Users\doyew\AppData\Local\Temp\cosi-exploratory-offline-20261010`.

| Artifact | SHA256 |
| --- | --- |
| `Invoke-OfflineExploratory.ps1` | `068d20f476236254b7dfb1c115ea47632beb2a295a0c1e6d77c9de251cd0ca1f` |
| `Test-OfflineExploratory.ps1` | `0198331d2874cae3b41f3037a441bc6d2daa46aa52dfbc723ed603d56e9363db` |
| `runtime-offline.json` | `c975735d38a0f401ec9728340f116dd155c15716821b4edecf4c45acd14eb6b6` |
| `network-binding.private.json` | `d040c24b1d397d868fd5885d089d6153364a0c37aa9ba39705fdec159929683c` |
| Fresh `baseline.json` | `aeddf3d44000bf416a8a8c4762b24138a349c0ae4d35d0aef05f17f68cd15282` |

This is a new narrow offline wrapper. It neither modifies nor falsely passes the
old administrative firewall route or its IPv6/TCP receipt requirements. It
imports only the definitions from the exact hash-checked IR01/IR02 script
(`a3b211...b523f`, full SHA in the correction handoff). That script remains
unchanged; its main firewall path never runs during import. The new wrapper
reuses the established job helper, strict JSON and exclusive flushed immutable
writer. Its own runtime reader and independent offline approval gate do not
weaken the old wrapper. Its command entry points accept no generic command,
profile, interface, photo root, model or evaluator overrides.

The producer/evaluator source fingerprint remains exactly
`1df885b33fe752ac2c81fa9a7e4b7bfa432a9bddb1b1d63435643245831b8cb0`.
Fixed study SHA is `96c846a453cfd0edded23ab0e2dad3d67d4d88c97aca9a38f7efb91a624c3409`;
model SHA is `bbbb4c51a55a53905af1daec995ca1aae355046f8839bb8c9f5ce9271394bc40`;
recipe SHA is `ac67af950aed4789c275425b93e8816cf0950f2d6bd01a199879a011b669b81a`;
software inventory SHA is
`3d727c07763d95c0865cd975581a3690e8bbe6718a9eb8f24dd397af6c69989e`.
The 40 study assets stay under the existing `private-data/r1-pilot` root. All
49 original intake files are preservation inputs. Original fixed preprocessing,
ranking, separate withheld-identity proxy and 20-query accounting are untouched.

## Separate runtime drift found before effects

The shared base Python at its existing path changed bytes since October 4:

- Prior base SHA: `b7a12c3af0b4db44191eec14ea095eba731b7328917f570806183093d19ddca2`.
- Current base SHA: `10d845f50a2af64e3500bb2fcb348b5bc98a75d8ddada63e45ba1da6a1fc79d1`.

The writer did not replace it. The venv launcher SHA remains
`9f91cee2e1b13d9779ab252507aeee120c379e2543ffe85f63cad129b58ba230`.
Both the venv's reported Python version and the software record are 3.12.14 with
the same build string. A read-only `-I -B` inventory comparison against the
original `inventory()`/`packed()` code matched all installed locked-package
records byte-for-byte and reproduced the original software SHA. No image was
decoded, LiteRT model interpreter initialized or package installed for that check.
Why the executable bytes changed is unknown; matching version/inventory does
not prove executable provenance or equivalence.

The new offline manifest captures the **current** base hash and exact installed
PowerShell/netsh/Node executable paths and hashes. The copied original runtime
record and all prior evidence retain their old bindings. The old runtime gate
correctly yielded `EXECUTABLE_DRIFT` in the first Plan check; it was not relaxed.
The new offline gate binds the new manifest and requires an independent approval
of that exact manifest. Coordinator provenance review of this drift remains
required before any E04 approval. The original producer's exact software check
is also retained as a separate guard.

## Implemented sequence and recovery limits

`Plan` performs hash and connected-state inspection only. `Run` requires the
separately authored/published E04 package first. `Recovery` is the fixed local
helper path, bound to the same package and exact immutable recovery hash.
`Library` supports the focused generated tests.

Before effects, the parent requires the original saved-profile connection, exact
adapter identities, no other connected IP uplink, the frozen connected route set,
no other matching Python runtime and fresh external/private output directories.
It writes `restore.private.json` using exclusive `CreateNew`, `WriteThrough`,
`Flush(true)`, close, hash and strict re-read before launching the helper. This
record contains the exact original WLAN restoration binding, wrapper/runtime/
network/authorization hashes, parent PID plus creation time, fixed 1,200-second
deadline and denominator 20. Status files cannot replace it.

The helper must detach successfully and publish `ready.json` before the parent
writes the immutable bound `arm.json`. It independently checks parent identity,
deadline and connected-state prerequisites. Only then can it issue the fixed
shell-free `netsh wlan disconnect interface=<bound literal>` once. It changes no
profile, autoconfiguration, adapter, firewall, location or administrative setting.
The command's return string is not isolation proof.

Before private pixels, the helper must observe WLAN `disconnected`, WiFi adapter
`Disconnected`, no connected WiFi IP family and no other usable external route
or physical uplink. Only frozen local on-link Hyper-V routes and loopback remain
permitted; a new adapter, connected Ethernet/Bluetooth/VPN/unknown IP interface,
default or specific external switch route, GUID/name drift or unknown WLAN state
refuses execution. Localized/unavailable WLAN output fails closed. No external
IPv6 positive is required or claimed for this different operational method.

Approval/input bindings repeat immediately before private launch. The fixed
original producer and evaluator each launch in their own suspended, assigned
kill-on-close Windows job, with eight-process limit and existing bounded worker
deadlines. The helper owns those jobs. It checks parent/deadline/network state
before launch, on each poll and after return. If isolation/parent/deadline is
lost, it terminates and drains the owned private job **before** restoration.
It never kills another operator's process.

After any possible disconnect, including an ambiguous disconnect failure,
`finally` may reconnect only when owned child-job emptiness is confirmed. It
uses exactly the original existing saved profile/interface, once. Observation
failure does not suppress that one bound attempt. Command success alone is not
restoration: the helper must observe original-profile WLAN association plus a
usable original-interface IPv4 default route. A bounded 45-second observation
window then reports either `ORIGINAL_WLAN_AND_ROUTE_PRESENT` or truthful
restoration failure. This is local reassociation/route evidence, not proof that
the router or internet service works. No infinite retries or persistent helper.
No possible disconnect means restoration is `NOT_REQUIRED`.

An unconfirmed child lifetime retains offline state. Partial/incomplete producer
exit 2 allows one original evaluator and retains exit 2/denominator 20. Earlier
worker failure retains partial artifacts, never fabricates vectors/scores and
does not invoke the evaluator. Both attempt roots refuse reuse; no automatic
retry. The original false setup cannot pass; the wrapper never promotes its flag.

Recovery handles managed failures and a lost parent **only if** the independent
helper capability is available. Helper process failure, power loss, a stalled
Windows provider and hostile OS behavior are not proven recoverable. Deadlines
are checked between provider observations; they cannot interrupt a stalled
Windows networking provider. Network checks are snapshots separated by polling
and provider latency, not an atomic security boundary. Loopback/local internal
switch peers, host brokers and a hostile OS remain outside the isolation claim.
Do not call this a universal native-egress sandbox. These limits are explicit
network-review inputs, not silently waived by the founder's WiFi permission.

## Exact future E04 records — none authored here

The independent authorization record belongs at external-root
`authorizations/<RunId>.json`, with its SHA published by the coordinator. It has
exactly 17 keys: `schemaVersion`, `status`, `authorThreadId`, `runId`, `method`,
`runnerSha256`, `supportSha256`, `runtimeSha256`, `sourceSha256`,
`networkBindingSha256`, `studySha256`, `modelSha256`, `recipeSha256`,
`softwareSha256`, `setupSha256`, `producerApprovalSha256`, `networkReviewSha256`.
Schema version is 1, author is the coordinator above, status is
`APPROVED_FOR_BOUND_OFFLINE_PRIVATE_RUN` and method is
`BOUND_WLAN_DISCONNECT_NO_OTHER_USABLE_UPLINK`. All actual hashes must bind this
exact wrapper, support, current manifest, private study and separately reviewed
files. Hash publication plus author identity is operational provenance, not a
digital signature or protection from a dishonest local administrator.

The new setup and original six-key producer approval belong at checkout
`apps/recognition-lab/runs/exploratory/offline-approvals/<RunId>/{setup.json,approval.json}`.
The existing producer status remains `APPROVED_FOR_EXPLORATORY_RUN`; setup keeps
the existing strict nine-key schema. This writer created neither file.

The separate network record belongs at external-root
`authorizations/<RunId>.network.json`. Its ten keys are `schemaVersion`, `status`,
`authorThreadId`, `method`, `runnerSha256`, `runtimeSha256`, `sourceSha256`,
`networkBindingSha256`, `setupSha256`, `limitations`; status is
`REVIEWED_FOR_BOUND_WLAN_OFFLINE_ATTEMPT`. Its ordered limitations must be
`POLLING_RACE_NOT_ATOMIC`, `LOOPBACK_AND_INTERNAL_SWITCH_REMAIN`,
`HOSTILE_OS_BROKER_UNPROVEN`, `RECOVERY_HELPER_OR_POWER_FAILURE_UNPROVEN`,
`REASSOCIATION_NOT_INTERNET_PROOF`. No old native firewall receipt is consumed or
falsely accepted for this method. The current recovery capability blocker is an
additional stop, regardless of any approval strings.

Future output paths are fixed external `attempt-<RunId>` and checkout
`apps/recognition-lab/runs/exploratory/private-offline-<RunId>`. The wrapper and
network binding expose no command/root/profile/model overrides.

## Evidence actually run

PowerShell 7.6.5, existing Python 3.12.14 and installed Node; no dependencies added.

| Evidence | Result and limit |
| --- | --- |
| AST/C# and focused tests | 93 PASS in `checks-final.log`; source/strict binding, immutable record/order, unknown uplinks/routes, approval negatives, mocked before/after-disconnect/parent/timeout/isolation/restore failures, fixed commands, one-shot exit 2 and denominator 20 |
| Generated Python job | Actual child killed and job drained on mocked isolation loss; no private model/pixels |
| Detached-helper generated native probe | **BLOCKED**: child remained in host job; suspended child terminated before effect; parent-death independent survival and WLAN recovery not demonstrated |
| `Plan` | Actual read-only connected inventory/hash checks pass; preparation status only |
| `Run` without published approval | Actual exit 1 `COORDINATOR_PUBLISHED_OFFLINE_APPROVAL_REQUIRED`; no external/private attempt output or effect |
| Software inventory | Actual read-only byte comparison PASS with original software SHA; executable provenance remains unresolved |
| Final network inspection | Original profile still connected and bound routes present; disconnect/reconnect NOT RUN |
| `git diff --check` | Exit 0; inherited line-ending notices, no Git mutation |
| Actual private decode/inference, old admin/firewall test, E05 | NOT RUN |

Tests replace the network and private operation boundaries explicitly. Their
synthetic records/rows are not approved gate evidence. The final test summary
correctly says `DetachedRecoverySupported:false` and
`OperationalGate:BLOCKED_RECOVERY_CAPABILITY`. Earlier preparation failures are
retained or documented: first Plan rejected prior base bytes; an initial test
used reserved PowerShell keyword `Sequence` and failed parsing before running;
the first native probe raised the recovery-capability error. Naming was corrected,
native error classification was made precise, and the tests now assert refusal
rather than misclassify the blocker as success. No blocked network action was
retried. Incremental and final logs/fixtures remain in the external root.

## Preservation, lease and next action

`preservation-final.json`, `lease-release.json` and `frozen-handoff.json` record
642 original source paths and 63,930 protected ignored/external entries checked
unchanged, including all 49 private intake files and prior runners/evidence/
environment/model/setup. The fresh baseline captures the current base executable;
it does not claim that the October 4 executable remained unchanged before this
task. The original workflow bytes were restored exactly with lease null. This
new handoff is the only repository addition. No project-state/coordinator ledger,
existing code/test/package/schema/contract/preprocessing/Git file was changed.
Inherited dirty Git state remains inherited. No phone, APK, Docker, native build,
services, spending or other external effect occurred.

Coordinator next action: audit this stopped source, confirm the runtime drift
and actual recovery-capability blocker, and record the operational route as
blocked. Do not author an approval that treats 93 generated/source checks as
proof of actual offline/recovery execution. A supported independently verified
recovery context would be needed for any later reconsideration using existing
founder authority. Read-only entry points for review are:

```powershell
./Invoke-OfflineExploratory.ps1 -Mode Plan
./Test-OfflineExploratory.ps1
```

No execution launch is recommended for the present host. All private-execution
and exploratory acceptance gates remain open.
