# IJ-01 — stopped bounded JPEG-container correction

2026-10-10. Same sole GPT-6.1 Sol HIGH writer
`01a1051f-0777-7573-ad09-0e550a4bd56a`; branch `plan/m8-unified-scanner`,
unchanged HEAD `66ea3fc22595a48d7355d1729bb879496cc98896`.
**STOPPED source correction; independent coordinator audit pending.**
No private-photo decode/inference or new operational package by this writer.

## Outcome and diagnosis

`producer.py` now accepts a primary JPEG followed by a narrowly validated SEF107
scalar-metadata trailer. It passes only primary JPEG bytes to the existing
decoder. Generated tests reproduce old rejection and verify exact oriented RGB
pixels, normalized tensors and thumbnails against the primary JPEG. Arbitrary
suffixes, concatenated images and malformed wrappers reject. This is a declared
input-acceptance adjustment, not recognition evidence.

Consumed actual a4 remains incomplete: model loaded,40 DECODE_ERROR records,
zero vectors,20 unscored queries. Its recorded ordinary native OFF/drain/
restoration happened once; these failures are not zero recognition accuracy.
See `EXPLORATORY_MANUAL_A4_IMAGE_FORMAT_FAILURE_20261010.md`. Historical attempts,
packages, approvals, Desktop and outputs remain immutable; no a1-a4 retry.

Header-only inspection of all40 hash-verified originals found38 trailers of
143bytes with3 records, and2 of182bytes with4 records, version107. Directory
lengths48/60, backward offsets, record headers, contiguous spans, fixed names/
sizes and decimal-byte shape match the supported subset. No metadata values
(timestamps, location or device identity), private pixels or vectors were
extracted. Structural compatibility does not prove private pixel decoding.

