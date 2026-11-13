import pathlib,json,hashlib,datetime,subprocess
R=pathlib.Path.cwd();W=R/'apps/recognition-lab/runs/phone-experiment/p2-camera-export-c7-source-20261019-a1/writer'
F=R/'.agents/workflows/recognition-track-b.json';w=json.loads(F.read_text());now=datetime.datetime.now(datetime.timezone.utc)
assert w['lease']==json.loads((W/'charter.json').read_text())['lease'] and datetime.datetime.fromisoformat(w['lease']['expires_at'])>now
assert not (W/'writer-stopped.json').exists()
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def put(p,obj):p.write_text(json.dumps(obj,indent=2)+'\n',encoding='utf-8')
py=R/'apps/recognition-lab/runs/exploratory/e01-e03-20261004/venv/Scripts/python.exe'
subprocess.run([str(py),'-B','tools/scripts/phone-camera-export-c7-source.py','check'],check=True)
before=json.loads((W/'before-index.json').read_text());source=json.loads((W/'source-index.json').read_text());bound=json.loads((W/'runtime-binding.json').read_text())
paths={x['path'] for x in before+source};paths.add(bound['derivedSource']['path'])
after=[];changes=[];by={x['path']:x for x in before}
allowed=['CameraProofStore.java','CameraProofFiles.java','RecognitionExperimentModule.kt','CameraProofPanel.tsx','nativeAdapter.ts','recognitionExperimentCameraProofUi.test.tsx']
for path in sorted(paths):
 p=R/path;row=dict(path=path,bytes=p.stat().st_size,sha256=sha(p));after.append(row)
 if path not in by:changes.append(dict(kind='added',**row))
 elif row['sha256']!=by[path]['sha256']:
  assert p.name in allowed,path;changes.append(dict(kind='changed',beforeSha256=by[path]['sha256'],**row))
put(W/'after-index.json',after);put(W/'changed-paths.json',changes)
for folder in ['host-a3','android-a3','kotlin-a1','types-a2','lint-a2','ui-a2']:
 rows=json.loads((W/folder/'result.json').read_text());assert rows and all(x['exitCode']==0 for x in rows),folder
