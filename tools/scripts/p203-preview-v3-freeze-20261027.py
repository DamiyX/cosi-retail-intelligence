"""Freeze only the finite preview-v3 source allowlist; no build or device access."""
from pathlib import Path
import hashlib,json,sys
R=Path(__file__).resolve().parents[2]
W=R/'apps/recognition-lab/runs/phone-experiment/p203-preview-v3-source-20261027-a1'
J='apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src/'
M=J+'main/java/expo/modules/recognitioncpu/'
T=J+'test/java/expo/modules/recognitioncpu/'
DERIVED=M+'CameraOrientationSource.java'
CHANGED=[
 'apps/mobile/__tests__/recognitionExperimentCameraOrientationEvidenceUi.test.tsx',
 'apps/mobile/src/recognitionExperiment/CameraOrientationPanel.tsx',
 'apps/mobile/src/recognitionExperiment/cameraOrientationProof.ts',
 J+'main/cpp/camera_proof_publish.c',M+'CameraMatrixRecoveryPlan.java',
 M+'CameraOrientationFiles.java',M+'CameraOrientationPlan.java',
 *['tools/scripts/camera-orientation-v2/'+n for n in ['CosiSameFrame.kt','CosiViewMembers.kt.txt','apply.cjs','apply.test.cjs','manifest.json']]]
ADDED=[
 'apps/mobile/__tests__/recognitionExperimentCameraOrientationStartup.test.js',
 M+'CameraOrientationReadinessRetained.java',T+'CameraOrientationReadinessRetainedChecks.java',
 *['tools/scripts/camera-orientation-v2/'+n for n in ['CosiPreviewReadiness.kt','CosiPreviewReadinessChecks.kt']],
 *['tools/scripts/camera-orientation-session-v6/'+n for n in ['base_v6.py','controller_v6.py','main_session.py','test_preview_v3.py']],
 'tools/scripts/p203-preview-v3-freeze-20261027.py']
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def write(name,value):
 with (W/name).open('x',encoding='utf-8',newline='\n') as f:json.dump(value,f,indent=2,ensure_ascii=True);f.write('\n')
def main():
 old=json.loads((W/'baseline729.json').read_bytes());assert len(old)==729
 assert sha(W/'source-index-729.original.json')=='3aeff06cadd724ddd7be4a8085613392fac8cde7c9cdf2a212d08351e5662b66'
 actual=[]
 for row in old:
  assert sha(W/row['backup'])==row['sha256'],row['path']
  assert (R/row['path']).is_file(),row['path']
  if sha(R/row['path'])!=row['sha256']:actual.append(row['path'])
 assert sorted(actual)==sorted(CHANGED),(actual,CHANGED)
 paths=sorted({row['path'] for row in old}|set(ADDED));assert DERIVED not in paths
 rows=[dict(path=p,bytes=(R/p).stat().st_size,sha256=sha(R/p)) for p in paths]
 write('source-index.json',rows);source=sha(W/'source-index.json')
 pin=R/DERIVED;data=pin.read_bytes();assert data.count(b'0'*64)==1
 pin.write_bytes(data.replace(b'0'*64,source.encode()))
 before={r['path']:r for r in old};selected={r['path']:r for r in rows}
 write('source-allowlist.json',dict(baselineIndexSha256=sha(W/'source-index-729.original.json'),
  baselineFiles=729,unchanged=729-len(CHANGED),changed=[dict(selected[p],beforeSha256=before[p]['sha256']) for p in CHANGED],
  added=[selected[p] for p in ADDED],derived=dict(path=DERIVED,sha256=sha(pin),excludedFromIndex=True)))
 write('source-freeze-result.json',dict(sourceFiles=len(rows),sourceIndexSha256=source,derivedSourceSha256=sha(pin),
  sourceAcceptance='PENDING_INDEPENDENT_MAIN_REVIEW',apkSha256=None,noBuild=True,noPhone=True))
 identity=json.loads((W/'identity.json').read_bytes());identity['source']=source
 sys.path.insert(0,str(R/'tools/scripts/camera-orientation-session-v6'))
 import main_session as m
 identity.update(controllerSha256=sha(Path(m.c.__file__)),hostProtocol=m.c.PROTOCOL)
 (W/'identity.json').write_bytes(m.c.canonical(identity)+b'\n')
 packet=m.approved_packet();(W/'packet-M00-v6.disabled.json').write_bytes(m.c.canonical(packet)+b'\n')
 cfg=m.c.load(W/'capture-charter.disabled.json');cfg['packetSha256']=m.c.digest(m.c.canonical(packet))
 assert cfg['executionApproved'] is False and packet['apk'] is None
 (W/'capture-charter.disabled.json').write_bytes(m.c.canonical(cfg)+b'\n')
 print(json.dumps(dict(sourceFiles=len(rows),source=source,derived=sha(pin),changed=len(CHANGED),added=len(ADDED),build=False,device=False)))
if __name__=='__main__':main()
