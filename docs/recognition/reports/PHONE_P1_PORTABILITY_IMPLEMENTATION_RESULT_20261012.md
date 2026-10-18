# P1 frozen-photo portability — source and build result

2026-10-12. Sole writer `01a1051f-0777-7573-ad09-0e550a4bd56a`, existing
`C:\Users\doyew\Documents\DEV 2\COSI-m8-planning`, branch
`plan/m8-unified-scanner`, unchanged HEAD
`66ea3fc22595a48d7355d1729bb879496cc98896`.

**Prepared and self-checked for independent audit. Private host assembly and
phone execution were not performed.** This completes the dispatched local
source/generated/offline-build work, not private portability or quality
acceptance. PROJECT_STATE remains coordinator-owned. No Git effects, dependency
download, installation, device command, radio operation or operational approval.

## Exact candidate and evidence

Evidence directory:
`apps/recognition-lab/runs/phone-experiment/p1-portability-preparation-20261012-a1`.

| Binding | Value |
| --- | --- |
| Final signed APK | `recognition-portability-release.apk`, 38,911,301 bytes |
| APK SHA256 | `75a81454be500b183503f6c8cd8fe628a0f9f0a04f64dcbd690a999e35075bc4` |
| Signer SHA256 | `48550aec63c2b09f7746775002fbc93c3c2ceb95bc388be59e95bcd26a7e2d83` |
| Replay source manifest, 22 files | `506ab535f1d4e2ef0a2d2a2e4796a15af2ffe6ee5cd01207813cd973a71f93b9` |
| Fixed input manifest | `a3c210af479959d3223b1fda2aa69b6060fe70b050e7e062b9a5bf8e58fefa8c` |
| Initial source/protected baseline | `c7cf4bcfdb0fb69536c6e1c3e16b0db709089bb5e6e18caf452ffe5941dc7a25` |
| 37 existing source snapshots manifest | `960296cbbead93fb12ddb43f9e787aacabd6cdd32c6572dfc3c54b1af5d195bd` |
| 25,929 installed-input manifest | `7a5fb9e9dbf8f938531dc1c0b70edf2fe9786019c31e0c4ffeb005e449d5c1c9` |

`replay-source-pin.json` is canonical sorted compact JSON plus newline. Its
digest is compiled into `PhonePortabilitySource.java`, excluded from its own
manifest to avoid a circular hash. Both replay/manifest hashes were found in
the final DEX. Whole-checkout source snapshots, final artifact inventory and
their hashes are recorded by the last-write finalizer in `source-fingerprint.json`
and `frozen-inventory.sha256.json`; those include these reports, so their hashes
are reported through the final direct stopped message rather than embedded
circularly here.

## Implementation

Ten new `PhonePortability*.java` helpers in the existing cpu-runtime implement
strict bounded JSON/STORED-ZIP admission, frozen metadata pins, streaming packet
verification, full-resolution inverse EXIF sampling, separate cosine galleries,
one-interpreter replay, complete numerical result validation and separate private
durable storage. Two matching Java test classes use generated data only.

The Kotlin wrapper adds deliberate local Downloads import/recovery/replay/cancel/
export and bounded progress. It shares the existing worker/busy/closed gate;
requests have a separate durable 10000–23000 range, never reused or wrapped.
Generated request identities remain 40000–65535. Callback admission checks the
current request identity, cancellation and a single writing transition; promise
settlement is atomic. Orphans are explicitly classified before validating cached
evidence. Existing immutable ownership is verified before lock creation or
AtomicFile recovery. Counter corruption does not reset identities.

`PhonePortabilityPanel.tsx` and `phonePortability.ts` add an explicit private
panel in the isolated root. There is no private import/replay/recovery on mount,
image preview or vector payload in React state. The shared adapter validates and
reduces native summaries to counts/hashes; actions require deliberate input.

The new lab schema/evaluator/CLI use unchanged `ranking.ts` unit normalization and
scalar cosine arithmetic, with the all-ten-candidate technique already used in
`framingComparisonEvaluation.ts`. The independent Python comparator verifies
every exported numerical entry and recomputes both galleries and the original
baseline, compares every score/rank/reference, retains raw/normalized differences,
exact/near ties, paired regressions/improvements and failures. It compares one
tensor pair at a time and requires the recorded device export hash at its CLI.

New `tools/scripts/phone-portability-*` files provide generated checks, future
guarded tensor-only preparation, new unpublished controller preparation and APK
verification. Three existing build wrappers changed only for the new run,
scope checking and ISO-string lease parsing. No migration, shared contract,
business code, dependency, app configuration, permission, original producer or
original guard changed. The final source manifest enumerates every changed path.

## Fixed protocol and numerical rules

The compiled manifest preserves the frozen 40 identities, roles, product IDs,
original hashes/sizes, oriented dimensions, EXIF values and effective half-open
boxes. It contains metadata only, never private JPEGs, tensors or baseline
vectors. Original comparison/annotations/crop-bundle hashes remain respectively
`e39e28e9af82e5798884767854f745369b23cd18e7c24d140bf8faa00799d6d4`,
`94dc350fad86fbac717de276970cd1fe1a78edbe9bf60cdd8a49952689bbb134`,
`aa2964e8a85c81ab5fe8d05fa76fe2716da71d350df12412cd6b15ab95b4a75d`.

