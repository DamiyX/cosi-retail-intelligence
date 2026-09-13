# RECOGNITION_TEST_PLAN — Retail Commerce Intelligence

**Version:** 1.0  
**Status:** Validation source of truth for scanner / visual recognition  
**Applies to:** Recognition Laboratory and production scanner integration  
**Primary principle:** A recognition feature is not accepted because it “looks like it works.” It is accepted only when measured against representative retail conditions.

---

# 1. Purpose

This document defines how the recognition subsystem must be evaluated before it is trusted in the retail application.

It covers:

- evaluation dataset construction;
- reference/enrollment dataset separation;
- difficult product selection;
- barcode testing;
- visual-recognition testing;
- unknown/open-set testing;
- package-unit recognition;
- device performance;
- storage;
- enrollment friction;
- correction rate;
- false-match analysis;
- go/no-go criteria;
- integration acceptance.

The goal is to determine whether recognition materially reduces retailer friction without creating dangerous transaction errors.

---

# 2. Core Test Principle

The scanner is considered useful only if it is:

- accurate enough;
- fast enough;
- safe when uncertain;
- usable offline;
- practical on lower-end Android hardware;
- manageable in storage size;
- easy enough to enroll;
- better than the fallback workflow for enough real users.

Visual recognition is not mandatory for the MVP if it fails these tests.

---

# 3. Most Important Risk

The most dangerous recognition error is:

> confidently identifying the wrong SKU.

A false confident match can produce:

- wrong selling price;
- wrong stock deduction;
- wrong purchase history;
- wrong margin;
- wrong restock intelligence;
- wrong analytics.

Therefore false-accept metrics receive higher importance than simply maximizing top-1 accuracy.

---

# 4. Evaluation Phases

Recognition validation should happen in stages.

## Phase R0 — Benchmark setup

Goal:

> prove the test environment and measurement pipeline.

Use:
- 10–20 products;
- known easy and hard cases;
- one development Android device.

Do not treat R0 accuracy as product evidence.

---

## Phase R1 — Initial difficult set

Use approximately:

> **30–50 deliberately representative/difficult products**

Goal:

- compare candidate encoders;
- compare runtimes;
- validate store-first retrieval;
- identify obvious weaknesses;
- test open-set rejection.

---

## Phase R2 — Expanded pilot set

Expand toward:

> **100–300 products**

Goal:

- simulate realistic store catalogue conditions;
- measure similar-SKU confusion;
- measure package-unit handling;
- test storage and latency scaling;
- test multiple devices.

---

## Phase R3 — Real-store pilot

Use products from actual pilot stores.

Goal:

- measure real cashier behavior;
- correction frequency;
- enrollment friction;
- rush-period usefulness;
- practical adoption.

This phase determines whether scanner UX belongs in the production MVP.

---

# 5. Dataset Separation

Never evaluate using the same images used for enrollment/reference creation.

Required separation:

```text
Reference / enrollment images
          ≠
Evaluation / query images
```

Each product should have:

- reference set;
- independent query/test set.

The query set should be captured later or under meaningfully different conditions.

---

# 6. Product Selection

The test set must not contain only easy, visually distinct products.

Include:

- same brand, different sizes;
- same brand, different flavors;
- same brand, similar packaging;
- different brands with similar color/layout;
- carton vs pack vs single unit;
- old vs new packaging generation;
- glossy packaging;
- transparent packaging;
- damaged packaging;
- locally common unbranded goods;
- visually distinctive unbranded items;
- products without barcodes;
- products with barcodes;
- completely unknown products.

---

# 7. Difficult Pair Testing

Create explicit “confusion pairs/groups.”

Examples:

```text
Product A 400g
Product A 800g

Flavor X
Flavor Y

Old package design
New package design

Carton
Pack
Single unit
```

Every benchmark should report where these known confusing groups fail.

Overall accuracy can hide dangerous SKU confusion.

---

# 8. Unknown / Open-Set Dataset

A meaningful portion of test queries must contain products not enrolled in the recognition database.

