# Readiness recovery controller candidate

This version is for the separately reviewed 20261027-readiness-v2 APK/run.
No phone operation occurs on import. Physical execution still requires a pinned
packet, active test lease, explicit budget authority and fresh human READY.

Sequence: fresh Inspect after READY → ACK → qualified pre → one bounded input →
terminal or diagnostic post → close only for confirmed idle settlement.
Native-token, human-READY and pre-image clocks are checked separately. UNKNOWN
produces diagnostic evidence when the original view remains verifiable, and
never closes or passes the row. Historical V1/V2 files remain unchanged.

No executable packet is supplied during source implementation. Source binding
remains disabled until stopped regression review and the new artifact freeze.
