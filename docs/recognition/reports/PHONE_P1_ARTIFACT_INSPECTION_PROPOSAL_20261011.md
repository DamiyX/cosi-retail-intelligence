# Next bounded action: inspect two runtime archives

Status: founder APPROVED the two-archive acquisition/inspection and continuation
toward the reviewed isolated phone build. See PHONE_P1_INSPECTION_DISPATCH_20261011.md.
The acquisition stage precedes native adoption/build setup and its stopped audit.

## Purpose and decision

P0 found an ai-delivery dependency in the published LiteRT API POM. Inspect the
actual two candidate archives to trace Interpreter dependencies, manifests,
native libraries and notices. Decide whether a Play-delivery-free CPU candidate
remains plausible before requesting JDK/SDK setup or implementing the phone build.
Static inspection cannot prove the exclusion works at runtime; generated native
build/linkage/device checks will still be required if the candidate proceeds.

## Exact proposed acquisition

| Archive | Official URL | Publisher bytes | Publisher SHA256 |
|---|---|---:|---|
| litert2.2.0 | https://dl.google.com/dl/android/maven2/com/google/ai/edge/litert/litert/2.2.0/litert-2.2.0.aar |11,761,541|624518d72f8a249711a19e9901f480e74f823ca7818260a739cb2c023024807c|
| litert-api2.2.0 | https://dl.google.com/dl/android/maven2/com/google/ai/edge/litert/litert-api/2.2.0/litert-api-2.2.0.aar |934,666|b785714414d7af54ad1e8f4a40a382f2809b538b88a2246dcdeb9039394bc38d|

Total proposed transfer12,696,207 bytes, approximately12.11MiB. Existing model
and all previous private inputs/results remain untouched. These are publisher
metadata pins until independently checked against the acquired bytes.

Use a NEW ignored local inspection run under
`apps/recognition-lab/runs/phone-experiment/p1-artifact-inspection-20261011-a1`.
No overwrite or recursive deletion. Record URL/status/final destination/bytes/hash.
Reject unexpected redirects, oversized responses or mismatched bytes/hashes.
Do not use installers, Gradle resolution, auto-download transitive dependencies
or execute code from these archives.

## Static review and return

- Inspect ZIP entries in place, with bounded entry/expanded-byte limits; reject
  invalid traversal/link entries. Prefer bounded reads to filesystem extraction.
- Inspect manifest/provider/permission declarations, LICENSE/NOTICE evidence,
  classes and native ABI/ELF alignment. Trace references from Interpreter/API
  classes to ai-delivery and other SDKs. Record any reflection/native-loading
  uncertainty; a missing static reference alone is not a runtime proof.
- Keep archive bytes unchanged. Report the proposed exact dependency exclusion,
  evidence supporting or contradicting it, transitive artifacts still requiring
  review and the next bounded build/setup request.
- STOP and send coordinator the direct handoff with archive/check/source hashes
  and limitations. No phone photos, device operations, native source changes,
  package edits, JDK/SDK installation, build, services, cloud/Git effects or terms
  acceptance in this inspection slice. If additional artifacts are necessary,
  name them and return for scope review instead of fetching them automatically.

## Why another approval is needed

The approved P0 ticket explicitly says "Do not install/download". The founder's
P0 continuation did not authorize artifact acquisition. This proposal makes the
next limited action reviewable before that approval, without requesting an
unbounded native setup or accepting SDK terms on the founder's behalf.
