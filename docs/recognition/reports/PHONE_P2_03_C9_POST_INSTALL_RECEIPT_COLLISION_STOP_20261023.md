# C9 installed identity verified; packet receipt collision stops before launch

2026-10-23. Actual read-only selected identity verification SUCCEEDED: exact C9
APK9939439b1ab3e7c4ff29184ec767e85c28e8f5f3f9d821febce788cc6c814145,
UID10264, unchanged owning dataDir, selected hardware/build/wireless verified.
All11 device command receipts exit0. No install/reinstall, launch, capture,
export, transfer, reconnect or helper/source repair occurred.

The literal phase1 snippet from main dispatch was copied without alteration.
verify_wireless('post-install', d.APK_SHA) writes post-install-verified.json on
success. The snippet then tries d.put('post-install-verified', ...) to the SAME
exclusive filename, causing FileExistsError/outer exit1. The original successful
verification receipt remains intact; no overwrite/delete/retry. This is a packet
composition error, not an installed identity failure. launch_once.py was copied
from the exact conditional snippet but NOT invoked because phase1 exited1.
No launch-intent exists. Native saved accounting still awaits actual app status.

Root `apps/recognition-lab/runs/phone-experiment/p2-camera-export-c9-post-install-20261023-a1/writer/`; exact accepted helpers unchanged, new real frozen inputs/fresh
finite lease pinned, old A3 install intent/uncertain receipt untouched. Preserve
post-install-intent, all11 command/result pairs and successful identity receipt.
Main can independently audit and issue a new bounded single-launch/status packet
using actual verified receipt; never fabricate update-complete or reinstall.
No new photo or physical positioning is needed. First unexpected result stops
under this Low dispatch, so the duplicate write was not silently removed/renamed.

All83 source/six protected inputs including P2-04 plan unchanged; schemas pass;
workflow byteJSON/ASCII serialized UTF8 kept below1MiB. Lease released/STOP.
No GitCI/build/dependency/P204/05 effects. A6 sharpness/geometry/P203 pending;
P204implementation held/P205separate/CIdeferred. No phone observations after stop.
