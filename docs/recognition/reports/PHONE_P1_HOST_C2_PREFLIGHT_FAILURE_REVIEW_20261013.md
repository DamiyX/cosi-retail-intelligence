# P1 host C2 connected-preflight failure diagnosis

2026-10-13, Africa/Lagos. Founder requested inspection. Diagnosis only: no
launcher/helper relaunch, operational preflight rerun, new attempt, radio change,
private image decoding, model inference, phone command or production edit.

## Actual failed attempt

Consumed root C:/Users/doyew/AppData/Local/Temp/cosi-phone-portability-host-c2-20261013-a1,
operation portability-host-c2-20261013-a1. Seven attempt records are preserved.
Session started at 07:53:27 Lagos; helper terminal result at 07:53:48 Lagos.
Controller reached HELPER_READY then rejected HELPER_PREFLIGHT_STOPPED_NO_OFF_AUTHORITY.
Helper's diagnostic and result identify CONNECTED_PREFLIGHT_REJECTED; its child
log contains only PORTABILITY_PREPARATION_FAILED_PRIVATE_DETAILS_WITHHELD.

Independent receipt binding checks verified operation/nonce/session hash, helper
ID/start ticks, terminal stop/recovery hashes, one job created and drained, zero
active children and ChildrenStopped=true. Restoration=NOT_REQUIRED and private
exit=null. No ready/arm/OFF prompt/offline marker/ON prompt or private output exists.
The blank helper therefore did not mean success or a missed manual step.

## Confirmed code defect and causal evidence

phone-portability-host-c2-prepare.py loads inventory.py by absolute file spec.
That module imports `from producer import ...`, but this entry does not supply
its sibling module directory or explicitly load that dependency. A clean process
reproduces ModuleNotFoundError for `producer` at inventory.py line 6. The same
pattern exists in the original preserved phone-portability-prepare.py.

Read-only component diagnosis verified strict publication/authorization parsing,
all 24 source rows, fixed manifest hash, frozen metadata and study/annotation/
asset mappings before the failed import. An isolated process-only counterfactual
loaded the exact existing producer module explicitly: inventory import then
passed, and its installed software inventory matched frozen software.json byte
for byte. All 40 original JPEG byte hashes/sizes also matched, without decoding.
No package installation or global environment change is needed for this defect.

The import defect is confirmed by failure/counterfactual. It strongly explains
the actual generic child failure; the historical raw Python exception was not
saved, so that exception cannot be asserted as a directly recorded fact. The
real stopped/expired session was not modified or bypassed to rerun the preflight.

Evidence: apps/recognition-lab/runs/phone-experiment/
p1-host-c2-preflight-failure-review-20261013-a1, including diagnose.py,
failed-attempt-before.json and component-diagnosis-a2.json. The earlier
component-diagnosis.json preserves the initial import-only observation.

## Audit gap and next remedy

The C2 independent audit exercised control/error paths, exact producer derivation
and unpublished refusal entries, but not a successful published Python preflight.
That gap allowed an unchanged producer integration defect through. Its 89 checks
remain valid scoped control evidence; they do not establish complete preflight
readiness. Coordinator records this gap without blaming the founder's steps.

Prepare a narrow new host entry with explicit reviewed dependency loading and
stage-specific sanitized Python diagnostics. Preserve both consumed attempts and
all old source/bindings/APK/private evidence. Require a genuine positive published
preflight fixture exercising actual inventory loading and unchanged guards,
alongside before-failure/after-pass and invalid/publication/source/expiry/recovery
negatives, before presenting another launcher. Do not weaken gates, skip the
inventory, install a substitute module, change PYTHONPATH globally, or retry the
consumed C2 operation. No correction or replacement has been dispatched by this
diagnostic turn. This is an implementation correction, not an Astra experiment
planning problem. Actual preparation/private replay/parity/ranks remain pending.