Suggested starting target:

> at least 15–25% of visual evaluation queries should be unknown to the active recognition set.

Unknowns should include:

- completely unrelated products;
- visually similar but unregistered variants;
- unknown package sizes;
- unknown local/unbranded goods.

The recognition system must not simply choose the nearest known product every time.

---

# 9. Capture Conditions

Evaluation queries should vary:

- lighting;
- phone angle;
- distance;
- rotation;
- camera quality;
- glare;
- shadows;
- partial occlusion;
- background clutter;
- damaged packaging;
- hand holding product;
- shelf/table placement.

Do not evaluate only studio-like photos.

---

# 10. Lighting Conditions

At minimum include:

- bright indoor;
- normal shop lighting;
- dim shop lighting;
- direct glare;
- mixed lighting.

Record failures by condition.

---

# 11. Angle Conditions

Include:

- front;
- slight left/right;
- top/bottom tilt;
- partial side;
- package at natural cashier angle.

Do not require unnatural perfect framing for ordinary recognition.

---

# 12. Occlusion

Include realistic partial obstruction:

- fingers covering packaging;
- price stickers;
- torn packaging;
- folded sachet;
- another object partially in front.

Do not deliberately create impossible examples, but test common shop conditions.

---

# 13. Barcode Test Set

Barcode tests should include:

- known barcode mapped locally;
- known package-specific barcode;
- unknown barcode;
- damaged barcode;
- partially visible barcode;
- glare;
- repeated scans;
- barcode mapped to wrong package in deliberately corrupted test data;
- no internet.

Measure:

- successful detection;
- correct local mapping;
- time to result;
- unknown handling.

---

# 14. Package-Unit Test Set

For products that can exist in several sellable package forms, test:

- individual unit;
- pack;
- carton;
- other configured package levels.

Measure separately:

- product variant accuracy;
- package-unit accuracy.

Example:

A correct product with wrong package is not a fully correct transaction match.

---

# 15. Reference Enrollment Dataset

Enrollment should test different product types:

- simple flat sachet;
- cylindrical bottle;
- box;
- carton;
- reflective package;
- shoe;
- bag;
- padlock;
- broom;
- unbranded/local item.

Measure:

- number of images requested;
- time to completion;
- repeated/poor image rejection;
- user confusion;
- resulting recognition quality.

---

# 16. Device Matrix

Do not benchmark only on the founder's primary phone.

Minimum target matrix:

## Device A — Development / higher performance

Purpose:
- debugging;
- fast iteration;
- baseline.

## Device B — Realistic midrange Android

Purpose:
- likely retailer experience.

## Device C — Lower-spec Android

Purpose:
- identify unacceptable performance/memory/battery constraints.

Exact devices will be selected based on accessible hardware during the pilot.

---

# 17. Device Information to Record

For each benchmark device:

- Android version;
- RAM;
- chipset/CPU;
- GPU/NPU where known;
- storage free space;
- app build version;
- recognition model/version;
- runtime version.

Do not compare performance without recording hardware context.

---

# 18. Model Benchmark Matrix

Each candidate model/runtime combination should record:

- model ID;
- model version;
- input resolution;
- quantization;
- runtime;
- device;
- embedding dimension;
- binary/model size;
- average inference latency;
- memory use;
- accuracy metrics;
- unknown metrics.

This allows an engineering trade-off rather than subjective selection.

---

# 19. Core Accuracy Metrics

Measure:

## Top-1 accuracy

Correct product is first candidate.

## Top-3 recovery

Correct product appears in first three candidates.

## Package-unit accuracy

Correct package/unit is identified where tested.

## Correction rate

How often user must correct the system.

---

# 20. False-Accept Metrics

## False Accept

Unknown/wrong product receives a STRONG incorrect result.

## Open-Set False-Accept Rate

Among unknown queries:

> percentage incorrectly accepted as known/strong.

This is one of the most important safety metrics.

---

# 21. Unknown Metrics

Measure:

- unknown precision;
- unknown recall.

