# P1 archive-inspection stopped handoff

**STOPPED / leaseNULL**, sole existing writer01a1051f-0777-7573-ad09-0e550a4bd56a,
Sol6.1 HIGH. Checkout C:\Users\doyew\Documents\DEV 2\COSI-m8-planning;
branch plan/m8-unified-scanner, HEAD66ea3fc22595a48d7355d1729bb879496cc98896.
Independent inspection audit pending; no native build/device/private-data claim.

Direct founder authorization verified in coordinator turn
01a12d2f-51e4-7bb2-9e4f-af463aa31199, message
01a12d2f-52a3-7572-9d38-6ee59cc67810, approving the downloads and continuation
toward the reviewed build. Direct completion message to coordinator
01a098ef-d830-7531-bca7-2d66b0a5b587 is required after freezing. Delivery status
is reported in the writer chat; delivery does not itself start an audit.

## Delivered scope and checked result

NEW report: docs/recognition/reports/PHONE_P1_ARTIFACT_INSPECTION_20261011.md.
NEW handoff: this file. NEW ignored owned run:
apps/recognition-lab/runs/phone-experiment/p1-artifact-inspection-20261011-a1.
No other source/evidence mutation. At completion only workflow lease/current_state/
updated_at change; PROJECT_STATE/other workflow fields are coordinator-owned.

Exactly two official archives acquired/verified:

- litert2.2.0:11,761,541 bytes,
  SHA256624518d72f8a249711a19e9901f480e74f823ca7818260a739cb2c023024807c.
- litert-api2.2.0:934,666 bytes,
  SHA256b785714414d7af54ad1e8f4a40a382f2809b538b88a2246dcdeb9039394bc38d.

HTTP200/exact final URL/count/hash receipts retained; no other payload download.
Bounded ZIP/JAR read-in-place; no extraction/Java/archive/native executable run.
Actual84 Java17 classes,9 ELF files, manifests/notices/shrinker rules inventoried.
Interpreter closure24 classes plus reflective application factory gives25;
no direct Play class edge found in that overapproximation. API does contain
AiPack delivery classes with actual Play/GMS references. Native/reflection loading
and R8 remain unproven. Exclusion is plausible, not an accepted working runtime.

Actual manifests both require minSDK24 and foreground-service/data-sync permissions;
no providers/services/INTERNET declared in these two archives. All9 ELF/27 PT_LOAD
segments pass16KiB segment alignment across arm64/armeabi-v7a/x86_64; no x86.
This is not APK ZIP alignment or device validation. CPU libLiteRt also links
GL/EGL. Full LICENSE/1.9MB third-party notices retained; resolved transitive terms
remain incomplete. See the report for exact sizes, native names/dependencies,
class traces, license limits and proposed generated-only linkage/R8 checks.

## Commands, exits, bindings and preservation

Using existing pinned exploratory venv Python with `-B`, from checkout root:

- `.../python.exe -B <ownedrun>/Capture.py`: exit0, pre-edit baseline747
  repository source/config records and76,764 protected records. No ownership conflict.
- `.../python.exe -B <ownedrun>/Download.py`: exit0, two accepted pins, redirects
  disabled/size and elapsed-read bounds. `download-receipts.json` contains exact
  URLs/status/expected/actual bytes/hash; no package resolution or install.
- `.../python.exe -B <ownedrun>/Test-Bounds.py`: final exit0,12 generated
  positive/negative cases; two earlier backslash-fixture/guard failures retained.
- `.../python.exe -B <ownedrun>/Inspect.py`: exit0, bounded class/ELF/XML inventory.
- `.../python.exe -B <ownedrun>/Trace.py`: exit0, reflective factory augmentation,
  Play-class facts, full-text license/notice/proguard retention.
- `.../python.exe -B <ownedrun>/Test-Elf.py`: exit0,8 generated32/64-bit/endian/
  4KiB-versus16KiB cases. Native code executed=false.
- Finalize/stopped inventory checks: verify all746 unaffected existing source
  records and all76,764 protected records unchanged, both downloaded archive pins,
  only two new reports and the allowed workflow three-field delta. Exact script/
  report/download/inspection/output inventory hashes bound by frozen-handoff.json.
  Git branch/HEAD unchanged; workflow schema/whitespace checks recorded.

No P0 test/generation rerun; the complete stopped P0 run, its source closure and
coordinator audit are protected. No mobile/native/config/package/lock/domain/
contract/label-rule/producer edit; no model/private-pixel inference/decoding,
JDK/SDK setup/build/device/camera/new photo/service/cloud/network-toggle/Git/
automation effects. Bounds tests certify this inspector's cases, not a library
security/rights/native-compatibility verdict. No full lab tests were needed for
new static inspection scripts/reports; all existing tests/source are unchanged.

Machine handoff and inventories:
`apps/recognition-lab/runs/phone-experiment/p1-artifact-inspection-20261011-a1/frozen-handoff.json`.
The two reports' own hashes are in source-inventory.json, inspection.json/trace.json
hashes and archive/script/full-notice hashes in output-inventory.json. Self hashes
are kept outside the reports to avoid circular checksums. Direct report-back
follows the frozen verification; coordinator owns further summary/action updates.

## Concrete next action

Coordinator audits the stopped archive/static evidence, then issues the bounded
native prerequisite/source/build slice under the already recorded founder
continuation: exact toolchain/resolved non-delivery artifact/terms inventory;
isolated entry/ordinary exclusion; minSDK24; FROM_APPLICATION_ONLY CPU options;
ai-delivery exclusion; remove unused foreground permissions; retain reflection/
JNI names/notices; release/R8 linkage without `dontwarn`; final class/manifest/
ABI16KB packaging inspection. Failures must return actual diagnostics rather
than silently add Play SDKs/change runtime. Generated native execution and private
phone/photo work require their later exact packets. Writer remains STOPPED.
