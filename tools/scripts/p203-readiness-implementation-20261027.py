"""Coordinator's local implementation bookkeeping. No device/network operations."""
from pathlib import Path
import hashlib
import json

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'apps/recognition-lab/runs/phone-experiment/p203-readiness-main-implementation-20261027-a1'
JAVA = 'apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src/main/java/expo/modules/recognitioncpu/'
PATHS = [
 'apps/mobile/src/recognitionExperiment/CameraOrientationPanel.tsx',
 'apps/mobile/src/recognitionExperiment/cameraOrientationEvidence.ts',
 'apps/mobile/src/recognitionExperiment/cameraOrientationProof.ts',
 JAVA+'CameraOrientationPlan.java', JAVA+'CameraMatrixRecoveryPlan.java',
 JAVA+'CameraOrientationFiles.java', JAVA+'CameraOrientationSource.java',
 'apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src/main/cpp/camera_proof_publish.c',
]

def main():
 OUT.mkdir(exist_ok=True)
 assert not (OUT/'baseline.json').exists(), 'BASELINE_ALREADY_RECORDED'
 records=[]
 for rel in PATHS:
  original=OUT/'before'/rel
  raw=original.read_bytes() if original.is_file() else (ROOT/rel).read_bytes()
  backup=OUT/'before-flat'/Path(rel).name
  backup.parent.mkdir(parents=True,exist_ok=True)
  backup.write_bytes(raw)
  records.append(dict(path=rel,bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest()))
 (OUT/'baseline.json').write_text(json.dumps(records,indent=2)+'\n',encoding='utf-8')
 print(json.dumps(dict(backedUp=len(records),directory=str(OUT))))

if __name__=='__main__': main()