The structural reference is ExifTool's SEFH/SEFT directory reader: little-endian
header/count,12-byte entries, backward offsets, record/name lengths and named
tag types. Its broader media/corruption tolerance is deliberately not used.
[Primary ExifTool parser](https://raw.githubusercontent.com/exiftool/exiftool/master/lib/Image/ExifTool/Samsung.pm).
JPEG marker/segment, scan and restart boundaries were checked against
[libjpeg-turbo's primary marker reader](https://raw.githubusercontent.com/libjpeg-turbo/libjpeg-turbo/main/src/jdmarker.c)
and the locally pinned Pillow12.3 JPEG plugin. No parser/runtime dependency was
installed or downloaded; browsing read primary source text only.

## Explicit acceptance policy and trust boundary

New source policy: `jpeg-primary+sef107-scalar-metadata-v1`.

- Untagged primary JPEGs still decode through the existing pinned Pillow path.
  A bounded marker walk locates the actual primary EOI, skipping length-delimited
  APP/EXIF payloads, stuffed entropy bytes and ordered restart markers, and
  traversing progressive/multiple scans. It does not search first/last FFD9.
- Truncated/malformed segment lengths, duplicate frames/SOI, invalid scan
  selection, empty entropy, invalid restart order and unsupported markers reject.
  The walk is a container-boundary check; Pillow remains the pixel decoder.
- A suffix must be exactly one SEFH/SEFT107 directory with3 or4 records, at most
  256bytes. Exact required types/names are0x0a01 Image_UTC_Data (13 scalar bytes),
  0x0aa1 MCC_Data (3),0x0c61 Camera_Capture_Mode_Info (1), plus optional0x0d21
  Camera_Scene_Info (2). Values are checked only for decimal-byte shape and then
  discarded; never parsed as time/location/identity or used for recognition.
- Directory size/count, zero flags, matching record headers and exact name/data
  lengths must agree. Backward spans must cover the entire suffix data area once,
  without gaps, overlap, duplication, outside offsets or integer wraparound.
  Unknown records, media, extra trailers and forged/truncated footer-only data
  reject. A structurally valid wrapper is not authenticated camera provenance.
- The entire original buffer, including trailer, retains its original allowlist
  hash and opaque ID. Only after validation is a primary-JPEG buffer selected
  for decoding; original files are never rewritten. Trailer metadata never reaches
  decoder/OCR/encoder, thumbnails or logs. No OCR was added.

Original40MiB compressed/50megapixel limits remain. Marker/scan traversal is
additionally bounded at65536 markers/1024 scans. This is not a universal Samsung,
motion-photo, audio/video, HEIF or arbitrary appended-container implementation.
Future formats require a separate reviewed policy rather than fallback.

## Exact source and binding consequences

Modified existing file: `apps/recognition-lab/tools/exploratory/producer.py`.
New regression: `apps/recognition-lab/tools/exploratory/test_jpeg_container.py`.
Other existing source/tests/configuration are untouched. No shared/mobile/
business/sync/contracts, dependency, model, threshold or ranking change.

Before producer SHA-256:
`d7813989d669ebb37360a60db13760c70eb581459c740be62e1610d959f515a7`.
New producer SHA-256:
`72dbe8b944eb6e78ee4eb1b06fddf068977c5d43f287037581e78ee769d40ca1`.
New regression SHA-256:
`13815051acecce5159a2942418f8124192f50ce29ef75b96740b2a2bba16d934`.

AST comparison verifies17 other existing functions unchanged. In `preprocess`,
only the old SOI/EOF check is replaced with the container selection call. Two
new local helpers/constants implement that selection. All following RGB/EXIF
orientation/profile, resize/letterbox, normalization, tensor signature and
thumbnail operations remain exact; worker, buffered/hash/path,40row accounting,
source fingerprint algorithm and approval validation remain unchanged.

The numeric RECIPE descriptor and SHA remain
`ac67af950aed4789c275425b93e8816cf0950f2d6bd01a199879a011b669b81a`;
model SHA remains
`bbbb4c51a55a53905af1daec995ca1aae355046f8839bb8c9f5ce9271394bc40`.
Input acceptance is intentionally different and must be reviewed explicitly.
Source fingerprint changes from
`1df885b33fe752ac2c81fa9a7e4b7bfa432a9bddb1b1d63435643245831b8cb0` to
`e8a18df3c3961a9a8b98cd9db8f4612368a4e2174cda9d25cc1fe22ac15d33c2`
(including the new test through the existing fingerprint algorithm).

**No old recipe/setup/source approval is reused or rewritten.** Coordinator
must independently audit this input-policy delta and prepare fresh exact
setup/source bindings and a future single-attempt package if accepted. This
source return alone authorizes no operational execution or a5 publication.

Decoder failure remains the existing `DECODE_ERROR` enum; container helpers use
bounded local symbols `STRICT_JPEG`/`JPEG_CONTAINER`. A richer report-stage reason
would require a schema/consumer change outside this ceiling; none was improvised.

## Checks actually run

| Evidence | Result and scope |
| --- | --- |
| Header-only structural inspection |40 originals; no private decoding or metadata values collected |
| Literal captured-old regression, final |65 tests;21 wrapper errors plus4 failed new expectations,40 controls pass; intentional exit1 |
| Corrected generated regression, final |65/65 pass in6.558s; actual generated Pillow preprocessing, no model |
| Unchanged existing producer suite |14 methods,13 pass/1 host symlink privilege skip; no test altered |
| Existing exploratory Node study/math/report/path cases |13 child cases pass through one Jest wrapper |
| Lab typecheck/affected ESLint |Both exit0, zero warnings |
| Python AST/source-scope/model/recipe comparison |Pass; only declared producer delta |

Positive coverage includes all8 EXIF orientations in baseline and progressive
JPEGs, portrait/landscape/odd padding, an actual EXIF embedded JPEG thumbnail,
entropy stuffing and generated restart sequences, reordered scalar records and
different nonpersonal scalar bytes. Tensor/pixel hashes match an independently
expressed primary-JPEG oracle; thumbnail bytes match the primary result, and a
decoder spy receives exactly primary bytes.

Negative cases cover arbitrary/EOI-ended polyglot tails, second JPEG, extra bytes
before/after wrapper, multiple wrappers, footer-only/empty/forged/truncated
directories, unknown/media/duplicate tags, wrong names/payload sizes/shapes,
count/length/offset overflow, gaps/overlap, header/flag mismatch, missing records,
truncated primary/malformed scan or segment, duplicate SOI, wrong/missing restart
interval, global/trailer oversize, original full-buffer hash mismatch, input
replacement between stat/open, and a real Windows junction rejection.

Actual worker preprocessing plus collect accounting was exercised with generated
files and an explicitly mocked interpreter, preserving40 IDs/full-container
hashes: valid40 vector records;3 malformed images retain3 DECODE_ERROR rows;
changed input yields INPUT_CHANGED then39 NOT_RUN. These fake vectors verify
pipeline accounting, not real encoding, quality, latency or private recognition.
Existing spawn/timeout/crash/load/error checks remain attributed to the unchanged
producer suite. The host symlink case remains unverified; real junction rejection
passed without elevation.

Initial fixture mistake is preserved: a Path.stat call-count trigger failed to
replace the input at the intended boundary, so the first before/after run fails
that one new fixture. It was replaced with an explicit Path.open boundary swap;
the correction passes against both old and new buffered code. Production
producer bytes never changed between those runs. Round1 old/new logs, source
copy and generated files remain intact. Final old failures are21 expected
wrapper rejections,2 accounting expectations and2 concatenation/polyglot
rejections; these are not25 independent defects. Initial runs reported long
host wall-clock durations (about2097/2098s); their cause was not established and
these durations are not producer/inference benchmarks. No retry concealed a
source failure or weakened assertion/configuration/timeout.

## Local evidence and review commands

Immutable preparation root:
`C:\Users\doyew\AppData\Local\Temp\cosi-exploratory-ij01-20261010`.
See `source-check.json`, `producer-only.patch`, `header-structure-strict.json`,
`before-round1.log`, `after-round1.log`, `before-round2.log`, `after-round2.log`,
`legacy-round1.log`, `report-schema-tests.log`, `typecheck.log`, `lint.log`,
`preservation.json`, `allowed-state-delta.patch` and `frozen-handoff.json`.
Final generated evidence is `generated-tests-95d0d29ac2324ab7baf32449a55a7e06`;
final before is `generated-tests-11ef5e811dd94f348b8928d50437c8ab`.

```powershell
$checkout = 'C:\Users\doyew\Documents\DEV 2\COSI-m8-planning'
$evidence = 'C:\Users\doyew\AppData\Local\Temp\cosi-exploratory-ij01-20261010'
$py = "$checkout\apps\recognition-lab\runs\exploratory\e01-e03-20261004\venv\Scripts\python.exe"
$env:IJ01_EVIDENCE_ROOT = $evidence
& $py -B "$evidence\Check-Source.py"
& $py -B "$checkout\apps\recognition-lab\tools\exploratory\test_jpeg_container.py"
# Intentional old-fails differential; exit1 is expected.
$env:IJ01_BEFORE_SOURCE = "$evidence\producer-before.py"
& $py -B "$checkout\apps\recognition-lab\tools\exploratory\test_jpeg_container.py"
Remove-Item Env:IJ01_BEFORE_SOURCE
```

Reviewer runs create new generated evidence; freeze describes the writer's
handed-off membership. Tests create local generated junctions and retain their
own fixtures; they never read private study/photos/model or launch manual helpers.

## Preservation, stop and residual limits

Fresh baseline664 source/67277 protected entries, including actual a4 outputs/
review and all earlier failures. Permitted existing source delta: producer.py,
active workflow fields and current PROJECT_STATE line only; other661 source
entries remain exact. Only the new regression and this new handoff are added in
the repository. Original845/a2 854/a3 276/a4 291 indexed packages/freezes,
14a1/19a2/19a3/29a4 consumed digests,40 approved photo hashes and49 private intake
files remain intact. Hash/member proof and final freeze record exact results,
Git branch/HEAD and released lease. No old photos/manifests/claims/approvals/
packages/results/Desktop/historical evidence were edited or cleared.

No private preprocess/decode/thumbnail/vector/inference; no new approval/package/
launcher/attempt, network toggle/helper/native OFF/firewall/profile/adapter/
Sandbox/global configuration/elevation/install/download/cloud/paid/upload/
hosted/Git/phone/Docker/Metro/APK/M12 effect. The writer stops after one direct
authorized coordinator handoff. Primary-source browsing and private header-only
inspection are the stated read-only actions.

Private images may still fail decoder/profile/orientation/model/runtime checks;
no private success is asserted. The marker walk is not a full entropy validator
or a guarantee against decoder/OS defects. Structural wrapper validation is not
metadata authenticity. Resource worst cases and broader formats remain limited
by the documented caps and existing worker deadlines, not a universal safety
claim. Formal holdout/calibration/unknown/Android/production gates remain OPEN.
Next action: independent stopped source audit, then coordinator-owned fresh
bindings/package decision; preserve the actual a4 incomplete result.