Input is exactly 84 STORED entries: manifest, three frozen metadata files, then
40 original JPEG/control-tensor pairs in frozen order. Central/local agreement,
no duplicate/traversal/extra/comment/encryption/Zip64, exact sizes/CRC/SHA and
strict decoded-key JSON uniqueness are enforced before decode/inference.
Caps: 128MiB encoded and uncompressed; 2MiB metadata; 6MiB/JPEG;
12,484,800 full-resolution pixels; 602,112 finite [0,1] float32 bytes/control;
4,096 finite nonzero float32 bytes/vector. Metadata/stat arithmetic predicts
131,901,810 bytes for the future STORED packet; no real packet was assembled.

Control: exact frozen laptop LANCZOS tensors, regenerated later through unchanged
`crop_producer.preprocess` and required to match all 40 tensor hashes. No new
host inference. Phone: original JPEG/full-resolution saved effective crop,
accepted pixel-center bilinear, uint8 round-half-up/gray128, unchanged float32
division by255. This is a different recipe; LANCZOS equivalence is not claimed.

One CPU interpreter, FROM_APPLICATION_ONLY, one thread, XNNPACK disabled, no NNAPI/
GPU/Play delivery; unchanged public model hash
`bbbb4c51a55a53905af1daec995ca1aae355046f8839bb8c9f5ce9271394bc40`.
At most 80 inference attempts, 40 per lane, 1500-second batch and 60-second
per-frame lateness accounting. Blocking native work cannot be forcibly preempted;
cancellation invalidates the session and drains owned work. Remaining scheduled
records remain failures. Missing reference invalidates that lane's entire gallery;
each lane retains denominator20. Truth enters only after scoring, for reporting.
Normalized control tolerance: maximum component error <=1e-4 and cosine distance
<=1e-5, with raw differences retained.

Result: at most 48MiB, numerical tensors/vectors/receipt only, no original JPEGs.
Full 80-record validation recomputes hashes, bounds, control tensor pins, parity,
galleries and every query rank before commit/readback and before export. Separate
fixed private staging plus AtomicFile committed copies support API24-era and
current implementations without assuming `.new` staging layout. Cache identity
includes exact packet and current replay source. Export hashes streamed bytes
again, with no selected-document deletion. Failures can produce a complete
failure-evidence ZIP; they never produce a complete-batch success.

## Checks actually run

- Final pure Java: 20 checks, including16 expected rejection cases; 14,888,235
  generated assertions and256 byte-for-byte geometry comparisons across all
  eight EXIF orientations, full/cropped inputs, up/downsampling and padding.
  Maximum full-resolution bounds sampled from an authored pixel function.
- Actual store Java with explicit host Context/AtomicFile/JSON emulation:27
  generated checks, including restart, orphan IDs, cancellation, wrong owner,
  outside-root names, partial result, corrupt result and corrupt journal.
  Emulated AtomicFile does not establish Android durability.
- Host preparation/comparator:35 generated checks; unchanged preprocessing on
  eight generated JPEG orientations; full80-record independent comparison and
  cancelled-gallery20-denominator comparison; malformed ZIP/rank/hash/source/
  identity/cap rejections. No model creation or real private decoding.
- New controller:61 generated checks; actual unpublished Start/Helper refusals
  before runtime/private/native effects; pure radio/no-uplink fixtures; identical
  guard function bodies except explicit root wiring; native definitions compile
  without native controls being called.
- Lab Jest:1 suite/5 tests,12.733s. Mobile affected/current generated suites:
  5 suites/13 tests,13.49s. Lab/mobile typechecks and zero-warning lint exit0.
- Offline release a1 and final a2: exits0, Java/Kotlin/R8/signing/lint-vital included.
  Final build3m31s. Existing Gradle deprecation warnings retained; no skip/dontwarn
  or dependency/artifact stripping was introduced.
- Final APK: signer, ZIP16KiB alignment, ELF loads, all15 unchanged native
  payloads, all104 unchanged model/generated assets, six identical artifact
  graphs/hashes,44 LiteRT native methods and reflective factory retained.
  Only the JS bundle and its two exact code-dependent dexopt profile files change
  among existing asset paths. No asset additions; seven app source-map entries
  are exclusively the experiment/entry; no business/Supabase/router imports.
  Manifest has no permissions, providers, receivers, services or network access.
- All17 accepted compiled generated helper classes remain byte-identical.
  Original source/config/entry/options/math/spec/old tests remain unchanged except
  the allowed wrapper/root/adapter/new-run wrappers. Preservation rechecks cover
  817 baseline source records,82,222 protected records and25,929 installed inputs.

Diagnostics and corrections are retained in `verification-failures.json`, logs
and the intermediate a1 APK. They include checked-exception test compilation,
PowerShell ISO date coercion, an overly strict dexopt-profile comparison, two
new Gradle lock outputs moved with verified readback into the new run, and
Windows long-path handling for compiled-class checks. No old run was rewritten.

## Acceptance limits and next action

Writer source/generated/build checks pass. Independent audit is pending. Native
private picker, actual full-resolution decoder/EXIF, memory pressure, real80-call
replay, phone offline state, restart/partial-document behavior and all private
numerical/quality results remain unexecuted. No production, speed, calibrated
UNKNOWN, automatic segmentation or broader recognition gate passes from this
work. Existing generated CPU9/9 and image42/42 device evidence retain their
original limited scope.

The new Temp controller is unpublished and contains draft templates only. Its
manual radio-OFF/no-usable-uplink/job/restoration predicates are unchanged;
polling races/OS brokers/helper or power failure remain limitations. See HANDOFF
for exact bounded future actions. Finalizer releases the lease as its last write;
one explicitly authorized direct stopped message must then reach the coordinator.