Interpretation:

## Unknown recall

When a product is actually unknown, how often does the system safely say UNKNOWN?

## Unknown precision

When system says UNKNOWN, how often is it truly not safely identifiable?

A system that always says UNKNOWN is safe but useless.

A system that never says UNKNOWN is dangerous.

---

# 22. Ambiguous Result Metrics

Measure:

- percentage of scans classified AMBIGUOUS;
- top-3 recovery within ambiguous cases;
- average time user spends choosing candidate;
- user correction rate.

AMBIGUOUS is acceptable if it meaningfully reduces manual search time.

---

# 23. Ranking Metrics

Where useful, record:

- rank of correct result;
- score of correct result;
- score of top incorrect result;
- margin between first and second candidate.

This data helps calibrate STRONG/AMBIGUOUS/UNKNOWN thresholds.

---

# 24. Confidence Calibration

Do not choose thresholds from intuition.

Use benchmark data.

For each candidate threshold policy, calculate:

- strong-result accuracy;
- false-accept rate;
- percentage STRONG;
- percentage AMBIGUOUS;
- percentage UNKNOWN.

Goal:

> maximize useful automatic recognition without allowing dangerous false confidence.

---

# 25. Initial Safety Preference

During early beta:

> prefer more AMBIGUOUS/UNKNOWN outcomes over false confident matches.

Thresholds may become more permissive only after measured evidence supports it.

---

# 26. Latency Metrics

Measure:

## Camera ready time

Time from opening scanner to usable preview.

## Capture-to-result

Time from usable captured frame to RecognitionResult.

## Scan-to-stable-result

User-perceived total time until actionable result.

## Repeated scan throughput

Performance across multiple consecutive products.

---

# 27. Latency Test Method

Do not report one fastest result.

Record:

- median;
- p90;
- p95 where sample count permits.

Outliers matter in retail workflows.

---

# 28. Initial Latency Targets

These are provisional go/no-go targets, not permanent guarantees.

For locally known products on realistic Android hardware:

### Barcode

Target:
- median actionable result approximately ≤ 0.5–1.0 seconds after readable code is presented.

### Visual recognition

Target:
- median capture-to-actionable result approximately ≤ 1.5 seconds;
- p95 should ideally remain within approximately 3 seconds.

If a workflow regularly exceeds these values, compare against manual search to determine whether it still saves time.

Final thresholds may be updated after real-store measurements.

---

# 29. Storage Metrics

Measure:

- model binary size;
- runtime/native library increase;
- embeddings per product;
- thumbnails/reference images per product;
- OCR metadata;
- total recognition cache size.

Report:

> MB per 100 products

and extrapolate:

- 500 products;
- 1,000 products;
- 5,000 products.

Do not rely only on theoretical vector size; include actual filesystem/database overhead.

---

# 30. Initial Storage Principle

Recognition data for a typical small/medium retailer should remain comfortably below multi-gigabyte scale.

If the architecture approaches hundreds of megabytes for only a few hundred products, investigate optimization before rollout.

Storage targets should be derived from real benchmark measurements.

---

# 31. Memory Metrics

Measure:

- idle scanner memory;
- model loaded memory;
- during inference;
- after repeated scans.

Look for:

- memory leaks;
- growing native buffers;
- app termination on lower-memory devices.

---

# 32. Thermal/Battery Test

Run sustained scanning sessions.

Example:

> 10–15 minutes of repeated product scans.

Record:

- device temperature/thermal throttling where observable;
- latency degradation;
- battery drain;
- dropped frames;
- app instability.

A model that performs well only for one cold inference is insufficient.

---

# 33. Offline Test

With airplane mode enabled:

- open app;
- open scanner;
- scan known barcode;
- scan known visual product;
- identify locally known product;
- enroll local product if architecture supports it;
- complete sale.

The local recognition path must not attempt to require a remote request.

---

# 34. First-Use Offline Test

Fresh install behavior must be tested explicitly.

Determine:

