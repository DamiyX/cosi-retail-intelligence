# P2-03 recovery fixture recreation correction

Status: local source, host checks, release build and APK static checks complete;
physical Android lifecycle/export verification remains pending.

The founder explicitly requested that Track B fix the discovered issue directly
instead of reporting it to the coordinator. No coordinator message was sent.

## Problem and correction

The C2 recovery APK lacked an explicit, supported way to perform and record an
Activity-only recreation while its document picker was pending. That prevented
the planned generated test from proving recreation separately from process death.
The earlier original-photo export failure remains an Android low-memory process
termination observation; this correction does not establish its underlying cause.

The fixture now consumes one durable recreation intent before launching its
picker. The originating Activity requests public Activity.recreate() after stopping
behind the picker. Its new instance records the old/new instance identities,
unchanged process identity/PID, observed destruction and prior result registration.
The application controller and lock survive that Activity transition. A fresh
process cannot reconstruct a recreation permit or claim the missing receipt.
The generated callback requires the receipt plus a different process identity/PID
before obtaining destination grants. The actual evidence recovery prerequisite
now requires both lifecycle stages and successful generated readback.

The scope is six existing source files and two new fixture/test files, listed in
the run charter and source-verification.json. No new dependencies, permissions,
capture, model or business behavior were added. The original photo recovery
journal schema and14KiB/eight-entry bounds remain. Fixture records use18KiB plus
at most4KiB output within its existing64KiB allowance. Original photo data and
old APKs/staging sources were preserved.

## Verification actually performed

- One implementation pass, with new host coverage expanded from34 to37 to39
  assertions. Six retained executables passed709 assertions; the final new
  executable passed39, for748 distinct current assertions. These are generated
  host checks, not Android lifecycle observations.
- Java, Kotlin and Android-target C compilation passed. The C check used
  -Wall -Wextra -Werror. No TypeScript behavior changed.
- One offline release build passed on its first attempt:323 tasks executed,
  Gradle exit0,8m13s. No build retry was needed.
- APK signature, same certificate/package/version, ZIP CRC and16KiB alignment
  passed. The complete binary manifest comparison found only the previously
  added nonexported recovery Activity relative to the original capture APK.
  Permissions remain unchanged. All409 dependency artifact rows/eight
  configurations match the accepted dependency baseline.
- Eighteen ARM64 native libraries were checked. The publisher is the sole
  meaningful native delta; two other native differences are build-ID-only.
  All105 original non-bundle assets remain unchanged. R8 service descriptors
  retain their original semantic interfaces/providers.
- The617-source index, derived pin,591 reviewed overlays, source stage and old
  stage/protected artifacts were checked. Built Activity bytecode contains
  unconditional constructor result registration and the public recreate call.

Artifact: `C:\Users\doyew\Documents\DEV 2\COSI-m8-planning\apps\recognition-lab\runs\phone-experiment\p203-export-recovery-recreation-fix-20261024-a1\recognition-camera-recovery-release.apk`  
Bytes: 39988418  
APK SHA-256: `cd910adf1ada194f748860a01792f7aa99c51264cde7ccb617e1e1eb02fa944a`  
Certificate SHA-256: `48550aec63c2b09f7746775002fbc93c3c2ceb95bc388be59e95bcd26a7e2d83`  
Source index SHA-256: `b839df3b4e08699a9bae49b45942f23ef2ef36d12d77a0f5ad12cb91a7323fe5`

Primary receipts are in
`apps/recognition-lab/runs/phone-experiment/p203-export-recovery-recreation-fix-20261024-a1/`:
final-verification.json, artifact-result.json, gradle-release.json,
actual-activity-bytecode.json and the indexed host/compile command receipts.

## Remaining work and limits

No phone connection, installation, fixture execution, picker action, process kill,
photo/export attempt, transfer, Git commit/push or CI action occurred in this
correction. This is a replacement experiment APK, not full-app release acceptance.
The next step is the generated phone recreation/process-death verification,
followed by existing saved-evidence recovery only after its prerequisite passes.
OEM picker/lifecycle/grant delivery, installed size and peak RAM remain unproved.
The strict chart-only scene gate and four inconclusive markers remain open;
successful export alone cannot accept P2-03. P2-04 remains held; P2-05/CI deferred.

One auxiliary final-receipt aggregation initially selected the wrong test indices;
it was corrected to exclude superseded34 and include the retained67. No runtime
test or APK build failed in that bookkeeping correction.
