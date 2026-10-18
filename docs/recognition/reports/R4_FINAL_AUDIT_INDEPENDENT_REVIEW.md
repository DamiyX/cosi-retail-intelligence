# R4 FA-01/02/04 independent correction review

2026-10-02. Decision: accepted within headless lab preparation boundary. Implementer stopped before review; coordinator inspected retrieval/evaluation/gallery/path changes and correction regressions.

Fresh coordinator checks:110 tests/5 suites87.075s, all pass (retrievalCorrections/retrievalOutput/retrieval/retrievalCache/retrievalEvaluation). Typecheck0; zero-warning lint0. Independently authored runs/coordinator-r4-correction.mjs verifies full valid frozen holdout evaluates8 queries; inner-only freeze and changed gallery reject; old same-session context returns STALE before loader; fresh context returns DECISION. Unchanged sibling probe R4 short-alias CLI1/overwritten=false. Scope check526 baseline/529 final,519 protected unchanged,7 assigned existing edits/3 additions, no unexpected mutation/whitespace issue; historical audit and sibling probes preserved.

FA-01: full wrapper checked at both exported evaluator and facade before metrics/cache setup. FA-02: UUID incarnation plus full gallery hash prevents reused same-session contexts, retaining one-flight/cancellation. FA-04: canonical and bigint physical identity protects inputs and distinct report/cache aliases including missing destinations. Source paths protected before writes. No ranking/threshold/production change.

Implementer full407 passes/2 existing R3 file-symlink skips/22 suites327.403s is reported evidence, not a new coordinator full run. Actual Windows8.3 cases ran in the fresh focused suite. File-symlink executable EPERM coverage remains unavailable. Historical audit script correctly now throws at its inner-only freeze before later probes; it is historical failing proof, not a passing postrepair suite. New independent and focused cases provide repair evidence.

R4 source corrections accepted. Known shared R0/R1 hardlinked report overwrites still reproduce and are next. Physical photos/curation/model rights/actual inference/native/device/frozen real quality remain pending, not waived. A final source correction review is not recognition completion. No R5/M12, commit/push/phone/Docker or build effect.
