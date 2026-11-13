import pathlib,json,hashlib,datetime,subprocess
R=pathlib.Path.cwd(); base=R/'apps/recognition-lab/runs/phone-experiment'
A=base/'p2-camera-c6-capture-20261018-a1';B=base/'p2-camera-c6-capture-resume-20261019-a1';W=base/'p2-camera-c6-fixed-verification-20261019-a1'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def read(p):return json.loads(p.read_text(encoding='utf-8'))
def put(p,o):p.write_text(json.dumps(o,indent=2)+'\n',encoding='utf-8')
now=datetime.datetime.now(datetime.timezone.utc);f=R/'.agents/workflows/recognition-track-b.json';w=read(f)
assert w['lease']['holder']=='01a1051f-0777-7573-ad09-0e550a4bd56a' and datetime.datetime.fromisoformat(w['lease']['expires_at'])>now
assert not W.exists();W.mkdir()
rows=read(B/'evidence-index.json')
for x in rows:
 p=B/x['path'];assert sha(p)==x['sha256'] and p.stat().st_size==x['bytes'],x['path']
idx=R/'apps/recognition-lab/runs/phone-experiment/p2-camera-storage-c6-c1-source-20261018-a1/source-index.json'
assert sha(idx)=='edaab3d41029fb6a72f0fc72f8190633b2b7c17a450545ca49df13f04364335d'
for x in read(idx):assert sha(R/x['path'])==x['sha256'],x['path']
r=read(A/'numerical-receipt.json');v=read(A/'receipt-validation.json');s=read(B/'saved-status.json');b=read(B/'result.json');t=read(A/'ticket.json')
assert r['jobId']==t['jobId']==v['jobId']==b['captureJob']=='9d763e82-2a00-42ce-9a5f-0f4b2d9fde5c'
assert v['valid'] and len(r['rawVector'])==len(r['normalizedVector'])==1024
assert [r['width'],r['height'],r['orientation'],r['jpegBytes']]==[1440,1080,6,640843]
assert r['effectiveBox']==[64,192,1016,1248] and r['geometryStatus']=='INCONCLUSIVE' and not r['physicalFovProven'] and not r['cameraProofAccepted']
assert r['modelSha256']==s['modelSha256']=='bbbb4c51a55a53905af1daec995ca1aae355046f8839bb8c9f5ce9271394bc40'
assert r['recipe']==s['recipe'] and r['sourceSha256']==s['sourceSha256']==t['sourceSha256']
assert b['originalCapturePid']!=b['reopenPid'] and b['newCapturesOnResume']==0 and b['forcedRestartsOnResume']==0
assert s['activeJob'] is None and s['interruptedStorage']==[] and s['captureCount']==2 and s['ownedBytes']==s['claimedBytes']==863381
apk=R/'apps/recognition-lab/runs/phone-experiment/p2-camera-storage-c6-build-20261018-a1/writer/recognition-camera-storage-release.apk'
assert sha(apk)=='80e717888f26091b9bd45a101b9dc548c05259238fdd4e6f18e1f9b1c2d86713'
inputs=[]
for d in [A,B]:
 for p in sorted(d.rglob('*')):
  if p.is_file():inputs.append(dict(path=p.relative_to(R).as_posix(),bytes=p.stat().st_size,sha256=sha(p)))
