# C7 saved-chart evidence export — approved source dispatch

2026-10-19, Africa/Lagos. Mode: implement. Risk: bounded private-file export and
persistent ownership. Same Track B writer, GPT-6.1 Sol High. Coordinator stops
source work after dispatch; writer stops and returns its handoff before audit.

## Authority, outcome and non-goals

Founder answered **“Approve the bounded export correction”** to the explicit
request to add export for the already-taken chart photo, to a user-chosen local
folder, without another photo or model run. This authorizes specification and
source/generated checks, not APK build, installation or actual export execution.
See D-057 and the C6 geometry-gap proposal dated20261019. The proposal is historical;
this dispatch supersedes its pending-approval status and finalizes its accounting
prerequisite. No new product architecture, provider or recognition algorithm.

Only job `9d763e82-2a00-42ce-9a5f-0f4b2d9fde5c` may be exported. Its original
capture APK is `80e717888f26091b9bd45a101b9dc548c05259238fdd4e6f18e1f9b1c2d86713`;
current reviewed source binding is
`edaab3d41029fb6a72f0fc72f8190633b2b7c17a450545ca49df13f04364335d`.
Legacy owner36004274... remains unchanged. Future exporter source/APK has separate
provenance. Capture/save/reopened-store observations passed; quantitative geometry
is INCONCLUSIVE. This correction supplies missing original-image evidence, not a
claim that the image will satisfy the unchanged measurement criteria.

## Coordinator-reviewed storage and ownership amendment

Keep D-054's aggregate logical owned-file bound at268435456bytes. Permanently
reserve16908288bytes:16777216bytes for ONE external document attempt and131072bytes
for all export-side bookkeeping, including partial/staged metadata. Camera retained
and outstanding-reservation claims therefore have a251527168byte sub-budget.
Enforce the same reduced budget on every production camera admission, reopen and
capacity/read path, not merely the export button. Report aggregate cap, camera
usage/claims, export allowance and sub-budget separately; preserve meanings of old
receipts. Existing records are never evicted or rewritten to fit. If pre-existing
claims exceed the reduced budget, refuse new work/export and preserve evidence.

The allowance remains charged even before export, after cancellation/failure and
after success. There is no automatic release, second attempt, reset or overwrite.
This conservative single-attempt design avoids treating an uncertain partial
provider document as deleted or harmless. Bound logical output bytes including ZIP
headers, central directory and manifest to16777216; bound every bookkeeping file
and its total retained/staged footprint to131072. No app-private ZIP staging,
bitmap decode, recompression or new tensor/model run is needed. Do not call this
an OS-wide, physical-disk-allocation or SDK-cache/RAM cap.

Use a separately owned bounded sidecar, outside the old camera-proof-v1 role
grammar; original owner, reservation/done/resolution and role bytes stay immutable.
Durably consume the one attempt BEFORE launching the picker. A canonical,
single-link regular-file, exclusive-create guard plus bounded append-only status
is sufficient if torn/corrupt/unknown states fail closed. File and verified parent
directory sync must precede authority to export. Never promote a merely visible
unsynced record. A crash before/after picker/write makes the attempt consumed or
uncertain, never replayable. Do not extend the JNI publisher to arbitrary paths.
Implementation details may be simpler within these invariants; incompatible
accounting or format changes require a stopped concrete proposal before coding.

Use CameraProofLifecycle.SHARED_BUSY for actual picker/writer ownership, with
unique request/ticket correlation separate from P1/generated export codes.
Cancellation and Activity destruction must not clear ownership while a write or
callback can still act. Late/stale callbacks cannot mutate another operation.
Reopen must conservatively refuse replay of incomplete/uncertain work and never
infer completed export from a process-local flag. No forced drain or retries.

## Data and destination boundary

Explicit camera-only UI action: “Export this saved test evidence”. Read through
the owning Store with complete validated PUBLISHED profile, all commit bindings,
role caps and hashes checked. Fixed ZIP entry allowlist: raw.jpg, preview.png,
numerical.json, receipt.json, request.json, reservation/done/resolution facts and
a bounded hash/provenance manifest. No other job, unresolved job, arbitrary path,
cache/directory dump, P1/private product content, model or tensor-file fiction.
Original JPEG includes its captured surroundings and EXIF, as approved. Preserve
raw SHA53f5e47841da5f42f28520ba5ce8d424052905cb998b8322de3fbca3f6f7f93a
and preview SHA5594f9fd921f31a55eaf0736d01c061daf2ab3768c89ce513c87a2879f1a6b6c.

Use existing installed Android local document-picker APIs with explicit local
Downloads selection. Enforce local content/document authority and path policy,
not EXTRA_LOCAL_ONLY alone. No remote provider, new permission/provider/dependency,
debug byte bridge, root/run-as or automatic cloud/Git copy. Before output, verify
the selected new document is empty and suitable; reject a pre-existing nonempty
document without truncation. Never delete a selected document, including failures.
Stream bounded entries, verify originals and actual output byte count/hash. Sync
and read back the chosen local document if supported before reporting verified
export; distinguish observed readback from unproved directory-entry/power-loss
durability. Provider errors or unavailable proof remain incomplete/unverified.

## Source scope and required evidence

Own only isolated camera Store/Android/export helper and sidecar code,
RecognitionExperimentModule camera-only picker integration, CameraProofPanel,
cameraProof/nativeAdapter or a small separate cameraEvidenceExport module, focused
tests/helpers and this task's handoff/workflow/PROJECT_STATE updates. Read applicable
AGENTS, coding/testing/security skills and nearby production implementations.
No business/shared recognition contract, manifest permission, dependencies/lockfile,
SDK/model/recipe change; no P1/generated-export behavior change. You are not alone
in the codebase: retain all prior dirty/untracked edits and freeze historical
evidence. Do not overwrite another contributor's work or spawn another agent.

Fresh baseline before edits, including exact51 reviewed source inputs and current
uncommitted deltas. New run root:
`apps/recognition-lab/runs/phone-experiment/p2-camera-export-c7-source-20261019-a1/writer/`.
New source binding must include all added runtime inputs without rewriting legacy
owner or historical indices. Use only installed local tools; no downloads/network
research, native/APK build, device/ADB, capture/model, actual picker/export, Git/CI.

Focused checks must exercise production boundaries: correct committed-job bytes;
wrong/other/unresolved job; role/path/link/hash/profile rejection; allowlist/size/
ZIP overhead boundary; reduced-cap admission/reopen/no eviction; local and remote
destination refusals; no truncation of existing nonempty document; short write/
sync/readback errors; cancellation during picker/write; Activity destruction;
stale callback/shared-busy ownership; torn journal/reopen/no replay. Verify original
bytes unchanged and zero SDK camera/model calls on export paths. Run appropriate
types/lint and existing camera durability/finalization/protocol/UI controls. Preserve
first failures, timeouts and skips; don't retry until green or weaken assertions.
Host mocks do not establish actual SAF/Android persistence behavior. New phone
validation follows a separately reviewed artifact and finite execution packet.

## End condition and direct return

Stop all mutations/commands, release finite lease, write a handoff with exact
before/after hashes, changed files, commands/receipts, failures, uncertainty and
recovery limits. Mark source implementation complete or concretely blocked, never
P2-03/G4 accepted. Explicit human authorization: send ONE direct completion/handoff
message to main chat01a098ef-d830-7531-bca7-2d66b0a5b587 after STOPPED. Do not wait
silently or proceed to build/device tests. Coordinator independently audits only
after this stopped handoff. P2-04/later gates and GitHub/CI repair remain held.
