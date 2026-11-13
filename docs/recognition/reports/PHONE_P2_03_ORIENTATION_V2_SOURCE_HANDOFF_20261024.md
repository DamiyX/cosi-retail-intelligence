# P2-03 orientation V2 source handoff

2026-10-24. Source/host slice complete; Track B stopped for independent review.
P2-03 remains CHANGES REQUIRED; P2-04 held. No new APK or phone test in this slice.

Exact packet: `apps/recognition-lab/runs/phone-experiment/p203-orientation-source-v2-20261024-a1/HANDOFF.md`.
696-input source index SHA256 `a44ce08a84ffcdd32797f9fbdbbd32942ccf98c49a82d7696d554ec20164abf8`;
source patch SHA256 `cab013769b9d1bee61cfb1b87c4b610fa16794190d18a52e11f99ba46636c6ec`.
15 existing files changed;27 new source files. Exact per-file/test hashes in packet.

The explicit isolated Expo57.0.6 amendment binds capture and preview rotations to
actual display rotation, captures native per-job geometry/generation and actual
JPEG/EXIF/hash evidence, and rejects stale or unsupported metadata before inference.
New V2 fixed8-row run, generated/first/final export gates and retained-history
capacity accounting preserve old source pins, Activity and historical evidence.
No fitted pose transform, model/dependency/permission change or historical relabeling.

Final generated checks:355 geometry +362 export/restart assertions,17 native token/
closure assertions,5 amendment tests;75 Jest tests/9 suites, TypeScript and focused
zero-warning lint. Scoped legacy/new host suites total1975 assertions. Offline
amended camera/module Kotlin, Java and C syntax checks pass. Legacy638-byte generated
export remains byte-identical. Full legacy115-row storage stress timed out at180s;
that suite remains unverified. Original failure and corrected check receipts retained.

No independent acceptance, APK/R8, new physical geometry, real transient native
lifetime, SAF/grant or hardware-drain proof. FOV/scene/crop correspondence, SDK total
RAM/cache and power-loss/provider-directory durability limits remain. Shared256MiB
cap can refuse the proposed run beside retained history; capacity needs review.

Next: independent exact-source review, then a separately reviewed APK/build packet,
generated phone export/restart proof and separately authorized8-photo geometry packet.
No Git/CI action; checkpoint374286d remains unchanged.
