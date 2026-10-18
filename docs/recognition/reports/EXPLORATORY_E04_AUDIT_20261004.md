# E04 independent source audit — first return

2026-10-04. Main coordinator review, Sol6.1 HIGH workflow. Decision: CHANGES
REQUIRED; no approval for private inference. Writer stopped/completed, lease null
before review. Reviewed actual producer/study/evaluator/report/CLI, preparation,
inventory/metadata/network helpers, new tests and handoff evidence. No audit agent.

## Scope and preservation

Reviewed runtime source fingerprint
`a9a2c52e24442ce5c3a4b8c00ef74eacc7fc17f1c81ad438beab4f7c1c5abf4e`.
Fresh hashes match all17 added source/doc files. Original baseline617 source
files:616 match; sole disclosed exception is workflow lease-control JSON
serialization. All49 original private assets/records match. No photo decoded
or inferred on by coordinator; originals/reference/formal gates preserved.
Coordinator evidence is external
`C:\Users\doyew\AppData\Local\Temp\cosi-exploratory-e04-20261004`.
The generated load-failure probe's bundle is under ignored lab runs. Original
builder evidence and source snapshots remain historical/unchanged.

## Specification finding EA-01 — medium, confirmed

`tools/exploratory/producer.py:354` and catch at360: model-load timeout, fatal
worker reply, EOF or OS error is swallowed into40 NOT_RUN records. Neither the
bundle nor the human report retains the load failure reason. `elapsed=0` and
default `load_ms=0` report no elapsed time even though setup/worker startup took
time. A complete=false flag correctly prevents success, but cannot tell the
founder whether the runtime crashed, timed out or never began image work.

Reproduced with the real producer/preflight/inventory/model binding and generated
study, substituting only a spawned worker that returns fatal RUNTIME_ERROR on
load. Result exit2,40 NOT_RUN,loadMs0,encodingMs0,no global failure. No inference.
Probe log: `load-failure-probe.log`; observed bundle retained. Discriminating
expected-cause assertion in `expected-load-failure.py` exits1 on reviewed source.
Fixture-positive math/decode checks pass separately; no blind retry.

Required minimal repair: a strict optional/null global run-failure record with
explicit load-stage reason, preserved worker fatal/timeout/EOF distinction and
honest measured attempt duration. Keep40 per-entry NOT_RUN accounting and existing
image-crash handling. Propagate cause through strict TS validation/result output
and readable HTML/summary, never sensitive paths/exception text. Zero may represent
no inference, but cannot replace measured failed loading/attempt time. Add real
spawned positive/fatal-load/deadline/disconnect regression controls; do not alter
existing threshold/config/tests or perform private inference. This permits narrow
changes to the NEW exploratory modules/tests/docs only, no persistent contract.

## Standards review and unresolved setup gates

Source confines private execution behind exact coordinator approval and a false
network-reviewed gate. Ranking reuses existing mathematics; no calibrated status
or fake formal admission in published exploratory results. Failure denominator,
distinct top3, ties and withheld-identity exclusion exercised with independent
authored-vector cases. File protections, hash-bound buffer handling and escaped
local derivative reports were traced; hostile concurrent OS writer isolation is
not proven and is outside the single-writer assumptions.

Exact downloaded model hash/size, internal Apache2 declaration and normalization
mean0/std255/feature1024 metadata were reviewed against the inspector and recorded
official artifact provenance. Runtime lock and actual installed file inventory
were rechecked by the coordinator load probe before it spawned the failing worker.
These are local prototype terms/signature evidence, not production licence advice
or accuracy/runtime adoption. No alternate runtime/model selected.

Native-egress gate remains UNRESOLVED: installed Python metrics implementation
is no-op, matching tagged upstream LiteRT source; CPU built-ins/default delegates
disabled. Existing Python audit plus before/after IPv4 snapshots do not observe
all native/transient/IPv6 connections. No outbound effect was observed, but none
is not established. Keep networkReviewed:false and no E05 dispatch. Do not set
the flag from this source review or silent consent. No global firewall/network
changes, tracing service or new dependency authorized by this repair. Optional
browser rendering remains unverified after host file-protocol rejection; no
workaround. Full formal dataset/native/unknown/M12 gates remain open.

Primary source used for exact metrics reconciliation:
https://raw.githubusercontent.com/google-ai-edge/LiteRT/v2.2.0/tflite/python/metrics/metrics_portable.py
Tagged C++ wrapper source inspected as supporting context, not binary-wide proof:
https://raw.githubusercontent.com/google-ai-edge/LiteRT/v2.2.0/tflite/python/interpreter_wrapper/interpreter_wrapper.cc

## Fresh coordinator checks

- Actual Node ESM suite:11 pass/0 fail/0 skips,3725.6923ms.
- Actual Python suite:12 total,11 pass/1 host symlink-privilege skip,4.425s.
- Lab typecheck and zero-warning lint:exit0.
- EA-01 spawned load-failure observation:exit0, expected-cause assertion:exit1.
- Source/new-file/original-private preservation: fresh hashes as above.

Builder511 lab cases/24 suites and40 generated model images are self-check
evidence, not repeated coordinator runs or private recognition results. Their
skips/failures remain recorded; no wholesale full-suite repetition justified.

## Next sequential step

Return EA-01 only to the SAME writer, Sol6.1 HIGH. Writer captures a new baseline
after this coordinator ledger/state update, repairs new modules/tests, retains
old failed evidence, releases lease and reports STOPPED. Coordinator stops all
source work while writer resumes. Review the returned repair before any approval.
After source closure, pause if network evidence remains unresolved and record a
precise founder decision. No M12 or unrelated coding to fill unattended time.