- which models/assets are bundled;
- which features require prior store initialization;
- which OCR/barcode assets exist locally.

Do not accidentally depend on a runtime/model download that occurred earlier during development.

---

# 35. Package Conversion Safety Test

Recognition result:

```text
Product = correct
Package = carton
```

must lead to the correct package conversion during sale/restock.

Test that package recognition cannot silently apply:

> carton conversion to a sachet transaction

or vice versa.

The sale domain must still validate selected package-unit relationship.

---

# 36. Store-First Retrieval Test

Compare:

## Scenario A

Search only active store catalogue.

## Scenario B

Search much wider available catalogue.

Measure:

- accuracy;
- false matches;
- latency.

The test should verify that store-first search genuinely improves relevance.

---

# 37. Local Discovery Tier Test

When product is not yet active in store but exists in local discovery cache:

- does Tier 2 find it?
- does it increase false matches against store products?
- is cache size acceptable?

Only include Tier 2 if it creates measurable value.

---

# 38. OCR Value Test

Benchmark visual retrieval:

1. without OCR;
2. with OCR reranking.

Measure specifically difficult cases:

- same brand different size;
- same design different flavor;
- package text differences.

Keep OCR only if accuracy gain justifies:

- latency;
- binary size;
- complexity;
- offline requirements.

---

# 39. Local Feature Verification Test

If implemented experimentally:

1. embedding retrieval only;
2. embedding + local-feature verification.

Measure:

- top-1 improvement;
- false-accept improvement;
- latency increase;
- storage increase.

Do not ship the extra stage merely because it is technically interesting.

---

# 40. Enrollment Friction Metrics

Measure:

- time to enroll product;
- number of images requested;
- number of rejected images;
- percentage of users who abandon enrollment;
- number of prompts/instructions required.

Enrollment that takes too long may defeat the product's low-friction philosophy.

---

# 41. Enrollment Value Test

For enrolled products, compare:

- before enrollment recognition success;
- after enrollment recognition success.

If enrollment does not materially improve recognition, investigate reference quality/model strategy before expanding the workflow.

---

# 42. Adaptive Enrollment Test

Test whether:

> “need another useful view?”

logic reduces unnecessary image capture while preserving accuracy.

Compare:

- fixed image count;
- adaptive image request.

Use data, not preference.

---

# 43. Confirmation Learning Test

Evaluate whether adding confirmed high-quality diverse references improves:

- future top-1 accuracy;
- unknown rejection;
- similar-SKU discrimination.

Also test whether uncontrolled addition makes performance worse.

This validates the bounded-reference policy.

---

# 44. Hard-Negative Analysis

For corrected false matches, log confusion pair.

Example:

```text
Predicted: Peak Milk 400g
Actual: Peak Milk 380g
```

Aggregate the most common confusion pairs.

These are candidates for:

- better references;
- OCR clues;
- package rules;
- future metric learning/fine-tuning.

---

# 45. Packaging-Generation Test

If old/new packaging variants exist:

- enroll/reference both;
- query both;
- ensure they map to the correct commercial product identity where appropriate;
- ensure outdated packaging is not incorrectly treated as another product.

---

# 46. Barcode vs Visual Precedence Test

Where barcode confidently identifies package/product but visual retrieval disagrees:

> barcode should generally win unless data integrity checks show barcode mapping is suspect.

Test corrupted mapping scenarios separately.

The system should not average incompatible evidence blindly.

---

# 47. Recognition Data Corruption Test

Deliberately simulate:

- missing embedding;
- corrupted recognition cache;
- missing image asset;
- outdated model-version embedding;
- incomplete profile sync.

Expected:

- scanner degrades gracefully;
- product search/manual flow remains available;
- business database remains safe;
- recognition cache can rebuild.

---

# 48. Model Migration Test

Before changing production model:

1. retain previous model;
2. regenerate subset/all embeddings;
3. run benchmark under new model;
4. compare performance;
5. ensure active profiles remain usable;
6. validate rollback.

Do not migrate based on model popularity.

---

