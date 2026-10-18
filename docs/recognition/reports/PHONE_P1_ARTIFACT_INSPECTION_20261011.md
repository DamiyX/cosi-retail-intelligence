# P1 pinned runtime archive inspection

Decision for the next review: **Interpreter-only ai-delivery exclusion remains
plausible, not proven**. The two actual archives contain a separate delivery
API family, but no Play class reference was found in the inspected Interpreter
class closure, including its application-runtime reflective factory. A generated
release/R8 linkage and later bounded native smoke are required. Do not use a
blanket `dontwarn`, silently substitute a runtime, or infer privacy from this result.

This is the archive-inspection slice authorized by the founder and coordinator
PHONE_P1_INSPECTION_DISPATCH_20261011.md. No SDK/JDK setup, native/mobile edits,
build, device access, model/private-image processing or archive-code execution.
The broader founder continuation toward the reviewed isolated build remains
recorded; coordinator review/next sequential dispatch is the next ownership gate.

## Acquisition and bounded inspection

New ignored run:
`apps/recognition-lab/runs/phone-experiment/p1-artifact-inspection-20261011-a1`.
Both downloads returned HTTP200, unchanged exact official final URL, and the
approved Content-Length, full received byte count and SHA256. Redirects were
disabled, reads bounded, and acceptance occurred only after both count/hash
matched. No additional payload artifacts were acquired.

| Artifact | Actual bytes | Actual verified SHA256 |
| --- | ---: | --- |
| litert2.2.0 |11,761,541|`624518d72f8a249711a19e9901f480e74f823ca7818260a739cb2c023024807c`|
| litert-api2.2.0 |934,666|`b785714414d7af54ad1e8f4a40a382f2809b538b88a2246dcdeb9039394bc38d`|

