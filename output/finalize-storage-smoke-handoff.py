import datetime, hashlib, json, pathlib, subprocess
R=pathlib.Path.cwd()
W=R/'apps/recognition-lab/runs/phone-experiment/p2-camera-storage-smoke-c6-20261018-a1/writer'
F=R/'.agents/workflows/recognition-track-b.json'
report='docs/recognition/reports/PHONE_P2_03_STORAGE_SMOKE_C6_ARTIFACT_HANDOFF_20261018.md'
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def put(p,obj): p.write_text(json.dumps(obj,indent=2)+'\n',encoding='utf-8')
now=datetime.datetime.now(datetime.timezone.utc)
w=json.loads(F.read_text(encoding='utf-8'))
assert w['lease']['holder']=='01a1051f-0777-7573-ad09-0e550a4bd56a'
assert datetime.datetime.fromisoformat(w['lease']['expires_at'])>now
assert not (W/'writer-stopped.json').exists()
for index,count in [(W/'source-index.json',14),(R/'apps/recognition-lab/runs/phone-experiment/p2-camera-storage-c6-c1-source-20261018-a1/source-index.json',51)]:
 rows=json.loads(index.read_text()); assert len(rows)==count
 for row in rows:
  p=R/row['path']; assert p.stat().st_size==row['bytes'] and sha(p)==row['sha256'],row['path']
copies=json.loads((W/'production-copies.json').read_text());assert len(copies)==9
for row in copies:
 assert sha(R/row['production'])==row['sha256']==sha(W/row['copy'])
b=json.loads((W/'build-result.json').read_text())
assert sha(W/'storage-smoke.apk')==b['apkSha256'] and (W/'storage-smoke.apk').stat().st_size==61809
assert b['permissions']==[] and not b['executed'] and not b['installed']
for name in ['javac','jar','dex','manifest-link','align','sign','signature','zipalign','badging','manifest']:
 assert json.loads((W/(name+'.json')).read_text())['exitCode']==0,name
put(W/'final-source-preservation-check.json',dict(atUtc=now.isoformat(),sourceInputs=14,productionIndexInputs=51,exactProductionCopies=9,sourceAndApkHashesVerified=True,sdkCommandReceipts=10,deviceExecuted=False))
suffix=w['next_action'][w['next_action'].index(' Founder explicitly deferred GitHub CI/dependency repair'):]
w['current_state']='phone-p2-03-c6-storage-smoke-artifact-stopped-for-independent-review'
w['status']='pending';w['updated_at']=now.isoformat();w['lease']=None
w['completed_states'].append('phone-p2-03-c6-storage-smoke-local-artifact-static-stopped')
w['next_action']='Gate B writer STOPPED. Coordinator independently reviews concrete 61809-byte storage-smoke APK6df4ae96...72e118, source14/444301a9, exact production51/edaab3d4 and native7656/c3549552; source/static scope only. Read '+report+'. After acceptance request explicit founder separate-package install/run/restart approval and bounded device execution packet. No ADB/install/main data/recovery/camera/model/CI/Git executed. Original phone-verification request remains active.'+suffix
w['evidence'].insert(0,dict(source=report,result='Concrete separate permissionless APK prepared; exact native reuse and nine production Java copies, source14/production51 hashes and10 SDK receipts verified. Five ZIP entries include explicitly parsed empty AAPT resources table; initial checker error preserved. Ten planned generated cases not executed. Install approval absent; independent review pending.'))
idxp=R/'.agents/workflows/index.json';idx=json.loads(idxp.read_text());idx['updated_at']=now.isoformat()
node='C:/Users/doyew/.cache/cosi-toolchain/node-v24.21.0-win-x64/node.exe'
js='const fs=require("fs"),Ajv=require("ajv/dist/2020");const a=new Ajv({strict:false});require("ajv-formats")(a);const v=a.compile(JSON.parse(fs.readFileSync(process.argv[1],"utf8")));if(!v(JSON.parse(fs.readFileSync(0,"utf8")))){console.error(v.errors);process.exit(1)}'
for schema,obj in [('workflow-state',w),('workflow-index',idx)]:
 subprocess.run([node,'-e',js,'.agents/schemas/'+schema+'.schema.json'],input=json.dumps(obj),text=True,check=True)
ps=R/'docs/engineering/PROJECT_STATE.md';text=ps.read_text(encoding='utf-8');lines=text.splitlines()
for i,line in enumerate(lines):
 if line.startswith('Current work:'):
  lines[i]='Current work: Gate B permissionless storage-smoke APK61809 bytes/6df4ae96...72e118 built and statically checked; writer STOPPED for coordinator independent source/artifact review. Exact accepted native7656 bytes/c3549552 reused, nine exact production Java copies; ten generated cases planned, none executed. See PHONE_P2_03_STORAGE_SMOKE_C6_ARTIFACT_HANDOFF_20261018.md. Separate-package install/run/restart needs explicit founder approval after review. Gate A main APK80e71788...86713 remains held; installed main app C5 and old phone group unchanged. Phone-verification request active; camera/P2/GitHub/CI gates held.';break
else: raise AssertionError('Current work missing')
ps.write_text('\n'.join(lines)+'\n',encoding='utf-8');put(F,w);put(idxp,idx)
inventory=[dict(path=p.relative_to(W).as_posix(),bytes=p.stat().st_size,sha256=sha(p)) for p in sorted(W.rglob('*')) if p.is_file()]
put(W/'writer-evidence-inventory.json',inventory)
stop=dict(status='STOPPED',atUtc=now.isoformat(),gate='B local source/artifact/static preparation only',apkSha256=b['apkSha256'],apkBytes=b['apkBytes'],sourceIndexSha256=sha(W/'source-index.json'),reviewedProductionSourceSha256=b['reviewedProductionSourceSha256'],nativeSha256=b['nativeSha256'],staticHelperBindingSha256=sha(W/'static-helper-binding.json'),report=report,reportSha256=sha(R/report),inventorySha256=sha(W/'writer-evidence-inventory.json'),inventoryRows=len(inventory),leaseReleased=True,productionSourceChanges=False,deviceExecuted=False,installed=False,installApproval=False,cameraOrModelExecuted=False,dependencyCiGitChanges=False,next='Coordinator independent source/static audit, then explicit founder separate-package approval and bounded device packet')
put(W/'writer-stopped.json',stop)
print(json.dumps(stop))