# 49. Same-Store Sync Test

Enroll product on Device A.

Sync.

Device B receives recognition data.

Test:

- Device B can identify product without re-enrollment;
- package mapping is correct;
- model/preprocessing compatibility is handled;
- missing media retries do not break sales.

---

# 50. Unknown Product Checkout Test

Scenario:

- scan unknown item;
- system returns UNKNOWN;
- user creates temporary product;
- enters selling price;
- completes sale.

Measure:

- taps;
- completion time;
- error rate.

This fallback must remain usable even if recognition quality is weak.

---

# 51. Manual Search Baseline

The scanner must be compared against the actual alternative.

Baseline:

> manual product search / recent products / quick creation.

Measure:

- time to product selection;
- errors;
- user preference.

Recognition that is technically accurate but slower than manual search may not create value.

---

# 52. Rush-Period Simulation

Simulate consecutive customer transactions.

Test:

- repeated scans;
- scanner opening/closing;
- barcode and visual mix;
- ambiguous confirmation;
- unknown fallback;
- app memory;
- queueing/customer delay.

Observe whether users abandon the scanner under pressure.

---

# 53. Real User Correction Rate

During pilot measure:

> corrected recognition selections / recognition-assisted selections.

Separate:

- product correction;
- package-unit correction.

Correction rate is one of the strongest practical measures of trust.

---

# 54. Qualitative User Measures

Ask pilot users:

- Was scanning faster than search?
- Did you trust the result?
- When did you ignore the scanner?
- Which products were difficult?
- Was enrollment annoying?
- Would you keep using it?

Do not rely only on quantitative accuracy.

---

# 55. Recognition Test Dataset Metadata

Each test query should record:

- query ID;
- actual product;
- actual package unit;
- known/unknown status;
- capture device;
- lighting condition;
- angle;
- occlusion level;
- packaging generation;
- query image asset;
- benchmark run/version.

This enables reproducible failure analysis.

---

# 56. Benchmark Run Metadata

Every benchmark run records:

- commit hash;
- app/build version;
- model ID/version;
- preprocessing version;
- runtime;
- thresholds;
- dataset version;
- device;
- date/time.

Without this, benchmark results cannot be compared reliably.

---

# 57. Dataset Versioning

The evaluation dataset must have version IDs.

Example:

```text
retail-eval-v0.1
retail-eval-v0.2
```

When products/images change:

> create/update dataset version.

Do not silently alter the benchmark set while comparing models.

---

# 58. Data Leakage Rule

Do not tune model thresholds repeatedly on the exact final evaluation set and then report that set as unbiased performance.

Recommended split as dataset grows:

- development/tuning set;
- validation set;
- holdout evaluation set.

For very small R1 datasets, document the limitation honestly.

---

# 59. Minimum Sample Principle

Do not claim:

> 98% accuracy

from ten scans.

Each product should have multiple independent query examples.

As the benchmark matures, increase query count enough that results are meaningful.

The test plan intentionally avoids pretending early small datasets are statistically definitive.

---

# 60. Reporting Format

Each benchmark report should include:

## Summary

- model/runtime;
- dataset;
- device;
- top-1;
- top-3;
- false-accept;
- unknown recall;
- latency;
- model size.

## Confusion analysis

- top failure pairs;
- package failures;
- unknown failures.

## Performance

- memory;
- thermal/battery notes;
- storage.

## Recommendation

- reject;
- continue testing;
- candidate for mobile integration.

---

# 61. Initial R1 Go/No-Go Guidance

R1 is exploratory.

A candidate should generally continue only if:

- it clearly outperforms trivial/random/manual baselines on the difficult set;
- it can run on target Android hardware;
- licensing is acceptable;
- latency is plausible;
- false confident matching can be meaningfully controlled.

Do not demand production-grade numbers at R1.

---

# 62. Initial Production-Beta Go/No-Go Targets

Before visual recognition is treated as a normal beta checkout accelerator, target approximately:

## Known product Top-1

> **≥ 90%** on representative in-store queries.

