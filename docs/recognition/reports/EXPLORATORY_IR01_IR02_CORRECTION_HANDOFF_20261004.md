# IR-01 / IR-02 correction handoff — October 4, 2026

**Implementation preparation complete; STOPPED for coordinator audit after lease
release. Administrative/native controls NOT RUN. E05/private inference NOT RUN.
The original setup still has `networkReviewed: false`.**

This handoff implements the coordinator-requested immutable recovery correction
and fixed private worker/evaluator lifetime path. It does not close the native
gate or grant private execution permission. No actual approval, accepted receipt,
or reviewed network setup was authored. No UAC, elevation, firewall mutation,
installation, service, global configuration, or Git operation was performed.

Checkout: `C:\Users\doyew\Documents\DEV 2\COSI-m8-planning`.
Branch: `plan/m8-unified-scanner`; HEAD:
`66ea3fc22595a48d7355d1729bb879496cc98896`.
Writer: `01a1051f-0777-7573-ad09-0e550a4bd56a`.
Coordinator: `01a098ef-d830-7531-bca7-2d66b0a5b587`.
No new agents or chats were used.

## Frozen artifacts

New external root (retain it; it is not Git-synchronized):
`C:\Users\doyew\AppData\Local\Temp\cosi-exploratory-isolation-ir01-ir02-20261004`.
The original `cosi-exploratory-isolation-20261004` root and its earlier handoff
remain untouched. The correction source is a new copy, not a replacement of
the previous evidence.

| Artifact in the new root | SHA256 |
| --- | --- |
| `Invoke-ExploratoryIsolation.ps1` | `a3b211813d896c56982756f12a7f88fb17c65828fc55c2253d4be5a5790b523f` |
| `Test-ExploratoryIsolation.ps1` | `c6888b0965cdb8bc7a55207ddd6565535ff8ec3608ceb68163833fa4f53c86c7` |
| `Test-RecoveryAndPrivate.ps1` | `c9ad970edeaed7d4f04c35a3dab7570b6ee111dc1687603dcb4dbec46a83b037` |
| `runtime.json` | `360ad62ab009d50cc010bf14fa7fcd9f960c626f9df5f04e51b8668f83706ae2` |
| `baseline.json` | `deabe1885d2ee5515d108f588bd7c53912085434996d96b77693bbeff125dd93` |

The runtime manifest is hash-bound in the wrapper. It binds the existing venv
launcher, actual shared base Python, exact installed Node evaluator executable,
prepared study, model, recipe, software inventory, fixed private root and all
40 study asset paths/hashes. No model, dependency, source, or image was changed.
The reviewed producer/evaluator fingerprint remains
`1df885b33fe752ac2c81fa9a7e4b7bfa432a9bddb1b1d63435643245831b8cb0`.

| Fixed input | Binding |
| --- | --- |
| Study | `apps/recognition-lab/runs/exploratory/e01-e03-20261004/private-study-prepared/study.json`, SHA256 `96c846a453cfd0edded23ab0e2dad3d67d4d88c97aca9a38f7efb91a624c3409` |
| Private root | `apps/recognition-lab/private-data/r1-pilot`; exactly 40 study entries |
| Model | Existing `mobilenet_v3_small.tflite`, SHA256 `bbbb4c51a55a53905af1daec995ca1aae355046f8839bb8c9f5ce9271394bc40` |
| Recipe | SHA256 `ac67af950aed4789c275425b93e8816cf0950f2d6bd01a199879a011b669b81a` |
| Software inventory | SHA256 `3d727c07763d95c0865cd975581a3690e8bbe6718a9eb8f24dd397af6c69989e` |
| Original false setup, preserved | SHA256 `42d15c1ff79e754adfbd82a1c2692a3130a4286eb6e03640cdde54a0e9a06616` |

## IR-01: recovery authority survives status failure

The old issue was source-traced, not reproduced by physical power loss. Its sole
mutable `journal.json` could be truncated by a later status write after a rule
had been created, losing the exact recovery authority.

The new `recovery.json` contains the complete two-rule set before the first
`New-NetFirewallRule`. It binds owner, both exact names/groups/descriptions and
programs, wrapper/runtime/source hashes, run/mode and private authorization hash.
Both names must be absent in PersistentStore and ActiveStore. The writer uses
exclusive `CreateNew`, `WriteThrough`, `Flush(true)`, disposal, byte-hash comparison
and strict JSON re-read. It confirms the hash only after the write completes.
A failed initial write permits no rule creation and cannot be retried by
overwriting that file.

Status observations use fresh `status-GUID.json` files. They never replace
recovery authority. Before each creation and removal, the bound recovery bytes
are checked. Cleanup requires confirmed empty owned child jobs, no other matching
Python interpreter, exact ownership and program identity. Ambiguous ownership,
damaged authority or uncertain child lifetime retains rules for operator review.
There is no wildcard removal or automatic orphan-recovery command. An operator
must inspect the immutable record, exact remaining rules and child lifetime;
the record alone is not proof that cleanup is safe after a host interruption.

