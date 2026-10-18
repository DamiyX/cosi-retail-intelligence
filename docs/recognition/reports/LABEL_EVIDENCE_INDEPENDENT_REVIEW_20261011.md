# Label-evidence preparation — independent review

Decision: **changes required**. Founder private transcription and assisted analysis
remain unstarted. Review targets the stopped A1–A3/C1 additive implementation,
not the unrelated dirty checkout or historical recognition results.

Writer completion was retrieved by one compact snapshot: completed, idle,
STOPPED handoff, workflow lease NULL. The dispatch explicitly requested a handoff
in the writer chat, so lack of a separate message is not missing completion.
Branch remains plan/m8-unified-scanner, HEAD66ea3fc22595a48d7355d1729bb879496cc98896.

## Specification finding LE-C1 — high

`tools/label-evidence/core.cjs:109` permits partial observations to participate
in decisive support/contradiction. At line146, any unequal normalized phrases
become a contradiction. The schema has no field-level completeness evidence.
A partially visible prefix is therefore treated as a complete different brand.
The same problem affects partially transcribed reference cards.

Fresh executable generated counterexample, using core.assist directly:

- Query readability=partial, literal `Mea 600ml`, brand span `Mea`, quantity600ml.
- Visual first candidate `correct`: brand `meadow`, quantity600ml.
- Visual second `wrong`: brand unknown, quantity600ml.
- Visual third `rival`: brand unknown, quantity750ml.
- Actual: correct is contradicted by `Mea` versus `meadow`; wrong has sole support;
  rival is contradicted by quantity. Wrong is promoted into first place.
- Required: the fragment is unknown/incomplete evidence, not an explicit brand
  contradiction. Keep visual order. This is a systematic partial-text ambiguity,
  distinct from a deliberately wrong transcription.

Smallest correction within the existing schema: retain partial literal/spans for
review/coverage, but abstain from decisive partial query evidence and exclude
partial reference observations from decisive cards. No fuzzy/prefix matching or
guessed completion. Add discriminating query and reference regression cases,
including partial quantity digits, while preserving fully readable600ml/0.6L
positive cases. A richer field-completeness schema would need a concrete review
before editing; it is unnecessary for this bounded repair.

Source/rule hashes will change. Retain preparation-a1/a2 as historical stale
packets; prepare a NEW blank revision and update its guide/handoff bindings.
Never refresh a frozen packet in place or touch consumed FC06/A5 evidence.

## Standards and verification

Fresh coordinator commands used pinned Node24.21.0:

- Lab tsc --noEmit: exit0.
- Lab eslint . --max-warnings=0: exit0.
- Six Jest suites (labelEvidence, labelEvidenceCli, labelEvidenceViewer, metrics,
  metricCorrections, retrievalEvaluation):31 tests passed,23.707s, exit0.
- The additional direct generated counterexample above exits0 and demonstrates
  the incorrect promotion despite the passing suite. Existing tests are insufficient
  for partial evidence safety; they must not be weakened.
- Independent Python8-thread full-buffer/link verification against baseline.json:
  all701 existing source records outside the two authorized state documents match;
  all84874 protected artifact/link records match, zero failures. This includes
  historical attempts/original evidence; it does not decode private images.

Inspected new schema, rule, input bindings, freeze/merge/analysis, CLI, report,
local review page and UI, and blank inventory guide. The intended saved-top3/
unchanged-score/20-query behavior, explicit file selection, CSP/no network,
text-only progress and no-overwrite pattern remain the review scope. No new
dependency, contract, native, business or inference change was found in this slice.
The blank inventory worksheet is planning only, not dataset acceptance.

Actual generated browser rendering/EXIF/zoom/file-dialog acceptance remains
pending. Writer recorded file-protocol policy rejection honestly; DOM tests do
not resolve it. Do not bypass this restriction. After corrected source acceptance,
an ordinary founder local generated-page check can provide the missing evidence
before any private text review. No new private execution is authorized here.

Next: same sole Sol6.1 HIGH writer corrects LE-C1 within the new files, performs
meaningful generated checks, returns STOPPED/lease NULL. Coordinator audits the
new stopped delta before founder instructions or private review.
