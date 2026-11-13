import pathlib,json,hashlib,datetime,subprocess,importlib.util
R=pathlib.Path.cwd();W=R/'apps/recognition-lab/runs/phone-experiment/p2-camera-export-c7-build-20261019-a1/writer';F=R/'.agents/workflows/recognition-track-b.json'
def read(p):return json.loads(p.read_text(encoding='utf-8'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def put(p,o):p.write_text(json.dumps(o,indent=2)+'\n',encoding='utf-8')
now=datetime.datetime.now(datetime.timezone.utc);w=read(F);assert w['lease']==read(W/'charter.json')['lease'] and datetime.datetime.fromisoformat(w['lease']['expires_at'])>now and not (W/'writer-stopped.json').exists()
s=importlib.util.spec_from_file_location('build',R/'tools/scripts/phone-camera-export-c7-build.py');g=importlib.util.module_from_spec(s);s.loader.exec_module(g);g.preserve()
apk=W/'recognition-camera-export-release.apk';built=read(W/'built-apk.json');assert sha(apk)==built['sha256']=='4eee45f910ff9cc1ceb127f8707d5a4420c0c1b743982019f60e0556326b6827'
build=read(W/'gradle-release.json');assert build['exitCode']==0 and not build['timedOut']
source=read(W/'source-index.json');staged=read(W/'stage-source-index.json');old=read(W/'old-stage-source-before.json')
frozen=read(R/'apps/recognition-lab/runs/phone-experiment/p2-camera-c6-fixed-verification-20261019-a1/inputs.json')
for x in frozen:assert sha(R/x['path'])==x['sha256']
put(W/'final-preservation.json',dict(atUtc=now.isoformat(),sourceRows=len(source),stageSourceRows=len(staged),oldC6StageSourceRows=len(old),captureEvidenceRowsVerified=len(frozen),allSourceAndStageBindingsReverified=True,productionChanges=False,apkBuilds=1,deviceActions=0,exportOrCaptureOrModel=0,staticStatus='INCOMPLETE_RESOURCE_DELTA_REVIEW_REQUIRED'))
report='docs/recognition/reports/PHONE_P2_03_C7_BUILD_STATIC_HANDOFF_20261019.md'
text=f'''# C7 APK built; static acceptance withheld — stopped handoff

Founder-approved one-build/static slice. Mode: build/static only. One offline
signed release succeeded in9m48s,322 tasks/294 executed/28up-to-date. Actual child
deadline1200seconds, timedOut:false, exit0. No rebuild, source fix, phone/ADB,
installation, launch, picker, export, capture/model, radio/dependency or Git/CI.

## Exact reviewable artifact

APK apps/recognition-lab/runs/phone-experiment/p2-camera-export-c7-build-20261019-a1/writer/recognition-camera-export-release.apk
SHA256 {sha(apk)}; size{apk.stat().st_size}bytes.
Source60 ef111de532d7787b4d44d89340f34eb3b8987278b6d9add454ce74261f8bcb84.
Derived exporter source6458e69dc894f0fb3ac69a3a7966d96f6e42ba8e315f9fe9e39a17972761cf30.
Build inputs{sha(W/'build-inputs.json')}.
Original C6 APK80e717888f26091b9bd45a101b9dc548c05259238fdd4e6f18e1f9b1c2d86713
and legacy source owner36004274...b9d0e remain distinct/unchanged.

Fresh roots checked absent. Cloned1015 preserved C6 stage source inputs,
refreshed40 reviewed source rows including the separately bound derivative;
new stage1023 source rows. Source60, derived constant, helper/Metro/init inputs,
old stage source1015 and55 original capture-evidence rows reverified after build.
Scope excludes generated/shared build caches; no claim that every cache byte is
immutable. Old stage source, old APK/STOP/indices and original chart remain intact.

## Completed static observations and retained failures

Official signature check passes: same internal certificate
48550aec63c2b09f7746775002fbc93c3c2ceb95bc388be59e95bcd26a7e2d83.
Official ZIP16KiB alignment and badging SDK/ABI checks pass. Manifest byte-exact
C6, same package/min24/target36/ARM64 and permission/component/network/backup
surface. Both DEX files parsed, forbidden dependency types/test-harness references
checked; JNI retained signature count1. Fixed18 native-library names, all ELF/ZIP
alignment and byte-equality outside GNU build IDs pass in the second checker.
Model/assets are exact except the expected bundle/generated ART profiles; ART
profiles and actual release bundle equal generated build outputs. Four R8 service
interfaces/providers/order are semantically identical, with mappings tied to APK
DEX pg-map IDs. Detailed generated-only delta list is payload-deltas-after-a2.json.

First checker stopped on an extra *whole-file* JNI adapter hash assertion after
its preceding exact-outside-build-ID comparison had passed. Independent binary
counterexample proves its7656bytes differ only within the20-byte GNU build ID;
old SHA c354955263c1d84280ace86bdec8aac8f30f0fbd12630611a7226a875d493e63,
new SHA a016a7e281e0309845dc2a1c7d19fe1d03d831eacb297ff0fbcb36c3a2f21dcf.
All offsets/IDs/canonical hash are in adapter-build-id-counterexample.json. A fresh
static-a2 helper applies the packet's approved build-ID-only criterion to that
adapter too; original helper/failure remain immutable, supplemental helper and
same APK are separately hash-bound. No native code or APK rebuild occurred.

The second checker then stopped at the overall payload-delta guard because
resources.arsc changed. That guard was NOT relaxed and no third checker ran.
The complete decoded resource tables from cached SDK aapt2 show exactly one
value difference, same resource ID/name:

0x7f0d0054 string/react_native_dev_server_ip
C6:192.168.1.3; C7:192.168.1.13.

resources.arsc length remains351080bytes. Old SHA
a673d93b01f616a4fbb40460f47897ddbe036790dd9f4f020710a1580b585e75;
new SHA0bd96545786bc462ef63da59f4f5d56068021f46dcfaa93bb458bd9517264190.
resource-semantic-diff.txt is the sole decoded value diff; resources-values-c6.json
and resources-values-c7.json retain full official output/commands/exit0. The first
CLI probe incorrectly supplied --values (unsupported); its exit1/help receipts
are preserved. Cached aapt2 emits values by default; the corrected invocation
adds no suppression/filter. No resource/source/configuration was changed.

Cause is visible in installed React Native Gradle source:
node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/src/main/kotlin/com/facebook/react/utils/AgpConfiguratorUtils.kt
configureDevServerLocation uses project property reactNativeDevServerIp, otherwise
getHostIpAddress(), and writes this defaultConfig resource. This is an environment
generated value, not a C7 source edit. Network permission surface is unchanged,
but its runtime reachability/acceptability has NOT been independently concluded
here. No suppression, blanket resource exception, IP pin or second build applied.

## Incomplete checks and decision requested

Static acceptance is WITHHELD. Post-guard checks did not run: final current-vs-C6
dependency-coordinate equality, actual DEX exporter/legacy pin assertions, full
readelf dynamic/import/version inspection and Metro/source-map startup closure.
Preflight did verify391 cached external artifact rows (including repeated scopes),
but that is not a substitute for final post-build equality. No static-review.json
success record or fabricated complete inventory was produced. Initial/supplemental
checker failures and all successful partial receipts are retained.

STOP for coordinator High artifact review and a concrete decision on the single
auto-detected React Native resource difference. Determine its consumer/release
reachability and whether a narrowly proved generated-resource criterion is
acceptable, or whether a separately approved deterministic config/build is needed.
No permission to silently normalize resources or retry a build is inferred.

No physical update/startup/SAF/readback/original-positive export or geometry result.
C7 source acceptance stands within its scope; P2-03/G4/later and GitHub/CI remain
held/deferred. Source ownership is released; this writer will not install/export
or continue artifact acceptance until the coordinator returns a reviewed packet.
'''
(R/report).write_text(text,encoding='utf-8')
suffix=w['next_action'][w['next_action'].index(' Founder explicitly deferred GitHub CI/dependency repair'):]
w['current_state']='phone-p2-03-c7-apk-built-static-incomplete-resource-delta-stopped';w['status']='pending';w['updated_at']=now.isoformat();w['lease']=None
w['completed_states'].append('phone-p2-03-c7-one-offline-build-complete-static-resource-delta-stopped')
w['evidence'].insert(0,dict(source=report,result='One offline signed APK4eee45f9...6b6827 built; static acceptance WITHHELD. Signature/manifest/18ELF and service checks pass; JNI-only GNU build-ID counterexample retained. Guard then finds resources.arsc single RN generated dev-server IP192.168.1.3->.13; full decoded diff retained. No third checker/build/source or phone action.'))
w['next_action']='C7 writer STOPPED, lease released. Coordinator High must review exact APK4eee45f9...6b6827 and single generated RN development-server resource IP delta before remaining static checks or any new config/build. Read '+report+'. Source60/derived/stage/old capture preserved; full static acceptance incomplete, no device/export/capture/model/GitCI.'+suffix
idxp=R/'.agents/workflows/index.json';idx=read(idxp);idx['updated_at']=now.isoformat();node='C:/Users/doyew/.cache/cosi-toolchain/node-v24.21.0-win-x64/node.exe'
js='const fs=require("fs"),Ajv=require("ajv/dist/2020");const a=new Ajv({strict:false});require("ajv-formats")(a);const v=a.compile(JSON.parse(fs.readFileSync(process.argv[1],"utf8")));if(!v(JSON.parse(fs.readFileSync(0,"utf8")))){console.error(v.errors);process.exit(1)}'
for schema,obj in [('workflow-state',w),('workflow-index',idx)]:subprocess.run([node,'-e',js,'.agents/schemas/'+schema+'.schema.json'],input=json.dumps(obj),text=True,check=True)
put(F,w);put(idxp,idx)
p=R/'docs/engineering/PROJECT_STATE.md';lines=p.read_text(encoding='utf-8').splitlines()
for i,line in enumerate(lines):
 if line.startswith('Current work:'):
  lines[i]='Current work: C7 ONE offline signed APK4eee45f910ff9cc1ceb127f8707d5a4420c0c1b743982019f60e0556326b6827 built successfully, static acceptance WITHHELD; writer STOPPED for coordinator High review. JNI-only build-ID difference proved; next guard found sole decoded resources.arsc RN generated dev-server IP192.168.1.3->192.168.1.13. No config/guard relaxation, third checker or second build. See PHONE_P2_03_C7_BUILD_STATIC_HANDOFF_20261019.md. Source60/derived/stage/original55 evidence preserved; no phone/install/export/capture/model. Geometry/P2-03/G4/later held; GitHub/CI deferred.';break
else:raise AssertionError('Current work absent')
p.write_text('\n'.join(lines)+'\n',encoding='utf-8')
inventory=[dict(path=p.relative_to(W).as_posix(),bytes=p.stat().st_size,sha256=sha(p)) for p in sorted(W.rglob('*')) if p.is_file()]
put(W/'writer-evidence-inventory.json',inventory)
stop=dict(status='STOPPED',atUtc=now.isoformat(),gate='C7 one offline build/static',buildResult='PASS_ONE_OFFLINE_RELEASE',staticResult='INCOMPLETE_RESOURCE_DELTA_REVIEW_REQUIRED',apkSha256=sha(apk),apkBytes=apk.stat().st_size,sourceIndexSha256=sha(W/'source-index.json'),buildInputSha256=sha(W/'build-inputs.json'),report=report,reportSha256=sha(R/report),inventorySha256=sha(W/'writer-evidence-inventory.json'),inventoryRows=len(inventory),leaseReleased=True,builds=1,phoneInstallExportCaptureModelGitCiActions=0,next='Coordinator High decides single generated RN resource delta and remaining static scope; no device effect')
put(W/'writer-stopped.json',stop);print(json.dumps(stop))
