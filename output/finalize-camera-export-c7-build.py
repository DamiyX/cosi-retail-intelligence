import pathlib,json,hashlib,datetime,subprocess,importlib.util
R=pathlib.Path.cwd();W=R/'apps/recognition-lab/runs/phone-experiment/p2-camera-export-c7-build-20261019-a1/writer'
F=R/'.agents/workflows/recognition-track-b.json'
def read(p):return json.loads(p.read_text(encoding='utf-8'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def put(p,obj):p.write_text(json.dumps(obj,indent=2)+'\n',encoding='utf-8')
now=datetime.datetime.now(datetime.timezone.utc);w=read(F);assert w['lease']==read(W/'charter.json')['lease'] and datetime.datetime.fromisoformat(w['lease']['expires_at'])>now;assert not (W/'writer-stopped.json').exists()
spec=importlib.util.spec_from_file_location('c7build',R/'tools/scripts/phone-camera-export-c7-build.py');g=importlib.util.module_from_spec(spec);spec.loader.exec_module(g);g.preserve()
build=read(W/'gradle-release.json');assert build['exitCode']==0 and not build['timedOut']
static=read(W/'static-review.json');apk=W/'recognition-camera-export-release.apk';assert sha(apk)==static['apkSha256']
assert sha(W/'source-index.json')=='ef111de532d7787b4d44d89340f34eb3b8987278b6d9add454ce74261f8bcb84'
frozen=read(R/'apps/recognition-lab/runs/phone-experiment/p2-camera-c6-fixed-verification-20261019-a1/inputs.json')
for x in frozen:assert sha(R/x['path'])==x['sha256']
nativeChanges=[x for x in static['nativeLibraries'] if not x['identicalToC6']]
source=read(W/'source-index.json');staged=read(W/'stage-source-index.json');old=read(W/'old-stage-source-before.json');deps=read(W/'dependency-and-capture-precheck.json')
put(W/'final-preservation.json',dict(atUtc=now.isoformat(),sourceRows=len(source),stagedRows=len(staged),oldC6StageSourceRows=len(old),frozenCaptureRows=len(frozen),sourceAndStageAndOldInputsReverified=True,oldStagePreservationScope='hash-bound source inputs; build/node_modules caches excluded by reviewed stage grammar',productionEdits=False,deviceOrExportExecuted=False,dependencyCiGitChanges=False))
report='docs/recognition/reports/PHONE_P2_03_C7_BUILD_STATIC_HANDOFF_20261019.md'
text=f'''# C7 offline APK build/static handoff — STOP for independent review

Founder-approved build/static slice only. One cached offline signed release; no
phone/ADB/install/launch/picker/export/capture/model/radio/dependency/Git/CI effect.
Source acceptance stands within its separate scope; physical geometry remains
INCONCLUSIVE. Neither this artifact nor its static checks accept P2-03/G4.

## Exact artifact and provenance

APK: `{apk.relative_to(R).as_posix()}`
SHA256: {sha(apk)}
Size: {apk.stat().st_size}bytes.
Source/check60: ef111de532d7787b4d44d89340f34eb3b8987278b6d9add454ce74261f8bcb84.
Derived exporter source:6458e69dc894f0fb3ac69a3a7966d96f6e42ba8e315f9fe9e39a17972761cf30.
Build input binding:{sha(W/'build-inputs.json')}.
Static review:{sha(W/'static-review.json')}.
Original capture/C6 APK80e717888f26091b9bd45a101b9dc548c05259238fdd4e6f18e1f9b1c2d86713
and legacy ownership36004274...b9d0e remain distinct from C7 exporter provenance.

## Preparation and one build

Verified fresh roots absent, source60 and deterministic derivative before copy.
Cloned {len(old)} preserved C6 stage source inputs into a new shadow, then refreshed
only reviewed C7 inputs plus separately bound derivative. Staged index contains
{len(staged)} rows. Existing package/camera derivative, native source, permissions,
autolinking, models/assets and dependency inputs retained. Before/after preservation
checks cover those source inputs, not a claim that shared generated build caches
are immutable. Original C6 stage owned source/old APK and55 saved capture inputs
were rehashed unchanged. Helpers/Metro observer/init/charter are bound separately.

Build receipts record actual child PID/command and1200second deadline. Started
{build['startedUtc']}, ended{build['endedUtc']}, exit0, timedOut:false. Signing
uses the existing internal signer via child environment; credentials are redacted
from logs and cleared from the helper environment. No download or extra build.
No production-source repair or failed-build retry was performed in this slice.

## Static evidence actually checked

Same internal certificate48550aec63c2b09f7746775002fbc93c3c2ceb95bc388be59e95bcd26a7e2d83,
manifest byte-exact C6: same package, min24/target36/ARM64, permission/component/
network/backup/isolation surface. Official signer/badging/ZIP alignment checks pass.
All18 native libraries retain16KiB ELF/ZIP alignment; native adapter c3549552...93e63
is exact C6. Other differences listed in static-review are GNU build-ID bytes only:
{json.dumps([x['path'] for x in nativeChanges])}.
JNI export/retained method signature, SDK24 note, libdl/libm/libc dependencies and
absence of a direct renameat2 import checked. No new native library or runtime.

{static['zipPayloads']} ZIP payloads and{len(static['dex'])} DEX files inspected.
Exporter/legacy pins and bridge names found in actual DEX; forbidden dependency
definitions/types and test harness types absent. Actual release bundle
matches generated Hermes bytes; graph{static['metroModules']} modules plus
{static['metroPremodules']} premodules and source-map closure verified against
source hashes; ExpoAsset/eager camera-barrel bootstrap is absent from that graph.
This is packaged startup closure, not a device-startup result.

Model/licence/assets exact C6 except reviewed JS bundle and generated ART profiles.
ART bytes match actual build outputs. Every payload delta enumerated in static
review/apk-inventory; R8 service paths normalized through old/new mappings tied to
APK DEX map IDs, with exactly the same four interfaces/providers/order. No wildcard
payload exception or resource relaxation. Resources and other payloads remain
byte-exact unless specifically enumerated by those guards. External dependency
coordinate/scope/artifact hashes match C6; preflight checked
{deps['scopedExternalArtifactRowsVerified']} cached artifact rows (including repeated
scope rows), distinct coordinate keys compared again after build.

Changed payload paths:
{json.dumps(static['changedPayloads'],indent=2)}

## Limits and requested decision

No fresh source unit/UI acceptance is substituted for the earlier independent627
Java/48 app checks. This slice ran actual release compilation/packaging and static
checks only. Actual SAF local selection/rw/no-truncate/descriptor/readback/sync,
Activity lifecycle, installed update/startup and the original pinned-byte positive
export are still unexecuted. Conservative one-attempt and retained-owner limits,
SDK cache/RAM and cold-render uncertainties remain. No new geometry measurement,
photo or model call; no permission-denial or full camera-matrix acceptance.

Writer STOPPED and lease released. Coordinator independent exact artifact/static
review requested before any separately bounded data-preserving installation/export
packet. Original chart job remains the only eligible saved export target; no new
capture presumed needed. P2-04/later gates and GitHub/CI repair remain held/deferred.
'''
(R/report).write_text(text,encoding='utf-8')
suffix=w['next_action'][w['next_action'].index(' Founder explicitly deferred GitHub CI/dependency repair'):]
w['current_state']='phone-p2-03-c7-offline-apk-static-stopped-for-independent-review';w['status']='pending';w['updated_at']=now.isoformat();w['lease']=None
w['completed_states'].append('phone-p2-03-c7-offline-signed-apk-static-writer-stopped')
w['evidence'].insert(0,dict(source=report,result='One offline C7 signed APK '+sha(apk)+'; source60/derived/stage/old preservation bound. Signature/manifest/ZIP/18ELF/native/dependency/assets/DEX/Metro/service semantics verified. No physical/export acceptance.'))
w['next_action']='C7 build/static writer STOPPED. Coordinator independent exact signed APK/source/static audit required. Read '+report+'. No phone/install/export/capture/model/GitCI occurred; geometry INCONCLUSIVE and all later gates held.'+suffix
idxp=R/'.agents/workflows/index.json';idx=read(idxp);idx['updated_at']=now.isoformat();node='C:/Users/doyew/.cache/cosi-toolchain/node-v24.21.0-win-x64/node.exe'
js='const fs=require("fs"),Ajv=require("ajv/dist/2020");const a=new Ajv({strict:false});require("ajv-formats")(a);const v=a.compile(JSON.parse(fs.readFileSync(process.argv[1],"utf8")));if(!v(JSON.parse(fs.readFileSync(0,"utf8")))){console.error(v.errors);process.exit(1)}'
for schema,obj in [('workflow-state',w),('workflow-index',idx)]:subprocess.run([node,'-e',js,'.agents/schemas/'+schema+'.schema.json'],input=json.dumps(obj),text=True,check=True)
put(F,w);put(idxp,idx)
p=R/'docs/engineering/PROJECT_STATE.md';lines=p.read_text(encoding='utf-8').splitlines()
for i,line in enumerate(lines):
 if line.startswith('Current work:'):
  lines[i]='Current work: C7 ONE offline signed APK '+sha(apk)+' built/static-checked; writer STOPPED for coordinator independent exact artifact audit. Source60/derived pin/stage and old capture bindings preserved; manifest/dependencies/assets and18 native-library surface verified, DEX/bundle/Metro/R8 service changes attributed. See PHONE_P2_03_C7_BUILD_STATIC_HANDOFF_20261019.md. No phone/install/picker/export/capture/model action. Quantitative geometry INCONCLUSIVE; P2-03/G4/later held, GitHub/CI deferred.';break
else:raise AssertionError('Current work missing')
p.write_text('\n'.join(lines)+'\n',encoding='utf-8')
inventory=[dict(path=p.relative_to(W).as_posix(),bytes=p.stat().st_size,sha256=sha(p)) for p in sorted(W.rglob('*')) if p.is_file()]
put(W/'writer-evidence-inventory.json',inventory)
stop=dict(status='STOPPED',atUtc=now.isoformat(),gate='C7 one offline build/static only',apkSha256=sha(apk),apkBytes=apk.stat().st_size,sourceIndexSha256=sha(W/'source-index.json'),buildInputSha256=sha(W/'build-inputs.json'),staticReviewSha256=sha(W/'static-review.json'),report=report,reportSha256=sha(R/report),inventorySha256=sha(W/'writer-evidence-inventory.json'),inventoryRows=len(inventory),leaseReleased=True,builds=1,phoneInstallExportCaptureModelGitCiActions=0,next='Coordinator independent exact artifact audit; no device effect from this build gate')
put(W/'writer-stopped.json',stop);print(json.dumps(stop))
