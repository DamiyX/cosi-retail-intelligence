# P2-03 export recovery S1 — independent source audit

2026-10-24. Decision: **source accepted for the frozen experimental recovery
scope, with Android/build evidence still pending**. No blocking source finding.
This accepts S1 only, not the APK, a phone operation, successful recovery or P2-03.

Comparison: the stopped writer's576-input before index against589 current after
inputs, with600-input exporter binding. Nine approved existing runtime paths
changed,13 approved focused additions,567 baseline inputs unchanged. Unrelated
dirty/untracked work is excluded. Main did not edit implementation source.

## Specification review

The new non-exported Activity registers its stable result callback independently
of React/Expo initialization. Native application ownership and durable records
replace the former in-memory-only export ownership. Captures/model processing
and original export endpoints refuse new work in this artifact; the recovery
panel mounts no camera. Old capture provenance stays distinct from the new
exporter provenance. The fixed historical reader rejects mutation/init operations
and checks sealed case/profile/source/APK bindings before producing output.

The exact current empty primary Downloads ZIP is the only actual destination.
WRITE is durable before output bytes; an ephemeral permit is not recreated after
restart. Consumed WRITE permits only read-only reconciliation, including when
output is empty. One deterministic bounded serializer supplies expected and
actual bytes; complete output is fsynced/read back and verified. Old export state
and all source records remain preserved; no new-photo or tolerance authority.

## Standards and boundary review

Inspected Activity/controller, URI/grant/descriptor handling, journal chains,
historical reader, serializer, footprint/OS-lock implementation, bridge/UI and
manifest/dependency changes. Exact path/provider, no truncation, regular/single-
link descriptor checks, identity checks, no-replace journal publication and
read-only original access support the approved narrow data boundary. Original
inode at the first Save remains unattested. Activity/worker lifetime and OS
ownership must still be exercised on Android; host FileChannel tests are limited.

Quota arithmetic independently checked:172+4+14=190KiB<=192KiB, original90MiB
output remains fully charged. Fixture64KiB is separately charged inside256MiB;
old export allowances remain. Historical aggregate arithmetic is not fresh device
free-space evidence. No total app RAM/cache bound or memory-leak finding follows.

## Evidence actually checked

- Exact handoff, stopped-writer, verification and exporter-index digests match
  the report. All600 unique source inputs,589 after hashes and four protected
  plan/failure inputs match current bytes;567 original baseline inputs unchanged.
- Main freshly compiled the scoped JVM sources with -Xlint:all, then ran six
  executables:66 recovery assertions,140 historical-reader assertions,14 lifecycle
  reconstruction assertions,385 matrix-evidence assertions,37 matrix-store
  assertions and67 C9 compatibility assertions. **709 passed**, all exits0.
- Verified13 builder command-receipt hashes/exits and reviewed reported28 tests/
  five UI suites, mobile types, affected zero-warning lint and offline Android
  Java/Kotlin/C syntax results. Those are builder results, not fresh main reruns.
- Scope/evidence: apps/recognition-lab/runs/phone-experiment/
  p203-export-recovery-audit-20261024-a1/. Main command0 is compilation;
  command1–6 are fresh test executions. No phone, build or external effect.

## Residual risk and next action

Old ticket loss is reproduced through its actual pure session; old prepared-
evidence loss is source-confirmed, with correction reconstruction host-tested.
Actual Expo old-result delivery was not traced. New Activity result/grant lifetime,
real process death, device locking and current capacity remain S3 evidence. CPU
checks and altered process tokens cannot establish those platform behaviours.

Offline compile used a cached Kotlin compiler and old reviewed artifacts. S2 must
prove the actual Gradle/toolchain/dependency graph, new APK/source binding,
non-exported merged Activity, permissions, signer/update path and native delta.
Coordinator authorizes this reversible local offline build/static preparation
under the founder's implementation request; this is no installation approval.

S3 generated lifecycle proof precedes S4 actual recovery. Prepare a concrete
bounded device packet; no phone effects until its review/required founder consent.
S5 original-image/phase/crop audit remains open. Four inconclusive preview markers
and unestablished strict scene gate remain separate from export acceptance.
P2-03 OPEN; P2-04 held, P2-05 and GitHub/CI repair deferred.