The generated discriminator extracts the actual old `Save-Journal` body and
injects a partial status write after simulated persistent creation. The old
journal becomes unreadable. The equivalent new status failure leaves the full
two-rule record parseable and its hash unchanged. A separate failed initial
record test proves zero first mutations. This is fault-injection evidence, not a
claim of hardware/controller durability under every power-loss condition.

## IR-02: fixed private path under the same active rules

`Private` is an implemented executable path, not an arbitrary command pass-through.
It requires an active administrator token before operational effects. Like
`VerifyGenerated`, it refuses disabled profiles/local rule merging, existing
attempt output, unowned matching Python processes and non-public control literals.
The runner never elevates or changes firewall profiles.

Private approval preflight runs before network controls or rule creation. It
requires a coordinator-published SHA256 of a separately authored E04 authorization
record, bound to this exact wrapper/runtime/source and run. It verifies the
separate setup, original producer approval, network-review record and independently
accepted actual administrative generated-native receipt before hashing private
assets. Merely changing a setup flag or presenting mock rows cannot pass.

The run then obtains fresh native positive controls from both Python executable
paths for IPv4 and IPv6, creates the two Any-protocol outbound Block rules,
inspects effective filters and obtains four explicit native Winsock 10013 blocked
results. Timeout, refusal, unreachable or a missing IPv6 result fails. A fresh
in-memory gate binds the exact owner and recovery hash. A prior receipt cannot
substitute for this same-active-rule gate.

Authorization/input checks repeat immediately before the private stage. Its fixed
producer command uses the existing `producer.py`, venv launcher and fixed study,
root, model, setup, software, approval and fresh output paths. It retains the
original producer guards and imports. Its fixed evaluator command uses the bound
Node executable and original `exploratoryCli.ts`. The producer is invoked once;
only its existing complete/incomplete exit codes 0/2 permit one evaluator call.
No bundle or scores are fabricated if the worker fails earlier.

Both processes launch suspended, enter an owned Windows job before resuming,
retain kill-on-job-close and an eight-process limit, and have bounded timeouts.
The wrapper checks effective rules every polling cycle while each is running
and again after each returns. It leaves the same rules installed through the
producer and evaluator. Cleanup occurs only after confirmed zero descendants;
an exception during a live-policy callback closes the job and conservatively
leaves lifetime unconfirmed, preventing rule removal.

The fresh immutable attempt claim and status retain a denominator of 20 queries.
Original producer/report partial results and exit 2 remain incomplete. Reusing
either attempt directory is refused; there is no automatic retry. Actual
end-to-end private execution, private decode and inference remain NOT RUN.

## Future approval package: exact paths and contracts

These records are deliberately absent. The coordinator must independently
review real native evidence and author/publish the approval package; this writer
has not authored an operational positive example or promoted any gate.
For a single approved `RunId`, paths are fixed:

| Record | Required path |
| --- | --- |
| Published E04 authorization | New external root: `authorizations/<RunId>.json` |
| Separate reviewed setup | Checkout: `apps/recognition-lab/runs/exploratory/isolated-approvals/<RunId>/setup.json` |
| Original producer approval | Same approval directory: `approval.json` |
| Network review | New external root: `authorizations/<RunId>.network.json` |
| Accepted prior actual native receipt | New external root: `native-acceptance/<RunId>/receipt.json` |
| Future private outputs | Checkout: `apps/recognition-lab/runs/exploratory/private-isolated-<RunId>` |

Authorization has exactly these 18 keys: `schemaVersion`, `status`,
`authorThreadId`, `runId`, `runnerSha256`, `runtimeSha256`, `sourceSha256`,
`studySha256`, `modelSha256`, `recipeSha256`, `softwareSha256`, `setupSha256`,
`producerApprovalSha256`, `networkReviewSha256`, `approvedNativeReceiptSha256`,
`controlIPv4`, `controlIPv6`, `controlPort`. Schema version is 1; status is
`APPROVED_FOR_ISOLATED_PRIVATE_RUN`; author thread is the coordinator above.
All hashes must bind actual files/current inputs; control literals and port must
match both the accepted receipt and launch arguments. The externally published
authorization hash is required as `-AuthorizationSha256`.

Setup uses the existing nine-key schema and actual boolean reviews. Producer
approval uses its existing six-key schema/status. Network review has exactly
`schemaVersion`, `status`, `authorThreadId`, `runnerSha256`, `runtimeSha256`,
`sourceSha256`, `setupSha256`, `softwareSha256`, `modelSha256`, `receiptSha256`,
`limitations`; status is `APPROVED_FOR_THIS_ISOLATED_EXPLORATORY_RUN`.
Its ordered limitations must be `TCP_CONTROLS_ONLY`, `UDP_ICMP_UNOBSERVED`,
`LOOPBACK_UNISOLATED`, `BROKER_DNS_PROXY_SERVICE_HELPERS_UNPROVEN`,
`SHARED_BASE_INTERPRETER`.

