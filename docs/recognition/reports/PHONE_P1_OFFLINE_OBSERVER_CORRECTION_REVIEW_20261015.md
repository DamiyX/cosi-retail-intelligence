# P1 host observer correction — source review checkpoint

2026-10-15. Main coordinator implements and reviews directly at founder request.
This is a fresh direct review, not a claim of a separate independent reviewer.

Scope: new `tools/scripts/phone-offline-observer.py`,
`phone-offline-confirmation.py`, `phone-offline-observer.test.py` and the new
execution packet. No installed/candidate/native/model/recipe source change.
The exact24 accepted files, C2 installed APK, existing C4 input and both locations
of the original b72de75b... result were freshly checked in new run preflight.
Original run recursively inventoried before the new attempt; no old artifacts
are edited or replaced. New source/receipt/index paths are exclusive creations.

Mechanism review: UI ownership uses a cross-process nonblocking Windows byte
lock; second cooperating UI owner refuses before issuing commands. The monitor
has its own process, no UI calls, separate command log and explicit finite bound.
No UI exception/finally branch stops it. Only positive owned-work closure signals
normal termination; failure/gap/read-bound violations remain latched even after
subsequent good reads. Safety observations continue while one cancellation/drain
is handled. Final closure requires a concluding actual-state sample. Readiness
and closure records are published atomically without replacing existing files.

Sensitive boundary: reused source-pinned actual-radio/current-cellular parser;
no raw network/telephony dumps are saved. Commands record timing, exit, stdout
hash/size and sanitized stderr. Picker inspection retains only exact expected
filename/save/local Downloads controls. Only reviewed isolated package/input/
export and owned UI XML paths are addressed. No private image preview, screenshots,
image transfer, arbitrary files, radio writes, installs, runtime tuning or network
effects. Monitor process launched hidden with a finite1800s ceiling, not a service
or recurring job. Human handles USB/lock problems if needed.

Eight host-only fault/ownership checks passed in0.081s; both host scripts parsed.
Checks cover clean closure, overlong gap, slow read, read failure, finite expiry,
UI exception survival, exclusive ownership and non-replacing atomic publication.
These checks are generated host fixtures; they do not prove real phone behavior.
Next physical probe uses actual radio reads with a generated host UI exception,
zero model/import/private-image operations. Private repeat must not start unless
that probe passes and the founder's fresh offline readiness remains applicable.

One new private reimport/replay is bounded by an exclusive fresh run directory,
unique start markers and preflight tool hashes. All80scheduled records and both
20query denominators remain. Reimport and resulting atomic working-cache update
are explicitly covered by the new packet and current founder instruction; old
result export remains preserved/hash-verified on phone and host. No reset or old
attempt retry is permitted. Restart/export/comparator remain separate checks.

Residual limits: cooperation is required—unrelated external tools cannot be
prevented from running their own UI commands. Main therefore runs no second UI
inspector while this controller owns the phone. OS observations are sampled,
not an atomic radio barrier; read<=3s/gap<=5s and actual state checks remain
mandatory. The original command-error OS cause remains unconfirmed. Native call
preemption is not claimed; unknown closure leaves the phone offline for review.
The prior51-second hole stays incomplete regardless of this new result.

Decision: host source correction verified for scope; permit the short physical
non-inference probe, then exactly one new frozen-packet verification if it passes.
No P1 physical pass, new recognition accuracy, P2 camera approval or production
acceptance is granted by this source checkpoint.

## C1 exact local-file selection correction

The a1 non-inference probe passed. Its new import then exceeded120s before any
replay, because Android DocumentsUI used grid cards with shortened visible
titles. The exact full filename existed in `Preview the file <filename>` on the
preview icon. An owned existing XML artifact established the clickable enclosing
`com.google.android.documentsui:id/item_root`; no second UI dump was issued to
diagnose it while the controller was active. The initial selector matched exact
visible text only and therefore missed the file. This cause is confirmed by the
retained target/ancestor observations, unlike the prior command-error hypothesis.

After the a1 controller stopped, one exclusive UI owner cancelled its existing
picker with Back and observed import-enabled/no-active-operation state. The
separate monitor stayed alive until this closure:165 samples/PASS,zero replays.
The expired import remains failed; no native/model failure or full P1 pass claimed.

C1 resolves the exact full accessibility filename to its enclosing clickable
file card, never taps Preview, refuses similar names, and still requires the
local Downloads breadcrumb and unique exact target. Ten host checks passed
in0.084s, including shortened-name selection and similar-name refusal. No
mobile/native/parser/radio/model/input change. The amended attempt b1 has a new
exclusive directory/tool pin, fresh preflight/probe and one import/replay only;
a1 is not resumed, reset, overwritten, or relabelled successful.
