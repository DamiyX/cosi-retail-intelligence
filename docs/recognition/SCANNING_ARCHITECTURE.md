# SCANNING_ARCHITECTURE — Retail Commerce Intelligence

**Version:** 1.0  
**Status:** Architecture source of truth for product identification / recognition  
**Primary platform:** Android  
**Client:** React Native + Expo Development Build + TypeScript  
**Operating principle:** Offline-first, store-first, confidence-aware product identity retrieval

---

# 1. Purpose

This document defines the scanner and product-recognition architecture for the MVP.

It covers:

- unified scanner behavior;
- barcode / QR;
- visual recognition;
- OCR support;
- store-first candidate retrieval;
- package-unit identification;
- recognition confidence;
- `UNKNOWN`;
- enrollment;
- local recognition data;
- model/runtime abstraction;
- camera abstraction;
- recognition asset storage;
- model/version migrations;
- shared recognition profiles;
- local learning;
- integration with the core retail application;
- Recognition Laboratory boundaries;
- failure and fallback behavior.

This document does **not** select a final visual model before benchmarking.

The production recognition model must be chosen through evidence from actual retail products and target Android devices.

---

# 2. Core Definition

The scanner is **not**:

> an AI that recognizes any product in the world.

The scanner is:

> **an offline-first local product-identity retrieval subsystem that combines available evidence to identify products relevant to the retailer and can improve through synchronized recognition knowledge over time.**

The normal scan of a locally known product must not require internet.

---

# 3. Product Safety Principle

A wrong confident product match is more dangerous than requiring one additional tap.

A false match can corrupt:

- selling price;
- sales history;
- inventory;
- cost/margin;
- price intelligence;
- analytics.

Therefore:

🟢 The recognition system must be allowed to return:

> **UNKNOWN**

and:

> **AMBIGUOUS**

Recognition confidence must control UX behavior.

---

# 4. Unified Scanner

The product should expose one scanner experience.

Internally, multiple evidence paths may participate.

```text
CAMERA
   ↓
Frame quality / stability
   ↓
Single-product framing
   ↓
┌─────────────────────────────────────┐
│ Barcode / QR                        │
│ Visual representation / embeddings │
│ OCR clues                           │
│ Store/catalog context               │
│ Package-unit clues                  │
└─────────────────────────────────────┘
   ↓
Candidate generation
   ↓
Candidate ranking
   ↓
Confidence / evidence evaluation
   ↓
┌────────────┬─────────────┬─────────────┐
│ STRONG     │ AMBIGUOUS   │ UNKNOWN     │
│ candidate  │ top options │ no safe ID  │
└────────────┴─────────────┴─────────────┘
```

The UI should not expose these internal mechanisms unless helpful.

The retailer experiences:

> Scan → result / choose / unknown fallback.

---

# 5. Recognition Search Priority

Recognition should search the smallest, most relevant space first.

## Tier 0 — Barcode / QR mappings

Exact identifier lookup.

## Tier 1 — Active products carried by the current store

Primary visual-recognition search space.

## Tier 2 — Small locally cached discovery / popular-product set

Used when the product may not yet be actively carried but is likely relevant locally.

## Tier 3 — Wider platform/global catalogue

Used when online and justified.

The global catalogue should not participate unnecessarily in every offline scan.

---

# 6. Why Store-First Search

If a retailer carries 700 products, searching those 700 is usually:

- faster;
- more relevant;
- easier to keep offline;
- less likely to return unrelated products;
- easier to tune for confidence.

The scanner should answer:

> “Which product in this store is this?”

before:

> “Which product in a huge global catalogue is this?”

---

# 7. Product Identity Boundary

Recognition must preserve the separation between:

## Shared / platform product identity

Examples:

- canonical product;
- product variant;
- brand;
- category;
- barcode;
- visual packaging identity;
- package presentation;
- region;
- packaging generation;
- approved recognition profile.

## Store-specific commercial data

Examples:

- local SKU;
- selling price;
- cost;
- stock;
- preferred supplier;
- reorder threshold.

## Device recognition cache

Examples:

- product IDs;
- package-unit IDs;
- barcode mappings;
- recognition references;
- embeddings;
- OCR clues;
- thumbnails;
- model/catalog versions.

A shared recognition update must **never** overwrite retailer-specific:

- stock;
- selling price;
- purchase cost;
- supplier;
- reorder settings.

---

# 8. Product Variant vs Package Unit

Recognition must support two related but distinct questions:

1. **What product variant is this?**
2. **Which package/unit presentation is this?**