The accepted receipt must be the exact current-wrapper actual
`COMPLETED_GENERATED_NATIVE_CONTROL_RECEIPT`, evidence class
`ADMINISTRATIVE_NATIVE_OBSERVATION`, with all 12 positive/blocked/post-cleanup
rows, executable/family/result bindings, log hashes, recovery hash, controls and
Any-protocol rule scope. Only a successful real `VerifyGenerated` sequence writes
this receipt. Generated tests do not write an accepted receipt.

The published checksum plus independently reviewed author identity is an
operational provenance boundary, not a digital signature. A local administrator
could fabricate files. The runner assumes a coordinated honest operator and
unchanged bound files; it is not a sandbox against concurrent hostile host
mutation. The coordinator must establish provenance from its own authored
records and audit the original logs/effective filters, not trust a status string.

## Evidence and limits

PowerShell 7.6.5 ran the final checks; the runner requires 7.5 or newer for strict
JSON parsing without automatic date conversion.

| Check | Result and evidentiary limit |
| --- | --- |
| `Test-ExploratoryIsolation.ps1` | 45 PASS; AST/C# compilation, runtime/source binding, actual generated job quoting/timeout/descendant drain, actual medium-token denial and read-only process preflight |
| `Test-RecoveryAndPrivate.ps1` | 60 PASS; generated partial-write discriminator, failed initial record, immutable authority, no overwrite/unowned removal, duplicate-key rejection, approval/receipt negatives, fixed command arguments, stale-session/refused-retry/incomplete sequencing, actual generated job killed on policy-check exception |
| `Plan` | Pending status; administrator false; network promotion false |
| Original Node CLI `fingerprint` | Exact unchanged `1df885b...b8cb0` |
| Read-only firewall inventory | Zero matching rules in both stores; no native creation/removal attempt |
| Actual administrative native controls / private run | NOT RUN / NOT RUN |

Final logs: `self-checks-final.log`, `ir-checks-final.log`, `plan-final.log`,
`firewall-readonly-final.json`. Incremental logs and generated fixtures are
retained, including the first new-check failure: its expectation incorrectly
treated absence of rules as an ownership rejection. The test was corrected to
present an unowned simulated rule and assert zero removals. No actual rule was
created and this did not represent a native/source failure.

Any-protocol effective scope is inspected, but observed native controls cover
direct TCP only. UDP/ICMP, loopback, brokered DNS/proxy/service/helper routes and
other program paths remain unproven. The two firewall rules match Python paths;
the fixed Node evaluator is hash-bound and job-contained, but is not itself
covered by a Python program rule. The network review must account for this
helper-path limitation. Job containment controls lifetime, not network access.
The base interpreter is shared; its no-other-process preflight does not reserve
the executable against another job starting later. These gaps are not waived.

Final preservation evidence is in new-root `preservation-final.json` and
`frozen-handoff.json`: 639 original source paths and 63,801 protected ignored/
external entries checked unchanged, including all 49 private intake files,
original runs/environment/model and prior evidence. This handoff is the only
repository addition. The owned lease was restored from exact original workflow
bytes; the release record is `lease-release.json`. Existing untracked dirt is
inherited, not this task's output. No project-state or coordinator ledger was
edited. The external `source-delta.patch` permits direct review against the old
runner, and `frozen-handoff.json` binds the final logs and this document.

## Coordinator next action

Audit the frozen correction, distinguish generated/mocked checks from native
evidence, and retain administrative/private gates. The following commands are
reviewable future entry points, **not launches performed by this writer**:

```powershell
# Read-only/local checks from the new external directory:
./Invoke-ExploratoryIsolation.ps1 -Mode Plan
./Test-ExploratoryIsolation.ps1
./Test-RecoveryAndPrivate.ps1

# Separately authorized administrative generated test, reachable literals chosen
# and independently approved by the coordinator; use a fresh RunId:
./Invoke-ExploratoryIsolation.ps1 -Mode VerifyGenerated `
  -RunId <fresh-generated-id> -ControlIPv4 <public-v4> `
  -ControlIPv6 <public-v6> -ControlPort <approved-port>

# Only after accepted actual native evidence and independently authored/published
# approval files above; this obtains fresh controls under the retained rules:
./Invoke-ExploratoryIsolation.ps1 -Mode Private `
  -RunId <approved-private-id> -AuthorizationSha256 <published-E04-sha256> `
  -ControlIPv4 <approved-v4> -ControlIPv6 <approved-v6> -ControlPort <approved-port>
```

IR-01 and IR-02 implementation preparation is reviewable. Administrative native
integration, actual private producer/evaluator integration and E05 acceptance
remain pending and cannot be inferred from these 105 passing checks.