## Top-3 recovery

> **≥ 97%** where candidate selection is shown.

## Open-set false-accept rate

> **≤ 1%** for UNKNOWN products receiving an incorrect STRONG acceptance.

Prefer lower if achievable.

## Strong-result precision

> **≥ 98–99%** for scans labeled STRONG.

This matters more than maximizing the number of STRONG outcomes.

## Package-unit accuracy

> **≥ 95%** for package units the system claims to identify automatically.

If below this:

> require explicit package confirmation.

## Median visual result latency

> approximately **≤ 1.5 seconds** on realistic midrange Android.

## p95 visual result latency

> approximately **≤ 3 seconds**.

These are starting engineering targets, not guarantees of business success.

They may be revised after real-store evidence.

---

# 63. Lower-End Device Go/No-Go

On the lower-spec device:

- app must remain stable;
- no repeated out-of-memory crashes;
- visual latency must remain usable;
- sustained scanning must not become unusable due to thermal throttling.

If high-quality visual recognition cannot meet lower-end requirements:

Possible responses:

- use smaller model;
- quantize;
- reduce input resolution;
- make visual scanning optional;
- restrict to midrange supported devices;
- rely more on barcode/manual search.

Do not silently degrade the entire app.

---

# 64. Storage Go/No-Go

Before beta, measure actual recognition storage.

The scanner should not require users to download or retain several gigabytes for a normal single-store catalogue.

If storage grows excessively:

- compress references;
- bound number of references;
- reduce thumbnails;
- avoid broad catalog download;
- use centroid/two-stage search;
- keep large assets server-side where possible.

---

# 65. Enrollment Go/No-Go

Enrollment is acceptable only if users can reasonably add a product without feeling they are performing a technical ML workflow.

If users routinely abandon or avoid enrollment:

- reduce required views;
- improve guided capture;
- enroll gradually from real use;
- rely more on shared profiles.

---

# 66. Production Integration Gate

Recognition may be integrated into the main sale flow when:

1. RecognitionService contract is stable.
2. Barcode path is reliable.
3. Visual candidate retrieval passes agreed R1/R2 thresholds.
4. UNKNOWN handling is tested.
5. Package-unit behavior is safe.
6. Recognition data can survive app restart.
7. Main business database remains isolated from recognition-cache failure.
8. Target-device performance is acceptable.
9. Manual fallback remains available.
10. Recognition does not delay core application development.

---

# 67. Feature Rollout Levels

Use progressive rollout.

## Level 0

Barcode + manual search only.

## Level 1

Visual scanner available behind development/feature flag.

## Level 2

Visual scanner available to selected pilot stores.

## Level 3

Visual scanner generally available to beta users.

## Level 4

Future optimized/shared recognition network.

Do not jump directly to Level 3.

---

# 68. Feature Flags

Recognition should be controllable through feature/config flags.

Possible flags:

- visual recognition enabled;
- OCR reranking enabled;
- local-feature verification enabled;
- shared recognition profiles enabled;
- automatic package-unit selection enabled.

This allows measured rollout and rollback.

---

# 69. Failure Threshold

Pause/disable a recognition feature if pilot data shows:

- dangerous false matches;
- frequent user corrections;
- meaningful checkout slowdown;
- crashes;
- severe battery/thermal problems;
- excessive storage;
- users consistently prefer manual search.

The core product continues without it.

---

# 70. Recognition Bug Severity

## Critical

- wrong STRONG match causes repeated wrong transaction;
- crash/data corruption;
- scanner changes business data directly;
- package conversion corruption;
- private recognition data leak.

## High

- high unknown false-accept;
- scanner unusable offline;
- severe performance regression;
- repeated package misidentification.

## Medium

- occasional ambiguous ranking problem;
- enrollment friction;
- OCR failure.

## Low

- cosmetic scanner UI issue.

---

# 71. Acceptance Test Ownership

## AI coding agent / engineer

Responsible for:

- automated benchmark tooling;
- unit/integration tests;
- device instrumentation;
- benchmark reports;
- regression testing.

