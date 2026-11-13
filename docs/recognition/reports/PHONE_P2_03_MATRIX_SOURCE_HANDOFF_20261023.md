# P2-03 matrix: main takeover and device readiness

2026-10-23. Founder paused Track B's interrupted source turn. Main observed that
chat idle, preserved its19 changed/new source/test paths and took direct ownership.
It had implemented substantial code, not just documentation. Main did not restart
the task or resume the paused agent. Evidence root:
apps/recognition-lab/runs/phone-experiment/p203-matrix-main-finish-20261023-a1/.

Main completed the source fingerprint and refused an unbound fingerprint at
runtime. Actual Android build exposed two Nothing-inferred legacy bridge
declarations; explicit Promise rejection corrected compilation. Review also
removed a new vibration call because this CAMERA-only artifact has no VIBRATE
permission. Actual own-app XML then exposed clipped bottom controls/status;
the matrix controls now scroll independently of the preview. No permission was
added. These are concrete implementation/layout corrections, not camera retakes.

Evidence:489 focused native assertions and Android Java compilation passed;
builder's previous types/lint/81 UI tests are retained. After the UI correction,
fresh16 matrix protocol/UI tests passed. One broad legacy generated filesystem
test timed out previously and its surviving count loop was stopped by main;
that incomplete test is not a pass. Failed/stopped builds and changed staged
inputs are preserved, with separate corrected build receipts. No assertions or
native acceptance limits were weakened.

Final source index121 rows SHA256:
909679a3b3b6a1636f742fbe2ff3f344a66ad64cc368771d26b89f57fa81b7ae.
Final offline build/static evidence:
p203-matrix-main-build-20261023-r4/writer/ under phone-experiment.
APK39967626 bytes, SHA256:
0d0fd36ba3e4c03f79c5b98e9a122b5d63f767645db4a8e151590e73d41f23e3.
Signature/16KiB ZIP alignment pass; manifest is byte-identical to accepted C9,
model unchanged,18 ARM64 native payloads unchanged apart from GNU build IDs.
APK delta23584 bytes is not an installed-size or RAM measurement.

Both reviewed artifact revisions were installed once each, preserving UID10264
and the existing sandbox. The final installed APK hash was read back and matched.
Actual final native UI status after one read-only Inspect and scrolling confirms:
source/APK match, idle=true, next=D01-DENIED, CAMERA currently granted,
captureCount6, ownedBytes=claimedBytes4356993. No new SDK capture, permission
observation, export or Save occurred. All12 approved slots remain unused.

Next: founder manually selects Camera -> Don't allow for the isolated app named
Recognition Generated Probe, then returns to it. Main observes D01; no photo for
this checkpoint. The founder action question is pending. Physical controls/eight
geometry rows, export/numerical audit and resource observations remain open.
Held-callback controls cannot prove native-in-flight/hardware cancellation;
SDK producer/RAM hard caps remain unproved under D-054. No automatic promotion
to complete P2-03. P2-04 remains held; P2-05/CI repair remain deferred.

## D01 corrective update — October23

Founder denied CAMERA correctly. D01 first initialization failed because the
legacy native publisher allowed UUID camera-group roles but rejected matrix
metadata names. Host tests missed this native integration. No new SDK slot or
permission checkpoint was consumed. The failed348-byte owner.new remains intact.
Main corrected only the40 fixed names under the exact corrective matrix root,
preserving native UID/inode/no-follow/no-replace/fsync guards. The old initializer
has an exact-profile check and4096-byte reserve inside the existing192KiB budget.
No capture/storage/permission/dependency limit increased; paused agent stays idle.

Fresh144 production-C guard checks,495 focused host assertions, Android Java
compilation and16 protocol/UI tests pass. Offline Android build passed. APK
b83a2b2d6cc744345c46106c3d76c9c1a52eddddeecb7c2535394230f3512674
(39984038 bytes) passed signature/manifest/model/native-export/16KiB checks and
was installed once preserving UID10264. Only the reviewed publisher has a native
payload change; other native payloads match apart from build IDs.

Actual corrected app source/APK readback and D01 persistence pass: next
D02-GRANTED-RESTORED, permission=false, idle=true, historical count6 and4356993
bytes unchanged, retained initializer348 bytes verified. All12 new SDK attempts
remain unused. Founder restoration question pending; no new photo/export/model
run. Evidence: p203-matrix-publication-fix-20261023-a1 and
p203-matrix-publication-build-20261023-a1/writer under phone-experiment runs.
