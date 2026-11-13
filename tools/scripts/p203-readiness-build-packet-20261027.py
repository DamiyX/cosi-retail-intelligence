"""Freeze reviewed source and prepare ONE offline build; no build/device action."""
from pathlib import Path
import datetime,hashlib,json
ROOT=Path(__file__).resolve().parents[2]
OLD=ROOT/'apps/recognition-lab/runs/phone-experiment/p203-evidence-build-20261026-a1'
W=ROOT/'apps/recognition-lab/runs/phone-experiment/p203-readiness-build-20261027-a1'
STAGE=Path('C:/Users/doyew/.cache/cosi-p203-readiness-build-a1')
SOURCEFILE='apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src/main/java/expo/modules/recognitioncpu/CameraOrientationSource.java'
def data(p):return p.read_bytes()
def sha(p):return hashlib.sha256(data(p)).hexdigest()
def put(name,value):
 p=W/name;assert not p.exists(),name
 p.write_text(json.dumps(value,ensure_ascii=True,indent=2)+'\n',encoding='utf-8')
def main():
 assert not W.exists() and not STAGE.exists()
 W.mkdir()
 statepath=ROOT/'.agents/workflows/recognition-track-b.json'
 state=json.loads(statepath.read_text(encoding='utf-8'));assert state['lease'] is None
 additions=[
 'apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src/main/java/expo/modules/recognitioncpu/CameraOrientationEvidenceRetained.java',
 'apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src/test/java/expo/modules/recognitioncpu/CameraOrientationEvidenceRetainedChecks.java',
 'tools/scripts/camera-orientation-evidence-v3/controller_v3.py',
 'tools/scripts/camera-orientation-evidence-v3/session.py',
 'tools/scripts/camera-orientation-evidence-v3/test_controller_v3.py',
 'docs/recognition/PHONE_P2_03_READINESS_RECOVERY_PLAN_20261027.md',
 'docs/recognition/reports/PHONE_P2_03_READINESS_SOURCE_AUDIT_20261027.md']
 prior=json.loads((OLD/'source-index.json').read_text(encoding='utf-8'))
 paths=sorted({r['path'] for r in prior}|set(additions));assert SOURCEFILE not in paths
 rows=[dict(path=p,bytes=(ROOT/p).stat().st_size,sha256=sha(ROOT/p)) for p in paths]
 put('source-index.json',rows);source=sha(W/'source-index.json')
 pin=ROOT/SOURCEFILE;before=data(pin);assert '"'+('0'*64)+'"' in before.decode()
 (W/'derived-source-before.java').write_bytes(before)
 pin.write_bytes(before.replace(('0'*64).encode(),source.encode()))
 put('source-freeze-result.json',dict(sourceFiles=len(rows),sourceIndexSha256=source,
   derivedSourceSha256=sha(pin),derivedFileExcluded=True,sourceAcceptance='PHONE_P2_03_READINESS_SOURCE_AUDIT_20261027.md',noPhone=True))
 charter=json.loads((OLD/'charter.json').read_text(encoding='utf-8'))
 expiry=(datetime.datetime.now(datetime.timezone.utc)+datetime.timedelta(hours=2)).isoformat()
 lease=dict(holder='01a098ef-d830-7531-bca7-2d66b0a5b587',expires_at=expiry)
 charter.update(scope='MAIN_READINESS_OFFLINE_BUILD_STATIC',lease=lease,expiresUtc=expiry,
   stage=str(STAGE),app=str(STAGE/'x/apps/mobile'),camera=str(STAGE/'x/apps/camera-packages/expo-camera'),
   sourceIndexSha256=source,derivedOrientationSourceSha256=sha(pin),
   controllingAddendum='docs/recognition/reports/PHONE_P2_03_READINESS_SOURCE_AUDIT_20261027.md',
   correctiveReleaseLimit=0)
 put('charter.json',charter)
 protected=json.loads((OLD/'protected-artifacts.json').read_text(encoding='utf-8'))
 protected += [dict(path=str((OLD/n).relative_to(ROOT)).replace('\\','/'),bytes=(OLD/n).stat().st_size,sha256=sha(OLD/n)) for n in ('source-index.json','recognition-camera-orientation-release.apk','stopped-artifact-index.json')]
 put('protected-artifacts.json',protected)
 replacements={
  'p203-evidence-build-20261026-a1':'p203-readiness-build-20261027-a1',
  'cosi-p203-evidence-build-a1':'cosi-p203-readiness-build-a1',
  '20261026-evidence-v2':'20261027-readiness-v2',
  '7dd7a58bd8c08320d63efb91de8eb058184bb3b052574e18af09e945605d7376':source,
 }
 helpers=['build.py','prepare-v2.cjs','release.init.gradle','autolink-precheck.py',
 'gradle-precheck.py','manifest-precheck.py','artifact-check.py','dex-proof.py',
 'verify-v2-bundle.cjs','post-build.py','ui-namespace-check-a2.py']
 for name in helpers:
  text=(OLD/name).read_text(encoding='utf-8')
  for a,b in replacements.items():text=text.replace(a,b)
  (W/name).write_text(text,encoding='utf-8',newline='\n')
 (W/'namespace-a2').mkdir()
 text=(OLD/'namespace-a2/NamespaceProof.java').read_text(encoding='utf-8')
 for a,b in replacements.items():text=text.replace(a,b)
 (W/'namespace-a2/NamespaceProof.java').write_text(text,encoding='utf-8',newline='\n')
 static=['artifact-check.py','dex-proof.py','verify-v2-bundle.cjs','post-build.py','ui-namespace-check-a2.py','namespace-a2/NamespaceProof.java']
 put('static-helper-index.json',[dict(path=n,bytes=(W/n).stat().st_size,sha256=sha(W/n)) for n in static])
 state.update(lease=lease,current_state='phone-p203-readiness-build-prepared',next_action='Main one frozen offline release and static review; no device/physical/Git. Current17-image authority unchanged.')
 statepath.write_text(json.dumps(state,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
 print(json.dumps(dict(sourceFiles=len(rows),sourceSha256=source,buildDirectory=str(W),noBuildYet=True)))
if __name__=='__main__':main()
