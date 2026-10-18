# Founder clarification — reuse and combined enrollment

Recorded 2026-10-16, Africa/Lagos, from the founder's side question in main chat.
This is planning input, not a change to the running P2-03 experiment or approval
to add a dependency, change camera provider, import code or collect private data.

## Combined enrollment intent

The intended product experience is one guided product enrollment session. As the
retailer pans around the product, collect useful visual views AND detect its
barcode when visible. Give an explicit “Barcode acquired” indication, retain that
evidence and continue collecting the remaining views. Avoid normally requiring a
second dedicated barcode-scanning session after visual enrollment.

This clarifies a flow not explicitly specified in the current P2 visual plan.
It is consistent with the broader scanning architecture's barcode-first path,
but does not prove simultaneous frame processing or camera-provider compatibility.
Saving a continuous video is not required by this intent; selected frames may
serve the same purpose, subject to measured quality, latency and storage.

Next enrollment planning must specify: progressive feedback, no-barcode fallback,
duplicate/background-product code handling, confirmation that the code belongs
to the intended product/package, local identity association, interruption/restart,
and scheduling between visual and barcode work. A code is not automatic platform
truth. Products without barcodes remain supported. Recognition failure must not
block the core retail workflow.

P2-03's isolated one-shot camera proof deliberately disables barcode processing.
Finish its current source/build/physical gates independently. Do not attach this
new combined workflow to its correction packet or claim it is already implemented.

## Reuse-first proposal

Founder asks whether existing public code, tools and product flows could reduce
implementation time/tokens and improve recognition, price collection and UI/UX.
Coordinator recommends a bounded reuse check before substantial new capability:
define the exact gap; shortlist at most three candidates; inspect license, fit,
Android/offline/privacy compatibility, maintenance and tests; trial one minimal
integration; compare against the current baseline; adopt only on demonstrated
value. Suggested initial search budget30–60 minutes is a planning allowance, not
an estimated completion promise or a standing instruction to research every edit.

Current project already uses React Native/Expo Camera/SQLite/Supabase and a
pretrained model. Reuse does not remove the need to verify our offline, identity,
permission, lifecycle and transaction requirements. A supported maintained library
may be easier to maintain than copied source fragments. Popularity/update counts
are discovery signals, not proof of trust, compatibility or better recognition.

## Initial inspected references — candidates only

- [MediaPipe Image Embedder](https://developers.google.com/edge/mediapipe/solutions/vision/image_embedder):
  official documentation describes image representations, similarity, regions and
  image/video/live modes. Not benchmarked against our app; model/recipe, dependency,
  telemetry/privacy and offline behavior need explicit examination before use.
- [Google ML Kit samples](https://github.com/googlesamples/mlkit): official sample
  code for Android/iOS vision integration; not a vetted replacement for our camera
  path or a proof of exact-product matching.
- [Open Food Facts mobile app](https://github.com/openfoodfacts/smooth-app): a
  Flutter/Dart product app, useful for flow/reference research; code is not a direct
  React Native component and no migration is proposed.
- [Open Prices](https://github.com/openfoodfacts/open-prices): repository describes
  collecting/sharing product-price observations and an API. Nigerian coverage,
  freshness, restock/wholesale applicability and data/code reuse terms have NOT
  been established. Existing software does not itself supply missing market data.
- [GitHub licensing guidance](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository):
  public visibility is distinct from permission to reuse code. Check applicable
  code, model and data licenses before adoption.

Sources inspected during a quick scan,2026-10-16. No clone, dependency change,
installation, integration, provider decision or accuracy claim resulted. Future
comparisons must retain the current baseline, use the same inputs/device/settings
where appropriate, include unfamiliar/lookalike products and report latency,
memory, offline and failure behavior as well as ranking quality.
