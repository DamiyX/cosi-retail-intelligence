# P1 archive inspection: independent audit

2026-10-12 Africa/Lagos. Decision: **accept the acquisition/static inspection**;
the Interpreter-only exclusion is a justified generated-build candidate, not a
validated runtime. Founder approval for downloads and subsequent isolated build
work is already recorded in PHONE_P1_INSPECTION_DISPATCH_20261011.md.

The coordinator verified STOPPED/lease NULL and frozen handoff SHA256
fa894544efdf84df38709cc4423dcef1f54033c8cefa81ffbd173126f7bf4ea1.
No new runtime/model was substituted. Original P0 and other work were preserved.

## Independent checks

- Rehashed both downloaded archives: exact approved11,761,541/934,666 byte counts
  and SHA256 pins agree. ZIP/JAR CRCs and entry inventories agree.
- A separately written constant-pool reader found84 Java17 classes; its independent
  Interpreter closure is24 classes,25 after adding InterpreterFactoryImpl as the
  explicit reflective application-runtime root. No direct Play/GMS edge occurs
  in that augmented overapproximation. This is not proof of executed native or
  reflective behavior. The inspected API still contains separate delivery classes.
- Independently parsed both XML manifests: minSDK24; FOREGROUND_SERVICE and
  FOREGROUND_SERVICE_DATA_SYNC are present; INTERNET is absent in these two AARs.
  Package privacy and classpath exclusion remain final-build questions.
- Independently parsed all9 ELF program-header tables: all27 load segments have
  >=16KiB power-of-two alignment and appropriate offset/address congruence. Final
  APK ZIP alignment and device execution remain untested. Required GL/EGL/system
  links and the inspected native payloads must not be stripped without proof.
- Retained LICENSE/THIRD_PARTY_NOTICE hashes/bytes agree. Presence of notices is
  not a complete resolved-component license or redistribution conclusion.
- Fresh generated inspector bounds cases12/12 and ELF cases8/8 pass. No JVM or
  native/archive code was executed during these static checks.
- Independently rehashed all76,764 protected records and746 unchanged baseline
  source/config records: zero mismatches. Verified3 frozen source inventory and38
  output inventory records. The only pre-audit workflow change is the three
  authorized fields; lease NULL and unrelated fields agree with the pre-writer
  snapshot. No mobile/package/native or previous evidence changes.

Independent evidence: NEW ignored
`apps/recognition-lab/runs/phone-experiment/p1-independent-review-20261012-a1/independent-checks.json`.
The coordinator's separate audit script is retained with that receipt. The two
downloaded archives are immutable accepted inputs for the next slice.

## Next approved slice and residual risk

Proceed under the founder's existing continuation to the bounded
PHONE_P1_NATIVE_BUILD_DISPATCH_20261012.md. Freeze/download required local build
tools and resolved non-delivery dependencies; implement the isolated generated
runtime app; test class/manifest/module exclusion, compile/link/R8 and inspect the
release APK. Use actual minSDK24, FROM_APPLICATION_ONLY, one CPU thread and no
default acceleration. Preserve reflection/JNI names and notices; remove unrelated
foreground permissions. Never suppress missing-class warnings or silently add
excluded delivery SDKs to make the build pass.

Build success will establish build/linkage/artifact evidence only. Generated
native execution, camera/ROI/image equivalence, private portability, phone speed,
storage/thermals, calibrated UNKNOWN and M12 remain OPEN. Existing manual label
result remains17/20 first20/20 top-three. No user photo assignment is needed now.
