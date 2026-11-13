# C8 stationary-chart slot — reviewed source correction dispatch

2026-10-22, Africa/Lagos. Mode implement; bounded persistent capture/export
authority. Founder approved the controlled follow-up/tool update and explicitly
requested same6.1 High for implementation, Low for fixed testing. D-058 records
the amendment. No phone is needed in this SOURCE/generated-check slice.

## Outcome and reviewed design

The last camera/save/export succeeded. Missing two reliable marker measurements,
stationarity/timing/display observations leave geometry INCONCLUSIVE. Read the C7
device audit/readiness report, current PROJECT_STATE and existing camera source.
Do not diagnose this as another lost photo or repeat P1/photos/boxing/labels.

Add exactly ONE new isolated chart slot with preselected future job UUID
`76d28e3f-cdcd-4d1a-a86e-026e2568ce5e`, independent of consumed C7. Only an
explicit stationary-chart action may admit that slot. No caller-chosen job/path,
"latest image" search, wildcard export, queue, retry or reset. The unchanged
camera ingress, recipe, CPU model and durable finalizer are reused, never bypassed.
One future capture/inference, not execution now. Ordinary business/recognition
contracts and P1/generated flows stay outside scope.

Existing design options considered: reset C7 would destroy its one-attempt truth;
generic exporting would expose unrelated evidence. Reject both. One additional
fixed, append-only slot is the approved narrow correction; internal helper
decomposition may vary, but the persistence/capability contract below is fixed.

### Fixed sidecar and one-capture authority

Use a separate owned canonical sidecar named `camera-geometry-c8-v1` under app
files, never inside old camera-proof-v1 or C7 export root. Allow only `intent`,
`export-attempt`, `export-terminal`, each<=4096bytes, within the second128KiB
bookkeeping allowance. Require owner/type/single-link/canonical and exact names;
partial/torn/unknown/duplicate/corrupt data refuses, preserved. No overwrite,
delete/cleanup, rename-based replay, .bak or general file API. Record version,
fixed slot/job/target, hashes and exact field grammar; bounded strict parsing,
checksummed records and verified file/parent directory barriers precede authority.
Preallocation is not required because exclusive immutable small files are bounded.
Existence of this root, even empty residue, consumes future capture availability.

First explicit capture uses the existing process-wide camera/shared-busy admission,
valid permission/readiness/layoutA/FILL/rear/minimum zoom and no pending work.
Validate a strict non-data-bearing readiness acknowledgement and compiled target
binding, not a JS job/path/URI. While holding genuine current admission, durably
create `intent` BEFORE reserving/copying/capturing any photo. Bind fixed job,
schema/slot, target ID+SHA, new C8 runtime source pin and actual installed capture
APK hash, legacy store owner, model/recipe, process ID, declared layout and
monotonic intent time. Human readiness is a claim, not sensor/target attestation.
No inferred known exposure timestamp or verified stationarity.

Reserve exactly the fixed job with the original Store cap/owner/duplicate checks.
Introduce only a narrowly named internal method for this fixed ID; retain generic
reserve behavior for existing callers. No externally supplied alternate IDs.
Append C8 purpose/intent hash/target/runtime source+APK bindings into this job's
native-created request.json before SDK authority. Keep existing incoming six-field
CameraRequest and legacy receipt contract usable. Before returning the ticket,
recheck binding and readiness/closed state. Any later cancel/setup/write/SDK/model
error leaves consumed intent/reservation and current actual owner semantics.
No second capture after crash, failure or cancellation. Existing explicit recovery
may classify old interrupted camera storage; it must never rearm this C8 slot.

On reopen, parse and verify the intent as evidence only. A missing/partial intent,
an absent/unfinished/FAILED/CANCELLED/INTERRUPTED/mismatched job cannot export or
capture again. Complete PUBLISHED fixed-job data may be exported later, including
after restart, but cannot recapture. Store common root/scan must validate both
sidecar footprints before trusting aggregate usage. No dependence on volatile
eligibility or an ID supplied by UI after capture.

### One new bounded export

Expose explicit "Export stationary chart evidence" for only this fixed slot.
Before a picker, owning Store must verify exact PUBLISHED complete eight-role
profile, no residue/invalidation, all bound hashes and no unresolved work. Match
request/intent/job/legacy owner/model/recipe/runtime capture provenance; hash JPEG
and PNG actually saved for this job. Their hashes cannot be known before capture:
they come from validated immutable commit/receipt, not user input. Never relax the
old C7 exact original JPEG/PNG pins or pretend those pins identify a new photo.

Durably append `export-attempt` before picker dispatch, binding intent, done/
resolution/raw/preview/numerical hashes, unique request ticket, fixed output cap
and current exporter source/APK. Only that one attempt, even cancellation/error/
restart; root/record corruption refuses. Append terminal status+bundle count/hash
if and only if justified. Failed/incomplete/torn output is not a verified export.
No claim that process-local flags prove drain or persistence. No terminal status
can rearm a slot; no unknown work release.

New picker request code31008, distinct from C7=31007/P1=10000–23000/generated40000+.
Use shared busy, callback-once identity, lifecycle/cancellation/late-callback drain
rules already audited. Never launch another operation while picker/write may act.
Throwing dispatch is conservatively retained if callback registration is uncertain.
No Activity teardown or stale callback may clear another job's ownership.

