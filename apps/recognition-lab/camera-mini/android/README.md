# Camera Component Probe

Standalone native Android lab application, package
com.damiyx.retailintelligence.cameracomponentprobe. App/native launcher and
camera-component library have no React, Expo, old test validation, model or
business-store dependency. Android and GPU/driver are still shared with the phone.
No graphics fix, physical geometry, performance or production readiness is claimed.

The manifest explicitly removes transitive network-state/Internet permissions;
only CAMERA and its own AndroidX signature receiver guard are allowed.

The usable signed release requires exact sourceSha at build time and pins the
reviewed lab signer. Startup verifies signer and computes its observed base-APK
hash on a worker. Those values, package/process/UID, fixed S00 and recipe bind the
immutable capture intent and geometry record. External install verification must
compare observed APK with the final candidate hash; an APK cannot pin its own hash.
The reused debug lab signer is for this experiment, not production signing.

Only explicit controls request CAMERA, open preview, declare READY, dispatch the
single S00 capture, close/cancel, inspect saved crop/receipt or consume an export.
No startup camera, permission request, automatic capture, replacement, retry,
reset, deletion or old-data adoption. Fixed2:1 preview and80% centered guide stay
above independently scrolling controls. Five-percent guide padding is applied
in EXIF-upright coordinates, exactly once. Full-buffer rear zero-zoom capture and
sensor/display/use-case/EXIF agreement are required. Physical field-of-view and
crop correspondence still need measured chart proof. No pose-hardcoded correction.

READY uses monotonic time. Session.Ticket retains original READY time; dispatch
rechecks original120s window immediately before takePicture, rejecting equality.
Logical invalidation never waits on publication IO. Data can be staged while
cancelled; a short claimCommit decision authorizes the terminal receipt. If
cancellation precedes authorization, no receipt publishes; already-authorized
commit may finish and explicitly reports cancellation-after-commit. Unknown
publication remains retained. Safe stage/code/class refusals after intent are
recorded in a bounded failure leaf; incomplete records cannot export. No timeout pretends callbacks/hardware drained.
Idle preview pauses after120s; settled preview closes after30s. A lost callback
can remain DRAINING and blocks new work. Original failures and residue are retained.

AndroidOwner holds one disk/RecordOwner per process, without an Activity reference.
Recreated Activities reuse that owner and can inspect saved records. Process
restart reopens hashes; any existing intent prevents another sensor invocation.
A cancellation never refunds S00. SDK proxies close before worker scheduling,
including duplicate/stale/copy/rejection branches. Publication uses descriptor
checks, exclusive temporary files, sync and JNI renameat2(RENAME_NOREPLACE).
Device execution must still verify filesystem/fsync/drain and restart behavior.

