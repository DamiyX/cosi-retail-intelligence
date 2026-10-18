# P1 host preparation start failure review

2026-10-13, Africa/Lagos. Founder requested inspection of the failed attempt.
Diagnosis only: no relaunch, new attempt, binding change, helper launch, radio
change, private decoding, phone install or inference was performed.

## Evidence and conclusion

- Attempt `portability-host-c1-20261012-a1` contains only `session.json`, 675
  bytes, SHA256 `1a4628fcf00627a5316b29592f2424a76d3db2da63b15268eb57f10beaa90c32`.
  Session started 2026-10-12T23:47:50.7567424Z (00:47 Lagos).
- Saved session validation passed with expiry ignored for inspection only.
  All 17 bound controller inputs remain unchanged.
- No ready/arm/off-prompt/preflight/producer/result receipts exist. The fixed
  private producer output directory is absent. No preparation PowerShell
  process was active at inspection.
- Actual read-only connected-state validation rejects `PRESTART_ROUTE_DRIFT`
  at Support-ReadOnly.ps1 line 101. Expected and actual inventories each contain
  24 usable routes: one direct IPv4 /32 Wi-Fi route was replaced by another.
  The new /32 matches the current Wi-Fi IPv4 address. Original association and
  default route are present. Addresses/profile identifiers were not recorded.
- This is a real changed route, not ordering drift. It strongly supports a
  stale network snapshot as the first-start failure. The historical first error
  is unrecorded, so its precise cause cannot be proved solely from this attempt.

The first start created its immutable session before connected-state validation
or helper creation. The outer catch prints a sanitized error but does not save
a durable startup failure receipt. A failure in that interval therefore leaves
a consumed attempt and little diagnostic evidence. The subsequent launch
correctly rejects `ATTEMPT_EXISTS_NO_RETRY`. The CMD pause is a closing prompt;
pressing Enter there did not cause the original failure.

## Remedy and boundary

Preserve this attempt and all existing source/build/private evidence. Do not
delete the claim, reuse the operation, bypass exact route comparison, or launch
the old controller again. Prepare a separately identified, independently
reviewed controller with a freshly captured connected network binding and
durable sanitized startup-failure evidence before presenting a new launcher.
Keep offline radio, uplink, child-lifetime and restoration checks intact. The
same sequential writer/coordinator handoff applies if repair is dispatched.

The previous source/APK audit remains bounded source evidence; host execution,
private phone replay, parity, ranks and real performance remain pending. This
review did not modify implementation or publish a replacement attempt.
