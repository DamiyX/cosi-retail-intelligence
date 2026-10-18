# First offline photo-experiment launch: stopped before inference

2026-10-10. Main-coordinator diagnosis after the founder reported three launches.

## Observed result

The recorded first attempt, `offline-visible-20261010-a1`, stopped with
`OFFLINE_STATE_NOT_CONFIRMED`. The visible controller recorded exit 1 after
49.379 seconds. The helper recorded `ChildrenStopped:true`,
`PrivateExitCode:null` and `ORIGINAL_WLAN_AND_ROUTE_PRESENT`. There is no
`offline-observed.json` and no private output directory for this attempt.
Private photo inference and E05 did NOT RUN; no recognition scores or accuracy
result exist. The changing display cannot be treated as completed photo tests.

The later screenshot reports `ONE_ATTEMPT_ALREADY_EXISTS_NO_RETRY`. The first
launch's durable claim and attempt directory already exist, so subsequent
launches refuse to reuse this authorization. Manually toggling Wi-Fi does not
reset the claim. Neither the claim nor failed evidence was removed or changed.

## Confirmed cause

The saved Windows WLAN operational events all match the exact bound interface:

| UTC | Event | Connection mode |
| --- | --- | --- |
| 00:39:59.4889982 | Disconnected | Automatic profile |
| 00:40:00.3563205 | Connection started | Automatic profile |
| 00:40:00.5934882 | Connected again | Automatic profile |
| 00:40:22.3253663 | Connection replaced during recovery | Automatic profile |
| 00:40:22.3262283 | Recovery connection started | Manual profile connection |
| 00:40:22.6512742 | Connected after recovery | Manual profile connection |

The first disconnection lasted approximately 1.10449 seconds. Windows
automatically reconnected before the offline gate could authorize private work.
The disconnect-command exit alone was therefore insufficient. This explains
the brief or unnoticed Wi-Fi interruption and the stopped attempt. The recovery
helper subsequently restored the original association and route.

This is an observed network-control/environment incompatibility with the
assumption that a one-time WLAN disconnect would remain offline. The native
offline gate correctly refused to proceed. It is not a model, photo-quality or
recognition-score failure. The source re-audit was conditional on actual native
offline checks; its generated tests did not establish that Wi-Fi would stay off.

The old offline wait swallowed individual rejection reasons; those historical
poll states cannot now be reconstructed. The event trace confirms reconnection,
without establishing every per-poll rejection or the origin of Windows' policy.
No diagnosis relies on the founder's keyboard shortcut being the cause.

## Fresh checks and preservation

Evidence is private and local at
`C:\Users\doyew\AppData\Local\Temp\cosi-exploratory-offline-20261010\coordinator-a1-failure-review`.
Full WLAN XML remains there; no SSID, profile name or XML is copied into this
repository report.

- Fourteen failed-attempt/launcher/binding/handoff artifact digests match the
  recorded values; `failed-attempt-preservation.json` preserves exact hashes.
- The original runner and helper PIDs are absent; the bound terminal receipt
  confirms owned children stopped. No inference output directory exists.
- A fresh read-only native observation confirms the original WLAN association
  and route are present. That is not proof of internet reachability.
- The recorded current executable source fingerprint remains
  `1df885b33fe752ac2c81fa9a7e4b7bfa432a9bddb1b1d63435643245831b8cb0`.
- `exact-disconnect-timing.json` preserves the fractional event timing. The first
  diagnostic's whole-second numeric duration resulted from PowerShell's implicit
  date-to-string conversion; its original timestamps remain preserved.

These were read-only network observations and evidence/documentation writes.
No WLAN command changed connectivity, no private inference ran and no system
setting was changed during this diagnosis.

## Scoped next correction

Prepare a NEW manual-assisted launcher package in a separate external directory;
preserve the entire a1 package and failed attempt. This is utility correction
within the existing experiment, with the same model, preprocessing, photos,
matching and reports. It does not change Astra's recognition experiment design.

The launcher must finish connected preflight and establish its independent
helper before explicitly asking the founder to turn the laptop Wi-Fi toggle
OFF. It must verify the actual offline state before private pixels and retain
the existing checks throughout owned work. After all owned children have been
observed stopped, it can explicitly ask the founder to turn Wi-Fi ON and confirm
the original association/route. A timer, missing receipt or unknown child state
must never authorize reconnection. Closing the display must not abandon helper
ownership or silently imply completion.

No saved-profile, autoconfiguration, firewall, adapter-administration or global
network setting changes are part of this correction. Unsupported native toggle
states must stop with a bounded diagnostic rather than weakening the gate.
Preparation uses generated fixtures only and creates no operational approval,
Desktop replacement, network effect or private inference. The existing Sol HIGH
writer prepares it alone and stops with a handoff; the coordinator audits before
publishing any exact NEW single-attempt authorization. Actual manual-radio
compatibility, E05 and recognition-quality gates remain pending.

For now keep Wi-Fi ON and close the repeat-launch warning if desired. Do not
reopen the old Desktop launcher. New start/end instructions follow reviewed
preparation. No phone participation is needed for this laptop experiment.
