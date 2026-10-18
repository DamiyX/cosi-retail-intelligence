# FC05-C1 acceptance and FC05-C2 connected preflight finding

2026-10-11. Sole writer STOPPED/idle, lease NULL verified. C1 launcher retention
accepted independently; operational publication withheld for new integration bug C2.

## C1 independently checked

Original Test-Launcher.py copied hash-identically to new reviewer root
C:\Users\doyew\AppData\Local\Temp\cosi-framing-fc05-c1-review-independent-20261011.
Actual Windows cmd with generated harmless children only: before expected exit1,
0/3 retention passes; after exit0,3/3 hold/final-code/key-release/saved0/2/1 passes.
Pinned production command unchanged; real controller/helper not run. Source delta
inspection confirms only builder/launcher behavior and consequential bindings.
Independent verify-c1.py freshly rehashed53 C1 frozen files,73 pre-C1 archived files,
49 sources/same paths,692 unchanged existing sources, ALL79,089 unchanged protected
records and exactly six permitted live deltas. Original annotations/photos and
old A1-A5/FC04 evidence unchanged. C1 freeze146cb955bffac3a5abafa3811abcbf3cb1dec573acf5da61a710ba0716e49edc.

## C2 root cause, high material integration failure

Actual fixed connected preflight command passes --out
runs/framing-comparison/private-framing-manual-20261011-a1/producer.
Its parent directory must not yet exist: Invoke-FramingOfflineStages creates it
after actual OFF and rejects an existing output root to preserve one attempt.
However crop_runtime.prepare line75 unconditionally requires out.parent to exist
before it returns. main calls prepare before the --preflight early return. Thus
the unpublished controller's intended connected preflight would reject
INPUT_UNAVAILABLE before OFF. Old generated CLI preflight used root/never-created
with root already existing; controller scenarios stubbed the preflight child.
Those fixtures did not cover the actual two-level output layout.

Independent generated differential retained in preflight-layout-reproduction.json:
executed the existing generated preflight fixture construction and real CLI,
changing only its fresh output to root/future-private-output/producer. Expected
old failure reproduced exit1/stderr INPUT_UNAVAILABLE. Future parent was not
created. Generated40 images/vectors only, model read/hash only, no interpreter or
private image processing. This is a reproduced source integration bug, not an
actual private attempt. No attempt ID consumed or operational approval authored.

## Concrete bounded correction authorized for same writer

Coordinator reviews and authorizes ONLY crop_runtime.prepare's output-parent
validation for connected preflight, plus new meaningful regressions and exact
consequential source/controller/preparation hashes. Preserve numeric recipe,
model/software/old producer/annotation/ranking/native/jobs/offline guards.

For --preflight only, allow ONE absent immediate parent if its grandparent is an
existing directory under the accepted framing RUNS ceiling. Validate the complete
future output and absent-parent paths with unchanged checked_path confinement,
alias/symlink/reparse/hardlink checks; do not create output or directories. Existing
parent directories remain accepted. Normal production still requires its output
parent to exist, supplied by offline stages after actual OFF. Two missing levels,
file parent, links/dangling links/reparse, outside ceiling and existing output
remain rejected. No generic ancestor fallback, broad catches or output creation.
An exact boolean preflight flag must not turn arbitrary values into permission.

New generated tests must show old failure/new pass through the real CLI for the
actual missing-parent layout; existing-parent positive, missing grandparent and
normal production rejection, symlink/junction/outside/occupied output negatives;
both successful preflights leave target and parent absent and do not instantiate
an interpreter. Preserve40 original hashes/denominators. Couple the actual fixed
controller command plan to this path invariant so a stub-only check cannot hide
the integration assumption. Frozen prior proof and expected failure retained.

This modifies a previously accepted crop source file; fresh source fingerprint,
source manifest, immutable preparation revision, controller source/publication
templates and hardcoded exact source expectations must all agree before review.
Old annotation/preparation five files and pre-C1/C1/FC04 evidence must remain
unchanged: create new immutable lab revision directory for new source/setup
templates while reusing byte-identical annotations/comparison. Fixed run ID/root
remain fresh/unpublished; no attempt/output/launcher execution, operational
approval/publication/Desktop/network effect/private inference. STOPPED direct
handoff with lease NULL; coordinator audits the actual revised bytes before E04.
