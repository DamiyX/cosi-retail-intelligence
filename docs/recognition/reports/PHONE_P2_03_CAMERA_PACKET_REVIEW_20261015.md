# P2-03 camera document review

2026-10-15. Coordinator review complete: the saved packet is ready for a design
decision, with the mandatory storage clarification below. This accepts document
preparation only. It does not approve G0, close P1, dispatch camera implementation
or authorize a build/install/device/radio effect.

Reviewed draft: docs/recognition/PHONE_P2_03_CAMERA_REVIEW_PACKET_20261014.md,
31,459 bytes, SHA256
c6a0a070e267fa253235a0bcc6f95240c3eabc848f02fdb9168102a0c3b4fd9a.
The exact draft remains unchanged. Read this review alongside its proposals.

## Delivery and checked evidence

The same writer returned two explicit STOPPED INCOMPLETE handoffs after interrupted
sessions outlasted their finite leases. A1 had no packet; A2 saved the packet while
its lease was live but stopped before final link/inspection verification. Neither
writer completion marker is relabelled as a completed task. The coordinator has
finished the document/reference review directly; no third investigation restart or
writer renewal is needed. The expired lease is released.

Independent evidence root:
apps/recognition-lab/runs/phone-experiment/p2-camera-packet-independent-20261015-a1.

Checks performed:

- A2 STOP/handoff/packet/inventory/protection hashes and all12 evidence entries
  verified; A1 stopped evidence and14 prior inventory/marker bindings preserved.
- All57 protected source/document/package/config rows match the coordinator
  baseline, including the24-file P1 source pin. Workflow/state were exact before
  coordinator review. No implementation edit was observed in the protected set.
- All33 distinct local source/report links resolve; their exact bytes/hashes are
  recorded in source-reference-inventory.json. Markdown Windows path prefixes were
  normalized for filesystem checking. This is not a claim of UI rendering tests.
- Installed camera57.0.6 Gradle/manifest/capture/resolution/processing/types were
  checked against the proposal. The recognition variant currently excludes camera
  and network access; the existing native adapter has no arbitrary live-image API.
- Capture resolution fallback can go higher than the request. Raw capture can return
  missing EXIF dimensions. Zoom0 is the unzoomed/minimum1x request, whereas normalized
  zoom1 means maximum zoom. GeneratedImageGeometry caps sides at512; the packet
  correctly requires a separate bounded general-size path rather than raising old
  P1 bounds. Preview/JPEG correspondence and resource drain remain unproved.
- Proposed permission/ingress/model/recipe/geometry/ownership/storage/test gates and
  G0-G5 dependencies reviewed. P1 source/installed APK preservation is explicit.

There was no new code, dependency resolution, prebuild, APK, model execution,
private-pixel access or phone action. Software/unit suites were not rerun for these
document-only changes. Workflow schema validation is the relevant metadata check;
P2-01/02 functional evidence remains the earlier accepted evidence.

## Required clarification CP-D1: producer output versus admitted storage

The draft proposes a256MiB total budget covering retained evidence and SDK cache,
and reserves24MiB for a12MiB SDK JPEG plus a12MiB owned copy, with metadata space.
The19/20-file arithmetic is correct **only if the producer's temporary JPEG is
already bounded by12MiB**. The inspected raw Expo route does not enforce that bound:
ResolveTakenPicture.kt skipProcessing writes imageData into a ByteArrayOutputStream
and then the cache file before the proposed consumer can reject oversized output.
Picture-size fallback can also exceed the requested pixel count. Rejecting the
completed file is an admission bound, not a producer-side storage guarantee.

Before G0 approval and any source dispatch, choose and record one of these policies:

1. Recommended for evaluating the installed path: enforce the256MiB bound on the
   experiment-owned retained/staged store, and explicitly treat SDK capture-cache
   peak as a separate, currently unbounded-by-application producer exposure. Reserve
   conservative headroom, measure producer bytes/peak and retain an oversize failure;
   do not claim a hard total256MiB guarantee. This amends the proposed budget and
   requires an explicit design decision, not an implementer waiver.
2. If a hard256MiB total including the producer is required, prove a producer-side
   upper bound and reserve it, or return with a separately reviewed bounded capture
   adapter/provider proposal. Current post-capture checks do not establish that proof.

No dependency/provider replacement is approved here. Apply the same distinction to
the4MP and12MiB admission limits: they constrain accepted processing/evidence, not
all camera SDK allocations. The draft already acknowledges this for memory; this
review extends the qualification explicitly to temporary disk output.

No recognition score, crop tolerance, storage cap or experimental denominator is
silently relaxed by this review. CP-D1 remains a pre-implementation decision item.

## Outcome and next action

The smallest proposed proof remains installed rear still capture -> bounded native
admission -> observed EXIF/ROI -> reviewed tensor/vector -> local human crop review
and numerical receipt, using generated targets before private product enrollment.
Geometry, no-network module/provider closure, lifecycle drain and durable evidence
must each pass their own actual checks. A one-shot success cannot accept live scan
speed, recognition quality or later multi-frame timing.

Current work can stop at this completed document review. G0 still needs approval
of the concrete camera/URI/permission boundary and CP-D1 policy; G1 still needs the
founder-deferred P1 physical offline/result review. Keep the phone hotspot connected
until independent laptop internet is available. Once prerequisites are satisfied,
issue a narrow source-only dispatch to the same agent, require its direct stopped
handoff, audit, and only then consider a separately approved exact build/device run.
No P2-04/05, OCR/cue/holdout work or native implementation is dispatched here.