Proposed standalone cap64MiB: original10, staging/residue10, derivatives2,
metadata2, archive staging16, selected output16, reserve8 MiB. Source implements
one original<=10MiB/4MP, crop<=2MiB and bounded records. Export streams one<=16MiB
ZIP to a new empty local primary:Download/*.zip document after durable one-attempt
consumption. Cancellation/failure/unknown state never rearms. Readback count/hash
must match; no provider-directory/power-loss durability claim. ZIP contains exact
original, crop, intent, geometry, receipt and JSON hash manifest. A failed/partial
selected file stays for human disposition. Free-space checks require conservative
256MiB floor plus worst-case reservation before capture. SDK/cache/totalRAM/GPU
are separately exposed, not hard-capped. Old253602084 claims remain untouched.

Local verification:

    python apps/recognition-lab/camera-mini/android/verify-local.py <new ignored evidence folder>

This compiles actual Java against cached classes and native C for Android ARM64,
and runs mechanism/fault tests. javac BuildConfig is explicitly a fixture; it is
not the APK proof. Tests include reproduced READY expiry/nonblocking cancellation,
commit boundaries, proxy closure and scheduling, geometry admission, hash/torn/
quota, same-process record reopening and at-most-once export. Injected disk tests
are not Android filesystem or camera evidence.

Offline signed build (no installation):

    python apps/recognition-lab/camera-mini/android/build-local.py <new ignored build folder> --write-locks

Use write-locks only for first dependency freeze; final build uses existing locks.
Cached JDK17/SDK36/NDK27.1/CMake3.22.1/Gradle9.3.1/AGP8.12 are explicitly selected.
SDK36 aapt2 and cached Javapoet1.13 align the prior reviewed toolchain; no download
or dependency-version upgrade in the old application. source-index.json excludes
build/.gradle/.cxx/local.properties and supplies BuildConfig.SOURCE_SHA. Full final
Gradle/R8/signature/ELF/manifest/dependency evidence accompanies the candidate.

No physical/export budget is authorized by the APK. Final independent audit and
founder-approved finite install/S00 packet with fresh human READY precede device
use. Keep this app as reference. Immediately after standalone upright proof,
integrate this library into the recognition app and physically check its normal
entry/crop/CPU-adapter/result/reopen path before further matrix or P2-04 work.
Integration source and additive storage decisions remain separately held.

Correction C1: binding/phase-owned preview timers give fresh READY its full120s
window and all settled outcomes a30s post-observation interval. Stale timers
cannot stop replacement previews; no timer releases owned callbacks. Admitted
JPEG and hash-bound native geometry publish before pixel decode/crop/compression.
Partial/refused records retain that evidence without a success receipt, export,
recapture or new partial-image reader. Complete records retain the existing ZIP
entry set. Export admission requires256MiB floor plus16MiB output and8KiB metadata
headroom; selected destination descriptor volume is checked again before writing.
Unknown/insufficient capacity refuses, and selection never refunds consumption.

Diagnostic C3 preserves the existing admission predicates: buffer-rotation,
buffer-crop and buffer-rotation-crop distinguish rejected geometry. Numeric
context records B=JPEG bytes, E=EXIF tag, ER=expected degrees, R=proxy degrees,
W/H=proxy dimensions, L/T/X/Y=observed crop, EL/ET/EX/EY=expected full-buffer crop.
N encodes a negative sign; UNKNOWN means unsupported EXIF expectation. Header
limits MAXB/MAXP and safe MIME/encoded-versus-proxy size labels aid interpretation.
Existing detail80 and durable failure512 limits remain; numeric context is capped
at220 allowlisted characters. No rejected image retention, relaxed admission,
new slot or automatic repeat follows from these diagnostic labels.

Fixed S01 diagnostic continuation (founder-approved after refused S00): the app
requires the existing S00 root with exactly intent/failure and its existing zero-
byte owner.lock. It never recreates/reset/rearms S00. S00 is a read-only refusal
view; its two file hashes are sealed and checked before S01 writes. One process
lock/RecordOwner/worker/Session serves explicit S01 selection; no camera is created
at launch or fallback after consumption. S01 root is the fixed sibling
camera-component-standalone-s01-v1, lazily created by its first admitted intent.
Both slots remain consumed after their durable intent, including after restart.

Aggregate accounting inventories exact allowlisted own-root bytes, with native
regular-file/single-link/UID/no-follow checks and per-leaf bounds. Unknown entries,
staging residue, wrong prior shape or changed prior hashes refuse. Before S01
intent, exact retained S00 bytes plus48MiB must fit the original64MiB: original10,
crop2, metadata2, possible stage10, selected output16, contingency8MiB. Streaming
ZIP has no private archive staging. Every publication rechecks inventory plus new
bytes and16MiB output+8MiB contingency within64MiB; output headroom is never refunded.
No new64MiB allowance, rejected-image reader/export, arbitrary root/slot selector,
generic retry allocator or physical repeat authority is created by the code.

Crop-alignment v2 supersedes full-buffer equality ONLY for the new recipe. Valid
nonempty in-bounds native crops are allowed after supported EXIF/header/rotation
checks and checked sensor-to-preview/buffer mapping. Preview and capture bind in
one UseCaseGroup with PreviewView's actual measured ViewPort; renderer unchanged.
Copied finite affine matrices and view/viewport identity must stay bit-stable at
READY, dispatch and callback. Perspective, skew, reflection, custom view/ancestor
transforms and mismatched common area refuse. V-to-U = EXIF * A * inverse(P),
with <=1 B pixel native-crop edge rounding and <=0.0001 B pixel numeric epsilon.
Padded guide corners map to U; one floor/ceil extraction bounded by native crop/U
records clipping deltas. JPEG remains unchanged, EXIF applied once after admission.
Metadata/provenance is v2; historical v1 files/fixtures keep their interpretation.
The full-frame EL/ET/EX/EY fields in v2 admission refusal describe crop bounds,
not a requirement that a valid native crop equal the full frame. Cross-area
diagnostics encode actual/expected edge doubles as uppercase IEEE754 hex bits.
S00/S01 remain exhausted. No S02 or additional physical allowance is enabled.

The narrow JNI publisher is independently implemented against the platform API,
using the same mechanism as repository CameraProofRename, without legacy source
bodies/globals. Third-party code remains in dependency artifacts with its notices.

Founder-approved fixed S02 replaces S01 as the only writable trial root. Both S00
and S01 must each contain exactly their bound intent and terminal failure. Native
no-follow inventory hashes/measured byte totals are exposed before intent. Both
roots stay read-only; same single S00 owner.lock. No reset or allocator. The48MiB
reservation now counts both retained roots inside the SAME64MiB aggregate; every
publication rechecks both hash seals plus active bytes/output/contingency. S00/S01
photo/screenshot allowances remain consumed; S02 one photo/two screens requires
fresh READY. One existing successful-only export allowance unchanged.

31October founder-approved fixed S03 supersedes S02 as sole writable trial root.
S00/S01 exact refused shapes and S02 exact saved+COMPLETE_READBACK shape are sealed,
read-only; no prior crop reader/export UI added. Retained inventory exposes all11
prior private leaf byte lengths/hashes. Prior S02 selected ZIP1171223bytes/SHA
10a41e841e80fd4186a7e444f8fa669ed68cf98286fdabc773c756a48cd7e2af is a nonrefundable
output claim measured via host stat/hash before build and rechecked before trial;
the native app counts that constant claim without acquiring new storage permission.
Native prior-private inventory plus charged old output plus48MiB S03 reservation
must fit SAME64MiB. All new publications include charged old output plus actual
three-root/active bytes and fresh16MiB output+8MiB contingency. No old export refund.
S03 owns ONE new photo/TWO screens/ONE new successful-only <=16MiB local ZIP/readback/
selected transfer, cumulative4photos8screens/2exports2transfers if all completed.
No generic allocator/reset/autoretake; native camera/math/renderer recipe unchanged.