Example:

```text
productVariantId = Indomie Chicken 70g
packageUnitId = carton
```

versus:

```text
productVariantId = Indomie Chicken 70g
packageUnitId = sachet
```

Package-unit identity matters because:

- inventory quantity conversion;
- selling price;
- restocking;
- barcode mapping;
- transaction quantity

may depend on the package.

---

# 9. Package-Unit Confidence

The system may identify product variant confidently while package unit remains uncertain.

Example:

```text
productConfidence = high
packageUnitConfidence = low
```

Correct behavior:

> show identified product + ask user to confirm package.

Do not reject a useful product match merely because package-unit recognition is uncertain.

Do not invent a package-unit guess when evidence is weak.

---

# 10. Recognition Result Contract

Conceptual TypeScript contract:

```ts
export type RecognitionState =
  | "STRONG"
  | "AMBIGUOUS"
  | "UNKNOWN";

export type RecognitionMethod =
  | "BARCODE"
  | "VISUAL"
  | "OCR"
  | "HYBRID"
  | "MANUAL";

export interface RecognitionCandidate {
  storeProductId?: string;
  productVariantId?: string;
  packageUnitId?: string;
  score: number;
  methodEvidence: RecognitionMethod[];
}

export interface RecognitionResult {
  state: RecognitionState;
  primary?: RecognitionCandidate;
  alternatives: RecognitionCandidate[];
  packageUnitNeedsConfirmation: boolean;
  latencyMs?: number;
  modelInfo?: {
    modelId: string;
    modelVersion: string;
    preprocessingVersion: string;
  };
}
```

The exact TypeScript shape may evolve.

The semantics must remain stable.

---

# 11. Recognition Service Contract

The main retail application should depend on a stable interface.

Conceptually:

```ts
interface RecognitionService {
  recognize(input: RecognitionInput): Promise<RecognitionResult>;
  enroll(input: EnrollmentInput): Promise<EnrollmentResult>;
}
```

The main application should not care whether the internal implementation uses:

- TFLite;
- ONNX;
- another native runtime;
- one model;
- several models;
- OCR;
- local-feature verification.

---

# 12. Camera Abstraction

The recognition system should not depend directly on one camera library.

Conceptual port:

```ts
interface CameraProvider {
  startPreview(): Promise<void>;
  captureFrame(options?: CaptureOptions): Promise<CapturedFrame>;
  stopPreview(): Promise<void>;
}
```

Initial Recognition Laboratory candidate:

> Expo Camera.

For later high-performance continuous scanning:

> benchmark React Native VisionCamera or another suitable provider.

The recognition core receives normalized image/frame input, not camera-library-specific objects.

---

# 13. Expo Runtime Decision

Use:

> **React Native + Expo Development Build + TypeScript**

Do not assume Expo Go is sufficient for the production recognition workflow.

Reasons:

- native ML runtimes;
- potential native camera modules;
- model assets;
- performance profiling;
- custom native integrations.

Normal UI development should still retain fast iteration.

A native rebuild should be required mainly when native dependencies/configuration change.

---

# 14. Barcode / QR Path

Barcode/QR should be the highest-confidence low-cost path when available.

Flow:

```text
frame
 ↓
barcode/QR detection
 ↓
local identifier lookup
 ↓
known?
 ├─ yes → candidate
 └─ no
      ↓
 wider local/shared lookup if available
      ↓
 associate/create/fallback
```

A locally known barcode must remain usable offline.

---

# 15. Barcode Mapping

A barcode mapping may resolve to:

- product variant;
- package unit;
- store product.

Example:

```text
EAN → productVariantId
    → packageUnitId
```

Store-specific aliases/mappings may also exist where appropriate.

Do not assume one barcode always maps only to a base unit.

---

# 16. Unknown Barcode

If a barcode is detected but not recognized:

1. search locally cached shared catalog if available;
2. when online, optionally search wider catalog;
3. allow retailer to associate with existing product;
4. allow quick product creation;
5. sale must continue.

Unknown barcode is not a fatal error.

---

# 17. Visual Recognition Strategy

Do not build the initial system as a closed classifier that requires model retraining whenever a product is added.

Initial method:

```text
image
 ↓
preprocessing
 ↓
pretrained/mobile visual encoder
 ↓
embedding
 ↓
compare with stored recognition references
 ↓
rank nearest products
```

Adding a new store product means:

> add recognition references / embeddings

not:

> retrain the neural network.

---

# 18. Why Embedding Retrieval

Benefits:

- store can add new products dynamically;
- model retraining is not needed for every new SKU;
- recognition can be store-local;
- offline operation is practical;
- shared recognition profiles can synchronize as data;
- model can later improve independently.

This does not guarantee sufficient SKU-level accuracy.

Benchmarking is mandatory.

---

# 19. Final Model Is Not Locked

Do not hard-code:

> MobileNet

or:

> MobileCLIP

or another model as the production answer before testing.

Use candidate models as baselines.

Selection criteria include:

- top-1 SKU accuracy;
- top-3 recovery;
- open-set behavior;
- model size;
- inference latency;
- memory;
- thermal/battery behavior;
- license;
- Android runtime support;
- similar-SKU discrimination.

---

# 20. Model Selection Path

```text
candidate pretrained encoders
        ↓
desktop/offline benchmark
        ↓
filter by commercial license + accuracy
        ↓
target Android benchmark
        ↓
failure analysis
        ↓
choose MVP encoder/runtime
        ↓
collect real failures
        ↓
fine-tune / metric learning only if justified
        ↓
quantize/compress if justified
```

The first production-worthy model should be the simplest model that satisfies measured acceptance criteria.

---

# 21. Inference Runtime Abstraction

Potential paths to benchmark include:

- LiteRT / TensorFlow Lite-compatible inference;
- `react-native-fast-tflite`;
- ONNX Runtime React Native;
- small custom Expo native module around an appropriate runtime.

Do not spread runtime-specific calls throughout the app.

Use an adapter:

```ts
interface EmbeddingRuntime {
  load(model: ModelDescriptor): Promise<void>;
  embed(input: PreprocessedImage): Promise<Float32Array>;
  dispose(): Promise<void>;
}
```

---

# 22. Runtime Selection Criteria

Evaluate:

- Expo Development Build compatibility;
- Android minimum SDK requirements;
- native binary size;
- inference speed;
- memory footprint;
- hardware acceleration;
- model format support;
- quantization support;
- build stability;
- maintenance;
- commercial license.

A technically impressive runtime is not useful if it excludes too many target Android devices.

---

# 23. Licensing Rule

Before production adoption of any model/runtime:

- verify software license;
- verify model/code license;
- verify model-weight license;
- verify commercial-use rights;
- record source/version/license in project documentation.

Do not assume:

> “open source code” = “commercially usable model weights.”

---

# 24. Visual Preprocessing

All embeddings must use deterministic versioned preprocessing.

Potential operations:

- orientation normalization;
- crop;
- resize;
- color conversion;
- normalization;
- optional perspective/background handling.

Every embedding stores:

- `embeddingModelId`
- `embeddingModelVersion`
- `preprocessingVersion`

Changing preprocessing may invalidate previous embeddings.

---

# 25. Frame Quality

Before expensive inference, optionally assess basic frame quality.

Possible checks:

- blur;
- underexposure;
- extreme glare;
- product too small in frame;
- excessive motion;
- unusable crop.

UX:

> “Move closer”
> “Hold steady”
> “Too dark”

Do not overbuild this before testing whether it materially improves recognition.

---

# 26. Single-Product Framing

MVP visual recognition should optimize for:

> one primary product being intentionally scanned.

Do not initially promise:

> detect and identify every product visible on an entire shelf.

Shelf-scale multi-object recognition is future R&D.

---

# 27. Local Candidate Retrieval

Initial search target:

> active store products.

For each product, the system may have:

- several reference embeddings;
- a centroid/representative embedding later;
- package-specific references where necessary.

Initial similarity search can use exact cosine similarity.

Do not add ANN/vector infrastructure until measurements require it.

---

# 28. Similarity Search

Conceptual:

```text
queryEmbedding
      ↓
for each relevant reference:
    cosineSimilarity(query, reference)
      ↓
aggregate per candidate
      ↓
rank candidates
```

Candidate aggregation strategy is experimental.

Possible strategies:

- maximum similarity;
- average of top-N references;
- centroid first then detailed references;
- package-specific comparison.

Benchmark before locking.

---

# 29. Vector Storage

Recognition embeddings belong in durable local storage.

Logical entity:

> `RecognitionEmbedding`

Each embedding should reference:

- recognition profile/reference;
- model/version;
- preprocessing version;
- vector;
- dimension.

Physical storage may be:

- SQLite BLOB;
- compatible vector extension;
- another measured efficient representation.

Do not prematurely introduce a dedicated vector database.

---

# 30. sqlite-vec / ANN

If local catalog scale or latency requires optimization, benchmark:

