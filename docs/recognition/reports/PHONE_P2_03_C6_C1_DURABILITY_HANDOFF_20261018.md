# C6-C1 durability correction — STOP for independent source review

2026-10-18, Africa/Lagos. Implements the coordinator's C6 changes-required
review under D-056 and its exclusive six-hour source/generated-check lease.
Founder also requested resuming phone verification. That request remains pending
this required correction/review; no repaired APK or physical test is claimed.

## Defect and correction

The C6 review demonstrated that a renamed, visible resolution could release its
reservation even after directory fsync failed. That was a confirmed Store decision
gap on generated HostIO, not an observed Samsung power-loss event.

CameraProofStore.IO now requires syncDirectory. At the start of every scan, after
root validation and before trusting owner/commit/resolution/invalidation or doing
capacity accounting, Store establishes this verified namespace barrier. Every
accepting status, reserve, recover, numerical-readiness and interrupted-inspection
path uses scan; construction/reopen also uses it. There is no process-local flag
that forgets uncertainty. Persistent failure throws before readiness/admission
or a released-capacity status can be returned. A later successful barrier can
acknowledge valid existing records without replaying publication or rewriting
their bytes. The original conservative reservation/CAP arithmetic remains.

Android CameraProofFiles opens the canonical owned directory with public
O_RDONLY/O_NONBLOCK/O_NOFOLLOW/O_CLOEXEC, checks the descriptor is a directory
with matching UID/device/inode, calls fsync, then rechecks the named directory's
identity. NONBLOCK avoids FIFO blocking; Java's public OsConstants does not
expose O_DIRECTORY. Every OS error keeps its bounded safe stage/errno. A close
failure is primary only when there is no earlier failure, otherwise suppressed
on that original failure. No fsync suppression, retry loop or alternate root.

Inspection/status still do not rewrite file names or contents, but now explicitly
establish directory durability before reporting accepted evidence. JNI publication,
no-replace semantics, all C6 recovery rules, owner/source format and native/JS/
build/permission/dependency/model/recipe code are unchanged.

## Exact delta and evidence

Fresh run root:
apps/recognition-lab/runs/phone-experiment/p2-camera-storage-c6-c1-source-20261018-a1/.
Its before.json/before-*.bin compare against stopped C6, not HEAD or C5.

Changed three existing files under the cpu-runtime module:

- src/main/java/.../CameraProofStore.java: required IO barrier and shared scan call.
- src/main/java/.../CameraProofFiles.java: verified directory fsync implementation.
- src/test/java/.../CameraProofChecks.java: explicit logic-only HostIO implementation;
  it is documented as no evidence of real host/Android fsync.

New CameraProofDurabilityChecks.java separates visible file names/hashes from
durably acknowledged names/hashes. New tools/scripts/phone-camera-storage-durability.py
uses a fresh evidence root, checks the current unexpired coordinator lease,
preserves old C6 helpers/STOP, and pins source inputs before compilation and
checks them before/after every generated-suite command. Source binding is external;
legacy owner remains ownership only, not current runtime provenance.

| Evidence | Actual result and limit |
| --- | --- |
| failure-before.json | New durability-aware test fails against pre-correction C6: persistent directory sync failure did not refuse status. Actual Store, generated fake; no Android execution. |
| focused-final-a1/result.json |188 durability assertions,215 recovery assertions and134 finalization assertions pass (537 total), fresh actual pure Store/Lifecycle/Finalizer on generated files. |
| android-final-a1/result.json | Current camera Java sources compile against pinned Android36/LiteRT jars; no Android execution. |
| protected-c6-inputs.json |46 selected C6 source inputs outside the three allowed files remain byte-exact, including all JNI/C/build/JS/config/helper inputs. |
| self-review.json | Direct fresh boundary review, not independent assurance. |

The durability model injects rename success followed by persistent flush failure
for INTERRUPTED and PUBLISHED resolutions and sibling done/invalidation markers.
It verifies repeated status/reserve/recover/numerical/inspection refusal, refused
reopen under a different process ID, no changed bytes or false durable
acknowledgment, and later successful same-process/reopen barriers. Resolved
classification is idempotent, capacity releases only after acknowledgment, a
published result stays readable after success, interrupted/invalidated numerical
results remain refused, and old bytes remain preserved while needed classification
is appended. This does not demonstrate actual kernel/storage power-loss behavior.

The initial Android compile refused unavailable Java O_DIRECTORY; corrected using
public O_NONBLOCK plus descriptor validation. The intermediate focused-a1 compiled
an earlier185-assertion test before three assertions were added while later suites
ran; old helper settlement-time source hashes were insufficient for that mixed
revision. It is retained and explicitly excluded from final source-bound proof.
intermediate-check-notes.json explains this. The final runner captures immutable
inputs before javac and checks them across each command. No receipt is overwritten,
assertion waived or timeout increased.

C6's36 UI/protocol/isolation/config tests, TypeScript/lint and eight NDK syntax
invocations remain historical, with their unchanged source inputs reverified here.
They were not rerun for this Java-only correction. The stopped63/115 broad history
sweep and cold-render timing issue remain unresolved.

External51-input source-index.json SHA256:
edaab3d41029fb6a72f0fc72f8190633b2b7c17a450545ca49df13f04364335d.
All old C6/C5/C4 artifacts, STOP records and reviewer counterexample are preserved.

## Stop and next action

Writer STOPPED for coordinator independent audit. Review the shared barrier's
consumer coverage, Android descriptor checks/primary-error retention, reopen
behavior and the separate visible/durable test oracle. The earlier review fixture
only overrides publication: to model persistent failures at the new IO boundary,
a reviewer fixture must also fail syncDirectory, rather than inherit HostIO's
explicit logic-only success stub. New DurableIO does that directly.

The phone connection was checked before this correction lease: expected C5 APK
d23ce001...175a69 remains installed, device RZCX22H432K connected and2,133,606,400
bytes free. Evidence p2-camera-verification-request-20261018-a1/connection-result.json.
No app launch, installation, private-record inspection/recovery, capture or model
request accompanied that check. No phone commands occurred during this correction.

After source acceptance, continue the founder-requested phone verification through
reviewed generated Android storage smoke, exact native/APK static checks, and a
data-preserving update. Actual old-record inspection must prove eligibility before
classification; a target photo follows only after storage gates and founder aiming.
JNI loading, Android filesystem/fsync/no-replace behavior, minSdk24 packaging,
physical durability/geometry and P2 acceptance are not established by these checks.
No native link/APK build, probe install, device action, dependency/CI change or
Git commit/push occurred in this correction. GitHub repair remains deferred.
