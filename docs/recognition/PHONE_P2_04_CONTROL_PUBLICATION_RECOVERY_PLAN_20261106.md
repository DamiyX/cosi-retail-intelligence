# P2-04 control publication and interrupted initialization recovery

6 November 2026. Founder requested this focused plan after selecting Astra. Planning complete. Founder subsequently approved source correction and recovery implementation (D-067); device recovery remains unapproved and unexecuted. Same dedicated chat: 01a18b1c-dddc-76f3-b147-610604e47e08. No new writer.

## Evidence and objective

Repair the missing native control-publication contract and safely determine whether the ONE D-066 initialization can finish. Preserve the ten founder-entered identities, session enrollment-mw4zmxro, every consumed attempt, staged file, quota charge and old artifact. No camera change or app rewrite is indicated.

Confirmed: source659's EnrollmentControl publishes session/report files through CameraProofRename, but camera_proof_publish.c rejects their exact control root. The coordinator's actual C guard probe rejects session, R01.intent and R02.bin while accepting existing ledger/record controls. This proves a source defect, not the exact Android exception. The one phone initialization returned generic uncertainty; its durable stage is unknown. Prior source/APK reviews missed this cross-language connection and remain qualified.

Evidence: PHONE_P2_04_CONTROL_PUBLICATION_RECOVERY_BRIEF_20261106.md and runs/phone-experiment/p204-control-publish-diagnosis-20261106-a1 under apps/recognition-lab. The exact requested roster is in p204-evidence-initialization-20261106-a1/roster-observed.json. Preserve its spelling and internal whitespace; do not reconstruct labels from this plan or silently correct Airport/NIVEVA.

## Selected approach and alternatives

Recommend a fixed initialization reconciliation operation, followed by explicit continuation only for a provably matching state. Merely adding the root to the publisher leaves session.new blocked by EnrollmentControl.descriptor(). Blindly pressing Initialize again therefore does not solve recovery. Reset/recreate would discard provenance and is rejected. A general file-recovery framework is unnecessary.

Keep EnrollmentControl as the fixed-file owner, EnrollmentDescriptor as canonical roster validator, EnrollmentStore as journal owner and the existing global operation gate as sole serialization boundary. Do not change ordinary initialization into an automatic recovery path.

## 1. Complete the existing publication contract

In camera_proof_publish.c admit only exact observed-enrollment-evidence-v1 and final leaf session, plus R01 through R05 with suffix .bin, .intent, .result, .export-intent, .destination or .export-result. Stage must be exactly final name plus .new. Align with EnrollmentRootRegistry, without broad prefix matching or accepting arbitrary JS paths.

Preserve predecessor predicates, bounds, identity checks, UID/link/no-follow checks, no-replace rename, file/directory synchronization and error handling. This completes already specified writes; it does not authorize preparing R01 again or opening any report slot.

## 2. Read-only reconciliation before any continuation

Add one bounded explicit setup-reconciliation route, exposed through the existing native adapter and setup UI. Normal startup/setup must remain read-only. It must work when the normal descriptor reader refuses session.new; do not weaken that reader. Inspect only the fixed descriptor/stage and existing journal metadata needed to establish initialization. Do not invoke classifyInterrupted, create directories, reserve slots, initialize, prepare reports, export, capture or model work.

Use bounded descriptor reads (8192 bytes), canonical round-trip parsing, exact root/file identity and size/hash checks. Distinguish missing from inaccessible, zero/partial and invalid data. A zero-byte stage must be reported as invalid, not absent or eligible. Handle a missing root without creating it. Read under the existing gate; report changes during observation as unknown. No arbitrary private-data/logcat reader.

Return a strictly validated discriminated status: ABSENT, MATCHING_STAGE, DESCRIPTOR_ONLY, COMMITTED_MATCH, CONFLICT, INVALID_STAGE, JOURNAL_UNCERTAIN or UNKNOWN. Include safe fixed phase/error codes, descriptor digest, roster digest, bounded file identity facts, journal sequence/head/consumed IDs and matching booleans. Existing approved roster display is sufficient; no image/vector/content dump. Do not expose raw exceptions, filesystem paths or stack traces. Preserve both primary operation result and later readback error so a failed refresh cannot masquerade as a failed write.

Expected identity comes from the recorded original request, reconfirmed by the founder before recovery. Preserve the original descriptor's source identity; a new recovery APK has a different implementation identity. Record both separately. Do not replace the descriptor source with the new APK hash, accept any predecessor source, or globally weaken source checks. Verify the exact original expected source from frozen source659 and recorded evidence; unresolved source binding blocks mutation.

## 3. Explicit continuation decision table

All eligible mutations require the exact original session/ten labels/source, fresh founder confirmation, a matching read-only observation and fresh native revalidation under the gate. Use a separate resume-initialization operation; do not reuse the Initialize button. No automatic retry after an exception.

