# Proposed bounded diagnostic for the C4 physical storage failure

Status: PROPOSED, NOT IMPLEMENTED. The physical packet permits no source edit or
rebuild and stops a failed first chain for review. This proposal needs founder
approval before changing native diagnostic code/building another APK.

## Evidence and conclusion

The reviewed C4 APK opens and renders camera preview on the actual Galaxy A15.
One automated capture-button tap returned CAMERA_OPERATION_FAILED. Founder later
reported one additional manual tap; its exact time/result were not observed.
Both saved-status observations show the same one interrupted job
16c586fc-146b-4877-9002-1d4fb89afd78, activeJob:null, ownedBytes65913 and
claimedBytes26075365. Baseline was65765bytes and zero jobs. The delta148bytes
matches the reservation-marker profile; the reserved claim increased26009600.
The app's existing recovery/classification action was attempted once and refused.
No successful JPEG, numerical receipt or model invocation has been verified.

Subsequent founder-requested storage checks show phone1.0356GiB free, OEM WARNING
and prior LOW/OK events near its1GiB low threshold; laptop75.77GiB free. The app
initially requires48.80MiB, but shell free bytes do not exclude per-app quotas or
OS errors. Before this proposed code/build step, a founder-controlled increase
in free phone space and one existing storage readiness inspection could split
transient space pressure from a persistent native IO defect. No automated deletion
is authorized and no new photo should precede successful storage readiness.

All51 C4 source-index rows were rehashed unchanged; index SHA256
30223e6d3322605f5ad9635722781418ef8970b5adbcae2029daa5135d6cadb9.
The actual source calls reserve/write-request inside gate.begin before returning
the ticket that allows JavaScript to invoke takePictureAsync. A thrown begin
supplier releases the shared busy flag but may leave an interrupted reservation.
These facts strongly support an admission/storage failure before SDK capture.
They do not identify the failing OS call, exact file profile or underlying errno.
The app-private files were not extracted through an unapproved storage bypass.

Target-PID logs and matching target audit records expose no concrete exception.
CameraProofFinalizer.code maps unrecognized exception messages to
CAMERA_OPERATION_FAILED; the UI cannot show an underlying stage/errno today.
Changing chart position or repeating Capture cannot resolve the retained orphan.
Do not attribute this storage symptom to the damaged display or founder timing.

## Smallest proposed change

Instrument existing isolated camera file-operation exceptions with bounded,
stable stage and errno/type codes, retaining the original cause. Likely scope:
CameraProofFiles.java plus focused diagnostic regression checks; adjust the
isolated native bridge only if necessary to retain the safe code in existing UI.
Examples are descriptive, not an approved contract: CAMERA_IO_LINK_EPERM or
CAMERA_IO_DIRECTORY_SYNC_EINVAL. Do not expose raw exception messages, private
paths, file bytes or identifiers beyond the already approved test status.

Keep every file operation, ordering, exclusive creation, no-follow/link/identity
guard, fsync, capacity reservation and publication/finalization rule unchanged.
Do not replace hard-link publication, weaken durability, delete the orphan,
clear data, swallow failures or add a new debug/export endpoint to make a retry
possible. Exact failed-stage evidence is required before choosing a repair.

Preserve current APK/source/index, all stopped writer evidence and phone data.
Use a fresh diagnostic evidence/build root. Do not silently change the legacy
runtime owner/source binding and make old data unreadable, or claim that its old
hash covers modified diagnostic code. A new exact external source index/APK
binding and explicit compatibility review are required before phone use.

## Validation and bounded phone step

- Focused tests for code sanitization, original-error retention and unchanged
  failure/finalization/capacity behavior; existing UI/isolation checks, types/lint.
- One offline signed release, reviewed source delta and exact APK/static closure.
  No dependency/model/recipe/permissions/scanner/provider changes or acquisitions.
- After review, one data-preserving diagnostic update and the existing interrupted
  storage inspection once to expose its underlying code. No camera capture or
  model execution in this diagnostic step. Preserve every refusal/residue.
- Report the established mechanism and smallest correction; changing atomicity,
  storage ownership/security or durability requires explicit architecture review.

No schema migration or production deployment is proposed. This diagnostic is not
the final repair or P2-03 acceptance. Geometry, JPEG/tensor/vector correspondence,
restart durability, SDK cache/RAM bounds and the host cold-render timeout remain
open. The faulty display additionally prevents representative colour/quality
claims. P2-04/05/06 remain held.

For the next approved physical attempt, founder may operate Capture directly.
The confirmed two-vibration end cue must mean attempt finished, not success;
success still requires the app's committed receipt/status. First attempt had
73.015s readiness-to-tap and27.313s preview-to-tap; founder reported returning to
chat before it. No exposure-time or frozen-framing inference is justified.