old=R/'apps/recognition-lab/runs/phone-experiment/p2-camera-c6-fixed-verification-20261019-a1/inputs.json'
frozen=json.loads(old.read_text())
for x in frozen:assert sha(R/x['path'])==x['sha256'],x['path']
apk=R/'apps/recognition-lab/runs/phone-experiment/p2-camera-storage-c6-build-20261018-a1/writer/recognition-camera-storage-release.apk'
assert sha(apk)=='80e717888f26091b9bd45a101b9dc548c05259238fdd4e6f18e1f9b1c2d86713'
put(W/'preservation-and-self-review.json',dict(atUtc=now.isoformat(),baselineInputs=len(before),changedOrAddedPaths=len(changes),unchangedBaselineInputs=len(before)-sum(x['kind']=='changed' for x in changes),priorCaptureEvidenceRowsVerified=len(frozen),acceptedMainApkUnchanged=True,legacyOwnerUnchanged=True,sourceIndexRows=60,sourceIndexSha256=sha(W/'source-index.json'),freshChecksPassed=['host90+188+215+134','android Java','Kotlin actual module','types','lint','UI48/five suites'],reviewMethod='coding/security/review-audit boundary review; independent coordinator review pending',residualLimits=['SAF/device not executed','full pinned-original positive export unrun','Android path/link/descriptor/sync/lifecycle not proved by mocks','picker throw can retain ownership until callback/process end','provider namespace/power-loss durability unproved'],newCaptureOrModelOrDeviceOrBuildOrExportActions=0))
report='docs/recognition/reports/PHONE_P2_03_C7_SAVED_EVIDENCE_EXPORT_SOURCE_HANDOFF_20261019.md'
suffix=w['next_action'][w['next_action'].index(' Founder explicitly deferred GitHub CI/dependency repair'):]
w['current_state']='phone-p2-03-c7-saved-evidence-export-source-stopped-for-independent-review';w['updated_at']=now.isoformat();w['status']='pending';w['lease']=None
w['completed_states'].append('phone-p2-03-c7-bounded-export-source-generated-checks-stopped')
w['next_action']='C7 writer STOPPED for coordinator High independent source/security/accounting/lifecycle audit. Read '+report+'. New source60/ef111de5, derived exporter pin separately bound. Source/generated checks only:90 export+537 existing Java assertions, Java/Kotlin compile,48 UI/protocol tests, types/lint pass. First fixture/lint failures preserved. Original55 capture evidence rows/main C6 APK preserved. No phone/build/install/picker/export/capture/model/GitCI. Geometry INCONCLUSIVE; no next physical action from source completion.'+suffix
w['evidence'].insert(0,dict(source=report,result='Approved D057 one saved-chart export implemented source-only; permanent16908288 allowance/camera251527168 sub-budget, exact profile/hash allowlist, bounded STORED ZIP/local Downloads descriptor/readback, durable one-shot sidecar/shared owner. Source60 and derivative bound; generated checks pass within host scope. Independent audit and native/provider runtime remain pending.'))
idxp=R/'.agents/workflows/index.json';idx=json.loads(idxp.read_text());idx['updated_at']=now.isoformat()
node='C:/Users/doyew/.cache/cosi-toolchain/node-v24.21.0-win-x64/node.exe'
js='const fs=require("fs"),Ajv=require("ajv/dist/2020");const a=new Ajv({strict:false});require("ajv-formats")(a);const v=a.compile(JSON.parse(fs.readFileSync(process.argv[1],"utf8")));if(!v(JSON.parse(fs.readFileSync(0,"utf8")))){console.error(v.errors);process.exit(1)}'
for schema,obj in [('workflow-state',w),('workflow-index',idx)]:subprocess.run([node,'-e',js,'.agents/schemas/'+schema+'.schema.json'],input=json.dumps(obj),text=True,check=True)
put(F,w);put(idxp,idx)
p=R/'docs/engineering/PROJECT_STATE.md';lines=p.read_text(encoding='utf-8').splitlines()
for i,line in enumerate(lines):
 if line.startswith('Current work:'):
  lines[i]='Current work: C7 approved saved-chart export SOURCE implementation STOPPED for coordinator High independent source/security/accounting/lifecycle review. New60-row source ef111de5 plus derived exporter pin;90 export/537 existing Java assertions, Java/Kotlin compile,48 UI/protocol tests, types/lint pass. Exact originals/55 prior capture evidence inputs and C6 APK preserved. See PHONE_P2_03_C7_SAVED_EVIDENCE_EXPORT_SOURCE_HANDOFF_20261019.md. No native/APK build, device/install/picker/export/capture/model action. C6 functional capture/persistence observations stand; geometry INCONCLUSIVE and G4/P2-03/later gates held. GitHub/CI deferred.';break
else:raise AssertionError('Current work absent')
p.write_text('\n'.join(lines)+'\n',encoding='utf-8')
inventory=[]
for p in sorted(W.rglob('*')):
 if p.is_file():inventory.append(dict(path=p.relative_to(W).as_posix(),bytes=p.stat().st_size,sha256=sha(p)))
put(W/'writer-evidence-inventory.json',inventory)
stop=dict(status='STOPPED',atUtc=now.isoformat(),gate='C7 source/generated only',sourceIndexSha256=sha(W/'source-index.json'),runtimeBindingSha256=sha(W/'runtime-binding.json'),beforeIndexSha256=sha(W/'before-index.json'),afterIndexSha256=sha(W/'after-index.json'),changedPathsSha256=sha(W/'changed-paths.json'),report=report,reportSha256=sha(R/report),inventorySha256=sha(W/'writer-evidence-inventory.json'),inventoryRows=len(inventory),leaseReleased=True,newPhoneBuildInstallPickerExportCaptureModelGitCiActions=0,next='Coordinator independent source/security/accounting/lifecycle audit; no build/device from this gate')
put(W/'writer-stopped.json',stop);print(json.dumps(stop))