- sqlite-vec or another appropriate SQLite extension;
- approximate nearest-neighbor indexing;
- centroid filtering;
- two-stage ranking.

These are optimizations, not MVP assumptions.

---

# 31. OCR Role

OCR is supporting evidence.

Use OCR primarily for:

- brand/product text clues;
- size clues;
- flavor/variant clues;
- package-unit clues;
- disambiguating visually similar candidates.

Do not make OCR the sole recognition method for products where text is unreliable or absent.

---

# 32. OCR Architecture

OCR provider should also be abstracted.

```ts
interface OcrProvider {
  extract(input: PreprocessedImage): Promise<OcrResult>;
}
```

OCR may run:

- only after visual candidate generation;
- only for ambiguous cases;
- or in parallel if performance supports it.

Benchmark.

---

# 33. Offline OCR Requirement

If OCR participates in normal offline sale identification:

> required OCR capability must be bundled/locally guaranteed.

Do not depend on a first-use external model download that may fail in a no-network shop.

---

# 34. Additional Local Feature Verification

Benchmark whether traditional local image-feature matching improves top-candidate verification for distinctive packaged products.

Potential pipeline:

```text
embedding retrieval
      ↓
top candidates
      ↓
optional local feature verification
      ↓
OCR / metadata verification
      ↓
final ranking
```

This is experimental.

Do not make it mandatory unless metrics justify the complexity.

---

# 35. Candidate Ranking

Candidate ranking may combine:

- visual similarity;
- barcode identity;
- OCR clues;
- package clues;
- store activity/context;
- recent usage;
- local product availability;
- additional verification.

The ranking formula must be measurable and versioned if it becomes non-trivial.

Do not hide a complex heuristic inside UI code.

---

# 36. Confidence

Confidence should not simply expose raw cosine similarity as though it were probability.

Recognition confidence must be calibrated from evaluation data.

Conceptually:

```text
candidate scores
      +
margin from second candidate
      +
evidence consistency
      +
known/unknown calibration
      ↓
decision policy
```

Output:

- STRONG
- AMBIGUOUS
- UNKNOWN

---

# 37. Strong Result

When confidence is strong:

- show candidate prominently;
- user can confirm quickly;
- avoid unnecessary modal friction.

Depending on beta evidence, an extremely reliable barcode path may permit direct selection.

Visual recognition should still favor confirmation until false-accept risk is sufficiently understood.

---

# 38. Ambiguous Result

When several candidates are plausible:

> show a small candidate list.

Default concept:

> top 3.

The exact number can be tested.

Candidate cards should make useful differences visible:

- name;
- image;
- size;
- package unit.

---

# 39. Unknown Result

When no safe candidate exists:

Offer:

- text search;
- recent/frequent products;
- scan again;
- quick product creation;
- enrollment.

Unknown should be treated as normal, not as system failure.

---

# 40. Open-Set Recognition

The system must distinguish:

> product similar to known products

from:

> genuinely unknown product.

This is critical.

A retrieval system that always returns its nearest known product without unknown rejection is unsafe for this application.

---

# 41. Recognition Enrollment

Enrollment creates local recognition knowledge.

Flow:

```text
select/create StoreProduct
       ↓
choose package unit if relevant
       ↓
capture useful view
       ↓
quality/preprocessing
       ↓
generate reference embedding
       ↓
assess useful visual diversity
       ↓
enough?
 ├─ yes → finish
 └─ no  → request another useful view
```

---

# 42. Adaptive Enrollment

Do not hard-code:

> every product needs exactly 4 or 5 images.

Different products require different visual coverage.

Examples:

- flat sachet may need few;
- shoe may need several angles;
- bag/padlock/broom may need different viewpoints;
- carton and individual sachet may need separate package references.

Enrollment UX is determined by experiment.

---

# 43. Enrollment Reference Limits

Maintain a bounded representative reference set.

Do not continuously save every camera frame.

Possible policy:

- minimum useful references;
- bounded maximum;
- diversity scoring;
- replace redundant reference with better one.

The exact policy is determined through testing.

---

# 44. Local Learning From Confirmation

When user confirms a recognition result:

Do not automatically add the raw frame.

Flow:

```text
confirmed result
      ↓
quality check
      ↓
does it add useful visual diversity?
      ↓
yes → candidate recognition reference
      ↓
bounded representative set
```

This prevents low-quality or repetitive references from degrading the profile.

---

# 45. Corrections as Hard Negatives

If user corrects:

> predicted A → actually B

the event is valuable.

Record sufficient non-sensitive evaluation metadata so future R&D can identify:

- confusing product pairs;
- same-brand size confusion;
- flavor confusion;
- package-unit confusion.

Where consent and privacy allow, suitable examples may enter controlled hard-negative datasets.

---

# 46. Recognition Media Storage

Do not retain several full-resolution phone-camera originals for every product on every device.

Processing:

```text
camera image
   ↓
crop / resize / normalize
   ├── embedding
   ├── OCR/features
   └── compressed reference / thumbnail
```

Retain only what is justified.

---

# 47. Why Some Source Images Must Be Retained

Do not delete all reference imagery after embedding generation.

If model/preprocessing changes:

> old embeddings may need regeneration.

Therefore keep enough approved source/reference assets to rebuild recognition profiles.

Storage policy should balance:

- recoverability;
- device storage;
- privacy;
- synchronization cost.

---

# 48. Recognition Asset Types

Possible assets:

- reference image;
- thumbnail;
- cropped reference;
- embedding;
- OCR metadata.

Use `MediaAsset` metadata defined in `DOMAIN_DATA_MODEL.md`.

Large binaries should be filesystem/object-storage assets, not inline database blobs unless benchmarked.

---

# 49. Model Version Migration

When a new recognition model is introduced:

```text
new model/version
     ↓
old references remain
     ↓
regenerate embeddings where source assets exist
     ↓
store new-version embeddings
     ↓
validate migration
     ↓
activate new model
     ↓
retire old embeddings later
```

Do not overwrite old embeddings before successful migration.

---

# 50. Recognition Catalog Version

A device recognition cache should know:

- shared catalog version;
- recognition-profile version;
- model/version;
- preprocessing version.

This allows safe incremental updates and debugging.

---

# 51. Shared Recognition Profiles

Platform-approved profiles can reduce repeated retailer enrollment.

Flow:

```text
manufacturer / platform / retailer source
              ↓
         proposed profile
              ↓
quality + identity + duplicate checks
              ↓
canonical product identity
              ↓
regional / packaging visual version
              ↓
approved recognition profile
              ↓
versioned distribution
              ↓
device cache
```

Retailer contribution is input, not automatic truth.

---

# 52. Recognition Profile Provenance

Shared recognition assets must track:

- source;
- permission/license;
- country/market;
- packaging generation;
- capture date where relevant;
- trust tier;
- approval status.

Do not casually scrape product images from commercial websites and redistribute them as platform recognition data.

---

# 53. Packaging Generation

A product can change visual packaging while remaining the same commercial variant.

Recognition architecture should be able to represent:

> product variant + packaging generation/version.

Old and new packaging may coexist in the market.

Do not immediately delete old recognition profiles when new packaging is introduced.

---

# 54. Store-Local Profile

A store may recognize a product that has no approved platform identity.

Use:

> `STORE_LOCAL` recognition scope.

This supports:

- unbranded goods;
- local goods;
- store-specific products;
- incomplete canonicalization.

Store-local product recognition should work without waiting for platform approval.

---

# 55. Platform-Approved Profile

A validated shared profile has:

> `PLATFORM_APPROVED` scope.

It may synchronize to relevant devices.

Shared profile update must not modify store commercial values.

---

# 56. True Unbranded / Generic Goods

Not all "unbranded" items are equally recognizable.

## Visually distinctive store product

Examples:

- particular shoe;
- bag;
- broom;
- padlock.

Potentially suitable for local instance retrieval.

## Generic goods with one relevant local SKU

Recognition may work because store context reduces ambiguity.

## Visually indistinguishable commercial records

If two SKUs look physically identical, visual recognition cannot infer invisible metadata.

Use:

- manual selection;
- internal QR/label;
- shelf/context workflow;
- another identifier.

Do not claim impossible visual certainty.

---

# 57. Natural Products

Examples:

- yam;
- plantain;
- loose produce.

Scanner may identify:

- category/type.

But transaction may still require:

- quantity;
- weight;
- grade;
- retailer-defined SKU.

Natural-product recognition is not part of the initial FMCG visual-recognition commitment.

---

# 58. Recognition Cache

Device cache should include only relevant knowledge.

Potential fields/assets:

- active StoreProduct IDs;
- ProductVariant IDs;
- PackageUnit IDs;
- barcode mappings;
- selected shared profiles;
- embeddings;
- OCR clues;
- thumbnails;
- model/catalog versions.

Do not download the entire future global catalog to every phone.

---

# 59. Recognition Cache Population

Populate through:

