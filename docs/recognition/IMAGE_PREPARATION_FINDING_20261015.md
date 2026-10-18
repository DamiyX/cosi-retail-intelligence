# Image preparation and representative phones — retained finding

2026-10-15, Africa/Lagos. Founder requested a durable record for future models
and implementations. This is a measured finding and proposed evaluation scope,
not approval to change the current model, recipe, runtime or product architecture.

## What was measured

The same 40 saved JPEGs and reviewed effective boxes produced 20 queries against
20 reference views of ten physical items. Frozen laptop preparation used Pillow
LANCZOS. The installed Galaxy A15 path decoded the JPEG, interpreted EXIF,
sampled the saved oriented crop, resized with pinned pixel-centre uint8 bilinear
math, preserved aspect ratio with grey128 padding to224x224 RGB, and converted
channels to float32/div255. It did not retake, enhance, invent detail or rearrange
the scene. Input tensor shape was1x224x224x3; output1024 components.

- Laptop baseline:17/20 first,20/20 first three.
- Same laptop tensors inferred on phone CPU:17/20; all40 control vectors passed
  frozen parity tolerances and all20 candidate orders matched the baseline.
- Phone-prepared tensors inferred on phone CPU:19/20 first,20/20 first three.
  Airpro p02-explore-2 improved3→1; CWAY600 p05-explore-1 improved2→1.
  CWAY750 p04-explore-2 remained2, behind CWAY600.

Evidence: reports/PHONE_P1_C2_DEVICE_RESULT_20261015.md and its unchanged
independent comparator output. Numerical evidence is valid for this packet;
that run's physical offline observation had a retained50.952-second gap and is
not a complete offline pass. The two recipes also differ in decoder/platform
path; the evidence does not isolate resizing alone as the causal factor.

## What this does and does not mean

Image preparation is a decision-relevant experimental variable. The control
comparison argues against attributing this observed gain simply to a faster
phone processor. It is not evidence that bilinear always beats LANCZOS, that
Samsung always beats Tecno/Infinix/Xiaomi, that an S24/iPhone would score higher,
or that95% generalizes beyond these correlated views of ten known items.

For fixed saved photos, define/test one explicit orientation, crop, colour,
resize, padding and normalization contract on supported devices. Target matching
results within stated numerical tolerances; do not promise bit-exact decoding
or identical near-tie rankings without device evidence. Processor/RAM/thermal
conditions affect latency, memory pressure and completion. Live camera capture
adds focus, blur, exposure, glare and camera-processing differences; this saved
photo replay did not measure those effects. iOS has not been implemented/proven
by this Android-only run.

## Proposed later checks, not changes to the current verification

1. Preserve a recipe/version/hash with enrollment and query evidence; use a
   compatible preparation contract for both galleries and queries.
2. Compare candidate preparations on a separately frozen, more representative
   set with lookalike package sizes, multiple views, difficult light and unknowns.
   Keep all failures/rank changes; do not tune to these20 exposed queries.
3. Include representative affordable Android devices (founder specifically
   named Tecno, Infinix and Xiaomi), plus the Galaxy A15 baseline. Record actual
   model/OS/chip/RAM, then compare fixed-input parity and stage/full-scan timing,
   peak memory, sustained heat and completion separately from recognition ranks.
4. Optimize only a measured bottleneck: avoid redundant image copies/resizes,
   reuse bounded buffers, and test safe decoding/resource limits. Any smaller
   decode, quantization, hardware delegate or alternate resize is a separately
   reviewed recipe/runtime change with its own accuracy/parity regression check.
   No new dependency or model change is approved by this note.

Google's [Android image-recognition example](https://developer.android.com/codelabs/recognize-flowers-with-tensorflow-on-android)
documents resizing/conversion as model-input preparation. Its
[LiteRT delegate guidance](https://developers.google.com/edge/litert/performance/delegates)
separates device/model-specific latency/memory benchmarking from precision and
accuracy evaluation. Sources checked2026-10-15; no hardware ranking inferred.

Later October15 confirmation: the separately monitored b1 repeat again returned
17/20 control and19/20 phone first choices, with all20 query candidate orders
unchanged from the first run. All80 input tensors were byte-identical; eight
output vectors had small retained float differences without rank changes.
Continuous actual-OFF/restart/export/comparator evidence now passes for this
frozen packet; see reports/PHONE_P1_OFFLINE_CONFIRMATION_RESULT_20261015.md.
This strengthens repeatability on the same phone/inputs, not cross-device or
independent-product generalization.