put(W/'inputs.json',inputs)
put(W/'fixed-check-result.json',dict(atUtc=now.isoformat(),savedResumeInventoryVerified=len(rows),reviewedSourceRows=51,acceptedApkHashVerified=True,receiptTicketStatusBindings=True,existingValidatorReceiptValid=True,vectorDimensions=[1024,1024],newProcessStatusConsistent=True,qualitativeOrientation='upright UP and LEFT cues; all eight markers visible in preview and candidate',geometryStatus='INCONCLUSIVE',missingEvidence=['independent preview and upright original JPEG landmark coordinates','annotation uncertainty <=2 physical pixels','measured <=1 percent registration residual and <=1 source pixel crop rounding','observed screen scale/motion/FOV correspondence'],rawJpegOrTensorExportAvailable=False,newMeasurementMethod=False,newDeviceCommands=0,newCaptureOrModelCalls=0))
report='docs/recognition/reports/PHONE_P2_03_C6_FIXED_VERIFICATION_TRACK_B_RESULT_20261019.md'
text='''# Track B fixed saved-evidence verification — STOP for High review

2026-10-19, Africa/Lagos. Read-only continuation of the coordinator handoff.
No device commands, captures, models, installs, source changes or new measurement
method were executed. Existing capture ceiling remains consumed.

## Checked result

Verified the resume evidence inventory, all 51 current reviewed source hashes,
exact accepted APK80e71788...86713, and saved receipt/ticket/job/model/recipe/
legacy-ownership consistency. Current source provenance is edaab3d4...64335d;
the receipt's legacy source field is ownership identity only. Existing production
receipt-validator result is valid; vectors each contain1024 values. This check
reads that existing validator evidence, not a fresh model/validator execution.
Coordinator's independent float32 vector-hash checks remain prior evidence.

Actual JPEG metadata1440x1080/EXIF6/640843 bytes and effective upright crop
[64,192,1016,1248] agree with saved records. Inference335.538231ms and total
2364.069231ms are one recorded observation. New-process status records original
PID5391 and reopened25672,863381 owned/claimed bytes, two records, no active job
and no unresolved storage. Two records include the old interrupted admission,
not two successful photos. nativeValidated:false is retained, not promoted into
an extra independent per-file export/validation claim.

Visually inspected original preview-before.png and after.png: chart upright,
UP points up, LEFT points left, all eight markers and outer chart borders visible.
Magenta/banding from the damaged display persists. Qualitative orientation is
supported; representative colour quality is not.

## Geometry remains INCONCLUSIVE

Existing method is defined in PHONE_P2_03_CAMERA_REVIEW_PACKET_20261014.md,
physical geometry section, and G4_FIRST_CAPTURE_PACKET_20261018.md: independently
annotate preview and upright JPEG landmarks, freeze mapping, require residual
<=1% of oriented dimensions, annotation uncertainty<=2physical pixels and crop
rounding<=1source pixel. Screen scale/content extent and motion must be observed.

Available screenshot of a scaled app-rendered candidate is not the original
upright JPEG or exact tensor pixel export. No independent coordinate/uncertainty
artifact or bounded screenshot-to-original mapping is present. Exposure/motion/FOV
correspondence remains unmeasured. Screenshot visual similarity and receipt crop
metadata cannot supply these missing measurements. No fitted transform or new
analysis code was introduced. Receipt flags stay physicalFovProven:false and
cameraProofAccepted:false; mathematical/source tests do not close this gate.

## Next action and limits

STOP and return to coordinator High for evidence/readiness decision. Decide how
the existing approved quantitative method can obtain original generated-image
landmarks, known display mapping and annotation uncertainty within the app's
reviewed capabilities. If unavailable, any new evidence/export implementation
or additional capture needs a separately reviewed packet; no automatic retry.
The first capture/process/commit and process-reopen functional observations stand.
Whole G4/P2-03, permission denial, pose/layout/lifecycle matrix, SDK peak/RAM bounds,
independent resolved-file export and cold-render risk remain open. P2-04/05/06 and
GitHub/CI remain held/deferred. User need not aim the phone during this review.

Fresh evidence: p2-camera-c6-fixed-verification-20261019-a1/inputs.json and
fixed-check-result.json. All prior captures/receipts/STOP artifacts preserved.
'''
(R/report).write_text(text,encoding='utf-8')
suffix=w['next_action'][w['next_action'].index(' Founder explicitly deferred GitHub CI/dependency repair'):]
w['current_state']='phone-p2-03-c6-fixed-saved-evidence-verified-geometry-inconclusive-stopped'
w['next_action']='Track B STOPPED after fixed saved-evidence verification; source51/APK and capture/status bindings checked, visual orientation supported. Geometry INCONCLUSIVE: no original-JPEG independent landmark/uncertainty artifact or measured preview correspondence. Read '+report+'. Coordinator High must review evidence readiness before any further capture/export/implementation. No new device/capture/model actions.'+suffix
w['updated_at']=now.isoformat();w['lease']=None
w['evidence'].insert(0,dict(source=report,result='Fixed saved-evidence checks pass within scope; original preview/candidate visually upright with eight markers. Quantitative geometry remains INCONCLUSIVE; no new device or measurement execution. STOP for coordinator High.'))
node='C:/Users/doyew/.cache/cosi-toolchain/node-v24.21.0-win-x64/node.exe'
js='const fs=require("fs"),Ajv=require("ajv/dist/2020");const a=new Ajv({strict:false});require("ajv-formats")(a);const v=a.compile(JSON.parse(fs.readFileSync(".agents/schemas/workflow-state.schema.json","utf8")));if(!v(JSON.parse(fs.readFileSync(0,"utf8")))){console.error(v.errors);process.exit(1)}'
subprocess.run([node,'-e',js],input=json.dumps(w),text=True,check=True);put(f,w)
p=R/'docs/engineering/PROJECT_STATE.md';lines=p.read_text(encoding='utf-8').splitlines()
for i,line in enumerate(lines):
 if line.startswith('Current work:'):
  lines[i]='Current work: C6 first real capture/process/commit and later new-process saved-state checks succeeded. Track B fixed saved-evidence verification STOPPED for coordinator High review: source51/APK and receipt/status bindings checked, upright whole chart visually supported, quantitative geometry INCONCLUSIVE due missing original-JPEG landmark/annotation uncertainty/motion correspondence evidence. See PHONE_P2_03_C6_FIXED_VERIFICATION_TRACK_B_RESULT_20261019.md. No new device/capture/model actions; no next capture authorized by this slice. G4/P2-03/later gates held; GitHub/CI deferred.';break
p.write_text('\n'.join(lines)+'\n',encoding='utf-8')
put(W/'writer-stopped.json',dict(status='STOPPED',atUtc=now.isoformat(),report=report,reportSha256=sha(R/report),inputsSha256=sha(W/'inputs.json'),resultSha256=sha(W/'fixed-check-result.json'),leaseReleased=True,newDeviceCommands=0,newCaptureOrModelCalls=0,geometryStatus='INCONCLUSIVE',next='Coordinator High evidence-readiness review'))
print(json.dumps(read(W/'writer-stopped.json')))