Official sources: [runtime AAR](https://dl.google.com/dl/android/maven2/com/google/ai/edge/litert/litert/2.2.0/litert-2.2.0.aar),
[API AAR](https://dl.google.com/dl/android/maven2/com/google/ai/edge/litert/litert-api/2.2.0/litert-api-2.2.0.aar).
Total accepted transfer12,696,207 bytes. Download receipts are in the run.

ZIP/JAR entries were read in memory; no filesystem extraction or Java/native
execution. Limits:4000 entries/archive,64MiB/entry,256MiB declared expansion/
container,200:1 ratio,512MiB aggregate across both AARs/nested JARs; no deeper
archive nesting. Reject raw traversal/drive/backslash/NUL paths, case duplicates,
links/non-regular modes, encryption and unsupported compression. Full entry
read/CRC and declared-length checks occur before parsing. Class/ELF readers also
check offsets/counts. These are bounded static controls, not a vulnerability audit
of the libraries or a promise that every malformed binary is detected.

Runtime AAR:13 entries,27,786,869 expanded bytes; API:10 entries,3,444,809 expanded
bytes. Nested classes.jar:17/85 entries,52,428/287,333 expanded bytes. Across both,
84 classes, all classfile major61 (Java17), no duplicate logical class names.
`inspection.json` inventories each outer entry/hash and every parsed class,
method signature/reference, native method and ELF. `trace.json` adds explicit
reflection roots and full-text notice/shrinker-file inventory.

## Interpreter and delivery boundary

Direct constant-pool class/descriptor closure from
`org.tensorflow.lite.Interpreter` contains24 archive classes. It reaches
InterpreterImpl, NativeInterpreterWrapper/Experimental, TensorImpl,
TensorFlowLite and application/system-runtime holder classes. This closure is
an overapproximation of class references, not an executed call graph.

`TensorFlowLite` calls System.loadLibrary with constant `LiteRt`; the runtime
contains `libLiteRt.so`. Its possibly-available-runtime helper calls Class.forName
with a runtime prefix and `.InterpreterFactoryImpl`. Application prefix is
`org.tensorflow.lite`; the actual InterpreterFactoryImpl is present in the runtime
JAR, calls TensorFlowLite.init, and constructs InterpreterImpl for File/ByteBuffer.
Adding that reflective target yields25 reachable archive classes. No Play/AiPack
class edge was found in that augmented class/descriptor closure.

System prefix `com.google.android.gms.tflite` and diagnostic strings referring to
Play-services inference remain in the API. Explicit FROM_APPLICATION_ONLY is
therefore essential in the proposed adapter; static presence of alternative
paths does not prove they execute, or that the default is suitable. Reflection,
native JNI registration, dynamic loading and initializer behavior remain limits.
`NonNull` annotation references are also external; they are not evidence of an
automatically required Play runtime.

In contrast, the API actually contains AiPackModelProvider and four companion/
download/listener classes. Four classes have direct Play/GMS references,
including AiPackManagerFactory/Manager/State/Location/AssetLocation,
AiPackStateUpdateListener, Task and OnFailureListener. This corroborates the P0
published ai-delivery0.1.1-alpha01 edge; the classes were not inferred only from a
POM. There is no observed bridge from the augmented Interpreter closure to them.

Both consumer proguard files preserve UsedByReflection annotation/classes/members.
There is no observed blanket keep of the whole deployment package, and AiPack
classes' parsed constant pools do not contain Keep/UsedByReflection references.
This supports, but does not prove, pruning unused delivery code. R8 must show
AiPack/Play delivery absent without missing-class suppression; preserve the
reflection factory and JNI names. Do not strip all annotations/native methods
or omit required Guava/lifecycle/coroutine dependencies on this evidence alone.

Recommended exact candidate for next generated build: retain both pinned AARs
and candidate version/model, explicitly exclude only
`com.google.android.play:ai-delivery` from the litert dependency; no whole-Google
group exclusion or extra CompiledModel/deployment usage. Inspect the resolved
runtime tree and APK classes for delivery/Play children. If D8/R8/linkage fails,
return the exact diagnostics and revise the proposal; do not use `dontwarn` or
silently add the excluded SDK. The current slice applied no dependency exclusion.

## Actual manifests and ABI/ELF evidence

**Both packaged manifests declare minSDK24**, rather than the generic table's23.
Use the payload24 floor in the subsequent native proposal; it matches the P0
inspected RN default. No aar-metadata.properties file is present in either
outer inventory to establish a minimum compile SDK. This does not validate
exact Expo57/RN0.86 integration.

Both manifests declare FOREGROUND_SERVICE and FOREGROUND_SERVICE_DATA_SYNC,
optional android.hardware.npu and31 optional vendor/system native-library names.
Neither declares INTERNET, providers, services, activities or receivers in these
two payload manifests. This absence is limited to these AARs, not all transitives
or the eventual APK. CPU-only app must remove the two unrelated foreground
permissions and review/remove unused acceleration declarations, then inspect
the final merged manifest. Do not call the archives manifest-neutral.

Nine ELF payloads across three ABIs; **no x86 payload**:

| ABI | Runtime libLiteRt.so | Runtime ClGl accelerator | API liblitert_jni.so |
| --- | ---: | ---: | ---: |
|arm64-v8a|5,508,376|3,105,544|528,696|
|armeabi-v7a|3,602,584|2,201,100|323,060|
|x86_64|7,649,584|3,744,656|510,768|

All27 observed PT_LOAD segments have p_align16384 with valid offset/virtual-address
congruence; all nine pass the inspector's ELF16KiB alignment predicate. Synthetic
32/64-bit, little/big-endian4KiB versus16KiB cases distinguish pass/fail. This
proves these inspected ELF segment fields, **not** final APK ZIP alignment or
execution on a16KB-page device. Final packaging still needs zipalign/ELF inspection
for every dependency and the later approved environment check.

Runtime libLiteRt.so directly needs libdl, GLESv3, EGL, libm, liblog and libc;
the accelerator has the same family of dependencies. API JNI directly needs
libandroid, libdl, libm, liblog and libc. No Play Java artifact appears as ELF
DT_NEEDED. CPU selection does not erase these GL/EGL native link dependencies.
Initial arm64 proposal should retain the candidate's native payloads; excluding
the accelerator binary requires a separate exact dependency/load-path proof.
arm64's combined native-file size is9,142,616 bytes (~8.72MiB), before model,
notices, JS/Kotlin, other libraries and packaging. Installed size/RAM still unknown.

## Notices, rights and remaining artifacts

Each archive contains identical LICENSE13,575 bytes/SHA256
`71c6915d04265772a0339bed47276942c678b45cc01534210ebe6984fd1aec65`
and THIRD_PARTY_NOTICE1,915,758 bytes/SHA256
`2d4d617ff3047813c1b4bfd66dc3c95b2352b401546c6e58a33b7c885091372a`.
Full bytes are saved under generated owned names, not just the shortened JSON
previews. LICENSE includes Apache text and a Caffe/BSD notice; the long notice
has numerous component sections and Apache/MIT/BSD/MPL/Unicode/GNU/EPL textual
markers. A marker alone is not a license conclusion for linked code: GNU text
can be an alternative/exception/reference inside another license. This slice
does not map every notice paragraph to a shipped object or accept SDK terms.
Preserve complete notices and perform the resolved artifact notice review before
redistribution; do not label the whole dependency graph Apache-only.

Additional payloads were not fetched. P0 POM still identifies lifecycle2.10.0,
Guava33.5.0-android and kotlinx-coroutines-guava1.8.0; their resolved Android
variants/BOM-managed children and retained terms need inspection in the next
bounded setup/build dispatch. Excluded ai-delivery would have pulled Play terms/
basement/tasks/asset-delivery/core-common; no local copies/terms acceptance were
created for those payloads. Model redistribution evidence remains the existing
pinned model metadata/license record; the model was not downloaded or executed.

## Verification and next sequential slice

Download, bounds, static inspection, reflection augmentation and ELF synthetic
checks exited0 after the recorded bounds repair. Twelve bounds cases and eight
ELF cases pass. The raw-backslash counterexample failed before using ZipInfo's
orig_filename, then passed after; Python on Windows normalizes filename before
the public filename field. The first helper-created path fixture also normalized
its own path, so the corrected test patches raw ZIP names. Both failures are
retained. Archive byte hashes are rechecked at freeze; no original artifact moved.

Proceed after coordinator audit, under the recorded founder continuation, to a
bounded prerequisite/isolated generated-only native source/build dispatch:
freeze exact JDK/SDK/template/classpath/transitives; use minSDK24 and application
CPU Interpreter, one thread, no default XNNPACK/NNAPI/GPU; apply the reviewed
delivery exclusion and foreground-permission removal; retain notices/reflection
rules; build release/R8 and verify ordinary-build model/native exclusion, final
class/manifest/provider/ABI/ZIP/ELF contents. Compile success alone is not execution
proof. Then a separate exact generated-device tensor smoke must load/create/run/
close, including reflection/native names, before any private-image portability.
Private device/photo execution remains later gated. No repeat download approval
is needed for the two already authorized/verified archives.