1. products created/enrolled by store;
2. products added from shared catalog;
3. relevant popular/local discovery profiles;
4. synchronized staff/store recognition profiles.

The cache should support incremental update.

---

# 60. Same-Store Synchronization

If Store Owner enrolls a product on Device A:

- profile/reference may sync to backend;
- Device B should eventually receive the recognition knowledge;
- Device B should not require independent enrollment.

This must respect:

- permissions;
- asset sync;
- model/preprocessing compatibility.

---

# 61. Embedding Compatibility Across Devices

Two devices can share embeddings only if:

- same embedding model identity/version;
- same preprocessing version;
- compatible vector representation.

If not:

- share retained reference image/profile;
- regenerate local embedding using device's active model.

The final strategy depends on the chosen runtime/model.

---

# 62. Recognition Asset Sync Priority

Recognition asset sync must not block:

- sale sync;
- purchase sync;
- expense sync.

Priority:

1. business transactions;
2. critical store configuration;
3. recognition metadata/assets;
4. optional larger assets.

Recognition may degrade gracefully until missing assets arrive.

---

# 63. Inference Offline Requirement

All assets required for the primary local recognition path must already exist on device:

- active model;
- required runtime;
- required barcode detector;
- required OCR capability if mandatory;
- relevant store embeddings/profile data.

Do not require first-use cloud downloads during checkout.

---

# 64. Recognition Latency

Target should be:

> fast enough that scanning feels competitive with manual search.

Exact acceptance thresholds belong in `RECOGNITION_TEST_PLAN.md`.

Measure:

- camera-open latency;
- capture-to-result;
- repeated scan throughput;
- time to stable candidate.

Do not optimize from intuition alone.

---

# 65. Device Target

Benchmark on:

- development flagship/midrange phone;
- realistic lower-spec Android device representative of target retailers.

A model that works only on high-end devices is not acceptable for the MVP market.

---

# 66. Battery / Thermal

Continuous camera + ML may cause:

- battery drain;
- thermal throttling;
- frame-rate reduction.

Measure sustained scanning behavior.

Do not benchmark only one isolated inference call.

---

# 67. Recognition Laboratory

Create:

```text
apps/recognition-lab/
```

within the same repository.

It is a real reusable engineering workbench, not a disposable demo.

Responsibilities:

- dataset evaluation;
- model comparison;
- runtime comparison;
- camera experiments;
- enrollment experiments;
- similarity search;
- OCR experiments;
- confidence calibration;
- device profiling.

---

# 68. Shared Recognition Code

Reusable code should live in:

```text
packages/recognition-core/
```

Potential content:

- recognition contracts;
- candidate types;
- ranking;
- similarity functions;
- confidence decision interfaces;
- enrollment domain logic;
- model/version metadata types.

Native/runtime implementations stay in platform-specific infrastructure.

---

# 69. Recognition Native Layer

If required, create an isolated native adapter layer.

Conceptually:

```text
packages/recognition-native/
```

or appropriate Expo module location.

Responsibilities:

- model runtime;
- accelerated inference;
- native image processing;
- platform integration.

Do not put product/business logic in the native adapter.

---

# 70. Main App Scanner Feature

In the main mobile app:

```text
src/features/scanning/
```

Responsibilities:

- camera UI;
- scan flow;
- candidate confirmation;
- unknown fallback;
- package confirmation;
- connection to sale/product flows.

It consumes `RecognitionService`.

It does not own model internals.

---

# 71. Recognition Modes

MVP may support:

## Quick identify

Identify product during sale/search.

## Enroll

Capture references for a StoreProduct.

## Associate barcode

Link detected barcode to known product/package.

## Recognition test/debug

Available only in Recognition Laboratory or development diagnostics.

Do not expose engineering diagnostics to normal users.

---

# 72. Sale Integration

Scanner result enters sale flow as a candidate, not as the sale itself.

```text
scan
 ↓
RecognitionResult
 ↓
resolve StoreProduct + PackageUnit
 ↓
user confirmation when required
 ↓
Sale workflow
```

All inventory and financial rules remain owned by the sale domain.

Recognition does not directly decrement inventory.

---

# 73. Product-Creation Integration

UNKNOWN can lead to:

```text
photo/reference
    ↓
quick temporary product
    ↓
selling price
    ↓
sale
    ↓
enrich/enroll later
```

The scanner supports progressive catalog creation.

It must not force full product metadata before checkout.

---

# 74. Restock Integration

During restocking, scanner may help identify:

- product;
- purchase package.

But restock still requires explicit confirmation of:

- quantity;
- package;
- purchase cost.

