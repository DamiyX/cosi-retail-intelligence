# Orientation UI readiness — diagnosis and bounded source correction

2026-10-25. No geometry photo/preview screenshot has been taken (0/8,0/16), no
case admitted. Medium stopped before Restore preview. Founder manually opened
the chart; browser control stays stopped after its URL-policy guard.
New founder endpoint192.168.1.9:41191 connected once by main, known hardware
verified; no app/camera effect. Connection receipts are in
p203-orientation-ui-diagnosis-20261025-a1/. Founder confirmed continuing the test.

## Two established source defects

1. CameraOrientationPanel Inspect invokes update(), which displays the parsed
   native status, then returns null to action(), which overwrites it with
   JSON.stringify(null). Actual UI showed M00 but literal null; required native
   idle/capacity/generated/nonce evidence was hidden. Preserve the actual parsed
   status after one inspection, including errors; no extra native effect.
2. The installed Expo PermissionsHook.ts initializes its status to null and gets
   permission asynchronously. Panel initializes polledGranted=false at that time,
   later requires BOTH hook grant and this independent flag, but never updates
   the flag on hook resolution. Foreground polling and the stale hook can also
   disagree after Settings. Android's own-package record says CAMERA granted=true.
   Current UI tests mock granted=true synchronously, masking the real mount path.
   This proves a permission-state defect and strongly explains the observation;
   no device-side revocation or permission-setting correction is indicated.

## Same Track B High source-only assignment

Main diagnosis stops; sole writer uses Sol6.1High in the same COSI-m8-planning
workspace/branch. Preserve all dirty/untracked work and existing source700/C2
artifact/result/fixture/old journals. Claim finite lease and freeze task-start bytes.

Fix the two UI behaviours and add failure-before regressions. Prefer one coherent
permission authority: unknown/pending is blocked, actual asynchronous grant enables
the approved explicit preview restore, denial/revocation/background/unmount
invalidates readiness and cancels ownership appropriately. A stale earlier async
reply cannot restore a grant/readiness after a newer denial/background/unmount.
Do not request permission automatically, force a grant, require a bogus extra
Settings toggle, mount preview automatically or weaken native permission checks.
Inspect must leave readable actual status, not null/undefined, and retain error
codes without consuming a case. Inspect itself must not capture or export.

Test null->granted and null->denied on mount; foreground recheck/grant changes;
out-of-order responses and background/unmount; inspection text and no hidden
camera/begin/export. Inspect sibling patterns for the same fault, but legacy
disabled panels are not permission for unrelated refactors. Focused Jest/type/
lint and touched native/provenance boundaries suffice; no broad repeated suite.

## Necessary artifact/namespace consequences

A UI rebuild changes source identity AND signed APK hash. Existing completed
generated-export owner binds old source/APK, and the empty orientation camera
store may already bind old source. Do not loosen those checks, rewrite owners,
delete old roots, relabel old results or pretend new source is old700 pin5df65a.

Use a fresh fixed UI-corrected run/root/job/export-file namespace where required,
retaining profile/recipe V2 and unchanged model/pixel pipeline. Existing eight
photo authorization remains eight unused shots, not an extra set. Source-only
scope includes minimal fixed namespace/source-pin/reader/JNI/type/test wiring and
retained-history accounting necessary to preserve old evidence while opening the
fresh run. Keep old generated fixture and zero-photo namespace immutable.

Charge retained actual files/claims and settled fixture bookkeeping within the
unchanged256MiB cap. Old camera-run attempts remain zero. An unused old future
export allowance may be retired only through an explicit fail-closed check that
the fixed prior camera run has no case intents/in-flight claims and no first/final
export operation exists. Preserve owner/registry/refusals and completed fixture
bytes; validate the fixed prior source/namespace, and refuse if unexpected old
capture/export state appears. No uncertain reservation release, arbitrary root
reader, old-photo scan, eviction or cap relaxation. Test empty prior history versus
unexpected consumed/in-flight history and combined old/new capacity. If a broader
storage migration is unavoidable, stop with the specific obstacle first.

No camera-engine/geometry-amendment change, model/recipe/dependency/permission or
business-contract change. No APK/Gradle build, ADB/phone probe/action, new photo,
export, deletion/reset, Git/CI/P204/P205 or new agent in this source assignment.
The phone is unnecessary during coding. Keep documentation concise.

STOP/release and directly send one handoff with changed files, before/after test
evidence, exact source/namespace pins and compatibility/capacity limits to main.
Main audits before the next reviewed build. Reuse the corrected camera-enabled
staging/settings/merged-manifest precheck pattern; do not reintroduce the two
resolved packaging bugs. Any later generated-file recheck is the new identity's
small gate, not a repetition of old photography or the full interruption matrix.
