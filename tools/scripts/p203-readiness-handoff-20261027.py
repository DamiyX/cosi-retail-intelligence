"""Record the stopped implementation and protected-source comparison."""
from pathlib import Path
import hashlib,json
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'apps/recognition-lab/runs/phone-experiment/p203-readiness-main-implementation-20261027-a1'
baseline=json.loads((OUT/'baseline.json').read_text(encoding='utf-8'))
def record(rel):
 raw=(ROOT/rel).read_bytes()
 return dict(path=rel,bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest())
paths=[x['path'] for x in baseline]+[
 'apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src/main/java/expo/modules/recognitioncpu/CameraOrientationEvidenceRetained.java',
 'tools/scripts/camera-orientation-evidence-v3/controller_v3.py',
 'tools/scripts/camera-orientation-evidence-v3/session.py',
]
manifest=[record(rel) for rel in paths]
(OUT/'implementation-files.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
frozen=json.loads((ROOT/'apps/recognition-lab/runs/phone-experiment/p203-evidence-build-20261026-a1/source-index.json').read_text(encoding='utf-8'))
changed=[];missing=[]
for item in frozen:
 p=ROOT/item['path']
 if not p.is_file():missing.append(item['path'])
 elif record(item['path'])['sha256']!=item['sha256']:changed.append(item['path'])
result=dict(total=len(frozen),changed=changed,missing=missing,
 changesOutsideRuntimeAllowlist=sorted(set(changed)-set(paths)))
(OUT/'frozen-source-comparison.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
assert not missing and not result['changesOutsideRuntimeAllowlist'],result
print(json.dumps(dict(protected=len(frozen)-len(changed),allowedDeltas=len(changed),implementationFiles=len(manifest))))