Recognition must not infer financial purchase data from appearance.

---

# 75. Package-Unit Identification Sources

Package unit may be determined by:

- package-specific barcode;
- visual references;
- OCR/size clues;
- user selection;
- stored preferred context.

Package-unit inference should be independently scored where possible.

---

# 76. Recognition Attempt Telemetry

For beta/R&D, record lightweight metrics:

- recognition method;
- result state;
- selected product;
- selected package if applicable;
- confidence;
- user correction;
- latency;
- model/version;
- device class.

Avoid storing unnecessary raw frames.

Telemetry must respect privacy/security rules.

---

# 77. Recognition Data Quality

Recognition profiles should not accept all contributions blindly.

Quality checks may include:

- image blur;
- resolution;
- duplicate/redundant view;
- identity mismatch;
- package mismatch;
- wrong barcode mapping;
- ambiguous canonical product.

Platform-shared profiles require stronger validation than store-local profiles.

---

# 78. Store-Local Contribution to Platform

Potential future flow:

```text
store local profile
      ↓
user/platform contribution consent
      ↓
candidate shared profile
      ↓
validation
      ↓
approved platform profile
```

Do not silently upload private store imagery for public reuse without appropriate policy/consent.

---

# 79. Shared Catalog Security

Shared recognition/profile delivery should be:

- versioned;
- integrity-checked;
- authorized where required.

For future signed catalog bundles, architecture may use:

- manifest;
- checksum/signature;
- catalog version.

Do not implement signing complexity before the catalog distribution mechanism exists, but preserve the concept.

---

# 80. Failure Handling

Recognition failures should translate into product UX states.

Examples:

## Camera unavailable

> Allow manual product search.

## Model unavailable

> Barcode/manual flows remain available.

## Embedding cache corrupted

> Rebuild/resync recognition cache without deleting business transactions.

## OCR unavailable

> Continue visual/barcode path.

## Internet unavailable

> Local recognition continues.

Recognition failure must remain isolated from sales/inventory database integrity.

---

# 81. Recognition Cache Recovery

Recognition data is rebuildable/replaceable where possible.

Business transaction data is not.

Therefore:

> never couple recovery of recognition cache to destructive reset of the retail database.

If recognition cache fails:

- clear/rebuild recognition-specific cache;
- retain products, stock, sales, purchases.

---

# 82. Recognition Data Persistence Classes

## Critical business data

- StoreProduct;
- ProductVariant linkage;
- PackageUnit linkage;
- barcode associations used operationally.

Treat carefully.

## Rebuildable recognition data

- embeddings;
- indexes;
- derived OCR clues;
- centroids.

Can be regenerated if source references exist.

## Media/source assets

May be required for migration/rebuild.

Retention policy required.

---

# 83. Recognition Model Distribution

Initial MVP may bundle model in application binary.

Advantages:

- guaranteed offline availability;
- predictable first-use.

Disadvantages:

- larger binary;
- model change may require app/native update depending on runtime/asset strategy.

Later architecture may support versioned downloadable models if:

- model integrity;
- compatibility;
- storage;
- rollback;
- offline guarantees

are solved.

Do not require remote model download for initial beta.

---

# 84. Model Rollback

If remotely distributed models are introduced later:

- keep active model version;
- verify downloaded model;
- activate only after validation;
- preserve previous working model until successful switch;
- allow rollback.

This is future architecture, not required in the first build.

---

# 85. Recognition Benchmark Dataset

Architecture expects a separate evaluation dataset.

Do not use enrollment/reference images as query/evaluation images.

Dataset requirements belong in `RECOGNITION_TEST_PLAN.md`.

---

# 86. Initial Product Count

Recognition R&D should begin deliberately small.

First:

> ~30–50 representative/difficult products.

Then:

> ~100–300 products.

Do not begin by trying to prove recognition across thousands of SKUs.

---

# 87. Difficult Cases

The benchmark must include:

- same brand, different sizes;
- same brand, different flavors;
- nearly identical packaging;
- packaging redesigns;
- glare;
- low light;
- angle variation;
- partial occlusion;
- damaged packaging;
- unknown products;
- multiple Android phones;
- package-unit variations.

---

# 88. Recognition Metrics

At minimum:

- top-1 SKU accuracy;
- top-3 recovery;
- false-accept rate;
- open-set false-accept rate;
- unknown precision/recall;
- scan-to-stable-result latency;
- package-unit accuracy;
- correction rate;
- enrollment friction;
- storage per product;
- model size;
- memory;
- battery/thermal;
- lower-end Android performance.