| Observed state | Allowed behavior after approval |
| --- | --- |
| Descriptor and journal absent | Report no recoverable durable initialization. Do not create a replacement automatically; a fresh initialization requires an explicit decision. |
| Only complete canonical matching session.new; journal has no published OR staged events | Revalidate and fsync the existing staged file, publish it with existing no-replace/held-identity protections, read back exact bytes, then create the one initial journal event. Never rewrite staged bytes. |
| Exact committed descriptor; no session.new; journal completely empty | Verify descriptor, then create only the missing initial event. |
| Exact committed descriptor and valid matching initialized journal; no conflicting stage | Verify and return already complete without any write. Preserve sequence/head and all existing state. |
| Any journal stage/orphan, descriptor plus stage, mismatch, malformed/partial descriptor, changed identity, invalid chain or uncertain read | Preserve and stop with a specific status. No event skipping, replacement event, stage deletion or publication under this plan. |

Important: EnrollmentStore recovery currently skips orphan stages and can expose initialized=false despite consumed events. That is NOT eligibility to call create. Continuation requires an explicitly empty journal inventory and consumedEvents=0. Recheck immediately before create. After publication or create exceptions, subsequent invocation first reconciles; it never assumes failure means no effect. A committed event followed by failed UI readback can become verified complete without another event. A retained event stage is outside this bounded recovery.

No extra recovery journal/file namespace is necessary: the original fixed descriptor/stage and first event encode progress. Preserve original coordinator intent/observations and append recovery observations in the local run evidence; successful atomic publication moves the stage rather than retaining a duplicate, with pre-publication digest/identity and post-publication verification retained. No charge refund or attempt reset.

## 4. Storage, UI and update behavior

Keep integrated 256 MiB, historical 253602084 and standalone 67108864 claims, report reservations, 64 admissions and 4096 events unchanged. Existing session.new is already materialized: do not charge a second descriptor allocation merely to rename it, and do not subtract it as a refund. Check current quotas and real free space before any genuinely new journal bytes. Preserve R01's uncertain charge and all five report identities.

The React draft may disappear on APK update. Preserve roster-observed.json as the exact original evidence; do not promise volatile draft retention. If necessary allow explicitly confirmed recovery input of the exact session and ordered labels, with no arbitrary path/source entry or product substitution. Display the proposed roster for reconfirmation and keep camera/report actions disabled until durable setup verifies. User-friendly labels can change without changing stored identity bytes.

D-066's missing full R01 report remains a disclosed limitation. Never republish R01.intent.new as a side effect. Later mandatory R02 proof remains unchanged and separately authorized; no current photo or export authority follows from recovery.

## Implementation scope and evidence

Expected changes: native publisher predicate; EnrollmentControl/Descriptor and a small reconciliation helper if justified; EnrollmentOwner setup/command routing; Kotlin bridge; native adapter/EnrollmentEntry strict status and explicit action; focused Java/C/TS tests and relevant evidence parser compatibility only if the approved response shape requires it. Do not alter model, crop, camera, dependencies, permissions, retail schema or business code.

Same agent at Sol 6.1 High implements the complete source correction, self-reviews and fixes routine defects, then sends ONE stopped handoff. No interim batch audits or second writer. Coordinator checks completed change/evidence before a build/device packet.

Required local evidence:

- Execute actual native predicate/guard code: all 31 approved final leaves; exact stages; malformed report numbers/suffixes, traversal, aliases, unrelated roots; preserved old positive/negative cases. Cross-check Java writer leaf set against C acceptance, not just copied test strings or JNI symbol presence.
- Exercise every reconciliation row, including zero/truncated/oversized/noncanonical descriptors, Unicode/exact whitespace, source/session/roster mismatch, root/file replacement, both stage and final, journal orphan/gap/invalid chain and missing vs permission-denied reads. Read-only checks assert zero writes and no operation-owner release before completion.
- Fault injection before/after descriptor rename, directory sync, initial event publication and readback; rerun reconciliation and prove no duplicate initialization, skipped orphan or rewritten evidence. Use existing real syscall seams where available; host mocks do not prove Android durability.
- Verify quota boundary/no-double-charge/no-refund behavior, R01 byte/charge preservation and zero consumption of R02-R05/capture/export allowances.
- UI/bridge strict shape and pending/error states, repeated taps, foreground/owner loss, stale observation, and exact roster reconfirmation. Relevant typecheck/lint and focused suites once; expand only for new findings.

Handoff includes frozen source identities, changed-file list, exact test commands/results, failed observations, recovery eligibility rules and unresolved limits. Preserve all source659/APK432149a0 and prior run evidence. Successful local checks are source evidence, not Android recovery acceptance.

## Execution gates and next action

1. Founder approves this bounded source correction/recovery design; same agent implements at Sol 6.1 High. This planning turn has not dispatched implementation.
2. After source verification, request one offline APK build, artifact review and data-preserving update plus bounded read-only reconciliation. Preserve device/package/signer/source identities and existing data. No camera/report actions.
3. Use the actual reconciliation result and founder's exact roster reconfirmation for ONE explicit eligible continuation. This may be approved together with step 2 only with the decision table stated explicitly; otherwise request it after observation. Unknown effects stop, never retry blindly.
4. Verify durable descriptor and journal mapping. If blocked by an ineligible state, return that specific evidence instead of widening recovery. If successful, proceed to the separately approved P2-04 physical packet; this does not itself complete P2-04.

No phone access, APK build, install, recovery mutation, new report, photo, export, Git/CI or P2-05 action occurred while preparing this plan. Workspace GLOBAL_MEMORY.md and .agents/GLOBAL_MEMORY.md were absent; repository project state, scoped brief, workflow, decisions and source supplied the task context.