## Founder/product

Responsible for:

- representative product selection;
- real-store workflow evaluation;
- user feedback;
- deciding whether measured benefit justifies complexity.

## Architecture review

Required when:

- model/runtime changes;
- thresholds materially change;
- recognition begins controlling transaction behavior automatically.

---

# 72. Recognition Regression Suite

Once a product/model configuration is accepted:

> preserve the benchmark dataset as a regression suite.

Every meaningful recognition change should compare against previous accepted baseline.

Do not accept a new model because one metric improved if:

- false accept got worse;
- latency doubled;
- storage exploded.

---

# 73. Regression Decision Matrix

A new model/runtime should report:

| Dimension | Old | New | Better/Worse |
|---|---:|---:|---|
| Top-1 | | | |
| Top-3 | | | |
| False accept | | | |
| Unknown recall | | | |
| Median latency | | | |
| p95 latency | | | |
| Model size | | | |
| RAM | | | |

A change is accepted based on overall product value, not one metric.

---

# 74. R&D Execution Sequence

Recommended:

1. Create benchmark tooling.
2. Build R1 dataset.
3. Establish manual/barcode baseline.
4. Benchmark several visual encoders.
5. Remove candidates with unsuitable licensing/performance.
6. Benchmark remaining candidates on Android.
7. Add open-set thresholding.
8. Add adaptive enrollment.
9. Test local retrieval scaling.
10. Test OCR reranking.
11. Test package-unit recognition.
12. Test sustained scanner performance.
13. Run R2 expanded set.
14. Integrate behind feature flag.
15. Run real-store R3 pilot.
16. Decide whether to expand, simplify, or defer visual scanning.

---

# 75. What the active AI coding agent Must Not Do

the active AI coding agent must not:

- evaluate with enrollment images as test images;
- report one accuracy number without unknown/false-accept results;
- select model using only desktop performance;
- test only high-end Android;
- tune on final holdout and call it unbiased;
- hide failed/confusing product pairs;
- remove UNKNOWN to increase top-1 appearance;
- treat nearest neighbor score as calibrated probability;
- ship visual recognition because a demo looked impressive;
- integrate visual recognition deeply before fallback workflow works;
- make recognition benchmark results non-reproducible.

---

# 76. Recognition Test Deliverables

Recognition R&D should produce:

```text
docs/recognition/reports/
  R0_BENCHMARK.md
  R1_MODEL_COMPARISON.md
  R2_DEVICE_BENCHMARK.md
  R3_PILOT_RESULTS.md
```

and machine-readable benchmark outputs where useful.

Raw datasets should not be committed to Git if:

- too large;
- private;
- licensing-sensitive.

Instead document secure storage location/version.

---

# 77. Recognition Dataset Privacy

Do not include:

- customer faces;
- unrelated private store information;
- personal documents;
- payment screens;

in the recognition dataset.

Crop/product-focused imagery is preferred.

Consent requirements apply when retailer-contributed imagery is retained beyond local use.

---

# 78. Final Product Decision Rule

The final question is not:

> “Can AI recognize products?”

The final question is:

> **Does this scanner make real retail work faster and safer enough to justify its complexity?**

If yes:

> integrate and expand.

If partly:

> keep it optional and targeted.

If no:

> retain barcode/search/progressive creation and defer advanced visual recognition.

The product must still succeed without the visual system.

---

# 79. Source-of-Truth Relationship

This document must be read with:

- `SCANNING_ARCHITECTURE.md`
- `TECHNICAL_ARCHITECTURE.md`
- `PRD_MVP.md`
- `DOMAIN_DATA_MODEL.md`
- `BUILD_PLAN.md`

This file is authoritative for recognition evaluation methodology and acceptance gates.

If real benchmark evidence proves a threshold or assumption wrong:

1. document evidence;
2. update the relevant report;
3. propose revised threshold/architecture;
4. record the decision;
5. update this file if approved.

Do not silently move the goalposts.