Thresholds belong in `RECOGNITION_TEST_PLAN.md`.

---

# 89. Go / No-Go Principle

Visual recognition does not become mandatory in the MVP checkout experience merely because a prototype works.

It must demonstrate:

- adequate accuracy;
- safe unknown handling;
- acceptable speed;
- manageable storage;
- acceptable lower-end performance;
- useful user-value improvement.

Otherwise:

> barcode + search + progressive creation remain primary.

---

# 90. Parallel Development Boundary

Track A:

> Main Retail Application.

Track B:

> Recognition R&D.

They converge only through:

- domain IDs;
- StoreProduct/ProductVariant/PackageUnit contracts;
- RecognitionService contract;
- approved shared packages.

Track B must not repeatedly restructure Track A.

---

# 91. Recognition Track Sequence

Recommended:

1. Define Recognition contracts.
2. Build evaluation dataset.
3. Benchmark visual encoders outside live checkout.
4. Filter by licensing/accuracy.
5. Benchmark viable candidates on Android.
6. Implement embedding generation adapter.
7. Implement local exact similarity retrieval.
8. Implement STRONG / AMBIGUOUS / UNKNOWN decision path.
9. Implement adaptive enrollment.
10. Implement barcode path through unified scanner contract.
11. Add OCR reranking only where evidence justifies it.
12. Build live scanner UX.
13. Benchmark camera provider.
14. Add same-store recognition synchronization.
15. Add curated shared profiles.
16. Fine-tune/metric-learn only when failure data justifies it.

---

# 92. What the active AI coding agent Must Not Do

the active AI coding agent must not:

- build a universal product classifier first;
- choose a visual model solely because it is popular;
- use one enormous global catalog for every scan;
- force internet for locally known products;
- assume nearest neighbor is always correct;
- remove `UNKNOWN`;
- automatically save every confirmed camera frame;
- treat retailer contributions as platform truth;
- bind the recognition core directly to one camera library;
- bind the retail app directly to a model runtime;
- delete all source/reference images after creating embeddings;
- ignore package-unit identity;
- let recognition update retailer stock/price/cost;
- make scanner success a prerequisite for selling;
- create a throwaway scanner project disconnected from production contracts.

---

# 93. Architecture Acceptance Criteria

The recognition architecture is being implemented correctly when:

1. Main app can call one stable RecognitionService.
2. Barcode and visual paths feed one unified result contract.
3. Store-active products are searched before broad catalog.
4. Locally known products can be recognized offline.
5. `UNKNOWN` is a first-class result.
6. Ambiguous results expose a small candidate list.
7. Package unit may be independently confirmed.
8. Model/runtime can change without rewriting sale/inventory code.
9. Camera library can change behind an adapter.
10. Recognition profiles are separate from store commercial data.
11. Embeddings record model/preprocessing versions.
12. Store-local enrollment works without model retraining.
13. Recognition data can be rebuilt without deleting retail transactions.
14. Recognition asset sync cannot block sale/purchase sync.
15. False matches can be measured and corrected.
16. Recognition Lab shares reusable contracts with production code.
17. Visual recognition can be disabled without making core retail MVP unusable.

---

# 94. Decisions Intentionally Deferred

These must be decided by benchmarking:

- final embedding model;
- final model input resolution;
- final inference runtime;
- exact camera provider;
- OCR provider;
- exact similarity aggregation;
- STRONG threshold;
- UNKNOWN threshold;
- top-N candidate count;
- number of enrollment images;
- local-feature verification;
- sqlite-vec / ANN need;
- whether embeddings sync directly or regenerate per device;
- exact model quantization;
- exact shared-profile approval workflow.

the active AI coding/specialist agent may propose implementations only after measured evidence.

---

# 95. Relationship to Other Source-of-Truth Files

Read this document with:

- `PRODUCT_INCEPTION.md`
- `PRD_MVP.md`
- `DOMAIN_DATA_MODEL.md`
- `TECHNICAL_ARCHITECTURE.md`
- `OFFLINE_SYNC.md`
- `RECOGNITION_TEST_PLAN.md`
- `BUILD_PLAN.md`

This file is authoritative for scanner/recognition architecture.

`RECOGNITION_TEST_PLAN.md` is authoritative for evaluation methodology and acceptance thresholds.

If a benchmark demonstrates that a technical recommendation in this file is inferior:

1. document evidence;
2. propose change;
3. update `DECISION_LOG.md`;
4. update this document;
5. implement.

Do not silently diverge.
