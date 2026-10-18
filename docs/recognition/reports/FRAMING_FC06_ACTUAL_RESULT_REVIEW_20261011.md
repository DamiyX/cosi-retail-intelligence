# FC06 — actual framing comparison result review

Coordinator decision: actual execution and numerical result accepted within the
approved exploratory comparison. Founder paired-contact-sheet review remains
pending. The consumed attempt is framing-manual-20261011-a1; never relaunch it.

## Result and interpretation

| References / queries | First choice | First three | Scored |
| --- | --- | --- | --- |
| Full / full (FF, saved A5 baseline) | 10/20 (50%) | 19/20 (95%) | 20/20 |
| Crop / crop (CC, fixed primary comparison) | 17/20 (85%) | 20/20 (100%) | 20/20 |
| Full / crop (FC, diagnostic) | 11/20 | 20/20 | 20/20 |
| Crop / full (CF, diagnostic) | 12/20 | 18/20 | 20/20 |

CC gained eight first-choice successes and lost one: net seven, or35 percentage
points on these20 queries. Ten correct-product ranks improved, one regressed,
nine stayed unchanged, and none was unscored. No query was removed.

The remaining CC first-choice errors are:

| Query | Correct product | FF rank → CC rank | Incorrect first choice |
| --- | --- | --- | --- |
| p02-explore-2 | Airpro Cherry blossom 300ML | 9 → 3 | GM white-board cleaner |
| p04-explore-2 | CWAY750ml | 3 → 2 | CWAY600ml |
| p05-explore-1 | CWAY600ml | 1 → 2 | CWAY750ml |

Airpro's other query improved2→1. Both lip-gloss queries improved3→1; both brush
queries improved2→1. CWAY sizes remain confused in one query each. The750ml query
has a raw first/second score gap of0.0008046263;600ml's is0.0097469776. These gaps
are similarity evidence, not calibrated confidence or probabilities.

Both-side framing was most helpful here. Framing changes context and product
pixel scale together; the diagnostic conditions cannot identify which caused the
gain. This does not establish that the line on Airpro caused its previous miss.

## Actual execution evidence

The matching session, nonce, helper identity and package receipt bind the run to
the independently accepted C2 package. Exact publication metadata still matches.
Connected preflight passed. The recorded native OFF observation occurred at
2026-10-11T01:43:04.1309454Z, before the private processing stages. Producer wrote
40 vectors, no run failure, using the approved model and recipe. All four
evaluation conditions scored20 queries.

Recovery phase recorded stopped work at01:43:57.5243055Z. The immutable receipt at
01:43:57.6440753Z records3 jobs created,3 drained,0 active children, children stopped.
The manual ON prompt followed at01:43:57.7357817Z. Result at01:44:58.6958132Z records
exit0, no failure, ORIGINAL_WLAN_AND_ROUTE_PRESENT and denominator20. WAIT_OFF
WAIT_EXPECTED_BOUND_WLAN and WAIT_ON ORIGINAL_ASSOCIATION_ROUTE_NOT_PRESENT are
intermediate waiting diagnostics, not the terminal outcome.

This is one ordinary successful native OFF/drain/restoration run, not proof of
crash, power-loss, hostile-OS, unknown-child or Android recovery behavior. The
network review's polling, loopback/internal-switch and broker limits still apply.

## Independent checks performed

The coordinator used only saved JSON/vectors and byte hashes, with no new pixel
decoding, model creation, private inference, launch, helper or network change.

- Independently recomputed800 candidate scores:20 queries ×10 products ×4
  conditions, including max-over-two reference grouping, nearest-reference
  identity, full candidate order, rank, margin, first/top3 and paired accounting.
  Maximum saved-score difference1.7763568394002505e-15; all assertions passed.
- Verified40 original JPEG hashes,40 frozen annotation identities/dimensions/
  orientations/valid bounds/fixed5% padding, and40 recorded before/after hashes.
  Founder visual confirmations are retained; this is not independent visual
  certification of every product box.
- Verified80 new derivative hashes,49 bound controller/source files, unchanged
  baseline bundle, setup/software/model/source/recipe provenance, publication
  authorization, package/adapter receipt and session/stop/recovery receipt hashes.
- Rehashed79223 historical protected records against the pre-C2 baseline, excluding
  only the ten previously accepted C2 source/binding deltas. All passed. Frozen
  A1–A5 evidence remains preserved.
- Froze105 actual attempt/output artifacts before review and rechecked them after
  the audit. No consumed output or authorization was overwritten.

Evidence directory:
`C:\Users\doyew\AppData\Local\Temp\cosi-framing-fc06-result-review-20261011`:
audit-result.py/json, consumed-attempt-preservation.json,
package-receipt-review.json and derivative-and-bounds-review.json.

Exact annotation SHA256 remains
94dc350fad86fbac717de276970cd1fe1a78edbe9bf60cdd8a49952689bbb134;
comparison e39e28e9af82e5798884767854f745369b23cd18e7c24d140bf8faa00799d6d4;
crop source dd68bc1f2a4b1bfd899363ad3223f15c74e2d393db612a609703dc65b7e6999d;
crop recipe fc2bd30beadfd39c1bd16cfa0e9047b6a26644037d49ae480e283f433918be70;
baseline bundle402b647439508587b25f11509e5f135e88fd5dfccc9267a55da68040ebed8dd6.

## Next boundary

Founder reviews the existing local paired contact sheets, especially
p02-explore-2, p04-explore-2 and p05-explore-1, confirming the displayed crop retains
the intended whole visible product. Keep originals and boxes unchanged after
seeing results. Report a box/identity concern rather than retuning or relaunching.

After that review, prepare a separate bounded planning decision about realistic
capture/framing and generalization. No next experiment is selected or authorized
by this result. The same10 physical items and their20 correlated query views are
not a formal independent holdout; the founder saw the baseline before annotation.
No automatic segmentation, calibrated UNKNOWN, true-unknown, fresh-instance,
30–50-product, Android/enrollment/OCR, production or M12 gate is passed.
M9 timing, M10 OFF and M11 real-staff gates remain unchanged. Automation stays paused.