Use the existing explicit local Downloads selection/policy, empty regular seekable
single-link rw descriptor, no truncation/selected-document deletion, capped output
count+hash, sticky write errors, fsync+readback+close requirements. Nine fixed safe
entries, raw.jpg/preview.png/numerical.json/receipt.json/request.json/reservation/
done/resolution plus manifest.json; existing role caps and<=16MiB total with ZIP
overhead. Manifest binds fixed C8 slot+target+intent/request facts and distinct
capture/exporter APK/source. No directory dump, raw tensor fiction, decode/EXIF
repair/recompression, re-inference or arbitrary bridge bytes. Provider-directory/
power-loss durability remain false. C7 consumed root/guard/output remain unchanged.
Reuse small existing primitives where semantics actually match; no general-purpose
export framework or blind repurposing of unrelated P1 formats.

### Cap and provenance amendment

Aggregate logical owned-file cap remains268435456. Permanently reserve two
16908288 allowances, each16MiB output+128KiB sidecar:33816576total; camera
sub-budget becomes234618880. Enforce common admission/read/write/reopen paths,
report camera vs per-slot/aggregate claims separately. No eviction/allowance release
even before attempt/after cancel/success. Existing oversized state refuses unchanged.
SDK-cache/peak-RAM/physical-allocation unknowns remain separate D-054 limits.

Preserve every old run/STOP/APK/ZIP/source-index; snapshot current dirty C7 sources
before editing rather than rerunning old indices against intentionally changed
current source and calling them corrupt. C7/legacy owner are historical provenance,
not the current C8 runtime binding. New complete source index must cover every new
runtime/target/helper input. Derived C8 source constant may use the independently
indexed deterministic rendering rule with separate output hash, avoiding self hash.
Actual installed APK is computed at runtime, capture and exporter provenance never
guessed. Do not regenerate historical C7 pins/indices or rewrite old records.

## UI, chart and next physical readiness

Camera-only UI adds one explicit stationary-chart acknowledgement and capture
action plus its saved export/cancel/status. No capture on mount/ready or automatic
export. Show consumed/incomplete state honestly; prevent duplicate actions across
rerender/unmount/reopen. Capture needs supported phone placement and frozen target;
permission/foreground/readiness/generation are rechecked before actual SDK call.
Preserve existing capture finalization and result invariants. No broad business UI.

Prepare a deterministic high-contrast black/white generated chart900x1200 with
eight large numbered asymmetric fiducials, orientation cues/grid/border; no product
image. Produce it locally with installed plotting/Pillow tools, source and manifest
at new task-owned ignored target root; compile its exact target ID/hash into C8
intent binding and source index before handoff. Keep old target/a2/images intact.
Document original pixel centers/outer edge definitions. No display or phone action.

Prepare a concise later observation checklist: stable phone support and stationary
chart; visible measured display dimensions; actual preview rectangle; tightly
bracketed generated-only preview screenshots with start/end timestamps around ONE
capture. If the result modal hides preview, use explicit close after drain and
record delay/uncertainty; do not call it simultaneous exposure. No video API,
microphone/storage permission or general screenshot service. Future executor may
record only approved generated-only screen evidence. Independent manual/edge
coordinates must record<=2physical-pixel annotation uncertainty;1% residual and
1source-pixel rounding thresholds unchanged. No fitted corrective transform or
claiming display/hand steadiness from code. Missing physical evidence stays unknown.
The exact physical packet/confirmation follows source/build review, not this slice.

## Ownership, files, checks and stopped return

Same Track B writer01a1051f-0777-7573-ad09-0e550a4bd56a, Sol6.1High, sole writer
finite6hour lease. Coordinator stops mutations after dispatch; no simultaneous
audit. You are not alone: preserve all others' dirty/untracked work; no child agent.
Exact worktree COSI-m8-planning, plan/m8-unified-scanner, HEAD374286d.

Own isolated CameraProofStore/Files/Android, new C8 slot/export/state helpers,
RecognitionExperimentModule camera-only functions, Panel/nativeAdapter/small
protocol helpers, focused tests, source binding/check helper, generated target and
task handoff. No new dependency/provider/manifest permission/JNI/business/shared
contract/model/recipe/package lock, old run or installed node_modules edits.
Fresh root `apps/recognition-lab/runs/phone-experiment/p2-camera-geometry-c8-source-20261022-a1/writer/`.
Verify absent, fresh before snapshots/indices and after exact deltas. Check applicable
AGENTS/current truth and coding/testing/security skills before changes.

Meaningful generated checks against production boundaries: fixed slot success,
other/caller-chosen job refusal, intent/done/request hash mismatch, all crash windows
before/after intent/reservation/commit/export guard, reopen never recapture/retry,
original C7 consumed/unchanged, target/source/APK claims, cap boundary including both
allowances and torn residue, no eviction, permission/readiness/lifecycle cancellation
and stale callbacks/busy ownership, no model/capture during export, local/remote/
nonempty descriptor refusal, shortwrite/sync/readback/close failure. Existing camera
durability/recovery/finalization/UI/config/isolation and C7 controls must retain
their claims. New unknown future JPEG positive test uses generated verified data,
not a forged physical-pass flag. Type/lint and actual Java/Kotlin source compile
with cached tools permitted; no Gradle/native/APK build or downloads. Preserve first
failures and limits; no retry-until-green or assertion/tolerance weakening.

If the exact schema/sidecar count/authority/cap/ingress design cannot be met, STOP
with concrete evidence/proposal before broader implementation. No phone/ADB/install/
picker/export/capture/model/radio/Git/CI during this slice. At end STOP commands/
edits, release lease, write exact files/hashes/check receipts/failures/remaining
Android/physical uncertainty. Human expressly authorizes ONE direct handoff to main
01a098ef-d830-7531-bca7-2d66b0a5b587 after STOPPED; show founder the handoff path too.
No silent finish or automatic next build/test. P2-03/G4 and P2-04/later remain held;
GitHub/CI repair deferred. Later fixed test Low, implementation/correction/audit High.
