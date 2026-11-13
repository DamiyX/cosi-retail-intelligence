# C9 host workflow-size blocker — confirmed encoding cause and repair

2026-10-23. Coordinator High diagnosis/local task-state repair. No camera or
phone failure. A2 stopped inside helper live() before any ADB/phase intent because
real workflow bytes exceeded its1048576-byte cap. All12 A2 evidence files, STOP
01966f46...9c0c and evidence-index ed57da24...0c10 independently rehashed.

Current workflow had subsequently reached4087478bytes. Seven historical text
values contained15 generations of reversible UTF-8 bytes interpreted as Windows
1252. Each field was255k characters but restored to50–771 characters. Encoding
growth is confirmed by exact inverse at every transformation, full inverse to
the original string, and unchanged object/array structure. This explains why
small generated fixtures passed while the actual workflow failed its bound.
The exact earlier writer invocation that introduced each generation was not
traced; do not attribute a specific write without evidence.

Preserved full original workflow and repair script/result under
apps/recognition-lab/runs/phone-experiment/c9-workflow-encoding-repair-20261023-a1/.
Before SHA d97fa96cc2168d2abb49a1acb830209a0c2191986907c0fd8e7e40de25f73939.
After reversible repair:107008bytes, SHA
6c160fbb45d6e1f1aff8d2f5a8110a7589d98a7b5e7dcab2e252520841b2dbde.
Every history record, approval, blocker, gate and evidence row retained; no
history compaction, deletion, data reset or helper-cap increase. Active state/
lease/owner and paths unchanged during encoding repair.

Candidate passes installed Ajv2020 workflow schema; format validation disabled,
not a new timestamp-format claim. Actual unchanged helper load rejects archived
oversize bytes and accepts repaired real workflow at the original1MiB bound.
Fresh103 regression/preservation assertions include83 source/six protected/ten
helper-index hashes and stable UTF-8/Windows1252 parse/serialize roundtrips.
No phone command, production/helper/build/dependency change or CI/Git effect.

Prevention for this task: parse workflow bytes as JSON or read explicit UTF-8;
serialize as ensure_ascii=True and explicit UTF-8. ASCII JSON preserves original
Unicode meaning and cannot acquire this mojibake merely through Windows1252
reading. Never use implicit Windows text decoding for workflow/state updates.
Keep size guard; do not solve recurrence by raising it. Original evidence roots
remain immutable. This repairs task continuity, not app code or geometry.

Continuation: same Track B Sol6.1 Low, NEW
p2-camera-export-c9-device-20261023-a3/writer/, unchanged accepted helpers/real
numerical and newest founder wireless config from c9-wireless-reconnect root.
Exact original phase A commands only: preflight/update/launch, fresh identity/
unlocked-own-app/idle checks and single-effect intents. Prior a1/a2 remain stopped
and are never replayed. A2 had no device/phase intent, so no install is repeated.
Finite lease <=30minutes, fresh charter hashes, stop on first unexpected result;
no reconnect/pair/daemon/radio/unlock/source repair at Low. Stop/direct handoff
before begin-export/picker/Save/transfer. No new photo. P2-04 plan saved but gated
by P2-03, P2-05 separate future planning, CI repair deferred.
