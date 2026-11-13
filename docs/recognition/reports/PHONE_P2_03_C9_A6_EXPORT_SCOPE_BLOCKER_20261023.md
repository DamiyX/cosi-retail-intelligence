# C9 A6 export source: scope blocker before implementation

No production code changed. All78 before-index inputs unchanged, including frozen
C7/C8 preparation scripts and legacy/runtime source pins. Actual A6 saved photo and
all prior stopped roots remain untouched. Lease claimed and source baseline saved.

## Concrete blocker

CameraEvidenceAndroid.consume() validates the selected original job, then always
calls CameraProofFiles.newExportRoot(). That method (CameraProofFiles.java:42–45)
requires camera-evidence-export-v1 not to exist; mere root creation consumes
availability, even empty crash residue. The earlier C7 export was completed and
its one-shot root is preserved. Retargeting only JOB/JPEG/PREVIEW/CAPTURE_APK/
CAPTURE_SOURCE and TS job cannot authorize a second export: it will fail
CAMERA_EXPORT_ATTEMPT_CONSUMED. CameraEvidenceJournal also latches attempt and
terminal state. Neither may be deleted/reset/overwritten. The separate C8 slot
is already consumed and is not an authorized substitute.

The approved dispatch limits production ownership to exporter constants, TS job,
tests and derived pin. CameraProofFiles and footprint/accounting rules are outside
that ceiling; the packet expressly requires STOP if broader changes are needed.
No meaningful green source tests can establish that this profile-only change will
export when its journal is permanently consumed. This is an established existing
one-shot boundary, not a new camera/storage failure.

## Proposed bounded amendment

Authorize an additional fixed C9 export-attempt namespace and its explicit
footprint validation in CameraProofFiles, with any minimal journal/adapter wiring
and focused native regressions. Preserve the old C7/C8 roots, markers and outputs;
no arbitrary job/path or reset. Keep total aggregate/output/bookkeeping limits
unchanged and enforce combined old/new journal bookkeeping under the existing
allowance. The precise namespace/admission design must be reviewed first because
multiple retained attempts touch accounting and recovery. If those invariants
cannot be preserved narrowly, return a proposal rather than changing caps.

This amendment is a request for concrete scope review, not implemented authority.
Once approved, continue the same source task with exact A6 pins and separate
capture/exporter provenance. No more photo is needed. Build/install/export remain
later independently reviewed stages.

## Work and evidence

Read current project state, task workflow/branch/recent commits, source dispatch
and independent A6 review, existing exporter/adapter/store/journal/footprint and
focused tests/tooling. Baseline78 hashes reverified unchanged at stop. No source
or generated test suite ran because this blocker precedes implementation; no
build/model/decoder/phone/network/export/dependency/CI/Git mutation occurred.
Only new local charter/brief/baseline/flat source snapshots/report/current state.
Initial nested snapshot failed Windows MAX_PATH before production edits; partial
directories retained and flat basename snapshots with exact index completed.
Failure recorded in baseline-snapshot-failure.json. No failure hidden/retried as
runtime success. Main refreshed dispatch UTF-8 before implementation; final
packet was reread and its narrower ceiling is honored.

STOP/release/exact handoff; coordinator decides the amendment. No commands or
edits after final writer-stopped.json and one authorized direct report follows.
