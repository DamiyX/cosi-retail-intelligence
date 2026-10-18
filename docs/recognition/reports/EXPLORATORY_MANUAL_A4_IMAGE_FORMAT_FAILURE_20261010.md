# Manual-a4 actual image-format failure — October 10

Main coordinator independently reviewed actual founder-launched attempt
`offline-manual-20261010-a4`. **Actual incomplete E05 result; not recognition
quality evidence.** The a4 attempt/package/approvals/Desktop/results are consumed
and immutable. No automatic retry, fresh private inference or photo change.

## Actual result and reviewed bindings

Exact runner `3f57f4fa6a518d4bbf19d59e3b0e05cd9ebef3e667d94704b9799e2308d98176`.
Session started 13:18:59 Africa/Lagos; actual offline marker at 13:21:52;
stop receipt 13:22:22; final result 13:24:03. Recorded result Failure=null,
PrivateExitCode=2, restoration ORIGINAL_WLAN_AND_ROUTE_PRESENT. Three owned
jobs created/drained, zero active children, empty receipt bound to result and
recovery phase. Current read-only process query finds helper PID9536 absent.
Session/nonce/message hashes bind observed/ready/ARM/OFF/ON/receipt/result.

Private producer and evaluator were actually invoked in the guarded offline
window. Model load succeeded; bundle40 records all DECODE_ERROR, zero vectors,
runFailure=null; evaluator retains20 query rows, zero scored, incomplete gallery.
Load602.533ms, encoding1590.404ms, producer attempt2208.998ms. These timings
include failure accounting, not40 successful inference operations or performance
measurement. 0/20 is an unscored tool failure, never zero recognition accuracy.

Actual native OFF/manual prompts/ordinary job draining and WLAN restoration were
observed in this one run. This does not establish crash/power/unknown-child
recovery, hostile-OS isolation, internet reachability or Android operation.

## Confirmed cause and diagnosis boundary

All40 files start as JPEG; none ends immediately at its primary JPEG EOI marker.
Pure marker/header inspection finds40 SEFT-ended trailing blocks,143..182bytes;
no ICC profiles, motion-photo marker or MP4 signature in those blocks. No private
pixels were decoded during online review. Original approved hashes all match.
Current producer.preprocess requires data.endswith(FFD9) and raises STRICT_JPEG
before opening any JPEG. Worker collapses this to DECODE_ERROR for each image.

Generated untagged JPEG control succeeds; the same generated pixels with a
trailer fail STRICT_JPEG. These generated differential cases and40 unchanged
actual structural/header observations establish the rejection mechanism. Valid
primary marker boundaries do not independently prove every private pixel will
decode or that every appended container is safe. No broad tail stripping,
arbitrary suffix acceptance or online private preprocessing is authorized.

The prior audit validated synthetic strict JPEGs but missed this actual-phone
container boundary. Correcting this requires explicit bounded input-format
handling and generated equivalents, rather than weakening malformed-input
checks or changing the recognition model. Numeric RGB/orientation/letterbox/
normalization/output/ranking must remain unchanged. Any intentional acceptance
policy adjustment must be declared and independently reviewed in new source/
setup bindings before a new operational package; old approvals are not reused.

## Preservation and next step

External evidence `C:\Users\doyew\AppData\Local\Temp\cosi-exploratory-manual-a4-result-review-20261010`. consumed-a4-preservation.json freezes29 actual
attempt/result/package/approval/Desktop files. Original291 a4 indexed artifacts,
14a1/19a2/19a3 consumed digests and40 photo hashes match. Header-only findings
and actual reports remain private/local, with no uploads. Initial coordinator
checker wrongly assumed asset IDs were in runtime manifest; actual IDs are in
the study entries. The initial checker source/tool failure is preserved; corrected
checker changes only its own new schema lookup, never tool/source or actual result.

Same sole Sol6.1 HIGH implementer receives scoped image-format diagnosis/repair
with new regression files, stops and reports back. No operational a5 approval,
launch, Desktop promotion or pixels by writer. Main coordinator audits stopped
return before any new founder single attempt. Native privacy guards and all old
attempts stay unchanged. No installs, downloads, network settings, phone, M12 or
other milestone. Formal holdout/calibration/unknown/Android/production gates OPEN.
